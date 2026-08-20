// ==========================================================================
//  AUKČNÍ SÍŇ — API
// ==========================================================================
// Systémová dražba. Hráči si nic nevystavují. Přihoz = Zlato, Buy Now =
// Smaragdy. Vše autoritativně na serveru: čas (NOW()), viditelnost (úroveň+5),
// peníze i vlastnictví přes transakce a zámky řádků. Idempotence přes UNIQUE
// klíč události (dvojklik / obnovení / druhá záložka / síťové opakování).
//
// Rezervace zlata je „skutečná": při přihozu se zlato hráči STRHNE z peněženky
// a při přeplacení se předchozímu hráči hned VRÁTÍ. Žádná falešná rezervace
// jen v prohlížeči — zlato reálně mění majitele v jedné transakci.

const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce } = require('../middleware/admin');
const aukce = require('../config/aukce');
const predmety = require('../config/predmety');
const { nactiNastaveni, zahodCache } = require('../aukce/nastaveni');

const router = express.Router();

// Autoritativní postava přihlášeného uživatele.
async function mojePostava(userId) {
  const { rows } = await pool.query(
    'SELECT id, level, gold, emeralds FROM characters WHERE user_id = $1', [userId]
  );
  return rows[0] || null;
}

const platnyKlic = k => /^[a-zA-Z0-9_-]{8,64}$/.test(k);

// Min. další přihoz pro danou aukci.
function minPrihoz(a, n) {
  return a.soucasny_prihoz == null ? a.start_zlato : aukce.minPristiPrihoz(a.soucasny_prihoz, n);
}

// ---------------------------------------------------------------- SEZNAM
// Vrací jen aktivní aukce, které hráč SMÍ vidět (úroveň ≤ úroveň+5).
// Filtr úrovně je tvrdý na serveru, ne jen v UI.
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const me = await mojePostava(req.user.id);
    if (!me) return res.status(404).json({ error: 'Postava nenalezena' });
    const n = await nactiNastaveni();
    const strop = aukce.viditelnyStrop(me.level, n);

    const q = req.query || {};
    const kde = [`stav = 'ACTIVE'`, `konci > NOW()`, `uroven <= $1`];
    const p = [strop];
    if (q.slot) { p.push(String(q.slot)); kde.push(`slot = $${p.length}`); }
    if (q.minUroven) { p.push(Math.max(1, +q.minUroven | 0)); kde.push(`uroven >= $${p.length}`); }
    if (q.maxUroven) { p.push(+q.maxUroven | 0); kde.push(`uroven <= $${p.length}`); }
    if (q.buynow === '1') kde.push(`buynow_smaragdy IS NOT NULL`);

    const razeni = {
      konci: 'konci ASC',                 // končí brzy
      nove: 'vytvoreno DESC',
      zlato_nizke: 'COALESCE(soucasny_prihoz, start_zlato) ASC',
      zlato_vysoke: 'COALESCE(soucasny_prihoz, start_zlato) DESC',
      uroven_nizka: 'uroven ASC',
      uroven_vysoka: 'uroven DESC',
      buynow: 'buynow_smaragdy ASC NULLS LAST',
    }[q.razeni] || 'konci ASC';

    // celkový počet (pro stránkování) se stejnými filtry
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM aukce WHERE ${kde.join(' AND ')}`, p
    );
    const celkem = cnt[0].c;

    const limit = Math.min(60, Math.max(1, +q.limit || 20));
    const offset = Math.max(0, +q.offset || 0);
    p.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT id, predmet, uroven, slot, start_zlato, soucasny_prihoz, vitez_id, buynow_smaragdy,
              EXTRACT(EPOCH FROM (konci - NOW()))::int AS zbyva_s,
              (SELECT COUNT(*)::int FROM aukce_udalosti u WHERE u.aukce_id = aukce.id AND u.typ = 'bid') AS prihozu
         FROM aukce
        WHERE ${kde.join(' AND ')}
        ORDER BY ${razeni}
        LIMIT $${p.length - 1} OFFSET $${p.length}`,
      p
    );
    const seznam = rows.map(a => ({
      id: a.id, predmet: a.predmet, uroven: a.uroven, slot: a.slot,
      startZlato: a.start_zlato, soucasnyPrihoz: a.soucasny_prihoz,
      minPrihoz: minPrihoz(a, n), buynowSmaragdy: a.buynow_smaragdy,
      zbyvaS: Math.max(0, a.zbyva_s), jaVedu: a.vitez_id === me.id,
      prihozu: a.prihozu, popis: predmety.popisStatu(a.predmet),
    }));

    // moje rezervované zlato (informativně — z peněženky už je strženo)
    const { rows: rez } = await pool.query(
      `SELECT COALESCE(SUM(soucasny_prihoz),0)::bigint AS r, COUNT(*)::int AS n
         FROM aukce WHERE vitez_id = $1 AND stav = 'ACTIVE'`, [me.id]
    );
    const { rows: dor } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM aukce_doruceni WHERE character_id = $1 AND vyzvednuto = FALSE`, [me.id]
    );

    res.json({
      ja: { uroven: me.level, zlato: me.gold, smaragdy: me.emeralds, viditelnyStrop: strop },
      rezervovanoZlato: Number(rez[0].r), veduAukci: rez[0].n,
      cekaDoruceni: dor[0].c,
      celkem, limit, offset,
      aukce: seznam,
    });
  } catch (e) {
    console.error('aukce/state', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// ---------------------------------------------------------------- DETAIL
router.get('/detail/:id', authenticateToken, async (req, res) => {
  try {
    const me = await mojePostava(req.user.id);
    if (!me) return res.status(404).json({ error: 'Postava nenalezena' });
    const n = await nactiNastaveni();
    const { rows } = await pool.query(
      `SELECT id, predmet, uroven, slot, stav, start_zlato, soucasny_prihoz, vitez_id,
              buynow_smaragdy, EXTRACT(EPOCH FROM (konci - NOW()))::int AS zbyva_s
         FROM aukce WHERE id = $1`, [req.params.id]
    );
    const a = rows[0];
    if (!a) return res.status(404).json({ error: 'Aukce neexistuje' });
    // tvrdá kontrola viditelnosti — i přímý dotaz na ID nad úroveň+5 padne
    if (!aukce.smiVidet(a.uroven, me.level, n)) {
      return res.status(403).json({ error: 'Tuto aukci zatím nevidíš (příliš vysoká úroveň předmětu).' });
    }
    res.json({
      id: a.id, predmet: a.predmet, uroven: a.uroven, slot: a.slot, stav: a.stav,
      startZlato: a.start_zlato, soucasnyPrihoz: a.soucasny_prihoz,
      minPrihoz: minPrihoz(a, n), buynowSmaragdy: a.buynow_smaragdy,
      zbyvaS: Math.max(0, a.zbyva_s), jaVedu: a.vitez_id === me.id,
      popis: predmety.popisStatu(a.predmet),
    });
  } catch (e) {
    console.error('aukce/detail', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// ---------------------------------------------------------------- PŘIHOZ
//  Tělo: { aukceId, castka, klic }
router.post('/bid', authenticateToken, async (req, res) => {
  const aukceId = +(req.body && req.body.aukceId);
  const castka = Math.floor(+(req.body && req.body.castka));
  const klic = String((req.body && req.body.klic) || '').slice(0, 64);
  if (!aukceId || !platnyKlic(klic) || !(castka > 0)) {
    return res.status(400).json({ error: 'Neplatný požadavek' });
  }

  // idempotence: stejný klíč = stejný přihoz, neopakovat
  const { rows: uz } = await pool.query('SELECT id FROM aukce_udalosti WHERE klic = $1', [klic]);
  if (uz.length) return res.json({ opakovane: true });

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');

    // moje postava (id kvůli zámkům)
    const { rows: ch } = await klient.query('SELECT id, level FROM characters WHERE user_id = $1', [req.user.id]);
    const meId = ch[0] && ch[0].id;
    if (!meId) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    // zámek aukce
    const { rows: ar } = await klient.query(
      `SELECT id, uroven, stav, start_zlato, soucasny_prihoz, vitez_id, konci,
              konci <= NOW() AS proslo, EXTRACT(EPOCH FROM konci)*1000 AS konci_ms
         FROM aukce WHERE id = $1 FOR UPDATE`, [aukceId]
    );
    const a = ar[0];
    if (!a || a.stav !== 'ACTIVE' || a.proslo) { await klient.query('ROLLBACK'); return res.status(409).json({ error: 'Aukce už neběží' }); }

    const n = await nactiNastaveni();
    if (!aukce.smiVidet(a.uroven, ch[0].level, n)) { await klient.query('ROLLBACK'); return res.status(403).json({ error: 'Na tuto aukci nemáš přístup' }); }
    if (a.vitez_id === meId) { await klient.query('ROLLBACK'); return res.status(409).json({ error: 'Už vedeš tuto aukci' }); }

    const potreba = a.soucasny_prihoz == null ? a.start_zlato : aukce.minPristiPrihoz(a.soucasny_prihoz, n);
    if (castka < potreba) { await klient.query('ROLLBACK'); return res.status(400).json({ error: `Přihoď aspoň ${potreba}`, minPrihoz: potreba }); }

    // zamkni dotčené postavy v pořadí podle id (proti deadlocku)
    const ids = [meId]; if (a.vitez_id) ids.push(a.vitez_id);
    ids.sort((x, y) => x - y);
    const { rows: postavy } = await klient.query(
      'SELECT id, gold FROM characters WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]
    );
    const ja = postavy.find(p => p.id === meId);
    if ((ja.gold || 0) < castka) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Nedostatek zlata', mas: ja.gold || 0, potreba: castka }); }

    // strhni nový přihoz mně
    await klient.query('UPDATE characters SET gold = gold - $1 WHERE id = $2', [castka, meId]);
    // vrať zlato předchozímu vedoucímu
    if (a.vitez_id && a.soucasny_prihoz) {
      await klient.query('UPDATE characters SET gold = gold + $1 WHERE id = $2', [a.soucasny_prihoz, a.vitez_id]);
    }

    // anti-snipe: přihoz v posledních 60 s prodlouží konec o 60 s
    const nyni = Date.now();
    const novyKonec = aukce.novyKonecPoPrihozu(Number(a.konci_ms), nyni, n);
    await klient.query(
      `UPDATE aukce SET soucasny_prihoz = $1, vitez_id = $2, konci = to_timestamp($3/1000.0) WHERE id = $4`,
      [castka, meId, novyKonec, aukceId]
    );

    const { rowCount } = await klient.query(
      `INSERT INTO aukce_udalosti (klic, aukce_id, character_id, typ, castka)
       VALUES ($1,$2,$3,'bid',$4) ON CONFLICT (klic) DO NOTHING`,
      [klic, aukceId, meId, castka]
    );
    if (rowCount === 0) { await klient.query('ROLLBACK'); return res.json({ opakovane: true }); }

    await klient.query('COMMIT');
    res.json({
      ok: true, soucasnyPrihoz: castka, jaVedu: true,
      novyKonecZa: Math.max(0, Math.round((novyKonec - nyni) / 1000)),
      prodlouzeno: novyKonec !== Number(a.konci_ms),
    });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('aukce/bid', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------- BUY NOW
//  Tělo: { aukceId, klic }  — platí se Smaragdy, okamžitě končí
router.post('/buynow', authenticateToken, async (req, res) => {
  const aukceId = +(req.body && req.body.aukceId);
  const klic = String((req.body && req.body.klic) || '').slice(0, 64);
  if (!aukceId || !platnyKlic(klic)) return res.status(400).json({ error: 'Neplatný požadavek' });

  const { rows: uz } = await pool.query('SELECT id FROM aukce_udalosti WHERE klic = $1', [klic]);
  if (uz.length) return res.json({ opakovane: true });

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows: ch } = await klient.query('SELECT id, level FROM characters WHERE user_id = $1', [req.user.id]);
    const meId = ch[0] && ch[0].id;
    if (!meId) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    const { rows: ar } = await klient.query(
      `SELECT id, uroven, stav, soucasny_prihoz, vitez_id, buynow_smaragdy, predmet,
              konci <= NOW() AS proslo
         FROM aukce WHERE id = $1 FOR UPDATE`, [aukceId]
    );
    const a = ar[0];
    if (!a || a.stav !== 'ACTIVE' || a.proslo) { await klient.query('ROLLBACK'); return res.status(409).json({ error: 'Aukce už neběží' }); }
    if (a.buynow_smaragdy == null) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Tato aukce nemá Koupit hned' }); }

    const n = await nactiNastaveni();
    if (!aukce.smiVidet(a.uroven, ch[0].level, n)) { await klient.query('ROLLBACK'); return res.status(403).json({ error: 'Na tuto aukci nemáš přístup' }); }

    // zamkni kupce i případného vedoucího přihozu (v pořadí id)
    const ids = [meId]; if (a.vitez_id && a.vitez_id !== meId) ids.push(a.vitez_id);
    ids.sort((x, y) => x - y);
    const { rows: postavy } = await klient.query(
      'SELECT id, emeralds FROM characters WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]
    );
    const ja = postavy.find(p => p.id === meId);
    if ((ja.emeralds || 0) < a.buynow_smaragdy) {
      await klient.query('ROLLBACK');
      return res.status(400).json({ error: 'Nedostatek smaragdů', mas: ja.emeralds || 0, potreba: a.buynow_smaragdy });
    }

    // vrať zlato aktuálnímu vedoucímu přihozu (i kdyby to byl kupec sám)
    if (a.vitez_id && a.soucasny_prihoz) {
      await klient.query('UPDATE characters SET gold = gold + $1 WHERE id = $2', [a.soucasny_prihoz, a.vitez_id]);
    }
    // strhni smaragdy kupci
    await klient.query('UPDATE characters SET emeralds = emeralds - $1 WHERE id = $2', [a.buynow_smaragdy, meId]);

    await klient.query(
      `UPDATE aukce SET stav = 'COMPLETED_BY_BUY_NOW', vitez_id = $1, dokonceno = NOW() WHERE id = $2`,
      [meId, aukceId]
    );
    await klient.query(
      `INSERT INTO aukce_doruceni (aukce_id, character_id, predmet, zpusob)
       VALUES ($1,$2,$3,'buynow') ON CONFLICT (aukce_id) DO NOTHING`,
      [aukceId, meId, a.predmet]
    );
    const { rowCount } = await klient.query(
      `INSERT INTO aukce_udalosti (klic, aukce_id, character_id, typ, castka)
       VALUES ($1,$2,$3,'buynow',$4) ON CONFLICT (klic) DO NOTHING`,
      [klic, aukceId, meId, a.buynow_smaragdy]
    );
    if (rowCount === 0) { await klient.query('ROLLBACK'); return res.json({ opakovane: true }); }

    await klient.query('COMMIT');
    res.json({ ok: true, koupeno: true, smaragduUbylo: a.buynow_smaragdy });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('aukce/buynow', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------- DORUČENÍ
router.get('/doruceni', authenticateToken, async (req, res) => {
  try {
    const me = await mojePostava(req.user.id);
    if (!me) return res.status(404).json({ error: 'Postava nenalezena' });
    const { rows } = await pool.query(
      `SELECT id, aukce_id, predmet, zpusob, vytvoreno
         FROM aukce_doruceni WHERE character_id = $1 AND vyzvednuto = FALSE
        ORDER BY vytvoreno DESC`, [me.id]
    );
    res.json({ doruceni: rows.map(d => ({ id: d.id, predmet: d.predmet, zpusob: d.zpusob, kdy: d.vytvoreno, popis: predmety.popisStatu(d.predmet) })) });
  } catch (e) {
    console.error('aukce/doruceni', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// vyzvednutí = předá předmět klientovi (ten si ho vloží do inventáře).
// Idempotentní: druhé vyzvednutí nic nevydá znovu.
router.post('/vyzvednout', authenticateToken, async (req, res) => {
  const doruceniId = +(req.body && req.body.doruceniId);
  if (!doruceniId) return res.status(400).json({ error: 'Neplatný požadavek' });
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows: ch } = await klient.query('SELECT id FROM characters WHERE user_id = $1', [req.user.id]);
    const meId = ch[0] && ch[0].id;
    if (!meId) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    const { rows } = await klient.query(
      `SELECT id, character_id, predmet, aukce_id, vyzvednuto FROM aukce_doruceni WHERE id = $1 FOR UPDATE`,
      [doruceniId]
    );
    const d = rows[0];
    if (!d || d.character_id !== meId) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Doručení nenalezeno' }); }
    if (d.vyzvednuto) { await klient.query('ROLLBACK'); return res.json({ opakovane: true }); }

    await klient.query('UPDATE aukce_doruceni SET vyzvednuto = TRUE WHERE id = $1', [doruceniId]);
    await klient.query(`UPDATE aukce SET stav = 'DELIVERED' WHERE id = $1`, [d.aukce_id]);
    await klient.query('COMMIT');
    res.json({ ok: true, predmet: d.predmet });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('aukce/vyzvednout', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------- SPRÁVA
router.get('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  res.json({ config: await nactiNastaveni(), vychozi: aukce.VYCHOZI });
});
router.put('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const zmeny = (req.body && req.body.config) || {};
    const ulozene = {};
    for (const [klic, hodnota] of Object.entries(zmeny)) {
      if (!(klic in aukce.VYCHOZI)) continue;
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo)) continue;
      await pool.query(
        `INSERT INTO aukce_config (klic, hodnota) VALUES ($1,$2)
         ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`, [klic, cislo]
      );
      ulozene[klic] = cislo;
    }
    zahodCache();
    res.json({ message: 'Uloženo', ulozene, config: await nactiNastaveni() });
  } catch (e) {
    console.error('aukce/config PUT', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// ---------------------------------------------------------------- DIAGNOSTIKA (admin)
// Vývojářský přehled + varování (málo aukcí, chybí Buy Now, prodejce u
// serverové aukce, přetečení stropu, rozbité assety).
router.get('/diagnostika', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const n = await nactiNastaveni();
    const { rows: akt } = await pool.query(
      `SELECT slot, uroven, start_zlato, soucasny_prihoz, buynow_smaragdy, predmet, vitez_id
         FROM aukce WHERE stav = 'ACTIVE' AND konci > NOW()`);
    const { rows: stavy } = await pool.query(
      `SELECT stav, COUNT(*)::int AS c FROM aukce GROUP BY stav`);

    const pocet = akt.length;
    const prumer = (pole) => pole.length ? pole.reduce((a, b) => a + b, 0) / pole.length : 0;
    const kategorie = {};
    const assety = new Set();
    let bezBuyNow = 0, sProdejcem = 0, rozbityAsset = 0;
    const budgety = [];
    for (const a of akt) {
      kategorie[a.slot] = (kategorie[a.slot] || 0) + 1;
      const img = a.predmet && a.predmet.slot ? a.predmet.slot : a.slot;
      assety.add(img);
      if (a.buynow_smaragdy == null) bezBuyNow++;
      if (a.predmet && a.predmet.totalBudget) budgety.push(a.predmet.totalBudget);
      // serverová aukce nesmí mít „prodejce" — u nás neexistuje sloupec seller,
      // takže je to strukturálně vyloučené; kontrola je pro jistotu.
      if (a.predmet && a.predmet.seller) sProdejcem++;
      if (a.predmet && a.predmet.slot && !predmety.SLOTY.includes(a.predmet.slot)) rozbityAsset++;
    }
    const stavMap = Object.fromEntries(stavy.map(s => [s.stav, s.c]));

    const varovani = [];
    if (pocet < n.auction_min_items) varovani.push(`Aktivních aukcí (${pocet}) je méně než minimum (${n.auction_min_items}).`);
    if (pocet > n.auction_max_items) varovani.push(`Aktivních aukcí (${pocet}) je více než maximum (${n.auction_max_items}).`);
    if (bezBuyNow > 0) varovani.push(`${bezBuyNow} aukcí nemá cenu Buy Now.`);
    if (sProdejcem > 0) varovani.push(`${sProdejcem} serverových aukcí má neplatného prodejce!`);
    if (rozbityAsset > 0) varovani.push(`${rozbityAsset} aukcí má neznámý slot/asset.`);
    if (pocet > 0 && assety.size < Math.min(5, pocet)) varovani.push(`Málo unikátních vizuálů (${assety.size}) — vysoká duplikace.`);
    if (predmety.SLOTY.length < 3) varovani.push('Pool šablon je příliš malý.');

    res.json({
      aktivnich: pocet,
      min: n.auction_min_items, max: n.auction_max_items,
      unikatnichAssetu: assety.size,
      sablonPoolu: predmety.SLOTY.length,
      kategorie,
      prumerUroven: Math.round(prumer(akt.map(a => a.uroven))),
      prumerBudget: Math.round(prumer(budgety)),
      prumerStartZlato: Math.round(prumer(akt.map(a => a.start_zlato))),
      prumerAktualniPrihoz: Math.round(prumer(akt.filter(a => a.soucasny_prihoz).map(a => a.soucasny_prihoz))),
      prumerBuyNow: Math.round(prumer(akt.filter(a => a.buynow_smaragdy != null).map(a => a.buynow_smaragdy))),
      bezBuyNow, sProdejcem,
      expirovane: stavMap['EXPIRED_WITHOUT_BID'] || 0,
      koupeno: stavMap['COMPLETED_BY_BUY_NOW'] || 0,
      dokoncenoPrihozem: stavMap['COMPLETED_BY_BID'] || 0,
      doruceno: stavMap['DELIVERED'] || 0,
      varovani,
    });
  } catch (e) {
    console.error('aukce/diagnostika', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

module.exports = router;

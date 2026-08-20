// ==========================================================================
//  STÁJ — API
// ==========================================================================
// Server je autoritativní pro cenu, dobu i bonus. Drak = 20 smaragdů / 10 dní
// (dočasně, expiruje podle serverového času). Ostatní za zlato natrvalo.
// Aktivní je vždy jen jedno zvíře. Nákup je atomický a idempotentní (UNIQUE
// klíč), takže dvojklik/obnovení/retry nikdy nestrhne dvakrát.

const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce } = require('../middleware/admin');
const staj = require('../config/staj');

const router = express.Router();
const platnyKlic = k => /^[a-zA-Z0-9_-]{8,64}$/.test(k);

let cache = null, cacheDo = 0;
async function nactiNastaveni() {
  if (cache && Date.now() < cacheDo) return cache;
  const out = { ...staj.VYCHOZI };
  try {
    const { rows } = await pool.query('SELECT klic, hodnota FROM staj_config');
    for (const r of rows) out[r.klic] = Number(r.hodnota);
  } catch { /* před initDB */ }
  cache = out; cacheDo = Date.now() + 30000;
  return out;
}

// Vyřeší aktivní zvíře s ohledem na expiraci Draka (server rozhoduje z NOW()).
function aktivniZvire(row) {
  const akt = row.staj_aktivni;
  if (!akt) return null;
  if (akt === 'drak') {
    if (!row.staj_drak_do || new Date(row.staj_drak_do).getTime() <= Date.now()) return null; // expirovalo
  }
  return akt;
}

// -------------------------------------------------------------- STAV
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const n = await nactiNastaveni();
    const { rows } = await pool.query(
      `SELECT id, level, gold, emeralds, staj_aktivni, staj_vlastni, staj_drak_do,
              NOW() AS ted FROM characters WHERE user_id = $1`, [req.user.id]
    );
    const c = rows[0];
    if (!c) return res.status(404).json({ error: 'Postava nenalezena' });

    const aktivni = aktivniZvire(c);
    const vlastni = Array.isArray(c.staj_vlastni) ? c.staj_vlastni : [];
    const seznam = staj.zvirata(n).map(z => ({
      id: z.id, nazev: z.nazev, mena: z.mena, cena: z.cena, dny: z.dny,
      procenta: z.procenta,
      vlastneno: z.id === 'drak' ? (!!c.staj_drak_do && new Date(c.staj_drak_do) > new Date()) : vlastni.includes(z.id),
      aktivni: aktivni === z.id,
    }));

    res.json({
      ja: { uroven: c.level, zlato: c.gold, smaragdy: c.emeralds },
      aktivni,
      bonus: aktivni ? staj.bonusy(aktivni, n) : {},
      drakDo: c.staj_drak_do,
      zvirata: seznam,
    });
  } catch (e) {
    console.error('staj/state', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// -------------------------------------------------------------- KOUPIT
//  Tělo: { zvire, klic }
router.post('/koupit', authenticateToken, async (req, res) => {
  const zvireId = String((req.body && req.body.zvire) || '');
  const klic = String((req.body && req.body.klic) || '').slice(0, 64);
  if (!platnyKlic(klic)) return res.status(400).json({ error: 'Neplatný požadavek' });

  const n = await nactiNastaveni();
  const z = staj.zvireById(zvireId, n);
  if (!z) return res.status(400).json({ error: 'Takové zvíře neznáme' });

  // idempotence — stejný klíč už proběhl
  const { rows: uz } = await pool.query('SELECT id FROM staj_nakupy WHERE klic = $1', [klic]);
  if (uz.length) return res.json({ opakovane: true });

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows } = await klient.query(
      `SELECT id, gold, emeralds, staj_vlastni, staj_drak_do
         FROM characters WHERE user_id = $1 FOR UPDATE`, [req.user.id]
    );
    const c = rows[0];
    if (!c) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }
    const vlastni = Array.isArray(c.staj_vlastni) ? c.staj_vlastni : [];

    if (z.id === 'drak') {
      // dočasný pronájem za smaragdy, ŽÁDNÉ zlato
      if ((c.emeralds || 0) < z.cena) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Nedostatek smaragdů', potreba: z.cena, mas: c.emeralds || 0 }); }
      await klient.query(
        `UPDATE characters
            SET emeralds = emeralds - $1,
                staj_drak_do = GREATEST(COALESCE(staj_drak_do, NOW()), NOW()) + ($2 || ' days')::interval,
                staj_aktivni = 'drak'
          WHERE id = $3`,
        [z.cena, z.dny, c.id]
      );
    } else {
      // gold zvíře natrvalo; když už ho hráč vlastní, jen ho aktivujeme zdarma
      if (vlastni.includes(z.id)) {
        await klient.query(`UPDATE characters SET staj_aktivni = $1 WHERE id = $2`, [z.id, c.id]);
        await klient.query('COMMIT');
        return res.json({ ok: true, jizVlastneno: true, aktivni: z.id });
      }
      if ((c.gold || 0) < z.cena) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Nedostatek zlata', potreba: z.cena, mas: c.gold || 0 }); }
      await klient.query(
        `UPDATE characters
            SET gold = gold - $1,
                staj_vlastni = (COALESCE(staj_vlastni, '[]'::jsonb) || to_jsonb($2::text)),
                staj_aktivni = $2
          WHERE id = $3`,
        [z.cena, z.id, c.id]
      );
    }

    const { rowCount } = await klient.query(
      `INSERT INTO staj_nakupy (klic, character_id, zvire, mena, castka)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (klic) DO NOTHING`,
      [klic, c.id, z.id, z.mena, z.cena]
    );
    if (rowCount === 0) { await klient.query('ROLLBACK'); return res.json({ opakovane: true }); }

    await klient.query('COMMIT');
    res.json({ ok: true, koupeno: z.id, mena: z.mena, castka: z.cena });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('staj/koupit', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// -------------------------------------------------------------- AKTIVOVAT
//  Přepnutí aktivního zvířete (musí ho vlastnit / mít nevypršelého Draka).
//  Nesčítá bonusy — nastaví právě jedno aktivní. Bez poplatku.
router.post('/aktivovat', authenticateToken, async (req, res) => {
  const zvireId = String((req.body && req.body.zvire) || '');
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows } = await klient.query(
      `SELECT id, staj_vlastni, staj_drak_do FROM characters WHERE user_id = $1 FOR UPDATE`, [req.user.id]
    );
    const c = rows[0];
    if (!c) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    if (zvireId === '' || zvireId === 'zadne') {
      await klient.query(`UPDATE characters SET staj_aktivni = NULL WHERE id = $1`, [c.id]);
      await klient.query('COMMIT');
      return res.json({ ok: true, aktivni: null });
    }
    if (!staj.zvireById(zvireId)) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Takové zvíře neznáme' }); }

    const vlastni = Array.isArray(c.staj_vlastni) ? c.staj_vlastni : [];
    const maDraka = c.staj_drak_do && new Date(c.staj_drak_do) > new Date();
    const smi = zvireId === 'drak' ? maDraka : vlastni.includes(zvireId);
    if (!smi) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Tohle zvíře nevlastníš' }); }

    await klient.query(`UPDATE characters SET staj_aktivni = $1 WHERE id = $2`, [zvireId, c.id]);
    await klient.query('COMMIT');
    res.json({ ok: true, aktivni: zvireId });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('staj/aktivovat', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// -------------------------------------------------------------- SPRÁVA
router.get('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  res.json({ config: await nactiNastaveni(), vychozi: staj.VYCHOZI });
});
router.put('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const zmeny = (req.body && req.body.config) || {};
    const ulozene = {};
    for (const [klic, hodnota] of Object.entries(zmeny)) {
      if (!(klic in staj.VYCHOZI)) continue;
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo)) continue;
      await pool.query(
        `INSERT INTO staj_config (klic, hodnota) VALUES ($1,$2)
         ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`, [klic, cislo]
      );
      ulozene[klic] = cislo;
    }
    cache = null;
    res.json({ message: 'Uloženo', ulozene, config: await nactiNastaveni() });
  } catch (e) {
    console.error('staj/config PUT', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

module.exports = router;

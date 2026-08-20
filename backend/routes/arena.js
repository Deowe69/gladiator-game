const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { VYCHOZI, POPISKY, zmenaPocty } = require('../config/arena');
const { profil, odehrajSouboj, nahodaSeSeminkem } = require('../config/souboj');

const router = express.Router();

// ---------------------------------------------------------------
//  Nastavení z databáze, aby šlo měnit ze správy bez zásahu do kódu.
// ---------------------------------------------------------------
let cache = null, cacheDo = 0;

async function nactiNastaveni() {
  if (cache && Date.now() < cacheDo) return cache;
  const { rows } = await pool.query('SELECT klic, hodnota FROM arena_config');
  const out = { ...VYCHOZI };
  for (const r of rows) out[r.klic] = Number(r.hodnota);
  cache = out;
  cacheDo = Date.now() + 30 * 1000;
  return out;
}
const zahodCache = () => { cache = null; cacheDo = 0; };

const mojePostava = async (klient, userId) => {
  const { rows } = await (klient || pool).query(
    'SELECT * FROM characters WHERE user_id = $1', [userId]
  );
  return rows[0] || null;
};

// Pořadí v celosvětovém žebříčku. Počítá se dotazem, ne uloženým
// číslem — to by zastaralo při každém cizím souboji.
async function poradiVZebricku(characterId) {
  const { rows } = await pool.query(
    `SELECT poradi FROM (
       SELECT id, RANK() OVER (ORDER BY pocta DESC, level DESC, id ASC) AS poradi
         FROM characters
     ) t WHERE id = $1`, [characterId]
  );
  return rows.length ? Number(rows[0].poradi) : null;
}

/**
 * Koho hráči nabídnout.
 *
 * Bere celý svět, ne jen okolí — Aréna je celosvětová. Filtruje na
 * podobnou Poctu a úroveň, vynechá sebe, zabanované, ty, s kým hráč
 * nedávno bojoval, a ty, proti komu dnes už bojoval dost.
 */
async function vyberSoupere(ja, n) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.level, c.pocta, c.class, c.gender
       FROM characters c
       JOIN users u ON u.id = c.user_id
      WHERE c.id <> $1
        AND (u.banned_until IS NULL OR u.banned_until < NOW())
        AND ABS(COALESCE(c.pocta, 0) - $2) <= $3
        AND ABS(c.level - $4) <= $5
        AND NOT EXISTS (
          SELECT 1 FROM arena_fights f
           WHERE f.utocnik_id = $1 AND f.obranca_id = c.id
             AND f.vytvoreno > NOW() - ($6 || ' minutes')::interval
        )
        AND (
          SELECT COUNT(*) FROM arena_fights f2
           WHERE f2.utocnik_id = $1 AND f2.obranca_id = c.id
             AND f2.vytvoreno > NOW() - INTERVAL '1 day'
        ) < $7
      ORDER BY ABS(COALESCE(c.pocta, 0) - $2), random()
      LIMIT $8`,
    [ja.id, ja.pocta || 0, n.arena_rozsah_pocty, ja.level, n.arena_rozsah_urovni,
     n.arena_odveta_minut, n.arena_denni_limit_na_souepre, n.arena_pocet_souperu]
  );

  return rows.map(r => ({
    id: r.id, jmeno: r.name, uroven: r.level, pocta: r.pocta || 0,
    class: r.class, gender: r.gender,
    // hráč vidí předem, o co hraje
    ziskam: zmenaPocty(ja.pocta || 0, r.pocta || 0, true, n),
    ztratim: zmenaPocty(ja.pocta || 0, r.pocta || 0, false, n),
  }));
}

// Odpočinek arény podle úrovně — stejné stupně jako u výpravy.
function zakladniOdpocinekArena(uroven) {
  const L = uroven || 1;
  if (L <= 10) return 15 * 1000;
  if (L <= 20) return 30 * 1000;
  if (L <= 35) return 45 * 1000;
  if (L <= 50) return 90 * 1000;
  return 150 * 1000;
}

function vysledekZeZaznamu(z) {
  const prubeh = typeof z.prubeh === 'string' ? JSON.parse(z.prubeh) : z.prubeh;
  return {
    ok: true,
    id: z.id,
    vyhral: z.vyhral_utocnik,
    pocta: { pred: z.pocta_utocnik_pred, po: z.pocta_utocnik_po, zmena: z.zmena_utocnik },
    prubeh,
  };
}

// ---------------------------------------------------------------
//  GET /api/arena/state — Pocta, pořadí, soupeři, poslední souboje
// ---------------------------------------------------------------
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const ja = await mojePostava(null, req.user.id);
    if (!ja) return res.status(404).json({ error: 'Postava nenalezena' });

    const n = await nactiNastaveni();
    const [poradi, souperi, posledni, odpocet] = await Promise.all([
      poradiVZebricku(ja.id),
      vyberSoupere(ja, n),
      pool.query(
        `SELECT s.*, u.name AS utocnik_jmeno, o.name AS obranca_jmeno
           FROM arena_fights s
           LEFT JOIN characters u ON u.id = s.utocnik_id
           LEFT JOIN characters o ON o.id = s.obranca_id
          WHERE s.utocnik_id = $1 OR s.obranca_id = $1
          ORDER BY s.vytvoreno DESC LIMIT 10`, [ja.id]),
      pool.query(
        `SELECT plati_do, NOW() AS ted FROM character_cooldowns
          WHERE character_id = $1 AND druh = 'arena'`, [ja.id]),
    ]);

    const zbyvaOdpocet = odpocet.rows.length
      ? Math.max(0, new Date(odpocet.rows[0].plati_do) - new Date(odpocet.rows[0].ted))
      : 0;

    res.json({
      ja: { id: ja.id, jmeno: ja.name, uroven: ja.level, pocta: ja.pocta || 0, poradi },
      souperi,
      odpocet: zbyvaOdpocet,
      posledni: posledni.rows.map(s => ({
        id: s.id,
        kdy: s.vytvoreno,
        utocil: s.utocnik_id === ja.id,
        souper: s.utocnik_id === ja.id ? s.obranca_jmeno : s.utocnik_jmeno,
        vyhral: s.utocnik_id === ja.id ? s.vyhral_utocnik : !s.vyhral_utocnik,
        zmenaPocty: s.utocnik_id === ja.id ? s.zmena_utocnik : s.zmena_obranca,
      })),
      config: n,
    });
  } catch (err) {
    console.error('arena/state:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
//  POST /api/arena/fight — souboj
//
//  Tělo: { obrancaId, klic }
//
//  `klic` je jednorázový klíč od hráče. Ukládá se s UNIQUE, takže
//  dvojklik, obnovení stránky ani druhá záložka nevyvolají druhý
//  souboj — vrátí se týž výsledek, který už jednou padl.
// ---------------------------------------------------------------
router.post('/fight', authenticateToken, async (req, res) => {
  const obrancaId = parseInt(req.body && req.body.obrancaId, 10);
  const klic = String((req.body && req.body.klic) || '').slice(0, 64);

  if (!Number.isFinite(obrancaId)) return res.status(400).json({ error: 'Chybí soupeř' });
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(klic)) {
    return res.status(400).json({ error: 'Chybí nebo neplatný klíč požadavku' });
  }

  // Nejdřív mimo transakci: existuje záznam s tímhle klíčem? Když ano,
  // souboj už proběhl a vracíme jeho výsledek beze změny.
  const { rows: uz } = await pool.query('SELECT * FROM arena_fights WHERE klic = $1', [klic]);
  if (uz.length) return res.json({ ...vysledekZeZaznamu(uz[0]), opakovane: true });

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');

    const ja = await mojePostava(klient, req.user.id);
    if (!ja) {
      await klient.query('ROLLBACK');
      return res.status(404).json({ error: 'Postava nenalezena' });
    }
    if (ja.id === obrancaId) {
      await klient.query('ROLLBACK');
      return res.status(400).json({ error: 'Sám proti sobě bojovat nemůžeš' });
    }

    // Obě postavy zamkneme naráz a seřazené podle id, aby se dva
    // souběžné souboje nezablokovaly navzájem.
    const { rows: obe } = await klient.query(
      'SELECT * FROM characters WHERE id = ANY($1) ORDER BY id FOR UPDATE',
      [[ja.id, obrancaId]]
    );
    if (obe.length !== 2) {
      await klient.query('ROLLBACK');
      return res.status(404).json({ error: 'Soupeř nenalezen' });
    }

    const utocnik = obe.find(c => c.id === ja.id);
    const obranca = obe.find(c => c.id === obrancaId);
    const n = await nactiNastaveni();

    // Běží odpočinek?
    const { rows: cd } = await klient.query(
      `SELECT plati_do, NOW() AS ted FROM character_cooldowns
        WHERE character_id = $1 AND druh = 'arena' FOR UPDATE`, [utocnik.id]
    );
    if (cd.length) {
      const zbyva = new Date(cd[0].plati_do) - new Date(cd[0].ted);
      if (zbyva > 0) {
        await klient.query('ROLLBACK');
        return res.status(429).json({ error: 'Ještě si odpočiň', zbyva });
      }
    }

    // Odvetu i denní strop ověřujeme znovu — seznam soupeřů, který má
    // klient, může být zastaralý nebo podstrčený.
    const { rows: nedavno } = await klient.query(
      `SELECT COUNT(*) FILTER (WHERE vytvoreno > NOW() - ($3 || ' minutes')::interval)::int AS odveta,
              COUNT(*) FILTER (WHERE vytvoreno > NOW() - INTERVAL '1 day')::int AS dnes
         FROM arena_fights WHERE utocnik_id = $1 AND obranca_id = $2`,
      [utocnik.id, obranca.id, n.arena_odveta_minut]
    );
    if (nedavno[0].odveta > 0) {
      await klient.query('ROLLBACK');
      return res.status(429).json({ error: 'S tímhle soupeřem jsi nedávno bojoval' });
    }
    if (nedavno[0].dnes >= n.arena_denni_limit_na_souepre) {
      await klient.query('ROLLBACK');
      return res.status(429).json({ error: 'Dnes už jsi proti němu bojoval dost' });
    }

    // ---- souboj: rozhoduje server ----
    // Bere se snímek obou postav z databáze, ne nic od klienta.
    const seminko = crypto.randomInt(0, 2147483647);
    const vysledek = odehrajSouboj(
      profil(utocnik), profil(obranca), nahodaSeSeminkem(seminko)
    );

    const zmena = zmenaPocty(utocnik.pocta || 0, obranca.pocta || 0, vysledek.vyhralUtocnik, n);
    const podil = Math.max(0, Math.min(1, Number(n.arena_podil_obrance)));

    const zmenaU = vysledek.vyhralUtocnik ? zmena : -zmena;
    const zmenaO = Math.round((vysledek.vyhralUtocnik ? -zmena : zmena) * podil);

    // Pocta nesmí klesnout pod nulu.
    const poctaUpred = utocnik.pocta || 0, poctaOpred = obranca.pocta || 0;
    const poctaUpo = Math.max(0, poctaUpred + zmenaU);
    const poctaOpo = Math.max(0, poctaOpred + zmenaO);

    await klient.query('UPDATE characters SET pocta = $1, updated_at = NOW() WHERE id = $2',
                       [poctaUpo, utocnik.id]);
    await klient.query('UPDATE characters SET pocta = $1 WHERE id = $2',
                       [poctaOpo, obranca.id]);

    // Odpočinek — stejný mechanismus jako u výpravy, Paladinovi kratší.
    const jePaladin = utocnik.paladin_until && new Date(utocnik.paladin_until) > new Date();
    const zakladCd = zakladniOdpocinekArena(utocnik.level);
    const delkaCd = Math.round(zakladCd * (jePaladin ? 0.5 : 1));

    await klient.query(
      `INSERT INTO character_cooldowns (character_id, druh, plati_do)
       VALUES ($1, 'arena', NOW() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (character_id, druh) DO UPDATE SET plati_do = EXCLUDED.plati_do`,
      [utocnik.id, delkaCd]
    );

    // Záznam souboje. UNIQUE na klíči je pojistka, kdyby dva souběžné
    // požadavky prošly až sem.
    const { rows: zapis } = await klient.query(
      `INSERT INTO arena_fights
         (klic, utocnik_id, obranca_id, vyhral_utocnik,
          pocta_utocnik_pred, pocta_utocnik_po, zmena_utocnik,
          pocta_obranca_pred, pocta_obranca_po, zmena_obranca,
          seminko, prubeh)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (klic) DO NOTHING
       RETURNING *`,
      [klic, utocnik.id, obranca.id, vysledek.vyhralUtocnik,
       poctaUpred, poctaUpo, poctaUpo - poctaUpred,
       poctaOpred, poctaOpo, poctaOpo - poctaOpred,
       seminko, JSON.stringify(vysledek)]
    );

    if (!zapis.length) {
      // Někdo nás předběhl se stejným klíčem — vrátíme jeho výsledek.
      await klient.query('ROLLBACK');
      const { rows: jiz } = await pool.query('SELECT * FROM arena_fights WHERE klic = $1', [klic]);
      return res.json({ ...vysledekZeZaznamu(jiz[0]), opakovane: true });
    }

    await klient.query(
      `INSERT INTO game_events (character_id, druh, zlato, exp, podrobnosti)
       VALUES ($1, 'arena_souboj', 0, 0, $2)`,
      [utocnik.id, JSON.stringify({
        obranca: obranca.id, vyhra: vysledek.vyhralUtocnik,
        zmenaPocty: poctaUpo - poctaUpred, kol: vysledek.kol,
      })]
    );

    await klient.query('COMMIT');

    console.log(
      `[arena] ${utocnik.name} vs ${obranca.name}: ` +
      `${vysledek.vyhralUtocnik ? 'výhra' : 'prohra'}, ` +
      `Pocta ${poctaUpred}→${poctaUpo} / ${poctaOpred}→${poctaOpo}, ${vysledek.kol} kol`
    );

    res.json({
      ...vysledekZeZaznamu(zapis[0]),
      souper: { id: obranca.id, jmeno: obranca.name, uroven: obranca.level },
      poradi: await poradiVZebricku(utocnik.id),
      odpocinek: delkaCd,
    });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('arena/fight:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------
//  GET /api/arena/leaderboard — celosvětový žebříček podle Pocty
// ---------------------------------------------------------------
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const [zebricek, celkem, ja] = await Promise.all([
      pool.query(
        `SELECT RANK() OVER (ORDER BY c.pocta DESC, c.level DESC, c.id ASC) AS poradi,
                c.id, c.name, c.level, c.pocta
           FROM characters c
           JOIN users u ON u.id = c.user_id
          WHERE (u.banned_until IS NULL OR u.banned_until < NOW())
          ORDER BY c.pocta DESC, c.level DESC, c.id ASC
          LIMIT $1 OFFSET $2`, [limit, offset]),
      pool.query('SELECT COUNT(*)::int AS n FROM characters'),
      mojePostava(null, req.user.id),
    ]);

    res.json({
      zebricek: zebricek.rows.map(r => ({
        poradi: Number(r.poradi), id: r.id, jmeno: r.name,
        uroven: r.level, pocta: r.pocta || 0,
      })),
      celkem: celkem.rows[0].n,
      ja: ja ? { id: ja.id, poradi: await poradiVZebricku(ja.id), pocta: ja.pocta || 0 } : null,
      limit, offset,
    });
  } catch (err) {
    console.error('arena/leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Overeni spravce pres databazi (stejne jako u paladina).
const poolRef = pool;
async function jeSpravce(userId) {
  const { rows } = await poolRef.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return !!(rows.length && rows[0].is_admin);
}

// ---------------------------------------------------------------
//  GET/PUT /api/arena/config — nastaveni pro spravce
// ---------------------------------------------------------------
router.get('/config', authenticateToken, async (req, res) => {
  try {
    if (!await jeSpravce(req.user.id)) return res.status(403).json({ error: 'Jen pro spravce' });
    res.json({ config: await nactiNastaveni(), popisky: POPISKY, vychozi: VYCHOZI });
  } catch (err) {
    console.error('arena/config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    if (!await jeSpravce(req.user.id)) return res.status(403).json({ error: 'Jen pro spravce' });
    const zmeny = req.body && req.body.config;
    if (!zmeny || typeof zmeny !== 'object') return res.status(400).json({ error: 'Chybi config' });

    const ulozene = {};
    for (const [klic, hodnota] of Object.entries(zmeny)) {
      if (!(klic in VYCHOZI)) continue;
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo) || cislo < 0) continue;
      await pool.query(
        `INSERT INTO arena_config (klic, hodnota) VALUES ($1, $2)
         ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`,
        [klic, cislo]
      );
      ulozene[klic] = cislo;
    }
    zahodCache();
    console.log(`[arena] spravce ${req.user.id} zmenil nastaveni:`, ulozene);
    res.json({ message: 'Ulozeno', ulozene, config: await nactiNastaveni() });
  } catch (err) {
    console.error('arena/config PUT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.nactiNastaveni = nactiNastaveni;
module.exports.zahodCache = zahodCache;

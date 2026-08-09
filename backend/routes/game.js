const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { nactiNastaveni, stavPaladina } = require('./paladin');

const router = express.Router();

// Jeden bod za deset minut. Stejné pro výpravu i bludiště.
const REGENERACE_MS = 10 * 60 * 1000;

// Základní odpočinek po souboji podle úrovně. Dřív se počítal
// v prohlížeči; teď o něm rozhoduje server.
function zakladniOdpocinek(uroven) {
  const L = uroven || 1;
  if (L <= 10) return 15 * 1000;
  if (L <= 20) return 30 * 1000;
  if (L <= 35) return 45 * 1000;
  if (L <= 50) return 90 * 1000;
  return 150 * 1000;
}

const DRUHY = {
  exped:   { normal: 'normal_expedition_points_max', paladin: 'paladin_expedition_points_max',
             nasobitel: 'paladin_expedition_time_multiplier' },
  dungeon: { normal: 'normal_labyrinth_points_max',  paladin: 'paladin_labyrinth_points_max',
             nasobitel: 'paladin_labyrinth_time_multiplier' },
  arena:   { normal: 'normal_expedition_points_max', paladin: 'paladin_expedition_points_max',
             nasobitel: 'paladin_arena_cooldown_multiplier' },
  turma:   { normal: 'normal_expedition_points_max', paladin: 'paladin_expedition_points_max',
             nasobitel: 'paladin_circus_turma_cooldown_multiplier' },
};

// Strop bodů určuje server podle toho, jestli je členství platné.
function stropBodu(druh, nastaveni, jePaladin) {
  const d = DRUHY[druh];
  if (!d) return 0;
  return Math.max(0, Math.round(nastaveni[jePaladin ? d.paladin : d.normal]));
}

/**
 * Dopočítá body ke dnešku a uloží je.
 *
 * Po vypršení členství se body NAD běžný strop nemažou — hráč o ně
 * nepřijde. Jen se nad stropem neregenerují; jakmile klesne pod něj,
 * doplňování pokračuje k běžnému stropu.
 */
async function dopocitejBody(klient, characterId, druh, strop) {
  const { rows } = await klient.query(
    `SELECT body, doplneno_at, NOW() AS ted
       FROM character_points
      WHERE character_id = $1 AND druh = $2
        FOR UPDATE`,
    [characterId, druh]
  );

  if (!rows.length) {
    // prvni pouziti - zacina s plnym stropem
    const { rows: nove } = await klient.query(
      `INSERT INTO character_points (character_id, druh, body, doplneno_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING body, doplneno_at`,
      [characterId, druh, strop]
    );
    return { body: nove[0].body, doplneno_at: nove[0].doplneno_at };
  }

  let { body, doplneno_at } = rows[0];
  const ted = new Date(rows[0].ted).getTime();
  let od = new Date(doplneno_at).getTime();

  if (body < strop) {
    const pribylo = Math.floor((ted - od) / REGENERACE_MS);
    if (pribylo > 0) {
      body = Math.min(strop, body + pribylo);
      od += pribylo * REGENERACE_MS;
    }
  }
  // Na stropu (nebo nad nim) se cas posouva, aby se po utrate
  // nezapocitala regenerace zpetne.
  if (body >= strop) od = ted;

  const noveOd = new Date(od);
  await klient.query(
    `UPDATE character_points SET body = $1, doplneno_at = $2
      WHERE character_id = $3 AND druh = $4`,
    [body, noveOd, characterId, druh]
  );
  return { body, doplneno_at: noveOd };
}

// Kolik zbývá do dalšího bodu (0 když je plno)
function doDalsihoBodu(body, strop, doplneno_at, ted) {
  if (body >= strop) return 0;
  const uplynulo = ted - new Date(doplneno_at).getTime();
  return Math.max(0, REGENERACE_MS - (uplynulo % REGENERACE_MS));
}

async function postavaUzivatele(klient, userId) {
  const { rows } = await klient.query(
    'SELECT id, level FROM characters WHERE user_id = $1', [userId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------
// GET /api/game/state — body, odpočty a stav členství pohromadě
// ---------------------------------------------------------------
router.get('/state', authenticateToken, async (req, res) => {
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const postava = await postavaUzivatele(klient, req.user.id);
    if (!postava) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Character not found' }); }

    const [nastaveni, stav] = await Promise.all([nactiNastaveni(), stavPaladina(req.user.id)]);
    const ted = Date.now();

    const body = {};
    for (const druh of ['exped', 'dungeon']) {
      const strop = stropBodu(druh, nastaveni, stav.aktivni);
      const b = await dopocitejBody(klient, postava.id, druh, strop);
      body[druh] = {
        body: b.body,
        strop,
        nadStrop: b.body > strop,          // zbylo z clenstvi, neregeneruje se
        doDalsiho: doDalsihoBodu(b.body, strop, b.doplneno_at, ted),
      };
    }

    const { rows: cd } = await klient.query(
      `SELECT druh, plati_do FROM character_cooldowns WHERE character_id = $1`, [postava.id]
    );
    const odpocty = {};
    for (const r of cd) {
      odpocty[r.druh] = Math.max(0, new Date(r.plati_do).getTime() - ted);
    }

    await klient.query('COMMIT');
    res.json({ paladin: stav, body, odpocty, serverTime: ted });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('game/state:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------
// POST /api/game/spend — utratí bod a nastaví odpočinek
// Tělo: { druh: 'exped' | 'dungeon' | 'arena' | 'turma' }
// ---------------------------------------------------------------
router.post('/spend', authenticateToken, async (req, res) => {
  const druh = String((req.body && req.body.druh) || '');
  if (!DRUHY[druh]) return res.status(400).json({ error: 'Neznámý druh' });

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const postava = await postavaUzivatele(klient, req.user.id);
    if (!postava) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Character not found' }); }

    const [nastaveni, stav] = await Promise.all([nactiNastaveni(), stavPaladina(req.user.id)]);

    // bezi jeste odpocinek?
    const { rows: cd } = await klient.query(
      `SELECT plati_do, NOW() AS ted FROM character_cooldowns
        WHERE character_id = $1 AND druh = $2 FOR UPDATE`,
      [postava.id, druh]
    );
    if (cd.length) {
      const zbyva = new Date(cd[0].plati_do).getTime() - new Date(cd[0].ted).getTime();
      if (zbyva > 0) {
        await klient.query('ROLLBACK');
        return res.status(429).json({ error: 'Ještě si odpočiň', zbyva });
      }
    }

    // body jen u vypravy a bludiste; arena a turma maji zatim jen odpocet
    let zbyvaBodu = null, strop = null;
    if (druh === 'exped' || druh === 'dungeon') {
      strop = stropBodu(druh, nastaveni, stav.aktivni);
      const b = await dopocitejBody(klient, postava.id, druh, strop);
      if (b.body <= 0) {
        await klient.query('ROLLBACK');
        return res.status(400).json({ error: 'Došly body', body: 0, strop });
      }
      const { rows } = await klient.query(
        `UPDATE character_points SET body = body - 1
          WHERE character_id = $1 AND druh = $2 RETURNING body`,
        [postava.id, druh]
      );
      zbyvaBodu = rows[0].body;
    }

    // Odpocinek pocita server. Paladinovi se zkracuje nasobitelem
    // z nastaveni - klient o delce nerozhoduje.
    const zaklad = zakladniOdpocinek(postava.level);
    const nasobitel = stav.aktivni ? Number(nastaveni[DRUHY[druh].nasobitel]) : 1;
    const delka = Math.max(0, Math.round(zaklad * (Number.isFinite(nasobitel) ? nasobitel : 1)));

    await klient.query(
      `INSERT INTO character_cooldowns (character_id, druh, plati_do)
       VALUES ($1, $2, NOW() + ($3 || ' milliseconds')::interval)
       ON CONFLICT (character_id, druh)
       DO UPDATE SET plati_do = EXCLUDED.plati_do`,
      [postava.id, druh, delka]
    );

    await klient.query('COMMIT');
    res.json({
      ok: true, druh,
      body: zbyvaBodu, strop,
      odpocinek: delka,
      zaklad,                       // pro ladeni: kolik by to bylo bez clenstvi
      paladin: stav.aktivni,
    });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('game/spend:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

module.exports = router;
module.exports.zakladniOdpocinek = zakladniOdpocinek;
module.exports.stropBodu = stropBodu;

const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { nactiNastaveni, stavPaladina } = require('./paladin');
const { odmenaZaSouboj, sBonusem } = require('../config/odmeny');

const router = express.Router();

/**
 * Zapíše, co se ve hře stalo.
 *
 * Bez těchto záznamů nešlo spočítat, kolik bylo výprav ani kolik
 * zlata přibylo. Selhání zápisu nesmí shodit samotnou akci — proto
 * jen zaloguje a jde dál.
 */
async function zapisUdalost(klient, characterId, druh, zlato = 0, exp = 0, podrobnosti = null) {
  try {
    await klient.query(
      `INSERT INTO game_events (character_id, druh, zlato, exp, podrobnosti)
       VALUES ($1, $2, $3, $4, $5)`,
      [characterId, druh, zlato, exp, podrobnosti ? JSON.stringify(podrobnosti) : null]
    );
  } catch (err) {
    console.error('Zápis události selhal:', err.message);
  }
}


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

    await zapisUdalost(klient, postava.id, 'zacatek_' + druh, 0, 0,
                       { paladin: stav.aktivni, odpocinek: delka });

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


// ---------------------------------------------------------------
// POST /api/game/reward — připíše odměnu za vyhraný souboj
//
// Klient hlásí jen KOHO porazil (úroveň lokace a pořadí protivníka),
// ne kolik za to chce. Částku počítá server ze svého vzorce a přidá
// bonus Paladina, pokud členství skutečně platí.
//
// Poctivé anti-cheat by potřebovalo vyhodnocovat celý souboj na
// serveru — to je další etapa. Tady je zajištěná aspoň VÝŠE odměny.
// ---------------------------------------------------------------
router.post('/reward', authenticateToken, async (req, res) => {
  const druh = String((req.body && req.body.druh) || 'exped');
  if (!['exped', 'dungeon', 'arena', 'turma'].includes(druh)) {
    return res.status(400).json({ error: 'Neznámý druh' });
  }
  const urovenLokace = Number((req.body && req.body.urovenLokace) || 1);
  const poradi = Number((req.body && req.body.poradi) || 0);

  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');

    const { rows: postavy } = await klient.query(
      'SELECT id, level, gold, experience FROM characters WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (!postavy.length) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Character not found' }); }
    const postava = postavy[0];

    const [nastaveni, stav] = await Promise.all([nactiNastaveni(), stavPaladina(req.user.id)]);

    const zaklad = odmenaZaSouboj(urovenLokace, poradi, druh);
    const zlato = sBonusem(zaklad.zlato, stav.aktivni ? nastaveni.paladin_gold_bonus_percent : 0);
    const exp   = sBonusem(zaklad.exp,   stav.aktivni ? nastaveni.paladin_xp_bonus_percent   : 0);

    const { rows: nove } = await klient.query(
      `UPDATE characters
          SET gold = gold + $1, experience = experience + $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    RETURNING gold, experience`,
      [zlato.celkem, exp.celkem, postava.id]
    );

    await zapisUdalost(klient, postava.id, 'odmena_' + druh, zlato.celkem, exp.celkem,
                       { zaklad: { zlato: zlato.zaklad, exp: exp.zaklad },
                         bonus:  { zlato: zlato.bonus,  exp: exp.bonus },
                         paladin: stav.aktivni, urovenLokace, poradi });

    await klient.query('COMMIT');

    // Zaklad, bonus a vysledek zvlast - at je v logu videt, odkud
    // se cislo vzalo, kdyby se nekdy nezdalo.
    console.log(
      `[odmena] hráč ${req.user.id} (${druh}): ` +
      `zlato ${zlato.zaklad}+${zlato.bonus}=${zlato.celkem}, ` +
      `xp ${exp.zaklad}+${exp.bonus}=${exp.celkem}` +
      (stav.aktivni ? ' [paladin]' : '')
    );

    res.json({
      ok: true, druh, paladin: stav.aktivni,
      zlato, exp,                       // kazde s poli zaklad/bonus/celkem
      gold: nove[0].gold, experience: nove[0].experience,
    });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('game/reward:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------
// POST /api/game/merchant-refresh — obnova zboží
//
// Paladin má denně pár obnov zdarma. Kolik jich vyčerpal, si drží
// server podle svého data — z prohlížeče by to šlo přepsat.
// ---------------------------------------------------------------
router.post('/merchant-refresh', authenticateToken, async (req, res) => {
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');

    const { rows: postavy } = await klient.query(
      'SELECT id FROM characters WHERE user_id = $1 FOR UPDATE', [req.user.id]
    );
    if (!postavy.length) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Character not found' }); }
    const characterId = postavy[0].id;

    const [nastaveni, stav] = await Promise.all([nactiNastaveni(), stavPaladina(req.user.id)]);
    const zdarmaDenne = stav.aktivni
      ? Math.max(0, Math.round(nastaveni.paladin_free_merchant_refreshes_per_day))
      : 0;

    // Den bereme z databaze, ne z prohlizece.
    const { rows: dnesRows } = await klient.query(
      `SELECT pouzito FROM merchant_refreshes
        WHERE character_id = $1 AND den = CURRENT_DATE FOR UPDATE`,
      [characterId]
    );
    const pouzito = dnesRows.length ? dnesRows[0].pouzito : 0;
    const zdarma = pouzito < zdarmaDenne;

    await klient.query(
      `INSERT INTO merchant_refreshes (character_id, den, pouzito)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (character_id, den) DO UPDATE SET pouzito = merchant_refreshes.pouzito + 1`,
      [characterId]
    );

    await klient.query('COMMIT');
    res.json({
      ok: true, zdarma,
      pouzito: pouzito + 1,
      zdarmaDenne,
      zbyvaZdarma: Math.max(0, zdarmaDenne - (pouzito + 1)),
      paladin: stav.aktivni,
    });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('game/merchant-refresh:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

module.exports = router;
module.exports.zakladniOdpocinek = zakladniOdpocinek;
module.exports.stropBodu = stropBodu;

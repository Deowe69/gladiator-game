const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { VYCHOZI, POPISKY } = require('../config/paladin');

const router = express.Router();

// ---------------------------------------------------------------
// Nastavení Paladina. Čte se z databáze, ne z kódu — admin ho může
// měnit a hra i server pak počítají s novými hodnotami.
// ---------------------------------------------------------------
let cache = null, cacheDo = 0;

async function nactiNastaveni() {
  if (cache && Date.now() < cacheDo) return cache;

  const { rows } = await pool.query('SELECT klic, hodnota FROM paladin_config');
  const out = { ...VYCHOZI };
  for (const r of rows) out[r.klic] = Number(r.hodnota);

  cache = out;
  cacheDo = Date.now() + 30 * 1000;   // krátká paměť, ať admin nemusí čekat
  return out;
}

function zahodCache() { cache = null; cacheDo = 0; }

// Spravcovska prava overujeme v databazi, ne z tokenu. Token by nesl
// stav z doby prihlaseni - odebrana prava by platila az po odhlaseni.
async function jeSpravce(userId) {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return !!(rows.length && rows[0].is_admin);
}

// ---------------------------------------------------------------
// Stav členství. Rozhoduje výhradně čas serveru — datum z prohlížeče
// se nikde nepoužívá.
// ---------------------------------------------------------------
async function stavPaladina(userId) {
  const { rows } = await pool.query(
    `SELECT paladin_until, NOW() AS ted FROM characters WHERE user_id = $1`, [userId]
  );
  if (!rows.length) return { aktivni: false, do: null };

  const doKdy = rows[0].paladin_until;
  const ted = rows[0].ted;
  return {
    aktivni: !!doKdy && new Date(doKdy) > new Date(ted),
    do: doKdy,
    serverTime: ted,
  };
}

// ---------------------------------------------------------------
// GET /api/paladin/status — stav + nastavení pohromadě, aby si hra
// nemusela skládat dva dotazy.
// ---------------------------------------------------------------
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const [stav, nastaveni] = await Promise.all([
      stavPaladina(req.user.id),
      nactiNastaveni(),
    ]);
    res.json({ paladin: stav, config: nastaveni });
  } catch (err) {
    console.error('paladin/status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/paladin/buy — nákup členství.
// Smaragdy odečítá server, cenu i délku bere z nastavení. Klient
// neposílá nic, co by šlo zneužít.
// ---------------------------------------------------------------
router.post('/buy', authenticateToken, async (req, res) => {
  const klient = await pool.connect();
  try {
    const nastaveni = await nactiNastaveni();
    const cena = Math.max(0, Math.round(nastaveni.paladin_price_emeralds));
    const dni  = Math.max(1, Math.round(nastaveni.paladin_duration_days));

    await klient.query('BEGIN');

    // zamkneme radek, aby dva soubezne pozadavky neodecetly dvakrat
    const { rows } = await klient.query(
      'SELECT id, emeralds, paladin_until FROM characters WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (!rows.length) {
      await klient.query('ROLLBACK');
      return res.status(404).json({ error: 'Character not found' });
    }

    const postava = rows[0];
    if ((postava.emeralds || 0) < cena) {
      await klient.query('ROLLBACK');
      return res.status(400).json({
        error: 'Nedostatek smaragdů', potreba: cena, mas: postava.emeralds || 0,
      });
    }

    // Kdyz uz Paladina ma, nove obdobi se pricte k tomu, co zbyva.
    const { rows: vysledek } = await klient.query(
      `UPDATE characters
          SET emeralds      = emeralds - $1,
              paladin_until = GREATEST(COALESCE(paladin_until, NOW()), NOW())
                              + ($2 || ' days')::interval,
              updated_at    = CURRENT_TIMESTAMP
        WHERE user_id = $3
    RETURNING emeralds, paladin_until`,
      [cena, dni, req.user.id]
    );

    await klient.query('COMMIT');

    console.log(`[paladin] hráč ${req.user.id}: −${cena} smaragdů, členství do ${vysledek[0].paladin_until.toISOString()}`);
    res.json({
      message: 'Paladin aktivován',
      emeralds: vysledek[0].emeralds,
      paladin: { aktivni: true, do: vysledek[0].paladin_until },
      zaplaceno: cena,
      dni,
    });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('paladin/buy:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------
// GET /api/paladin/config — pro admina, i s popisky do formuláře
// ---------------------------------------------------------------
router.get('/config', authenticateToken, async (req, res) => {
  try {
    if (!await jeSpravce(req.user.id)) return res.status(403).json({ error: 'Jen pro správce' });
    const nastaveni = await nactiNastaveni();
    res.json({
      config: nastaveni,
      popisky: POPISKY,
      vychozi: VYCHOZI,
    });
  } catch (err) {
    console.error('paladin/config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// PUT /api/paladin/config — uloží změněné hodnoty
// ---------------------------------------------------------------
router.put('/config', authenticateToken, async (req, res) => {
  try {
    if (!await jeSpravce(req.user.id)) return res.status(403).json({ error: 'Jen pro správce' });

    const zmeny = req.body && req.body.config;
    if (!zmeny || typeof zmeny !== 'object') {
      return res.status(400).json({ error: 'Chybí config' });
    }

    // Bereme jen klice, ktere znamе — cizi se ignorujou.
    const ulozene = {};
    for (const [klic, hodnota] of Object.entries(zmeny)) {
      if (!(klic in VYCHOZI)) continue;
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo) || cislo < 0) continue;

      await pool.query(
        `INSERT INTO paladin_config (klic, hodnota) VALUES ($1, $2)
         ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`,
        [klic, cislo]
      );
      ulozene[klic] = cislo;
    }

    zahodCache();
    console.log(`[paladin] správce ${req.user.id} změnil nastavení:`, ulozene);
    res.json({ message: 'Nastavení uloženo', ulozene, config: await nactiNastaveni() });
  } catch (err) {
    console.error('paladin/config PUT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.nactiNastaveni = nactiNastaveni;
module.exports.stavPaladina = stavPaladina;

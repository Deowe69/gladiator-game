const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce, zapisAkci } = require('../middleware/admin');

const router = express.Router();

// Každý endpoint pod /api/admin musí projít oběma kontrolami.
router.use(authenticateToken, pouzeSpravce);

// Vlastnosti, které smí správce měnit. Cokoliv mimo tenhle seznam
// se z požadavku zahodí — jinak by šlo přepsat třeba user_id.
const UPRAVITELNE = [
  'level', 'experience', 'gold', 'emeralds', 'health', 'max_health',
  'strength', 'skill', 'agility', 'defense', 'intelligence', 'pocta',
];

const cislo = (v, min = 0, max = 2000000000) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};

// ---------------------------------------------------------------
// GET /api/admin/dashboard — čísla ze skutečných dat
// ---------------------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    const [uzivatele, postavy, ekonomika, logy] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS celkem,
               COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int AS dnes,
               COUNT(*) FILTER (WHERE banned_until IS NOT NULL AND banned_until > NOW())::int AS zabanovanych
          FROM users`),
      pool.query(`
        SELECT COUNT(*)::int AS postav,
               COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 day')::int AS aktivnich_24h,
               COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '5 minutes')::int AS online,
               COUNT(*) FILTER (WHERE paladin_until > NOW())::int AS paladinu
          FROM characters`),
      pool.query(`
        SELECT COALESCE(SUM(gold),0)::bigint AS zlato,
               COALESCE(SUM(emeralds),0)::bigint AS smaragdy,
               COALESCE(ROUND(AVG(gold)),0)::int AS prumer_zlato,
               COALESCE(MAX(level),0)::int AS nejvyssi_uroven
          FROM characters`),
      pool.query(`
        SELECT l.id, l.akce, l.cil, l.cil_id, l.vytvoreno, u.username AS spravce
          FROM admin_logs l LEFT JOIN users u ON u.id = l.spravce_id
         ORDER BY l.vytvoreno DESC LIMIT 10`),
    ]);

    res.json({
      hraci: uzivatele.rows[0],
      postavy: postavy.rows[0],
      ekonomika: ekonomika.rows[0],
      posledniAkce: logy.rows,
      // Cisla, ktera zatim nemame kde vzit - rikame to rovnou,
      // misto abychom ukazovali nulu jako fakt.
      chybejici: ['dokončené výpravy', 'souboje v bludišti', 'souboje v aréně', 'turnaje'],
    });
  } catch (err) {
    console.error('admin/dashboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/admin/players — seznam s hledáním a řazením
// ---------------------------------------------------------------
const RADIT_PODLE = {
  level: 'c.level', gold: 'c.gold', emeralds: 'c.emeralds',
  experience: 'c.experience', name: 'c.name', username: 'u.username',
  created: 'u.created_at', updated: 'c.updated_at',
};

router.get('/players', async (req, res) => {
  try {
    const hledat = String(req.query.q || '').trim();
    const sloupec = RADIT_PODLE[req.query.sort] || 'c.level';
    const smer = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const kde = hledat ? `WHERE u.username ILIKE $3 OR c.name ILIKE $3` : '';
    const params = hledat ? [limit, offset, '%' + hledat + '%'] : [limit, offset];

    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.username, u.email, u.is_admin, u.created_at,
              u.banned_until, u.ban_reason,
              c.id AS character_id, c.name, c.level, c.experience, c.gold, c.emeralds,
              c.health, c.max_health, c.strength, c.skill, c.agility, c.defense,
              c.intelligence, c.pocta, c.paladin_until, c.updated_at,
              (c.updated_at > NOW() - INTERVAL '5 minutes') AS online,
              (u.banned_until IS NOT NULL AND u.banned_until > NOW()) AS zabanovan
         FROM users u LEFT JOIN characters c ON c.user_id = u.id
         ${kde}
        ORDER BY ${sloupec} ${smer} NULLS LAST
        LIMIT $1 OFFSET $2`,
      params
    );

    const { rows: pocet } = await pool.query(
      hledat ? `SELECT COUNT(*)::int AS n FROM users u LEFT JOIN characters c ON c.user_id = u.id
                 WHERE u.username ILIKE $1 OR c.name ILIKE $1`
             : `SELECT COUNT(*)::int AS n FROM users`,
      hledat ? ['%' + hledat + '%'] : []
    );

    res.json({ hraci: rows, celkem: pocet[0].n, limit, offset });
  } catch (err) {
    console.error('admin/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/admin/players/:id — detail jednoho hráče
// ---------------------------------------------------------------
router.get('/players/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.username, u.email, u.is_admin, u.created_at,
              u.banned_until, u.ban_reason, c.*
         FROM users u LEFT JOIN characters c ON c.user_id = u.id
        WHERE u.id = $1`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Hráč nenalezen' });

    const [body, odpocty] = await Promise.all([
      pool.query('SELECT druh, body, doplneno_at FROM character_points WHERE character_id = $1', [rows[0].id]),
      pool.query('SELECT druh, plati_do FROM character_cooldowns WHERE character_id = $1', [rows[0].id]),
    ]);

    res.json({ hrac: rows[0], body: body.rows, odpocty: odpocty.rows });
  } catch (err) {
    console.error('admin/players/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// PUT /api/admin/players/:id — úprava postavy
// ---------------------------------------------------------------
router.put('/players/:id', async (req, res) => {
  const klient = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    await klient.query('BEGIN');

    const { rows: pred } = await klient.query(
      'SELECT * FROM characters WHERE user_id = $1 FOR UPDATE', [id]
    );
    if (!pred.length) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    const zmeny = {}, sql = [], params = [];
    for (const klic of UPRAVITELNE) {
      if (!(klic in (req.body || {}))) continue;
      const v = cislo(req.body[klic]);
      if (v === null || v === pred[0][klic]) continue;
      params.push(v);
      sql.push(`${klic} = $${params.length}`);
      zmeny[klic] = { pred: pred[0][klic], po: v };
    }

    if (!sql.length) { await klient.query('ROLLBACK'); return res.json({ message: 'Nic ke změně', zmeny: {} }); }

    params.push(id);
    const { rows: po } = await klient.query(
      `UPDATE characters SET ${sql.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${params.length} RETURNING *`, params
    );
    await klient.query('COMMIT');

    await zapisAkci({
      spravceId: req.user.id, akce: 'uprava_postavy', cil: 'character', cilId: po[0].id,
      pred: Object.fromEntries(Object.entries(zmeny).map(([k, v]) => [k, v.pred])),
      po:   Object.fromEntries(Object.entries(zmeny).map(([k, v]) => [k, v.po])),
    });

    res.json({ message: 'Uloženo', zmeny, postava: po[0] });
  } catch (err) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('admin/players PUT:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    klient.release();
  }
});

// ---------------------------------------------------------------
// POST /api/admin/players/:id/ban  —  { dny, duvod }
// ---------------------------------------------------------------
router.post('/players/:id/ban', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) return res.status(400).json({ error: 'Sám sebe zabanovat nemůžeš' });

    const dny = Math.max(0, Math.round(Number(req.body && req.body.dny) || 0));
    const duvod = String((req.body && req.body.duvod) || '').slice(0, 500);

    // dny = 0 znamena natrvalo
    const { rows } = await pool.query(
      `UPDATE users
          SET banned_until = ${dny > 0 ? `NOW() + ($2 || ' days')::interval` : `'9999-12-31'::timestamptz`},
              ban_reason = $${dny > 0 ? 3 : 2}
        WHERE id = $1
    RETURNING id, username, banned_until, ban_reason`,
      dny > 0 ? [id, dny, duvod] : [id, duvod]
    );
    if (!rows.length) return res.status(404).json({ error: 'Hráč nenalezen' });

    await zapisAkci({ spravceId: req.user.id, akce: 'ban', cil: 'user', cilId: id,
                      po: { do: rows[0].banned_until, duvod } });
    res.json({ message: 'Hráč zabanován', hrac: rows[0] });
  } catch (err) {
    console.error('admin/ban:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/players/:id/unban', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(
      `UPDATE users SET banned_until = NULL, ban_reason = NULL
        WHERE id = $1 RETURNING id, username`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Hráč nenalezen' });

    await zapisAkci({ spravceId: req.user.id, akce: 'unban', cil: 'user', cilId: id });
    res.json({ message: 'Ban zrušen', hrac: rows[0] });
  } catch (err) {
    console.error('admin/unban:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// DELETE /api/admin/players/:id — smazání účtu
// Vyžaduje potvrzení jménem, aby to nešlo omylem.
// ---------------------------------------------------------------
router.delete('/players/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) return res.status(400).json({ error: 'Sám sebe smazat nemůžeš' });

    const { rows: kdo } = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (!kdo.length) return res.status(404).json({ error: 'Hráč nenalezen' });

    if (String(req.body && req.body.potvrzeni) !== kdo[0].username) {
      return res.status(400).json({
        error: 'Smazání je potřeba potvrdit jménem hráče', ocekavano: kdo[0].username,
      });
    }

    await zapisAkci({ spravceId: req.user.id, akce: 'smazani_hrace', cil: 'user', cilId: id,
                      pred: { username: kdo[0].username } });
    await pool.query('DELETE FROM users WHERE id = $1', [id]);   // postava padá s ním (CASCADE)

    res.json({ message: 'Hráč smazán', username: kdo[0].username });
  } catch (err) {
    console.error('admin/delete:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/admin/logs — historie zásahů
// ---------------------------------------------------------------
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const { rows } = await pool.query(
      `SELECT l.*, u.username AS spravce
         FROM admin_logs l LEFT JOIN users u ON u.id = l.spravce_id
        ORDER BY l.vytvoreno DESC LIMIT $1`, [limit]
    );
    res.json({ logy: rows });
  } catch (err) {
    console.error('admin/logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

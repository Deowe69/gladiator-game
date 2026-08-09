const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Vytvoření postavy
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, gender, class: charClass } = req.body;
    const userId = req.user.id;

    if (!name || !gender) return res.status(400).json({ error: 'Name and gender are required' });

    const existing = await pool.query('SELECT * FROM characters WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'User already has a character' });

    const result = await pool.query(
      `INSERT INTO characters (user_id, name, gender, class) VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, name, gender, charClass || 'Warrior']
    );

    res.status(201).json({ message: 'Character created successfully', character: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Načtení postavy
router.get('/my-character', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM characters WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Character not found' });
    res.json({ character: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Aktualizace postavy (všechny stats)
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { level, experience, health, max_health, gold, strength, defense, agility, intelligence,
            skill, pocta, emeralds } = req.body;

    const result = await pool.query(
      `UPDATE characters
       SET level         = COALESCE($1,  level),
           experience    = COALESCE($2,  experience),
           health        = COALESCE($3,  health),
           max_health    = COALESCE($4,  max_health),
           gold          = COALESCE($5,  gold),
           strength      = COALESCE($6,  strength),
           skill         = COALESCE($11, skill),
           pocta         = COALESCE($12, pocta),
           emeralds      = COALESCE($13, emeralds),
           defense       = COALESCE($7,  defense),
           agility       = COALESCE($8,  agility),
           intelligence  = COALESCE($9,  intelligence),
           updated_at    = CURRENT_TIMESTAMP
       WHERE user_id = $10
       RETURNING *`,
      [level, experience, health, max_health, gold, strength, defense, agility, intelligence, req.user.id,
       skill, pocta, emeralds]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Character not found' });
    res.json({ message: 'Character updated successfully', character: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Žebříček - top 10 hráčů
router.get('/leaderboard', async (req, res) => {
  try {
    // Vraci i vlastnosti, aby se proti hraci dalo v arene bojovat.
    // Zebricek je verejny, takze zadne citlive udaje - jen to,
    // co je stejne videt na jeho profilu.
    const result = await pool.query(
      `SELECT c.name, c.level, c.class, c.gender, u.username,
              c.strength, c.defense, c.agility, c.intelligence,
              c.max_health, c.experience, c.skill, c.pocta
       FROM characters c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.level DESC, c.experience DESC
       LIMIT 30`
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/character', characterRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Auto-vytvoření tabulek
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        class VARCHAR(50) NOT NULL DEFAULT 'Warrior',
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        health INTEGER DEFAULT 100,
        max_health INTEGER DEFAULT 100,
        strength INTEGER DEFAULT 10,
        defense INTEGER DEFAULT 10,
        agility INTEGER DEFAULT 10,
        intelligence INTEGER DEFAULT 10,
        gold INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Sloupce, ktere pribyly az pozdeji. IF NOT EXISTS je bezpecne
    // spoustet pri kazdem startu - na uz upravene databazi neudela nic.
    const noveSloupce = [
      ['skill',    'INTEGER DEFAULT 10'],   // Dovednost
      ['pocta',    'INTEGER DEFAULT 0'],    // Pocta z areny
      ['emeralds', 'INTEGER DEFAULT 0'],    // smaragdy na premium
    ];
    for (const [jmeno, typ] of noveSloupce) {
      await pool.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS ${jmeno} ${typ};`);
    }

    console.log('✅ Database tables ready!');
  } catch (err) {
    console.error('❌ DB init error:', err);
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`🎮 Gladiator Game Server running on port ${PORT}`);
  await initDB();
});

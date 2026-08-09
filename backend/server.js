const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./config/db');
const { MAX_UROVEN, XP_DO_DALSI } = require('./config/xp');
const { VYCHOZI: PALADIN_VYCHOZI } = require('./config/paladin');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const paladinRoutes = require('./routes/paladin');
const gameRoutes = require('./routes/game');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/paladin', paladinRoutes);
app.use('/api/game', gameRoutes);

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

    // Clenstvi Paladina u postavy a priznak spravce u uctu.
    await pool.query(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS paladin_until TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`);

    // Nastaveni Paladina. Drzi se v databazi, aby slo menit z adminu
    // bez zasahu do kodu.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS paladin_config (
        klic    TEXT PRIMARY KEY,
        hodnota NUMERIC NOT NULL
      );
    `);
    for (const [klic, hodnota] of Object.entries(PALADIN_VYCHOZI)) {
      // DO NOTHING - uz ulozenou hodnotu restart serveru neprepise
      await pool.query(
        'INSERT INTO paladin_config (klic, hodnota) VALUES ($1, $2) ON CONFLICT (klic) DO NOTHING',
        [klic, hodnota]
      );
    }

    // Body a odpocty. Drive to bylo v prohlizeci, takze si je hrac
    // mohl prepsat; ted o nich rozhoduje server.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_points (
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        druh         TEXT    NOT NULL,
        body         INTEGER NOT NULL DEFAULT 0,
        doplneno_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (character_id, druh)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_cooldowns (
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        druh         TEXT    NOT NULL,
        plati_do     TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (character_id, druh)
      );
    `);

    // Kolik obnov zbozi hrac dnes vycerpal. Den urcuje databaze,
    // ne prohlizec.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS merchant_refreshes (
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        den          DATE    NOT NULL,
        pouzito      INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (character_id, den)
      );
    `);

    // Tabulka zkusenosti. Je to herni pravidlo, ne data hrace, ale
    // v databazi ji chceme, aby si ji server mohl overit sam.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS xp_levels (
        level      INTEGER PRIMARY KEY,
        xp_to_next BIGINT,
        xp_total   BIGINT NOT NULL
      );
    `);

    // Naplnime ji jen kdyz je prazdna nebo se zmenila delka tabulky.
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM xp_levels');
    if (rows[0].n !== MAX_UROVEN) {
      await pool.query('TRUNCATE xp_levels');
      let celkem = 0;
      const hodnoty = [];
      for (let l = 1; l <= MAX_UROVEN; l++) {
        const doDalsi = l >= MAX_UROVEN ? null : XP_DO_DALSI[l];
        hodnoty.push(`(${l}, ${doDalsi === null ? 'NULL' : doDalsi}, ${celkem})`);
        if (doDalsi) celkem += doDalsi;
      }
      await pool.query(
        `INSERT INTO xp_levels (level, xp_to_next, xp_total) VALUES ${hodnoty.join(',')}`
      );
      console.log(`✅ Tabulka zkušeností naplněna: ${MAX_UROVEN} úrovní, celkem ${celkem.toLocaleString('cs-CZ')} XP`);
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

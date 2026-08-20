const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./config/db');
const { MAX_UROVEN, XP_DO_DALSI } = require('./config/xp');
const { VYCHOZI: PALADIN_VYCHOZI } = require('./config/paladin');
const { VYCHOZI: ARENA_VYCHOZI } = require('./config/arena');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const paladinRoutes = require('./routes/paladin');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const { PREDMETY, NEPRATELE } = require('./config/katalog');
const katalogRoutes = require('./routes/katalog');
const arenaRoutes = require('./routes/arena');

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
app.use('/api/admin', adminRoutes);
app.use('/api/katalog', katalogRoutes);
app.use('/api/arena', arenaRoutes);

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

    // Bany a historie spravcovskych zasahu.
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id           SERIAL PRIMARY KEY,
        spravce_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        akce         TEXT    NOT NULL,
        cil          TEXT,
        cil_id       INTEGER,
        hodnota_pred JSONB,
        hodnota_po   JSONB,
        vytvoreno    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS admin_logs_cas ON admin_logs (vytvoreno DESC);`);

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

    // Správcovská práva při startu. Jména se berou z proměnné
    // prostředí ADMIN_USERS (oddělená čárkou), jinak platí výchozí.
    // Děláme to při každém startu, aby šlo právo obnovit, aniž by
    // se muselo lézt přímo do databáze.
    const spravci = (process.env.ADMIN_USERS || 'deowe')
      .split(',').map(s => s.trim()).filter(Boolean);
    for (const jmeno of spravci) {
      const { rowCount } = await pool.query(
        `UPDATE users SET is_admin = TRUE
          WHERE LOWER(username) = LOWER($1) AND is_admin IS DISTINCT FROM TRUE`,
        [jmeno]
      );
      if (rowCount) console.log(`✅ Správcovská práva udělena: ${jmeno}`);
    }

    // Záznamy o tom, co se ve hře dělo. Bez nich nešlo spočítat,
    // kolik bylo výprav a soubojů ani kolik zlata přibylo.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_events (
        id           BIGSERIAL PRIMARY KEY,
        character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        druh         TEXT    NOT NULL,
        zlato        INTEGER NOT NULL DEFAULT 0,
        exp          INTEGER NOT NULL DEFAULT 0,
        podrobnosti  JSONB,
        vytvoreno    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS game_events_cas ON game_events (vytvoreno DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS game_events_druh ON game_events (druh, vytvoreno DESC);`);

    // Katalog předmětů a nepřátel. Dřív byl napsaný v game.js,
    // takže každá úprava znamenala zásah do kódu.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id              TEXT PRIMARY KEY,
        nazev           TEXT NOT NULL,
        skupina         TEXT NOT NULL,
        ikona           TEXT,
        kvalita         TEXT NOT NULL DEFAULT 'common',
        klic_vlastnosti TEXT,
        hodnota         INTEGER NOT NULL DEFAULT 0,
        cena            INTEGER NOT NULL DEFAULT 0,
        poskozeni_od    INTEGER,
        poskozeni_do    INTEGER,
        popis_statu     TEXT,
        povoleno        BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enemies (
        klic          TEXT PRIMARY KEY,
        jmeno         TEXT NOT NULL,
        obrazek       TEXT,
        lokace        TEXT NOT NULL,
        lokace_nazev  TEXT,
        uroven_lokace INTEGER NOT NULL DEFAULT 1,
        poradi        INTEGER NOT NULL DEFAULT 0,
        povoleno      BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // Naplní se jen to, co ještě není. DO NOTHING znamená, že
    // restart serveru nikdy nepřepíše, co si admin upravil.
    for (const it of PREDMETY) {
      await pool.query(
        `INSERT INTO items (id, nazev, skupina, ikona, kvalita, klic_vlastnosti,
                            hodnota, cena, poskozeni_od, poskozeni_do, popis_statu, povoleno)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [it.id, it.nazev, it.skupina, it.ikona, it.kvalita, it.klic_vlastnosti,
         it.hodnota, it.cena, it.poskozeni_od, it.poskozeni_do, it.popis_statu, it.povoleno]
      );
    }
    for (const n of NEPRATELE) {
      await pool.query(
        `INSERT INTO enemies (klic, jmeno, obrazek, lokace, lokace_nazev,
                              uroven_lokace, poradi, povoleno)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (klic) DO NOTHING`,
        [n.klic, n.jmeno, n.obrazek, n.lokace, n.lokace_nazev,
         n.uroven_lokace, n.poradi, n.povoleno]
      );
    }
    const { rows: pocty } = await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM items) AS predmetu,
              (SELECT COUNT(*)::int FROM enemies) AS nepratel`
    );
    console.log(`✅ Katalog: ${pocty[0].predmetu} předmětů, ${pocty[0].nepratel} nepřátel`);

    // Souboje v Areně. klic je jednorazovy klic od hrace - UNIQUE
    // brani dvojimu zapisu pri dvojkliku, obnoveni nebo druhe zalozce.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS arena_fights (
        id                  BIGSERIAL PRIMARY KEY,
        klic                TEXT UNIQUE NOT NULL,
        utocnik_id          INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        obranca_id          INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        vyhral_utocnik      BOOLEAN NOT NULL,
        pocta_utocnik_pred  INTEGER NOT NULL,
        pocta_utocnik_po    INTEGER NOT NULL,
        zmena_utocnik       INTEGER NOT NULL,
        pocta_obranca_pred  INTEGER NOT NULL,
        pocta_obranca_po    INTEGER NOT NULL,
        zmena_obranca       INTEGER NOT NULL,
        seminko             BIGINT,
        prubeh              JSONB,
        vytvoreno           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS arena_fights_utocnik ON arena_fights (utocnik_id, vytvoreno DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS arena_fights_obranca ON arena_fights (obranca_id, vytvoreno DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS characters_pocta ON characters (pocta DESC, level DESC, id ASC);`);

    // Nastaveni Areny - meni se ze spravy.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS arena_config (
        klic    TEXT PRIMARY KEY,
        hodnota NUMERIC NOT NULL
      );
    `);
    for (const [klic, hodnota] of Object.entries(ARENA_VYCHOZI)) {
      await pool.query(
        'INSERT INTO arena_config (klic, hodnota) VALUES ($1, $2) ON CONFLICT (klic) DO NOTHING',
        [klic, hodnota]
      );
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

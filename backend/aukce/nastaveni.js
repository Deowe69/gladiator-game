// Nastavení Aukční síně z databáze (aukce_config), s krátkou cache.
// Když v DB něco chybí, doplní se z VYCHOZI — server tak funguje i před
// prvním uložením ze správy.

const pool = require('../config/db');
const { VYCHOZI } = require('../config/aukce');

let cache = null, cacheDo = 0;
const PLATNOST_MS = 30 * 1000;

async function nactiNastaveni() {
  if (cache && Date.now() < cacheDo) return cache;
  const out = { ...VYCHOZI };
  try {
    const { rows } = await pool.query('SELECT klic, hodnota FROM aukce_config');
    for (const r of rows) out[r.klic] = Number(r.hodnota);
  } catch { /* před initDB nebo výpadek — vrátíme aspoň VYCHOZI */ }
  cache = out; cacheDo = Date.now() + PLATNOST_MS;
  return out;
}

function zahodCache() { cache = null; cacheDo = 0; }

module.exports = { nactiNastaveni, zahodCache };

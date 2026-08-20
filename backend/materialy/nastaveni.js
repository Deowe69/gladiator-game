// Načtení konfigurace materiálů: kód (bezpečné defaulty) + DB přepisy, s cache.
// Sdílí ho reward endpoint (ostrá hra) i správa. Po uložení ze správy se cache
// zneplatní, takže změny platí živě bez restartu.

const pool = require('../config/db');
const M = require('../config/materialy');
const { hash } = require('../sim/nahoda');

let cache = null, cacheDo = 0;
const PLATNOST_MS = 30 * 1000;

async function nactiKonfiguraci() {
  if (cache && Date.now() < cacheDo) return cache;
  let dbGlobal = null, dbMat = [];
  try {
    const g = await pool.query(`SELECT hodnota FROM material_global WHERE klic = 'global_drop_chance'`);
    if (g.rows[0]) dbGlobal = { globalMaterialDropChance: Number(g.rows[0].hodnota) };
    const r = await pool.query('SELECT * FROM material_config');
    dbMat = r.rows;
  } catch {
    // DB nedostupná / poškozená → bezpečně vracíme validované defaulty
  }
  cache = M.slucKonfiguraci(dbGlobal, dbMat);
  cacheDo = Date.now() + PLATNOST_MS;
  return cache;
}

function zahodCache() { cache = null; cacheDo = 0; }

// Verze konfigurace = otisk aktuálních hodnot (pro audit i simulátor).
function verzeKonfigurace(cfg) {
  const podpis = {
    g: cfg.globalMaterialDropChance,
    m: cfg.materialy.map(x => [x.id, x.enabled, x.weight, x.minQuantity, x.maxQuantity, x.minEnemyLevel, x.maxEnemyLevel, x.normalEnemyEnabled, x.bossEnabled, x.dungeonEnabled, x.expeditionEnabled]),
  };
  return hash(JSON.stringify(podpis)).toString(16);
}

module.exports = { nactiKonfiguraci, zahodCache, verzeKonfigurace };

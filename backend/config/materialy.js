// ==========================================================================
//  MATERIÁLY — centrální systém dropu surovin (samostatný, laditelný)
// ==========================================================================
//
// JEDINÝ zdroj pravdy pro drop materiálů. Volá ho jak ostrá hra (serverový
// reward endpoint), tak balanční simulátor — se STEJNOU konfigurací, aby
// simulace odpovídala realitě.
//
// Materiály jsou NEZÁVISLÉ na vybavení: jeden poražený nepřítel může dát
// XP+zlato + materiál + vybavení; každý hod je zvlášť. Žádná vzácnost —
// jen relativní VÁHY uvnitř společného poolu.
//
// Dvoustupňový hod:
//   1) padne vůbec materiál?  → globalMaterialDropChance (%)
//   2) když ano, vyber materiál podle relativních vah z ZPŮSOBILÉHO poolu
//      (enabled + splňuje úroveň nepřítele + povolený zdroj), pak množství.
//
// Konfigurace z kódu = bezpečné výchozí hodnoty; admin je v DB přepíše.

// Výchozí globální šance (v %). Pracovní baseline, edituje se ze správy.
const VYCHOZI_GLOBAL = { globalMaterialDropChance: 45 };

// 13 materiálů. `nazev`/`en` pro lokalizaci, `ikona` cesta k obrázku.
// Všechny od úrovně 1 do stropu (min/max úrovně jsou tu pro budoucí ladění).
const STROP_UROVNE = require('./xp').MAX_UROVEN;

function m(id, nazev, en, ikona, weight, minQ, maxQ) {
  return {
    id, nazev, en, ikona,
    enabled: true, weight,
    minQuantity: minQ, maxQuantity: maxQ,
    minEnemyLevel: 1, maxEnemyLevel: STROP_UROVNE,
    normalEnemyEnabled: true, bossEnabled: true,
    dungeonEnabled: true, expeditionEnabled: true,
  };
}

// Pracovní výchozí váhy a množství (ne finální — doladí Balanční simulátor).
const VYCHOZI_MATERIALY = [
  m('wood',     'Dřevo',   'Wood',     'materialy/drevo.jpg',  18,  1, 3),
  m('stone',    'Kámen',   'Stone',    'materialy/kamen.jpg',  18,  1, 3),
  m('sand',     'Písek',   'Sand',     'materialy/pisek.jpg',  14,  1, 3),
  m('wool',     'Vlna',    'Wool',     'materialy/vlna.jpg',   14,  1, 2),
  m('rope',     'Provaz',  'Rope',     'materialy/provaz.jpg', 10,  1, 2),
  m('iron',     'Železo',  'Iron',     'materialy/zelezo.jpg',  9,  1, 2),
  m('bronze',   'Bronz',   'Bronze',   'materialy/bronz.jpg',   7,  1, 2),
  m('glass',    'Sklo',    'Glass',    'materialy/sklo.jpg',    5,  1, 2),
  m('gold',     'Zlato',   'Gold',     'materialy/zlato.jpg',   2.5, 1, 1),
  m('ruby',     'Rubín',   'Ruby',     'materialy/rubin.jpg',   0.8, 1, 1),
  m('sapphire', 'Safír',   'Sapphire', 'materialy/safir.jpg',   0.7, 1, 1),
  m('emerald',  'Smaragd', 'Emerald',  'materialy/smaragd.jpg', 0.6, 1, 1),
  m('diamond',  'Diamant', 'Diamond',  'materialy/diamant.jpg', 0.4, 1, 1),
];

// Bezpečnostní stropy (proti zničení ekonomiky překlepem).
const LIMITY = {
  maxWeight: 100000, maxQuantity: 9999, maxChance: 100,
};

// --------------------------------------------------------------------------
//  KONFIGURACE (kód → přepíše DB)
// --------------------------------------------------------------------------
// Vrátí čerstvou kopii výchozí konfigurace.
function vychoziKonfigurace() {
  return {
    globalMaterialDropChance: VYCHOZI_GLOBAL.globalMaterialDropChance,
    materialy: VYCHOZI_MATERIALY.map(x => ({ ...x })),
  };
}

// Sloučí DB přepisy nad výchozí (jen validní hodnoty; jinak default).
function slucKonfiguraci(dbGlobal, dbMaterialy) {
  const cfg = vychoziKonfigurace();
  if (dbGlobal && Number.isFinite(+dbGlobal.globalMaterialDropChance)) {
    cfg.globalMaterialDropChance = clamp(+dbGlobal.globalMaterialDropChance, 0, LIMITY.maxChance);
  }
  const podle = {};
  for (const r of (dbMaterialy || [])) podle[r.id] = r;
  for (const mat of cfg.materialy) {
    const o = podle[mat.id];
    if (!o) continue;
    if (typeof o.enabled === 'boolean') mat.enabled = o.enabled;
    if (Number.isFinite(+o.weight)) mat.weight = clamp(+o.weight, 0, LIMITY.maxWeight);
    if (Number.isFinite(+o.min_qty)) mat.minQuantity = clampInt(+o.min_qty, 1, LIMITY.maxQuantity);
    if (Number.isFinite(+o.max_qty)) mat.maxQuantity = clampInt(+o.max_qty, mat.minQuantity, LIMITY.maxQuantity);
    if (Number.isFinite(+o.min_level)) mat.minEnemyLevel = clampInt(+o.min_level, 1, STROP_UROVNE);
    if (Number.isFinite(+o.max_level)) mat.maxEnemyLevel = clampInt(+o.max_level, mat.minEnemyLevel, STROP_UROVNE);
    for (const k of ['normal_enabled', 'boss_enabled', 'dungeon_enabled', 'expedition_enabled']) {
      const cil = { normal_enabled: 'normalEnemyEnabled', boss_enabled: 'bossEnabled', dungeon_enabled: 'dungeonEnabled', expedition_enabled: 'expeditionEnabled' }[k];
      if (typeof o[k] === 'boolean') mat[cil] = o[k];
    }
  }
  return cfg;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const clampInt = (x, a, b) => Math.max(a, Math.min(b, Math.round(x)));

// --------------------------------------------------------------------------
//  ZPŮSOBILOST + VÝBĚR + HOD
// --------------------------------------------------------------------------
// Zdroj: 'expedition' | 'dungeon' | 'normal'. Boss: true/false.
function jeZpusobily(mat, kontext) {
  if (!mat.enabled || mat.weight <= 0) return false;
  const L = kontext.level || 1;
  if (L < mat.minEnemyLevel || L > mat.maxEnemyLevel) return false;
  if (kontext.boss) { if (!mat.bossEnabled) return false; }
  else if (!mat.normalEnemyEnabled) return false;
  if (kontext.zdroj === 'dungeon' && !mat.dungeonEnabled) return false;
  if (kontext.zdroj === 'expedition' && !mat.expeditionEnabled) return false;
  return true;
}

function zpusobile(cfg, kontext) {
  return cfg.materialy.filter(mat => jeZpusobily(mat, kontext));
}

// Vážený výběr jednoho materiálu z pole. `nahoda()` → [0,1).
function vyberVazene(materialy, nahoda) {
  const soucet = materialy.reduce((s, m2) => s + m2.weight, 0);
  if (soucet <= 0) return null;
  let x = nahoda() * soucet;
  for (const mat of materialy) { x -= mat.weight; if (x < 0) return mat; }
  return materialy[materialy.length - 1];
}

// Dvoustupňový hod. Vrací { id, mnozstvi } nebo null.
// `nahoda()` musí vracet [0,1). Vše se rozhoduje tady (server/simulátor).
function hodMaterial(cfg, kontext, nahoda) {
  // 1) padne vůbec?
  if (nahoda() >= (cfg.globalMaterialDropChance || 0) / 100) return null;
  // 2) výběr ze způsobilého poolu
  const pool = zpusobile(cfg, kontext);
  if (!pool.length) return null;
  const mat = vyberVazene(pool, nahoda);
  if (!mat) return null;
  // množství
  const min = mat.minQuantity, max = Math.max(min, mat.maxQuantity);
  const mnozstvi = min + Math.floor(nahoda() * (max - min + 1));
  return { id: mat.id, mnozstvi };
}

// --------------------------------------------------------------------------
//  PRAVDĚPODOBNOSTI (pro náhled ve správě i report)
// --------------------------------------------------------------------------
// Pro daný kontext (default: normální nepřítel na úrovni 1..strop) vrátí
// pro každý materiál: váhu, výběrové % z poolu, přibližné % na zabití.
function pravdepodobnosti(cfg, kontext = { level: 1, zdroj: 'expedition', boss: false }) {
  const pool = zpusobile(cfg, kontext);
  const soucet = pool.reduce((s, m2) => s + m2.weight, 0) || 1;
  const chance = (cfg.globalMaterialDropChance || 0) / 100;
  return cfg.materialy.map(mat => {
    const zpus = pool.includes(mat);
    const vyber = zpus ? mat.weight / soucet : 0;
    return {
      id: mat.id, nazev: mat.nazev, en: mat.en, ikona: mat.ikona,
      enabled: mat.enabled, weight: mat.weight, zpusobily: zpus,
      vyberPct: vyber * 100,          // % výběru uvnitř poolu
      celkovePct: vyber * chance * 100, // ≈ % na jedno zabití
    };
  });
}

// --------------------------------------------------------------------------
//  VALIDACE (server-authoritative)
// --------------------------------------------------------------------------
function overKonfiguraci(cfg) {
  const chyby = [];
  const g = +cfg.globalMaterialDropChance;
  if (!Number.isFinite(g) || g < 0 || g > 100) chyby.push('Globální šance musí být 0–100 %.');
  for (const mat of (cfg.materialy || [])) {
    const jm = mat.id;
    if (!Number.isFinite(+mat.weight) || +mat.weight < 0) chyby.push(`${jm}: váha musí být ≥ 0.`);
    if (+mat.weight > LIMITY.maxWeight) chyby.push(`${jm}: váha nad bezpečným stropem ${LIMITY.maxWeight}.`);
    if (!Number.isFinite(+mat.minQuantity) || +mat.minQuantity < 1) chyby.push(`${jm}: min. množství ≥ 1.`);
    if (!Number.isFinite(+mat.maxQuantity) || +mat.maxQuantity < +mat.minQuantity) chyby.push(`${jm}: max. množství ≥ min.`);
    if (+mat.maxQuantity > LIMITY.maxQuantity) chyby.push(`${jm}: množství nad stropem ${LIMITY.maxQuantity}.`);
    if (!Number.isFinite(+mat.minEnemyLevel) || +mat.minEnemyLevel < 1) chyby.push(`${jm}: min. úroveň ≥ 1.`);
    if (!Number.isFinite(+mat.maxEnemyLevel) || +mat.maxEnemyLevel < +mat.minEnemyLevel) chyby.push(`${jm}: max. úroveň ≥ min.`);
    if (mat.enabled && +mat.weight <= 0) chyby.push(`${jm}: zapnutý materiál musí mít váhu > 0.`);
  }
  return chyby;
}

module.exports = {
  VYCHOZI_GLOBAL, VYCHOZI_MATERIALY, LIMITY, STROP_UROVNE,
  vychoziKonfigurace, slucKonfiguraci,
  jeZpusobily, zpusobile, vyberVazene, hodMaterial,
  pravdepodobnosti, overKonfiguraci,
};

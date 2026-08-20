// ==========================================================================
//  AUKČNÍ SÍŇ — konfigurace a čisté výpočty
// ==========================================================================
//
// Systémová aukce: předměty generuje server (přes config/predmety.js), hráči
// si NIC nevystavují (to bude jednou samostatné Tržiště). Získat se dá:
//   • Přihoz  = Zlato (soutěžní dražba)
//   • Koupit hned (Buy Now) = Smaragdy (okamžitě)
//
// Všechny hodnoty jsou centrálně laditelné (VYCHOZI, přepíše admin z DB).
// Čas řídí VÝHRADNĚ server (UTC/NOW()); klientskému času se nevěří.

const predmety = require('./predmety');

const STAV = {
  AKTIVNI: 'ACTIVE',
  PRODANO_PRIHOZEM: 'COMPLETED_BY_BID',
  KOUPENO_HNED: 'COMPLETED_BY_BUY_NOW',
  BEZ_PRIHOZU: 'EXPIRED_WITHOUT_BID',
  CEKA_DORUCENI: 'DELIVERY_PENDING',
  DORUCENO: 'DELIVERED',
};

const VYCHOZI = {
  // --- trvání ---
  trvani_s: 3600,               // standardní délka aukce = 1 hodina

  // --- anti-sniping ---
  antisnipe_okno_s: 60,         // přihoz v posledních 60 s…
  antisnipe_prodlouzeni_s: 60,  // …prodlouží aukci o 60 s (opakovaně)

  // --- viditelnost podle úrovně ---
  viditelnost_nad: 5,           // hráč vidí předměty do (úroveň + 5)
  strop_urovne: predmety.MAX_UROVEN_PREDMETU,   // = autoritativní strop hry (500)

  // --- ceny ---
  zlato_za_hodnotu: 18,         // startovní přihoz = hodnota × tohle
  zlato_start_min: 100,
  prihoz_procento: 0.05,        // min. navýšení: 5 % ze současného…
  prihoz_min_abs: 25,           // …nebo aspoň tolik zlata

  smaragd_delitel: 18,          // Buy Now smaragdy = hodnota / tohle
  smaragd_min: 2,
  smaragd_max: 60,

  // --- generování (stav = počet aktivních aukcí, drží se v rozsahu) ---
  auction_min_items: 15,        // nikdy méně aktivních (jen při chybě obsahu)
  auction_max_items: 50,        // nikdy více aktivních
  generace_interval_s: 300,     // jak často doplňovat
  generace_max_davka: 12,       // max nových aukcí za jedno doplnění
  buynow_dostupnost: 1.0,       // KAŽDÁ aukce má Buy Now (1 = všechny)
  uroven_min: 1,                // rozsah úrovní generovaných předmětů
  uroven_max: predmety.MAX_UROVEN_PREDMETU,
};

// --- viditelnost ---
function viditelnyStrop(uroven, c = VYCHOZI) {
  return Math.min((uroven || 1) + c.viditelnost_nad, c.strop_urovne);
}
function smiVidet(urovenPredmetu, urovenHrace, c = VYCHOZI) {
  return urovenPredmetu <= viditelnyStrop(urovenHrace, c);
}

// --- ceny ---
function startovniZlato(predmet, c = VYCHOZI) {
  const h = predmety.hodnotaPredmetu(predmet);
  return Math.max(c.zlato_start_min, Math.round(h * c.zlato_za_hodnotu));
}
function minPristiPrihoz(soucasny, c = VYCHOZI) {
  return soucasny + Math.max(c.prihoz_min_abs, Math.round(soucasny * c.prihoz_procento));
}
function buyNowSmaragdy(predmet, c = VYCHOZI) {
  const h = predmety.hodnotaPredmetu(predmet);
  return Math.max(c.smaragd_min, Math.min(c.smaragd_max, Math.round(h / c.smaragd_delitel)));
}

// --- anti-sniping ---
// Vrátí nový konec aukce po platném přihozu. Pracuje jen se serverovým časem
// (ms). Když do konce zbývá ≤ okno, posune konec na (teď + prodloužení).
function novyKonecPoPrihozu(konecMs, nyniMs, c = VYCHOZI) {
  const zbyva = konecMs - nyniMs;
  if (zbyva <= c.antisnipe_okno_s * 1000) return nyniMs + c.antisnipe_prodlouzeni_s * 1000;
  return konecMs;
}

module.exports = {
  STAV, VYCHOZI,
  viditelnyStrop, smiVidet,
  startovniZlato, minPristiPrihoz, buyNowSmaragdy,
  novyKonecPoPrihozu,
};

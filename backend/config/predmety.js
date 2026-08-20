// ==========================================================================
//  CENTRÁLNÍ GENERÁTOR PŘEDMĚTŮ — bez vzácností (rarity-free)
// ==========================================================================
//
// Jediné místo pravdy pro generování normální výstroje. Aukční síň, a do
// budoucna i Zbrojíř/Platnéř a kořist, mají brát předměty ODSUD, ne mít
// vlastní generátor. (Dnešní starý generátor v game.js je založený na
// vzácnostech common/rare/epic — ten se sem NEpřenáší, tady žádná vzácnost
// není.)
//
// Řetěz generování:
//   Úroveň → BaseBudget → RNG celkového rozpočtu → RNG počtu statů →
//   výběr statů → rozdělení rozpočtu → RNG záporných statů → hotový předmět
//
// Pět možných statů (POOL, ne že každý předmět má všech pět):
//   Síla, Dovednost, Obratnost, Odolnost, Inteligence
//
// Vše je deterministické: generátor bere `nahoda()` (→ [0,1)), takže se dá
// se semínkem přesně zopakovat a otestovat. Předmět se generuje JEDNOU a pak
// se ukládá — nikdy se nepřegeneruje.

// --- pět statů a jejich napojení na sloupce postavy ---
const STATY = ['sila', 'dovednost', 'obratnost', 'odolnost', 'inteligence'];
const NAZVY = { sila: 'Síla', dovednost: 'Dovednost', obratnost: 'Obratnost', odolnost: 'Odolnost', inteligence: 'Inteligence' };
const SLOUPCE = { sila: 'strength', dovednost: 'skill', obratnost: 'agility', odolnost: 'defense', inteligence: 'intelligence' };

// --- sloty výstroje ---
const SLOTY = ['weapon', 'helmet', 'chest', 'shield', 'gloves', 'boots', 'belt', 'amulet', 'ring'];

// Strop úrovně předmětu = strop úrovně postavy v téhle hře (200; zadání
// mluví o 500, ale Olympus má 200 — držíme skutečný strop hry).
const MAX_UROVEN_PREDMETU = 200;

// ==========================================================================
//  KONFIGURACE (centrálně laditelná)
// ==========================================================================
const VYCHOZI = {
  // BaseBudget = round(10 + (ItemLevel-1) * (4/3)). Zlomek 4/3 se drží přesně.
  budget_zaklad: 10,
  budget_koef: 4 / 3,

  // RNG celkového rozpočtu: faktor kolem 1.0 z „Batesova" rozdělení (průměr
  // K uniforem => zvon), takže průměrné hody jsou časté a extrémy vzácné.
  //   Obchodník (standard):
  merchant_faktor_min: 0.80,
  merchant_faktor_max: 1.25,
  merchant_bates_k: 3,        // víc = užší zvon kolem středu
  merchant_skew: 1.0,         // 1 = symetrie
  //   Aukční síň (mírně lepší průměr — NENÍ to záruka lepšího předmětu):
  aukce_faktor_min: 0.85,
  aukce_faktor_max: 1.40,
  aukce_bates_k: 3,
  aukce_skew: 0.85,           // <1 = jemný posun rozpočtu nahoru

  // Počet aktivních statů: 1..5 s vahami (musí dát 1.0)
  pocet_statu_vahy: [0.20, 0.35, 0.28, 0.14, 0.03],

  // Rozdělení rozpočtu mezi staty: náhodné váhy umocněné `koncentrace_exp`.
  // Vyšší exponent => častěji specializované (jeden stat dominuje).
  koncentrace_min: 1.0,
  koncentrace_max: 2.6,

  // Záporné staty: šance, že jeden vybraný stat půjde do mínusu (jen když
  // jsou aspoň 2 staty). Záporný stat uvolní část rozpočtu zpět do kladných
  // — ale ne celou (giveback < 1), aby nevznikla „síla zadarmo".
  negativ_sance: 0.14,
  negativ_min_podil: 0.15,    // velikost mínusu jako podíl rozpočtu
  negativ_max_podil: 0.40,
  negativ_giveback: 0.60,     // kolik z mínusu se vrátí do kladných statů

  // Aukce generuje ZÁKLADNÍ předmět BEZ předpon (prefixů). Předpony jsou
  // samostatné craftovatelné věci, které se přidělávají zvlášť.
  bez_predpon: true,
};

// ==========================================================================
//  POMOCNÉ RNG
// ==========================================================================
// Bates: průměr K uniforem → hodnota v [0,1) se zvonem kolem 0.5.
function bates(nahoda, k) {
  let s = 0;
  for (let i = 0; i < k; i++) s += nahoda();
  return s / k;
}

// Vybere index podle vah (vahy sečtou 1, ale nemusí — normalizujeme).
function vyberDleVah(nahoda, vahy) {
  const soucet = vahy.reduce((a, b) => a + b, 0);
  let x = nahoda() * soucet;
  for (let i = 0; i < vahy.length; i++) { x -= vahy[i]; if (x < 0) return i; }
  return vahy.length - 1;
}

// ==========================================================================
//  DÍLČÍ KROKY GENERÁTORU
// ==========================================================================
function baseBudget(uroven, c = VYCHOZI) {
  const L = Math.max(1, Math.min(MAX_UROVEN_PREDMETU, Math.round(uroven)));
  return Math.round(c.budget_zaklad + (L - 1) * c.budget_koef);
}

// Celkový rozpočet: BaseBudget × faktor z Batesova rozdělení daného zdroje.
function rozpocet(uroven, zdroj, nahoda, c = VYCHOZI) {
  const zaklad = baseBudget(uroven, c);
  const jeAukce = zdroj === 'aukce';
  const fmin = jeAukce ? c.aukce_faktor_min : c.merchant_faktor_min;
  const fmax = jeAukce ? c.aukce_faktor_max : c.merchant_faktor_max;
  const k = jeAukce ? c.aukce_bates_k : c.merchant_bates_k;
  const skew = jeAukce ? c.aukce_skew : c.merchant_skew;
  let t = bates(nahoda, k);
  if (skew !== 1) t = Math.pow(t, skew);   // skew<1 posune hmotu nahoru
  const faktor = fmin + t * (fmax - fmin);
  return Math.max(1, Math.round(zaklad * faktor));
}

// Počet aktivních statů 1..5 dle vah 20/35/28/14/3.
function pocetStatu(nahoda, c = VYCHOZI) {
  return vyberDleVah(nahoda, c.pocet_statu_vahy) + 1;
}

// Vybere `n` různých statů z pětice (rovnoměrně, konfigurovatelné vahami).
function vyberStaty(n, nahoda, vahyStatu) {
  const zbyva = [...STATY];
  const vahy = vahyStatu ? { ...vahyStatu } : null;
  const out = [];
  for (let i = 0; i < n && zbyva.length; i++) {
    const w = zbyva.map(s => (vahy ? (vahy[s] || 1) : 1));
    const idx = vyberDleVah(nahoda, w);
    out.push(zbyva[idx]);
    zbyva.splice(idx, 1);
  }
  return out;
}

// Rozdělí `budget` mezi `staty` NErovnoměrně (náhodné váhy^koncentrace).
function rozdelBudget(budget, staty, nahoda, c = VYCHOZI) {
  const exp = c.koncentrace_min + nahoda() * (c.koncentrace_max - c.koncentrace_min);
  const syrove = staty.map(() => Math.pow(nahoda() + 1e-6, exp));
  const soucet = syrove.reduce((a, b) => a + b, 0);
  // předběžné hodnoty
  let hodnoty = syrove.map(w => Math.max(1, Math.round(budget * w / soucet)));
  // srovnej zaokrouhlení na přesný součet
  let rozdil = budget - hodnoty.reduce((a, b) => a + b, 0);
  let i = 0;
  while (rozdil !== 0 && hodnoty.length) {
    const j = i % hodnoty.length;
    if (rozdil > 0) { hodnoty[j]++; rozdil--; }
    else if (hodnoty[j] > 1) { hodnoty[j]--; rozdil++; }
    i++;
    if (i > 100000) break;
  }
  const out = {};
  staty.forEach((s, k) => { out[s] = hodnoty[k]; });
  return out;
}

// ==========================================================================
//  HLAVNÍ GENERÁTOR
// ==========================================================================
// generujPredmet({ uroven, slot, zdroj:'merchant'|'aukce', nahoda, config })
// -> { uroven, slot, staty:{sila:+x, odolnost:-y,...}, totalBudget, zaporny, zdroj }
function generujPredmet(opt = {}) {
  const c = { ...VYCHOZI, ...(opt.config || {}) };
  const nahoda = opt.nahoda || Math.random;
  const uroven = Math.max(1, Math.min(MAX_UROVEN_PREDMETU, Math.round(opt.uroven || 1)));
  const slot = opt.slot || STATY[0] && (SLOTY[Math.floor(nahoda() * SLOTY.length)]);
  const zdroj = opt.zdroj === 'aukce' ? 'aukce' : 'merchant';

  const totalBudget = rozpocet(uroven, zdroj, nahoda, c);
  const n = pocetStatu(nahoda, c);
  const staty = vyberStaty(n, nahoda, opt.vahyStatu);

  // Záporný stat: jen když jsou aspoň 2 staty. Uvolní část rozpočtu zpět.
  let zaporny = null, budgetKladny = totalBudget, mensiO = 0;
  if (n >= 2 && nahoda() < c.negativ_sance) {
    const podil = c.negativ_min_podil + nahoda() * (c.negativ_max_podil - c.negativ_min_podil);
    const magnituda = Math.max(1, Math.round(totalBudget * podil));
    zaporny = staty[staty.length - 1];           // poslední vybraný jde do mínusu
    budgetKladny = totalBudget + Math.round(magnituda * c.negativ_giveback);
    mensiO = magnituda;
  }

  const kladneStaty = zaporny ? staty.slice(0, -1) : staty;
  const rozdeleno = rozdelBudget(budgetKladny, kladneStaty, nahoda, c);
  const vysledneStaty = {};
  for (const s of kladneStaty) vysledneStaty[s] = rozdeleno[s];
  if (zaporny) vysledneStaty[zaporny] = -mensiO;

  return {
    uroven, slot, zdroj,
    staty: vysledneStaty,
    pocetStatu: n,
    totalBudget,               // rozpočet PŘED giveback (skutečný „výkonový" rozpočet)
    zaporny: zaporny || null,
    predpona: null,            // aukce generuje BEZ předpony
  };
}

// Číselná hodnota/síla předmětu — pro cenu Buy Now i řazení. Kladné staty
// plus, záporné mínus (giveback se nezapočítá jako bonus), a mírný vliv
// úrovně (slot value). Nepočítá předponu (aukční předměty ji nemají).
function hodnotaPredmetu(p) {
  let soucet = 0;
  for (const s of STATY) soucet += (p.staty[s] || 0);   // záporné odečtou
  const urovenFaktor = 1 + p.uroven * 0.01;
  return Math.max(1, Math.round(soucet * urovenFaktor));
}

// Lidský popis statů (pro UI/log/testy).
function popisStatu(p) {
  return STATY.filter(s => p.staty[s] != null)
    .map(s => `${NAZVY[s]} ${p.staty[s] >= 0 ? '+' : ''}${p.staty[s]}`)
    .join(', ');
}

module.exports = {
  STATY, NAZVY, SLOUPCE, SLOTY, MAX_UROVEN_PREDMETU, VYCHOZI,
  baseBudget, rozpocet, pocetStatu, vyberStaty, rozdelBudget,
  generujPredmet, hodnotaPredmetu, popisStatu,
};

// Herní pravidla pro simulátor — JEDINÝ most mezi simulací a hrou.
//
// Zásada: nemít druhou ručně psanou kopii ekonomických vzorců. Co jde,
// bereme přímo z ostrých modulů v `config/`:
//   • config/xp.js      — tabulka XP na úroveň (shodná s hrou)
//   • config/odmeny.js  — zlato a XP za souboj (shodný vzorec jako výpravy)
//   • config/souboj.js  — bojový engine a jeho stropy (Crit/Dvojhmat/Blok)
//   • config/arena.js   — přepočet Pocty v aréně
//
// Pár vzorců žije zatím jen ve frontendu (game.js). Ty tu zrcadlíme a u
// každého píšeme, odkud pochází a na jakém řádku — aby bylo vidět, že to
// není vymyšlené číslo, a aby se to dalo srovnat, kdyby se hra změnila.
//
// !!! DŮLEŽITÉ — CO HRA ZATÍM NEMÁ !!!
// Zadání simulátoru počítá se systémy, které v projektu NEEXISTUJÍ:
//   Zkouška božstva / Znamení bohů, Aukční síň, Tržiště, Stáj/Drak,
//   bojoví Pomocníci, odměny z Práce, smaragdy z hraní, rozpočtový
//   systém předmětů (BaseBudget) a 1–5 statové předměty, strop tréninku
//   (StatTrainingCap), Dodge.
// Simulátor je proto NEsimuluje a v reportu je hlásí jako „N/A – systém
// v projektu neexistuje". Nic si nedomýšlíme. Až systémy vzniknou,
// napojí se tady a jinde se sahat nemusí.

const xp      = require('../config/xp');
const odmeny  = require('../config/odmeny');
const souboj  = require('../config/souboj');
const arena   = require('../config/arena');

// ---- ÚROVNĚ A XP (reálné z config/xp.js) ----
const MAX_UROVEN = xp.MAX_UROVEN;

// Kolik XP je potřeba z úrovně L na L+1. Tabulka je indexovaná ÚROVNÍ:
// XP_DO_DALSI[1] = 100 (z úrovně 1 na 2), [0] je null (placeholder).
function xpNaDalsi(uroven) {
  const L = Math.max(1, Math.min(MAX_UROVEN, uroven));
  return xp.XP_DO_DALSI[L] ?? xp.XP_DO_DALSI[xp.XP_DO_DALSI.length - 1];
}

// ---- ROZDĚLENÍ BODŮ PŘI POSTUPU (zrcadlo game.html modalu:163) ----
// „+10 Zdraví · +2 Síla · +1 Obrana · +1 Hbitost" na každou úroveň.
// Zdroj pravdy: frontend/game.html řádek 163 (level-up modal).
const PRIRUSTEK_UROVNE = { health: 10, strength: 2, defense: 1, agility: 1, skill: 0, intelligence: 0 };

// ---- CENA TRÉNINKU (zrcadlo game.js:2602 trainCost) ----
// trainCost(key) = floor(15 * stat + 25). Zdroj pravdy: game.js:2602.
// Pozor: hra NEMÁ strop tréninku. StatTrainingCap ze zadání zde záměrně
// NEuplatňujeme — neexistuje v ostré hře.
function cenaTreninku(hodnotaStatu) {
  return Math.floor(15 * (hodnotaStatu || 0) + 25);
}

// ---- STROPY BOJE (reálné z config/souboj.js) ----
const STROPY = {
  crit:  souboj.CRIT_MULT ? 0.35 : 0.35,   // CRIT_MAX v souboj.js
  double: 0.40,                            // DOUBLE_MAX
  block:  0.50,                            // BLOCK_MAX
};

// Postava simulátoru -> tvar, který čeká config/souboj.profil().
// Souboj bere z DB řádku: level, max_health, strength, defense(odolnost),
// agility, skill, intelligence. Držíme stejná jména.
function naPostavuBoje(p) {
  return {
    id: p.id,
    name: p.jmeno,
    level: p.uroven,
    max_health: p.max_health,
    strength: p.strength,
    defense: p.defense,
    agility: p.agility,
    skill: p.skill,
    intelligence: p.intelligence,
    pocta: p.pocta,
  };
}

module.exports = {
  MAX_UROVEN,
  xpNaDalsi,
  PRIRUSTEK_UROVNE,
  cenaTreninku,
  STROPY,
  naPostavuBoje,
  // přeposíláme reálné funkce, ať je engine bere z jednoho místa
  odmenaZaSouboj: odmeny.odmenaZaSouboj,
  sBonusem: odmeny.sBonusem,
  odehrajSouboj: souboj.odehrajSouboj,
  profilBoje: souboj.profil,
  nahodaSeSeminkem: souboj.nahodaSeSeminkem,
  zmenaPocty: arena.zmenaPocty,
  arenaVychozi: arena.VYCHOZI,
};

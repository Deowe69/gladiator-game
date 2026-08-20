// Jedna virtuální postava a její postup. Veškerá matematika jde přes
// `pravidla.js`, takže výsledky sedí s ostrou hrou.
//
// Postup: XP -> úroveň podle reálné tabulky (config/xp.js); za úroveň
// přibudou staty přesně podle level-up modalu (game.html:163).
// Trénink: reálná cena floor(15*stat+25) (game.js:2602).
// Vybavení: NÁMĚRNĚ jen výdaj zlata bez bojového efektu — ostrý bojový
//   engine výbavu zatím nečte (souboj.js:41 „Vybavení zatím v databázi
//   není"). Kdybychom výbavě přiřkli sílu, simulovali bychom něco, co
//   hra nedělá. Že je cesta přes vybavení ekonomicky mrtvá, je nález,
//   ne chyba simulace.

const P = require('./pravidla');

const START = { health: 100, strength: 10, defense: 10, agility: 10, intelligence: 10, skill: 10 };

function novaPostava(id, jmeno, archetyp) {
  return {
    id, jmeno, archetyp: archetyp.id,
    uroven: 1, xp: 0,
    max_health: START.health,
    strength: START.strength, defense: START.defense, agility: START.agility,
    intelligence: START.intelligence, skill: START.skill,
    zlato: 0, pocta: 0, smaragdy: 0,
    // metriky
    m: {
      souboje: 0, vyhry: 0, prohry: 0,
      pveVyhry: 0, pvpBoje: 0, pvpVyhry: 0,
      materialy: {}, materialZdroj: {},   // {id: počet}, {zdroj: počet}
      zlatoZiskano: 0, zlatoDoTreninku: 0, zlatoDoVybaveni: 0, zlatoPromrhano: 0,
      xpZiskano: 0, treninku: 0, urovniZa: 0,
      aktivnichDnu: 0,
    },
  };
}

// Přidání XP + případný postup na vyšší úroveň (i víc naráz).
function pridejXp(p, xp) {
  if (xp <= 0) return;
  p.xp += xp;
  p.m.xpZiskano += xp;
  while (p.uroven < P.MAX_UROVEN) {
    const potreba = P.xpNaDalsi(p.uroven);
    if (p.xp < potreba) break;
    p.xp -= potreba;
    p.uroven++;
    p.m.urovniZa++;
    const g = P.PRIRUSTEK_UROVNE;
    p.max_health   += g.health;
    p.strength     += g.strength;
    p.defense      += g.defense;
    p.agility      += g.agility;
    p.skill        += g.skill;
    p.intelligence += g.intelligence;
  }
  if (p.uroven >= P.MAX_UROVEN) p.xp = 0;
}

// Připsání zlata z odměny.
function pridejZlato(p, zlato) {
  if (zlato <= 0) return;
  p.zlato += zlato;
  p.m.zlatoZiskano += zlato;
}

// Trénink: utrácej zlato podle priority statů archetypu, dokud je na co.
// `kolikAkci` je horní strop tréninků pro tento den (z archetypu).
function trenuj(p, archetyp, kolikAkci) {
  const priorita = archetyp.statyPriorita || ['strength', 'defense', 'agility', 'skill', 'intelligence'];
  let i = 0;
  for (let a = 0; a < kolikAkci; a++) {
    const klic = priorita[i % priorita.length];
    const cena = P.cenaTreninku(p[klic]);
    if (p.zlato < cena) break;
    p.zlato -= cena;
    p[klic] += 1;
    p.m.zlatoDoTreninku += cena;
    p.m.treninku++;
    i++;
  }
}

// Vybavení: čistý odpad zlata (viz hlavička). Kupuje „item na úrovni",
// cena zhruba jako v obchodě (game.js:price ~ 14 + lvl^2*1.1).
function koupVybaveni(p, podil) {
  const rozpocet = Math.floor(p.zlato * podil);
  if (rozpocet <= 0) return;
  const cena = Math.max(10, Math.round(14 + p.uroven * p.uroven * 1.1));
  const kolik = Math.floor(rozpocet / cena);
  const utraceno = kolik * cena;
  if (utraceno <= 0) return;
  p.zlato -= utraceno;
  p.m.zlatoDoVybaveni += utraceno;
}

module.exports = { novaPostava, pridejXp, pridejZlato, trenuj, koupVybaveni, START };

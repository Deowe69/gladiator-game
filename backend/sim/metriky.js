// Sběr metrik a percentily. Z hromady postav (přes všechny historie)
// spočítáme rozdělení P10/P50/P90/P99, ať je vidět nejen průměr, ale i
// rozptyl — kde jsou zaostávající (P10) a utíkající (P99) hráči.

function percentil(serazene, p) {
  if (!serazene.length) return 0;
  const idx = (serazene.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return serazene[lo];
  return serazene[lo] + (serazene[hi] - serazene[lo]) * (idx - lo);
}

function rozdeleni(hodnoty) {
  const s = [...hodnoty].sort((a, b) => a - b);
  const soucet = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    prumer: s.length ? soucet / s.length : 0,
    min: s[0] || 0,
    p10: percentil(s, 0.10),
    p50: percentil(s, 0.50),
    p90: percentil(s, 0.90),
    p99: percentil(s, 0.99),
    max: s[s.length - 1] || 0,
  };
}

// Co z každé postavy měříme.
function vyberMetriky(p) {
  const m = p.m;
  const winrate = m.souboje ? m.vyhry / m.souboje : 0;
  const pvpWin  = m.pvpBoje ? m.pvpVyhry / m.pvpBoje : 0;
  return {
    uroven: p.uroven,
    zlato: p.zlato,
    pocta: p.pocta,
    statySoucet: p.strength + p.defense + p.agility + p.skill + p.intelligence,
    strength: p.strength, defense: p.defense, agility: p.agility,
    skill: p.skill, intelligence: p.intelligence, zdravi: p.max_health,
    winrate, pvpWin,
    zlatoZiskano: m.zlatoZiskano, xpZiskano: m.xpZiskano,
    zlatoDoTreninku: m.zlatoDoTreninku, zlatoDoVybaveni: m.zlatoDoVybaveni,
    zlatoPromrhano: m.zlatoPromrhano,
    souboje: m.souboje, treninku: m.treninku, aktivnichDnu: m.aktivnichDnu,
  };
}

// Bojové stropy — kontrolní veličiny ze zadání (Crit ≤ 30 %?, Dodge/Blok).
// Vracíme špičkovou dosaženou hodnotu, aby šlo ověřit, že se stropy drží.
const P = require('./pravidla');
function bojoveStropy(postavy) {
  let critMax = 0, blokMax = 0, dvojMax = 0;
  for (const p of postavy) {
    const pr = P.profilBoje(P.naPostavuBoje(p));
    critMax = Math.max(critMax, pr.kritika);
    blokMax = Math.max(blokMax, pr.blokace);
    dvojMax = Math.max(dvojMax, pr.dvojity);
  }
  return { critMax, blokMax, dvojMax };
}

const KLICE = ['uroven', 'zlato', 'pocta', 'statySoucet', 'winrate', 'pvpWin',
  'zlatoZiskano', 'xpZiskano', 'zlatoDoTreninku', 'zlatoDoVybaveni',
  'souboje', 'treninku', 'aktivnichDnu', 'zdravi'];

// Sesbírej metriky po archetypech i globálně z pole historií
// (každá historie = pole postav).
function agreguj(historie) {
  const vsePostavy = historie.flat();
  const podleArch = {};
  for (const p of vsePostavy) (podleArch[p.archetyp] ??= []).push(p);

  const naSkupinu = postavy => {
    const metr = postavy.map(vyberMetriky);
    const out = { pocetPostav: postavy.length };
    for (const k of KLICE) out[k] = rozdeleni(metr.map(x => x[k]));
    return out;
  };

  const archetypy = {};
  for (const [id, ps] of Object.entries(podleArch)) archetypy[id] = naSkupinu(ps);

  return {
    global: naSkupinu(vsePostavy),
    archetypy,
    stropy: bojoveStropy(vsePostavy),
  };
}

module.exports = { agreguj, rozdeleni, vyberMetriky, KLICE };

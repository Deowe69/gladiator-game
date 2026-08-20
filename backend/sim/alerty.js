// Balanční upozornění. Pravidla jsou konfigurovatelná (prahy níž), běží
// nad hotovou agregací. Každé upozornění má závažnost a vysvětlení, co
// ho spustilo — žádné číslo nespadne z nebe.

const VYCHOZI_PRAHY = {
  // bojové stropy ze zadání
  critMax: 0.30,          // Crit nemá přerůst 30 %
  dodgeMax: 0.15,         // „Dodge" ≤ 15 % (hra má Blok, viz pozn.)
  blokMax: 0.50,          // Blok engine (BLOCK_MAX)
  // ekonomika
  inflaceZlataP99naP50: 12,   // P99/P50 zlata — extrémní nerovnost
  mrtveZlatoPodil: 0.5,       // >50 % zlata nikdo neutratí => sink chybí
  // vyvážení archetypů
  rozptylUrovniP90naP10: 6,   // nejlepší 6× dál než nejhorší = moc
  // podvyužití systému
  podilBezArena: 0.15,        // <15 % postav vůbec nešlo do arény
};

function vyhodnot(agg, prahy = {}) {
  const P = { ...VYCHOZI_PRAHY, ...prahy };
  const upoz = [];
  const pridej = (zavaznost, kod, zprava, detail) => upoz.push({ zavaznost, kod, zprava, detail });

  // --- bojové stropy ---
  const s = agg.stropy;
  if (s.critMax > P.critMax + 1e-9)
    pridej('vysoka', 'crit_strop', `Krit ${(s.critMax * 100).toFixed(1)} % překračuje strop ${(P.critMax * 100)} %`, s);
  if (s.blokMax > P.blokMax + 1e-9)
    pridej('vysoka', 'blok_strop', `Blok ${(s.blokMax * 100).toFixed(1)} % překračuje ${(P.blokMax * 100)} %`, s);

  // --- inflace / mrtvé zlato ---
  const g = agg.global.zlato;
  if (g.p50 > 0 && g.p99 / g.p50 > P.inflaceZlataP99naP50)
    pridej('stredni', 'zlato_rozptyl', `Zlato P99/P50 = ${(g.p99 / g.p50).toFixed(1)}× (práh ${P.inflaceZlataP99naP50}×)`, g);

  const zisk = agg.global.zlatoZiskano.prumer;
  const utrata = agg.global.zlatoDoTreninku.prumer + agg.global.zlatoDoVybaveni.prumer;
  const lezi = zisk > 0 ? (zisk - utrata) / zisk : 0;
  if (lezi > P.mrtveZlatoPodil)
    pridej('stredni', 'mrtve_zlato', `${(lezi * 100).toFixed(0)} % vydělaného zlata nikdo neutratí — chybí odbytiště`, { zisk, utrata });

  // --- rozptyl úrovní ---
  const u = agg.global.uroven;
  if (u.p10 > 0 && u.p90 / u.p10 > P.rozptylUrovniP90naP10)
    pridej('stredni', 'urovne_rozptyl', `Úrovně P90/P10 = ${(u.p90 / u.p10).toFixed(1)}× — velký odstup`, u);

  // --- podvyužití arény ---
  const bezArena = Object.entries(agg.archetypy)
    .filter(([, a]) => a.pvpWin && a.pvpWin.prumer === 0).length;
  if (Object.keys(agg.archetypy).length &&
      bezArena / Object.keys(agg.archetypy).length > P.podilBezArena)
    pridej('nizka', 'arena_podvyuziti', `${bezArena} archetypů vůbec nechodí do arény`, { bezArena });

  return upoz;
}

module.exports = { vyhodnot, VYCHOZI_PRAHY };

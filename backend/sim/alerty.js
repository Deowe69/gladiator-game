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

  // --- materiály ---
  const mat = agg.materialy;
  if (mat && mat.celkem > 0) {
    // jeden materiál dominuje poolu
    const totals = Object.entries(mat.naMaterial).map(([id, m2]) => [id, m2.total]);
    const nejvic = totals.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);
    if (nejvic[1] / mat.celkem > 0.5)
      pridej('nizka', 'material_dominuje', `Materiál „${nejvic[0]}" tvoří ${(nejvic[1] / mat.celkem * 100).toFixed(0)} % všech dropů`, {});
    // drahokamy moc často / skoro nikdy
    if (mat.podilDrahokamu > 0.05)
      pridej('stredni', 'drahokamy_caste', `Drahokamy jsou ${(mat.podilDrahokamu * 100).toFixed(1)} % dropů (přísně vzácné bývá <2 %)`, {});
    for (const gid of ['ruby', 'sapphire', 'emerald', 'diamond']) {
      const t = mat.naMaterial[gid] && mat.naMaterial[gid].total;
      if (t === 0) pridej('nizka', 'drahokam_nepada', `Drahokam „${gid}" za celý běh nepadl ani jednou`, {});
    }
    // inflace/hlad — extrémně mnoho / málo materiálů na aktivní den
    if (mat.naAktivniDenCelkem > 60)
      pridej('stredni', 'material_inflace', `~${mat.naAktivniDenCelkem.toFixed(0)} materiálů na aktivní den — možná inflace`, {});
    if (mat.naAktivniDenCelkem > 0 && mat.naAktivniDenCelkem < 1)
      pridej('nizka', 'material_hlad', `Jen ~${mat.naAktivniDenCelkem.toFixed(2)} materiálů na aktivní den — možná hlad`, {});
  }

  return upoz;
}

module.exports = { vyhodnot, VYCHOZI_PRAHY };

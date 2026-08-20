// Virtuální hodiny simulátoru.
//
// Čas neplyne v reálu — posouváme ho skokem. 8h Práce se „odbydou“
// okamžitě, den se uzavře a jde se na další. Žádné setTimeout, žádné
// čekání. Vše se odvíjí od herního dne, ne od systémového času, takže
// běh nezávisí na tom, kdy ho spustíš.
//
// Jednotka je den. Uvnitř dne rozlišujeme jen pořadí akcí, ne minuty —
// hra sama dává denní stropy (výpravy, bludiště), ne minutové cooldowny
// pro dávkové vyhodnocení. Cooldowny se v simulaci modelují jako denní
// rozpočet akcí, viz archetypy.

function hodiny(pocatecniDen = 0) {
  let den = pocatecniDen;
  return {
    get den() { return den; },
    dalsiDen() { return ++den; },
    // pomůcky pro reporty
    tyden() { return Math.floor(den / 7); },
    mesic() { return Math.floor(den / 30); },
    rok() { return Math.floor(den / 365); },
    popis() {
      const r = Math.floor(den / 365);
      const m = Math.floor((den % 365) / 30);
      const d = den % 30;
      const c = [];
      if (r) c.push(r + (r === 1 ? ' rok' : r < 5 ? ' roky' : ' let'));
      if (m) c.push(m + ' měs');
      c.push(d + ' dní');
      return c.join(' ');
    },
  };
}

// Převod „kolik dní chceš simulovat" z lidského zápisu.
function dniZ(rozsah) {
  if (typeof rozsah === 'number') return Math.max(1, Math.round(rozsah));
  const m = String(rozsah).trim().match(/^(\d+)\s*(d|den|dny|dní|t|tyd|týd|w|m|mes|měs|r|rok|let|y)?$/i);
  if (!m) return 30;
  const n = parseInt(m[1], 10);
  const j = (m[2] || 'd').toLowerCase();
  if (/^(t|tyd|týd|w)/.test(j)) return n * 7;
  if (/^(m|mes|měs)/.test(j))   return n * 30;
  if (/^(r|rok|let|y)/.test(j))  return n * 365;
  return n;
}

module.exports = { hodiny, dniZ };

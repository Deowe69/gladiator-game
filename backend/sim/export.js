// Export výsledku běhu. JSON = celý objekt; CSV = tabulka po archetypech
// s klíčovými percentily, ať to jde otevřít v tabulkovém editoru.

const { KLICE } = require('./metriky');

function doJson(beh) {
  return JSON.stringify(beh, null, 2);
}

function doCsv(beh) {
  const sl = ['archetyp', 'pocetPostav'];
  for (const k of KLICE) sl.push(`${k}_p10`, `${k}_p50`, `${k}_p90`, `${k}_p99`);
  const radky = [sl.join(',')];

  const napis = (jmeno, blok) => {
    const bunky = [jmeno, blok.pocetPostav];
    for (const k of KLICE) {
      const d = blok[k] || {};
      bunky.push(fmt(d.p10), fmt(d.p50), fmt(d.p90), fmt(d.p99));
    }
    radky.push(bunky.join(','));
  };

  napis('GLOBAL', beh.vysledek.global);
  for (const [id, blok] of Object.entries(beh.vysledek.archetypy)) napis(id, blok);
  return radky.join('\n');
}

function fmt(x) {
  if (x == null) return '';
  return (Math.round(x * 100) / 100).toString();
}

module.exports = { doJson, doCsv };

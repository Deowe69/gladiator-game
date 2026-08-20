// Orchestrace celého běhu: postav populaci, odsimuluj `historie` běhů
// s různými semínky (Monte Carlo), sesbírej percentily, přilep balanční
// verzi a upozornění. Ukládá se jen souhrn, ne živá data — a nikdy do
// produkční DB.
//
// Reprodukovatelnost: běh si pamatuje semínko, verzi balancu, populaci i
// nastavení. Se stejným `zakladniSeminko` vyjde totéž.

const { simulujHistorii } = require('./svet');
const { agreguj, grafy } = require('./metriky');
const { otiskBalance } = require('./verze');
const { vyhodnot } = require('./alerty');
const { ARCHETYPY } = require('./archetypy');
const { hash } = require('./nahoda');
const { hodiny } = require('./hodiny');

// Výchozí populace: od každého archetypu stejně.
function vychoziPopulace(hracuNaArchetyp) {
  return ARCHETYPY.map(a => ({ archetyp: a.id, pocet: hracuNaArchetyp }));
}

// `opts`:
//   dni, historie, hracuNaArchetyp | populace, zakladniSeminko, nazev,
//   prahy (pro alerty), onProgress(fn), jeZrusen(fn)
async function spustSimulaci(opts) {
  const {
    dni = 180,
    historie = 60,
    hracuNaArchetyp = 5,
    populace = vychoziPopulace(hracuNaArchetyp),
    zakladniSeminko = Date.now() >>> 0,
    nazev = 'beh',
    prahy = {},
    onProgress = null,
    jeZrusen = () => false,
  } = opts;

  const start = Date.now();
  const verze = otiskBalance();
  const vsechnyPostavy = [];   // sběr napříč historiemi (jen finální stav)

  for (let h = 0; h < historie; h++) {
    if (jeZrusen()) {
      return { zruseno: true, hotovoHistorii: h, celkemHistorii: historie };
    }
    // deterministické semínko historie z názvu + základu + indexu
    const seminko = hash(`${nazev}|${zakladniSeminko}|${h}`);
    const hraci = simulujHistorii({ dni, populace, seminko });
    vsechnyPostavy.push(hraci);
    if (onProgress) onProgress({ hotovo: h + 1, celkem: historie });
  }

  const agg = agreguj(vsechnyPostavy);
  const grafyData = grafy(vsechnyPostavy);
  const upozorneni = vyhodnot(agg, prahy);
  const trvani = Date.now() - start;
  const t = hodiny(dni);

  return {
    zruseno: false,
    meta: {
      nazev, zakladniSeminko, dni, historie, hracuNaArchetyp,
      hernidoba: t.popis(),
      pocetPostavCelkem: vsechnyPostavy.reduce((a, x) => a + x.length, 0),
      balancVerze: verze.podpis,
      cas: new Date().toISOString(),
      trvaniMs: trvani,
    },
    balanc: verze,
    populace,
    vysledek: agg,
    grafy: grafyData,
    upozorneni,
  };
}

module.exports = { spustSimulaci, vychoziPopulace };

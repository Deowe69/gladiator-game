// Vyhodnocení souboje na serveru.
//
// Stejné vzorce, jaké má hra ve frontend/js/game.js — jenom tady
// o výsledku rozhoduje server. Prohlížeč souboj už jen přehraje
// podle záznamu, který dostane zpět.
//
// Kdyby se vzorce ve hře změnily, musí se změnit i tady. Proto jsou
// na jednom místě a pojmenované stejně.

const HP_ZA_ODOLNOST = 5;
const CRIT_MULT      = 1.6;
const DOUBLE_MAX     = 0.40;
const BLOCK_MAX      = 0.50;
const CRIT_MAX       = 0.35;
const FISTS          = [1, 3];      // beze zbraně

// Šance roste se zmenšujícím se přírůstkem, aby se nedala vyhnat na 100 %.
const sance = (hodnota, polovina, strop) =>
  Math.min(strop, (hodnota || 0) / ((hodnota || 0) + polovina));

/**
 * Bojový profil postavy z jejího řádku v databázi.
 *
 * Tohle je ten „snímek" — bere se v okamžiku souboje ze serveru,
 * takže klient do něj nemá jak sáhnout. Vybavení zatím není v
 * databázi, takže se počítá jen s vlastnostmi; až tam bude, přibude
 * sem zbroj a poškození zbraně.
 */
function profil(postava) {
  const sila  = postava.strength     || 0;
  const dov   = postava.skill        || 0;
  const obr   = postava.agility      || 0;
  const odol  = postava.defense      || 0;
  const intel = postava.intelligence || 0;

  const zivoty = (postava.max_health || 100) + odol * HP_ZA_ODOLNOST;

  // Poškození odhadujeme ze síly, jako by měl hráč zbraň přiměřenou
  // úrovni. Vybavení zatím v databázi není; s holými pěstmi by souboj
  // trval přes 60 kol a vždy skončil na časovém limitu. Až budou
  // předměty v databázi, nahradí to skutečná zbraň.
  const zaklad = 3 + sila * 0.55;

  return {
    id: postava.id,
    jmeno: postava.name,
    uroven: postava.level || 1,
    zivoty,
    maxZivoty: zivoty,
    poskozeniOd: Math.max(1, Math.round(zaklad * 0.85)),
    poskozeniDo: Math.max(2, Math.round(zaklad * 1.15)),
    zbroj: odol * 3,                    // bez vybavení jen z odolnosti
    dvojity: sance(dov, 150, DOUBLE_MAX),
    blokace: sance(obr, 130, BLOCK_MAX),
    kritika: Math.min(CRIT_MAX, 0.08 + intel / 500),
    sila, dov, obr, odol, intel,
  };
}

const tlumeni = zbroj => Math.floor((zbroj || 0) / 12);

/**
 * Odehraje souboj dvou profilů a vrátí výsledek i průběh po kolech.
 *
 * `nahoda` se předává zvenčí, aby šel souboj zopakovat se stejným
 * semínkem — díky tomu je výsledek dohledatelný, ne jen „tak vyšel".
 */
function odehrajSouboj(a, b, nahoda = Math.random, maxKol = 60) {
  const utocnik = { ...a }, obranca = { ...b };
  const kola = [];

  const rana = (kdo, komu) => {
    const zaklad = kdo.poskozeniOd +
      Math.floor(nahoda() * (kdo.poskozeniDo - kdo.poskozeniOd + 1));
    let d = Math.max(1, zaklad - tlumeni(komu.zbroj));
    const krit = nahoda() < kdo.kritika;
    if (krit) d = Math.floor(d * CRIT_MULT);
    return { d, krit };
  };

  const utok = (kdo, komu, znacka) => {
    const dvojity = nahoda() < kdo.dvojity;
    const vykryto = dvojity && nahoda() < komu.blokace;
    const pocetRan = (dvojity && !vykryto) ? 2 : 1;

    let celkem = 0, krit = false;
    for (let i = 0; i < pocetRan; i++) {
      const r = rana(kdo, komu);
      celkem += r.d;
      if (r.krit) krit = true;
    }
    komu.zivoty = Math.max(0, komu.zivoty - celkem);
    return { kdo: znacka, poskozeni: celkem, dvojity: dvojity && !vykryto, vykryto, krit };
  };

  let kolo = 0;
  while (utocnik.zivoty > 0 && obranca.zivoty > 0 && kolo < maxKol) {
    kolo++;
    const zaznam = { kolo, akce: [] };

    zaznam.akce.push(utok(utocnik, obranca, 'utocnik'));
    if (obranca.zivoty > 0) zaznam.akce.push(utok(obranca, utocnik, 'obranca'));

    kola.push(zaznam);
  }

  // Když ani po maxKol nikdo nepadne, vyhrává ten s vyšším podílem
  // zbývajících životů — jinak by souboj mohl běžet donekonečna.
  let vyhralUtocnik;
  if (obranca.zivoty <= 0)      vyhralUtocnik = true;
  else if (utocnik.zivoty <= 0) vyhralUtocnik = false;
  else vyhralUtocnik = (utocnik.zivoty / utocnik.maxZivoty) >= (obranca.zivoty / obranca.maxZivoty);

  return {
    vyhralUtocnik,
    kol: kolo,
    dosloNaCas: kolo >= maxKol && utocnik.zivoty > 0 && obranca.zivoty > 0,
    utocnik: { zbyloZivotu: utocnik.zivoty, maxZivoty: utocnik.maxZivoty },
    obranca: { zbyloZivotu: obranca.zivoty, maxZivoty: obranca.maxZivoty },
    kola,
  };
}

// Jednoduchý generátor s semínkem — stejné semínko dá stejný souboj.
function nahodaSeSeminkem(seminko) {
  let s = seminko >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

module.exports = { profil, odehrajSouboj, nahodaSeSeminkem, HP_ZA_ODOLNOST, CRIT_MULT };

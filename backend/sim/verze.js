// Otisk balanční verze. Sebere skutečné konfigurační hodnoty, proti
// kterým běh proběhl (bojové stropy, aréna, tabulka XP, vzorec odměn),
// a udělá z nich krátký otisk. Dva běhy se stejným otiskem měřily stejná
// pravidla — jinak není srovnání férové. Slouží k reprodukci i k detekci
// regrese (pravidla se změnila => otisk se změní).

const { hash } = require('./nahoda');
const xp     = require('../config/xp');
const souboj = require('../config/souboj');
const arena  = require('../config/arena');
const P      = require('./pravidla');

function otiskBalance() {
  const hodnoty = {
    xp: {
      maxUroven: xp.MAX_UROVEN,
      xpHash: hash(xp.XP_DO_DALSI.join(',')),
      xpProL2: xp.XP_DO_DALSI[1],       // z úrovně 1 na 2
      xpProL100: xp.XP_DO_DALSI[100],   // z úrovně 100 na 101
    },
    boj: {
      critMult: souboj.CRIT_MULT,
      hpZaOdolnost: souboj.HP_ZA_ODOLNOST,
      critMax: P.STROPY.crit, blokMax: P.STROPY.block, dvojMax: P.STROPY.double,
    },
    arena: {
      sazba: arena.VYCHOZI.arena_pocta_sazba,
      delitel: arena.VYCHOZI.arena_pocta_delitel,
      min: arena.VYCHOZI.arena_pocta_min,
      max: arena.VYCHOZI.arena_pocta_max,
    },
    postup: {
      prirustek: P.PRIRUSTEK_UROVNE,
      cenaTreninkuL10: P.cenaTreninku(10),
    },
  };
  const podpis = hash(JSON.stringify(hodnoty)).toString(16);
  return { podpis, hodnoty };
}

// Porovnání dvou otisků -> seznam změněných pravidel (pro regrese).
function porovnejVerze(a, b) {
  const zmeny = [];
  const chod = (pa, pb, cesta) => {
    for (const k of Object.keys(pa)) {
      const va = pa[k], vb = pb ? pb[k] : undefined;
      if (va && typeof va === 'object') chod(va, vb || {}, cesta ? `${cesta}.${k}` : k);
      else if (va !== vb) zmeny.push({ pravidlo: cesta ? `${cesta}.${k}` : k, z: vb, na: va });
    }
  };
  chod(a.hodnoty, b.hodnoty, '');
  return { stejne: a.podpis === b.podpis, zmeny };
}

module.exports = { otiskBalance, porovnejVerze };

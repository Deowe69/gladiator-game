// Nastavení Arény.
//
// Aréna je celosvětový žebříček podle Pocty. Pocta je zároveň to,
// co hráč vidí, i to, podle čeho se páruje — žádné skryté hodnocení
// vedle toho neběží.
//
// Výchozí hodnoty; od prvního startu platí, co je v tabulce
// arena_config, aby to šlo měnit ze správy bez zásahu do kódu.
const VYCHOZI = {
  // Kolik Pocty je ve hře při vyrovnaném souboji. Čím vyšší, tím
  // rychleji se žebříček přeskupuje.
  arena_pocta_sazba: 24,

  // O kolik Pocty se musí soupeři lišit, aby se výsledek považoval
  // za skoro jistý. Vyšší číslo = mírnější rozdíly mezi zisky.
  arena_pocta_delitel: 300,

  // Meze jednoho souboje, aby ani krajní rozdíl nedal nulu nebo moc.
  arena_pocta_min: 4,     // vyhra vzdy da aspon tolik, at bojovat stoji za to
  arena_pocta_max: 40,

  // Kolik z hráčovy změny se propíše obránci. 1 = plná (součet nula),
  // 0 = obránci se Pocta nemění.
  arena_podil_obrance: 1,

  // Výběr soupeřů: koho hře nabídnout.
  arena_rozsah_pocty: 400,     // ± Pocty kolem hráče
  arena_rozsah_urovni: 10,     // ± úrovní
  arena_pocet_souperu: 6,

  // Proti stejnému soupeři až po téhle době (v minutách).
  arena_odveta_minut: 60,

  // Odměna za vyhraný souboj se počítá v /api/game/reward;
  // tohle je jen strop opakování za den proti jednomu hráči.
  arena_denni_limit_na_souepre: 3,
};

const POPISKY = {
  arena_pocta_sazba:            'Sazba Pocty za vyrovnaný souboj',
  arena_pocta_delitel:          'Dělitel rozdílu Pocty',
  arena_pocta_min:              'Nejmenší změna Pocty',
  arena_pocta_max:              'Největší změna Pocty',
  arena_podil_obrance:          'Podíl změny u obránce (0–1)',
  arena_rozsah_pocty:           'Rozsah Pocty pro výběr soupeřů',
  arena_rozsah_urovni:          'Rozsah úrovní pro výběr soupeřů',
  arena_pocet_souperu:          'Kolik soupeřů nabídnout',
  arena_odveta_minut:           'Odveta proti témuž soupeři (minuty)',
  arena_denni_limit_na_souepre: 'Denní limit soubojů proti jednomu hráči',
};

/**
 * Kolik Pocty se přesune.
 *
 * Vychází z rozdílu Pocty obou stran: čím výš je soupeř nad tebou,
 * tím víc za jeho porážku dostaneš a tím míň ztratíš, když prohraješ.
 * Proti slabšímu je to obráceně.
 *
 * Vrací kladné číslo — kdo ho přičte a kdo odečte, řeší volající.
 */
function zmenaPocty(poctaUtocnika, poctaObrance, vyhralUtocnik, n) {
  const sazba    = Number(n.arena_pocta_sazba)   || VYCHOZI.arena_pocta_sazba;
  const delitel  = Number(n.arena_pocta_delitel) || VYCHOZI.arena_pocta_delitel;
  const min      = Number(n.arena_pocta_min);
  const max      = Number(n.arena_pocta_max);

  // Očekávaná úspěšnost útočníka, 0 až 1.
  const rozdil = (Number(poctaObrance) || 0) - (Number(poctaUtocnika) || 0);
  const ocekavani = 1 / (1 + Math.pow(10, rozdil / delitel));

  // Výhra nad favoritem má cenu, výhra nad outsiderem skoro ne.
  const hrubá = vyhralUtocnik ? sazba * (1 - ocekavani) : sazba * ocekavani;

  return Math.max(min, Math.min(max, Math.round(hrubá)));
}

module.exports = { VYCHOZI, POPISKY, zmenaPocty };

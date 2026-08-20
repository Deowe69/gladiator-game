// Přednastavené velikosti běhu. Rychlý na kontrolu, Standardní na běžné
// vyhodnocení, Hloubkový na Monte Carlo s velkým rozptylem.
//
// `historie` = počet nezávislých běhů (různá semínka); víc historií =
// hladší percentily. `hracuNaArchetyp` = kolik postav každého archetypu
// v jedné historii. `dni` = kolik virtuálních dní se simuluje.

const PRESETY = {
  rychly: {
    nazev: 'Rychlý', dni: 60, historie: 20, hracuNaArchetyp: 3,
    popis: 'Rychlá kontrola (~2 měsíce hry, malý vzorek).',
  },
  standardni: {
    nazev: 'Standardní', dni: 180, historie: 60, hracuNaArchetyp: 5,
    popis: 'Běžné vyhodnocení (~půl roku hry).',
  },
  hloubkovy: {
    nazev: 'Hloubkový', dni: 365, historie: 200, hracuNaArchetyp: 8,
    popis: 'Monte Carlo (rok hry, velký vzorek na percentily).',
  },
};

module.exports = { PRESETY };

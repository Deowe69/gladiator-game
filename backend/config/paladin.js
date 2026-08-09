// Výchozí nastavení Paladina.
//
// Tohle jsou jen hodnoty, se kterými se tabulka poprvé naplní. Od té
// chvíle platí, co je v databázi — admin je může měnit, aniž by se
// sahalo do kódu. Nikde jinde v projektu se tahle čísla nepíšou znovu.
const VYCHOZI = {
  // násobitel času; 0.5 = poloviční
  paladin_expedition_time_multiplier:     0.5,
  paladin_labyrinth_time_multiplier:      0.5,
  paladin_arena_cooldown_multiplier:      0.5,
  paladin_circus_turma_cooldown_multiplier: 0.5,

  // bonus k odměnám v procentech
  paladin_gold_bonus_percent: 10,
  paladin_xp_bonus_percent:   10,

  // kolikrát denně smí Paladin obnovit zboží zdarma
  paladin_free_merchant_refreshes_per_day: 1,

  // stropy bodů
  normal_expedition_points_max:  12,
  paladin_expedition_points_max: 30,
  normal_labyrinth_points_max:   12,
  paladin_labyrinth_points_max:  30,

  // cena a délka členství
  paladin_price_emeralds: 30,
  paladin_duration_days:  14,
};

// Popisky pro admina. Klíč, který tu chybí, se v adminu ukáže
// pod svým názvem — nic se nerozbije.
const POPISKY = {
  paladin_expedition_time_multiplier:       'Násobitel času výpravy',
  paladin_labyrinth_time_multiplier:        'Násobitel času bludiště',
  paladin_arena_cooldown_multiplier:        'Násobitel odpočtu arény',
  paladin_circus_turma_cooldown_multiplier: 'Násobitel odpočtu Circus Turma',
  paladin_gold_bonus_percent:               'Bonus ke zlatu (%)',
  paladin_xp_bonus_percent:                 'Bonus ke zkušenostem (%)',
  paladin_free_merchant_refreshes_per_day:  'Obnov zboží zdarma za den',
  normal_expedition_points_max:             'Strop bodů výpravy — běžný hráč',
  paladin_expedition_points_max:            'Strop bodů výpravy — Paladin',
  normal_labyrinth_points_max:              'Strop bodů bludiště — běžný hráč',
  paladin_labyrinth_points_max:             'Strop bodů bludiště — Paladin',
  paladin_price_emeralds:                   'Cena členství (smaragdy)',
  paladin_duration_days:                    'Délka členství (dny)',
};

module.exports = { VYCHOZI, POPISKY };

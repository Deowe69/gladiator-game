// Archetypy hráčů. Čistá konfigurace — žádná herní logika. Engine podle
// nich rozhoduje, kolik akcí kdo za den udělá a do čeho sype zlato.
//
// Pole u denních aktivit jsou rozsahy [min, max]: kolik soubojů daného
// druhu hráč za AKTIVNÍ den zvládne. Konkrétní číslo se losuje ze
// semínka (deterministicky). `aktivniDnyZ7` říká, kolik dní v týdnu
// vůbec hraje. `zlatoDoTreninku` je podíl vydělaného zlata, který jde do
// cvičiště (zbytek „spoří"/koupí vybavení).
//
// `statyPriorita` je pořadí, v jakém archetyp trénuje staty. Významy
// statů (z game.js): strength=poškození, skill=dvojhmat, agility=blok,
// defense/odolnost=životy, intelligence=krit.
//
// Pozn. k neexistujícím systémům: Auction Hunter, Helper-Focused a
// Work-Focused míří na systémy, které hra zatím nemá (Aukce, Pomocníci,
// odměny z Práce). Modelujeme je nejbližším chováním, které JDE (spoření
// zlata / nižší bojová aktivita) a v reportu je označíme, že cílový
// systém neexistuje — ať se nikdo nediví, že „Work" nedává XP.

const ARCHETYPY = [
  {
    id: 'casual', nazev: 'Ležérní', popis: 'Přihlásí se občas, pár soubojů a jde pryč.',
    aktivniDnyZ7: 3,
    denni: { vyprava: [1, 3], bludiste: [0, 1], arena: [0, 1], trenink: [0, 1] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.5,
  },
  {
    id: 'aktivni', nazev: 'Aktivní', popis: 'Hraje skoro denně, rozumné dávky.',
    aktivniDnyZ7: 6,
    denni: { vyprava: [3, 6], bludiste: [1, 3], arena: [1, 3], trenink: [1, 2] },
    statyPriorita: ['strength', 'defense', 'skill', 'agility', 'intelligence'],
    zlatoDoTreninku: 0.7,
  },
  {
    id: 'hardcore', nazev: 'Hardcore', popis: 'Vytěží denní strop, každý den.',
    aktivniDnyZ7: 7,
    denni: { vyprava: [8, 12], bludiste: [3, 5], arena: [4, 8], trenink: [2, 4] },
    statyPriorita: ['strength', 'skill', 'defense', 'intelligence', 'agility'],
    zlatoDoTreninku: 0.9,
  },
  {
    id: 'vyvazeny', nazev: 'Vyvážený', popis: 'Rovnoměrně mezi výpravy, bludiště a arénu.',
    aktivniDnyZ7: 6,
    denni: { vyprava: [3, 5], bludiste: [2, 3], arena: [2, 3], trenink: [1, 2] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.7,
  },
  {
    id: 'xp_farmar', nazev: 'Lovec XP', popis: 'Jede hlavně za zkušenostmi a úrovněmi.',
    aktivniDnyZ7: 7,
    denni: { vyprava: [8, 12], bludiste: [3, 5], arena: [0, 1], trenink: [0, 1] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.4,
  },
  {
    id: 'zlato_farmar', nazev: 'Lovec zlata', popis: 'Sbírá zlato, utrácí opatrně.',
    aktivniDnyZ7: 7,
    denni: { vyprava: [8, 12], bludiste: [2, 4], arena: [0, 1], trenink: [0, 1] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.2,
  },
  {
    id: 'stat_optimalizator', nazev: 'Optimalizátor statů', popis: 'Všechno zlato do cvičiště, chytrý rozklad.',
    aktivniDnyZ7: 7,
    denni: { vyprava: [6, 9], bludiste: [2, 4], arena: [1, 2], trenink: [4, 8] },
    statyPriorita: ['strength', 'skill', 'intelligence', 'defense', 'agility'],
    zlatoDoTreninku: 1.0,
  },
  {
    id: 'aukce_lovec', nazev: 'Lovec aukcí', popis: 'Cílí na Aukční síň (systém zatím není) — spoří zlato.',
    cilovySystem: 'aukce', existuje: false,
    aktivniDnyZ7: 5,
    denni: { vyprava: [3, 6], bludiste: [1, 2], arena: [1, 2], trenink: [0, 1] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.1,
  },
  {
    id: 'bludiste_zamereny', nazev: 'Bludišťák', popis: 'Preferuje bludiště kvůli lepší odměně.',
    aktivniDnyZ7: 7,
    denni: { vyprava: [2, 4], bludiste: [4, 5], arena: [1, 2], trenink: [1, 2] },
    statyPriorita: ['strength', 'defense', 'skill', 'agility', 'intelligence'],
    zlatoDoTreninku: 0.7,
  },
  {
    id: 'pomocnici_zamereny', nazev: 'Sbírá pomocníky', popis: 'Cílí na Pomocníky (systém zatím není) — jinak jako aktivní.',
    cilovySystem: 'pomocnici', existuje: false,
    aktivniDnyZ7: 6,
    denni: { vyprava: [4, 7], bludiste: [1, 3], arena: [1, 2], trenink: [1, 2] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.6,
  },
  {
    id: 'prace_zamereny', nazev: 'Pracant', popis: 'Cílí na Práci (dává 0 XP a systém zatím není) — málo bojů.',
    cilovySystem: 'prace', existuje: false,
    aktivniDnyZ7: 7,
    denni: { vyprava: [1, 2], bludiste: [0, 1], arena: [0, 1], trenink: [1, 2] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.5,
  },
  {
    id: 'vybaveni_lovec', nazev: 'Lovec výbavy', popis: 'Zlato sype do vybavení, ne do cvičiště.',
    aktivniDnyZ7: 6,
    denni: { vyprava: [4, 7], bludiste: [2, 3], arena: [1, 2], trenink: [0, 1] },
    statyPriorita: ['strength', 'defense', 'agility', 'skill', 'intelligence'],
    zlatoDoTreninku: 0.15, zlatoDoVybaveni: 0.85,
  },
  {
    id: 'neefektivni', nazev: 'Neefektivní', popis: 'Rozhoduje se špatně — tříští staty, plýtvá zlatem.',
    aktivniDnyZ7: 5,
    denni: { vyprava: [2, 5], bludiste: [0, 2], arena: [1, 3], trenink: [1, 3] },
    statyPriorita: ['intelligence', 'agility', 'skill', 'defense', 'strength'],
    zlatoDoTreninku: 0.6, plytvani: 0.35,   // část zlata „propadne" (špatné nákupy)
  },
];

const PODLE_ID = Object.fromEntries(ARCHETYPY.map(a => [a.id, a]));

module.exports = { ARCHETYPY, PODLE_ID };

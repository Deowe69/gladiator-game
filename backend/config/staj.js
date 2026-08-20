// ==========================================================================
//  STÁJ — zvířata s pasivními procentními bonusy ke statům
// ==========================================================================
//
// Čtyři zvířata, všechna dostupná od úrovně 1 (žádný level lock — brání jen
// cena). NEsnižují čas výprav ani cestování (starý účel se nepoužívá). Dávají
// pasivní procentní bonus ke statům postavy. Bonus je PROCENTNÍ modifikátor
// aplikovaný AŽ na základ+vybavení, takže smí přerůst případný strop statů a
// nikdy se nezapisuje do základních hodnot.
//
// Hierarchie síly: Prase < Kůň < Ohnivý kůň < Drak.
// Drak je prémiový dočasný pronájem: 20 smaragdů / 10 dní / +2 % ke všem
// statům. Ostatní se kupují za zlato a vlastní se natrvalo. Aktivní je vždy
// jen JEDNO zvíře — bonusy se nesčítají.
//
// Vše je centrálně laditelné (VYCHOZI → přepíše admin z DB).

// Staty, na které bonus působí (klíče sloupců postavy = jak je čte statTotal).
const STATY = ['strength', 'defense', 'agility', 'skill', 'intelligence'];

const VYCHOZI = {
  prase_cena: 5000, prase_procenta: 0.5,
  kun_cena: 25000, kun_procenta: 1.0,
  ohnivy_kun_cena: 100000, ohnivy_kun_procenta: 1.5,
  drak_cena_smaragdy: 20, drak_dny: 10, drak_procenta: 2.0,
};

// Seznam zvířat odvozený z nastavení. `procenta` je v celých % (2 = +2 %).
function zvirata(n = VYCHOZI) {
  return [
    { id: 'prase', nazev: 'Prase', mena: 'zlato', cena: n.prase_cena, dny: null, procenta: n.prase_procenta },
    { id: 'kun', nazev: 'Kůň', mena: 'zlato', cena: n.kun_cena, dny: null, procenta: n.kun_procenta },
    { id: 'ohnivy_kun', nazev: 'Ohnivý kůň', mena: 'zlato', cena: n.ohnivy_kun_cena, dny: null, procenta: n.ohnivy_kun_procenta },
    { id: 'drak', nazev: 'Drak', mena: 'smaragdy', cena: n.drak_cena_smaragdy, dny: n.drak_dny, procenta: n.drak_procenta },
  ];
}

const zvireById = (id, n = VYCHOZI) => zvirata(n).find(z => z.id === id) || null;
const jeDocasne = id => id === 'drak';
const platiZa = id => (id === 'drak' ? 'smaragdy' : 'zlato');

// Bonus zvířete jako podíly (0.02 = +2 %) pro každý stat. Prázdné = nic.
function bonusy(id, n = VYCHOZI) {
  const z = zvireById(id, n);
  const out = {};
  if (!z) return out;
  const podil = (z.procenta || 0) / 100;
  for (const s of STATY) out[s] = podil;
  return out;
}

// Aplikace na jednu hodnotu statu: základ+vybavení × (1 + bonus). Bonus se
// přičítá AŽ tady (po základu a vybavení) — nikdy se nezapisuje do základu.
function aplikuj(hodnota, statKlic, id, n = VYCHOZI) {
  const b = bonusy(id, n)[statKlic] || 0;
  return Math.round(hodnota * (1 + b));
}

module.exports = { STATY, VYCHOZI, zvirata, zvireById, jeDocasne, platiZa, bonusy, aplikuj };

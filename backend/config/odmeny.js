// Základní odměny za poraženého protivníka.
//
// Stejný vzorec jako v `game.js` u EXPEDITIONS — kdo je dál v pořadí
// lokace, dá víc. Server si ho počítá sám, aby o výši odměny
// nerozhodoval prohlížeč.
//
// `poradi` je index protivníka v lokaci (0 = první, 3 = poslední).

// Strop úrovně, kterou klient smí nahlásit. Bez něj by šlo poslat
// úroveň 9999 a nechat si vyplatit nesmysl. Bereme autoritativní strop
// hry (config/xp.js), ne vlastní literál.
const MAX_UROVEN_LOKACE = require('./xp').MAX_UROVEN;

function zakladniOdmena(urovenLokace, poradi = 0) {
  const T = Math.max(1, Math.min(MAX_UROVEN_LOKACE, Math.round(urovenLokace || 1)));
  const i = Math.max(0, Math.min(9, Math.round(poradi || 0)));

  const k = 1 + i * 0.18;
  const loot = 18 * Math.pow(T, 0.9) * k;

  return {
    zlatoOd: Math.round(loot * 0.8), zlatoDo: Math.round(loot * 1.3),
    expOd:   Math.round(loot * 0.9), expDo:   Math.round(loot * 1.4),
  };
}

// Střed rozsahu. Server nehází kostkou po klientovi — vyplácí
// průměr, aby šel výsledek zkontrolovat a zalogovat.
function odmenaZaSouboj(urovenLokace, poradi, druh) {
  const z = zakladniOdmena(urovenLokace, poradi);
  let zlato = Math.round((z.zlatoOd + z.zlatoDo) / 2);
  let exp   = Math.round((z.expOd + z.expDo) / 2);

  // Bludiště je náročnější, boss v něm platí líp.
  if (druh === 'dungeon') { zlato = Math.round(zlato * 1.4); exp = Math.round(exp * 1.4); }
  if (druh === 'arena')   { zlato = Math.round(zlato * 0.9); exp = Math.round(exp * 0.9); }

  return { zlato, exp };
}

// Bonus Paladina. Základ, bonus a výsledek držíme zvlášť, aby se
// dalo zalogovat a ověřit, kde se číslo vzalo.
function sBonusem(zaklad, procent) {
  const p = Math.max(0, Number(procent) || 0);
  const bonus = Math.round(zaklad * p / 100);
  return { zaklad, bonus, celkem: zaklad + bonus };
}

module.exports = { zakladniOdmena, odmenaZaSouboj, sBonusem, MAX_UROVEN_LOKACE };

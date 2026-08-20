// Kolik zkusenosti je potreba z dane urovne na dalsi. Index = uroven.
// Stejna tabulka jako ve hre - drzi se na jednom miste, aby se
// server a hra nemohly rozejit.
//
// MAX_UROVEN je JEDINY autoritativni strop hry. Vsechny systemy (postup,
// predmety, odmeny, arena, simulator, admin...) se ridi timto cislem, ne
// vlastnimi literaly. Az se strop zmeni, meni se jen tady (+ stejna zmena
// v game.js, ktery drzi identickou tabulku pro offline vypocet).
const MAX_UROVEN = 500;

// Rucne vyladena krivka 1..199. Za urovni 200 uz se generuje deterministicky
// (viz rozsirNa500), aby se cisla nemusela psat rucne a klient i server meli
// PRESNE stejnou tabulku. Urovne 1..200 se timto NEMENI.
const XP_RUCNI = [
  null,
  100, 190, 310, 440, 600, 780, 980, 1200, 1450, 1750,
  2050, 2400, 2800, 3200, 3650, 4100, 4600, 5200, 5750, 6400,
  7050, 7800, 8550, 9350, 10200, 11100, 12100, 13100, 14100, 15200,
  16400, 17600, 18900, 20200, 21600, 23100, 24600, 26200, 27800, 29500,
  31300, 33100, 35000, 37000, 39100, 41200, 43400, 45700, 48100, 50500,
  53000, 55600, 58300, 61000, 63900, 66800, 69800, 72900, 76100, 79400,
  82800, 86300, 89800, 93500, 97300, 101000, 105000, 109000, 113500, 117500,
  122000, 126500, 131000, 135500, 140500, 145500, 150500, 155500, 161000, 166000,
  171500, 177500, 183000, 189000, 195000, 201000, 207000, 213500, 220000, 226500,
  233500, 240000, 247000, 254500, 261500, 269000, 276500, 284000, 292000, 300000,
  308000, 316500, 324500, 333500, 342000, 351000, 360000, 369000, 378000, 387500,
  397000, 407000, 417000, 427000, 437000, 447500, 458000, 469000, 480000, 491000,
  502000, 513500, 525000, 536500, 548500, 560500, 573000, 585500, 598000, 611000,
  623500, 637000, 650000, 663500, 677500, 691500, 705500, 719500, 734000, 749000,
  763500, 778500, 794000, 809500, 825000, 840500, 857000, 873000, 889500, 906000,
  923000, 940000, 957000, 974500, 992500, 1010000, 1028000, 1047000, 1065000, 1084000,
  1103000, 1122000, 1141000, 1161000, 1181000, 1201000, 1221000, 1242000, 1263000, 1284000,
  1305000, 1326000, 1348000, 1370000, 1392000, 1414000, 1437000, 1460000, 1483000, 1506000,
  1530000, 1554000, 1578000, 1602000, 1627000, 1652000, 1677000, 1702000, 1728000, 1753000,
  1779000, 1806000, 1832000, 1859000, 1886000, 1914000, 1942000, 1969000, 1998000,
];

// Pokracovani krivky z urovne 199 az na MAX_UROVEN-1. Prirustek mezi
// sousednimi hodnotami roste o 200/uroven (stejne tempo jako na konci rucni
// casti), zaokrouhluje se na 500. Deterministicke - stejny vysledek vsude.
function rozsirNa500(zaklad) {
  const out = zaklad.slice();
  let last = out[out.length - 1];
  for (let L = out.length; L <= MAX_UROVEN - 1; L++) {
    last += 28000 + 200 * (L - 199);
    out[L] = Math.round(last / 500) * 500;
  }
  return out;
}

const XP_DO_DALSI = rozsirNa500(XP_RUCNI);

module.exports = { MAX_UROVEN, XP_DO_DALSI, rozsirNa500, XP_RUCNI };

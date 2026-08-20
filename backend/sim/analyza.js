// Vrstva analýzy. Volitelná, čistě čtecí. Nikdy nesahá do produkční
// konfigurace a nikdy si nevymýšlí čísla — každé „Pozorování" ukazuje na
// hodnotu z agregace. Výstup je striktně rozdělen na:
//   • POZOROVÁNÍ  — holé číslo z běhu, bez výkladu
//   • ÚVAHA       — co z toho možná plyne (interpretace, ne jistota)
//   • DOPORUČENÍ  — návrh ke zvážení pro člověka; NEPROVÁDÍ se automaticky
//
// Tohle není napojení na LLM. Je to pravidly řízený analyzátor; kdyby se
// později přidal jazykový model, drží se stejného kontraktu: smí číst
// `vysledek`, nesmí zapisovat konfiguraci ani tvrdit čísla, která v datech
// nejsou.

function cislo(n, des = 0) {
  return Number(n).toLocaleString('cs-CZ', { maximumFractionDigits: des });
}

function analyzuj(beh) {
  const g = beh.vysledek.global;
  const arch = beh.vysledek.archetypy;
  const P = [], U = [], D = [];   // pozorování, úvahy, doporučení

  // --- ekonomika zlata ---
  P.push(`Medián nasbíraného zlata je ${cislo(g.zlatoZiskano.p50)}, P99 ${cislo(g.zlatoZiskano.p99)}.`);
  const doTr = g.zlatoDoTreninku.prumer, doVyb = g.zlatoDoVybaveni.prumer, zisk = g.zlatoZiskano.prumer;
  const lezi = zisk > 0 ? (zisk - doTr - doVyb) / zisk : 0;
  P.push(`Průměrně jde ${cislo(doTr)} zlata do tréninku a ${cislo(doVyb)} do vybavení; ${cislo(lezi * 100)} % zůstane ležet.`);
  if (lezi > 0.4) {
    U.push('Velká část zlata nemá kam odtéct — jediný smysluplný sink je zatím cvičiště.');
    D.push('Zvážit funkční odbytiště zlata (Aukce/Tržiště/vybavení s bojovým efektem). NEMĚNÍ se automaticky.');
  }

  // --- vybavení jako mrtvá cesta ---
  const vh = arch.vybaveni_lovec, so = arch.stat_optimalizator;
  if (vh && so) {
    P.push(`Lovec výbavy má medián statů ${cislo(vh.statySoucet.p50)}, Optimalizátor statů ${cislo(so.statySoucet.p50)}.`);
    if (vh.statySoucet.p50 < so.statySoucet.p50 * 0.85) {
      U.push('Cesta přes vybavení zaostává — ostrý bojový engine výbavu zatím nečte (souboj.js), takže zlato do ní je bez bojového přínosu.');
      D.push('Až vznikne serverový systém předmětů, napojit jeho bojový efekt; do té doby je „equipment build" slabší záměrně.');
    }
  }

  // --- rozptyl postupu ---
  P.push(`Úroveň: P10 ${cislo(g.uroven.p10)}, medián ${cislo(g.uroven.p50)}, P90 ${cislo(g.uroven.p90)}.`);
  if (g.uroven.p10 > 0 && g.uroven.p90 / g.uroven.p10 > 4) {
    U.push('Mezi nejaktivnějšími a nejležérnějšími je velký odstup úrovní — očekávatelné, ale hlídat matchmaking.');
  }

  // --- aréna / Pocta ---
  P.push(`Pocta: medián ${cislo(g.pocta.p50)}, P90 ${cislo(g.pocta.p90)}.`);
  const hardcore = arch.hardcore;
  if (hardcore) U.push(`Hardcore drží PvP výhru kolem ${cislo((hardcore.pvpWin?.p50 || 0) * 100)} % — kontrola, že Pocta neroste bez stropu.`);

  // --- bojové stropy (kontrola integrit) ---
  const s = beh.vysledek.stropy;
  P.push(`Špičkový Krit ${cislo(s.critMax * 100, 1)} %, Blok ${cislo(s.blokMax * 100, 1)} %, Dvojhmat ${cislo(s.dvojMax * 100, 1)} %.`);

  return {
    upozorneni: 'Analýza je poradní. Nemění konfiguraci ani ostrá data. Doporučení posuzuje člověk.',
    pozorovani: P,
    uvahy: U,
    doporuceni: D,
  };
}

module.exports = { analyzuj };

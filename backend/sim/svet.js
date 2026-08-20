// Jedna odehraná historie: kohorta hráčů běží N virtuálních dní.
//
// Pro dané semínko je výsledek úplně deterministický — stejné semínko
// dá stejnou historii. Souboje jede reálný engine (config/souboj),
// odměny reálný vzorec (config/odmeny), Poctu reálná aréna (config/arena).
// Nic se nikam neukládá; vše žije v paměti a po běhu zmizí. Produkční DB
// se ani neotevírá.

const P    = require('./pravidla');
const post = require('./postava');
const { proud } = require('./nahoda');
const { PODLE_ID } = require('./archetypy');

// „Referenční" (netrénovaný) protivník na dané úrovni — měřítko pro PvE.
// Kdo trénuje, poráží ho s přehledem; kdo ne, je zhruba na 50 %.
function pveProtivnik(uroven) {
  const g = P.PRIRUSTEK_UROVNE, s = post.START;
  const L = uroven - 1;
  return {
    id: -1, jmeno: 'Nepřítel', uroven,
    max_health: s.health + L * g.health,
    strength: s.strength + L * g.strength,
    defense:  s.defense  + L * g.defense,
    agility:  s.agility  + L * g.agility,
    skill:    s.skill    + L * g.skill,
    intelligence: s.intelligence + L * g.intelligence,
    pocta: 0,
  };
}

function boj(utocnik, obranca, nahodaFn) {
  const pa = P.profilBoje(P.naPostavuBoje(utocnik));
  const pb = P.profilBoje(P.naPostavuBoje(obranca));
  return P.odehrajSouboj(pa, pb, nahodaFn).vyhralUtocnik;
}

// Jeden PvE souboj (výprava/bludiště): souboj s referenčním nepřítelem,
// při výhře reálná odměna. `druh` mění násobek odměny (bludiště 1.4×).
function pveSouboj(p, druh, r) {
  const poradi = r.cele(0, 3);
  const enemy = pveProtivnik(p.uroven);
  const vyhral = boj(p, enemy, () => r.dalsi());
  p.m.souboje++;
  if (vyhral) {
    p.m.vyhry++; p.m.pveVyhry++;
    const o = P.odmenaZaSouboj(p.uroven, poradi, druh);
    post.pridejZlato(p, o.zlato);
    post.pridejXp(p, o.exp);
  } else {
    p.m.prohry++;
  }
}

// Jeden arénový souboj proti jinému hráči z kohorty.
function arenaSouboj(p, souperi, r) {
  // soupeř: přednostně blízko Poctou, ne já
  const jini = souperi.filter(x => x.id !== p.id);
  if (!jini.length) return;
  jini.sort((a, b) => Math.abs((a.pocta || 0) - p.pocta) - Math.abs((b.pocta || 0) - p.pocta));
  const vyber = jini.slice(0, Math.min(6, jini.length));
  const o = r.zPole(vyber);

  const vyhral = boj(p, o, () => r.dalsi());
  p.m.souboje++; p.m.pvpBoje++;
  const zmenaU = P.zmenaPocty(p.pocta, o.pocta, vyhral, P.arenaVychozi);
  const zmenaO = P.zmenaPocty(o.pocta, p.pocta, !vyhral, P.arenaVychozi);
  p.pocta = Math.max(0, p.pocta + zmenaU);
  o.pocta = Math.max(0, o.pocta + zmenaO);
  if (vyhral) { p.m.vyhry++; p.m.pvpVyhry++; } else { p.m.prohry++; }

  // aréna platí (0.9×) — reálná odměna i za PvP výhru
  if (vyhral) {
    const od = P.odmenaZaSouboj(p.uroven, 0, 'arena');
    post.pridejZlato(p, od.zlato);
    post.pridejXp(p, od.exp);
  }
}

function pocet(rozsah, r) {
  const [a, b] = rozsah;
  return r.cele(a, b);
}

// Odehraj celou historii. `populace`: [{ archetyp:'aktivni', pocet:20 }, …]
function simulujHistorii({ dni, populace, seminko }) {
  const r = proud(seminko);

  // vytvoř postavy
  const hraci = [];
  let idnum = 1;
  for (const skup of populace) {
    const arch = PODLE_ID[skup.archetyp];
    if (!arch) continue;
    for (let i = 0; i < skup.pocet; i++) {
      hraci.push(post.novaPostava(idnum, `${arch.id}#${i + 1}`, arch));
      idnum++;
    }
  }

  for (let den = 0; den < dni; den++) {
    for (const p of hraci) {
      const arch = PODLE_ID[p.archetyp];
      // hraje dnes vůbec?
      if (!r.sance(arch.aktivniDnyZ7 / 7)) continue;
      p.m.aktivnichDnu++;

      const d = arch.denni;
      const nV = pocet(d.vyprava, r);
      const nB = pocet(d.bludiste, r);
      const nA = pocet(d.arena, r);
      const nT = pocet(d.trenink, r);

      for (let i = 0; i < nV; i++) pveSouboj(p, 'vyprava', r);
      for (let i = 0; i < nB; i++) pveSouboj(p, 'dungeon', r);
      for (let i = 0; i < nA; i++) arenaSouboj(p, hraci, r);

      // útrata zlata: nejdřív trénink dle podílu, pak vybavení
      const doTr = arch.zlatoDoTreninku ?? 0.6;
      if (doTr > 0 && nT > 0) {
        // omez počet tréninků podle podílu ochoty utrácet
        trenujSPodilem(p, arch, nT, doTr);
      }
      if (arch.zlatoDoVybaveni) post.koupVybaveni(p, arch.zlatoDoVybaveni);
      if (arch.plytvani) {
        const pryc = Math.floor(p.zlato * arch.plytvani);
        p.zlato -= pryc; p.m.zlatoPromrhano += pryc;
      }
    }
  }

  return hraci;
}

// Trénink s ohledem na ochotu utrácet: hráč nechá `1-podil` zlata ležet.
function trenujSPodilem(p, arch, kolikAkci, podil) {
  const strop = Math.floor(p.zlato * podil);
  const puvodni = p.zlato;
  const rezerva = p.zlato - strop;   // tohle nechce utratit
  // dočasně „schovej" rezervu, ať trénink nesáhne pod ni
  p.zlato = strop;
  post.trenuj(p, arch, kolikAkci);
  p.zlato += rezerva;
  // korekce: kdyby trenuj nic neutratil, hodnoty sedí; zlatoDoTreninku
  // se připsalo uvnitř trenuj()
  void puvodni;
}

module.exports = { simulujHistorii, pveProtivnik };

// ==========================================================================
//  REGIONY (civilizace) — centrální konfigurace cestování
// ==========================================================================
//
// Cestovatel NENÍ obchod — je to systém přechodu mezi regiony. Aktivní region
// určuje, jaký obsah (výpravy, nepřátelé, vizuál, Práce…) se hráči ukazuje.
// Cestování je obousměrné: do odemčeného regionu a zase zpět. Cestování NIC
// nemaže — postava, inventář, měny, pomocníci i globální postup zůstávají.
//
// Odemykání je primárně přes ÚROVEŇ postavy (žádné zbytečné questové řetězce)
// a je centrálně konfigurovatelné (odUrovne). Regiony se v úrovních záměrně
// PŘEKRÝVAJÍ — Řecko ~1–70, Egypt od ~40 atd.
//
// Zatím má reálný obsah jen Řecko (9 lokací). Ostatní jsou nakonfigurované,
// ale zatím bez obsahu (hotovo:false) — hlásíme to poctivě, nic si nevymýšlíme.
//
// „Za hranicí" je zvláštní přechod za úrovní 500 — NENÍ to běžný region, ale
// jiný herní režim (mode:'zaHranici') s vlastním layoutem. Tady jen připravená
// architektura; post-500 obsah se nestaví bez schválení.

// Výchozí úrovňové brány (přepíše admin z DB → region_config).
const VYCHOZI = {
  recko_od: 1,
  egypt_od: 40,
  rim_od: 90,
  severska_od: 140,
  keltska_od: 200,
  rise_mrtvych_od: 280,
  nebesa_od: 380,
  za_hranici_od: 500,     // = strop běžné hry (config/xp MAX_UROVEN)
};

// Seznam regionů. `tema` = barevná identita pro UI. `hotovo` = má reálný
// obsah. `mode` = 'normal' | 'zaHranici' (jiný layout/pravidla).
function regiony(n = VYCHOZI) {
  return [
    { id:'recko',        nazev:'Řecko',          odUrovne:n.recko_od,       tema:'#4a7ab5', mode:'normal', hotovo:true,
      popis:'Kolébka hrdinů. Orčí lesy, zakleté vesnice a hory, kde hnízdí gryfové. Tady začíná cesta ke slávě.' },
    { id:'egypt',        nazev:'Egypt',          odUrovne:n.egypt_od,       tema:'#c8a848', mode:'normal', hotovo:false,
      popis:'Poušť, pyramidy a bohové se zvířecími hlavami. Mrtví faraoni nespí a písek pohltí každého, kdo zabloudí.' },
    { id:'rim',          nazev:'Řím',            odUrovne:n.rim_od,         tema:'#b5472e', mode:'normal', hotovo:false,
      popis:'Železná říše legií a arén. Ctižádost tu teče ulicemi jako víno — a krev jako voda.' },
    { id:'severska',     nazev:'Severská země',  odUrovne:n.severska_od,    tema:'#6a9ab5', mode:'normal', hotovo:false,
      popis:'Ledové fjordy a síně, kde se pije na počest padlých. Berserkři a draci severu neznají slitování.' },
    { id:'keltska',      nazev:'Keltská země',   odUrovne:n.keltska_od,     tema:'#5a9a5a', mode:'normal', hotovo:false,
      popis:'Mlžné hvozdy a kamenné kruhy. Druidové mluví s duchy a les si pamatuje každý prohřešek.' },
    { id:'rise_mrtvych', nazev:'Říše mrtvých',   odUrovne:n.rise_mrtvych_od,tema:'#8a6ab5', mode:'normal', hotovo:false,
      popis:'Za řekou zapomnění. Kdo sem vkročí živý, jde proti řádu světa — a bohové mrtvých to nevidí rádi.' },
    { id:'nebesa',       nazev:'Nebesa',         odUrovne:n.nebesa_od,      tema:'#d8c878', mode:'normal', hotovo:false,
      popis:'Sídla polobohů nad mraky. Vypadá to jako cíl cesty — ale skutečná výzva teprve začíná.' },
    // Přechod za běžný svět. Jiný režim, jiný layout. Zatím jen brána.
    { id:'za_hranici',   nazev:'Za hranicí',     odUrovne:n.za_hranici_od,  tema:'#9b5ad0', mode:'zaHranici', hotovo:false,
      popis:'Když úroveň dosáhne stropu, cesta nekončí — mění se. Za hranicí platí jiná pravidla, jiný postup a jiné, božské síly. Level 500 zůstává; za ním začíná nové počítání.' },
  ];
}

const VYCHOZI_REGION = 'recko';

const regionById = (id, n = VYCHOZI) => regiony(n).find(r => r.id === id) || null;

// Region je odemčený, když má hráč dost úrovně.
function odemcen(id, uroven, n = VYCHOZI) {
  const r = regionById(id, n);
  return !!r && (uroven || 1) >= r.odUrovne;
}

module.exports = { VYCHOZI, VYCHOZI_REGION, regiony, regionById, odemcen };

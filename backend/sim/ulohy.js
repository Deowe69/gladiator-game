// Správa úloh simulátoru. Úlohy běží v paměti procesu — nic se neukládá
// do produkční DB. Každá má stav: čeká → běží → hotovo | zrušeno | chyba,
// průběh v procentech a (po dokončení) výsledek. Velké běhy jdou zrušit.
//
// Poznámka k „paralelním workerům": Node běží v jednom vlákně, takže
// úlohy zpracováváme sériově z fronty (souběh by šel přes worker_threads
// — připraveno rozšířit, ale tady schválně držíme jednoduché a jisté).
// `maxSoubezne` omezuje, kolik úloh smí běžet zároveň.

const { spustSimulaci } = require('./simulace');
const { PRESETY } = require('./presety');

const MAX_HISTORIE_V_PAMETI = 40;   // strop uložených dokončených úloh
let citac = 1;
const ulohy = new Map();            // id -> úloha
const fronta = [];
let bezi = 0;
const maxSoubezne = 1;

function novaUloha(nastaveni, kdo) {
  const id = 'sim' + (citac++);
  const u = {
    id, stav: 'ceka', pridano: Date.now(), kdo,
    nastaveni, prubeh: { hotovo: 0, celkem: nastaveni.historie || 0 },
    vysledek: null, chyba: null, _zrusit: false,
  };
  ulohy.set(id, u);
  fronta.push(id);
  poJedne();
  uklid();
  return verejna(u);
}

async function poJedne() {
  if (bezi >= maxSoubezne) return;
  const id = fronta.shift();
  if (!id) return;
  const u = ulohy.get(id);
  if (!u || u.stav !== 'ceka') return poJedne();
  bezi++;
  u.stav = 'bezi'; u.zacatek = Date.now();
  try {
    const v = await spustSimulaci({
      ...u.nastaveni,
      onProgress: p => { u.prubeh = p; },
      jeZrusen: () => u._zrusit,
    });
    if (v.zruseno) { u.stav = 'zruseno'; u.prubeh = { hotovo: v.hotovoHistorii, celkem: v.celkemHistorii }; }
    else { u.stav = 'hotovo'; u.vysledek = v; }
  } catch (e) {
    u.stav = 'chyba'; u.chyba = (e && e.message) || String(e);
  } finally {
    u.konec = Date.now();
    bezi--;
    poJedne();
  }
}

function zrus(id) {
  const u = ulohy.get(id);
  if (!u) return null;
  if (u.stav === 'ceka') { u.stav = 'zruseno'; const i = fronta.indexOf(id); if (i >= 0) fronta.splice(i, 1); }
  else if (u.stav === 'bezi') u._zrusit = true;
  return verejna(u);
}

function uklid() {
  const hotove = [...ulohy.values()].filter(u => ['hotovo', 'zruseno', 'chyba'].includes(u.stav))
    .sort((a, b) => a.pridano - b.pridano);
  while (hotove.length > MAX_HISTORIE_V_PAMETI) {
    const s = hotove.shift();
    ulohy.delete(s.id);
  }
}

// verejná podoba bez interních polí a bez tučného výsledku v seznamu
function verejna(u, sVysledkem = false) {
  const z = {
    id: u.id, stav: u.stav, kdo: u.kdo, pridano: u.pridano,
    prubeh: u.prubeh, chyba: u.chyba,
    nastaveni: { ...u.nastaveni, onProgress: undefined, jeZrusen: undefined },
    trvaniMs: u.konec && u.zacatek ? u.konec - u.zacatek : null,
  };
  if (u.vysledek) {
    z.meta = u.vysledek.meta;
    z.pocetUpozorneni = u.vysledek.upozorneni.length;
  }
  if (sVysledkem) z.vysledek = u.vysledek;
  return z;
}

function seznam() {
  return [...ulohy.values()].sort((a, b) => b.pridano - a.pridano).map(u => verejna(u));
}
function detail(id) {
  const u = ulohy.get(id);
  return u ? verejna(u, true) : null;
}

module.exports = { novaUloha, zrus, seznam, detail, PRESETY };

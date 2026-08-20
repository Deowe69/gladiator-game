// Deterministický zdroj náhody pro simulátor.
//
// Stejný LCG jako `config/souboj.js` (nahodaSeSeminkem) — schválně,
// aby simulované souboje běžely přesně stejným generátorem jako ostré.
// Navíc přidáváme pomůcky pro rozhodování stratégií (kolik akcí za den,
// koho vyzvat…), aby celý běh byl ze semínka zrekonstruovatelný.
//
// Pravidlo reprodukovatelnosti: stejné semínko => stejná historie.
// Nikde v simulátoru se nesmí volat Math.random().

function proud(seminko) {
  let s = (seminko >>> 0) || 1;
  const dalsi = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;         // [0,1)
  };
  return {
    // holé [0,1) — předává se do odehrajSouboj jako `nahoda`
    dalsi,
    // celé číslo z <a, b> včetně
    cele: (a, b) => a + Math.floor(dalsi() * (b - a + 1)),
    // s pravděpodobností p vrátí true
    sance: p => dalsi() < p,
    // náhodný prvek pole
    zPole: pole => pole[Math.floor(dalsi() * pole.length)],
    // odvozené semínko — z jednoho proudu vyrobíme další nezávislý,
    // třeba zvlášť pro každý souboj, ať jsou jednotlivě ověřitelné
    semínko: () => (s = (s * 1664525 + 1013904223) >>> 0),
  };
}

// Stabilní 32bit hash z řetězce (FNV-1a). Používá se, aby se z názvu
// běhu + varianty + semínka dalo deterministicky odvodit počáteční stav.
function hash(text) {
  let h = 2166136261 >>> 0;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

module.exports = { proud, hash };

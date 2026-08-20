// Ekonomická analýza Aukční síně. node backend/aukce/ekonomika.js
// Používá reálný centrální generátor a aukční ceníky. Nic neukládá.

const G = require('../config/predmety');
const A = require('../config/aukce');
const { proud } = require('../sim/nahoda');

const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const prum = a => a.reduce((x, y) => x + y, 0) / a.length;
const r0 = n => Math.round(n).toLocaleString('cs-CZ');

// Base Budget dle přesného vzorce i nad strop hry (pro L300–500 ilustrativně).
const baseBudgetRaw = L => Math.round(10 + (L - 1) * (4 / 3));

function analyza(L, N = 4000) {
  const rM = proud(1000 + L).dalsi, rA = proud(2000 + L).dalsi;
  const bM = [], bA = [], startZ = [], buyE = [], statyKladne = [];
  const poc = [0, 0, 0, 0, 0, 0]; let zapor = 0;
  for (let i = 0; i < N; i++) {
    const m = G.generujPredmet({ uroven: L, zdroj: 'merchant', nahoda: rM });
    const a = G.generujPredmet({ uroven: L, zdroj: 'aukce', nahoda: rA });
    bM.push(m.totalBudget); bA.push(a.totalBudget);
    startZ.push(A.startovniZlato(a)); buyE.push(A.buyNowSmaragdy(a));
    poc[a.pocetStatu]++; if (a.zaporny) zapor++;
    statyKladne.push(G.STATY.reduce((s, k) => s + Math.max(0, a.staty[k] || 0), 0));
  }
  return {
    L, baseBudget: baseBudgetRaw(L),
    budgetMerchant: Math.round(prum(bM)), budgetAukce: Math.round(prum(bA)),
    biasProc: ((prum(bA) / prum(bM) - 1) * 100).toFixed(1),
    startZlatoMed: med(startZ), buyNowMed: med(buyE),
    pocStatu: poc.slice(1).map(x => (x / N * 100).toFixed(0) + '%').join('/'),
    zaporProc: (zapor / N * 100).toFixed(1),
  };
}

console.log('\n=== EKONOMIKA AUKČNÍ SÍNĚ (reálný generátor) ===\n');
console.log('Úroveň | BaseBudget | Ø budget Merchant | Ø budget Aukce | bias | start.zlato(med) | BuyNow smaragdy(med) | počet statů 1/2/3/4/5 | záporné');
console.log('-------|-----------|-------------------|----------------|------|------------------|----------------------|-----------------------|--------');
for (const L of [20, 50, 100, 200, 300, 400, 500]) {
  const a = analyza(L);
  const nadStrop = L > G.MAX_UROVEN_PREDMETU ? ' *' : '';
  console.log(
    `${String(L).padEnd(6)}${nadStrop ? '*' : ' '}| ${String(a.baseBudget).padEnd(9)} | ${String(a.budgetMerchant).padEnd(17)} | ${String(a.budgetAukce).padEnd(14)} | ${(a.biasProc + '%').padEnd(4)} | ${r0(a.startZlatoMed).padEnd(16)} | ${String(a.buyNowMed).padEnd(20)} | ${a.pocStatu.padEnd(21)} | ${a.zaporProc}%`
  );
}
console.log('\n* L300–500 jsou NAD stropem Olympu (200). Generátor je clampuje na 200;');
console.log('  BaseBudget je vypsán dle čistého vzorce round(10+(L-1)*4/3) jen ilustrativně.\n');

console.log('=== UKÁZKY AUKČNÍCH PŘEDMĚTŮ (Úroveň 100, různé rolly) ===\n');
const r = proud(424242).dalsi;
for (let i = 0; i < 8; i++) {
  const p = G.generujPredmet({ uroven: 100, slot: G.SLOTY[i % G.SLOTY.length], zdroj: 'aukce', nahoda: r });
  console.log(
    `#${i + 1} [${p.slot}] budget ${String(p.totalBudget).padStart(3)} · ${p.pocetStatu} stat(y)${p.zaporny ? ' · záporný: ' + G.NAZVY[p.zaporny] : ''}`
  );
  console.log(`     ${G.popisStatu(p)}  →  hodnota ${G.hodnotaPredmetu(p)} · start ${r0(A.startovniZlato(p))} zlata · Buy Now ${A.buyNowSmaragdy(p)} smaragdů`);
}
console.log('');

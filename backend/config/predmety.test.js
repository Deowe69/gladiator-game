// Statistické testy centrálního generátoru předmětů.
// Spustit: node backend/config/predmety.test.js
const assert = require('assert');
const G = require('./predmety');
const { proud } = require('../sim/nahoda');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };

console.log('\n=== Generátor předmětů ===\n');

test('BaseBudget = round(10 + (L-1)*4/3) — přesné hodnoty ze zadání', () => {
  const ocek = { 1: 10, 2: 11, 3: 13, 4: 14, 5: 15, 6: 17, 10: 22, 50: 75, 100: 142, 200: 275 };
  for (const [L, v] of Object.entries(ocek)) assert.strictEqual(G.baseBudget(+L), v, `L${L} => ${G.baseBudget(+L)} != ${v}`);
});

test('deterministické — stejné semínko dá stejný předmět', () => {
  const a = G.generujPredmet({ uroven: 60, slot: 'weapon', zdroj: 'aukce', nahoda: proud(123).dalsi });
  const b = G.generujPredmet({ uroven: 60, slot: 'weapon', zdroj: 'aukce', nahoda: proud(123).dalsi });
  assert.deepStrictEqual(a.staty, b.staty);
  assert.strictEqual(a.totalBudget, b.totalBudget);
});

test('žádná vzácnost, žádná předpona na předmětu', () => {
  const p = G.generujPredmet({ uroven: 50, zdroj: 'aukce', nahoda: proud(7).dalsi });
  assert.ok(!('quality' in p) && !('rarity' in p) && !('vzacnost' in p), 'objevila se vzácnost');
  assert.strictEqual(p.predpona, null, 'objevila se předpona');
});

test('počet statů ~ 20/35/28/14/3 (%)', () => {
  const r = proud(2024).dalsi;
  const poc = [0, 0, 0, 0, 0, 0];
  const N = 200000;
  for (let i = 0; i < N; i++) poc[G.generujPredmet({ uroven: 80, zdroj: 'merchant', nahoda: r }).pocetStatu]++;
  const proc = poc.map(x => x / N * 100);
  const cil = [null, 20, 35, 28, 14, 3];
  for (let s = 1; s <= 5; s++) assert.ok(Math.abs(proc[s] - cil[s]) < 1.2, `${s} statů: ${proc[s].toFixed(1)}% vs ${cil[s]}%`);
  assert.ok(proc[5] < 5, 'pětistatové nejsou vzácné');
});

test('staty jen z pětice Síla/Dovednost/Obratnost/Odolnost/Inteligence', () => {
  const r = proud(9).dalsi;
  for (let i = 0; i < 5000; i++) {
    const p = G.generujPredmet({ uroven: 40, zdroj: 'aukce', nahoda: r });
    for (const k of Object.keys(p.staty)) assert.ok(G.STATY.includes(k), 'cizí stat: ' + k);
    // žádný stat dvakrát -> klíče jsou unikátní automaticky (objekt)
  }
});

test('pětistatový předmět NEdostane rozpočet zadarmo (stejné L => stejné rozdělení budgetu)', () => {
  // Součet KLADNÝCH statů u předmětu bez záporu = totalBudget (giveback jen u záporných).
  const r = proud(11).dalsi;
  let kontrol = 0;
  for (let i = 0; i < 20000; i++) {
    const p = G.generujPredmet({ uroven: 100, zdroj: 'merchant', nahoda: r });
    if (p.zaporny) continue;
    const soucet = G.STATY.reduce((a, s) => a + (p.staty[s] || 0), 0);
    assert.strictEqual(soucet, p.totalBudget, `součet ${soucet} != budget ${p.totalBudget} (${p.pocetStatu} statů)`);
    kontrol++;
  }
  assert.ok(kontrol > 1000);
});

test('průměrné rozpočty jsou častější než extrémy (zvon, ne plocho)', () => {
  const r = proud(5).dalsi;
  const zaklad = G.baseBudget(100);
  const kose = { nizky: 0, stred: 0, vysoky: 0 };
  const N = 60000;
  for (let i = 0; i < N; i++) {
    const f = G.generujPredmet({ uroven: 100, zdroj: 'merchant', nahoda: r }).totalBudget / zaklad;
    if (f < 0.92) kose.nizky++; else if (f > 1.12) kose.vysoky++; else kose.stred++;
  }
  assert.ok(kose.stred > kose.nizky && kose.stred > kose.vysoky, `střed ${kose.stred} není nejčastější`);
});

test('Aukce má vyšší průměrný rozpočet než Obchodník, ale rozdělení se překrývají', () => {
  const rM = proud(100).dalsi, rA = proud(200).dalsi;
  let sumM = 0, sumA = 0, maxM = 0, minA = Infinity;
  const N = 50000;
  for (let i = 0; i < N; i++) {
    const m = G.generujPredmet({ uroven: 100, zdroj: 'merchant', nahoda: rM }).totalBudget;
    const a = G.generujPredmet({ uroven: 100, zdroj: 'aukce', nahoda: rA }).totalBudget;
    sumM += m; sumA += a; maxM = Math.max(maxM, m); minA = Math.min(minA, a);
  }
  const prumM = sumM / N, prumA = sumA / N;
  assert.ok(prumA > prumM, `aukce ${prumA.toFixed(1)} není > obchod ${prumM.toFixed(1)}`);
  assert.ok(prumA < prumM * 1.35, `aukce ${prumA.toFixed(1)} je moc vysoká (byla by to vzácnost)`);
  // překryv: nejlepší obchodní roll je lepší než nejhorší aukční
  assert.ok(maxM > minA, `bez překryvu: maxMerchant ${maxM} <= minAukce ${minA}`);
});

test('záporné staty vznikají, jsou vzácné, a NEjsou síla zadarmo', () => {
  const r = proud(77).dalsi;
  let zaporne = 0; const N = 50000;
  for (let i = 0; i < N; i++) {
    const p = G.generujPredmet({ uroven: 120, zdroj: 'aukce', nahoda: r });
    if (p.zaporny) {
      zaporne++;
      // čistý součet statů (kladné - záporné) < totalBudget => ne zadarmo
      const cisty = G.STATY.reduce((a, s) => a + (p.staty[s] || 0), 0);
      assert.ok(cisty <= p.totalBudget, `čistý ${cisty} > budget ${p.totalBudget}`);
      assert.ok(p.staty[p.zaporny] < 0, 'označený záporný stat není záporný');
    }
  }
  const podil = zaporne / N;
  assert.ok(podil > 0.03 && podil < 0.16, `podíl záporných ${(podil * 100).toFixed(1)}% mimo očekávání`);
});

test('rozdělení budgetu se liší (specializované i vyvážené)', () => {
  const r = proud(303).dalsi;
  let spec = 0, vyvaz = 0;
  for (let i = 0; i < 20000; i++) {
    const p = G.generujPredmet({ uroven: 100, zdroj: 'merchant', nahoda: r });
    if (p.pocetStatu < 2 || p.zaporny) continue;
    const hodnoty = G.STATY.map(s => p.staty[s] || 0).filter(v => v > 0);
    const max = Math.max(...hodnoty), soucet = hodnoty.reduce((a, b) => a + b, 0);
    if (max / soucet > 0.7) spec++; else vyvaz++;
  }
  assert.ok(spec > 100 && vyvaz > 100, `spec ${spec} / vyváž ${vyvaz} — jedno chybí`);
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

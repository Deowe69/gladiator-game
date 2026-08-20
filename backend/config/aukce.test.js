// Testy aukční logiky (čisté funkce). node backend/config/aukce.test.js
const assert = require('assert');
const A = require('./aukce');
const G = require('./predmety');
const { proud } = require('../sim/nahoda');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };

console.log('\n=== Aukční logika ===\n');

test('viditelnost = úroveň + 5, stropovaná na MAX_UROVEN (500)', () => {
  assert.strictEqual(A.viditelnyStrop(20), 25);
  assert.strictEqual(A.viditelnyStrop(50), 55);
  assert.strictEqual(A.viditelnyStrop(100), 105);
  assert.strictEqual(A.viditelnyStrop(200), 205);
  assert.strictEqual(A.viditelnyStrop(495), 500);
  assert.strictEqual(A.viditelnyStrop(500), 500);   // strop se nepřekročí
});

test('smiVidet: nad úroveň+5 nesmí, pod ano', () => {
  assert.ok(A.smiVidet(25, 20) && !A.smiVidet(26, 20));
  assert.ok(A.smiVidet(1, 100));      // nižší předmět vidí
  assert.ok(!A.smiVidet(106, 100));
});

test('anti-snipe: přihoz v posledních 60 s prodlouží o 60 s', () => {
  const nyni = 1_000_000;
  // zbývá 42 s -> nový konec ≈ nyni + 60 s
  const konec42 = nyni + 42_000;
  assert.strictEqual(A.novyKonecPoPrihozu(konec42, nyni), nyni + 60_000);
  // zbývá 300 s -> konec se nemění
  const konec300 = nyni + 300_000;
  assert.strictEqual(A.novyKonecPoPrihozu(konec300, nyni), konec300);
  // opakované prodloužení: zbývá 30 s z prodlouženého -> zase +60
  assert.strictEqual(A.novyKonecPoPrihozu(nyni + 30_000, nyni), nyni + 60_000);
});

test('min. další přihoz roste s hodnotou (5 % nebo aspoň 25)', () => {
  assert.strictEqual(A.minPristiPrihoz(100), 100 + 25);     // 5% z 100 = 5 < 25
  assert.strictEqual(A.minPristiPrihoz(10000), 10000 + 500); // 5% = 500 > 25
});

test('startovní zlato a Buy Now smaragdy rostou s úrovní/hodnotou', () => {
  const r = proud(1).dalsi;
  let poslZ = 0, poslS = 0;
  for (const L of [20, 50, 100, 200]) {
    const p = G.generujPredmet({ uroven: L, zdroj: 'aukce', nahoda: r });
    const z = A.startovniZlato(p), s = A.buyNowSmaragdy(p);
    assert.ok(z >= A.VYCHOZI.zlato_start_min, 'zlato pod minimem');
    assert.ok(s >= A.VYCHOZI.smaragd_min && s <= A.VYCHOZI.smaragd_max, 'smaragdy mimo rozsah');
  }
  // vyšší úroveň => v průměru dražší; ověř na velkém vzorku medián
  const med = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const zL20 = [], zL200 = [];
  for (let i = 0; i < 400; i++) {
    zL20.push(A.startovniZlato(G.generujPredmet({ uroven: 20, zdroj: 'aukce', nahoda: r })));
    zL200.push(A.startovniZlato(G.generujPredmet({ uroven: 200, zdroj: 'aukce', nahoda: r })));
  }
  assert.ok(med(zL200) > med(zL20), 'L200 není dražší než L20');
});

test('Buy Now smaragdy jsou stropované (prémiová, ale ne extrémní)', () => {
  const r = proud(3).dalsi;
  for (let i = 0; i < 2000; i++) {
    const p = G.generujPredmet({ uroven: 200, zdroj: 'aukce', nahoda: r });
    const s = A.buyNowSmaragdy(p);
    assert.ok(s <= A.VYCHOZI.smaragd_max, 'smaragdy nad stropem');
  }
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

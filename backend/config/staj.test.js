// Testy Stáje. node backend/config/staj.test.js
const assert = require('assert');
const S = require('./staj');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };

console.log('\n=== Stáj ===\n');

test('čtyři zvířata, hierarchie Prase < Kůň < Ohnivý kůň < Drak', () => {
  const z = S.zvirata();
  assert.strictEqual(z.length, 4);
  const p = z.map(x => x.procenta);
  assert.ok(p[0] < p[1] && p[1] < p[2] && p[2] < p[3], 'procenta nerostou: ' + p.join('<'));
});

test('všechna dostupná od úrovně 1 (žádný level lock v datech)', () => {
  for (const z of S.zvirata()) assert.ok(!('odUrovne' in z) && !('minLevel' in z), 'level lock u ' + z.id);
});

test('Drak: 20 smaragdů, 10 dní, +2 % ke KAŽDÉMU statu, žádné zlato', () => {
  const d = S.zvireById('drak');
  assert.strictEqual(d.cena, 20);
  assert.strictEqual(d.mena, 'smaragdy');
  assert.strictEqual(d.dny, 10);
  assert.strictEqual(S.platiZa('drak'), 'smaragdy');   // ne zlato
  const b = S.bonusy('drak');
  for (const s of S.STATY) assert.strictEqual(b[s], 0.02, `${s} != +2 %`);
});

test('+2 % je procento, ne +2 body; aplikuje se po základu (může přerůst strop)', () => {
  // stat 1000 (klidně nad libovolným stropem) → 1020, tedy ×1.02, ne +2
  assert.strictEqual(S.aplikuj(1000, 'strength', 'drak'), 1020);
  assert.strictEqual(S.aplikuj(50, 'strength', 'drak'), 51);
  // není to plochých +2 body:
  assert.notStrictEqual(S.aplikuj(1000, 'strength', 'drak'), 1002);
});

test('gold zvířata jsou levnější v efektu než Drak a platí se zlatem', () => {
  for (const id of ['prase', 'kun', 'ohnivy_kun']) {
    assert.strictEqual(S.platiZa(id), 'zlato');
    assert.ok(!S.jeDocasne(id), id + ' by nemělo být dočasné');
    assert.ok(S.bonusy(id).strength < 0.02, id + ' není pod Drakem');
  }
  assert.ok(S.jeDocasne('drak'));
});

test('bonus se počítá jen z JEDNOHO zvířete (žádné sčítání)', () => {
  // API vrací bonus jednoho id; sčítání není možné přes tohle rozhraní
  const b = S.bonusy('kun');
  assert.strictEqual(b.strength, 0.01);
  // neexistující id => žádný bonus
  assert.deepStrictEqual(S.bonusy('nic'), {});
});

test('konfigurace přepíše hodnoty', () => {
  const n = { ...S.VYCHOZI, drak_procenta: 3.0, drak_dny: 14 };
  assert.strictEqual(S.zvireById('drak', n).dny, 14);
  assert.strictEqual(S.bonusy('drak', n).strength, 0.03);
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

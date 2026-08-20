// Testy regionů. node backend/config/regiony.test.js
const assert = require('assert');
const R = require('./regiony');
const { MAX_UROVEN } = require('./xp');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };

console.log('\n=== Regiony (Cestovatel) ===\n');

test('7 běžných regionů + Za hranicí', () => {
  const rr = R.regiony();
  assert.strictEqual(rr.length, 8);
  const normal = rr.filter(r => r.mode === 'normal').length;
  assert.strictEqual(normal, 7, 'má být 7 běžných regionů');
  assert.strictEqual(rr.filter(r => r.mode === 'zaHranici').length, 1);
});

test('pořadí regionů dle plánu', () => {
  const ids = R.regiony().map(r => r.id);
  assert.deepStrictEqual(ids, ['recko','egypt','rim','severska','keltska','rise_mrtvych','nebesa','za_hranici']);
});

test('Řecko je odemčené od úrovně 1 a jediné hotové', () => {
  assert.strictEqual(R.regionById('recko').odUrovne, 1);
  assert.ok(R.regionById('recko').hotovo);
  assert.strictEqual(R.regiony().filter(r => r.hotovo).length, 1, 'zatím jen Řecko má obsah');
});

test('úrovňové brány rostou a překrývají se (Egypt od 40, ne blokově)', () => {
  const rr = R.regiony();
  for (let i = 1; i < rr.length; i++) assert.ok(rr[i].odUrovne >= rr[i - 1].odUrovne, 'brány nerostou');
  assert.strictEqual(R.regionById('egypt').odUrovne, 40);
});

test('Za hranicí se odemyká na stropu hry (500 = MAX_UROVEN)', () => {
  assert.strictEqual(R.regionById('za_hranici').odUrovne, MAX_UROVEN);
  assert.strictEqual(R.regionById('za_hranici').mode, 'zaHranici');
});

test('odemcen() řídí úroveň, ne klient', () => {
  assert.ok(R.odemcen('recko', 1));
  assert.ok(!R.odemcen('egypt', 39));
  assert.ok(R.odemcen('egypt', 40));
  assert.ok(!R.odemcen('za_hranici', 499));
  assert.ok(R.odemcen('za_hranici', 500));
});

test('konfigurace přepíše brány', () => {
  const n = { ...R.VYCHOZI, egypt_od: 55 };
  assert.strictEqual(R.regionById('egypt', n).odUrovne, 55);
  assert.ok(!R.odemcen('egypt', 54, n) && R.odemcen('egypt', 55, n));
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

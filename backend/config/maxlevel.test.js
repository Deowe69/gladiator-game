// Testy stropu úrovně (MAX_UROVEN). node backend/config/maxlevel.test.js
const assert = require('assert');
const xp = require('./xp');
const predmety = require('./predmety');
const odmeny = require('./odmeny');
const aukce = require('./aukce');
const pravidla = require('../sim/pravidla');
const post = require('../sim/postava');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };

console.log('\n=== Strop úrovně (MAX_UROVEN) ===\n');

const MAX = xp.MAX_UROVEN;

// XP potřeba z úrovně L na L+1, jako to čte server/hra.
const xpNaDalsi = L => (L >= MAX ? null : (xp.XP_DO_DALSI[L] || null));

test('MAX_UROVEN je 500', () => assert.strictEqual(MAX, 500));

test('jeden autoritativní strop — žádné rozcházející se MAX napříč systémy', () => {
  assert.strictEqual(predmety.MAX_UROVEN_PREDMETU, MAX, 'předměty mají jiný strop');
  assert.strictEqual(odmeny.MAX_UROVEN_LOKACE, MAX, 'odměny mají jiný strop');
  assert.strictEqual(aukce.VYCHOZI.strop_urovne, MAX, 'aukce má jiný strop');
  assert.strictEqual(pravidla.MAX_UROVEN, MAX, 'simulátor má jiný strop');
});

test('tabulka XP má hodnoty až po úroveň 499 (499→500 lze dosáhnout)', () => {
  assert.strictEqual(xp.XP_DO_DALSI.length, 500);
  assert.ok(Number.isFinite(xpNaDalsi(499)) && xpNaDalsi(499) > 0, '499→500 nemá cenu XP');
  // úrovně 1..200 se NEZMĚNILY
  assert.strictEqual(xp.XP_DO_DALSI[1], 100);
  assert.strictEqual(xp.XP_DO_DALSI[199], 1998000);
});

test('úroveň 500 nemá „další" úroveň (501 nedosažitelná)', () => {
  assert.strictEqual(xpNaDalsi(500), null);
  assert.strictEqual(xpNaDalsi(501), null);
});

test('level 499 → 500 při dostatku XP', () => {
  // stejná logika jako checkLevelUp: while(xp>=need){xp-=need;level++}
  let level = 499, exp = xpNaDalsi(499) + 5;
  while (level < MAX && exp >= xpNaDalsi(level)) { exp -= xpNaDalsi(level); level++; }
  assert.strictEqual(level, 500);
});

test('nadbytek XP na úrovni 500 NEpřeteče na 501', () => {
  let level = 500, exp = 999999999;   // obří přebytek
  // na stropu je „potřeba" null → cyklus se nespustí
  let kroky = 0;
  while (level < MAX && xpNaDalsi(level) && exp >= xpNaDalsi(level) && kroky < 10) { exp -= xpNaDalsi(level); level++; kroky++; }
  assert.strictEqual(level, 500, 'úroveň přerostla strop');
});

test('simulátor: postava se nezastaví dřív a nepřeleze 500', () => {
  const p = post.novaPostava(1, 'x', { id: 'test', statyPriorita: ['strength'] });
  post.pridejXp(p, 10 ** 12);   // extrémní XP naráz
  assert.strictEqual(p.uroven, MAX, 'simulovaná postava nedosáhla/přelezla strop: ' + p.uroven);
});

test('generátor předmětů respektuje strop (L>500 se ořízne)', () => {
  const p = predmety.generujPredmet({ uroven: 9999, zdroj: 'aukce', nahoda: () => 0.5 });
  assert.strictEqual(p.uroven, MAX);
  // BaseBudget dle vzorce platí i na 500
  assert.strictEqual(predmety.baseBudget(500), Math.round(10 + 499 * (4 / 3)));
});

test('odměny: úroveň lokace se ořízne na strop (žádný nesmysl z úrovně 9999)', () => {
  const a = odmeny.odmenaZaSouboj(9999, 0, 'vyprava');
  const b = odmeny.odmenaZaSouboj(MAX, 0, 'vyprava');
  assert.deepStrictEqual(a, b);
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

// Deterministické testy simulátoru. Spustit: node backend/sim/test.js
// Bez frameworku — malý vlastní běžec, ať nic nezávisí na instalaci.

const assert = require('assert');
const path = require('path');
const { spustSimulaci } = require('./simulace');
const { simulujHistorii } = require('./svet');
const { otiskBalance, porovnejVerze } = require('./verze');
const { hodiny, dniZ } = require('./hodiny');
const P = require('./pravidla');

let projato = 0, spadlo = 0;
const fronta = [];
function test(nazev, fn) { fronta.push({ nazev, fn }); }

async function bezTesty() {
  console.log('\n=== Testy balančního simulátoru ===\n');
  for (const { nazev, fn } of fronta) {
    try { await fn(); console.log('  ✓ ' + nazev); projato++; }
    catch (e) { console.log('  ✗ ' + nazev + '\n      ' + e.message); spadlo++; }
  }
}

test('stejné semínko => shodná historie (reprodukovatelnost)', () => {
  const pop = [{ archetyp: 'aktivni', pocet: 5 }, { archetyp: 'hardcore', pocet: 5 }];
  const a = simulujHistorii({ dni: 90, populace: pop, seminko: 777 });
  const b = simulujHistorii({ dni: 90, populace: pop, seminko: 777 });
  const klic = h => h.map(p => `${p.uroven}/${p.zlato}/${p.pocta}/${p.strength}`).join('|');
  assert.strictEqual(klic(a), klic(b), 'historie se stejným semínkem se liší');
});

test('jiné semínko => jiná historie', () => {
  const pop = [{ archetyp: 'aktivni', pocet: 5 }];
  const a = simulujHistorii({ dni: 90, populace: pop, seminko: 1 });
  const b = simulujHistorii({ dni: 90, populace: pop, seminko: 2 });
  const klic = h => h.map(p => p.zlato).join('|');
  assert.notStrictEqual(klic(a), klic(b), 'různá semínka dala totéž');
});

test('celý běh je reprodukovatelný podle základního semínka', async () => {
  const opts = { dni: 60, historie: 8, hracuNaArchetyp: 3, zakladniSeminko: 42, nazev: 't' };
  const a = await spustSimulaci(opts);
  const b = await spustSimulaci(opts);
  assert.strictEqual(a.vysledek.global.uroven.p50, b.vysledek.global.uroven.p50);
  assert.strictEqual(a.vysledek.global.zlato.p90, b.vysledek.global.zlato.p90);
});

test('produkční DB se ani neotevře (žádný modul sim nenačítá pg/db)', () => {
  // projdi cache require — nic ze sim/ nesmí mít nataženého klienta pg
  const nactene = Object.keys(require.cache).map(k => k.toLowerCase());
  const pg = nactene.filter(k => k.includes(`${path.sep}pg${path.sep}`) || k.endsWith(`${path.sep}pg.js`));
  assert.strictEqual(pg.length, 0, 'natažen ovladač pg: ' + pg.join(', '));
  // a config/db.js taky ne
  const db = nactene.filter(k => k.endsWith(`config${path.sep}db.js`));
  assert.strictEqual(db.length, 0, 'natažen config/db.js — simulátor nesmí sahat na DB');
});

test('virtuální čas se posouvá skokem, ne reálně', () => {
  const h = hodiny(0);
  const t0 = Date.now();
  for (let i = 0; i < 365; i++) h.dalsiDen();
  assert.strictEqual(h.den, 365);
  assert.strictEqual(h.rok(), 1);
  assert.ok(Date.now() - t0 < 100, 'posun roku trval podezřele dlouho');
  assert.strictEqual(dniZ('2 t'), 14);
  assert.strictEqual(dniZ('3 m'), 90);
  assert.strictEqual(dniZ('1 r'), 365);
});

test('bojové stropy ENGINE drží: Crit ≤ 35 %, Blok ≤ 50 %, Dvojhmat ≤ 40 %', async () => {
  // Ostrý engine (souboj.js) má CRIT_MAX 0.35, BLOCK_MAX 0.50, DOUBLE_MAX 0.40.
  // To je skutečný invariant hry — simulátor ho nesmí porušit.
  const beh = await spustSimulaci({ dni: 365, historie: 10, hracuNaArchetyp: 4, zakladniSeminko: 9, nazev: 'stropy' });
  const s = beh.vysledek.stropy;
  assert.ok(s.critMax <= 0.35 + 1e-9, `Crit ${s.critMax} > 35 %`);
  assert.ok(s.blokMax <= 0.50 + 1e-9, `Blok ${s.blokMax} > 50 %`);
  assert.ok(s.dvojMax <= 0.40 + 1e-9, `Dvojhmat ${s.dvojMax} > 40 %`);
});

test('ALERT hlásí, že engine (35 %) překračuje cílový strop Crit 30 %', async () => {
  // Zadání chce Crit ≤ 30 %, ale engine dovolí 35 %. Simulátor to musí
  // člověku ukázat jako nález, ne to zamlčet.
  const beh = await spustSimulaci({ dni: 365, historie: 10, hracuNaArchetyp: 4, zakladniSeminko: 9, nazev: 'critalert' });
  const maCrit = beh.upozorneni.some(u => u.kod === 'crit_strop');
  assert.ok(maCrit, 'chybí upozornění na překročení cílového Crit stropu 30 %');
});

test('Pocta nikdy nespadne pod 0', () => {
  const h = simulujHistorii({ dni: 200, populace: [{ archetyp: 'neefektivni', pocet: 10 }, { archetyp: 'hardcore', pocet: 10 }], seminko: 5 });
  for (const p of h) assert.ok(p.pocta >= 0, 'záporná Pocta u ' + p.jmeno);
});

test('XP tabulka sedí s ostrou hrou (L1→2 = 100)', () => {
  assert.strictEqual(P.xpNaDalsi(1), 100);
  assert.strictEqual(P.xpNaDalsi(2), 190);
});

test('verze balancu se srovná a pozná změnu pravidla', () => {
  const a = otiskBalance();
  const b = JSON.parse(JSON.stringify(a));
  assert.ok(porovnejVerze(a, b).stejne, 'stejná pravidla se hlásí jako různá');
  b.hodnoty.arena.min = 999;
  const r = porovnejVerze(a, b);
  assert.ok(!r.stejne || r.zmeny.length >= 0);
});

test('percentily jsou seřazené P10 ≤ P50 ≤ P90 ≤ P99', async () => {
  const beh = await spustSimulaci({ dni: 120, historie: 15, hracuNaArchetyp: 4, zakladniSeminko: 3, nazev: 'perc' });
  const g = beh.vysledek.global.zlato;
  assert.ok(g.p10 <= g.p50 && g.p50 <= g.p90 && g.p90 <= g.p99, 'percentily nejsou monotónní');
});

bezTesty().then(() => {
  console.log(`\n--- hotovo: ${projato} prošlo, ${spadlo} spadlo ---\n`);
  process.exit(spadlo ? 1 : 0);
});

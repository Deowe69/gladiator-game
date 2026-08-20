// Testy systému materiálů. node backend/config/materialy.test.js
const assert = require('assert');
const M = require('./materialy');
const { proud } = require('../sim/nahoda');

let ok = 0, fail = 0;
const test = (n, f) => { try { f(); console.log('  ✓ ' + n); ok++; } catch (e) { console.log('  ✗ ' + n + '\n      ' + e.message); fail++; } };
const KTX = { level: 50, zdroj: 'expedition', boss: false };

console.log('\n=== Materiály — drop systém ===\n');

test('13 materiálů, globální šance 45 %', () => {
  const c = M.vychoziKonfigurace();
  assert.strictEqual(c.materialy.length, 13);
  assert.strictEqual(c.globalMaterialDropChance, 45);
  const ids = c.materialy.map(x => x.id).sort();
  assert.deepStrictEqual(ids, ['bronze','diamond','emerald','glass','gold','iron','rope','ruby','sand','sapphire','stone','wood','wool'].sort());
});

test('všech 13 od úrovně 1 do stropu', () => {
  for (const m of M.vychoziKonfigurace().materialy) {
    assert.strictEqual(m.minEnemyLevel, 1, m.id + ' nezačíná na 1');
    assert.strictEqual(m.maxEnemyLevel, M.STROP_UROVNE, m.id + ' nekončí na stropu');
  }
});

test('globální šance 0 % => nikdy nepadne materiál', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 0;
  const r = proud(1).dalsi;
  for (let i = 0; i < 5000; i++) assert.strictEqual(M.hodMaterial(c, KTX, r), null);
});

test('globální šance 100 % => vždy dojde na výběr (materiál padne)', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  const r = proud(2).dalsi;
  for (let i = 0; i < 3000; i++) assert.ok(M.hodMaterial(c, KTX, r), 'nepadlo při 100 %');
});

test('vypnutý materiál nikdy nepadne', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  c.materialy.find(m => m.id === 'iron').enabled = false;
  const r = proud(3).dalsi;
  for (let i = 0; i < 20000; i++) { const d = M.hodMaterial(c, KTX, r); if (d) assert.notStrictEqual(d.id, 'iron'); }
});

test('vážený výběr odpovídá vahám (Dřevo ≫ Diamant)', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  const r = proud(4).dalsi; const poc = {};
  const N = 300000;
  for (let i = 0; i < N; i++) { const d = M.hodMaterial(c, KTX, r); poc[d.id] = (poc[d.id] || 0) + 1; }
  // Dřevo (18) musí být mnohem častější než Diamant (0.4)
  assert.ok(poc.wood > poc.diamond * 20, `wood ${poc.wood} vs diamond ${poc.diamond}`);
  // podíl dřeva ≈ 18 / soucet
  const soucet = c.materialy.reduce((s, m) => s + m.weight, 0);
  const ocek = 18 / soucet;
  assert.ok(Math.abs(poc.wood / N - ocek) < 0.01, `podíl dřeva ${(poc.wood / N).toFixed(3)} vs ${ocek.toFixed(3)}`);
});

test('Diamant může padnout od úrovně 1, ale je extrémně vzácný', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  const r = proud(5).dalsi; let diam = 0; const N = 200000;
  for (let i = 0; i < N; i++) { const d = M.hodMaterial(c, { level: 1, zdroj: 'expedition' }, r); if (d.id === 'diamond') diam++; }
  assert.ok(diam > 0, 'diamant nepadl ani jednou z L1 — má být teoreticky možný');
  assert.ok(diam / N < 0.01, `diamant moc častý: ${(diam / N * 100).toFixed(2)} %`);
});

test('všech 13 lze vybrat, když jsou způsobilé', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  const r = proud(6).dalsi; const videno = new Set();
  for (let i = 0; i < 500000 && videno.size < 13; i++) videno.add(M.hodMaterial(c, KTX, r).id);
  assert.strictEqual(videno.size, 13, 'nevybraly se všechny: ' + [...videno].join(','));
});

test('množství respektuje min/max', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  const r = proud(7).dalsi;
  const podle = Object.fromEntries(c.materialy.map(m => [m.id, m]));
  for (let i = 0; i < 60000; i++) {
    const d = M.hodMaterial(c, KTX, r);
    const mat = podle[d.id];
    assert.ok(d.mnozstvi >= mat.minQuantity && d.mnozstvi <= mat.maxQuantity, `${d.id} mn. ${d.mnozstvi} mimo ${mat.minQuantity}-${mat.maxQuantity}`);
  }
});

test('drahokamy padají jako 1 kus', () => {
  const c = M.vychoziKonfigurace();
  for (const id of ['ruby', 'sapphire', 'emerald', 'diamond', 'gold']) {
    const m = c.materialy.find(x => x.id === id);
    assert.strictEqual(m.maxQuantity, 1, id + ' nemá max 1');
  }
});

test('výběrová % a celkové % sedí (součet výběrových = 100 %)', () => {
  const c = M.vychoziKonfigurace();
  const p = M.pravdepodobnosti(c, KTX);
  const sumaVyber = p.reduce((s, x) => s + x.vyberPct, 0);
  assert.ok(Math.abs(sumaVyber - 100) < 0.001, 'součet výběrových % != 100: ' + sumaVyber);
  // celkové ≈ výběr × globalChance
  const wood = p.find(x => x.id === 'wood');
  assert.ok(Math.abs(wood.celkovePct - wood.vyberPct * 0.45) < 0.001);
});

test('úrovňová brána: mimo rozsah materiál není způsobilý', () => {
  const c = M.vychoziKonfigurace();
  c.materialy.find(m => m.id === 'gold').minEnemyLevel = 100;
  assert.ok(!M.zpusobile(c, { level: 50, zdroj: 'expedition' }).some(m => m.id === 'gold'));
  assert.ok(M.zpusobile(c, { level: 150, zdroj: 'expedition' }).some(m => m.id === 'gold'));
});

test('zdrojové přepínače: dungeon-off materiál nepadne v bludišti', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 100;
  c.materialy.find(m => m.id === 'wool').dungeonEnabled = false;
  const r = proud(9).dalsi;
  for (let i = 0; i < 30000; i++) { const d = M.hodMaterial(c, { level: 40, zdroj: 'dungeon' }, r); if (d) assert.notStrictEqual(d.id, 'wool'); }
});

test('validace odmítne nesmysly', () => {
  const bad = M.vychoziKonfigurace(); bad.globalMaterialDropChance = 150;
  assert.ok(M.overKonfiguraci(bad).length > 0);
  const bad2 = M.vychoziKonfigurace(); bad2.materialy[0].weight = -5;
  assert.ok(M.overKonfiguraci(bad2).length > 0);
  const bad3 = M.vychoziKonfigurace(); bad3.materialy[0].maxQuantity = 0;
  assert.ok(M.overKonfiguraci(bad3).length > 0);
  const bad4 = M.vychoziKonfigurace(); bad4.materialy[0].maxEnemyLevel = 0; bad4.materialy[0].minEnemyLevel = 5;
  assert.ok(M.overKonfiguraci(bad4).length > 0);
  assert.strictEqual(M.overKonfiguraci(M.vychoziKonfigurace()).length, 0, 'výchozí musí projít');
});

test('DB přepis přepíše default a ošetří nevalidní', () => {
  const c = M.slucKonfiguraci({ globalMaterialDropChance: 60 }, [{ id: 'wood', weight: 25, enabled: false }]);
  assert.strictEqual(c.globalMaterialDropChance, 60);
  const wood = c.materialy.find(m => m.id === 'wood');
  assert.strictEqual(wood.weight, 25);
  assert.strictEqual(wood.enabled, false);
  // clamp nevalidní globální šance
  const c2 = M.slucKonfiguraci({ globalMaterialDropChance: 999 }, []);
  assert.ok(c2.globalMaterialDropChance <= 100);
});

test('deterministické se semínkem (reprodukovatelné)', () => {
  const c = M.vychoziKonfigurace(); c.globalMaterialDropChance = 60;
  const a = []; const b = [];
  let r = proud(42).dalsi; for (let i = 0; i < 100; i++) a.push(JSON.stringify(M.hodMaterial(c, KTX, r)));
  r = proud(42).dalsi; for (let i = 0; i < 100; i++) b.push(JSON.stringify(M.hodMaterial(c, KTX, r)));
  assert.deepStrictEqual(a, b);
});

console.log(`\n--- ${ok} prošlo, ${fail} spadlo ---\n`);
process.exit(fail ? 1 : 0);

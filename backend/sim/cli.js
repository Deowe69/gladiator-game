// Spuštění simulátoru z příkazové řádky — pro vývojáře.
//   node backend/sim/cli.js [rychly|standardni|hloubkovy] [seminko]
//
// Nic neukládá do DB. Vypíše souhrn a nabídne JSON/CSV do složky
// backend/sim/vysledky/ (mimo živá data).

const fs = require('fs');
const path = require('path');
const { spustSimulaci } = require('./simulace');
const { PRESETY } = require('./presety');
const { analyzuj } = require('./analyza');
const { doJson, doCsv } = require('./export');

function tabulka(archetypy) {
  const hlava = ['archetyp', 'úroveň P50', 'zlato P50', 'Pocta P50', 'staty P50', 'winrate', 'PvP win'];
  const sirky = [22, 10, 12, 10, 10, 8, 8];
  const radek = c => c.map((x, i) => String(x).padEnd(sirky[i])).join('');
  const out = [radek(hlava), radek(sirky.map(w => '-'.repeat(w - 1)))];
  for (const [id, a] of Object.entries(archetypy)) {
    out.push(radek([
      id,
      a.uroven.p50.toFixed(0),
      a.zlato.p50.toFixed(0),
      a.pocta.p50.toFixed(0),
      a.statySoucet.p50.toFixed(0),
      (a.winrate.p50 * 100).toFixed(0) + '%',
      (a.pvpWin.p50 * 100).toFixed(0) + '%',
    ]));
  }
  return out.join('\n');
}

async function main() {
  const presetJmeno = process.argv[2] || 'rychly';
  const preset = PRESETY[presetJmeno] || PRESETY.rychly;
  const seminko = process.argv[3] ? parseInt(process.argv[3], 10) >>> 0 : 12345;

  console.log(`\n=== OLYMPUS — Balanční simulátor ===`);
  console.log(`Preset: ${preset.nazev} — ${preset.popis}`);
  console.log(`Dní: ${preset.dni} · Historií: ${preset.historie} · Hráčů/archetyp: ${preset.hracuNaArchetyp} · Semínko: ${seminko}\n`);

  let posl = 0;
  const beh = await spustSimulaci({
    dni: preset.dni,
    historie: preset.historie,
    hracuNaArchetyp: preset.hracuNaArchetyp,
    zakladniSeminko: seminko,
    nazev: `cli-${presetJmeno}`,
    onProgress: ({ hotovo, celkem }) => {
      const pct = Math.floor((hotovo / celkem) * 100);
      if (pct >= posl + 20) { posl = pct; process.stdout.write(`  …${pct}%\n`); }
    },
  });

  console.log(`\nHotovo za ${beh.meta.trvaniMs} ms · balanční verze ${beh.meta.balancVerze} · ${beh.meta.pocetPostavCelkem} postav · herní doba ${beh.meta.hernidoba}\n`);
  console.log(tabulka(beh.vysledek.archetypy));

  console.log(`\n--- Bojové stropy (kontrola) ---`);
  const s = beh.vysledek.stropy;
  console.log(`  Krit max ${(s.critMax * 100).toFixed(1)} %  ·  Blok max ${(s.blokMax * 100).toFixed(1)} %  ·  Dvojhmat max ${(s.dvojMax * 100).toFixed(1)} %`);

  console.log(`\n--- Upozornění (${beh.upozorneni.length}) ---`);
  if (!beh.upozorneni.length) console.log('  žádné');
  for (const u of beh.upozorneni) console.log(`  [${u.zavaznost}] ${u.zprava}`);

  const a = analyzuj(beh);
  console.log(`\n--- Analýza (poradní) ---`);
  console.log(`  ${a.upozorneni}`);
  console.log('  POZOROVÁNÍ:'); a.pozorovani.forEach(x => console.log('   • ' + x));
  console.log('  ÚVAHY:');      a.uvahy.forEach(x => console.log('   • ' + x));
  console.log('  DOPORUČENÍ:');  a.doporuceni.forEach(x => console.log('   • ' + x));

  // export
  const dir = path.join(__dirname, 'vysledky');
  fs.mkdirSync(dir, { recursive: true });
  const zaklad = path.join(dir, `${presetJmeno}-${seminko}`);
  fs.writeFileSync(zaklad + '.json', doJson(beh), 'utf8');
  fs.writeFileSync(zaklad + '.csv', doCsv(beh), 'utf8');
  console.log(`\nExport: ${zaklad}.json  +  .csv\n`);
}

main().catch(e => { console.error(e); process.exit(1); });

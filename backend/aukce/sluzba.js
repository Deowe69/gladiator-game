// Služba Aukční síně: generuje systémové aukce a zametá prošlé.
//
// • Generování: drží kolem `cil_aktivnich` aktivních aukcí, doplňuje po
//   `generace_interval_s`. Předměty bere z centrálního generátoru
//   (config/predmety, zdroj 'aukce' = mírně lepší průměrný rozpočet).
// • Zametání: prošlé aukce (konci ≤ NOW) uzavře — výherci vytvoří doručení,
//   bez přihozu je označí jako expirované. Běží i hned po startu, takže
//   restart serveru nic nerozbije (autoritativní čas konce zůstává v DB).
//
// Vše přes transakce a zámky řádků, aby souběh (přihoz vs. expirace vs.
// Buy Now) skončil vždy jedním autoritativním stavem.

const pool = require('../config/db');
const predmety = require('../config/predmety');
const aukce = require('../config/aukce');
const { nactiNastaveni } = require('./nastaveni');

let bezi = false;

function nahodneCele(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

// Vyrobí a vloží jednu novou aukci.
async function generujJednu(n) {
  const uroven = nahodneCele(Math.max(1, n.uroven_min), Math.min(n.strop_urovne, n.uroven_max));
  const slot = predmety.SLOTY[Math.floor(Math.random() * predmety.SLOTY.length)];
  const predmet = predmety.generujPredmet({ uroven, slot, zdroj: 'aukce', config: n });

  const startZlato = aukce.startovniZlato(predmet, n);
  const maBuyNow = Math.random() < (n.buynow_dostupnost ?? 1);
  const buyNow = maBuyNow ? aukce.buyNowSmaragdy(predmet, n) : null;

  await pool.query(
    `INSERT INTO aukce (predmet, uroven, slot, stav, start_zlato, buynow_smaragdy, zdroj, konci)
     VALUES ($1,$2,$3,'ACTIVE',$4,$5,'aukce', NOW() + ($6 || ' seconds')::interval)`,
    [JSON.stringify(predmet), uroven, slot, startZlato, buyNow, n.trvani_s]
  );
}

// Doplní aukce na cílový počet (po malých dávkách).
async function doplnAukce() {
  const n = await nactiNastaveni();
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM aukce WHERE stav = 'ACTIVE'`);
  const aktivnich = rows[0].c;
  const chybi = Math.max(0, (n.cil_aktivnich | 0) - aktivnich);
  const kolik = Math.min(chybi, n.generace_max_davka | 0 || 10);
  for (let i = 0; i < kolik; i++) {
    try { await generujJednu(n); } catch (e) { console.error('Generace aukce:', e.message); }
  }
  return kolik;
}

// Uzavře jednu prošlou aukci atomicky.
async function uzavriJednu(id) {
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows } = await klient.query(
      `SELECT id, stav, vitez_id, predmet, konci <= NOW() AS proslo
         FROM aukce WHERE id = $1 FOR UPDATE`, [id]
    );
    const a = rows[0];
    if (!a || a.stav !== 'ACTIVE' || !a.proslo) { await klient.query('ROLLBACK'); return; }

    if (a.vitez_id) {
      // výherce přihozu — zlato už bylo strženo při přihozu, teď jen doručíme
      await klient.query(
        `UPDATE aukce SET stav = 'COMPLETED_BY_BID', dokonceno = NOW() WHERE id = $1`, [id]
      );
      await klient.query(
        `INSERT INTO aukce_doruceni (aukce_id, character_id, predmet, zpusob)
         VALUES ($1, $2, $3, 'bid') ON CONFLICT (aukce_id) DO NOTHING`,
        [id, a.vitez_id, a.predmet]
      );
    } else {
      await klient.query(
        `UPDATE aukce SET stav = 'EXPIRED_WITHOUT_BID', dokonceno = NOW() WHERE id = $1`, [id]
      );
    }
    await klient.query('COMMIT');
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('Uzavření aukce', id, e.message);
  } finally {
    klient.release();
  }
}

// Najde prošlé aktivní aukce a zavře je.
async function zametej() {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM aukce WHERE stav = 'ACTIVE' AND konci <= NOW() LIMIT 500`
    );
    for (const r of rows) await uzavriJednu(r.id);
    return rows.length;
  } catch (e) {
    console.error('Zametání aukcí:', e.message);
    return 0;
  }
}

// Spuštění po startu serveru: obnova (zamést prošlé) + první doplnění, pak
// pravidelně. Interval bere z nastavení, ale kontroluje aspoň po minutě.
async function spustAukcniSluzbu() {
  if (bezi) return;
  bezi = true;
  await zametej();
  await doplnAukce();

  const n = await nactiNastaveni();
  const intervalMs = Math.max(60, n.generace_interval_s | 0 || 300) * 1000;
  // zametání častěji než generování, ať expirace nevisí dlouho
  setInterval(() => { zametej().catch(() => {}); }, 30 * 1000);
  setInterval(() => { doplnAukce().catch(() => {}); }, intervalMs);
  console.log(`✅ Aukční síň: služba běží (interval generace ${intervalMs / 1000}s)`);
}

module.exports = { spustAukcniSluzbu, doplnAukce, zametej, uzavriJednu, generujJednu };

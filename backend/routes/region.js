// ==========================================================================
//  CESTOVATEL — cestování mezi regiony (server-authoritative)
// ==========================================================================
// Aktivní region určuje, jaký obsah se hráči ukazuje. Cestování je obousměrné
// (do libovolného ODEMČENÉHO regionu a zpět) a NIC nemaže — postava, inventář,
// pomocníci, měny ani globální postup se nedotknou; mění se jen aktivní region.
//
// Odemčení řídí ÚROVEŇ postavy (z DB, ne z klienta). Klient nemůže podvrhnout
// úroveň ani seznam odemčených regionů. Přepnutí regionu nedává žádnou odměnu,
// takže rychlé přepínání nejde zneužít k duplikaci denních/globálních odměn.

const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce } = require('../middleware/admin');
const R = require('../config/regiony');

const router = express.Router();

let cache = null, cacheDo = 0;
async function nactiNastaveni() {
  if (cache && Date.now() < cacheDo) return cache;
  const out = { ...R.VYCHOZI };
  try {
    const { rows } = await pool.query('SELECT klic, hodnota FROM region_config');
    for (const r of rows) out[r.klic] = Number(r.hodnota);
  } catch { /* před initDB */ }
  cache = out; cacheDo = Date.now() + 30000;
  return out;
}

// Stav: aktuální region + všechny regiony s tím, jestli jsou odemčené a proč
// ne. Úroveň bere ze serveru.
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const n = await nactiNastaveni();
    const { rows } = await pool.query(
      'SELECT level, aktivni_region FROM characters WHERE user_id = $1', [req.user.id]
    );
    const c = rows[0];
    if (!c) return res.status(404).json({ error: 'Postava nenalezena' });

    let aktivni = c.aktivni_region || R.VYCHOZI_REGION;
    if (!R.regionById(aktivni, n)) aktivni = R.VYCHOZI_REGION;

    const seznam = R.regiony(n).map(r => ({
      id: r.id, nazev: r.nazev, popis: r.popis, tema: r.tema, mode: r.mode,
      odUrovne: r.odUrovne, hotovo: r.hotovo,
      odemceno: R.odemcen(r.id, c.level, n),
      aktivni: r.id === aktivni,
    }));

    res.json({ ja: { uroven: c.level }, aktivniRegion: aktivni, regiony: seznam });
  } catch (e) {
    console.error('region/state', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

// Cestování. Tělo: { region }. Ověří odemčení dle úrovně a nastaví aktivní
// region atomicky. Žádná odměna, takže přepínání nejde zneužít.
router.post('/travel', authenticateToken, async (req, res) => {
  const cil = String((req.body && req.body.region) || '');
  const klient = await pool.connect();
  try {
    await klient.query('BEGIN');
    const { rows } = await klient.query(
      'SELECT id, level, aktivni_region FROM characters WHERE user_id = $1 FOR UPDATE', [req.user.id]
    );
    const c = rows[0];
    if (!c) { await klient.query('ROLLBACK'); return res.status(404).json({ error: 'Postava nenalezena' }); }

    const n = await nactiNastaveni();
    const r = R.regionById(cil, n);
    if (!r) { await klient.query('ROLLBACK'); return res.status(400).json({ error: 'Takový region neznáme' }); }
    if (!R.odemcen(cil, c.level, n)) {
      await klient.query('ROLLBACK');
      return res.status(403).json({ error: `Region se odemkne na úrovni ${r.odUrovne}. Jsi na ${c.level}.`, odUrovne: r.odUrovne });
    }

    // idempotentní: cesta do stejného regionu jen potvrdí stav
    if (c.aktivni_region === cil) { await klient.query('COMMIT'); return res.json({ ok: true, aktivniRegion: cil, jizTam: true }); }

    await klient.query('UPDATE characters SET aktivni_region = $1 WHERE id = $2', [cil, c.id]);
    await klient.query('COMMIT');
    res.json({ ok: true, aktivniRegion: cil, mode: r.mode });
  } catch (e) {
    await klient.query('ROLLBACK').catch(() => {});
    console.error('region/travel', e);
    res.status(500).json({ error: 'Chyba serveru' });
  } finally {
    klient.release();
  }
});

// Správa: úrovňové brány regionů.
router.get('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  res.json({ config: await nactiNastaveni(), vychozi: R.VYCHOZI });
});
router.put('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const zmeny = (req.body && req.body.config) || {};
    const ulozene = {};
    for (const [klic, hodnota] of Object.entries(zmeny)) {
      if (!(klic in R.VYCHOZI)) continue;
      const cislo = Number(hodnota);
      if (!Number.isFinite(cislo)) continue;
      await pool.query(
        `INSERT INTO region_config (klic, hodnota) VALUES ($1,$2)
         ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`, [klic, cislo]
      );
      ulozene[klic] = cislo;
    }
    cache = null;
    res.json({ message: 'Uloženo', ulozene, config: await nactiNastaveni() });
  } catch (e) {
    console.error('region/config PUT', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

module.exports = router;

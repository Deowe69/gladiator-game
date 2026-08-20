// Balanční simulátor — API jen pro správce. Vše běží v paměti, nikdy se
// nesahá na produkční data hráčů. Slouží vývojáři k ladění ekonomiky.

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce } = require('../middleware/admin');
const { novaUloha, zrus, seznam, detail, PRESETY } = require('../sim/ulohy');
const { ARCHETYPY } = require('../sim/archetypy');
const { analyzuj } = require('../sim/analyza');
const { otiskBalance } = require('../sim/verze');
const { doCsv } = require('../sim/export');
const { porovnejVerze } = require('../sim/verze');

const router = express.Router();
router.use(authenticateToken, pouzeSpravce);   // vše jen pro adminy

// číselník: archetypy, presety, aktuální balanční verze
router.get('/meta', (req, res) => {
  res.json({
    archetypy: ARCHETYPY.map(a => ({
      id: a.id, nazev: a.nazev, popis: a.popis,
      existuje: a.existuje !== false, cilovySystem: a.cilovySystem || null,
    })),
    presety: Object.entries(PRESETY).map(([k, v]) => ({ id: k, ...v })),
    balanc: otiskBalance(),
  });
});

// spustit běh (na pozadí). Tělo: { preset } nebo { dni, historie, hracuNaArchetyp, populace, zakladniSeminko, nazev, prahy }
router.post('/beh', (req, res) => {
  const b = req.body || {};
  let nast;
  if (b.preset && PRESETY[b.preset]) {
    const p = PRESETY[b.preset];
    nast = { dni: p.dni, historie: p.historie, hracuNaArchetyp: p.hracuNaArchetyp };
  } else {
    nast = {
      dni: Math.min(3650, Math.max(1, +b.dni || 180)),
      historie: Math.min(500, Math.max(1, +b.historie || 60)),
      hracuNaArchetyp: Math.min(50, Math.max(1, +b.hracuNaArchetyp || 5)),
    };
  }
  if (Array.isArray(b.populace) && b.populace.length) nast.populace = b.populace;
  if (b.prahy && typeof b.prahy === 'object') nast.prahy = b.prahy;
  nast.zakladniSeminko = (+b.zakladniSeminko >>> 0) || (Date.now() >>> 0);
  nast.nazev = String(b.nazev || `beh-${Date.now()}`).slice(0, 60);

  res.json(novaUloha(nast, req.user?.username || 'admin'));
});

router.get('/beh', (req, res) => res.json(seznam()));

router.get('/beh/:id', (req, res) => {
  const d = detail(req.params.id);
  if (!d) return res.status(404).json({ error: 'Úloha nenalezena' });
  res.json(d);
});

// analýza dokončeného běhu (poradní, nic nemění)
router.get('/beh/:id/analyza', (req, res) => {
  const d = detail(req.params.id);
  if (!d || !d.vysledek) return res.status(404).json({ error: 'Výsledek není hotový' });
  res.json(analyzuj(d.vysledek));
});

// export JSON / CSV
router.get('/beh/:id/export.json', (req, res) => {
  const d = detail(req.params.id);
  if (!d || !d.vysledek) return res.status(404).json({ error: 'Výsledek není hotový' });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${d.id}.json"`);
  res.send(JSON.stringify(d.vysledek, null, 2));
});
router.get('/beh/:id/export.csv', (req, res) => {
  const d = detail(req.params.id);
  if (!d || !d.vysledek) return res.status(404).json({ error: 'Výsledek není hotový' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${d.id}.csv"`);
  res.send(doCsv(d.vysledek));
});

// srovnání dvou běhů (regrese): shodná balanční verze? co se v pravidlech změnilo?
router.get('/porovnat/:a/:b', (req, res) => {
  const a = detail(req.params.a), b = detail(req.params.b);
  if (!a?.vysledek || !b?.vysledek) return res.status(404).json({ error: 'Oba běhy musí být hotové' });
  const verze = porovnejVerze(a.vysledek.balanc, b.vysledek.balanc);
  const klice = ['uroven', 'zlato', 'pocta', 'statySoucet', 'winrate'];
  const rozdil = {};
  for (const k of klice) {
    const va = a.vysledek.vysledek.global[k].p50, vb = b.vysledek.vysledek.global[k].p50;
    rozdil[k] = { a: va, b: vb, zmena: vb - va };
  }
  res.json({ verze, rozdilP50: rozdil, a: a.meta, b: b.meta });
});

// zrušit běžící/čekající úlohu
router.post('/beh/:id/zrusit', (req, res) => {
  const z = zrus(req.params.id);
  if (!z) return res.status(404).json({ error: 'Úloha nenalezena' });
  res.json(z);
});

module.exports = router;

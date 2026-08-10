const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce, zapisAkci } = require('../middleware/admin');

const router = express.Router();

// Sloupce, které smí správce měnit. Cokoliv mimo tenhle seznam se
// z požadavku zahodí — id předmětu se přepsat nedá.
const PREDMET_POLE = [
  'nazev', 'skupina', 'ikona', 'kvalita', 'klic_vlastnosti', 'hodnota',
  'cena', 'poskozeni_od', 'poskozeni_do', 'popis_statu', 'povoleno',
];
const NEPRITEL_POLE = [
  'jmeno', 'obrazek', 'lokace', 'lokace_nazev', 'uroven_lokace', 'poradi', 'povoleno',
];

const KVALITY = ['common', 'uncommon', 'rare', 'epic'];

// Postaví SET část dotazu jen ze známých sloupců.
function sestavZmeny(telo, povolena) {
  const sql = [], params = [], zmeny = {};
  for (const klic of povolena) {
    if (!(klic in (telo || {}))) continue;
    let v = telo[klic];

    if (klic === 'povoleno') v = !!v;
    else if (klic === 'kvalita') { if (!KVALITY.includes(v)) continue; }
    else if (['hodnota', 'cena', 'poskozeni_od', 'poskozeni_do', 'uroven_lokace', 'poradi'].includes(klic)) {
      v = v === null || v === '' ? null : Math.round(Number(v));
      if (v !== null && !Number.isFinite(v)) continue;
    } else if (typeof v === 'string') {
      v = v.slice(0, 200);
    }

    params.push(v);
    sql.push(`${klic} = $${params.length}`);
    zmeny[klic] = v;
  }
  return { sql, params, zmeny };
}

// ---------------------------------------------------------------
//  PŘEDMĚTY — čtení je i pro hru, úpravy jen pro správce
// ---------------------------------------------------------------
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const vse = String(req.query.vse) === '1';
    const { rows } = await pool.query(
      `SELECT * FROM items ${vse ? '' : 'WHERE povoleno = TRUE'} ORDER BY skupina, cena, id`
    );
    res.json({ predmety: rows });
  } catch (err) {
    console.error('katalog/items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/items/:id', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows: pred } = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (!pred.length) return res.status(404).json({ error: 'Předmět nenalezen' });

    const { sql, params, zmeny } = sestavZmeny(req.body, PREDMET_POLE);
    if (!sql.length) return res.json({ message: 'Nic ke změně', zmeny: {} });

    params.push(id);
    const { rows: po } = await pool.query(
      `UPDATE items SET ${sql.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );

    await zapisAkci({
      spravceId: req.user.id, akce: 'uprava_predmetu', cil: 'item', cilId: null,
      pred: Object.fromEntries(Object.keys(zmeny).map(k => [k, pred[0][k]])),
      po: zmeny,
    });
    res.json({ message: 'Uloženo', predmet: po[0], zmeny });
  } catch (err) {
    console.error('katalog/items PUT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/items', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const id = String((req.body && req.body.id) || '').trim().slice(0, 40);
    if (!/^[a-z0-9_-]+$/i.test(id)) {
      return res.status(400).json({ error: 'ID smí obsahovat jen písmena, číslice, - a _' });
    }
    const { rows: uz } = await pool.query('SELECT 1 FROM items WHERE id = $1', [id]);
    if (uz.length) return res.status(400).json({ error: 'Předmět s tímto ID už existuje' });

    const { rows } = await pool.query(
      `INSERT INTO items (id, nazev, skupina, ikona, kvalita, klic_vlastnosti,
                          hodnota, cena, poskozeni_od, poskozeni_do, popis_statu, povoleno)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id,
       String(req.body.nazev || 'Nový předmět').slice(0, 200),
       String(req.body.skupina || 'weapons').slice(0, 40),
       req.body.ikona || null,
       KVALITY.includes(req.body.kvalita) ? req.body.kvalita : 'common',
       req.body.klic_vlastnosti || null,
       Math.round(Number(req.body.hodnota) || 0),
       Math.round(Number(req.body.cena) || 0),
       req.body.poskozeni_od === undefined ? null : Math.round(Number(req.body.poskozeni_od)),
       req.body.poskozeni_do === undefined ? null : Math.round(Number(req.body.poskozeni_do)),
       req.body.popis_statu || null,
       req.body.povoleno === undefined ? true : !!req.body.povoleno]
    );

    await zapisAkci({ spravceId: req.user.id, akce: 'novy_predmet', cil: 'item', po: { id } });
    res.json({ message: 'Předmět vytvořen', predmet: rows[0] });
  } catch (err) {
    console.error('katalog/items POST:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mazat nebudeme — předmět už může někdo mít v batohu. Vypnutí
// stačí: přestane se prodávat i padat, ale nasazený zůstane.
router.delete('/items/:id', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      'UPDATE items SET povoleno = FALSE WHERE id = $1 RETURNING id, nazev', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Předmět nenalezen' });

    await zapisAkci({ spravceId: req.user.id, akce: 'vypnuti_predmetu', cil: 'item', po: { id } });
    res.json({ message: 'Předmět vypnut (nemaže se, protože ho někdo může mít)', predmet: rows[0] });
  } catch (err) {
    console.error('katalog/items DELETE:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
//  NEPŘÁTELÉ
// ---------------------------------------------------------------
router.get('/enemies', authenticateToken, async (req, res) => {
  try {
    const vse = String(req.query.vse) === '1';
    const { rows } = await pool.query(
      `SELECT * FROM enemies ${vse ? '' : 'WHERE povoleno = TRUE'}
        ORDER BY uroven_lokace, lokace, poradi`
    );
    res.json({ nepratele: rows });
  } catch (err) {
    console.error('katalog/enemies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/enemies/:klic', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const klic = String(req.params.klic);
    const { rows: pred } = await pool.query('SELECT * FROM enemies WHERE klic = $1', [klic]);
    if (!pred.length) return res.status(404).json({ error: 'Nepřítel nenalezen' });

    const { sql, params, zmeny } = sestavZmeny(req.body, NEPRITEL_POLE);
    if (!sql.length) return res.json({ message: 'Nic ke změně', zmeny: {} });

    params.push(klic);
    const { rows: po } = await pool.query(
      `UPDATE enemies SET ${sql.join(', ')} WHERE klic = $${params.length} RETURNING *`, params
    );

    await zapisAkci({
      spravceId: req.user.id, akce: 'uprava_nepritele', cil: 'enemy',
      pred: Object.fromEntries(Object.keys(zmeny).map(k => [k, pred[0][k]])), po: zmeny,
    });
    res.json({ message: 'Uloženo', nepritel: po[0], zmeny });
  } catch (err) {
    console.error('katalog/enemies PUT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

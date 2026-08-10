const pool = require('../config/db');

/**
 * Propustí dál jen správce.
 *
 * Práva se čtou z databáze, ne z tokenu. Token nese stav z doby
 * přihlášení — odebraná práva by jinak platila až po odhlášení.
 */
async function pouzeSpravce(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1', [req.user.id]
    );
    if (!rows.length || !rows[0].is_admin) {
      return res.status(403).json({ error: 'Jen pro správce' });
    }
    next();
  } catch (err) {
    console.error('pouzeSpravce:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Zapíše, co správce udělal.
 *
 * Ukládá se stará i nová hodnota, aby šlo dohledat, kdo co změnil.
 * Selhání zápisu nesmí shodit samotnou akci — proto jen zaloguje.
 */
async function zapisAkci({ spravceId, akce, cil = null, cilId = null, pred = null, po = null }) {
  try {
    await pool.query(
      `INSERT INTO admin_logs (spravce_id, akce, cil, cil_id, hodnota_pred, hodnota_po)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [spravceId, akce, cil, cilId,
       pred === null ? null : JSON.stringify(pred),
       po === null ? null : JSON.stringify(po)]
    );
  } catch (err) {
    console.error('Zápis do admin logu selhal:', err.message);
  }
}

module.exports = { pouzeSpravce, zapisAkci };

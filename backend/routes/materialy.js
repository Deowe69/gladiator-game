// ==========================================================================
//  MATERIÁLY — API (správa konfigurace + čtení hráčova inventáře)
// ==========================================================================
// Konfigurace je JEN pro adminy (server si práva ověří). Hráč smí číst jen
// svoje suroviny. Vše se validuje na serveru; po uložení se cache zneplatní,
// takže balanc platí živě bez restartu. Každá změna jde do auditu.

const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { pouzeSpravce, zapisAkci } = require('../middleware/admin');
const M = require('../config/materialy');
const { nactiKonfiguraci, zahodCache, verzeKonfigurace } = require('../materialy/nastaveni');

const router = express.Router();

// -------------------------------------------------- HRÁČ: moje suroviny
router.get('/moje', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT materials FROM characters WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Postava nenalezena' });
    const mat = rows[0].materials || {};
    const cfg = await nactiKonfiguraci();
    const seznam = cfg.materialy.map(m => ({ id: m.id, nazev: m.nazev, en: m.en, ikona: m.ikona, pocet: mat[m.id] || 0 }));
    res.json({ materialy: seznam });
  } catch (e) { console.error('materialy/moje', e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// -------------------------------------------------- SPRÁVA: konfigurace
router.get('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  const cfg = await nactiKonfiguraci();
  res.json({
    globalMaterialDropChance: cfg.globalMaterialDropChance,
    materialy: cfg.materialy,
    pravdepodobnosti: M.pravdepodobnosti(cfg),
    verze: verzeKonfigurace(cfg),
    limity: M.LIMITY,
  });
});

// Uložení. Tělo: { globalMaterialDropChance, materialy: [{id, enabled, weight,
// minQuantity, maxQuantity, minEnemyLevel, maxEnemyLevel, normalEnemyEnabled,
// bossEnabled, dungeonEnabled, expeditionEnabled}] }
router.put('/config', authenticateToken, pouzeSpravce, async (req, res) => {
  try {
    const staraCfg = await nactiKonfiguraci();
    const b = req.body || {};

    // poskládej kandidáta z aktuální konfigurace + příchozích změn
    const kand = M.vychoziKonfigurace();
    // začni od aktuálního (živého) stavu, ne od holých defaultů
    kand.globalMaterialDropChance = staraCfg.globalMaterialDropChance;
    kand.materialy = staraCfg.materialy.map(x => ({ ...x }));

    if (b.globalMaterialDropChance != null) kand.globalMaterialDropChance = Number(b.globalMaterialDropChance);
    const podle = Object.fromEntries(kand.materialy.map(m => [m.id, m]));
    for (const zm of (b.materialy || [])) {
      const mat = podle[zm.id];
      if (!mat) continue;
      const num = (v, cur) => (v == null || !Number.isFinite(+v)) ? cur : +v;
      const bl = (v, cur) => (typeof v === 'boolean') ? v : cur;
      mat.weight = num(zm.weight, mat.weight);
      mat.minQuantity = num(zm.minQuantity, mat.minQuantity);
      mat.maxQuantity = num(zm.maxQuantity, mat.maxQuantity);
      mat.minEnemyLevel = num(zm.minEnemyLevel, mat.minEnemyLevel);
      mat.maxEnemyLevel = num(zm.maxEnemyLevel, mat.maxEnemyLevel);
      mat.enabled = bl(zm.enabled, mat.enabled);
      mat.normalEnemyEnabled = bl(zm.normalEnemyEnabled, mat.normalEnemyEnabled);
      mat.bossEnabled = bl(zm.bossEnabled, mat.bossEnabled);
      mat.dungeonEnabled = bl(zm.dungeonEnabled, mat.dungeonEnabled);
      mat.expeditionEnabled = bl(zm.expeditionEnabled, mat.expeditionEnabled);
    }

    // server-authoritative validace
    const chyby = M.overKonfiguraci(kand);
    if (chyby.length) return res.status(400).json({ error: 'Neplatná konfigurace', chyby });

    // persist: global + per-materiál
    await pool.query(
      `INSERT INTO material_global (klic, hodnota) VALUES ('global_drop_chance', $1)
       ON CONFLICT (klic) DO UPDATE SET hodnota = EXCLUDED.hodnota`,
      [kand.globalMaterialDropChance]
    );
    for (const mat of kand.materialy) {
      await pool.query(
        `INSERT INTO material_config
           (id, enabled, weight, min_qty, max_qty, min_level, max_level,
            normal_enabled, boss_enabled, dungeon_enabled, expedition_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           enabled=EXCLUDED.enabled, weight=EXCLUDED.weight,
           min_qty=EXCLUDED.min_qty, max_qty=EXCLUDED.max_qty,
           min_level=EXCLUDED.min_level, max_level=EXCLUDED.max_level,
           normal_enabled=EXCLUDED.normal_enabled, boss_enabled=EXCLUDED.boss_enabled,
           dungeon_enabled=EXCLUDED.dungeon_enabled, expedition_enabled=EXCLUDED.expedition_enabled`,
        [mat.id, mat.enabled, mat.weight, mat.minQuantity, mat.maxQuantity,
         mat.minEnemyLevel, mat.maxEnemyLevel,
         mat.normalEnemyEnabled, mat.bossEnabled, mat.dungeonEnabled, mat.expeditionEnabled]
      );
    }

    zahodCache();
    const novaCfg = await nactiKonfiguraci();
    const verzePred = verzeKonfigurace(staraCfg), verzePo = verzeKonfigurace(novaCfg);

    // audit — kdo, kdy, co (verze před/po). Bez citlivých údajů.
    await zapisAkci({
      spravceId: req.user.id, akce: 'material_config_upravena',
      cil: 'materialy', cilId: null,
      pred: { verze: verzePred, global: staraCfg.globalMaterialDropChance },
      po: { verze: verzePo, global: novaCfg.globalMaterialDropChance },
    });

    res.json({
      message: 'Uloženo (platí živě)',
      globalMaterialDropChance: novaCfg.globalMaterialDropChance,
      materialy: novaCfg.materialy,
      pravdepodobnosti: M.pravdepodobnosti(novaCfg),
      verze: verzePo,
    });
  } catch (e) {
    console.error('materialy/config PUT', e);
    res.status(500).json({ error: 'Chyba serveru' });
  }
});

module.exports = router;

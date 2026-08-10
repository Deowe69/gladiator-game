// ========== AUTH CHECK ==========
if (!API.isLoggedIn()) {
  window.location.href = 'index.html';
}

// ========== STATE ==========
let character = null;
let currentEnemy = null;
let inCombat = false;
let inventory = JSON.parse(localStorage.getItem('inv') || '[]');
let equipped  = JSON.parse(localStorage.getItem('eqp') || '{}');
let questData = null;
let activeQuestTimer = null;

const ENEMIES = [
  { name:'Spartský Voják',  icon:'⚔️', level:1,  hp:40,   maxHp:40,   str:6,  def:3,  gold:20,  exp:25  },
  { name:'Thébský Lučištník',icon:'🏹',level:2,  hp:60,   maxHp:60,   str:10, def:5,  gold:35,  exp:45  },
  { name:'Perský Nesmrtelný',icon:'🗡️',level:4,  hp:100,  maxHp:100,  str:16, def:10, gold:60,  exp:80  },
  { name:'Minotaurus',       icon:'🐂',level:6,  hp:160,  maxHp:160,  str:24, def:14, gold:100, exp:130 },
  { name:'Kyklop',           icon:'👁️',level:9,  hp:240,  maxHp:240,  str:35, def:20, gold:180, exp:220 },
  { name:'Hydra',            icon:'🐍',level:13, hp:380,  maxHp:380,  str:50, def:30, gold:320, exp:380 },
  { name:'Medúza',           icon:'🐲',level:16, hp:500,  maxHp:500,  str:65, def:40, gold:500, exp:550 },
  { name:'Titan',            icon:'⚡',level:20, hp:800,  maxHp:800,  str:90, def:60, gold:900, exp:900 },
];


const SHOP_ITEMS = {
  weapons: [
    { id:'w0', name:'Wood Sword',      icon:'🪵', stat:'2-4 poškození',   key:'strength', val:2,  dmg:[2,4],   price:25,  quality:'common' },
    { id:'w1', name:'Bronzový Meč',    icon:'🗡️', stat:'7-12 poškození',  key:'strength', val:6,  dmg:[7,12],  price:100, quality:'common' },
    { id:'w2', name:'Železné Kopí',    icon:'🔱', stat:'14-22 poškození', key:'strength', val:12, dmg:[14,22], price:220, quality:'uncommon'   },
    { id:'w3', name:'Ocelová Kosa',    icon:'⚔️', stat:'24-36 poškození', key:'strength', val:20, dmg:[24,36], price:450, quality:'rare'   },
    { id:'w4', name:'Meč Achillea',    icon:'🌟', stat:'42-62 poškození', key:'strength', val:35, dmg:[42,62], price:900, quality:'epic'   },
    { id:'w5', name:'Oštěp Artemidy', icon:'🔱', stat:'20-31 poškození', key:'strength', val:18, dmg:[20,31], price:380, quality:'rare'     },
    { id:'w6', name:'Bojová Sekera',  icon:'🪓', stat:'17-29 poškození', key:'strength', val:15, dmg:[17,29], price:290, quality:'uncommon' },
    { id:'w7', name:'Ocelový Meč',    icon:'⚔️', stat:'22-34 poškození', key:'strength', val:20, dmg:[22,34], price:430, quality:'rare'     },
  ],
  armor: [
    { id:'a1', name:'Kožená Zbroj',    icon:'🧥', stat:'+6 Obrana',  key:'defense',   val:6,  price:90,   quality:'common',   tint:'leather' },
    { id:'a2', name:'Bronzová Zbroj',  icon:'🛡️', stat:'+14 Obrana', key:'defense',   val:14, price:200,  quality:'uncommon', tint:'bronze'  },
    { id:'a3', name:'Athénin Štít',    icon:'⛨',  stat:'+25 Obrana', key:'defense',   val:25, price:480,  quality:'rare'     },
    { id:'a4', name:'Zbroj Spartana',  icon:'💠', stat:'+40 Obrana', key:'defense',   val:40, price:950,  quality:'epic'     },
    { id:'a15', name:'Štít s Vavřínem',  icon:'🛡️', stat:'zbroj', key:'defense', val:9,  price:200, quality:'uncommon' },
    { id:'a16', name:'Železný Štít',     icon:'🛡️', stat:'zbroj', key:'defense', val:6,  price:120, quality:'common'   },
    { id:'a5',  name:'Plátěná Suknice',  icon:'🥋', stat:'zbroj',  key:'defense', val:4,  price:60,   quality:'common'   },
    { id:'a6',  name:'Kožich Barbarův',  icon:'🧥', stat:'zbroj',  key:'defense', val:6,  price:110,  quality:'common'   },
    { id:'a7',  name:'Zbroj Hraničáře',  icon:'🥼', stat:'zbroj',  key:'agility', val:9,  price:210,  quality:'uncommon' },
    { id:'a13', name:'Bronzový Krunýř',  icon:'🛡️', stat:'zbroj',  key:'defense', val:11, price:260,  quality:'uncommon' },
    { id:'a8',  name:'Šupinová Zbroj',   icon:'🐉', stat:'zbroj',  key:'defense', val:15, price:410,  quality:'rare'     },
    { id:'a9',  name:'Stříbrná Zbroj',   icon:'⚪', stat:'zbroj',  key:'defense', val:18, price:520,  quality:'rare'     },
    { id:'a10', name:'Zbroj Olympu',     icon:'✨', stat:'zbroj',  key:'defense', val:24, price:820,  quality:'epic'     },
    { id:'a11', name:'Zbroj Persefony',  icon:'🔮', stat:'zbroj',  key:'intelligence', val:26, price:900, quality:'epic' },
    { id:'a12', name:'Zbroj Poseidona',  icon:'🌊', stat:'zbroj',  key:'defense', val:28, price:980,  quality:'epic'     },
  ],
  armor_extra: [
    { id:'h1', name:'Korintská Helma', icon:'⛑️', stat:'+8 Obrana',  key:'defense',   val:8,  price:150,  quality:'uncommon' },
    { id:'h2', name:'Helma Heros',     icon:'👑', stat:'+16 Obrana', key:'defense',   val:16, price:320,  quality:'rare'     },
    { id:'h3', name:'Otlučená Přilba', icon:'⛑️', stat:'zbroj', key:'defense', val:3,  price:45,  quality:'common'   },
    { id:'h4', name:'Kožená Čapka',    icon:'🧢', stat:'zbroj', key:'defense', val:5,  price:80,  quality:'common'   },
    { id:'h5', name:'Helma Poutníka',  icon:'🪖', stat:'zbroj', key:'skill',   val:8,  price:180, quality:'uncommon' },
    { id:'h6', name:'Helma Setníka',   icon:'🎖️', stat:'zbroj', key:'defense', val:13, price:340, quality:'rare'     },
    { id:'h7', name:'Helma Válečníka', icon:'⚔️', stat:'zbroj', key:'strength', val:15, price:420, quality:'rare'    },
    { id:'h8', name:'Helma Áreova',    icon:'👑', stat:'zbroj', key:'strength', val:22, price:760, quality:'epic'    },
    { id:'g1', name:'Kožené Rukavice', icon:'🥊', stat:'+5 Síla',    key:'strength',  val:5,  price:80,   quality:'common',   tint:'leather' },
    { id:'g3', name:'Bronzové Rukavice',icon:'🥊',stat:'+9 Síla',    key:'strength',  val:9,  price:170,  quality:'uncommon', tint:'bronze'  },
    { id:'g2', name:'Železné Rukavice',icon:'👊', stat:'+12 Síla',   key:'strength',  val:12, price:200,  quality:'uncommon' },
    { id:'g4', name:'Rukavice Titána', icon:'👊', stat:'+26 Síla',   key:'strength',  val:26, price:640,  quality:'epic'     },
    { id:'b1', name:'Běžné Boty',      icon:'👟', stat:'+4 Hbitost', key:'agility',   val:4,  price:70,   quality:'common',   tint:'leather' },
    { id:'b4', name:'Bronzové Holeně', icon:'🥾', stat:'+8 Hbitost', key:'agility',   val:8,  price:160,  quality:'uncommon', tint:'bronze'  },
    { id:'b2', name:'Hermovy Boty',    icon:'🥾', stat:'+10 Hbitost',key:'agility',   val:10, price:180,  quality:'rare'     },
    { id:'b5', name:'Ocelové Holeně',  icon:'🥾', stat:'+16 Hbitost',key:'agility',   val:16, price:340,  quality:'rare'     },
    { id:'b7', name:'Kožešinové Boty',  icon:'🥾', stat:'zbroj', key:'defense', val:9,  price:190, quality:'uncommon' },
    { id:'b8', name:'Boty Poutníka',    icon:'👢', stat:'zbroj', key:'agility', val:17, price:470, quality:'rare'     },
    { id:'g5', name:'Rukavice Vichru',  icon:'🧤', stat:'zbroj', key:'agility', val:19, price:520, quality:'rare'     },
    { id:'g6', name:'Rukavice Strážce', icon:'🧤', stat:'zbroj', key:'defense', val:12, price:280, quality:'uncommon' },
    { id:'b6', name:'Boty Nesmrtelných',icon:'🥾',stat:'+28 Hbitost',key:'agility',   val:28, price:720,  quality:'epic'     },
    { id:'b3', name:'Kožený Pás',      icon:'🔗', stat:'+3 Obrana',  key:'defense',   val:3,  price:60,   quality:'common',   tint:'leather' },
  ],
  // Prsteny – od obnošených po nečekané nálezy
  rings: [
    { id:'r1', name:'Otlučený Prsten',   icon:'💍', key:'agility',      val:4,  price:40,  quality:'common'   },
    { id:'r2', name:'Měděný Kroužek',    icon:'💍', key:'defense',      val:6,  price:75,  quality:'common',   tint:'bronze' },
    { id:'r3', name:'Prsten Poutníka',   icon:'💍', key:'agility',      val:9,  price:140, quality:'uncommon' },
    { id:'r4', name:'Stříbrný Prsten',   icon:'💍', key:'intelligence', val:12, price:210, quality:'uncommon' },
    { id:'r5', name:'Prsten Věštkyně',   icon:'💍', key:'intelligence', val:18, price:340, quality:'rare'     },
    { id:'r6', name:'Onyxový Prsten',    icon:'💍', key:'defense',      val:22, price:460, quality:'rare'     },
    { id:'r7', name:'Prsten Legionáře',  icon:'💍', key:'strength',     val:30, price:700, quality:'epic'     },
    { id:'r8', name:'Prsten Sudiček',    icon:'💍', key:'intelligence', val:38, price:980, quality:'epic'     },
  ],
  jewelry: [
    { id:'m1', name:'Hermův Amulet',   icon:'💍', stat:'+8 Hbitost', key:'agility',   val:8,  price:180,  quality:'uncommon' },
    { id:'m2', name:'Apollónův Prsten',icon:'💎', stat:'+10 Intel.', key:'intelligence',val:10,price:220, quality:'uncommon' },
    { id:'m4', name:'Afroditin Amulet',icon:'✨', stat:'+12 Hbitost',key:'agility',   val:12, price:280,  quality:'rare'     },
    { id:'m6', name:'Amulet Bojovníka', icon:'📿', stat:'ozdoba', key:'strength', val:16, price:440, quality:'rare' },
    { id:'m7', name:'Amulet Věštby',    icon:'📿', stat:'ozdoba', key:'intelligence', val:14, price:390, quality:'rare' },
    { id:'m5', name:'Zeusův Prsten',   icon:'⚡', stat:'+15 Síla',   key:'strength',  val:15, price:400,  quality:'rare'     },
  ],
  potions: [
    { id:'p1', name:'Malý Lektvar',    icon:'🧪', stat:'+30 HP',     key:'health',    val:30, price:25,   quality:'common'   },
    { id:'p2', name:'Střední Lektvar', icon:'⚗️', stat:'+80 HP',     key:'health',    val:80, price:60,   quality:'uncommon' },
    { id:'p3', name:'Ambrózie Bohů',   icon:'🍯', stat:'+200 HP',    key:'health',    val:200,price:150,  quality:'rare'     },
    { id:'p4', name:'Nektár Olimpu',   icon:'🥛', stat:'+300 HP',    key:'health',    val:300,price:280,  quality:'epic'     },
  ],
};

const QUESTS_DEF = [
  { id:'q1', name:'Boží zkouška',       icon:'🏛️', desc:'Prozkoumej Labyrint Minotaura.',    time:5*60,  gold:80,  exp:60,  minLevel:1  },
  { id:'q2', name:'Herkulův úkol',      icon:'🦁', desc:'Projdi Jeskyní Kyklopů.',           time:15*60, gold:200, exp:180, minLevel:3  },
  { id:'q3', name:'Achilleova pata',    icon:'⚡', desc:'Vyzvej Perské nesmrtelné.',         time:10*60, gold:150, exp:130, minLevel:5  },
  { id:'q4', name:'Zlaté rouno',        icon:'🌿', desc:'Vyprav se pro legendární poklad.',   time:20*60, gold:350, exp:300, minLevel:8  },
  { id:'q5', name:'Hněv Poseidona',     icon:'🌊', desc:'Přeplavej rozbouřené moře bohů.',   time:30*60, gold:600, exp:500, minLevel:12 },
];



const RARITY_LABELS = { common:'Běžný', uncommon:'Neobvyklý', rare:'Vzácný', epic:'Epický' };

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.isLoggedIn()) { window.location.href = 'index.html'; return; }
  try {
    const res = await API.getCharacter();
    character = res.character;

    // Kdyz se posledni postup nestihl ulozit na server, je v prohlizeci
    // novejsi stav - ten ma prednost, jinak by se hrac vratil o uroven zpet.
    const mistni = JSON.parse(localStorage.getItem('character') || 'null');
    if (mistni && mistni.name === character.name &&
        (mistni.level > character.level ||
         (mistni.level === character.level && (mistni.experience || 0) > (character.experience || 0)))) {
      console.warn('V prohlizeci je novejsi postup nez na serveru, pouzivam ten.');
      character = mistni;
      saveChar();                     // a hned ho zkusime dostat na server
    }
    questData = JSON.parse(localStorage.getItem('questData') || 'null');
    normalizeCharacter();
    updateUI();
    openView('city');
    startQuestTimer();
    loadLeaderboard();
    await nactiServerStav();
    refreshExpedUI();
    nabidniDenniOdmenu();
  } catch (err) {
    // Fallback: load from localStorage or create demo character
    const savedChar = localStorage.getItem('character');
    if (savedChar) {
      character = JSON.parse(savedChar);
      questData = JSON.parse(localStorage.getItem('questData') || 'null');
      normalizeCharacter();
      updateUI();
      openView('city');
      startQuestTimer();
      loadLeaderboard();
      nabidniDenniOdmenu();
    } else {
      // Demo character pro offline vývoj
      character = {
        id: 1,
        name: 'Témochlios',
        gender: 'male',
        class: 'Warrior',
        level: 5,
        experience: 250,
        health: 85,
        max_health: 100,
        strength: 15,
        defense: 12,
        agility: 10,
        skill: 10,
        intelligence: 8,
        gold: 500
      };
      localStorage.setItem('character', JSON.stringify(character));
      normalizeCharacter();
      updateUI();
      openView('city');
      startQuestTimer();
      loadLeaderboard();
      nabidniDenniOdmenu();
    }
  }
});

// ========== UI UPDATE ==========
function updateUI() {
  const c = character;
  const xpNeeded = xpNaDalsi(c.level);
  const hpPct = Math.max(0, (c.health / maxHP() * 100)).toFixed(1);
  const xpPct = Math.min(100, (c.experience / xpNeeded * 100)).toFixed(1);

  // Cache DOM elements to avoid repeated queries
  const els = {
    navName: document.getElementById('navName'),
    navLevel: document.getElementById('navLevel'),
    hpBar: document.getElementById('hpBar'),
    hpVal: document.getElementById('hpVal'),
    xpBar: document.getElementById('xpBar'),
    xpVal: document.getElementById('xpVal'),
    hpPct: document.getElementById('hpPct'),
    xpPct: document.getElementById('xpPct'),
    navPocta: document.getElementById('navPocta'),
    navRuby:  document.getElementById('navRuby'),
    navGold: document.getElementById('navGold'),
    charNameSm: document.getElementById('charNameSm'),
    charClassSm: document.getElementById('charClassSm'),
    charAvatarSm: document.getElementById('charAvatarSm'),
    sHealth: document.getElementById('sHealth'),
    sStr: document.getElementById('sStr'),
    sDef: document.getElementById('sDef'),
    sAgi: document.getElementById('sAgi'),
    sInt: document.getElementById('sInt'),
    dailyBtn: document.getElementById('dailyBtn'),
  };

  // Update cached elements
  if (els.navName) els.navName.textContent = c.name;
  if (els.navLevel) els.navLevel.textContent = c.level;
  if (els.hpBar) els.hpBar.style.width = hpPct + '%';
  if (els.hpVal) els.hpVal.textContent = `${c.health}/${maxHP()}`;
  if (els.xpBar) els.xpBar.style.width = xpPct + '%';
  if (els.xpVal) els.xpVal.textContent = `${c.experience}/${xpNeeded} XP`;
  // procenta vedle pruhů; přesná čísla ukáže bublina po najetí
  if (els.hpPct) els.hpPct.textContent = Math.round(hpPct) + ' %';
  if (els.xpPct) els.xpPct.textContent = Math.round(xpPct) + ' %';
  if (els.navPocta) els.navPocta.textContent = (c.pocta || 0).toLocaleString('cs-CZ');
  if (els.navRuby) els.navRuby.textContent = (c.emeralds || 0).toLocaleString('cs-CZ');

  // Mista otevrena az od urovne se prepocitavaji tady, aby se
  // objevila hned po postupu, ne az pri jine akci.
  skryjZamcenaMista();
  if (els.navGold) els.navGold.textContent = c.gold;
  if (els.charNameSm) els.charNameSm.textContent = c.name;
  if (els.charClassSm) els.charClassSm.textContent = c.class;
  if (els.charAvatarSm) els.charAvatarSm.innerHTML = avatarProUroven(c.level);
  if (els.sHealth) els.sHealth.textContent = `${c.health}/${maxHP()}`;
  if (els.sStr) els.sStr.textContent = c.strength;
  if (els.sDef) els.sDef.textContent = c.defense;
  if (els.sAgi) els.sAgi.textContent = c.agility;
  if (els.sInt) els.sInt.textContent = c.intelligence;

  // Daily button
  if (els.dailyBtn) els.dailyBtn.disabled = odmenaVybrana();
}

// ========== VIEWS ==========
let viewCache = {}; // Cache rendered views to avoid regeneration
// který folder tab patří ke které view
const TAB_OF_VIEW = { profile:0, inventory:0, city:0, stats:1, hall:2 };

let posledniPohled = 'profile';   // co je zrovna na obrazovce

function openView(view, highlight) {
  posledniPohled = view;
  // Všichni kupci sdílejí pohled 'shop', takže sám o sobě neurčuje,
  // co má v menu svítit — doplníme podle právě otevřeného krámu.
  if (!highlight && view === 'shop' && MERCHANTS[currentShop]) {
    highlight = MERCHANTS[currentShop].menu;
  }

  // zvýraznění v levém banneru
  document.querySelectorAll('.menu-btn, .sub-item').forEach(i => i.classList.remove('active'));
  const m = document.getElementById('menu-' + (highlight || view));
  if (m) m.classList.add('active');

  // folder taby nad pergamenem
  const tabs = document.querySelectorAll('.ftab');
  tabs.forEach(t => t.classList.remove('active'));
  const ti = TAB_OF_VIEW[view];
  if (ti !== undefined && tabs[ti]) tabs[ti].classList.add('active');

  const cc = document.getElementById('centerContent');
  const views = { city, arena, dungeon, quests, shop, inventory: profileView, profile: profileView,
                  guild, forge, expedition, hall, stats, training, work, premium,
                  report: fightReport, news, fights, messages, loot,
                  settings, market, auction, admin, combat,
                  ...Object.fromEntries(MISTA.map(m => [m.klic, window[m.klic]])) };
  const viewFn = views[view] || (() => `
    <div class="coming-soon">
      <div class="cs-icon">🚧</div>
      <h2>Brzy dostupné</h2>
      <p>Tato část Říma se teprve staví.</p>
    </div>`);
  cc.innerHTML = viewFn();
  viewCache[view] = true;
}

// ===== CITY =====
function city() {
  return `
  <div class="panel panel-gold">
    <div class="panel-header">🏛 Město Atény</div>
    <div class="panel-body">
      <div class="city-grid">
        <div class="city-building" onclick="openView('arena')">
          <span class="building-icon">⚔️</span>
          <div class="building-name">Aréna</div>
          <div class="building-desc">Bojuj s nepřáteli</div>
        </div>
        <div class="city-building" onclick="openView('dungeon')">
          <span class="building-icon">🏰</span>
          <div class="building-name">Dungeon</div>
          <div class="building-desc">Průzkum podzemí</div>
        </div>
        <div class="city-building" onclick="openView('quests')">
          <span class="building-icon">📜</span>
          <div class="building-name">Radnice</div>
          <div class="building-desc">Úkoly & mise</div>
        </div>
        <div class="city-building" onclick="openMerchant('blacksmith')">
          <span class="building-icon">🏪</span>
          <div class="building-name">Trh</div>
          <div class="building-desc">Nakup vybavení</div>
        </div>
        <div class="city-building" onclick="openView('inventory')">
          <span class="building-icon">🎒</span>
          <div class="building-name">Sklad</div>
          <div class="building-desc">Tvé vybavení</div>
        </div>
        <div class="city-building" onclick="openView('forge')">
          <span class="building-icon">🔨</span>
          <div class="building-name">Kovárna</div>
          <div class="building-desc">Vylepšuj zbraně</div>
        </div>
        <div class="city-building" onclick="openView('guild')">
          <span class="building-icon">🏛️</span>
          <div class="building-name">Gildy</div>
          <div class="building-desc">Připoj se ke gildu</div>
        </div>
        <div class="city-building locked">
          <span class="building-icon">⛩️</span>
          <div class="building-name">Chrám</div>
          <div class="building-desc">Lv.10+</div>
          <span class="building-badge">🔒</span>
        </div>
      </div>
    </div>
  </div>

  ${dennyOdmenaPanel()}`;
}

// ===== ARENA =====
// ========== ARÉNA: SOUBOJ S HRÁČI ==========
// Bojuje se proti otisku soupeřovy postavy ze žebříčku, ne živě —
// server neumí dva hráče spojit v jednom souboji. Soupeř o zápase
// neví a jeho výsledek se mu nikam nezapíše.

let souperi = null;        // nactene ze serveru
let souperiChyba = null;

async function nactiSoupere() {
  try {
    const data = await API.getLeaderboard();
    const vsichni = (data && data.leaderboard) || [];
    // sebe ze seznamu vyhodíme
    souperi = vsichni.filter(h => h.name !== character.name);
    souperiChyba = null;
  } catch (e) {
    souperi = [];
    souperiChyba = 'Server neodpovídá, soupeře teď nenačtu.';
  }
  if (posledniPohled === 'arena') openView('arena');
}

// Z otisku postavy udelame soupere, se kterym umi pracovat souboj.
function souperZHrace(h) {
  const lvl = h.level || 1;
  return {
    name: h.name,
    level: lvl,
    // dovednost v databazi neni, dopocitame ji z urovne stejne jako u priser
    hp:    (h.max_health || 100) + (h.defense || 0) * HP_ZA_ODOLNOST,
    maxHp: (h.max_health || 100) + (h.defense || 0) * HP_ZA_ODOLNOST,
    str:   h.strength || 5,
    def:   h.defense || 0,
    gold:  Math.round(20 + lvl * 12),
    exp:   Math.round(15 + lvl * 9),
    hrac:  true,
  };
}

function bojujSHracem(i) {
  const h = souperi && souperi[i];
  if (!h) return;
  beginFight(souperZHrace(h), 'arena');
}

function arena() {
  if (souperi === null) { nactiSoupere(); }

  const radky = (souperi || []).map((h, i) => `
    <div class="opponent-row">
      <span class="opp-rank">${i + 1}.</span>
      <div class="opp-avatar">${avatarProUroven(h.level, 'opp-img')}</div>
      <div class="opp-info">
        <div class="opp-name">${h.name}</div>
        <div class="opp-details">
          Úroveň ${h.level} · Síla ${h.strength || 0} · Odolnost ${h.defense || 0}
          · Obratnost ${h.agility || 0}
        </div>
      </div>
      <button class="opp-btn" onclick="bojujSHracem(${i})">Vyzvat</button>
    </div>`).join('');

  const obsah =
      souperi === null ? '<p class="hall-note">Načítám soupeře…</p>'
    : souperiChyba     ? `<p class="hall-note">${souperiChyba}</p>`
    : !souperi.length  ? '<p class="hall-note">Zatím tu nikdo jiný není. Aréna ožije, až přibudou další hráči.</p>'
    : `<div class="opponent-list">${radky}</div>`;

  return `
  <div class="panel">
    <div class="panel-header">Aréna Olympu</div>
    <div class="panel-body">
      <p class="hall-note">
        Vyzýváš skutečné gladiátory podle jejich vlastností ze žebříčku.
        Soupeř se souboje neúčastní živě — bojuješ proti otisku jeho postavy
        a jemu se zápas nikam nezapíše.
      </p>
      ${obsah}
      <div class="ar-foot">
        <button class="btn-green" onclick="souperi=null; openView('arena')">Načíst soupeře znovu</button>
      </div>
    </div>
  </div>

  ${combatPanelHTML()}`;
}

function quests() {
  // Mise jeste nejsou hotove.
  return lockedSoon('Mise');
}
// ===== SHOPS =====
let currentShop = null;
let shopPage = 0;      // 0 nebo 1 - ram maluje dve zalozky

const MERCHANTS = {
  blacksmith: { name:'Zbrojíř',    emoji:'🧔', menu:'shop',    desc:'Zbraně všeho druhu',       get items(){ return SHOP_ITEMS.weapons; } },
  armorer:    { name:'Platnéř',    emoji:'👨', menu:'armorer', desc:'Zbroje, boty a rukavice',  get items(){ return SHOP_ITEMS.armor.concat(SHOP_ITEMS.armor_extra || []); } },
  jeweler:    { name:'Šperkař',    emoji:'👳', menu:'jeweler', desc:'Amulety, prsteny a ozdoby',         get items(){ return SHOP_ITEMS.jewelry.concat(SHOP_ITEMS.rings || []); } },
  alchemist:  { name:'Alchymista', emoji:'🧙', menu:'alchemy', desc:'Lektvary a elixíry',       get items(){ return SHOP_ITEMS.potions; } },
};

// portrét kupce: img/merchants/<id>.png, jinak emoji
function merchantPortrait(id) {
  const m = MERCHANTS[id];
  // malované výjevy jsou uložené jako .jpg (o řád menší než PNG);
  // kdo obrázek nemá, spadne na emoji jako dřív
  return artImg(`img/merchants/${id}.jpg`, m.emoji, 'mp-img', m.name);
}

// jedno políčko se zbožím

// ========== ROZMĚRY PŘEDMĚTŮ ==========
// [šířka, výška] v políčkách. Odvozuje se ze slotu, do kterého kus patří,
// takže nový předmět dostane rozměr sám podle svého druhu.
// Rozměry drží obrázek rámu (img/ui/frame-shop.jpg), ne naopak.
const SHOP_COLS = 5;
const SHOP_ROWS = 5;
const ITEM_SIZE = {
  weapon: [1, 3],   // meče, kopí, luky – dlouhé
  shield: [2, 2],
  chest:  [2, 2],
  helmet: [1, 2],
  gloves: [1, 2],
  boots:  [1, 2],
  belt:   [2, 1],
  ring:   [1, 1],
  amulet: [1, 1],
};

function itemSize(it) {
  if (!it) return [1, 1];
  if (Array.isArray(it.size)) return it.size;          // vlastní rozměr má přednost
  const s = slotForItem(it);
  return ITEM_SIZE[s] || [1, 1];                       // lektvary a drobnosti
}

// Kolik kusů se v daném pořadí vejde na jeden pult.
//
// Napodobuje skládání, jaké dělá CSS (grid-auto-flow: dense):
// hledá první místo shora zleva, kam se kus vejde celý.
function poskladej(kusy) {
  const mrizka = Array.from({ length: SHOP_ROWS }, () => new Array(SHOP_COLS).fill(false));

  const vejdeSe = (r, s, w, h) => {
    if (r + h > SHOP_ROWS || s + w > SHOP_COLS) return false;
    for (let y = r; y < r + h; y++)
      for (let x = s; x < s + w; x++)
        if (mrizka[y][x]) return false;
    return true;
  };
  const obsad = (r, s, w, h) => {
    for (let y = r; y < r + h; y++)
      for (let x = s; x < s + w; x++) mrizka[y][x] = true;
  };

  const vesle = [];
  for (const it of kusy) {
    const [w, h] = itemSize(it);
    let umisteno = false;
    for (let r = 0; r < SHOP_ROWS && !umisteno; r++) {
      for (let s = 0; s < SHOP_COLS && !umisteno; s++) {
        if (vejdeSe(r, s, w, h)) { obsad(r, s, w, h); vesle.push(it); umisteno = true; }
      }
    }
    if (!umisteno) break;      // dál už se nic nevejde, zbytek jde na další stranu
  }
  return vesle;
}

// Pult má u všech kupců stejný rozměr, ať je nabídka jakákoliv.
const shopRows = () => SHOP_ROWS;

function goodsSlot(item, dark) {
  if (!item) return `<div class="g-slot ${dark ? 'dark' : ''} empty"></div>`;
  const q = qualityOf(item);
  const afford = character.gold >= item.price;
  const [w, h] = itemSize(item);
  return `
    <div class="g-slot ${dark ? 'dark' : ''} ${afford ? '' : 'poor'}"
         style="grid-column:span ${w};grid-row:span ${h}"
         onclick="buyItem('${item.uid}')"
         data-tip="shop:${item.uid}">
      <span class="g-lvl" style="color:${q.color}">${item.lvl || 1}</span>
      ${itemIcon(item, 'g-ico')}
    </div>`;
}

// Políčka jsou namalovaná v rámu, žádnou podkladovou mřížku
// už nekreslíme — jen na ně posadíme zboží.
function latticeHTML() { return ''; }

// odpočet do nového zboží (4h cyklus)
function restockLeft() {
  const PERIOD = 4 * 60 * 60 * 1000;
  let next = +localStorage.getItem('restockAt') || 0;
  if (!next || next < Date.now()) {
    next = Date.now() + PERIOD;
    localStorage.setItem('restockAt', next);
  }
  const ms = Math.max(0, next - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms % 3600000 / 60000);
  const s = Math.floor(ms % 60000 / 1000);
  const p = n => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

async function newGoods() {
  // Kolik obnov zdarma hrac dnes vycerpal, vi server - z prohlizece
  // by to slo prepsat.
  try {
    const o = await API.merchantRefresh();
    toast(o.zdarma
      ? `Zboží obnoveno zdarma. Dnes ti zbývá ${o.zbyvaZdarma}.`
      : 'Zboží obnoveno.');
  } catch (e) { /* bez serveru se obnovi jen mistne */ }
  return newGoodsMistne();
}

function newGoodsMistne() {
  localStorage.removeItem('restockAt');
  toast('Kupec doplnil zboží!');
  openView('shop');
}

function shop() {
  const id = MERCHANTS[currentShop] ? currentShop : 'blacksmith';
  currentShop = id;

  const tabs = Object.keys(MERCHANTS).map(k =>
    `<div class="s2tab ${k === id ? 'active' : ''}" onclick="openMerchant('${k}')">${MERCHANTS[k].name}</div>`
  ).join('');

  // Nabídku dělíme podle toho, jak se kusy doopravdy poskládají.
  // Dřív se počítala jen zabraná plocha, jenže dvě zbroje 2x2 vedle
  // sebe nechají v pětisloupcovém pultu jeden sloupec nevyužitý —
  // poslední kus pak přetekl pod mřížku a byl zploštělý.
  const stock = shopStock(id);
  const pages = [poskladej(stock), []];
  pages[1] = poskladej(stock.slice(pages[0].length));

  const pageTabs =
    ['I', 'II'].map((lbl, i) =>
      `<div class="pg-tab ${shopPage === i ? 'active' : ''}" onclick="setShopPage(${i})">${lbl}</div>`
    ).join('');

  const mrizka = shopPage === 'sell'
    ? `<div class="sell-zone"
            ondragover="dragOver(event)"
            ondragleave="dragLeave(event)"
            ondrop="dropSell(event)">
         <div class="sell-hint">
           Přetáhni sem předmět z batohu<br>
           <small>nebo na něj klikni — vykoupím ho za 40 % ceny</small>
         </div>
       </div>`
    : `<div class="goods-grid">${(pages[shopPage] || []).map(i => goodsSlot(i, false)).join('')}</div>`;

  return `
  <div class="shop2">
    <div class="s2tabs">${tabs}</div>

    <div class="s2body">

      <!-- kupec: portrét, záložky a pult v jednom rámu -->
      <div class="s2left">
        <div class="mp-outer">
          <div class="mp-inner">${merchantPortrait(id)}</div>
        </div>

        <div class="frame frame-shop">
          <div class="frame-tabs">${pageTabs}</div>
          ${mrizka}
        </div>

        <div class="shop-foot">
          <span class="sf-gold">
            <img class="res-ico" src="img/ui/coin.png" alt="zlata">
            <b>${character.gold.toLocaleString('cs-CZ')}</b>
          </span>
          <span class="sf-restock" title="Než kupec doplní zboží">
            ⏳ <b id="restockTimer">${restockLeft()}</b>
          </span>
        </div>

        <button class="btn-green shop-refresh" onclick="newGoods()">Nové zboží</button>
      </div>

      <!-- tvoje výbava -->
      <div class="s2right">
        ${equipPanelHTML()}
        ${bagPanelHTML('use')}
        <div class="sell-note">Klikni na předmět v batohu pro vybavení.</div>
      </div>

    </div>
  </div>`;
}

function openMerchant(id) {
  if (!MERCHANTS[id]) return;
  currentShop = id;
  shopPage = 0;                 // u nového kupce začni na jeho zboží, ne na výkupu
  openView('shop', MERCHANTS[id].menu);
}

function setShopPage(p) {
  shopPage = p;
  openView('shop');
}

// ---------- prodej ----------
// Kolik za kus dostaneš. Běžný kupec dává 40 %, Překupník 60 % —
// proto se k němu vyplatí zajít, i když je cesta delší.
const VYKUP_KUPEC = 0.4;
const VYKUP_PREKUPNIK = 0.6;

const sellPrice = (it, sazba = VYKUP_KUPEC) =>
  Math.max(1, Math.floor((it.price || 10) * sazba));

function sellItem(i) {
  const it = inventory[i];
  if (!it) return;
  const got = sellPrice(it);
  inventory.splice(i, 1);
  character.gold += got;
  toast(`Prodáno: ${it.name} (+${got} zlatých)`);
  persist();
  openView('shop');
}

function dropSell(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!dragSrc) return;
  const src = dragSrc;
  dragSrc = null;

  if (src.type === 'inv') { sellItem(src.ref); return; }

  // z vybaveného slotu: nejdřív sundat, pak prodat
  const it = equipped[src.ref];
  if (!it) return;
  applyBonus(it, -1);
  delete equipped[src.ref];
  const got = sellPrice(it);
  character.gold += got;
  toast(`Prodáno: ${it.name} (+${got} zlatých)`);
  persist();
  openView('shop');
}

// živý odpočet do nového zboží
setInterval(() => {
  const el = document.getElementById('restockTimer');
  if (el) el.textContent = restockLeft();
}, 1000);

// ===== INVENTORY =====
// Slot definitions
// Sloupec vpravo na panákovi jsou očka na pomocníky.
// Otevírají se od 20. úrovně a samotní pomocníci zatím ve hře nejsou,
// takže očka zůstávají prázdná — ale je vidět, že tam patří.
const POMOCNIK_SLOTS = ['pom1','pom2','pom3','pom4','pom5','pom6','pom7'];
const POMOCNIK_OD_UROVNE = 20;
const pomocniciOtevreni = () => (character && character.level || 1) >= POMOCNIK_OD_UROVNE;

const SLOT_DEFS = {
  helmet:  { label:'Helma',    icon:'⛑️',  key:'defense',  bonus:3  },
  weapon:  { label:'Zbraň',    icon:'⚔️',  key:'strength', bonus:6  },
  chest:   { label:'Zbroj',    icon:'🧥',  key:'defense',  bonus:8  },
  shield:  { label:'Štít',     icon:'🛡️',  key:'defense',  bonus:5  },
  gloves:  { label:'Rukavice', icon:'🥊',  key:'strength', bonus:3  },
  boots:   { label:'Boty',     icon:'👟',  key:'agility',  bonus:4  },
  ring:    { label:'Prsten',   icon:'💍',  key:'agility',  bonus:3  },
  amulet:  { label:'Amulet',   icon:'📿',  key:'intelligence',bonus:4},
  belt:    { label:'Pás',      icon:'🔗',  key:'defense',  bonus:2  },
};





// ===== PŘEHLED (Gladiatus styl) =====
const DOLL = [
  { key:'weapon', cls:'wpn'   },
  { key:'helmet', cls:'helm'  },
  { key:'amulet', cls:'amul'  },
  { key:'chest',  cls:'body'  },
  { key:'shield', cls:'shld'  },
  { key:'gloves', cls:'glov'  },
  { key:'boots',  cls:'boots' },
];

// ---------- IKONKY PŘEDMĚTŮ ----------
// Obrázek se hledá v img/items/<id>.png (např. img/items/w1.png).
// Když soubor neexistuje, automaticky se použije emoji.
// Cesty, na kterých žádný obrázek není. Jakmile jednou selžou,
// už se o ně znovu nepokoušíme — jinak by každé překreslení
// profilu vystřelilo desítky zbytečných 404.
const missingArt = new Set();

function artImg(path, emoji, cls, alt, tint) {
  const t = tint ? ' tint-' + tint : '';
  if (missingArt.has(path)) return `<span class="ico ${cls}${t}">${emoji}</span>`;
  return `<img class="ico ${cls}${t}" src="${path}" alt="${alt || ''}"
               data-src="${path}" data-emoji="${emoji}" data-try="svg"
               onerror="iconFallback(this)">`;
}

function itemIcon(item, cls = '') {
  if (!item) return '';
  const emoji = String(item.icon || '');
  if (!item.id) return `<span class="ico ${cls}">${emoji}</span>`;
  // Ikona se hleda vzdy podle id. Drive sly zapsat vlastni cesty,
  // jenze ty pak prezily v ulozene nabidce i po vymene grafiky
  // a kus se tvaril, ze ikonu nema.
  return artImg(`img/items/${item.id}.png`, emoji, cls, item.name, item.tint);
}

POMOCNIK_SLOTS.forEach(k => { SLOT_DEFS[k] = { label:'Pomocník', icon:'👤' }; });

// Prázdný slot: img/slots/<klíč>.png, jinak emoji ze SLOT_DEFS
function slotIcon(key, cls = '') {
  const d = SLOT_DEFS[key];
  return artImg(`img/slots/${key}.png`, String((d && d.icon) || ''), cls, (d && d.label) || '');
}

// Postupně zkusí .png → .svg → emoji
function iconFallback(img) {
  if (img.dataset.try === 'svg') {
    img.dataset.try = 'done';
    img.src = img.src.replace(/\.png(\?.*)?$/, '.svg');
    return;
  }
  if (img.dataset.src) missingArt.add(img.dataset.src);
  const s = document.createElement('span');
  s.className = img.className;
  s.textContent = img.dataset.emoji || '';
  img.replaceWith(s);
}

// Do jakého slotu předmět patří (podle id z obchodu)
function slotForItem(item) {
  const id = (item && item.id) || '';
  if (/^w/.test(id)) return 'weapon';
  if (['a3','a15','a16'].includes(id)) return 'shield';
  if (/^a/.test(id)) return 'chest';
  if (/^h/.test(id)) return 'helmet';
  if (/^g/.test(id)) return 'gloves';
  if (id === 'b3')   return 'belt';
  if (/^b/.test(id)) return 'boots';
  if (/^r/.test(id))              return 'ring';
  if (id === 'm2' || id === 'm5') return 'ring';
  if (/^m/.test(id)) return 'amulet';
  return null; // lektvary a neznámé
}


// ---------- sdílené kusy: paperdoll a batoh ----------
function dollSlotsHTML() {
  const one = (key, cls) => {
    const def = SLOT_DEFS[key];
    const eq  = equipped[key];
    return `
      <div class="slot ${cls} ${eq ? '' : 'empty'}"
           draggable="${eq ? 'true' : 'false'}"
           ondragstart="dragStart(event,'slot','${key}')"
           ondragend="dragEnd(event)"
           ondragover="dragOver(event)"
           ondragleave="dragLeave(event)"
           ondrop="dropOn(event,'slot','${key}')"
           onclick="unequip('${key}')"
           ${eq ? `data-tip="eq:${key}"` : `title="${def.label}"`}>
        ${eq ? itemIcon(eq, 's-ico') : slotIcon(key, 's-ico')}
        ${eq ? `<span class="s-nm">${eq.name}</span>` : `<span class="s-lbl">${def.label}</span>`}
      </div>`;
  };

  // Pozice jsou změřené z img/ui/frame-doll.jpg, takže očka sedí
  // na namalovaných rámečcích. Když se obrázek vymění, přeměř je.
  const zamceno = !pomocniciOtevreni();
  return DOLL_POZICE.map(p => {
    const styl = `left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%`;
    if (p.pomocnik) {
      return `<div class="doll-slot pomocnik ${zamceno ? 'zamceny' : ''}" style="${styl}"
                   title="${zamceno ? `Pomocníci se otevřou na ${POMOCNIK_OD_UROVNE}. úrovni` : 'Místo pro pomocníka'}">
                <span class="pom-znak">${zamceno ? '🔒' : '👤'}</span>
              </div>`;
    }
    return `<div class="doll-slot" style="${styl}">${one(p.key, '')}</div>`;
  }).join('');
}

const DOLL_POZICE = [
  { key:'helmet', x:36.62, y: 7.88, w:14.19, h:22.20 },
  { key:'weapon', x:12.21, y:35.45, w:15.61, h:28.29 },
  { key:'chest',  x:35.49, y:35.45, w:15.61, h:27.93 },
  { key:'shield', x:58.20, y:35.45, w:16.47, h:28.29 },
  { key:'gloves', x:12.21, y:69.11, w:15.90, h:21.49 },
  { key:'boots',  x:35.49, y:69.11, w:15.90, h:21.49 },
  { key:'ring',   x:57.63, y:74.49, w: 9.37, h:13.25 },   // misto pasu prsten
  { key:'amulet', x:68.13, y:74.84, w: 8.52, h:12.18 },
  // sloupec oček na pomocníky vpravo (od 20. úrovně)
  { key:'pom1', x:86.02, y: 8.24, w:7.95, h:10.03, pomocnik:true },
  { key:'pom2', x:85.45, y:20.77, w:8.52, h:11.10, pomocnik:true },
  { key:'pom3', x:86.30, y:34.74, w:7.38, h:10.03, pomocnik:true },
  { key:'pom4', x:86.02, y:47.63, w:7.95, h:10.03, pomocnik:true },
  { key:'pom5', x:86.02, y:60.16, w:7.95, h:10.38, pomocnik:true },
  { key:'pom6', x:85.45, y:72.69, w:8.52, h:10.74, pomocnik:true },
  { key:'pom7', x:86.02, y:85.59, w:7.95, h: 9.67, pomocnik:true },
];

// Batoh ma ctyri zalozky po 7 x 5 polickach.
const BAG_PAGE_SIZE = 35;
const BAG_PAGES = 4;
const BAG_SIZE = BAG_PAGE_SIZE * BAG_PAGES;

// mode: 'use' = kliknutím vybavit / vypít, 'sell' = kliknutím prodat
// Batoh má na rámu 7 x 5 oček a čtyři záložky.
const BAG_COLS = 7, BAG_ROWS = 5;
const BAG_PAGE = BAG_COLS * BAG_ROWS;
let bagPage = 0;

function setBagPage(p) {
  bagPage = p;
  openView(posledniPohled);   // driv se volalo s currentView, ktere neexistuje
}

function bagFrameHTML(mode) {
  const zalozky = [0, 1, 2, 3].map(i =>
    `<div class="pg-tab ${i === bagPage ? 'active' : ''}" onclick="setBagPage(${i})">${['I','II','III','IV'][i]}</div>`
  ).join('');

  return `
    <div class="frame frame-bag">
      <div class="frame-tabs bag-tabs">${zalozky}</div>
      <div class="bag-grid">${bagSlotsHTML(mode)}</div>
    </div>`;
}

function bagSlotsHTML(mode) {
  let html = '';
  // vypisuje se jen aktualni zalozka, index ale zustava do celeho batohu
  const od = bagPage * BAG_PAGE_SIZE;
  for (let i = od; i < od + BAG_PAGE_SIZE; i++) {
    const it = inventory[i];
    const click = !it ? '' : (mode === 'sell' ? `sellItem(${i})` : `useItem(${i})`);
    const tipAttr = !it ? '' : `data-tip="inv:${i}"`;
    html += `
      <div class="bag-slot ${it ? '' : 'empty'}"
           draggable="${it ? 'true' : 'false'}"
           ondragstart="dragStart(event,'inv','${i}')"
           ondragend="dragEnd(event)"
           ondragover="dragOver(event)"
           ondragleave="dragLeave(event)"
           ondrop="dropOn(event,'inv','${i}')"
           onclick="${click}"
           ${tipAttr}>
        ${it ? `${itemIcon(it,'b-ico')}<span class="b-nm">${it.name.split(' ')[0]}</span>` : ''}
      </div>`;
  }
  return html;
}

function equipPanelHTML() {
  return `
    <div class="frame frame-doll">${dollSlotsHTML()}</div>`;
}

function bagPanelHTML(mode) {
  return `
    <div class="bag">
      <div class="bag-tabs">
        <div class="bag-tab active">I</div>
        <div class="bag-tab">II</div>
        <div class="bag-tab">III</div>
        <div class="bag-tab">IV</div>
      </div>
      <div class="bag-grid">${bagSlotsHTML(mode)}</div>
    </div>`;
}

function profileView() {
  const c = character;
  const str = statTotal('strength');
  const def = statTotal('defense');
  const agi = statTotal('agility');
  const skl = statTotal('skill');
  const int = statTotal('intelligence');

  const [dmgMin, dmgMax] = playerDamageRange();
  const armor   = totalArmor();
  const xpNeed  = xpNaDalsi(c.level);
  const xpPct   = Math.min(100, c.experience / xpNeed * 100);
  const hpPct   = Math.max(0, c.health / maxHP() * 100);

  const bar = (cls, pct) => `<div class="sbar ${cls}"><i style="width:${pct}%"></i></div>`;
  const rowBar   = (label, cls, pct, val, statKey, tipKey) => {
    const tip = tipKey ? ` data-tip="${tipKey}"` : statKey ? ` data-tip="stat:${statKey}"` : '';
    return `<div class="strow"${tip}><span class="sl">${label}</span>${bar(cls, pct)}<span class="sv">${val}</span></div>`;
  };
  const rowPlain = (label, val) =>
    `<div class="strow plain"><span class="sl">${label}</span><span class="sv">${val}</span></div>`;

  const avatar = avatarProUroven(c.level);
  const avatarHTML = /^\s*</.test(avatar) ? avatar : `<span class="emoji">${avatar}</span>`;

  const dollHTML = `<div class="frame frame-doll">${dollSlotsHTML()}</div>`;
  const bagHTML  = bagFrameHTML('use');

  return `
  <div class="gl-profile">

    <div class="gl-left">
      <div class="nameplate">
        <div class="np-name">${c.name}</div>
        <div class="np-title">${c.class}</div>
      </div>

      <div class="portrait"><div class="portrait-inner">${avatarHTML}</div></div>

      <div class="stattable">
        ${rowPlain('Úroveň', c.level)}
        ${rowBar('Životy',     'hp', hpPct, c.health + '/' + maxHP(), 'defense')}
        ${rowBar('Zkušenost',  'xp', xpPct, xpPct.toFixed(1) + ' %', null, 'xp')}
        ${rowBar('Síla',       'st', Math.min(100, str / 3), str, 'strength')}
        ${rowBar('Dovednost',  'st', Math.min(100, skl / 3), skl, 'skill')}
        ${rowBar('Obratnost',  'st', Math.min(100, agi / 3), agi, 'agility')}
        ${rowBar('Odolnost',   'st', Math.min(100, def / 3), def, 'defense')}
        ${rowBar('Inteligence','st', Math.min(100, int / 3), int, 'intelligence')}
        ${rowPlain('Zbroj', armor)}
        ${rowPlain('Poškození', dmgMin + ' - ' + dmgMax)}
      </div>
    </div>

    <div class="eq-wrap">
      <div class="eq-frame">
        ${dollHTML}
      </div>

      <div class="bag">
        <div class="bag-tabs">
        ${bagHTML}
      </div>
    </div>

  </div>
`;
}

// ========== DRAG & DROP ==========
let dragSrc = null; // {type:'inv'|'slot', ref}

function dragStart(e, type, ref) {
  const item = type === 'inv' ? inventory[+ref] : equipped[ref];
  if (!item) { e.preventDefault(); return; }
  dragSrc = { type, ref: type === 'inv' ? +ref : ref };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', item.name);
  e.currentTarget.classList.add('dragging');
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

// Bonusy se nikam nezapisují — stačí, že předmět je v `equipped`.
// Ponecháno jako no-op, aby volající kód zůstal čitelný.
function applyBonus(_item, _sign) {}

function dropOn(e, type, ref) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!dragSrc) return;

  const src = dragSrc;
  dragSrc = null;

  const item = src.type === 'inv' ? inventory[src.ref] : equipped[src.ref];
  if (!item) return;

  // --- do slotu vybavení ---
  if (type === 'slot') {
    if (!uneseKus(item)) {
      toast(`${item.name} má úroveň ${item.lvl}. Uneseš nejvýš ${maxNositelnaUroven()}.`);
      return;
    }
    const want = slotForItem(item);
    if (want !== ref) {
      toast(`${item.name} sem nepatří — patří do slotu „${SLOT_DEFS[want] ? SLOT_DEFS[want].label : 'žádný'}".`);
      return;
    }

    const previous = equipped[ref] || null;

    if (src.type === 'inv') {
      inventory.splice(src.ref, 1);
      if (previous) inventory.push(previous);
    } else {
      delete equipped[src.ref];
      if (previous) equipped[src.ref] = previous;
    }

    if (previous) applyBonus(previous, -1);
    equipped[ref] = item;
    applyBonus(item, +1);
  }

  // --- do batohu ---
  else if (type === 'inv') {
    if (src.type === 'slot') {
      delete equipped[src.ref];
      applyBonus(item, -1);
      const target = +ref;
      if (inventory[target]) inventory.push(item);
      else inventory[target] = item;
    } else {
      // přehození v batohu
      const a = src.ref, b = +ref;
      const tmp = inventory[b];
      inventory[b] = inventory[a];
      if (tmp === undefined) delete inventory[a];
      else inventory[a] = tmp;
    }
  }

  persist();
}

// klik na slot = sundat
function unequip(key) {
  const item = equipped[key];
  if (!item) return;
  applyBonus(item, -1);
  delete equipped[key];
  inventory.push(item);
  persist();
}

// klik na předmět v batohu = vybavit / vypít
function useItem(i) {
  const item = inventory[i];
  if (!item) return;
  if (!uneseKus(item)) {
    toast(`${item.name} má úroveň ${item.lvl}. Uneseš nejvýš ${maxNositelnaUroven()}.`);
    return;
  }


  if (item.key === 'health') {
    character.health = Math.min(maxHP(), character.health + item.val);
    inventory.splice(i, 1);
    toast(`Vypil jsi ${item.name}. +${item.val} HP`);
    persist();
    return;
  }

  const slot = slotForItem(item);
  if (!slot) return;

  const previous = equipped[slot] || null;
  inventory.splice(i, 1);
  if (previous) { applyBonus(previous, -1); inventory.push(previous); }
  equipped[slot] = item;
  applyBonus(item, +1);
  persist();
}

function persist() {
  inventory = inventory.filter(x => x);
  localStorage.setItem('inv', JSON.stringify(inventory));
  localStorage.setItem('eqp', JSON.stringify(equipped));
  saveChar();
  updateUI();
  openView('profile');
}

function toast(msg) {
  let t = document.getElementById('glToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'glToast';
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:5000;' +
      'background:linear-gradient(180deg,#f8eed4,#e3d3ac);border:2px solid #8a6d16;border-radius:4px;' +
      'padding:9px 18px;font:13px Georgia,serif;color:#4a3520;box-shadow:0 4px 14px rgba(0,0,0,.5);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.display = 'none'; }, 2200);
}


// Kliknutí na slot vybavení (sundání)

// Kliknutí na předmět v inventáři (nasazení)

// ===== TAVERN =====

function tavernTab(el, boardId) {
  document.querySelectorAll('.tavern-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.tavern-board').forEach(b => b.style.display = 'none');
  document.getElementById(boardId).style.display = 'block';
}



// ===== FORGE =====

// ===== GUILD =====
function guild() { return lockedSoon('Gilda'); }

// ========== COMBAT ==========
function startCombat(idx) {
  beginFight(ENEMIES[idx], 'arena');
}


// ========== NÁHODNÉ STATY PŘEDMĚTŮ ==========
const STAT_DEFS = {
  strength:     'Síla',
  agility:      'Obratnost',
  defense:      'Odolnost',
  skill:        'Dovednost',
  intelligence: 'Inteligence',
};
const STAT_KEYS = Object.keys(STAT_DEFS);

// čím vzácnější předmět, tím víc statů a vyšší objem
const QUALITY_ROLL = {
  common:    { count:1, mult:1.00, label:'Běžný',      color:'#6b6b6b' },
  uncommon:  { count:2, mult:1.25, label:'Neobvyklý',  color:'#2d8020' },
  rare:      { count:3, mult:1.55, label:'Vzácný',     color:'#1a4a8b' },
  epic:      { count:4, mult:1.90, label:'Epický',     color:'#6b2fa0' },
  legendary: { count:4, mult:2.30, label:'Legendární', color:'#b8860b' },
};

const qualityOf = it => QUALITY_ROLL[(it && it.quality) || 'common'] || QUALITY_ROLL.common;

// sloty, které se počítají jako výstroj (nesou zbroj)
const ARMOR_SLOTS = ['helmet', 'chest', 'shield', 'gloves', 'boots', 'belt'];

// celková zbroj: z odolnosti + z jednotlivých kusů výstroje
// Zbroj dává výhradně výstroj — odolnost jde do životů.
function totalArmor() {
  return Object.values(equipped).reduce(
    (a, e) => a + ((e && !isBroken(e) && e.armor) || 0), 0);
}

// Ze šablony z obchodu vyrobí konkrétní kus s náhodně rozhozenými staty.
// Hlavní stat odpovídá typu předmětu (zbraň → síla, zbroj → odolnost…),
// zbylé se losují, takže dva stejné meče nejsou nikdy stejné.
function rollItem(tpl) {
  const it = { ...tpl, uid: 'i' + Math.random().toString(36).slice(2, 10) };
  // Úroveň kusu se losuje kolem úrovně hráče: od tří pod ni po pět nad ni.
  const hracLvl = character ? character.level : 1;
  it.lvl = Math.max(1, hracLvl + Math.floor(Math.random() * 9) - 3);

  // Sílu určuje úroveň a kvalita, ne cena šablony. Kdyby se škálovalo
  // podle ceny, vyšlo by dřevěné rezátko na 15. úrovni stejně jako
  // Meč Achillea — třídy by se slely dohromady.
  const kval = qualityOf(tpl);
  const naUroven = (zaklad, naLvl) => Math.max(1, Math.round((zaklad + it.lvl * naLvl) * kval.mult));

  tpl = { ...tpl, val: naUroven(3, 1.6) };                 // objem vlastností
  it.price = Math.max(10, Math.round((14 + it.lvl * it.lvl * 1.1) * kval.mult));

  if (Array.isArray(tpl.dmg)) {
    it.dmg = [naUroven(1, 1.5), naUroven(3, 2.4)];
  }

  // kusy výstroje nesou vlastní zbroj (zbraně a šperky ne)
  if (ARMOR_SLOTS.includes(slotForItem(tpl))) {
    it.armor = naUroven(4, 3.2);
  }

  // všechno nositelné se opotřebovává
  if (slotForItem(tpl)) {
    it.durMax = Math.round(150 + it.price * 1.5 * qualityOf(tpl).mult);
    it.dur    = it.durMax;
  }
  if (tpl.key === 'health') return it;          // lektvary se nerolují

  const q = qualityOf(tpl);
  const main = STAT_DEFS[tpl.key] ? tpl.key : STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
  const rest = STAT_KEYS.filter(k => k !== main).sort(() => Math.random() - 0.5);
  const keys = [main, ...rest.slice(0, Math.max(0, q.count - 1))];

  let left = Math.max(keys.length, Math.round((tpl.val || 4) * q.mult));
  const stats = {};
  keys.forEach((k, i) => {
    const zbyva = keys.length - 1 - i;           // kolik statů ještě přijde
    if (zbyva === 0) { stats[k] = left; return; }
    const podil = i === 0 ? 0.55 : 0.5;
    let v = Math.round(left * podil * (0.75 + Math.random() * 0.5));
    v = Math.min(Math.max(1, v), left - zbyva);  // na každý další musí zbýt aspoň 1
    stats[k] = v;
    left -= v;
  });

  it.stats = stats;
  delete it.key; delete it.val;
  return it;
}

// souhrn statů předmětu do čitelné věty

// součet jednoho statu ze všeho nasazeného
function equipBonus(k) {
  return Object.values(equipped).reduce(
    (a, e) => a + ((e && !isBroken(e) && e.stats && e.stats[k]) || 0), 0);
}

// V postavě je uložený POUZE základ. Bonusy z vybavení se nikam nezapisují,
// připočítávají se až tady — jinak by se počítaly dvakrát.
function statTotal(k) {
  return (character[k] || 0) + equipBonus(k);
}

// Starší uložené postavy měly bonusy zapsané rovnou v sobě.
// Jednou je odečteme, ať v postavě zůstane jen základ.
function normalizeCharacter() {
  if (!character) return;
  // Dovednost přibyla později – starší postavy ji dostanou dopočtenou
  if (typeof character.skill !== 'number') character.skill = 10;
  if (typeof character.pocta !== 'number') character.pocta = 0;
  if (typeof character.emeralds !== 'number') character.emeralds = 0;

  // Body, odpocty a clenstvi uz drzi server. Stare klice v prohlizeci
  // by jen matly - uz je nikdo necte, tak at nezustavaji lezet.
  ['pts_exped','ptsAt_exped','pts_dungeon','ptsAt_dungeon',
   'cd_exped','cd_dungeon','expedCdUntil','expedPts','expedPtsAt',
   'paladinDo'].forEach(k => localStorage.removeItem(k));
  if (localStorage.getItem('statsFixed') === '1') return;
  for (const k of STAT_KEYS) {
    if (typeof character[k] === 'number') {
      character[k] = Math.max(1, character[k] - equipBonus(k));
    }
  }
  localStorage.setItem('statsFixed', '1');
}

// starší uložené předměty měly jen jeden stat (key/val) — převedeme je
function migrateItem(it) {
  if (!it) return it;
  if (it.key === 'health') return it;

  if (!it.stats) {
    it.stats = (it.key && it.val) ? { [it.key]: it.val } : {};
    delete it.key; delete it.val;
  }
  // dřív předměty životnost neměly – dostanou plnou
  if (!it.durMax && slotForItem(it)) {
    it.durMax = Math.round(150 + (it.price || 50) * 1.5 * qualityOf(it).mult);
    it.dur = it.durMax;
  }
  return it;
}
inventory = inventory.map(migrateItem).filter(Boolean);
Object.keys(equipped).forEach(k => { equipped[k] = migrateItem(equipped[k]); });


// ========== POPISEK PŘEDMĚTU ==========
// Vlastní bublina místo nativního title – umí barvy a víc řádků.
function itemByRef(ref) {
  if (!ref) return null;
  const i = ref.indexOf(':');
  const kind = ref.slice(0, i), val = ref.slice(i + 1);
  if (kind === 'eq')  return equipped[val] || null;
  if (kind === 'inv') return inventory[+val] || null;
  if (kind === 'shop') {
    for (const id of Object.keys(MERCHANTS)) {
      const it = shopStock(id).find(x => x && x.uid === val);
      if (it) return it;
    }
  }
  return null;
}

function itemTipHTML(it) {
  const q = qualityOf(it);
  const rows = [];

  if (Array.isArray(it.dmg)) {
    rows.push(`<div class="tip-row"><span>Poškození</span><b>${it.dmg[0]} - ${it.dmg[1]}</b></div>`);
  }
  if (it.armor) {
    rows.push(`<div class="tip-row"><span>Zbroj</span><b>+${it.armor}</b></div>`);
  }
  if (it.key === 'health') {
    rows.push(`<div class="tip-row"><span>Obnoví zdraví</span><b>+${it.val}</b></div>`);
  }
  for (const [k, v] of Object.entries(it.stats || {})) {
    const cls = v < 0 ? ' neg' : '';
    rows.push(`<div class="tip-row${cls}"><span>${STAT_DEFS[k]}</span><b>${v > 0 ? '+' : ''}${v}</b></div>`);
  }

  // zelený souhrn: čím ten kus hlavně přispěje
  let souhrn = '';
  if (it.armor) souhrn = '+' + it.armor + ' Zbroj';
  else if (Array.isArray(it.dmg)) souhrn = '+' + Math.round((it.dmg[0] + it.dmg[1]) / 2) + ' Poškození';

  const tezky = !uneseKus(it);                                    // vůbec neunese
  const nadUrovni = it.lvl && character && character.level < it.lvl; // nad ním, ale unese

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,${q.color},#1a1409)">
      <div class="tip-name">${it.name}</div>
      <div class="tip-q">${q.label}</div>
    </div>
    <div class="tip-body">
      ${rows.join('') || '<div class="tip-row"><span>Bez bonusů</span><b>—</b></div>'}
      ${souhrn ? `<div class="tip-sum">${souhrn}</div>` : ''}
      <div class="tip-sep"></div>
      ${it.lvl ? `<div class="tip-row${tezky ? ' neg' : ''}"><span>Úroveň</span><b${!tezky && nadUrovni ? ' class="rank-mid"' : ''}>${it.lvl}</b></div>` : ''}
      <div class="tip-row"><span>Hodnota</span><b>${it.price || 0} zlata</b></div>
      ${it.durMax ? (() => {
        const pct = Math.round(it.dur / it.durMax * 100);
        return `<div class="tip-row"><span>Životnost</span><b class="${durClass(pct)}">${it.dur}/${it.durMax} (${pct} %)</b></div>`;
      })() : ''}
      ${tezky
          ? `<div class="tip-warn">Uneseš nejvýš úroveň ${maxNositelnaUroven()}.</div>`
          : nadUrovni ? '<div class="tip-note">Kus je nad tvou úrovní, ale ještě ho uneseš.</div>' : ''}
    </div>`;
}


// Popis protivníka. Porovnání se vztahuje k tvým statům:
// zelená = slabší než ty, červená = silnější.
function monsterTipHTML(m) {
  const row = (jmeno, hodnota, tridaHodnoty) =>
    `<div class="tip-row"><span>${jmeno}</span><b${tridaHodnoty ? ` class="${tridaHodnoty}"` : ''}>${hodnota}</b></div>`;

  const porovnej = (jmeno, hodnotaSoupere, muj) => {
    const slovo = rankWord(hodnotaSoupere, muj);
    const i = RANK_WORDS.indexOf(slovo);
    return row(jmeno, slovo, i <= 1 ? 'rank-weak' : i <= 3 ? 'rank-mid' : 'rank-strong');
  };

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,#8f2020,#1a1409)">
      <div class="tip-name">${m.name}</div>
      <div class="tip-q">Nestvůra</div>
    </div>
    <div class="tip-body">
      ${row('Úroveň', m.lvl[0] + ' – ' + m.lvl[1])}
      ${row('Životy', m.hp[0] + ' – ' + m.hp[1])}
      ${row('Poškození', Math.floor(m.str * 1.1) + ' – ' + Math.floor(m.str * 1.6))}
      ${row('Zbroj', m.def * 3)}
      <div class="tip-sep"></div>
      ${porovnej('Síla', m.str, statTotal('strength'))}
      ${porovnej('Odolnost', m.def, statTotal('defense'))}
      ${porovnej('Obratnost', m.str * 0.8, statTotal('agility'))}
      <div class="tip-sep"></div>
      ${row('Zlato', m.gold[0] + ' – ' + m.gold[1])}
      ${row('Zkušenosti', m.exp[0] + ' – ' + m.exp[1])}
    </div>`;
}


// Co která vlastnost dělá. `ucinek` ukazuje, kolik to zrovna dělá,
// aby popis nebyl jen prázdné tvrzení.
const STAT_INFO = {
  strength: {
    nazev: 'Síla',
    popis: 'Čím větší síla, tím větší poškození rozdáš.',
    ucinek: () => { const [a, b] = playerDamageRange(); return `Poškození ${a} – ${b}`; },
  },
  skill: {
    nazev: 'Dovednost',
    popis: 'Dává šanci udeřit v jednom kole dvakrát.',
    ucinek: () => `Dvojitý zásah ${(doubleChance() * 100).toFixed(1)} %`,
  },
  agility: {
    nazev: 'Obratnost',
    popis: 'Blokuje dvojité zásahy protivníka.',
    ucinek: () => `Blokace ${(blockChance() * 100).toFixed(1)} %`,
  },
  defense: {
    nazev: 'Odolnost',
    popis: 'Zvyšuje počet životů, každý bod přidá pět.',
    ucinek: () => `Životy ${maxHP()} (+${statTotal('defense') * HP_ZA_ODOLNOST} z odolnosti)`,
  },
  intelligence: {
    nazev: 'Inteligence',
    popis: 'Zvyšuje šanci na kritický zásah za 1,6násobné poškození.',
    ucinek: () => `Kritický zásah ${(critChance() * 100).toFixed(1)} %`,
  },
};

// Kolik má hráč životů a odkud se skládá jejich strop.
function hpTipHTML() {
  const strop = maxHP();
  const zOdolnosti = statTotal('defense') * HP_ZA_ODOLNOST;
  const row = (jmeno, hodnota) =>
    `<div class="tip-row"><span>${jmeno}</span><b>${hodnota}</b></div>`;

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,#8f2020,#1a1409)">
      <div class="tip-name">Životy</div>
      <div class="tip-q">${Math.round(character.health / strop * 100)} % z maxima</div>
    </div>
    <div class="tip-body">
      ${row('Máš', character.health.toLocaleString('cs-CZ'))}
      ${row('Maximum', strop.toLocaleString('cs-CZ'))}
      <div class="tip-sep"></div>
      ${row('Základ', (character.max_health || 0).toLocaleString('cs-CZ'))}
      ${row('Z odolnosti', '+' + zOdolnosti.toLocaleString('cs-CZ'))}
      <div class="tip-note">Každý bod odolnosti přidá ${HP_ZA_ODOLNOST} životů.</div>
    </div>`;
}

// Kolik zkušeností hráč má a kolik ještě potřebuje na další úroveň.
function xpTipHTML() {
  const potreba = xpNaDalsi(character.level);
  const ma = character.experience;
  const zbyva = Math.max(0, potreba - ma);
  const pct = Math.min(100, ma / potreba * 100);

  const row = (jmeno, hodnota) =>
    `<div class="tip-row"><span>${jmeno}</span><b>${hodnota}</b></div>`;

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,#7a5a12,#1a1409)">
      <div class="tip-name">Zkušenost</div>
      <div class="tip-q">${pct.toFixed(1)} % do ${Math.min(MAX_UROVEN, character.level + 1)}. úrovně</div>
    </div>
    <div class="tip-body">
      ${row('Máš', ma.toLocaleString('cs-CZ'))}
      ${row('Potřebuješ', potreba.toLocaleString('cs-CZ'))}
      <div class="tip-sep"></div>
      ${row('Zbývá', zbyva.toLocaleString('cs-CZ'))}
      <div class="tip-note">Na ${Math.min(MAX_UROVEN, character.level + 1)}. úroveň potřebuješ celkem ${potreba.toLocaleString('cs-CZ')} zkušeností.</div>
    </div>`;
}

function statTipHTML(key) {
  const s = STAT_INFO[key];
  if (!s) return '';
  const zaklad = character[key] || 0;
  const zVybaveni = equipBonus(key);

  const row = (jmeno, hodnota, tridaHodnoty) =>
    `<div class="tip-row"><span>${jmeno}</span><b${tridaHodnoty ? ` class="${tridaHodnoty}"` : ''}>${hodnota}</b></div>`;

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,#7a5a12,#1a1409)">
      <div class="tip-name">${s.nazev}</div>
      <div class="tip-q">${statTotal(key)} celkem</div>
    </div>
    <div class="tip-body">
      ${row('Základní', zaklad)}
      ${row('Z vybavení', (zVybaveni > 0 ? '+' : '') + zVybaveni, zVybaveni > 0 ? 'rank-weak' : '')}
      <div class="tip-sep"></div>
      ${row('Účinek', s.ucinek())}
      <div class="tip-note">${s.popis}</div>
    </div>`;
}

// Co se má v bublině ukázat – předmět, protivník, nebo vlastnost.
function tipHTMLFor(ref) {
  if (ref === 'xp') return xpTipHTML();
  if (ref === 'hp') return hpTipHTML();
  if (ref.startsWith('stat:')) return statTipHTML(ref.slice(5));
  if (ref.startsWith('loot:')) {
    const z = lootLog[+ref.slice(5)];
    return z ? itemTipHTML(z.kus) : '';
  }
  if (ref.startsWith('mon:')) {
    const loc = EXPEDITIONS.find(e => e.id === currentExped);
    const m = loc && loc.monsters[+ref.slice(4)];
    return m ? monsterTipHTML(m) : '';
  }
  const it = itemByRef(ref);
  return it ? itemTipHTML(it) : '';
}

let tipEl = null;
function showItemTip(e) {
  const host = e.target.closest('[data-tip]');
  if (!host) return;
  const html = tipHTMLFor(host.dataset.tip);
  if (!html) return;

  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'item-tip';
    document.body.appendChild(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  moveItemTip(e);
}

function moveItemTip(e) {
  if (!tipEl || tipEl.style.display === 'none') return;
  const pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth  - 8) x = e.clientX - w - pad;   // překlopit doleva
  if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
  tipEl.style.left = x + 'px';
  tipEl.style.top  = y + 'px';
}

function hideItemTip(e) {
  if (!tipEl) return;
  if (e && e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]')) return;
  tipEl.style.display = 'none';
}

document.addEventListener('mouseover', showItemTip);
document.addEventListener('mousemove', moveItemTip);
document.addEventListener('mouseout',  hideItemTip);
document.addEventListener('click',     () => hideItemTip());

// ========== ZBOŽÍ V OBCHODĚ ==========
// Nabídka se vyloosuje jednou za restock a drží se, dokud kupec nedoplní.
// Zvys, kdyz se zmeni podoba predmetu - stara ulozena nabidka
// se pak zahodi a vyloosuje znovu.
const STOCK_VERZE = '2';

function shopStock(id) {
  restockLeft();                                  // zajistí, že restockAt existuje
  const stamp = (localStorage.getItem('restockAt') || '0') + '#' + STOCK_VERZE;
  const kIt = 'stock_' + id, kAt = 'stockAt_' + id;

  if (localStorage.getItem(kAt) === stamp) {
    try {
      const s = JSON.parse(localStorage.getItem(kIt));
      if (Array.isArray(s)) return s;
    } catch (e) { /* poškozený záznam – vyloosujeme znovu */ }
  }
  const rolled = MERCHANTS[id].items.map(rollItem);
  localStorage.setItem(kIt, JSON.stringify(rolled));
  localStorage.setItem(kAt, stamp);
  return rolled;
}

function takeFromStock(uid) {
  for (const id of Object.keys(MERCHANTS)) {
    const s = shopStock(id);
    const i = s.findIndex(x => x && x.uid === uid);
    if (i >= 0) {
      const [it] = s.splice(i, 1);
      localStorage.setItem('stock_' + id, JSON.stringify(s));
      return it;
    }
  }
  return null;
}

// ========== POŠKOZENÍ ==========
// Poškození dělá hlavně ZBRAŇ; síla ho jen procentuálně navyšuje.
// Bez toho by staty z vybavení rostly rychleji než životy příšer.
const FISTS = [1, 2];

function playerDamageRange() {
  const w = equipped.weapon;
  const base = (w && !isBroken(w) && Array.isArray(w.dmg)) ? w.dmg : FISTS;
  const mult = 1 + statTotal('strength') / 150;
  return [Math.max(1, Math.round(base[0] * mult)), Math.max(2, Math.round(base[1] * mult))];
}

function rollPlayerDamage() {
  const [lo, hi] = playerDamageRange();
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// zbroj tlumí zásah, ale nikdy ho nevynuluje
const soak = def => Math.floor(def / 4);

// Zbroj tlumí zásah. Pochází z kusů výstroje.
const playerSoak = () => Math.floor(totalArmor() / 12);

// Odolnost přidává životy — 5 za bod.
const HP_ZA_ODOLNOST = 5;
const maxHP = () => (character.max_health || 0) + statTotal('defense') * HP_ZA_ODOLNOST;

// Šance rostou se zmenšujícím se přírůstkem, aby se nedaly vyhnat na 100 %.
const sance = (hodnota, polovina, strop) =>
  Math.min(strop, hodnota / (hodnota + polovina));

// Dovednost = šance udeřit dvakrát v jednom kole.
const DOUBLE_MAX = 0.40;
const doubleChance = () => sance(statTotal('skill'), 150, DOUBLE_MAX);

// Obratnost = šance zablokovat dvojitý zásah protivníka.
const BLOCK_MAX = 0.50;
const blockChance = () => sance(statTotal('agility'), 130, BLOCK_MAX);

// Inteligence = šance na kritický zásah.
const CRIT_MAX = 0.35;
const CRIT_MULT = 1.6;
const critChance = () => Math.min(CRIT_MAX, 0.08 + statTotal('intelligence') / 500);

// Příšery mají tytéž vlastnosti jako hráč, jen odvozené ze své síly
// a odolnosti — díky tomu jde obě strany poctivě srovnat.
const monsterStats = e => ({
  skill:        Math.round((e.str || 0) * 0.6),
  agility:      Math.round((e.def || 0) * 0.8),
  intelligence: Math.round((e.def || 0) * 0.5),
});

const enemyDoubleChance = e => sance(monsterStats(e).skill, 150, DOUBLE_MAX);
const enemyBlockChance  = e => sance(monsterStats(e).agility, 130, BLOCK_MAX);
const enemyCritChance   = e => Math.min(CRIT_MAX, 0.05 + monsterStats(e).intelligence / 500);

// ========== AUTOMATICKÝ BOJ ==========
let fightTimer = null;
let lastFight  = null;   // {enemy, view} pro tlačítko "Bojovat znovu"

const ROUND_MS = 950;    // pauza mezi výpady

// jeden výpad: animace útočníka, otřes cíle a plovoucí číslo
function animateHit(fromSel, toSel, dmg, crit) {
  const from = document.querySelector(fromSel);
  const to   = document.querySelector(toSel);
  if (!from || !to) return;

  const lunge = fromSel.includes('player') ? 'lunge-right' : 'lunge-left';
  from.classList.remove(lunge);
  void from.offsetWidth;              // restart animace
  from.classList.add(lunge);

  setTimeout(() => {
    to.classList.remove('hit');
    void to.offsetWidth;
    to.classList.add('hit');

    const f = document.createElement('div');
    f.className = 'dmg-float' + (crit ? ' crit' : '');
    f.textContent = (crit ? '‼ ' : '') + '-' + dmg;
    to.appendChild(f);
    setTimeout(() => f.remove(), 950);
  }, 180);
}

function fightRound() {
  if (!inCombat) return;

  koloCislo++;

  // --- útok hráče ---
  const dvojity = Math.random() < doubleChance();
  const rany = dvojity ? 2 : 1;
  let pdmg = 0, kritCelkem = false;

  // protivník může druhou ránu vykrýt
  const vykryto = rany > 1 && Math.random() < enemyBlockChance(currentEnemy);
  const skutecneRany = vykryto ? 1 : rany;

  for (let i = 0; i < skutecneRany; i++) {
    const crit = Math.random() < critChance();
    let d = Math.max(1, rollPlayerDamage() - soak(currentEnemy.def));
    if (crit) { d = Math.floor(d * CRIT_MULT); kritCelkem = true; }
    pdmg += d;
  }

  currentEnemy.hp = Math.max(0, currentEnemy.hp - pdmg);
  dmgHrac += pdmg;
  zapisKolo('hrac', `utržil <b>${pdmg}</b> poškození` +
    (vykryto ? ' (druhou ránu vykryl)' : dvojity ? ' (dvojitý zásah)' : '') +
    (kritCelkem ? ' (kritický)' : ''));
  animateHit('.fighter-box.player', '.fighter-box.enemy', pdmg, kritCelkem);
  addLog(`${character.name} zasáhl za <strong>${pdmg}</strong>` +
         (dvojity && !vykryto ? ' (dvojitý zásah!)' : '') +
         (vykryto ? ' — druhou ránu vykryl' : '') +
         (kritCelkem ? ' (kritický zásah!)' : ''), 'log-p');
  updateHpBars();

  if (currentEnemy.hp <= 0) { fightTimer = setTimeout(() => endCombat(true), 800); return; }

  // --- odveta soupeře ---
  fightTimer = setTimeout(() => {
    if (!inCombat) return;

    // protivník se občas rozmáchne dvakrát – obratnost to může zarazit
    let eRany = 1;
    if (Math.random() < enemyDoubleChance(currentEnemy)) {
      if (Math.random() < blockChance()) {
        addLog(`${character.name} zablokoval druhou ránu`, 'log-p');
        zapisKolo('souper', 'blokováno');
      } else {
        eRany = 2;
      }
    }

    let edmg = 0, eKrit = false;
    for (let i = 0; i < eRany; i++) {
      let d = Math.max(1, currentEnemy.str + Math.floor(Math.random() * 6) - playerSoak());
      if (Math.random() < enemyCritChance(currentEnemy)) { d = Math.floor(d * CRIT_MULT); eKrit = true; }
      edmg += d;
    }
    character.health = Math.max(0, character.health - edmg);
    dmgSouper += edmg;
    zapisKolo('souper', `utržil <b>${edmg}</b> poškození` +
      (eRany > 1 ? ' (dvojitý zásah)' : '') + (eKrit ? ' (kritický)' : ''));
    animateHit('.fighter-box.enemy', '.fighter-box.player', edmg, eKrit);
    addLog(`${currentEnemy.name} zasáhl za <strong>${edmg}</strong>` +
           (eRany > 1 ? ' (dvojitý zásah)' : ''), 'log-e');
    updateHpBars();
    updateUI();

    if (character.health <= 0) { fightTimer = setTimeout(() => endCombat(false), 800); return; }
    fightTimer = setTimeout(fightRound, ROUND_MS);
  }, ROUND_MS);
}

// dopočítá boj bez animací
function skipFight() {
  if (!inCombat) return;
  clearTimeout(fightTimer);
  let guard = 0;
  while (inCombat && guard++ < 500) {
    koloCislo++;
    let pdmg = 0;
    for (let i = 0, n = Math.random() < doubleChance() ? 2 : 1; i < n; i++) {
      let d = Math.max(1, rollPlayerDamage() - soak(currentEnemy.def));
      if (Math.random() < critChance()) d = Math.floor(d * CRIT_MULT);
      pdmg += d;
    }
    currentEnemy.hp = Math.max(0, currentEnemy.hp - pdmg);
    dmgHrac += pdmg;
    zapisKolo('hrac', `utržil <b>${pdmg}</b> poškození`);
    addLog(`${character.name} zasáhl za <strong>${pdmg}</strong>`, 'log-p');
    if (currentEnemy.hp <= 0) { endCombat(true); break; }

    let eRany = 1, blokoval = false;
    if (Math.random() < enemyDoubleChance(currentEnemy)) {
      if (Math.random() < blockChance()) blokoval = true; else eRany = 2;
    }
    let edmg = 0;
    for (let i = 0; i < eRany; i++) {
      edmg += Math.max(1, currentEnemy.str + Math.floor(Math.random() * 6) - playerSoak());
    }
    character.health = Math.max(0, character.health - edmg);
    dmgSouper += edmg;
    zapisKolo('souper', blokovan0(blokoval, edmg, eRany));
    addLog(`${currentEnemy.name} zasáhl za <strong>${edmg}</strong>`, 'log-e');
    if (character.health <= 0) { endCombat(false); break; }
  }
  updateHpBars();
}

function endCombat(won) {
  inCombat = false;
  clearTimeout(fightTimer);
  updateHpBars();

  // záznam do historie soubojů
  zapisSouboj({
    kdy: Date.now(), vyhra: won, soupeR: currentEnemy.name,
    zlato: won ? currentEnemy.gold : 0, exp: won ? currentEnemy.exp : 0,
  });

  // z vyhrané výpravy může spadnout předmět
  let korist = null;
  if (won && lastFight && lastFight.view === 'expedition') {
    korist = rollLoot(currentEnemy);
    if (korist) {
      // do zásilek, ať plný batoh o kořist nepřipraví
      zapisKorist({ kdy: Date.now(), kus: korist, od: currentEnemy.name });
      addLog(`Našel jsi <strong>${korist.name}</strong> — čeká v zásilkách`, 'log-w');
    }
  }

  let rewards = '';
  if (won) {
    // Odmenu pripisuje server ze sveho vzorce a s bonusem Paladina.
    // Hra si ji nepocita, jen ukaze, co prislo zpet.
    pripisOdmenu(lastFight && lastFight.view, currentEnemy);
    rewards = `+${currentEnemy.gold} zlata · +${currentEnemy.exp} zkušeností` +
              (korist ? ` · ${korist.name}` : '');
    addLog(`Vítězství! ${rewards}`, 'log-w');
    checkLevelUp();
  } else {
    character.health = Math.max(1, Math.floor(maxHP() * 0.25));
    rewards = `Probral ses s ${character.health} HP.`;
    addLog(`Porážka. ${rewards}`, 'log-d');
  }
  // po výpravě si gladiátor musí odpočinout
  // odpočinek nastavil server, když se utratil bod
  if (won && lastFight && lastFight.view === 'arena') {
    character.pocta = (character.pocta || 0) + POCTA_ARENA;
    addLog(`Získáváš <strong>${POCTA_ARENA}</strong> pocty`, 'log-w');
  }
  // odpočinek bludiště nastavil server při vstupu do místnosti
  if (won && lastFight && lastFight.view === 'dungeon') bludisteVyhra();
  wearEquipment();

  saveChar(); updateUI();

  // podklady pro zprávu z boje
  const [dmgMin, dmgMax] = playerDamageRange();
  const odmeny = won
    ? [`<b>${character.name}</b> získává ${currentEnemy.gold} zlata`,
       `<b>${character.name}</b> získává ${currentEnemy.exp} zkušenostních bodů`,
       ...(korist ? [`<b>${character.name}</b> nachází <b>${korist.name}</b>`] : [])]
    : [`<b>${character.name}</b> nezískává nic`,
       `Probral ses s ${character.health} životy`];

  lastReport = {
    won,
    kdy: Date.now(),
    kola: kolaLog.slice(),
    dmgHrac, dmgSouper,
    zpet: lastFight ? lastFight.view : 'expedition',
    odmeny,
    hrac: {
      name: character.name, title: character.class,
      class: character.class, gender: character.gender,
      level: character.level,
      hp: Math.max(0, character.health), maxHp: maxHP(),
      str: statTotal('strength'),  skl: statTotal('skill'),
      agi: statTotal('agility'),   def: statTotal('defense'),
      int: statTotal('intelligence'),
      armor: totalArmor(), dmg: dmgMin + ' - ' + dmgMax,
      pDouble: doubleChance(), pCrit: critChance(), pBlock: blockChance(),
    },
    souper: (() => {
      const ms = monsterStats(currentEnemy);
      return {
        name: currentEnemy.name, title: 'Nestvůra', img: currentEnemy.img,
        level: currentEnemy.level || 1,
        hp: Math.max(0, currentEnemy.hp), maxHp: currentEnemy.maxHp,
        str: currentEnemy.str, skl: ms.skill,
        agi: ms.agility,       def: currentEnemy.def,
        int: ms.intelligence,
        armor: currentEnemy.def * 3,
        dmg: Math.floor(currentEnemy.str * 1.1) + ' - ' + Math.floor(currentEnemy.str * 1.6),
        pDouble: enemyDoubleChance(currentEnemy),
        pCrit:   enemyCritChance(currentEnemy),
        pBlock:  enemyBlockChance(currentEnemy),
      };
    })(),
  };

  const box = document.getElementById('combatBtns');
  if (box) {
    box.innerHTML = `
      <div class="fight-result ${won ? 'win' : 'lose'}">
        <div class="fr-title">${won ? 'Vítězství!' : 'Porážka'}</div>
        <div class="fr-sub">${rewards}</div>
      </div>
      <button class="btn-green" onclick="openView('report')">Zpráva z boje</button>
      <button class="btn-back" onclick="openView('${lastFight ? lastFight.view : 'expedition'}')">Zpět</button>`;
  }

  // Na zprávu skoč jen když hráč pořád kouká na souboj – jinak
  // by ho to vytrhlo z toho, kam si mezitím odešel.
  if (volba('autoZprava')) {
    setTimeout(() => {
      if (!inCombat && document.getElementById('combatBtns')) openView('report');
    }, 1400);
  }
}

function refight() {
  if (!lastFight) return;
  beginFight(lastFight.enemy, lastFight.view);
}

function updateHpBars() {
  // Cache DOM elements to reduce queries
  const pb = document.getElementById('pHpBar');
  const eb = document.getElementById('eHpBar');
  const pt = document.getElementById('pHpTxt');
  const et = document.getElementById('eHpTxt');

  const pp = Math.max(0, Math.min(100, (character.health / maxHP() * 100).toFixed(1)));
  const ep = Math.max(0, Math.min(100, (currentEnemy.hp / currentEnemy.maxHp * 100).toFixed(1)));

  if (pb) pb.style.width = pp + '%';
  if (eb) eb.style.width = ep + '%';
  if (pt) pt.textContent = `${Math.max(0, character.health)}/${maxHP()}`;
  if (et) et.textContent = `${Math.max(0, currentEnemy.hp)}/${currentEnemy.maxHp}`;
}

function addLog(msg, cls) {
  const log = document.getElementById('combatLog');
  if (!log) return;
  log.innerHTML += `<div class="${cls}">${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

// ========== DUNGEON ==========

// ========== QUESTS ==========
function startQuest(id) {
  const q = QUESTS_DEF.find(x => x.id === id);
  if (!q) return;
  const now = Date.now();
  questData = { id: q.id, startTime: now, endTime: now + q.time*1000, done: false };
  localStorage.setItem('questData', JSON.stringify(questData));
  openView('quests');
  startQuestTimer();
}

function claimQuest(id) {
  const q = QUESTS_DEF.find(x => x.id === id);
  if (!q || !questData || questData.id !== id) return;
  questData.done = true;
  localStorage.setItem('questData', JSON.stringify(questData));
  character.gold += q.gold;
  character.experience += q.exp;
  checkLevelUp(); saveChar(); updateUI();
  alert(`🎉 Úkol splněn!\n+${q.gold} 💰\n+${q.exp} ⭐`);
  questData = null;
  localStorage.removeItem('questData');
  openView('quests');
}

function startQuestTimer() {
  if (activeQuestTimer) clearInterval(activeQuestTimer);
  activeQuestTimer = setInterval(() => {
    const cc = document.getElementById('centerContent');
    if (!cc) return;
    // překreslíme jen když jsou na obrazovce mise s běžícím časem
    if (cc.querySelector('.quest-list')) openView('quests');
  }, 5000);
}

function formatTime(secs) {
  if (secs <= 0) return '0s';
  const h = Math.floor(secs/3600);
  const m = Math.floor((secs%3600)/60);
  const s = secs%60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ========== SHOP ==========
function buyItem(uid) {
  let item = null;
  for (const id of Object.keys(MERCHANTS)) {
    const found = shopStock(id).find(x => x && x.uid === uid);
    if (found) { item = found; break; }
  }
  if (!item) return;
  if (character.gold < item.price) { toast('Nedostatek zlatých na ' + item.name); return; }
  if (inventory.length >= 24) { toast('Batoh je plný!'); return; }
  character.gold -= item.price;
  takeFromStock(uid);              // kus je jedinečný, z pultu zmizí
  // staty se přičtou až při vybavení
  inventory.push({ ...item });
  localStorage.setItem('inv', JSON.stringify(inventory));
  saveChar(); updateUI();
  toast(`Zakoupeno: ${item.name} (−${item.price} zlatých)`);
  openView('shop');
}

// ========== TAVERN ==========

// ========== DAILY REWARD ==========
function claimDaily() {
  if (odmenaVybrana()) { toast('Dnešní odměnu už máš, další po půlnoci.'); return; }
  const o = dennyOdmenaCastka();
  character.gold += o.zlato;
  character.experience += o.exp;
  localStorage.setItem('lastDaily', dnesniDen());
  checkLevelUp(); saveChar(); updateUI();
  toast(`Denní odměna: +${o.zlato} zlata, +${o.exp} zkušeností.`);
  openView('city');
}

// ========== LEVEL UP ==========
// ========== ZKUŠENOSTI ==========
// Kolik zkušeností je potřeba z dané úrovně na další. Index = úroveň.
// Na 200. úrovni je strop, dál se nepostupuje.
const MAX_UROVEN = 200;
const XP_DO_DALSI = [
  null,
  100, 190, 310, 440, 600, 780, 980, 1200, 1450, 1750,
  2050, 2400, 2800, 3200, 3650, 4100, 4600, 5200, 5750, 6400,
  7050, 7800, 8550, 9350, 10200, 11100, 12100, 13100, 14100, 15200,
  16400, 17600, 18900, 20200, 21600, 23100, 24600, 26200, 27800, 29500,
  31300, 33100, 35000, 37000, 39100, 41200, 43400, 45700, 48100, 50500,
  53000, 55600, 58300, 61000, 63900, 66800, 69800, 72900, 76100, 79400,
  82800, 86300, 89800, 93500, 97300, 101000, 105000, 109000, 113500, 117500,
  122000, 126500, 131000, 135500, 140500, 145500, 150500, 155500, 161000, 166000,
  171500, 177500, 183000, 189000, 195000, 201000, 207000, 213500, 220000, 226500,
  233500, 240000, 247000, 254500, 261500, 269000, 276500, 284000, 292000, 300000,
  308000, 316500, 324500, 333500, 342000, 351000, 360000, 369000, 378000, 387500,
  397000, 407000, 417000, 427000, 437000, 447500, 458000, 469000, 480000, 491000,
  502000, 513500, 525000, 536500, 548500, 560500, 573000, 585500, 598000, 611000,
  623500, 637000, 650000, 663500, 677500, 691500, 705500, 719500, 734000, 749000,
  763500, 778500, 794000, 809500, 825000, 840500, 857000, 873000, 889500, 906000,
  923000, 940000, 957000, 974500, 992500, 1010000, 1028000, 1047000, 1065000, 1084000,
  1103000, 1122000, 1141000, 1161000, 1181000, 1201000, 1221000, 1242000, 1263000, 1284000,
  1305000, 1326000, 1348000, 1370000, 1392000, 1414000, 1437000, 1460000, 1483000, 1506000,
  1530000, 1554000, 1578000, 1602000, 1627000, 1652000, 1677000, 1702000, 1728000, 1753000,
  1779000, 1806000, 1832000, 1859000, 1886000, 1914000, 1942000, 1969000, 1998000,
];

// Kolik chce další úroveň; na stropu vrací nekonečno, takže
// checkLevelUp nikdy nepřeteče přes 200.
const xpNaDalsi = uroven =>
  uroven >= MAX_UROVEN ? Infinity : (XP_DO_DALSI[uroven] || 100);

function checkLevelUp() {
  let leveledUp = false;
  while (character.experience >= xpNaDalsi(character.level)) {
    const needed = xpNaDalsi(character.level);
    character.experience -= needed;
    character.level++;
    character.max_health += 10;
    character.health = maxHP();   // maxHP() už počítá i s odolností
    character.strength += 2;
    character.defense += 1;
    character.agility += 1;
    leveledUp = true;
  }
  if (leveledUp) {
    document.getElementById('newLevel').textContent = character.level;
    document.getElementById('levelUpModal').style.display = 'flex';
  }
}

// ========== SAVE ==========
async function saveChar() {
  // Do prohlizece ulozime vzdy a hned. Driv se to delalo az po
  // uspesnem ulozeni na server, takze kdyz server nedojel, prisel
  // hrac o postup uplne - po nacteni se vratila stara uroven.
  localStorage.setItem('character', JSON.stringify(character));

  try {
    await API.updateCharacter({
      level: character.level, experience: character.experience,
      health: character.health, max_health: character.max_health,
      gold: character.gold, strength: character.strength,
      defense: character.defense, agility: character.agility,
      skill: character.skill,
      pocta: character.pocta,
      emeralds: character.emeralds,
      intelligence: character.intelligence,
    });
    localStorage.removeItem('neulozeno');
  } catch (e) {
    // Server neodpovedel. Poznacime si to, at se to da poznat
    // a pri dalsim ulozeni zkusit znovu.
    localStorage.setItem('neulozeno', '1');
    console.error('Ulozeni na server selhalo, drzim to zatim v prohlizeci:', e);
  }
}

// ========== LEADERBOARD ==========
let leaderboardCache = null;
async function loadLeaderboard() {
  const lb = document.getElementById('leaderboard');
  if (!lb) return;

  if (!API.isLoggedIn()) {
    lb.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.78em;padding:10px;font-style:italic;">Přihlas se pro žebříček</div>';
    return;
  }

  try {
    const res = await API.getLeaderboard();
    // Avoid re-rendering if leaderboard hasn't changed
    if (leaderboardCache && JSON.stringify(leaderboardCache) === JSON.stringify(res.leaderboard)) return;
    leaderboardCache = res.leaderboard;

    if (!res.leaderboard || res.leaderboard.length === 0) {
      lb.innerHTML = character ? `
        <div class="lb-row lb-me">
          <span class="lb-rank">🥇</span>
          <span class="lb-name">${character.name} 👈</span>
          <span class="lb-lvl">Lv.${character.level}</span>
        </div>
        <div style="text-align:center;color:var(--text-dim);font-size:.72em;padding:6px;font-style:italic;">Jsi jediný hráč!</div>
      ` : '<div style="text-align:center;color:var(--text-dim);font-size:.78em;padding:10px;">Zatím žádní hráči</div>';
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    lb.innerHTML = res.leaderboard.map((p, i) => {
      const isMe = character && p.name === character.name;
      return `<div class="lb-row ${isMe ? 'lb-me' : ''}">
        <span class="lb-rank">${medals[i] || (i+1)+'.'}</span>
        <span class="lb-name">${p.name}${isMe ? ' 👈' : ''}</span>
        <span class="lb-lvl">Lv.${p.level}</span>
      </div>`;
    }).join('');
  } catch(e) {
    if (character) {
      lb.innerHTML = `
        <div class="lb-row lb-me">
          <span class="lb-rank">🥇</span>
          <span class="lb-name">${character.name} 👈</span>
          <span class="lb-lvl">Lv.${character.level}</span>
        </div>
        <div style="text-align:center;color:var(--text-dim);font-size:.72em;padding:6px;font-style:italic;">Offline mód</div>
      `;
    } else {
      lb.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.78em;padding:10px;">Nelze načíst</div>';
    }
  }
}

// ========== LOGOUT ==========
function logout() {
  API.clearToken();
  localStorage.removeItem('character');
  window.location.href = 'index.html';
}



// ========== BODY VÝPRAVY A ODPOČINEK ==========
// Odmenu za vyhrany souboj pripisuje server. Posilame jen to, KOHO
// hrac porazil - vysi urcuje server, aby ji neslo nafouknout.
async function pripisOdmenu(view, souper) {
  const druh = view === 'dungeon' ? 'dungeon' : view === 'arena' ? 'arena' : 'exped';
  const lok = EXPEDITIONS.find(e => e.id === currentExped);
  const poradi = lok ? Math.max(0, lok.monsters.findIndex(m => m.name === (souper && souper.name))) : 0;

  try {
    const o = await API.gameReward({
      druh,
      urovenLokace: lok ? lok.minLevel : (character.level || 1),
      poradi,
    });
    if (typeof o.gold === 'number')       character.gold = o.gold;
    if (typeof o.experience === 'number') character.experience = o.experience;
    checkLevelUp(); updateUI();

    if (o.paladin && o.zlato && o.zlato.bonus) {
      addLog(`Paladin: +${o.zlato.bonus} zlata a +${o.exp.bonus} zkušeností navíc`, 'log-w');
    }
  } catch (e) {
    // Kdyz server neodpovi, odmenu nepripisujeme - jinak by ji hrac
    // dostal dvakrat, az se spojeni obnovi.
    toast('Odměnu se nepodařilo připsat, zkus to za chvíli.');
  }
}

// ========== STAV ZE SERVERU ==========
// O bodech, odpočtech i členství Paladina rozhoduje server. Hra si
// drží poslední odpověď a čas, kdy dorazila, aby šly odpočty
// dopočítat mezi dotazy. Sama nic z toho nepočítá.
let serverStav = null;
let serverStavKdy = 0;
let serverNedostupny = false;

async function nactiServerStav() {
  if (!jsemSpravce) overSpravce();          // jednou za nacteni stranky
  try {
    serverStav = await API.gameState();
    serverStavKdy = Date.now();
    serverNedostupny = false;
  } catch (e) {
    serverNedostupny = true;
  }
  return serverStav;
}

const odPosledni = () => Date.now() - serverStavKdy;

// Členství potvrzuje server. Když neodpověděl, Paladin neplatí —
// lepší výhodu nedat, než ji dát někomu, kdo na ni nemá nárok.
const jePaladin = () => !!(serverStav && serverStav.paladin && serverStav.paladin.aktivni);

const paladinDo = () => (serverStav && serverStav.paladin && serverStav.paladin.do)
  ? new Date(serverStav.paladin.do).getTime() : 0;

function paladinZbyva() {
  const ms = paladinDo() - Date.now();
  if (ms <= 0) return '';
  const dni = Math.floor(ms / 86400000);
  const hod = Math.floor(ms % 86400000 / 3600000);
  return dni ? dni + ' dní a ' + hod + ' h' : hod + ' h';
}

// Než dorazí nastavení ze serveru, platí tyhle hodnoty.
const NASTAVENI_ZALOHA = {
  paladin_gold_bonus_percent: 10, paladin_xp_bonus_percent: 10,
  normal_expedition_points_max: 12, paladin_expedition_points_max: 30,
  normal_labyrinth_points_max: 12, paladin_labyrinth_points_max: 30,
  paladin_free_merchant_refreshes_per_day: 1,
  paladin_expedition_time_multiplier: 0.5, paladin_labyrinth_time_multiplier: 0.5,
  paladin_arena_cooldown_multiplier: 0.5, paladin_circus_turma_cooldown_multiplier: 0.5,
  paladin_price_emeralds: 30, paladin_duration_days: 14,
};
const palNastaveni = klic => {
  const z = serverStav && serverStav.config && serverStav.config[klic];
  return (z === undefined || z === null) ? NASTAVENI_ZALOHA[klic] : Number(z);
};

// ---- body a odpočty ze serverového stavu ----
function points(druh) {
  const b = serverStav && serverStav.body && serverStav.body[druh];
  return b ? b.body : 0;
}

function stropBodu(druh) {
  const b = serverStav && serverStav.body && serverStav.body[druh];
  if (b) return b.strop;
  return palNastaveni(druh === 'dungeon' ? 'normal_labyrinth_points_max' : 'normal_expedition_points_max');
}

function cdLeft(druh) {
  const o = serverStav && serverStav.odpocty && serverStav.odpocty[druh];
  return o ? Math.max(0, o - odPosledni()) : 0;
}

function regenLeft(druh) {
  const b = serverStav && serverStav.body && serverStav.body[druh];
  return b ? Math.max(0, b.doDalsiho - odPosledni()) : 0;
}

// Bod utrácí a odpočinek nastavuje server; vrací true, když akce prošla.
async function spendPoint(druh) {
  try {
    const odpoved = await API.gameSpend(druh);
    await nactiServerStav();
    refreshExpedUI();
    return !!odpoved.ok;
  } catch (e) {
    const z = (e && e.message) || '';
    if (/odpo/i.test(z))      toast('Ještě si odpočiň.');
    else if (/bod/i.test(z))  toast('Došly body. Další se doplní za 10 minut.');
    else                      toast('Server neodpověděl, zkus to znovu.');
    await nactiServerStav();
    refreshExpedUI();
    return false;
  }
}

const expedPoints     = () => points('exped');
const spendExpedPoint = () => spendPoint('exped');     // vrací Promise
const expedCdLeft     = () => cdLeft('exped');

// Nákup členství. Smaragdy odečítá a členství prodlužuje server —
// hra si částku nepočítá sama, aby ji nešlo obejít.
async function kupPaladina() {
  const cena = palNastaveni('paladin_price_emeralds');
  const dni  = palNastaveni('paladin_duration_days');
  if (!confirm('Stát se Paladinem na ' + dni + ' dní za ' + cena + ' smaragdů?')) return;

  try {
    const odpoved = await API.paladinBuy();
    if (typeof odpoved.emeralds === 'number') character.emeralds = odpoved.emeralds;
    await nactiServerStav();
    updateUI(); openView('premium');
    toast('Jsi Paladin na dalších ' + (odpoved.dni || dni) + ' dní.');
  } catch (e) {
    const z = (e && e.message) || '';
    toast(/smaragd/i.test(z) ? ('Na Paladina potřebuješ ' + cena + ' smaragdů.')
                             : 'Nákup se nepovedl, zkus to znovu.');
  }
}


const fmtSec = ms => Math.ceil(ms / 1000) + ' s';

// čas do dalšího bodu

// obnoví ukazatele bodů a tlačítka Útok
function refreshExpedUI() {
  if (!character) return;

  const pts = points('exped');
  const el  = document.getElementById('expedPts');
  if (el) el.textContent = pts + ' / ' + stropBodu('exped');

  const dg = document.getElementById('dungeonPts');
  if (dg) dg.textContent = points('dungeon') + ' / ' + stropBodu('dungeon');

  // bludiště má vlastní odpočet, ale stejná pravidla jako výprava
  const dcd = cdLeft('dungeon');
  const dpts = points('dungeon');

  const db = document.getElementById('btnDungeon');
  if (db) {
    if (dcd > 0)        { db.disabled = true;  db.textContent = 'Odpočinek ' + fmtSec(dcd); }
    else if (dpts <= 0) { db.disabled = true;  db.textContent = 'Bez bodů'; }
    else                { db.disabled = false; db.textContent = 'Jít do bludiště'; }
  }

  const dgc = document.getElementById('dgCd');
  if (dgc) dgc.innerHTML = dcd > 0 ? 'Odpočinek: <b>' + fmtSec(dcd) + '</b>' : '';

  // otevřená místnost se během odpočinku zamkne
  document.querySelectorAll('.dg-room.otevrena').forEach(el => {
    if (dcd > 0) { el.classList.remove('otevrena'); el.classList.add('zamcena'); }
  });

  refreshBadges();
  refreshAdminLink();
  skryjZamcenaMista();

  const cd = expedCdLeft();

  // odpočet je vidět i na tlačítku v hlavičce, ať kvůli němu
  // nemusíš chodit až na výpravu
  const hb = document.getElementById('btnExped');
  if (hb) {
    if (cd > 0)        { hb.disabled = true;  hb.textContent = 'Odpočinek ' + fmtSec(cd); }
    else if (pts <= 0) { hb.disabled = true;  hb.textContent = 'Bez bodů'; }
    else               { hb.disabled = false; hb.textContent = 'Jít na výpravu'; }
  }

  document.querySelectorAll('.mon-attack').forEach(b => {
    if (cd > 0)        { b.disabled = true;  b.textContent = 'Odpočinek ' + fmtSec(cd); }
    else if (pts <= 0) { b.disabled = true;  b.textContent = 'Bez bodů'; }
    else if (b.dataset.locked !== '1') { b.disabled = false; b.textContent = 'Útok'; }
  });

  const info = document.getElementById('expedInfo');
  if (info) {
    const regen = regenLeft('exped');
    info.textContent =
      (cd > 0 ? 'Odpočinek: ' + fmtSec(cd) + ' · ' : '') +
      'Body výpravy: ' + pts + '/' + stropBodu('exped') +
      (regen > 0 ? ' · další za ' + Math.ceil(regen / 60000) + ' min' : '');
  }
}

setInterval(refreshExpedUI, 1000);

// ========== VÝPRAVY ==========
// Lokace se odemykají podle úrovně. Staty příšer se dopočítají
// z úrovně lokace, takže je balanc konzistentní napříč celou mapou.
const EXPED_DEFS = [
  // Cestovatel nahradi Poustevnika - bude jim jit prechazet mezi
  // lokacemi na vyssi urovni. Zatim jen zamceny panel.
  { id:'cestovatel', name:'Cestovatel', lvl:1, zamceno:true,
    desc:'', mobs:[] },

  { id:'chram', name:'Orčí Les',  lvl:1,
    desc:'Za městskými poli začíná les, kde se usadily orčí tlupy. Mezi kmeny visí kouř z ohnišť ' +
         'a na kůře jsou vyryté značky, kterým nikdo z Atén nerozumí. Kdo zajde příliš hluboko, ' +
         'potká nejdřív poskoky — a nakonec jejich velitele.',
    mobs:[['Orčí poskok','monsters/ork-poskok.jpg'],
          ['Naštvaný ork','monsters/ork-nastvany.jpg'],
          ['Orčí šamanka','monsters/ork-samanka.jpg'],
          ['Orčí velitel','monsters/ork-velitel.jpg']] },

  { id:'les', name:'Zelený les',       lvl:8,
    desc:'Kdo má rád zeleň a vůni bylin, brzy zjistí, že Zelený les je pro něj jako stvořený. ' +
         'Jenže z hloubi lesa se line hrůza. Vlci a medvědi tu začali chodit vzpřímeně a zabíjet ' +
         'poutníky. Kdo se odváží dovnitř v noci, obvykle najde magické přísady — hrozba smrti ' +
         'je ale pro průměrného občana příliš riskantní.',
    mobs:[['Lesní Vlk','wolf'],['Masožravka','plant'],['Zelený Had','snake'],['Starý Treant','treant']] },

  { id:'vesnice', name:'Zakletá vesnice', lvl:12,
    desc:'Vesnice, kterou proklely bohové. Domy stojí, ohně hoří, ale nikdo tu už roky nedýchá. ' +
         'Mrtví si pamatují své řemeslo — a své zbraně. Kdo sem vstoupí za soumraku, ' +
         'málokdy vyjde stejnou cestou.',
    mobs:[['Kostlivec Šermíř','skeleton-swordfighter'],['Kostlivec Lučištník','skeleton-archer'],
          ['Kostlivec Zloděj','skeleton-rogue'],['Kostlivec Mág','skeleton-mage']] },

  { id:'pahorek', name:'Pahorek Smrti',  lvl:16,
    desc:'Kopec, na kterém se pohřbívali ti, které nikdo nechtěl. Vzduch je tu studený i v poledne ' +
         'a stíny se hýbou samy od sebe. Říká se, že kdo dojde až na vrchol, uslyší své vlastní ' +
         'jméno vyslovené nahlas.',
    mobs:[['Stín','shadow'],['Přízrak','spirit'],['Bánší','banshee'],['Oživlá Zbroj','armor']] },

  { id:'vandalove', name:'Vesnice Vandalů', lvl:20,
    desc:'Tábor nájezdníků, kteří si z drancování udělali řemeslo. Kouř z ohňů je vidět na míle ' +
         'daleko a v ohradách stojí ukradený dobytek. Vandalové neberou zajatce — a ty berou ' +
         'jako obchodní příležitost.',
    mobs:[['Rudý Skřítek','red-imp'],['Černý Skřítek','black-imp'],['Vandalský Troll','troll'],
          ['Náčelník Skřetů','goblin']] },

  { id:'dul', name:'Důl',           lvl:24,
    desc:'Opuštěné šachty, kde se kdysi těžilo stříbro. Horníci zmizeli přes noc a zůstaly po nich ' +
         'jen krumpáče u vchodu. Z hloubky se ozývá klepání — pravidelné, jako by někdo ' +
         'stále pracoval.',
    mobs:[['Důlní Pavouk','spider'],['Slizoun Hlubin','slime'],['Kamenný Golem','golem'],
          ['Horský Troll','troll']] },

  { id:'teutoni', name:'Tábor Teutonů', lvl:28,
    desc:'Severní žoldáci, kteří se do Řecka dostali za zlatem a zůstali kvůli krvi. Jejich tábor ' +
         'je opevněný lépe než leckterá pevnost a jejich mrtví bojují dál — prý za ' +
         'nezaplacený žold.',
    mobs:[['Teutonský Válečník','skeleton-swordfighter'],['Železná Zbroj','armor'],
          ['Bojový Gryf','griffin'],['Stín Velitele','shadow']] },

  { id:'koman', name:'Hora Koman',    lvl:32,
    desc:'Nejvyšší štít v kraji. Vzduch je řídký, cesta zledovatělá a bouře přicházejí bez varování. ' +
         'Nahoře hnízdí gryfové a mezi skalami se pohybuje něco, co tam podle map být nemá.',
    mobs:[['Skalní Gryf','griffin'],['Přízrak Vrcholu','spirit'],['Ledový Troll','troll'],
          ['Skalní Golem','golem']] },

  { id:'draci', name:'Dračí ostatky', lvl:36,
    desc:'Kostra tvora tak velkého, že jeho žebra tvoří údolí. Mezi kostmi se usadili ti, ' +
         'kdo se živí zbytky jeho moci. Kdo přežije až sem, nebojuje o zlato — ' +
         'bojuje o jméno, které přežije jeho samotného.',
    mobs:[['Drakonid','snake'],['Mladý Drak','dragon'],['Kostěný Šaman','skeleton-mage'],
          ['Prastarý Drak','dragon']] },
];

// z definice udělá plnou lokaci i se staty příšer
const EXPEDITIONS = EXPED_DEFS.map(d => ({
  id: d.id, name: d.name, minLevel: d.lvl, desc: d.desc, zamceno: !!d.zamceno,
  monsters: d.mobs.map(([name, img], i) => {
    // Staty vycházejí z toho, co hráč na dané úrovni reálně uveze:
    //   životy   ≈ 8 kol, než ho hráč sundá
    //   síla     ≈ hráč vydrží ~15 kol
    const T = d.lvl;                 // úroveň lokace
    const k  = 1 + i * 0.18;         // výdrž pozdějších příšer roste znatelně
    const ks = 1 + i * 0.06;         // …ale jejich úder jen mírně, ať jsou porazitelné
    const r  = (v) => Math.max(1, Math.round(v));

    const hp   = 24 * T * k;              // 24 HP na úroveň lokace
    const str  = (9 + 1.2 * T) * ks;      // aby hráč neumíral, ale cítil to
    const def  = 2 * T * k;               // tlumí zásah o def/4
    const loot = 18 * Math.pow(T, 0.9) * k;

    return {
      name, // Kdyz uz je v definici hotova cesta i s priponou, bereme ji tak,
    // jak je - jinak by z toho vyslo monsters/monsters/....jpg.png
    img: /[\/.]/.test(img) ? img : `monsters/${img}.png`,
      lvl:  [d.lvl + i, d.lvl + i + 2],
      hp:   [r(hp * 0.85), r(hp * 1.15)],
      str:  r(str),
      def:  r(def),
      gold: [r(loot * 0.8), r(loot * 1.3)],
      exp:  [r(loot * 0.9), r(loot * 1.4)],
    };
  })
}));

let currentExped = 'chram';

// slovní hodnocení statu vůči hráči (jako v Gladiatus)
const RANK_WORDS = ['Bezcenný','Velmi slabý','Slabý','Neduživý','Normální','Silný','Velmi silný'];
function rankWord(val, ref) {
  if (!ref || ref <= 0) return 'Normální';
  const r = val / ref;
  if (r < 0.25) return RANK_WORDS[0];
  if (r < 0.50) return RANK_WORDS[1];
  if (r < 0.75) return RANK_WORDS[2];
  if (r < 0.95) return RANK_WORDS[3];
  if (r < 1.30) return RANK_WORDS[4];
  if (r < 1.80) return RANK_WORDS[5];
  return RANK_WORDS[6];
}

const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

function rollMonster(m) {
  const hp = rnd(m.hp);
  return {
    name: m.name, img: m.img, icon: '👹',
    level: rnd(m.lvl),
    hp, maxHp: hp,
    str: m.str, def: m.def,
    gold: rnd(m.gold), exp: rnd(m.exp),
  };
}

function monsterPortrait(m, cls) {
  return artImg(`img/${m.img}`, '👹', cls, m.name);
}

// seznam lokací do levého menu (druhá záložka s mapou)
function expedMenuHTML() {
  return EXPEDITIONS.map(e => {
    const locked = character && character.level < e.minLevel;
    return `<a class="sub-item ${locked ? 'locked' : ''} ${e.id === currentExped ? 'active' : ''}"
               onclick="${locked ? '' : `openExped('${e.id}')`}"
               title="${locked ? 'Odemkne se na úrovni ' + e.minLevel : 'Úroveň ' + e.minLevel + '+'}">
              ${e.name}
            </a>`;
  }).join('');
}



// ===== CVIČIŠTĚ =====
// Pořadí i názvy drží STAT_INFO, aby se Cvičiště a profil nemohly rozejít.
// Getter čte až při vykreslení, takže nevadí, že je STAT_INFO níž v souboru.
const TRAIN_POradi = ['strength', 'skill', 'agility', 'defense', 'intelligence'];
const TRAIN_STATS = TRAIN_POradi.map(key => ({
  key,
  get name()  { return STAT_INFO[key].nazev; },
  get popis() { return STAT_INFO[key].popis; },
}));

// cena roste s aktuální hodnotou, ať trénink není nekonečný zdroj
const trainCost = key => Math.floor(15 * character[key] + 25);

function training() {
  const zlato = character.gold;

  const rows = TRAIN_STATS.map(s => {
    const zaklad     = character[s.key];
    const zVybaveni  = equipBonus(s.key);
    const celkem     = zaklad + zVybaveni;
    const cena       = trainCost(s.key);
    const dost       = zlato >= cena;
    const pct        = Math.min(100, Math.round(celkem / 2));   // pruh, 200 = plný

    return `
      <div class="tr-row" data-tip="stat:${s.key}">
        <div class="tr-label">
          <span class="tr-name">${s.name}</span>
          <div class="tr-bar"><i style="width:${pct}%"></i></div>
        </div>

        <div class="tr-calc" title="základ + z vybavení">
          <b>${zaklad}</b><em>+</em><b>${zVybaveni}</b><em>=</em><b class="tr-total">${celkem}</b>
        </div>

        <div class="tr-cost ${dost ? '' : 'poor'}">
          ${cena.toLocaleString('cs-CZ')}
          <img class="res-ico" src="img/ui/coin.png" alt="zlata">
        </div>

        <button class="tr-plus" ${dost ? '' : 'disabled'}
                onclick="trainStat('${s.key}')"
                title="Trénovat ${s.name} za ${cena} zlata">+</button>
      </div>`;
  }).join('');

  // Vse je v jednom ramu: nahore obrazek a popis, dole radky vlastnosti.
  // Driv byl popis ve zvlastnim panelu, takze na kresbu ramu nesedel.
  return `
  <div class="tr-panel">
    <div class="tr-intro">
      <!-- obrazek cviciste je namalovany primo v ramu, nic sem nekreslime -->
      <div class="tr-portrait"></div>
      <div class="tr-text">
        <p>
          Jakmile vstoupíš na cvičiště arény, spatříš několik gladiátorů,
          kteří zlepšují své bojové schopnosti. Pozoruje je veterán z římské
          legie a čas od času jim dá nějakou radu.
        </p>
        <p><em>Zde můžeš zlepšit své válečnické schopnosti.</em></p>
      </div>
    </div>

    <div class="tr-list">${rows}</div>

    <div class="tr-foot">
      Tvé zlato: <b>${zlato.toLocaleString('cs-CZ')}</b>
      <img class="res-ico" src="img/ui/coin.png" alt="zlata">
    </div>
  </div>`;
}

function trainStat(key) {
  const cost = trainCost(key);
  if (character.gold < cost) { toast('Na trénink ti chybí zlato.'); return; }
  character.gold -= cost;
  character[key] += 1;
  const label = (TRAIN_STATS.find(s => s.key === key) || {}).name || key;
  toast(`${label} +1 (−${cost} zlata)`);
  saveChar(); updateUI();
  openView('training');
}

// sekce, které zatím nejsou hotové
function lockedSoon(nazev) {
  return `
  <div class="coming-soon">
    <div class="cs-icon">🔒</div>
    <h2>${nazev}</h2>
    <p>Tuhle část Olympu teprve stavíme.</p>
  </div>`;
}
const work    = () => lockedSoon('Práce');
// ========== PRÉMIUM: PALADIN ==========
// Paladin je casove predplatne za smaragdy. Vyhody zatim nejsou
// domluvene, takze je panel necha otevrene misto toho, aby sliboval
// neco, co hra nedela.
// Výhody Paladina. Čísla se berou z nastavení, ne z textu —
// když je admin změní, panel je ukáže sám.
function paladinVyhody() {
  const pct = k => Math.round((1 - palNastaveni(k)) * 100);
  return [
    { znak: '🗺️', text: `O ${pct('paladin_expedition_time_multiplier')} % kratší odpočinek po výpravě` },
    { znak: '🏰', text: `O ${pct('paladin_labyrinth_time_multiplier')} % kratší odpočinek v bludišti` },
    { znak: '⚔️', text: `O ${pct('paladin_arena_cooldown_multiplier')} % kratší odpočinek v aréně` },
    { znak: '🛡️', text: `O ${pct('paladin_circus_turma_cooldown_multiplier')} % kratší odpočinek v Circus Turma` },
    { znak: '💰', text: `+${palNastaveni('paladin_gold_bonus_percent')} % zlata z odměn` },
    { znak: '✦',  text: `+${palNastaveni('paladin_xp_bonus_percent')} % zkušeností z odměn` },
    { znak: '🔄', text: `${palNastaveni('paladin_free_merchant_refreshes_per_day')}× denně obnova zboží zdarma` },
    { znak: '🗺️', text: `${palNastaveni('paladin_expedition_points_max')} bodů výpravy místo ${palNastaveni('normal_expedition_points_max')}` },
    { znak: '🏰', text: `${palNastaveni('paladin_labyrinth_points_max')} bodů bludiště místo ${palNastaveni('normal_labyrinth_points_max')}` },
  ];
}

function premium() {
  const aktivni = jePaladin();
  const mam = character.emeralds || 0;
  const cena = palNastaveni('paladin_price_emeralds');
  const dni  = palNastaveni('paladin_duration_days');

  const vyhody = paladinVyhody().map(v => `
    <div class="pal-vyhoda ${aktivni ? 'ma' : ''}">
      <span class="pv-znak">${v.znak}</span>
      <span class="pv-text">${v.text}</span>
    </div>`).join('');

  return `
  <div class="panel">
    <div class="panel-header">Prémium</div>
    <div class="panel-body">

      <div class="pal-karta ${aktivni ? 'aktivni' : ''}">
        <div class="pal-znak">${aktivni ? '🎖' : '🛡'}</div>

        <div class="pal-text">
          <div class="pal-nadpis">
            ${aktivni ? 'Jsi Paladin' : 'Chceš se stát Paladinem?'}
          </div>
          <div class="pal-popis">
            ${aktivni
              ? `Zbývá ti <b>${paladinZbyva()}</b>. Další nákup se přičte k tomu, co ti zůstalo.`
              : `<b>${dni} dní</b> za <b>${cena} smaragdů</b>.`}
          </div>
        </div>

        <div class="pal-akce">
          <div class="pal-stav">
            Máš <b>${mam}</b>
            <img class="res-ico" src="img/ui/gem.png" alt="smaragdů">
          </div>
          <button class="btn-green" ${mam >= cena ? '' : 'disabled'} onclick="kupPaladina()">
            ${aktivni ? 'Prodloužit' : 'Stát se Paladinem'}
          </button>
        </div>
      </div>

      <div class="pal-nadpis-vyhod">Co Paladin dává</div>
      <div class="pal-vyhody">${vyhody}</div>

      ${serverNedostupny
        ? '<p class="hall-note">Server neodpovídá, takže tu vidíš výchozí hodnoty a členství se nedá koupit.</p>'
        : ''}

    </div>
  </div>`;
}


// ========== ŽIVOTNOST PŘEDMĚTŮ ==========
// Zničený kus zůstane nasazený, ale nedává žádné bonusy,
// dokud ho hráč nenechá spravit v Kovárně.
const isBroken = it => !!(it && it.durMax && it.dur <= 0);

// O kolik smí být kus nad hráčem, aby ho ještě unesl.
const LVL_TOLERANCE = 5;
const maxNositelnaUroven = () => (character ? character.level : 1) + LVL_TOLERANCE;
const uneseKus = it => !it || !it.lvl || it.lvl <= maxNositelnaUroven();

const DUR_WEAR_MIN = 2;   // ubere se po každém boji
const DUR_WEAR_MAX = 4;

function wearEquipment() {
  const znicene = [];
  for (const it of Object.values(equipped)) {
    if (!it || !it.durMax) continue;
    const pred = it.dur;
    const ubylo = DUR_WEAR_MIN + Math.floor(Math.random() * (DUR_WEAR_MAX - DUR_WEAR_MIN + 1));
    it.dur = Math.max(0, it.dur - ubylo);
    if (pred > 0 && it.dur === 0) znicene.push(it.name);
  }
  localStorage.setItem('eqp', JSON.stringify(equipped));
  if (znicene.length) toast('Opotřebením se zničilo: ' + znicene.join(', '));
}

// cena opravy roste s chybějící životností a hodnotou kusu
function repairCost(it) {
  if (!it || !it.durMax || it.dur >= it.durMax) return 0;
  const chybi = (it.durMax - it.dur) / it.durMax;
  return Math.max(1, Math.ceil(chybi * (it.price || 50) * 0.6));
}

// všechny kusy, které jde spravit (nasazené i v batohu)
function repairable() {
  const out = [];
  for (const [slot, it] of Object.entries(equipped)) {
    if (it && it.durMax && it.dur < it.durMax) out.push({ it, kde: 'eq', ref: slot });
  }
  inventory.forEach((it, i) => {
    if (it && it.durMax && it.dur < it.durMax) out.push({ it, kde: 'inv', ref: String(i) });
  });
  return out;
}

function repairItem(kde, ref) {
  const it = kde === 'eq' ? equipped[ref] : inventory[+ref];
  if (!it) return;
  const cena = repairCost(it);
  if (cena <= 0) return;
  if (character.gold < cena) { toast(`Na opravu ${it.name} ti chybí zlato.`); return; }

  character.gold -= cena;
  it.dur = it.durMax;
  toast(`${it.name} spraven (−${cena} zlata)`);
  persist();
  openView('forge');
}

function repairAll() {
  const kusy = repairable();
  if (!kusy.length) { toast('Není co spravovat.'); return; }

  const celkem = kusy.reduce((a, x) => a + repairCost(x.it), 0);
  if (character.gold < celkem) { toast(`Na kompletní opravu potřebuješ ${celkem} zlata.`); return; }

  character.gold -= celkem;
  kusy.forEach(x => { x.it.dur = x.it.durMax; });
  toast(`Spraveno ${kusy.length} kusů (−${celkem} zlata)`);
  persist();
  openView('forge');
}

// ===== KOVÁRNA =====
function forge() {
  // Kovarna zatim neni hotova - lepsi to rict rovnou nez predstirat.
  return lockedSoon('Kovárna');
}
// Barva podle toho, jak je kus opotrebeny.
const durClass = pct => pct === 0 ? 'dur-zero' : pct < 25 ? 'dur-low' : pct < 60 ? 'dur-mid' : 'dur-full';


// ========== ZPRAVA Z BOJE ==========
let lastReport = null;   // { won, odmeny, hrac, souper, kola, staty }

// Prubeh souboje po kolech - jeden zaznam na kolo, aby slo ve zprave
// ukazat, co se v nem stalo obema stranam.
let kolaLog = [], koloCislo = 0, dmgHrac = 0, dmgSouper = 0;

function novyZaznamBoje() { kolaLog = []; koloCislo = 0; dmgHrac = 0; dmgSouper = 0; }

const blokovan0 = (blokoval, edmg, eRany) =>
  (blokoval ? 'blokováno · ' : '') + `utržil <b>${edmg}</b> poškození` +
  (eRany > 1 ? ' (dvojitý zásah)' : '');
function zapisKolo(kdo, text) {
  let k = kolaLog[koloCislo - 1];
  if (!k) { k = kolaLog[koloCislo - 1] = { cislo: koloCislo, hrac: '', souper: '' }; }
  k[kdo] = text;
}

// srovnávací tabulka statů — zrcadlená, aby stály proti sobě
function reportStats(s, mirror) {
  const STROP = 400;   // kam až sahá pruh u vlastností
  const bar = (v, m) => `<div class="rs-bar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div>`;

  const radek = (jmeno, hodnota, pruh) => mirror
    ? `<div class="rs-row"><b>${hodnota}</b>${pruh || '<span></span>'}<span>${jmeno}</span></div>`
    : `<div class="rs-row"><span>${jmeno}</span>${pruh || '<span></span>'}<b>${hodnota}</b></div>`;

  const pct = v => (v * 100).toFixed(0) + ' %';

  return `
    <div class="rs-table ${mirror ? 'mirror' : ''}">
      ${radek('Úroveň', s.level)}
      ${radek('Životy', s.hp + ' / ' + s.maxHp, bar(s.hp, s.maxHp))}
      ${radek('Síla', s.str, bar(s.str, STROP))}
      ${radek('Dovednost', s.skl, bar(s.skl, STROP))}
      ${radek('Obratnost', s.agi, bar(s.agi, STROP))}
      ${radek('Odolnost', s.def, bar(s.def, STROP))}
      ${radek('Inteligence', s.int, bar(s.int, STROP))}
      <div class="rs-gap"></div>
      ${radek('Zbroj', s.armor)}
      ${radek('Poškození', s.dmg)}
      <div class="rs-gap"></div>
      ${radek('Dvojitý zásah', pct(s.pDouble))}
      ${radek('Kritický zásah', pct(s.pCrit))}
      ${radek('Zablokování', pct(s.pBlock))}
    </div>`;
}

function reportFighter(s, mirror) {
  const portret = s.img
    ? `<img class="ico rf-img" src="img/${s.img}" alt="${s.name}" data-emoji="👹" data-try="svg" onerror="iconFallback(this)">`
    : avatarProUroven(s.level, 'rf-img');   // ikonka podle urovne, ne stara kreslena
  return `
    <div class="rf-card">
      <div class="rf-name">${s.name}</div>
      <div class="rf-title">${s.title}</div>
      <div class="rf-frame">${portret}</div>
    </div>`;
}

function fightReport() {
  const r = lastReport;
  if (!r) return `<div class="coming-soon"><div class="cs-icon">⚔</div><h2>Žádný boj</h2><p>Nejdřív někoho vyzvi na výpravě.</p></div>`;

  const odmeny = r.odmeny.map(o => `<div class="rw-row">${o}</div>`).join('');

  return `
  <div class="fight-report">

    <div class="fr-banner ${r.won ? 'win' : 'lose'}">
      <button class="fr-back" onclick="openView('${r.zpet}')">◀</button>
      <span>${r.won ? 'Vítěz: ' + r.hrac.name : 'Poražen: ' + r.hrac.name}</span>
    </div>

    <div class="rw-box">
      <div class="rw-head">Odměna</div>
      ${odmeny}
    </div>

    <div class="rf-row">
      ${reportFighter(r.hrac, false)}
      <div class="rf-vs">VS</div>
      ${reportFighter(r.souper, true)}
    </div>

    <div class="rs-row-wrap">
      ${reportStats(r.hrac, false)}
      ${reportStats(r.souper, true)}
    </div>

    <div class="panel fr-panel">
      <div class="panel-header">Statistiky – ${cas(r.kdy)}</div>
      <div class="panel-body">
        <table class="fr-stats">
          <thead>
            <tr><th>Jméno</th><th>Způsobené zranění</th><th>Životy</th></tr>
          </thead>
          <tbody>
            <tr><td class="fs-nm">${r.hrac.name}</td><td>${r.dmgHrac}</td><td>${r.hrac.hp}</td></tr>
            <tr><td class="fs-nm">${r.souper.name}</td><td>${r.dmgSouper}</td><td>${r.souper.hp}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel fr-panel">
      <div class="panel-header">Zpráva z boje</div>
      <div class="panel-body">
        ${r.kola.length ? r.kola.map(k => `
          <div class="fr-kolo">Kolo ${k.cislo}</div>
          <div class="fr-akce"><span>${r.souper.name} zasáhl ${r.hrac.name}.</span><b>${k.souper || 'minul'}</b></div>
          <div class="fr-akce"><span>${r.hrac.name} zasáhl ${r.souper.name}.</span><b>${k.hrac || 'minul'}</b></div>
        `).join('') : '<p class="hall-note">Souboj skončil dřív, než padla rána.</p>'}
      </div>
    </div>

    <div class="fr-actions">
      <button class="btn-green" onclick="refight()">Bojovat znovu</button>
      <button class="btn-back" onclick="openView('${r.zpet}')">Zpět</button>
    </div>
  </div>`;
}


// ========== KOŘIST, ZÁZNAMY A ZPRÁVY ==========
// Vše se drží v prohlížeči; čísla u ikonek v hlavičce ukazují,
// kolik nepřečtených položek na hráče čeká.

const NOVINKY = [
  { datum:'09.08.2026', text:'Vlastnosti přepracovány. Dovednost dává dvojité zásahy, Obratnost je blokuje, Odolnost přidává životy.' },
  { datum:'09.08.2026', text:'Předměty mají životnost. Opravu zařídí Kovárna.' },
  { datum:'08.08.2026', text:'Výpravy stojí body a mezi nimi si gladiátor musí odpočinout.' },
  { datum:'08.08.2026', text:'Každý předmět má vlastní vylosované vlastnosti.' },
];

const nactiSeznam = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
const ulozSeznam  = (k, v) => localStorage.setItem(k, JSON.stringify(v.slice(0, 60)));

let fightLog = nactiSeznam('fightLog');   // historie soubojů
let lootLog  = nactiSeznam('lootLog');    // co z výprav padlo
let inbox    = nactiSeznam('inbox');      // zprávy

// ---- kořist z výprav ----
const DROP_CHANCE = 0.22;

// Vybere šablonu přiměřenou úrovni příšery a vyrobí z ní konkrétní kus.
function rollLoot(enemy) {
  if (Math.random() > DROP_CHANCE) return null;

  const vse = Object.values(SHOP_ITEMS).flat().filter(t => slotForItem(t));
  const strop = (enemy.level || 1) + 3;
  const vhodne = vse.filter(t => Math.max(1, Math.round((t.price || 25) / 28)) <= strop);
  const zdroj = vhodne.length ? vhodne : vse;

  return rollItem(zdroj[Math.floor(Math.random() * zdroj.length)]);
}

function zapisSouboj(zaznam) { fightLog.unshift(zaznam); ulozSeznam('fightLog', fightLog); }
// Kořist nespadne rovnou do batohu – čeká v zásilkách,
// odkud si ji hráč vyzvedne nebo ji rovnou prodá.
const ZASILKA_DNI = 7;

function zapisKorist(zaznam) {
  zaznam.plati = Date.now() + ZASILKA_DNI * 86400000;
  lootLog.unshift(zaznam);
  ulozSeznam('lootLog', lootLog);
}

// vyhodí, co propadlo
function protridZasilky() {
  const ted = Date.now();
  const pred = lootLog.length;
  lootLog = lootLog.filter(z => !z.plati || z.plati > ted);
  if (lootLog.length !== pred) ulozSeznam('lootLog', lootLog);
  return pred - lootLog.length;
}

const zbyvaText = ms => {
  if (ms <= 0) return 'propadlo';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms % 86400000 / 3600000);
  const m = Math.floor(ms % 3600000 / 60000);
  return (d ? d + 'd ' : '') + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
};

// vyzvednutí a prodej
function vyzvedni(i) {
  const z = lootLog[i];
  if (!z) return;
  if (inventory.length >= BAG_SIZE) { toast('Batoh je plný.'); return; }
  inventory.push(z.kus);
  lootLog.splice(i, 1);
  ulozSeznam('lootLog', lootLog);
  persist();
  toast(`${z.kus.name} putuje do batohu.`);
  openView('loot');
}

function prodejZasilku(i) {
  const z = lootLog[i];
  if (!z) return;
  const got = sellPrice(z.kus);
  character.gold += got;
  lootLog.splice(i, 1);
  ulozSeznam('lootLog', lootLog);
  persist();
  toast(`${z.kus.name} prodán za ${got} zlata.`);
  openView('loot');
}

function prodejVse() {
  if (!lootLog.length) { toast('Zásilky jsou prázdné.'); return; }
  const celkem = lootLog.reduce((a, z) => a + sellPrice(z.kus), 0);
  const kolik = lootLog.length;
  character.gold += celkem;
  lootLog = [];
  ulozSeznam('lootLog', lootLog);
  persist();
  toast(`Prodáno ${kolik} kusů za ${celkem} zlata.`);
  openView('loot');
}

// ---- nepřečtené ----
const videno = k => parseInt(localStorage.getItem('videno_' + k), 10) || 0;
const oznacPrectene = k => { localStorage.setItem('videno_' + k, Date.now()); refreshBadges(); };

function nepreectene(k) {
  const od = videno(k);
  if (k === 'news')  return NOVINKY.filter(n => Date.parse(n.datum.split('.').reverse().join('-')) > od).length;
  if (k === 'fights') return fightLog.filter(z => z.kdy > od).length;
  if (k === 'inbox')  return inbox.filter(z => z.kdy > od).length;
  if (k === 'loot')   return lootLog.filter(z => z.kdy > od).length;
  return 0;
}

function refreshBadges() {
  const mapa = { news:'badgeNews', fights:'badgeFights', inbox:'badgeInbox', loot:'badgeLoot' };
  for (const [k, id] of Object.entries(mapa)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const n = nepreectene(k);
    el.textContent = n;
    el.style.display = n > 0 ? '' : 'none';
  }
}

const cas = ms => new Date(ms).toLocaleString('cs-CZ', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

// ---- jednotný rám pro tyto výpisy ----
function seznamPanel(nadpis, radky, prazdne) {
  return `
  <div class="panel">
    <div class="panel-header">${nadpis}</div>
    <div class="panel-body">
      ${radky.length ? `<div class="log-list">${radky.join('')}</div>`
                     : `<div class="coming-soon"><div class="cs-icon">📭</div><h2>Zatím prázdné</h2><p>${prazdne}</p></div>`}
    </div>
  </div>`;
}

// ---- novinky ----
function news() {
  oznacPrectene('news');
  return seznamPanel('Novinky', NOVINKY.map(n => `
    <div class="log-row">
      <div class="log-when">${n.datum}</div>
      <div class="log-text">${n.text}</div>
    </div>`), 'Zatím se nic nestalo.');
}

// ---- historie soubojů ----
function fights() {
  oznacPrectene('fights');
  return seznamPanel('Historie soubojů', fightLog.map(z => `
    <div class="log-row ${z.vyhra ? 'win' : 'lose'}">
      <div class="log-when">${cas(z.kdy)}</div>
      <div class="log-text">
        <b>${z.vyhra ? 'Vítězství' : 'Porážka'}</b> — ${z.soupeR}
        <span class="log-sub">${z.vyhra ? `+${z.zlato} zlata · +${z.exp} zkušeností` : 'bez odměny'}</span>
      </div>
    </div>`), 'Ještě jsi nebojoval.');
}

// ---- zprávy ----
function messages() {
  oznacPrectene('inbox');
  return seznamPanel('Zprávy', inbox.map(z => `
    <div class="log-row">
      <div class="log-when">${cas(z.kdy)}</div>
      <div class="log-text"><b>${z.od}</b><span class="log-sub">${z.text}</span></div>
    </div>`), 'Nikdo ti zatím nenapsal.');
}

// ---- zásilky (kořist z výprav) ----

// ---- filtrovani zasilek ----
const ZASILKA_FILTRY = [
  { key:'vse',    nazev:'Vše',       sedne: () => true },
  { key:'zbrane', nazev:'Zbraně',    sedne: it => slotForItem(it) === 'weapon' },
  { key:'zbroje', nazev:'Zbroje',    sedne: it => ['chest','helmet','gloves','boots','shield','belt'].includes(slotForItem(it)) },
  { key:'sperky', nazev:'Šperky',    sedne: it => ['ring','amulet'].includes(slotForItem(it)) },
  { key:'ostatni',nazev:'Ostatní',   sedne: it => !slotForItem(it) },
];

let zasilkaFiltr = 'vse';
let zasilkaStrana = 0;
const ZASILKA_NA_STRANU = SHOP_COLS * SHOP_ROWS;   // kolik se jich vejde na ram

function setZasilkaStrana(s) { zasilkaStrana = s; openView('loot'); }

const sedneFiltr = it => (ZASILKA_FILTRY.find(f => f.key === zasilkaFiltr) || ZASILKA_FILTRY[0]).sedne(it);

function setZasilkaFiltr(k) { zasilkaFiltr = k; zasilkaStrana = 0; openView('loot'); }

// Proda jen to, co je zrovna vyfiltrovane - jinak by filtr uspal
// pozornost a smazal i to, co hrac nevidi.
function prodejVybrane() {
  const vybrane = lootLog.filter(z => sedneFiltr(z.kus));
  if (!vybrane.length) { toast('Není co prodat.'); return; }
  const celkem = vybrane.reduce((a, z) => a + sellPrice(z.kus), 0);
  character.gold += celkem;
  lootLog = lootLog.filter(z => !vybrane.includes(z));
  ulozSeznam('lootLog', lootLog);
  persist();
  toast(`Prodáno ${vybrane.length} kusů za ${celkem} zlata.`);
  openView('loot');
}

function loot() {
  oznacPrectene('loot');
  const propadlo = protridZasilky();

  const vybrane = lootLog.filter(z => sedneFiltr(z.kus));
  const hodnota = vybrane.reduce((a, z) => a + sellPrice(z.kus), 0);

  const filtry = ZASILKA_FILTRY.map(fl =>
    `<button class="zf-btn ${zasilkaFiltr === fl.key ? 'active' : ''}"
             onclick="setZasilkaFiltr('${fl.key}')">${fl.nazev}</button>`).join('');

  const odsud = zasilkaStrana * ZASILKA_NA_STRANU;
  const naStrance = vybrane.slice(odsud, odsud + ZASILKA_NA_STRANU);

  // zalozky sedi na namalovanych v ramu
  const zalozky = [0, 1].map(s =>
    `<div class="pg-tab ${s === zasilkaStrana ? 'active' : ''}" onclick="setZasilkaStrana(${s})">${['I','II'][s]}</div>`
  ).join('');

  const policka = naStrance.map((z, i) => {
    const q = qualityOf(z.kus);
    const [w, h] = itemSize(z.kus);
    const idx = lootLog.indexOf(z);
    return `
      <div class="g-slot zasilka"
           style="grid-column:span ${w};grid-row:span ${h}"
           onclick="vyzvedni(${idx})"
           oncontextmenu="prodejZasilku(${idx});return false"
           data-tip="loot:${idx}">
        <span class="g-lvl" style="color:${q.color}">${z.kus.lvl || 1}</span>
        ${itemIcon(z.kus, 'g-ico')}
        <span class="z-cas">${zbyvaText((z.plati || 0) - Date.now())}</span>
      </div>`;
  }).join('');

  return `
  <div class="panel">
    <div class="panel-header">Zásilky</div>
    <div class="panel-body">

      <p class="hall-note">
        Co ti spadne na výpravě, počká tady ${ZASILKA_DNI} dní.
        Kliknutím si kus vezmeš do batohu, pravým tlačítkem ho rovnou prodáš.
        ${propadlo ? `<br><b>${propadlo}</b> zásilek mezitím propadlo.` : ''}
      </p>

      <div class="zf-row">${filtry}</div>

      <div class="zas-body">
        <div class="zas-sloupec">
          <div class="zas-nadpis">Zásilky</div>
          <div class="frame frame-shop">
            <div class="frame-tabs">${zalozky}</div>
            <div class="goods-grid">${policka}</div>
          </div>
        </div>

        <div class="zas-sloupec">
          <div class="zas-nadpis">Batoh — ${inventory.length} / ${BAG_SIZE}</div>
          ${bagFrameHTML('use')}
        </div>
      </div>

      <div class="zas-foot">
        <span>Vybráno: <b>${vybrane.length}</b> z ${lootLog.length}</span>
        <span>Hodnota při prodeji: <b>${hodnota.toLocaleString('cs-CZ')}</b>
              <img class="res-ico" src="img/ui/coin.png" alt="zlata"></span>
        <button class="btn-green" ${vybrane.length ? '' : 'disabled'} onclick="prodejVybrane()">Prodat vybrané</button>
      </div>

    </div>
  </div>`;
}


// ========== NASTAVENÍ ==========
// Volby se drží v prohlížeči; čtou je přímo místa, kterých se týkají.
const NASTAVENI = {
  rychlyBoj:   { popis:'Přeskakovat animace soubojů',        vychozi:false },
  autoZprava:  { popis:'Po souboji rovnou otevřít zprávu',   vychozi:true  },
};

const volba = k => {
  const v = localStorage.getItem('set_' + k);
  return v === null ? NASTAVENI[k].vychozi : v === '1';
};
function prepniVolbu(k) {
  localStorage.setItem('set_' + k, volba(k) ? '0' : '1');
  openView('settings');
}

function settings() {
  const radky = Object.entries(NASTAVENI).map(([k, n]) => `
    <div class="gl-row">
      <div class="gl-main"><div class="gl-nm">${n.popis}</div></div>
      <button class="btn-green set-toggle ${volba(k) ? 'on' : 'off'}"
              onclick="prepniVolbu('${k}')">${volba(k) ? 'Zapnuto' : 'Vypnuto'}</button>
    </div>`).join('');

  return `
  <div class="panel">
    <div class="panel-header">Nastavení</div>
    <div class="panel-body">
      <div class="gl-list">
        ${radky}
        <div class="gl-row">
          <div class="gl-main">
            <div class="gl-nm">Správcovská práva</div>
            <div class="gl-sub">Uděluje je server podle účtu, ve hře se zapnout nedají.</div>
          </div>
          <span class="set-stav ${jeAdmin() ? 'ano' : ''}">${jeAdmin() ? 'Máš je' : 'Nemáš'}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-header">Postava</div>
    <div class="panel-body">
      <p class="hall-note">
        Smazání začne novou postavu od první úrovně. Vybavení, batoh,
        zásilky i historie soubojů zmizí a nejde je vrátit.
      </p>
      <button class="btn-back" onclick="smazPostavu()">Smazat postavu a začít znovu</button>
    </div>
  </div>`;
}

function smazPostavu() {
  if (!confirm('Opravdu smazat postavu? Vybavení, zásilky i historie zmizí a nejde to vrátit.')) return;
  ['character','inv','eqp','lootLog','fightLog','inbox','statsFixed',
   'pts_exped','ptsAt_exped','pts_dungeon','ptsAt_dungeon','expedCdUntil',
   'expedPts','expedPtsAt','restockAt','lastDaily']
    .forEach(k => localStorage.removeItem(k));
  Object.keys(MERCHANTS).forEach(id => {
    localStorage.removeItem('stock_' + id);
    localStorage.removeItem('stockAt_' + id);
  });
  location.reload();
}

// ========== TRŽIŠTĚ A AUKČNÍ SÍŇ ==========
// Obojí stojí na obchodu mezi hráči, a ten zatím nemáme —
// není server, který by nabídky sdílel. Kupci v Městě fungují.
const market  = () => lockedSoon('Tržiště');
const auction = () => lockedSoon('Aukční síň');


// ========== ADMIN PANEL ==========
// POZOR: tohle je nástroj pro vývoj, ne ochrana.
// Přepínač je v prohlížeči, takže si ho může zapnout kdokoliv.
// Skutečná práva musí hlídat server, jinak jsou jen na oko.
// Spravcovska prava potvrzuje server. Prepinac v prohlizeci uz
// nerozhoduje o nicem - jen o tom, jestli je odkaz videt driv,
// nez dorazi odpoved.
let jsemSpravce = false;
const jeAdmin = () => jsemSpravce;

async function overSpravce() {
  try { await API.adminDashboard(); jsemSpravce = true; }
  catch (e) { jsemSpravce = false; }
  refreshAdminLink();
}


// odkaz v liště se ukáže jen když je režim zapnutý
function refreshAdminLink() {
  const a = document.getElementById('adminLink');
  if (a) a.style.display = jeAdmin() ? '' : 'none';
}

// ---- zásahy do postavy ----
function admSet(klic, hodnota) {
  const v = parseInt(hodnota, 10);
  if (isNaN(v) || v < 0) { toast('Zadej kladné číslo.'); return; }
  character[klic] = v;
  if (klic === 'level') character.experience = 0;
  saveChar(); updateUI(); openView('admin');
}

function admHeal() {
  character.health = maxHP();
  saveChar(); updateUI(); openView('admin');
  toast('Životy doplněny.');
}

function admBody() {
  ['exped', 'dungeon'].forEach(d => {
    localStorage.setItem('pts_' + d, stropBodu(d));
    localStorage.setItem('ptsAt_' + d, Date.now());
  });
  localStorage.removeItem('expedCdUntil');
  refreshExpedUI(); openView('admin');
  toast('Body doplněny, odpočinek zrušen.');
}

function admDejPredmet(idx) {
  const sablony = Object.values(SHOP_ITEMS).flat();
  const tpl = sablony[idx];
  if (!tpl) return;
  if (inventory.length >= BAG_SIZE) { toast('Batoh je plný.'); return; }
  inventory.push(rollItem(tpl));
  persist(); openView('admin');
  toast(tpl.name + ' přidán do batohu.');
}

function admDejKorist(kolik) {
  for (let i = 0; i < kolik; i++) {
    const sablony = Object.values(SHOP_ITEMS).flat().filter(t => slotForItem(t));
    const tpl = sablony[Math.floor(Math.random() * sablony.length)];
    zapisKorist({ kdy: Date.now(), kus: rollItem(tpl), od: 'Admin' });
  }
  openView('admin');
  toast(kolik + ' zásilek přidáno.');
}

function admNoveZbozi() {
  Object.keys(MERCHANTS).forEach(id => {
    localStorage.removeItem('stock_' + id);
    localStorage.removeItem('stockAt_' + id);
  });
  localStorage.removeItem('restockAt');
  openView('admin');
  toast('Zboží u všech kupců vyloosováno znovu.');
}

function admin() {
  // Kostru vykreslí správa z admin.js. Ovládání se věší až když
  // je kostra v dokumentu, proto to odložení.
  setTimeout(spustSpravu, 0);
  return spravaHTML();
}


// ========== BLUDIŠTĚ ==========
// Mapa propojených místností. Postupuje se jednou za druhou:
// otevřená je vždycky jen ta hned za poslední vyčištěnou.
// Souřadnice jsou v procentech, aby pod ně šlo podložit obrázek.

const DUNGEON_MISTNOSTI = [
  { x: 16, y: 74, popis: 'Vstupní síň' },
  { x: 14, y: 44, popis: 'Zatopená chodba' },
  { x: 38, y: 20, popis: 'Svatyně' },
  { x: 46, y: 52, popis: 'Kobka' },
  { x: 72, y: 24, popis: 'Jatka' },
  { x: 70, y: 66, popis: 'Trůnní sál' },
];

let dungeonRun = null;   // { patro, mistnosti[], postup, aktivni }

function ulozBludiste() {
  localStorage.setItem('dungeonRun', JSON.stringify(dungeonRun));
}

function nactiBludiste() {
  try { dungeonRun = JSON.parse(localStorage.getItem('dungeonRun') || 'null'); }
  catch (e) { dungeonRun = null; }
  return dungeonRun;
}

// Nové patro. Poslední místnost je vždycky boss, jedna po cestě je poklad.
function noveBludiste(patro) {
  const zaklad = EXPEDITIONS[Math.min(EXPEDITIONS.length - 1,
                    Math.floor((character.level - 1) / 4))];
  const pokladIdx = 2 + Math.floor(Math.random() * 2);

  dungeonRun = {
    patro,
    postup: 0,
    aktivni: null,
    mistnosti: DUNGEON_MISTNOSTI.map((m, i) => {
      const posledni = i === DUNGEON_MISTNOSTI.length - 1;
      const sablona = zaklad.monsters[Math.min(zaklad.monsters.length - 1,
                        Math.floor(i * zaklad.monsters.length / DUNGEON_MISTNOSTI.length))];
      return {
        ...m,
        typ: posledni ? 'boss' : (i === pokladIdx ? 'poklad' : 'nestvura'),
        hotovo: false,
        sablona,
      };
    }),
  };
  ulozBludiste();
}

async function vstupDoBludiste() {
  // server odecte bod a nastavi odpocinek; hlasku uz rekl spendPoint
  if (!await spendPoint('dungeon')) return;
  noveBludiste((dungeonRun ? dungeonRun.patro : 0) + 1);
  openView('dungeon');
}

function opustBludiste() {
  dungeonRun = null;
  localStorage.removeItem('dungeonRun');
  openView('dungeon');
  toast('Opustil jsi bludiště.');
}

// vejít do místnosti
function vejdiDo(i) {
  if (!dungeonRun) return;
  const m = dungeonRun.mistnosti[i];
  if (!m || m.hotovo) return;
  if (i !== dungeonRun.postup) { toast('Nejdřív projdi předchozí místnost.'); return; }

  const cd = cdLeft('dungeon');
  if (cd > 0) { toast('Ještě si odpočiň — zbývá ' + fmtSec(cd) + '.'); return; }

  if (m.typ === 'poklad') {
    const zlato = Math.round((30 + character.level * 12) * (0.8 + Math.random() * 0.6));
    character.gold += zlato;
    m.hotovo = true;
    dungeonRun.postup++;
    ulozBludiste(); saveChar(); updateUI(); openView('dungeon');
    toast(`V truhle bylo ${zlato} zlata.`);
    return;
  }

  dungeonRun.aktivni = i;
  ulozBludiste();

  const prisera = rollMonster(m.sablona);
  if (m.typ === 'boss') {           // boss je tvrdší a platí líp
    prisera.name = 'Pán ' + (prisera.name || 'bludiště');
    prisera.hp = Math.round(prisera.hp * 1.6);
    prisera.maxHp = prisera.hp;
    prisera.str = Math.round(prisera.str * 1.25);
    prisera.gold = Math.round(prisera.gold * 2.5);
    prisera.exp = Math.round(prisera.exp * 2.5);
  }
  beginFight(prisera, 'dungeon');
}

// po vyhraném boji v bludišti se místnost odemkne
function bludisteVyhra() {
  if (!dungeonRun || dungeonRun.aktivni == null) return;
  const m = dungeonRun.mistnosti[dungeonRun.aktivni];
  if (m) { m.hotovo = true; dungeonRun.postup++; }
  dungeonRun.aktivni = null;

  if (dungeonRun.postup >= dungeonRun.mistnosti.length) {
    const odmena = Math.round(120 + character.level * 45);
    character.gold += odmena;
    toast(`Bludiště zdoláno! Odměna ${odmena} zlata.`);
    saveChar(); updateUI();
  }
  ulozBludiste();
}

function dungeon() {
  nactiBludiste();

  if (!dungeonRun) {
    return `
    <div class="panel">
      <div class="panel-header">Bludiště</div>
      <div class="panel-body">
        <p class="hall-note">
          Pod městem se táhne soustava komor. Postupuje se jednou po druhé —
          v každé někdo čeká, poslední hlídá pán bludiště.
          Vstup stojí jeden bod bludiště.
        </p>
        <div class="dg-start">
          <div class="dg-info">Body bludiště: <b>${points('dungeon')}</b> / ${stropBodu('dungeon')}</div>
          <button class="btn-green" ${points('dungeon') > 0 ? '' : 'disabled'}
                  onclick="vstupDoBludiste()">Vstoupit do bludiště</button>
        </div>
      </div>
    </div>`;
  }

  const hotovo = dungeonRun.postup >= dungeonRun.mistnosti.length;

  const dgCd = cdLeft('dungeon');

  const mistnosti = dungeonRun.mistnosti.map((m, i) => {
    const otevrena = i === dungeonRun.postup && !hotovo && dgCd <= 0;
    const stav = m.hotovo ? 'hotova' : otevrena ? 'otevrena' : 'zamcena';
    const znak = m.hotovo ? '✓' : m.typ === 'boss' ? '☠' : m.typ === 'poklad' ? '⌘' : (i + 1);
    return `
      <div class="dg-room ${stav} ${m.typ}"
           style="left:${m.x}%;top:${m.y}%"
           ${otevrena ? `onclick="vejdiDo(${i})"` : ''}
           title="${m.popis}">
        <span class="dg-znak">${znak}</span>
        <span class="dg-popis">${m.popis}</span>
      </div>`;
  }).join('');

  // spojnice mezi místnostmi
  const cary = dungeonRun.mistnosti.slice(1).map((m, i) => {
    const a = dungeonRun.mistnosti[i], b = m;
    const dx = b.x - a.x, dy = b.y - a.y;
    const delka = Math.sqrt(dx * dx + dy * dy);
    const uhel = Math.atan2(dy, dx) * 180 / Math.PI;
    return `<div class="dg-cara ${i < dungeonRun.postup ? 'projita' : ''}"
                 style="left:${a.x}%;top:${a.y}%;width:${delka}%;transform:rotate(${uhel}deg)"></div>`;
  }).join('');

  return `
  <div class="panel">
    <div class="panel-header">Bludiště — ${dungeonRun.patro}. patro</div>
    <div class="panel-body">

      <div class="dg-lista">
        <span>Postup: <b>${dungeonRun.postup}</b> / ${dungeonRun.mistnosti.length}</span>
        <span>Body: <b>${points('dungeon')}</b> / ${stropBodu('dungeon')}</span>
        <span id="dgCd">${dgCd > 0 ? 'Odpočinek: <b>' + fmtSec(dgCd) + '</b>' : ''}</span>
        <button class="btn-back" onclick="opustBludiste()">Opustit</button>
      </div>

      <div class="dg-mapa">
        ${cary}
        ${mistnosti}
      </div>

      ${hotovo ? `
        <div class="dg-hotovo">
          <b>Patro vyčištěno.</b> Můžeš sestoupit hlouběji — další patro je těžší.
          <button class="btn-green" ${points('dungeon') > 0 ? '' : 'disabled'}
                  onclick="vstupDoBludiste()">Sestoupit do ${dungeonRun.patro + 1}. patra</button>
        </div>` : ''}

    </div>
  </div>`;
}

// ========== IKONKA POSTAVY PODLE ÚROVNĚ ==========
// Horní hranice patří ještě daný stupeň: na 13. úrovni platí 1-13lv,
// na 14. už 13-25lv.
const AVATAR_STUPNE = [
  { do: 13,       soubor: '1-13lv'   },
  { do: 25,       soubor: '13-25lv'  },
  { do: 40,       soubor: '25-40lv'  },
  { do: 60,       soubor: '40-60lv'  },
  { do: 70,       soubor: '60-70lv'  },
  { do: 85,       soubor: '70-85lv'  },
  { do: 100,      soubor: '85-100lv' },
  { do: Infinity, soubor: '100+lv'   },
];

const avatarSoubor = uroven =>
  AVATAR_STUPNE.find(s => (uroven || 1) <= s.do).soubor;

// Obrázek postavy pro danou úroveň; když chybí, spadne se na emoji.
function avatarProUroven(uroven, cls) {
  return artImg(`img/avatars/${avatarSoubor(uroven)}.jpg`, '🧑', cls || 'av-img', 'Postava');
}

// Portrét NPC nad jeho panelem, stejně jako ho mají kupci.
function npcPortret(klic) {
  return `<div class="npc-portret">${artImg('img/npc/' + klic + '.jpg', '', 'npc-img', '')}</div>`;
}

// ========== DALŠÍ MÍSTA VE MĚSTĚ ==========
// Některá se otevřou až na dané úrovni. Do té doby je hráč
// v nabídce vůbec nevidí.
const MISTA = [
  { klic:'prekupnik', nazev:'Překupník',          od:0   },
  { klic:'uschovna',  nazev:'Úschovna',           od:0   },
  { klic:'staj',      nazev:'Stáj',               od:0   },
  { klic:'spravce',   nazev:'Správce gladiátorů', od:20  },
  { klic:'kovar',     nazev:'Mistr kovář',        od:50  },
  { klic:'carodejka', nazev:'Čarodějnice',        od:75  },
  { klic:'hefaistos', nazev:'Héfaistos',          od:100 },
];

// Skryje z nabídky to, na co hráč ještě nemá úroveň.
function skryjZamcenaMista() {
  const uroven = (character && character.level) || 1;
  document.querySelectorAll('.sub-item[data-od]').forEach(el => {
    el.style.display = uroven >= Number(el.dataset.od) ? '' : 'none';
  });
}

// ---------- Překupník ----------
// Vykupuje cokoliv z batohu za 60 % ceny. Nic neprodává.
function prodejPrekupnikovi(i) {
  const it = inventory[i];
  if (!it) return;
  const got = sellPrice(it, VYKUP_PREKUPNIK);
  inventory.splice(i, 1);
  character.gold += got;
  persist(); updateUI();
  toast(`${it.name} prodán za ${got} zlata.`);
  openView('prekupnik');
}

function prekupnik() {
  const bezneKupci = Math.round(VYKUP_KUPEC * 100);
  const on = Math.round(VYKUP_PREKUPNIK * 100);

  const policka = inventory.map((it, i) => {
    const q = qualityOf(it);
    const [w, h] = itemSize(it);
    return `
      <div class="g-slot zasilka"
           style="grid-column:span ${w};grid-row:span ${h}"
           onclick="prodejPrekupnikovi(${i})"
           data-tip="inv:${i}">
        <span class="g-lvl" style="color:${q.color}">${it.lvl || 1}</span>
        ${itemIcon(it, 'g-ico')}
        <span class="z-cas">${sellPrice(it, VYKUP_PREKUPNIK)}</span>
      </div>`;
  }).join('');

  const celkem = inventory.reduce((a, it) => a + sellPrice(it, VYKUP_PREKUPNIK), 0);

  return `
  <div class="panel">
    <div class="panel-header">Překupník</div>
    <div class="panel-body">

      ${npcPortret('prekupnik')}

      <p class="hall-note">
        Vykoupí cokoliv za <b>${on} %</b> ceny — kupci ve městě dávají jen
        ${bezneKupci} %. Sám nic neprodává. Klikni na kus v batohu
        a máš zaplaceno; číslo v rohu je, co za něj dostaneš.
      </p>

      ${inventory.length ? `
        <div class="zas-wrap">
          <div class="frame frame-shop">
            <div class="goods-grid">${policka}</div>
          </div>
        </div>

        <div class="zas-foot">
          <span>V batohu: <b>${inventory.length}</b> / ${BAG_SIZE}</span>
          <span>Za všechno: <b>${celkem.toLocaleString('cs-CZ')}</b>
                <img class="res-ico" src="img/ui/coin.png" alt="zlata"></span>
          <button class="btn-green" onclick="prodejVsePrekupnikovi()">Prodat vše</button>
        </div>`
        : '<div class="coming-soon"><div class="cs-icon">🎒</div><h2>Batoh je prázdný</h2><p>Nemáš co prodat.</p></div>'}

    </div>
  </div>`;
}

function prodejVsePrekupnikovi() {
  if (!inventory.length) { toast('Batoh je prázdný.'); return; }
  const celkem = inventory.reduce((a, it) => a + sellPrice(it, VYKUP_PREKUPNIK), 0);
  const kolik = inventory.length;
  if (!confirm(`Prodat všech ${kolik} kusů za ${celkem} zlata?`)) return;

  character.gold += celkem;
  inventory = [];
  persist(); updateUI();
  toast(`Prodáno ${kolik} kusů za ${celkem} zlata.`);
  openView('prekupnik');
}

// Zatím jen zamčené panely - až budou hotová, nahradí se obsahem.
MISTA.forEach(m => {
  if (m.klic === 'prekupnik') return;      // ten už je hotový
  window[m.klic] = () => {
    const uroven = (character && character.level) || 1;
    const zamceno = m.od && uroven < m.od;

    return `
    <div class="panel">
      <div class="panel-header">${m.nazev}</div>
      <div class="panel-body">
        ${npcPortret(m.klic)}
        <div class="coming-soon">
          <div class="cs-icon">${zamceno ? '🔒' : '🛠'}</div>
          <h2>${m.nazev}</h2>
          <p>${zamceno
            ? `Otevře se na ${m.od}. úrovni. Teď jsi na ${uroven}.`
            : 'Tuhle část Olympu teprve stavíme.'}</p>
        </div>
      </div>
    </div>`;
  };
});

// ===== SÍŇ SLÁVY =====

// ========== ŽEBŘÍČEK ==========
let zebricek = null, zebricekChyba = null;

async function nactiZebricek() {
  try {
    const data = await API.getLeaderboard();
    zebricek = (data && data.leaderboard) || [];
    zebricekChyba = null;
  } catch (e) {
    zebricek = [];
    zebricekChyba = 'Server neodpovídá, žebříček teď nenačtu.';
  }
  if (posledniPohled === 'hall') openView('hall');
}

// ========== DENNÍ ODMĚNA ==========
// Den se pocita podle mistni pulnoci, takze se odmena obnovi
// prvni minutou noveho dne a ceka na prvni prihlaseni.
const dnesniDen = () => new Date().toLocaleDateString('sv-SE');   // RRRR-MM-DD
const odmenaVybrana = () => localStorage.getItem('lastDaily') === dnesniDen();

function dennyOdmenaCastka() {
  return { zlato: 50 + character.level * 15, exp: 20 + character.level * 8 };
}

function dennyOdmenaPanel() {
  const o = dennyOdmenaCastka();
  const hotovo = odmenaVybrana();
  return `
  <div class="panel">
    <div class="panel-header">Denní odměna</div>
    <div class="panel-body">
      <div class="dr-row">
        <div class="dr-text">
          ${hotovo
            ? 'Dnešní odměnu už máš. Další se objeví po půlnoci.'
            : `Za dnešní návštěvu arény ti náleží
               <b>${o.zlato}</b> zlata a <b>${o.exp}</b> zkušeností.`}
        </div>
        <button class="btn-green" ${hotovo ? 'disabled' : ''} onclick="claimDaily()">
          ${hotovo ? 'Vybráno' : 'Vyzvednout'}
        </button>
      </div>
    </div>
  </div>`;
}

// Po prihlaseni ukazeme odmenu rovnou, at na ni hrac nemusi hledat cestu.
function nabidniDenniOdmenu() {
  if (odmenaVybrana()) return;
  const o = dennyOdmenaCastka();
  toast(`Čeká na tebe denní odměna: ${o.zlato} zlata a ${o.exp} zkušeností.`);
  openView('city');            // odmena je v Meste, kam hrac stejne prijde
}

// Kdo je v zebricku rozkliknuty a co je napsane ve vyhledavani.
let hallVybrany = null;
let hallHledani = '';

function hallVyber(jmeno) { hallVybrany = jmeno; openView('hall'); }
function hallHledej(text) {
  hallHledani = text;
  const s = document.getElementById('hallSeznam');
  if (s) s.innerHTML = hallRadky();
}

// Pocta se ziskava vitezstvim v Arene a Circus Turma.
// V databazi pro ni zatim neni sloupec, takze u ostatnich hracu
// vychazi 0 - u sebe se bere ze sve postavy.
const POCTA_ARENA = 12;
const POCTA_TURMA = 20;

function hallPocta(h) {
  if (h.name === character.name) return character.pocta || 0;
  return h.pocta || 0;
}

const hallVybrane = () =>
  (zebricek || []).filter(h => !hallHledani ||
    h.name.toLowerCase().includes(hallHledani.toLowerCase()));

function hallRadky() {
  return hallVybrane().map(h => {
    const poradi = (zebricek || []).indexOf(h) + 1;
    const ja = h.name === character.name;
    const vybrany = h.name === (hallVybrany || character.name);
    return `
      <div class="hf-radek ${ja ? 'ja' : ''} ${vybrany ? 'vybrany' : ''}"
           onclick="hallVyber('${h.name.replace(/'/g, "\\'")}')">
        <span class="hf-poradi">${poradi}</span>
        <span class="hf-jmeno">${h.name}</span>
        <span class="hf-uroven">${h.level}</span>
        <span class="hf-exp">${hallPocta(h).toLocaleString('cs-CZ')}</span>
      </div>`;
  }).join('') || '<div class="hf-prazdno">Nikdo takový tu není.</div>';
}

function hallDetail() {
  const h = (zebricek || []).find(x => x.name === (hallVybrany || character.name))
         || (zebricek || [])[0];
  if (!h) return '<div class="hf-prazdno">Vyber gladiátora ze seznamu.</div>';

  // Zivoty pocitame stejne jako u vlastni postavy, at cisla sedi.
  const zivoty = (h.max_health || 100) + (h.defense || 0) * HP_ZA_ODOLNOST;
  const vl = (nazev, hodnota, popis) => `
    <div class="hf-vl">
      <div class="hf-vl-nazev">${nazev}</div>
      <div class="hf-vl-hod">${(hodnota || 0).toLocaleString('cs-CZ')}</div>
      <div class="hf-vl-popis">${popis}</div>
    </div>`;

  return `
    <div class="hf-portret">
      ${avatarProUroven(h.level, 'hf-img')}
      <div class="hf-jmenovka">
        <div class="hf-nadpis">${h.name}</div>
        <div class="hf-trida">${h.class || 'Gladiátor'}</div>
      </div>
    </div>
    <div class="hf-uroven-pas">Úroveň ${h.level}</div>
    <div class="hf-vlastnosti">
      ${vl('Síla', h.strength, 'poškození')}
      ${vl('Odolnost', h.defense, `životy ${zivoty.toLocaleString('cs-CZ')}`)}
      ${vl('Obratnost', h.agility, 'blokace')}
      ${vl('Inteligence', h.intelligence, 'kritický zásah')}
      ${vl('Pocta', hallPocta(h), 'z arény')}
      ${vl('Životy', zivoty, 'celkem')}
    </div>`;
}

function hall() {
  if (zebricek === null) nactiZebricek();

  const obsah =
      zebricek === null ? '<p class="hall-note">Načítám žebříček…</p>'
    : zebricekChyba     ? `<p class="hall-note">${zebricekChyba}</p>`
    : !zebricek.length  ? '<p class="hall-note">Zatím tu nikdo není.</p>'
    : `
      <div class="hf-telo">
        <div class="hf-sloupec">
          <div class="hf-hlava">
            <span class="hf-poradi">#</span>
            <span class="hf-jmeno">Jméno</span>
            <span class="hf-uroven">Úroveň</span>
            <span class="hf-exp">Pocta</span>
          </div>
          <div class="hf-seznam" id="hallSeznam">${hallRadky()}</div>
          <input class="hf-hledani" placeholder="Hledat jméno…"
                 value="${hallHledani}" oninput="hallHledej(this.value)">
        </div>
        <div class="hf-sloupec hf-detail">${hallDetail()}</div>
      </div>`;

  return `
  <div class="panel">
    <div class="panel-header">Síň slávy</div>
    <div class="panel-body">
      ${obsah}
      <div class="ar-foot">
        <button class="btn-green" onclick="zebricek=null; hallVybrany=null; openView('hall')">Načíst znovu</button>
      </div>
    </div>
  </div>`;
}

// ===== STATISTIKY =====
function stats() {
  const c = character;
  const [dmgMin, dmgMax] = playerDamageRange();
  const w = equipped.weapon;

  const cell = (label, val) => `<div class="stat-cell"><span class="sc-val">${val}</span><span class="sc-name">${label}</span></div>`;

  return `
  <div class="panel">
    <div class="panel-header">Statistiky – ${c.name}</div>
    <div class="panel-body">
      <div class="stats-grid">

        <div class="stats-block">
          <h3>Postava</h3>
          <div class="stat-cells">
            ${cell('Úroveň', c.level)}
            ${cell('Zkušenosti', c.experience + '/' + xpNaDalsi(c.level))}
            ${cell('Životy', c.health + '/' + maxHP())}
            ${cell('Zlato', c.gold)}
          </div>
        </div>

        <div class="stats-block">
          <h3>Vlastnosti</h3>
          <div class="stat-cells">
            ${cell('Síla', statTotal('strength'))}
            ${cell('Obrana', statTotal('defense'))}
            ${cell('Hbitost', statTotal('agility'))}
            ${cell('Inteligence', statTotal('intelligence'))}
          </div>
        </div>

        <div class="stats-block">
          <h3>Boj</h3>
          <div class="stat-cells">
            ${cell('Poškození', dmgMin + '-' + dmgMax)}
            ${cell('Zbraň', w ? w.name : 'Holé ruce')}
            ${cell('Zbroj', totalArmor())}
            ${cell('Vybaveno', Object.values(equipped).filter(Boolean).length + '/9')}
          </div>
        </div>

        <div class="stats-block">
          <h3>Výprava</h3>
          <div class="stat-cells">
            ${cell('Body výpravy', points('exped') + '/' + stropBodu('exped'))}
            ${cell('Odpočinek', Math.ceil(cdLeft('exped') / 1000) + ' s')}
            ${cell('Batoh', inventory.length + '/' + BAG_SIZE)}
            ${cell('Lokace', EXPEDITIONS.filter(e => c.level >= e.minLevel).length + '/' + EXPEDITIONS.length)}
          </div>
        </div>

      </div>
    </div>
  </div>`;
}


function expedition() {
  setTimeout(refreshExpedUI, 0);   // ať ukazatel nečeká na další tik
  const loc = EXPEDITIONS.find(e => e.id === currentExped) || EXPEDITIONS[0];
  currentExped = loc.id;

  // Cestovatel jeste neni hotovy, rikame to rovnou
  if (loc.zamceno) return lockedSoon(loc.name);

  const locked = character.level < loc.minLevel;

  const cards = loc.monsters.map((m, i) => `
    <div class="mon-card" data-tip="mon:${i}">
      <div class="mon-name">${m.name}</div>
      <div class="mon-frame">${monsterPortrait(m, 'mon-img')}</div>

      <button class="btn-green mon-attack" ${locked ? 'disabled data-locked="1"' : ''}
              onclick="attackMonster(${i})">Útok</button>


    </div>`).join('');

  return `
  <div class="shop2">
    <div class="s2tabs">
      <div class="s2tab active">${loc.name}</div>
      <div class="s2tab" onclick="openView('dungeon')">Bludiště</div>
    </div>

    <div class="exped-body">
      ${locked ? `<div class="exped-lock">Tato oblast se otevře na úrovni ${loc.minLevel}.</div>` : ''}
      <div class="exped-info" id="expedInfo"></div>

      <div class="mon-row">${cards}</div>

      <div class="exped-desc">
        <div class="exped-desc-title">Popis</div>
        <p>${loc.desc}</p>
      </div>

      ${combatPanelHTML()}
    </div>
  </div>`;
}

function openExped(id) {
  const e = EXPEDITIONS.find(x => x.id === id);
  if (!e) return;
  if (character.level < e.minLevel) { toast(`${e.name} se odemkne na úrovni ${e.minLevel}.`); return; }
  currentExped = id;
  openView('expedition');
}

async function attackMonster(i) {
  const loc = EXPEDITIONS.find(e => e.id === currentExped);
  if (!loc) return;
  if (character.level < loc.minLevel) { toast(`Potřebuješ úroveň ${loc.minLevel}.`); return; }

  const cd = expedCdLeft();
  if (cd > 0) { toast('Ještě si odpočiň — zbývá ' + fmtSec(cd) + '.'); return; }
  if (!await spendExpedPoint()) return;

  beginFight(rollMonster(loc.monsters[i]), 'expedition');
}

// ---------- sdílený panel boje ----------
function combatPanelHTML() {
  return `
  <div class="panel" id="combatPanel" style="display:none;">
    <div class="panel-header">Průběh boje</div>
    <div class="panel-body">
      <div class="combat-wrap">
        <div class="vs-row">
          <div class="fighter-box player">
            <div class="fighter-avatar-lg" id="pAvatar"></div>
            <div class="fighter-name-lg" id="pName">-</div>
            <div class="hp-row">
              <div class="hp-bg"><div class="hp-fg player" id="pHpBar" style="width:100%"></div></div>
              <span class="hp-txt" id="pHpTxt">-</span>
            </div>
          </div>
          <div class="vs-badge">VS</div>
          <div class="fighter-box enemy">
            <div class="fighter-avatar-lg" id="eAvatar"></div>
            <div class="fighter-name-lg" id="eName">-</div>
            <div class="hp-row">
              <div class="hp-bg"><div class="hp-fg enemy" id="eHpBar" style="width:100%"></div></div>
              <span class="hp-txt" id="eHpTxt">-</span>
            </div>
          </div>
        </div>
        <div class="combat-log" id="combatLog"></div>
        <div class="combat-btns" id="combatBtns"></div>
      </div>
    </div>
  </div>`;
}

// Boj má vlastní pohled – nic jiného na obrazovce nezůstává.
function combat() { return combatPanelHTML(); }

// ---------- univerzální start boje ----------
function beginFight(enemy, view) {
  novyZaznamBoje();
  // rychlý boj přeskočí animace rovnou po zahájení
  if (volba('rychlyBoj')) setTimeout(() => { if (inCombat) skipFight(); }, 60);
  clearTimeout(fightTimer);
  character.health = maxHP();
  currentEnemy = JSON.parse(JSON.stringify(enemy));
  if (currentEnemy.maxHp == null) currentEnemy.maxHp = currentEnemy.hp;
  inCombat = true;
  lastFight = { enemy, view };

  openView('combat');
  setTimeout(() => {
    const panel = document.getElementById('combatPanel');
    if (!panel) return;
    panel.style.display = 'block';

    document.getElementById('pAvatar').innerHTML = avatarProUroven(character.level, 'fighter-img');
    document.getElementById('pName').textContent = character.name;

    const eAv = document.getElementById('eAvatar');
    eAv.innerHTML = currentEnemy.img
      ? monsterPortrait(currentEnemy, 'fighter-img')
      : `<span style="font-size:44px">${currentEnemy.icon}</span>`;

    document.getElementById('eName').textContent = currentEnemy.name;
    document.getElementById('combatLog').innerHTML = '';
    document.getElementById('combatBtns').innerHTML =
      `<button class="btn-back" onclick="skipFight()">Přeskočit animaci</button>
       <button class="btn-back" onclick="openView('${view}')">Utéct</button>`;

    updateHpBars();
    addLog(`${character.name} vs ${currentEnemy.name} — boj začal!`, 'log-s');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    fightTimer = setTimeout(fightRound, 600);   // boj běží sám
  }, 60);
}

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

const DUNGEONS = [
  { name:'Labyrint Minotaura', icon:'🏛️', level:1,  time:'5 min',  timeMs:5*60000,  gold:[20,50],  exp:[30,60],  desc:'Starověký labyrint plný pastí a nestvůr.' },
  { name:'Jeskyně Kyklopů',    icon:'🌋', level:5,  time:'15 min', timeMs:15*60000, gold:[80,150], exp:[100,180], desc:'Temné jeskyně obývané jednookými obry.' },
  { name:'Chrám Hádův',        icon:'💀', level:10, time:'30 min', timeMs:30*60000, gold:[200,400],exp:[250,450], desc:'Podsvětní chrám - jen silní přežijí.' },
  { name:'Olymp',              icon:'⚡', level:20, time:'60 min', timeMs:60*60000, gold:[500,1000],exp:[600,1100],desc:'Sídlo bohů - ultimátní výzva.' },
];

const SHOP_ITEMS = {
  weapons: [
    { id:'w0', name:'Wood Sword',      icon:'🪵', stat:'2-4 poškození',   key:'strength', val:2,  dmg:[2,4],   price:25,  quality:'common',   img:'weapons/wooden-sword.png' },
    { id:'w1', name:'Bronzový Meč',    icon:'🗡️', stat:'7-12 poškození',  key:'strength', val:6,  dmg:[7,12],  price:100, quality:'common',   img:'weapons/bronze-sword.png' },
    { id:'w2', name:'Železné Kopí',    icon:'🔱', stat:'14-22 poškození', key:'strength', val:12, dmg:[14,22], price:220, quality:'uncommon', img:'weapons/iron-spear.png'   },
    { id:'w3', name:'Ocelová Kosa',    icon:'⚔️', stat:'24-36 poškození', key:'strength', val:20, dmg:[24,36], price:450, quality:'rare',     img:'weapons/silver-axe.png'   },
    { id:'w4', name:'Meč Achillea',    icon:'🌟', stat:'42-62 poškození', key:'strength', val:35, dmg:[42,62], price:900, quality:'epic',     img:'weapons/gold-sword.png'   },
    { id:'w5', name:'Luk Artemidy',    icon:'🏹', stat:'20-31 poškození', key:'strength', val:18, dmg:[20,31], price:380, quality:'rare'     },
  ],
  armor: [
    { id:'a1', name:'Kožená Zbroj',    icon:'🧥', stat:'+6 Obrana',  key:'defense',   val:6,  price:90,   quality:'common',   tint:'leather' },
    { id:'a2', name:'Bronzová Zbroj',  icon:'🛡️', stat:'+14 Obrana', key:'defense',   val:14, price:200,  quality:'uncommon', tint:'bronze'  },
    { id:'a3', name:'Athénin Štít',    icon:'⛨',  stat:'+25 Obrana', key:'defense',   val:25, price:480,  quality:'rare'     },
    { id:'a4', name:'Zbroj Spartana',  icon:'💠', stat:'+40 Obrana', key:'defense',   val:40, price:950,  quality:'epic'     },
  ],
  armor_extra: [
    { id:'h1', name:'Korintská Helma', icon:'⛑️', stat:'+8 Obrana',  key:'defense',   val:8,  price:150,  quality:'uncommon' },
    { id:'h2', name:'Helma Heros',     icon:'👑', stat:'+16 Obrana', key:'defense',   val:16, price:320,  quality:'rare'     },
    { id:'g1', name:'Kožené Rukavice', icon:'🥊', stat:'+5 Síla',    key:'strength',  val:5,  price:80,   quality:'common',   tint:'leather' },
    { id:'g3', name:'Bronzové Rukavice',icon:'🥊',stat:'+9 Síla',    key:'strength',  val:9,  price:170,  quality:'uncommon', tint:'bronze'  },
    { id:'g2', name:'Železné Rukavice',icon:'👊', stat:'+12 Síla',   key:'strength',  val:12, price:200,  quality:'uncommon' },
    { id:'g4', name:'Rukavice Titána', icon:'👊', stat:'+26 Síla',   key:'strength',  val:26, price:640,  quality:'epic'     },
    { id:'b1', name:'Běžné Boty',      icon:'👟', stat:'+4 Hbitost', key:'agility',   val:4,  price:70,   quality:'common',   tint:'leather' },
    { id:'b4', name:'Bronzové Holeně', icon:'🥾', stat:'+8 Hbitost', key:'agility',   val:8,  price:160,  quality:'uncommon', tint:'bronze'  },
    { id:'b2', name:'Hermovy Boty',    icon:'🥾', stat:'+10 Hbitost',key:'agility',   val:10, price:180,  quality:'rare'     },
    { id:'b5', name:'Ocelové Holeně',  icon:'🥾', stat:'+16 Hbitost',key:'agility',   val:16, price:340,  quality:'rare'     },
    { id:'b6', name:'Boty Nesmrtelných',icon:'🥾',stat:'+28 Hbitost',key:'agility',   val:28, price:720,  quality:'epic'     },
    { id:'b3', name:'Kožený Pás',      icon:'🔗', stat:'+3 Obrana',  key:'defense',   val:3,  price:60,   quality:'common',   tint:'leather' },
  ],
  // Vetešník – použité prsteny, od obnošených po nečekané nálezy
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


const TAVERN_QUESTS = [
  // SNADNÉ
  { id:'t1', name:'Doruč víno obchodníkovi', icon:'🍷', npc:'Dionýsos', npcIcon:'🧔', rarity:'common',
    desc:'"Příteli, odnes tento džbán vína do přístavu. Obchodník Kyros čeká."',
    flavor:'Starý hospodský ti mrkne okem a podá těžký džbán.',
    time:3*60, gold:40, exp:30, minLevel:1,
    steps:['Doruč džbán vína do přístavu', 'Vrať se pro odměnu'] },
  { id:'t2', name:'Vyhnat krysy ze skladu', icon:'🐀', npc:'Hermes', npcIcon:'👴',  rarity:'common',
    desc:'"Ty proklaté krysy! Vyčisti můj sklad a dostaneš slušně zaplaceno."',
    flavor:'Hospodský tě vede ke tmavé chodbě plné hluku.',
    time:5*60, gold:60, exp:45, minLevel:1,
    steps:['Vejdi do sklepa', 'Vyhub 10 krys', 'Vrať se pro odměnu'] },
  { id:'t3', name:'Průzkum okolí města', icon:'🗺️', npc:'Strategos', npcIcon:'⚔️', rarity:'common',
    desc:'"Potřebuji vědět co se děje za hradbami. Prohledej okolí a podej zprávu."',
    flavor:'Vojenský velitel tě přísně změří pohledem.',
    time:8*60, gold:80, exp:60, minLevel:1,
    steps:['Prozkoumej severní cestu', 'Prozkoumej jižní brod', 'Vrať zprávu veliteli'] },

  // STŘEDNÍ
  { id:'t4', name:'Ukrást mapu od Peršanů', icon:'📜', npc:'Athéna', npcIcon:'🦉', rarity:'uncommon',
    desc:'"Perský špión má mapu našich pevností. Získej ji za každou cenu, hrdino."',
    flavor:'Bohyně moudrosti se na tebe upřeně podívá.',
    time:15*60, gold:180, exp:140, minLevel:3,
    steps:['Najdi perského špióna v přístavu', 'Ukradni mapu', 'Doruč mapu Athéně'] },
  { id:'t5', name:'Záchrana rukojmích', icon:'⛓️', npc:'Leonidas', npcIcon:'🛡️', rarity:'uncommon',
    desc:'"Bandité drží naše vojáky! Vysvoboď je a přiveď je zpět živé."',
    flavor:'Spartský král tě pohledí s nadějí v očích.',
    time:20*60, gold:250, exp:200, minLevel:5,
    steps:['Najdi banditský tábor', 'Poraz strážce', 'Osvoboď rukojmí', 'Vrať se zpět'] },
  { id:'t6', name:'Lektvar pro nemocné děti', icon:'🧪', npc:'Asklepios', npcIcon:'🌿', rarity:'uncommon',
    desc:'"Potřebuji kořen Asphodel z hory Pelion. Nemocné děti nemohou čekat!"',
    flavor:'Lékař Asklepios tě prosebně uchopí za ruku.',
    time:25*60, gold:200, exp:180, minLevel:4,
    steps:['Vystoupej na horu Pelion', 'Najdi kořen Asphodel', 'Přines ho lékaři'] },

  // TĚŽKÉ
  { id:'t7', name:'Drakonova hlava', icon:'🐉', npc:'Zeus', npcIcon:'⚡', rarity:'rare',
    desc:'"Drak terorizuje vesnice Thessálie. Přines mi jeho hlavu a budeš odměněn zlatem bohů!"',
    flavor:'Blesky zahrají okolo Dia když ti zadává úkol.',
    time:40*60, gold:500, exp:420, minLevel:10,
    steps:['Cestuj do Thessálie', 'Najdi Drakonův doupě', 'Zabi Drakona', 'Přines hlavu Diovi'] },
  { id:'t8', name:'Ukradený zlatý věnec', icon:'👑', npc:'Apollo', npcIcon:'🌞', rarity:'rare',
    desc:'"Zloděj ukradl posvátný věnec z mého chrámu! Doveď mi ho - živého."',
    flavor:'Bůh světla září zlatým světlem při řeči.',
    time:35*60, gold:450, exp:380, minLevel:8,
    steps:['Prošetři chrám Apollóna', 'Vystopuj zloděje', 'Chyť ho živého', 'Přiveď ho k Apollónovi'] },

  // EPICKÉ  
  { id:'t9', name:'Sestup do Tartaru', icon:'💀', npc:'Hádés', npcIcon:'👻', rarity:'epic',
    desc:'"Duše Achillea unikla z Tartaru. Vrať ji zpět... pokud přežiješ cestu dolů."',
    flavor:'Chladný dech smrti tě ovane když Hádés promluví.',
    time:60*60, gold:1200, exp:1000, minLevel:18,
    steps:['Najdi vstup do Podsvětí', 'Přejdi řeku Styx', 'Najdi duši Achillea', 'Vrať ji Hádovi'] },
  { id:'t10', name:'Krádež Zlatého rouna', icon:'🌿', npc:'Iásón', npcIcon:'⛵', rarity:'epic',
    desc:'"Potřebuji hrdinu co dokáže získat Zlaté rouno z Kolchidy. Odměna bude královská."',
    flavor:'Iásón rozloží mapu s tajuplnými cestami.',
    time:90*60, gold:2000, exp:1600, minLevel:25,
    steps:['Nalodění v Iolku', 'Proplout Symplegádami', 'Porazit draka v Kolchidě', 'Ukrást Zlaté rouno', 'Návrat do Řecka'] },
];

const RARITY_COLORS = { common:'#aaa', uncommon:'#2d8020', rare:'#1a4a8b', epic:'#6b2fa0' };
const RARITY_LABELS = { common:'Běžný', uncommon:'Neobvyklý', rare:'Vzácný', epic:'Epický' };
let tavernQuests = JSON.parse(localStorage.getItem('tavernQuests') || '[]'); // pole aktivních questů

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.isLoggedIn()) { window.location.href = 'index.html'; return; }
  try {
    const res = await API.getCharacter();
    character = res.character;
    questData = JSON.parse(localStorage.getItem('questData') || 'null');
    normalizeCharacter();
    updateUI();
    openView('city');
    startQuestTimer();
    loadLeaderboard();
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
        intelligence: 8,
        gold: 500
      };
      localStorage.setItem('character', JSON.stringify(character));
      normalizeCharacter();
      updateUI();
      openView('city');
      startQuestTimer();
      loadLeaderboard();
    }
  }
});

// ========== UI UPDATE ==========
function updateUI() {
  const c = character;
  const xpNeeded = c.level * 100;
  const hpPct = Math.max(0, (c.health / c.max_health * 100)).toFixed(1);
  const xpPct = Math.min(100, (c.experience / xpNeeded * 100)).toFixed(1);

  // Cache DOM elements to avoid repeated queries
  const els = {
    navName: document.getElementById('navName'),
    navLevel: document.getElementById('navLevel'),
    hpBar: document.getElementById('hpBar'),
    hpVal: document.getElementById('hpVal'),
    xpBar: document.getElementById('xpBar'),
    xpVal: document.getElementById('xpVal'),
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
  if (els.hpVal) els.hpVal.textContent = `${c.health}/${c.max_health}`;
  if (els.xpBar) els.xpBar.style.width = xpPct + '%';
  if (els.xpVal) els.xpVal.textContent = `${c.experience}/${xpNeeded} XP`;
  if (els.navGold) els.navGold.textContent = c.gold;
  if (els.charNameSm) els.charNameSm.textContent = c.name;
  if (els.charClassSm) els.charClassSm.textContent = c.class;
  if (els.charAvatarSm) els.charAvatarSm.innerHTML = getAvatar(c.class, c.gender);
  if (els.sHealth) els.sHealth.textContent = `${c.health}/${c.max_health}`;
  if (els.sStr) els.sStr.textContent = c.strength;
  if (els.sDef) els.sDef.textContent = c.defense;
  if (els.sAgi) els.sAgi.textContent = c.agility;
  if (els.sInt) els.sInt.textContent = c.intelligence;

  // Daily button
  if (els.dailyBtn) els.dailyBtn.disabled = localStorage.getItem('lastDaily') === new Date().toDateString();
}

// ========== VIEWS ==========
let viewCache = {}; // Cache rendered views to avoid regeneration
// který folder tab patří ke které view
const TAB_OF_VIEW = { profile:0, inventory:0, city:0, stats:1, hall:2 };

function openView(view, highlight) {
  // zvýraznění v levém banneru
  // (kupci sdílejí pohled 'shop', proto si říkají o vlastní položku)
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
                  guild, tavern, forge, expedition, hall, stats, training, work, premium,
                  report: fightReport };
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
        <div class="city-building" onclick="openView('shop')">
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
  </div>`;
}

// ===== ARENA =====
function arena() {
  const enemyCards = ENEMIES.map((e,i) => `
    <div class="opponent-row">
      <span class="opp-rank">${i+1}.</span>
      <div class="opp-avatar">${e.icon.length > 2 ? `<div style="font-size:2em;text-align:center;padding-top:8px;">${e.icon}</div>` : `<div style="font-size:2em;text-align:center;padding-top:8px;">${e.icon}</div>`}</div>
      <div class="opp-info">
        <div class="opp-name">${e.name}</div>
        <div class="opp-details">Lv.${e.level} · ❤️${e.hp} · ⚔️${e.str} · 🛡️${e.def}</div>
      </div>
      <button class="opp-btn" onclick="startCombat(${i})">⚔ Bojovat</button>
    </div>`).join('');

  return `
  <div class="panel">
    <div class="panel-header">⚔️ Aréna Olympu</div>
    <div class="panel-body">
      <div class="arena-tabs">
        <div class="arena-tab active">⚔ PvE Nepřátelé</div>
        <div class="arena-tab">👥 PvP Aréna</div>
        <div class="arena-tab">🏆 Turnaj</div>
      </div>
      <div class="opponents-list">${enemyCards}</div>
    </div>
  </div>
  ${combatPanelHTML()}`;
}

// ===== DUNGEON =====
function dungeon() {
  const items = DUNGEONS.map((d,i) => `
    <div class="dungeon-item" onclick="startDungeon(${i})">
      <span class="dungeon-icon">${d.icon}</span>
      <div class="dungeon-info">
        <div class="dungeon-name">${d.name}</div>
        <div class="dungeon-desc">${d.desc}</div>
        <div class="dungeon-stats">
          <span>⏱ ${d.time}</span>
          <span>💰 ${d.gold[0]}-${d.gold[1]}</span>
          <span>⭐ ${d.exp[0]}-${d.exp[1]} XP</span>
          <span>Lv.${d.level}+</span>
        </div>
      </div>
      <button class="dungeon-btn">${character.level >= d.level ? '🏰 Vstoupit' : '🔒 Lv.'+d.level}</button>
    </div>`).join('');
  return `
  <div class="panel">
    <div class="panel-header">🏰 Dungeony</div>
    <div class="panel-body">
      <div class="dungeon-list">${items}</div>
    </div>
  </div>`;
}

// ===== QUESTS =====
function quests() {
  const now = Date.now();
  const cards = QUESTS_DEF.map(q => {
    const qd = questData && questData.id === q.id ? questData : null;
    const available = character.level >= q.minLevel;
    const running = qd && !qd.done && now < qd.endTime;
    const claimable = qd && !qd.done && now >= qd.endTime;
    const done = qd && qd.done;
    const pct = running ? Math.min(100, ((now - qd.startTime) / (qd.endTime - qd.startTime) * 100)).toFixed(1) : (claimable||done ? 100 : 0);
    const timeLeft = running ? formatTime(Math.ceil((qd.endTime - now)/1000)) : '';

    return `
    <div class="quest-card ${running||claimable?'active-quest':''}">
      <div class="quest-card-header">
        <span class="quest-icon">${q.icon}</span>
        <div>
          <div class="quest-title">${q.name}</div>
          <div class="quest-tier">Lv.${q.minLevel}+ · ⏱ ${formatTime(q.time)}</div>
        </div>
      </div>
      <div class="quest-desc">${q.desc}</div>
      <div class="quest-rewards">
        <span class="quest-rew">💰 ${q.gold} zlatých</span>
        <span class="quest-rew">⭐ ${q.exp} XP</span>
      </div>
      ${running||claimable||done ? `
      <div class="quest-time-bar">
        <div class="quest-time-label"><span>${running?'Probíhá...':claimable?'Hotovo!':'Dokončeno'}</span><span>${timeLeft}</span></div>
        <div class="quest-prog-bar"><div class="quest-prog-fill" style="width:${pct}%"></div></div>
      </div>` : ''}
      ${!available ? `<button class="quest-btn" disabled>🔒 Lv.${q.minLevel}+</button>`
       : done ? `<button class="quest-btn" disabled>✅ Splněno</button>`
       : claimable ? `<button class="quest-btn claim" onclick="claimQuest('${q.id}')">🎁 Převzít odměnu</button>`
       : running ? `<button class="quest-btn" disabled>⏳ Probíhá...</button>`
       : questData && !questData.done ? `<button class="quest-btn" disabled>Jiný úkol běží</button>`
       : questData && !questData.done ? `<button class="quest-btn" disabled>⚠ Jiný úkol běží</button>` : `<button class="quest-btn" onclick="startQuest('${q.id}')">📜 Zahájit</button>`}
    </div>`;
  }).join('');

  return `
  <div class="panel">
    <div class="panel-header">📜 Úkoly</div>
    <div class="panel-body">
      <div class="quest-tabs">
        <div class="quest-tab active">📜 Průzkum</div>
        <div class="quest-tab">⚔ Zabíjení</div>
        <div class="quest-tab">🏆 Denní</div>
      </div>
      <div class="quest-list">${cards}</div>
    </div>
  </div>`;
}

// ===== SHOPS =====
let currentShop = null;
let shopPage = 0;      // 0/1/2 = stránky zboží, 'sell' = výkup

const MERCHANTS = {
  blacksmith: { name:'Zbrojíř',    emoji:'🧔', menu:'shop',    desc:'Zbraně všeho druhu',        get items(){ return SHOP_ITEMS.weapons; } },
  armorer:    { name:'Platnéř',    emoji:'👨‍🏭', menu:'armorer', desc:'Zbroje, boty a rukavice',  get items(){ return SHOP_ITEMS.armor.concat(SHOP_ITEMS.armor_extra || []); } },
  jeweler:    { name:'Šperkař',    emoji:'👳', menu:'jeweler', desc:'Amulety a ozdoby',          get items(){ return SHOP_ITEMS.jewelry; } },
  junk:       { name:'Vetešník',   emoji:'🧓', menu:'junk',    desc:'Použité prsteny z druhé ruky', get items(){ return SHOP_ITEMS.rings; } },
  alchemist:  { name:'Alchymista', emoji:'🧙', menu:'alchemy', desc:'Lektvary a elixíry',        get items(){ return SHOP_ITEMS.potions; } },
};

// portrét kupce: img/merchants/<id>.png, jinak emoji
function merchantPortrait(id) {
  const m = MERCHANTS[id];
  return artImg(`img/merchants/${id}.png`, m.emoji, 'mp-img', m.name);
}

// jedno políčko se zbožím
function goodsSlot(item, dark) {
  if (!item) return `<div class="g-slot ${dark ? 'dark' : ''} empty"></div>`;
  const q = qualityOf(item);
  const afford = character.gold >= item.price;
  return `
    <div class="g-slot ${dark ? 'dark' : ''} ${afford ? '' : 'poor'}"
         onclick="buyItem('${item.uid}')"
         data-tip="shop:${item.uid}">
      <span class="g-lvl" style="color:${q.color}">${item.lvl || 1}</span>
      ${itemIcon(item, 'g-ico')}
    </div>`;
}

function fillSlots(items, count, dark) {
  let html = '';
  for (let i = 0; i < count; i++) html += goodsSlot(items[i], dark);
  return html;
}

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

function newGoods() {
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

  // nabídka rozdělená na dvě stránky
  const stock = shopStock(id);
  const pages = [stock.slice(0, 16), stock.slice(16, 32)];

  const pageTabs =
    ['I', 'II'].map((lbl, i) =>
      `<div class="pg-tab ${shopPage === i ? 'active' : ''}" onclick="setShopPage(${i})">${lbl}</div>`
    ).join('') +
    `<div class="pg-tab sell ${shopPage === 'sell' ? 'active' : ''}" onclick="setShopPage('sell')">Prodat</div>`;

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
    : `<div class="goods-grid">${fillSlots(pages[shopPage] || [], 16, false)}</div>`;

  return `
  <div class="shop2">
    <div class="s2tabs">${tabs}</div>

    <div class="s2body">

      <!-- kupec: portrét, záložky a pult v jednom rámu -->
      <div class="s2left">
        <div class="shop-frame">
          <div class="mp-inner">${merchantPortrait(id)}</div>
          <div class="pg-tabs">${pageTabs}</div>
          ${mrizka}
        </div>

        <div class="restock">
          <div class="restock-lbl">Než kupec doplní zboží:</div>
          <div class="restock-time" id="restockTimer">${restockLeft()}</div>
          <button class="btn-green" onclick="newGoods()">Nové zboží</button>
        </div>
      </div>

      <!-- tvoje výbava -->
      <div class="s2right">
        ${equipPanelHTML()}
        ${bagPanelHTML(shopPage === 'sell' ? 'sell' : 'use')}
        <div class="sell-note">
          ${shopPage === 'sell'
            ? 'Klikni na předmět v batohu a kupec ti ho vykoupí.'
            : 'Klikni na předmět v batohu pro vybavení. Prodej najdeš na záložce „Prodat".'}
        </div>
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
const sellPrice = it => Math.max(1, Math.floor((it.price || 10) * 0.4));

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
  if (!item.img && !item.id) return `<span class="ico ${cls}">${emoji}</span>`;
  // item.img = vlastní cesta (relativně k img/), jinak img/items/<id>.png
  const path = item.img ? `img/${item.img}` : `img/items/${item.id}.png`;
  return artImg(path, emoji, cls, item.name, item.tint);
}

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
  if (id === 'a3')   return 'shield';
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

  return DOLL.map(x => one(x.key, x.cls)).join('') + `
    <div class="slot rings">
      ${['ring','belt'].map(k => {
        const eq = equipped[k];
        return `<div class="slot-sm ${eq ? '' : 'empty'}"
                     draggable="${eq ? 'true' : 'false'}"
                     ondragstart="dragStart(event,'slot','${k}')"
                     ondragend="dragEnd(event)"
                     ondragover="dragOver(event)"
                     ondragleave="dragLeave(event)"
                     ondrop="dropOn(event,'slot','${k}')"
                     onclick="unequip('${k}')"
                     ${eq ? `data-tip="eq:${k}"` : `title="${SLOT_DEFS[k].label}"`}>${eq ? itemIcon(eq,'s-ico-sm') : slotIcon(k,'s-ico-sm')}</div>`;
      }).join('')}
    </div>`;
}

const BAG_SIZE = 24;

// mode: 'use' = kliknutím vybavit / vypít, 'sell' = kliknutím prodat
function bagSlotsHTML(mode) {
  let html = '';
  for (let i = 0; i < BAG_SIZE; i++) {
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
    <div class="eq-frame">
      <div class="eq-doll">${dollSlotsHTML()}</div>
      <div class="eq-side">
        ${[0,1,2,3].map(() => '<div class="slot empty" title="Zamčeno"><span class="s-ico">🔒</span></div>').join('')}
      </div>
    </div>`;
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
  const int = statTotal('intelligence');

  const [dmgMin, dmgMax] = playerDamageRange();
  const armor   = totalArmor();
  const xpNeed  = c.level * 100;
  const xpPct   = Math.min(100, c.experience / xpNeed * 100);
  const hpPct   = Math.max(0, c.health / c.max_health * 100);

  const bar = (cls, pct) => `<div class="sbar ${cls}"><i style="width:${pct}%"></i></div>`;
  const rowBar   = (label, cls, pct, val) =>
    `<div class="strow"><span class="sl">${label}</span>${bar(cls, pct)}<span class="sv">${val}</span></div>`;
  const rowPlain = (label, val) =>
    `<div class="strow plain"><span class="sl">${label}</span><span class="sv">${val}</span></div>`;

  const avatar = getAvatar(c.class, c.gender);
  const avatarHTML = /^\s*</.test(avatar) ? avatar : `<span class="emoji">${avatar}</span>`;

  const dollHTML = dollSlotsHTML();
  const bagHTML  = bagSlotsHTML('use');

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
        ${rowBar('Životy',     'hp', hpPct, c.health + '/' + c.max_health)}
        ${rowBar('Zkušenost',  'xp', xpPct, xpPct.toFixed(1) + ' %')}
        ${rowBar('Síla',       'st', Math.min(100, str / 3), str)}
        ${rowBar('Obratnost',  'st', Math.min(100, agi / 3), agi)}
        ${rowBar('Odolnost',   'st', Math.min(100, def / 3), def)}
        ${rowBar('Inteligence','st', Math.min(100, int / 3), int)}
        ${rowPlain('Zbroj', armor)}
        ${rowPlain('Poškození', dmgMin + ' - ' + dmgMax)}
        ${equipped.weapon && equipped.weapon.dmg
            ? rowPlain('Zbraň', equipped.weapon.dmg[0] + ' - ' + equipped.weapon.dmg[1])
            : ''}
        ${rowPlain('Zlato', c.gold)}
      </div>
    </div>

    <div class="eq-wrap">
      <div class="eq-frame">
        <div class="eq-doll">${dollHTML}</div>
        <div class="eq-side">
          ${[0,1,2,3].map(() => `<div class="slot empty" title="Zamčeno"><span class="s-ico">🔒</span></div>`).join('')}
        </div>
      </div>

      <div class="bag">
        <div class="bag-tabs">
          <div class="bag-tab active">I</div>
          <div class="bag-tab">II</div>
          <div class="bag-tab">III</div>
          <div class="bag-tab">IV</div>
        </div>
        <div class="bag-grid">${bagHTML}</div>
      </div>
    </div>

  </div>

  <div class="profile-link">
    <div class="pl-title">Odkaz na tvůj profil</div>
    <input class="pl-input" readonly onclick="this.select()"
           value="${location.origin}${location.pathname}?hrdina=${encodeURIComponent(c.name)}">
  </div>`;
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
    if (item.lvl && character.level < item.lvl) {
      toast(`${item.name} si můžeš vzít až na úrovni ${item.lvl}.`);
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
  if (item.lvl && character.level < item.lvl) {
    toast(`${item.name} si můžeš vzít až na úrovni ${item.lvl}.`);
    return;
  }

  if (item.key === 'health') {
    character.health = Math.min(character.max_health, character.health + item.val);
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
function handleInvClick(idx) {
  const item = inventory[idx];
  if (!item) return;

  // Určit slot podle typu předmětu
  const slotMap = {
    'w1':'weapon','w2':'weapon','w3':'weapon','w4':'weapon',
    'a1':'chest','a2':'chest','a3':'chest','a4':'chest',
    'p1':null,'p2':null,'p3':null, // lektvary se nenosí
    'm1':'ring','m2':'amulet','m3':'weapon',
  };

  const slotKey = slotMap[item.id];

  // Lektvar - použít okamžitě
  if (slotKey === null) {
    if (item.key === 'health') {
      character.health = Math.min(character.max_health, character.health + item.val);
      inventory.splice(idx, 1);
      localStorage.setItem('inv', JSON.stringify(inventory));
      saveChar(); updateUI();
      alert(`🧪 Použil jsi ${item.name}! +${item.val} HP`);
      openView('inventory');
      return;
    }
  }

  if (!slotKey) {
    alert('Tento předmět nelze nasadit!');
    return;
  }

  // Pokud je slot obsazený - vrátit starý předmět do inventáře
  if (equipped[slotKey]) {
    const old = equipped[slotKey];
    if (old.key && old.key !== 'health') character[old.key] -= old.val;
    inventory.push(old);
  }

  // Nasadit nový
  equipped[slotKey] = item;
  inventory.splice(idx, 1);
  if (item.key && item.key !== 'health') character[item.key] += item.val;

  localStorage.setItem('eqp', JSON.stringify(equipped));
  localStorage.setItem('inv', JSON.stringify(inventory));
  saveChar(); updateUI();
  openView('inventory');
}

// ===== TAVERN =====
function tavern() {
  const now = Date.now();

  // Render NPC quest boards
  const renderQuests = (rarities) => {
    return TAVERN_QUESTS.filter(q => rarities.includes(q.rarity)).map(q => {
      const aq = tavernQuests.find(x => x.id === q.id);
      const running  = aq && !aq.done && now < aq.endTime;
      const claimable= aq && !aq.done && now >= aq.endTime;
      const done     = aq && aq.done;
      const avail    = character.level >= q.minLevel;
      const pct      = running ? Math.min(100,((now-aq.startTime)/(aq.endTime-aq.startTime)*100)).toFixed(1) : (claimable||done?100:0);
      const timeLeft = running ? formatTime(Math.ceil((aq.endTime-now)/1000)) : '';
      const rColor   = RARITY_COLORS[q.rarity];

      return `
      <div class="tq-card ${running||claimable?'tq-active':''}">
        <div class="tq-top">
          <div class="tq-npc">
            <span class="tq-npc-icon">${q.npcIcon}</span>
            <span class="tq-npc-name">${q.npc}</span>
          </div>
          <span class="tq-rarity" style="color:${rColor};border-color:${rColor}">${RARITY_LABELS[q.rarity]}</span>
        </div>
        <div class="tq-header">
          <span class="tq-icon">${q.icon}</span>
          <div class="tq-title">${q.name}</div>
        </div>
        <div class="tq-speech">${q.desc}</div>
        <div class="tq-flavor">${q.flavor}</div>
        <div class="tq-steps">
          ${q.steps.map((s,i) => `<div class="tq-step ${done||claimable?'done':running&&i===0?'current':''}">
            ${done||claimable?'✓':running&&i===0?'▶':'○'} ${s}</div>`).join('')}
        </div>
        <div class="tq-footer">
          <div class="tq-rewards">
            <span>💰 ${q.gold}</span>
            <span>⭐ ${q.exp} XP</span>
            <span>⏱ ${formatTime(q.time)}</span>
            <span style="color:var(--text-dim)">Lv.${q.minLevel}+</span>
          </div>
          ${running||claimable||done ? `
          <div class="tq-prog-wrap">
            <div class="tq-prog-bar"><div class="tq-prog-fill" style="width:${pct}%"></div></div>
            <span class="tq-prog-txt">${running?timeLeft:claimable?'Hotovo!':'Splněno'}</span>
          </div>` : ''}
          <div class="tq-btns">
            ${!avail ? `<button class="tq-btn" disabled>🔒 Lv.${q.minLevel}+</button>`
             : done ? `<button class="tq-btn tq-done" disabled>✅ Splněno</button>`
             : claimable ? `<button class="tq-btn tq-claim" onclick="claimTavernQuest('${q.id}')">🎁 Vyzvednout</button>`
             : running ? `<button class="tq-btn" disabled>⏳ Probíhá...</button>`
             : `<button class="tq-btn tq-start" onclick="startTavernQuest('${q.id}')">📜 Přijmout</button>`}
          </div>
        </div>
      </div>`;
    }).join('');
  };

  return `
  <div class="panel panel-gold">
    <div class="panel-header">🍺 Taverna U Dionýsa</div>
    <div class="panel-body" style="padding:0;">

      <!-- Top banner -->
      <div class="tavern-banner">
        <div class="tavern-banner-left">
          <div style="font-size:2.5em;">🏺</div>
          <div>
            <div style="color:var(--gold);font-size:1.1em;font-weight:bold;">Taverna U Dionýsa</div>
            <div style="color:var(--text-dim);font-size:.8em;font-style:italic;">"Zde se rodí hrdinové a zalévají vínem"</div>
          </div>
        </div>

      </div>

      <!-- Quest board tabs -->
      <div class="tavern-tabs" id="tavernTabs">
        <div class="tavern-tab active" onclick="tavernTab(this,'board-common')">📋 Vývěska</div>
        <div class="tavern-tab" onclick="tavernTab(this,'board-uncommon')">⚔ Výpravy</div>
        <div class="tavern-tab" onclick="tavernTab(this,'board-rare')">💎 Vzácné</div>
        <div class="tavern-tab" onclick="tavernTab(this,'board-epic')">👑 Epické</div>
        <div class="tavern-tab" onclick="tavernTab(this,'board-active')">📌 Aktivní (${tavernQuests.filter(q=>!q.done).length})</div>
      </div>

      <div class="tavern-board" id="board-common">${renderQuests(['common'])}</div>
      <div class="tavern-board" id="board-uncommon" style="display:none">${renderQuests(['uncommon'])}</div>
      <div class="tavern-board" id="board-rare" style="display:none">${renderQuests(['rare'])}</div>
      <div class="tavern-board" id="board-epic" style="display:none">${renderQuests(['epic'])}</div>
      <div class="tavern-board" id="board-active" style="display:none">
        ${tavernQuests.filter(q=>!q.done).length === 0
          ? '<div style="text-align:center;padding:40px;color:var(--text-dim);font-style:italic;">Nemáš žádné aktivní úkoly.<br>Přijmi úkol z vývěsky!</div>'
          : renderQuests(TAVERN_QUESTS.filter(q => tavernQuests.find(x=>x.id===q.id&&!x.done)).map(q=>q.rarity))
        }
      </div>
    </div>
  </div>`;
}

function tavernTab(el, boardId) {
  document.querySelectorAll('.tavern-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.tavern-board').forEach(b => b.style.display = 'none');
  document.getElementById(boardId).style.display = 'block';
}

function startTavernQuest(id) {
  const q = TAVERN_QUESTS.find(x => x.id === id);
  if (!q) return;
  if (character.level < q.minLevel) { alert(`🔒 Potřebuješ úroveň ${q.minLevel}!`); return; }
  const activeQuest = tavernQuests.find(x => !x.done);
  if (activeQuest) { alert('⚠ Už máš aktivní úkol! Dokonči ho nebo počkej než skončí.'); return; }
  if (tavernQuests.find(x => x.id === id && x.done)) { alert('Tento úkol jsi už splnil!'); return; }

  const now = Date.now();
  tavernQuests.push({ id, startTime: now, endTime: now + q.time*1000, done: false });
  localStorage.setItem('tavernQuests', JSON.stringify(tavernQuests));
  openView('tavern');
}

function claimTavernQuest(id) {
  const q = TAVERN_QUESTS.find(x => x.id === id);
  const aq = tavernQuests.find(x => x.id === id);
  if (!q || !aq) return;
  aq.done = true;
  localStorage.setItem('tavernQuests', JSON.stringify(tavernQuests));
  character.gold += q.gold;
  character.experience += q.exp;
  checkLevelUp(); saveChar(); updateUI();
  alert(`🎉 Úkol "${q.name}" splněn!\n+${q.gold} 💰\n+${q.exp} ⭐`);
  openView('tavern');
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
function totalArmor() {
  const zOdolnosti = statTotal('defense') * 3;
  const zVystroje  = Object.values(equipped).reduce(
    (a, e) => a + ((e && !isBroken(e) && e.armor) || 0), 0);
  return zOdolnosti + zVystroje;
}

// Ze šablony z obchodu vyrobí konkrétní kus s náhodně rozhozenými staty.
// Hlavní stat odpovídá typu předmětu (zbraň → síla, zbroj → odolnost…),
// zbylé se losují, takže dva stejné meče nejsou nikdy stejné.
function rollItem(tpl) {
  const it = { ...tpl, uid: 'i' + Math.random().toString(36).slice(2, 10) };
  it.lvl = Math.max(1, Math.round((tpl.price || 25) / 28));   // požadovaná úroveň

  // kusy výstroje nesou vlastní zbroj (zbraně a šperky ne)
  if (ARMOR_SLOTS.includes(slotForItem(tpl))) {
    it.armor = Math.max(1, Math.round((tpl.price || 50) / 5 * qualityOf(tpl).mult));
  }

  // všechno nositelné se opotřebovává
  if (slotForItem(tpl)) {
    it.durMax = Math.round(150 + (tpl.price || 50) * 1.5 * qualityOf(tpl).mult);
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
function statLine(it) {
  if (!it) return '';
  if (it.key === 'health') return '+' + it.val + ' zdraví';
  const parts = [];
  if (Array.isArray(it.dmg)) parts.push(it.dmg[0] + '-' + it.dmg[1] + ' poškození');
  if (it.armor) parts.push('+' + it.armor + ' zbroj');
  if (it.stats) for (const [k, v] of Object.entries(it.stats)) parts.push('+' + v + ' ' + STAT_DEFS[k]);
  return parts.join(', ') || (it.stat || '');
}

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
  if (!character || localStorage.getItem('statsFixed') === '1') return;
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

  const tezky = it.lvl && character && character.level < it.lvl;

  return `
    <div class="tip-head" style="background:linear-gradient(180deg,${q.color},#1a1409)">
      <div class="tip-name">${it.name}</div>
      <div class="tip-q">${q.label}</div>
    </div>
    <div class="tip-body">
      ${rows.join('') || '<div class="tip-row"><span>Bez bonusů</span><b>—</b></div>'}
      ${souhrn ? `<div class="tip-sum">${souhrn}</div>` : ''}
      <div class="tip-sep"></div>
      ${it.lvl ? `<div class="tip-row${tezky ? ' neg' : ''}"><span>Úroveň</span><b>${it.lvl}</b></div>` : ''}
      <div class="tip-row"><span>Hodnota</span><b>${it.price || 0} zlata</b></div>
      ${it.durMax ? (() => {
        const pct = Math.round(it.dur / it.durMax * 100);
        return `<div class="tip-row"><span>Životnost</span><b class="${durClass(pct)}">${it.dur}/${it.durMax} (${pct} %)</b></div>`;
      })() : ''}
      ${tezky ? '<div class="tip-warn">Na tenhle kus ti chybí úroveň.</div>' : ''}
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

// Co se má v bublině ukázat – předmět, nebo protivník.
function tipHTMLFor(ref) {
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
function shopStock(id) {
  restockLeft();                                  // zajistí, že restockAt existuje
  const stamp = localStorage.getItem('restockAt') || '0';
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

// hráč se kryje celou zbrojí, ne jen odolností
// (dělíme 12, aby beze zbroje vyšlo totéž co dřív: odolnost/4)
const playerSoak = () => Math.floor(totalArmor() / 12);

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

  // --- útok hráče ---
  const crit = Math.random() < 0.15;
  let pdmg = Math.max(1, rollPlayerDamage() - soak(currentEnemy.def));
  if (crit) pdmg = Math.floor(pdmg * 1.6);

  currentEnemy.hp = Math.max(0, currentEnemy.hp - pdmg);
  animateHit('.fighter-box.player', '.fighter-box.enemy', pdmg, crit);
  addLog(`${character.name} zasáhl za <strong>${pdmg}</strong>${crit ? ' (kritický zásah!)' : ''}`, 'log-p');
  updateHpBars();

  if (currentEnemy.hp <= 0) { fightTimer = setTimeout(() => endCombat(true), 800); return; }

  // --- odveta soupeře ---
  fightTimer = setTimeout(() => {
    if (!inCombat) return;
    const edmg = Math.max(1, currentEnemy.str + Math.floor(Math.random() * 6) - playerSoak());
    character.health = Math.max(0, character.health - edmg);
    animateHit('.fighter-box.enemy', '.fighter-box.player', edmg, false);
    addLog(`${currentEnemy.name} zasáhl za <strong>${edmg}</strong>`, 'log-e');
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
    const pdmg = Math.max(1, rollPlayerDamage() - soak(currentEnemy.def));
    currentEnemy.hp = Math.max(0, currentEnemy.hp - pdmg);
    addLog(`${character.name} zasáhl za <strong>${pdmg}</strong>`, 'log-p');
    if (currentEnemy.hp <= 0) { endCombat(true); break; }

    const edmg = Math.max(1, currentEnemy.str + Math.floor(Math.random() * 6) - playerSoak());
    character.health = Math.max(0, character.health - edmg);
    addLog(`${currentEnemy.name} zasáhl za <strong>${edmg}</strong>`, 'log-e');
    if (character.health <= 0) { endCombat(false); break; }
  }
  updateHpBars();
}

function endCombat(won) {
  inCombat = false;
  clearTimeout(fightTimer);
  updateHpBars();

  let rewards = '';
  if (won) {
    character.gold       += currentEnemy.gold;
    character.experience += currentEnemy.exp;
    rewards = `+${currentEnemy.gold} zlata · +${currentEnemy.exp} zkušeností`;
    addLog(`Vítězství! ${rewards}`, 'log-w');
    checkLevelUp();
  } else {
    character.health = Math.max(1, Math.floor(character.max_health * 0.25));
    rewards = `Probral ses s ${character.health} HP.`;
    addLog(`Porážka. ${rewards}`, 'log-d');
  }
  // po výpravě si gladiátor musí odpočinout
  if (lastFight && lastFight.view === 'expedition') startExpedCooldown();
  wearEquipment();

  saveChar(); updateUI();

  // podklady pro zprávu z boje
  const [dmgMin, dmgMax] = playerDamageRange();
  const odmeny = won
    ? [`<b>${character.name}</b> získává ${currentEnemy.gold} zlata`,
       `<b>${character.name}</b> získává ${currentEnemy.exp} zkušenostních bodů`]
    : [`<b>${character.name}</b> nezískává nic`,
       `Probral ses s ${character.health} životy`];

  lastReport = {
    won,
    zpet: lastFight ? lastFight.view : 'expedition',
    odmeny,
    hrac: {
      name: character.name, title: character.class,
      class: character.class, gender: character.gender,
      level: character.level,
      hp: Math.max(0, character.health), maxHp: character.max_health,
      str: statTotal('strength'), agi: statTotal('agility'),
      def: statTotal('defense'),  int: statTotal('intelligence'),
      armor: totalArmor(), dmg: dmgMin + ' - ' + dmgMax,
    },
    souper: {
      name: currentEnemy.name, title: 'Nestvůra', img: currentEnemy.img,
      level: currentEnemy.level || 1,
      hp: Math.max(0, currentEnemy.hp), maxHp: currentEnemy.maxHp,
      str: currentEnemy.str, agi: Math.round(currentEnemy.str * 0.8),
      def: currentEnemy.def, int: Math.round(currentEnemy.def * 0.6),
      armor: currentEnemy.def * 3,
      dmg: Math.floor(currentEnemy.str * 1.1) + ' - ' + Math.floor(currentEnemy.str * 1.6),
    },
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

  setTimeout(() => { if (!inCombat) openView('report'); }, 1400);
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

  const pp = Math.max(0, Math.min(100, (character.health / character.max_health * 100).toFixed(1)));
  const ep = Math.max(0, Math.min(100, (currentEnemy.hp / currentEnemy.maxHp * 100).toFixed(1)));

  if (pb) pb.style.width = pp + '%';
  if (eb) eb.style.width = ep + '%';
  if (pt) pt.textContent = `${Math.max(0, character.health)}/${character.max_health}`;
  if (et) et.textContent = `${Math.max(0, currentEnemy.hp)}/${currentEnemy.maxHp}`;
}

function addLog(msg, cls) {
  const log = document.getElementById('combatLog');
  if (!log) return;
  log.innerHTML += `<div class="${cls}">${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

// ========== DUNGEON ==========
function startDungeon(idx) {
  const d = DUNGEONS[idx];
  if (character.level < d.level) { toast(`Bludiště ${d.name} se otevře na úrovni ${d.level}.`); return; }
  toast(`${d.name}: výprava potrvá ${d.time}.`);
}

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
  const today = new Date().toDateString();
  const last = localStorage.getItem('lastDaily');
  if (last === today) return;
  const gold = 50 + Math.floor(Math.random()*50);
  const exp  = 30 + Math.floor(Math.random()*30);
  character.gold += gold;
  character.experience += exp;
  localStorage.setItem('lastDaily', today);
  checkLevelUp(); saveChar(); updateUI();
  const btn = document.getElementById('dailyBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dnes už vyzvednuto'; }
  toast(`Denní odměna: +${gold} zlata, +${exp} zkušeností`);
}

// ========== LEVEL UP ==========
function checkLevelUp() {
  let leveledUp = false;
  while (character.experience >= character.level * 100) {
    const needed = character.level * 100;
    character.experience -= needed;
    character.level++;
    character.max_health += 10;
    character.health = character.max_health;
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
  try {
    await API.updateCharacter({
      level: character.level, experience: character.experience,
      health: character.health, max_health: character.max_health,
      gold: character.gold, strength: character.strength,
      defense: character.defense, agility: character.agility,
      intelligence: character.intelligence,
    });
    localStorage.setItem('character', JSON.stringify(character));
  } catch(e) { console.error('Save err:', e); }
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
const EXPED_MAX      = 12;
const EXPED_REGEN_MS = 10 * 60 * 1000;   // +1 bod za 10 minut

// Cooldown roste s úrovní — vyšší level = delší odpočinek mezi výpravami
function expedCooldownMs() {
  const L = character ? character.level : 1;
  if (L <= 10) return 15 * 1000;
  if (L <= 20) return 30 * 1000;
  if (L <= 35) return 45 * 1000;
  if (L <= 50) return 90 * 1000;
  return 150 * 1000;
}

// načte body a doplní ty, co se mezitím zregenerovaly
function expedPoints() {
  let pts = parseInt(localStorage.getItem('expedPts'), 10);
  let at  = parseInt(localStorage.getItem('expedPtsAt'), 10);
  if (isNaN(pts)) pts = EXPED_MAX;
  if (isNaN(at))  at  = Date.now();

  if (pts < EXPED_MAX) {
    const gained = Math.floor((Date.now() - at) / EXPED_REGEN_MS);
    if (gained > 0) {
      pts = Math.min(EXPED_MAX, pts + gained);
      at += gained * EXPED_REGEN_MS;
    }
  }
  if (pts >= EXPED_MAX) at = Date.now();

  localStorage.setItem('expedPts', pts);
  localStorage.setItem('expedPtsAt', at);
  return pts;
}

function spendExpedPoint() {
  const pts = expedPoints();
  if (pts <= 0) return false;
  if (pts === EXPED_MAX) localStorage.setItem('expedPtsAt', Date.now());
  localStorage.setItem('expedPts', pts - 1);
  return true;
}

function startExpedCooldown() {
  localStorage.setItem('expedCdUntil', Date.now() + expedCooldownMs());
}

function expedCdLeft() {
  const until = parseInt(localStorage.getItem('expedCdUntil'), 10) || 0;
  return Math.max(0, until - Date.now());
}

const fmtSec = ms => Math.ceil(ms / 1000) + ' s';

// čas do dalšího bodu
function expedRegenLeft() {
  if (expedPoints() >= EXPED_MAX) return 0;
  const at = parseInt(localStorage.getItem('expedPtsAt'), 10) || Date.now();
  return Math.max(0, at + EXPED_REGEN_MS - Date.now());
}

// obnoví ukazatele bodů a tlačítka Útok
function refreshExpedUI() {
  if (!character) return;

  const pts = expedPoints();
  const el  = document.getElementById('expedPts');
  if (el) el.textContent = pts + ' / ' + EXPED_MAX;

  const dg = document.getElementById('dungeonPts');
  if (dg) dg.textContent = pts + ' / ' + EXPED_MAX;

  const cd = expedCdLeft();
  document.querySelectorAll('.mon-attack').forEach(b => {
    if (cd > 0)        { b.disabled = true;  b.textContent = 'Odpočinek ' + fmtSec(cd); }
    else if (pts <= 0) { b.disabled = true;  b.textContent = 'Bez bodů'; }
    else if (b.dataset.locked !== '1') { b.disabled = false; b.textContent = 'Útok'; }
  });

  const info = document.getElementById('expedInfo');
  if (info) {
    const regen = expedRegenLeft();
    info.textContent =
      (cd > 0 ? 'Odpočinek: ' + fmtSec(cd) + ' · ' : '') +
      'Body výpravy: ' + pts + '/' + EXPED_MAX +
      (regen > 0 ? ' · další za ' + Math.ceil(regen / 60000) + ' min' : '');
  }
}

setInterval(refreshExpedUI, 1000);

// ========== VÝPRAVY ==========
// Lokace se odemykají podle úrovně. Staty příšer se dopočítají
// z úrovně lokace, takže je balanc konzistentní napříč celou mapou.
const EXPED_DEFS = [
  { id:'poustevnik', name:'Poustevník',      lvl:1,
    desc:'Poustevníkova chatrč stojí kousek za hradbami. Místo klidu a modliteb — jenže krysy, ' +
         'toulaví vlci a hladoví havrani z okolních polí sem chodí častěji než poutníci. ' +
         'Pro začínajícího gladiátora ideální místo, kde si otestovat první meč.',
    mobs:[['Zdivočelý Netopýr','bat'],['Toulavý Vlk','wolf'],['Hladový Havran','raven'],['Křížák','spider']] },

  { id:'chram', name:'Jeskynní chrám',  lvl:4,
    desc:'Pod zemí se skrývá chrám starší než samotné Atény. Stěny porostlé svítícím mechem, ' +
         'ozvěna nesoucí zvuky, které nepatří ničemu živému. Poklady tu leží na dosah — ' +
         'hlídané tvory, kteří nikdy nespatřili slunce.',
    mobs:[['Slizoun','slime'],['Skřet Zlodějský','goblin'],['Jeskynní Krab','crab'],['Chrámový Golem','golem']] },

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
  id: d.id, name: d.name, minLevel: d.lvl, desc: d.desc,
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
      name, img: `monsters/${img}.png`,
      lvl:  [d.lvl + i, d.lvl + i + 2],
      hp:   [r(hp * 0.85), r(hp * 1.15)],
      str:  r(str),
      def:  r(def),
      gold: [r(loot * 0.8), r(loot * 1.3)],
      exp:  [r(loot * 0.9), r(loot * 1.4)],
    };
  })
}));

let currentExped = 'poustevnik';

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
const TRAIN_STATS = [
  { key:'strength',     name:'Síla',        popis:'Zvyšuje poškození, které rozdáš.' },
  { key:'defense',      name:'Obrana',      popis:'Tlumí zásahy soupeřů.' },
  { key:'agility',      name:'Hbitost',     popis:'Pomáhá ti uhýbat a útočit dřív.' },
  { key:'intelligence', name:'Inteligence', popis:'Otevírá cestu k magickému vybavení.' },
];

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
      <div class="tr-row">
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

  return `
  <div class="panel">
    <div class="panel-header">Popis</div>
    <div class="panel-body">
      <div class="tr-intro">
        <div class="tr-portrait">
          ${artImg('img/merchants/trainer.png', '🛡️', 'tr-img', 'Veterán')}
        </div>
        <div class="tr-text">
          <p>
            Jakmile vstoupíš na cvičiště arény, spatříš několik gladiátorů,
            kteří zlepšují své bojové schopnosti. Pozoruje je veterán z římské
            legie a čas od času jim dá nějakou radu.
          </p>
          <p>Zde můžeš zlepšit své válečnické schopnosti.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="panel tr-panel">
    <div class="panel-body">
      <div class="tr-list">${rows}</div>
      <div class="tr-foot">
        Tvé zlato: <b>${zlato.toLocaleString('cs-CZ')}</b>
        <img class="res-ico" src="img/ui/coin.png" alt="zlata">
      </div>
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
const premium = () => lockedSoon('Prémium');


// ========== ŽIVOTNOST PŘEDMĚTŮ ==========
// Zničený kus zůstane nasazený, ale nedává žádné bonusy,
// dokud ho hráč nenechá spravit v Kovárně.
const isBroken = it => !!(it && it.durMax && it.dur <= 0);

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
  const kusy = repairable();
  const celkem = kusy.reduce((a, x) => a + repairCost(x.it), 0);

  if (!kusy.length) {
    return `
    <div class="panel">
      <div class="panel-header">Kovárna</div>
      <div class="panel-body">
        <div class="coming-soon">
          <div class="cs-icon">🔨</div>
          <h2>Všechno je jako nové</h2>
          <p>Kovář si otírá ruce — nemá do čeho píchnout.</p>
        </div>
      </div>
    </div>`;
  }

  const rows = kusy.map(x => {
    const it = x.it, pct = Math.round(it.dur / it.durMax * 100);
    const cena = repairCost(it);
    const ok = character.gold >= cena;
    return `
      <div class="gl-row" data-tip="${x.kde === 'eq' ? 'eq:' + x.ref : 'inv:' + x.ref}">
        <div class="gl-ico">${itemIcon(it, 'b-ico')}</div>
        <div class="gl-main">
          <div class="gl-nm">${it.name}${isBroken(it) ? ' <span class="broken-tag">zničeno</span>' : ''}</div>
          <div class="dur-bar"><i class="${durClass(pct)}" style="width:${pct}%"></i></div>
          <div class="gl-sub">${it.dur} / ${it.durMax} (${pct} %)${x.kde === 'eq' ? ' · nasazeno' : ''}</div>
        </div>
        <div class="train-cost ${ok ? '' : 'poor'}">${cena} zlata</div>
        <button class="btn-green" ${ok ? '' : 'disabled'} onclick="repairItem('${x.kde}','${x.ref}')">Spravit</button>
      </div>`;
  }).join('');

  return `
  <div class="panel">
    <div class="panel-header">Kovárna</div>
    <div class="panel-body">
      <p class="hall-note">
        Každý boj kus vybavení odře. Když životnost klesne na nulu,
        předmět přestane dávat bonusy, dokud ho kovář nespraví.
      </p>
      <div class="gl-list">${rows}</div>
      <div class="forge-total">
        <span>Vše dohromady: <b>${celkem} zlata</b></span>
        <button class="btn-green" ${character.gold >= celkem ? '' : 'disabled'} onclick="repairAll()">Spravit vše</button>
      </div>
    </div>
  </div>`;
}

const durClass = pct => pct === 0 ? 'dur-zero' : pct < 25 ? 'dur-low' : pct < 60 ? 'dur-mid' : 'dur-full';


// ========== ZPRÁVA Z BOJE ==========
let lastReport = null;   // { won, odmeny, hrac, soupeR }

// srovnávací tabulka statů — zrcadlená, aby stály proti sobě
function reportStats(s, mirror) {
  const max = { hp: s.maxHp, str: 400, agi: 400, def: 400, int: 400 };
  const bar = (v, m) => `<div class="rs-bar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div>`;

  const radek = (jmeno, hodnota, pruh) => mirror
    ? `<div class="rs-row"><b>${hodnota}</b>${pruh || '<span></span>'}<span>${jmeno}</span></div>`
    : `<div class="rs-row"><span>${jmeno}</span>${pruh || '<span></span>'}<b>${hodnota}</b></div>`;

  return `
    <div class="rs-table ${mirror ? 'mirror' : ''}">
      ${radek('Úroveň', s.level)}
      ${radek('Životy', s.hp + ' / ' + s.maxHp, bar(s.hp, max.hp))}
      ${radek('Síla', s.str, bar(s.str, max.str))}
      ${radek('Obratnost', s.agi, bar(s.agi, max.agi))}
      ${radek('Odolnost', s.def, bar(s.def, max.def))}
      ${radek('Inteligence', s.int, bar(s.int, max.int))}
      ${radek('Zbroj', s.armor)}
      ${radek('Poškození', s.dmg)}
    </div>`;
}

function reportFighter(s, mirror) {
  const portret = s.img
    ? `<img class="ico rf-img" src="img/${s.img}" alt="${s.name}" data-emoji="👹" data-try="svg" onerror="iconFallback(this)">`
    : `<div class="rf-img">${getAvatar(s.class, s.gender)}</div>`;
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

    <div class="fr-actions">
      <button class="btn-green" onclick="refight()">Bojovat znovu</button>
      <button class="btn-back" onclick="openView('${r.zpet}')">Zpět</button>
    </div>
  </div>`;
}

// ===== SÍŇ SLÁVY =====
function hall() {
  const claimed = localStorage.getItem('lastDaily') === new Date().toDateString();
  setTimeout(loadLeaderboard, 0);   // doplní se po vykreslení
  return `
  <div class="panel">
    <div class="panel-header">Síň slávy</div>
    <div class="panel-body">
      <div class="hall-grid">

        <div class="hall-box">
          <h3>Nejlepší gladiátoři</h3>
          <div id="leaderboard"></div>
        </div>

        <div class="hall-box">
          <h3>Denní odměna</h3>
          <p class="hall-note">Jednou denně ti Olymp přeje. Vyzvedni si zlato a zkušenosti.</p>
          <button class="btn-green" id="dailyBtn" ${claimed ? 'disabled' : ''} onclick="claimDaily()">
            ${claimed ? 'Dnes už vyzvednuto' : 'Vyzvednout odměnu'}
          </button>
        </div>

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
            ${cell('Zkušenosti', c.experience + '/' + c.level * 100)}
            ${cell('Životy', c.health + '/' + c.max_health)}
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
            ${cell('Body', expedPoints() + '/' + EXPED_MAX)}
            ${cell('Odpočinek', Math.ceil(expedCooldownMs() / 1000) + ' s')}
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
  const locked = character.level < loc.minLevel;

  const cards = loc.monsters.map((m, i) => `
    <div class="mon-card" data-tip="mon:${i}">
      <div class="mon-name">${m.name}</div>
      <div class="mon-frame">${monsterPortrait(m, 'mon-img')}</div>

      <button class="btn-green mon-attack" ${locked ? 'disabled data-locked="1"' : ''}
              onclick="attackMonster(${i})">Útok</button>

      <div class="mon-rew">
        <span title="Zlato">🪙 ${m.gold[0]}–${m.gold[1]}</span>
        <span title="Zkušenosti">⭐ ${m.exp[0]}–${m.exp[1]}</span>
      </div>

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

function attackMonster(i) {
  const loc = EXPEDITIONS.find(e => e.id === currentExped);
  if (!loc) return;
  if (character.level < loc.minLevel) { toast(`Potřebuješ úroveň ${loc.minLevel}.`); return; }

  const cd = expedCdLeft();
  if (cd > 0) { toast('Ještě si odpočiň — zbývá ' + fmtSec(cd) + '.'); return; }
  if (!spendExpedPoint()) { toast('Došly body výpravy. Další se doplní za 10 minut.'); return; }

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

// ---------- univerzální start boje ----------
function beginFight(enemy, view) {
  clearTimeout(fightTimer);
  character.health = character.max_health;
  currentEnemy = JSON.parse(JSON.stringify(enemy));
  if (currentEnemy.maxHp == null) currentEnemy.maxHp = currentEnemy.hp;
  inCombat = true;
  lastFight = { enemy, view };

  openView(view);
  setTimeout(() => {
    const panel = document.getElementById('combatPanel');
    if (!panel) return;
    panel.style.display = 'block';

    document.getElementById('pAvatar').innerHTML = getAvatar(character.class, character.gender);
    document.getElementById('pName').textContent = character.name;

    const eAv = document.getElementById('eAvatar');
    eAv.innerHTML = currentEnemy.img
      ? monsterPortrait(currentEnemy, 'fighter-img')
      : `<span style="font-size:44px">${currentEnemy.icon}</span>`;

    document.getElementById('eName').textContent = currentEnemy.name;
    document.getElementById('combatLog').innerHTML = '';
    document.getElementById('combatBtns').innerHTML =
      `<button class="btn-back" onclick="skipFight()">Přeskočit animaci</button>`;

    updateHpBars();
    addLog(`${character.name} vs ${currentEnemy.name} — boj začal!`, 'log-s');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    fightTimer = setTimeout(fightRound, 600);   // boj běží sám
  }, 60);
}

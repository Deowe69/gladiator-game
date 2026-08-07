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
    { id:'w1', name:'Bronzový Meč',    icon:'🗡️', stat:'+6 Síla',    key:'strength',  val:6,  price:100,  quality:'common'   },
    { id:'w2', name:'Železný Kopí',    icon:'🔱', stat:'+12 Síla',   key:'strength',  val:12, price:220,  quality:'uncommon' },
    { id:'w3', name:'Ocelová Kosa',    icon:'⚔️', stat:'+20 Síla',   key:'strength',  val:20, price:450,  quality:'rare'     },
    { id:'w4', name:'Meč Achillea',    icon:'🌟', stat:'+35 Síla',   key:'strength',  val:35, price:900,  quality:'epic'     },
    { id:'w5', name:'Luk Artemidy',    icon:'🏹', stat:'+18 Síla',   key:'strength',  val:18, price:380,  quality:'rare'     },
  ],
  armor: [
    { id:'a1', name:'Kožená Zbroj',    icon:'🧥', stat:'+6 Obrana',  key:'defense',   val:6,  price:90,   quality:'common'   },
    { id:'a2', name:'Bronzová Zbroj',  icon:'🛡️', stat:'+14 Obrana', key:'defense',   val:14, price:200,  quality:'uncommon' },
    { id:'a3', name:'Athénin Štít',    icon:'⛨',  stat:'+25 Obrana', key:'defense',   val:25, price:480,  quality:'rare'     },
    { id:'a4', name:'Zbroj Spartana',  icon:'💠', stat:'+40 Obrana', key:'defense',   val:40, price:950,  quality:'epic'     },
  ],
  armor_extra: [
    { id:'h1', name:'Korintská Helma', icon:'⛑️', stat:'+8 Obrana',  key:'defense',   val:8,  price:150,  quality:'uncommon' },
    { id:'h2', name:'Helma Heros',     icon:'👑', stat:'+16 Obrana', key:'defense',   val:16, price:320,  quality:'rare'     },
    { id:'g1', name:'Kožené Rukavice', icon:'🥊', stat:'+5 Síla',    key:'strength',  val:5,  price:80,   quality:'common'   },
    { id:'g2', name:'Železné Rukavice',icon:'👊', stat:'+12 Síla',   key:'strength',  val:12, price:200,  quality:'uncommon' },
    { id:'b1', name:'Běžné Boty',      icon:'👟', stat:'+4 Hbitost', key:'agility',   val:4,  price:70,   quality:'common'   },
    { id:'b2', name:'Hermovy Boty',    icon:'🥾', stat:'+10 Hbitost',key:'agility',   val:10, price:180,  quality:'rare'     },
    { id:'b3', name:'Kožený Pás',      icon:'🔗', stat:'+3 Obrana',  key:'defense',   val:3,  price:60,   quality:'common'   },
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
const TAB_OF_VIEW = { profile:0, inventory:0, city:0, stats:1, achievements:2, guild:3 };

function openView(view) {
  // zvýraznění v levém banneru
  document.querySelectorAll('.menu-btn, .sub-item').forEach(i => i.classList.remove('active'));
  const m = document.getElementById('menu-' + view);
  if (m) m.classList.add('active');

  // folder taby nad pergamenem
  const tabs = document.querySelectorAll('.ftab');
  tabs.forEach(t => t.classList.remove('active'));
  const ti = TAB_OF_VIEW[view];
  if (ti !== undefined && tabs[ti]) tabs[ti].classList.add('active');

  const cc = document.getElementById('centerContent');
  const views = { city, arena, dungeon, quests, shop, inventory: profileView, profile: profileView, guild, tavern, forge };
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
        <div class="city-building" onclick="openView('tavern')">
          <span class="building-icon">🍺</span>
          <div class="building-name">Taverna</div>
          <div class="building-desc">Odpočinek & příběhy</div>
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
  <div class="panel" id="combatPanel" style="display:none;">
    <div class="panel-header">⚔ Průběh boje</div>
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
            <div class="fighter-avatar-lg" id="eAvatar" style="display:flex;align-items:center;justify-content:center;font-size:2.5em;"></div>
            <div class="fighter-name-lg" id="eName">-</div>
            <div class="hp-row">
              <div class="hp-bg"><div class="hp-fg enemy" id="eHpBar" style="width:100%"></div></div>
              <span class="hp-txt" id="eHpTxt">-</span>
            </div>
          </div>
        </div>
        <div class="combat-log" id="combatLog"></div>
        <div class="combat-btns" id="combatBtns">
          <button class="btn-attack" onclick="doAttack()">⚔ Útočit</button>
          <button class="btn-flee" onclick="fleeCombat()">🏃 Utéct</button>
        </div>
      </div>
    </div>
  </div>`;
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

function shop() {
  const merchants = [
    { id: 'blacksmith', name: 'Zbrojiř', icon: '🔨', desc: 'Nejlepší zbraně Olympu', items: SHOP_ITEMS.weapons },
    { id: 'armorer', name: 'Zbrojnice', icon: '🛡️', desc: 'Silná zbroj a ochrana', items: SHOP_ITEMS.armor.concat(SHOP_ITEMS.armor_extra || []) },
    { id: 'jeweler', name: 'Šperkař', icon: '💍', desc: 'Vzácné šperky a relikvie', items: SHOP_ITEMS.jewelry },
    { id: 'alchemist', name: 'Alchymista', icon: '🧪', desc: 'Magické lektvary a elixíry', items: SHOP_ITEMS.potions },
  ];

  return `
  <div class="panel">
    <div class="panel-header">🏪 Athenský Trh</div>
    <div class="panel-body">
      <div class="shop-merchants">
        ${merchants.map(m => `
          <div class="merchant-card" onclick="openMerchant('${m.id}')">
            <div class="merchant-icon">${m.icon}</div>
            <div class="merchant-name">${m.name}</div>
            <div class="merchant-desc">${m.desc}</div>
          </div>
        `).join('')}
      </div>
      <div class="merchant-shop" id="merchantShop" style="display:none;">
        <button class="btn-back" onclick="openView('shop')">← Zpět na Trh</button>
        <div id="merchantContent"></div>
      </div>
    </div>
  </div>`;
}

function openMerchant(merchantId) {
  const shops = {
    blacksmith: { name: 'Zbrojiř', items: SHOP_ITEMS.weapons },
    armorer: { name: 'Zbrojnice', items: SHOP_ITEMS.armor.concat(SHOP_ITEMS.armor_extra || []) },
    jeweler: { name: 'Šperkař', items: SHOP_ITEMS.jewelry },
    alchemist: { name: 'Alchymista', items: SHOP_ITEMS.potions },
  };

  const shop = shops[merchantId];
  if (!shop) return;

  currentShop = merchantId;
  const grid = document.getElementById('merchantShop');
  const content = document.getElementById('merchantContent');

  const itemsHTML = shop.items.map(item => `
    <div class="shop-card">
      <span class="shop-card-icon">${item.icon}</span>
      <div class="shop-card-name">${item.name}</div>
      <div class="shop-card-stat">${item.stat}</div>
      <div class="shop-card-price">💰 ${item.price}</div>
      <button class="shop-btn" onclick="buyItem('${item.id}')"
        ${character.gold < item.price ? 'disabled' : ''}>
        ${character.gold >= item.price ? '🛒 Koupit' : '❌ Nedost. zlata'}
      </button>
    </div>`).join('');

  content.innerHTML = `
    <h2>${shop.name}</h2>
    <div class="shop-grid">${itemsHTML}</div>
  `;

  document.querySelector('.shop-merchants').style.display = 'none';
  grid.style.display = 'block';
}

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

const QUALITY_CONFIG = {
  common:    { color:'#888',   label:'Běžný',     glow:'' },
  uncommon:  { color:'#3a9a2a',label:'Neobvyklý', glow:'0 0 8px rgba(58,154,42,.5)' },
  rare:      { color:'#2255bb',label:'Vzácný',    glow:'0 0 8px rgba(34,85,187,.5)' },
  epic:      { color:'#8833cc',label:'Epický',    glow:'0 0 10px rgba(136,51,204,.6)' },
  legendary: { color:'#D4AF37',label:'Legendární',glow:'0 0 14px rgba(212,175,55,.7)' },
};

let draggedItem = null;
let draggedFrom = null;

function inventoryView() {
  const c = character;
  const xpNeeded = c.level * 100;
  const xpPct = Math.min(100, (c.experience / xpNeeded * 100)).toFixed(1);

  // Total bonusy z equipment
  const totalStr  = Object.values(equipped).filter(e=>e&&e.key==='strength').reduce((a,e)=>a+e.val,0);
  const totalDef  = Object.values(equipped).filter(e=>e&&e.key==='defense').reduce((a,e)=>a+e.val,0);
  const totalAgi  = Object.values(equipped).filter(e=>e&&e.key==='agility').reduce((a,e)=>a+e.val,0);
  const totalInt  = Object.values(equipped).filter(e=>e&&e.key==='intelligence').reduce((a,e)=>a+e.val,0);
  const totalDmg  = Math.floor((c.strength + totalStr) * 1.5);
  const totalArmor= (c.defense + totalDef) * 3;

  function slotHTML(key) {
    const def = SLOT_DEFS[key];
    const eq  = equipped[key];
    const qcfg = eq ? (QUALITY_CONFIG[eq.quality||'common']) : null;
    return `
    <div class="equip-slot"
         data-slot="${key}"
         draggable="true"
         ondragstart="onDragStart(event, 'slot', '${key}')"
         ondragover="onDragOver(event)"
         ondrop="onDrop(event, 'slot', '${key}')"
         ondragleave="onDragLeave(event)"
         style="${eq ? 'border-color:'+qcfg.color+';box-shadow:'+qcfg.glow : ''}">
      ${eq ? `
        <div class="equip-slot-item">
          <div class="equip-icon">${eq.icon}</div>
          <div class="equip-name">${eq.name}</div>
          <div class="equip-stat" style="color:${qcfg.color}">+${eq.val}</div>
        </div>
      ` : `
        <div class="equip-slot-empty">
          <div class="equip-slot-icon">${def.icon}</div>
          <div class="equip-slot-name">${def.label}</div>
        </div>
      `}
    </div>`;
  }

  function statRow(icon, label, base, bonus, color, max) {
    const total = base + (bonus||0);
    const pct = Math.min(100, total/max*100).toFixed(1);
    return `
    <div class="pstat-row">
      <div class="pstat-left">
        <span class="pstat-icon">${icon}</span>
        <span class="pstat-name">${label}</span>
      </div>
      <div class="pstat-bar-wrap">
        <div class="pstat-bar-bg">
          <div class="pstat-bar-fill" style="width:${pct}%;background:${color}"></div>
          ${bonus > 0 ? `<div class="pstat-bar-bonus" style="left:${Math.min(100,(base/max*100)).toFixed(1)}%;width:${Math.min(100-base/max*100,(bonus/max*100)).toFixed(1)}%;background:${color};opacity:.5"></div>` : ''}
        </div>
      </div>
      <div class="pstat-val">
        <span style="color:${color}">${total}</span>
        ${bonus > 0 ? `<span class="pstat-bonus">+${bonus}</span>` : ''}
      </div>
    </div>`;
  }

  const invHTML = Array.from({length:20}, (_,i) => {
    const item = inventory[i];
    if (!item) return `<div class="inv-slot inv-empty" data-inv="${i}" ondragover="onDragOver(event)" ondrop="onDrop(event, 'inv', ${i})" ondragleave="onDragLeave(event)"></div>`;
    const qcfg = QUALITY_CONFIG[item.quality||'common'];
    return `
    <div class="inv-slot inv-filled"
         data-inv="${i}"
         draggable="true"
         ondragstart="onDragStart(event, 'inv', ${i})"
         ondragover="onDragOver(event)"
         ondrop="onDrop(event, 'inv', ${i})"
         ondragleave="onDragLeave(event)"
         style="border-color:${qcfg.color};box-shadow:${qcfg.glow}"
         title="${item.name}&#10;${item.stat}&#10;Kvalita: ${qcfg.label}">
      <div class="inv-item">
        <div class="inv-icon">${item.icon}</div>
        <div class="inv-val" style="color:${qcfg.color}">+${item.val||''}</div>
        <div class="inv-name">${item.name.split(' ').slice(-1)[0]}</div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="profile-container">

    <!-- HEADER -->
    <div class="profile-header">
      <div class="profile-title">
        <span class="profile-icon">${c.class==='Warrior'?'🗡️':c.class==='Mage'?'🔮':c.class==='Rogue'?'🥷':'🛡️'}</span>
        <h1>${c.name}</h1>
        <span class="profile-class">${c.class}</span>
      </div>
      <div class="profile-tabs">
        <button class="ptab active" onclick="profTab(this,'ptab-main')">⚔ Profil</button>
        <button class="ptab" onclick="profTab(this,'ptab-stats')">📊 Statistiky</button>
        <button class="ptab" onclick="profTab(this,'ptab-victories')">🏆 Vítězství</button>
      </div>
    </div>

    <!-- TAB: PROFIL S DRAG-DROP -->
    <div id="ptab-main" class="ptab-content active">
      <div class="profile-main">

        <!-- CENTRUM: AVATAR + EQUIPMENT -->
        <div class="profile-center">
          <!-- Velký Avatar -->
          <div class="avatar-section">
            <div class="avatar-frame">
              <div class="avatar-inner">${getAvatar(c.class, c.gender)}</div>
              <div class="avatar-level">${c.level}</div>
            </div>
          </div>

          <!-- Equipment Slots (drag-drop) -->
          <div class="equipment-grid">
            <div class="equip-row">
              <div class="equip-spacer"></div>
              ${slotHTML('helmet')}
              <div class="equip-spacer"></div>
            </div>
            <div class="equip-row">
              ${slotHTML('weapon')}
              ${slotHTML('chest')}
              ${slotHTML('shield')}
            </div>
            <div class="equip-row">
              ${slotHTML('gloves')}
              <div class="equip-spacer"></div>
              ${slotHTML('boots')}
            </div>
            <div class="equip-row">
              ${slotHTML('ring')}
              ${slotHTML('amulet')}
              ${slotHTML('belt')}
            </div>
          </div>

          <!-- XP Bar -->
          <div class="xp-section">
            <div class="xp-label">Zkušenosti</div>
            <div class="xp-bg">
              <div class="xp-fill" style="width:${xpPct}%"></div>
            </div>
            <div class="xp-text">${c.experience} / ${xpNeeded}</div>
          </div>
        </div>

        <!-- VLEVO: ATRIBUTY -->
        <div class="profile-left">
          <div class="stat-panel">
            <h3>⚔ Atributy</h3>
            <div class="stat-list">
              ${statRow('❤️','Zdraví',    c.max_health, 0,        '#CC2222', 500)}
              ${statRow('⚔️','Síla',      c.strength,   totalStr,  '#E87020', 300)}
              ${statRow('🛡️','Obrana',    c.defense,    totalDef,  '#8833CC', 300)}
              ${statRow('💨','Hbitost',   c.agility,    totalAgi,  '#22AA44', 300)}
              ${statRow('🔮','Intelekt',  c.intelligence,totalInt, '#2266DD', 300)}
            </div>
          </div>
          <div class="combat-stats">
            <div class="cstat">
              <span class="cstat-icon">⚔</span>
              <span>Poškození</span>
              <span class="cstat-val">${Math.max(1,c.strength-5)}-${totalDmg}</span>
            </div>
            <div class="cstat">
              <span class="cstat-icon">🛡</span>
              <span>Zbroj</span>
              <span class="cstat-val">${totalArmor}</span>
            </div>
            <div class="cstat">
              <span class="cstat-icon">💰</span>
              <span>Zlato</span>
              <span class="cstat-val" style="color:var(--gold)">${c.gold}</span>
            </div>
          </div>
        </div>

        <!-- VPRAVO: INVENTÁŘ -->
        <div class="profile-right">
          <div class="inventory-panel">
            <h3>🎒 Batoh (${inventory.length}/20)</h3>
            <div class="inventory-grid">${invHTML}</div>
            <div class="inventory-hint">
              ${inventory.length > 0
                ? '💡 Přetáhni předmět na slot pro nasazení'
                : 'Inventář je prázdný — nakup vybavení na Trhu!'}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- TAB: STATISTIKY -->
    <div id="ptab-stats" class="ptab-content">
      <div class="stats-grid">
        <div class="stats-block">
          <h3>⚔ Bojové statistiky</h3>
          <div class="stat-cells">
            <div class="stat-cell"><div class="sc-val">${c.strength + totalStr}</div><div class="sc-name">Síla</div></div>
            <div class="stat-cell"><div class="sc-val">${c.defense + totalDef}</div><div class="sc-name">Obrana</div></div>
            <div class="stat-cell"><div class="sc-val">${c.agility + totalAgi}</div><div class="sc-name">Hbitost</div></div>
            <div class="stat-cell"><div class="sc-val">${c.intelligence + totalInt}</div><div class="sc-name">Intelekt</div></div>
            <div class="stat-cell"><div class="sc-val">${totalDmg}</div><div class="sc-name">Max DMG</div></div>
            <div class="stat-cell"><div class="sc-val">${totalArmor}</div><div class="sc-name">Zbroj</div></div>
          </div>
        </div>
        <div class="stats-block">
          <h3>📜 Obecné</h3>
          <div class="stat-cells">
            <div class="stat-cell"><div class="sc-val" style="color:var(--gold)">${c.level}</div><div class="sc-name">Úroveň</div></div>
            <div class="stat-cell"><div class="sc-val">${c.experience}</div><div class="sc-name">XP</div></div>
            <div class="stat-cell"><div class="sc-val" style="color:var(--gold)">${c.gold}</div><div class="sc-name">Zlato</div></div>
            <div class="stat-cell"><div class="sc-val">${c.max_health}</div><div class="sc-name">Max HP</div></div>
            <div class="stat-cell"><div class="sc-val">${inventory.length}</div><div class="sc-name">Předmětů</div></div>
            <div class="stat-cell"><div class="sc-val">${Object.values(equipped).filter(Boolean).length}</div><div class="sc-name">Vybaveno</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: VÍTĚZSTVÍ -->
    <div id="ptab-victories" class="ptab-content">
      <div class="coming-soon">
        <div class="cs-icon">🏆</div>
        <h2>Síň slávy</h2>
        <p>Statistiky vítězství přijdou brzy...</p>
      </div>
    </div>

  </div>`;
}

function profTab(el, tabId) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.ptab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

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
  if (id === 'm2' || id === 'm5') return 'ring';
  if (/^m/.test(id)) return 'amulet';
  return null; // lektvary a neznámé
}

function profileView() {
  const c = character;
  const bonus = k => Object.values(equipped).filter(e => e && e.key === k).reduce((a,e) => a + e.val, 0);
  const str = c.strength     + bonus('strength');
  const def = c.defense      + bonus('defense');
  const agi = c.agility      + bonus('agility');
  const int = c.intelligence + bonus('intelligence');

  const dmgMax  = Math.floor(str * 1.5);
  const dmgMin  = Math.max(1, Math.floor(str * 1.1));
  const armor   = def * 3;
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

  // --- sloty vybavení ---
  function slotHTML(key, cls) {
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
           title="${eq ? eq.name + ' — klikni pro sundání' : def.label}">
        <span class="s-ico">${eq ? eq.icon : def.icon}</span>
        ${eq ? `<span class="s-nm">${eq.name}</span>` : `<span class="s-lbl">${def.label}</span>`}
      </div>`;
  }

  const dollHTML = DOLL.map(s => slotHTML(s.key, s.cls)).join('') + `
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
                     title="${eq ? eq.name : SLOT_DEFS[k].label}">${eq ? eq.icon : SLOT_DEFS[k].icon}</div>`;
      }).join('')}
    </div>`;

  // --- batoh ---
  const BAG_SIZE = 24;
  let bagHTML = '';
  for (let i = 0; i < BAG_SIZE; i++) {
    const it = inventory[i];
    bagHTML += `
      <div class="bag-slot ${it ? '' : 'empty'}"
           draggable="${it ? 'true' : 'false'}"
           ondragstart="dragStart(event,'inv','${i}')"
           ondragend="dragEnd(event)"
           ondragover="dragOver(event)"
           ondragleave="dragLeave(event)"
           ondrop="dropOn(event,'inv','${i}')"
           onclick="${it ? `useItem(${i})` : ''}"
           title="${it ? it.name + ' (' + it.stat + ')' : ''}">
        ${it ? `<span>${it.icon}</span><span class="b-nm">${it.name.split(' ')[0]}</span>` : ''}
      </div>`;
  }

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

function applyBonus(item, sign) {
  if (item && item.key && item.key !== 'health') character[item.key] += sign * item.val;
}

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

const SLOT_DEFS_KEYS = Object.keys(SLOT_DEFS);

// Kliknutí na slot vybavení (sundání)
function handleSlotClick(key) {
  if (!equipped[key]) return;
  const item = equipped[key];
  // Vrátit bonus
  if (item.key && item.key !== 'health') character[item.key] -= item.val;
  delete equipped[key];
  localStorage.setItem('eqp', JSON.stringify(equipped));
  inventory.push(item);
  localStorage.setItem('inv', JSON.stringify(inventory));
  saveChar(); updateUI();
  openView('inventory');
}

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
function forge() {
  return `
  <div class="panel">
    <div class="panel-header">🔨 Kovárna Hefaista</div>
    <div class="panel-body" style="text-align:center;padding:30px;">
      <div style="font-size:3em;margin-bottom:15px;">🔥</div>
      <p style="color:var(--gold);font-size:1.1em;margin-bottom:10px;">Kovárna Hefaista</p>
      <p style="color:var(--text-dim);font-style:italic;">"Vylepši své vybavení silou olympského ohně"</p>
      <p style="color:var(--text-dim);margin-top:20px;font-size:.85em;">🚧 Brzy dostupné...</p>
    </div>
  </div>`;
}

// ===== GUILD =====
function guild() {
  return `
  <div class="panel">
    <div class="panel-header">🏛️ Gildy</div>
    <div class="panel-body" style="text-align:center;padding:30px;">
      <div style="font-size:3em;margin-bottom:15px;">🏛️</div>
      <p style="color:var(--gold);font-size:1.1em;margin-bottom:10px;">Gildy Olympu</p>
      <p style="color:var(--text-dim);font-style:italic;">"Síla je v jednotě bojovníků"</p>
      <p style="color:var(--text-dim);margin-top:20px;font-size:.85em;">🚧 Brzy dostupné...</p>
    </div>
  </div>`;
}

// ========== COMBAT ==========
function startCombat(idx) {
  // HP se vždy resetuje před bojem
  character.health = character.max_health;
  currentEnemy = JSON.parse(JSON.stringify(ENEMIES[idx]));
  inCombat = true;

  openView('arena');
  setTimeout(() => {
    const panel = document.getElementById('combatPanel');
    if (!panel) return;
    panel.style.display = 'block';

    document.getElementById('pAvatar').innerHTML = getAvatar(character.class, character.gender);
    document.getElementById('pName').textContent = character.name;
    document.getElementById('eAvatar').textContent = currentEnemy.icon;
    document.getElementById('eName').textContent = currentEnemy.name;
    document.getElementById('combatBtns').style.display = 'flex';
    document.getElementById('combatLog').innerHTML = '';

    updateHpBars();
    addLog(`⚔ ${character.name} vs ${currentEnemy.name} - Boj začal!`, 'log-s');
    panel.scrollIntoView({behavior:'smooth'});
  }, 100);
}

function doAttack() {
  if (!inCombat) return;
  const pdmg = Math.max(1, character.strength + Math.floor(Math.random()*8) - currentEnemy.def);
  currentEnemy.hp = Math.max(0, currentEnemy.hp - pdmg);
  addLog(`⚔ ${character.name} zasáhl za <strong>${pdmg}</strong> poškození!`, 'log-p');
  updateHpBars();
  if (currentEnemy.hp <= 0) { endCombat(true); return; }

  setTimeout(() => {
    if (!inCombat) return;
    const edmg = Math.max(1, currentEnemy.str + Math.floor(Math.random()*6) - character.defense);
    character.health = Math.max(0, character.health - edmg);
    addLog(`💥 ${currentEnemy.name} zasáhl za <strong>${edmg}</strong> poškození!`, 'log-e');
    updateHpBars();
    updateUI();
    if (character.health <= 0) endCombat(false);
  }, 700);
}

function endCombat(won) {
  inCombat = false;
  const btns = document.getElementById('combatBtns');
  if (btns) btns.style.display = 'none';
  if (won) {
    character.gold += currentEnemy.gold;
    character.experience += currentEnemy.exp;
    addLog(`🏆 Vítězství! +${currentEnemy.gold}💰 +${currentEnemy.exp}⭐`, 'log-w');
    checkLevelUp(); saveChar(); updateUI();
  } else {
    character.health = Math.max(1, Math.floor(character.max_health * 0.25));
    addLog(`💀 Poražen! Probral ses s ${character.health} HP.`, 'log-d');
    saveChar(); updateUI();
  }
}

function fleeCombat() {
  inCombat = false;
  addLog('🏃 Utekl jsi z boje!', 'log-s');
  const btns = document.getElementById('combatBtns');
  if (btns) btns.style.display = 'none';
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
  if (character.level < d.level) { alert(`🔒 Potřebuješ úroveň ${d.level}!`); return; }
  alert(`🏰 Vstupuješ do: ${d.name}\n⏱ Trvá: ${d.time}\nVrátíš se za ${d.time}!`);
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
    // Only refresh if current view has quests (avoid unnecessary DOM operations)
    const hasQuests = cc.querySelector('.quest-list');
    const hasTavern = cc.querySelector('.tavern-board');
    if (hasQuests) openView('quests');
    else if (hasTavern) openView('tavern');
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
function buyItem(itemId) {
  let item = null;
  for (const cat of Object.values(SHOP_ITEMS)) {
    item = cat.find(i => i.id === itemId);
    if (item) break;
  }
  if (!item) return;
  if (character.gold < item.price) { alert('❌ Nedostatek zlatých!'); return; }
  character.gold -= item.price;
  // Just add to inventory - don't apply stats yet (will be done on equip)
  inventory.push({...item});
  localStorage.setItem('inv', JSON.stringify(inventory));
  saveChar(); updateUI();
  alert(`✅ Zakoupeno: ${item.name}`);
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
  document.getElementById('dailyBtn').disabled = true;
  alert(`🎁 Denní odměna!\n+${gold} 💰\n+${exp} ⭐`);
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

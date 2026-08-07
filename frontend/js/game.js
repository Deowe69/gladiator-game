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
  ],
  armor: [
    { id:'a1', name:'Kožená Zbroj',    icon:'🧥', stat:'+6 Obrana',  key:'defense',   val:6,  price:90,   quality:'common'   },
    { id:'a2', name:'Bronzová Zbroj',  icon:'🛡️', stat:'+14 Obrana', key:'defense',   val:14, price:200,  quality:'uncommon' },
    { id:'a3', name:'Athénin Štít',    icon:'⛨',  stat:'+25 Obrana', key:'defense',   val:25, price:480,  quality:'rare'     },
    { id:'a4', name:'Zbroj Spartana',  icon:'💠', stat:'+40 Obrana', key:'defense',   val:40, price:950,  quality:'epic'     },
  ],
  potions: [
    { id:'p1', name:'Malý Lektvar',    icon:'🧪', stat:'+30 HP',     key:'health',    val:30, price:25,   quality:'common'   },
    { id:'p2', name:'Střední Lektvar', icon:'⚗️', stat:'+80 HP',     key:'health',    val:80, price:60,   quality:'uncommon' },
    { id:'p3', name:'Ambrózie Bohů',   icon:'🍯', stat:'+200 HP',    key:'health',    val:200,price:150,  quality:'rare'     },
  ],
  misc: [
    { id:'m1', name:'Hermův Amulet',   icon:'💍', stat:'+8 Hbitost', key:'agility',   val:8,  price:180,  quality:'uncommon' },
    { id:'m2', name:'Apollónův Luk',   icon:'🏹', stat:'+10 Intel.', key:'intelligence',val:10,price:220, quality:'uncommon' },
    { id:'m3', name:'Poseidonův Trident',icon:'🔱',stat:'+15 Síla +10 Obrana',key:'strength',val:15,price:500,quality:'rare'},
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
  } catch { window.location.href = 'index.html'; }
});

// ========== UI UPDATE ==========
function updateUI() {
  const c = character;
  const hpPct = Math.max(0, (c.health / c.max_health * 100)).toFixed(1);
  const xpNeeded = c.level * 100;
  const xpPct = Math.min(100, (c.experience / xpNeeded * 100)).toFixed(1);

  document.getElementById('navName').textContent = c.name;
  document.getElementById('navLevel').textContent = c.level;
  document.getElementById('hpBar').style.width = hpPct + '%';
  document.getElementById('hpVal').textContent = `${c.health}/${c.max_health}`;
  document.getElementById('xpBar').style.width = xpPct + '%';
  document.getElementById('xpVal').textContent = `${c.experience}/${xpNeeded} XP`;
  document.getElementById('navGold').textContent = c.gold;

  document.getElementById('charNameSm').textContent = c.name;
  document.getElementById('charClassSm').textContent = c.class;
  document.getElementById('charAvatarSm').innerHTML = getAvatar(c.class, c.gender);
  document.getElementById('sHealth').textContent = `${c.health}/${c.max_health}`;
  document.getElementById('sStr').textContent = c.strength;
  document.getElementById('sDef').textContent = c.defense;
  document.getElementById('sAgi').textContent = c.agility;
  document.getElementById('sInt').textContent = c.intelligence;

  // Daily btn
  const lastDaily = localStorage.getItem('lastDaily');
  const today = new Date().toDateString();
  document.getElementById('dailyBtn').disabled = lastDaily === today;
}

// ========== VIEWS ==========
function openView(view) {
  document.querySelectorAll('.side-item').forEach(i => i.classList.remove('active'));
  const m = document.getElementById('menu-' + view);
  if (m) m.classList.add('active');

  const cc = document.getElementById('centerContent');
  const views = { city, arena, dungeon, quests, shop, inventory: inventoryView, profile: inventoryView, guild, tavern, forge };
  cc.innerHTML = (views[view] || (() => `<div class="panel"><div class="panel-header">🚧 Brzy</div><div class="panel-body" style="text-align:center;padding:40px;color:var(--text-dim);font-style:italic;">Tato sekce bude brzy dostupná!</div></div>`))();
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

// ===== SHOP =====
function shop() {
  function renderTab(items) {
    return items.map(item => `
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
  }
  return `
  <div class="panel">
    <div class="panel-header">🏪 Trh - Atény</div>
    <div class="panel-body">
      <div class="shop-tabs">
        <div class="shop-tab active" onclick="shopTab(this,'weapons')">⚔ Zbraně</div>
        <div class="shop-tab" onclick="shopTab(this,'armor')">🛡️ Zbroj</div>
        <div class="shop-tab" onclick="shopTab(this,'potions')">🧪 Lektvary</div>
        <div class="shop-tab" onclick="shopTab(this,'misc')">💍 Relikvie</div>
      </div>
      <div class="shop-grid" id="shopItems">${renderTab(SHOP_ITEMS.weapons)}</div>
    </div>
  </div>`;
}

function shopTab(el, cat) {
  document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  function renderTab(items) {
    return items.map(item => `
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
  }
  document.getElementById('shopItems').innerHTML = renderTab(SHOP_ITEMS[cat]);
}

// ===== INVENTORY =====
// Slot definitions - pozice na těle
const SLOT_DEFS = [
  { key:'helmet',  label:'Helma',    icon:'⛑️',  row:0, col:1 },
  { key:'weapon',  label:'Zbraň',    icon:'⚔️',  row:1, col:0 },
  { key:'chest',   label:'Zbroj',    icon:'🧥',  row:1, col:2 },
  { key:'shield',  label:'Štít',     icon:'🛡️',  row:1, col:3 },
  { key:'gloves',  label:'Rukavice', icon:'🥊',  row:2, col:0 },
  { key:'boots',   label:'Boty',     icon:'👟',  row:2, col:2 },
  { key:'ring',    label:'Prsten',   icon:'💍',  row:3, col:0 },
  { key:'amulet',  label:'Amulet',   icon:'📿',  row:3, col:1 },
  { key:'belt',    label:'Pás',      icon:'🔗',  row:3, col:2 },
];

function inventoryView() {
  const c = character;
  const hpPct = (c.health / c.max_health * 100).toFixed(0);
  const xpNeeded = c.level * 100;
  const xpPct = Math.min(100, (c.experience / xpNeeded * 100)).toFixed(0);

  // Equipment grid (3x4 layout jako Gladiatus)
  function slotHTML(key, label, icon) {
    const eq = equipped[key];
    const qualClass = eq ? 'q-' + (eq.quality || 'common') : '';
    return `
    <div class="prof-slot ${eq ? 'prof-slot-filled ' + qualClass : ''}"
         onclick="handleSlotClick('${key}')"
         title="${eq ? eq.name + ' (' + (eq.stat||'') + ')' : label}">
      ${eq ? `
        <div class="prof-slot-item">
          <span class="prof-slot-icon">${eq.icon}</span>
          ${eq.val ? `<span class="prof-slot-val">+${eq.val}</span>` : ''}
        </div>
      ` : `<span class="prof-slot-empty">${icon}</span>`}
      <span class="prof-slot-label">${label}</span>
    </div>`;
  }

  // Inventory items
  const invHTML = inventory.map((item, i) => `
    <div class="prof-inv-item q-${item.quality||'common'}"
         onclick="handleInvClick(${i})"
         title="${item.name}&#10;${item.stat}&#10;Klikni pro nasazení">
      <span class="prof-inv-icon">${item.icon}</span>
      <span class="prof-inv-val">${item.val ? '+'+item.val : ''}</span>
    </div>`).join('') + Array.from({length: Math.max(0, 20-inventory.length)}, (_,i) =>
    `<div class="prof-inv-item prof-inv-empty" title="Prázdné"></div>`
  ).join('');

  // Stat bars jako Gladiatus
  function statBar(label, val, max, color) {
    const pct = Math.min(100, (val/max*100)).toFixed(0);
    return `
    <div class="prof-stat-row">
      <span class="prof-stat-label">${label}</span>
      <div class="prof-stat-bar-bg">
        <div class="prof-stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="prof-stat-val">${val}</span>
    </div>`;
  }

  return `
  <div class="panel panel-gold">
    <div class="panel-header">👤 Profil postavy</div>
    <div class="panel-body" style="padding:0;">

      <!-- TABS jako Gladiatus -->
      <div class="prof-tabs">
        <div class="prof-tab active" onclick="profTab(this,'prof-main')">⚔ Hrdina</div>
        <div class="prof-tab" onclick="profTab(this,'prof-stats')">📊 Statistiky</div>
        <div class="prof-tab" onclick="profTab(this,'prof-victories')">🏆 Vítězství</div>
      </div>

      <!-- MAIN TAB -->
      <div id="prof-main" class="prof-content">
        <div class="prof-layout">

          <!-- LEVÝ PANEL - Avatar + Stats -->
          <div class="prof-left">
            <!-- Avatar box -->
            <div class="prof-avatar-box">
              <div class="prof-title-badge">${c.class}</div>
              <div class="prof-avatar-img" id="profAvatar">${getAvatar(c.class, c.gender)}</div>
            </div>

            <!-- Stats jako Gladiatus -->
            <div class="prof-stats-box">
              ${statBar('Level', c.level, 100, '#D4AF37')}
              ${statBar('Život', c.health, c.max_health, '#CC2222')}
              ${statBar('Zkušenosti', c.experience, xpNeeded, '#D4AF37')}
              ${statBar('Síla', c.strength, 200, '#CC6600')}
              ${statBar('Hbitost', c.agility, 200, '#22AA22')}
              ${statBar('Intelekt', c.intelligence, 200, '#2244CC')}
              ${statBar('Obrana', c.defense, 200, '#AA22AA')}
              <div class="prof-divider"></div>
              <div class="prof-stat-row">
                <span class="prof-stat-label">Zlato</span>
                <span class="prof-stat-val" style="color:var(--gold)">💰 ${c.gold}</span>
              </div>
            </div>
          </div>

          <!-- PRAVÝ PANEL - Equipment grid -->
          <div class="prof-right">
            <div class="prof-equip-label">⚔ Vybavení</div>

            <!-- Equipment grid jako Gladiatus (3 sloupce) -->
            <div class="prof-equip-grid">
              <!-- Řada 1: Helma uprostřed -->
              <div class="prof-slot-empty-space"></div>
              ${slotHTML('helmet','Helma','⛑️')}
              <div class="prof-slot-empty-space"></div>

              <!-- Řada 2: Zbraň | Zbroj | Štít -->
              ${slotHTML('weapon','Zbraň','⚔️')}
              ${slotHTML('chest','Zbroj','🧥')}
              ${slotHTML('shield','Štít','🛡️')}

              <!-- Řada 3: Rukavice | prázdno | Boty -->
              ${slotHTML('gloves','Rukavice','🥊')}
              <div class="prof-slot-empty-space"></div>
              ${slotHTML('boots','Boty','👟')}

              <!-- Řada 4: Prsten | Amulet | Pás -->
              ${slotHTML('ring','Prsten','💍')}
              ${slotHTML('amulet','Amulet','📿')}
              ${slotHTML('belt','Pás','🔗')}
            </div>

            <!-- Guild + akce -->
            <div class="prof-guild-box">
              <div class="prof-guild-row">
                <span style="color:var(--text-dim);font-size:.8em;">Gilda:</span>
                <span style="color:var(--gold);font-size:.85em;margin-left:6px;">— Bez gildy —</span>
              </div>
            </div>

            <!-- Inventář -->
            <div class="prof-inv-label">🎒 Batoh (${inventory.length}/20)</div>
            <div class="prof-inv-grid">${invHTML}</div>
            ${inventory.length > 0 ? `<div style="font-size:.72em;color:var(--text-dim);margin-top:6px;font-style:italic;">Klikni na předmět pro nasazení · Klikni na slot pro sundání</div>` : ''}
          </div>

        </div>
      </div>

      <!-- STATS TAB -->
      <div id="prof-stats" class="prof-content" style="display:none;">
        <div style="padding:20px;">
          <table class="prof-table">
            <tr><td>🗡️ Síla</td><td>${c.strength}</td><td>💨 Hbitost</td><td>${c.agility}</td></tr>
            <tr><td>🛡️ Obrana</td><td>${c.defense}</td><td>🔮 Intelekt</td><td>${c.intelligence}</td></tr>
            <tr><td>❤️ Max Zdraví</td><td>${c.max_health}</td><td>⭐ Level</td><td>${c.level}</td></tr>
            <tr><td>💰 Zlato</td><td>${c.gold}</td><td>📜 XP</td><td>${c.experience}</td></tr>
          </table>
        </div>
      </div>

      <!-- VICTORIES TAB -->
      <div id="prof-victories" class="prof-content" style="display:none;">
        <div style="padding:30px;text-align:center;color:var(--text-dim);font-style:italic;">
          <div style="font-size:3em;margin-bottom:15px;">🏆</div>
          Statistiky vítězství budou brzy dostupné!
        </div>
      </div>

    </div>
  </div>`;
}

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

function profTab(el, tabId) {
  document.querySelectorAll('.prof-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.prof-content').forEach(c => c.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
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
  const pp = (character.health/character.max_health*100).toFixed(1);
  const ep = (currentEnemy.hp/currentEnemy.maxHp*100).toFixed(1);
  const pb = document.getElementById('pHpBar'); if(pb) pb.style.width=pp+'%';
  const eb = document.getElementById('eHpBar'); if(eb) eb.style.width=ep+'%';
  const pt = document.getElementById('pHpTxt'); if(pt) pt.textContent=`${character.health}/${character.max_health}`;
  const et = document.getElementById('eHpTxt'); if(et) et.textContent=`${currentEnemy.hp}/${currentEnemy.maxHp}`;
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
    if (cc.querySelector('.quest-list')) openView('quests');
    if (cc.querySelector('.tavern-board')) openView('tavern');
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
  if (item.key === 'health') {
    character.health = Math.min(character.max_health, character.health + item.val);
  } else {
    character[item.key] += item.val;
  }
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
  const needed = character.level * 100;
  if (character.experience >= needed) {
    character.experience -= needed;
    character.level++;
    character.max_health += 10;
    character.health = character.max_health;
    character.strength += 2;
    character.defense += 1;
    character.agility += 1;
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
async function loadLeaderboard() {
  const lb = document.getElementById('leaderboard');
  if (!lb) return;

  // Pokud není backend (file:// nebo offline), zobraz aktuálního hráče
  if (!API.isLoggedIn()) {
    lb.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.78em;padding:10px;font-style:italic;">Přihlas se pro žebříček</div>';
    return;
  }

  try {
    const res = await API.getLeaderboard();

    if (!res.leaderboard || res.leaderboard.length === 0) {
      // Zobraz aspoň aktuálního hráče
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
    // Backend nedostupný - zobraz aktuálního hráče z localStorage
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

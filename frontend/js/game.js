// ========== GAME STATE ==========
let character = null;
let currentEnemy = null;
let inCombat = false;
let inventory = JSON.parse(localStorage.getItem('inventory') || '[]');

const ENEMIES = [
  { name:'Pouliční Zloděj', icon:'🥷', level:1, hp:30,  maxHp:30,  str:5,  def:2,  gold:15, exp:20 },
  { name:'Opilý Voják',     icon:'⚔️', level:2, hp:50,  maxHp:50,  str:8,  def:4,  gold:25, exp:35 },
  { name:'Goblin',          icon:'👺', level:3, hp:70,  maxHp:70,  str:12, def:6,  gold:40, exp:55 },
  { name:'Banditský Šéf',   icon:'🗡️', level:5, hp:100, maxHp:100, str:18, def:10, gold:70, exp:90 },
  { name:'Temný Rytíř',     icon:'🏴', level:8, hp:150, maxHp:150, str:25, def:18, gold:120,exp:150 },
  { name:'Drak',            icon:'🐉', level:12,hp:250, maxHp:250, str:40, def:25, gold:250,exp:300 },
];

const SHOP_ITEMS = [
  { id:'sword1',    name:'Železný Meč',    icon:'🗡️', stat:'+5 Síla',    statKey:'strength',  val:5,  price:80  },
  { id:'shield1',   name:'Dřevěný Štít',   icon:'🛡️', stat:'+5 Obrana',  statKey:'defense',   val:5,  price:60  },
  { id:'boots1',    name:'Lehké Boty',      icon:'👟', stat:'+5 Hbitost', statKey:'agility',   val:5,  price:50  },
  { id:'sword2',    name:'Ocelový Meč',     icon:'⚔️', stat:'+12 Síla',   statKey:'strength',  val:12, price:200 },
  { id:'armor1',    name:'Kožená Zbroj',    icon:'🧥', stat:'+10 Obrana', statKey:'defense',   val:10, price:180 },
  { id:'potion1',   name:'Lektvar Zdraví',  icon:'🧪', stat:'+50 Zdraví', statKey:'health',    val:50, price:40  },
  { id:'helmet1',   name:'Železná Helma',   icon:'⛑️', stat:'+8 Obrana',  statKey:'defense',   val:8,  price:140 },
  { id:'ring1',     name:'Prsten Síly',     icon:'💍', stat:'+7 Síla',    statKey:'strength',  val:7,  price:160 },
];

const QUESTS = [
  { id:'q1', name:'První Krev',        desc:'Poraz 1 nepřítele v aréně.',          goal:1,  progress:0, done:false, reward:{ gold:50,  exp:30  } },
  { id:'q2', name:'Zkušený Bojovník',  desc:'Poraz 5 nepřátel.',                   goal:5,  progress:0, done:false, reward:{ gold:150, exp:100 } },
  { id:'q3', name:'Zlatá Horečka',     desc:'Nahromadi 200 zlatých.',               goal:200,progress:0, done:false, reward:{ gold:100, exp:80  } },
  { id:'q4', name:'Plně Vybaven',      desc:'Nakup 3 předměty v obchodě.',          goal:3,  progress:0, done:false, reward:{ gold:200, exp:150 } },
  { id:'q5', name:'Drakobijec',        desc:'Poraz Draka.',                         goal:1,  progress:0, done:false, reward:{ gold:500, exp:400 } },
];

// Load quest progress
let quests = JSON.parse(localStorage.getItem('quests') || JSON.stringify(QUESTS));

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.isLoggedIn()) { window.location.href = 'index.html'; return; }
  try {
    const res = await API.getCharacter();
    character = res.character;
    renderUI();
    renderEnemies();
    renderShop();
    renderQuests();
    renderInventory();
  } catch {
    window.location.href = 'index.html';
  }
});

// ========== RENDER UI ==========
function renderUI() {
  const c = character;
  const hpPct = (c.health / c.max_health * 100).toFixed(1);
  const expForNext = c.level * 100;
  const expPct = Math.min((c.experience / expForNext) * 100, 100).toFixed(1);

  document.getElementById('navUsername').textContent = c.name;
  document.getElementById('navHealth').textContent = `${c.health}/${c.max_health}`;
  document.getElementById('navHealthBar').style.width = hpPct + '%';
  document.getElementById('navExp').textContent = `${c.experience} XP`;
  document.getElementById('navExpBar').style.width = expPct + '%';
  document.getElementById('navGold').textContent = c.gold;

  const classIcons = { Warrior:'🗡️', Mage:'🔮', Rogue:'🗡️', Paladin:'🛡️' };
  document.getElementById('charAvatar').textContent = classIcons[c.class] || '⚔';
  document.getElementById('charName').textContent = c.name;
  document.getElementById('charClass').textContent = c.class;
  document.getElementById('charLevel').textContent = c.level;
  document.getElementById('welcomeName').textContent = c.name;

  document.getElementById('statHealth').textContent = `${c.health}/${c.max_health}`;
  document.getElementById('statStr').textContent = c.strength;
  document.getElementById('statDef').textContent = c.defense;
  document.getElementById('statAgi').textContent = c.agility;
  document.getElementById('statInt').textContent = c.intelligence;
}

// ========== TABS ==========
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name !== 'arena') { document.getElementById('combatPanel').style.display = 'none'; }
}

// ========== ENEMIES ==========
function renderEnemies() {
  const grid = document.getElementById('enemyGrid');
  grid.innerHTML = ENEMIES.map(e => `
    <div class="enemy-card">
      <span class="enemy-icon">${e.icon}</span>
      <div class="enemy-name">${e.name}</div>
      <div class="enemy-level">Úroveň ${e.level}</div>
      <div class="enemy-stats">
        <span class="enemy-stat">❤️ ${e.hp}</span>
        <span class="enemy-stat">⚔️ ${e.str}</span>
        <span class="enemy-stat">🛡️ ${e.def}</span>
      </div>
      <button class="btn-fight" onclick="startCombat(${ENEMIES.indexOf(e)})">⚔ Bojovat</button>
    </div>
  `).join('');
}

// ========== COMBAT ==========
function startCombat(idx) {
  if (character.health <= 0) { addLog('⚠ Jsi příliš zraněn! Nejdřív se uzdrav.', 'log-system'); return; }
  currentEnemy = JSON.parse(JSON.stringify(ENEMIES[idx]));
  inCombat = true;
  document.getElementById('combatPanel').style.display = 'block';
  document.getElementById('combatLog').innerHTML = '';
  document.getElementById('combatButtons').style.display = 'flex';

  document.getElementById('playerFighterAvatar').textContent = { Warrior:'🗡️', Mage:'🔮', Rogue:'🥷', Paladin:'🛡️' }[character.class] || '⚔';
  document.getElementById('playerFighterName').textContent = character.name;
  document.getElementById('enemyFighterAvatar').textContent = currentEnemy.icon;
  document.getElementById('enemyFighterName').textContent = currentEnemy.name;

  updateHpBars();
  addLog(`⚔ Boj začal! ${character.name} vs ${currentEnemy.name}`, 'log-system');
  document.getElementById('combatPanel').scrollIntoView({ behavior:'smooth' });
}

function doAttack() {
  if (!inCombat) return;

  // Player attacks
  const playerDmg = Math.max(1, character.strength + Math.floor(Math.random()*6) - currentEnemy.def);
  currentEnemy.hp = Math.max(0, currentEnemy.hp - playerDmg);
  addLog(`⚔ ${character.name} zasáhl za ${playerDmg} poškození!`, 'log-player');
  updateHpBars();

  if (currentEnemy.hp <= 0) { endCombat(true); return; }

  // Enemy attacks back
  setTimeout(() => {
    if (!inCombat) return;
    const enemyDmg = Math.max(1, currentEnemy.str + Math.floor(Math.random()*4) - character.defense);
    character.health = Math.max(0, character.health - enemyDmg);
    addLog(`💥 ${currentEnemy.name} tě zasáhl za ${enemyDmg} poškození!`, 'log-enemy');
    updateHpBars();
    renderUI();

    if (character.health <= 0) { endCombat(false); }
  }, 600);
}

function endCombat(won) {
  inCombat = false;
  document.getElementById('combatButtons').style.display = 'none';

  if (won) {
    character.gold += currentEnemy.gold;
    character.experience += currentEnemy.exp;
    addLog(`🏆 Vítězství! Získal jsi ${currentEnemy.gold}💰 a ${currentEnemy.exp} XP!`, 'log-victory');

    // Quest progress
    updateQuestProgress('kill', 1);
    updateQuestProgress('gold', character.gold);

    // Level up check
    checkLevelUp();
    saveCharacter();
  } else {
    character.health = Math.max(1, Math.floor(character.max_health * 0.3));
    addLog(`💀 Poražen! Probral ses s ${character.health} HP.`, 'log-defeat');
    saveCharacter();
  }
  renderUI();
}

function fleeCombat() {
  inCombat = false;
  addLog('🏃 Utekl jsi z boje!', 'log-system');
  document.getElementById('combatButtons').style.display = 'none';
}

function checkLevelUp() {
  const expNeeded = character.level * 100;
  if (character.experience >= expNeeded) {
    character.level++;
    character.experience -= expNeeded;
    character.max_health += 10;
    character.health = character.max_health;
    character.strength += 2;
    character.defense += 1;
    character.agility += 1;
    document.getElementById('newLevel').textContent = character.level;
    document.getElementById('levelUpModal').style.display = 'flex';
  }
}

function closeLevelUp() {
  document.getElementById('levelUpModal').style.display = 'none';
  renderUI();
}

function updateHpBars() {
  const playerPct = (character.health / character.max_health * 100).toFixed(1);
  const enemyPct  = (currentEnemy.hp / currentEnemy.maxHp * 100).toFixed(1);
  document.getElementById('playerHpBar').style.width  = playerPct + '%';
  document.getElementById('enemyHpBar').style.width   = enemyPct  + '%';
  document.getElementById('playerHpText').textContent = `${character.health}/${character.max_health}`;
  document.getElementById('enemyHpText').textContent  = `${currentEnemy.hp}/${currentEnemy.maxHp}`;
}

function addLog(msg, cls='') {
  const log = document.getElementById('combatLog');
  log.innerHTML += `<div class="${cls}">${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

// ========== SHOP ==========
function renderShop() {
  document.getElementById('shopGrid').innerHTML = SHOP_ITEMS.map(item => `
    <div class="shop-item">
      <span class="shop-icon">${item.icon}</span>
      <div class="shop-name">${item.name}</div>
      <div class="shop-stat">${item.stat}</div>
      <div class="shop-price">💰 ${item.price}</div>
      <button class="btn-buy" onclick="buyItem('${item.id}')">Koupit</button>
    </div>
  `).join('');
}

function buyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  if (character.gold < item.price) { alert('⚠ Nemáš dost zlatých!'); return; }

  character.gold -= item.price;

  if (item.statKey === 'health') {
    character.health = Math.min(character.max_health, character.health + item.val);
  } else {
    character[item.statKey] += item.val;
  }

  inventory.push({ ...item, boughtAt: Date.now() });
  localStorage.setItem('inventory', JSON.stringify(inventory));

  updateQuestProgress('buy', 1);
  saveCharacter();
  renderUI();
  renderInventory();
  alert(`✅ Koupil jsi ${item.name}!`);
}

// ========== QUESTS ==========
function renderQuests() {
  document.getElementById('questList').innerHTML = quests.map(q => {
    const pct = Math.min((q.progress / q.goal) * 100, 100).toFixed(0);
    return `
    <div class="quest-item">
      <div class="quest-name">${q.done ? '✅' : '📜'} ${q.name}</div>
      <div class="quest-desc">${q.desc}</div>
      <div class="quest-rewards">
        <span class="quest-reward">💰 ${q.reward.gold} zlatých</span>
        <span class="quest-reward">⭐ ${q.reward.exp} XP</span>
      </div>
      <div class="quest-progress">
        <div style="font-size:.78em;color:rgba(245,230,211,.5);margin-bottom:4px;">${q.progress}/${q.goal} (${pct}%)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${q.done
        ? '<button class="btn-quest" disabled>✅ Splněno</button>'
        : q.progress >= q.goal
          ? `<button class="btn-quest" onclick="claimQuest('${q.id}')">🎁 Převzít odměnu</button>`
          : '<button class="btn-quest" disabled>⏳ Probíhá...</button>'
      }
    </div>`;
  }).join('');
}

function updateQuestProgress(type, amount) {
  quests.forEach(q => {
    if (q.done) return;
    if (type === 'kill' && (q.id === 'q1' || q.id === 'q2' || q.id === 'q5')) {
      if (q.id === 'q5' && currentEnemy && currentEnemy.name === 'Drak') q.progress = Math.min(q.goal, q.progress + 1);
      else if (q.id !== 'q5') q.progress = Math.min(q.goal, q.progress + 1);
    }
    if (type === 'gold' && q.id === 'q3') q.progress = Math.min(q.goal, amount);
    if (type === 'buy'  && q.id === 'q4') q.progress = Math.min(q.goal, q.progress + 1);
  });
  localStorage.setItem('quests', JSON.stringify(quests));
  renderQuests();
}

function claimQuest(id) {
  const q = quests.find(q => q.id === id);
  if (!q || q.done || q.progress < q.goal) return;
  q.done = true;
  character.gold += q.reward.gold;
  character.experience += q.reward.exp;
  localStorage.setItem('quests', JSON.stringify(quests));
  checkLevelUp();
  saveCharacter();
  renderUI();
  renderQuests();
  alert(`🎉 Úkol "${q.name}" splněn! +${q.reward.gold}💰 +${q.reward.exp}XP`);
}

// ========== INVENTORY ==========
function renderInventory() {
  const grid = document.getElementById('inventoryGrid');
  if (inventory.length === 0) {
    grid.innerHTML = '<div class="empty-msg">Inventář je prázdný. Nakup vybavení v obchodě!</div>';
    return;
  }
  grid.innerHTML = inventory.map(item => `
    <div class="inv-item">
      <span class="icon">${item.icon}</span>
      <span class="name">${item.name}</span>
    </div>
  `).join('');
}

// ========== SAVE ==========
async function saveCharacter() {
  try {
    await API.updateCharacter({
      level: character.level,
      experience: character.experience,
      health: character.health,
      max_health: character.max_health,
      gold: character.gold,
      strength: character.strength,
      defense: character.defense,
      agility: character.agility,
      intelligence: character.intelligence,
    });
    localStorage.setItem('character', JSON.stringify(character));
  } catch(e) { console.error('Save failed:', e); }
}

// ========== LOGOUT ==========
function logout() {
  API.clearToken();
  localStorage.removeItem('character');
  window.location.href = 'index.html';
}

// ============================================================
//  SPRÁVA OLYMPU
//  Vykresluje se do panelu Admin uvnitř hry. Nic si nepočítá sama —
//  všechna čísla přicházejí ze serveru a každý zásah jde přes API,
//  které si práva ověřuje znovu.
// ============================================================

const obsah = () => document.getElementById('admObsah');

// --- drobní pomocníci ---
const esc = s => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cislo = n => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('cs-CZ');

const datum = d => d ? new Date(d).toLocaleString('cs-CZ',
  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function hlaska(text, chyba = false) {
  const el = document.createElement('div');
  el.className = 'adm-hlaska' + (chyba ? ' chyba' : '');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('pryc'), 2600);
  setTimeout(() => el.remove(), 3100);
}

// Chybu ze serveru ukážeme tak, jak přišla — je srozumitelnější
// než obecné „něco se nepovedlo“.
async function zavolej(fn) {
  try { return await fn(); }
  catch (e) { hlaska((e && e.message) || 'Server neodpověděl', true); return null; }
}

// ============================================================
//  PŘEHLED
// ============================================================
async function sekcePrehled() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.adminDashboard());
  if (!d) return;

  const dlazdice = [
    ['Registrovaných hráčů', cislo(d.hraci.celkem)],
    ['Nových za 24 h',       cislo(d.hraci.dnes)],
    ['Online teď',           cislo(d.postavy.online)],
    ['Aktivních za 24 h',    cislo(d.postavy.aktivnich_24h)],
    ['Postav celkem',        cislo(d.postavy.postav)],
    ['Paladinů',             cislo(d.postavy.paladinu)],
    ['Zabanovaných',         cislo(d.hraci.zabanovanych)],
    ['Nejvyšší úroveň',      cislo(d.ekonomika.nejvyssi_uroven)],
    ['Zlata v oběhu',        cislo(d.ekonomika.zlato)],
    ['Smaragdů v oběhu',     cislo(d.ekonomika.smaragdy)],
    ['Průměrné zlato',       cislo(d.ekonomika.prumer_zlato)],
    ['Výprav celkem',        cislo(d.udalosti && d.udalosti.vypravy)],
    ['Soubojů v bludišti',   cislo(d.udalosti && d.udalosti.bludiste)],
    ['Soubojů v aréně',      cislo(d.udalosti && d.udalosti.arena)],
    ['Vyplaceno zlata',      cislo(d.udalosti && d.udalosti.zlato_vyplaceno)],
    ['Vyplaceno XP',         cislo(d.udalosti && d.udalosti.exp_vyplaceno)],
    ['Událostí za 24 h',     cislo(d.udalosti && d.udalosti.za_24h)],
  ].map(([n, v]) => `
    <div class="adm-dlazdice">
      <div class="adm-dl-nazev">${esc(n)}</div>
      <div class="adm-dl-hod">${esc(v)}</div>
    </div>`).join('');

  const akce = (d.posledniAkce || []).map(a => `
    <tr>
      <td>${datum(a.vytvoreno)}</td>
      <td class="adm-zvyraz">${esc(a.spravce || '—')}</td>
      <td>${esc(a.akce)}</td>
      <td>${esc(a.cil || '')} ${a.cil_id ? '#' + a.cil_id : ''}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="adm-prazdno">Zatím žádné zásahy</td></tr>';

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Přehled</h1>
    <div class="adm-dlazdice-mrizka">${dlazdice}</div>

    ${(d.chybejici || []).length ? `
      <div class="adm-poznamka">
        <b>Zatím neumíme spočítat:</b> ${d.chybejici.map(esc).join(', ')}.
        Ostatní čísla se počítají od chvíle, kdy se události začaly
        zapisovat — starší hraní v nich není.
      </div>` : ''}

    <h2 class="adm-podnadpis">Poslední zásahy správců</h2>
    <div class="adm-tabulka-obal">
      <table class="adm-tabulka">
        <thead><tr><th>Kdy</th><th>Správce</th><th>Akce</th><th>Cíl</th></tr></thead>
        <tbody>${akce}</tbody>
      </table>
    </div>`;
}

// ============================================================
//  HRÁČI
// ============================================================
let hraciStav = { q: '', sort: 'level', dir: 'desc', offset: 0, limit: 50 };

async function sekceHraci() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.adminPlayers(hraciStav));
  if (!d) return;

  const hlavicka = [
    ['username', 'Účet'], ['name', 'Postava'], ['level', 'Úr.'],
    ['experience', 'XP'], ['gold', 'Zlato'], ['emeralds', 'Smaragdy'],
    ['updated', 'Naposledy'],
  ].map(([k, n]) => `
    <th class="adm-radit ${hraciStav.sort === k ? 'aktivni' : ''}" data-sort="${k}">
      ${esc(n)}${hraciStav.sort === k ? (hraciStav.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>`).join('');

  const radky = d.hraci.map(h => `
    <tr class="adm-radek" data-id="${h.user_id}">
      <td>
        <span class="adm-tecka ${h.online ? 'online' : ''}"></span>
        <span class="adm-zvyraz">${esc(h.username)}</span>
        ${h.is_admin ? '<span class="adm-znacka spravce">správce</span>' : ''}
        ${h.zabanovan ? '<span class="adm-znacka ban">ban</span>' : ''}
        ${h.paladin_until && new Date(h.paladin_until) > new Date()
          ? '<span class="adm-znacka paladin">paladin</span>' : ''}
      </td>
      <td>${esc(h.name || '—')}</td>
      <td>${cislo(h.level)}</td>
      <td>${cislo(h.experience)}</td>
      <td>${cislo(h.gold)}</td>
      <td>${cislo(h.emeralds)}</td>
      <td class="adm-slabe">${datum(h.updated_at)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="adm-prazdno">Nikdo nenalezen</td></tr>';

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Hráči <span class="adm-pocet">${cislo(d.celkem)}</span></h1>

    <div class="adm-radek-nastroju">
      <input class="adm-hledani" id="admHledani" placeholder="Hledat účet nebo postavu…"
             value="${esc(hraciStav.q)}">
    </div>

    <div class="adm-tabulka-obal">
      <table class="adm-tabulka klikaci">
        <thead><tr>${hlavicka}</tr></thead>
        <tbody>${radky}</tbody>
      </table>
    </div>

    ${d.celkem > hraciStav.limit ? `
      <div class="adm-strankovani">
        <button class="adm-btn" id="admPredchozi" ${hraciStav.offset ? '' : 'disabled'}>Předchozí</button>
        <span>${hraciStav.offset + 1}–${Math.min(hraciStav.offset + hraciStav.limit, d.celkem)} z ${cislo(d.celkem)}</span>
        <button class="adm-btn" id="admDalsi"
                ${hraciStav.offset + hraciStav.limit >= d.celkem ? 'disabled' : ''}>Další</button>
      </div>` : ''}`;

  // hledání s prodlevou, ať se neptáme při každém písmenu
  let casovac;
  document.getElementById('admHledani').addEventListener('input', e => {
    clearTimeout(casovac);
    const v = e.target.value;
    casovac = setTimeout(() => { hraciStav.q = v; hraciStav.offset = 0; sekceHraci(); }, 350);
  });

  obsah().querySelectorAll('.adm-radit').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (hraciStav.sort === k) hraciStav.dir = hraciStav.dir === 'asc' ? 'desc' : 'asc';
    else { hraciStav.sort = k; hraciStav.dir = 'desc'; }
    sekceHraci();
  }));

  obsah().querySelectorAll('.adm-radek').forEach(tr =>
    tr.addEventListener('click', () => detailHrace(tr.dataset.id)));

  const p = document.getElementById('admPredchozi'), n = document.getElementById('admDalsi');
  if (p) p.addEventListener('click', () => { hraciStav.offset = Math.max(0, hraciStav.offset - hraciStav.limit); sekceHraci(); });
  if (n) n.addEventListener('click', () => { hraciStav.offset += hraciStav.limit; sekceHraci(); });
}

// ---- detail hráče ----
const POLE_POSTAVY = [
  ['level', 'Úroveň'], ['experience', 'Zkušenosti'], ['gold', 'Zlato'],
  ['emeralds', 'Smaragdy'], ['health', 'Životy'], ['max_health', 'Základ životů'],
  ['strength', 'Síla'], ['skill', 'Dovednost'], ['agility', 'Obratnost'],
  ['defense', 'Odolnost'], ['intelligence', 'Inteligence'], ['pocta', 'Pocta'],
];

async function detailHrace(id) {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.adminPlayer(id));
  if (!d) return;
  const h = d.hrac;

  const pole = POLE_POSTAVY.map(([k, n]) => `
    <label class="adm-pole">
      <span>${esc(n)}</span>
      <input type="number" data-pole="${k}" value="${h[k] === null || h[k] === undefined ? '' : h[k]}">
    </label>`).join('');

  const body = (d.body || []).map(b =>
    `<li>${esc(b.druh)}: <b>${cislo(b.body)}</b> <span class="adm-slabe">(doplněno ${datum(b.doplneno_at)})</span></li>`
  ).join('') || '<li class="adm-slabe">žádné záznamy</li>';

  const odpocty = (d.odpocty || []).map(o =>
    `<li>${esc(o.druh)}: do ${datum(o.plati_do)}</li>`
  ).join('') || '<li class="adm-slabe">žádné běžící</li>';

  const zabanovan = h.banned_until && new Date(h.banned_until) > new Date();

  obsah().innerHTML = `
    <button class="adm-btn zpet" id="admZpet">← Zpět na seznam</button>

    <h1 class="adm-nadpis">
      ${esc(h.username)}
      ${h.is_admin ? '<span class="adm-znacka spravce">správce</span>' : ''}
      ${zabanovan ? '<span class="adm-znacka ban">zabanován</span>' : ''}
    </h1>
    <div class="adm-slabe adm-podtitulek">
      Postava ${esc(h.name || '—')} · registrace ${datum(h.created_at)} · naposledy ${datum(h.updated_at)}
    </div>

    <div class="adm-panel">
      <h2 class="adm-podnadpis">Postava</h2>
      <div class="adm-mrizka-poli">${pole}</div>
      <div class="adm-akce"><button class="adm-btn hlavni" id="admUloz">Uložit změny</button></div>
    </div>

    <div class="adm-dva">
      <div class="adm-panel">
        <h2 class="adm-podnadpis">Body</h2>
        <ul class="adm-seznam">${body}</ul>
        <h2 class="adm-podnadpis">Odpočty</h2>
        <ul class="adm-seznam">${odpocty}</ul>
        <div class="adm-slabe adm-poznamka-mala">
          Paladin ${h.paladin_until && new Date(h.paladin_until) > new Date()
            ? 'do ' + datum(h.paladin_until) : 'neaktivní'}
        </div>
      </div>

      <div class="adm-panel nebezpeci">
        <h2 class="adm-podnadpis">Zásahy do účtu</h2>

        ${zabanovan ? `
          <p class="adm-slabe">
            Zabanován do ${new Date(h.banned_until).getFullYear() > 9000 ? 'odvolání' : datum(h.banned_until)}.
            ${h.ban_reason ? '<br>Důvod: ' + esc(h.ban_reason) : ''}
          </p>
          <button class="adm-btn" id="admUnban">Zrušit ban</button>
        ` : `
          <label class="adm-pole"><span>Délka ve dnech (0 = natrvalo)</span>
            <input type="number" id="admBanDny" value="7" min="0"></label>
          <label class="adm-pole"><span>Důvod</span>
            <input type="text" id="admBanDuvod" placeholder="Co se stalo"></label>
          <button class="adm-btn varovny" id="admBan">Zabanovat</button>
        `}

        <hr class="adm-cara">
        <p class="adm-slabe">
          Smazání účtu je nevratné. Potvrď ho opsáním jména <b>${esc(h.username)}</b>.
        </p>
        <label class="adm-pole"><span>Potvrzení</span>
          <input type="text" id="admSmazPotvrzeni" placeholder="${esc(h.username)}"></label>
        <button class="adm-btn nebezpecny" id="admSmaz">Smazat účet</button>
      </div>
    </div>`;

  document.getElementById('admZpet').addEventListener('click', sekceHraci);

  document.getElementById('admUloz').addEventListener('click', async () => {
    const data = {};
    obsah().querySelectorAll('[data-pole]').forEach(i => {
      if (i.value !== '') data[i.dataset.pole] = Number(i.value);
    });
    const r = await zavolej(() => API.adminSavePlayer(id, data));
    if (r) {
      const kolik = Object.keys(r.zmeny || {}).length;
      hlaska(kolik ? `Uloženo (${kolik} změn)` : 'Nic se nezměnilo');
      detailHrace(id);
    }
  });

  const ban = document.getElementById('admBan');
  if (ban) ban.addEventListener('click', async () => {
    const dny = Number(document.getElementById('admBanDny').value) || 0;
    const duvod = document.getElementById('admBanDuvod').value;
    if (!confirm(dny ? `Zabanovat na ${dny} dní?` : 'Zabanovat natrvalo?')) return;
    const r = await zavolej(() => API.adminBan(id, dny, duvod));
    if (r) { hlaska('Hráč zabanován'); detailHrace(id); }
  });

  const unban = document.getElementById('admUnban');
  if (unban) unban.addEventListener('click', async () => {
    const r = await zavolej(() => API.adminUnban(id));
    if (r) { hlaska('Ban zrušen'); detailHrace(id); }
  });

  document.getElementById('admSmaz').addEventListener('click', async () => {
    const potvrzeni = document.getElementById('admSmazPotvrzeni').value;
    if (potvrzeni !== h.username) { hlaska('Jméno nesouhlasí', true); return; }
    if (!confirm(`Opravdu nevratně smazat účet ${h.username}?`)) return;
    const r = await zavolej(() => API.adminDeletePlayer(id, potvrzeni));
    if (r) { hlaska('Účet smazán'); sekceHraci(); }
  });
}

// ============================================================
//  PALADIN
// ============================================================
async function sekcePaladin() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.paladinConfig());
  if (!d) return;

  const pole = Object.entries(d.config).map(([k, v]) => `
    <label class="adm-pole">
      <span>${esc(d.popisky[k] || k)}</span>
      <input type="number" step="0.01" min="0" data-klic="${esc(k)}" value="${v}">
      <small class="adm-slabe">${esc(k)} · výchozí ${d.vychozi[k]}</small>
    </label>`).join('');

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Nastavení Paladina</h1>
    <div class="adm-poznamka">
      Násobitel 0,5 znamená poloviční čas. Hra i server berou tyhle hodnoty
      z databáze — po uložení platí hned, bez zásahu do kódu.
    </div>

    <div class="adm-panel">
      <div class="adm-mrizka-poli siroka">${pole}</div>
      <div class="adm-akce"><button class="adm-btn hlavni" id="admUlozPal">Uložit nastavení</button></div>
    </div>`;

  document.getElementById('admUlozPal').addEventListener('click', async () => {
    const config = {};
    obsah().querySelectorAll('[data-klic]').forEach(i => { config[i.dataset.klic] = Number(i.value); });
    const r = await zavolej(() => API.paladinSaveConfig(config));
    if (r) { hlaska(`Uloženo (${Object.keys(r.ulozene || {}).length} hodnot)`); sekcePaladin(); }
  });
}

// ============================================================
//  ARÉNA
// ============================================================
async function sekceArena() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.arenaConfig());
  if (!d) return;

  const pole = Object.entries(d.config).map(([k, v]) => `
    <label class="adm-pole">
      <span>${esc(d.popisky[k] || k)}</span>
      <input type="number" step="0.01" min="0" data-klic="${esc(k)}" value="${v}">
      <small class="adm-slabe">${esc(k)} · výchozí ${d.vychozi[k]}</small>
    </label>`).join('');

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Nastavení Arény</h1>
    <div class="adm-poznamka">
      Sazba je Pocta ve hře při vyrovnaném souboji. Dělitel řídí, jak
      moc rozdíl Pocty mění zisk. Server bere tyhle hodnoty z databáze —
      po uložení platí hned.
    </div>

    <div class="adm-panel">
      <div class="adm-mrizka-poli siroka">${pole}</div>
      <div class="adm-akce"><button class="adm-btn hlavni" id="admUlozArena">Uložit nastavení</button></div>
    </div>`;

  document.getElementById('admUlozArena').addEventListener('click', async () => {
    const config = {};
    obsah().querySelectorAll('[data-klic]').forEach(i => { config[i.dataset.klic] = Number(i.value); });
    const r = await zavolej(() => API.arenaSaveConfig(config));
    if (r) { hlaska(`Uloženo (${Object.keys(r.ulozene || {}).length} hodnot)`); sekceArena(); }
  });
}

// ============================================================
//  HISTORIE ZÁSAHŮ
// ============================================================
async function sekceLogy() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.adminLogs());
  if (!d) return;

  const kratce = h => {
    if (h === null || h === undefined) return '—';
    const s = typeof h === 'string' ? h : JSON.stringify(h);
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  };

  const radky = (d.logy || []).map(l => `
    <tr>
      <td class="adm-slabe">${datum(l.vytvoreno)}</td>
      <td class="adm-zvyraz">${esc(l.spravce || '—')}</td>
      <td>${esc(l.akce)}</td>
      <td>${esc(l.cil || '')} ${l.cil_id ? '#' + l.cil_id : ''}</td>
      <td class="adm-slabe">${esc(kratce(l.hodnota_pred))}</td>
      <td>${esc(kratce(l.hodnota_po))}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="adm-prazdno">Zatím žádné zásahy</td></tr>';

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Historie zásahů</h1>
    <div class="adm-poznamka">Záznamy nejdou upravovat ani mazat — od toho jsou.</div>
    <div class="adm-tabulka-obal">
      <table class="adm-tabulka">
        <thead><tr><th>Kdy</th><th>Správce</th><th>Akce</th><th>Cíl</th><th>Před</th><th>Po</th></tr></thead>
        <tbody>${radky}</tbody>
      </table>
    </div>`;
}

// ============================================================
//  AUKČNÍ SÍŇ
// ============================================================
const AUK_POPISKY = {
  trvani_s: 'Trvání aukce (s)', antisnipe_okno_s: 'Anti-snipe okno (s)', antisnipe_prodlouzeni_s: 'Anti-snipe prodloužení (s)',
  viditelnost_nad: 'Viditelnost nad úroveň (+)', strop_urovne: 'Strop úrovně předmětu',
  zlato_za_hodnotu: 'Startovní zlato = hodnota ×', zlato_start_min: 'Min. startovní zlato',
  prihoz_procento: 'Min. přihoz (podíl)', prihoz_min_abs: 'Min. přihoz (absolutně)',
  smaragd_delitel: 'Buy Now smaragdy = hodnota ÷', smaragd_min: 'Min. smaragdy', smaragd_max: 'Max. smaragdy',
  cil_aktivnich: 'Cíl aktivních aukcí', generace_interval_s: 'Interval generace (s)', generace_max_davka: 'Max. dávka generace',
  buynow_dostupnost: 'Podíl aukcí s Buy Now', uroven_min: 'Min. úroveň předmětu', uroven_max: 'Max. úroveň předmětu',
};
async function sekceAukce() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const d = await zavolej(() => API.aukceConfig());
  if (!d) return;
  const pole = Object.entries(d.config).map(([k, v]) => `
    <label class="adm-pole">
      <span>${esc(AUK_POPISKY[k] || k)}</span>
      <input type="number" step="0.01" min="0" data-klic="${esc(k)}" value="${v}">
      <small class="adm-slabe">${esc(k)} · výchozí ${d.vychozi[k]}</small>
    </label>`).join('');
  obsah().innerHTML = `
    <h1 class="adm-nadpis">Nastavení Aukční síně</h1>
    <div class="adm-poznamka">
      Systémová dražba — hráči si nic nevystavují. Předměty generuje server
      (bez vzácností, bez předpon). Přihoz = zlato, Koupit hned = smaragdy.
      Server bere hodnoty z databáze, po uložení platí hned.
    </div>
    <div class="adm-panel">
      <div class="adm-mrizka-poli siroka">${pole}</div>
      <div class="adm-akce"><button class="adm-btn hlavni" id="admUlozAukce">Uložit nastavení</button></div>
    </div>`;
  document.getElementById('admUlozAukce').addEventListener('click', async () => {
    const config = {};
    obsah().querySelectorAll('[data-klic]').forEach(i => { config[i.dataset.klic] = Number(i.value); });
    const r = await zavolej(() => API.aukceSaveConfig(config));
    if (r) { hlaska(`Uloženo (${Object.keys(r.ulozene || {}).length} hodnot)`); sekceAukce(); }
  });
}

// ============================================================
//  BALANČNÍ SIMULÁTOR
//  Pouští běhy na serveru (v paměti, nikdy proti živým datům) a
//  ukazuje percentily po archetypech, upozornění a poradní analýzu.
// ============================================================
let simPoll = null;

function simStavStitek(s) {
  const m = { ceka: 'čeká', bezi: 'běží', hotovo: 'hotovo', zruseno: 'zrušeno', chyba: 'chyba' };
  return `<span class="sim-stav sim-${s}">${m[s] || s}</span>`;
}

async function sekceSimulator() {
  obsah().innerHTML = '<div class="adm-nacitani">Načítám…</div>';
  const meta = await zavolej(() => API.simMeta());
  if (!meta) return;

  const presety = meta.presety.map(p =>
    `<button class="adm-btn sim-preset" data-preset="${esc(p.id)}">${esc(p.nazev)}<small>${esc(p.popis)}</small></button>`
  ).join('');

  const neexist = meta.archetypy.filter(a => !a.existuje);
  const pozn = neexist.length ? `<div class="adm-poznamka sim-varovani">
      Archetypy <b>${neexist.map(a => esc(a.nazev)).join(', ')}</b> míří na systémy, které hra
      zatím nemá (${esc([...new Set(neexist.map(a => a.cilovySystem))].join(', '))}). Simulují se
      nejbližším možným chováním a v reportu jsou tak označené — nic se nedomýšlí.
    </div>` : '';

  const archBoxy = meta.archetypy.map(a =>
    `<label class="sim-arch ${a.existuje ? '' : 'neexist'}">
       <input type="checkbox" class="sim-arch-check" value="${esc(a.id)}" checked>
       ${esc(a.nazev)}${a.existuje ? '' : ' <small>(systém není)</small>'}
     </label>`).join('');

  const strop = meta.stropSoubeh || 3;

  obsah().innerHTML = `
    <h1 class="adm-nadpis">Balanční simulátor</h1>
    <div class="adm-poznamka">
      Simuluje spousty virtuálních hráčů stejnými vzorci jako ostrá hra (XP,
      souboje, odměny, Pocta). Běží v paměti serveru — <b>nikdy nesahá na živá
      data hráčů</b>. Balanční verze: <code>${esc(meta.balanc.podpis)}</code>.
    </div>
    ${pozn}
    <div class="adm-panel">
      <div class="sim-presety">${presety}</div>

      <details class="sim-detaily">
        <summary>Výběr archetypů (výchozí: všechny)</summary>
        <div class="sim-archy">${archBoxy}</div>
        <div class="sim-arch-akce">
          <button class="adm-btn maly" id="simArchAll">Vše</button>
          <button class="adm-btn maly" id="simArchNone">Nic</button>
        </div>
      </details>

      <div class="sim-vlastni">
        <label class="adm-pole"><span>Dní</span><input type="number" id="simDni" value="180" min="1" max="3650"></label>
        <label class="adm-pole"><span>Historií (Monte Carlo)</span><input type="number" id="simHist" value="60" min="1" max="500"></label>
        <label class="adm-pole"><span>Hráčů/archetyp</span><input type="number" id="simHrac" value="5" min="1" max="50"></label>
        <label class="adm-pole"><span>Semínko</span><input type="number" id="simSem" value="12345"></label>
        <label class="adm-pole"><span>Souběžné úlohy (1–${strop})</span><input type="number" id="simWork" value="1" min="1" max="${strop}"></label>
        <button class="adm-btn hlavni" id="simSpustVlastni">Spustit vlastní</button>
      </div>
    </div>

    <h2 class="adm-podnadpis">Běhy</h2>
    <div id="simBehy"><div class="adm-nacitani">Načítám…</div></div>
    <div id="simDetail"></div>

    <h2 class="adm-podnadpis">Porovnat dva běhy (regrese)</h2>
    <div class="adm-poznamka">Vyber dva dokončené běhy a uvidíš rozdíly v mediánech i změnu pravidel mezi jejich balančními verzemi.</div>
    <div class="sim-porovnani-ovladani">
      <select id="simCmpA" class="sim-select"></select>
      <span>vs</span>
      <select id="simCmpB" class="sim-select"></select>
      <button class="adm-btn" id="simCmpBtn">Porovnat</button>
    </div>
    <div id="simPorovnani"></div>`;

  // archetypy: výběr
  const vybraneArchetypy = () =>
    [...obsah().querySelectorAll('.sim-arch-check:checked')].map(x => x.value);
  document.getElementById('simArchAll').addEventListener('click', () =>
    obsah().querySelectorAll('.sim-arch-check').forEach(x => x.checked = true));
  document.getElementById('simArchNone').addEventListener('click', () =>
    obsah().querySelectorAll('.sim-arch-check').forEach(x => x.checked = false));

  // porovnání
  document.getElementById('simCmpBtn').addEventListener('click', simPorovnej);

  // Společné spuštění: hned dá vědět, že se něco děje, zamkne tlačítka a
  // vypíše chybu, kdyby server neodpověděl (třeba když Render po nečinnosti
  // spí a první požadavek trvá i 40 s — jinak to vypadá, že „klik nic neudělá").
  async function spust(tlacitko, nast) {
    const puvodni = tlacitko.textContent;
    tlacitko.disabled = true;
    obsah().querySelectorAll('.sim-preset, #simSpustVlastni').forEach(x => x.disabled = true);
    hlaska('Spouštím běh… (první běh po nečinnosti může chvíli trvat)');
    try {
      const r = await API.simSpust(nast);
      if (r && r.id) { hlaska('Běh zařazen: ' + r.id); await nactiSimBehy(); }
      else hlaska('Server nevrátil úlohu.', true);
    } catch (e) {
      hlaska((e && e.message) || 'Server neodpověděl — zkus to prosím znovu.', true);
    } finally {
      obsah().querySelectorAll('.sim-preset, #simSpustVlastni').forEach(x => x.disabled = false);
      tlacitko.textContent = puvodni;
    }
  }

  const spolecne = () => {
    const arch = vybraneArchetypy();
    const o = { workers: +document.getElementById('simWork').value };
    if (arch.length && arch.length < meta.archetypy.length) o.archetypy = arch;
    return o;
  };

  obsah().querySelectorAll('.sim-preset').forEach(b =>
    b.addEventListener('click', () => spust(b, { preset: b.dataset.preset, ...spolecne() })));
  document.getElementById('simSpustVlastni').addEventListener('click', function () {
    spust(this, {
      dni: +document.getElementById('simDni').value,
      historie: +document.getElementById('simHist').value,
      hracuNaArchetyp: +document.getElementById('simHrac').value,
      zakladniSeminko: +document.getElementById('simSem').value,
      ...spolecne(),
    });
  });

  nactiSimBehy();
}

async function nactiSimBehy() {
  const behy = await zavolej(() => API.simBehy());
  const box = document.getElementById('simBehy');
  if (!box) { if (simPoll) { clearInterval(simPoll); simPoll = null; } return; }
  if (!behy) return;

  const pct = b => b.prubeh && b.prubeh.celkem ? Math.floor((b.prubeh.hotovo / b.prubeh.celkem) * 100) : 0;
  const behTrvani = b => b.trvaniMs ? (b.trvaniMs / 1000).toFixed(1) + ' s' : (b.stav === 'bezi' ? 'běží…' : '—');

  box.innerHTML = behy.length ? `
    <div class="adm-tabulka-obal"><table class="adm-tabulka">
      <thead><tr><th>ID</th><th>Stav</th><th>Průběh</th><th>Nastavení</th><th>Verze</th><th>Reálný čas</th><th>Vytvořeno</th><th>Alertů</th><th></th></tr></thead>
      <tbody>${behy.map(b => `
        <tr>
          <td class="adm-zvyraz">${esc(b.id)}</td>
          <td>${simStavStitek(b.stav)}</td>
          <td>${b.stav === 'bezi'
              ? `<div class="sim-progress"><div class="sim-progress-fill" style="width:${pct(b)}%"></div><span>${b.prubeh.hotovo}/${b.prubeh.celkem}</span></div>`
              : (b.prubeh ? `${b.prubeh.hotovo}/${b.prubeh.celkem}` : '—')}</td>
          <td class="adm-slabe">${b.nastaveni.dni}d · ${b.nastaveni.historie}× · ${b.nastaveni.hracuNaArchetyp}/arch</td>
          <td class="adm-slabe">${b.meta ? esc(b.meta.balancVerze) : '—'}</td>
          <td class="adm-slabe">${behTrvani(b)}</td>
          <td class="adm-slabe">${datum(b.pridano)}</td>
          <td>${b.pocetUpozorneni != null ? b.pocetUpozorneni : '—'}</td>
          <td>
            ${b.stav === 'hotovo' ? `<button class="adm-btn maly" data-vysledek="${esc(b.id)}">Výsledek</button>` : ''}
            ${(b.stav === 'ceka' || b.stav === 'bezi') ? `<button class="adm-btn maly zrus" data-zrus="${esc(b.id)}">Zrušit</button>` : ''}
            ${b.stav === 'chyba' ? `<span class="adm-slabe" title="${esc(b.chyba || '')}">chyba</span>` : ''}
          </td>
        </tr>`).join('')}</tbody>
    </table></div>` : '<div class="adm-prazdno">Zatím žádné běhy.</div>';

  box.querySelectorAll('[data-vysledek]').forEach(b => b.addEventListener('click', () => zobrazSimVysledek(b.dataset.vysledek)));
  box.querySelectorAll('[data-zrus]').forEach(b => b.addEventListener('click', async () => {
    await zavolej(() => API.simZrus(b.dataset.zrus)); nactiSimBehy();
  }));

  // naplň porovnávací selektory dokončenými běhy
  const hotove = behy.filter(b => b.stav === 'hotovo');
  ['simCmpA', 'simCmpB'].forEach(idSel => {
    const sel = document.getElementById(idSel);
    if (!sel) return;
    const drzeno = sel.value;
    sel.innerHTML = hotove.map(b => `<option value="${esc(b.id)}">${esc(b.id)} · ${b.meta ? esc(b.meta.balancVerze) : ''}</option>`).join('');
    if ([...sel.options].some(o => o.value === drzeno)) sel.value = drzeno;
  });

  // poll, dokud něco běží
  const zive = behy.some(b => b.stav === 'ceka' || b.stav === 'bezi');
  if (zive && !simPoll) simPoll = setInterval(nactiSimBehy, 1200);
  if (!zive && simPoll) { clearInterval(simPoll); simPoll = null; }
}

// ---- malé SVG grafy (bez knihovny, aby nic neběželo zvenčí) ----
const CHART_BARVY = { zlata: '#d8b13a', modra: '#7aa8d0', zelena: '#7ac08a', cervena: '#d05656', fialova: '#b48ad0' };

function svgCara(serie, opt = {}) {
  const W = 560, H = 220, mL = 52, mR = 14, mT = 14, mB = 34;
  const vsechnyX = serie.flatMap(s => s.body.map(b => b.x));
  const vsechnyY = serie.flatMap(s => s.body.map(b => b.y));
  if (!vsechnyX.length) return '<div class="adm-slabe">Bez dat.</div>';
  const minX = Math.min(...vsechnyX), maxX = Math.max(...vsechnyX);
  const minY = 0, maxY = Math.max(1, ...vsechnyY) * 1.08;
  const px = x => mL + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * (W - mL - mR);
  const py = y => H - mB - (y - minY) / (maxY - minY) * (H - mT - mB);
  const kratke = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n);

  const mrizka = [0, .25, .5, .75, 1].map(f => {
    const y = minY + (maxY - minY) * f;
    return `<line x1="${mL}" y1="${py(y)}" x2="${W - mR}" y2="${py(y)}" class="chart-grid"/>
            <text x="${mL - 6}" y="${py(y) + 3}" class="chart-lbl" text-anchor="end">${kratke(y)}</text>`;
  }).join('');
  const osaX = [minX, (minX + maxX) / 2, maxX].map(x =>
    `<text x="${px(x)}" y="${H - 12}" class="chart-lbl" text-anchor="middle">${Math.round(x)}</text>`).join('');
  const cary = serie.map(s => {
    const d = s.body.map((b, i) => `${i ? 'L' : 'M'}${px(b.x).toFixed(1)},${py(b.y).toFixed(1)}`).join(' ');
    const body = s.body.map(b => `<circle cx="${px(b.x).toFixed(1)}" cy="${py(b.y).toFixed(1)}" r="2.4" fill="${s.barva}"/>`).join('');
    return `<path d="${d}" fill="none" stroke="${s.barva}" stroke-width="2"/>${body}`;
  }).join('');
  const legenda = serie.length > 1 ? `<div class="chart-legenda">${serie.map(s =>
    `<span><i style="background:${s.barva}"></i>${esc(s.nazev)}</span>`).join('')}</div>` : '';
  return `<div class="chart-obal"><svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet">
    ${mrizka}${osaX}${cary}
  </svg>${legenda}</div>`;
}

function svgSloupce(data, serie, opt = {}) {
  const W = 560, H = 240, mL = 52, mR = 14, mT = 14, mB = 62;
  const vsechnyY = data.flatMap(d => serie.map(s => d[s.klic] || 0));
  const maxY = Math.max(1, ...vsechnyY) * 1.08;
  const py = y => H - mB - y / maxY * (H - mT - mB);
  const kratke = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n);
  const pasmo = (W - mL - mR) / data.length;
  const sirkaS = Math.min(18, pasmo / (serie.length + 1));
  const mrizka = [0, .5, 1].map(f => {
    const y = maxY * f;
    return `<line x1="${mL}" y1="${py(y)}" x2="${W - mR}" y2="${py(y)}" class="chart-grid"/>
            <text x="${mL - 6}" y="${py(y) + 3}" class="chart-lbl" text-anchor="end">${kratke(y)}</text>`;
  }).join('');
  const sloupce = data.map((d, i) => {
    const x0 = mL + i * pasmo + (pasmo - sirkaS * serie.length) / 2;
    const b = serie.map((s, j) => {
      const h = (H - mB) - py(d[s.klic] || 0);
      return `<rect x="${(x0 + j * sirkaS).toFixed(1)}" y="${py(d[s.klic] || 0).toFixed(1)}" width="${(sirkaS - 2).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${s.barva}"/>`;
    }).join('');
    const lbl = `<text x="${(mL + i * pasmo + pasmo / 2).toFixed(1)}" y="${H - mB + 14}" class="chart-lbl mini" text-anchor="end" transform="rotate(-40 ${(mL + i * pasmo + pasmo / 2).toFixed(1)} ${H - mB + 14})">${esc(String(d.label).slice(0, 12))}</text>`;
    return b + lbl;
  }).join('');
  const legenda = `<div class="chart-legenda">${serie.map(s => `<span><i style="background:${s.barva}"></i>${esc(s.nazev)}</span>`).join('')}</div>`;
  return `<div class="chart-obal"><svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet">${mrizka}${sloupce}</svg>${legenda}</div>`;
}

// karta metriky; když systém neexistuje, jasně to řekne a nic si nevymýšlí
function metrikaKarta(nazev, hodnota, existuje = true, pozn = '') {
  return `<div class="sim-karta ${existuje ? '' : 'na'}">
    <div class="sim-karta-nazev">${esc(nazev)}</div>
    <div class="sim-karta-hodnota">${existuje ? hodnota : 'N/A'}</div>
    ${pozn ? `<div class="sim-karta-pozn">${esc(pozn)}</div>` : ''}
  </div>`;
}

async function zobrazSimVysledek(id) {
  const box = document.getElementById('simDetail');
  box.innerHTML = '<div class="adm-nacitani">Načítám výsledek…</div>';
  const d = await zavolej(() => API.simDetail(id));
  if (!d || !d.vysledek) { box.innerHTML = '<div class="adm-prazdno">Výsledek není hotový.</div>'; return; }
  const v = d.vysledek;
  const g = v.vysledek.global, s = v.vysledek.stropy, gr = v.grafy || { poLevelu: [], zlatoTok: [], urovenVsDny: [] };
  const r0 = n => cislo(Math.round(n));

  // tabulka archetypů (P50)
  const rada = (id2, a) => `<tr>
    <td class="adm-zvyraz">${esc(id2)}</td>
    <td>${a.uroven.p50.toFixed(0)}</td><td>${r0(a.zlato.p50)}</td><td>${r0(a.pocta.p50)}</td>
    <td>${a.statySoucet.p50.toFixed(0)}</td><td>${(a.winrate.p50 * 100).toFixed(0)} %</td><td>${(a.pvpWin.p50 * 100).toFixed(0)} %</td>
  </tr>`;
  const telo = Object.entries(v.vysledek.archetypy).map(([k, a]) => rada(k, a)).join('');

  // distribuce (P10/P50/P90/P99) globálně
  const distRada = (nazev, dd, proc = false) => {
    const f = x => proc ? (x * 100).toFixed(0) + ' %' : r0(x);
    return `<tr><td class="adm-zvyraz">${nazev}</td><td>${f(dd.p10)}</td><td>${f(dd.p50)}</td><td>${f(dd.p90)}</td><td>${f(dd.p99)}</td></tr>`;
  };
  const dist = [
    distRada('Úroveň', g.uroven), distRada('Zlato (zůstatek)', g.zlato),
    distRada('Zlato získáno', g.zlatoZiskano), distRada('XP získáno', g.xpZiskano),
    distRada('Součet statů', g.statySoucet), distRada('Pocta', g.pocta),
    distRada('Winrate', g.winrate, true), distRada('PvP winrate', g.pvpWin, true),
  ].join('');

  // metriky – existující + poctivé N/A pro systémy, které hra nemá
  const karty = [
    metrikaKarta('Úroveň (P50)', g.uroven.p50.toFixed(0)),
    metrikaKarta('XP získáno (P50)', r0(g.xpZiskano.p50)),
    metrikaKarta('Zlato zůstatek (P50)', r0(g.zlato.p50)),
    metrikaKarta('Zlato získáno (P50)', r0(g.zlatoZiskano.p50)),
    metrikaKarta('Součet statů (P50)', g.statySoucet.p50.toFixed(0)),
    metrikaKarta('Krit strop', (s.critMax * 100).toFixed(1) + ' %', true, 'engine CRIT_MAX'),
    metrikaKarta('Blok strop', (s.blokMax * 100).toFixed(1) + ' %'),
    metrikaKarta('Winrate (P50)', (g.winrate.p50 * 100).toFixed(0) + ' %'),
    metrikaKarta('Aréna Pocta (P50)', r0(g.pocta.p50)),
    metrikaKarta('Podzemí', 'bludiště jako odměna', true, 'samostatný systém obtížnosti není'),
    metrikaKarta('Dodge', '', false, 'hra má Blok, ne Dodge'),
    metrikaKarta('Strop tréninku', '', false, 'StatTrainingCap neexistuje'),
    metrikaKarta('Vybavení (síla)', '', false, 'engine výbavu nečte'),
    metrikaKarta('Pomocníci', '', false, 'systém neexistuje'),
    metrikaKarta('Práce', '', false, 'panel zamčen, 0 XP'),
    metrikaKarta('Aukční síň', '', false, 'systém neexistuje'),
    metrikaKarta('Tržiště', '', false, 'systém neexistuje'),
    metrikaKarta('Smaragdy (ekonomika)', '', false, 'z hraní neplynou'),
    metrikaKarta('Zkouška božstva', '', false, 'systém neexistuje'),
    metrikaKarta('Item-budget', '', false, 'systém předmětů 1–5 statů neexistuje'),
  ].join('');

  // grafy z reálných dat
  const graf1 = svgCara([{ nazev: 'Úroveň', barva: CHART_BARVY.zlata, body: gr.urovenVsDny.map(x => ({ x: x.dny, y: x.level })) }]);
  const graf2 = svgCara([
    { nazev: 'Získáno', barva: CHART_BARVY.zelena, body: gr.poLevelu.map(x => ({ x: x.level, y: x.zlatoZiskano })) },
    { nazev: 'Utraceno', barva: CHART_BARVY.cervena, body: gr.poLevelu.map(x => ({ x: x.level, y: x.zlatoUtraceno })) },
  ]);
  const graf3 = svgCara([{ nazev: 'Zůstatek', barva: CHART_BARVY.zlata, body: gr.poLevelu.map(x => ({ x: x.level, y: x.zlato })) }]);
  const graf4 = svgCara([{ nazev: 'Krit %', barva: CHART_BARVY.fialova, body: gr.poLevelu.map(x => ({ x: x.level, y: x.critPct })) }]);
  const graf5 = svgCara([{ nazev: 'Staty', barva: CHART_BARVY.modra, body: gr.poLevelu.map(x => ({ x: x.level, y: x.staty })) }]);
  const graf6 = svgSloupce(
    gr.zlatoTok.map(z => ({ label: z.archetyp, ziskano: z.ziskano, utraceno: z.utraceno })),
    [{ nazev: 'Získáno', klic: 'ziskano', barva: CHART_BARVY.zelena }, { nazev: 'Utraceno', klic: 'utraceno', barva: CHART_BARVY.cervena }]);

  const grafBlok = (nadpis, svg) => `<div class="sim-graf"><h4>${esc(nadpis)}</h4>${svg}</div>`;

  const upoz = v.upozorneni.length
    ? v.upozorneni.map(u => `<li class="sim-upoz sim-z-${esc(u.zavaznost)}"><b>${esc(u.zavaznost)}</b> — ${esc(u.zprava)}</li>`).join('')
    : '<li class="adm-prazdno">žádná</li>';

  const seznamY = arr => (arr && arr.length) ? arr.map(x => `<li>${esc(x)}</li>`).join('') : '<li class="adm-slabe">—</li>';

  box.innerHTML = `
    <div class="adm-panel sim-vysledek">
      <div class="sim-vys-hlava">
        <h2 class="adm-podnadpis">Výsledek ${esc(id)}</h2>
        <div class="sim-export">
          <button class="adm-btn maly" id="simAnalyzaBtn">Spustit AI analýzu</button>
          <button class="adm-btn maly" id="simJson">Stáhnout JSON</button>
          <button class="adm-btn maly" id="simCsv">Stáhnout CSV</button>
        </div>
      </div>
      <div class="adm-slabe">${esc(v.meta.hernidoba)} · ${cislo(v.meta.pocetPostavCelkem)} postav · ${v.meta.historie}× · verze ${esc(v.meta.balancVerze)} · semínko ${v.meta.zakladniSeminko} · reálný čas ${(v.meta.trvaniMs / 1000).toFixed(1)} s</div>

      <div class="sim-stropy">Krit max <b>${(s.critMax * 100).toFixed(1)} %</b> · Blok max <b>${(s.blokMax * 100).toFixed(1)} %</b> · Dvojhmat max <b>${(s.dvojMax * 100).toFixed(1)} %</b></div>

      <h3 class="adm-podnadpis">Metriky</h3>
      <div class="sim-karty">${karty}</div>

      <h3 class="adm-podnadpis">Rozdělení (percentily, globálně)</h3>
      <div class="adm-tabulka-obal"><table class="adm-tabulka">
        <thead><tr><th>Metrika</th><th>P10</th><th>P50</th><th>P90</th><th>P99</th></tr></thead>
        <tbody>${dist}</tbody>
      </table></div>

      <h3 class="adm-podnadpis">Po archetypech (P50)</h3>
      <div class="adm-tabulka-obal"><table class="adm-tabulka">
        <thead><tr><th>Archetyp</th><th>Úr.</th><th>Zlato</th><th>Pocta</th><th>Staty</th><th>Winrate</th><th>PvP</th></tr></thead>
        <tbody>${telo}</tbody>
      </table></div>

      <h3 class="adm-podnadpis">Grafy</h3>
      <div class="sim-grafy">
        ${grafBlok('Úroveň vs aktivní dny', graf1)}
        ${grafBlok('Zlato získané vs utracené (podle úrovně)', graf2)}
        ${grafBlok('Zlato — zůstatek podle úrovně', graf3)}
        ${grafBlok('Krit % podle úrovně', graf4)}
        ${grafBlok('Součet statů podle úrovně', graf5)}
        ${grafBlok('Zlato získané vs utracené (podle archetypu)', graf6)}
      </div>
      <div class="adm-poznamka">Grafy pro Dodge, Item-budget, Pomocníky a Smaragdy tu nejsou — ty systémy hra zatím nemá, tak si je simulátor nevymýšlí.</div>

      <h3 class="adm-podnadpis">Upozornění (${v.upozorneni.length})</h3>
      <ul class="sim-upozy">${upoz}</ul>

      <div id="simAnalyzaBox" class="sim-analyza-box"></div>
    </div>`;

  document.getElementById('simJson').addEventListener('click', () => stahni(API.simExportJson(id), id + '.json'));
  document.getElementById('simCsv').addEventListener('click', () => stahni(API.simExportCsv(id), id + '.csv'));
  document.getElementById('simAnalyzaBtn').addEventListener('click', async () => {
    const abox = document.getElementById('simAnalyzaBox');
    abox.innerHTML = '<div class="adm-nacitani">Analyzuji…</div>';
    const a = await zavolej(() => API.simAnalyza(id));
    if (!a) { abox.innerHTML = ''; return; }
    abox.innerHTML = `
      <h3 class="adm-podnadpis">AI analýza <small class="adm-slabe">(poradní — NEMĚNÍ konfiguraci)</small></h3>
      <div class="adm-poznamka">${esc(a.upozorneni || '')}</div>
      <div class="sim-analyza">
        <div><b>Pozorování</b><ul>${seznamY(a.pozorovani)}</ul></div>
        <div><b>Úvaha</b><ul>${seznamY(a.uvahy)}</ul></div>
        <div><b>Doporučení</b><ul>${seznamY(a.doporuceni)}</ul></div>
      </div>`;
  });

  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// porovnání dvou dokončených běhů (regrese)
async function simPorovnej() {
  const a = document.getElementById('simCmpA').value, b = document.getElementById('simCmpB').value;
  const box = document.getElementById('simPorovnani');
  if (!a || !b || a === b) { box.innerHTML = '<div class="adm-prazdno">Vyber dva různé dokončené běhy.</div>'; return; }
  box.innerHTML = '<div class="adm-nacitani">Porovnávám…</div>';
  const r = await zavolej(() => API.simPorovnat(a, b));
  if (!r) { box.innerHTML = ''; return; }

  const rad = (nazev, o) => {
    const zmena = o.zmena, proc = o.a ? (zmena / o.a * 100) : 0;
    const tr = zmena > 0 ? 'plus' : zmena < 0 ? 'minus' : '';
    return `<tr><td class="adm-zvyraz">${nazev}</td><td>${cislo(Math.round(o.a))}</td><td>${cislo(Math.round(o.b))}</td>
      <td class="sim-${tr}">${zmena >= 0 ? '+' : ''}${cislo(Math.round(zmena))}</td>
      <td class="sim-${tr}">${zmena >= 0 ? '+' : ''}${proc.toFixed(1)} %</td></tr>`;
  };
  const nazvy = { uroven: 'Úroveň', zlato: 'Zlato', pocta: 'Pocta', statySoucet: 'Staty', winrate: 'Winrate' };
  const radky = Object.entries(r.rozdilP50).map(([k, o]) => rad(nazvy[k] || k, o)).join('');
  const verze = r.verze.stejne
    ? '<div class="adm-poznamka">Balanční verze je shodná — pravidla se nezměnila, rozdíly jsou jen šumem semínek.</div>'
    : `<div class="adm-poznamka sim-varovani">Změněná pravidla: ${r.verze.zmeny.map(z => `<b>${esc(z.pravidlo)}</b> ${esc(String(z.z))}→${esc(String(z.na))}`).join(', ')}</div>`;

  box.innerHTML = `
    <div class="adm-panel">
      <div class="adm-slabe">${esc(a)} vs ${esc(b)}</div>
      ${verze}
      <div class="adm-tabulka-obal"><table class="adm-tabulka">
        <thead><tr><th>Metrika (P50)</th><th>${esc(a)}</th><th>${esc(b)}</th><th>Rozdíl</th><th>%</th></tr></thead>
        <tbody>${radky}</tbody>
      </table></div>
    </div>`;
}

// stažení přes fetch + blob, ať se přiloží token (prostý odkaz by ho neposlal)
async function stahni(url, jmeno) {
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
    if (!r.ok) throw new Error('Export selhal');
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = jmeno;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (e) { hlaska((e && e.message) || 'Export selhal', true); }
}

// ============================================================
//  VYKRESLENÍ DO HRY
// ============================================================
const SEKCE = { prehled: sekcePrehled, hraci: sekceHraci, paladin: sekcePaladin, arena: sekceArena, aukce: sekceAukce, simulator: sekceSimulator, logy: sekceLogy };

// Kostra panelu. Vrací HTML, které si hra vloží do svého pohledu.
function spravaHTML() {
  return `
  <div class="adm-uvnitr">
    <nav class="adm-menu vodorovne" id="admMenu">
      <a class="adm-polozka active" data-sekce="prehled">Přehled</a>
      <a class="adm-polozka" data-sekce="hraci">Hráči</a>
      <a class="adm-polozka" data-sekce="paladin">Paladin</a>
      <a class="adm-polozka" data-sekce="arena">Aréna</a>
      <a class="adm-polozka" data-sekce="aukce">Aukční síň</a>
      <a class="adm-polozka" data-sekce="simulator">Balanční simulátor</a>
      <a class="adm-polozka" data-sekce="logy">Historie zásahů</a>
    </nav>
    <div class="adm-obsah" id="admObsah">
      <div class="adm-nacitani">Načítám…</div>
    </div>
  </div>`;
}

// Zavěsí ovládání a načte první sekci. Volá se až když je kostra
// v dokumentu, jinak by nebylo na co věšet.
async function spustSpravu() {
  const menu = document.getElementById('admMenu');
  if (!menu) return;

  menu.addEventListener('click', e => {
    const p = e.target.closest('.adm-polozka');
    if (!p) return;
    menu.querySelectorAll('.adm-polozka').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    (SEKCE[p.dataset.sekce] || sekcePrehled)();
  });

  // Prava overuje server. Kdyz nepustí, nema smysl nic kreslit.
  try {
    await API.adminDashboard();
  } catch (e) {
    obsah().innerHTML = `
      <div class="adm-zamceno">
        <h1>Sem nemáš přístup</h1>
        <p>${esc((e && e.message) || 'Správcovská práva nebyla potvrzena.')}</p>
      </div>`;
    return;
  }
  sekcePrehled();
}

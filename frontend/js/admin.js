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
//  VYKRESLENÍ DO HRY
// ============================================================
const SEKCE = { prehled: sekcePrehled, hraci: sekceHraci, paladin: sekcePaladin, logy: sekceLogy };

// Kostra panelu. Vrací HTML, které si hra vloží do svého pohledu.
function spravaHTML() {
  return `
  <div class="adm-uvnitr">
    <nav class="adm-menu vodorovne" id="admMenu">
      <a class="adm-polozka active" data-sekce="prehled">Přehled</a>
      <a class="adm-polozka" data-sekce="hraci">Hráči</a>
      <a class="adm-polozka" data-sekce="paladin">Paladin</a>
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

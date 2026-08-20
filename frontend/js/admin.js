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
      <div class="sim-vlastni">
        <label class="adm-pole"><span>Dní</span><input type="number" id="simDni" value="180" min="1" max="3650"></label>
        <label class="adm-pole"><span>Historií (Monte Carlo)</span><input type="number" id="simHist" value="60" min="1" max="500"></label>
        <label class="adm-pole"><span>Hráčů/archetyp</span><input type="number" id="simHrac" value="5" min="1" max="50"></label>
        <label class="adm-pole"><span>Semínko</span><input type="number" id="simSem" value="12345"></label>
        <button class="adm-btn hlavni" id="simSpustVlastni">Spustit vlastní</button>
      </div>
    </div>
    <h2 class="adm-podnadpis">Běhy</h2>
    <div id="simBehy"><div class="adm-nacitani">Načítám…</div></div>
    <div id="simDetail"></div>`;

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

  obsah().querySelectorAll('.sim-preset').forEach(b =>
    b.addEventListener('click', () => spust(b, { preset: b.dataset.preset })));
  document.getElementById('simSpustVlastni').addEventListener('click', function () {
    spust(this, {
      dni: +document.getElementById('simDni').value,
      historie: +document.getElementById('simHist').value,
      hracuNaArchetyp: +document.getElementById('simHrac').value,
      zakladniSeminko: +document.getElementById('simSem').value,
    });
  });

  nactiSimBehy();
}

async function nactiSimBehy() {
  const behy = await zavolej(() => API.simBehy());
  const box = document.getElementById('simBehy');
  if (!box) { if (simPoll) { clearInterval(simPoll); simPoll = null; } return; }
  if (!behy) return;

  box.innerHTML = behy.length ? `
    <div class="adm-tabulka-obal"><table class="adm-tabulka">
      <thead><tr><th>ID</th><th>Stav</th><th>Průběh</th><th>Nastavení</th><th>Upozornění</th><th></th></tr></thead>
      <tbody>${behy.map(b => `
        <tr>
          <td class="adm-zvyraz">${esc(b.id)}</td>
          <td>${simStavStitek(b.stav)}</td>
          <td>${b.prubeh ? `${b.prubeh.hotovo}/${b.prubeh.celkem}` : '—'}</td>
          <td class="adm-slabe">${b.nastaveni.dni}d · ${b.nastaveni.historie}× · ${b.nastaveni.hracuNaArchetyp}/arch</td>
          <td>${b.pocetUpozorneni != null ? b.pocetUpozorneni : '—'}</td>
          <td>
            ${b.stav === 'hotovo' ? `<button class="adm-btn maly" data-vysledek="${esc(b.id)}">Výsledek</button>` : ''}
            ${(b.stav === 'ceka' || b.stav === 'bezi') ? `<button class="adm-btn maly zrus" data-zrus="${esc(b.id)}">Zrušit</button>` : ''}
          </td>
        </tr>`).join('')}</tbody>
    </table></div>` : '<div class="adm-prazdno">Zatím žádné běhy.</div>';

  box.querySelectorAll('[data-vysledek]').forEach(b => b.addEventListener('click', () => zobrazSimVysledek(b.dataset.vysledek)));
  box.querySelectorAll('[data-zrus]').forEach(b => b.addEventListener('click', async () => {
    await zavolej(() => API.simZrus(b.dataset.zrus)); nactiSimBehy();
  }));

  // poll, dokud něco běží
  const zive = behy.some(b => b.stav === 'ceka' || b.stav === 'bezi');
  if (zive && !simPoll) simPoll = setInterval(nactiSimBehy, 1200);
  if (!zive && simPoll) { clearInterval(simPoll); simPoll = null; }
}

async function zobrazSimVysledek(id) {
  const box = document.getElementById('simDetail');
  box.innerHTML = '<div class="adm-nacitani">Načítám výsledek…</div>';
  const d = await zavolej(() => API.simDetail(id));
  if (!d || !d.vysledek) { box.innerHTML = '<div class="adm-prazdno">Výsledek není hotový.</div>'; return; }
  const v = d.vysledek;

  const rada = (id2, a) => `<tr>
    <td class="adm-zvyraz">${esc(id2)}</td>
    <td>${a.uroven.p50.toFixed(0)}</td>
    <td>${cislo(Math.round(a.zlato.p50))}</td>
    <td>${cislo(Math.round(a.pocta.p50))}</td>
    <td>${a.statySoucet.p50.toFixed(0)}</td>
    <td>${(a.winrate.p50 * 100).toFixed(0)} %</td>
    <td>${(a.pvpWin.p50 * 100).toFixed(0)} %</td>
  </tr>`;
  const telo = Object.entries(v.vysledek.archetypy).map(([k, a]) => rada(k, a)).join('');

  const upoz = v.upozorneni.length
    ? v.upozorneni.map(u => `<li class="sim-upoz sim-z-${esc(u.zavaznost)}"><b>${esc(u.zavaznost)}</b> — ${esc(u.zprava)}</li>`).join('')
    : '<li class="adm-prazdno">žádná</li>';

  const a = await zavolej(() => API.simAnalyza(id));
  const seznamY = arr => (arr && arr.length) ? arr.map(x => `<li>${esc(x)}</li>`).join('') : '<li class="adm-slabe">—</li>';

  const s = v.vysledek.stropy;
  box.innerHTML = `
    <div class="adm-panel sim-vysledek">
      <div class="sim-vys-hlava">
        <h2 class="adm-podnadpis">Výsledek ${esc(id)}</h2>
        <div class="sim-export">
          <button class="adm-btn maly" id="simJson">Stáhnout JSON</button>
          <button class="adm-btn maly" id="simCsv">Stáhnout CSV</button>
        </div>
      </div>
      <div class="adm-slabe">${esc(v.meta.hernidoba)} · ${cislo(v.meta.pocetPostavCelkem)} postav · verze ${esc(v.meta.balancVerze)} · semínko ${v.meta.zakladniSeminko}</div>

      <div class="sim-stropy">Krit max <b>${(s.critMax * 100).toFixed(1)} %</b> · Blok max <b>${(s.blokMax * 100).toFixed(1)} %</b> · Dvojhmat max <b>${(s.dvojMax * 100).toFixed(1)} %</b></div>

      <div class="adm-tabulka-obal"><table class="adm-tabulka">
        <thead><tr><th>Archetyp</th><th>Úr. P50</th><th>Zlato P50</th><th>Pocta P50</th><th>Staty P50</th><th>Winrate</th><th>PvP</th></tr></thead>
        <tbody>${telo}</tbody>
      </table></div>

      <h3 class="adm-podnadpis">Upozornění</h3>
      <ul class="sim-upozy">${upoz}</ul>

      <h3 class="adm-podnadpis">Analýza <small class="adm-slabe">(poradní — nemění konfiguraci)</small></h3>
      <div class="sim-analyza">
        <div><b>Pozorování</b><ul>${seznamY(a && a.pozorovani)}</ul></div>
        <div><b>Úvahy</b><ul>${seznamY(a && a.uvahy)}</ul></div>
        <div><b>Doporučení</b><ul>${seznamY(a && a.doporuceni)}</ul></div>
      </div>
    </div>`;

  document.getElementById('simJson').addEventListener('click', () => stahni(API.simExportJson(id), id + '.json'));
  document.getElementById('simCsv').addEventListener('click', () => stahni(API.simExportCsv(id), id + '.csv'));
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
const SEKCE = { prehled: sekcePrehled, hraci: sekceHraci, paladin: sekcePaladin, arena: sekceArena, simulator: sekceSimulator, logy: sekceLogy };

// Kostra panelu. Vrací HTML, které si hra vloží do svého pohledu.
function spravaHTML() {
  return `
  <div class="adm-uvnitr">
    <nav class="adm-menu vodorovne" id="admMenu">
      <a class="adm-polozka active" data-sekce="prehled">Přehled</a>
      <a class="adm-polozka" data-sekce="hraci">Hráči</a>
      <a class="adm-polozka" data-sekce="paladin">Paladin</a>
      <a class="adm-polozka" data-sekce="arena">Aréna</a>
      <a class="adm-polozka" data-sekce="simulator">Simulátor</a>
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

// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://gladiator-game-778y.onrender.com/api';

class API {
  static async request(endpoint, method = 'GET', data = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Přidej token pokud existuje
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Request failed');
      }

      return responseData;
    } catch (error) {
      throw error;
    }
  }

  // Auth endpoints
  static async register(username, email, password, confirmPassword) {
    return this.request('/auth/register', 'POST', {
      username,
      email,
      password,
      confirmPassword,
    });
  }

  static async login(username, password) {
    return this.request('/auth/login', 'POST', {
      username,
      password,
    });
  }

  // Character endpoints
  static async createCharacter(name, gender, charClass = 'Warrior') {
    return this.request('/character/create', 'POST', {
      name,
      gender,
      class: charClass,
    });
  }

  static async getCharacter() {
    return this.request('/character/my-character');
  }

  static async updateCharacter(data) {
    return this.request('/character/update', 'PUT', data);
  }

  // --- Paladin a herni stav ---
  // O bodech, odpoctech i clenstvi rozhoduje server. Hra si je jen
  // vyzvedne a zobrazi; nic z toho nepocita sama.
  static async paladinStatus()      { return this.request('/paladin/status'); }
  static async paladinBuy()         { return this.request('/paladin/buy', 'POST'); }
  static async paladinConfig()      { return this.request('/paladin/config'); }
  static async paladinSaveConfig(config) { return this.request('/paladin/config', 'PUT', { config }); }

  static async gameState()          { return this.request('/game/state'); }
  static async gameSpend(druh)      { return this.request('/game/spend', 'POST', { druh }); }
  static async gameReward(data)     { return this.request('/game/reward', 'POST', data); }
  static async merchantRefresh()    { return this.request('/game/merchant-refresh', 'POST'); }

  // --- Arena (PvP podle Pocty) ---
  static async arenaState()             { return this.request('/arena/state'); }
  static async arenaFight(obrancaId, klic) { return this.request('/arena/fight', 'POST', { obrancaId, klic }); }
  static async arenaLeaderboard(q = {}) {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    return this.request('/arena/leaderboard' + (p.toString() ? '?' + p : ''));
  }
  static async arenaConfig()            { return this.request('/arena/config'); }
  static async arenaSaveConfig(config)  { return this.request('/arena/config', 'PUT', { config }); }

  // --- aukcni sin ---
  static async aukceState(q = {}) {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    return this.request('/aukce/state' + (p.toString() ? '?' + p : ''));
  }
  static async aukceDetail(id)          { return this.request('/aukce/detail/' + id); }
  static async aukceBid(aukceId, castka, klic) { return this.request('/aukce/bid', 'POST', { aukceId, castka, klic }); }
  static async aukceBuyNow(aukceId, klic) { return this.request('/aukce/buynow', 'POST', { aukceId, klic }); }
  static async aukceDoruceni()          { return this.request('/aukce/doruceni'); }
  static async aukceVyzvednout(doruceniId) { return this.request('/aukce/vyzvednout', 'POST', { doruceniId }); }
  static async aukceConfig()            { return this.request('/aukce/config'); }
  static async aukceSaveConfig(config)  { return this.request('/aukce/config', 'PUT', { config }); }
  static async aukceDiagnostika()       { return this.request('/aukce/diagnostika'); }

  // --- staj ---
  static async stajState()              { return this.request('/staj/state'); }
  static async stajKoupit(zvire, klic)  { return this.request('/staj/koupit', 'POST', { zvire, klic }); }
  static async stajAktivovat(zvire)     { return this.request('/staj/aktivovat', 'POST', { zvire }); }
  static async stajConfig()             { return this.request('/staj/config'); }
  static async stajSaveConfig(config)   { return this.request('/staj/config', 'PUT', { config }); }

  // --- materiály ---
  static async materialyMoje()          { return this.request('/materialy/moje'); }
  static async materialyConfig()        { return this.request('/materialy/config'); }
  static async materialySaveConfig(cfg) { return this.request('/materialy/config', 'PUT', cfg); }

  // --- cestovatel / regiony ---
  static async regionState()            { return this.request('/region/state'); }
  static async regionTravel(region)     { return this.request('/region/travel', 'POST', { region }); }
  static async regionConfig()           { return this.request('/region/config'); }
  static async regionSaveConfig(config) { return this.request('/region/config', 'PUT', { config }); }

  // --- balancni simulator (jen admin) ---
  static async simMeta()               { return this.request('/sim/meta'); }
  static async simBehy()               { return this.request('/sim/beh'); }
  static async simSpust(nast)          { return this.request('/sim/beh', 'POST', nast); }
  static async simDetail(id)           { return this.request('/sim/beh/' + id); }
  static async simAnalyza(id)          { return this.request('/sim/beh/' + id + '/analyza'); }
  static async simZrus(id)             { return this.request('/sim/beh/' + id + '/zrusit', 'POST'); }
  static async simPorovnat(a, b)       { return this.request('/sim/porovnat/' + a + '/' + b); }
  static simExportJson(id)             { return API_URL + '/sim/beh/' + id + '/export.json'; }
  static simExportCsv(id)              { return API_URL + '/sim/beh/' + id + '/export.csv'; }

  // --- sprava ---
  // Prava si server overuje u kazdeho volani znovu; tohle je jen
  // pohodlnejsi zapis, ne obchazeni kontroly.
  static async adminDashboard()  { return this.request('/admin/dashboard'); }
  static async adminPlayers(q = {}) {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    return this.request('/admin/players' + (p.toString() ? '?' + p : ''));
  }
  static async adminPlayer(id)              { return this.request('/admin/players/' + id); }
  static async adminSavePlayer(id, data)    { return this.request('/admin/players/' + id, 'PUT', data); }
  static async adminBan(id, dny, duvod)     { return this.request('/admin/players/' + id + '/ban', 'POST', { dny, duvod }); }
  static async adminUnban(id)               { return this.request('/admin/players/' + id + '/unban', 'POST'); }
  static async adminDeletePlayer(id, potvrzeni) { return this.request('/admin/players/' + id, 'DELETE', { potvrzeni }); }
  static async adminLogs(limit = 100)       { return this.request('/admin/logs?limit=' + limit); }

  static async getLeaderboard() {
    return this.request('/character/leaderboard');
  }

  // Utility
  static saveToken(token) {
    localStorage.setItem('token', token);
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static clearToken() {
    localStorage.removeItem('token');
  }

  static isLoggedIn() {
    return !!this.getToken();
  }
}

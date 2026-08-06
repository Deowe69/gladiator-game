// API Configuration
const API_URL = 'https://gladiator-game-778y.onrender.com/api';

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

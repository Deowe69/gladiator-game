// ========== PAGE MANAGEMENT ==========
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  el.innerHTML = `<div class="message ${type}">${text}</div>`;
}

function clearMsg(id) {
  document.getElementById(id).innerHTML = '';
}

// ========== LOGIN ==========
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) return showMsg('loginMsg', '⚠ Vyplň všechna pole');

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = '⏳ Přihlašování...';

  try {
    const res = await API.login(username, password);
    API.saveToken(res.token);

    showMsg('loginMsg', '✅ Přihlášení úspěšné! Vstupuješ do arény...', 'success');

    // Zkontroluj postavu
    try {
      const charRes = await API.getCharacter();
      if (charRes.character) {
        setTimeout(() => {
          window.location.href = 'game.html';
        }, 1200);
      }
    } catch {
      setTimeout(() => showPage('characterCreation'), 1200);
    }
  } catch (err) {
    showMsg('loginMsg', `⚠ ${err.message || 'Chyba přihlášení'}`);
    btn.disabled = false;
    btn.textContent = '⚔ Vstoupit do Arény ⚔';
  }
});

// ========== REGISTER ==========
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  if (!username || !email || !password || !confirm)
    return showMsg('registerMsg', '⚠ Vyplň všechna pole');
  if (password.length < 6)
    return showMsg('registerMsg', '⚠ Heslo musí mít alespoň 6 znaků');
  if (password !== confirm)
    return showMsg('registerMsg', '⚠ Hesla se neshodují');

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = '⏳ Registrování...';

  try {
    const res = await API.register(username, email, password, confirm);
    API.saveToken(res.token);
    showMsg('registerMsg', '✅ Účet vytvořen! Nyní vytvoř svého hrdinu...', 'success');
    setTimeout(() => showPage('characterCreation'), 1400);
  } catch (err) {
    showMsg('registerMsg', `⚠ ${err.message || 'Chyba registrace'}`);
    btn.disabled = false;
    btn.textContent = '📜 Zaregistrovat se';
  }
});

let selectedGender = null;
let selectedClass  = null;

function selectGender(g) {
  selectedGender = g;
  document.querySelectorAll('.gender-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-gender="${g}"]`).classList.add('selected');
  checkReady();
  updateAvatarPreview();
}

function selectClass(c) {
  selectedClass = c;
  document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-class="${c}"]`).classList.add('selected');
  checkReady();
  updateAvatarPreview();
}

function checkReady() {
  const name = document.getElementById('charName').value.trim();
  document.getElementById('createCharBtn').disabled = !(name && selectedGender && selectedClass);
}

document.addEventListener('DOMContentLoaded', () => {
document.getElementById('charName').addEventListener('input', checkReady);

document.getElementById('characterForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('charName').value.trim();

  if (!name || !selectedGender || !selectedClass)
    return showMsg('characterMsg', '⚠ Vyplň vše – jméno, pohlaví i třídu');
  if (name.length < 3)
    return showMsg('characterMsg', '⚠ Jméno musí mít alespoň 3 znaky');

  const btn = document.getElementById('createCharBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Zrození hrdiny...';

  try {
    const res = await API.createCharacter(name, selectedGender, selectedClass);
    localStorage.setItem('character', JSON.stringify(res.character));
    showMsg('characterMsg', `✅ Gladiátor "${name}" vstupuje do arény!`, 'success');
    setTimeout(() => { window.location.href = 'game.html'; }, 1600);
  } catch (err) {
    showMsg('characterMsg', `⚠ ${err.message || 'Chyba při vytváření postavy'}`);
    btn.disabled = false;
    btn.textContent = originalText;
  }
  });
});

function updateAvatarPreview() {
  const preview = document.getElementById('avatarPreview');
  if (!preview) return;
  const cls = selectedClass || 'Warrior';
  const gen = selectedGender || 'male';
  preview.innerHTML = getAvatar(cls, gen);
  preview.style.fontSize = '';
}


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC258-IU_Yy3ccyJtPGjRmyrcRx9_j4nWg",
  authDomain: "achadosperdidos-8db77.firebaseapp.com",
  projectId: "achadosperdidos-8db77",
  storageBucket: "achadosperdidos-8db77.firebasestorage.app",
  messagingSenderId: "376327013912",
  appId: "1:376327013912:web:bb19e8656de8b89edd256d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── STATE ──
let currentUser = null;
let currentRole = null;
let activeFilter = 'Todos';
let currentPhotoFile = null;
let items = [];

// emoji fallbacks per category
const catEmoji = {
  'Eletrônico': '📱', 'Roupa': '👕', 'Acessório': '👜',
  'Documento': '📄', 'Outro': '📦'
};

// ── FIREBASE LISTENER (tempo real, sincroniza entre todos os computadores) ──
const itemsQuery = query(collection(db, 'itens'), orderBy('criadoEm', 'desc'));
onSnapshot(itemsQuery, (snapshot) => {
  items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCards();
  updateStats();
}, (err) => {
  console.error(err);
  showToast('Erro ao conectar ao banco de dados.');
});

// ── AUTH ──
function loginFuncionario() {
  const user = document.getElementById('empUser').value.trim();
  const pass = document.getElementById('empPass').value;
  if (user === 'funcionario' && pass === '1234') {
    currentUser = 'Inspetor';
    currentRole = 'funcionario';
    enterApp();
  } else {
    showToast('Usuário ou senha incorretos.');
  }
}

function loginMicrosoft() {
  // Integração com Microsoft Entra ID (Azure AD) requer registro do app
  // no portal Azure e configuração de OAuth. Placeholder funcional por enquanto.
  showToast('Login com Microsoft ainda não configurado. Use usuário e senha.');
}

function enterApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('roleLabel').textContent = '🔑 Colaborador FIAP';
  document.getElementById('fabBtn').style.display = 'flex';
  setDefaults();
  renderCards();
  updateStats();
}

function logout() {
  currentUser = null; currentRole = null;
  document.getElementById('loginScreen').style.display = 'flex';
}

function setDefaults() {
  const now = new Date();
  document.getElementById('fData').value = now.toISOString().split('T')[0];
  document.getElementById('fHora').value = now.toTimeString().slice(0,5);
}

// ── RENDER ──
function renderCards() {
  const grid = document.getElementById('itemsGrid');
  if (!grid) return;
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = items.filter(it => {
    const matchCat = activeFilter === 'Todos' || it.categoria === activeFilter;
    const matchQ = !q || (it.descricao || '').toLowerCase().includes(q) || (it.categoria || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Nenhum item encontrado para esse filtro.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(it => {
    const statusBadge = it.resolvido
      ? `<span class="status-badge status-resolved">Devolvido</span>`
      : `<span class="status-badge status-open">Aguardando</span>`;
    const imgContent = it.fotoURL
      ? `<img src="${it.fotoURL}" alt="${it.descricao}" loading="lazy">`
      : catEmoji[it.categoria] || '📦';

    const empActions = currentRole === 'funcionario' ? `
      <div class="card-actions">
        <button class="btn-resolve" onclick="event.stopPropagation();toggleResolve('${it.id}', ${!!it.resolvido})">
          ${it.resolvido ? 'Reabrir' : '✓ Devolvido'}
        </button>
        <button class="btn-danger" onclick="event.stopPropagation();deleteItem('${it.id}')">Remover</button>
      </div>` : '';

    return `
      <div class="card" onclick="openDetail('${it.id}')">
        <div class="card-img">${imgContent}</div>
        <div class="card-body">
          <span class="card-tag">${it.categoria}</span>
          <div class="card-title">${it.descricao} ${statusBadge}</div>
          <div class="card-meta">
            <span>🏢 ${it.piso}</span>
            <span>🕐 ${it.horario} · ${formatDate(it.data)}</span>
          </div>
          ${empActions}
        </div>
      </div>`;
  }).join('');
}

function updateStats() {
  document.getElementById('statTotal').textContent = items.length;
  document.getElementById('statOpen').textContent = items.filter(i => !i.resolvido).length;
  document.getElementById('statResolved').textContent = items.filter(i => i.resolvido).length;
}

function setFilter(cat, el) {
  activeFilter = cat;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderCards();
}

function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── DETAIL ──
function openDetail(id) {
  const it = items.find(i => i.id === id);
  if (!it) return;
  document.getElementById('dTitle').textContent = it.descricao;
  document.getElementById('dCat').textContent = it.categoria;
  document.getElementById('dPiso').textContent = it.piso;
  document.getElementById('dHora').textContent = it.horario;
  document.getElementById('dData').textContent = formatDate(it.data);
  document.getElementById('dEncontradoPor').textContent = it.encontradoPor || '—';

  const descRow = document.getElementById('dDescRow');
  if (it.observacoes) {
    descRow.style.display = 'flex';
    document.getElementById('dDesc').textContent = it.observacoes;
  } else {
    descRow.style.display = 'none';
  }

  const wrap = document.getElementById('dImgWrap');
  wrap.innerHTML = it.fotoURL
    ? `<img src="${it.fotoURL}" alt="${it.descricao}" style="width:100%;height:100%;object-fit:cover">`
    : `<span style="font-size:5rem">${catEmoji[it.categoria] || '📦'}</span>`;

  document.getElementById('detailOverlay').classList.add('open');
}

function closeDetail(e) {
  if (e.target.id === 'detailOverlay') closeDetailModal();
}
function closeDetailModal() {
  document.getElementById('detailOverlay').classList.remove('open');
}

// ── ADD ──
function openAddModal() {
  document.getElementById('addOverlay').classList.add('open');
}
function closeAdd(e) {
  if (e.target.id === 'addOverlay') closeAddModal();
}
function closeAddModal() {
  document.getElementById('addOverlay').classList.remove('open');
}

function handlePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Comprime a imagem no navegador (max 800px de largura, qualidade 0.7)
  // para caber no limite de 1MB por documento do Firestore.
  const img = new Image();
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);

      currentPhotoFile = compressed;
      document.getElementById('previewImg').src = compressed;
      document.getElementById('uploadArea').style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'block';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  currentPhotoFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadArea').style.display = '';
  document.getElementById('uploadPreview').style.display = 'none';
}

async function saveItem() {
  const desc = document.getElementById('fDesc').value.trim();
  const encontradoPor = document.getElementById('fEncontradoPor').value.trim();
  const cat  = document.getElementById('fCat').value;
  const piso = document.getElementById('fPiso').value;
  const hora = document.getElementById('fHora').value;
  const data = document.getElementById('fData').value;
  const obs  = document.getElementById('fObs').value.trim();

  if (!desc || !cat || !piso || !hora || !data) {
    showToast('Preencha todos os campos obrigatórios.');
    return;
  }

  const saveBtn = document.querySelector('#addOverlay .btn-primary');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Salvando...';
  saveBtn.disabled = true;

  try {
    // currentPhotoFile já é o base64 comprimido (ou null)
    const fotoURL = currentPhotoFile || null;

    await addDoc(collection(db, 'itens'), {
      descricao: desc,
      encontradoPor: encontradoPor || null,
      categoria: cat,
      piso,
      horario: hora,
      data,
      observacoes: obs,
      fotoURL,
      resolvido: false,
      funcionario: currentUser,
      criadoEm: serverTimestamp()
    });

    closeAddModal();
    resetForm();
    showToast('Item cadastrado com sucesso!', 'success');
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('1048487')) {
      showToast('Foto muito grande. Tente uma foto menor.');
    } else {
      showToast('Erro ao salvar. Verifique sua conexão.');
    }
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

function resetForm() {
  document.getElementById('fDesc').value = '';
  document.getElementById('fEncontradoPor').value = '';
  document.getElementById('fCat').value = '';
  document.getElementById('fPiso').value = '';
  document.getElementById('fObs').value = '';
  clearPhoto();
  setDefaults();
}

async function toggleResolve(id, resolvidoAtual) {
  try {
    await updateDoc(doc(db, 'itens', id), { resolvido: !resolvidoAtual });
    showToast(!resolvidoAtual ? 'Marcado como devolvido.' : 'Reaberto.', !resolvidoAtual ? 'success' : '');
  } catch (err) {
    console.error(err);
    showToast('Erro ao atualizar item.');
  }
}

async function deleteItem(id) {
  if (!confirm('Remover este item do sistema?')) return;
  try {
    await deleteDoc(doc(db, 'itens', id));
    showToast('Item removido.');
  } catch (err) {
    console.error(err);
    showToast('Erro ao remover item.');
  }
}

// ── FAB "para de seguir" a tela ao chegar no footer ──
// Enquanto o footer não está visível, o botão fica fixed (flutuando no canto).
// Quando o footer entra na viewport, o botão vira absolute e fica ancorado
// logo acima do footer, sem invadi-lo. Ao subir a página, volta para fixed.
function setupFabDocking() {
  const fab = document.getElementById('fabBtn');
  const footer = document.querySelector('.site-footer');
  if (!fab || !footer) return;

  function dockFab() {
    // Lê a margem real definida no CSS (32px no desktop, 20px no mobile)
    // em vez de usar um valor fixo, para acompanhar o media query.
    const wasDocked = fab.classList.contains('fab-docked');
    if (wasDocked) fab.classList.remove('fab-docked'); // garante leitura do estilo "fixed" original
    const fabMargin = parseFloat(getComputedStyle(fab).bottom) || 32;
    if (wasDocked) fab.classList.add('fab-docked');

    const footerTop = footer.getBoundingClientRect().top + window.scrollY;
    const dockTop = footerTop - fab.offsetHeight - fabMargin;
    fab.style.setProperty('--fab-dock-top', `${dockTop}px`);
    fab.classList.add('fab-docked');
  }

  function undockFab() {
    fab.classList.remove('fab-docked');
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        dockFab();
      } else {
        undockFab();
      }
    });
  }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });

  observer.observe(footer);

  // Recalcula a posição de ancoragem se a janela for redimensionada
  // enquanto o botão estiver "docked".
  window.addEventListener('resize', () => {
    if (fab.classList.contains('fab-docked')) dockFab();
  });
}

// inicia o docking do FAB assim que o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFabDocking);
} else {
  setupFabDocking();
}

// ── TOAST ──
let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' success' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// expõe funções no escopo global (necessário pois o script agora é type="module")
window.loginFuncionario = loginFuncionario;
window.loginMicrosoft = loginMicrosoft;
window.logout = logout;
window.renderCards = renderCards;
window.setFilter = setFilter;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.closeDetailModal = closeDetailModal;
window.openAddModal = openAddModal;
window.closeAdd = closeAdd;
window.closeAddModal = closeAddModal;
window.handlePhoto = handlePhoto;
window.clearPhoto = clearPhoto;
window.saveItem = saveItem;
window.toggleResolve = toggleResolve;
window.deleteItem = deleteItem;
// ── STATE ──
let currentUser = null;
let currentRole = null;
let activeFilter = 'Todos';
let currentPhotoBase64 = null;
let items = JSON.parse(localStorage.getItem('items') || '[]');

// emoji fallbacks per category
const catEmoji = {
  'Eletrônico': '📱', 'Roupa': '👕', 'Acessório': '👜',
  'Documento': '📄', 'Outro': '📦'
};

// ── AUTH ──
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tabAluno').style.display = tab === 'aluno' ? '' : 'none';
  document.getElementById('tabFuncionario').style.display = tab === 'funcionario' ? '' : 'none';
  event.target.classList.add('active');
}

function loginAluno() {
  const nome = document.getElementById('alunoNome').value.trim();
  if (!nome) { showToast('Digite seu nome para entrar.'); return; }
  currentUser = nome;
  currentRole = 'aluno';
  enterApp();
}

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

function enterApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('roleLabel').textContent =
    currentRole === 'funcionario' ? '🔑 Funcionário' : '🎓 Aluno';
  document.getElementById('fabBtn').style.display =
    currentRole === 'funcionario' ? 'flex' : 'none';
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
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = items.filter(it => {
    const matchCat = activeFilter === 'Todos' || it.categoria === activeFilter;
    const matchQ = !q || it.descricao.toLowerCase().includes(q) || it.categoria.toLowerCase().includes(q);
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
    const imgContent = it.foto
      ? `<img src="${it.foto}" alt="${it.descricao}">`
      : catEmoji[it.categoria] || '📦';

    const empActions = currentRole === 'funcionario' ? `
      <div class="card-actions">
        <button class="btn-resolve" onclick="event.stopPropagation();toggleResolve('${it.id}')">
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
  document.getElementById('dFuncionario').textContent = it.funcionario;

  const descRow = document.getElementById('dDescRow');
  if (it.observacoes) {
    descRow.style.display = 'flex';
    document.getElementById('dDesc').textContent = it.observacoes;
  } else {
    descRow.style.display = 'none';
  }

  const wrap = document.getElementById('dImgWrap');
  wrap.innerHTML = it.foto
    ? `<img src="${it.foto}" alt="${it.descricao}" style="width:100%;height:100%;object-fit:cover">`
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
  const reader = new FileReader();
  reader.onload = ev => {
    currentPhotoBase64 = ev.target.result;
    document.getElementById('previewImg').src = currentPhotoBase64;
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  currentPhotoBase64 = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadArea').style.display = '';
  document.getElementById('uploadPreview').style.display = 'none';
}

function saveItem() {
  const desc = document.getElementById('fDesc').value.trim();
  const cat  = document.getElementById('fCat').value;
  const piso = document.getElementById('fPiso').value;
  const hora = document.getElementById('fHora').value;
  const data = document.getElementById('fData').value;
  const nome = document.getElementById('fNome').value;
  const obs  = document.getElementById('fObs').value.trim();

  if (!desc || !cat || !piso || !hora || !data || !nome) {
    showToast('Preencha todos os campos obrigatórios.');
    return;
  }

  const item = {
    id: Date.now().toString(),
    descricao: desc,
    categoria: cat,
    piso,
    horario: hora,
    data,
    nome,
    observacoes: obs,
    foto: currentPhotoBase64,
    resolvido: false,
    funcionario: currentUser,
    criadoEm: new Date().toISOString()
  };

  items.unshift(item);
  saveItems();
  renderCards();
  updateStats();
  closeAddModal();
  resetForm();
  showToast('Item cadastrado com sucesso!', 'success');
}

function resetForm() {
  document.getElementById('fDesc').value = '';
  document.getElementById('fCat').value = '';
  document.getElementById('fPiso').value = '';
  document.getElementById('fObs').value = '';
  clearPhoto();
  setDefaults();
}

function toggleResolve(id) {
  const it = items.find(i => i.id === id);
  if (!it) return;
  it.resolvido = !it.resolvido;
  saveItems();
  renderCards();
  updateStats();
  showToast(it.resolvido ? 'Marcado como devolvido.' : 'Reaberto.', it.resolvido ? 'success' : '');
}

function deleteItem(id) {
  if (!confirm('Remover este item do sistema?')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderCards();
  updateStats();
  showToast('Item removido.');
}

function saveItems() {
  localStorage.setItem('items', JSON.stringify(items));
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

// seed demo data if empty
if (items.length === 0) {
  const demos = [
    { id:'d1', descricao:'Fone de ouvido Bluetooth', categoria:'Eletrônico', piso:'2º Andar', horario:'10:30', data:'2025-06-10', observacoes:'Preto, sem fio, sem case', foto:null, resolvido:false, funcionario:'Inspetor João' },
    { id:'d2', descricao:'Jaqueta cinza com zíper', categoria:'Roupa', piso:'Térreo', horario:'07:45', data:'2025-06-11', observacoes:'Tamanho M, marca não identificada', foto:null, resolvido:false, funcionario:'Inspetor Maria' },
    { id:'d3', descricao:'Carteira preta masculina', categoria:'Acessório', piso:'1º Andar', horario:'13:00', data:'2025-06-09', observacoes:'Contém alguns cartões', foto:null, resolvido:true, funcionario:'Inspetor João' },
    { id:'d4', descricao:'Documento RG', categoria:'Documento', piso:'Pátio', horario:'12:20', data:'2025-06-12', observacoes:'', foto:null, resolvido:false, funcionario:'Inspetor Ana' },
    { id:'d5', descricao:'Óculos de grau armação azul', categoria:'Acessório', piso:'3º Andar', horario:'08:15', data:'2025-06-12', observacoes:'', foto:null, resolvido:false, funcionario:'Inspetor Maria' },
  ];
  items = demos;
  saveItems();
}
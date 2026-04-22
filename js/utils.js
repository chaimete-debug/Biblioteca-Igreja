// ─────────────────────────────────────────────────────────────
//  utils.js — Shared helpers
// ─────────────────────────────────────────────────────────────

// ── Toast notifications ──────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent  = msg;
  el.className    = `toast toast-${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Loading overlay ──────────────────────────────────────────
function setLoading(on) {
  const el = document.getElementById('overlay');
  if (el) el.classList.toggle('hidden', !on);
}

// ── Modal helpers ────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); m.querySelector('[autofocus]')?.focus(); }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.closest('.modal').classList.remove('open');
  }
});

// ── Date helpers ─────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0]; }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diasAtraso(dataPrevista) {
  const diff = Math.floor((new Date() - new Date(dataPrevista)) / 86400000);
  return diff > 0 ? diff : 0;
}

// ── Badge builders ───────────────────────────────────────────
function estadoBadge(estado) {
  const map = {
    'Disponível':  'badge-green',
    'Indisponível':'badge-red',
    'Activo':      'badge-blue',
    'Devolvido':   'badge-gray',
    'Aguardando':  'badge-orange',
    'Atrasado':    'badge-red',
  };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

// ── Table builder ────────────────────────────────────────────
function buildTable(container, columns, rows, actions) {
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>Sem registos</p></div>';
    return;
  }
  const th = columns.map(c => `<th>${c.label}</th>`).join('');
  const tbody = rows.map(row => {
    const tds = columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('');
    const acts = actions ? `<td class="actions-cell">${actions(row)}</td>` : '';
    return `<tr>${tds}${acts}</tr>`;
  }).join('');
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${th}${actions ? '<th>Acções</th>' : ''}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
}

// ── Form serialiser ──────────────────────────────────────────
function formToObj(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const obj = {};
  new FormData(form).forEach((v, k) => obj[k] = v);
  return obj;
}

function fillForm(formId, obj) {
  const form = document.getElementById(formId);
  if (!form) return;
  Object.entries(obj).forEach(([k, v]) => {
    const el = form.elements[k];
    if (el) el.value = v;
  });
}

// ── Debounce ─────────────────────────────────────────────────
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Number format ────────────────────────────────────────────
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'MZN' });
}

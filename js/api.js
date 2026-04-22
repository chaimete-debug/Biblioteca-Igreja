// ─────────────────────────────────────────────────────────────
//  api.js — Supabase REST API client
//  Supabase tem API REST nativa — sem servidor intermédio
//  Resposta típica: 50-200ms vs 2-5s do Apps Script
// ─────────────────────────────────────────────────────────────

// Set in config.js:
// window.SUPABASE_URL  = 'https://xxxx.supabase.co'
// window.SUPABASE_ANON = 'eyJ...'

const SB_URL  = () => window.SUPABASE_URL;
const SB_KEY  = () => window.SUPABASE_ANON;

// ── In-memory cache (5 min) ───────────────────────────────────
const _cache = {};
const _TTL   = 5 * 60 * 1000;

function _cGet(k)    { const e=_cache[k]; return (e && Date.now()-e.ts<_TTL) ? e.d : null; }
function _cSet(k,d)  { _cache[k] = {d, ts:Date.now()}; }
function _cClear()   { Object.keys(_cache).forEach(k=>delete _cache[k]); }

// ── HTTP helpers ──────────────────────────────────────────────
async function sbGet(table, params = '') {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}?${params}&apikey=${SB_KEY()}`, {
    headers: {
      'apikey':        SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
      'Content-Type':  'application/json',
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}?apikey=${SB_KEY()}`, {
    method:  'POST',
    headers: {
      'apikey':        SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  _cClear();
  return res.json();
}

async function sbPatch(table, id, body) {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}&apikey=${SB_KEY()}`, {
    method:  'PATCH',
    headers: {
      'apikey':        SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  _cClear();
  return res.json();
}

async function sbDelete(table, id) {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}&apikey=${SB_KEY()}`, {
    method:  'DELETE',
    headers: {
      'apikey':        SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  _cClear();
  return true;
}

async function sbRpc(fn, body = {}) {
  const res = await fetch(`${SB_URL()}/rest/v1/rpc/${fn}?apikey=${SB_KEY()}`, {
    method:  'POST',
    headers: {
      'apikey':        SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function cached(key, fn) {
  const c = _cGet(key);
  if (c) return c;
  const d = await fn();
  _cSet(key, d);
  return d;
}

// ── Auth (simple password stored in config table) ─────────────
const Auth = {
  KEY_TOKEN:  'bib_token',
  KEY_EXPIRY: 'bib_expiry',
  KEY_USER:   'bib_user',

  async login(username, password) {
    // Fetch admin credentials from config table
    const rows = await sbGet('config', 'chave=in.(admin_user,admin_pass)&select=chave,valor');
    const map  = {};
    rows.forEach(r => { map[r.chave] = r.valor; });
    if (map.admin_user !== username || map.admin_pass !== password) {
      throw new Error('Credenciais incorrectas.');
    }
    const token  = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const expiry = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    sessionStorage.setItem(this.KEY_TOKEN,  token);
    sessionStorage.setItem(this.KEY_EXPIRY, expiry);
    return { token, expiry };
  },

  getToken()   { return sessionStorage.getItem(this.KEY_TOKEN) || ''; },

  isLoggedIn() {
    const t = this.getToken();
    const e = sessionStorage.getItem(this.KEY_EXPIRY);
    return !!(t && e && new Date() < new Date(e));
  },

  logout() {
    sessionStorage.removeItem(this.KEY_TOKEN);
    sessionStorage.removeItem(this.KEY_EXPIRY);
    window.location.href = '/index.html';
  },

  guard() {
    if (!this.isLoggedIn()) this.logout();
  },
};

// ── Public API ────────────────────────────────────────────────
const API = {

  // ── Livros ──────────────────────────────────────────────────
  async getLivros() {
    return cached('livros', () => sbGet('livros', 'order=titulo.asc&select=*'));
  },

  async addLivro(b) {
    return sbPost('livros', {
      titulo:      b.titulo,
      autor:       b.autor,
      editora:     b.editora      || null,
      categoria:   b.categoria    || 'Outro',
      codigo:      b.codigo       || null,
      isbn:        b.isbn         || null,
      quantidade:  parseInt(b.quantidade)  || 1,
      disponiveis: parseInt(b.quantidade)  || 1,
      localizacao: b.localizacao  || null,
      estado:      b.estado       || 'Disponível',
    });
  },

  async updateLivro(b) {
    return sbPatch('livros', b.id, {
      titulo:      b.titulo,
      autor:       b.autor,
      editora:     b.editora,
      categoria:   b.categoria,
      codigo:      b.codigo,
      isbn:        b.isbn,
      quantidade:  parseInt(b.quantidade),
      disponiveis: parseInt(b.disponiveis),
      localizacao: b.localizacao,
      estado:      b.estado,
    });
  },

  async deleteLivro(id)        { return sbDelete('livros', id); },

  // ── Utilizadores ────────────────────────────────────────────
  async getUtilizadores() {
    return cached('utilizadores', () => sbGet('utilizadores', 'order=nome.asc&select=*'));
  },

  async addUtilizador(b) {
    return sbPost('utilizadores', {
      nome:        b.nome,
      telefone:    b.telefone    || null,
      email:       b.email       || null,
      nid:         b.nid         || null,
      morada:      b.morada      || null,
      tipo:        b.tipo        || 'Público',
      estado_conta:b.estadoConta || 'Activo',
    });
  },

  async updateUtilizador(b) {
    return sbPatch('utilizadores', b.id, {
      nome:        b.nome,
      telefone:    b.telefone,
      email:       b.email,
      nid:         b.nid,
      morada:      b.morada,
      tipo:        b.tipo,
      estado_conta:b.estadoConta,
    });
  },

  async deleteUtilizador(id)   { return sbDelete('utilizadores', id); },

  // ── Empréstimos ─────────────────────────────────────────────
  async getEmprestimos() {
    return cached('emprestimos', () =>
      sbGet('emprestimos',
        'order=criado_em.desc&select=*,livro:livros(titulo,codigo),utilizador:utilizadores(nome,telefone)')
    );
  },

  async addEmprestimo(b) {
    // Check availability
    const livro = await sbGet('livros', `id=eq.${b.livroId}&select=disponiveis,titulo`);
    if (!livro[0]) throw new Error('Livro não encontrado.');
    if (parseInt(livro[0].disponiveis) < 1) throw new Error('Sem exemplares disponíveis.');

    const emp = await sbPost('emprestimos', {
      utilizador_id:           b.utilizadorId,
      livro_id:                b.livroId,
      data_saida:              b.dataSaida,
      data_prevista_devolucao: b.dataPrevistaDevolucao,
      estado:                  'Activo',
      multa:                   0,
    });

    // Decrement stock
    const novoDisp = parseInt(livro[0].disponiveis) - 1;
    await sbPatch('livros', b.livroId, {
      disponiveis: novoDisp,
      estado:      novoDisp === 0 ? 'Indisponível' : 'Disponível',
    });

    return emp;
  },

  // ── Devoluções ───────────────────────────────────────────────
  async registarDevolucao(b) {
    const emp = await sbGet('emprestimos', `id=eq.${b.emprestimoId}&select=*`);
    if (!emp[0]) throw new Error('Empréstimo não encontrado.');

    const cfg      = await sbGet('config', `chave=eq.multa_por_dia&select=valor`);
    const multaDia = parseFloat(cfg[0]?.valor || 5);
    const prevista = new Date(emp[0].data_prevista_devolucao);
    const real     = new Date(b.dataReal);
    const diasAtraso = Math.max(0, Math.floor((real - prevista) / 86400000));
    const multa      = diasAtraso * multaDia;

    // Update empréstimo
    await sbPatch('emprestimos', b.emprestimoId, {
      data_real_devolucao: b.dataReal,
      estado:              'Devolvido',
      multa,
    });

    // Increment stock
    const livro = await sbGet('livros', `id=eq.${emp[0].livro_id}&select=disponiveis`);
    if (livro[0]) {
      const novoDisp = parseInt(livro[0].disponiveis) + 1;
      await sbPatch('livros', emp[0].livro_id, {
        disponiveis: novoDisp,
        estado:      'Disponível',
      });
    }

    // Log devolução
    await sbPost('devolucoes', {
      emprestimo_id: b.emprestimoId,
      livro_id:      emp[0].livro_id,
      utilizador_id: emp[0].utilizador_id,
      data_real:     b.dataReal,
      dias_atraso:   diasAtraso,
      multa,
    });

    // Notify next in queue
    const fila = await sbGet('reservas',
      `livro_id=eq.${emp[0].livro_id}&estado=eq.Aguardando&order=posicao.asc&limit=1`);
    if (fila[0]) {
      await sbPatch('reservas', fila[0].id, { estado: 'Disponível - Notificado' });
    }

    _cClear();
    return { diasAtraso, multa };
  },

  // ── Reservas ─────────────────────────────────────────────────
  async getReservas() {
    return cached('reservas', () =>
      sbGet('reservas',
        'order=criado_em.desc&select=*,livro:livros(titulo),utilizador:utilizadores(nome)')
    );
  },

  async addReserva(b) {
    const existing = await sbGet('reservas',
      `livro_id=eq.${b.livroId}&estado=eq.Aguardando&select=id`);
    const posicao = existing.length + 1;
    const r = await sbPost('reservas', {
      utilizador_id: b.utilizadorId,
      livro_id:      b.livroId,
      posicao,
      estado:        'Aguardando',
    });
    return { ...r, posicao };
  },

  async cancelarReserva(id) { return sbDelete('reservas', id); },

  // ── Dashboard ────────────────────────────────────────────────
  async getDashboard() {
    return cached('dashboard', async () => {
      const [livros, utils, emps, reservas] = await Promise.all([
        sbGet('livros',       'select=quantidade,disponiveis'),
        sbGet('utilizadores', 'select=estado_conta'),
        sbGet('emprestimos',  'select=estado,multa,data_prevista_devolucao'),
        sbGet('reservas',     'select=estado'),
      ]);
      const hoje     = new Date().toISOString().split('T')[0];
      const activos  = emps.filter(e => e.estado === 'Activo');
      const atrasados= activos.filter(e => e.data_prevista_devolucao < hoje);
      return {
        totalLivros:         livros.length,
        totalExemplares:     livros.reduce((s,l) => s + parseInt(l.quantidade||0), 0),
        totalLeitores:       utils.filter(u => u.estado_conta === 'Activo').length,
        livrosEmprestados:   activos.length,
        devolucoesPendentes: activos.length,
        reservasActivas:     reservas.filter(r => r.estado === 'Aguardando').length,
        alertasAtraso:       atrasados.length,
        multaTotal:          emps.reduce((s,e) => s + parseFloat(e.multa||0), 0),
      };
    });
  },

  // ── Relatórios ────────────────────────────────────────────────
  async getRelatorio(tipo) {
    const hoje = new Date().toISOString().split('T')[0];
    switch(tipo) {
      case 'mais_emprestados': {
        const emps  = await sbGet('emprestimos', 'select=livro_id,livro:livros(titulo)');
        const count = {};
        emps.forEach(e => {
          const t = e.livro?.titulo || e.livro_id;
          count[t] = (count[t]||0) + 1;
        });
        return Object.entries(count)
          .map(([livro,total]) => ({livro,total}))
          .sort((a,b) => b.total-a.total).slice(0,20);
      }
      case 'em_atraso': {
        return sbGet('emprestimos',
          `estado=eq.Activo&data_prevista_devolucao=lt.${hoje}&select=*,livro:livros(titulo),utilizador:utilizadores(nome,telefone)`);
      }
      case 'utilizadores_atraso': {
        const emps = await sbGet('emprestimos',
          `estado=eq.Activo&data_prevista_devolucao=lt.${hoje}&select=utilizador_id,utilizador:utilizadores(nome,email,telefone)`);
        const byU = {};
        emps.forEach(e => {
          if (!byU[e.utilizador_id]) byU[e.utilizador_id] = {...e.utilizador, count:0};
          byU[e.utilizador_id].count++;
        });
        return Object.values(byU);
      }
      case 'stock':
        return sbGet('livros', 'order=titulo.asc&select=titulo,categoria,codigo,quantidade,disponiveis,estado');
      case 'historico':
        return sbGet('emprestimos',
          'order=criado_em.desc&select=*,livro:livros(titulo),utilizador:utilizadores(nome)');
      default: throw new Error('Tipo desconhecido: ' + tipo);
    }
  },

  refresh() { _cClear(); },
};

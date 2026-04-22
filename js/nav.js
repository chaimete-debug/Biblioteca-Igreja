// ─────────────────────────────────────────────────────────────
//  nav.js — builds sidebar + mobile nav for every page
// ─────────────────────────────────────────────────────────────
const _NAV = [
  {id:'dashboard',    icon:'◉',  label:'Painel',       href:'dashboard.html'},
  {section:'Gestão'},
  {id:'livros',       icon:'📖', label:'Livros',        href:'livros.html'},
  {id:'utilizadores', icon:'👥', label:'Utilizadores',  href:'utilizadores.html'},
  {section:'Circulação'},
  {id:'emprestimos',  icon:'📤', label:'Empréstimos',   href:'emprestimos.html'},
  {id:'devolucoes',   icon:'📥', label:'Devoluções',    href:'devolucoes.html'},
  {id:'reservas',     icon:'🔖', label:'Reservas',      href:'reservas.html'},
  {section:'Análise'},
  {id:'relatorios',   icon:'📊', label:'Relatórios',    href:'relatorios.html'},
];

function buildNav(activeId) {
  Auth.guard();
  const sb = document.getElementById('sidebar');
  if (sb) {
    sb.innerHTML = _NAV.map(n =>
      n.section
        ? `<div class="nav-section-label">${n.section}</div>`
        : `<a class="nav-item ${n.id===activeId?'active':''}" href="${n.href}">
             <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
           </a>`
    ).join('');
  }

  // Mobile nav (5 main items)
  const mn = document.getElementById('mobile-nav');
  if (mn) {
    const items = [
      {id:'dashboard',   icon:'◉',  label:'Painel',    href:'dashboard.html'},
      {id:'livros',      icon:'📖', label:'Livros',     href:'livros.html'},
      {id:'emprestimos', icon:'📤', label:'Emprest.',   href:'emprestimos.html'},
      {id:'devolucoes',  icon:'📥', label:'Devol.',     href:'devolucoes.html'},
      {id:'relatorios',  icon:'📊', label:'Relat.',     href:'relatorios.html'},
    ];
    mn.innerHTML = `<div class="mobile-nav-items">${
      items.map(i=>`<a class="mobile-nav-item ${i.id===activeId?'active':''}" href="${i.href}">
        <span class="mn-icon">${i.icon}</span>${i.label}</a>`).join('')
    }</div>`;
  }
}

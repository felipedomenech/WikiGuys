const app = document.querySelector('#app');
const state = { user: null, stats: null, page: 'home', history: [], match: null, article: null, timer: null, started: 0, searchTimer: null };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fmtTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const fmtDate = stamp => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(stamp));
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  return data;
}
function toast(message, error = false) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div'); node.className = `toast${error ? ' error' : ''}`; node.textContent = message; document.body.append(node);
  setTimeout(() => node.remove(), 3600);
}
function navShell(title, content) {
  const initials = state.user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const nav = [['home', '⌂', 'Início'], ['play', '▶', 'Jogar'], ['history', '◷', 'Histórico'], ['profile', '◎', 'Perfil']];
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">W</span><span>WikiRace <em>beta</em></span></div><div class="nav-label">JOGO</div><nav class="nav">${nav.map(([key, icon, label]) => `<button data-page="${key}" class="${state.page === key ? 'active' : ''}"><span class="nav-icon">${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="user-chip"><div class="avatar">${esc(initials)}</div><div class="user-meta"><b>${esc(state.user.name)}</b><span>Explorador</span></div><button class="logout" data-action="logout" aria-label="Sair" title="Sair">↪</button></div></div></aside><main class="main"><header class="topbar"><div class="topbar-title">${esc(title)}</div><div class="topbar-right">${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</div></header><section class="content">${content}</section></main></div>`;
}
function statCard(label, value, note, icon) { return `<div class="stat-card"><div class="stat-label"><span>${icon}</span>${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`; }
function gameRows() {
  if (!state.history.length) return '<div class="empty">Sua próxima grande corrida começa agora.<br>Escolha dois artigos e descubra a rota.</div>';
  return `<div class="game-list">${state.history.slice(0, 4).map(game => `<div class="game-row"><div class="game-symbol">${game.status === 'completed' ? '✓' : '↗'}</div><div><b>${esc(game.start)} → ${esc(game.target)}</b><small>${fmtDate(game.startedAt)} · ${game.mode === 'least_clicks' ? 'Menos cliques' : 'Speedrun'}</small></div><span class="game-status ${game.status === 'abandoned' ? 'abandoned' : ''}">${game.status === 'completed' ? `${game.clicks} cliques` : 'Em andamento'}</span></div>`).join('')}</div>`;
}
function renderHome() {
  const completed = Number(state.stats?.completed || 0); const all = Number(state.stats?.total || 0);
  const content = `<div class="welcome"><div><div class="eyebrow">PAINEL DE CONTROLE</div><h1>Olá, ${esc(state.user.name.split(' ')[0])} <span>👋</span></h1><p>Pronto para descobrir um novo caminho?</p></div><button class="btn" data-page="play">＋ &nbsp;Nova corrida</button></div><div class="stats-grid">${statCard('Partidas concluídas', completed, all ? `${all} partidas no total` : 'Sua primeira está por vir', '✓')}${statCard('Pontos acumulados', Number(state.stats?.points || 0).toLocaleString('pt-BR'), 'Baseados nas partidas concluídas', '✦')}${statCard('Melhor tempo', state.stats?.best_seconds ? fmtTime(Number(state.stats.best_seconds)) : '—', 'Seu recorde pessoal', '◷')}${statCard('Taxa de conclusão', all ? `${Math.round(completed / all * 100)}%` : '—', 'Partidas finalizadas', '↗')}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>Partidas recentes</h2><button class="text-button" data-page="history">Ver histórico</button></div>${gameRows()}</section><div class="side-stack"><section class="challenge"><div class="challenge-mark">✦ &nbsp;Modo de jogo</div><h3>Qual será sua rota?</h3><p>Escolha Speedrun para chegar rápido ou Menos cliques para encontrar uma rota eficiente.</p><button class="btn" data-page="play">Configurar partida &nbsp;→</button></section><section class="panel"><div class="panel-head"><h2>Uma ideia para hoje</h2></div><div class="quick-note"><span class="bulb">◈</span><span>Comece por um assunto amplo e siga os links até um destino inesperado. Cada artigo é uma nova possibilidade.</span></div></section></div></div>`;
  navShell('Visão geral', content);
}
function renderPlay() {
  const content = `<div class="page-head"><div><div class="eyebrow">NOVA PARTIDA</div><h1>Configure sua corrida</h1><p>Escolha a origem, o destino e o tipo de desafio.</p></div></div><section class="game-card"><form id="game-form" class="game-form"><div class="field"><label for="start">Artigo de início</label><div class="search-wrap"><input id="start" name="start" autocomplete="off" placeholder="Ex.: Brasil" required minlength="2"><div class="search-results" hidden></div></div></div><div class="field"><label for="target">Artigo de destino</label><div class="search-wrap"><input id="target" name="target" autocomplete="off" placeholder="Ex.: Sistema Solar" required minlength="2"><div class="search-results" hidden></div></div></div><div class="field full"><label for="mode">Modalidade</label><select id="mode" name="mode"><option value="speedrun">Speedrun — vença no menor tempo</option><option value="least_clicks">Menos cliques — encontre uma rota eficiente</option></select></div><div class="mode-note"><b>Como funciona:</b> navegue apenas pelos links internos de cada artigo. O servidor valida cada transição. As modalidades disponíveis nesta versão são solo e sem limite de tempo.</div><div class="form-actions"><span class="form-hint">Artigos carregados diretamente da Wikipédia em português.</span><button class="btn" type="submit">Começar corrida &nbsp;→</button></div></form></section><section class="panel"><div class="panel-head"><h2>Suas últimas rotas</h2><small>${state.history.length} registradas</small></div>${gameRows()}</section>`;
  navShell('Jogar', content); wireSearch();
}
function wireSearch() {
  document.querySelectorAll('#game-form input').forEach(input => input.addEventListener('input', () => {
    clearTimeout(state.searchTimer); const box = input.parentElement.querySelector('.search-results');
    const q = input.value.trim(); if (q.length < 2) { box.hidden = true; return; }
    state.searchTimer = setTimeout(async () => {
      try { const { results } = await api(`/api/articles/search?q=${encodeURIComponent(q)}`); box.innerHTML = results.map(item => `<button type="button" class="search-option" data-title="${esc(item.title)}"><b>${esc(item.title)}</b><small>${esc(item.snippet).slice(0, 100)}</small></button>`).join(''); box.hidden = !results.length; }
      catch { box.hidden = true; }
    }, 260);
  }));
}
function renderPlayMatch() {
  const { article, match } = state;
  if (!article || !match) return;
  const seconds = Math.max(0, Math.floor((Date.now() - match.startedAt) / 1000));
  const completed = match.status === 'completed';
  const content = `${completed ? `<div class="complete-banner"><h2>🏁 Chegada concluída!</h2><p>Você conectou os artigos e escreveu uma nova rota.</p></div>` : ''}<div class="page-head"><div><div class="eyebrow">${match.mode === 'least_clicks' ? 'MENOS CLIQUES' : 'SPEEDRUN'} · ${completed ? 'RESULTADO' : 'PARTIDA EM ANDAMENTO'}</div><h1>${completed ? 'Resultado da corrida' : 'Siga os links'}</h1><p>As transições são verificadas nos links deste artigo.</p></div>${!completed ? '<button class="btn ghost" data-action="abandon">Encerrar</button>' : '<button class="btn" data-page="play">Nova corrida</button>'}</div>${completed ? `<div class="game-card"><div class="result-grid"><div class="result-stat"><span>TEMPO</span><b>${fmtTime(match.seconds)}</b></div><div class="result-stat"><span>CLIQUES</span><b>${match.clicks}</b></div><div class="result-stat"><span>PONTOS</span><b>${Number(match.score).toLocaleString('pt-BR')}</b></div></div><div class="panel-head" style="margin:24px 0 13px"><h2>Rota percorrida</h2><small>${match.route.length} artigos</small></div><div class="route">${match.route.map((title,i)=>`<div class="route-step"><span class="step-num">${i+1}</span><span>${esc(title)}</span></div>`).join('')}</div></div>` : ''}<div class="play-layout"><article class="panel article-panel"><div class="article-cover">${article.thumbnail ? `<img src="${esc(article.thumbnail)}" alt="" referrerpolicy="no-referrer">` : '<span class="brand-mark">W</span>'}</div><div class="article-copy"><h2>${esc(article.title)}</h2><p>${esc(article.extract)}</p><a class="article-source" href="${esc(article.url)}" target="_blank" rel="noopener noreferrer">Ler artigo completo na Wikipédia ↗</a>${!completed ? `<div class="panel-head" style="margin:25px 0 8px"><h2>Continue por um link</h2><small>${article.links.length} opções</small></div><div class="field" style="margin-bottom:12px"><label for="link-filter">Filtrar links</label><input id="link-filter" type="search" placeholder="Digite parte do título" autocomplete="off"></div><div class="article-links" data-article-links>${article.links.map(link=>`<button class="link-chip" data-navigate="${esc(link.title)}">${esc(link.title)}</button>`).join('')}</div>` : ''}</div></article><aside class="game-side"><div class="timer-card"><div class="timer-label">Tempo de jogo</div><div class="timer" id="timer">${fmtTime(completed ? match.seconds : seconds)}</div><div class="timer-meta">${match.route.length-1} transições realizadas</div></div><section class="race-card"><h3>DESTINO</h3><div class="endpoint"><span class="dot"></span><div><small>Artigo final</small><b>${esc(match.target)}</b></div></div></section><section class="race-card"><h3>SUA ROTA <span style="color:#74869d;font-weight:400">(${match.route.length})</span></h3><div class="route">${match.route.map((title,i)=>`<div class="route-step"><span class="step-num">${i+1}</span><span>${esc(title)}</span></div>`).join('')}</div></section></aside></div>`;
  navShell('Partida', content);
  if (!completed) { clearInterval(state.timer); state.timer = setInterval(() => { const node = document.querySelector('#timer'); if (node) node.textContent = fmtTime((Date.now()-match.startedAt)/1000); }, 1000); }
}
function renderHistory() {
  const rows = state.history.length ? `<div class="history-wrap"><table class="history-table"><thead><tr><th>Partida</th><th>Modalidade</th><th>Data</th><th>Resultado</th></tr></thead><tbody>${state.history.map(g=>`<tr><td><b>${esc(g.start)} → ${esc(g.target)}</b><small>${g.route.map(esc).join(' → ')}</small></td><td>${g.mode==='least_clicks'?'Menos cliques':'Speedrun'}</td><td>${fmtDate(g.startedAt)}</td><td>${g.status==='completed'?`${fmtTime(g.durationSeconds)} · ${g.clicks} cliques`:'Em andamento'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Seu histórico ainda está vazio.<br>Complete uma corrida para guardar sua primeira rota.</div>';
  navShell('Histórico', `<div class="page-head"><div><div class="eyebrow">SEU PROGRESSO</div><h1>Histórico de partidas</h1><p>Revise suas rotas e resultados anteriores.</p></div></div><section class="panel">${rows}</section>`);
}
function renderProfile() {
  navShell('Perfil', `<div class="page-head"><div><div class="eyebrow">SUA CONTA</div><h1>Perfil</h1><p>Seus dados e estatísticas pessoais.</p></div><button class="btn ghost" data-action="logout">Sair da conta</button></div><section class="panel" style="max-width:650px"><div class="user-chip" style="padding:0 0 20px"><div class="avatar" style="width:52px;height:52px;font-size:18px">${esc(state.user.name.split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase())}</div><div class="user-meta"><b style="font-size:15px">${esc(state.user.name)}</b><span>${esc(state.user.email)}</span></div></div><div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">${statCard('Partidas concluídas',Number(state.stats?.completed||0),'Total de corridas finalizadas','✓')}${statCard('Pontos',Number(state.stats?.points||0).toLocaleString('pt-BR'),'Pontos acumulados','✦')}${statCard('Tempo médio',state.stats?.average_seconds?fmtTime(Number(state.stats.average_seconds)):'—','Entre partidas concluídas','◷')}${statCard('Melhor tempo',state.stats?.best_seconds?fmtTime(Number(state.stats.best_seconds)):'—','Recorde pessoal','↗')}</div></section>`);
}
function render() {
  if (!state.user) return renderAuth();
  if (state.match && state.page === 'match') return renderPlayMatch();
  if (state.page === 'play') return renderPlay();
  if (state.page === 'history') return renderHistory();
  if (state.page === 'profile') return renderProfile();
  renderHome();
}
function renderAuth(register = false, message = '') {
  app.innerHTML = `<div class="auth-layout"><section class="auth-visual"><div class="brand"><span class="brand-mark">W</span>WikiRace <em>beta</em></div><div class="visual-copy"><span class="eyebrow">O MUNDO É UM GRAFO</span><h1>Um destino.<br>Mil caminhos.</h1><p>Conecte ideias, descubra artigos e encontre sua própria rota pela Wikipédia.</p><div class="route-art"><i class="route-node"></i><i class="route-node"></i><i class="route-node"></i><i class="route-node"></i></div></div><div class="visual-foot">Feito para os curiosos. Inspirado pela Wikipédia.</div></section><section class="auth-panel"><div class="auth-card"><h2>${register ? 'Crie sua conta' : 'Bem-vindo de volta'}</h2><p>${register ? 'Sua próxima descoberta começa por aqui.' : 'Entre para continuar sua próxima jornada.'}</p>${message?`<div class="notice" role="alert">${esc(message)}</div><br>`:''}<form id="auth-form" class="form-stack">${register?'<div class="field"><label for="name">Como podemos chamar você?</label><input id="name" name="name" autocomplete="name" placeholder="Seu nome" minlength="2" maxlength="48" required></div>':''}<div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com" required></div><div class="field"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="${register?'new-password':'current-password'}" placeholder="${register?'Mínimo de 10 caracteres':'Sua senha'}" minlength="${register?'10':'1'}" required></div><button class="btn block" type="submit">${register?'Criar conta':'Entrar'} &nbsp;→</button></form><div class="auth-switch">${register?'Já tem uma conta?':'Ainda não tem conta?'} <button class="text-button" data-auth-toggle="${!register}">${register?'Entrar':'Criar conta'}</button></div><div style="margin-top:26px;color:#708198;font-size:10px;line-height:1.55;text-align:center">Ao continuar, seus dados de partida ficam salvos nesta instalação do WikiRace.</div></div></section></div>`;
}
async function refreshData() {
  const [{ user, stats }, { matches }] = await Promise.all([api('/api/me'), api('/api/matches')]);
  state.user = user; state.stats = stats; state.history = matches;
}
async function startMatch(form) {
  const data = Object.fromEntries(new FormData(form));
  const result = await api('/api/matches', { method: 'POST', body: JSON.stringify(data) });
  state.match = { ...result.match, id: result.id }; state.article = result.article; state.page = 'match'; state.started = state.match.startedAt;
  render();
}

app.addEventListener('click', async event => {
  const pageButton = event.target.closest('[data-page]');
  const toggle = event.target.closest('[data-auth-toggle]');
  const logout = event.target.closest('[data-action="logout"]');
  const option = event.target.closest('[data-title]');
  const navigateButton = event.target.closest('[data-navigate]');
  const actionButton = event.target.closest('[data-action]');
  if (toggle) return renderAuth(toggle.dataset.authToggle === 'true');
  if (option) { const input = option.closest('.search-wrap').querySelector('input'); input.value = option.dataset.title; option.closest('.search-results').hidden = true; return; }
  if (pageButton) { state.page = pageButton.dataset.page; state.match = null; clearInterval(state.timer); return render(); }
  if (logout) { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {} state.user = null; state.page='home'; state.match=null; return render(); }
  if (navigateButton && state.match) {
    navigateButton.disabled = true;
    try {
      const result = await api(`/api/matches/${state.match.id}/navigate`, { method: 'POST', body: JSON.stringify({ from: state.match.route.at(-1), to: navigateButton.dataset.navigate }) });
      state.match = { ...state.match, ...result.match }; state.article = result.article; await refreshData(); render();
    } catch (error) { toast(error.message, true); navigateButton.disabled=false; }
    return;
  }
  if (actionButton?.dataset.action === 'abandon') {
    if (state.match) await api(`/api/matches/${state.match.id}/abandon`, { method: 'POST', body: '{}' }).catch(()=>{});
    clearInterval(state.timer); state.match=null; state.page='history'; await refreshData(); return render();
  }
});
app.addEventListener('submit', async event => {
  if (event.target.id === 'auth-form') {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.target)); const register = Boolean(values.name); const button = event.target.querySelector('button[type=submit]'); button.disabled=true;
    try {
      const data = await api(`/api/auth/${register?'register':'login'}`, { method:'POST', body:JSON.stringify(values) });
      state.user=data.user; state.page='home'; await refreshData(); render();
    } catch(error) { renderAuth(register,error.message); } return;
  }
  if (event.target.id === 'game-form') {
    event.preventDefault(); const button=event.target.querySelector('button[type=submit]'); button.disabled=true;
    try { await startMatch(event.target); } catch(error) { toast(error.message,true); button.disabled=false; }
  }
});
app.addEventListener('input', event => {
  const box=event.target.closest('.search-wrap')?.querySelector('.search-results'); if(box && !event.target.value.trim()) box.hidden=true;
  if (event.target.id === 'link-filter') {
    const query = event.target.value.trim().toLocaleLowerCase('pt-BR');
    document.querySelectorAll('[data-article-links] [data-navigate]').forEach(button => { button.hidden = !button.dataset.navigate.toLocaleLowerCase('pt-BR').includes(query); });
  }
});
try { await refreshData(); if(!state.user) state.user=null; render(); } catch { renderAuth(); }

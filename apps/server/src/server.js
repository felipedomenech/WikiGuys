import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { createMatch, navigate, scoreMatch } from './game.js';
import { getArticle, searchArticles, WikipediaError } from './wikipedia.js';

const scrypt = promisify(scryptCallback);
const root = resolve(process.cwd());
const webRoot = resolve(root, 'apps/web');
const dbPath = resolve(root, process.env.DATABASE_PATH || '.data/wikirace.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode TEXT NOT NULL CHECK(mode IN ('speedrun','least_clicks')), start_title TEXT NOT NULL, target_title TEXT NOT NULL, current_title TEXT NOT NULL, route_json TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','completed','abandoned')), started_at INTEGER NOT NULL, finished_at INTEGER, clicks INTEGER, duration_seconds INTEGER, score INTEGER);
CREATE INDEX IF NOT EXISTS matches_user_date_idx ON matches(user_id, started_at DESC);`);

const json = (res, status, value, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
};
const fail = (res, status, message) => json(res, status, { error: message });
function cookie(name, value, options = {}) {
  const parts = [`${name}=${value}`, 'Path=/', 'SameSite=Strict', 'HttpOnly'];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}
function readCookie(req, name) {
  const pair = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : '';
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 16384) throw Object.assign(new Error('Requisição muito grande.'), { status: 413 }); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
async function currentUser(req) {
  const token = readCookie(req, 'wikirace_session');
  if (!token) return null;
  const tokenHash = (await scrypt(token, 'wikirace-session', 32)).toString('hex');
  const row = db.prepare('SELECT u.id,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash, Date.now());
  return row ? { id: row.id, email: row.email, name: row.display_name } : null;
}
async function issueSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = (await scrypt(token, 'wikirace-session', 32)).toString('hex');
  const hours = Math.min(720, Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168));
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(tokenHash, userId, Date.now() + hours * 3600000);
  return { token, maxAge: hours * 3600 };
}
function userStats(userId) {
  return db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
    COALESCE(AVG(CASE WHEN status='completed' THEN duration_seconds END),0) AS average_seconds,
    COALESCE(MIN(CASE WHEN status='completed' THEN duration_seconds END),0) AS best_seconds,
    COALESCE(SUM(CASE WHEN status='completed' THEN score ELSE 0 END),0) AS points
    FROM matches WHERE user_id=?`).get(userId);
}
const userAgent = process.env.WIKIMEDIA_USER_AGENT || 'WikiRace/0.1 (configure WIKIMEDIA_USER_AGENT)';

async function api(req, res, url) {
  const method = req.method;
  const path = url.pathname;
  const payload = ['POST', 'PATCH', 'PUT'].includes(method) ? await body(req) : {};

  if (path === '/api/auth/register' && method === 'POST') {
    const email = String(payload.email || '').trim().toLowerCase();
    const name = String(payload.name || '').trim();
    const password = String(payload.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(res, 400, 'Informe um e-mail válido.');
    if (name.length < 2 || name.length > 48) return fail(res, 400, 'O nome deve ter de 2 a 48 caracteres.');
    if (password.length < 10 || password.length > 128) return fail(res, 400, 'A senha deve ter de 10 a 128 caracteres.');
    const id = randomUUID();
    const salt = randomBytes(16).toString('hex');
    const digest = (await scrypt(password, salt, 64)).toString('hex');
    try { db.prepare('INSERT INTO users(id,email,display_name,password_hash) VALUES(?,?,?,?)').run(id, email, name, `${salt}:${digest}`); }
    catch (error) { if (String(error.message).includes('UNIQUE')) return fail(res, 409, 'Já existe uma conta com este e-mail.'); throw error; }
    const session = await issueSession(id);
    return json(res, 201, { user: { id, email, name } }, { 'Set-Cookie': cookie('wikirace_session', session.token, { maxAge: session.maxAge }) });
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!row) return fail(res, 401, 'E-mail ou senha incorretos.');
    const [salt, savedHash] = row.password_hash.split(':');
    const candidate = await scrypt(password, salt, 64);
    if (!timingSafeEqual(candidate, Buffer.from(savedHash, 'hex'))) return fail(res, 401, 'E-mail ou senha incorretos.');
    const session = await issueSession(row.id);
    return json(res, 200, { user: { id: row.id, email: row.email, name: row.display_name } }, { 'Set-Cookie': cookie('wikirace_session', session.token, { maxAge: session.maxAge }) });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const token = readCookie(req, 'wikirace_session');
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run((await scrypt(token, 'wikirace-session', 32)).toString('hex'));
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('wikirace_session', '', { maxAge: 0 }) });
  }

  const user = await currentUser(req);
  if (path === '/api/me' && method === 'GET') return json(res, 200, { user, stats: user ? userStats(user.id) : null });
  if (path.startsWith('/api/') && path !== '/api/articles/search' && path !== '/api/articles') {
    if (!user) return fail(res, 401, 'Entre na sua conta para continuar.');
  }

  if (path === '/api/articles/search' && method === 'GET') {
    try { return json(res, 200, { results: await searchArticles(url.searchParams.get('q'), { userAgent }) }); }
    catch (error) { return fail(res, error.status || 502, error.message || 'Erro ao buscar artigos.'); }
  }
  if (path === '/api/articles' && method === 'GET') {
    try { return json(res, 200, { article: await getArticle(url.searchParams.get('title'), { userAgent }) }); }
    catch (error) { return fail(res, error.status || 502, error.message || 'Erro ao carregar artigo.'); }
  }

  if (path === '/api/matches' && method === 'POST') {
    const match = createMatch({ start: payload.start, target: payload.target, mode: payload.mode });
    const [article, destination] = await Promise.all([
      getArticle(match.start, { userAgent }),
      getArticle(match.target, { userAgent }),
    ]);
    match.route[0] = article.title;
    match.start = article.title;
    match.target = destination.title;
    if (match.start.toLocaleLowerCase('pt-BR') === match.target.toLocaleLowerCase('pt-BR')) {
      return fail(res, 400, 'Os artigos de início e destino devem ser diferentes.');
    }
    const id = randomUUID();
    db.prepare('INSERT INTO matches(id,user_id,mode,start_title,target_title,current_title,route_json,status,started_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(id, user.id, match.mode, match.start, match.target, match.start, JSON.stringify(match.route), 'active', match.startedAt);
    return json(res, 201, { id, match, article });
  }

  const matchMatch = path.match(/^\/api\/matches\/([0-9a-f-]+)(?:\/(navigate|abandon))?$/i);
  if (matchMatch) {
    const [, id, action] = matchMatch;
    const row = db.prepare('SELECT * FROM matches WHERE id=? AND user_id=?').get(id, user.id);
    if (!row) return fail(res, 404, 'Partida não encontrada.');
    if (!action && method === 'GET') return json(res, 200, { match: { id: row.id, mode: row.mode, start: row.start_title, target: row.target_title, current: row.current_title, route: JSON.parse(row.route_json), status: row.status, startedAt: row.started_at, finishedAt: row.finished_at, clicks: row.clicks, durationSeconds: row.duration_seconds, score: row.score } });
    if (action === 'navigate' && method === 'POST') {
      const route = JSON.parse(row.route_json);
      const match = { start: row.start_title, target: row.target_title, mode: row.mode, startedAt: row.started_at, route, status: row.status };
      const fromArticle = await getArticle(row.current_title, { userAgent });
      const allowedTitles = new Set(fromArticle.links.map(link => link.title.toLocaleLowerCase('pt-BR')));
      const updated = navigate(match, payload.from, payload.to, { allowedTitles });
      const canonicalTitle = updated.route.at(-1);
      const article = await getArticle(canonicalTitle, { userAgent });
      updated.route[updated.route.length - 1] = article.title;
      const result = updated.status === 'completed' ? scoreMatch({ ...updated, finishedAt: updated.finishedAt }) : null;
      db.prepare(`UPDATE matches SET current_title=?,route_json=?,status=?,finished_at=?,clicks=?,duration_seconds=?,score=? WHERE id=? AND user_id=? AND status='active'`)
        .run(article.title, JSON.stringify(updated.route), updated.status, updated.finishedAt ?? null, result?.clicks ?? null, result?.seconds ?? null, result?.score ?? null, id, user.id);
      return json(res, 200, { match: { route: updated.route, current: article.title, target: updated.target, status: updated.status, ...result }, article });
    }
    if (action === 'abandon' && method === 'POST') {
      db.prepare("UPDATE matches SET status='abandoned',finished_at=? WHERE id=? AND user_id=? AND status='active'").run(Date.now(), id, user.id);
      return json(res, 200, { ok: true });
    }
  }

  if (path === '/api/matches' && method === 'GET') {
    const rows = db.prepare('SELECT id,mode,start_title,target_title,status,started_at,finished_at,clicks,duration_seconds,score,route_json FROM matches WHERE user_id=? ORDER BY started_at DESC LIMIT 30').all(user.id);
    return json(res, 200, { matches: rows.map(row => ({ id: row.id, mode: row.mode, start: row.start_title, target: row.target_title, status: row.status, startedAt: row.started_at, finishedAt: row.finished_at, clicks: row.clicks, durationSeconds: row.duration_seconds, score: row.score, route: JSON.parse(row.route_json) })) });
  }
  return fail(res, 404, 'Rota não encontrada.');
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/healthz' && req.method === 'GET') {
      db.prepare('SELECT 1').get();
      return json(res, 200, { status: 'ok' });
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Método não permitido.');
    const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const filePath = resolve(webRoot, `.${requested}`);
    if (filePath !== webRoot && !filePath.startsWith(`${webRoot}${sep}`)) return fail(res, 403, 'Acesso negado.');
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; img-src 'self' https://upload.wikimedia.org data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    if (status === 500) console.error('Request failed:', error.message);
    fail(res, status, status === 500 ? 'Erro interno. Tente novamente.' : error.message);
  }
});

server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => {
  console.log(`WikiRace disponível na porta ${process.env.PORT || 3000}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); db.close(); });

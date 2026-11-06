export const MODES = Object.freeze({ speedrun: 'Speedrun', least_clicks: 'Menos cliques' });

export class GameRuleError extends Error {
  constructor(message) { super(message); this.name = 'GameRuleError'; this.status = 400; }
}

export function normalizeTitle(title) {
  return decodeURIComponent(String(title ?? '').replaceAll('_', ' ')).trim().replace(/\s+/g, ' ');
}

export function createMatch({ start, target, mode = 'speedrun', now = Date.now() }) {
  const origin = normalizeTitle(start);
  const destination = normalizeTitle(target);
  if (!origin || !destination || origin.toLocaleLowerCase('pt-BR') === destination.toLocaleLowerCase('pt-BR')) {
    throw new GameRuleError('Escolha artigos de início e destino diferentes.');
  }
  if (!Object.hasOwn(MODES, mode)) throw new GameRuleError('Modalidade não disponível.');
  return { start: origin, target: destination, mode, startedAt: now, route: [origin], status: 'active' };
}

export function navigate(match, from, to, { now = Date.now(), allowedTitles } = {}) {
  if (match.status !== 'active') throw new GameRuleError('Esta partida já foi encerrada.');
  if (normalizeTitle(from).toLocaleLowerCase('pt-BR') !== match.route.at(-1).toLocaleLowerCase('pt-BR')) {
    throw new GameRuleError('O artigo de origem não corresponde ao estado atual da partida.');
  }
  const destination = normalizeTitle(to);
  if (!destination || destination.length > 250) throw new GameRuleError('Título de artigo inválido.');
  if (allowedTitles && !allowedTitles.has(destination.toLocaleLowerCase('pt-BR'))) {
    throw new GameRuleError('Esse link não existe no artigo atual.');
  }
  match.route.push(destination);
  if (destination.toLocaleLowerCase('pt-BR') === match.target.toLocaleLowerCase('pt-BR')) {
    match.status = 'completed';
    match.finishedAt = now;
  }
  return match;
}

export function scoreMatch(match) {
  const clicks = Math.max(0, match.route.length - 1);
  const seconds = Math.max(0, Math.floor(((match.finishedAt ?? Date.now()) - match.startedAt) / 1000));
  return { clicks, seconds, score: match.mode === 'least_clicks' ? Math.max(0, 1000 - clicks * 100) : Math.max(0, 1000 - seconds) };
}

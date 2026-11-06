import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, GameRuleError, navigate, normalizeTitle, scoreMatch } from '../apps/server/src/game.js';

test('normaliza títulos vindos de links da Wikipédia', () => {
  assert.equal(normalizeTitle('Rio_de_Janeiro'), 'Rio de Janeiro');
});

test('recusa origem e destino iguais e modos sem regras', () => {
  assert.throws(() => createMatch({ start: 'Brasil', target: 'Brasil' }), GameRuleError);
  assert.throws(() => createMatch({ start: 'Brasil', target: 'Chile', mode: 'semantic' }), GameRuleError);
});

test('registra uma rota e finaliza ao chegar ao destino', () => {
  const match = createMatch({ start: 'Brasil', target: 'Chile', now: 1000 });
  navigate(match, 'Brasil', 'Argentina', { now: 3000, allowedTitles: new Set(['argentina']) });
  navigate(match, 'Argentina', 'Chile', { now: 6000, allowedTitles: new Set(['chile']) });
  assert.equal(match.status, 'completed');
  assert.deepEqual(match.route, ['Brasil', 'Argentina', 'Chile']);
  assert.deepEqual(scoreMatch(match), { clicks: 2, seconds: 5, score: 995 });
});

test('não permite navegação para link que não veio do artigo atual', () => {
  const match = createMatch({ start: 'Brasil', target: 'Chile' });
  assert.throws(() => navigate(match, 'Brasil', 'Chile', { allowedTitles: new Set(['argentina']) }), error => error instanceof GameRuleError && error.status === 400 && /não existe/.test(error.message));
  assert.throws(() => navigate(match, 'Argentina', 'Chile', { allowedTitles: new Set(['chile']) }), error => error instanceof GameRuleError && error.status === 400 && /origem/.test(error.message));
});

test('não permite alterar uma partida encerrada', () => {
  const match = createMatch({ start: 'Brasil', target: 'Chile', now: 0 });
  navigate(match, 'Brasil', 'Chile', { now: 1000, allowedTitles: new Set(['chile']) });
  assert.throws(() => navigate(match, 'Chile', 'Brasil', { allowedTitles: new Set(['brasil']) }), error => error instanceof GameRuleError && error.status === 400 && /encerrada/.test(error.message));
});

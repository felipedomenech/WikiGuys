import test from 'node:test';
import assert from 'node:assert/strict';
import { getArticle, searchArticles, WikipediaError } from '../apps/server/src/wikipedia.js';

test('carrega artigo e links usando a API da Wikipédia', async () => {
  const fakeFetch = async (url) => {
    assert.match(String(url), /pt\.wikipedia\.org\/w\/api\.php/);
    return Response.json({ query: { pages: [{ title: 'São Paulo', extract: 'Cidade brasileira.', thumbnail: { source: 'https://upload.wikimedia.org/example.jpg' }, links: [{ title: 'Brasil' }] }] } });
  };
  const article = await getArticle('Sao Paulo', { fetchImpl: fakeFetch });
  assert.equal(article.title, 'São Paulo');
  assert.equal(article.links[0].title, 'Brasil');
  assert.match(article.url, /wikipedia\.org\/wiki/);
});

test('retorna erro claro para artigo ausente', async () => {
  await assert.rejects(() => getArticle('inexistente', { fetchImpl: async () => Response.json({ query: { pages: [{ missing: true }] } }) }), error => error instanceof WikipediaError && error.status === 404);
});

test('busca páginas e remove marcação HTML do trecho', async () => {
  const result = await searchArticles('sistema solar', { fetchImpl: async () => Response.json({ query: { search: [{ title: 'Sistema Solar', snippet: '<span>Conjunto de planetas</span>' }] } }) });
  assert.deepEqual(result, [{ title: 'Sistema Solar', snippet: 'Conjunto de planetas' }]);
});

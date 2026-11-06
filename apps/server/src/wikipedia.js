const API = 'https://pt.wikipedia.org/w/api.php';

export class WikipediaError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function titleKey(title) { return title.replaceAll(' ', '_').toLocaleLowerCase('pt-BR'); }

export async function getArticle(title, { fetchImpl = fetch, userAgent = 'WikiRace/0.1 (configure WIKIMEDIA_USER_AGENT)' } = {}) {
  const normalized = String(title ?? '').replaceAll('_', ' ').trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > 250) throw new WikipediaError('Informe um título de artigo válido.', 400);
  const url = new URL(API);
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', prop: 'extracts|pageimages|links', exintro: '1', explaintext: '1', piprop: 'thumbnail', pithumbsize: '640', plnamespace: '0', pllimit: 'max', redirects: '1', titles: normalized })) url.searchParams.set(key, value);
  const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, 'Api-User-Agent': userAgent, 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new WikipediaError(`A Wikipédia respondeu com erro (${response.status}).`);
  const data = await response.json();
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) throw new WikipediaError('Artigo não encontrado na Wikipédia.', 404);
  const links = (page.links ?? []).map(item => ({ title: item.title, key: titleKey(item.title) }));
  return { title: page.title, extract: page.extract || 'Este artigo ainda não tem uma introdução disponível.', thumbnail: page.thumbnail?.source ?? null, url: `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`, links };
}

export async function searchArticles(query, { fetchImpl = fetch, userAgent = 'WikiRace/0.1' } = {}) {
  const search = String(query ?? '').trim();
  if (search.length < 2 || search.length > 100) throw new WikipediaError('Digite pelo menos 2 caracteres.', 400);
  const url = new URL(API);
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', list: 'search', srnamespace: '0', srlimit: '8', srsearch: search })) url.searchParams.set(key, value);
  const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, 'Api-User-Agent': userAgent }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new WikipediaError('Não foi possível buscar artigos agora.');
  const data = await response.json();
  return (data?.query?.search ?? []).map(item => ({ title: item.title, snippet: item.snippet.replace(/<[^>]+>/g, '') }));
}

# API REST (v0 local)

JSON em UTF-8. Sessão autenticada por cookie HttpOnly `wikirace_session`; respostas de erro usam `{ "error": "mensagem" }`. A API não tem versionamento público ainda.

| Método e rota | Acesso | Uso |
|---|---|---|
| POST `/api/auth/register` | público | `{name,email,password}`; cria conta e sessão |
| POST `/api/auth/login` | público | `{email,password}`; inicia sessão |
| POST `/api/auth/logout` | sessão | encerra sessão atual |
| GET `/api/me` | público | usuário e estatísticas (nulos sem sessão) |
| GET `/api/articles/search?q=` | público | busca de títulos na Wikipédia |
| GET `/api/articles?title=` | público | resumo, imagem e links do artigo |
| POST `/api/matches` | sessão | `{start,target,mode}` inicia partida |
| GET `/api/matches` | sessão | até 30 partidas recentes |
| GET `/api/matches/:id` | proprietário | estado atual da partida |
| POST `/api/matches/:id/navigate` | proprietário | `{from,to}` tenta transição verificada |
| POST `/api/matches/:id/abandon` | proprietário | encerra sem pontuação |

Erros usuais: 400 entrada/regra inválida; 401 sessão necessária; 404 artigo/partida ausente; 409 e-mail duplicado; 502 indisponibilidade Wikimedia. A posse da partida é aplicada em consultas e atualizações. Idempotência para pedidos de transição ainda não existe; adicione uma chave de idempotência antes de expor a API a clientes com reconexão.

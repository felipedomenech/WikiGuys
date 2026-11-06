# WikiRace

WikiRace é uma plataforma em português para corridas solo entre artigos da Wikipédia. A primeira entrega funcional oferece cadastro e login locais, partidas Speedrun e Menos cliques, busca de artigos, navegação por links internos validada no servidor, resultados, histórico e estatísticas básicas.

## Requisitos

- Node.js 22.13 ou superior. Node 24 é recomendado. O armazenamento usa `node:sqlite`, incluído no Node atual e ainda marcado como experimental pelo Node.
- Conexão à internet para pesquisar e carregar artigos da Wikipédia em português.

Não há dependências npm externas nesta entrega.

## Executar localmente

```powershell
Copy-Item .env.example .env
npm start
```

Abra http://127.0.0.1:3000. O banco é criado automaticamente em `.data/wikirace.sqlite`. Para desenvolvimento com reinício automático, use `npm run dev`.

Configure `WIKIMEDIA_USER_AGENT` com um identificador e contato válidos antes de disponibilizar o serviço. `HOST`, `PORT`, `DATABASE_PATH` e `SESSION_TTL_HOURS` são documentados em `.env.example`.

## Publicar no Railway

1. Envie este repositório ao GitHub e conecte-o como serviço no Railway (o `Dockerfile` é detectado automaticamente).
2. Anexe um volume ao serviço com o caminho `/app/.data`; o banco precisa ficar nesse volume para persistir entre implantações.
3. Configure `WIKIMEDIA_USER_AGENT` com um contato real. `HOST`, `DATABASE_PATH` e `NODE_ENV` já têm valores apropriados na imagem; o Railway fornece `PORT`.
4. Configure o healthcheck do serviço como `/healthz`, gere um domínio público e teste cadastro e partida.

Use uma única instância enquanto o SQLite for o banco. Para vários processos/instâncias, migre para PostgreSQL antes de escalar. A configuração de produção e as limitações de segurança estão detalhadas em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) e [docs/SECURITY.md](docs/SECURITY.md).

## Verificações

```powershell
npm test
npm run check
```

Os testes cobrem regras do motor e a integração Wikimedia com respostas de rede simuladas. Eles não substituem um teste de ponta a ponta com a Wikipédia real.

## O que está implementado

- Conta local com senha derivada via scrypt, cookie HttpOnly, SameSite Strict e sessão persistida.
- Armazenamento SQLite local com chaves estrangeiras e histórico persistente.
- Modalidades Speedrun e Menos cliques em partidas solo sem limite de tempo.
- Busca e leitura de artigos via API da Wikipédia em português.
- Transições validadas no backend contra os links do artigo atual; rota e pontuação são armazenadas no servidor.
- Dashboard, perfil, resultados, rotas e histórico responsivos.
- PWA instalável com cache do shell; partidas e conteúdo Wikimedia ainda requerem rede.

## Limites atuais

Esta é uma fundação funcional, ainda não a plataforma completa do prompt mestre. Não foram implementados Supabase Auth, PostgreSQL, NestJS, Next.js, Capacitor, PvP, salas/WebSockets, torneios, desafios, amigos, chat, temporadas, classificação competitiva, Semântica, observabilidade externa, moderação ou deploy. Não há recuperação/verificação de e-mail nem exclusão de conta na interface. O cadastro local não deve ser usado para uma implantação pública antes de completar controles operacionais e privacidade.

Veja [docs/ROADMAP.md](docs/ROADMAP.md) para o estado e próximos passos. Nenhum deploy foi feito.

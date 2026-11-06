# Execução e implantação

Uso local: configure `.env` a partir de `.env.example` e execute `npm start`. O servidor escuta na porta `3000` por padrão; DB local fica em `.data`. `GET /healthz` verifica que HTTP e SQLite respondem.

## Railway (Docker)

O `Dockerfile` empacota o servidor Node e serve a interface no mesmo processo. Conecte o repositório como serviço e use o volume montado em `/app/.data`; a imagem aponta `DATABASE_PATH` para esse diretório. Adicione a variável `WIKIMEDIA_USER_AGENT`, configure `/healthz` como healthcheck e gere um domínio público. O Railway fornece a porta via `PORT`; o container escuta em `0.0.0.0`.

Mantenha uma instância enquanto o banco for SQLite. O volume precisa permanecer anexado ao mesmo serviço nas implantações. Para escalar horizontalmente migre para PostgreSQL compartilhado e implemente coordenação do estado de partidas.

Não implante publicamente esta versão antes de completar os controles listados em `SECURITY.md`. Há Docker para esta implantação inicial, mas ainda não existem CI, migrations ou configuração de produção para Vercel/Supabase. Nenhum deploy foi feito.

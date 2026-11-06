# Persistência

SQLite local é criado automaticamente. Tabelas: `users` (e-mail único sem diferenciar maiúsculas), `sessions` (hash do token, expiração e cascata por usuário) e `matches` (modo, rota JSON, estado e resultado). Chaves estrangeiras e índices de sessão/usuário/data estão ativos.

Não há migrações versionadas, políticas de retenção, exclusão de conta, PostgreSQL/Supabase ou RLS nesta versão. Para implantação distribuída, substituir o armazenamento por PostgreSQL, criar migrations revisáveis, transações para navegação concorrente e política de retenção antes de migrar dados.

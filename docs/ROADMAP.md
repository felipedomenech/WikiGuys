# Roadmap e estado real

## Entregue nesta etapa

- [x] Base executável em Node, interface responsiva, PWA instalável e SQLite local.
- [x] Cadastro/login local e sessões persistentes.
- [x] Busca Wikimedia, partidas solo Speedrun/Menos cliques e links validados pelo servidor.
- [x] Resultado, rota, histórico, dashboard, estatísticas e testes unitários.

## Próximas etapas

1. Paginar continuations Wikimedia, cachear com TTL, revisar acessibilidade e conduzir teste browser real.
2. Adicionar rate limiting, CSRF/Origin, recuperação/verificação, exclusão/exportação de conta e revisão de privacidade.
3. Migrar para monorepo TypeScript com PostgreSQL/Supabase Auth, migrations, OpenAPI e configuração segura de ambientes.
4. Estabelecer testes API e Playwright com infraestrutura reproduzível; adicionar logs/métricas.
5. Implementar multiplayer autoritativo com salas e reconexão, após definir consistência e hospedagem persistente.
6. Progressão/rankings, desafios e torneios com regras verificáveis.
7. PWA e Capacitor; validar em dispositivos e preparar distribuição.

Semântica permanece experimental até metodologia e avaliação justificadas. Itens planejados não estão expostos como funcionalidades ativas.

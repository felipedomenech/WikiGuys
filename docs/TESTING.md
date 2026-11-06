# Testes e qualidade

`npm test` executa testes nativos de Node para regras do motor e parsing/integração Wikimedia com fetch controlado. `npm run check` verifica sintaxe JS dos módulos principais.

Vitest, Supertest, Playwright, testes de WebSocket, k6, lint/typecheck, medições reais e metas de disponibilidade/latência não estão configurados. Os testes unitários não comprovam funcionamento com a rede Wikimedia.

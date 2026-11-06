# Motor de partidas

`apps/server/src/game.js` tem funções de domínio sem dependência de UI ou banco: normalização de títulos, criação de partida, validação/transição e pontuação. A API carrega o artigo atual e passa ao motor o conjunto de links válidos. O estado final é persistido no servidor. Testes unitários exercitam rotas, origem, encerramento e regras de modo.

A proteção verifica as transições registradas; não impede ferramentas externas nem comprova o que uma pessoa leu fora do site.

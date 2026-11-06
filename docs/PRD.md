# PRD — WikiRace

## Visão

Uma plataforma brasileira para transformar a navegação entre artigos da Wikipédia em desafios verificáveis. O primeiro corte executável atende a uma pessoa por partida e guarda seus resultados localmente.

## Usuário e fluxo entregue

1. Cria conta local e entra.
2. Escolhe Speedrun ou Menos cliques.
3. Pesquisa os artigos inicial e final na Wikipédia em português.
4. Inicia uma partida e segue links internos.
5. O backend confirma cada link, registra rota e conclui ao alcançar o destino.
6. Consulta pontuação, estatísticas e histórico.

## Critérios desta versão

As transições aceitas devem pertencer aos links do artigo atual conforme a API Wikimedia; partidas e contas sobrevivem a reinícios locais. O cliente não define os cliques nem o resultado.

## Fora do escopo implementado

Autenticação hospedada, social, partidas competitivas multiplayer, torneios, classificação global, conteúdo semântico e publicação. Esses itens estão no roadmap e não são apresentados na UI como se estivessem ativos.

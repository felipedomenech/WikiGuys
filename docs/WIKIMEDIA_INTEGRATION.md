# Integração Wikimedia

O serviço usa a MediaWiki Action API de `pt.wikipedia.org` com busca (`list=search`) e leitura (`query`, `extracts`, `pageimages`, `links`). A interface identifica o destino original e oferece link para o artigo completo. O texto é mostrado como texto simples escapado, sem executar marcação recebida.

Defina `WIKIMEDIA_USER_AGENT` com nome do aplicativo e contato operacional. Respeite limites e termos Wikimedia; erros e timeout de 12 segundos são apresentados ao usuário. A API retorna no máximo os links da resposta inicial (`pllimit=max`); paginação de continuations, cache, atribuição/licença detalhada e teste de carga estão pendentes. O serviço pode ficar indisponível ou limitar requisições.

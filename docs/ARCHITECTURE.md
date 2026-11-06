# Arquitetura atual

A versão inicial é um monólito Node.js sem dependências externas: `apps/server` atende API REST e arquivos estáticos; `apps/web` contém interface HTML/CSS/JavaScript; `game.js` guarda regras puras; `wikipedia.js` concentra a integração externa; SQLite persiste usuários, sessões e partidas.

O frontend envia somente origem/destino/modo e o link selecionado. O servidor carrega os links do artigo vigente, valida a ação, busca o artigo resultante e persiste estado/resultado. Senhas são derivadas com scrypt; cookies são HttpOnly e SameSite Strict. Em produção, `Secure` é adicionado.

## Decisões

- SQLite nativo mantém o protótipo executável sem instalar dependências. `node:sqlite` é experimental no runtime atual; para serviço multi-instância, migrar para PostgreSQL e migrations versionadas.
- REST síncrona reduz dependências no primeiro corte. PvP exigirá estado autoritativo compartilhado e WebSockets autenticados.
- Semântica, ranking global e partidas com adversários foram omitidos até que existam regras/infraestrutura verificáveis.
- O app é responsivo no navegador e oferece instalação PWA com cache do shell estático; API e artigos ainda exigem rede. Não há wrapper Capacitor.

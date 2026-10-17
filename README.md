# Pokédex

## Autor
joão Humberto Resende do Nascimento — Matrícula 22606172

## Descrição
Aplicação web para pesquisar qualquer Pokémon por nome ou número e consultar seus dados, sua linha de evolução (incluindo Mega Evoluções e outras formas especiais) e curiosidades da Pokédex. Útil para fãs e jogadores que querem consultar informações rápidas.

## API utilizada
- **PokeAPI** — https://pokeapi.co/docs/v2
- Endpoints consumidos:
  - `GET /pokemon/{nome ou id}` — dados básicos, imagens, tipos, atributos
  - `GET /pokemon-species/{id}` — curiosidades, categoria, habitat, formas (megas)
  - `GET /evolution-chain/{id}` — linha evolutiva
  - `GET /pokemon?limit=1025` — lista de nomes para o autocompletar

## Funcionalidades
- Buscar um Pokémon por nome ou número, com autocompletar
- Sortear um Pokémon aleatório e navegar para o anterior/próximo
- Aba **Visão geral**: altura, peso, habilidades e atributos em barras animadas
- Aba **Evoluções e Megas**: linha evolutiva (com condição de evolução) e formas Mega, Primal e Gigantamax; clique em qualquer uma para abri-la
- Aba **Curiosidades**: textos da Pokédex de vários jogos (com botão "Outra curiosidade"), habitat, geração, taxa de captura e mais
- Ver a versão brilhante (shiny) e ouvir o grito do Pokémon
- Histórico de pesquisas recentes e links compartilháveis (ex.: `#pikachu`)
- Mensagens amigáveis para busca sem resultado ou API fora do ar

## Como executar localmente
1. Clone: `git clone https://github.com/joaorisende-design/bootcamp2-app.git`
2. Abra o arquivo `index.html` no navegador

## Links
- **Aplicação no ar (GitHub Pages):** https://joaorisende-design.github.io/bootcamp2-app/
- **Repositório:** https://github.com/joaorisende-design/bootcamp2-app

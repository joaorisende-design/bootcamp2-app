const API = "https://pokeapi.co/api/v2/";
const ARTE = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const TOTAL_POKEMON = 1025;

const form = document.getElementById("form-busca");
const campo = document.getElementById("campo-busca");
const botaoAleatorio = document.getElementById("botao-aleatorio");
const area = document.getElementById("resultado");
const caixaHistorico = document.getElementById("historico");
const listaNomes = document.getElementById("lista-nomes");

/* ---------- tabelas de tradução ---------- */
const CORES_TIPO = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
  grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
  ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
  rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
  steel: "#B7B7CE", fairy: "#D685AD"
};
const NOMES_TIPO = {
  normal: "normal", fire: "fogo", water: "água", electric: "elétrico",
  grass: "planta", ice: "gelo", fighting: "lutador", poison: "venenoso",
  ground: "terrestre", flying: "voador", psychic: "psíquico", bug: "inseto",
  rock: "pedra", ghost: "fantasma", dragon: "dragão", dark: "sombrio",
  steel: "aço", fairy: "fada"
};
const NOMES_STATS = {
  hp: "HP", attack: "Ataque", defense: "Defesa",
  "special-attack": "Ataque esp.", "special-defense": "Defesa esp.", speed: "Velocidade"
};
const HABITATS = {
  cave: "caverna", forest: "floresta", grassland: "campo", mountain: "montanha",
  rare: "raro", "rough-terrain": "terreno acidentado", sea: "mar",
  urban: "urbano", "waters-edge": "beira d'água"
};
const CORES_POKEDEX = {
  black: "preto", blue: "azul", brown: "marrom", gray: "cinza", green: "verde",
  pink: "rosa", purple: "roxo", red: "vermelho", white: "branco", yellow: "amarelo"
};
const GRUPOS_OVO = {
  monster: "monstro", water1: "água 1", water2: "água 2", water3: "água 3",
  bug: "inseto", flying: "voador", ground: "campo", fairy: "fada", plant: "planta",
  humanshape: "humanoide", mineral: "mineral", indeterminate: "indeterminado",
  ditto: "ditto", dragon: "dragão", "no-eggs": "não bota ovos"
};

/* ---------- estado ---------- */
let token = 0;            // evita que uma resposta antiga sobrescreva a mais nova
let pokemonAtual = null;  // nome do Pokémon exibido
let idEspecieAtual = 0;
let abaAtual = "geral";
let arteNormal = "", arteBrilho = "";
let gritoAudio = null, gritoUrl = "";
let entradas = [], idxEntrada = 0;
let historico = [];

/* ---------- utilidades ---------- */
async function getJSON(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    const erro = new Error("HTTP " + resposta.status);
    erro.status = resposta.status;
    throw erro;
  }
  return resposta.json();
}

const idDaUrl = (url) => Number(url.split("/").filter(Boolean).pop());
const limparTexto = (t) => t.replace(/[\n\f\u00ad]/g, " ").replace(/\s+/g, " ").trim();
const bonito = (nome) => nome.replace(/-/g, " ");

function escolherIdioma(lista) {
  for (const idioma of ["pt-BR", "pt", "en"]) {
    const itens = lista.filter((i) => i.language.name === idioma);
    if (itens.length) return { idioma, itens };
  }
  return { idioma: null, itens: [] };
}

function mostrarErro(mensagem) {
  area.innerHTML = "";
  const p = document.createElement("p");
  p.className = "erro";
  p.textContent = mensagem; // textContent: o texto digitado nunca vira HTML
  area.appendChild(p);
}

function erroPainel(id, mensagem) {
  const painel = document.getElementById(id);
  if (painel) painel.innerHTML = `<p class="erro">${mensagem || "Não foi possível carregar estas informações agora. Tente de novo em instantes."}</p>`;
}

/* ---------- carregar um Pokémon ---------- */
async function carregar(termoBruto) {
  const termo = String(termoBruto).toLowerCase().trim().replace(/\s+/g, "-");
  if (!termo) return;

  const meu = ++token;
  pararGrito();
  area.innerHTML = '<p class="aviso carregando"><span class="spinner" aria-hidden="true"></span>Carregando...</p>';

  let dados;
  try {
    try {
      dados = await getJSON(API + "pokemon/" + encodeURIComponent(termo));
    } catch (erro) {
      if (erro.status !== 404) throw erro;
      // alguns nomes de espécie (ex.: deoxys) não são nomes de forma: tenta pela espécie
      const especie = await getJSON(API + "pokemon-species/" + encodeURIComponent(termo));
      dados = await getJSON(API + "pokemon/" + especie.id);
    }
  } catch (erro) {
    if (meu !== token) return;
    if (erro.status === 404) {
      mostrarErro(`Nenhum Pokémon encontrado para "${String(termoBruto).trim()}". Confira o nome ou tente um número de 1 a ${TOTAL_POKEMON}.`);
    } else {
      console.error(erro);
      mostrarErro("Não foi possível consultar a PokeAPI agora. Verifique sua conexão e tente de novo em instantes.");
    }
    return;
  }
  if (meu !== token) return;

  pokemonAtual = dados.name;
  campo.value = dados.name;
  desenharCartao(dados);
  registrarHistorico(dados.name);
  if (decodeURIComponent(location.hash.slice(1)) !== dados.name) location.hash = dados.name;
  area.querySelector(".cartao").scrollIntoView({ block: "nearest" });

  // dados extras (curiosidades e evoluções) chegam depois, sem travar a tela
  let especie;
  try {
    especie = await getJSON(dados.species.url);
    if (meu !== token) return;
    desenharCuriosidades(especie);
  } catch (erro) {
    if (meu !== token) return;
    console.error(erro);
    erroPainel("painel-curiosidades");
    erroPainel("painel-evolucoes");
    return;
  }

  try {
    const cadeia = especie.evolution_chain ? await getJSON(especie.evolution_chain.url) : null;
    if (meu !== token) return;
    desenharEvolucoes(especie, cadeia);
  } catch (erro) {
    if (meu !== token) return;
    console.error(erro);
    erroPainel("painel-evolucoes");
  }
}

/* ---------- cartão principal ---------- */
function desenharCartao(d) {
  idEspecieAtual = idDaUrl(d.species.url);
  const cor = CORES_TIPO[d.types[0].type.name] || "#888";
  document.documentElement.style.setProperty("--cor", cor); // a página inteira acompanha a cor do tipo
  const oficial = (d.sprites.other && d.sprites.other["official-artwork"]) || {};
  arteNormal = oficial.front_default || d.sprites.front_default || "";
  arteBrilho = oficial.front_shiny || "";
  gritoUrl = (d.cries && d.cries.latest) || "";

  const tipos = d.types.map((t) =>
    `<span class="tipo" style="--t:${CORES_TIPO[t.type.name] || "#888"}">${NOMES_TIPO[t.type.name] || t.type.name}</span>`
  ).join("");

  const habilidades = d.abilities.map((h) => bonito(h.ability.name)).join(", ");

  const total = d.stats.reduce((soma, s) => soma + s.base_stat, 0);
  const stats = d.stats.map((s) => `
    <div class="stat">
      <span>${NOMES_STATS[s.stat.name] || s.stat.name}</span>
      <strong>${s.base_stat}</strong>
      <div class="barra"><span style="--w:${Math.min(s.base_stat / 255 * 100, 100)}%"></span></div>
    </div>`).join("");

  const abas = [["geral", "Visão geral"], ["evolucoes", "Evoluções e Megas"], ["curiosidades", "Curiosidades"]];

  area.innerHTML = `
    <article class="cartao" style="--cor:${cor}">
      <div class="palco">
        <button type="button" class="nav prev" id="btn-anterior" aria-label="Pokémon anterior">‹</button>
        ${arteNormal ? `<img id="img-pokemon" src="${arteNormal}" alt="Imagem de ${bonito(d.name)}">` : ""}
        <button type="button" class="nav next" id="btn-proximo" aria-label="Próximo Pokémon">›</button>
      </div>
      <div class="acoes">
        ${arteBrilho ? '<button type="button" id="btn-brilho" aria-pressed="false">Versão brilhante</button>' : ""}
        ${d.cries && d.cries.latest ? '<button type="button" id="btn-grito">Ouvir grito</button>' : ""}
      </div>
      <h2>${bonito(d.name)}</h2>
      <p class="numero">Nº ${String(idEspecieAtual).padStart(4, "0")}</p>
      <p class="genero" id="genero"></p>
      <div class="tipos">${tipos}</div>

      <div class="abas" role="tablist" aria-label="Seções do Pokémon">
        ${abas.map(([id, texto]) => `
          <button type="button" class="aba" role="tab" id="aba-${id}" data-aba="${id}"
            aria-controls="painel-${id}" aria-selected="${id === abaAtual}" tabindex="${id === abaAtual ? 0 : -1}">${texto}</button>`).join("")}
      </div>

      <div role="tabpanel" id="painel-geral" aria-labelledby="aba-geral" ${abaAtual === "geral" ? "" : "hidden"}>
        <dl class="medidas">
          <div><dt>Altura</dt><dd>${d.height / 10} m</dd></div>
          <div><dt>Peso</dt><dd>${d.weight / 10} kg</dd></div>
          <div><dt>Habilidades</dt><dd class="habilidades">${habilidades}</dd></div>
        </dl>
        ${stats}
        <div class="stat total"><span>Total</span><strong>${total}</strong><div class="barra"></div></div>
      </div>

      <div role="tabpanel" id="painel-evolucoes" aria-labelledby="aba-evolucoes" ${abaAtual === "evolucoes" ? "" : "hidden"}>
        <p class="vazio">Carregando evoluções...</p>
      </div>

      <div role="tabpanel" id="painel-curiosidades" aria-labelledby="aba-curiosidades" ${abaAtual === "curiosidades" ? "" : "hidden"}>
        <p class="vazio">Carregando curiosidades...</p>
      </div>
    </article>`;
}

function trocarAba(nome, focar) {
  abaAtual = nome;
  document.querySelectorAll(".aba").forEach((aba) => {
    const ativa = aba.dataset.aba === nome;
    aba.setAttribute("aria-selected", ativa);
    aba.tabIndex = ativa ? 0 : -1;
    if (ativa && focar) aba.focus();
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((p) => {
    p.hidden = p.id !== "painel-" + nome;
  });
}

/* ---------- aba: curiosidades ---------- */
function desenharCuriosidades(esp) {
  const painel = document.getElementById("painel-curiosidades");
  if (!painel) return;

  const categoria = escolherIdioma(esp.genera || []).itens[0];
  const generoEl = document.getElementById("genero");
  if (generoEl && categoria) generoEl.textContent = categoria.genus;

  // entradas da Pokédex de cada jogo, sem repetir textos iguais
  const { idioma, itens } = escolherIdioma(esp.flavor_text_entries || []);
  const vistos = new Set();
  entradas = [];
  itens.forEach((i) => {
    const texto = limparTexto(i.flavor_text);
    if (texto && !vistos.has(texto)) {
      vistos.add(texto);
      entradas.push({ texto, jogo: bonito(i.version.name) });
    }
  });
  idxEntrada = 0;

  const status = esp.is_legendary ? "lendário" : esp.is_mythical ? "mítico" : esp.is_baby ? "bebê" : "comum";
  const genero = esp.gender_rate === -1 ? "sem gênero" : `${esp.gender_rate / 8 * 100}% fêmea`;
  const fatos = [
    ["Categoria", categoria ? categoria.genus : "—"],
    ["Geração", esp.generation ? esp.generation.name.replace("generation-", "").toUpperCase() : "—"],
    ["Habitat", esp.habitat ? (HABITATS[esp.habitat.name] || esp.habitat.name) : "desconhecido"],
    ["Cor na Pokédex", esp.color ? (CORES_POKEDEX[esp.color.name] || esp.color.name) : "—"],
    ["Raridade", status],
    ["Taxa de captura", esp.capture_rate],
    ["Felicidade base", esp.base_happiness],
    ["Gênero", genero],
    ["Grupo de ovos", (esp.egg_groups || []).map((g) => GRUPOS_OVO[g.name] || g.name).join(", ") || "—"]
  ];

  painel.innerHTML = `
    ${entradas.length ? `
      <blockquote class="entrada" id="entrada-texto">${entradas[0].texto}</blockquote>
      <div class="entrada-info">
        <span>Jogo: <span class="jogo" id="entrada-jogo">${entradas[0].jogo}</span> · <span id="entrada-contador">1</span> de ${entradas.length}</span>
        ${entradas.length > 1 ? '<button type="button" id="btn-outra">Outra curiosidade</button>' : ""}
      </div>` : '<p class="vazio">Este Pokémon não tem entradas na Pokédex.</p>'}
    <dl class="fatos">
      ${fatos.map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`).join("")}
    </dl>
    ${entradas.length > 1 ? `
      <details>
        <summary>Todas as entradas da Pokédex (${entradas.length})</summary>
        <ul>${entradas.map((e) => `<li>${e.texto} <span>(${e.jogo})</span></li>`).join("")}</ul>
      </details>` : ""}
    ${idioma === "en" ? '<p class="nota">Os textos da Pokédex vêm da PokeAPI em inglês.</p>' : ""}`;
}

function outraCuriosidade() {
  if (entradas.length < 2) return;
  let novo;
  do { novo = Math.floor(Math.random() * entradas.length); } while (novo === idxEntrada);
  idxEntrada = novo;
  document.getElementById("entrada-texto").textContent = entradas[novo].texto;
  document.getElementById("entrada-jogo").textContent = entradas[novo].jogo;
  document.getElementById("entrada-contador").textContent = novo + 1;
}

/* ---------- aba: evoluções e megas ---------- */
function rotuloEvolucao(detalhes) {
  const d = detalhes && detalhes[0];
  if (!d) return "";
  if (d.min_level) return `Nv. ${d.min_level}`;
  if (d.item) return bonito(d.item.name);
  if (d.trigger && d.trigger.name === "trade") return "Troca";
  if (d.min_happiness) return "Amizade";
  if (d.trigger && d.trigger.name === "use-item") return "Usar item";
  return "Condição especial";
}

function cartaoEvolucao(id, nome, rotulo, atual) {
  return `
    <button type="button" class="evo${atual ? " atual" : ""}" data-pokemon="${id}" ${atual ? 'aria-current="true"' : ""}>
      <img src="${ARTE(id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <b>${bonito(nome)}</b>
      <small>${rotulo || ""}</small>
    </button>`;
}

function desenharEvolucoes(esp, cadeia) {
  const painel = document.getElementById("painel-evolucoes");
  if (!painel) return;
  let html = "";

  // a cadeia vira uma lista de estágios (1º, 2º, 3º...) para mostrar ramificações como a do Eevee
  if (cadeia) {
    const estagios = [];
    let nivel = [cadeia.chain];
    while (nivel.length) {
      estagios.push(nivel);
      nivel = nivel.flatMap((n) => n.evolves_to);
    }
    if (estagios.length > 1) {
      html += '<p class="sub">Linha evolutiva</p>';
      html += estagios.map((estagio) => `
        <div class="estagio">
          ${estagio.map((n) => {
            const id = idDaUrl(n.species.url);
            return cartaoEvolucao(id, n.species.name, rotuloEvolucao(n.evolution_details), id === idEspecieAtual && !pokemonAtual.match(/-(mega|primal|gmax)/));
          }).join("")}
        </div>`).join('<div class="seta" aria-hidden="true">▼</div>');
    } else {
      html += '<p class="vazio">Este Pokémon não evolui.</p>';
    }
  }

  // formas especiais: mega evolução, regressão primal e Gigantamax
  const especiais = (esp.varieties || []).filter((v) => /-(mega|primal|gmax)/.test(v.pokemon.name));
  if (especiais.length) {
    const rotulos = (nome) => nome.includes("mega") ? "Mega evolução" : nome.includes("primal") ? "Regressão primal" : "Gigantamax";
    const padrao = esp.varieties.find((v) => v.is_default);
    html += `
      <div class="formas">
        <p class="sub">Formas especiais</p>
        <div class="estagio">
          ${padrao ? cartaoEvolucao(idDaUrl(padrao.pokemon.url), padrao.pokemon.name, "Forma normal", padrao.pokemon.name === pokemonAtual) : ""}
          ${especiais.map((v) => cartaoEvolucao(idDaUrl(v.pokemon.url), v.pokemon.name, rotulos(v.pokemon.name), v.pokemon.name === pokemonAtual)).join("")}
        </div>
      </div>`;
  } else if (!cadeia) {
    html = '<p class="vazio">Sem dados de evolução para este Pokémon.</p>';
  }

  painel.innerHTML = html + '<p class="nota">Clique em um Pokémon para ver os dados dele.</p>';
}

/* ---------- grito e brilho ---------- */
function pararGrito() {
  if (gritoAudio) { gritoAudio.pause(); gritoAudio = null; }
}

async function tocarGrito() {
  pararGrito();
  try {
    gritoAudio = new Audio(gritoUrl);
    gritoAudio.volume = 0.5;
    await gritoAudio.play();
  } catch (erro) {
    console.error(erro); // sem som não é motivo para quebrar a página
  }
}

function alternarBrilho() {
  const botao = document.getElementById("btn-brilho");
  const imagem = document.getElementById("img-pokemon");
  const ativo = botao.getAttribute("aria-pressed") !== "true";
  botao.setAttribute("aria-pressed", ativo);
  imagem.src = ativo ? arteBrilho : arteNormal;
}

/* ---------- histórico ---------- */
function registrarHistorico(nome) {
  historico = [nome, ...historico.filter((n) => n !== nome)].slice(0, 6);
  try { localStorage.setItem("pokedex-historico", JSON.stringify(historico)); } catch (e) { /* ignora */ }
  desenharHistorico();
}

function desenharHistorico() {
  caixaHistorico.innerHTML = historico.length
    ? '<span>Recentes:</span>' + historico.map((n) => `<button type="button" class="chip" data-pokemon="${n}">${bonito(n)}</button>`).join("")
    : "";
}

/* ---------- sugestões de nomes (autocompletar) ---------- */
async function carregarNomes() {
  try {
    const lista = await getJSON(API + "pokemon?limit=" + TOTAL_POKEMON);
    listaNomes.innerHTML = lista.results.map((p) => `<option value="${p.name}"></option>`).join("");
  } catch (erro) {
    console.error(erro); // o autocompletar é opcional
  }
}

/* ---------- eventos ---------- */
form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  carregar(campo.value);
});

botaoAleatorio.addEventListener("click", () => {
  carregar(Math.floor(Math.random() * TOTAL_POKEMON) + 1);
});

document.addEventListener("click", (evento) => {
  const alvo = evento.target.closest("button");
  if (!alvo) return;

  if (alvo.dataset.pokemon) carregar(alvo.dataset.pokemon);
  else if (alvo.dataset.aba) trocarAba(alvo.dataset.aba, false);
  else if (alvo.id === "btn-anterior") carregar(((idEspecieAtual - 2 + TOTAL_POKEMON) % TOTAL_POKEMON) + 1);
  else if (alvo.id === "btn-proximo") carregar((idEspecieAtual % TOTAL_POKEMON) + 1);
  else if (alvo.id === "btn-brilho") alternarBrilho();
  else if (alvo.id === "btn-grito") tocarGrito();
  else if (alvo.id === "btn-outra") outraCuriosidade();
});

// setas do teclado entre as abas
document.addEventListener("keydown", (evento) => {
  if (!evento.target.classList || !evento.target.classList.contains("aba")) return;
  const ids = ["geral", "evolucoes", "curiosidades"];
  const i = ids.indexOf(abaAtual);
  if (evento.key === "ArrowRight") trocarAba(ids[(i + 1) % ids.length], true);
  if (evento.key === "ArrowLeft") trocarAba(ids[(i + ids.length - 1) % ids.length], true);
});

// botão "voltar" do navegador e links compartilháveis (#pikachu)
window.addEventListener("hashchange", () => {
  const nome = decodeURIComponent(location.hash.slice(1));
  if (nome && nome !== pokemonAtual) carregar(nome);
});

/* ---------- início ---------- */
try { historico = JSON.parse(localStorage.getItem("pokedex-historico")) || []; } catch (e) { historico = []; }
desenharHistorico();
carregarNomes();
if (location.hash.length > 1) carregar(decodeURIComponent(location.hash.slice(1)));

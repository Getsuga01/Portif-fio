# Camada Cyberpunk — o que foi adicionado

Transformação temática completa sobre a versão campeã (novembro de 2026), usando
**imagens geradas por IA, cena 3D ampliada e animações** para demonstrar domínio de
interfaces web. A lógica do jogo e todo o conteúdo textual foram preservados.

## 1. Imagens geradas por IA (7 artes, todas comprimidas)

| Arquivo | Uso |
|---|---|
| `assets/bg-cidade.jpg` | Megacidade com chuva neon atrás do herói (com máscaras de gradiente para não matar a legibilidade) |
| `assets/bg-grade.jpg` | Grade synthwave no rodapé das seções "faixa" (Stack, TechFix, Serviços) |
| `assets/capa-techfix.jpg` | Placa de circuito holográfica na mídia do TechFix ERP |
| `assets/capa-chaos.jpg` | Datacenter com arcos de falha como textura de fundo da seção Chaos |
| `assets/capa-erpcampo.jpg` | Monólito de dados sobre a lavoura na mídia do ERP Campo |
| `assets/capa-finnace.jpg` | Núcleo de dados financeiros em banner próprio na seção Finnace_Tech |
| `assets/og-cover.jpg` | Capa de compartilhamento (base IA + composição com textos, 144 KB) |

Todas na paleta do site (roxo `#b026ff` / ciano `#42e8ff` / magenta `#ec4899`), escuras
para manter contraste de texto, sem texto/lettering gerado pela IA.

## 2. Cena 3D ampliada (three.js, `js/cena3d.js`)

O site já tinha 3 peças 3D (placa, mão robótica, troféu) nas fases 2-9. Foram criadas
duas novas peças seguindo o mesmo contrato (`{grupo, escala, cor, atualizar, evento}`):

- **Cidade wireframe** (fases Início/Perfil): ~15 torres com arestas neon ciano/roxo
  piscando, grade synthwave, sol magenta e 90 fagulhas de dados subindo. Reage a
  pouso/coleta/soco do jogo com flash de luz.
- **Portal neon** (fase Contato): nó tórico magenta em wireframe, núcleo pulsante,
  dois anéis contrarrotantes e 70 partículas orbitando. Dispara aceleração no evento
  de troféu.

Materiais `MeshBasicMaterial`/`LineBasicMaterial` (sem dependência de luzes) — leves
para os níveis médio e alto de qualidade.

## 3. Chuva neon (`js/fundo.js`)

A poeira em parallax virou **chuva digital**: gotas caem continuamente (3 camadas de
profundidade), se alongam quando a página desce rápido e cada gota se tinge entre
ciano, magenta e violeta, mesclando com a cor da fase. Com `prefers-reduced-motion`
ou nível "baixo", a chuva fica parada (apenas reage ao scroll).

## 4. Camada CSS (`css/cyberpunk.css`, carregada após `estilo.css`)

- Fonte **Orbitron** no display (títulos, numeração de fase, marca).
- **Scanlines CRT + vinheta** em `body::after` (estático, sobre tudo, sem capturar cliques).
- **Glitch RGB raro** nos títulos (pico de 1,5 s a cada 6,8 s, com deslocamento ciano/magenta).
- **Cantos holográficos** (ticks ciano no topo-esquerda, magenta embaixo-direita) em todos
  os `.cartao`.
- **Varredura de luz** ao passar o mouse nos cartões; brilho neon em botões, HUD e painel.
- Barra de rolagem e seleção de texto neon.
- Banner de projeto (`.banner-cyber`) para a arte da Finnace.

## 5. Segurança de desempenho e acessibilidade (inalterada em espírito)

- Animações de glitch/pulso/varredura **só no nível `q-alto`** (classes que o
  `desempenho.js` já aplica ao `<html>`); `q-medio` recebe efeitos estáticos; `q-baixo`
  reduz opacidades pesadas.
- Tudo desligado com `prefers-reduced-motion: reduce`.
- Artes decorativas são `aria-hidden` ou background CSS; textos alternativos reais
  permanecem.
- Capa OG com sombras reforçadas para o texto continuar legível sobre a cidade IA.

## Peso final dos assets

| Item | Tamanho |
|---|---|
| Foto de perfil (WebP) | 39 KB |
| 6 artes IA (JPEG) | 86-204 KB cada |
| og-cover.jpg | 144 KB |
| favicon + touch icon | 3 + 10 KB |
| CSS (2 arquivos) | 51 KB |
| JS (9 módulos) | 176 KB |

## Verificações feitas

- `node --check` nos 9 arquivos JS.
- Desktop 1600×900: herói com cidade + Orbitron + scanlines; seção Perfil com cidade
  wireframe 3D e chuva; TechFix com capa IA e glitch capturado em execução; Finnace com
  banner e mão robótica 3D; Contato com portal neon (nó tórico + anéis orbitais).
- Mobile 390×844: menu compacto, chuva e 3D ativos, console **sem erros**.

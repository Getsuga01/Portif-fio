# O que mudou nesta versão (campeã)

Melhorias aplicadas sobre a versão enviada em novembro de 2026, seguindo a auditoria
realizada em 17/11/2026. Nada da estrutura, do visual ou do jogo foi alterado — todas as
mudanças são cirúrgicas.

## 1. Compartilhamento (a maior perda de conversão, resolvida)

Antes: o `og:image` apontava para um caminho **relativo** (`assets/ronaldo-profile.png`),
que LinkedIn e WhatsApp não conseguem resolver — o card de pré-visualização nunca aparecia.
Agora:

- `og:image` absoluto e dedicado: `https://getsuga01.github.io/Portif-fio/assets/og-cover.png`
  (1200×630 px, 72 KB, identidade visual do site, gerada a partir das cores do portfólio).
- Adicionados `og:url`, `og:site_name`, `og:locale`, `og:image:width/height/alt`,
  `twitter:title`, `twitter:description`, `twitter:image`.
- Adicionado `<link rel="canonical">`.
- Adicionado JSON-LD `Person` (nome, cargo, formação, cidade, perfis) para mecanismos de busca.

## 2. Performance

- Foto de perfil: PNG de 1,55 MB → **WebP de 39 KB** (qualidade 80, mesma imagem,
  mesma proporção). O PNG original foi removido do pacote por não ser mais referenciado.
- `<img>` agora tem `loading="lazy"` e `decoding="async"` (o `width`/`height` já existiam
  e foram mantidos — zero deslocamento de layout).
- Todos os 9 scripts agora têm `defer` (antes só o `cena3d.js` tinha).
- Fontes: removidas do carregamento a família `Pixelify Sans` (carregada mas **não usada
  em nenhuma regra do CSS**) e o peso 300 do Outfit (nunca utilizado).

## 3. Correções de conteúdo

- **Card DataPulse duplicado**: a seção Chaos Engineering listava o mesmo repositório
  (`DashBoard_pub`) em dois cards ("Analytics BACEN" e "Dados BACEN"). Os dois foram
  unificados em um único card com a melhor descrição de cada.
- **Métricas verificáveis**: os cartões fracos ("11+ tecnologias", "4 SGBDs") foram
  substituídos por indicadores que provam: **86 testes automatizados publicados**
  (65 TechFix ERP + 21 DataPulse, conforme os READMEs dos repositórios) e
  **4 SGBDs · 2 regiões AWS** (ativo-ativo us-east-1/us-west-2).
- Rótulo do índice "Seções" do herói unificado: "Trajetória" → "Jornada" (igual ao menu).

## 4. Acabamento

- Ícone de pausa do HUD: o texto "II" (que parecia numeral romano) virou um SVG de duas
  barras, com `fill="currentColor"` para herdar a cor do botão.
- Favicon 64×64 e apple-touch-icon 180×180 gerados a partir do selo "RA" do cabeçalho
  (antes o site não tinha favicon — aba genérica nos favoritos).

## Antes × depois (medido)

| Indicador | Antes | Depois |
|---|---|---|
| Peso dos assets publicados | 1,8 MB | 416 KB (incl. CV de 155 KB) |
| Foto de perfil | 1.551 KB (PNG) | 39 KB (WebP) |
| Card ao compartilhar o link | nenhum | OG completo + capa 1200×630 |
| Favicon | não | sim (64 + 180) |
| Scripts com `defer` | 1 de 9 | 9 de 9 |
| Arquivos de fonte solicitados | 15 | 12 |

## Verificações feitas

- `node --check` nos 9 arquivos JS (sem alterações no jogo — apenas confere).
- Teste em navegador headless: desktop 1600×900 e mobile 390×844, console limpo,
  menu compacto abrindo/fechando, imagem WebP renderizando corretamente.
- Verificação de todos os links internos (`#perfil`, `#atuacao`, …) contra os IDs do HTML.

# Como publicar esta versão no GitHub Pages

Este pacote está pronto para substituir o conteúdo do repositório que publica o site.

## 1. Substituir o conteúdo do repositório

O site vive no repositório `Getsuga01/Portif-fio` (branch `main`, raiz publicada).

```bash
# dentro da pasta deste pacote (a pasta que contém index.html)
git clone https://github.com/Getsuga01/Portif-fio.git
cp -r <pasta-deste-pacote>/. Portif-fio/        # sobrescreve os arquivos
cd Portif-fio
git add -A
git commit -m "Portfólio: SEO/OG completo, foto WebP, métricas verificáveis, favicon"
git push
```

Importante: **não renomeie o repositório**. O endereço `getsuga01.github.io/Portif-fio`
já foi distribuído em currículo e redes sociais, e o GitHub Pages não redireciona
quando o repositório muda de nome.

## 2. Remover o PNG antigo do repositório (se existir)

O `assets/ronaldo-profile.png` não é mais referenciado — se ele ainda estiver no
repositório, o `git add -A` com o arquivo ausente neste pacote não o remove sozinho.
Remova explicitamente se quiser economizar espaço:

```bash
git rm assets/ronaldo-profile.png   # só se ainda existir no repo
```

## 3. Validar o card de compartilhamento (faça antes de divulgar o link)

1. LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/ — cole a URL do site.
2. Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/ — cole a URL
   e clique em "Scrape Again" (o cache do Facebook costuma guardar a versão antiga).
3. Confira se a pré-visualização mostra a capa `og-cover.jpg`.

## 4. Conferência rápida pós-deploy

- [ ] Aba do navegador mostra o favicon "RA".
- [ ] Compartilhar a URL no WhatsApp mostra a capa com o nome.
- [ ] No celular, o menu "Seções" abre e fecha ao escolher uma seção.
- [ ] Seção "Sobre mim" carrega a foto (agora `ronaldo-profile.webp`).
- [ ] Console do navegador (F12) sem erros.

## Estrutura do pacote

```
index.html          # única página alterada
css/estilo.css      # sem alterações
css/cyberpunk.css   # camada temática (scanlines, glitch, Orbitron, capas IA)
js/                 # fundo.js (chuva neon) e cena3d.js (cidade + portal) alterados
assets/
  ronaldo-profile.webp   # foto comprimida (39 KB)
  bg-cidade.jpg          # fundo IA do herói
  bg-grade.jpg           # grade synthwave das seções "faixa"
  capa-techfix.jpg       # capas de projeto geradas por IA
  capa-chaos.jpg         # (também fundo da seção Chaos)
  capa-erpcampo.jpg
  capa-finnace.jpg       # (banner próprio na seção Finnace_Tech)
  og-cover.jpg           # capa 1200×630 para redes sociais (144 KB, base IA)
  favicon.png            # 64×64, variante cyber
  apple-touch-icon.png   # 180×180
  Curriculo-Ronaldo-Avansini.pdf
MUDANCAS.md         # mudanças da versão campeã
MUDANCAS-CYBER.md   # documentação da camada cyberpunk
README-DEPLOY.md    # este arquivo
```

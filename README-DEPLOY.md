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
3. Confira se a pré-visualização mostra a capa `og-cover.png`.

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
js/                 # sem alterações (9 módulos, com defer no HTML)
assets/
  ronaldo-profile.webp   # foto comprimida (39 KB)
  og-cover.png           # capa 1200×630 para redes sociais (72 KB)
  favicon.png            # 64×64
  apple-touch-icon.png   # 180×180
  Curriculo-Ronaldo-Avansini.pdf
MUDANCAS.md         # lista completa do que mudou
README-DEPLOY.md    # este arquivo
```

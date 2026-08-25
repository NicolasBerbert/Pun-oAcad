# PunçãoAcad — versão desktop

Empacotamento em Electron do PunçãoAcad, gerando um executável para
Windows. A interface e os cálculos são os mesmos da versão web: o que
muda é o entorno — a aplicação passa a rodar offline, com diálogos de
arquivo do sistema e um PDF gerado direto em disco.

Fonte da aplicação: <https://github.com/NicolasBerbert/Pun-oAcad>

## Como rodar

```bash
npm install
npm start          # abre a janela em modo de desenvolvimento
npm run teste      # testes de fumaça: carga, cálculo, PDF, DXF
npm run dist       # gera o instalador e a versão portátil em dist/
```

Saídas de `npm run dist`:

| Arquivo | O que é |
|---|---|
| `dist/PuncaoAcad-Setup-1.0.0.exe` | instalador NSIS, ~82 MB |
| `dist/PuncaoAcad-Portatil-1.0.0.exe` | executável único, sem instalar |
| `dist/win-unpacked/` | aplicação já descompactada, ~271 MB |

## Como está organizado

```
electron/          processo principal
  main.js          janela, IPC, geração do PDF
  preload.js       ponte com contextIsolation — única superfície exposta
  menu.js          barra de menus nativa
src/
  index.html       entrada do renderer
  app/*.jsx        aplicação (cópia do repositório web)
  app/desktop.js   escolhe entre diálogo nativo e comportamento de navegador
  app/build/       gerado por scripts/build.mjs — não versionado
  vendor/          React, Three.js e as fontes, embarcados
scripts/
  build.mjs        transpila os .jsx com esbuild
  icone.mjs        gera build/icon.ico
  preparar-cache.mjs
  smoke*.js        testes de fumaça
```

## Diferenças em relação à versão web

**As bibliotecas foram embarcadas.** React, ReactDOM, Three.js,
OrbitControls e as três famílias de fonte vinham de CDN e agora estão em
`src/vendor/`. Sem isso o app não abriria sem internet. Das fontes só
foram guardados os subconjuntos `latin` e `latin-ext`.

**O Babel saiu do runtime.** A versão web transpila os ~5.000 linhas de
JSX a cada abertura, com `@babel/standalone`. Aqui `scripts/build.mjs`
faz isso uma vez, em tempo de build, com esbuild. Os arquivos continuam
sendo scripts clássicos que compartilham o escopo global — nenhum
`import`/`export` foi introduzido na aplicação.

**Os diálogos de arquivo são do sistema.** Salvar caso, carregar caso e
exportar DXF passavam por download do navegador e `<input type="file">`.
Agora abrem "Salvar como…" e "Abrir" de verdade, com pastas lembradas.
`src/app/desktop.js` mantém o caminho antigo como alternativa, então o
mesmo código roda nos dois lugares.

**O PDF é gerado direto.** Antes o botão chamava `window.print()`. Agora
o processo principal usa `printToPDF` com `preferCSSPageSize`, que
respeita o `@page A4` já definido em `styles.css`. O arquivo sai sem
cabeçalho e rodapé do navegador e abre sozinho ao terminar.

**Há menu e estado de janela.** Barra de menus em português com atalhos
(Ctrl+S, Ctrl+O, Ctrl+P, Ctrl+D), instância única, e posição e tamanho
da janela preservados entre sessões.

O `localStorage` continua funcionando igual — no app ele é persistido em
`%APPDATA%/PunçãoAcad`.

## Sobre o `preparar-cache`

O `npm run dist` roda `scripts/preparar-cache.mjs` antes de empacotar.
O motivo: o electron-builder baixa um pacote chamado `winCodeSign`, de
onde sai o `rcedit` que grava ícone e metadados no `.exe`. Esse pacote
contém symlinks das ferramentas de macOS, e criar symlink no Windows
exige um privilégio que contas comuns não têm — o 7-Zip aborta a
extração inteira por causa disso e o build falha.

O script baixa e extrai o pacote sem as pastas `darwin` e `linux`,
irrelevantes para um build Windows, e o deixa pronto no cache.

A alternativa oficial é ligar o **Modo de Desenvolvedor** do Windows
(Configurações › Sistema › Para desenvolvedores), que concede o
privilégio. Com ele ligado o script vira inofensivo — detecta o cache já
pronto e não faz nada.

## Ainda pendente

**Assinatura digital.** O executável não é assinado, então o SmartScreen
mostra "O Windows protegeu o computador" na primeira execução. Resolver
isso exige um certificado de assinatura de código (OV, com custo anual;
ou EV, que limpa o aviso de imediato).

**Atualização automática.** Nada implementado. O caminho natural é
`electron-updater` publicando pelas Releases do GitHub — depende da
assinatura para funcionar sem atrito.

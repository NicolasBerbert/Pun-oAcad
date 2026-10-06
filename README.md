# PunçãoAcad

Software para dimensionamento da armadura de punção em lajes lisas de
concreto armado, desenvolvido no âmbito do PIBIC, com financiamento do
CNPq, na Universidade Estadual de Maringá (UEM).

- **Autora:** Camila Aguiar Camargo
- **Orientador:** Prof. Dr. Elyson Andrew Pozo Liberati
- **Colaboração técnica:** Nicolas Figueiredo Berbert (UniFil – Londrina)

O PunçãoAcad é um aplicativo desktop para Windows. Ele funciona offline
e segue a ABNT NBR 6118:2026. A versão web original continua neste
repositório, na pasta [`web/`](web/).

## O que o programa faz

Verifica a punção em **pilar interno** de seção retangular ou circular,
com momentos fletores nas duas direções atuando ao mesmo tempo. Para
isso, percorre as etapas da norma:

1. dados iniciais e alturas úteis das duas malhas de flexão;
2. valores de cálculo (γc = 1,4 · γs = 1,15 · γf = 1,4);
3. perímetros de controle u₁, u₂ e u₃;
4. tensão resistente da armadura de punção (f<sub>ywd</sub>), para
   estribos ou conectores (studs);
5. taxa de armadura de flexão ρ;
6. superfície crítica C: compressão diagonal do concreto;
7. superfície crítica C′ sem armadura de punção;
8. superfície crítica C′ com armadura de punção;
9. superfície crítica C″, além da última camada de armadura;
10. armadura contra colapso progressivo (item 19.5.4).

Outras funções:

- **Seleção automática da armadura:** a bitola é escolhida por quem
  projeta. O programa calcula o menor número de conectores por camada que
  atende C′. Depois, com esse número fixo, acrescenta camadas até C″
  passar.
- **Compressão axial na laje (σ<sub>cp</sub>):** opcional. Entra como
  parcela favorável em τ<sub>Rd1</sub>.
- **Visualização 3D, planta e cortes:** mostra o pilar, as malhas de
  flexão, a armadura de punção, os contornos críticos e o tronco de cone
  de ruptura.
- **Memorial de cálculo:** mostra todas as fórmulas com os valores
  substituídos. Pode ser exportado em PDF (A4) ou impresso.
- **Detalhamento em DXF:** gera a planta da armadura de punção para
  abrir no AutoCAD.
- **Salvar e carregar casos** em arquivo `.json`.

Ainda não estão disponíveis: pilares de **extremidade** e de **canto**.

## Instalação

São gerados dois executáveis para Windows 10/11 (64 bits):

| Arquivo | O que é |
|---|---|
| `PuncaoAcad-Setup-<versão>.exe` | instalador, com atalhos na área de trabalho e no menu Iniciar |
| `PuncaoAcad-Portatil-<versão>.exe` | executável único, roda sem instalar (por exemplo, de um pendrive) |

Os executáveis não têm assinatura digital. Por isso, na primeira
execução, o Windows SmartScreen mostra "O Windows protegeu o
computador". Para abrir, clique em **Mais informações → Executar assim
mesmo**.

## Como compilar

É preciso ter o [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
npm start          # abre o aplicativo em modo de desenvolvimento
npm run teste      # teste de referência e testes do aplicativo
npm run dist       # gera o instalador e a versão portátil em dist/
```

Se `npm start` ou `npm run teste` forem rodados no terminal integrado do
VS Code, desligue antes a variável `ELECTRON_RUN_AS_NODE`. O VS Code a
define, e com ela o Electron roda como Node puro e não abre janela:

```bash
unset ELECTRON_RUN_AS_NODE          # Git Bash
$env:ELECTRON_RUN_AS_NODE = $null   # PowerShell
```

### Validação

[`test/referencia.mjs`](test/referencia.mjs) roda o exercício resolvido
"Atividade 1 — punção em pilar centrado com momentos nas duas direções"
(Programa Master PEC IBRACON). Ele compara cada resultado intermediário
com a resolução de referência, nos casos sem e com armadura de punção.
Esse teste é o critério de aceitação da rotina de cálculo: rode-o
sempre que alterar `src/app/calc.js`.

## Organização do código

```
electron/          processo principal do Electron
  main.js          janela, comunicação com a interface, geração do PDF
  preload.js       ponte entre o Electron e a interface (contextIsolation)
  menu.js          barra de menus e caixa "Sobre"
src/
  index.html       página carregada pela janela
  app/calc.js      rotina de cálculo (NBR 6118) e seleção automática da armadura
  app/*.jsx        interface em React: formulário, resultados, memorial, 3D
  app/dxf.js       exportação para DXF
  app/desktop.js   diálogos de arquivo do sistema, com alternativa de navegador
  app/build/       gerado por scripts/build.mjs, não versionado
  vendor/          React, Three.js e fontes embarcados (uso offline)
scripts/
  build.mjs        transpila os .jsx com esbuild
  icone.mjs        gera build/icon.ico
  preparar-cache.mjs  contorna uma falha do electron-builder no Windows (ver abaixo)
  smoke*.js        testes de carga, cálculo, PDF e DXF no aplicativo
  caso-referencia.js  caso usado pelos testes do aplicativo
test/
  referencia.mjs   teste da rotina de cálculo contra o exercício resolvido
build/             ícones do aplicativo
web/               versão web original (navegador, sem instalação)
```

Os arquivos da interface são scripts clássicos que compartilham o
escopo global, sem `import`/`export`. A mesma base roda no navegador e
no Electron. `src/app/desktop.js` decide, em tempo de execução, se usa
os diálogos nativos do sistema ou o download do navegador.

### Sobre o `preparar-cache`

O `npm run dist` roda `scripts/preparar-cache.mjs` antes de empacotar.
O electron-builder baixa o pacote `winCodeSign`, de onde sai a
ferramenta que grava o ícone e os metadados no `.exe`. Esse pacote traz
links simbólicos de ferramentas do macOS, e uma conta comum do Windows
não tem permissão para criá-los. Com isso, a extração falha e o build
para.

O script extrai o pacote sem as pastas de macOS e Linux e o deixa
pronto no cache. Outra saída é ligar o **Modo de Desenvolvedor** do
Windows (Configurações › Sistema › Para desenvolvedores). Com ele
ligado, o script detecta o cache pronto e não faz nada.

## Versão web

A pasta [`web/`](web/) guarda a primeira versão do PunçãoAcad, feita
para rodar no navegador. As bibliotecas vêm de CDN e o JSX é transpilado
no próprio navegador. Para usar, sirva a pasta com qualquer servidor
estático e abra `index.html`. A versão web não recebeu as funções mais
recentes do aplicativo: seleção automática da armadura, σ<sub>cp</sub> e
colapso progressivo.

## Licença

Nenhuma licença de uso foi definida até o momento. Todos os direitos
são reservados aos autores.

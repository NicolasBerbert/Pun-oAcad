// Sobe a janela real, coleta erros de console e grava uma captura.
// Uso: npx electron scripts/smoke.js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { carregarCasoReferencia } = require('./caso-referencia');

const SAIDA = process.env.SMOKE_OUT || path.join(__dirname, '..', 'smoke.png');
const problemas = [];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600, height: 1000, show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });

  win.webContents.on('console-message', (_e, nivel, msg, linha, origem) => {
    if (nivel >= 2) problemas.push(`[console] ${msg}  (${origem}:${linha})`);
  });
  win.webContents.on('did-fail-load', (_e, cod, desc, url) =>
    problemas.push(`[load] ${cod} ${desc} ${url}`));
  win.webContents.on('preload-error', (_e, f, erro) =>
    problemas.push(`[preload] ${erro}`));

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await carregarCasoReferencia(win);
  await new Promise(r => setTimeout(r, 3500));

  const diag = await win.webContents.executeJavaScript(`(() => ({
    filhos:    document.getElementById('root').children.length,
    titulo:    document.querySelector('.brand-title')?.textContent ?? null,
    fonte:     getComputedStyle(document.querySelector('.brand-title') || document.body).fontFamily,
    fontesOk:  document.fonts.check('600 17px "Source Serif 4"'),
    react:     typeof React,
    three:     typeof THREE,
    orbit:     typeof THREE !== 'undefined' && typeof THREE.OrbitControls,
    ponte:     typeof window.puncaoAPI,
    salvar:    typeof window.salvarArquivo,
    calc:      typeof window.calcularPuncao,
    dxf:       typeof window.gerarDXF,
    botoes:    [...document.querySelectorAll('.topbar-actions button')].map(b => b.textContent.trim()),
    canvas:    !!document.querySelector('canvas'),
  }))()`);

  fs.writeFileSync(SAIDA, (await win.webContents.capturePage()).toPNG());

  console.log(JSON.stringify(diag, null, 2));
  console.log(problemas.length ? '\nPROBLEMAS:\n' + problemas.join('\n') : '\nsem erros de console');
  app.exit(problemas.length ? 1 : 0);
});

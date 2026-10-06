// Clica no botão de DXF e captura o que seria gravado em disco.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { carregarCasoReferencia } = require('./caso-referencia');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000, webPreferences: {
    preload: path.join(__dirname, '..', 'electron', 'preload.js'),
    contextIsolation: true, nodeIntegration: false, sandbox: false,
  }});
  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await carregarCasoReferencia(win);
  await new Promise(r => setTimeout(r, 2500));

  const r = await win.webContents.executeJavaScript(`(async () => {
    document.querySelector('.calc-button').click();
    await new Promise(r => setTimeout(r, 1500));

    // intercepta a gravação para inspecionar o conteúdo
    let capturado = null;
    const original = window.salvarArquivo;
    window.salvarArquivo = (nome, conteudo, filtro) => {
      capturado = { nome, filtro, bytes: conteudo.length, inicio: conteudo.slice(0, 40) };
      return Promise.resolve({ ok: true });
    };

    const btn = [...document.querySelectorAll('button')].find(b => /DXF/.test(b.textContent));
    if (!btn) return { erro: 'botão DXF não encontrado' };
    btn.click();
    await new Promise(r => setTimeout(r, 400));
    window.salvarArquivo = original;

    // e o salvar caso
    let caso = null;
    window.salvarArquivo = (nome, conteudo, filtro) => {
      caso = { nome, filtro, bytes: conteudo.length, jsonOk: (() => { try { JSON.parse(conteudo); return true; } catch { return false; } })() };
      return Promise.resolve({ ok: true });
    };
    [...document.querySelectorAll('button')].find(b => /Salvar caso/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 300));
    window.salvarArquivo = original;

    return { dxf: capturado, caso };
  })()`);

  console.log(JSON.stringify(r, null, 2));
  app.exit(0);
});

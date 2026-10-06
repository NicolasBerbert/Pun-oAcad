// Exercita σcp, colapso progressivo e o botão de seleção automática.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { carregarCasoReferencia } = require('./caso-referencia');

const DIR = process.env.OUT_DIR || path.join(__dirname, '..');
const problemas = [];

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1500, height: 1100, webPreferences: {
    preload: path.join(__dirname, '..', 'electron', 'preload.js'),
    contextIsolation: true, nodeIntegration: false, sandbox: false,
  }});
  win.webContents.on('console-message', (_e, n, m, l, o) => { if (n >= 2) problemas.push(`${m} (${o}:${l})`); });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await carregarCasoReferencia(win);
  await new Promise(r => setTimeout(r, 1500));

  await win.webContents.executeJavaScript(`(() => {
    const d = JSON.parse(localStorage.getItem('puncao_data'));
    d.studs = { phi: 16 };
    d.espac = { s0: 7, sr: 10, se: 21 };
    d.ccp   = { ativo: true, phi_h: 16, s_h: 10, phi_v: 16, s_v: 10 };
    d.axial = { ativo: true, Nsdx: 120, Nsdy: 80, Ac: 1700 };
    localStorage.setItem('puncao_data', JSON.stringify(d));
  })()`);
  await win.webContents.reload();
  await new Promise(r => setTimeout(r, 2500));

  // 1º cálculo → destrava a etapa 5
  await win.webContents.executeJavaScript(`document.querySelector('.calc-button')?.click()`);
  await new Promise(r => setTimeout(r, 1500));

  // abre a etapa 5 (os cards colapsados não renderizam os campos)
  await win.webContents.executeJavaScript(`(() => {
    const card = document.getElementById('step-studs');
    const cab = card && (card.querySelector('.step-head') || card.firstElementChild);
    if (cab) cab.click();
  })()`);
  await new Promise(r => setTimeout(r, 700));

  // botão de seleção automática
  const auto = await win.webContents.executeJavaScript(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Selecionar automaticamente/.test(x.textContent));
    if (!b) return { achou: false };
    b.click();
    return { achou: true, desabilitado: b.disabled };
  })()`);
  await new Promise(r => setTimeout(r, 800));

  const depois = await win.webContents.executeJavaScript(`(() => {
    const d = JSON.parse(localStorage.getItem('puncao_data'));
    return { studs: d.studs };
  })()`);

  await win.webContents.executeJavaScript(`document.querySelector('.calc-button')?.click()`);
  await new Promise(r => setTimeout(r, 1800));

  const secoes = await win.webContents.executeJavaScript(`(() => {
    const t = [...document.querySelectorAll('.results-inner h3, .results-inner .card-title, .results-section h3')]
      .map(e => e.textContent.trim());
    return {
      titulos: t,
      temColapso: /Colapso progressivo/.test(document.body.innerText),
      temSigma: /σ/.test(document.body.innerText),
      resumo: [...document.querySelectorAll('.resumo-item')].map(e => e.textContent.trim()),
      secoesRel: document.querySelectorAll('.relatorio .rel-secao').length,
    };
  })()`);

  fs.writeFileSync(path.join(DIR, 'ui-novidades.png'), (await win.webContents.capturePage()).toPNG());
  const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(path.join(DIR, 'novidades.pdf'), pdf);

  console.log(JSON.stringify({ auto, depois, ...secoes, pdfBytes: pdf.length }, null, 1));
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'sem erros de console');
  app.exit(problemas.length ? 1 : 0);
});

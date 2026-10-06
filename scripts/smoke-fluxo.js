// Exercita o caminho completo: calcular -> memorial -> PDF -> DXF.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { carregarCasoReferencia } = require('./caso-referencia');

const TMP = process.env.SMOKE_DIR || path.join(__dirname, '..');
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
    if (nivel >= 2) problemas.push(`[console] ${msg} (${origem}:${linha})`);
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await carregarCasoReferencia(win);
  await new Promise(r => setTimeout(r, 2500));

  // dispara o cálculo pelo botão real da interface
  const clicou = await win.webContents.executeJavaScript(`(() => {
    const b = document.querySelector('.calc-button')
          || [...document.querySelectorAll('button')].find(x => /Calcular/.test(x.textContent));
    if (!b || b.disabled) return { ok: false, motivo: b ? 'botão desabilitado' : 'botão não achado' };
    b.click();
    return { ok: true };
  })()`);
  await new Promise(r => setTimeout(r, 2000));

  const dep = await win.webContents.executeJavaScript(`(() => {
    const rel = document.querySelector('.relatorio');
    return {
      memorial:     !!document.querySelector('.results-section'),
      detalhamento: !!document.querySelector('.detalhamento, [class*=detalh]'),
      relatorio:    !!rel,
      secoesRel:    rel ? rel.querySelectorAll('h2, .rel-sec, table').length : 0,
      dxfBytes:     (() => { try { return window.gerarDXF(window.__R || null, 'teste')?.length ?? -1; } catch (e) { return 'erro: ' + e.message; } })(),
    };
  })()`);

  // PDF pelo mesmo caminho que o app usa em produção
  let pdfInfo;
  try {
    const pdf = await win.webContents.printToPDF({
      printBackground: true, preferCSSPageSize: true, generateDocumentOutline: true,
    });
    const destino = path.join(TMP, 'teste-memorial.pdf');
    fs.writeFileSync(destino, pdf);
    pdfInfo = { bytes: pdf.length, cabecalho: pdf.subarray(0, 5).toString(), destino };
  } catch (e) {
    pdfInfo = { erro: e.message };
    problemas.push('[pdf] ' + e.message);
  }

  fs.writeFileSync(path.join(TMP, 'smoke-resultados.png'), (await win.webContents.capturePage()).toPNG());

  console.log(JSON.stringify({ clicou, ...dep, pdf: pdfInfo }, null, 2));
  console.log(problemas.length ? '\nPROBLEMAS:\n' + problemas.join('\n') : '\nsem erros de console');
  app.exit(problemas.length ? 1 : 0);
});

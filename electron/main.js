// ============================================================
//  main — processo principal do Electron.
// ============================================================

const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const criarMenu = require('./menu');

const ARQ_ESTADO = () => path.join(app.getPath('userData'), 'janela.json');

let janela = null;

// ── geometria da janela, preservada entre sessões ──────────
async function lerEstado() {
  try {
    return JSON.parse(await fs.readFile(ARQ_ESTADO(), 'utf8'));
  } catch {
    return null;
  }
}

async function gravarEstado() {
  if (!janela || janela.isDestroyed()) return;
  const { x, y, width, height } = janela.getNormalBounds();
  try {
    await fs.writeFile(
      ARQ_ESTADO(),
      JSON.stringify({ x, y, width, height, maximizada: janela.isMaximized() })
    );
  } catch { /* estado de janela não é crítico */ }
}

// Descarta posições que caíram fora dos monitores atuais.
function visivel(estado) {
  if (!estado || !Number.isFinite(estado.x)) return false;
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return estado.x < a.x + a.width && estado.x + 200 > a.x
        && estado.y < a.y + a.height && estado.y + 100 > a.y;
  });
}

async function criarJanela() {
  const estado = await lerEstado();

  janela = new BrowserWindow({
    width:  estado?.width  ?? 1440,
    height: estado?.height ?? 900,
    x: visivel(estado) ? estado.x : undefined,
    y: visivel(estado) ? estado.y : undefined,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#f4f5f7',
    title: 'PunçãoAcad',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  if (estado?.maximizada) janela.maximize();

  criarMenu(janela);

  // Evita o flash branco: só mostra com a interface já pintada.
  // Precisa ser registrado ANTES do loadFile — o evento dispara
  // durante o carregamento e seria perdido se viesse depois.
  janela.once('ready-to-show', () => janela.show());

  // Rede de segurança: uma janela que nunca aparece deixaria o app
  // rodando invisível, sem forma de recuperá-lo.
  const garantirVisivel = setTimeout(() => {
    if (janela && !janela.isDestroyed() && !janela.isVisible()) janela.show();
  }, 8000);
  janela.once('show', () => clearTimeout(garantirVisivel));

  await janela.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  janela.on('close', gravarEstado);
  janela.on('closed', () => { janela = null; });

  // Links externos vão para o navegador padrão, nunca para dentro do app.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── IPC ────────────────────────────────────────────────────

ipcMain.handle('arquivo:salvar', async (evt, { nomeSugerido, conteudo, filtros }) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar',
    defaultPath: nomeSugerido,
    filters: filtros,
  });
  if (canceled || !filePath) return { ok: false };

  try {
    await fs.writeFile(filePath, conteudo, 'utf8');
    return { ok: true, caminho: filePath };
  } catch (erro) {
    dialog.showErrorBox('Não foi possível salvar', erro.message);
    return { ok: false, erro: erro.message };
  }
});

ipcMain.handle('arquivo:abrir', async (evt, { filtros }) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Carregar caso',
    filters: filtros,
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { ok: false };

  try {
    return { ok: true, conteudo: await fs.readFile(filePaths[0], 'utf8'), caminho: filePaths[0] };
  } catch (erro) {
    dialog.showErrorBox('Não foi possível abrir', erro.message);
    return { ok: false, erro: erro.message };
  }
});

ipcMain.handle('pdf:exportar', async (evt, { nomeSugerido }) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar relatório PDF',
    defaultPath: nomeSugerido,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false };

  try {
    // preferCSSPageSize respeita o @page A4 já definido em styles.css,
    // e printBackground preserva as tarjas coloridas do memorial.
    const pdf = await evt.sender.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      generateDocumentOutline: true,
    });
    await fs.writeFile(filePath, pdf);
    shell.openPath(filePath);
    return { ok: true, caminho: filePath };
  } catch (erro) {
    dialog.showErrorBox('Não foi possível gerar o PDF', erro.message);
    return { ok: false, erro: erro.message };
  }
});

ipcMain.handle('app:versao', () => app.getVersion());

// ── ciclo de vida ──────────────────────────────────────────

// Uma instância só: abrir de novo foca a janela existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!janela) return;
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  });

  app.whenReady().then(criarJanela);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

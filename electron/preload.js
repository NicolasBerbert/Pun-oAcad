// ============================================================
//  preload — única superfície exposta ao renderer.
//
//  contextIsolation fica ligado e nodeIntegration desligado: a
//  aplicação não enxerga Node, apenas as quatro operações abaixo.
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('puncaoAPI', {
  salvarArquivo: opcoes => ipcRenderer.invoke('arquivo:salvar', opcoes),
  abrirArquivo:  opcoes => ipcRenderer.invoke('arquivo:abrir', opcoes),
  exportarPDF:   opcoes => ipcRenderer.invoke('pdf:exportar', opcoes),
  versao:        () => ipcRenderer.invoke('app:versao'),

  // Eventos disparados pelo menu da janela.
  aoComandoDoMenu: cb => ipcRenderer.on('menu:comando', (_e, comando) => cb(comando)),
});

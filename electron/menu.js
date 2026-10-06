// ============================================================
//  menu — barra de menus nativa da janela.
//
//  Os itens de arquivo não executam nada aqui: apenas avisam o
//  renderer, que já sabe salvar, carregar e calcular. Assim há
//  um caminho só para cada ação, seja pelo menu ou pelos botões.
// ============================================================

const { Menu, dialog, app, shell } = require('electron');

module.exports = function criarMenu(janela) {
  const cmd = comando => () => janela.webContents.send('menu:comando', comando);

  const modelo = [
    {
      label: '&Arquivo',
      submenu: [
        { label: 'Novo caso',        accelerator: 'CmdOrCtrl+N',       click: cmd('novo') },
        { label: 'Carregar caso…',   accelerator: 'CmdOrCtrl+O',       click: cmd('carregar') },
        { label: 'Salvar caso…',     accelerator: 'CmdOrCtrl+S',       click: cmd('salvar') },
        { type: 'separator' },
        { label: 'Calcular',         accelerator: 'CmdOrCtrl+Enter',   click: cmd('calcular') },
        { type: 'separator' },
        { label: 'Exportar relatório PDF…', accelerator: 'CmdOrCtrl+P',       click: cmd('pdf') },
        { label: 'Exportar DXF (AutoCAD)…', accelerator: 'CmdOrCtrl+D',       click: cmd('dxf') },
        { label: 'Imprimir…',               accelerator: 'CmdOrCtrl+Shift+P', click: cmd('imprimir') },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: '&Editar',
      submenu: [
        { label: 'Desfazer',           role: 'undo' },
        { label: 'Refazer',            role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar',           role: 'cut' },
        { label: 'Copiar',             role: 'copy' },
        { label: 'Colar',              role: 'paste' },
        { label: 'Selecionar tudo',    role: 'selectAll' },
      ],
    },
    {
      label: 'E&xibir',
      submenu: [
        { label: 'Ampliar',            role: 'zoomIn' },
        { label: 'Reduzir',            role: 'zoomOut' },
        { label: 'Tamanho normal',     role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Tela cheia',         role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Recarregar',         role: 'reload' },
        { label: 'Ferramentas de desenvolvimento', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'A&juda',
      submenu: [
        {
          label: 'Sobre o PunçãoAcad',
          click: () => {
            dialog.showMessageBox(janela, {
              type: 'info',
              title: 'Sobre',
              message: 'PunçãoAcad',
              detail:
                `Versão ${app.getVersion()}\n\n` +
                'Software para dimensionamento da armadura de punção em lajes lisas ' +
                'de concreto armado, desenvolvido no âmbito do PIBIC, com financiamento ' +
                'do CNPq, na Universidade Estadual de Maringá (UEM).\n\n' +
                'Autora: Camila Aguiar Camargo\n' +
                'Orientador: Prof. Dr. Elyson Andrew Pozo Liberati\n' +
                'Colaboração técnica: Nicolas Figueiredo Berbert (UniFil – Londrina)',
              buttons: ['Fechar'],
            });
          },
        },
        {
          label: 'Código-fonte',
          click: () => shell.openExternal('https://github.com/NicolasBerbert/Pun-oAcad'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo));
};

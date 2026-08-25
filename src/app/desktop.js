/* global window, document, Blob, URL, FileReader */

// ============================================================
//  desktop — ponte entre a aplicação e o processo principal.
//
//  Cada função tenta primeiro a via nativa (diálogos do Windows,
//  exposta pelo preload em window.puncaoAPI). Se ela não existir,
//  cai no comportamento original de navegador. Assim o mesmo
//  código da aplicação roda no executável e na web.
// ============================================================

const API = () => window.puncaoAPI;

// Nome de arquivo seguro para o sistema de arquivos.
function nomeSeguro(nome, padrao) {
  return (nome || padrao).replace(/[\/:*?"<>|]/g, '-').trim() || padrao;
}

// Salva texto em disco. No app, abre o "Salvar como…" do Windows.
window.salvarArquivo = async function (nomeSugerido, conteudo, filtro) {
  const nome = nomeSeguro(nomeSugerido, 'puncao');

  if (API()) {
    return API().salvarArquivo({
      nomeSugerido: `${nome}.${filtro.extensions[0]}`,
      conteudo,
      filtros: [filtro, { name: 'Todos os arquivos', extensions: ['*'] }],
    });
  }

  const blob = new Blob([conteudo], { type: filtro.mime || 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${nome}.${filtro.extensions[0]}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true };
};

// Lê um arquivo de texto escolhido pelo usuário. Resolve com null se cancelado.
window.abrirArquivo = async function (filtro) {
  if (API()) {
    const r = await API().abrirArquivo({
      filtros: [filtro, { name: 'Todos os arquivos', extensions: ['*'] }],
    });
    return r.ok ? r.conteudo : null;
  }

  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filtro.extensions.map(e => `.${e}`).join(',');
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsText(f);
    };
    input.click();
  });
};

// Gera o memorial em PDF. No app, grava o arquivo direto — sem
// passar pela caixa de impressão do navegador.
window.exportarPDF = async function (nomeSugerido) {
  if (API()) {
    return API().exportarPDF({
      nomeSugerido: `${nomeSeguro(nomeSugerido, 'puncao')}.pdf`,
    });
  }
  window.print();
  return { ok: true };
};

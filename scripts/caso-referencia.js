// Caso de referência dos testes: "Atividade 1 — punção em pilar centrado
// com momentos nas duas direções" (Programa Master PEC IBRACON). O app abre
// em branco; os smoke tests gravam este caso no localStorage e recarregam.
const CASO_REFERENCIA = {
  secao: 'retangular',
  posicao: 'centro',
  C1: 40, C2: 25, diam: null,
  Fsk: 435, Mxk: 18300, Myk: 13400,
  h: 17, fck: 35, fyk: 500,
  cobrimento: 2.5,
  camadaExterna: 'y',
  phi_lx: 12.5, s_x: 15,
  phi_ly: 12.5, s_y: 15,
  studs: null,
  tipoArm: 'estribo',
  espac: null,
  u3_manual: null,
  axial: null,
  ccp: null,
};

async function carregarCasoReferencia(win) {
  await win.webContents.executeJavaScript(`(() => {
    localStorage.setItem('puncao_data', ${JSON.stringify(JSON.stringify(CASO_REFERENCIA))});
    localStorage.setItem('puncao_name', 'Caso de referência');
  })()`);
  await win.webContents.reload();
  await new Promise(r => setTimeout(r, 2000));
}

module.exports = { CASO_REFERENCIA, carregarCasoReferencia };

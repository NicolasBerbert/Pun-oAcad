// ============================================================
//  Teste de referência — "Atividade 1: punção em pilar centrado
//  com momentos nas duas direções" (Programa Master PEC IBRACON).
//
//  Esse exercício resolvido é o critério de aceitação do app: se
//  algum valor aqui deixar de bater, a rotina de cálculo regrediu.
//  Rode sempre após mexer em app/calc.js.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const raiz = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

// calc.js é um script clássico que se pendura em window
const janela = {};
new Function('window', fs.readFileSync(path.join(raiz, 'src', 'app', 'calc.js'), 'utf8'))(janela);
export const calcularPuncao = janela.calcularPuncao;

export const CASO = {
  secao: 'retangular', posicao: 'centro',
  C1: 40, C2: 25, diam: null,
  Fsk: 435, Mxk: 18300, Myk: 13400,
  h: 17, fck: 35, fyk: 500,
  cobrimento: 2.5, camadaExterna: 'y',
  phi_lx: 12.5, s_x: 15, phi_ly: 12.5, s_y: 15,
  studs: null, tipoArm: 'estribo', espac: null, u3_manual: null,
};

// valor esperado, casas decimais conferidas
const ESPERADO = [
  ['dy',        13.88, 2], ['dx',       12.63, 2], ['d',        13.25, 2],
  ['fcd',       25.00, 2], ['fyd',     434.78, 2], ['fywd',     268.5, 1],
  ['Fsd',      609.00, 2], ['Msd1x',    25620, 0], ['Msd1y',    18760, 0],
  ['u1',       130.00, 2], ['u2',      296.50, 2],
  ['rho',     0.00618, 5], ['rox',    0.00648, 5], ['roy',    0.00590, 5],
  ['alphaV',    0.860, 3], ['tauRd2',    5.81, 2], ['tauSd_C',   3.54, 2],
  ['kx',       0.6600, 4], ['ky',      0.4875, 4],
  ['Wpx',     9264.09, 2], ['Wpy',    8322.81, 2],
  // NBR 6118:2023 limita o coeficiente de escala: ke = mín(2,2286 ; 2) = 2.
  // A planilha Mathcad de referência é anterior a esse limite e traz
  // tauRd1 = 0,8073; o app segue a norma vigente (decisão de 25/08/2026).
  ['tauSd_Cl',   3.76, 2],
  ['fator_d_bruto', 2.2286, 4], ['fator_d', 2.0000, 4], ['tauRd1', 0.7245, 4],
];

function conferir(R, lista, rotulo) {
  let falhas = 0;
  for (const [chave, esperado, casas] of lista) {
    const obtido = chave.split('.').reduce((o, k) => o?.[k], R);
    const ok = Number.isFinite(obtido) &&
               // <= porque o esperado vem do PDF, já arredondado: 13,875 exibido
               // como 13,88 dista exatamente meia casa do valor exato.
               Math.abs(obtido - esperado) <= 0.5 * Math.pow(10, -casas) + 1e-9;
    if (!ok) {
      falhas++;
      console.log(`  FALHOU  ${chave}: esperado ${esperado}, obtido ${obtido}`);
    }
  }
  console.log(`${falhas ? '  ✗' : '  ✓'} ${rotulo}: ${lista.length - falhas}/${lista.length}`);
  return falhas;
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  let falhas = conferir(calcularPuncao(CASO), ESPERADO, 'caso sem armadura de punção');

  // com armadura adotada no exercício (s0/sr/se = 7/10/21)
  const comArm = calcularPuncao({
    ...CASO, studs: { phi: 10, nconec: 8, ncam: 3 }, espac: { s0: 7, sr: 10, se: 21 },
  });
  falhas += conferir(comArm, [
    ['s0_lim', 6.625, 3], ['sr_lim', 9.9375, 4], ['se_lim', 26.5, 2],
    ['etapa9.p', 27.0, 2], ['etapa9.u3_calc', 466.15, 2],
  ], 'caso com armadura de punção');

  process.exit(falhas ? 1 : 0);
}

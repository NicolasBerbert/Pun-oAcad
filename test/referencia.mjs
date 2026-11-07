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
  // a Atividade 1 (e o LPunc) verificam o contorno C só com a força
  momentoC: false,
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

// ============================================================
//  Pilar CIRCULAR — "Atividade 4: punção em pilar centrado com
//  momentos nas duas direções e com ábaco" (Master PEC IBRACON).
//
//  Aqui o caso entra SEM o ábaco, e conferem-se só as grandezas que
//  não dependem dele. O exercício completo, com ábaco, está em
//  test/abaco.mjs.
//
//  Taxa de armadura: o exercício declara y = Ø12,5 c/10 (sy = 10 e
//  Asy = 12,27 cm²/m), mas a fórmula de qy divide por 15 cm. O ρ do
//  exercício (0,00504) só se reproduz com sy = 15, que é o valor que
//  ele de fato usou — por isso o caso abaixo entra com s_y = 15. Com o
//  sy = 10 declarado, ρy = 0,00727 (conferido logo depois).
//  Como q é usado sem arredondar, ρ = As1/(s·d) e não depende da
//  largura da faixa (3d + Ø + 3d) nem do d adotado para ela.
// ============================================================
export const CASO_CIRCULAR = {
  secao: 'circular', posicao: 'centro',
  C1: null, C2: null, diam: 60,
  Fsk: 555.35, Mxk: 5350, Myk: 1360,
  h: 20, fck: 40, fyk: 500,
  cobrimento: 2.5, camadaExterna: 'y',
  phi_lx: 12.5, s_x: 15, phi_ly: 12.5, s_y: 15,
  studs: null, tipoArm: 'conector', espac: null, u3_manual: null,
};

const ESPERADO_CIRCULAR = [
  ['dx',        15.63, 2], ['dy',       16.88, 2],
  ['fcd',       28.57, 2], ['fyd',     434.78, 2],
  ['Fsd',      777.49, 2], ['Msd1x',     7490, 0], ['Msd1y',     1904, 0],
  ['u1',        188.5, 1],                         // u0 no exercício
  // o exercício usa π = 3,14 em As1Ø: 0,005233 contra 0,005236 exato
  ['rox',     0.00523, 5, 1e-5], ['roy',  0.00485, 5], ['rho',  0.00504, 5],
  ['alphaV',     0.84, 2], ['tauRd2',     6.48, 2],
  ['kx',          0.6, 2], ['ky',          0.6, 2],
  // conector, h = 20 cm: 300 + (20 − 15)·135/20
  ['fywd',     333.75, 2],
  // daqui em diante as fórmulas do item 19.5.2.3 com o d do app
  // (d = (dx + dy)/2 = 16,25; o exercício arredonda para d = 17)
  ['d',         16.25, 2],
  ['u2',       392.70, 2],                         // π·(Ø + 4d)
  ['Wpx',     15625.0, 1], ['Wpy',    15625.0, 1], // (Ø + 4d)²
];

export function conferir(R, lista, rotulo) {
  let falhas = 0;
  for (const [chave, esperado, casas, tol] of lista) {
    const obtido = chave.split('.').reduce((o, k) => o?.[k], R);
    const ok = Number.isFinite(obtido) &&
               // <= porque o esperado vem do PDF, já arredondado: 13,875 exibido
               // como 13,88 dista exatamente meia casa do valor exato.
               Math.abs(obtido - esperado) <= (tol ?? 0.5 * Math.pow(10, -casas)) + 1e-9;
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

  // a versão mais nova da Atividade 1 trata a armadura como studs:
  // fywd = 300 + (17 − 15)·(435 − 300)/20 = 313,5 MPa
  falhas += conferir(calcularPuncao({ ...CASO, tipoArm: 'conector' }), [
    ['fywd', 313.5, 1], ['fywdBase', 300, 0],
  ], 'fywd de conector (studs)');

  // contorno C com os momentos (padrão do app, 19.5.3.1 com u0 e Wp0):
  // Wp0x = C1²/2 + C1·C2 = 1800 e Wp0y = C2²/2 + C1·C2 = 1312,5 cm²
  falhas += conferir(calcularPuncao({ ...CASO, momentoC: true }), [
    ['Wp0x', 1800, 1], ['Wp0y', 1312.5, 1], ['tauSd_C_F', 3.54, 2],
  ], 'contorno C com momentos');

  // colapso progressivo (19.5.4): fyd·As,ccp ≥ 1,5·FSd, FSd com γf = 1,2.
  // O LPunc dá 18,01 cm² necessários para este caso (things/Teste 1).
  falhas += conferir(calcularPuncao({
    ...CASO, ccp: { ativo: true, phi_h: 10, s_h: 10, phi_v: 10, s_v: 10 },
  }), [
    ['colapso.Fsd_ccp', 522.0, 1], ['colapso.As_nec', 18.01, 2],
  ], 'colapso progressivo (LPunc)');

  // σcp (19.5.3.2): com σcp,x ou σcp,y ≤ 1 MPa o efeito favorável é desprezado
  const sigmaBaixo = calcularPuncao({ ...CASO, axial: { Nsdx: 120, Nsdy: 80, Ac: 1700 } });
  const sigmaAlto = calcularPuncao({ ...CASO, axial: { Nsdx: 3400, Nsdy: 2550, Ac: 1700 } });
  falhas += conferir({ baixo: sigmaBaixo.sigma_cp, alto: sigmaAlto.sigma_cp, rd1: sigmaBaixo.tauRd1 }, [
    ['baixo', 0, 3], ['alto', 3.5, 3], ['rd1', 0.7245, 4],
  ], 'σcp desprezado abaixo de 1 MPa e limitado a 3,5 MPa');

  falhas += conferir(calcularPuncao(CASO_CIRCULAR), ESPERADO_CIRCULAR,
    'pilar circular (Atividade 4)');

  // mesmo caso com o sy = 10 que o enunciado declara
  falhas += conferir(calcularPuncao({ ...CASO_CIRCULAR, s_y: 10 }), [
    ['roy', 0.00727, 5], ['rho', 0.00617, 5],
  ], 'pilar circular com sy = 10');

  // C″ circular: contorno de raio Ø/2 + 2d + p
  const circArm = calcularPuncao({
    ...CASO_CIRCULAR, studs: { phi: 10, nconec: 12, ncam: 3 }, espac: { s0: 8, sr: 12, se: 30 },
  });
  const r = 60 + 4 * circArm.d + 2 * 32;   // p = 8 + 2·12 = 32
  falhas += conferir(circArm, [
    ['etapa9.p', 32, 2],
    ['etapa9.u3_calc', Math.PI * r, 6], ['etapa9.WpxCpp', r * r, 6],
  ], 'pilar circular com armadura de punção');

  process.exit(falhas ? 1 : 0);
}

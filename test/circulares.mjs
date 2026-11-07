// ============================================================
//  Teste de referência — "Punção em lajes lisas com pilares
//  circulares: lista de exercícios resolvidos (NBR 6118:2023,
//  item 19.5)". Cinco exercícios, cada um conferido com os valores
//  da resolução. Rode sempre após mexer em app/calc.js.
//
//  Os valores esperados vêm do PDF, já arredondados; a tolerância é
//  meia unidade na última casa exibida.
// ============================================================

import { calcularPuncao, conferir } from './referencia.mjs';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const raiz = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const janela = {};
new Function('window', fs.readFileSync(path.join(raiz, 'src', 'app', 'calc.js'), 'utf8'))(janela);
const dimensionarArmadura = janela.dimensionarArmadura;

const BASE = {
  secao: 'circular', posicao: 'centro', C1: null, C2: null,
  Mxk: 0, Myk: 0, fyk: 500, cobrimento: 2.5,
  camadaExterna: 'x',            // todos os exercícios: direção x na camada externa
  studs: null, tipoArm: 'conector', espac: null, u3_manual: null,
};

// ── Exercício 1 — carga simétrica, redução de FSd, colapso progressivo ──
// Arranjo do colapso: 4 φ16 em cada direção atravessando o pilar de 50 cm
// → espaçamento de 12,5 cm (50/12,5 = 4 barras por direção).
export const EX1 = {
  ...BASE, diam: 50, h: 22, fck: 30, Fsk: 360,
  phi_lx: 12.5, s_x: 10, phi_ly: 12.5, s_y: 10,
  distrib: { ativo: true, gq: 8.5 },
  ccp: { ativo: true, phi_h: 16, s_h: 12.5, phi_v: 16, s_v: 12.5 },
};
const ESP_EX1 = [
  ['dx', 18.88, 2], ['dy', 17.62, 2], ['d', 18.25, 2],
  ['fcd', 21.43, 2], ['fyd', 434.78, 2], ['Fsd', 504.0, 1],
  ['u1', 157.1, 1], ['u2', 386.4, 1], ['faixaX', 159.5, 1],
  ['rox', 0.00650, 5], ['roy', 0.00696, 5], ['rho', 0.00673, 5],
  ['alphaV', 0.880, 3], ['tauRd2', 5.09, 2], ['tauSd_C', 1.76, 2],
  ['fator_d_bruto', 2.047, 3], ['fator_d', 2.00, 2], ['tauRd1', 0.708, 3],
  ['reducao.pd', 11.90, 2], ['reducao.area', 1.188, 3], ['reducao.dF', 14.14, 2],
  ['reducao.Fsd_red', 489.86, 2],
  ['reducao.tauSd_sem', 0.715, 3],      // a) sem redução: não passa
  ['tauSd_Cl', 0.695, 3],               // b) com redução: passa
  ['colapso.Fsd_ccp', 432.0, 1], ['colapso.As_nec', 14.90, 2],
  ['colapso.As_ccp', 16.08, 2],
];

// ── Exercício 2 — Mx e My, ke ≤ 2, ampliação de τRd2 ──
export const EX2 = {
  ...BASE, diam: 45, h: 18, fck: 35, Fsk: 170, Mxk: 1500, Myk: 900,
  phi_lx: 10, s_x: 10, phi_ly: 10, s_y: 12.5,
  ampliaRd2: true,
};
const ESP_EX2 = [
  ['dx', 15.00, 2], ['dy', 14.00, 2], ['d', 14.50, 2],
  ['fcd', 25.00, 2], ['Fsd', 238.0, 1], ['Msd1x', 2100, 0], ['Msd1y', 1260, 0],
  ['u1', 141.4, 1], ['u2', 323.6, 1],
  ['Wp0x', 2025, 0], ['Wpx', 10609, 0], ['Wpy', 10609, 0],
  ['faixaX', 132.0, 1], ['rox', 0.00524, 5], ['roy', 0.00449, 5], ['rho', 0.00485, 5],
  ['alphaV', 0.860, 3], ['tauRd2_base', 5.81, 2], ['tauRd2', 6.97, 2],
  ['tauSd_C_F', 1.161, 3], ['tauSd_C_Mx', 0.429, 3], ['tauSd_C_My', 0.257, 3],
  ['tauSd_C', 1.85, 2],
  ['tauSd_Cl_F', 0.507, 3], ['tauSd_Cl_Mx', 0.082, 3], ['tauSd_Cl_My', 0.049, 3],
  ['tauSd_Cl', 0.638, 3],
  ['fator_d_bruto', 2.174, 3], ['tauRd1', 0.668, 3],
];

// ── Exercício 3 — capitel curto (ℓc = 30 → só C′2) ──
// No app o capitel entra como ábaco (mesmo item 19.5.2.5), pela dimensão em
// planta: Lt = 100 → ℓc = (100 − 40)/2 = 30.
export const EX3 = {
  ...BASE, diam: 40, h: 18, fck: 30, Fsk: 270, Mxk: 4000, Myk: 2000,
  phi_lx: 12.5, s_x: 12.5, phi_ly: 12.5, s_y: 15,
  abaco: { ativo: true, hc: 35, Lt: 100 },
};
const ESP_EX3 = [
  ['dx', 14.88, 2], ['dy', 13.62, 2], ['d', 14.25, 2],
  ['abaco.dcx', 31.875, 3], ['abaco.dcy', 30.625, 3], ['abaco.dc', 31.25, 2],
  ['abaco.lim1', 34.0, 1], ['abaco.lim2', 62.5, 1],
  ['Fsd', 378.0, 1], ['Msd1x', 5600, 0], ['Msd1y', 2800, 0],
  ['u1', 125.7, 1], ['Wp0x', 1600, 0], ['dC', 31.25, 2],
  ['rox', 0.00660, 5], ['roy', 0.00600, 5], ['rho', 0.00630, 5],
  ['tauRd2', 5.09, 2],
  ['tauSd_C_F', 0.963, 3], ['tauSd_C_Mx', 0.672, 3], ['tauSd_C_My', 0.336, 3], ['tauSd_C', 1.97, 2],
  // C′2: R2 = Ø/2 + ℓc + 2d = 78,50
  ['u2', 493.2, 1], ['Wpx', 24649, 0],
  ['tauSd_Cl_F', 0.538, 3], ['tauSd_Cl_Mx', 0.096, 3], ['tauSd_Cl_My', 0.048, 3],
  ['tauSd_Cl', 0.681, 3],
  ['fator_d_bruto', 2.185, 3], ['tauRd1', 0.692, 3],
];

// ── Exercício 4 — abertura 40 × 60 a 80 cm da face, no eixo x ──
export const EX4 = {
  ...BASE, diam: 60, h: 22, fck: 35, Fsk: 330,
  phi_lx: 12.5, s_x: 12.5, phi_ly: 12.5, s_y: 12.5,
  abertura: { ativo: true, dist: 80, larg: 60, dir: '+x' },
  ampliaRd2: true,   // pedida, mas a abertura junto ao pilar impede
};
const ESP_EX4 = [
  ['dx', 18.88, 2], ['dy', 17.62, 2], ['d', 18.25, 2],
  ['fcd', 25.00, 2], ['Fsd', 462.0, 1],
  ['abertura.lim8d', 146.0, 1], ['abertura.x1', 110, 0],
  ['abertura.theta', 0.5325, 4],
  ['u1', 188.5, 1], ['u2_bruto', 417.8, 1], ['du2', 35.4, 1], ['u2', 382.4, 1],
  ['faixaX', 169.5, 1], ['rox', 0.00520, 5], ['roy', 0.00557, 5], ['rho', 0.00538, 5],
  ['tauRd2', 5.81, 2], ['tauSd_C', 1.34, 2],
  ['tauRd1', 0.692, 3], ['tauSd_Cl', 0.662, 3],
];

// ── Exercício 5 — armadura de punção (studs Ø10, fywd = 300 MPa) ──
// A resolução mantém fywd = 300 MPa sem o aumento por espessura e adota
// 12 linhas radiais × 3 conectores, s0 = 10 cm e sr = 15 cm.
export const EX5 = {
  ...BASE, diam: 50, h: 25, fck: 30, Fsk: 650, Mxk: 5000,
  phi_lx: 16, s_x: 10, phi_ly: 16, s_y: 10,
  tipoArm: 'conector', fywdAumento: false,
  studs: { phi: 10, nconec: 12, ncam: 3 },
  espac: { s0: 10, sr: 15 },
};
const ESP_EX5 = [
  ['dx', 21.70, 2], ['dy', 20.10, 2], ['d', 20.90, 2],
  ['Fsd', 910.0, 1], ['Msd1x', 7000, 0],
  ['u1', 157.1, 1], ['Wp0x', 2500, 0], ['u2', 419.7, 1], ['Wpx', 17849, 0],
  ['faixaX', 175.4, 1], ['rox', 0.00927, 5], ['roy', 0.01000, 5], ['rho', 0.00963, 5],
  ['tauRd2', 5.09, 2], ['tauSd_C_F', 2.772, 3], ['tauSd_C_Mx', 0.804, 3], ['tauSd_C', 3.58, 2],
  ['tauSd_Cl', 1.150, 3], ['fator_d', 1.978, 3], ['tauRd1', 0.789, 3],
  ['s0_lim', 10.45, 2], ['sr_lim', 15.67, 2], ['se_lim', 41.8, 1],
  ['fywd', 300, 0],
  ['tauRd3_c', 0.607, 3], ['studs.Asw', 9.42, 2], ['tauRd3', 1.281, 3],
  ['studs.se_real', 34.0, 1],
  ['etapa9.p', 40, 0], ['etapa9.u3', 671.0, 1], ['etapa9.WpxCpp', 45625, 0],
  ['etapa9.tauSd_Cpp', 0.693, 3],
];

// ============================================================
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  let falhas = 0;
  const veredito = (cond, rotulo) => {
    console.log(`${cond ? '  ✓' : '  ✗'} ${rotulo}`);
    if (!cond) falhas++;
  };

  // 1
  const R1 = calcularPuncao(EX1);
  falhas += conferir(R1, ESP_EX1, 'Ex. 1 — valores');
  veredito(R1.verif1 && R1.reducao.tauSd_sem > R1.tauRd1 && R1.verif2 && R1.colapso.verif5,
    'Ex. 1 — C OK; C′ só passa com a redução de FSd; colapso OK');

  // 2
  const R2 = calcularPuncao(EX2);
  falhas += conferir(R2, ESP_EX2, 'Ex. 2 — valores');
  // τRd1 sem o limite ke ≤ 2: superestimativa de 8,7%
  const semLimite = 0.13 * R2.fator_d_bruto * Math.pow(100 * R2.rho * 35, 1 / 3);
  falhas += conferir({ semLimite, erro: semLimite / R2.tauRd1 - 1 },
    [['semLimite', 0.726, 3], ['erro', 0.087, 3]], 'Ex. 2 — erro sem o limite de ke');
  veredito(R2.verif1 && R2.ampliaRd2 && R2.verif2, 'Ex. 2 — C OK (τRd2 ampliado); C′ OK');

  // 3
  const R3 = calcularPuncao(EX3);
  falhas += conferir(R3, ESP_EX3, 'Ex. 3 — valores');
  veredito(R3.abaco.caso === 'C2' && R3.abaco.contornos.length === 1 &&
           R3.abaco.contornos[0].nome === 'C′2', 'Ex. 3 — ℓc = 30: verificar apenas C′2');
  const caso = lc => calcularPuncao({ ...EX3, abaco: { ativo: true, hc: 35, Lt: 40 + 2 * lc } }).abaco.caso;
  veredito(caso(50) === 'C1', 'Ex. 3 — ℓc = 50: verificar apenas C′1');
  veredito(caso(80) === 'C1C2', 'Ex. 3 — ℓc = 80: verificar C′1 e C′2');
  veredito(R3.verif1 && R3.verif2, 'Ex. 3 — C OK; C′2 OK');

  // 4
  const R4 = calcularPuncao(EX4);
  falhas += conferir(R4, ESP_EX4, 'Ex. 4 — valores');
  falhas += conferir({ graus: R4.abertura.theta * 180 / Math.PI }, [['graus', 30.51, 2]],
    'Ex. 4 — ângulo entre as tangentes');
  const semAbertura = calcularPuncao({ ...EX4, abertura: null, ampliaRd2: false });
  falhas += conferir({ t: semAbertura.tauSd_Cl, r: R4.tauSd_Cl / semAbertura.tauSd_Cl },
    [['t', 0.606, 3], ['r', 1.093, 3]], 'Ex. 4 — comparação sem a abertura');
  veredito(R4.abertura.influi && !R4.abertura.limitaFaixa && R4.ampliaPedida && !R4.ampliaRd2,
    'Ex. 4 — abertura influi, não limita a faixa e impede a ampliação de τRd2');
  veredito(R4.verif1 && R4.verif2, 'Ex. 4 — C OK; C′ OK');

  // 5
  const R5 = calcularPuncao(EX5);
  falhas += conferir(R5, ESP_EX5, 'Ex. 5 — valores');
  const R5sem = calcularPuncao({ ...EX5, studs: null });
  veredito(R5.verif1 && !R5sem.verif2 && R5.verif3 && R5.studs.se_ok && R5.etapa9.verif4,
    'Ex. 5 — C OK; C′ exige armadura; C′ com 12×3 OK; se ≤ 2d; C″ OK');
  // seleção automática: menor nconec par que atende C′ (Asw ≥ 7,60 cm² → 10)
  // e, com ele, 3 camadas (p ≥ 27,8 cm)
  const auto = dimensionarArmadura({ ...EX5, studs: { phi: 10 } });
  veredito(auto.ok && auto.nconec === 10 && auto.ncam === 3 && !auto.seExcedido,
    `Ex. 5 — seleção automática: ${auto.nconec} × ${auto.ncam} (resolução: ≥ 9,67 → 10 linhas, 3 conectores)`);

  process.exit(falhas ? 1 : 0);
}

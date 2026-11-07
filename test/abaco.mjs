// ============================================================
//  Teste de referência — laje com ábaco em pilar circular:
//  "Atividade 4: punção em pilar centrado com momentos fletores
//  atuantes nas duas direções e com ábaco" (Master PEC IBRACON).
//
//  O exercício usa d = 17 cm e dc = 42 cm, arredondados de h − 3 e
//  hc − 3, mas calcula ρ com dx e dy do cobrimento real (2,5 cm). Por
//  isso há dois casos:
//    • GEOMETRIA — cobrimento 1,75 cm, que reproduz d = 17 e dc = 42:
//      perímetros, da, classificação e tensões no contorno C;
//    • ENUNCIADO — cobrimento 2,5 cm, que reproduz ρ = 0,00504 e o τRd1
//      de C′1 (da = ℓc/2 − (hc − h) = 25 cm não depende do cobrimento).
//
//  Onde o app segue a NBR 6118:2023 e o exercício não:
//    • Wp em C′1 e C′2: a norma define Wp = ∫|e|·dℓ sobre o contorno
//      verificado, (2R)² num círculo de raio R. O exercício usa
//      (Ø + 4da)² em C′1 e (Ø + 4d)² em C′2, que ignoram o afastamento
//      do contorno. As parcelas da força conferem; as dos momentos ficam
//      menores no app, e as duas verificações passam nos dois cálculos.
//    • ke ≤ 2: em C′2 o exercício usa 1 + √(20/17) = 2,085 (norma
//      anterior); o app limita a 2.
// ============================================================

import { calcularPuncao, conferir } from './referencia.mjs';
import url from 'node:url';

const BASE = {
  secao: 'circular', posicao: 'centro', C1: null, C2: null, diam: 60,
  Fsk: 555.35, Mxk: 5350, Myk: 1360,
  h: 20, fck: 40, fyk: 500, camadaExterna: 'y',
  // o exercício declara y = Ø12,5 c/10, mas calcula qy com 15 cm
  phi_lx: 12.5, s_x: 15, phi_ly: 12.5, s_y: 15,
  studs: null, tipoArm: 'estribo', espac: null, u3_manual: null,
  // "para este perímetro crítico, não se considera a influência do momento fletor"
  momentoC: false,
  abaco: { ativo: true, hc: 45, Lt: 260 },   // Lc = (260 − 60)/2 = 100
};

export const GEOMETRIA = { ...BASE, cobrimento: 1.75 };
export const ENUNCIADO = { ...BASE, cobrimento: 2.5 };

const contorno = (R, nome) => R.abaco.contornos.find(c => c.nome === nome);

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  let falhas = 0;
  const veredito = (cond, rotulo) => {
    console.log(`${cond ? '  ✓' : '  ✗'} ${rotulo}`);
    if (!cond) falhas++;
  };

  // ── geometria: d = 17, dc = 42 ──
  const G = calcularPuncao(GEOMETRIA);
  const g1 = contorno(G, 'C′1'), g2 = contorno(G, 'C′2');
  falhas += conferir(G, [
    ['d', 17, 2], ['abaco.dc', 42, 2], ['abaco.lc', 100, 1], ['abaco.Lt', 260, 1],
    ['fcd', 28.57, 2], ['Fsd', 777.49, 2], ['Msd1x', 7490, 0], ['Msd1y', 1904, 0],
    ['u1', 188.5, 1],                         // u0 no exercício
    ['alphaV', 0.84, 2], ['tauRd2', 6.48, 2],
    ['dC', 42, 2], ['tauSd_C', 0.982, 3],     // Fsd/(u0·dc)
    ['abaco.lim1', 50, 1], ['abaco.lim2', 84, 1], ['abaco.da', 25, 2],
  ], 'Atividade 4 — geometria, contorno C e classificação');
  veredito(G.abaco.caso === 'C1C2' && G.abaco.contornos.length === 2,
    'Atividade 4 — Lc = 100 > 2dc = 84: verificar C′1 e C′2');
  falhas += conferir({ g1, g2 }, [
    ['g1.u', 716.28, 2],                      // 2π·(Ø/2 + 2dc)
    ['g1.d', 25, 2],
    ['g1.tauSd_F', 0.434, 3],                 // Fsd/(u1·da), mesma parcela do exercício
    ['g2.u', 1030.44, 2],                     // 2π·(Ø/2 + Lc + 2d)
    ['g2.d', 17, 2],
    ['g2.tauSd_F', 0.444, 3],                 // Fsd/(u2·d)
    // Wp do próprio contorno (norma): (2R)²
    ['g1.Wpx', 228 * 228, 0], ['g2.Wpx', 328 * 328, 0],
  ], 'Atividade 4 — contornos C′1 e C′2');

  // ── enunciado: ρ e τRd1 ──
  const E = calcularPuncao(ENUNCIADO);
  const e1 = contorno(E, 'C′1');
  falhas += conferir({ E, e1 }, [
    ['E.rox', 0.00523, 5, 1e-5], ['E.roy', 0.00485, 5], ['E.rho', 0.00504, 5],
    ['E.abaco.da', 25, 2],
    // 0,6701 no exercício, com π = 3,14 em As1Ø; o app dá 0,67020
    ['e1.ke', 1.894, 3], ['e1.tauRd1', 0.670, 3],
  ], 'Atividade 4 — ρ e τRd1 em C′1');

  // τSd do exercício, com o Wp que ele adota, para registrar a diferença
  const tauEx = (u, dd, Wp) => 10 * (777.49 / (u * dd) + 0.6 * 7490 / (Wp * dd) + 0.6 * 1904 / (Wp * dd));
  falhas += conferir({
    c1: tauEx(716.28, 25, (60 + 4 * 25) ** 2),
    c2: tauEx(1030.44, 17, (60 + 4 * 17) ** 2),
  }, [['c1', 0.52, 2], ['c2', 0.65, 2]], 'Atividade 4 — τSd com o Wp do exercício (referência)');

  veredito(G.verif1 && G.verif2 && g1.ok && g2.ok && E.verif1 && E.verif2,
    'Atividade 4 — C, C′1 e C′2 atendidos, como no exercício');

  // ábaco só existe no pilar circular
  const ret = calcularPuncao({ ...ENUNCIADO, secao: 'retangular', C1: 60, C2: 60 });
  veredito(!ret.error && ret.abaco === null, 'ábaco ignorado no pilar retangular');

  process.exit(falhas ? 1 : 0);
}

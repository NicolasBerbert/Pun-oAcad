// ============================================================
//  PunçãoAcad — Rotina de Cálculo (pura)
//  ABNT NBR 6118:2023 — Pilar interno com momentos nas duas direções
//  Seção retangular ou circular · conector ou estribo
//
//  Unidades de entrada: cm (geometria), kN e kN·cm (esforços),
//  MPa (materiais), mm (bitolas).
//  Tensões internas são calculadas em kN/cm² e convertidas: 1 kN/cm² = 10 MPa.
// ============================================================

// Interpolação do coeficiente K (tabela item 19.5.2.3) — pilar retangular
function interpolarK(C1, C2) {
  const razao = C1 / C2;
  const tab = [
    { r: 0.5, k: 0.45 },
    { r: 1.0, k: 0.60 },
    { r: 2.0, k: 0.70 },
    { r: 3.0, k: 0.80 },
  ];
  if (razao <= tab[0].r) return tab[0].k;
  if (razao >= tab[tab.length - 1].r) return tab[tab.length - 1].k;
  for (let i = 0; i < tab.length - 1; i++) {
    if (razao >= tab[i].r && razao <= tab[i + 1].r) {
      const t = (razao - tab[i].r) / (tab[i + 1].r - tab[i].r);
      return tab[i].k + t * (tab[i + 1].k - tab[i].k);
    }
  }
  return 0.6;
}

// Recebe um objeto com TODAS as entradas e retorna o resultado completo,
// ou um objeto { error, missing }.
function calcularPuncao(inputs) {
  const {
    secao,          // 'retangular' | 'circular'
    C1, C2, diam,   // cm
    Fsk, Mxk, Myk,  // kN, kN·cm
    h, fck, fyk,    // cm, MPa, MPa
    cobrimento,     // cm
    camadaExterna,  // 'y' (padrão) | 'x' — direção da camada mais próxima do topo
    phi_lx, s_x,    // mm, cm
    phi_ly, s_y,    // mm, cm
    studs,          // opcional: { phi (mm), nconec, ncam }
    tipoArm,        // 'estribo' (padrão) | 'conector' — base de fywd (item 19.4.2)
    espac,          // opcional: { s0, sr, se } adotados em cm
    u3_manual,      // opcional: perímetro C″ medido em CAD (cm)
  } = inputs;

  // Pilar circular interno tem tratamento próprio (item 19.5.2.3):
  // u = π·Ø, K = 0,6 e Wp = (Ø + 4d)². cC1/cC2 = Ø servem para as faixas de ρ.
  const circ = secao === 'circular';
  const D = circ ? diam : null;
  const cC1 = circ ? diam : C1;
  const cC2 = circ ? diam : C2;

  // Validação — dimensões/materiais devem ser estritamente positivos.
  // Fsk pode ser negativo (uplift); o cálculo usa |Fsd| pois a punção depende
  // da magnitude da força excêntrica, não do sentido convencionado pelo usuário.
  const needPos = { cC1, cC2, h, fck, fyk, cobrimento, phi_lx, s_x, phi_ly, s_y };
  for (const k in needPos) {
    const v = needPos[k];
    if (!Number.isFinite(v) || v <= 0) {
      return { error: 'missing', missing: k };
    }
  }
  if (!Number.isFinite(Fsk) || Fsk === 0) {
    return { error: 'missing', missing: 'Fsk' };
  }

  // ── Etapa 2 — Valores de cálculo ─────────────────────────
  const gammaC = 1.4, gammaS = 1.15, gammaF = 1.4;
  const fcd = fck / gammaC;
  const fyd = fyk / gammaS;
  // Sd preservam o sinal para exibição; os τSd usam |·| pois Wp é sempre positivo
  // e a tensão de cisalhamento é direção-agnóstica (o pior caso é o módulo).
  const Fsd = gammaF * Fsk;
  const Msd1x = gammaF * (Mxk || 0);
  const Msd1y = gammaF * (Myk || 0);
  const aFsd = Math.abs(Fsd);
  const aMsd1x = Math.abs(Msd1x);
  const aMsd1y = Math.abs(Msd1y);

  // ── Etapa 1 — Alturas úteis ──────────────────────────────
  // As duas malhas de flexão ficam em camadas sobrepostas: a direção externa
  // (mais próxima do topo) tem d maior; a interna desce uma bitola inteira.
  const phi_lx_cm = phi_lx / 10;
  const phi_ly_cm = phi_ly / 10;
  const extY = camadaExterna !== 'x';
  const dy = extY
    ? h - cobrimento - phi_ly_cm / 2
    : h - cobrimento - phi_lx_cm - phi_ly_cm / 2;
  const dx = extY
    ? h - cobrimento - phi_ly_cm - phi_lx_cm / 2
    : h - cobrimento - phi_lx_cm / 2;
  const d = (dx + dy) / 2;

  if (dx <= 0 || dy <= 0) return { error: 'd_negative' };

  // ── Etapa 4 — fywd (item 19.4.2) ─────────────────────────
  // Base 250 MPa (estribos) ou 300 MPa (conectores) para h ≤ 15 cm,
  // interpolando linearmente até 435 MPa para h ≥ 35 cm.
  const tipoArmEff = tipoArm === 'conector' ? 'conector' : 'estribo';
  const fywdBase = tipoArmEff === 'conector' ? 300 : 250;
  let fywd;
  if (h <= 15) fywd = fywdBase;
  else if (h >= 35) fywd = 435;
  else fywd = fywdBase + ((h - 15) * (435 - fywdBase)) / (35 - 15);

  // ── Etapa 3 — Perímetros de controle ─────────────────────
  // Circular: u1 = π·Ø e u2 = π·(Ø + 4d) = u1 + 4π·d
  const u1 = circ ? Math.PI * D : 2 * (cC1 + cC2);
  const u2 = u1 + 4 * Math.PI * d;

  // ── Etapa 5 — Taxa de armadura passiva ρ ─────────────────
  // Faixa = dimensão do pilar + 3d para cada lado. O número de barras na
  // faixa é usado sem arredondamento: q·As1φ/faixa equivale a As1φ/s, que é
  // a área de aço por unidade de largura (definição de ρ = As/(b·d)).
  const As1_x = Math.PI * phi_lx_cm * phi_lx_cm / 4;
  const As1_y = Math.PI * phi_ly_cm * phi_ly_cm / 4;
  const faixaX = 3 * d + cC1 + 3 * d;
  const faixaY = 3 * d + cC2 + 3 * d;
  const qx_exato = faixaX / s_x;
  const qy_exato = faixaY / s_y;
  const qx = Math.round(qx_exato); // apenas para exibição
  const qy = Math.round(qy_exato);
  const rox = (qx_exato * As1_x) / (dx * faixaX);
  const roy = (qy_exato * As1_y) / (dy * faixaY);
  const rho_bruto = Math.sqrt(rox * roy);
  const rho = Math.min(rho_bruto, 0.02);

  // ── Etapa 6 — Contorno C: esmagamento da biela ───────────
  const alphaV = 1 - fck / 250;
  const tauRd2 = alphaV * fcd * 0.27;
  const tauSd_C = 10 * aFsd / (u1 * d); // kN/cm² → MPa
  const verif1 = tauSd_C <= tauRd2;

  // ── Etapa 7 — Contorno C′ sem armadura ───────────────────
  const kx = circ ? 0.6 : interpolarK(cC1, cC2);
  const ky = circ ? 0.6 : interpolarK(cC2, cC1);
  const Wpx = circ
    ? (D + 4 * d) * (D + 4 * d)
    : (cC1*cC1)/2 + cC1*cC2 + 4*cC2*d + 16*d*d + 2*Math.PI*cC1*d;
  const Wpy = circ
    ? (D + 4 * d) * (D + 4 * d)
    : (cC2*cC2)/2 + cC2*cC1 + 4*cC1*d + 16*d*d + 2*Math.PI*cC2*d;
  const tauSd_Cl_F = 10 * aFsd / (u2 * d);              // parcela da força
  const tauSd_Cl_Mx = 10 * kx * aMsd1x / (Wpx * d);     // parcela de Mx
  const tauSd_Cl_My = 10 * ky * aMsd1y / (Wpy * d);     // parcela de My
  const tauSd_Cl = tauSd_Cl_F + tauSd_Cl_Mx + tauSd_Cl_My;
  const fator_d = 1 + Math.sqrt(20 / d);
  const tauRd1 = 0.13 * fator_d * Math.pow(100 * rho * fck, 1/3);
  const verif2 = tauSd_Cl <= tauRd1;
  const precisaArm = !verif2;

  // ── Etapa 8 — Contorno C′ com armadura ───────────────────
  const s0_lim = 0.5 * d;
  const sr_lim = 0.75 * d;
  const se_lim = 2 * d;
  // Espaçamentos adotados pelo projetista (arredondados para baixo na prática).
  const s0 = espac && Number.isFinite(espac.s0) && espac.s0 > 0 ? espac.s0 : s0_lim;
  const sr = espac && Number.isFinite(espac.sr) && espac.sr > 0 ? espac.sr : sr_lim;
  const se = espac && Number.isFinite(espac.se) && espac.se > 0 ? espac.se : se_lim;
  const alertaEspac = [];
  if (s0 > s0_lim) alertaEspac.push('s₀ adotado excede 0,5·d');
  if (sr > sr_lim) alertaEspac.push('sr adotado excede 0,75·d');
  if (se > se_lim) alertaEspac.push('se adotado excede 2·d');

  // Armadura transversal (conectores/estribos)
  let studsOut = null, verif3 = null, tauRd3 = null, tauRd3_c = null, tauRd3_s = null;
  const temStuds = studs && Number.isFinite(studs.phi) && studs.phi > 0 &&
                   studs.nconec >= 1 && studs.ncam >= 1;
  if (temStuds) {
    const phi_stud_cm = studs.phi / 10;
    const As1c = Math.PI * phi_stud_cm * phi_stud_cm / 4;
    // Asw = área da armadura num contorno completo paralelo a C′ (UMA camada);
    // as demais camadas entram via 1,5·(d/sr) — item 19.5.3.3.
    const Asw = studs.nconec * As1c;
    // Parcela do concreto (reduzida de 0,13 para 0,10) + parcela do aço.
    tauRd3_c = 0.10 * fator_d * Math.pow(100 * rho * fck, 1/3);
    // (Asw[cm²]·fywd[MPa])/(u2·d[cm²]) → MPa. sen α = 1 (conectores verticais).
    tauRd3_s = 1.5 * (d / sr) * (Asw * fywd) / (u2 * d);
    tauRd3 = tauRd3_c + tauRd3_s;
    studsOut = { phi: studs.phi, nconec: studs.nconec, ncam: studs.ncam, As1c, Asw };
    verif3 = tauSd_Cl <= tauRd3;
  }

  // ── Etapa 9 — Contorno C″ ────────────────────────────────
  let etapa9 = null;
  if (temStuds) {
    // Distância do pilar até a última camada de armadura
    const p = s0 + (studs.ncam - 1) * sr;
    // C″ fica 2d além da última camada → cantos arredondados com raio (2d + p).
    const u3_calc = u1 + 2 * Math.PI * (2 * d + p);
    const u3manual = Number.isFinite(u3_manual) && u3_manual > 0;
    const u3 = u3manual ? u3_manual : u3_calc;
    const WpxCpp = circ
      ? (D + 4 * d + 2 * p) * (D + 4 * d + 2 * p)
      : Wpx + 2*cC2*p + 16*d*p + 4*p*p + Math.PI*cC1*p;
    const WpyCpp = circ
      ? (D + 4 * d + 2 * p) * (D + 4 * d + 2 * p)
      : Wpy + 2*cC1*p + 16*d*p + 4*p*p + Math.PI*cC2*p;
    const tauSd_Cpp_F = 10 * aFsd / (u3 * d);
    const tauSd_Cpp_Mx = 10 * kx * aMsd1x / (WpxCpp * d);
    const tauSd_Cpp_My = 10 * ky * aMsd1y / (WpyCpp * d);
    const tauSd_Cpp = tauSd_Cpp_F + tauSd_Cpp_Mx + tauSd_Cpp_My;
    const verif4 = tauSd_Cpp <= tauRd1;
    etapa9 = {
      p, u3, u3_calc, u3manual, WpxCpp, WpyCpp,
      tauSd_Cpp_F, tauSd_Cpp_Mx, tauSd_Cpp_My, tauSd_Cpp, verif4,
    };
  }

  return {
    inputs,
    secao, circ, D,
    cC1, cC2,
    fcd, fyd, fywd, fywdBase, tipoArm: tipoArmEff,
    Fsd, Msd1x, Msd1y,
    dx, dy, d, camadaExterna: extY ? 'y' : 'x',
    rho, rho_bruto, rox, roy, As1_x, As1_y,
    qx, qy, qx_exato, qy_exato, faixaX, faixaY,
    u1, u2,
    alphaV, tauRd2, tauSd_C, verif1,
    kx, ky, Wpx, Wpy,
    tauSd_Cl_F, tauSd_Cl_Mx, tauSd_Cl_My, tauSd_Cl,
    tauRd1, verif2, precisaArm, fator_d,
    s0_lim, sr_lim, se_lim, s0, sr, se, alertaEspac,
    studs: studsOut, tauRd3, tauRd3_c, tauRd3_s, verif3,
    etapa9,
  };
}

window.calcularPuncao = calcularPuncao;
window.interpolarK = interpolarK;

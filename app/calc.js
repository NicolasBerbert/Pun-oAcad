// ============================================================
//  PunçãoAcad — Rotina de Cálculo (pura, adaptada de script.js)
//  ABNT NBR 6118:2023 — Pilar interno com momentos nas duas direções
//  Seção retangular ou circular · conector ou estribo
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

// Recebe um objeto com TODAS as entradas (em cm, kN, MPa, mm onde indicado)
// e retorna o resultado completo, ou um objeto { error, missing }.
function calcularPuncao(inputs) {
  const {
    secao,        // 'retangular' | 'circular'
    C1, C2, diam, // cm
    Fsk, Mxk, Myk, // kN, kN.cm
    h, fck, fyk,  // cm, MPa, MPa
    cobrimento,   // cm
    phiw_x, phiw_y, // mm
    phi_lx, s_x,    // mm, cm
    phi_ly, s_y,    // mm, cm
    studs,        // optional: { phi (mm), nconec, ncam }
    tipoArm,      // 'conector' (default) | 'estribo' — base de fywd (item 19.4.2)
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
  const needPos = { cC1, cC2, h, fck, fyk, cobrimento, phiw_x, phiw_y, phi_lx, s_x, phi_ly, s_y };
  for (const k in needPos) {
    const v = needPos[k];
    if (!Number.isFinite(v) || v <= 0) {
      return { error: 'missing', missing: k };
    }
  }
  if (!Number.isFinite(Fsk) || Fsk === 0) {
    return { error: 'missing', missing: 'Fsk' };
  }

  // Coeficientes
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

  // Geometria útil
  const phiw_x_cm = phiw_x / 10;
  const phiw_y_cm = phiw_y / 10;
  const phi_lx_cm = phi_lx / 10;
  const phi_ly_cm = phi_ly / 10;
  const dx = h - cobrimento - phiw_x_cm - phi_lx_cm / 2;
  const dy = h - cobrimento - phiw_y_cm - phi_ly_cm / 2;
  const d = (dx + dy) / 2;

  if (d <= 0) return { error: 'd_negative' };

  // fywd (item 19.4.2): base 300 MPa (conectores) ou 250 MPa (estribos) para
  // h ≤ 15 cm, interpolando linearmente até 435 MPa para h ≥ 35 cm.
  const tipoArmEff = tipoArm === 'estribo' ? 'estribo' : 'conector';
  const fywdBase = tipoArmEff === 'estribo' ? 250 : 300;
  let fywd;
  if (h <= 15) fywd = fywdBase;
  else if (h >= 35) fywd = 435;
  else fywd = fywdBase + ((h - 15) * (435 - fywdBase)) / (35 - 15);

  // Perímetros — circular: u1 = π·Ø e u2 = π·(Ø + 4d) = u1 + 4π·d
  const u1 = circ ? Math.PI * D : 2 * cC1 + 2 * cC2;
  const u2 = u1 + 4 * Math.PI * d;

  // Taxa ρ — faixa: dimensão do pilar + 3d para cada lado
  const As1_x = Math.PI * phi_lx_cm * phi_lx_cm / 4;
  const As1_y = Math.PI * phi_ly_cm * phi_ly_cm / 4;
  const faixaX = 3 * d + cC1 + 3 * d;
  const faixaY = 3 * d + cC2 + 3 * d;
  const qx = Math.floor(faixaX / s_x);
  const qy = Math.floor(faixaY / s_y);
  const rox = (qx * As1_x) / (dx * faixaX);
  const roy = (qy * As1_y) / (dy * faixaY);
  const rho = Math.min(Math.sqrt(rox * roy), 0.02);

  // ── Etapa 6 — Contorno C ─────────────────────────────────
  const alphaV = 1 - fck / 250;
  const tauRd2 = alphaV * fcd * 0.27;
  const tauSd_C = (aFsd / (u1 * d)) / 10; // MPa
  const verif1 = tauSd_C <= tauRd2;

  // ── Etapa 7 — Contorno C' sem armadura ──────────────────
  const kx = circ ? 0.6 : interpolarK(cC1, cC2);
  const ky = circ ? 0.6 : interpolarK(cC2, cC1);
  const Wpx = circ
    ? (D + 4 * d) * (D + 4 * d)
    : (cC1*cC1)/2 + cC1*cC2 + 4*cC2*d + 16*d*d + 2*Math.PI*cC1*d;
  const Wpy = circ
    ? (D + 4 * d) * (D + 4 * d)
    : (cC2*cC2)/2 + cC2*cC1 + 4*cC1*d + 16*d*d + 2*Math.PI*cC2*d;
  const tauSd_Cl = (
    aFsd / (u2 * d) +
    kx * aMsd1x / (Wpx * d) +
    ky * aMsd1y / (Wpy * d)
  ) / 10;
  // ke = (1 + √(20/d)) ≤ 2 (item 19.5.3.2)
  const ke_raw = 1 + Math.sqrt(20 / d);
  const fator_d = Math.min(ke_raw, 2);
  const tauRd1 = 0.13 * fator_d * Math.pow(100 * rho * fck, 1/3);
  const verif2 = tauSd_Cl <= tauRd1;
  const precisaArm = !verif2;

  // ── Etapa 8 — Contorno C' com armadura ──────────────────
  const s0_lim = 0.5 * d;
  const sr_lim = 0.75 * d;
  const se_lim = 2 * d;

  // Armadura transversal (studs/estribos)
  let studsOut = null, verif3 = null, tauRd3 = null;
  if (studs && Number.isFinite(studs.phi) && studs.phi > 0 && studs.nconec >= 1 && studs.ncam >= 1) {
    const phi_stud_cm = studs.phi / 10;
    const As1c = Math.PI * phi_stud_cm * phi_stud_cm / 4;
    // Asw = área da armadura num contorno completo paralelo a C' (UMA camada);
    // as demais camadas entram via 1,5·(d/sr) — item 19.5.3.3.
    const Asw = studs.nconec * As1c;
    const sr = sr_lim;
    const term1 = 0.10 * fator_d * Math.pow(100 * rho * fck, 1/3);
    // 1.5*(d/sr)*(Asw*fywd*sin90°)/(u2*d) — Asw em cm², fywd em MPa, u2,d em cm
    // (Asw[cm²]·fywd[MPa])/(u2·d[cm²]) → MPa. Multiplica por 1,5·(d/sr) (adim.).
    const term2 = 1.5 * (d / sr) * (Asw * fywd) / (u2 * d);
    tauRd3 = term1 + term2;
    studsOut = { phi: studs.phi, nconec: studs.nconec, ncam: studs.ncam, As1c, Asw, sr };
    verif3 = tauSd_Cl <= tauRd3;
  }

  // ── Etapa 9 — Contorno C'' ──────────────────────────────
  let etapa9 = null;
  if (studs && studs.ncam >= 1) {
    const sr = sr_lim;
    const p = s0_lim + (studs.ncam - 1) * sr;
    // C'' fica 2d além da última camada → contorno a (2d + p) da face do pilar
    const u3 = u1 + 2 * Math.PI * (2 * d + p);
    const WpxCpp = circ
      ? (D + 4 * d + 2 * p) * (D + 4 * d + 2 * p)
      : Wpx + 2*cC2*p + 16*d*p + 4*p*p + Math.PI*cC1*p;
    const WpyCpp = circ
      ? (D + 4 * d + 2 * p) * (D + 4 * d + 2 * p)
      : Wpy + 2*cC1*p + 16*d*p + 4*p*p + Math.PI*cC2*p;
    const tauSd_Cpp = (
      aFsd / (u3 * d) +
      kx * aMsd1x / (WpxCpp * d) +
      ky * aMsd1y / (WpyCpp * d)
    ) / 10;
    const verif4 = tauSd_Cpp <= tauRd1;
    etapa9 = { p, u3, WpxCpp, WpyCpp, tauSd_Cpp, verif4 };
  }

  return {
    inputs,
    secao, circ, D,
    cC1, cC2,
    fcd, fyd, fywd, fywdBase, tipoArm: tipoArmEff,
    Fsd, Msd1x, Msd1y,
    dx, dy, d,
    rho, rox, roy, As1_x, As1_y, qx, qy, faixaX, faixaY,
    u1, u2,
    alphaV, tauRd2, tauSd_C, verif1,
    kx, ky, Wpx, Wpy, tauSd_Cl, tauRd1, verif2, precisaArm, fator_d, ke_raw,
    s0_lim, sr_lim, se_lim,
    studs: studsOut, tauRd3, verif3,
    etapa9,
  };
}

window.calcularPuncao = calcularPuncao;
window.interpolarK = interpolarK;

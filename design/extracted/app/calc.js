// ============================================================
//  PunçãoAcad — Rotina de Cálculo (pura, adaptada de script.js)
//  ABNT NBR 6118:2023 — Pilar interno com momentos nas duas direções
// ============================================================

// Interpolação do coeficiente k (tabela item 19.5.2.3)
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
  } = inputs;

  // Para circular: usamos diâmetro como C1 = C2 = diam (aproximação para perímetro retangular equivalente — usuário avisado)
  const cC1 = secao === 'circular' ? diam : C1;
  const cC2 = secao === 'circular' ? diam : C2;

  // Validação
  const need = { cC1, cC2, Fsk, h, fck, fyk, cobrimento, phiw_x, phiw_y, phi_lx, s_x, phi_ly, s_y };
  for (const k in need) {
    const v = need[k];
    if (!Number.isFinite(v) || v <= 0) {
      return { error: 'missing', missing: k };
    }
  }

  // Coeficientes
  const gammaC = 1.4, gammaS = 1.15, gammaF = 1.4;
  const fcd = fck / gammaC;
  const fyd = fyk / gammaS;
  const Fsd = gammaF * Fsk;
  const Msd1x = gammaF * (Mxk || 0);
  const Msd1y = gammaF * (Myk || 0);

  // Geometria útil
  const phiw_x_cm = phiw_x / 10;
  const phiw_y_cm = phiw_y / 10;
  const phi_lx_cm = phi_lx / 10;
  const phi_ly_cm = phi_ly / 10;
  const dx = h - cobrimento - phiw_x_cm - phi_lx_cm / 2;
  const dy = h - cobrimento - phiw_y_cm - phi_ly_cm / 2;
  const d = (dx + dy) / 2;

  if (d <= 0) return { error: 'd_negative' };

  // fywd (item 19.4.2)
  let fywd;
  if (h <= 15) fywd = 300;
  else if (h >= 35) fywd = 435;
  else fywd = 300 + ((h - 15) * (435 - 300)) / (35 - 15);

  // Perímetros
  const u1 = 2 * cC1 + 2 * cC2;
  const u2 = u1 + 4 * Math.PI * d;

  // Taxa ρ
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
  const tauSd_C = (Fsd / (u1 * d)) / 10; // MPa
  const verif1 = tauSd_C <= tauRd2;

  // ── Etapa 7 — Contorno C' sem armadura ──────────────────
  const kx = interpolarK(cC1, cC2);
  const ky = interpolarK(cC2, cC1);
  const Wpx = (cC1*cC1)/2 + cC1*cC2 + 4*cC2*d + 16*d*d + 2*Math.PI*cC1*d;
  const Wpy = (cC2*cC2)/2 + cC2*cC1 + 4*cC1*d + 16*d*d + 2*Math.PI*cC2*d;
  const tauSd_Cl = (
    Fsd / (u2 * d) +
    kx * Msd1x / (Wpx * d) +
    ky * Msd1y / (Wpy * d)
  ) / 10;
  const fator_d = 1 + Math.sqrt(20 / d);
  const tauRd1 = 0.13 * fator_d * Math.pow(100 * rho * fck, 1/3);
  const verif2 = tauSd_Cl <= tauRd1;
  const precisaArm = !verif2;

  // ── Etapa 8 — Contorno C' com armadura ──────────────────
  const s0_lim = 0.5 * d;
  const sr_lim = 0.75 * d;
  const se_lim = 2 * d;

  // Studs
  let studsOut = null, verif3 = null, tauRd3 = null;
  if (studs && Number.isFinite(studs.phi) && studs.phi > 0 && studs.nconec >= 1 && studs.ncam >= 1) {
    const phi_stud_cm = studs.phi / 10;
    const As1c = Math.PI * phi_stud_cm * phi_stud_cm / 4;
    const Asw = studs.nconec * studs.ncam * As1c;
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
    const u3 = u1 + 4 * Math.PI * (d + p);
    const WpxCpp = Wpx + 2*cC2*p + 16*d*p + 4*p*p + Math.PI*cC1*p;
    const WpyCpp = Wpy + 2*cC1*p + 16*d*p + 4*p*p + Math.PI*cC2*p;
    const tauSd_Cpp = (
      Fsd / (u3 * d) +
      kx * Msd1x / (WpxCpp * d) +
      ky * Msd1y / (WpyCpp * d)
    ) / 10;
    const verif4 = tauSd_Cpp <= tauRd1;
    etapa9 = { p, u3, WpxCpp, WpyCpp, tauSd_Cpp, verif4 };
  }

  return {
    inputs,
    cC1, cC2,
    fcd, fyd, fywd,
    Fsd, Msd1x, Msd1y,
    dx, dy, d,
    rho, rox, roy, As1_x, As1_y, qx, qy, faixaX, faixaY,
    u1, u2,
    alphaV, tauRd2, tauSd_C, verif1,
    kx, ky, Wpx, Wpy, tauSd_Cl, tauRd1, verif2, precisaArm, fator_d,
    s0_lim, sr_lim, se_lim,
    studs: studsOut, tauRd3, verif3,
    etapa9,
  };
}

window.calcularPuncao = calcularPuncao;
window.interpolarK = interpolarK;

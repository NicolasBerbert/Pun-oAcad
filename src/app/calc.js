// ============================================================
//  PunçãoAcad — Rotina de Cálculo (pura)
//  ABNT NBR 6118:2023 — Pilar interno com momentos nas duas direções
//  Seção retangular ou circular · conector ou estribo
//  Opcionais: ábaco no pilar circular (19.5.2.5), abertura próxima (19.5.2.6),
//  redução de FSd pela carga distribuída (19.5.2.1), σcp e colapso
//  progressivo (19.5.4).
//
//  Unidades de entrada: cm (geometria), kN e kN·cm (esforços),
//  MPa (materiais), mm (bitolas), kN/m² (carga distribuída).
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

// ── Geometria dos contornos ─────────────────────────────────
// Contorno fechado afastado `a` de uma base circular (diâmetro b1) ou
// retangular (b1 × b2, b1 na direção x = C1), com cantos arredondados de
// raio a. Wp = ∫|e|·dl (item 19.5.2.2) calculado para o próprio contorno:
// Wpx com e medido em x, Wpy com e medido em y. Num círculo de raio r,
// Wp = 4r² — em C′ (r = Ø/2 + 2d) é o (Ø + 4d)² da norma, e com a = 0 dá
// o Wp do contorno C. `area` é a área interna, usada na redução de FSd.
function contornoFechado(circ, b1, b2, a) {
  if (circ) {
    const r = b1 / 2 + a;
    return { u: 2 * Math.PI * r, Wpx: 4 * r * r, Wpy: 4 * r * r, area: Math.PI * r * r };
  }
  return {
    u: 2 * (b1 + b2) + 2 * Math.PI * a,
    Wpx: b1 * b1 / 2 + b1 * b2 + 2 * b2 * a + 4 * a * a + Math.PI * b1 * a,
    Wpy: b2 * b2 / 2 + b1 * b2 + 2 * b1 * a + 4 * a * a + Math.PI * b2 * a,
    area: b1 * b2 + 2 * a * (b1 + b2) + Math.PI * a * a,
  };
}

// Abertura na laje (19.5.2.6): retas que passam pelo centro do pilar e
// tangenciam a abertura. A abertura fica centrada no eixo `dir`, a `dist`
// da face do pilar, com largura tangencial `larg`; as tangentes tocam os
// vértices mais próximos, a x1 = (meia dimensão do pilar + dist) do centro.
function cunhaAbertura(circ, D, C1, C2, ab) {
  const dir = ['+x', '-x', '+y', '-y'].includes(ab.dir) ? ab.dir : '+x';
  const emX = dir === '+x' || dir === '-x';
  const x1 = (circ ? D / 2 : emX ? C1 / 2 : C2 / 2) + ab.dist;
  const theta = 2 * Math.atan((ab.larg / 2) / x1);
  const phi0 = { '+x': 0, '+y': Math.PI / 2, '-x': Math.PI, '-y': -Math.PI / 2 }[dir];
  return { dir, x1, theta, phi0 };
}

// Parte do contorno que cai entre as tangentes: comprimento, parcelas de
// Wpx/Wpy e área do setor. Círculo em forma fechada; retângulo por uma
// polilinha densa (passo de 0,05 cm).
function trechoNaCunha(circ, b1, b2, a, cunha) {
  const { theta, phi0 } = cunha;
  if (circ) {
    const r = b1 / 2 + a;
    const ini = phi0 - theta / 2, fim = phi0 + theta / 2;
    // primitiva de |cos φ|
    const G = f => { const k = Math.floor((f + Math.PI / 2) / Math.PI); return 2 * k + Math.sin(f - k * Math.PI); };
    return {
      u: r * theta,
      Wpx: r * r * (G(fim) - G(ini)),
      Wpy: r * r * (G(fim - Math.PI / 2) - G(ini - Math.PI / 2)),
      area: r * r * theta / 2,
    };
  }
  const A = b1 / 2, B = b2 / 2, passo = 0.05;
  const pts = [];
  const reta = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / passo));
    for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  };
  const arco = (cx, cy, ang0) => {
    if (a <= 0) return;
    const n = Math.max(1, Math.ceil(a * Math.PI / 2 / passo));
    for (let i = 0; i < n; i++) {
      const t = ang0 + (Math.PI / 2) * i / n;
      pts.push([cx + a * Math.cos(t), cy + a * Math.sin(t)]);
    }
  };
  reta(A + a, -B, A + a, B);   arco(A, B, 0);
  reta(A, B + a, -A, B + a);   arco(-A, B, Math.PI / 2);
  reta(-A - a, B, -A - a, -B); arco(-A, -B, Math.PI);
  reta(-A, -B - a, A, -B - a); arco(A, -B, 3 * Math.PI / 2);
  let u = 0, Wx = 0, Wy = 0, area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i], [qx, qy] = pts[(i + 1) % pts.length];
    const mx = (px + qx) / 2, my = (py + qy) / 2;
    let dif = Math.atan2(my, mx) - phi0;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    if (Math.abs(dif) > theta / 2) continue;
    const dl = Math.hypot(qx - px, qy - py);
    u += dl; Wx += Math.abs(mx) * dl; Wy += Math.abs(my) * dl;
    area += Math.abs(px * qy - qx * py) / 2;
  }
  return { u, Wpx: Wx, Wpy: Wy, area };
}

// Geometria da roseta de armadura de punção (planta, origem no centro do pilar).
// Os raios são distribuídos uniformemente em ângulo; em cada raio os conectores
// ficam a s0, s0+sr, s0+2·sr … medidos A PARTIR DA FACE do pilar.
// Retorna também o maior espaçamento tangencial na última camada, que é o
// valor a comparar com o limite se ≤ 2d. No pilar circular a última camada
// é um círculo e se é medido ao longo dele: 2π·(Ø/2 + p)/nconec.
function layoutArmadura({ circ, D, C1, C2, nconec, ncam, s0, sr }) {
  const raios = [];
  const pontos = [];
  for (let i = 0; i < nconec; i++) {
    // começa no topo (−90°) para a roseta ficar simétrica em relação aos eixos
    const th = -Math.PI / 2 + (2 * Math.PI * i) / nconec;
    const ux = Math.cos(th), uy = Math.sin(th);
    // distância do centro até a face do pilar ao longo deste raio
    let tFace;
    if (circ) {
      tFace = D / 2;
    } else {
      const a = C1 / 2, b = C2 / 2;
      const tx = Math.abs(ux) > 1e-9 ? a / Math.abs(ux) : Infinity;
      const ty = Math.abs(uy) > 1e-9 ? b / Math.abs(uy) : Infinity;
      tFace = Math.min(tx, ty);
    }
    const camadas = [];
    for (let k = 0; k < ncam; k++) {
      const r = tFace + s0 + k * sr;
      camadas.push({ k, r, x: ux * r, y: uy * r });
      pontos.push({ i, k, r, x: ux * r, y: uy * r });
    }
    raios.push({ i, th, ux, uy, tFace, camadas });
  }

  let se_real = 0;
  if (circ) {
    se_real = 2 * Math.PI * (D / 2 + s0 + (ncam - 1) * sr) / nconec;
  } else {
    // maior distância entre conectores vizinhos na camada mais externa
    const ultima = raios.map(r => r.camadas[ncam - 1]);
    for (let i = 0; i < ultima.length; i++) {
      const a = ultima[i], b = ultima[(i + 1) % ultima.length];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > se_real) se_real = dist;
    }
  }

  return { raios, pontos, se_real, nconec, ncam, s0, sr };
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
    fywdAumento,    // false mantém fywd no valor-base, sem o aumento com h
    espac,          // opcional: { s0, sr, se } adotados em cm
    u3_manual,      // opcional: perímetro C″ medido em CAD (cm)
    axial,          // opcional: { Nsdx, Nsdy, Ac } — kN, kN, cm² (σcp)
    ccp,            // opcional: { ativo, phi_h, s_h, phi_v, s_v } — colapso progressivo
    momentoC,       // false: contorno C só com a força (padrão: com momentos)
    ampliaRd2,      // true: τRd2 ampliado em 20% (19.5.3.1)
    distrib,        // opcional: { ativo, gq } — carga distribuída g + q, kN/m²
    abaco,          // opcional, só pilar circular: { ativo, hc, Lt } — cm
    abertura,       // opcional: { ativo, dist, larg, dir } — cm, '+x'|'-x'|'+y'|'-y'
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
  // A mesma regra vale para a espessura total no ábaco (dc).
  const phi_lx_cm = phi_lx / 10;
  const phi_ly_cm = phi_ly / 10;
  const extY = camadaExterna !== 'x';
  const alturas = hTot => ({
    dy: extY ? hTot - cobrimento - phi_ly_cm / 2 : hTot - cobrimento - phi_lx_cm - phi_ly_cm / 2,
    dx: extY ? hTot - cobrimento - phi_ly_cm - phi_lx_cm / 2 : hTot - cobrimento - phi_lx_cm / 2,
  });
  const { dx, dy } = alturas(h);
  const d = (dx + dy) / 2;

  if (dx <= 0 || dy <= 0) return { error: 'd_negative' };

  // ── Ábaco (19.5.2.5, tratado como capitel) ───────────────
  // Só no pilar circular. hc = espessura total da laje no ábaco; Lt =
  // dimensão do ábaco em planta. ℓc = (Lt − Ø)/2 é a distância da face do
  // pilar à borda do ábaco, e dc a altura útil na face do pilar.
  // Classificação:
  //   ℓc ≤ 2(dc − d) ........ verificar só C′2 (2d além da borda do ábaco)
  //   2(dc − d) < ℓc ≤ 2dc .. verificar só C′1 (2dc além da face do pilar)
  //   ℓc > 2dc .............. verificar C′1 e C′2
  // Em C′1 a altura útil é da: a superfície que parte de C′2 com inclinação
  // 1:2 alcança, sob C′1, a profundidade d + (ℓc − 2dc)/2 (Figura 19.5),
  // limitada a dc — na Atividade 4 do IBRACON, da = (Lc + 2d − 2dc)/2.
  // Os contornos são círculos concêntricos ao pilar, como na Atividade 4.
  let cap = null;
  if (circ && abaco && abaco.ativo) {
    const hc = abaco.hc;
    const lc = Number.isFinite(abaco.Lt) ? (abaco.Lt - D) / 2 : abaco.lc;
    if (!(Number.isFinite(hc) && hc > h && Number.isFinite(lc) && lc > 0)) {
      return { error: 'abaco' };
    }
    const { dx: dcx, dy: dcy } = alturas(hc);
    const dc = (dcx + dcy) / 2;
    const lim1 = 2 * (dc - d), lim2 = 2 * dc;
    const caso = lc <= lim1 ? 'C2' : lc <= lim2 ? 'C1' : 'C1C2';
    // só existe quando C′1 é verificado
    const da = caso === 'C2' ? null : Math.min(dc, d + (lc - 2 * dc) / 2);
    cap = { hc, lc, dcx, dcy, dc, lim1, lim2, caso, da, Lt: D + 2 * lc };
  }

  // ── Abertura próxima (19.5.2.6) ──────────────────────────
  // A menos de 8d do contorno C, descarta-se o trecho dos contornos críticos
  // entre as retas tangentes à abertura. O contorno C é mantido integral.
  let ab = null;
  if (abertura && abertura.ativo) {
    if (!(Number.isFinite(abertura.dist) && abertura.dist > 0 &&
          Number.isFinite(abertura.larg) && abertura.larg > 0)) {
      return { error: 'abertura' };
    }
    const cunha = cunhaAbertura(circ, D, cC1, cC2, abertura);
    ab = {
      dist: abertura.dist, larg: abertura.larg, ...cunha,
      lim8d: 8 * d, influi: abertura.dist < 8 * d,
      // ρ = As/(s·d) não depende da largura da faixa: a abertura dentro de
      // 3d só é registrada
      limitaFaixa: abertura.dist < 3 * d,
    };
  }

  // ── Etapa 4 — fywd (itens 19.4.2 e 19.5.3.3) ─────────────
  // O valor de partida depende do tipo de armadura: 250 MPa para
  // estribos e 300 MPa para conectores (studs). Três situações, em
  // função da espessura da laje:
  //   h < 15 cm ............ fywd = 250 MPa (estribo) | 300 MPa (conector)
  //   h > 35 cm ............ fywd = 435 MPa
  //   15 ≤ h ≤ 35 cm ....... interpolação linear até 435 MPa
  // O aumento com a espessura é permitido, não obrigatório: com
  // fywdAumento = false o valor-base é mantido (a favor da segurança).
  // Com studs e h = 17 cm, a Atividade 1 do IBRACON dá 313,5 MPa.
  const tipoArmEff = tipoArm === 'conector' ? 'conector' : 'estribo';
  const FYWD_MIN = tipoArmEff === 'conector' ? 300 : 250;
  const FYWD_MAX = 435, H_MIN = 15, H_MAX = 35;
  const aumentaFywd = fywdAumento !== false;
  let fywd, fywdCaso;
  if (h < H_MIN) { fywd = FYWD_MIN; fywdCaso = 'menor'; }
  else if (!aumentaFywd) { fywd = FYWD_MIN; fywdCaso = 'base'; }
  else if (h > H_MAX) { fywd = FYWD_MAX; fywdCaso = 'maior'; }
  else {
    fywd = FYWD_MIN + ((h - H_MIN) * (FYWD_MAX - FYWD_MIN)) / (H_MAX - H_MIN);
    fywdCaso = 'interpolado';
  }

  // ── Etapa 3 — Perímetros de controle ─────────────────────
  // Circular: u1 = π·Ø e u2 = π·(Ø + 4d) = u1 + 4π·d (sem abertura)
  const c0 = contornoFechado(circ, cC1, cC2, 0);
  const u1 = c0.u;

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

  // Coeficiente K: no pilar circular as parcelas de Mx e My são somadas,
  // cada uma com K = 0,6 — como nos exercícios de pilar circular do IBRACON.
  const kx = circ ? 0.6 : interpolarK(cC1, cC2);
  const ky = circ ? 0.6 : interpolarK(cC2, cC1);

  // ── Etapa 6 — Contorno C: esmagamento da biela ───────────
  // τSd conforme 19.5.2 com u0 no lugar de u (19.5.3.1). Os momentos entram
  // com o Wp do próprio contorno C (pilar circular: Wp0 = Ø²; retangular:
  // C1²/2 + C1·C2) — salvo se o projetista desligar (momentoC = false), como
  // fazem a Atividade 1 do IBRACON e o LPunc. Com ábaco, a altura útil na
  // face do pilar é dc.
  const incluiMC = momentoC !== false;
  const dC = cap ? cap.dc : d;
  const alphaV = 1 - fck / 250;
  const tauRd2_base = alphaV * fcd * 0.27;
  // Ampliação de 20%: pilar interno, vãos que não diferem mais de 50% e sem
  // aberturas junto ao pilar.
  const ampliaEff = !!ampliaRd2 && !(ab && ab.influi);
  const tauRd2 = tauRd2_base * (ampliaEff ? 1.2 : 1);
  const tauSd_C_F = 10 * aFsd / (u1 * dC); // kN/cm² → MPa
  const tauSd_C_Mx = incluiMC ? 10 * kx * aMsd1x / (c0.Wpx * dC) : 0;
  const tauSd_C_My = incluiMC ? 10 * ky * aMsd1y / (c0.Wpy * dC) : 0;
  const tauSd_C = tauSd_C_F + tauSd_C_Mx + tauSd_C_My;
  const verif1 = tauSd_C <= tauRd2;

  // ── Etapa 7 — Contorno C′ sem armadura ───────────────────
  // Coeficiente de escala (size effect). A NBR 6118:2023 limita ke a 2 —
  // para lajes finas, 1 + √(20/d) passa desse valor e o limite passa a valer.
  const KE_MAX = 2;
  const keBruto = dd => 1 + Math.sqrt(20 / dd);
  const keDe = dd => Math.min(keBruto(dd), KE_MAX);

  // Parcela favorável da compressão axial (protensão ou pilar comprimido):
  //   σcp = (σcp,x + σcp,y)/2 ≤ 3,5 MPa,  σcp,i = Nsd,i / Ac
  // Entra em τRd1 como +0,10·σcp. Sem Nsd informado, σcp = 0 e a expressão
  // volta a ser a da laje sem compressão axial.
  const SIGMA_CP_MAX = 3.5;
  const Ac = axial && Number.isFinite(axial.Ac) && axial.Ac > 0 ? axial.Ac : null;
  const Nsdx = axial && Number.isFinite(axial.Nsdx) ? axial.Nsdx : 0;
  const Nsdy = axial && Number.isFinite(axial.Nsdy) ? axial.Nsdy : 0;
  const temAxial = !!Ac && (Nsdx !== 0 || Nsdy !== 0);
  const sigma_cpx = temAxial ? 10 * Nsdx / Ac : 0;   // kN/cm² → MPa
  const sigma_cpy = temAxial ? 10 * Nsdy / Ac : 0;
  const sigma_cp_bruto = (sigma_cpx + sigma_cpy) / 2;
  const sigma_cp_calc = Math.min(sigma_cp_bruto, SIGMA_CP_MAX);
  const sigma_cp_limitado = sigma_cp_bruto > SIGMA_CP_MAX;
  // 19.5.3.2: com σcp,x ≤ 1 MPa ou σcp,y ≤ 1 MPa, despreza-se o efeito favorável
  const sigma_cp_desprezado = temAxial && (sigma_cpx <= 1 || sigma_cpy <= 1);
  const sigma_cp = sigma_cp_desprezado ? 0 : sigma_cp_calc;

  const termoRho = Math.pow(100 * rho * fck, 1 / 3);
  const tauRd1De = dd => 0.13 * keDe(dd) * termoRho + 0.10 * sigma_cp;

  // Redução de FSd (19.5.2.1): desconta-se a carga distribuída aplicada na
  // face oposta da laje dentro do contorno verificado. Aplicada aos
  // contornos do tipo C′; os contornos C e C″ ficam sem redução, a favor
  // da segurança.
  const pd = distrib && distrib.ativo && Number.isFinite(distrib.gq) && distrib.gq > 0
    ? gammaF * distrib.gq : 0;                        // kN/m²
  const reduzF = pd > 0 && Fsd > 0;

  // Avalia um contorno afastado `a` da base b1 × b2 (ou Ø = b1), com
  // altura útil dCont: perímetro e Wp do próprio contorno, menos o trecho
  // da abertura, e FSd reduzido se `reduz`.
  const avaliar = (nome, b1, b2, a, dCont, reduz) => {
    const cheio = contornoFechado(circ, b1, b2, a);
    const corte = ab && ab.influi ? trechoNaCunha(circ, b1, b2, a, ab) : null;
    const u = cheio.u - (corte ? corte.u : 0);
    const Wpx = cheio.Wpx - (corte ? corte.Wpx : 0);
    const Wpy = cheio.Wpy - (corte ? corte.Wpy : 0);
    const area = cheio.area - (corte ? corte.area : 0);
    const dF = reduz && reduzF ? Math.min(pd * area / 1e4, aFsd) : 0;   // kN/m²·cm² → kN
    const F = aFsd - dF;
    const tauSd_F = 10 * F / (u * dCont);
    const tauSd_Mx = 10 * kx * aMsd1x / (Wpx * dCont);
    const tauSd_My = 10 * ky * aMsd1y / (Wpy * dCont);
    return {
      nome, a, d: dCont, b1, b2,
      u, u_bruto: cheio.u, du: corte ? corte.u : 0,
      Wpx, Wpy, Wpx_bruto: cheio.Wpx, Wpy_bruto: cheio.Wpy,
      area, dF, Fsd_red: F,
      tauSd_F, tauSd_Mx, tauSd_My, tauSd: tauSd_F + tauSd_Mx + tauSd_My,
      tauSd_semReducao: tauSd_F + 10 * dF / (u * dCont) + tauSd_Mx + tauSd_My,
    };
  };

  let Cl, contornosCap = null;
  if (cap) {
    contornosCap = [];
    if (cap.caso !== 'C2') contornosCap.push(avaliar('C′1', cC1, cC2, 2 * cap.dc, cap.da, true));
    if (cap.caso !== 'C1') contornosCap.push(avaliar('C′2', cC1 + 2 * cap.lc, cC2 + 2 * cap.lc, 2 * d, d, true));
    contornosCap.forEach(c => {
      c.ke_bruto = keBruto(c.d); c.ke = keDe(c.d);
      c.tauRd1 = tauRd1De(c.d);
      c.ok = c.tauSd <= c.tauRd1;
    });
    // o contorno com maior τSd/τRd1 alimenta os campos gerais de C′
    Cl = contornosCap.reduce((g, c) => (c.tauSd / c.tauRd1 > g.tauSd / g.tauRd1 ? c : g));
    cap.contornos = contornosCap;
    cap.governa = Cl.nome;
  } else {
    Cl = avaliar('C′', cC1, cC2, 2 * d, d, true);
  }

  const u2 = Cl.u;
  const Wpx = Cl.Wpx, Wpy = Cl.Wpy;
  const tauSd_Cl_F = Cl.tauSd_F, tauSd_Cl_Mx = Cl.tauSd_Mx, tauSd_Cl_My = Cl.tauSd_My;
  const tauSd_Cl = Cl.tauSd;
  const fator_d_bruto = keBruto(Cl.d);
  const fator_d = keDe(Cl.d);
  const ke_limitado = fator_d_bruto > KE_MAX;
  const tauRd1 = tauRd1De(Cl.d);
  const verif2 = cap ? contornosCap.every(c => c.ok) : tauSd_Cl <= tauRd1;
  const precisaArm = !verif2;
  const reducao = reduzF ? {
    pd, area: Cl.area / 1e4, dF: Cl.dF, Fsd_red: Cl.Fsd_red, tauSd_sem: Cl.tauSd_semReducao,
  } : null;

  // ── Etapa 8 — Contorno C′ com armadura ───────────────────
  const s0_lim = 0.5 * d;
  const sr_lim = 0.75 * d;
  const se_lim = 2 * d;
  // Espaçamentos adotados pelo projetista (arredondados para baixo na prática).
  const s0 = espac && Number.isFinite(espac.s0) && espac.s0 > 0 ? espac.s0 : s0_lim;
  const sr = espac && Number.isFinite(espac.sr) && espac.sr > 0 ? espac.sr : sr_lim;
  const se = espac && Number.isFinite(espac.se) && espac.se > 0 ? espac.se : se_lim;
  // Tolerância de 0,005 cm: os limites são exibidos com 2 casas, então adotar
  // exatamente o valor mostrado (ex.: 6,63 para um limite de 6,625) é válido.
  const TOL = 0.005;
  const f2 = v => v.toFixed(2).replace('.', ',');
  const alertaEspac = [];
  if (s0 > s0_lim + TOL) alertaEspac.push(`s₀ = ${f2(s0)} cm excede o limite 0,5·d = ${f2(s0_lim)} cm`);
  if (sr > sr_lim + TOL) alertaEspac.push(`sr = ${f2(sr)} cm excede o limite 0,75·d = ${f2(sr_lim)} cm`);
  if (se > se_lim + TOL) alertaEspac.push(`se = ${f2(se)} cm excede o limite 2·d = ${f2(se_lim)} cm`);

  // Armadura transversal (conectores/estribos). Com ábaco o app não
  // dimensiona armadura de punção: os contornos dentro do ábaco pedem
  // outro arranjo.
  let studsOut = null, verif3 = null, tauRd3 = null, tauRd3_c = null, tauRd3_s = null;
  const temStuds = !cap && studs && Number.isFinite(studs.phi) && studs.phi > 0 &&
                   studs.nconec >= 1 && studs.ncam >= 1;
  if (temStuds) {
    const phi_stud_cm = studs.phi / 10;
    const As1c = Math.PI * phi_stud_cm * phi_stud_cm / 4;
    // Asw = área da armadura num contorno completo paralelo a C′ (UMA camada);
    // as demais camadas entram via 1,5·(d/sr) — item 19.5.3.3.
    const Asw = studs.nconec * As1c;
    // Parcela do concreto (reduzida de 0,13 para 0,10) + parcela do aço.
    tauRd3_c = 0.10 * fator_d * termoRho + 0.10 * sigma_cp;
    // (Asw[cm²]·fywd[MPa])/(u2·d[cm²]) → MPa. sen α = 1 (conectores verticais).
    tauRd3_s = 1.5 * (d / sr) * (Asw * fywd) / (u2 * d);
    tauRd3 = tauRd3_c + tauRd3_s;
    studsOut = { phi: studs.phi, nconec: studs.nconec, ncam: studs.ncam, As1c, Asw };
    verif3 = tauSd_Cl <= tauRd3;
    // Geometria da roseta adotada + espaçamento tangencial real (se) na última camada
    studsOut.layout = layoutArmadura({
      circ, D, C1: cC1, C2: cC2, nconec: studs.nconec, ncam: studs.ncam, s0, sr,
    });
    studsOut.se_real = studsOut.layout.se_real;
    studsOut.se_ok = studsOut.se_real <= se_lim + TOL;
  }

  // ── Etapa 9 — Contorno C″ ────────────────────────────────
  let etapa9 = null;
  if (temStuds) {
    // Distância do pilar até a última camada de armadura
    const p = s0 + (studs.ncam - 1) * sr;
    // C″ fica 2d além da última camada → cantos arredondados com raio (2d + p).
    // Circular: contorno de raio Ø/2 + 2d + p, Wp = (Ø + 4d + 2p)².
    const Cpp = avaliar('C″', cC1, cC2, 2 * d + p, d, false);
    const u3_calc = Cpp.u;
    const u3manual = Number.isFinite(u3_manual) && u3_manual > 0;
    const u3 = u3manual ? u3_manual : u3_calc;
    const WpxCpp = Cpp.Wpx, WpyCpp = Cpp.Wpy;
    const tauSd_Cpp_F = 10 * aFsd / (u3 * d);
    const tauSd_Cpp_Mx = Cpp.tauSd_Mx;
    const tauSd_Cpp_My = Cpp.tauSd_My;
    const tauSd_Cpp = tauSd_Cpp_F + tauSd_Cpp_Mx + tauSd_Cpp_My;
    const verif4 = tauSd_Cpp <= tauRd1;
    etapa9 = {
      p, u3, u3_calc, u3_bruto: Cpp.u_bruto, du3: Cpp.du, u3manual, WpxCpp, WpyCpp,
      tauSd_Cpp_F, tauSd_Cpp_Mx, tauSd_Cpp_My, tauSd_Cpp, verif4,
    };
  }

  // ── Etapa 10 — Colapso progressivo (item 19.5.4) ─────────
  // A armadura de flexão INFERIOR que atravessa o contorno C deve ser tal que
  //     fyd · As,ccp ≥ 1,5 · FSd,   com FSd calculado com γf = 1,2
  // As,ccp soma as barras que cruzam as faces do pilar: as horizontais
  // (direção x) atravessam as faces de largura C2 e as verticais (direção y)
  // as de largura C1. Cada barra contínua é contada uma única vez, embora
  // cruze duas faces opostas — a favor da segurança.
  let colapso = null;
  if (ccp && ccp.ativo) {
    const bitola = v => (Number.isFinite(v) && v > 0 ? v / 10 : null); // mm → cm
    const area = v => Math.PI * v * v / 4;
    const ph = bitola(ccp.phi_h), pv = bitola(ccp.phi_v);
    const sh = Number.isFinite(ccp.s_h) && ccp.s_h > 0 ? ccp.s_h : null;
    const sv = Number.isFinite(ccp.s_v) && ccp.s_v > 0 ? ccp.s_v : null;

    if (ph && sh && pv && sv) {
      const GAMMA_F_CCP = 1.2;
      const largH = circ ? D : cC2;   // barras em x cruzam a face de largura C2
      const largV = circ ? D : cC1;   // barras em y cruzam a face de largura C1
      const As1h = area(ph), As1v = area(pv);
      const nh_exato = largH / sh, nv_exato = largV / sv;
      const As_h = nh_exato * As1h;
      const As_v = nv_exato * As1v;
      const As_ccp = As_h + As_v;
      const Fsd_ccp = GAMMA_F_CCP * Math.abs(Fsk);
      // fyd em MPa → kN/cm² é fyd/10
      const As_nec = 1.5 * Fsd_ccp / (fyd / 10);
      colapso = {
        phi_h: ccp.phi_h, s_h: sh, phi_v: ccp.phi_v, s_v: sv,
        As1h, As1v, largH, largV,
        nh_exato, nv_exato, nh: Math.round(nh_exato), nv: Math.round(nv_exato),
        As_h, As_v, As_ccp, As_nec,
        gammaF: GAMMA_F_CCP, Fsd_ccp, Sd: 1.5 * Fsd_ccp,
        Rd: As_ccp * fyd / 10,          // kN
        verif5: As_ccp >= As_nec,
      };
    } else {
      colapso = { incompleto: true };
    }
  }

  return {
    inputs,
    secao, circ, D,
    cC1, cC2,
    fcd, fyd, fywd, fywdCaso, fywdBase: FYWD_MIN, fywdAumento: aumentaFywd, tipoArm: tipoArmEff,
    Fsd, Msd1x, Msd1y,
    dx, dy, d, camadaExterna: extY ? 'y' : 'x',
    rho, rho_bruto, rox, roy, As1_x, As1_y,
    qx, qy, qx_exato, qy_exato, faixaX, faixaY,
    u1, u2, u2_bruto: Cl.u_bruto, du2: Cl.du,
    alphaV, tauRd2, tauRd2_base, ampliaRd2: ampliaEff, ampliaPedida: !!ampliaRd2,
    momentoC: incluiMC, dC, Wp0x: c0.Wpx, Wp0y: c0.Wpy,
    tauSd_C_F, tauSd_C_Mx, tauSd_C_My, tauSd_C, verif1,
    kx, ky, Wpx, Wpy, Wpx_bruto: Cl.Wpx_bruto, Wpy_bruto: Cl.Wpy_bruto,
    tauSd_Cl_F, tauSd_Cl_Mx, tauSd_Cl_My, tauSd_Cl,
    tauRd1, verif2, precisaArm, fator_d, fator_d_bruto, ke_limitado,
    sigma_cp, sigma_cpx, sigma_cpy, sigma_cp_bruto, sigma_cp_calc, sigma_cp_limitado, sigma_cp_desprezado, temAxial, Ac,
    reducao, abaco: cap, abertura: ab,
    s0_lim, sr_lim, se_lim, s0, sr, se, alertaEspac,
    studs: studsOut, tauRd3, tauRd3_c, tauRd3_s, verif3,
    etapa9,
    colapso,
  };
}

// ============================================================
//  Dimensionamento automático da armadura de punção
//
//  Em vez de o projetista arbitrar a armadura e conferir se passa,
//  aqui o programa monta a armadura na mesma ordem do memorial:
//
//    1. Etapa 8 (contorno C′) → número de CONECTORES POR CAMADA.
//       O menor nconec com τSd,C′ ≤ τRd3. Só o nconec entra em Asw,
//       e τRd3 não depende do número de camadas.
//
//    2. Etapa 9 (contorno C″) → número de CAMADAS, com o nconec já
//       definido. As camadas são acrescentadas uma a uma até que
//       τSd,C″ ≤ τRd1 — cada camada afasta o contorno C″ do pilar
//       (p = s0 + (ncam−1)·sr).
//
//  O nconec da etapa 8 não é revisto depois. Se as camadas levarem a
//  roseta tão longe que o espaçamento tangencial da última camada passe
//  de 2d, isso é devolvido como aviso (seExcedido) para o projetista
//  decidir — aumentar a bitola, reduzir sr ou acrescentar conectores.
//
//  A bitola Ø é decisão construtiva do projetista e não é alterada.
// ============================================================
function dimensionarArmadura(inputs, opcoes = {}) {
  const NCAM_MAX = opcoes.ncamMax || 25;
  const NCONEC_MAX = opcoes.nconecMax || 48;
  // Rosetas simétricas: conectores em número par, a partir de 4.
  const passoNconec = 2, nconecMin = 4;

  const phi = Number.isFinite(inputs.studs?.phi) && inputs.studs.phi > 0
    ? inputs.studs.phi
    : (opcoes.phi || 10);

  const tentar = (nconec, ncam) =>
    calcularPuncao({ ...inputs, studs: { phi, nconec, ncam } });

  const base = calcularPuncao(inputs);
  if (base.error) return { ok: false, motivo: 'erro', base };
  if (!base.verif1) {
    return { ok: false, motivo: 'biela',
      texto: 'A biela comprimida junto ao pilar (contorno C) já não passa. ' +
             'Armadura de punção não resolve — é preciso aumentar h, fck ou o pilar.' };
  }
  if (base.verif2) {
    return { ok: false, motivo: 'dispensada',
      texto: 'O contorno C′ passa só com o concreto: não há necessidade de armadura de punção.' };
  }
  if (base.abaco) {
    return { ok: false, motivo: 'abaco',
      texto: 'Com ábaco, o app não dimensiona armadura de punção. ' +
             'Aumente o ábaco, a espessura da laje ou o fck.' };
  }

  const tentativas = [];

  // ── 1. Etapa 8: quantos conectores por camada para C′ passar ──
  // τRd3 cresce com nconec (via Asw) e independe de ncam, então basta
  // uma camada para testar, e o primeiro nconec que passar é o mínimo.
  let nconec = null;
  for (let n = nconecMin; n <= NCONEC_MAX; n += passoNconec) {
    const R = tentar(n, 1);
    const ok = !!R.verif3;
    tentativas.push({ etapa: 8, nconec: n, tauSd: R.tauSd_Cl, tauRd: R.tauRd3, ok });
    if (ok) { nconec = n; break; }
  }
  if (nconec === null) {
    return { ok: false, motivo: 'nconec', tentativas,
      texto: `Nem com ${NCONEC_MAX} conectores por camada o contorno C′ é atendido. ` +
             'Aumente a bitola do conector ou reduza sr.' };
  }

  // ── 2. Etapa 9: com esse nconec, quantas camadas para C″ passar ──
  // τSd,C″ cai monotonicamente com ncam (u3 e Wp crescem), então a
  // primeira camada que passar é a mínima.
  let ncam = null, resultado = null;
  for (let m = 1; m <= NCAM_MAX; m++) {
    const R = tentar(nconec, m);
    const ok = !!R.etapa9?.verif4;
    tentativas.push({ etapa: 9, nconec, ncam: m, tauSd: R.etapa9?.tauSd_Cpp, tauRd: R.tauRd1,
                      se: R.studs?.se_real, ok });
    if (ok) { ncam = m; resultado = R; break; }
  }
  if (ncam === null) {
    return { ok: false, motivo: 'ncam', tentativas, nconec,
      texto: `Com ${nconec} conectores por camada, nem ${NCAM_MAX} camadas atendem o contorno C″. ` +
             'Reveja a espessura da laje, o fck ou a armadura de flexão.' };
  }

  const seExcedido = !resultado.studs.se_ok;
  return { ok: true, phi, nconec, ncam, tentativas, resultado, seExcedido,
           se_real: resultado.studs.se_real, se_lim: resultado.se_lim };
}

window.calcularPuncao = calcularPuncao;
window.interpolarK = interpolarK;
window.layoutArmadura = layoutArmadura;
window.dimensionarArmadura = dimensionarArmadura;
window.contornoFechado = contornoFechado;
window.cunhaAbertura = cunhaAbertura;

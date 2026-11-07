// ============================================================
//  PunçãoAcad — Exportação para AutoCAD (DXF R12 ASCII)
//
//  DWG é formato binário proprietário da Autodesk e não pode ser gerado
//  com segurança no navegador. DXF é o formato de intercâmbio criado pela
//  própria Autodesk: o AutoCAD abre nativamente e permite "Salvar como .dwg".
//
//  Convenções do arquivo gerado:
//    • 1 unidade de desenho = 1 cm (mesmas unidades do app)
//    • origem (0,0) no centro do pilar
//    • eixo X = direção de C1 · eixo Y = direção de C2 (Y para cima, padrão CAD)
// ============================================================

// Cores ACI por camada
const DXF_LAYERS = [
  ['PILAR',            8, 'CONTINUOUS'],
  ['CONTORNO-C',       7, 'CONTINUOUS'],
  ['CONTORNO-C-LINHA', 5, 'DASHED'],
  ['CONTORNO-C-DUAS',  1, 'DASHED'],
  ['ARMADURA-PUNCAO',  2, 'CONTINUOUS'],
  ['EIXOS',            8, 'DASHED'],
  ['COTAS',            3, 'CONTINUOUS'],
  ['TEXTO',            7, 'CONTINUOUS'],
];

const dxfNum = v => (Number.isFinite(v) ? v : 0).toFixed(4);

// O DXF R12 não carrega Unicode de forma confiável: remove acentos e usa os
// códigos de controle do AutoCAD (%%c = Ø, %%d = grau).
function dxfTxt(s) {
  return String(s)
    .replace(/Ø/g, '%%c')
    .replace(/°/g, '%%d')
    .replace(/[₀₁₂₃]/g, c => ({ '₀': '0', '₁': '1', '₂': '2', '₃': '3' }[c]))
    .replace(/[′″]/g, c => (c === '′' ? "'" : '"'))
    .replace(/·/g, '.')
    .replace(/−/g, '-')
    .replace(/τ/g, 'tau').replace(/ρ/g, 'rho').replace(/α/g, 'alfa')
    .replace(/√/g, 'raiz').replace(/≤/g, '<=').replace(/≥/g, '>=')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // tira acentos
    .replace(/[^\x20-\x7E]/g, '');                     // sobra só ASCII
}

function dxfGerador() {
  const L = [];
  const par = (codigo, valor) => { L.push(String(codigo)); L.push(String(valor)); };
  return {
    par,
    linha(x1, y1, x2, y2, layer) {
      par(0, 'LINE'); par(8, layer);
      par(10, dxfNum(x1)); par(20, dxfNum(y1)); par(30, '0.0');
      par(11, dxfNum(x2)); par(21, dxfNum(y2)); par(31, '0.0');
    },
    circulo(cx, cy, r, layer) {
      par(0, 'CIRCLE'); par(8, layer);
      par(10, dxfNum(cx)); par(20, dxfNum(cy)); par(30, '0.0');
      par(40, dxfNum(r));
    },
    // ângulos em graus, sentido anti-horário de ini até fim
    arco(cx, cy, r, ini, fim, layer) {
      par(0, 'ARC'); par(8, layer);
      par(10, dxfNum(cx)); par(20, dxfNum(cy)); par(30, '0.0');
      par(40, dxfNum(r)); par(50, dxfNum(ini)); par(51, dxfNum(fim));
    },
    // align: 'esq' (padrão) | 'centro' | 'dir'
    texto(x, y, altura, s, layer, align) {
      par(0, 'TEXT'); par(8, layer);
      par(10, dxfNum(x)); par(20, dxfNum(y)); par(30, '0.0');
      par(40, dxfNum(altura));
      par(1, dxfTxt(s));
      if (align === 'centro' || align === 'dir') {
        par(72, align === 'centro' ? 1 : 2);          // 1 = centro, 2 = direita
        par(11, dxfNum(x)); par(21, dxfNum(y)); par(31, '0.0');
      }
    },
    saida: () => L,
  };
}

// Contorno paralelo ao pilar, afastado `off`: 4 retas + 4 arcos de raio `off`.
// Para pilar circular, um único círculo.
function dxfContorno(g, circ, D, C1, C2, off, layer) {
  if (circ) { g.circulo(0, 0, D / 2 + off, layer); return; }
  const a = C1 / 2, b = C2 / 2;
  g.linha(-a, -b - off, a, -b - off, layer);   // inferior
  g.linha(a + off, -b, a + off, b, layer);     // direita
  g.linha(a, b + off, -a, b + off, layer);     // superior
  g.linha(-a - off, b, -a - off, -b, layer);   // esquerda
  g.arco(a, -b, off, 270, 360, layer);         // canto inferior direito
  g.arco(a, b, off, 0, 90, layer);             // canto superior direito
  g.arco(-a, b, off, 90, 180, layer);          // canto superior esquerdo
  g.arco(-a, -b, off, 180, 270, layer);        // canto inferior esquerdo
}

// Cota vertical: linha entre y1 e y2 em x, com marcas de extremidade, linhas de
// chamada até o desenho e rótulo alinhado à direita, imediatamente à esquerda
// da linha de cota (assim nunca invade o desenho nem a cota vizinha).
function dxfCotaV(g, x, y1, y2, xChamada, rotulo, alt) {
  g.linha(x, y1, x, y2, 'COTAS');
  const t = alt * 0.5;
  g.linha(x - t, y1, x + t, y1, 'COTAS');
  g.linha(x - t, y2, x + t, y2, 'COTAS');
  g.linha(x + t, y1, xChamada, y1, 'COTAS');
  g.linha(x + t, y2, xChamada, y2, 'COTAS');
  g.texto(x - alt * 0.8, (y1 + y2) / 2 - alt * 0.4, alt, rotulo, 'COTAS', 'dir');
}

// ------------------------------------------------------------
//  gerarDXF(R, nome) → string com o arquivo DXF completo
// ------------------------------------------------------------
function gerarDXF(R, nome) {
  if (!R || R.error) return null;

  const { circ, D, cC1: C1, cC2: C2, d, u1, u2, s0, sr, etapa9 } = R;
  const temArm = !!(R.studs && R.studs.layout);
  const p = etapa9 ? etapa9.p : null;
  const offCl = 2 * d;
  const offCpp = p != null ? 2 * d + p : null;

  const g = dxfGerador();
  const alt = Math.max(1.5, d * 0.19);     // altura de texto proporcional ao desenho
  const meiaX = circ ? D / 2 : C1 / 2;     // meia-largura do pilar
  const meiaY = circ ? D / 2 : C2 / 2;
  const offMax = offCpp != null ? offCpp : offCl;

  // ── eixos de simetria ───────────────────────────────────
  const ext = Math.max(meiaX, meiaY) + offMax + 6 * alt;
  g.linha(-ext, 0, ext, 0, 'EIXOS');
  g.linha(0, -ext, 0, ext, 'EIXOS');

  // ── pilar (contorno C) ──────────────────────────────────
  if (circ) {
    g.circulo(0, 0, D / 2, 'PILAR');
  } else {
    const a = C1 / 2, b = C2 / 2;
    g.linha(-a, -b, a, -b, 'PILAR');
    g.linha(a, -b, a, b, 'PILAR');
    g.linha(a, b, -a, b, 'PILAR');
    g.linha(-a, b, -a, -b, 'PILAR');
  }

  // ── contornos críticos ──────────────────────────────────
  dxfContorno(g, circ, D, C1, C2, offCl, 'CONTORNO-C-LINHA');
  if (offCpp != null) dxfContorno(g, circ, D, C1, C2, offCpp, 'CONTORNO-C-DUAS');

  // ── armadura de punção ──────────────────────────────────
  if (temArm) {
    const lay = R.studs.layout;
    const rConector = R.studs.phi / 20;   // mm → raio em cm
    lay.raios.forEach(raio => {
      const ini = raio.tFace;
      const fim = raio.tFace + s0 + (lay.ncam - 1) * sr;
      // atenção: a geometria interna usa Y para baixo (SVG); no DXF, Y para cima
      g.linha(raio.ux * ini, -raio.uy * ini, raio.ux * fim, -raio.uy * fim, 'ARMADURA-PUNCAO');
    });
    lay.pontos.forEach(pt => g.circulo(pt.x, -pt.y, rConector, 'ARMADURA-PUNCAO'));
  }

  // ── escada de cotas, inteiramente à esquerda do desenho ──
  // Cada linha de cota fica um "passo" mais à esquerda que a anterior, e o
  // rótulo é alinhado à direita encostado nela: nunca invade o desenho nem
  // colide com a cota vizinha, qualquer que seja a escala do caso.
  const faceTopo = meiaY;
  const passo = 9 * alt;                       // > largura do maior rótulo
  const xChamada = 0;                          // as cotas são medidas sobre o eixo Y
  let xCota = -(meiaX + offMax) - 3 * alt;     // primeira linha de cota, fora do desenho
  if (temArm) {
    dxfCotaV(g, xCota, faceTopo, faceTopo + s0, xChamada, `s0 = ${s0.toFixed(2)}`, alt);
    if (R.studs.ncam > 1) {
      dxfCotaV(g, xCota, faceTopo + s0, faceTopo + s0 + sr, xChamada, `sr = ${sr.toFixed(2)}`, alt);
    }
    xCota -= passo;
  }
  dxfCotaV(g, xCota, faceTopo, faceTopo + offCl, xChamada, `2d = ${offCl.toFixed(2)}`, alt);
  if (offCpp != null) {
    xCota -= passo;
    dxfCotaV(g, xCota, faceTopo, faceTopo + p, xChamada, `p = ${p.toFixed(2)}`, alt);
  }
  const xEsq = xCota - passo;                  // extremo esquerdo ocupado

  // ── rótulos dos contornos ───────────────────────────────
  g.texto(meiaX + offCl + alt, meiaY + offCl - alt, alt, "CONTORNO C'", 'TEXTO');
  if (offCpp != null) {
    g.texto(meiaX + offCpp + alt, meiaY + offCpp - alt, alt, 'CONTORNO C"', 'TEXTO');
  }
  g.texto(0, -alt / 2, alt, 'PILAR', 'TEXTO', 'centro');

  // ── quadro de informações abaixo do desenho ─────────────
  const yBase = -(meiaY + offMax + 4 * alt);
  const dl = alt * 1.9;
  let y = yBase;
  const xTexto = Math.min(-ext, xEsq);
  const nota = s => { g.texto(xTexto, y, alt, s, 'TEXTO'); y -= dl; };
  const notaT = s => { g.texto(xTexto, y, alt * 1.5, s, 'TEXTO'); y -= dl * 1.5; };

  notaT(`PUNCAO - ${nome || 'caso de estudo'}`);
  nota('ABNT NBR 6118:2026 - pilar interno - unidades em cm (1 unidade = 1 cm)');
  nota(circ
    ? `PILAR CIRCULAR  D = ${D}   h laje = ${R.inputs.h}   fck = ${R.inputs.fck} MPa`
    : `PILAR ${C1} x ${C2}   h laje = ${R.inputs.h}   fck = ${R.inputs.fck} MPa`);
  nota(`dx = ${R.dx.toFixed(2)}   dy = ${R.dy.toFixed(2)}   d = ${d.toFixed(2)}   rho = ${R.rho.toFixed(5)}`);
  nota(`u1 = ${u1.toFixed(2)}   u2 = ${u2.toFixed(2)}` + (etapa9 ? `   u3 = ${etapa9.u3.toFixed(2)}` : ''));
  nota(`Fsd = ${R.Fsd.toFixed(1)} kN   Msd1x = ${R.Msd1x.toFixed(0)}   Msd1y = ${R.Msd1y.toFixed(0)} kN.cm`);
  y -= dl * 0.5;

  if (temArm) {
    nota(`ARMADURA: ${R.studs.nconec} x ${R.studs.ncam} = ${R.studs.nconec * R.studs.ncam} conectores %%c${R.studs.phi} mm`);
    nota(`s0 = ${s0.toFixed(2)}   sr = ${sr.toFixed(2)}   p = ${p.toFixed(2)}   se real = ${R.studs.se_real.toFixed(2)} (limite 2d = ${(2 * d).toFixed(2)})`);
    nota(`Asw por camada = ${R.studs.Asw.toFixed(3)} cm2   fywd = ${R.fywd.toFixed(1)} MPa`);
    y -= dl * 0.5;
  }

  nota('VERIFICACOES:');
  nota(`  contorno C   : tauSd = ${R.tauSd_C.toFixed(2)} / tauRd2 = ${R.tauRd2.toFixed(2)} MPa  -> ${R.verif1 ? 'OK' : 'NAO PASSA'}`);
  nota(`  contorno C'  : tauSd = ${R.tauSd_Cl.toFixed(2)} / tauRd1 = ${R.tauRd1.toFixed(2)} MPa  -> ${R.verif2 ? 'OK' : 'EXIGE ARMADURA'}`);
  if (temArm) {
    nota(`  contorno C'  : tauSd = ${R.tauSd_Cl.toFixed(2)} / tauRd3 = ${R.tauRd3.toFixed(2)} MPa  -> ${R.verif3 ? 'OK' : 'ARMADURA INSUFICIENTE'}`);
  }
  if (etapa9) {
    nota(`  contorno C"  : tauSd = ${etapa9.tauSd_Cpp.toFixed(2)} / tauRd1 = ${R.tauRd1.toFixed(2)} MPa  -> ${etapa9.verif4 ? 'OK' : 'NAO PASSA'}`);
  }

  // ── montagem do arquivo ─────────────────────────────────
  const ents = g.saida();
  const out = [];
  const par = (c, v) => { out.push(String(c)); out.push(String(v)); };
  const yMin = y - dl, yMax = ext, xMin = xTexto, xMax = ext;

  // HEADER
  par(0, 'SECTION'); par(2, 'HEADER');
  par(9, '$ACADVER'); par(1, 'AC1009');
  par(9, '$INSBASE'); par(10, '0.0'); par(20, '0.0'); par(30, '0.0');
  par(9, '$EXTMIN'); par(10, dxfNum(xMin)); par(20, dxfNum(yMin)); par(30, '0.0');
  par(9, '$EXTMAX'); par(10, dxfNum(xMax)); par(20, dxfNum(yMax)); par(30, '0.0');
  par(9, '$LUNITS'); par(70, 2);
  par(9, '$INSUNITS'); par(70, 5);       // 5 = centímetros
  par(0, 'ENDSEC');

  // TABLES: linetypes e layers
  par(0, 'SECTION'); par(2, 'TABLES');
  par(0, 'TABLE'); par(2, 'LTYPE'); par(70, 2);
  par(0, 'LTYPE'); par(2, 'CONTINUOUS'); par(70, 0); par(3, 'Solid line');
  par(72, 65); par(73, 0); par(40, '0.0');
  par(0, 'LTYPE'); par(2, 'DASHED'); par(70, 0); par(3, 'Dashed __ __ __');
  par(72, 65); par(73, 2); par(40, dxfNum(alt * 1.2));
  par(49, dxfNum(alt * 0.8)); par(49, dxfNum(-alt * 0.4));
  par(0, 'ENDTAB');

  par(0, 'TABLE'); par(2, 'LAYER'); par(70, DXF_LAYERS.length);
  DXF_LAYERS.forEach(([n, cor, lt]) => {
    par(0, 'LAYER'); par(2, n); par(70, 0); par(62, cor); par(6, lt);
  });
  par(0, 'ENDTAB');
  par(0, 'ENDSEC');

  // ENTITIES
  par(0, 'SECTION'); par(2, 'ENTITIES');
  ents.forEach(v => out.push(v));
  par(0, 'ENDSEC');
  par(0, 'EOF');

  return out.join('\r\n') + '\r\n';
}

window.gerarDXF = gerarDXF;
window.dxfTxt = dxfTxt;

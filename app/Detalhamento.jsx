/* global React */

// ============================================================
//  Detalhamento — desenhos cotados gerados a partir do caso
//  calculado. Cada figura vive num quadro próprio, com margem
//  suficiente para que nenhuma cota invada o desenho vizinho.
// ============================================================

const CINZA = '#c4c8cf';
const TRACO = '#3b465a';
const AZUL = '#1d4499';
const VERM = '#d1402a';
const LARANJA = '#e08a13';
const TEXTO = '#0f172a';
const SUAVE = '#64748b';
const MONO = 'JetBrains Mono, monospace';

const n2 = v => (Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '—');
const n1 = v => (Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '—');
const n0 = v => (Number.isFinite(v) ? Math.round(v).toString() : '—');

// Marcadores de seta reutilizáveis por todas as figuras
function Defs({ id }) {
  return (
    <defs>
      <marker id={`${id}-e`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill={AZUL} />
      </marker>
      <marker id={`${id}-s`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M10,0 L0,5 L10,10 z" fill={AZUL} />
      </marker>
      <pattern id={`${id}-hachura`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(15,42,92,0.22)" strokeWidth="0.7" />
      </pattern>
    </defs>
  );
}

// Cota horizontal com texto acima da linha
function CotaH({ id, x1, x2, y, txt, cor = AZUL, dy = -4 }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={cor} strokeWidth="0.8"
        markerStart={`url(#${id}-s)`} markerEnd={`url(#${id}-e)`} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={cor} strokeWidth="0.8" />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={cor} strokeWidth="0.8" />
      <text x={(x1 + x2) / 2} y={y + dy} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={cor}>{txt}</text>
    </g>
  );
}

// Cota vertical com texto à direita da linha
function CotaV({ id, y1, y2, x, txt, cor = AZUL, dx = 5, anchor = 'start' }) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={cor} strokeWidth="0.8"
        markerStart={`url(#${id}-s)`} markerEnd={`url(#${id}-e)`} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={cor} strokeWidth="0.8" />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={cor} strokeWidth="0.8" />
      <text x={x + dx} y={(y1 + y2) / 2 + 3} textAnchor={anchor} fontSize="9" fontFamily={MONO} fill={cor}>{txt}</text>
    </g>
  );
}

// Contorno paralelo ao pilar, afastado `off` cm (cantos arredondados)
function contornoD(circ, D, C1, C2, off, X, Y, S) {
  if (circ) return null; // círculo é desenhado com <circle>
  const r = off * S;
  const x0 = X(-C1 / 2), x1 = X(C1 / 2), y0 = Y(-C2 / 2), y1 = Y(C2 / 2);
  return `M ${x0} ${y0 - r} L ${x1} ${y0 - r}`
    + ` A ${r} ${r} 0 0 1 ${x1 + r} ${y0}`
    + ` L ${x1 + r} ${y1} A ${r} ${r} 0 0 1 ${x1} ${y1 + r}`
    + ` L ${x0} ${y1 + r} A ${r} ${r} 0 0 1 ${x0 - r} ${y1}`
    + ` L ${x0 - r} ${y0} A ${r} ${r} 0 0 1 ${x0} ${y0 - r} Z`;
}

// ============================================================
//  1) Configuração adotada — planta da roseta de armadura
//     (equivalente ao desenho "Configuração adotada" da planilha)
// ============================================================
function ConfiguracaoAdotada({ R }) {
  if (!R || !R.studs || !R.studs.layout) return null;
  const id = 'cfg';
  const W = 560, H = 470;
  const { circ, D, cC1: C1, cC2: C2, d } = R;
  const { s0, sr, etapa9 } = R;
  const lay = R.studs.layout;
  const p = etapa9 ? etapa9.p : s0 + (R.studs.ncam - 1) * sr;

  // extensão total a enquadrar: contorno C″ (2d além da última camada)
  const offCpp = 2 * d + p;
  const extX = (circ ? D / 2 : C1 / 2) + offCpp;
  const extY = (circ ? D / 2 : C2 / 2) + offCpp;
  // margem esquerda maior: abriga a escada de cotas fora do desenho
  const mEsq = 150, mDir = 30, mTopo = 46, mBase = 76;
  const S = Math.min((W - mEsq - mDir) / (2 * extX), (H - mTopo - mBase) / (2 * extY));
  const cx = mEsq + (W - mEsq - mDir) / 2;
  const cy = mTopo + (H - mTopo - mBase) / 2;
  const X = cm => cx + cm * S;
  const Y = cm => cy + cm * S;

  const faceTopo = circ ? -D / 2 : -C2 / 2;   // y (cm) da face superior
  const yFace = Y(faceTopo);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />

      {/* contorno C″ */}
      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2 + offCpp) * S} fill="none" stroke={VERM} strokeWidth="1.4" />
        : <path d={contornoD(circ, D, C1, C2, offCpp, X, Y, S)} fill="none" stroke={VERM} strokeWidth="1.4" />}
      {/* contorno C′ */}
      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2 + 2 * d) * S} fill="none" stroke={AZUL} strokeWidth="1.2" />
        : <path d={contornoD(circ, D, C1, C2, 2 * d, X, Y, S)} fill="none" stroke={AZUL} strokeWidth="1.2" />}

      {/* raios + conectores */}
      {lay.raios.map(r => {
        const ini = r.tFace, fim = r.tFace + s0 + (lay.ncam - 1) * sr;
        return (
          <line key={`r${r.i}`}
            x1={X(r.ux * ini)} y1={Y(r.uy * ini)}
            x2={X(r.ux * fim)} y2={Y(r.uy * fim)}
            stroke={TRACO} strokeWidth="0.7" />
        );
      })}
      {lay.pontos.map((pt, i) => (
        <circle key={`p${i}`} cx={X(pt.x)} cy={Y(pt.y)} r="2.6" fill={TEXTO} />
      ))}

      {/* pilar */}
      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2) * S} fill="white" stroke={TRACO} strokeWidth="1.2" />
        : <rect x={X(-C1 / 2)} y={Y(-C2 / 2)} width={C1 * S} height={C2 * S}
            fill="white" stroke={TRACO} strokeWidth="1.2" />}

      {/* escada de cotas, fora do desenho: 2d à esquerda, s0/sr ao lado */}
      {(() => {
        const x2d = 44, xCad = 112;
        const yS0 = Y(faceTopo - s0);
        const ySr = Y(faceTopo - s0 - sr);
        const y2d = Y(faceTopo - 2 * d);
        const chamada = (y, ate) => (
          <line x1={ate} y1={y} x2={X(0)} y2={y} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
        );
        return (
          <g>
            {chamada(yFace, x2d - 8)}
            {chamada(yS0, xCad - 8)}
            {chamada(ySr, xCad - 8)}
            {chamada(y2d, x2d - 8)}
            {/* s0 e sr: rótulos em lados opostos da linha, nunca colidem */}
            <CotaV id={id} x={xCad} y1={yFace} y2={yS0} txt={`s₀ = ${n2(s0)}`} dx={-6} anchor="end" />
            {lay.ncam > 1 && (
              <CotaV id={id} x={xCad} y1={yS0} y2={ySr} txt={`sr = ${n2(sr)}`} dx={6} anchor="start" />
            )}
            {/* 2d: rótulo acima da seta, em área livre */}
            <CotaV id={id} x={x2d} y1={yFace} y2={y2d} txt="" dx={0} />
            <text x={x2d} y={y2d - 9} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={AZUL}>
              2d = {n2(2 * d)}
            </text>
          </g>
        );
      })()}

      {/* maior vão tangencial na última camada — destacado sem rótulo sobreposto */}
      {(() => {
        const u = lay.raios.map(r => r.camadas[lay.ncam - 1]);
        let melhor = 0, dMax = -1;
        for (let i = 0; i < u.length; i++) {
          const a = u[i], b = u[(i + 1) % u.length];
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          if (dist > dMax) { dMax = dist; melhor = i; }
        }
        const a = u[melhor], b = u[(melhor + 1) % u.length];
        return (
          <g>
            <line x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)}
              stroke={LARANJA} strokeWidth="1.6" />
            <circle cx={X(a.x)} cy={Y(a.y)} r="3.4" fill="none" stroke={LARANJA} strokeWidth="1.2" />
            <circle cx={X(b.x)} cy={Y(b.y)} r="3.4" fill="none" stroke={LARANJA} strokeWidth="1.2" />
          </g>
        );
      })()}

      {/* título e legenda */}
      <text x={W / 2} y="18" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Configuração adotada — planta
      </text>
      <g fontSize="9" fontFamily="Inter">
        <line x1="14" y1={H - 46} x2="34" y2={H - 46} stroke={AZUL} strokeWidth="1.2" />
        <text x="40" y={H - 43} fill={SUAVE}>C′ — contorno a 2d</text>
        <line x1="14" y1={H - 30} x2="34" y2={H - 30} stroke={VERM} strokeWidth="1.4" />
        <text x="40" y={H - 27} fill={SUAVE}>C″ — contorno a 2d + p</text>
        <line x1="14" y1={H - 14} x2="34" y2={H - 14} stroke={LARANJA} strokeWidth="1.6" />
        <text x="40" y={H - 11} fill={SUAVE}>
          maior vão tangencial na última camada: se = {n2(R.studs.se_real)} cm (limite 2d = {n2(2 * d)} cm)
        </text>
        <circle cx="304" cy={H - 46} r="2.6" fill={TEXTO} />
        <text x="314" y={H - 43} fill={SUAVE}>
          {R.studs.nconec} × {R.studs.ncam} = {R.studs.nconec * R.studs.ncam} conectores Ø{R.studs.phi} mm
        </text>
        <text x="314" y={H - 27} fill={SUAVE}>
          s₀ = {n2(s0)} · sr = {n2(sr)} · p = {n2(p)} cm
        </text>
      </g>
    </svg>
  );
}

// ============================================================
//  2) Corte da laje: faixa 3d + C + 3d, alturas úteis
// ============================================================
function FigCorteFaixa({ R }) {
  const id = 'f1';
  const W = 560, H = 262;
  const { d, dx, dy, cC1: C1, inputs: I } = R;
  const faixa = 3 * d + C1 + 3 * d;
  // faixa desenhada entre xF0 e xF1; sobra reservada às cotas dx/dy (esq.) e h (dir.)
  const xF0 = 96, xF1 = 476;
  const S = (xF1 - xF0) / faixa;
  const cx = (xF0 + xF1) / 2;
  // escala vertical ampliada: sem isso as duas malhas ficariam sobrepostas
  const hPx = 96;
  const yTop = 56, yBot = yTop + hPx;
  const xPil0 = cx - (C1 / 2) * S, xPil1 = cx + (C1 / 2) * S;
  const escala = hPx / I.h;             // px por cm na vertical
  const extY = R.camadaExterna === 'y';
  const phiExt = (extY ? I.phi_ly : I.phi_lx) / 10;
  const phiInt = (extY ? I.phi_lx : I.phi_ly) / 10;
  const yBarExt = yTop + (I.cobrimento + phiExt / 2) * escala;
  const yBarInt = yTop + (I.cobrimento + phiExt + phiInt / 2) * escala;
  const dExtLbl = extY ? 'dy' : 'dx', dIntLbl = extY ? 'dx' : 'dy';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Corte da laje — faixa de cálculo de ρ
      </text>

      {/* mini-legenda das duas malhas, acima da laje (sem linhas de chamada) */}
      <g fontSize="8.5" fontFamily={MONO}>
        <line x1={xF0} y1="36" x2={xF0 + 16} y2="36" stroke="#7e8a9c" strokeWidth="2.4" strokeLinecap="round" />
        <text x={xF0 + 22} y="39" fill={TEXTO}>A_s{extY ? 'y' : 'x'} (externa)</text>
        <circle cx={xF0 + 154} cy="36" r="2.2" fill="#7e8a9c" stroke={TRACO} strokeWidth="0.3" />
        <text x={xF0 + 162} y="39" fill={TEXTO}>A_s{extY ? 'x' : 'y'} (interna)</text>
        <text x={xF1 + 16} y="39" textAnchor="end" fill={SUAVE}>escala vertical ampliada</text>
      </g>

      {/* laje */}
      <rect x={xF0 - 22} y={yTop} width={xF1 - xF0 + 44} height={hPx} fill="#eaecef" stroke={TRACO} strokeWidth="1" />
      <rect x={xF0 - 22} y={yTop} width={xF1 - xF0 + 44} height={hPx} fill={`url(#${id}-hachura)`} />
      <text x={xF1 + 22} y={yBot + 12} fontSize="8.5" fontFamily="Inter" fill={SUAVE}>Laje</text>

      {/* pilar abaixo */}
      <rect x={xPil0} y={yBot} width={xPil1 - xPil0} height="40" fill={CINZA} stroke={TRACO} strokeWidth="1" />
      <rect x={xPil0} y={yBot} width={xPil1 - xPil0} height="40" fill={`url(#${id}-hachura)`} />
      <text x={cx} y={yBot + 25} textAnchor="middle" fontSize="9" fontFamily="Inter" fill={TEXTO}>Pilar</text>

      {/* barras */}
      <line x1={xF0 - 16} y1={yBarExt} x2={xF1 + 16} y2={yBarExt} stroke="#7e8a9c" strokeWidth="2.4" strokeLinecap="round" />
      {Array.from({ length: 16 }, (_, i) => xF0 - 10 + i * ((xF1 - xF0 + 20) / 15)).map((x, i) => (
        <circle key={i} cx={x} cy={yBarInt} r="2.2" fill="#7e8a9c" stroke={TRACO} strokeWidth="0.3" />
      ))}

      {/* alturas úteis: dInt mais afastada, dExt junto à laje, h à direita */}
      <line x1={xF0 - 22} y1={yBarExt} x2="52" y2={yBarExt} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <line x1={xF0 - 22} y1={yBarInt} x2="24" y2={yBarInt} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <CotaV id={id} x={58} y1={yTop} y2={yBarExt} txt={dExtLbl} dx={-5} anchor="end" />
      <CotaV id={id} x={30} y1={yTop} y2={yBarInt} txt={dIntLbl} dx={-5} anchor="end" />
      <CotaV id={id} x={W - 26} y1={yTop} y2={yBot} txt="h" dx={5} />

      {/* faixa 3d + C1 + 3d */}
      <line x1={xF0} y1={yBot + 2} x2={xF0} y2={yBot + 62} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <line x1={xPil0} y1={yBot + 44} x2={xPil0} y2={yBot + 62} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <line x1={xPil1} y1={yBot + 44} x2={xPil1} y2={yBot + 62} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <line x1={xF1} y1={yBot + 2} x2={xF1} y2={yBot + 62} stroke={SUAVE} strokeWidth="0.4" strokeDasharray="2 2" />
      <CotaH id={id} x1={xF0} x2={xPil0} y={yBot + 58} txt={`3d = ${n2(3 * d)}`} />
      <CotaH id={id} x1={xPil0} x2={xPil1} y={yBot + 58} txt={`C₁ = ${n0(C1)}`} />
      <CotaH id={id} x1={xPil1} x2={xF1} y={yBot + 58} txt={`3d = ${n2(3 * d)}`} />

      <text x={W / 2} y={H - 19} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={SUAVE}>
        {dExtLbl} = {n2(extY ? dy : dx)} · {dIntLbl} = {n2(extY ? dx : dy)} · d = {n2(d)} · h = {n0(I.h)} cm
      </text>
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={SUAVE}>
        faixa = 3d + C₁ + 3d = {n2(faixa)} cm
      </text>
    </svg>
  );
}

// ============================================================
//  3) Planta do pilar com os momentos aplicados
// ============================================================
function FigMomentos({ R }) {
  const id = 'f2';
  const W = 560, H = 250;
  const { circ, D, cC1: C1, cC2: C2, inputs: I } = R;
  const larg = circ ? D : C1, alt = circ ? D : C2;
  const S = Math.min(170 / larg, 110 / alt);
  const cx = W / 2 - 10, cy = H / 2 + 6;
  const w = larg * S, hh = alt * S;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Pilar em planta — momentos característicos
      </text>

      {circ
        ? <circle cx={cx} cy={cy} r={w / 2} fill="none" stroke={TRACO} strokeWidth="1.3" />
        : <rect x={cx - w / 2} y={cy - hh / 2} width={w} height={hh} fill="none" stroke={TRACO} strokeWidth="1.3" />}

      {/* M1x — seta para cima */}
      <line x1={cx} y1={cy} x2={cx} y2={cy - hh / 2 - 46} stroke={AZUL} strokeWidth="1.4" markerEnd={`url(#${id}-e)`} />
      <text x={cx + 7} y={cy - hh / 2 - 34} fontSize="10" fontFamily={MONO} fill={AZUL}>M1x</text>
      {/* M1y — seta para a direita */}
      <line x1={cx} y1={cy} x2={cx + w / 2 + 52} y2={cy} stroke={AZUL} strokeWidth="1.4" markerEnd={`url(#${id}-e)`} />
      <text x={cx + w / 2 + 20} y={cy + 16} fontSize="10" fontFamily={MONO} fill={AZUL}>M1y</text>

      {/* cotas */}
      <CotaH id={id} x1={cx - w / 2} x2={cx + w / 2} y={cy + hh / 2 + 30} txt={circ ? `Ø = ${n0(D)}` : `${n0(C1)}`} />
      {!circ && <CotaV id={id} x={cx - w / 2 - 30} y1={cy - hh / 2} y2={cy + hh / 2} txt={`${n0(C2)}`} dx={-6} anchor="end" />}

      {/* eixos */}
      <g transform={`translate(30,${H - 42})`}>
        <line x1="0" y1="0" x2="24" y2="0" stroke={TEXTO} strokeWidth="1" markerEnd={`url(#${id}-e)`} />
        <line x1="0" y1="0" x2="0" y2="-24" stroke={TEXTO} strokeWidth="1" markerEnd={`url(#${id}-e)`} />
        <text x="28" y="4" fontSize="9" fontFamily={MONO} fill={TEXTO}>x</text>
        <text x="-3" y="-28" fontSize="9" fontFamily={MONO} fill={TEXTO}>y</text>
      </g>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={SUAVE}>
        M1x = {n0(I.Mxk)} · M1y = {n0(I.Myk)} kN·cm · Fsk = {n0(I.Fsk)} kN
      </text>
    </svg>
  );
}

// ============================================================
//  4) Contorno crítico C′ afastado 2d
// ============================================================
function FigPerimetroCl({ R }) {
  const id = 'f3';
  const W = 560, H = 300;
  const { circ, D, cC1: C1, cC2: C2, d, u1, u2 } = R;
  const extX = (circ ? D / 2 : C1 / 2) + 2 * d;
  const extY = (circ ? D / 2 : C2 / 2) + 2 * d;
  const S = Math.min((W - 150) / (2 * extX), (H - 130) / (2 * extY));
  const cx = W / 2, cy = H / 2 + 8;
  const X = cm => cx + cm * S, Y = cm => cy + cm * S;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Contornos de controle C e C′
      </text>

      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2 + 2 * d) * S} fill="none" stroke={AZUL} strokeWidth="1.3" strokeDasharray="6 4" />
        : <path d={contornoD(circ, D, C1, C2, 2 * d, X, Y, S)} fill="none" stroke={AZUL} strokeWidth="1.3" strokeDasharray="6 4" />}
      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2) * S} fill={CINZA} stroke={TRACO} strokeWidth="1.2" />
        : <rect x={X(-C1 / 2)} y={Y(-C2 / 2)} width={C1 * S} height={C2 * S} fill={CINZA} stroke={TRACO} strokeWidth="1.2" />}

      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fontFamily="Inter" fill={TEXTO}>Pilar</text>
      <text x={X(0) + (extX) * S + 6} y={Y(-extY) + 4} fontSize="9" fontFamily={MONO} fill={AZUL}>C′</text>

      {/* 2d à esquerda e abaixo */}
      <CotaH id={id} x1={X(-C1 / 2 - 2 * d)} x2={X(-C1 / 2)} y={cy} txt={`2d`} dy={-5} />
      <CotaV id={id} x={cx} y1={Y(C2 / 2)} y2={Y(C2 / 2 + 2 * d)} txt={`2d = ${n2(2 * d)}`} dx={6} />

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={SUAVE}>
        u₁ = {n2(u1)} cm · u₂ = {n2(u2)} cm
      </text>
    </svg>
  );
}

// ============================================================
//  5) Tabela do coeficiente K com a razão do caso destacada
// ============================================================
function FigTabelaK({ R }) {
  if (R.circ) {
    return (
      <div className="fig-nota">
        Pilar circular interno: K = 0,60 (valor fixo) e W<sub>p</sub> = (Ø + 4d)².
      </div>
    );
  }
  const razaoX = R.cC1 / R.cC2, razaoY = R.cC2 / R.cC1;
  const linhas = [
    { r: '0,5', k: '0,45' }, { r: '1,0', k: '0,60' },
    { r: '2,0', k: '0,70' }, { r: '3,0', k: '0,80' },
  ];
  return (
    <div>
      <table className="tabela-k">
        <tbody>
          <tr>
            <th>C<sub>1</sub>/C<sub>2</sub></th>
            {linhas.map(l => <td key={l.r}>{l.r}</td>)}
          </tr>
          <tr>
            <th>K</th>
            {linhas.map(l => <td key={l.r}>{l.k}</td>)}
          </tr>
        </tbody>
      </table>
      <div className="fig-nota">
        C₁ é a dimensão do pilar paralela à excentricidade da força; C₂ é a perpendicular.
        Valores intermediários por interpolação linear.
      </div>
      <div className="kv-grid" style={{ marginTop: 8 }}>
        <span className="k">Para M<sub>sd1x</sub>: C₁/C₂ = {n2(razaoX)}</span>
        <span className="v">k<sub>x</sub> = {R.kx.toFixed(4).replace('.', ',')}</span>
        <span className="k">Para M<sub>sd1y</sub>: C₂/C₁ = {n2(razaoY)}</span>
        <span className="v">k<sub>y</sub> = {R.ky.toFixed(4).replace('.', ',')}</span>
      </div>
    </div>
  );
}

// ============================================================
//  6) Orientação dos momentos: C1/C2 trocam de papel
// ============================================================
function FigOrientacaoMomentos({ R }) {
  const id = 'f5';
  const W = 560, H = 230;
  const { circ, D, cC1: C1, cC2: C2, d } = R;
  if (circ) {
    return <div className="fig-nota">Pilar circular: não há troca de C₁/C₂ — K = 0,60 nas duas direções.</div>;
  }
  const S = Math.min(66 / Math.max(C1, C2), 1.6);
  const bloco = (ox, larg, alt, rotLbl, momLbl, vertical) => {
    const cx = ox, cy = H / 2;
    const w = larg * S, hh = alt * S;
    const off = 2 * d * S * 0.45;
    return (
      <g key={rotLbl}>
        <path d={contornoD(false, 0, larg, alt, 2 * d * 0.45,
          cm => cx + cm * S, cm => cy + cm * S, S)}
          fill="none" stroke={SUAVE} strokeWidth="1" strokeDasharray="5 3" />
        <rect x={cx - w / 2} y={cy - hh / 2} width={w} height={hh} fill={CINZA} stroke={TRACO} strokeWidth="1.1" />
        <rect x={cx - w / 2} y={cy - hh / 2} width={w} height={hh} fill={`url(#${id}-hachura)`} />
        <text x={cx} y={cy + hh / 2 + off + 15} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={TEXTO}>
          c₁ = {n0(larg)}
        </text>
        <text x={cx + w / 2 + off + 12} y={cy + 4} fontSize="9" fontFamily={MONO} fill={TEXTO}>c₂ = {n0(alt)}</text>
        {vertical ? (
          <>
            <line x1={cx - w / 2 - off - 22} y1={cy + 20} x2={cx - w / 2 - off - 22} y2={cy - 30}
              stroke={AZUL} strokeWidth="1.3" markerEnd={`url(#${id}-e)`} />
            <text x={cx - w / 2 - off - 30} y={cy + 34} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={AZUL}>{momLbl}</text>
          </>
        ) : (
          <>
            <line x1={cx - 24} y1={cy + hh / 2 + off + 30} x2={cx + 26} y2={cy + hh / 2 + off + 30}
              stroke={AZUL} strokeWidth="1.3" markerEnd={`url(#${id}-e)`} />
            <text x={cx} y={cy + hh / 2 + off + 46} textAnchor="middle" fontSize="9.5" fontFamily={MONO} fill={AZUL}>{momLbl}</text>
          </>
        )}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Orientação dos momentos — C₁ é sempre a dimensão paralela à excentricidade
      </text>
      {bloco(W * 0.29, C1, C2, 'a', 'Msd1x', true)}
      {bloco(W * 0.74, C2, C1, 'b', 'Msd1y', false)}
    </svg>
  );
}

// ============================================================
//  7) Contorno C″ além da armadura
// ============================================================
function FigContornoCpp({ R }) {
  if (!R.etapa9 || !R.studs || !R.studs.layout) {
    return <div className="fig-nota">Depende da armadura de punção definida na etapa 5.</div>;
  }
  const id = 'f6';
  const W = 560, H = 340;
  const { circ, D, cC1: C1, cC2: C2, d } = R;
  const lay = R.studs.layout;
  const p = R.etapa9.p;
  const off = 2 * d + p;
  const extX = (circ ? D / 2 : C1 / 2) + off;
  const extY = (circ ? D / 2 : C2 / 2) + off;
  const S = Math.min((W - 120) / (2 * extX), (H - 120) / (2 * extY));
  const cx = W / 2, cy = H / 2 + 6;
  const X = cm => cx + cm * S, Y = cm => cy + cm * S;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs id={id} />
      <text x={W / 2} y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fill={SUAVE}>
        Contorno C″ — 2d além da última camada
      </text>

      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2 + off) * S} fill="none" stroke={VERM} strokeWidth="1.3" strokeDasharray="6 4" />
        : <path d={contornoD(circ, D, C1, C2, off, X, Y, S)} fill="none" stroke={VERM} strokeWidth="1.3" strokeDasharray="6 4" />}

      {lay.pontos.map((pt, i) => (
        <circle key={i} cx={X(pt.x)} cy={Y(pt.y)} r="2.2" fill={TEXTO} />
      ))}
      {circ
        ? <circle cx={cx} cy={cy} r={(D / 2) * S} fill={CINZA} stroke={TRACO} strokeWidth="1.1" />
        : <rect x={X(-C1 / 2)} y={Y(-C2 / 2)} width={C1 * S} height={C2 * S} fill={CINZA} stroke={TRACO} strokeWidth="1.1" />}

      <text x={X(0) + extX * S * 0.72} y={Y(-extY) + 2} fontSize="9.5" fontFamily={MONO} fill={VERM}>C″</text>
      {/* 2d da última camada até C″ */}
      {(() => {
        const rUlt = (circ ? D / 2 : C2 / 2) + p;
        return (
          <CotaV id={id} x={cx + 16} y1={Y(rUlt)} y2={Y(rUlt + 2 * d)} txt={`2d = ${n2(2 * d)}`} dx={6} cor={VERM} />
        );
      })()}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={SUAVE}>
        p = {n2(p)} cm · u₃ = {n2(R.etapa9.u3)} cm
      </text>
    </svg>
  );
}

// ============================================================
//  Seção de documentação: roteiro + figuras, cada uma isolada
// ============================================================
function Detalhamento({ R }) {
  if (!R || R.error) return null;
  const temStuds = !!R.studs;

  const roteiro = [
    ['1', 'Dados iniciais e alturas úteis',
      `Coleta da geometria, materiais e esforços. As duas malhas de flexão são sobrepostas, então d${R.camadaExterna} (externa) = ${n2(R.camadaExterna === 'y' ? R.dy : R.dx)} cm e a interna = ${n2(R.camadaExterna === 'y' ? R.dx : R.dy)} cm, resultando d = ${n2(R.d)} cm.`],
    ['2', 'Valores de cálculo',
      `Majoração das ações por γf = 1,4 e minoração das resistências por γc = 1,4 e γs = 1,15: Fsd = ${n2(R.Fsd)} kN, fcd = ${n2(R.fcd)} MPa.`],
    ['3', 'Perímetros de controle',
      `Contorno C no perímetro do pilar (u₁ = ${n2(R.u1)} cm) e contorno C′ afastado 2d (u₂ = ${n2(R.u2)} cm).`],
    ['4', 'Tensão resistente da armadura',
      `fywd em função da espessura: ${R.fywdCaso === 'menor' ? 'h < 15 cm → 250 MPa' : R.fywdCaso === 'maior' ? 'h > 35 cm → 435 MPa' : `15 ≤ h ≤ 35 cm → interpolação → ${n2(R.fywd)} MPa`}.`],
    ['5', 'Taxa de armadura passiva',
      `ρ medido na faixa do pilar acrescida de 3d de cada lado: ρx = ${R.rox.toFixed(5)}, ρy = ${R.roy.toFixed(5)}, ρ = ${R.rho.toFixed(5)}.`],
    ['6', 'Superfície C — compressão diagonal',
      `Verifica o esmagamento da biela junto ao pilar: τSd = ${n2(R.tauSd_C)} MPa contra τRd2 = ${n2(R.tauRd2)} MPa. ${R.verif1 ? 'Atende.' : 'NÃO atende — aumentar a seção do pilar ou fck.'}`],
    ['7', 'Superfície C′ sem armadura',
      `Inclui o efeito dos momentos via K e Wp: τSd = ${n2(R.tauSd_Cl)} MPa contra τRd1 = ${n2(R.tauRd1)} MPa. ${R.verif2 ? 'O concreto sozinho resiste — dispensa armadura.' : 'Excedido: a ligação exige armadura de punção.'}`],
    ['8', 'Superfície C′ com armadura',
      temStuds
        ? `Com ${R.studs.nconec} conectores Ø${R.studs.phi} mm por camada em ${R.studs.ncam} camadas, τRd3 = ${n2(R.tauRd3)} MPa contra τSd = ${n2(R.tauSd_Cl)} MPa. ${R.verif3 ? 'Atende.' : 'NÃO atende — reforçar a armadura.'}`
        : 'Pendente: definir a armadura de punção na etapa 5 do formulário.'],
    ['9', 'Superfície C″',
      R.etapa9
        ? `Contorno 2d além da última camada (u₃ = ${n2(R.etapa9.u3)} cm): τSd = ${n2(R.etapa9.tauSd_Cpp)} MPa contra τRd1 = ${n2(R.tauRd1)} MPa. ${R.etapa9.verif4 ? 'A armadura pode ser interrompida aqui.' : 'NÃO atende — estender a armadura com mais camadas.'}`
        : 'Pendente: depende da armadura de punção.'],
  ];

  return (
    <div className="doc-section">
      <div className="results-inner">
        <div className="results-header">
          <div className="title-wrap">
            <h2>Documentação e detalhamento</h2>
            <div className="meta">Roteiro do cálculo e desenhos cotados com as dimensões deste caso</div>
          </div>
        </div>

        {/* Roteiro passo a passo */}
        <div className="result-card" style={{ marginBottom: 18 }}>
          <div className="result-card-head"><h4>Roteiro do cálculo</h4></div>
          <div className="result-card-body">
            <ol className="roteiro">
              {roteiro.map(([n, t, txt]) => (
                <li key={n}>
                  <span className="roteiro-n">{n}</span>
                  <div>
                    <b>{t}</b>
                    <p>{txt}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Figuras — uma por quadro, sem sobreposição */}
        <div className="doc-figs">
          <FigCard titulo="Faixa de cálculo de ρ e alturas úteis" cite="item 19.5.3.2">
            <FigCorteFaixa R={R} />
          </FigCard>

          <FigCard titulo="Pilar e momentos aplicados" cite="item 19.5.2.2">
            <FigMomentos R={R} />
          </FigCard>

          <FigCard titulo="Contornos C e C′" cite="item 19.5.2.1">
            <FigPerimetroCl R={R} />
          </FigCard>

          <FigCard titulo="Contorno C″" cite="item 19.5.3.4">
            <FigContornoCpp R={R} />
          </FigCard>

          <FigCard titulo="Coeficiente K" cite="item 19.5.2.3">
            <FigTabelaK R={R} />
          </FigCard>

          <FigCard titulo="Orientação dos momentos" cite="item 19.5.2.3">
            <FigOrientacaoMomentos R={R} />
          </FigCard>

          {/* por último e ocupando a linha inteira: é o desenho principal e
              evita deixar meia linha vazia no fim da grade */}
          {temStuds && (
            <FigCard titulo="Configuração da armadura adotada" cite="item 19.5.3.3" larga>
              <ConfiguracaoAdotada R={R} />
            </FigCard>
          )}
        </div>
      </div>
    </div>
  );
}

function FigCard({ titulo, cite, children, larga }) {
  return (
    <div className={"result-card fig-card" + (larga ? ' larga' : '')}>
      <div className="result-card-head">
        <h4>{titulo}</h4>
        {cite && <span className="ref">{cite}</span>}
      </div>
      <div className="result-card-body">{children}</div>
    </div>
  );
}

window.Detalhamento = Detalhamento;
window.ConfiguracaoAdotada = ConfiguracaoAdotada;

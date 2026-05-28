/* global React */
const { useMemo: useMemoH } = React;

// ============================================================
//  HelperDiagrams — 2D SVG explainers shown next to inputs
// ============================================================

// 1) Plan view of column with C1 / C2 and eccentricity arrow
function HelperPilar({ secao, C1, C2, diam }) {
  const W = 200, H = 130;
  if (secao === 'circular') {
    const r = 35;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <marker id="ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#1d4499" />
          </marker>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="none" />
        <circle cx={W/2} cy={H/2} r={r} fill="#c4c8cf" stroke="#3b465a" strokeWidth="1.2" />
        <line x1={W/2-r} y1={H/2+r+10} x2={W/2+r} y2={H/2+r+10} stroke="#1d4499" strokeWidth="1" markerEnd="url(#ar1)" markerStart="url(#ar1)" />
        <text x={W/2} y={H/2+r+24} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#0f172a">Ø = {diam || '—'} cm</text>
        <text x={W/2} y="14" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="Inter">Vista em planta · pilar circular</text>
      </svg>
    );
  }
  // rectangular
  const cw = Math.max(50, Math.min(120, (C1 || 40) * 1.5));
  const ch = Math.max(28, Math.min(90, (C2 || 25) * 1.5));
  const cx = W/2, cy = H/2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#1d4499" />
        </marker>
        <marker id="ar2b" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M10,0 L0,5 L10,10 z" fill="#1d4499" />
        </marker>
      </defs>
      {/* column */}
      <rect x={cx-cw/2} y={cy-ch/2} width={cw} height={ch} fill="#c4c8cf" stroke="#3b465a" strokeWidth="1.2" />
      {/* eccentricity arrow (force offset center) */}
      <circle cx={cx} cy={cy} r="2.5" fill="#1d4499" />
      <line x1={cx} y1={cy} x2={cx+18} y2={cy-12} stroke="#9333ea" strokeWidth="1.5" markerEnd="url(#ar2)" />
      <text x={cx+22} y={cy-14} fontSize="9" fill="#9333ea" fontFamily="Inter" fontWeight="600">e</text>
      {/* C1 dimension below */}
      <line x1={cx-cw/2} y1={cy+ch/2+10} x2={cx+cw/2} y2={cy+ch/2+10} stroke="#1d4499" strokeWidth="0.8" markerEnd="url(#ar2)" markerStart="url(#ar2b)" />
      <text x={cx} y={cy+ch/2+22} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#0f172a">C₁ = {C1 || '—'} cm</text>
      {/* C2 dimension right */}
      <line x1={cx+cw/2+10} y1={cy-ch/2} x2={cx+cw/2+10} y2={cy+ch/2} stroke="#1d4499" strokeWidth="0.8" markerEnd="url(#ar2)" markerStart="url(#ar2b)" />
      <text x={cx+cw/2+13} y={cy+3} fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#0f172a">C₂ = {C2 || '—'} cm</text>
      <text x={cx} y="12" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="Inter">Vista em planta · pilar retangular</text>
    </svg>
  );
}

// 2) Axonometric column with force + moments
function HelperCargas({ Fsk, Mxk, Myk }) {
  const W = 220, H = 150;
  const scaleF = Math.min(1.4, 0.6 + (Fsk || 0) / 400);
  const scaleM = Math.min(1.5, 0.7 + Math.log((Mxk || 0) + (Myk || 0) + 1) / 5);
  const cx = W / 2, cy = H / 2 + 8;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <marker id="ahr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#b42318" />
        </marker>
        <marker id="ahm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#9333ea" />
        </marker>
        <marker id="ahy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#16a394" />
        </marker>
      </defs>
      {/* slab plane (parallelogram) */}
      <polygon points={`${cx-70},${cy+18} ${cx+70},${cy+18} ${cx+90},${cy+38} ${cx-50},${cy+38}`} fill="#e6ecf3" stroke="#94a3b8" strokeWidth="0.8" />
      {/* column box */}
      <polygon points={`${cx-14},${cy-40} ${cx+14},${cy-40} ${cx+22},${cy-32} ${cx-6},${cy-32} ${cx-6},${cy+18} ${cx-14},${cy+18}`} fill="#c4c8cf" stroke="#3b465a" strokeWidth="0.8" />
      <polygon points={`${cx-14},${cy-40} ${cx+14},${cy-40} ${cx+14},${cy+10} ${cx-14},${cy+10}`} fill="#cdd2da" stroke="#3b465a" strokeWidth="0.8" />
      {/* Force Fsk */}
      {Fsk > 0 && (
        <g>
          <line x1={cx} y1={cy-75*scaleF} x2={cx} y2={cy-44} stroke="#b42318" strokeWidth="2.4" markerEnd="url(#ahr)" />
          <text x={cx+6} y={cy-58} fontSize="10" fill="#b42318" fontWeight="700" fontFamily="Inter">Fsk</text>
        </g>
      )}
      {/* Moment Mxk — curved around x axis */}
      {Mxk > 0 && (
        <g transform={`translate(${cx-3},${cy-40})`}>
          <path d={`M -22,0 A 22,12 0 0,1 22,0`} stroke="#9333ea" strokeWidth="2" fill="none" markerEnd="url(#ahm)" />
          <text x="0" y="-6" textAnchor="middle" fontSize="9" fill="#9333ea" fontWeight="700" fontFamily="Inter">Mx</text>
        </g>
      )}
      {/* Moment Myk — curved around y axis */}
      {Myk > 0 && (
        <g transform={`translate(${cx+1},${cy-36})`}>
          <path d={`M -22,4 A 22,12 0 0,0 22,4`} stroke="#16a394" strokeWidth="2" fill="none" markerEnd="url(#ahy)" />
          <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#16a394" fontWeight="700" fontFamily="Inter">My</text>
        </g>
      )}
      <text x="8" y="14" fontSize="10" fill="#64748b" fontFamily="Inter">Esforços no topo do pilar</text>
    </svg>
  );
}

// 3) Section cut with h labeled + fck chip
function HelperLaje({ h, fck }) {
  const W = 220, H = 130;
  const slabH = Math.max(18, Math.min(80, (h || 17) * 2.2));
  const yTop = 30, yBot = yTop + slabH;
  const fckClass = fck ? `C${Math.round(fck)}` : 'C—';
  // map fck to a "concrete tone"
  const tone = fck ? `hsl(220, ${Math.max(5, 15 - (fck-20)/3)}%, ${Math.max(60, 86 - (fck-20)*0.6)}%)` : '#dcdfe4';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x="20" y={yTop} width="180" height={slabH} fill={tone} stroke="#3b465a" strokeWidth="1" />
      {/* hatching for concrete */}
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,42,92,0.18)" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect x="20" y={yTop} width="180" height={slabH} fill="url(#hatch)" />
      {/* h dimension */}
      <line x1="208" y1={yTop} x2="208" y2={yBot} stroke="#1d4499" strokeWidth="0.8" />
      <line x1="205" y1={yTop} x2="211" y2={yTop} stroke="#1d4499" strokeWidth="0.8" />
      <line x1="205" y1={yBot} x2="211" y2={yBot} stroke="#1d4499" strokeWidth="0.8" />
      <text x="212" y={(yTop+yBot)/2 + 3} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#0f172a">h = {h || '—'} cm</text>
      {/* fck chip */}
      <rect x="28" y={yBot - 22} width="44" height="18" rx="3" fill="white" stroke="#1d4499" strokeWidth="0.9" />
      <text x="50" y={yBot - 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1d4499" fontFamily="Inter">{fckClass}</text>
      <text x="28" y={yTop - 8} fontSize="10" fill="#64748b" fontFamily="Inter">Corte transversal da laje</text>
    </svg>
  );
}

// 4) Section showing rebar layer order with dx / dy
function HelperArmaduras({ h, cobrimento, phiw_x, phiw_y, phi_lx, phi_ly, dx, dy }) {
  const W = 260, H = 150;
  const yTop = 14, yBot = 122;
  const slabH = yBot - yTop;
  const hcm = h || 20;
  const pxPerCm = slabH / hcm;
  const c = cobrimento || 2.5;
  const wx = (phiw_x || 6.3) / 10;
  const wy = (phiw_y || 6.3) / 10;
  const lx = (phi_lx || 12.5) / 10;
  const ly = (phi_ly || 12.5) / 10;

  const yCob = yTop + c * pxPerCm;
  const yEstX = yCob + wx * pxPerCm;
  const yBarX = yEstX + lx * pxPerCm / 2;
  const yEstY = yEstX + lx * pxPerCm;
  const yBarY = yEstY + wy * pxPerCm + ly * pxPerCm / 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* slab */}
      <rect x="30" y={yTop} width="200" height={slabH} fill="#eaecef" stroke="#3b465a" strokeWidth="1" />
      {/* concrete hatch */}
      <defs>
        <pattern id="h2" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(15,42,92,0.10)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect x="30" y={yTop} width="200" height={slabH} fill="url(#h2)" />

      {/* cobrimento line */}
      <line x1="30" y1={yCob} x2="230" y2={yCob} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="0.6" />
      <text x="34" y={yCob - 2} fontSize="9" fill="#64748b" fontFamily="JetBrains Mono, monospace">c = {c} cm</text>

      {/* Estribo x — small circles in profile */}
      {[60, 100, 140, 180].map((x, i) => (
        <circle key={`ex${i}`} cx={x} cy={yEstX} r={Math.max(1.5, wx * pxPerCm / 2)} fill="#99a4b3" stroke="#3b465a" strokeWidth="0.4" />
      ))}
      {/* Barra x — wide line */}
      <line x1="32" y1={yBarX} x2="228" y2={yBarX} stroke="#99a4b3" strokeWidth={Math.max(1.5, lx * pxPerCm)} strokeLinecap="round" />

      {/* Estribo y — circles */}
      {[60, 100, 140, 180].map((x, i) => (
        <circle key={`ey${i}`} cx={x} cy={yEstY + wy*pxPerCm/2} r={Math.max(1.5, wy * pxPerCm / 2)} fill="#99a4b3" stroke="#3b465a" strokeWidth="0.4" opacity="0.7"/>
      ))}
      {/* Barra y — small circles (cross-section seen end-on) */}
      {[60, 100, 140, 180].map((x, i) => (
        <circle key={`by${i}`} cx={x} cy={yBarY} r={Math.max(1.8, ly * pxPerCm / 2)} fill="#7e8a9c" stroke="#3b465a" strokeWidth="0.4" />
      ))}

      {/* dx / dy dimensions */}
      <line x1="248" y1={yTop} x2="248" y2={yBarX} stroke="#1d4499" strokeWidth="0.7" />
      <line x1="245" y1={yTop} x2="251" y2={yTop} stroke="#1d4499" strokeWidth="0.7" />
      <line x1="245" y1={yBarX} x2="251" y2={yBarX} stroke="#1d4499" strokeWidth="0.7" />
      <text x="251" y={(yTop+yBarX)/2 + 3} fontSize="9" fill="#1d4499" fontFamily="JetBrains Mono, monospace">d</text>
      <text x="251" y={(yTop+yBarX)/2 + 11} fontSize="7" fill="#1d4499" fontFamily="JetBrains Mono, monospace">x={dx ? dx.toFixed(1) : '—'}</text>
      <text x="251" y={(yTop+yBarX)/2 + 19} fontSize="7" fill="#1d4499" fontFamily="JetBrains Mono, monospace">y={dy ? dy.toFixed(1) : '—'}</text>

      <text x="34" y={yBot + 12} fontSize="10" fill="#64748b" fontFamily="Inter">Sequência das camadas (topo → base)</text>
    </svg>
  );
}

// 5) Top view of stud rosette
function HelperStuds({ secao, C1, C2, diam, d, nconec, ncam }) {
  const W = 220, H = 180;
  const cx = W/2, cy = H/2;
  const scale = 1.2;
  const _C1 = (secao === 'circular' ? (diam || 50) : (C1 || 40)) * scale * 0.7;
  const _C2 = (secao === 'circular' ? (diam || 50) : (C2 || 25)) * scale * 0.7;
  const dPx = (d || 15) * scale * 0.7;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* column */}
      {secao === 'circular' ? (
        <circle cx={cx} cy={cy} r={_C1/2} fill="#c4c8cf" stroke="#3b465a" strokeWidth="1" />
      ) : (
        <rect x={cx - _C1/2} y={cy - _C2/2} width={_C1} height={_C2} fill="#c4c8cf" stroke="#3b465a" strokeWidth="1" />
      )}
      {/* studs — radial */}
      {Array.from({length: Math.max(4, nconec || 8)}).map((_, arm) => {
        const ang = (arm / Math.max(4, nconec || 8)) * Math.PI * 2;
        return Array.from({length: ncam || 2}).map((_, layer) => {
          const r0 = (secao === 'circular' ? _C1/2 : Math.max(_C1, _C2)/2);
          const rL = r0 + 0.5 * dPx + layer * 0.75 * dPx;
          const x = cx + Math.cos(ang) * rL;
          const y = cy + Math.sin(ang) * rL;
          if (secao !== 'circular' && Math.abs(x-cx) < _C1/2 + 1 && Math.abs(y-cy) < _C2/2 + 1) return null;
          return <circle key={`${arm}-${layer}`} cx={x} cy={y} r="3" fill="#99a4b3" stroke="#3b465a" strokeWidth="0.5" />;
        });
      })}
      <text x="8" y="14" fontSize="10" fill="#64748b" fontFamily="Inter">Roseta de studs · vista em planta</text>
      <text x={W-8} y={H-8} textAnchor="end" fontSize="9.5" fontFamily="JetBrains Mono, monospace" fill="#0f172a">
        {(nconec || '—')} × {(ncam || '—')} camadas
      </text>
    </svg>
  );
}

window.HelperPilar = HelperPilar;
window.HelperCargas = HelperCargas;
window.HelperLaje = HelperLaje;
window.HelperArmaduras = HelperArmaduras;
window.HelperStuds = HelperStuds;

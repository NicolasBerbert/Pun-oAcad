/* global React */

// ============================================================
//  Results — collapsible cards with formulas, substitutions, verdicts
// ============================================================

const fmt = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '—');
const fmtPct = (v, n = 3) => Number.isFinite(v) ? (v * 100).toFixed(n) : '—';

function VerdictPill({ ok, label }) {
  if (ok === null || ok === undefined) return <span className="verdict-pill warn"><span className="dot"></span>Pendente</span>;
  if (ok) return <span className="verdict-pill ok"><span className="dot"></span>{label || 'OK'}</span>;
  return <span className="verdict-pill err"><span className="dot"></span>{label || 'Não atende'}</span>;
}

function ResultCard({ title, cite, ok, children }) {
  return (
    <div className="result-card">
      <div className="result-card-head">
        <h4>{title}</h4>
        {cite && <span className="ref">{cite}</span>}
        {(ok === true || ok === false) && (
          <div style={{marginLeft:'auto'}}>
            <VerdictPill ok={ok} />
          </div>
        )}
      </div>
      <div className="result-card-body">{children}</div>
    </div>
  );
}

function KV({ rows }) {
  return (
    <div className="kv-grid">
      {rows.map(([k, v, unit], i) => (
        <React.Fragment key={i}>
          <span className="k" dangerouslySetInnerHTML={{__html: k}} />
          <span className="v">{v}{unit ? ` ${unit}` : ''}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Formula({ children }) {
  return <div className="formula">{children}</div>;
}

function Results({ R, onConfigurarStuds, onExportar }) {
  if (!R) return null;
  if (R.error) {
    return (
      <div className="results-section">
        <div className="results-inner">
          <div className="callout" style={{background:'var(--err-bg)', borderColor:'var(--err-bd)', color:'var(--err)'}}>
            ⚠ Não foi possível calcular: {R.error === 'missing' ? `campo "${R.missing}" obrigatório` : R.error}.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="results-inner">
        <div className="results-header">
          <div className="title-wrap">
            <h2>Resumo do dimensionamento</h2>
            <div className="meta">
              Cálculo conforme ABNT NBR 6118:2023 · pilar interno {R.circ ? 'circular' : 'retangular'} · momentos Mx + My
            </div>
          </div>
          <div className="actions" style={{marginLeft:'auto'}}>
            <button className="btn btn-sm" onClick={() => window.print()}>
              <Ico name="print"/> Imprimir
            </button>
            <button className="btn btn-sm btn-primary" onClick={onExportar}>
              <Ico name="download"/> Exportar relatório PDF
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="summary-strip">
          <Tile name="Contorno C" label="Esmagamento" ok={R.verif1}
            verdict={`τSd = ${fmt(R.tauSd_C)} MPa · τRd2 = ${fmt(R.tauRd2)} MPa`} />
          <Tile name="Contorno C′" label="Sem armadura" ok={R.verif2}
            verdict={R.verif2
              ? `τSd = ${fmt(R.tauSd_Cl)} ≤ τRd1 = ${fmt(R.tauRd1)} MPa`
              : `τSd = ${fmt(R.tauSd_Cl)} > τRd1 = ${fmt(R.tauRd1)} MPa`} />
          <Tile name="Contorno C′" label="Com armadura"
            ok={R.studs ? R.verif3 : null}
            verdict={R.studs ? `τRd3 = ${fmt(R.tauRd3)} MPa` : 'Configurar studs'} />
          <Tile name="Contorno C″" label="Além da armadura"
            ok={R.etapa9 ? R.etapa9.verif4 : null}
            verdict={R.etapa9 ? `τSd = ${fmt(R.etapa9.tauSd_Cpp)} MPa` : '—'} />
        </div>

        {R.precisaArm && !R.studs && (
          <div className="callout" style={{marginBottom: 16}}>
            <span>⚠ <b>Necessita armadura de punção.</b> O concreto isolado não atende ao contorno C′.</span>
            <button className="btn btn-primary btn-sm" onClick={onConfigurarStuds}>Configurar studs →</button>
          </div>
        )}

        <div className="results-grid">

          {/* ── Valores de cálculo */}
          <ResultCard title="Valores de cálculo" cite="γc=1,4 · γs=1,15 · γf=1,4">
            <Formula>
              <span className="var">f<sub>cd</sub></span> = f<sub>ck</sub>/γ<sub>c</sub> ={' '}
              <span className="num">{fmt(R.inputs.fck)}</span> / 1,4 ={' '}
              <span className="num">{fmt(R.fcd)} MPa</span>
            </Formula>
            <KV rows={[
              ['f<sub>cd</sub>', fmt(R.fcd), 'MPa'],
              ['f<sub>yd</sub>', fmt(R.fyd), 'MPa'],
              [`f<sub>ywd</sub> (${R.tipoArm === 'estribo' ? 'estribo, base 250' : 'conector, base 300'} MPa)`, fmt(R.fywd), 'MPa'],
              ['F<sub>sd</sub>', fmt(R.Fsd), 'kN'],
              ['M<sub>sd1x</sub>', fmt(R.Msd1x), 'kN·cm'],
              ['M<sub>sd1y</sub>', fmt(R.Msd1y), 'kN·cm'],
              ['d<sub>x</sub>', fmt(R.dx), 'cm'],
              ['d<sub>y</sub>', fmt(R.dy), 'cm'],
              ['d (média)', fmt(R.d), 'cm'],
              ['ρ<sub>x</sub>', fmtPct(R.rox), '%'],
              ['ρ<sub>y</sub>', fmtPct(R.roy), '%'],
              ['ρ = √(ρ<sub>x</sub>·ρ<sub>y</sub>)', fmtPct(R.rho), '%'],
            ]} />
          </ResultCard>

          {/* ── Perímetros */}
          <ResultCard title="Perímetros de controle" cite="item 19.5.2.1">
            {R.circ ? (
              <>
                <Formula>
                  <span className="var">u<sub>1</sub></span> = π·Ø ={' '}
                  <span className="num">π·{R.D}</span> = <span className="num">{fmt(R.u1)} cm</span>
                </Formula>
                <Formula>
                  <span className="var">u<sub>2</sub></span> = π·(Ø + 4d) ={' '}
                  <span className="num">π·({R.D} + 4·{fmt(R.d)})</span> = <span className="num">{fmt(R.u2)} cm</span>
                </Formula>
              </>
            ) : (
              <>
                <Formula>
                  <span className="var">u<sub>1</sub></span> = 2·C<sub>1</sub> + 2·C<sub>2</sub> ={' '}
                  <span className="num">2·{R.cC1} + 2·{R.cC2}</span> = <span className="num">{fmt(R.u1)} cm</span>
                </Formula>
                <Formula>
                  <span className="var">u<sub>2</sub></span> = u<sub>1</sub> + 4π·d ={' '}
                  <span className="num">{fmt(R.u1)} + 4π·{fmt(R.d)}</span> = <span className="num">{fmt(R.u2)} cm</span>
                </Formula>
              </>
            )}
            {R.etapa9 && (
              <Formula>
                <span className="var">u<sub>3</sub></span> = u<sub>1</sub> + 2π·(2d + p) ={' '}
                <span className="num">{fmt(R.u1)} + 2π·(2·{fmt(R.d)} + {fmt(R.etapa9.p)})</span> = <span className="num">{fmt(R.etapa9.u3)} cm</span>
              </Formula>
            )}
          </ResultCard>

          {/* ── Etapa 6 */}
          <ResultCard title="Etapa 6 — Contorno C: esmagamento da biela" cite="item 19.5.3.1" ok={R.verif1}>
            <Formula>
              <span className="var">α<sub>v</sub></span> = 1 − f<sub>ck</sub>/250 = 1 − {R.inputs.fck}/250 = <span className="num">{fmt(R.alphaV, 3)}</span>
            </Formula>
            <Formula>
              <span className="var">τ<sub>Rd2</sub></span> = 0,27·α<sub>v</sub>·f<sub>cd</sub> ={' '}
              0,27·<span className="num">{fmt(R.alphaV, 3)}</span>·<span className="num">{fmt(R.fcd)}</span> ={' '}
              <span className="num">{fmt(R.tauRd2)} MPa</span>
            </Formula>
            <Formula>
              <span className="var">τ<sub>Sd</sub></span> = F<sub>sd</sub>/(u<sub>1</sub>·d) ={' '}
              <span className="num">{fmt(R.Fsd)}</span>/(<span className="num">{fmt(R.u1)}·{fmt(R.d)}</span>) ={' '}
              <span className="num">{fmt(R.tauSd_C)} MPa</span>
            </Formula>
            <div className="kv-grid">
              <span className="k">Verificação: τ<sub>Sd</sub> ≤ τ<sub>Rd2</sub></span>
              <span className="v">{fmt(R.tauSd_C)} {R.verif1 ? '≤' : '>'} {fmt(R.tauRd2)} MPa</span>
            </div>
          </ResultCard>

          {/* ── Etapa 7 */}
          <ResultCard title="Etapa 7 — Contorno C′: sem armadura" cite="item 19.5.3.2" ok={R.verif2}>
            <KV rows={R.circ ? [
              ['K (pilar circular interno)', fmt(R.kx, 2), ''],
              ['W<sub>p</sub> = (Ø + 4d)²', fmt(R.Wpx), 'cm³'],
            ] : [
              ['k<sub>x</sub> (interpolado, C₁/C₂ = ' + (R.cC1/R.cC2).toFixed(2) + ')', fmt(R.kx, 3), ''],
              ['k<sub>y</sub>', fmt(R.ky, 3), ''],
              ['W<sub>px</sub>', fmt(R.Wpx), 'cm³'],
              ['W<sub>py</sub>', fmt(R.Wpy), 'cm³'],
            ]} />
            <Formula>
              <span className="var">τ<sub>Sd</sub></span> = F<sub>sd</sub>/(u<sub>2</sub>·d) + k<sub>x</sub>·M<sub>sd,x</sub>/(W<sub>px</sub>·d) + k<sub>y</sub>·M<sub>sd,y</sub>/(W<sub>py</sub>·d) = <span className="num">{fmt(R.tauSd_Cl)} MPa</span>
            </Formula>
            <Formula>
              <span className="var">k<sub>e</sub></span> = min(1+√(20/d); 2) = min(<span className="num">{fmt(R.ke_raw, 3)}</span>; 2) = <span className="num">{fmt(R.fator_d, 3)}</span>
            </Formula>
            <Formula>
              <span className="var">τ<sub>Rd1</sub></span> = 0,13·k<sub>e</sub>·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup> ={' '}
              0,13·<span className="num">{fmt(R.fator_d, 3)}</span>·(100·<span className="num">{R.rho.toFixed(5)}</span>·<span className="num">{R.inputs.fck}</span>)<sup>1/3</sup> ={' '}
              <span className="num">{fmt(R.tauRd1)} MPa</span>
            </Formula>
            {!R.verif2 && (
              <div className="callout">
                <span>τ<sub>Sd</sub> &gt; τ<sub>Rd1</sub> — armadura de punção é necessária.</span>
                <button className="btn btn-primary btn-sm" onClick={onConfigurarStuds}>Configurar studs →</button>
              </div>
            )}
          </ResultCard>

          {/* ── Etapa 8 */}
          {R.precisaArm && (
            <ResultCard title="Etapa 8 — Contorno C′: com armadura" cite="item 19.5.3.3"
              ok={R.studs ? R.verif3 : null}>
              <KV rows={[
                ['s<sub>0</sub> ≤ 0,5·d', fmt(R.s0_lim), 'cm'],
                ['s<sub>r</sub> ≤ 0,75·d', fmt(R.sr_lim), 'cm'],
                ['s<sub>e</sub> = 2·d', fmt(R.se_lim), 'cm'],
              ]} />
              {R.studs ? (
                <>
                  <KV rows={[
                    [`Ø do ${R.tipoArm === 'estribo' ? 'estribo' : 'conector'}`, R.studs.phi, 'mm'],
                    ['n<sub>conec</sub> × n<sub>cam</sub>', `${R.studs.nconec} × ${R.studs.ncam}`, ''],
                    ['A<sub>s1c</sub> = π·Ø²/4', fmt(R.studs.As1c, 4), 'cm²'],
                    ['A<sub>sw</sub> = n<sub>conec</sub>·A<sub>s1c</sub> (por camada)', fmt(R.studs.Asw, 3), 'cm²'],
                  ]} />
                  <Formula>
                    <span className="var">τ<sub>Rd3</sub></span> = 0,10·k<sub>e</sub>·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup> + 1,5·(d/s<sub>r</sub>)·(A<sub>sw</sub>·f<sub>ywd</sub>·sen α)/(u<sub>2</sub>·d) = <span className="num">{fmt(R.tauRd3)} MPa</span>
                  </Formula>
                  <div className="kv-grid">
                    <span className="k">τ<sub>Sd</sub> {R.verif3 ? '≤' : '>'} τ<sub>Rd3</sub></span>
                    <span className="v">{fmt(R.tauSd_Cl)} / {fmt(R.tauRd3)} MPa</span>
                  </div>
                </>
              ) : (
                <div className="muted">Configure os studs (Etapa 5) para completar este cálculo.</div>
              )}
            </ResultCard>
          )}

          {/* ── Etapa 9 */}
          {R.etapa9 && (
            <ResultCard title="Etapa 9 — Contorno C″" cite="item 19.5.3.4" ok={R.etapa9.verif4}>
              <KV rows={[
                ['p (pilar → última camada)', fmt(R.etapa9.p), 'cm'],
                ['u<sub>3</sub>', fmt(R.etapa9.u3), 'cm'],
                ...(R.circ ? [
                  ['W<sub>p,C″</sub> = (Ø + 4d + 2p)²', fmt(R.etapa9.WpxCpp), 'cm³'],
                ] : [
                  ['W<sub>px,C″</sub>', fmt(R.etapa9.WpxCpp), 'cm³'],
                  ['W<sub>py,C″</sub>', fmt(R.etapa9.WpyCpp), 'cm³'],
                ]),
                ['τ<sub>Sd,C″</sub>', fmt(R.etapa9.tauSd_Cpp), 'MPa'],
                ['τ<sub>Rd1</sub>', fmt(R.tauRd1), 'MPa'],
              ]} />
              <div className="kv-grid">
                <span className="k">Verificação</span>
                <span className="v">τ<sub>Sd</sub> {R.etapa9.verif4 ? '≤' : '>'} τ<sub>Rd1</sub></span>
              </div>
            </ResultCard>
          )}

        </div>

      </div>
    </div>
  );
}

function Tile({ name, label, ok, verdict }) {
  const cls = ok === true ? 'ok' : ok === false ? 'err' : 'warn';
  const icon = ok === true ? '✓' : ok === false ? '✕' : '…';
  return (
    <div className={`summary-tile ${cls}`}>
      <span className="badge-mini">{icon}</span>
      <span className="label">{label}</span>
      <span className="name">{name}</span>
      <span className="verdict">{verdict}</span>
    </div>
  );
}

function Ico({ name }) {
  if (name === 'print') return <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 4V2h8v2M4 12H2V6h12v6h-2M5 9h6v5H5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
  if (name === 'download') return <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return null;
}

window.Results = Results;
window.Ico = Ico;

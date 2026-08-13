/* global React */

// ============================================================
//  Results — memorial de cálculo em 9 etapas, na mesma sequência
//  da planilha de referência (Programa Master PEC IBRACON).
//  Cada etapa mostra a fórmula simbólica, a substituição numérica
//  e o resultado destacado.
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

// Equação: símbolo = expressão = substituição = resultado
function Eq({ lhs, sym, sub, res, unit }) {
  return (
    <div className="formula">
      {lhs && <><span className="var">{lhs}</span> = </>}
      {sym}
      {sub != null && <> = <span className="num">{sub}</span></>}
      {res != null && <> = <span className="res">{res}{unit ? ` ${unit}` : ''}</span></>}
    </div>
  );
}

// Linha de verificação no padrão da planilha: condição + veredito
function Verif({ ok, cond, okMsg, errMsg }) {
  return (
    <div className={"verif-line " + (ok ? 'ok' : 'err')}>
      <span className="cond">{cond}</span>
      <span className="msg">{ok ? (okMsg || 'OK!') : (errMsg || 'Não atende!')}</span>
    </div>
  );
}

function Results({ R, onConfigurarStuds, onExportar }) {
  if (!R) return null;
  if (R.error) {
    return (
      <div className="results-section">
        <div className="results-inner">
          <div className="callout" style={{background:'var(--err-bg)', borderColor:'var(--err-bd)', color:'var(--err)'}}>
            ⚠ Não foi possível calcular: {R.error === 'missing' ? `campo "${R.missing}" obrigatório` : R.error === 'd_negative' ? 'altura útil resultante ≤ 0 — revise h, cobrimento e bitolas' : R.error}.
          </div>
        </div>
      </div>
    );
  }

  const I = R.inputs;
  const extY = R.camadaExterna === 'y';
  const phiExt = extY ? I.phi_ly : I.phi_lx;
  const phiInt = extY ? I.phi_lx : I.phi_ly;
  const temStuds = !!R.studs;

  return (
    <div className="results-section">
      <div className="results-inner">
        <div className="results-header">
          <div className="title-wrap">
            <h2>Memorial de cálculo</h2>
            <div className="meta">
              ABNT NBR 6118:2026 · pilar interno {R.circ ? 'circular' : 'retangular'} · momentos nas duas direções
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
            verdict={`τSd = ${fmt(R.tauSd_Cl)} ${R.verif2 ? '≤' : '>'} τRd1 = ${fmt(R.tauRd1)} MPa`} />
          <Tile name="Contorno C′" label="Com armadura"
            ok={temStuds ? R.verif3 : null}
            verdict={temStuds ? `τSd = ${fmt(R.tauSd_Cl)} ${R.verif3 ? '≤' : '>'} τRd3 = ${fmt(R.tauRd3)} MPa` : 'Configurar armadura'} />
          <Tile name="Contorno C″" label="Além da armadura"
            ok={R.etapa9 ? R.etapa9.verif4 : null}
            verdict={R.etapa9 ? `τSd = ${fmt(R.etapa9.tauSd_Cpp)} ${R.etapa9.verif4 ? '≤' : '>'} τRd1 = ${fmt(R.tauRd1)} MPa` : '—'} />
        </div>

        {R.precisaArm && !temStuds && (
          <div className="callout acao" style={{marginBottom: 16}}>
            <span>⚠ <b>Necessita armadura de punção.</b> O concreto isolado não atende ao contorno C′ — as etapas 8 e 9 só podem ser concluídas depois de definir a armadura.</span>
            <button className="btn btn-primary btn-sm" onClick={onConfigurarStuds}>Configurar armadura →</button>
          </div>
        )}

        <div className="results-grid">

          {/* ── Etapa 1 ── */}
          <ResultCard title="1 — Dados iniciais e alturas úteis" cite="item 19.5.2.1">
            <KV rows={[
              ['f<sub>ck</sub>', I.fck, 'MPa'],
              ['f<sub>yk</sub>', I.fyk, 'MPa'],
              ...(R.circ
                ? [['Ø do pilar', R.D, 'cm']]
                : [['C<sub>1</sub> (paralela à excentricidade)', R.cC1, 'cm'], ['C<sub>2</sub>', R.cC2, 'cm']]),
              ['h (espessura da laje)', I.h, 'cm'],
              ['cobrimento', I.cobrimento, 'cm'],
              ['Armadura x', `Ø${I.phi_lx} c/${I.s_x} cm`, ''],
              ['Armadura y', `Ø${I.phi_ly} c/${I.s_y} cm`, ''],
              ['F<sub>sk</sub>', I.Fsk, 'kN'],
              ['M<sub>k1x</sub>', I.Mxk, 'kN·cm'],
              ['M<sub>k1y</sub>', I.Myk, 'kN·cm'],
            ]} />
            <div className="muted" style={{fontSize: 12}}>
              Camada externa (mais próxima do topo): direção <b>{R.camadaExterna}</b>. A malha interna
              desce uma bitola inteira, por isso as duas alturas úteis diferem.
            </div>
            <Eq
              lhs={<>d<sub>{extY ? 'y' : 'x'}</sub></>}
              sym={<>h − cob − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub>/2</>}
              sub={`${I.h} − ${I.cobrimento} − ${(phiExt/10).toFixed(3)}/2`}
              res={fmt(extY ? R.dy : R.dx)} unit="cm" />
            <Eq
              lhs={<>d<sub>{extY ? 'x' : 'y'}</sub></>}
              sym={<>h − cob − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub> − Ø<sub>ℓ{extY ? 'x' : 'y'}</sub>/2</>}
              sub={`${I.h} − ${I.cobrimento} − ${(phiExt/10).toFixed(3)} − ${(phiInt/10).toFixed(3)}/2`}
              res={fmt(extY ? R.dx : R.dy)} unit="cm" />
            <Eq
              lhs="d"
              sym={<>(d<sub>x</sub> + d<sub>y</sub>)/2</>}
              sub={`(${fmt(R.dx)} + ${fmt(R.dy)})/2`}
              res={fmt(R.d)} unit="cm" />
          </ResultCard>

          {/* ── Etapa 2 ── */}
          <ResultCard title="2 — Valores de cálculo" cite="γc=1,4 · γs=1,15 · γf=1,4">
            <Eq lhs={<>f<sub>cd</sub></>} sym={<>f<sub>ck</sub>/γ<sub>c</sub></>}
              sub={`${I.fck}/1,4`} res={fmt(R.fcd)} unit="MPa" />
            <Eq lhs={<>f<sub>yd</sub></>} sym={<>f<sub>yk</sub>/γ<sub>s</sub></>}
              sub={`${I.fyk}/1,15`} res={fmt(R.fyd)} unit="MPa" />
            <Eq lhs={<>F<sub>sd</sub></>} sym={<>γ<sub>f</sub>·F<sub>sk</sub></>}
              sub={`1,4·${I.Fsk}`} res={fmt(R.Fsd)} unit="kN" />
            <Eq lhs={<>M<sub>sd1x</sub></>} sym={<>γ<sub>f</sub>·M<sub>k1x</sub></>}
              sub={`1,4·${I.Mxk}`} res={fmt(R.Msd1x)} unit="kN·cm" />
            <Eq lhs={<>M<sub>sd1y</sub></>} sym={<>γ<sub>f</sub>·M<sub>k1y</sub></>}
              sub={`1,4·${I.Myk}`} res={fmt(R.Msd1y)} unit="kN·cm" />
          </ResultCard>

          {/* ── Etapa 3 ── */}
          <ResultCard title="3 — Perímetros de controle" cite="item 19.5.2.1">
            <div className="muted" style={{fontSize: 12}}>
              Contorno C = perímetro do pilar. Contorno C′ = afastado 2d do pilar, com cantos arredondados.
            </div>
            {R.circ ? (
              <>
                <Eq lhs={<>u<sub>1</sub></>} sym={<>π·Ø</>} sub={`π·${R.D}`} res={fmt(R.u1)} unit="cm" />
                <Eq lhs={<>u<sub>2</sub></>} sym={<>π·(Ø + 4d)</>} sub={`π·(${R.D} + 4·${fmt(R.d)})`} res={fmt(R.u2)} unit="cm" />
              </>
            ) : (
              <>
                <Eq lhs={<>u<sub>1</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>)</>}
                  sub={`2·(${R.cC1} + ${R.cC2})`} res={fmt(R.u1)} unit="cm" />
                <Eq lhs={<>u<sub>2</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>) + 2π·2d</>}
                  sub={`${fmt(R.u1)} + 4π·${fmt(R.d)}`} res={fmt(R.u2)} unit="cm" />
              </>
            )}
          </ResultCard>

          {/* ── Etapa 4 ── */}
          <ResultCard title="4 — Tensão resistente da armadura de punção" cite="item 19.4.2">
            <div className="muted" style={{fontSize: 12}}>
              f<sub>ywd</sub> depende apenas da espessura da laje. São três situações:
            </div>
            <div className="casos">
              <div className={"caso" + (R.fywdCaso === 'menor' ? ' ativo' : '')}>
                <span className="cond">h &lt; 15 cm</span>
                <span className="val">f<sub>ywd</sub> = 250 MPa</span>
              </div>
              <div className={"caso" + (R.fywdCaso === 'interpolado' ? ' ativo' : '')}>
                <span className="cond">15 cm ≤ h ≤ 35 cm</span>
                <span className="val">interpolação linear</span>
              </div>
              <div className={"caso" + (R.fywdCaso === 'maior' ? ' ativo' : '')}>
                <span className="cond">h &gt; 35 cm</span>
                <span className="val">f<sub>ywd</sub> = 435 MPa</span>
              </div>
            </div>
            <div className="muted" style={{fontSize: 12}}>
              Neste caso h = {I.h} cm →{' '}
              <b>{R.fywdCaso === 'menor' ? 'primeira situação' : R.fywdCaso === 'maior' ? 'terceira situação' : 'segunda situação (interpolação)'}</b>.
            </div>
            {R.fywdCaso === 'menor' ? (
              <Eq lhs={<>f<sub>ywd</sub></>} sym={<>250 MPa, pois h = {I.h} cm &lt; 15 cm</>} res={fmt(R.fywd)} unit="MPa" />
            ) : R.fywdCaso === 'maior' ? (
              <Eq lhs={<>f<sub>ywd</sub></>} sym={<>435 MPa, pois h = {I.h} cm &gt; 35 cm</>} res={fmt(R.fywd)} unit="MPa" />
            ) : (
              <Eq lhs={<>f<sub>ywd</sub></>}
                sym={<>250 + (h − 15)·(435 − 250)/(35 − 15)</>}
                sub={`250 + (${I.h} − 15)·185/20`}
                res={fmt(R.fywd)} unit="MPa" />
            )}
          </ResultCard>

          {/* ── Etapa 5 ── */}
          <ResultCard title="5 — Taxa de armadura passiva da laje" cite="item 19.5.3.2">
            <div className="muted" style={{fontSize: 12}}>
              ρ é medido numa faixa igual à dimensão do pilar acrescida de 3d para cada lado.
            </div>
            <Eq lhs={<>A<sub>s1Ø,x</sub></>} sym={<>π·Ø<sub>ℓx</sub>²/4</>}
              sub={`π·${(I.phi_lx/10).toFixed(3)}²/4`} res={fmt(R.As1_x)} unit="cm²" />
            <Eq lhs="qx" sym={<>(3d + C<sub>1</sub> + 3d)/s<sub>x</sub></>}
              sub={`${fmt(R.faixaX)}/${I.s_x}`} res={`${fmt(R.qx_exato, 3)} ≅ ${R.qx} barras`} />
            <Eq lhs={<>ρ<sub>x</sub></>} sym={<>qx·A<sub>s1Ø,x</sub>/(d<sub>x</sub>·(3d + C<sub>1</sub> + 3d))</>}
              sub={`${fmt(R.qx_exato, 3)}·${fmt(R.As1_x)}/(${fmt(R.dx)}·${fmt(R.faixaX)})`}
              res={R.rox.toFixed(5)} />
            <Eq lhs="qy" sym={<>(3d + C<sub>2</sub> + 3d)/s<sub>y</sub></>}
              sub={`${fmt(R.faixaY)}/${I.s_y}`} res={`${fmt(R.qy_exato, 3)} ≅ ${R.qy} barras`} />
            <Eq lhs={<>ρ<sub>y</sub></>} sym={<>qy·A<sub>s1Ø,y</sub>/(d<sub>y</sub>·(3d + C<sub>2</sub> + 3d))</>}
              sub={`${fmt(R.qy_exato, 3)}·${fmt(R.As1_y)}/(${fmt(R.dy)}·${fmt(R.faixaY)})`}
              res={R.roy.toFixed(5)} />
            <Eq lhs="ρ" sym={<>√(ρ<sub>x</sub>·ρ<sub>y</sub>) ≤ 0,02</>}
              sub={`√(${R.rox.toFixed(5)}·${R.roy.toFixed(5)})`} res={R.rho.toFixed(5)} />
            {R.rho_bruto > 0.02 && (
              <div className="callout">ρ calculado = {R.rho_bruto.toFixed(5)} foi limitado a 0,02 pela norma.</div>
            )}
          </ResultCard>

          {/* ── Etapa 6 ── */}
          <ResultCard title="6 — Superfície crítica C: compressão diagonal" cite="item 19.5.3.1" ok={R.verif1}>
            <Eq lhs={<>α<sub>v</sub></>} sym={<>1 − f<sub>ck</sub>/250</>}
              sub={`1 − ${I.fck}/250`} res={fmt(R.alphaV, 3)} />
            <Eq lhs={<>τ<sub>Rd2</sub></>} sym={<>0,27·α<sub>v</sub>·f<sub>cd</sub></>}
              sub={`0,27·${fmt(R.alphaV, 3)}·${fmt(R.fcd)}`} res={fmt(R.tauRd2)} unit="MPa" />
            <div className="muted" style={{fontSize: 12}}>
              Neste contorno não se considera a influência do momento fletor.
            </div>
            <Eq lhs={<>τ<sub>Sd</sub></>} sym={<>F<sub>sd</sub>/(u<sub>1</sub>·d)</>}
              sub={`${fmt(R.Fsd)}/(${fmt(R.u1)}·${fmt(R.d)})`} res={fmt(R.tauSd_C)} unit="MPa" />
            <Verif ok={R.verif1}
              cond={<>τ<sub>Sd</sub> = {fmt(R.tauSd_C)} {R.verif1 ? '≤' : '>'} τ<sub>Rd2</sub> = {fmt(R.tauRd2)} MPa</>}
              okMsg="Perímetro C, OK!" errMsg="ERRO! Esmagamento da biela" />
          </ResultCard>

          {/* ── Etapa 7 ── */}
          <ResultCard title="7 — Superfície crítica C′ sem armadura de punção" cite="item 19.5.3.2" ok={R.verif2}>
            <KV rows={R.circ ? [
              ['K (pilar circular interno)', fmt(R.kx, 2), ''],
              ['W<sub>p</sub> = (Ø + 4d)²', fmt(R.Wpx), 'cm²'],
            ] : [
              [`k<sub>x</sub> (C₁/C₂ = ${(R.cC1/R.cC2).toFixed(3)})`, fmt(R.kx, 4), ''],
              [`k<sub>y</sub> (C₂/C₁ = ${(R.cC2/R.cC1).toFixed(3)})`, fmt(R.ky, 4), ''],
            ]} />
            {!R.circ && (
              <>
                <Eq lhs={<>W<sub>px</sub></>}
                  sym={<>C<sub>1</sub>²/2 + C<sub>1</sub>C<sub>2</sub> + 4C<sub>2</sub>d + 16d² + 2πC<sub>1</sub>d</>}
                  res={fmt(R.Wpx)} unit="cm²" />
                <Eq lhs={<>W<sub>py</sub></>}
                  sym={<>C<sub>2</sub>²/2 + C<sub>2</sub>C<sub>1</sub> + 4C<sub>1</sub>d + 16d² + 2πC<sub>2</sub>d</>}
                  res={fmt(R.Wpy)} unit="cm²" />
              </>
            )}
            <Eq lhs={<>τ<sub>Sd</sub></>}
              sym={<>F<sub>sd</sub>/(u<sub>2</sub>·d) + k<sub>x</sub>·M<sub>sd1x</sub>/(W<sub>px</sub>·d) + k<sub>y</sub>·M<sub>sd1y</sub>/(W<sub>py</sub>·d)</>}
              res={fmt(R.tauSd_Cl)} unit="MPa" />
            <KV rows={[
              ['parcela da força F<sub>sd</sub>', fmt(R.tauSd_Cl_F), 'MPa'],
              ['parcela de M<sub>sd1x</sub>', fmt(R.tauSd_Cl_Mx), 'MPa'],
              ['parcela de M<sub>sd1y</sub>', fmt(R.tauSd_Cl_My), 'MPa'],
            ]} />
            <Eq lhs={<>τ<sub>Rd1</sub></>}
              sym={<>0,13·(1 + √(20/d))·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup></>}
              sub={`0,13·${fmt(R.fator_d, 4)}·(100·${R.rho.toFixed(5)}·${I.fck})^(1/3)`}
              res={fmt(R.tauRd1, 4)} unit="MPa" />
            <Verif ok={R.verif2}
              cond={<>τ<sub>Sd</sub> = {fmt(R.tauSd_Cl)} {R.verif2 ? '≤' : '>'} τ<sub>Rd1</sub> = {fmt(R.tauRd1)} MPa</>}
              okMsg="Perímetro C′ OK — dispensa armadura de punção!"
              errMsg="Necessita armadura de punção!" />
            {!R.verif2 && !temStuds && (
              <div className="callout acao">
                <span>Prossiga para a etapa 8: com a armadura definida, o contorno C′ é reverificado contra τ<sub>Rd3</sub>.</span>
                <button className="btn btn-primary btn-sm" onClick={onConfigurarStuds}>Configurar armadura →</button>
              </div>
            )}
          </ResultCard>

          {/* ── Etapa 8 ── */}
          <ResultCard title="8 — Superfície crítica C′ com armadura de punção" cite="item 19.5.3.3"
            ok={temStuds ? R.verif3 : null}>
            <div className="muted" style={{fontSize: 12}}>
              Com armadura, a parcela do concreto cai de 0,13 para 0,10 e soma-se a contribuição do aço.
            </div>
            <KV rows={[
              ['s<sub>0</sub> ≤ 0,5·d', `${fmt(R.s0_lim)} → adotado ${fmt(R.s0)}`, 'cm'],
              ['s<sub>r</sub> ≤ 0,75·d', `${fmt(R.sr_lim)} → adotado ${fmt(R.sr)}`, 'cm'],
              ['s<sub>e</sub> ≤ 2·d', `${fmt(R.se_lim)} → adotado ${fmt(R.se)}`, 'cm'],
            ]} />
            {R.alertaEspac.length > 0 && (
              <div className="callout">
                ⚠ {R.alertaEspac.join(' · ')}
              </div>
            )}
            {temStuds ? (
              <>
                <KV rows={[
                  [`Ø do ${R.tipoArm === 'estribo' ? 'estribo' : 'conector'}`, R.studs.phi, 'mm'],
                  ['n<sub>conec</sub> (por camada)', R.studs.nconec, ''],
                  ['n<sub>cam</sub> (camadas)', R.studs.ncam, ''],
                ]} />
                <Eq lhs={<>A<sub>s1c</sub></>} sym={<>π·Ø²/4</>}
                  sub={`π·${(R.studs.phi/10).toFixed(2)}²/4`} res={fmt(R.studs.As1c, 4)} unit="cm²" />
                <Eq lhs={<>A<sub>sw</sub></>} sym={<>n<sub>conec</sub>·A<sub>s1c</sub></>}
                  sub={`${R.studs.nconec}·${fmt(R.studs.As1c, 4)}`} res={fmt(R.studs.Asw, 3)} unit="cm²" />
                <Eq lhs={<>τ<sub>Rd3</sub></>}
                  sym={<>0,10·(1+√(20/d))·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup> + 1,5·(d/s<sub>r</sub>)·A<sub>sw</sub>·f<sub>ywd</sub>·sen α/(u<sub>2</sub>·d)</>}
                  res={fmt(R.tauRd3)} unit="MPa" />
                <KV rows={[
                  ['parcela do concreto', fmt(R.tauRd3_c), 'MPa'],
                  ['parcela do aço (α = 90°)', fmt(R.tauRd3_s), 'MPa'],
                ]} />
                <Verif ok={R.verif3}
                  cond={<>τ<sub>Sd</sub> = {fmt(R.tauSd_Cl)} {R.verif3 ? '≤' : '>'} τ<sub>Rd3</sub> = {fmt(R.tauRd3)} MPa</>}
                  okMsg="Perímetro C′ com armadura de punção, OK!"
                  errMsg="ERRO! Armadura de punção insuficiente!" />
                {!R.verif3 && (
                  <div className="callout">
                    Aumente o diâmetro ou o número de conectores por camada, reduza s<sub>r</sub>,
                    ou aumente a espessura da laje.
                  </div>
                )}

                {/* Desenho da configuração adotada, com os espaçamentos deste caso */}
                <div className="fig-inline">
                  <ConfiguracaoAdotada R={R} />
                </div>
                <Verif ok={R.studs.se_ok}
                  cond={<>s<sub>e</sub> real na última camada = {fmt(R.studs.se_real)} {R.studs.se_ok ? '≤' : '>'} 2·d = {fmt(R.se_lim)} cm</>}
                  okMsg="Espaçamento tangencial OK!"
                  errMsg="Aumente n_conec para reduzir o espaçamento tangencial." />
              </>
            ) : (
              <div className="muted">Defina a armadura de punção na etapa 5 do formulário para concluir esta verificação.</div>
            )}
          </ResultCard>

          {/* ── Etapa 9 ── */}
          <ResultCard title="9 — Superfície crítica C″" cite="item 19.5.3.4"
            ok={R.etapa9 ? R.etapa9.verif4 : null}>
            <div className="muted" style={{fontSize: 12}}>
              Contorno afastado 2d além da última camada de armadura. Verifica se, fora da região
              armada, o concreto sozinho resiste — por isso compara-se novamente com τ<sub>Rd1</sub>.
            </div>
            {R.etapa9 ? (
              <>
                <Eq lhs="p" sym={<>s<sub>0</sub> + (n<sub>cam</sub> − 1)·s<sub>r</sub></>}
                  sub={`${fmt(R.s0)} + (${R.studs.ncam} − 1)·${fmt(R.sr)}`}
                  res={fmt(R.etapa9.p)} unit="cm" />
                {R.etapa9.u3manual ? (
                  <>
                    <Eq lhs={<>u<sub>3</sub></>} sym={<>valor medido em CAD</>} res={fmt(R.etapa9.u3)} unit="cm" />
                    <div className="muted" style={{fontSize: 12}}>
                      Cálculo analítico com cantos arredondados: u₃ = u₁ + 2π·(2d + p) = {fmt(R.etapa9.u3_calc)} cm.
                    </div>
                  </>
                ) : (
                  <Eq lhs={<>u<sub>3</sub></>} sym={<>u<sub>1</sub> + 2π·(2d + p)</>}
                    sub={`${fmt(R.u1)} + 2π·(2·${fmt(R.d)} + ${fmt(R.etapa9.p)})`}
                    res={fmt(R.etapa9.u3)} unit="cm" />
                )}
                <KV rows={R.circ ? [
                  ['W<sub>p,C″</sub> = (Ø + 4d + 2p)²', fmt(R.etapa9.WpxCpp), 'cm²'],
                ] : [
                  ['W<sub>px,C″</sub>', fmt(R.etapa9.WpxCpp), 'cm²'],
                  ['W<sub>py,C″</sub>', fmt(R.etapa9.WpyCpp), 'cm²'],
                ]} />
                <Eq lhs={<>τ<sub>Sd,C″</sub></>}
                  sym={<>F<sub>sd</sub>/(u<sub>3</sub>·d) + k<sub>x</sub>·M<sub>sd1x</sub>/(W<sub>px,C″</sub>·d) + k<sub>y</sub>·M<sub>sd1y</sub>/(W<sub>py,C″</sub>·d)</>}
                  res={fmt(R.etapa9.tauSd_Cpp)} unit="MPa" />
                <Verif ok={R.etapa9.verif4}
                  cond={<>τ<sub>Sd,C″</sub> = {fmt(R.etapa9.tauSd_Cpp)} {R.etapa9.verif4 ? '≤' : '>'} τ<sub>Rd1</sub> = {fmt(R.tauRd1)} MPa</>}
                  okMsg="Perímetro C″ OK — a armadura pode ser interrompida!"
                  errMsg="ERRO! τRd1 não passa — estenda a armadura com mais camadas." />
              </>
            ) : (
              <div className="muted">Depende da armadura de punção definida na etapa 5.</div>
            )}
          </ResultCard>

          {/* ── Resumo ── */}
          <ResultCard title="Resumo das verificações">
            <div className="resumo-list">
              <ResumoItem n="verif1" ok={R.verif1}
                txt={R.verif1 ? 'Perímetro C, OK!' : 'ERRO!! Esmagamento'} />
              <ResumoItem n="verif2" ok={R.verif2}
                txt={R.verif2 ? 'Perímetro C′ OK!' : 'Necessita armadura de punção!!'} />
              <ResumoItem n="verif3" ok={temStuds ? R.verif3 : null}
                txt={!temStuds ? 'Aguardando definição da armadura'
                  : R.verif3 ? "Perímetro C′ com armadura de punção, Ok!" : 'ERRO! Armadura de punção insuficiente!!'} />
              <ResumoItem n="verif4" ok={R.etapa9 ? R.etapa9.verif4 : null}
                txt={!R.etapa9 ? 'Aguardando definição da armadura'
                  : R.etapa9.verif4 ? 'Perímetro C″ com armadura de punção, τRd1 Ok!' : 'ERRO! τRd1 não passa!!'} />
            </div>
          </ResultCard>

        </div>

      </div>
    </div>
  );
}

function ResumoItem({ n, ok, txt }) {
  const cls = ok === true ? 'ok' : ok === false ? 'err' : 'warn';
  return (
    <div className={"resumo-item " + cls}>
      <span className="mono">{n}</span>
      <span>{txt}</span>
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

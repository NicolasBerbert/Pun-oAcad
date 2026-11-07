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

// Gera o DXF e dispara o download
function baixarDXF(R, nome) {
  const txt = window.gerarDXF(R, nome);
  if (!txt) return;
  window.salvarArquivo(nome || 'puncao', txt, {
    name: 'Desenho AutoCAD (DXF)', extensions: ['dxf'], mime: 'application/dxf',
  });
}

// Um contorno do ábaco (C′1 ou C′2): perímetro, Wp, redução de FSd,
// τSd, ke e τRd1 com a altura útil desse contorno.
function ContornoAbaco({ c, R }) {
  const I = R.inputs;
  const um = c.nome === 'C′1';
  const raio = R.circ ? c.b1 / 2 + c.a : null;
  return (
    <div className="contorno-abaco">
      <div className="subhead">{c.nome} — {um ? <>2d<sub>c</sub> além da face do pilar</> : <>2d além da borda do ábaco</>}</div>
      {R.circ ? (
        <>
          <Eq lhs="R" sym={um ? <>Ø/2 + 2d<sub>c</sub></> : <>Ø/2 + ℓ<sub>c</sub> + 2d</>}
            sub={um ? `${fmt(R.D / 2, 1)} + 2·${fmt(R.abaco.dc)}` : `${fmt(R.D / 2, 1)} + ${fmt(R.abaco.lc, 1)} + 2·${fmt(R.d)}`}
            res={fmt(raio)} unit="cm" />
          <Eq lhs="u" sym="2π·R" res={fmt(c.u_bruto)} unit="cm" />
          <Eq lhs={<>W<sub>p</sub></>} sym="(2R)²" res={fmt(c.Wpx_bruto, 0)} unit="cm²" />
        </>
      ) : (
        <KV rows={[
          ['u', fmt(c.u_bruto), 'cm'],
          ['W<sub>px</sub> · W<sub>py</sub>', `${fmt(c.Wpx_bruto, 0)} · ${fmt(c.Wpy_bruto, 0)}`, 'cm²'],
        ]} />
      )}
      {c.du > 0 && (
        <div className="muted" style={{fontSize: 12}}>
          Sem o trecho da abertura: u = {fmt(c.u)} cm, W<sub>px</sub> = {fmt(c.Wpx, 0)}, W<sub>py</sub> = {fmt(c.Wpy, 0)} cm².
        </div>
      )}
      {c.dF > 0 && (
        <Eq lhs={<>F<sub>Sd,red</sub></>} sym={<>F<sub>Sd</sub> − p<sub>d</sub>·A</>}
          sub={`${fmt(Math.abs(R.Fsd))} − ${fmt(R.reducao ? R.reducao.pd : 0)}·${fmt(c.area / 1e4, 3)}`}
          res={fmt(c.Fsd_red)} unit="kN" />
      )}
      <Eq lhs={<>τ<sub>Sd</sub></>}
        sym={<>F<sub>sd</sub>/(u·{um ? <>d<sub>a</sub></> : 'd'}) + k<sub>x</sub>M<sub>sd1x</sub>/(W<sub>px</sub>·{um ? <>d<sub>a</sub></> : 'd'}) + k<sub>y</sub>M<sub>sd1y</sub>/(W<sub>py</sub>·{um ? <>d<sub>a</sub></> : 'd'})</>}
        sub={`${fmt(c.tauSd_F, 3)} + ${fmt(c.tauSd_Mx, 3)} + ${fmt(c.tauSd_My, 3)}`}
        res={fmt(c.tauSd, 3)} unit="MPa" />
      <Eq lhs={<>k<sub>e</sub></>} sym={<>mín(1 + √(20/{um ? <>d<sub>a</sub></> : 'd'}) ; 2)</>}
        sub={`mín(${fmt(c.ke_bruto, 3)} ; 2)`} res={fmt(c.ke, 3)} />
      <Eq lhs={<>τ<sub>Rd1</sub></>}
        sym={<>0,13·k<sub>e</sub>·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup>{R.temAxial && <> + 0,10·σ<sub>cp</sub></>}</>}
        sub={`0,13·${fmt(c.ke, 3)}·(100·${R.rho.toFixed(5)}·${I.fck})^(1/3)`} res={fmt(c.tauRd1, 3)} unit="MPa" />
      <Verif ok={c.ok}
        cond={<>τ<sub>Sd</sub> = {fmt(c.tauSd, 3)} {c.ok ? '≤' : '>'} τ<sub>Rd1</sub> = {fmt(c.tauRd1, 3)} MPa</>}
        okMsg={`Perímetro ${c.nome} OK!`} errMsg={`Perímetro ${c.nome} não atende!`} />
    </div>
  );
}

function Results({ R, onConfigurarStuds, onExportar, projectName }) {
  if (!R) return null;
  if (R.error) {
    return (
      <div className="results-section">
        <div className="results-inner">
          <div className="callout" style={{background:'var(--err-bg)', borderColor:'var(--err-bd)', color:'var(--err)'}}>
            ⚠ Não foi possível calcular: {R.error === 'missing' ? `campo "${R.missing}" obrigatório`
              : R.error === 'd_negative' ? 'altura útil resultante ≤ 0 — revise h, cobrimento e bitolas'
              : R.error === 'abaco' ? 'ábaco incompleto — informe hc maior que h e Lt maior que o diâmetro do pilar'
              : R.error === 'abertura' ? 'abertura incompleta — informe a distância à face e a largura'
              : R.error}.
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
            <button className="btn btn-sm" onClick={() => baixarDXF(R, projectName)}
              title="Desenho em DXF, aberto nativamente pelo AutoCAD (Salvar como… → .dwg)">
              <Ico name="cad"/> Exportar DXF (AutoCAD)
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
          <Tile name={R.abaco ? `Contorno ${R.abaco.governa}` : 'Contorno C′'}
            label={R.abaco ? 'Ábaco — mais solicitado' : 'Sem armadura'} ok={R.verif2}
            verdict={`τSd = ${fmt(R.tauSd_Cl)} ${R.tauSd_Cl <= R.tauRd1 ? '≤' : '>'} τRd1 = ${fmt(R.tauRd1)} MPa`} />
          <Tile name="Contorno C′" label="Com armadura"
            ok={temStuds ? R.verif3 : null}
            verdict={temStuds ? `τSd = ${fmt(R.tauSd_Cl)} ${R.verif3 ? '≤' : '>'} τRd3 = ${fmt(R.tauRd3)} MPa` : 'Configurar armadura'} />
          <Tile name="Contorno C″" label="Além da armadura"
            ok={R.etapa9 ? R.etapa9.verif4 : null}
            verdict={R.etapa9 ? `τSd = ${fmt(R.etapa9.tauSd_Cpp)} ${R.etapa9.verif4 ? '≤' : '>'} τRd1 = ${fmt(R.tauRd1)} MPa` : '—'} />
        </div>

        {R.precisaArm && R.abaco && (
          <div className="callout" style={{marginBottom: 16}}>
            ⚠ <b>Contorno do ábaco não atendido.</b> Com ábaco, o app não dimensiona armadura de
            punção: aumente o ábaco (h<sub>c</sub> ou L<sub>t</sub>), a espessura da laje ou o f<sub>ck</sub>.
          </div>
        )}
        {R.precisaArm && !temStuds && !R.abaco && (
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
              ...(R.abaco ? [['ábaco: h<sub>c</sub> · L<sub>t</sub> em planta', `${R.abaco.hc} · ${fmt(R.abaco.Lt, 1)}`, 'cm']] : []),
              ...(R.abertura ? [['abertura: distância · largura', `${R.abertura.dist} · ${R.abertura.larg} (eixo ${R.abertura.dir})`, 'cm']] : []),
              ...(R.reducao ? [['g + q na laje', I.distrib.gq, 'kN/m²']] : []),
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
                {!R.abaco && (
                  <Eq lhs={<>u<sub>2</sub></>} sym={<>π·(Ø + 4d)</>} sub={`π·(${R.D} + 4·${fmt(R.d)})`} res={fmt(R.u2_bruto)} unit="cm" />
                )}
              </>
            ) : (
              <>
                <Eq lhs={<>u<sub>1</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>)</>}
                  sub={`2·(${R.cC1} + ${R.cC2})`} res={fmt(R.u1)} unit="cm" />
                {!R.abaco && (
                  <Eq lhs={<>u<sub>2</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>) + 2π·2d</>}
                    sub={`${fmt(R.u1)} + 4π·${fmt(R.d)}`} res={fmt(R.u2_bruto)} unit="cm" />
                )}
              </>
            )}
            {R.momentoC && (
              R.circ
                ? <Eq lhs={<>W<sub>p0</sub></>} sym={<>Ø² (contorno C)</>} sub={`${R.D}²`} res={fmt(R.Wp0x, 0)} unit="cm²" />
                : <KV rows={[
                    ['W<sub>p0,x</sub> = C<sub>1</sub>²/2 + C<sub>1</sub>C<sub>2</sub> (contorno C)', fmt(R.Wp0x, 1), 'cm²'],
                    ['W<sub>p0,y</sub> = C<sub>2</sub>²/2 + C<sub>1</sub>C<sub>2</sub> (contorno C)', fmt(R.Wp0y, 1), 'cm²'],
                  ]} />
            )}
            {R.abertura && (
              <>
                <div className="muted" style={{fontSize: 12}}>
                  Abertura a {R.abertura.dist} cm da face {R.abertura.influi ? '<' : '≥'} 8d = {fmt(R.abertura.lim8d, 1)} cm
                  {R.abertura.influi
                    ? ': descarta-se o trecho dos contornos críticos entre as retas tangentes (item 19.5.2.6). O contorno C fica integral.'
                    : ': a abertura não influi no cálculo.'}
                </div>
                {R.abertura.influi && (
                  <>
                    <Eq lhs="θ" sym={<>2·arctan((b/2)/x<sub>1</sub>)</>}
                      sub={`2·arctan(${fmt(R.abertura.larg / 2, 1)}/${fmt(R.abertura.x1, 1)})`}
                      res={`${fmt(R.abertura.theta * 180 / Math.PI)}° = ${fmt(R.abertura.theta, 4)} rad`} />
                    {!R.abaco && (
                      <Eq lhs={<>u<sub>2</sub></>} sym={<>u<sub>2,integral</sub> − Δu</>}
                        sub={`${fmt(R.u2_bruto)} − ${fmt(R.du2)}`} res={fmt(R.u2)} unit="cm" />
                    )}
                    <div className="muted" style={{fontSize: 12}}>
                      {R.abertura.limitaFaixa
                        ? 'A abertura fica a menos de 3d da face e corta a faixa de ρ; como ρ = As/(s·d), a taxa não muda.'
                        : `3d = ${fmt(3 * R.d)} cm < ${R.abertura.dist} cm: a abertura não limita a faixa de ρ.`}
                    </div>
                  </>
                )}
              </>
            )}
          </ResultCard>

          {/* ── Ábaco ── */}
          {R.abaco && (
            <ResultCard title="3a — Ábaco: contornos a verificar" cite="item 19.5.2.5">
              <Eq lhs={<>d<sub>c</sub></>} sym={<>(d<sub>cx</sub> + d<sub>cy</sub>)/2</>}
                sub={`(${fmt(R.abaco.dcx, 3)} + ${fmt(R.abaco.dcy, 3)})/2`} res={fmt(R.abaco.dc)} unit="cm" />
              <div className="casos">
                <div className={"caso" + (R.abaco.caso === 'C2' ? ' ativo' : '')}>
                  <span className="cond">ℓ<sub>c</sub> ≤ 2(d<sub>c</sub> − d) = {fmt(R.abaco.lim1)}</span>
                  <span className="val">apenas C′2</span>
                </div>
                <div className={"caso" + (R.abaco.caso === 'C1' ? ' ativo' : '')}>
                  <span className="cond">ℓ<sub>c</sub> ≤ 2d<sub>c</sub> = {fmt(R.abaco.lim2)}</span>
                  <span className="val">apenas C′1</span>
                </div>
                <div className={"caso" + (R.abaco.caso === 'C1C2' ? ' ativo' : '')}>
                  <span className="cond">ℓ<sub>c</sub> &gt; 2d<sub>c</sub></span>
                  <span className="val">C′1 e C′2</span>
                </div>
              </div>
              <div className="muted" style={{fontSize: 12}}>
                ℓ<sub>c</sub> = (L<sub>t</sub> − Ø)/2 = ({fmt(R.abaco.Lt, 1)} − {R.D})/2 = {fmt(R.abaco.lc, 1)} cm.
                C′2 fica 2d além da borda do ábaco; C′1 fica 2d<sub>c</sub> além da face do pilar
                {R.abaco.da !== null && <>, com altura útil
                d<sub>a</sub> = mín(d<sub>c</sub>; d + (ℓ<sub>c</sub> − 2d<sub>c</sub>)/2) = {fmt(R.abaco.da)} cm</>}.
                O contorno C usa d<sub>c</sub>. W<sub>p</sub> é calculado para o próprio contorno verificado.
              </div>
            </ResultCard>
          )}

          {/* ── Etapa 4 ── */}
          <ResultCard title="4 — Tensão resistente da armadura de punção" cite="item 19.4.2">
            <div className="muted" style={{fontSize: 12}}>
              f<sub>ywd</sub> parte de {R.fywdBase} MPa para {R.tipoArm === 'conector' ? 'conectores' : 'estribos'} e
              varia com a espessura da laje. São três situações:
            </div>
            <div className="casos">
              <div className={"caso" + (R.fywdCaso === 'menor' ? ' ativo' : '')}>
                <span className="cond">h &lt; 15 cm</span>
                <span className="val">f<sub>ywd</sub> = {R.fywdBase} MPa</span>
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
              <b>{R.fywdCaso === 'menor' ? 'primeira situação' : R.fywdCaso === 'maior' ? 'terceira situação'
                : R.fywdCaso === 'base' ? 'valor-base mantido (aumento com a espessura desligado)' : 'segunda situação (interpolação)'}</b>.
            </div>
            {R.fywdCaso === 'base' ? (
              <Eq lhs={<>f<sub>ywd</sub></>} sym={<>{R.fywdBase} MPa, sem o aumento permitido pelo item 19.4.2</>} res={fmt(R.fywd)} unit="MPa" />
            ) : R.fywdCaso === 'menor' ? (
              <Eq lhs={<>f<sub>ywd</sub></>} sym={<>{R.fywdBase} MPa, pois h = {I.h} cm &lt; 15 cm</>} res={fmt(R.fywd)} unit="MPa" />
            ) : R.fywdCaso === 'maior' ? (
              <Eq lhs={<>f<sub>ywd</sub></>} sym={<>435 MPa, pois h = {I.h} cm &gt; 35 cm</>} res={fmt(R.fywd)} unit="MPa" />
            ) : (
              <Eq lhs={<>f<sub>ywd</sub></>}
                sym={<>{R.fywdBase} + (h − 15)·(435 − {R.fywdBase})/(35 − 15)</>}
                sub={`${R.fywdBase} + (${I.h} − 15)·${435 - R.fywdBase}/20`}
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
              sub={`0,27·${fmt(R.alphaV, 3)}·${fmt(R.fcd)}`} res={fmt(R.tauRd2_base)} unit="MPa" />
            {R.ampliaRd2 && (
              <Eq lhs={<>τ<sub>Rd2</sub></>} sym={<>1,2·0,27·α<sub>v</sub>·f<sub>cd</sub> (ampliado em 20%)</>}
                sub={`1,2·${fmt(R.tauRd2_base)}`} res={fmt(R.tauRd2)} unit="MPa" />
            )}
            {R.ampliaPedida && !R.ampliaRd2 && (
              <div className="muted" style={{fontSize: 12}}>
                Ampliação de 20% não aplicada: existe abertura junto ao pilar.
              </div>
            )}
            <div className="muted" style={{fontSize: 12}}>
              τ<sub>Sd</sub> conforme 19.5.2 com u<sub>0</sub> = u<sub>1</sub> no lugar de u
              {R.abaco && <> e altura útil d<sub>c</sub> = {fmt(R.dC)} cm, na face do pilar sob o ábaco</>}
              {R.momentoC
                ? <>; os momentos entram com o W<sub>p</sub> do próprio contorno C.</>
                : <>; por opção do projetista, sem a parcela dos momentos.</>}
            </div>
            {R.momentoC ? (
              <>
                <Eq lhs={<>τ<sub>Sd</sub></>}
                  sym={<>F<sub>sd</sub>/(u<sub>1</sub>·d) + k<sub>x</sub>·M<sub>sd1x</sub>/(W<sub>p0,x</sub>·d) + k<sub>y</sub>·M<sub>sd1y</sub>/(W<sub>p0,y</sub>·d)</>}
                  sub={`${fmt(R.tauSd_C_F, 3)} + ${fmt(R.tauSd_C_Mx, 3)} + ${fmt(R.tauSd_C_My, 3)}`}
                  res={fmt(R.tauSd_C)} unit="MPa" />
              </>
            ) : (
              <Eq lhs={<>τ<sub>Sd</sub></>} sym={<>F<sub>sd</sub>/(u<sub>1</sub>·d)</>}
                sub={`${fmt(R.Fsd)}/(${fmt(R.u1)}·${fmt(R.dC)})`} res={fmt(R.tauSd_C)} unit="MPa" />
            )}
            <Verif ok={R.verif1}
              cond={<>τ<sub>Sd</sub> = {fmt(R.tauSd_C)} {R.verif1 ? '≤' : '>'} τ<sub>Rd2</sub> = {fmt(R.tauRd2)} MPa</>}
              okMsg="Perímetro C, OK!" errMsg="ERRO! Esmagamento da biela" />
          </ResultCard>

          {/* ── Etapa 7 ── */}
          <ResultCard title={R.abaco ? '7 — Superfícies críticas do ábaco sem armadura de punção' : '7 — Superfície crítica C′ sem armadura de punção'}
            cite={R.abaco ? 'itens 19.5.2.5 e 19.5.3.2' : 'item 19.5.3.2'} ok={R.verif2}>
            <KV rows={R.circ ? [
              ['K (pilar circular interno)', fmt(R.kx, 2), ''],
            ] : [
              [`k<sub>x</sub> (C₁/C₂ = ${(R.cC1/R.cC2).toFixed(3)})`, fmt(R.kx, 4), ''],
              [`k<sub>y</sub> (C₂/C₁ = ${(R.cC2/R.cC1).toFixed(3)})`, fmt(R.ky, 4), ''],
            ]} />
            {R.temAxial && (
              <>
                <KV rows={[
                  ['σ<sub>cp,x</sub> = N<sub>Sd,x</sub>/A<sub>c</sub>', fmt(R.sigma_cpx, 3), 'MPa'],
                  ['σ<sub>cp,y</sub> = N<sub>Sd,y</sub>/A<sub>c</sub>', fmt(R.sigma_cpy, 3), 'MPa'],
                ]} />
                <Eq lhs={<>σ<sub>cp</sub></>} sym={<>(σ<sub>cp,x</sub> + σ<sub>cp,y</sub>)/2 ≤ 3,5 MPa</>}
                  sub={`(${fmt(R.sigma_cpx, 3)} + ${fmt(R.sigma_cpy, 3)})/2`}
                  res={fmt(R.sigma_cp_calc, 3)} unit="MPa" />
                {R.sigma_cp_desprezado && (
                  <div className="muted" style={{fontSize: 12}}>
                    σ<sub>cp,x</sub> ou σ<sub>cp,y</sub> ≤ 1 MPa: o efeito favorável de σ<sub>cp</sub> é desprezado
                    (item 19.5.3.2) e τ<sub>Rd1</sub> é calculado com σ<sub>cp</sub> = 0.
                  </div>
                )}
                {R.sigma_cp_limitado && (
                  <div className="muted" style={{fontSize: 12}}>
                    Valor calculado {fmt(R.sigma_cp_bruto, 3)} MPa limitado a 3,5 MPa.
                  </div>
                )}
              </>
            )}

            {R.abaco ? (
              R.abaco.contornos.map(c => <ContornoAbaco key={c.nome} c={c} R={R} />)
            ) : (
              <>
                {R.circ ? (
                  <Eq lhs={<>W<sub>p</sub></>} sym={<>(Ø + 4d)²</>}
                    sub={`(${R.D} + 4·${fmt(R.d)})²`} res={fmt(R.Wpx_bruto)} unit="cm²" />
                ) : (
                  <>
                    <Eq lhs={<>W<sub>px</sub></>}
                      sym={<>C<sub>1</sub>²/2 + C<sub>1</sub>C<sub>2</sub> + 4C<sub>2</sub>d + 16d² + 2πC<sub>1</sub>d</>}
                      res={fmt(R.Wpx)} unit="cm²" />
                    <Eq lhs={<>W<sub>py</sub></>}
                      sym={<>C<sub>2</sub>²/2 + C<sub>2</sub>C<sub>1</sub> + 4C<sub>1</sub>d + 16d² + 2πC<sub>2</sub>d</>}
                      res={fmt(R.Wpy)} unit="cm²" />
                  </>
                )}
                {R.abertura?.influi && (
                  <div className="muted" style={{fontSize: 12}}>
                    Sem o trecho entre as tangentes: u<sub>2</sub> = {fmt(R.u2)} cm, W<sub>px</sub> = {fmt(R.Wpx)} e
                    W<sub>py</sub> = {fmt(R.Wpy)} cm² (W<sub>p</sub> = ∫|e|·dℓ só sobre o contorno que resta).
                  </div>
                )}
                {R.reducao && (
                  <>
                    <div className="muted" style={{fontSize: 12}}>
                      Redução de F<sub>Sd</sub> pela carga distribuída aplicada dentro de C′ (item 19.5.2.1):
                    </div>
                    <Eq lhs={<>ΔF</>} sym={<>p<sub>d</sub>·A<sub>C′</sub></>}
                      sub={`${fmt(R.reducao.pd)}·${fmt(R.reducao.area, 3)}`} res={fmt(R.reducao.dF)} unit="kN" />
                    <Eq lhs={<>F<sub>Sd,red</sub></>} sym={<>F<sub>Sd</sub> − ΔF</>}
                      sub={`${fmt(Math.abs(R.Fsd))} − ${fmt(R.reducao.dF)}`} res={fmt(R.reducao.Fsd_red)} unit="kN" />
                  </>
                )}
                <Eq lhs={<>τ<sub>Sd</sub></>}
                  sym={<>F<sub>sd{R.reducao ? ',red' : ''}</sub>/(u<sub>2</sub>·d) + k<sub>x</sub>·M<sub>sd1x</sub>/(W<sub>px</sub>·d) + k<sub>y</sub>·M<sub>sd1y</sub>/(W<sub>py</sub>·d)</>}
                  sub={`${fmt(R.tauSd_Cl_F, 3)} + ${fmt(R.tauSd_Cl_Mx, 3)} + ${fmt(R.tauSd_Cl_My, 3)}`}
                  res={fmt(R.tauSd_Cl, 3)} unit="MPa" />
                {R.reducao && (
                  <div className="muted" style={{fontSize: 12}}>
                    Sem a redução, τ<sub>Sd</sub> = {fmt(R.reducao.tauSd_sem, 3)} MPa
                    {R.reducao.tauSd_sem > R.tauRd1 && R.verif2 ? ' — não passaria; a redução muda a conclusão.' : '.'}
                  </div>
                )}
                <Eq lhs={<>k<sub>e</sub></>} sym={<>mín(1 + √(20/d) ; 2)</>}
                  sub={`mín(${fmt(R.fator_d_bruto, 4)} ; 2)`}
                  res={fmt(R.fator_d, 4)} />
                {R.ke_limitado && (
                  <div className="muted" style={{fontSize: 12}}>
                    O coeficiente de escala calculado ({fmt(R.fator_d_bruto, 4)}) excede o limite da
                    NBR 6118:2023 e foi truncado em 2.
                  </div>
                )}
                <Eq lhs={<>τ<sub>Rd1</sub></>}
                  sym={<>0,13·k<sub>e</sub>·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup>{R.temAxial && <> + 0,10·σ<sub>cp</sub></>}</>}
                  sub={`0,13·${fmt(R.fator_d, 4)}·(100·${R.rho.toFixed(5)}·${I.fck})^(1/3)`
                        + (R.temAxial ? ` + 0,10·${fmt(R.sigma_cp, 3)}` : '')}
                  res={fmt(R.tauRd1, 4)} unit="MPa" />
                <Verif ok={R.verif2}
                  cond={<>τ<sub>Sd</sub> = {fmt(R.tauSd_Cl, 3)} {R.verif2 ? '≤' : '>'} τ<sub>Rd1</sub> = {fmt(R.tauRd1, 3)} MPa</>}
                  okMsg="Perímetro C′ OK — dispensa armadura de punção!"
                  errMsg="Necessita armadura de punção!" />
                {!R.verif2 && !temStuds && (
                  <div className="callout acao">
                    <span>Prossiga para a etapa 8: com a armadura definida, o contorno C′ é reverificado contra τ<sub>Rd3</sub>.</span>
                    <button className="btn btn-primary btn-sm" onClick={onConfigurarStuds}>Configurar armadura →</button>
                  </div>
                )}
              </>
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
                  cond={<>s<sub>e</sub> real na última camada{R.circ ? ' (ao longo do contorno)' : ''} = {fmt(R.studs.se_real)} {R.studs.se_ok ? '≤' : '>'} 2·d = {fmt(R.se_lim)} cm</>}
                  okMsg="Espaçamento tangencial OK!"
                  errMsg="Aumente n_conec para reduzir o espaçamento tangencial." />
              </>
            ) : (
              <div className="muted">
                {R.abaco
                  ? 'Com ábaco, o app não dimensiona armadura de punção: a verificação se encerra nos contornos do ábaco.'
                  : 'Defina a armadura de punção na etapa 5 do formulário para concluir esta verificação.'}
              </div>
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
                  <>
                    <Eq lhs={<>u<sub>3</sub></>} sym={<>u<sub>1</sub> + 2π·(2d + p)</>}
                      sub={`${fmt(R.u1)} + 2π·(2·${fmt(R.d)} + ${fmt(R.etapa9.p)})`}
                      res={fmt(R.etapa9.u3_bruto)} unit="cm" />
                    {R.etapa9.du3 > 0 && (
                      <Eq lhs={<>u<sub>3</sub></>} sym={<>u<sub>3,integral</sub> − Δu (abertura)</>}
                        sub={`${fmt(R.etapa9.u3_bruto)} − ${fmt(R.etapa9.du3)}`}
                        res={fmt(R.etapa9.u3)} unit="cm" />
                    )}
                  </>
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

          {/* ── Etapa 10 ── */}
          {R.colapso && (
            <ResultCard title="10 — Colapso progressivo" cite="item 19.5.4"
              ok={R.colapso.incompleto ? null : R.colapso.verif5}>
              <div className="muted" style={{fontSize: 12}}>
                A armadura de flexão inferior que atravessa o contorno C deve atender
                f<sub>yd</sub>·A<sub>s,ccp</sub> ≥ 1,5·F<sub>Sd</sub>, com F<sub>Sd</sub> calculado com γ<sub>f</sub> = 1,2,
                e estar ancorada além do contorno C′. Cada barra contínua que atravessa o pilar é
                contada uma vez, a favor da segurança.
              </div>
              {R.colapso.incompleto ? (
                <div className="muted">Informe bitola e espaçamento nas duas direções na etapa 4.</div>
              ) : (
                <>
                  <Eq lhs={<>F<sub>Sd</sub></>} sym={<>1,2·F<sub>Sk</sub></>}
                    sub={`1,2·${fmt(Math.abs(I.Fsk))}`} res={fmt(R.colapso.Fsd_ccp)} unit="kN" />
                  <Eq lhs={<>A<sub>s,ccp,nec</sub></>} sym={<>1,5·F<sub>Sd</sub>/f<sub>yd</sub></>}
                    sub={`1,5·${fmt(R.colapso.Fsd_ccp)}/${fmt(R.fyd/10, 3)}`}
                    res={fmt(R.colapso.As_nec)} unit="cm²" />
                  <KV rows={[
                    [`barras em x — Ø${R.colapso.phi_h} c/ ${fmt(R.colapso.s_h)} cm, sobre ${fmt(R.colapso.largH)} cm`,
                      `${fmt(R.colapso.nh_exato, 2)} barras · ${fmt(R.colapso.As_h)}`, 'cm²'],
                    [`barras em y — Ø${R.colapso.phi_v} c/ ${fmt(R.colapso.s_v)} cm, sobre ${fmt(R.colapso.largV)} cm`,
                      `${fmt(R.colapso.nv_exato, 2)} barras · ${fmt(R.colapso.As_v)}`, 'cm²'],
                    ['A<sub>s,ccp</sub> (soma das duas direções)', fmt(R.colapso.As_ccp), 'cm²'],
                  ]} />
                  <Verif ok={R.colapso.verif5}
                    cond={<>A<sub>s,ccp</sub> = {fmt(R.colapso.As_ccp)} {R.colapso.verif5 ? '≥' : '<'} {fmt(R.colapso.As_nec)} cm²</>}
                    okMsg="Proteção contra colapso progressivo atendida!"
                    errMsg={`Insuficiente — faltam ${fmt(R.colapso.As_nec - R.colapso.As_ccp)} cm² de armadura inferior.`} />
                </>
              )}
            </ResultCard>
          )}

          {/* ── Resumo ── */}
          <ResultCard title="Resumo das verificações">
            <div className="resumo-list">
              <ResumoItem n="verif1" ok={R.verif1}
                txt={R.verif1 ? 'Perímetro C, OK!' : 'ERRO!! Esmagamento'} />
              <ResumoItem n="verif2" ok={R.verif2}
                txt={R.abaco
                  ? (R.verif2 ? `Contornos do ábaco (${R.abaco.contornos.map(c => c.nome).join(' e ')}) OK!` : `ERRO! Contorno ${R.abaco.governa} não atende!!`)
                  : (R.verif2 ? 'Perímetro C′ OK!' : 'Necessita armadura de punção!!')} />
              <ResumoItem n="verif3" ok={temStuds ? R.verif3 : null}
                txt={!temStuds ? 'Aguardando definição da armadura'
                  : R.verif3 ? "Perímetro C′ com armadura de punção, Ok!" : 'ERRO! Armadura de punção insuficiente!!'} />
              <ResumoItem n="verif4" ok={R.etapa9 ? R.etapa9.verif4 : null}
                txt={!R.etapa9 ? 'Aguardando definição da armadura'
                  : R.etapa9.verif4 ? 'Perímetro C″ com armadura de punção, τRd1 Ok!' : 'ERRO! τRd1 não passa!!'} />
              {R.colapso && (
                <ResumoItem n="verif5" ok={R.colapso.incompleto ? null : R.colapso.verif5}
                  txt={R.colapso.incompleto ? 'Armadura contra colapso progressivo incompleta'
                    : R.colapso.verif5 ? 'Colapso progressivo, Ok!' : 'ERRO! Armadura inferior insuficiente!!'} />
              )}
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
  if (name === 'cad') return <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.2"/><path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  return null;
}

window.Results = Results;
window.Ico = Ico;

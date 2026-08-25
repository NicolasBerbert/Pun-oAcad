/* global React */

// ============================================================
//  Relatorio — memorial de cálculo formatado para impressão/PDF.
//
//  Este componente NÃO aparece na tela: existe apenas para a mídia de
//  impressão. Imprimir a página produz um documento A4 próprio, com os
//  dados do caso, e não uma captura da interface.
// ============================================================

const rf = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n).replace('.', ',') : '—');
const ri = v => (Number.isFinite(v) ? String(v).replace('.', ',') : '—');
const r5 = v => (Number.isFinite(v) ? v.toFixed(5).replace('.', ',') : '—');

// Tabela chave/valor
function RelTab({ linhas }) {
  const uteis = linhas.filter(Boolean);
  if (!uteis.length) return null;
  return (
    <table className="rel-tab">
      <tbody>
        {uteis.map(([k, v, u], i) => (
          <tr key={i}>
            <th dangerouslySetInnerHTML={{ __html: k }} />
            <td>{v}{u ? <span className="rel-un"> {u}</span> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Dois blocos lado a lado, para aproveitar a largura da folha
function RelDuplo({ children }) {
  return <div className="rel-duplo">{children}</div>;
}

// Linha de fórmula: símbolo = expressão = substituição = resultado
function RelEq({ lhs, sym, sub, res, unit }) {
  return (
    <div className="rel-eq">
      <span className="rel-eq-l">{lhs}</span>
      <span className="rel-eq-c">
        = {sym}
        {sub != null && <> = <span className="rel-sub">{sub}</span></>}
      </span>
      <span className="rel-eq-r">{res}{unit ? ' ' + unit : ''}</span>
    </div>
  );
}

// Faixa de verificação: condição à esquerda, veredito à direita
function RelVerif({ ok, cond, texto }) {
  return (
    <div className={'rel-verif ' + (ok ? 'ok' : 'nao')}>
      <span className="rel-verif-c">{cond}</span>
      <span className="rel-verif-v">{ok ? 'ATENDE' : 'NÃO ATENDE'} — {texto}</span>
    </div>
  );
}

function RelSecao({ n, titulo, cite, children }) {
  return (
    <section className="rel-secao">
      <h2><span className="rel-n">{n}</span>{titulo}{cite && <span className="rel-cite">{cite}</span>}</h2>
      {children}
    </section>
  );
}

function Relatorio({ R, projectName }) {
  if (!R || R.error) return null;
  const I = R.inputs;
  const extY = R.camadaExterna === 'y';
  const phiExt = extY ? I.phi_ly : I.phi_lx;
  const phiInt = extY ? I.phi_lx : I.phi_ly;
  const temArm = !!R.studs;
  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="relatorio">

      {/* ── Cabeçalho do documento ── */}
      <header className="rel-capa">
        <div className="rel-capa-top">
          <div>
            <div className="rel-marca">PunçãoAcad</div>
            <h1>Memorial de cálculo — Punção em laje lisa</h1>
          </div>
          <div className="rel-norma">
            ABNT NBR 6118:2026
            <span>item 19.5</span>
          </div>
        </div>
        <RelTab linhas={[
          ['Projeto', projectName || 'Caso de estudo'],
          ['Elemento', 'Pilar interno de seção ' + (R.circ ? 'circular' : 'retangular') + ', com momentos nas duas direções'],
          ['Data de emissão', hoje],
        ]} />
      </header>

      {/* ── 1 ── */}
      <RelSecao n="1" titulo="Dados de entrada">
        <RelDuplo>
          <div>
            <h3>Geometria</h3>
            <RelTab linhas={[
              R.circ
                ? ['Diâmetro do pilar Ø', ri(R.D), 'cm']
                : ['C<sub>1</sub> (paralela à excentricidade)', ri(R.cC1), 'cm'],
              !R.circ && ['C<sub>2</sub> (perpendicular)', ri(R.cC2), 'cm'],
              ['Espessura da laje h', ri(I.h), 'cm'],
              ['Cobrimento nominal', ri(I.cobrimento), 'cm'],
              ['Malha externa (topo)', 'direção ' + R.camadaExterna],
            ]} />
            <h3>Materiais</h3>
            <RelTab linhas={[
              ['f<sub>ck</sub>', ri(I.fck), 'MPa'],
              ['f<sub>yk</sub>', ri(I.fyk), 'MPa'],
              ['Classe do concreto', 'C' + Math.round(I.fck)],
            ]} />
          </div>
          <div>
            <h3>Armadura de flexão</h3>
            <RelTab linhas={[
              ['Direção x', 'Ø ' + ri(I.phi_lx) + ' mm c/ ' + ri(I.s_x) + ' cm'],
              ['Direção y', 'Ø ' + ri(I.phi_ly) + ' mm c/ ' + ri(I.s_y) + ' cm'],
            ]} />
            <h3>Esforços característicos</h3>
            <RelTab linhas={[
              ['Força de punção F<sub>sk</sub>', ri(I.Fsk), 'kN'],
              ['Momento M<sub>k1x</sub>', ri(I.Mxk), 'kN·cm'],
              ['Momento M<sub>k1y</sub>', ri(I.Myk), 'kN·cm'],
            ]} />
            <h3>Coeficientes parciais</h3>
            <RelTab linhas={[
              ['γ<sub>c</sub> · γ<sub>s</sub> · γ<sub>f</sub>', '1,4 · 1,15 · 1,4'],
            ]} />
          </div>
        </RelDuplo>
      </RelSecao>

      {/* ── 2 ── */}
      <RelSecao n="2" titulo="Alturas úteis e valores de cálculo">
        <p className="rel-nota">
          As duas malhas de flexão são sobrepostas: a externa fica junto ao cobrimento e a interna
          desce uma bitola inteira, por isso as alturas úteis diferem nas duas direções.
        </p>
        <RelEq
          lhs={<>d<sub>{extY ? 'y' : 'x'}</sub></>}
          sym={<>h − c − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub>/2</>}
          sub={ri(I.h) + ' − ' + rf(I.cobrimento) + ' − ' + rf(phiExt / 10, 3) + '/2'}
          res={rf(extY ? R.dy : R.dx)} unit="cm" />
        <RelEq
          lhs={<>d<sub>{extY ? 'x' : 'y'}</sub></>}
          sym={<>h − c − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub> − Ø<sub>ℓ{extY ? 'x' : 'y'}</sub>/2</>}
          sub={ri(I.h) + ' − ' + rf(I.cobrimento) + ' − ' + rf(phiExt / 10, 3) + ' − ' + rf(phiInt / 10, 3) + '/2'}
          res={rf(extY ? R.dx : R.dy)} unit="cm" />
        <RelEq lhs="d" sym={<>(d<sub>x</sub> + d<sub>y</sub>)/2</>}
          sub={'(' + rf(R.dx) + ' + ' + rf(R.dy) + ')/2'} res={rf(R.d)} unit="cm" />
        <RelDuplo>
          <RelTab linhas={[
            ['f<sub>cd</sub> = f<sub>ck</sub>/γ<sub>c</sub>', rf(R.fcd), 'MPa'],
            ['f<sub>yd</sub> = f<sub>yk</sub>/γ<sub>s</sub>', rf(R.fyd), 'MPa'],
          ]} />
          <RelTab linhas={[
            ['F<sub>sd</sub> = γ<sub>f</sub>·F<sub>sk</sub>', rf(R.Fsd, 1), 'kN'],
            ['M<sub>sd1x</sub> = γ<sub>f</sub>·M<sub>k1x</sub>', rf(R.Msd1x, 0), 'kN·cm'],
            ['M<sub>sd1y</sub> = γ<sub>f</sub>·M<sub>k1y</sub>', rf(R.Msd1y, 0), 'kN·cm'],
          ]} />
        </RelDuplo>
      </RelSecao>

      {/* ── 3 ── */}
      <RelSecao n="3" titulo="Perímetros de controle" cite="19.5.2.1">
        {R.circ ? (
          <>
            <RelEq lhs={<>u<sub>1</sub></>} sym={<>π·Ø</>} sub={'π·' + ri(R.D)} res={rf(R.u1)} unit="cm" />
            <RelEq lhs={<>u<sub>2</sub></>} sym={<>π·(Ø + 4d)</>}
              sub={'π·(' + ri(R.D) + ' + 4·' + rf(R.d) + ')'} res={rf(R.u2)} unit="cm" />
          </>
        ) : (
          <>
            <RelEq lhs={<>u<sub>1</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>)</>}
              sub={'2·(' + ri(R.cC1) + ' + ' + ri(R.cC2) + ')'} res={rf(R.u1)} unit="cm" />
            <RelEq lhs={<>u<sub>2</sub></>} sym={<>2·(C<sub>1</sub> + C<sub>2</sub>) + 4π·d</>}
              sub={rf(R.u1) + ' + 4π·' + rf(R.d)} res={rf(R.u2)} unit="cm" />
          </>
        )}
        {R.etapa9 && (
          <RelEq lhs={<>u<sub>3</sub></>}
            sym={R.etapa9.u3manual ? <>perímetro medido em CAD</> : <>u<sub>1</sub> + 2π·(2d + p)</>}
            sub={R.etapa9.u3manual ? null : rf(R.u1) + ' + 2π·(2·' + rf(R.d) + ' + ' + rf(R.etapa9.p) + ')'}
            res={rf(R.etapa9.u3)} unit="cm" />
        )}
      </RelSecao>

      {/* ── 4 ── */}
      <RelSecao n="4" titulo="Resistência de cálculo da armadura de punção" cite="19.4.2">
        <p className="rel-nota">
          f<sub>ywd</sub> depende apenas da espessura da laje, em três situações:
          h &lt; 15 cm → 250 MPa; 15 ≤ h ≤ 35 cm → interpolação linear; h &gt; 35 cm → 435 MPa.
        </p>
        {R.fywdCaso === 'menor' ? (
          <RelEq lhs={<>f<sub>ywd</sub></>} sym={<>250 MPa, pois h = {ri(I.h)} cm &lt; 15 cm</>}
            res={rf(R.fywd, 1)} unit="MPa" />
        ) : R.fywdCaso === 'maior' ? (
          <RelEq lhs={<>f<sub>ywd</sub></>} sym={<>435 MPa, pois h = {ri(I.h)} cm &gt; 35 cm</>}
            res={rf(R.fywd, 1)} unit="MPa" />
        ) : (
          <RelEq lhs={<>f<sub>ywd</sub></>} sym={<>250 + (h − 15)·(435 − 250)/(35 − 15)</>}
            sub={'250 + (' + ri(I.h) + ' − 15)·185/20'} res={rf(R.fywd, 1)} unit="MPa" />
        )}
      </RelSecao>

      {/* ── 5 ── */}
      <RelSecao n="5" titulo="Taxa geométrica de armadura de flexão" cite="19.5.3.2">
        <p className="rel-nota">
          Medida na faixa correspondente à dimensão do pilar acrescida de 3d para cada lado.
        </p>
        <RelDuplo>
          <RelTab linhas={[
            ['Faixa em x = 3d + C<sub>1</sub> + 3d', rf(R.faixaX), 'cm'],
            ['Barras na faixa q<sub>x</sub>', rf(R.qx_exato, 3) + ' ≅ ' + R.qx],
            ['A<sub>s1Ø,x</sub> = π·Ø²/4', rf(R.As1_x, 3), 'cm²'],
            ['ρ<sub>x</sub>', r5(R.rox)],
          ]} />
          <RelTab linhas={[
            ['Faixa em y = 3d + C<sub>2</sub> + 3d', rf(R.faixaY), 'cm'],
            ['Barras na faixa q<sub>y</sub>', rf(R.qy_exato, 3) + ' ≅ ' + R.qy],
            ['A<sub>s1Ø,y</sub> = π·Ø²/4', rf(R.As1_y, 3), 'cm²'],
            ['ρ<sub>y</sub>', r5(R.roy)],
          ]} />
        </RelDuplo>
        <RelEq lhs="ρ" sym={<>√(ρ<sub>x</sub>·ρ<sub>y</sub>) ≤ 0,02</>}
          sub={'√(' + r5(R.rox) + ' · ' + r5(R.roy) + ')'} res={r5(R.rho)} />
        {R.rho_bruto > 0.02 && (
          <p className="rel-nota">ρ calculado = {r5(R.rho_bruto)} foi limitado a 0,02 pela norma.</p>
        )}
      </RelSecao>

      {/* ── 6 ── */}
      <RelSecao n="6" titulo="Superfície crítica C — compressão diagonal do concreto" cite="19.5.3.1">
        <RelEq lhs={<>α<sub>v</sub></>} sym={<>1 − f<sub>ck</sub>/250</>}
          sub={'1 − ' + ri(I.fck) + '/250'} res={rf(R.alphaV, 3)} />
        <RelEq lhs={<>τ<sub>Rd2</sub></>} sym={<>0,27·α<sub>v</sub>·f<sub>cd</sub></>}
          sub={'0,27 · ' + rf(R.alphaV, 3) + ' · ' + rf(R.fcd)} res={rf(R.tauRd2)} unit="MPa" />
        <RelEq lhs={<>τ<sub>Sd</sub></>} sym={<>F<sub>sd</sub>/(u<sub>1</sub>·d)</>}
          sub={rf(R.Fsd, 1) + '/(' + rf(R.u1) + ' · ' + rf(R.d) + ')'} res={rf(R.tauSd_C)} unit="MPa" />
        <RelVerif ok={R.verif1}
          cond={<>τ<sub>Sd</sub> = {rf(R.tauSd_C)} {R.verif1 ? '≤' : '>'} τ<sub>Rd2</sub> = {rf(R.tauRd2)} MPa</>}
          texto={R.verif1
            ? 'não há esmagamento da biela junto ao pilar'
            : 'esmagamento da biela: aumentar a seção do pilar, a espessura da laje ou o fck'} />
      </RelSecao>

      {/* ── 7 ── */}
      <RelSecao n="7" titulo="Superfície crítica C′ — sem armadura de punção" cite="19.5.3.2">
        <RelDuplo>
          <RelTab linhas={R.circ ? [
            ['K (pilar circular interno)', rf(R.kx, 2)],
            ['W<sub>p</sub> = (Ø + 4d)²', rf(R.Wpx), 'cm²'],
          ] : [
            ['k<sub>x</sub> (C₁/C₂ = ' + rf(R.cC1 / R.cC2) + ')', rf(R.kx, 4)],
            ['k<sub>y</sub> (C₂/C₁ = ' + rf(R.cC2 / R.cC1) + ')', rf(R.ky, 4)],
          ]} />
          <RelTab linhas={R.circ ? [] : [
            ['W<sub>px</sub>', rf(R.Wpx), 'cm²'],
            ['W<sub>py</sub>', rf(R.Wpy), 'cm²'],
          ]} />
        </RelDuplo>
        <RelEq lhs={<>τ<sub>Sd</sub></>}
          sym={<>F<sub>sd</sub>/(u<sub>2</sub>d) + k<sub>x</sub>M<sub>sd1x</sub>/(W<sub>px</sub>d) + k<sub>y</sub>M<sub>sd1y</sub>/(W<sub>py</sub>d)</>}
          sub={rf(R.tauSd_Cl_F) + ' + ' + rf(R.tauSd_Cl_Mx) + ' + ' + rf(R.tauSd_Cl_My)}
          res={rf(R.tauSd_Cl)} unit="MPa" />
        {R.temAxial && (
          <>
            <RelTab linhas={[
              ['σ<sub>cp,x</sub> = N<sub>Sd,x</sub>/A<sub>c</sub>', rf(R.sigma_cpx, 3), 'MPa'],
              ['σ<sub>cp,y</sub> = N<sub>Sd,y</sub>/A<sub>c</sub>', rf(R.sigma_cpy, 3), 'MPa'],
            ]} />
            <RelEq lhs={<>σ<sub>cp</sub></>} sym={<>(σ<sub>cp,x</sub> + σ<sub>cp,y</sub>)/2 ≤ 3,5 MPa</>}
              sub={'(' + rf(R.sigma_cpx, 3) + ' + ' + rf(R.sigma_cpy, 3) + ')/2'}
              res={rf(R.sigma_cp, 3)} unit="MPa" />
          </>
        )}
        <RelEq lhs={<>k<sub>e</sub></>} sym={<>mín(1 + √(20/d) ; 2)</>}
          sub={'mín(' + rf(R.fator_d_bruto, 4) + ' ; 2)'} res={rf(R.fator_d, 4)} />
        {R.ke_limitado && (
          <p className="rel-nota">
            Coeficiente de escala calculado {rf(R.fator_d_bruto, 4)}, truncado no limite k<sub>e</sub> ≤ 2.
          </p>
        )}
        <RelEq lhs={<>τ<sub>Rd1</sub></>} sym={<>0,13·k<sub>e</sub>·(100·ρ·f<sub>ck</sub>)<sup>1/3</sup>{R.temAxial && <> + 0,10·σ<sub>cp</sub></>}</>}
          sub={'0,13 · ' + rf(R.fator_d, 4) + ' · (100 · ' + r5(R.rho) + ' · ' + ri(I.fck) + ')^(1/3)'
                + (R.temAxial ? ' + 0,10 · ' + rf(R.sigma_cp, 3) : '')}
          res={rf(R.tauRd1, 4)} unit="MPa" />
        <RelVerif ok={R.verif2}
          cond={<>τ<sub>Sd</sub> = {rf(R.tauSd_Cl)} {R.verif2 ? '≤' : '>'} τ<sub>Rd1</sub> = {rf(R.tauRd1)} MPa</>}
          texto={R.verif2
            ? 'o concreto resiste sozinho: dispensa armadura de punção'
            : 'a ligação exige armadura de punção'} />
      </RelSecao>

      {/* ── 8 ── */}
      <RelSecao n="8" titulo="Superfície crítica C′ — com armadura de punção" cite="19.5.3.3">
        {!R.precisaArm && !temArm ? (
          <p className="rel-nota">Não aplicável: o contorno C′ é atendido sem armadura de punção.</p>
        ) : !temArm ? (
          <p className="rel-nota">Armadura de punção necessária, porém ainda não definida neste caso.</p>
        ) : (
          <>
            <RelDuplo>
              <RelTab linhas={[
                ['Tipo de armadura', R.tipoArm === 'estribo' ? 'Estribo' : 'Conector (stud)'],
                ['Diâmetro', ri(R.studs.phi), 'mm'],
                ['Conectores por camada', ri(R.studs.nconec)],
                ['Número de camadas', ri(R.studs.ncam)],
                ['Total de conectores', ri(R.studs.nconec * R.studs.ncam)],
              ]} />
              <RelTab linhas={[
                ['s<sub>0</sub> adotado — limite 0,5d = ' + rf(R.s0_lim), rf(R.s0), 'cm'],
                ['s<sub>r</sub> adotado — limite 0,75d = ' + rf(R.sr_lim), rf(R.sr), 'cm'],
                ['s<sub>e</sub> real — limite 2d = ' + rf(R.se_lim), rf(R.studs.se_real), 'cm'],
                ['A<sub>s1c</sub> = π·Ø²/4', rf(R.studs.As1c, 4), 'cm²'],
                ['A<sub>sw</sub> por camada', rf(R.studs.Asw, 3), 'cm²'],
              ]} />
            </RelDuplo>
            {R.alertaEspac.length > 0 && (
              <p className="rel-alerta">Atenção: {R.alertaEspac.join(' · ')}.</p>
            )}
            <RelEq lhs={<>τ<sub>Rd3</sub></>}
              sym={<>0,10·(1+√(20/d))·(100ρf<sub>ck</sub>)<sup>1/3</sup> + 1,5·(d/s<sub>r</sub>)·A<sub>sw</sub>·f<sub>ywd</sub>·senα/(u<sub>2</sub>d)</>}
              sub={rf(R.tauRd3_c) + ' + ' + rf(R.tauRd3_s)} res={rf(R.tauRd3)} unit="MPa" />
            <RelVerif ok={R.verif3}
              cond={<>τ<sub>Sd</sub> = {rf(R.tauSd_Cl)} {R.verif3 ? '≤' : '>'} τ<sub>Rd3</sub> = {rf(R.tauRd3)} MPa</>}
              texto={R.verif3
                ? 'a armadura adotada é suficiente no contorno C′'
                : 'armadura insuficiente: aumentar o diâmetro, o número de conectores por camada ou reduzir sr'} />
            <RelVerif ok={R.studs.se_ok}
              cond={<>s<sub>e</sub> = {rf(R.studs.se_real)} {R.studs.se_ok ? '≤' : '>'} 2d = {rf(R.se_lim)} cm</>}
              texto={R.studs.se_ok
                ? 'espaçamento tangencial na última camada dentro do limite'
                : 'aumentar o número de conectores por camada'} />
          </>
        )}
      </RelSecao>

      {/* ── 9 ── */}
      <RelSecao n="9" titulo="Superfície crítica C″ — além da armadura" cite="19.5.3.4">
        {!R.etapa9 ? (
          <p className="rel-nota">Não aplicável: depende da armadura de punção.</p>
        ) : (
          <>
            <RelEq lhs="p" sym={<>s<sub>0</sub> + (n<sub>cam</sub> − 1)·s<sub>r</sub></>}
              sub={rf(R.s0) + ' + (' + R.studs.ncam + ' − 1)·' + rf(R.sr)}
              res={rf(R.etapa9.p)} unit="cm" />
            <RelDuplo>
              <RelTab linhas={[
                ['u<sub>3</sub>', rf(R.etapa9.u3), 'cm'],
                R.etapa9.u3manual && ['u<sub>3</sub> analítico (referência)', rf(R.etapa9.u3_calc), 'cm'],
              ]} />
              <RelTab linhas={R.circ ? [
                ['W<sub>p,C″</sub> = (Ø + 4d + 2p)²', rf(R.etapa9.WpxCpp), 'cm²'],
              ] : [
                ['W<sub>px,C″</sub>', rf(R.etapa9.WpxCpp), 'cm²'],
                ['W<sub>py,C″</sub>', rf(R.etapa9.WpyCpp), 'cm²'],
              ]} />
            </RelDuplo>
            <RelEq lhs={<>τ<sub>Sd,C″</sub></>}
              sym={<>F<sub>sd</sub>/(u<sub>3</sub>d) + k<sub>x</sub>M<sub>sd1x</sub>/(W<sub>px,C″</sub>d) + k<sub>y</sub>M<sub>sd1y</sub>/(W<sub>py,C″</sub>d)</>}
              sub={rf(R.etapa9.tauSd_Cpp_F) + ' + ' + rf(R.etapa9.tauSd_Cpp_Mx) + ' + ' + rf(R.etapa9.tauSd_Cpp_My)}
              res={rf(R.etapa9.tauSd_Cpp)} unit="MPa" />
            <RelVerif ok={R.etapa9.verif4}
              cond={<>τ<sub>Sd,C″</sub> = {rf(R.etapa9.tauSd_Cpp)} {R.etapa9.verif4 ? '≤' : '>'} τ<sub>Rd1</sub> = {rf(R.tauRd1)} MPa</>}
              texto={R.etapa9.verif4
                ? 'a armadura pode ser interrompida neste contorno'
                : 'estender a armadura com mais camadas'} />
          </>
        )}
      </RelSecao>

      {/* ── 10 ── */}
      {R.colapso && !R.colapso.incompleto && (
        <RelSecao n="10" titulo="Colapso progressivo" cite="19.5.4">
          <p className="rel-nota">
            Rompida a ligação por punção, a armadura de flexão inferior que atravessa o
            contorno C precisa suspender a força sozinha: ΣA<sub>s</sub>·f<sub>yd</sub> ≥ F<sub>Sd</sub>,
            somando as barras que cruzam cada face do pilar. A face com menos aço governa.
          </p>
          <RelEq lhs={<>A<sub>s,nec</sub></>} sym={<>F<sub>Sd</sub>/f<sub>yd</sub></>}
            sub={rf(Math.abs(R.Fsd)) + ' / ' + rf(R.fyd / 10, 3)}
            res={rf(R.colapso.As_nec)} unit="cm²" />
          <RelTab linhas={[
            ['barras horizontais (dir. x) — Ø' + ri(R.colapso.phi_h) + ' c/ ' + rf(R.colapso.s_h) + ' cm', rf(R.colapso.As_h), 'cm²/face'],
            ['barras verticais (dir. y) — Ø' + ri(R.colapso.phi_v) + ' c/ ' + rf(R.colapso.s_v) + ' cm', rf(R.colapso.As_v), 'cm²/face'],
            ['face crítica', rf(R.colapso.As_gov), 'cm²'],
          ]} />
          <RelVerif ok={R.colapso.verif5}
            cond={<>ΣA<sub>s</sub>·f<sub>yd</sub> = {rf(R.colapso.Rd)} {R.colapso.verif5 ? '≥' : '<'} F<sub>Sd</sub> = {rf(Math.abs(R.Fsd))} kN</>}
            texto={R.colapso.verif5
              ? 'a armadura inferior garante a proteção contra colapso progressivo'
              : 'armadura inferior insuficiente contra colapso progressivo'} />
        </RelSecao>
      )}

      {/* ── 11 ── */}
      <RelSecao n={R.colapso && !R.colapso.incompleto ? '11' : '10'} titulo="Resumo das verificações">
        <table className="rel-resumo">
          <thead>
            <tr>
              <th>Contorno</th><th>Verificação</th><th>Solicitante</th><th>Resistente</th><th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr className={R.verif1 ? 'ok' : 'nao'}>
              <td>C</td><td>Compressão diagonal da biela</td>
              <td>{rf(R.tauSd_C)} MPa</td><td>{rf(R.tauRd2)} MPa</td>
              <td>{R.verif1 ? 'Atende' : 'Não atende'}</td>
            </tr>
            <tr className={R.verif2 ? 'ok' : 'nao'}>
              <td>C′</td><td>Sem armadura de punção</td>
              <td>{rf(R.tauSd_Cl)} MPa</td><td>{rf(R.tauRd1)} MPa</td>
              <td>{R.verif2 ? 'Atende' : 'Exige armadura'}</td>
            </tr>
            <tr className={temArm ? (R.verif3 ? 'ok' : 'nao') : 'pend'}>
              <td>C′</td><td>Com armadura de punção</td>
              <td>{temArm ? rf(R.tauSd_Cl) + ' MPa' : '—'}</td>
              <td>{temArm ? rf(R.tauRd3) + ' MPa' : '—'}</td>
              <td>{temArm ? (R.verif3 ? 'Atende' : 'Não atende') : 'Não avaliado'}</td>
            </tr>
            <tr className={R.etapa9 ? (R.etapa9.verif4 ? 'ok' : 'nao') : 'pend'}>
              <td>C″</td><td>Além da armadura</td>
              <td>{R.etapa9 ? rf(R.etapa9.tauSd_Cpp) + ' MPa' : '—'}</td>
              <td>{R.etapa9 ? rf(R.tauRd1) + ' MPa' : '—'}</td>
              <td>{R.etapa9 ? (R.etapa9.verif4 ? 'Atende' : 'Não atende') : 'Não avaliado'}</td>
            </tr>
            {R.colapso && !R.colapso.incompleto && (
              <tr className={R.colapso.verif5 ? 'ok' : 'nao'}>
                <td>C</td><td>Colapso progressivo</td>
                <td>{rf(Math.abs(R.Fsd))} kN</td>
                <td>{rf(R.colapso.Rd)} kN</td>
                <td>{R.colapso.verif5 ? 'Atende' : 'Não atende'}</td>
              </tr>
            )}
          </tbody>
        </table>

        <h3>Conclusão</h3>
        <p className="rel-conclusao">{textoConclusao(R, temArm)}</p>
      </RelSecao>

      <footer className="rel-rodape">
        Documento gerado por PunçãoAcad em {hoje} · ABNT NBR 6118:2026 ·
        Os resultados devem ser conferidos por profissional habilitado.
      </footer>
    </div>
  );
}

function textoConclusao(R, temArm) {
  if (!R.verif1) {
    return 'A superfície crítica C não é atendida: há esmagamento da biela comprimida junto à face do '
      + 'pilar. A ligação é inviável na configuração atual, independentemente da armadura de punção — é '
      + 'necessário aumentar a seção do pilar, a espessura da laje ou a resistência do concreto.';
  }
  if (R.verif2) {
    return 'A ligação laje-pilar atende à punção sem necessidade de armadura específica: a tensão '
      + 'solicitante no contorno crítico C′ é inferior à resistente e o contorno C não apresenta '
      + 'esmagamento da biela.';
  }
  if (!temArm) {
    return 'O contorno C′ não é atendido apenas pelo concreto, sendo obrigatória a adoção de armadura de '
      + 'punção. As verificações do contorno C′ com armadura e do contorno C″ ficam pendentes da '
      + 'definição dessa armadura.';
  }
  const okCl = R.verif3;
  const okCpp = R.etapa9 && R.etapa9.verif4;
  // O colapso progressivo é uma verificação à parte: só entra na conclusão
  // quando o projetista informou a armadura inferior.
  const temCcp = R.colapso && !R.colapso.incompleto;
  const okCcp = !temCcp || R.colapso.verif5;

  const alerta = temCcp && !R.colapso.verif5
    ? ' A armadura inferior contra colapso progressivo, porém, é insuficiente: a face crítica '
      + 'oferece ' + rf(R.colapso.As_gov) + ' cm² e são necessários ' + rf(R.colapso.As_nec)
      + ' cm² (item 19.5.4).'
    : '';

  if (okCl && okCpp && okCcp) {
    return 'A ligação atende à punção com a armadura adotada: ' + R.studs.nconec + ' conectores de Ø'
      + R.studs.phi + ' mm por camada, em ' + R.studs.ncam + ' camadas, com s₀ = ' + rf(R.s0)
      + ' cm e sr = ' + rf(R.sr) + ' cm. Todos os contornos verificados são atendidos.';
  }
  if (okCl && okCpp) {
    return 'Os contornos de punção são atendidos com a armadura adotada: ' + R.studs.nconec
      + ' conectores de Ø' + R.studs.phi + ' mm por camada, em ' + R.studs.ncam + ' camadas.'
      + alerta;
  }
  const faltas = [];
  if (!okCl) faltas.push('o contorno C′ com armadura');
  if (!okCpp) faltas.push('o contorno C″');
  return 'A armadura adotada não é suficiente: ' + faltas.join(' e ') + ' não é atendido. Revise o '
    + 'diâmetro e a quantidade de conectores por camada, reduza o espaçamento radial sr, acrescente '
    + 'camadas ou aumente a espessura da laje.' + alerta;
}

window.Relatorio = Relatorio;

/* global React */
const { useState: useStateS, useEffect: useEffectS } = React;

// ============================================================
//  Steps — input forms, one per Card. Active/collapsed states.
// ============================================================

const HELP = {
  C1: { title: 'Dimensão C₁', body: 'Dimensão do pilar em planta paralela à excentricidade do momento Mx. Medida em cm na seção do pilar.', ref: 'NBR 6118 · 19.5.2.3' },
  C2: { title: 'Dimensão C₂', body: 'Dimensão do pilar em planta perpendicular a C₁. Medida em cm.', ref: 'NBR 6118 · 19.5.2.3' },
  diam: { title: 'Diâmetro Ø', body: 'Diâmetro do pilar circular em cm.', ref: 'NBR 6118 · 19.5' },
  Fsk: { title: 'Força característica Fsk', body: 'Reação normal característica transmitida ao pilar (vinda das ações verticais da laje).', ref: 'NBR 6118 · 11.7' },
  Mxk: { title: 'Momento Mxk', body: 'Momento fletor característico transmitido pilar→laje em torno do eixo X.', ref: 'NBR 6118 · 19.5.2.2' },
  Myk: { title: 'Momento Myk', body: 'Momento fletor característico em torno do eixo Y.', ref: 'NBR 6118 · 19.5.2.2' },
  h: { title: 'Altura total h', body: 'Espessura da laje, em cm. Define dx, dy e d (alturas úteis).', ref: 'NBR 6118 · 13.2.4.1' },
  fck: { title: 'fck', body: 'Resistência característica do concreto à compressão (MPa). Define a classe (C20–C90).', ref: 'NBR 6118 · 8.2.8' },
  fyk: { title: 'fyk', body: 'Resistência característica de escoamento do aço passivo (MPa). CA-50 → 500 MPa.', ref: 'NBR 6118 · 8.3.6' },
  cobrimento: { title: 'Cobrimento c', body: 'Espessura do cobrimento nominal das armaduras (cm). Mínimo função do ambiente (CAA).', ref: 'NBR 6118 · 7.4.7' },
  camadaExterna: { title: 'Camada externa', body: 'Qual das duas malhas de flexão fica mais próxima da face tracionada (topo, sobre o pilar). A direção externa tem a maior altura útil; a interna desce uma bitola inteira: d_int = h − c − Ø_ext − Ø_int/2.', ref: 'NBR 6118 · 20.1' },
  phil: { title: 'Barra de flexão Øl', body: 'Diâmetro da barra longitudinal de flexão da laje em mm.', ref: 'NBR 6118 · 20.1' },
  s: { title: 'Espaçamento s', body: 'Espaçamento entre barras de flexão na direção considerada (cm).', ref: 'NBR 6118 · 20.1' },
  stud_phi: { title: 'Diâmetro do conector', body: 'Diâmetro do conector de cisalhamento (stud) em mm. Limite Ø ≤ h/20.', ref: 'NBR 6118 · 19.4.2' },
  nconec: { title: 'Conectores por camada', body: 'Quantidade de studs em cada camada radial (geralmente 8 ou 12).', ref: 'NBR 6118 · 19.5.3.3' },
  ncam: { title: 'Número de camadas', body: 'Quantidade de camadas radiais de studs ao redor do pilar.', ref: 'NBR 6118 · 19.5.3.3' },
  tipoArm: { title: 'Tipo de armadura de punção', body: 'Define a base de fywd: estribo → 250 MPa; conector (stud) → 300 MPa, para h ≤ 15 cm, interpolando linearmente até 435 MPa quando h ≥ 35 cm.', ref: 'NBR 6118 · 19.4.2' },
  s0: { title: 'Espaçamento s₀ adotado', body: 'Distância da face do pilar à primeira camada de armadura. Limite: s₀ ≤ 0,5·d. Na prática arredonda-se o limite para baixo.', ref: 'NBR 6118 · 19.5.3.3' },
  sr: { title: 'Espaçamento radial sr adotado', body: 'Distância entre camadas sucessivas de armadura. Limite: sr ≤ 0,75·d. Entra diretamente no termo 1,5·(d/sr) de τRd3.', ref: 'NBR 6118 · 19.5.3.3' },
  se: { title: 'Espaçamento se adotado', body: 'Distância entre conectores ao longo de um mesmo contorno. Limite: se ≤ 2·d.', ref: 'NBR 6118 · 19.5.3.3' },
  u3: { title: 'Perímetro u₃ medido', body: 'Perímetro do contorno C″, a 2d além da última camada de armadura. O app calcula u₃ = u₁ + 2π·(2d + p) com cantos arredondados; se você mediu o contorno poligonal em CAD, informe o valor medido aqui.', ref: 'NBR 6118 · 19.5.3.4' },
  Nsd: { title: 'Força axial de compressão', body: 'Força normal de compressão atuante no contorno C′ na direção considerada — de protensão ou de restrição axial. Gera σcp, que soma uma parcela favorável a τRd1. Deixe em branco se a laje não tem compressão axial.', ref: 'NBR 6118 · 19.5.3.2' },
  Ac: { title: 'Área Ac', body: 'Área de concreto associada à força axial de compressão, em cm². Usada em σcp = Nsd/Ac.', ref: 'NBR 6118 · 19.5.3.2' },
  ccp: { title: 'Colapso progressivo', body: 'A armadura de flexão INFERIOR que atravessa o contorno C precisa, sozinha, suspender a força de punção caso a ligação rompa: ΣAs·fyd ≥ FSd, somando as barras que cruzam cada face do pilar. Essas barras devem estar bem ancoradas além do contorno.', ref: 'NBR 6118 · 19.5.4' },
};

function HelpDot({ k }) {
  const h = HELP[k];
  if (!h) return null;
  return (
    <span className="help" tabIndex="0">?
      <span className="pop">
        <b>{h.title}</b><br />
        {h.body}
        <span className="ref">{h.ref}</span>
      </span>
    </span>
  );
}

function Field({ label, helpKey, value, onChange, onFocus, placeholder, suffix, type='number', step, error, options, min }) {
  return (
    <div className="campo-grupo">
      <label className="field-label">
        <span dangerouslySetInnerHTML={{__html: label}} />
        {helpKey && <HelpDot k={helpKey} />}
      </label>
      {options ? (
        <select className={"select" + (error ? ' error' : '')} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} onFocus={onFocus}>
          <option value="">Selecione…</option>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <div className="input-suffix">
          <input
            className={"input" + (error ? ' error' : '')}
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            onFocus={onFocus}
            placeholder={placeholder}
            step={step}
            min={min}
          />
          {suffix && <span className="suffix">{suffix}</span>}
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

// generic step shell
function StepCard({ n, title, active, done, locked, summary, onClick, children, id }) {
  return (
    <div id={id} className={"step-card" + (active ? ' active' : '') + (done ? ' done' : '') + (locked ? ' locked' : '') + (!active && !locked ? ' collapsed' : '')}>
      <div className="step-head" onClick={onClick}>
        <span className="num">{n}</span>
        <h3>{title}</h3>
        {locked && <span className="lock-pill">🔒 Em breve</span>}
        {!locked && (
          <svg className="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {active && <div className="step-body fade-in">{children}</div>}
      {!active && summary && summary.length > 0 && <div className="step-summary">{summary.map((c, i) => <span key={i} className="chip"><span className="lbl">{c.lbl}</span><b>{c.val}</b></span>)}</div>}
    </div>
  );
}

// Bitola options
const BITOLA_FLEX = [
  { v: 6.3, l: 'Ø 6,3 mm' },
  { v: 8, l: 'Ø 8 mm' },
  { v: 10, l: 'Ø 10 mm' },
  { v: 12.5, l: 'Ø 12,5 mm' },
  { v: 16, l: 'Ø 16 mm' },
  { v: 20, l: 'Ø 20 mm' },
  { v: 25, l: 'Ø 25 mm' },
  { v: 32, l: 'Ø 32 mm' },
];
const BITOLA_ESTRIBO = [
  { v: 5, l: '5 mm' },
  { v: 6.3, l: '6,3 mm' },
  { v: 8, l: '8 mm' },
  { v: 10, l: '10 mm' },
  { v: 12.5, l: '12,5 mm' },
];
const BITOLA_STUD = BITOLA_ESTRIBO.concat([{ v: 16, l: '16 mm' }, { v: 20, l: '20 mm' }]);

// ── Step 1: Pilar ──────────────────────────────────────────
function StepPilar({ data, set, active, onActivate, focused, setFocused, errs }) {
  const summary = !data.secao
    ? [{ lbl: 'Seção', val: '—' }, { lbl: 'Posição', val: 'Interno' }]
    : data.secao === 'circular'
    ? [{ lbl: 'Seção', val: 'Circular' }, { lbl: 'Posição', val: 'Interno' }, { lbl: 'Ø', val: `${data.diam || '—'} cm` }]
    : [{ lbl: 'Seção', val: 'Retangular' }, { lbl: 'Posição', val: 'Interno' }, { lbl: 'C₁', val: `${data.C1 || '—'} cm` }, { lbl: 'C₂', val: `${data.C2 || '—'} cm` }];
  return (
    <StepCard n={1} title="Dados do pilar" active={active} done={isStepDone(1, data)} summary={summary} onClick={onActivate}>
      <div>
        <div className="subhead">Tipo de seção</div>
        <div className="radio-cards">
          <label className="radio-card">
            <input type="radio" name="secao" checked={data.secao === 'retangular'} onChange={() => set({ secao: 'retangular' })} />
            <svg className="sketch" viewBox="0 0 32 22"><rect x="6" y="6" width="20" height="12" fill="#c4c8cf" stroke="#3b465a" strokeWidth="1"/></svg>
            Retangular
          </label>
          <label className="radio-card">
            <input type="radio" name="secao" checked={data.secao === 'circular'} onChange={() => set({ secao: 'circular' })} />
            <svg className="sketch" viewBox="0 0 32 22"><circle cx="16" cy="11" r="7" fill="#c4c8cf" stroke="#3b465a" strokeWidth="1"/></svg>
            Circular
          </label>
        </div>
      </div>

      {data.secao === 'retangular' && (
        <div className="grid-2">
          <Field label="C<sub>1</sub>" helpKey="C1" value={data.C1} onChange={v => set({ C1: v })} onFocus={() => setFocused('C1')} suffix="cm" error={errs.C1} />
          <Field label="C<sub>2</sub>" helpKey="C2" value={data.C2} onChange={v => set({ C2: v })} onFocus={() => setFocused('C2')} suffix="cm" error={errs.C2} />
        </div>
      )}
      {data.secao === 'circular' && (
        <Field label="Diâmetro Ø" helpKey="diam" value={data.diam} onChange={v => set({ diam: v })} onFocus={() => setFocused('diam')} suffix="cm" error={errs.diam} />
      )}

      <div>
        <div className="subhead">Posição do pilar</div>
        <div className="pos-cards">
          <label className="pos-card">
            <input type="radio" name="pos" checked={data.posicao === 'centro'} onChange={() => set({ posicao: 'centro' })} />
            <svg width="42" height="32" viewBox="0 0 42 32"><rect x="4" y="4" width="34" height="24" fill="none" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2 2"/><rect x="18" y="13" width="6" height="6" fill="#1d4499"/></svg>
            Interno
          </label>
          <label className="pos-card" data-locked="true" title="Em desenvolvimento">
            <input type="radio" disabled />
            <span className="lock-tag">🔒 em dev</span>
            <svg width="42" height="32" viewBox="0 0 42 32"><rect x="4" y="4" width="34" height="24" fill="none" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2 2"/><rect x="4" y="13" width="6" height="6" fill="#94a3b8"/></svg>
            Extremidade
          </label>
          <label className="pos-card" data-locked="true" title="Em desenvolvimento">
            <input type="radio" disabled />
            <span className="lock-tag">🔒 em dev</span>
            <svg width="42" height="32" viewBox="0 0 42 32"><rect x="4" y="4" width="34" height="24" fill="none" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2 2"/><rect x="4" y="4" width="6" height="6" fill="#94a3b8"/></svg>
            Canto
          </label>
        </div>
      </div>

      <div className="helper">
        <HelperPilar secao={data.secao} C1={data.C1} C2={data.C2} diam={data.diam} />
        <div className="lbl">
          <b>Pilar interno</b> · com momentos nas duas direções (Mx, My) atuando simultaneamente.<br/>
          {data.secao === 'circular'
            ? <>Pilar circular: u = π·Ø, K = 0,6 e W<sub>p</sub> = (Ø + 4d)², conforme item 19.5.2.3.</>
            : data.secao === 'retangular'
            ? <>A excentricidade da força gera tensões adicionais no perímetro crítico.</>
            : <>Escolha o tipo de seção do pilar.</>}
        </div>
      </div>
    </StepCard>
  );
}

// ── Step 2: Cargas ────────────────────────────────────────
function StepCargas({ data, set, active, onActivate, setFocused, errs }) {
  const summary = [
    { lbl: 'Fsk', val: `${data.Fsk || '—'} kN` },
    { lbl: 'Mxk', val: `${data.Mxk || '—'} kN·cm` },
    { lbl: 'Myk', val: `${data.Myk || '—'} kN·cm` },
  ];
  return (
    <StepCard n={2} title="Carregamentos característicos" active={active} done={isStepDone(2, data)} summary={summary} onClick={onActivate}>
      <div className="grid-3">
        <Field label="F<sub>sk</sub>" helpKey="Fsk" value={data.Fsk} onChange={v => set({ Fsk: v })} onFocus={() => setFocused('Fsk')} suffix="kN" error={errs.Fsk} />
        <Field label="M<sub>xk</sub>" helpKey="Mxk" value={data.Mxk} onChange={v => set({ Mxk: v })} onFocus={() => setFocused('Mxk')} suffix="kN·cm" error={errs.Mxk} />
        <Field label="M<sub>yk</sub>" helpKey="Myk" value={data.Myk} onChange={v => set({ Myk: v })} onFocus={() => setFocused('Myk')} suffix="kN·cm" error={errs.Myk} />
      </div>
      <BlocoAxial data={data} set={set} setFocused={setFocused} />
      <div className="helper">
        <HelperCargas Fsk={data.Fsk} Mxk={data.Mxk} Myk={data.Myk} />
        <div className="lbl">
          <b>Esforços característicos</b> aplicados pela laje no topo do pilar.<br/>
          Os momentos serão majorados por γf = 1,4 e introduzem o termo de excentricidade no cálculo de τSd.
        </div>
      </div>
    </StepCard>
  );
}

// Compressão axial (σcp) — parcela favorável de τRd1. Opcional: sem Nsd
// informado a laje é tratada como sem compressão axial e nada muda.
function BlocoAxial({ data, set, setFocused }) {
  const ax = data.axial || {};
  const ativo = !!ax.ativo;
  const setAx = (k, v) => set({ axial: { ...ax, [k]: v === '' ? null : v } });

  // prévia de σcp com o que já foi digitado
  const Ac = Number.isFinite(ax.Ac) && ax.Ac > 0 ? ax.Ac : null;
  const sx = Ac && Number.isFinite(ax.Nsdx) ? 10 * ax.Nsdx / Ac : null;
  const sy = Ac && Number.isFinite(ax.Nsdy) ? 10 * ax.Nsdy / Ac : null;
  const scp = sx !== null || sy !== null ? ((sx || 0) + (sy || 0)) / 2 : null;
  const limitado = scp !== null && scp > 3.5;

  return (
    <div>
      <label className="check-linha">
        <input type="checkbox" checked={ativo}
          onChange={e => set({ axial: e.target.checked ? { ...ax, ativo: true } : null })} />
        <span>Compressão axial na laje (σ<sub>cp</sub>)</span>
        <HelpDot k="Nsd" />
      </label>
      {ativo && (
        <>
          <div className="grid-3">
            <Field label="N<sub>Sd,x</sub>" helpKey="Nsd" value={ax.Nsdx} onChange={v => setAx('Nsdx', v)} onFocus={() => setFocused('Nsdx')} suffix="kN" />
            <Field label="N<sub>Sd,y</sub>" helpKey="Nsd" value={ax.Nsdy} onChange={v => setAx('Nsdy', v)} onFocus={() => setFocused('Nsdy')} suffix="kN" />
            <Field label="A<sub>c</sub>" helpKey="Ac" value={ax.Ac} onChange={v => setAx('Ac', v)} onFocus={() => setFocused('Ac')} placeholder="área" suffix="cm²" />
          </div>
          <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 4}}>
            σ<sub>cp</sub> = (σ<sub>cp,x</sub> + σ<sub>cp,y</sub>)/2 ={' '}
            <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>
              {scp === null ? '—' : (limitado ? 3.5 : scp).toFixed(3) + ' MPa'}
            </span>
            {limitado && <> — limitado a 3,5 MPa (valor calculado: {scp.toFixed(3)}).</>}
            {' '}Entra em τ<sub>Rd1</sub> como + 0,10·σ<sub>cp</sub>.
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 3: Laje e material ───────────────────────────────
function StepLaje({ data, set, active, onActivate, setFocused, errs }) {
  const summary = [
    { lbl: 'h', val: `${data.h || '—'} cm` },
    { lbl: 'fck', val: `${data.fck || '—'} MPa` },
    { lbl: 'fyk', val: `${data.fyk || '—'} MPa` },
  ];
  return (
    <StepCard n={3} title="Laje e material" active={active} done={isStepDone(3, data)} summary={summary} onClick={onActivate}>
      <div className="grid-3">
        <Field label="h" helpKey="h" value={data.h} onChange={v => set({ h: v })} onFocus={() => setFocused('h')} suffix="cm" error={errs.h} />
        <Field label="f<sub>ck</sub>" helpKey="fck" value={data.fck} onChange={v => set({ fck: v })} onFocus={() => setFocused('fck')} suffix="MPa" error={errs.fck} />
        <Field label="f<sub>yk</sub>" helpKey="fyk" value={data.fyk} onChange={v => set({ fyk: v })} onFocus={() => setFocused('fyk')} suffix="MPa" error={errs.fyk} />
      </div>
      <div className="helper">
        <HelperLaje h={data.h} fck={data.fck} />
        <div className="lbl">
          <b>Concreto</b> classe <b>{data.fck ? `C${Math.round(data.fck)}` : '—'}</b> · <b>Aço</b> CA-{data.fyk || '—'}.<br/>
          Coeficientes de cálculo: γc = 1,4 · γs = 1,15.
        </div>
      </div>
    </StepCard>
  );
}

// ── Step 4: Armaduras ─────────────────────────────────────
function StepArmaduras({ data, set, active, onActivate, setFocused, errs, derived }) {
  const camada = data.camadaExterna === 'x' || data.camadaExterna === 'y' ? data.camadaExterna : null;
  const extY = camada !== 'x';
  const summary = [
    { lbl: 'c', val: `${data.cobrimento || '—'} cm` },
    { lbl: 'Externa', val: camada ? `dir. ${camada}` : '—' },
    { lbl: 'Øℓx', val: `Ø${data.phi_lx || '—'} @ ${data.s_x || '—'}` },
    { lbl: 'Øℓy', val: `Ø${data.phi_ly || '—'} @ ${data.s_y || '—'}` },
  ];
  return (
    <StepCard n={4} title="Armaduras da laje" active={active} done={isStepDone(4, data)} summary={summary} onClick={onActivate}>
      <div>
        <div className="subhead">Cobrimento e ordem das camadas</div>
        <div className="grid-2">
          <Field label="Cobrimento c" helpKey="cobrimento" value={data.cobrimento} onChange={v => set({ cobrimento: v })} onFocus={() => setFocused('cobrimento')} step="0.1" suffix="cm" error={errs.cobrimento} />
          <div className="campo-grupo">
            <label className="field-label">
              <span>Camada externa (mais próxima do topo)</span>
              <HelpDot k="camadaExterna" />
            </label>
            <select className="select" value={camada || ''} onChange={e => set({ camadaExterna: e.target.value || null })} onFocus={() => setFocused('camadaExterna')}>
              <option value="">Selecione…</option>
              <option value="y">Direção y — dy é a maior</option>
              <option value="x">Direção x — dx é a maior</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <div className="subhead">Armadura de flexão · direção x</div>
        <div className="grid-2">
          <Field label="Bitola Ø<sub>ℓx</sub>" helpKey="phil" value={data.phi_lx} onChange={v => set({ phi_lx: v })} onFocus={() => setFocused('phi_lx')} options={BITOLA_FLEX} error={errs.phi_lx} />
          <Field label="Espaçamento s<sub>x</sub>" helpKey="s" value={data.s_x} onChange={v => set({ s_x: v })} onFocus={() => setFocused('s_x')} suffix="cm" error={errs.s_x} />
        </div>
      </div>
      <div>
        <div className="subhead">Armadura de flexão · direção y</div>
        <div className="grid-2">
          <Field label="Bitola Ø<sub>ℓy</sub>" helpKey="phil" value={data.phi_ly} onChange={v => set({ phi_ly: v })} onFocus={() => setFocused('phi_ly')} options={BITOLA_FLEX} error={errs.phi_ly} />
          <Field label="Espaçamento s<sub>y</sub>" helpKey="s" value={data.s_y} onChange={v => set({ s_y: v })} onFocus={() => setFocused('s_y')} suffix="cm" error={errs.s_y} />
        </div>
      </div>
      <BlocoColapso data={data} set={set} setFocused={setFocused} />
      <div className="helper">
        <HelperArmaduras h={data.h} cobrimento={data.cobrimento} camadaExterna={extY ? 'y' : 'x'} phi_lx={data.phi_lx} phi_ly={data.phi_ly} dx={derived?.dx} dy={derived?.dy} />
        <div className="lbl">
          <b>Sequência de camadas:</b> cobrimento → barra {extY ? 'y' : 'x'} (externa) → barra {extY ? 'x' : 'y'} (interna).<br/>
          d<sub>{extY ? 'y' : 'x'}</sub> = h − c − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub>/2 ={' '}
          <span className="mono" style={{color: 'var(--blue-900)', fontWeight: 600}}>{derived?.[extY ? 'dy' : 'dx'] ? derived[extY ? 'dy' : 'dx'].toFixed(2) : '—'} cm</span> ·{' '}
          d<sub>{extY ? 'x' : 'y'}</sub> = h − c − Ø<sub>ℓ{extY ? 'y' : 'x'}</sub> − Ø<sub>ℓ{extY ? 'x' : 'y'}</sub>/2 ={' '}
          <span className="mono" style={{color: 'var(--blue-900)', fontWeight: 600}}>{derived?.[extY ? 'dx' : 'dy'] ? derived[extY ? 'dx' : 'dy'].toFixed(2) : '—'} cm</span><br/>
          A altura útil média <b>d</b> = (d<sub>x</sub> + d<sub>y</sub>)/2 ={' '}
          <span className="mono" style={{color: 'var(--blue-900)', fontWeight: 600}}>{derived?.d ? derived.d.toFixed(2) : '—'} cm</span>.
        </div>
      </div>
    </StepCard>
  );
}

// Armadura inferior contra colapso progressivo (item 19.5.4). "Horizontal" e
// "vertical" são as direções em planta: as barras horizontais correm em x e
// cruzam as faces de largura C₂; as verticais correm em y e cruzam as de C₁.
function BlocoColapso({ data, set, setFocused }) {
  const cp = data.ccp || {};
  const ativo = !!cp.ativo;
  const setCp = (k, v) => set({ ccp: { ...cp, ativo: true, [k]: v === '' ? null : v } });

  const circ = data.secao === 'circular';
  const largH = circ ? data.diam : data.C2;   // face cruzada pelas barras em x
  const largV = circ ? data.diam : data.C1;   // face cruzada pelas barras em y
  const area = mm => (Number.isFinite(mm) && mm > 0 ? Math.PI * (mm/10) * (mm/10) / 4 : null);
  const porFace = (larg, mm, s) =>
    larg > 0 && Number.isFinite(s) && s > 0 && area(mm) ? (larg / s) * area(mm) : null;
  const AsH = porFace(largH, cp.phi_h, cp.s_h);
  const AsV = porFace(largV, cp.phi_v, cp.s_v);
  const AsNec = Number.isFinite(data.Fsk) && data.fyk > 0
    ? 10 * Math.abs(1.4 * data.Fsk) / (data.fyk / 1.15)
    : null;
  const gov = AsH !== null && AsV !== null ? Math.min(AsH, AsV) : null;
  const passa = gov !== null && AsNec !== null ? gov >= AsNec : null;

  return (
    <div>
      <label className="check-linha">
        <input type="checkbox" checked={ativo}
          onChange={e => set({ ccp: e.target.checked ? { ...cp, ativo: true } : null })} />
        <span>Colapso progressivo</span>
        <HelpDot k="ccp" />
      </label>
      {ativo && (
        <>
          <div className="grid-4">
            <Field label="A. Hor. Ø" helpKey="phil" value={cp.phi_h} onChange={v => setCp('phi_h', v)} onFocus={() => setFocused('ccp')} options={BITOLA_FLEX} />
            <Field label="c/" value={cp.s_h} onChange={v => setCp('s_h', v)} onFocus={() => setFocused('ccp')} suffix="cm" />
            <Field label="A. Ver. Ø" helpKey="phil" value={cp.phi_v} onChange={v => setCp('phi_v', v)} onFocus={() => setFocused('ccp')} options={BITOLA_FLEX} />
            <Field label="c/" value={cp.s_v} onChange={v => setCp('s_v', v)} onFocus={() => setFocused('ccp')} suffix="cm" />
          </div>
          <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 4}}>
            Barras inferiores que cruzam cada face do pilar. Necessário{' '}
            <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>
              A<sub>s</sub> ≥ {AsNec === null ? '—' : AsNec.toFixed(2) + ' cm²'}
            </span>{' '}
            (= F<sub>Sd</sub>/f<sub>yd</sub>) · disponível por face{' '}
            <span className="mono" style={{color: passa === false ? 'var(--err)' : 'var(--blue-900)', fontWeight:600}}>
              {gov === null ? '—' : gov.toFixed(2) + ' cm²'}
            </span>
            {passa === false && ' — não atende'}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 5: Studs ─────────────────────────────────────────
function StepStuds({ data, set, active, onActivate, setFocused, errs, derived, locked, unlockReason }) {
  const tipoArm = data.tipoArm === 'estribo' || data.tipoArm === 'conector' ? data.tipoArm : null;
  const summary = data.studs?.phi
    ? [{ lbl: 'Tipo', val: tipoArm === 'estribo' ? 'Estribo' : tipoArm === 'conector' ? 'Conector' : '—' }, { lbl: 'Ø', val: `${data.studs.phi} mm` }, { lbl: 'nconec', val: data.studs.nconec }, { lbl: 'ncam', val: data.studs.ncam }]
    : [];
  const phiMax = derived?.h ? (derived.h / 2) : null; // Ø ≤ h/20 in mm: h/20*10
  const phiMaxMm = derived?.h ? (derived.h * 10 / 20) : null;

  // fywd ao vivo (item 19.4.2): base 250 (estribo) ou 300 (conector) → 435 MPa
  const fywdBase = tipoArm === 'estribo' ? 250 : tipoArm === 'conector' ? 300 : null;
  const hLaje = derived?.h;
  const fywdLive = hLaje && fywdBase
    ? (hLaje <= 15 ? fywdBase : hLaje >= 35 ? 435 : fywdBase + (hLaje - 15) * (435 - fywdBase) / 20)
    : null;

  // Espaçamentos: limites e valores adotados
  const dd = derived?.d;
  const lim = {
    s0: dd ? (0.5 * dd).toFixed(2) : '',
    sr: dd ? (0.75 * dd).toFixed(2) : '',
    se: dd ? (2 * dd).toFixed(2) : '',
  };
  const esp = data.espac || {};
  const setEsp = (k, v) => {
    const next = { ...esp, [k]: v === '' ? null : v };
    const vazio = !Number.isFinite(next.s0) && !Number.isFinite(next.sr) && !Number.isFinite(next.se);
    set({ espac: vazio ? null : next });
  };
  // Tolerância de 0,005 cm: adotar exatamente o limite exibido (arredondado a
  // 2 casas) é válido — sem isso, digitar 6,63 para um limite de 6,625 acusava
  // "6,63 excede 6,63".
  const TOL_ESP = 0.005;
  const erroS0 = dd && esp.s0 > 0.5 * dd + TOL_ESP ? `Excede 0,5·d = ${lim.s0} cm` : null;
  const erroSr = dd && esp.sr > 0.75 * dd + TOL_ESP ? `Excede 0,75·d = ${lim.sr} cm` : null;
  const erroSe = dd && esp.se > 2 * dd + TOL_ESP ? `Excede 2·d = ${lim.se} cm` : null;

  // p e u3 ao vivo
  const s0Eff = Number.isFinite(esp.s0) && esp.s0 > 0 ? esp.s0 : (dd ? 0.5 * dd : null);
  const srEff = Number.isFinite(esp.sr) && esp.sr > 0 ? esp.sr : (dd ? 0.75 * dd : null);
  const ncam = data.studs?.ncam;
  const pDist = s0Eff && srEff && ncam >= 1 ? s0Eff + (ncam - 1) * srEff : null;
  const u1Live = data.secao === 'circular'
    ? (data.diam > 0 ? Math.PI * data.diam : null)
    : (data.C1 > 0 && data.C2 > 0 ? 2 * (data.C1 + data.C2) : null);
  const u3calc = u1Live && dd && pDist ? u1Live + 2 * Math.PI * (2 * dd + pDist) : null;

  return (
    <StepCard id="step-studs" n={5} title="Armadura de punção" active={active} done={!!data.studs?.phi && active === false} locked={locked && !active} summary={summary} onClick={onActivate}>
      {locked && (
        <div className="callout" style={{marginBottom: 8}}>
          🔒 Esta etapa é ativada após o cálculo indicar necessidade de armadura de punção.
        </div>
      )}
      <div>
        <div className="subhead">Tipo de armadura transversal</div>
        <div className="radio-cards">
          <label className="radio-card">
            <input type="radio" name="tipoArm" checked={tipoArm === 'conector'} onChange={() => set({ tipoArm: 'conector' })} />
            <svg className="sketch" viewBox="0 0 32 22"><line x1="16" y1="4" x2="16" y2="18" stroke="#3b465a" strokeWidth="2"/><line x1="10" y1="4" x2="22" y2="4" stroke="#3b465a" strokeWidth="2.5"/><line x1="10" y1="18" x2="22" y2="18" stroke="#3b465a" strokeWidth="2.5"/></svg>
            Conector (stud)
          </label>
          <label className="radio-card">
            <input type="radio" name="tipoArm" checked={tipoArm === 'estribo'} onChange={() => set({ tipoArm: 'estribo' })} />
            <svg className="sketch" viewBox="0 0 32 22"><rect x="9" y="5" width="14" height="12" rx="2" fill="none" stroke="#3b465a" strokeWidth="1.6"/></svg>
            Estribo
          </label>
        </div>
        <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 4}}>
          f<sub>ywd</sub> = <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{fywdLive ? fywdLive.toFixed(1) + ' MPa' : '—'}</span>
          {' '}<HelpDot k="tipoArm" /> {fywdBase ? <>(base {fywdBase} MPa → 435 MPa conforme h)</> : <>(escolha o tipo de armadura)</>}
        </div>
      </div>
      <div className="grid-3">
        <Field
          label="Ø do conector"
          helpKey="stud_phi"
          value={data.studs?.phi}
          onChange={v => set({ studs: { ...(data.studs||{}), phi: v }})}
          onFocus={() => setFocused('stud_phi')}
          options={BITOLA_STUD}
        />
        <Field
          label="n<sub>conec</sub>"
          helpKey="nconec"
          value={data.studs?.nconec}
          onChange={v => set({ studs: { ...(data.studs||{}), nconec: v }})}
          onFocus={() => setFocused('nconec')}
         
        />
        <Field
          label="n<sub>cam</sub>"
          helpKey="ncam"
          value={data.studs?.ncam}
          onChange={v => set({ studs: { ...(data.studs||{}), ncam: v }})}
          onFocus={() => setFocused('ncam')}
         
        />
      </div>

      <AutoArmadura data={data} set={set} />

      <div>
        <div className="subhead">Espaçamentos — limite normativo e valor adotado</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, fontSize: 11.5, color: 'var(--slate-600)', marginBottom: 8}}>
          <LimiteChip titulo="s₀ ≤ 0,5·d" val={derived?.d ? 0.5*derived.d : null} />
          <LimiteChip titulo="sr ≤ 0,75·d" val={derived?.d ? 0.75*derived.d : null} />
          <LimiteChip titulo="se ≤ 2·d" val={derived?.d ? 2*derived.d : null} />
        </div>
        <div className="grid-3">
          <Field label="s<sub>0</sub> adotado" helpKey="s0" value={esp.s0} onChange={v => setEsp('s0', v)} onFocus={() => setFocused('s0')} placeholder={lim.s0} step="0.5" suffix="cm" error={erroS0} />
          <Field label="s<sub>r</sub> adotado" helpKey="sr" value={esp.sr} onChange={v => setEsp('sr', v)} onFocus={() => setFocused('sr')} placeholder={lim.sr} step="0.5" suffix="cm" error={erroSr} />
          <Field label="s<sub>e</sub> adotado" helpKey="se" value={esp.se} onChange={v => setEsp('se', v)} onFocus={() => setFocused('se')} placeholder={lim.se} step="0.5" suffix="cm" error={erroSe} />
        </div>
        <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 4}}>
          Em branco, adota-se o próprio limite. p (pilar → última camada) = s₀ + (n<sub>cam</sub>−1)·s<sub>r</sub> ={' '}
          <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{pDist ? pDist.toFixed(2) + ' cm' : '—'}</span>
        </div>
      </div>

      <div>
        <div className="subhead">Contorno C″ (opcional)</div>
        <Field label="u<sub>3</sub> medido em CAD" helpKey="u3" value={data.u3_manual} onChange={v => set({ u3_manual: v === '' ? null : v })} onFocus={() => setFocused('u3')} placeholder={u3calc ? u3calc.toFixed(2) : 'calculado'} step="0.01" suffix="cm" />
        <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 4}}>
          Em branco, usa-se u₃ = u₁ + 2π·(2d + p) ={' '}
          <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{u3calc ? u3calc.toFixed(2) + ' cm' : '—'}</span>
          {' '}(cantos arredondados). Um contorno poligonal medido em CAD resulta ligeiramente menor.
        </div>
      </div>

      {phiMaxMm && data.studs?.phi && data.studs.phi > phiMaxMm && (
        <div className="field-error">⚠ Ø do conector excede o limite h/20 = {phiMaxMm.toFixed(1)} mm.</div>
      )}

      <div className="helper">
        <HelperStuds secao={data.secao} C1={data.C1} C2={data.C2} diam={data.diam} d={derived?.d} nconec={data.studs?.nconec || 8} ncam={data.studs?.ncam || 2} />
        <div className="lbl">
          <b>Roseta radial</b> de studs ao redor do pilar.<br/>
          <span className="mono">nconec</span> = studs por camada · <span className="mono">ncam</span> = camadas radiais.
        </div>
      </div>
    </StepCard>
  );
}

// Botão que resolve a armadura em vez de o projetista arbitrá-la.
// Primeiro a etapa 8 (contorno C′) define n_conec; depois, com esse n_conec,
// a etapa 9 (contorno C″) acrescenta camadas até passar. A bitola continua
// sendo escolha de quem projeta.
function AutoArmadura({ data, set }) {
  const [res, setRes] = useStateS(null);
  const podeRodar = data.studs?.phi > 0 && !!data.tipoArm;

  const rodar = () => {
    const r = window.dimensionarArmadura(data);
    setRes(r);
    if (r.ok) set({ studs: { ...(data.studs || {}), nconec: r.nconec, ncam: r.ncam } });
  };

  // Uma roseta muito grande passa nas contas mas não se constrói: avisa.
  const exagerado = res?.ok && (res.ncam > 6 || res.nconec > 20);
  // última tentativa de cada etapa = a que definiu o valor adotado
  const ult = etapa => res?.tentativas?.filter(t => t.etapa === etapa).pop();
  const t8 = ult(8), t9 = ult(9);
  const n3 = v => Number.isFinite(v) ? v.toFixed(3).replace('.', ',') : '—';
  const n2 = v => Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '—';

  return (
    <div className="auto-arm">
      <div className="auto-arm-topo">
        <button className="btn btn-sm btn-primary" disabled={!podeRodar} onClick={rodar}>
          Selecionar automaticamente
        </button>
        <span className="auto-arm-nota">
          {podeRodar
            ? <>Define o menor n<sub>conec</sub> que atende C′ e, com ele, acrescenta camadas até C″ passar.</>
            : <>Escolha primeiro o tipo de armadura e a bitola do conector.</>}
        </span>
      </div>
      {res && !res.ok && (
        <div className="callout" style={{marginTop: 8}}>
          {res.texto || 'Não foi possível dimensionar automaticamente.'}
        </div>
      )}
      {res?.ok && (
        <div style={{fontSize: 11.5, color: 'var(--slate-600)', marginTop: 6}}>
          Adotado: <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>
            Ø{res.phi} · n<sub>conec</sub> = {res.nconec} · n<sub>cam</sub> = {res.ncam}
          </span>{' '}
          após {res.tentativas.length} tentativas.
          <div style={{marginTop: 4}}>
            1. Etapa 8 (C′): n<sub>conec</sub> = {res.nconec} → τ<sub>Rd3</sub> = {n3(t8?.tauRd)} ≥ τ<sub>Sd</sub> = {n3(t8?.tauSd)} MPa
          </div>
          <div>
            2. Etapa 9 (C″), com {res.nconec} conectores: n<sub>cam</sub> = {res.ncam} → τ<sub>Sd</sub> = {n3(t9?.tauSd)} ≤ τ<sub>Rd1</sub> = {n3(t9?.tauRd)} MPa
          </div>
          {res.seExcedido && (
            <div className="field-error" style={{marginTop: 4}}>
              ⚠ Na última camada, s<sub>e</sub> = {n2(res.se_real)} cm &gt; 2d = {n2(res.se_lim)} cm.
              O n<sub>conec</sub> da etapa 8 foi mantido — aumente-o à mão, aumente a bitola ou reduza s<sub>r</sub>.
            </div>
          )}
          {exagerado && (
            <div className="field-error" style={{marginTop: 4}}>
              ⚠ Arranjo pouco construtivo ({res.nconec}×{res.ncam} = {res.nconec * res.ncam} conectores).
              Aumente a bitola do conector, reduza s<sub>r</sub>, ou reveja a espessura da laje.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LimiteChip({ titulo, val }) {
  return (
    <div style={{background:'var(--paper-2)', padding:'8px 10px', borderRadius: 6, border:'1px solid var(--line)'}}>
      <div style={{color:'var(--slate-500)', fontSize: 10.5, textTransform:'uppercase', letterSpacing: '0.06em', marginBottom: 2}}>{titulo}</div>
      <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{Number.isFinite(val) ? val.toFixed(2) : '—'} cm</span>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────
function isStepDone(n, data) {
  if (n === 1) return data.posicao && ((data.secao === 'retangular' && data.C1 > 0 && data.C2 > 0) || (data.secao === 'circular' && data.diam > 0));
  if (n === 2) return Number.isFinite(data.Fsk) && data.Fsk !== 0;
  if (n === 3) return data.h > 0 && data.fck > 0 && data.fyk > 0;
  if (n === 4) return data.cobrimento > 0 && (data.camadaExterna === 'x' || data.camadaExterna === 'y') && data.phi_lx > 0 && data.phi_ly > 0 && data.s_x > 0 && data.s_y > 0;
  return false;
}

window.StepPilar = StepPilar;
window.StepCargas = StepCargas;
window.StepLaje = StepLaje;
window.StepArmaduras = StepArmaduras;
window.StepStuds = StepStuds;
window.isStepDone = isStepDone;

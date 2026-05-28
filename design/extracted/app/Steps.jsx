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
  phiw: { title: 'Estribo Øw', body: 'Diâmetro do estribo (armadura transversal de flexão) em mm.', ref: 'NBR 6118 · 18.4.3' },
  phil: { title: 'Barra de flexão Øl', body: 'Diâmetro da barra longitudinal de flexão da laje em mm.', ref: 'NBR 6118 · 20.1' },
  s: { title: 'Espaçamento s', body: 'Espaçamento entre barras de flexão na direção considerada (cm).', ref: 'NBR 6118 · 20.1' },
  stud_phi: { title: 'Diâmetro do conector', body: 'Diâmetro do conector de cisalhamento (stud) em mm. Limite Ø ≤ h/20.', ref: 'NBR 6118 · 19.4.2' },
  nconec: { title: 'Conectores por camada', body: 'Quantidade de studs em cada camada radial (geralmente 8 ou 12).', ref: 'NBR 6118 · 19.5.3.3' },
  ncam: { title: 'Número de camadas', body: 'Quantidade de camadas radiais de studs ao redor do pilar.', ref: 'NBR 6118 · 19.5.3.3' },
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
function StepCard({ n, title, active, done, locked, summary, onClick, children }) {
  return (
    <div className={"step-card" + (active ? ' active' : '') + (done ? ' done' : '') + (locked ? ' locked' : '') + (!active && !locked ? ' collapsed' : '')}>
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
  const summary = data.secao === 'circular'
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

      {data.secao === 'retangular' ? (
        <div className="grid-2">
          <Field label="C<sub>1</sub>" helpKey="C1" value={data.C1} onChange={v => set({ C1: v })} onFocus={() => setFocused('C1')} placeholder="40" suffix="cm" error={errs.C1} />
          <Field label="C<sub>2</sub>" helpKey="C2" value={data.C2} onChange={v => set({ C2: v })} onFocus={() => setFocused('C2')} placeholder="25" suffix="cm" error={errs.C2} />
        </div>
      ) : (
        <Field label="Diâmetro Ø" helpKey="diam" value={data.diam} onChange={v => set({ diam: v })} onFocus={() => setFocused('diam')} placeholder="50" suffix="cm" error={errs.diam} />
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
          A excentricidade da força gera tensões adicionais no perímetro crítico.
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
        <Field label="F<sub>sk</sub>" helpKey="Fsk" value={data.Fsk} onChange={v => set({ Fsk: v })} onFocus={() => setFocused('Fsk')} placeholder="185" suffix="kN" error={errs.Fsk} />
        <Field label="M<sub>xk</sub>" helpKey="Mxk" value={data.Mxk} onChange={v => set({ Mxk: v })} onFocus={() => setFocused('Mxk')} placeholder="8100" suffix="kN·cm" error={errs.Mxk} />
        <Field label="M<sub>yk</sub>" helpKey="Myk" value={data.Myk} onChange={v => set({ Myk: v })} onFocus={() => setFocused('Myk')} placeholder="5400" suffix="kN·cm" error={errs.Myk} />
      </div>
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
        <Field label="h" helpKey="h" value={data.h} onChange={v => set({ h: v })} onFocus={() => setFocused('h')} placeholder="17" suffix="cm" error={errs.h} />
        <Field label="f<sub>ck</sub>" helpKey="fck" value={data.fck} onChange={v => set({ fck: v })} onFocus={() => setFocused('fck')} placeholder="40" suffix="MPa" error={errs.fck} />
        <Field label="f<sub>yk</sub>" helpKey="fyk" value={data.fyk} onChange={v => set({ fyk: v })} onFocus={() => setFocused('fyk')} placeholder="500" suffix="MPa" error={errs.fyk} />
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
  const summary = [
    { lbl: 'c', val: `${data.cobrimento || '—'} cm` },
    { lbl: 'Øw', val: `${data.phiw_x || '—'} / ${data.phiw_y || '—'} mm` },
    { lbl: 'Øℓx', val: `Ø${data.phi_lx || '—'} @ ${data.s_x || '—'}` },
    { lbl: 'Øℓy', val: `Ø${data.phi_ly || '—'} @ ${data.s_y || '—'}` },
  ];
  return (
    <StepCard n={4} title="Armaduras da laje" active={active} done={isStepDone(4, data)} summary={summary} onClick={onActivate}>
      <div>
        <div className="subhead">Cobrimento</div>
        <div className="grid-3">
          <Field label="Cobrimento c" helpKey="cobrimento" value={data.cobrimento} onChange={v => set({ cobrimento: v })} onFocus={() => setFocused('cobrimento')} placeholder="2,5" step="0.1" suffix="cm" error={errs.cobrimento} />
          <Field label="Estribo Ø<sub>w,x</sub>" helpKey="phiw" value={data.phiw_x} onChange={v => set({ phiw_x: v })} onFocus={() => setFocused('phiw_x')} options={BITOLA_ESTRIBO} error={errs.phiw_x} />
          <Field label="Estribo Ø<sub>w,y</sub>" helpKey="phiw" value={data.phiw_y} onChange={v => set({ phiw_y: v })} onFocus={() => setFocused('phiw_y')} options={BITOLA_ESTRIBO} error={errs.phiw_y} />
        </div>
      </div>
      <div>
        <div className="subhead">Armadura de flexão · direção x</div>
        <div className="grid-2">
          <Field label="Bitola Ø<sub>ℓx</sub>" helpKey="phil" value={data.phi_lx} onChange={v => set({ phi_lx: v })} onFocus={() => setFocused('phi_lx')} options={BITOLA_FLEX} error={errs.phi_lx} />
          <Field label="Espaçamento s<sub>x</sub>" helpKey="s" value={data.s_x} onChange={v => set({ s_x: v })} onFocus={() => setFocused('s_x')} placeholder="15" suffix="cm" error={errs.s_x} />
        </div>
      </div>
      <div>
        <div className="subhead">Armadura de flexão · direção y</div>
        <div className="grid-2">
          <Field label="Bitola Ø<sub>ℓy</sub>" helpKey="phil" value={data.phi_ly} onChange={v => set({ phi_ly: v })} onFocus={() => setFocused('phi_ly')} options={BITOLA_FLEX} error={errs.phi_ly} />
          <Field label="Espaçamento s<sub>y</sub>" helpKey="s" value={data.s_y} onChange={v => set({ s_y: v })} onFocus={() => setFocused('s_y')} placeholder="15" suffix="cm" error={errs.s_y} />
        </div>
      </div>
      <div className="helper">
        <HelperArmaduras h={data.h} cobrimento={data.cobrimento} phiw_x={data.phiw_x} phiw_y={data.phiw_y} phi_lx={data.phi_lx} phi_ly={data.phi_ly} dx={derived?.dx} dy={derived?.dy} />
        <div className="lbl">
          <b>Sequência de camadas:</b> cobrimento → estribo x → barra x → estribo y → barra y.<br/>
          A altura útil <b>d</b> = (dx + dy)/2 ={' '}
          <span className="mono" style={{color: 'var(--blue-900)', fontWeight: 600}}>{derived?.d ? derived.d.toFixed(2) : '—'} cm</span>.
        </div>
      </div>
    </StepCard>
  );
}

// ── Step 5: Studs ─────────────────────────────────────────
function StepStuds({ data, set, active, onActivate, setFocused, errs, derived, locked, unlockReason }) {
  const summary = data.studs?.phi
    ? [{ lbl: 'Ø', val: `${data.studs.phi} mm` }, { lbl: 'nconec', val: data.studs.nconec }, { lbl: 'ncam', val: data.studs.ncam }]
    : [];
  const phiMax = derived?.h ? (derived.h / 2) : null; // Ø ≤ h/20 in mm: h/20*10
  const phiMaxMm = derived?.h ? (derived.h * 10 / 20) : null;

  return (
    <StepCard n={5} title="Armadura de punção · studs" active={active} done={!!data.studs?.phi && active === false} locked={locked && !active} summary={summary} onClick={onActivate}>
      {locked && (
        <div className="callout" style={{marginBottom: 8}}>
          🔒 Esta etapa é ativada após o cálculo indicar necessidade de armadura de punção.
        </div>
      )}
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
          placeholder="8"
        />
        <Field
          label="n<sub>cam</sub>"
          helpKey="ncam"
          value={data.studs?.ncam}
          onChange={v => set({ studs: { ...(data.studs||{}), ncam: v }})}
          onFocus={() => setFocused('ncam')}
          placeholder="3"
        />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, fontSize: 11.5, color: 'var(--slate-600)'}}>
        <div style={{background:'var(--paper-2)', padding:'8px 10px', borderRadius: 6, border:'1px solid var(--line)'}}>
          <div style={{color:'var(--slate-500)', fontSize: 10.5, textTransform:'uppercase', letterSpacing: '0.06em', marginBottom: 2}}>s₀ ≤ 0,5·d</div>
          <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{derived?.d ? (0.5*derived.d).toFixed(2) : '—'} cm</span>
        </div>
        <div style={{background:'var(--paper-2)', padding:'8px 10px', borderRadius: 6, border:'1px solid var(--line)'}}>
          <div style={{color:'var(--slate-500)', fontSize: 10.5, textTransform:'uppercase', letterSpacing: '0.06em', marginBottom: 2}}>sr ≤ 0,75·d</div>
          <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{derived?.d ? (0.75*derived.d).toFixed(2) : '—'} cm</span>
        </div>
        <div style={{background:'var(--paper-2)', padding:'8px 10px', borderRadius: 6, border:'1px solid var(--line)'}}>
          <div style={{color:'var(--slate-500)', fontSize: 10.5, textTransform:'uppercase', letterSpacing: '0.06em', marginBottom: 2}}>se = 2·d</div>
          <span className="mono" style={{color:'var(--blue-900)', fontWeight:600}}>{derived?.d ? (2*derived.d).toFixed(2) : '—'} cm</span>
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

// ── helpers ───────────────────────────────────────────────
function isStepDone(n, data) {
  if (n === 1) return data.posicao && ((data.secao === 'retangular' && data.C1 > 0 && data.C2 > 0) || (data.secao === 'circular' && data.diam > 0));
  if (n === 2) return data.Fsk > 0;
  if (n === 3) return data.h > 0 && data.fck > 0 && data.fyk > 0;
  if (n === 4) return data.cobrimento > 0 && data.phiw_x > 0 && data.phiw_y > 0 && data.phi_lx > 0 && data.phi_ly > 0 && data.s_x > 0 && data.s_y > 0;
  return false;
}

window.StepPilar = StepPilar;
window.StepCargas = StepCargas;
window.StepLaje = StepLaje;
window.StepArmaduras = StepArmaduras;
window.StepStuds = StepStuds;
window.isStepDone = isStepDone;

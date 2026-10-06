/* global React, ReactDOM, calcularPuncao */
const { useState, useEffect, useMemo, useRef } = React;

// ============================================================
//  App — main composition
// ============================================================

// Formulário em branco: nenhuma seção, camada ou tipo de armadura vem
// escolhido de antemão — quem projeta informa tudo. O caso de referência
// (Atividade 1, Master PEC IBRACON) fica em scripts/caso-referencia.js,
// usado pelos testes automatizados.
const DEFAULT_DATA = {
  secao: null,
  posicao: 'centro',   // única posição disponível por ora
  C1: null, C2: null, diam: null,
  Fsk: null, Mxk: null, Myk: null,
  h: null, fck: null, fyk: null,
  cobrimento: null,
  camadaExterna: null,
  phi_lx: null, s_x: null,
  phi_ly: null, s_y: null,
  studs: null,
  tipoArm: null,
  espac: null,
  u3_manual: null,
  axial: null,   // { ativo, Nsdx, Nsdy, Ac } — compressão axial (σcp)
  ccp: null,     // { ativo, phi_h, s_h, phi_v, s_v } — colapso progressivo
};

const STEP_TITLES = ['Pilar', 'Cargas', 'Laje', 'Armaduras', 'Studs', 'Resultados'];

function App() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('puncao_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_DATA;
  });
  const [projectName, setProjectName] = useState(() => localStorage.getItem('puncao_name') || '');
  const [activeStep, setActiveStep] = useState(1);
  const [focused, setFocused] = useState(null);
  const [view, setView] = useState('3d');
  const [layers, setLayers] = useState({
    concreto: true, armadura: true, studs: true, perimetros: true, forcas: true, cone: true,
  });
  const [results, setResults] = useState(null);
  const [calculated, setCalculated] = useState(false);

  // persist
  useEffect(() => { localStorage.setItem('puncao_data', JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem('puncao_name', projectName); }, [projectName]);

  const set = (patch) => setData(d => ({ ...d, ...patch }));

  // ── arquivo ──────────────────────────────────────────────
  const salvarCaso = () =>
    window.salvarArquivo(projectName, JSON.stringify({ projectName, data }, null, 2), {
      name: 'Caso PunçãoAcad', extensions: ['json'], mime: 'application/json',
    });

  const carregarCaso = async () => {
    const txt = await window.abrirArquivo({ name: 'Caso PunçãoAcad', extensions: ['json'] });
    if (!txt) return;
    try {
      const obj = JSON.parse(txt);
      if (obj.data) setData(obj.data);
      if (obj.projectName) setProjectName(obj.projectName);
    } catch {}
  };

  const limparCaso = () => {
    setData(DEFAULT_DATA); setProjectName(''); setResults(null); setCalculated(false); setActiveStep(1);
  };

  // Derived geometry (for helper diagrams that need d/dx/dy live).
  // Mesma convenção de camadas sobrepostas usada em calc.js.
  const derived = useMemo(() => {
    const { h, cobrimento, phi_lx, phi_ly, camadaExterna } = data;
    if (![h, cobrimento, phi_lx, phi_ly].every(v => Number.isFinite(v) && v > 0)) return { h };
    const lx = phi_lx / 10, ly = phi_ly / 10;
    const extY = camadaExterna !== 'x';
    const dy = extY ? h - cobrimento - ly/2 : h - cobrimento - lx - ly/2;
    const dx = extY ? h - cobrimento - ly - lx/2 : h - cobrimento - lx/2;
    return { h, dx, dy, d: (dx + dy) / 2 };
  }, [data.h, data.cobrimento, data.phi_lx, data.phi_ly, data.camadaExterna]);

  // Validate per-field errors (light)
  const errs = useMemo(() => {
    const e = {};
    if (data.h && data.cobrimento && derived.d && derived.d <= 0) e.h = 'd resultante ≤ 0';
    if (data.studs?.phi && data.h && data.studs.phi > data.h * 10 / 20) e.stud_phi = 'Excede h/20';
    return e;
  }, [data, derived]);

  // Whether step 5 should be enabled (only if results say armadura is needed)
  const needsStuds = !!results && results.precisaArm;
  // We allow editing the studs section preemptively too: lock only before any calc & no result yet
  const step5Locked = !calculated || !needsStuds;

  // Calculate
  const doCalculate = () => {
    const R = calcularPuncao({
      secao: data.secao,
      C1: data.C1, C2: data.C2, diam: data.diam,
      Fsk: data.Fsk, Mxk: data.Mxk || 0, Myk: data.Myk || 0,
      h: data.h, fck: data.fck, fyk: data.fyk,
      cobrimento: data.cobrimento,
      camadaExterna: data.camadaExterna || 'y',
      phi_lx: data.phi_lx, phi_ly: data.phi_ly,
      s_x: data.s_x, s_y: data.s_y,
      studs: data.tipoArm && data.studs?.phi && data.studs?.nconec && data.studs?.ncam ? data.studs : null,
      tipoArm: data.tipoArm || 'estribo',
      espac: data.espac || null,
      u3_manual: data.u3_manual || null,
      axial: data.axial?.ativo ? data.axial : null,
      ccp: data.ccp?.ativo ? data.ccp : null,
    });
    setResults(R);
    setCalculated(true);
    setActiveStep(6);
    // smooth scroll to results
    setTimeout(() => {
      const rs = document.getElementById('results-anchor');
      if (rs) rs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Leva o usuário de fato até os campos da armadura de punção: abre a etapa 5,
  // rola a janela até o formulário, rola a coluna do formulário até o card e
  // põe o foco no primeiro campo (Ø do conector).
  // ── comandos vindos da barra de menus do app ─────────────
  // Registrado uma vez; usa refs para não recriar o listener a
  // cada tecla digitada nos formulários.
  const acoesRef = useRef(null);
  acoesRef.current = {
    novo:      limparCaso,
    salvar:    salvarCaso,
    carregar:  carregarCaso,
    calcular:  () => { if (allRequired) doCalculate(); },
    pdf:       () => { if (calculated) window.exportarPDF(projectName); },
    dxf:       () => { if (calculated && results && !results.error) baixarDXF(results, projectName); },
    imprimir:  () => { if (calculated) window.print(); },
  };

  useEffect(() => {
    if (!window.puncaoAPI) return;
    window.puncaoAPI.aoComandoDoMenu(comando => acoesRef.current[comando]?.());
  }, []);

  const onConfigurarStuds = () => {
    setActiveStep(5);
    setTimeout(() => {
      const card = document.getElementById('step-studs');
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // foca o Ø do conector (primeiro campo do bloco de características),
      // não o radio de tipo de armadura que abre o card
      const primeiro = card.querySelector('.grid-3 select, .grid-3 input')
        || card.querySelector('select, input');
      if (primeiro) {
        // espera a rolagem assentar antes de focar, senão o browser salta
        setTimeout(() => primeiro.focus({ preventScroll: true }), 420);
      }
      card.classList.add('destacado');
      setTimeout(() => card.classList.remove('destacado'), 1600);
    }, 80);
  };

  // Compute all "step done" flags
  const stepsDone = [1,2,3,4].map(i => isStepDone(i, data));
  const allRequired = stepsDone.every(Boolean);

  // Perímetro u1 ao vivo (circular: π·Ø; retangular: 2·C1 + 2·C2)
  const u1Live = data.secao === 'circular'
    ? (data.diam > 0 ? Math.PI * data.diam : null)
    : (data.C1 > 0 && data.C2 > 0 ? 2 * data.C1 + 2 * data.C2 : null);

  // Build viewer data
  const viewerData = useMemo(() => ({
    ...data,
    d: derived.d, dx: derived.dx, dy: derived.dy,
  }), [data, derived]);

  return (
    <>
    <div className="app">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"></div>
          <span className="brand-title">PunçãoAcad</span>
          <span className="brand-sub">ABNT NBR 6118:2026 · pilar interno</span>
        </div>
        <input className="project-name" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nome do projeto" aria-label="Nome do projeto" />
        <div className="topbar-spacer"></div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-ghost" onClick={limparCaso}>
            Limpar
          </button>
          <button className="btn btn-sm" onClick={salvarCaso}>
            <Ico name="download"/> Salvar caso
          </button>
          <button className="btn btn-sm" onClick={carregarCaso}>
            Carregar
          </button>
          <button className="btn btn-sm btn-primary" disabled={!allRequired} onClick={doCalculate}>
            Calcular
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div className="workspace">
        {/* LEFT: form */}
        <div className="form-col">
          <Stepper activeStep={activeStep} stepsDone={stepsDone} onJump={(n) => setActiveStep(n)} needsStuds={needsStuds} />
          <div className="form-scroll">
            <StepPilar
              data={data} set={set}
              active={activeStep === 1}
              onActivate={() => setActiveStep(1)}
              setFocused={setFocused}
              errs={errs}
            />
            <StepCargas
              data={data} set={set}
              active={activeStep === 2}
              onActivate={() => setActiveStep(2)}
              setFocused={setFocused}
              errs={errs}
            />
            <StepLaje
              data={data} set={set}
              active={activeStep === 3}
              onActivate={() => setActiveStep(3)}
              setFocused={setFocused}
              errs={errs}
            />
            <StepArmaduras
              data={data} set={set}
              active={activeStep === 4}
              onActivate={() => setActiveStep(4)}
              setFocused={setFocused}
              errs={errs}
              derived={derived}
            />
            <StepStuds
              data={data} set={set}
              active={activeStep === 5}
              onActivate={() => !step5Locked && setActiveStep(5)}
              setFocused={setFocused}
              errs={errs}
              derived={derived}
              locked={step5Locked}
            />

            <button className="calc-button" disabled={!allRequired} onClick={doCalculate}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 9h3M9 11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              {allRequired ? 'Calcular dimensionamento' : 'Preencha os campos das etapas 1–4 para calcular'}
            </button>
          </div>
        </div>

        {/* RIGHT: viewer */}
        <div className="viewer-col">
          <div className="viewer-shell">
            <div className="viewer-toolbar">
              <div className="view-tabs">
                {['3d','planta','corteX','corteY'].map(v => (
                  <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                    {v === '3d' ? 'Vista 3D' : v === 'planta' ? 'Planta' : v === 'corteX' ? 'Corte X-X' : 'Corte Y-Y'}
                  </button>
                ))}
              </div>
              <div className="layer-toggles">
                <LayerToggle on={layers.concreto} onClick={() => setLayers(l => ({...l, concreto: !l.concreto}))}>Concreto</LayerToggle>
                <LayerToggle on={layers.armadura} swatch="steel" onClick={() => setLayers(l => ({...l, armadura: !l.armadura}))}>Flexão</LayerToggle>
                <LayerToggle on={layers.studs} swatch="steel" onClick={() => setLayers(l => ({...l, studs: !l.studs}))}>Studs</LayerToggle>
                <LayerToggle on={layers.perimetros} swatch="red" onClick={() => setLayers(l => ({...l, perimetros: !l.perimetros}))}>Perímetros</LayerToggle>
                <LayerToggle on={layers.forcas} onClick={() => setLayers(l => ({...l, forcas: !l.forcas}))}>Forças</LayerToggle>
                <LayerToggle on={layers.cone} swatch="cone" onClick={() => setLayers(l => ({...l, cone: !l.cone}))}>Cone de punção</LayerToggle>
              </div>
            </div>
            <div className="viewer-canvas-wrap">
              <Viewer3D data={viewerData} view={view} layers={layers} highlight={focused} />
              <div className="viewer-legend">
                <b>Legenda</b>
                <div className="row"><span className="dashed" style={{borderTop:'2px dashed #d1402a'}}></span>C — u₁ (pilar)</div>
                <div className="row"><span className="dashed" style={{borderTop:'2px dashed #e08a13'}}></span>C′ — u₂ (a 2d)</div>
                {data.studs?.ncam && <div className="row"><span className="dashed" style={{borderTop:'2px dashed #c6a700'}}></span>C″ — u₃ (além da armadura)</div>}
                <div className="row"><span className="dot" style={{background:'#1d4499', opacity:0.4}}></span>Tronco de cone de ruptura</div>
              </div>
            </div>

            <div className="helper-rail">
              <HelperRailCard label="d (média)" val={derived.d ? derived.d.toFixed(2) + ' cm' : '—'} />
              <HelperRailCard label="u₁" val={u1Live ? u1Live.toFixed(1) + ' cm' : '—'} />
              <HelperRailCard label="u₂ (a 2d)" val={u1Live && derived.d ? (u1Live + 4*Math.PI*derived.d).toFixed(1) + ' cm' : '—'} />
              <HelperRailCard label="classe" val={data.fck ? `C${Math.round(data.fck)}` : '—'} />
              <HelperRailCard label="Fsd (γf=1,4)" val={data.Fsk ? (1.4*data.Fsk).toFixed(0) + ' kN' : '—'} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div id="results-anchor" />
      {calculated && <Results R={results} onConfigurarStuds={onConfigurarStuds} onExportar={() => window.exportarPDF(projectName)} projectName={projectName} />}
      {calculated && <Detalhamento R={results} />}

      {/* ── Footer ── */}
      <footer className="footer">
        PunçãoAcad · ABNT NBR 6118:2026 · Departamento de Engenharia Civil — UEM
      </footer>
    </div>

    {/* Documento de impressao: fica oculto na tela e e o unico conteudo
        enviado para o papel/PDF (ver @media print em styles.css). */}
    {calculated && <Relatorio R={results} projectName={projectName} />}
    </>
  );
}

function HelperRailCard({ label, val }) {
  return (
    <div className="helper-card">
      <div className="lbl">
        <small>{label}</small>
        <strong>{val}</strong>
      </div>
    </div>
  );
}

function LayerToggle({ on, onClick, children, swatch = '' }) {
  return (
    <button className={"layer-toggle" + (on ? ' on' : '')} onClick={onClick}>
      <span className={"swatch " + swatch}></span>
      {children}
    </button>
  );
}

// ── Top horizontal stepper ────────────────────────────────
function Stepper({ activeStep, stepsDone, onJump, needsStuds }) {
  const steps = [
    { n: 1, t: 'Pilar' },
    { n: 2, t: 'Cargas' },
    { n: 3, t: 'Laje' },
    { n: 4, t: 'Armaduras' },
    { n: 5, t: 'Studs', cond: true },
    { n: 6, t: 'Resultados' },
  ];
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const done = s.n <= 4 && stepsDone[s.n - 1];
        const active = activeStep === s.n;
        const locked = s.n === 5 && !needsStuds;
        return (
          <React.Fragment key={s.n}>
            <button
              className={"step-dot" + (active ? ' active' : '') + (done ? ' done' : '') + (locked ? ' locked' : '')}
              onClick={() => !locked && onJump(s.n)}
              style={{ background: 'transparent', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', padding: 0 }}
            >
              <span className="n">{done ? '✓' : s.n}</span>
              <span>{s.t}</span>
            </button>
            {i < steps.length - 1 && <span className={"step-sep" + (done ? ' done' : '')}></span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── boot ──────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

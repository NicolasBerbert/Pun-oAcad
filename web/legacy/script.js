const opcaoDesabilitar = document.getElementById ('desabilitar')
opcaoDesabilitar.disabled = true;

// ============================================================
//  PunçãoAcad – Rotina de Cálculo
//  Dimensionamento da armadura de punção – ABNT NBR 6118:2023
//  Pilar interno com momentos fletores nas duas direções
// ============================================================
//
//  ESTRUTURA DO SCRIPT:
//  1. Função principal: calcular()
//  2. Etapa 1 – Leitura e validação dos dados de entrada
//  3. Etapa 2 – Valores de cálculo (fcd, fyd, Fsd, Msd)
//  4. Etapa 3 – Perímetros de controle (u1 e u2)
//  5. Etapa 4 – Tensão resistente da armadura de punção (fywd)
//  6. Etapa 5 – Taxa de armadura passiva da laje (ρ)
//  7. Etapa 6 – Verificação no contorno C (esmagamento)
//  8. Etapa 7 – Verificação no contorno C' sem armadura
//  9. Etapa 8 – Verificação no contorno C' com armadura
// 10. Etapa 9 – Verificação no contorno C''
// 11. Funções auxiliares: interpolar k, exibir resultados
// ============================================================


// ------------------------------------------------------------
//  FUNÇÃO PRINCIPAL – chamada pelo botão "Calcular"
// ------------------------------------------------------------
function calcular() {

    // --------------------------------------------------------
    //  ETAPA 1 – LEITURA DOS DADOS DE ENTRADA
    //  Todos os valores são lidos do HTML e convertidos para
    //  as unidades do sistema de cálculo:
    //  comprimentos em cm, forças em kN, tensões em MPa
    // --------------------------------------------------------

    // -- Pilar --
    const C1 = parseFloat(document.getElementById("bpilar").value);  // cm – dimensão paralela à excentricidade em x
    const C2 = parseFloat(document.getElementById("hpilar").value);  // cm – dimensão paralela à excentricidade em y

    // -- Materiais --
    const fck  = parseFloat(document.getElementById("fck").value);   // MPa
    // fyk lido do HTML (campo id='fyk')

    // -- Laje --
    const h    = parseFloat(document.getElementById("hlaje").value); // cm – altura total
    // dx, dy e d são calculados internamente a partir de h, cobrimento, estribo e bitola

    // -- Resistência do aço (agora lida do HTML) --
    const fyk = parseFloat(document.getElementById("fyk").value);   // MPa

    // -- Armadura de flexão da laje --
    const cobrimento = parseFloat(document.getElementById("cobrimento").value); // cm
    const phiw_x     = parseFloat(document.getElementById("phiw_x").value);     // mm – estribo dir. x
    const phiw_y     = parseFloat(document.getElementById("phiw_y").value);     // mm – estribo dir. y
    const phi_lx     = parseFloat(document.getElementById("armadurah").value);  // mm – barra dir. x
    const s_x        = parseFloat(document.getElementById("espacamentoh").value); // cm
    const phi_ly     = parseFloat(document.getElementById("armadurav").value);  // mm – barra dir. y
    const s_y        = parseFloat(document.getElementById("espacamentov").value); // cm

    // -- Carregamentos característicos --
    const Fsk   = parseFloat(document.getElementById("fk").value);   // kN
    const Mk1x  = parseFloat(document.getElementById("mxk").value);  // kN.cm
    const Mk1y  = parseFloat(document.getElementById("myk").value);  // kN.cm

    // -- Momentos já inseridos em kN.cm – sem conversão necessária --
    const Mk1x_cm = Mk1x;  // kN.cm
    const Mk1y_cm = Mk1y;  // kN.cm


    // --------------------------------------------------------
    //  VALIDAÇÃO BÁSICA – verificar se todos os campos foram
    //  preenchidos antes de iniciar o cálculo
    // --------------------------------------------------------
    const entradas = [C1, C2, fck, fyk, h, cobrimento, phiw_x, phiw_y, phi_lx, s_x, phi_ly, s_y, Fsk, Mk1x, Mk1y];
    for (let val of entradas) {
        if (isNaN(val) || val <= 0) {
            alert("Atenção: preencha todos os campos corretamente antes de calcular.");
            return;
        }
    }


    // --------------------------------------------------------
    //  ETAPA 2 – VALORES DE CÁLCULO
    //  Coeficientes de ponderação conforme ABNT NBR 6118:
    //  γc = 1,4 (concreto)   γs = 1,15 (aço)   γf = 1,4 (ações)
    // --------------------------------------------------------

    const gammaC = 1.4;
    const gammaS = 1.15;
    const gammaF = 1.4;

    const fcd  = fck  / gammaC;                // MPa – resistência de cálculo do concreto
    const fyd  = fyk  / gammaS;                // MPa – resistência de cálculo do aço longitudinal
    const Fsd  = gammaF * Fsk;                 // kN  – força de punção de cálculo
    const Msd1x = gammaF * Mk1x_cm;            // kN.cm – momento de cálculo direção x
    const Msd1y = gammaF * Mk1y_cm;            // kN.cm – momento de cálculo direção y


    // --------------------------------------------------------
    //  ETAPA 3 – PERÍMETROS DE CONTROLE
    //
    //  Contorno C  (u1): perímetro do pilar
    //  u1 = 2·C1 + 2·C2
    //
    //  Contorno C' (u2): perímetro crítico a 2d do pilar
    //  u2 = u1 + 4·π·d
    // --------------------------------------------------------

    const u1 = 2 * C1 + 2 * C2;               // cm
    const u2 = u1 + 4 * Math.PI * d;          // cm


    // --------------------------------------------------------
    //  ETAPA 4 – TENSÃO RESISTENTE DA ARMADURA DE PUNÇÃO
    //  Item 19.4.2 da ABNT NBR 6118 – válido para studs
    //  Interpolação linear para lajes com 15 cm ≤ h ≤ 35 cm
    // --------------------------------------------------------

    let fywd;
    if (h <= 15) {
        fywd = 300;                            // MPa – limite inferior
    } else if (h >= 35) {
        fywd = 435;                            // MPa – limite superior (= fyd para CA-50)
    } else {
        // Interpolação linear entre 300 MPa (h=15cm) e 435 MPa (h=35cm)
        fywd = 300 + ((h - 15) * (435 - 300)) / (35 - 15);  // MPa
    }


    // --------------------------------------------------------
    //  ETAPA 5 – TAXA DE ARMADURA PASSIVA DA LAJE
    //
    //  A taxa ρ considera as barras que cruzam o perímetro
    //  crítico C' nas duas direções (região 3d + C + 3d)
    //
    //  ρ = √(ρx · ρy)   limitado a ρ ≤ 0,02
    // --------------------------------------------------------

    // ── Cálculo de dx e dy a partir do cobrimento, estribo e bitola das barras ──
    // Conforme ABNT NBR 6118 – figura do procedimento de cálculo
    // dx = h - c - φw_x - φlx/2
    // dy = h - c - φw_y - φly/2   (a camada y fica abaixo da x)
    const phiw_x_cm = phiw_x / 10;   // mm → cm
    const phiw_y_cm = phiw_y / 10;   // mm → cm
    const phi_lx_cm = phi_lx / 10;   // mm → cm
    const phi_ly_cm = phi_ly / 10;   // mm → cm

    const dx = h - cobrimento - phiw_x_cm - phi_lx_cm / 2;   // cm – altura útil dir. x
    const dy = h - cobrimento - phiw_y_cm - phi_ly_cm / 2;   // cm – altura útil dir. y
    const d  = (dx + dy) / 2;                                  // cm – altura útil média

    // ── Área de 1 barra ──
    const As1_x = Math.PI * phi_lx_cm * phi_lx_cm / 4;   // cm²
    const As1_y = Math.PI * phi_ly_cm * phi_ly_cm / 4;   // cm²

    // ── Número de barras na faixa (3d + C + 3d) em cada direção ──
    const qx = Math.floor((3*d + C1 + 3*d) / s_x);
    const qy = Math.floor((3*d + C2 + 3*d) / s_y);

    // ── Taxas de armadura ──
    const rox = (qx * As1_x) / (dx * (3*d + C1 + 3*d));   // decimal
    const roy = (qy * As1_y) / (dy * (3*d + C2 + 3*d));   // decimal
    const rho = Math.min(Math.sqrt(rox * roy), 0.02);      // taxa média ≤ 2%


    // --------------------------------------------------------
    //  ETAPA 6 – VERIFICAÇÃO NO CONTORNO C
    //  (Esmagamento da biela comprimida – item 19.5.3.1)
    //
    //  τRd2 = αv · fcd · 0,27
    //  αv   = 1 – fck/250
    //
    //  τSd no contorno C: não considera momento fletor
    //  τSd = Fsd / (u1 · d)
    // --------------------------------------------------------

    const alphaV  = 1 - fck / 250;            // adimensional
    const tauRd2  = alphaV * fcd * 0.27;      // MPa – resistência no contorno C

    // Tensão solicitante no contorno C (sem momento fletor)
    // Atenção: Fsd em kN, u1 em cm, d em cm → resultado em kN/cm² = 10 MPa
    // Para converter: 1 kN/cm² = 10 MPa  →  dividir por 10
    const tauSd_C = (Fsd / (u1 * d)) / 10;   // MPa

    const verif1 = tauSd_C <= tauRd2
        ? "✅ Perímetro C – OK! (sem esmagamento)"
        : "❌ ERRO! Esmagamento da biela – τSd > τRd2";


    // --------------------------------------------------------
    //  ETAPA 7 – VERIFICAÇÃO NO CONTORNO C' SEM ARMADURA
    //  (Item 19.5.3.2)
    //
    //  Coeficiente k: interpolado conforme tabela da NBR
    //  em função da razão C1/C2 para cada direção
    //
    //  Módulos de resistência Wp (cm³):
    //  Wpx = C1²/2 + C1·C2 + 4·C2·d + 16·d² + 2π·C1·d
    //  Wpy = C1y²/2 + C1y·C2y + 4·C2y·d + 16·d² + 2π·C1y·d
    //  (onde C1x=C1, C2x=C2 para momento em x e vice-versa)
    //
    //  τSd = Fsd/(u2·d) + kx·Msd1x/(Wpx·d) + ky·Msd1y/(Wpy·d)
    //
    //  τRd1 = 0,13·(1 + √(20/d))·(100·ρ·fck)^(1/3)   [MPa]
    // --------------------------------------------------------

    // Coeficiente kx: C1x = C1 (paralelo à excentricidade de Mx)
    const kx = interpolarK(C1, C2);

    // Coeficiente ky: C1y = C2 (pilar girado 90° para My)
    const ky = interpolarK(C2, C1);

    // Módulos de resistência para contorno C'
    const Wpx = (C1*C1)/2 + C1*C2 + 4*C2*d + 16*d*d + 2*Math.PI*C1*d;   // cm³
    const Wpy = (C2*C2)/2 + C2*C1 + 4*C1*d + 16*d*d + 2*Math.PI*C2*d;   // cm³

    // Tensão solicitante no contorno C' (com momentos)
    // Todos os termos em kN/cm² → dividir por 10 para MPa
    const tauSd_Clinha = (
        Fsd / (u2 * d) +
        kx * Msd1x / (Wpx * d) +
        ky * Msd1y / (Wpy * d)
    ) / 10;   // MPa

    // Tensão resistente sem armadura (σcp = 0 → sem protensão)
    const fator_d  = 1 + Math.sqrt(20 / d);   // fator de escala (d em cm)
    const tauRd1   = 0.13 * fator_d * Math.pow(100 * rho * fck, 1/3);  // MPa

    const verif2 = tauSd_Clinha <= tauRd1
        ? "✅ Perímetro C' – OK! (sem armadura de punção necessária)"
        : "⚠️ Necessita armadura de punção!";

    const precisaArmadura = tauSd_Clinha > tauRd1;


    // --------------------------------------------------------
    //  ETAPA 8 – VERIFICAÇÃO NO CONTORNO C' COM ARMADURA
    //  (Item 19.5.3.3)
    //
    //  Espaçamentos (item 19.5.3.3):
    //  s0 ≤ 0,5d   (pilar → 1ª camada)
    //  sr ≤ 0,75d  (entre camadas)
    //  se = 2d     (última camada → contorno C'')
    //
    //  Área de 1 conector: As1c = π·φ²/4
    //  Área total: Asw = nconec · ncam · As1c
    //
    //  τRd3 = 0,10·(1+√(20/d))·(100·ρ·fck)^(1/3)
    //         + 1,5·(d/sr)·(Asw·fywd·sen90°)/(u2·d)
    // --------------------------------------------------------

    const s0_lim = 0.5  * d;   // cm – limite para s0
    const sr_lim = 0.75 * d;   // cm – limite para sr
    const se     = 2    * d;   // cm – espaçamento externo
    const sr     = sr_lim;

    // Etapa 8: dimensionamento dos studs será implementado em versão futura.
    // Por ora, exibe os limites de espaçamento e sinaliza necessidade de armadura.
    const As1c  = 0;
    const Asw   = 0;
    const tauRd3 = 0;

    const verif3 = "⚠️ Armadura de punção necessária — insira os dados dos studs (em desenvolvimento)";


    // --------------------------------------------------------
    //  ETAPA 9 – VERIFICAÇÃO NO CONTORNO C''
    //  (Item 19.5.3.4)
    //
    //  Distância do pilar até a última camada:
    //  p = s0 + (ncam - 1) · sr
    //
    //  Módulos de resistência para C'':
    //  WpxC'' = Wpx + 2·C2·p + 16·d·p + 4·p² + π·C1·p
    //  WpyC'' = Wpy + 2·C1·p + 16·d·p + 4·p² + π·C2·p
    //
    //  Perímetro u3: aproximado pela fórmula analítica
    //  u3 = u1 + 4·π·(d + p)
    //
    //  τSd = Fsd/(u3·d) + kx·Msd1x/(WpxC''·d) + ky·Msd1y/(WpyC''·d)
    //  τRd1 = mesma expressão da Etapa 7
    // --------------------------------------------------------

    const p  = s0_lim + 2 * sr;   // cm – estimativa: s0 + 2 camadas (studs em desenvolvimento)

    // Perímetro C'' (aproximação analítica)
    const u3 = u1 + 4 * Math.PI * (d + p);    // cm

    // Módulos de resistência para C''
    const WpxCpp = Wpx + 2*C2*p + 16*d*p + 4*p*p + Math.PI*C1*p;   // cm³
    const WpyCpp = Wpy + 2*C1*p + 16*d*p + 4*p*p + Math.PI*C2*p;   // cm³

    // Tensão solicitante no contorno C''
    const tauSd_Cpp = (
        Fsd / (u3 * d) +
        kx * Msd1x / (WpxCpp * d) +
        ky * Msd1y / (WpyCpp * d)
    ) / 10;   // MPa

    const verif4 = tauSd_Cpp <= tauRd1
        ? "✅ Perímetro C'' – OK! (τSd ≤ τRd1)"
        : "❌ ERRO! τRd1 não atende no perímetro C''";


    // --------------------------------------------------------
    //  EXIBIÇÃO DOS RESULTADOS
    // --------------------------------------------------------
    exibirResultados({
        // Valores de cálculo
        fcd, fyd, fywd,
        Fsd, Msd1x, Msd1y,
        // Geometria
        dx, dy, d, rho, rox, roy, As1_x, As1_y, qx, qy,
        // Perímetros
        u1, u2, u3,
        // Etapa 6
        tauRd2, tauSd_C, verif1,
        // Etapa 7
        kx, ky, Wpx, Wpy,
        tauSd_Clinha, tauRd1, verif2, precisaArmadura,
        // Etapa 8
        s0_lim, sr_lim, se, As1c, Asw, tauRd3, verif3,
        // Etapa 9
        p, WpxCpp, WpyCpp, tauSd_Cpp, verif4
    });
}


// ------------------------------------------------------------
//  FUNÇÃO AUXILIAR – Interpolação do coeficiente k
//  Tabela da ABNT NBR 6118 (item 19.5.2.3):
//
//  C1/C2 │ 0,5  │ 1,0  │ 2,0  │ 3,0
//  k     │ 0,45 │ 0,60 │ 0,70 │ 0,80
//
//  C1 = dimensão paralela à excentricidade da força
//  C2 = dimensão perpendicular à excentricidade
// ------------------------------------------------------------
function interpolarK(C1, C2) {
    const razao = C1 / C2;

    // Tabela de referência
    const tabela = [
        { r: 0.5, k: 0.45 },
        { r: 1.0, k: 0.60 },
        { r: 2.0, k: 0.70 },
        { r: 3.0, k: 0.80 }
    ];

    // Fora dos limites: extrapola com os valores extremos
    if (razao <= tabela[0].r) return tabela[0].k;
    if (razao >= tabela[tabela.length - 1].r) return tabela[tabela.length - 1].k;

    // Interpolação linear entre os pontos da tabela
    for (let i = 0; i < tabela.length - 1; i++) {
        if (razao >= tabela[i].r && razao <= tabela[i+1].r) {
            const t = (razao - tabela[i].r) / (tabela[i+1].r - tabela[i].r);
            return tabela[i].k + t * (tabela[i+1].k - tabela[i].k);
        }
    }
}


// ------------------------------------------------------------
//  FUNÇÃO AUXILIAR – Formatação de número com casas decimais
// ------------------------------------------------------------
function fmt(valor, casas = 2) {
    return Number(valor).toFixed(casas);
}


// ------------------------------------------------------------
//  FUNÇÃO AUXILIAR – Exibição organizada dos resultados
//  Os resultados são inseridos em um elemento <div id="resultados">
//  que deve existir no HTML
// ------------------------------------------------------------
function exibirResultados(r) {

    const div  = document.getElementById("resultados");
    const card = document.getElementById("card-resultados");
    if (!div) { alert("Elemento #resultados não encontrado no HTML."); return; }

    card.style.display = "block";

    function badge(verif) {
        if (verif.startsWith("✅")) return `<span class="badge badge-ok">${verif}</span>`;
        if (verif.startsWith("⚠️")) return `<span class="badge badge-aviso">${verif}</span>`;
        return `<span class="badge badge-erro">${verif}</span>`;
    }

    div.innerHTML = `
        <h2>Resumo do Dimensionamento</h2>

        <h3>Valores de Cálculo</h3>
        <table class="tabela-resultado">
            <tr><td>f<sub>cd</sub> — resistência de cálculo do concreto</td><td>${fmt(r.fcd)} MPa</td></tr>
            <tr><td>f<sub>yd</sub> — resistência de cálculo do aço</td><td>${fmt(r.fyd)} MPa</td></tr>
            <tr><td>f<sub>ywd</sub> — resistência da armadura de punção</td><td>${fmt(r.fywd)} MPa</td></tr>
            <tr><td>F<sub>sd</sub> — força de punção de cálculo</td><td>${fmt(r.Fsd)} kN</td></tr>
            <tr><td>M<sub>sd1x</sub> — momento de cálculo dir. x</td><td>${fmt(r.Msd1x)} kN.cm</td></tr>
            <tr><td>M<sub>sd1y</sub> — momento de cálculo dir. y</td><td>${fmt(r.Msd1y)} kN.cm</td></tr>
            <tr><td>d<sub>x</sub> — altura útil dir. x (calculada)</td><td>${fmt(r.dx)} cm</td></tr>
            <tr><td>d<sub>y</sub> — altura útil dir. y (calculada)</td><td>${fmt(r.dy)} cm</td></tr>
            <tr><td>d — altura útil média</td><td>${fmt(r.d)} cm</td></tr>
            <tr><td>&rho;<sub>x</sub> — taxa armadura dir. x</td><td>${fmt(r.rox * 100, 4)} %</td></tr>
            <tr><td>&rho;<sub>y</sub> — taxa armadura dir. y</td><td>${fmt(r.roy * 100, 4)} %</td></tr>
            <tr><td>&rho; — taxa média (√ρx·ρy)</td><td>${fmt(r.rho * 100, 4)} %</td></tr>
        </table>

        <h3>Perímetros de Controle</h3>
        <table class="tabela-resultado">
            <tr><td>u<sub>1</sub> — Contorno C (pilar)</td><td>${fmt(r.u1)} cm</td></tr>
            <tr><td>u<sub>2</sub> — Contorno C' (a 2d do pilar)</td><td>${fmt(r.u2)} cm</td></tr>
            <tr><td>u<sub>3</sub> — Contorno C'' (além da armadura)</td><td>${fmt(r.u3)} cm</td></tr>
        </table>

        <h3>Etapa 6 — Contorno C: Esmagamento da Biela</h3>
        <table class="tabela-resultado">
            <tr><td>&tau;<sub>Rd2</sub> — tensão resistente</td><td>${fmt(r.tauRd2)} MPa</td></tr>
            <tr><td>&tau;<sub>Sd</sub> — tensão solicitante</td><td>${fmt(r.tauSd_C)} MPa</td></tr>
        </table>
        ${badge(r.verif1)}

        <h3>Etapa 7 — Contorno C': Sem Armadura de Punção</h3>
        <table class="tabela-resultado">
            <tr><td>k<sub>x</sub></td><td>${fmt(r.kx, 3)}</td></tr>
            <tr><td>k<sub>y</sub></td><td>${fmt(r.ky, 3)}</td></tr>
            <tr><td>W<sub>px</sub> — módulo de resistência</td><td>${fmt(r.Wpx)} cm³</td></tr>
            <tr><td>W<sub>py</sub> — módulo de resistência</td><td>${fmt(r.Wpy)} cm³</td></tr>
            <tr><td>&tau;<sub>Rd1</sub> — tensão resistente</td><td>${fmt(r.tauRd1)} MPa</td></tr>
            <tr><td>&tau;<sub>Sd</sub> — tensão solicitante</td><td>${fmt(r.tauSd_Clinha)} MPa</td></tr>
        </table>
        ${badge(r.verif2)}

        ${r.precisaArmadura ? `
        <h3>Etapa 8 — Contorno C': Com Armadura de Punção</h3>
        <table class="tabela-resultado">
            <tr><td>Limite s<sub>0</sub> ≤</td><td>${fmt(r.s0_lim)} cm</td></tr>
            <tr><td>Limite s<sub>r</sub> ≤</td><td>${fmt(r.sr_lim)} cm</td></tr>
            <tr><td>Espaçamento externo s<sub>e</sub></td><td>${fmt(r.se)} cm</td></tr>
            <tr><td>Área de 1 conector A<sub>s1c</sub></td><td>${fmt(r.As1c, 4)} cm²</td></tr>
            <tr><td>Área total A<sub>sw</sub></td><td>${fmt(r.Asw, 3)} cm²</td></tr>
            <tr><td>&tau;<sub>Rd3</sub> — tensão resistente com armadura</td><td>${fmt(r.tauRd3)} MPa</td></tr>
            <tr><td>&tau;<sub>Sd</sub> — tensão solicitante</td><td>${fmt(r.tauSd_Clinha)} MPa</td></tr>
        </table>
        ${badge(r.verif3)}

        <h3>Etapa 9 — Contorno C''</h3>
        <table class="tabela-resultado">
            <tr><td>p — distância pilar → última camada</td><td>${fmt(r.p)} cm</td></tr>
            <tr><td>W<sub>px</sub>C'' — módulo de resistência</td><td>${fmt(r.WpxCpp)} cm³</td></tr>
            <tr><td>W<sub>py</sub>C'' — módulo de resistência</td><td>${fmt(r.WpyCpp)} cm³</td></tr>
            <tr><td>&tau;<sub>Rd1</sub> — tensão resistente</td><td>${fmt(r.tauRd1)} MPa</td></tr>
            <tr><td>&tau;<sub>Sd</sub> — tensão solicitante</td><td>${fmt(r.tauSd_Cpp)} MPa</td></tr>
        </table>
        ${badge(r.verif4)}
        ` : `<p style="color:#6b7280; font-size:0.88rem; margin-top:8px;"><em>Armadura de punção não necessária — etapas 8 e 9 não aplicáveis.</em></p>`}

        <h3>Resumo das Verificações</h3>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
            ${badge(r.verif1)}
            ${badge(r.verif2)}
            ${r.precisaArmadura ? badge(r.verif3) + badge(r.verif4) : ""}
        </div>
    `;

    card.scrollIntoView({ behavior: "smooth" });
}
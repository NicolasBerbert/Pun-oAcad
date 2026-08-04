/* global React, THREE */

const { useRef, useEffect, useState, useMemo } = React;

// ============================================================
//  Viewer3D — Three.js engineering visualization
// ============================================================
// Props:
//   data: { secao, C1, C2, diam, h, cobrimento, camadaExterna, phi_lx/y, s_x/y,
//           Fsk, Mxk, Myk, studs: {phi, nconec, ncam} | null, d, dx, dy }
//   view: '3d' | 'planta' | 'corteX' | 'corteY'
//   layers: { concreto, armadura, studs, perimetros, forcas, cone }
//   highlight: name of input currently focused — pulses corresponding dim
// ============================================================

function Viewer3D({ data, view, layers, highlight }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  // initialize three scene once
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = null;

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 5000);
    camera.position.set(220, 200, 280);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 50;
    controls.maxDistance = 900;
    controls.target.set(0, 10, 0);

    // ── Lighting (BIM-style)
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xeef2fa, 0xd5d8de, 0.5);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(140, 240, 160);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xc7d2fe, 0.3);
    rim.position.set(-120, 80, -120);
    scene.add(rim);

    // ── Floor grid
    const grid = new THREE.GridHelper(800, 40, 0xb6c2d3, 0xdfe5ee);
    grid.position.y = -0.05;
    grid.material.opacity = 0.55;
    grid.material.transparent = true;
    scene.add(grid);

    // ── Groups
    const root = new THREE.Group();
    scene.add(root);

    const slabGroup = new THREE.Group(); slabGroup.name = 'slab';
    const colGroup = new THREE.Group(); colGroup.name = 'col';
    const rebarGroup = new THREE.Group(); rebarGroup.name = 'rebar';
    const studsGroup = new THREE.Group(); studsGroup.name = 'studs';
    const perimGroup = new THREE.Group(); perimGroup.name = 'perim';
    const forcesGroup = new THREE.Group(); forcesGroup.name = 'forces';
    const coneGroup = new THREE.Group(); coneGroup.name = 'cone';
    const dimsGroup = new THREE.Group(); dimsGroup.name = 'dims';

    root.add(slabGroup, colGroup, rebarGroup, studsGroup, perimGroup, forcesGroup, coneGroup, dimsGroup);

    // resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // animation loop
    let raf;
    let t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const tNow = performance.now();
      const elapsed = (tNow - t0) / 1000;
      controls.update();
      // pulse any highlighted dim
      dimsGroup.children.forEach(o => {
        if (o.userData.pulse) {
          const k = 0.5 + 0.5 * Math.sin(elapsed * 4);
          o.traverse(c => {
            if (c.material) {
              c.material.opacity = 0.5 + 0.5 * k;
              c.material.transparent = true;
            }
          });
        }
      });
      renderer.render(scene, camera);
    };
    tick();

    stateRef.current = {
      scene, camera, renderer, controls, root,
      slabGroup, colGroup, rebarGroup, studsGroup, perimGroup, forcesGroup, coneGroup, dimsGroup,
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Rebuild geometry when data changes
  useEffect(() => {
    const s = stateRef.current; if (!s) return;
    rebuild(s, data, layers, highlight);
  }, [data, layers, highlight]);

  // ── Camera presets when view changes
  useEffect(() => {
    const s = stateRef.current; if (!s) return;
    const { camera, controls } = s;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dist = 320;
    let target = [0, 10, 0];
    let pos;
    if (view === 'planta') pos = [0, 380, 0.01];
    else if (view === 'corteX') pos = [0, 30, 380];
    else if (view === 'corteY') pos = [380, 30, 0];
    else pos = [220, 200, 280];

    if (reduce) {
      camera.position.set(...pos);
      controls.target.set(...target);
      controls.update();
    } else {
      // simple tween
      const start = camera.position.clone();
      const tStart = performance.now();
      const dur = 600;
      const animate = () => {
        const t = Math.min(1, (performance.now() - tStart) / dur);
        const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
        camera.position.lerpVectors(start, new THREE.Vector3(...pos), e);
        camera.lookAt(...target);
        if (t < 1) requestAnimationFrame(animate);
        else { controls.target.set(...target); controls.update(); }
      };
      animate();
    }
  }, [view]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}

// ============================================================
//  rebuild — rebuild scene from inputs
// ============================================================
function rebuild(s, data, layers, highlight) {
  const { slabGroup, colGroup, rebarGroup, studsGroup, perimGroup, forcesGroup, coneGroup, dimsGroup } = s;
  // clear
  [slabGroup, colGroup, rebarGroup, studsGroup, perimGroup, forcesGroup, coneGroup, dimsGroup]
    .forEach(g => { while (g.children.length) { const c = g.children.pop(); c.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) { if (Array.isArray(x.material)) x.material.forEach(m => m.dispose()); else x.material.dispose(); } }); } });

  if (!data) return;

  const { secao, C1, C2, diam, h, cobrimento, camadaExterna, phi_lx, phi_ly, s_x, s_y, Fsk, Mxk, Myk, studs, dx, dy, d } = data;

  // pick sensible defaults so it's always informative
  const _C1 = secao === 'circular' ? (diam || 50) : (C1 || 40);
  const _C2 = secao === 'circular' ? (diam || 50) : (C2 || 25);
  const _h = h || 20;
  const _d = d || (_h - (cobrimento || 2.5) - 1.5);

  // slab — a "tile" of slab around the column (visualization piece)
  const slabW = Math.max(180, (_C1 + 8 * _d));
  const slabL = Math.max(180, (_C2 + 8 * _d));
  const slabT = _h;

  if (layers.concreto) {
    const slabMat = new THREE.MeshPhysicalMaterial({
      color: 0xdcdfe4, roughness: 0.85, metalness: 0.0,
      clearcoat: 0.05, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    });
    const slabGeom = new THREE.BoxGeometry(slabW, slabT, slabL);
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.set(0, slabT / 2, 0);
    slab.castShadow = false;
    slab.receiveShadow = true;
    slabGroup.add(slab);

    // edge lines on the slab
    const edges = new THREE.EdgesGeometry(slabGeom);
    const slabEdges = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.45 }));
    slabEdges.position.copy(slab.position);
    slabGroup.add(slabEdges);
  }

  // column (rises above the slab)
  if (layers.concreto) {
    const colH = 80;
    const colMat = new THREE.MeshPhysicalMaterial({
      color: 0xc4c8cf, roughness: 0.78, metalness: 0.02,
    });
    let colMesh;
    if (secao === 'circular') {
      const r = (diam || 50) / 2;
      colMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, slabT + colH, 48), colMat);
      colMesh.position.set(0, (slabT + colH) / 2, 0);
    } else {
      const colGeom = new THREE.BoxGeometry(_C1, slabT + colH, _C2);
      colMesh = new THREE.Mesh(colGeom, colMat);
      colMesh.position.set(0, (slabT + colH) / 2, 0);
    }
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    colGroup.add(colMesh);

    // column edges
    if (colMesh.geometry instanceof THREE.BoxGeometry) {
      const ce = new THREE.EdgesGeometry(colMesh.geometry);
      const lines = new THREE.LineSegments(ce, new THREE.LineBasicMaterial({ color: 0x3b465a, transparent: true, opacity: 0.6 }));
      lines.position.copy(colMesh.position);
      colGroup.add(lines);
    }
  }

  // ── Control perimeters (drawn just above slab top)
  if (layers.perimetros) {
    const y = slabT + 0.2;

    // u1 — column footprint (RED)
    let u1pts = [];
    if (secao === 'circular') {
      const r = (diam || 50) / 2;
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        u1pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
    } else {
      const hx = _C1 / 2, hz = _C2 / 2;
      u1pts = [
        new THREE.Vector3(-hx, y, -hz), new THREE.Vector3(hx, y, -hz),
        new THREE.Vector3(hx, y, hz), new THREE.Vector3(-hx, y, hz),
        new THREE.Vector3(-hx, y, -hz),
      ];
    }
    perimGroup.add(makeDashedLoop(u1pts, 0xd1402a, 2.5, 1.5));
    perimGroup.add(makePerimeterLabel('C — u₁', u1pts[0].clone().add(new THREE.Vector3(0, 4, 0)), 0xd1402a));

    // u2 — C' at 2d (ORANGE) — offset rectangle with rounded corners
    perimGroup.add(makeOffsetPerimeter(_C1, _C2, secao === 'circular' ? (diam||50)/2 : 0, secao, 2 * _d, y + 0.05, 0xe08a13, 'C′ — u₂'));

    // u3 — C'' beyond studs (YELLOW) if studs configured
    if (studs && studs.ncam) {
      const p = 0.5 * _d + (studs.ncam - 1) * 0.75 * _d;
      perimGroup.add(makeOffsetPerimeter(_C1, _C2, secao === 'circular' ? (diam||50)/2 : 0, secao, p + _d, y + 0.1, 0xc6a700, 'C″ — u₃'));
    }
  }

  // ── Failure cone (translucent inverted frustum)
  if (layers.cone) {
    // Build an inverted frustum: from column footprint expanding outward at 1:2
    // (vertical : horizontal = 1 : 2 means 26.57° from vertical → offset = 2*depth)
    // For visualization: cone reaches slab top at column footprint, expands downward through slab and out
    // Actually punching cone: starts at column bottom (or top depending on view) and expands up to slab surface
    // We render as a translucent shape: bottom = column footprint, top = column footprint + 2*slabT offset
    const expand = _d * 2; // approx
    if (secao === 'circular') {
      const r1 = (diam || 50) / 2;
      const r2 = r1 + expand;
      const geom = new THREE.CylinderGeometry(r2, r1, slabT, 48, 1, true);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x1d4499, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false,
      });
      const cone = new THREE.Mesh(geom, mat);
      cone.position.set(0, slabT / 2, 0);
      coneGroup.add(cone);

      // edges
      const ringTop = makeCircleLine(r2, 0x1d4499, slabT);
      const ringBot = makeCircleLine(r1, 0x1d4499, 0);
      coneGroup.add(ringTop, ringBot);
    } else {
      // build a tapered box: bottom = C1×C2, top = (C1+2*expand)×(C2+2*expand)
      const r1x = _C1 / 2, r1z = _C2 / 2;
      const r2x = r1x + expand, r2z = r1z + expand;
      const geom = buildFrustumBox(r1x, r1z, r2x, r2z, slabT);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x1d4499, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, flatShading: true,
      });
      const cone = new THREE.Mesh(geom, mat);
      coneGroup.add(cone);

      // edge lines
      const edges = new THREE.EdgesGeometry(geom, 20);
      const linesMat = new THREE.LineDashedMaterial({ color: 0x1d4499, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.7 });
      const lines = new THREE.LineSegments(edges, linesMat);
      lines.computeLineDistances();
      coneGroup.add(lines);
    }
    coneGroup.add(makePerimeterLabel('Cone de punção', new THREE.Vector3(0, slabT + 6, _C2 / 2 + _d * 2 + 5), 0x1d4499));
  }

  // ── Reinforcement grid (longitudinal bars inside slab)
  if (layers.armadura) {
    const phiLx = (phi_lx || 12.5) / 10; // cm
    const phiLy = (phi_ly || 12.5) / 10;
    const sx = s_x || 15;
    const sy = s_y || 15;
    const c = cobrimento || 2.5;
    // Camada externa encosta no cobrimento; a interna desce uma bitola inteira.
    const extY = camadaExterna !== 'x';
    const phiExt = extY ? phiLy : phiLx;

    const matSteel = new THREE.MeshPhysicalMaterial({
      color: 0x99a4b3, roughness: 0.32, metalness: 0.7,
    });

    // bars in x direction (running along x-axis, spaced along z)
    const yBarX = extY ? slabT - c - phiExt - phiLx / 2 : slabT - c - phiLx / 2;
    for (let z = -slabL / 2 + sy; z < slabL / 2; z += sy) {
      const g = new THREE.CylinderGeometry(phiLx / 2, phiLx / 2, slabW * 0.98, 8);
      const m = new THREE.Mesh(g, matSteel);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, yBarX, z);
      m.castShadow = false;
      rebarGroup.add(m);
    }
    // bars in y direction (running along z-axis, spaced along x)
    const yBarY = extY ? slabT - c - phiLy / 2 : slabT - c - phiExt - phiLy / 2;
    for (let x = -slabW / 2 + sx; x < slabW / 2; x += sx) {
      const g = new THREE.CylinderGeometry(phiLy / 2, phiLy / 2, slabL * 0.98, 8);
      const m = new THREE.Mesh(g, matSteel);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, yBarY, 0);
      rebarGroup.add(m);
    }
  }

  // ── Studs (rosette)
  if (layers.studs && studs && studs.phi && studs.nconec && studs.ncam) {
    const phiStud = studs.phi / 10;
    const c = cobrimento || 2.5;
    const studH = _h - 2 * c; // approx between top and bottom rebar layers
    const yStud = c + studH / 2;

    const matStud = new THREE.MeshPhysicalMaterial({
      color: 0xb0bac6, roughness: 0.4, metalness: 0.65,
    });

    const isCircular = secao === 'circular';
    const r0 = isCircular ? (diam||50)/2 : Math.max(_C1, _C2) / 2;

    // n radial arms (usually 8 for square, around the column)
    const nArms = Math.max(4, studs.nconec); // user provides conec per layer
    // For square column: arms emanate from face midpoints + corners, but simple: 8 radial directions
    for (let arm = 0; arm < nArms; arm++) {
      const ang = (arm / nArms) * Math.PI * 2;
      for (let layer = 0; layer < studs.ncam; layer++) {
        const rL = (isCircular ? (diam||50)/2 : Math.max(_C1, _C2)/2) + 0.5 * _d + layer * 0.75 * _d;
        const x = Math.cos(ang) * rL;
        const z = Math.sin(ang) * rL;
        // skip if inside the column footprint (for square cols)
        if (!isCircular && Math.abs(x) < _C1/2 + 1 && Math.abs(z) < _C2/2 + 1) continue;
        const g = new THREE.CylinderGeometry(phiStud / 2, phiStud / 2, studH, 10);
        const m = new THREE.Mesh(g, matStud);
        m.position.set(x, yStud, z);
        studsGroup.add(m);
        // top head (small disc)
        const head = new THREE.Mesh(new THREE.CylinderGeometry(phiStud * 0.9, phiStud * 0.9, phiStud * 0.4, 12), matStud);
        head.position.set(x, _h - c, z);
        studsGroup.add(head);
        // bottom head
        const headB = head.clone();
        headB.position.set(x, c, z);
        studsGroup.add(headB);
      }
    }
  }

  // ── Forces (Fsk arrow + Mx, My moment arrows)
  // Sign convention:
  //   Fsk > 0  → compressão sobre a laje (seta APONTA PARA BAIXO no topo do pilar)
  //   Fsk < 0  → arrancamento/uplift (seta APONTA PARA CIMA)
  //   Mxk/Myk: o sinal inverte o sentido da seta curva (horário ↔ anti-horário)
  if (layers.forcas) {
    const colTopY = _h + 80;

    if (Number.isFinite(Fsk) && Fsk !== 0) {
      const mag = Math.abs(Fsk);
      const len = Math.max(20, Math.min(60, mag / 5));
      const color = Fsk > 0 ? 0xb42318 : 0x0e7a6b; // vermelho = compressão, teal = uplift
      let tail, tip;
      if (Fsk > 0) {
        tail = new THREE.Vector3(0, colTopY + len + 8, 0);
        tip  = new THREE.Vector3(0, colTopY + 4, 0);
      } else {
        tail = new THREE.Vector3(0, colTopY + 4, 0);
        tip  = new THREE.Vector3(0, colTopY + len + 8, 0);
      }
      forcesGroup.add(makeForceArrow(color, tail, tip, len));
      forcesGroup.add(makeTextSprite(`Fsk = ${Fsk} kN`, new THREE.Vector3(0, colTopY + len + 14, 0), color));
    }

    if (Number.isFinite(Mxk) && Mxk !== 0) {
      // Mx é momento EM TORNO DE x → rotação no plano YZ. O sinal inverte o sentido.
      const r = Math.max(15, Math.min(40, Math.log(Math.abs(Mxk) + 1) * 5));
      const mom = makeMomentArrow(0x9333ea, 'x', r, colTopY, Math.sign(Mxk));
      forcesGroup.add(mom);
      forcesGroup.add(makeTextSprite(`Mxk = ${Mxk} kN·cm`, new THREE.Vector3(0, colTopY + 6, r + 10), 0x9333ea));
    }
    if (Number.isFinite(Myk) && Myk !== 0) {
      const r = Math.max(15, Math.min(40, Math.log(Math.abs(Myk) + 1) * 5));
      const mom = makeMomentArrow(0x16a394, 'z', r, colTopY, Math.sign(Myk));
      forcesGroup.add(mom);
      forcesGroup.add(makeTextSprite(`Myk = ${Myk} kN·cm`, new THREE.Vector3(r + 10, colTopY + 6, 0), 0x16a394));
    }
  }

  // ── Dimension highlights (pulse the one matching `highlight`)
  if (highlight) {
    addDimHighlight(dimsGroup, highlight, { _C1, _C2, _h, _d, secao, diam, cobrimento });
  }
}

// ── helpers ──────────────────────────────────────────────────

function makeDashedLoop(points, color, dash = 3, gap = 2) {
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, linewidth: 2, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

function makeCircleLine(r, color, y) {
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return makeDashedLoop(pts, color, 2.5, 1.5);
}

function makeOffsetPerimeter(C1, C2, rad, secao, offset, y, color, label) {
  // for rect: rounded-rectangle (linear sides + quarter-circle corners) — that's the NBR critical perimeter shape
  const group = new THREE.Group();
  if (secao === 'circular') {
    const pts = [];
    const r = rad + offset;
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    group.add(makeDashedLoop(pts, color, 3, 2));
  } else {
    const hx = C1 / 2, hz = C2 / 2;
    const r = offset;
    const pts = [];
    // start at +x face, go +z
    pts.push(new THREE.Vector3(hx + r, y, -hz));
    // top-right corner arc (from (+hx+r,-hz) to (+hx, -hz-r) is wrong; we want OUTWARD)
    // Standard NBR perimeter: straight lines parallel to faces (offset by r) connected by quarter-circles at corners
    // Corner top-right (column corner at +hx, -hz): arc center at (+hx, -hz), r, sweeping from angle -90° to 0°
    const seg = 16;
    // right face (+x), going from -z to +z at x = hx + r
    pts.length = 0;
    pts.push(new THREE.Vector3(hx + r, y, -hz));
    pts.push(new THREE.Vector3(hx + r, y, hz));
    // arc at (+hx,+hz), 0° to 90°
    for (let i = 1; i <= seg; i++) {
      const a = (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(hx + Math.cos(a) * r, y, hz + Math.sin(a) * r));
    }
    // top face (+z), going from +x to -x
    pts.push(new THREE.Vector3(-hx, y, hz + r));
    // arc at (-hx,+hz), 90° to 180°
    for (let i = 1; i <= seg; i++) {
      const a = Math.PI / 2 + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(-hx + Math.cos(a) * r, y, hz + Math.sin(a) * r));
    }
    // left face (-x), going from +z to -z
    pts.push(new THREE.Vector3(-hx - r, y, -hz));
    // arc at (-hx,-hz)
    for (let i = 1; i <= seg; i++) {
      const a = Math.PI + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(-hx + Math.cos(a) * r, y, -hz + Math.sin(a) * r));
    }
    // bottom face
    pts.push(new THREE.Vector3(hx, y, -hz - r));
    // arc at (+hx,-hz)
    for (let i = 1; i <= seg; i++) {
      const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(hx + Math.cos(a) * r, y, -hz + Math.sin(a) * r));
    }
    group.add(makeDashedLoop(pts, color, 3, 2));
  }
  return group;
}

function buildFrustumBox(r1x, r1z, r2x, r2z, height) {
  // 8 vertices: bottom 4 (small), top 4 (larger)
  const v = [
    -r1x, 0, -r1z,  r1x, 0, -r1z,  r1x, 0, r1z, -r1x, 0, r1z,        // bottom (column footprint)
    -r2x, height, -r2z,  r2x, height, -r2z,  r2x, height, r2z, -r2x, height, r2z, // top (slab surface, larger)
  ];
  // faces: 4 sides only (open top/bottom)
  const idx = [
    0,1,5, 0,5,4,    // -z face
    1,2,6, 1,6,5,    // +x face
    2,3,7, 2,7,6,    // +z face
    3,0,4, 3,4,7,    // -x face
  ];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

function makeForceArrow(color, from, to, len) {
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const length = from.distanceTo(to);
  const helper = new THREE.ArrowHelper(dir, from, length, color, length * 0.25, length * 0.12);
  helper.line.material.linewidth = 3;
  helper.line.material = new THREE.LineBasicMaterial({ color, linewidth: 3 });
  return helper;
}

function makeMomentArrow(color, axis, radius, y, sign = 1) {
  // a curved arrow indicating moment about given axis
  // sign = +1 → varredura anti-horária (regra da mão direita, momento positivo)
  // sign = -1 → varredura horária (momento negativo)
  const sweepSign = sign >= 0 ? 1 : -1;
  const group = new THREE.Group();
  const segs = 32;
  const pts = [];
  // 3/4 circle in plane perpendicular to axis
  for (let i = 0; i <= segs; i++) {
    const t = sweepSign * (i / segs) * 1.5 * Math.PI;
    let p;
    if (axis === 'x') p = new THREE.Vector3(0, Math.cos(t) * radius, Math.sin(t) * radius);
    else if (axis === 'z') p = new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0);
    else p = new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius);
    p.y += y;
    pts.push(p);
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color, linewidth: 3 }));
  group.add(line);

  // arrowhead at end
  const lastIdx = pts.length - 1;
  const tip = pts[lastIdx], prev = pts[lastIdx - 1];
  const dir = new THREE.Vector3().subVectors(tip, prev).normalize();
  const head = new THREE.ArrowHelper(dir, prev, prev.distanceTo(tip), color, 4, 2.5);
  group.add(head);

  return group;
}

function makeTextSprite(text, position, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
  const w = ctx.measureText(text).width + 20 * dpr;
  const h = 22 * dpr;
  canvas.width = w; canvas.height = h;
  ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = `rgba(${(color>>16)&255},${(color>>8)&255},${color&255},1)`;
  ctx.lineWidth = 1.5 * dpr;
  const r = 6 * dpr;
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, r);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgb(${(color>>16)&255},${(color>>8)&255},${color&255})`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w / dpr / 5, h / dpr / 5, 1);
  sprite.position.copy(position);
  sprite.renderOrder = 999;
  return sprite;
}

function makePerimeterLabel(text, pos, color) {
  return makeTextSprite(text, pos, color);
}

function addDimHighlight(group, name, ctx) {
  const { _C1, _C2, _h, _d, secao, diam, cobrimento } = ctx;
  let pos, label;
  if (name === 'C1' && secao !== 'circular') { pos = new THREE.Vector3(0, _h + 2, -_C2/2 - 6); label = `C₁ = ${_C1} cm`; }
  else if (name === 'C2' && secao !== 'circular') { pos = new THREE.Vector3(_C1/2 + 6, _h + 2, 0); label = `C₂ = ${_C2} cm`; }
  else if (name === 'diam') { pos = new THREE.Vector3(0, _h + 4, (diam||50)/2 + 6); label = `Ø = ${diam||50} cm`; }
  else if (name === 'h') { pos = new THREE.Vector3(_C1/2 + 30, _h/2, _C2/2 + 8); label = `h = ${_h} cm`; }
  else if (name === 'cobrimento') { pos = new THREE.Vector3(0, _h + 1, _C2/2 + 40); label = `c = ${cobrimento} cm`; }
  if (pos) {
    const sprite = makeTextSprite(label, pos, 0x1d4499);
    sprite.userData.pulse = true;
    group.add(sprite);
  }
}

window.Viewer3D = Viewer3D;

/* ==========================================================================
   engine.js — the 3D virtual athlete.
   · Athlete: a proportioned mannequin (1.78 m) built from capsules and
     ellipsoids, with muscle regions that can glow while they work.
   · Rig: pelvis + chest frames, two-bone IK for arms and legs, so hands
     stay on the bar and feet stay planted whatever the body does.
   · Equipment: barbell, dumbbells, benches, cable towers (the weight
     stack rises with the cable), pull-up station, all driven by the rig.
   · Motion3D: one shared WebGL renderer for the player and thumbnails.
   Needs three.js (global THREE) loaded before this file.
   ========================================================================== */
(function (GT) {
  const THREE = window.THREE;
  GT.Motion3D = { ready: false };
  if (!THREE) return;                       // offline: the player shows a notice
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;   // hex colours are sRGB

  const D2R = Math.PI / 180, ORANGE = new THREE.Color(0xFF6B1A);
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const V = a => new THREE.Vector3(a[0], a[1], a[2]);
  const mirror = a => [-a[0], a[1], a[2]];
  const side = (spec, s) => s === 'L' ? spec.L : (spec.R || mirror(spec.L));
  const B = { upper: 0.29, fore: 0.26, thigh: 0.44, shin: 0.43 };

  /* ---------------------------------------------------------------- math */
  function lerp(a, b, u) {
    if (typeof a === 'number') return a + (b - a) * u;
    if (Array.isArray(a)) return a.map((x, i) => lerp(x, b[i], u));
    if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = k in b ? lerp(a[k], b[k], u) : a[k]; return o; }
    return u < 0.5 ? a : b;
  }
  const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

  // Two-bone IK: root A, target T, pole = which way the middle joint points
  function ik(A, T, l1, l2, pole) {
    const v = T.clone().sub(A), dir = v.clone().normalize();
    const d = Math.min(Math.max(v.length(), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
    const a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
    if (p.lengthSq() < 1e-6) p.set(0, 0, 1);
    p.normalize();
    return [A.clone().addScaledVector(dir, a).addScaledVector(p, h), A.clone().addScaledVector(dir, d)];
  }

  const withDefaults = k => ({ spine: 0, head: 0, ...k });

  function timeline(m) {
    let t = 0, from = m.start;
    const phases = m.phases.map(p => {
      const dur = p.dur != null ? p.dur : p.hold, to = p.to || from;
      const o = { ...p, dur, t0: t, from, to };
      t += dur; from = to;
      return o;
    });
    return { phases, total: t };
  }

  /* Solve every joint position for one pose */
  function solve(m, k) {
    const P = V(k.pelvis);
    const Qp = new THREE.Quaternion().setFromEuler(new THREE.Euler(k.rot[0] * D2R, k.rot[1] * D2R, k.rot[2] * D2R, 'YXZ'));
    const Qc = Qp.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X, k.spine * D2R));
    const Qh = Qc.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X, k.head * D2R));
    const Qyaw = new THREE.Quaternion().setFromAxisAngle(Y, k.rot[1] * D2R);
    const fr = { p: Qp, t: Qc };
    const pt = (f, a) => f === 'w' ? V(a) : V(a).applyQuaternion(fr[f]).add(P);
    const dir = (f, a) => (f === 'w' ? V(a) : V(a).applyQuaternion(fr[f])).normalize();

    const J = { P, Qp, Qc, Qh };
    J.neck = pt('t', [0, 0.47, 0]);
    J.head = pt('t', [0, 0.50, 0]).add(new THREE.Vector3(0, 0.135, 0.015).applyQuaternion(Qh));

    ['L', 'R'].forEach(s => {
      const sx = s === 'L' ? 1 : -1;
      const sh = pt('t', [0.19 * sx, 0.465, 0]);
      const [el, wr] = ik(sh, pt(k.hands.f, side(k.hands, s)), B.upper, B.fore, dir(m.elbowPole.f, side(m.elbowPole, s)));
      const hip = pt('p', [0.095 * sx, -0.03, 0]);
      const kp = m.kneePole || { f: 'w', L: [0.2, 0, 1] };
      const [kn, an] = ik(hip, pt(k.feet.f, side(k.feet, s)), B.thigh, B.shin, dir(kp.f, side(kp, s)));

      let fd, flat = !m.foot || m.foot === 'flat';
      if (flat) {
        fd = new THREE.Vector3(0, 0, 1).applyQuaternion(Qyaw)
          .applyAxisAngle(Y, (m.footYaw || 8) * D2R * sx);
      } else {
        const shin = an.clone().sub(kn).normalize(), r = V(m.foot.perp);
        fd = r.sub(shin.clone().multiplyScalar(r.dot(shin))).normalize();
      }
      J[s] = { sh, el, wr, hip, kn, an, fd, flat };
    });
    return J;
  }

  /* ------------------------------------------------------------- athlete */
  class Athlete {
    constructor(scene) {
      this.root = new THREE.Group(); scene.add(this.root);
      const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
      this.mat = { skin: () => std(0xC7CBD1, 0.42, 0.12), kit: () => std(0x24272B, 0.78, 0.05), shoe: () => std(0x17181A, 0.6, 0.1) };
      this.groups = {};
      this.m = {};

      const add = (name, geo, mat, groups = []) => {
        const mesh = new THREE.Mesh(geo, this.mat[mat]());
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.root.add(mesh); this.m[name] = mesh;
        groups.forEach(g => (this.groups[g] = this.groups[g] || []).push(mesh));
        return mesh;
      };
      const ell = (sx, sy, sz) => new THREE.SphereGeometry(1, 28, 20).scale(sx, sy, sz);
      const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);

      add('pelvis', ell(0.165, 0.11, 0.12), 'kit');
      add('abs', ell(0.145, 0.16, 0.105), 'kit', ['core']);
      add('chest', ell(0.20, 0.16, 0.125), 'kit');
      add('upperBack', ell(0.15, 0.09, 0.05), 'kit', ['upperBack']);
      add('lowerBack', ell(0.10, 0.085, 0.045), 'kit', ['lowerBack']);
      add('neck', cap(0.048, 0.08), 'skin');
      add('head', ell(0.094, 0.116, 0.104), 'skin');
      ['L', 'R'].forEach(s => {
        add('glute' + s, ell(0.085, 0.09, 0.075), 'kit', ['glutes']);
        add('pec' + s, ell(0.088, 0.072, 0.042), 'kit', ['chest']);
        add('lat' + s, ell(0.07, 0.14, 0.05), 'kit', ['lats']);
        add('delt' + s, ell(0.07, 0.072, 0.07), 'skin', ['shoulders']);
        add('upper' + s, cap(0.05, B.upper), 'skin', ['biceps', 'triceps']);
        add('fore' + s, cap(0.041, B.fore), 'skin', ['forearms']);
        add('hand' + s, ell(0.036, 0.05, 0.022), 'skin');
        add('thigh' + s, cap(0.072, B.thigh), 'skin', ['quads', 'hamstrings']);
        add('shorts' + s, cap(0.079, 0.16), 'kit');
        add('shin' + s, cap(0.052, B.shin), 'skin', ['calves']);
        add('foot' + s, cap(0.042, 0.17), 'shoe');
      });
    }

    update(J) {
      const m = this.m;
      const inFrame = (mesh, q, off) => { mesh.quaternion.copy(q); mesh.position.copy(V(off).applyQuaternion(q).add(J.P)); };
      const seg = (mesh, a, b) => {
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
      };
      inFrame(m.pelvis, J.Qp, [0, 0, 0]);
      inFrame(m.abs, J.Qc, [0, 0.17, 0.005]);
      inFrame(m.chest, J.Qc, [0, 0.36, 0]);
      inFrame(m.upperBack, J.Qc, [0, 0.41, -0.09]);
      inFrame(m.lowerBack, J.Qc, [0, 0.15, -0.085]);
      seg(m.neck, J.neck, J.head.clone().lerp(J.neck, 0.35));
      m.head.position.copy(J.head); m.head.quaternion.copy(J.Qh);

      ['L', 'R'].forEach(s => {
        const sx = s === 'L' ? 1 : -1, L = J[s];
        inFrame(m['glute' + s], J.Qp, [0.07 * sx, -0.04, -0.07]);
        inFrame(m['pec' + s], J.Qc, [0.085 * sx, 0.35, 0.10]);
        inFrame(m['lat' + s], J.Qc, [0.12 * sx, 0.30, -0.07]);
        m['delt' + s].position.copy(L.sh); m['delt' + s].quaternion.copy(J.Qc);
        seg(m['upper' + s], L.sh, L.el);
        seg(m['fore' + s], L.el, L.wr);
        const fdir = L.wr.clone().sub(L.el).normalize();
        seg(m['hand' + s], L.wr, L.wr.clone().addScaledVector(fdir, 0.1));
        seg(m['thigh' + s], L.hip, L.kn);
        seg(m['shorts' + s], L.hip, L.hip.clone().lerp(L.kn, 0.36));
        seg(m['shin' + s], L.kn, L.an);
        const shin = L.an.clone().sub(L.kn).normalize();
        const heel = L.flat ? L.an.clone().add(new THREE.Vector3(0, -0.045, 0)) : L.an.clone().addScaledVector(shin, 0.03);
        const c0 = heel.clone().addScaledVector(L.fd, -0.04), c1 = heel.clone().addScaledVector(L.fd, 0.17);
        seg(m['foot' + s], c0, c1);
      });
    }

    /* glow the working muscles; k 0..1 */
    highlight(list, k) {
      const on = new Set();
      (list || []).forEach(g => (this.groups[g] || []).forEach(mesh => on.add(mesh)));
      Object.values(this.m).forEach(mesh => {
        const lit = on.has(mesh);
        mesh.material.emissive.copy(lit ? ORANGE : new THREE.Color(0));
        mesh.material.emissiveIntensity = lit ? 0.06 + 0.7 * k : 0;
      });
    }
  }

  /* ----------------------------------------------------------- equipment */
  class Equipment {
    constructor(scene, specs) {
      this.g = new THREE.Group(); scene.add(this.g);
      const std = (c, r, mt) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
      this.mats = {
        steel: std(0xB9BEC4, 0.28, 0.9), frame: std(0x3A3D42, 0.5, 0.6), pad: std(0x1B1C1F, 0.85, 0),
        plate: std(0x121314, 0.7, 0.1), tower: std(0x26282C, 0.6, 0.4), stack: std(0x4A4E54, 0.45, 0.7),
        accent: new THREE.MeshStandardMaterial({ color: 0xFF6B1A, roughness: 0.4, emissive: 0xFF6B1A, emissiveIntensity: 0.25 })
      };
      this.dyn = [];
      specs.forEach(s => this.build(s));
    }
    mesh(geo, mat) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? this.mats[mat] : mat); m.castShadow = m.receiveShadow = true; return m; }
    cyl(r, len, mat, seg = 20) { return this.mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); }

    build(s) {
      const g = this.g;
      if (s.type === 'box') {
        const m = this.mesh(new THREE.BoxGeometry(s.s[0], s.s[1], s.s[2]), s.mat || 'frame');
        if (s.frame === 'p') this.dyn.push({ s, m, kind: 'pbox' });
        else { m.position.set(...s.c); if (s.rx) m.rotation.x = s.rx * D2R; }
        g.add(m);
      } else if (s.type === 'post') {
        const a = V(s.a), b = V(s.b), m = this.cyl(s.r, a.distanceTo(b), s.mat || 'frame');
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
        g.add(m);
      } else if (s.type === 'barbell') {
        const bar = new THREE.Group();
        const shaft = this.cyl(0.014, 2.2, 'steel'); shaft.rotation.z = Math.PI / 2; bar.add(shaft);
        [-1, 1].forEach(sx => {
          const sleeve = this.cyl(0.026, 0.42, 'steel'); sleeve.rotation.z = Math.PI / 2; sleeve.position.x = sx * 0.88; bar.add(sleeve);
          [0.72, 0.775].forEach((x, i) => {
            const p = this.cyl(i ? 0.2 : 0.225, 0.048, 'plate', 40); p.rotation.z = Math.PI / 2; p.position.x = sx * x; bar.add(p);
          });
          const ring = this.mesh(new THREE.TorusGeometry(0.212, 0.007, 8, 48), 'accent'); ring.rotation.y = Math.PI / 2; ring.position.x = sx * 0.695; bar.add(ring);
          const collar = this.cyl(0.036, 0.03, 'steel'); collar.rotation.z = Math.PI / 2; collar.position.x = sx * 0.815; bar.add(collar);
        });
        g.add(bar); this.dyn.push({ s, m: bar, kind: 'barbell' });
      } else if (s.type === 'dumbbells') {
        ['L', 'R'].forEach(side => {
          const db = new THREE.Group();
          const h = this.cyl(0.016, 0.14, 'steel'); h.rotation.z = Math.PI / 2; db.add(h);
          [-1, 1].forEach(sx => {
            const head = this.cyl(0.07, 0.075, 'plate', 6); head.rotation.z = Math.PI / 2; head.position.x = sx * 0.105; db.add(head);
            const ring = this.mesh(new THREE.TorusGeometry(0.06, 0.005, 6, 6), 'accent'); ring.rotation.y = Math.PI / 2; ring.position.x = sx * 0.067; db.add(ring);
          });
          g.add(db); this.dyn.push({ s, m: db, kind: 'db', side });
        });
      } else if (s.type === 'cable') {
        const line = this.cyl(0.0045, 1, 'steel', 8); g.add(line);
        const d = { s, m: line, kind: 'cable', len0: Infinity };
        if (s.stack) {
          const base = this.mesh(new THREE.BoxGeometry(0.26, 0.5, 0.1), 'stack'); base.position.set(...s.stack); g.add(base);
          d.lift = this.mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), 'stack'); g.add(d.lift);
          d.pin = this.mesh(new THREE.BoxGeometry(0.27, 0.012, 0.102), 'accent'); g.add(d.pin);
        }
        this.dyn.push(d);
      } else if (s.type === 'handle') {
        const bar = this.cyl(0.015, s.w + 0.1, 'steel'); g.add(bar);
        this.dyn.push({ s, m: bar, kind: 'handle' });
      }
    }

    grip(J, side) {                        // centre of the palm
      const L = J[side], f = L.wr.clone().sub(L.el).normalize();
      return L.wr.clone().addScaledVector(f, 0.045);
    }

    update(J) {
      const mid = () => this.grip(J, 'L').add(this.grip(J, 'R')).multiplyScalar(0.5);
      this.dyn.forEach(d => {
        if (d.kind === 'pbox') {
          d.m.quaternion.copy(J.Qp); d.m.position.copy(V(d.s.c).applyQuaternion(J.Qp).add(J.P));
        } else if (d.kind === 'barbell' || d.kind === 'handle') {
          const a = this.grip(J, 'L'), b = this.grip(J, 'R');
          d.m.position.copy(a).add(b).multiplyScalar(0.5);
          d.m.quaternion.setFromUnitVectors(d.kind === 'barbell' ? X : Y, a.sub(b).normalize());
        } else if (d.kind === 'db') {
          d.m.position.copy(this.grip(J, d.side));
          d.m.quaternion.setFromUnitVectors(X, V(d.s.axis).normalize());
        } else if (d.kind === 'cable') {
          const a = V(d.s.from), b = d.s.to === 'mid' ? mid() : this.grip(J, d.s.to);
          const len = a.distanceTo(b);
          d.m.position.copy(a).add(b).multiplyScalar(0.5);
          d.m.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
          d.m.scale.set(1, len, 1);
          if (d.lift) {
            const y = d.s.stack[1] + 0.33 + Math.max(0, len - d.len0);
            d.lift.position.set(d.s.stack[0], y, d.s.stack[2]);
            d.pin.position.set(d.s.stack[0], y - 0.03, d.s.stack[2]);
          }
          d.lenNow = len;
        }
      });
    }
    calibrate() { this.dyn.forEach(d => { if (d.kind === 'cable') d.len0 = Math.min(d.len0, d.lenNow); }); }
    dispose() { this.g.parent.remove(this.g); this.g.traverse(o => o.geometry && o.geometry.dispose()); }
  }

  /* -------------------------------------------------------------- engine */
  const E = GT.Motion3D;
  E.ready = true;
  E.timeline = timeline;

  E.init = function () {
    if (this.renderer) return true;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch (_) { this.ready = false; return false; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121314);
    scene.fog = new THREE.Fog(0x121314, 6, 15);
    this.camera = new THREE.PerspectiveCamera(27, 1, 0.1, 60);

    scene.add(new THREE.HemisphereLight(0xE6ECFF, 0x1A1B1D, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.6, 4.6, 3.2); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 14 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xDDE4FF, 0.35); fill.position.set(-3, 2, 1.5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xFF7A2E, 1.1); rim.position.set(-1.5, 2.6, -4); scene.add(rim);

    // floor + lifting platform with an orange border
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x1E2023, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.012, 2.6), new THREE.MeshStandardMaterial({ color: 0x2A2D31, roughness: 0.85 }));
    plat.position.y = -0.004; plat.receiveShadow = true; scene.add(plat);
    const edge = new THREE.MeshStandardMaterial({ color: 0xFF6B1A, emissive: 0xFF6B1A, emissiveIntensity: 0.4 });
    [[0, 1.3, 2.6, 0.02], [0, -1.3, 2.6, 0.02], [1.3, 0, 0.02, 2.6], [-1.3, 0, 0.02, 2.6]].forEach(([x, z, w, d]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, d), edge); e.position.set(x, 0, z); scene.add(e);
    });

    this.athlete = new Athlete(scene);
    return true;
  };

  E.load = function (id) {
    const m = GT.motions[id];
    if (!m || !this.init()) return false;
    if (this.id === id) return true;
    if (this.equip) this.equip.dispose();
    this.id = id; this.m = m; this.tl = timeline(m);
    this.keys = {}; Object.keys(m.keys).forEach(k => { this.keys[k] = withDefaults(m.keys[k]); });
    this.equip = new Equipment(this.scene, m.equip || []);
    Object.values(this.keys).forEach(k => { this.equip.update(solve(m, k)); this.equip.calibrate(); });
    return true;
  };

  /* state at time t (seconds, loops) */
  E.at = function (t) {
    const { phases, total } = this.tl;
    const tt = ((t % total) + total) % total;
    let i = phases.findIndex(p => tt < p.t0 + p.dur); if (i < 0) i = phases.length - 1;
    const p = phases[i], u = p.dur ? (tt - p.t0) / p.dur : 1;
    const k = p.from === p.to ? this.keys[p.to] : lerp(this.keys[p.from], this.keys[p.to], ease(u));
    const prev = phases[(i - 1 + phases.length) % phases.length];
    const effort = p.effort ? 1 : (p.hold != null && prev.effort ? 0.8 : 0);
    return { k, phase: p, index: i, u, effort, rep: Math.floor(t / total) + 1, total };
  };

  E.pose = function (t) {
    const s = this.at(t), J = solve(this.m, s.k);
    this.athlete.update(J); this.equip.update(J);
    return s;
  };

  const VIEWS = { side: -66, front: -8, '45': -40 };   // side is turned in a little so plates don't hide the lifter
  E.camera_ = function (view, orbitDeg = 0) {
    const c = this.m.cam, yaw = ((VIEWS[view] ?? -42) + orbitDeg) * D2R, el = (c.el ?? 10) * D2R, d = c.d * 1.28;   // long lens: less distortion, smaller near plate
    const t = V(c.t);
    this.camera.position.set(t.x + Math.sin(yaw) * d * Math.cos(el), t.y + Math.sin(el) * d, t.z + Math.cos(yaw) * d * Math.cos(el));
    this.camera.lookAt(t);
  };

  E.size = function (w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  };

  E.render = function () { this.renderer.render(this.scene, this.camera); };

  /* Still frame for thumbnails: the end of the first movement phase */
  E.snapshot = function (id, px = 220) {
    if (!this.load(id)) return null;
    const first = this.tl.phases.find(p => p.to !== p.from) || this.tl.phases[0];
    const s = this.at(first.t0 + first.dur - 0.001), J = solve(this.m, s.k);
    this.athlete.update(J); this.equip.update(J);
    this.athlete.highlight(this.m.muscles, 0.6);
    this.camera_(this.m.cam.thumb || '45');
    this.size(px, px);
    this.render();
    return this.renderer.domElement.toDataURL('image/jpeg', 0.86);
  };
})(window.GT);

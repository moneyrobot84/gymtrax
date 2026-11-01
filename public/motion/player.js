/* Standalone 3D form player, embedded by the React app in an iframe.
   Usage: motion/?m=<motionId>&approx=1   (approx = closest movement, different equipment) */
(function (GT) {
  const E = GT.Motion3D, q = new URLSearchParams(location.search);
  const id = q.get('m'), approx = q.get('approx') === '1';
  const app = document.getElementById('app');
  const MUSCLE = { chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps', biceps: 'Biceps', forearms: 'Forearms',
    lats: 'Lats', upperBack: 'Upper back', lowerBack: 'Lower back', core: 'Core', glutes: 'Glutes',
    quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves' };
  const m = GT.motions && GT.motions[id];
  if (!m || !E.ready || !E.load(id)) {
    app.innerHTML = '<p class="off">3D preview unavailable for this exercise.</p>';
    return;
  }
  const pv = { t: 0, speed: 1, playing: true, view: m.cam.view || '45', orbit: 0, glow: 0, last: 0, phase: -1 };
  const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">${items.map(([v, t]) =>
    `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div>`;

  app.innerHTML = `
    <div class="stage" id="stage"><span class="chip" id="phase"></span><span class="rep" id="rep"></span>
      ${approx ? '<span class="approx">Closest movement shown; same muscles, different equipment.</span>' : ''}</div>
    <p class="cue" id="cue"></p>
    <div class="row"><button type="button" id="play">Pause</button><input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Scrub one rep">
      ${seg('speed', [[0.5, '0.5×'], [1, '1×']], pv.speed)}</div>
    ${seg('view', [['side', 'Side'], ['front', 'Front'], ['45', '45°'], ['orbit', '360°']], pv.view)}
    <h3>Working muscles</h3><div class="tags">${m.muscles.map(x => `<span>${MUSCLE[x] || x}</span>`).join('')}</div>
    <h3>Tempo</h3><p class="tempo">${m.tempo}<small>lower · pause · lift · pause (seconds)</small></p>`;

  const $ = s => document.getElementById(s);
  const cv = E.renderer.domElement; cv.setAttribute('aria-label', 'Animated 3D athlete demonstrating the exercise');
  $('stage').prepend(cv);

  document.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'play') { pv.playing = !pv.playing; b.textContent = pv.playing ? 'Pause' : 'Play'; return; }
    const s = b.parentElement.dataset.seg; if (!s) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (s === 'speed') pv.speed = +b.dataset.v;
    if (s === 'view') { pv.view = b.dataset.v; pv.orbit = 0; }
  });
  $('scrub').addEventListener('input', e => {
    pv.playing = false; $('play').textContent = 'Play';
    const total = E.tl.total; pv.t = Math.floor(pv.t / total) * total + (e.target.value / 1000) * total;
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - (pv.last || now)) / 1000); pv.last = now;
    if (pv.playing) pv.t += dt * pv.speed;
    if (pv.view === 'orbit') pv.orbit += dt * 24;
    const st = $('stage'), w = st.clientWidth, h = st.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) E.size(w, h);
    const s = E.pose(pv.t);
    pv.glow += (s.effort - pv.glow) * Math.min(1, dt * 6);
    E.athlete.highlight(m.muscles, pv.glow);
    E.camera_(pv.view === 'orbit' ? '45' : pv.view, pv.view === 'orbit' ? pv.orbit : 0);
    E.render();
    if (s.index !== pv.phase) {
      pv.phase = s.index;
      $('phase').textContent = s.phase.label; $('phase').classList.toggle('effort', !!s.phase.effort);
      $('cue').textContent = s.phase.cue || '';
    }
    $('rep').textContent = 'Rep ' + s.rep;
    if (document.activeElement !== $('scrub')) $('scrub').value = Math.round(1000 * ((pv.t % s.total) / s.total));
  }
  requestAnimationFrame(frame);
})(window.GT);

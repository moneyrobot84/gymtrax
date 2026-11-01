/* ==========================================================================
   motions.js — coach-authored movement data for the 3D athlete.

   Units: metres and degrees. World: floor y = 0, athlete faces +Z,
   +X is the athlete's LEFT. Only left-side targets are written; the
   engine mirrors them to the right (x → -x) unless R is given.

   Key pose fields
     pelvis  [x,y,z]         pelvis centre (world)
     rot     [pitch,yaw,roll] body orientation; +pitch = lean forward
     spine   deg             chest vs pelvis (+ = flex forward)
     head    deg             neck (+ = chin down, − = look up)
     hands   {f, L}          wrist targets. f: 'w' world, 't' chest frame, 'p' pelvis frame
     feet    {f, L}          ankle targets (same frames)
   Motion fields
     elbowPole / kneePole    which way the joint bends (direction, left side)
     foot    'flat' | {perp:[x,y,z]}  flat on the floor, or perpendicular to the shin
     phases  [{to|hold, dur, label, cue, effort}]  one rep; loops
     muscles working muscles lit in Premium mode
     tempo   eccentric-pause-concentric-pause, in seconds
     refs    keys into GT.refs

   Angles and paths follow standard coaching cues; see GT.refs for the
   sources used (bar over mid-foot, 45–70° elbows, 15–20° RDL knee, etc.)
   ========================================================================== */
(function (GT) {
  GT.refs = {
    schoenfeld: { t: 'Schoenfeld (2010) Squatting kinematics and kinetics, J Strength Cond Res', u: 'https://www.researchgate.net/publication/41562597_Squatting_Kinematics_and_Kinetics_and_Their_Application_to_Exercise_Performance' },
    ijspt:      { t: 'A Biomechanical Review of the Squat Exercise, Int J Sports Phys Ther', u: 'https://ijspt.scholasticahq.com/article/94600-a-biomechanical-review-of-the-squat-exercise-implications-for-clinical-practice' },
    jcurve:     { t: 'The Bench Press: J-Curve or Vertical Bar Path?, Power Athlete', u: 'https://powerathletehq.com/the-bench-press-j-curve-or-vertical-bar-path/' },
    benchBws:   { t: 'How To Bench Press Based On Your Anatomy, Built With Science', u: 'https://builtwithscience.com/fitness-tips/bench-press-form/' },
    rdlPhysio:  { t: 'Romanian deadlift, Physiopedia', u: 'https://www.physio-pedia.com/Romanian_deadlift' },
    ohpLogic:   { t: 'How To Overhead Press, Barbell Logic', u: 'https://barbell-logic.com/how-to-press-a-step-by-step-tutorial/' },
    ohpSL:      { t: 'How to Overhead Press with Proper Form, StrongLifts', u: 'https://stronglifts.com/overhead-press/' }
  };

  /* ---- shared equipment pieces ---- */
  const post = (a, b, r = 0.03, mat = 'frame') => ({ type: 'post', a, b, r, mat });
  const box  = (c, s, extra = {}) => ({ type: 'box', c, s, ...extra });
  const flatBench = [
    box([0, 0.40, 0.12], [0.30, 0.10, 1.25], { mat: 'pad' }),
    post([0, 0, -0.35], [0, 0.35, -0.35], 0.03), post([0, 0, 0.6], [0, 0.35, 0.6], 0.03),
    post([-0.18, 0.02, -0.35], [0.18, 0.02, -0.35], 0.025), post([-0.18, 0.02, 0.6], [0.18, 0.02, 0.6], 0.025)
  ];
  const inclineBench = back => [
    box([0, 0.40, 0.20], [0.30, 0.10, 0.42], { mat: 'pad' }),
    box([0, 0.616, -0.20], [0.30, 0.08, 0.78], { mat: 'pad', rx: back }),
    post([0, 0, 0.25], [0, 0.35, 0.25], 0.03), post([0, 0, -0.35], [0, 0.45, -0.35], 0.03),
    post([-0.2, 0.02, -0.35], [0.2, 0.02, -0.35], 0.025), post([-0.2, 0.02, 0.35], [0.2, 0.02, 0.35], 0.025)
  ];
  const rack = z => [
    post([0.55, 0, z], [0.55, 1.45, z], 0.035), post([-0.55, 0, z], [-0.55, 1.45, z], 0.035),
    box([0.55, 1.12, z + 0.05], [0.07, 0.04, 0.1], { mat: 'frame' }), box([-0.55, 1.12, z + 0.05], [0.07, 0.04, 0.1], { mat: 'frame' })
  ];
  const tower = (x, z, w = 0.42) => [
    box([x, 1.05, z], [w, 2.1, 0.26], { mat: 'tower' })
  ];

  GT.motions = {
    /* ------------------------------------------------------------ SQUAT */
    squat: {
      cam: { t: [0, 0.95, 0], d: 3.3, view: 'side' },
      equip: [{ type: 'barbell' }],
      elbowPole: { f: 't', L: [0.4, -1, -0.8] }, kneePole: { f: 'w', L: [0.45, 0, 1] }, footYaw: 20,
      keys: {
        top:    { pelvis: [0, 0.965, -0.02], rot: [8, 0, 0],  head: -6,  hands: { f: 't', L: [0.42, 0.455, -0.085] }, feet: { f: 'w', L: [0.17, 0.08, 0] } },
        bottom: { pelvis: [0, 0.43, -0.17],  rot: [40, 0, 0], head: -24, hands: { f: 't', L: [0.42, 0.455, -0.085] }, feet: { f: 'w', L: [0.17, 0.08, 0] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.2, label: 'Descend', cue: 'Brace, then break at hips and knees together. Knees track over the toes.' },
        { hold: 0.3, label: 'Bottom', cue: 'Hip crease just below the knee. Bar stays over mid-foot.' },
        { to: 'top', dur: 1.1, effort: 1, label: 'Drive', cue: 'Push the floor away. Chest and hips rise at the same speed.' },
        { hold: 0.8, label: 'Lockout', cue: 'Stand tall, breathe, re-brace for the next rep.' }
      ],
      muscles: ['quads', 'glutes', 'core', 'lowerBack'], tempo: '2 · 0 · 1 · 1', refs: ['schoenfeld', 'ijspt']
    },

    /* ------------------------------------------------------ BENCH PRESS */
    bench: {
      cam: { t: [0, 0.75, 0.25], d: 3.2, view: 'side' },
      equip: [...flatBench, ...rack(-0.2), { type: 'barbell' }],
      elbowPole: { f: 'w', L: [1, -1, 0.5] }, kneePole: { f: 'w', L: [0.3, 1, 0.2] },
      keys: {
        top:    { pelvis: [0, 0.56, 0.35], rot: [-90, 0, 0], hands: { f: 'w', L: [0.40, 1.04, -0.10] }, feet: { f: 'w', L: [0.30, 0.08, 0.80] } },
        bottom: { pelvis: [0, 0.56, 0.35], rot: [-90, 0, 0], hands: { f: 'w', L: [0.40, 0.70, 0.05] },  feet: { f: 'w', L: [0.30, 0.08, 0.80] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.0, label: 'Lower', cue: 'Bar travels down and toward the lower sternum. Elbows 45–70° from the torso.' },
        { hold: 0.3, label: 'Touch', cue: 'Light touch, stay tight. No bounce.' },
        { to: 'top', dur: 1.0, effort: 1, label: 'Press', cue: 'Press up and back so the bar finishes over the shoulders (the J-curve).' },
        { hold: 0.7, label: 'Lockout', cue: 'Shoulder blades stay pinched, feet drive into the floor.' }
      ],
      muscles: ['chest', 'shoulders', 'triceps'], tempo: '2 · 0 · 1 · 1', refs: ['jcurve', 'benchBws']
    },

    /* ------------------------------------------------ ROMANIAN DEADLIFT */
    rdl: {
      cam: { t: [0, 0.85, 0], d: 3.2, view: 'side' },
      equip: [{ type: 'barbell' }],
      elbowPole: { f: 'w', L: [0.3, 0, -1] }, kneePole: { f: 'w', L: [0.1, 0, 1] },
      keys: {
        top:    { pelvis: [0, 0.965, 0],   rot: [2, 0, 0],  head: 0, hands: { f: 'w', L: [0.24, 0.89, 0.12] }, feet: { f: 'w', L: [0.12, 0.08, 0] } },
        bottom: { pelvis: [0, 0.90, -0.24], rot: [68, 0, 0], head: 0, hands: { f: 'w', L: [0.24, 0.56, 0.13] }, feet: { f: 'w', L: [0.12, 0.08, 0] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.5, label: 'Hinge', cue: 'Push the hips straight back. Bar slides down the thighs, knees stay soft (15–20°).' },
        { hold: 0.3, label: 'Stretch', cue: 'Hamstrings loaded, back flat. Stop before the spine rounds.' },
        { to: 'top', dur: 1.2, effort: 1, label: 'Drive', cue: 'Squeeze the glutes and bring the hips through to stand.' },
        { hold: 0.7, label: 'Top', cue: 'Stand tall, no leaning back.' }
      ],
      muscles: ['hamstrings', 'glutes', 'lowerBack'], tempo: '3 · 0 · 1 · 1', refs: ['rdlPhysio']
    },

    /* ------------------------------------------------ ASSISTED PULL-UP */
    pullup: {
      cam: { t: [0, 1.5, 0], d: 3.7, view: '45' },
      equip: [
        post([0.62, 0, 0.02], [0.62, 2.45, 0.02], 0.04), post([-0.62, 0, 0.02], [-0.62, 2.45, 0.02], 0.04),
        post([-0.62, 2.22, 0.02], [0.62, 2.22, 0.02], 0.018, 'steel'),
        box([0, -0.54, 0.03], [0.42, 0.07, 0.22], { frame: 'p', mat: 'pad' })
      ],
      elbowPole: { f: 'w', L: [1, -0.6, -0.3] }, kneePole: { f: 'p', L: [0, 0, 1] }, foot: { perp: [0, -1, 0] },
      keys: {
        hang: { pelvis: [0, 1.24, 0.0], rot: [-4, 0, 0],  head: 0,  hands: { f: 'w', L: [0.38, 2.22, 0.02] }, feet: { f: 'p', L: [0.10, -0.50, -0.36] } },
        top:  { pelvis: [0, 1.55, 0.03], rot: [-14, 0, 0], head: -8, hands: { f: 'w', L: [0.38, 2.22, 0.02] }, feet: { f: 'p', L: [0.10, -0.50, -0.36] } }
      },
      start: 'hang',
      phases: [
        { to: 'top', dur: 1.2, effort: 1, label: 'Pull', cue: 'Pull the elbows down to the ribs and bring the chest to the bar.' },
        { hold: 0.4, label: 'Top', cue: 'Chin over the bar, shoulders down away from the ears.' },
        { to: 'hang', dur: 2.2, label: 'Lower', cue: 'Lower under control all the way to a full hang.' },
        { hold: 0.5, label: 'Hang', cue: 'Shoulders packed. More assist kg = more help.' }
      ],
      muscles: ['lats', 'biceps', 'upperBack'], tempo: '2 · 1 · 1 · 0'
    },

    /* ----------------------------------------------- SEATED CABLE ROW */
    cablerow: {
      cam: { t: [0, 0.8, 0.35], d: 3.3, view: 'side', thumb: 'side' },
      equip: [
        box([0, 0.25, -0.05], [0.30, 0.34, 0.80], { mat: 'pad' }),
        box([0, 0.30, 0.80], [0.50, 0.36, 0.04], { mat: 'frame', rx: -15 }),
        ...tower(0, 1.30),
        box([0, 0.45, 1.12], [0.08, 0.08, 0.08], { mat: 'steel' }),
        { type: 'cable', from: [0, 0.45, 1.10], to: 'mid', stack: [0, 0.35, 1.19] },
        { type: 'handle', w: 0.12 }
      ],
      elbowPole: { f: 'w', L: [0.35, -0.4, -1] }, kneePole: { f: 'w', L: [0.3, 1, 0.3] }, foot: { perp: [0, 1, 0] },
      keys: {
        stretch: { pelvis: [0, 0.52, 0], rot: [18, 0, 0], head: 0, hands: { f: 'w', L: [0.06, 0.66, 0.60] }, feet: { f: 'w', L: [0.13, 0.28, 0.74] } },
        squeeze: { pelvis: [0, 0.52, 0], rot: [-6, 0, 0], head: 0, hands: { f: 'w', L: [0.06, 0.70, 0.24] }, feet: { f: 'w', L: [0.13, 0.28, 0.74] } }
      },
      start: 'stretch',
      phases: [
        { to: 'squeeze', dur: 1.0, effort: 1, label: 'Row', cue: 'Drive the elbows back and pull the handle to your belly button.' },
        { hold: 0.5, label: 'Squeeze', cue: 'Squeeze the shoulder blades together, chest tall.' },
        { to: 'stretch', dur: 2.0, label: 'Return', cue: 'Let the arms extend and the shoulder blades spread. Don’t rock.' },
        { hold: 0.3, label: 'Stretch', cue: 'Small forward lean only, spine stays long.' }
      ],
      muscles: ['lats', 'upperBack', 'biceps'], tempo: '2 · 0 · 1 · 1'
    },

    /* ---------------------------------------------------- BARBELL ROW */
    rows: {
      cam: { t: [0, 0.85, 0.05], d: 3.2, view: 'side' },
      equip: [{ type: 'barbell' }],
      elbowPole: { f: 'w', L: [0.35, 1, -0.7] }, kneePole: { f: 'w', L: [0.15, 0, 1] },
      keys: {
        hang: { pelvis: [0, 0.86, -0.14], rot: [58, 0, 0], head: 4, hands: { f: 'w', L: [0.26, 0.57, 0.27] }, feet: { f: 'w', L: [0.14, 0.08, 0] } },
        top:  { pelvis: [0, 0.86, -0.14], rot: [56, 0, 0], head: 4, hands: { f: 'w', L: [0.26, 0.84, 0.19] }, feet: { f: 'w', L: [0.14, 0.08, 0] } }
      },
      start: 'hang',
      phases: [
        { to: 'top', dur: 0.9, effort: 1, label: 'Row', cue: 'Pull the bar to the lower ribs, elbows driving back.' },
        { hold: 0.4, label: 'Squeeze', cue: 'Squeeze the shoulder blades. Torso angle does not change.' },
        { to: 'hang', dur: 1.8, label: 'Lower', cue: 'Lower to full arm length under control.' },
        { hold: 0.3, label: 'Reset', cue: 'Back flat, hinge held, core braced.' }
      ],
      muscles: ['lats', 'upperBack', 'biceps', 'lowerBack'], tempo: '2 · 0 · 1 · 0'
    },

    /* --------------------------------------------- INCLINE DB PRESS */
    incdb: {
      cam: { t: [0, 0.85, 0], d: 3.1, view: 'side' },
      equip: [...inclineBench(35), { type: 'dumbbells', axis: [1, 0, 0] }],
      elbowPole: { f: 'w', L: [1, -1, -0.3] }, kneePole: { f: 'w', L: [0.2, 1, 0.3] },
      keys: {
        top:    { pelvis: [0, 0.55, 0.12], rot: [-55, 0, 0], hands: { f: 'w', L: [0.20, 1.33, -0.22] }, feet: { f: 'w', L: [0.25, 0.08, 0.62] } },
        bottom: { pelvis: [0, 0.55, 0.12], rot: [-55, 0, 0], hands: { f: 'w', L: [0.36, 0.90, -0.15] }, feet: { f: 'w', L: [0.25, 0.08, 0.62] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.0, label: 'Lower', cue: 'Lower to the sides of the upper chest, elbows slightly tucked.' },
        { hold: 0.2, label: 'Stretch', cue: 'Feel the stretch across the upper chest.' },
        { to: 'top', dur: 1.0, effort: 1, label: 'Press', cue: 'Press up and slightly in until the dumbbells are over the shoulders.' },
        { hold: 0.6, label: 'Top', cue: 'Shoulders stay down, don’t shrug.' }
      ],
      muscles: ['chest', 'shoulders', 'triceps'], tempo: '2 · 0 · 1 · 1'
    },

    /* ---------------------------------------------- CABLE CHEST FLY */
    fly: {
      cam: { t: [0, 1.15, 0], d: 3.8, view: '45' },
      equip: [
        ...tower(1.25, -0.05, 0.28), ...tower(-1.25, -0.05, 0.28),
        { type: 'cable', from: [1.08, 1.80, -0.05], to: 'L', stack: [1.25, 0.35, 0.10] },
        { type: 'cable', from: [-1.08, 1.80, -0.05], to: 'R', stack: [-1.25, 0.35, 0.10] }
      ],
      elbowPole: { f: 'w', L: [0.2, -0.2, -1] }, kneePole: { f: 'w', L: [0.2, 0, 1] },
      keys: {
        open:  { pelvis: [0, 0.965, -0.02], rot: [14, 0, 0], head: -8, hands: { f: 'w', L: [0.68, 1.34, 0.10] }, feet: { f: 'w', L: [0.14, 0.08, 0] } },
        close: { pelvis: [0, 0.965, -0.02], rot: [14, 0, 0], head: -8, hands: { f: 'w', L: [0.09, 1.16, 0.54] }, feet: { f: 'w', L: [0.14, 0.08, 0] } }
      },
      start: 'open',
      phases: [
        { to: 'close', dur: 1.0, effort: 1, label: 'Squeeze', cue: 'Hug a big tree. Hands meet in front of the lower chest.' },
        { hold: 0.4, label: 'Hold', cue: 'Squeeze the chest, elbow bend stays fixed.' },
        { to: 'open', dur: 2.0, label: 'Open', cue: 'Open under control until you feel a stretch across the chest.' },
        { hold: 0.3, label: 'Stretch', cue: 'Slight forward lean, shoulders down.' }
      ],
      muscles: ['chest', 'shoulders'], tempo: '2 · 0 · 1 · 1'
    },

    /* --------------------------------------------- TRICEPS PUSHDOWN */
    pushdown: {
      cam: { t: [0, 1.1, 0.2], d: 3.2, view: 'side', thumb: 'side' },
      equip: [
        ...tower(0, 0.64), box([0, 2.0, 0.47], [0.08, 0.08, 0.08], { mat: 'steel' }),
        { type: 'cable', from: [0, 2.0, 0.45], to: 'mid', stack: [0, 0.35, 0.50] },
        { type: 'handle', w: 0.30 }
      ],
      elbowPole: { f: 'w', L: [0.1, -0.3, -1] }, kneePole: { f: 'w', L: [0.2, 0, 1] },
      keys: {
        top:    { pelvis: [0, 0.965, -0.02], rot: [10, 0, 0], head: 4, hands: { f: 'w', L: [0.12, 1.24, 0.30] }, feet: { f: 'w', L: [0.14, 0.08, 0] } },
        bottom: { pelvis: [0, 0.965, -0.02], rot: [10, 0, 0], head: 4, hands: { f: 'w', L: [0.13, 0.90, 0.16] }, feet: { f: 'w', L: [0.14, 0.08, 0] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 0.9, effort: 1, label: 'Push', cue: 'Elbows pinned to your sides. Push down to a full lockout.' },
        { hold: 0.4, label: 'Lockout', cue: 'Squeeze the triceps hard.' },
        { to: 'top', dur: 1.8, label: 'Return', cue: 'Let the bar rise to chest height. Only the forearms move.' },
        { hold: 0.2, label: 'Top', cue: 'Don’t let the stack yank the elbows forward.' }
      ],
      muscles: ['triceps'], tempo: '2 · 0 · 1 · 1'
    },

    /* ------------------------------------------------ OVERHEAD PRESS */
    ohp: {
      cam: { t: [0, 1.25, 0], d: 3.4, view: 'side' },
      equip: [{ type: 'barbell' }],
      elbowPole: { f: 'w', L: [0.35, -1, 0.9] }, kneePole: { f: 'w', L: [0.2, 0, 1] },
      keys: {
        rack: { pelvis: [0, 0.965, 0], rot: [-2, 0, 0], head: 0,   hands: { f: 'w', L: [0.25, 1.40, 0.13] }, feet: { f: 'w', L: [0.14, 0.08, 0] } },
        mid:  { pelvis: [0, 0.965, 0], rot: [-3, 0, 0], head: -14, hands: { f: 'w', L: [0.25, 1.66, 0.08] }, feet: { f: 'w', L: [0.14, 0.08, 0] } },
        top:  { pelvis: [0, 0.965, 0], rot: [0, 0, 0],  head: 2,   hands: { f: 'w', L: [0.25, 1.96, 0.0] },  feet: { f: 'w', L: [0.14, 0.08, 0] } }
      },
      start: 'rack',
      phases: [
        { to: 'mid', dur: 0.5, effort: 1, label: 'Press', cue: 'Glutes and abs tight. Pull the head back and press straight up past the chin.' },
        { to: 'top', dur: 0.6, effort: 1, label: 'Head through', cue: 'Head through the window. Lock out with the bar over mid-foot.' },
        { hold: 0.6, label: 'Lockout', cue: 'Biceps by the ears, ribs down, no lean back.' },
        { to: 'mid', dur: 1.0, label: 'Lower', cue: 'Lower in a straight line, head moves back again.' },
        { to: 'rack', dur: 0.8, label: 'Rack', cue: 'Bar back on the front delts, elbows slightly forward.' },
        { hold: 0.4, label: 'Reset', cue: 'Breathe and brace.' }
      ],
      muscles: ['shoulders', 'triceps', 'core'], tempo: '2 · 0 · 1 · 1', refs: ['ohpLogic', 'ohpSL']
    },

    /* ------------------------------------------ INCLINE BENCH PRESS */
    incbb: {
      cam: { t: [0, 0.9, -0.05], d: 3.2, view: 'side' },
      equip: [...inclineBench(35), ...rack(-0.58), { type: 'barbell' }],
      elbowPole: { f: 'w', L: [1, -1, -0.2] }, kneePole: { f: 'w', L: [0.2, 1, 0.3] },
      keys: {
        top:    { pelvis: [0, 0.55, 0.12], rot: [-55, 0, 0], hands: { f: 'w', L: [0.38, 1.32, -0.22] }, feet: { f: 'w', L: [0.25, 0.08, 0.62] } },
        bottom: { pelvis: [0, 0.55, 0.12], rot: [-55, 0, 0], hands: { f: 'w', L: [0.38, 0.93, -0.13] }, feet: { f: 'w', L: [0.25, 0.08, 0.62] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.0, label: 'Lower', cue: 'Lower to the upper chest, just under the collarbone.' },
        { hold: 0.3, label: 'Touch', cue: 'Forearms vertical at the bottom.' },
        { to: 'top', dur: 1.0, effort: 1, label: 'Press', cue: 'Press up to lockout over the shoulders.' },
        { hold: 0.6, label: 'Lockout', cue: 'Shoulder blades stay tucked.' }
      ],
      muscles: ['chest', 'shoulders', 'triceps'], tempo: '2 · 0 · 1 · 1', refs: ['benchBws']
    },

    /* ------------------------------------------ NARROW GRIP PULLDOWN */
    pulldown: {
      cam: { t: [0, 1.2, 0], d: 3.5, view: 'side' },
      equip: [
        box([0, 0.28, 0], [0.34, 0.36, 0.40], { mat: 'pad' }),
        box([0, 0.80, 0.26], [0.40, 0.08, 0.14], { mat: 'pad' }),
        ...tower(0, -0.34, 0.5),
        post([0, 2.35, -0.34], [0, 2.35, 0.14], 0.04), box([0, 2.30, 0.12], [0.08, 0.08, 0.08], { mat: 'steel' }),
        { type: 'cable', from: [0, 2.30, 0.12], to: 'mid', stack: [0, 0.35, -0.25] },
        { type: 'handle', w: 0.12 }
      ],
      elbowPole: { f: 'w', L: [0.3, -1, -0.6] }, kneePole: { f: 'w', L: [0.2, 0.5, 1] },
      keys: {
        up:   { pelvis: [0, 0.56, 0], rot: [-12, 0, 0], head: -10, hands: { f: 'w', L: [0.07, 1.50, 0.12] }, feet: { f: 'w', L: [0.14, 0.08, 0.48] } },
        down: { pelvis: [0, 0.56, 0], rot: [-18, 0, 0], head: -6,  hands: { f: 'w', L: [0.07, 1.09, 0.10] }, feet: { f: 'w', L: [0.14, 0.08, 0.48] } }
      },
      start: 'up',
      phases: [
        { to: 'down', dur: 1.0, effort: 1, label: 'Pull', cue: 'Chest up, pull the handle to the upper chest, elbows down and in.' },
        { hold: 0.4, label: 'Squeeze', cue: 'Squeeze the lats, shoulders away from the ears.' },
        { to: 'up', dur: 2.0, label: 'Return', cue: 'Let the arms rise until the lats fully stretch.' },
        { hold: 0.3, label: 'Stretch', cue: 'Slight lean back only.' }
      ],
      muscles: ['lats', 'biceps', 'upperBack'], tempo: '2 · 0 · 1 · 1'
    },

    /* -------------------------------------------- REAR DELT RAISES */
    rear: {
      cam: { t: [0, 0.9, 0.1], d: 3.3, view: '45' },
      equip: [{ type: 'dumbbells', axis: [0, 0, 1] }],
      elbowPole: { f: 'w', L: [0.3, 0.4, -1] }, kneePole: { f: 'w', L: [0.15, 0, 1] },
      keys: {
        hang: { pelvis: [0, 0.88, -0.16], rot: [70, 0, 0], head: 0, hands: { f: 'w', L: [0.13, 0.52, 0.30] }, feet: { f: 'w', L: [0.12, 0.08, 0] } },
        up:   { pelvis: [0, 0.88, -0.16], rot: [70, 0, 0], head: 0, hands: { f: 'w', L: [0.70, 0.97, 0.26] }, feet: { f: 'w', L: [0.12, 0.08, 0] } }
      },
      start: 'hang',
      phases: [
        { to: 'up', dur: 1.0, effort: 1, label: 'Raise', cue: 'Raise out wide with soft elbows, pinkies leading.' },
        { hold: 0.4, label: 'Hold', cue: 'Squeeze the rear delts. No shrugging.' },
        { to: 'hang', dur: 2.0, label: 'Lower', cue: 'Lower slowly. Torso stays still.' },
        { hold: 0.2, label: 'Reset', cue: 'Flat back, hinge held.' }
      ],
      muscles: ['shoulders', 'upperBack'], tempo: '2 · 0 · 1 · 1'
    },

    /* ------------------------------------------------- BICEP CURLS */
    curl: {
      cam: { t: [0, 1.1, 0], d: 3.1, view: 'side' },
      equip: [{ type: 'dumbbells', axis: [1, 0, 0] }],
      elbowPole: { f: 'w', L: [0.1, -1, -0.25] }, kneePole: { f: 'w', L: [0.2, 0, 1] },
      keys: {
        down: { pelvis: [0, 0.965, 0], rot: [0, 0, 0], head: 4, hands: { f: 'w', L: [0.21, 0.92, 0.07] }, feet: { f: 'w', L: [0.13, 0.08, 0] } },
        up:   { pelvis: [0, 0.965, 0], rot: [0, 0, 0], head: 4, hands: { f: 'w', L: [0.21, 1.28, 0.20] }, feet: { f: 'w', L: [0.13, 0.08, 0] } }
      },
      start: 'down',
      phases: [
        { to: 'up', dur: 1.0, effort: 1, label: 'Curl', cue: 'Curl without swinging. Elbows stay at your sides.' },
        { hold: 0.4, label: 'Squeeze', cue: 'Squeeze the biceps at the top.' },
        { to: 'down', dur: 2.2, label: 'Lower', cue: 'Lower slowly to a full stretch.' },
        { hold: 0.2, label: 'Bottom', cue: 'Arms straight, shoulders back.' }
      ],
      muscles: ['biceps', 'forearms'], tempo: '2 · 0 · 1 · 0'
    },

    /* --------------------------------------------- FLAT DB PRESS */
    dbpress: {
      cam: { t: [0, 0.75, 0.25], d: 3.2, view: 'side' },
      equip: [...flatBench, { type: 'dumbbells', axis: [1, 0, 0] }],
      elbowPole: { f: 'w', L: [1, -1, 0.4] }, kneePole: { f: 'w', L: [0.3, 1, 0.2] },
      keys: {
        top:    { pelvis: [0, 0.56, 0.35], rot: [-90, 0, 0], hands: { f: 'w', L: [0.15, 1.07, -0.08] }, feet: { f: 'w', L: [0.30, 0.08, 0.80] } },
        bottom: { pelvis: [0, 0.56, 0.35], rot: [-90, 0, 0], hands: { f: 'w', L: [0.36, 0.70, 0.04] },  feet: { f: 'w', L: [0.30, 0.08, 0.80] } }
      },
      start: 'top',
      phases: [
        { to: 'bottom', dur: 2.0, label: 'Lower', cue: 'Lower until the dumbbells are level with the chest.' },
        { hold: 0.2, label: 'Stretch', cue: 'Shoulder blades tucked, slight arch.' },
        { to: 'top', dur: 1.0, effort: 1, label: 'Press', cue: 'Press up and slightly in. Don’t clang them together.' },
        { hold: 0.6, label: 'Top', cue: 'Control the lockout.' }
      ],
      muscles: ['chest', 'shoulders', 'triceps'], tempo: '2 · 0 · 1 · 1'
    },

    /* --------------------------------------- DB SHOULDER PRESS */
    dbohp: {
      cam: { t: [0, 1.1, 0], d: 3.2, view: '45' },
      equip: [
        box([0, 0.25, 0.08], [0.32, 0.40, 0.36], { mat: 'pad' }),
        box([0, 0.85, -0.14], [0.30, 0.75, 0.08], { mat: 'pad', rx: -8 }),
        post([0, 0, -0.2], [0, 0.5, -0.2], 0.03),
        { type: 'dumbbells', axis: [1, 0, 0] }
      ],
      elbowPole: { f: 'w', L: [1, -1, 0.3] }, kneePole: { f: 'w', L: [0.25, 0.5, 1] },
      keys: {
        bottom: { pelvis: [0, 0.55, 0.05], rot: [-8, 0, 0], hands: { f: 'w', L: [0.36, 1.10, 0.06] }, feet: { f: 'w', L: [0.24, 0.08, 0.50] } },
        top:    { pelvis: [0, 0.55, 0.05], rot: [-8, 0, 0], hands: { f: 'w', L: [0.16, 1.54, -0.02] }, feet: { f: 'w', L: [0.24, 0.08, 0.50] } }
      },
      start: 'bottom',
      phases: [
        { to: 'top', dur: 1.0, effort: 1, label: 'Press', cue: 'Press up without arching. Elbows slightly in front of the body.' },
        { hold: 0.4, label: 'Top', cue: 'Dumbbells over the shoulders, no shrug.' },
        { to: 'bottom', dur: 2.0, label: 'Lower', cue: 'Lower to ear level under control.' },
        { hold: 0.3, label: 'Bottom', cue: 'Back stays on the pad, core braced.' }
      ],
      muscles: ['shoulders', 'triceps'], tempo: '2 · 0 · 1 · 0'
    }
  };
})(window.GT);

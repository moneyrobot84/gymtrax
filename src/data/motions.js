// Maps each exercise id to a 3D motion in public/motion/motions.js (ported from GymTrax Beta).
// approx: true = closest movement with different equipment (same working muscles).
export const MOTION = {
  'barbell-squat': { m: 'squat' },
  'db-goblet-squat': { m: 'squat', approx: true },
  'barbell-bench': { m: 'bench' },
  'barbell-bench-5': { m: 'bench' },
  'db-bench': { m: 'dbpress' },
  'db-bench-6': { m: 'dbpress' },
  'db-flat-press': { m: 'dbpress' },
  'barbell-rdl': { m: 'rdl' },
  'db-rdl': { m: 'rdl', approx: true },
  'assisted-pullup': { m: 'pullup' },
  'cable-row': { m: 'cablerow' },
  'barbell-row': { m: 'rows' },
  'db-two-arm-row': { m: 'rows', approx: true },
  'db-one-arm-row': { m: 'rows', approx: true },
  'db-chest-sup-row': { m: 'rows', approx: true },
  'incline-db-press': { m: 'incdb' },
  'incline-db-neutral': { m: 'incdb' },
  'db-incline-press': { m: 'incdb' },
  'barbell-incline': { m: 'incbb' },
  'cable-fly': { m: 'fly' },
  'db-flat-fly': { m: 'fly', approx: true },
  'triceps-pushdown': { m: 'pushdown' },
  'barbell-ohp': { m: 'ohp' },
  'db-shoulder-press': { m: 'dbohp' },
  'db-std-shoulder-press': { m: 'dbohp' },
  'narrow-pulldown': { m: 'pulldown' },
  'rear-delt-raise': { m: 'rear' },
  'db-rev-fly': { m: 'rear' },
  'db-curl': { m: 'curl' },
};

export function motionUrl(exId) {
  const x = MOTION[exId];
  if (!x) return null;
  return `${import.meta.env.BASE_URL}motion/?m=${x.m}${x.approx ? '&approx=1' : ''}`;
}

const MUSCLES = {"squat":["quads","glutes","core","lowerBack"],"bench":["chest","shoulders","triceps"],"rdl":["hamstrings","glutes","lowerBack"],"pullup":["lats","biceps","upperBack"],"cablerow":["lats","upperBack","biceps"],"rows":["lats","upperBack","biceps","lowerBack"],"incdb":["chest","shoulders","triceps"],"fly":["chest","shoulders"],"pushdown":["triceps"],"ohp":["shoulders","triceps","core"],"incbb":["chest","shoulders","triceps"],"pulldown":["lats","biceps","upperBack"],"rear":["shoulders","upperBack"],"curl":["biceps","forearms"],"dbpress":["chest","shoulders","triceps"],"dbohp":["shoulders","triceps"]};
const LABEL = { chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps', biceps: 'Biceps', forearms: 'Forearms',
  lats: 'Lats', upperBack: 'Upper back', lowerBack: 'Lower back', core: 'Core', glutes: 'Glutes',
  quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves' };
// Extra muscles for exercises whose closest 3D motion differs.
const OVERRIDE = { 'db-overhead-tri': ['triceps'], 'db-pullover': ['lats', 'chest', 'triceps'], 'db-one-arm-row': ['lats', 'upperBack', 'biceps'], 'db-chest-sup-row': ['upperBack', 'lats', 'biceps'] };

export function musclesFor(exId) {
  const list = OVERRIDE[exId] || (MOTION[exId] && MUSCLES[MOTION[exId].m]) || [];
  return list.map(x => LABEL[x] || x);
}

// All exercises and seeded routines. Each exercise is self-contained with its
// metadata; routines reference exercises by id. Each routine slot has a
// `primary` (barbell / machine / cable) and `alt` (dumbbell variant).
//
// kind controls how volume is calculated and whether the plate calc shows:
//   barbell  -> weight * reps, plate calc visible
//   dumbbell -> weight_per_db * 2 * reps, plate calc hidden
//   dumbbellOneArm -> weight * reps * 2 arms (reps are per arm), plate calc hidden
//   cable / machine / bodyweight -> weight * reps, plate calc hidden

export const EX = {
  // ---------- FULL BODY ----------
  'barbell-squat': {
    id: 'barbell-squat', name: 'Barbell Squats', kind: 'barbell',
    muscleGroup: 'Legs', rest: 150, pattern: 'squat',
    cues: ['Brace core, chest up before unracking', 'Break at hips and knees together', 'Drive the floor away, knees tracking toes'],
    yt: 'barbell back squat form',
  },
  'db-goblet-squat': {
    id: 'db-goblet-squat', name: 'Dumbbell Goblet Squat', kind: 'dumbbell',
    muscleGroup: 'Legs', rest: 120, pattern: 'squat',
    cues: ['Hold DB vertical at chest, elbows tucked', 'Sit between heels, knees out', 'Keep torso tall, drive up through midfoot'],
    yt: 'dumbbell goblet squat form',
  },

  'barbell-bench': {
    id: 'barbell-bench', name: 'Barbell Bench Press', kind: 'barbell',
    muscleGroup: 'Chest', rest: 150, pattern: 'bench',
    cues: ['Shoulder blades retracted and down', 'Bar to lower chest, elbows ~70°', 'Press up and slightly back toward face'],
    yt: 'barbell bench press form',
  },
  'db-bench': {
    id: 'db-bench', name: 'Dumbbell Bench Press', kind: 'dumbbell',
    muscleGroup: 'Chest', rest: 120, pattern: 'bench',
    cues: ['Set shoulder blades, feet planted', 'Lower until elbows below bench, 45° flare', 'Press up with triceps and chest, no clang'],
    yt: 'dumbbell bench press form',
  },

  'barbell-rdl': {
    id: 'barbell-rdl', name: 'Romanian Deadlift', kind: 'barbell',
    muscleGroup: 'Hamstrings / Glutes', rest: 150, pattern: 'hinge',
    cues: ['Soft knees, hinge from hips', 'Bar close to shins / thighs', 'Squeeze glutes to lock out, no overextend'],
    yt: 'romanian deadlift form',
  },
  'db-rdl': {
    id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', kind: 'dumbbell',
    muscleGroup: 'Hamstrings / Glutes', rest: 120, pattern: 'hinge',
    cues: ['DBs in front of thighs, soft knees', 'Push hips back, DBs slide down legs', 'Feel hamstrings stretch, drive hips through'],
    yt: 'dumbbell romanian deadlift form',
  },

  'assisted-pullup': {
    id: 'assisted-pullup', name: 'Assisted Pull-ups', kind: 'machine',
    muscleGroup: 'Back / Lats', rest: 120, pattern: 'pullup',
    cues: ['Grip just outside shoulders, palms away', 'Pull elbows down to ribs, chest to bar', 'Control the descent, full stretch at bottom'],
    yt: 'assisted pull up form',
  },
  'db-one-arm-row': {
    id: 'db-one-arm-row', name: 'One-Arm Dumbbell Row', kind: 'dumbbellOneArm',
    muscleGroup: 'Back / Lats', rest: 90, pattern: 'row',
    cues: ['Flat back, free hand on bench', 'Pull DB to hip, elbow close to body', 'Full stretch down, no twisting the torso'],
    yt: 'one arm dumbbell row form',
  },

  'cable-row': {
    id: 'cable-row', name: 'Seated Cable Rows', kind: 'cable',
    muscleGroup: 'Back / Mid-back', rest: 90, pattern: 'row',
    cues: ['Chest tall, slight lean back', 'Pull handle to lower ribs', 'Squeeze shoulder blades, slow return'],
    yt: 'seated cable row form',
  },
  'db-chest-sup-row': {
    id: 'db-chest-sup-row', name: 'Chest-Supported DB Row', kind: 'dumbbell',
    muscleGroup: 'Back / Mid-back', rest: 90, pattern: 'row',
    cues: ['Lie chest-down on incline bench', 'Row DBs to hips, elbows ~45°', 'Pause, squeeze mid-back, lower slow'],
    yt: 'chest supported dumbbell row incline bench',
  },

  // ---------- UPPER BODY A ----------
  'barbell-bench-5': {
    id: 'barbell-bench-5', name: 'Bench Press (Heavy)', kind: 'barbell',
    muscleGroup: 'Chest', rest: 150, pattern: 'bench',
    cues: ['Tight upper-back arch, feet drive floor', 'Bar touches lower chest', 'Press without losing arch'],
    yt: 'heavy bench press 5x5 form',
  },
  'db-bench-6': {
    id: 'db-bench-6', name: 'Dumbbell Bench Press', kind: 'dumbbell',
    muscleGroup: 'Chest', rest: 120, pattern: 'bench',
    cues: ['Shoulder blades set, chest up', 'DBs just above lower chest at bottom', 'Press and slightly in, no clang'],
    yt: 'dumbbell bench press heavy',
  },

  'barbell-row': {
    id: 'barbell-row', name: 'Barbell Rows', kind: 'barbell',
    muscleGroup: 'Back / Lats', rest: 120, pattern: 'row',
    cues: ['Hinge ~45°, flat back', 'Pull bar to lower ribs/upper waist', 'Elbows drive back, no body jerk'],
    yt: 'bent over barbell row form',
  },
  'db-two-arm-row': {
    id: 'db-two-arm-row', name: 'Two-Arm DB Bent-Over Row', kind: 'dumbbell',
    muscleGroup: 'Back / Lats', rest: 90, pattern: 'row',
    cues: ['Hinge ~45°, DBs hang below shoulders', 'Row both DBs to hips, elbows close', 'Flat back, no shrugging'],
    yt: 'two arm dumbbell bent over row',
  },

  'incline-db-press': {
    id: 'incline-db-press', name: 'Incline DB Press', kind: 'dumbbell',
    muscleGroup: 'Upper Chest / Shoulders', rest: 120, pattern: 'bench',
    cues: ['Bench 30–45°, feet planted', 'DBs over upper chest, 45° elbow flare', 'Press straight up, light touch at top'],
    yt: 'incline dumbbell press form',
  },
  'incline-db-neutral': {
    id: 'incline-db-neutral', name: 'Incline DB Neutral-Grip Press', kind: 'dumbbell',
    muscleGroup: 'Upper Chest / Shoulders', rest: 120, pattern: 'bench',
    cues: ['Bench 30–45°, DBs facing each other', 'Elbows tucked ~30°, shoulder-friendly', 'Press straight over upper chest'],
    yt: 'incline dumbbell neutral grip press',
  },

  'cable-fly': {
    id: 'cable-fly', name: 'Cable Chest Fly', kind: 'cable',
    muscleGroup: 'Chest', rest: 60, pattern: 'fly',
    cues: ['Soft bend in elbows, lock them', 'Hands meet in front of lower chest', 'Open wide, feel stretch, no shrug'],
    yt: 'cable chest fly form',
  },
  'db-flat-fly': {
    id: 'db-flat-fly', name: 'Flat Dumbbell Fly', kind: 'dumbbell',
    muscleGroup: 'Chest', rest: 60, pattern: 'fly',
    cues: ['Elbows soft-locked throughout', 'Open until mild chest stretch', 'Squeeze DBs together at top, no lockout'],
    yt: 'flat dumbbell fly form',
  },

  'triceps-pushdown': {
    id: 'triceps-pushdown', name: 'Triceps Pushdown', kind: 'cable',
    muscleGroup: 'Triceps', rest: 60, pattern: 'pushdown',
    cues: ['Elbows pinned to sides', 'Push bar/rope down, lock out short of hyperextension', 'Slow 2s return, full stretch'],
    yt: 'triceps pushdown form',
  },
  'db-overhead-tri': {
    id: 'db-overhead-tri', name: 'DB Overhead Triceps Extension', kind: 'dumbbell',
    muscleGroup: 'Triceps', rest: 60, pattern: 'pushdown',
    cues: ['One DB held vertical, both hands under top plate', 'Elbows point up, lower behind head', 'Press up by extending elbows, no flare'],
    yt: 'dumbbell overhead triceps extension form',
  },

  // ---------- UPPER BODY B ----------
  'barbell-ohp': {
    id: 'barbell-ohp', name: 'Overhead Press', kind: 'barbell',
    muscleGroup: 'Shoulders', rest: 120, pattern: 'ohp',
    cues: ['Glutes & abs tight, no leg drive', 'Bar from front rack, chin out of the way', 'Press straight up, finish shrug through'],
    yt: 'standing overhead press form',
  },
  'db-shoulder-press': {
    id: 'db-shoulder-press', name: 'Seated DB Shoulder Press', kind: 'dumbbell',
    muscleGroup: 'Shoulders', rest: 120, pattern: 'ohp',
    cues: ['Back flat against pad, feet planted', 'DBs level with ears at bottom', 'Press up, no clash at the top'],
    yt: 'seated dumbbell shoulder press form',
  },

  'barbell-incline': {
    id: 'barbell-incline', name: 'Incline Bench Press', kind: 'barbell',
    muscleGroup: 'Upper Chest', rest: 120, pattern: 'bench',
    cues: ['Bench 30°, scapulae set', 'Bar to upper chest just below collarbone', 'Press up and slightly back'],
    yt: 'incline barbell bench press form',
  },
  'db-incline-press': {
    id: 'db-incline-press', name: 'Incline Dumbbell Press', kind: 'dumbbell',
    muscleGroup: 'Upper Chest', rest: 120, pattern: 'bench',
    cues: ['Bench 30°, feet planted', 'DBs over upper chest, elbows ~45°', 'Press straight up, no clang at top'],
    yt: 'incline dumbbell press form',
  },

  'narrow-pulldown': {
    id: 'narrow-pulldown', name: 'Narrow Grip Pulldown', kind: 'cable',
    muscleGroup: 'Lats', rest: 90, pattern: 'pulldown',
    cues: ['Thighs locked, slight lean back', 'Pull handles to lower chest, elbows down', 'Full stretch at top, no shrug'],
    yt: 'narrow grip lat pulldown form',
  },
  'db-pullover': {
    id: 'db-pullover', name: 'Dumbbell Pullover', kind: 'dumbbell',
    muscleGroup: 'Lats / Chest', rest: 90, pattern: 'pullover',
    cues: ['Lie across bench, hips low, feet planted', 'DB held with both hands over chest', 'Lower back behind head, feel lat stretch'],
    yt: 'dumbbell pullover form',
  },

  'rear-delt-raise': {
    id: 'rear-delt-raise', name: 'Rear Delt Raises', kind: 'dumbbell',
    muscleGroup: 'Rear Delts', rest: 60, pattern: 'fly',
    cues: ['Hinge forward ~45°, flat back', 'Raise DBs out to sides, soft elbows', 'Lead with pinkies, squeeze rear delts'],
    yt: 'rear delt dumbbell raise form',
  },
  'db-rev-fly': {
    id: 'db-rev-fly', name: 'Bent-Over DB Reverse Fly', kind: 'dumbbell',
    muscleGroup: 'Rear Delts', rest: 60, pattern: 'fly',
    cues: ['Hinge ~45°, chest to the floor', 'Open DBs wide, pinkies lead', 'No shrug, squeeze shoulder blades back'],
    yt: 'bent over dumbbell reverse fly',
  },

  // ---------- EXTRA LIBRARY ----------
  'db-curl': {
    id: 'db-curl', name: 'Bicep Curls', kind: 'dumbbell',
    muscleGroup: 'Biceps', rest: 60, pattern: 'curl',
    cues: ['Elbows glued to sides', 'Curl without swinging torso', 'Full stretch at bottom, squeeze at top'],
    yt: 'dumbbell bicep curl form',
  },
  'db-flat-press': {
    id: 'db-flat-press', name: 'Flat Dumbbell Press', kind: 'dumbbell',
    muscleGroup: 'Chest', rest: 120, pattern: 'bench',
    cues: ['Shoulder blades set, feet planted', 'DBs just above lower chest', 'Press up with triceps and chest'],
    yt: 'flat dumbbell press form',
  },
  'db-std-shoulder-press': {
    id: 'db-std-shoulder-press', name: 'Dumbbell Shoulder Press', kind: 'dumbbell',
    muscleGroup: 'Shoulders', rest: 120, pattern: 'ohp',
    cues: ['Core tight, no excessive arch', 'DBs level with ears at bottom', 'Press straight up over shoulders'],
    yt: 'standing dumbbell shoulder press',
  },
};

// Routine shape: each slot has primary + alt (dumbbell).
// `sets`/`reps` are for the primary. `altSets`/`altReps` override for the DB variant.
export const ROUTINES = [
  {
    id: 'full-body',
    name: 'Full Body',
    duration: 60,
    slots: [
      { key: 'fb-1', primary: 'barbell-squat', alt: 'db-goblet-squat', sets: 3, reps: 8 },
      { key: 'fb-2', primary: 'barbell-bench', alt: 'db-bench',        sets: 3, reps: 8 },
      { key: 'fb-3', primary: 'barbell-rdl',   alt: 'db-rdl',          sets: 3, reps: 8 },
      { key: 'fb-4', primary: 'assisted-pullup', alt: 'db-one-arm-row', sets: 3, reps: 8, altNote: 'per arm' },
      { key: 'fb-5', primary: 'cable-row',    alt: 'db-chest-sup-row', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'upper-a',
    name: 'Upper Body A',
    duration: 55,
    slots: [
      { key: 'ua-1', primary: 'barbell-bench-5', alt: 'db-bench-6', sets: 3, reps: 5, altReps: 6 },
      { key: 'ua-2', primary: 'barbell-row',     alt: 'db-two-arm-row', sets: 3, reps: 8 },
      { key: 'ua-3', primary: 'incline-db-press', alt: 'incline-db-neutral', sets: 3, reps: 8 },
      { key: 'ua-4', primary: 'cable-fly',       alt: 'db-flat-fly', sets: 3, reps: 12 },
      { key: 'ua-5', primary: 'triceps-pushdown', alt: 'db-overhead-tri', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'upper-b',
    name: 'Upper Body B',
    duration: 50,
    slots: [
      { key: 'ub-1', primary: 'barbell-ohp',     alt: 'db-shoulder-press', sets: 3, reps: 8 },
      { key: 'ub-2', primary: 'assisted-pullup', alt: 'db-one-arm-row', sets: 3, reps: 8, altNote: 'per arm' },
      { key: 'ub-3', primary: 'barbell-incline', alt: 'db-incline-press', sets: 3, reps: 8 },
      { key: 'ub-4', primary: 'narrow-pulldown', alt: 'db-pullover', sets: 3, reps: 12 },
      { key: 'ub-5', primary: 'rear-delt-raise', alt: 'db-rev-fly', sets: 3, reps: 12 },
    ],
  },
];

// For "Start empty workout" picker — all exercises
export const EXTRA_LIBRARY_IDS = ['db-curl', 'db-flat-press', 'db-std-shoulder-press'];
export const ALL_EXERCISE_IDS = Object.keys(EX);

export function getEx(id) { return EX[id]; }
export function getRoutine(id) { return ROUTINES.find(r => r.id === id); }

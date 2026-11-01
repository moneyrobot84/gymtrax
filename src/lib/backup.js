// Backup / restore (JSON) and CSV export.
// Restore merges workouts (skipping duplicates by id or by startedAt+routineId),
// and accepts the legacy GymTrax beta format from localStorage key 'gymtrax.v1'.

import { EX, ROUTINES } from '../data/exercises.js';
import { setVolume } from './calc.js';
import {
  getWorkouts, setWorkouts, setPrefs, getPrefs,
  setRotationPos, getRotationPos, exportAll,
} from './db.js';

// --------- Legacy name -> exerciseId guess ---------
const LEGACY_NAME_TO_ID = (() => {
  const m = {};
  for (const [id, ex] of Object.entries(EX)) {
    m[ex.name.toLowerCase()] = id;
  }
  // common synonyms
  m['squat'] = 'barbell-squat';
  m['bench press'] = 'barbell-bench';
  m['deadlift'] = 'barbell-rdl';
  m['pullup'] = 'assisted-pullup';
  m['pull-up'] = 'assisted-pullup';
  m['pull up'] = 'assisted-pullup';
  m['overhead press'] = 'barbell-ohp';
  m['ohp'] = 'barbell-ohp';
  m['bicep curl'] = 'db-curl';
  m['dumbbell shoulder press'] = 'db-std-shoulder-press';
  return m;
})();

function guessExerciseId(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().trim();
  if (LEGACY_NAME_TO_ID[n]) return LEGACY_NAME_TO_ID[n];
  // partial contains fallback
  for (const [legacyName, id] of Object.entries(LEGACY_NAME_TO_ID)) {
    if (n.includes(legacyName)) return id;
  }
  return null;
}

// Normalize legacy workout to v2 shape
function legacyWorkoutToV2(w) {
  const exercises = (w.exercises || []).map(le => {
    const id = guessExerciseId(le.name) || le.id || 'db-flat-press';
    const sets = (le.sets || []).map(s => ({
      weight: Number(s.kg) || 0,
      reps: Number(s.reps) || 0,
      done: true,
    }));
    return { exerciseId: id, slotKey: null, variant: 'primary', sets };
  });
  return {
    id: w.id || `lw-${w.startedAt || Date.now()}`,
    date: w.date || w.startedAt || new Date().toISOString(),
    startedAt: w.startedAt || w.date || new Date().toISOString(),
    endedAt: w.endedAt || w.date || new Date().toISOString(),
    durationMin: Number(w.durationMin) || 0,
    kcal: Number(w.kcal) || 0,
    routineId: w.routineId || null,
    name: w.name || 'Imported Workout',
    volumeKg: Number(w.volumeKg) || 0,
    sets: Number(w.sets) || 0,
    exercises,
    savedToHealth: !!w.savedToHealth,
  };
}

export async function downloadBackup() {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gymtrax-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await setPrefs({ lastBackupAt: new Date().toISOString() });
}

export async function restoreFromFile(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Not valid JSON'); }
  return restoreFromObject(data);
}

export async function restoreFromObject(data) {
  const current = await getWorkouts();
  const seen = new Set(current.map(w => dedupeKey(w)));
  let added = 0, skipped = 0;

  // Legacy format detection
  const isLegacy = data && data.workouts && data.workouts.length
    && data.workouts[0]
    && (!data.schema || data.schema === 'gymtrax.v1' || Array.isArray(data.workouts[0].exercises) && data.workouts[0].exercises[0] && data.workouts[0].exercises[0].sets && 'kg' in (data.workouts[0].exercises[0].sets[0] || {}));

  const incoming = (data.workouts || []).map(w => isLegacy ? legacyWorkoutToV2(w) : w);

  for (const w of incoming) {
    const key = dedupeKey(w);
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    current.push(w);
    added++;
  }
  current.sort((a, b) => new Date(b.date || b.startedAt) - new Date(a.date || a.startedAt));
  await setWorkouts(current);

  // Merge body kg if present in legacy settings
  if (data.settings && data.settings.bodyKg) {
    await setPrefs({ bodyKg: Number(data.settings.bodyKg) });
  }
  if (data.prefs) {
    const cur = await getPrefs();
    await setPrefs({ ...cur, ...data.prefs });
  }
  if (data.rotationPos && !(await getRotationPos())) {
    await setRotationPos(data.rotationPos);
  }
  return { added, skipped, legacy: !!isLegacy };
}

function dedupeKey(w) {
  if (w.id) return `id:${w.id}`;
  return `t:${w.startedAt || w.date}:${w.routineId || ''}`;
}

// Also pull from legacy localStorage key 'gymtrax.v1'
export async function tryImportLegacyLocal() {
  try {
    const raw = localStorage.getItem('gymtrax.v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const result = await restoreFromObject(data);
    return result;
  } catch { return null; }
}

// -------- CSV export (one row per set) --------
export async function downloadCsv() {
  const workouts = await getWorkouts();
  const rows = [[
    'Date', 'Workout', 'Exercise', 'Set', 'Weight', 'Reps', 'Set volume', 'Minutes', 'Kcal', 'Saved to Health',
  ]];
  for (const w of workouts) {
    const dateStr = new Date(w.date || w.startedAt).toISOString().slice(0, 10);
    const name = w.name || (w.routineId ? (ROUTINES.find(r => r.id === w.routineId)?.name || 'Workout') : 'Workout');
    for (const e of (w.exercises || [])) {
      const ex = EX[e.exerciseId]; if (!ex) continue;
      let setN = 0;
      for (const s of e.sets) {
        if (!s.done) continue;
        setN++;
        const vol = setVolume(ex, s.weight || 0, s.reps || 0);
        rows.push([
          dateStr, name, ex.name, setN, s.weight || 0, s.reps || 0, vol,
          w.durationMin || '', w.kcal || '', w.savedToHealth ? 'yes' : 'no',
        ]);
      }
    }
  }
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gymtrax-${stamp}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

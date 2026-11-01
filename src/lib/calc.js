// Pure calculation helpers: volume, 1RM, plates, progressive overload engine,
// rotation, streak and stats.
import { EX, ROUTINES } from '../data/exercises.js';

// Default increments (editable in Settings via prefs.increments)
export const DEFAULT_INCREMENTS = {
  lowerBarbell: 5,     // squat, RDL
  upperBarbell: 2.5,   // bench, incline, OHP, rows
  dumbbell: 2,         // per dumbbell
  cable: 2.5,
  machine: 2.5,
  assisted: 5,         // reduce assistance by this much
};

// Movement patterns treated as "lower body barbell"
const LOWER_PATTERNS = new Set(['squat', 'hinge']);

export function progressionGroup(ex) {
  if (!ex) return 'cable';
  if (ex.id === 'assisted-pullup') return 'assisted';
  if (ex.kind === 'dumbbell' || ex.kind === 'dumbbellOneArm') return 'dumbbell';
  if (ex.kind === 'barbell') return LOWER_PATTERNS.has(ex.pattern) ? 'lowerBarbell' : 'upperBarbell';
  if (ex.kind === 'cable') return 'cable';
  if (ex.kind === 'machine') return 'machine';
  return 'cable';
}

export function incrementFor(ex, prefs) {
  const incs = { ...DEFAULT_INCREMENTS, ...((prefs || {}).increments || {}) };
  return incs[progressionGroup(ex)] ?? 2.5;
}

// -------- Volume --------
export function setVolume(ex, weight, reps) {
  if (!weight || !reps) return 0;
  if (ex.kind === 'dumbbell') return weight * 2 * reps;
  if (ex.kind === 'dumbbellOneArm') return weight * reps * 2;
  // Assisted pull-up: "weight" is assistance kg -> work ≈ bodyweight-assistance. We treat the
  // volume as just reps for simplicity (unknown bodyweight at log time); represented as reps.
  if (ex.id === 'assisted-pullup') return reps; // small contribution, used for charts only
  return weight * reps;
}

export function workoutVolume(w) {
  let total = 0;
  for (const e of w.exercises || []) {
    const ex = EX[e.exerciseId]; if (!ex) continue;
    for (const s of e.sets) total += setVolume(ex, s.weight || 0, s.reps || 0);
  }
  return total;
}

export function workoutSets(w) {
  let n = 0;
  for (const e of w.exercises || []) for (const s of e.sets) if (s.done) n++;
  return n;
}

export function estimateKcal(bodyKg, durationMin, volumeKg) {
  if (!bodyKg) bodyKg = 75;
  const base = 6 * 3.5 * bodyKg / 200 * (durationMin || 0);
  const bump = Math.min(80, (volumeKg || 0) / 200);
  return Math.round(base + bump);
}

// Brzycki 1RM
export function est1RM(weight, reps) {
  if (!weight || !reps) return 0;
  const r = Math.min(10, reps);
  return weight * (36 / (37 - r));
}

// -------- Rotation --------
export function nextRoutineId(lastFinishedId) {
  const order = ROUTINES.map(r => r.id);
  if (!lastFinishedId) return order[0];
  const i = order.indexOf(lastFinishedId);
  if (i < 0) return order[0];
  return order[(i + 1) % order.length];
}

// -------- Rounding to available increment --------
export function roundToStep(w, step) {
  if (!step) return Math.round(w);
  return Math.round(w / step) * step;
}

// -------- Progressive overload engine --------
// Walk history (newest first) for this exerciseId and build the sessions list.
// Each stored entry carries its own targetReps/targetSets; prefer those over defaults.
export function sessionsFor(workouts, exerciseId, targetReps) {
  const out = [];
  for (const w of workouts) {
    const e = (w.exercises || []).find(x => x.exerciseId === exerciseId);
    if (!e) continue;
    const done = (e.sets || []).filter(s => s.done);
    if (!done.length) continue;
    const topWeight = Math.max(...done.map(s => s.weight || 0));
    const tR = e.targetReps ?? targetReps ?? 8;
    const tS = e.targetSets ?? done.length;
    const allHit = done.length >= tS && done.every(s => (s.reps || 0) >= tR);
    out.push({
      date: w.date || w.startedAt,
      workoutId: w.id,
      topWeight,
      allHit,
      doneSets: done.length,
      targetReps: tR,
      targetSets: tS,
    });
  }
  return out; // newest -> oldest
}

// Status: 'first' | 'progress' | 'hold' | 'deload'
// Returns the recommendation for the next workout.
export function suggestForExercise(workouts, exerciseId, targetReps, targetSets, prefs) {
  const ex = EX[exerciseId];
  const step = incrementFor(ex, prefs);
  const sessions = sessionsFor(workouts, exerciseId, targetReps);
  if (!sessions.length) {
    return {
      status: 'first', weight: null, step, reason: 'First time — enter a starting weight.',
      lastWeight: null, badge: null,
    };
  }
  const last = sessions[0];

  // Stall detection: 3 consecutive sessions at the same weight with any miss
  if (sessions.length >= 3) {
    const same = sessions.slice(0, 3).every(s => Math.abs(s.topWeight - last.topWeight) < 0.01 && !s.allHit);
    if (same) {
      // deload 10%, rounded to step. For assisted, deload means MORE assistance (+10% of weight)
      const rawDeload = ex.id === 'assisted-pullup'
        ? last.topWeight + last.topWeight * 0.10
        : last.topWeight - last.topWeight * 0.10;
      const dl = Math.max(0, roundToStep(rawDeload, step));
      return {
        status: 'deload', weight: dl, step, lastWeight: last.topWeight,
        reason: `Stalled 3× at ${fmtKg(last.topWeight)}. Deload ~10%, then build back up.`,
        badge: { label: `↓ deload`, tone: 'blue' },
      };
    }
  }

  if (last.allHit) {
    // Progress
    if (ex.id === 'assisted-pullup') {
      const next = Math.max(0, last.topWeight - step);
      if (last.topWeight === 0) {
        // Already unassisted — add a rep next time (we signal via reason; weight stays 0)
        return {
          status: 'progress', weight: 0, step, lastWeight: 0,
          reason: `Unassisted — add 1 rep per set next time.`,
          badge: { label: '+1 rep', tone: 'orange' },
        };
      }
      return {
        status: 'progress', weight: next, step, lastWeight: last.topWeight,
        reason: `Hit ${last.targetSets}×${last.targetReps} at ${fmtKg(last.topWeight)} assistance. Less assist = progress.`,
        badge: { label: `↑ -${step} kg assist`, tone: 'orange' },
      };
    }
    const next = roundToStep(last.topWeight + step, step);
    return {
      status: 'progress', weight: next, step, lastWeight: last.topWeight,
      reason: `Hit ${last.targetSets}×${last.targetReps} last time at ${fmtKg(last.topWeight)}${progressionGroup(ex) === 'dumbbell' ? '/DB' : ''}.`,
      badge: { label: `↑ +${step} kg`, tone: 'orange' },
    };
  }

  // Miss → hold the same weight
  return {
    status: 'hold', weight: last.topWeight, step, lastWeight: last.topWeight,
    reason: `Missed target last time. Repeat ${fmtKg(last.topWeight)} until all reps hit.`,
    badge: { label: `= repeat`, tone: 'grey' },
  };
}

function fmtKg(v) {
  if (v == null) return '—';
  const n = Number(v);
  return Number.isInteger(n) ? `${n} kg` : `${n.toFixed(1)} kg`;
}

// -------- PRs --------
export function prFor(workouts, exerciseId) {
  let topWeight = 0, bestVolume = 0, best1RM = 0;
  const ex = EX[exerciseId];
  for (const w of workouts) {
    for (const e of (w.exercises || [])) {
      if (e.exerciseId !== exerciseId) continue;
      let wkVol = 0;
      for (const s of e.sets) {
        if (!s.done) continue;
        if ((s.weight || 0) > topWeight) topWeight = s.weight;
        wkVol += setVolume(ex, s.weight || 0, s.reps || 0);
        const r = est1RM(s.weight || 0, s.reps || 0);
        if (r > best1RM) best1RM = r;
      }
      if (wkVol > bestVolume) bestVolume = wkVol;
    }
  }
  return { topWeight, bestVolume, best1RM };
}

// Check if (weight, reps) beats the current PR for this exercise (within prior sets)
export function isNewPR(priorPR, ex, weight, reps) {
  if (!ex) return false;
  const pr = priorPR || { topWeight: 0, best1RM: 0 };
  if ((weight || 0) > pr.topWeight && (reps || 0) > 0) return true;
  if (est1RM(weight || 0, reps || 0) > pr.best1RM + 0.01) return true;
  return false;
}

// -------- Plate calculator (20 kg bar) --------
export function platesFor(totalKg, barKg = 20) {
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  if (!totalKg || totalKg < barKg) return { ok: false, remainder: totalKg, barKg };
  let perSide = (totalKg - barKg) / 2;
  if (perSide < 0) return { ok: false, remainder: totalKg, barKg };
  const out = [];
  for (const p of plates) {
    while (perSide >= p - 0.0001) { out.push(p); perSide = +(perSide - p).toFixed(3); }
  }
  return { ok: perSide === 0, perSide: out, remainder: perSide, barKg };
}

// -------- Streak / weekly stats --------
export function ymd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  // Use LOCAL date so streaks / "done today" aren't off by one near midnight.
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function dayIndex(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return (dt.getDay() + 6) % 7; // Mon=0..Sun=6
}
export function startOfWeek(d = new Date()) {
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - dayIndex(dt));
  return dt;
}

export function weeklyStats(workouts) {
  const sow = startOfWeek();
  const trainedDays = new Set();
  let totalWeekKg = 0;
  for (const w of workouts) {
    const d = new Date(w.date || w.startedAt);
    if (d >= sow) {
      trainedDays.add(dayIndex(d));
      totalWeekKg += w.volumeKg || 0;
    }
  }
  return { trainedDays, totalWeekKg, count: trainedDays.size };
}

export function computeStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w => ymd(w.date || w.startedAt)));
  let streak = 0;
  const cur = new Date(); cur.setHours(0, 0, 0, 0);
  if (!days.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(ymd(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

export function lifetimeTons(workouts) {
  let kg = 0;
  for (const w of workouts) kg += w.volumeKg || 0;
  return kg / 1000;
}

export function volumeByMuscle(workouts) {
  const out = {};
  for (const w of workouts) {
    for (const e of (w.exercises || [])) {
      const ex = EX[e.exerciseId]; if (!ex) continue;
      let v = 0;
      for (const s of e.sets) if (s.done) v += setVolume(ex, s.weight || 0, s.reps || 0);
      out[ex.muscleGroup] = (out[ex.muscleGroup] || 0) + v;
    }
  }
  return out;
}

// Count lifts that progressed this week (status = progress) given a list of exercises
export function progressedThisWeek(workouts, exerciseIds, prefs) {
  const sow = startOfWeek();
  let count = 0;
  for (const exId of exerciseIds) {
    const sessions = sessionsFor(workouts, exId, 8); // targetReps default
    if (!sessions.length) continue;
    const latest = sessions[0];
    const d = new Date(latest.date);
    if (d >= sow && latest.allHit) count++;
  }
  return count;
}

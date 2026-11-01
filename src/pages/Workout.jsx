import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon.jsx';
import { PatternDemo } from '../components/PatternDemo.jsx';
import RestTimer from '../components/RestTimer.jsx';
import ExerciseSheet from '../components/ExerciseSheet.jsx';
import {
  getActive, setActive, clearActive, getPrefs, setPrefs,
  getWorkouts, addWorkout, getRotationPos, setRotationPos,
} from '../lib/db.js';
import { EX, ROUTINES, ALL_EXERCISE_IDS, getRoutine } from '../data/exercises.js';
import {
  suggestForExercise, setVolume, workoutVolume, workoutSets,
  estimateKcal, platesFor, prFor, isNewPR, nextRoutineId,
} from '../lib/calc.js';

function uid() { return 'w-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Build a fresh in-progress workout object
function buildFromRoutine(routineId, prefs) {
  const routine = getRoutine(routineId);
  const exercises = routine.slots.map(slot => {
    const useAlt = prefs.allDumbbell || prefs.lastVariant[slot.key] === 'alt';
    const exId = useAlt ? slot.alt : slot.primary;
    const sets = useAlt && slot.altSets ? slot.altSets : slot.sets;
    const reps = useAlt && slot.altReps ? slot.altReps : slot.reps;
    return makeExerciseEntry(exId, sets, reps, slot.key, useAlt ? 'alt' : 'primary', slot);
  });
  return {
    id: uid(),
    routineId,
    name: routine.name,
    startedAt: new Date().toISOString(),
    exercises,
    finished: false,
  };
}

function buildEmpty() {
  return {
    id: uid(),
    routineId: null,
    name: 'Empty workout',
    startedAt: new Date().toISOString(),
    exercises: [],
    finished: false,
  };
}

function makeExerciseEntry(exerciseId, targetSets, targetReps, slotKey, variant, slot) {
  const sets = Array.from({ length: targetSets }, () => ({ weight: null, reps: null, done: false, pr: false }));
  return {
    exerciseId, slotKey: slotKey || null, variant: variant || 'primary',
    targetSets, targetReps, sets, slot: slot || null,
  };
}

export default function Workout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [prefs, setPrefsState] = useState(null);
  const [workouts, setWorkoutsState] = useState([]);
  const [w, setW] = useState(null);
  const [restFor, setRestFor] = useState(null); // {seconds, label, nextLabel}
  const [sheetEx, setSheetEx] = useState(null);
  const [summary, setSummary] = useState(null); // when finished
  const [showPicker, setShowPicker] = useState(false);
  const focusRef = useRef(null);

  // Load persistent state and resolve start intent
  useEffect(() => {
    (async () => {
      const p = await getPrefs();
      setPrefsState(p);
      const ws = await getWorkouts();
      setWorkoutsState(ws);
      const sp = new URLSearchParams(loc.search);
      const startId = sp.get('start');
      const emptyFlag = sp.get('empty');
      const active = await getActive();

      if (startId && (!active || active.routineId !== startId)) {
        const fresh = buildFromRoutine(startId, p);
        await setActive(fresh);
        setW(fresh);
      } else if (emptyFlag && !active) {
        const fresh = buildEmpty();
        await setActive(fresh);
        setW(fresh);
        setShowPicker(true);
      } else if (active) {
        setW(active);
      } else {
        // No active, default to today's routine
        const rotPos = await getRotationPos();
        const todayId = nextRoutineId(rotPos);
        const fresh = buildFromRoutine(todayId, p);
        await setActive(fresh);
        setW(fresh);
      }
    })();
     
  }, []);

  // Persist on change
  useEffect(() => {
    if (w && !w.finished) setActive(w);
  }, [w]);

  if (!prefs || !w) return <div className="muted">Loading…</div>;

  async function updateExercise(idx, mut) {
    setW(prev => {
      const copy = { ...prev, exercises: prev.exercises.map((e, i) => i === idx ? mut(e) : e) };
      return copy;
    });
  }

  async function swapVariant(idx) {
    const e = w.exercises[idx];
    if (!e.slot) return; // custom exercises can't swap
    const slot = e.slot;
    const newVariant = e.variant === 'primary' ? 'alt' : 'primary';
    const newExId = newVariant === 'alt' ? slot.alt : slot.primary;
    const sets = newVariant === 'alt' && slot.altSets ? slot.altSets : slot.sets;
    const reps = newVariant === 'alt' && slot.altReps ? slot.altReps : slot.reps;
    const next = makeExerciseEntry(newExId, sets, reps, slot.key, newVariant, slot);
    await updateExercise(idx, () => next);
    const lv = { ...prefs.lastVariant, [slot.key]: newVariant };
    const np = await setPrefs({ lastVariant: lv });
    setPrefsState(np);
  }

  function logSet(exIdx, setIdx) {
    const entry = w.exercises[exIdx];
    const ex = EX[entry.exerciseId];
    const row = entry.sets[setIdx];
    const sug = suggestForExercise(workouts, entry.exerciseId, entry.targetReps, entry.targetSets, prefs);
    const weight = row.weight ?? (sug.weight ?? 0);
    const reps = row.reps ?? entry.targetReps;

    const prior = prFor(workouts, entry.exerciseId);
    const pr = isNewPR(prior, ex, weight, reps);

    updateExercise(exIdx, e => {
      const sets = e.sets.map((s, i) => i === setIdx ? { weight, reps, done: true, pr } : s);
      return { ...e, sets };
    });

    // Start rest timer
    const nextEx = findNextIncompleteExercise(exIdx, setIdx, w);
    setRestFor({
      seconds: ex.rest || 90,
      label: ex.name,
      nextLabel: nextEx ? EX[nextEx.exerciseId]?.name : null,
    });

    // Auto-advance focus to next incomplete set in UI
    setTimeout(() => autoScrollToNext(), 50);
  }

  function findNextIncompleteExercise(exIdx, setIdx, workout) {
    const e = workout.exercises[exIdx];
    if (e && e.sets.some((s, i) => i > setIdx && !s.done)) return e;
    for (let i = exIdx + 1; i < workout.exercises.length; i++) {
      if (workout.exercises[i].sets.some(s => !s.done)) return workout.exercises[i];
    }
    return null;
  }

  function autoScrollToNext() {
    const nodes = document.querySelectorAll('[data-ex-card]');
    for (const n of nodes) {
      const incomplete = n.getAttribute('data-incomplete') === '1';
      if (incomplete) {
        n.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  function addSet(idx) {
    updateExercise(idx, e => ({ ...e, sets: [...e.sets, { weight: null, reps: null, done: false, pr: false }] }));
  }

  function removeExercise(idx) {
    setW(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));
  }

  function addExerciseById(exId) {
    const ex = EX[exId];
    setW(prev => ({
      ...prev,
      exercises: [...prev.exercises, makeExerciseEntry(exId, 3, 10, null, 'primary', null)],
    }));
  }

  async function finishWorkout() {
    const endedAt = new Date();
    const startedAt = new Date(w.startedAt);
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    const volumeKg = Math.round(workoutVolume(w));
    const sets = workoutSets(w);
    const kcal = estimateKcal(prefs.bodyKg, durationMin, volumeKg);
    const finalExercises = w.exercises.map(e => ({
      exerciseId: e.exerciseId, slotKey: e.slotKey, variant: e.variant,
      targetSets: e.targetSets, targetReps: e.targetReps,
      sets: e.sets.filter(s => s.done || s.weight != null || s.reps != null)
                   .map(s => ({ weight: s.weight || 0, reps: s.reps || 0, done: !!s.done, pr: !!s.pr })),
    }));
    const finished = {
      id: w.id,
      routineId: w.routineId,
      name: w.name,
      date: endedAt.toISOString(),
      startedAt: w.startedAt,
      endedAt: endedAt.toISOString(),
      durationMin, kcal, volumeKg, sets, savedToHealth: false,
      exercises: finalExercises,
    };
    await addWorkout(finished);
    if (w.routineId) await setRotationPos(w.routineId);
    await clearActive();
    setSummary(finished);
    setW({ ...w, finished: true });
  }

  async function discardWorkout() {
    if (!confirm('Discard this workout?')) return;
    await clearActive();
    nav('/');
  }

  if (summary) {
    return <WorkoutSummary w={summary} onDone={() => nav('/history')} />;
  }

  const totalTarget = w.exercises.reduce((n, e) => n + e.targetSets, 0) || 1;
  const totalDone = workoutSets(w);
  const pct = Math.min(100, Math.round(100 * totalDone / totalTarget));

  return (
    <div data-testid="page-workout">
      <div className="row-between mb-10">
        <div>
          <div className="display" style={{ fontSize: 26, textTransform: 'uppercase' }}>{w.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>Started {new Date(w.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={discardWorkout} data-testid="btn-discard">
          <Icon name="close" size={14} /> Discard
        </button>
      </div>

      {restFor && (
        <div style={{ marginBottom: 12 }}>
          <RestTimer
            key={restFor.label + restFor.seconds + (restFor.at || '')}
            seconds={restFor.seconds}
            label={restFor.label}
            nextLabel={restFor.nextLabel}
            soundOn={prefs.soundOn}
            onToggleSound={async () => {
              const np = await setPrefs({ soundOn: !prefs.soundOn });
              setPrefsState(np);
            }}
            onDone={() => setRestFor(null)}
            onSkip={() => setRestFor(null)}
          />
        </div>
      )}

      {w.exercises.length === 0 && (
        <div className="card center">
          <div className="card-title">Empty workout</div>
          <div className="card-sub">Pick exercises to log.</div>
          <button className="btn btn-primary mt-10" onClick={() => setShowPicker(true)} data-testid="btn-add-first">
            <Icon name="plus" size={14} /> Add exercise
          </button>
        </div>
      )}

      {w.exercises.map((e, idx) => {
        const ex = EX[e.exerciseId];
        if (!ex) return null;
        const sug = suggestForExercise(workouts, e.exerciseId, e.targetReps, e.targetSets, prefs);
        const prior = prFor(workouts, e.exerciseId);
        const incomplete = e.sets.some(s => !s.done);
        const firstIncompleteIdx = w.exercises.findIndex(x => x.sets.some(s => !s.done));
        const isCurrent = firstIncompleteIdx === idx;
        const isDbVar = ex.kind === 'dumbbell' || ex.kind === 'dumbbellOneArm';
        return (
          <div
            key={idx} className={`ex-card ${isCurrent ? 'focus' : ''}`}
            data-ex-card data-incomplete={incomplete ? '1' : '0'}
            data-testid={`ex-card-${idx}`}
          >
            <div className="ex-head">
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button className="name" onClick={() => setSheetEx(ex)} style={{ textAlign: 'left' }} data-testid={`ex-name-${idx}`}>
                    {ex.name}
                  </button>
                  {sug.badge && <span className={`pill ${sug.badge.tone === 'orange' ? 'pill-accent' : sug.badge.tone === 'blue' ? 'pill' : 'pill'}`} style={sug.badge.tone === 'blue' ? { color: '#8bb6ff', borderColor: 'rgba(139,182,255,0.35)', background: 'rgba(139,182,255,0.08)' } : undefined} data-testid={`sug-badge-${idx}`}>{sug.badge.label}</span>}
                </div>
                <div className="meta">{ex.muscleGroup} · {e.targetSets}×{e.targetReps} · Rest {ex.rest}s{isDbVar ? ' · kg per dumbbell' : ''}</div>
              </div>
              <div className="right">
                {e.slot && (
                  <div className="variant-toggle" data-testid={`variant-toggle-${idx}`}>
                    <button className={e.variant === 'primary' ? 'on' : ''} onClick={() => e.variant !== 'primary' && swapVariant(idx)}>Original</button>
                    <button className={e.variant === 'alt' ? 'on' : ''} onClick={() => e.variant !== 'alt' && swapVariant(idx)}>Dumbbell</button>
                  </div>
                )}
                {!e.slot && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeExercise(idx)} data-testid={`btn-remove-${idx}`}><Icon name="trash" size={14} /></button>
                )}
              </div>
            </div>

            <div className="last-time" data-testid={`last-time-${idx}`}>
              {sug.status === 'first'
                ? 'First time on this lift — pick a starting weight.'
                : <>Last time: <span className="em">{formatKg(sug.lastWeight, isDbVar)}</span> · {sug.reason}</>}
            </div>

            {!isDbVar && ex.kind === 'barbell' && sug.weight > 0 && (
              <PlateHint weight={sug.weight} />
            )}

            <table className="sets-table">
              <thead>
                <tr><th style={{ width: 44 }}>Set</th><th>{isDbVar ? 'kg / DB' : 'kg'}</th><th>Reps</th><th style={{ width: 68 }}></th></tr>
              </thead>
              <tbody>
                {e.sets.map((s, i) => {
                  const defaultW = s.weight ?? sug.weight ?? 0;
                  const defaultR = s.reps ?? e.targetReps;
                  const rowCls = `set-row ${s.done ? 'done' : ''} ${s.pr ? 'pr' : ''}`;
                  return (
                    <tr key={i} className={rowCls} data-testid={`set-${idx}-${i}`}>
                      <td><span className="set-n">{i + 1}</span></td>
                      <td>
                        <input
                          className="num-input" inputMode="decimal" type="number" step="0.5"
                          value={s.weight ?? ''} placeholder={String(defaultW)}
                          onChange={ev => {
                            const v = ev.target.value === '' ? null : Number(ev.target.value);
                            updateExercise(idx, en => ({ ...en, sets: en.sets.map((x, j) => j === i ? { ...x, weight: v } : x) }));
                          }}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') {
                              const next = ev.currentTarget.closest('tr')?.querySelectorAll('.num-input')[1];
                              next && next.focus();
                            }
                          }}
                          disabled={s.done}
                          data-testid={`inp-kg-${idx}-${i}`}
                        />
                      </td>
                      <td>
                        <input
                          className="num-input" inputMode="numeric" type="number" step="1"
                          value={s.reps ?? ''} placeholder={String(defaultR)}
                          onChange={ev => {
                            const v = ev.target.value === '' ? null : Number(ev.target.value);
                            updateExercise(idx, en => ({ ...en, sets: en.sets.map((x, j) => j === i ? { ...x, reps: v } : x) }));
                          }}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') {
                              ev.preventDefault();
                              // commit set
                              const kg = e.sets[i].weight ?? defaultW;
                              const rep = Number(ev.currentTarget.value) || defaultR;
                              updateExercise(idx, en => ({ ...en, sets: en.sets.map((x, j) => j === i ? { ...x, weight: kg, reps: rep } : x) }));
                              setTimeout(() => logSet(idx, i), 0);
                            }
                          }}
                          disabled={s.done}
                          data-testid={`inp-reps-${idx}-${i}`}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={s.done ? 'tick done' : 'tick'}
                          onClick={() => {
                            if (s.done) {
                              // untick
                              updateExercise(idx, en => ({ ...en, sets: en.sets.map((x, j) => j === i ? { ...x, done: false, pr: false } : x) }));
                              return;
                            }
                            // if empty, fill with suggested / last-time values
                            const kg = e.sets[i].weight ?? defaultW;
                            const rep = e.sets[i].reps ?? defaultR;
                            updateExercise(idx, en => ({ ...en, sets: en.sets.map((x, j) => j === i ? { ...x, weight: kg, reps: rep } : x) }));
                            setTimeout(() => logSet(idx, i), 0);
                          }}
                          aria-label="log set"
                          data-testid={`btn-done-${idx}-${i}`}
                        >
                          <Icon name="check" size={22} />
                        </button>
                        {s.pr && <div style={{ marginTop: 4 }}><span className="badge-pr">PR</span></div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="add-set-btn" onClick={() => addSet(idx)} data-testid={`btn-add-set-${idx}`}>+ Add set</button>
          </div>
        );
      })}

      <button className="btn btn-ghost btn-block mt-16" onClick={() => setShowPicker(true)} data-testid="btn-pick-more">
        <Icon name="plus" size={14} /> Add exercise
      </button>

      <div className="finish-bar">
        <div className="inner">
          <div className="progress">
            <span>{totalDone}/{totalTarget}</span>
            <div className="bar"><span style={{ width: pct + '%' }} /></div>
          </div>
          <button className="btn btn-primary" onClick={finishWorkout} disabled={totalDone === 0} data-testid="btn-finish">
            Finish
          </button>
        </div>
      </div>

      {sheetEx && <ExerciseSheet ex={sheetEx} onClose={() => setSheetEx(null)} />}
      {showPicker && (
        <ExercisePicker
          onPick={(id) => { addExerciseById(id); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function formatKg(v, perDumbbell) {
  if (v == null) return '—';
  const n = Number(v);
  const str = Number.isInteger(n) ? `${n} kg` : `${n.toFixed(1)} kg`;
  return perDumbbell ? `${str}/DB` : str;
}

function PlateHint({ weight }) {
  const r = platesFor(weight);
  if (!r.ok) return <div className="muted" style={{ fontSize: 11, margin: '-4px 0 10px' }}>Below bar weight ({r.barKg} kg).</div>;
  const grouped = r.perSide.reduce((m, p) => (m[p] = (m[p] || 0) + 1, m), {});
  const parts = Object.entries(grouped).map(([p, n]) => `${n}×${p}`).join(' · ');
  return (
    <div className="muted" style={{ fontSize: 11, margin: '-4px 0 10px' }} data-testid="plate-hint">
      Plates per side: {parts || '—'}
    </div>
  );
}

function ExercisePicker({ onPick, onClose }) {
  const [q, setQ] = useState('');
  const items = ALL_EXERCISE_IDS.map(id => ({ id, ex: EX[id] }))
    .filter(({ ex }) => !q || ex.name.toLowerCase().includes(q.toLowerCase()) || ex.muscleGroup.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} data-testid="exercise-picker">
        <div className="sheet-grab" />
        <div className="row-between">
          <div className="display" style={{ fontSize: 20, textTransform: 'uppercase' }}>Add exercise</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="close"><Icon name="close" /></button>
        </div>
        <input className="num-input" style={{ textAlign: 'left', marginTop: 10 }}
          placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
          data-testid="picker-search" />
        <div className="col mt-10">
          {items.map(({ id, ex }) => (
            <button key={id} className="btn btn-ghost btn-block"
              onClick={() => onPick(id)} data-testid={`picker-${id}`}
              style={{ justifyContent: 'space-between' }}>
              <span>{ex.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>{ex.muscleGroup}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutSummary({ w, onDone }) {
  const [savedToHealth, setSavedToHealth] = useState(false);
  const shortcutUrl = `shortcuts://run-shortcut?name=Log%20Workout&input=text&text=${encodeURIComponent(
    JSON.stringify({ start: w.startedAt, end: w.endedAt, kcal: w.kcal, minutes: w.durationMin })
  )}`;
  async function copyPayload() {
    const payload = JSON.stringify({
      type: 'Strength Training',
      start: w.startedAt, end: w.endedAt,
      minutes: w.durationMin, kcal: w.kcal, volumeKg: w.volumeKg,
    }, null, 2);
    try { await navigator.clipboard.writeText(payload); setSavedToHealth(true); } catch {}
  }
  return (
    <div data-testid="page-summary">
      <div className="card">
        <div className="card-title">Workout saved</div>
        <div className="card-sub">{w.name}</div>
        <div className="stat-grid mt-16">
          <div className="stat"><div className="label">Duration</div><div className="value">{w.durationMin}<small> min</small></div></div>
          <div className="stat"><div className="label">Sets</div><div className="value">{w.sets}</div></div>
          <div className="stat"><div className="label">Volume</div><div className="value">{w.volumeKg.toLocaleString()}<small> kg</small></div></div>
          <div className="stat"><div className="label">Kcal</div><div className="value">{w.kcal}</div></div>
        </div>
        <div className="row mt-16" style={{ flexDirection: 'column', gap: 10 }}>
          <a className="btn btn-primary btn-block" href={shortcutUrl} data-testid="btn-apple-health">
            Save to Apple Health (Shortcut)
          </a>
          <button className="btn btn-ghost btn-block" onClick={copyPayload} data-testid="btn-copy-health">
            {savedToHealth ? 'Copied ✓' : 'Copy workout data'}
          </button>
          <button className="btn btn-ghost btn-block" onClick={onDone} data-testid="btn-done-summary">Done</button>
        </div>
      </div>
    </div>
  );
}

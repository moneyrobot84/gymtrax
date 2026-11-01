import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon.jsx';
import {
  getWorkouts, getPrefs, setPrefs, getActive, getRotationPos,
} from '../lib/db.js';
import { EX, getRoutine, ROUTINES } from '../data/exercises.js';
import {
  weeklyStats, computeStreak, lifetimeTons, nextRoutineId,
  progressedThisWeek, ymd,
} from '../lib/calc.js';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState([]);
  const [prefs, setPrefsState] = useState(null);
  const [active, setActive] = useState(null);
  const [rotPos, setRotPos] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      setWorkouts(await getWorkouts());
      setPrefsState(await getPrefs());
      setActive(await getActive());
      setRotPos(await getRotationPos());
    })();
  }, []);

  if (!prefs) return null;

  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const ws = weeklyStats(workouts);
  const streak = computeStreak(workouts);
  const tons = lifetimeTons(workouts);

  // Routine rotation: "today's routine" is the one AFTER the last finished routine.
  // If a routine was already finished today, show that one as "done today" and keep its slot
  // (next = after it in the rotation).
  const todayStr = ymd(today);
  const todayWorkout = workouts.find(w => ymd(w.date || w.startedAt) === todayStr && w.routineId);
  const todayId = todayWorkout ? todayWorkout.routineId : nextRoutineId(rotPos);
  const todayRoutine = getRoutine(todayId);
  const nextId = nextRoutineId(todayId);
  const nextRoutine = getRoutine(nextId);
  const doneToday = !!todayWorkout;

  // Progressive overload status this week
  const trackedIds = ROUTINES.flatMap(r => r.slots.flatMap(s => [s.primary, s.alt]));
  const progressed = progressedThisWeek(workouts, trackedIds, prefs);

  // Backup reminder
  const needsBackup = (() => {
    if (!workouts.length) return false;
    if (!prefs.lastBackupAt) return true;
    const days = (Date.now() - new Date(prefs.lastBackupAt).getTime()) / 86400000;
    return days > 14;
  })();

  const dots = Array.from({ length: 7 }, (_, i) => ws.trainedDays.has(i));
  const DAYS = ['M','T','W','T','F','S','S'];

  async function toggleAllDumbbell() {
    const next = await setPrefs({ allDumbbell: !prefs.allDumbbell });
    setPrefsState(next);
  }

  function startWorkout() {
    // If a workout is already in progress, resume it (don't overwrite with a fresh routine).
    if (active && !active.finished) { nav('/workout'); return; }
    nav('/workout?start=' + encodeURIComponent(todayId));
  }

  return (
    <div data-testid="page-today">
      <div className="greet-row">
        <div>
          <div className="hello">Hey Firnas</div>
          <div className="date">{dateStr}</div>
        </div>
        <Link to="/settings" className="btn btn-icon btn-ghost" data-testid="btn-settings" aria-label="settings">
          <Icon name="settings" />
        </Link>
      </div>

      {needsBackup && (
        <div className="card" style={{ borderColor: 'rgba(255,107,26,0.4)', background: 'rgba(255,107,26,0.06)' }}>
          <div className="row-between">
            <div>
              <div className="card-title">Backup due</div>
              <div className="card-sub">
                {prefs.lastBackupAt
                  ? "It's been 14+ days since your last JSON backup."
                  : "Export a JSON backup — your data lives only on this device."}
              </div>
            </div>
            <Link to="/settings" className="btn btn-primary btn-sm" data-testid="btn-backup-cta">Backup now</Link>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat" data-testid="stat-week">
          <div className="label">This week</div>
          <div className="value">{ws.count}<small> / {prefs.weeklyGoal}</small></div>
        </div>
        <div className="stat" data-testid="stat-streak">
          <div className="label">Streak</div>
          <div className="value">{streak}<small> days</small></div>
        </div>
        <div className="stat" data-testid="stat-tons">
          <div className="label">Lifetime</div>
          <div className="value">{tons.toFixed(1)}<small> tons</small></div>
        </div>
        <div className="stat" data-testid="stat-weekkg">
          <div className="label">This week</div>
          <div className="value">{Math.round(ws.totalWeekKg).toLocaleString()}<small> kg</small></div>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <div className="card-title">Weekly consistency</div>
          <div className="pill pill-accent" data-testid="pill-progressed">
            <Icon name="trophy" size={12} /> {progressed} progressed
          </div>
        </div>
        <div className="week-dots">
          {dots.map((on, i) => (
            <div className="d" key={i}>
              <div className={on ? 'dot on' : 'dot'} data-testid={`weekdot-${i}`} />
              <span className="lbl">{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-16" data-testid="card-routine">
        <div className="card-head">
          <div>
            <div className="card-sub">Today</div>
            <div className="routine-head">
              <div className="name">{todayRoutine.name}</div>
              {doneToday && <span className="pill pill-ok" data-testid="pill-done-today"><Icon name="check" size={12} /> Done today</span>}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>~{todayRoutine.duration} min · Next: {nextRoutine.name}</div>
          </div>
          <button
            className={prefs.allDumbbell ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
            onClick={toggleAllDumbbell}
            data-testid="btn-all-db"
          >
            <Icon name="swap" size={14} /> Dumbbell
          </button>
        </div>

        <ul className="exercise-list">
          {todayRoutine.slots.map(slot => {
            const useAlt = prefs.allDumbbell || prefs.lastVariant[slot.key] === 'alt';
            const ex = EX[useAlt ? slot.alt : slot.primary];
            const sets = useAlt && slot.altSets ? slot.altSets : slot.sets;
            const reps = useAlt && slot.altReps ? slot.altReps : slot.reps;
            return (
              <li key={slot.key} data-testid={`routine-ex-${slot.key}`}>
                <span className="ex-name">{ex.name}</span>
                <span className="ex-meta">{sets}×{reps}{useAlt && slot.altNote ? ` · ${slot.altNote}` : ''}</span>
              </li>
            );
          })}
        </ul>

        <div className="row mt-16">
          <button className="btn btn-primary btn-block" onClick={startWorkout} data-testid="btn-start-today">
            <Icon name="play" size={16} /> {active ? 'Resume workout' : (doneToday ? 'Train again' : 'Start workout')}
          </button>
        </div>
        <Link to="/workout?empty=1" className="btn btn-ghost btn-block mt-10" data-testid="btn-start-empty">
          <Icon name="plus" size={16} /> Start empty workout
        </Link>
      </div>
    </div>
  );
}

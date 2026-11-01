import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { getWorkouts, getPrefs } from '../lib/db.js';
import { EX, ROUTINES, ALL_EXERCISE_IDS } from '../data/exercises.js';
import {
  sessionsFor, suggestForExercise, prFor, est1RM, setVolume,
  volumeByMuscle, startOfWeek, ymd,
} from '../lib/calc.js';

const METRICS = [
  { id: 'top', label: 'Top weight' },
  { id: 'vol', label: 'Volume' },
  { id: '1rm', label: 'Est 1RM' },
];

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [metric, setMetric] = useState('top');
  const [exId, setExId] = useState(null);

  useEffect(() => { (async () => {
    setWorkouts(await getWorkouts());
    setPrefs(await getPrefs());
  })(); }, []);

  // Default to the first tracked exercise with data
  useEffect(() => {
    if (!exId && workouts.length) {
      const seen = new Set();
      for (const w of workouts) for (const e of (w.exercises || [])) {
        if (e.sets.some(s => s.done)) seen.add(e.exerciseId);
      }
      const first = ALL_EXERCISE_IDS.find(id => seen.has(id));
      if (first) setExId(first);
    }
    if (!exId && !workouts.length) setExId('barbell-squat');
  }, [workouts, exId]);

  if (!prefs) return null;

  const tracked = ALL_EXERCISE_IDS;
  const statuses = tracked.map(id => {
    const sessions = sessionsFor(workouts, id, 8);
    const sug = suggestForExercise(workouts, id, 8, 3, prefs);
    return { id, ex: EX[id], sessions, sug };
  }).filter(x => x.sessions.length);

  // Sorted by status priority then by most recent
  const order = { progress: 0, hold: 1, deload: 2 };
  statuses.sort((a, b) => (order[a.sug.status] - order[b.sug.status]));

  // Weekly volume (last 8 weeks)
  const weekly = buildWeeklyVolume(workouts);
  const byMuscle = volumeByMuscle(workouts);
  const chart = exId ? buildExerciseSeries(workouts, exId, metric) : null;

  return (
    <div data-testid="page-progress">
      <div className="display" style={{ fontSize: 26, textTransform: 'uppercase', marginBottom: 10 }}>Progress</div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Overload status</div>
          <span className="muted" style={{ fontSize: 11 }}>Per exercise</span>
        </div>
        {statuses.length === 0 ? (
          <div className="muted">Log a workout to start tracking.</div>
        ) : (
          <ul className="exercise-list">
            {statuses.map(s => (
              <li key={s.id} data-testid={`overload-${s.id}`}>
                <div style={{ minWidth: 0 }}>
                  <div className="ex-name">{s.ex.name}</div>
                  <div className="ex-meta">{s.sug.reason}</div>
                </div>
                <span className={statusPill(s.sug.status)}>{statusLabel(s.sug.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <div className="card-title">Weekly volume</div>
          <span className="muted" style={{ fontSize: 11 }}>Last 8 weeks (kg)</span>
        </div>
        <WeeklyChart data={weekly} />
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <div className="card-title">Per exercise</div>
          <select
            className="num-input" style={{ textAlign: 'left', width: 'auto', minHeight: 36, fontSize: 12 }}
            value={exId || ''}
            onChange={e => setExId(e.target.value)}
            data-testid="select-ex"
          >
            {tracked.map(id => <option key={id} value={id}>{EX[id].name}</option>)}
          </select>
        </div>
        <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {METRICS.map(m => (
            <button key={m.id}
              className={`btn btn-sm ${m.id === metric ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMetric(m.id)}
              data-testid={`metric-${m.id}`}
            >{m.label}</button>
          ))}
        </div>
        {chart && chart.length ? <LineChart data={chart} /> : <div className="muted">No data yet for this exercise.</div>}
      </div>

      <div className="card mt-16">
        <div className="card-head">
          <div className="card-title">Body-part split</div>
          <span className="muted" style={{ fontSize: 11 }}>Lifetime volume</span>
        </div>
        <SplitBars data={byMuscle} />
      </div>
    </div>
  );
}

function statusPill(st) {
  if (st === 'progress') return 'pill pill-accent';
  if (st === 'deload') return 'pill';
  return 'pill';
}
function statusLabel(st) {
  switch (st) {
    case 'progress': return 'Progressing';
    case 'hold':     return 'Holding';
    case 'deload':   return 'Deload';
    case 'first':    return 'New';
    default:         return 'Holding';
  }
}

function buildWeeklyVolume(workouts) {
  const now = new Date();
  const start = startOfWeek(now);
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(start); ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 7);
    let total = 0;
    for (const w of workouts) {
      const d = new Date(w.date || w.startedAt);
      if (d >= ws && d < we) total += w.volumeKg || 0;
    }
    weeks.push({ label: `${ws.getMonth() + 1}/${ws.getDate()}`, value: Math.round(total) });
  }
  return weeks;
}

function buildExerciseSeries(workouts, exId, metric) {
  const ex = EX[exId];
  const out = [];
  const asc = [...workouts].sort((a, b) => new Date(a.date || a.startedAt) - new Date(b.date || b.startedAt));
  for (const w of asc) {
    const e = (w.exercises || []).find(x => x.exerciseId === exId);
    if (!e) continue;
    const done = e.sets.filter(s => s.done);
    if (!done.length) continue;
    let v = 0;
    if (metric === 'top') v = Math.max(...done.map(s => s.weight || 0));
    else if (metric === '1rm') v = Math.max(...done.map(s => est1RM(s.weight || 0, s.reps || 0)));
    else v = done.reduce((n, s) => n + setVolume(ex, s.weight || 0, s.reps || 0), 0);
    out.push({ x: new Date(w.date || w.startedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }), y: Math.round(v) });
  }
  return out;
}

// --------- Lightweight inline SVG charts ---------
function WeeklyChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const W = 320, H = 160, P = 20;
  const bw = (W - P * 2) / data.length - 4;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#2d2f32" />
        {data.map((d, i) => {
          const h = (d.value / max) * (H - P * 2);
          const x = P + i * ((W - P * 2) / data.length) + 2;
          return (
            <g key={i}>
              <rect x={x} y={H - P - h} width={bw} height={h} fill="#FF6B1A" rx="3" />
              <text x={x + bw / 2} y={H - P + 12} textAnchor="middle" fontSize="9" fill="#6f7278">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
function LineChart({ data }) {
  const W = 320, H = 170, P = 24;
  const max = Math.max(1, ...data.map(d => d.y));
  const min = Math.min(0, ...data.map(d => d.y));
  const step = (W - P * 2) / Math.max(1, data.length - 1);
  const toY = v => H - P - ((v - min) / (max - min || 1)) * (H - P * 2);
  const pts = data.map((d, i) => `${P + i * step},${toY(d.y)}`).join(' ');
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#2d2f32" />
        <polyline fill="none" stroke="#FF6B1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={P + i * step} cy={toY(d.y)} r="3.5" fill="#FF6B1A" />
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 4) === 0) && (
              <text x={P + i * step} y={H - P + 12} textAnchor="middle" fontSize="9" fill="#6f7278">{d.x}</text>
            )}
          </g>
        ))}
        <text x={W - P} y={P - 4} textAnchor="end" fontSize="10" fill="#a7a9ad">{max}</text>
      </svg>
    </div>
  );
}

function SplitBars({ data }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  if (!entries.length) return <div className="muted">No data yet.</div>;
  return (
    <div className="col">
      {entries.map(([k, v]) => (
        <div key={k} style={{ fontSize: 12 }}>
          <div className="row-between"><span>{k}</span><span className="muted">{Math.round(v).toLocaleString()} kg</span></div>
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, marginTop: 4 }}>
            <div style={{ width: `${(v / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import {
  getWorkouts, setWorkouts as saveWorkouts, deleteWorkout, updateWorkout,
} from '../lib/db.js';
import { EX } from '../data/exercises.js';
import { workoutVolume, workoutSets } from '../lib/calc.js';

export default function History() {
  const [workouts, setWs] = useState([]);
  const [editing, setEditing] = useState(null);

  async function reload() { setWs(await getWorkouts()); }
  useEffect(() => { reload(); }, []);

  async function onDelete(id) {
    if (!confirm('Delete this workout?')) return;
    await deleteWorkout(id);
    reload();
  }

  if (editing) return <EditWorkout w={editing} onClose={() => { setEditing(null); reload(); }} />;

  return (
    <div data-testid="page-history">
      <div className="display" style={{ fontSize: 26, textTransform: 'uppercase', marginBottom: 10 }}>History</div>
      {!workouts.length && <div className="muted">No workouts yet. Start one from Today.</div>}
      {workouts.map(w => (
        <div className="card" key={w.id} data-testid={`history-${w.id}`}>
          <div className="row-between">
            <div style={{ minWidth: 0 }}>
              <div className="display" style={{ fontSize: 18, textTransform: 'uppercase' }}>{w.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {new Date(w.date || w.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}{w.durationMin || 0} min · {w.sets || 0} sets · {Math.round(w.volumeKg || 0).toLocaleString()} kg · {w.kcal || 0} kcal
              </div>
            </div>
            <div className="row">
              <button className="btn btn-icon btn-ghost" onClick={() => setEditing(w)} data-testid={`btn-edit-${w.id}`} aria-label="edit"><Icon name="edit" size={16} /></button>
              <button className="btn btn-icon btn-ghost" onClick={() => onDelete(w.id)} data-testid={`btn-del-${w.id}`} aria-label="delete"><Icon name="trash" size={16} /></button>
            </div>
          </div>
          <div className="hr" />
          <div className="col" style={{ gap: 4 }}>
            {(w.exercises || []).map((e, i) => {
              const ex = EX[e.exerciseId];
              const done = e.sets.filter(s => s.done);
              const top = done.length ? Math.max(...done.map(s => s.weight || 0)) : 0;
              return (
                <div key={i} className="row-between" style={{ fontSize: 13 }}>
                  <span>{ex ? ex.name : e.exerciseId}</span>
                  <span className="muted">{done.length}×{done[0]?.reps ?? '-'} · {top ? top + ' kg' : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditWorkout({ w, onClose }) {
  const [draft, setDraft] = useState(w);
  async function save() {
    const vol = Math.round(workoutVolume({ exercises: draft.exercises }));
    const sets = workoutSets({ exercises: draft.exercises });
    await updateWorkout(w.id, { ...draft, volumeKg: vol, sets });
    onClose();
  }
  return (
    <div data-testid="page-edit">
      <div className="row-between mb-10">
        <div className="display" style={{ fontSize: 22, textTransform: 'uppercase' }}>Edit workout</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} data-testid="btn-edit-cancel"><Icon name="close" size={14} /> Cancel</button>
      </div>
      {draft.exercises.map((e, idx) => {
        const ex = EX[e.exerciseId];
        return (
          <div className="ex-card" key={idx}>
            <div className="ex-head"><div className="name">{ex?.name || e.exerciseId}</div></div>
            <table className="sets-table"><thead><tr><th>Set</th><th>kg</th><th>Reps</th></tr></thead>
              <tbody>
                {e.sets.map((s, i) => (
                  <tr key={i}>
                    <td><span className="set-n">{i + 1}</span></td>
                    <td><input className="num-input" type="number" step="0.5" value={s.weight ?? ''}
                      onChange={ev => {
                        const v = Number(ev.target.value) || 0;
                        setDraft(d => ({ ...d, exercises: d.exercises.map((x, xi) => xi === idx ? { ...x, sets: x.sets.map((y, yi) => yi === i ? { ...y, weight: v } : y) } : x) }));
                      }} /></td>
                    <td><input className="num-input" type="number" step="1" value={s.reps ?? ''}
                      onChange={ev => {
                        const v = Number(ev.target.value) || 0;
                        setDraft(d => ({ ...d, exercises: d.exercises.map((x, xi) => xi === idx ? { ...x, sets: x.sets.map((y, yi) => yi === i ? { ...y, reps: v } : y) } : x) }));
                      }} /></td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        );
      })}
      <button className="btn btn-primary btn-block mt-16" onClick={save} data-testid="btn-edit-save">Save changes</button>
    </div>
  );
}

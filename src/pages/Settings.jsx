import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { getPrefs, setPrefs, getWorkouts } from '../lib/db.js';
import { DEFAULT_INCREMENTS } from '../lib/calc.js';
import { downloadBackup, restoreFromFile, tryImportLegacyLocal, downloadCsv } from '../lib/backup.js';

const INC_LABELS = {
  lowerBarbell: 'Barbell lower (squat, RDL)',
  upperBarbell: 'Barbell upper (bench, OHP, rows)',
  dumbbell: 'Dumbbell (per DB)',
  cable: 'Cable / isolation',
  machine: 'Machine',
  assisted: 'Assisted pull-ups (reduce assist)',
};

export default function Settings() {
  const [prefs, setPrefsState] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { (async () => {
    setPrefsState(await getPrefs());
    setWorkouts(await getWorkouts());
  })(); }, []);

  if (!prefs) return null;
  const incs = { ...DEFAULT_INCREMENTS, ...(prefs.increments || {}) };

  async function updatePref(patch) {
    const np = await setPrefs(patch);
    setPrefsState(np);
  }

  async function doRestore(file) {
    try {
      const r = await restoreFromFile(file);
      setMsg(`Restored: +${r.added} workouts, ${r.skipped} skipped${r.legacy ? ' (legacy format)' : ''}.`);
      setPrefsState(await getPrefs());
      setWorkouts(await getWorkouts());
    } catch (e) {
      setMsg('Restore failed: ' + e.message);
    }
  }
  async function doImportLegacy() {
    const r = await tryImportLegacyLocal();
    if (!r) setMsg('No legacy GymTrax data found in localStorage.');
    else setMsg(`Imported legacy data: +${r.added} workouts, ${r.skipped} skipped.`);
    setPrefsState(await getPrefs());
    setWorkouts(await getWorkouts());
  }

  return (
    <div data-testid="page-settings">
      <div className="display" style={{ fontSize: 26, textTransform: 'uppercase', marginBottom: 10 }}>Settings</div>

      <div className="card">
        <div className="card-title">Profile</div>
        <div className="row-between mt-10">
          <label htmlFor="bodyKg">Body weight</label>
          <div className="row">
            <input id="bodyKg" className="num-input" style={{ width: 90 }} type="number" step="0.5"
              value={prefs.bodyKg} onChange={e => updatePref({ bodyKg: Number(e.target.value) || 0 })}
              data-testid="inp-body-kg" />
            <span className="muted">kg</span>
          </div>
        </div>
        <div className="row-between mt-10">
          <label htmlFor="goal">Weekly goal</label>
          <input id="goal" className="num-input" style={{ width: 90 }} type="number" min="1" max="7"
            value={prefs.weeklyGoal} onChange={e => updatePref({ weeklyGoal: Number(e.target.value) || 4 })}
            data-testid="inp-weekly-goal" />
        </div>
        <div className="row-between mt-10">
          <label>Timer sound</label>
          <button className={prefs.soundOn ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
            onClick={() => updatePref({ soundOn: !prefs.soundOn })} data-testid="btn-toggle-sound">
            <Icon name={prefs.soundOn ? 'sound' : 'mute'} size={14} /> {prefs.soundOn ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">Progressive overload — increments</div>
        <div className="card-sub">How much to add after a successful session.</div>
        <div className="col mt-10">
          {Object.keys(DEFAULT_INCREMENTS).map(k => (
            <div className="row-between" key={k}>
              <label style={{ fontSize: 13 }}>{INC_LABELS[k]}</label>
              <div className="row">
                <input className="num-input" style={{ width: 90 }} type="number" step="0.25" min="0"
                  value={incs[k]} onChange={e => updatePref({ increments: { ...incs, [k]: Number(e.target.value) || 0 } })}
                  data-testid={`inc-${k}`} />
                <span className="muted">kg</span>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => updatePref({ increments: null })} data-testid="btn-reset-inc">
            Reset defaults
          </button>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">Backup & restore</div>
        <div className="card-sub">
          Last backup: {prefs.lastBackupAt ? new Date(prefs.lastBackupAt).toLocaleString() : 'never'}
          {' · '}{workouts.length} workout{workouts.length === 1 ? '' : 's'} stored
        </div>
        <div className="col mt-10">
          <button className="btn btn-primary btn-block" onClick={async () => { await downloadBackup(); setPrefsState(await getPrefs()); }} data-testid="btn-backup">
            <Icon name="download" size={14} /> Export JSON backup
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()} data-testid="btn-restore">
            <Icon name="upload" size={14} /> Restore from JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async e => {
              const f = e.target.files?.[0];
              if (f) await doRestore(f);
              e.target.value = '';
              setWorkouts(await getWorkouts());
            }}
            data-testid="file-restore"
          />
          <button className="btn btn-ghost btn-block" onClick={doImportLegacy} data-testid="btn-import-legacy">
            Import legacy beta data (localStorage)
          </button>
          <button className="btn btn-ghost btn-block" onClick={downloadCsv} data-testid="btn-csv">
            <Icon name="download" size={14} /> Export CSV
          </button>
          {msg && <div className="muted" style={{ fontSize: 12 }}>{msg}</div>}
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">About</div>
        <div className="card-sub">
          GymTrax runs entirely on this device. No account, no cloud.
          Add to Home Screen (Safari → Share → Add to Home Screen) for the full app experience.
        </div>
      </div>
    </div>
  );
}

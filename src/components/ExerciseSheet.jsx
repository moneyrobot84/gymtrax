import React from 'react';
import { Icon } from './Icon.jsx';
import { PatternDemo } from './PatternDemo.jsx';

export default function ExerciseSheet({ ex, onClose }) {
  if (!ex) return null;
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.yt || ex.name)}`;
  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-label={ex.name}>
      <div className="sheet" onClick={e => e.stopPropagation()} data-testid="exercise-sheet">
        <div className="sheet-grab" />
        <div className="row-between">
          <div>
            <div className="display" style={{ fontSize: 22, textTransform: 'uppercase' }}>{ex.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>{ex.muscleGroup} · Rest {ex.rest}s</div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="close" data-testid="sheet-close">
            <Icon name="close" />
          </button>
        </div>
        <div className="ex-demo" style={{ marginTop: 12 }}>
          <PatternDemo pattern={ex.pattern} />
        </div>
        <ol style={{ marginTop: 14, paddingLeft: 18 }}>
          {ex.cues.map((c, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{c}</li>
          ))}
        </ol>
        <a className="btn btn-ghost btn-block mt-10" href={ytUrl} target="_blank" rel="noopener" data-testid="sheet-yt">
          <Icon name="external" size={16} /> Watch form on YouTube
        </a>
      </div>
    </div>
  );
}

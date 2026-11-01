import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

// Rest timer: auto-starts after a set. Shows ring countdown, +/-15, skip, mute.
// Collapses when seconds reaches 0, parent dismisses after onDone.
export default function RestTimer({ seconds, label, nextLabel, soundOn, onToggleSound, onDone, onSkip }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const total = useRef(seconds);
  const audioCtxRef = useRef(null);

  useEffect(() => { setLeft(seconds); total.current = seconds; setRunning(true); }, [seconds, label]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          if (soundOn) beep();
          onDone && onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, soundOn, onDone]);

  function beep() {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start();
      o.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  const r = 42, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, left / Math.max(1, total.current)));
  const dash = c * pct;

  return (
    <div className="rest-timer" data-testid="rest-timer">
      <div className="rest-ring" aria-label="rest remaining">
        <svg width="92" height="92">
          <circle className="ring-bg" cx="46" cy="46" r={r} strokeWidth="8" fill="none" />
          <circle
            className="ring-fg" cx="46" cy="46" r={r} strokeWidth="8" fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="time">{formatMMSS(left)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row-between">
          <div className="display" style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          <button className="btn btn-sm" onClick={onToggleSound} data-testid="btn-sound" aria-label="toggle sound">
            <Icon name={soundOn ? 'sound' : 'mute'} size={16} />
          </button>
        </div>
        {nextLabel ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Next: {nextLabel}</div> : null}
        <div className="rest-controls" style={{ marginTop: 8 }}>
          <button className="btn btn-sm" onClick={() => setLeft(v => Math.max(0, v - 15))} data-testid="btn-rest-minus">-15s</button>
          <button className="btn btn-sm" onClick={() => setLeft(v => v + 15)} data-testid="btn-rest-plus">+15s</button>
          <button className="btn btn-sm btn-primary" onClick={() => { setRunning(false); onSkip && onSkip(); }} data-testid="btn-rest-skip">Skip</button>
        </div>
      </div>
    </div>
  );
}

function formatMMSS(s) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

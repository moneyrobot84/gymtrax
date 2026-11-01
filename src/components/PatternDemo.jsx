import React from 'react';

// Lightweight animated SVG demos keyed by movement pattern. One SVG per pattern,
// using <animate> so no JS loop is needed. Height is aspect-ratio locked by parent.
export function PatternDemo({ pattern }) {
  switch (pattern) {
    case 'squat':         return <SquatSVG />;
    case 'bench':         return <BenchSVG />;
    case 'hinge':         return <HingeSVG />;
    case 'row':           return <RowSVG />;
    case 'pullup':        return <PullupSVG />;
    case 'pulldown':      return <PullupSVG flipped />;
    case 'ohp':           return <OHPSVG />;
    case 'fly':           return <FlySVG />;
    case 'pushdown':      return <PushdownSVG />;
    case 'curl':          return <CurlSVG />;
    case 'pullover':      return <PulloverSVG />;
    default:              return <BenchSVG />;
  }
}

const S = {
  bg: '#1B1C1E', body: '#F5F5F2', accent: '#FF6B1A', line: '#2d2f32',
};

// Shared helpers for simple stick body
const Body = ({ cx, cy, legY, armY, armSwing = 0, headR = 10 }) => (
  <g stroke={S.body} strokeWidth="4" strokeLinecap="round" fill="none">
    <circle cx={cx} cy={cy - 36} r={headR} fill={S.body} />
    <line x1={cx} y1={cy - 26} x2={cx} y2={legY - 4} />
    <line x1={cx} y1={legY - 4} x2={cx - 14} y2={legY + 16} />
    <line x1={cx} y1={legY - 4} x2={cx + 14} y2={legY + 16} />
    <line x1={cx} y1={cy - 20} x2={cx - 18 + armSwing} y2={armY} />
    <line x1={cx} y1={cy - 20} x2={cx + 18 - armSwing} y2={armY} />
  </g>
);

function SquatSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="20" y1="106" x2="200" y2="106" stroke={S.line} strokeWidth="2" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,16; 0,0" dur="2.2s" repeatCount="indefinite" />
        <Body cx={110} cy={70} legY={96} armY={56} />
        {/* Barbell across shoulders */}
        <line x1="80" y1="46" x2="140" y2="46" stroke={S.accent} strokeWidth="4" strokeLinecap="round" />
        <rect x="70" y="40" width="10" height="12" fill={S.body} rx="2" />
        <rect x="140" y="40" width="10" height="12" fill={S.body} rx="2" />
      </g>
    </svg>
  );
}

function BenchSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      {/* bench */}
      <rect x="60" y="78" width="100" height="10" fill={S.line} rx="2" />
      <rect x="68" y="88" width="6" height="18" fill={S.line} />
      <rect x="146" y="88" width="6" height="18" fill={S.line} />
      {/* body lying */}
      <g stroke={S.body} strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="68" cy="74" r="8" fill={S.body} />
        <line x1="76" y1="74" x2="152" y2="74" />
        <line x1="152" y1="74" x2="166" y2="92" />
      </g>
      {/* Arms + bar: animate press */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-14; 0,0" dur="2s" repeatCount="indefinite" />
        <line x1="120" y1="66" x2="120" y2="42" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="86" y1="42" x2="154" y2="42" stroke={S.accent} strokeWidth="5" strokeLinecap="round" />
        <circle cx="86" cy="42" r="8" fill={S.body} />
        <circle cx="154" cy="42" r="8" fill={S.body} />
      </g>
    </svg>
  );
}

function HingeSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="20" y1="106" x2="200" y2="106" stroke={S.line} strokeWidth="2" />
      <g transform="translate(110 70)">
        <animateTransform attributeName="transform" type="rotate" values="0; -30; 0" dur="2.2s" repeatCount="indefinite" />
        <circle cx="0" cy="-36" r="9" fill={S.body} />
        <line x1="0" y1="-26" x2="0" y2="20" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* legs stay */}
      <g stroke={S.body} strokeWidth="4" strokeLinecap="round">
        <line x1="110" y1="90" x2="96" y2="112" />
        <line x1="110" y1="90" x2="124" y2="112" />
      </g>
      {/* bar in front */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,20; 0,0" dur="2.2s" repeatCount="indefinite" />
        <line x1="78" y1="80" x2="142" y2="80" stroke={S.accent} strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function RowSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="20" y1="106" x2="200" y2="106" stroke={S.line} strokeWidth="2" />
      <g transform="translate(0 -4)">
        <circle cx="86" cy="48" r="9" fill={S.body} />
        <line x1="94" y1="52" x2="160" y2="78" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="160" y1="78" x2="146" y2="106" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="160" y1="78" x2="174" y2="106" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Arm + bar: rows */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,16; 0,-2; 0,16" dur="1.8s" repeatCount="indefinite" />
        <line x1="110" y1="60" x2="130" y2="92" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="90" y1="92" x2="170" y2="92" stroke={S.accent} strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function PullupSVG({ flipped }) {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg" style={{ transform: flipped ? 'scaleY(-1)' : 'none' }}>
      <rect width="220" height="124" fill={S.bg} />
      {/* bar */}
      <line x1="40" y1="20" x2="180" y2="20" stroke={S.accent} strokeWidth="5" strokeLinecap="round" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-16; 0,0" dur="2s" repeatCount="indefinite" />
        {/* arms */}
        <line x1="100" y1="22" x2="110" y2="56" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="120" y1="22" x2="110" y2="56" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        {/* body */}
        <circle cx="110" cy="66" r="9" fill={S.body} />
        <line x1="110" y1="74" x2="110" y2="104" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function OHPSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="20" y1="106" x2="200" y2="106" stroke={S.line} strokeWidth="2" />
      <circle cx="110" cy="60" r="10" fill={S.body} />
      <line x1="110" y1="68" x2="110" y2="100" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="100" x2="96" y2="118" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="100" x2="124" y2="118" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      {/* bar + arms */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-16; 0,0" dur="2s" repeatCount="indefinite" />
        <line x1="86" y1="40" x2="134" y2="40" stroke={S.accent} strokeWidth="5" strokeLinecap="round" />
        <line x1="100" y1="40" x2="106" y2="60" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="120" y1="40" x2="114" y2="60" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function FlySVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      {/* bench */}
      <rect x="60" y="78" width="100" height="10" fill={S.line} rx="2" />
      {/* body */}
      <g stroke={S.body} strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="68" cy="74" r="8" fill={S.body} />
        <line x1="76" y1="74" x2="152" y2="74" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="-18,-6; 0,0; -18,-6" dur="2.4s" repeatCount="indefinite" />
        <line x1="120" y1="74" x2="78" y2="52" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <circle cx="78" cy="52" r="6" fill={S.accent} />
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="18,-6; 0,0; 18,-6" dur="2.4s" repeatCount="indefinite" />
        <line x1="120" y1="74" x2="162" y2="52" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <circle cx="162" cy="52" r="6" fill={S.accent} />
      </g>
    </svg>
  );
}

function PushdownSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="110" y1="4" x2="110" y2="42" stroke={S.line} strokeWidth="3" />
      <circle cx="110" cy="46" r="4" fill={S.line} />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,16; 0,0" dur="1.6s" repeatCount="indefinite" />
        <line x1="100" y1="54" x2="120" y2="54" stroke={S.accent} strokeWidth="4" strokeLinecap="round" />
        <line x1="104" y1="54" x2="100" y2="78" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <line x1="116" y1="54" x2="120" y2="78" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="110" cy="92" r="10" fill={S.body} />
      <line x1="110" y1="100" x2="110" y2="118" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CurlSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <line x1="20" y1="106" x2="200" y2="106" stroke={S.line} strokeWidth="2" />
      <circle cx="110" cy="40" r="10" fill={S.body} />
      <line x1="110" y1="48" x2="110" y2="90" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="90" x2="96" y2="110" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="90" x2="124" y2="110" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
      {/* arms + db */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,20; 0,-10; 0,20" dur="1.8s" repeatCount="indefinite" />
        <line x1="100" y1="60" x2="90" y2="78" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <rect x="80" y="72" width="18" height="10" rx="2" fill={S.accent} />
        <line x1="120" y1="60" x2="130" y2="78" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <rect x="122" y="72" width="18" height="10" rx="2" fill={S.accent} />
      </g>
    </svg>
  );
}

function PulloverSVG() {
  return (
    <svg viewBox="0 0 220 124" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="124" fill={S.bg} />
      <rect x="60" y="78" width="100" height="10" fill={S.line} rx="2" />
      <g stroke={S.body} strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="68" cy="74" r="8" fill={S.body} />
        <line x1="76" y1="74" x2="152" y2="74" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-50 120 74; 0 120 74; -50 120 74" dur="2.4s" repeatCount="indefinite" />
        <line x1="120" y1="74" x2="120" y2="30" stroke={S.body} strokeWidth="4" strokeLinecap="round" />
        <rect x="112" y="24" width="16" height="12" rx="2" fill={S.accent} />
      </g>
    </svg>
  );
}

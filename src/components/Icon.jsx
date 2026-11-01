import React from 'react';

// Minimal inline SVG icon set (24x24). No external icon fonts to keep the PWA offline-first.
export const Icon = ({ name, size = 22, stroke = 'currentColor', fill = 'none', ...rest }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
    case 'dumbbell':
      return <svg {...common}><path d="M6 7v10M3 9v6M9 6v12M15 6v12M21 9v6M18 7v10" /><path d="M9 12h6" /></svg>;
    case 'chart':
      return <svg {...common}><path d="M4 20V8" /><path d="M10 20V4" /><path d="M16 20v-8" /><path d="M22 20H2" /></svg>;
    case 'history':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'check':
      return <svg {...common}><path d="M5 12l5 5L20 7" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':
      return <svg {...common}><path d="M5 12h14" /></svg>;
    case 'play':
      return <svg {...common} fill="currentColor" stroke="none"><path d="M6 4l14 8-14 8z" /></svg>;
    case 'pause':
      return <svg {...common}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>;
    case 'skip':
      return <svg {...common}><path d="M5 5l9 7-9 7z" fill="currentColor" stroke="none" /><path d="M18 5v14" /></svg>;
    case 'close':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'external':
      return <svg {...common}><path d="M14 3h7v7" /><path d="M21 3l-9 9" /><path d="M20 14v6H4V4h6" /></svg>;
    case 'swap':
      return <svg {...common}><path d="M7 7h13l-3-3" /><path d="M17 17H4l3 3" /></svg>;
    case 'sound':
      return <svg {...common}><path d="M4 10v4h4l5 4V6l-5 4H4z" /><path d="M16 8a5 5 0 010 8" /></svg>;
    case 'mute':
      return <svg {...common}><path d="M4 10v4h4l5 4V6l-5 4H4z" /><path d="M16 9l5 6M21 9l-5 6" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></svg>;
    case 'edit':
      return <svg {...common}><path d="M4 20h4L20 8l-4-4L4 16v4z" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 005 12a7 7 0 00.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></svg>;
    case 'flame':
      return <svg {...common}><path d="M12 3s4 4 4 8a4 4 0 11-8 0c0-2 1-3 2-4 0 0-1-2 2-4z" /></svg>;
    case 'trophy':
      return <svg {...common}><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M4 5h3M17 5h3" /><path d="M10 15v2h4v-2M8 20h8" /></svg>;
    case 'download':
      return <svg {...common}><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>;
    case 'upload':
      return <svg {...common}><path d="M12 20V8" /><path d="M7 13l5-5 5 5" /><path d="M4 4h16" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
};

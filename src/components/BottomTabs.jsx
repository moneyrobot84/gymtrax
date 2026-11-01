import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon.jsx';

const TABS = [
  { to: '/', label: 'Today',    icon: 'home' },
  { to: '/workout', label: 'Workout', icon: 'dumbbell' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/history', label: 'History',  icon: 'history' },
];

export default function BottomTabs() {
  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      <div className="inner">
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
            data-testid={`tab-${t.label.toLowerCase()}`}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

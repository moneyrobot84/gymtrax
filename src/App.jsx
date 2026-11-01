import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Workout from './pages/Workout.jsx';
import Progress from './pages/Progress.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import BottomTabs from './components/BottomTabs.jsx';

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
        <BottomTabs />
      </div>
    </HashRouter>
  );
}

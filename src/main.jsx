import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// Service worker auto-updates in the background. Works fully offline after first load.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Restore path after GitHub Pages 404 redirect
const params = new URLSearchParams(window.location.search);
const redirected = params.get('r');
if (redirected) {
  const base = '/Cinema-Tracker';
  params.delete('r');
  const rest = params.toString() ? '?' + params.toString() : '';
  window.history.replaceState(null, '', base + redirected + rest);
}

// Migrate data from old tvtime-store key to queued-store
const OLD_KEY = 'tvtime-store';
const NEW_KEY = 'queued-store';
const oldData = localStorage.getItem(OLD_KEY);
if (oldData && !localStorage.getItem(NEW_KEY)) {
  localStorage.setItem(NEW_KEY, oldData);
  localStorage.removeItem(OLD_KEY);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

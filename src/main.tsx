import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

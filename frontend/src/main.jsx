import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize Day Mode (default) or saved theme early to prevent flash
try {
  const initialTheme = localStorage.getItem('securecloud_theme') || 'light';
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.classList.toggle('light', initialTheme === 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
  document.documentElement.style.colorScheme = initialTheme;
} catch {}

// Support live deployment (e.g. frontend hosted on Vercel connecting to live backend)
const defaultBase = import.meta.env.DEV ? '' : 'https://securecloud-i0qq.onrender.com'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || defaultBase).replace(/\/$/, '')
if (API_BASE) {
  const originalFetch = window.fetch
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${API_BASE}${input}`
    } else if (input instanceof Request && input.url.startsWith('/api')) {
      input = new Request(`${API_BASE}${input.url}`, input)
    }
    return originalFetch(input, init)
  }
}

// Register PWA service worker
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration note:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


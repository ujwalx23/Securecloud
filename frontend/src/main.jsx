import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize Night Mode (default) or saved theme early to prevent flash
try {
  const initialTheme = localStorage.getItem('securecloud_theme') || 'dark';
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.classList.toggle('light', initialTheme === 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);
  document.documentElement.style.colorScheme = initialTheme;
} catch {}

// Resilient API routing: Prioritize same-origin Vercel proxy rewrite (zero CORS latency / no preflight failures)
// with automatic fallback to direct Render backend if edge proxy is unreachable.
const directBackend = 'https://securecloud-i0qq.onrender.com';
const originalFetch = window.fetch;

window.fetch = async (input, init) => {
  try {
    return await originalFetch(input, init);
  } catch (err) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      try {
        return await originalFetch(`${directBackend}${input}`, init);
      } catch (fallbackErr) {
        throw err;
      }
    } else if (input instanceof Request && input.url.startsWith('/api')) {
      try {
        return await originalFetch(new Request(`${directBackend}${input.url}`, input), init);
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
};

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


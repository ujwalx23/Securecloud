import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

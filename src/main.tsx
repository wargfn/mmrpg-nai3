import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Bypass ngrok browser warning page for all frontend fetch requests
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  headers.set('ngrok-skip-browser-warning', '1');
  return originalFetch(input, {
    ...init,
    headers,
  });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

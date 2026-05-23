import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Get API URL - use environment variable, or fallback to relative path (nginx proxy)
// For Railway: If VITE_API_URL is NOT set, use relative /api (which nginx proxies to backend)
const apiUrl = import.meta.env.VITE_API_URL || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App apiUrl={apiUrl} />
  </React.StrictMode>
);

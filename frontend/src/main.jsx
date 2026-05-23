import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Get API URL - use environment variable OR fallback to current domain
// For Railway: VITE_API_URL should be the BACKEND service URL (internal networking)
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App apiUrl={apiUrl} />
  </React.StrictMode>
);

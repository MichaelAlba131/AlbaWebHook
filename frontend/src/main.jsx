import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Get API URL from environment or use default (Vite dev server proxy handles this)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App apiUrl={apiUrl} />
  </React.StrictMode>
);

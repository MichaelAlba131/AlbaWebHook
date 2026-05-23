# Alba WebHook - Railway Deployment Guide

This guide covers how to deploy Alba WebHook on Railway.

## Architecture Overview

Alba WebHook uses a **single service** deployment with Nginx proxy:

```
WebhooksAlba/
├── backend/          # Node.js + Express API (port 3000)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   └── store/
│   ├── package.json
│   └── Dockerfile
├── frontend/         # React + Vite + Nginx (port 80)
│   ├── src/
│   ├── dist/       # Built output
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
└── RAILWAY.md
```

## Deployment (Two Separate Services)

You need **two Railway services** because they're separate containers:

### Step 1: Deploy Backend

1. Go to [Railway](https://railway.app)
2. Create new project → "Blank project"
3. Add a service:
   - **Name**: `backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Port**: `3000`
4. Copy the **backend URL** (e.g., `https://albawebhook-backend.up.railway.app`)

### Step 2: Deploy Frontend

1. Add another service:
   - **Name**: `frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `nginx -g 'daemon off;'`
   - **Port**: `80`
2. Add environment variable:
   - **VITE_API_URL**: The backend URL from Step 1 (internal Railway URL)
3. Click Deploy

### Important: Why Set VITE_API_URL?

The frontend runs in a **separate container** from the backend. Without the variable:
- It tries to proxy through Nginx → `http://localhost:3000` → fails (different container)

With `VITE_API_URL` set to the backend's Railway URL:
- Frontend calls the backend directly via Railway's internal networking

## Verify Deployment

Check health endpoint:
```bash
curl https://your-railway-url.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-..."}
```

## Testing the Webhook

1. Create a bin (via frontend UI or CLI):
```bash
curl -X POST https://your-railway-url.railway.app/api/bins \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{"mockStatusCode": 200, "mockBody": "{\"ok\": true}"}'
```

2. Send a test webhook:
```bash
curl -X POST https://your-railway-url.railway.app/hook/YOUR_BIN_ID \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "number": 42}'
```

3. View requests:
```bash
curl https://your-railway-url.railway.app/api/bins/YOUR_BIN_ID/requests
```

## Notes

- The in-memory store (`Map`) provides high-speed storage but data is lost on restart
- For persistence, a Redis store can be added
- SSE uses Server-Sent Events for real-time updates

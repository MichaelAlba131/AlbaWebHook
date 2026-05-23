# Alba WebHook - Railway Deployment Guide

This guide covers how to deploy Alba WebHook on Railway with the multi-service architecture.

## Architecture Overview

Alba WebHook uses a **Multi-service Monorepo** architecture with two independent services:

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

## Railway Configuration

### Option 1: Two Separate Services (Recommended)

Create **two** Railway services:

#### Service 1: Backend
| Setting | Value |
|---------|-------|
| Name | `nexus-hook-backend` |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node src/index.js` |
| Port | `3000` |
| Environment Variables | None required |

#### Service 2: Frontend
| Setting | Value |
|---------|-------|
| Name | `nexus-hook-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Start Command | `nginx -g 'daemon off;'` |
| Port | `80` |
| Environment Variables | `VITE_API_URL=https://your-backend-url.railway.app` |

### Option 2: Single Service with Nginx Proxy

Alternatively, deploy both in one service using the frontend container with Nginx proxy:

| Setting | Value |
|---------|-------|
| Name | `nexus-hook` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Start Command | `nginx -g 'daemon off;'` |
| Port | `80` |
| Environment Variables | `VITE_API_URL=http://localhost` |

## Environment Variables

### Frontend (Vite)

```
VITE_API_URL=http://localhost:3000
```

For Railway production, use your backend URL:
```
VITE_API_URL=https://nexus-hook-backend.up.railway.app
```

## Deployment Steps

### Step 1: Deploy Backend

1. Go to [Railway](https://railway.app)
2. Create new project → " blank project"
3. Add GitHub repository
4. Configure service:
   - Name: `backend`
   - Root Directory: `backend`
5. Click Deploy

### Step 2: Deploy Frontend

1. In the same project, add another service
2. Configure:
   - Name: `frontend`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `nginx -g 'daemon off;'`
3. Add environment variable:
   - `VITE_API_URL`: Your backend Railway URL
4. Click Deploy

### Step 3: Configure Nginx Proxy (if using single service)

The included `nginx.conf` includes proxy configuration:
- `/api` → Backend on port 3000
- `/hook` → Backend on port 3000

## Verify Deployment

Check health endpoint:
```bash
curl https://your-backend-url.railway.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-..."}
```

## Testing the Webhook

1. Create a bin:
```bash
curl -X POST https://your-backend-url.railway.app/api/bins \
  -H "Content-Type: application/json" \
  -d '{"mockStatusCode": 200, "mockBody": "{\"ok\": true}"}'
```

2. Send a test webhook:
```bash
curl -X POST https://your-backend-url.railway.app/hook/YOUR_BIN_ID \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "number": 42}'
```

3. View requests:
```bash
curl https://your-backend-url.railway.app/api/bins/YOUR_BIN_ID/requests
```

## Notes

- The in-memory store (`Map`) provides high-speed storage but data is lost on restart
- For persistence, a Redis store can be added
- SSE uses Server-Sent Events for real-time updates

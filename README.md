# 🚀 Nexus Hook - Webhook Inspector

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/Stack-Node.js%20%2B%20Express-orange.svg" alt="stack">
</p>

> **Nexus Hook** is a premium open-source Webhook Inspector designed for QA automation testing and developer debugging. Built with high-performance architecture and modern UI/UX.

![Nexus Hook Interface](https://via.placeholder.com/1200x600/0a0a0a/3b82f6?text=Nexus+Hook+UI)

## ✨ Features

- 🎯 **Mocking Dinâmico** - Configure HTTP Status Code e Response Body personalizados
- 🔍 **Inspetor Avançado** - Monaco Editor com syntax highlighting e busca
- ⚡ **Tempo Real** - Server-Sent Events (SSE) para atualizações instantâneas
- 🔎 **Filtro e Busca** - Barra de pesquisa para filtrar payloads
- 🎨 **UI Premium** - Dark mode estilo Vercel/Linear

## 📁 Project Structure

```
WebhooksAlba/
├── backend/                    # Backend - Node.js + Express
│   ├── src/
│   │   ├── index.js          # Entry point do servidor
│   │   ├── store/
│   │   │   └── memoryStore.js # Store em memória (Map)
│   │   └── routes/
│   │       ├── api.js        # REST API endpoints
│   │       ├── hook.js       # Webhook reception
│   │       └── sse.js        # Server-Sent Events
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                  # Frontend - React + Vite
│   ├── src/
│   │   ├── App.jsx           # Componente principal
│   │   ├── main.jsx          # Entry point React
│   │   └── index.css        # Estilos Tailwind
│   ├── nginx.conf            # Configuração Nginx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile           # Multi-stage build
│
├── README.md
└── TODO.md
```

## 🛠️ Stack Tecnológica

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Storage | In-Memory Map |
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Editor | Monaco Editor |
| Real-time | Server-Sent Events |
| Web Server | Nginx |

## 📡 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bins` | Criar novo bin |
| GET | `/api/bins` | Listar todos bins |
| GET | `/api/bins/:id` | Obter bin específico |
| PUT | `/api/bins/:id` | Atualizar bin |
| DELETE | `/api/bins/:id` | Deletar bin |
| ALL | `/hook/:id` | Receber webhook |
| GET | `/api/bins/:id/requests` | Listar requisições |
| DELETE | `/api/bins/:id/requests` | Limpar requisições |
| GET | `/api/bins/:id/stream` | SSE stream |

### Criar Bin (POST /api/bins)

```bash
curl -X POST http://localhost:3000/api/bins \
  -H "Content-Type: application/json" \
  -d '{
    "mockStatusCode": 500,
    "mockBody": "{\"error\": \"Internal Server Error\"}"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4",
    "hookUrl": "/hook/a1b2c3d4",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "mockStatusCode": 500,
    "mockBody": "{\"error\": \"Internal Server Error\"}"
  }
}
```

### Receber Webhook (ALL /hook/:id)

```bash
curl -X POST http://localhost:3000/hook/a1b2c3d4 \
  -H "Content-Type: application/json" \
  -d '{"event": "user.created", "data": {"id": 123}}'
```

## 🚂 Railway Deployment

### Step 1: Preparar Repositório

1. Crie um repositório no GitHub
2.Faça push de todos os arquivos

```bash
git init
git add .
git commit -m "Initial commit: Nexus Hook"
git remote add origin https://github.com/YOUR_USERNAME/nexus-hook.git
git push -u origin main
```

### Step 2: Configurar Backend no Railway

1. Acesse [Railway.app](https://railway.app)
2. Clique em **New Project**
3. Selecione **Deploy from GitHub repo**
4. Escolha o repositório
5. Configure:

| Setting | Value |
|---------|-------|
| Name | `nexus-hook-backend` |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node src/index.js` |

6. Variables de Ambiente:
```
NODE_ENV=production
PORT=3000
```

7. Clique **Deploy**

### Step 3: Configurar Frontend no Railway

1. Clique em **New Project** novamente
2. Selecione **Deploy from GitHub repo**
3. Escolha o mesmo repositório
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `nexus-hook-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Start Command | `nginx -g "daemon off;"` |

5. Variables de Ambiente:
```
VITE_API_URL=https://YOUR-BACKEND-DOMAIN.railway.app
```

6. Clique **Deploy**

### Step 4: Conectar os Serviços

1. No backend, configure variável:
```
ALLOWED_ORIGINS=https://YOUR-FRONTEND-DOMAIN.railway.app
```

2. No frontend, atualize:
```
VITE_API_URL=https://YOUR-BACKEND-DOMAIN.railway.app
```

### Step 5: Configurar Domínio Customizado (Opcional)

1. Vá para **Settings** > **Domains** em cada projeto
2. Adicione seu domínio
3. Configure DNS records conforme instruído

## ▶️ Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Executar Backend

```bash
cd backend
npm install
npm run dev
```

Backend disponível em: `http://localhost:3000`

### Executar Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em: `http://localhost:5173`

### Executar Ambos (Docker)

```bash
# Backend
docker build -t nexus-hook-backend ./backend
docker run -p 3000:3000 nexus-hook-backend

# Frontend
docker build -t nexus-hook-frontend ./frontend
docker run -p 80:80 -e VITE_API_URL=http://localhost:3000 nexus-hook-frontend
```

## 🧪 Testing

### Teste Manual - Criar Bin

```bash
# Create a test bin
curl -X POST http://localhost:3000/api/bins \
  -H "Content-Type: application/json" \
  -d '{"mockStatusCode": 200, "mockBody": "{\"ok\": true}"}'
```

### Teste Manual - Enviar Webhook

```bash
# Send a webhook POST request
curl -X POST http://localhost:3000/hook/test123 \
  -H "Content-Type: application/json" \
  -d '{"user": {"name": "John", "email": "john@example.com"}}'
```

### Teste com jq

```bash
# Pretty print response
curl -s http://localhost:3000/api/bins | jq .
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ by QA Engineers, for QA Engineers</sub>
</p>

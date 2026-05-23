import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import hookRoutes from './routes/hook.js';
import sseRoutes from './routes/sse.js';
import store from './store/memoryStore.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,  // Allow all origins (for Railway multi-service)
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes - ORDER MATTERS! API must be before hooks catch-all
app.use('/api', sseRoutes);  // SSE first (more specific)
app.use('/api', apiRoutes);  // Then API routes
app.use('/', hookRoutes);   // Hooks catch-all last

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          🚀 Alba Webhook Backend Running         ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Health: http://localhost:${PORT}/health
║  API: http://localhost:${PORT}/api
║  Hooks: http://localhost:${PORT}/hook/:id
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

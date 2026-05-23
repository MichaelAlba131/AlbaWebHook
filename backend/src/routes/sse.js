import express from 'express';
import store from '../store/memoryStore.js';

const router = express.Router();

// Helper to extract session ID from request headers or query params
const getSessionId = (req) => {
  // Prefer header (from fetch), fallback to query param (for SSE)
  return req.headers['x-session-id'] || req.query.sessionId || null;
};

// GET /api/bins/:id/stream - SSE endpoint for real-time updates
router.get('/bins/:id/stream', (req, res) => {
  const { id } = req.params;
  const sessionId = getSessionId(req);
  
  // Just verify bin exists (SSE is for real-time viewing, not ownership gate)
  const bin = store.getBin(id);

  // Check if bin exists (allow any authenticated user to view)
  if (!bin) {
    return res.status(404).json({
      success: false,
      error: 'Bin not found',
    });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Generate unique client ID
  const clientId = crypto.randomUUID();
  
  // Add client to the bin's SSE clients
  store.addSSEClient(id, clientId);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', binId: id })}\n\n`);

  // Send any pending requests that arrived before connection
  const pendingRequests = store.getRequests(id);
  if (pendingRequests.length > 0) {
    // Send last 10 requests as initial data
    const recentRequests = pendingRequests.slice(0, 10);
    res.write(`data: ${JSON.stringify({ type: 'initial', requests: recentRequests })}\n\n`);
  }

  // Send pending SSE notifications
  if (global.pendingSSE) {
    const pending = global.pendingSSE.get(id) || [];
    pending.forEach((data) => {
      res.write(`data: ${data}\n\n`);
    });
    global.pendingSSE.set(id, []); // Clear pending
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    store.removeSSEClient(id, clientId);
    clearInterval(heartbeat);
  });
});

export default router;

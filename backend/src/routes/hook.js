import express from 'express';
import store from '../store/memoryStore.js';

const router = express.Router();

// ALL /hook/:id - Receive webhook requests (any HTTP method)
router.all('/hook/:id', (req, res) => {
  const { id } = req.params;
  const bin = store.getBin(id);

  // Check if bin exists, create auto if not (or return 404)
  if (!bin) {
    return res.status(404).json({
      success: false,
      error: 'Webhook bin not found',
    });
  }

  // Capture request details
  const requestData = {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
  };

  // Store the request
  const storedRequest = store.addRequest(id, requestData);

  // Trigger real-time broadcast to all connected SSE clients
  store.broadcast(id, storedRequest);

  // Respond with mock config
  const statusCode = bin.mockStatusCode || 200;
  let mockBody = bin.mockBody || '{}';
  
  // Try to parse as JSON, if fails send as string
  try {
    mockBody = JSON.parse(mockBody);
  } catch {
    // Keep as string if not valid JSON
  }

  res.status(statusCode).send(mockBody);
});

export default router;

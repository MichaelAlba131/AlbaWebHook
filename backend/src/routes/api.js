import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import store from '../store/memoryStore.js';

const router = express.Router();

// Helper to extract session ID from request headers
const getSessionId = (req) => {
  return req.headers['x-session-id'] || null;
};

// POST /api/bins - Create a new bin
router.post('/bins', (req, res) => {
  try {
    const { name, mockStatusCode, mockBody } = req.body;
    const sessionId = getSessionId(req);
    
    // Require session ID for creating bins
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Session ID required',
      });
    }
    
    // Generate unique bin ID
    const binId = uuidv4().slice(0, 8);
    
    // Create bin with session ID (for multi-tenant isolation)
    const bin = store.createBin(binId, {
      sessionId,  // Track who created this bin
      name,  // Optional custom name
      mockStatusCode: mockStatusCode || 200,
      mockBody: mockBody || '{}',
    });

    res.status(201).json({
      success: true,
      data: {
        id: bin.id,
        name: bin.name,
        hookUrl: `/hook/${bin.id}`,
        createdAt: bin.createdAt,
        mockStatusCode: bin.mockStatusCode,
        mockBody: bin.mockBody,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create bin',
    });
  }
});

// GET /api/bins - List bins for the current session only
router.get('/bins', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    
    // Filter bins by session ID (multi-tenant)
    const bins = store.getAllBins(sessionId);
    res.json({
      success: true,
      data: bins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bins',
    });
  }
});

// GET /api/bins/:id - Get specific bin (must belong to session)
router.get('/bins/:id', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found',
      });
    }
    
    res.json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bin',
    });
  }
});

// PUT /api/bins/:id - Update bin mock config (must belong to session)
router.put('/bins/:id', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const { mockStatusCode, mockBody } = req.body;
    
    // First verify ownership
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found',
      });
    }
    
    const updatedBin = store.updateBin(req.params.id, {
      mockStatusCode,
      mockBody,
    });
    
    res.json({
      success: true,
      data: updatedBin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update bin',
    });
  }
});

// DELETE /api/bins/:id - Delete a specific bin (only if owned by session)
router.delete('/bins/:id', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const deleted = store.deleteBin(req.params.id, sessionId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found or not owned by session',
      });
    }
    
    res.json({
      success: true,
      message: 'Bin deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete bin',
    });
  }
});

// DELETE /api/bins - Delete ALL bins for current session only
router.delete('/bins', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const count = store.deleteAllBins(sessionId);
    res.json({
      success: true,
      message: `${count} bins deleted`,
      deletedCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete bins',
    });
  }
});

// GET /api/bins/:id/requests - Get requests for a bin (must belong to session)
router.get('/bins/:id/requests', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found',
      });
    }
    
    const requests = store.getRequests(req.params.id);
    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});

// DELETE /api/bins/:id/requests - Clear requests for a bin (must belong to session)
router.delete('/bins/:id/requests', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found',
      });
    }
    
    store.clearRequests(req.params.id);
    res.json({
      success: true,
      message: 'Requests cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear requests',
    });
  }
});

// DELETE /api/bins/:id/requests - Limpa todas as requisições de um bin específico
router.delete('/bins/:id/requests', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found or not owned by session',
      });
    }
    
    // Executa a limpeza das requisições no memoryStore
    store.clearRequests(req.params.id);
    
    res.json({
      success: true,
      message: 'All requests cleared for this bin',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear requests',
    });
  }
});

// GET /api/bins/:id/requests/latest - Retorna a requisição mais recente do bin
router.get('/bins/:id/requests/latest', (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const bin = store.getBinByIdAndSession(req.params.id, sessionId);
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        error: 'Bin not found or not owned by session',
      });
    }
    
    const requests = store.getRequests(req.params.id);
    
    // Se o array estiver vazio, significa que nenhum webhook chegou ainda
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No requests found for this bin',
      });
    }

    // Retorna apenas a primeira posição do array (a mais recente devido ao unshift)
    res.json({
      success: true,
      data: requests[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest request',
    });
  }
});

export default router;

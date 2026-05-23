import crypto from 'crypto';
/**
 * In-Memory Store for Nexus Hook
 * Uses Map for O(1) lookups and high-speed storage
 * Supports multi-tenant session isolation
 */

class MemoryStore {
  constructor() {
    // Map<binId, BinData>
    this.bins = new Map();
    // Map<binId, Request[]>
    this.requests = new Map();
    // Map<binId, Set<clientId>> - SSE clients per bin
    this.sseClients = new Map();
    // Broadcast callback for real-time notifications
    this.broadcastCallback = null;
  }

  /**
   * Set broadcast callback for real-time notifications
   * @param {function} callback - Function to call with (binId, request) when new request arrives
   */
  setBroadcastCallback(callback) {
    this.broadcastCallback = callback;
  }

  /**
   * Trigger broadcast to all connected clients for a bin
   */
  broadcast(binId, request) {
    if (this.broadcastCallback) {
      this.broadcastCallback(binId, request);
    }
  }

  /**
   * Create a new bin
   * @param {string} id - Unique bin ID
   * @param {object} config - Bin configuration
   * @param {string} config.sessionId - Session ID of the creator (required for multi-tenant)
   */
  createBin(id, config = {}) {
    const bin = {
      id,
      sessionId: config.sessionId || null,  // Session owner (for multi-tenant)
      name: config.name || null,  // Custom name for the bin
      createdAt: new Date().toISOString(),
      mockStatusCode: config.mockStatusCode || 200,
      mockBody: config.mockBody || '{}',
      requestCount: 0,
    };
    this.bins.set(id, bin);
    this.requests.set(id, []);
    this.sseClients.set(id, new Set());
    return bin;
  }

  /**
   * Get bin by ID
   */
  getBin(id) {
    return this.bins.get(id);
  }

  /**
   * Get bin by ID and verify ownership
   */
  getBinByIdAndSession(id, sessionId) {
    const bin = this.bins.get(id);
    if (!bin) return null;
    // If no sessionId provided, return bin (for hook.js which has no session)
    if (!sessionId) return bin;
    // Verify ownership
    if (bin.sessionId !== sessionId) return null;
    return bin;
  }

  /**
   * Get all bins (optionally filtered by session)
   */
  getAllBins(sessionId = null) {
    const allBins = Array.from(this.bins.values());
    if (!sessionId) return allBins;
    // Filter by session for multi-tenant
    return allBins.filter(bin => bin.sessionId === sessionId);
  }

  /**
   * Delete bin and all its data (with session verification)
   * @returns {boolean} true if deleted, false if not found or not owned
   */
  deleteBin(id, sessionId = null) {
    const bin = this.bins.get(id);
    if (!bin) return false;
    
    // If no sessionId provided, cannot delete (security)
    if (!sessionId) return false;
    
    // Verify ownership
    if (bin.sessionId !== sessionId) return false;
    
    this.bins.delete(id);
    this.requests.delete(id);
    this.sseClients.delete(id);
    return true;
  }

  /**
   * Delete ALL bins and their requests (for a specific session only)
   * @returns {number} count of deleted bins
   */
  deleteAllBins(sessionId = null) {
    if (!sessionId) return 0;
    
    const userBins = Array.from(this.bins.values()).filter(
      bin => bin.sessionId === sessionId
    );
    
    const count = userBins.length;
    userBins.forEach(bin => {
      this.bins.delete(bin.id);
      this.requests.delete(bin.id);
      this.sseClients.delete(bin.id);
    });
    
    return count;
  }

  /**
   * Update bin mock config
   */
  updateBin(id, updates) {
    const bin = this.bins.get(id);
    if (!bin) return null;
    
    if (updates.mockStatusCode !== undefined) {
      bin.mockStatusCode = updates.mockStatusCode;
    }
    if (updates.mockBody !== undefined) {
      bin.mockBody = updates.mockBody;
    }
    this.bins.set(id, bin);
    return bin;
  }

  /**
   * Add request to bin
   */
  addRequest(binId, request) {
    const bin = this.bins.get(binId);
    if (!bin) return null;

    const storedRequest = {
      id: crypto.randomUUID(),
      ...request,
      timestamp: new Date().toISOString(),
    };

    const binRequests = this.requests.get(binId) || [];
    binRequests.unshift(storedRequest); // Add to beginning (most recent first)
    this.requests.set(binId, binRequests);
    
    bin.requestCount++;
    this.bins.set(binId, bin);

    return storedRequest;
  }

  /**
   * Get requests for a bin
   */
  getRequests(binId) {
    return this.requests.get(binId) || [];
  }

  /**
   * Clear requests for a bin
   */
  clearRequests(binId) {
    this.requests.set(binId, []);
    const bin = this.bins.get(binId);
    if (bin) {
      bin.requestCount = 0;
      this.bins.set(binId, bin);
    }
  }

  /**
   * Add SSE client to bin
   */
  addSSEClient(binId, clientId) {
    const clients = this.sseClients.get(binId);
    if (clients) {
      clients.add(clientId);
    }
  }

  /**
   * Remove SSE client from bin
   */
  removeSSEClient(binId, clientId) {
    const clients = this.sseClients.get(binId);
    if (clients) {
      clients.delete(clientId);
    }
  }

  /**
   * Get SSE clients for a bin
   */
  getSSEClients(binId) {
    return this.sseClients.get(binId) || new Set();
  }
}

// Export singleton instance
export const store = new MemoryStore();
export default store;

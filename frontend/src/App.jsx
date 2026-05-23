import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

const METHOD_COLORS = {
  GET: 'text-status-get',
  POST: 'text-status-post',
  PUT: 'text-status-put',
  DELETE: 'text-status-delete',
  PATCH: 'text-status-patch',
};

// Session management - generate or retrieve session ID
const getSessionId = () => {
  const STORAGE_KEY = 'alba_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    // Generate UUID v4
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
};

// Get headers with session ID
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-Session-ID': getSessionId(),
  };
};

// Validate API URL - warn if running on same origin (likely misconfigured)
const validateApiUrl = (url) => {
  // If apiUrl is same as window.location.origin, likely misconfigured
  if (url === window.location.origin) {
    console.warn('Warning: API URL is same as frontend origin. Set VITE_API_URL environment variable.');
    return false;
  }
  return true;
};

function App({ apiUrl }) {
  const [bins, setBins] = useState([]);
  const [selectedBinId, setSelectedBinId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [newBinConfig, setNewBinConfig] = useState({
    name: '',
    mockStatusCode: 200,
    mockBody: '{}',
  });
  const [sseStatus, setSseStatus] = useState('disconnected');
  const sseRef = useRef(null);

// Initialize session on mount
  useEffect(() => {
    getSessionId(); // Ensures session ID exists
    validateApiUrl(apiUrl); // Warn if API URL looks misconfigured
    fetchBins();
  }, []);

  // Connect to SSE when a bin is selected
  useEffect(() => {
    if (selectedBinId) {
      connectSSE(selectedBinId);
      fetchRequests(selectedBinId);
    } else {
      disconnectSSE();
    }
    return () => disconnectSSE();
  }, [selectedBinId]);

const fetchBins = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/bins`, { headers: getHeaders() });
      if (res.ok) {
        const response = await res.json();
        // Handle both array response and {success, data} format
        const binsData = Array.isArray(response) ? response : (response.data || []);
        setBins(binsData);
        setError(null); // Clear errors on success
        if (binsData.length > 0 && !selectedBinId) {
          setSelectedBinId(binsData[0].id);
        }
      } else {
        const errorText = await res.text();
        setError(`Failed to fetch bins: ${res.status} ${res.statusText}`);
        console.error('Failed to fetch bins:', res.status, errorText);
      }
    } catch (error) {
      const errorMsg = error.message || 'Network error';
      setError(`Failed to connect to API: ${errorMsg}. Make sure VITE_API_URL is set.`);
      console.error('Failed to fetch bins:', error);
    }
  };

const fetchRequests = async (binId) => {
    try {
      const res = await fetch(`${apiUrl}/api/bins/${binId}/requests`, { headers: getHeaders() });
      if (res.ok) {
        const response = await res.json();
        // Handle both array response and {success, data} format
        const requestsData = Array.isArray(response) ? response : (response.data || []);
        setRequests(requestsData);
        if (requestsData.length > 0 && !selectedRequest) {
          setSelectedRequest(requestsData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

const connectSSE = (binId) => {
    disconnectSSE();
    setSseStatus('connecting');
    
    // Pass session ID as query param for SSE (browser EventSource doesn't support custom headers)
    const sessionId = getSessionId();
    const eventSource = new EventSource(`${apiUrl}/api/bins/${binId}/stream?sessionId=${encodeURIComponent(sessionId)}`);
    sseRef.current = eventSource;

    eventSource.onopen = () => {
      setSseStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const newRequest = JSON.parse(event.data);
        setRequests((prev) => [newRequest, ...prev]);
        if (!selectedRequest) {
          setSelectedRequest(newRequest);
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      setSseStatus('disconnected');
      eventSource.close();
    };
  };

  const disconnectSSE = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    setSseStatus('disconnected');
  };

const createBin = async () => {
    try {
      // Only send non-empty fields
      const payload = {
        mockStatusCode: newBinConfig.mockStatusCode,
        mockBody: newBinConfig.mockBody,
      };
      if (newBinConfig.name && newBinConfig.name.trim()) {
        payload.name = newBinConfig.name.trim();
      }
      
      const res = await fetch(`${apiUrl}/api/bins`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const response = await res.json();
        // Handle both {success, data} and direct bin format
        const newBin = response.data || response;
        setBins((prev) => [...prev, newBin]);
        setSelectedBinId(newBin.id);
        setIsCreating(false);
        setNewBinConfig({ name: '', mockStatusCode: 200, mockBody: '{}' });
      }
    } catch (error) {
      console.error('Failed to create bin:', error);
    }
  };

const deleteBinRequests = async (binId) => {
    try {
      const res = await fetch(`${apiUrl}/api/bins/${binId}/requests`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setRequests([]);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to delete requests:', error);
    }
  };

  // Delete individual bin
  const deleteBin = async (binId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete bin "${binId}"?`)) return;
    try {
      const res = await fetch(`${apiUrl}/api/bins/${binId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setBins((prev) => prev.filter((b) => b.id !== binId));
        // If deleted bin was selected, clear selection
        if (selectedBinId === binId) {
          setSelectedBinId(null);
          setRequests([]);
          setSelectedRequest(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete bin:', error);
    }
  };

  // Delete ALL bins (only for current session)
  const deleteAllBins = async () => {
    if (!window.confirm('Delete ALL your bins? This cannot be undone.')) return;
    try {
      const res = await fetch(`${apiUrl}/api/bins`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setBins([]);
        setSelectedBinId(null);
        setRequests([]);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to delete all bins:', error);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const bodyStr = JSON.stringify(req.body || {}).toLowerCase();
    const headersStr = JSON.stringify(req.headers || {}).toLowerCase();
    return bodyStr.includes(searchLower) || headersStr.includes(searchLower);
  });

  const getMethodColor = (method) => METHOD_COLORS[method] || 'text-text-secondary';

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatJson = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getWebhookUrl = (binId) => {
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}/hook/${binId}`;
  };

return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-status-delete/90 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:opacity-80">✕</button>
        </div>
      )}
      {/* Left Sidebar - Bin List */}
      <aside className={`w-64 flex-shrink-0 border-r border-border bg-surface flex flex-col ${error ? 'pt-10' : ''}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent-violet animate-pulse" />
              Alba WebHook
            </h1>
            <p className="text-xs text-text-muted mt-1">Webhook Inspector</p>
          </div>
          {bins.length > 0 && (
            <button
              onClick={deleteAllBins}
              className="text-text-muted hover:text-status-delete transition-colors p-1 rounded"
              title="Delete All Bins"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.997-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="p-3">
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary w-full text-sm"
          >
            + New Mock
          </button>
        </div>

{isCreating && (
          <div className="p-3 border-t border-border bg-background">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted">Bin Name (Optional)</label>
                <input
                  type="text"
                  value={newBinConfig.name}
                  onChange={(e) => setNewBinConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="input text-sm"
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">Mock Status</label>
                <input
                  type="number"
                  value={newBinConfig.mockStatusCode}
                  onChange={(e) => setNewBinConfig(prev => ({ ...prev, mockStatusCode: Number(e.target.value) }))}
                  className="input text-sm"
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">Mock Body (JSON)</label>
                <textarea
                  value={newBinConfig.mockBody}
                  onChange={(e) => setNewBinConfig(prev => ({ ...prev, mockBody: e.target.value }))}
                  className="input text-sm h-20 resize-none font-mono text-xs"
                  placeholder='{"message": "ok"}'
                />
              </div>
              <div className="flex gap-2">
                <button onClick={createBin} className="btn btn-primary flex-1 text-sm">
                  Create
                </button>
                <button onClick={() => setIsCreating(false)} className="btn btn-secondary flex-1 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

<div className="flex-1 overflow-y-auto">
          {bins.map((bin) => (
            <div
              key={bin.id}
              onClick={() => setSelectedBinId(bin.id)}
              className={`group w-full p-3 text-left border-b border-border transition-colors flex items-center justify-between ${
                selectedBinId === bin.id 
                  ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue' 
                  : 'hover:bg-surface'
              }`}
            >
              <div className="flex-1 min-w-0">
                {/* Custom name or fallback to ID */}
                {bin.name ? (
                  <>
                    <div className="text-sm font-medium text-text-primary truncate">
                      {bin.name}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono truncate mt-0.5">
                      {bin.id}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-text-primary truncate">
                    {bin.id}
                  </div>
                )}
                <div className="text-xs text-text-muted mt-1">
                  Mock: {bin.mockStatusCode || 200}
                </div>
              </div>
              <button
                onClick={(e) => deleteBin(bin.id, e)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-delete transition-all p-1 rounded ml-2"
                title="Delete Bin"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.997-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          {bins.length === 0 && (
            <div className="p-4 text-center text-text-muted text-sm">
              No bins yet. Create one to get started.
            </div>
          )}
        </div>
      </aside>

      {/* Center Panel - Requests List */}
      <section className="w-80 flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-text-primary">Requests</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                sseStatus === 'connected' ? 'bg-status-get animate-pulse' : 'bg-text-muted'
              }`} />
              <span className="text-xs text-text-muted">
                {sseStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in payloads..."
            className="input text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRequests.map((req, index) => (
            <button
              key={req.id || index}
              onClick={() => setSelectedRequest(req)}
              className={`w-full p-3 text-left border-b border-border transition-colors ${
                selectedRequest?.id === req.id 
                  ? 'bg-accent-violet/10 border-l-2 border-l-accent-violet' 
                  : 'hover:bg-background'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${getMethodColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="w-2 h-2 rounded-full bg-status-get" />
                <span className="text-xs text-text-muted ml-auto">
                  {formatTime(req.timestamp)}
                </span>
              </div>
              <div className="text-xs text-text-muted mt-1 truncate">
                {req.url || req.path || '/'}
              </div>
            </button>
          ))}
          {filteredRequests.length === 0 && (
            <div className="p-4 text-center text-text-muted text-sm">
              {searchQuery ? 'No matching requests' : 'No requests yet'}
            </div>
          )}
        </div>

        {selectedBinId && (
          <div className="p-3 border-t border-border">
            <button
              onClick={() => deleteBinRequests(selectedBinId)}
              className="btn btn-secondary w-full text-sm text-status-delete"
            >
              Clear Requests
            </button>
          </div>
        )}
      </section>

      {/* Right Panel - Monaco Editor */}
      <main className="flex-1 flex flex-col bg-background">
        {selectedBinId && (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Inspector</h2>
                <p className="text-xs text-text-muted">
                  {selectedRequest ? `${selectedRequest.method} request` : 'Select a request'}
                </p>
              </div>
              {selectedBinId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Webhook URL:</span>
                  <code className="text-xs bg-surface px-2 py-1 rounded border border-border">
                    {getWebhookUrl(selectedBinId)}
                  </code>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedRequest ? (
                <div className="h-full flex flex-col">
                  {/* Request Info Bar */}
                  <div className="p-3 bg-surface border-b border-border flex items-center gap-4">
                    <span className={`text-lg font-bold ${getMethodColor(selectedRequest.method)}`}>
                      {selectedRequest.method}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {selectedRequest.url || selectedRequest.path}
                    </span>
                    <span className="text-xs text-text-muted ml-auto">
                      {new Date(selectedRequest.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Tabs for different sections */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-hidden border-b border-border">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme="vs-dark"
                        value={formatJson(selectedRequest.body)}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: 'JetBrains Mono, Fira Code, monospace',
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                          folding: true,
                          renderLineHighlight: 'line',
                          cursorStyle: 'line',
                          scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                        }}
                      />
                    </div>
                    
                    {/* Headers Section */}
                    <div className="h-48 overflow-hidden">
                      <div className="text-xs text-text-muted p-2 bg-surface border-b border-border">
                        Headers
                      </div>
                      <div className="h-[calc(100%-28px)] overflow-auto">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          theme="vs-dark"
                          value={formatJson(selectedRequest.headers)}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, Fira Code, monospace',
                            lineNumbers: 'off',
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                            scrollbar: {
                              verticalScrollbarSize: 8,
                              horizontalScrollbarSize: 8,
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎣</div>
                    <p>Select a request to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedBinId && (
          <div className="h-full flex items-center justify-center text-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">🎣</div>
              <p>Select or create a bin to start inspecting webhooks</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

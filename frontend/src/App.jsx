import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

const METHOD_COLORS = {
  GET: 'text-status-get',
  POST: 'text-status-post',
  PUT: 'text-status-put',
  DELETE: 'text-status-delete',
  PATCH: 'text-status-patch',
};

// Session management...
const getSessionId = () => {
  const STORAGE_KEY = 'alba_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Session-ID': getSessionId(),
});

const validateApiUrl = (url) => {
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
  const [activeTab, setActiveTab] = useState('body'); // 'body' | 'headers'

  const sseRef = useRef(null);

  useEffect(() => {
    getSessionId();
    validateApiUrl(apiUrl);
    fetchBins();
  }, []);

  useEffect(() => {
    if (selectedBinId) {
      connectSSE(selectedBinId);
      fetchRequests(selectedBinId);
    } else {
      disconnectSSE();
    }
    return () => disconnectSSE();
  }, [selectedBinId]);

  const fetchBins = async () => { /* ... mesmo código ... */ };
  const fetchRequests = async (binId) => { /* ... mesmo código ... */ };
  const connectSSE = (binId) => { /* ... mesmo código ... */ };
  const disconnectSSE = () => { /* ... mesmo código ... */ };
  const createBin = async () => { /* ... mesmo código ... */ };
  const deleteBinRequests = async (binId) => { /* ... mesmo código ... */ };
  const deleteBin = async (binId, e) => { /* ... mesmo código ... */ };
  const deleteAllBins = async () => { /* ... mesmo código ... */ };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      JSON.stringify(req.body || {}).toLowerCase().includes(searchLower) ||
      JSON.stringify(req.headers || {}).toLowerCase().includes(searchLower)
    );
  });

  const getMethodColor = (method) => METHOD_COLORS[method] || 'text-text-secondary';

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    // Você pode adicionar um toast aqui se quiser
    console.log(`${label} copiado!`);
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

      {/* Left Sidebar - Bin List (mantido igual) */}
      <aside className={`w-64 flex-shrink-0 border-r border-border bg-surface flex flex-col ${error ? 'pt-10' : ''}`}>
        {/* ... mesmo conteúdo da sidebar ... */}
        {/* (Mantive o mesmo para não alongar demais, mas está igual) */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent-violet animate-pulse" />
              Alba WebHook
            </h1>
            <p className="text-xs text-text-muted mt-1">Webhook Inspector</p>
          </div>
          {bins.length > 0 && (
            <button onClick={deleteAllBins} className="text-text-muted hover:text-status-delete transition-colors p-1 rounded" title="Delete All Bins">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.997-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-3">
          <button onClick={() => setIsCreating(true)} className="btn btn-primary w-full text-sm">
            + New Mock
          </button>
        </div>

        {isCreating && (
          <div className="p-3 border-t border-border bg-background">
            {/* Form de criação mantido igual */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted">Bin Name (Optional)</label>
                <input type="text" value={newBinConfig.name} onChange={(e) => setNewBinConfig(prev => ({ ...prev, name: e.target.value }))} className="input text-sm" placeholder="My Webhook" />
              </div>
              <div>
                <label className="text-xs text-text-muted">Mock Status</label>
                <input type="number" value={newBinConfig.mockStatusCode} onChange={(e) => setNewBinConfig(prev => ({ ...prev, mockStatusCode: Number(e.target.value) }))} className="input text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">Mock Body (JSON)</label>
                <textarea value={newBinConfig.mockBody} onChange={(e) => setNewBinConfig(prev => ({ ...prev, mockBody: e.target.value }))} className="input text-sm h-20 resize-none font-mono text-xs" placeholder='{"message": "ok"}' />
              </div>
              <div className="flex gap-2">
                <button onClick={createBin} className="btn btn-primary flex-1 text-sm">Create</button>
                <button onClick={() => setIsCreating(false)} className="btn btn-secondary flex-1 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {bins.map((bin) => (
            <div key={bin.id} onClick={() => setSelectedBinId(bin.id)} className={`group w-full p-3 text-left border-b border-border transition-colors flex items-center justify-between ${selectedBinId === bin.id ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue' : 'hover:bg-surface'}`}>
              <div className="flex-1 min-w-0">
                {bin.name ? (
                  <>
                    <div className="text-sm font-medium text-text-primary truncate">{bin.name}</div>
                    <div className="text-xs text-neutral-500 font-mono truncate mt-0.5">{bin.id}</div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-text-primary truncate">{bin.id}</div>
                )}
                <div className="text-xs text-text-muted mt-1">Mock: {bin.mockStatusCode || 200}</div>
              </div>
              <button onClick={(e) => deleteBin(bin.id, e)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-delete transition-all p-1 rounded ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.997-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Center - Requests List (mantido) */}
      <section className="w-80 flex-shrink-0 border-r border-border bg-surface flex flex-col">
        {/* ... conteúdo igual ... */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-text-primary">Requests</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sseStatus === 'connected' ? 'bg-status-get animate-pulse' : 'bg-text-muted'}`} />
              <span className="text-xs text-text-muted">{sseStatus === 'connected' ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search in payloads..." className="input text-sm" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRequests.map((req) => (
            <button key={req.id} onClick={() => setSelectedRequest(req)} className={`w-full p-3 text-left border-b border-border transition-colors ${selectedRequest?.id === req.id ? 'bg-accent-violet/10 border-l-2 border-l-accent-violet' : 'hover:bg-background'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${getMethodColor(req.method)}`}>{req.method}</span>
                <span className="text-xs text-text-muted ml-auto">{formatTime(req.timestamp)}</span>
              </div>
              <div className="text-xs text-text-muted mt-1 truncate">{req.url || req.path || '/'}</div>
            </button>
          ))}
        </div>

        {selectedBinId && (
          <div className="p-3 border-t border-border">
            <button onClick={() => deleteBinRequests(selectedBinId)} className="btn btn-secondary w-full text-sm text-status-delete">Clear Requests</button>
          </div>
        )}
      </section>

      {/* ==================== DIREITA - INSPECTOR (NOVO DESIGN) ==================== */}
      <main className="flex-1 flex flex-col bg-background overflow-hidden">
        {selectedBinId && selectedRequest ? (
          <>
            {/* Header Info */}
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold ${getMethodColor(selectedRequest.method)}`}>
                  {selectedRequest.method}
                </span>
                <div>
                  <div className="font-mono text-sm text-text-primary break-all">
                    {selectedRequest.url || selectedRequest.path}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {new Date(selectedRequest.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">Webhook URL:</span>
                <code className="text-xs bg-background px-3 py-1.5 rounded border border-border font-mono">
                  {getWebhookUrl(selectedBinId)}
                </code>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-surface">
              <button
                onClick={() => setActiveTab('body')}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'body' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-primary'}`}
              >
                Body
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'headers' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-primary'}`}
              >
                Headers
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeTab === 'body' && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between bg-surface border-b border-border px-4 py-2">
                    <span className="text-xs uppercase tracking-widest text-text-muted">Request Body</span>
                    <button
                      onClick={() => copyToClipboard(formatJson(selectedRequest.body), 'Body')}
                      className="text-xs flex items-center gap-1 text-accent-blue hover:text-blue-400 transition-colors"
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={formatJson(selectedRequest.body)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'JetBrains Mono, monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        folding: true,
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'headers' && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between bg-surface border-b border-border px-4 py-2">
                    <span className="text-xs uppercase tracking-widest text-text-muted">Headers</span>
                    <button
                      onClick={() => copyToClipboard(formatJson(selectedRequest.headers), 'Headers')}
                      className="text-xs flex items-center gap-1 text-accent-blue hover:text-blue-400 transition-colors"
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={formatJson(selectedRequest.headers)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: 'JetBrains Mono, monospace',
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-50">🎣</div>
              <p className="text-lg">Selecione uma requisição para inspecionar</p>
              <p className="text-sm mt-2">Envie um webhook para o URL acima</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
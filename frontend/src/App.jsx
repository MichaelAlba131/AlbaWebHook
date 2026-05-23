import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const METHOD_COLORS = {
  GET: 'text-blue-400',
  POST: 'text-emerald-400',
  PUT: 'text-amber-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

// --- Funções Auxiliares ---
const getSessionId = () => {
  const STORAGE_KEY = 'alba_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
};

const getHeaders = () => ({ 'Content-Type': 'application/json', 'X-Session-ID': getSessionId() });

function App({ apiUrl }) {
  const [bins, setBins] = useState([]);
  const [selectedBinId, setSelectedBinId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [sseStatus, setSseStatus] = useState('disconnected');
  const sseRef = useRef(null);

  useEffect(() => { fetchBins(); }, []);

  useEffect(() => {
    if (selectedBinId) {
      connectSSE(selectedBinId);
      fetchRequests(selectedBinId);
    }
    return () => disconnectSSE();
  }, [selectedBinId]);

  const fetchBins = async () => {
    const res = await fetch(`${apiUrl}/api/bins`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setBins(data.data || []);
    }
  };

  const fetchRequests = async (binId) => {
    const res = await fetch(`${apiUrl}/api/bins/${binId}/requests`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setRequests(data.data || []);
      setSelectedRequest(data.data?.[0] || null);
    }
  };

  const connectSSE = (binId) => {
    if (sseRef.current) sseRef.current.close();
    setSseStatus('connecting');
    const eventSource = new EventSource(`${apiUrl}/api/bins/${binId}/stream?sessionId=${getSessionId()}`);
    sseRef.current = eventSource;
    eventSource.onopen = () => setSseStatus('connected');
    eventSource.onmessage = (event) => {
      const newRequest = JSON.parse(event.data);
      setRequests((prev) => [newRequest, ...prev]);
    };
    eventSource.onerror = () => setSseStatus('disconnected');
  };

  const disconnectSSE = () => { if (sseRef.current) sseRef.current.close(); };

  return (
    <div className="h-screen flex bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar Bins */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800 font-bold text-lg">Alba Inspector</div>
        <div className="flex-1 overflow-y-auto">
          {bins.map((bin) => (
            <div key={bin.id} onClick={() => setSelectedBinId(bin.id)} 
                 className={`p-3 cursor-pointer border-b border-slate-800 ${selectedBinId === bin.id ? 'bg-blue-900/30' : 'hover:bg-slate-800'}`}>
              <div className="font-mono text-sm">{bin.id}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Requests List */}
      <section className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-3 border-b border-slate-800 font-semibold text-sm">Requests</div>
        <div className="flex-1 overflow-y-auto">
          {requests.map((req) => (
            <div key={req.id} onClick={() => setSelectedRequest(req)} 
                 className={`p-3 cursor-pointer border-b border-slate-800 text-xs ${selectedRequest?.id === req.id ? 'bg-slate-800' : ''}`}>
              <span className={`font-bold mr-2 ${METHOD_COLORS[req.method]}`}>{req.method}</span>
              {req.path}
            </div>
          ))}
        </div>
      </section>

      {/* Painel da Direita (Inspector) */}
      <main className="flex-1 flex flex-col bg-slate-950">
        {selectedRequest ? (
          <div className="h-full flex flex-col p-6 gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedRequest.method} {selectedRequest.path}</h2>
                <p className="text-slate-400 text-sm">IP: {selectedRequest.ip} • {new Date(selectedRequest.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 h-32">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Headers</h4>
                <pre className="text-xs overflow-auto h-20 text-slate-300">{JSON.stringify(selectedRequest.headers, null, 2)}</pre>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Query</h4>
                <pre className="text-xs overflow-auto h-20 text-slate-300">{JSON.stringify(selectedRequest.query, null, 2)}</pre>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Body</h4>
              <div className="flex-1 rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
                <Editor height="100%" theme="vs-dark" defaultLanguage="json" value={JSON.stringify(selectedRequest.body, null, 2)} options={{ readOnly: true }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600">Selecione uma request</div>
        )}
      </main>
    </div>
  );
}

export default App;
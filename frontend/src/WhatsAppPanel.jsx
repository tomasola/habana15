import React, { useState, useEffect } from 'react';
import { MessageCircle, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';

export default function WhatsAppPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Error fetching WA logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Polling cada 5s
    return () => clearInterval(interval);
  }, []);

  const deleteLog = async (id) => {
    try {
      await fetch(`/api/whatsapp/media/${id}`, { method: 'DELETE' });
      fetchLogs();
    } catch (e) {
      console.error("Error deleting:", e);
    }
  };

  const textLogs = logs.filter(l => l.type === 'text');
  const mediaLogs = logs.filter(l => l.type === 'media');

  return (
    <div className="panel cyber-border" style={{ height: 'calc(100vh - 120px)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageCircle style={{ color: '#25D366' }} /> WhatsApp Dashboard
        </h2>
        <button onClick={fetchLogs} className="cyber-tab-btn" style={{ padding: '5px 15px' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Columna Textos */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '15px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
          <h3 style={{ color: '#00F3FF', marginBottom: '15px' }}>Conversaciones</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {textLogs.map(log => (
              <div key={log.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>
                  {log.sender} • {new Date(log.timestamp).toLocaleString()}
                </div>
                <div>{log.content}</div>
              </div>
            ))}
            {textLogs.length === 0 && <div style={{ color: '#555', textAlign: 'center', marginTop: '20px' }}>No hay mensajes de texto</div>}
          </div>
        </div>

        {/* Columna Media */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '15px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
          <h3 style={{ color: '#00F3FF', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} /> Descargas & Media
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', alignContent: 'start' }}>
            {mediaLogs.map(log => (
              <div key={log.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={`/api/whatsapp/media/${log.media_path}`} 
                  alt="wa-media"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/140?text=Error'; }}
                />
                <button 
                  onClick={() => deleteLog(log.id)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Trash2 size={12} />
                </button>
                {log.content && (
                  <div style={{ padding: '5px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.8)', color: '#ccc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {log.content}
                  </div>
                )}
              </div>
            ))}
            {mediaLogs.length === 0 && <div style={{ color: '#555', gridColumn: '1 / -1', textAlign: 'center', marginTop: '20px' }}>No hay archivos multimedia</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const AIPanel = ({ logs }) => {
  const [aiLogs, setAiLogs] = useState([]);

  useEffect(() => {
    // Filtrar los logs para obtener solo los de AI/Neural
    if (logs && logs.length > 0) {
      const filtered = logs.filter(
        log => log.component === 'Neural' || log.component === 'AI' || log.component === 'State' || log.sender === 'AI' || log.sender === 'Neural'
      );
      setAiLogs(filtered.slice(-10)); // Mostrar los últimos 10
    }
  }, [logs]);

  return (
    <div className="glass-panel" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '20px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '300px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: '#00ffcc',
          boxShadow: '0 0 10px #00ffcc',
          animation: 'pulse 2s infinite' 
        }}></span>
        Habana AI Core
      </h3>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }} className="custom-scrollbar">
        {aiLogs.length === 0 ? (
          <div style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
            Esperando actividad neural...
          </div>
        ) : (
          aiLogs.map((log, index) => (
            <div key={index} style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              borderLeft: log.level === 'ERROR' ? '3px solid #ff4444' : '3px solid #00ffcc',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{log.component || log.sender}</span>
                <span>{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
              <div style={{ wordBreak: 'break-word', color: log.level === 'ERROR' ? '#ff9999' : '#e0e0e0' }}>
                {log.message || log.text}
              </div>
            </div>
          ))
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 204, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 255, 204, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 204, 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 204, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 204, 0.5);
        }
      `}} />
    </div>
  );
};

export default AIPanel;

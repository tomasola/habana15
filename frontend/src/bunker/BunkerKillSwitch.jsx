import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Power, RefreshCw } from 'lucide-react';

export default function BunkerKillSwitch({ 
  isEnabled = true, 
  onToggle = null, 
  API_BASE = '',
  compact = false 
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const targetState = !isEnabled;
    try {
      const res = await fetch(`${API_BASE}/api/bunker/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetState })
      });
      if (res.ok) {
        if (onToggle) onToggle(targetState);
      }
    } catch (e) {
      console.error('Error toggling Kill Switch:', e);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={isEnabled ? "Búnker IA Activo (Clic para AISLAR de emergencia)" : "Búnker IA Aislado (Clic para CONECTAR)"}
        style={{
          background: isEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.25)',
          border: isEnabled ? '1.5px solid #10b981' : '1.5px solid #ef4444',
          color: isEnabled ? '#34d399' : '#f87171',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.74rem',
          fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: isEnabled ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 14px rgba(239, 68, 68, 0.4)',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : isEnabled ? (
          <ShieldCheck size={14} />
        ) : (
          <ShieldAlert size={14} />
        )}
        <span>{isEnabled ? 'BÚNKER: ON' : 'BÚNKER: AISLADO'}</span>
      </button>
    );
  }

  return (
    <div style={{
      background: isEnabled 
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.2))' 
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(127, 29, 29, 0.3))',
      border: isEnabled ? '1.5px solid rgba(16, 185, 129, 0.4)' : '2px solid #ef4444',
      borderRadius: '12px',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: isEnabled ? 'none' : '0 0 24px rgba(239, 68, 68, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: isEnabled ? '#10b981' : '#ef4444',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isEnabled ? '0 0 12px #10b981' : '0 0 16px #ef4444'
        }}>
          {isEnabled ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
        </div>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>KILL SWITCH MAESTRO DEL BÚNKER:</span>
            <span style={{ color: isEnabled ? '#34d399' : '#f87171' }}>
              {isEnabled ? 'CONECTADO Y ACTIVO' : 'AISLADO POR SEGURIDAD'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            {isEnabled 
              ? 'La IA local tiene permiso para crear y probar componentes dentro del sandbox del Búnker.'
              : 'El Búnker está completamente desconectado de HABANA. Ninguna orden de la IA puede alcanzar las luces ni los actuadores.'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        style={{
          background: isEnabled ? '#ef4444' : '#10b981',
          border: 'none',
          color: '#fff',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '0.78rem',
          fontWeight: 900,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: isEnabled ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 14px rgba(16, 185, 129, 0.4)',
          transition: 'all 0.15s ease'
        }}
      >
        <Power size={14} />
        <span>{isEnabled ? 'DESCONECTAR BÚNKER (KILL SWITCH)' : 'CONECTAR BÚNKER'}</span>
      </button>
    </div>
  );
}

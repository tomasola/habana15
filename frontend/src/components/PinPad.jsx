import React, { useState } from 'react';
import { Delete, CheckCircle2, ShieldAlert } from 'lucide-react';

const API_BASE = "";

export default function PinPad({ onClose, showStatus }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePress = (num) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (action) => {
    if (!pin) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/security/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showStatus(`Pin correcto. Alarma ${action === 'arm' ? 'Armada' : 'Desarmada'}`, 'success');
        onClose();
      } else {
        showStatus("PIN incorrecto", "error");
        setPin("");
      }
    } catch (e) {
      showStatus("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    fontSize: '3rem',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s',
    aspectRatio: '1/1'
  };

  return (
    <div style={{
      background: '#111', border: '1px solid #333', borderRadius: '24px',
      padding: '2rem', width: '400px', maxWidth: '90vw',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 1.5rem 0', color: 'var(--primary, #00f3ff)', fontSize: '2rem' }}>INGRESE PIN</h2>
      
      {/* Display */}
      <div style={{
        background: '#000', border: '2px solid #333', borderRadius: '12px',
        padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '80px'
      }}>
        <div style={{ letterSpacing: '10px', fontSize: '3rem', color: '#fff' }}>
          {pin.replace(/./g, '•')}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handlePress(num.toString())} style={btnStyle}
            onPointerDown={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onPointerUp={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}>
            {num}
          </button>
        ))}
        <button onClick={handleDelete} style={{...btnStyle, color: '#ff4444'}}>
          <Delete size={40} />
        </button>
        <button onClick={() => handlePress("0")} style={btnStyle}>0</button>
        <div />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => handleSubmit("disarm")}
          disabled={loading || !pin}
          style={{
            flex: 1, padding: '1.5rem', borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981',
            color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold', cursor: pin ? 'pointer' : 'not-allowed',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: (!pin || loading) ? 0.5 : 1
          }}
        >
          <CheckCircle2 size={32} /> DESARMAR
        </button>
        <button 
          onClick={() => handleSubmit("arm")}
          disabled={loading || !pin}
          style={{
            flex: 1, padding: '1.5rem', borderRadius: '12px',
            background: 'rgba(255, 0, 60, 0.2)', border: '2px solid #ff003c',
            color: '#ff003c', fontSize: '1.2rem', fontWeight: 'bold', cursor: pin ? 'pointer' : 'not-allowed',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: (!pin || loading) ? 0.5 : 1
          }}
        >
          <ShieldAlert size={32} /> ARMAR
        </button>
      </div>
    </div>
  );
}

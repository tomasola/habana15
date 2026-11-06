import React, { useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Fingerprint } from 'lucide-react';

export default function SecurityModal({ event, onClose }) {
  // auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!event) return null;

  const isSuccess = event.event === 'FACE_RECOGNIZED' || event.event === 'ALARM_DISARMED';
  const isWarning = event.event === 'ALARM_ARMED';
  const isError = event.event === 'PIN_FAILED';

  const color = isSuccess ? '#10b981' : (isError ? '#ff003c' : '#f59e0b');
  const Icon = isSuccess ? ShieldCheck : (isError ? ShieldAlert : Fingerprint);

  const getMessage = () => {
    switch (event.event) {
      case 'FACE_RECOGNIZED': return `Rostro reconocido. Bienvenido, ${event.user}.`;
      case 'ALARM_DISARMED': return `Alarma desarmada por ${event.user}.`;
      case 'ALARM_ARMED': return `Alarma armada por ${event.user}.`;
      case 'PIN_FAILED': return 'Intento de PIN fallido.';
      default: return 'Evento de seguridad registrado.';
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: `rgba(0, 0, 0, 0.85)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 30px ${color}66`,
        borderRadius: '16px',
        padding: '2rem 4rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        color: '#fff',
        pointerEvents: 'auto',
        animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <Icon size={64} color={color} style={{ animation: isError ? 'shake 0.5s' : 'pulse 2s infinite' }} />
        <h2 style={{ margin: 0, color: color, fontSize: '2rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Seguridad
        </h2>
        <p style={{ margin: 0, fontSize: '1.25rem', color: '#eee', textAlign: 'center' }}>
          {getMessage()}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
      `}</style>
    </div>
  );
}

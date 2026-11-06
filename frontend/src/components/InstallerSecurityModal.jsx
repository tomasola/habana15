import React, { useState, useEffect } from 'react';

export default function InstallerSecurityModal({
  isOpen,
  onClose,
  mode = 'settings', // 'settings' | 'verify'
  onVerified = () => {},
  API_BASE = 'http://127.0.0.1:8050'
}) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/installer-security`);
      if (res.ok) {
        const data = await res.json();
        setPinEnabled(data.pin_enabled);
        setHasPin(data.has_pin);
      }
    } catch (e) {
      console.error('Error fetching installer security status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setConfirmPin('');
      setErrorMsg('');
      setSuccessMsg('');
      fetchSecurityStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePadPress = (val) => {
    setErrorMsg('');
    if (val === 'DEL') {
      setPinInput(prev => prev.slice(0, -1));
    } else if (val === 'CLR') {
      setPinInput('');
    } else {
      if (pinInput.length < 8) {
        setPinInput(prev => prev + val);
      }
    }
  };

  const handleVerify = async () => {
    if (!pinInput) {
      setErrorMsg('Introduce el PIN de instalador');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/system/installer-security/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (data.valid) {
        onVerified();
        onClose();
      } else {
        setErrorMsg('PIN incorrecto. Inténtalo de nuevo.');
        setPinInput('');
      }
    } catch (e) {
      setErrorMsg('Error de conexión con el servidor');
    }
  };

  const handleSaveSettings = async (enablePin, newPinValue = null) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (enablePin) {
      const pinToSave = newPinValue !== null ? newPinValue : pinInput;
      if (!pinToSave || pinToSave.length < 4) {
        setErrorMsg('El PIN debe tener al menos 4 dígitos numéricos.');
        return;
      }
    }

    try {
      const payload = {
        pin_enabled: enablePin,
        pin: enablePin ? (newPinValue !== null ? newPinValue : pinInput) : ''
      };
      const res = await fetch(`${API_BASE}/api/system/installer-security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setPinEnabled(data.pin_enabled);
        setHasPin(data.has_pin);
        setPinInput('');
        setConfirmPin('');
        setSuccessMsg(enablePin ? '✅ PIN de instalador guardado y activado.' : '🔓 Modo libre activado (Sin PIN).');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (e) {
      setErrorMsg('Error al guardar la configuración');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0b1329, #050a18)',
        border: '1px solid rgba(0, 243, 255, 0.35)',
        boxShadow: '0 0 50px rgba(0, 243, 255, 0.2)',
        borderRadius: '20px',
        padding: '28px',
        width: '92%',
        maxWidth: '430px',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* CABECERA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(0, 243, 255, 0.15)',
              border: '1px solid #00f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              {mode === 'verify' ? '🔐' : '⚙️'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.18rem', color: '#00f3ff', fontWeight: 800 }}>
                {mode === 'verify' ? 'PIN de Acceso Instalador' : 'Seguridad Modo Instalador'}
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {mode === 'verify'
                  ? 'Introduce el código PIN para acceder a herramientas técnicas'
                  : 'Configura o elimina la protección por PIN'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* MODO AJUSTES: ESTADO ACTUAL & SELECTOR */}
        {mode === 'settings' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>Estado de Protección:</div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                {pinEnabled && hasPin ? 'Bloqueo con PIN activo' : 'Acceso libre (Sin PIN)'}
              </div>
            </div>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: pinEnabled && hasPin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              color: pinEnabled && hasPin ? '#34d399' : '#facc15',
              border: `1px solid ${pinEnabled && hasPin ? '#10b981' : '#eab308'}`
            }}>
              {pinEnabled && hasPin ? '🔒 CON PIN' : '🔓 SIN PIN (LIBRE)'}
            </span>
          </div>
        )}

        {/* PANTALLA DISPLAY DEL PIN */}
        <div style={{
          background: '#020617',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '14px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '1.8rem',
            letterSpacing: '8px',
            fontFamily: 'monospace',
            color: '#00f3ff',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {pinInput ? (showPin ? pinInput : '•'.repeat(pinInput.length)) : (
              <span style={{ color: '#334155', fontSize: '1rem', letterSpacing: 'normal' }}>
                {mode === 'verify' ? 'Introduce PIN' : 'Nuevo PIN (4-8 dígitos)'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {showPin ? '🙈 Ocultar dígitos' : '👁️ Mostrar dígitos'}
          </button>
        </div>

        {/* TECLADO PINPAD TÁCTIL */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handlePadPress(val)}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: val === 'DEL' || val === 'CLR' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${val === 'DEL' || val === 'CLR' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: val === 'DEL' || val === 'CLR' ? '#f87171' : '#fff',
                fontSize: val === 'DEL' || val === 'CLR' ? '0.85rem' : '1.3rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {val}
            </button>
          ))}
        </div>

        {/* MENSAJES DE ERROR / ÉXITO */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#86efac', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        {mode === 'verify' ? (
          <button
            type="button"
            onClick={handleVerify}
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
              border: 'none',
              color: '#020617',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 243, 255, 0.3)'
            }}
          >
            🔓 Desbloquear Modo Instalador
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleSaveSettings(true, pinInput)}
              disabled={!pinInput || pinInput.length < 4}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: (!pinInput || pinInput.length < 4) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00f3ff, #0284c7)',
                border: 'none',
                color: (!pinInput || pinInput.length < 4) ? '#64748b' : '#020617',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: (!pinInput || pinInput.length < 4) ? 'not-allowed' : 'pointer'
              }}
            >
              🔒 Asignar / Guardar Este PIN
            </button>

            <button
              type="button"
              onClick={() => handleSaveSettings(false, '')}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#facc15',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              🔓 Dejar sin PIN (Acceso Libre Directo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

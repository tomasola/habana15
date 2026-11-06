import React, { useState, useEffect } from 'react';
import { Network, Server, RefreshCw, Save, CheckCircle, AlertTriangle, ShieldCheck, Zap, Wifi } from 'lucide-react';

const API_BASE = "";

const NetworkConfigPanel = ({ onOpenDirectPanel }) => {
  const [settings, setSettings] = useState({
    HOME_ASSISTANT_URL: '',
    PROXMOX_HOST: ''
  });
  const [directMode, setDirectMode] = useState('hybrid');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info'); // info, success, warning, error

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          HOME_ASSISTANT_URL: data.HOME_ASSISTANT_URL || '',
          PROXMOX_HOST: data.PROXMOX_HOST || ''
        });
      }
      const dRes = await fetch(`${API_BASE}/api/direct/config?_=${Date.now()}`);
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.mode) setDirectMode(dData.mode);
      }
    } catch (e) {
      showMessage("Error conectando con el backend", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickModeChange = async (newMode) => {
    setDirectMode(newMode);
    try {
      await fetch(`${API_BASE}/api/direct/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      showMessage(
        newMode === 'direct'
          ? "⚡ Modo Directo Nativo activado (<5ms sin Home Assistant)"
          : newMode === 'hybrid'
          ? "🔀 Modo Híbrido Inteligente activado (Directo + HA Fallback)"
          : "🏠 Modo Puente Home Assistant activado",
        "success"
      );
    } catch (e) {
      showMessage("Modo actualizado en sesión", "info");
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleScan = async () => {
    setIsScanning(true);
    showMessage("Iniciando escaneo de red. Esto puede tardar unos segundos...", "info");
    try {
      const res = await fetch(`${API_BASE}/api/settings/scan`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showMessage(`Escaneo completado. HA: ${data.found.ha_ip || 'No'}, Proxmox: ${data.found.proxmox_ip || 'No'}. El servidor backend se reiniciará.`, "success");
        setTimeout(fetchSettings, 3000);
      } else {
        showMessage(data.message || "Fallo en el escaneo", "warning");
      }
    } catch (e) {
      showMessage("Error durante el escaneo de red", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("Ajustes guardados correctamente", "success");
      } else {
        showMessage(data.detail || "Error al guardar", "error");
      }
    } catch (e) {
      showMessage("Error de red al intentar guardar", "error");
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '14px',
      padding: '24px',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* CABECERA PRINCIPAL ESTILO STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.18)',
        paddingBottom: '18px',
        marginBottom: '22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'
          }}>
            <Network size={25} color="#00f3ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: 'rgba(0, 243, 255, 0.14)',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                letterSpacing: '0.8px'
              }}>
                HABANA 10 NETWORK TOPOLOGY
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                <Wifi size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                SUBRED LAN ACTIVA
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>
              RED Y CONEXIONES EXTERNAS
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              Configura los nodos acoplados a HABANA 10 o ejecuta un auto-descubrimiento de subred local.
            </p>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: messageType === 'error' ? 'rgba(239, 68, 68, 0.18)' : messageType === 'success' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(0, 243, 255, 0.16)',
            color: messageType === 'error' ? '#f87171' : messageType === 'success' ? '#34d399' : '#00f3ff',
            border: `1px solid ${messageType === 'error' ? '#ef4444' : messageType === 'success' ? '#10b981' : '#00f3ff'}`
          }}>
            {messageType === 'error' && <AlertTriangle size={14} />}
            {messageType === 'success' && <CheckCircle size={14} />}
            {message}
          </div>
        )}
      </div>

      {/* BANNER INFORMATIVO Y ACCESO RÁPIDO DE ARQUITECTURA DOMÓTICA */}
      <div style={{
        background: directMode === 'direct'
          ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : directMode === 'hybrid'
          ? 'linear-gradient(90deg, rgba(0, 243, 255, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)',
        border: `1px solid ${directMode === 'direct' ? '#10b981' : directMode === 'hybrid' ? '#00f3ff' : '#f59e0b'}`,
        borderRadius: '12px',
        padding: '16px 18px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={16} color={directMode === 'direct' ? '#10b981' : directMode === 'hybrid' ? '#00f3ff' : '#f59e0b'} />
            <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.92rem' }}>
              Arquitectura Activa:{' '}
              <span style={{ color: directMode === 'direct' ? '#34d399' : directMode === 'hybrid' ? '#00f3ff' : '#fbbf24' }}>
                {directMode === 'direct'
                  ? '⚡ MODO DIRECTO NATIVO (Sin Home Assistant)'
                  : directMode === 'hybrid'
                  ? '🔀 MODO HÍBRIDO INTELIGENTE (Directo + HA Fallback)'
                  : '🏠 MODO PUENTE HOME ASSISTANT (Clásico)'}
              </span>
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {directMode === 'direct'
              ? 'HABANA 10 gobierna los dispositivos directamente por sockets LAN locales (<5 ms) sin requerir Home Assistant.'
              : directMode === 'hybrid'
              ? 'Órdenes instantáneas por socket directo en dispositivos nativos + sincronización con Home Assistant.'
              : 'Todas las órdenes se enrutan a través del servidor Home Assistant configurado abajo.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleQuickModeChange('direct')}
            style={{
              padding: '7px 12px',
              background: directMode === 'direct' ? '#10b981' : 'rgba(15, 23, 42, 0.8)',
              color: directMode === 'direct' ? '#020617' : '#cbd5e1',
              border: '1px solid #10b981',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ⚡ Directo
          </button>
          <button
            onClick={() => handleQuickModeChange('hybrid')}
            style={{
              padding: '7px 12px',
              background: directMode === 'hybrid' ? '#00f3ff' : 'rgba(15, 23, 42, 0.8)',
              color: directMode === 'hybrid' ? '#020617' : '#cbd5e1',
              border: '1px solid #00f3ff',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔀 Híbrido
          </button>
          <button
            onClick={() => handleQuickModeChange('home_assistant')}
            style={{
              padding: '7px 12px',
              background: directMode === 'home_assistant' ? '#f59e0b' : 'rgba(15, 23, 42, 0.8)',
              color: directMode === 'home_assistant' ? '#020617' : '#cbd5e1',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🏠 HA
          </button>
          {onOpenDirectPanel && (
            <button
              onClick={onOpenDirectPanel}
              style={{
                padding: '7px 14px',
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid #10b981',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Abrir Gestor Directo ↗
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '2.5rem',
          color: '#94a3b8',
          background: 'rgba(15, 23, 42, 0.65)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <RefreshCw className="spin" size={24} color="#00f3ff" />
          <p style={{ marginTop: '10px', fontSize: '0.85rem' }}>Cargando topología de red...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {/* TARJETA SERVIDOR HOME ASSISTANT */}
            <div style={{
              padding: '20px',
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              opacity: directMode === 'direct' ? 0.72 : 1,
              transition: 'all 0.25s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} color="#f59e0b" /> Servidor Domótico (Home Assistant)
                </h3>
                {directMode === 'direct' ? (
                  <span style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    Opcional · Modo Directo Activo
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    PUERTO :8123
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
                Endpoint HTTP/WebSocket para sincronización secundaria o pasarela tradicional.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.76rem', fontWeight: '600' }}>URL o IP de Home Assistant</label>
                <input
                  type="text"
                  className="cyber-input"
                  value={settings.HOME_ASSISTANT_URL}
                  onChange={(e) => setSettings({ ...settings, HOME_ASSISTANT_URL: e.target.value })}
                  placeholder="http://192.168.1.X:8123"
                  style={{
                    background: '#090f1f',
                    color: '#00f3ff',
                    padding: '10px 12px',
                    border: '1px solid rgba(0, 243, 255, 0.25)',
                    borderRadius: '8px',
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>

            {/* TARJETA NODO PROXMOX / WHATSAPP */}
            <div style={{
              padding: '20px',
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} color="#a855f7" /> Nodo Proxmox / WhatsApp Bridge
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#d8b4fe', background: 'rgba(168, 85, 247, 0.16)', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                  HOST VIRTUALIZACIÓN
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
                Dirección IP del hipervisor Proxmox o contenedor del puente de mensajería neural.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.76rem', fontWeight: '600' }}>IP del Servidor Proxmox</label>
                <input
                  type="text"
                  className="cyber-input"
                  value={settings.PROXMOX_HOST}
                  onChange={(e) => setSettings({ ...settings, PROXMOX_HOST: e.target.value })}
                  placeholder="192.168.1.X"
                  style={{
                    background: '#090f1f',
                    color: '#00f3ff',
                    padding: '10px 12px',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: '8px',
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* BARRA DE ACCIONES DE RED */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
              <ShieldCheck size={16} color="#00f3ff" />
              <span>El escaneo verifica puertos locales estándar y actualiza de forma segura las variables de entorno.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="cyber-button"
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(59, 130, 246, 0.22))',
                  color: '#00f3ff',
                  border: '1px solid #00f3ff',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 243, 255, 0.18)'
                }}
              >
                <Save size={16} /> Guardar Ajustes Manuales
              </button>
              <button
                className="cyber-button error"
                onClick={handleScan}
                disabled={isScanning}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.24))',
                  color: '#f472b6',
                  border: '1px solid #ec4899',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.83rem',
                  opacity: isScanning ? 0.6 : 1,
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.2)'
                }}
              >
                <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
                {isScanning ? "Escaneando red..." : "Auto-Descubrir Red Local"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkConfigPanel;


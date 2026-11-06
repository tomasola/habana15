import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, RadioReceiver, RefreshCw, Speaker, Sliders, Power, Bell, CheckCircle2, Timer } from 'lucide-react';

const API_BASE = "";

export default function SpeakerConfigPanel() {
  const [speakers, setSpeakers] = useState([]);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [localDelay, setLocalDelay] = useState(1850);
  const [loading, setLoading] = useState(false);
  const volumeDebounceRef = useRef({});
  const delayDebounceRef = useRef(null);

  const fetchSpeakers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cast/status`);
      const data = await res.json();
      if (data.status === 'success') {
        setSpeakers(data.speakers || []);
        const active = (data.speakers || []).filter(s => s.connected);
        if (active.length > 0) {
           const avg = active.reduce((acc, curr) => acc + curr.volume, 0) / active.length;
           setMasterVolume(avg);
        }
        const pcSpeaker = (data.speakers || []).find(s => s.name === 'Tarjeta de Sonido PC' || s.device_type === 'local_soundcard');
        if (pcSpeaker && pcSpeaker.delay_ms !== undefined) {
          setLocalDelay(pcSpeaker.delay_ms);
        }
      }
    } catch (error) {
      console.error('Error fetching speakers', error);
    }
  };

  useEffect(() => {
    fetchSpeakers();
    const interval = setInterval(fetchSpeakers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeChange = (target, level) => {
    setSpeakers(prev => prev.map(s => s.name === target ? { ...s, volume: level } : s));
    if (volumeDebounceRef.current[target]) {
      clearTimeout(volumeDebounceRef.current[target]);
    }
    volumeDebounceRef.current[target] = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/cast/volume/set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, level })
        });
      } catch (e) {
        console.error('Error setting volume', e);
      }
    }, 120);
  };

  const handleMasterVolumeChange = (level) => {
    setMasterVolume(level);
    setSpeakers(prev => prev.map(s => s.connected ? { ...s, volume: level } : s));
    if (volumeDebounceRef.current['master']) {
      clearTimeout(volumeDebounceRef.current['master']);
    }
    volumeDebounceRef.current['master'] = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/cast/volume/set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'todos', level })
        });
      } catch (e) {
        console.error('Error setting master volume', e);
      }
    }, 120);
  };

  const handleToggleSpeaker = async (name, currentEnabled) => {
    const nextState = !currentEnabled;
    setSpeakers(prev => prev.map(s => s.name === name ? { ...s, enabled: nextState } : s));
    try {
      const res = await fetch(`${API_BASE}/api/cast/speaker/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled: nextState })
      });
      if (res.ok && window.showToast) {
        window.showToast(nextState ? `Altavoz ${name} activado para Radio e IA` : `Altavoz ${name} desactivado`);
      }
    } catch (e) {
      console.error('Error toggling speaker', e);
    }
  };

  const handleBulkToggle = async (enabled) => {
    setSpeakers(prev => prev.map(s => ({ ...s, enabled })));
    try {
      await fetch(`${API_BASE}/api/cast/speakers/bulk-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (window.showToast) {
        window.showToast(enabled ? 'Todos los altavoces activados' : 'Todos los altavoces desactivados');
      }
    } catch (e) {
      console.error('Error bulk toggling speakers', e);
    }
  };

  const handleDelayChange = (newDelay) => {
    const val = Math.max(0, Math.min(10000, newDelay));
    setLocalDelay(val);
    setSpeakers(prev => prev.map(s => (s.name === 'Tarjeta de Sonido PC' || s.device_type === 'local_soundcard') ? { ...s, delay_ms: val } : s));
    if (delayDebounceRef.current) {
      clearTimeout(delayDebounceRef.current);
    }
    delayDebounceRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/cast/local-delay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delay_ms: val })
        });
        if (window.showToast) {
          window.showToast(`⏱️ Retardo Tarjeta PC ajustado a ${val} ms`, 'info');
        }
      } catch (e) {
        console.error('Error setting local delay', e);
      }
    }, 150);
  };

  const handleTestSpeaker = async (name) => {
    try {
      if (window.showToast) window.showToast(`Emitiendo prueba en ${name}...`);
      const res = await fetch(`${API_BASE}/api/cast/speaker/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.status === 'success' && window.showToast) {
        window.showToast(`Prueba enviada a ${name}`);
      }
    } catch (e) {
      console.error('Error testing speaker', e);
    }
  };

  const onlineCount = speakers.filter(s => s.connected).length;
  const enabledCount = speakers.filter(s => s.enabled !== false).length;

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '14px',
      padding: '24px',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* CABECERA PRINCIPAL ESTILO STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.18)',
        paddingBottom: '18px'
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
            <RadioReceiver size={25} color="#00f3ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
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
                MULTI-ROOM AUDIO // GOOGLE CAST + TARJETA DE SONIDO PC
              </span>
              <span style={{
                background: enabledCount > 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                border: `1px solid ${enabledCount > 0 ? '#10b981' : '#ef4444'}`,
                color: enabledCount > 0 ? '#34d399' : '#f87171',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                🔊 {enabledCount} / {speakers.length} ACTIVADOS (EMISIÓN)
              </span>
              <span style={{
                background: onlineCount > 0 ? 'rgba(0, 243, 255, 0.14)' : 'rgba(245, 158, 11, 0.18)',
                border: `1px solid ${onlineCount > 0 ? '#00f3ff' : '#f59e0b'}`,
                color: onlineCount > 0 ? '#00f3ff' : '#fbbf24',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                {onlineCount} ONLINE
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>
              CONTROL DE ALTAVOCES & MATRIZ DE AUDIO
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              Selecciona manualmente en qué altavoces emitir la radio y las respuestas de voz de la IA, con balance de volumen individual.
            </p>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN MASIVA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleBulkToggle(true)}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Activar emisión en todos los altavoces"
          >
            <CheckCircle2 size={13} /> Activar Todos
          </button>

          <button
            type="button"
            onClick={() => handleBulkToggle(false)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Desactivar emisión en todos los altavoces"
          >
            <VolumeX size={13} /> Desactivar Todos
          </button>

          <button
            type="button"
            onClick={fetchSpeakers}
            style={{
              background: 'rgba(0, 243, 255, 0.1)',
              border: '1px solid rgba(0, 243, 255, 0.4)',
              color: '#00f3ff',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} /> Refrescar Nodos
          </button>
        </div>
      </div>

      {/* LISTA / GRID DE ALTAVOCES CON SELECTOR MANUAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '14px' }}>
        {speakers.map((s, idx) => {
          const isEnabled = s.enabled !== false;
          const isLocalSoundcard = s.device_type === 'local_soundcard' || s.name.includes('Tarjeta');
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: isEnabled ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.42)',
                padding: '18px',
                borderRadius: '12px',
                border: isEnabled
                  ? (s.connected
                      ? (isLocalSoundcard ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(0, 243, 255, 0.35)')
                      : '1px solid rgba(255, 255, 255, 0.12)')
                  : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: isEnabled && s.connected
                  ? (isLocalSoundcard ? '0 4px 20px rgba(168, 85, 247, 0.12)' : '0 4px 20px rgba(0, 243, 255, 0.1)')
                  : 'none',
                opacity: isEnabled ? 1 : 0.68,
                transition: 'all 0.22s ease'
              }}
            >
              {/* FILA SUPERIOR: INFORMACIÓN Y BOTONES DE ACTIVACIÓN/TEST */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: !isEnabled ? '#64748b' : s.connected ? (isLocalSoundcard ? '#a855f7' : '#10b981') : '#ef4444',
                    boxShadow: !isEnabled ? 'none' : s.connected ? (isLocalSoundcard ? '0 0 12px #a855f7' : '0 0 12px #10b981') : '0 0 10px #ef4444',
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', color: isEnabled ? '#fff' : '#94a3b8', fontSize: '0.96rem' }}>
                        {s.name}
                      </span>
                      {isLocalSoundcard && (
                        <span style={{
                          background: 'rgba(168, 85, 247, 0.18)',
                          border: '1px solid #a855f7',
                          color: '#d8b4fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.62rem',
                          fontWeight: 'bold',
                          letterSpacing: '0.5px'
                        }}>
                          JACK 3.5mm / HARDWARE PC
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: isEnabled ? (isLocalSoundcard ? '#c084fc' : '#34d399') : '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                      {s.ip} · {s.connected ? (isEnabled ? 'ONLINE · ACTIVO (RADIO & IA)' : 'ONLINE · SILENCIADO') : 'OFFLINE'}
                    </div>
                  </div>
                </div>

                {/* BOTONES: ACTIVAR MANUALMENTE Y PROBAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSpeaker(s.name, isEnabled)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      background: isEnabled
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(0, 243, 255, 0.2))'
                        : 'rgba(2, 6, 23, 0.6)',
                      border: isEnabled ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: isEnabled ? '#34d399' : '#94a3b8',
                      boxShadow: isEnabled ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none'
                    }}
                    title={isEnabled ? "Haz clic para desactivar este altavoz de la emisión" : "Haz clic para activar este altavoz para Radio e IA"}
                  >
                    <Power size={13} />
                    {isEnabled ? 'EMITIENDO' : 'DESACTIVADO'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestSpeaker(s.name)}
                    disabled={!s.connected}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      cursor: s.connected ? 'pointer' : 'not-allowed',
                      fontSize: '0.74rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(0, 243, 255, 0.1)',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#00f3ff',
                      opacity: s.connected ? 1 : 0.4
                    }}
                    title="Emitir prueba por voz en este altavoz"
                  >
                    <Bell size={13} />
                    Test
                  </button>
                </div>
              </div>

              {/* FILA INFERIOR: CONTROL DE VOLUMEN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {s.volume === 0 || !isEnabled ? (
                  <VolumeX size={18} color="#64748b" />
                ) : (
                  <Volume2 size={18} color="#00f3ff" />
                )}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={s.volume}
                  onChange={(e) => handleVolumeChange(s.name, parseFloat(e.target.value))}
                  disabled={!s.connected || !isEnabled}
                  style={{
                    flex: 1,
                    cursor: (s.connected && isEnabled) ? 'pointer' : 'not-allowed',
                    accentColor: isEnabled ? '#00f3ff' : '#64748b'
                  }}
                />
                <span style={{
                  fontSize: '0.82rem',
                  color: (s.connected && isEnabled) ? '#00f3ff' : '#64748b',
                  fontWeight: 'bold',
                  minWidth: '46px',
                  textAlign: 'right',
                  background: 'rgba(2, 6, 23, 0.7)',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {Math.round(s.volume * 100)}%
                </span>
              </div>

              {/* BLOQUE DE CALIBRACIÓN DE RETARDO (SOLO PARA TARJETA DE SONIDO PC) */}
              {isLocalSoundcard && (
                <div style={{
                  marginTop: '4px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(2, 6, 23, 0.72)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#d8b4fe', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Timer size={13} color="#c084fc" /> RETARDO SINCRONIZACIÓN HILO MUSICAL:
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      color: '#c084fc',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      background: 'rgba(168, 85, 247, 0.16)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(168, 85, 247, 0.32)'
                    }}>
                      {localDelay} ms ({(localDelay / 1000).toFixed(2)} s)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="0"
                      max="4000"
                      step="25"
                      value={localDelay}
                      onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        flex: 1,
                        accentColor: '#a855f7',
                        cursor: (s.connected && isEnabled) ? 'pointer' : 'not-allowed'
                      }}
                    />
                  </div>

                  {/* BOTONES DE AJUSTE FINO */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ajuste fino:</span>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(localDelay - 100)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#d8b4fe',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      -100ms
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(localDelay - 25)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#d8b4fe',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      -25ms
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(localDelay + 25)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#d8b4fe',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      +25ms
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(localDelay + 100)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#d8b4fe',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      +100ms
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      onClick={() => handleDelayChange(0)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer'
                      }}
                    >
                      0s Directo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(1850)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(0, 243, 255, 0.1)',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        color: '#00f3ff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer'
                      }}
                    >
                      ~1.85s Cast
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelayChange(2100)}
                      disabled={!s.connected || !isEnabled}
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer'
                      }}
                    >
                      ~2.10s Nest
                    </button>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                    Sube o baja este valor mientras suena la radio hasta eliminar por completo el desfase/eco entre la tarjeta del PC y los altavoces de la casa.
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {speakers.length === 0 && (
          <div style={{
            color: '#64748b',
            textAlign: 'center',
            padding: '28px',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.12)'
          }}>
            No hay altavoces Google Cast registrados o en caché.
          </div>
        )}
      </div>

      {/* BLOQUE DE VOLUMEN MAESTRO */}
      <div style={{
        marginTop: '4px',
        padding: '18px 20px',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(30, 18, 56, 0.82))',
        borderRadius: '12px',
        border: '1px solid rgba(168, 85, 247, 0.42)',
        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={18} color="#c084fc" />
          <div>
            <div style={{ fontWeight: 'bold', color: '#e9d5ff', fontSize: '0.96rem' }}>Volumen Maestro Multi-Estancia</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sincroniza simultáneamente todos los altavoces activos de la casa</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, maxWidth: '360px', minWidth: '220px' }}>
          <Volume2 size={20} color="#c084fc" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
          />
          <span style={{
            fontSize: '0.88rem',
            color: '#e9d5ff',
            fontWeight: 'bold',
            minWidth: '52px',
            textAlign: 'center',
            background: 'rgba(168, 85, 247, 0.2)',
            border: '1px solid #a855f7',
            padding: '4px 8px',
            borderRadius: '8px'
          }}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

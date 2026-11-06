import React, { useState, useEffect } from 'react';
import { 
  Thermometer, Droplets, Wind, ArrowUp, ArrowDown, 
  Square, RefreshCw, Sun, Moon, CloudSun, Power, 
  CheckCircle2, AlertCircle, Snowflake, Flame, Fan, 
  Sliders, Shield, ChevronUp, ChevronDown,
  Settings, Clock, Play, RotateCcw, X, Check, Timer
} from 'lucide-react';

export default function BunkerMeteorologia({ API_BASE = '', isEnabled = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [controlling, setControlling] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Estados locales temporales de persianas para respuesta instantánea de slider
  const [sliderPositions, setSliderPositions] = useState({});

  // Estado para calibrador de tiempos diferenciados (Subida vs Bajada)
  const [calibratingCover, setCalibratingCover] = useState(null);
  const [calibDraft, setCalibDraft] = useState({ time_up: 22, time_down: 17, motor_reversal: false });
  const [isSavingCalib, setIsSavingCalib] = useState(false);

  // Cronómetro interactivo para medir en vivo el tiempo de subida o bajada
  const [stopwatch, setStopwatch] = useState({ running: false, startTime: 0, elapsed: 0, mode: null });

  useEffect(() => {
    let timer = null;
    if (stopwatch.running) {
      timer = setInterval(() => {
        setStopwatch(prev => ({
          ...prev,
          elapsed: Math.round(((Date.now() - prev.startTime) / 1000) * 10) / 10
        }));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [stopwatch.running]);

  const openCalibrationModal = (cov) => {
    setCalibratingCover(cov);
    setCalibDraft({
      time_up: cov.time_up || 22.0,
      time_down: cov.time_down || 17.0,
      motor_reversal: !!cov.motor_reversal
    });
    setStopwatch({ running: false, startTime: 0, elapsed: 0, mode: null });
  };

  const handleStartStopwatch = async (mode) => {
    if (!calibratingCover) return;
    setStopwatch({ running: true, startTime: Date.now(), elapsed: 0, mode });
    await handleControlCover(calibratingCover.id, mode === 'up' ? 'measure_up' : 'measure_down');
  };

  const handleStopStopwatch = async (applyToMode) => {
    if (!calibratingCover) return;
    const measuredSeconds = Math.max(3, stopwatch.elapsed);
    setStopwatch(prev => ({ ...prev, running: false }));
    await handleControlCover(calibratingCover.id, 'stop');

    if (applyToMode === 'up') {
      setCalibDraft(prev => ({ ...prev, time_up: measuredSeconds }));
      setFeedback({ type: 'success', text: `⏱️ Tiempo de Subida medido con cronómetro: ${measuredSeconds}s` });
    } else if (applyToMode === 'down') {
      setCalibDraft(prev => ({ ...prev, time_down: measuredSeconds }));
      setFeedback({ type: 'success', text: `⏱️ Tiempo de Bajada medido con cronómetro: ${measuredSeconds}s` });
    }
  };

  const handleSaveCalibration = async () => {
    if (!calibratingCover) return;
    setIsSavingCalib(true);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/covers/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_id: calibratingCover.id,
          time_up: parseFloat(calibDraft.time_up),
          time_down: parseFloat(calibDraft.time_down),
          motor_reversal: calibDraft.motor_reversal
        })
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          text: `✅ Calibración de ${calibratingCover.name} guardada: Subida ${calibDraft.time_up}s, Bajada ${calibDraft.time_down}s`
        });
        setCalibratingCover(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', text: err.detail || 'Fallo al guardar calibración' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error de red al guardar calibración' });
    } finally {
      setIsSavingCalib(false);
    }
  };

  const handleSyncPhysicalPosition = async (pos) => {
    if (!calibratingCover) return;
    try {
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/covers/sync_position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_id: calibratingCover.id,
          position: pos
        })
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          text: `📍 Posición física de ${calibratingCover.name} fijada en ${pos}%`
        });
        setSliderPositions(prev => ({ ...prev, [calibratingCover.id]: pos }));
        fetchData();
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error al sincronizar posición física' });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/status`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Inicializar sliders con valores actuales
        const posMap = {};
        (json.covers || []).forEach(c => {
          posMap[c.id] = c.position;
        });
        setSliderPositions(posMap);
      }
    } catch (e) {
      console.error('Error cargando telemetría de meteorología y persianas:', e);
      setFeedback({ type: 'error', text: 'Error de conexión con el servicio de meteorología y persianas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const handleControlCover = async (coverId, action, position = null) => {
    if (!isEnabled) {
      setFeedback({ type: 'error', text: 'El Búnker está aislado (Kill Switch activo). Conéctalo para controlar hardware.' });
      return;
    }
    setControlling(coverId);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/covers/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_id: coverId, action, position })
      });
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          text: `Orden '${action.toUpperCase()}' enviada con éxito a ${coverId.replace('cover.', '')}` 
        });
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', text: err.detail || 'Fallo al mover la persiana' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error al enviar orden a la persiana' });
    } finally {
      setControlling(null);
    }
  };

  const handleControlAll = async (action, position = null) => {
    if (!isEnabled) {
      setFeedback({ type: 'error', text: 'El Búnker está aislado. No se pueden mover las persianas.' });
      return;
    }
    setControlling('all');
    try {
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/covers/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, position })
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: `Comando '${action.toUpperCase()}' ejecutado en TODAS las persianas de la casa` });
        fetchData();
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error al controlar todas las persianas' });
    } finally {
      setControlling(null);
    }
  };

  const handleToggleRule = async (ruleId, currentEnabled) => {
    try {
      const res = await fetch(`${API_BASE}/api/bunker/meteorology/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const covers = data?.covers || [];
  const indoorSensors = data?.indoor_sensors || [];
  const outdoorSensors = data?.outdoor_sensors || [];
  const weatherExt = data?.weather_external;
  const hvac = data?.hvac || {};
  const rules = data?.automation_rules || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* CABECERA METEOROLOGÍA & CLIMA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14, 116, 144, 0.4), rgba(15, 23, 42, 0.85))',
        border: '1px solid rgba(0, 243, 255, 0.3)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🌡️</span>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
              BÚNKER METEOROLOGÍA, SENSORES & PERSIANAS
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#cbd5e1' }}>
            Telemetría continua de temperatura y humedad en estancias, predicción exterior en Ourense y control motorizado de persianas.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refrescar Telemetría</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div style={{
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '0.80rem',
          color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SECCIÓN PRINCIPAL: CONTROL MOTORIZADO DE PERSIANAS    */}
      {/* ======================================================== */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🪟</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>
                GESTIÓN Y CONTROL DE PERSIANAS MOTORIZADAS
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Sincronización nativa Zigbee2MQTT con lectura de posición y ajuste porcentual exacto
            </span>
          </div>

          {/* ACCIONES MAESTRAS (TODAS LAS PERSIANAS) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleControlAll('open')}
              disabled={controlling === 'all'}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowUp size={14} />
              <span>Abrir Todas (100%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleControlAll('set_cover_position', 40)}
              disabled={controlling === 'all'}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>⛅ Rendija (40%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleControlAll('close')}
              disabled={controlling === 'all'}
              style={{
                background: 'linear-gradient(135deg, #475569, #334155)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowDown size={14} />
              <span>Cerrar Todas (0%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleControlAll('stop')}
              disabled={controlling === 'all'}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Square size={13} />
              <span>Detener</span>
            </button>
          </div>
        </div>

        {/* TARJETAS INDIVIDUALES DE PERSIANAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {covers.map(cov => {
            const currentPos = sliderPositions[cov.id] ?? cov.position;
            const isBusy = controlling === cov.id;

            return (
              <div
                key={cov.id}
                style={{
                  background: 'rgba(2, 6, 23, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Cabecera Persiana */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{cov.icon || '🪟'}</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>
                        {cov.name}
                      </h4>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {cov.room} • <code>{cov.id}</code>
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      color: currentPos > 70 ? '#38bdf8' : (currentPos > 20 ? '#fbbf24' : '#94a3b8')
                    }}>
                      {currentPos}%
                    </span>
                    <span style={{
                      display: 'block',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: cov.state === 'OPEN' ? '#34d399' : (cov.state === 'CLOSED' ? '#64748b' : '#38bdf8')
                    }}>
                      {cov.state === 'OPEN' ? 'Abierta' : (cov.state === 'CLOSED' ? 'Cerrada' : 'Parcial')}
                    </span>
                  </div>
                </div>

                {/* Barra de altura visual de la persiana */}
                <div style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentPos}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #00f3ff, #38bdf8)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Slider de posición porcentual */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b' }}>
                    <span>0% (Cerrada)</span>
                    <span>Posición: <b>{currentPos}%</b></span>
                    <span>100% (Abierta)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentPos}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setSliderPositions({ ...sliderPositions, [cov.id]: v });
                    }}
                    onMouseUp={(e) => {
                      const v = parseInt(e.target.value);
                      handleControlCover(cov.id, 'set_cover_position', v);
                    }}
                    onTouchEnd={(e) => {
                      const v = parseInt(e.target.value);
                      handleControlCover(cov.id, 'set_cover_position', v);
                    }}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      accentColor: '#00f3ff'
                    }}
                  />
                </div>

                {/* Botones de acción rápida */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleControlCover(cov.id, 'open')}
                    disabled={isBusy}
                    style={{
                      background: 'rgba(2, 132, 199, 0.18)',
                      border: '1px solid rgba(2, 132, 199, 0.4)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <ArrowUp size={13} />
                    <span>Subir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleControlCover(cov.id, 'stop')}
                    disabled={isBusy}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Square size={13} />
                    <span>Parar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleControlCover(cov.id, 'close')}
                    disabled={isBusy}
                    style={{
                      background: 'rgba(71, 85, 105, 0.25)',
                      border: '1px solid rgba(71, 85, 105, 0.4)',
                      color: '#cbd5e1',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <ArrowDown size={13} />
                    <span>Bajar</span>
                  </button>
                </div>

                {/* Tiempos de Recorrido & Acceso a Calibración */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.68rem',
                  color: '#94a3b8'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span title="Tiempo de subida completa">🔼 <b>{cov.time_up || 22}s</b></span>
                    <span>•</span>
                    <span title="Tiempo de bajada completa (más rápido por gravedad)">🔽 <b>{cov.time_down || 17}s</b></span>
                    {cov.motor_reversal && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>Invertido</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openCalibrationModal(cov)}
                    style={{
                      background: 'rgba(0, 243, 255, 0.1)',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#00f3ff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Settings size={12} />
                    <span>Calibrar Tiempos</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CUADRÍCULA DE SENSORES EN VIVO & EXTERIOR OURENSE     */}
      {/* ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* SENSORES DE TEMPERATURA Y HUMEDAD INTERIOR */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} color="#00f3ff" />
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#fff' }}>
                Sensores Interiores (Sonoff LCD & Aire)
              </h3>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#00f3ff', background: 'rgba(0, 243, 255, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Zigbee En Tiempo Real
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {indoorSensors.map(s => (
              <div
                key={s.id}
                style={{
                  background: 'rgba(2, 6, 23, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.80rem', color: '#fff' }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                    {s.room} • 🔋 {s.battery}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <Thermometer size={16} color="#38bdf8" />
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                        {s.temperature !== undefined ? `${s.temperature}°C` : '--'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: '#94a3b8' }}>Temperatura</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <Droplets size={16} color="#00f3ff" />
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                        {s.humidity !== undefined ? `${s.humidity}%` : '--'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: '#94a3b8' }}>Humedad Rel.</span>
                    </div>
                  </div>
                </div>

                {s.co2 && (
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem', color: '#94a3b8' }}>
                    <span>CO2: <b style={{ color: '#34d399' }}>{s.co2} ppm</b></span>
                    <span>VOC: <b style={{ color: '#38bdf8' }}>{s.voc}</b></span>
                    <span>PM2.5: <b style={{ color: '#fbbf24' }}>{s.pm25} µg</b></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* METEOROLOGÍA EXTERIOR OURENSE & TERRAZA */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudSun size={18} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#fff' }}>
                Condiciones Exteriores (Ourense & Terraza)
              </h3>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Open-Meteo GPS
            </span>
          </div>

          {weatherExt ? (
            <div style={{
              background: 'rgba(2, 6, 23, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                  {weatherExt.temperature}°C
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8' }}>
                  {weatherExt.condition}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                <div>Sensación: <b>{weatherExt.apparent_temperature}°C</b></div>
                <div>Lluvia: <b>{weatherExt.rain_probability}%</b></div>
                <div>Viento: <b>{weatherExt.wind_speed} km/h</b></div>
                <div>Mín/Máx: <b>{weatherExt.temp_min}° / {weatherExt.temp_max}°</b></div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.76rem' }}>Cargando meteo exterior...</div>
          )}

          {/* Sensores Terraza */}
          {outdoorSensors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Sensores de Suelo y Vegetación (Terraza):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {outdoorSensors.map(os => (
                  <div key={os.id} style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.70rem', color: '#cbd5e1' }}>
                    <div style={{ fontWeight: 800, color: '#fff' }}>{os.name}</div>
                    <div>Temp: {os.temperature}°C</div>
                    <div>Humedad: {os.soil_moisture}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. MÓDULO AIRE ACONDICIONADO & REGLAS INTELIGENTES       */}
      {/* ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* TERMOSTATO / AIRE ACONDICIONADO (SANDBOX EN PREPARACIÓN) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Snowflake size={18} color="#a855f7" />
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#fff' }}>
                Climatización & Aire Acondicionado
              </h3>
            </div>
            <span style={{ fontSize: '0.64rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
              Próximamente (Sandbox)
            </span>
          </div>

          <div style={{
            background: 'rgba(2, 6, 23, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Temperatura Consigna Deseada:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
              >
                -
              </button>
              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#c084fc' }}>
                {hvac.target_temperature || 22.0}°C
              </span>
              <button
                type="button"
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
              >
                +
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              {[
                { id: 'cool', label: 'Frío', icon: Snowflake },
                { id: 'heat', label: 'Calor', icon: Flame },
                { id: 'fan', label: 'Ventilación', icon: Fan },
                { id: 'off', label: 'Apagado', icon: Power }
              ].map(m => {
                const Icon = m.icon;
                const isSel = (hvac.mode || 'cool') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    style={{
                      flex: 1,
                      background: isSel ? 'rgba(168, 85, 247, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                      border: isSel ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.08)',
                      color: isSel ? '#fff' : '#94a3b8',
                      borderRadius: '8px',
                      padding: '8px 4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <span style={{ fontSize: '0.66rem', color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
              {hvac.notes}
            </span>
          </div>
        </div>

        {/* REGLAS CLIMA <-> PERSIANAS */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#fff' }}>
                Reglas Inteligentes Térmicas & Persianas
              </h3>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Automatización Búnker
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rules.map(rule => (
              <div
                key={rule.id}
                style={{
                  background: 'rgba(2, 6, 23, 0.55)',
                  border: `1px solid ${rule.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: rule.enabled ? '#fff' : '#94a3b8' }}>
                    {rule.name}
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                    {rule.condition} ➔ <b>{rule.action}</b>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleRule(rule.id, rule.enabled)}
                  style={{
                    background: rule.enabled ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${rule.enabled ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                    color: rule.enabled ? '#34d399' : '#64748b',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {rule.enabled ? 'ACTIVA' : 'DESACTIVADA'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL CONFIGURADOR DE TIEMPOS DIFERENCIADOS */}
      {calibratingCover && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #091328, #050b18)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            borderRadius: '16px',
            maxWidth: '560px',
            maxHeight: '92vh',
            overflowY: 'auto',
            width: '100%',
            padding: '24px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Cabecera Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>⏱️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                    Calibrar Tiempos de Recorrido
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {calibratingCover.name} • {calibratingCover.room}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCalibratingCover(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Explicación Técnica */}
            <div style={{
              background: 'rgba(0, 243, 255, 0.08)',
              border: '1px solid rgba(0, 243, 255, 0.2)',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '0.73rem',
              color: '#cbd5e1',
              lineHeight: '1.4'
            }}>
              💡 <b>Tiempos Asimétricos</b>: Por gravedad y peso, la persiana desciende más rápido de lo que asciende. Configura los segundos exactos de cada sentido para que las paradas (0%, 40%, 50% y 100%) coincidan con precisión física real.
            </div>

            {/* BOTONES DE AJUSTE MANUAL INMEDIATO: SUBIR, PARAR, BAJAR */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(0, 243, 255, 0.25)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🕹️</span>
                  <span>Ajuste Manual Previo (Mover y posicionar la persiana)</span>
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Posición actual: <b style={{ color: '#00f3ff' }}>{sliderPositions[calibratingCover.id] ?? calibratingCover.position}%</b>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleControlCover(calibratingCover.id, 'open')}
                  disabled={controlling === calibratingCover.id}
                  style={{
                    background: 'rgba(2, 132, 199, 0.25)',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.80rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowUp size={16} />
                  <span>Subir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleControlCover(calibratingCover.id, 'stop')}
                  disabled={controlling === calibratingCover.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.80rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Square size={14} />
                  <span>Parar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleControlCover(calibratingCover.id, 'close')}
                  disabled={controlling === calibratingCover.id}
                  style={{
                    background: 'rgba(71, 85, 105, 0.35)',
                    border: '1px solid rgba(148, 163, 184, 0.5)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.80rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowDown size={16} />
                  <span>Bajar</span>
                </button>
              </div>
            </div>

            {/* PASO 1: CALIBRAR RECORRIDO DE SUBIDA */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#38bdf8' }}>
                  🔼 Paso 1: Medir Subida (0% ➔ 100% Arriba)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCalibDraft(prev => ({ ...prev, time_up: Math.max(3, Math.round((prev.time_up - 0.5) * 10) / 10) }))}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', minWidth: '46px', textAlign: 'center' }}>
                    {calibDraft.time_up}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalibDraft(prev => ({ ...prev, time_up: Math.min(120, Math.round((prev.time_up + 0.5) * 10) / 10) }))}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                1. Baja la persiana hasta abajo del todo con el ajuste manual. 2. Pulsa <b>Fijar 0%</b>. 3. Pulsa <b>Iniciar Subida</b> y cuando llegue arriba dale a <b>Parar</b>.
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleSyncPhysicalPosition(0)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  1️⃣ Fijar 0% (Abajo)
                </button>

                {stopwatch.running && stopwatch.mode === 'up' ? (
                  <button
                    type="button"
                    onClick={() => handleStopStopwatch('up')}
                    style={{
                      flex: 1,
                      background: 'rgba(239, 68, 68, 0.4)',
                      border: '2px solid #ef4444',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      animation: 'pulse 1s infinite'
                    }}
                  >
                    <Square size={14} />
                    <span>⏹️ Parar (Llegó Arriba: Guardar en {stopwatch.elapsed}s)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartStopwatch('up')}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(14, 165, 233, 0.2))',
                      border: '1px solid rgba(56, 189, 248, 0.6)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={14} />
                    <span>▶️ Iniciar Subida y Cronómetro</span>
                  </button>
                )}
              </div>

              <input
                type="range"
                min="5"
                max="90"
                step="0.5"
                value={calibDraft.time_up}
                onChange={e => setCalibDraft({ ...calibDraft, time_up: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
              />
            </div>

            {/* PASO 2: CALIBRAR RECORRIDO DE BAJADA */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fbbf24' }}>
                  🔽 Paso 2: Medir Bajada (100% ➔ 0% Abajo)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCalibDraft(prev => ({ ...prev, time_down: Math.max(3, Math.round((prev.time_down - 0.5) * 10) / 10) }))}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', minWidth: '46px', textAlign: 'center' }}>
                    {calibDraft.time_down}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalibDraft(prev => ({ ...prev, time_down: Math.min(120, Math.round((prev.time_down + 0.5) * 10) / 10) }))}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                1. Con la persiana arriba del todo, pulsa <b>Fijar 100%</b>. 2. Pulsa <b>Iniciar Bajada</b> y cuando llegue abajo dale a <b>Parar</b>.
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleSyncPhysicalPosition(100)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  2️⃣ Fijar 100% (Arriba)
                </button>

                {stopwatch.running && stopwatch.mode === 'down' ? (
                  <button
                    type="button"
                    onClick={() => handleStopStopwatch('down')}
                    style={{
                      flex: 1,
                      background: 'rgba(239, 68, 68, 0.4)',
                      border: '2px solid #ef4444',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      animation: 'pulse 1s infinite'
                    }}
                  >
                    <Square size={14} />
                    <span>⏹️ Parar (Llegó Abajo: Guardar en {stopwatch.elapsed}s)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartStopwatch('down')}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.2))',
                      border: '1px solid rgba(245, 158, 11, 0.6)',
                      color: '#fbbf24',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={14} />
                    <span>▶️ Iniciar Bajada y Cronómetro</span>
                  </button>
                )}
              </div>

              <input
                type="range"
                min="5"
                max="90"
                step="0.5"
                value={calibDraft.time_down}
                onChange={e => setCalibDraft({ ...calibDraft, time_down: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#fbbf24', cursor: 'pointer' }}
              />
            </div>

            {/* INVERSIÓN DE SENTIDO */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', display: 'block' }}>Invertir Sentido del Motor</span>
                <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Activa si al pulsar Subir la persiana baja físicamente o viceversa</span>
              </div>
              <input
                type="checkbox"
                checked={calibDraft.motor_reversal}
                onChange={e => setCalibDraft({ ...calibDraft, motor_reversal: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00f3ff' }}
              />
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCalibratingCover(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveCalibration}
                disabled={isSavingCalib}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Check size={14} />
                <span>{isSavingCalib ? 'Guardando...' : 'Guardar y Aplicar en Z2M'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

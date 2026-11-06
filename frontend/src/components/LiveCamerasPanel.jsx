import React, { useState, useEffect, useRef } from 'react';
import { Camera, Shield, RefreshCw, Eye, Maximize2, Minimize2, Settings, AlertTriangle, CheckCircle2, Lock, UserCheck, Sparkles, Download, Video, Trash2 } from 'lucide-react';

export default function LiveCamerasPanel({ API_BASE = 'http://127.0.0.1:8050' }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'single', 'compact'
  const [analysisMap, setAnalysisMap] = useState({});
  const [analyzingMap, setAnalyzingMap] = useState({});
  const [editingCam, setEditingCam] = useState(null);
  const [editForm, setEditForm] = useState({ ip: '', user: '', password: '', room: '', name: '' });
  const [notification, setNotification] = useState(null);
  const [sentinelData, setSentinelData] = useState({ trigger_snapshots: [] });
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [snapshotViewMode, setSnapshotViewMode] = useState('annotated'); // 'annotated' | 'raw'
  const [clearingSnapshots, setClearingSnapshots] = useState(false);

  const fetchSentinelStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cameras/sentinel/status`);
      if (res.ok) {
        const data = await res.json();
        setSentinelData(data);
      }
    } catch (e) {
      console.error('Error fetching sentinel status:', e);
    }
  };

  const handleClearSnapshots = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar todas las capturas forenses guardadas?')) return;
    setClearingSnapshots(true);
    try {
      const res = await fetch(`${API_BASE}/api/cameras/sentinel/snapshots`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Capturas forenses eliminadas correctamente', 'success');
        fetchSentinelStatus();
      } else {
        showToast('Error eliminando capturas', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al eliminar capturas', 'error');
    } finally {
      setClearingSnapshots(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cameras`);
      if (res.ok) {
        const data = await res.json();
        setCameras(data.cameras || []);
      }
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
    fetchSentinelStatus();
    const interval = setInterval(() => {
      fetchCameras();
      fetchSentinelStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAnalyze = async (camId) => {
    setAnalyzingMap(prev => ({ ...prev, [camId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/cameras/${camId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Describe brevemente lo que ves en esta imagen de videovigilancia y si hay personas o actividad inusual.' })
      });
      const data = await res.json();
      if (data.status === 'success' && data.analysis) {
        setAnalysisMap(prev => ({ ...prev, [camId]: data.analysis }));
        showToast(`Análisis completado para ${camId}`, 'success');
      } else {
        showToast('No se pudo completar el análisis de visión', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error en la llamada de análisis', 'error');
    } finally {
      setAnalyzingMap(prev => ({ ...prev, [camId]: false }));
    }
  };

  const openEditModal = (cam) => {
    setEditingCam(cam.id);
    setEditForm({
      ip: cam.ip || '',
      user: cam.user || 'admin',
      password: '',
      room: cam.room || 'general',
      name: cam.name || cam.id
    });
  };

  const saveCamConfig = async () => {
    if (!editingCam) return;
    try {
      const payload = {
        name: editForm.name,
        ip: editForm.ip,
        user: editForm.user,
        room: editForm.room
      };
      if (editForm.password) {
        payload.password = editForm.password;
        // Si es cam720 o tuya, actualizar los streams con las nuevas credenciales
        if (editingCam === 'camara_cam720') {
          payload.stream_hd = `rtsp://${editForm.user}:${editForm.password}@${editForm.ip}:554/live/ch00_0`;
          payload.stream_sub = `rtsp://${editForm.user}:${editForm.password}@${editForm.ip}:554/live/ch00_1`;
        }
      }
      const res = await fetch(`${API_BASE}/api/cameras/${editingCam}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Configuración guardada correctamente', 'success');
        setEditingCam(null);
        fetchCameras();
      } else {
        showToast('Error al guardar configuración', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
    }
  };

  const handleDownloadSnapshot = (camId) => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/api/cameras/${camId}/snapshot.jpg?t=${Date.now()}`;
    link.download = `${camId}_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Captura descargada', 'info');
  };

  return (
    <div style={{
      background: 'rgba(5, 10, 25, 0.96)',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '16px',
      padding: '16px',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
      width: '100%',
      boxSizing: 'border-box',
      paddingBottom: '60px'
    }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 243, 255, 0.95)',
          color: notification.type === 'error' ? '#fff' : '#030712',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {notification.msg}
        </div>
      )}

      {/* Cabecera Principal */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid #00f3ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00f3ff',
            boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'
          }}>
            <Video size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                MURO CCTV & VIGILANCIA COGNITIVA
              </h2>
              <span style={{
                background: 'rgba(0, 255, 136, 0.15)',
                color: '#00ff88',
                border: '1px solid #00ff88',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 8px #00ff88' }} />
                RTSP EN VIVO
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Transmisión de baja latencia sin pasar por nube externa · Visión Multimodal Groq LLaMA / Qwen
            </p>
          </div>
        </div>

        {/* Controles de Vista */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#00f3ff' : 'transparent',
                color: viewMode === 'grid' ? '#030712' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Mosaico
            </button>
            <button
              onClick={() => setViewMode('single')}
              style={{
                background: viewMode === 'single' ? '#00f3ff' : 'transparent',
                color: viewMode === 'single' ? '#030712' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Enfoque Individual
            </button>
          </div>

          <button
            onClick={fetchCameras}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={15} /> Refrescar
          </button>
        </div>
      </div>

      {/* Grid de Cámaras */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'single' ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {cameras.map((cam) => {
          const isAnalyzing = analyzingMap[cam.id];
          const analysis = analysisMap[cam.id];
          const isCam720NeedsAuth = cam.id === 'camara_cam720' && (!cam.stream_hd.includes('@') && !cam.is_connected);

          return (
            <div
              key={cam.id}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.2s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}
            >
              {/* Barra Superior de la Cámara */}
              <div style={{
                padding: '12px 16px',
                background: 'rgba(8, 14, 30, 0.9)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={16} color="#00f3ff" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cam.name}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(255,255,255,0.08)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#94a3b8'
                  }}>
                    {cam.room.toUpperCase()} · {cam.ip}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setFullscreenCam(cam)}
                    title="Pantalla Completa"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Maximize2 size={16} />
                  </button>
                  <button
                    onClick={() => openEditModal(cam)}
                    title="Configuración de Cámara"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              {/* Contenedor del Stream de Vídeo */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9 Aspect Ratio
                background: '#020617',
                overflow: 'hidden'
              }}>
                <img
                  src={`${API_BASE}${cam.stream_url}`}
                  alt={cam.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback a snapshot estático si el stream tiene un microcorte
                    e.target.src = `${API_BASE}${cam.snapshot_url}?t=${Date.now()}`;
                  }}
                />

                {/* Overlay de Telemetría CCTV */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: '#00ff88',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff3366', display: 'inline-block' }} />
                  REC ● RTSP TCP
                </div>

                {/* Banner de contraseña requerida si aplica */}
                {isCam720NeedsAuth && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem'
                  }}>
                    <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} /> Requiere contraseña para conectar RTSP
                    </span>
                    <button
                      onClick={() => openEditModal(cam)}
                      style={{
                        background: '#f59e0b',
                        color: '#030712',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Configurar
                    </button>
                  </div>
                )}
              </div>

              {/* Botonera de Acciones Rápidas */}
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(11, 19, 38, 0.5)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button
                  onClick={() => handleAnalyze(cam.id)}
                  disabled={isAnalyzing}
                  style={{
                    background: isAnalyzing ? 'rgba(0, 243, 255, 0.15)' : 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(124, 58, 237, 0.25))',
                    border: '1px solid #00f3ff',
                    color: '#00f3ff',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isAnalyzing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={14} />
                  {isAnalyzing ? 'Analizando con IA...' : 'Analizar Escena (IA)'}
                </button>

                <button
                  onClick={() => handleDownloadSnapshot(cam.id)}
                  title="Descargar Foto Instantánea"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Download size={14} /> Captura
                </button>
              </div>

              {/* Tarjeta de Reporte de Inteligencia Artificial */}
              {analysis && (
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(8, 14, 28, 0.85)',
                  borderTop: '1px solid rgba(0, 243, 255, 0.2)',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#00f3ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Shield size={14} /> REPORTE COGNITIVO
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: analysis.threat_level === 'NORMAL' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                      color: analysis.threat_level === 'NORMAL' ? '#00ff88' : '#ef4444',
                      border: `1px solid ${analysis.threat_level === 'NORMAL' ? '#00ff88' : '#ef4444'}`
                    }}>
                      AMENAZA: {analysis.threat_level}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.45' }}>
                    {analysis.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      
      {/* Galería Forense de Capturas del Disparo (Visión Neuronal YOLOv8) */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(2, 6, 23, 0.75)',
        borderRadius: '12px',
        padding: '16px 18px',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 243, 255, 0.12)',
              border: '1px solid #00f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f3ff'
            }}>
              <Camera size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', color: '#00f3ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Capturas Forenses de Disparo (Visión Neuronal YOLOv8)
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  background: (sentinelData.trigger_snapshots && sentinelData.trigger_snapshots.length > 0) ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255,255,255,0.06)',
                  color: (sentinelData.trigger_snapshots && sentinelData.trigger_snapshots.length > 0) ? '#00f3ff' : '#64748b',
                  padding: '2px 9px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  border: '1px solid rgba(0, 243, 255, 0.3)'
                }}>
                  {sentinelData.trigger_snapshots ? sentinelData.trigger_snapshots.length : 0} guardadas
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Instantáneas forenses capturadas en el milisegundo exacto de activación con marcado perimetral YOLOv8
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchSentinelStatus}
              style={{
                background: 'rgba(0, 243, 255, 0.1)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                color: '#00f3ff',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={12} /> Refrescar
            </button>

            {sentinelData.trigger_snapshots && sentinelData.trigger_snapshots.length > 0 && (
              <button
                onClick={handleClearSnapshots}
                disabled={clearingSnapshots}
                style={{
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Trash2 size={12} /> {clearingSnapshots ? 'Borrando...' : 'Borrar Capturas'}
              </button>
            )}
          </div>
        </div>

        {(!sentinelData.trigger_snapshots || sentinelData.trigger_snapshots.length === 0) ? (
          <div style={{
            fontSize: '0.8rem',
            color: '#64748b',
            fontStyle: 'italic',
            padding: '24px 12px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.3)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            📷 Cuando una cámara detecte presencia humana y dispare una acción de seguridad o luz, aquí se guardará automáticamente la foto exacta con recuadros verdes y análisis YOLOv8 para investigación forense.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            maxHeight: '420px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {sentinelData.trigger_snapshots.map((snap) => (
              <div
                key={snap.id || snap.filename_annotated}
                onClick={() => {
                  setSelectedSnapshot(snap);
                  setSnapshotViewMode('annotated');
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(0, 243, 255, 0.22)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '135px', background: '#000' }}>
                  <img
                    src={`${API_BASE}${snap.annotated_url}`}
                    alt={snap.details || 'Disparo de luz'}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      if (snap.raw_url) e.currentTarget.src = `${API_BASE}${snap.raw_url}`;
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(10, 15, 30, 0.85)',
                    border: '1px solid #00f3ff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#00f3ff'
                  }}>
                    {snap.cam_name || snap.cam_id}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '6px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.64rem',
                    color: '#cbd5e1'
                  }}>
                    {snap.time_str}
                  </div>
                </div>

                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span>Silueta: <strong style={{ color: '#f8fafc' }}>{snap.max_h || '--'}px</strong></span>
                    <span>Certeza IA: <strong style={{ color: '#10b981' }}>{snap.score ? `${Math.round(snap.score * 100)}%` : 'YOLO'}</strong></span>
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#00f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '2px',
                    fontWeight: 700
                  }}>
                    <Maximize2 size={12} /> Clic para ampliar análisis
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pantalla Completa */}
      {fullscreenCam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.92)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={22} color="#00f3ff" />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{fullscreenCam.name} — En Vivo</h3>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>({fullscreenCam.room} · {fullscreenCam.ip})</span>
            </div>
            <button
              onClick={() => setFullscreenCam(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cerrar ✕
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={`${API_BASE}${fullscreenCam.stream_url}`}
              alt={fullscreenCam.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '12px',
                border: '1px solid rgba(0, 243, 255, 0.4)',
                boxShadow: '0 0 40px rgba(0,0,0,0.8)'
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Configuración de Cámara */}
      {editingCam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid #00f3ff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#00f3ff' }}>
              Configurar {editForm.name}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nombre de la Cámara</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Dirección IP Local</label>
                <input
                  type="text"
                  value={editForm.ip}
                  onChange={(e) => setEditForm({ ...editForm, ip: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Usuario RTSP</label>
                  <input
                    type="text"
                    value={editForm.user}
                    onChange={(e) => setEditForm({ ...editForm, user: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Contraseña RTSP</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Habitación / Zona</label>
                <select
                  value={editForm.room}
                  onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff'
                  }}
                >
                  <option value="terraza">Terraza</option>
                  <option value="pasillo">Pasillo</option>
                  <option value="salon">Salón</option>
                  <option value="entrada">Entrada</option>
                  <option value="andrea">Habitación Andrea</option>
                  <option value="cocina">Cocina</option>
                  <option value="principal">Dormitorio Principal</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setEditingCam(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveCamConfig}
                style={{
                  background: '#00f3ff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  color: '#030712',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Modal Lightbox de Inspección Forense de Captura */}
      {selectedSnapshot && (
        <div
          onClick={() => setSelectedSnapshot(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(3, 7, 18, 0.94)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #090f1f, #0f172a)',
              border: '1.5px solid #00f3ff',
              borderRadius: '12px',
              width: '94%',
              maxWidth: '860px',
              overflow: 'hidden',
              boxShadow: '0 0 50px rgba(0, 243, 255, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#00f3ff" />
                <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                  ANÁLISIS FORENSE: {selectedSnapshot.cam_name || selectedSnapshot.cam_id}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  {selectedSnapshot.time_str}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  background: 'rgba(2, 6, 23, 0.7)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2px'
                }}>
                  <button
                    onClick={() => setSnapshotViewMode('annotated')}
                    style={{
                      background: snapshotViewMode === 'annotated' ? '#00f3ff' : 'transparent',
                      color: snapshotViewMode === 'annotated' ? '#020617' : '#94a3b8',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Anotada (IA YOLO)
                  </button>
                  <button
                    onClick={() => setSnapshotViewMode('raw')}
                    style={{
                      background: snapshotViewMode === 'raw' ? '#00f3ff' : 'transparent',
                      color: snapshotViewMode === 'raw' ? '#020617' : '#94a3b8',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Original Limpia
                  </button>
                </div>

                <button
                  onClick={() => setSelectedSnapshot(null)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 700
                  }}
                >
                  Cerrar ✕
                </button>
              </div>
            </div>

            <div style={{ background: '#020617', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px' }}>
              <img
                src={`${API_BASE}${snapshotViewMode === 'annotated' ? selectedSnapshot.annotated_url : selectedSnapshot.raw_url}`}
                alt={selectedSnapshot.details || 'Captura forense'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 0 20px rgba(0,0,0,0.8)'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.6)'
            }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <div>Silueta: <strong style={{ color: '#00f3ff' }}>{selectedSnapshot.max_h || '--'} px</strong></div>
                <div>Certeza YOLOv8: <strong style={{ color: '#10b981' }}>{selectedSnapshot.score ? `${Math.round(selectedSnapshot.score * 100)}%` : 'YOLO'}</strong></div>
                <div style={{ color: '#38bdf8', fontWeight: 700 }}>👤 Humano Confirmado</div>
              </div>

              <a
                href={`${API_BASE}${snapshotViewMode === 'annotated' ? selectedSnapshot.annotated_url : selectedSnapshot.raw_url}`}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  color: '#38bdf8',
                  fontSize: '0.74rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700
                }}
              >
                <Download size={13} /> Abrir imagen completa
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

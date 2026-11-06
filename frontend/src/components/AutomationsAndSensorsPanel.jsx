import React, { useState, useEffect } from 'react';
import { 
  Zap, Activity, Shield, Droplets, Wind, Sun, DoorClosed, 
  Flame, Battery, Wifi, Play, Plus, Trash2, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, Sparkles, Sliders, Moon, 
  Film, LogOut, Sunrise, Power, Bell, Settings, Edit3, Square,
  Camera, Image, X, Maximize2, ExternalLink,
  Sprout
} from 'lucide-react';
import AutomationEditModal, { getButtonComboLabel } from './AutomationEditModal';
import MoesButtonSwitchCard from './MoesButtonSwitchCard';

export default function AutomationsAndSensorsPanel({ API_BASE = '' }) {
  const [activeTab, setActiveTab] = useState('automations'); // 'automations' | 'sensors'
  const [automations, setAutomations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [sensorSummary, setSensorSummary] = useState({});
  const [sensorCategory, setSensorCategory] = useState('all');
  const [autoCategory, setAutoCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);
  const [simulatingId, setSimulatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [editingAuto, setEditingAuto] = useState(null);
  const [sentinelData, setSentinelData] = useState({
    running: true,
    auto_off_delay_seconds: 45,
    active_presence_lights: [],
    recent_events: []
  });

  // Modales
  const [showNewAutoModal, setShowNewAutoModal] = useState(false);
  const [showNewSensorModal, setShowNewSensorModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [snapshotViewMode, setSnapshotViewMode] = useState('annotated'); // 'annotated' | 'raw'
  const [clearingSnapshots, setClearingSnapshots] = useState(false);

  const handleClearSnapshots = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar todas las capturas de disparo guardadas?')) return;
    setClearingSnapshots(true);
    try {
      const res = await fetch(`${API_BASE}/api/cameras/sentinel/snapshots`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Capturas forenses eliminadas correctamente', 'success');
        fetchData();
      } else {
        showNotification('Error eliminando capturas', 'error');
      }
    } catch (err) {
      showNotification('Error de conexión al eliminar capturas', 'error');
    } finally {
      setClearingSnapshots(false);
    }
  };

  const showNotification = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchData = async () => {
    try {
      const [resAuto, resSens, resSentinel, resDev] = await Promise.all([
        fetch(`${API_BASE}/api/automations`),
        fetch(`${API_BASE}/api/sensors`),
        fetch(`${API_BASE}/api/cameras/sentinel/activity`),
        fetch(`${API_BASE}/api/devices?real_only=true`)
      ]);
      if (resAuto.ok) {
        const data = await resAuto.json();
        setAutomations(data.automations || []);
      }
      if (resSens.ok) {
        const data = await resSens.json();
        setSensors(data.sensors || []);
        setSensorSummary(data.summary || {});
      }
      if (resSentinel.ok) {
        const sData = await resSentinel.json();
        setSentinelData(sData);
      }
      if (resDev.ok) {
        const dData = await resDev.json();
        setAvailableDevices(dData || []);
      }
    } catch (e) {
      console.error('Error cargando automatizaciones y sensores:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTurnOffPresenceLights = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cameras/sentinel/turn-off-all`, { method: 'POST' });
      if (res.ok) {
        showNotification('🛑 Luces de presencia apagadas y temporizadores cancelados', 'info');
        fetchData();
      }
    } catch (e) {
      showNotification('Error al apagar luces', 'error');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteAutomation = async (id, name) => {
    setExecutingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/automations/${id}/execute`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.status === 'condition_not_met') {
          showNotification(`⚠️ ${data.result.message || 'Condiciones no cumplidas'}`, 'warning');
        } else {
          showNotification(`⚡ Ejecutada con éxito: ${name}`, 'success');
        }
        fetchData();
      } else {
        showNotification('Error ejecutando automatización', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setExecutingId(null);
    }
  };

  const handleToggleAutomation = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTurnOffAutomation = async (id, name) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations/${id}/turn-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showNotification(`⏹️ Dispositivos de '${name}' apagados correctamente`, 'info');
        fetchData();
      } else {
        showNotification('Error al apagar dispositivos de la escena', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión al apagar regla', 'error');
    }
  };

  const handleSaveAutomation = async (autoData) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoData)
      });
      if (res.ok) {
        showNotification(`💾 Regla '${autoData.name}' guardada con éxito`, 'success');
        setEditingAuto(null);
        fetchData();
      } else {
        showNotification('Error al guardar la regla', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión al guardar regla', 'error');
    }
  };

  const handleDeleteAutomation = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente la regla '${name}'?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/automations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`🗑️ Regla '${name}' eliminada`, 'info');
        setEditingAuto(null);
        fetchData();
      } else {
        showNotification('Error al eliminar regla', 'error');
      }
    } catch (e) {
      showNotification('Error de red al eliminar', 'error');
    }
  };

  const handleToggleQuickScene = async (auto) => {
    const updated = {
      ...auto,
      is_quick_scene: !auto.is_quick_scene,
      quick_color: auto.quick_color || '#00f3ff'
    };
    try {
      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showNotification(
          updated.is_quick_scene
            ? `✨ '${auto.name}' añadida a ESCENAS RÁPIDAS`
            : `⚪ '${auto.name}' quitada de ESCENAS RÁPIDAS`,
          'info'
        );
        fetchData();
      }
    } catch (e) {
      showNotification('Error actualizando Escena Rápida', 'error');
    }
  };

  const handleToggleSensorInstalled = async (sensor) => {
    const nextInstalled = !sensor.installed;
    try {
      const res = await fetch(`${API_BASE}/api/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sensor,
          installed: nextInstalled,
          notes: nextInstalled ? 'Conectado y operativo en tiempo real' : 'Pre-configurado para futura instalación'
        })
      });
      if (res.ok) {
        showNotification(
          nextInstalled
            ? `🟢 Sensor '${sensor.name}' marcado como INSTALADO EN VIVO`
            : `⏳ Sensor '${sensor.name}' marcado como FUTURO / EN PREPARACIÓN`,
          'info'
        );
        fetchData();
      }
    } catch (e) {
      showNotification('Error actualizando estado del sensor', 'error');
    }
  };

  const [editingSensor, setEditingSensor] = useState(null);

  const handleSaveSensor = async (sensorData) => {
    try {
      if (sensorData.category === 'plant') {
        sensorData.type = 'soil_sensor';
        if (!sensorData.attributes) sensorData.attributes = {};
        if (sensorData.attributes.soil_moisture === undefined) sensorData.attributes.soil_moisture = 0;
        if (sensorData.attributes.temperature === undefined) sensorData.attributes.temperature = 22;
        sensorData.attributes.temperature_unit = 'celsius';
        const moist = sensorData.attributes.soil_moisture;
        const temp = sensorData.attributes.temperature;
        sensorData.value = `${moist}% humedad | ${temp}°C`;
        sensorData.state = moist < 15 ? 'dry' : (moist > 65 ? 'wet' : 'optimal');
      }
      const res = await fetch(`${API_BASE}/api/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensorData)
      });
      if (res.ok) {
        showNotification(`📡 Sensor '${sensorData.name}' guardado correctamente`, 'success');
        setEditingSensor(null);
        fetchData();
      } else {
        showNotification('Error guardando sensor', 'error');
      }
    } catch (e) {
      showNotification('Error de red al guardar sensor', 'error');
    }
  };

  const handleDeleteSensor = async (sensorId, sensorName) => {
    if (!window.confirm(`¿Eliminar el sensor '${sensorName}' de la matriz?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/sensors/${sensorId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`🗑️ Sensor '${sensorName}' eliminado`, 'info');
        setEditingSensor(null);
        fetchData();
      }
    } catch (e) {
      showNotification('Error eliminando sensor', 'error');
    }
  };

  const quickScenesList = automations
    .filter(a => a.is_quick_scene === true)
    .sort((a, b) => (a.quick_order ?? 50) - (b.quick_order ?? 50));

  const handleSimulateSensor = async (sensorId, eventType) => {
    setSimulatingId(sensorId);
    try {
      const res = await fetch(`${API_BASE}/api/sensors/${sensorId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventType })
      });
      if (res.ok) {
        showNotification(`Simulación aplicada a ${sensorId}`, 'info');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingId(null);
    }
  };

  const filteredSensors = sensorCategory === 'all' 
    ? sensors 
    : sensors.filter(s => s.category === sensorCategory);

  const filteredAutomations = autoCategory === 'all'
    ? automations
    : automations.filter(a => a.category === autoCategory || (autoCategory === 'camera' && a.trigger?.type === 'camera'));

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'button': return <Radio size={18} color="#00f3ff" />;
      case 'presence': return <Eye size={18} color="#00f3ff" />;
      case 'power': return <Zap size={18} color="#f59e0b" />;
      case 'water': return <Droplets size={18} color="#38bdf8" />;
      case 'air': return <Wind size={18} color="#10b981" />;
      case 'contact': return <DoorClosed size={18} color="#a855f7" />;
      case 'light_lux': return <Sun size={18} color="#fbbf24" />;
      case 'smoke_gas': return <Flame size={18} color="#ef4444" />;
      default: return <Activity size={18} color="#94a3b8" />;
    }
  };

  return (
    <div style={{
      background: 'rgba(5, 10, 25, 0.96)',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '16px',
      padding: '24px',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 243, 255, 0.95)',
          color: toast.type === 'error' ? '#fff' : '#030712',
          fontWeight: '700',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Cabecera Principal */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.14)',
            border: '1px solid #00f3ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00f3ff',
            boxShadow: '0 0 18px rgba(0, 243, 255, 0.35)'
          }}>
            <Sliders size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.38rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                AUTOMATIZACIONES & MATRIZ DE SENSORES
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid #10b981',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                MOTOR AUTÓNOMO 24/7
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
              Reglas inteligentes, control por visión de cámaras, telemetría multivariable y protección contra fugas
            </p>
          </div>
        </div>

        {/* Pestañas Principales */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <button
            onClick={() => setActiveTab('automations')}
            style={{
              background: activeTab === 'automations' ? '#00f3ff' : 'transparent',
              color: activeTab === 'automations' ? '#030712' : '#94a3b8',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Zap size={16} /> Automatizaciones y Escenas ({automations.length})
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            style={{
              background: activeTab === 'sensors' ? '#00f3ff' : 'transparent',
              color: activeTab === 'sensors' ? '#030712' : '#94a3b8',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={16} /> Sensores y Telemetría ({sensors.length})
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '22px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(0, 243, 255, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Automatizaciones Activas</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00f3ff', marginTop: '2px' }}>
            {automations.filter(a => a.enabled).length} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ {automations.length}</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Red Eléctrica 230V</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {sensorSummary.mains_voltage || 231.8} V <span style={{ fontSize: '0.7rem', color: '#10b981' }}>{sensorSummary.power_status || 'ESTABLE'}</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Seguridad Fugas de Agua</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: sensorSummary.water_alerts > 0 ? '#ef4444' : '#38bdf8', marginTop: '2px' }}>
            {sensorSummary.water_alerts > 0 ? `⚠️ ${sensorSummary.water_alerts} FUGA!` : '0 Fugas (Seco)'}
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Inmunidad a Mascotas</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>
            🐾 ACTIVA <span style={{ fontSize: '0.75rem', color: '#a855f7' }}>(Gatos Ok)</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: AUTOMATIZACIONES Y ESCENAS                          */}
      {/* ============================================================== */}
      {activeTab === 'automations' && (
        <div>
          {/* ================= RADAR DE VISIÓN CENTINELA Y PET-SAFE EN VIVO ================= */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 12, 28, 0.95), rgba(15, 23, 42, 0.85))',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(0, 243, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: sentinelData.running ? '#10b981' : '#ef4444',
                  boxShadow: sentinelData.running ? '0 0 10px #10b981' : 'none'
                }} />
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} color="#00f3ff" /> RADAR EN VIVO: VISIÓN CENTINELA & PET-SAFE
                    <span style={{ fontSize: '0.68rem', background: 'rgba(0, 243, 255, 0.15)', color: '#00f3ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
                      NEURONAL YOLOv8n ONNX (~25ms)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Monitoriza Pasillo y Cam720 Salón · Auto-apagado a los {sentinelData.auto_off_delay_seconds || 45}s de inactividad
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleTurnOffPresenceLights}
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Power size={14} /> Apagar Luces de Presencia Ya
                </button>
              </div>
            </div>

            {/* Banner si hay luces de presencia activas con cuenta atrás */}
            {sentinelData.active_presence_lights && sentinelData.active_presence_lights.length > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#fbbf24" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fef08a' }}>
                    💡 Luces de Presencia Encendidas:
                  </span>
                  {sentinelData.active_presence_lights.map(l => (
                    <span key={l.cam_id} style={{ fontSize: '0.75rem', background: '#020617', border: '1px solid #fbbf24', padding: '2px 8px', borderRadius: '6px', color: '#fff' }}>
                      {l.entity_id} ({l.cam_id}) · Apagando en {l.remaining_seconds}s
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleTurnOffPresenceLights}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Apagar Ahora
                </button>
              </div>
            )}

            {/* Historial en Vivo de Detecciones Recientes */}
            <div style={{ background: 'rgba(2, 6, 23, 0.55)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registro en Vivo de Eventos y Discriminación Pet-Safe
              </div>
              {(!sentinelData.recent_events || sentinelData.recent_events.length === 0) ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  🍃 Sin eventos recientes. Cámaras en reposo esperando movimiento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sentinelData.recent_events.slice(0, 3).map((ev, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: '0.76rem', padding: '6px 10px', borderRadius: '6px',
                      background: ev.has_human ? 'rgba(0, 243, 255, 0.08)' : ev.has_pet ? 'rgba(168, 85, 247, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                      borderLeft: `3px solid ${ev.has_human ? '#00f3ff' : ev.has_pet ? '#c084fc' : '#64748b'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{ev.has_human ? '👤' : ev.has_pet ? '🐾' : '🍃'}</span>
                        <span style={{ fontWeight: 700, color: ev.has_human ? '#00f3ff' : ev.has_pet ? '#c084fc' : '#94a3b8' }}>
                          {ev.cam_name || ev.cam_id}:
                        </span>
                        <span style={{ color: '#cbd5e1' }}>{ev.details || ev.action_desc}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{ev.time_str}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                          background: ev.has_human ? 'rgba(0, 243, 255, 0.2)' : ev.has_pet ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                          color: ev.has_human ? '#00f3ff' : ev.has_pet ? '#c084fc' : '#94a3b8'
                        }}>
                          {ev.has_human ? 'Luz ON' : ev.has_pet ? 'Pet-Safe Ignorado' : 'Sin Acción'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          
            

          </div>

          {/* Barra de Escenas Rápidas Configurable en 1 Clic */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(4, 10, 26, 0.92))',
            border: '1px solid rgba(0, 243, 255, 0.28)',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '22px',
            boxShadow: '0 8px 26px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#00f3ff', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> ESCENAS RÁPIDAS (EJECUCIÓN INMEDIATA & CONFIGURABLES)
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                  Estas escenas aparecen aquí y en la pestaña <strong>VISUAL</strong>. Pulsa el botón principal para ejecutar o el icono <strong>✏️ Configurar</strong> para elegir qué luces enciende/apaga.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setEditingAuto({
                    is_new: true,
                    name: 'Nueva Escena Rápida',
                    description: 'Escena de ejecución directa en 1 clic',
                    icon: '✨',
                    category: 'scene',
                    is_quick_scene: true,
                    quick_color: '#00f3ff',
                    enabled: true,
                    trigger: { type: 'manual' },
                    actions: []
                  })}
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(168, 85, 247, 0.25))',
                    border: '1px solid #00f3ff',
                    color: '#f8fafc',
                    borderRadius: '9px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 12px rgba(0, 243, 255, 0.25)'
                  }}
                >
                  <Plus size={15} /> Nueva Escena Rápida
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {quickScenesList.map(scene => {
                const sColor = scene.quick_color || '#00f3ff';
                const isRunning = executingId === scene.id;
                const actionCount = scene.actions?.length || 0;
                return (
                  <div
                    key={scene.id}
                    style={{
                      background: 'rgba(2, 6, 23, 0.85)',
                      border: `1.5px solid ${sColor}`,
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '8px',
                      minWidth: 0,
                      overflow: 'hidden',
                      boxShadow: `0 0 16px ${sColor}25`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', minWidth: 0 }}>
                      <button
                        onClick={() => handleExecuteAutomation(scene.id, scene.name)}
                        disabled={isRunning}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textAlign: 'left',
                          cursor: isRunning ? 'wait' : 'pointer',
                          padding: '2px 0',
                          overflow: 'hidden'
                        }}
                        title={`Ejecutar ahora: ${scene.name}`}
                      >
                        <span style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: `${sColor}22`,
                          border: `1px solid ${sColor}66`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          flexShrink: 0
                        }}>
                          {scene.icon || '⚡'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isRunning ? 'Ejecutando...' : scene.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {actionCount} dispositivo{actionCount !== 1 ? 's' : ''} · Clic para activar
                          </div>
                        </div>
                      </button>

                      {/* Botón Configurar directo en la Escena Rápida */}
                      <button
                        onClick={() => setEditingAuto(JSON.parse(JSON.stringify(scene)))}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 9px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                        title="Configurar qué luces, persianas o brillo activa esta Escena Rápida"
                      >
                        <Edit3 size={13} color={sColor} />
                        <span>Config</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Tarjeta para añadir cualquier nueva regla o escena */}
              <button
                onClick={() => setEditingAuto({ is_new: true, name: '', description: '', icon: '⚡', category: 'scene', is_quick_scene: true, quick_color: '#00f3ff', enabled: true, trigger: { type: 'manual' }, actions: [] })}
                style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1.5px dashed #c084fc',
                  color: '#e9d5ff',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '62px',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={18} /> Añadir Escena o Regla
              </button>
            </div>
          </div>

          {/* Filtros de Categoría de Automatización */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {[
              { id: 'all', label: 'Todas las Reglas' },
              { id: 'scene', label: 'Escenas' },
              { id: 'camera', label: '📹 Visión de Cámaras' },
              { id: 'safety', label: '💧 Fugas y Seguridad' },
              { id: 'routine', label: '⏰ Rutinas Horarias' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setAutoCategory(cat.id)}
                style={{
                  background: autoCategory === cat.id ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                  border: autoCategory === cat.id ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: autoCategory === cat.id ? '#00f3ff' : '#94a3b8',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Automatizaciones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredAutomations.map(auto => {
              const isExecuting = executingId === auto.id;
              const hasPetFilter = auto.conditions?.some(c => c.type === 'pet_immunity');

              return (
                <div
                  key={auto.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: auto.enabled ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: auto.enabled ? '0 4px 18px rgba(0,0,0,0.35)' : 'none',
                    opacity: auto.enabled ? 1 : 0.65
                  }}
                >
                  <div>
                    {/* Fila Superior */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{auto.icon || '⚡'}</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff' }}>{auto.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                              {auto.category || 'personalizada'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleQuickScene(auto);
                              }}
                              style={{
                                background: auto.is_quick_scene ? 'rgba(0, 243, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                                border: auto.is_quick_scene ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.12)',
                                color: auto.is_quick_scene ? '#00f3ff' : '#64748b',
                                borderRadius: '999px',
                                padding: '1px 8px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Pulsar para mostrar u ocultar este botón en ESCENAS RÁPIDAS (Pestaña VISUAL y Cabecera)"
                            >
                              ✨ {auto.is_quick_scene ? 'En Escenas Rápidas' : '+ Escena Rápida'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Switch Activar/Desactivar Auténtico con Palanca Toggle */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAutomation(auto.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          background: 'rgba(2, 6, 23, 0.7)',
                          padding: '4px 10px 4px 6px',
                          borderRadius: '20px',
                          border: `1px solid ${auto.enabled ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.35)'}`,
                          transition: 'all 0.25s ease'
                        }}
                        title={auto.enabled ? "Pulsar para apagar / desactivar regla" : "Pulsar para encender / activar regla"}
                      >
                        <div style={{
                          width: '42px',
                          height: '22px',
                          borderRadius: '11px',
                          background: auto.enabled ? '#10b981' : '#334155',
                          position: 'relative',
                          transition: 'background 0.25s ease',
                          boxShadow: auto.enabled ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: auto.enabled ? '22px' : '3px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                            transition: 'left 0.25s ease'
                          }} />
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: auto.enabled ? '#34d399' : '#f87171',
                          letterSpacing: '0.4px'
                        }}>
                          {auto.enabled ? 'ENCENDIDA' : 'APAGADA'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                      {auto.description}
                    </p>

                    {/* Flujo de Regla: Trigger -> Filtro -> Acciones */}
                    <div style={{
                      background: 'rgba(2, 6, 23, 0.65)',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '0.74rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ color: '#00f3ff' }}>
                        <strong>CUANDO:</strong> {
                          auto.trigger?.type === 'camera'
                            ? `📹 Detección en ${auto.trigger?.camera_id}`
                            : auto.trigger?.type === 'sensor'
                              ? (auto.trigger?.to_state?.includes('_single') || auto.trigger?.to_state?.includes('_double') || auto.trigger?.to_state?.includes('_hold') || auto.trigger?.entity_id?.includes('pulsador') || auto.trigger?.entity_id?.includes('boton') || auto.trigger?.entity_id?.includes('moes'))
                                ? `🔘 Pulsador: ${getButtonComboLabel ? getButtonComboLabel(auto.trigger?.to_state) : auto.trigger?.to_state}${auto.trigger?.close_state ? ` | ⏹️ Apagar: ${getButtonComboLabel ? getButtonComboLabel(auto.trigger?.close_state) : auto.trigger?.close_state}` : ''}`
                                : `📡 ${auto.trigger?.entity_id} == ${auto.trigger?.to_state}`
                              : auto.trigger?.type === 'time'
                                ? (auto.trigger?.end_time ? `⏰ De ${auto.trigger?.time} a ${auto.trigger?.end_time}` : `⏰ A las ${auto.trigger?.time}`)
                                : '🔘 Pulsación manual'
                        }
                      </div>
                      {hasPetFilter && (
                        <div style={{ color: '#c084fc' }}>
                          <strong>FILTRO:</strong> 🐾 Inmunidad a Mascotas (Descarta si solo hay gatos)
                        </div>
                      )}
                      <div style={{ color: '#94a3b8' }}>
                        <strong>ACCIONES:</strong> {auto.actions?.length} comando{auto.actions?.length !== 1 ? 's' : ''} {auto.actions?.some(a => a.type === 'tts') ? '+ Voz TTS' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Botonera Inferior Completa: Variar / Apagar / Ejecutar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '12px',
                    marginTop: '8px'
                  }}>
                    {/* Botón Variar / Editar */}
                    <button
                      onClick={() => setEditingAuto(JSON.parse(JSON.stringify(auto)))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#cbd5e1',
                        padding: '7px 11px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s'
                      }}
                      title="Modificar parámetros, dispositivos, brillo o disparador"
                    >
                      <Edit3 size={13} /> Variar / Editar
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Botón Apagar Dispositivos */}
                      <button
                        onClick={() => handleTurnOffAutomation(auto.id, auto.name)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          color: '#f87171',
                          padding: '7px 11px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.2s'
                        }}
                        title="Apagar inmediatamente todas las luces asociadas a esta regla"
                      >
                        <Square size={13} /> Apagar
                      </button>

                      {/* Botón Ejecutar */}
                      <button
                        onClick={() => handleExecuteAutomation(auto.id, auto.name)}
                        disabled={isExecuting}
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(16, 185, 129, 0.25))',
                          border: '1px solid #00f3ff',
                          color: '#00f3ff',
                          padding: '7px 13px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: isExecuting ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Play size={13} /> {isExecuting ? 'Ejecutando...' : 'Ejecutar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: SENSORES Y TELEMETRÍA MULTIVARIABLE                 */}
      {/* ============================================================== */}
      {activeTab === 'sensors' && (
        <div>
          {/* Barra Superior de Gestión Visual de Sensores Activos y Futuros */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(6, 14, 32, 0.9))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📡 INVENTARIO VISUAL DE SENSORES (ACTIVOS EN VIVO & PREPARADOS PARA EL FUTURO)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                Activos ahora: <strong style={{ color: '#34d399' }}>{sensors.filter(s => s.installed).length}</strong> · Pre-configurados para futura instalación: <strong style={{ color: '#fbbf24' }}>{sensors.filter(s => !s.installed).length}</strong>. Puedes cambiar su estado con 1 clic o añadir nuevos sensores.
              </div>
            </div>
            <button
              onClick={() => setEditingSensor({
                id: '',
                name: 'Nuevo Sensor Zigbee',
                category: 'presence',
                type: 'mmwave_radar',
                room: 'salon',
                protocol: 'zigbee2mqtt',
                value: 'Despejado',
                state: 'off',
                battery: 100,
                lqi: 160,
                installed: false,
                notes: 'Preparado para futura instalación'
              })}
              style={{
                background: 'linear-gradient(135deg, #10b981, #00f3ff)',
                border: 'none',
                color: '#020617',
                borderRadius: '9px',
                padding: '9px 15px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Plus size={16} /> Añadir Sensor (Activo o Futuro)
            </button>
          </div>

          {/* Filtros de Categorías de Sensores */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              { id: 'all', label: `Todos (${sensors.length})` },
              { id: 'button', label: '🔘 Pulsadores & Mandos' },
              { id: 'presence', label: '🚶 Presencia & Radares' },
              { id: 'power', label: '⚡ Tensión & Potencia' },
              { id: 'water', label: '💧 Fugas de Agua' },
              { id: 'air', label: '🌿 Clima & CO2' },
              { id: 'contact', label: '🚪 Puertas & Ventanas' },
              { id: 'light_lux', label: '☀️ Lux Solar' },
              { id: 'smoke_gas', label: '🔥 Humo & Gas' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSensorCategory(cat.id)}
                style={{
                  background: sensorCategory === cat.id ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                  border: sensorCategory === cat.id ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: sensorCategory === cat.id ? '#00f3ff' : '#94a3b8',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Sensores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredSensors.map(sensor => {
              const isSimulating = simulatingId === sensor.id;
              const isAlert = sensor.state === 'leak' || sensor.state === 'warning' || sensor.state === 'alarm';
              const batteryLevel = sensor.battery ?? 100;

              return (
                <div
                  key={sensor.id}
                  style={{
                    background: isAlert ? 'rgba(45, 12, 20, 0.85)' : 'rgba(15, 23, 42, 0.7)',
                    border: isAlert ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.3)' : '0 4px 16px rgba(0,0,0,0.3)'
                  }}
                >
                  <div>
                    {/* Cabecera Tarjeta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(0, 243, 255, 0.1)',
                          border: '1px solid rgba(0, 243, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getCategoryIcon(sensor.category)}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff' }}>{sensor.name}</h4>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {sensor.room?.toUpperCase()} · {sensor.protocol}
                          </span>
                        </div>
                      </div>

                      {/* Badges de Instalación y Estado */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleSensorInstalled(sensor)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: sensor.installed ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.18)',
                            color: sensor.installed ? '#34d399' : '#fbbf24',
                            border: `1px solid ${sensor.installed ? '#10b981' : '#f59e0b'}`
                          }}
                          title="Haz clic para alternar entre Sensor Instalado en Vivo y Sensor Futuro Pendiente"
                        >
                          {sensor.installed ? '🟢 ACTIVO EN VIVO' : '⏳ FUTURO (NO INSTALADO)'}
                        </button>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          background: isAlert ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 243, 255, 0.14)',
                          color: isAlert ? '#f87171' : '#00f3ff',
                          border: `1px solid ${isAlert ? '#ef4444' : 'rgba(0, 243, 255, 0.35)'}`
                        }}>
                          ESTADO: {String(sensor.state || 'off').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* LECTURA PRINCIPAL EN VIVO */}
                    {sensor.category === 'climate' || sensor.type === 'temp_humidity' ? (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.85))',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 800 }}>
                            🌡️ CLIMA INTERIOR / TERMOHIGRÓMETRO SONOFF
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {sensor.is_online === false ? (
                              <span style={{ color: '#f87171', fontSize: '0.64rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', borderRadius: '4px', padding: '1px 5px' }}>
                                ⚠️ Sin señal ({sensor.offline_hours}h)
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Battery size={13} color={batteryLevel < 25 ? '#ef4444' : '#34d399'} />
                                <span style={{ color: batteryLevel < 25 ? '#ef4444' : '#cbd5e1', fontWeight: 600 }}>{batteryLevel}%</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Wifi size={12} color="#00f3ff" />
                              <span>{sensor.lqi || 160} LQI</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura Ambiente</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                              {sensor.attributes?.temperature ?? 22.2} °C
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 700, marginTop: '2px' }}>
                              ✨ Confortable
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad Relativa</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#00f3ff', marginTop: '2px' }}>
                              {sensor.attributes?.humidity ?? 57.5} %
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                              🌿 Rango Óptimo
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : sensor.category === 'plant' ? (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.85))',
                        border: '1px solid rgba(0, 243, 255, 0.25)',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#00f3ff', fontWeight: 800 }}>
                            🪴 TELEMETRÍA DE SUELO Y PLANTA
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {sensor.is_online === false ? (
                              <span style={{ color: '#f87171', fontSize: '0.64rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', borderRadius: '4px', padding: '1px 5px' }}>
                                ⚠️ Sin señal ({sensor.offline_hours}h)
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Battery size={13} color={batteryLevel < 25 ? '#ef4444' : '#34d399'} />
                                <span style={{ color: batteryLevel < 25 ? '#ef4444' : '#cbd5e1', fontWeight: 600 }}>{batteryLevel}%</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Wifi size={12} color="#00f3ff" />
                              <span>{sensor.lqi || 150} LQI</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad del Suelo</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: ((sensor.attributes?.soil_moisture ?? 0) < 15) ? '#ef4444' : '#34d399', marginTop: '2px' }}>
                              {sensor.attributes?.soil_moisture ?? 0} %
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura del Sustrato</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                              {sensor.attributes?.temperature ?? 22} °C
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (sensor.category === 'button' || sensor.type === 'wireless_button') ? (
                      <div style={{ marginBottom: '12px' }}>
                        <MoesButtonSwitchCard
                          sensor={sensor}
                          automations={automations}
                          API_BASE={API_BASE}
                          onNavigateTab={() => setActiveTab('automations')}
                          onOpenNewAutomation={() => {
                            setEditingAuto({
                              is_new: true,
                              name: 'Regla Pulsador Moes',
                              category: 'scene',
                              trigger: { type: 'sensor', entity_id: sensor.id, to_state: '1_single' },
                              actions: []
                            });
                            setShowNewAutoModal(true);
                          }}
                          onRefresh={fetchData}
                          compact={true}
                        />
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(2, 6, 23, 0.7)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>LECTURA EN TIEMPO REAL</div>
                          <div style={{
                            fontSize: '1.45rem',
                            fontWeight: 800,
                            color: isAlert ? '#ef4444' : '#00f3ff',
                            marginTop: '2px'
                          }}>
                            {sensor.value}
                          </div>
                        </div>

                        {/* Batería y Señal LQI */}
                        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
                          {sensor.is_online === false ? (
                            <div style={{ color: '#f87171', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #ef4444', borderRadius: '4px', padding: '2px 6px', marginBottom: '3px' }}>
                              ⚠️ Sin señal ({sensor.offline_hours}h)
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <Battery size={13} color={batteryLevel < 25 ? '#ef4444' : '#34d399'} />
                              <span style={{ color: batteryLevel < 25 ? '#ef4444' : '#cbd5e1', fontWeight: 600 }}>{batteryLevel}%</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px' }}>
                            <Wifi size={12} color="#00f3ff" />
                            <span>{sensor.lqi || 150} LQI</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones Rápidas: Simulación de Eventos */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '10px',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingSensor({ ...sensor })}
                        style={{
                          background: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit3 size={12} /> Configurar
                      </button>
                    </div>

                    {/* Botones de simulación según categoría */}
                    {sensor.category === 'water' && (
                      <button
                        onClick={() => handleSimulateSensor(sensor.id, sensor.state === 'leak' ? 'dry' : 'leak')}
                        disabled={isSimulating}
                        style={{
                          background: sensor.state === 'leak' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          border: `1px solid ${sensor.state === 'leak' ? '#10b981' : '#ef4444'}`,
                          color: sensor.state === 'leak' ? '#34d399' : '#f87171',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {sensor.state === 'leak' ? 'Restablecer Seco' : '⚡ Simular Fuga'}
                      </button>
                    )}

                    {sensor.category === 'presence' && (
                      <button
                        onClick={() => handleSimulateSensor(sensor.id, sensor.state === 'on' ? 'presence_off' : 'presence_on')}
                        disabled={isSimulating}
                        style={{
                          background: 'rgba(0, 243, 255, 0.15)',
                          border: '1px solid #00f3ff',
                          color: '#00f3ff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {sensor.state === 'on' ? 'Despejar' : '⚡ Simular Presencia'}
                      </button>
                    )}

                    {sensor.category === 'power' && (
                      <button
                        onClick={() => handleSimulateSensor(sensor.id, sensor.state === 'warning' ? 'normal' : 'voltage_drop')}
                        disabled={isSimulating}
                        style={{
                          background: 'rgba(245, 158, 11, 0.18)',
                          border: '1px solid #f59e0b',
                          color: '#fbbf24',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {sensor.state === 'warning' ? 'Restablecer 230V' : '⚡ Simular Caída 190V'}
                      </button>
                    )}

                    {sensor.category === 'contact' && (
                      <button
                        onClick={() => handleSimulateSensor(sensor.id, sensor.state === 'open' ? 'closed' : 'open')}
                        disabled={isSimulating}
                        style={{
                          background: 'rgba(168, 85, 247, 0.18)',
                          border: '1px solid #a855f7',
                          color: '#c084fc',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {sensor.state === 'open' ? 'Cerrar' : '⚡ Simular Apertura'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Modal para Variar, Personalizar o Crear Reglas */}
      {editingAuto && (
        <AutomationEditModal
          auto={editingAuto}
          availableDevices={availableDevices}
          availableSensors={sensors}
          onSave={handleSaveAutomation}
          onDelete={handleDeleteAutomation}
          onClose={() => setEditingAuto(null)}
        />
      )}

      {/* Modal para Configurar o Crear Sensores (Activos o Futuros) */}
      {editingSensor && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 10000,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 15, 35, 0.98), rgba(4, 9, 22, 0.98))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            padding: '22px',
            color: '#f8fafc',
            boxShadow: '0 20px 60px rgba(0,0,0,0.85)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                📡 Configurar Sensor de la Matriz
              </h3>
              <button
                onClick={() => setEditingSensor(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                  NOMBRE DEL SENSOR
                </label>
                <input
                  type="text"
                  value={editingSensor.name || ''}
                  onChange={e => setEditingSensor({ ...editingSensor, name: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(0,243,255,0.3)', borderRadius: '8px', padding: '8px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    CATEGORÍA
                  </label>
                  <select
                    value={editingSensor.category || 'presence'}
                    onChange={e => setEditingSensor({ ...editingSensor, category: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(0,243,255,0.3)', borderRadius: '8px', padding: '8px', color: '#fff' }}
                  >
                    <option value="climate">🌡️ Termohigrómetro Interior Sonoff (Temp & Hum)</option>
                    <option value="plant">🪴 Sensor de Planta / Maceta (Suelo & Temp)</option>
                    <option value="presence">🚶 Presencia / Radar</option>
                    <option value="water">💧 Fuga de Agua</option>
                    <option value="contact">🚪 Puerta / Ventana</option>
                    <option value="air">🌿 Clima / CO2</option>
                    <option value="power">⚡ Tensión 230V</option>
                    <option value="light_lux">☀️ Lux Solar</option>
                    <option value="smoke_gas">🔥 Humo / Gas</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    ESTANCIA / HABITACIÓN
                  </label>
                  <select
                    value={editingSensor.room || 'salon'}
                    onChange={e => setEditingSensor({ ...editingSensor, room: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(0,243,255,0.3)', borderRadius: '8px', padding: '8px', color: '#fff' }}
                  >
                    <option value="salon">Salón</option>
                    <option value="pasillo">Pasillo</option>
                    <option value="cocina">Cocina</option>
                    <option value="andrea">Habitación Andrea</option>
                    <option value="bano">Baño</option>
                    <option value="entrada">Entrada</option>
                    <option value="terraza">Terraza</option>
                    <option value="cuadro_general">Cuadro General</option>
                  </select>
                </div>
              </div>

              {editingSensor.category === 'climate' && (
                <div style={{ background: 'rgba(2, 6, 23, 0.75)', border: '1px solid rgba(251, 191, 36, 0.35)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌡️</span> CALIBRACIÓN DE CLIMA INTERIOR (SONOFF SNZB-02D)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                        🌡️ Temperatura Ambiente (°C)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingSensor.attributes?.temperature ?? 22.2}
                        onChange={e => {
                          const temp = parseFloat(e.target.value) || 0;
                          const hum = editingSensor.attributes?.humidity ?? 55;
                          setEditingSensor({
                            ...editingSensor,
                            type: 'temp_humidity',
                            value: `${temp} °C | ${hum}% Hum`,
                            state: temp < 18 ? 'cold' : (temp > 28 ? 'hot' : 'optimal'),
                            attributes: {
                              ...(editingSensor.attributes || {}),
                              temperature: temp,
                              humidity: hum,
                              temperature_units: 'celsius'
                            }
                          });
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #f59e0b', borderRadius: '6px', padding: '8px', color: '#fbbf24', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                        💧 Humedad Relativa (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingSensor.attributes?.humidity ?? 57.5}
                        onChange={e => {
                          const hum = parseInt(e.target.value) || 0;
                          const temp = editingSensor.attributes?.temperature ?? 22.2;
                          setEditingSensor({
                            ...editingSensor,
                            type: 'temp_humidity',
                            value: `${temp} °C | ${hum}% Hum`,
                            attributes: {
                              ...(editingSensor.attributes || {}),
                              temperature: temp,
                              humidity: hum,
                              temperature_units: 'celsius'
                            }
                          });
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #00f3ff', borderRadius: '6px', padding: '8px', color: '#00f3ff', fontWeight: 800 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingSensor.category === 'plant' && (
                <div style={{ background: 'rgba(2, 6, 23, 0.75)', border: '1px solid rgba(0, 243, 255, 0.35)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#00f3ff', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🪴</span> ASIGNACIÓN DE VALORES Y CALIBRACIÓN (TIERRA & CLIMA)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                        💧 Humedad del Suelo (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingSensor.attributes?.soil_moisture ?? 0}
                        onChange={e => {
                          const moist = parseInt(e.target.value) || 0;
                          const temp = editingSensor.attributes?.temperature ?? 22;
                          setEditingSensor({
                            ...editingSensor,
                            type: 'soil_sensor',
                            value: `${moist}% humedad | ${temp}°C`,
                            state: moist < 15 ? 'dry' : (moist > 65 ? 'wet' : 'optimal'),
                            attributes: {
                              ...(editingSensor.attributes || {}),
                              soil_moisture: moist,
                              temperature: temp,
                              temperature_unit: 'celsius'
                            }
                          });
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #10b981', borderRadius: '6px', padding: '8px', color: '#34d399', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                        🌡️ Temperatura Sustrato (°C)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingSensor.attributes?.temperature ?? 22}
                        onChange={e => {
                          const temp = parseFloat(e.target.value) || 0;
                          const moist = editingSensor.attributes?.soil_moisture ?? 0;
                          setEditingSensor({
                            ...editingSensor,
                            type: 'soil_sensor',
                            value: `${moist}% humedad | ${temp}°C`,
                            attributes: {
                              ...(editingSensor.attributes || {}),
                              soil_moisture: moist,
                              temperature: temp,
                              temperature_unit: 'celsius'
                            }
                          });
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #f59e0b', borderRadius: '6px', padding: '8px', color: '#fbbf24', fontWeight: 800 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    LECTURA / VALOR VISUAL
                  </label>
                  <input
                    type="text"
                    value={editingSensor.value || ''}
                    onChange={e => setEditingSensor({ ...editingSensor, value: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    PROTOCOLO
                  </label>
                  <input
                    type="text"
                    value={editingSensor.protocol || 'zigbee2mqtt'}
                    onChange={e => setEditingSensor({ ...editingSensor, protocol: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 10px', color: '#fff' }}
                  />
                </div>
              </div>

              <div
                onClick={() => setEditingSensor({ ...editingSensor, installed: !editingSensor.installed })}
                style={{
                  background: editingSensor.installed ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.14)',
                  border: `1px solid ${editingSensor.installed ? '#10b981' : '#f59e0b'}`,
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: editingSensor.installed ? '#34d399' : '#fbbf24' }}>
                    {editingSensor.installed ? '🟢 SENSOR YA INSTALADO Y ACTIVO' : '⏳ SENSOR FUTURO (PENDIENTE DE INSTALAR)'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                    Pulsa aquí para cambiar entre instalado físicamente o previsto para el futuro.
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem' }}>{editingSensor.installed ? '✅' : '⏳'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {editingSensor.id ? (
                <button
                  type="button"
                  onClick={() => handleDeleteSensor(editingSensor.id, editingSensor.name)}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '8px', padding: '8px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSensor(null)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '8px', padding: '8px 14px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSensor(editingSensor)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #00f3ff)', border: 'none', color: '#020617', borderRadius: '8px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Guardar Sensor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

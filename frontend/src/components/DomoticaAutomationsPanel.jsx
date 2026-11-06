import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Clock,
  Eye,
  Radio,
  Play,
  Check,
  Plus,
  Trash2,
  Edit2,
  Power,
  Sliders,
  Volume2,
  Shield,
  Layers,
  Sun,
  Moon,
  Video,
  X,
  AlertCircle
} from 'lucide-react';

const API_BASE = '';

const ICON_PRESETS = ['🌙', '🎬', '👁️', '🚶', '☀️', '💡', '🛡️', '☕', '🛋️', '💤', '🚪', '🚨'];

const CAMERA_OPTIONS = [
  { id: 'camara_andrea', name: 'Cámara Habitación Andrea' },
  { id: 'camara_salon', name: 'Cámara Salón Principal' },
  { id: 'camara_entrada', name: 'Cámara Entrada' },
  { id: 'all', name: 'Cualquier Cámara' }
];

const CAMERA_EVENTS = [
  { id: 'person_detected', label: '🚶 Persona Detectada' },
  { id: 'motion', label: '⚡ Movimiento Visual' },
  { id: 'unknown_face', label: '❓ Rostro Desconocido' },
  { id: 'known_face', label: '👤 Rostro Familiar Reconocido' }
];

export default function DomoticaAutomationsPanel({ devices = [], onDevicesUpdated }) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'scene' | 'automation' | 'camera'
  const [searchQuery, setSearchQuery] = useState('');
  const [executingId, setExecutingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Estado del modal de creación/edición
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Campos del formulario
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('scene'); // 'scene' | 'automation'
  const [formIcon, setFormIcon] = useState('🌙');
  const [formTriggerType, setFormTriggerType] = useState('manual'); // 'manual' | 'time' | 'sensor' | 'camera'
  
  // Parámetros disparador
  const [triggerTime, setTriggerTime] = useState('23:00');
  const [triggerDays, setTriggerDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [triggerSensor, setTriggerSensor] = useState('');
  const [triggerSensorState, setTriggerSensorState] = useState('on');
  const [triggerCamera, setTriggerCamera] = useState('camara_andrea');
  const [triggerCameraEvent, setTriggerCameraEvent] = useState('person_detected');

  // Condiciones
  const [useTimeCondition, setUseTimeCondition] = useState(false);
  const [condAfter, setCondAfter] = useState('22:00');
  const [condBefore, setCondBefore] = useState('07:30');

  // Acciones en borrador
  const [formActions, setFormActions] = useState([]);
  
  // Selector para nueva acción
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedAction, setSelectedAction] = useState('turn_on');
  const [actionBrightness, setActionBrightness] = useState(50);
  const [actionKelvin, setActionKelvin] = useState(2700);
  const [actionPosition, setActionPosition] = useState(0);
  const [actionDurationMinutes, setActionDurationMinutes] = useState(10);

  // TTS opcional
  const [formTts, setFormTts] = useState('');
  const [formSpeaker, setFormSpeaker] = useState('todos');

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/automations`);
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch (e) {
      console.error('Error fetching automations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filtrado de sensores disponibles para disparadores
  const sensorOptions = useMemo(() => {
    return devices.filter(d => {
      const eid = d.id || d.entity_id || '';
      return eid.startsWith('binary_sensor.') || eid.startsWith('sensor.') || d.domain === 'binary_sensor';
    });
  }, [devices]);

  // Filtrado de actuadores (luces, persianas, enchufes)
  const controllableDevices = useMemo(() => {
    return devices.filter(d => {
      const eid = d.id || d.entity_id || '';
      const isSensor = eid.startsWith('sensor.') || eid.startsWith('binary_sensor.');
      return !isSensor;
    }).sort((a, b) => (a.alias || a.name || '').localeCompare(b.alias || b.name || ''));
  }, [devices]);

  const handleExecute = async (autoId, autoName) => {
    try {
      setExecutingId(autoId);
      const res = await fetch(`${API_BASE}/api/automations/${autoId}/execute`, { method: 'POST' });
      if (res.ok) {
        showToast(`✨ Escena "${autoName}" ejecutada con éxito.`);
        fetchAutomations();
        if (onDevicesUpdated) onDevicesUpdated();
      } else {
        const err = await res.json();
        showToast(`⚠️ ${err.message || 'Error al ejecutar'}`);
      }
    } catch (e) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setTimeout(() => setExecutingId(null), 600);
    }
  };

  const handleToggle = async (autoId) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations/${autoId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAutomations(prev => prev.map(a => a.id === autoId ? { ...a, enabled: data.enabled } : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (autoId, autoName) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${autoName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/automations/${autoId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`🗑️ "${autoName}" eliminada.`);
        setAutomations(prev => prev.filter(a => a.id !== autoId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormType('scene');
    setFormIcon('🌙');
    setFormTriggerType('manual');
    setTriggerTime('23:00');
    setTriggerDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    setTriggerSensor(sensorOptions[0]?.id || '');
    setTriggerSensorState('on');
    setTriggerCamera('camara_andrea');
    setTriggerCameraEvent('person_detected');
    setUseTimeCondition(false);
    setCondAfter('22:00');
    setCondBefore('07:30');
    setFormActions([]);
    setSelectedDevice(controllableDevices[0]?.id || '');
    setSelectedAction('turn_on');
    setActionBrightness(50);
    setActionKelvin(2700);
    setActionPosition(0);
    setFormTts('');
    setFormSpeaker('todos');
    setShowModal(true);
  };

  const openEditModal = (auto) => {
    setEditingId(auto.id);
    setFormName(auto.name || '');
    setFormDesc(auto.description || '');
    setFormType(auto.type || 'scene');
    setFormIcon(auto.icon || '🌙');
    
    const trig = auto.trigger || {};
    setFormTriggerType(trig.type || 'manual');
    if (trig.time) setTriggerTime(trig.time);
    if (trig.days) setTriggerDays(trig.days);
    if (trig.entity_id) setTriggerSensor(trig.entity_id);
    if (trig.to_state) setTriggerSensorState(trig.to_state);
    if (trig.camera_id) setTriggerCamera(trig.camera_id);
    if (trig.event) setTriggerCameraEvent(trig.event);

    const cond = (auto.conditions || []).find(c => c.type === 'time_window');
    if (cond) {
      setUseTimeCondition(true);
      setCondAfter(cond.after || '22:00');
      setCondBefore(cond.before || '07:30');
    } else {
      setUseTimeCondition(false);
    }

    setFormActions(auto.actions || []);
    setSelectedDevice(controllableDevices[0]?.id || '');
    setSelectedAction('turn_on');
    setFormTts(auto.tts_message || '');
    setFormSpeaker(auto.tts_speaker || 'todos');
    setShowModal(true);
  };

  const handleAddAction = () => {
    if (!selectedDevice) return;
    const targetDev = devices.find(d => (d.id || d.entity_id) === selectedDevice);
    const isCover = selectedDevice.startsWith('cover.') || targetDev?.domain === 'cover';
    const isLight = selectedDevice.startsWith('light.') || targetDev?.domain === 'light' || targetDev?.device_type === 'led_strip';

    const newAction = {
      entity_id: selectedDevice,
      action: selectedAction
    };

    if (selectedAction === 'timed_on') {
      newAction.duration_minutes = actionDurationMinutes;
    }
    if (isLight && selectedAction === 'turn_on') {
      newAction.brightness = actionBrightness;
      newAction.color_temp_kelvin = actionKelvin;
    }
    if (isCover) {
      if (selectedAction === 'set_cover_position') {
        newAction.position = actionPosition;
      } else if (selectedAction === 'open_cover') {
        newAction.position = 100;
      } else if (selectedAction === 'close_cover') {
        newAction.position = 0;
      }
    }

    setFormActions(prev => [...prev, newAction]);
  };

  const handleRemoveAction = (index) => {
    setFormActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveModal = async () => {
    if (!formName.trim()) {
      alert('Por favor introduce un nombre para la escena o automatización.');
      return;
    }

    const payloadTrigger = { type: formTriggerType };
    if (formTriggerType === 'time') {
      payloadTrigger.time = triggerTime;
      payloadTrigger.days = triggerDays;
    } else if (formTriggerType === 'sensor') {
      payloadTrigger.entity_id = triggerSensor;
      payloadTrigger.to_state = triggerSensorState;
    } else if (formTriggerType === 'camera') {
      payloadTrigger.camera_id = triggerCamera;
      payloadTrigger.event = triggerCameraEvent;
    }

    const payloadConditions = [];
    if (useTimeCondition) {
      payloadConditions.push({
        type: 'time_window',
        after: condAfter,
        before: condBefore
      });
    }

    const payload = {
      id: editingId || `auto_${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim(),
      type: formType,
      icon: formIcon,
      enabled: true,
      trigger: payloadTrigger,
      conditions: payloadConditions,
      actions: formActions,
      tts_message: formTts.trim() || null,
      tts_speaker: formSpeaker
    };

    try {
      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`💾 "${formName}" guardada correctamente.`);
        setShowModal(false);
        fetchAutomations();
      }
    } catch (e) {
      alert(`Error al guardar: ${e.message}`);
    }
  };

  // Filtrado de las tarjetas mostradas
  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      if (filterType === 'scene' && a.type !== 'scene') return false;
      if (filterType === 'automation' && a.type !== 'automation') return false;
      if (filterType === 'camera' && a.trigger?.type !== 'camera') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (a.name || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [automations, filterType, searchQuery]);

  return (
    <div style={{
      background: 'rgba(5, 10, 25, 0.96)',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* CABECERA ESTILO STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.18)',
        paddingBottom: '16px'
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
            boxShadow: '0 0 16px rgba(0, 243, 255, 0.25)'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#00f3ff',
              letterSpacing: '0.5px'
            }}>
              Automatizaciones y Escenas Domóticas
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Crea escenas de 1 clic y reglas reactivas disparadas por horario, sensores o presencia en cámaras.
            </p>
          </div>
        </div>

        {/* ACCIONES Y CONTADORES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Zap size={14} color="#00f3ff" />
            <span>{automations.length} Reglas Registradas</span>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
              border: 'none',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} strokeWidth={3} />
            Nueva Escena / Automatización
          </button>
        </div>
      </div>

      {/* TOAST DE CONFIRMACIÓN */}
      {toastMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.25)',
          border: '1px solid #10b981',
          color: '#34d399',
          padding: '10px 16px',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '0.84rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todas las Reglas' },
            { id: 'scene', label: '🎬 Escenas (1 Clic)' },
            { id: 'automation', label: '⚡ Automatizaciones' },
            { id: 'camera', label: '👁️ Detección por Cámara' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: filterType === f.id ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${filterType === f.id ? '#00f3ff' : 'rgba(255, 255, 255, 0.1)'}`,
                color: filterType === f.id ? '#00f3ff' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar escena o automatización..."
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            background: '#091124',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            color: '#fff',
            fontSize: '0.82rem',
            outline: 'none',
            minWidth: '240px'
          }}
        />
      </div>

      {/* GRID DE ESCENAS Y AUTOMATIZACIONES */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Cargando automatizaciones...
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.15)'
        }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>No hay ninguna automatización que coincida con el filtro.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '16px'
        }}>
          {filteredAutomations.map(auto => {
            const isScene = auto.type === 'scene';
            const trig = auto.trigger || {};
            const isEnabled = auto.enabled !== false;
            const isExecuting = executingId === auto.id;

            return (
              <div
                key={auto.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: `1px solid ${isEnabled ? 'rgba(0, 243, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderLeft: `5px solid ${isScene ? '#00f3ff' : (trig.type === 'camera' ? '#a855f7' : '#10b981')}`,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  opacity: isEnabled ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                  boxShadow: isEnabled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {/* CABECERA DE LA TARJETA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      fontSize: '1.6rem',
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      {auto.icon || (isScene ? '🎬' : '⚡')}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 'bold', color: '#fff' }}>
                        {auto.name}
                      </h3>
                      {auto.description && (
                        <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                          {auto.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* BADGE TIPO */}
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isScene ? 'rgba(0, 243, 255, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${isScene ? '#00f3ff' : '#10b981'}`,
                    color: isScene ? '#00f3ff' : '#34d399'
                  }}>
                    {isScene ? '🎬 ESCENA' : '⚡ AUTOMATIZACIÓN'}
                  </span>
                </div>

                {/* DISPARADOR Y CONDICIONES */}
                <div style={{
                  background: 'rgba(2, 6, 23, 0.6)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.76rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                    <Radio size={13} color="#00f3ff" />
                    <strong>Disparador:</strong>
                    {trig.type === 'camera' && (
                      <span style={{ color: '#c084fc', fontWeight: 'bold' }}>
                        👁️ Cámara ({trig.camera_name || trig.camera_id}) · {trig.event}
                      </span>
                    )}
                    {trig.type === 'sensor' && (
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                        📡 Sensor ({trig.sensor_name || trig.entity_id}) → {trig.to_state}
                      </span>
                    )}
                    {trig.type === 'time' && (
                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                        ⏰ Horario: {trig.time} ({trig.days?.length === 7 ? 'Todos los días' : trig.days?.join(', ')})
                      </span>
                    )}
                    {trig.type === 'manual' && (
                      <span style={{ color: '#94a3b8' }}>
                        🔘 Manual 1 Clic / Orden de Voz IA
                      </span>
                    )}
                  </div>

                  {auto.conditions?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                      <Moon size={12} color="#fbbf24" />
                      <span>
                        Condición: Franja {auto.conditions[0]?.after} a {auto.conditions[0]?.before}
                      </span>
                    </div>
                  )}
                </div>

                {/* RESUMEN DE ACCIONES SOBRE DISPOSITIVOS */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Acciones programadas ({auto.actions?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(auto.actions || []).map((act, idx) => {
                      const dev = devices.find(d => (d.id || d.entity_id) === act.entity_id);
                      const devName = dev?.alias || dev?.name || act.entity_id;
                      const actLabel = act.action === 'turn_on' ? 'Encender'
                        : act.action === 'turn_off' ? 'Apagar'
                        : act.action === 'timed_on' ? `⏱️ Encendido Temporizado (${(act.duration_minutes || 10) === 0.5 ? '30 seg' : `${act.duration_minutes || 10} min`})`
                        : act.action === 'open_cover' ? 'Abrir (100%)'
                        : act.action === 'close_cover' ? 'Cerrar (0%)'
                        : act.action === 'set_cover_position' ? `Posición ${act.position}%`
                        : act.action;

                      return (
                        <span
                          key={idx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            color: '#cbd5e1'
                          }}
                        >
                          <strong>{devName}</strong>: {actLabel}
                          {act.brightness !== undefined && act.action === 'turn_on' && ` (${act.brightness}%)`}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* MENSAJE DE VOZ TTS SI TIENE */}
                {auto.tts_message && (
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#a5b4fc',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Volume2 size={13} />
                    <span>"{auto.tts_message}"</span>
                  </div>
                )}

                {/* BOTONERA INFERIOR: EJECUTAR, ACTIVAR/PAUSAR, EDITAR, BORRAR */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '12px',
                  marginTop: 'auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(auto.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        border: `1px solid ${isEnabled ? '#10b981' : '#64748b'}`,
                        color: isEnabled ? '#34d399' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isEnabled ? '● ACTIVA' : '○ EN PAUSA'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(auto)}
                      title="Editar regla"
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(auto.id, auto.name)}
                      title="Eliminar regla"
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* BOTÓN EJECUTAR AHORA */}
                  <button
                    type="button"
                    onClick={() => handleExecute(auto.id, auto.name)}
                    disabled={isExecuting}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      background: isExecuting ? '#00f3ff' : 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(2, 132, 199, 0.3))',
                      border: '1px solid #00f3ff',
                      color: isExecuting ? '#000' : '#00f3ff',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 0 12px rgba(0, 243, 255, 0.25)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Play size={13} fill={isExecuting ? '#000' : '#00f3ff'} />
                    {isExecuting ? 'EJECUTANDO…' : 'EJECUTAR AHORA'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #091124, #040817)',
            border: '1px solid #00f3ff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 0 35px rgba(0, 243, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* CABECERA DEL MODAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#00f3ff', fontWeight: 'bold' }}>
                {editingId ? '✏️ Editar Escena / Automatización' : '➕ Nueva Escena o Automatización'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* PASO 1: DATOS BÁSICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Icono:</label>
                <select
                  value={formIcon}
                  onChange={e => setFormIcon(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#040817',
                    border: '1px solid rgba(0,243,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1.2rem',
                    color: '#fff',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {ICON_PRESETS.map((ic, i) => (
                    <option key={i} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#00f3ff', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Modo Buenas Noches, Llegada..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#040817',
                    border: '1px solid rgba(0,243,255,0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tipo de Regla:</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#040817',
                    border: '1px solid rgba(0,243,255,0.3)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="scene">🎬 Escena Manual (1 Clic)</option>
                  <option value="automation">⚡ Automatización Reactiva</option>
                </select>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Descripción:</label>
              <input
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Breve explicación de lo que hace esta escena..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#040817',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* PASO 2: DISPARADOR (TRIGGER) */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.7)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(0,243,255,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#00f3ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} /> DISPARADOR (¿QUÉ ACTIVA ESTA REGLA?):
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { id: 'manual', label: '🔘 Manual / 1 Clic' },
                  { id: 'time', label: '⏰ Horario' },
                  { id: 'sensor', label: '📡 Sensor Detección' },
                  { id: 'camera', label: '👁️ Cámara Visión' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormTriggerType(t.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: formTriggerType === t.id ? 'rgba(0, 243, 255, 0.25)' : '#040817',
                      border: `1px solid ${formTriggerType === t.id ? '#00f3ff' : 'rgba(255,255,255,0.1)'}`,
                      color: formTriggerType === t.id ? '#00f3ff' : '#94a3b8',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* DETALLES DEL DISPARADOR */}
              {formTriggerType === 'time' && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Hora de disparo:</label>
                    <input
                      type="time"
                      value={triggerTime}
                      onChange={e => setTriggerTime(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        background: '#040817',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px' }}>
                    Se ejecutará automáticamente al llegar a esa hora.
                  </div>
                </div>
              )}

              {formTriggerType === 'sensor' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Sensor:</label>
                    <select
                      value={triggerSensor}
                      onChange={e => setTriggerSensor(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#040817',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {sensorOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Estado objetivo:</label>
                    <select
                      value={triggerSensorState}
                      onChange={e => setTriggerSensorState(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#040817',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="on">Detectado / Abierto (on)</option>
                      <option value="off">Reposo / Cerrado (off)</option>
                    </select>
                  </div>
                </div>
              )}

              {formTriggerType === 'camera' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Cámara:</label>
                    <select
                      value={triggerCamera}
                      onChange={e => setTriggerCamera(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#040817',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {CAMERA_OPTIONS.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Evento Visual:</label>
                    <select
                      value={triggerCameraEvent}
                      onChange={e => setTriggerCameraEvent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#040817',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {CAMERA_EVENTS.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* CONDICIÓN NOCTURNA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                <input
                  type="checkbox"
                  id="chkCond"
                  checked={useTimeCondition}
                  onChange={e => setUseTimeCondition(e.target.checked)}
                />
                <label htmlFor="chkCond" style={{ fontSize: '0.76rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  🌙 Solo ejecutar si ocurre de noche / franja horaria:
                </label>
                {useTimeCondition && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="time"
                      value={condAfter}
                      onChange={e => setCondAfter(e.target.value)}
                      style={{ background: '#040817', border: '1px solid #64748b', color: '#fff', borderRadius: '4px', padding: '3px 6px', fontSize: '0.75rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>a</span>
                    <input
                      type="time"
                      value={condBefore}
                      onChange={e => setCondBefore(e.target.value)}
                      style={{ background: '#040817', border: '1px solid #64748b', color: '#fff', borderRadius: '4px', padding: '3px 6px', fontSize: '0.75rem' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PASO 3: ACCIONES SOBRE DISPOSITIVOS */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.7)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(0,243,255,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#00f3ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> DISPOSITIVOS Y CONDICIONES DE ACCIÓN:
              </div>

              {/* LISTA DE ACCIONES YA AÑADIDAS */}
              {formActions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {formActions.map((act, i) => {
                    const dev = devices.find(d => (d.id || d.entity_id) === act.entity_id);
                    const devName = dev?.alias || dev?.name || act.entity_id;
                    return (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(15, 23, 42, 0.9)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem'
                        }}
                      >
                        <span>
                          <strong>{devName}</strong> → {act.action}
                          {act.brightness !== undefined && ` (${act.brightness}%)`}
                          {act.position !== undefined && ` (Posición ${act.position}%)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(i)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Añade al menos un dispositivo para encender, apagar o regular.
                </div>
              )}

              {/* SELECTOR PARA AÑADIR ACCIÓN */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto',
                gap: '8px',
                alignItems: 'flex-end',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '8px'
              }}>
                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Dispositivo:</label>
                  <select
                    value={selectedDevice}
                    onChange={e => setSelectedDevice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      background: '#040817',
                      border: '1px solid rgba(0,243,255,0.3)',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    {controllableDevices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.alias || d.name || d.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Acción:</label>
                  <select
                    value={selectedAction}
                    onChange={e => setSelectedAction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      background: '#040817',
                      border: '1px solid rgba(0,243,255,0.3)',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <option value="turn_on">Encender (ON)</option>
                    <option value="timed_on">⏱️ Encendido Temporizado (Cuenta Atrás)</option>
                    <option value="turn_off">Apagar (OFF)</option>
                    <option value="open_cover">Abrir Persiana (100%)</option>
                    <option value="close_cover">Cerrar Persiana (0%)</option>
                    <option value="set_cover_position">Fijar % Persiana</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddAction}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: 'rgba(0, 243, 255, 0.2)',
                    border: '1px solid #00f3ff',
                    color: '#00f3ff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Añadir
                </button>
              </div>

              {/* SLIDERS EXTRA SI ES LUZ O PERSIANA */}
              {selectedAction === 'timed_on' && (
                <div style={{ background: 'rgba(0, 243, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.74rem' }}>
                    <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>⏱️ Tiempo de Cuenta Atrás:</span>
                    <strong style={{ color: '#fff', background: '#090f1f', padding: '2px 8px', borderRadius: '4px', border: '1px solid #00f3ff' }}>
                      {actionDurationMinutes === 0.5 ? 'Medio minuto (30 seg)' : `${actionDurationMinutes} min`}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {[0.5, 1, 2, 3, 4, 5, 10, 15, 30, 60].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setActionDurationMinutes(m)}
                        style={{
                          background: actionDurationMinutes === m ? 'rgba(0, 243, 255, 0.35)' : 'rgba(15, 23, 42, 0.7)',
                          border: actionDurationMinutes === m ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',
                          color: actionDurationMinutes === m ? '#00f3ff' : '#94a3b8',
                          borderRadius: '4px',
                          padding: '3px 7px',
                          fontSize: '0.68rem',
                          fontWeight: actionDurationMinutes === m ? 'bold' : 'normal',
                          cursor: 'pointer'
                        }}
                      >
                        {m === 0.5 ? '½ min' : `${m}m`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0.5"
                      max="60"
                      step="0.5"
                      value={actionDurationMinutes}
                      onChange={e => setActionDurationMinutes(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: '#00f3ff', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
              {selectedAction === 'turn_on' && selectedDevice.startsWith('light.') && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '0.74rem' }}>
                  <span>Brillo: <strong>{actionBrightness}%</strong></span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={actionBrightness}
                    onChange={e => setActionBrightness(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: '#00f3ff' }}
                  />
                  <span>Temp:</span>
                  <select
                    value={actionKelvin}
                    onChange={e => setActionKelvin(parseInt(e.target.value))}
                    style={{ background: '#040817', border: '1px solid #64748b', color: '#fff', borderRadius: '4px', padding: '2px 6px' }}
                  >
                    <option value="2700">Cálido 2700K</option>
                    <option value="4000">Neutro 4000K</option>
                    <option value="6500">Frío 6500K</option>
                  </select>
                </div>
              )}

              {selectedAction === 'set_cover_position' && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '0.74rem' }}>
                  <span>Posición: <strong>{actionPosition}%</strong></span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={actionPosition}
                    onChange={e => setActionPosition(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: '#a855f7' }}
                  />
                </div>
              )}
            </div>

            {/* PASO 4: VOZ TTS OPCIONAL */}
            <div>
              <label style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Volume2 size={12} /> Mensaje de Voz Hablado (Opcional):
              </label>
              <input
                type="text"
                value={formTts}
                onChange={e => setFormTts(e.target.value)}
                placeholder="Ej: Buenas noches, activando descanso..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#040817',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* BOTONES DE CIERRE Y GUARDADO */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94a3b8',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                style={{
                  padding: '8px 22px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'
                }}
              >
                💾 Guardar Automatización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

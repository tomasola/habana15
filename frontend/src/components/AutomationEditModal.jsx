import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Save, Sliders, Eye, Zap, Clock, Activity, Sun, Moon, Sparkles, Shield, AlertTriangle } from 'lucide-react';

const COMMON_ICONS = ['⚡', '🎬', '🛋️', '🌅', '⚫', '🛡️', '🕯️', '🚪', '☀️', '🌙', '📹', '👁️', '💧', '💡', '✨', '🪟', '🌿', '🔥'];

const QUICK_COLORS = [
  { hex: '#00f3ff', label: 'Cyan Neón' },
  { hex: '#f59e0b', label: 'Ámbar Cálido' },
  { hex: '#34d399', label: 'Verde Esmeralda' },
  { hex: '#a855f7', label: 'Violeta' },
  { hex: '#ef4444', label: 'Rojo Alerta' },
  { hex: '#94a3b8', label: 'Gris Apagado' }
];

export const MOES_BUTTONS = [
  { id: '1', name: 'Botón 1', sub: 'Sup. Izq', icon: '1️⃣' },
  { id: '2', name: 'Botón 2', sub: 'Sup. Der', icon: '2️⃣' },
  { id: '3', name: 'Botón 3', sub: 'Inf. Izq', icon: '3️⃣' },
  { id: '4', name: 'Botón 4', sub: 'Inf. Der', icon: '4️⃣' },
];

export const CLICK_TYPES = [
  { id: 'single', name: '1 Clic', sub: 'Simple', icon: '👆' },
  { id: 'double', name: 'Doble Clic', sub: '2 Clics', icon: '✌️' },
  { id: 'hold', name: 'Mantener', sub: 'Pulsación Larga', icon: '⏱️' },
  { id: '*', name: 'Cualquiera', sub: 'Todo tipo', icon: '✨' },
];

export const BUTTON_PRESETS = [
  { id: '1_single', label: '1️⃣ Botón 1 · 1 Clic (Simple)' },
  { id: '1_double', label: '1️⃣ Botón 1 · Doble Clic' },
  { id: '1_hold', label: '1️⃣ Botón 1 · Mantener Pulsado (Larga)' },
  { id: '2_single', label: '2️⃣ Botón 2 · 1 Clic (Simple)' },
  { id: '2_double', label: '2️⃣ Botón 2 · Doble Clic' },
  { id: '2_hold', label: '2️⃣ Botón 2 · Mantener Pulsado (Larga)' },
  { id: '3_single', label: '3️⃣ Botón 3 · 1 Clic (Simple)' },
  { id: '3_double', label: '3️⃣ Botón 3 · Doble Clic' },
  { id: '3_hold', label: '3️⃣ Botón 3 · Mantener Pulsado (Larga)' },
  { id: '4_single', label: '4️⃣ Botón 4 · 1 Clic (Simple)' },
  { id: '4_double', label: '4️⃣ Botón 4 · Doble Clic' },
  { id: '4_hold', label: '4️⃣ Botón 4 · Mantener Pulsado (Larga)' },
  { id: '1_*', label: '✨ Botón 1 · Cualquier Pulsación' },
  { id: '2_*', label: '✨ Botón 2 · Cualquier Pulsación' },
  { id: '3_*', label: '✨ Botón 3 · Cualquier Pulsación' },
  { id: '4_*', label: '✨ Botón 4 · Cualquier Pulsación' },
  { id: '*_single', label: '🔘 Cualquier Botón · 1 Clic Simple' },
  { id: '*_double', label: '🔘 Cualquier Botón · Doble Clic' },
  { id: '*_hold', label: '🔘 Cualquier Botón · Mantener Pulsado' },
  { id: 'any', label: '✨ Cualquier Botón y Cualquier Tipo' },
];

export const parseMoesCode = (code) => {
  if (!code) return { btn: '1', click: 'single' };
  if (code === 'any') return { btn: '*', click: '*' };
  if (code.startsWith('*_')) return { btn: '*', click: code.replace('*_', '') };
  if (code.endsWith('_*')) return { btn: code.split('_')[0], click: '*' };
  const parts = code.split('_');
  if (parts.length === 2) return { btn: parts[0], click: parts[1] };
  return { btn: '1', click: 'single' };
};

export const buildMoesCode = (btn, click) => {
  if (btn === '*' && click === '*') return 'any';
  if (btn === '*') return `*_${click}`;
  if (click === '*') return `${btn}_*`;
  return `${btn}_${click}`;
};

export const getButtonComboLabel = (code) => {
  if (!code) return 'Sin configurar';
  const found = BUTTON_PRESETS.find(p => p.id === code);
  if (found) return found.label;
  const { btn, click } = parseMoesCode(code);
  const bText = btn === '*' ? 'Cualquier Botón' : `Botón ${btn}`;
  const clickObj = CLICK_TYPES.find(c => c.id === click);
  const cText = clickObj ? clickObj.name : click;
  return `${bText} · ${cText} (${code})`;
};

export default function AutomationEditModal({
  auto,
  availableDevices = [],
  availableSensors = [],
  onSave,
  onDelete,
  onClose
}) {
  const [sensorsList, setSensorsList] = useState(availableSensors || []);
  const [devicesList, setDevicesList] = useState(availableDevices || []);
  const [isManualSensorId, setIsManualSensorId] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices?real_only=true');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.devices || []);
          if (list.length > 0) setDevicesList(list);
        }
      } catch (e) {
        console.error('Error cargando dispositivos para modal:', e);
      }
    };
    fetchDevices();
  }, []);

  const ROOM_LABELS = {
    salon: '🛋️ Salón',
    pasillo: '🚪 Pasillo / Entrada',
    andrea: '🛏️ Habitación Andrea',
    principal: '👑 Dormitorio Principal',
    cocina: '🍳 Cocina',
    bano: '🛁 Baño',
    general: '🏠 General'
  };

  const groupedDevices = React.useMemo(() => {
    const groups = {};
    const effectiveDevices = devicesList.length > 0 ? devicesList : availableDevices;
    for (const d of effectiveDevices) {
      const room = d.room || 'general';
      if (!groups[room]) groups[room] = [];
      groups[room].push(d);
    }
    // Ordenar habitaciones preferidas primero
    const roomOrder = ['salon', 'pasillo', 'andrea', 'principal', 'cocina', 'bano', 'general'];
    const sortedGroups = {};
    for (const r of roomOrder) {
      if (groups[r] && groups[r].length > 0) {
        sortedGroups[r] = [...groups[r]].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }
    // Cualquier otra habitación no contemplada
    for (const r in groups) {
      if (!sortedGroups[r]) {
        sortedGroups[r] = [...groups[r]].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }
    return sortedGroups;
  }, [devicesList, availableDevices]);

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await fetch('/api/sensors');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.sensors || []);
          const seen = new Set();
          const unique = [];
          for (const s of list) {
            const key = (s.ieee || s.id || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              unique.push(s);
            }
          }
          if (unique.length > 0) {
            setSensorsList(unique);
          }
        }
      } catch (e) {
        console.error('Error fetching sensors for modal:', e);
      }
    };
    fetchSensors();
  }, []);

  const getSensorIcon = (s) => {
    if (s.category === 'button' || s.type === 'wireless_button') return '🔘';
    if (s.category === 'plant' || s.type === 'soil_sensor' || (s.attributes && s.attributes.soil_moisture !== undefined)) return '🪴';
    if (s.category === 'contact' || s.type === 'door_window' || s.type === 'door') return '🚪';
    if (s.category === 'presence' || s.type === 'pir' || s.type === 'mmwave_radar') return '🚶';
    if (s.category === 'water' || s.type === 'water_leak') return '💧';
    if (s.category === 'smoke_gas' || s.type === 'smoke_detector') return '🔥';
    if (s.category === 'air' || s.type === 'air_quality' || s.type === 'climate') return '🌱';
    if (s.category === 'light_lux' || s.type === 'illuminance') return '☀️';
    return '📡';
  };

  const handleSelectSensor = (sensorId) => {
    const selected = sensorsList.find(s => s.id === sensorId || s.ieee === sensorId);
    let toState = formData.trigger?.to_state || 'open';
    let closeState = formData.trigger?.close_state || 'closed';

    if (selected) {
      if (selected.category === 'button' || selected.type === 'wireless_button' || (selected.id && (selected.id.includes('pulsador') || selected.id.includes('moes')))) {
        toState = '1_single';
        closeState = '';
      } else if (selected.category === 'contact' || selected.type === 'door_window') {
        toState = 'open';
        closeState = 'closed';
      } else if (selected.category === 'presence' || selected.type === 'pir' || selected.type === 'mmwave_radar') {
        toState = 'on';
        closeState = 'off';
      } else if (selected.category === 'water' || selected.type === 'water_leak') {
        toState = 'leak';
        closeState = 'dry';
      } else if (selected.category === 'smoke_gas' || selected.type === 'smoke_detector') {
        toState = 'alarm';
        closeState = 'clear';
      } else if (selected.category === 'air' || selected.type === 'air_quality' || selected.type === 'climate') {
        toState = 'warning';
        closeState = 'good';
      } else if (selected.category === 'plant' || selected.type === 'soil_sensor') {
        toState = 'dry';
        closeState = 'optimal';
      }
    }

    setFormData(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        entity_id: sensorId,
        to_state: toState,
        close_state: closeState
      }
    }));
  };
  const isNew = !auto || !auto.id || auto.is_new;

  const [formData, setFormData] = useState(() => {
    if (auto) {
      return {
        id: auto.id || `auto_${Date.now()}`,
        name: auto.name || 'Nueva Regla Inteligente',
        description: auto.description || '',
        icon: auto.icon || '⚡',
        category: auto.category || 'scene',
        enabled: auto.enabled !== false,
        is_quick_scene: auto.is_quick_scene ?? (auto.category === 'scene' || auto.type === 'scene'),
        quick_color: auto.quick_color || '#00f3ff',
        quick_order: auto.quick_order ?? 50,
        trigger: auto.trigger ? {
          ...auto.trigger,
          to_state: auto.trigger.to_state || (auto.trigger.type === 'sensor' ? 'open' : 'on'),
          close_state: auto.trigger.close_state || 'closed'
        } : { type: 'manual' },
        conditions: auto.conditions ? [...auto.conditions] : [],
        actions: auto.actions ? JSON.parse(JSON.stringify(auto.actions)) : [],
        close_actions: auto.close_actions ? JSON.parse(JSON.stringify(auto.close_actions)) : [],
        tts_message: auto.tts_message || '',
        close_tts_message: auto.close_tts_message || ''
      };
    }
    return {
      id: `auto_${Date.now()}`,
      name: 'Nueva Regla Inteligente',
      description: 'Descripción de la automatización',
      icon: '⚡',
      category: 'scene',
      enabled: true,
      is_quick_scene: true,
      quick_color: '#00f3ff',
      quick_order: 50,
      trigger: { type: 'manual', to_state: 'open', close_state: 'closed' },
      conditions: [],
      actions: [
        {
          type: 'device',
          entity_id: availableDevices[0]?.id || 'luz_luz_principal_del_salon_53c1',
          action: 'turn_on',
          brightness: 50,
          color_temp_kelvin: 3000
        }
      ],
      close_actions: [],
      tts_message: '',
      close_tts_message: ''
    };
  });

  const selectedSensor = sensorsList.find(s => s.id === formData?.trigger?.entity_id || s.ieee === formData?.trigger?.entity_id);
  const isButtonSensor = Boolean(
    selectedSensor?.category === 'button' ||
    selectedSensor?.type === 'wireless_button' ||
    formData?.trigger?.entity_id?.toLowerCase().includes('pulsador') ||
    formData?.trigger?.entity_id?.toLowerCase().includes('boton') ||
    formData?.trigger?.entity_id?.toLowerCase().includes('button') ||
    formData?.trigger?.entity_id?.toLowerCase().includes('moes') ||
    formData?.trigger?.to_state?.includes('_single') ||
    formData?.trigger?.to_state?.includes('_double') ||
    formData?.trigger?.to_state?.includes('_hold')
  );

  const hasPetFilter = formData.conditions?.some(c => c.type === 'pet_immunity');

  const handleTogglePetImmunity = () => {
    if (hasPetFilter) {
      setFormData(prev => ({
        ...prev,
        conditions: prev.conditions.filter(c => c.type !== 'pet_immunity')
      }));
    } else {
      const camId = formData.trigger?.camera_id || 'camara_pasillo';
      setFormData(prev => ({
        ...prev,
        conditions: [...(prev.conditions || []), { type: 'pet_immunity', camera_id: camId }]
      }));
    }
  };

  const handleAddAction = () => {
    const defaultDev = availableDevices[0]?.id || 'luz_luz_principal_del_salon_53c1';
    setFormData(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          type: 'device',
          entity_id: defaultDev,
          action: 'turn_on',
          brightness: 50,
          color_temp_kelvin: 3000
        }
      ]
    }));
  };

  const handleRemoveAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateAction = (index, field, value) => {
    setFormData(prev => {
      const nextActions = [...prev.actions];
      const current = { ...nextActions[index], [field]: value };
      if (field === 'entity_id') {
        current.type = 'device';
        if (!current.action) current.action = 'turn_on';
      }
      nextActions[index] = current;
      return { ...prev, actions: nextActions };
    });
  };

  const handleAddCloseAction = () => {
    const defaultDev = availableDevices[0]?.id || 'luz_luz_principal_del_salon_53c1';
    setFormData(prev => ({
      ...prev,
      close_actions: [
        ...(prev.close_actions || []),
        {
          type: 'device',
          entity_id: defaultDev,
          action: 'turn_off'
        }
      ]
    }));
  };

  const handleRemoveCloseAction = (index) => {
    setFormData(prev => ({
      ...prev,
      close_actions: (prev.close_actions || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateCloseAction = (index, field, value) => {
    setFormData(prev => {
      const nextActions = [...(prev.close_actions || [])];
      const current = { ...nextActions[index], [field]: value };
      if (field === 'entity_id') {
        current.type = 'device';
        if (!current.action) current.action = 'turn_off';
      }
      nextActions[index] = current;
      return { ...prev, close_actions: nextActions };
    });
  };

  const handleAutoInvertCloseActions = () => {
    if (!formData.actions || formData.actions.length === 0) return;
    const inverted = formData.actions.map(act => ({
      ...act,
      action: act.action === 'turn_on' || act.action === 'timed_on' ? 'turn_off' : (act.action === 'open_cover' ? 'close_cover' : 'turn_off')
    }));
    setFormData(prev => ({
      ...prev,
      close_actions: inverted
    }));
  };

  const renderActionCard = (act, idx, updateFn, removeFn, isCloseCard = false) => {
    const isCover = act.entity_id?.includes('cover') || act.entity_id?.includes('persiana');
    const isTurnOn = act.action === 'turn_on';
    const isTimedOn = act.action === 'timed_on';
    const isSetPos = act.action === 'set_cover_position';

    return (
      <div
        key={idx}
        style={{
          background: 'rgba(2, 6, 23, 0.65)',
          border: isCloseCard ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(0, 243, 255, 0.25)',
          borderRadius: '10px',
          padding: '12px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr auto', gap: '10px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>DISPOSITIVO</label>
            <select
              value={act.entity_id}
              onChange={e => updateFn(idx, 'entity_id', e.target.value)}
              style={{
                width: '100%',
                background: '#090f1f',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '7px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem'
              }}
            >
              {Object.keys(groupedDevices).length > 0 ? (
                Object.entries(groupedDevices).map(([roomKey, devs]) => (
                  <optgroup key={roomKey} label={ROOM_LABELS[roomKey] || roomKey.toUpperCase()}>
                    {devs.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.domain === 'cover' ? '(Persiana)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                (devicesList.length > 0 ? devicesList : availableDevices).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.room || d.id})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>ACCIÓN</label>
            <select
              value={act.action}
              onChange={e => updateFn(idx, 'action', e.target.value)}
              style={{
                width: '100%',
                background: '#090f1f',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '7px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem'
              }}
            >
              {isCover ? (
                <>
                  <option value="open_cover">⬆️ Abrir Persiana (100%)</option>
                  <option value="close_cover">⬇️ Cerrar Persiana (0%)</option>
                  <option value="set_cover_position">🎚️ Ajustar Posición %</option>
                </>
              ) : (
                <>
                  <option value="turn_on">💡 Encender</option>
                  <option value="turn_off">⏹️ Apagar</option>
                  <option value="toggle">🔄 Alternar (Toggle)</option>
                  <option value="timed_on">⏱️ Encendido Temporizado (Cuenta Atrás)</option>
                </>
              )}
            </select>
          </div>

          <div style={{ paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => removeFn(idx)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer'
              }}
              title="Eliminar este dispositivo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isTimedOn && !isCover && (
          <div style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(0, 243, 255, 0.05)',
            border: '1px solid rgba(0, 243, 255, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#00f3ff', fontWeight: 'bold' }}>
                ⏱️ Duración de la Cuenta Atrás:
              </span>
              <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 'bold', background: '#090f1f', padding: '2px 10px', borderRadius: '4px', border: '1px solid #00f3ff' }}>
                {(act.duration_minutes ?? 10) === 0.5 ? 'Medio minuto (30 seg)' : `${act.duration_minutes ?? 10} min`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {[0.5, 1, 2, 3, 4, 5, 10, 15, 30, 60].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateFn(idx, 'duration_minutes', m)}
                  style={{
                    background: (act.duration_minutes ?? 10) === m ? 'rgba(0, 243, 255, 0.35)' : 'rgba(15, 23, 42, 0.7)',
                    border: (act.duration_minutes ?? 10) === m ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',
                    color: (act.duration_minutes ?? 10) === m ? '#00f3ff' : '#94a3b8',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.70rem',
                    fontWeight: (act.duration_minutes ?? 10) === m ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {m === 0.5 ? '½ min (30s)' : `${m} min`}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.5"
              max="60"
              step="0.5"
              value={act.duration_minutes ?? 10}
              onChange={e => updateFn(idx, 'duration_minutes', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#00f3ff', cursor: 'pointer' }}
            />
          </div>
        )}

        {isTurnOn && !isCover && (
          <div style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.5fr',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                <span>Brillo:</span>
                <strong style={{ color: '#00f3ff' }}>{act.brightness ?? 50}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={act.brightness ?? 50}
                onChange={e => updateFn(idx, 'brightness', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#00f3ff', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '3px' }}>Tono de Luz:</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { kelvin: 2400, label: '🕯️ 2400K' },
                  { kelvin: 2700, label: 'Cálido' },
                  { kelvin: 4000, label: '☀️ 4000K' }
                ].map(k => (
                  <button
                    key={k.kelvin}
                    type="button"
                    onClick={() => updateFn(idx, 'color_temp_kelvin', k.kelvin)}
                    style={{
                      background: act.color_temp_kelvin === k.kelvin ? 'rgba(245, 158, 11, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                      border: act.color_temp_kelvin === k.kelvin ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                      color: act.color_temp_kelvin === k.kelvin ? '#fbbf24' : '#94a3b8',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '0.66rem',
                      cursor: 'pointer'
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isSetPos && (
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
              <span>Apertura Persiana:</span>
              <strong style={{ color: '#00f3ff' }}>{act.position ?? 50}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={act.position ?? 50}
              onChange={e => updateFn(idx, 'position', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00f3ff', cursor: 'pointer' }}
            />
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor introduce un nombre para la regla');
      return;
    }
    onSave(formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
        border: '1px solid rgba(0, 243, 255, 0.35)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 243, 255, 0.15)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(0, 243, 255, 0.15)',
              border: '1px solid #00f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}>
              {formData.icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {isNew ? '➕ Crear Nueva Automatización o Escena' : `✏️ Variar y Editar: ${formData.name}`}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                ID: <code style={{ color: '#00f3ff' }}>{formData.id}</code> · Ajusta disparadores, dispositivos y luminosidad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Formulario con Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Fila 1: Nombre y Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                NOMBRE DE LA REGLA O ESCENA
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Modo Cine Salón"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                CATEGORÍA
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '9px 10px',
                  color: '#fff',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              >
                <option value="scene">🎬 Escena Manual</option>
                <option value="camera">📹 Visión Cámaras</option>
                <option value="routine">⏰ Rutina Horaria</option>
                <option value="safety">💧 Fugas & Seguridad</option>
                <option value="power">⚡ Potencia 230V</option>
                <option value="climate">🌿 Climatización</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Descripción e Icono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                DESCRIPCIÓN
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe qué hace esta regla..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                ICONO
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                {COMMON_ICONS.slice(0, 8).map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: ic })}
                    style={{
                      background: formData.icon === ic ? 'rgba(0, 243, 255, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                      border: formData.icon === ic ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BLOQUE VISUAL: ESCENA RÁPIDA (EJECUCIÓN INMEDIATA) */}
          <div style={{
            background: formData.is_quick_scene
              ? `linear-gradient(135deg, ${formData.quick_color || '#00f3ff'}22, rgba(15, 23, 42, 0.85))`
              : 'rgba(15, 23, 42, 0.55)',
            border: formData.is_quick_scene
              ? `1px solid ${formData.quick_color || '#00f3ff'}`
              : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.35rem' }}>✨</span>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: formData.is_quick_scene ? (formData.quick_color || '#00f3ff') : '#cbd5e1' }}>
                    MOSTRAR EN "ESCENAS RÁPIDAS (EJECUCIÓN INMEDIATA)"
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                    Aparecerá como botón directo de 1 clic tanto en la pestaña <strong>VISUAL</strong> como en <strong>AUTOMATIZACIONES</strong>.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_quick_scene: !formData.is_quick_scene })}
                style={{
                  background: formData.is_quick_scene ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: formData.is_quick_scene ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
                  color: formData.is_quick_scene ? '#34d399' : '#94a3b8',
                  borderRadius: '999px',
                  padding: '6px 14px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {formData.is_quick_scene ? '🟢 VISIBLE EN ESCENAS RÁPIDAS' : '⚪ OCULTO DE ESCENAS RÁPIDAS'}
              </button>
            </div>

            {formData.is_quick_scene && (
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>
                  🎨 Color del Botón en Escenas Rápidas:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {QUICK_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, quick_color: c.hex })}
                      style={{
                        background: formData.quick_color === c.hex ? `${c.hex}33` : 'rgba(2, 6, 23, 0.7)',
                        border: formData.quick_color === c.hex ? `2px solid ${c.hex}` : '1px solid rgba(255,255,255,0.15)',
                        color: c.hex,
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: c.hex, display: 'inline-block' }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BLOQUE: DISPARADOR (TRIGGER) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(0, 243, 255, 0.22)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00f3ff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} /> DISPARADOR: ¿CUÁNDO SE EJECUTA ESTA REGLA?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {[
                { type: 'manual', label: '🔘 Pulsación / Escena' },
                { type: 'camera', label: '📹 Visión de Cámara' },
                { type: 'time', label: '⏰ Hora Programada' },
                { type: 'sensor', label: '📡 Estado de Sensor' }
              ].map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setFormData({ ...formData, trigger: { type: t.type } })}
                  style={{
                    background: formData.trigger?.type === t.type ? 'rgba(0, 243, 255, 0.22)' : 'rgba(2, 6, 23, 0.6)',
                    border: formData.trigger?.type === t.type ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: formData.trigger?.type === t.type ? '#00f3ff' : '#94a3b8',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Opciones según tipo de disparador */}
            {formData.trigger?.type === 'camera' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>CÁMARA VIGILANTE</label>
                  <select
                    value={formData.trigger?.camera_id || 'camara_pasillo'}
                    onChange={e => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, camera_id: e.target.value, event: 'person_detected' }
                    })}
                    style={{
                      width: '100%',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="camara_pasillo">Cámara Pasillo (RTSP Directo)</option>
                    <option value="camara_cam720">Cam720 Salón (RTSP Directo)</option>
                    <option value="camara_andrea">Cámara Andrea (RTSP)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>EVENTO DE VISIÓN</label>
                  <select
                    value={formData.trigger?.event || 'person_detected'}
                    onChange={e => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, event: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="person_detected">Detección de Persona Humana</option>
                    <option value="motion">Cualquier Movimiento</option>
                  </select>
                </div>
              </div>
            )}

            {formData.trigger?.type === 'time' && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#00f3ff', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      ⏰ HORA DE DISPARO / INICIO (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={formData.trigger?.time || '08:00'}
                      onChange={e => setFormData({
                        ...formData,
                        trigger: { ...formData.trigger, time: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#090f1f',
                        border: '1px solid rgba(0, 243, 255, 0.4)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                        ⏹️ HORA DE FIN (HH:MM)
                      </label>
                      {formData.trigger?.end_time && (
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            trigger: { ...formData.trigger, end_time: '' }
                          })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Quitar fin
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={formData.trigger?.end_time || ''}
                      onChange={e => setFormData({
                        ...formData,
                        trigger: { ...formData.trigger, end_time: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#090f1f',
                        border: formData.trigger?.end_time ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: formData.trigger?.end_time ? '#fbbf24' : '#64748b',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                {formData.trigger?.end_time && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>💡</span>
                    <span>
                      A las <strong>{formData.trigger.time || '08:00'}</strong> se activarán los dispositivos, y a las <strong>{formData.trigger.end_time}</strong> se apagarán automáticamente.
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.trigger?.type === 'sensor' && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Selector de Sensor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>
                      ID DEL SENSOR (ENTIDAD)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualSensorId(!isManualSensorId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      {isManualSensorId ? '📋 Desplegable' : '✏️ Manual'}
                    </button>
                  </div>

                  {!isManualSensorId ? (
                    <select
                      value={formData.trigger?.entity_id || ''}
                      onChange={e => {
                        if (e.target.value === '__manual__') {
                          setIsManualSensorId(true);
                        } else {
                          handleSelectSensor(e.target.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#090f1f',
                        border: '1.5px solid #00f3ff',
                        color: '#00f3ff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Elige un sensor de la vivienda --</option>
                      {sensorsList.filter(s => s.installed).length > 0 && (
                        <optgroup label="🟢 SENSORES EN VIVO / INSTALADOS">
                          {sensorsList.filter(s => s.installed).map(s => (
                            <option key={s.id} value={s.id}>
                              {getSensorIcon(s)} {s.name || s.id} ({s.room || 'General'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {sensorsList.filter(s => !s.installed).length > 0 && (
                        <optgroup label="⏳ SENSORES DE PREVISIÓN (FUTURO)">
                          {sensorsList.filter(s => !s.installed).map(s => (
                            <option key={s.id} value={s.id}>
                              {getSensorIcon(s)} {s.name || s.id} ({s.room || 'General'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__manual__">✏️ Escribir otro ID manualmente...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.trigger?.entity_id || ''}
                      onChange={e => setFormData({
                        ...formData,
                        trigger: { ...formData.trigger, entity_id: e.target.value }
                      })}
                      placeholder="Ej: sensor_pulsador_4_botones"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#090f1f',
                        border: '1.5px solid #00f3ff',
                        color: '#00f3ff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    />
                  )}
                </div>

                {/* SI ES UN PULSADOR / BOTÓN (MOES 4 BOTONES U OTROS): PANEL ESPECIALIZADO DE BOTONES Y COMBINACIONES */}
                {isButtonSensor ? (
                  <div style={{
                    background: 'rgba(2, 6, 23, 0.75)',
                    border: '1.5px solid #00f3ff',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 0 18px rgba(0, 243, 255, 0.15)'
                  }}>
                    {/* Cabecera del configurador de botones */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🔘</span>
                          <span>CONFIGURADOR FÍSICO: PULSADOR MOES 4 BOTONES</span>
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>
                          Aplica los 4 botones físicos con cualquiera de sus combinaciones (1 clic, doble clic o mantener).
                        </div>
                      </div>

                      {/* Selector de Modo: 1 Sola Pulsación vs 2 Pulsaciones (Encender/Apagar) */}
                      <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            trigger: { ...prev.trigger, close_state: '' },
                            close_actions: []
                          }))}
                          style={{
                            background: !formData.trigger?.close_state ? 'rgba(0, 243, 255, 0.25)' : 'transparent',
                            border: !formData.trigger?.close_state ? '1px solid #00f3ff' : 'none',
                            color: !formData.trigger?.close_state ? '#00f3ff' : '#94a3b8',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ 1 Sola Pulsación (Alternar / Disparo)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curBtn = parseMoesCode(formData.trigger?.to_state || '1_single').btn;
                            const defClose = curBtn === '*' ? '*_double' : `${curBtn}_double`;
                            setFormData(prev => ({
                              ...prev,
                              trigger: { ...prev.trigger, close_state: defClose }
                            }));
                          }}
                          style={{
                            background: formData.trigger?.close_state ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                            border: formData.trigger?.close_state ? '1px solid #f59e0b' : 'none',
                            color: formData.trigger?.close_state ? '#fbbf24' : '#94a3b8',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🔄 2 Pulsaciones (Encender y Apagar)
                        </button>
                      </div>
                    </div>

                    {/* SECCIÓN 1: PULSACIÓN PRINCIPAL */}
                    {(() => {
                      const { btn, click } = parseMoesCode(formData.trigger?.to_state || '1_single');
                      const updateCode = (newB, newC) => {
                        const code = buildMoesCode(newB, newC);
                        setFormData(prev => ({
                          ...prev,
                          trigger: { ...prev.trigger, to_state: code }
                        }));
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: '#00f3ff', fontWeight: 800 }}>
                              ⚡ {formData.trigger?.close_state ? 'PULSACIÓN 1: ACTIVAR / ENCENDER' : 'PULSACIÓN DE ACTIVACIÓN (EJECUTAR / CONMUTAR)'}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              background: 'rgba(0, 243, 255, 0.15)',
                              border: '1px solid rgba(0, 243, 255, 0.4)',
                              color: '#00f3ff',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}>
                              Código MQTT: <strong>{formData.trigger?.to_state || '1_single'}</strong>
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.2fr) minmax(200px, 1.5fr)', gap: '12px' }}>
                            {/* Selector Visual Cuadrado de los 4 Botones Físicos */}
                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                1. BOTÓN FÍSICO DEL MANDO:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                {MOES_BUTTONS.map(b => {
                                  const isSelected = btn === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => updateCode(b.id, click)}
                                      style={{
                                        background: isSelected ? 'rgba(0, 243, 255, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                                        border: isSelected ? '2px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.12)',
                                        color: isSelected ? '#fff' : '#cbd5e1',
                                        borderRadius: '8px',
                                        padding: '8px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        boxShadow: isSelected ? '0 0 10px rgba(0, 243, 255, 0.35)' : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ fontSize: '1rem' }}>{b.icon}</div>
                                      <div style={{ fontSize: '0.74rem', fontWeight: 800 }}>{b.name}</div>
                                      <div style={{ fontSize: '0.62rem', color: isSelected ? '#00f3ff' : '#64748b' }}>{b.sub}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={() => updateCode('*', click)}
                                style={{
                                  width: '100%',
                                  background: btn === '*' ? 'rgba(0, 243, 255, 0.28)' : 'rgba(15, 23, 42, 0.5)',
                                  border: btn === '*' ? '1.5px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                  color: btn === '*' ? '#fff' : '#94a3b8',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🔘 Cualquier Botón (1, 2, 3 o 4)
                              </button>
                            </div>

                            {/* Selector de Tipo de Pulsación */}
                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                2. TIPO DE PULSACIÓN / GESTO:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                {CLICK_TYPES.map(c => {
                                  const isSelected = click === c.id;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => updateCode(btn, c.id)}
                                      style={{
                                        background: isSelected ? 'rgba(0, 243, 255, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                                        border: isSelected ? '2px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.12)',
                                        color: isSelected ? '#fff' : '#cbd5e1',
                                        borderRadius: '8px',
                                        padding: '8px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        boxShadow: isSelected ? '0 0 10px rgba(0, 243, 255, 0.35)' : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ fontSize: '1rem' }}>{c.icon}</div>
                                      <div style={{ fontSize: '0.74rem', fontWeight: 800 }}>{c.name}</div>
                                      <div style={{ fontSize: '0.62rem', color: isSelected ? '#00f3ff' : '#64748b' }}>{c.sub}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              <div>
                                <label style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                                  O lista rápida de combinaciones predefinidas:
                                </label>
                                <select
                                  value={formData.trigger?.to_state || '1_single'}
                                  onChange={e => setFormData(prev => ({
                                    ...prev,
                                    trigger: { ...prev.trigger, to_state: e.target.value }
                                  }))}
                                  style={{
                                    width: '100%',
                                    background: '#090f1f',
                                    border: '1px solid rgba(0, 243, 255, 0.5)',
                                    color: '#fff',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {BUTTON_PRESETS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label} [{p.id}]</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(0, 243, 255, 0.1)',
                            border: '1px dashed rgba(0, 243, 255, 0.35)',
                            fontSize: '0.72rem',
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>👉</span>
                            <span>
                              Disparador activo: <strong>{getButtonComboLabel(formData.trigger?.to_state || '1_single')}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* SECCIÓN 2: PULSACIÓN SECUNDARIA (APAGADO) SI ESTÁ ACTIVA */}
                    {formData.trigger?.close_state && (() => {
                      const { btn, click } = parseMoesCode(formData.trigger.close_state);
                      const updateCloseCode = (newB, newC) => {
                        const code = buildMoesCode(newB, newC);
                        setFormData(prev => ({
                          ...prev,
                          trigger: { ...prev.trigger, close_state: code }
                        }));
                      };

                      return (
                        <div style={{ paddingTop: '12px', borderTop: '1px dashed rgba(245, 158, 11, 0.35)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 800 }}>
                              ⏹️ PULSACIÓN 2: APAGAR / DESACTIVAR
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 700
                              }}>
                                Código MQTT: <strong>{formData.trigger.close_state}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  trigger: { ...prev.trigger, close_state: '' },
                                  close_actions: []
                                }))}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f87171',
                                  fontSize: '0.66rem',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                              >
                                ✖️ Quitar
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.2fr) minmax(200px, 1.5fr)', gap: '12px' }}>
                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                1. BOTÓN FÍSICO PARA APAGAR:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                {MOES_BUTTONS.map(b => {
                                  const isSelected = btn === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => updateCloseCode(b.id, click)}
                                      style={{
                                        background: isSelected ? 'rgba(245, 158, 11, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                                        border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                                        color: isSelected ? '#fff' : '#cbd5e1',
                                        borderRadius: '8px',
                                        padding: '8px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none'
                                      }}
                                    >
                                      <div style={{ fontSize: '1rem' }}>{b.icon}</div>
                                      <div style={{ fontSize: '0.74rem', fontWeight: 800 }}>{b.name}</div>
                                      <div style={{ fontSize: '0.62rem', color: isSelected ? '#fbbf24' : '#64748b' }}>{b.sub}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                                2. TIPO DE PULSACIÓN PARA APAGAR:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                {CLICK_TYPES.map(c => {
                                  const isSelected = click === c.id;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => updateCloseCode(btn, c.id)}
                                      style={{
                                        background: isSelected ? 'rgba(245, 158, 11, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                                        border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                                        color: isSelected ? '#fff' : '#cbd5e1',
                                        borderRadius: '8px',
                                        padding: '8px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none'
                                      }}
                                    >
                                      <div style={{ fontSize: '1rem' }}>{c.icon}</div>
                                      <div style={{ fontSize: '0.74rem', fontWeight: 800 }}>{c.name}</div>
                                      <div style={{ fontSize: '0.62rem', color: isSelected ? '#fbbf24' : '#64748b' }}>{c.sub}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              <select
                                value={formData.trigger.close_state}
                                onChange={e => setFormData(prev => ({
                                  ...prev,
                                  trigger: { ...prev.trigger, close_state: e.target.value }
                                }))}
                                style={{
                                  width: '100%',
                                  background: '#090f1f',
                                  border: '1px solid rgba(245, 158, 11, 0.5)',
                                  color: '#fff',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {BUTTON_PRESETS.map(p => (
                                  <option key={p.id} value={p.id}>{p.label} [{p.id}]</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px dashed rgba(245, 158, 11, 0.35)',
                            fontSize: '0.72rem',
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>👉</span>
                            <span>
                              Disparador de apagado: <strong>{getButtonComboLabel(formData.trigger.close_state)}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* SENSORES DE CONTACTO / PUERTA / PRESENCIA TRADICIONALES */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          🟢 ESTADO 1: AL ABRIR / DETECTAR
                        </label>
                        <input
                          type="text"
                          value={formData.trigger?.to_state ?? 'open'}
                          onChange={e => setFormData({
                            ...formData,
                            trigger: { ...formData.trigger, to_state: e.target.value }
                          })}
                          placeholder="open / on / leak"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: '#090f1f',
                            border: '1.5px solid #10b981',
                            color: '#34d399',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          🔴 ESTADO 2: AL CERRAR / RESTABLECER
                        </label>
                        <input
                          type="text"
                          value={formData.trigger?.close_state ?? 'closed'}
                          onChange={e => setFormData({
                            ...formData,
                            trigger: { ...formData.trigger, close_state: e.target.value }
                          })}
                          placeholder="closed / off / dry"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: '#090f1f',
                            border: '1.5px solid #f59e0b',
                            color: '#fbbf24',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 243, 255, 0.08)',
                      border: '1px dashed rgba(0, 243, 255, 0.3)',
                      fontSize: '0.74rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>💡</span>
                      <span>
                        El sistema ejecutará automáticamente las acciones del <strong>Estado 1</strong> cuando pase a <strong>{formData.trigger?.to_state || 'open'}</strong> (al abrir), y las del <strong>Estado 2</strong> cuando pase a <strong>{formData.trigger?.close_state || 'closed'}</strong> (al cerrar).
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Checkbox Inmunidad a Mascotas */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem' }}>
                <input
                  type="checkbox"
                  checked={hasPetFilter}
                  onChange={handleTogglePetImmunity}
                  style={{ accentColor: '#c084fc', width: '16px', height: '16px' }}
                />
                <span style={{ color: hasPetFilter ? '#c084fc' : '#94a3b8', fontWeight: 600 }}>
                  🐾 Activar Filtro de Inmunidad a Mascotas (Descarta si solo se detectan gatos / animales)
                </span>
              </label>
            </div>
          </div>

                    {/* BLOQUE: ACCIONES / DISPOSITIVOS */}
          {formData.trigger?.type === 'sensor' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* BLOQUE 1: ACCIONES AL ABRIR / DETECTAR */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1.5px solid rgba(16, 185, 129, 0.45)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{isButtonSensor ? '🔘' : '🔓'}</span>
                    <span>
                      {isButtonSensor
                        ? `ACCIONES AL PULSAR: ${getButtonComboLabel(formData.trigger?.to_state || '1_single')}`
                        : `ESTADO 1: AL ABRIR (${formData.trigger?.to_state || 'open'})`}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                      {formData.actions.length} dispositivos
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> {isButtonSensor ? 'Añadir Dispositivo al Pulsar' : 'Añadir Dispositivo al Abrir'}
                  </button>
                </div>

                {formData.actions.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '8px' }}>
                    No hay dispositivos al abrir. Pulsa "+ Añadir Dispositivo al Abrir" para encender luces o persianas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.actions.map((act, idx) => renderActionCard(act, idx, handleUpdateAction, handleRemoveAction, false))}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    🗣️ MENSAJE DE VOZ AL ABRIR (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    value={formData.tts_message || ''}
                    onChange={e => setFormData({ ...formData, tts_message: e.target.value })}
                    placeholder="Ej: Puerta del salón abierta. Bienvenida."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(2, 6, 23, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      color: '#cbd5e1',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              {/* BLOQUE 2: ACCIONES AL CERRAR / 2ª PULSACIÓN */}
              {(!isButtonSensor || Boolean(formData.trigger?.close_state)) ? (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1.5px solid rgba(245, 158, 11, 0.45)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{isButtonSensor ? '⏹️' : '🔒'}</span>
                      <span>
                        {isButtonSensor
                          ? `ACCIONES AL APAGAR / 2ª PULSACIÓN: ${getButtonComboLabel(formData.trigger?.close_state)}`
                          : `ESTADO 2: AL CERRAR (${formData.trigger?.close_state || 'closed'})`}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                        {(formData.close_actions || []).length} dispositivos
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {formData.actions?.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoInvertCloseActions}
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid #f59e0b',
                            color: '#fbbf24',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Copia los dispositivos del Estado 1 y los cambia automáticamente a 'Apagar'"
                        >
                          ⚡ Invertir a "Apagar"
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddCloseAction}
                        style={{
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid #f59e0b',
                          color: '#fbbf24',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> {isButtonSensor ? 'Añadir Dispositivo al Apagar' : 'Añadir Dispositivo al Cerrar'}
                      </button>
                      {isButtonSensor && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            trigger: { ...prev.trigger, close_state: '' },
                            close_actions: []
                          }))}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '5px 9px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Eliminar la segunda pulsación y volver al modo de 1 sola pulsación"
                        >
                          ✖️ Quitar 2ª Pulsación
                        </button>
                      )}
                    </div>
                  </div>

                  {(formData.close_actions || []).length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '8px' }}>
                      {isButtonSensor
                        ? 'No hay dispositivos al pulsar para apagar. Pulsa "+ Añadir Dispositivo al Apagar" o "⚡ Invertir a Apagar".'
                        : 'No hay dispositivos al cerrar. Pulsa "+ Añadir Dispositivo al Cerrar" o "⚡ Invertir a Apagar" para apagar las luces al cerrar la puerta.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(formData.close_actions || []).map((act, idx) => renderActionCard(act, idx, handleUpdateCloseAction, handleRemoveCloseAction, true))}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                      {isButtonSensor ? '🗣️ MENSAJE DE VOZ AL APAGAR (OPCIONAL)' : '🗣️ MENSAJE DE VOZ AL CERRAR (OPCIONAL)'}
                    </label>
                    <input
                      type="text"
                      value={formData.close_tts_message || ''}
                      onChange={e => setFormData({ ...formData, close_tts_message: e.target.value })}
                      placeholder={isButtonSensor ? 'Ej: Luces apagadas con pulsador Moes.' : 'Ej: Puerta cerrada. Luces apagadas.'}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(2, 6, 23, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '7px 10px',
                        color: '#cbd5e1',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* INVITACIÓN PARA ACTIVAR 2ª PULSACIÓN CUANDO ESTÁ EN MODO 1 PULSACIÓN */
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                      <strong>¿Quieres usar una segunda pulsación para apagar?</strong> (Ejemplo: 1 clic enciende, Doble clic apaga).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const curBtn = parseMoesCode(formData.trigger?.to_state || '1_single').btn;
                      const defClose = curBtn === '*' ? '*_double' : `${curBtn}_double`;
                      setFormData(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, close_state: defClose }
                      }));
                    }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Activar 2ª Pulsación para Apagar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={16} /> DISPOSITIVOS A CONMUTAR ({formData.actions.length})
                </div>
                <button
                  type="button"
                  onClick={handleAddAction}
                  style={{
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Añadir Dispositivo
                </button>
              </div>

              {formData.actions.length === 0 ? (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.8rem'
                }}>
                  No hay dispositivos configurados. Pulsa en "Añadir Dispositivo" para agregar luces o persianas.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formData.actions.map((act, idx) => renderActionCard(act, idx, handleUpdateAction, handleRemoveAction, false))}
                </div>
              )}

              {/* Mensaje de Voz TTS opcional */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  MENSAJE POR VOZ AL DISPARARSE (OPCIONAL)
                </label>
                <input
                  type="text"
                  value={formData.tts_message || ''}
                  onChange={e => setFormData({ ...formData, tts_message: e.target.value })}
                  placeholder="Ej: Modo cine activado en el salón. Disfruta de la película."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Pie del Modal con Botones */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(4, 9, 22, 0.6)'
        }}>
          {!isNew ? (
            <button
              type="button"
              onClick={() => onDelete(formData.id, formData.name)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={15} /> Eliminar Regla
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              style={{
                background: 'linear-gradient(135deg, #00f3ff, #10b981)',
                border: 'none',
                color: '#030712',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)'
              }}
            >
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

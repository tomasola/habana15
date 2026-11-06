import React, { useState, useEffect, useRef, useCallback } from 'react';
import ZigbeeMeshRadar from './ZigbeeMeshRadar';
import ESP32HubPanel from './ESP32HubPanel';
import MoesButtonSwitchCard from './MoesButtonSwitchCard';

export function cleanText(str) {
  if (!str || typeof str !== 'string') return str || '';
  let res = str;
  const MOJIBAKE_MAP = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã': 'Á', 'Ã': 'É', 'Ã': 'Í', 'Ã': 'Ó', 'Ã': 'Ú',
    'Ã±': 'ñ', 'Ã‘': 'Ñ',
    'ðŸ›ï¸': '🛏️', 'ðŸ›': '🛏️', 'ðŸ›ï¸': '🛏️', 'ðŸ›Œ': '🛏️',
    'ðŸ ½': '🛋️', '🛋ï¸': '🛋️', 'ðŸ ³': '🍳',
    'ðŸ‘‘': '👑', 'ðŸšª': '🚪', 'ðŸš¿': '🚿', 'ðŸŒ¿': '🌿',
    'ðŸ ': '🏠', 'ðŸ’¡': '💡', 'ðŸ”': '🔔',
    'ðŸ”': '🔑', 'ðŸ”': '🔘', 'ðŸ”§': '🔧',
    'ðŸ“': '📍', 'âœ–': '✖', 'âšª': '⚪',
    'â—': '●', 'â—‹': '○', 'ðŸ’¾': '💾',
    'âœ”': '✔', 'âœ…': '✅', 'âš¡': '⚡',
    'ðŸ”„': '🔄', 'ðŸ”¦': '🔦', 'ðŸ›‘': '🛑',
    'ðŸŽ›ï¸': '🎛️', 'ðŸŽ›': '🎛️', 'ðŸ“¡': '📡'
  };
  for (const [bad, good] of Object.entries(MOJIBAKE_MAP)) {
    if (res.includes(bad)) res = res.replaceAll(bad, good);
  }
  return res;
}

export function formatChannelLabel(ch, rawLabel = '') {
  if (rawLabel && !rawLabel.includes('state') && !rawLabel.includes('Ã') && !rawLabel.includes('ð')) {
    return cleanText(rawLabel);
  }
  const cleanCh = String(ch || '').toLowerCase();
  if (cleanCh === 'state_left' || cleanCh === 'left') return 'Botón 1 (Izquierdo)';
  if (cleanCh === 'state_center' || cleanCh === 'center') return 'Botón 2 (Central)';
  if (cleanCh === 'state_right' || cleanCh === 'right') return 'Botón 3 (Derecho)';
  if (cleanCh === 'state_l1' || cleanCh === 'l1') return 'Botón L1 (Izquierdo)';
  if (cleanCh === 'state_l2' || cleanCh === 'l2') return 'Botón L2 (Derecho)';
  if (cleanCh === 'state_l3' || cleanCh === 'l3') return 'Botón L3';
  if (cleanCh === 'state') return 'Botón Principal';
  return cleanText(rawLabel || ch);
}


const API_BASE = '';

const DEFAULT_ROOMS = [
  { id: 'andrea', name: 'Habitación Andrea', icon: '🛏️' },
  { id: 'salon', name: 'Salón y Comedor', icon: '🛋️' },
  { id: 'cocina', name: 'Cocina', icon: '🍳' },
  { id: 'principal', name: 'Dormitorio Principal', icon: '👑' },
  { id: 'pasillo', name: 'Pasillo', icon: '🚪' },
  { id: 'bano', name: 'Baño', icon: '🚿' },
  { id: 'entrada', name: 'Entrada / Recibidor', icon: '🔑' },
  { id: 'terraza', name: 'Terraza', icon: '🌿' }
];

const PROFILE_OPTIONS = [
  { id: 'cover', label: '🪟 Placa Persiana / Motor de Cortina (OPEN / CLOSE / STOP)' },
  { id: 'plate_1g', label: '🔘 Placa Pared 1 Botón (state)' },
  { id: 'plate_2g', label: '🔘 Placa Pared 2 Botones (state_l1 / state_l2)' },
  { id: 'plate_3g', label: '🔘 Placa Pared 3 Botones (left / center / right)' },
  { id: 'led_controller', label: '✨ Controlador Tira LED Regulable (Brillo/Color)' },
  { id: 'dimmer_seq', label: '🎛️ Placa Dimmer Secuenciador (3 Botones)' },
  { id: 'sensor_door', label: '🚪 Sensor Puerta / Ventana (Sonoff SNZB-04)' },
  { id: 'sensor_motion', label: '🚶 Sensor Presencia / Movimiento (PIR / Radar mmWave)' },
  { id: 'sensor_air', label: '🌱 Sensor Calidad de Aire (6 en 1 Tuya TS0601)' },
  { id: 'sensor_water', label: '💧 Sensor Fuga de Agua / Inundación' },
  { id: 'sensor_smoke', label: '🔥 Detector de Humo / Gas' },
  { id: 'sensor', label: '📡 Sensor Genérico / Otro' }
];

export default function Z2MLightingHub({ onDevicesUpdated, onNavigateTab }) {
  const [appState, setAppState] = useState({
    mqtt_connected: false,
    rooms: DEFAULT_ROOMS,
    pairing: { active: false, remaining_seconds: 0, newly_joined: [] },
    z2m_inventory: [],
    plates: [],
    led_controllers: [],
    real_lights: [],
    dimmer_sequences: {},
    recent_events: [],
    learn_mode: { active: false }
  });

  const [currentTab, setCurrentTab] = useState('apartado1');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [radarFlash, setRadarFlash] = useState(false);
  const [recentlyPressedPlate, setRecentlyPressedPlate] = useState(null);
  const lastEventIdRef = useRef(null);

  // Borradores de edición local para no perder foco durante el polling de 1.2s
  const [z2mDrafts, setZ2mDrafts] = useState({});
  const [plateDrafts, setPlateDrafts] = useState({});
  const [dimmerDrafts, setDimmerDrafts] = useState(null);
  const [ledBrightnessDrafts, setLedBrightnessDrafts] = useState({});
  const [hubSensors, setHubSensors] = useState([]);
  const [hubAutomations, setHubAutomations] = useState([]);
  const [sensorLinkDrafts, setSensorLinkDrafts] = useState({});
  const [sensorNameDrafts, setSensorNameDrafts] = useState({});
  const [sensorRoomDrafts, setSensorRoomDrafts] = useState({});
  const [savingSensorId, setSavingSensorId] = useState(null);

  const saveSensorMetadata = async (sensorId) => {
    const s = hubSensors.find(item => item.id === sensorId);
    if (!s) return;
    const newName = sensorNameDrafts[sensorId] !== undefined ? sensorNameDrafts[sensorId].trim() : s.name;
    const newRoom = sensorRoomDrafts[sensorId] !== undefined ? sensorRoomDrafts[sensorId] : s.room;
    if (!newName) {
      showFeedback('El nombre no puede estar vacío', 'error');
      return;
    }
    setSavingSensorId(sensorId);
    try {
      const res = await fetch(`${API_BASE}/api/sensors/${sensorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, room: newRoom })
      });
      if (res.ok) {
        showFeedback(`✔ Sensor guardado: "${newName}"`);
        setHubSensors(prev => prev.map(item => item.id === sensorId ? { ...item, name: newName, room: newRoom } : item));
        setSensorNameDrafts(prev => {
          const next = { ...prev };
          delete next[sensorId];
          return next;
        });
        setSensorRoomDrafts(prev => {
          const next = { ...prev };
          delete next[sensorId];
          return next;
        });
        if (onDevicesUpdated) onDevicesUpdated();
      } else {
        showFeedback('Error al actualizar sensor', 'error');
      }
    } catch (e) {
      showFeedback(`Error de conexión: ${e.message}`, 'error');
    } finally {
      setSavingSensorId(null);
    }
  };
  const [hidePlates, setHidePlates] = useState(() => localStorage.getItem('z2m_hide_plates') === 'true');

  // Modal para Asignar Categoría y Calibrar Valores de Sensores (con edición continua)
  const [watchdogSettings, setWatchdogSettings] = useState({ timeout_hours: 2.0, offline_count: 0 });
  const [checkingBatteries, setCheckingBatteries] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/sensors/watchdog/settings`)
      .then(r => r.json())
      .then(d => {
        if (d && d.status === 'success') {
          setWatchdogSettings(d);
        }
      })
      .catch(() => {});
  }, [API_BASE]);

  const handleChangeWatchdogTimeout = async (hours) => {
    try {
      const res = await fetch(`${API_BASE}/api/sensors/watchdog/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout_hours: hours })
      });
      if (res.ok) {
        setWatchdogSettings(prev => ({ ...prev, timeout_hours: hours }));
        showFeedback(`✔ Watchdog de batería configurado a cada ${hours} horas`);
        if (fetchDevices) fetchDevices();
      }
    } catch (e) {
      showFeedback('Error guardando configuración watchdog', 'error');
    }
  };

  const handleTriggerBatteryCheck = async () => {
    setCheckingBatteries(true);
    try {
      const res = await fetch(`${API_BASE}/api/sensors/watchdog/check`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        showFeedback(`✔ ${d.message || 'Chequeo de baterías solicitado a Z2M'}`);
        if (fetchDevices) fetchDevices();
      }
    } catch (e) {
      showFeedback('Error solicitando chequeo de baterías', 'error');
    } finally {
      setCheckingBatteries(false);
    }
  };

  const [editingSensorModal, setEditingSensorModal] = useState(null);
  const [modalDraft, setModalDraft] = useState({});
  const [savingModal, setSavingModal] = useState(false);

  const openSensorConfigModal = (sensor) => {
    const attrs = sensor.attributes || {};
    setEditingSensorModal(sensor);
    setModalDraft({
      id: sensor.id,
      name: sensor.name || sensor.friendly_name || sensor.id,
      category: sensor.category || 'plant',
      type: sensor.type || 'soil_sensor',
      room: sensor.room || 'terraza',
      state: sensor.state || 'dry',
      value: sensor.value || '',
      battery: sensor.battery ?? (attrs.battery ?? 100),
      soil_moisture: attrs.soil_moisture ?? 0,
      temperature: attrs.temperature ?? 22,
      co2: attrs.co2 ?? 400,
      pm25: attrs.pm25 ?? 5
    });
  };

  const handleSaveSensorModal = async () => {
    if (!editingSensorModal) return;
    setSavingModal(true);
    try {
      const sensorId = editingSensorModal.id;
      const cat = modalDraft.category;
      let sType = modalDraft.type || 'generic';
      let state = modalDraft.state || 'off';
      let value = modalDraft.value || 'Normal';
      const attrs = { ...(editingSensorModal.attributes || {}) };

      if (modalDraft.battery !== undefined) {
        attrs.battery = modalDraft.battery;
      }

      if (cat === 'plant') {
        sType = 'soil_sensor';
        const moist = modalDraft.soil_moisture ?? 0;
        const temp = modalDraft.temperature ?? 22;
        attrs.soil_moisture = moist;
        attrs.temperature = temp;
        attrs.temperature_unit = 'celsius';
        value = `${moist}% humedad | ${temp}°C`;
        if (moist < 15) state = 'dry';
        else if (moist > 65) state = 'wet';
        else state = 'optimal';
      } else if (cat === 'contact') {
        sType = 'door_window';
        attrs.contact = state === 'closed';
        value = state === 'closed' ? 'Cerrada' : 'Abierta';
      } else if (cat === 'presence') {
        sType = 'mmwave_radar';
        attrs.occupancy = state === 'on';
        value = state === 'on' ? 'Presencia Detectada' : 'Despejado';
      } else if (cat === 'air') {
        sType = 'air_quality';
        if (modalDraft.co2 !== undefined) attrs.co2 = modalDraft.co2;
        if (modalDraft.pm25 !== undefined) attrs.pm25 = modalDraft.pm25;
        if (modalDraft.temperature !== undefined) attrs.temperature = modalDraft.temperature;
        value = `${attrs.co2 || 400} ppm`;
        state = (attrs.co2 || 400) > 1000 ? 'warning' : 'good';
      } else if (cat === 'water') {
        sType = 'water_leak';
        attrs.water_leak = state === 'leak';
        value = state === 'leak' ? '¡FUGA DETECTADA!' : 'Seco (Sin Fuga)';
      }

      const payload = {
        name: modalDraft.name,
        category: cat,
        type: sType,
        room: modalDraft.room,
        value,
        state,
        battery: modalDraft.battery,
        attributes: attrs
      };

      const res = await fetch(`${API_BASE}/api/sensors/${sensorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showFeedback(`✔ Sensor '${modalDraft.name}' actualizado correctamente`);
        setHubSensors(prev => prev.map(s => s.id === sensorId ? { ...s, ...payload } : s));
        setEditingSensorModal(null);
        if (onDevicesUpdated) onDevicesUpdated();
      } else {
        showFeedback('Error guardando sensor', 'error');
      }
    } catch (e) {
      console.error(e);
      showFeedback('Error de conexión', 'error');
    } finally {
      setSavingModal(false);
    }
  };

  // Formulario inline y modal para asignar/editar Luz Real en Apartado 1
  const [inlineAssignKey, setInlineAssignKey] = useState(null); // `${device}:${channel}`
  const [lightModal, setLightModal] = useState({
    open: false,
    light_id: '',
    kind: 'wired_relay',
    power_device: '',
    power_channel: '',
    name: '',
    room: 'salon'
  });

  const [statusFeedback, setStatusFeedback] = useState(null);

  const showFeedback = useCallback((msg, type = 'success') => {
    setStatusFeedback({ msg, type });
    if (window.showToast) {
      window.showToast(msg, type === 'error' ? 'error' : 'success');
    }
    setTimeout(() => {
      setStatusFeedback(prev => (prev?.msg === msg ? null : prev));
    }, 3200);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/z2m-hub/state?_=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppState(prev => ({
        ...prev,
        ...data,
        rooms: Array.isArray(data.rooms) && data.rooms.length > 0 ? data.rooms : DEFAULT_ROOMS
      }));

      try {
        const [resSens, resAuto] = await Promise.all([
          fetch(`${API_BASE}/api/sensors`),
          fetch(`${API_BASE}/api/automations`)
        ]);
        if (resSens.ok) {
          const sData = await resSens.json();
          const rawSensors = Array.isArray(sData) ? sData : (sData.sensors || []);
          const seen = new Set();
          const deduped = [];
          for (const s of rawSensors) {
            const key = (s.ieee || s.id || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              deduped.push(s);
            }
          }
          setHubSensors(deduped);
        }
        if (resAuto.ok) {
          const aData = await resAuto.json();
          setHubAutomations(aData.automations || []);
        }
      } catch (e) {}

      if (data.recent_events && data.recent_events.length > 0) {
        const latest = data.recent_events[0];
        if (lastEventIdRef.current !== latest.id) {
          lastEventIdRef.current = latest.id;
          setRecentlyPressedPlate(latest.device);
          setRadarFlash(true);
          setTimeout(() => setRadarFlash(false), 1200);
        }
      }
    } catch (err) {
      console.error('Error cargando estado Z2M Hub:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 1200);
    return () => clearInterval(timer);
  }, [fetchState]);

  // Inicializar borrador del dimmer cuando llegan secuencias del servidor
  useEffect(() => {
    const seq = appState.dimmer_sequences?.salon_dimmer;
    if (seq && Array.isArray(seq.steps) && !dimmerDrafts) {
      setDimmerDrafts(
        seq.steps.map(st => ({
          step: st.step,
          label: st.label,
          targets: {
            salon_led_aparador: st.targets?.salon_led_aparador ?? 0,
            salon_led_sofa: st.targets?.salon_led_sofa ?? 0,
            salon_led_tv: st.targets?.salon_led_tv ?? 0
          }
        }))
      );
    }
  }, [appState.dimmer_sequences, dimmerDrafts]);

  const notifyGlobalUpdate = useCallback(async () => {
    await fetchState();
    if (onDevicesUpdated) {
      try {
        await onDevicesUpdated();
      } catch (e) {}
    }
  }, [fetchState, onDevicesUpdated]);

  // =========================================================================
  // ACCIONES API (/api/z2m-hub/...)
  // =========================================================================
  const togglePermitJoin = async (active) => {
    const room = selectedRoom === 'all' ? 'salon' : selectedRoom;
    await fetch(`${API_BASE}/api/z2m-hub/permit-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, duration_seconds: 120, room })
    });
    showFeedback(active ? '🔔 Red Zigbee abierta durante 120s para emparejar' : '🛑 Emparejamiento Zigbee cerrado');
    await notifyGlobalUpdate();
  };

  const identifyZ2MDevice = async (device) => {
    await fetch(`${API_BASE}/api/z2m-hub/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device })
    });
    showFeedback(`🔦 Enviando 2 pulsos de identificación a ${device}`);
  };

  const saveZ2MHardwareAssign = async (dev) => {
    const draft = z2mDrafts[dev.friendly_name] || {};
    const new_friendly_name = (draft.new_friendly_name ?? dev.friendly_name).trim();
    const display_name = (draft.display_name ?? dev.name).trim();
    const room = draft.room ?? dev.room;
    const device_profile = draft.device_profile ?? dev.profile;

    await fetch(`${API_BASE}/api/z2m-hub/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ieee: dev.ieee,
        old_friendly_name: dev.friendly_name,
        new_friendly_name,
        display_name,
        room,
        device_profile
      })
    });
    setZ2mDrafts(prev => {
      const next = { ...prev };
      delete next[dev.friendly_name];
      return next;
    });
    showFeedback(`💾 Dispositivo asignado: ${display_name} (${new_friendly_name})`);
    await notifyGlobalUpdate();
  };

  const testRawChannel = async (device, channel, action = 'toggle', brightnessPct = null) => {
    const body = { device, channel, action };
    if (brightnessPct !== null && brightnessPct !== undefined) {
      body.brightness_pct = Number(brightnessPct);
    }
    setAppState(prev => {
      if (!prev || !prev.plates) return prev;
      const newPlates = prev.plates.map(p => {
        if (p.id !== device) return p;
        const newChs = (p.channels || []).map(ch => {
          if (ch.channel !== channel) return ch;
          const target = action === 'toggle' ? (ch.state === 'ON' ? 'OFF' : 'ON') : action.toUpperCase();
          return { ...ch, state: target };
        });
        return { ...p, channels: newChs };
      });
      return { ...prev, plates: newPlates };
    });
    await fetch(`${API_BASE}/api/z2m-hub/control/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await notifyGlobalUpdate();
  };

  const controlRealLight = async (lightId, action = 'toggle', brightnessPct = null) => {
    const body = { light_id: lightId, action };
    if (brightnessPct !== null && brightnessPct !== undefined) {
      body.brightness_pct = Number(brightnessPct);
    }
    setAppState(prev => {
      if (!prev || !prev.real_lights) return prev;
      const newLights = prev.real_lights.map(l => {
        if (l.id !== lightId) return l;
        const target = action === 'toggle' ? (l.state === 'ON' ? 'OFF' : 'ON') : action.toUpperCase();
        return { ...l, state: target };
      });
      return { ...prev, real_lights: newLights };
    });
    await fetch(`${API_BASE}/api/z2m-hub/control/light`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await notifyGlobalUpdate();
  };

  const turnAllOff = async () => {
    await fetch(`${API_BASE}/api/z2m-hub/control/all-off`, { method: 'POST' });
    showFeedback('🛑 Todas las luces y tiras LED apagadas');
    await notifyGlobalUpdate();
  };

  const syncFromZ2M = async () => {
    await fetch(`${API_BASE}/api/z2m-hub/discovery/sync`, { method: 'POST' });
    showFeedback('🔄 Inventario sincronizado con Zigbee2MQTT');
    await notifyGlobalUpdate();
  };

  const savePlateMeta = async (plate) => {
    const draft = plateDrafts[plate.id] || {};
    const name = (draft.name ?? plate.name).trim();
    const room = draft.room ?? plate.room;
    const channel_labels = draft.channel_labels || undefined;

    await fetch(`${API_BASE}/api/z2m-hub/plates/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate_id: plate.id, name, room, channel_labels })
    });
    setPlateDrafts(prev => {
      const next = { ...prev };
      delete next[plate.id];
      return next;
    });
    showFeedback(`💾 Placa "${name}" actualizada`);
    await notifyGlobalUpdate();
  };

  const openAssignRealLightModal = (kind, device, channel, room, existingLightId = '', existingName = '', useInline = false) => {
    const modalData = {
      open: !useInline,
      light_id: existingLightId || '',
      kind,
      power_device: device,
      power_channel: channel,
      name: existingName || '',
      room: room || 'salon'
    };
    setLightModal(modalData);
    if (useInline) {
      const key = `${device}:${channel}`;
      setInlineAssignKey(prev => (prev === key ? null : key));
    }
  };

  const saveRealLight = async (payloadOverride = null) => {
    const target = payloadOverride || lightModal;
    const name = (target.name || '').trim();
    if (!name) {
      alert('Escribe un nombre claro para la luz física real');
      return;
    }

    await fetch(`${API_BASE}/api/z2m-hub/lights/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        light_id: target.light_id || null,
        name,
        room: target.room || 'salon',
        kind: target.kind || 'wired_relay',
        power_device: target.power_device,
        power_channel: target.power_channel
      })
    });

    setLightModal(prev => ({ ...prev, open: false }));
    setInlineAssignKey(null);
    showFeedback(`💡 Luz Real "${name}" guardada`);
    await notifyGlobalUpdate();
  };

  const deleteRealLight = async (lightId, lightName = '') => {
    if (!window.confirm(`¿Seguro que deseas borrar la Luz Real "${lightName || lightId}"? Sus interruptores quedarán libres.`)) return;
    await fetch(`${API_BASE}/api/z2m-hub/lights/${encodeURIComponent(lightId)}`, { method: 'DELETE' });
    showFeedback(`🗑️ Luz Real eliminada`);
    await notifyGlobalUpdate();
  };

  const addCommutationDirect = async (lightId, device, channel) => {
    await fetch(`${API_BASE}/api/z2m-hub/commutation/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ light_id: lightId, device, channel })
    });
    await notifyGlobalUpdate();
  };

  const removeCommutation = async (lightId, device, channel) => {
    await fetch(`${API_BASE}/api/z2m-hub/commutation/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ light_id: lightId, device, channel })
    });
    await notifyGlobalUpdate();
  };

  const startLearnMode = async (lightId, role = 'commutation') => {
    await fetch(`${API_BASE}/api/z2m-hub/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, target_light_id: lightId, role })
    });
    await fetchState();
  };

  const stopLearnMode = async () => {
    await fetch(`${API_BASE}/api/z2m-hub/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false })
    });
    await fetchState();
  };

  const triggerDimmerStep = async (stepNum) => {
    await fetch(`${API_BASE}/api/z2m-hub/dimmer/step/${stepNum}`, { method: 'POST' });
    showFeedback(`▶️ Probando Paso ${stepNum} del Dimmer del Salón`);
    await notifyGlobalUpdate();
  };

  const saveDimmerSequence = async () => {
    const seq = appState.dimmer_sequences?.salon_dimmer;
    const stepsToSave = dimmerDrafts || seq?.steps || [];
    if (!stepsToSave.length) return;

    await fetch(`${API_BASE}/api/z2m-hub/dimmer/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimmer_device: 'salon_dimmer',
        enabled: true,
        steps: stepsToSave.map(st => ({
          step: Number(st.step),
          label: st.label,
          targets: {
            salon_led_aparador: Number(st.targets?.salon_led_aparador ?? 0),
            salon_led_sofa: Number(st.targets?.salon_led_sofa ?? 0),
            salon_led_tv: Number(st.targets?.salon_led_tv ?? 0)
          }
        }))
      })
    });
    showFeedback('💾 Secuencia de 9 pasos del Dimmer guardada');
    await notifyGlobalUpdate();
  };

    const roomsWithAll = [
    { id: 'all', name: 'Todas las Estancias', icon: '🏠' },
    ...DEFAULT_ROOMS
  ];

  const latestEvent = appState.recent_events && appState.recent_events.length > 0 ? appState.recent_events[0] : null;
  const learnTargetLight =
    appState.learn_mode?.active &&
    (appState.real_lights || []).find(l => l.id === appState.learn_mode.target_light_id);

  // =========================================================================
  // =========================================================================
  // VINCULACIÓN DIRECTA DE SENSORES ZIGBEE A LUCES REALES (APARTADO 3)
  // =========================================================================
  const handleLinkSensorToLight = async (sensor, targetLightId, durationMin = 3, withAlarm = false) => {
    if (!targetLightId) {
      showFeedback('Selecciona una luz para vincular al sensor', 'error');
      return;
    }
    const targetLight = (appState.real_lights || []).find(l => l.id === targetLightId);
    const lightName = targetLight ? targetLight.name : targetLightId;
    const autoId = `auto_sensor_${sensor.id}`;
    const autoName = `Encender ${lightName} con ${sensor.name}`;
    const isContact = sensor.category === 'contact' || sensor.type === 'door_window';

    const actions = [
      {
        type: 'device',
        entity_id: targetLightId,
        action: 'turn_on',
        duration_minutes: durationMin > 0 ? durationMin : null
      }
    ];

    if (withAlarm) {
      actions.push({
        type: 'tts',
        text: `Atención: Detección en ${sensor.room || 'la vivienda'} por ${sensor.name}.`
      });
      actions.push({
        type: 'whatsapp',
        text: `🚨 AVISO HABANA: ${sensor.name} activado en ${sensor.room || 'vivienda'}.`
      });
    }

    const closeActions = isContact ? [
      {
        type: 'device',
        entity_id: targetLightId,
        action: 'turn_off'
      }
    ] : [];

    try {
      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: autoId,
          name: autoName,
          description: `Vinculación directa desde INTERRUPTORES, LUCES Y SENSORES`,
          icon: isContact ? '🚪' : '🚶',
          category: 'automation',
          enabled: true,
          trigger: {
            type: 'sensor',
            entity_id: sensor.id,
            to_state: isContact ? 'open' : 'on',
            close_state: isContact ? 'closed' : 'off'
          },
          actions,
          close_actions: closeActions
        })
      });

      if (res.ok) {
        showFeedback(`✅ '${sensor.name}' vinculado a '${lightName}' (${durationMin > 0 ? durationMin + ' min' : 'continuo'})`);
        const resAuto = await fetch(`${API_BASE}/api/automations`);
        if (resAuto.ok) {
          const aData = await resAuto.json();
          setHubAutomations(aData.automations || []);
        }
      } else {
        showFeedback('Error al guardar vinculación', 'error');
      }
    } catch (e) {
      showFeedback('Error de conexión', 'error');
    }
  };

  const handleUnlinkSensor = async (autoId, sensorName) => {
    if (!window.confirm(`¿Desvincular la luz automática de '${sensorName}'?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/automations/${autoId}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback(`🗑️ Vinculación de luz eliminada para '${sensorName}'`);
        const resAuto = await fetch(`${API_BASE}/api/automations`);
        if (resAuto.ok) {
          const aData = await resAuto.json();
          setHubAutomations(aData.automations || []);
        }
      }
    } catch (e) {
      showFeedback('Error al desvincular', 'error');
    }
  };

  const handleTestSensorTrigger = async (autoId, autoName) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations/${autoId}/execute`, { method: 'POST' });
      if (res.ok) {
        showFeedback(`⚡ Disparo de prueba ejecutado para '${autoName}'`);
      } else {
        showFeedback('Error al ejecutar prueba', 'error');
      }
    } catch (e) {
      showFeedback('Error de red al probar', 'error');
    }
  };

  // RENDERIZADO DE LOS 4 APARTADOS
  // =========================================================================
  const renderApartado0 = () => {
    const pairing = appState.pairing || { active: false, remaining_seconds: 0, newly_joined: [] };
    const searchLow = deviceSearch.trim().toLowerCase();
    const inv = (appState.z2m_inventory || []).filter(d => {
      const matchRoom = selectedRoom === 'all' || d.room === selectedRoom;
      const matchSearch = !searchLow ||
        (d.friendly_name || '').toLowerCase().includes(searchLow) ||
        (d.name || '').toLowerCase().includes(searchLow) ||
        (d.ieee || '').toLowerCase().includes(searchLow);
      return matchRoom && matchSearch;
    });

    return (
      <div>
        {/* PANEL DE EMPAREJAMIENTO EN VIVO (PERMIT JOIN) */}
        <div
          className="z2m-card"
          style={{
            marginBottom: '20px',
            borderColor: pairing.active ? '#10b981' : 'rgba(0, 243, 255, 0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div className="z2m-card-title">📡 Modo Emparejamiento Zigbee2MQTT (Permit Join)</div>
              <div className="z2m-card-sub" style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Abre la red Zigbee cuando quieras vincular un interruptor de pared, tira LED o sensor nuevo. O usa la lista inferior para renombrar y clasificar los {inv.length} dispositivos ya emparejados.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {pairing.active ? (
                <>
                  <span className="z2m-badge z2m-badge-on" style={{ fontSize: '13px', padding: '8px 14px' }}>
                    🟢 BUSCANDO DISPOSITIVOS NUEVOS ({pairing.remaining_seconds}s)
                  </span>
                  <button className="z2m-btn z2m-btn-danger" onClick={() => togglePermitJoin(false)}>
                    🛑 Cerrar Emparejamiento
                  </button>
                </>
              ) : (
                <button className="z2m-btn z2m-btn-emerald" onClick={() => togglePermitJoin(true)}>
                  🔔 Abrir Red Zigbee (120s) para Vincular Nuevo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RECIÉN DETECTADOS */}
        {(pairing.newly_joined || []).length > 0 && (
          <div className="z2m-card" style={{ marginBottom: '18px', borderColor: '#10b981' }}>
            <div className="z2m-card-title" style={{ color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span>✨ Recién Detectados en Red Zigbee ({pairing.newly_joined.length})</span>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 'normal' }}>Haz clic en cualquier placa para localizarla y configurarla de inmediato</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              {pairing.newly_joined.map((nj, i) => {
                const isConfigured = (appState.plates || []).some(p => p.id === nj.friendly_name || p.ieee === nj.ieee);
                return (
                  <div
                    key={nj.ieee || i}
                    className="z2m-comm-chip"
                    onClick={() => {
                      setSelectedRoom('all');
                      setDeviceSearch(nj.friendly_name);
                      setRecentlyPressedPlate(nj.friendly_name);
                      showFeedback(`🔍 Localizando ${nj.friendly_name}`);
                      const el = document.getElementById(`z2m-card-${nj.friendly_name}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    style={{
                      borderColor: isConfigured ? '#00f3ff' : '#10b981',
                      background: isConfigured ? 'rgba(0, 243, 255, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    title="Haz clic para ver y editar este dispositivo"
                  >
                    <span>
                      <strong>{nj.friendly_name}</strong> ({nj.ieee}) · [{nj.timestamp}]
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: isConfigured ? 'rgba(0,243,255,0.25)' : 'rgba(16,185,129,0.3)',
                      color: isConfigured ? '#00f3ff' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {isConfigured ? '✔ Ya en Placas' : '⚙️ Configurar'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BUSCADOR DE DISPOSITIVOS EN TAB 0 */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar placa o interruptor por nombre, friendly_name (ej. entrada, salon) o IEEE..."
              value={deviceSearch}
              onChange={e => setDeviceSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                background: '#091024',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          {deviceSearch && (
            <button
              className="z2m-btn"
              style={{ padding: '8px 14px', fontSize: '12px', background: '#334155', color: '#fff' }}
              onClick={() => setDeviceSearch('')}
            >
              ✕ Limpiar Filtro
            </button>
          )}
        </div>

        <div className="z2m-section-title">
          <span>0️⃣ INVENTARIO Y ASIGNACIÓN DE HARDWARE ZIGBEE2MQTT ({inv.length} Dispositivos)</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            Puedes pulsar un interruptor en la pared (se iluminará su tarjeta), o pulsar &quot;🔦 Identificar&quot; para que haga clic 2 veces, y asignarle su habitación y número de botones.
          </span>
        </div>

        <div className="z2m-grid-cards">
          {inv.map(dev => {
            const draft = z2mDrafts[dev.friendly_name] || {};
            const fnVal = draft.new_friendly_name ?? dev.friendly_name;
            const nameVal = draft.display_name ?? dev.name;
            const roomVal = draft.room ?? dev.room;
            const profVal = draft.device_profile ?? dev.profile;
            const isHighlighted = recentlyPressedPlate === dev.friendly_name;

            const updateDraft = (field, val) => {
              setZ2mDrafts(prev => ({
                ...prev,
                [dev.friendly_name]: {
                  ...(prev[dev.friendly_name] || {}),
                  [field]: val
                }
              }));
            };

            return (
              <div
                id={`z2m-card-${dev.friendly_name}`}
                key={dev.ieee || dev.friendly_name}
                className={`z2m-card ${isHighlighted ? 'highlight-press' : ''}`}
              >
                <div className="z2m-card-header">
                  <div>
                    <div className="z2m-card-title">
                      {dev.profile === 'cover' ? '🪟 ' : dev.profile === 'led_controller' ? '✨ ' : dev.profile === 'dimmer_seq' ? '🎛️ ' : '🔘 '}
                      {dev.name}
                    </div>
                    <div className="z2m-card-sub">
                      IEEE: <strong>{dev.ieee || 'N/A'}</strong> · Señal LQI: <strong>{dev.linkquality || '--'}</strong> · Topic: <strong>zigbee2mqtt/{dev.friendly_name}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`z2m-badge ${dev.is_configured ? 'z2m-badge-wire' : 'z2m-badge-comm'}`}>
                      {dev.is_configured ? '✔ Asignado en Sistema' : '🆕 Pendiente'}
                    </span>
                    <button
                      className="z2m-btn z2m-btn-cyan"
                      onClick={() => identifyZ2MDevice(dev.friendly_name)}
                      title="Hace sonar/parpadear el interruptor 2 veces y lo deja en OFF"
                    >
                      🔦 Identificar (2 Pulsos)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div className="z2m-form-group" style={{ marginBottom: 0 }}>
                    <label>ID Técnico en Zigbee2MQTT (friendly_name):</label>
                    <input
                      type="text"
                      value={fnVal}
                      onChange={e => updateDraft('new_friendly_name', e.target.value)}
                    />
                  </div>
                  <div className="z2m-form-group" style={{ marginBottom: 0 }}>
                    <label>Nombre Descriptivo en HABANA 10:</label>
                    <input
                      type="text"
                      value={nameVal}
                      onChange={e => updateDraft('display_name', e.target.value)}
                    />
                  </div>
                  <div className="z2m-form-group" style={{ marginBottom: 0 }}>
                    <label>Estancia / Habitación:</label>
                    <select value={roomVal} onChange={e => updateDraft('room', e.target.value)}>
                      {(appState.rooms || DEFAULT_ROOMS).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {cleanText(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="z2m-form-group" style={{ marginBottom: 0 }}>
                    <label>Tipo de Hardware / Botones Físicos:</label>
                    <select value={profVal} onChange={e => updateDraft('device_profile', e.target.value)}>
                      {PROFILE_OPTIONS.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button className="z2m-btn z2m-btn-emerald" onClick={() => saveZ2MHardwareAssign(dev)}>
                    💾 Guardar y Asignar en Zigbee2MQTT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // APARTADO 1: PLACAS, INTERRUPTORES Y LUCES REALES
  // =========================================================================
  const renderApartado1 = () => {
    const searchLow = deviceSearch.trim().toLowerCase();
    const plates = (appState.plates || []).filter(p => {
      const matchRoom = selectedRoom === 'all' || p.room === selectedRoom;
      const matchSearch = !searchLow ||
        (p.id || '').toLowerCase().includes(searchLow) ||
        (p.name || '').toLowerCase().includes(searchLow) ||
        (p.ieee || '').toLowerCase().includes(searchLow);
      return matchRoom && matchSearch;
    });
    const leds = (appState.led_controllers || []).filter(l => {
      const matchRoom = selectedRoom === 'all' || l.room === selectedRoom;
      const matchSearch = !searchLow ||
        (l.id || '').toLowerCase().includes(searchLow) ||
        (l.name || '').toLowerCase().includes(searchLow) ||
        (l.ieee || '').toLowerCase().includes(searchLow);
      return matchRoom && matchSearch;
    });

    const moesSwitch = (hubSensors || []).find(s => 
      s.id === 'sensor_pulsador_4_botones' || 
      s.category === 'button' || 
      s.type === 'wireless_button' ||
      s.ieee === '0x842712fffe2799a0' ||
      (s.name && s.name.toLowerCase().includes('moes'))
    );
    const showMoes = moesSwitch && (selectedRoom === 'all' || selectedRoom === (moesSwitch.room || 'salon')) &&
      (!searchLow || (moesSwitch.name || '').toLowerCase().includes(searchLow) || (moesSwitch.id || '').toLowerCase().includes(searchLow));

    return (
      <div>
        {/* BUSCADOR DE PLACAS EN TAB 1 */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar placa o interruptor por nombre (ej. entrada, salon) o ID técnico..."
              value={deviceSearch}
              onChange={e => setDeviceSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                background: '#091024',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          {deviceSearch && (
            <button
              className="z2m-btn"
              style={{ padding: '8px 14px', fontSize: '12px', background: '#334155', color: '#fff' }}
              onClick={() => setDeviceSearch('')}
            >
              ✕ Limpiar Filtro
            </button>
          )}
        </div>

        {showMoes && (
          <div style={{ marginBottom: '24px' }}>
            <div className="z2m-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                🎮 PULSADORES INALÁMBRICOS DE ESCENAS (MOES 4 BOTONES TS0044)
              </span>
              <span style={{ fontSize: '0.72rem', color: '#00f3ff', background: 'rgba(0, 243, 255, 0.12)', border: '1px solid rgba(0, 243, 255, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                Zigbee2MQTT · Salón
              </span>
            </div>
            <MoesButtonSwitchCard
              sensor={moesSwitch}
              automations={hubAutomations}
              API_BASE={API_BASE}
              onNavigateTab={onNavigateTab}
              onRefresh={fetchState}
            />
          </div>
        )}

        <div className="z2m-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              🔘 PLACAS DE INTERRUPTORES FÍSICOS EN PARED ({plates.length})
            </span>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
              Aquí ves de un vistazo qué botón tiene el cable físico de cada lámpara (🔌 CABLE DE LUZ REAL), cuál actúa como conmutada (🔀 CONMUTADA DE:) y cuál está libre (⚪ LIBRE).
            </div>
          </div>
          <button
            className="z2m-btn"
            style={{
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 600,
              background: hidePlates ? 'rgba(0, 243, 255, 0.15)' : '#334155',
              border: hidePlates ? '1px solid #00f3ff' : '1px solid #475569',
              color: hidePlates ? '#00f3ff' : '#cbd5e1',
              cursor: 'pointer',
              borderRadius: '8px'
            }}
            onClick={() => {
              setHidePlates(prev => {
                const next = !prev;
                localStorage.setItem('z2m_hide_plates', String(next));
                return next;
              });
            }}
          >
            {hidePlates ? `👁️ Mostrar Placas (${plates.length})` : `🙈 Ocultar Placas (${plates.length})`}
          </button>
        </div>

        {!hidePlates ? (
          <div className="z2m-grid-cards">
            {plates.map(p => {
            const isHighlighted = recentlyPressedPlate === p.id;
            const pDraft = plateDrafts[p.id] || {};
            const pName = pDraft.name ?? p.name;
            const pRoom = pDraft.room ?? p.room;

            const updatePlateDraft = (field, val) => {
              setPlateDrafts(prev => ({
                ...prev,
                [p.id]: {
                  ...(prev[p.id] || {}),
                  [field]: val
                }
              }));
            };

            return (
              <div id={`z2m-card-${p.id}`} key={p.id} className={`z2m-card ${isHighlighted ? 'highlight-press' : ''}`}>
                <div className="z2m-card-header">
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={pName}
                        onChange={e => updatePlateDraft('name', e.target.value)}
                        style={{ fontWeight: 700, flex: 1, minWidth: '180px' }}
                      />
                      <select value={pRoom} onChange={e => updatePlateDraft('room', e.target.value)}>
                        {(appState.rooms || DEFAULT_ROOMS).map(r => (
                          <option key={r.id} value={r.id}>
                            {r.icon} {cleanText(r.name)}
                          </option>
                        ))}
                      </select>
                      <button className="z2m-btn z2m-btn-cyan" onClick={() => savePlateMeta(p)}>
                        💾 Guardar Placa
                      </button>
                    </div>
                    <div className="z2m-card-sub">
                      Topic Z2M: <strong>zigbee2mqtt/{p.id}</strong> · IEEE: {p.ieee} · Señal: {p.linkquality || '--'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(p.channels || []).map(ch => {
                    const isOn = ch.state === 'ON';
                    const isPower = ch.assigned_role === 'power_source';
                    const isComm = ch.assigned_role === 'commutation';
                    const rowClass = isPower ? 'wired' : isComm ? 'commutation' : '';
                    const inlineKey = `${p.id}:${ch.channel}`;
                    const isInlineOpen = inlineAssignKey === inlineKey;

                    const rlObj = isPower
                      ? (appState.real_lights || []).find(x => x.id === ch.assigned_light_id)
                      : null;

                    return (
                      <div key={ch.channel} className={`z2m-channel-row ${rowClass}`}>
                        <div className="z2m-channel-top">
                          <div className="z2m-ch-name">
                            <span className={`z2m-badge ${isOn ? 'z2m-badge-on' : 'z2m-badge-off'}`}>
                              {isOn ? '● ON' : '○ OFF'}
                            </span>
                            <span>{formatChannelLabel(ch.channel, ch.label)}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                              [{ch.channel}]
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              className="z2m-btn z2m-btn-cyan"
                              style={{ padding: '6px 11px', fontSize: '11.5px' }}
                              onClick={() => testRawChannel(p.id, ch.channel, isOn ? 'off' : 'on')}
                            >
                              ⚡ CONMUTAR ({isOn ? 'Apagar' : 'Encender'})
                            </button>
                            <button
                              className="z2m-btn z2m-btn-amber"
                              style={{ padding: '6px 11px', fontSize: '11.5px' }}
                              onClick={() =>
                                openAssignRealLightModal(
                                  'wired_relay',
                                  p.id,
                                  ch.channel,
                                  p.room,
                                  ch.assigned_light_id || '',
                                  ch.assigned_light_name || '',
                                  true
                                )
                              }
                            >
                              💡 {isPower ? 'Editar Luz Real' : 'Declarar Luz Cableada'}
                            </button>
                            {isPower && ch.assigned_light_id && (
                              <button
                                className="z2m-btn"
                                style={{
                                  padding: '6px 11px',
                                  fontSize: '11.5px',
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid #f43f5e',
                                  color: '#fb7185'
                                }}
                                onClick={() => deleteRealLight(ch.assigned_light_id, ch.assigned_light_name)}
                              >
                                🗑️ Borrar Luz
                              </button>
                            )}
                            {isComm && ch.assigned_light_id && (
                              <button
                                className="z2m-btn"
                                style={{
                                  padding: '6px 11px',
                                  fontSize: '11.5px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  border: '1px solid #a855f7',
                                  color: '#d8b4fe'
                                }}
                                onClick={() => removeCommutation(ch.assigned_light_id, p.id, ch.channel)}
                              >
                                ✖ Quitar conmutada
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          {isPower ? (
                            <>
                              <span className="z2m-badge z2m-badge-wire">
                                🔌 CABLE DE LUZ REAL: <strong>{ch.assigned_light_name}</strong>
                              </span>
                              {rlObj && rlObj.commutation_switches && rlObj.commutation_switches.length > 0 && (
                                <div style={{ fontSize: '11.5px', color: '#d8b4fe', marginTop: '4px' }}>
                                  🔀 Conmuta con:{' '}
                                  <strong>
                                    {rlObj.commutation_switches
                                      .map(s => `${s.plate_name} (${s.channel_label})`)
                                      .join(' · ')}
                                  </strong>
                                </div>
                              )}
                            </>
                          ) : isComm ? (
                            <span className="z2m-badge z2m-badge-comm">
                              🔀 CONMUTADA DE: <strong>{ch.assigned_light_name}</strong>
                            </span>
                          ) : ch.role === 'dimmer_sequencer' ? (
                            <span className="z2m-badge z2m-badge-comm">🎛️ Secuenciador de 9 Pasos LED</span>
                          ) : (
                            <span className="z2m-badge z2m-badge-free">
                              ⚪ LIBRE (Disponible para conmutar)
                            </span>
                          )}
                        </div>

                        {/* FORMULARIO INLINE PARA DECLARAR O EDITAR LA LUZ FÍSICA REAL */}
                        {isInlineOpen && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '10px 12px',
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid #f59e0b',
                              borderRadius: '8px',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontSize: '11.5px', color: '#fbbf24', fontWeight: 700 }}>
                              🔌 Luz física conectada a [{p.id} / {ch.channel}]:
                            </span>
                            <input
                              type="text"
                              placeholder="Ej: Luz del Comedor, Luz Ventana..."
                              value={lightModal.name}
                              onChange={e => setLightModal(prev => ({ ...prev, name: e.target.value }))}
                              style={{ flex: 1, minWidth: '180px' }}
                            />
                            <select
                              value={lightModal.room}
                              onChange={e => setLightModal(prev => ({ ...prev, room: e.target.value }))}
                            >
                              {(appState.rooms || DEFAULT_ROOMS).map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.icon} {cleanText(r.name)}
                                </option>
                              ))}
                            </select>
                            <button className="z2m-btn z2m-btn-emerald" onClick={() => saveRealLight()}>
                              💾 Guardar Luz Real
                            </button>
                            <button className="z2m-btn" onClick={() => setInlineAssignKey(null)}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px dashed #334155',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              ℹ️ Las <strong>{plates.length} placas de interruptores</strong> están ocultas para mantener la pantalla despejada.
            </span>
            <button
              className="z2m-btn z2m-btn-cyan"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => {
                setHidePlates(false);
                localStorage.setItem('z2m_hide_plates', 'false');
              }}
            >
              👁️ Mostrar Placas
            </button>
          </div>
        )}

        <div className="z2m-section-title">
          <span>✨ CONTROLADORES DE TIRAS LED (SIN INTERRUPTOR DE CARGA) ({leds.length})</span>
        </div>
        <div className="z2m-grid-cards">
          {leds.map(l => {
            const isOn = l.state === 'ON';
            const linkedLight = (appState.real_lights || []).find(rl => rl.power_source?.device === l.id);
            const currentBri = ledBrightnessDrafts[l.id] ?? l.brightness_pct ?? 50;

            return (
              <div key={l.id} className="z2m-card">
                <div className="z2m-card-header">
                  <div>
                    <div className="z2m-card-title">✨ {cleanText(l.name)}</div>
                    <div className="z2m-card-sub">
                      Topic Z2M: <strong>zigbee2mqtt/{l.id}</strong> · IEEE: {l.ieee}
                    </div>
                  </div>
                  <span className={`z2m-badge ${isOn ? 'z2m-badge-on' : 'z2m-badge-off'}`}>
                    {isOn ? `ENCENDIDO (${l.brightness_pct}%)` : 'APAGADO'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Brillo:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={currentBri}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setLedBrightnessDrafts(prev => ({ ...prev, [l.id]: val }));
                      }}
                      onMouseUp={e => testRawChannel(l.id, 'state', Number(e.target.value) > 0 ? 'on' : 'off', Number(e.target.value))}
                      onTouchEnd={e => testRawChannel(l.id, 'state', Number(e.target.value) > 0 ? 'on' : 'off', Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#00f3ff' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, width: '40px' }}>{currentBri}%</span>
                  </div>
                  <button className="z2m-btn z2m-btn-cyan" onClick={() => testRawChannel(l.id, 'state', isOn ? 'off' : 'on')}>
                    {isOn ? 'Apagar LED' : '⚡ Probar LED'}
                  </button>
                  {!linkedLight ? (
                    <button
                      className="z2m-btn z2m-btn-emerald"
                      onClick={() => openAssignRealLightModal('led_controller', l.id, 'state', l.room, '', l.name, false)}
                    >
                      ➕ Registrar en Luces Reales
                    </button>
                  ) : (
                    <span className="z2m-badge z2m-badge-wire">✔ En Luces Reales: {linkedLight.name}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // APARTADO 2: CONMUTACIONES VISUALES (EN 1 CLIC)
  // =========================================================================
  const renderApartado2 = () => {
    const lights = (appState.real_lights || []).filter(
      l => selectedRoom === 'all' || l.room === selectedRoom
    );

    const renderPlateButtonsGroup = (l, platesList) =>
      platesList.map(p => (
        <div key={p.id} className="z2m-quick-plate-group">
          <div className="z2m-quick-plate-title">
            <span>
              🔘 {cleanText(p.name)} <span style={{ fontFamily: 'monospace', color: '#64748b' }}>({p.id})</span>
            </span>
            <span style={{ textTransform: 'uppercase', fontSize: '10.5px' }}>{p.room}</span>
          </div>
          <div className="z2m-quick-btn-grid">
            {(p.channels || []).map(ch => {
              const isThisPower = l.power_source?.device === p.id && l.power_source?.channel === ch.channel;
              const isThisComm = (l.commutation_switches || []).some(
                s => s.device === p.id && s.channel === ch.channel
              );
              const isOtherLight = ch.assigned_light_id && ch.assigned_light_id !== l.id;

              if (isThisPower) {
                return (
                  <button
                    key={ch.channel}
                    type="button"
                    className="z2m-q-switch-btn is-this-power"
                    title="Este botón es el que tiene el cable físico de esta luz"
                  >
                    🔌 {formatChannelLabel(ch.channel, ch.label)} (Carga Principal)
                  </button>
                );
              }
              if (isThisComm) {
                return (
                  <button
                    key={ch.channel}
                    type="button"
                    className="z2m-q-switch-btn is-this-comm"
                    onClick={() => removeCommutation(l.id, p.id, ch.channel)}
                    title="Haz clic para quitar esta conmutada"
                  >
                    ✔ 🔀 {formatChannelLabel(ch.channel, ch.label)} (Conmutada Activa · Clic para quitar)
                  </button>
                );
              }
              if (isOtherLight) {
                const roleTxt = ch.assigned_role === 'power_source' ? '🔌 Cable de' : '🔀 En';
                return (
                  <button
                    key={ch.channel}
                    type="button"
                    className="z2m-q-switch-btn is-other-light"
                    onClick={() => addCommutationDirect(l.id, p.id, ch.channel)}
                    title={`Actualmente asignado a ${ch.assigned_light_name}. Haz clic si quieres moverlo como conmutada de ${cleanText(l.name)}`}
                  >
                    ➕ {formatChannelLabel(ch.channel, ch.label)}{' '}
                    <span style={{ fontSize: '10.5px', opacity: 0.85 }}>
                      ({roleTxt}: {ch.assigned_light_name})
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={ch.channel}
                  type="button"
                  className="z2m-q-switch-btn"
                  onClick={() => addCommutationDirect(l.id, p.id, ch.channel)}
                  title={`Botón libre. Haz clic para añadirlo como conmutada de ${cleanText(l.name)}`}
                >
                  ➕ {formatChannelLabel(ch.channel, ch.label)} <span style={{ color: '#34d399', fontSize: '10.5px' }}>[LIBRE]</span>
                </button>
              );
            })}
          </div>
        </div>
      ));

    return (
      <div>
        <div className="z2m-section-title">
          <span>🔀 MATRIZ VISUAL DE LUCES REALES Y SUS INTERRUPTORES CONMUTADOS ({lights.length})</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
            Ámbar (🔌) = Fuente de Tensión Real · Violeta (✔ 🔀) = Conmutada activa de esta luz · Gris/Verde Libre = Disponible para añadir en 1 clic.
          </span>
        </div>

        <div className="z2m-grid-cards">
          {lights.map(l => {
            const isOn = l.state === 'ON';
            const isLed = l.kind === 'led_controller';
            const isListeningThis =
              appState.learn_mode &&
              appState.learn_mode.active &&
              appState.learn_mode.target_light_id === l.id;

            const roomPlates = (appState.plates || []).filter(
              p => p.room === l.room && p.id !== 'salon_dimmer'
            );
            const otherPlates = (appState.plates || []).filter(
              p => p.room !== l.room && p.id !== 'salon_dimmer'
            );

            return (
              <div key={l.id} className="z2m-card">
                <div className="z2m-card-header">
                  <div>
                    <div className="z2m-card-title">
                      {isLed ? '✨ ' : '💡 '}
                      {cleanText(l.name)}
                    </div>
                    <div className="z2m-card-sub">
                      Habitación: <strong>{(l.room || '').toUpperCase()}</strong> · ID: <strong>{l.id}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`z2m-badge ${isOn ? 'z2m-badge-on' : 'z2m-badge-off'}`}>
                      {isOn ? '● ENCENDIDA' : '○ APAGADA'}
                    </span>
                    <button
                      className={`z2m-btn ${isOn ? 'z2m-btn-amber' : 'z2m-btn-emerald'}`}
                      onClick={() => controlRealLight(l.id, isOn ? 'off' : 'on')}
                    >
                      {isOn ? 'Apagar Grupo' : '⚡ Encender Grupo'}
                    </button>
                    <button
                      className="z2m-btn z2m-btn-danger"
                      style={{ padding: '7px 10px' }}
                      title="Eliminar esta Luz"
                      onClick={() => deleteRealLight(l.id, l.name)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* CAJA FUENTE DE TENSIÓN REAL */}
                <div className="z2m-channel-row wired">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: '#fde68a', fontWeight: 800 }}>
                      🔌 1. FUENTE DE TENSIÓN PRINCIPAL (CARGA REAL CON CABLE / CONTROLADOR):
                    </span>
                    <span className="z2m-badge z2m-badge-wire">
                      {isLed ? 'Controlador Tira LED' : 'Relé con Cable Físico'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#fff' }}>
                    <strong>{l.power_source?.device_name}</strong> ➔{' '}
                    <strong style={{ color: '#fbbf24' }}>{l.power_source?.channel_label}</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#94a3b8', marginLeft: '6px' }}>
                      ({l.power_source?.device} / {l.power_source?.channel})
                    </span>
                  </div>
                  {isLed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Intensidad LED:</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        defaultValue={l.brightness_pct || 50}
                        onMouseUp={e => controlRealLight(l.id, 'on', Number(e.target.value))}
                        onTouchEnd={e => controlRealLight(l.id, 'on', Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#00f3ff' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{l.brightness_pct || 0}%</span>
                    </div>
                  )}
                </div>

                {/* CAJAS VIOLETAS NUMERADAS DE CONMUTADAS */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#d8b4fe' }}>
                      🔀 2. INTERRUPTORES CONMUTADOS VINCULADOS A ESTA LUZ ({(l.commutation_switches || []).length}):
                    </span>
                    <button
                      className={`z2m-btn ${isListeningThis ? 'z2m-btn-danger' : 'z2m-btn-amber'}`}
                      style={{ padding: '5px 11px', fontSize: '11.5px' }}
                      onClick={() => (isListeningThis ? stopLearnMode() : startLearnMode(l.id, 'commutation'))}
                    >
                      {isListeningThis ? '🛑 Detener Escucha' : '📡 Modo Escucha (Pulsar en la pared)'}
                    </button>
                  </div>

                  <div className="z2m-comm-chip-list">
                    {(l.commutation_switches || []).length > 0 ? (
                      l.commutation_switches.map((sw, idx) => (
                        <div key={`${sw.device}_${sw.channel}`} className="z2m-comm-chip">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="z2m-badge z2m-badge-comm">CONMUTADA #{idx + 1}</span>
                            <strong style={{ color: '#fff', fontSize: '13px' }}>{sw.plate_name}</strong>
                            <span style={{ color: '#e9d5ff', fontWeight: 700 }}>➔ {sw.channel_label}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                              [{sw.device} / {sw.channel}]
                            </span>
                            <span className={`z2m-badge ${sw.state === 'ON' ? 'z2m-badge-on' : 'z2m-badge-off'}`}>
                              {sw.state}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="z2m-btn z2m-btn-cyan"
                              style={{ padding: '4px 9px', fontSize: '11px' }}
                              onClick={() => testRawChannel(sw.device, sw.channel, sw.state === 'ON' ? 'off' : 'on')}
                            >
                              ⚡ Probar
                            </button>
                            <button
                              className="z2m-btn z2m-btn-danger"
                              style={{ padding: '4px 9px', fontSize: '11px' }}
                              onClick={() => removeCommutation(l.id, sw.device, sw.channel)}
                            >
                              ✖ Quitar
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px'
                        }}
                      >
                        Aún no hay conmutadas secundarias añadidas. Haz clic en cualquiera de los botones de abajo para añadirlas y verlas marcadas al instante.
                      </div>
                    )}
                  </div>
                </div>

                {/* MATRIZ RÁPIDA DE 1 CLIC */}
                <div className="z2m-quick-plate-picker">
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#00f3ff',
                      marginBottom: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>👆 TOCA CUALQUIER BOTÓN DE ESTAS PLACAS PARA AÑADIRLO O QUITARLO COMO CONMUTADA:</span>
                  </div>
                  {renderPlateButtonsGroup(l, roomPlates)}
                  {otherPlates.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '11.5px', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>
                        + Ver interruptores de otras habitaciones ({otherPlates.length} placas)...
                      </summary>
                      <div style={{ marginTop: '8px' }}>{renderPlateButtonsGroup(l, otherPlates)}</div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =========================================================================
  // =========================================================================
  // APARTADO 3: SENSORES ZIGBEE & VINCULACIÓN A LUCES REALES
  // =========================================================================
  const renderApartado3 = () => {
    const searchLow = deviceSearch.trim().toLowerCase();
    const visibleSensors = hubSensors.filter(s => {
      const matchRoom = selectedRoom === 'all' || s.room === selectedRoom;
      const matchSearch = !searchLow ||
        (s.name || '').toLowerCase().includes(searchLow) ||
        (s.friendly_name || '').toLowerCase().includes(searchLow) ||
        (s.id || '').toLowerCase().includes(searchLow);
      return matchRoom && matchSearch;
    });

    const getSensorBadgeIcon = (s) => {
      if (s.category === 'climate' || s.type === 'climate' || s.type === 'temp_humidity') return '🌡️';
      if (s.category === 'button' || s.type === 'wireless_button') return '🔘';
      if (s.category === 'plant' || s.type === 'soil_sensor' || (s.attributes && s.attributes.soil_moisture !== undefined)) return '🪴';
      if (s.protocol === 'vision_ai' || s.category === 'vision_ai') return '👁️';
      if (s.category === 'contact' || s.type === 'door_window') return '🚪';
      if (s.category === 'presence' || s.type === 'pir' || s.type === 'mmwave_radar') return '🚶';
      if (s.category === 'water' || s.type === 'water_leak') return '💧';
      if (s.category === 'smoke_gas' || s.type === 'smoke_detector') return '🔥';
      if (s.category === 'air' || s.type === 'air_quality') return '🌱';
      return '📡';
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner explicativo del Apartado 3 */}
        <div className="z2m-card" style={{ borderColor: '#00f3ff', background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.85))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="z2m-card-title" style={{ color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📡 3️⃣ Sensores: Estados, Telemetría y Nombres en Tiempo Real</span>
              </div>
              <div className="z2m-card-sub" style={{ fontSize: '13px', marginTop: '4px' }}>
                Monitor en vivo de aperturas, calidad ambiental y presencia. Puedes <strong>renombrar cada sensor</strong> directamente aquí; las reglas de encendido y acciones complejas se gestionan en el panel dedicado de Automatizaciones.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 243, 255, 0.3)', borderRadius: '8px', padding: '4px 10px' }}>
                <span style={{ fontSize: '12px', color: '#00f3ff', fontWeight: 800 }}>⏱️ Watchdog Batería:</span>
                <select
                  value={watchdogSettings.timeout_hours || 2.0}
                  onChange={e => handleChangeWatchdogTimeout(parseFloat(e.target.value))}
                  style={{ background: '#090f1f', border: '1px solid #00f3ff', color: '#38bdf8', borderRadius: '4px', padding: '3px 6px', fontSize: '11.5px', fontWeight: 700 }}
                  title="Frecuencia límite de comprobación: si un sensor no reporta en este tiempo, se marca como offline/batería agotada"
                >
                  <option value={1.0}>Cada 1 hora</option>
                  <option value={2.0}>Cada 2 horas</option>
                  <option value={3.0}>Cada 3 horas</option>
                  <option value={4.0}>Cada 4 horas</option>
                  <option value={6.0}>Cada 6 horas</option>
                </select>
                <button
                  type="button"
                  onClick={handleTriggerBatteryCheck}
                  disabled={checkingBatteries}
                  style={{ background: 'rgba(0, 243, 255, 0.15)', border: '1px solid #00f3ff', color: '#00f3ff', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                  title="Envía una solicitud MQTT /get para forzar reporte de batería a todos los sensores"
                >
                  {checkingBatteries ? '🔄 ...' : '🔄 Chequear Ahora'}
                </button>
              </div>

              <span className="z2m-badge z2m-badge-on" style={{ fontSize: '12px', padding: '6px 12px' }}>
                🟢 {visibleSensors.length} Sensores Físicos Instalados
              </span>
              {onNavigateTab && (
                <button
                  type="button"
                  className="z2m-btn z2m-btn-amber"
                  style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => onNavigateTab('automations_sensors')}
                >
                  <span>⚙️ Ir a Automatizaciones</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {visibleSensors.length === 0 ? (
          <div className="z2m-card" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>
              No se han encontrado sensores {selectedRoom !== 'all' ? `en ${selectedRoom}` : 'registrados'}. Abre el modo emparejamiento en el Apartado 0️⃣ para vincular uno nuevo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
            {visibleSensors.map(sensor => {
              const attrs = sensor.attributes || {};
              const isButton = sensor.category === 'button' || sensor.type === 'wireless_button' || sensor.id.includes('pulsador') || (sensor.name || '').toLowerCase().includes('moes');
              const isPlant = (sensor.category === 'plant' || sensor.type === 'soil_sensor' || attrs.soil_moisture !== undefined) && !isButton;
              const isClimate = (sensor.category === 'climate' || sensor.type === 'climate' || sensor.type === 'temp_humidity' || (attrs.temperature !== undefined && attrs.humidity !== undefined && !isPlant)) && !isButton;
              const isContact = (sensor.category === 'contact' || sensor.type === 'door_window') && !isPlant && !isClimate && !isButton;
              const isAir = (sensor.category === 'air' || sensor.type === 'air_quality' || attrs.co2 !== undefined || attrs.pm25 !== undefined) && !isPlant && !isClimate && !isButton;
              const isPresence = (sensor.category === 'presence' || sensor.type === 'pir' || sensor.type === 'mmwave_radar') && !isButton;
              const isVision = (sensor.protocol === 'vision_ai' || sensor.category === 'vision_ai') && !isButton;
              const isWater = (sensor.category === 'water' || sensor.type === 'water_leak') && !isButton;

              const currentName = sensorNameDrafts[sensor.id] !== undefined ? sensorNameDrafts[sensor.id] : (sensor.name || sensor.friendly_name || sensor.id);
              const isNameModified = sensorNameDrafts[sensor.id] !== undefined && sensorNameDrafts[sensor.id].trim() !== (sensor.name || sensor.friendly_name || sensor.id);
              const currentRoom = sensorRoomDrafts[sensor.id] !== undefined ? sensorRoomDrafts[sensor.id] : (sensor.room || 'general');

              const isDoorOpen = sensor.state === 'open' || sensor.state === 'ON';
              const batteryLevel = sensor.battery ?? attrs.battery;
              const lqiValue = sensor.lqi ?? attrs.linkquality;

              return (
                <div
                  key={sensor.id}
                  className="z2m-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: isDoorOpen && isContact ? '#ef4444' : 'rgba(0, 243, 255, 0.25)',
                    background: isDoorOpen && isContact
                      ? 'linear-gradient(135deg, rgba(30, 10, 10, 0.95), rgba(15, 23, 42, 0.85))'
                      : 'rgba(2, 6, 23, 0.85)',
                    boxShadow: isDoorOpen && isContact ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
                  }}
                >
                  <div>
                    {/* CABECERA CON NOMBRE EDITABLE Y PROTOCOLO */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: isDoorOpen && isContact ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 243, 255, 0.12)',
                          border: isDoorOpen && isContact ? '1.5px solid #ef4444' : '1.5px solid #00f3ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.35rem',
                          flexShrink: 0
                        }}>
                          {getSensorBadgeIcon(sensor)}
                        </div>

                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={currentName}
                              onChange={e => setSensorNameDrafts(prev => ({ ...prev, [sensor.id]: e.target.value }))}
                              placeholder="Nombre del sensor..."
                              style={{
                                fontWeight: 800,
                                fontSize: '0.96rem',
                                color: '#f8fafc',
                                background: isNameModified ? 'rgba(0, 243, 255, 0.12)' : 'rgba(15, 23, 42, 0.7)',
                                border: isNameModified ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '100%',
                                outline: 'none'
                              }}
                            />
                            {isNameModified && (
                              <button
                                type="button"
                                className="z2m-btn z2m-btn-emerald"
                                style={{ padding: '5px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                                disabled={savingSensorId === sensor.id}
                                onClick={() => saveSensorMetadata(sensor.id)}
                              >
                                {savingSensorId === sensor.id ? '💾 ...' : '💾 Guardar'}
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <select
                              value={currentRoom}
                              onChange={e => {
                                const val = e.target.value;
                                setSensorRoomDrafts(prev => ({ ...prev, [sensor.id]: val }));
                                fetch(`${API_BASE}/api/sensors/${sensor.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ room: val })
                                }).then(r => {
                                  if (r.ok) {
                                    showFeedback(`✔ Estancia actualizada a ${val}`);
                                    setHubSensors(prev => prev.map(item => item.id === sensor.id ? { ...item, room: val } : item));
                                    if (onDevicesUpdated) onDevicesUpdated();
                                  }
                                });
                              }}
                              style={{
                                background: '#090f1f',
                                border: '1px solid #334155',
                                color: '#38bdf8',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.72rem'
                              }}
                            >
                              {(appState.rooms || DEFAULT_ROOMS).map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.icon} {cleanText(r.name)}
                                </option>
                              ))}
                            </select>
                            {sensor.ieee && (
                              <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#64748b' }}>
                                [{sensor.ieee}]
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BADGES SUPERIORES DERECHOS */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span className="z2m-badge z2m-badge-on" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                          🟢 {isVision ? 'Visión IA' : 'Zigbee2MQTT'}
                        </span>
                        {sensor.is_online === false ? (
                          <span style={{
                            fontSize: '10.5px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            border: '1px solid #ef4444',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }} title={`Sin señal de radio desde hace ${sensor.offline_hours}h. Posible batería agotada.`}>
                            ⚠️ SIN PILA ({sensor.offline_hours}h)
                          </span>
                        ) : batteryLevel !== undefined && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: batteryLevel > 40 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: batteryLevel > 40 ? '#34d399' : '#f87171',
                            border: `1px solid ${batteryLevel > 40 ? '#10b981' : '#ef4444'}`
                          }}>
                            🔋 {batteryLevel}%
                          </span>
                        )}
                        {lqiValue !== undefined && (
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            📶 LQI: {lqiValue}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BLOQUE DE TELEMETRÍA Y ESTADOS EN TIEMPO REAL */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                        TELEMETRÍA EN TIEMPO REAL
                      </div>

                      {isClimate && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {/* TEMPERATURA INTERIOR */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: (attrs.temperature ?? 22) > 28 ? '1px solid #ef4444' : ((attrs.temperature ?? 22) < 18 ? '1px solid #38bdf8' : '1px solid rgba(251, 191, 36, 0.4)'),
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                                🌡️ Temperatura Interior
                              </div>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                                {attrs.temperature ?? 22} °C
                              </div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '4px', color: (attrs.temperature ?? 22) < 18 ? '#38bdf8' : ((attrs.temperature ?? 22) > 28 ? '#f87171' : '#34d399') }}>
                                {(attrs.temperature ?? 22) < 18 ? '❄️ Fresco (<18°C)' : ((attrs.temperature ?? 22) > 28 ? '🔥 Caluroso (>28°C)' : '✨ Confort Óptimo')}
                              </div>
                            </div>

                            {/* HUMEDAD RELATIVA */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(0, 243, 255, 0.4)',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                                💧 Humedad Ambiente
                              </div>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#00f3ff', marginTop: '4px' }}>
                                {attrs.humidity ?? 55} %
                              </div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '4px', color: (attrs.humidity ?? 55) < 40 ? '#f59e0b' : ((attrs.humidity ?? 55) > 65 ? '#38bdf8' : '#34d399') }}>
                                {(attrs.humidity ?? 55) < 40 ? 'Seco (<40%)' : ((attrs.humidity ?? 55) > 65 ? 'Húmedo (>65%)' : '🌿 Confort (40-60%)')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPlant && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {/* HUMEDAD DEL SUELO */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: (attrs.soil_moisture ?? 0) < 15 ? '1px solid #ef4444' : '1px solid rgba(16, 185, 129, 0.4)',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                                💧 Humedad del Suelo
                              </div>
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 900,
                                color: (attrs.soil_moisture ?? 0) < 15 ? '#ef4444' : '#34d399',
                                marginTop: '4px'
                              }}>
                                {attrs.soil_moisture ?? 0} %
                              </div>
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                marginTop: '4px',
                                color: (attrs.soil_moisture ?? 0) < 15 ? '#f87171' : ((attrs.soil_moisture ?? 0) > 65 ? '#38bdf8' : '#34d399')
                              }}>
                                {(attrs.soil_moisture ?? 0) < 15
                                  ? '🥀 TIERRA SECA (Necesita Riego)'
                                  : ((attrs.soil_moisture ?? 0) > 65 ? '💧 SUELO MUY HÚMEDO' : '🌿 HUMEDAD ÓPTIMA')}
                              </div>
                            </div>

                            {/* TEMPERATURA RAÍZ */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                                🌡️ Temperatura del Sustrato
                              </div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                                {attrs.temperature ?? 22} °C
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                Temperatura Raíz
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isContact && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isDoorOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${isDoorOpen ? '#ef4444' : '#10b981'}`
                        }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: isDoorOpen ? '#ef4444' : '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{isDoorOpen ? '🚪⚡' : '🔒'}</span>
                            <span>{isDoorOpen ? 'PUERTA / CONTACTO ABIERTO' : 'CERRADA Y SEGURA'}</span>
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                            Estado: <strong>{sensor.state}</strong>
                          </span>
                        </div>
                      )}

                      {isAir && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>Dióxido CO₂</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (attrs.co2 || 400) > 1000 ? '#f59e0b' : '#34d399', marginTop: '2px' }}>
                              {attrs.co2 ?? attrs.co2_ppm ?? '--'} <span style={{ fontSize: '0.7rem' }}>ppm</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>Partículas PM2.5</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                              {attrs.pm25 ?? attrs.pm25_ug_m3 ?? '--'} <span style={{ fontSize: '0.7rem' }}>µg/m³</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>Temperatura</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                              {attrs.temperature ?? attrs.temperature_c ?? '--'} <span style={{ fontSize: '0.7rem' }}>°C</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>Humedad</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#60a5fa', marginTop: '2px' }}>
                              {attrs.humidity ?? '--'} <span style={{ fontSize: '0.7rem' }}>%</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>Formaldehído (CH2O)</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#a78bfa', marginTop: '2px' }}>
                              {attrs.formaldehyd ?? attrs.ch2o ?? '--'} <span style={{ fontSize: '0.7rem' }}>mg/m³</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase' }}>VOC Total</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                              {attrs.voc ?? '--'} <span style={{ fontSize: '0.7rem' }}>ppm</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPresence && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: sensor.state === 'on' ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${sensor.state === 'on' ? '#00f3ff' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: sensor.state === 'on' ? '#00f3ff' : '#94a3b8' }}>
                            {sensor.state === 'on' ? '🚶‍♂️ PRESENCIA DETECTADA' : '⚪ DESPEJADO'}
                          </span>
                        </div>
                      )}

                      {isVision && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: sensor.state === 'on' ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${sensor.state === 'on' ? '#00f3ff' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 900, color: sensor.state === 'on' ? '#00f3ff' : '#94a3b8' }}>
                            {sensor.state === 'on' ? '👁️ PRESENCIA HUMANA ACTIVA (YOLOv8)' : '🛡️ VIGILANDO (DESPEJADO)'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            Cámara IP Local
                          </span>
                        </div>
                      )}

                      {isWater && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: sensor.state === 'leak' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${sensor.state === 'leak' ? '#ef4444' : '#10b981'}`
                        }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: sensor.state === 'leak' ? '#ef4444' : '#34d399' }}>
                            {sensor.state === 'leak' ? '💧 ¡FUGA DE AGUA DETECTADA!' : '🛡️ SECO (NORMAL)'}
                          </span>
                        </div>
                      )}

                      {isButton && (
                        <div style={{ marginTop: '4px' }}>
                          <MoesButtonSwitchCard
                            sensor={sensor}
                            automations={hubAutomations}
                            API_BASE={API_BASE}
                            onNavigateTab={onNavigateTab}
                            onRefresh={fetchState}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PIE DE TARJETA CON ÚLTIMA ACTUALIZACIÓN Y BOTÓN A AUTOMATIZACIONES */}
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      ⏱️ {sensor.last_updated ? `Lectura: ${sensor.last_updated}` : 'En vivo MQTT'}
                    </span>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="z2m-btn"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.76rem',
                          background: 'rgba(0, 243, 255, 0.12)',
                          border: '1px solid #00f3ff',
                          color: '#00f3ff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 700
                        }}
                        onClick={() => openSensorConfigModal(sensor)}
                        title="Asignar y modificar categoría, valores de humedad, temperatura y estancia"
                      >
                        <span>⚙️ Asignar Categoría y Valores</span>
                      </button>

                      {onNavigateTab && (
                      <button
                        type="button"
                        className="z2m-btn"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.76rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        onClick={() => onNavigateTab('automations_sensors')}
                        title="Ir a Automatizaciones para crear reglas con este sensor"
                      >
                        <span>⚙️ Automatizar</span>
                        <span style={{ fontSize: '0.7rem' }}>➔</span>
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL PARA ASIGNAR CATEGORÍA Y VALORES A SENSORES */}
        {editingSensorModal && (
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
              border: '1px solid rgba(0, 243, 255, 0.4)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              color: '#f8fafc',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(0, 243, 255, 0.15)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.6rem' }}>⚙️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#00f3ff' }}>
                      Asignar Categoría y Valores
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      ID: {editingSensorModal.id} {editingSensorModal.ieee ? `· [${editingSensorModal.ieee}]` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSensorModal(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Nombre */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                    NOMBRE DEL SENSOR
                  </label>
                  <input
                    type="text"
                    value={modalDraft.name || ''}
                    onChange={e => setModalDraft(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(0, 243, 255, 0.3)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Categoría y Estancia */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#00f3ff', fontWeight: 700, marginBottom: '6px' }}>
                      🏷️ CATEGORÍA / TIPO
                    </label>
                    <select
                      value={modalDraft.category || 'climate'}
                      onChange={e => {
                        const cat = e.target.value;
                        let sType = 'generic';
                        let defState = 'off';
                        if (cat === 'climate') { sType = 'temp_humidity'; defState = 'optimal'; }
                        else if (cat === 'plant') { sType = 'soil_sensor'; defState = 'dry'; }
                        else if (cat === 'contact') { sType = 'door_window'; defState = 'closed'; }
                        else if (cat === 'presence') { sType = 'mmwave_radar'; defState = 'off'; }
                        else if (cat === 'water') { sType = 'water_leak'; defState = 'dry'; }
                        else if (cat === 'air') { sType = 'air_quality'; defState = 'good'; }
                        else if (cat === 'button') { sType = 'wireless_button'; defState = 'idle'; }
                        else if (cat === 'light_lux') { sType = 'illuminance'; defState = 'daylight'; }
                        else if (cat === 'smoke_gas') { sType = 'smoke_detector'; defState = 'clear'; }
                        else if (cat === 'power') { sType = 'power_meter'; defState = 'normal'; }

                        setModalDraft(prev => ({
                          ...prev,
                          category: cat,
                          type: sType,
                          state: defState
                        }));
                      }}
                      style={{ width: '100%', background: '#090f1f', border: '1.5px solid #00f3ff', borderRadius: '8px', padding: '9px 10px', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      <option value="climate">🌡️ Termohigrómetro Interior Sonoff (Temp & Humedad)</option>
                      <option value="plant">🪴 Sensor de Planta / Maceta (Suelo & Temp)</option>
                      <option value="contact">🚪 Puerta / Ventana (Contacto Magnético)</option>
                      <option value="presence">🚶 Presencia / Movimiento (Radar / PIR)</option>
                      <option value="air">🌿 Clima & Calidad de Aire (CO2, PM2.5, Temp)</option>
                      <option value="water">💧 Fuga de Agua / Inundación</option>
                      <option value="light_lux">☀️ Luxómetro / Luminosidad Solar</option>
                      <option value="smoke_gas">🔥 Detector de Humo & Gas</option>
                      <option value="power">⚡ Medidor de Potencia / Tensión 230V</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                      📍 ESTANCIA / UBICACIÓN
                    </label>
                    <select
                      value={modalDraft.room || 'terraza'}
                      onChange={e => setModalDraft(prev => ({ ...prev, room: e.target.value }))}
                      style={{ width: '100%', background: '#090f1f', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '9px 10px', color: '#38bdf8', fontSize: '0.85rem' }}
                    >
                      {(appState.rooms || DEFAULT_ROOMS).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {cleanText(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* VALORES Y TELEMETRÍA ESPECÍFICA SEGÚN CATEGORÍA */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0, 243, 255, 0.25)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#00f3ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> Asignación de Valores y Calibración
                  </div>

                  {modalDraft.category === 'climate' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>🌡️ Temperatura Ambiente:</span>
                            <span style={{ color: '#fff', fontWeight: 900 }}>{modalDraft.temperature ?? 22} °C</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="45"
                            step="0.5"
                            value={modalDraft.temperature ?? 22}
                            onChange={e => setModalDraft(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                            style={{ width: '100%', accentColor: '#fbbf24' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                            <span style={{ color: '#00f3ff', fontWeight: 700 }}>💧 Humedad Relativa:</span>
                            <span style={{ color: '#fff', fontWeight: 900 }}>{modalDraft.humidity ?? 55} %</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="99"
                            step="1"
                            value={modalDraft.humidity ?? 55}
                            onChange={e => setModalDraft(prev => ({ ...prev, humidity: parseInt(e.target.value) }))}
                            style={{ width: '100%', accentColor: '#00f3ff' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ajustes rápidos:</span>
                        {[
                          { t: 19.5, h: 50, label: '❄️ Fresco (19.5°C)' },
                          { t: 22.0, h: 55, label: '✨ Confort (22°C)' },
                          { t: 24.5, h: 50, label: '☀️ Cálido (24.5°C)' },
                          { t: 27.0, h: 45, label: '🔥 Verano (27°C)' },
                        ].map(pre => (
                          <button
                            key={pre.label}
                            type="button"
                            onClick={() => setModalDraft(prev => ({ ...prev, temperature: pre.t, humidity: pre.h }))}
                            style={{
                              background: 'rgba(251, 191, 36, 0.15)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              color: '#fbbf24',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {pre.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {modalDraft.category === 'plant' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>💧 Humedad del Suelo:</span>
                          <strong style={{ color: (modalDraft.soil_moisture || 0) < 15 ? '#ef4444' : '#34d399', fontSize: '0.9rem' }}>
                            {modalDraft.soil_moisture ?? 0}%
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={modalDraft.soil_moisture ?? 0}
                          onChange={e => setModalDraft(prev => ({ ...prev, soil_moisture: parseInt(e.target.value) || 0 }))}
                          style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b', marginTop: '2px' }}>
                          <span>0% (Muy Seco)</span>
                          <span>15-65% (Óptimo)</span>
                          <span>100% (Saturado)</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                            🌡️ Temperatura del Sustrato (°C)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={modalDraft.temperature ?? 22}
                            onChange={e => setModalDraft(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', padding: '6px 10px', color: '#fbbf24', fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                            Diagnóstico de Estado
                          </label>
                          <div style={{
                            padding: '7px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textAlign: 'center',
                            background: (modalDraft.soil_moisture || 0) < 15 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: (modalDraft.soil_moisture || 0) < 15 ? '#f87171' : '#34d399',
                            border: `1px solid ${(modalDraft.soil_moisture || 0) < 15 ? '#ef4444' : '#10b981'}`
                          }}>
                            {(modalDraft.soil_moisture || 0) < 15 ? '🥀 TIERRA SECA' : ((modalDraft.soil_moisture || 0) > 65 ? '💧 MUY HÚMEDA' : '🌿 ÓPTIMA')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalDraft.category === 'contact' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>
                        ESTADO ACTUAL DEL CONTACTO
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'closed', value: 'Cerrada' }))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: modalDraft.state === 'closed' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                            background: modalDraft.state === 'closed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: modalDraft.state === 'closed' ? '#34d399' : '#94a3b8',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🔒 Cerrada y Segura
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'open', value: 'Abierta' }))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: modalDraft.state === 'open' ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                            background: modalDraft.state === 'open' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: modalDraft.state === 'open' ? '#f87171' : '#94a3b8',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🚪⚡ Abierta
                        </button>
                      </div>
                    </div>
                  )}

                  {modalDraft.category === 'presence' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>
                        ESTADO DE PRESENCIA
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'off', value: 'Despejado' }))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: modalDraft.state === 'off' ? '1.5px solid #94a3b8' : '1px solid rgba(255,255,255,0.1)',
                            background: modalDraft.state === 'off' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                            color: modalDraft.state === 'off' ? '#fff' : '#94a3b8',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ⚪ Despejado
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'on', value: 'Presencia Detectada' }))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: modalDraft.state === 'on' ? '1.5px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',
                            background: modalDraft.state === 'on' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: modalDraft.state === 'on' ? '#00f3ff' : '#94a3b8',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🚶 Presencia Activa
                        </button>
                      </div>
                    </div>
                  )}

                  {modalDraft.category === 'air' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>CO₂ (ppm)</label>
                        <input
                          type="number"
                          value={modalDraft.co2 ?? 400}
                          onChange={e => setModalDraft(prev => ({ ...prev, co2: parseInt(e.target.value) || 400 }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>PM2.5 (µg/m³)</label>
                        <input
                          type="number"
                          value={modalDraft.pm25 ?? 5}
                          onChange={e => setModalDraft(prev => ({ ...prev, pm25: parseInt(e.target.value) || 5 }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>Temp (°C)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={modalDraft.temperature ?? 22}
                          onChange={e => setModalDraft(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 22 }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px', color: '#fff' }}
                        />
                      </div>
                    </div>
                  )}

                  {modalDraft.category === 'water' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>ESTADO DE FUGA</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'dry', value: 'Seco (Sin Fuga)' }))}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: modalDraft.state === 'dry' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)', background: modalDraft.state === 'dry' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: modalDraft.state === 'dry' ? '#34d399' : '#94a3b8', cursor: 'pointer', fontWeight: 800 }}
                        >
                          🛡️ Seco (Normal)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalDraft(prev => ({ ...prev, state: 'leak', value: '¡FUGA DETECTADA!' }))}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: modalDraft.state === 'leak' ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.1)', background: modalDraft.state === 'leak' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', color: modalDraft.state === 'leak' ? '#f87171' : '#94a3b8', cursor: 'pointer', fontWeight: 800 }}
                        >
                          💧 ¡Fuga Detectada!
                        </button>
                      </div>
                    </div>
                  )}

                  {['light_lux', 'smoke_gas', 'power'].includes(modalDraft.category) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>Lectura / Valor Visual</label>
                        <input
                          type="text"
                          value={modalDraft.value || ''}
                          onChange={e => setModalDraft(prev => ({ ...prev, value: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>Estado Técnico (state)</label>
                        <input
                          type="text"
                          value={modalDraft.state || ''}
                          onChange={e => setModalDraft(prev => ({ ...prev, state: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px', color: '#fff' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Batería */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc' }}>Nivel de Batería</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Porcentaje de carga reportado</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={modalDraft.battery ?? 100}
                      onChange={e => setModalDraft(prev => ({ ...prev, battery: parseInt(e.target.value) || 100 }))}
                      style={{ width: '60px', background: '#090f1f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', color: '#34d399', fontWeight: 800, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>%</span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setEditingSensorModal(null)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '8px', padding: '9px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSensorModal}
                    disabled={savingModal}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #00f3ff)',
                      border: 'none',
                      color: '#020617',
                      borderRadius: '8px',
                      padding: '9px 20px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: savingModal ? 'not-allowed' : 'pointer',
                      boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)'
                    }}
                  >
                    {savingModal ? '💾 Guardando...' : '💾 Guardar Configuración'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // APARTADO 4: SECUENCIADOR DIMMER Y TIRAS LED (9 PASOS)
  // =========================================================================
  const renderApartado4 = () => {
    const seq = appState.dimmer_sequences?.salon_dimmer || null;
    if (!seq) {
      return <div className="z2m-card">No hay secuencia de dimmer configurada.</div>;
    }

    const stepsList = dimmerDrafts || seq.steps || [];

    const handleStepTargetChange = (idx, key, val) => {
      const clamped = Math.max(0, Math.min(100, Number(val) || 0));
      setDimmerDrafts(prev => {
        const base = prev || seq.steps || [];
        return base.map((st, i) =>
          i === idx
            ? {
                ...st,
                targets: {
                  ...(st.targets || {}),
                  [key]: clamped
                }
              }
            : st
        );
      });
    };

    return (
      <div className="z2m-card" style={{ maxWidth: '1100px' }}>
        <div className="z2m-card-header">
          <div>
            <div className="z2m-card-title">🎛️ {seq.name} (Dispositivo Z2M: salon_dimmer)</div>
            <div className="z2m-card-sub">
              Al encender en el botón central restaura el último paso guardado (Paso actual:{' '}
              <strong>{seq.current_step}</strong> · Guardado: <strong>{seq.saved_step}</strong>).
            </div>
          </div>
          <button className="z2m-btn z2m-btn-emerald" onClick={saveDimmerSequence}>
            💾 Guardar Secuencia
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stepsList.map((st, idx) => {
            const isCurrent = Number(seq.current_step) === Number(st.step);
            const t = st.targets || {};
            const apVal = t.salon_led_aparador ?? 0;
            const soVal = t.salon_led_sofa ?? 0;
            const tvVal = t.salon_led_tv ?? 0;

            return (
              <div
                key={st.step}
                className={`z2m-channel-row ${isCurrent ? 'wired' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(190px, 1.1fr) repeat(3, minmax(160px, 1fr)) auto',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div>
                  <strong style={{ color: isCurrent ? '#00f3ff' : '#fff', fontSize: '14px' }}>
                    Paso {st.step} {isCurrent && '● ACTIVO'}
                  </strong>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{st.label}</div>
                </div>

                {/* SLIDER APARADOR */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Aparador</span>
                    <strong style={{ color: '#00f3ff' }}>{apVal}%</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={apVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_aparador', e.target.value)}
                      style={{ flex: 1, accentColor: '#00f3ff' }}
                    />
                    <input
                      type="text"
                      value={apVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_aparador', e.target.value)}
                      style={{ width: '48px', textAlign: 'center', padding: '4px 6px' }}
                    />
                  </div>
                </div>

                {/* SLIDER SOFÁ */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Sofá</span>
                    <strong style={{ color: '#34d399' }}>{soVal}%</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_sofa', e.target.value)}
                      style={{ flex: 1, accentColor: '#10b981' }}
                    />
                    <input
                      type="text"
                      value={soVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_sofa', e.target.value)}
                      style={{ width: '48px', textAlign: 'center', padding: '4px 6px' }}
                    />
                  </div>
                </div>

                {/* SLIDER MUEBLE TV */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>Mueble TV</span>
                    <strong style={{ color: '#fbbf24' }}>{tvVal}%</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tvVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_tv', e.target.value)}
                      style={{ flex: 1, accentColor: '#f59e0b' }}
                    />
                    <input
                      type="text"
                      value={tvVal}
                      onChange={e => handleStepTargetChange(idx, 'salon_led_tv', e.target.value)}
                      style={{ width: '48px', textAlign: 'center', padding: '4px 6px' }}
                    />
                  </div>
                </div>

                <div>
                  <button className="z2m-btn z2m-btn-cyan" onClick={() => triggerDimmerStep(st.step)}>
                    ▶️ Probar Paso {st.step}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="z2m-hub-wrapper">
      <style>{`
        .z2m-hub-wrapper {
          color: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          padding-bottom: 36px;
        }
        .z2m-top-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(9, 16, 36, 0.95);
          border: 1px solid rgba(0, 243, 255, 0.32);
          border-radius: 16px;
          padding: 18px 24px;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.65);
          margin-bottom: 16px;
        }
        .z2m-brand-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .z2m-brand-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(0, 243, 255, 0.12);
          border: 1px solid rgba(0, 243, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 0 18px rgba(0, 243, 255, 0.25);
        }
        .z2m-brand-title h1 {
          font-size: 18.5px;
          font-weight: 800;
          letter-spacing: 0.4px;
          color: #fff;
          margin: 0;
        }
        .z2m-brand-title p {
          font-size: 13px;
          color: #94a3b8;
          margin: 3px 0 0 0;
        }
        .z2m-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .z2m-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(16, 185, 129, 0.4);
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          white-space: nowrap;
        }
        .z2m-status-pill.offline {
          border-color: rgba(244, 63, 94, 0.4);
          background: rgba(244, 63, 94, 0.12);
          color: #fb7185;
        }
        .z2m-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }
        .z2m-live-radar-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.14), rgba(6, 12, 28, 0.92));
          border: 1px solid rgba(16, 185, 129, 0.38);
          border-radius: 14px;
          padding: 12px 20px;
          margin-bottom: 16px;
          transition: all 0.25s ease;
        }
        .z2m-live-radar-bar.flash {
          background: linear-gradient(90deg, rgba(0, 243, 255, 0.35), rgba(16, 185, 129, 0.25));
          border-color: #00f3ff;
          box-shadow: 0 0 25px rgba(0, 243, 255, 0.4);
        }
        .z2m-radar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          flex-wrap: wrap;
        }
        .z2m-radar-badge {
          background: rgba(0, 243, 255, 0.16);
          color: #00f3ff;
          border: 1px solid rgba(0, 243, 255, 0.4);
          padding: 4px 10px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 11.5px;
          white-space: nowrap;
        }
        .z2m-main-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .z2m-tab-card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 14px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .z2m-tab-card:hover {
          border-color: rgba(0, 243, 255, 0.45);
          transform: translateY(-1px);
        }
        .z2m-tab-card.active {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.16), rgba(15, 23, 42, 0.94));
          border: 1px solid #00f3ff;
          box-shadow: 0 0 24px rgba(0, 243, 255, 0.18);
        }
        .z2m-tab-num {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          flex-shrink: 0;
        }
        .z2m-tab-card.active .z2m-tab-num {
          background: rgba(0, 243, 255, 0.22);
          border: 1px solid #00f3ff;
        }
        .z2m-tab-info h2 {
          font-size: 13.8px;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .z2m-tab-info p {
          font-size: 11.5px;
          color: #94a3b8;
          margin: 3px 0 0 0;
        }
        .z2m-room-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          background: rgba(8, 13, 28, 0.85);
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.11);
        }
        .z2m-room-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .z2m-room-pill:hover {
          border-color: #00f3ff;
          color: #fff;
        }
        .z2m-room-pill.active {
          background: rgba(0, 243, 255, 0.18);
          border-color: #00f3ff;
          color: #fff;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.25);
        }
        .z2m-btn {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(30, 41, 59, 0.9);
          color: #f8fafc;
          padding: 8px 14px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .z2m-btn:hover {
          border-color: #00f3ff;
          background: rgba(15, 23, 42, 0.98);
          transform: translateY(-1px);
        }
        .z2m-btn-cyan {
          background: rgba(0, 243, 255, 0.15);
          border-color: rgba(0, 243, 255, 0.55);
          color: #00f3ff;
        }
        .z2m-btn-emerald {
          background: rgba(16, 185, 129, 0.18);
          border-color: rgba(16, 185, 129, 0.6);
          color: #34d399;
        }
        .z2m-btn-amber {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.6);
          color: #fbbf24;
        }
        .z2m-btn-danger {
          background: rgba(244, 63, 94, 0.18);
          border-color: rgba(244, 63, 94, 0.6);
          color: #fb7185;
        }
        .z2m-section-title {
          font-size: 15.5px;
          font-weight: 800;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          color: #e2e8f0;
        }
        .z2m-grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 18px;
          margin-bottom: 28px;
        }
        @media (max-width: 650px) {
          .z2m-grid-cards {
            grid-template-columns: 1fr;
          }
        }
        .z2m-card {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .z2m-card.highlight-press {
          border-color: #00f3ff;
          box-shadow: 0 0 28px rgba(0, 243, 255, 0.35);
        }
        .z2m-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .z2m-card-title {
          font-size: 16.5px;
          font-weight: 800;
          color: #fff;
        }
        .z2m-card-sub {
          font-size: 11.5px;
          color: #94a3b8;
          font-family: monospace;
          margin-top: 3px;
        }
        .z2m-channel-row {
          background: rgba(6, 11, 24, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .z2m-channel-row.wired {
          border-left: 4px solid #f59e0b;
          background: rgba(245, 158, 11, 0.08);
        }
        .z2m-channel-row.commutation {
          border-left: 4px solid #a855f7;
          background: rgba(168, 85, 247, 0.08);
        }
        .z2m-channel-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .z2m-ch-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .z2m-badge {
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .z2m-badge-on {
          background: rgba(16, 185, 129, 0.24);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.55);
        }
        .z2m-badge-off {
          background: rgba(148, 163, 184, 0.14);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .z2m-badge-wire {
          background: rgba(245, 158, 11, 0.2);
          color: #fde68a;
          border: 1px solid rgba(245, 158, 11, 0.55);
        }
        .z2m-badge-comm {
          background: rgba(168, 85, 247, 0.2);
          color: #e9d5ff;
          border: 1px solid rgba(168, 85, 247, 0.55);
        }
        .z2m-badge-free {
          background: rgba(255, 255, 255, 0.07);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .z2m-hub-wrapper input[type="text"],
        .z2m-hub-wrapper select {
          background: #081124;
          border: 1px solid rgba(0, 243, 255, 0.3);
          color: #f8fafc;
          padding: 8px 11px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          outline: none;
        }
        .z2m-hub-wrapper select option {
          background: #081124;
          color: #f8fafc;
          padding: 8px;
        }
        .z2m-hub-wrapper input[type="text"]:focus,
        .z2m-hub-wrapper select:focus {
          border-color: #00f3ff;
          box-shadow: 0 0 10px rgba(0, 243, 255, 0.28);
        }
        .z2m-comm-chip-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
        }
        .z2m-comm-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.45);
          border-left: 4px solid #a855f7;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 12.5px;
        }
        .z2m-quick-plate-picker {
          background: rgba(5, 10, 22, 0.85);
          border: 1px solid rgba(0, 243, 255, 0.22);
          border-radius: 10px;
          padding: 12px;
          margin-top: 4px;
        }
        .z2m-quick-plate-group {
          margin-bottom: 10px;
        }
        .z2m-quick-plate-group:last-child {
          margin-bottom: 0;
        }
        .z2m-quick-plate-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .z2m-quick-btn-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .z2m-q-switch-btn {
          padding: 6px 11px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(30, 41, 59, 0.75);
          color: #e2e8f0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .z2m-q-switch-btn:hover {
          border-color: #00f3ff;
          color: #fff;
        }
        .z2m-q-switch-btn.is-this-power {
          background: rgba(245, 158, 11, 0.24);
          border-color: #f59e0b;
          color: #fde68a;
          cursor: default;
        }
        .z2m-q-switch-btn.is-this-comm {
          background: rgba(168, 85, 247, 0.28);
          border-color: #a855f7;
          color: #f3e8ff;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.28);
        }
        .z2m-q-switch-btn.is-other-light {
          background: rgba(15, 23, 42, 0.5);
          border-color: rgba(255, 255, 255, 0.06);
          color: #64748b;
          font-weight: 600;
        }
        .z2m-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 18, 0.84);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .z2m-modal-box {
          background: #091226;
          border: 1px solid #00f3ff;
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 540px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
        }
        .z2m-form-group {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .z2m-form-group label {
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
        }
      `}</style>

      {/* CABECERA PRINCIPAL */}
      <header className="z2m-top-header">
        <div className="z2m-brand-title">
          <div className="z2m-brand-icon">⚡</div>
          <div>
            <h1>HABANA ZIGBEE2MQTT · INTERRUPTORES, LUCES Y SENSORES</h1>
            <p>
              0️⃣ Asignación e Inventario Z2M ➔ 1️⃣ Placas y Luces Reales ➔ 2️⃣ Conmutadas ➔ 3️⃣ Sensores Zigbee & Vinculación a Luces ➔ 4️⃣ Secuenciador Dimmer
            </p>
          </div>
        </div>
        <div className="z2m-header-actions">
          {statusFeedback && (
            <span className="z2m-badge z2m-badge-on" style={{ padding: '7px 12px', fontSize: '12px' }}>
              {statusFeedback.msg}
            </span>
          )}
          <div className={`z2m-status-pill ${appState.mqtt_connected ? '' : 'offline'}`}>
            <span className="z2m-dot" />
            <span>
              {appState.mqtt_connected
                ? `Zigbee2MQTT ONLINE (${(appState.plates || []).length} Placas · ${(appState.led_controllers || []).length} LEDs)`
                : 'MQTT Offline'}
            </span>
          </div>
          <button className="z2m-btn z2m-btn-cyan" onClick={syncFromZ2M}>
            🔄 Sincronizar Z2M
          </button>
          <button className="z2m-btn z2m-btn-danger" onClick={turnAllOff}>
            🛑 APAGAR TODAS LAS LUCES (EMERGENCIA)
          </button>
        </div>
      </header>

      {/* RADAR EN VIVO DE PULSACIONES EN LA PARED */}
      <div className={`z2m-live-radar-bar ${radarFlash ? 'flash' : ''}`}>
        <div className="z2m-radar-left">
          <span className="z2m-radar-badge">📡 DETECTOR DE PARED EN VIVO</span>
          {latestEvent ? (
            <span style={{ color: '#e2e8f0' }}>
              [{latestEvent.timestamp}] Pulsado en pared:{' '}
              <strong style={{ color: '#00f3ff' }}>{latestEvent.plate_name}</strong> ({latestEvent.device}) ·{' '}
              <strong>{latestEvent.channel_label}</strong> [{latestEvent.channel}] ➔{' '}
              <strong>{latestEvent.state}</strong>{' '}
              {latestEvent.assigned_light_name ? (
                <span>
                  ➔ Asignado a: <strong style={{ color: '#34d399' }}>{latestEvent.assigned_light_name}</strong>
                </span>
              ) : (
                <span style={{ color: '#fbbf24' }}>➔ (Botón libre / sin asignar)</span>
              )}
            </span>
          ) : (
            <span style={{ color: '#e2e8f0' }}>
              Pulsa cualquier interruptor físico en la pared para ver aquí al instante qué placa y qué botón es...
            </span>
          )}
        </div>

        {appState.learn_mode && appState.learn_mode.active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="z2m-badge z2m-badge-comm">
              🎧 PULSA AHORA EN LA PARED EL INTERRUPTOR CONMUTADO PARA:{' '}
              {learnTargetLight ? learnTargetLight.name : appState.learn_mode.target_light_id}
            </span>
            <button
              className="z2m-btn z2m-btn-danger"
              style={{ padding: '5px 10px', fontSize: '11.5px' }}
              onClick={stopLearnMode}
            >
              Cancelar Escucha
            </button>
          </div>
        )}
      </div>

      {/* SELECTOR DE LOS 6 APARTADOS EN ORDEN LÓGICO */}
      <div className="z2m-main-tabs">
        <div
          className={`z2m-tab-card ${currentTab === 'apartado0' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado0')}
        >
          <div className="z2m-tab-num">0️⃣</div>
          <div className="z2m-tab-info">
            <h2>0️⃣ Asignación e Inventario Z2M</h2>
            <p>Emparejar (Permit Join), renombrar IDs en Z2M, elegir tipo de dispositivo (placas, tiras LED, sensores) y habitación</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartado1' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado1')}
        >
          <div className="z2m-tab-num">1️⃣</div>
          <div className="z2m-tab-info">
            <h2>1️⃣ Placas, Interruptores y Luces Reales</h2>
            <p>Relés físicos con cable de cada bombilla, nombres y regulación de controladores LED</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartado2' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado2')}
        >
          <div className="z2m-tab-num">2️⃣</div>
          <div className="z2m-tab-info">
            <h2>2️⃣ Conmutaciones Visuales (En 1 Clic)</h2>
            <p>Conmutadas entre interruptores de pared físicos para gobernar la misma luz</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartado3' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado3')}
          style={{
            borderColor: currentTab === 'apartado3' ? '#00f3ff' : 'rgba(0, 243, 255, 0.25)',
            boxShadow: currentTab === 'apartado3' ? '0 0 16px rgba(0, 243, 255, 0.3)' : 'none'
          }}
        >
          <div className="z2m-tab-num">📡</div>
          <div className="z2m-tab-info">
            <h2 style={{ color: currentTab === 'apartado3' ? '#00f3ff' : '#f8fafc' }}>
              3️⃣ Sensores: Estados, Telemetría y Nombres
            </h2>
            <p>Monitor en tiempo real de contactos, aire y presencia. Renombra tus sensores aquí (las acciones van en Automatizaciones)</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartado4' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado4')}
        >
          <div className="z2m-tab-num">🎛️</div>
          <div className="z2m-tab-info">
            <h2>4️⃣ Secuenciador Dimmer y Tiras LED</h2>
            <p>Configurar los 9 pasos de intensidad de las tiras LED del Salón (Aparador, Sofá y TV)</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartado5' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartado5')}
        >
          <div className="z2m-tab-num" style={{ fontSize: '26px' }}>🌐</div>
          <div className="z2m-tab-info">
            <h2>🌐 5️⃣ Radar y Mapa Mesh de Cobertura</h2>
            <p>Topología visual interactiva, enlaces LQI, potencia de señal y repetidores en toda la vivienda</p>
          </div>
        </div>

        <div
          className={`z2m-tab-card ${currentTab === 'apartadoESP32' ? 'active' : ''}`}
          onClick={() => setCurrentTab('apartadoESP32')}
          style={{
            borderColor: currentTab === 'apartadoESP32' ? '#8b5cf6' : 'rgba(139, 92, 246, 0.25)',
            boxShadow: currentTab === 'apartadoESP32' ? '0 0 16px rgba(139, 92, 246, 0.3)' : 'none'
          }}
        >
          <div className="z2m-tab-num" style={{ fontSize: '26px' }}>📡</div>
          <div className="z2m-tab-info">
            <h2 style={{ color: currentTab === 'apartadoESP32' ? '#c084fc' : '#f8fafc' }}>
              6️⃣ Hub ESP32 & Presencia BLE
            </h2>
            <p>Esfera Xiaozhi Robot V2, satélites de voz/pantalla y localización Bluetooth de móviles y relojes</p>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS POR HABITACIÓN */}
      <div className="z2m-room-pills">
        {roomsWithAll.map(r => (
          <button
            key={r.id}
            type="button"
            className={`z2m-room-pill ${selectedRoom === r.id ? 'active' : ''}`}
            onClick={() => setSelectedRoom(r.id)}
          >
            {r.icon || '📍'} {cleanText(r.name)}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
      {currentTab === 'apartado0' && renderApartado0()}
      {currentTab === 'apartado1' && renderApartado1()}
      {currentTab === 'apartado2' && renderApartado2()}
      {currentTab === 'apartado3' && renderApartado3()}
      {currentTab === 'apartado4' && renderApartado4()}
      {currentTab === 'apartado5' && <ZigbeeMeshRadar />}
        {currentTab === 'apartadoESP32' && <ESP32HubPanel />}

      {/* MODAL CREAR / ASIGNAR LUZ REAL */}
      {lightModal.open && (
        <div className="z2m-modal-backdrop" onClick={() => setLightModal(prev => ({ ...prev, open: false }))}>
          <div className="z2m-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', marginBottom: '14px', color: '#00f3ff' }}>
              💡 Asignar Luz Física Real
            </h3>

            <div className="z2m-form-group">
              <label>Dispositivo / Relé Físico Seleccionado:</label>
              <div
                style={{
                  padding: '9px 12px',
                  background: '#050a18',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  fontSize: '12.5px'
                }}
              >
                {lightModal.power_device} ➔ Canal: {lightModal.power_channel} (
                {lightModal.kind === 'led_controller' ? 'Controlador Tira LED' : 'Relé con Cable de Luz'})
              </div>
            </div>

            <div className="z2m-form-group">
              <label>Nombre de la Luz Real (ej. &quot;Luz del Comedor&quot;, &quot;Luz Ventana&quot;):</label>
              <input
                type="text"
                value={lightModal.name}
                onChange={e => setLightModal(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Escribe el nombre claro de la luz..."
              />
            </div>

            <div className="z2m-form-group">
              <label>Habitación:</label>
              <select
                value={lightModal.room}
                onChange={e => setLightModal(prev => ({ ...prev, room: e.target.value }))}
              >
                {(appState.rooms || DEFAULT_ROOMS).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {cleanText(r.name)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button className="z2m-btn" onClick={() => setLightModal(prev => ({ ...prev, open: false }))}>
                Cancelar
              </button>
              <button className="z2m-btn z2m-btn-emerald" onClick={() => saveRealLight()}>
                💾 Guardar Luz Real
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

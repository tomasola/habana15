import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

const ROOM_NAMES = {
  salon: 'Salón',
  bano: 'Baño',
  andrea: 'Habitación Andrea',
  principal: 'Dormitorio Principal',
  pasillo: 'Pasillo',
  cocina: 'Cocina',
  entrada: 'Entrada'
};

const ROOM_COLORS = {
  salon: '#00f3ff',
  bano: '#06b6d4',
  andrea: '#ec4899',
  principal: '#8b5cf6',
  pasillo: '#eab308',
  cocina: '#10b981',
  entrada: '#6366f1'
};

const REACTOR_STATES = {
  stop: { label: 'LISTO / REPOSO', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', icon: '🟢', desc: 'Esperando activación por botón o voz' },
  listen: { label: 'ESCUCHANDO MICRO', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.5)', icon: '🎤', desc: 'Micrófono I2S abierto capturando voz' },
  think: { label: 'PENSANDO / IA', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', icon: '🧠', desc: 'Transcribiendo y procesando con Groq y Gemini' },
  start: { label: 'HABLANDO / ALTAVOZ', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', icon: '🔊', desc: 'Transmitiendo audio PCM por altavoz I2S' }
};


const PRESET_ACTIONS = [
  { id: 'all_off', label: 'APAGAR LUCES', icon: '💡', color: '#ef4444', endpoint: '/api/z2m-hub/all-off', method: 'POST', subtext: 'Apaga las 28 luminarias de la casa' },
  { id: 'toggle_alarm', label: 'ACTIVAR ALARMA', icon: '🛡️', color: '#3b82f6', endpoint: '/api/security/alarm/toggle', method: 'POST', subtext: 'Armar o desarmar seguridad del hogar' },
  { id: 'page_radar', label: 'RADAR PRESENCIA', icon: '🛰️', color: '#10b981', endpoint: 'page_radar', method: 'PAGE', subtext: 'Abrir matriz de radar BLE de ocupantes' },
  { id: 'page_sensors', label: 'DATOS SENSORES', icon: '🌡️', color: '#06b6d4', endpoint: 'page_sensors', method: 'PAGE', subtext: 'Telemetría ambiental (salón, cocina, plantas)' },
  { id: 'scene_cinema', label: 'MODO CINE', icon: '🎬', color: '#a855f7', endpoint: '/api/automations/scene_salon_todo_off/execute', method: 'POST', subtext: 'Atenuar salón al 15% y luz LED TV' },
  { id: 'scene_good_morning', label: 'BUENOS DÍAS', icon: '☀️', color: '#eab308', endpoint: '/api/automations/scene_fuera_de_casa/execute', method: 'POST', subtext: 'Encendido suave de cocina y pasillo' },
  { id: 'scene_modo_relax', label: 'MODO RELAX', icon: '🧘', color: '#14b8a6', endpoint: '/api/automations/scene_modo_relax/execute', method: 'POST', subtext: 'Luz tenue cálida en salón y dormitorio' },
  { id: 'vacuum_clean', label: 'LIMPIEZA ROBOT', icon: '🧹', color: '#f97316', endpoint: '/api/robot/clean', method: 'POST', subtext: 'Lanzar aspirador robot' },
  { id: 'custom', label: 'PERSONALIZADO', icon: '⚙️', color: '#64748b', endpoint: '', method: 'POST', subtext: 'Endpoint HTTP personalizado' }
];

export default function ESP32HubPanel() {
  const [data, setData] = useState({
    nodes: [],
    detected_serial_ports: [],
    ble_tracked_devices: [],
    total_nodes: 0,
    online_nodes: 0,
    ble_tracking_active: false
  });
  const [robotStatus, setRobotStatus] = useState({
    connected_clients: 0,
    current_state: 'stop',
    volume: 35,
    last_interaction: null,
    recent_logs: []
  });
  const [robotVolume, setRobotVolume] = useState(20);
  const [selectedSpeaker, setSelectedSpeaker] = useState('Salón');
  const [availableSpeakers, setAvailableSpeakers] = useState([]);
  const [radioInfo, setRadioInfo] = useState({ playing: false, station_name: null });
  const [radarData, setRadarData] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [speakingLoading, setSpeakingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ show: false, msg: '', type: 'info' });
  const [activeModal, setActiveModal] = useState(null); // 'add_node' | 'add_ble'
  const [newNodeForm, setNewNodeForm] = useState({
    id: '',
    name: '',
    type: 'wall_display',
    chip: 'ESP32-S3',
    room: 'salon',
    port: '',
    ip: ''
  });
  const [newBleForm, setNewBleForm] = useState({
    name: '',
    owner: 'Tomás',
    mac: '',
    type: 'smartwatch',
    current_room: 'salon'
  });
  const [screenButtons, setScreenButtons] = useState({
    btn1: { id: 'btn1', name: 'Botón 1 (Arriba Izquierda)', label: 'APAGAR LUCES', action: 'all_off', endpoint: '/api/z2m-hub/all-off', method: 'POST', icon: '💡', color: '#ef4444', subtext: 'Apaga todas las luces Z2M' },
    btn2: { id: 'btn2', name: 'Botón 2 (Arriba Derecha)', label: 'ACTIVAR ALARMA', action: 'toggle_alarm', endpoint: '/api/security/alarm/toggle', method: 'POST', icon: '🛡️', color: '#3b82f6', subtext: 'Alterna estado de alarma' },
    btn3: { id: 'btn3', name: 'Botón 3 (Abajo Izquierda)', label: 'RADAR PRESENCIA', action: 'page_radar', endpoint: 'page_radar', method: 'PAGE', icon: '🛰️', color: '#10b981', subtext: 'Matriz BLE de Habitantes' },
    btn4: { id: 'btn4', name: 'Botón 4 (Abajo Derecha)', label: 'DATOS SENSORES', action: 'page_sensors', endpoint: 'page_sensors', method: 'PAGE', icon: '🌡️', color: '#06b6d4', subtext: 'Temperatura, humedad y plantas' }
  });
  const [editingBtn, setEditingBtn] = useState(null);
  const [testingBtn, setTestingBtn] = useState(null);
  const [continuousListening, setContinuousListening] = useState(false);


  const showToast = (msg, type = 'info') => {
    setFeedback({ show: true, msg, type });
    setTimeout(() => setFeedback({ show: false, msg: '', type: 'info' }), 4000);
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/esp32/overview`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      const resRadar = await fetch(`${API_BASE}/esp32/ble/radar`);
      if (resRadar.ok) {
        const jsonRadar = await resRadar.json();
        setRadarData(jsonRadar);
      }
      try {
        const resButtons = await fetch(`${API_BASE}/esp32/screen-buttons`);
        if (resButtons.ok) {
          const jsonButtons = await resButtons.json();
          if (jsonButtons.buttons && Object.keys(jsonButtons.buttons).length > 0) {
            setScreenButtons(jsonButtons.buttons);
          }
        }
      } catch (errBtn) {
        console.debug('Error screen buttons:', errBtn);
      }

    } catch (err) {
      console.error('Error cargando overview ESP32:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMove = async (devId, targetRoom) => {
    try {
      const res = await fetch(`${API_BASE}/esp32/ble/simulate-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: devId, room: targetRoom, rssi: -52 })
      });
      if (res.ok) {
        const j = await res.json();
        showToast(`📍 ${j.device} detectado ahora en ${j.room_name}`, 'success');
        fetchOverview();
      }
    } catch (e) {
      console.error('Error simulando movimiento:', e);
    }
  };

  const fetchRobotStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/robot/status`);
      if (res.ok) {
        const json = await res.json();
        setRobotStatus(json);
        if (json.volume !== undefined) {
          setRobotVolume(json.volume);
        }
        if (json.audio_output) {
          setSelectedSpeaker(json.audio_output);
        }
      }
    } catch (e) {
      // Ignorar errores de sondeo silencioso
    }
  };

  const fetchSpeakersOutput = async () => {
    try {
      const res = await fetch(`${API_BASE}/robot/output`);
      if (res.ok) {
        const json = await res.json();
        if (json.audio_output) setSelectedSpeaker(json.audio_output);
        if (json.speakers) setAvailableSpeakers(json.speakers);
        setRadioInfo({ playing: json.radio_playing, station_name: json.radio_station });
      }
    } catch (e) {
      // Silencioso
    }
  };

  const handleSelectSpeaker = async (spkName) => {
    setSelectedSpeaker(spkName);
    try {
      const res = await fetch(`${API_BASE}/robot/output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: spkName })
      });
      if (res.ok) {
        showToast(`🔊 Salida de voz asignada a: ${spkName}`, 'success');
      }
    } catch (e) {
      console.error('Error seleccionando altavoz:', e);
      showToast('Error asignando altavoz', 'error');
    }
  };

  const handleVolumeChange = async (newVol) => {
    const val = Math.max(0, Math.min(100, Number(newVol)));
    setRobotVolume(val);
    try {
      const res = await fetch(`${API_BASE}/robot/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: val })
      });
      if (res.ok) {
        showToast(`🔊 Volumen regulado al ${val}%`, 'success');
      }
    } catch (e) {
      console.error('Error actualizando volumen:', e);
      showToast('Error al regular volumen', 'error');
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchRobotStatus();
    fetchSpeakersOutput();
    const interval = setInterval(() => {
      fetchOverview();
      fetchRobotStatus();
      fetchSpeakersOutput();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRobotSpeak = async (customText = null) => {
    const textToSend = customText || voiceText;
    if (!textToSend.trim()) {
      showToast('Escribe un mensaje para que la esfera lo hable', 'error');
      return;
    }
    setSpeakingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/robot/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`Mensaje enviado al altavoz de la esfera: "${textToSend}"`, 'success');
        if (!customText) setVoiceText('');
        fetchRobotStatus();
      } else {
        showToast('La esfera no respondió o está desconectada de WebSocket', 'error');
      }
    } catch (e) {
      showToast(`Error al comunicar con la esfera: ${e.message}`, 'error');
    } finally {
      setSpeakingLoading(false);
    }
  };

  const handleRobotListen = async () => {
    try {
      const res = await fetch(`${API_BASE}/robot/listen`, { method: 'POST' });
      if (res.ok) {
        showToast('🎤 Micrófono de la esfera activado (Reactor en Azul)', 'info');
        fetchRobotStatus();
      }
    } catch (e) {
      showToast(`Error activando escucha: ${e.message}`, 'error');
    }
  };

  const handleRobotState = async (state) => {
    try {
      await fetch(`${API_BASE}/robot/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      fetchRobotStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (nodeId, action, params = {}) => {
    try {
      const res = await fetch(`${API_BASE}/esp32/nodes/${nodeId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params })
      });
      const resData = await res.json();
      if (resData.ok) {
        showToast(`Acción '${action}' ejecutada con éxito`, 'success');
        fetchOverview();
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleSaveNode = async (e) => {
    e.preventDefault();
    if (!newNodeForm.name) {
      showToast('Introduce un nombre para el nodo', 'error');
      return;
    }
    try {
      const payload = {
        ...newNodeForm,
        id: newNodeForm.id || `esp32_${newNodeForm.room}_${Date.now().toString().slice(-4)}`,
        status: 'online',
        capabilities: ['round_display', 'ble_tracker'],
        last_seen: Date.now() / 1000
      };
      const res = await fetch(`${API_BASE}/esp32/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Nodo ESP32 registrado correctamente', 'success');
        setActiveModal(null);
        fetchOverview();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleSaveBleDevice = async (e) => {
    e.preventDefault();
    if (!newBleForm.name || !newBleForm.mac) {
      showToast('Completa el nombre y la dirección MAC o ID del dispositivo', 'error');
      return;
    }
    try {
      const payload = {
        ...newBleForm,
        id: `ble_${Date.now()}`,
        rssi: -65,
        distance_meters: 2.5,
        last_seen: Date.now() / 1000,
        status: 'in_room'
      };
      const res = await fetch(`${API_BASE}/esp32/ble-presence/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Dispositivo BLE registrado en el sistema de rastreo', 'success');
        setActiveModal(null);
        fetchOverview();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteBle = async (devId) => {
    try {
      await fetch(`${API_BASE}/esp32/ble-presence/${devId}`, { method: 'DELETE' });
      showToast('Dispositivo BLE eliminado', 'info');
      fetchOverview();
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const getRssiColor = (rssi) => {
    if (rssi >= -60) return '#10b981';
    if (rssi >= -75) return '#f59e0b';
    return '#ef4444';
  };

    const handleTestScreenButton = async (btnId) => {
    setTestingBtn(btnId);
    try {
      const res = await fetch(`${API_BASE}/esp32/screen-buttons/trigger/${btnId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`⚡ Botón [${screenButtons[btnId]?.label || btnId}] probado con éxito: ${data.msg || data.action}`, 'success');
      } else {
        showToast(`⚠️ Error al probar botón: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error de red al probar botón: ${err.message}`, 'error');
    } finally {
      setTestingBtn(null);
    }
  };

  const handleSaveScreenButton = async (btnId, updatedConfig) => {
    try {
      const newButtons = { ...screenButtons, [btnId]: updatedConfig };
      const res = await fetch(`${API_BASE}/esp32/screen-buttons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttons: newButtons })
      });
      if (res.ok) {
        setScreenButtons(newButtons);
        setEditingBtn(null);
        showToast(`✅ Botón [${updatedConfig.label}] reasignado y guardado correctamente.`, 'success');
      }
    } catch (err) {
      showToast(`Error guardando botón: ${err.message}`, 'error');
    }
  };

  const handleToggleContinuousListen = async () => {
    const nextState = !continuousListening;
    setContinuousListening(nextState);
    try {
      const res = await fetch(`${API_BASE}/robot/continuous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        if (nextState) {
          showToast('🎙️ Escucha continua activada en la Bola (Palabra clave: "Cuba")', 'success');
        } else {
          showToast('🟢 Escucha continua detenida. Bola en reposo (Verde).', 'info');
        }
        fetchRobotStatus();
      }
    } catch (e) {
      showToast(`Error al cambiar modo continuo: ${e.message}`, 'error');
    }
  };

const curStateConfig = REACTOR_STATES[robotStatus.current_state] || REACTOR_STATES.stop;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f8fafc' }}>
      {/* Toast Feedback */}
      {feedback.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          background: feedback.type === 'success' ? '#065f46' : feedback.type === 'error' ? '#991b1b' : '#1e293b',
          color: '#fff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          fontWeight: '600'
        }}>
          {feedback.msg}
        </div>
      )}

      {/* HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        border: '1px solid rgba(0, 243, 255, 0.3)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 0 30px rgba(0, 243, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(139, 92, 246, 0.3))',
            border: '1px solid #00f3ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px'
          }}>
            📡
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Apartado 6️⃣ · Hub ESP32 & Nodos Satélite
              <span style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid #10b981'
              }}>
                COM3 ACTIVO
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Control del satélite Esfera Xiaozhi Robot V2 (altavoz/micro I2S, pantalla redonda GC9A01A) y localización por Bluetooth en tiempo real.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveModal('add_node')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
              color: '#020617',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ➕ Añadir Nodo ESP32
          </button>
          <button
            onClick={() => setActiveModal('add_ble')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c084fc',
              border: '1px solid #8b5cf6',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⌚ Rastrear Reloj / Móvil BLE
          </button>
        </div>
      </div>

            {/* ========================================================================= */}
      {/* SECCIÓN 1: PANTALLA TÁCTIL 3.5" GUITION JC3248W535 (4 BOTONES CONFIGURABLES) */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(0, 243, 255, 0.35)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 0 30px rgba(0, 243, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Cabecera del Panel de Pantalla */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🖥️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#00f3ff', fontWeight: 800 }}>
                  Pantalla Táctil 3.5" Guition JC3248W535 (Salón / Entrada)
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', fontWeight: 700 }}>
                    ● 192.168.1.247 EN LÍNEA
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(0, 243, 255, 0.15)', color: '#38bdf8', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
                    COM5 USB
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    480x320 Calibrado 1:1
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Controlador AXS15231 • Latencia &lt;4ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => showToast('Ficha técnica registrada en vault/Dispositivos/pantalla_tactil_esp32_jc3248w535.md', 'info')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid #8b5cf6',
                color: '#d8b4fe',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="vault/Dispositivos/pantalla_tactil_esp32_jc3248w535.md"
            >
              📄 Ficha en Obsidian
            </button>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Esta pantalla física de 3.5 pulgadas cuenta con cuatro botones de acción táctil instantánea. Puedes <strong>asignar o modificar la acción de cada botón</strong> para conmutar luces, activar escenas de cine o relax, alternar la alarma o abrir las páginas de radar y sensores. También puedes pulsar <strong>"⚡ Probar"</strong> para simular el toque en vivo desde aquí.
        </p>

        {/* MARCO VIRTUAL QUE EMULA LA PANTALLA FÍSICA LANDSCAPE 480x320 */}
        <div style={{
          background: '#020617',
          border: '3px solid #1e293b',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: 'inset 0 0 25px rgba(0,0,0,0.8), 0 0 25px rgba(0, 243, 255, 0.15)',
          maxWidth: '720px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Barra superior de la pantalla */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.9)',
            borderRadius: '8px',
            marginBottom: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: '#00f3ff', fontWeight: 800 }}>HABANA 13 - CONTROL PRINCIPAL</span>
            <span style={{ color: '#38bdf8' }}>🌡️ 22.5°C  💧 54%</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>● WIFI OK</span>
          </div>

          {/* Rejilla 2x2 emulando los 4 cuadrantes táctiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {['btn1', 'btn2', 'btn3', 'btn4'].map((btnKey) => {
              const b = screenButtons[btnKey] || {
                id: btnKey,
                label: 'BOTÓN ' + btnKey,
                icon: '🔘',
                color: '#38bdf8',
                endpoint: '',
                subtext: ''
              };
              const isTesting = testingBtn === btnKey;

              return (
                <div
                  key={btnKey}
                  style={{
                    background: `linear-gradient(135deg, ${b.color}15, rgba(2, 6, 23, 0.9))`,
                    border: `2px solid ${b.color}88`,
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                    boxShadow: `0 0 15px ${b.color}22`,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.5rem' }}>{b.icon}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: b.color,
                        fontWeight: 700
                      }}>
                        {b.method || 'ACTION'}
                      </span>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                        {b.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        {b.subtext || b.endpoint}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de gestión */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => handleTestScreenButton(btnKey)}
                      disabled={isTesting}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isTesting ? 'rgba(255,255,255,0.2)' : `${b.color}33`,
                        border: `1px solid ${b.color}`,
                        color: '#fff',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: isTesting ? 'wait' : 'pointer'
                      }}
                      title="Ejecutar esta acción inmediatamente para verificar su respuesta"
                    >
                      {isTesting ? '⏳ Probando...' : '⚡ Probar'}
                    </button>
                    <button
                      onClick={() => setEditingBtn({ ...b, key: btnKey })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Cambiar la acción o etiqueta de este botón"
                    >
                      ✏️ Asignar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* SECCIÓN DESTACADA: ESFERA XIAOZHI ROBOT V2 & MONITOR ARC REACTOR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 12, 28, 0.95), rgba(15, 23, 42, 0.9))',
        border: `1px solid ${curStateConfig.color}66`,
        borderRadius: '20px',
        padding: '24px',
        boxShadow: `0 0 35px ${curStateConfig.glow}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* LADO IZQUIERDO: VISUALIZADOR DEL REACTOR HOLOGRÁFICO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Anillo exterior rotatorio */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px dashed ${curStateConfig.color}`,
              animation: 'spin 12s linear infinite',
              opacity: 0.6
            }}></div>

            {/* Anillo medio */}
            <div style={{
              position: 'absolute',
              inset: '16px',
              borderRadius: '50%',
              border: `3px solid ${curStateConfig.color}44`,
              boxShadow: `0 0 20px ${curStateConfig.glow}`
            }}></div>

            {/* Núcleo de Energía Arc Reactor */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${curStateConfig.color} 0%, rgba(2, 6, 23, 0.9) 75%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 30px ${curStateConfig.color}, inset 0 0 15px #020617`,
              border: `2px solid ${curStateConfig.color}`
            }}>
              <span style={{ fontSize: '32px' }}>{curStateConfig.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '1px', marginTop: '2px' }}>
                GC9A01A
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: curStateConfig.color, letterSpacing: '0.5px' }}>
              REACTOR: {curStateConfig.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              {curStateConfig.desc}
            </div>
          </div>

          {/* Botones de prueba de estado */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => handleRobotState('listen')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(0, 243, 255, 0.15)', border: '1px solid #00f3ff', color: '#00f3ff', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🎤 Escuchando
            </button>
            <button
              onClick={() => handleRobotState('think')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🧠 Pensando
            </button>
            <button
              onClick={() => handleRobotState('start')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🔊 Hablando
            </button>
            <button
              onClick={() => handleRobotState('stop')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
            >
              🟢 Listo / Reposo
            </button>
          </div>
        </div>

        {/* LADO DERECHO: TERMINAL DE VOZ Y ACCIONES BIDIRECCIONALES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#00f3ff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔮 Esfera Xiaozhi Robot V2 (Salón)
              </h3>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', fontWeight: 700 }}>
                COM3 CONECTADO
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              WebSocket directo: <code style={{ color: '#38bdf8' }}>ws://192.168.1.139:8050/ws/robot</code> • Clientes activos: <strong>{robotStatus.connected_clients}</strong>
            </p>
          </div>

          {/* Selector de Altavoz de Respuesta de HABANA */}
          <div style={{ background: 'rgba(2, 6, 23, 0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📢 Altavoz de Respuesta de HABANA:
              </span>
              {radioInfo.playing && (
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📻 Radio Activa: {radioInfo.station_name || 'En reproducción'} (Pausa y reanudación automática)
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { id: 'Salón', label: 'Salón (Google Cast)', icon: '🛋️', ip: '192.168.1.132' },
                { id: 'Cocina', label: 'Cocina (Google Cast)', icon: '🍳', ip: '192.168.1.131' },
                { id: 'Despacho', label: 'Despacho (Google Cast)', icon: '💻', ip: '192.168.1.133' },
                { id: 'Dormitorio', label: 'Dormitorio (Google Cast)', icon: '🛏️', ip: '192.168.1.134' },
                { id: 'Tarjeta de Sonido PC', label: 'Altavoces PC (Jack)', icon: '🖥️', ip: 'Local' },
                { id: 'todos', label: 'Toda la Casa (Todos)', icon: '🏠', ip: 'Broadcast' },
                { id: 'esfera', label: 'Esfera (Altavoz 1W)', icon: '🔮', ip: 'COM3' }
              ].map((spk) => {
                const isSelected = selectedSpeaker.toLowerCase() === spk.id.toLowerCase();
                return (
                  <button
                    key={spk.id}
                    onClick={() => handleSelectSpeaker(spk.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isSelected ? 'linear-gradient(135deg, rgba(0,243,255,0.2), rgba(2,132,199,0.2))' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.07)',
                      color: isSelected ? '#00f3ff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem' }}>{spk.icon}</span>
                      {isSelected && <span style={{ fontSize: '0.7rem', color: '#00f3ff', fontWeight: 800 }}>✓ ACTIVO</span>}
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600, marginTop: '4px', color: isSelected ? '#fff' : '#cbd5e1' }}>
                      {spk.label}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: isSelected ? '#38bdf8' : '#64748b', marginTop: '2px' }}>
                      {spk.ip}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control de Volumen y Ganancia Anti-Distorsión */}
          <div style={{ background: 'rgba(2, 6, 23, 0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔊 Volumen Altavoz I2S: <strong style={{ color: robotVolume > 60 ? '#f59e0b' : '#00f3ff', fontSize: '0.95rem' }}>{robotVolume}%</strong>
                {robotVolume <= 35 && <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Óptimo / Nítido</span>}
                {robotVolume > 60 && <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Alto</span>}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[15, 30, 45, 60].map((v) => (
                  <button
                    key={v}
                    onClick={() => handleVolumeChange(v)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: robotVolume === v ? 'rgba(0, 243, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: robotVolume === v ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: robotVolume === v ? '#00f3ff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🔈 5%</span>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={robotVolume}
                onChange={(e) => setRobotVolume(Number(e.target.value))}
                onMouseUp={(e) => handleVolumeChange(Number(e.target.value))}
                onTouchEnd={(e) => handleVolumeChange(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: '#00f3ff',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🔊 100%</span>
            </div>
          </div>

          {/* Formulario Hablar a la Esfera */}
          <div style={{ background: 'rgba(2, 6, 23, 0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
              🗣️ Enviar voz hablada por el altavoz de la esfera:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Escribe lo que quieras que diga la esfera..."
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRobotSpeak()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              />
              <button
                onClick={() => handleRobotSpeak()}
                disabled={speakingLoading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: speakingLoading ? '#475569' : 'linear-gradient(135deg, #00f3ff, #0284c7)',
                  border: 'none',
                  color: '#020617',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: speakingLoading ? 'wait' : 'pointer'
                }}
              >
                {speakingLoading ? '⏳ Enviando...' : '🔊 Hablar'}
              </button>
            </div>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {[
                'Buenos días, Tomás. Todos los sistemas en línea.',
                'Luces del salón apagadas.',
                'Alarma perimetral armada en modo noche.',
                'Temperatura ambiente 22 grados, confort óptimo.'
              ].map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => handleRobotSpeak(phrase)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ {phrase.slice(0, 24)}...
                </button>
              ))}
            </div>
          </div>

                    {/* EXPLICACIÓN Y MODO CONTINUO: BOLA VS TABLET */}
          <div style={{
            background: 'rgba(2, 6, 23, 0.7)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', color: '#00f3ff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 ¿Cómo escucha la Bola vs la Tablet?
              </span>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: continuousListening ? 'rgba(0, 243, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: continuousListening ? '#00f3ff' : '#94a3b8',
                border: continuousListening ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 700
              }}>
                {continuousListening ? '🎙️ MICRO ABIERTO' : '🔘 ESPERANDO BOTÓN'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              • <strong>En la Tablet:</strong> El navegador mantiene activo el detector por voz (VAD) en segundo plano y despierta automáticamente cuando dices la palabra clave <strong style={{ color: '#34d399' }}>"Cuba"</strong> (o "Hola Cuba" / "Oye Cuba").<br/>
              • <strong>En la Bola (Esfera):</strong> El satélite ESP32 tiene un micro I2S de alta ganancia. Para hablarle, puedes <strong>pulsar el botón físico superior (GPIO 0)</strong> o activar la opción de abajo para dejarlo escuchando continuamente sin tocarlo.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleToggleContinuousListen}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: continuousListening ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))' : 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(2, 132, 199, 0.2))',
                  border: continuousListening ? '1px solid #ef4444' : '1px solid #00f3ff',
                  color: continuousListening ? '#fca5a5' : '#00f3ff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {continuousListening ? '🛑 Detener Escucha Continua' : '🎙️ Activar Escucha Continua en la Bola'}
              </button>
            </div>
          </div>


          {/* Botón PTT Activar Micrófono */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRobotListen}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(2, 132, 199, 0.25))',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              🎤 Abrir Micrófono de la Esfera (Hablarle a HABANA)
            </button>
          </div>

          {/* Última Interacción Reconocida */}
          {robotStatus.last_interaction && (
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 243, 255, 0.2)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem' }}>
              <div style={{ color: '#00f3ff', fontWeight: 700, marginBottom: '4px' }}>💬 Última Conversación con la Esfera:</div>
              <div style={{ color: '#f8fafc' }}>🗣️ <strong>Usuario:</strong> "{robotStatus.last_interaction.user_text}"</div>
              <div style={{ color: '#38bdf8', marginTop: '3px' }}>🤖 <strong>HABANA:</strong> "{robotStatus.last_interaction.response_text}"</div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: RADAR DE LOCALIZACIÓN BLUETOOTH (BLE ROOM PRESENCE) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 0 25px rgba(139, 92, 246, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛰️</span> Radar de Presencia Bluetooth (Móviles & Smartwatches)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Los ESP32 miden la potencia de señal (RSSI) de tus dispositivos Bluetooth para saber exactamente en qué estancia te encuentras sin tocar nada.
            </p>
          </div>
          <button
            onClick={() => setActiveModal('add_ble')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid #8b5cf6',
              color: '#d8b4fe',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ➕ Vincular Baliza / Dispositivo
          </button>
        </div>

        {/* MAPA RADAR DE ESTANCIAS EN VIVO */}
        {radarData?.radar && (
          <div style={{ background: 'rgba(2, 6, 23, 0.7)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🗺️ Radar de Presencia por Estancias: <strong style={{ color: '#c084fc' }}>{radarData.active_in_home} personas/dispositivos en casa</strong>
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Triangulación en tiempo real (Log-Distance Path Loss + Histéresis 4 dBm)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
              {Object.values(radarData.radar).map((room) => {
                const hasOccupants = room.occupants && room.occupants.length > 0;
                return (
                  <div
                    key={room.id}
                    style={{
                      background: hasOccupants ? `linear-gradient(135deg, ${room.color}15, rgba(2,6,23,0.8))` : 'rgba(255, 255, 255, 0.02)',
                      border: hasOccupants ? `1px solid ${room.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: hasOccupants ? `0 0 15px ${room.color}22` : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: hasOccupants ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{room.icon}</span> {room.name}
                      </span>
                      {hasOccupants ? (
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: `${room.color}33`, color: room.color, fontWeight: 800 }}>
                          OCUPADA ({room.occupants.length})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#475569' }}>Libre</span>
                      )}
                    </div>

                    {/* Nodos activos en la habitación */}
                    {room.nodes && room.nodes.length > 0 && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        📡 Nodo: <span style={{ color: '#38bdf8' }}>{room.nodes.join(', ')}</span>
                      </div>
                    )}

                    {/* Ocupantes detectados */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '36px', justifyContent: 'center' }}>
                      {hasOccupants ? (
                        room.occupants.map((occ) => (
                          <div
                            key={occ.id}
                            style={{
                              background: 'rgba(2, 6, 23, 0.9)',
                              border: `1px solid ${room.color}66`,
                              borderRadius: '6px',
                              padding: '6px 8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                                {occ.type === 'smartwatch' ? '⌚' : '📱'} {occ.owner}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                {occ.name}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.72rem', color: room.color, fontWeight: 800 }}>
                                ~{occ.distance_meters} m
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                {occ.rssi} dBm
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
                          Sin presencia detectada
                        </span>
                      )}
                    </div>

                    {/* Botón rápido de prueba / simulación de movimiento */}
                    {room.id !== 'away' && (
                      <button
                        onClick={() => handleSimulateMove('watch_tomas', room.id)}
                        style={{
                          marginTop: '4px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#94a3b8',
                          fontSize: '0.68rem',
                          cursor: 'pointer'
                        }}
                        title={`Simular que Tomás entra a ${room.name}`}
                      >
                        📍 Mover Tomás aquí
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rejilla de Dispositivos BLE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {data.ble_tracked_devices?.map((dev) => {
            const roomColor = ROOM_COLORS[dev.current_room] || '#38bdf8';
            const roomName = ROOM_NAMES[dev.current_room] || dev.current_room;
            return (
              <div
                key={dev.id}
                style={{
                  background: 'rgba(2, 6, 23, 0.6)',
                  border: `1px solid ${roomColor}44`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: `${roomColor}22`,
                      border: `1px solid ${roomColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {dev.type === 'smartwatch' ? '⌚' : '📱'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>{dev.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Propietario: <strong style={{ color: '#e2e8f0' }}>{dev.owner}</strong></div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBle(dev.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    title="Eliminar dispositivo"
                  >
                    🗑️
                  </button>
                </div>

                {/* Estado Ubicación */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Ubicación Actual:</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: roomColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: roomColor }}></span>
                    {roomName}
                  </div>
                </div>

                {/* Nivel de Señal RSSI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>Potencia Señal RSSI: <strong>{dev.rssi} dBm</strong></span>
                    <span>Distancia est.: <strong>~{dev.distance_meters} m</strong></span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max(10, Math.min(100, (dev.rssi + 100) * 2))}%`,
                      background: getRssiColor(dev.rssi),
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 3: HARDWARE Y FIRMWARE (ESPHOME & COM3) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛠️</span> Infraestructura de Firmware ESPHome & Puerto Serie
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#020617', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Archivo de Configuración Maestro:</div>
            <code style={{ fontSize: '0.85rem', color: '#00f3ff', display: 'block', marginTop: '4px' }}>
              F:\HABANA_robot_esp32\jarvis_v2.yaml
            </code>
          </div>

          <div style={{ background: '#020617', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Entorno de Compilación:</div>
            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
              ESPHome 2026.6.5 (Python 3.11 Venv) • Puerto USB COM3
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: AÑADIR NODO ESP32 */}
      {activeModal === 'add_node' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form
            onSubmit={handleSaveNode}
            style={{
              background: '#0f172a',
              border: '1px solid #00f3ff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem' }}>➕ Registrar Nuevo Nodo ESP32</h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nombre del Dispositivo:</label>
              <input
                type="text"
                placeholder="Ej. Pantalla Táctil Entrada, Esfera Salón..."
                value={newNodeForm.name}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, name: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Estancia / Habitación:</label>
                <select
                  value={newNodeForm.room}
                  onChange={(e) => setNewNodeForm({ ...newNodeForm, room: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                >
                  {Object.entries(ROOM_NAMES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Modelo de Chip:</label>
                <select
                  value={newNodeForm.chip}
                  onChange={(e) => setNewNodeForm({ ...newNodeForm, chip: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                >
                  <option value="ESP32-S3">ESP32-S3 (Recomendado)</option>
                  <option value="ESP32 Classic">ESP32 Clásico</option>
                  <option value="ESP32-C3">ESP32-C3</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Puerto USB (si aplica):</label>
                <input
                  type="text"
                  placeholder="COM3, /dev/ttyUSB0..."
                  value={newNodeForm.port}
                  onChange={(e) => setNewNodeForm({ ...newNodeForm, port: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>IP Wi-Fi (opcional):</label>
                <input
                  type="text"
                  placeholder="192.168.1.xxx"
                  value={newNodeForm.ip}
                  onChange={(e) => setNewNodeForm({ ...newNodeForm, ip: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '10px 16px', borderRadius: '8px', background: '#00f3ff', border: 'none', color: '#020617', fontWeight: 700, cursor: 'pointer' }}
              >
                Guardar Nodo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AÑADIR DISPOSITIVO BLE */}
      {activeModal === 'add_ble' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form
            onSubmit={handleSaveBleDevice}
            style={{
              background: '#0f172a',
              border: '1px solid #8b5cf6',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3 style={{ margin: 0, color: '#c084fc', fontSize: '1.2rem' }}>⌚ Vincular Reloj o Móvil para Tracking BLE</h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nombre del Dispositivo:</label>
              <input
                type="text"
                placeholder="Ej. Apple Watch Tomás, Amazfit, iPhone..."
                value={newBleForm.name}
                onChange={(e) => setNewBleForm({ ...newBleForm, name: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Propietario / Persona:</label>
                <input
                  type="text"
                  placeholder="Tomás, Andrea..."
                  value={newBleForm.owner}
                  onChange={(e) => setNewBleForm({ ...newBleForm, owner: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tipo:</label>
                <select
                  value={newBleForm.type}
                  onChange={(e) => setNewBleForm({ ...newBleForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
                >
                  <option value="smartwatch">Reloj Inteligente ⌚</option>
                  <option value="smartphone">Teléfono Móvil 📱</option>
                  <option value="beacon">Baliza / Llavero iBeacon 🏷️</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dirección MAC Bluetooth o ID de Baliza:</label>
              <input
                type="text"
                placeholder="Ej. FF:32:89:A1:02:11 o Nombre BLE"
                value={newBleForm.mac}
                onChange={(e) => setNewBleForm({ ...newBleForm, mac: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '10px 16px', borderRadius: '8px', background: '#8b5cf6', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Activar Seguimiento
              </button>
            </div>
          </form>
        </div>
      )}
          {/* MODAL: ASIGNAR / MODIFICAR BOTÓN DE LA PANTALLA TÁCTIL */}
      {editingBtn && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #00f3ff',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 0 35px rgba(0, 243, 255, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✏️</span> Asignar {editingBtn.name || `Botón (${editingBtn.key})`}
              </h3>
              <button
                onClick={() => setEditingBtn(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Selector de Presets Populares */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Selecciona una Acción Preconfigurada:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
                {PRESET_ACTIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setEditingBtn({
                        ...editingBtn,
                        action: preset.id,
                        label: preset.label,
                        icon: preset.icon,
                        color: preset.color,
                        endpoint: preset.endpoint,
                        method: preset.method,
                        subtext: preset.subtext
                      });
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: editingBtn.action === preset.id ? `${preset.color}33` : 'rgba(255, 255, 255, 0.04)',
                      border: editingBtn.action === preset.id ? `2px solid ${preset.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      color: editingBtn.action === preset.id ? '#fff' : '#cbd5e1',
                      fontSize: '0.78rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{preset.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{preset.label}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{preset.subtext.slice(0, 22)}...</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de Edición Detallada */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Texto en Pantalla (Etiqueta):</label>
                <input
                  type="text"
                  value={editingBtn.label}
                  onChange={(e) => setEditingBtn({ ...editingBtn, label: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Icono Emoji:</label>
                <input
                  type="text"
                  value={editingBtn.icon}
                  onChange={(e) => setEditingBtn({ ...editingBtn, icon: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '0.88rem', textAlign: 'center' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Endpoint o Página Destino:</label>
              <input
                type="text"
                value={editingBtn.endpoint}
                onChange={(e) => setEditingBtn({ ...editingBtn, endpoint: e.target.value })}
                placeholder="Ej. /api/z2m-hub/all-off o page_radar"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#38bdf8', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Descripción / Subtexto:</label>
              <input
                type="text"
                value={editingBtn.subtext || ''}
                onChange={(e) => setEditingBtn({ ...editingBtn, subtext: e.target.value })}
                placeholder="Breve explicación de la acción"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            {/* Botones Guardar / Cancelar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingBtn(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveScreenButton(editingBtn.key, editingBtn)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                  border: 'none',
                  color: '#020617',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                💾 Guardar Asignación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
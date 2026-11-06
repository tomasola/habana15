import React, { useState, useEffect, useRef } from 'react';

const ROOMS = [
  { id: 'salon', name: 'Salón', icon: '🛋️', color: '#00f3ff' },
  { id: 'cocina', name: 'Cocina', icon: '🍳', color: '#10b981' },
  { id: 'andrea', name: 'Habitación Andrea', icon: '🛏️', color: '#ec4899' },
  { id: 'principal', name: 'Dormitorio Principal', icon: '👑', color: '#8b5cf6' },
  { id: 'pasillo', name: 'Pasillo', icon: '🚪', color: '#f59e0b' },
  { id: 'bano', name: 'Baño', icon: '🚿', color: '#06b6d4' },
  { id: 'entrada', name: 'Entrada', icon: '🔑', color: '#3b82f6' },
  { id: 'terraza', name: 'Terraza', icon: '🌿', color: '#84cc16' }
];

export default function SetupWizard({ onConfigChanged }) {
  const [activeTab, setActiveTab] = useState('pairing'); // 'pairing' (Emparejar nuevos) | 'lights' (Toca y Listo) | 'sensors' (Sensores) | 'summary' (Mapa Vivienda)
  const [selectedRoom, setSelectedRoom] = useState('salon');
  
  // Estado de Emparejamiento (Permit Join)
  const [permitJoinActive, setPermitJoinActive] = useState(false);
  const [permitJoinCountdown, setPermitJoinCountdown] = useState(0);
  const [z2mDevices, setZ2mDevices] = useState([]);
  const [plates, setPlates] = useState({});
  const [unassignedDevices, setUnassignedDevices] = useState([]);
  const [identifyingDevice, setIdentifyingDevice] = useState(null);

  // Formulario de Bautismo de Dispositivo
  const [namingDevice, setNamingDevice] = useState(null);
  const [friendlyNameInput, setFriendlyNameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [deviceRoomInput, setDeviceRoomInput] = useState('salon');
  const [deviceProfileInput, setDeviceProfileInput] = useState('plate_2');

  // Estado del Asistente "Toca y Listo" (Luces & Conmutadas)
  const [wizardStep, setWizardStep] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [detectedEvent, setDetectedEvent] = useState(null);
  const [lightName, setLightName] = useState('');
  const [lightKind, setLightKind] = useState('ceiling');
  const [activeCreatedLight, setActiveCreatedLight] = useState(null);
  const [roomSummary, setRoomSummary] = useState({ lights: [] });

  // Sensores y Automatizaciones Rápidas
  const [sensorsList, setSensorsList] = useState([]);
  const [sensorSuccessMsg, setSensorSuccessMsg] = useState(null);
  const [allLightsList, setAllLightsList] = useState([]);
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [selectedUnassignedIeee, setSelectedUnassignedIeee] = useState('');
  const [quickSensorName, setQuickSensorName] = useState('');
  const [quickSensorRoom, setQuickSensorRoom] = useState('entrada');
  const [quickSensorType, setQuickSensorType] = useState('sensor_door');
  const [quickSensorAction, setQuickSensorAction] = useState('alarm');
  const [newSensorData, setNewSensorData] = useState({
    name: '',
    category: 'presence',
    type: 'pir',
    room: 'salon',
    protocol: 'zigbee2mqtt',
    installed: true,
    friendly_name: '',
    ieee: '',
    autoAction: 'light' // 'light' | 'alarm' | 'notify' | 'none'
  });

  const [feedback, setFeedback] = useState(null);
  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Cargar estado general de Z2M y placas
  const fetchZ2MState = async () => {
    try {
      const res = await fetch('/api/z2m-hub/state');
      if (res.ok) {
        const data = await res.json();
        setPlates(data.plates || {});
        const isPermitActive = data.permit_join !== undefined ? !!data.permit_join : !!data.pairing?.active;
        const permitCount = data.permit_join_countdown !== undefined ? data.permit_join_countdown : (data.pairing?.remaining_seconds || 0);
        setPermitJoinActive(isPermitActive);
        setPermitJoinCountdown(permitCount);

        // Dispositivos descubiertos
        const rawDevs = data.z2m_devices || [];
        setZ2mDevices(rawDevs);

        // Filtrar dispositivos que aún no están asignados como placa, tira LED o sensor
        const configuredIeees = new Set();
        const configuredNames = new Set();
        Object.values(data.plates || {}).forEach(p => {
          if (p.ieee) configuredIeees.add(String(p.ieee).toLowerCase());
          if (p.id) configuredNames.add(String(p.id).toLowerCase());
          if (p.friendly_name) configuredNames.add(String(p.friendly_name).toLowerCase());
        });
        const unassigned = rawDevs.filter(d => {
          if (d.type === 'Coordinator') return false;
          const fn = String(d.friendly_name || '').toLowerCase();
          const ieee = String(d.ieee || '').toLowerCase();
          if (configuredIeees.has(ieee) || configuredNames.has(fn)) return false;
          if (fn.includes('_led') || fn.includes('led_')) return false;
          return true;
        });
        setUnassignedDevices(unassigned);
        if (unassigned.length > 0) {
          const firstDev = unassigned[0];
          setSelectedUnassignedIeee(prev => prev && unassigned.some(x => (x.ieee || x.friendly_name) === prev) ? prev : (firstDev.ieee || firstDev.friendly_name));
          setQuickSensorName(prev => {
            if (prev) return prev;
            const isDoor = firstDev.profile === 'sensor_door' || String(firstDev.model || '').toLowerCase().includes('snzb') || String(firstDev.model || '').toLowerCase().includes('puerta');
            return isDoor ? 'Sonoff Puerta Entrada' : (firstDev.name || firstDev.friendly_name);
          });
        }
      }
    } catch (e) {
      console.error('Error fetching z2m state:', e);
    }
  };

  const fetchRoomSummary = async (room) => {
    try {
      const res = await fetch(`/api/setup-wizard/room-summary/${room}`);
      if (res.ok) {
        const data = await res.json();
        setRoomSummary(data);
      }
    } catch (e) {
      console.error('Error fetching room summary:', e);
    }
  };

  const fetchSensors = async () => {
    try {
      const res = await fetch('/api/sensors');
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.sensors || []);
        const seenIeee = new Map();
        const dedupedList = [];
        for (const sen of rawList) {
          const ieee = (sen.ieee || '').trim().toLowerCase();
          if (ieee && ieee !== 'none') {
            if (seenIeee.has(ieee)) {
              const existingIdx = seenIeee.get(ieee);
              if (!dedupedList[existingIdx].installed && sen.installed) {
                dedupedList[existingIdx] = sen;
              }
              continue;
            }
            seenIeee.set(ieee, dedupedList.length);
          }
          dedupedList.push(sen);
        }
        setSensorsList(dedupedList);
      }
    } catch (e) {
      console.error('Error fetching sensors:', e);
    }
  };

  const fetchAllLights = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setAllLightsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching all lights:', e);
    }
  };

  const handleCreateNewSensor = async () => {
    if (!newSensorData.name.trim()) return;
    const cleanId = newSensorData.name.trim().toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sensorId = cleanId.startsWith('sensor_') ? cleanId : `sensor_${cleanId}`;

    const payload = {
      id: sensorId,
      name: newSensorData.name.trim(),
      category: newSensorData.category,
      type: newSensorData.type,
      room: newSensorData.room,
      protocol: newSensorData.protocol,
      installed: !!newSensorData.installed,
      friendly_name: newSensorData.friendly_name.trim() || sensorId,
      ieee: newSensorData.ieee.trim() || '',
      state: newSensorData.category === 'contact' ? 'closed' : (newSensorData.category === 'water' ? 'dry' : 'off'),
      value: newSensorData.category === 'contact' ? 'Cerrada' : (newSensorData.category === 'water' ? 'Seco (Sin Fuga)' : 'Despejado'),
      battery: 100,
      lqi: 150,
      notes: newSensorData.installed ? 'Instalado y operativo' : 'Pre-configurado para futura instalación Zigbee'
    };

    try {
      const res = await fetch('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Si el usuario configuró una acción automática, generamos la automatización inmediatamente
        if (newSensorData.autoAction === 'light') {
          const roomLights = allLightsList.filter(l => l.room === newSensorData.room);
          const targetLightId = roomLights.length > 0 ? roomLights[0].id : null;

          if (targetLightId) {
            await fetch('/api/automations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `Encender ${roomLights[0].name} al detectar ${newSensorData.name}`,
                description: `Regla automática creada por el Asistente para ${newSensorData.name}`,
                icon: '💡',
                category: 'automation',
                enabled: true,
                trigger: {
                  type: 'sensor',
                  entity_id: sensorId,
                  to_state: newSensorData.category === 'contact' ? 'open' : 'on'
                },
                actions: [
                  {
                    type: 'device',
                    entity_id: targetLightId,
                    action: 'turn_on',
                    duration_minutes: 3
                  }
                ]
              })
            });
          }
        } else if (newSensorData.autoAction === 'alarm') {
          await fetch('/api/automations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Alarma Intrusión: ${newSensorData.name}`,
              description: `Alerta por intrusión o apertura no autorizada`,
              icon: '🚨',
              category: 'safety',
              enabled: true,
              trigger: {
                type: 'sensor',
                entity_id: sensorId,
                to_state: newSensorData.category === 'contact' ? 'open' : 'on'
              },
              actions: [
                {
                  type: 'tts',
                  text: `¡Alerta de seguridad! Se ha activado ${newSensorData.name} en ${newSensorData.room}.`
                },
                {
                  type: 'whatsapp',
                  text: `🚨 ALERTA HABANA: Sensor ${newSensorData.name} activado en ${newSensorData.room}.`
                }
              ]
            })
          });
        }

        setSensorSuccessMsg(`✅ Sensor '${newSensorData.name}' creado e integrado con éxito.`);
        setShowAddSensorModal(false);
        setNewSensorData({
          name: '',
          category: 'presence',
          type: 'pir',
          room: selectedRoom || 'salon',
          protocol: 'zigbee2mqtt',
          installed: true,
          friendly_name: '',
          ieee: '',
          autoAction: 'light'
        });
        fetchSensors();
        setTimeout(() => setSensorSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error('Error creating sensor:', e);
    }
  };

  const handleQuickAddDetectedSensor = async () => {
    const dev = unassignedDevices.find(d => (d.ieee || d.friendly_name) === selectedUnassignedIeee) || unassignedDevices[0];
    if (!dev) return;
    const finalName = quickSensorName.trim() || `Sensor ${dev.friendly_name || dev.ieee}`;
    const cleanId = finalName.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sensorId = cleanId.startsWith('sensor_') ? cleanId : `sensor_${cleanId}`;

    let cat = 'contact';
    let sType = 'door_window';
    if (quickSensorType === 'sensor_air') {
      cat = 'air';
      sType = 'air_quality';
    } else if (quickSensorType === 'sensor_motion') {
      cat = 'presence';
      sType = 'pir';
    } else if (quickSensorType === 'sensor_water') {
      cat = 'water';
      sType = 'water_leak';
    } else if (quickSensorType === 'sensor_smoke') {
      cat = 'smoke_gas';
      sType = 'smoke_detector';
    } else if (quickSensorType === 'sensor_lux') {
      cat = 'light_lux';
      sType = 'illuminance';
    }

    try {
      // 1. Asignar y Bautizar en Z2M
      await fetch('/api/z2m-hub/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ieee: dev.ieee,
          old_friendly_name: dev.friendly_name || dev.ieee,
          new_friendly_name: sensorId,
          display_name: finalName,
          room: quickSensorRoom,
          device_profile: quickSensorType
        })
      });

      // 2. Registrar en sensor_service
      await fetch('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sensorId,
          name: finalName,
          category: cat,
          type: sType,
          room: quickSensorRoom,
          protocol: 'zigbee2mqtt',
          installed: true,
          friendly_name: sensorId,
          ieee: dev.ieee || '',
          state: cat === 'contact' ? 'closed' : 'off',
          value: cat === 'contact' ? 'Cerrada' : 'Normal',
          battery: 100,
          lqi: dev.linkquality || 170,
          notes: `Sensor Zigbee emparejado (${dev.ieee})`
        })
      });

      // 3. Crear automatizacion inmediata
      if (quickSensorAction === 'alarm') {
        await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Alarma Intrusion: ${finalName}`,
            description: `Alerta por apertura no autorizada o movimiento`,
            icon: '🚨',
            category: 'safety',
            enabled: true,
            trigger: { type: 'sensor', entity_id: sensorId, to_state: cat === 'contact' ? 'open' : 'on' },
            actions: [
              { type: 'tts', text: `¡Atencion! Se ha detectado apertura en ${finalName}.` },
              { type: 'whatsapp', text: `🚨 ALERTA HABANA: Sensor ${finalName} activado en ${quickSensorRoom}.` }
            ]
          })
        });
      } else if (quickSensorAction === 'light') {
        const roomLights = allLightsList.filter(l => l.room === quickSensorRoom);
        if (roomLights.length > 0) {
          await fetch('/api/automations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Encender ${roomLights[0].name} con ${finalName}`,
              description: `Regla automatica de iluminacion`,
              icon: '💡',
              category: 'automation',
              enabled: true,
              trigger: { type: 'sensor', entity_id: sensorId, to_state: cat === 'contact' ? 'open' : 'on' },
              actions: [{ type: 'device', entity_id: roomLights[0].id, action: 'turn_on', duration_minutes: 3 }]
            })
          });
        }
      }

      setFeedback(`✅ Sensor '${finalName}' anadido e integrado con exito en ${quickSensorRoom}`);
      setSelectedUnassignedIeee('');
      setQuickSensorName('');
      fetchZ2MState();
      fetchSensors();
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Error adding detected sensor:', e);
    }
  };

  const handleDeleteSensor = async (sensorId, sensorName) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el sensor '${sensorName || sensorId}'?`)) return;
    try {
      const res = await fetch(`/api/sensors/${sensorId}`, { method: 'DELETE' });
      if (res.ok) {
        setSensorSuccessMsg(`🗑️ Sensor '${sensorName || sensorId}' eliminado del sistema.`);
        fetchSensors();
        setTimeout(() => setSensorSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error('Error deleting sensor:', e);
    }
  };

  const handleQuickAssignLightToSensor = async (s) => {
    const roomLights = allLightsList.filter(l => l.room === s.room);
    const targetLight = roomLights.length > 0 ? roomLights[0] : (allLightsList[0] || null);
    if (!targetLight) {
      setSensorSuccessMsg(`⚠️ No hay luces registradas en ${s.room || 'la vivienda'} para vincular.`);
      setTimeout(() => setSensorSuccessMsg(null), 3000);
      return;
    }

    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Auto-Encendido: ${targetLight.name} por ${s.name}`,
          description: `Enciende la luz al detectar presencia/apertura y apaga tras 3 minutos de inactividad`,
          icon: '💡',
          category: 'automation',
          enabled: true,
          trigger: {
            type: 'sensor',
            entity_id: s.id,
            to_state: s.category === 'contact' ? 'open' : 'on'
          },
          actions: [
            {
              type: 'device',
              entity_id: targetLight.id,
              action: 'turn_on',
              duration_minutes: 3
            }
          ]
        })
      });
      setSensorSuccessMsg(`✨ Automatización vinculada: '${s.name}' encenderá '${targetLight.name}' automáticamente.`);
      setTimeout(() => setSensorSuccessMsg(null), 3500);
    } catch (e) {
      console.error('Error creating sensor light automation:', e);
    }
  };

  const handleQuickAssignAlarmToSensor = async (s) => {
    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Disuasión Alarma: ${s.name}`,
          description: `Dispara advertencia por voz y aviso a WhatsApp al detectar intrusión`,
          icon: '🚨',
          category: 'safety',
          enabled: true,
          trigger: {
            type: 'sensor',
            entity_id: s.id,
            to_state: s.category === 'contact' ? 'open' : 'on'
          },
          actions: [
            {
              type: 'tts',
              text: `Atención: Detección de seguridad en ${s.room || 'la vivienda'} por ${s.name}.`
            },
            {
              type: 'whatsapp',
              text: `🚨 SEGURIDAD HABANA: ${s.name} activado en ${s.room}.`
            }
          ]
        })
      });
      setSensorSuccessMsg(`🛡️ Regla de seguridad vinculada: '${s.name}' disparará advertencia de intrusión.`);
      setTimeout(() => setSensorSuccessMsg(null), 3500);
    } catch (e) {
      console.error('Error creating sensor alarm automation:', e);
    }
  };

  useEffect(() => {
    fetchZ2MState();
    fetchRoomSummary(selectedRoom);
    fetchSensors();
    fetchAllLights();
    const interval = setInterval(() => {
      fetchZ2MState();
      fetchSensors();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedRoom]);
  

  const renderVisualSensorStatus = (sensor) => {
    const isBinary = ['contact', 'presence', 'water', 'smoke_gas'].includes(sensor.category) ||
      ['door_window', 'door', 'contact', 'pir', 'motion', 'occupancy', 'water_leak', 'smoke_detector', 'camera_ai'].includes(sensor.type);

    if (isBinary) {
      let isOn = false;
      let label = '';
      let icon = '';
      let color = '#34d399';
      let badgeText = '';

      if (sensor.category === 'contact' || sensor.type === 'door_window' || sensor.type === 'door') {
        const isOpen = sensor.state === 'open' || String(sensor.value || '').toLowerCase().includes('abiert');
        isOn = isOpen;
        label = isOpen ? 'ABIERTA' : 'CERRADA';
        icon = isOpen ? '🚪⚡' : '🔒';
        color = isOpen ? '#ef4444' : '#10b981';
        badgeText = isOpen ? '🚨 PUERTA ABIERTA' : '🟢 CERRADA Y SEGURA';
      } else if (sensor.category === 'water' || sensor.type === 'water_leak') {
        const isLeak = sensor.state === 'leak' || String(sensor.value || '').toLowerCase().includes('fuga');
        isOn = isLeak;
        label = isLeak ? '¡FUGA DETECTADA!' : 'SECO';
        icon = isLeak ? '💧⚠️' : '🛡️';
        color = isLeak ? '#ef4444' : '#00f3ff';
        badgeText = isLeak ? '🚨 ALARMA AGUA' : '💧 ESTADO NORMAL';
      } else if (sensor.category === 'smoke_gas' || sensor.type === 'smoke_detector') {
        const isAlarm = sensor.state === 'alarm' || String(sensor.value || '').toLowerCase().includes('humo');
        isOn = isAlarm;
        label = isAlarm ? '¡HUMO DETECTADO!' : 'DESPEJADO';
        icon = isAlarm ? '🔥' : '🛡️';
        color = isAlarm ? '#ef4444' : '#10b981';
        badgeText = isAlarm ? '🚨 ALARMA HUMO' : '🟢 AIRE LIMPIO';
      } else {
        const isPres = sensor.state === 'on' || String(sensor.value || '').toLowerCase().includes('presencia') || String(sensor.value || '').toLowerCase().includes('movimiento');
        isOn = isPres;
        label = isPres ? 'PRESENCIA ACTIVA' : 'DESPEJADO';
        icon = isPres ? '🚶‍♂️✨' : '⚪';
        color = isPres ? '#00f3ff' : '#64748b';
        badgeText = isPres ? '⚡ DETECTADO' : '💤 REPOSO';
      }

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '10px',
          background: isOn ? `${color}18` : 'rgba(2, 6, 23, 0.75)',
          border: `1.5px solid ${color}`,
          boxShadow: isOn ? `0 0 16px ${color}35` : 'none',
          transition: 'all 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 12px ${color}, inset 0 0 4px #fff`,
              animation: isOn ? 'pulse 1.2s infinite' : 'none',
              border: '2px solid rgba(255,255,255,0.4)',
              flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                INDICADOR EN VIVO
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 900, color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            </div>
          </div>
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 800,
            background: `${color}25`,
            color,
            border: `1px solid ${color}`
          }}>
            {badgeText}
          </span>
        </div>
      );
    } else {
      const attrs = sensor.attributes || {};
      const isPlant = sensor.category === 'plant' || sensor.type === 'soil_sensor' || attrs.soil_moisture !== undefined;
      const isClimate = sensor.category === 'climate' || sensor.type === 'climate' || sensor.type === 'temp_humidity' || (attrs.temperature !== undefined && attrs.humidity !== undefined && !isPlant);

      if (isClimate) {
        const temp = attrs.temperature !== undefined ? attrs.temperature : 22.2;
        const hum = attrs.humidity !== undefined ? attrs.humidity : 57.5;
        const isComfort = temp >= 18 && temp <= 27 && hum >= 40 && hum <= 60;
        const climateColor = isComfort ? '#00f3ff' : (temp > 28 ? '#ef4444' : '#fbbf24');

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.9))',
            border: `1.5px solid ${climateColor}60`,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: `0 0 20px ${climateColor}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>🌡️</span>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                    {sensor.name || 'Clima Interior Sonoff'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                    {sensor.room ? `${sensor.room.toUpperCase()} · ` : ''}Termohigrómetro LCD SNZB-02D
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {sensor.battery !== undefined && (
                  <span style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #10b981' }}>
                    🔋 {sensor.battery}%
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                  {temp} °C
                </div>
                <div style={{ fontSize: '0.64rem', color: temp < 18 ? '#38bdf8' : (temp > 28 ? '#f87171' : '#34d399'), fontWeight: 700, marginTop: '2px' }}>
                  {temp < 18 ? '❄️ Fresco' : (temp > 28 ? '🔥 Caluroso' : '✨ Confort')}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#00f3ff', marginTop: '2px' }}>
                  {hum} %
                </div>
                <div style={{ fontSize: '0.64rem', color: hum < 40 ? '#f59e0b' : (hum > 60 ? '#38bdf8' : '#34d399'), fontWeight: 700, marginTop: '2px' }}>
                  {hum < 40 ? 'Seco' : (hum > 60 ? 'Húmedo' : '🌿 Óptima')}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (isPlant) {
        const moist = attrs.soil_moisture !== undefined ? attrs.soil_moisture : (
          parseInt(String(sensor.value || '').match(/(\d+)\s*%/)?.[1]) || 0
        );
        const temp = attrs.temperature !== undefined ? attrs.temperature : (
          parseFloat(String(sensor.value || '').match(/(\d+(?:\.\d+)?)\s*°?C/i)?.[1]) || 22
        );
        const isDry = moist < 15;
        const isWet = moist > 65;
        const plantColor = isDry ? '#ef4444' : (isWet ? '#38bdf8' : '#34d399');
        const plantStatus = isDry ? '🥀 TIERRA SECA' : (isWet ? '💧 SUELO MUY HÚMEDO' : '🌿 HUMEDAD ÓPTIMA');

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.9))',
            border: `1.5px solid ${plantColor}60`,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: `0 0 20px ${plantColor}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🪴</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: plantColor, letterSpacing: '0.04em' }}>
                  {plantStatus}
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: `${plantColor}20`,
                color: plantColor,
                border: `1px solid ${plantColor}50`,
                fontWeight: 800
              }}>
                SUSTRATO & RAÍZ
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad del Suelo</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isDry ? '#ef4444' : '#34d399', fontFamily: 'monospace', marginTop: '2px' }}>
                  {moist} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>%</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura del Sustrato</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', marginTop: '2px' }}>
                  {temp} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>°C</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
      const isAirMulti = sensor.category === 'air' || (attrs && (attrs.pm25 !== undefined || attrs.co2 !== undefined || attrs.voc !== undefined || attrs.formaldehyd !== undefined));

      if (isAirMulti) {
        const co2 = attrs.co2 ?? attrs.co2_ppm;
        const pm25 = attrs.pm25 ?? attrs.pm25_ug_m3;
        const voc = attrs.voc ?? attrs.voc_index;
        const formol = attrs.formaldehyd ?? attrs.formaldehyde;
        const temp = attrs.temperature ?? attrs.temperature_c;
        const hum = attrs.humidity ?? attrs.humidity_pct;

        let airQualityColor = '#34d399';
        let airQualityText = 'AIRE EXCELENTE';
        let airQualityIcon = '🌱';

        if ((co2 && co2 > 1200) || (pm25 && pm25 > 75) || (formol && formol > 80)) {
          airQualityColor = '#ef4444';
          airQualityText = 'VENTILACIÓN URGENTE';
          airQualityIcon = '⚠️';
        } else if ((co2 && co2 > 900) || (pm25 && pm25 > 45) || (voc && voc > 300)) {
          airQualityColor = '#f59e0b';
          airQualityText = 'CALIDAD MODERADA';
          airQualityIcon = '💨';
        }

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.85), rgba(15, 23, 42, 0.85))',
            border: `1.5px solid ${airQualityColor}60`,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: `0 0 20px ${airQualityColor}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>{airQualityIcon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Calidad del Aire (6 en 1)
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: airQualityColor,
                background: `${airQualityColor}22`,
                padding: '3px 10px',
                borderRadius: '6px',
                border: `1px solid ${airQualityColor}70`
              }}>
                {airQualityText}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🍃 CO₂</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (co2 && co2 > 1000) ? '#f59e0b' : '#34d399', fontFamily: 'monospace' }}>
                  {co2 !== null && co2 !== undefined ? `${co2}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>ppm</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🌫️ PM2.5</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (pm25 && pm25 > 50) ? '#f59e0b' : '#38bdf8', fontFamily: 'monospace' }}>
                  {pm25 !== undefined ? `${pm25}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>µg/m³</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🧪 VOC</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#a78bfa', fontFamily: 'monospace' }}>
                  {voc !== undefined ? `${voc}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>ppb</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🧫 Formol</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (formol && formol > 60) ? '#f59e0b' : '#00f3ff', fontFamily: 'monospace' }}>
                  {formol !== undefined ? `${formol}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>µg/m³</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temp</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {temp !== undefined ? `${temp}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>°C</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {hum !== undefined ? `${hum}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>%</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      let rawVal = String(sensor.value || '0');
      let num = parseFloat(rawVal.replace(/[^\d.-]/g, '')) || 0;
      let unit = rawVal.replace(/[\d.-]/g, '').trim() || (sensor.category === 'air' ? '°C' : (sensor.category === 'power' ? 'V' : 'lux'));
      let gaugePercent = 50;
      let qualityColor = '#00f3ff';
      let qualityText = 'ÓPTIMO';

      if (sensor.category === 'air' || sensor.type === 'climate') {
        if (unit.includes('ppm') || rawVal.includes('ppm')) {
          gaugePercent = Math.min(100, Math.max(10, (num / 1500) * 100));
          qualityColor = num > 1000 ? '#f59e0b' : '#34d399';
          qualityText = num > 1000 ? 'VENTILAR' : 'EXCELENTE';
        } else {
          gaugePercent = Math.min(100, Math.max(10, ((num - 15) / 15) * 100));
          qualityColor = (num >= 20 && num <= 24) ? '#34d399' : '#38bdf8';
          qualityText = 'CONFORT';
        }
      } else if (sensor.category === 'power') {
        gaugePercent = Math.min(100, Math.max(10, (num / 250) * 100));
        qualityColor = (num >= 215 && num <= 245) ? '#34d399' : '#f59e0b';
        qualityText = 'ESTABLE';
      } else if (sensor.category === 'light_lux' || sensor.type === 'illuminance') {
        gaugePercent = Math.min(100, Math.max(5, (num / 800) * 100));
        qualityColor = num > 200 ? '#fbbf24' : '#60a5fa';
        qualityText = num > 200 ? 'LUZ DÍA' : 'PENUMBRA';
      }
      const subList = [];
      if (attrs.temperature !== undefined && !rawVal.includes('°C')) subList.push({ label: 'Temp', val: `${attrs.temperature} °C` });
      if (attrs.humidity !== undefined) subList.push({ label: 'Humedad', val: `${attrs.humidity}%` });
      if (attrs.co2 !== undefined) subList.push({ label: 'CO2', val: `${attrs.co2} ppm` });
      if (attrs.voltage !== undefined) subList.push({ label: 'Voltaje', val: `${attrs.voltage} V` });

      return (
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.8), rgba(15, 23, 42, 0.75))',
          border: '1.5px solid rgba(0, 243, 255, 0.35)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '0.64rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                PARÁMETRO NUMÉRICO
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                <span style={{ color: '#00f3ff' }}>{num}</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '4px', fontWeight: 700 }}>{unit}</span>
              </div>
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: qualityColor,
              background: `${qualityColor}20`,
              padding: '2px 8px',
              borderRadius: '6px',
              border: `1px solid ${qualityColor}`
            }}>
              {qualityText}
            </span>
          </div>

          <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${gaugePercent}%`,
              height: '100%',
              background: `linear-gradient(90deg, #00f3ff, ${qualityColor})`,
              borderRadius: '3px',
              transition: 'width 0.4s'
            }} />
          </div>

          {subList.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '3px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {subList.map((sb, sidx) => (
                <span key={sidx} style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                  <strong style={{ color: '#94a3b8' }}>{sb.label}:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{sb.val}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
  };


  // Permit Join Toggle
  const togglePermitJoin = async (duration = 240) => {
    const nextState = !permitJoinActive;
    try {
      await fetch('/api/z2m-hub/permit-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState, duration_seconds: duration, room: selectedRoom })
      });
      setPermitJoinActive(nextState);
      setPermitJoinCountdown(nextState ? duration : 0);
      if (nextState) {
        setFeedback('📡 Antena Zigbee abierta en modo emparejamiento. Pulsa 5s el botón del interruptor nuevo.');
      } else {
        setFeedback('🔒 Modo emparejamiento cerrado.');
      }
      setTimeout(() => setFeedback(null), 5000);
      fetchZ2MState();
    } catch (e) {
      console.error('Error toggling permit join:', e);
    }
  };

  // Identificar físicamente (Parpadeo)
  const handleIdentify = async (deviceKey) => {
    setIdentifyingDevice(deviceKey);
    try {
      await fetch('/api/z2m-hub/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: deviceKey })
      });
      setFeedback(`🔦 Destello de identificación enviado a ${deviceKey}`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error('Error identifying device:', e);
    } finally {
      setTimeout(() => setIdentifyingDevice(null), 1200);
    }
  };

  // Guardar y Bautizar Dispositivo Nuevo
  const handleSaveDeviceNaming = async () => {
    if (!namingDevice || !friendlyNameInput.trim()) return;

    try {
      const res = await fetch('/api/z2m-hub/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ieee: namingDevice.ieee,
          old_friendly_name: namingDevice.friendly_name,
          new_friendly_name: friendlyNameInput.trim(),
          display_name: displayNameInput.trim() || friendlyNameInput.trim(),
          room: deviceRoomInput,
          device_profile: deviceProfileInput
        })
      });

      if (res.ok) {
        setFeedback(`✅ Dispositivo guardado como '${displayNameInput.trim() || friendlyNameInput.trim()}' en ${deviceRoomInput}`);
        setNamingDevice(null);
        fetchZ2MState();
        fetchRoomSummary(selectedRoom);
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error('Error saving device assignment:', e);
    }
  };

  // Radar de escucha para el Paso 2 (Toca y Listo)
  const startListening = async (room) => {
    setIsListening(true);
    setDetectedEvent(null);
    try {
      await fetch('/api/setup-wizard/listen/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room })
      });
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(pollEvent, 500);
    } catch (e) {
      console.error('Error starting wizard listen:', e);
    }
  };

  const clearDetectedEvent = async () => {
    setDetectedEvent(null);
    try {
      await fetch('/api/setup-wizard/listen/clear', { method: 'POST' });
    } catch (e) {
      // ignore
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    try {
      await fetch('/api/setup-wizard/listen/stop', { method: 'POST' });
    } catch (e) {
      console.error('Error stopping wizard listen:', e);
    }
  };

  const pollEvent = async () => {
    try {
      const res = await fetch('/api/setup-wizard/listen/poll');
      if (res.ok) {
        const data = await res.json();
        if (data.latest_event) {
          setDetectedEvent(data.latest_event);
        }
      }
    } catch (e) {
      console.error('Error polling wizard:', e);
    }
  };

  // Guardar luz real
  const handleAssignRealLight = async () => {
    if (!detectedEvent || !lightName.trim()) return;

    try {
      const res = await fetch('/api/setup-wizard/assign-real-light', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: selectedRoom,
          light_name: lightName.trim(),
          kind: lightKind,
          device_name: detectedEvent.device_name,
          channel: detectedEvent.channel,
          watts: lightKind === 'led_strip' ? 24 : 18
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCreatedLight({ id: data.light_id, name: lightName.trim() });
        setFeedback(`✨ Luz '${lightName.trim()}' vinculada al cable de potencia`);
        clearDetectedEvent();
        setWizardStep(3); // Pasar a conmutadas
        fetchRoomSummary(selectedRoom);
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error('Error saving real light:', e);
    }
  };

  // Añadir conmutada
  const handleAddCommutation = async () => {
    if (!detectedEvent || !activeCreatedLight) return;

    try {
      const res = await fetch('/api/setup-wizard/add-commutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          light_id: activeCreatedLight.id,
          device_name: detectedEvent.device_name,
          channel: detectedEvent.channel
        })
      });

      if (res.ok) {
        setFeedback(`🔀 Interruptor conmutado añadido a '${activeCreatedLight.name}'`);
        clearDetectedEvent();
        fetchRoomSummary(selectedRoom);
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error('Error adding commutation:', e);
    }
  };

  // Probar luz encendiendo/apagando
  const handleTestLight = async (lightId) => {
    try {
      await fetch(`/api/z2m-hub/control/light`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ light_id: lightId, action: 'toggle' })
      });
      fetchRoomSummary(selectedRoom);
    } catch (e) {
      console.error('Error testing light:', e);
    }
  };

  const handleFinishWizard = () => {
    stopListening();
    setWizardStep(1);
    setDetectedEvent(null);
    setActiveCreatedLight(null);
    setLightName('');
    fetchRoomSummary(selectedRoom);
  };

  const currentRoomObj = ROOMS.find(r => r.id === selectedRoom) || ROOMS[0];

  return (
    <div style={{
      background: 'rgba(5, 10, 25, 0.96)',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc'
    }}>
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px', height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            🏗️
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.5px', color: '#00f3ff' }}>
              Asistente de Puesta en Marcha (Obra Nueva / Casa Vacía)
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Desde el cable pelado hasta la vivienda funcionando: Empareja, bautiza interruptores en pared y enlaza luces y sensores sin tocar código.
            </p>
          </div>
        </div>

        {/* Botón Maestro de Emparejamiento (Permit Join) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => togglePermitJoin(240)}
            style={{
              padding: '10px 18px',
              borderRadius: '24px',
              background: permitJoinActive ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: `1px solid ${permitJoinActive ? '#ef4444' : '#10b981'}`,
              color: permitJoinActive ? '#ef4444' : '#fff',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: permitJoinActive ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(16, 185, 129, 0.35)'
            }}
          >
            <span style={{ fontSize: '1rem', animation: permitJoinActive ? 'pulse 1s infinite' : 'none' }}>
              {permitJoinActive ? '🛑 CERRAR RED ZIGBEE' : '📡 ABRIR RED ZIGBEE (EMPAREJAR)'}
            </span>
            {permitJoinActive && permitJoinCountdown > 0 && (
              <span style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '12px' }}>
                {Math.floor(permitJoinCountdown / 60)}:{(permitJoinCountdown % 60).toString().padStart(2, '0')}
              </span>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          background: 'rgba(0, 243, 255, 0.12)',
          border: '1px solid #00f3ff',
          color: '#00f3ff',
          padding: '8px 16px',
          borderRadius: '10px',
          fontSize: '0.82rem',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          {feedback}
        </div>
      )}

      {/* 4 Pestañas Principales del Proceso de Instalación */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('pairing')}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: activeTab === 'pairing' ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.7)',
            border: `1px solid ${activeTab === 'pairing' ? '#00f3ff' : 'rgba(255,255,255,0.08)'}`,
            color: activeTab === 'pairing' ? '#00f3ff' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📡</span>
          <span>1. Bautizar Dispositivos Nuevos</span>
          {unassignedDevices.length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
              {unassignedDevices.length} por bautizar
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('lights')}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: activeTab === 'lights' ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.7)',
            border: `1px solid ${activeTab === 'lights' ? '#00f3ff' : 'rgba(255,255,255,0.08)'}`,
            color: activeTab === 'lights' ? '#00f3ff' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>👆</span>
          <span>2. Asignar Luces y Conmutadas (Toca y Listo)</span>
        </button>

        <button
          onClick={() => setActiveTab('sensors')}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: activeTab === 'sensors' ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.7)',
            border: `1px solid ${activeTab === 'sensors' ? '#00f3ff' : 'rgba(255,255,255,0.08)'}`,
            color: activeTab === 'sensors' ? '#00f3ff' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🛡️</span>
          <span>3. Sensores Diversos (Presencia / Fuga / Clima)</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: activeTab === 'summary' ? 'rgba(0, 243, 255, 0.22)' : 'rgba(15, 23, 42, 0.7)',
            border: `1px solid ${activeTab === 'summary' ? '#00f3ff' : 'rgba(255,255,255,0.08)'}`,
            color: activeTab === 'summary' ? '#00f3ff' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🗺️</span>
          <span>4. Mapa y Resumen de la Vivienda</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: BAUTIZAR DISPOSITIVOS NUEVOS (OBRA NUEVA) */}
      {/* ============================================================== */}
      {activeTab === 'pairing' && (
        <div>
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡</span> ¿Cómo dar de alta dispositivos en una casa recién cableada?
            </h3>
            <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.6' }}>
              <li>Pulsa el botón verde <strong>ABRIR RED ZIGBEE</strong> arriba a la derecha.</li>
              <li>Ve al interruptor de la pared o sensor nuevo y <strong>mantén pulsado el botón 5 segundos</strong> hasta que parpadee su LED de emparejamiento.</li>
              <li>En 5-10 segundos aparecerá automáticamente en la bandeja de abajo.</li>
              <li>Pulsa <strong>🔦 Identificar</strong> para verificar físicamente cuál es y <strong>💾 Asignar</strong> para darle nombre y habitación.</li>
            </ol>
          </div>

          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📥</span> Bandeja de Dispositivos Recién Descubiertos ({unassignedDevices.length})
          </h4>

          {unassignedDevices.length === 0 ? (
            <div style={{
              padding: '30px',
              textAlign: 'center',
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#64748b',
              fontSize: '0.82rem',
              background: 'rgba(15, 23, 42, 0.4)'
            }}>
              {permitJoinActive ? (
                <div>
                  <div style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite', marginBottom: '8px' }}>📡</div>
                  <div style={{ color: '#00f3ff', fontWeight: '700' }}>Escuchando la red Zigbee...</div>
                  <div style={{ marginTop: '4px' }}>Pon la placa o sensor en modo emparejamiento (mantener pulsado 5s).</div>
                </div>
              ) : (
                <div>
                  <div>No hay dispositivos pendientes de bautizar.</div>
                  <div style={{ marginTop: '4px', color: '#94a3b8' }}>Pulsa el botón verde de arriba para abrir la red y buscar nuevos.</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {unassignedDevices.map((d, idx) => (
                <div
                  key={d.ieee || idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#38bdf8' }}>
                      {d.friendly_name || d.ieee}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '8px' }}>
                      {d.model || 'Dispositivo Zigbee'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>
                    IEEE: {d.ieee}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={() => handleIdentify(d.friendly_name || d.ieee)}
                      disabled={identifyingDevice === (d.friendly_name || d.ieee)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {identifyingDevice === (d.friendly_name || d.ieee) ? '⏳ Destellando...' : '🔦 Identificar'}
                    </button>
                    <button
                      onClick={() => {
                        setNamingDevice(d);
                        setFriendlyNameInput(d.friendly_name || `placa_${Date.now().toString().slice(-4)}`);
                        setDisplayNameInput('');
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                        border: 'none',
                        color: '#000',
                        fontWeight: '800',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      💾 Asignar y Nombrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Bautismo de Dispositivo */}
          {namingDevice && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              backdropFilter: 'blur(6px)'
            }}>
              <div style={{
                background: 'rgba(10, 18, 35, 0.98)',
                border: '1px solid rgba(0, 243, 255, 0.4)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '440px',
                width: '90%',
                boxShadow: '0 12px 40px rgba(0,0,0,0.85)'
              }}>
                <h3 style={{ margin: '0 0 14px 0', color: '#00f3ff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💾</span> Bautizar Dispositivo en la Casa
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                    ¿En qué habitación has colocado este dispositivo?
                  </label>
                  <select
                    value={deviceRoomInput}
                    onChange={(e) => setDeviceRoomInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  >
                    {ROOMS.map(r => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Tipo de Dispositivo Físico
                  </label>
                  <select
                    value={deviceProfileInput}
                    onChange={(e) => setDeviceProfileInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="plate_1g">🔘 Interruptor de Pared (1 Botón)</option>
                    <option value="plate_2g">🔘🔘 Placa de Pared (2 Botones)</option>
                    <option value="plate_3g">🔘🔘🔘 Placa de Pared (3 Botones)</option>
                    <option value="dimmer_seq">🎛️ Secuenciador Dimmer (Giratorio/Pulsador)</option>
                    <option value="led_controller">✨ Controlador Tira LED</option>
                    <option value="cover">🪟 Motor de Persiana</option>
                    <option value="sensor_motion">🚶 Sensor de Presencia / Movimiento</option>
                    <option value="sensor_door">🚪 Sensor de Puerta / Ventana</option>
                    <option value="sensor_water">💧 Sensor de Fuga de Agua</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Nombre Amigable (¿Dónde está ubicado?)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Placa Entrada Salón, Sensor Puerta Principal"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                    Identificador Técnico Zigbee
                  </label>
                  <input
                    type="text"
                    value={friendlyNameInput}
                    onChange={(e) => setFriendlyNameInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#040714',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.75rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setNamingDevice(null)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#94a3b8',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDeviceNaming}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    💾 Guardar en HABANA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: ASIGNAR LUCES Y CONMUTADAS (TOCA Y LISTO) */}
      {/* ============================================================== */}
      {activeTab === 'lights' && (
        <div>
          {/* Selector de Estancias */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '18px' }}>
            {ROOMS.map(r => {
              const isSelected = selectedRoom === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoom(r.id);
                    if (wizardStep !== 1) handleFinishWizard();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '24px',
                    background: isSelected ? `linear-gradient(135deg, ${r.color}33, ${r.color}11)` : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${isSelected ? r.color : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? r.color : '#94a3b8',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{r.icon}</span>
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            {wizardStep === 1 && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>{currentRoomObj.icon}</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>
                  Vincular una nueva luz en {currentRoomObj.name}
                </h3>
                <p style={{ margin: '0 auto 18px auto', maxWidth: '480px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Pulsa el botón de abajo, ve a la pared y aprieta el interruptor físico que enciende la bombilla directamente por cable.
                </p>
                <button
                  onClick={() => {
                    setWizardStep(2);
                    startListening(selectedRoom);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 28px',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0, 243, 255, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>👆</span> Iniciar Asistente (Tocar en la pared)
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38bdf8' }}>
                    PASO 1: Interruptor del Cable de Luz Real
                  </div>
                  <button
                    onClick={handleFinishWizard}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    ✕ Cancelar
                  </button>
                </div>

                {!detectedEvent ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '30px 10px',
                    border: '2px dashed rgba(0, 243, 255, 0.3)',
                    borderRadius: '12px',
                    background: 'rgba(0, 243, 255, 0.03)'
                  }}>
                    <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>📡</div>
                    <h4 style={{ margin: '12px 0 6px 0', fontSize: '1rem', color: '#00f3ff' }}>
                      Escuchando en vivo... Ve a la pared y pulsa el interruptor
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                      Aprieta la tecla física conectada a la bombilla de {currentRoomObj.name}.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: '12px',
                    padding: '18px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.4rem' }}>✨</span>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#10b981' }}>
                          ¡Pulsación física detectada!
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Placa: <strong>{detectedEvent.device_display_name}</strong> · Botón: <strong>{detectedEvent.channel_label}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                          ¿Cómo quieres llamar a esta luz?
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Luz Techo, Mesa Comedor..."
                          value={lightName}
                          onChange={(e) => setLightName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            background: '#090f1f',
                            border: '1px solid rgba(0, 243, 255, 0.3)',
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                          Tipo de Iluminación
                        </label>
                        <select
                          value={lightKind}
                          onChange={(e) => setLightKind(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            background: '#090f1f',
                            border: '1px solid rgba(0, 243, 255, 0.3)',
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="ceiling">💡 Luz Techo</option>
                          <option value="led_strip">✨ Tira LED</option>
                          <option value="dimmer">🎛️ Regulable (Dimmer)</option>
                          <option value="ambient">🕯️ Ambiente</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => clearDetectedEvent()}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#94a3b8',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        Volver a pulsar
                      </button>
                      <button
                        onClick={handleAssignRealLight}
                        disabled={!lightName.trim()}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: lightName.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155',
                          color: lightName.trim() ? '#fff' : '#64748b',
                          border: 'none',
                          fontWeight: '700',
                          cursor: lightName.trim() ? 'pointer' : 'not-allowed',
                          fontSize: '0.82rem'
                        }}
                      >
                        💾 Guardar y Configurar Conmutadas
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#a855f7' }}>
                      PASO 2: ¿Tiene Conmutadas? ({activeCreatedLight?.name})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Pulsa en la pared los otros interruptores (junto al sofá, pasillo o cama) que también deban encender esta luz.
                    </div>
                  </div>
                  <button
                    onClick={handleFinishWizard}
                    style={{
                      background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✔️ Finalizar Luz
                  </button>
                </div>

                {detectedEvent ? (
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid #a855f7',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>
                      Pulsación detectada: {detectedEvent.device_display_name} · {detectedEvent.channel_label}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      ¿Deseas vincular este interruptor como conmutada de '{activeCreatedLight?.name}'?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleAddCommutation}
                        style={{
                          background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        🔀 Vincular como Conmutada
                      </button>
                      <button
                        onClick={() => clearDetectedEvent()}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: '#94a3b8',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '20px',
                    border: '1px dashed rgba(168, 85, 247, 0.35)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: 'rgba(168, 85, 247, 0.03)'
                  }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>👆</div>
                    <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: '600' }}>
                      Pulsa el segundo interruptor en la pared...
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      (O pulsa "Finalizar Luz" arriba si no tiene más conmutadas)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: SENSORES DIVERSOS (PRESENCIA, PUERTAS, AGUA, CLIMA) */}
      {/* ============================================================== */}
      {activeTab === 'sensors' && (
        <div>
          {/* Cabecera con Botón de Alta Rápida */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span> Integración y Declaración Rápida de Sensores
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Declara sensores físicos o futuros (radares mmWave, movimiento PIR, magnéticos de puerta/ventana, inundación o clima).
                El sistema los vincula automáticamente con Zigbee2MQTT y genera sus reglas inteligentes de luz y alarma.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setNewSensorData({
                    name: '',
                    category: 'presence',
                    type: 'pir',
                    room: selectedRoom || 'salon',
                    protocol: 'zigbee2mqtt',
                    installed: true,
                    friendly_name: '',
                    ieee: '',
                    autoAction: 'light'
                  });
                  setShowAddSensorModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(16, 185, 129, 0.35))',
                  border: '1.5px solid #00f3ff',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'
                }}
              >
                <span>✨</span> + Declarar / Añadir Nuevo Sensor
              </button>
            </div>
          </div>

          {sensorSuccessMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '10px 16px', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 700, marginBottom: '16px' }}>
              {sensorSuccessMsg}
            </div>
          )}

          {/* Desplegable Directo de Sensores Detectados */}
          {unassignedDevices.length > 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(0, 243, 255, 0.12))',
              border: '2px solid #00f3ff',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '20px',
              boxShadow: '0 0 24px rgba(0, 243, 255, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.6rem' }}>✨</span>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00f3ff', letterSpacing: '0.5px' }}>
                      DESPLEGABLE: ¡NUEVO SENSOR ZIGBEE DETECTADO! ({unassignedDevices.length})
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      Selecciona el sensor en el desplegable, asígnale nombre y habitación, y pulsa <strong>➕ Añadir Sensor</strong>:
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 800, display: 'block', marginBottom: '5px' }}>
                    1. Desplegable de Sensores Detectados:
                  </label>
                  <select
                    value={selectedUnassignedIeee || (unassignedDevices[0]?.ieee || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedUnassignedIeee(val);
                      const d = unassignedDevices.find(x => (x.ieee || x.friendly_name) === val);
                      if (d) {
                        const isDoor = d.profile === 'sensor_door' || String(d.model || '').toLowerCase().includes('snzb') || String(d.model || '').toLowerCase().includes('puerta');
                        setQuickSensorType(isDoor ? 'sensor_door' : (d.profile || 'sensor_door'));
                        setQuickSensorName(isDoor ? `Sonoff Puerta ${(ROOMS.find(r => r.id === quickSensorRoom)?.name || 'Entrada')}` : (d.name || d.friendly_name));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#091326',
                      border: '1.5px solid #00f3ff',
                      color: '#00f3ff',
                      fontSize: '0.84rem',
                      fontWeight: 800
                    }}
                  >
                    {unassignedDevices.map((d, i) => (
                      <option key={d.ieee || i} value={d.ieee || d.friendly_name}>
                        📡 {d.friendly_name || d.ieee} ({d.model || 'Sensor Zigbee'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    2. Tipo de Sensor:
                  </label>
                  <select
                    value={quickSensorType}
                    onChange={(e) => setQuickSensorType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="sensor_door">🚪 Puerta / Ventana (Sonoff SNZB-04)</option>
                    <option value="sensor_air">🌱 Calidad de Aire / Clima (Tuya TS0601 6-en-1: CO2, PM2.5, VOC, Formol, Temp, Hum)</option>
                    <option value="sensor_motion">🚶 Presencia / Movimiento (PIR/Radar mmWave)</option>
                    <option value="sensor_water">💧 Fuga de Agua / Inundación</option>
                    <option value="sensor_smoke">🔥 Detector Humo / Fuego</option>
                    <option value="sensor_lux">☀️ Luminosidad / Lux</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    3. Habitación / Ubicación:
                  </label>
                  <select
                    value={quickSensorRoom}
                    onChange={(e) => {
                      setQuickSensorRoom(e.target.value);
                      if (quickSensorType === 'sensor_door') {
                        setQuickSensorName(`Sonoff Puerta ${(ROOMS.find(r => r.id === e.target.value)?.name || 'Entrada')}`);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  >
                    {ROOMS.map(r => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    4. Nombre Amigable:
                  </label>
                  <input
                    type="text"
                    value={quickSensorName}
                    onChange={(e) => setQuickSensorName(e.target.value)}
                    placeholder="ej. Sonoff Puerta Entrada"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    5. Acción Inteligente:
                  </label>
                  <select
                    value={quickSensorAction}
                    onChange={(e) => setQuickSensorAction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="alarm">🚨 Alarma Intrusión (TTS + WhatsApp)</option>
                    <option value="light">💡 Encender Luz (3 min)</option>
                    <option value="none">📊 Solo Registrar Estado</option>
                  </select>
                </div>

                <div style={{ display: 'flex' }}>
                  <button
                    onClick={handleQuickAddDetectedSensor}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    ➕ Añadir Sensor Ahora
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#94a3b8'
            }}>
              <span>📡 No hay sensores pendientes de bautizar en este instante. Si acabas de emparejar uno, pulsa <em>'Abrir Red Zigbee'</em> arriba.</span>
            </div>
          )}

          {/* Plantillas Rápidas con 1 Clic para Obra Nueva */}
          <div style={{
            background: 'rgba(10, 18, 38, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Plantillas Rápidas (1 Clic para desplegar):
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { name: `Sonoff SNZB-04 Puerta ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Entrada'}`, category: 'contact', type: 'door_window', icon: '🚪' },
                { name: `Radar Presencia ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Salón'}`, category: 'presence', type: 'mmwave_radar', icon: '📡' },
                { name: `PIR Movimiento ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Salón'}`, category: 'presence', type: 'pir', icon: '🚶' },
                { name: `Sensor Puerta ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Entrada'}`, category: 'contact', type: 'door_window', icon: '🚪' },
                { name: `Sensor Ventana ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Salón'}`, category: 'contact', type: 'door_window', icon: '🪟' },
                { name: `Detector Fuga ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Cocina'}`, category: 'water', type: 'water_leak', icon: '💧' },
                { name: `Sensor Humo ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Cocina'}`, category: 'smoke_gas', type: 'smoke_detector', icon: '🔥' },
                { name: `Termohigrómetro ${ROOMS.find(r => r.id === selectedRoom)?.name || 'Salón'}`, category: 'air', type: 'climate', icon: '🌡️' }
              ].map((template, tIdx) => (
                <button
                  key={tIdx}
                  onClick={() => {
                    setNewSensorData({
                      name: template.name,
                      category: template.category,
                      type: template.type,
                      room: selectedRoom,
                      protocol: 'zigbee2mqtt',
                      installed: true,
                      friendly_name: '',
                      ieee: '',
                      autoAction: template.category === 'contact' ? 'alarm' : (template.category === 'presence' ? 'light' : 'notify')
                    });
                    setShowAddSensorModal(true);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(0, 243, 255, 0.25)',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Sensores Registrados */}
          {sensorsList.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              No hay sensores registrados todavía. Usa el botón <strong>+ Declarar / Añadir Nuevo Sensor</strong> o pulsa una de las plantillas rápidas para darlo de alta en 10 segundos.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '14px' }}>
              {sensorsList.map((s, idx) => {
                const isPresence = s.category === 'presence';
                const isContact = s.category === 'contact';
                const isWater = s.category === 'water';
                const isAlert = s.state === 'leak' || s.state === 'alarm' || s.state === 'open' || (isPresence && s.state === 'on');

                return (
                  <div
                    key={s.id || idx}
                    style={{
                      background: isAlert
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.9))'
                        : 'rgba(15, 23, 42, 0.75)',
                      border: isAlert
                        ? '1.5px solid #fbbf24'
                        : `1px solid ${s.installed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(168, 85, 247, 0.35)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: isAlert ? '0 0 16px rgba(251, 191, 36, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.6rem' }}>
                          {s.category === 'plant' || s.type === 'soil_sensor' ? '🪴' :
                           s.type === 'motion' || s.type === 'occupancy' || s.type === 'pir' ? '🚶' :
                           s.type === 'mmwave_radar' ? '📡' :
                           s.type === 'door' || s.type === 'contact' || s.type === 'door_window' ? '🚪' :
                           s.type === 'water_leak' ? '💧' :
                           s.type === 'smoke_detector' ? '🔥' :
                           s.type === 'illuminance' ? '☀️' : '🌡️'}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                            {s.name || s.id}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                            Estancia: <strong style={{ color: '#38bdf8' }}>{(ROOMS.find(r => r.id === s.room)?.name || s.room || 'General').toUpperCase()}</strong> · {s.protocol || 'Zigbee'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: s.installed ? 'rgba(16, 185, 129, 0.22)' : 'rgba(168, 85, 247, 0.22)',
                          color: s.installed ? '#34d399' : '#e9d5ff',
                          border: `1px solid ${s.installed ? '#10b981' : '#c084fc'}`,
                          fontWeight: 800
                        }}>
                          {s.installed ? '🟢 EN VIVO' : '⏳ FUTURO'}
                        </span>

                        <span style={{
                          fontSize: '0.64rem',
                          color: isAlert ? '#fbbf24' : '#94a3b8',
                          fontWeight: 700
                        }}>
                          {s.value || s.state}
                        </span>
                      </div>
                    </div>

                    {/* Render Visual del Estado Real */}
                    {renderVisualSensorStatus(s)}

                    {/* Acciones Rápidas del Sensor */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Automatización Directa:</span>
                        <span style={{ color: '#00f3ff' }}>▶ 1 Clic</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleQuickAssignLightToSensor(s)}
                          style={{
                            background: 'rgba(0, 243, 255, 0.12)',
                            border: '1px solid rgba(0, 243, 255, 0.35)',
                            color: '#00f3ff',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Crea una regla para encender la luz de esta estancia al activarse"
                        >
                          💡 Vincular a Luz
                        </button>
                        <button
                          onClick={() => handleQuickAssignAlarmToSensor(s)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#ef4444',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Crea una regla de aviso por voz y WhatsApp ante intrusión"
                        >
                          🚨 Disuasión Alarma
                        </button>
                        <button
                          onClick={() => handleDeleteSensor(s.id, s.name)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            marginLeft: 'auto'
                          }}
                          title="Eliminar sensor"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal para Declarar Nuevo Sensor */}
          {showAddSensorModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              padding: '16px'
            }}>
              <div style={{
                background: 'linear-gradient(145deg, #091326 0%, #030814 100%)',
                border: '1.5px solid #00f3ff',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '540px',
                boxShadow: '0 0 35px rgba(0, 243, 255, 0.3)',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛡️</span> Declarar Nuevo Sensor en Vivienda
                  </h3>
                  <button
                    onClick={() => setShowAddSensorModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Guía rápida de emparejamiento Sonoff / Zigbee */}
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.74rem',
                    color: '#bae6fd',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>💡</span>
                    <div>
                      <strong>Emparejar Sonoff SNZB-04 (o similar Zigbee):</strong> Activa arriba a la derecha <em>'📡 Abrir Emparejamiento'</em>, introduce un clip en el orificio de reset del Sonoff durante <strong>5 segundos</strong> hasta que el LED parpadee 3 veces. Se detectará al instante.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                      Nombre del Sensor:
                    </label>
                    <input
                      type="text"
                      value={newSensorData.name}
                      onChange={(e) => setNewSensorData({ ...newSensorData, name: e.target.value })}
                      placeholder="Ej: Sonoff SNZB-04 Puerta Entrada, Radar Pasillo..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(0, 243, 255, 0.35)',
                        color: '#fff',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Selector o entrada manual de ID / Dispositivo Zigbee */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                      Dispositivo Físico Zigbee (Detectado o IEEE / Friendly Name):
                    </label>
                    {unassignedDevices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <select
                          value={newSensorData.ieee || ''}
                          onChange={(e) => {
                            const selectedIeee = e.target.value;
                            const dev = unassignedDevices.find(d => (d.ieee || d.friendly_name) === selectedIeee);
                            if (dev) {
                              const devFn = dev.friendly_name || dev.ieee;
                              const isSonoff = String(dev.model || '').toLowerCase().includes('snzb') || String(dev.description || '').toLowerCase().includes('snzb');
                              const autoName = isSonoff ? `Sonoff SNZB-04 Puerta ${ROOMS.find(r => r.id === newSensorData.room)?.name || 'Entrada'}` : (newSensorData.name || devFn);
                              setNewSensorData({
                                ...newSensorData,
                                ieee: dev.ieee || '',
                                friendly_name: devFn,
                                name: autoName,
                                category: 'contact',
                                type: 'door_window'
                              });
                            } else {
                              setNewSensorData({ ...newSensorData, ieee: selectedIeee, friendly_name: selectedIeee });
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38bdf8',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        >
                          <option value="">-- Seleccionar de dispositivos Zigbee detectados ({unassignedDevices.length}) --</option>
                          {unassignedDevices.map((d, i) => (
                            <option key={d.ieee || i} value={d.ieee || d.friendly_name}>
                              📡 {d.friendly_name || d.ieee} ({d.model || d.type || 'Dispositivo Zigbee'})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={newSensorData.friendly_name}
                      onChange={(e) => setNewSensorData({ ...newSensorData, friendly_name: e.target.value })}
                      placeholder="Identificador Z2M manual (ej: sonoff_puerta_entrada o IEEE 0x0012...)"
                      style={{
                        width: '100%',
                        marginTop: unassignedDevices.length > 0 ? '6px' : '0',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                        Tipo / Categoría:
                      </label>
                      <select
                        value={newSensorData.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          let defType = 'pir';
                          if (cat === 'contact') defType = 'door_window';
                          if (cat === 'water') defType = 'water_leak';
                          if (cat === 'smoke_gas') defType = 'smoke_detector';
                          if (cat === 'air') defType = 'climate';
                          if (cat === 'light_lux') defType = 'illuminance';
                          setNewSensorData({ ...newSensorData, category: cat, type: defType });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: '0.84rem'
                        }}
                      >
                        <option value="presence">🚶 Presencia / Movimiento</option>
                        <option value="contact">🚪 Puerta / Ventana (Contacto)</option>
                        <option value="water">💧 Inundación / Fuga de Agua</option>
                        <option value="smoke_gas">🔥 Humo / Gas</option>
                        <option value="air">🌡️ Temperatura / Humedad / CO2</option>
                        <option value="light_lux">☀️ Luz / Radiación Solar</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                        Estancia de la Vivienda:
                      </label>
                      <select
                        value={newSensorData.room}
                        onChange={(e) => setNewSensorData({ ...newSensorData, room: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: '0.84rem'
                        }}
                      >
                        {ROOMS.map(r => (
                          <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                        Protocolo de Conexión:
                      </label>
                      <select
                        value={newSensorData.protocol}
                        onChange={(e) => setNewSensorData({ ...newSensorData, protocol: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: '0.84rem'
                        }}
                      >
                        <option value="zigbee2mqtt">⚡ Zigbee 3.0 (Z2M Nativo)</option>
                        <option value="vision_ai">👁️ Cámara Visión IA (Sin hardware extra)</option>
                        <option value="shelly_modbus">⚡ Shelly / Modbus 230V</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                        Disponibilidad:
                      </label>
                      <select
                        value={newSensorData.installed ? 'yes' : 'no'}
                        onChange={(e) => setNewSensorData({ ...newSensorData, installed: e.target.value === 'yes' })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: '0.84rem'
                        }}
                      >
                        <option value="yes">🟢 Instalado y Activo Ahora</option>
                        <option value="no">⏳ Pre-configurado (Futura Instalación)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, display: 'block', marginBottom: '5px' }}>
                      Comportamiento Inteligente Inmediato:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'light', label: '💡 Encender Luz', desc: 'Prende la luz de la estancia al activarse' },
                        { id: 'alarm', label: '🚨 Seguridad', desc: 'Dispara advertencia si hay intrusión' },
                        { id: 'none', label: '📊 Solo Monitoreo', desc: 'Registra estado sin disparar reglas' }
                      ].map(opt => (
                        <div
                          key={opt.id}
                          onClick={() => setNewSensorData({ ...newSensorData, autoAction: opt.id })}
                          style={{
                            background: newSensorData.autoAction === opt.id ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                            border: `1.5px solid ${newSensorData.autoAction === opt.id ? '#00f3ff' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '10px',
                            padding: '10px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px' }}>{opt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      onClick={handleCreateNewSensor}
                      disabled={!newSensorData.name.trim()}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0284c7, #00f3ff)',
                        border: 'none',
                        color: '#020617',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        cursor: newSensorData.name.trim() ? 'pointer' : 'default',
                        opacity: newSensorData.name.trim() ? 1 : 0.5,
                        boxShadow: '0 0 18px rgba(0,243,255,0.4)'
                      }}
                    >
                      💾 Guardar e Integrar Sensor
                    </button>
                    <button
                      onClick={() => setShowAddSensorModal(false)}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.08)',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 4: MAPA Y RESUMEN DE LA VIVIENDA */}
      {/* ============================================================== */}
      {activeTab === 'summary' && (
        <div>
          {/* Selector de Estancias */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '18px' }}>
            {ROOMS.map(r => {
              const isSelected = selectedRoom === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoom(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '24px',
                    background: isSelected ? `linear-gradient(135deg, ${r.color}33, ${r.color}11)` : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${isSelected ? r.color : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? r.color : '#94a3b8',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{r.icon}</span>
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{currentRoomObj.icon}</span> Luces de {currentRoomObj.name} ({roomSummary.lights?.length || 0})
            </h3>
            <button
              onClick={() => fetchRoomSummary(selectedRoom)}
              style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              🔄 Refrescar
            </button>
          </div>

          {(!roomSummary.lights || roomSummary.lights.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '10px' }}>
              No hay luces configuradas en esta estancia todavía. Usa la pestaña "2. Asignar Luces y Conmutadas" para dar de alta la primera.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {roomSummary.lights.map((l) => (
                <div
                  key={l.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {l.kind === 'led_strip' ? '✨' : l.kind === 'dimmer' ? '🎛️' : '💡'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>{l.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>ID: {l.id}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTestLight(l.id)}
                      style={{
                        background: l.is_on ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${l.is_on ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                        color: l.is_on ? '#10b981' : '#94a3b8',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {l.is_on ? '🟢 ENCENDIDA' : '⚪ APAGADA'}
                    </button>
                  </div>

                  {/* Cable Físico */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>🔌</span>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>Cable Principal:</span>
                    <span style={{ color: '#cbd5e1' }}>
                      {l.power_switch?.plate_name} · {l.power_switch?.channel_label}
                    </span>
                  </div>

                  {/* Conmutadas */}
                  {l.commutations && l.commutations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {l.commutations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            background: 'rgba(168, 85, 247, 0.08)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>🔀</span>
                          <span style={{ color: '#c084fc', fontWeight: '600' }}>Conmutada #{cIdx + 1}:</span>
                          <span style={{ color: '#cbd5e1' }}>{c.plate_name} · {c.channel_label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

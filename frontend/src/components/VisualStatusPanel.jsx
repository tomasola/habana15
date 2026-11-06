import React, { useState, useEffect } from 'react';

import {

  Sprout, Sparkles, Power, Eye, Zap, Droplets, Wind, Sun, DoorClosed,

  Flame, Activity, Battery, Wifi, Settings, Edit3, Plus, Play,

  CheckCircle2, AlertTriangle, Sliders, Lightbulb, Shield, Trash2, X, Layers,

  Minimize2, Maximize2, Box, ChevronDown

} from 'lucide-react';

import AutomationEditModal from './AutomationEditModal';

const ROOM_LABELS = {

  all: '🏠 Toda la Casa',

  salon: '🛋️ Salón',

  andrea: '🛏️ Habitación Andrea',

  cocina: '🍳 Cocina',

  pasillo: '🚶 Pasillo',

  entrada: '🚪 Entrada / Recibidor',

  bano: '🚿 Baño',

  principal: '👑 Habitación Principal',

  terraza: '🌿 Terraza',

  general: '⚡ General'

};

const BUTTON_ICONS = ['⚡', '🎬', '🛋️', '🌅', '🌙', '🛡️', '⚫', '💡', '✨', '🔥', '🌿', '🚪', '🎉', '🕯️', '📹', '☀️'];

const BUTTON_COLORS = [

  { hex: '#00f3ff', label: 'Cyan Neón' },

  { hex: '#334155', label: 'Ámbar Cálido' },

  { hex: '#065f46', label: 'Verde Esmeralda' },

  { hex: '#a855f7', label: 'Violeta' },

  { hex: '#ef4444', label: 'Rojo Alerta' },

  { hex: '#ec4899', label: 'Rosa Cyber' },

  { hex: '#94a3b8', label: 'Gris Apagado' }

];

const DEFAULT_SENSORS = [

  { id: 'camara_sensor_pasillo', name: 'Cámara Visión Pasillo (Presencia Humana)', category: 'presence', value: 'Sin personas (Pet-Safe)', installed: true, room: 'pasillo', state: 'off' },

  { id: 'camara_sensor_salon', name: 'Cámara Visión Cam720 Salón (Presencia Humana)', category: 'presence', value: 'Sin personas (Pet-Safe)', installed: true, room: 'salon', state: 'off' },

  { id: 'sensor_sonoff_snzb-04_puerta_salon', name: 'Contacto Puerta Acceso', category: 'contact', value: 'Cerrada', installed: true, room: 'salon', state: 'closed' },

  { id: 'sensor_de_calidad_de_aire', name: 'Sensor de Calidad de Aire', category: 'air', value: '365 ppm', installed: true, room: 'general', state: 'normal' },

  { id: 'sensor_limonero', name: 'Sensor Limonero', category: 'plant', value: '0% humedad | 23°C', installed: true, room: 'exterior', state: 'normal' },

  { id: 'sensor_frutal', name: 'Sensor Frutal', category: 'plant', value: '76% humedad | 13°C', installed: true, room: 'exterior', state: 'normal' },

  { id: 'sensor_pulsador_4_botones', name: 'Pulsador Moes 4 Botones', category: 'button', value: 'Pulsación: 2_single', installed: true, room: 'salon', state: 'normal' },

  { id: 'sensor_temperatura', name: 'Termohigrometro Interior Sonoff SNZB-02D', category: 'climate', value: '19°C · 60.7% Hum', installed: true, room: 'despacho', state: 'normal' }

];

export default function VisualStatusPanel({

  API_BASE = '',

  devices: propDevices = [],

  onToggleDevice,

  onOpenAutomationsConfig,

  onOpenDigitalTwin

}) {

  const [devices, setDevices] = useState(propDevices || []);

  const [automations, setAutomations] = useState([]);

  const [customButtons, setCustomButtons] = useState([]);

  const [sensors, setSensors] = useState(DEFAULT_SENSORS);

  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'buttons' | 'lights' | 'sensors'

  const [lightFilter, setLightFilter] = useState('on'); // 'all' | 'on' | 'off'

  const [roomFilter, setRoomFilter] = useState('all');

  const [sensorFilter, setSensorFilter] = useState('installed'); // 'all' | 'installed' | 'future'

  const [showVisualIndicators, setShowVisualIndicators] = useState(true);

  const [isMinimalist, setIsMinimalist] = useState(() => {

    try {

      return localStorage.getItem('habana_visual_minimalist') === 'true';

    } catch(e) {

      return false;

    }

  });

  const [executingBtnId, setExecutingBtnId] = useState(null);

  const [togglingId, setTogglingId] = useState(null);

  const [editingButton, setEditingButton] = useState(null);

  const [editingAuto, setEditingAuto] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {

    setToast({ msg, type });

    setTimeout(() => setToast(null), 3400);

  };

  const fetchVisualData = async () => {

    try {

      const [resDev, resAuto, resSens, resWidgets] = await Promise.all([

        fetch(`${API_BASE}/api/devices?real_only=true`),

        fetch(`${API_BASE}/api/automations`),

        fetch(`${API_BASE}/api/sensors`),

        fetch(`${API_BASE}/api/widgets`)

      ]);

      if (resDev.ok) {

        const d = await resDev.json();

        if (Array.isArray(d)) setDevices(d);

      }

      if (resAuto.ok) {

        const a = await resAuto.json();

        setAutomations(a.automations || []);

      }

      if (resSens.ok) {

        const s = await resSens.json();

        // Deduplicar sensores por IEEE favoreciendo los instalados

        const rawSensors = s.sensors || [];

        const seenIeee = new Map();

        const dedupedSensors = [];

        for (const sen of rawSensors) {

          const ieee = (sen.ieee || '').trim().toLowerCase();

          if (ieee && ieee !== 'none') {

            if (seenIeee.has(ieee)) {

              const existingIdx = seenIeee.get(ieee);

              if (!dedupedSensors[existingIdx].installed && sen.installed) {

                dedupedSensors[existingIdx] = sen;

              }

              continue;

            }

            seenIeee.set(ieee, dedupedSensors.length);

          }

          dedupedSensors.push(sen);

        }

        setSensors(dedupedSensors);

      }

      if (resWidgets.ok) {

        const w = await resWidgets.json();

        setCustomButtons(w.widgets || []);

      }

    } catch (e) {

      console.error('Error actualizando panel VISUAL:', e);

    }

  };

  useEffect(() => {

    fetchVisualData();

    const timer = setInterval(fetchVisualData, 2500);

    return () => clearInterval(timer);

  }, []);

  

  const renderVisualSensorStatus = (sensor) => {

    const isBinary = ['contact', 'presence', 'water', 'smoke_gas'].includes(sensor.category) ||

      ['door_window', 'door', 'contact', 'pir', 'motion', 'occupancy', 'water_leak', 'smoke_detector', 'camera_ai'].includes(sensor.type);

    if (isBinary) {

      let isOn = false;

      let label = '';

      let icon = '';

      let color = '#065f46';

      let badgeText = '';

      if (sensor.category === 'contact' || sensor.type === 'door_window' || sensor.type === 'door') {

        const isOpen = sensor.state === 'open' || String(sensor.value || '').toLowerCase().includes('abiert');

        isOn = isOpen;

        label = isOpen ? 'ABIERTA' : 'CERRADA';

        icon = isOpen ? '🚪⚡' : '🔒';

        color = isOpen ? '#ef4444' : '#065f46';

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

        color = isAlarm ? '#ef4444' : '#065f46';

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

                INDICADOR ON / OFF

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

        const climateColor = isComfort ? '#00f3ff' : (temp > 28 ? '#ef4444' : '#334155');

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

                  <span style={{ fontSize: '0.68rem', color: '#065f46', background: 'rgba(6, 95, 70, 0.2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #065f46' }}>

                    🔋 {sensor.battery}%

                  </span>

                )}

              </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>

                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura</div>

                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#334155', marginTop: '2px' }}>

                  {temp} °C

                </div>

                <div style={{ fontSize: '0.64rem', color: temp < 18 ? '#38bdf8' : (temp > 28 ? '#f87171' : '#065f46'), fontWeight: 700, marginTop: '2px' }}>

                  {temp < 18 ? '❄️ Fresco' : (temp > 28 ? '🔥 Caluroso' : '✨ Confort')}

                </div>

              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>

                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>💧 Humedad</div>

                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#00f3ff', marginTop: '2px' }}>

                  {hum} %

                </div>

                <div style={{ fontSize: '0.64rem', color: hum < 40 ? '#334155' : (hum > 60 ? '#38bdf8' : '#065f46'), fontWeight: 700, marginTop: '2px' }}>

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

        const plantColor = isDry ? '#ef4444' : (isWet ? '#38bdf8' : '#065f46');

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

                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isDry ? '#ef4444' : '#065f46', fontFamily: 'monospace', marginTop: '2px' }}>

                  {moist} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>%</span>

                </div>

              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>

                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700 }}>🌡️ Temperatura del Sustrato</div>

                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#334155', fontFamily: 'monospace', marginTop: '2px' }}>

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

        let airQualityColor = '#065f46';

        let airQualityText = 'AIRE EXCELENTE';

        let airQualityIcon = '🌱';

        if ((co2 && co2 > 1200) || (pm25 && pm25 > 75) || (formol && formol > 80)) {

          airQualityColor = '#ef4444';

          airQualityText = 'VENTILACIÓN URGENTE';

          airQualityIcon = '⚠️';

        } else if ((co2 && co2 > 900) || (pm25 && pm25 > 45) || (voc && voc > 300)) {

          airQualityColor = '#334155';

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

                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (co2 && co2 > 1000) ? '#334155' : '#065f46', fontFamily: 'monospace' }}>

                  {co2 !== null && co2 !== undefined ? `${co2}` : '--'} <span style={{ fontSize: '0.6rem', color: '#64748b' }}>ppm</span>

                </div>

              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>

                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>🌫️ PM2.5</div>

                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (pm25 && pm25 > 50) ? '#334155' : '#38bdf8', fontFamily: 'monospace' }}>

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

                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: (formol && formol > 60) ? '#334155' : '#00f3ff', fontFamily: 'monospace' }}>

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

          qualityColor = num > 1000 ? '#334155' : '#065f46';

          qualityText = num > 1000 ? 'VENTILAR' : 'EXCELENTE';

        } else {

          gaugePercent = Math.min(100, Math.max(10, ((num - 15) / 15) * 100));

          qualityColor = (num >= 20 && num <= 24) ? '#065f46' : '#38bdf8';

          qualityText = 'CONFORT';

        }

      } else if (sensor.category === 'power') {

        gaugePercent = Math.min(100, Math.max(10, (num / 250) * 100));

        qualityColor = (num >= 215 && num <= 245) ? '#065f46' : '#334155';

        qualityText = 'ESTABLE';

      } else if (sensor.category === 'light_lux' || sensor.type === 'illuminance') {

        gaugePercent = Math.min(100, Math.max(5, (num / 800) * 100));

        qualityColor = num > 200 ? '#334155' : '#60a5fa';

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

  useEffect(() => {

    if (Array.isArray(propDevices) && propDevices.length > 0) {

      setDevices(propDevices);

    }

  }, [propDevices]);

  // Filtrar únicamente luces e interruptores reales (excluyendo persianas y sensores)

  const lightDevices = devices.filter(d => {

    const id = String(d.id || d.entity_id || '').toLowerCase();

    const name = String(d.name || '').toLowerCase();

    const type = String(d.type || d.domain || '').toLowerCase();

    if (

      type === 'sensor' ||

      type === 'binary_sensor' ||

      type === 'cover' ||

      id.startsWith('cover.') ||

      id.includes('persiana') ||

      name.includes('persiana')

    ) {

      return false;

    }

    return (

      type === 'light' ||

      type === 'switch' ||

      id.startsWith('luz_') ||

      id.startsWith('led_') ||

      id.includes('light') ||

      id.includes('interruptor')

    );

  });

  const isDeviceOn = (d) => {

    const st = String(d.state || '').toLowerCase();

    return st === 'on' || st === 'true';

  };

  const getDeviceRoom = (d) => {

    const r = String(d.room || '').toLowerCase();

    const name = String(d.name || d.id || '').toLowerCase();

    if (r && r !== 'general' && r !== 'unknown') {

      if (r.includes('salon') || r.includes('salón')) return 'salon';

      if (r.includes('andrea')) return 'andrea';

      if (r.includes('cocina')) return 'cocina';

      if (r.includes('pasillo')) return 'pasillo';

      if (r.includes('entrada')) return 'entrada';

      if (r.includes('bano') || r.includes('baño')) return 'bano';

      if (r.includes('principal') || r.includes('matrimonio')) return 'principal';

      return r;

    }

    if (name.includes('salon') || name.includes('salón') || name.includes('comedor') || name.includes('sofa') || name.includes('aparador')) return 'salon';

    if (name.includes('andrea')) return 'andrea';

    if (name.includes('cocina')) return 'cocina';

    if (name.includes('pasillo')) return 'pasillo';

    if (name.includes('entrada')) return 'entrada';

    if (name.includes('bano') || name.includes('baño') || name.includes('espejo')) return 'bano';

    if (name.includes('principal') || name.includes('matrimonio')) return 'principal';

    return 'general';

  };

  const lightsOnCount = lightDevices.filter(isDeviceOn).length;

  const lightsOffCount = lightDevices.length - lightsOnCount;

  const filteredLights = lightDevices.filter(d => {

    const on = isDeviceOn(d);

    if (lightFilter === 'on' && !on) return false;

    if (lightFilter === 'off' && on) return false;

    if (roomFilter !== 'all' && getDeviceRoom(d) !== roomFilter) return false;

    return true;

  });

  const availableRooms = ['all', ...Array.from(new Set(lightDevices.map(getDeviceRoom)))];

  const installedSensorsCount = sensors.filter(s => s.installed).length;

  const futureSensorsCount = sensors.length - installedSensorsCount;

  const filteredSensors = sensors.filter(s => {

    if (sensorFilter === 'installed') return Boolean(s.installed);

    if (sensorFilter === 'future') return !s.installed;

    return true;

  });

  const handleToggleLight = async (dev) => {

    const devId = dev.id || dev.entity_id;

    const currentlyOn = isDeviceOn(dev);

    const nextAction = currentlyOn ? 'turn_off' : 'turn_on';

    setTogglingId(devId);

    setDevices(prev =>

      prev.map(item =>

        (item.id || item.entity_id) === devId

          ? { ...item, state: currentlyOn ? 'off' : 'on' }

          : item

      )

    );

    try {

      if (onToggleDevice) {

        await onToggleDevice(devId, dev.state);

      } else {

        await fetch(`${API_BASE}/api/devices/control`, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ entity_id: devId, action: nextAction })

        });

      }

      setTimeout(fetchVisualData, 500);

    } catch (e) {

      showToast('Error al conmutar luz', 'error');

    } finally {

      setTogglingId(null);

    }

  };

  const handleTurnOffAllLights = async () => {

    const onDevs = lightDevices.filter(isDeviceOn);

    if (onDevs.length === 0) {

      showToast('Todas las luces ya están apagadas', 'info');

      return;

    }

    showToast(`Apagando ${onDevs.length} luces encendidas...`, 'info');

    setDevices(prev => prev.map(d => ({ ...d, state: 'off' })));

    try {

      await Promise.all(

        onDevs.map(d =>

          fetch(`${API_BASE}/api/devices/control`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ entity_id: d.id || d.entity_id, action: 'turn_off' })

          })

        )

      );

      showToast('⚫ Todas las luces han sido apagadas', 'success');

      setTimeout(fetchVisualData, 600);

    } catch (e) {

      showToast('Error apagando luces', 'error');

    }

  };

  // Ejecutar un Botón Multi-Escena (ejecuta 1 o varias escenas simultáneamente)

  const handleExecuteCustomButton = async (btn) => {

    setExecutingBtnId(btn.id);

    const sceneIds = btn.payload?.scene_ids || (btn.payload?.scene_id ? [btn.payload.scene_id] : []);

    try {

      if (btn.action_type === 'multi_scene' && sceneIds.length > 0) {

        // Ejecutar todas las escenas seleccionadas en paralelo / secuencia rápida

        await Promise.all(

          sceneIds.map(sid =>

            fetch(`${API_BASE}/api/automations/${sid}/execute`, { method: 'POST' })

          )

        );

        showToast(`⚡ Botón '${btn.title}' ejecutado (${sceneIds.length} escena${sceneIds.length !== 1 ? 's' : ''})`, 'success');

      } else {

        const res = await fetch(`${API_BASE}/api/widgets/${btn.id}/execute`, { method: 'POST' });

        if (res.ok) {

          showToast(`⚡ Botón '${btn.title}' ejecutado`, 'success');

        } else {

          showToast('Error al ejecutar botón', 'error');

        }

      }

      setTimeout(fetchVisualData, 600);

    } catch (e) {

      showToast('Error de red al ejecutar botón', 'error');

    } finally {

      setExecutingBtnId(null);

    }

  };

  const handleSaveCustomButton = async () => {

    if (!editingButton) return;

    if (!editingButton.title || !editingButton.title.trim()) {

      alert('Introduce un nombre para el botón');

      return;

    }

    const selectedSceneIds = editingButton.scene_ids || [];

    if (selectedSceneIds.length === 0) {

      alert('Selecciona al menos 1 Escena Rápida o Regla para que este botón la ejecute.');

      return;

    }

    const payloadToSave = {

      id: editingButton.is_new ? undefined : editingButton.id,

      title: editingButton.title.trim(),

      icon: editingButton.icon || '⚡',

      color: editingButton.color || '#00f3ff',

      room: 'general',

      action_type: 'multi_scene',

      description: editingButton.description || '',

      payload: {

        scene_ids: selectedSceneIds

      }

    };

    try {

      const url = editingButton.is_new

        ? `${API_BASE}/api/widgets`

        : `${API_BASE}/api/widgets/${editingButton.id}`;

      const method = editingButton.is_new ? 'POST' : 'PUT';

      const res = await fetch(url, {

        method,

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(payloadToSave)

      });

      if (res.ok) {

        showToast(`💾 Botón '${payloadToSave.title}' guardado (${selectedSceneIds.length} escena${selectedSceneIds.length !== 1 ? 's' : ''})`, 'success');

        setEditingButton(null);

        fetchVisualData();

      } else {

        showToast('Error guardando botón', 'error');

      }

    } catch (e) {

      showToast('Error de conexión al guardar botón', 'error');

    }

  };

  const handleDeleteCustomButton = async (btnId, btnTitle) => {

    if (!window.confirm(`¿Eliminar el botón '${btnTitle}'?`)) return;

    try {

      const res = await fetch(`${API_BASE}/api/widgets/${btnId}`, { method: 'DELETE' });

      if (res.ok) {

        showToast(`🗑️ Botón '${btnTitle}' eliminado`, 'info');

        setEditingButton(null);

        fetchVisualData();

      }

    } catch (e) {

      showToast('Error eliminando botón', 'error');

    }

  };

  const toggleSceneInButtonModal = (sceneId) => {

    setEditingButton(prev => {

      if (!prev) return prev;

      const current = prev.scene_ids || [];

      const exists = current.includes(sceneId);

      const next = exists ? current.filter(id => id !== sceneId) : [...current, sceneId];

      return { ...prev, scene_ids: next };

    });

  };

  const handleSaveAutomation = async (autoData) => {

    try {

      const res = await fetch(`${API_BASE}/api/automations`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(autoData)

      });

      if (res.ok) {

        showToast(`💾 Escena '${autoData.name}' guardada y disponible para tus botones`, 'success');

        setEditingAuto(null);

        fetchVisualData();

      }

    } catch (e) {

      showToast('Error guardando escena', 'error');

    }

  };

  const handleDeleteAutomation = async (id, name) => {

    if (!window.confirm(`¿Eliminar la escena '${name}'?`)) return;

    try {

      const res = await fetch(`${API_BASE}/api/automations/${id}`, { method: 'DELETE' });

      if (res.ok) {

        showToast(`🗑️ '${name}' eliminada`, 'info');

        setEditingAuto(null);

        fetchVisualData();

      }

    } catch (e) {

      showToast('Error eliminando escena', 'error');

    }

  };

  const getSensorIcon = (cat) => {

    switch (cat) {

      case 'presence': return <Eye size={20} color="#00f3ff" />;

      case 'power': return <Zap size={20} color="#334155" />;

      case 'water': return <Droplets size={20} color="#38bdf8" />;

      case 'air': return <Wind size={20} color="#065f46" />;

      case 'contact': return <DoorClosed size={20} color="#a855f7" />;

      case 'light_lux': return <Sun size={20} color="#334155" />;

      case 'smoke_gas': return <Flame size={20} color="#ef4444" />;

      case 'plant': return <Sprout size={20} color="#065f46" />;

      case 'button': return <Sliders size={20} color="#00f3ff" />;

      default: return <Activity size={20} color="#94a3b8" />;

    }

  };

  const getAutomationById = (id) => automations.find(a => a.id === id);

  return (

    <div style={{

      display: 'flex',

      flexDirection: 'column',

      gap: '16px',

      padding: '0 4px 40px 4px',

      color: '#f8fafc',

      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'

    }}>

      {/* Notificación Flotante */}

      {toast && (

        <div style={{

          position: 'fixed',

          top: '20px',

          right: '20px',

          zIndex: 99999,

          padding: '12px 20px',

          borderRadius: '12px',

          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.96)' : 'rgba(0, 243, 255, 0.96)',

          color: toast.type === 'error' ? '#fff' : '#020617',

          fontWeight: 800,

          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',

          display: 'flex',

          alignItems: 'center',

          gap: '8px'

        }}>

          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}

          {toast.msg}

        </div>

      )}

      {/* ===================================================================== */}

      {/* BARRA SUPERIOR FIJA / STICKY DE SELECCIÓN DE APARTADOS (VISUAL)       */}

      {/* ===================================================================== */}

      <div

        className="vsp-sticky-nav"

        style={{

          position: 'sticky',

          top: 0,

          zIndex: 90,

          background: 'rgba(3, 7, 18, 0.94)',

          backdropFilter: 'blur(20px)',

          WebkitBackdropFilter: 'blur(20px)',

          padding: '8px 12px',

          marginBottom: '4px',

          borderRadius: '14px',

          border: '1px solid rgba(0, 243, 255, 0.25)',

          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'space-between',

          gap: '10px',

          flexWrap: 'wrap',

          transition: 'all 0.25s ease'

        }}

      >

        {/* Pills de Selección de Apartados */}

        <div style={{

          display: 'flex',

          gap: '8px',

          overflowX: 'auto',

          alignItems: 'center',

          scrollbarWidth: 'none',

          WebkitOverflowScrolling: 'touch'

        }}>

          {[

            { id: 'all', label: '🏠 Todo el Panel', count: null },

            { id: 'sensors', label: '🛡️ Sensores', count: sensors.length, highlight: true },

            { id: 'lights', label: '💡 Luces', count: lightDevices.length },

            { id: 'buttons', label: '⚡ Escenas', count: customButtons.length }

          ].map(tab => {

            const isActive = activeSection === tab.id;

            return (

              <button

                key={tab.id}

                type="button"

                onClick={() => setActiveSection(tab.id)}

                style={{

                  background: isActive

                    ? (tab.highlight ? 'linear-gradient(135deg, rgba(6, 95, 70, 0.35), rgba(0, 243, 255, 0.25))' : 'linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(15, 23, 42, 0.9))')

                    : 'rgba(15, 23, 42, 0.75)',

                  border: isActive

                    ? (tab.highlight ? '1.5px solid #065f46' : '1.5px solid #00f3ff')

                    : '1px solid rgba(255, 255, 255, 0.12)',

                  color: isActive ? '#ffffff' : '#cbd5e1',

                  borderRadius: '10px',

                  padding: isMinimalist ? '6px 12px' : '8px 16px',

                  fontSize: isMinimalist ? '0.78rem' : '0.82rem',

                  fontWeight: 800,

                  cursor: 'pointer',

                  whiteSpace: 'nowrap',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '6px',

                  boxShadow: isActive ? (tab.highlight ? '0 0 16px rgba(6, 95, 70, 0.4)' : '0 0 14px rgba(0, 243, 255, 0.35)') : 'none',

                  transition: 'all 0.2s ease'

                }}

              >

                <span>{tab.label}</span>

                {tab.count !== null && (

                  <span style={{

                    background: isActive ? (tab.highlight ? '#065f46' : '#00f3ff') : 'rgba(255,255,255,0.1)',

                    color: isActive ? '#020617' : '#cbd5e1',

                    borderRadius: '999px',

                    padding: '1px 7px',

                    fontSize: '0.7rem',

                    fontWeight: 900

                  }}>

                    {tab.count}

                  </span>

                )}

              </button>

            );

          })}

        </div>

        {/* Acciones Rápidas en la Barra Sticky */}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

          {lightsOnCount > 0 && (

            <button

              onClick={handleTurnOffAllLights}

              style={{

                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))',

                border: '1.5px solid #ef4444',

                color: '#fecaca',

                borderRadius: '10px',

                padding: '6px 12px',

                fontSize: '0.76rem',

                fontWeight: 800,

                cursor: 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '6px',

                boxShadow: '0 0 14px rgba(239, 68, 68, 0.3)'

              }}

              title="Apagar todas las luces encendidas inmediatamente"

            >

              <Power size={14} /> Apagar ({lightsOnCount})

            </button>

          )}

          <button

            onClick={() => {

              setIsMinimalist(prev => {

                const next = !prev;

                try { localStorage.setItem('habana_visual_minimalist', String(next)); } catch(e) {}

                return next;

              });

            }}

            style={{

              background: isMinimalist ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',

              border: isMinimalist ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.15)',

              color: isMinimalist ? '#00f3ff' : '#94a3b8',

              borderRadius: '10px',

              padding: '6px 12px',

              fontSize: '0.76rem',

              fontWeight: 700,

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              gap: '6px'

            }}

            title="Alternar vista minimalista / detallada"

          >

            {isMinimalist ? <Maximize2 size={13} /> : <Minimize2 size={13} />}

            <span>{isMinimalist ? 'Detallado' : 'Minimalista'}</span>

          </button>

        </div>

      </div>

      {/* ===================================================================== */}

      {/* CABECERA RESUMEN ULTRA-VISUAL: QUÉ ESTÁ ENCENDIDO / APAGADO Y SENSORES */}

      {/* ===================================================================== */}

      <div style={{

        background: 'linear-gradient(145deg, rgba(8, 16, 36, 0.96), rgba(3, 8, 20, 0.98))',

        border: '1px solid rgba(0, 243, 255, 0.35)',

        borderRadius: '18px',

        padding: '20px 24px',

        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',

        display: 'flex',

        flexDirection: 'column',

        gap: '18px'

      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

            <div style={{

              width: '50px',

              height: '50px',

              borderRadius: '14px',

              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.28), rgba(0, 243, 255, 0.05))',

              border: '1.5px solid #00f3ff',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              color: '#00f3ff',

              boxShadow: '0 0 20px rgba(0, 243, 255, 0.35)'

            }}>

              <Eye size={26} />

            </div>

            <div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.6px', color: '#fff' }}>

                  CENTRO DE CONTROL VISUAL DE LA CASA

                </h2>

                <span style={{

                  background: 'rgba(6, 95, 70, 0.2)',

                  border: '1px solid #065f46',

                  color: '#065f46',

                  borderRadius: '999px',

                  padding: '3px 12px',

                  fontSize: '0.72rem',

                  fontWeight: 800

                }}>

                  TIEMPO REAL ZIGBEE2MQTT

                </span>

              </div>

              {!isMinimalist && (

                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>

                  Botones programables multi-escena, estado en vivo de todas las luces (encendidas/apagadas) y matriz de sensores actuales y futuros.

                </p>

              )}

            </div>

          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

            {/* Botón Modo Minimalista / De un vistazo */}

            <button

              onClick={() => {

                setIsMinimalist(prev => {

                  const next = !prev;

                  try { localStorage.setItem('habana_visual_minimalist', String(next)); } catch(e) {}

                  return next;

                });

              }}

              style={{

                background: isMinimalist

                  ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.32), rgba(6, 95, 70, 0.25))'

                  : 'rgba(15, 23, 42, 0.85)',

                border: isMinimalist ? '1.5px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.18)',

                color: isMinimalist ? '#ffffff' : '#cbd5e1',

                borderRadius: '12px',

                padding: '10px 16px',

                fontSize: '0.82rem',

                fontWeight: 800,

                cursor: 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '8px',

                boxShadow: isMinimalist ? '0 0 18px rgba(0, 243, 255, 0.4)' : 'none',

                transition: 'all 0.2s ease'

              }}

              title="Alternar entre vista reducida de un vistazo y vista detallada completa"

            >

              {isMinimalist ? <Maximize2 size={16} color="#00f3ff" /> : <Minimize2 size={16} />}

              <span>{isMinimalist ? 'Vista Detallada' : 'Modo Minimalista (De un vistazo)'}</span>

            </button>

            {lightsOnCount > 0 && (

              <button

                onClick={handleTurnOffAllLights}

                style={{

                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(185, 28, 28, 0.35))',

                  border: '1.5px solid #ef4444',

                  color: '#fecaca',

                  borderRadius: '12px',

                  padding: '10px 16px',

                  fontSize: '0.82rem',

                  fontWeight: 800,

                  cursor: 'pointer',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '8px',

                  boxShadow: '0 0 18px rgba(239, 68, 68, 0.35)'

                }}

              >

                <Power size={16} /> Apagar Todas las Encendidas ({lightsOnCount})

              </button>

            )}

            {onOpenAutomationsConfig && (

              <button

                onClick={onOpenAutomationsConfig}

                style={{

                  background: 'rgba(0, 243, 255, 0.14)',

                  border: '1px solid rgba(0, 243, 255, 0.45)',

                  color: '#00f3ff',

                  borderRadius: '12px',

                  padding: '10px 16px',

                  fontSize: '0.8rem',

                  fontWeight: 800,

                  cursor: 'pointer',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '7px'

                }}

              >

                <Sliders size={16} /> Ir a Automatizaciones & Matriz

              </button>

            )}

            {onOpenDigitalTwin && (

              <button

                type="button"

                onClick={onOpenDigitalTwin}

                style={{

                  background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(168, 85, 247, 0.22))',

                  border: '1.5px solid rgba(0, 243, 255, 0.55)',

                  color: '#00f3ff',

                  borderRadius: '12px',

                  padding: '10px 16px',

                  fontSize: '0.8rem',

                  fontWeight: 800,

                  cursor: 'pointer',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '7px',

                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.25)',

                  transition: 'all 0.2s ease'

                }}

                title="Abrir Gemelo Digital 3D interactivo"

              >

                <Box size={16} color="#00f3ff" /> Gemelo Digital 3D

              </button>

            )}

          </div>

        </div>

        {/* 4 Tarjetas Grandes de Estado Global */}

        <div style={{ display: 'grid', gridTemplateColumns: isMinimalist ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: isMinimalist ? '8px' : '14px' }}>

          {/* Luces Encendidas */}

          <div

            onClick={() => { setActiveSection('lights'); setLightFilter('on'); }}

            style={{

              background: lightsOnCount > 0

                ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.24), rgba(15, 23, 42, 0.9))'

                : 'rgba(15, 23, 42, 0.7)',

              border: lightsOnCount > 0 ? '2px solid #334155' : '1px solid rgba(255,255,255,0.1)',

              borderRadius: '14px',

              padding: isMinimalist ? '8px 14px' : '14px 18px',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between',

              boxShadow: lightsOnCount > 0 ? '0 0 22px rgba(51, 65, 85, 0.25)' : 'none'

            }}

          >

            <div>

              <div style={{ fontSize: isMinimalist ? '0.68rem' : '0.73rem', fontWeight: 800, color: lightsOnCount > 0 ? '#334155' : '#94a3b8', letterSpacing: '0.5px' }}>

                💡 LUCES ENCENDIDAS

              </div>

              <div style={{ fontSize: isMinimalist ? '1.35rem' : '2rem', fontWeight: 900, color: lightsOnCount > 0 ? '#334155' : '#64748b', lineHeight: 1.1, marginTop: isMinimalist ? '2px' : '4px' }}>

                {lightsOnCount} <span style={{ fontSize: isMinimalist ? '0.76rem' : '0.88rem', fontWeight: 600, color: '#94a3b8' }}>de {lightDevices.length}</span>

              </div>

              {!isMinimalist && (

                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '4px' }}>

                  {lightFilter === 'on' ? '🔍 Filtrando solo encendidas' : 'Pulsa para filtrar encendidas'}

                </div>

              )}

            </div>

            <div style={{

              width: isMinimalist ? '34px' : '48px',

              height: isMinimalist ? '34px' : '48px',

              borderRadius: '50%',

              background: lightsOnCount > 0 ? 'rgba(51, 65, 85, 0.25)' : 'rgba(255,255,255,0.05)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              fontSize: isMinimalist ? '1.15rem' : '1.6rem',

              boxShadow: lightsOnCount > 0 ? '0 0 18px #334155' : 'none'

            }}>

              💡

            </div>

          </div>

          {/* Luces Apagadas */}

          <div

            onClick={() => { setActiveSection('lights'); setLightFilter('off'); }}

            style={{

              background: 'rgba(15, 23, 42, 0.75)',

              border: lightFilter === 'off' ? '2px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',

              borderRadius: '14px',

              padding: isMinimalist ? '8px 14px' : '14px 18px',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}

          >

            <div>

              <div style={{ fontSize: isMinimalist ? '0.68rem' : '0.73rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>

                ⚫ LUCES APAGADAS

              </div>

              <div style={{ fontSize: isMinimalist ? '1.35rem' : '2rem', fontWeight: 900, color: '#e2e8f0', lineHeight: 1.1, marginTop: isMinimalist ? '2px' : '4px' }}>

                {lightsOffCount} <span style={{ fontSize: isMinimalist ? '0.76rem' : '0.88rem', fontWeight: 600, color: '#64748b' }}>en reposo</span>

              </div>

              {!isMinimalist && (

                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>

                  {lightFilter === 'off' ? '🔍 Filtrando solo apagadas' : 'Pulsa para ver apagadas'}

                </div>

              )}

            </div>

            <div style={{

              width: isMinimalist ? '34px' : '48px',

              height: isMinimalist ? '34px' : '48px',

              borderRadius: '50%',

              background: 'rgba(255,255,255,0.05)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              fontSize: isMinimalist ? '1.15rem' : '1.5rem'

            }}>

              ⚫

            </div>

          </div>

          {/* Sensores Activos en Vivo */}

          <div

            onClick={() => { setActiveSection('sensors'); setSensorFilter('installed'); }}

            style={{

              background: 'linear-gradient(135deg, rgba(6, 95, 70, 0.16), rgba(15, 23, 42, 0.85))',

              border: sensorFilter === 'installed' ? '2px solid #065f46' : '1px solid rgba(6, 95, 70, 0.35)',

              borderRadius: '14px',

              padding: isMinimalist ? '8px 14px' : '14px 18px',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}

          >

            <div>

              <div style={{ fontSize: isMinimalist ? '0.68rem' : '0.73rem', fontWeight: 800, color: '#065f46', letterSpacing: '0.5px' }}>

                🟢 SENSORES EN VIVO

              </div>

              <div style={{ fontSize: isMinimalist ? '1.35rem' : '2rem', fontWeight: 900, color: '#065f46', lineHeight: 1.1, marginTop: isMinimalist ? '2px' : '4px' }}>

                {installedSensorsCount} <span style={{ fontSize: isMinimalist ? '0.76rem' : '0.84rem', fontWeight: 600, color: '#94a3b8' }}>operativos</span>

              </div>

              {!isMinimalist && (

                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '4px' }}>

                  Cámaras IA & Monitor Red

                </div>

              )}

            </div>

            <div style={{

              width: isMinimalist ? '34px' : '48px',

              height: isMinimalist ? '34px' : '48px',

              borderRadius: '50%',

              background: 'rgba(6, 95, 70, 0.2)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              fontSize: isMinimalist ? '1.15rem' : '1.5rem'

            }}>

              📡

            </div>

          </div>

          {/* Sensores Futuros Preparados */}

          <div

            onClick={() => { setActiveSection('sensors'); setSensorFilter('future'); }}

            style={{

              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.16), rgba(15, 23, 42, 0.85))',

              border: sensorFilter === 'future' ? '2px solid #c084fc' : '1px solid rgba(168, 85, 247, 0.35)',

              borderRadius: '14px',

              padding: isMinimalist ? '8px 14px' : '14px 18px',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}

          >

            <div>

              <div style={{ fontSize: isMinimalist ? '0.68rem' : '0.73rem', fontWeight: 800, color: '#c084fc', letterSpacing: '0.5px' }}>

                ⏳ SENSORES FUTUROS

              </div>

              <div style={{ fontSize: isMinimalist ? '1.35rem' : '2rem', fontWeight: 900, color: '#e9d5ff', lineHeight: 1.1, marginTop: isMinimalist ? '2px' : '4px' }}>

                {futureSensorsCount} <span style={{ fontSize: isMinimalist ? '0.76rem' : '0.84rem', fontWeight: 600, color: '#94a3b8' }}>preparados</span>

              </div>

              {!isMinimalist && (

                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '4px' }}>

                  Listos para vincular por Zigbee

                </div>

              )}

            </div>

            <div style={{

              width: isMinimalist ? '34px' : '48px',

              height: isMinimalist ? '34px' : '48px',

              borderRadius: '50%',

              background: 'rgba(168, 85, 247, 0.2)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              fontSize: isMinimalist ? '1.15rem' : '1.5rem'

            }}>

              🛡️

            </div>

          </div>

        </div>

      </div>

      {/* ===================================================================== */}

      {/* SECCIÓN 1: BOTONES PROGRAMABLES MULTI-ESCENA (EJECUCIÓN COMBINADA)    */}

      {/* ===================================================================== */}

      {(activeSection === 'all' || activeSection === 'buttons') && (

      <div style={{

        background: 'linear-gradient(145deg, rgba(12, 20, 42, 0.94), rgba(5, 11, 26, 0.96))',

        border: '1px solid rgba(0, 243, 255, 0.35)',

        borderRadius: '16px',

        padding: isMinimalist ? '12px 14px' : '20px 22px',

        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)'

      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: isMinimalist ? '10px' : '16px' }}>

          <div>

            <div style={{ fontSize: isMinimalist ? '0.92rem' : '1.05rem', fontWeight: 900, color: '#00f3ff', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>

              <Layers size={isMinimalist ? 17 : 20} /> BOTONES PROGRAMABLES MULTI-ESCENA (EJECUCIÓN SIMULTÁNEA)

            </div>

            {!isMinimalist && (

              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>

                Crea tus propios botones y asígnales <strong>una o varias Escenas Rápidas / Automatizaciones a la vez</strong>. Pulsa el botón para lanzarlo todo en 1 clic o <strong>✏️ Configurar</strong> para elegir qué escenas combina.

              </div>

            )}

          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

            <button

              onClick={() => setEditingButton({

                is_new: true,

                title: 'Nuevo Botón Multi-Escena',

                icon: '✨',

                color: '#00f3ff',

                description: 'Ejecuta varias escenas a la vez',

                scene_ids: automations.slice(0, 1).map(a => a.id)

              })}

              style={{

                background: 'linear-gradient(135deg, #00f3ff, #065f46)',

                border: 'none',

                color: '#020617',

                borderRadius: '10px',

                padding: '9px 16px',

                fontSize: '0.8rem',

                fontWeight: 900,

                cursor: 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '6px',

                boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'

              }}

            >

              <Plus size={16} /> Crear Botón Multi-Escena

            </button>

            <button

              onClick={() => setEditingAuto({

                is_new: true,

                name: 'Nueva Escena Base',

                description: 'Escena disponible para asignar a botones',

                icon: '🎬',

                category: 'scene',

                is_quick_scene: true,

                quick_color: '#00f3ff',

                enabled: true,

                trigger: { type: 'manual' },

                actions: []

              })}

              style={{

                background: 'rgba(168, 85, 247, 0.16)',

                border: '1px solid #c084fc',

                color: '#e9d5ff',

                borderRadius: '10px',

                padding: '9px 14px',

                fontSize: '0.78rem',

                fontWeight: 800,

                cursor: 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '6px'

              }}

            >

              <Plus size={15} /> Crear Nueva Escena Base

            </button>

          </div>

        </div>

        {/* Grid de Botones Multi-Escena */}

        <div style={{ display: 'grid', gridTemplateColumns: isMinimalist ? 'repeat(auto-fill, minmax(190px, 1fr))' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: isMinimalist ? '8px' : '14px' }}>

          {customButtons.map(btn => {

            const color = btn.color || '#00f3ff';

            const isRunning = executingBtnId === btn.id;

            const sceneIds = btn.payload?.scene_ids || (btn.payload?.scene_id ? [btn.payload.scene_id] : []);

            const linkedScenes = sceneIds.map(id => getAutomationById(id)).filter(Boolean);

            return (

              <div

                key={btn.id}

                style={{

                  background: `linear-gradient(145deg, ${color}1f, rgba(2, 6, 23, 0.92))`,

                  border: `2px solid ${color}`,

                  borderRadius: isMinimalist ? '12px' : '16px',

                  padding: isMinimalist ? '8px 10px' : '14px 16px',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  gap: isMinimalist ? '0px' : '12px',

                  boxShadow: `0 0 22px ${color}25`,

                  transition: 'all 0.2s ease'

                }}

              >

                {/* Parte Superior: Pulsar para Ejecutar */}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMinimalist ? '8px' : '10px', minWidth: 0, width: '100%' }}>

                  <button

                    onClick={() => handleExecuteCustomButton(btn)}

                    disabled={isRunning}

                    style={{

                      flex: 1,

                      minWidth: 0,

                      background: 'transparent',

                      border: 'none',

                      color: '#fff',

                      display: 'flex',

                      alignItems: 'center',

                      gap: isMinimalist ? '8px' : '12px',

                      textAlign: 'left',

                      cursor: isRunning ? 'wait' : 'pointer',

                      padding: 0,

                      overflow: 'hidden'

                    }}

                    title={`Ejecutar ahora: ${btn.title}`}

                  >

                    <div style={{

                      width: isMinimalist ? '34px' : '48px',

                      height: isMinimalist ? '34px' : '48px',

                      borderRadius: isMinimalist ? '10px' : '13px',

                      background: `${color}30`,

                      border: `1.5px solid ${color}`,

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      fontSize: isMinimalist ? '1.15rem' : '1.55rem',

                      flexShrink: 0,

                      boxShadow: `0 0 14px ${color}44`

                    }}>

                      {btn.icon || '⚡'}

                    </div>

                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>

                      <div style={{ fontSize: isMinimalist ? '0.86rem' : '1rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                        {isRunning ? '⚡ Ejecutando...' : btn.title}

                      </div>

                      {!isMinimalist && (

                        <div style={{ fontSize: '0.73rem', color: '#cbd5e1', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                          {btn.description || `Ejecuta ${sceneIds.length} escena${sceneIds.length !== 1 ? 's' : ''} a la vez`}

                        </div>

                      )}

                    </div>

                  </button>

                  {/* Botón Configurar este Botón Multi-Escena */}

                  <button

                    onClick={() => setEditingButton({

                      is_new: false,

                      id: btn.id,

                      title: btn.title,

                      icon: btn.icon || '⚡',

                      color: btn.color || '#00f3ff',

                      description: btn.description || '',

                      scene_ids: sceneIds

                    })}

                    style={{

                      background: 'rgba(15, 23, 42, 0.9)',

                      border: `1px solid ${color}88`,

                      color: '#e2e8f0',

                      borderRadius: '8px',

                      padding: isMinimalist ? '4px 6px' : '7px 10px',

                      cursor: 'pointer',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '4px',

                      fontSize: '0.7rem',

                      fontWeight: 800,

                      flexShrink: 0

                    }}

                    title="Configurar escenas"

                  >

                    <Edit3 size={isMinimalist ? 11 : 13} color={color} />

                    {!isMinimalist && ' Config'}

                  </button>

                </div>

                {/* Chips visuales de las Escenas que se ejecutan simultáneamente (Ocultos en Modo Minimalista) */}

                {!isMinimalist && (

                <div style={{

                  background: 'rgba(2, 6, 23, 0.72)',

                  borderRadius: '10px',

                  padding: '8px 10px',

                  border: '1px solid rgba(255,255,255,0.07)'

                }}>

                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>

                    <span>ESCENAS QUE EJECUTA A LA VEZ ({linkedScenes.length || sceneIds.length}):</span>

                    <span style={{ color }}>▶ 1 CLIC</span>

                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>

                    {linkedScenes.length > 0 ? (

                      linkedScenes.map(sc => (

                        <span

                          key={sc.id}

                          onClick={(e) => {

                            e.stopPropagation();

                            setEditingAuto(JSON.parse(JSON.stringify(sc)));

                          }}

                          style={{

                            background: 'rgba(0, 243, 255, 0.14)',

                            border: '1px solid rgba(0, 243, 255, 0.4)',

                            color: '#f8fafc',

                            borderRadius: '999px',

                            padding: '3px 9px',

                            fontSize: '0.7rem',

                            fontWeight: 700,

                            cursor: 'pointer',

                            display: 'inline-flex',

                            alignItems: 'center',

                            gap: '4px'

                          }}

                          title="Pulsa para editar las luces de esta escena"

                        >

                          <span>{sc.icon || '⚡'}</span>

                          <span>{sc.name}</span>

                        </span>

                      ))

                    ) : (

                      <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>

                        ⚡ Acción directa ({btn.action_type === 'all_off' ? 'Apagado Total' : 'Comando personalizado'})

                      </span>

                    )}

                  </div>

                </div>

                )}

              </div>

            );

          })}

          {/* Tarjeta Añadir Nuevo Botón Multi-Escena */}

          <button

            onClick={() => setEditingButton({

              is_new: true,

              title: 'Nuevo Botón Combinado',

              icon: '⚡',

              color: '#00f3ff',

              description: 'Ejecuta varias escenas en 1 clic',

              scene_ids: []

            })}

            style={{

              background: 'rgba(0, 243, 255, 0.06)',

              border: '2px dashed rgba(0, 243, 255, 0.45)',

              color: '#00f3ff',

              borderRadius: isMinimalist ? '12px' : '16px',

              padding: isMinimalist ? '8px 12px' : '20px',

              display: 'flex',

              flexDirection: isMinimalist ? 'row' : 'column',

              alignItems: 'center',

              justifyContent: 'center',

              gap: isMinimalist ? '6px' : '8px',

              fontSize: isMinimalist ? '0.78rem' : '0.88rem',

              fontWeight: 800,

              cursor: 'pointer',

              minHeight: isMinimalist ? '50px' : '130px'

            }}

          >

            <Plus size={isMinimalist ? 16 : 26} />

            <span>{isMinimalist ? '+ Nuevo Botón' : '+ Crear Nuevo Botón de Escenas Rápidas'}</span>

            {!isMinimalist && (

              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>

                Elige 1, 2 o más escenas para lanzarlas juntas

              </span>

            )}

          </button>

        </div>

      </div>

      )}

      {/* ===================================================================== */}

      {/* SECCIÓN 2: LISTA VISUAL DE LUCES (ENCENDIDO / APAGADO CLARO)          */}

      {/* ===================================================================== */}

      {(activeSection === 'all' || activeSection === 'lights') && (

      <div style={{

        background: 'rgba(8, 15, 32, 0.94)',

        border: '1px solid rgba(255, 255, 255, 0.12)',

        borderRadius: '16px',

        padding: isMinimalist ? '12px 14px' : '20px 22px',

        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)'

      }}>

        {/* Cabecera y Filtros de Luces */}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: isMinimalist ? '10px' : '16px' }}>

          <div>

            <div style={{ fontSize: isMinimalist ? '0.92rem' : '1.05rem', fontWeight: 900, color: '#334155', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>

              <Lightbulb size={isMinimalist ? 17 : 20} /> ESTADO VISUAL DE LUCES Y DISPOSITIVOS ({lightDevices.length})

            </div>

            {!isMinimalist && (

              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>

                Las luces <strong style={{ color: '#334155' }}>ENCENDIDAS</strong> brillan en dorado/verde. Pulsa sobre cualquier tarjeta para encender o apagar al instante.

              </div>

            )}

          </div>

          {/* Filtro Rápido: Todas / Encendidas / Apagadas */}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

            {[

              { id: 'all', label: `Todas (${lightDevices.length})`, color: '#00f3ff' },

              { id: 'on', label: `🟢 Encendidas (${lightsOnCount})`, color: '#334155' },

              { id: 'off', label: `⚫ Apagadas (${lightsOffCount})`, color: '#94a3b8' }

            ].map(f => (

              <button

                key={f.id}

                onClick={() => { setLightFilter(f.id);  }}

                style={{

                  background: lightFilter === f.id ? `${f.color}28` : 'rgba(15, 23, 42, 0.8)',

                  border: lightFilter === f.id ? `1.5px solid ${f.color}` : '1px solid rgba(255,255,255,0.1)',

                  color: lightFilter === f.id ? '#fff' : '#94a3b8',

                  borderRadius: '10px',

                  padding: '7px 14px',

                  fontSize: '0.78rem',

                  fontWeight: 800,

                  cursor: 'pointer'

                }}

              >

                {f.label}

              </button>

            ))}

          </div>

        </div>

        {/* Pestañas por Habitación */}

        <div style={{ display: 'flex', gap: isMinimalist ? '5px' : '8px', flexWrap: 'wrap', marginBottom: isMinimalist ? '10px' : '18px', paddingBottom: isMinimalist ? '8px' : '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

          {availableRooms.map(roomKey => (

            <button

              key={roomKey}

              onClick={() => setRoomFilter(roomKey)}

              style={{

                background: roomFilter === roomKey ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.6)',

                border: roomFilter === roomKey ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.08)',

                color: roomFilter === roomKey ? '#00f3ff' : '#cbd5e1',

                borderRadius: '8px',

                padding: '6px 12px',

                fontSize: '0.76rem',

                fontWeight: 700,

                cursor: 'pointer'

              }}

            >

              {ROOM_LABELS[roomKey] || roomKey.toUpperCase()}

            </button>

          ))}

        </div>

        {/* Grid Visual de Luces */}

        {filteredLights.length === 0 ? (

          <div style={{

            padding: '32px',

            textAlign: 'center',

            background: 'rgba(15, 23, 42, 0.5)',

            borderRadius: '12px',

            color: '#94a3b8',

            fontSize: '0.9rem'

          }}>

            No hay luces en este filtro ({lightFilter === 'on' ? 'Ninguna luz encendida ahora mismo' : 'Sin resultados'}).

          </div>

        ) : (

          <div style={{ display: 'grid', gridTemplateColumns: isMinimalist ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: isMinimalist ? '8px' : '14px' }}>

            {filteredLights.map(dev => {

              const devId = dev.id || dev.entity_id;

              const isOn = isDeviceOn(dev);

              const isBusy = togglingId === devId;

              const roomKey = getDeviceRoom(dev);

              const isCover = String(devId).includes('persiana') || dev.type === 'cover';

              return (

                <div

                  key={devId}

                  onClick={() => handleToggleLight(dev)}

                  style={{

                    background: isOn

                      ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.22), rgba(6, 95, 70, 0.14), rgba(15, 23, 42, 0.95))'

                      : 'rgba(15, 23, 42, 0.65)',

                    border: isOn

                      ? '2px solid #334155'

                      : '1px solid rgba(255, 255, 255, 0.08)',

                    borderRadius: isMinimalist ? '12px' : '14px',

                    padding: isMinimalist ? '8px 10px' : '16px',

                    cursor: isBusy ? 'wait' : 'pointer',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between',

                    gap: isMinimalist ? '6px' : '12px',

                    boxShadow: isOn

                      ? '0 0 24px rgba(51, 65, 85, 0.28), inset 0 0 15px rgba(51, 65, 85, 0.08)'

                      : '0 4px 12px rgba(0, 0, 0, 0.25)',

                    transition: 'all 0.2s ease'

                  }}

                >

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMinimalist ? '8px' : '10px' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: isMinimalist ? '8px' : '12px', minWidth: 0, overflow: 'hidden' }}>

                      <div style={{

                        width: isMinimalist ? '32px' : '46px',

                        height: isMinimalist ? '32px' : '46px',

                        borderRadius: isMinimalist ? '8px' : '12px',

                        background: isOn ? 'rgba(51, 65, 85, 0.28)' : 'rgba(30, 41, 59, 0.8)',

                        border: isOn ? '1.5px solid #334155' : '1px solid rgba(255,255,255,0.1)',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        fontSize: isMinimalist ? '1.15rem' : '1.5rem',

                        boxShadow: isOn ? '0 0 16px #334155' : 'none',

                        flexShrink: 0

                      }}>

                        {isCover ? '🪟' : (isOn ? '💡' : '🌑')}

                      </div>

                      <div style={{ minWidth: 0, overflow: 'hidden' }}>

                        <div style={{

                          fontSize: isMinimalist ? '0.84rem' : '0.94rem',

                          fontWeight: 800,

                          color: isOn ? '#ffffff' : '#cbd5e1',

                          lineHeight: 1.2,

                          whiteSpace: 'nowrap',

                          overflow: 'hidden',

                          textOverflow: 'ellipsis'

                        }}>

                          {dev.name || devId}

                        </div>

                        <div style={{

                          fontSize: isMinimalist ? '0.62rem' : '0.7rem',

                          color: isOn ? '#334155' : '#64748b',

                          marginTop: isMinimalist ? '1px' : '3px',

                          fontWeight: 600,

                          whiteSpace: 'nowrap',

                          overflow: 'hidden',

                          textOverflow: 'ellipsis'

                        }}>

                          {ROOM_LABELS[roomKey] || roomKey.toUpperCase()}

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* Barra Inferior de Estado ENCENDIDO / APAGADO */}

                  <div style={{

                    display: 'flex',

                    justifyContent: 'space-between',

                    alignItems: 'center',

                    paddingTop: isMinimalist ? '5px' : '10px',

                    borderTop: isOn ? '1px solid rgba(51, 65, 85, 0.3)' : '1px solid rgba(255,255,255,0.06)'

                  }}>

                    <span style={{

                      display: 'inline-flex',

                      alignItems: 'center',

                      gap: isMinimalist ? '4px' : '6px',

                      padding: isMinimalist ? '2px 8px' : '4px 12px',

                      borderRadius: '999px',

                      fontSize: isMinimalist ? '0.64rem' : '0.74rem',

                      fontWeight: 900,

                      letterSpacing: '0.5px',

                      background: isOn ? 'rgba(6, 95, 70, 0.25)' : 'rgba(30, 41, 59, 0.9)',

                      color: isOn ? '#065f46' : '#64748b',

                      border: isOn ? '1px solid #065f46' : '1px solid rgba(255,255,255,0.1)'

                    }}>

                      <span style={{

                        width: '8px',

                        height: '8px',

                        borderRadius: '50%',

                        background: isOn ? '#065f46' : '#475569',

                        boxShadow: isOn ? '0 0 8px #065f46' : 'none'

                      }} />

                      {isBusy ? 'CAMBIANDO...' : (isOn ? 'ENCENDIDO' : 'APAGADO')}

                    </span>

                    <span style={{

                      fontSize: '0.72rem',

                      fontWeight: 700,

                      color: isOn ? '#334155' : '#94a3b8'

                    }}>

                      {isOn ? 'Pulsar para Apagar' : 'Pulsar para Encender'}

                    </span>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </div>

      )}

      {/* ===================================================================== */}

      {/* SECCIÓN 3: LISTA VISUAL DE SENSORES (ACTIVOS AHORA & FUTUROS ZIGBEE)  */}

      {/* ===================================================================== */}

      {(activeSection === 'all' || activeSection === 'sensors') && (

      <div style={{

        background: 'rgba(8, 15, 32, 0.94)',

        border: '1px solid rgba(6, 95, 70, 0.28)',

        borderRadius: '16px',

        padding: isMinimalist ? '12px 14px' : '20px 22px',

        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)'

      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: isMinimalist ? '10px' : '16px' }}>

          <div>

            <div style={{ fontSize: isMinimalist ? '0.92rem' : '1.05rem', fontWeight: 900, color: '#065f46', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>

              <Shield size={isMinimalist ? 17 : 20} /> ESTADO VISUAL DE SENSORES ({sensors.length})

            </div>

            {!isMinimalist && (

              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>

                Muestra tanto los sensores <strong style={{ color: '#065f46' }}>ACTIVOS EN VIVO</strong> como los <strong style={{ color: '#c084fc' }}>PREPARADOS PARA EL FUTURO</strong> cuando los instales físicamente.

              </div>

            )}

          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

            <button

              onClick={() => setShowVisualIndicators(prev => !prev)}

              style={{

                background: showVisualIndicators ? 'rgba(0, 243, 255, 0.22)' : 'rgba(255, 255, 255, 0.05)',

                border: `1.5px solid ${showVisualIndicators ? '#00f3ff' : 'rgba(255, 255, 255, 0.15)'}`,

                color: showVisualIndicators ? '#00f3ff' : '#94a3b8',

                borderRadius: '10px',

                padding: '7px 14px',

                fontSize: '0.78rem',

                fontWeight: 800,

                cursor: 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '6px'

              }}

              title="Alternar entre indicadores gráficos reales y vista clásica"

            >

              <span>{showVisualIndicators ? '💡' : '📋'}</span>

              <span>{showVisualIndicators ? 'Indicadores Visuales: ON' : 'Vista Clásica'}</span>

            </button>

            {[

              { id: 'all', label: `Todos (${sensors.length})`, color: '#00f3ff' },

              { id: 'installed', label: `🟢 Activos Ahora (${installedSensorsCount})`, color: '#065f46' },

              { id: 'future', label: `⏳ Futuros / Preparados (${futureSensorsCount})`, color: '#c084fc' }

            ].map(sf => (

              <button

                key={sf.id}

                onClick={() => { setSensorFilter(sf.id);  }}

                style={{

                  background: sensorFilter === sf.id ? `${sf.color}28` : 'rgba(15, 23, 42, 0.8)',

                  border: sensorFilter === sf.id ? `1.5px solid ${sf.color}` : '1px solid rgba(255,255,255,0.1)',

                  color: sensorFilter === sf.id ? '#fff' : '#94a3b8',

                  borderRadius: '10px',

                  padding: '7px 14px',

                  fontSize: '0.78rem',

                  fontWeight: 800,

                  cursor: 'pointer'

                }}

              >

                {sf.label}

              </button>

            ))}

          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMinimalist ? 'repeat(auto-fill, minmax(175px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMinimalist ? '8px' : '14px' }}>

          {filteredSensors.map(sensor => {

            const isAlert = sensor.state === 'leak' || sensor.state === 'warning' || sensor.state === 'alarm' || sensor.state === 'open';

            const isPresence = sensor.category === 'presence' && sensor.state === 'on';

            const isInstalled = Boolean(sensor.installed);

            return (

              <div

                key={sensor.id}

                style={{

                  background: isAlert

                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(15, 23, 42, 0.95))'

                    : isPresence

                      ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(15, 23, 42, 0.95))'

                      : isInstalled

                        ? 'rgba(15, 23, 42, 0.85)'

                        : 'rgba(15, 23, 42, 0.5)',

                  border: isAlert

                    ? '2px solid #ef4444'

                    : isPresence

                      ? '2px solid #00f3ff'

                      : isInstalled

                        ? '1.5px solid rgba(6, 95, 70, 0.45)'

                        : '1px dashed rgba(168, 85, 247, 0.45)',

                  borderRadius: isMinimalist ? '12px' : '14px',

                  padding: isMinimalist ? '8px 10px' : '16px',

                  display: 'flex',

                  flexDirection: 'column',

                  justifyContent: 'space-between',

                  gap: isMinimalist ? '6px' : '12px'

                }}

              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMinimalist ? '6px' : '8px' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: isMinimalist ? '8px' : '10px', minWidth: 0, overflow: 'hidden' }}>

                    <div style={{

                      width: isMinimalist ? '32px' : '40px',

                      height: isMinimalist ? '32px' : '40px',

                      borderRadius: isMinimalist ? '8px' : '10px',

                      background: 'rgba(0, 243, 255, 0.1)',

                      border: '1px solid rgba(0, 243, 255, 0.3)',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      fontSize: isMinimalist ? '1.1rem' : '1.3rem',

                      flexShrink: 0

                    }}>

                      {getSensorIcon(sensor.category)}

                    </div>

                    <div style={{ minWidth: 0, overflow: 'hidden' }}>

                      <div style={{

                        fontSize: isMinimalist ? '0.82rem' : '0.9rem',

                        fontWeight: 800,

                        color: '#fff',

                        whiteSpace: 'nowrap',

                        overflow: 'hidden',

                        textOverflow: 'ellipsis'

                      }}>

                        {sensor.name}

                      </div>

                      <div style={{

                        fontSize: isMinimalist ? '0.62rem' : '0.68rem',

                        color: '#94a3b8',

                        marginTop: isMinimalist ? '1px' : '2px',

                        whiteSpace: 'nowrap',

                        overflow: 'hidden',

                        textOverflow: 'ellipsis'

                      }}>

                        {(ROOM_LABELS[sensor.room] || sensor.room || 'General').toUpperCase()}{!isMinimalist ? ` · ${sensor.protocol}` : ''}

                      </div>

                    </div>

                  </div>

                  <span style={{

                    padding: isMinimalist ? '2px 6px' : '3px 9px',

                    borderRadius: '999px',

                    fontSize: isMinimalist ? '0.58rem' : '0.64rem',

                    fontWeight: 800,

                    background: isInstalled ? 'rgba(6, 95, 70, 0.2)' : 'rgba(168, 85, 247, 0.18)',

                    color: isInstalled ? '#065f46' : '#e9d5ff',

                    border: `1px solid ${isInstalled ? '#065f46' : '#c084fc'}`,

                    whiteSpace: 'nowrap',

                    flexShrink: 0

                  }}>

                    {isInstalled ? '🟢 EN VIVO' : '⏳ FUTURO'}

                  </span>

                </div>

                {/* Indicador Visual Real o Valor Central */}

                {isMinimalist ? (

                  <div style={{

                    display: 'flex',

                    justifyContent: 'space-between',

                    alignItems: 'center',

                    paddingTop: '6px',

                    borderTop: '1px solid rgba(255,255,255,0.06)'

                  }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                      <span style={{

                        width: '7px',

                        height: '7px',

                        borderRadius: '50%',

                        background: isAlert ? '#ef4444' : (isPresence ? '#00f3ff' : '#065f46'),

                        boxShadow: `0 0 8px ${isAlert ? '#ef4444' : (isPresence ? '#00f3ff' : '#065f46')}`

                      }} />

                      <span style={{

                        fontSize: '0.78rem',

                        fontWeight: 800,

                        color: isAlert ? '#f87171' : (isPresence ? '#00f3ff' : '#065f46')

                      }}>

                        {sensor.value || (isAlert ? 'Alerta' : isPresence ? 'Presencia' : 'Normal')}

                      </span>

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.64rem', color: '#94a3b8' }}>

                      {sensor.battery !== undefined && (

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>

                          <Battery size={11} color="#065f46" />

                          <span>{sensor.battery}%</span>

                        </div>

                      )}

                      {sensor.lqi !== undefined && (

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>

                          <Wifi size={11} color="#00f3ff" />

                          <span>{sensor.lqi}</span>

                        </div>

                      )}

                    </div>

                  </div>

                ) : (

                  showVisualIndicators ? (

                    <div>

                      {renderVisualSensorStatus(sensor)}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.7rem', color: '#94a3b8', padding: '0 4px' }}>

                        <span style={{ fontSize: '0.66rem', color: '#64748b' }}>

                          {isInstalled ? '🟢 TELEMETRÍA EN TIEMPO REAL' : '⏳ FUTURA INSTALACIÓN'}

                        </span>

                        <div style={{ display: 'flex', gap: '10px' }}>

                          {sensor.is_online === false ? (

                            <span style={{ color: '#f87171', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '4px', padding: '1px 6px' }}>

                              ⚠️ Sin señal ({sensor.offline_hours}h)

                            </span>

                          ) : (

                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>

                              <Battery size={13} color="#065f46" />

                              <span>{sensor.battery ?? 100}%</span>

                            </div>

                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>

                            <Wifi size={12} color="#00f3ff" />

                            <span>{sensor.lqi || 150} LQI</span>

                          </div>

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div style={{

                      background: 'rgba(2, 6, 23, 0.75)',

                      borderRadius: '10px',

                      padding: '12px 14px',

                      display: 'flex',

                      justifyContent: 'space-between',

                      alignItems: 'center'

                    }}>

                      <div>

                        <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>

                          {isInstalled ? 'ESTADO ACTUAL' : 'ESTADO PREVISTO (PRE-CONFIGURADO)'}

                        </div>

                        <div style={{

                          fontSize: '1.25rem',

                          fontWeight: 900,

                          color: isAlert ? '#f87171' : isPresence ? '#00f3ff' : '#065f46',

                          marginTop: '2px'

                        }}>

                          {sensor.value || 'Normal'}

                        </div>

                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>

                          <Battery size={13} color="#065f46" />

                          <span>{sensor.battery ?? 100}%</span>

                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px' }}>

                          <Wifi size={12} color="#00f3ff" />

                          <span>{sensor.lqi || 150} LQI</span>

                        </div>

                      </div>

                    </div>

                  )

                )}

              </div>

            );

          })}

        </div>

      </div>

      )}

      {/* ===================================================================== */}

      {/* MODAL CONFIGURADOR DE BOTÓN MULTI-ESCENA                              */}

      {/* ===================================================================== */}

      {editingButton && (

        <div style={{

          position: 'fixed',

          top: 0, left: 0, right: 0, bottom: 0,

          zIndex: 10000,

          background: 'rgba(2, 6, 23, 0.88)',

          backdropFilter: 'blur(8px)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          padding: '18px'

        }}>

          <div style={{

            background: 'linear-gradient(145deg, rgba(8, 15, 35, 0.98), rgba(4, 9, 22, 0.98))',

            border: `1.5px solid ${editingButton.color || '#00f3ff'}`,

            borderRadius: '18px',

            width: '100%',

            maxWidth: '680px',

            maxHeight: '90vh',

            display: 'flex',

            flexDirection: 'column',

            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',

            color: '#f8fafc'

          }}>

            {/* Cabecera del Modal */}

            <div style={{

              padding: '18px 22px',

              borderBottom: '1px solid rgba(255,255,255,0.1)',

              display: 'flex',

              justifyContent: 'space-between',

              alignItems: 'center'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                <div style={{

                  width: '44px',

                  height: '44px',

                  borderRadius: '12px',

                  background: `${editingButton.color || '#00f3ff'}25`,

                  border: `1.5px solid ${editingButton.color || '#00f3ff'}`,

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  fontSize: '1.45rem'

                }}>

                  {editingButton.icon || '⚡'}

                </div>

                <div>

                  <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: '#fff' }}>

                    {editingButton.is_new ? '➕ Crear Botón de Escenas Rápidas' : `✏️ Configurar Botón: ${editingButton.title}`}

                  </h3>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>

                    Selecciona <strong>una o varias escenas rápidas</strong> para que se ejecuten juntas al pulsar este botón.

                  </div>

                </div>

              </div>

              <button

                onClick={() => setEditingButton(null)}

                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}

              >

                <X size={18} />

              </button>

            </div>

            {/* Cuerpo del Modal */}

            <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>

                <div>

                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>

                    NOMBRE DEL BOTÓN

                  </label>

                  <input

                    type="text"

                    value={editingButton.title || ''}

                    onChange={e => setEditingButton({ ...editingButton, title: e.target.value })}

                    placeholder="Ej: Noche de Cine + Apagar Pasillo"

                    style={{

                      width: '100%',

                      boxSizing: 'border-box',

                      background: '#0f172a',

                      border: `1px solid ${editingButton.color || '#00f3ff'}`,

                      borderRadius: '10px',

                      padding: '10px 12px',

                      color: '#fff',

                      fontSize: '0.9rem',

                      fontWeight: 700

                    }}

                  />

                </div>

                <div>

                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>

                    DESCRIPCIÓN CORTA (OPCIONAL)

                  </label>

                  <input

                    type="text"

                    value={editingButton.description || ''}

                    onChange={e => setEditingButton({ ...editingButton, description: e.target.value })}

                    placeholder="Ej: Prepara el salón y apaga resto"

                    style={{

                      width: '100%',

                      boxSizing: 'border-box',

                      background: '#0f172a',

                      border: '1px solid rgba(255,255,255,0.15)',

                      borderRadius: '10px',

                      padding: '10px 12px',

                      color: '#cbd5e1',

                      fontSize: '0.84rem'

                    }}

                  />

                </div>

              </div>

              {/* Selector de Icono y Color */}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                <div>

                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>

                    ICONO DEL BOTÓN

                  </label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>

                    {BUTTON_ICONS.map(ic => (

                      <button

                        key={ic}

                        type="button"

                        onClick={() => setEditingButton({ ...editingButton, icon: ic })}

                        style={{

                          background: editingButton.icon === ic ? 'rgba(0, 243, 255, 0.28)' : '#0f172a',

                          border: editingButton.icon === ic ? '1.5px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',

                          borderRadius: '8px',

                          padding: '6px 9px',

                          fontSize: '1.1rem',

                          cursor: 'pointer'

                        }}

                      >

                        {ic}

                      </button>

                    ))}

                  </div>

                </div>

                <div>

                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>

                    COLOR DEL BOTÓN

                  </label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>

                    {BUTTON_COLORS.map(c => (

                      <button

                        key={c.hex}

                        type="button"

                        onClick={() => setEditingButton({ ...editingButton, color: c.hex })}

                        style={{

                          background: editingButton.color === c.hex ? `${c.hex}33` : '#0f172a',

                          border: editingButton.color === c.hex ? `2px solid ${c.hex}` : '1px solid rgba(255,255,255,0.14)',

                          color: c.hex,

                          borderRadius: '8px',

                          padding: '5px 10px',

                          fontSize: '0.72rem',

                          fontWeight: 800,

                          cursor: 'pointer',

                          display: 'flex',

                          alignItems: 'center',

                          gap: '5px'

                        }}

                      >

                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: c.hex }} />

                        {c.label}

                      </button>

                    ))}

                  </div>

                </div>

              </div>

              {/* Selector Multi-Escena con Checkboxes Visuales */}

              <div style={{

                background: 'rgba(15, 23, 42, 0.75)',

                border: '1px solid rgba(0, 243, 255, 0.28)',

                borderRadius: '14px',

                padding: '14px 16px'

              }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>

                  <div>

                    <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#00f3ff' }}>

                      🎬 SELECCIONA QUÉ ESCENAS RÁPIDAS EJECUTARÁ ESTE BOTÓN ({(editingButton.scene_ids || []).length} seleccionadas)

                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>

                      Puedes marcar <strong>una sola o varias escenas a la vez</strong> para que se lancen simultáneamente.

                    </div>

                  </div>

                  <button

                    type="button"

                    onClick={() => setEditingAuto({

                      is_new: true,

                      name: 'Nueva Escena Rápida',

                      description: 'Creada desde el configurador de botones',

                      icon: '✨',

                      category: 'scene',

                      is_quick_scene: true,

                      quick_color: '#00f3ff',

                      enabled: true,

                      trigger: { type: 'manual' },

                      actions: []

                    })}

                    style={{

                      background: 'rgba(6, 95, 70, 0.2)',

                      border: '1px solid #065f46',

                      color: '#065f46',

                      borderRadius: '8px',

                      padding: '5px 10px',

                      fontSize: '0.72rem',

                      fontWeight: 800,

                      cursor: 'pointer'

                    }}

                  >

                    + Crear Nueva Escena

                  </button>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>

                  {automations.map(auto => {

                    const isSelected = (editingButton.scene_ids || []).includes(auto.id);

                    const actCount = auto.actions?.length || 0;

                    return (

                      <div

                        key={auto.id}

                        onClick={() => toggleSceneInButtonModal(auto.id)}

                        style={{

                          background: isSelected ? 'rgba(0, 243, 255, 0.18)' : 'rgba(2, 6, 23, 0.75)',

                          border: isSelected ? '2px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',

                          borderRadius: '10px',

                          padding: '10px 12px',

                          cursor: 'pointer',

                          display: 'flex',

                          alignItems: 'center',

                          justifyContent: 'space-between',

                          gap: '10px',

                          transition: 'all 0.15s ease'

                        }}

                      >

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>

                          <div style={{

                            width: '22px',

                            height: '22px',

                            borderRadius: '6px',

                            background: isSelected ? '#00f3ff' : 'rgba(255,255,255,0.08)',

                            border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.25)',

                            color: '#020617',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            fontWeight: 900,

                            fontSize: '0.8rem',

                            flexShrink: 0

                          }}>

                            {isSelected ? '✓' : ''}

                          </div>

                          <span style={{ fontSize: '1.25rem' }}>{auto.icon || '⚡'}</span>

                          <div style={{ overflow: 'hidden' }}>

                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                              {auto.name}

                            </div>

                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>

                              {actCount} dispositivo{actCount !== 1 ? 's' : ''}

                            </div>

                          </div>

                        </div>

                        <button

                          type="button"

                          onClick={(e) => {

                            e.stopPropagation();

                            setEditingAuto(JSON.parse(JSON.stringify(auto)));

                          }}

                          style={{

                            background: 'rgba(255,255,255,0.07)',

                            border: '1px solid rgba(255,255,255,0.15)',

                            color: '#cbd5e1',

                            borderRadius: '6px',

                            padding: '4px 6px',

                            fontSize: '0.66rem',

                            cursor: 'pointer',

                            flexShrink: 0

                          }}

                          title="Editar dispositivos de esta escena"

                        >

                          ✏️ Luces

                        </button>

                      </div>

                    );

                  })}

                </div>

              </div>

            </div>

            {/* Pie del Modal */}

            <div style={{

              padding: '16px 22px',

              borderTop: '1px solid rgba(255,255,255,0.1)',

              display: 'flex',

              justifyContent: 'space-between',

              alignItems: 'center',

              background: 'rgba(4, 9, 22, 0.7)'

            }}>

              {!editingButton.is_new ? (

                <button

                  type="button"

                  onClick={() => handleDeleteCustomButton(editingButton.id, editingButton.title)}

                  style={{

                    background: 'rgba(239, 68, 68, 0.16)',

                    border: '1px solid #ef4444',

                    color: '#f87171',

                    borderRadius: '9px',

                    padding: '8px 14px',

                    fontSize: '0.78rem',

                    fontWeight: 800,

                    cursor: 'pointer',

                    display: 'flex',

                    alignItems: 'center',

                    gap: '6px'

                  }}

                >

                  <Trash2 size={15} /> Eliminar Botón

                </button>

              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>

                <button

                  type="button"

                  onClick={() => setEditingButton(null)}

                  style={{

                    background: 'rgba(255,255,255,0.08)',

                    border: '1px solid rgba(255,255,255,0.18)',

                    color: '#cbd5e1',

                    borderRadius: '9px',

                    padding: '8px 16px',

                    fontSize: '0.8rem',

                    fontWeight: 700,

                    cursor: 'pointer'

                  }}

                >

                  Cancelar

                </button>

                <button

                  type="button"

                  onClick={handleSaveCustomButton}

                  style={{

                    background: 'linear-gradient(135deg, #00f3ff, #065f46)',

                    border: 'none',

                    color: '#020617',

                    borderRadius: '9px',

                    padding: '8px 20px',

                    fontSize: '0.82rem',

                    fontWeight: 900,

                    cursor: 'pointer',

                    boxShadow: '0 0 16px rgba(0, 243, 255, 0.4)'

                  }}

                >

                  💾 Guardar Botón Multi-Escena

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* Modal para Editar una Escena Base */}

      {editingAuto && (

        <AutomationEditModal

          auto={editingAuto}

          availableDevices={devices}

          availableSensors={sensors}

          onSave={handleSaveAutomation}

          onDelete={handleDeleteAutomation}

          onClose={() => setEditingAuto(null)}

        />

      )}

    </div>

  );

}


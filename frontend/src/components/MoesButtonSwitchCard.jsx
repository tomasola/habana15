import React, { useState, useEffect } from 'react';
import { 
  Zap, Battery, Wifi, Play, Plus, CheckCircle2, 
  Sparkles, Sliders, Edit3, Power, RefreshCw, Radio,
  Settings, Trash2, X, Lightbulb, Film, SunMedium, 
  ToggleLeft, Layers, Check, AlertCircle, ArrowRight
} from 'lucide-react';

const MOES_BUTTON_DEFS = [
  { id: '1', name: 'Botón 1', pos: 'Sup. Izquierda', icon: '↖️' },
  { id: '2', name: 'Botón 2', pos: 'Sup. Derecha', icon: '↗️' },
  { id: '3', name: 'Botón 3', pos: 'Inf. Izquierda', icon: '↙️' },
  { id: '4', name: 'Botón 4', pos: 'Inf. Derecha', icon: '↘️' }
];

const CLICK_TYPES = [
  { id: 'single', name: '1 Clic', label: 'Clic Simple', icon: '🔘', desc: 'Pulsación corta estándar' },
  { id: 'double', name: 'Doble Clic', label: '2 Clics Rápidos', icon: '⚡', desc: 'Doble pulsación rápida' },
  { id: 'hold', name: 'Mantener', label: 'Pulsación Larga', icon: '⏳', desc: 'Mantener presionado >1 seg' }
];

export default function MoesButtonSwitchCard({ 
  sensor = null, 
  automations = [], 
  API_BASE = '', 
  onNavigateTab = null,
  onOpenNewAutomation = null,
  onRefresh = null,
  compact = false
}) {
  const [testingAction, setTestingAction] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Datos auxiliares cargados directamente
  const [localDevices, setLocalDevices] = useState([]);
  const [localAutomations, setLocalAutomations] = useState(automations || []);

  // Estado del Modal de Configuración / Edición de Botón
  const [editingBtn, setEditingBtn] = useState(null);
  const [selectedClickType, setSelectedClickType] = useState('single');
  const [actionCategory, setActionCategory] = useState('device'); // 'device' | 'scene'
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedDeviceAction, setSelectedDeviceAction] = useState('toggle'); // 'toggle' | 'turn_on' | 'turn_off' | 'all_off'
  const [selectedBrightness, setSelectedBrightness] = useState(100);
  const [selectedScene, setSelectedScene] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  const attrs = sensor?.attributes || {};
  const battery = Number(sensor?.battery ?? attrs.battery ?? 100);
  const lqi = Number(sensor?.lqi ?? attrs.linkquality ?? 153);
  const rawAction = attrs.last_action || attrs.action || sensor?.state || 'idle';
  const lastAction = typeof rawAction === 'string' ? rawAction : String(rawAction || 'idle');
  const ieee = String(sensor?.ieee || '0x842712fffe2799a0');
  const room = String(sensor?.room || 'salon');
  const sensorId = String(sensor?.id || 'sensor_pulsador_4_botones');

  // Sincronizar automations si cambian por props
  useEffect(() => {
    if (Array.isArray(automations) && automations.length > 0) {
      setLocalAutomations(automations);
    }
  }, [automations]);

  // Cargar lista de dispositivos físicos reales y escenas
  const fetchAuxData = async () => {
    try {
      const [devRes, autoRes] = await Promise.all([
        fetch(`${API_BASE}/api/devices?real_only=true`),
        fetch(`${API_BASE}/api/automations`)
      ]);
      if (devRes.ok) {
        const devData = await devRes.json();
        if (Array.isArray(devData)) setLocalDevices(devData);
      }
      if (autoRes.ok) {
        const autoData = await autoRes.json();
        const list = Array.isArray(autoData) ? autoData : (autoData?.automations || []);
        if (Array.isArray(list)) setLocalAutomations(list);
      }
    } catch (e) {
      console.warn('Error sincronizando dispositivos/escenas:', e);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, [API_BASE]);

  // Analizar qué botón y qué tipo de clic fue el último
  const lastBtnMatch = typeof lastAction === 'string' ? lastAction.match(/^([1-4])_(single|double|hold)$/) : null;
  const activeBtnId = lastBtnMatch ? lastBtnMatch[1] : null;
  const activeClickType = lastBtnMatch ? lastBtnMatch[2] : null;

  // Buscar todas las automatizaciones de un botón específico
  const getAutomationsForButton = (btnId) => {
    const list = localAutomations.length > 0 ? localAutomations : (Array.isArray(automations) ? automations : []);
    return list.filter(a => {
      if (!a) return false;
      const ent = String(a.trigger?.entity_id || '').toLowerCase();
      const toState = String(a.trigger?.to_state || '').toLowerCase();
      const closeState = String(a.trigger?.close_state || '').toLowerCase();
      const isMoes = ent.includes('pulsador') || ent.includes('moes') || ent === sensorId.toLowerCase() || ent === ieee.toLowerCase();
      if (!isMoes) return false;
      return (
        toState.startsWith(`${btnId}_`) || 
        closeState.startsWith(`${btnId}_`) || 
        toState.startsWith('*_') ||
        closeState.startsWith('*_')
      );
    });
  };

  // Buscar automatización exacta para (botón + tipo de clic)
  const getAutomationForButtonAndClick = (btnId, clickType) => {
    const list = localAutomations.length > 0 ? localAutomations : (Array.isArray(automations) ? automations : []);
    const targetState = `${btnId}_${clickType}`.toLowerCase();
    return list.find(a => {
      if (!a) return false;
      const ent = String(a.trigger?.entity_id || '').toLowerCase();
      const toState = String(a.trigger?.to_state || '').toLowerCase();
      const closeState = String(a.trigger?.close_state || '').toLowerCase();
      const isMoes = ent.includes('pulsador') || ent.includes('moes') || ent === sensorId.toLowerCase() || ent === ieee.toLowerCase();
      if (!isMoes) return false;
      return toState === targetState || closeState === targetState;
    });
  };

  // Abrir modal de configuración
  const handleOpenEdit = (btnDef, initialClickType = 'single') => {
    setEditingBtn(btnDef);
    setSelectedClickType(initialClickType);
    setModalFeedback(null);

    // Cargar valores existentes si ya hay una regla para este clic
    const existing = getAutomationForButtonAndClick(btnDef.id, initialClickType);
    if (existing) {
      const firstAct = existing.actions?.[0] || {};
      const isSceneType = existing.category === 'scene' || firstAct.type === 'scene' || (firstAct.entity_id && firstAct.entity_id.startsWith('scene_'));
      
      if (isSceneType) {
        setActionCategory('scene');
        setSelectedScene(firstAct.entity_id || existing.id);
      } else {
        setActionCategory('device');
        setSelectedDevice(firstAct.entity_id || (localDevices[0]?.id || ''));
        setSelectedDeviceAction(firstAct.action || 'toggle');
        if (firstAct.brightness) setSelectedBrightness(firstAct.brightness);
      }
    } else {
      // Valores predeterminados sugeridos
      setActionCategory('device');
      setSelectedDevice(localDevices[0]?.id || 'luz_luz_principal_del_salon_53c1');
      setSelectedDeviceAction('toggle');
      setSelectedBrightness(100);
      setSelectedScene(localAutomations.find(a => a.category === 'scene')?.id || '');
    }
  };

  // Cambiar tipo de clic dentro del modal
  const handleTabClickType = (clickType) => {
    setSelectedClickType(clickType);
    setModalFeedback(null);
    if (!editingBtn) return;

    const existing = getAutomationForButtonAndClick(editingBtn.id, clickType);
    if (existing) {
      const firstAct = existing.actions?.[0] || {};
      const isSceneType = existing.category === 'scene' || firstAct.type === 'scene' || (firstAct.entity_id && firstAct.entity_id.startsWith('scene_'));
      if (isSceneType) {
        setActionCategory('scene');
        setSelectedScene(firstAct.entity_id || existing.id);
      } else {
        setActionCategory('device');
        setSelectedDevice(firstAct.entity_id || (localDevices[0]?.id || ''));
        setSelectedDeviceAction(firstAct.action || 'toggle');
        if (firstAct.brightness) setSelectedBrightness(firstAct.brightness);
      }
    }
  };

  // Guardar asignación en el Backend
  const handleSaveAssignment = async () => {
    if (!editingBtn) return;
    setIsSaving(true);
    setModalFeedback(null);

    try {
      const existing = getAutomationForButtonAndClick(editingBtn.id, selectedClickType);
      const autoId = existing?.id || `auto_moes_b${editingBtn.id}_${selectedClickType}`;
      const clickDef = CLICK_TYPES.find(c => c.id === selectedClickType) || { name: selectedClickType };

      let payload = null;

      if (actionCategory === 'device') {
        const isAllOff = selectedDeviceAction === 'all_off';
        const targetDev = isAllOff 
          ? { id: 'all_lights', name: 'Todas las Luces de la Casa' }
          : localDevices.find(d => d.id === selectedDevice) || { id: selectedDevice, name: selectedDevice };

        const actionText = isAllOff ? 'Apagar Todo' : selectedDeviceAction === 'toggle' ? 'Alternar' : selectedDeviceAction === 'turn_on' ? 'Encender' : 'Apagar';

        payload = {
          id: autoId,
          name: `Moes B${editingBtn.id} (${clickDef.name}) ➔ ${actionText}: ${targetDev.name || targetDev.id}`,
          category: 'lighting',
          enabled: true,
          trigger: {
            type: 'sensor',
            entity_id: sensorId,
            to_state: `${editingBtn.id}_${selectedClickType}`
          },
          actions: [
            isAllOff 
              ? { type: 'device', entity_id: 'all_lights', action: 'turn_off_all' }
              : {
                  type: 'device',
                  entity_id: targetDev.id,
                  action: selectedDeviceAction,
                  ...(selectedDeviceAction === 'turn_on' && selectedBrightness < 100 ? { brightness: Number(selectedBrightness) } : {})
                }
          ]
        };
      } else {
        // Escena o automatización existente
        const targetSceneObj = localAutomations.find(a => a.id === selectedScene) || { id: selectedScene, name: selectedScene };
        payload = {
          id: autoId,
          name: `Moes B${editingBtn.id} (${clickDef.name}) ➔ ${targetSceneObj.name || targetSceneObj.id}`,
          category: 'scene',
          enabled: true,
          trigger: {
            type: 'sensor',
            entity_id: sensorId,
            to_state: `${editingBtn.id}_${selectedClickType}`
          },
          actions: [
            {
              type: 'scene',
              entity_id: targetSceneObj.id,
              action: 'scene'
            }
          ]
        };
      }

      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalFeedback({ type: 'success', msg: `✔ Asignación guardada para ${editingBtn.name} (${clickDef.name})` });
        setFeedbackMsg(`✔ ${editingBtn.name} configurado: ${payload.name}`);
        await fetchAuxData();
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setEditingBtn(null);
          setTimeout(() => setFeedbackMsg(null), 3500);
        }, 1100);
      } else {
        const err = await res.json().catch(() => ({}));
        setModalFeedback({ type: 'error', msg: `Error: ${err.message || 'No se pudo guardar la regla'}` });
      }
    } catch (e) {
      setModalFeedback({ type: 'error', msg: `Fallo de comunicación: ${e.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar asignación actual
  const handleDeleteAssignment = async () => {
    if (!editingBtn) return;
    const existing = getAutomationForButtonAndClick(editingBtn.id, selectedClickType);
    if (!existing) return;

    if (!window.confirm(`¿Desvincular la regla "${existing.name}" de este botón?`)) return;

    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/automations/${existing.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setModalFeedback({ type: 'success', msg: `✔ Regla eliminada de ${editingBtn.name}` });
        setFeedbackMsg(`✔ Regla desvinculada de ${editingBtn.name}`);
        await fetchAuxData();
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setEditingBtn(null);
          setTimeout(() => setFeedbackMsg(null), 3000);
        }, 900);
      } else {
        setModalFeedback({ type: 'error', msg: 'Error al eliminar la regla' });
      }
    } catch (e) {
      setModalFeedback({ type: 'error', msg: `Fallo de red: ${e.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Simular pulsación física de prueba
  const handleSimulatePress = async (actionCode) => {
    setTestingAction(actionCode);
    setFeedbackMsg(`⚡ Probando ${actionCode}...`);
    try {
      const res = await fetch(`${API_BASE}/api/sensors/${sensorId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: actionCode })
      });
      if (res.ok) {
        setFeedbackMsg(`✔ Pulsación "${actionCode}" ejecutada con éxito`);
        if (onRefresh) onRefresh();
      } else {
        setFeedbackMsg(`⚠️ Error al simular ${actionCode}`);
      }
    } catch (e) {
      setFeedbackMsg(`❌ Fallo de conexión`);
    } finally {
      setTimeout(() => {
        setTestingAction(null);
        setTimeout(() => setFeedbackMsg(null), 2500);
      }, 400);
    }
  };

  // Lista de escenas y automatizaciones para el selector
  const availableScenes = localAutomations.filter(a => a && a.id);

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(6, 12, 28, 0.98))',
      border: '1.5px solid rgba(0, 243, 255, 0.4)',
      borderRadius: '16px',
      padding: compact ? '16px' : '22px',
      boxShadow: '0 8px 32px rgba(0, 243, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Luz ambiental sutil de fondo */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 140,
        height: 140,
        background: 'radial-gradient(circle, rgba(0, 243, 255, 0.22) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* CABECERA: Identidad del Pulsador Moes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(16, 185, 129, 0.15))',
            border: '1.5px solid #00f3ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 0 16px rgba(0, 243, 255, 0.25)'
          }}>
            🔘
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '0.4px' }}>
                {sensor?.name || 'Pulsador Moes 4 Botones'}
              </h3>
              <span style={{
                background: 'rgba(0, 243, 255, 0.16)',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                TS0044 · Zigbee 3.0
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📍 {room.toUpperCase()}</span>
              <span>•</span>
              <span style={{ fontFamily: 'monospace' }}>{ieee}</span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>🟢 Activo</span>
            </div>
          </div>
        </div>

        {/* Telemetría: Batería, LQI y Última Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '5px 10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem'
          }}>
            <Battery size={14} color={battery > 25 ? '#34d399' : '#ef4444'} />
            <span style={{ fontWeight: 800, color: battery > 25 ? '#34d399' : '#ef4444' }}>{battery}%</span>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '5px 10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            color: '#00f3ff'
          }}>
            <Wifi size={14} />
            <span style={{ fontWeight: 800 }}>{lqi} LQI</span>
          </div>

          <div style={{
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '0.74rem',
            color: '#00f3ff',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>⚡ Última:</span>
            <span style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
              {lastAction}
            </span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{
          background: 'rgba(0, 243, 255, 0.18)',
          border: '1px solid #00f3ff',
          color: '#00f3ff',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>✨</span>
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* CUADRO FÍSICO DE 4 BOTONES (DISEÑO HARDWARE 2x2) */}
      <div>
        <div style={{
          fontSize: '0.72rem',
          color: '#94a3b8',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>CUADRO FÍSICO DE 4 PULSADORES (PULSACIÓN / EDICIÓN EN VIVO)</span>
          <span style={{ fontSize: '0.68rem', color: '#00f3ff' }}>
            Pulsa ✏️ Editar en cualquier botón para asignarle luces o escenas
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          background: 'rgba(2, 6, 23, 0.75)',
          padding: '14px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {MOES_BUTTON_DEFS.map(b => {
            const isActive = activeBtnId === b.id;
            const isCurrentlyTesting = testingAction && testingAction.startsWith(`${b.id}_`);

            const autoSingle = getAutomationForButtonAndClick(b.id, 'single');
            const autoDouble = getAutomationForButtonAndClick(b.id, 'double');
            const autoHold = getAutomationForButtonAndClick(b.id, 'hold');
            const hasAnyAction = autoSingle || autoDouble || autoHold;

            return (
              <div
                key={b.id}
                style={{
                  background: isActive 
                    ? 'linear-gradient(145deg, rgba(0, 243, 255, 0.18), rgba(16, 185, 129, 0.12))' 
                    : 'rgba(15, 23, 42, 0.85)',
                  border: isActive 
                    ? '2px solid #00f3ff' 
                    : '1.5px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: isActive ? '0 0 20px rgba(0, 243, 255, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Cabecera del Botón con botón de EDITAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#fff' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: isActive ? '#00f3ff' : '#94a3b8' }}>
                        {b.pos}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isActive && (
                      <span style={{
                        background: 'rgba(0, 243, 255, 0.25)',
                        border: '1px solid #00f3ff',
                        color: '#00f3ff',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '5px',
                        animation: 'pulse 1.5s infinite'
                      }}>
                        ⚡ {activeClickType === 'single' ? '1 Clic' : activeClickType === 'double' ? 'Doble' : 'Hold'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b, 'single')}
                      style={{
                        background: 'rgba(0, 243, 255, 0.15)',
                        border: '1px solid rgba(0, 243, 255, 0.45)',
                        color: '#00f3ff',
                        borderRadius: '7px',
                        padding: '4px 8px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00f3ff';
                        e.currentTarget.style.color = '#020617';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)';
                        e.currentTarget.style.color = '#00f3ff';
                      }}
                      title={`Editar asignaciones de ${b.name}`}
                    >
                      <Edit3 size={11} />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>

                {/* Resumen de Acciones Asignadas por Clic */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.70rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  minHeight: '68px',
                  justifyContent: 'center'
                }}>
                  {hasAnyAction ? (
                    <>
                      {/* 1 Clic */}
                      <div 
                        onClick={() => handleOpenEdit(b, 'single')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '6px' }}
                        title="Clic para configurar 1 Clic"
                      >
                        <span style={{ color: '#94a3b8', fontSize: '0.64rem', minWidth: '45px' }}>🔘 1 Clic:</span>
                        <span style={{ 
                          color: autoSingle ? '#38bdf8' : '#64748b', 
                          fontWeight: autoSingle ? 700 : 400,
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {autoSingle ? autoSingle.name.replace(/^Moes B\d \([^)]+\) ➔ /, '') : '— Sin asignar'}
                        </span>
                        <Edit3 size={10} color="#00f3ff" opacity={0.6} />
                      </div>

                      {/* 2 Clics */}
                      <div 
                        onClick={() => handleOpenEdit(b, 'double')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '6px' }}
                        title="Clic para configurar Doble Clic"
                      >
                        <span style={{ color: '#94a3b8', fontSize: '0.64rem', minWidth: '45px' }}>⚡ 2 Clics:</span>
                        <span style={{ 
                          color: autoDouble ? '#fbbf24' : '#64748b', 
                          fontWeight: autoDouble ? 700 : 400,
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {autoDouble ? autoDouble.name.replace(/^Moes B\d \([^)]+\) ➔ /, '') : '— Sin asignar'}
                        </span>
                        <Edit3 size={10} color="#fbbf24" opacity={0.6} />
                      </div>

                      {/* Hold */}
                      <div 
                        onClick={() => handleOpenEdit(b, 'hold')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '6px' }}
                        title="Clic para configurar Mantener Presionado"
                      >
                        <span style={{ color: '#94a3b8', fontSize: '0.64rem', minWidth: '45px' }}>⏳ Hold:</span>
                        <span style={{ 
                          color: autoHold ? '#c084fc' : '#64748b', 
                          fontWeight: autoHold ? 700 : 400,
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {autoHold ? autoHold.name.replace(/^Moes B\d \([^)]+\) ➔ /, '') : '— Sin asignar'}
                        </span>
                        <Edit3 size={10} color="#c084fc" opacity={0.6} />
                      </div>
                    </>
                  ) : (
                    <div 
                      onClick={() => handleOpenEdit(b, 'single')}
                      style={{ 
                        color: '#64748b', 
                        fontStyle: 'italic', 
                        textAlign: 'center',
                        cursor: 'pointer',
                        padding: '6px 0'
                      }}
                    >
                      ⚪ Sin funciones asignadas
                      <div style={{ color: '#00f3ff', fontSize: '0.66rem', fontStyle: 'normal', fontWeight: 700, marginTop: '2px' }}>
                        + Toca aquí o en Editar para configurar
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones de Prueba en Vivo (Simular Clavija Física) */}
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => handleSimulatePress(`${b.id}_single`)}
                    disabled={isCurrentlyTesting}
                    title="Simular 1 Clic Simple"
                    style={{
                      flex: 1,
                      background: testingAction === `${b.id}_single` ? '#00f3ff' : 'rgba(0, 243, 255, 0.12)',
                      border: '1px solid rgba(0, 243, 255, 0.35)',
                      color: testingAction === `${b.id}_single` ? '#020617' : '#00f3ff',
                      borderRadius: '6px',
                      padding: '5px 4px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    1 Clic
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulatePress(`${b.id}_double`)}
                    disabled={isCurrentlyTesting}
                    title="Simular Doble Clic"
                    style={{
                      flex: 1,
                      background: testingAction === `${b.id}_double` ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: testingAction === `${b.id}_double` ? '#020617' : '#fbbf24',
                      borderRadius: '6px',
                      padding: '5px 4px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    2 Clics
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulatePress(`${b.id}_hold`)}
                    disabled={isCurrentlyTesting}
                    title="Simular Mantener Presionado"
                    style={{
                      flex: 1,
                      background: testingAction === `${b.id}_hold` ? '#a855f7' : 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: testingAction === `${b.id}_hold` ? '#fff' : '#c084fc',
                      borderRadius: '6px',
                      padding: '5px 4px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    Hold
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PIE DE TARJETA: Información y Accesos */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '12px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
          💡 Pulsa cualquier botón en tu mando físico Moes o usa los botones de simulación arriba para verificar la ejecución inmediata (&lt;4 ms).
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('automations_sensors')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Ver Automatizaciones</span>
              <span>➔</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL CONFIGURADOR Y EDITOR DE ASIGNACIONES */}
      {editingBtn && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0b132b, #070d1e)',
            border: '2px solid #00f3ff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '22px',
            boxShadow: '0 20px 50px rgba(0, 243, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Cabecera del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>{editingBtn.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                    Configurar {editingBtn.name}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#00f3ff', fontWeight: 600 }}>
                    Posición física: {editingBtn.pos}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBtn(null)}
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

            {/* PASO 1: Selector de Tipo de Pulsación */}
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                1. Selecciona el Tipo de Pulsación:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {CLICK_TYPES.map(ct => {
                  const isSel = selectedClickType === ct.id;
                  const hasAssigned = !!getAutomationForButtonAndClick(editingBtn.id, ct.id);

                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => handleTabClickType(ct.id)}
                      style={{
                        background: isSel 
                          ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(16, 185, 129, 0.2))' 
                          : 'rgba(15, 23, 42, 0.6)',
                        border: isSel ? '2px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '10px 8px',
                        color: isSel ? '#fff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{ct.icon}</span>
                      <span style={{ fontSize: '0.80rem', fontWeight: 800 }}>{ct.name}</span>
                      <span style={{ fontSize: '0.62rem', color: isSel ? '#00f3ff' : '#64748b' }}>{ct.desc}</span>
                      {hasAssigned && (
                        <div style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#10b981',
                          boxShadow: '0 0 6px #10b981'
                        }} title="Ya tiene una regla asignada" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regla actual vinculada (si existe) */}
            {(() => {
              const currentAuto = getAutomationForButtonAndClick(editingBtn.id, selectedClickType);
              if (!currentAuto) return null;
              return (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.66rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase' }}>
                        Regla Activa para esta pulsación:
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentAuto.name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAssignment}
                    disabled={isSaving}
                    style={{
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    title="Desvincular regla actual"
                  >
                    <Trash2 size={12} />
                    <span>Eliminar</span>
                  </button>
                </div>
              );
            })()}

            {/* PASO 2: Elegir Tipo de Asignación (Luz Directa vs Escena) */}
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                2. ¿Qué quieres asignar a este botón?
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {/* Opción A: Control Directo de Luces */}
                <button
                  type="button"
                  onClick={() => setActionCategory('device')}
                  style={{
                    background: actionCategory === 'device' 
                      ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(0, 150, 255, 0.15))' 
                      : 'rgba(15, 23, 42, 0.5)',
                    border: actionCategory === 'device' ? '2px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={18} color="#00f3ff" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>
                      Luz Directa
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Encender, apagar o conmutar una lámpara o tira LED.
                  </span>
                </button>

                {/* Opción B: Escena o Automatización */}
                <button
                  type="button"
                  onClick={() => setActionCategory('scene')}
                  style={{
                    background: actionCategory === 'scene' 
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(168, 85, 247, 0.15))' 
                      : 'rgba(15, 23, 42, 0.5)',
                    border: actionCategory === 'scene' ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Film size={18} color="#fbbf24" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>
                      Escena / Rutina
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Lanzar Modo Relax, Cine, Salir de Casa o Apagar Todo.
                  </span>
                </button>
              </div>

              {/* CONTENIDO SEGÚN LA CATEGORÍA ELEGIDA */}
              {actionCategory === 'device' ? (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(0, 243, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Selector de Dispositivo */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                      Dispositivo o Lámpara a Controlar:
                    </label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      disabled={selectedDeviceAction === 'all_off'}
                      style={{
                        width: '100%',
                        background: '#091024',
                        border: '1px solid #00f3ff',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        outline: 'none',
                        opacity: selectedDeviceAction === 'all_off' ? 0.5 : 1
                      }}
                    >
                      {localDevices.map(d => (
                        <option key={d.id} value={d.id}>
                          [{String(d.room || 'General').toUpperCase()}] {d.name || d.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Acción */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                      Acción al pulsar:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDeviceAction('toggle')}
                        style={{
                          background: selectedDeviceAction === 'toggle' ? '#00f3ff' : 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(0, 243, 255, 0.4)',
                          color: selectedDeviceAction === 'toggle' ? '#020617' : '#fff',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <ToggleLeft size={14} />
                        <span>Alternar (Toggle)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDeviceAction('turn_on')}
                        style={{
                          background: selectedDeviceAction === 'turn_on' ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: selectedDeviceAction === 'turn_on' ? '#020617' : '#fff',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Power size={14} />
                        <span>Encender (ON)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDeviceAction('turn_off')}
                        style={{
                          background: selectedDeviceAction === 'turn_off' ? '#ef4444' : 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: selectedDeviceAction === 'turn_off' ? '#fff' : '#fff',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Power size={14} />
                        <span>Apagar (OFF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDeviceAction('all_off')}
                        style={{
                          background: selectedDeviceAction === 'all_off' ? '#f59e0b' : 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: selectedDeviceAction === 'all_off' ? '#020617' : '#fff',
                          borderRadius: '8px',
                          padding: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Layers size={14} />
                        <span>Apagar Toda la Casa</span>
                      </button>
                    </div>
                  </div>

                  {/* Nivel de Brillo (si es Encender) */}
                  {selectedDeviceAction === 'turn_on' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                        <span>Brillo al Encender:</span>
                        <span style={{ color: '#00f3ff', fontWeight: 800 }}>{selectedBrightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={selectedBrightness}
                        onChange={(e) => setSelectedBrightness(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#00f3ff' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Opción B: Selector de Escena */
                <div style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <label style={{ display: 'block', fontSize: '0.70rem', color: '#cbd5e1', fontWeight: 700 }}>
                    Selecciona la Escena o Automatización a Ejecutar:
                  </label>
                  <select
                    value={selectedScene}
                    onChange={(e) => setSelectedScene(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#091024',
                      border: '1px solid #fbbf24',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    {availableScenes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.icon || '🎬'} {s.name || s.id}
                      </option>
                    ))}
                  </select>

                  {/* Descripción de la escena seleccionada */}
                  {(() => {
                    const sceneObj = availableScenes.find(s => s.id === selectedScene);
                    if (!sceneObj) return null;
                    return (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '6px' }}>
                        {sceneObj.description || 'Ejecuta todas las acciones configuradas en esta escena.'}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Mensaje de Feedback del Modal */}
            {modalFeedback && (
              <div style={{
                background: modalFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${modalFeedback.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: modalFeedback.type === 'success' ? '#34d399' : '#f87171',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {modalFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{modalFeedback.msg}</span>
              </div>
            )}

            {/* BOTONES DE ACCIÓN: Guardar / Cancelar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setEditingBtn(null)}
                disabled={isSaving}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={isSaving}
                style={{
                  background: 'linear-gradient(135deg, #00f3ff, #10b981)',
                  border: 'none',
                  color: '#020617',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: isSaving ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.4)'
                }}
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar Asignación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Trash2, Camera, ShieldCheck, Siren, Activity, CheckCircle2, Lock, Unlock, Eye, Sparkles, Save } from 'lucide-react';

const API_BASE = "";

export default function SecurityConfigView({ isBgCameraEnabled, setIsBgCameraEnabled }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmLights, setAlarmLights] = useState([]);
  const [haDevices, setHaDevices] = useState([]);

  // Estado Inmunidad a Mascotas (Pet-Safe AI)
  const [petImmunity, setPetImmunity] = useState({ enabled: true, ignore_pets_for_lights: true, recent_events: [] });
  const [testingPet, setTestingPet] = useState(false);
  const [petTestResult, setPetTestResult] = useState(null);
  const [selectedPetCam, setSelectedPetCam] = useState('camara_pasillo');

  const fetchPetImmunity = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/security/pet-immunity`);
      if (res.ok) {
        const data = await res.json();
        setPetImmunity({
          enabled: data.enabled ?? true,
          ignore_pets_for_lights: data.ignore_pets_for_lights ?? true,
          recent_events: data.recent_events || []
        });
      }
    } catch (e) {
      console.error('Error fetching pet immunity:', e);
    }
  };

  const updatePetImmunitySetting = async (key, val) => {
    const updated = { ...petImmunity, [key]: val };
    setPetImmunity(updated);
    try {
      await fetch(`${API_BASE}/api/security/pet-immunity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      });
    } catch (e) {
      console.error('Error updating pet immunity:', e);
    }
  };

  const testPetClassification = async () => {
    setTestingPet(true);
    setPetTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/security/pet-immunity/test/${selectedPetCam}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setPetTestResult(data.classification);
        fetchPetImmunity();
      }
    } catch (e) {
      console.error('Error testing pet classification:', e);
    } finally {
      setTestingPet(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAlarmStatus();
    fetchHaDevices();
    fetchPetImmunity();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/security/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchAlarmStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/security/alarm/status`);
      if (res.ok) {
        const data = await res.json();
        setAlarmEnabled(data.enabled);
        setAlarmLights(data.lights || []);
      }
    } catch (e) {
      console.error("Error al obtener estado de alarma");
    }
  };

  const fetchHaDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/devices`);
      if (res.ok) {
        const data = await res.json();
        setHaDevices(data.devices || []);
      }
    } catch (e) {
      console.error("Error obteniendo dispositivos HA");
    }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let image_base64 = null;
      if (imageFile) {
        image_base64 = await toBase64(imageFile);
      }
      
      const payload = { name, pin, image_base64 };
      const res = await fetch(`${API_BASE}/api/security/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        window.showToast?.('Usuario añadido correctamente');
        setName('');
        setPin('');
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchUsers();
      } else {
        window.showToast?.('Error al añadir usuario', 'error');
      }
    } catch (error) {
      console.error(error);
      window.showToast?.('Error al conectar con servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar este usuario?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/security/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.showToast?.('Usuario eliminado');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
      window.showToast?.('Error al eliminar', 'error');
    }
  };

  const toggleAlarmSystem = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/security/alarm/toggle`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(!alarmEnabled)
      });
      if (res.ok) {
        setAlarmEnabled(!alarmEnabled);
        window.showToast?.(alarmEnabled ? 'Sistema de Alarma Desactivado' : 'Sistema de Alarma Armado', 'success');
      }
    } catch (e) {
      console.error("Error al cambiar alarma");
    }
  };

  const saveAlarmLights = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/security/alarm/lights`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(alarmLights)
      });
      if (res.ok) {
        window.showToast?.("Luces de alarma guardadas", "success");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const simulateUnknownFace = async () => {
    try {
      await fetch(`${API_BASE}/api/security/alarm/simulate_face`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(null) // null = unknown face
      });
      window.showToast?.("Simulando detección de intruso...", "warning");
    } catch (e) {
      console.error(e);
    }
  };

  const lightDevices = haDevices.filter(d => d.domain === 'light' || d.domain === 'switch' || (d.entity_id || d.id || '').startsWith('light.') || (d.entity_id || d.id || '').startsWith('switch.'));

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '14px',
      padding: '24px',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* CABECERA PRINCIPAL ESTILO STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.18)',
        paddingBottom: '18px',
        marginBottom: '22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'
          }}>
            <ShieldCheck size={26} color="#00f3ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: 'rgba(0, 243, 255, 0.14)',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                letterSpacing: '0.8px'
              }}>
                HABANA 10 BIOMETRIC SHIELD
              </span>
              <span style={{
                background: alarmEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                border: `1px solid ${alarmEnabled ? '#10b981' : '#ef4444'}`,
                color: alarmEnabled ? '#34d399' : '#f87171',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                {alarmEnabled ? '🛡️ PERÍMETRO ARMADO' : '⚠️ PERÍMETRO DESARMADO'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>
              SEGURIDAD Y RECONOCIMIENTO BIOMÉTRICO
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              Vigilancia facial en tiempo real, respuesta lumínica disuasoria de Fase 3 y control de identidades autorizadas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '600'
          }}>
            👤 {users.length} Usuario{users.length !== 1 ? 's' : ''} Registrado{users.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            background: isBgCameraEnabled ? 'rgba(16, 185, 129, 0.14)' : 'rgba(148, 163, 184, 0.12)',
            border: `1px solid ${isBgCameraEnabled ? '#10b981' : 'rgba(148, 163, 184, 0.3)'}`,
            color: isBgCameraEnabled ? '#34d399' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 'bold'
          }}>
            {isBgCameraEnabled ? '● CÁMARA IA EN VIVO' : '○ CÁMARA EN REPOSO'}
          </span>
        </div>
      </div>

      {/* MASTER ALARM CONTROLS */}
      <div style={{
        background: alarmEnabled
          ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(6, 28, 38, 0.78))'
          : 'rgba(15, 23, 42, 0.65)',
        padding: '20px',
        borderRadius: '12px',
        border: alarmEnabled ? '1px solid rgba(0, 243, 255, 0.42)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: alarmEnabled ? '0 0 24px rgba(0, 243, 255, 0.12)' : 'none',
        marginBottom: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        transition: 'all 0.25s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: alarmEnabled ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${alarmEnabled ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Siren size={20} color={alarmEnabled ? '#00f3ff' : '#64748b'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', letterSpacing: '0.4px' }}>
                  SISTEMA MAESTRO DE ALARMA
                </h3>
                <span style={{
                  background: alarmEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: `1px solid ${alarmEnabled ? '#10b981' : '#ef4444'}`,
                  color: alarmEnabled ? '#34d399' : '#f87171',
                  fontSize: '0.68rem',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {alarmEnabled ? 'ARMADO' : 'DESARMADO'}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                Gestiona la detección facial automática de intrusos y el protocolo estroboscópico de defensa.
              </p>
            </div>
          </div>

          <button
            onClick={toggleAlarmSystem}
            style={{
              padding: '10px 22px',
              background: alarmEnabled
                ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(16, 185, 129, 0.22))'
                : 'rgba(15, 23, 42, 0.9)',
              border: alarmEnabled ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.18)',
              color: alarmEnabled ? '#00f3ff' : '#94a3b8',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: alarmEnabled ? '0 0 16px rgba(0, 243, 255, 0.28)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            {alarmEnabled ? <Lock size={16} /> : <Unlock size={16} />}
            {alarmEnabled ? 'SISTEMA ARMADO' : 'SISTEMA DESARMADO'}
          </button>
        </div>

        {alarmEnabled && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '18px'
          }}>
            {/* Luces de Alarma */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '10px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ color: '#e2e8f0', margin: 0, fontSize: '0.9rem' }}>Luces de Fase 3 (Disuasión Activa)</h4>
                <span style={{ fontSize: '0.7rem', color: '#00f3ff', fontWeight: 'bold' }}>
                  {alarmLights.length} seleccionada{alarmLights.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 10px 0' }}>
                Selecciona las luminarias que parpadearán en rojo/blanco al activarse la Fase 3 de intrusión.
              </p>

              <div style={{
                maxHeight: '155px',
                overflowY: 'auto',
                background: '#050811',
                border: '1px solid rgba(0, 243, 255, 0.16)',
                borderRadius: '8px',
                padding: '8px'
              }}>
                {lightDevices.length === 0 ? (
                  <span style={{ color: '#64748b', fontSize: '0.8rem', padding: '6px', display: 'block' }}>
                    No se encontraron luces registradas
                  </span>
                ) : (
                  lightDevices.map(device => {
                    const devId = device.entity_id || device.id;
                    const checked = alarmLights.includes(devId);
                    return (
                      <label
                        key={devId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          color: checked ? '#00f3ff' : '#cbd5e1',
                          background: checked ? 'rgba(0, 243, 255, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          marginBottom: '2px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setAlarmLights([...alarmLights, devId]);
                            else setAlarmLights(alarmLights.filter(id => id !== devId));
                          }}
                          style={{ accentColor: '#00f3ff' }}
                        />
                        {device.attributes?.friendly_name || device.name || devId}
                      </label>
                    );
                  })
                )}
              </div>
              <button
                onClick={saveAlarmLights}
                style={{
                  marginTop: '10px',
                  background: 'rgba(0, 243, 255, 0.12)',
                  color: '#00f3ff',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={14} /> Guardar Luces de Fase 3
              </button>
            </div>

            {/* Simulación de Intruso */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.55)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h4 style={{ color: '#fca5a5', margin: 0, fontSize: '0.9rem' }}>Simulación de Intruso</h4>
                  <span style={{
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>
                    TEST DE ESTRÉS
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px 0', lineHeight: 1.45 }}>
                  Dispara un evento de rostro desconocido para verificar la ventana de PIN, alerta de voz y parpadeo de luminarias.
                </p>
              </div>
              <button
                onClick={simulateUnknownFace}
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.28))',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(239, 68, 68, 0.25)'
                }}
              >
                <Activity size={18} />
                SIMULAR DETECCIÓN DE INTRUSO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INMUNIDAD COGNITIVA A MASCOTAS (PET-SAFE AI) */}
      <div style={{
        background: petImmunity.enabled
          ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(6, 28, 25, 0.8))'
          : 'rgba(15, 23, 42, 0.65)',
        padding: '20px',
        borderRadius: '12px',
        border: petImmunity.enabled ? '1px solid rgba(16, 185, 129, 0.42)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: petImmunity.enabled ? '0 0 24px rgba(16, 185, 129, 0.12)' : 'none',
        marginBottom: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        transition: 'all 0.25s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: petImmunity.enabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${petImmunity.enabled ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem'
            }}>
              🐾
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', letterSpacing: '0.4px' }}>
                  DISCRIMINACIÓN E INMUNIDAD A MASCOTAS (PET-SAFE AI)
                </h3>
                <span style={{
                  background: petImmunity.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                  border: `1px solid ${petImmunity.enabled ? '#10b981' : '#64748b'}`,
                  color: petImmunity.enabled ? '#34d399' : '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {petImmunity.enabled ? '🐾 FILTRO ACTIVO' : 'FILTRO INACTIVO'}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                La Inteligencia Artificial clasifica a gatos y perros en tiempo real mediante las cámaras para evitar falsas alarmas y disparos no deseados.
              </p>
            </div>
          </div>

          <button
            onClick={() => updatePetImmunitySetting('enabled', !petImmunity.enabled)}
            style={{
              padding: '10px 20px',
              background: petImmunity.enabled
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(0, 243, 255, 0.25))'
                : 'rgba(15, 23, 42, 0.9)',
              border: petImmunity.enabled ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.18)',
              color: petImmunity.enabled ? '#34d399' : '#94a3b8',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: petImmunity.enabled ? '0 0 16px rgba(16, 185, 129, 0.25)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            {petImmunity.enabled ? '🐾 FILTRO MASCOTAS ACTIVADO' : '○ FILTRO MASCOTAS DESACTIVADO'}
          </button>
        </div>

        {/* CONTROLES Y OPCIONES DE INMUNIDAD */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '16px'
        }}>
          {/* Reglas de Descarte */}
          <div style={{
            background: 'rgba(2, 6, 23, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ color: '#00f3ff', margin: 0, fontSize: '0.9rem' }}>Reglas de Protección Doméstica</h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={petImmunity.enabled}
                onChange={(e) => updatePetImmunitySetting('enabled', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span><strong>Descartar Alarma Fase 2/3</strong> si solo se detectan gatos o mascotas</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={petImmunity.ignore_pets_for_lights}
                onChange={(e) => updatePetImmunitySetting('ignore_pets_for_lights', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span><strong>Inmunidad en Luces Nocturnas</strong>: no encender luces de estancias por movimiento de mascotas</span>
            </label>
          </div>

          {/* Test en Vivo con Visión Artificial */}
          <div style={{
            background: 'rgba(2, 6, 23, 0.55)',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#00f3ff', margin: 0, fontSize: '0.9rem' }}>Test de Detección de Mascotas</h4>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Groq Vision AI</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedPetCam}
                onChange={(e) => setSelectedPetCam(e.target.value)}
                style={{
                  flex: 1,
                  background: '#090f1f',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              >
                <option value="camara_pasillo">Cámara Pasillo Interior</option>
                <option value="camara_terraza">Cámara Terraza Exterior</option>
                <option value="camara_cam720">Cámara Cam720</option>
              </select>

              <button
                onClick={testPetClassification}
                disabled={testingPet}
                style={{
                  background: testingPet ? 'rgba(0, 243, 255, 0.15)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(0, 243, 255, 0.25))',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: testingPet ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {testingPet ? 'Evaluando...' : '🐾 Probar IA'}
              </button>
            </div>

            {petTestResult && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: petTestResult.is_safe_pet_only ? '#34d399' : petTestResult.has_human ? '#f87171' : '#94a3b8' }}>
                    {petTestResult.is_safe_pet_only
                      ? '🐾 MASCOTA DETECTADA (INOFENSIVO)'
                      : petTestResult.has_human
                      ? '👤 HUMANO DETECTADO'
                      : '⚪ ESCENA DESPEJADA'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Amenaza: {petTestResult.threat_level}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.4' }}>
                  {petTestResult.details}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* HISTORIAL RECIENTE DE MASCOTAS FILTRADAS */}
        {petImmunity.recent_events.length > 0 && (
          <div style={{
            background: 'rgba(2, 6, 23, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              🐾 ÚLTIMAS DETECCIONES DE MASCOTAS DESCARTADAS (CERO FALSAS ALARMAS):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {petImmunity.recent_events.slice(0, 3).map((ev, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#cbd5e1' }}>
                  <span>🐾 <strong>{ev.camera_id}</strong>: {ev.details}</span>
                  <span style={{ color: '#64748b' }}>{ev.time_str}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BACKGROUND CAMERA TOGGLE */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        padding: '18px 20px',
        borderRadius: '12px',
        border: isBgCameraEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: isBgCameraEnabled ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isBgCameraEnabled ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Camera size={20} color={isBgCameraEnabled ? '#34d399' : '#94a3b8'} />
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: 0, fontSize: '0.96rem' }}>CÁMARA EN SEGUNDO PLANO (VISIÓN NEURAL)</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Mantiene activa la cámara local para reconocimiento biométrico continuo sin interrumpir la navegación.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            const newState = !isBgCameraEnabled;
            setIsBgCameraEnabled(newState);
            localStorage.setItem('habana_bg_camera', newState.toString());
          }}
          style={{
            padding: '10px 18px',
            background: isBgCameraEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${isBgCameraEnabled ? '#10b981' : 'rgba(255,255,255,0.18)'}`,
            color: isBgCameraEnabled ? '#34d399' : '#cbd5e1',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isBgCameraEnabled ? '0 0 14px rgba(16, 185, 129, 0.25)' : 'none',
            transition: 'all 0.25s ease'
          }}
        >
          <Camera size={16} />
          {isBgCameraEnabled ? 'CÁMARA ACTIVADA' : 'ACTIVAR CÁMARA'}
        </button>
      </div>

      {/* GRID INFERIOR: NUEVO USUARIO BIOMÉTRICO + USUARIOS AUTORIZADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* ADD USER FORM */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ color: '#fff', margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="#00f3ff" /> NUEVO USUARIO BIOMÉTRICO
            </h4>
            <span style={{ fontSize: '0.68rem', color: '#00f3ff', background: 'rgba(0, 243, 255, 0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0, 243, 255, 0.25)' }}>
              FACE ID + PIN
            </span>
          </div>

          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nombre del Usuario Autorizado</label>
              <input
                type="text"
                placeholder="Nombre del usuario"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="cyber-input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#090f1f',
                  border: '1px solid rgba(0, 243, 255, 0.22)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>PIN de Seguridad</label>
              <input
                type="password"
                placeholder="PIN de acceso"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                className="cyber-input"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#090f1f',
                  border: '1px solid rgba(0, 243, 255, 0.22)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{
              background: '#090f1f',
              padding: '12px',
              borderRadius: '8px',
              border: '1px dashed rgba(0, 243, 255, 0.3)'
            }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.78rem', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                <Camera size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#00f3ff' }} />
                Fotografía de Referencia Facial (Opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={e => setImageFile(e.target.files[0])}
                style={{ color: '#94a3b8', fontSize: '0.78rem', width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="cyber-btn"
              disabled={loading}
              style={{
                padding: '11px 16px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(59, 130, 246, 0.22))',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 243, 255, 0.18)'
              }}
            >
              <UserPlus size={16} />
              {loading ? 'REGISTRANDO...' : 'REGISTRAR USUARIO'}
            </button>
          </form>
        </div>

        {/* USER LIST */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ color: '#fff', margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#10b981" /> USUARIOS AUTORIZADOS
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {users.length} activo{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          {users.length === 0 ? (
            <div style={{
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '28px 16px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.85rem'
            }}>
              No hay usuarios registrados en la base biométrica.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(2, 6, 23, 0.65)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${u.has_face ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                  }}
                >
                  <div>
                    <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '0.9rem' }}>{u.name}</span>
                    <div style={{
                      fontSize: '0.74rem',
                      color: u.has_face ? '#34d399' : '#fbbf24',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {u.has_face ? '✅ Vector facial registrado' : '⚠️ Solo PIN (Sin rostro)'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(u.id)}
                    title="Eliminar usuario"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      cursor: 'pointer',
                      padding: '7px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


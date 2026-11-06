import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Layers, History, Activity, 
  Plus, RefreshCw, X, CheckCircle2, AlertCircle, Play, 
  Sliders, Lightbulb, Power, Radio, Video, Thermometer
} from 'lucide-react';
import BunkerKillSwitch from './BunkerKillSwitch';
import DynamicWidgetLoader from './DynamicWidgetLoader';
import BunkerTimeMachine from './BunkerTimeMachine';
import BunkerInformacion from './BunkerInformacion';
import BunkerLolaStudio from './BunkerLolaStudio';
import BunkerMeteorologia from './BunkerMeteorologia';
import ErrorBoundary from '../components/ErrorBoundary';

export default function BunkerContainer({ API_BASE = '' }) {
  const [activeTab, setActiveTab] = useState('meteorologia'); // 'meteorologia' | 'informacion' | 'lola_studio' | 'widgets' | 'timemachine' | 'gatekeeper'
  const [status, setStatus] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal para crear widget
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('🧱');
  const [newCategory, setNewCategory] = useState('macro');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#00f3ff');
  const [newActions, setNewActions] = useState([
    { entity_id: 'all_lights', action: 'turn_off_all' }
  ]);
  const [devicesList, setDevicesList] = useState([]);
  const [creatingWidget, setCreatingWidget] = useState(false);

  const fetchBunkerData = async () => {
    try {
      const [stRes, widRes, snapRes, histRes, devRes] = await Promise.all([
        fetch(`${API_BASE}/api/bunker/status`),
        fetch(`${API_BASE}/api/bunker/widgets`),
        fetch(`${API_BASE}/api/bunker/snapshots`),
        fetch(`${API_BASE}/api/bunker/history`),
        fetch(`${API_BASE}/api/devices?real_only=true`)
      ]);

      if (stRes.ok) setStatus(await stRes.json());
      if (widRes.ok) {
        const widData = await widRes.json();
        setWidgets(widData.widgets || []);
      }
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        setSnapshots(snapData.snapshots || []);
      }
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.history || []);
      }
      if (devRes.ok) {
        const devData = await devRes.json();
        if (Array.isArray(devData)) setDevicesList(devData);
      }
    } catch (e) {
      console.error('Error fetching bunker data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBunkerData();
    const timer = setInterval(fetchBunkerData, 6000);
    return () => clearInterval(timer);
  }, [API_BASE]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingWidget(true);

    const payload = {
      title: newTitle.trim(),
      icon: newIcon,
      category: newCategory,
      author: 'Usuario / IA',
      description: newDesc.trim(),
      color: newColor,
      actions: newActions
    };

    try {
      const res = await fetch(`${API_BASE}/api/bunker/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        fetchBunkerData();
      }
    } catch (e) {
      alert(`Error creando widget: ${e.message}`);
    } finally {
      setCreatingWidget(false);
    }
  };

  const isEnabled = status?.enabled ?? true;

  return (
    <ErrorBoundary name="Búnker IA Sandbox">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '10px 0'
      }}>
        {/* Cabecera Principal del Búnker */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(7, 13, 29, 0.98))',
          border: '2px solid rgba(0, 243, 255, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 243, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1.5px solid #00f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.25)'
              }}>
                🧱
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
                    EL BÚNKER IA (SANDBOX AISLADO)
                  </h2>
                  <span style={{
                    background: 'rgba(0, 243, 255, 0.16)',
                    border: '1px solid #00f3ff',
                    color: '#00f3ff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    HABANA 14
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px' }}>
                  Espacio protegido para experimentación autónoma de la IA. Código dinámico, Time Machine y Kill Switch de emergencia.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #00f3ff, #10b981)',
                  border: 'none',
                  color: '#020617',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.3)'
                }}
              >
                <Plus size={15} />
                <span>+ Nuevo Widget / Macro</span>
              </button>

              <button
                type="button"
                onClick={fetchBunkerData}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Kill Switch Integrado */}
          <BunkerKillSwitch
            isEnabled={isEnabled}
            onToggle={(st) => setStatus(prev => ({ ...prev, enabled: st }))}
            API_BASE={API_BASE}
          />
        </div>

        {/* Pestañas del Búnker */}
        <div style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '10px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'meteorologia', label: `🌤️ Meteorología & Persianas`, icon: Thermometer },
            { id: 'informacion', label: `📡 Información & Briefing`, icon: Radio },
            { id: 'lola_studio', label: `🎭 Estudio Lola (Prompts & Vídeos)`, icon: Video },
            { id: 'widgets', label: `🧱 Widgets & Macros IA (${widgets.length})`, icon: Layers },
            { id: 'timemachine', label: `⏪ Time Machine (${snapshots.length})`, icon: History },
            { id: 'gatekeeper', label: `🛡️ Gatekeeper & Registro (${history.length})`, icon: Activity }
          ].map(t => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: isSel ? 'rgba(0, 243, 255, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                  border: isSel ? '1.5px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSel ? '#fff' : '#94a3b8',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={isSel ? '#00f3ff' : '#94a3b8'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
        {activeTab === 'meteorologia' && (
          <BunkerMeteorologia
            API_BASE={API_BASE}
            isEnabled={isEnabled}
          />
        )}

        {activeTab === 'widgets' && (
          <DynamicWidgetLoader
            widgets={widgets}
            isEnabled={isEnabled}
            API_BASE={API_BASE}
            onRefresh={fetchBunkerData}
            devicesList={devicesList}
          />
        )}

        {activeTab === 'informacion' && (
          <BunkerInformacion
            API_BASE={API_BASE}
            isEnabled={isEnabled}
          />
        )}

        {activeTab === 'lola_studio' && (
          <BunkerLolaStudio
            API_BASE={API_BASE}
            isEnabled={isEnabled}
          />
        )}

        {activeTab === 'timemachine' && (
          <BunkerTimeMachine
            snapshots={snapshots}
            API_BASE={API_BASE}
            onRefresh={fetchBunkerData}
          />
        )}

        {activeTab === 'gatekeeper' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#00f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} />
                <span>REGISTRO DE ÓRDENES AUDITADAS POR EL GATEKEEPER</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Protección anti-bucles y validación de hardware
              </span>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.76rem', padding: '20px' }}>
                Aún no hay ejecuciones registradas en esta sesión.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(2, 6, 23, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.74rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={13} color="#34d399" />
                      <span style={{ fontWeight: 800, color: '#fff' }}>{h.title}</span>
                      <span style={{ color: '#64748b', fontSize: '0.66rem' }}>({h.widget_id})</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                      {h.results_count} acción(es) ejecutadas
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL PARA CREAR WIDGET */}
        {showCreateModal && (
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
            <form onSubmit={handleCreateSubmit} style={{
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
              gap: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{newIcon}</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                    Crear Nuevo Widget / Macro en el Búnker
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                  Título del Widget:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Modo Lectura Acogedor..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#091024',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.80rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                    Icono (Emoji):
                  </label>
                  <input
                    type="text"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#091024',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.80rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                    Color de Resalte:
                  </label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: '#091024',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                  Descripción de lo que hace:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Enciende las tiras LED cálidas al 40%..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#091024',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.80rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Acciones */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>
                    Acciones a ejecutar:
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewActions([...newActions, { entity_id: devicesList[0]?.id || 'all_lights', action: 'turn_on' }])}
                    style={{
                      background: 'rgba(0, 243, 255, 0.15)',
                      border: '1px solid rgba(0, 243, 255, 0.4)',
                      color: '#00f3ff',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Añadir Acción
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newActions.map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={act.entity_id}
                        onChange={(e) => {
                          const c = [...newActions];
                          c[idx].entity_id = e.target.value;
                          setNewActions(c);
                        }}
                        style={{
                          flex: 2,
                          background: '#091024',
                          border: '1px solid rgba(0, 243, 255, 0.3)',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.74rem'
                        }}
                      >
                        <option value="all_lights">🌑 [Toda la Casa] Apagar Todo</option>
                        {devicesList.map(d => (
                          <option key={d.id} value={d.id}>
                            [{d.room?.toUpperCase()}] {d.name || d.id}
                          </option>
                        ))}
                      </select>

                      <select
                        value={act.action}
                        onChange={(e) => {
                          const c = [...newActions];
                          c[idx].action = e.target.value;
                          setNewActions(c);
                        }}
                        style={{
                          flex: 1,
                          background: '#091024',
                          border: '1px solid rgba(0, 243, 255, 0.3)',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.74rem'
                        }}
                      >
                        <option value="toggle">Alternar</option>
                        <option value="turn_on">Encender</option>
                        <option value="turn_off">Apagar</option>
                        <option value="turn_off_all">Apagar Todo</option>
                      </select>

                      {newActions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewActions(newActions.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingWidget}
                  style={{
                    background: 'linear-gradient(135deg, #00f3ff, #10b981)',
                    border: 'none',
                    color: '#020617',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {creatingWidget ? 'Guardando...' : 'Crear en el Búnker'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

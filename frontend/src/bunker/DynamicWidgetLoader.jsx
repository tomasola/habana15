import React, { useState } from 'react';
import { 
  Play, GraduationCap, Trash2, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, Edit3, Plus, X, Save, Sliders 
} from 'lucide-react';

const STYLE_COLORS = {
  success: '#10b981',
  danger: '#ef4444',
  info: '#06b6d4',
  warning: '#f59e0b',
  primary: '#3b82f6',
  secondary: '#a855f7'
};

const COLOR_PRESETS = [
  '#00f3ff', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6', '#ec4899', '#6366f1'
];

const ICON_PRESETS = ['🎛️', '💡', '🌑', '📻', '🎬', '👑', '🚪', '🛁', '🎀', '🛋️', '⚡', '🪟', '🔒', '🔥', '🎵'];

const getStyleColor = (style, defaultColor = '#00f3ff') => {
  return STYLE_COLORS[style] || defaultColor;
};

export default function DynamicWidgetLoader({ 
  widgets = [], 
  isEnabled = true, 
  API_BASE = '', 
  onRefresh = null,
  devicesList = []
}) {
  const [runningId, setRunningId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [editingWidget, setEditingWidget] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleExecuteDirectAction = async (wId, btnLabel, actionPayload) => {
    if (!isEnabled) {
      setFeedback({ [wId]: { ok: false, msg: 'Búnker AISLADO por el Kill Switch' } });
      return;
    }
    setRunningId(`${wId}_${btnLabel}`);
    setFeedback({ [wId]: { ok: true, msg: `Ejecutando "${btnLabel}"...` } });

    try {
      const res = await fetch(`${API_BASE}/api/bunker/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ [wId]: { ok: true, msg: `✔ "${btnLabel}" ejecutado con éxito` } });
        if (onRefresh) onRefresh();
      } else {
        setFeedback({ [wId]: { ok: false, msg: `⚠️ ${data.detail || 'Fallo de ejecución'}` } });
      }
    } catch (e) {
      setFeedback({ [wId]: { ok: false, msg: `❌ Error de red: ${e.message}` } });
    } finally {
      setRunningId(null);
      setTimeout(() => {
        setFeedback(prev => {
          const c = { ...prev };
          delete c[wId];
          return c;
        });
      }, 3500);
    }
  };

  const handleExecute = async (wId, title) => {
    if (!isEnabled) {
      setFeedback({ [wId]: { ok: false, msg: 'Búnker AISLADO por el Kill Switch' } });
      return;
    }
    setRunningId(wId);
    setFeedback({ [wId]: { ok: true, msg: 'Ejecutando a través del Gatekeeper...' } });

    try {
      const res = await fetch(`${API_BASE}/api/bunker/widgets/${wId}/execute`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ [wId]: { ok: true, msg: `✔ "${title}" ejecutado con éxito (${data.result?.results?.length || 0} acciones)` } });
        if (onRefresh) onRefresh();
      } else {
        setFeedback({ [wId]: { ok: false, msg: `⚠️ ${data.detail || 'Fallo de Gatekeeper'}` } });
      }
    } catch (e) {
      setFeedback({ [wId]: { ok: false, msg: `❌ Error de red: ${e.message}` } });
    } finally {
      setRunningId(null);
      setTimeout(() => {
        setFeedback(prev => {
          const c = { ...prev };
          delete c[wId];
          return c;
        });
      }, 3500);
    }
  };

  const handlePromote = async (wId, title) => {
    if (!window.confirm(`¿Promocionar "${title}" a Escena Oficial verificada de HABANA?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/bunker/widgets/${wId}/promote`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎓 ¡Promocionado con éxito!\n${data.message}`);
        if (onRefresh) onRefresh();
      } else {
        alert(`Error al promocionar: ${data.detail || data.error}`);
      }
    } catch (e) {
      alert(`Fallo de red: ${e.message}`);
    }
  };

  const handleDelete = async (wId, title) => {
    if (!window.confirm(`¿Eliminar el widget "${title}" del Búnker?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/bunker/widgets/${wId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      alert(`Fallo de red: ${e.message}`);
    }
  };

  const handleStartEdit = (widget) => {
    // Clona el widget en estado local
    const clone = JSON.parse(JSON.stringify(widget));
    if (!Array.isArray(clone.actions)) {
      clone.actions = [];
    }
    setEditingWidget(clone);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingWidget || !editingWidget.title.trim()) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`${API_BASE}/api/bunker/widgets/${editingWidget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingWidget)
      });
      const data = await res.json();
      if (res.ok) {
        setEditingWidget(null);
        if (onRefresh) onRefresh();
      } else {
        alert(`Error al guardar cambios: ${data.detail || 'Fallo desconocido'}`);
      }
    } catch (e) {
      alert(`Error de red al guardar: ${e.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddAction = () => {
    if (!editingWidget) return;
    setEditingWidget(prev => ({
      ...prev,
      actions: [
        ...(prev.actions || []),
        {
          label: 'Nuevo Botón',
          service: 'light',
          entity_id: 'all_lights',
          action: 'turn_on_all',
          style: 'info'
        }
      ]
    }));
  };

  const handleRemoveAction = (index) => {
    if (!editingWidget) return;
    setEditingWidget(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const handleActionChange = (index, field, value) => {
    if (!editingWidget) return;
    setEditingWidget(prev => {
      const updated = [...prev.actions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, actions: updated };
    });
  };

  if (!Array.isArray(widgets) || widgets.length === 0) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧱</div>
        <div style={{ fontWeight: 800, color: '#fff' }}>No hay widgets en el Búnker todavía</div>
        <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
          Pídele a la IA local que diseñe uno o usa el botón "+ Nuevo Widget / Macro" para crearlo.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '16px'
      }}>
        {widgets.map(w => {
          const isThisRunning = runningId === w.id;
          const fb = feedback[w.id];
          const cardColor = w.color || '#00f3ff';
          const hasActions = Array.isArray(w.actions) && w.actions.length > 0;
          const hasButtons = Array.isArray(w.buttons) && w.buttons.length > 0;

          return (
            <div
              key={w.id}
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(7, 13, 29, 0.98))',
                border: `1.5px solid ${cardColor}55`,
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: `0 6px 20px ${cardColor}15`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Cabecera del Widget */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: `${cardColor}22`,
                    border: `1px solid ${cardColor}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}>
                    {w.icon || '🧱'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>
                      {w.title}
                    </h4>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ color: cardColor, fontWeight: 700 }}>
                        🏷️ {w.category?.toUpperCase() || 'MACRO'}
                      </span>
                      <span>•</span>
                      <span>✍️ {w.author || 'IA Local'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Botón Editar */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(w)}
                    title="Editar y ajustar este widget"
                    style={{
                      background: 'rgba(0, 243, 255, 0.12)',
                      border: '1px solid rgba(0, 243, 255, 0.35)',
                      color: '#00f3ff',
                      cursor: 'pointer',
                      padding: '5px 7px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Editar</span>
                  </button>

                  {/* Botón Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleDelete(w.id, w.title)}
                    title="Eliminar widget"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '5px 7px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Descripción */}
              {w.description && (
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {w.description}
                </div>
              )}

              {/* BOTONES INTERACTIVOS INDIVIDUALES */}
              {hasActions ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '8px'
                }}>
                  {w.actions.map((act, aIdx) => {
                    const btnLabel = act.label || `${act.entity_id} (${act.action})`;
                    const btnColor = getStyleColor(act.style, cardColor);
                    const isBtnRunning = runningId === `${w.id}_${btnLabel}`;

                    return (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => handleExecuteDirectAction(w.id, btnLabel, act)}
                        disabled={Boolean(runningId) || !isEnabled}
                        style={{
                          background: `${btnColor}18`,
                          border: `1.5px solid ${btnColor}99`,
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          fontSize: '0.80rem',
                          fontWeight: 800,
                          cursor: !isEnabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: `0 3px 12px ${btnColor}15`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.05rem' }}>{act.icon || '⚡'}</span>
                          <span>{btnLabel}</span>
                        </div>
                        <span style={{ fontSize: '0.68rem', opacity: 0.85, color: btnColor }}>
                          {isBtnRunning ? 'Ejecutando...' : 'Pulsar ➔'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : hasButtons ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '8px'
                }}>
                  {w.buttons.map((btn, bIdx) => {
                    const btnColor = btn.color || cardColor;
                    return (
                      <button
                        key={bIdx}
                        type="button"
                        onClick={() => handleExecuteDirectAction(w.id, btn.label, btn.action_payload || btn)}
                        disabled={Boolean(runningId) || !isEnabled}
                        style={{
                          background: `${btnColor}20`,
                          border: `1.5px solid ${btnColor}`,
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '0.80rem',
                          fontWeight: 800,
                          cursor: !isEnabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: `0 4px 14px ${btnColor}18`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{btn.icon || '⚡'}</span>
                          <span>{btn.label}</span>
                        </div>
                        <span style={{ fontSize: '0.70rem', opacity: 0.8, color: btnColor }}>
                          Pulsar ➔
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Feedback en vivo */}
              {fb && (
                <div style={{
                  background: fb.ok ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                  border: `1px solid ${fb.ok ? '#10b981' : '#ef4444'}`,
                  color: fb.ok ? '#34d399' : '#f87171',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {fb.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{fb.msg}</span>
                </div>
              )}

              {/* Pie de tarjeta con botones de ejecución y promoción */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.64rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} />
                  <span>Ejecutado {w.run_count || 0} veces</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handlePromote(w.id, w.title)}
                    title="Graduar y convertir en Escena Oficial de HABANA"
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      borderRadius: '7px',
                      padding: '5px 10px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <GraduationCap size={13} />
                    <span>Graduar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecute(w.id, w.title)}
                    disabled={isThisRunning || !isEnabled}
                    style={{
                      background: !isEnabled 
                        ? 'rgba(100, 116, 139, 0.2)' 
                        : `linear-gradient(135deg, ${cardColor}, #10b981)`,
                      border: 'none',
                      color: !isEnabled ? '#64748b' : '#020617',
                      borderRadius: '7px',
                      padding: '6px 14px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: (!isEnabled || isThisRunning) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isEnabled ? `0 0 12px ${cardColor}44` : 'none'
                    }}
                  >
                    {isThisRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    <span>{isThisRunning ? 'Ejecutando...' : 'Ejecutar'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE EDICIÓN DE WIDGET */}
      {editingWidget && (
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
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(7, 13, 29, 0.99))',
            border: '2px solid #00f3ff',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 35px rgba(0, 243, 255, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Cabecera del modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0, 243, 255, 0.2)',
              background: 'rgba(0, 243, 255, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} color="#00f3ff" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>
                  Modificar Widget: <span style={{ color: '#00f3ff' }}>{editingWidget.title}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingWidget(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario scrollable */}
            <form onSubmit={handleSaveEdit} style={{
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Título e Icono */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Icono
                  </label>
                  <input
                    type="text"
                    value={editingWidget.icon || '🧱'}
                    onChange={(e) => setEditingWidget({ ...editingWidget, icon: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#fff',
                      textAlign: 'center',
                      fontSize: '1.3rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Título del Widget
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWidget.title || ''}
                    onChange={(e) => setEditingWidget({ ...editingWidget, title: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Selector rápido de iconos */}
              <div>
                <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Iconos rápidos:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ICON_PRESETS.map((ic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingWidget({ ...editingWidget, icon: ic })}
                      style={{
                        background: editingWidget.icon === ic ? 'rgba(0,243,255,0.25)' : 'rgba(255,255,255,0.06)',
                        border: editingWidget.icon === ic ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoría y Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Categoría
                  </label>
                  <select
                    value={editingWidget.category || 'macro'}
                    onChange={(e) => setEditingWidget({ ...editingWidget, category: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '0.80rem'
                    }}
                  >
                    <option value="macro">Macro Multi-Acción</option>
                    <option value="iluminacion">Iluminación</option>
                    <option value="persianas">Persianas</option>
                    <option value="audio">Audio & Radio</option>
                    <option value="escena">Escenas & Relax</option>
                    <option value="clima">Clima & Confort</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Color Neón
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingWidget.color || '#00f3ff'}
                      onChange={(e) => setEditingWidget({ ...editingWidget, color: e.target.value })}
                      style={{
                        width: '38px',
                        height: '38px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {COLOR_PRESETS.map((col, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => setEditingWidget({ ...editingWidget, color: col })}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: col,
                            cursor: 'pointer',
                            border: editingWidget.color === col ? '2px solid #fff' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={editingWidget.description || ''}
                  onChange={(e) => setEditingWidget({ ...editingWidget, description: e.target.value })}
                  placeholder="Detalles sobre lo que ejecuta este widget..."
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.80rem',
                    resize: 'none'
                  }}
                />
              </div>

              {/* LISTA EDITABLE DE ACCIONES / BOTONES */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00f3ff' }}>
                    🔘 Botones / Acciones del Widget ({editingWidget.actions?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    style={{
                      background: 'rgba(0, 243, 255, 0.15)',
                      border: '1px solid rgba(0, 243, 255, 0.4)',
                      color: '#00f3ff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    <span>Añadir Botón</span>
                  </button>
                </div>

                {(!editingWidget.actions || editingWidget.actions.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '0.74rem' }}>
                    Este widget no tiene acciones. Pulsa "Añadir Botón" para agregar una.
                  </div>
                ) : (
                  editingWidget.actions.map((act, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
                          Botón #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                            Texto del Botón
                          </label>
                          <input
                            type="text"
                            value={act.label || ''}
                            onChange={(e) => handleActionChange(idx, 'label', e.target.value)}
                            placeholder="Ej: 💡 Encender Salón"
                            style={{
                              width: '100%',
                              background: '#020617',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: '#fff',
                              fontSize: '0.76rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                            Servicio
                          </label>
                          <select
                            value={act.service || 'light'}
                            onChange={(e) => handleActionChange(idx, 'service', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#020617',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: '#fff',
                              fontSize: '0.76rem'
                            }}
                          >
                            <option value="light">light (Iluminación)</option>
                            <option value="cover">cover (Persianas)</option>
                            <option value="radio">radio (Radio & Audio)</option>
                            <option value="scene">scene (Escenas)</option>
                            <option value="tts">tts (Voz)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                            Entidad / Dispositivo
                          </label>
                          <input
                            type="text"
                            list={`entities_list_${idx}`}
                            value={act.entity_id || ''}
                            onChange={(e) => handleActionChange(idx, 'entity_id', e.target.value)}
                            placeholder="all_lights, salon, persiana..."
                            style={{
                              width: '100%',
                              background: '#020617',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: '#fff',
                              fontSize: '0.76rem'
                            }}
                          />
                          <datalist id={`entities_list_${idx}`}>
                            <option value="all_lights" />
                            <option value="all_covers" />
                            <option value="radio_master" />
                            <option value="salon" />
                            <option value="andrea" />
                            <option value="principal" />
                            <option value="cocina" />
                            <option value="bano" />
                            <option value="pasillo" />
                            <option value="cover.persiana_salon" />
                            <option value="cover.persiana_andrea" />
                            <option value="cover.persiana_principal" />
                            <option value="modo_cine" />
                            <option value="modo_relax" />
                            {devicesList.map(d => (
                              <option key={d.entity_id || d.id} value={d.entity_id || d.id}>
                                {d.name || d.entity_id}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                            Acción
                          </label>
                          <select
                            value={act.action || 'turn_on_all'}
                            onChange={(e) => handleActionChange(idx, 'action', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#020617',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: '#fff',
                              fontSize: '0.76rem'
                            }}
                          >
                            <option value="turn_on_all">turn_on_all (Encender)</option>
                            <option value="turn_off_all">turn_off_all (Apagar)</option>
                            <option value="toggle">toggle (Alternar)</option>
                            <option value="open">open (Subir)</option>
                            <option value="close">close (Bajar)</option>
                            <option value="stop">stop (Detener)</option>
                            <option value="activate">activate (Activar)</option>
                            <option value="play">play (Reproducir)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                            Estilo
                          </label>
                          <select
                            value={act.style || 'info'}
                            onChange={(e) => handleActionChange(idx, 'style', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#020617',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: '#fff',
                              fontSize: '0.76rem'
                            }}
                          >
                            <option value="success">Verde (Success)</option>
                            <option value="danger">Rojo (Danger)</option>
                            <option value="info">Cian (Info)</option>
                            <option value="warning">Naranja (Warning)</option>
                            <option value="primary">Azul (Primary)</option>
                            <option value="secondary">Morado (Secondary)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Botones del pie del modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '10px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <button
                  type="button"
                  onClick={() => setEditingWidget(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
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
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    background: 'linear-gradient(135deg, #00f3ff, #10b981)',
                    border: 'none',
                    color: '#020617',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'
                  }}
                >
                  <Save size={14} />
                  <span>{savingEdit ? 'Guardando...' : '💾 Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

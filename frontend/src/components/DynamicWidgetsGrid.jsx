import React, { useState, useEffect } from 'react';

export default function DynamicWidgetsGrid({ onActionExecuted }) {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('⚡');
  const [newColor, setNewColor] = useState('#00f3ff');
  const [newRoom, setNewRoom] = useState('general');
  const [newDesc, setNewDesc] = useState('');

  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/widgets');
      if (res.ok) {
        const data = await res.json();
        setWidgets(data.widgets || []);
      }
    } catch (e) {
      console.error('Error fetching dynamic widgets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
    const interval = setInterval(fetchWidgets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async (widget) => {
    setExecutingId(widget.id);
    try {
      const res = await fetch(`/api/widgets/${widget.id}/execute`, { method: 'POST' });
      if (res.ok) {
        setFeedbackMsg(`✨ ${widget.title} activado`);
        setTimeout(() => setFeedbackMsg(null), 2500);
        if (onActionExecuted) onActionExecuted();
      }
    } catch (e) {
      console.error('Error executing widget:', e);
    } finally {
      setTimeout(() => setExecutingId(null), 400);
    }
  };

  const handleDelete = async (widgetId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Deseas eliminar este botón de la pantalla?')) return;
    try {
      await fetch(`/api/widgets/${widgetId}`, { method: 'DELETE' });
      fetchWidgets();
    } catch (e) {
      console.error('Error deleting widget:', e);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          icon: newIcon,
          color: newColor,
          room: newRoom,
          description: newDesc,
          action_type: 'multi_command',
          payload: { commands: [] }
        })
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchWidgets();
    } catch (err) {
      console.error('Error creating widget:', err);
    }
  };

  if (loading && widgets.length === 0) return null;

  return (
    <div style={{
      margin: '14px 0 20px 0',
      background: 'linear-gradient(145deg, rgba(8, 15, 30, 0.88), rgba(4, 8, 18, 0.94))',
      border: '1px solid rgba(0, 243, 255, 0.2)',
      borderRadius: '16px',
      padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Cabecera del Grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '1px', color: '#00f3ff', textTransform: 'uppercase' }}>
              Acciones y Botones Dinámicos
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Pídele a HABANA por WhatsApp o voz: <span style={{ color: '#38bdf8' }}>"Habana, ponme un botón que..."</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {feedbackMsg && (
            <span style={{
              fontSize: '0.75rem',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: '600'
            }}>
              {feedbackMsg}
            </span>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'rgba(0, 243, 255, 0.12)',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              color: '#00f3ff',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>➕</span> Añadir
          </button>
        </div>
      </div>

      {/* Grid de Botones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px'
      }}>
        {widgets.map((w) => {
          const isExecuting = executingId === w.id;
          const accentColor = w.color || '#00f3ff';
          return (
            <div
              key={w.id}
              onClick={() => handleExecute(w)}
              style={{
                position: 'relative',
                background: w.bg_gradient || `linear-gradient(135deg, ${accentColor}25, rgba(15, 23, 42, 0.6))`,
                border: `1px solid ${isExecuting ? accentColor : (w.border_color || `${accentColor}44`)}`,
                borderRadius: '12px',
                padding: '12px 10px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isExecuting ? 'scale(0.96)' : 'scale(1)',
                boxShadow: isExecuting ? `0 0 16px ${accentColor}88` : '0 2px 8px rgba(0,0,0,0.3)',
                userSelect: 'none'
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{w.icon || '⚡'}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.title}
              </div>
              {w.description && (
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {w.description}
                </div>
              )}
              {w.created_by?.startsWith('ia_') && (
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  fontSize: '0.58rem',
                  color: '#a855f7',
                  background: 'rgba(168, 85, 247, 0.2)',
                  padding: '1px 5px',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}>
                  IA
                </div>
              )}
              <button
                onClick={(e) => handleDelete(w.id, e)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  opacity: 0.4,
                  padding: '2px'
                }}
                title="Eliminar botón"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Añadir Botón Manual */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
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
            padding: '22px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#00f3ff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>➕</span> Nuevo Botón Dinámico
            </h3>

            <form onSubmit={handleCreateManual}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Nombre del Botón</label>
                <input
                  type="text"
                  placeholder="ej. Modo Siesta"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.25)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Icono (Emoji)</label>
                  <input
                    type="text"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.25)',
                      color: '#fff',
                      textAlign: 'center',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Color</label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#090f1f',
                      border: '1px solid rgba(0, 243, 255, 0.25)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Descripción / Nota</label>
                <input
                  type="text"
                  placeholder="ej. Apaga salón y persiana 80%"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.25)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                    color: '#000',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.75rem'
                  }}
                >
                  Crear Botón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

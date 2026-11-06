import React, { useState } from 'react';
import { History, Camera, RotateCcw, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function BunkerTimeMachine({ 
  snapshots = [], 
  API_BASE = '', 
  onRefresh = null 
}) {
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDesc.trim() || 'Punto de guardado manual' })
      });
      if (res.ok) {
        setNewDesc('');
        setFeedback({ ok: true, msg: '✔ Punto de guardado creado con éxito' });
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      setFeedback({ ok: false, msg: `Error: ${e.message}` });
    } finally {
      setCreating(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleRestore = async (snapId, desc) => {
    if (!window.confirm(`¿Revertir el Búnker al estado de "${desc}"?\nTodos los widgets volverán exactamente a esa versión.`)) return;
    setRestoringId(snapId);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/snapshots/${snapId}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        setFeedback({ ok: true, msg: `✔ Búnker revertido con éxito a la versión ${snapId}` });
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      setFeedback({ ok: false, msg: `Error al revertir: ${e.message}` });
    } finally {
      setRestoringId(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Cabecera y Crear Snapshot Manual */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f3ff', fontWeight: 800, fontSize: '0.90rem' }}>
            <History size={18} />
            <span>TIME MACHINE DEL BÚNKER (CONTROL DE VERSIONES Y ROLLBACK)</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            Cada cambio crea una copia automática. Puedes revertir en 1 clic.
          </span>
        </div>

        <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Descripción del punto de guardado (ej: Antes de cambiar luces terraza)..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              background: '#091024',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              color: '#fff',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={creating}
            style={{
              background: 'linear-gradient(135deg, #00f3ff, #10b981)',
              border: 'none',
              color: '#020617',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Camera size={14} />
            <span>{creating ? 'Guardando...' : 'Crear Punto Ahora'}</span>
          </button>
        </form>

        {feedback && (
          <div style={{
            background: feedback.ok ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${feedback.ok ? '#10b981' : '#ef4444'}`,
            color: feedback.ok ? '#34d399' : '#f87171',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={14} />
            <span>{feedback.msg}</span>
          </div>
        )}
      </div>

      {/* Lista de Snapshots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem', padding: '20px' }}>
            No hay puntos de guardado registrados todavía.
          </div>
        ) : (
          snapshots.map(s => {
            const isRestoring = restoringId === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 243, 255, 0.12)',
                    color: '#00f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff' }}>
                      {s.description || 'Punto de guardado'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} />
                        {s.datetime_str}
                      </span>
                      <span>•</span>
                      <span>{s.widget_count} widgets</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestore(s.id, s.description)}
                  disabled={isRestoring}
                  title="Revertir el Búnker a este punto exacto"
                  style={{
                    background: 'rgba(0, 243, 255, 0.12)',
                    border: '1px solid rgba(0, 243, 255, 0.35)',
                    color: '#00f3ff',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: isRestoring ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <RotateCcw size={12} className={isRestoring ? "animate-spin" : ""} />
                  <span>{isRestoring ? 'Revertiendo...' : 'Revertir a esta versión'}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  BookOpen, Folder, RefreshCw, Calendar, ExternalLink,
  Cpu, Home, Camera, Zap, Users, FileText, CheckCircle,
  Sparkles, Plus, AlertCircle, MessageSquare, Brain, Trash2
} from 'lucide-react';

export default function ObsidianVaultPanel({ API_BASE = '' }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // Formulario para nueva memoria
  const [memTitle, setMemTitle] = useState('');
  const [memContent, setMemContent] = useState('');
  const [memCategory, setMemCategory] = useState('general');

  // Estado para el Motor de Auto-Aprendizaje y Lecciones
  const [lessons, setLessons] = useState([]);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonFailure, setNewLessonFailure] = useState('');
  const [newLessonRule, setNewLessonRule] = useState('');

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/obsidian/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/lessons`);
      if (res.ok) {
        const data = await res.json();
        setLessons(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching lessons:", e);
    }
  };

  const handleToggleLesson = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/lessons/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showNotification('Estado de la regla actualizado', 'info');
        fetchLessons();
      }
    } catch (e) {
      showNotification('Error alternando regla', 'error');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta lección aprendida?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Regla eliminada de la memoria de la IA', 'success');
        fetchLessons();
      }
    } catch (e) {
      showNotification('Error eliminando regla', 'error');
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !newLessonRule.trim()) {
      showNotification('Introduce título y regla de comportamiento', 'warning');
      return;
    }
    try {
      setActionLoading('create_lesson');
      const res = await fetch(`${API_BASE}/api/obsidian/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          failure_context: newLessonFailure.trim() || 'Ajuste preventivo manual',
          correction: newLessonRule.trim(),
          rule: newLessonRule.trim(),
          source: 'Tomas'
        })
      });
      if (res.ok) {
        showNotification('🧠 Lección guardada en Obsidian e inyectada a la IA', 'success');
        setNewLessonTitle('');
        setNewLessonFailure('');
        setNewLessonRule('');
        setShowAddLesson(false);
        fetchLessons();
      } else {
        showNotification('Error al registrar lección', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLessons();
  }, []);

  const handleOpenObsidian = async () => {
    setActionLoading('open');
    try {
      // 1. Invocación al backend de HABANA (lanza Obsidian.exe con la bóveda en Windows)
      const res = await fetch(`${API_BASE}/api/obsidian/open`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      // 2. Disparo interactivo desde el navegador del usuario (protocolo directo URI)
      try {
        const uri = data.obsidian_uri || `obsidian://open?path=${encodeURIComponent('F:/Habana 12/vault')}`;
        const a = document.createElement('a');
        a.href = uri;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
      } catch (err) {
        // Fallback silencioso si el navegador previene navegación
      }

      if (res.ok && data.opened) {
        showNotification('🟣 Bóveda de Obsidian abierta correctamente', 'success');
      } else {
        showNotification('🟣 Abriendo Obsidian...', 'info');
      }
    } catch (e) {
      showNotification('Error al contactar con el sistema', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenFolder = async (subfolder = null) => {
    setActionLoading(subfolder ? `folder_${subfolder}` : 'folder');
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subfolder })
      });
      if (res.ok) {
        showNotification(
          subfolder 
            ? `📁 Carpeta '${subfolder}' abierta en Windows`
            : '📁 Carpeta de la Bóveda abierta en Windows',
          'success'
        );
      } else {
        showNotification('Error al abrir carpeta en el explorador', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncVault = async () => {
    setActionLoading('sync');
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/sync`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showNotification(`🔄 Sincronizados ${data.synced_lights || 20} dispositivos y ${data.synced_rooms || 7} estancias`, 'success');
        fetchStatus();
      } else {
        showNotification('Error al sincronizar bóveda', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateDaily = async () => {
    setActionLoading('daily');
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/daily-digest`, { method: 'POST' });
      if (res.ok) {
        showNotification('📅 Diario del día generado y actualizado en Markdown', 'success');
        fetchStatus();
      } else {
        showNotification('Error generando diario', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) {
      showNotification('Introduce título y contenido', 'warning');
      return;
    }
    setActionLoading('save_mem');
    try {
      const res = await fetch(`${API_BASE}/api/obsidian/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: memTitle.trim(),
          content: memContent.trim(),
          author: 'Tomas',
          category: memCategory
        })
      });
      if (res.ok) {
        showNotification(`📝 Memoria '${memTitle}' guardada en Obsidian`, 'success');
        setMemTitle('');
        setMemContent('');
        fetchStatus();
      } else {
        showNotification('Error guardando memoria', 'error');
      }
    } catch (e) {
      showNotification('Error de conexión', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const counts = status?.categories || {};

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(12, 8, 28, 0.97), rgba(4, 2, 14, 0.98))',
      border: '1px solid rgba(168, 85, 247, 0.35)',
      borderRadius: '14px',
      padding: '24px',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Notificación flotante */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.95)' :
                      notification.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(168, 85, 247, 0.95)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '0.82rem',
          zIndex: 99999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.msg}
        </div>
      )}

      {/* CABECERA STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(168, 85, 247, 0.22)',
        paddingBottom: '18px',
        marginBottom: '22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.16)',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 22px rgba(168, 85, 247, 0.25)'
          }}>
            <BookOpen size={26} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid #a855f7',
                color: '#d8b4fe',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                letterSpacing: '0.8px'
              }}>
                SEGUNDO CEREBRO · AGENT OS
              </span>
              <span style={{
                background: 'rgba(0, 243, 255, 0.14)',
                border: '1px solid #00f3ff',
                color: '#00f3ff',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                {status ? `${status.total_notes} NOTAS EN DISCO` : 'CARGANDO...'}
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold'
              }}>
                F:\Habana 12\vault
              </span>
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}>
              OBSIDIAN · MEMORIA COGNITIVA PERSISTENTE
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Bóveda de conocimiento abierta en Markdown. Lola lee, enlaza y documenta dispositivos, diarios y recuerdos en local.
            </p>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL MAESTRO: ABRIR OBSIDIAN */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenObsidian}
            disabled={actionLoading === 'open'}
            style={{
              background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
              border: '1px solid #c084fc',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '12px 20px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={18} />
            {actionLoading === 'open' ? 'Abriendo...' : '🟣 ABRIR OBSIDIAN'}
          </button>

          <button
            onClick={handleOpenFolder}
            disabled={actionLoading === 'folder'}
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#cbd5e1',
              borderRadius: '10px',
              padding: '12px 16px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <Folder size={16} />
            Abrir Carpeta
          </button>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS Y SINCRONIZACIÓN */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <button
          onClick={handleSyncVault}
          disabled={actionLoading === 'sync'}
          style={{
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            color: '#00f3ff',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={actionLoading === 'sync' ? 'spin' : ''} />
          {actionLoading === 'sync' ? 'Sincronizando...' : '🔄 Sincronizar Dispositivos a Markdown'}
        </button>

        <button
          onClick={handleGenerateDaily}
          disabled={actionLoading === 'daily'}
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Calendar size={14} />
          {actionLoading === 'daily' ? 'Generando...' : '📅 Generar Diario del Día'}
        </button>

        <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: 'auto' }}>
          Formato: Markdown local puro · Enlaces bidireccionales `[[wikilinks]]`
        </span>
      </div>

      {/* TARJETAS KPI DE LA BÓVEDA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div
          onClick={() => handleOpenFolder('Dispositivos')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Abrir carpeta Dispositivos en el Explorador"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Dispositivos 📁</span>
            <Cpu size={16} color="#00f3ff" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00f3ff', marginTop: '4px' }}>
            {counts.dispositivos || 28}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Fichas con vatios y canales ↗</div>
        </div>

        <div
          onClick={() => handleOpenFolder('Estancias')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Abrir carpeta Estancias en el Explorador"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Estancias 📁</span>
            <Home size={16} color="#c084fc" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
            {counts.estancias || 7}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Salón, Pasillo, Andrea... ↗</div>
        </div>

        <div
          onClick={() => handleOpenFolder('Camaras')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Abrir carpeta Cámaras en el Explorador"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Cámaras y Visión 📁</span>
            <Camera size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {counts.camaras || 3}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Centinela YOLOv8 local ↗</div>
        </div>

        <div
          onClick={() => handleOpenFolder('Automatizaciones')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Abrir carpeta Automatizaciones en el Explorador"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Automatizaciones 📁</span>
            <Zap size={16} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {counts.automatizaciones || 11}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Reglas documentadas ↗</div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          borderRadius: '10px',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Personas & Lola</span>
            <Users size={16} color="#f472b6" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f472b6', marginTop: '4px' }}>
            {counts.personas || 3}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Tomás, Andrea, Lola</div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Diarios y Recuerdos</span>
            <FileText size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {(counts.diario || 1) + (counts.memorias || 0)}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Bitácora de actividad</div>
        </div>

        <div
          onClick={() => handleOpenFolder('WhatsApp')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 0 12px rgba(37, 211, 102, 0.1)'
          }}
          title="Abrir carpeta WhatsApp en el Explorador de Windows"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#86efac' }}>WhatsApp Vault 📁</span>
            <MessageSquare size={16} color="#25D366" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#25D366', marginTop: '4px' }}>
            {(counts.whatsapp_enlaces || 0) + (counts.whatsapp_videos || 0) + (counts.whatsapp_musica || 0) + (counts.whatsapp_docs || 0) + (counts.whatsapp_fotos || 0) + (counts.whatsapp_notas || 0)}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>Vídeos, Música, Enlaces... ↗</div>
        </div>

      {/* TARJETA HUD: ESTADO DE LA IA LOCAL & MEMORIA COGNITIVA (N100 PROXMOX) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 27, 75, 0.55))',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '22px',
        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '280px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.2)',
            border: '1px solid #c084fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(168, 85, 247, 0.35)'
          }}>
            <Cpu size={22} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                IA Local en Bóveda: Meta LLaMA 3.2 (3B Q4) & YOLOv8
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}>
                100% OFFLINE
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '4px' }}>
              Motor <strong style={{ color: '#c084fc' }}>Ollama</strong> (`llama3.2:latest`, 1.88 GB) · Visión <strong style={{ color: '#00f3ff' }}>YOLOv8n ONNX</strong> (&lt;80ms) · Optimizado para Mini PC N100 (12 GB RAM)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            textAlign: 'right',
            paddingRight: '12px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Proxmox RAM Target</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>~6.0 GB / 12 GB</div>
          </div>
          <button
            onClick={() => handleOpenFolder('Sistema')}
            style={{
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid #a855f7',
              color: '#e9d5ff',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={14} />
            Ver Ficha en Obsidian
          </button>
        </div>
      </div>
      </div>

      {/* TARJETA DE AUTO-APRENDIZAJE Y FEEDBACK LOOP DE TOMÁS */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(8, 20, 36, 0.95), rgba(15, 23, 42, 0.95))',
        border: '1.5px solid rgba(0, 243, 255, 0.4)',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(0, 243, 255, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de fondo decorativo */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(0, 243, 255, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Cabecera del Motor de Aprendizaje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(0, 243, 255, 0.15)',
              border: '1.5px solid #00f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)'
            }}>
              <Brain size={22} color="#00f3ff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
                  🧠 Motor de Auto-Aprendizaje & Correcciones de Tomás
                </span>
                <span style={{
                  background: 'rgba(0, 243, 255, 0.2)',
                  border: '1px solid #00f3ff',
                  color: '#00f3ff',
                  padding: '3px 10px',
                  borderRadius: '14px',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}>
                  {lessons.filter(l => l.active !== false).length} REGLAS EN EL PROMPT ACTIVO
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                Cada fallo o corrección que haces a la IA se graba en <strong style={{ color: '#c084fc' }}>Obsidian</strong> y se inyecta con máxima prioridad a Groq, Gemini y Ollama.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowAddLesson(!showAddLesson)}
              style={{
                background: showAddLesson ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(168, 85, 247, 0.25))',
                border: showAddLesson ? '1px solid #ef4444' : '1px solid rgba(0, 243, 255, 0.55)',
                color: showAddLesson ? '#fca5a5' : '#00f3ff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} />
              {showAddLesson ? 'Cancelar' : 'Enseñar Nueva Regla a Mano'}
            </button>
            <button
              type="button"
              onClick={() => handleOpenFolder('Memoria_Lola')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Abrir carpeta de memorias y reglas en el explorador"
            >
              <Folder size={14} />
              Ver en Obsidian
            </button>
          </div>
        </div>

        {/* Formulario desplegable para nueva lección manual */}
        {showAddLesson && (
          <form onSubmit={handleCreateLesson} style={{
            background: 'rgba(2, 6, 23, 0.85)',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00f3ff' }}>
              ✍️ Enseñar una Regla Directa a la Memoria de la IA
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Nombre / Situación de la Regla:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Luz de la tele, Cine salón, Modo siesta..."
                  value={newLessonTitle}
                  onChange={e => setNewLessonTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Fallo Previo a Evitar (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Encendía la luz general del techo..."
                  value={newLessonFailure}
                  onChange={e => setNewLessonFailure(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Regla de Oro Obligatoria (Lo que SIEMPRE debe hacer la IA):
              </label>
              <input
                type="text"
                placeholder="Ej: Siempre usar led_tv_salon al 30% y nunca tocar la lámpara principal..."
                value={newLessonRule}
                onChange={e => setNewLessonRule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#00f3ff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={actionLoading === 'create_lesson'}
                style={{
                  background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
                  border: 'none',
                  color: '#020617',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {actionLoading === 'create_lesson' ? 'Guardando...' : '💾 Grabar Regla en Obsidian & IA'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Lecciones Activas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {lessons.map((lesson) => {
            const isActive = lesson.active !== false;
            return (
              <div
                key={lesson.id}
                style={{
                  background: isActive ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.35)',
                  border: `1px solid ${isActive ? 'rgba(0, 243, 255, 0.28)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isActive ? '#f8fafc' : '#94a3b8' }}>
                      {lesson.title}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                      📅 {lesson.date} · Fuente: {lesson.source || 'Tomás'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleLesson(lesson.id)}
                      style={{
                        background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        border: `1px solid ${isActive ? '#10b981' : '#f59e0b'}`,
                        color: isActive ? '#34d399' : '#fbbf24',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title={isActive ? 'Pausar regla temporalmente' : 'Activar regla en el prompt'}
                    >
                      {isActive ? '✅ Activa' : '⏸️ Pausada'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer'
                      }}
                      title="Eliminar de Obsidian y de la memoria"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {lesson.failure_context && (
                  <div style={{
                    fontSize: '0.72rem',
                    color: '#fca5a5',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '3px solid #ef4444',
                    padding: '4px 8px',
                    borderRadius: '0 4px 4px 0'
                  }}>
                    <strong>⚠️ Fallo evitado:</strong> {lesson.failure_context}
                  </div>
                )}

                <div style={{
                  fontSize: '0.76rem',
                  color: '#00f3ff',
                  background: 'rgba(0, 243, 255, 0.08)',
                  borderLeft: '3px solid #00f3ff',
                  padding: '6px 10px',
                  borderRadius: '0 6px 6px 0',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#fff' }}>🎯 Regla de Oro:</strong> {lesson.rule || lesson.correction}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRID DE DOS COLUMNAS: ARCHIVOS DESTACADOS + NUEVA MEMORIA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* COLUMNA 1: DOCUMENTOS MAESTROS DEL VAULT */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={16} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
              Documentos y Vistas Principales del Vault
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* GUÍA DE IA LOCAL Y PROXMOX N100 */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.15)'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} color="#c084fc" />
                  Sistema/GUIA_IA_LOCAL_Y_OBSIDIAN.md
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                  Ficha de IA Local (LLaMA 3.2 3B, Ollama, YOLOv8n ONNX) y dimensionamiento para Mini PC N100 en Proxmox
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleOpenFolder('Sistema')}
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Folder size={12} />
                  Abrir Sistema
                </button>
              </div>
            </div>

            {/* ÍNDICE WHATSAPP ARCHIVER */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={15} color="#25D366" />
                  00_INDICE_WHATSAPP.md
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                  Archivo multimedia clasificado (Vídeos, Música, Enlaces Web, Documentos, Fotos)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleOpenFolder('WhatsApp')}
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#25D366',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Folder size={12} />
                  Abrir WhatsApp
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>00_HABANA_CEREBRO_CENTRAL.md</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Dashboard de bienvenida con mapa de enlaces</div>
              </div>
              <span style={{ fontSize: '0.66rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                Principal
              </span>
            </div>

            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(0, 243, 255, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00f3ff' }}>Topologia_Hogar.canvas</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lienzo espacial 2D de habitaciones y conexiones</div>
              </div>
              <span style={{ fontSize: '0.66rem', color: '#00f3ff', background: 'rgba(0, 243, 255, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                Lienzo 2D
              </span>
            </div>

            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>Diario/2026-10-25.md</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Resumen de presencia, fotos forenses y telemetría</div>
              </div>
              <span style={{ fontSize: '0.66rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                Diario Hoy
              </span>
            </div>

            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>Personas/Tomas.md & Andrea.md</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Preferencias de iluminación, confort y hábitos</div>
              </div>
              <span style={{ fontSize: '0.66rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '10px' }}>
                Perfiles
              </span>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: FORMULARIO PARA REGISTRAR MEMORIA O NOTA */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Plus size={16} color="#00f3ff" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
              Añadir Nota o Recuerdo al Vault de Lola
            </h3>
          </div>

          <form onSubmit={handleSaveMemory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Título de la Nota / Recuerdo
              </label>
              <input
                type="text"
                value={memTitle}
                onChange={(e) => setMemTitle(e.target.value)}
                placeholder="Ej. Revisión Caldera Invierno"
                style={{
                  width: '100%',
                  background: '#090f1f',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Contenido / Descripción en Markdown
              </label>
              <textarea
                rows={3}
                value={memContent}
                onChange={(e) => setMemContent(e.target.value)}
                placeholder="Escribe la nota o instrucción para que Lola la tenga en cuenta..."
                style={{
                  width: '100%',
                  background: '#090f1f',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <select
                value={memCategory}
                onChange={(e) => setMemCategory(e.target.value)}
                style={{
                  background: '#090f1f',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#cbd5e1',
                  fontSize: '0.76rem'
                }}
              >
                <option value="general">Categoría: General</option>
                <option value="mantenimiento">Categoría: Mantenimiento</option>
                <option value="preferencias">Categoría: Preferencias</option>
                <option value="agenda">Categoría: Recordatorio / Cita</option>
              </select>

              <button
                type="submit"
                disabled={actionLoading === 'save_mem'}
                style={{
                  background: 'rgba(168, 85, 247, 0.25)',
                  border: '1px solid #a855f7',
                  color: '#d8b4fe',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                {actionLoading === 'save_mem' ? 'Guardando...' : 'Guardar en Obsidian'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

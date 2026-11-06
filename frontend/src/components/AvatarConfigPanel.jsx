import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, Video, Clipboard, Check, Film, Plus, RefreshCw, Upload, FileVideo, BookOpen } from 'lucide-react';

export default function AvatarConfigPanel() {
  const [responses, setResponses] = useState([]);
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [responseText, setResponseText] = useState('');
  const [videoFilename, setVideoFilename] = useState('');
  const [generationPrompt, setGenerationPrompt] = useState('');
  
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [obsidianSyncing, setObsidianSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchResponses = async () => {
    try {
      const res = await fetch(`/api/avatar/responses`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
      }
    } catch (e) {
      console.error("Error al obtener catálogo de avatar:", e);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleAiSuggest = async () => {
    if (!triggerPhrase.trim()) {
      alert("Por favor, introduce primero una frase de activación.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(`/api/avatar/suggest?trigger_phrase=${encodeURIComponent(triggerPhrase)}`);
      if (res.ok) {
        const data = await res.json();
        setResponseText(data.response_text);
        setGenerationPrompt(data.generation_prompt);
        if (!videoFile) {
          const cleanName = triggerPhrase.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          setVideoFilename(`Female_AI_${cleanName}.mp4`);
        }
      }
    } catch (e) {
      console.error("Error al obtener sugerencia de la IA:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddResponse = async (e) => {
    e.preventDefault();
    if (!triggerPhrase || !responseText || (!videoFilename && !videoFile)) {
      alert("Por favor, rellena la frase, la respuesta y selecciona o indica el vídeo.");
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (videoFile) {
        // Subida de archivo físico .mp4 al servidor y sincronización con Obsidian
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('trigger_phrase', triggerPhrase);
        formData.append('response_text', responseText);
        formData.append('generation_prompt', generationPrompt || `Clip para comando '${triggerPhrase}'`);

        res = await fetch(`/api/avatar/upload`, {
          method: 'POST',
          body: formData
        });
      } else {
        // Registro por nombre de archivo existente o URL
        res = await fetch(`/api/avatar/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trigger_phrase: triggerPhrase,
            response_text: responseText,
            video_filename: videoFilename,
            generation_prompt: generationPrompt
          })
        });
      }

      if (res.ok) {
        setTriggerPhrase('');
        setResponseText('');
        setVideoFilename('');
        setGenerationPrompt('');
        setVideoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchResponses();
        if (window.showToast) {
          window.showToast("Clip registrado y guardado en Obsidian Vault");
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || err.message || 'No se pudo guardar'}`);
      }
    } catch (e) {
      console.error("Error al añadir respuesta:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncObsidian = async () => {
    setObsidianSyncing(true);
    try {
      const res = await fetch(`/api/avatar/sync-obsidian`, { method: 'POST' });
      const data = await res.json();
      fetchResponses();
      if (window.showToast) {
        window.showToast(`Sincronizado con Obsidian Vault (importados: ${data.imported || 0})`);
      }
    } catch (e) {
      console.error("Error al sincronizar con Obsidian:", e);
    } finally {
      setObsidianSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta respuesta de avatar (se actualizará también en Obsidian)?")) return;
    try {
      const res = await fetch(`/api/avatar/responses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchResponses();
        if (window.showToast) window.showToast("Respuesta eliminada");
      }
    } catch (e) {
      console.error("Error al borrar respuesta:", e);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '14px',
      padding: '24px',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '22px'
    }}>
      {/* CABECERA PRINCIPAL ESTILO STUDIO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.18)',
        paddingBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.14)',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(168, 85, 247, 0.22)'
          }}>
            <Video size={24} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(168, 85, 247, 0.16)',
                border: '1px solid #a855f7',
                color: '#d8b4fe',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                letterSpacing: '0.8px'
              }}>
                GOOGLE VEO 3.1 // AVATAR STUDIO
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
                🎬 {responses.length} CLIPS REGISTRADOS
              </span>
              <span style={{
                background: 'rgba(168, 85, 247, 0.18)',
                border: '1px solid #c084fc',
                color: '#e9d5ff',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '0.66rem',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🟣 OBSIDIAN VAULT (vault/Avatar)
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>
              GESTOR DE AVATAR HOLOGRÁFICO & PROMPTS VEO
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              Vincula comandos de voz con clips de vídeo MP4, genera prompts cinemáticos mediante IA y sincroniza automáticamente con tu bóveda Obsidian.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleSyncObsidian}
            disabled={obsidianSyncing}
            style={{
              background: 'rgba(168, 85, 247, 0.18)',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              color: '#d8b4fe',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Sincroniza notas creadas o editadas en Obsidian"
          >
            <BookOpen size={14} /> {obsidianSyncing ? 'Sincronizando...' : 'Sincronizar Obsidian'}
          </button>
          <button
            onClick={fetchResponses}
            style={{
              background: 'rgba(0, 243, 255, 0.1)',
              border: '1px solid rgba(0, 243, 255, 0.4)',
              color: '#00f3ff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>
      </div>

      {/* Formulario de Nueva Respuesta */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={18} /> Registrar Nuevo Vídeo / Respuesta de Avatar
          </h3>
          <span style={{
            background: 'rgba(236, 72, 153, 0.16)',
            border: '1px solid rgba(236, 72, 153, 0.45)',
            color: '#f472b6',
            fontSize: '0.68rem',
            fontWeight: 'bold',
            padding: '2px 9px',
            borderRadius: '12px'
          }}>
            AUTO-PROMPT GENERATOR & OBSIDIAN PIPELINE
          </span>
        </div>

        <form onSubmit={handleAddResponse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '600' }}>Frase / Comando de Activación</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Ej. enciende las luces"
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.22)',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.22), rgba(139, 92, 246, 0.28))',
                    border: '1px solid #ec4899',
                    color: '#f9a8d4',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Sparkles size={15} /> {aiLoading ? 'Generando...' : 'Asistente IA (Veo 3.1)'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '600' }}>
                  Archivo de Vídeo MP4 (Servidor o Subir de PC)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setVideoFile(f);
                      setVideoFilename(f.name);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Upload size={12} /> {videoFile ? 'Cambiar archivo' : '📁 Subir vídeo MP4'}
                </button>
              </div>

              {videoFile ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid #38bdf8',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '0.82rem',
                  color: '#38bdf8'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileVideo size={16} /> <strong>{videoFile.name}</strong> ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Ej. /media/videos/inicio.mp4 o nombre.mp4"
                  value={videoFilename}
                  onChange={(e) => setVideoFilename(e.target.value)}
                  style={{
                    background: '#090f1f',
                    border: '1px solid rgba(0, 243, 255, 0.22)',
                    color: '#38bdf8',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '600' }}>Respuesta de Texto (Voz TTS)</label>
            <input
              type="text"
              className="cyber-input"
              placeholder="Ej. Entendido, procediendo a encender las luces."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              style={{
                background: '#090f1f',
                border: '1px solid rgba(0, 243, 255, 0.22)',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '600' }}>Prompt de Generación para Google Veo 3.1</label>
            <textarea
              rows={3}
              className="cyber-input"
              placeholder="Prompt descriptivo en inglés para generar el clip del avatar en Google Veo..."
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              style={{
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '0.83rem',
                background: '#090f1f',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#e9d5ff',
                padding: '10px 12px',
                borderRadius: '8px'
              }}
            />
          </div>

          <button
            type="submit"
            className="cyber-btn"
            disabled={submitting}
            style={{
              width: 'fit-content',
              marginTop: '4px',
              padding: '10px 22px',
              background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(59, 130, 246, 0.24))',
              border: '1px solid #00f3ff',
              color: '#00f3ff',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(0, 243, 255, 0.2)'
            }}
          >
            <Plus size={16} /> {submitting ? 'Guardando en HABANA & Obsidian...' : '💾 Guardar en HABANA y Obsidian'}
          </button>
        </form>
      </div>

      {/* Catálogo Registrado */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.02rem' }}>
              Catálogo de Respuestas y Prompts de Google Veo 3.1
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Cada clip tiene su nota Markdown sincronizada en <code>vault/Avatar/</code>.
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '3px 9px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)' }}>
            {responses.length} entrada{responses.length !== 1 ? 's' : ''} activas
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0, 243, 255, 0.2)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 10px' }}>Activación</th>
                <th style={{ padding: '12px 10px' }}>Respuesta TTS</th>
                <th style={{ padding: '12px 10px' }}>Archivo de Vídeo</th>
                <th style={{ padding: '12px 10px' }}>Google Veo 3.1 Prompt</th>
                <th style={{ padding: '12px 10px', width: '60px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {responses.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'top' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#00f3ff' }}>
                    <span style={{ background: 'rgba(0, 243, 255, 0.1)', border: '1px solid rgba(0, 243, 255, 0.25)', padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                      {row.trigger_phrase}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#e2e8f0' }}>{row.response_text}</td>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8' }}>{row.video_filename}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      background: '#050811',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(168, 85, 247, 0.25)'
                    }}>
                      <span style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'monospace', color: '#cbd5e1', lineHeight: 1.4 }}>{row.generation_prompt}</span>
                      <button
                        onClick={() => copyToClipboard(row.generation_prompt, row.id)}
                        className="cyber-tab-btn"
                        style={{
                          padding: '5px',
                          background: 'rgba(0, 243, 255, 0.1)',
                          border: '1px solid rgba(0, 243, 255, 0.3)',
                          borderRadius: '6px',
                          color: '#00f3ff',
                          cursor: 'pointer'
                        }}
                        title="Copiar prompt para Google Veo"
                      >
                        {copiedId === row.id ? <Check size={14} style={{ color: '#34d399' }} /> : <Clipboard size={14} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(row.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px'
                      }}
                      title="Eliminar de HABANA y de Obsidian"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                    No hay respuestas de avatar configuradas en el catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

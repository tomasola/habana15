import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Copy, Check, Upload, FileText, Video, 
  Lightbulb, Shield, Sun, Users, Layers, Sliders, 
  CheckCircle2, AlertCircle, RefreshCw, X, Play
} from 'lucide-react';

export default function BunkerLolaStudio({ API_BASE = '', isEnabled = true }) {
  const [catalog, setCatalog] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  
  // Generador personalizado
  const [customInput, setCustomInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);

  // Estados de copia
  const [copiedKey, setCopiedKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modal de subida de vídeo
  const [uploadModal, setUploadModal] = useState(null); // { trigger, response, prompt }
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/bunker/lola/phrases`);
      if (res.ok) {
        const json = await res.json();
        setCatalog(json.phrases || []);
      }
    } catch (e) {
      console.error('Error cargando catálogo de frases de Lola:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [API_BASE]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCustomGenerate = async (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/lola/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: customInput.trim() })
      });
      if (res.ok) {
        const json = await res.json();
        setGeneratedResult(json.result);
      } else {
        setFeedback({ type: 'error', text: 'Error al generar los prompts.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error de conexión con el generador.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveObsidian = async (phraseData) => {
    try {
      const res = await fetch(`${API_BASE}/api/bunker/lola/save-obsidian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phraseData)
      });
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          text: `¡Ficha guardada en Obsidian! (vault/Avatar/${phraseData.trigger.replace(/\s+/g, '_')}.md)` 
        });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error al guardar en Obsidian.' });
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadModal) return;
    setUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('trigger_phrase', uploadModal.trigger);
    formData.append('response_text', uploadModal.response);
    formData.append('generation_prompt', uploadModal.veo_prompt || '');

    try {
      const res = await fetch(`${API_BASE}/api/bunker/lola/upload-video`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        setFeedback({ type: 'success', text: `✅ ${json.message}` });
        setUploadModal(null);
        setUploadFile(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', text: errJson.detail || 'Error al subir el archivo de vídeo.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error de red al transferir el archivo.' });
    } finally {
      setUploading(false);
    }
  };

  const categories = ['Todas', 'Iluminación', 'Tiras LED', 'Ambientes', 'Rutinas', 'Seguridad', 'Personas'];
  const filteredCatalog = category === 'Todas' 
    ? catalog 
    : catalog.filter(c => c.category === category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* CABECERA ESTUDIO LOLA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.85))',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🎭</span>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
              ESTUDIO DE AVATAR LOLA (PROMPTS FLOW, VEO & VÍDEOS)
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#cbd5e1' }}>
            Genera los Voice Prompts para Flow con la voz cálida de Lola, prompts cinemáticos para Google Veo 3.1 y sube los vídeos generados directamente.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCatalog}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar Catálogo</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div style={{
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '0.80rem',
          color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* GENERADOR PERSONALIZADO AL VUELO */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '14px',
        padding: '18px 22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sparkles size={18} color="#00f3ff" />
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#fff' }}>
            Generador Inteligente de Prompts para Lola
          </h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '0.74rem', color: '#94a3b8' }}>
          Escribe qué acción o situación quieres que resuelva Lola (ejemplo: <i>"Avisar de que la lavadora ha terminado"</i> o <i>"Poner luces violetas para escuchar música"</i>):
        </p>

        <form onSubmit={handleCustomGenerate} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            required
            placeholder="Escribe aquí la orden o situación de la casa..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            style={{
              flex: 1,
              minWidth: '260px',
              background: '#091024',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              color: '#fff',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, #00f3ff, #10b981)',
              border: 'none',
              color: '#020617',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={15} />
            <span>{generating ? 'Generando...' : 'Generar Prompts para Lola'}</span>
          </button>
        </form>

        {/* RESULTADO GENERADO */}
        {generatedResult && (
          <div style={{
            marginTop: '16px',
            background: 'rgba(2, 6, 23, 0.7)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#c084fc' }}>
                ✨ PROMPT GENERADO PARA: "{generatedResult.action}"
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveObsidian(generatedResult)}
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid #a855f7',
                    color: '#e9d5ff',
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
                  <FileText size={13} />
                  <span>Guardar en Obsidian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadModal({
                    trigger: generatedResult.trigger,
                    response: generatedResult.response,
                    veo_prompt: generatedResult.veo_prompt
                  })}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#a7f3d0',
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
                  <Upload size={13} />
                  <span>Subir Vídeo Generado</span>
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                🗣️ Respuesta que dirá Lola:
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#fff', fontWeight: 600 }}>
                "{generatedResult.response}"
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {/* BLOQUE FLOW */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#f59e0b' }}>
                    🎙️ Prompt de Voz para Flow (Voice Design):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedResult.flow_voice_prompt, 'flow_custom')}
                    style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem' }}
                  >
                    {copiedKey === 'flow_custom' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedKey === 'flow_custom' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={generatedResult.flow_voice_prompt}
                  style={{ width: '100%', background: '#091024', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', padding: '8px', fontSize: '0.70rem', resize: 'none' }}
                />
              </div>

              {/* BLOQUE VEO */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#00f3ff' }}>
                    🎥 Prompt de Vídeo (Google Veo 3.1):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedResult.veo_prompt, 'veo_custom')}
                    style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem' }}
                  >
                    {copiedKey === 'veo_custom' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedKey === 'veo_custom' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={generatedResult.veo_prompt}
                  style={{ width: '100%', background: '#091024', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', padding: '8px', fontSize: '0.70rem', resize: 'none' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CATÁLOGO DE FRASES MAESTRAS PARA HABANA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>
              📚 Catálogo de Frases para las Funciones de Habana
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Luces, estancias, ambientes, rutinas y seguridad ya mapeadas
            </span>
          </div>

          {/* FILTRO DE CATEGORÍAS */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  background: category === cat ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  border: category === cat ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: category === cat ? '#00f3ff' : '#94a3b8',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* LISTA DE TARJETAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
          {filteredCatalog.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: item.category === 'Iluminación' ? '#38bdf8' : item.category === 'Tiras LED' ? '#c084fc' : item.category === 'Seguridad' ? '#ef4444' : '#34d399',
                    background: 'rgba(2, 6, 23, 0.6)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Trigger: <b>"{item.trigger}"</b>
                  </span>
                </div>

                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                  {item.action}
                </h4>

                <div style={{
                  background: 'rgba(2, 6, 23, 0.6)',
                  borderLeft: '3px solid #00f3ff',
                  borderRadius: '0 8px 8px 0',
                  padding: '8px 12px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '0.64rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                    🗣️ Respuesta hablada de Lola:
                  </span>
                  <span style={{ fontSize: '0.80rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                    "{item.response}"
                  </span>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN PARA CADA TARJETA */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.flow_voice_prompt, `flow_${item.id}`)}
                  style={{
                    flex: 1,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fcd34d',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedKey === `flow_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedKey === `flow_${item.id}` ? '¡Copiado!' : 'Prompt Flow'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(item.veo_prompt, `veo_${item.id}`)}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 243, 255, 0.12)',
                    border: '1px solid rgba(0, 243, 255, 0.4)',
                    color: '#00f3ff',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedKey === `veo_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedKey === `veo_${item.id}` ? '¡Copiado!' : 'Prompt Veo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveObsidian(item)}
                  title="Guardar ficha en Obsidian"
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#d8b4fe',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => setUploadModal({
                    trigger: item.trigger,
                    response: item.response,
                    veo_prompt: item.veo_prompt
                  })}
                  title="Subir vídeo generado para esta frase"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL PARA SUBIR VÍDEO MP4 GENERADO */}
      {uploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#091024',
            border: '1px solid #10b981',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '22px',
            boxShadow: '0 0 35px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fff' }}>
                  Subir Vídeo Generado para Lola
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
              <span>Frase de activación vinculada:</span>
              <div style={{ fontWeight: 800, color: '#00f3ff', marginTop: '2px' }}>
                "{uploadModal.trigger}"
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                "{uploadModal.response}"
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                border: '2px dashed rgba(16, 185, 129, 0.4)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(2, 6, 23, 0.6)',
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  required
                  accept="video/mp4,video/webm"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  style={{ display: 'none' }}
                  id="lola-video-input"
                />
                <label htmlFor="lola-video-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload size={28} color="#10b981" />
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#fff' }}>
                    {uploadFile ? uploadFile.name : 'Haz clic para seleccionar el archivo .MP4'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Se alojará en media/videos/ y se sincronizará con el Avatar en tiempo real
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModal(null)}
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
                  disabled={uploading || !uploadFile}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {uploading ? 'Guardando en Servidor...' : 'Subir y Asignar a Lola'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

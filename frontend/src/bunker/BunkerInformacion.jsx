import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Newspaper, Video, Volume2, RefreshCw, 
  ExternalLink, CheckCircle2, AlertCircle, Sparkles, 
  FileText, Play, Square, Wind, Droplets, Thermometer
} from 'lucide-react';

export default function BunkerInformacion({ API_BASE = '', isEnabled = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastSpeech, setLastSpeech] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [feedback, setFeedback] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/bunker/information/overview`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.last_briefing?.speech_text) {
          setLastSpeech(json.last_briefing.speech_text);
        }
      }
    } catch (e) {
      console.error('Error cargando información de fuentes externas:', e);
      setFeedback({ type: 'error', text: 'Error al conectar con el agregador de información' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [API_BASE]);

  const handleGenerateBriefing = async () => {
    if (!isEnabled) {
      setFeedback({ type: 'error', text: 'El Búnker está aislado. Activa el interruptor para operar.' });
      return;
    }
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/information/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const b = json.briefing;
        setLastSpeech(b.speech_text);
        setFeedback({ 
          type: 'success', 
          text: `¡Briefing generado con éxito y guardado en Obsidian! (${b.obsidian_file.split('\\').pop()})` 
        });
        fetchOverview();
      } else {
        setFeedback({ type: 'error', text: 'Error generando el briefing matinal.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Fallo de red al generar el briefing.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSpeak = async () => {
    if (!isEnabled) {
      setFeedback({ type: 'error', text: 'El Búnker está aislado. Activa el interruptor para emitir audio.' });
      return;
    }
    setSpeaking(true);
    try {
      const res = await fetch(`${API_BASE}/api/bunker/information/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lastSpeech || null })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result?.audio_url) {
          setAudioUrl(`${API_BASE}${json.result.audio_url}`);
          // Reproducir en el navegador
          const snd = new Audio(`${API_BASE}${json.result.audio_url}`);
          snd.play().catch(err => console.log('Autoplay bloqueado por navegador:', err));
        }
        setFeedback({ 
          type: 'success', 
          text: '🔊 Locución enviada a altavoces y disponible en el reproductor web.' 
        });
      } else {
        setFeedback({ type: 'error', text: 'Error al emitir por TTS.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', text: 'Error conectando con el servicio de voz TTS.' });
    } finally {
      setSpeaking(false);
    }
  };

  const weather = data?.weather;
  const news = data?.news?.news || [];
  const youtube = data?.youtube;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* BARRA SUPERIOR DE ACCIÓN RÁPIDA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.7))',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '16px',
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📡</span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
              BÚNKER INFORMACIÓN EXTERNA & BRIEFING MATINAL
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
            Monitorización en vivo: Meteo Ourense, Prensa del día (La Voz de Galicia / El Mundo) y análisis de Marc Vidal.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
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
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateBriefing}
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, #00f3ff, #0284c7)',
              border: 'none',
              color: '#020617',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '0.76rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(0, 243, 255, 0.35)'
            }}
          >
            <Sparkles size={15} />
            <span>{generating ? 'Generando...' : 'Generar Briefing & Obsidian'}</span>
          </button>

          <button
            type="button"
            onClick={handleSpeak}
            disabled={speaking || (!lastSpeech && !data)}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '0.76rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Volume2 size={15} />
            <span>{speaking ? 'Sintetizando Voz...' : '🔊 Locutar por Altavoces'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div style={{
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.78rem',
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
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* REPRODUCTOR DE AUDIO ACTIVO SI EXISTE */}
      {audioUrl && (
        <div style={{
          background: 'rgba(2, 6, 23, 0.75)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#34d399' }}>
            🎙️ Audio Generado (Edge-TTS):
          </span>
          <audio controls src={audioUrl} autoPlay style={{ height: '32px', flex: 1, minWidth: '240px' }} />
        </div>
      )}

      {/* GUIÓN DE VOZ ACTUAL */}
      {lastSpeech && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px dashed rgba(0, 243, 255, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00f3ff', textTransform: 'uppercase', marginBottom: '6px' }}>
            🗣️ Guión de Locución Matinal (Texto preparado para altavoces):
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: '1.45' }}>
            "{lastSpeech}"
          </p>
        </div>
      )}

      {/* CUADRÍCULA DE FUENTES EXTERNAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* CARD 1: METEO OURENSE */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudSun size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>
                Meteo Real: Ourense
              </h3>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              Open-Meteo GPS
            </span>
          </div>

          {weather ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>
                  {weather.temperature}°C
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                  {weather.condition}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem', color: '#cbd5e1' }}>
                <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Thermometer size={14} color="#f59e0b" />
                  <span>Sensación: <b>{weather.apparent_temperature}°C</b></span>
                </div>
                <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplets size={14} color="#00f3ff" />
                  <span>Lluvia: <b>{weather.rain_probability}%</b></span>
                </div>
                <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wind size={14} color="#94a3b8" />
                  <span>Viento: <b>{weather.wind_speed} km/h</b></span>
                </div>
                <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>↕️ Mín/Máx: <b>{weather.temp_min}° / {weather.temp_max}°</b></span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Cargando datos del tiempo...</div>
          )}
        </div>

        {/* CARD 2: CANAL MARC VIDAL */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={20} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>
                Marc Vidal — Último Vídeo
              </h3>
            </div>
            {youtube?.published && (
              <span style={{ fontSize: '0.66rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                {youtube.published.slice(0, 10)}
              </span>
            )}
          </div>

          {youtube?.ok ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a 
                href={youtube.url} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  color: '#fff', 
                  fontSize: '0.82rem', 
                  fontWeight: 800, 
                  textDecoration: 'none', 
                  lineHeight: '1.35',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px'
                }}
              >
                <span>{youtube.title}</span>
                <ExternalLink size={13} style={{ flexShrink: 0, marginTop: '2px' }} color="#ef4444" />
              </a>

              <div style={{
                background: 'rgba(2, 6, 23, 0.6)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase' }}>
                  💡 Síntesis de Ideas Clave (Transcripción):
                </div>
                {youtube.key_points?.map((pt, i) => (
                  <div key={i} style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.35' }}>
                    • {pt}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Cargando último análisis de Marc Vidal...</div>
          )}
        </div>

        {/* CARD 3: PRENSA DEL DÍA */}
        <div style={{
          gridColumn: '1 / -1',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>
                Prensa del Día (La Voz de Galicia Ourense & Portada Nacional)
              </h3>
            </div>
            <span style={{ fontSize: '0.66rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
              RSS Directo
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {news.map((n, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                      {n.source}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                      {n.published ? n.published.slice(0, 16) : ''}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#fff', lineHeight: '1.3' }}>
                    {n.title}
                  </h4>
                  {n.summary && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.70rem', color: '#94a3b8', lineHeight: '1.35' }}>
                      {n.summary}
                    </p>
                  )}
                </div>

                {n.link && (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.68rem',
                      color: '#00f3ff',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700
                    }}
                  >
                    <span>Leer Noticia</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* OBSIDIAN NOTE BANNER */}
      <div style={{
        background: 'rgba(2, 6, 23, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={18} color="#a855f7" />
          <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
            Bóveda Obsidian: Los informes se guardan automáticamente en <code>vault/Informacion/YYYY-MM-DD_Briefing_Matinal.md</code>
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(168, 85, 247, 0.15)', padding: '3px 10px', borderRadius: '6px' }}>
          Enlazado con Diario & Etiquetas
        </span>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { User, Box, Camera, Radio, Eye, Tv, Mic, MicOff, Sparkles, MessageSquare, MessageSquareOff, ShieldAlert, Cast } from 'lucide-react';

export default function TabletSidebar({
  activeTab = 'principal',
  principalView = 'avatar',
  screensaverTimeout = 'never',
  onToggleScreensaverTimeout,
  onNavigateToAvatar,
  onOpenDigitalTwin,
  onOpenCameras,
  onOpenRadio,
  onOpenVisual
}) {
  const [audioOutput, setAudioOutput] = useState(() => {
    return localStorage.getItem('habana_audio_output') || 'local';
  });

  const [whatsappMuted, setWhatsappMuted] = useState(() => {
    return localStorage.getItem('habana_whatsapp_muted') === 'true';
  });

  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    const saved = localStorage.getItem('habana_wake_word_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [wakeArmed, setWakeArmed] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastTouchHandledRef = useRef(0);

  // Sincronizar estado inicial de WhatsApp desde /api/status
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        if (d && d.state) {
          if (typeof d.state.whatsapp_muted === 'boolean') {
            setWhatsappMuted(d.state.whatsapp_muted);
            localStorage.setItem('habana_whatsapp_muted', d.state.whatsapp_muted);
          }
          if (d.state.audio_output) {
            setAudioOutput(d.state.audio_output);
            localStorage.setItem('habana_audio_output', d.state.audio_output);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Escuchar estado reactivo de la palabra clave emitido por AvatarPanel
  useEffect(() => {
    const handleWakeState = (e) => {
      if (e && e.detail) {
        if (typeof e.detail.enabled === 'boolean') {
          setWakeWordEnabled(e.detail.enabled);
        }
        if (typeof e.detail.armed === 'boolean') {
          setWakeArmed(e.detail.armed);
        }
      }
    };
    window.addEventListener('habana-wake-state', handleWakeState);
    return () => window.removeEventListener('habana-wake-state', handleWakeState);
  }, []);

  // Sincronizar cambios de salida de audio emitidos globalmente
  useEffect(() => {
    const handleAudioChange = (e) => {
      if (e && e.detail) {
        setAudioOutput(e.detail);
        localStorage.setItem('habana_audio_output', e.detail);
      }
    };
    window.addEventListener('habana-audio-output-change', handleAudioChange);
    return () => window.removeEventListener('habana-audio-output-change', handleAudioChange);
  }, []);

  const toggleAudioOutput = async () => {
    const nextVal = audioOutput === 'google_cast' ? 'local' : 'google_cast';
    setAudioOutput(nextVal);
    localStorage.setItem('habana_audio_output', nextVal);
    window.dispatchEvent(new CustomEvent('habana-audio-output-change', { detail: nextVal }));
    try {
      await fetch('/api/state/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_output: nextVal })
      });
      if (nextVal === 'google_cast') {
        fetch('/api/cast/speakers/bulk-toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Error al alternar salida de audio:', e);
    }
  };

  const toggleWhatsappMuted = async () => {
    const nextVal = !whatsappMuted;
    setWhatsappMuted(nextVal);
    localStorage.setItem('habana_whatsapp_muted', nextVal);
    try {
      await fetch('/api/state/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_muted: nextVal })
      });
    } catch (e) {
      console.error('Error al alternar silencio de WhatsApp:', e);
    }
  };

  const toggleWakeWordMode = () => {
    const nextVal = !wakeWordEnabled;
    setWakeWordEnabled(nextVal);
    localStorage.setItem('habana_wake_word_enabled', String(nextVal));
    window.dispatchEvent(new CustomEvent('habana-wake-word-toggle', { detail: nextVal }));
  };

  const startListeningManual = async () => {
    if (isListening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 800) {
          const fd = new FormData();
          fd.append('file', blob, 'voice.webm');
          try {
            await fetch('/api/chat/audio', { method: 'POST', body: fd });
          } catch (_e) {}
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(250);
      setIsListening(true);
    } catch (err) {
      console.warn('Mic no disponible:', err);
    }
  };

  const stopListeningManual = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_e) {}
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListeningManual();
    else startListeningManual();
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    lastTouchHandledRef.current = Date.now();
    startListeningManual();
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    lastTouchHandledRef.current = Date.now();
    stopListeningManual();
  };

  return (
    <aside style={{
      width: '158px',
      minWidth: '158px',
      maxWidth: '158px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'rgba(7, 13, 31, 0.96)',
      borderRight: '1px solid rgba(0, 243, 255, 0.28)',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.75), inset -1px 0 16px rgba(0, 243, 255, 0.05)',
      padding: '10px 8px',
      boxSizing: 'border-box',
      gap: '8px',
      flexShrink: 0,
      zIndex: 40,
      userSelect: 'none'
    }}>
      {/* BLOQUE SUPERIOR: BOTONES DE NAVEGACIÓN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 850,
          color: '#38bdf8',
          letterSpacing: '1px',
          textAlign: 'center',
          marginBottom: '4px',
          textTransform: 'uppercase'
        }}>
          Navegación
        </div>

        {/* 1. LOLA / PRINCIPAL */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateToAvatar) onNavigateToAvatar();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: activeTab === 'principal' && principalView === 'avatar'
              ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(6, 182, 212, 0.2))'
              : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeTab === 'principal' && principalView === 'avatar' ? '#00f3ff' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeTab === 'principal' && principalView === 'avatar' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: activeTab === 'principal' && principalView === 'avatar' ? '0 0 14px rgba(0,243,255,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Vista Principal Lola"
        >
          <User size={18} color={activeTab === 'principal' && principalView === 'avatar' ? '#00f3ff' : '#94a3b8'} />
          <span style={{ whiteSpace: 'nowrap' }}>Lola</span>
        </button>

        {/* 2. GEMELO 3D */}
        <button
          type="button"
          onClick={() => {
            if (onOpenDigitalTwin) onOpenDigitalTwin();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: activeTab === 'principal' && principalView === 'digital_twin'
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(126, 34, 206, 0.2))'
              : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeTab === 'principal' && principalView === 'digital_twin' ? '#c084fc' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeTab === 'principal' && principalView === 'digital_twin' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: activeTab === 'principal' && principalView === 'digital_twin' ? '0 0 14px rgba(168,85,247,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Gemelo Digital 3D"
        >
          <Box size={18} color="#c084fc" />
          <span style={{ whiteSpace: 'nowrap' }}>Gemelo 3D</span>
        </button>

        {/* 3. CÁMARAS */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCameras) onOpenCameras();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: activeTab === 'cameras'
              ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.3), rgba(16, 185, 129, 0.2))'
              : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeTab === 'cameras' ? '#34d399' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeTab === 'cameras' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: activeTab === 'cameras' ? '0 0 14px rgba(52,211,153,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Cámaras de Seguridad"
        >
          <Camera size={18} color="#34d399" />
          <span style={{ whiteSpace: 'nowrap' }}>Cámaras</span>
        </button>

        {/* 4. AUDIO */}
        <button
          type="button"
          onClick={() => {
            if (onOpenRadio) onOpenRadio();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: activeTab === 'principal' && principalView === 'radio'
              ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(234, 88, 12, 0.2))'
              : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeTab === 'principal' && principalView === 'radio' ? '#fb923c' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeTab === 'principal' && principalView === 'radio' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: activeTab === 'principal' && principalView === 'radio' ? '0 0 14px rgba(251,146,60,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Radio & Audio Multiroom"
        >
          <Radio size={18} color="#fb923c" />
          <span style={{ whiteSpace: 'nowrap' }}>Audio</span>
        </button>

                {/* BOTON MANDO TV UNIVERSAL */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('habana-open-tv-modal'));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(29, 78, 216, 0.2))',
            border: '1px solid #3b82f6',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: '0 0 14px rgba(59,130,246,0.35)',
            transition: 'all 0.2s'
          }}
          title="Mando a Distancia y TV Canales"
        >
          <Tv size={18} color="#60a5fa" />
          <span style={{ whiteSpace: 'nowrap' }}>Mando TV</span>
        </button>

        {/* 5. VISUAL */}
        <button
          type="button"
          onClick={() => {
            if (onOpenVisual) onOpenVisual();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: activeTab === 'visual'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.2))'
              : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeTab === 'visual' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeTab === 'visual' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: activeTab === 'visual' ? '0 0 14px rgba(56,189,248,0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Centro de Control Visual"
        >
          <Eye size={18} color="#38bdf8" />
          <span style={{ whiteSpace: 'nowrap' }}>Visual</span>
        </button>

        {/* 6. BÚNKER IA */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('habana-navigate', { detail: { tab: 'bunker' } }));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 10px',
            borderRadius: '11px',
            background: 'rgba(0, 243, 255, 0.1)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            color: '#00f3ff',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 14px rgba(0,243,255,0.25)',
            transition: 'all 0.2s'
          }}
          title="Búnker IA (Sandbox)"
        >
          <ShieldAlert size={18} color="#00f3ff" />
          <span style={{ whiteSpace: 'nowrap' }}>Búnker</span>
        </button>
      </div>

      {/* SEPARADOR VISUAL NEÓN */}
      <div style={{
        height: '1px',
        width: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.6), transparent)',
        margin: '3px 0'
      }} />

      {/* BLOQUE INFERIOR: ASISTENTE & VOZ (DICTAR, VOZ CUBA, APAGAR WHATSAPP) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 850,
          color: '#a855f7',
          letterSpacing: '1px',
          textAlign: 'center',
          marginBottom: '4px',
          textTransform: 'uppercase'
        }}>
          Voz & Avisos
        </div>

        {/* BOTÓN DICTAR */}
        <button
          type="button"
          onMouseDown={startListeningManual}
          onMouseUp={stopListeningManual}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={toggleListening}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '11px 8px',
            borderRadius: '11px',
            background: isListening
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.8))'
              : 'rgba(0, 243, 255, 0.14)',
            border: `1px solid ${isListening ? '#ef4444' : '#00f3ff'}`,
            color: isListening ? '#ffffff' : '#00f3ff',
            fontSize: '0.80rem',
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow: isListening ? '0 0 18px rgba(239,68,68,0.7)' : '0 0 12px rgba(0,243,255,0.25)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            transition: 'all 0.15s ease'
          }}
          title="Mantén presionado para hablar o pulsa para activar/desactivar"
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          <span style={{ whiteSpace: 'nowrap' }}>{isListening ? 'HABLANDO' : 'DICTAR'}</span>
        </button>

        {/* BOTÓN VOZ CUBA */}
        <button
          type="button"
          onClick={toggleWakeWordMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '10px 6px',
            borderRadius: '11px',
            background: wakeWordEnabled
              ? (wakeArmed
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.8))'
                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(126, 34, 206, 0.5))')
              : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${wakeWordEnabled ? (wakeArmed ? '#10b981' : '#c084fc') : 'rgba(148, 163, 184, 0.3)'}`,
            color: wakeWordEnabled ? '#ffffff' : '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: wakeWordEnabled
              ? (wakeArmed ? '0 0 16px rgba(16, 185, 129, 0.7)' : '0 0 12px rgba(168, 85, 247, 0.4)')
              : 'none',
            transition: 'all 0.2s ease'
          }}
          title='Escucha continua: Di "Cuba" seguido de tu orden'
        >
          <Sparkles size={16} color={wakeWordEnabled ? (wakeArmed ? '#34d399' : '#e879f9') : '#94a3b8'} />
          <span style={{ whiteSpace: 'nowrap' }}>
            {wakeWordEnabled ? (wakeArmed ? 'CUBA: ON' : 'VOZ: ON') : 'VOZ: OFF'}
          </span>
        </button>

        {/* BOTÓN RESPUESTAS POR TODOS LOS ALTAVOCES */}
        <button
          type="button"
          onClick={toggleAudioOutput}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '10px 6px',
            borderRadius: '11px',
            background: audioOutput === 'google_cast'
              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(14, 116, 144, 0.6))'
              : 'rgba(148, 163, 184, 0.1)',
            border: `1.5px solid ${audioOutput === 'google_cast' ? '#06b6d4' : 'rgba(148, 163, 184, 0.3)'}`,
            color: audioOutput === 'google_cast' ? '#22d3ee' : '#94a3b8',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: audioOutput === 'google_cast' ? '0 0 16px rgba(6, 182, 212, 0.55)' : 'none',
            transition: 'all 0.2s ease'
          }}
          title={audioOutput === 'google_cast' ? 'Respuestas de la IA activas en todos los altavoces de la casa' : 'Respuestas solo en este dispositivo (clic para activar todos los altavoces)'}
        >
          <Cast size={16} color={audioOutput === 'google_cast' ? '#22d3ee' : '#94a3b8'} />
          <span style={{ whiteSpace: 'nowrap' }}>
            {audioOutput === 'google_cast' ? 'ALTAVOCES: ON' : 'ALTAVOCES: OFF'}
          </span>
        </button>

        {/* BOTÓN PANTALLA SIEMPRE ENCENDIDA / MODO REPOSO */}
        {onToggleScreensaverTimeout && (
          <button
            type="button"
            onClick={onToggleScreensaverTimeout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 6px',
              borderRadius: '11px',
              background: screensaverTimeout === 'never'
                ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.28), rgba(202, 138, 4, 0.4))'
                : 'rgba(148, 163, 184, 0.1)',
              border: `1.5px solid ${screensaverTimeout === 'never' ? '#eab308' : 'rgba(148, 163, 184, 0.3)'}`,
              color: screensaverTimeout === 'never' ? '#fef08a' : '#94a3b8',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: screensaverTimeout === 'never' ? '0 0 14px rgba(234, 179, 8, 0.45)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title={screensaverTimeout === 'never' ? 'Pantalla siempre encendida (Anti-Pantalla Negra ACTIVO)' : 'Modo reposo automático activo (5 min)'}
          >
            <span>{screensaverTimeout === 'never' ? '☀️' : '🌙'}</span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {screensaverTimeout === 'never' ? 'PANTALLA: ON' : 'REPOSO: 5m'}
            </span>
          </button>
        )}

        {/* BOTÓN APAGAR WHATSAPP */}
        <button
          type="button"
          onClick={toggleWhatsappMuted}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '10px 6px',
            borderRadius: '11px',
            background: whatsappMuted
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.5))'
              : 'rgba(34, 197, 94, 0.12)',
            border: `1px solid ${whatsappMuted ? '#ef4444' : 'rgba(34, 197, 94, 0.5)'}`,
            color: whatsappMuted ? '#fca5a5' : '#4ade80',
            fontSize: '0.74rem',
            fontWeight: 750,
            cursor: 'pointer',
            boxShadow: whatsappMuted ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
            transition: 'all 0.2s ease'
          }}
          title={whatsappMuted ? 'WhatsApp silenciado en altavoces' : 'WhatsApp activo en altavoces'}
        >
          {whatsappMuted ? <MessageSquareOff size={16} color="#fca5a5" /> : <MessageSquare size={16} color="#4ade80" />}
          <span style={{ whiteSpace: 'nowrap' }}>
            {whatsappMuted ? 'WA MUDO' : 'WA ACTIVO'}
          </span>
        </button>
      </div>
    </aside>
  );
}

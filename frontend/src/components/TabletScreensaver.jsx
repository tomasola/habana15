import React, { useState, useEffect, useRef } from 'react';
import DynamicAvatar3D from './DynamicAvatar3D';
import { 
  Lightbulb, Power, ArrowUp, ArrowDown, Square, Play, 
  Radio, Mic, MicOff, LogOut, Tv, Utensils, 
  Compass, Bath, Bed, Sparkles, SkipForward, Volume2, X, Check, VolumeX
} from 'lucide-react';

const IDLE_VIDEO_URL = '/media/videos/inicio.mp4';

const DEFAULT_STATIONS = [
  { id: 'los40', name: 'Los 40', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3' },
  { id: 'cadena_dial', name: 'Cadena Dial', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL.mp3' },
  { id: 'los40_classic', name: 'Los 40 Classic', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3' },
  { id: 'cadena_ser', name: 'Cadena SER', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CADENASER.mp3' },
  { id: 'virgin_radio', name: 'Virgin Radio', url: 'https://virginradio.leanstream.co/VIRGINRADIO' },
  { id: 'kiss_fm', name: 'Kiss FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KISSFM.mp3' }
];

export default function TabletScreensaver({
  onDismiss,
  onDisableScreensaver,
  devices = [],
  activeDevices = [],
  onToggleDevice,
  isBatterySaving = false,
  batteryLevel = null,
  playingStationId = null,
  setPlayingStationId = () => {},
  radioStations = []
}) {
  const [now, setNow] = useState(new Date());
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isMobileLayout = windowSize.width < 768 || windowSize.height > windowSize.width;
  const lolaVideoRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Selector de Avatar y Reloj
  const [avatarMode, setAvatarMode] = useState(() => {
    return localStorage.getItem('habana_screensaver_avatar') || 'lola'; // 'lola' | '3d'
  });

  const [clockMode, setClockMode] = useState(() => {
    return localStorage.getItem('habana_screensaver_clock') || 'digital'; // 'digital' | 'analog'
  });

  // Control de Activación por Palabra Clave "Cuba" (Por defecto OFF para evitar pitidos continuos de Android)
  const [cubaWakeEnabled, setCubaWakeEnabled] = useState(() => {
    const saved = localStorage.getItem('habana_screensaver_cuba_wake');
    return saved === 'true'; // Por defecto false
  });

  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [isWakeArmed, setIsWakeArmed] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [lolaReply, setLolaReply] = useState('');
  const [lolaResponseVideoUrl, setLolaResponseVideoUrl] = useState(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const activeSpeechRecRef = useRef(null);
  const voiceDebounceTimerRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Lista de emisoras y control Multi-Room
  const stationsList = (radioStations && radioStations.length > 0) ? radioStations : DEFAULT_STATIONS;
  const [currentStationIdx, setCurrentStationIdx] = useState(0);
  const activeStation = stationsList[currentStationIdx] || stationsList[0];
  const [isRadioActive, setIsRadioActive] = useState(Boolean(playingStationId));

  // Actualizar hora cada 1s (o 10s en modo batería)
  useEffect(() => {
    isComponentMounted.current = true;
    const intervalMs = isBatterySaving ? 10000 : 1000;
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => {
      isComponentMounted.current = false;
      clearInterval(timer);
      if (activeSpeechRecRef.current) {
        try { activeSpeechRecRef.current.abort(); } catch (_e) {}
      }
      if (voiceDebounceTimerRef.current) {
        clearTimeout(voiceDebounceTimerRef.current);
      }
    };
  }, [isBatterySaving]);

  // Asegurar que el vídeo de Lola esté siempre reproduciéndose
  useEffect(() => {
    if (lolaVideoRef.current && avatarMode === 'lola' && !lolaResponseVideoUrl) {
      try {
        lolaVideoRef.current.play().catch(() => {});
      } catch (_e) {}
    }
  }, [avatarMode, lolaResponseVideoUrl]);

  // Sincronizar estado de radio externa
  useEffect(() => {
    if (playingStationId) {
      setIsRadioActive(true);
      const idx = stationsList.findIndex(s => s.id === playingStationId);
      if (idx !== -1) setCurrentStationIdx(idx);
    } else {
      setIsRadioActive(false);
    }
  }, [playingStationId, stationsList]);

  // =========================================================================
  // MOTOR DE VOZ: PUSH-TO-TALK DIRECTO + MODO CUBA SIN BUCLES DE PITIDOS
  // =========================================================================
  const stopVoiceRecognition = () => {
    if (activeSpeechRecRef.current) {
      try { activeSpeechRecRef.current.abort(); } catch (_e) {}
      activeSpeechRecRef.current = null;
    }
    setIsListeningVoice(false);
    setIsWakeArmed(false);
  };

  const startManualVoice = (e) => {
    if (e) e.stopPropagation();

    // Si ya está escuchando, cancelar
    if (isListeningVoice) {
      stopVoiceRecognition();
      setLolaReply('Dictado cancelado');
      setTimeout(() => setLolaReply(''), 2000);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLolaReply('Voz no disponible en este navegador');
      setTimeout(() => setLolaReply(''), 3000);
      return;
    }

    try {
      stopVoiceRecognition();

      const rec = new SpeechRecognition();
      rec.continuous = false; // Escucha una orden única y se detiene automáticamente (cero bucles de pitido)
      rec.interimResults = true;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        if (!isComponentMounted.current) return;
        setIsListeningVoice(true);
        setIsWakeArmed(true);
        setVoiceTranscript('Te escucho... Di tu orden ahora');
      };

      rec.onresult = (event) => {
        if (!isComponentMounted.current) return;
        const lastIdx = event.results.length - 1;
        const text = event.results[lastIdx][0].transcript.trim();
        const isFinal = event.results[lastIdx].isFinal;

        setVoiceTranscript(text);

        if (voiceDebounceTimerRef.current) {
          clearTimeout(voiceDebounceTimerRef.current);
        }

        if (isFinal && text.length >= 3) {
          // Esperar 600ms de estabilidad para evitar cortes de audio incompletos
          voiceDebounceTimerRef.current = setTimeout(() => {
            handleExecuteVoice(text);
          }, 600);
        }
      };

      rec.onerror = (_err) => {
        setIsListeningVoice(false);
        setIsWakeArmed(false);
      };

      rec.onend = () => {
        setIsListeningVoice(false);
        setIsWakeArmed(false);
      };

      activeSpeechRecRef.current = rec;
      rec.start();
    } catch (_err) {
      setIsListeningVoice(false);
      setIsWakeArmed(false);
    }
  };

  const toggleCubaWake = (e) => {
    if (e) e.stopPropagation();
    const nextVal = !cubaWakeEnabled;
    setCubaWakeEnabled(nextVal);
    localStorage.setItem('habana_screensaver_cuba_wake', String(nextVal));

    if (!nextVal) {
      stopVoiceRecognition();
      setVoiceTranscript('');
      setLolaReply('Palabra clave "Cuba" desactivada');
      setTimeout(() => setLolaReply(''), 2500);
    } else {
      setLolaReply('Palabra clave "Cuba" armada (Pulsa Hablar para dictar)');
      setTimeout(() => setLolaReply(''), 3000);
    }
  };

  const handleExecuteVoice = async (commandText) => {
    stopVoiceRecognition();

    // Limpiar palabra "cuba" si fue pronunciada
    const cleanCmd = commandText.replace(/\b(?:hola\s+cuba|oye\s+cuba|cuba)\b/gi, '').trim() || commandText;

    // Filtro de seguridad: ignorar palabras sueltas incompletas como "enciende la"
    const words = cleanCmd.split(/\s+/).filter(Boolean);
    if (words.length <= 1 && ['enciende', 'apaga', 'abre', 'cierra', 'pon', 'quita'].includes(words[0]?.toLowerCase())) {
      setVoiceTranscript(cleanCmd);
      setLolaReply('¿Qué dispositivo o luz deseas controlar?');
      setTimeout(() => setLolaReply(''), 3500);
      return;
    }

    setIsProcessingVoice(true);
    setLolaReply(`Procesando: "${cleanCmd}"...`);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanCmd, source: 'screensaver' })
      });

      if (res.ok) {
        const data = await res.json();
        const replyMsg = data.reply || data.response || 'Hecho.';
        setLolaReply(replyMsg);

        if (data.video_url) {
          setLolaResponseVideoUrl(data.video_url);
        } else if (data.audio_url && audioPlayerRef.current) {
          audioPlayerRef.current.src = data.audio_url;
          audioPlayerRef.current.play().catch(() => {});
        }
      } else {
        setLolaReply('No pude procesar la orden');
      }
    } catch (_e) {
      setLolaReply('Error de conexión con Habana');
    } finally {
      setIsProcessingVoice(false);
      setTimeout(() => {
        if (!isWakeArmed) {
          setVoiceTranscript('');
        }
      }, 5000);
    }
  };

  const handleResponseVideoEnded = () => {
    setLolaResponseVideoUrl(null);
    setLolaReply('');
    if (lolaVideoRef.current) {
      lolaVideoRef.current.currentTime = 0;
      lolaVideoRef.current.play().catch(() => {});
    }
  };

  // =========================================================================
  // CONTROL DE LUCES POR ESTANCIAS
  // =========================================================================
  const ROOMS = [
    { id: 'salon', name: 'Salón', icon: Tv, color: '#facc15' },
    { id: 'cocina', name: 'Cocina', icon: Utensils, color: '#4ade80' },
    { id: 'pasillo', name: 'Pasillo', icon: Compass, color: '#00f3ff' },
    { id: 'andrea', name: 'Andrea', icon: Sparkles, color: '#f472b6' },
    { id: 'principal', name: 'Principal', icon: Bed, color: '#c084fc' },
    { id: 'bano', name: 'Baño', icon: Bath, color: '#38bdf8' }
  ];

  const isRoomLightOn = (roomId) => {
    return activeDevices.some(d => {
      const isMatch = d.room === roomId || d.id.includes(roomId) || (d.entity_id && d.entity_id.includes(roomId));
      return isMatch && (d.state === 'on' || d.state === true);
    });
  };

  const activeLightsCount = ROOMS.filter(r => isRoomLightOn(r.id)).length;

  const handleToggleRoom = async (roomId, e) => {
    if (e) e.stopPropagation();
    const currentlyOn = isRoomLightOn(roomId);
    const action = currentlyOn ? 'apaga' : 'enciende';

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${action} las luces de ${roomId}`, source: 'screensaver' })
      });
    } catch (_e) {}
  };

  const handleTurnAllOff = async (e) => {
    if (e) e.stopPropagation();
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'apaga todas las luces', source: 'screensaver' })
      });
    } catch (_e) {}
  };

  // =========================================================================
  // CONTROL DIRECTO DE PERSIANAS (SUBIR / PARAR / BAJAR)
  // =========================================================================
  const BLINDS = [
    { id: 'cover.persiana_salon', name: 'Salón Ventana' },
    { id: 'cover.persiana_salon_puerta', name: 'Salón Puerta' },
    { id: 'cover.persiana_andrea', name: 'Habitación Andrea' },
    { id: 'cover.persiana_principal', name: 'Dormitorio Principal' }
  ];

  const handleBlindDirect = async (entityId, action, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch('/api/devices/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId, action: action })
      });
    } catch (err) {
      console.error('Error control persiana:', err);
    }
  };

  // =========================================================================
  // CONTROL DE RADIO MULTI-ROOM
  // =========================================================================
  const handleToggleRadio = async (e) => {
    if (e) e.stopPropagation();
    if (isRadioActive) {
      try {
        await fetch('/api/radio/stop', { method: 'POST' });
        setIsRadioActive(false);
        setPlayingStationId(null);
      } catch (_e) {}
    } else {
      try {
        await fetch(`/api/radio/play/${activeStation.id}`, { method: 'POST' });
        setIsRadioActive(true);
        setPlayingStationId(activeStation.id);
      } catch (_e) {}
    }
  };

  const handleNextStation = async (e) => {
    if (e) e.stopPropagation();
    const nextIdx = (currentStationIdx + 1) % stationsList.length;
    setCurrentStationIdx(nextIdx);
    const nextStation = stationsList[nextIdx];
    if (isRadioActive) {
      try {
        await fetch(`/api/radio/play/${nextStation.id}`, { method: 'POST' });
        setPlayingStationId(nextStation.id);
      } catch (_e) {}
    }
  };

  // Formato del reloj
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(hours)}:${pad(minutes)}`;
  const secStr = pad(seconds);
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = ((hours % 12) * 30) + (minutes * 0.5);

  return (
    <div
      className="screensaver-scroll-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'radial-gradient(circle at 30% 50%, rgba(8, 26, 52, 0.98) 0%, rgba(2, 6, 18, 0.99) 100%)',
        display: 'flex',
        flexDirection: isMobileLayout ? 'column' : 'row',
        alignItems: isMobileLayout ? 'stretch' : 'center',
        justifyContent: isMobileLayout ? 'flex-start' : 'center',
        padding: isMobileLayout ? '52px 12px 30px 12px' : '16px 24px',
        color: '#fff',
        userSelect: 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      <style>{`
        .screensaver-scroll-container::-webkit-scrollbar {
          width: 6px;
        }
        .screensaver-scroll-container::-webkit-scrollbar-track {
          background: rgba(2, 6, 18, 0.85);
        }
        .screensaver-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(0, 243, 255, 0.45);
          border-radius: 4px;
        }
        .screensaver-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #00f3ff;
        }
      `}</style>
      {/* Audio fallback para TTS de respuesta */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />

      {/* =========================================================================
          BARRA SUPERIOR FLOTANTE: CONTROLES DE PANTALLA Y MODO AVATAR / RELOJ
      ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: isMobileLayout ? 'fixed' : 'absolute',
          top: isMobileLayout ? '0px' : '12px',
          left: isMobileLayout ? '0px' : 'auto',
          right: isMobileLayout ? '0px' : '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobileLayout ? 'space-between' : 'flex-end',
          gap: isMobileLayout ? '6px' : '12px',
          zIndex: 100,
          background: 'rgba(5, 12, 28, 0.92)',
          padding: isMobileLayout ? '8px 12px' : '6px 14px',
          borderRadius: isMobileLayout ? '0px' : '30px',
          borderBottom: isMobileLayout ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(0, 243, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          overflowX: isMobileLayout ? 'auto' : 'visible'
        }}
      >
        {/* Estado Batería */}
        {batteryLevel !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isBatterySaving ? '#f59e0b' : '#10b981' }} />
            <span>{isBatterySaving ? '⚡ BATERÍA' : '🔌 CARGANDO'} {batteryLevel}%</span>
          </div>
        )}

        {/* Desactivar protector */}
        <button
          type="button"
          onClick={onDisableScreensaver}
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#facc15',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#facc15' }} />
          <span>Mantener Siempre Encendida</span>
        </button>

        {/* Selector de Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', paddingLeft: '6px' }}>VISTA:</span>
          <button
            type="button"
            onClick={() => {
              setAvatarMode('lola');
              localStorage.setItem('habana_screensaver_avatar', 'lola');
            }}
            style={{
              background: avatarMode === 'lola' ? '#0891b2' : 'transparent',
              color: avatarMode === 'lola' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Lola
          </button>
          <button
            type="button"
            onClick={() => {
              setAvatarMode('3d');
              localStorage.setItem('habana_screensaver_avatar', '3d');
            }}
            style={{
              background: avatarMode === '3d' ? '#0891b2' : 'transparent',
              color: avatarMode === '3d' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            3D
          </button>
        </div>

        {/* Selector de Reloj */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', paddingLeft: '6px' }}>RELOJ:</span>
          <button
            type="button"
            onClick={() => {
              setClockMode('digital');
              localStorage.setItem('habana_screensaver_clock', 'digital');
            }}
            style={{
              background: clockMode === 'digital' ? '#0891b2' : 'transparent',
              color: clockMode === 'digital' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Digital
          </button>
          <button
            type="button"
            onClick={() => {
              setClockMode('analog');
              localStorage.setItem('habana_screensaver_clock', 'analog');
            }}
            style={{
              background: clockMode === 'analog' ? '#0891b2' : 'transparent',
              color: clockMode === 'analog' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Analógico
          </button>
        </div>
      </div>

      {/* =========================================================================
          MITAD IZQUIERDA: AVATAR DE LOLA (TOCA AL AVATAR PARA SALIR)
      ========================================================================= */}
      <div
        onClick={onDismiss}
        style={{
          flex: isMobileLayout ? 'none' : 1,
          width: isMobileLayout ? '100%' : 'auto',
          height: isMobileLayout ? '220px' : '92%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0
        }}
        title="Toca al Avatar para salir al modo normal"
      >
        {avatarMode === 'lola' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '480px',
              borderRadius: '24px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0, 243, 255, 0.25), inset 0 0 20px rgba(0, 243, 255, 0.1)',
              border: `2px solid ${isListeningVoice ? '#ef4444' : (isProcessingVoice ? '#00f3ff' : 'rgba(0, 243, 255, 0.4)')}`,
              transition: 'border-color 0.3s ease'
            }}
          >
            {/* Vídeo de Reposo */}
            <video
              ref={lolaVideoRef}
              src={IDLE_VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: lolaResponseVideoUrl ? 'none' : 'block'
              }}
            />

            {/* Vídeo de Respuesta Hablada de Lola */}
            {lolaResponseVideoUrl && (
              <video
                src={lolaResponseVideoUrl}
                autoPlay
                playsInline
                onEnded={handleResponseVideoEnded}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}

            {/* Marco Táctico */}
            <div style={{ position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderTop: '3px solid #00f3ff', borderLeft: '3px solid #00f3ff', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderTop: '3px solid #00f3ff', borderRight: '3px solid #00f3ff', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 12, width: 22, height: 22, borderBottom: '3px solid #00f3ff', borderLeft: '3px solid #00f3ff', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 22, height: 22, borderBottom: '3px solid #00f3ff', borderRight: '3px solid #00f3ff', pointerEvents: 'none' }} />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '480px',
              borderRadius: '24px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0, 243, 255, 0.25)',
              border: '2px solid rgba(0, 243, 255, 0.4)'
            }}
          >
            <DynamicAvatar3D
              isListening={isListeningVoice}
              isSpeaking={Boolean(lolaResponseVideoUrl)}
              isMaximized={false}
              screensaverMode
              lowPower={isBatterySaving}
            />
          </div>
        )}

        {/* Badge Estado Avatar */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(5, 12, 24, 0.9)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: `1px solid ${isListeningVoice ? '#ef4444' : (isProcessingVoice ? '#00f3ff' : 'rgba(0, 243, 255, 0.3)')}`,
            zIndex: 6
          }}
        >
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: isListeningVoice ? '#ef4444' : (isProcessingVoice ? '#00f3ff' : '#10b981'), 
            boxShadow: isListeningVoice ? '0 0 12px #ef4444' : (isProcessingVoice ? '0 0 10px #00f3ff' : 'none') 
          }} />
          <span style={{ fontSize: '0.72rem', color: isListeningVoice ? '#f87171' : '#cbd5e1', fontWeight: 800, letterSpacing: '0.8px' }}>
            {lolaResponseVideoUrl ? 'LOLA • RESPONDIENDO' : (isListeningVoice ? 'LOLA • ESCUCHANDO...' : (isProcessingVoice ? 'LOLA • PROCESANDO...' : 'LOLA EN REPOSO'))}
          </span>
        </div>
      </div>

      {/* =========================================================================
          MITAD DERECHA: RELOJ COMPACTO + TACTICAL CYBER-BENTO EXPANDIDO
      ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: isMobileLayout ? 'none' : 1.35,
          width: isMobileLayout ? '100%' : 'auto',
          height: isMobileLayout ? 'auto' : '92%',
          marginTop: isMobileLayout ? '14px' : '28px',
          marginLeft: isMobileLayout ? '0px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isMobileLayout ? 'flex-start' : 'space-between',
          position: 'relative',
          cursor: 'default',
          gap: isMobileLayout ? '10px' : '0px'
        }}
      >
        {/* ==================== 1. RELOJ COMPACTO SUPERIOR ==================== */}
        <div
          style={{
            background: 'rgba(8, 17, 34, 0.78)',
            border: '1px solid rgba(0, 243, 255, 0.28)',
            borderRadius: '16px',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
            marginBottom: '8px'
          }}
        >
          {clockMode === 'digital' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span
                  style={{
                    fontSize: 'clamp(2.2rem, 4.0vw, 3.2rem)',
                    fontWeight: 900,
                    fontFamily: "'Orbitron', 'Rajdhani', monospace",
                    color: '#ffffff',
                    letterSpacing: '2px',
                    textShadow: '0 0 20px rgba(0, 243, 255, 0.65)',
                    lineHeight: 1
                  }}
                >
                  {timeStr}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#00f3ff', textShadow: '0 0 10px rgba(0, 243, 255, 0.8)' }}>
                  :{secStr}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px' }}>
                  {dateStr}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                  HABANA APEX • CONTROL TÁCTICO
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #00f3ff', position: 'relative', background: '#020617' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                    <line x1="50" y1="50" x2="50" y2="22" stroke="#fff" strokeWidth="4" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
                    <line x1="50" y1="50" x2="50" y2="12" stroke="#00f3ff" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
                    <line x1="50" y1="50" x2="50" y2="8" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${secondAngle} 50 50)`} />
                    <circle cx="50" cy="50" r="3" fill="#00f3ff" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{timeStr}:{secStr}</div>
                  <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700 }}>{dateStr}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', textAlign: 'right' }}>HABANA APEX</div>
            </div>
          )}
        </div>

        {/* ==================== 2. CUADRO DE CONTROL TÁCTICO EXPANDIDO ==================== */}
        <div
          style={{
            flex: isMobileLayout ? 'none' : 1,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            background: 'linear-gradient(145deg, rgba(8, 18, 38, 0.94), rgba(4, 10, 26, 0.98))',
            border: '1.5px solid rgba(0, 243, 255, 0.35)',
            borderRadius: isMobileLayout ? '16px' : '22px',
            padding: isMobileLayout ? '10px 10px' : '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isMobileLayout ? 'flex-start' : 'space-between',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7), inset 0 0 35px rgba(0, 243, 255, 0.06)',
            backdropFilter: 'blur(12px)',
            gap: isMobileLayout ? '8px' : '10px'
          }}
        >
          {/* SECCIÓN A: ASISTENTE DE VOZ (PUSH-TO-TALK DIRECTO CON FEEDBACK VIVIDO) */}
          <div style={{ 
            background: isListeningVoice ? 'rgba(239, 68, 68, 0.14)' : 'rgba(5, 12, 30, 0.75)', 
            border: `1.5px solid ${isListeningVoice ? '#ef4444' : (isProcessingVoice ? '#00f3ff' : 'rgba(0, 243, 255, 0.25)')}`, 
            borderRadius: '14px', 
            padding: isMobileLayout ? '8px 10px' : '10px 14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: isMobileLayout ? '6px' : '10px',
            boxShadow: isListeningVoice ? '0 0 18px rgba(239, 68, 68, 0.25)' : 'none',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div style={{ 
                width: 9, 
                height: 9, 
                borderRadius: '50%', 
                background: isListeningVoice ? '#ef4444' : (isProcessingVoice ? '#00f3ff' : '#10b981'), 
                boxShadow: isListeningVoice ? '0 0 12px #ef4444' : (isProcessingVoice ? '0 0 10px #00f3ff' : '0 0 6px #10b981'),
                flexShrink: 0
              }} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: isMobileLayout ? '0.62rem' : '0.68rem', fontWeight: 800, color: isListeningVoice ? '#f87171' : (isProcessingVoice ? '#00f3ff' : '#38bdf8'), letterSpacing: '0.5px' }}>
                  {isListeningVoice ? '🎙️ ESCUCHANDO...' : (isProcessingVoice ? '⏳ PROCESANDO...' : '🎙️ CONTROL POR VOZ')}
                </div>
                <div style={{ fontSize: isMobileLayout ? '0.72rem' : '0.78rem', color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lolaReply || voiceTranscript || 'Pulsa "Hablar" para pedir una orden'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobileLayout ? '5px' : '8px', flexShrink: 0 }}>
              {/* Botón Toggle Cuba */}
              <button
                type="button"
                onClick={toggleCubaWake}
                style={{
                  background: cubaWakeEnabled ? 'rgba(16, 185, 129, 0.22)' : 'rgba(100, 116, 139, 0.2)',
                  border: `1.5px solid ${cubaWakeEnabled ? '#10b981' : 'rgba(148, 163, 184, 0.35)'}`,
                  color: cubaWakeEnabled ? '#34d399' : '#94a3b8',
                  padding: isMobileLayout ? '6px 8px' : '7px 12px',
                  borderRadius: '10px',
                  fontSize: isMobileLayout ? '0.66rem' : '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                title={cubaWakeEnabled ? 'Desactivar modo Cuba' : 'Activar modo Cuba'}
              >
                {cubaWakeEnabled ? <Check size={12} color="#34d399" /> : <X size={12} color="#94a3b8" />}
                <span>Cuba: {cubaWakeEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* Botón Principal Dictar Directo (Push-To-Talk) */}
              <button
                type="button"
                onClick={startManualVoice}
                style={{
                  background: isListeningVoice 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.7))' 
                    : 'linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(6, 182, 212, 0.45))',
                  border: `1.5px solid ${isListeningVoice ? '#ef4444' : '#00f3ff'}`,
                  color: '#ffffff',
                  padding: isMobileLayout ? '6px 10px' : '7px 16px',
                  borderRadius: '10px',
                  fontSize: isMobileLayout ? '0.68rem' : '0.74rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: isListeningVoice ? '0 0 16px #ef4444' : '0 0 14px rgba(0, 243, 255, 0.45)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Mic size={isMobileLayout ? 13 : 15} color="#fff" />
                <span>{isListeningVoice ? 'PARAR' : 'HABLAR'}</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN B: ILUMINACIÓN RÁPIDA (BOTONES EXPANDIDOS Y TÁCTILES) */}
          <div style={{ 
            background: 'rgba(5, 12, 30, 0.65)', 
            border: '1px solid rgba(0, 243, 255, 0.2)', 
            borderRadius: '14px', 
            padding: isMobileLayout ? '8px 10px' : '10px 14px',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} color="#facc15" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: isMobileLayout ? '0.72rem' : '0.76rem', fontWeight: 800, color: '#facc15', letterSpacing: '0.5px' }}>
                  LUCES HABITACIONES ({activeLightsCount} ON)
                </span>
              </div>
              <button
                type="button"
                onClick={handleTurnAllOff}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1.5px solid rgba(239, 68, 68, 0.5)',
                  color: '#f87171',
                  padding: isMobileLayout ? '4px 8px' : '5px 12px',
                  borderRadius: '8px',
                  fontSize: isMobileLayout ? '0.66rem' : '0.7rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                <Power size={11} />
                <span>TODO OFF</span>
              </button>
            </div>

            {/* Matriz 6 estancias: 2 columnas en móvil (para no cortarse jamás) y 3 columnas en tablet/desktop */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobileLayout ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
              gap: isMobileLayout ? '6px' : '8px' 
            }}>
              {ROOMS.map(r => {
                const isOn = isRoomLightOn(r.id);
                const IconComponent = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => handleToggleRoom(r.id, e)}
                    style={{
                      background: isOn 
                        ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.28), rgba(6, 182, 212, 0.16))' 
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1.5px solid ${isOn ? '#00f3ff' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: isOn ? '#ffffff' : '#94a3b8',
                      padding: isMobileLayout ? '8px 9px' : '10px 12px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: isOn ? '0 0 16px rgba(0, 243, 255, 0.35)' : 'none',
                      transition: 'all 0.15s ease',
                      minWidth: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobileLayout ? '6px' : '8px', minWidth: 0, overflow: 'hidden' }}>
                      <IconComponent size={isMobileLayout ? 16 : 17} color={isOn ? r.color : '#64748b'} style={{ flexShrink: 0 }} />
                      <span style={{ 
                        fontSize: isMobileLayout ? '0.74rem' : '0.78rem', 
                        fontWeight: 800, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {r.name}
                      </span>
                    </div>
                    <span style={{
                      fontSize: isMobileLayout ? '0.62rem' : '0.66rem',
                      fontWeight: 900,
                      color: isOn ? '#00f3ff' : '#475569',
                      background: isOn ? 'rgba(0, 243, 255, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                      padding: isMobileLayout ? '2px 6px' : '3px 8px',
                      borderRadius: '6px',
                      flexShrink: 0,
                      marginLeft: '4px'
                    }}>
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN C: PERSIANAS MOTORIZADAS (CONEXIÓN DIRECTA VERIFICADA) */}
          <div style={{ 
            background: 'rgba(5, 12, 30, 0.65)', 
            border: '1px solid rgba(0, 243, 255, 0.2)', 
            borderRadius: '14px', 
            padding: isMobileLayout ? '8px 10px' : '10px 14px',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ fontSize: isMobileLayout ? '0.72rem' : '0.76rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.6px', marginBottom: '8px' }}>
              PERSIANAS MOTORIZADAS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {BLINDS.map(b => (
                <div 
                  key={b.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(5, 12, 28, 0.65)', 
                    padding: isMobileLayout ? '6px 8px' : '6px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxSizing: 'border-box',
                    width: '100%',
                    gap: '6px'
                  }}
                >
                  <span style={{ 
                    fontSize: isMobileLayout ? '0.72rem' : '0.76rem', 
                    color: '#e2e8f0', 
                    fontWeight: 700, 
                    minWidth: 0, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {b.name}
                  </span>
                  <div style={{ display: 'flex', gap: isMobileLayout ? '4px' : '6px', flexShrink: 0 }}>
                    {/* Botón Subir */}
                    <button
                      type="button"
                      onClick={(e) => handleBlindDirect(b.id, 'open_cover', e)}
                      style={{
                        background: 'rgba(0, 243, 255, 0.18)',
                        border: '1.5px solid rgba(0, 243, 255, 0.5)',
                        color: '#38bdf8',
                        padding: isMobileLayout ? '5px 8px' : '6px 13px',
                        borderRadius: '8px',
                        fontSize: isMobileLayout ? '0.66rem' : '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Subir Persiana"
                    >
                      <ArrowUp size={isMobileLayout ? 12 : 14} />
                      <span>Subir</span>
                    </button>

                    {/* Botón Parar */}
                    <button
                      type="button"
                      onClick={(e) => handleBlindDirect(b.id, 'stop_cover', e)}
                      style={{
                        background: 'rgba(234, 179, 8, 0.2)',
                        border: '1.5px solid rgba(234, 179, 8, 0.55)',
                        color: '#facc15',
                        padding: isMobileLayout ? '5px 7px' : '6px 12px',
                        borderRadius: '8px',
                        fontSize: isMobileLayout ? '0.66rem' : '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Detener Persiana"
                    >
                      <Square size={isMobileLayout ? 11 : 13} />
                      <span>Stop</span>
                    </button>

                    {/* Botón Bajar */}
                    <button
                      type="button"
                      onClick={(e) => handleBlindDirect(b.id, 'close_cover', e)}
                      style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1.5px solid rgba(168, 85, 247, 0.55)',
                        color: '#c084fc',
                        padding: isMobileLayout ? '5px 8px' : '6px 13px',
                        borderRadius: '8px',
                        fontSize: isMobileLayout ? '0.66rem' : '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Bajar Persiana"
                    >
                      <ArrowDown size={isMobileLayout ? 12 : 14} />
                      <span>Bajar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN D: RADIO MULTI-ROOM (SOLO ALTAVOCES DE CASA, NUNCA TABLET) */}
          <div style={{ 
            background: 'rgba(5, 12, 30, 0.65)', 
            border: '1px solid rgba(0, 243, 255, 0.2)', 
            borderRadius: '14px', 
            padding: isMobileLayout ? '8px 10px' : '10px 14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '8px',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <Radio size={isMobileLayout ? 16 : 18} color={isRadioActive ? '#00f3ff' : '#94a3b8'} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>
                  RADIO CASA (MULTI-ROOM)
                </div>
                <div style={{ fontSize: isMobileLayout ? '0.74rem' : '0.8rem', color: isRadioActive ? '#00f3ff' : '#e2e8f0', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeStation?.name || 'Los 40'} {isRadioActive ? '• SONANDO EN ALTAVOCES DE CASA' : '• EN ESPERA'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobileLayout ? '5px' : '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleNextStation}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: '#e2e8f0',
                  padding: isMobileLayout ? '5px 8px' : '6px 12px',
                  borderRadius: '8px',
                  fontSize: isMobileLayout ? '0.66rem' : '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Cambiar emisora"
              >
                <SkipForward size={13} />
                <span>Emisora</span>
              </button>

              <button
                type="button"
                onClick={handleToggleRadio}
                style={{
                  background: isRadioActive ? 'rgba(239, 68, 68, 0.26)' : 'rgba(0, 243, 255, 0.28)',
                  border: `1.5px solid ${isRadioActive ? '#ef4444' : '#00f3ff'}`,
                  color: isRadioActive ? '#f87171' : '#ffffff',
                  padding: isMobileLayout ? '5px 10px' : '6px 16px',
                  borderRadius: '8px',
                  fontSize: isMobileLayout ? '0.68rem' : '0.74rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isRadioActive ? '0 0 14px rgba(239, 68, 68, 0.4)' : '0 0 14px rgba(0, 243, 255, 0.35)'
                }}
              >
                {isRadioActive ? <Square size={12} color="#f87171" /> : <Play size={12} color="#00f3ff" />}
                <span>{isRadioActive ? 'Parar' : 'Play'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== 3. BARRA INFERIOR DE RETORNO ==================== */}
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={14} color="#38bdf8" />
            <span>TOCA AL AVATAR O HAZ CLIC AQUÍ PARA SALIR AL DASHBOARD</span>
          </button>
        </div>
      </div>
    </div>
  );
}

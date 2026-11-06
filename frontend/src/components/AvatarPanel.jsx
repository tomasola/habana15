import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Cast, Box, Sparkles, Radio, MessageSquare, MessageSquareOff, Eye, Camera, User } from 'lucide-react';
import DynamicAvatar3D from './DynamicAvatar3D';

const IDLE_URL = "/media/videos/inicio.mp4";

export default function AvatarPanel({
  onOpenDigitalTwin,
  onOpenRadio,
  onOpenCameras,
  onOpenVisual,
  onNavigateToAvatar,
  isTabletMode = false,
  activeTab = 'principal',
  principalView = 'avatar',
  isScreensaverActive = false,
  isBatterySaving = false
}) {
// Refs de Lola unificadas al inicio del componente

  const isBatterySavingRef = useRef(isBatterySaving);
  const isScreensaverActiveRef = useRef(isScreensaverActive);

  const [inputText, setInputText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [responseSrc, setResponseSrc] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [isSpeaking3D, setIsSpeaking3D] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [audioOutput, setAudioOutput] = useState(() => {
    return localStorage.getItem('habana_audio_output') || 'local';
  });

  const [whatsappMuted, setWhatsappMuted] = useState(() => {
    return localStorage.getItem('habana_whatsapp_muted') === 'true';
  });

  useEffect(() => {
    isBatterySavingRef.current = isBatterySaving;
  }, [isBatterySaving]);

  // Forzar autoplay seguro silenciado en mount y en el primer toque de pantalla
  useEffect(() => {
    const playIdleSafe = () => {
      if (idleRef.current) {
        idleRef.current.defaultMuted = true;
        idleRef.current.muted = true;
        idleRef.current.playsInline = true;
        idleRef.current.play().catch(err => {
          console.warn('[AvatarPanel] Autoplay en espera de interaccion:', err?.message || err);
        });
      }
    };

    playIdleSafe();

    const onUserGesture = () => {
      playIdleSafe();
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };

    window.addEventListener('click', onUserGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onUserGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };
  }, []);

  useEffect(() => {
    isScreensaverActiveRef.current = isScreensaverActive;
    if (isScreensaverActive) {
      // 1. Pausar vídeo de reposo de Lola para ahorrar GPU/CPU
      if (idleRef.current) {
        try { idleRef.current.pause(); } catch (_e) {}
      }
      // 2. Apagar micrófono y motor VAD inmediatamente
      stopTabletWakeWordVAD();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_e) {}
      }
      // 3. Limpiar estados armados y transcribiendo
      wakeArmedRef.current = false;
      setWakeArmed(false);
      if (wakeTimeoutRef.current) {
        clearTimeout(wakeTimeoutRef.current);
        wakeTimeoutRef.current = null;
      }
      isSpeakingOrPlayingRef.current = false;
      vadBusyTranscribingRef.current = false;
    } else {
      // Al salir del protector de pantalla, reanudar vídeo y escucha VAD
      if (idleRef.current && !showResponse) {
        try {
          idleRef.current.defaultMuted = true;
          idleRef.current.muted = true;
          idleRef.current.play().catch(() => {});
        } catch (_e) {}
      }
      if (wakeWordEnabledRef.current) {
        startTabletWakeWordVAD();
      }
    }
  }, [isScreensaverActive, showResponse]);

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
      console.error('Error toggling whatsapp mute:', e);
    }
  };

  const [loading, setLoading] = useState(false);
  const [sendingStatus, setSendingStatus] = useState('');
  const [activeDevices, setActiveDevices] = useState([]);
  const [viewLayout, setViewLayout] = useState(() => {
    const saved = localStorage.getItem('habana_avatar_layout');
    return (saved === 'brain_full' || saved === 'lola_full') ? saved : 'lola_full';
  });

  const handleLayoutChange = (layout) => {
    setViewLayout(layout);
    localStorage.setItem('habana_avatar_layout', layout);
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        const active = data.filter(d => ['on', 'open', 'playing'].includes(d.state?.toLowerCase()));
        setActiveDevices(active);
      }
    } catch (e) {
      console.error('Error fetching devices', e);
    }
  };

  useEffect(() => {
    fetchDevices();
    const pollMs = (isBatterySaving && isScreensaverActive) ? 15000 : (isBatterySaving ? 7000 : 3000);
    const interval = setInterval(fetchDevices, pollMs);
    return () => clearInterval(interval);
  }, [isBatterySaving, isScreensaverActive]);

  const handleToggleDeviceDirect = async (entityId) => {
    try {
      await fetch('/api/devices/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId, action: 'toggle' })
      });
      fetchDevices();
    } catch (e) {
      console.error('Error toggling device from 3D brain', e);
    }
  };

  const handleOpenDigitalTwin = () => {
    if (typeof onOpenDigitalTwin === 'function') {
      onOpenDigitalTwin();
    } else {
      window.dispatchEvent(new CustomEvent('habana-navigate', {
        detail: { tab: 'zigbee', viewMode: 'digital_twin' }
      }));
    }
  };

  const handleOpenRadio = () => {
    if (typeof onOpenRadio === 'function') {
      onOpenRadio();
    } else {
      window.dispatchEvent(new CustomEvent('habana-navigate', {
        detail: { tab: 'config', configView: 'radio' }
      }));
    }
  };

  const idleRef = useRef(null);
  const responseRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const isStartingRef = useRef(false);
  const pressToTalkRef = useRef(false);
  const pressToTalkStartRef = useRef(0);
  const useMediaRecorderFallbackRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recStartTimestampRef = useRef(0);
  const recGotResultRef = useRef(false);
  const recConsecutiveFailCountRef = useRef(0);
  const lastTouchHandledRef = useRef(0);
  const activePushSpeechRef = useRef("");

  // Refs para el detector de voz por energía (VAD) en la Tablet (palabra clave "Cuba")
  const vadStreamRef = useRef(null);
  const vadAudioCtxRef = useRef(null);
  const vadAnalyserRef = useRef(null);
  const vadRafRef = useRef(null);
  const vadRecorderRef = useRef(null);
  const vadChunksRef = useRef([]);
  const vadIsRecordingSpeechRef = useRef(false);
  const vadSpeechStartRef = useRef(0);
  const vadLastLoudTimeRef = useRef(0);
  const vadBusyTranscribingRef = useRef(false);
  const isSpeakingOrPlayingRef = useRef(false);
  const lastChimeTimeRef = useRef(0);
  const vadIgnoreUntilRef = useRef(0);

  // Modo Escucha Continua por Palabra de Activación ("Cuba")
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    const saved = localStorage.getItem('habana_wake_word_enabled');
    return saved === null ? true : saved === 'true'; // Por defecto ON para escuchar Cuba siempre sin tocar la pantalla
  });
  const [wakeArmed, setWakeArmed] = useState(false);
  const wakeWordEnabledRef = useRef(wakeWordEnabled);
  const wakeArmedRef = useRef(false);
  const wakeTimeoutRef = useRef(null);
  const muteAudioRef = useRef(muteAudio);
  useEffect(() => {
    muteAudioRef.current = muteAudio;
  }, [muteAudio]);

  const playWakeChime = () => {
    const now = Date.now();
    // Shield contra bucle acústico: cooldown mínimo de 3.5 segundos entre pitidos
    if (now - lastChimeTimeRef.current < 3500) {
      return;
    }
    lastChimeTimeRef.current = now;
    // Escudo acústico: cegar micrófono durante el tono de sintetizador y reverberación (1200ms)
    vadIgnoreUntilRef.current = now + 1200;
    isSpeakingOrPlayingRef.current = true;
    setTimeout(() => {
      if (!showResponse) {
        isSpeakingOrPlayingRef.current = false;
      }
    }, 700);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (_e) {}
  };

  // Procesa una frase transcrita en busca de la palabra de activación "Cuba" o de una orden si ya estaba armado
  const processWakeWordTranscript = (rawTranscript, isFinal = true) => {
    if (isScreensaverActiveRef.current) return false;
    const clean = (rawTranscript || '').trim();
    if (!clean) return false;

    const norm = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Detectar "Cuba" (y también aceptar "hola cuba", "oye cuba")
    const wakeRegex = /\b(?:hola\s+cuba|oye\s+cuba|cuba)\b[\s,.:;!?-]*(.*)/i;
    const match = norm.match(wakeRegex);

    if (match) {
      // Extraer el resto de la orden conservando el texto original después de "cuba"
      const idx = norm.indexOf(match[0]);
      const prefixLen = match[0].length - (match[1] || '').length;
      const remainder = clean.slice(idx + prefixLen).replace(/^[\s,.:;!?-]+/, '').trim();

      if (!wakeArmedRef.current) {
        playWakeChime();
        wakeArmedRef.current = true;
        setWakeArmed(true);
        setReplyText('🟢 Te escucho... Di tu orden.');
        if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
        wakeTimeoutRef.current = setTimeout(() => {
          wakeArmedRef.current = false;
          setWakeArmed(false);
        }, 10000);
      }

      if (remainder) {
        setInputText(remainder);
      }

      if (isFinal && remainder.length >= 2) {
        wakeArmedRef.current = false;
        setWakeArmed(false);
        if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
        handleSend(remainder);
      }
      return true;
    }

    if (wakeArmedRef.current) {
      // Ya se dijo "Cuba" hace unos segundos: esta frase es directamente la orden
      setInputText(clean);
      if (isFinal && clean.length >= 2) {
        wakeArmedRef.current = false;
        setWakeArmed(false);
        if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
        handleSend(clean);
      }
      return true;
    }

    return false;
  };

  // Inicia el monitor continuo de micrófono con detección de voz (VAD) para la palabra clave "Cuba" en la Tablet
  const startTabletWakeWordVAD = async () => {
    if (vadStreamRef.current || !wakeWordEnabledRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      } catch (_e) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      vadStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      vadAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      vadAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let mimeOptions = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeOptions = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeOptions = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeOptions = { mimeType: 'audio/mp4' };
        }
      }

      const checkAudioLevel = () => {
        if (!wakeWordEnabledRef.current || !vadAnalyserRef.current) return;

        // No escuchar si el protector está activo, si Lola está hablando, durante el pitido de activación o transcribiendo
        if (
          isScreensaverActiveRef.current ||
          isSpeakingOrPlayingRef.current ||
          isListening ||
          vadBusyTranscribingRef.current ||
          Date.now() < vadIgnoreUntilRef.current
        ) {
          vadRafRef.current = requestAnimationFrame(checkAudioLevel);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        // Calcular energía media en frecuencias vocales (bins 2 a 60)
        let sum = 0;
        const binEnd = Math.min(65, dataArray.length);
        for (let i = 2; i < binEnd; i++) {
          sum += dataArray[i];
        }
        const avgEnergy = sum / (binEnd - 2);
        const now = Date.now();
        // Umbral de voz humana por encima del ruido de fondo
        const speechThreshold = wakeArmedRef.current ? 22 : 26;

        if (avgEnergy > speechThreshold) {
          vadLastLoudTimeRef.current = now;
          if (!vadIsRecordingSpeechRef.current) {
            // Comenzar a grabar este fragmento de voz
            try {
              vadChunksRef.current = [];
              const rec = new MediaRecorder(stream, mimeOptions);
              vadRecorderRef.current = rec;
              rec.ondataavailable = (ev) => {
                if (ev.data && ev.data.size > 0) {
                  vadChunksRef.current.push(ev.data);
                }
              };
              rec.onstop = async () => {
                const chunks = vadChunksRef.current;
                vadChunksRef.current = [];
                vadIsRecordingSpeechRef.current = false;
                const durationMs = Date.now() - vadSpeechStartRef.current;
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                // Filtro robusto: mínimo 500ms y 1800 bytes, y descartar si el protector está activo o en cooldown de eco
                if (blob.size < 1800 || durationMs < 500 || isScreensaverActiveRef.current || Date.now() < vadIgnoreUntilRef.current) {
                  return;
                }
                vadBusyTranscribingRef.current = true;
                setSendingStatus('Detectando orden por voz...');
                try {
                  const formData = new FormData();
                  const ext = (blob.type && blob.type.includes('mp4')) ? 'wake.mp4' : 'wake.webm';
                  formData.append('file', blob, ext);
                  const res = await fetch('/api/chat/transcribe', {
                    method: 'POST',
                    body: formData
                  });
                  if (res.ok && !isScreensaverActiveRef.current) {
                    const data = await res.json();
                    const text = (data.transcription || '').trim();
                    if (text) {
                      processWakeWordTranscript(text, true);
                    }
                  }
                } catch (_err) {
                } finally {
                  vadBusyTranscribingRef.current = false;
                  setSendingStatus('');
                }
              };
              rec.start();
              vadIsRecordingSpeechRef.current = true;
              vadSpeechStartRef.current = now;
            } catch (_e) {
              vadIsRecordingSpeechRef.current = false;
            }
          }
        }

        // Si estaba grabando una frase y ya hay silencio durante 850ms (o lleva más de 5.5s seguidos hablando), cortar y transcribir
        if (vadIsRecordingSpeechRef.current) {
          const silenceMs = now - vadLastLoudTimeRef.current;
          const totalSpeechMs = now - vadSpeechStartRef.current;
          const maxSilence = wakeArmedRef.current ? 950 : 750;
          if (silenceMs > maxSilence || totalSpeechMs > 5500) {
            try {
              if (vadRecorderRef.current && vadRecorderRef.current.state !== 'inactive') {
                vadRecorderRef.current.stop();
              }
            } catch (_e) {}
            vadIsRecordingSpeechRef.current = false;
          }
        }

        if (isBatterySavingRef.current && !vadIsRecordingSpeechRef.current && !wakeArmedRef.current) {
          setTimeout(() => {
            if (wakeWordEnabledRef.current) {
              vadRafRef.current = requestAnimationFrame(checkAudioLevel);
            }
          }, 150);
        } else {
          vadRafRef.current = requestAnimationFrame(checkAudioLevel);
        }
      };

      vadRafRef.current = requestAnimationFrame(checkAudioLevel);
    } catch (e) {
      console.warn('No se pudo iniciar escucha VAD para palabra clave Cuba:', e);
    }
  };

  const stopTabletWakeWordVAD = () => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    try {
      if (vadRecorderRef.current && vadRecorderRef.current.state !== 'inactive') {
        vadRecorderRef.current.stop();
      }
    } catch (_e) {}
    vadIsRecordingSpeechRef.current = false;
    if (vadAudioCtxRef.current) {
      try {
        vadAudioCtxRef.current.close();
      } catch (_e) {}
      vadAudioCtxRef.current = null;
    }
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(t => t.stop());
      vadStreamRef.current = null;
    }
  };

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isTabletParam = window.location.search.includes('tablet=true');
    if (!SpeechRecognition || /; wv\)|Android.*Version\/[0-9.]+/i.test(ua) || (isTabletParam && /Android/i.test(ua))) {
      useMediaRecorderFallbackRef.current = true;
    } else {
      useMediaRecorderFallbackRef.current = false;
    }
    if (wakeWordEnabledRef.current) {
      startTabletWakeWordVAD();
    }
    return () => {
      stopTabletWakeWordVAD();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Procesa la respuesta del servidor:
  // Si hay vídeo de avatar (data.video_url), reproduce ÚNICAMENTE el vídeo con su voz integrada para no duplicar la respuesta.
  // Si NO hay vídeo de avatar, reproduce la voz TTS por el altavoz (data.audio_url).
  const playAvatarResponseData = (data) => {
    if (!data) return;
    if (data.reply) {
      setReplyText(data.reply);
    }

    const relativeVideoUrl = data.video_url
      ? (data.video_url.startsWith('http')
          ? data.video_url
          : encodeURI(data.video_url.startsWith('/') ? data.video_url : `/${data.video_url}`))
      : null;

    if (relativeVideoUrl) {
      // Detener cualquier audio TTS previo para que sólo suene la voz del vídeo de Lola
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (_e) {}
      }
      if (idleRef.current) idleRef.current.pause();
      isSpeakingOrPlayingRef.current = true;
      setResponseSrc(relativeVideoUrl);
      setShowResponse(true);
      setIsSpeaking3D(true);
      return;
    }

    if (data.audio_url && !muteAudioRef.current) {
      setIsSpeaking3D(true);
      isSpeakingOrPlayingRef.current = true;
      const relativeAudioUrl = data.audio_url.startsWith('http')
        ? data.audio_url
        : (data.audio_url.startsWith('/') ? data.audio_url : `/${data.audio_url}`);

      const audioUrlWithCacheBust = `${relativeAudioUrl}${relativeAudioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const audioEl = audioRef.current || new Audio();
      try {
        audioEl.pause();
      } catch (_e) {}
      audioEl.src = audioUrlWithCacheBust;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      audioEl.onended = () => {
        isSpeakingOrPlayingRef.current = false;
        vadIgnoreUntilRef.current = Date.now() + 800;
        setIsSpeaking3D(false);
        setTimeout(() => setReplyText(''), 6000);
      };
      audioEl.onerror = (err) => {
        console.warn('Error reproduciendo audio TTS:', err);
        isSpeakingOrPlayingRef.current = false;
        setIsSpeaking3D(false);
      };

      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Reproducción TTS en <audio> falló, reintentando con instancia Audio:', err);
          try {
            const fallbackAudio = new Audio(audioUrlWithCacheBust);
            fallbackAudio.volume = 1.0;
            fallbackAudio.onended = audioEl.onended;
            fallbackAudio.play().catch(() => {
              isSpeakingOrPlayingRef.current = false;
              setIsSpeaking3D(false);
            });
          } catch (_e2) {
            isSpeakingOrPlayingRef.current = false;
            setIsSpeaking3D(false);
          }
        });
      }
    } else {
      isSpeakingOrPlayingRef.current = false;
      setTimeout(() => setReplyText(''), 6000);
    }
  };

  // Envía el audio grabado manualmente con el botón Dictar a /api/chat/audio (Groq Whisper)
  const sendRecordedAudioBlob = async (blob) => {
    if (!blob || blob.size < 600) {
      return;
    }
    setLoading(true);
    setSendingStatus('Enviando audio a la IA...');
    setReplyText('📡 Enviando audio a la IA de Habana...');
    try {
      const formData = new FormData();
      const ext = (blob.type && blob.type.includes('mp4')) ? 'voice.mp4' : 'voice.webm';
      formData.append('file', blob, ext);

      const res = await fetch('/api/chat/audio', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transcription) {
          setInputText(data.transcription);
          setTimeout(() => setInputText(''), 2500);
        }
        playAvatarResponseData(data);
        fetchDevices();
      } else {
        setReplyText('No pude procesar el audio en este momento.');
      }
    } catch (e) {
      console.error('Error enviando audio a /api/chat/audio:', e);
      setReplyText('Error de red al enviar el mensaje de voz.');
    } finally {
      setLoading(false);
      setSendingStatus('');
    }
  };

  const startMediaRecorderCapture = async () => {
    if (isListening || isStartingRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setReplyText('Error: El micrófono requiere conexión segura HTTPS.');
      return;
    }
    try {
      isStartingRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let options = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        setIsListening(false);
        isStartingRef.current = false;
        if (blob.size > 600) {
          sendRecordedAudioBlob(blob);
        }
      };

      recorder.start();
      setIsListening(true);
      isStartingRef.current = false;
    } catch (err) {
      console.error('Error al acceder al micrófono (MediaRecorder):', err);
      setIsListening(false);
      isStartingRef.current = false;
      // Intento de fallback con restricciones mínimas de audio puro
      try {
        isStartingRef.current = true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          audioChunksRef.current = [];
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
          }
          setIsListening(false);
          isStartingRef.current = false;
          if (blob.size > 600) sendRecordedAudioBlob(blob);
        };
        recorder.start();
        setIsListening(true);
        isStartingRef.current = false;
        return;
      } catch (err2) {
        setIsListening(false);
        isStartingRef.current = false;
        setReplyText('Micrófono bloqueado por Android. Activa el permiso de Micrófono en Ajustes de la Tablet.');
      }
    }
  };

  const stopMediaRecorderCapture = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        return;
      }
    } catch (e) {
      console.warn('Error deteniendo MediaRecorder:', e);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    isStartingRef.current = false;
  };

  const toggleWakeWordMode = (forcedState = null) => {
    const next = typeof forcedState === 'boolean' ? forcedState : !wakeWordEnabledRef.current;
    // Permite reactivar o sincronizar incluso si ya estaba marcado true
    setWakeWordEnabled(next);
    wakeWordEnabledRef.current = next;
    localStorage.setItem('habana_wake_word_enabled', String(next));
    if (next) {
      playWakeChime();
      setReplyText('Escucha por palabra clave activada. Di "Cuba" seguido de tu orden.');
      if (!isScreensaverActiveRef.current) {
        startTabletWakeWordVAD();
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition && !useMediaRecorderFallbackRef.current && recognitionRef.current) {
          try {
            recStartTimestampRef.current = Date.now();
            recognitionRef.current.start();
          } catch (_e) {}
        }
      }
    } else {
      setWakeArmed(false);
      wakeArmedRef.current = false;
      stopTabletWakeWordVAD();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_e) {}
      }
    }
  };

  // Auto-activacion de escucha 'Cuba' al interactuar con la pantalla
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      if (wakeWordEnabledRef.current) {
        toggleWakeWordMode(true);
      }
    };
    window.addEventListener('pointerdown', handleFirstUserInteraction, { once: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
  }, []);

  // Emitir estado wake word a componentes externos (TabletSidebar, etc.)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('habana-wake-state', {
      detail: { enabled: wakeWordEnabled, armed: wakeArmed }
    }));
  }, [wakeWordEnabled, wakeArmed]);

  // Escuchar peticiones de cambio de modo wake word desde botones externos
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

  useEffect(() => {
    const onWakeToggleReq = (e) => {
      const nextVal = (e && e.detail !== undefined) ? e.detail : !wakeWordEnabledRef.current;
      toggleWakeWordMode(nextVal);
    };
    window.addEventListener('habana-wake-word-toggle', onWakeToggleReq);
    return () => window.removeEventListener('habana-wake-word-toggle', onWakeToggleReq);
  }, []);

  // Reconocimiento de voz con soporte para palabra clave "Cuba" en navegadores de escritorio y fallback automático a VAD + Whisper en Tablet
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.lang = 'es-ES';
      rec.interimResults = true;

      rec.onstart = () => {
        recStartTimestampRef.current = Date.now();
        recGotResultRef.current = false;
      };

      rec.onresult = (event) => {
        recGotResultRef.current = true;
        recConsecutiveFailCountRef.current = 0;
        const lastIdx = event.results.length - 1;
        const latestChunk = event.results[lastIdx][0].transcript.trim();
        const isFinal = event.results[lastIdx].isFinal;

        if (!wakeWordEnabledRef.current) {
          // Modo dictado manual normal
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setInputText(transcript);
            activePushSpeechRef.current = transcript;
          }
          if (isFinal && transcript.trim().length >= 2 && !pressToTalkRef.current) {
            const finalOrder = transcript.trim();
            activePushSpeechRef.current = "";
            stopListening();
            handleSend(finalOrder);
          }
          return;
        }

        // Modo Palabra Clave ("Cuba")
        processWakeWordTranscript(latestChunk, isFinal);
      };

      rec.onend = () => {
        const elapsed = Date.now() - (recStartTimestampRef.current || 0);
        setIsListening(false);
        isStartingRef.current = false;

        // Si WebSpeech se cierra en < 900ms sin resultados (típico en Android WebView), conmutar a VAD + Whisper
        if (elapsed < 900 && !recGotResultRef.current) {
          recConsecutiveFailCountRef.current += 1;
          if (recConsecutiveFailCountRef.current >= 2) {
            console.warn('WebSpeech no soportado en este WebView; activando detector VAD continuo para palabra clave "Cuba".');
            useMediaRecorderFallbackRef.current = true;
            if (wakeWordEnabledRef.current) {
              startTabletWakeWordVAD();
            }
            return;
          }
        } else {
          recConsecutiveFailCountRef.current = 0;
        }

        // NUNCA reiniciar automáticamente en bucle si falló o si estamos en dictado manual
        if (wakeWordEnabledRef.current && !useMediaRecorderFallbackRef.current && recGotResultRef.current) {
          setTimeout(() => {
            if (wakeWordEnabledRef.current && recognitionRef.current && !isStartingRef.current && !useMediaRecorderFallbackRef.current) {
              try {
                isStartingRef.current = true;
                recStartTimestampRef.current = Date.now();
                setIsListening(true);
                recognitionRef.current.start();
              } catch (_e) {
                isStartingRef.current = false;
                setIsListening(false);
              }
            }
          }, 1200);
        }
      };

      rec.onerror = (e) => {
        console.warn('Speech error/warn:', e.error);
        setIsListening(false);
        isStartingRef.current = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network' || e.error === 'audio-capture') {
          useMediaRecorderFallbackRef.current = true;
          if (wakeWordEnabledRef.current) {
            startTabletWakeWordVAD();
          }
        }
      };

      recognitionRef.current = rec;
      // No auto-arrancar reconocimiento al cargar la página para evitar parpadeos y requerir interacción del usuario
    } else {
      useMediaRecorderFallbackRef.current = true;
    }
  }, []);

  const startListening = () => {
    if (isListening || isStartingRef.current) return;
    setIsListening(true);

    if (audioRef.current && !muteAudioRef.current) {
      try {
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
      } catch (_e) {}
    }

    if (useMediaRecorderFallbackRef.current || !recognitionRef.current) {
      startMediaRecorderCapture();
      return;
    }

    try {
      isStartingRef.current = true;
      recStartTimestampRef.current = Date.now();
      setIsListening(true);
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Speech start error, switching to MediaRecorder fallback:', e);
      useMediaRecorderFallbackRef.current = true;
      setIsListening(false);
      isStartingRef.current = false;
      startMediaRecorderCapture();
    }
  };

  const stopListening = () => {
    if (useMediaRecorderFallbackRef.current || (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')) {
      stopMediaRecorderCapture();
      return;
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn('Speech stop error:', e);
    }
    setIsListening(false);
    isStartingRef.current = false;
  };

  const toggleListening = () => {
    if (Date.now() - lastTouchHandledRef.current < 650) {
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleMouseDown = (e) => {
    if (Date.now() - lastTouchHandledRef.current < 650) return;
    e.preventDefault();
    pressToTalkRef.current = true;
    pressToTalkStartRef.current = Date.now();
    startListening();
  };

  const handleMouseUp = (e) => {
    if (Date.now() - lastTouchHandledRef.current < 650) return;
    e.preventDefault();
    if (pressToTalkRef.current) {
      const heldMs = Date.now() - (pressToTalkStartRef.current || 0);
      pressToTalkRef.current = false;
      if (heldMs >= 450) {
        stopListening();
        if (activePushSpeechRef.current && activePushSpeechRef.current.trim().length >= 2) {
          const order = activePushSpeechRef.current.trim();
          activePushSpeechRef.current = "";
          handleSend(order);
        }
      }
    }
  };

  const handleTouchStart = (e) => {
    lastTouchHandledRef.current = Date.now();
    e.preventDefault();
    if (isListening) {
      pressToTalkRef.current = false;
      stopListening();
      return;
    }
    pressToTalkRef.current = true;
    pressToTalkStartRef.current = Date.now();
    startListening();
  };

  const handleTouchEnd = (e) => {
    lastTouchHandledRef.current = Date.now();
    e.preventDefault();
    if (pressToTalkRef.current) {
      const heldMs = Date.now() - (pressToTalkStartRef.current || 0);
      pressToTalkRef.current = false;
      if (heldMs >= 450) {
        stopListening();
        if (activePushSpeechRef.current && activePushSpeechRef.current.trim().length >= 2) {
          const order = activePushSpeechRef.current.trim();
          activePushSpeechRef.current = "";
          handleSend(order);
        }
      } else {
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopListening();
          }
        }, 7000);
      }
    }
  };

  const handleSend = async (textToSend = inputText) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text) return;

    if (audioRef.current && !muteAudioRef.current) {
      try {
        audioRef.current.muted = false;
        audioRef.current.volume = 1.0;
      } catch (_e) {}
    }

    setLoading(true);
    setSendingStatus('Procesando con la IA...');
    setInputText('');
    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, source: 'web' })
      });
      if (res.ok) {
        const data = await res.json();
        playAvatarResponseData(data);
        fetchDevices();
      }
    } catch (e) {
      console.error('Error al enviar al avatar:', e);
    } finally {
      setLoading(false);
      setSendingStatus('');
    }
  };

  useEffect(() => {
    if (showResponse && responseSrc && responseRef.current) {
      responseRef.current.src = responseSrc;
      responseRef.current.muted = muteAudio;
      responseRef.current.volume = 1.0;
      responseRef.current.load();
      responseRef.current.play().catch(err => {
        console.warn('Response video blocked:', err);
        isSpeakingOrPlayingRef.current = false;
      });
    }
  }, [showResponse, responseSrc, muteAudio]);

  const handleResponseEnded = () => {
    isSpeakingOrPlayingRef.current = false;
    vadIgnoreUntilRef.current = Date.now() + 800;
    setShowResponse(false);
    setIsSpeaking3D(false);
    setResponseSrc('');
    if (idleRef.current && !isScreensaverActiveRef.current) {
      idleRef.current.play().catch(() => {});
    }
    setTimeout(() => setReplyText(''), 5000);
  };

  // Código de colores reactivo unificado (Idéntico a la Bola / Esfera física):
  // 🟢 'idle': Verde Esmeralda / Cian (#10b981) -> Listo / Reposo con "Cuba" armada
  // 🔵 'listening': Azul Eléctrico (#00f3ff) -> Micrófono abierto tras escuchar "Cuba"
  // 🟠 'thinking': Naranja Neón (#f97316) -> IA procesando orden
  // 🔴 'speaking': Rojo Carmín (#ef4444) -> Altavoz / Vídeo activo emitiendo voz
  // ⚫ 'muted': Gris Carbón (#64748b) -> "Cuba" en pausa (modo silencioso / micro cerrado)
  const currentVisualState = useMemo(() => {
    if (!wakeWordEnabled) return 'muted';
    if (showResponse || isSpeaking3D) return 'speaking';
    if (loading) return 'thinking';
    if (wakeArmed || isListening) return 'listening';
    return 'idle';
  }, [wakeWordEnabled, showResponse, isSpeaking3D, loading, wakeArmed, isListening]);

  const stateTheme = useMemo(() => {
    switch (currentVisualState) {
      case 'speaking':
        return {
          color: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.65)',
          border: 'rgba(239, 68, 68, 0.85)',
          tag: 'EMITIENDO VOZ',
          label: 'HABLANDO'
        };
      case 'thinking':
        return {
          color: '#f97316',
          glow: 'rgba(249, 115, 22, 0.65)',
          border: 'rgba(249, 115, 22, 0.85)',
          tag: 'IA PENSANDO...',
          label: 'PROCESANDO'
        };
      case 'listening':
        return {
          color: '#00f3ff',
          glow: 'rgba(0, 243, 255, 0.75)',
          border: 'rgba(0, 243, 255, 0.95)',
          tag: 'CUBA ESCUCHANDO',
          label: 'ESCUCHANDO'
        };
      case 'muted':
        return {
          color: '#64748b',
          glow: 'rgba(100, 116, 139, 0.15)',
          border: 'rgba(100, 116, 139, 0.4)',
          tag: 'CUBA EN PAUSA',
          label: 'PAUSA'
        };
      case 'idle':
      default:
        return {
          color: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
          border: 'rgba(16, 185, 129, 0.65)',
          tag: 'CUBA ARMADA',
          label: 'LISTO'
        };
    }
  }, [currentVisualState]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      flex: 1,
      background: 'linear-gradient(145deg, #050a19 0%, #020612 100%)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(0, 243, 255, 0.22)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'row',
      padding: '10px',
      gap: '12px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Elemento de audio persistente para respuestas habladas sin vídeo */}
      <audio ref={audioRef} playsInline preload="auto" style={{ display: 'none' }} />

      {/* MITAD IZQUIERDA: Lola Video & 3D Avatar con Marco Reactivo Unificado */}
      <div style={{
        flex: 1.1,
        height: '100%',
        minHeight: 0,
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        border: `2px solid ${stateTheme.border}`,
        background: '#000000',
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.8), 0 0 24px ${stateTheme.glow}`,
        transition: 'border 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
      }}>

        {/* SELECTOR COMPACTO DE VISTA (Lola / Cerebro) */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(5, 12, 28, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '8px',
          padding: '2px 4px'
        }}>
          <button
            type="button"
            onClick={() => handleLayoutChange('lola_full')}
            style={{
              background: viewLayout === 'lola_full' ? 'rgba(0, 243, 255, 0.3)' : 'transparent',
              border: 'none',
              color: viewLayout === 'lola_full' ? '#fff' : '#94a3b8',
              padding: '3px 7px',
              borderRadius: '5px',
              fontSize: '0.66rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Vídeo Lola"
          >
            👤 Lola
          </button>
          <button
            type="button"
            onClick={() => handleLayoutChange('brain_full')}
            style={{
              background: viewLayout === 'brain_full' ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
              border: 'none',
              color: viewLayout === 'brain_full' ? '#fff' : '#94a3b8',
              padding: '3px 7px',
              borderRadius: '5px',
              fontSize: '0.66rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Cerebro 3D"
          >
            ⚡ 3D
          </button>
        </div>

        {/* HUD OVERLAY EN VÍDEO CON CÓDIGO DE COLORES REACTIVO */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          zIndex: 5
        }}>
          <div style={{ position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderTop: `2px solid ${stateTheme.color}`, borderLeft: `2px solid ${stateTheme.color}`, transition: 'border-color 0.3s' }}></div>
          <div style={{ position: 'absolute', bottom: 10, left: 10, width: 22, height: 22, borderBottom: `2px solid ${stateTheme.color}`, borderLeft: `2px solid ${stateTheme.color}`, transition: 'border-color 0.3s' }}></div>
          <div style={{ position: 'absolute', top: 10, left: 38, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(5, 12, 28, 0.88)', padding: '2px 8px', borderRadius: '6px', border: `1px solid ${stateTheme.border}`, backdropFilter: 'blur(8px)', transition: 'all 0.3s' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stateTheme.color, boxShadow: `0 0 8px ${stateTheme.color}` }}></span>
            <span style={{ color: stateTheme.color, fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800 }}>
              {stateTheme.tag}
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 10, right: 10, color: stateTheme.color, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, transition: 'color 0.3s' }}>
            {stateTheme.label}
          </div>
        </div>

        {/* VÍDEO LOLA (Siempre montado, visible en modo Lola y con poster para cero pantalla negra) */}
        <div
          onClick={() => {
            if (idleRef.current) {
              idleRef.current.defaultMuted = true;
              idleRef.current.muted = true;
              idleRef.current.play().catch(() => {});
            }
          }}
          title="Lola Avatar (clic para reanudar video)"
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            position: viewLayout === 'lola_full' ? 'relative' : 'absolute',
            opacity: viewLayout === 'lola_full' ? 1 : 0,
            pointerEvents: viewLayout === 'lola_full' ? 'auto' : 'none',
            zIndex: viewLayout === 'lola_full' ? 2 : 0,
            cursor: 'pointer'
          }}
        >
          <video
            ref={idleRef}
            src={IDLE_URL}
            poster="/media/videos/inicio_poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            webkit-playsinline="true"
            preload="auto"
            style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0, zIndex: 1, display: showResponse ? 'none' : 'block' }}
            onError={() => console.warn('Idle video error')}
          />
          <video
            ref={responseRef}
            playsInline
            webkit-playsinline="true"
            preload="none"
            muted={muteAudio}
            onEnded={handleResponseEnded}
            style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0, zIndex: 1, display: showResponse ? 'block' : 'none' }}
            onError={() => {
              console.warn('Response video error');
              handleResponseEnded();
            }}
          />
        </div>

        {/* CEREBRO 3D DYSON (Se pausa cuando el protector de pantalla está encima para no duplicar WebGL) */}
        {viewLayout === 'brain_full' && !isScreensaverActive && (
          <div style={{
            flex: 1,
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 3,
            background: 'rgba(0,0,0,0.5)'
          }}>
            <DynamicAvatar3D
              visualState={currentVisualState}
              isSpeaking={isSpeaking3D || showResponse}
              isListening={isListening || wakeArmed || loading}
              activeDevices={activeDevices}
              isMaximized={viewLayout === 'brain_full'}
              onToggleMaximize={() => handleLayoutChange(viewLayout === 'brain_full' ? 'lola_full' : 'brain_full')}
              onToggleDevice={handleToggleDeviceDirect}
            />
          </div>
        )}
      </div>

      {/* MITAD DERECHA: Diálogo + Accesos + Área de Entrada */}
      <div style={{
        flex: 0.9,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0
      }}>

        {/* 1. TARJETA DE DIÁLOGO */}
        <div style={{
          height: '125px',
          minHeight: '85px',
          maxHeight: '140px',
          background: 'rgba(10, 15, 25, 0.78)',
          borderRadius: '12px',
          border: `1px solid ${wakeArmed ? '#10b981' : 'rgba(0, 243, 255, 0.22)'}`,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: wakeArmed ? '0 0 20px rgba(16, 185, 129, 0.35)' : 'inset 0 0 20px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: '0.72rem',
            color: wakeArmed ? '#10b981' : '#00f3ff',
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
            flexShrink: 0
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: wakeArmed ? '#10b981' : '#00f3ff', borderRadius: '50%', boxShadow: `0 0 8px ${wakeArmed ? '#10b981' : '#00f3ff'}` }}></span>
            {wakeArmed ? '🟢 CUBA EN ESCUCHA ACTIVA' : 'DIÁLOGO CON LOLA'}
          </div>
          <div style={{
            color: replyText ? '#ffffff' : '#64748b',
            fontSize: '0.86rem',
            lineHeight: '1.4',
            fontWeight: 400,
            wordBreak: 'break-word'
          }}>
            {replyText || 'Di "Cuba" seguido de tu orden o pulsa Dictar...'}
          </div>
        </div>

{/* Accesos rápidos duplicados extraídos hacia el menú lateral */}

        {/* 3. BARRA DE CONTROL INFERIOR DERECHA: CUBA ACTIVA, ALTAVOZ Y ENVIAR */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* 1. Botón Disparador "Cuba" Activo (Idéntico a la Bola) */}
            <button
              type="button"
              onClick={toggleWakeWordMode}
              style={{
                background: wakeWordEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${wakeWordEnabled ? '#10b981' : 'rgba(255,255,255,0.14)'}`,
                color: wakeWordEnabled ? '#10b981' : '#94a3b8',
                padding: '7px 12px',
                height: '36px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                transition: 'all 0.2s',
                boxShadow: wakeWordEnabled ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none'
              }}
              title={wakeWordEnabled ? 'Disparador "Cuba" activo (clic para pausar micrófono)' : 'Disparador "Cuba" pausado (clic para activar escucha continua)'}
            >
              {wakeWordEnabled ? <Mic size={16} color="#10b981" /> : <MicOff size={16} color="#94a3b8" />}
              <span>{wakeWordEnabled ? 'CUBA ACTIVA' : 'CUBA EN PAUSA'}</span>
            </button>

            {/* 2. Botón Altavoz (Mute/Unmute Voz del Asistente) */}
            <button
              type="button"
              onClick={() => setMuteAudio(!muteAudio)}
              style={{
                background: muteAudio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${muteAudio ? '#ef4444' : 'rgba(255,255,255,0.14)'}`,
                color: muteAudio ? '#ef4444' : '#94a3b8',
                padding: '7px 12px',
                height: '36px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                transition: 'all 0.2s',
                boxShadow: muteAudio ? '0 0 10px rgba(239, 68, 68, 0.35)' : 'none'
              }}
              title={muteAudio ? 'Voz silenciada (clic para activar)' : 'Voz activada (clic para silenciar)'}
            >
              {muteAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{muteAudio ? 'VOZ SILENCIADA' : 'VOZ ACTIVADA'}</span>
            </button>

            {/* 3. Botón Todos los Altavoces (Google Cast Multi-room) */}
            <button
              type="button"
              onClick={toggleAudioOutput}
              style={{
                background: audioOutput === 'google_cast' ? 'rgba(6, 182, 212, 0.22)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${audioOutput === 'google_cast' ? '#06b6d4' : 'rgba(255,255,255,0.14)'}`,
                color: audioOutput === 'google_cast' ? '#22d3ee' : '#94a3b8',
                padding: '7px 12px',
                height: '36px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                transition: 'all 0.2s',
                boxShadow: audioOutput === 'google_cast' ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none'
              }}
              title={audioOutput === 'google_cast' ? 'Respuestas de la IA activas en todos los altavoces de la casa' : 'Respuestas solo en este dispositivo (clic para activar todos los altavoces)'}
            >
              <Cast size={16} color={audioOutput === 'google_cast' ? '#22d3ee' : '#94a3b8'} />
              <span>{audioOutput === 'google_cast' ? 'ALTAVOCES CASA: ON' : 'ALTAVOCES CASA: OFF'}</span>
            </button>
          </div>

          {/* Botón Enviar */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !inputText.trim()}
            style={{
              background: loading || !inputText.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #0284c7, #00f3ff)',
              border: `1px solid ${loading || !inputText.trim() ? 'rgba(255,255,255,0.1)' : '#00f3ff'}`,
              color: loading || !inputText.trim() ? '#64748b' : '#020617',
              padding: '7px 20px',
              height: '36px',
              borderRadius: '9px',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: loading || !inputText.trim() ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: loading || !inputText.trim() ? 'none' : '0 0 14px rgba(0,243,255,0.4)',
              transition: 'all 0.2s'
            }}
            title="Enviar orden o consulta escrita"
          >
            <Send size={15} />
            <span>ENVIAR</span>
          </button>
        </div>

        {/* 4. ÁREA DE TEXTO Y CONSULTAS */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{
            flex: 1,
            minHeight: '85px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: '14px',
            border: `1px solid ${sendingStatus ? '#38bdf8' : (isListening ? '#ef4444' : (wakeArmed ? '#10b981' : 'rgba(0, 243, 255, 0.32)'))}`,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '6px',
            boxShadow: sendingStatus ? '0 0 28px rgba(56, 189, 248, 0.6)' : (isListening ? '0 0 24px rgba(239, 68, 68, 0.4)' : (wakeArmed ? '0 0 24px rgba(16, 185, 129, 0.35)' : '0 6px 24px rgba(0,0,0,0.5)')),
            transition: 'all 0.2s ease'
          }}
        >
          {/* Cabecera del área de entrada */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: sendingStatus ? '#38bdf8' : (isListening ? '#f87171' : (wakeArmed ? '#34d399' : '#94a3b8')), fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {sendingStatus ? (<><span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#38bdf8', borderRadius: '50%', boxShadow: '0 0 10px #38bdf8' }} /> 📡 {sendingStatus}</>) : isListening ? (
                <>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 8px #ef4444' }} />
                  🔴 Escuchando tu voz... (habla ahora y suelta o toca para enviar)
                </>
              ) : wakeArmed ? (
                <>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }} />
                  🟢 "Cuba" detectado: di tu orden ahora...
                </>
              ) : (
                '✍️ Escribe tu orden o di "Cuba" para activar por voz:'
              )}
            </span>
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Cuadro de texto multilínea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isListening ? "Escuchando tu voz en directo..." : (wakeArmed ? "Te escucho, di tu orden..." : 'Di "Cuba" + tu orden, o escríbela aquí...')}
            disabled={loading}
            style={{
              flex: 1,
              width: '100%',
              minHeight: '55px',
              background: 'rgba(2, 6, 18, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: '#ffffff',
              fontSize: '0.88rem',
              lineHeight: '1.4',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </form>
      </div>
    </div>
  );
}

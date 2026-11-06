import React, { useState, useEffect, useMemo, useRef } from 'react';
import Hls from 'hls.js';
import { 
  Tv, Power, Volume1, Volume2, VolumeX, Search, X, 
  Radio, Sliders, Maximize2, Minimize2, Eye, ChevronDown, ChevronUp
} from 'lucide-react';

const DEFAULT_FAVS = [
  'la1', 'la2', 'antena3', 'cuatro', 'telecinco', 'lasexta',
  'la7cyl', '7tv_andalucia', 'trece', 'fdf', 'energy', 'neox',
  'nova', 'mega', 'atreseries', 'divinity', 'bemad', 'boing',
  'clan', '24h', 'teledeporte', 'tvg', 'telemadrid'
];

const DEFAULT_PREVIEW = {
  key: 'la1',
  name: 'La 1 HD',
  category: 'Generalista',
  logo: 'https://graph.facebook.com/la1detve/picture?width=200&height=200',
  stream: 'https://rtvelivestream.rtve.es/rtvesec/la1/la1_main_dvr_720.m3u8'
};

const FALLBACK_DEVICES = {
  salon: {
    id: 'salon',
    name: 'TV Salón',
    room: 'Salón y Comedor',
    brand: 'Samsung Smart TV',
    icon: '📺',
    speaker: 'Salón'
  },
  habitacion: {
    id: 'habitacion',
    name: 'TV Habitación',
    room: 'Dormitorio Principal',
    brand: 'Xiaomi Android TV',
    icon: '🛏️',
    speaker: 'Dormitorio'
  },
  cocina: {
    id: 'cocina',
    name: 'TV Cocina',
    room: 'Cocina',
    brand: 'Xiaomi Android TV',
    icon: '🍳',
    speaker: 'Cocina'
  }
};

export default function SmartTVControlPanel({ onClose }) {
  const [devices, setDevices] = useState(FALLBACK_DEVICES);
  const [channels, setChannels] = useState({});
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('habana15_tv_favorites');
      return saved ? JSON.parse(saved) : DEFAULT_FAVS;
    } catch {
      return DEFAULT_FAVS;
    }
  });
  const [selectedTv, setSelectedTv] = useState('salon');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeCategory, setActiveCategory] = useState('⭐ Favoritos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Vista activa en móvil: 'canales' o 'mando'
  const [mobileTab, setMobileTab] = useState('canales');

  // Previsualización de Canal en Directo (VISIBLE POR DEFECTO)
  const [previewChannel, setPreviewChannel] = useState(DEFAULT_PREVIEW);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);

  // Detección reactiva de pantalla pequeña / teléfono
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTVData();
  }, []);

  // Gestor del reproductor HLS para la Previsualización
  useEffect(() => {
    if (!previewChannel) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    setPlayerLoading(true);
    setPlayerError(null);

    const initStream = async () => {
      let streamUrl = previewChannel.stream || `/api/tv/stream/${previewChannel.key}`;
      try {
        const res = await fetch(`/api/tv/stream_info/${previewChannel.key}`);
        if (res.ok) {
          const info = await res.json();
          if (info.stream_url) {
            streamUrl = info.stream_url;
          }
        }
      } catch {
        // Fallback a proxy
      }

      if (isCancelled) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 15,
          maxBufferLength: 15
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isCancelled) {
            setPlayerLoading(false);
            video.play().catch(() => {});
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !isCancelled) {
            console.warn('HLS Fatal Error, reintentando con proxy...', data);
            if (streamUrl !== `/api/tv/stream/${previewChannel.key}`) {
              hls.loadSource(`/api/tv/stream/${previewChannel.key}`);
            } else {
              setPlayerError('Flujo no disponible temporalmente');
              setPlayerLoading(false);
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Soporte nativo para iOS Safari (iPhone / iPad)
        video.src = streamUrl;
        const onLoaded = () => {
          if (!isCancelled) {
            setPlayerLoading(false);
            video.play().catch(() => {});
          }
        };
        const onError = () => {
          if (!isCancelled) {
            setPlayerError('Error cargando señal HLS');
            setPlayerLoading(false);
          }
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onError);

        return () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
        };
      } else {
        setPlayerError('Navegador no compatible con reproducción HLS');
        setPlayerLoading(false);
      }
    };

    initStream();

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [previewChannel]);

  // Listener para sincronizar estado de pantalla completa
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container && !video) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container && container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        // Modo nativo en iPhone / Safari móvil
        video.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const fetchTVData = async () => {
    try {
      const [devRes, chanRes, favRes] = await Promise.all([
        fetch('/api/tv/devices').then(r => r.json()).catch(() => null),
        fetch('/api/tv/channels').then(r => r.json()).catch(() => null),
        fetch('/api/tv/favorites').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      if (devRes && Object.keys(devRes).length > 0) {
        setDevices(devRes);
      }
      if (chanRes && Object.keys(chanRes).length > 0) {
        setChannels(chanRes);
        // Si el canal por defecto tiene datos actualizados, enriquecerlo
        if (chanRes.la1) {
          setPreviewChannel(prev => ({
            ...prev,
            ...chanRes.la1,
            key: 'la1'
          }));
        }
      }
      if (favRes && Array.isArray(favRes.favorites)) {
        setFavorites(favRes.favorites);
        localStorage.setItem('habana15_tv_favorites', JSON.stringify(favRes.favorites));
      }
    } catch (err) {
      console.error('Error cargando datos de TV:', err);
    }
  };

  const showNotification = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleFavorite = async (e, channelKey) => {
    e.stopPropagation();
    const key = channelKey.toLowerCase();
    const isFav = favorites.includes(key);
    const nextFavs = isFav ? favorites.filter(k => k !== key) : [...favorites, key];
    setFavorites(nextFavs);
    localStorage.setItem('habana15_tv_favorites', JSON.stringify(nextFavs));

    const chName = channels[channelKey]?.name || channelKey;
    showNotification(isFav ? `☆ ${chName} quitado de Favoritos` : `⭐ ${chName} añadido a Favoritos`);

    try {
      const res = await fetch('/api/tv/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_key: key })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.favorites)) {
          setFavorites(data.favorites);
          localStorage.setItem('habana15_tv_favorites', JSON.stringify(data.favorites));
        }
      }
    } catch (err) {
      console.error('Error guardando favorito:', err);
    }
  };

  const handlePlayChannel = async (channelKey) => {
    setLoading(true);
    try {
      const res = await fetch('/api/tv/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tv_id: selectedTv,
          channel_key: channelKey
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al sintonizar');

      const tvName = devices[selectedTv]?.name || 'Televisión';
      const chName = channels[channelKey]?.name || channelKey;
      showNotification(`📺 Sintonizando ${chName} en ${tvName}...`);
    } catch (err) {
      showNotification(`Error: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewChannel = (key, ch) => {
    setPreviewCollapsed(false);
    setPreviewChannel({
      key,
      name: ch.name || key,
      logo: ch.logo,
      category: ch.category,
      stream: ch.stream
    });
    showNotification(`👁️ Previsualizando ${ch.name || key} en directo...`);
  };

  const handlePower = async (action) => {
    try {
      const tvName = devices[selectedTv]?.name || 'Televisión';
      const actionText = action === 'on' ? 'Encendiendo' : 'Apagando';
      showNotification(`⚡ ${actionText} ${tvName}...`);
      await fetch('/api/tv/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tv_id: selectedTv,
          action: action
        })
      });
    } catch (err) {
      showNotification(`Error de encendido: ${err.message}`, true);
    }
  };

  const handleVolume = async (step) => {
    try {
      const stepLabels = { up: 'Subiendo volumen', down: 'Bajando volumen', mute: 'Silenciar / Mute' };
      showNotification(`🔊 ${stepLabels[step] || step}...`);
      await fetch('/api/tv/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tv_id: selectedTv,
          step: step
        })
      });
    } catch (err) {
      console.error('Error volumen:', err);
    }
  };

  const categories = [
    '⭐ Favoritos',
    'Todos',
    'Generalista',
    'Cine y Series',
    'Autonómicas',
    'Infantil',
    'Deportes',
    'Noticias',
    'Música',
    'Internacional'
  ];

  const favSet = useMemo(() => new Set(favorites.map(f => f.toLowerCase())), [favorites]);

  const filteredChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(channels).filter(([key, ch]) => {
      const matchesQuery = !q ||
        ch.name?.toLowerCase().includes(q) ||
        ch.category?.toLowerCase().includes(q) ||
        ch.region?.toLowerCase().includes(q) ||
        key.toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (q) return true;

      if (activeCategory === '⭐ Favoritos') {
        return favSet.has(key.toLowerCase());
      }
      if (activeCategory === 'Todos') return true;
      return ch.category?.toLowerCase() === activeCategory.toLowerCase();
    });
  }, [channels, activeCategory, searchQuery, favSet]);

  const currentDevice = devices[selectedTv] || FALLBACK_DEVICES[selectedTv] || { name: 'TV', room: 'Casa' };

  return (
    <div className="tv-modal-backdrop">
      <style>{`
        .tv-modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(10, 15, 29, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .tv-modal-container {
          background: #0b1120;
          border: 1px solid #1e293b;
          border-radius: 20px;
          width: 100%;
          max-width: 1140px;
          height: 88vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 99, 235, 0.15);
          overflow: hidden;
          color: #f8fafc;
          position: relative;
        }

        /* Estilos específicos para Móvil / Pantallas pequeñas */
        @media (max-width: 768px) {
          .tv-modal-backdrop {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .tv-modal-container {
            border-radius: 0 !important;
            height: 100% !important;
            height: 100dvh !important;
            max-width: 100% !important;
            border: none !important;
          }
          .tv-channels-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          @media (max-width: 380px) {
            .tv-channels-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        }

        /* Contenedor Fullscreen del reproductor */
        .tv-preview-container:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
          background: #000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999999 !important;
        }
        .tv-preview-container:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
          background: #000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999999 !important;
        }

        /* Scrollbars finas y elegantes */
        .tv-custom-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .tv-custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .tv-custom-scroll::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .tv-custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        /* Efectos táctiles y transiciones */
        .tv-btn-tap {
          transition: transform 0.12s ease, background-color 0.15s ease, border-color 0.15s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .tv-btn-tap:active {
          transform: scale(0.96);
        }

        .tv-channel-card:active {
          transform: scale(0.96);
        }

        @keyframes pulseDirecto {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
          display: inline-block;
          animation: pulseDirecto 1.5s infinite;
        }
      `}</style>

      <div className="tv-modal-container">
        {/* Cabecera Principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 14px' : '14px 24px',
          borderBottom: '1px solid #1e293b',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Tv size={isMobile ? 20 : 22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: '800',
                  letterSpacing: '-0.02em',
                  color: '#f8fafc'
                }}>
                  {isMobile ? 'Mando TV Habana' : `Mando Universal & TV Streaming (${Object.keys(channels).length || 23}+ Canales)`}
                </h2>
                {isMobile && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#1e293b',
                    color: '#60a5fa',
                    border: '1px solid #3b82f6',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {currentDevice.name}
                  </span>
                )}
              </div>
              {!isMobile && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Habana 15 Multi-Room Hub • Previsualización en Vivo con Pantalla Completa • Control Directo IP
                </span>
              )}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="tv-btn-tap"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '50%',
                width: isMobile ? '34px' : '38px',
                height: isMobile ? '34px' : '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
              title="Cerrar Mando"
            >
              <X size={isMobile ? 18 : 20} />
            </button>
          )}
        </div>

        {/* Notificación Toast flotante */}
        {feedback && (
          <div style={{
            backgroundColor: feedback.isError ? '#ef4444' : '#059669',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
            flexShrink: 0
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Selector de Televisión en Móvil (Pills Horizontales) */}
        {isMobile && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#0a0f1d',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            flexShrink: 0
          }} className="tv-custom-scroll">
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              TV Destino:
            </span>
            {Object.entries(devices).map(([id, dev]) => {
              const isSelected = selectedTv === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedTv(id)}
                  className="tv-btn-tap"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.25)' : '#131d31',
                    color: isSelected ? '#60a5fa' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected ? '700' : '500',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  <span>{dev.icon || '📺'}</span>
                  <span>{dev.name.replace('TV ', '')}</span>
                  {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* PANTALLA DE PREVISUALIZACIÓN EN VIVO (SIEMPRE VISIBLE EN LA CABECERA / PANEL SUPERIOR) */}
        {previewChannel && (
          <div
            ref={playerContainerRef}
            className="tv-preview-container"
            style={{
              backgroundColor: '#020617',
              borderBottom: '1px solid #1e293b',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0
            }}
          >
            {/* Cabecera / Barra del Reproductor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '6px 12px' : '8px 16px',
              backgroundColor: '#090d16',
              borderBottom: previewCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-dot" />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', letterSpacing: '0.05em' }}>
                  EN DIRECTO
                </span>
                <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '800', color: '#f8fafc' }}>
                  📺 {previewChannel.name}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', display: isMobile ? 'none' : 'inline' }}>
                  ({previewChannel.category || 'TDT'})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Botón Silenciar / Sonido */}
                <button
                  onClick={() => {
                    const nextMuted = !previewMuted;
                    setPreviewMuted(nextMuted);
                    if (videoRef.current) videoRef.current.muted = nextMuted;
                  }}
                  className="tv-btn-tap"
                  style={{
                    backgroundColor: previewMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    border: previewMuted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                    color: previewMuted ? '#fca5a5' : '#4ade80',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={previewMuted ? 'Activar Sonido' : 'Silenciar'}
                >
                  {previewMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span style={{ fontSize: '10px', fontWeight: '800' }}>
                    {previewMuted ? 'MUTE' : 'AUDIO'}
                  </span>
                </button>

                {/* BOTÓN PANTALLA COMPLETA DESTACADO */}
                <button
                  onClick={toggleFullscreen}
                  className="tv-btn-tap"
                  style={{
                    backgroundColor: '#2563eb',
                    border: '1px solid #60a5fa',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 0 12px rgba(37, 99, 235, 0.45)'
                  }}
                  title="Expandir a Pantalla Completa (100% de la pantalla)"
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{isFullscreen ? 'Reducir' : 'Pantalla Completa'}</span>
                </button>

                {/* Botón Sintonizar en TV física */}
                <button
                  onClick={() => handlePlayChannel(previewChannel.key)}
                  className="tv-btn-tap"
                  style={{
                    backgroundColor: '#059669',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`Enviar a ${currentDevice.name}`}
                >
                  <Tv size={12} />
                  <span>A la TV</span>
                </button>

                {/* Botón Plegar / Desplegar */}
                <button
                  onClick={() => setPreviewCollapsed(!previewCollapsed)}
                  className="tv-btn-tap"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={previewCollapsed ? 'Mostrar Vídeo' : 'Ocultar Vídeo'}
                >
                  {previewCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            {/* Ventana de Vídeo (Ocultable si se pliega) */}
            {!previewCollapsed && (
              <div style={{
                position: 'relative',
                width: '100%',
                height: isMobile ? '180px' : '220px',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted={previewMuted}
                  autoPlay
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />

                {/* Spinner de Carga */}
                {playerLoading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(2, 6, 23, 0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      border: '3px solid #1e293b',
                      borderTopColor: '#3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '11px', color: '#93c5fa', fontWeight: '700' }}>
                      Sintonizando señal en directo...
                    </span>
                  </div>
                )}

                {/* Mensaje de Error en Reproducción */}
                {playerError && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    textAlign: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '22px' }}>📡</span>
                    <span style={{ fontSize: '12px', color: '#f87171', fontWeight: '700' }}>
                      {playerError}
                    </span>
                    <button
                      onClick={() => handlePreviewChannel(previewChannel.key, previewChannel)}
                      className="tv-btn-tap"
                      style={{
                        padding: '5px 12px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #3b82f6',
                        color: '#93c5fa',
                        borderRadius: '8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Reintentar señal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pestañas de Navegación en Móvil (Canales vs Mando) */}
        {isMobile && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0
          }}>
            <button
              onClick={() => setMobileTab('canales')}
              className="tv-btn-tap"
              style={{
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: mobileTab === 'canales' ? '2.5px solid #3b82f6' : '2.5px solid transparent',
                color: mobileTab === 'canales' ? '#60a5fa' : '#64748b',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Radio size={16} />
              <span>Canales TDT ({filteredChannels.length})</span>
            </button>
            <button
              onClick={() => setMobileTab('mando')}
              className="tv-btn-tap"
              style={{
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: mobileTab === 'mando' ? '2.5px solid #10b981' : '2.5px solid transparent',
                color: mobileTab === 'mando' ? '#34d399' : '#64748b',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sliders size={16} />
              <span>Mando Físico</span>
            </button>
          </div>
        )}

        {/* Contenido Principal: Responsive Layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* PANEL LATERAL: Selector TV y Mando Virtual */}
          {(!isMobile || mobileTab === 'mando') && (
            <div style={{
              width: isMobile ? '100%' : '320px',
              borderRight: isMobile ? 'none' : '1px solid #1e293b',
              padding: isMobile ? '14px' : '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '14px' : '18px',
              backgroundColor: '#0a0f1d',
              overflowY: 'auto'
            }} className="tv-custom-scroll">

              {/* Selector de Televisión (Versión escritorio) */}
              {!isMobile && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
                    1. Televisión de Salida
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {Object.entries(devices).map(([id, dev]) => {
                      const isSelected = selectedTv === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedTv(id)}
                          className="tv-btn-tap"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.16)' : '#131d31',
                            color: isSelected ? '#93c5fa' : '#cbd5e1',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: isSelected ? '0 0 15px rgba(37, 99, 235, 0.25)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '22px' }}>{dev.icon || '📺'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{dev.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{dev.room}</div>
                            {dev.speaker && (
                              <div style={{ fontSize: '11px', color: isSelected ? '#60a5fa' : '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🔊</span>
                                <span>Altavoz IA: {dev.speaker}</span>
                              </div>
                            )}
                          </div>
                          {isSelected && <span style={{ fontSize: '14px', color: '#3b82f6' }}>●</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tarjeta de Control Remoto Virtual */}
              <div style={{
                marginTop: isMobile ? '0' : 'auto',
                padding: isMobile ? '16px' : '18px',
                backgroundColor: '#131d31',
                borderRadius: '18px',
                border: '1px solid #233554',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Control Remoto: {currentDevice.name}
                  </div>
                  <span style={{ fontSize: '11px', color: '#3b82f6', backgroundColor: 'rgba(37, 99, 235, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                    {currentDevice.brand || 'Smart TV'}
                  </span>
                </div>

                {/* Botones de Encendido y Apagado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <button
                    onClick={() => handlePower('on')}
                    className="tv-btn-tap"
                    style={{
                      backgroundColor: '#064e3b',
                      color: '#a7f3d0',
                      border: '1px solid #059669',
                      borderRadius: '12px',
                      padding: isMobile ? '12px' : '10px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <Power size={16} />
                    <span>Encender</span>
                  </button>
                  <button
                    onClick={() => handlePower('off')}
                    className="tv-btn-tap"
                    style={{
                      backgroundColor: '#7f1d1d',
                      color: '#fecaca',
                      border: '1px solid #dc2626',
                      borderRadius: '12px',
                      padding: isMobile ? '12px' : '10px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                    }}
                  >
                    <Power size={16} />
                    <span>Apagar</span>
                  </button>
                </div>

                {/* Control de Volumen y Silencio */}
                <div style={{
                  backgroundColor: '#0a0f1d',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid #1e293b'
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Volumen y Audio
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleVolume('down')}
                      className="tv-btn-tap"
                      style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        padding: isMobile ? '12px 8px' : '10px 8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      title="Bajar Volumen"
                    >
                      <Volume1 size={18} />
                      <span>-</span>
                    </button>
                    <button
                      onClick={() => handleVolume('mute')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#fbbf24',
                        padding: isMobile ? '12px 16px' : '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Silenciar / Mute"
                    >
                      <VolumeX size={18} />
                    </button>
                    <button
                      onClick={() => handleVolume('up')}
                      className="tv-btn-tap"
                      style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        padding: isMobile ? '12px 8px' : '10px 8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      title="Subir Volumen"
                    >
                      <Volume2 size={18} />
                      <span>+</span>
                    </button>
                  </div>
                </div>

                {/* Acceso Rápido a Favoritos en el Mando */}
                {favorites.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
                        ⭐ Favoritos Rápidos:
                      </span>
                      {isMobile && (
                        <button
                          onClick={() => setMobileTab('canales')}
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Ver todos →
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="tv-custom-scroll">
                      {favorites.slice(0, 8).map((favKey) => {
                        const ch = channels[favKey] || { name: favKey };
                        return (
                          <button
                            key={favKey}
                            onClick={() => {
                              handlePreviewChannel(favKey, ch);
                              handlePlayChannel(favKey);
                            }}
                            className="tv-btn-tap"
                            style={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '12px',
                              padding: '8px 10px',
                              color: '#f8fafc',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span>▶</span>
                            <span>{ch.name || favKey}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL PRINCIPAL: Canales y Streaming */}
          {(!isMobile || mobileTab === 'canales') && (
            <div style={{
              flex: 1,
              padding: isMobile ? '12px 14px' : '18px 24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#0f172a'
            }}>
              {/* Buscador Instantáneo */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: isMobile ? '10px' : '14px',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: isMobile ? '7px 12px' : '8px 14px',
                  gap: '8px'
                }}>
                  <Search size={16} color="#94a3b8" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isMobile ? "Buscar canal (ej. Telecinco, La 1, FDF...)" : "Buscar canal (ej. Telecinco, Antena 3, La 7, FDF, TVG, Real Madrid...)"}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#f8fafc',
                      fontSize: '13px'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Mostrando <strong>{filteredChannels.length}</strong> canales
                  </div>
                )}
              </div>

              {/* Filtros de Categoría con Pestaña ⭐ Favoritos */}
              <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: isMobile ? '10px' : '16px',
                overflowX: 'auto',
                flexShrink: 0,
                paddingBottom: '4px'
              }} className="tv-custom-scroll">
                {categories.map((cat) => {
                  const isFavTab = cat === '⭐ Favoritos';
                  const isActive = activeCategory === cat && !searchQuery;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        setSearchQuery('');
                      }}
                      className="tv-btn-tap"
                      style={{
                        padding: isMobile ? '6px 12px' : '7px 14px',
                        borderRadius: '20px',
                        border: isActive
                          ? (isFavTab ? '1px solid #f59e0b' : '1px solid #3b82f6')
                          : '1px solid #1e293b',
                        backgroundColor: isActive
                          ? (isFavTab ? '#d97706' : '#2563eb')
                          : '#1e293b',
                        color: isActive ? '#ffffff' : (isFavTab ? '#fbbf24' : '#94a3b8'),
                        fontWeight: '600',
                        fontSize: isMobile ? '12px' : '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isFavTab ? `⭐ Favoritos (${favorites.length})` : cat}
                    </button>
                  );
                })}
              </div>

              {/* Parrilla de Canales con Scroll */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: isMobile ? '0' : '6px'
              }} className="tv-custom-scroll">
                {filteredChannels.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: isMobile ? '36px 16px' : '48px 20px',
                    color: '#64748b'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1' }}>
                      No hay canales en esta vista
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '320px', margin: '4px auto 0' }}>
                      {activeCategory === '⭐ Favoritos' 
                        ? 'Toca la estrella ☆ en cualquier canal para añadirlo a tus favoritos personales.' 
                        : 'Prueba a buscar con otro término o selecciona otra categoría.'}
                    </div>
                  </div>
                ) : (
                  <div
                    className="tv-channels-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(170px, 1fr))',
                      gap: isMobile ? '8px' : '12px',
                      paddingBottom: isMobile ? '70px' : '16px'
                    }}
                  >
                    {filteredChannels.map(([key, ch]) => {
                      const isFav = favSet.has(key.toLowerCase());
                      const isCurrentlyPreviewed = previewChannel?.key === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handlePreviewChannel(key, ch)}
                          className="tv-channel-card tv-btn-tap"
                          style={{
                            backgroundColor: isCurrentlyPreviewed ? '#1e3a8a' : '#1e293b',
                            border: isCurrentlyPreviewed 
                              ? '2px solid #3b82f6' 
                              : (isFav ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #334155'),
                            borderRadius: isMobile ? '12px' : '16px',
                            padding: isMobile ? '10px 6px' : '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '8px',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: isCurrentlyPreviewed ? '0 0 15px rgba(59, 130, 246, 0.35)' : (isFav ? '0 0 10px rgba(245, 158, 11, 0.1)' : 'none')
                          }}
                        >
                          {/* Botón Estrella de Favorito */}
                          <button
                            onClick={(e) => handleToggleFavorite(e, key)}
                            title={isFav ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
                            className="tv-btn-tap"
                            style={{
                              position: 'absolute',
                              top: isMobile ? '4px' : '6px',
                              right: isMobile ? '4px' : '6px',
                              width: isMobile ? '28px' : '30px',
                              height: isMobile ? '28px' : '30px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: isFav ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                              color: isFav ? '#fbbf24' : '#64748b',
                              fontSize: isMobile ? '14px' : '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 2
                            }}
                          >
                            {isFav ? '⭐' : '☆'}
                          </button>

                          {/* Logo del Canal */}
                          <div style={{
                            width: isMobile ? '46px' : '56px',
                            height: isMobile ? '46px' : '56px',
                            borderRadius: '10px',
                            backgroundColor: '#0b1120',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: '4px',
                            border: '1px solid #1e293b'
                          }}>
                            {ch.logo ? (
                              <img
                                src={ch.logo}
                                alt={ch.name}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span style={{ fontSize: isMobile ? '18px' : '22px' }}>📺</span>
                            )}
                          </div>

                          {/* Título y Categoría */}
                          <div style={{ textAlign: 'center', width: '100%', padding: '0 2px' }}>
                            <div style={{
                              fontWeight: '700',
                              fontSize: isMobile ? '11px' : '13px',
                              color: '#f8fafc',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {ch.name}
                            </div>
                            {!isMobile && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {ch.category}
                              </div>
                            )}
                          </div>

                          {/* Botones de Acción: Ver Preview vs Enviar a TV */}
                          <div style={{ display: 'flex', width: '100%', gap: '4px', marginTop: 'auto' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewChannel(key, ch);
                              }}
                              className="tv-btn-tap"
                              style={{
                                flex: 1,
                                padding: isMobile ? '5px 2px' : '6px',
                                backgroundColor: isCurrentlyPreviewed ? '#2563eb' : '#334155',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: '600',
                                fontSize: isMobile ? '10px' : '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px'
                              }}
                              title="Previsualizar aquí"
                            >
                              <Eye size={isMobile ? 11 : 12} />
                              <span>{isMobile ? 'Ver' : 'Preview'}</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!loading) handlePlayChannel(key);
                              }}
                              disabled={loading}
                              className="tv-btn-tap"
                              style={{
                                flex: 1,
                                padding: isMobile ? '5px 2px' : '6px',
                                backgroundColor: '#059669',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: '600',
                                fontSize: isMobile ? '10px' : '11px',
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px'
                              }}
                              title={`Sintonizar en ${currentDevice.name}`}
                            >
                              <Tv size={isMobile ? 11 : 12} />
                              <span>{loading ? '...' : 'TV'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Barra Rápida Flotante en Móvil */}
              {isMobile && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(11, 17, 32, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderTop: '1px solid #1e293b',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.5)',
                  zIndex: 10
                }}>
                  {/* Encendido / Apagado rápido */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handlePower('on')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#064e3b',
                        border: '1px solid #059669',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        color: '#a7f3d0',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Encender TV"
                    >
                      <Power size={13} />
                      <span>ON</span>
                    </button>
                    <button
                      onClick={() => handlePower('off')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#7f1d1d',
                        border: '1px solid #dc2626',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        color: '#fecaca',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Apagar TV"
                    >
                      <Power size={13} />
                      <span>OFF</span>
                    </button>
                  </div>

                  {/* Volumen Rápido */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleVolume('down')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '6px 10px',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                      title="Bajar Volumen"
                    >
                      🔉 -
                    </button>
                    <button
                      onClick={() => handleVolume('mute')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fbbf24',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                      title="Mute"
                    >
                      <VolumeX size={14} />
                    </button>
                    <button
                      onClick={() => handleVolume('up')}
                      className="tv-btn-tap"
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '6px 10px',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                      title="Subir Volumen"
                    >
                      🔊 +
                    </button>
                  </div>

                  {/* Botón Ir a Mando Completo */}
                  <button
                    onClick={() => setMobileTab('mando')}
                    className="tv-btn-tap"
                    style={{
                      backgroundColor: 'rgba(37, 99, 235, 0.2)',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#60a5fa',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sliders size={13} />
                    <span>Mando</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

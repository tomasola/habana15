import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Lightbulb, Sun, X, Sparkles, Moon, Zap, BookOpen, Film, CloudMoon, Keyboard, Activity, ChevronRight, ChevronLeft, ArrowUp, Square, ArrowDown } from 'lucide-react';

/**
 * Visor Fotorrealista HD Interactivo de la Habitación de Andrea
 * Layout Dual:
 * - Izquierda: Fotografía real 100% limpia sin botones que tapen la cama ni el suelo.
 * - Derecha: Panel de mandos vertical con Escenas, Luces individuales y Persiana.
 */
export function AndreaPhotoTourViewer({
  devices = [],
  onToggleDevice,
  onOpenCoverModal,
  onClose
}) {
  const [currentAngle, setCurrentAngle] = useState('window'); // 'window' | 'door'
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sobrescritura local para simulación visual instantánea a 0ms de latencia
  const [localOverrides, setLocalOverrides] = useState({});

  // 1. Lámpara Lazos Techo ("luz_lazos_andrea")
  const devLuzTecho = devices.find(d => d.id === 'luz_lazos_andrea' || d.id === 'andrea_luz_cama');
  const haLuzTechoOn = devLuzTecho && ['on', 'open'].includes(devLuzTecho.state);
  const isLuzTechoOn = localOverrides['luz_lazos_andrea'] !== undefined
    ? localOverrides['luz_lazos_andrea']
    : !!haLuzTechoOn;

  // 2. Luz detrás de la viga del aire / escritorio ("luz_ventana_andrea")
  const devLuzViga = devices.find(d => d.id === 'luz_ventana_andrea' || d.id === 'andrea_luz_ventana');
  const haLuzVigaOn = devLuzViga && ['on', 'open'].includes(devLuzViga.state);
  const isLuzVigaOn = localOverrides['luz_ventana_andrea'] !== undefined
    ? localOverrides['luz_ventana_andrea']
    : !!haLuzVigaOn;

  // 3. Tira LED borde del techo cabecero ("led_cama_andrea")
  const devLedCabecero = devices.find(d => d.id === 'led_cama_andrea' || d.id === 'andrea_led_cama');
  const haLedCabeceroOn = devLedCabecero && ['on', 'open'].includes(devLedCabecero.state);
  const isLedCabeceroOn = localOverrides['led_cama_andrea'] !== undefined
    ? localOverrides['led_cama_andrea']
    : !!haLedCabeceroOn;

  // 4. Tira LED foso entrada ("led_foso_andrea")
  const devLedEntrada = devices.find(d => d.id === 'led_foso_andrea' || d.id === 'andrea_led_foso_entrada');
  const haLedEntradaOn = devLedEntrada && ['on', 'open'].includes(devLedEntrada.state);
  const isLedEntradaOn = localOverrides['led_foso_andrea'] !== undefined
    ? localOverrides['led_foso_andrea']
    : !!haLedEntradaOn;

  // 5. Persiana motorizada
  const devPersiana = devices.find(d => d.id === 'cover.persiana_andrea' || d.id === 'persiana_andrea');
  const persianaPos = devPersiana?.attributes?.current_position !== undefined
    ? devPersiana.attributes.current_position
    : (devPersiana && ['open', 'opening'].includes(devPersiana.state) ? 100 : 0);

  // Manejador de conmutación reactiva e inmediata
  const handleToggle = useCallback((entityId, currentState, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const nextState = !currentState;
    setLocalOverrides(prev => ({ ...prev, [entityId]: nextState }));
    if (onToggleDevice && entityId) {
      onToggleDevice(entityId, nextState ? 'turn_on' : 'turn_off');
    }
  }, [onToggleDevice]);

  // Aplicar escena lumínica específica (mapa de estados para cada luz)
  const applyScenePreset = useCallback((presetMap) => {
    const stateMap = {
      'luz_lazos_andrea': isLuzTechoOn,
      'luz_ventana_andrea': isLuzVigaOn,
      'led_cama_andrea': isLedCabeceroOn,
      'led_foso_andrea': isLedEntradaOn
    };
    const newOverrides = {};
    Object.entries(presetMap).forEach(([entityId, desiredOn]) => {
      newOverrides[entityId] = desiredOn;
      if (onToggleDevice && stateMap[entityId] !== desiredOn) {
        onToggleDevice(entityId, desiredOn ? 'turn_on' : 'turn_off');
      } else if (onToggleDevice) {
        onToggleDevice(entityId, desiredOn ? 'turn_on' : 'turn_off');
      }
    });
    setLocalOverrides(prev => ({ ...prev, ...newOverrides }));
  }, [isLuzTechoOn, isLuzVigaOn, isLedCabeceroOn, isLedEntradaOn, onToggleDevice]);

  // Acciones maestras para encender o apagar todas las luces
  const handleTurnAll = useCallback((turnOn) => {
    applyScenePreset({
      'luz_lazos_andrea': turnOn,
      'luz_ventana_andrea': turnOn,
      'led_cama_andrea': turnOn,
      'led_foso_andrea': turnOn
    });
  }, [applyScenePreset]);

  // Soporte de atajos de teclado (1-4 para luces, 0/Espacio para Todo OFF, V para cambiar ángulo, Escape para salir)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === '1') {
        handleToggle('luz_lazos_andrea', isLuzTechoOn);
      } else if (e.key === '2') {
        handleToggle('luz_ventana_andrea', isLuzVigaOn);
      } else if (e.key === '3') {
        handleToggle('led_cama_andrea', isLedCabeceroOn);
      } else if (e.key === '4') {
        handleToggle('led_foso_andrea', isLedEntradaOn);
      } else if (e.key === '0' || e.code === 'Space') {
        e.preventDefault();
        handleTurnAll(false);
      } else if (e.key.toLowerCase() === 'v') {
        setCurrentAngle(prev => prev === 'window' ? 'door' : 'window');
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLuzTechoOn, isLuzVigaOn, isLedCabeceroOn, isLedEntradaOn, handleToggle, handleTurnAll, onClose]);

  // Ruta de la imagen fotográfica real según ángulo
  const imageSrc = currentAngle === 'window'
    ? '/room_photos/andrea_clean_view_window.jpg'
    : '/room_photos/andrea_clean_view_door.jpg';

  // Cálculo de exposición lumínica global orgánica
  const activeLightsList = [isLuzTechoOn, isLuzVigaOn, isLedCabeceroOn, isLedEntradaOn];
  const countActiveLights = activeLightsList.filter(Boolean).length;
  const persianaFactor = 1; // la persiana ya no altera la luminosidad de la habitacion
  const ambientBrightness = Math.min(1.22, (0.75 + (countActiveLights * 0.08)) * persianaFactor);

  // Cálculo de telemetría de vatios (W)
  const estimatedWatts = (isLuzTechoOn ? 18 : 0) +
                         (isLuzVigaOn ? 14 : 0) +
                         (isLedCabeceroOn ? 22 : 0) +
                         (isLedEntradaOn ? 12 : 0);

  // Identificación de escena activa
  const isReadingScene = !isLuzTechoOn && isLuzVigaOn && isLedCabeceroOn && !isLedEntradaOn;
  const isCinemaScene = !isLuzTechoOn && !isLuzVigaOn && isLedCabeceroOn && !isLedEntradaOn;
  const isSoftNightScene = !isLuzTechoOn && !isLuzVigaOn && !isLedCabeceroOn && isLedEntradaOn;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 35,
      background: '#020617',
      display: 'flex',
      flexDirection: 'row',
      userSelect: 'none',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* =================================================================== */}
      {/* ZONA IZQUIERDA: FOTOGRAFÍA REAL LIMPIA (100% DESPEJADA)             */}
      {/* =================================================================== */}
      <div style={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#01040a'
      }}>


        {/* FOTO BASE CON FILTRO DE EXPOSICIÓN DINÁMICO */}
        <img
          src={imageSrc}
          alt="Habitación de Andrea limpia fotorrealista"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: `brightness(${ambientBrightness}) contrast(1.02) saturate(${countActiveLights > 0 ? 1.04 : 0.88})`,
            transition: 'filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* CAPAS DE ILUMINACIÓN FOTORREALISTA (VISTA VENTANAL) */}
        {currentAngle === 'window' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {/* 1. LÁMPARA DE LAZOS TECHO */}
            <img
              src="/room_photos/light_layer_techo.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                mixBlendMode: 'screen',
                opacity: isLuzTechoOn ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none'
              }}
            />

            {/* 2. LUZ VIGA AIRE / ESCRITORIO */}
            <img
              src="/room_photos/light_layer_viga.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                mixBlendMode: 'screen',
                opacity: isLuzVigaOn ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none'
              }}
            />

            {/* 3. TIRA LED BORDE TECHO CABECERO */}
            <img
              src="/room_photos/light_layer_cabecero.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                mixBlendMode: 'screen',
                opacity: isLedCabeceroOn ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none'
              }}
            />

            {/* 4. TIRA LED FOSO ENTRADA */}
            <img
              src="/room_photos/light_layer_entrada.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                mixBlendMode: 'screen',
                opacity: isLedEntradaOn ? 0.9 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none'
              }}
            />

            {/* 5. ATENUACIÓN NATURAL DE VENTANAL SI LA PERSIANA ESTÁ CERRADA */}
            {/* Persiana alineada con el cristal del ventanal (coordenadas de la foto 1376x768, mismo recorte 'cover' que la imagen) */}
            {currentAngle === 'window' && (() => {
              const WX = 541, WY = 224, WW = 132, WH = 164;
              const blindH = Math.max(0, ((100 - persianaPos) / 100) * WH);
              return (
                <svg
                  viewBox="0 0 1376 768"
                  preserveAspectRatio="xMidYMid slice"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                >
                  <defs>
                    <pattern id="andreaBlindSlats" width="10" height="9" patternUnits="userSpaceOnUse">
                      <rect width="10" height="9" fill="#0ea5e9" fillOpacity="0.50" />
                      <rect y="7" width="10" height="2" fill="#0369a1" fillOpacity="0.55" />
                    </pattern>
                    <clipPath id="andreaWindowGlass">
                      <rect x={WX} y={WY} width={WW} height={WH} />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#andreaWindowGlass)">
                    <rect
                      x={WX}
                      y={WY}
                      width={WW}
                      height={blindH}
                      fill="url(#andreaBlindSlats)"
                      style={{ transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  </g>
                  {persianaPos < 100 && (
                    <rect
                      x={WX}
                      y={WY + blindH - 4}
                      width={WW}
                      height="5"
                      rx="1.5"
                      fill="#075985"
                      fillOpacity="0.95"
                      style={{ transition: 'y 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  )}
                </svg>
              );
            })()}

            {/* 6. GLOW DIFUSO LÁMPARA TECHO */}
            <div
              style={{
                position: 'absolute',
                left: '25%',
                top: '15%',
                width: '50%',
                height: '55%',
                opacity: isLuzTechoOn ? 0.75 : 0,
                transition: 'opacity 0.45s ease',
                background: 'radial-gradient(ellipse at center, rgba(254, 243, 199, 0.55) 0%, rgba(251, 191, 36, 0.15) 50%, transparent 80%)',
                mixBlendMode: 'soft-light',
                filter: 'blur(16px)'
              }}
            />
          </div>
        )}

        {/* BOTÓN FLOTANTE PARA REABRIR EL PANEL LATERAL SI SE HUBIERA OCULTADO */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 50,
              background: 'rgba(6, 12, 28, 0.95)',
              border: '1px solid #00f3ff',
              borderRadius: '24px 0 0 24px',
              padding: '12px 8px',
              color: '#00f3ff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.4)'
            }}
            title="Abrir panel de control lateral"
          >
            <ChevronLeft size={18} />
            <span style={{ writingMode: 'vertical-rl', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px' }}>
              CONTROLES
            </span>
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* ZONA DERECHA: PANEL LATERAL DE MANDOS Y ESCENAS                     */}
      {/* =================================================================== */}
      {isSidebarOpen && (
        <div style={{
          width: '320px',
          minWidth: '280px',
          maxWidth: '340px',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(8, 14, 32, 0.98) 0%, rgba(3, 7, 18, 0.99) 100%)',
          borderLeft: '1px solid rgba(0, 243, 255, 0.25)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          boxSizing: 'border-box'
        }}>
          {/* CABECERA DEL PANEL LATERAL */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(0, 243, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} color="#ec4899" />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
                  HABITACIÓN DE ANDREA
                </h3>
                <span style={{ fontSize: '0.66rem', color: estimatedWatts > 0 ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                  {countActiveLights} de 4 luces {estimatedWatts > 0 ? `· ${estimatedWatts} W` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(239, 68, 68, 0.18)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s'
              }}
              title="Cerrar visor y volver al Plano 3D"
            >
              <X size={13} />
              <span>Plano 3D</span>
            </button>
          </div>

          {/* CONTENIDO SCROLLABLE DE BOTONES */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* SELECTOR DE PERSPECTIVA (VENTANA vs CÓMODA) */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '10px'
            }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                📸 Perspectiva de la Estancia
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentAngle('window')}
                  style={{
                    background: currentAngle === 'window' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${currentAngle === 'window' ? '#ec4899' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: currentAngle === 'window' ? '#fff' : '#cbd5e1',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: currentAngle === 'window' ? '0 0 12px rgba(236, 72, 153, 0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🪟 Ventanal
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentAngle('door')}
                  style={{
                    background: currentAngle === 'door' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${currentAngle === 'door' ? '#ec4899' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: currentAngle === 'door' ? '#fff' : '#cbd5e1',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: currentAngle === 'door' ? '0 0 12px rgba(236, 72, 153, 0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🚪 Cómoda
                </button>
              </div>
            </div>

            {/* SECCIÓN 1: ESCENAS RÁPIDAS */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                ✨ Escenas Lumínicas
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Preset 1: Estudio / Lectura */}
                <button
                  onClick={() => applyScenePreset({
                    'luz_lazos_andrea': false,
                    'luz_ventana_andrea': true,
                    'led_cama_andrea': true,
                    'led_foso_andrea': false
                  })}
                  style={{
                    background: isReadingScene ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isReadingScene ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                    color: isReadingScene ? '#bae6fd' : '#cbd5e1',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isReadingScene ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={14} color={isReadingScene ? '#38bdf8' : '#94a3b8'} />
                    Estudio / Lectura
                  </span>
                  {isReadingScene && <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>ACTIVA</span>}
                </button>

                {/* Preset 2: Modo Cine / Relax */}
                <button
                  onClick={() => applyScenePreset({
                    'luz_lazos_andrea': false,
                    'luz_ventana_andrea': false,
                    'led_cama_andrea': true,
                    'led_foso_andrea': false
                  })}
                  style={{
                    background: isCinemaScene ? 'rgba(236, 72, 153, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isCinemaScene ? '#ec4899' : 'rgba(255,255,255,0.08)'}`,
                    color: isCinemaScene ? '#fbcfe8' : '#cbd5e1',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isCinemaScene ? '0 0 12px rgba(236, 72, 153, 0.3)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Film size={14} color={isCinemaScene ? '#ec4899' : '#94a3b8'} />
                    Cine / Relax
                  </span>
                  {isCinemaScene && <span style={{ fontSize: '0.65rem', color: '#ec4899' }}>ACTIVA</span>}
                </button>

                {/* Preset 3: Noche Suave */}
                <button
                  onClick={() => applyScenePreset({
                    'luz_lazos_andrea': false,
                    'luz_ventana_andrea': false,
                    'led_cama_andrea': false,
                    'led_foso_andrea': true
                  })}
                  style={{
                    background: isSoftNightScene ? 'rgba(168, 85, 247, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isSoftNightScene ? '#a855f7' : 'rgba(255,255,255,0.08)'}`,
                    color: isSoftNightScene ? '#e9d5ff' : '#cbd5e1',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isSoftNightScene ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CloudMoon size={14} color={isSoftNightScene ? '#a855f7' : '#94a3b8'} />
                    Noche Suave
                  </span>
                  {isSoftNightScene && <span style={{ fontSize: '0.65rem', color: '#a855f7' }}>ACTIVA</span>}
                </button>
              </div>

              {/* Botones Maestros Todo ON / Todo OFF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  onClick={() => handleTurnAll(true)}
                  style={{
                    background: countActiveLights === 4 ? 'rgba(250, 204, 21, 0.28)' : 'rgba(250, 204, 21, 0.12)',
                    border: `1px solid ${countActiveLights === 4 ? '#facc15' : 'rgba(250, 204, 21, 0.4)'}`,
                    color: '#fef08a',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Zap size={12} color="#facc15" /> Todo ON
                </button>

                <button
                  onClick={() => handleTurnAll(false)}
                  style={{
                    background: countActiveLights === 0 ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.12)',
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                    color: '#cbd5e1',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Moon size={12} color="#94a3b8" /> Todo OFF
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: LUCES INDIVIDUALES */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                💡 Interruptores de Pared
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* 1. Lámpara Techo */}
                <button
                  onClick={(e) => handleToggle('luz_lazos_andrea', isLuzTechoOn, e)}
                  style={{
                    background: isLuzTechoOn ? 'rgba(250, 204, 21, 0.22)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isLuzTechoOn ? '#facc15' : 'rgba(255,255,255,0.08)'}`,
                    color: isLuzTechoOn ? '#fef08a' : '#cbd5e1',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isLuzTechoOn ? '0 0 12px rgba(250, 204, 21, 0.35)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={14} color={isLuzTechoOn ? '#facc15' : '#94a3b8'} />
                    Lámpara Lazos Techo
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: isLuzTechoOn ? '#facc15' : 'rgba(0,0,0,0.3)',
                    color: isLuzTechoOn ? '#000' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {isLuzTechoOn ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* 2. Luz Viga Escritorio */}
                <button
                  onClick={(e) => handleToggle('luz_ventana_andrea', isLuzVigaOn, e)}
                  style={{
                    background: isLuzVigaOn ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isLuzVigaOn ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                    color: isLuzVigaOn ? '#bae6fd' : '#cbd5e1',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isLuzVigaOn ? '0 0 12px rgba(56, 189, 248, 0.35)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={14} color={isLuzVigaOn ? '#38bdf8' : '#94a3b8'} />
                    Luz Viga Escritorio
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: isLuzVigaOn ? '#38bdf8' : 'rgba(0,0,0,0.3)',
                    color: isLuzVigaOn ? '#000' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {isLuzVigaOn ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* 3. Tira LED Techo Cabecero */}
                <button
                  onClick={(e) => handleToggle('led_cama_andrea', isLedCabeceroOn, e)}
                  style={{
                    background: isLedCabeceroOn ? 'rgba(236, 72, 153, 0.22)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isLedCabeceroOn ? '#ec4899' : 'rgba(255,255,255,0.08)'}`,
                    color: isLedCabeceroOn ? '#fbcfe8' : '#cbd5e1',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isLedCabeceroOn ? '0 0 12px rgba(236, 72, 153, 0.35)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isLedCabeceroOn ? '#ec4899' : '#64748b', display: 'inline-block' }} />
                    LED Foso Cabecero
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: isLedCabeceroOn ? '#ec4899' : 'rgba(0,0,0,0.3)',
                    color: isLedCabeceroOn ? '#fff' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {isLedCabeceroOn ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* 4. Tira LED Entrada */}
                <button
                  onClick={(e) => handleToggle('led_foso_andrea', isLedEntradaOn, e)}
                  style={{
                    background: isLedEntradaOn ? 'rgba(168, 85, 247, 0.22)' : 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${isLedEntradaOn ? '#a855f7' : 'rgba(255,255,255,0.08)'}`,
                    color: isLedEntradaOn ? '#e9d5ff' : '#cbd5e1',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: isLedEntradaOn ? '0 0 12px rgba(168, 85, 247, 0.35)' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={14} color={isLedEntradaOn ? '#a855f7' : '#94a3b8'} />
                    LED Foso Entrada
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: isLedEntradaOn ? '#a855f7' : 'rgba(0,0,0,0.3)',
                    color: isLedEntradaOn ? '#fff' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {isLedEntradaOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 3: PERSIANA MOTORIZADA */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  🪟 Persiana Ventanal
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: persianaPos > 0 ? '#10b981' : '#64748b' }}>
                  {persianaPos}% {persianaPos === 0 ? '(Cerrada)' : persianaPos === 100 ? '(Abierta)' : ''}
                </span>
              </div>

              {/* Barra de progreso de la persiana */}
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '10px'
              }}>
                <div style={{
                  width: `${persianaPos}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #00f3ff)',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* Botones de control de persiana */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <button
                  onClick={() => {
                    if (onToggleDevice && devPersiana) onToggleDevice(devPersiana.id, 'open');
                  }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  title="Subir persiana al 100%"
                >
                  <ArrowUp size={12} color="#10b981" /> Subir
                </button>

                <button
                  onClick={() => {
                    if (onToggleDevice && devPersiana) onToggleDevice(devPersiana.id, 'stop');
                  }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  title="Detener movimiento"
                >
                  <Square size={10} color="#f59e0b" /> Parar
                </button>

                <button
                  onClick={() => {
                    if (onToggleDevice && devPersiana) onToggleDevice(devPersiana.id, 'close');
                  }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  title="Bajar persiana al 0%"
                >
                  <ArrowDown size={12} color="#ef4444" /> Bajar
                </button>
              </div>

              {onOpenCoverModal && devPersiana && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCoverModal(devPersiana);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34d399',
                    padding: '6px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Sun size={12} /> Ajuste Fino de Posición
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

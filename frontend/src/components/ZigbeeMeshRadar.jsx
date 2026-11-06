import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const API_BASE = '';

const ROOM_COLORS = {
  core: '#00f3ff',
  salon: '#3b82f6',
  andrea: '#ec4899',
  principal: '#8b5cf6',
  cocina: '#f97316',
  pasillo: '#10b981',
  bano: '#06b6d4',
  entrada: '#eab308',
  terraza: '#14b8a6'
};

const ROOM_NAMES = {
  core: 'Coordinador Central',
  salon: 'Salón y Comedor',
  andrea: 'Habitación Andrea',
  principal: 'Dormitorio Principal',
  cocina: 'Cocina',
  pasillo: 'Pasillo',
  bano: 'Baño',
  entrada: 'Entrada',
  terraza: 'Terraza'
};

export default function ZigbeeMeshRadar() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [hoveredLinkId, setHoveredLinkId] = useState(null);
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [showTable, setShowTable] = useState(false);
  const [svgSize, setSvgSize] = useState({ width: 900, height: 620 });
  const containerRef = useRef(null);

  const fetchMap = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/z2m-hub/network-map?_=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMapData(data);
    } catch (err) {
      console.error('Error cargando mapa de red Zigbee:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap();
    const interval = setInterval(fetchMap, 5000);
    return () => clearInterval(interval);
  }, [fetchMap]);

  // Ajustar tamaño del canvas responsivo
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setSvgSize({
          width: Math.max(700, w),
          height: Math.max(540, Math.min(720, Math.round(w * 0.58)))
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/z2m-hub/network-map/refresh`, { method: 'POST' });
      setTimeout(fetchMap, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRefreshing(false), 2000);
    }
  };

  // Coordenadas calculadas en constelación radial por estancia
  const layout = useMemo(() => {
    if (!mapData || !mapData.nodes) return { nodesPos: {}, links: [] };

    const { width, height } = svgSize;
    const cx = width / 2;
    const cy = height / 2;

    const nodesPos = {
      coordinator: { x: cx, y: cy, ...mapData.coordinator }
    };

    // Agrupar nodos por estancia
    const roomGroups = {};
    mapData.nodes.forEach(n => {
      const r = n.room || 'salon';
      if (!roomGroups[r]) roomGroups[r] = [];
      roomGroups[r].push(n);
    });

    const roomKeys = Object.keys(roomGroups);
    const roomAngleStep = (Math.PI * 2) / Math.max(1, roomKeys.length);

    // Radios de distancia en el radar
    const minR = Math.min(width, height) * 0.22;
    const maxR = Math.min(width, height) * 0.44;

    roomKeys.forEach((rk, rIdx) => {
      const baseAngle = rIdx * roomAngleStep - Math.PI / 2;
      const group = roomGroups[rk];
      const gLen = group.length;

      group.forEach((node, nIdx) => {
        // Dispersión sutil dentro del sector de la estancia
        const spreadAngle = baseAngle + ((nIdx - (gLen - 1) / 2) * (roomAngleStep * 0.45)) / Math.max(1, gLen);
        // Distancia radial: mayor LQI más cerca del coordinador
        const distFactor = 1.0 - Math.min(1.0, Math.max(0.1, node.lqi / 130.0));
        const dist = minR + distFactor * (maxR - minR) + (nIdx % 2 === 0 ? -18 : 18);

        const x = cx + Math.cos(spreadAngle) * dist;
        const y = cy + Math.sin(spreadAngle) * dist;

        nodesPos[node.id] = {
          x,
          y,
          ...node
        };
      });
    });

    return { nodesPos, links: mapData.links || [] };
  }, [mapData, svgSize]);

  const activeFocusId = hoveredNodeId || selectedNodeId;

  // Filtrado de nodos
  const filteredNodes = useMemo(() => {
    if (!mapData || !mapData.nodes) return [];
    return mapData.nodes.filter(n => {
      if (filterRoom !== 'all' && n.room !== filterRoom) return false;
      if (filterQuality === 'excellent' && n.lqi_level !== 'excellent') return false;
      if (filterQuality === 'weak' && n.lqi_level !== 'weak') return false;
      return true;
    });
  }, [mapData, filterRoom, filterQuality]);

  const activeConnectedNodeIds = useMemo(() => {
    if (!activeFocusId || !layout.links) return new Set();
    const set = new Set([activeFocusId]);
    layout.links.forEach(l => {
      if (l.source === activeFocusId) set.add(l.target);
      if (l.target === activeFocusId) set.add(l.source);
    });
    return set;
  }, [activeFocusId, layout.links]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#00f3ff', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📡</div>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Cargando Topología y Calidad de Señal Mesh...</div>
      </div>
    );
  }

  const stats = mapData?.stats || { total_nodes: 0, health_score: 0, avg_lqi: 0, excellent_count: 0, good_count: 0, fair_count: 0, weak_count: 0 };

  return (
    <div style={{
      background: 'rgba(5, 10, 25, 0.96)',
      border: '1px solid rgba(0, 243, 255, 0.28)',
      borderRadius: '16px',
      padding: '24px',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)'
    }}>
      {/* CABECERA PRINCIPAL */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 243, 255, 0.12)',
            border: '1px solid #00f3ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🌐
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px', color: '#f8fafc' }}>
                RADAR Y MAPA MESH DE COBERTURA ZIGBEE
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid #10b981',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                EN VIVO
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Visualización sub-píxel de la potencia LQI y enlaces de repetidores en la vivienda
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: refreshing ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 243, 255, 0.18)',
              border: '1px solid #00f3ff',
              color: '#00f3ff',
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: refreshing ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 1s linear' }}>
              📡
            </span>
            {refreshing ? 'Escaneando Malla...' : 'Escanear Cobertura'}
          </button>

          <button
            onClick={() => setShowTable(!showTable)}
            style={{
              background: showTable ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#c4b5fd',
              padding: '9px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {showTable ? '👁️ Ver Gráfico' : '📊 Tabla Detallada'}
          </button>
        </div>
      </div>

      {/* METRICAS KPI DE SALUD Y COBERTURA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Salud de Red */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: `conic-gradient(#10b981 ${stats.health_score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px',
            color: '#10b981'
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0a1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stats.health_score}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Salud Global</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              {stats.health_score >= 75 ? 'Óptima (Mesh Activa)' : 'Estable'}
            </div>
          </div>
        </div>

        {/* Nodos Totales */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Nodos Conectados</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#00f3ff', marginTop: '2px' }}>
            {stats.total_nodes} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>dispositivos</span>
          </div>
        </div>

        {/* LQI Medio */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Potencia Media (LQI)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {stats.avg_lqi} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>/ 255</span>
          </div>
        </div>

        {/* Enlaces de Cobertura */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Enlaces Mesh</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa', marginTop: '2px' }}>
            {layout.links.length} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>vías activas</span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS INTERACTIVOS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.75)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '18px'
      }}>
        {/* Filtro Estancia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Filtrar Estancia:</span>
          <select
            value={filterRoom}
            onChange={e => setFilterRoom(e.target.value)}
            style={{
              background: '#090f1f',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              color: '#f8fafc',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none'
            }}
          >
            <option value="all">🏠 Toda la Vivienda ({stats.total_nodes})</option>
            {mapData?.rooms?.map(r => (
              <option key={r} value={r}>
                {ROOM_NAMES[r] || r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Leyenda de Calidad LQI con Filtro Rápido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterQuality('all')}
            style={{
              background: filterQuality === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: filterQuality === 'all' ? 700 : 500
            }}
          >
            Todos ({stats.total_nodes})
          </button>

          <button
            onClick={() => setFilterQuality(filterQuality === 'excellent' ? 'all' : 'excellent')}
            style={{
              background: filterQuality === 'excellent' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              color: '#10b981',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🟢 Excelente LQI ≥70 ({stats.excellent_count})
          </button>

          <button
            onClick={() => setFilterQuality(filterQuality === 'weak' ? 'all' : 'weak')}
            style={{
              background: filterQuality === 'weak' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🔴 Límite LQI &lt;25 ({stats.weak_count})
          </button>
        </div>
      </div>

      {/* VISTA 1: CANVAS SVG RADIAL DE TOPOLOGÍA */}
      {!showTable && (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: `${svgSize.height}px`,
            background: 'radial-gradient(circle at center, rgba(10, 25, 45, 0.75) 0%, rgba(3, 7, 18, 0.98) 80%)',
            border: '1px solid rgba(0, 243, 255, 0.22)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 40px rgba(0, 243, 255, 0.08)'
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            style={{ display: 'block' }}
          >
            <defs>
              <radialGradient id="coordGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00f3ff" stopOpacity="0" />
              </radialGradient>

              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* CÍRCULOS CONCÉNTRICOS DEL RADAR */}
            {[0.22, 0.33, 0.44].map((scale, i) => (
              <circle
                key={i}
                cx={svgSize.width / 2}
                cy={svgSize.height / 2}
                r={Math.min(svgSize.width, svgSize.height) * scale}
                fill="none"
                stroke="rgba(0, 243, 255, 0.10)"
                strokeDasharray="4 6"
              />
            ))}

            {/* ETIQUETAS DE ANILLOS */}
            <text x={svgSize.width / 2 + 10} y={svgSize.height / 2 - Math.min(svgSize.width, svgSize.height) * 0.22 + 14} fill="rgba(0, 243, 255, 0.4)" fontSize="10" fontWeight="600">
              LQI ≥ 90 (Enlace Directo Fuerte)
            </text>
            <text x={svgSize.width / 2 + 10} y={svgSize.height / 2 - Math.min(svgSize.width, svgSize.height) * 0.33 + 14} fill="rgba(0, 243, 255, 0.3)" fontSize="10" fontWeight="600">
              LQI 45-89 (Salto Mesh Intermedio)
            </text>
            <text x={svgSize.width / 2 + 10} y={svgSize.height / 2 - Math.min(svgSize.width, svgSize.height) * 0.44 + 14} fill="rgba(0, 243, 255, 0.2)" fontSize="10" fontWeight="600">
              LQI &lt; 45 (Borde de Vivienda / Apoyo de Repetidor)
            </text>

            {/* LÍNEAS DE ENLACE MESH (EDGES) */}
            {layout.links.map((link, idx) => {
              const srcNode = layout.nodesPos[link.source];
              const tgtNode = layout.nodesPos[link.target];
              if (!srcNode || !tgtNode) return null;

              // Filtro de habitación si aplica
              if (filterRoom !== 'all') {
                const srcIn = srcNode.room === filterRoom;
                const tgtIn = tgtNode.room === filterRoom;
                if (!srcIn && !tgtIn && link.source !== 'coordinator' && link.target !== 'coordinator') {
                  return null;
                }
              }

              const isDirect = link.source === 'coordinator' || link.target === 'coordinator';
              const isFocused =
                activeFocusId &&
                (link.source === activeFocusId || link.target === activeFocusId);

              // Color según nivel de LQI
              let strokeColor = '#10b981'; // excellent
              if (link.lqi_level === 'good') strokeColor = '#06b6d4';
              else if (link.lqi_level === 'fair') strokeColor = '#f59e0b';
              else if (link.lqi_level === 'weak') strokeColor = '#ef4444';

              const opacity = activeFocusId
                ? isFocused ? 1.0 : 0.08
                : isDirect ? 0.35 : 0.55;

              const strokeWidth = isFocused ? 3.5 : isDirect ? 1.5 : 2.0;

              return (
                <g key={`link-${idx}`}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    strokeDasharray={link.lqi_level === 'weak' ? '5 5' : 'none'}
                    style={{ transition: 'all 0.25s ease' }}
                  />

                  {/* Etiqueta de LQI sobre la línea si está en foco o enlaces fuertes */}
                  {(isFocused || link.lqi >= 80) && !activeFocusId && (
                    <text
                      x={(srcNode.x + tgtNode.x) / 2}
                      y={(srcNode.y + tgtNode.y) / 2 - 3}
                      fill={strokeColor}
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      opacity={opacity}
                    >
                      {link.lqi}
                    </text>
                  )}
                </g>
              );
            })}

            {/* NODO CENTRAL: COORDINADOR ZIGBEE */}
            <g
              transform={`translate(${svgSize.width / 2}, ${svgSize.height / 2})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedNodeId(selectedNodeId === 'coordinator' ? null : 'coordinator')}
            >
              <circle r="46" fill="url(#coordGlow)" />
              <circle r="22" fill="#030712" stroke="#00f3ff" strokeWidth="2.5" filter="url(#neonGlow)" />
              <text textAnchor="middle" dy="5" fontSize="16">📻</text>
              <text textAnchor="middle" dy="36" fill="#00f3ff" fontSize="11" fontWeight="700" letterSpacing="0.5px">
                COORDINADOR
              </text>
              <text textAnchor="middle" dy="48" fill="#94a3b8" fontSize="9" fontWeight="500">
                20 dBm (USB)
              </text>
            </g>

            {/* NODOS PERIFÉRICOS (PLACAS Y CONTROLADORES) */}
            {filteredNodes.map(node => {
              const pos = layout.nodesPos[node.id];
              if (!pos) return null;

              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnectedToFocus = activeConnectedNodeIds.has(node.id);

              const opacity = activeFocusId
                ? isConnectedToFocus ? 1.0 : 0.20
                : 1.0;

              const rColor = ROOM_COLORS[node.room] || '#00f3ff';

              // Color del anillo según LQI
              let lqiRingColor = '#10b981';
              if (node.lqi_level === 'good') lqiRingColor = '#06b6d4';
              else if (node.lqi_level === 'fair') lqiRingColor = '#f59e0b';
              else if (node.lqi_level === 'weak') lqiRingColor = '#ef4444';

              const icon = node.category === 'led_controller' ? '✨' : '💡';

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer', transition: 'opacity 0.25s ease' }}
                  opacity={opacity}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                >
                  {/* Halo de foco */}
                  {(isSelected || isHovered) && (
                    <circle r="28" fill={rColor} fillOpacity="0.25" stroke={rColor} strokeWidth="1.5" />
                  )}

                  {/* Cuerpo del nodo */}
                  <circle
                    r="16"
                    fill="#0a1020"
                    stroke={lqiRingColor}
                    strokeWidth={isSelected || isHovered ? 3 : 2}
                  />

                  {/* Icono central */}
                  <text textAnchor="middle" dy="4" fontSize="12">
                    {icon}
                  </text>

                  {/* Badge de LQI */}
                  <g transform="translate(10, -10)">
                    <rect
                      x="-8"
                      y="-7"
                      width="20"
                      height="14"
                      rx="4"
                      fill="#030712"
                      stroke={lqiRingColor}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dy="3"
                      fill={lqiRingColor}
                      fontSize="9"
                      fontWeight="800"
                    >
                      {node.lqi}
                    </text>
                  </g>

                  {/* Nombre y Estancia debajo */}
                  <text
                    textAnchor="middle"
                    dy="28"
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="600"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="39"
                    fill={rColor}
                    fontSize="8.5"
                    fontWeight="700"
                    textTransform="uppercase"
                  >
                    {ROOM_NAMES[node.room] || node.room}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* TARJETA FLOTANTE DE DETALLE AL SELECCIONAR UN NODO */}
          {activeFocusId && layout.nodesPos[activeFocusId] && (
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              maxWidth: '360px',
              background: 'rgba(9, 15, 31, 0.95)',
              border: '1px solid #00f3ff',
              borderRadius: '12px',
              padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 10
            }}>
              {(() => {
                const node = layout.nodesPos[activeFocusId];
                if (!node) return null;

                const isCoord = activeFocusId === 'coordinator';
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        {node.name}
                      </div>
                      <button
                        onClick={() => { setSelectedNodeId(null); setHoveredNodeId(null); }}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', color: ROOM_COLORS[node.room] || '#00f3ff', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>
                      {ROOM_NAMES[node.room] || node.room} · {node.role || 'Router'}
                    </div>

                    {!isCoord && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: node.lqi_level === 'excellent' ? 'rgba(16,185,129,0.2)' : (node.lqi_level === 'weak' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'),
                          border: `1px solid ${node.lqi_level === 'excellent' ? '#10b981' : (node.lqi_level === 'weak' ? '#ef4444' : '#f59e0b')}`,
                          fontSize: '12px',
                          fontWeight: 800,
                          color: node.lqi_level === 'excellent' ? '#10b981' : (node.lqi_level === 'weak' ? '#ef4444' : '#f59e0b')
                        }}>
                          LQI: {node.lqi} / 255
                        </div>

                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {node.lqi >= 70 ? '🟢 Enlace Fuerte' : (node.lqi >= 45 ? '🔵 Enlace Bueno' : (node.lqi >= 25 ? '🟡 Enlace Aceptable' : '🔴 Apoyado por Malla'))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {isCoord
                        ? 'Emite con potencia +20 dBm hacia toda la casa. Mantiene 45 enlaces activos.'
                        : (node.lqi < 30
                            ? 'Este interruptor está empotrado en pared. No viaja directo al USB: la señal salta a través de los repetidores de su estancia a máxima velocidad.'
                            : 'Actúa como repetidor de alta potencia para los dispositivos cercanos de esta habitación.')
                      }
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: TABLA DE INVENTARIO Y SALUD DETALLADA */}
      {showTable && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflowX: 'auto',
          padding: '8px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Dispositivo</th>
                <th style={{ padding: '10px' }}>Estancia</th>
                <th style={{ padding: '10px' }}>Tipo / Función</th>
                <th style={{ padding: '10px' }}>Potencia LQI</th>
                <th style={{ padding: '10px' }}>Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.sort((a, b) => b.lqi - a.lqi).map(node => (
                <tr key={node.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#f8fafc' }}>
                    {node.name}
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{node.id}</div>
                  </td>
                  <td style={{ padding: '10px', color: ROOM_COLORS[node.room] || '#fff', fontWeight: 600 }}>
                    {ROOM_NAMES[node.room] || node.room}
                  </td>
                  <td style={{ padding: '10px', color: '#cbd5e1' }}>
                    {node.role}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '11px',
                      background: node.lqi_level === 'excellent' ? 'rgba(16,185,129,0.15)' : (node.lqi_level === 'weak' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'),
                      color: node.lqi_level === 'excellent' ? '#10b981' : (node.lqi_level === 'weak' ? '#ef4444' : '#f59e0b')
                    }}>
                      {node.lqi}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#94a3b8' }}>
                    {node.lqi >= 70 ? '🟢 Excelente (Llega directo)' : (node.lqi >= 45 ? '🔵 Bueno' : (node.lqi >= 25 ? '🟡 Aceptable (Repetido)' : '🔴 Empotrado (Ruta por repetidor)'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PANEL DIDÁCTICO INFERIOR: CÓMO FUNCIONA LA RED MESH */}
      <div style={{
        marginTop: '20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(9, 15, 31, 0.85))',
        border: '1px solid rgba(0, 243, 255, 0.18)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <div style={{ fontSize: '24px' }}>💡</div>
        <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
          <strong style={{ color: '#00f3ff' }}>¿Por qué algunos interruptores muestran LQI de 18-25 y funcionan perfectamente?</strong>
          <br />
          La red Zigbee es una <strong>malla autorreparable (Mesh)</strong>. Las placas de pared y controladores de tiras LED están conectados a la corriente de 230V, por lo que <strong>todos actúan como antenas repetidoras</strong>. Un interruptor al final de la casa no necesita llegar con señal directa al pincho USB: envía la señal a la placa de su misma habitación (que tiene LQI &gt; 100), y ésta la propaga al coordinador en menos de 5 milisegundos.
        </div>
      </div>
    </div>
  );
}

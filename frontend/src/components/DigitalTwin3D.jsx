import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Settings, Plus, Trash2, Save, RotateCcw, Lightbulb, Sun, Layers, X, CornerDownRight, Square, Compass, Power, Footprints, Camera, Search, Activity, Sparkles, Check } from 'lucide-react';
import { AndreaPhotoTourViewer } from './AndreaPhotoTourViewer';

const API_BASE = "";

// Paleta de colores temáticos de HABANA
const PRESET_COLORS = [
  { name: 'Cian Neón', hex: '#00f3ff' },
  { name: 'Magenta Ciberpunk', hex: '#ec4899' },
  { name: 'Naranja Fuego', hex: '#f97316' },
  { name: 'Verde Esmeralda', hex: '#10b981' },
  { name: 'Ámbar Pasillo', hex: '#f59e0b' },
  { name: 'Violeta Neural', hex: '#a855f7' },
  { name: 'Azul Hielo', hex: '#38bdf8' },
  { name: 'Verde Terraza', hex: '#14b8a6' },
  { name: 'Rojo Alerta', hex: '#ef4444' }
];

// Paleta de suelos arquitectónicos y acabados
const PRESET_FLOOR_COLORS = [
  { name: 'Gris Pizarra / Slate', hex: '#222834' },
  { name: 'Microcemento Neutro', hex: '#2b3240' },
  { name: 'Gris Titanio Suave', hex: '#374151' },
  { name: 'Microcemento Nórdico Claro', hex: '#475569' },
  { name: 'Hormigón Blanco / Mármol', hex: '#64748b' },
  { name: 'Tarima Roble Cálido', hex: '#5a4632' },
  { name: 'Madera Nogal Oscuro', hex: '#382b20' },
  { name: 'Porcelánico Beige / Arena', hex: '#4a443b' },
  { name: 'Baldosa Terracota Cálida', hex: '#5c3426' },
  { name: 'Carbón Mate Profundo', hex: '#181f2a' },
  { name: 'Ciberpunk Obsidiana', hex: '#0f172a' }
];

// Componente de mobiliario minimalista 3D esquemático para maquetas arquitectónicas
function SchematicFurniture({ roomId, size, isIlluminated, accentColor, highContrast = false }) {
  const [w, h, d] = size;
  const isLight = isIlluminated;
  const matMain = {
    color: isLight 
      ? (highContrast ? '#cbd5e1' : '#94a3b8') 
      : (highContrast ? '#64748b' : '#475569'),
    roughness: 0.65,
    metalness: 0.15
  };
  const matAccent = {
    color: isLight 
      ? (highContrast ? '#f1f5f9' : '#cbd5e1') 
      : (highContrast ? '#94a3b8' : '#64748b'),
    roughness: 0.5,
    metalness: 0.1
  };
  const matDark = {
    color: highContrast ? '#334155' : '#1e293b',
    roughness: 0.7,
    metalness: 0.2
  };
  const matGlass = {
    color: '#38bdf8',
    transparent: true,
    opacity: 0.35,
    roughness: 0.2
  };

  if (roomId === 'salon') {
    return (
      <group position={[0, 0, 0]}>
        {/* Sofá principal en L */}
        <group position={[-w * 0.12, 0.18, d * 0.12]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[Math.min(3.6, w * 0.45), 0.36, 1.0]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[(-Math.min(3.6, w * 0.45) / 2) + 0.45, 0, -0.6]}>
            <boxGeometry args={[0.9, 0.36, 1.2]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[0, 0.24, 0.42]}>
            <boxGeometry args={[Math.min(3.6, w * 0.45), 0.28, 0.16]} />
            <meshStandardMaterial {...matAccent} />
          </mesh>
        </group>
        {/* Mesa de centro baja */}
        <mesh position={[-w * 0.12 + 0.2, 0.12, -d * 0.05]}>
          <boxGeometry args={[1.3, 0.2, 0.7]} />
          <meshStandardMaterial {...matDark} />
        </mesh>
        {/* Mueble TV bajo con pantalla */}
        <group position={[-w * 0.12, 0.18, -d * 0.35]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.2, 0.32, 0.38]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[1.7, 0.75, 0.05]} />
            <meshStandardMaterial color={isLight ? '#0f172a' : '#020617'} roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      </group>
    );
  }

  if (roomId === 'andrea') {
    return (
      <group position={[0, 0, 0]}>
        {/* Cama Andrea con cabecero capitoné */}
        <group position={[-w * 0.08, 0.2, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.9, 0.38, 1.5]} />
            <meshStandardMaterial {...matAccent} />
          </mesh>
          <mesh position={[-1.0, 0.24, 0]}>
            <boxGeometry args={[0.12, 0.8, 1.6]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[-0.65, 0.22, 0]}>
            <boxGeometry args={[0.38, 0.1, 1.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </mesh>
          <mesh position={[-0.92, 0.15, 1.05]}>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
        </group>
        {/* Cómoda / espejo */}
        <mesh position={[w * 0.26, 0.35, -d * 0.18]}>
          <boxGeometry args={[1.1, 0.68, 0.42]} />
          <meshStandardMaterial {...matMain} />
        </mesh>
      </group>
    );
  }

  if (roomId === 'principal') {
    return (
      <group position={[0, 0, 0]}>
        {/* Cama King-Size matrimonio */}
        <group position={[0, 0.22, -d * 0.05]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.0, 0.4, 1.8]} />
            <meshStandardMaterial {...matAccent} />
          </mesh>
          <mesh position={[-1.06, 0.28, 0]}>
            <boxGeometry args={[0.12, 0.88, 2.7]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
          <mesh position={[-0.95, 0.15, -1.15]}>
            <boxGeometry args={[0.42, 0.3, 0.42]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[-0.95, 0.15, 1.15]}>
            <boxGeometry args={[0.42, 0.3, 0.42]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
        </group>
        {/* Armario empotrado frente a la cama */}
        <mesh position={[w * 0.36, 0.55, 0]}>
          <boxGeometry args={[0.48, 1.1, Math.min(3.8, d * 0.72)]} />
          <meshStandardMaterial {...matDark} />
        </mesh>
      </group>
    );
  }

  if (roomId === 'cocina') {
    return (
      <group position={[0, 0, 0]}>
        {/* Encimera y muebles cocina */}
        <group position={[0, 0.38, 0]}>
          <mesh position={[-w * 0.12, 0, -d * 0.32]}>
            <boxGeometry args={[Math.min(4.8, w * 0.6), 0.76, 0.68]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
          <mesh position={[-w * 0.12, 0.4, -d * 0.32]}>
            <boxGeometry args={[Math.min(4.8, w * 0.6) + 0.02, 0.04, 0.7]} />
            <meshStandardMaterial color={isLight ? '#f1f5f9' : '#94a3b8'} roughness={0.3} />
          </mesh>
          {/* Isla central cocina */}
          <mesh position={[-w * 0.05, 0, d * 0.1]}>
            <boxGeometry args={[1.7, 0.76, 0.85]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[-w * 0.05, 0.4, d * 0.1]}>
            <boxGeometry args={[1.75, 0.04, 0.9]} />
            <meshStandardMaterial color={isLight ? '#f8fafc' : '#cbd5e1'} roughness={0.3} />
          </mesh>
        </group>
      </group>
    );
  }

  if (roomId === 'bano') {
    return (
      <group position={[0, 0, 0]}>
        {/* Mueble lavabo suspendido */}
        <group position={[-w * 0.2, 0.32, -d * 0.22]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.0, 0.46, 0.48]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[0, 0.5, -0.22]}>
            <boxGeometry args={[0.85, 0.5, 0.03]} />
            <meshStandardMaterial color={isLight ? '#e0f2fe' : '#475569'} emissive={isLight ? '#38bdf8' : '#000000'} emissiveIntensity={isLight ? 0.35 : 0} />
          </mesh>
        </group>
        {/* Plato de ducha con mampara de cristal */}
        <group position={[w * 0.2, 0, d * 0.18]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[1.0, 0.08, 1.0]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.52, -0.48]}>
            <boxGeometry args={[0.96, 0.9, 0.03]} />
            <meshStandardMaterial {...matGlass} />
          </mesh>
        </group>
      </group>
    );
  }

  if (roomId === 'despacho') {
    return (
      <group position={[0, 0, 0]}>
        {/* Mesa de despacho */}
        <group position={[0, 0.32, 0]}>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[1.5, 0.05, 0.75]} />
            <meshStandardMaterial {...matMain} />
          </mesh>
          <mesh position={[-0.68, 0, 0]}>
            <boxGeometry args={[0.05, 0.6, 0.7]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
          <mesh position={[0.68, 0, 0]}>
            <boxGeometry args={[0.05, 0.6, 0.7]} />
            <meshStandardMaterial {...matDark} />
          </mesh>
          <mesh position={[0, 0.55, -0.2]}>
            <boxGeometry args={[0.9, 0.32, 0.04]} />
            <meshStandardMaterial color={isLight ? '#38bdf8' : '#0f172a'} emissive={isLight ? '#0284c7' : '#000000'} emissiveIntensity={isLight ? 0.25 : 0} />
          </mesh>
        </group>
      </group>
    );
  }

  if (roomId === 'terraza') {
    return (
      <group position={[0, 0, 0]}>
        {/* Mesa exterior redonda y sillas */}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.05, 16]} />
          <meshStandardMaterial {...matDark} />
        </mesh>
        <mesh position={[-1.0, 0.16, 0]}>
          <boxGeometry args={[0.55, 0.3, 0.55]} />
          <meshStandardMaterial {...matMain} />
        </mesh>
        <mesh position={[1.0, 0.16, 0]}>
          <boxGeometry args={[0.55, 0.3, 0.55]} />
          <meshStandardMaterial {...matMain} />
        </mesh>
      </group>
    );
  }

  return null;
}

// Generadores de suelo temático arquitectónico armónico derivado del color de la habitación
export function getThematicFloorColor(accentColor) {
  if (!accentColor) return '#18202f';
  try {
    let c = accentColor.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    // Suelo cromático profundo elegante: 24% del color base + base arquitectónica
    const tr = Math.round(r * 0.24 + 14);
    const tg = Math.round(g * 0.24 + 16);
    const tb = Math.round(b * 0.24 + 22);
    return `rgb(${tr}, ${tg}, ${tb})`;
  } catch (e) {
    return '#18202f';
  }
}

export function getThematicFloorColorHighContrast(accentColor) {
  if (!accentColor) return '#293548';
  try {
    let c = accentColor.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    // Modo alto contraste para móviles: suelo un 42% saturado y claramente diferenciable
    const tr = Math.round(r * 0.42 + 20);
    const tg = Math.round(g * 0.42 + 22);
    const tb = Math.round(b * 0.42 + 32);
    return `rgb(${tr}, ${tg}, ${tb})`;
  } catch (e) {
    return '#293548';
  }
}

// Componente para una habitación 3D interactiva (Soporta Rectangular o en Forma de L, persianas orientables y texto Billboard)
function RoomZone3D({
  zone,
  isSelected,
  isActiveRoom,
  isEditMode,
  showEnergyHeatmap,
  twinStyle = 'architectural',
  highContrast = false,
  devices,
  onSelectZone,
  onToggleDevice,
  onOpenCoverModal,
  onOpenRoomModal
}) {
  const [hovered, setHovered] = useState(false);
  const { 
    id, 
    name, 
    position, 
    size, 
    shape = 'box', 
    lTurn = { direction: 'left', positionOnArm: 'back', length: 4.8, width: 2.0 },
    coverWall = 'front', // 'front', 'back', 'left', 'right'
    coverOffset = 0.0,
    coverWidth = 2.6,
    accentColor = '#00f3ff', 
    lights = [], 
    ledStrips = [], 
    covers = [] 
  } = zone;

  // Estado de las luces asignadas
  const activeLights = lights.map(lightId => {
    const dev = devices.find(d => d.id === lightId);
    return {
      id: lightId,
      name: dev?.name || lightId,
      isOn: dev && ['on', 'open', 'playing'].includes(dev.state)
    };
  });

  // Estado de las tiras LED asignadas
  const activeLedStrips = ledStrips.map(ledId => {
    const dev = devices.find(d => d.id === ledId);
    return {
      id: ledId,
      name: dev?.name || ledId,
      isOn: dev && ['on', 'open', 'playing'].includes(dev.state)
    };
  });

  // Estado de persianas
  const activeCovers = covers.map(coverId => {
    const dev = devices.find(d => d.id === coverId);
    return {
      id: coverId,
      name: dev?.name || coverId,
      isOpen: dev && ['open', 'opening'].includes(dev.state)
    };
  });

  const anyLightOn = activeLights.some(l => l.isOn);
  const anyLedOn = activeLedStrips.some(l => l.isOn);
  const isIlluminated = anyLightOn || anyLedOn;

  // Cálculo del consumo energético en vatios (W) y color del Mapa de Calor
  const roomWatts = useMemo(() => {
    let w = 0;
    activeLights.forEach(l => { if (l.isOn) w += 16; });
    activeLedStrips.forEach(led => { if (led.isOn) w += 22; });
    return w;
  }, [activeLights, activeLedStrips]);

  const heatmapMeta = useMemo(() => {
    if (roomWatts === 0) return { color: '#10b981', floor: '#064e3b', label: '0W Eco' };
    if (roomWatts < 25) return { color: '#00f3ff', floor: '#083344', label: `${roomWatts}W Bajo` };
    if (roomWatts <= 50) return { color: '#f59e0b', floor: '#451a03', label: `${roomWatts}W Medio` };
    return { color: '#ec4899', floor: '#500724', label: `${roomWatts}W Alto` };
  }, [roomWatts]);

  // Color temático y suelo de la estancia (armonizado con el color de la estancia)
  const isArch = twinStyle === 'architectural';
  const effectiveAccentColor = zone.accentColor || zone.color || '#00f3ff';
  const thematicFloor = highContrast
    ? getThematicFloorColorHighContrast(effectiveAccentColor)
    : getThematicFloorColor(effectiveAccentColor);

  // El suelo adopta el color temático de la habitación (eliminando suelos grises planos)
  const computedFloorColor = showEnergyHeatmap
    ? heatmapMeta.floor
    : thematicFloor;

  const computedEmissive = showEnergyHeatmap
    ? heatmapMeta.color
    : (isIlluminated
      ? effectiveAccentColor
      : (isEditMode && isSelected
        ? effectiveAccentColor
        : '#000000'));

  const computedEmissiveIntensity = showEnergyHeatmap
    ? 0.35
    : (isIlluminated
      ? (highContrast ? 0.32 : 0.20)
      : (isEditMode && isSelected
        ? 0.16
        : 0));

  const floorRoughness = isArch ? (highContrast ? 0.58 : 0.72) : 0.6;
  const floorMetalness = isArch ? (highContrast ? 0.25 : 0.18) : 0.3;

  const wallOutlineColor = showEnergyHeatmap
    ? heatmapMeta.color
    : (isEditMode && isSelected
      ? effectiveAccentColor
      : (isIlluminated
        ? effectiveAccentColor
        : (twinStyle === 'cyberpunk'
          ? effectiveAccentColor
          : (isSelected || isActiveRoom
            ? effectiveAccentColor
            : (hovered
              ? '#38bdf8'
              : (highContrast ? '#94a3b8' : effectiveAccentColor))))));

  const wallOutlineOpacity = showEnergyHeatmap
    ? 0.95
    : (isEditMode && isSelected
      ? 1.0
      : (isIlluminated
        ? 1.0
        : (twinStyle === 'cyberpunk' ? 0.85 : (highContrast ? 0.85 : 0.65))));

  const wallOutlineWidth = (showEnergyHeatmap || isSelected || isActiveRoom || hovered || isEditMode) ? 2 : 1;

  // Cálculo de segmentos geométricos si la habitación es en Forma de L
  const isLShape = shape === 'L';
  const arm1Size = size;
  const turnLen = lTurn?.length || 4.8;
  const turnW = lTurn?.width || (size[0] > 2.5 ? 2.0 : size[0]);
  const turnDir = lTurn?.direction || 'left';
  const turnSide = lTurn?.positionOnArm || 'back';

  const arm2Pos = useMemo(() => {
    if (!isLShape) return [0, 0, 0];
    const xOffset = turnDir === 'left' ? (-size[0] / 2 - turnLen / 2) : (size[0] / 2 + turnLen / 2);
    const zOffset = turnSide === 'back' ? (-size[2] / 2 + turnW / 2) : (size[2] / 2 - turnW / 2);
    return [xOffset, 0, zOffset];
  }, [isLShape, size, turnLen, turnW, turnDir, turnSide]);

  const arm2Size = useMemo(() => [turnLen, size[1], turnW], [turnLen, size, turnW]);

  // Posiciones de las luces en el techo
  const lightPositions = useMemo(() => {
    if (activeLights.length === 0) return [[0, size[1] * 0.8, 0]];
    if (activeLights.length === 1) return [[0, size[1] * 0.8, 0]];
    if (activeLights.length === 2) {
      if (isLShape) {
        return [
          [0, size[1] * 0.8, 0],
          [arm2Pos[0] * 0.6, size[1] * 0.8, arm2Pos[2]]
        ];
      }
      return [
        [-size[0] * 0.22, size[1] * 0.8, 0],
        [size[0] * 0.22, size[1] * 0.8, 0]
      ];
    }
    if (isLShape) {
      return [
        [0, size[1] * 0.8, -size[2] * 0.25],
        [0, size[1] * 0.8, size[2] * 0.25],
        [arm2Pos[0] * 0.7, size[1] * 0.8, arm2Pos[2]]
      ];
    }
    return [
      [-size[0] * 0.25, size[1] * 0.8, -size[2] * 0.22],
      [size[0] * 0.25, size[1] * 0.8, -size[2] * 0.22],
      [0, size[1] * 0.8, size[2] * 0.22]
    ];
  }, [activeLights.length, size, isLShape, arm2Pos]);

  // Escalonamiento de altura de etiquetas para evitar solapamiento visual entre habitaciones al orbitar
  const badgeElevation = useMemo(() => {
    if (id === 'terraza') return size[1] + 1.1; // ~1.9m
    if (id === 'pasillo') return size[1] + 1.95; // ~3.35m
    if (id === 'salon' || id === 'cocina') return size[1] + 1.45; // ~2.85m
    if (id === 'principal' || id === 'andrea') return size[1] + 1.35; // ~2.75m
    if (id === 'bano' || id === 'despacho') return size[1] + 1.65; // ~3.05m
    return size[1] + 1.4;
  }, [id, size]);

  const handlePointerClick = (e) => {
    e.stopPropagation();
    if (isEditMode) {
      onSelectZone(zone);
    } else if (onOpenRoomModal) {
      onOpenRoomModal(zone);
    }
  };

  return (
    <group position={position}>
      {/* --- BRAZO 1 (Principal) --- */}
      {/* Suelo Arm 1 */}
      <mesh
        position={[0, -0.05, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={handlePointerClick}
      >
        <boxGeometry args={[arm1Size[0], 0.1, arm1Size[2]]} />
        <meshStandardMaterial
          color={computedFloorColor}
          emissive={computedEmissive}
          emissiveIntensity={computedEmissiveIntensity}
          roughness={floorRoughness}
          metalness={floorMetalness}
        />
      </mesh>

      {/* Paredes perimetrales neón / marco Arm 1 */}
      <lineSegments position={[0, arm1Size[1] / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(arm1Size[0], arm1Size[1], arm1Size[2])]} />
        <lineBasicMaterial
          color={wallOutlineColor}
          linewidth={wallOutlineWidth}
          transparent
          opacity={wallOutlineOpacity}
        />
      </lineSegments>

      {/* MARCADOR DE SELECCIÓN EN MODO EDITOR */}
      {isEditMode && isSelected && (
        <lineSegments position={[0, arm1Size[1] / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(arm1Size[0] + 0.12, arm1Size[1] + 0.12, arm1Size[2] + 0.12)]} />
          <lineBasicMaterial
            color="#ffffff"
            linewidth={3}
            transparent
            opacity={0.95}
          />
        </lineSegments>
      )}

      {/* MUROS BAJOS ARQUITECTÓNICOS "DOLLHOUSE" (Solo en modo Estudio Arquitectónico) */}
      {isArch && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.32, -arm1Size[2] / 2 + 0.04]}>
            <boxGeometry args={[arm1Size[0], 0.64, 0.08]} />
            <meshStandardMaterial 
              color={highContrast ? (isIlluminated ? '#ffffff' : '#e2e8f0') : (isIlluminated ? '#475569' : '#334155')} 
              roughness={0.5} 
              metalness={0.1} 
            />
          </mesh>
          <mesh position={[0, 0.32, arm1Size[2] / 2 - 0.04]}>
            <boxGeometry args={[arm1Size[0], 0.64, 0.08]} />
            <meshStandardMaterial 
              color={highContrast ? (isIlluminated ? '#ffffff' : '#e2e8f0') : (isIlluminated ? '#475569' : '#334155')} 
              roughness={0.5} 
              metalness={0.1} 
            />
          </mesh>
          <mesh position={[-arm1Size[0] / 2 + 0.04, 0.32, 0]}>
            <boxGeometry args={[0.08, 0.64, arm1Size[2]]} />
            <meshStandardMaterial 
              color={highContrast ? (isIlluminated ? '#ffffff' : '#e2e8f0') : (isIlluminated ? '#475569' : '#334155')} 
              roughness={0.5} 
              metalness={0.1} 
            />
          </mesh>
          <mesh position={[arm1Size[0] / 2 - 0.04, 0.32, 0]}>
            <boxGeometry args={[0.08, 0.64, arm1Size[2]]} />
            <meshStandardMaterial 
              color={highContrast ? (isIlluminated ? '#ffffff' : '#e2e8f0') : (isIlluminated ? '#475569' : '#334155')} 
              roughness={0.5} 
              metalness={0.1} 
            />
          </mesh>
        </group>
      )}

      {/* MOBILIARIO ESQUEMÁTICO MINIMALISTA 3D (Solo en modo Estudio Arquitectónico) */}
      {isArch && (
        <SchematicFurniture
          roomId={id}
          size={arm1Size}
          isIlluminated={isIlluminated}
          accentColor={accentColor}
          highContrast={highContrast}
        />
      )}

      {/* Tira LED perimetral Arm 1 */}
      {ledStrips.length > 0 && (
        <group position={[0, 0.05, 0]}>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(arm1Size[0] * 0.95, 0.04, arm1Size[2] * 0.95)]} />
            <lineBasicMaterial
              color={anyLedOn ? accentColor : '#334155'}
              linewidth={anyLedOn ? 3 : 1}
              transparent
              opacity={anyLedOn ? 1.0 : 0.25}
            />
          </lineSegments>
          {anyLedOn && (
            <pointLight position={[0, 0.25, 0]} color={accentColor} intensity={2.8} distance={arm1Size[0] * 1.6} />
          )}
        </group>
      )}

      {/* --- BRAZO 2 (Codo de la L si es LShape) --- */}
      {isLShape && (
        <group position={arm2Pos}>
          {/* Suelo Arm 2 */}
          <mesh
            position={[0, -0.05, 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onClick={handlePointerClick}
          >
            <boxGeometry args={[arm2Size[0], 0.1, arm2Size[2]]} />
            <meshStandardMaterial
              color={computedFloorColor}
              emissive={computedEmissive}
              emissiveIntensity={computedEmissiveIntensity}
              roughness={floorRoughness}
              metalness={floorMetalness}
            />
          </mesh>

          {/* Paredes perimetrales neón Arm 2 */}
          <lineSegments position={[0, arm2Size[1] / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(arm2Size[0], arm2Size[1], arm2Size[2])]} />
            <lineBasicMaterial
              color={wallOutlineColor}
              linewidth={wallOutlineWidth}
              transparent
              opacity={wallOutlineOpacity}
            />
          </lineSegments>

          {/* MARCADOR DE SELECCIÓN ARM 2 EN MODO EDITOR */}
          {isEditMode && isSelected && (
            <lineSegments position={[0, arm2Size[1] / 2, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(arm2Size[0] + 0.12, arm2Size[1] + 0.12, arm2Size[2] + 0.12)]} />
              <lineBasicMaterial
                color="#ffffff"
                linewidth={3}
                transparent
                opacity={0.95}
              />
            </lineSegments>
          )}

          {/* Tira LED perimetral Arm 2 */}
          {ledStrips.length > 0 && (
            <group position={[0, 0.05, 0]}>
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(arm2Size[0] * 0.95, 0.04, arm2Size[2] * 0.95)]} />
                <lineBasicMaterial
                  color={anyLedOn ? accentColor : '#334155'}
                  linewidth={anyLedOn ? 3 : 1}
                  transparent
                  opacity={anyLedOn ? 1.0 : 0.25}
                />
              </lineSegments>
              {anyLedOn && (
                <pointLight position={[0, 0.25, 0]} color={accentColor} intensity={2.4} distance={arm2Size[0] * 1.5} />
              )}
            </group>
          )}

          {/* Luz volumétrica en el codo */}
          {isIlluminated && (
            <pointLight position={[0, arm2Size[1] * 0.7, 0]} color={accentColor} intensity={2.6} distance={arm2Size[0] * 1.8} />
          )}
        </group>
      )}

      {/* ILUMINACIÓN VOLUMÉTRICA PUNTUAL PRINCIPAL */}
      {isIlluminated && (
        <pointLight
          position={[0, arm1Size[1] * 0.7, 0]}
          color={accentColor}
          intensity={3.2}
          distance={arm1Size[0] * 2.0}
        />
      )}

      {/* LÁMPARAS DE TECHO INDIVIDUALES */}
          {activeLights.map((l, idx) => {
            const pos = lightPositions[idx] || [0, size[1] * 0.8, 0];
            return (
              <mesh
                key={l.id || idx}
                position={pos}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDevice(l.id, l.isOn ? 'on' : 'off');
                }}
              >
                <sphereGeometry args={[0.13, 16, 16]} />
                <meshStandardMaterial
                  color={l.isOn ? accentColor : '#475569'}
                  emissive={l.isOn ? accentColor : '#000000'}
                  emissiveIntensity={l.isOn ? 2.5 : 0.05}
                />
              </mesh>
            );
          })}

          {/* VENTANAS Y PERSIANAS ORIENTABLES Y POSICIONABLES EN 3D */}
          {activeCovers.map((c, idx) => {
            const isWallEW = (coverWall === 'left' || coverWall === 'right');
            const wallLength = isWallEW ? size[2] : size[0];
            const actualWidth = Math.min(coverWidth || 2.6, wallLength * 0.88);
            const actualOffset = Math.max(-wallLength * 0.42, Math.min(wallLength * 0.42, coverOffset || 0.0));
            
            const dev = devices.find(d => d.id === c.id);
            const posVal = dev?.attributes?.current_position !== undefined 
              ? dev.attributes.current_position 
              : (c.isOpen ? 100 : 0);
            
            const openFrac = Math.max(0, Math.min(1, posVal / 100));
            const totalHeight = size[1] * 0.72;
            const blindH = Math.max(0.12, (1 - openFrac) * totalHeight);
            const blindY = (size[1] * 0.82) - (blindH / 2);

            let framePos, frameArgs, blindPos, blindArgs;
            if (coverWall === 'front') {
              framePos = [actualOffset, size[1] * 0.46, size[2] / 2];
              frameArgs = [actualWidth, totalHeight, 0.08];
              blindPos = [actualOffset, blindY, size[2] / 2 + 0.01];
              blindArgs = [actualWidth * 0.98, blindH, 0.07];
            } else if (coverWall === 'back') {
              framePos = [actualOffset, size[1] * 0.46, -size[2] / 2];
              frameArgs = [actualWidth, totalHeight, 0.08];
              blindPos = [actualOffset, blindY, -size[2] / 2 - 0.01];
              blindArgs = [actualWidth * 0.98, blindH, 0.07];
            } else if (coverWall === 'left') {
              framePos = [-size[0] / 2, size[1] * 0.46, actualOffset];
              frameArgs = [0.08, totalHeight, actualWidth];
              blindPos = [-size[0] / 2 - 0.01, blindY, actualOffset];
              blindArgs = [0.07, blindH, actualWidth * 0.98];
            } else {
              framePos = [size[0] / 2, size[1] * 0.46, actualOffset];
              frameArgs = [0.08, totalHeight, actualWidth];
              blindPos = [size[0] / 2 + 0.01, blindY, actualOffset];
              blindArgs = [0.07, blindH, actualWidth * 0.98];
            }

            return (
              <group 
                key={c.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCoverModal(c, zone);
                }}
              >
                <lineSegments position={framePos}>
                  <edgesGeometry args={[new THREE.BoxGeometry(...frameArgs)]} />
                  <lineBasicMaterial color="#a855f7" transparent opacity={0.75} />
                </lineSegments>
                <mesh position={framePos}>
                  <boxGeometry args={frameArgs} />
                  <meshStandardMaterial
                    color="#94a3b8"
                    transparent
                    opacity={0.06}
                    depthWrite={false}
                    roughness={0.1}
                    metalness={0.0}
                  />
                </mesh>
                {/* PERSIANA DE LAMAS TRASLUCIDAS: muestra posicion y movimiento sin oscurecer la estancia */}
                {(() => {
                  const slatCount = Math.max(2, Math.min(16, Math.round(blindH / 0.09)));
                  const slatStep = blindH / slatCount;
                  const slatThick = Math.min(0.03, slatStep * 0.4);
                  const slatColor = posVal > 0 ? '#38bdf8' : '#a78bfa';
                  const dims = isWallEW
                    ? [blindArgs[0], slatThick, blindArgs[2]]
                    : [blindArgs[0], slatThick, blindArgs[2]];
                  const topY = blindPos[1] + blindH / 2;
                  const railPos = [blindPos[0], topY + 0.02, blindPos[2]];
                  const barPos = [blindPos[0], blindPos[1] - blindH / 2 + 0.02, blindPos[2]];
                  return (
                    <group>
                      {Array.from({ length: slatCount }).map((_, j) => (
                        <mesh
                          key={j}
                          position={[blindPos[0], blindPos[1] - blindH / 2 + (j + 0.5) * slatStep, blindPos[2]]}
                        >
                          <boxGeometry args={dims} />
                          <meshBasicMaterial color={slatColor} transparent opacity={0.38} depthWrite={false} toneMapped={false} />
                        </mesh>
                      ))}
                      <mesh position={railPos}>
                        <boxGeometry args={[blindArgs[0], 0.04, blindArgs[2]]} />
                        <meshBasicMaterial color={slatColor} transparent opacity={0.7} depthWrite={false} />
                      </mesh>
                      <mesh position={barPos}>
                        <boxGeometry args={[blindArgs[0], 0.04, blindArgs[2]]} />
                        <meshBasicMaterial color={slatColor} transparent opacity={0.85} depthWrite={false} />
                      </mesh>
                    </group>
                  );
                })()}
              </group>
            );
          })}
      {/* MÁSTIL / PIN HOLOGRÁFICO Y ETIQUETA EN MODO BILLBOARD */}
      <>
          <group position={[0, 0, 0]}>
            <mesh position={[0, badgeElevation / 2, 0]}>
              <cylinderGeometry args={[0.012, 0.012, badgeElevation, 6]} />
              <meshBasicMaterial color={showEnergyHeatmap ? heatmapMeta.color : effectiveAccentColor} transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color={showEnergyHeatmap ? heatmapMeta.color : effectiveAccentColor} transparent opacity={0.95} />
            </mesh>
          </group>

          <Billboard position={[0, badgeElevation, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
            <mesh
              position={[0, 0, 0]}
              onClick={handlePointerClick}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
              onPointerOut={() => setHovered(false)}
            >
              <planeGeometry args={[Math.max(2.8, name.length * 0.24), 0.76]} />
              <meshBasicMaterial color={showEnergyHeatmap ? heatmapMeta.floor : (isSelected || isActiveRoom ? '#082f49' : '#020617')} opacity={0.96} depthWrite={true} depthTest={true} />
            </mesh>
            <lineSegments position={[0, 0, 0.008]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(Math.max(2.8, name.length * 0.24), 0.76)]} />
              <lineBasicMaterial
                color={showEnergyHeatmap ? heatmapMeta.color : (isEditMode && isSelected ? '#ffffff' : effectiveAccentColor)}
                transparent
                opacity={0.95}
                linewidth={2}
                depthTest={true}
              />
            </lineSegments>

            <Text
              position={[0, 0.13, 0.015]}
              fontSize={0.28}
              color={showEnergyHeatmap ? heatmapMeta.color : (isSelected || isActiveRoom ? '#00f3ff' : '#ffffff')}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              depthTest={true}
              outlineWidth={0.018}
              outlineColor="#000000"
            >
              {name.toUpperCase()}
            </Text>

            <Text
              position={[0, -0.16, 0.015]}
              fontSize={0.16}
              color={showEnergyHeatmap ? heatmapMeta.color : (isIlluminated ? '#10b981' : '#94a3b8')}
              anchorX="center"
              anchorY="middle"
              depthTest={true}
              outlineWidth={0.012}
              outlineColor="#000000"
            >
              {showEnergyHeatmap
                ? `🔥 ${heatmapMeta.label} · ${isIlluminated ? 'ACTIVO' : 'STANDBY'}`
                : (activeCovers.length > 0
                  ? `${anyLedOn ? '✨ LED' : (anyLightOn ? '💡 LUZ' : '🌙')} · 🪟 ${activeCovers[0].isOpen ? 'Persiana Abierta' : 'Persiana Cerrada'}`
                  : (anyLedOn ? '✨ LED ACTIVO' : (anyLightOn ? '💡 ILUMINADO' : '🌙 EN REPOSO')))
              }
            </Text>
          </Billboard>
        </>
    </group>
  );
}

export default function DigitalTwin3D({
  devices = [],
  onToggleDevice,
  onControlDevice,
  cleanMode = false,
  onOpenAutomations,
  onBackToPrincipal
}) {
  const controlsRef = useRef();
  const [zones, setZones] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCoverModal, setActiveCoverModal] = useState(null);
  const [activeRoomModal, setActiveRoomModal] = useState(null);
  const [showPhotoTour, setShowPhotoTour] = useState(false);
  const [activePhotoRoom, setActivePhotoRoom] = useState('andrea');
  const [roomStudioRegistry, setRoomStudioRegistry] = useState({});
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [showEnergyHeatmap, setShowEnergyHeatmap] = useState(false);
  const [directEngineMode, setDirectEngineMode] = useState('hybrid');
  const [twinStyle, setTwinStyle] = useState(() => {
    return localStorage.getItem('habana_digital_twin_style') || 'architectural';
  });

  const handleStyleChange = (style) => {
    setTwinStyle(style);
    localStorage.setItem('habana_digital_twin_style', style);
  };

  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('habana_digital_twin_contrast');
    if (saved !== null) return saved === 'high';
    return typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
  });

  const handleContrastToggle = () => {
    setHighContrast(prev => {
      const next = !prev;
      localStorage.setItem('habana_digital_twin_contrast', next ? 'high' : 'normal');
      return next;
    });
  };

  const setCameraPreset = (preset) => {
    if (!controlsRef.current) return;
    const cam = controlsRef.current.object;
    if (preset === 'iso') {
      cam.position.set(0, 12.0, 14.5);
      controlsRef.current.target.set(3.0, 0, 1.5);
    } else if (preset === 'top') {
      cam.position.set(3.0, 22.0, 1.6);
      controlsRef.current.target.set(3.0, 0, 1.5);
    } else if (preset === 'front') {
      cam.position.set(3.0, 6.0, 16.5);
      controlsRef.current.target.set(3.0, 0, 1.5);
    }
    controlsRef.current.update();
  };

  // Cargar registro de estudios fotorrealistas y modo de conexión directa
  useEffect(() => {
    fetch(`${API_BASE}/api/rooms/studio`)
      .then(r => r.json())
      .then(data => {
        if (data.rooms) setRoomStudioRegistry(data.rooms);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/direct/config?_=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.mode) setDirectEngineMode(data.mode);
      })
      .catch(() => {});
  }, []);

  // Cargar layout desde el servidor o localStorage
  useEffect(() => {
    fetch(`${API_BASE}/api/digital_twin/layout?_=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success' && Array.isArray(data.layout) && data.layout.length > 0) {
          setZones(data.layout);
        } else {
          loadFallbackLayout();
        }
      })
      .catch(() => loadFallbackLayout());
  }, []);

  const loadFallbackLayout = () => {
    const saved = localStorage.getItem('habana10_digital_twin_layout');
    if (saved) {
      try {
        setZones(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    // Layout predeterminado Zigbee2MQTT puro con Pasillo en L, Salón, Cocina, Baño, Principal, Andrea, Entrada, Terraza
    setZones([
      { id: 'salon', name: 'Salón', position: [-3.8, 0, 1.8], size: [5.2, 1.4, 4.2], shape: 'box', coverWall: 'front', coverOffset: 0.0, coverWidth: 2.8, accentColor: '#00f3ff', lights: ['luz_luz_del_comedor_d9b2', 'luz_luz_principal_del_salon_53c1', 'luz_comedor_salon', 'luz_techo_salon'], ledStrips: ['led_aparador_salon', 'led_sofa_salon', 'led_tv_salon'], covers: ['cover.persiana_salon'] },
      { id: 'cocina', name: 'Cocina', position: [-3.8, 0, -3.2], size: [5.0, 1.4, 3.8], shape: 'box', coverWall: 'back', coverOffset: 0.0, coverWidth: 2.4, accentColor: '#f97316', lights: ['luz_techo_cocina'], ledStrips: [], covers: [] },
      { id: 'pasillo', name: 'Pasillo Central (L)', position: [0.2, 0, 0.4], size: [2.0, 1.4, 9.8], shape: 'L', lTurn: { direction: 'left', positionOnArm: 'back', length: 4.8, width: 2.0 }, coverWall: 'front', coverOffset: 0.0, coverWidth: 2.0, accentColor: '#f59e0b', lights: ['luz_techo_pasillo'], ledStrips: ['led_pasillo_central'], covers: [] },
      { id: 'bano', name: 'Baño', position: [-1.8, 0, -5.8], size: [3.2, 1.4, 2.6], shape: 'box', coverWall: 'back', coverOffset: 0.0, coverWidth: 2.0, accentColor: '#06b6d4', lights: ['luz_techo_bano'], ledStrips: ['led_espejo_bano'], covers: [] },
      { id: 'principal', name: 'Dormitorio Principal', position: [4.0, 0, 2.4], size: [4.6, 1.4, 4.4], shape: 'box', coverWall: 'right', coverOffset: 0.0, coverWidth: 2.6, accentColor: '#38bdf8', lights: ['luz_techo_principal'], ledStrips: ['led_dormitorio_principal'], covers: ['cover.persiana_principal'] },
      { id: 'andrea', name: 'Habitación Andrea', position: [4.0, 0, -2.8], size: [4.6, 1.4, 3.8], shape: 'box', coverWall: 'right', coverOffset: 0.0, coverWidth: 2.6, accentColor: '#ec4899', lights: ['luz_lazos_andrea', 'luz_ventana_andrea'], ledStrips: ['led_cama_andrea', 'led_foso_andrea'], covers: ['cover.persiana_andrea'] },
      { id: 'despacho', name: 'Despacho', position: [2.6, 0, -6.0], size: [3.6, 1.4, 3.0], shape: 'box', coverWall: 'back', coverOffset: 0.0, coverWidth: 2.2, accentColor: '#a855f7', lights: [], ledStrips: [], covers: [] },
      { id: 'entrada', name: 'Entrada', position: [0.2, 0, 5.8], size: [3.0, 1.4, 2.2], shape: 'box', coverWall: 'front', coverOffset: 0.0, coverWidth: 2.0, accentColor: '#10b981', lights: ['luz_recibidor_entrada'], ledStrips: [], covers: [] },
      { id: 'terraza', name: 'Terraza Exterior', position: [-3.8, 0, 5.2], size: [9.6, 0.8, 2.6], shape: 'box', coverWall: 'front', coverOffset: 0.0, coverWidth: 3.5, accentColor: '#14b8a6', lights: ['luz_techo_salon'], ledStrips: [], covers: [] }
    ]);
  };

  // Guardar plano en el servidor y localStorage
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('habana10_digital_twin_layout', JSON.stringify(zones));
      const res = await fetch(`${API_BASE}/api/digital_twin/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(zones)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSaveStatus('¡Plano y Habitaciones guardados con éxito!');
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        setSaveStatus('Guardado en navegador (local)');
        setTimeout(() => setSaveStatus(null), 3500);
      }
    } catch (e) {
      setSaveStatus('Guardado en navegador (local)');
      setTimeout(() => setSaveStatus(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Añadir una nueva habitación
  const handleAddRoom = () => {
    const newId = `room_${Date.now()}`;
    const newZone = {
      id: newId,
      name: 'Nueva Habitación',
      position: [0, 0, 0],
      size: [4.0, 1.4, 4.0],
      shape: 'box',
      coverWall: 'front',
      accentColor: '#00f3ff',
      floorColor: '#262f3d',
      lights: [],
      ledStrips: [],
      covers: []
    };
    setZones(prev => [...prev, newZone]);
    setSelectedZone(newZone);
  };

  // Eliminar habitación
  const handleDeleteRoom = (zoneId) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (selectedZone?.id === zoneId) {
      setSelectedZone(null);
    }
  };

  // Actualizar propiedades de la zona seleccionada
  const updateSelectedZone = (field, value) => {
    if (!selectedZone) return;
    const updated = { ...selectedZone, [field]: value };
    if (field === 'accentColor') {
      updated.color = value;
      delete updated.floorColor;
    }
    setSelectedZone(updated);
    setZones(prev => prev.map(z => z.id === updated.id ? updated : z));
  };

  // Actualizar posición X o Z (alcance ampliado hasta 16m)
  const updatePosition = (axisIndex, value) => {
    if (!selectedZone) return;
    const newPos = [...selectedZone.position];
    newPos[axisIndex] = parseFloat(value) || 0;
    updateSelectedZone('position', newPos);
  };

  // Actualizar dimensiones (width, depth hasta 16m)
  const updateSize = (dimensionIndex, value) => {
    if (!selectedZone) return;
    const newSize = [...selectedZone.size];
    newSize[dimensionIndex] = Math.max(0.8, parseFloat(value) || 1.0);
    updateSelectedZone('size', newSize);
  };

  // Actualizar configuración del codo en L
  const updateLTurn = (turnField, value) => {
    if (!selectedZone) return;
    const currentTurn = selectedZone.lTurn || { direction: 'left', positionOnArm: 'back', length: 4.8, width: 2.0 };
    const updatedTurn = { ...currentTurn, [turnField]: value };
    updateSelectedZone('lTurn', updatedTurn);
  };

  // Alternar selección de un dispositivo asignado
  const toggleDeviceAssignment = (category, entityId) => {
    if (!selectedZone) return;
    const currentList = selectedZone[category] || [];
    const updatedList = currentList.includes(entityId)
      ? currentList.filter(id => id !== entityId)
      : [...currentList, entityId];
    updateSelectedZone(category, updatedList);
  };

  const availableLights = useMemo(() => {
    return devices.filter(d => (d.domain === 'light' || d.domain === 'switch'));
  }, [devices]);

  const availableLedStrips = useMemo(() => {
    return devices.filter(d => 
      /led/i.test(d.id) || /led/i.test(d.name || '') || d.domain === 'scene'
    );
  }, [devices]);

  const availableCovers = useMemo(() => {
    return devices.filter(d => d.domain === 'cover');
  }, [devices]);

  // Telemetría global de luces encendidas y consumo estimado en toda la vivienda
  const globalTelemetry = useMemo(() => {
    const activeIds = new Set();
    let illuminatedRooms = 0;
    zones.forEach(z => {
      let roomLit = false;
      [...(z.lights || []), ...(z.ledStrips || [])].forEach(entityId => {
        const dev = devices.find(d => d.id === entityId);
        if (dev && ['on', 'open', 'playing'].includes(dev.state)) {
          activeIds.add(entityId);
          roomLit = true;
        }
      });
      if (roomLit) illuminatedRooms++;
    });
    const activeCount = activeIds.size;
    const totalWatts = activeCount * 16;
    return { activeCount, illuminatedRooms, totalWatts };
  }, [zones, devices]);

  const filteredZones = useMemo(() => {
    if (!roomSearchQuery.trim()) return [];
    const q = roomSearchQuery.toLowerCase();
    return zones.filter(z => z.name.toLowerCase().includes(q) || z.id.toLowerCase().includes(q));
  }, [zones, roomSearchQuery]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: cleanMode ? '0px' : '620px',
      background: 'radial-gradient(circle at center, #091322 0%, #020617 100%)',
      borderRadius: cleanMode ? '16px' : '12px',
      border: '1px solid rgba(0,243,255,0.3)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      
      {/* BARRA SUPERIOR DE HERRAMIENTAS Y TELEMETRÍA GLOBAL (Oculta en modo limpio) */}
      {!cleanMode && (
        <div
          className="dt-sidebar"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            bottom: 12,
            width: 232,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            alignItems: 'stretch',
            overflowY: 'auto',
            padding: '10px',
            boxSizing: 'border-box',
            background: 'rgba(2, 6, 23, 0.62)',
            border: '1px solid rgba(0, 243, 255, 0.28)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <style>{`
            .dt-sidebar > button, .dt-sidebar > div { width: 100%; box-sizing: border-box; flex-shrink: 0; }
            .dt-sidebar button { white-space: normal !important; word-break: break-word; height: auto !important; min-height: 32px; overflow: visible !important; line-height: 1.25 !important; text-align: center; }
            .dt-sidebar > div { overflow: visible !important; flex-wrap: wrap; }
            .dt-sidebar > div > button { min-width: 0; padding-left: 6px !important; padding-right: 6px !important; }
            .dt-sidebar > button { justify-content: center; text-align: center; }
            .dt-sidebar > div > button { flex: 1; justify-content: center; text-align: center; white-space: normal; line-height: 1.2; }
            .dt-sidebar input { width: 100% !important; min-width: 0; }
            .dt-sidebar > div:has(input) > div:first-child { flex: 1; width: 100%; box-sizing: border-box; }
            .dt-side-label { font-size: 0.62rem; font-weight: 800; letter-spacing: 1.2px; color: #38bdf8; text-transform: uppercase; margin: 6px 2px 0 2px; border-bottom: 1px solid rgba(56,189,248,0.3); padding-bottom: 3px; }
          `}</style>
          <div style={{ background: 'rgba(2, 6, 23, 0.9)', padding: '6px 14px', borderRadius: '6px', border: '1px solid #00f3ff', color: '#00f3ff', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)' }}>
            <Layers size={15} /> GEMELO DIGITAL 3D // V2.6
          </div>

        {/* INSIGNIA DE RESUMEN GLOBAL DE CONSUMO, LUCES Y MOTOR ACTIVO */}
        <div style={{
          background: 'rgba(2, 6, 23, 0.88)',
          padding: '5px 12px',
          borderRadius: '6px',
          border: `1px solid ${globalTelemetry.activeCount > 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(71, 85, 105, 0.4)'}`,
          color: globalTelemetry.activeCount > 0 ? '#34d399' : '#94a3b8',
          fontSize: '0.74rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(8px)',
          boxShadow: globalTelemetry.activeCount > 0 ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
          transition: 'all 0.25s ease'
        }} title="Resumen global de iluminación, consumo estimado y motor domótico activo">
          <Activity size={14} color={globalTelemetry.activeCount > 0 ? '#10b981' : '#64748b'} />
          <span>💡 {globalTelemetry.activeCount} luces ON</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>⚡ ~{globalTelemetry.totalWatts} W</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{
            color: directEngineMode === 'direct' ? '#10b981' : directEngineMode === 'hybrid' ? '#00f3ff' : '#fbbf24'
          }}>
            {directEngineMode === 'direct' ? '⚡ DIRECTO' : directEngineMode === 'hybrid' ? '⚡ DIRECTO+HA' : '🏠 HA'}
          </span>
        </div>

        <div className="dt-side-label">Estilo</div>

        {/* SELECTOR COMPARATIVO DE ESTILO: CIBERPUNK VS ESTUDIO ARQUITECTÓNICO */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid #475569',
          borderRadius: '6px',
          overflow: 'hidden',
          padding: '2px',
          gap: '2px'
        }}>
          <button
            onClick={() => handleStyleChange('cyberpunk')}
            style={{
              background: twinStyle === 'cyberpunk' ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.35), rgba(168, 85, 247, 0.35))' : 'transparent',
              border: twinStyle === 'cyberpunk' ? '1px solid #00f3ff' : '1px solid transparent',
              color: twinStyle === 'cyberpunk' ? '#00f3ff' : '#94a3b8',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: twinStyle === 'cyberpunk' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
            title="Vista original: Estética Ciberpunk futurista con contornos neón y suelo oscuro"
          >
            ⚡ Ciberpunk Neón
          </button>
          <button
            onClick={() => handleStyleChange('architectural')}
            style={{
              background: twinStyle === 'architectural' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(16, 185, 129, 0.3))' : 'transparent',
              border: twinStyle === 'architectural' ? '1px solid #38bdf8' : '1px solid transparent',
              color: twinStyle === 'architectural' ? '#38bdf8' : '#94a3b8',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: twinStyle === 'architectural' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
            title="Vista nueva: Estudio Arquitectónico con suelo gris pizarra, muros bajos dollhouse y mobiliario esquemático"
          >
            🏛️ Estudio Arquitectónico
          </button>
        </div>

        {/* BOTÓN ALTO CONTRASTE (OPTIMIZADO MÓVIL Y EXTERIORES) */}
        <button
          onClick={handleContrastToggle}
          style={{
            background: highContrast 
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(234, 88, 12, 0.45))' 
              : 'rgba(15, 23, 42, 0.85)',
            border: highContrast ? '1px solid #f59e0b' : '1px solid #475569',
            color: highContrast ? '#fde047' : '#94a3b8',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: highContrast ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: highContrast ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Alternar modo de alto contraste para pantallas móviles y luz ambiente (muros blancos, suelo más nítido y mayor iluminación)"
        >
          {highContrast ? '☀️ Contraste Móvil (ON)' : '🌙 Contraste Normal'}
        </button>

        <div className="dt-side-label">Cámara</div>

        {/* PRESETS DE CÁMARA */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid #475569',
          borderRadius: '6px',
          overflow: 'hidden',
          padding: '2px',
          gap: '2px'
        }}>
          <button
            onClick={() => setCameraPreset('iso')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
            title="Vista Isométrica 3D estándar (45°)"
          >
            📐 Iso 3D
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
            title="Plano Cenital 2D (Vista Aérea)"
          >
            🧭 Cenital 2D
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
            title="Perspectiva Frontal Maqueta"
          >
            🏠 Frontal
          </button>
        </div>

        <div className="dt-side-label">Análisis</div>

        {/* BOTÓN TOGGLE MAPA DE CALOR ENERGÉTICO (W) */}
        <button
          onClick={() => setShowEnergyHeatmap(!showEnergyHeatmap)}
          style={{
            background: showEnergyHeatmap ? 'rgba(245, 158, 11, 0.28)' : 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${showEnergyHeatmap ? '#f59e0b' : '#475569'}`,
            color: showEnergyHeatmap ? '#fbbf24' : '#cbd5e1',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.76rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: showEnergyHeatmap ? '0 0 14px rgba(245, 158, 11, 0.4)' : 'none',
            transition: 'all 0.2s'
          }}
          title="Colorea cada estancia según su consumo energético actual en vatios (0W Eco, <25W, 25-50W, >50W)"
        >
          🔥 Mapa Calor W {showEnergyHeatmap ? 'ON' : ''}
        </button>

        <div className="dt-side-label">Estancias y control</div>

        {/* BUSCADOR / FILTRO RÁPIDO DE HABITACIONES */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #475569',
            borderRadius: '6px',
            padding: '4px 10px',
            backdropFilter: 'blur(8px)'
          }}>
            <Search size={13} color="#00f3ff" />
            <input
              type="text"
              placeholder="Buscar estancia..."
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.75rem',
                width: '125px',
                fontFamily: 'inherit'
              }}
            />
            {roomSearchQuery && (
              <button
                onClick={() => setRoomSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Desplegable de resultados rápidos del buscador */}
          {filteredZones.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              width: '210px',
              background: 'rgba(2, 6, 23, 0.96)',
              backdropFilter: 'blur(14px)',
              border: '1px solid #00f3ff',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 60,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)'
            }}>
              {filteredZones.map(z => (
                <button
                  key={z.id}
                  onClick={() => {
                    setRoomSearchQuery('');
                    const studioRoom = roomStudioRegistry[z.id];
                    const isPhotoActive = (z.id === 'andrea' && studioRoom?.active_in_3d !== false) || studioRoom?.active_in_3d;
                    if (isEditMode) {
                      setSelectedZone(z);
                    } else if (isPhotoActive) {
                      setActiveCoverModal(null);
                      setActiveRoomModal(null);
                      setActivePhotoRoom(z.id);
                      setShowPhotoTour(true);
                    } else {
                      setActiveCoverModal(null);
                      setActiveRoomModal(z);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${z.accentColor || '#334155'}55`,
                    borderRadius: '5px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: z.accentColor || '#00f3ff' }} />
                    {z.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Abrir ↗</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const nextMode = !isEditMode;
            setIsEditMode(nextMode);
            if (nextMode && zones.length > 0) {
              setSelectedZone(zones[0]);
            } else {
              setSelectedZone(null);
            }
          }}
          style={{
            background: isEditMode ? 'rgba(0, 243, 255, 0.25)' : 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${isEditMode ? '#00f3ff' : '#475569'}`,
            color: isEditMode ? '#00f3ff' : '#cbd5e1',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Settings size={14} /> {isEditMode ? 'Cerrar Modo Editor' : '🛠️ Configurar Plano y Habitaciones'}
        </button>

        {/* BOTÓN RÁPIDO PARA CONTROL DE PERSIANAS */}
        {availableCovers.length > 0 && (
          <button
            onClick={() => {
              if (activeCoverModal) {
                setActiveCoverModal(null);
              } else {
                const targetCover = availableCovers[0];
                const targetZone = zones.find(z => z.covers?.includes(targetCover.id)) || zones[0];
                setActiveCoverModal({ cover: targetCover, zone: targetZone });
              }
            }}
            style={{
              background: activeCoverModal ? 'rgba(168, 85, 247, 0.3)' : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${activeCoverModal ? '#a855f7' : '#64748b'}`,
              color: activeCoverModal ? '#c084fc' : '#cbd5e1',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Compass size={14} /> 🪟 Control Persianas ({availableCovers.length})
          </button>
        )}

        {/* BOTÓN RÁPIDO PARA FOTO REALISTA HD HABITACIÓN ANDREA */}
        <button
          onClick={() => {
            setShowPhotoTour(!showPhotoTour);
          }}
          style={{
            background: showPhotoTour ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.2)',
            border: `1px solid ${showPhotoTour ? '#f472b6' : '#ec4899'}`,
            color: '#f472b6',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: showPhotoTour ? '0 0 16px rgba(236, 72, 153, 0.5)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Camera size={14} /> {showPhotoTour ? 'Cerrar Vista Fotorrealista' : '📸 Habitación Andrea (Foto HD)'}
        </button>

        {isEditMode && (
          <>
            <button
              onClick={handleAddRoom}
              style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Plus size={14} /> Añadir Habitación
            </button>

            <button
              onClick={handleSaveLayout}
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.9), rgba(0, 243, 255, 0.9))',
                border: '1px solid #00f3ff',
                color: '#030712',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 16px rgba(0, 243, 255, 0.45)'
              }}
            >
              <Save size={14} /> {isSaving ? 'Guardando...' : '💾 Guardar Plano'}
            </button>

            <button
              onClick={loadFallbackLayout}
              title="Restablecer plano por defecto"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              <RotateCcw size={13} />
            </button>
          </>
        )}

        {saveStatus && (
          <div style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {saveStatus}
          </div>
        )}
      </div>
      )}

      {/* CANVAS THREE.JS (VISOR 3D AMPLIO) */}
      <div style={{ flex: 1, height: '100%', paddingRight: cleanMode ? 0 : 252, boxSizing: 'border-box' }}>
        <Canvas camera={{ position: [0, 12.0, 14.5], fov: 42 }}>
          <ambientLight intensity={highContrast ? 0.95 : (twinStyle === 'architectural' ? 0.72 : 0.55)} />
          <hemisphereLight
            skyColor={highContrast ? '#f8fafc' : '#e2e8f0'}
            groundColor={highContrast ? '#1e293b' : '#0f172a'}
            intensity={highContrast ? 0.65 : (twinStyle === 'architectural' ? 0.40 : 0.15)}
          />
          <directionalLight position={[16, 24, 14]} intensity={highContrast ? 1.05 : 0.8} />
          <directionalLight position={[-16, 14, -12]} intensity={highContrast ? 0.45 : 0.25} color="#94a3b8" />


          {/* BASE / PODIO DE CIMENTACIÓN ARQUITECTÓNICA (Solo en modo Estudio Arquitectónico) */}
          {twinStyle === 'architectural' && (
            <group position={[3.2, -0.16, 2.0]}>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[26, 0.12, 24]} />
                <meshStandardMaterial color={highContrast ? '#050811' : '#0f172a'} roughness={0.9} metalness={0.05} />
              </mesh>
              <lineSegments position={[0, 0.06, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(26, 0.12, 24)]} />
                <lineBasicMaterial color={highContrast ? '#475569' : '#334155'} transparent opacity={highContrast ? 0.85 : 0.6} />
              </lineSegments>
            </group>
          )}

          <gridHelper
            args={[
              42,
              42,
              twinStyle === 'cyberpunk' ? '#00f3ff' : '#38bdf8',
              twinStyle === 'cyberpunk' ? '#0f172a' : '#1e293b'
            ]}
            position={[0, -0.22, 0]}
          />

          {zones.map(z => (
            <RoomZone3D
              key={z.id}
              zone={z}
              isSelected={selectedZone?.id === z.id}
              isActiveRoom={activeRoomModal?.id === z.id}
              isEditMode={isEditMode}
              showEnergyHeatmap={showEnergyHeatmap}
              twinStyle={twinStyle}
              highContrast={highContrast}
              devices={devices}
              onSelectZone={setSelectedZone}
              onToggleDevice={onToggleDevice}
              onOpenCoverModal={(cover, zone) => {
                setActiveRoomModal(null);
                setActiveCoverModal({ cover, zone });
              }}
              onOpenRoomModal={(zone) => {
                const studioRoom = roomStudioRegistry[zone.id];
                const isPhotoActive = (zone.id === 'andrea' && studioRoom?.active_in_3d !== false) || studioRoom?.active_in_3d;
                if (isPhotoActive) {
                  setActiveCoverModal(null);
                  setActiveRoomModal(null);
                  setActivePhotoRoom(zone.id);
                  setShowPhotoTour(true);
                } else {
                  setActiveCoverModal(null);
                  setActiveRoomModal(zone);
                }
              }}
            />
          ))}

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2.65}
            minPolarAngle={Math.PI / 8}
            minDistance={4}
            maxDistance={28}
          />
        </Canvas>
      </div>



      {/* MODAL / HUD FLOTANTE DE CONTROL DE DISPOSITIVOS DE LA ESTANCIA */}
      {activeRoomModal && (() => {
        const currentZone = zones.find(z => z.id === activeRoomModal.id) || activeRoomModal;
        const accent = currentZone.accentColor || '#00f3ff';
        
        // Dispositivos asociados
        const roomLights = (currentZone.lights || []).map(id => {
          const dev = devices.find(d => d.id === id) || { id, name: id, state: 'off' };
          const isOn = ['on', 'open', 'playing'].includes(dev.state);
          return { dev, id, isOn };
        });

        const roomLeds = (currentZone.ledStrips || []).map(id => {
          const dev = devices.find(d => d.id === id) || { id, name: id, state: 'off' };
          const isOn = ['on', 'open', 'playing'].includes(dev.state);
          return { dev, id, isOn };
        });

        const roomCovers = (currentZone.covers || []).map(id => {
          const dev = devices.find(d => d.id === id) || { id, name: id, state: 'closed' };
          const isOpen = ['open', 'opening'].includes(dev.state);
          const pos = dev?.attributes?.current_position !== undefined 
            ? dev.attributes.current_position 
            : (isOpen ? 100 : 0);
          return { dev, id, isOpen, pos };
        });

        const totalDevices = roomLights.length + roomLeds.length + roomCovers.length;
        const anyLightOrLedOn = roomLights.some(l => l.isOn) || roomLeds.some(l => l.isOn);

        const handleToggle = (entityId, currentState) => {
          if (onToggleDevice) {
            onToggleDevice(entityId, currentState ? 'turn_off' : 'turn_on');
          }
        };

        const handleCoverAction = (entityId, action) => {
          if (onControlDevice) {
            onControlDevice(entityId, action);
          } else if (onToggleDevice) {
            onToggleDevice(entityId, action);
          }
        };

        const handleTurnOffAll = () => {
          [...roomLights, ...roomLeds].forEach(item => {
            if (item.isOn && onToggleDevice) {
              onToggleDevice(item.id, 'turn_off');
            }
          });
        };

        const handleTurnOnAll = () => {
          roomLights.forEach(item => {
            if (!item.isOn && onToggleDevice) {
              onToggleDevice(item.id, 'turn_on');
            }
          });
        };

        return (
          <div style={{
            position: 'absolute',
            top: 58,
            left: 18,
            zIndex: 40,
            width: '345px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'rgba(10, 15, 30, 0.96)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${accent}`,
            borderRadius: '10px',
            padding: '14px',
            boxShadow: `0 8px 32px ${accent}33`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          }}>
            {/* Cabecera del HUD de la estancia */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
                  <span style={{ fontSize: '0.7rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                    Control de Estancia
                  </span>
                </div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentZone.name}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => {
                    setSelectedZone(currentZone);
                    setIsEditMode(true);
                    setActiveRoomModal(null);
                  }}
                  title="Configurar en Diseñador 3D"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94a3b8',
                    padding: '4px 6px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Settings size={13} />
                </button>
                <button
                  onClick={() => setActiveRoomModal(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Botones especiales para Andrea: Modo Paseo 3D y Tour Fotorrealista HD */}
            {currentZone.id === 'andrea' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    setActiveRoomModal(null);
                    setShowPhotoTour(true);
                  }}
                  style={{
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.35), rgba(168, 85, 247, 0.35))',
                    border: '1px solid #ec4899',
                    color: '#f472b6',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 0 16px rgba(236, 72, 153, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Camera size={15} /> 📸 Abrir Tour Fotorrealista HD (Fotos Limpias)
                </button>

                <button
                  onClick={() => {
                    setActiveRoomModal(null);
                    setWalkthroughRoom('andrea');
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Footprints size={14} /> 🚶 Entrar en 1ª Persona (Modo Paseo 3D)
                </button>
              </div>
            )}

            {/* Acciones Maestras de la Habitación */}
            {(roomLights.length > 0 || roomLeds.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={handleTurnOffAll}
                  disabled={!anyLightOrLedOn}
                  style={{
                    padding: '8px 10px',
                    background: anyLightOrLedOn ? 'rgba(239, 68, 68, 0.16)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${anyLightOrLedOn ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                    color: anyLightOrLedOn ? '#fca5a5' : '#64748b',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 'bold',
                    cursor: anyLightOrLedOn ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Power size={13} /> Apagar Todo
                </button>
                <button
                  onClick={handleTurnOnAll}
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0, 243, 255, 0.15)',
                    border: '1px solid rgba(0, 243, 255, 0.5)',
                    color: '#00f3ff',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Lightbulb size={13} /> Encender Luces
                </button>
              </div>
            )}

            {/* SECCIÓN 1: LUCES DE TECHO */}
            {roomLights.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Lightbulb size={13} color={accent} /> Luces de Techo ({roomLights.length})
                </div>
                {roomLights.map(({ dev, id, isOn }) => (
                  <div
                    key={id}
                    style={{
                      background: isOn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isOn ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dev.name || id}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: isOn ? '#34d399' : '#64748b' }}>
                        {isOn ? '● Encendida' : '○ Apagada'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(id, isOn)}
                      style={{
                        padding: '5px 12px',
                        background: isOn ? '#10b981' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isOn ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                        color: isOn ? '#020617' : '#cbd5e1',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isOn ? 'ENCENDIDO' : 'APAGADO'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SECCIÓN 2: TIRAS LED / AMBIENTE */}
            {roomLeds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sun size={13} color={accent} /> Tiras LED / Ambiente ({roomLeds.length})
                </div>
                {roomLeds.map(({ dev, id, isOn }) => (
                  <div
                    key={id}
                    style={{
                      background: isOn ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isOn ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dev.name || id}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: isOn ? '#fbbf24' : '#64748b' }}>
                        {isOn ? '● Iluminando' : '○ Apagada'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(id, isOn)}
                      style={{
                        padding: '5px 12px',
                        background: isOn ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isOn ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                        color: isOn ? '#020617' : '#cbd5e1',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isOn ? 'ACTIVA' : 'APAGADA'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SECCIÓN 3: PERSIANAS / CORTINAS */}
            {roomCovers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>🪟</span> Persianas y Cortinas ({roomCovers.length})
                </div>
                {roomCovers.map(({ dev, id, isOpen, pos }) => (
                  <div
                    key={id}
                    style={{
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      borderRadius: '6px',
                      padding: '9px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dev.name || id}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#c084fc' }}>
                          Posición: {pos}% • {pos > 0 ? 'Abierta' : 'Cerrada'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveRoomModal(null);
                          setActiveCoverModal({ cover: dev, zone: currentZone });
                        }}
                        style={{
                          background: 'rgba(168, 85, 247, 0.25)',
                          border: '1px solid #a855f7',
                          color: '#e9d5ff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                        title="Abrir regulador milimétrico"
                      >
                        Ajustar ↗
                      </button>
                    </div>

                    {/* Acciones rápidas subir / stop / bajar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      <button
                        onClick={() => handleCoverAction(id, 'open_cover')}
                        style={{ padding: '5px 0', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ⬆️ Subir
                      </button>
                      <button
                        onClick={() => handleCoverAction(id, 'stop_cover')}
                        style={{ padding: '5px 0', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ⏹️ Stop
                      </button>
                      <button
                        onClick={() => handleCoverAction(id, 'close_cover')}
                        style={{ padding: '5px 0', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ⬇️ Bajar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ESTADO VACÍO SI NO TIENE DISPOSITIVOS */}
            {totalDevices === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '8px' }}>
                  Esta estancia aún no tiene dispositivos asignados.
                </div>
                <button
                  onClick={() => {
                    setSelectedZone(currentZone);
                    setIsEditMode(true);
                    setActiveRoomModal(null);
                  }}
                  style={{
                    background: 'rgba(0, 243, 255, 0.15)',
                    border: '1px solid #00f3ff',
                    color: '#00f3ff',
                    padding: '5px 12px',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Asignar Dispositivos en Diseñador
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL / HUD FLOTANTE DE CONTROL DE POSICIÓN DE PERSIANA */}
      {activeCoverModal && (() => {
        const coverId = activeCoverModal.cover.id;
        const currentDev = devices.find(d => d.id === coverId) || activeCoverModal.cover;
        const posPercent = currentDev?.attributes?.current_position !== undefined
          ? currentDev.attributes.current_position
          : (['open', 'opening'].includes(currentDev.state) ? 100 : 0);

        const handleSetPosition = (pos) => {
          if (onControlDevice) {
            onControlDevice(coverId, 'set_cover_position', pos);
          } else if (onToggleDevice) {
            onToggleDevice(coverId, 'set_cover_position', pos);
          }
        };

        const handleAction = (act) => {
          if (onControlDevice) {
            onControlDevice(coverId, act);
          } else if (onToggleDevice) {
            onToggleDevice(coverId, act);
          }
        };

        return (
          <div style={{
            position: 'absolute',
            top: 58,
            left: 18,
            zIndex: 40,
            width: '320px',
            background: 'rgba(10, 15, 30, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #a855f7',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {activeCoverModal.zone?.name || 'Habitación'}
                </span>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🪟 {currentDev.name || coverId}
                </h4>
              </div>
              <button
                onClick={() => setActiveCoverModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Selector de persiana si hay varias disponibles */}
            {availableCovers.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {availableCovers.map(cov => (
                  <button
                    key={cov.id}
                    onClick={() => setActiveCoverModal(prev => ({ ...prev, cover: cov }))}
                    style={{
                      padding: '4px 8px',
                      background: cov.id === coverId ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${cov.id === coverId ? '#a855f7' : '#334155'}`,
                      color: cov.id === coverId ? '#fff' : '#94a3b8',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cov.name || cov.id.split('.')[1]}
                  </button>
                ))}
              </div>
            )}

            {/* Estado actual */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Apertura Actual:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: posPercent > 0 ? '#10b981' : '#a855f7' }}>
                {posPercent}% {posPercent === 100 ? '(Totalmente Abierta)' : (posPercent === 0 ? '(Totalmente Cerrada)' : '(Parcial)')}
              </span>
            </div>

            {/* Slider interactivo de posición (0 - 100%) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span>Cerrada (0%)</span>
                <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>Regulador: {posPercent}%</span>
                <span>Abierta (100%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={posPercent}
                onChange={(e) => handleSetPosition(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
              />
            </div>

            {/* Presets rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {[0, 25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  onClick={() => handleSetPosition(p)}
                  style={{
                    padding: '5px 0',
                    background: posPercent === p ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${posPercent === p ? '#a855f7' : '#334155'}`,
                    color: posPercent === p ? '#fff' : '#cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: posPercent === p ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {p}%
                </button>
              ))}
            </div>

            {/* Botones de acción directa: Subir, Stop, Bajar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '2px' }}>
              <button
                onClick={() => handleAction('open_cover')}
                style={{ padding: '8px', background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ⬆️ Subir
              </button>
              <button
                onClick={() => handleAction('stop_cover')}
                style={{ padding: '8px', background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ⏹️ Parar
              </button>
              <button
                onClick={() => handleAction('close_cover')}
                style={{ padding: '8px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ⬇️ Bajar
              </button>
            </div>
          </div>
        );
      })()}

      {/* PANEL FLOTANTE LATERAL DE EDICIÓN */}
      {isEditMode && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          maxWidth: '92vw',
          background: 'rgba(7, 12, 26, 0.97)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(0, 243, 255, 0.35)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 32px rgba(0,0,0,0.75)'
        }}>
          {/* Header del panel */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} /> Diseñador 3D
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSaveLayout}
                disabled={isSaving}
                title="Guardar plano y estancias en el servidor"
                style={{
                  background: isSaving ? 'rgba(56, 189, 248, 0.3)' : 'linear-gradient(135deg, rgba(2, 132, 199, 0.9), rgba(0, 243, 255, 0.9))',
                  border: '1px solid #00f3ff',
                  color: '#030712',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 0 12px rgba(0, 243, 255, 0.4)'
                }}
              >
                <Save size={14} /> {isSaving ? 'Guardando...' : '💾 Guardar'}
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                title="Cerrar panel editor"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner de confirmación de guardado */}
            {saveStatus && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)'
              }}>
                <Check size={16} /> {saveStatus}
              </div>
            )}
            {/* Selector de habitaciones */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                Seleccionar Habitación a Editar:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {zones.map(z => {
                  const zColor = z.accentColor || z.color || '#00f3ff';
                  const isSel = selectedZone?.id === z.id;
                  return (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZone(z)}
                      style={{
                        padding: '8px',
                        background: isSel ? `${zColor}33` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSel ? zColor : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '6px',
                        color: isSel ? zColor : '#cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: isSel ? 'bold' : 'normal',
                        cursor: 'pointer',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: isSel ? `0 0 10px ${zColor}44` : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      ● {z.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedZone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Nombre de la Habitación */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Nombre de la Zona:</label>
                  <input
                    type="text"
                    value={selectedZone.name}
                    onChange={(e) => updateSelectedZone('name', e.target.value)}
                    style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                {/* FORMA DE LA HABITACIÓN (Rectangular o en L) */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>Forma Geométrica:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => updateSelectedZone('shape', 'box')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: (selectedZone.shape !== 'L') ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${(selectedZone.shape !== 'L') ? '#00f3ff' : '#334155'}`,
                        color: (selectedZone.shape !== 'L') ? '#00f3ff' : '#94a3b8',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Square size={13} /> Rectangular
                    </button>
                    <button
                      onClick={() => {
                        updateSelectedZone('shape', 'L');
                        if (!selectedZone.lTurn) {
                          updateSelectedZone('lTurn', { direction: 'left', positionOnArm: 'back', length: 4.8, width: 2.0 });
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: (selectedZone.shape === 'L') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${(selectedZone.shape === 'L') ? '#f59e0b' : '#334155'}`,
                        color: (selectedZone.shape === 'L') ? '#f59e0b' : '#94a3b8',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <CornerDownRight size={13} /> Forma de L
                    </button>
                  </div>
                </div>

                {/* CONTROLES ESPECÍFICOS DEL CODO EN L */}
                {selectedZone.shape === 'L' && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>⚙️ Ajustes del Codo (Giro L):</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Dirección del Giro:</label>
                        <select
                          value={selectedZone.lTurn?.direction || 'left'}
                          onChange={(e) => updateLTurn('direction', e.target.value)}
                          style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                          <option value="left">Izquierda (-X)</option>
                          <option value="right">Derecha (+X)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Posición en Tramo:</label>
                        <select
                          value={selectedZone.lTurn?.positionOnArm || 'back'}
                          onChange={(e) => updateLTurn('positionOnArm', e.target.value)}
                          style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                          <option value="back">Fondo (-Z)</option>
                          <option value="front">Frente (+Z)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Largo Giro: {selectedZone.lTurn?.length || 4.8}m</label>
                        <input
                          type="range"
                          min="1.5"
                          max="12.0"
                          step="0.2"
                          value={selectedZone.lTurn?.length || 4.8}
                          onChange={(e) => updateLTurn('length', parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#f59e0b' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Ancho Giro: {selectedZone.lTurn?.width || 2.0}m</label>
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.2"
                          value={selectedZone.lTurn?.width || 2.0}
                          onChange={(e) => updateLTurn('width', parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#f59e0b' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Color de Acento Neón */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Color Temático (Paredes / Neón):</label>
                    <span style={{ fontSize: '0.7rem', color: selectedZone.accentColor || selectedZone.color || '#00f3ff', fontWeight: 'bold' }}>
                      {selectedZone.accentColor || selectedZone.color || '#00f3ff'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {PRESET_COLORS.map(c => {
                      const isCurrent = (selectedZone.accentColor || selectedZone.color) === c.hex;
                      return (
                        <div
                          key={c.hex}
                          onClick={() => updateSelectedZone('accentColor', c.hex)}
                          title={c.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: c.hex,
                            cursor: 'pointer',
                            border: isCurrent ? '2px solid #fff' : '2px solid transparent',
                            transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: isCurrent ? `0 0 10px ${c.hex}` : 'none',
                            transition: 'all 0.15s'
                          }}
                        />
                      );
                    })}
                    {/* Selector de color personalizado para paredes */}
                    <input
                      type="color"
                      value={selectedZone.accentColor || selectedZone.color || '#00f3ff'}
                      onChange={(e) => updateSelectedZone('accentColor', e.target.value)}
                      title="Elegir cualquier color personalizado para paredes"
                      style={{
                        width: '26px',
                        height: '26px',
                        padding: 0,
                        border: '1px solid #64748b',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: 'transparent'
                      }}
                    />
                  </div>
                </div>

                {/* Armonización de Suelo Temático */}
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>🎨 Suelo de la Estancia:</span>
                    <span style={{ fontSize: '0.72rem', color: '#00f3ff', fontWeight: 'bold' }}>
                      ✨ Armonizado con {selectedZone.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                    El suelo adopta automáticamente un tono arquitectónico profundo derivado del color de la habitación, eliminando suelos grises planos.
                  </div>
                </div>

                {/* Posición X y Z (Desplazamiento horizontal ampliado a +/- 16m) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Posición X: ({selectedZone.position[0]}m)</label>
                    <input
                      type="range"
                      min="-16"
                      max="16"
                      step="0.2"
                      value={selectedZone.position[0]}
                      onChange={(e) => updatePosition(0, e.target.value)}
                      style={{ width: '100%', accentColor: '#00f3ff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Posición Z: ({selectedZone.position[2]}m)</label>
                    <input
                      type="range"
                      min="-16"
                      max="16"
                      step="0.2"
                      value={selectedZone.position[2]}
                      onChange={(e) => updatePosition(2, e.target.value)}
                      style={{ width: '100%', accentColor: '#00f3ff' }}
                    />
                  </div>
                </div>

                {/* Dimensiones (Ancho y Largo ampliados hasta 16m) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ancho Principal: {selectedZone.size[0]}m</label>
                    <input
                      type="range"
                      min="1.0"
                      max="16.0"
                      step="0.2"
                      value={selectedZone.size[0]}
                      onChange={(e) => updateSize(0, e.target.value)}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Largo Principal: {selectedZone.size[2]}m</label>
                    <input
                      type="range"
                      min="1.0"
                      max="16.0"
                      step="0.2"
                      value={selectedZone.size[2]}
                      onChange={(e) => updateSize(2, e.target.value)}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                </div>

                {/* ASIGNACIÓN DE LUCES */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#00f3ff', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Lightbulb size={13} /> Luces de Techo Asignadas ({selectedZone.lights?.length || 0}):
                  </label>
                  <div style={{ maxHeight: '110px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {availableLights.map(d => {
                      const isAssigned = selectedZone.lights?.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => toggleDeviceAssignment('lights', d.id)}
                          style={{
                            padding: '4px 8px',
                            background: isAssigned ? 'rgba(0,243,255,0.15)' : 'transparent',
                            color: isAssigned ? '#00f3ff' : '#94a3b8',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <input type="checkbox" checked={isAssigned} readOnly />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ASIGNACIÓN DE TIRAS LED */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sun size={13} /> Tiras LED Perimetrales ({selectedZone.ledStrips?.length || 0}):
                  </label>
                  <div style={{ maxHeight: '90px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {availableLedStrips.map(d => {
                      const isAssigned = selectedZone.ledStrips?.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => toggleDeviceAssignment('ledStrips', d.id)}
                          style={{
                            padding: '4px 8px',
                            background: isAssigned ? 'rgba(245,158,11,0.15)' : 'transparent',
                            color: isAssigned ? '#f59e0b' : '#94a3b8',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <input type="checkbox" checked={isAssigned} readOnly />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ASIGNACIÓN Y ORIENTACIÓN DE PERSIANAS */}
                {availableCovers.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Compass size={13} /> Persianas de Habitación ({selectedZone.covers?.length || 0}):
                    </label>

                    {/* SELECTOR DE ORIENTACIÓN / PARED DE LA PERSIANA */}
                    <div style={{ marginBottom: '8px', background: 'rgba(168,85,247,0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <label style={{ fontSize: '0.72rem', color: '#d8b4fe', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>
                        Pared en la que se ubica la ventana / persiana:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '10px' }}>
                        {[
                          { id: 'front', label: '⬇️ Frontal (+Z)' },
                          { id: 'back', label: '⬆️ Trasera (-Z)' },
                          { id: 'left', label: '⬅️ Izquierda (-X)' },
                          { id: 'right', label: '➡️ Derecha (+X)' }
                        ].map(w => (
                          <button
                            key={w.id}
                            onClick={() => updateSelectedZone('coverWall', w.id)}
                            style={{
                              padding: '5px 4px',
                              background: (selectedZone.coverWall || 'front') === w.id ? 'rgba(168,85,247,0.35)' : 'rgba(0,0,0,0.4)',
                              border: `1px solid ${(selectedZone.coverWall || 'front') === w.id ? '#a855f7' : '#334155'}`,
                              color: (selectedZone.coverWall || 'front') === w.id ? '#fff' : '#94a3b8',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: (selectedZone.coverWall || 'front') === w.id ? 'bold' : 'normal',
                              cursor: 'pointer',
                              textAlign: 'center'
                            }}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>

                      {/* DESPLAZAMIENTO / POSICIÓN HORIZONTAL EN LA PARED */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '3px' }}>
                          <span>Posición en Pared:</span>
                          <span style={{ color: '#c084fc', fontWeight: 'bold' }}>
                            {selectedZone.coverOffset !== undefined ? `${selectedZone.coverOffset > 0 ? '+' : ''}${selectedZone.coverOffset}m` : '0.0m (Centro)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-4.0"
                          max="4.0"
                          step="0.1"
                          value={selectedZone.coverOffset || 0}
                          onChange={(e) => updateSelectedZone('coverOffset', parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#a855f7' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
                          <span>⬅️ Izquierda</span>
                          <span>Centro (0m)</span>
                          <span>Derecha ➡️</span>
                        </div>
                      </div>

                      {/* ANCHO DE LA PERSIANA */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '3px' }}>
                          <span>Ancho de Ventana:</span>
                          <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{selectedZone.coverWidth || 2.6}m</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="4.5"
                          step="0.1"
                          value={selectedZone.coverWidth || 2.6}
                          onChange={(e) => updateSelectedZone('coverWidth', parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#a855f7' }}
                        />
                      </div>
                    </div>

                    <div style={{ maxHeight: '70px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {availableCovers.map(d => {
                        const isAssigned = selectedZone.covers?.includes(d.id);
                        return (
                          <div
                            key={d.id}
                            onClick={() => toggleDeviceAssignment('covers', d.id)}
                            style={{
                              padding: '4px 8px',
                              background: isAssigned ? 'rgba(168,85,247,0.15)' : 'transparent',
                              color: isAssigned ? '#a855f7' : '#94a3b8',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <input type="checkbox" checked={isAssigned} readOnly />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BOTÓN GUARDAR ESTA ESTANCIA ESPECÍFICA */}
                <button
                  onClick={handleSaveLayout}
                  disabled={isSaving}
                  style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    background: 'rgba(0, 243, 255, 0.15)',
                    border: '1px solid #00f3ff',
                    borderRadius: '6px',
                    color: '#00f3ff',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 0 14px rgba(0, 243, 255, 0.25)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Save size={15} /> {isSaving ? 'Guardando en Servidor...' : `💾 Guardar Cambios de "${selectedZone.name}"`}
                </button>

                {/* BOTÓN ELIMINAR ZONA */}
                <button
                  onClick={() => handleDeleteRoom(selectedZone.id)}
                  style={{
                    marginTop: '4px',
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} /> Eliminar Esta Habitación
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                👆 Selecciona una habitación arriba o pulsa sobre ella en el visor 3D para editar su tamaño, posición y luces.
              </div>
            )}
          </div>

          {/* Footer fijo del panel de edición */}
          <div style={{
            padding: '14px 18px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(5, 10, 25, 0.98)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.6)'
          }}>
            <button
              onClick={handleSaveLayout}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: isSaving
                  ? 'rgba(56, 189, 248, 0.4)'
                  : 'linear-gradient(135deg, #0284c7, #00f3ff)',
                border: 'none',
                borderRadius: '8px',
                color: '#030712',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Guardando en Servidor...' : '💾 GUARDAR PLANO Y HABITACIONES'}
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAddRoom}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#10b981',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} /> Añadir Habitación
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISOR FOTORREALISTA HD DE LA HABITACIÓN DE ANDREA (FOTOS REALES LIMPIAS CON IA) */}
      {showPhotoTour && (
        <AndreaPhotoTourViewer
          devices={devices}
          onToggleDevice={onToggleDevice}
          onOpenCoverModal={(cover) => {
            const targetZone = zones.find(z => z.id === 'andrea') || zones[0];
            setActiveCoverModal({ cover, zone: targetZone });
          }}
          onClose={() => setShowPhotoTour(false)}
        />
      )}

      {/* GUÍA DE CONTROLES INFERIOR (Solo cuando NO está en modo limpio) */}
      {!cleanMode && (
        <div style={{ position: 'absolute', bottom: 12, left: 16, zIndex: 10, background: 'rgba(2, 6, 23, 0.85)', padding: '6px 14px', borderRadius: '6px', color: '#64748b', fontSize: '0.74rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          🖱️ Arrastrar: Orbitar | Clic en estancia: Control y Fotos HD | Rueda: Zoom
        </div>
      )}

      {/* BARRA INFERIOR FLOTANTE EN MODO LIMPIO (Solo visible en el plano 3D, oculta al entrar en fotos de estancias) */}
      {cleanMode && !showPhotoTour && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          right: 12,
          zIndex: 50,
          background: 'rgba(6, 12, 28, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 243, 255, 0.35)',
          borderRadius: '12px',
          padding: '6px 14px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: onBackToPrincipal ? 'space-between' : 'center',
          gap: '10px'
        }}>
          {/* Botón de acceso a Automatizaciones y Escenas Domóticas (Extremo Izquierdo) */}
          <button
            type="button"
            onClick={onOpenAutomations}
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(0, 243, 255, 0.25) 100%)',
              border: '1px solid #c084fc',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 16px rgba(168, 85, 247, 0.35)',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            title="Abrir Automatizaciones y Escenas Domóticas"
          >
            <Sparkles size={16} color="#c084fc" />
            <span>✨ Automatizaciones y Escenas</span>
          </button>

          {/* Botón de retorno a Principal (Extremo Derecho) */}
          {onBackToPrincipal && (
            <button
              type="button"
              onClick={onBackToPrincipal}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#e2e8f0',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              title="Volver a la vista del Avatar Principal"
            >
              <span>⬅️ Volver a Principal</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

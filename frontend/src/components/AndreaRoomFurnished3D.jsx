import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Generador procedural de textura fotorrealista de Suelo de Parquet de Roble
 * Genera tablones de madera con juntas biseladas, vetas longitudinales y variaciones tonales.
 */
function createOakParquetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Fondo base cálido roble miel
  ctx.fillStyle = '#c4a279';
  ctx.fillRect(0, 0, 1024, 1024);

  const numLanes = 8;
  const laneHeight = 1024 / numLanes;
  const tones = ['#c8a57c', '#be9b72', '#d0ad85', '#b69268', '#c29e75', '#cca980'];

  for (let i = 0; i < numLanes; i++) {
    const y = i * laneHeight;
    const offsets = [0, 240, 560, 820, 1024];
    const shift = (i % 3) * 110;

    for (let j = 0; j < offsets.length - 1; j++) {
      let x1 = (offsets[j] + shift) % 1024;
      let x2 = (offsets[j + 1] + shift) % 1024;
      if (x2 < x1) x2 = 1024;

      const tone = tones[(i * 3 + j) % tones.length];
      ctx.fillStyle = tone;
      ctx.fillRect(x1, y, x2 - x1, laneHeight);

      // Vetas sutiles de madera longitudinales
      ctx.strokeStyle = 'rgba(110, 75, 40, 0.08)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 6; k++) {
        const vy = y + 8 + k * 18 + (Math.sin(k) * 4);
        ctx.beginPath();
        ctx.moveTo(x1, vy);
        ctx.bezierCurveTo(x1 + 80, vy + 2, x1 + 180, vy - 2, x2, vy + 1);
        ctx.stroke();
      }

      // Juntas verticales entre tablones (micro-ranura oscura)
      ctx.fillStyle = 'rgba(60, 40, 20, 0.35)';
      ctx.fillRect(x1, y, 2.5, laneHeight);
    }

    // Ranura horizontal biselada entre filas de tablones
    ctx.fillStyle = 'rgba(50, 32, 15, 0.4)';
    ctx.fillRect(0, y, 1024, 2.5);
    ctx.fillStyle = 'rgba(255, 235, 205, 0.2)';
    ctx.fillRect(0, y + 2.5, 1024, 1.2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2.5);
  return texture;
}

/**
 * Generador procedural de textura para la colcha nórdica / edredón
 * Reproduce el estampado botánico real de hojas grisáceas sobre fondo lino crema de las fotos.
 */
function createBotanicalDuvetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base lino suave blanco roto
  ctx.fillStyle = '#f5f3ee';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-trama de tela
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  for (let x = 0; x < 1024; x += 4) {
    ctx.fillRect(x, 0, 2, 1024);
  }
  for (let y = 0; y < 1024; y += 4) {
    ctx.fillRect(0, y, 1024, 2);
  }

  // Estampado botánico de ramitas y hojas suaves (como en las fotos de Andrea)
  const drawLeafBranch = (cx, cy, scale, angle) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#6e706e';
    ctx.fillStyle = '#8a8d8a';
    ctx.lineWidth = 2.5;

    // Tallo
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20, -50, 10, -100);
    ctx.stroke();

    // Hojas alternas
    for (let step = 1; step <= 6; step++) {
      const ly = -step * 15;
      const lx = (step % 2 === 0 ? 1 : -1) * 16;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 10, 5, (step % 2 === 0 ? 0.4 : -0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  for (let bx = 60; bx < 1024; bx += 180) {
    for (let by = 60; by < 1024; by += 180) {
      const rot = ((bx + by) % 5) * 0.4;
      drawLeafBranch(bx, by, 0.65, rot);
      drawLeafBranch(bx + 90, by + 90, 0.5, rot + 1.6);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

/**
 * Textura procedural de alfombra shaggy esponjosa
 */
function createShaggyRugTexture(baseColor = '#f5f1e8', speckleColor = '#ded8cc') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Moteado de fibras suaves
  for (let i = 0; i < 8000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rrad = Math.random() * 2.2 + 0.8;
    ctx.fillStyle = Math.random() > 0.4 ? speckleColor : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(rx, ry, rrad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/**
 * Fondo fotográfico exterior visible a través de la ventana
 * (Terraza soleada, toldo y valla, coincidiendo con la foto real 7 y 9)
 */
function createTerraceBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Cielo diurno despejado
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, '#7dd3fc');
  grad.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 300);

  // Pared exterior / vallado de terraza gris y tejas
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 240, 512, 160);

  // Sombrilla / estructura exterior (foto 7)
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.moveTo(320, 200);
  ctx.lineTo(440, 240);
  ctx.lineTo(260, 240);
  ctx.closePath();
  ctx.fill();

  // Tejado / alero
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 400, 512, 112);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Textura procedural de pantalla de ordenador PC
 */
function createMonitorScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');

  // Fondo de escritorio moderno
  const grad = ctx.createLinearGradient(0, 0, 512, 288);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 288);

  // Ondas de fondo de pantalla ciberpunk
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.bezierCurveTo(150, 120, 350, 260, 512, 140);
  ctx.stroke();

  // Barra de tareas inferior
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 258, 512, 30);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(240, 265, 32, 16);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Reconstrucción 3D Amueblada, Hiperrealista y Fiel a las Fotos de la Habitación de Andrea
 * Basada en las 14 fotos reales analizadas, filtrando todo el desorden y modelando los muebles con PBR.
 */
export function AndreaRoomFurnished3D({
  zone,
  devices = [],
  isWalkthrough = false,
  onToggleDevice,
  onOpenCoverModal
}) {
  const { size = [4.6, 1.4, 3.8] } = zone;
  const roomW = size[0]; // ~4.6m (eje X: -X puerta, +X ventanal)
  const roomH = 2.55;    // Altura real del techo
  const roomD = size[2]; // ~3.8m (eje Z: +Z pared cama/armario, -Z pared espejo/TV)

  // Dispositivos reales en Zigbee2MQTT
  const devLuzEntrada = devices.find(d => d.id === 'led_foso_andrea' || d.id === 'andrea_led_foso_entrada');
  const devLuzCama = devices.find(d => d.id === 'luz_lazos_andrea' || d.id === 'andrea_luz_cama');
  const devLedCama = devices.find(d => d.id === 'led_cama_andrea' || d.id === 'andrea_led_cama');
  const devPersiana = devices.find(d => d.id === 'cover.persiana_andrea' || d.id === 'persiana_andrea');

  const isLuzEntradaOn = devLuzEntrada && ['on', 'open'].includes(devLuzEntrada.state);
  const isLuzCamaOn = devLuzCama && ['on', 'open'].includes(devLuzCama.state);
  const isLedCamaOn = devLedCama && ['on', 'open'].includes(devLedCama.state);

  const persianaPos = devPersiana?.attributes?.current_position !== undefined
    ? devPersiana.attributes.current_position
    : (devPersiana && ['open', 'opening'].includes(devPersiana.state) ? 100 : 0);

  // Texturas PBR generadas dinámicamente
  const parquetTexture = useMemo(() => createOakParquetTexture(), []);
  const duvetTexture = useMemo(() => createBotanicalDuvetTexture(), []);
  const ivoryRugTexture = useMemo(() => createShaggyRugTexture('#f7f4ec', '#ded8cc'), []);
  const greyRugTexture = useMemo(() => createShaggyRugTexture('#94a3b8', '#64748b'), []);
  const monitorTexture = useMemo(() => createMonitorScreenTexture(), []);
  const terraceBackdropTexture = useMemo(() => createTerraceBackdropTexture(), []);

  // Materiales de alta fidelidad
  const woodFloorMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: parquetTexture,
    roughness: 0.38,
    metalness: 0.04
  }), [parquetTexture]);

  const botanicalDuvetMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: duvetTexture,
    roughness: 0.88,
    metalness: 0.02
  }), [duvetTexture]);

  const ivoryRugMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: ivoryRugTexture,
    roughness: 0.96,
    metalness: 0.0
  }), [ivoryRugTexture]);

  const greyRugMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: greyRugTexture,
    roughness: 0.94,
    metalness: 0.0
  }), [greyRugTexture]);

  const wallGreigeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c4b9ab', // Pintura mate greige/topo exacta de las fotos
    roughness: 0.86,
    metalness: 0.01,
    side: THREE.BackSide
  }), []);

  const whiteSatinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.28,
    metalness: 0.06
  }), []);

  const scandiWoodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d4b387',
    roughness: 0.52,
    metalness: 0.02
  }), []);

  const blueKnobMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1d7494', // Azul cerámico turquesa de los tiradores
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  }), []);

  const mirrorGlassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.02,
    metalness: 0.98
  }), []);

  const goldCarvedMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#fef08a',
    roughness: 0.35,
    metalness: 0.85
  }), []);

  const handleToggle = (entityId, currentState, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onToggleDevice) {
      onToggleDevice(entityId, currentState ? 'turn_off' : 'turn_on');
    }
  };

  return (
    <group position={[0, 0, 0]}>
      {/* ========================================================================= */}
      {/* 1. SUELO DE PARQUET ROBLE NATURAL Y RODAPIÉS */}
      {/* ========================================================================= */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomW, roomD]} />
        <primitive object={woodFloorMat} attach="material" />
      </mesh>

      {/* Alfombra redonda shaggy beige marfil (frente al armario y cómoda) */}
      <mesh position={[-0.45, 0.012, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.92, 48]} />
        <primitive object={ivoryRugMat} attach="material" />
      </mesh>

      {/* Alfombra lateral shaggy gris junto a la cama */}
      <mesh position={[0.7, 0.011, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.65, 0.72]} />
        <primitive object={greyRugMat} attach="material" />
      </mesh>

      {/* Rodapiés blancos perimetrales altos (10cm lacado blanco) */}
      <mesh position={[0, 0.05, roomD / 2 - 0.01]}>
        <boxGeometry args={[roomW, 0.1, 0.02]} />
        <primitive object={whiteSatinMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.05, -roomD / 2 + 0.01]}>
        <boxGeometry args={[roomW, 0.1, 0.02]} />
        <primitive object={whiteSatinMat} attach="material" />
      </mesh>
      <mesh position={[-roomW / 2 + 0.01, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.1, roomD]} />
        <primitive object={whiteSatinMat} attach="material" />
      </mesh>
      <mesh position={[roomW / 2 - 0.01, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.1, roomD]} />
        <primitive object={whiteSatinMat} attach="material" />
      </mesh>

      {/* ========================================================================= */}
      {/* 2. CAMA CANAPÉ CON CABECERO CAPITONÉ (Pared +Z) */}
      {/* ========================================================================= */}
      {/* Coordenadas exactas: x=0.65, pegada a la pared Z=1.1, mirando hacia el espejo -Z */}
      <group position={[0.65, 0, 0.95]}>
        {/* Canapé abatible con textura de madera clara */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[1.54, 0.34, 2.0]} />
          <primitive object={scandiWoodMat} attach="material" />
        </mesh>

        {/* Colchón blanco con cantos redondeados */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.50, 0.22, 1.95]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Edredón nórdico con estampado botánico de hojas idéntico al real */}
        <mesh position={[0, 0.48, 0.12]}>
          <boxGeometry args={[1.48, 0.12, 1.68]} />
          <primitive object={botanicalDuvetMat} attach="material" />
        </mesh>

        {/* Manta polar negra doblada a los pies (foto 6, 11, 12, 13) */}
        <mesh position={[0, 0.54, 0.72]}>
          <boxGeometry args={[1.46, 0.045, 0.48]} />
          <meshStandardMaterial color="#18181b" roughness={0.92} />
        </mesh>

        {/* Almohadas dobles mullidas */}
        <mesh position={[-0.38, 0.55, -0.74]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.62, 0.14, 0.38]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        <mesh position={[0.38, 0.55, -0.74]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.62, 0.14, 0.38]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Cojín decorativo de terciopelo verde salvia / oliva (foto 1, 3, 5) */}
        <mesh position={[0.0, 0.58, -0.56]} rotation={[0.24, 0.08, -0.04]}>
          <boxGeometry args={[0.42, 0.14, 0.30]} />
          <meshStandardMaterial color="#849174" roughness={0.85} />
        </mesh>

        {/* Cabecero Capitoné acolchado blanco de polipiel con botones romboidales */}
        <group position={[0, 0.76, 0.98]}>
          <mesh>
            <boxGeometry args={[1.68, 1.15, 0.10]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          {/* Botones y hendiduras capitoné reales (2 filas de 3 botones) */}
          {[-0.52, 0, 0.52].map((bx, i) =>
            [-0.22, 0.22].map((by, j) => (
              <group key={`btn-${i}-${j}`} position={[bx, by, -0.052]}>
                <mesh>
                  <sphereGeometry args={[0.02, 16, 16]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
                </mesh>
                {/* Costuras diagonales radiales */}
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.003, 0.32, 0.002]} />
                  <meshBasicMaterial color="#cbd5e1" />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.003, 0.32, 0.002]} />
                  <meshBasicMaterial color="#cbd5e1" />
                </mesh>
              </group>
            ))
          )}
        </group>

        {/* Tira LED Ambiental Cama (Home Assistant: real andrea led cama) */}
        {isLedCamaOn && (
          <group position={[0, 0.06, 0]}>
            <pointLight color="#ec4899" intensity={3.8} distance={3.2} decay={2} />
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(1.58, 0.04, 2.04)]} />
              <lineBasicMaterial color="#ec4899" linewidth={3} />
            </lineSegments>
          </group>
        )}
      </group>

      {/* ========================================================================= */}
      {/* 3. DOS MESITAS DE NOCHE NÓRDICAS (A juego, con patas cónicas de madera) */}
      {/* ========================================================================= */}
      {/* Mesita Izquierda */}
      <group position={[-0.38, 0, 1.65]}>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.48, 0.40, 0.42]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Cajones con uñeros circulares calados (foto 2, 3) */}
        <mesh position={[0, 0.47, -0.215]}>
          <circleGeometry args={[0.018, 16]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.31, -0.215]}>
          <circleGeometry args={[0.018, 16]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        {/* 4 Patas cónicas de roble inclinadas hacia afuera */}
        {[[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]].map(([px, pz], i) => (
          <mesh key={`leg-izq-${i}`} position={[px, 0.09, pz]} rotation={[0.1, 0, px > 0 ? -0.12 : 0.12]}>
            <cylinderGeometry args={[0.018, 0.012, 0.18, 12]} />
            <primitive object={scandiWoodMat} attach="material" />
          </mesh>
        ))}
        {/* Lámpara cilíndrica de noche con pantalla blanca y base metálica */}
        <mesh position={[0, 0.60, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.22, 24]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isLuzCamaOn ? '#fef08a' : '#000000'}
            emissiveIntensity={isLuzCamaOn ? 0.9 : 0}
          />
        </mesh>
        <mesh position={[0, 0.485, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.02, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
        {/* Botella de agua verde (foto 2, 3, 5) */}
        <mesh position={[0.14, 0.66, -0.08]}>
          <cylinderGeometry args={[0.022, 0.025, 0.16, 12]} />
          <meshStandardMaterial color="#84cc16" roughness={0.3} />
        </mesh>
      </group>

      {/* Mesita Derecha */}
      <group position={[1.68, 0, 1.65]}>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.48, 0.40, 0.42]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.47, -0.215]}>
          <circleGeometry args={[0.018, 16]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.31, -0.215]}>
          <circleGeometry args={[0.018, 16]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        {[[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]].map(([px, pz], i) => (
          <mesh key={`leg-der-${i}`} position={[px, 0.09, pz]} rotation={[0.1, 0, px > 0 ? -0.12 : 0.12]}>
            <cylinderGeometry args={[0.018, 0.012, 0.18, 12]} />
            <primitive object={scandiWoodMat} attach="material" />
          </mesh>
        ))}
        <mesh position={[0, 0.60, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.22, 24]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isLuzCamaOn ? '#fef08a' : '#000000'}
            emissiveIntensity={isLuzCamaOn ? 0.9 : 0}
          />
        </mesh>
        <mesh position={[0, 0.485, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.02, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
      </group>

      {/* Placa táctil inteligente de pared junto a la cama (foto 3) */}
      <group position={[1.98, 1.15, 1.88]}>
        <mesh>
          <boxGeometry args={[0.22, 0.08, 0.012]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
        </mesh>
        {[-0.06, 0, 0.06].map((cx, idx) => (
          <mesh key={`touch-sw-${idx}`} position={[cx, 0, -0.007]}>
            <circleGeometry args={[0.014, 16]} />
            <meshBasicMaterial color={isLuzCamaOn ? '#00f3ff' : '#64748b'} />
          </mesh>
        ))}
      </group>

      {/* ========================================================================= */}
      {/* 4. CÓMODA BLANCA CON 8 TIRADORES AZULES Y ESPEJO BARROCO (foto 2, 5, 10, 11) */}
      {/* ========================================================================= */}
      <group position={[-1.08, 0, 1.62]}>
        {/* Cuerpo principal de la cómoda con moldura superior e inferior */}
        <mesh position={[0, 0.50, 0]}>
          <boxGeometry args={[0.92, 0.94, 0.48]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Encimera biselada sobresaliente */}
        <mesh position={[0, 0.98, 0]}>
          <boxGeometry args={[0.96, 0.04, 0.52]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Zócalo inferior */}
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.94, 0.06, 0.50]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Fila superior: 2 cajones pequeños con 1 tirador azul cada uno */}
        {[-0.22, 0.22].map((tx, idx) => (
          <mesh key={`knob-top-row-${idx}`} position={[tx, 0.84, -0.25]}>
            <sphereGeometry args={[0.022, 16, 16]} />
            <primitive object={blueKnobMat} attach="material" />
          </mesh>
        ))}

        {/* Filas 2, 3 y 4: 3 cajones anchos con 2 tiradores azules cada uno (total 8 tiradores) */}
        {[0.64, 0.44, 0.24].map((ty, rIdx) => (
          [-0.22, 0.22].map((tx, cIdx) => (
            <mesh key={`knob-wide-${rIdx}-${cIdx}`} position={[tx, ty, -0.25]}>
              <sphereGeometry args={[0.022, 16, 16]} />
              <primitive object={blueKnobMat} attach="material" />
            </mesh>
          ))
        ))}

        {/* Organizador de maquillaje / bandejas sobre la cómoda */}
        <mesh position={[0.2, 1.05, -0.05]}>
          <boxGeometry args={[0.34, 0.08, 0.22]} />
          <meshStandardMaterial color="#f1f5f9" transparent opacity={0.6} roughness={0.1} />
        </mesh>

        {/* Espejo de pared con marco labrado barroco blanco y dorado sobre la cómoda */}
        <group position={[0, 1.55, 0.22]}>
          {/* Marco exterior con molduras escalonadas */}
          <mesh>
            <boxGeometry args={[0.96, 0.72, 0.05]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          {/* Detalles tallados dorados en las 4 esquinas (foto 2, 5, 11) */}
          {[[-0.44, -0.32], [0.44, -0.32], [-0.44, 0.32], [0.44, 0.32]].map(([ex, ey], idx) => (
            <mesh key={`corner-gold-${idx}`} position={[ex, ey, -0.028]}>
              <boxGeometry args={[0.07, 0.07, 0.015]} />
              <primitive object={goldCarvedMat} attach="material" />
            </mesh>
          ))}
          {/* Cristal del espejo altamente reflectante */}
          <mesh position={[0, 0, -0.026]}>
            <planeGeometry args={[0.82, 0.58]} />
            <primitive object={mirrorGlassMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 5. ARMARIO EMPOTRADO DE 2 PUERTAS CORREDERAS Y ALTILLO (foto 2, 8, 10, 11) */}
      {/* ========================================================================= */}
      <group position={[-1.82, 0, 1.28]}>
        {/* Cuerpo del armario de suelo a techo */}
        <mesh position={[0, roomH / 2, 0]}>
          <boxGeometry args={[0.82, roomH, 0.72]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Perfiles de aluminio anodizado de las puertas correderas */}
        <mesh position={[0, (roomH - 0.5) / 2, -0.365]}>
          <boxGeometry args={[0.018, roomH - 0.5, 0.012]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Moldura divisoria del altillo superior (2 puertas de altillo) */}
        <mesh position={[0, roomH - 0.52, -0.365]}>
          <boxGeometry args={[0.82, 0.022, 0.012]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Moldura perimetral superior que ajusta contra el techo */}
        <mesh position={[0, roomH - 0.04, -0.37]}>
          <boxGeometry args={[0.86, 0.08, 0.02]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 6. PUERTA DE ENTRADA Y FOSO LED ARQUITECTÓNICO (Pared -X, fotos 8, 10, 11) */}
      {/* ========================================================================= */}
      <group position={[-roomW / 2 + 0.02, 0, 0.38]}>
        {/* Puerta blanca de 4 paneles con manivela plateada */}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.04, 2.10, 0.90]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Moldura perimetral de la puerta */}
        <lineSegments position={[0, 1.05, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.045, 2.10, 0.90)]} />
          <lineBasicMaterial color="#94a3b8" />
        </lineSegments>
        {/* Maneta / picaporte de acero inox */}
        <mesh position={[0.035, 1.02, -0.38]}>
          <cylinderGeometry args={[0.01, 0.01, 0.12, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* FOSO LED ARQUITECTÓNICO EN EL TECHO DEL PASILLO (foto 8) */}
        {/* Zigbee2MQTT: led_foso_andrea */}
        <group
          position={[0.26, 2.22, 0]}
          onClick={(e) => handleToggle('led_foso_andrea', isLuzEntradaOn, e)}
          style={{ cursor: 'pointer' }}
        >
          {/* Cornisa descolgada de escayola del foso */}
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.48, 0.28, 0.98]} />
            <meshStandardMaterial color="#c4b9ab" side={THREE.DoubleSide} />
          </mesh>

          {/* Difusor lineal de la Tira LED horizontal (foto 8) */}
          <mesh position={[0.09, 0.01, 0]}>
            <boxGeometry args={[0.04, 0.025, 0.96]} />
            <meshStandardMaterial
              color={isLuzEntradaOn ? '#fffdf5' : '#475569'}
              emissive={isLuzEntradaOn ? '#fffbeb' : '#000000'}
              emissiveIntensity={isLuzEntradaOn ? 3.5 : 0}
            />
          </mesh>

          {/* Iluminación volumétrica arquitectónica hacia abajo y hacia las paredes */}
          {isLuzEntradaOn && (
            <pointLight position={[0.12, -0.25, 0]} color="#fffbeb" intensity={4.5} distance={4.2} decay={2} />
          )}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 7. PARED OPUESTA (Pared -Z): ESPEJO DE CUERPO ENTERO Y TV LG (fotos 1, 6, 10, 11) */}
      {/* ========================================================================= */}
      {/* Gran espejo vestidor de cuerpo entero con marco blanco y adornos dorados (foto 1, 6) */}
      <group position={[-0.82, 1.05, -roomD / 2 + 0.04]}>
        {/* Marco barroco exterior */}
        <mesh>
          <boxGeometry args={[0.78, 1.76, 0.045]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        {/* Adornos labrados dorados en las 4 esquinas del espejo (foto 1) */}
        {[[-0.34, -0.82], [0.34, -0.82], [-0.34, 0.82], [0.34, 0.82]].map(([ex, ey], idx) => (
          <mesh key={`mirror-corner-${idx}`} position={[ex, ey, 0.024]}>
            <boxGeometry args={[0.09, 0.09, 0.018]} />
            <primitive object={goldCarvedMat} attach="material" />
          </mesh>
        ))}
        {/* Superficie de espejo nítida */}
        <mesh position={[0, 0, 0.024]}>
          <planeGeometry args={[0.66, 1.62]} />
          <primitive object={mirrorGlassMat} attach="material" />
        </mesh>
      </group>

      {/* Televisión plana LG colgada y orientada en soporte articulado (foto 0, 6, 10, 11, 13) */}
      <group position={[0.42, 1.68, -roomD / 2 + 0.12]} rotation={[0.12, -0.16, 0]}>
        {/* Brazo articulado extensible de fijación mural */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[0.18, 0.18, 0.08]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
        {/* Carcasa exterior del televisor */}
        <mesh>
          <boxGeometry args={[0.92, 0.54, 0.035]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Pantalla de cristal oscuro con reflejo leve */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.88, 0.50]} />
          <meshStandardMaterial color="#020617" roughness={0.08} metalness={0.9} />
        </mesh>
        {/* Logotipo LG central inferior y LED de standby */}
        <mesh position={[0, -0.255, 0.021]}>
          <planeGeometry args={[0.04, 0.015]} />
          <meshBasicMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 8. BAHÍA DE ESTUDIO Y TRABAJO EN EL VENTANAL (Pared +X, fotos 6, 7, 9, 12, 13) */}
      {/* ========================================================================= */}
      <group position={[roomW / 2 - 0.55, 0, 0]}>
        {/* Encimera amplia blanca del escritorio apoyada sobre las 2 cajoneras Alex */}
        <mesh position={[0, 0.74, 0]}>
          <boxGeometry args={[0.74, 0.04, 2.05]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Cajonera IKEA Alex Izquierda (5 cajones con ranuras uñero, foto 7) */}
        <group position={[0, 0.36, -0.76]}>
          <mesh>
            <boxGeometry args={[0.68, 0.72, 0.38]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          {[-0.26, -0.13, 0, 0.13, 0.26].map((cy, i) => (
            <group key={`alex-izq-${i}`} position={[-0.342, cy, 0]}>
              {/* Uñero biselado semi-ovalado característico de Alex */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.005, 0.018, 0.12]} />
                <meshBasicMaterial color="#334155" />
              </mesh>
              {/* Separación de cajón */}
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.002, 0.003, 0.37]} />
                <meshBasicMaterial color="#94a3b8" />
              </mesh>
            </group>
          ))}
        </group>

        {/* Cajonera IKEA Alex Derecha (5 cajones con ranuras uñero, foto 7) */}
        <group position={[0, 0.36, 0.76]}>
          <mesh>
            <boxGeometry args={[0.68, 0.72, 0.38]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          {[-0.26, -0.13, 0, 0.13, 0.26].map((cy, i) => (
            <group key={`alex-der-${i}`} position={[-0.342, cy, 0]}>
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.005, 0.018, 0.12]} />
                <meshBasicMaterial color="#334155" />
              </mesh>
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.002, 0.003, 0.37]} />
                <meshBasicMaterial color="#94a3b8" />
              </mesh>
            </group>
          ))}
        </group>

        {/* Torre de PC de sobremesa en el suelo junto a la cajonera izquierda (foto 6, 7) */}
        <group position={[0.10, 0.22, -0.44]}>
          <mesh>
            <boxGeometry args={[0.42, 0.44, 0.20]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.4} roughness={0.3} />
          </mesh>
          {/* Bahías frontales y botón de encendido iluminado */}
          <mesh position={[-0.212, 0.08, 0]}>
            <boxGeometry args={[0.005, 0.18, 0.16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[-0.213, 0.18, 0]}>
            <circleGeometry args={[0.008, 16]} />
            <meshBasicMaterial color="#00f3ff" />
          </mesh>
        </group>

        {/* Impresora compacta Ricoh blanca y negra sobre la mesa a la izquierda (foto 6, 7) */}
        <group position={[-0.05, 0.88, -0.74]}>
          <mesh>
            <boxGeometry args={[0.38, 0.22, 0.34]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.02, -0.172]}>
            <boxGeometry args={[0.32, 0.14, 0.005]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Monitor panorámico delgado con soporte en V y pantalla encendida (foto 6, 7) */}
        <group position={[-0.06, 1.06, 0.36]} rotation={[0, -0.22, 0]}>
          {/* Soporte en V metálico */}
          <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.26, 0.16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.26, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          {/* Carcasa del monitor */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.58, 0.34, 0.02]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} />
          </mesh>
          {/* Pantalla nítida con textura de escritorio */}
          <mesh position={[0, 0.06, -0.012]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.55, 0.31]} />
            <meshStandardMaterial
              map={monitorTexture}
              emissive="#38bdf8"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>

        {/* Teclado blanco estilizado, alfombrilla y ratón óptico (foto 7) */}
        <mesh position={[-0.14, 0.763, -0.04]}>
          <boxGeometry args={[0.16, 0.008, 0.42]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        <mesh position={[-0.14, 0.763, 0.22]}>
          <boxGeometry args={[0.10, 0.014, 0.06]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Papelera cónica roja bajo el escritorio (foto 7) */}
        <mesh position={[0.12, 0.16, 0.65]}>
          <cylinderGeometry args={[0.12, 0.09, 0.32, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.3} />
        </mesh>

        {/* Silla ergonómica ejecutiva de oficina negra con ruedas (foto 6, 7) */}
        <group position={[-0.56, 0, 0.02]} rotation={[0, 1.48, 0]}>
          {/* Base en estrella de 5 radios */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.022, 5]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          {/* 5 Ruedas de goma */}
          {[0, 1, 2, 3, 4].map((idx) => {
            const angle = (idx * Math.PI * 2) / 5;
            return (
              <mesh key={`wheel-${idx}`} position={[Math.cos(angle) * 0.26, 0.03, Math.sin(angle) * 0.26]}>
                <sphereGeometry args={[0.026, 8, 8]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
            );
          })}
          {/* Pistón neumático telescópico */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.30, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
          </mesh>
          {/* Asiento tapizado en piel sintética negra */}
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[0.46, 0.08, 0.44]} />
            <meshStandardMaterial color="#090d16" roughness={0.7} />
          </mesh>
          {/* Respaldo curvado ergonómico */}
          <mesh position={[-0.20, 0.74, 0]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.06, 0.54, 0.42]} />
            <meshStandardMaterial color="#090d16" roughness={0.7} />
          </mesh>
        </group>

        {/* Estanterías murales de madera con organizadores en el rincón (foto 0, 6, 7, 9) */}
        <group position={[0.06, 1.45, -0.96]}>
          {[0, 0.32, 0.64].map((sy, i) => (
            <mesh key={`shelf-${i}`} position={[0, sy, 0]}>
              <boxGeometry args={[0.30, 0.022, 0.42]} />
              <primitive object={scandiWoodMat} attach="material" />
            </mesh>
          ))}
          {/* Frascos de perfumes y botes */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />
            <meshStandardMaterial color="#fbcfe8" transparent opacity={0.7} />
          </mesh>
        </group>

        {/* Lintel divisorio y Split de Aire Acondicionado Mitsubishi (foto 0, 4, 12, 13) */}
        <group position={[-0.55, roomH - 0.28, 0]}>
          {/* Viga / dintel arquitectónico de escayola */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.22, 0.32, roomD]} />
            <meshStandardMaterial color="#c4b9ab" />
          </mesh>
          {/* Unidad Split blanca de aire acondicionado */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.24, 0.28, 0.86]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          {/* Rejilla de impulsión inferior y deflector */}
          <mesh position={[-0.122, -0.10, 0]}>
            <boxGeometry args={[0.005, 0.038, 0.80]} />
            <meshBasicMaterial color="#475569" />
          </mesh>
          {/* LED de estado de funcionamiento */}
          <mesh position={[-0.122, -0.06, 0.34]}>
            <circleGeometry args={[0.005, 12]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 9. LÁMPARA COLGANTE DE LAZOS LED SUSPENDIDA (foto 0, 4, 10, 11, 12) */}
      {/* ========================================================================= */}
      {/* Zigbee2MQTT: luz_lazos_andrea */}
      <group
        position={[0.25, roomH, 0.25]}
        onClick={(e) => handleToggle('luz_lazos_andrea', isLuzCamaOn, e)}
        style={{ cursor: 'pointer' }}
      >
        {/* Base rectangular de techo con acabado dorado/madera (foto 4) */}
        <mesh position={[0, -0.015, 0]}>
          <boxGeometry args={[0.38, 0.03, 0.14]} />
          <primitive object={goldCarvedMat} attach="material" />
        </mesh>
        {/* Cables tensores de acero finos */}
        <mesh position={[-0.12, -0.28, 0]}>
          <cylinderGeometry args={[0.0015, 0.0015, 0.54, 4]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[0.12, -0.28, 0]}>
          <cylinderGeometry args={[0.0015, 0.0015, 0.54, 4]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>

        {/* LUMINARIA: Doble lazo curvo entrelazado / cinta continua en 3D (foto 0, 4, 10, 11) */}
        <group position={[0, -0.56, 0]}>
          {/* Bucle 1: Cinta ondulada curva con difusor blanco puro */}
          <mesh rotation={[0.45, 0.3, 0.85]}>
            <torusGeometry args={[0.28, 0.009, 16, 48]} />
            <meshStandardMaterial
              color={isLuzCamaOn ? '#ffffff' : '#f8fafc'}
              emissive={isLuzCamaOn ? '#fffbeb' : '#000000'}
              emissiveIntensity={isLuzCamaOn ? 3.4 : 0.0}
              roughness={0.2}
            />
          </mesh>
          {/* Bucle 2: Cinta ondulada cruzada en X */}
          <mesh rotation={[-0.55, 0.65, -0.45]}>
            <torusGeometry args={[0.26, 0.009, 16, 48]} />
            <meshStandardMaterial
              color={isLuzCamaOn ? '#ffffff' : '#f8fafc'}
              emissive={isLuzCamaOn ? '#fffbeb' : '#000000'}
              emissiveIntensity={isLuzCamaOn ? 3.4 : 0.0}
              roughness={0.2}
            />
          </mesh>
          {/* Brazo lineal diagonal luminoso (foto 0, 4) */}
          <mesh rotation={[0.2, 0.2, Math.PI / 3.8]}>
            <cylinderGeometry args={[0.008, 0.008, 0.62, 16]} />
            <meshStandardMaterial
              color={isLuzCamaOn ? '#ffffff' : '#f8fafc'}
              emissive={isLuzCamaOn ? '#fffdf0' : '#000000'}
              emissiveIntensity={isLuzCamaOn ? 3.6 : 0.0}
              roughness={0.2}
            />
          </mesh>

          {/* Iluminación volumétrica cálida que baña la estancia (3000K) */}
          {isLuzCamaOn && (
            <pointLight position={[0, -0.15, 0]} color="#fffdf0" intensity={5.2} distance={6.5} decay={2} />
          )}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 10. VENTANAL CON PERSIANA MOTORIZADA Y VISTA AL EXTERIOR (foto 7, 9) */}
      {/* ========================================================================= */}
      <group
        position={[roomW / 2 - 0.02, 1.45, 0]}
        onClick={(e) => {
          if (onOpenCoverModal && devPersiana) {
            e.stopPropagation();
            onOpenCoverModal(devPersiana, zone);
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Cajón superior de persiana (foto 9) */}
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[0.20, 0.22, 2.02]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Marco blanco de PVC con montante central vertical (foto 7) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.06, 1.55, 1.98]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 1.55, 0.06]} />
          <primitive object={whiteSatinMat} attach="material" />
        </mesh>

        {/* Cristal translúcido que permite ver el patio y el cielo exterior */}
        <mesh position={[0.015, 0, 0]}>
          <planeGeometry args={[1.90, 1.48]} rotation={[0, -Math.PI / 2, 0]} />
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.25} roughness={0.05} />
        </mesh>

        {/* Fondo fotográfico exterior de la terraza (foto 7) */}
        <mesh position={[0.25, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.4, 1.8]} />
          <meshBasicMaterial map={terraceBackdropTexture} />
        </mesh>

        {/* Láminas de la persiana en blanco PVC / lamas reales */}
        {(() => {
          const frac = Math.max(0, Math.min(1, persianaPos / 100));
          const totalH = 1.48;
          const blindH = Math.max(0.08, (1 - frac) * totalH);
          const blindY = 0.74 - blindH / 2;
          // Persiana de lamas translucidas: se ve posicion y movimiento sin oscurecer la habitacion
          const slatCount = Math.max(2, Math.min(18, Math.round(blindH / 0.08)));
          const slatStep = blindH / slatCount;
          const baseY = blindY - blindH / 2;
          return (
            <group>
              {Array.from({ length: slatCount }).map((_, j) => (
                <mesh key={j} position={[-0.018, baseY + (j + 0.5) * slatStep, 0]}>
                  <boxGeometry args={[0.03, Math.min(0.028, slatStep * 0.45), 1.92]} />
                  <meshBasicMaterial color="#cbd5e1" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
                </mesh>
              ))}
              <mesh position={[-0.018, baseY + 0.02, 0]}>
                <boxGeometry args={[0.04, 0.04, 1.92]} />
                <meshBasicMaterial color="#64748b" transparent opacity={0.9} depthWrite={false} />
              </mesh>
            </group>
          );
        })()}

        {/* Foco circular Downlight de techo sobre el ventanal (foto 9) */}
        <mesh position={[-0.15, 1.05, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
          <meshStandardMaterial
            color={isLuzCamaOn ? '#ffffff' : '#64748b'}
            emissive={isLuzCamaOn ? '#fffdf0' : '#000000'}
            emissiveIntensity={isLuzCamaOn ? 2.5 : 0}
          />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 11. ENTORNO ARQUITECTÓNICO COMPLETO PARA EL MODO PASEO (1ª PERSONA) */}
      {/* ========================================================================= */}
      {isWalkthrough && (
        <group>
          {/* Iluminación interior envolvente y luminosa para el modo paseo */}
          <ambientLight intensity={1.6} color="#fffdf8" />
          <pointLight position={[0, 2.2, 0]} intensity={isLuzCamaOn ? 5.5 : 3.0} color="#fffbeb" distance={10} decay={1.5} />

          {/* Techo blanco liso con moldura perimetral (foto 0, 4, 8) */}
          <mesh position={[0, roomH, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[roomW, roomD]} />
            <meshStandardMaterial color="#f8f7f4" roughness={0.7} />
          </mesh>

          {/* Moldura de escayola en el encuentro techo-pared (cornisa) */}
          <mesh position={[0, roomH - 0.03, roomD / 2 - 0.02]}>
            <boxGeometry args={[roomW, 0.06, 0.04]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          <mesh position={[0, roomH - 0.03, -roomD / 2 + 0.02]}>
            <boxGeometry args={[roomW, 0.06, 0.04]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          <mesh position={[-roomW / 2 + 0.02, roomH - 0.03, 0]}>
            <boxGeometry args={[0.04, 0.06, roomD]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>
          <mesh position={[roomW / 2 - 0.02, roomH - 0.03, 0]}>
            <boxGeometry args={[0.04, 0.06, roomD]} />
            <primitive object={whiteSatinMat} attach="material" />
          </mesh>

          {/* Paredes con acabado pintura mate greige/topo (color real de las fotos) */}
          <mesh position={[0, roomH / 2, 0]}>
            <boxGeometry args={[roomW, roomH, roomD]} />
            <primitive object={wallGreigeMat} attach="material" />
          </mesh>

          {/* Luz diurna natural que entra por la ventana */}
          <directionalLight
            position={[roomW / 2 + 2, 2.5, 0]}
            target-position={[0, 0, 0]}
            color="#fffbeb"
            intensity={1.6}
          />
        </group>
      )}
    </group>
  );
}

/**
 * Controlador de Cámara en Primera Persona para el Modo Paseo (Walkthrough)
 * - Moverse con WASD o Flechas de dirección
 * - Rotar cámara en 360° arrastrando el ratón suavemente
 * - Delimita la posición física para no traspasar paredes
 */
export function WalkthroughController({ roomZone, onExit }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ yaw: 0, pitch: 0 });

  // Posición inicial: Pasillo interior mirando hacia el ventanal (+X)
  const roomPos = roomZone?.position || [4.0, 0, -2.8];
  const roomSize = roomZone?.size || [4.6, 1.4, 3.8];

  const minX = roomPos[0] - roomSize[0] / 2 + 0.40;
  const maxX = roomPos[0] + roomSize[0] / 2 - 0.40;
  const minZ = roomPos[2] - roomSize[2] / 2 + 0.40;
  const maxZ = roomPos[2] + roomSize[2] / 2 - 0.40;

  useEffect(() => {
    // Cámara situada a la altura natural de los ojos (1.62m) en el pasillo central de la habitación
    camera.position.set(minX + 0.65, 1.62, roomPos[2] - 0.15);
    cameraRotation.current = { yaw: -Math.PI / 2, pitch: -0.04 };
    camera.rotation.set(0, -Math.PI / 2, 0);

    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Escape' && onExit) {
        onExit();
      }
    };
    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };

    const canvasEl = gl.domElement;

    const handleMouseDown = (e) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.0035;
      cameraRotation.current.yaw -= deltaX * sensitivity;
      cameraRotation.current.pitch -= deltaY * sensitivity;

      // Limitar pitch vertical
      cameraRotation.current.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, cameraRotation.current.pitch));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera, gl, minX, roomPos, onExit]);

  // Actualización fluida en cada frame
  useFrame((_, delta) => {
    const euler = new THREE.Euler(cameraRotation.current.pitch, cameraRotation.current.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    const moveSpeed = (keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? 3.6 : 2.2) * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const movement = new THREE.Vector3();

    if (keys.current['KeyW'] || keys.current['ArrowUp']) movement.add(forward);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) movement.sub(forward);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) movement.sub(right);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) movement.add(right);

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(moveSpeed);
      camera.position.add(movement);

      // Bloquear dentro de los límites de las paredes
      camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
      camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
      camera.position.y = 1.62;
    }
  });

  return null;
}

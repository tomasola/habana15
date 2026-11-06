import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  Maximize2,
  Minimize2,
  Radio,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Share2,
  Activity,
  Compass,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

// -------------------------------------------------------------
// SINTETIZADOR DE AUDIO SCI-FI CIBERNÉTICO (WEB AUDIO API PURA)
// -------------------------------------------------------------
// Genera sonidos futuristas y pings de radio en tiempo real
// sin descargar archivos MP3 externos ni consumir ancho de banda.
// -------------------------------------------------------------
class HabanaAudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.12;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNodeClick(type) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      // Frecuencia modulada según el tipo de nodo
      const freq = type === 'bed' ? 520 : (type === 'switch' ? 840 : (type === 'camera' ? 440 : 1040));
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);

      gain.gain.setValueAtTime(this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  playBurst() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(550, t + 0.22);

      gain.gain.setValueAtTime(this.volume * 1.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch (e) {}
  }

  playChirp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.setValueAtTime(1900, t + 0.02);
      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }
}

const audioSynth = new HabanaAudioSynth();

// -------------------------------------------------------------
// -------------------------------------------------------------
// TOPOLOGÍA REAL DE DISPOSITIVOS DE HABANA 10 (SINCRONIZADA 1:1 CON ZIGBEE2MQTT)
// -------------------------------------------------------------
// - Coordinador: Dongle Sonoff Plus en COM9 (0x00124b0029e83270)
// - Los 25 dispositivos físicos Zigbee emparejados en http://localhost:8090/#/
// - Cada nodo incluye su `z2m_name`, su dirección `ieee` real y `aliases` HA/MQTT.
// -------------------------------------------------------------
const HABANA8_DEVICES = [
  // 1. Núcleo Dyson Coordinador (Dongle USB Zigbee Sonoff en COM9)
  {
    id: 'Coordinator',
    z2m_name: 'Coordinator',
    ieee: '0x00124b0029e83270',
    name: 'SONOFF ZIGBEE DONGLE P (COORDINADOR)',
    aliases: ['matter_hub', 'Coordinator', '0x00124b0029e83270'],
    room: 'Core',
    type: 'hub',
    role: 'COORDINATOR',
    pos: [0, 0, 0]
  },

  // --- HABITACIÓN DE ANDREA (6 Dispositivos Físicos Zigbee Z2M + 1 Persiana) ---
  {
    id: 'andrea_led_cama',
    z2m_name: 'andrea_led_cama',
    ieee: '0xa4c1389d50e759ce',
    name: 'Cama Andrea (Cabecero LED)',
    aliases: ['led_cama_andrea', 'andrea_led_cama', '0xa4c1389d50e759ce'],
    room: 'Andrea',
    type: 'bed',
    role: 'ROUTER',
    pos: [1.8, -0.2, 0.8]
  },
  {
    id: 'andrea_placa_entrada',
    z2m_name: 'andrea_placa_entrada',
    ieee: '0xa4c138726ed4b679',
    name: 'Placa Entrada Andrea',
    aliases: ['luz_lazos_andrea', 'andrea_placa_entrada', '0xa4c138726ed4b679'],
    room: 'Andrea',
    type: 'switch',
    role: 'ROUTER',
    pos: [1.5, 0.4, 0.7]
  },
  {
    id: 'andrea_placa_cama_izq',
    z2m_name: 'andrea_placa_cama_izq',
    ieee: '0xa4c13884fc6da4fd',
    name: 'Placa Cama Izq Andrea',
    aliases: ['andrea_placa_cama_izq', '0xa4c13884fc6da4fd'],
    room: 'Andrea',
    type: 'switch',
    role: 'ROUTER',
    pos: [1.35, -0.5, 0.8]
  },
  {
    id: 'andrea_placa_cama_der',
    z2m_name: 'andrea_placa_cama_der',
    ieee: '0xa4c138981a13a803',
    name: 'Placa Cama Der Andrea',
    aliases: ['andrea_placa_cama_der', '0xa4c138981a13a803'],
    room: 'Andrea',
    type: 'switch',
    role: 'ROUTER',
    pos: [2.15, -0.4, 0.8]
  },
  {
    id: 'andrea_placa_ventana',
    z2m_name: 'andrea_placa_ventana',
    ieee: '0xa4c138a64c8e79fa',
    name: 'Placa Ventana Andrea (Viga)',
    aliases: ['luz_ventana_andrea', 'andrea_placa_ventana', '0xa4c138a64c8e79fa'],
    room: 'Andrea',
    type: 'switch',
    role: 'ROUTER',
    pos: [1.6, 0.9, 0.5]
  },
  {
    id: 'andrea_led_foso_entrada',
    z2m_name: 'andrea_led_foso_entrada',
    ieee: '0xa4c13872efeeaa29',
    name: 'Tira LED Foso Entrada',
    aliases: ['led_foso_andrea', 'andrea_led_foso_entrada', '0xa4c13872efeeaa29'],
    room: 'Andrea',
    type: 'light',
    role: 'ROUTER',
    pos: [2.2, 0.3, 0.6]
  },
  {
    id: 'cover.persiana_andrea',
    z2m_name: 'persiana_andrea',
    ieee: null,
    name: 'Persiana Andrea',
    aliases: ['cover.persiana_andrea', 'persiana_andrea'],
    room: 'Andrea',
    type: 'cover',
    role: 'ROUTER',
    pos: [1.9, 1.3, 0.3]
  },

  // --- SALÓN PRINCIPAL (8 Dispositivos Físicos Zigbee Z2M + 1 Persiana) ---
  {
    id: 'salon_led_sofa',
    z2m_name: 'salon_led_sofa',
    ieee: '0xa4c1389ef30608f4',
    name: 'Zona Sofá (Tira LED)',
    aliases: ['led_sofa_salon', 'salon_led_sofa', '0xa4c1389ef30608f4'],
    room: 'Salón',
    type: 'bed',
    role: 'ROUTER',
    pos: [-1.6, -0.6, 0.9]
  },
  {
    id: 'placa_salon_entrada',
    z2m_name: 'placa_salon_entrada',
    ieee: '0xa4c1380a5cdb5493',
    name: 'Placa Salón Entrada',
    aliases: ['luz_luz_principal_del_salon_53c1', 'placa_salon_entrada', '0xa4c1380a5cdb5493'],
    room: 'Salón',
    type: 'switch',
    role: 'ROUTER',
    pos: [-1.4, 0.2, 0.8]
  },
  {
    id: 'salon_entrada_2',
    z2m_name: 'salon_entrada_2',
    ieee: '0xa4c1387e7d77b0c3',
    name: 'Placa Salón Puerta 2',
    aliases: ['luz_luz_del_comedor_d9b2', 'salon_entrada_2', '0xa4c1387e7d77b0c3'],
    room: 'Salón',
    type: 'switch',
    role: 'ROUTER',
    pos: [-1.8, -0.2, 0.7]
  },
  {
    id: 'salon_ventana_1',
    z2m_name: 'salon_ventana_1',
    ieee: '0xa4c138086ac4ae26',
    name: 'Placa Salón Ventana 1',
    aliases: ['luz_comedor_salon', 'salon_ventana_1', '0xa4c138086ac4ae26'],
    room: 'Salón',
    type: 'switch',
    role: 'ROUTER',
    pos: [-2.1, 0.8, 0.5]
  },
  {
    id: 'salon_ventana_2',
    z2m_name: 'salon_ventana_2',
    ieee: '0xa4c13826590eb6b1',
    name: 'Placa Salón Ventana 2',
    aliases: ['luz_techo_salon', 'salon_ventana_2', '0xa4c13826590eb6b1'],
    room: 'Salón',
    type: 'switch',
    role: 'ROUTER',
    pos: [-2.2, 0.4, 0.4]
  },
  {
    id: 'salon_dimmer',
    z2m_name: 'salon_dimmer',
    ieee: '0xa4c1385f06f7bb69',
    name: 'Dimmer Techo Salón',
    aliases: ['luz_techo_salon', 'salon_dimmer', '0xa4c1385f06f7bb69'],
    room: 'Salón',
    type: 'light',
    role: 'ROUTER',
    pos: [-1.9, 0.6, 0.6]
  },
  {
    id: 'salon_led_tv',
    z2m_name: 'salon_led_tv',
    ieee: '0xa4c1383cc2b81284',
    name: 'Tira LED Salón TV',
    aliases: ['led_tv_salon', 'salon_led_tv', '0xa4c1383cc2b81284'],
    room: 'Salón',
    type: 'light',
    role: 'ROUTER',
    pos: [-1.5, 1.0, 0.5]
  },
  {
    id: 'salon_led_aparador',
    z2m_name: 'salon_led_aparador',
    ieee: '0xa4c13898f4fea484',
    name: 'Tira LED Aparador',
    aliases: ['led_aparador_salon', 'salon_led_aparador', '0xa4c13898f4fea484'],
    room: 'Salón',
    type: 'light',
    role: 'ROUTER',
    pos: [-2.1, 0.2, 0.5]
  },
  {
    id: 'cover.persiana_salon',
    z2m_name: 'persiana_salon',
    ieee: null,
    name: 'Persiana Salón',
    aliases: ['cover.persiana_salon', 'persiana_salon'],
    room: 'Salón',
    type: 'cover',
    role: 'ROUTER',
    pos: [-1.8, 1.4, 0.2]
  },

  // --- PASILLO & BAÑO (5 Dispositivos Físicos Zigbee Z2M) ---
  {
    id: 'pasillo_cocina',
    z2m_name: 'pasillo_cocina',
    ieee: '0xa4c13812b26f9a88',
    name: 'Placa Pasillo Cocina',
    aliases: ['luz_techo_pasillo', 'pasillo_cocina', '0xa4c13812b26f9a88'],
    room: 'Pasillo',
    type: 'switch',
    role: 'ROUTER',
    pos: [-0.4, 1.4, -0.7]
  },
  {
    id: 'pasillo_habitacion',
    z2m_name: 'pasillo_habitacion',
    ieee: '0xa4c138552bb8ecd8',
    name: 'Placa Pasillo Habitaciones',
    aliases: ['pasillo_habitacion', '0xa4c138552bb8ecd8'],
    room: 'Pasillo',
    type: 'switch',
    role: 'ROUTER',
    pos: [0.2, 1.5, -0.7]
  },
  {
    id: 'pasillo_bano_andrea',
    z2m_name: 'pasillo_bano_andrea',
    ieee: '0xa4c138d1be9a4740',
    name: 'Placa Puerta Baño Andrea',
    aliases: ['luz_techo_bano', 'pasillo_bano_andrea', '0xa4c138d1be9a4740'],
    room: 'Pasillo',
    type: 'switch',
    role: 'ROUTER',
    pos: [0.8, 1.3, -0.8]
  },
  {
    id: 'pasillo_led',
    z2m_name: 'pasillo_led',
    ieee: '0xa4c138b73ca4086d',
    name: 'Tira LED Pasillo Central',
    aliases: ['led_pasillo_central', 'pasillo_led', '0xa4c138b73ca4086d'],
    room: 'Pasillo',
    type: 'light',
    role: 'ROUTER',
    pos: [0.0, 1.9, -0.6]
  },
  {
    id: 'bano_led',
    z2m_name: 'bano_led',
    ieee: '0xa4c1387e1a9b052e',
    name: 'Tira LED Baño Andrea',
    aliases: ['led_espejo_bano', 'bano_led', '0xa4c1387e1a9b052e'],
    room: 'Baño',
    type: 'light',
    role: 'ROUTER',
    pos: [1.2, 1.6, -0.7]
  },

  // --- COCINA ---
  {
    id: 'luz_techo_cocina',
    z2m_name: 'luz_techo_cocina',
    ieee: null,
    name: 'Luz Techo Cocina',
    aliases: ['luz_techo_cocina'],
    room: 'Cocina',
    type: 'light',
    role: 'END_DEVICE',
    pos: [-1.6, 0.4, -0.9]
  },
  {
    id: 'binary_sensor.sensor_de_fuga_cocina_test',
    z2m_name: 'sensor_de_fuga_cocina_test',
    ieee: null,
    name: 'Sensor Fuga Agua Cocina',
    aliases: ['binary_sensor.sensor_de_fuga_cocina_test'],
    room: 'Cocina',
    type: 'camera',
    role: 'END_DEVICE',
    pos: [-1.5, -0.3, -1.0]
  },

  // --- DORMITORIO PRINCIPAL (5 Dispositivos Físicos Zigbee Z2M + 1 Persiana) ---
  {
    id: 'principal_cama_izq',
    z2m_name: 'principal_cama_izq',
    ieee: '0xa4c138d551d2b6ca',
    name: 'Cama Principal Izquierda',
    aliases: ['luz_techo_principal', 'principal_cama_izq', '0xa4c138d551d2b6ca'],
    room: 'Principal',
    type: 'bed',
    role: 'ROUTER',
    pos: [1.4, -0.9, -0.8]
  },
  {
    id: 'principal_cama_der',
    z2m_name: 'principal_cama_der',
    ieee: '0xa4c1385a21c3b3e1',
    name: 'Cama Principal Derecha',
    aliases: ['principal_cama_der', '0xa4c1385a21c3b3e1'],
    room: 'Principal',
    type: 'bed',
    role: 'ROUTER',
    pos: [2.0, -0.7, -0.7]
  },
  {
    id: 'principal_armario',
    z2m_name: 'principal_armario',
    ieee: '0xa4c1384ad550e8b4',
    name: 'Placa Armario Vestidor',
    aliases: ['principal_armario', '0xa4c1384ad550e8b4'],
    room: 'Principal',
    type: 'switch',
    role: 'ROUTER',
    pos: [1.3, -1.4, -0.6]
  },
  {
    id: 'principal_ventana',
    z2m_name: 'principal_ventana',
    ieee: '0xa4c1381a959f20a2',
    name: 'Placa Ventana Principal',
    aliases: ['principal_ventana', '0xa4c1381a959f20a2'],
    room: 'Principal',
    type: 'switch',
    role: 'ROUTER',
    pos: [2.1, -1.0, -0.5]
  },
  {
    id: 'principal_led',
    z2m_name: 'principal_led',
    ieee: '0xa4c1387b00a81633',
    name: 'Tira LED Dormitorio Principal',
    aliases: ['led_dormitorio_principal', 'principal_led', '0xa4c1387b00a81633'],
    room: 'Principal',
    type: 'light',
    role: 'ROUTER',
    pos: [1.7, -1.2, -0.9]
  },
  {
    id: 'cover.persiana_principal',
    z2m_name: 'persiana_principal',
    ieee: null,
    name: 'Persiana Principal',
    aliases: ['cover.persiana_principal', 'persiana_principal'],
    room: 'Principal',
    type: 'cover',
    role: 'ROUTER',
    pos: [2.2, -0.3, -0.4]
  },

  // --- ENTRADA & EXTERIOR (1 Dispositivo Zigbee Z2M + 1 Cámara) ---
  {
    id: 'entrada_placa_principal',
    z2m_name: 'entrada_placa_principal',
    ieee: '0xa4c1380c58a85b6c',
    name: 'Placa Entrada Principal',
    aliases: ['luz_recibidor_entrada', 'entrada_placa_principal', '0xa4c1380c58a85b6c'],
    room: 'Entrada',
    type: 'switch',
    role: 'ROUTER',
    pos: [-0.6, -1.5, 0.7]
  },
  {
    id: 'camera.camara_tuya_onvif_profile_1',
    z2m_name: null,
    ieee: null,
    name: 'Cámara Entrada RTSP',
    aliases: ['camera.camara_tuya_onvif_profile_1'],
    room: 'Entrada',
    type: 'camera',
    role: 'END_DEVICE',
    pos: [-0.9, -1.7, 0.9]
  }
];

// -------------------------------------------------------------
// ENLACES DE MALLA ZIGBEE (SINCRONIZADOS CON TOPOLOGÍA Z2M)
// -------------------------------------------------------------
const HABANA8_LINKS = [
  // Troncales hacia el Dongle Coordinador (Núcleo)
  { from: 'Coordinator', to: 'andrea_placa_entrada', category: 'hub_trunk', lqi: 255, rssi: -38, isMesh: true },
  { from: 'Coordinator', to: 'andrea_led_cama', category: 'hub_trunk', lqi: 255, rssi: -42, isMesh: true },
  { from: 'Coordinator', to: 'placa_salon_entrada', category: 'hub_trunk', lqi: 245, rssi: -47, isMesh: true },
  { from: 'Coordinator', to: 'salon_led_sofa', category: 'hub_trunk', lqi: 248, rssi: -46, isMesh: true },
  { from: 'Coordinator', to: 'salon_dimmer', category: 'hub_trunk', lqi: 250, rssi: -43, isMesh: true },
  { from: 'Coordinator', to: 'pasillo_cocina', category: 'hub_trunk', lqi: 252, rssi: -44, isMesh: true },
  { from: 'Coordinator', to: 'principal_cama_izq', category: 'hub_trunk', lqi: 225, rssi: -55, isMesh: true },
  { from: 'Coordinator', to: 'entrada_placa_principal', category: 'hub_trunk', lqi: 228, rssi: -54, isMesh: true },

  // Malla Habitación de Andrea (Clúster Conmutado Z2M)
  { from: 'andrea_placa_entrada', to: 'andrea_placa_cama_izq', category: 'mesh_backbone', lqi: 255, rssi: -36, isMesh: true },
  { from: 'andrea_placa_cama_izq', to: 'andrea_placa_cama_der', category: 'mesh_backbone', lqi: 255, rssi: -39, isMesh: true },
  { from: 'andrea_placa_cama_der', to: 'andrea_placa_ventana', category: 'mesh_backbone', lqi: 240, rssi: -48, isMesh: true },
  { from: 'andrea_placa_cama_izq', to: 'andrea_led_cama', category: 'switch_link', lqi: 255, rssi: -35, isMesh: true },
  { from: 'andrea_placa_entrada', to: 'andrea_led_foso_entrada', category: 'light_link', lqi: 245, rssi: -46, isMesh: false },
  { from: 'andrea_placa_ventana', to: 'cover.persiana_andrea', category: 'cover_link', lqi: 255, rssi: -40, isMesh: true },

  // Malla Salón Principal (Clúster Conmutado Z2M)
  { from: 'placa_salon_entrada', to: 'salon_entrada_2', category: 'mesh_backbone', lqi: 255, rssi: -38, isMesh: true },
  { from: 'salon_entrada_2', to: 'salon_ventana_1', category: 'mesh_backbone', lqi: 240, rssi: -49, isMesh: true },
  { from: 'salon_ventana_1', to: 'salon_ventana_2', category: 'mesh_backbone', lqi: 235, rssi: -52, isMesh: true },
  { from: 'salon_led_sofa', to: 'salon_entrada_2', category: 'switch_link', lqi: 255, rssi: -41, isMesh: true },
  { from: 'placa_salon_entrada', to: 'salon_dimmer', category: 'light_link', lqi: 250, rssi: -43, isMesh: false },
  { from: 'salon_dimmer', to: 'salon_led_tv', category: 'light_link', lqi: 220, rssi: -56, isMesh: false },
  { from: 'salon_dimmer', to: 'salon_led_aparador', category: 'light_link', lqi: 215, rssi: -58, isMesh: false },
  { from: 'salon_ventana_1', to: 'cover.persiana_salon', category: 'cover_link', lqi: 230, rssi: -53, isMesh: true },

  // Malla Pasillo, Baño y Cocina
  { from: 'pasillo_cocina', to: 'pasillo_habitacion', category: 'mesh_backbone', lqi: 255, rssi: -36, isMesh: true },
  { from: 'pasillo_habitacion', to: 'pasillo_bano_andrea', category: 'mesh_backbone', lqi: 225, rssi: -55, isMesh: true },
  { from: 'pasillo_habitacion', to: 'pasillo_led', category: 'light_link', lqi: 255, rssi: -37, isMesh: false },
  { from: 'pasillo_bano_andrea', to: 'bano_led', category: 'light_link', lqi: 210, rssi: -61, isMesh: false },
  { from: 'pasillo_cocina', to: 'luz_techo_cocina', category: 'light_link', lqi: 228, rssi: -53, isMesh: false },
  { from: 'pasillo_cocina', to: 'binary_sensor.sensor_de_fuga_cocina_test', category: 'camera_stream', lqi: 185, rssi: -68, isMesh: false },

  // Malla Dormitorio Principal
  { from: 'principal_cama_izq', to: 'principal_cama_der', category: 'mesh_backbone', lqi: 255, rssi: -39, isMesh: true },
  { from: 'principal_cama_der', to: 'principal_ventana', category: 'mesh_backbone', lqi: 218, rssi: -57, isMesh: true },
  { from: 'principal_cama_izq', to: 'principal_armario', category: 'mesh_backbone', lqi: 232, rssi: -52, isMesh: true },
  { from: 'principal_armario', to: 'principal_led', category: 'light_link', lqi: 240, rssi: -48, isMesh: false },
  { from: 'principal_ventana', to: 'cover.persiana_principal', category: 'cover_link', lqi: 225, rssi: -55, isMesh: true },

  // Enlaces Inter-Estancias Backbone
  { from: 'andrea_placa_cama_der', to: 'principal_cama_izq', category: 'mesh_backbone', lqi: 210, rssi: -60, isMesh: true },
  { from: 'andrea_led_cama', to: 'salon_led_sofa', category: 'mesh_backbone', lqi: 198, rssi: -64, isMesh: true },
  { from: 'entrada_placa_principal', to: 'salon_ventana_2', category: 'mesh_backbone', lqi: 175, rssi: -72, isMesh: true },
  { from: 'entrada_placa_principal', to: 'camera.camara_tuya_onvif_profile_1', category: 'camera_stream', lqi: 190, rssi: -66, isMesh: false }
];

// Centros espaciales precalculados para vuelo cinemático de cámara
const ROOM_CENTROIDS = {
  'TODAS': { center: [0, 0, 0], pos: [0, 0, 6.2] },
  'ANDREA': { center: [1.8, 0.5, 0.5], pos: [2.1, 0.6, 2.6] },
  'SALÓN': { center: [-1.7, 0.2, 0.6], pos: [-2.1, 0.3, 2.7] },
  'COCINA': { center: [-1.4, 0.5, -0.8], pos: [-1.8, 0.6, 1.3] },
  'PASILLO': { center: [0.3, 1.6, -0.7], pos: [0.4, 1.7, 1.4] },
  'PRINCIPAL': { center: [1.7, -1.0, -0.7], pos: [2.1, -0.8, 1.4] },
  'ENTRADA': { center: [-0.4, -1.6, 0.8], pos: [-0.6, -1.4, 2.7] }
};

// -------------------------------------------------------------
// CONTROLADOR CINEMÁTICO DE CÁMARA (SMOOTH FLY-TO SIN BLOQUEO DE ZOOM)
// -------------------------------------------------------------
function CinematicCameraController({ targetRoom, isBurstActive, isMaximized }) {
  const controlsRef = useRef();
  const prevRoomRef = useRef(targetRoom);
  const isTransitioningRef = useRef(false);
  const transitionStartRef = useRef(0);

  // Al cambiar la estancia seleccionada, activar vuelo cinemático suave
  const prevMaximizedRef = useRef(isMaximized);
  useEffect(() => {
    if (prevRoomRef.current !== targetRoom || prevMaximizedRef.current !== isMaximized) {
      prevRoomRef.current = targetRoom;
      prevMaximizedRef.current = isMaximized;
      isTransitioningRef.current = true;
      transitionStartRef.current = performance.now();
    }
  }, [targetRoom, isMaximized]);

  // Si el usuario toca el ratón para zoom o rotación manual, cancelar la transición inmediatamente
  const handleUserInteraction = () => {
    isTransitioningRef.current = false;
  };

  useFrame((state, delta) => {
    if (!isTransitioningRef.current) return;

    const currentRoom = isMaximized ? 'TODAS' : targetRoom;
    const config = ROOM_CENTROIDS[currentRoom] || ROOM_CENTROIDS['TODAS'];
    const targetVec = new THREE.Vector3(...config.center);
    const posVec = new THREE.Vector3(...config.pos);

    // Vuelo suave hacia el destino
    state.camera.position.lerp(posVec, delta * 3.5);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetVec, delta * 3.5);
      controlsRef.current.update();
    }

    const posDist = state.camera.position.distanceTo(posVec);
    const targetDist = controlsRef.current ? controlsRef.current.target.distanceTo(targetVec) : 0;
    const timeElapsed = performance.now() - transitionStartRef.current;

    // Al llegar a la proximidad o pasar 1.4s, liberar la cámara por completo para zoom con ratón
    if ((posDist < 0.08 && targetDist < 0.08) || timeElapsed > 1400) {
      isTransitioningRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={true}
      maxPolarAngle={Math.PI / 1.12}
      minPolarAngle={Math.PI / 4.5}
      autoRotate={(isMaximized || targetRoom === 'TODAS') && !isBurstActive && !isTransitioningRef.current}
      autoRotateSpeed={0.55}
      onStart={handleUserInteraction}
    />
  );
}

// -------------------------------------------------------------
// COMPONENTE: NÚCLEO DYSON CUÁNTICO (COORDINADOR ZIGBEE)
// -------------------------------------------------------------
function DysonQuantumCore({ visualState = 'idle', isSpeaking, isListening, targetRoom }) {
  const ringsGroup = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const starsRef = useRef();

  const coreRef = useRef();
  const aura1Ref = useRef();
  const aura2Ref = useRef();
  const shockwaveRef = useRef();

  const isFocusedOnCore = targetRoom === 'TODAS';

  const { starPositions, starSpeeds } = useMemo(() => {
    const count = 75;
    const positions = new Float32Array(count * 3);
    const speeds = [];
    for (let i = 0; i < count; i++) {
      const radius = 0.35 + Math.random() * 0.95;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi);
      speeds.push({
        orbitRadius: radius,
        angle: theta,
        speed: (0.2 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
    return { starPositions: positions, starSpeeds: speeds };
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const speedMult = isSpeaking ? 2.8 : (isListening ? 3.0 : 1.0);

    // 1. ANIMACIÓN REACTIVA DE LA ESFERA CENTRAL Y SU AURA CON EL CÓDIGO DE COLORES UNIFICADO
    if (coreRef.current) {
      if (visualState === 'speaking' || isSpeaking) {
        // ROJO CARMÍN (Hablando / Emitiendo por altavoz)
        const vocalHarmonics = Math.sin(time * 16) * 0.16 + Math.sin(time * 28) * 0.09 + Math.cos(time * 9) * 0.07;
        const coreScale = 1.0 + vocalHarmonics;
        coreRef.current.scale.set(coreScale, coreScale, coreScale);
        if (coreRef.current.material) {
          coreRef.current.material.color.set('#ef4444');
        }
      } else if (visualState === 'thinking') {
        // NARANJA NEÓN (IA Pensando / procesando)
        const thinkScale = 1.0 + Math.sin(time * 8.0) * 0.12;
        coreRef.current.scale.set(thinkScale, thinkScale, thinkScale);
        if (coreRef.current.material) {
          coreRef.current.material.color.set('#f97316');
        }
      } else if (visualState === 'listening' || isListening) {
        // AZUL ELÉCTRICO NEÓN (Escuchando orden tras disparador "Cuba")
        const listenScale = 1.0 + Math.sin(time * 5.0) * 0.1;
        coreRef.current.scale.set(listenScale, listenScale, listenScale);
        if (coreRef.current.material) {
          coreRef.current.material.color.set('#00f3ff');
        }
      } else if (visualState === 'muted') {
        // GRIS CARBÓN (Cuba en pausa / Micrófono cerrado)
        const mutedScale = 0.95 + Math.sin(time * 1.0) * 0.02;
        coreRef.current.scale.set(mutedScale, mutedScale, mutedScale);
        if (coreRef.current.material) {
          coreRef.current.material.color.set('#64748b');
        }
      } else {
        // VERDE ESMERALDA / CIAN (Listo / Reposo / "Cuba" armada)
        const idleScale = 1.0 + Math.sin(time * 2.0) * 0.04;
        coreRef.current.scale.set(idleScale, idleScale, idleScale);
        if (coreRef.current.material) {
          coreRef.current.material.color.set('#10b981');
        }
      }
    }

    if (aura1Ref.current) {
      const a1Scale = (visualState === 'speaking' || isSpeaking) ? 1.0 + Math.sin(time * 12) * 0.25 :
                      (visualState === 'thinking') ? 1.0 + Math.sin(time * 8) * 0.18 :
                      (visualState === 'listening' || isListening) ? 1.0 + Math.sin(time * 6) * 0.15 : 1.0;
      aura1Ref.current.scale.set(a1Scale, a1Scale, a1Scale);
      if (aura1Ref.current.material) {
        const aColor = (visualState === 'speaking' || isSpeaking) ? '#ef4444' :
                       (visualState === 'thinking') ? '#f97316' :
                       (visualState === 'listening' || isListening) ? '#00f3ff' :
                       (visualState === 'muted') ? '#475569' : '#10b981';
        aura1Ref.current.material.color.set(aColor);
        aura1Ref.current.material.opacity = (visualState === 'muted') ? 0.2 : 0.45;
      }
    }

    if (aura2Ref.current) {
      if (aura2Ref.current.material) {
        const a2Color = (visualState === 'speaking' || isSpeaking) ? '#b91c1c' :
                        (visualState === 'thinking') ? '#ea580c' :
                        (visualState === 'listening' || isListening) ? '#0284c7' :
                        (visualState === 'muted') ? '#1e293b' : '#059669';
        aura2Ref.current.material.color.set(a2Color);
        aura2Ref.current.material.opacity = (visualState === 'muted') ? 0.1 : 0.25;
      }
    }

    if (shockwaveRef.current) {
      if (visualState === 'speaking' || isSpeaking) {
        shockwaveRef.current.visible = true;
        const waveProgress = (time * 2.2) % 1.0;
        const waveScale = 0.35 + waveProgress * 1.8;
        shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
        shockwaveRef.current.material.opacity = (1.0 - waveProgress) * 0.8;
        shockwaveRef.current.material.color.set('#ef4444');
      } else {
        shockwaveRef.current.visible = false;
      }
    }

    // 2. ROTACIÓN DE ANILLOS Y POLVO ESTELAR
    if (ringsGroup.current) {
      ringsGroup.current.rotation.y = time * 0.25 * speedMult;
      ringsGroup.current.rotation.x = 0.35 + Math.sin(time * 0.5) * 0.1;
    }
    if (ring1.current) ring1.current.rotation.z += delta * 0.8 * speedMult;
    if (ring2.current) ring2.current.rotation.z -= delta * 1.1 * speedMult;
    if (ring3.current) ring3.current.rotation.z += delta * 0.6 * speedMult;

    if (starsRef.current) {
      const posAttr = starsRef.current.geometry.attributes.position;
      starSpeeds.forEach((s, i) => {
        s.angle += delta * s.speed * speedMult;
        posAttr.array[i * 3] = Math.cos(s.angle) * s.orbitRadius;
        posAttr.array[i * 3 + 1] = Math.sin(s.angle) * s.orbitRadius * 0.8 + Math.sin(time * 2 + i) * 0.05;
        posAttr.array[i * 3 + 2] = Math.sin(s.angle) * s.orbitRadius * 0.5;
      });
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]} opacity={isFocusedOnCore ? 1.0 : 0.45}>
      {/* 1. Esfera Central Blanca Pura Ultra Brillante Reactiva a la Voz */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 2. Aura y Resplandor Volumétrico Cian Profundo */}
      <mesh ref={aura1Ref}>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color="#00f3ff" transparent opacity={0.45} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={aura2Ref}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial color="#00b4d8" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 3. Onda expansiva de plasma cuando la IA habla */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.45, 32]} />
        <meshBasicMaterial color="#00f3ff" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. Anillos Orbitales Elípticos Cian Inclinados en 3D */}
      <group ref={ringsGroup}>
        <mesh ref={ring1} scale={[1.2, 0.65, 1.0]}>
          <torusGeometry args={[0.65, 0.015, 16, 64]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={ring2} rotation={[Math.PI / 3, Math.PI / 6, 0]} scale={[1.3, 0.75, 1.0]}>
          <torusGeometry args={[0.78, 0.014, 16, 64]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={ring3} rotation={[-Math.PI / 4, 0, Math.PI / 5]} scale={[1.4, 0.85, 1.0]}>
          <torusGeometry args={[0.92, 0.012, 16, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* 5. Polvo Estelar Alrededor del Núcleo */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starPositions.length / 3}
            array={starPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#00f3ff" transparent opacity={0.75} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// -------------------------------------------------------------
// COMPONENTE: TRANSFERENCIA BIDIRECCIONAL DE DATOS + MALLA MESH (LQI)
// -------------------------------------------------------------
function BidirectionalZigbeeTraffic({
  activeSet,
  isSpeaking,
  burstTarget,
  showLQI = true,
  targetRoom = 'TODAS'
}) {
  const packets = useMemo(() => {
    return HABANA8_LINKS.map((link, idx) => ({
      from: link.from,
      to: link.to,
      progress: (idx * 0.08) % 1.0,
      speed: 0.35 + Math.random() * 0.3,
      direction: idx % 2 === 0 ? 'tx' : 'rx',
      category: link.category,
      lqi: link.lqi
    }));
  }, []);

  const txPositions = useMemo(() => new Float32Array(HABANA8_LINKS.length * 3), []);
  const txTailPositions = useMemo(() => new Float32Array(HABANA8_LINKS.length * 3), []);
  const rxPositions = useMemo(() => new Float32Array(HABANA8_LINKS.length * 3), []);
  const rxTailPositions = useMemo(() => new Float32Array(HABANA8_LINKS.length * 3), []);

  const txMeshRef = useRef();
  const txTailMeshRef = useRef();
  const rxMeshRef = useRef();
  const rxTailMeshRef = useRef();

  const wave1Ref = useRef();
  const wave2Ref = useRef();
  const wave3Ref = useRef();

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const speedMult = isSpeaking ? 2.2 : 1.0;

    packets.forEach((p, idx) => {
      p.progress += delta * p.speed * speedMult;
      if (p.progress >= 1.0) p.progress = 0;

      const dFrom = HABANA8_DEVICES.find(d => d.id === p.from);
      const dTo = HABANA8_DEVICES.find(d => d.id === p.to);
      if (dFrom && dTo) {
        const isTx = p.direction === 'tx';
        const prog = isTx ? p.progress : (1.0 - p.progress);
        const tailProg = isTx ? Math.max(0, prog - 0.08) : Math.min(1.0, prog + 0.08);

        const curX = THREE.MathUtils.lerp(dFrom.pos[0], dTo.pos[0], prog);
        const curY = THREE.MathUtils.lerp(dFrom.pos[1], dTo.pos[1], prog);
        const curZ = THREE.MathUtils.lerp(dFrom.pos[2], dTo.pos[2], prog);

        const tailX = THREE.MathUtils.lerp(dFrom.pos[0], dTo.pos[0], tailProg);
        const tailY = THREE.MathUtils.lerp(dFrom.pos[1], dTo.pos[1], tailProg);
        const tailZ = THREE.MathUtils.lerp(dFrom.pos[2], dTo.pos[2], tailProg);

        if (isTx) {
          txPositions[idx * 3] = curX;
          txPositions[idx * 3 + 1] = curY;
          txPositions[idx * 3 + 2] = curZ;

          txTailPositions[idx * 3] = tailX;
          txTailPositions[idx * 3 + 1] = tailY;
          txTailPositions[idx * 3 + 2] = tailZ;

          rxPositions[idx * 3] = 999;
          rxTailPositions[idx * 3] = 999;
        } else {
          rxPositions[idx * 3] = curX;
          rxPositions[idx * 3 + 1] = curY;
          rxPositions[idx * 3 + 2] = curZ;

          rxTailPositions[idx * 3] = tailX;
          rxTailPositions[idx * 3 + 1] = tailY;
          rxTailPositions[idx * 3 + 2] = tailZ;

          txPositions[idx * 3] = 999;
          txTailPositions[idx * 3] = 999;
        }
      }
    });

    if (txMeshRef.current) txMeshRef.current.geometry.attributes.position.needsUpdate = true;
    if (txTailMeshRef.current) txTailMeshRef.current.geometry.attributes.position.needsUpdate = true;
    if (rxMeshRef.current) rxMeshRef.current.geometry.attributes.position.needsUpdate = true;
    if (rxTailMeshRef.current) rxTailMeshRef.current.geometry.attributes.position.needsUpdate = true;

    // Ondas expansivas RF concéntricas
    const wCycle = (time * 0.7) % 1.0;
    if (wave1Ref.current) {
      const s1 = 0.2 + wCycle * 2.4;
      wave1Ref.current.scale.set(s1, s1, s1);
      wave1Ref.current.material.opacity = Math.max(0, 0.45 * (1.0 - wCycle));
    }
    const wCycle2 = ((time * 0.7) + 0.33) % 1.0;
    if (wave2Ref.current) {
      const s2 = 0.2 + wCycle2 * 2.4;
      wave2Ref.current.scale.set(s2, s2, s2);
      wave2Ref.current.material.opacity = Math.max(0, 0.45 * (1.0 - wCycle2));
    }
    const wCycle3 = ((time * 0.7) + 0.66) % 1.0;
    if (wave3Ref.current) {
      const s3 = 0.2 + wCycle3 * 2.4;
      wave3Ref.current.scale.set(s3, s3, s3);
      wave3Ref.current.material.opacity = Math.max(0, 0.45 * (1.0 - wCycle3));
    }
  });

  return (
    <group>
      {/* 1. LÍNEAS DE ENLACE DE MALLA Y CALIDAD LQI */}
      {HABANA8_LINKS.map((link, idx) => {
        const dFrom = HABANA8_DEVICES.find(d => d.id === link.from);
        const dTo = HABANA8_DEVICES.find(d => d.id === link.to);
        if (!dFrom || !dTo) return null;

        const isTargetOn = activeSet.has(dTo.id.toLowerCase());
        const isFromRoom = targetRoom === 'TODAS' || dFrom.room.toUpperCase() === targetRoom;
        const isToRoom = targetRoom === 'TODAS' || dTo.room.toUpperCase() === targetRoom;
        const isInSelectedRoom = isFromRoom || isToRoom;

        let color = '#00f3ff';
        let opacity = isInSelectedRoom ? 0.45 : 0.12;
        let isDashed = false;

        // Color según Calidad de Enlace LQI si el modo LQI está activo
        if (showLQI && link.lqi) {
          if (link.lqi >= 235) {
            color = '#10b981'; // Excelente (Verde esmeralda)
          } else if (link.lqi >= 200) {
            color = '#00f3ff'; // Muy bueno (Cian neón)
          } else if (link.lqi >= 160) {
            color = '#facc15'; // Medio (Ámbar)
          } else {
            color = '#fb923c'; // Señal baja (Naranja)
          }
          opacity = isInSelectedRoom ? (isTargetOn ? 0.95 : 0.55) : 0.15;
        } else {
          // Color por categoría clásica
          if (link.category === 'bed_zone' || link.category === 'mesh_backbone') {
            color = '#d946ef';
            opacity = isInSelectedRoom ? 0.85 : 0.2;
          } else if (link.category === 'camera_stream') {
            color = '#ef4444';
            opacity = isInSelectedRoom ? 0.75 : 0.2;
            isDashed = true;
          } else if (link.category === 'switch_link') {
            color = '#00f3ff';
            opacity = isTargetOn ? 0.85 : (isInSelectedRoom ? 0.4 : 0.15);
            isDashed = true;
          } else if (link.category === 'light_link') {
            color = isTargetOn ? '#facc15' : '#10b981';
            opacity = isTargetOn ? 0.9 : (isInSelectedRoom ? 0.35 : 0.12);
          } else if (link.category === 'cover_link') {
            color = '#ec4899';
            opacity = isInSelectedRoom ? 0.6 : 0.15;
          } else if (link.category === 'hub_trunk') {
            color = isTargetOn ? '#facc15' : '#00b4d8';
            opacity = isTargetOn ? 0.8 : (isInSelectedRoom ? 0.35 : 0.15);
          }
        }

        const vFrom = new THREE.Vector3(...dFrom.pos);
        const vTo = new THREE.Vector3(...dTo.pos);

        if (isDashed) {
          const dashSegments = [];
          const numDashes = 7;
          for (let i = 0; i < numDashes; i++) {
            const t1 = i / numDashes;
            const t2 = (i + 0.55) / numDashes;
            dashSegments.push(new THREE.Vector3().lerpVectors(vFrom, vTo, t1));
            dashSegments.push(new THREE.Vector3().lerpVectors(vFrom, vTo, t2));
          }
          const geom = new THREE.BufferGeometry().setFromPoints(dashSegments);
          return (
            <lineSegments key={`link-${idx}`}>
              <bufferGeometry attach="geometry" {...geom} />
              <lineBasicMaterial attach="material" color={color} transparent opacity={opacity} linewidth={1.5} />
            </lineSegments>
          );
        }

        const geom = new THREE.BufferGeometry().setFromPoints([vFrom, vTo]);
        return (
          <lineSegments key={`link-${idx}`}>
            <bufferGeometry attach="geometry" {...geom} />
            <lineBasicMaterial attach="material" color={color} transparent opacity={opacity} linewidth={1.5} />
          </lineSegments>
        );
      })}

      {/* 2. ONDAS EXPANSIVAS DE RADIOFRECUENCIA (ZIGBEE BEACON BROADCAST) */}
      <Billboard follow={true}>
        <mesh ref={wave1Ref} position={[0, 0, 0]}>
          <ringGeometry args={[0.98, 1.0, 48]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={wave2Ref} position={[0, 0, 0]}>
          <ringGeometry args={[0.98, 1.0, 48]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={wave3Ref} position={[0, 0, 0]}>
          <ringGeometry args={[0.98, 1.0, 48]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>

      {/* 3. PAQUETES TX: DONGLE ➔ DISPOSITIVO (CIAN / ORO) */}
      <points ref={txMeshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={HABANA8_LINKS.length} array={txPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.095} color="#00f3ff" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={txTailMeshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={HABANA8_LINKS.length} array={txTailPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#38bdf8" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </points>

      {/* 4. PAQUETES RX: DISPOSITIVO ➔ DONGLE (MAGENTA / PÚRPURA) */}
      <points ref={rxMeshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={HABANA8_LINKS.length} array={rxPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.095} color="#d946ef" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={rxTailMeshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={HABANA8_LINKS.length} array={rxTailPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#e879f9" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// -------------------------------------------------------------
// COMPONENTE: FORMAS GEOMÉTRICAS DISTINTIVAS (BILLBOARD 2D/3D)
// -------------------------------------------------------------
function DistinctDeviceNode({
  dev,
  isDeviceOn,
  onToggleDevice,
  onTriggerBurst,
  targetRoom,
  show3DLabels = false
}) {
  const [hovered, setHovered] = useState(false);

  const isRoomActive = targetRoom === 'TODAS' || dev.room.toUpperCase() === targetRoom;
  // Solo mostrar cartel 3D flotante al pasar el ratón (hover) o si el usuario activa el modo Rótulos 3D explícitamente
  const showLabel = show3DLabels ? (isDeviceOn || hovered || (targetRoom !== 'TODAS' && isRoomActive)) : hovered;

  const handleClick = (e) => {
    e.stopPropagation();
    audioSynth.playNodeClick(dev.type);
    if (onTriggerBurst) onTriggerBurst(dev.id);
    const toggleTarget = (dev.aliases && dev.aliases[0]) || dev.id;
    if (onToggleDevice) onToggleDevice(toggleTarget);
  };

  const nodeOpacity = isRoomActive ? 1.0 : 0.32;

  return (
    <group
      position={dev.pos}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* 1. CAMAS Y CABECEROS -> HEXÁGONO MORADO / MAGENTA NEÓN */}
        {dev.type === 'bed' && (
          <group scale={isDeviceOn ? [1.3, 1.3, 1.3] : [1.0, 1.0, 1.0]}>
            <mesh>
              <ringGeometry args={[0.11, 0.15, 6]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.11, 6]} />
              <meshBasicMaterial color="#c084fc" transparent opacity={0.35 * nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.22, 16]} />
              <meshBasicMaterial color="#d946ef" transparent opacity={0.25 * nodeOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* 2. INTERRUPTORES FÍSICOS -> CUADRADO CIAN NEÓN */}
        {dev.type === 'switch' && (
          <group scale={isDeviceOn ? [1.25, 1.25, 1.25] : [1.0, 1.0, 1.0]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <ringGeometry args={[0.075, 0.105, 4]} />
              <meshBasicMaterial color="#00f3ff" transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            {isDeviceOn && (
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <circleGeometry args={[0.075, 4]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.4 * nodeOpacity} side={THREE.DoubleSide} />
              </mesh>
            )}
            {isDeviceOn && (
              <mesh>
                <circleGeometry args={[0.18, 16]} />
                <meshBasicMaterial color="#00f3ff" transparent opacity={0.3 * nodeOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )}

        {/* 3. LUCES Y TIRAS LED -> DIAMANTE / ROMBO ESMERALDA (ORO AL ENCENDER) */}
        {dev.type === 'light' && (
          <group scale={isDeviceOn ? [1.35, 1.35, 1.35] : [1.0, 1.0, 1.0]}>
            <mesh rotation={[0, 0, 0]}>
              <ringGeometry args={[0.075, 0.11, 4]} />
              <meshBasicMaterial color={isDeviceOn ? '#facc15' : '#10b981'} transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[0, 0, 0]}>
              <circleGeometry args={[0.075, 4]} />
              <meshBasicMaterial color={isDeviceOn ? '#fef08a' : '#059669'} transparent opacity={(isDeviceOn ? 0.65 : 0.3) * nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            {isDeviceOn && (
              <mesh>
                <circleGeometry args={[0.22, 16]} />
                <meshBasicMaterial color="#facc15" transparent opacity={0.4 * nodeOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )}

        {/* 4. CÁMARAS Y SENSORES -> CÍRCULO CONCÉNTRICO ROJO NEÓN CON NÚCLEO BLANCO */}
        {dev.type === 'camera' && (
          <group scale={isDeviceOn ? [1.2, 1.2, 1.2] : [1.0, 1.0, 1.0]}>
            <mesh>
              <ringGeometry args={[0.13, 0.16, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.13, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.3 * nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.045, 32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.26, 24]} />
              <meshBasicMaterial color="#f43f5e" transparent opacity={0.3 * nodeOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* 5. PERSIANAS MOTORIZADAS -> DOBLE ANILLO CIAN / ROSA */}
        {dev.type === 'cover' && (
          <group scale={isDeviceOn ? [1.25, 1.25, 1.25] : [1.0, 1.0, 1.0]}>
            <mesh>
              <ringGeometry args={[0.08, 0.11, 32]} />
              <meshBasicMaterial color={isDeviceOn ? '#ec4899' : '#00b4d8'} transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.05, 32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={nodeOpacity} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </Billboard>

      {/* RÓTULO HOLOGRÁFICO DINÁMICO */}
      {showLabel && (
        <Html distanceFactor={8} position={[0, 0.24, 0]} center>
          <div style={{
            background: isDeviceOn ? 'rgba(30, 24, 4, 0.95)' : 'rgba(3, 8, 22, 0.94)',
            border: `1px solid ${
              dev.type === 'bed' ? '#d946ef' :
              (dev.type === 'camera' ? '#ef4444' :
              (isDeviceOn ? '#facc15' : '#00f3ff'))
            }`,
            color: isDeviceOn ? '#fef08a' : '#ffffff',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: `0 0 14px ${isDeviceOn ? 'rgba(250,204,21,0.6)' : 'rgba(0,243,255,0.4)'}`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              fontSize: '9px',
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.12)',
              color: '#94a3b8'
            }}>
              {dev.room}
            </span>

            {/* Badge de Rol Mesh (Router vs End-Device) */}
            {dev.role === 'ROUTER' && (
              <span style={{
                fontSize: '8px',
                padding: '1px 4px',
                borderRadius: '3px',
                background: 'rgba(0, 243, 255, 0.2)',
                color: '#00f3ff',
                border: '1px solid rgba(0, 243, 255, 0.4)'
              }}>
                ROUTER
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span>{dev.name}</span>
              {dev.z2m_name && (
                <span style={{ fontSize: '8px', color: '#38bdf8', opacity: 0.9, fontFamily: 'monospace' }}>
                  z2m: {dev.z2m_name}
                </span>
              )}
            </div>
            <span style={{
              color: isDeviceOn ? '#22c55e' : '#94a3b8',
              fontWeight: '900',
              fontSize: '10px'
            }}>
              {isDeviceOn ? '[ON]' : '[OFF]'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// COMPONENTE PRINCIPAL EXPORTADO
// -------------------------------------------------------------
export default function DynamicAvatar3D({
  visualState = 'idle',
  isSpeaking = false,
  isListening = false,
  activeDevices = [],
  isMaximized = false,
  onToggleMaximize,
  onToggleDevice,
  screensaverMode = false,
  lowPower = false
}) {
  const [burstTarget, setBurstTarget] = useState(null);
  const [txCount, setTxCount] = useState(142);
  const [rxCount, setRxCount] = useState(128);
  const [isBurstActive, setIsBurstActive] = useState(false);

  // Nuevas capacidades interactivas (Opción 1)
  const [showLQI, setShowLQI] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('habana_3d_sound') !== 'false';
  });
  const [targetRoom, setTargetRoom] = useState('TODAS'); // 'TODAS' | 'ANDREA' | 'SALÓN' | 'COCINA' | 'PASILLO' | 'PRINCIPAL' | 'ENTRADA'
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [show3DLabels, setShow3DLabels] = useState(false);
  const [isActivesCollapsed, setIsActivesCollapsed] = useState(false);

  const onDevicesList = useMemo(() => {
    return activeDevices.filter(d => ['on', 'open', 'playing'].includes((d.state || '').toLowerCase()));
  }, [activeDevices]);

  // Sincronizar estado de sonido con el sintetizador Web Audio
  useEffect(() => {
    audioSynth.enabled = soundEnabled;
    localStorage.setItem('habana_3d_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  const activeSet = useMemo(() => {
    const s = new Set();
    activeDevices.forEach(d => {
      const state = (d.state || '').toLowerCase();
      if (['on', 'open', 'playing'].includes(state)) {
        if (d.id) s.add(d.id.toLowerCase());
        if (d.entity_id) s.add(d.entity_id.toLowerCase());
        if (d.name) s.add(d.name.toLowerCase());
        if (d.mqtt_topic) {
          s.add(d.mqtt_topic.toLowerCase());
          s.add(d.mqtt_topic.replace('zigbee2mqtt/', '').toLowerCase());
        }
      }
    });
    return s;
  }, [activeDevices]);

  const activeCount = useMemo(() => {
    return activeDevices.filter(d => ['on', 'open', 'playing'].includes((d.state || '').toLowerCase())).length;
  }, [activeDevices]);

  // Simular o activar ráfagas visuales al interactuar
  const handleTriggerBurst = (deviceId) => {
    setBurstTarget(deviceId);
    setIsBurstActive(true);
    setTxCount(prev => prev + 1);
    setRxCount(prev => prev + 1);
    audioSynth.playBurst();

    setTimeout(() => {
      setIsBurstActive(false);
      setBurstTarget(null);
    }, 1800);
  };

  // Simulación periódica de latido de red RF
  useEffect(() => {
    const interval = setInterval(() => {
      setTxCount(prev => prev + Math.floor(Math.random() * 2 + 1));
      setRxCount(prev => prev + Math.floor(Math.random() * 2 + 1));
      if (Math.random() > 0.6) {
        audioSynth.playChirp();
      }
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'radial-gradient(circle at center, #050d20 0%, #01040a 100%)',
      overflow: 'hidden'
    }}>

      {/* HUD SUPERIOR: Telemetría Dongle, Monitor RF, Audio y Maximizar (Oculto en Max Dyson) */}
      {!isMaximized && !screensaverMode && (
      <div style={{
        position: 'absolute',
        top: 12,
        left: 14,
        right: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        pointerEvents: 'auto',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {/* Telemetría Izquierda */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          fontFamily: 'monospace',
          fontSize: '0.68rem',
          color: '#00f3ff',
          textShadow: '0 0 8px rgba(0,243,255,0.4)',
          pointerEvents: 'none'
        }}>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isSpeaking ? '#facc15' : (isListening ? '#f0abfc' : '#00f3ff'),
              boxShadow: '0 0 8px currentColor'
            }}></span>
            SONOFF_ZIGBEE_DONGLE_P (COM9)
          </div>
          <div style={{ color: '#94a3b8' }}>
            STATUS: <span style={{ color: isSpeaking ? '#facc15' : (isListening ? '#f0abfc' : '#38bdf8') }}>
              {isSpeaking ? 'VOICE_TRANSMIT_ACTIVE' : (isListening ? 'NEURAL_RX_OVERCLOCK' : 'ZIGBEE_COORDINATOR_ONLINE')}
            </span>
          </div>
          <div style={{ color: '#64748b' }}>
            CANAL 11 / PANID 0x1A62 / <span style={{ color: '#22c55e' }}>{activeCount} ACTIVOS</span>
          </div>
        </div>

        {/* CONTROLES SUPERIORES DERECHOS: MONITOR RF + MALLA LQI + AUDIO + MAX */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Badge Monitor de Comunicaciones */}
          <div style={{
            background: 'rgba(5, 12, 28, 0.88)',
            backdropFilter: 'blur(10px)',
            border: isBurstActive ? '1px solid #facc15' : '1px solid rgba(0, 243, 255, 0.35)',
            borderRadius: '10px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            transition: 'all 0.3s'
          }}>
            {/* Flujo TX */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f3ff' }}>
              <ArrowUpRight size={13} color="#00f3ff" style={{ animation: 'pulse 1s infinite' }} />
              <span>TX:</span>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{txCount}</span>
            </div>

            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }}></div>

            {/* Flujo RX */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d946ef' }}>
              <ArrowDownLeft size={13} color="#d946ef" style={{ animation: 'pulse 1s infinite' }} />
              <span>RX:</span>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{rxCount}</span>
            </div>

            {/* Botón Simular Ráfaga RF */}
            <button
              onClick={() => handleTriggerBurst('andrea_placa_entrada')}
              style={{
                background: isBurstActive ? 'rgba(250, 204, 21, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                border: isBurstActive ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isBurstActive ? '#facc15' : '#94a3b8',
                padding: '2px 6px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.62rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Disparar ráfaga de prueba"
            >
              <Radio size={11} />
              <span>TEST RF</span>
            </button>
          </div>

          {/* Botón Rótulos 3D Limpio / ON */}
          <button
            onClick={() => setShow3DLabels(!show3DLabels)}
            style={{
              background: show3DLabels ? 'rgba(0, 243, 255, 0.25)' : 'rgba(5, 12, 28, 0.88)',
              backdropFilter: 'blur(10px)',
              border: show3DLabels ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.18)',
              color: show3DLabels ? '#00f3ff' : '#94a3b8',
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'all 0.2s'
            }}
            title={show3DLabels ? "Ocultar rótulos 3D flotantes (Satélites 100% despejados)" : "Mostrar rótulos 3D sobre cada nodo"}
          >
            <Tag size={13} />
            <span>{show3DLabels ? 'RÓTULOS 3D ON' : '3D DESPEJADO'}</span>
          </button>

          {/* Botón Modo Malla Mesh / LQI */}
          <button
            onClick={() => setShowLQI(!showLQI)}
            style={{
              background: showLQI ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 12, 28, 0.88)',
              backdropFilter: 'blur(10px)',
              border: showLQI ? '1px solid #10b981' : '1px solid rgba(0, 243, 255, 0.35)',
              color: showLQI ? '#10b981' : '#94a3b8',
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'all 0.2s'
            }}
            title={showLQI ? 'Mostrando Calidad de Enlace LQI (dBm)' : 'Cambiar a Modo Malla LQI'}
          >
            <Activity size={13} />
            <span>{showLQI ? 'MALLA LQI' : 'ESTRELLA'}</span>
          </button>

          {/* Botón Audio Sci-Fi */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? 'rgba(0, 243, 255, 0.2)' : 'rgba(5, 12, 28, 0.88)',
              backdropFilter: 'blur(10px)',
              border: soundEnabled ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.15)',
              color: soundEnabled ? '#00f3ff' : '#64748b',
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'all 0.2s'
            }}
            title={soundEnabled ? 'Silenciar Efectos de Audio 3D' : 'Activar Sonidos Sci-Fi Sintetizados'}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{soundEnabled ? 'SFX ON' : 'MUTE'}</span>
          </button>

          {/* BOTÓN MAXIMIZAR / RESTAURAR */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              style={{
                background: isMaximized ? 'rgba(0, 243, 255, 0.25)' : 'rgba(5, 12, 28, 0.88)',
                backdropFilter: 'blur(10px)',
                border: isMaximized ? '1px solid #00f3ff' : '1px solid rgba(0, 243, 255, 0.35)',
                color: isMaximized ? '#00f3ff' : '#ffffff',
                padding: '6px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                transition: 'all 0.2s'
              }}
              title={isMaximized ? 'Restaurar vista dividida con Lola' : 'Maximizar Núcleo Dyson al 100%'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isMaximized ? 'Restaurar' : 'Maximizar'}</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* SELECTOR CINEMÁTICO DE ESTANCIAS (Oculto en Max Dyson) */}
      {!isMaximized && !screensaverMode && (
      <div style={{
        position: 'absolute',
        top: 68,
        left: 14,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'nowrap',
        maxWidth: 'calc(100% - 28px)',
        overflowX: 'auto',
        background: 'rgba(5, 12, 28, 0.88)',
        backdropFilter: 'blur(10px)',
        padding: '3px 6px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: '#38bdf8',
            fontSize: '0.64rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            padding: '2px 4px',
            cursor: 'pointer',
            paddingRight: isDockCollapsed ? '4px' : '6px',
            borderRight: isDockCollapsed ? 'none' : '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0
          }}
          title={isDockCollapsed ? "Expandir barra de enfoque" : "Minimizar cuadro"}
        >
          <Compass size={12} color="#00f3ff" />
          <span>ENFOQUE{isDockCollapsed ? `: ${targetRoom}` : ''}</span>
          {isDockCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>

        {!isDockCollapsed && [
          { id: 'TODAS', label: 'Casa' },
          { id: 'ANDREA', label: '👧 Andrea' },
          { id: 'SALÓN', label: '🛋️ Salón' },
          { id: 'COCINA', label: '🍳 Cocina' },
          { id: 'PASILLO', label: '🚪 Pasillo' },
          { id: 'PRINCIPAL', label: '🛏️ Principal' },
          { id: 'ENTRADA', label: '🌿 Entrada' }
        ].map(room => {
          const isSelected = targetRoom === room.id;
          return (
            <button
              key={room.id}
              onClick={() => {
                setTargetRoom(room.id);
                audioSynth.playChirp();
              }}
              style={{
                background: isSelected ? 'rgba(0, 243, 255, 0.28)' : 'transparent',
                border: isSelected ? '1px solid #00f3ff' : '1px solid transparent',
                color: isSelected ? '#ffffff' : '#94a3b8',
                padding: '2px 6px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.62rem',
                fontWeight: isSelected ? 'bold' : 'normal',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {room.label}
            </button>
          );
        })}
      </div>
      )}

      {/* LEYENDA INFERIOR DE COMUNICACIONES Y FORMAS (Oculto en Max Dyson) */}
      {!isMaximized && !screensaverMode && (
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 14,
        right: 14,
        fontFamily: 'Inter, monospace, sans-serif',
        fontSize: '0.64rem',
        color: '#94a3b8',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(2, 6, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
        gap: '8px'
      }}>
        {/* Tipos de Nodos */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#d946ef', fontWeight: 'bold' }}>⬢</span> CAMAS / ZONAS
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>■</span> INTERRUPTORES
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>◆</span> LUCES Y LEDS
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>◉</span> CÁMARAS / ALARMA
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f3ff' }}>
            <span style={{ padding: '0 3px', border: '1px solid #00f3ff', borderRadius: '3px', fontSize: '8px' }}>ROUTER</span> REPETIDOR MESH
          </span>
        </div>

        {/* Indicadores de Enlace LQI */}
        {showLQI ? (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span style={{ color: '#10b981' }}>LQI 255 (Excelente)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f3ff' }}></span>
              <span style={{ color: '#00f3ff' }}>LQI 210 (Bueno)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15' }}></span>
              <span style={{ color: '#facc15' }}>LQI 165 (Medio)</span>
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#00f3ff', boxShadow: '0 0 6px #00f3ff' }}></span>
              <span style={{ color: '#00f3ff' }}>TX ➔ (Dongle a Dispositivo)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#d946ef', boxShadow: '0 0 6px #d946ef' }}></span>
              <span style={{ color: '#d946ef' }}>RX ➔ (Dispositivo a Dongle)</span>
            </span>
          </div>
        )}
      </div>
      )}

      {/* DOCK FLOTANTE NO INVASIVO: DISPOSITIVOS ACTIVOS (FUERA DE LA ÓRBITA DE SATÉLITES) */}
      {!isMaximized && onDevicesList.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
          position: 'absolute',
          ...(screensaverMode
            ? { top: 16, left: 14, maxHeight: 'calc(100% - 32px)', overflowY: 'auto' }
            : { bottom: 58, right: 14 }),
          zIndex: 25,
          maxWidth: '380px',
          background: 'rgba(5, 12, 28, 0.94)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(250, 204, 21, 0.45)',
          borderRadius: '12px',
          padding: isActivesCollapsed ? '6px 12px' : '10px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(250,204,21,0.2)',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'all 0.25s ease'
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={() => setIsActivesCollapsed(!isActivesCollapsed)}
            title={isActivesCollapsed ? 'Expandir lista de dispositivos encendidos' : 'Minimizar tarjeta'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#facc15',
                boxShadow: '0 0 8px #facc15',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 'bold',
                color: '#fef08a',
                letterSpacing: '0.4px'
              }}>
                💡 ENCENDIDOS ({onDevicesList.length})
              </span>
            </div>
            <button style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {isActivesCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {!isActivesCollapsed && (
            <div style={{
              marginTop: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              maxHeight: '130px',
              overflowY: 'auto'
            }}>
              {onDevicesList.map(dev => (
                <div
                  key={dev.id || dev.entity_id}
                  onClick={() => onToggleDevice && onToggleDevice(dev.id || dev.entity_id)}
                  style={{
                    background: 'rgba(250, 204, 21, 0.12)',
                    border: '1px solid rgba(250, 204, 21, 0.38)',
                    borderRadius: '7px',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    color: '#fef08a',
                    transition: 'all 0.15s'
                  }}
                  title="Clic para conmutar / apagar"
                >
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>●</span>
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                    {dev.name || dev.id}
                  </span>
                  <span style={{
                    fontSize: '0.58rem',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    textTransform: 'uppercase'
                  }}>
                    {dev.room || 'casa'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CANVAS 3D INTERACTIVO */}
      <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }} dpr={lowPower ? 0.75 : [1, 2]}>
        <color attach="background" args={['#01040a']} />
        <ambientLight intensity={0.8} />

        {/* 1. NÚCLEO DYSON COORDINADOR CON CÓDIGO DE COLORES UNIFICADO */}
        <DysonQuantumCore
          visualState={visualState}
          isSpeaking={isSpeaking}
          isListening={isListening}
          targetRoom={targetRoom}
        />

        {/* 2. TRANSFERENCIA BIDIRECCIONAL DE DATOS + MALLA MESH */}
        <BidirectionalZigbeeTraffic
          activeSet={activeSet}
          isSpeaking={isSpeaking}
          burstTarget={burstTarget}
          showLQI={showLQI}
          targetRoom={targetRoom}
        />

        {/* 3. NODOS CON ICONOGRAFÍA GEOMÉTRICA (HEXÁGONOS, CUADRADOS, DIAMANTES, CÍRCULOS) */}
        {HABANA8_DEVICES.map(dev => {
          if (dev.type === 'hub') return null;
          const isDeviceOn = activeSet.has(dev.id.toLowerCase()) ||
            (dev.z2m_name && activeSet.has(dev.z2m_name.toLowerCase())) ||
            (dev.aliases && dev.aliases.some(alias => activeSet.has(alias.toLowerCase()))) ||
            (dev.ieee && activeSet.has(dev.ieee.toLowerCase()));
          return (
            <DistinctDeviceNode
              key={dev.id}
              dev={dev}
              isDeviceOn={isDeviceOn}
              onToggleDevice={onToggleDevice}
              onTriggerBurst={handleTriggerBurst}
              targetRoom={targetRoom}
              show3DLabels={show3DLabels}
            />
          );
        })}

        {/* 4. CONTROLADOR CINEMÁTICO DE CÁMARA CON ENFOQUE DINÁMICO */}
        <CinematicCameraController
          targetRoom={targetRoom}
          isBurstActive={isBurstActive}
          isMaximized={isMaximized}
        />
      </Canvas>
    </div>
  );
}

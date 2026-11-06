import React, { useState, useEffect, useRef } from 'react';

import './index.css';

import './domotica.css';

import './megaluxury.css';

import { Zap, Eye, Network, MessageSquare, Database, TerminalSquare, Settings, Radio, Play, Square, Calendar, Plus, Trash2, ShieldCheck, Mic, MicOff, Tv, ArrowLeft, Camera, Video, BookOpen, Box } from 'lucide-react';

import LCARSLayout from './LCARSLayout';

import BentoLayout from './BentoLayout';

import NeobrutalismLayout from './NeobrutalismLayout';

import GlassmorphismLayout from './GlassmorphismLayout';

import CyberBentoLayout from './CyberBentoLayout';

import PremiumCyberLayout from './PremiumCyberLayout';

import ApexVisualLayout from './ApexVisualLayout';

import OrganicBentoLayout from './OrganicBentoLayout';

import MobileCyberLayout from './MobileCyberLayout';

import EntranceTablet from './components/EntranceTablet';

import SecurityConfigView from './components/SecurityConfigView';

import SecurityModal from './components/SecurityModal';

import BackgroundCamera from './components/BackgroundCamera';

import AIPanel from './components/AIPanel';

import AvatarPanel from './components/AvatarPanel';

import ContactManager from './components/ContactManager';

import AvatarConfigPanel from './components/AvatarConfigPanel';

import NetworkConfigPanel from './components/NetworkConfigPanel';

import SpeakerConfigPanel from './components/SpeakerConfigPanel';

import DigitalTwin3D from './components/DigitalTwin3D';
import SmartTVControlPanel from './components/SmartTVControlPanel';

import { RoomPhotoStudioPanel } from './components/RoomPhotoStudioPanel';

import DomoticaAutomationsPanel from './components/DomoticaAutomationsPanel';

import Z2MLightingHub from './components/Z2MLightingHub';

import LiveCamerasPanel from './components/LiveCamerasPanel';

import AutomationsAndSensorsPanel from './components/AutomationsAndSensorsPanel';

import ObsidianVaultPanel from './components/ObsidianVaultPanel';

import DynamicWidgetsGrid from './components/DynamicWidgetsGrid';

import SetupWizard from './components/SetupWizard';

import TabletScreensaver from './components/TabletScreensaver';

import VisualStatusPanel from './components/VisualStatusPanel';

import ApexDiagnosticPanel from './components/ApexDiagnosticPanel';

import TabletSidebar from './components/TabletSidebar';

import InstallerSecurityModal from './components/InstallerSecurityModal';

import BunkerContainer from './bunker/BunkerContainer';

const API_BASE = "";

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

class ErrorBoundary extends React.Component {

  constructor(props) {

    super(props);

    this.state = { hasError: false, error: null };

  }

  static getDerivedStateFromError(error) {

    return { hasError: true, error };

  }

  render() {

    if (this.state.hasError) {
  return (

        <div style={{ padding: '2rem', background: '#ff003c22', border: '1px solid #ff003c', color: '#ff003c' }}>

          <h2>Error de Renderizado en la Pestaña</h2>

          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>

        </div>

      );

    }

    return this.props.children;

  }

}

const USER_TABS = [

  { id: 'radio', label: '📻 RADIO & MATRIZ DE AUDIO', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.18)' },

  { id: 'agenda', label: '📅 GESTIÓN DE AGENDA', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.18)' },

  { id: 'security', label: '🛡️ SEGURIDAD Y RECONOCIMIENTO', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.18)' },

  { id: 'cctv_cameras', label: '📹 VIGILANCIA CCTV', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.25)' },

  { id: 'automations_sensors', label: '⚡ AUTOMATIZACIONES Y SENSORES', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.25)' },

  { id: 'visuals', label: '🎨 AJUSTES VISUALES', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)' },

  { id: 'avatar', label: '👤 GESTOR AVATAR', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)' },

  { id: 'obsidian', label: '🟣 OBSIDIAN (SEGUNDO CEREBRO)', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.25)' },

  { id: 'bunker', label: '🧱 EL BÚNKER IA (SANDBOX)', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.25)' }

];

const INSTALLER_TABS = [

  { id: 'floor_plan_editor', label: '📐 EDITOR 3D Y PLANO DE LA CASA', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.28)' },

  { id: 'setup_wizard', label: '🪄 ASISTENTE "TOCA Y LISTO"', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.28)' },

  { id: 'z2m_hub', label: '⚡ INTERRUPTORES, LUCES Y SENSORES', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.25)' },

  { id: 'main', label: '⚙️ CONFIGURACIÓN DEL SISTEMA', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.18)' },

  { id: 'auditoria', label: '🛡️ AUDITORÍA Y LOGS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', isError: true },

  { id: 'network', label: '🌐 RED Y CONEXIONES', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)' },

  { id: 'rooms_studio', label: '📸 ESTUDIO FOTORREALISTA', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.22)' },

  { id: 'bunker', label: '🧱 EL BÚNKER IA (SANDBOX)', color: '#00f3ff', bg: 'rgba(0, 243, 255, 0.25)' }

];

// Detección inteligente de hardware (Método A: User-Agent oficial de Google + Dimensiones de pantalla)

export const getDeviceInfo = () => {

  if (typeof window === 'undefined') {

    return { isPhone: false, isTablet: false, isAndroid: false, isSmallScreen: false };

  }

  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();

  // 1. Detección Android oficial:

  // - Teléfono móvil Android: Contiene "android" Y "mobile"

  // - Tablet Android: Contiene "android" pero NUNCA contiene "mobile"

  const isAndroid = ua.includes('android');

  const hasMobileWord = ua.includes('mobile');

  const isAndroidPhone = isAndroid && hasMobileWord;

  const isAndroidTablet = isAndroid && !hasMobileWord;

  // 2. Detección iOS (iPhone vs iPad):

  const isIPhone = ua.includes('iphone') || ua.includes('ipod');

  const isIPad = ua.includes('ipad') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);

  // 3. Dimensiones físicas (pantalla y ventana en dp / CSS pixels):

  const screenMin = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);

  const winWidth = window.innerWidth || 9999;

  const isSmallScreen = screenMin < 600 || winWidth <= 768;

  // Criterio Teléfono Móvil:

  const isPhone = isAndroidPhone || isIPhone || (hasMobileWord && isSmallScreen) || (isSmallScreen && isAndroid);

  // Criterio Tablet:

  const isTablet = (isAndroidTablet || isIPad || (isAndroid && !isPhone && screenMin >= 600)) && !isPhone;

  return {

    isPhone,

    isTablet,

    isAndroid,

    isAndroidPhone,

    isAndroidTablet,

    isIPhone,

    isIPad,

    isSmallScreen,

    screenMin,

    winWidth,

    ua

  };

};

function App() {
  const [showTvModal, setShowTvModal] = useState(false);

  useEffect(() => {
    const handleOpenTv = () => setShowTvModal(true);
    window.addEventListener('habana-open-tv-modal', handleOpenTv);
    return () => window.removeEventListener('habana-open-tv-modal', handleOpenTv);
  }, []);

  const isCameraStream = new URLSearchParams(window.location.search).get('stream_camera') === 'true';

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const isTabletParam = urlParams ? (urlParams.get('tablet') === 'true' || urlParams.get('mode') === 'tablet') : false;

  const isTabletDisable = urlParams ? (urlParams.get('tablet') === 'false' || urlParams.get('mode') === 'full' || urlParams.get('mode') === 'mobile') : false;

  const isForceTablet = urlParams ? urlParams.get('force_tablet') === 'true' : false;

  const isForceMobile = urlParams ? (urlParams.get('mobile') === 'true' || urlParams.get('mode') === 'mobile') : false;

  const [deviceInfo, setDeviceInfo] = useState(() => getDeviceInfo());

  useEffect(() => {

    const handleResize = () => setDeviceInfo(getDeviceInfo());

    window.addEventListener('resize', handleResize);

    window.addEventListener('orientationchange', handleResize);

    
  return () => {

      window.removeEventListener('resize', handleResize);

      window.removeEventListener('orientationchange', handleResize);

    };

  }, []);

  const [isTabletMode, setIsTabletMode] = useState(() => {

    // 1. Si se desactiva explícitamente o se fuerza modo móvil:

    if (isTabletDisable || isForceMobile) {

      try { localStorage.removeItem('habana_tablet_mode'); } catch(e) {}

      return false;

    }

    // 2. Si es físicamente un teléfono móvil y NO se forzó force_tablet=true:

    // Aunque la APK de tablet cargue ?tablet=true, en un teléfono se anula el modo tablet

    const initialDev = getDeviceInfo();

    if (initialDev.isPhone && !isForceTablet) {

      try { localStorage.removeItem('habana_tablet_mode'); } catch(e) {}

      return false;

    }

    // 3. Si se fuerza tablet explícitamente:

    if (isForceTablet) {

      try { localStorage.setItem('habana_tablet_mode', 'true'); } catch(e) {}

      return true;

    }

    // 4. Si la APK o la URL solicita tablet y NO es un smartphone:

    if (isTabletParam) {

      try { localStorage.setItem('habana_tablet_mode', 'true'); } catch(e) {}

      return true;

    }

    // 5. Detección automática en Tablet Android física sin parámetro:

    if (initialDev.isTablet) {

      return true;

    }

    try {

      return localStorage.getItem('habana_tablet_mode') === 'true';

    } catch(e) {

      return false;

    }

  });

  const [isScreensaverActive, setIsScreensaverActive] = useState(false);

  const [isCharging, setIsCharging] = useState(true);

  const [batteryLevel, setBatteryLevel] = useState(null);

  // Detección de estado de carga (Enchufado = Funcionamiento Normal, Desenchufado = Modo Ahorro)

  useEffect(() => {

    let batteryObj = null;

    const handleBatteryChange = () => {

      if (batteryObj) {

        setIsCharging(Boolean(batteryObj.charging));

        setBatteryLevel(Math.round((batteryObj.level || 1) * 100));

      }

    };

    // 1. Puente nativo Android APK (BatteryManager en tiempo real)

    if (window.HabanaNativePower) {

      try {

        setIsCharging(Boolean(window.HabanaNativePower.isCharging()));

        const lvl = window.HabanaNativePower.getBatteryLevel();

        if (typeof lvl === 'number' && lvl >= 0) setBatteryLevel(lvl);

      } catch (e) {}

    }

    const onNativePower = (ev) => {

      if (ev && ev.detail) {

        if (typeof ev.detail.charging === 'boolean') setIsCharging(ev.detail.charging);

        if (typeof ev.detail.level === 'number' && ev.detail.level >= 0) setBatteryLevel(ev.detail.level);

      }

    };

    window.addEventListener('habana-native-power', onNativePower);

    // 2. API Web estándar navigator.getBattery()

    if (navigator.getBattery) {

      navigator.getBattery().then((bat) => {

        batteryObj = bat;

        handleBatteryChange();

        bat.addEventListener('chargingchange', handleBatteryChange);

        bat.addEventListener('levelchange', handleBatteryChange);

      }).catch(() => {});

    }

    
  return () => {

      window.removeEventListener('habana-native-power', onNativePower);

      if (batteryObj) {

        batteryObj.removeEventListener('chargingchange', handleBatteryChange);

        batteryObj.removeEventListener('levelchange', handleBatteryChange);

      }

    };

  }, []);

  const [screensaverTimeout, setScreensaverTimeout] = useState(() => {

    // Por defecto 'never' para que NINGUNA pantalla se ponga en negro sola

    return localStorage.getItem('habana_screensaver_timeout') || 'never';

  });

  const handleSetScreensaverTimeout = (val) => {

    setScreensaverTimeout(val);

    try {

      localStorage.setItem('habana_screensaver_timeout', val);

    } catch (e) {}

    if (val === 'never') {

      setIsScreensaverActive(false);

    }

  };

  // WAKE LOCK: Mantener la pantalla encendida siempre (evita que Android/Windows apague la pantalla en negro)

  useEffect(() => {

    let wakeLockSentinel = null;

    const requestWakeLock = async () => {

      try {

        if ('wakeLock' in navigator && document.visibilityState === 'visible') {

          wakeLockSentinel = await navigator.wakeLock.request('screen');

        }

      } catch (err) {}

    };

    requestWakeLock();

    const handleVisibility = () => {

      if (document.visibilityState === 'visible') {

        requestWakeLock();

      }

    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Si existe APK nativa HabanaNativePower, forzar FLAG_KEEP_SCREEN_ON

    if (window.HabanaNativePower) {

      try {

        if (typeof window.HabanaNativePower.setKeepScreenOn === 'function') {

          window.HabanaNativePower.setKeepScreenOn(true);

        }

        if (typeof window.HabanaNativePower.setScreensaverState === 'function') {

          window.HabanaNativePower.setScreensaverState(false);

        }

      } catch (e) {}

    }

    
  return () => {

      document.removeEventListener('visibilitychange', handleVisibility);

      if (wakeLockSentinel) wakeLockSentinel.release().catch(() => {});

    };

  }, []);

  // Sincronizar el estado del protector de pantalla con el brillo físico de la APK Android

  useEffect(() => {

    if (window.HabanaNativePower && typeof window.HabanaNativePower.setScreensaverState === 'function') {

      try {

        const shouldDim = Boolean(isScreensaverActive && screensaverTimeout !== 'never');

        window.HabanaNativePower.setScreensaverState(shouldDim);

      } catch (e) {}

    }

  }, [isScreensaverActive, screensaverTimeout]);

  useEffect(() => {

    // Si no está en modo tablet o el protector está desactivado ('never'), NUNCA activar protector

    if (!isTabletMode || screensaverTimeout === 'never') {

      setIsScreensaverActive(false);

      return;

    }

    const timeoutMs = parseInt(screensaverTimeout, 10) || (15 * 60 * 1000);

    let inactivityTimer = null;

    const resetInactivityTimer = () => {

      if (inactivityTimer) clearTimeout(inactivityTimer);

      inactivityTimer = setTimeout(() => {

        setIsScreensaverActive(true);

      }, timeoutMs);

    };

    const events = ['mousedown', 'mousemove', 'touchstart', 'keydown', 'click', 'wheel', 'pointerdown'];

    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));

    resetInactivityTimer();

    
  return () => {

      if (inactivityTimer) clearTimeout(inactivityTimer);

      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));

    };

  }, [isTabletMode, screensaverTimeout]);

const [activeTab, setActiveTab] = useState(() => {

    if (urlParams?.get('tab') === 'bunker' || (typeof window !== 'undefined' && window.location.hash === '#bunker')) return 'config';

    return 'principal';

  });

  const [status, setStatus] = useState(null);

  const [logs, setLogs] = useState([]);

  const [healthData, setHealthData] = useState({ health: {}, alerts: [] });

  const [stats, setStats] = useState(null);

  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem('habanaLuxDefaultV1')) {
        localStorage.setItem('habanaLuxDefaultV1', 'true');
        localStorage.setItem('habanaTheme', 'megaluxury');
        return 'megaluxury';
      }
    } catch (e) {}

    const saved = typeof window !== 'undefined' ? localStorage.getItem('habanaTheme') : null;

    if (!saved || saved === 'mobile' || saved === 'mobile-voice') {

      return 'megaluxury';

    }

    return saved;

  });

  const [activePersona, setActivePersona] = useState('friday');

  const [voiceGender, setVoiceGender] = useState('female');

  const [voiceEngine, setVoiceEngine] = useState('groq');

  const [audioOutput, setAudioOutput] = useState('local');

  const [serverMode, setServerMode] = useState('local');

  const [chatInput, setChatInput] = useState("");

  const [chatHistory, setChatHistory] = useState([]);

  const [conversations, setConversations] = useState([]);

  const [mediaFiles, setMediaFiles] = useState([]);

  const [devices, setDevices] = useState([]);

  const [domoticaViewMode, setDomoticaViewMode] = useState('list');

  const [domoticaRealOnly, setDomoticaRealOnly] = useState(true);

  const [routines, setRoutines] = useState([]);

  const [sensors, setSensors] = useState([]);

  const [isListening, setIsListening] = useState(false);

  const [systemRole, setSystemRole] = useState('user'); // 'user' | 'installer'

  const [securityModal, setSecurityModal] = useState({ open: false, mode: 'settings' });

  const [installerSecurity, setInstallerSecurity] = useState({ pin_enabled: false, has_pin: false });

  const [configView, setConfigView] = useState(() => {

    if (urlParams?.get('tab') === 'bunker' || urlParams?.get('view') === 'bunker' || (typeof window !== 'undefined' && window.location.hash === '#bunker')) return 'bunker';

    return 'radio';

  });

  const fetchInstallerSecurity = async () => {

    try {

      const res = await fetch(`${API_BASE}/api/system/installer-security`);

      if (res.ok) {

        const data = await res.json();

        setInstallerSecurity(data);

      }

    } catch (e) {

      console.error('Error fetching installer security:', e);

    }

  };

  useEffect(() => {

    fetchInstallerSecurity();

  }, []);

  const handleSwitchToInstaller = async () => {

    try {

      const res = await fetch(`${API_BASE}/api/system/installer-security`);

      if (res.ok) {

        const data = await res.json();

        setInstallerSecurity(data);

        if (data.pin_enabled && data.has_pin) {

          setSecurityModal({ open: true, mode: 'verify' });

          return;

        }

      }

    } catch (e) {

      console.error(e);

    }

    setSystemRole('installer');

    setConfigView('z2m_hub');

  };

  const [domoticsMode, setDomoticsMode] = useState('hybrid');

  const [toast, setToast] = useState(null);

  const [radioStations, setRadioStations] = useState([]);

  const [playingStationId, setPlayingStationId] = useState(null);

  const [securityFrame, setSecurityFrame] = useState(null);

  const [securityEvent, setSecurityEvent] = useState(null);

  const [isBgCameraEnabled, setIsBgCameraEnabled] = useState(localStorage.getItem('habana_bg_camera') === 'true');

  const [principalView, setPrincipalView] = useState('avatar'); // 'avatar' | 'digital_twin'

  const radioStreamRef = useRef(null);

  useEffect(() => {

    const radioEl = radioStreamRef.current || document.getElementById('habanaRadioStream');

    if (!radioEl) return;

    if (playingStationId) {

      const st = (radioStations || []).find(s => s.id === playingStationId);

      const streamUrl = st?.url || (playingStationId === 'los40' ? 'https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3' : null);

      if (streamUrl) {

        if (radioEl.src !== streamUrl) {

          radioEl.src = streamUrl;

        }

        radioEl.play().catch(e => console.log('Audio autoplay en navegador:', e));

      }

    } else {

      if (radioEl.src && !radioEl.paused) {

        radioEl.pause();

        radioEl.src = '';

      }

    }

  }, [playingStationId, radioStations]);

  const toggleDevice = async (entityId, currentStateOrAction, position = null) => {

    const dom = entityId.split('.')[0];

    if (dom === 'sensor' || dom === 'binary_sensor') return;

    let action = currentStateOrAction;

    if (position !== null && position !== undefined) {

      action = 'set_cover_position';

    } else if (['on', 'off', 'open', 'closed', 'opening', 'closing'].includes(currentStateOrAction)) {

      const active = ['on', 'playing', 'open', 'opening'].includes(currentStateOrAction);

      action = dom === 'scene' ? 'turn_on' : (active ? 'turn_off' : 'turn_on');

    }

    try {

      const payload = { entity_id: entityId, action };

      if (position !== null && position !== undefined) {

        payload.position = position;

      }

      await fetch(`${API_BASE}/api/devices/control`, {

        method: 'POST',

        headers: {'Content-Type': 'application/json'},

        body: JSON.stringify(payload)

      });

      let newState = 'on';

      if (dom === 'cover') {

        if (position !== null && position !== undefined) {

          newState = position > 0 ? 'open' : 'closed';

        } else {

          newState = (action === 'turn_on' || action === 'open' || action === 'open_cover') ? 'open' : 'closed';

        }

      } else if (dom === 'scene') {

        newState = new Date().toISOString();

      } else {

        newState = action === 'turn_on' ? 'on' : 'off';

      }

      setDevices(prev => prev.map(d => d.id === entityId ? {

        ...d, 

        state: newState,

        attributes: position !== null ? { ...(d.attributes || {}), current_position: position } : d.attributes

      } : d));

    } catch (e) {

      console.error('Control error', e);

    }

  };

  const handleTabChange = (tab) => {

    if (tab === 'bunker') {

      setActiveTab('config');

      setConfigView('bunker');

      fetch(`${API_BASE}/api/state/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ global_tab: 'bunker' }) }).catch(e => console.error(e));

      return;

    }

    const cleanTab = tab === 'memory' ? 'principal' : tab;

    setActiveTab(cleanTab);

    if (tab === 'principal') setPrincipalView('avatar');

    fetch(`${API_BASE}/api/state/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ global_tab: tab }) }).catch(e => console.error(e));

  };

  const handleThemeChange = (newTheme) => {

    setTheme(newTheme);

    fetch(`${API_BASE}/api/state/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ global_theme: newTheme }) }).catch(e => console.error(e));

  };

  useEffect(() => {

    const onHabanaNav = (e) => {

      if (e.detail?.tab) handleTabChange(e.detail.tab);

      if (e.detail?.viewMode) setDomoticaViewMode(e.detail.viewMode);

    };

    window.addEventListener('habana-navigate', onHabanaNav);

    
  return () => window.removeEventListener('habana-navigate', onHabanaNav);

  }, []);

  useEffect(() => {

    document.body.className = `theme-${theme}`;

    localStorage.setItem('habanaTheme', theme);

    if (theme !== 'megaluxury') {
      document.querySelectorAll('[data-lux-box],[data-lux-btn],[data-lux-text],[data-lux-badge]').forEach(el => {
        el.removeAttribute('data-lux-box');
        el.removeAttribute('data-lux-btn');
        el.removeAttribute('data-lux-text');
        el.removeAttribute('data-lux-badge');
      });
      return;
    }

    const applyLuxuryAttributes = () => {
      // 1. Cuadros, Cajas y Contenedores
      document.querySelectorAll('div[style], section[style], form[style], article[style]').forEach(el => {
        if (el.classList.contains('bottom-nav') || el.classList.contains('cyber-toast-container')) return;
        const st = (el.getAttribute('style') || '').toLowerCase();
        // Ignorar pequeños puntos indicadores (status dots)
        if ((st.includes('width: 6px') || st.includes('width: 7px') || st.includes('width: 8px') || st.includes('width: 9px') || st.includes('width: 10px')) && st.includes('border-radius: 50%')) {
          return;
        }
        if (st.includes('position: sticky')) {
          el.setAttribute('data-lux-box', 'sticky');
          return;
        }
        const hasDarkBg = (
          st.includes('#0') || st.includes('#1') ||
          st.includes('rgb(2,') || st.includes('rgb(3,') || st.includes('rgb(4,') ||
          st.includes('rgb(5,') || st.includes('rgb(6,') || st.includes('rgb(7,') ||
          st.includes('rgb(8,') || st.includes('rgb(9,') || st.includes('rgb(10,') ||
          st.includes('rgb(11,') || st.includes('rgb(12,') || st.includes('rgb(14,') ||
          st.includes('rgb(15,') || st.includes('rgb(16,') || st.includes('rgb(20,') ||
          st.includes('rgb(30,') || st.includes('rgba(2,') || st.includes('rgba(3,') ||
          st.includes('rgba(4,') || st.includes('rgba(5,') || st.includes('rgba(6,') ||
          st.includes('rgba(7,') || st.includes('rgba(8,') || st.includes('rgba(9,') ||
          st.includes('rgba(10,') || st.includes('rgba(11,') || st.includes('rgba(12,') ||
          st.includes('rgba(14,') || st.includes('rgba(15,') || st.includes('rgba(20,') ||
          st.includes('rgba(30,') || st.includes('rgba(0, 0, 0') || st.includes('rgba(0,0,0')
        );
        const hasTranslucentCard = (
          st.includes('rgba(255, 255, 255, 0.0') || st.includes('rgba(255,255,255,0.0') ||
          st.includes('rgba(148, 163, 184, 0.1')
        );
        const hasActiveGlow = (
          (st.includes('rgba(0, 243, 255, 0.1') || st.includes('rgba(0, 243, 255, 0.2') || st.includes('rgba(245, 158, 11, 0.1')) &&
          !hasDarkBg
        );

        if (hasDarkBg) {
          const isLargePanel = st.includes('padding: 24px') || st.includes('padding: 22px') || st.includes('padding: 20px') || st.includes('padding: 18px') || st.includes('radial-gradient');
          el.setAttribute('data-lux-box', isLargePanel ? 'panel' : 'subcard');
        } else if (hasTranslucentCard) {
          el.setAttribute('data-lux-box', 'subcard');
        } else if (hasActiveGlow) {
          el.setAttribute('data-lux-box', 'active-card');
        }
      });

      // 2. Botones
      document.querySelectorAll('button').forEach(btn => {
        if (btn.classList.contains('bottom-nav-btn')) return;
        const st = (btn.getAttribute('style') || '').toLowerCase();
        const isRuby = st.includes('239, 68, 68') || st.includes('#ef4444') || st.includes('185, 28, 28') || st.includes('#dc2626') || btn.classList.contains('error');
        const isEmerald = (st.includes('16, 185, 129') || st.includes('#10b981') || st.includes('34, 197, 94')) && !st.includes('rgba(0, 243, 255');
        const isActive = (
          btn.classList.contains('active') ||
          ((st.includes('0, 243, 255') || st.includes('#00f3ff') || st.includes('255, 70, 18') || st.includes('#ff4612') || st.includes('168, 85, 247') || st.includes('56, 189, 248') || st.includes('251, 146, 60') || st.includes('197, 155, 39') || st.includes('#c59b27')) &&
           (st.includes('linear-gradient') || st.includes('0.2') || st.includes('0.22') || st.includes('0.25') || st.includes('0.28') || st.includes('0.3') || st.includes('0.35') || st.includes('0.4')))
        );

        if (isRuby) {
          btn.setAttribute('data-lux-btn', 'ruby');
        } else if (isEmerald) {
          btn.setAttribute('data-lux-btn', 'emerald');
        } else if (isActive) {
          btn.setAttribute('data-lux-btn', 'active');
        } else {
          btn.setAttribute('data-lux-btn', 'default');
        }
      });

      // 3. Textos y Etiquetas con color inline
      document.querySelectorAll('div[style*="color"], span[style*="color"], p[style*="color"], h1[style*="color"], h2[style*="color"], h3[style*="color"], td[style*="color"], th[style*="color"], label[style*="color"], strong[style*="color"]').forEach(el => {
        if (el.closest('button[data-lux-btn="active"]') || el.closest('.bottom-nav-btn.active')) return;
        const c = (el.style.color || '').toLowerCase().replace(/\s+/g, '');
        if (
          c === '#fff' || c === '#ffffff' || c === 'white' ||
          c === 'rgb(255,255,255)' || c === 'rgb(248,250,252)' ||
          c === 'rgb(226,232,240)' || c === 'rgb(203,213,225)' ||
          c === '#f8fafc' || c === '#e2e8f0' || c === '#cbd5e1'
        ) {
          el.setAttribute('data-lux-text', 'heading');
        } else if (
          c === 'rgb(148,163,184)' || c === 'rgb(100,116,139)' ||
          c === '#94a3b8' || c === '#64748b'
        ) {
          el.setAttribute('data-lux-text', 'muted');
        } else if (
          c === 'rgb(251,191,36)' || c === '#fbbf24' ||
          c === 'rgb(245,158,11)' || c === '#f59e0b' ||
          c === 'rgb(234,179,8)' || c === '#eab308' ||
          c === 'rgb(253,230,138)' || c === '#fde68a' ||
          c === 'rgb(254,240,138)' || c === '#fef08a' ||
          c === 'rgb(51,65,85)' || c === '#334155'
        ) {
          el.setAttribute('data-lux-text', 'darkgray');
          if (el.tagName === 'SPAN' && el.style.border) {
            el.setAttribute('data-lux-badge', 'darkgray');
          }
        } else if (
          c === 'rgb(52,211,153)' || c === '#34d399' ||
          c === 'rgb(16,185,129)' || c === '#10b981' ||
          c === 'rgb(74,222,128)' || c === '#4ade80' ||
          c === 'rgb(110,231,183)' || c === '#6ee7b7' ||
          c === 'rgb(6,95,70)' || c === '#065f46'
        ) {
          el.setAttribute('data-lux-text', 'darkgreen');
          if (el.tagName === 'SPAN' && el.style.border) {
            el.setAttribute('data-lux-badge', 'darkgreen');
          }
        } else if (
          c === 'rgb(0,243,255)' || c === '#00f3ff' ||
          c === 'rgb(56,189,248)' || c === '#38bdf8' ||
          c === 'rgb(34,211,238)' || c === '#22d3ee' ||
          c === 'rgb(255,70,18)' || c === '#ff4612'
        ) {
          el.setAttribute('data-lux-text', 'gold');
          if (el.tagName === 'SPAN' && el.style.border) {
            el.setAttribute('data-lux-badge', 'gold');
          }
        }
      });
    };

    applyLuxuryAttributes();
    const obs = new MutationObserver(() => {
      applyLuxuryAttributes();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    
  return () => obs.disconnect();

  }, [theme, activeTab, configView, principalView, isTabletMode]);

  const [debugMsg, setDebugMsg] = useState('Inicializando...');

  const [agendaItems, setAgendaItems] = useState([]);

  const [agendaTitle, setAgendaTitle] = useState("");

  const [agendaDesc, setAgendaDesc] = useState("");

  const [agendaDate, setAgendaDate] = useState("");

  const [agendaType, setAgendaType] = useState("Recordatorio");

  const [agendaMedia, setAgendaMedia] = useState("");

  const [liveStatus, setLiveStatus] = useState('off'); // off | connecting | ready | active

  const [showMigration, setShowMigration] = useState(false);

  const [showWAQR, setShowWAQR] = useState(false);

  const [waStatus, setWaStatus] = useState({ status: 'unknown' });

  const [isResettingWA, setIsResettingWA] = useState(false);

  const [waQrKey, setWaQrKey] = useState(Date.now());

  const [waQrError, setWaQrError] = useState(false);

  const fetchWAStatus = async () => {

    try {

      const res = await fetch(`${API_BASE}/api/whatsapp/status`);

      if (res.ok) {

        const data = await res.json();

        setWaStatus(data);

      }

    } catch(e) {}

  };

  const handleGenerateNewWAQR = async () => {

    setIsResettingWA(true);

    setWaQrError(false);

    try {

      await fetch(`${API_BASE}/api/whatsapp/reset`, { method: 'POST' });

      setTimeout(async () => {

        setWaQrKey(Date.now());

        setIsResettingWA(false);

        await fetchWAStatus();

      }, 2000);

    } catch (err) {

      console.error("Error al resetear QR:", err);

      setIsResettingWA(false);

    }

  };

  const audioRef = useRef(null);

  const lastNotifRef = useRef(0);

  

  // Ref for Live Streaming

  const liveWsRef = useRef(null);

  const liveAudioCtxRef = useRef(null);

  const liveAudioCtxInputRef = useRef(null);

  const liveProcessorRef = useRef(null);

  const liveStreamRef = useRef(null);

  const isListeningRef = useRef(false);

  const nextStartTimeRef = useRef(0);

  const refreshDevices = async () => {

    try {

      const devRes = await fetch(`${API_BASE}/api/devices?real_only=${domoticaRealOnly}&_=${Date.now()}`);

      if (devRes.ok) {

        const devData = await devRes.json();

        if (Array.isArray(devData)) {

          setDevices(devData.filter(d => d.domain !== 'sensor'));

          setSensors(devData.filter(d => d.domain === 'sensor'));

        } else if (devData.devices) {

          setDevices(devData.devices);

          setSensors(devData.sensors || []);

        }

      }

    } catch (e) {

      console.error('Error refreshing devices:', e);

    }

  };

  useEffect(() => {

    // Polling básico al backend central

    const checkStatus = async () => {

      try {

        const res = await fetch(`${API_BASE}/api/status?_=${Date.now()}`);

        if(res.ok) {

          const data = await res.json();

          setStatus(prev => {

             if (JSON.stringify(prev) === JSON.stringify(data)) return prev;

             return data;

          });

          if (data.state && data.state.active_persona) {

            setActivePersona(data.state.active_persona);

            }

            if (data.state && data.state.voice_gender) {

              setVoiceGender(data.state.voice_gender);

          }

          if (data.state && data.state.voice_engine) {

            setVoiceEngine(data.state.voice_engine);

          }

          if (data.state && data.state.audio_output) {

            setAudioOutput(data.state.audio_output);

          }

          if (data.state && data.state.server_mode) {

            setServerMode(data.state.server_mode);

          }

          if (data.state && data.state.global_theme) {

            setTheme(prev => prev !== data.state.global_theme ? data.state.global_theme : prev);

          }

          if (data.state && data.state.global_tab) {

            const targetTab = data.state.global_tab === 'memory' ? 'principal' : data.state.global_tab;

            setActiveTab(prev => prev !== targetTab ? targetTab : prev);

          }

          if (data.state && data.state.global_chat_history !== undefined) {

            setChatHistory(prev => {

                if (JSON.stringify(prev) !== JSON.stringify(data.state.global_chat_history)) {

                    return data.state.global_chat_history;

                }

                return prev;

            });

          }

          if (data.state && data.state.global_radio_station !== undefined) {

            setPlayingStationId(data.state.global_radio_station);

          }

          if (data.state && data.state.notification_timestamp) {

            if (data.state.notification_timestamp > lastNotifRef.current) {

                lastNotifRef.current = data.state.notification_timestamp;

                if (data.state.audio_output === 'local' && data.state.notification_audio_url) {

                    const audioEl = document.getElementById('hiddenAudio');

                    if (audioEl) {

                        audioEl.src = `${API_BASE}${data.state.notification_audio_url}`;

                        audioEl.play().catch(e => console.log("Auto-play prevented", e));

                    }

                }

            }

          }

          // Remove interval-based playback to avoid autoplay blocking

        }

      } catch (e) {

        console.error("Backend no disponible", e);

      }

      

      if (activeTab === 'auditoria' || configView === 'auditoria' || activeTab === 'neural') {

        try {

          const logRes = await fetch(`${API_BASE}/api/logs?_=${Date.now()}`);

          if(logRes.ok) {

            const logData = await logRes.json();

            setLogs(logData.logs);

          }

          const healthRes = await fetch(`${API_BASE}/api/health/full?_=${Date.now()}`);

          if(healthRes.ok) {

            const hData = await healthRes.json();

            setHealthData(hData);

          }

          const statsRes = await fetch(`${API_BASE}/api/stats?_=${Date.now()}`);

          if(statsRes.ok) {

            const sData = await statsRes.json();

            setStats(sData.stats);

          }

        } catch (e) {}

      }

      

      if (activeTab === 'whatsapp') {

        try {

          const convRes = await fetch(`${API_BASE}/api/conversations?_=${Date.now()}`);

          if(convRes.ok) {

            const convData = await convRes.json();

            setConversations(convData.conversations);

          }

        } catch (e) {}

        

        try {

          const mediaRes = await fetch(`${API_BASE}/api/media?_=${Date.now()}`);

          if(mediaRes.ok) {

            const mediaData = await mediaRes.json();

            setMediaFiles(mediaData.files);

          }

        } catch (e) {}

      }

      

      try {

        const devRes = await fetch(`${API_BASE}/api/devices?real_only=${domoticaRealOnly}&_=${Date.now()}`);

        if(devRes.ok) {

          const devData = await devRes.json();

          if (Array.isArray(devData)) {

            const allSensors = devData.filter(d => d.domain === 'sensor');

            const allDevices = devData.filter(d => d.domain !== 'sensor');

            setDevices(allDevices);

            setSensors(allSensors);

          } else {

            setDevices(devData.devices || []);

            setSensors(devData.sensors || []);

          }

        }

        

        // Fetch routines

        if (activeTab === 'zigbee') {

          const routRes = await fetch(`${API_BASE}/api/routines?_=${Date.now()}`);

          if(routRes.ok) {

            const routData = await routRes.json();

            setRoutines(routData);

          }

        }

      } catch (e) {

        setDebugMsg(`Excepción en fetch: ${e.message}`);

      }

    };

    // SSE desactivado: /api/state/stream no existe en este backend

    // El polling por setInterval cubre la sincronización de estado

    const evtSource = { close: () => {} }; // stub para que el cleanup no falle

    checkStatus();

    const pollIntervalMs = (!isCharging && isScreensaverActive) ? 15000 : (!isCharging ? 6000 : 3000);

    const int = setInterval(checkStatus, pollIntervalMs);

    
  return () => {

      clearInterval(int);

      evtSource.close();

    };

  }, [activeTab, configView, domoticaRealOnly, isCharging, isScreensaverActive]);

  useEffect(() => {

    let ws = null;

    if (activeTab === 'neural' || activeTab === 'principal') {

      ws = new WebSocket(`${WS_BASE}/api/security/ws`);

      ws.onmessage = (event) => {

        try {

          const data = JSON.parse(event.data);

          if (data.type === 'frame') {

            setSecurityFrame(data.data);

          } else if (data.type === 'security_event' || data.type === 'alarm_state') {

            if (data.phase === 'PHASE2' || data.phase === 'PHASE3') {

              setSecurityEvent(data);

            } else if (data.phase === 'IDLE') {

              setSecurityEvent(null);

            }

          }

        } catch(e) {}

      };

    }
  return () => {

      if (ws) ws.close();

    };

  }, [activeTab]);

  const playLiveAudioChunk = (arrayBuffer) => {

    if (!liveAudioCtxRef.current) {

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      liveAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });

      nextStartTimeRef.current = liveAudioCtxRef.current.currentTime;

    }

    const audioContext = liveAudioCtxRef.current;

    if (audioContext.state === 'suspended') {

      audioContext.resume();

    }

    try {

      const int16Array = new Int16Array(arrayBuffer);

      const audioBuffer = audioContext.createBuffer(1, int16Array.length, 24000);

      const float32Array = audioBuffer.getChannelData(0);

      for (let i = 0; i < int16Array.length; i++) {

        float32Array[i] = int16Array[i] / 32768.0;

      }

      const source = audioContext.createBufferSource();

      source.buffer = audioBuffer;

      source.connect(audioContext.destination);

      const playTime = Math.max(audioContext.currentTime, nextStartTimeRef.current);

      source.start(playTime);

      nextStartTimeRef.current = playTime + audioBuffer.duration;

    } catch (e) {

      console.error('Audio play err:', e);

    }

  };

  const connectGeminiLive = () => {

    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) return;

    setLiveStatus('connecting');

    const ws = new WebSocket(`${WS_BASE}/ws/gemini_live`);

    liveWsRef.current = ws;

    ws.onopen = () => {

      console.log("Gemini Live WS Connected");

      setLiveStatus('ready');

    };

    ws.onclose = () => {

      console.log("Gemini Live WS Disconnected");

      liveWsRef.current = null;

      setLiveStatus('off');

      setIsListening(false);

      isListeningRef.current = false;

    };

    ws.onerror = () => setLiveStatus('off');

    ws.onmessage = async (event) => {

      if (typeof event.data === 'string') {

        const data = JSON.parse(event.data);

        if (data.type === "error") console.error("Gemini Live Error:", data.message);

      } else {

        const arrayBuffer = await event.data.arrayBuffer();

        playLiveAudioChunk(arrayBuffer);

      }

    };

  };

  const disconnectGeminiLive = () => {

    stopLiveListening();

    if (liveWsRef.current) {

      liveWsRef.current.close();

      liveWsRef.current = null;

    }

    setLiveStatus('off');

  };

  const startLiveListening = async () => {

    try {

      // Connect WebSocket if not already connected

      if (!liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) {

        connectGeminiLive();

        // Wait a moment for connection

        await new Promise(resolve => setTimeout(resolve, 1200));

      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      liveStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      const audioCtx = new AudioContextClass({ sampleRate: 16000 });

      liveAudioCtxInputRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      const processor = audioCtx.createScriptProcessor(2048, 1, 1);

      liveProcessorRef.current = processor;

      source.connect(processor);

      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {

        if (!isListeningRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);

        const pcmBuffer = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {

          const s = Math.max(-1, Math.min(1, inputData[i]));

          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;

        }

        if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {

          liveWsRef.current.send(pcmBuffer.buffer);

        }

      };

      setIsListening(true);

      setLiveStatus('active');

      isListeningRef.current = true;

      } catch (e) {

        console.error("Mic error:", e);

        alert("Error de Micrófono: " + e.message);

        setIsListening(false);

        setLiveStatus('ready');

      }

  };

  const stopLiveListening = () => {

    setIsListening(false);

    isListeningRef.current = false;

    if (liveProcessorRef.current) {

      try { liveProcessorRef.current.disconnect(); } catch (e) {}

      liveProcessorRef.current = null;

    }

    if (liveAudioCtxInputRef.current) {

      try { liveAudioCtxInputRef.current.close(); } catch(e) {}

      liveAudioCtxInputRef.current = null;

    }

    if (liveStreamRef.current) {

      try { liveStreamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}

      liveStreamRef.current = null;

    }

    if (liveStatus === 'active') setLiveStatus('ready');

  };

  const toastTimerRef = useRef(null);

  // Cleanup on unmount only

  useEffect(() => {
  return () => {

      stopLiveListening();

      if (liveWsRef.current) liveWsRef.current.close();

      if (liveAudioCtxRef.current) {

        try { liveAudioCtxRef.current.close(); } catch (e) {}

        liveAudioCtxRef.current = null;

      }

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    };

  }, []);

  window.showToast = (msg, type = 'success') => {

    setToast({ msg, type });

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    toastTimerRef.current = setTimeout(() => setToast(null), 3000);

  };

  useEffect(() => {

    const fetchStaticData = async () => {

      try {

        const radioRes = await fetch(`${API_BASE}/api/radio/stations`);

        if (radioRes.ok) {

          const rd = await radioRes.json();

          setRadioStations(rd.stations || []);

        }

        const agendaRes = await fetch(`${API_BASE}/api/agenda`);

        if (agendaRes.ok) setAgendaItems((await agendaRes.json()) || []);

      } catch (e) {

        console.error("Error fetching static data", e);

      }

    };

    fetchStaticData();

  }, []);

  const renderBackButton = (onBack, label = 'VOLVER A PRINCIPAL') => {

    if (isTabletMode) return null;

    
  return (

      <button

        onClick={onBack}

        className="cyber-button"

        style={{

          display: 'flex',

          alignItems: 'center',

          gap: '6px',

          padding: '6px 12px',

          borderRadius: '8px',

          background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.18), rgba(16, 185, 129, 0.12))',

          border: '1px solid #00f3ff',

          color: '#00f3ff',

          fontWeight: 700,

          fontSize: '0.78rem',

          letterSpacing: '0.4px',

          cursor: 'pointer',

          boxShadow: '0 0 12px rgba(0, 243, 255, 0.2)',

          transition: 'all 0.2s ease'

        }}

        onMouseEnter={(e) => {

          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(16, 185, 129, 0.2))';

          e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 243, 255, 0.4)';

          e.currentTarget.style.transform = 'translateX(-2px)';

        }}

        onMouseLeave={(e) => {

          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 243, 255, 0.18), rgba(16, 185, 129, 0.12))';

          e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 243, 255, 0.2)';

          e.currentTarget.style.transform = 'translateX(0)';

        }}

      >

        <ArrowLeft size={14} />

        <span>{label}</span>

      </button>

    );

  };

  const renderRadioPanel = (onBackToPrincipal = null) => (

    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', height: '100%', overflowY: 'auto', padding: onBackToPrincipal ? '16px 20px' : '0', boxSizing: 'border-box' }}>

      {onBackToPrincipal && (

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>

          {renderBackButton(onBackToPrincipal)}

        </div>

      )}

      <div style={{

        background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',

        border: '1px solid rgba(0, 243, 255, 0.28)',

        borderRadius: '14px',

        padding: '24px',

        color: '#f8fafc',

        boxShadow: '0 8px 32px rgba(0,0,0,0.65)',

        fontFamily: 'Inter, system-ui, sans-serif'

      }}>

        {/* CABECERA STUDIO */}

        <div style={{

          display: 'flex',

          justifyContent: 'space-between',

          alignItems: 'flex-start',

          flexWrap: 'wrap',

          gap: '16px',

          borderBottom: '1px solid rgba(0, 243, 255, 0.18)',

          paddingBottom: '18px',

          marginBottom: '22px'

        }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

            <div style={{

              width: '48px',

              height: '48px',

              borderRadius: '12px',

              background: 'rgba(0, 243, 255, 0.12)',

              border: '1px solid rgba(0, 243, 255, 0.4)',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'

            }}>

              <Radio size={25} color="#00f3ff" />

            </div>

            <div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

                <span style={{

                  background: 'rgba(0, 243, 255, 0.14)',

                  border: '1px solid #00f3ff',

                  color: '#00f3ff',

                  padding: '2px 8px',

                  borderRadius: '20px',

                  fontSize: '0.66rem',

                  fontWeight: 'bold',

                  letterSpacing: '0.8px'

                }}>

                  HABANA 13 STREAMING DECK

                </span>

                <span style={{

                  background: playingStationId ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.14)',

                  border: `1px solid ${playingStationId ? '#10b981' : 'rgba(148, 163, 184, 0.35)'}`,

                  color: playingStationId ? '#34d399' : '#94a3b8',

                  padding: '2px 8px',

                  borderRadius: '20px',

                  fontSize: '0.66rem',

                  fontWeight: 'bold'

                }}>

                  {playingStationId

                    ? `● EN REPRODUCCIÓN: ${(radioStations.find(s => s.id === playingStationId)?.name || 'ACTIVO').toUpperCase()}`

                    : '○ EN ESPERA'}

                </span>

              </div>

              <h3 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>

                SISTEMA DE RADIO & SINTONIZADOR STREAMING

              </h3>

              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>

                Sintonizador digital de baja latencia con emisión directa a la matriz acústica multi-estancia.

              </p>

            </div>

          </div>

        </div>

        {/* GRID DE EMISORAS */}

        <div style={{

          display: 'grid',

          gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',

          gap: '12px',

          marginBottom: '20px'

        }}>

          {radioStations.map(station => {

            const isPlaying = playingStationId === station.id;

            
  return (

              <button

                key={station.id}

                className="cyber-button"

                style={{

                  padding: '16px 14px',

                  borderRadius: '12px',

                  background: isPlaying

                    ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(16, 185, 129, 0.18))'

                    : 'rgba(15, 23, 42, 0.65)',

                  border: isPlaying

                    ? '1px solid #00f3ff'

                    : '1px solid rgba(255, 255, 255, 0.08)',

                  boxShadow: isPlaying ? '0 0 18px rgba(0, 243, 255, 0.32)' : 'none',

                  color: isPlaying ? '#fff' : '#cbd5e1',

                  cursor: 'pointer',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'space-between',

                  gap: '8px',

                  fontWeight: 'bold',

                  fontSize: '0.86rem',

                  transition: 'all 0.2s ease'

                }}

                onClick={() => {

                  fetch(`${API_BASE}/api/radio/play/${station.id}`, { method: 'POST' })

                    .then(() => window.showToast(`Reproduciendo ${station.name}`))

                    .catch(e => console.error(e));

                  setPlayingStationId(station.id);

                }}

              >

                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                  <Play size={15} color={isPlaying ? '#00f3ff' : '#94a3b8'} />

                  {station.name}

                </span>

                {isPlaying && (

                  <span style={{

                    fontSize: '0.68rem',

                    color: '#34d399',

                    background: 'rgba(16, 185, 129, 0.2)',

                    border: '1px solid #10b981',

                    padding: '2px 6px',

                    borderRadius: '8px'

                  }}>

                    ON AIR

                  </span>

                )}

              </button>

            );

          })}

        </div>

        {/* BARRA INFERIOR DE CONTROL MAESTRO Y VOLUMEN */}

        <div style={{

          display: 'flex',

          gap: '14px',

          flexWrap: 'wrap',

          background: 'rgba(15, 23, 42, 0.75)',

          border: '1px solid rgba(255, 255, 255, 0.08)',

          borderRadius: '12px',

          padding: '16px'

        }}>

          <button

            className="cyber-button error"

            style={{

              flex: '1 1 200px',

              padding: '12px 18px',

              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.25))',

              border: '1px solid #ef4444',

              color: '#fca5a5',

              borderRadius: '10px',

              fontWeight: 'bold',

              fontSize: '0.84rem',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              gap: '8px'

            }}

            onClick={() => {

              fetch(`${API_BASE}/api/radio/stop`, { method: 'POST' })

                .then(() => window.showToast('Radio detenida', 'error'))

                .catch(e => console.error(e));

              setPlayingStationId(null);

            }}

          >

            <Square size={15} /> DETENER RADIO

          </button>

        </div>

      </div>

      {/* MATRIZ DE ALTAVOCES Y MULTI-ROOM AUDIO */}

      <SpeakerConfigPanel />

    </div>

  );

  const appContent = (

    <>

      {status?.state?.ai_warning && (

        <div style={{ padding: '0.5rem 1rem', background: 'var(--habana-danger, rgba(255,60,0,0.2))', border: '1px solid var(--habana-danger, #ff3c00)', color: 'var(--habana-danger, #ff3c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold', margin: '0.5rem', borderRadius: '4px', zIndex: 9999 }}>

          <ShieldCheck size={20} />

          {status.state.ai_warning}

        </div>

      )}

      <div key={activeTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: activeTab === 'config' ? 'auto' : '100%', minHeight: '100%' }}>

        {activeTab === 'principal' && (

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>

            <div style={{ flex: 1, height: '100%', minHeight: 0, position: 'relative' }}>

              {principalView === 'avatar' ? (

            <AvatarPanel

              onOpenDigitalTwin={() => setPrincipalView('digital_twin')}

              onOpenRadio={() => setPrincipalView('radio')}

              onOpenCameras={() => handleTabChange('cameras')}

              onOpenVisual={() => handleTabChange('visual')}

              onNavigateToAvatar={() => {

                handleTabChange('principal');

                setPrincipalView('avatar');

              }}

              isTabletMode={isTabletMode}

              activeTab={activeTab}

              principalView={principalView}

              isScreensaverActive={isScreensaverActive}

              isBatterySaving={!isCharging}

            />

          ) : principalView === 'digital_twin' ? (

            <div style={{ display: 'flex', flexDirection: 'column', gap: isTabletMode ? '0px' : '14px', width: '100%', height: '100%', minHeight: 0, padding: isTabletMode ? '0px' : '16px 20px', boxSizing: 'border-box' }}>

              {!isTabletMode && (

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>

                  {renderBackButton(() => setPrincipalView('avatar'))}

                </div>

              )}

              <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>

                <DigitalTwin3D

                  cleanMode={true}

                  devices={devices}

                  onToggleDevice={toggleDevice}

                  onControlDevice={toggleDevice}

                  onOpenAutomations={() => setPrincipalView('automations')}

                  onBackToPrincipal={null}

                />

              </div>

            </div>

          ) : principalView === 'radio' ? (

            <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>

              {renderRadioPanel(isTabletMode ? null : () => setPrincipalView('avatar'))}

            </div>

          ) : principalView === 'automations' ? (

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', padding: isTabletMode ? '6px 8px' : '16px 20px', boxSizing: 'border-box' }}>

              {!isTabletMode && (

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>

                  {renderBackButton(() => setPrincipalView('avatar'))}

                </div>

              )}

              <AutomationsAndSensorsPanel API_BASE={API_BASE} />

            </div>

          ) : null}

            </div>

          </div>

        )}

        {(activeTab === 'visual' || activeTab === 'neural') && (

          <div style={{ width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box', padding: '4px 8px' }}>

            <VisualStatusPanel

              API_BASE={API_BASE}

              devices={devices}

              onToggleDevice={toggleDevice}

              onOpenAutomationsConfig={() => {

                handleTabChange('config');

                setConfigView('automations_sensors');

              }}

              onOpenDigitalTwin={() => {

                handleTabChange('digital_twin');

              }}

            />

          </div>

        )}

        {activeTab === 'cameras' && (

          <div style={{ width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box', padding: '4px' }}>

            <LiveCamerasPanel API_BASE={API_BASE} />

          </div>

        )}

        {activeTab === 'bunker' && (

          <div style={{ width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box', padding: isTabletMode ? '6px 8px' : '16px 20px' }}>

            <BunkerContainer API_BASE={API_BASE} />

          </div>

        )}

        {activeTab === 'auditoria' && (

          <div style={{ width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>

            <ApexDiagnosticPanel API_BASE={API_BASE} />

          </div>

        )}

        {activeTab === 'config' && (

          <div key="config" style={{ width: '100%', minHeight: '100%', paddingBottom: '36px' }}>

            {/* WRAPPER SUPERIOR FIJO / STICKY CON MODO Y BOTONERA */}

            <div

              className="habana-config-sticky-nav"

              style={{

                position: 'sticky',

                top: 0,

                zIndex: 90,

                background: 'rgba(3, 7, 18, 0.94)',

                backdropFilter: 'blur(20px)',

                WebkitBackdropFilter: 'blur(20px)',

                paddingTop: '6px',

                paddingBottom: '8px',

                marginBottom: '14px',

                borderBottom: systemRole === 'installer' 

                  ? '1px solid rgba(245, 158, 11, 0.4)' 

                  : '1px solid rgba(0, 243, 255, 0.25)',

                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',

                transition: 'border-color 0.25s ease'

              }}

            >

              {/* SELECTOR DE MODO HOGAR / MODO INSTALADOR */}

            <div style={{

              display: 'flex',

              justifyContent: 'space-between',

              alignItems: 'center',

              flexWrap: 'wrap',

              gap: '12px',

              marginBottom: '14px',

              padding: '10px 14px',

              background: systemRole === 'installer' 

                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))' 

                : 'linear-gradient(135deg, rgba(6, 12, 28, 0.95), rgba(15, 23, 42, 0.9))',

              borderRadius: '14px',

              border: systemRole === 'installer' ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(0, 243, 255, 0.25)',

              boxShadow: systemRole === 'installer' ? '0 0 25px rgba(245, 158, 11, 0.12)' : '0 0 25px rgba(0, 243, 255, 0.08)'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

                <div style={{

                  display: 'inline-flex',

                  background: 'rgba(2, 6, 23, 0.8)',

                  padding: '4px',

                  borderRadius: '10px',

                  border: '1px solid rgba(255, 255, 255, 0.1)'

                }}>

                  <button

                    type="button"

                    onClick={() => {

                      setSystemRole('user');

                      if (INSTALLER_TABS.some(t => t.id === configView)) {

                        setConfigView('radio');

                      }

                    }}

                    style={{

                      padding: '8px 16px',

                      borderRadius: '8px',

                      border: 'none',

                      background: systemRole === 'user' ? 'linear-gradient(135deg, #00f3ff, #0284c7)' : 'transparent',

                      color: systemRole === 'user' ? '#020617' : '#94a3b8',

                      fontWeight: 800,

                      fontSize: '0.82rem',

                      cursor: 'pointer',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '6px',

                      transition: 'all 0.2s ease'

                    }}

                  >

                    <span>🏠</span> MODO HOGAR / USUARIO ({USER_TABS.length})

                  </button>

                  <button

                    type="button"

                    onClick={handleSwitchToInstaller}

                    style={{

                      padding: '8px 16px',

                      borderRadius: '8px',

                      border: 'none',

                      background: systemRole === 'installer' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',

                      color: systemRole === 'installer' ? '#020617' : '#94a3b8',

                      fontWeight: 800,

                      fontSize: '0.82rem',

                      cursor: 'pointer',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '6px',

                      transition: 'all 0.2s ease'

                    }}

                  >

                    <span>🔧</span> MODO INSTALADOR / TÉCNICO ({INSTALLER_TABS.length})

                  </button>

                </div>

                <span style={{

                  fontSize: '0.78rem',

                  color: systemRole === 'installer' ? '#fbbf24' : '#38bdf8',

                  fontWeight: 600

                }}>

                  {systemRole === 'installer'

                    ? '⚡ Herramientas avanzadas de instalación y topología'

                    : '✨ Interfaz limpia para el confort del día a día'}

                </span>

              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <button

                  type="button"

                  onClick={() => setSecurityModal({ open: true, mode: 'settings' })}

                  style={{

                    padding: '8px 14px',

                    borderRadius: '10px',

                    background: 'rgba(255, 255, 255, 0.06)',

                    border: '1px solid rgba(255, 255, 255, 0.15)',

                    color: installerSecurity.pin_enabled && installerSecurity.has_pin ? '#34d399' : '#cbd5e1',

                    fontSize: '0.78rem',

                    fontWeight: 600,

                    cursor: 'pointer',

                    display: 'flex',

                    alignItems: 'center',

                    gap: '6px'

                  }}

                  title="Configurar o cambiar PIN de instalador"

                >

                  <span>{installerSecurity.pin_enabled && installerSecurity.has_pin ? '🔒' : '🔓'}</span>

                  <span>PIN Instalador: {installerSecurity.pin_enabled && installerSecurity.has_pin ? 'ACTIVO' : 'SIN PIN (LIBRE)'}</span>

                  <span style={{ opacity: 0.6, fontSize: '11px' }}>⚙️ Cambiar</span>

                </button>

              </div>

            </div>

            {/* BOTONERA DINÁMICA FILTRADA SEGÚN MODO ACTIVO */}

            <div style={{

              background: 'rgba(5, 10, 25, 0.92)',

              padding: '12px',

              borderRadius: '14px',

              border: '1px solid rgba(0, 243, 255, 0.22)',

              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',

              marginBottom: '0px',

              display: 'grid',

              gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',

              gap: '8px',

              fontFamily: 'Inter, system-ui, sans-serif'

            }}>

              {(systemRole === 'installer' ? INSTALLER_TABS : USER_TABS).map(tab => {

                const isActive = configView === tab.id;

                
  return (

                  <button

                    key={tab.id}

                    className={`cyber-button ${tab.isError ? 'error' : ''} ${isActive ? 'active' : ''}`}

                    onClick={() => {

                      setConfigView(tab.id);

                      if (tab.id === 'auditoria') {

                        fetch(`${API_BASE}/api/health/full?_=${Date.now()}`).then(r => r.json()).then(setHealthData).catch(() => {});

                        fetch(`${API_BASE}/api/logs?_=${Date.now()}`).then(r => r.json()).then(d => d.logs && setLogs(d.logs)).catch(() => {});

                      }

                    }}

                    style={{

                      padding: '10px 12px',

                      fontSize: '0.78rem',

                      fontWeight: 'bold',

                      letterSpacing: '0.4px',

                      borderRadius: '10px',

                      cursor: 'pointer',

                      transition: 'all 0.22s ease',

                      background: isActive

                        ? tab.bg

                        : tab.isDirect

                        ? 'rgba(16, 185, 129, 0.08)'

                        : 'rgba(15, 23, 42, 0.72)',

                      border: `1px solid ${

                        isActive

                          ? tab.color

                          : tab.isDirect

                          ? 'rgba(16, 185, 129, 0.45)'

                          : 'rgba(255, 255, 255, 0.09)'

                      }`,

                      color: isActive ? '#ffffff' : tab.isDirect ? '#34d399' : '#cbd5e1',

                      boxShadow: isActive ? `0 0 16px ${tab.color}55, inset 0 0 10px ${tab.color}22` : 'none',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      gap: '6px',

                      textAlign: 'center'

                    }}

                  >

                    <span style={{

                      width: '6px',

                      height: '6px',

                      borderRadius: '50%',

                      background: isActive ? tab.color : 'rgba(148, 163, 184, 0.35)',

                      boxShadow: isActive ? `0 0 8px ${tab.color}` : 'none',

                      flexShrink: 0

                    }} />

                    <span>{tab.label}</span>

                  </button>

                );

              })}

            </div>

            </div>

            {configView === 'setup_wizard' && (

              <SetupWizard onConfigChanged={refreshDevices} />

            )}

            {configView === 'z2m_hub' && (

              <ErrorBoundary>

                <Z2MLightingHub

                onNavigateTab={setConfigView}

                onDevicesUpdated={async () => {

                  try {

                    const devRes = await fetch(`${API_BASE}/api/devices?real_only=${domoticaRealOnly}&_=${Date.now()}`);

                    if (devRes.ok) {

                      const devData = await devRes.json();

                      if (Array.isArray(devData)) {

                        setDevices(devData.filter(d => d.domain !== 'sensor'));

                        setSensors(devData.filter(d => d.domain === 'sensor'));

                      } else if (devData.devices) {

                        setDevices(devData.devices);

                        setSensors(devData.sensors || []);

                      }

                    }

                  } catch (e) {}

                }}

              />

    </ErrorBoundary>

            )}

            {configView === 'floor_plan_editor' && (

              <div style={{ height: 'calc(100vh - 190px)', minHeight: '620px', width: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0, 243, 255, 0.3)' }}>

                <DigitalTwin3D

                  cleanMode={false}

                  devices={devices}

                  onToggleDevice={toggleDevice}

                  onControlDevice={toggleDevice}

                />

              </div>

            )}

            {configView === 'rooms_studio' && <RoomPhotoStudioPanel devices={devices} />}

            {configView === 'bunker' && <BunkerContainer API_BASE={API_BASE} />}

            {configView === 'cctv_cameras' && <LiveCamerasPanel API_BASE={API_BASE} />}

            {configView === 'automations_sensors' && <AutomationsAndSensorsPanel API_BASE={API_BASE} />}

            {configView === 'obsidian' && <ObsidianVaultPanel API_BASE={API_BASE} />}

            {configView === 'avatar' && <AvatarConfigPanel />}

            {configView === 'network' && <NetworkConfigPanel onOpenDirectPanel={() => setConfigView('z2m_hub')} />}

            {configView === 'security' && <SecurityConfigView isBgCameraEnabled={isBgCameraEnabled} setIsBgCameraEnabled={setIsBgCameraEnabled} />}

            {/* ==================== PANEL: CONFIGURACIÓN DEL SISTEMA (MAIN) ==================== */}

            {configView === 'main' && (

              <div style={{

                background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',

                border: '1px solid rgba(0, 243, 255, 0.28)',

                borderRadius: '14px',

                padding: '24px',

                color: '#f8fafc',

                boxShadow: '0 8px 32px rgba(0,0,0,0.65)',

                fontFamily: 'Inter, system-ui, sans-serif'

              }}>

                {/* CABECERA STUDIO */}

                <div style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'flex-start',

                  flexWrap: 'wrap',

                  gap: '16px',

                  borderBottom: '1px solid rgba(0, 243, 255, 0.18)',

                  paddingBottom: '18px',

                  marginBottom: '22px'

                }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

                    <div style={{

                      width: '48px',

                      height: '48px',

                      borderRadius: '12px',

                      background: 'rgba(0, 243, 255, 0.12)',

                      border: '1px solid rgba(0, 243, 255, 0.4)',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'

                    }}>

                      <Settings size={25} color="#00f3ff" />

                    </div>

                    <div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>

                        <span style={{

                          background: 'rgba(0, 243, 255, 0.14)',

                          border: '1px solid #00f3ff',

                          color: '#00f3ff',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold',

                          letterSpacing: '0.8px'

                        }}>

                          HABANA 13 CORE // NEURAL ENGINE

                        </span>

                        <span style={{

                          background: activePersona === 'friday' ? 'rgba(0, 243, 255, 0.16)' : 'rgba(239, 68, 68, 0.18)',

                          border: `1px solid ${activePersona === 'friday' ? '#00f3ff' : '#ef4444'}`,

                          color: activePersona === 'friday' ? '#00f3ff' : '#f87171',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold'

                        }}>

                          {activePersona === 'friday' ? '⚡ PERSONA: HABANA' : '👻 PERSONA: GHOST'}

                        </span>

                        <span style={{

                          background: 'rgba(168, 85, 247, 0.16)',

                          border: '1px solid #a855f7',

                          color: '#d8b4fe',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold'

                        }}>

                          🧠 MOTOR: {voiceEngine.toUpperCase()}

                        </span>

                      </div>

                      <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>

                        Configuración del Sistema

                      </h2>

                      <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>

                        Personalidad activa, motor cognitivo IA, voz en directo Full-Duplex, enrutamiento acústico y arquitectura domótica.

                      </p>

                    </div>

                  </div>

                </div>

                {/* GRID DE TARJETAS DE CONFIGURACIÓN */}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '16px' }}>

                  

                  {/* TARJETA 1: PERSONALIDAD ACTIVA & GÉNERO DE VOZ */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(255, 255, 255, 0.08)',

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)'

                  }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>

                      <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Personalidad Activa</h3>

                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>

                        PERFIL COGNITIVO

                      </span>

                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ active_persona: 'friday' })

                            });

                            setActivePersona('friday');

                            window.showToast('Personalidad: HABANA (Friday)');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: activePersona === 'friday' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${activePersona === 'friday' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: activePersona === 'friday' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: activePersona === 'friday' ? '0 0 15px rgba(0, 243, 255, 0.25)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        ⚡ HABANA

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ active_persona: 'ghost' })

                            });

                            setActivePersona('ghost');

                            window.showToast('Personalidad: GHOST', 'error');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: activePersona === 'ghost' ? 'rgba(255, 0, 60, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${activePersona === 'ghost' ? '#ff003c' : 'rgba(255,255,255,0.12)'}`,

                          color: activePersona === 'ghost' ? '#ff4d6d' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: activePersona === 'ghost' ? '0 0 15px rgba(255, 0, 60, 0.28)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        👻 GHOST

                      </button>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', marginBottom: '10px' }}>

                      <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Género de Voz</h3>

                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>SÍNTESIS TTS</span>

                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ voice_gender: 'female' })

                            });

                            setVoiceGender('female');

                            window.showToast('Voz: Femenina');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '10px',

                          background: voiceGender === 'female' ? 'rgba(0, 243, 255, 0.18)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${voiceGender === 'female' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: voiceGender === 'female' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.82rem',

                          transition: 'all 0.2s'

                        }}

                      >

                        Femenina

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ voice_gender: 'male' })

                            });

                            setVoiceGender('male');

                            window.showToast('Voz: Masculina');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '10px',

                          background: voiceGender === 'male' ? 'rgba(0, 243, 255, 0.18)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${voiceGender === 'male' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: voiceGender === 'male' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.82rem',

                          transition: 'all 0.2s'

                        }}

                      >

                        Masculina

                      </button>

                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px', marginBottom: 0 }}>

                      *También puedes conmutar la personalidad diciendo "Friday..." o "Ghost..." por WhatsApp.

                    </p>

                  </div>

                  {/* TARJETA 2: MOTOR DE TEXTO IA */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(255, 255, 255, 0.08)',

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Motor de Texto (Chat)</h3>

                        <span style={{ fontSize: '0.68rem', color: '#d8b4fe', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.35)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>

                          LLM INFERENCE

                        </span>

                      </div>

                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Inferencia ultrarrápida con Groq (~250ms), Gemini Cloud o privada local con Ollama.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ voice_engine: 'groq' })

                            });

                            setVoiceEngine('groq');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '12px 6px',

                          background: voiceEngine === 'groq' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${voiceEngine === 'groq' ? '#10b981' : 'rgba(255,255,255,0.12)'}`,

                          color: voiceEngine === 'groq' ? '#34d399' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.82rem',

                          boxShadow: voiceEngine === 'groq' ? '0 0 15px rgba(16, 185, 129, 0.35)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        ⚡ GROQ (~250ms)

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ voice_engine: 'gemini' })

                            });

                            setVoiceEngine('gemini');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '12px 6px',

                          background: voiceEngine === 'gemini' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${voiceEngine === 'gemini' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: voiceEngine === 'gemini' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.82rem',

                          boxShadow: voiceEngine === 'gemini' ? '0 0 15px rgba(0, 243, 255, 0.25)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        ✨ GEMINI

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ voice_engine: 'ollama' })

                            });

                            setVoiceEngine('ollama');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '12px 6px',

                          background: voiceEngine === 'ollama' ? 'rgba(168, 85, 247, 0.22)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${voiceEngine === 'ollama' ? '#a855f7' : 'rgba(255,255,255,0.12)'}`,

                          color: voiceEngine === 'ollama' ? '#d8b4fe' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.82rem',

                          boxShadow: voiceEngine === 'ollama' ? '0 0 15px rgba(168, 85, 247, 0.28)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        🦙 OLLAMA

                      </button>

                    </div>

                  </div>

                  {/* TARJETA 3: LLAMADA LIVE FULL-DUPLEX */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: `1px solid ${liveStatus === 'active' ? '#ff003c' : liveStatus === 'ready' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',

                    transition: 'border-color 0.3s',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between'

                  }}>

                    <div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>

                        <h3 style={{ color: '#00f3ff', fontSize: '0.96rem', margin: 0, letterSpacing: '0.4px' }}>Llamada Live (Voz)</h3>

                        <span style={{

                          fontSize: '0.68rem',

                          fontWeight: 'bold',

                          padding: '3px 9px',

                          borderRadius: '20px',

                          background: liveStatus === 'active' ? 'rgba(255, 0, 60, 0.2)' : liveStatus === 'ready' ? 'rgba(16, 185, 129, 0.2)' : liveStatus === 'connecting' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.12)',

                          color: liveStatus === 'active' ? '#ff4d6d' : liveStatus === 'ready' ? '#34d399' : liveStatus === 'connecting' ? '#fbbf24' : '#94a3b8',

                          border: `1px solid ${liveStatus === 'active' ? '#ff003c' : liveStatus === 'ready' ? '#10b981' : liveStatus === 'connecting' ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`

                        }}>

                          {liveStatus === 'active' ? '● ESCUCHANDO' : liveStatus === 'ready' ? '● CANAL ABIERTO' : liveStatus === 'connecting' ? '◌ CONECTANDO...' : '○ DESCONECTADO'}

                        </span>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Canal de conversación bidireccional Full-Duplex con Gemini Live API y respuesta acústica inmediata.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>

                      {liveStatus === 'off' && (

                        <button

                          type="button"

                          onClick={connectGeminiLive}

                          style={{

                            flex: 1,

                            padding: '11px',

                            background: 'rgba(16, 185, 129, 0.18)',

                            border: '1px solid #10b981',

                            color: '#34d399',

                            cursor: 'pointer',

                            borderRadius: '10px',

                            fontSize: '0.84rem',

                            fontWeight: 'bold',

                            boxShadow: '0 0 14px rgba(16, 185, 129, 0.22)'

                          }}

                        >

                          ⚡ ABRIR CANAL

                        </button>

                      )}

                      {(liveStatus === 'ready' || liveStatus === 'active') && (

                        <>

                          <button

                            type="button"

                            onClick={isListening ? stopLiveListening : startLiveListening}

                            style={{

                              flex: 2,

                              padding: '11px',

                              background: isListening ? 'rgba(255, 0, 60, 0.22)' : 'rgba(0, 243, 255, 0.18)',

                              border: `1px solid ${isListening ? '#ff003c' : '#00f3ff'}`,

                              color: isListening ? '#ff4d6d' : '#00f3ff',

                              cursor: 'pointer',

                              borderRadius: '10px',

                              fontSize: '0.84rem',

                              fontWeight: 'bold',

                              animation: isListening ? 'pulse 1.5s infinite' : 'none'

                            }}

                          >

                            {isListening ? '🛑 PARAR MIC' : '🎙️ HABLAR'}

                          </button>

                          <button

                            type="button"

                            onClick={disconnectGeminiLive}

                            style={{

                              flex: 1,

                              padding: '11px',

                              background: 'rgba(2, 6, 23, 0.75)',

                              border: '1px solid rgba(255,255,255,0.16)',

                              color: '#94a3b8',

                              cursor: 'pointer',

                              borderRadius: '10px',

                              fontSize: '0.78rem',

                              fontWeight: 'bold'

                            }}

                          >

                            CERRAR

                          </button>

                        </>

                      )}

                      {liveStatus === 'connecting' && (

                        <button

                          disabled

                          style={{

                            flex: 1,

                            padding: '11px',

                            background: 'rgba(245, 158, 11, 0.18)',

                            border: '1px solid #f59e0b',

                            color: '#fbbf24',

                            borderRadius: '10px',

                            fontSize: '0.84rem',

                            fontWeight: 'bold'

                          }}

                        >

                          ◌ Conectando...

                        </button>

                      )}

                    </div>

                  </div>

                  {/* TARJETA 4: RUTA DE AUDIO */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(255, 255, 255, 0.08)',

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Ruta de Audio</h3>

                        <span style={{ fontSize: '0.68rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>

                          AUDIO ROUTER

                        </span>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Define si la síntesis vocal del asistente se emite por la estación local o los altavoces Google Home.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ audio_output: 'local' })

                            });

                            setAudioOutput('local');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: audioOutput === 'local' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${audioOutput === 'local' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: audioOutput === 'local' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: audioOutput === 'local' ? '0 0 14px rgba(0, 243, 255, 0.22)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        💻 PC (Local)

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ audio_output: 'google_cast' })

                            });

                            setAudioOutput('google_cast');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: audioOutput === 'google_cast' ? 'rgba(255, 0, 60, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${audioOutput === 'google_cast' ? '#ff003c' : 'rgba(255,255,255,0.12)'}`,

                          color: audioOutput === 'google_cast' ? '#ff4d6d' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: audioOutput === 'google_cast' ? '0 0 14px rgba(255, 0, 60, 0.25)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        🔊 GOOGLE HOME

                      </button>

                    </div>

                  </div>

                  {/* TARJETA 5: ENTORNO DEL SISTEMA */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(255, 255, 255, 0.08)',

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Entorno del Sistema</h3>

                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>

                          HOST TARGET

                        </span>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Conmuta el perfil de ejecución entre clúster Proxmox VE o estación de trabajo local con GPU.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ server_mode: 'proxmox' })

                            });

                            setServerMode('proxmox');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: serverMode === 'proxmox' ? 'rgba(255, 0, 60, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${serverMode === 'proxmox' ? '#ff003c' : 'rgba(255,255,255,0.12)'}`,

                          color: serverMode === 'proxmox' ? '#ff4d6d' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: serverMode === 'proxmox' ? '0 0 14px rgba(255, 0, 60, 0.25)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        🖥️ PROXMOX

                      </button>

                      <button

                        onClick={async () => {

                          try {

                            await fetch(`${API_BASE}/api/state/update`, {

                              method: 'POST',

                              headers: {'Content-Type': 'application/json'},

                              body: JSON.stringify({ server_mode: 'local' })

                            });

                            setServerMode('local');

                          } catch (e) { console.error(e); }

                        }}

                        style={{

                          flex: 1,

                          padding: '11px',

                          background: serverMode === 'local' ? 'rgba(0, 243, 255, 0.2)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${serverMode === 'local' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: serverMode === 'local' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontWeight: 'bold',

                          fontSize: '0.84rem',

                          boxShadow: serverMode === 'local' ? '0 0 14px rgba(0, 243, 255, 0.22)' : 'none',

                          transition: 'all 0.2s'

                        }}

                      >

                        ⚡ PC (Local)

                      </button>

                    </div>

                  </div>

                  {/* TARJETA 6: MOTOR DE CONTROL DOMÓTICO */}

                  <div style={{

                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(6, 32, 28, 0.75))',

                    border: '1px solid rgba(16, 185, 129, 0.45)',

                    padding: '18px',

                    borderRadius: '12px',

                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.12)',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#34d399', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px' }}>Motor de Control Domótico</h3>

                        <button

                          onClick={() => setConfigView('z2m_hub')}

                          style={{

                            background: 'rgba(16, 185, 129, 0.15)',

                            border: '1px solid rgba(16, 185, 129, 0.5)',

                            color: '#34d399',

                            fontSize: '0.72rem',

                            fontWeight: 'bold',

                            padding: '4px 10px',

                            borderRadius: '8px',

                            cursor: 'pointer'

                          }}

                        >

                          Configurar IPs ↗

                        </button>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Conmuta en caliente entre disparo directo por LAN (&lt;5 ms sin Home Assistant), modo Híbrido o Puente Home Assistant.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                      <button

                        onClick={() => handleDomoticsModeSwitch('direct')}

                        style={{

                          flex: 1,

                          padding: '10px 8px',

                          background: domoticsMode === 'direct' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${domoticsMode === 'direct' ? '#10b981' : 'rgba(255,255,255,0.12)'}`,

                          color: domoticsMode === 'direct' ? '#34d399' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontSize: '0.76rem',

                          fontWeight: 'bold',

                          boxShadow: domoticsMode === 'direct' ? '0 0 14px rgba(16, 185, 129, 0.25)' : 'none'

                        }}

                      >

                        ⚡ DIRECTO (Sin HA)

                      </button>

                      <button

                        onClick={() => handleDomoticsModeSwitch('hybrid')}

                        style={{

                          flex: 1,

                          padding: '10px 8px',

                          background: domoticsMode === 'hybrid' ? 'rgba(0, 243, 255, 0.22)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${domoticsMode === 'hybrid' ? '#00f3ff' : 'rgba(255,255,255,0.12)'}`,

                          color: domoticsMode === 'hybrid' ? '#00f3ff' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontSize: '0.76rem',

                          fontWeight: 'bold',

                          boxShadow: domoticsMode === 'hybrid' ? '0 0 14px rgba(0, 243, 255, 0.25)' : 'none'

                        }}

                      >

                        🔀 HÍBRIDO

                      </button>

                      <button

                        onClick={() => handleDomoticsModeSwitch('home_assistant')}

                        style={{

                          flex: 1,

                          padding: '10px 8px',

                          background: domoticsMode === 'home_assistant' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(2, 6, 23, 0.7)',

                          border: `1px solid ${domoticsMode === 'home_assistant' ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,

                          color: domoticsMode === 'home_assistant' ? '#fbbf24' : '#94a3b8',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontSize: '0.76rem',

                          fontWeight: 'bold',

                          boxShadow: domoticsMode === 'home_assistant' ? '0 0 14px rgba(245, 158, 11, 0.25)' : 'none'

                        }}

                      >

                        🏠 HOME ASSISTANT

                      </button>

                    </div>

                  </div>

                  {/* TARJETA 8: HUB DE INTERRUPTORES Y LUCES ZIGBEE2MQTT */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(0, 243, 255, 0.35)',

                    borderRadius: '12px',

                    padding: '18px',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between',

                    boxShadow: '0 4px 18px rgba(0, 243, 255, 0.12)'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>

                          <Zap size={16} color="#00f3ff" /> Hub de Interruptores, Luces y Sensores

                        </h3>

                        <span style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '6px' }}>

                          ZIGBEE2MQTT PURO

                        </span>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Asignación física de canales Zigbee, placas reales y bombillas, conmutaciones visuales 1-Click y secuenciador Dimmer & Tiras LED.

                      </p>

                    </div>

                    <button

                      onClick={() => setConfigView('z2m_hub')}

                      style={{

                        padding: '10px',

                        background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(14, 165, 233, 0.35))',

                        border: '1px solid #00f3ff',

                        color: '#ffffff',

                        cursor: 'pointer',

                        borderRadius: '10px',

                        fontSize: '0.8rem',

                        fontWeight: 'bold',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        gap: '8px',

                        boxShadow: '0 0 14px rgba(0, 243, 255, 0.25)'

                      }}

                    >

                      <Zap size={15} /> ABRIR INTERRUPTORES, LUCES Y SENSORES ➔

                    </button>

                  </div>

                  {/* TARJETA 9: SEGUNDO CEREBRO & MEMORIA OBSIDIAN */}

                  <div style={{

                    background: 'rgba(15, 23, 42, 0.7)',

                    border: '1px solid rgba(168, 85, 247, 0.35)',

                    borderRadius: '12px',

                    padding: '18px',

                    display: 'flex',

                    flexDirection: 'column',

                    justifyContent: 'space-between',

                    boxShadow: '0 4px 18px rgba(168, 85, 247, 0.15)'

                  }}>

                    <div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                        <h3 style={{ color: '#c084fc', margin: 0, fontSize: '0.96rem', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>

                          <BookOpen size={16} color="#c084fc" /> Segundo Cerebro (Obsidian)

                        </h3>

                        <span style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.2)', padding: '2px 6px', borderRadius: '6px' }}>

                          55 NOTAS LOCALES

                        </span>

                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 14px 0' }}>

                        Bóveda Markdown en F:\Habana 12\vault con diarios, inventario de luces, lienzo espacial Canvas 2D y memorias de Lola.

                      </p>

                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>

                      <button

                        onClick={async () => {

                          try {

                            const res = await fetch(`${API_BASE}/api/obsidian/open`, { method: 'POST' });

                            if (res.ok) {

                              if (window.showToast) window.showToast('🟣 Abriendo bóveda en Obsidian...', 'success');

                            }

                          } catch (e) {

                            console.error(e);

                          }

                        }}

                        style={{

                          flex: 1,

                          padding: '10px',

                          background: 'linear-gradient(135deg, #9333ea, #7e22ce)',

                          border: '1px solid #c084fc',

                          color: '#ffffff',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontSize: '0.8rem',

                          fontWeight: 'bold',

                          display: 'flex',

                          alignItems: 'center',

                          justifyContent: 'center',

                          gap: '7px',

                          boxShadow: '0 0 14px rgba(168, 85, 247, 0.35)'

                        }}

                      >

                        <BookOpen size={15} /> 🟣 ABRIR OBSIDIAN

                      </button>

                      <button

                        onClick={() => setConfigView('obsidian')}

                        style={{

                          padding: '10px 14px',

                          background: 'rgba(2, 6, 23, 0.8)',

                          border: '1px solid rgba(168, 85, 247, 0.3)',

                          color: '#d8b4fe',

                          cursor: 'pointer',

                          borderRadius: '10px',

                          fontSize: '0.8rem',

                          fontWeight: 'bold'

                        }}

                      >

                        PANEL ➔

                      </button>

                    </div>

                  </div>

                </div>

              </div>

            )}

            {/* ==================== PANEL: SISTEMA DE RADIO & MATRIZ DE AUDIO ==================== */}

            {configView === 'radio' && renderRadioPanel()}

            {/* ==================== PANEL: GESTIÓN DE AGENDA ==================== */}

            {configView === 'agenda' && (

              <>

                <div style={{

                  background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',

                  border: '1px solid rgba(0, 243, 255, 0.28)',

                  borderRadius: '14px',

                  padding: '24px',

                  color: '#f8fafc',

                  boxShadow: '0 8px 32px rgba(0,0,0,0.65)',

                  fontFamily: 'Inter, system-ui, sans-serif'

                }}>

                  {/* CABECERA STUDIO */}

                  <div style={{

                    display: 'flex',

                    justifyContent: 'space-between',

                    alignItems: 'flex-start',

                    flexWrap: 'wrap',

                    gap: '16px',

                    borderBottom: '1px solid rgba(0, 243, 255, 0.18)',

                    paddingBottom: '18px',

                    marginBottom: '22px'

                  }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

                      <div style={{

                        width: '48px',

                        height: '48px',

                        borderRadius: '12px',

                        background: 'rgba(0, 243, 255, 0.12)',

                        border: '1px solid rgba(0, 243, 255, 0.4)',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'

                      }}>

                        <Calendar size={25} color="#00f3ff" />

                      </div>

                      <div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

                          <span style={{

                            background: 'rgba(0, 243, 255, 0.14)',

                            border: '1px solid #00f3ff',

                            color: '#00f3ff',

                            padding: '2px 8px',

                            borderRadius: '20px',

                            fontSize: '0.66rem',

                            fontWeight: 'bold',

                            letterSpacing: '0.8px'

                          }}>

                            HABANA 13 CHRONOS SCHEDULER

                          </span>

                          <span style={{

                            background: 'rgba(16, 185, 129, 0.16)',

                            border: '1px solid #10b981',

                            color: '#34d399',

                            padding: '2px 8px',

                            borderRadius: '20px',

                            fontSize: '0.66rem',

                            fontWeight: 'bold'

                          }}>

                            📅 {agendaItems.length} EVENTO{agendaItems.length !== 1 ? 'S' : ''} ACTIVO{agendaItems.length !== 1 ? 'S' : ''}

                          </span>

                          <span style={{

                            background: 'rgba(168, 85, 247, 0.18)',

                            border: '1px solid #a855f7',

                            color: '#c084fc',

                            padding: '2px 8px',

                            borderRadius: '20px',

                            fontSize: '0.66rem',

                            fontWeight: 'bold',

                            display: 'inline-flex',

                            alignItems: 'center',

                            gap: '4px'

                          }}>

                            🟣 OBSIDIAN VAULT (vault/Agenda)

                          </span>

                        </div>

                        <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>

                          GESTIÓN DE AGENDA & RECORDATORIOS NEURALES

                        </h2>

                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>

                          Programa avisos médicos, eventos personales y rutinas con notificación proactiva por voz y WhatsApp.

                        </p>

                      </div>

                    </div>

                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

                    {/* TARJETA IZQUIERDA: NUEVO EVENTO */}

                    <div style={{

                      background: 'rgba(15, 23, 42, 0.65)',

                      border: '1px solid rgba(255, 255, 255, 0.08)',

                      borderRadius: '12px',

                      padding: '20px'

                    }}>

                      <h3 style={{ color: '#00f3ff', margin: '0 0 16px 0', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}>

                        <Calendar size={18} /> NUEVO EVENTO

                      </h3>

                      <form

                        onSubmit={async (e) => {

                          e.preventDefault();

                          try {

                            const res = await fetch(`${API_BASE}/api/agenda`, {

                              method: 'POST',

                              headers: { 'Content-Type': 'application/json' },

                              body: JSON.stringify({ titulo: agendaTitle, descripcion: agendaDesc, fecha_inicio: agendaDate, tipo: agendaType, attachment_url: agendaMedia })

                            });

                            if (res.ok) {

                              window.showToast("Evento añadido a la agenda");

                              const agendaRes = await fetch(`${API_BASE}/api/agenda`);

                              if (agendaRes.ok) setAgendaItems((await agendaRes.json()) || []);

                              setAgendaTitle(""); setAgendaDesc(""); setAgendaDate(""); setAgendaMedia("");

                            }

                          } catch (err) { window.showToast("Error al guardar", "error"); }

                        }}

                        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}

                      >

                        <input

                          type="text"

                          value={agendaTitle}

                          onChange={e => setAgendaTitle(e.target.value)}

                          required

                          placeholder="Ej. Tomar medicación..."

                          className="cyber-input"

                          style={{

                            width: '100%',

                            padding: '10px 12px',

                            background: '#090f1f',

                            border: '1px solid rgba(0, 243, 255, 0.22)',

                            color: 'white',

                            borderRadius: '8px',

                            fontSize: '0.85rem'

                          }}

                        />

                        <textarea

                          value={agendaDesc}

                          onChange={e => setAgendaDesc(e.target.value)}

                          placeholder="Detalles o notas..."

                          className="cyber-input"

                          style={{

                            width: '100%',

                            padding: '10px 12px',

                            background: '#090f1f',

                            border: '1px solid rgba(0, 243, 255, 0.22)',

                            color: 'white',

                            borderRadius: '8px',

                            minHeight: '85px',

                            resize: 'vertical',

                            fontSize: '0.85rem'

                          }}

                        />

                        <input

                          type="datetime-local"

                          value={agendaDate}

                          onChange={e => setAgendaDate(e.target.value)}

                          required

                          className="cyber-input"

                          style={{

                            width: '100%',

                            padding: '10px 12px',

                            background: '#090f1f',

                            border: '1px solid rgba(0, 243, 255, 0.22)',

                            color: 'white',

                            borderRadius: '8px',

                            fontSize: '0.85rem'

                          }}

                        />

                        <select

                          value={agendaType}

                          onChange={e => setAgendaType(e.target.value)}

                          className="cyber-input"

                          style={{

                            width: '100%',

                            padding: '10px 12px',

                            background: '#090f1f',

                            border: '1px solid rgba(0, 243, 255, 0.22)',

                            color: 'white',

                            borderRadius: '8px',

                            fontSize: '0.85rem'

                          }}

                        >

                          <option value="Recordatorio">Recordatorio</option>

                          <option value="Evento">Evento</option>

                          <option value="Médico">Médico</option>

                          <option value="Sistema">Sistema</option>

                        </select>

                        <button

                          type="submit"

                          className="cyber-button primary"

                          style={{

                            width: '100%',

                            padding: '11px',

                            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(59, 130, 246, 0.22))',

                            border: '1px solid #00f3ff',

                            color: '#00f3ff',

                            borderRadius: '10px',

                            cursor: 'pointer',

                            fontWeight: 'bold',

                            fontSize: '0.85rem',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            gap: '6px',

                            boxShadow: '0 4px 16px rgba(0, 243, 255, 0.18)'

                          }}

                        >

                          <Plus size={16} /> AÑADIR A LA AGENDA

                        </button>

                      </form>

                    </div>

                    {/* TARJETA DERECHA: PRÓXIMOS EVENTOS */}

                    <div style={{

                      background: 'rgba(15, 23, 42, 0.65)',

                      border: '1px solid rgba(255, 255, 255, 0.08)',

                      borderRadius: '12px',

                      padding: '20px',

                      display: 'flex',

                      flexDirection: 'column'

                    }}>

                      <h3 style={{ color: '#00f3ff', margin: '0 0 16px 0', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}>

                        <Calendar size={18} /> PRÓXIMOS EVENTOS

                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>

                        {agendaItems.length === 0 ? (

                          <div style={{

                            color: '#64748b',

                            background: 'rgba(2, 6, 23, 0.5)',

                            border: '1px dashed rgba(255,255,255,0.1)',

                            borderRadius: '10px',

                            padding: '28px 16px',

                            textAlign: 'center',

                            fontSize: '0.85rem'

                          }}>

                            No hay eventos en la agenda.

                          </div>

                        ) : (

                          agendaItems.map(item => (

                            <div

                              key={item.id}

                              style={{

                                padding: '14px',

                                background: 'rgba(2, 6, 23, 0.65)',

                                borderRadius: '10px',

                                border: '1px solid rgba(0, 243, 255, 0.22)',

                                borderLeft: '4px solid #00f3ff',

                                position: 'relative'

                              }}

                            >

                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '28px', gap: '8px', flexWrap: 'wrap' }}>

                                <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{item.titulo}</strong>

                                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace' }}>

                                  {new Date(item.fecha_inicio).toLocaleString()}

                                </span>

                              </div>

                              {item.descripcion && (

                                <div style={{ fontSize: '0.83rem', margin: '6px 0 8px 0', color: '#cbd5e1' }}>{item.descripcion}</div>

                              )}

                              <span style={{

                                background: 'rgba(0, 243, 255, 0.14)',

                                color: '#00f3ff',

                                padding: '2px 8px',

                                borderRadius: '12px',

                                fontSize: '0.68rem',

                                fontWeight: 'bold',

                                border: '1px solid rgba(0, 243, 255, 0.35)'

                              }}>

                                {item.tipo}

                              </span>

                              <button

                                style={{

                                  position: 'absolute',

                                  top: '10px',

                                  right: '10px',

                                  background: 'rgba(239, 68, 68, 0.12)',

                                  border: '1px solid rgba(239, 68, 68, 0.35)',

                                  borderRadius: '6px',

                                  padding: '5px',

                                  color: '#f87171',

                                  cursor: 'pointer'

                                }}

                                onClick={async () => {

                                  await fetch(`${API_BASE}/api/agenda/${item.id}`, { method: 'DELETE' });

                                  setAgendaItems(prev => prev.filter(x => x.id !== item.id));

                                  window.showToast("Evento eliminado", "success");

                                }}

                              >

                                <Trash2 size={14} />

                              </button>

                            </div>

                          ))

                        )}

                      </div>

                    </div>

                  </div>

                </div>

              </>

            )}

            {/* ==================== PANEL: AJUSTES VISUALES / MOTOR DE TEMAS ==================== */}

            {configView === 'visuals' && (

              <div style={{

                background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',

                border: '1px solid rgba(0, 243, 255, 0.28)',

                borderRadius: '14px',

                padding: '24px',

                color: '#f8fafc',

                boxShadow: '0 8px 32px rgba(0,0,0,0.65)',

                fontFamily: 'Inter, system-ui, sans-serif'

              }}>

                {/* CABECERA STUDIO */}

                <div style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'flex-start',

                  flexWrap: 'wrap',

                  gap: '16px',

                  borderBottom: '1px solid rgba(0, 243, 255, 0.18)',

                  paddingBottom: '18px',

                  marginBottom: '22px'

                }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

                    <div style={{

                      width: '48px',

                      height: '48px',

                      borderRadius: '12px',

                      background: 'rgba(236, 72, 153, 0.14)',

                      border: '1px solid rgba(236, 72, 153, 0.45)',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      boxShadow: '0 0 18px rgba(236, 72, 153, 0.22)'

                    }}>

                      <Tv size={24} color="#f472b6" />

                    </div>

                    <div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

                        <span style={{

                          background: 'rgba(236, 72, 153, 0.16)',

                          border: '1px solid #ec4899',

                          color: '#f9a8d4',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold',

                          letterSpacing: '0.8px'

                        }}>

                          HABANA 13 CHAMELEON UI ENGINE

                        </span>

                        <span style={{

                          background: 'rgba(0, 243, 255, 0.16)',

                          border: '1px solid #00f3ff',

                          color: '#00f3ff',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold'

                        }}>

                          🎨 TEMA ACTIVO: {theme.toUpperCase()}

                        </span>

                      </div>

                      <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>

                        Ajustes Visuales

                      </h2>

                      <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>

                        Selecciona el motor estético de la interfaz neural con previsualización cromática instantánea.

                      </p>

                    </div>

                  </div>

                </div>

                {/* TARJETAS DE SELECCIÓN DE TEMA */}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' }}>

                  {[

                    { id: 'megaluxury', title: '✨ HABANA Mega-Luxury', desc: 'Mansión de Megalujo: Mármol Alabastro, Perla y Azul Zafiro Real (Distribución Cyberpunk)', accent: '#2563eb', swatches: ['#f4f6fb', '#2563eb', '#0f172a'] },

                    { id: 'apex-visual', title: 'APEX VISUAL', desc: 'Militar-cyberpunk, biseles 45°, fibra de carbono y naranja Apex', accent: '#ff4612', swatches: ['#0b0d12', '#ff4612', '#00f3ff'] },

                    { id: 'cyberpunk', title: 'HABANA Cyberpunk', desc: 'Estética hacker oscura (Cian, neón)', accent: '#00f3ff', swatches: ['#050811', '#00f3ff', '#ff003c'] },

                    { id: 'lcars', title: 'Star Trek (LCARS)', desc: 'Consola Federación (Naranja, Píldoras)', accent: '#ff9900', swatches: ['#000000', '#ff9900', '#cc99cc'] },

                    { id: 'light', title: 'Light Mode', desc: 'Colores claros (Clean, Minimalist)', accent: '#3b82f6', swatches: ['#f8fafc', '#3b82f6', '#1e293b'] },

                    { id: 'dark', title: 'Dark Mode', desc: 'Colores oscuros (Modern Dark)', accent: '#6366f1', swatches: ['#0f172a', '#6366f1', '#38bdf8'] },

                    { id: 'bento', title: 'Bento Box (Freeform)', desc: 'Glassmorphism & Bento UI', accent: '#e2e8f0', swatches: ['#1e293b', '#f8fafc', '#94a3b8'] },

                    { id: 'neobrutalism', title: 'Neobrutalism', desc: 'Retro Web & Hard Shadows', accent: '#ff5252', swatches: ['#fdf5e6', '#ff5252', '#2d3436'] },

                    { id: 'glassmorphism', title: 'Spatial UI', desc: 'Glassmorphism & Floating Elements', accent: '#38bdf8', swatches: ['#0f172a', '#38bdf8', '#a855f7'] },

                    { id: 'premium-cyber', title: 'Premium Cyber', desc: 'Futurista, fluido y elegante', accent: '#00f3ff', swatches: ['#060c1c', '#00f3ff', '#10b981'] },

                    { id: 'cyber-bento', title: 'Cyber Bento', desc: 'Neon Dark Grid', accent: '#00ffff', swatches: ['#0a0f1e', '#00ffff', '#8b5cf6'] },

                    { id: 'organic-bento', title: 'Organic Bento', desc: 'Nature & Soft Curves', accent: '#56ab2f', swatches: ['#f0fdf4', '#56ab2f', '#1b3d2b'] }

                  ].map(t => {

                    const isSelected = theme === t.id;

                    
  return (

                      <button

                        key={t.id}

                        onClick={() => handleThemeChange(t.id)}

                        className="cyber-btn"

                        style={{

                          padding: '18px',

                          background: isSelected

                            ? 'linear-gradient(145deg, rgba(0, 243, 255, 0.16), rgba(15, 23, 42, 0.9))'

                            : 'rgba(15, 23, 42, 0.65)',

                          border: `1px solid ${isSelected ? t.accent : 'rgba(255, 255, 255, 0.08)'}`,

                          borderRadius: '12px',

                          textAlign: 'left',

                          cursor: 'pointer',

                          boxShadow: isSelected ? `0 0 20px ${t.accent}33` : 'none',

                          transition: 'all 0.22s ease',

                          display: 'flex',

                          flexDirection: 'column',

                          justifyContent: 'space-between',

                          gap: '12px'

                        }}

                      >

                        <div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>

                            <h3 style={{ margin: 0, fontSize: '0.96rem', color: isSelected ? '#fff' : '#e2e8f0' }}>{t.title}</h3>

                            {isSelected && (

                              <span style={{

                                background: `${t.accent}22`,

                                border: `1px solid ${t.accent}`,

                                color: t.accent,

                                fontSize: '0.62rem',

                                fontWeight: 'bold',

                                padding: '2px 6px',

                                borderRadius: '8px'

                              }}>

                                ACTIVO

                              </span>

                            )}

                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{t.desc}</div>

                        </div>

                        {/* Previsualización de paleta */}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                          {t.swatches.map((sw, idx) => (

                            <span

                              key={idx}

                              style={{

                                width: '18px',

                                height: '18px',

                                borderRadius: '50%',

                                background: sw,

                                border: '1px solid rgba(255,255,255,0.25)',

                                display: 'inline-block'

                              }}

                            />

                          ))}

                        </div>

                      </button>

                    );

                  })}

                </div>

              </div>

            )}

            {/* ==================== PANEL: AUDITORÍA, WATCHDOG Y LOGS ==================== */}

            {configView === 'auditoria' && (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <ApexDiagnosticPanel API_BASE={API_BASE} />

                <div style={{

                background: 'linear-gradient(145deg, rgba(6, 12, 28, 0.97), rgba(2, 6, 18, 0.98))',

                border: '1px solid rgba(0, 243, 255, 0.28)',

                borderRadius: '14px',

                padding: '24px',

                color: '#f8fafc',

                boxShadow: '0 8px 32px rgba(0,0,0,0.65)',

                fontFamily: 'Inter, system-ui, sans-serif'

              }}>

                {/* CABECERA STUDIO */}

                <div style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'flex-start',

                  flexWrap: 'wrap',

                  gap: '16px',

                  borderBottom: '1px solid rgba(0, 243, 255, 0.18)',

                  paddingBottom: '18px',

                  marginBottom: '22px'

                }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

                    <div style={{

                      width: '48px',

                      height: '48px',

                      borderRadius: '12px',

                      background: 'rgba(0, 243, 255, 0.12)',

                      border: '1px solid rgba(0, 243, 255, 0.4)',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'

                    }}>

                      <TerminalSquare size={25} color="#00f3ff" />

                    </div>

                    <div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

                        <span style={{

                          background: 'rgba(0, 243, 255, 0.14)',

                          border: '1px solid #00f3ff',

                          color: '#00f3ff',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold',

                          letterSpacing: '0.8px'

                        }}>

                          HABANA 14 TELEMETRY & WATCHDOG

                        </span>

                        <span style={{

                          background: 'rgba(16, 185, 129, 0.18)',

                          border: '1px solid #10b981',

                          color: '#34d399',

                          padding: '2px 8px',

                          borderRadius: '20px',

                          fontSize: '0.66rem',

                          fontWeight: 'bold'

                        }}>

                          🛡️ MONITORIZACIÓN EN TIEMPO REAL

                        </span>

                      </div>

                      <h2 style={{ margin: 0, fontSize: '1.38rem', color: '#fff', letterSpacing: '0.5px' }}>

                        Supervisor del Sistema (Watchdog)

                      </h2>

                      <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>

                        Estado en vivo de subsistemas críticos, analítica de interacciones y consola de telemetría.

                      </p>

                    </div>

                  </div>

                </div>

                {/* SUBSISTEMAS CRÍTICOS CON LED PULSANTE */}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>

                  {['whatsapp', 'home_assistant', 'zigbee2mqtt', 'google_cast'].map(sys => {

                    const status = healthData.health[sys] || 'unknown';

                    const color = status === 'ok' || status === 'connected' ? '#10b981' : (status === 'warning' ? '#f59e0b' : (status === 'error' ? '#ef4444' : '#64748b'));

                    const name = sys === 'whatsapp' ? 'WhatsApp' : sys === 'home_assistant' ? 'Home Assistant' : sys === 'zigbee2mqtt' ? 'Zigbee2MQTT (Dongle Sonoff)' : 'Google Cast';

                    
  return (

                      <div

                        key={sys}

                        style={{

                          background: 'rgba(15, 23, 42, 0.65)',

                          border: `1px solid ${color}66`,

                          padding: '16px',

                          borderRadius: '12px',

                          display: 'flex',

                          alignItems: 'center',

                          justifyContent: 'space-between',

                          boxShadow: `0 4px 18px ${color}14`

                        }}

                      >

                        <div>

                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>

                            {name}

                          </div>

                          <span style={{ color: '#f8fafc', fontSize: '0.95rem', fontWeight: 'bold' }}>

                            {status.toUpperCase()}

                          </span>

                        </div>

                        <div style={{

                          width: '12px',

                          height: '12px',

                          borderRadius: '50%',

                          background: color,

                          boxShadow: `0 0 12px ${color}`

                        }} />

                      </div>

                    );

                  })}

                </div>

                {/* TARJETAS KPI ANALÍTICAS */}

                {stats && (

                  <div style={{ marginBottom: '20px' }}>

                    <h3 style={{ color: '#00f3ff', marginTop: 0, marginBottom: '12px', fontSize: '0.96rem', letterSpacing: '0.4px' }}>

                      Dashboard Analítico

                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>

                      <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 243, 255, 0.22)' }}>

                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Mensajes Hoy</div>

                        <div style={{ fontSize: '1.6rem', color: '#00f3ff', fontWeight: 'bold', marginTop: '4px' }}>{stats.messages_today}</div>

                      </div>

                      <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>

                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Respuestas IA</div>

                        <div style={{ fontSize: '1.6rem', color: '#d8b4fe', fontWeight: 'bold', marginTop: '4px' }}>{stats.ai_responses}</div>

                      </div>

                      <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>

                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensajes Usuario</div>

                        <div style={{ fontSize: '1.6rem', color: '#34d399', fontWeight: 'bold', marginTop: '4px' }}>{stats.user_messages}</div>

                      </div>

                    </div>

                  </div>

                )}

                {/* PANEL DE ALERTAS */}

                {healthData.alerts && healthData.alerts.length > 0 && (

                  <div style={{

                    marginBottom: '20px',

                    background: 'rgba(239, 68, 68, 0.1)',

                    border: '1px solid rgba(239, 68, 68, 0.45)',

                    borderRadius: '12px',

                    padding: '16px'

                  }}>

                    <h3 style={{ color: '#f87171', marginTop: 0, marginBottom: '10px', fontSize: '0.95rem' }}>

                      ⚠️ Últimas Alertas del Supervisor

                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

                      {healthData.alerts.slice(0, 5).map(alert => (

                        <div key={alert.id} style={{ fontSize: '0.8rem', color: '#fecaca', fontFamily: 'monospace' }}>

                          <strong>[{alert.timestamp}] {alert.component}:</strong> {alert.message}

                        </div>

                      ))}

                    </div>

                  </div>

                )}

                {/* CONSOLA TERMINAL DE LOGS */}

                <div style={{

                  background: '#050811',

                  border: '1px solid rgba(0, 243, 255, 0.22)',

                  borderRadius: '12px',

                  padding: '16px'

                }}>

                  <div style={{

                    display: 'flex',

                    justifyContent: 'space-between',

                    alignItems: 'center',

                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',

                    paddingBottom: '10px',

                    marginBottom: '12px'

                  }}>

                    <h3 style={{ color: '#00f3ff', margin: 0, fontSize: '0.95rem' }}>Registro de Actividad (Terminal)</h3>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>

                      {logs.length} eventos en buffer

                    </span>

                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', maxHeight: '360px', overflowY: 'auto' }}>

                    {logs.map((log, i) => {

                      const date = new Date(log.timestamp * 1000).toLocaleTimeString();

                      const color = log.level === 'ERROR' ? '#ff4444' : log.level === 'WARN' ? '#fcee0a' : '#7dd3fc';

                      
  return (

                        <div key={i} style={{ marginBottom: '6px', borderBottom: '1px dashed rgba(255,255,255,0.06)', paddingBottom: '4px' }}>

                          <span style={{ color: '#64748b' }}>[{date}]</span>{' '}

                          <span style={{ color: '#c084fc', fontWeight: 'bold' }}>[{log.module}]</span>{' '}

                          <span style={{ color }}>{log.message}</span>

                        </div>

                      );

                    })}

                    {logs.length === 0 && <div style={{ color: '#64748b' }}>Esperando telemetría...</div>}

                  </div>

                </div>

              </div>

              </div>

            )}

          </div>

        )}

        {(activeTab === 'digital_twin' || activeTab === 'zigbee') && (

          <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: '520px', position: 'relative', boxSizing: 'border-box' }}>

            <DigitalTwin3D

              cleanMode={true}

              devices={devices}

              onToggleDevice={toggleDevice}

              onControlDevice={toggleDevice}

              onOpenAutomations={() => {

                handleTabChange('config');

                setConfigView('automations_sensors');

              }}

              onBackToPrincipal={() => handleTabChange('principal')}

            />

          </div>

        )}

        {showMigration && (

          <div className="panel" style={{ marginTop: '1rem', marginBottom: '1rem' }}>

            <h2>Migración y Red</h2>

            <p>Módulo de escaneo Google Cast y Wipe de Zigbee.</p>

          </div>

        )}

        {activeTab === 'whatsapp' && (

          <div className="panel" style={{ height: '80%', overflowY: 'auto', background: '#0a0a0a', border: '1px solid #333' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>

              {/* Replaced header */}

              <h2 style={{ color: 'var(--primary, #00f3ff)', margin: 0 }}>Módulo WhatsApp</h2>

              <button 

                className="cyber-btn" 

                onClick={() => { setShowWAQR(!showWAQR); fetchWAStatus(); }}

                style={{ background: 'var(--primary, #00f3ff)22', border: '1px solid var(--primary, #00f3ff)', color: 'var(--primary, #00f3ff)', padding: '0.4rem 1rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px' }}

              >

                Vincular Dispositivo (QR)

              </button>

            </div>

            {showWAQR && (

              <div style={{

                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(6, 12, 28, 0.98))',

                padding: '1.5rem',

                borderRadius: '12px',

                border: '1px solid rgba(0, 243, 255, 0.35)',

                marginBottom: '1.2rem',

                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',

                textAlign: 'center'

              }}>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>

                  <span style={{

                    fontSize: '0.8rem',

                    padding: '4px 14px',

                    borderRadius: '20px',

                    fontWeight: 'bold',

                    background: waStatus.status === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',

                    color: waStatus.status === 'connected' ? '#34d399' : '#facc15',

                    border: `1px solid ${waStatus.status === 'connected' ? '#10b981' : '#eab308'}`

                  }}>

                    {waStatus.status === 'connected' ? '🟢 CONECTADO CON ÉXITO' : '🟡 ESPERANDO ESCANEO QR'}

                  </span>

                  {waStatus.user && (

                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>

                      Cuenta vinculada: {waStatus.user}

                    </span>

                  )}

                </div>

                {waStatus.status === 'connected' ? (

                  <div style={{ padding: '12px 0' }}>

                    <p style={{ color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '8px' }}>

                      ✅ Tu cuenta de WhatsApp ya está vinculada y sincronizada activamente con Lola.

                    </p>

                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>

                      Si deseas cambiar de cuenta, vincular otro teléfono o reiniciar la sesión:

                    </p>

                    <button

                      className="cyber-button"

                      onClick={handleGenerateNewWAQR}

                      disabled={isResettingWA}

                      style={{

                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.4))',

                        border: '1px solid #ef4444',

                        color: '#fff',

                        padding: '10px 22px',

                        borderRadius: '8px',

                        cursor: isResettingWA ? 'wait' : 'pointer',

                        fontWeight: 'bold',

                        fontSize: '0.85rem',

                        display: 'inline-flex',

                        alignItems: 'center',

                        gap: '8px'

                      }}

                    >

                      {isResettingWA ? '⏳ Reiniciando y generando...' : '🔄 Desvincular y Generar Nuevo Código QR'}

                    </button>

                  </div>

                ) : (

                  <div>

                    <h3 style={{ color: 'var(--primary, #00f3ff)', marginBottom: '0.5rem', marginTop: 0 }}>

                      Escanea el código con tu móvil

                    </h3>

                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>

                      Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo

                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>

                      {isResettingWA ? (

                        <div style={{ width: '270px', height: '270px', background: '#090f1f', borderRadius: '12px', border: '1px dashed #00f3ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>

                          <span style={{ fontSize: '2rem' }}>⏳</span>

                          <span style={{ color: '#00f3ff', fontSize: '0.85rem', fontWeight: 'bold' }}>Generando nuevo código QR...</span>

                        </div>

                      ) : (

                        <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,243,255,0.2)' }}>

                          <img

                            key={waQrKey}

                            src={`${API_BASE}/api/whatsapp/qr?t=${waQrKey}`}

                            alt="WhatsApp QR Code"

                            style={{ width: '240px', height: '240px', display: 'block' }}

                            onError={() => setWaQrError(true)}

                            onLoad={() => setWaQrError(false)}

                          />

                        </div>

                      )}

                    </div>

                    {waQrError && !isResettingWA && (

                      <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '10px' }}>

                        El código QR ha expirado o se está regenerando. Pulsa el botón abajo para obtener uno nuevo.

                      </p>

                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>

                      <button

                        className="cyber-button"

                        onClick={handleGenerateNewWAQR}

                        disabled={isResettingWA}

                        style={{

                          background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(6, 182, 212, 0.4))',

                          border: '1px solid #00f3ff',

                          color: '#fff',

                          padding: '10px 22px',

                          borderRadius: '8px',

                          cursor: isResettingWA ? 'wait' : 'pointer',

                          fontWeight: 'bold',

                          fontSize: '0.86rem',

                          display: 'inline-flex',

                          alignItems: 'center',

                          gap: '8px',

                          boxShadow: '0 0 14px rgba(0, 243, 255, 0.3)'

                        }}

                      >

                        {isResettingWA ? '⏳ Generando nuevo código...' : '🔄 Generar Nuevo Código QR'}

                      </button>

                      <a

                        href={`${API_BASE}/api/whatsapp/qr?t=${waQrKey}`}

                        target="_blank"

                        rel="noreferrer"

                        style={{

                          background: 'rgba(255, 255, 255, 0.08)',

                          border: '1px solid rgba(255, 255, 255, 0.2)',

                          color: '#cbd5e1',

                          padding: '10px 16px',

                          borderRadius: '8px',

                          fontSize: '0.82rem',

                          textDecoration: 'none',

                          display: 'inline-flex',

                          alignItems: 'center'

                        }}

                      >

                        ↗️ Pantalla completa

                      </a>

                    </div>

                  </div>

                )}

              </div>

            )}

              <ContactManager API_BASE={API_BASE} />

            

            <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>

              {/* Sección de Historial */}

              <div style={{ background: '#111', padding: '1rem', borderRadius: '4px', border: '1px solid #222' }}>

                <h3 style={{ color: 'var(--primary, #00f3ff)', marginBottom: '1rem', fontSize: '1rem' }}>Historial de Conversaciones</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>

                  {[...conversations].filter(msg => msg.source === 'whatsapp').reverse().map((msg, i) => {

                    const isUser = msg.sender !== 'AI';

                    const date = new Date(msg.timestamp * 1000).toLocaleString();
  return (

                      <div key={i} style={{ textAlign: isUser ? 'right' : 'left' }}>

                        <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '0.2rem' }}>

                          {msg.sender} ({msg.source}) - {date}

                        </div>

                        <span style={{ 

                          display: 'inline-block',

                          background: isUser ? 'var(--primary, #00f3ff)22' : '#333',

                          color: isUser ? 'var(--primary, #00f3ff)' : '#eee',

                          border: isUser ? '1px solid var(--primary, #00f3ff)55' : '1px solid #444',

                          padding: '0.6rem 1rem',

                          borderRadius: '8px',

                          maxWidth: '80%',

                          whiteSpace: 'pre-wrap',

                          textAlign: 'left'

                        }}>

                          {msg.message}

                          {msg.media_path && (

                            <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #555', paddingTop: '0.5rem', fontSize: '0.8rem', color: '#a855f7' }}>

                              📎 Archivo adjunto

                            </div>

                          )}

                        </span>

                      </div>

                    );

                  })}

                  {conversations.filter(msg => msg.source === 'whatsapp').length === 0 && <div style={{ color: '#555', textAlign: 'center' }}>No hay conversaciones registradas.</div>}

                </div>

              </div>

              {/* Sección de Galería */}

              <div style={{ background: '#111', padding: '1rem', borderRadius: '4px', border: '1px solid #222' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>

                  <h3 style={{ color: 'var(--primary, #00f3ff)', fontSize: '1rem', margin: 0 }}>Galería de Archivos (WhatsApp)</h3>

                  <label className="cyber-btn" style={{ padding: '0.4rem 1rem', background: '#10b98122', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem' }}>

                    SUBIR ARCHIVO MANUAL

                    <input type="file" style={{ display: 'none' }} onChange={async (e) => {

                      if(!e.target.files[0]) return;

                      const formData = new FormData();

                      formData.append("file", e.target.files[0]);

                      try {

                        await fetch(`${API_BASE}/api/upload`, {

                          method: 'POST',

                          body: formData

                        });

                      } catch (err) {

                        console.error("Upload error", err);

                      }

                    }} />

                  </label>

                </div>

                

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>

                  {mediaFiles.map((file, i) => {

                    const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                    const isAudio = file.name.match(/\.(mp3|wav|ogg|aac)$/i);
  return (

                      <div key={i} style={{ border: '1px solid #333', borderRadius: '4px', background: '#111', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', borderBottom: '1px solid #222' }}>

                          {isImage ? (

                            <img src={`${API_BASE}${file.url}`} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />

                          ) : isAudio ? (

                            <audio controls src={`${API_BASE}${file.url}`} style={{ width: '90%' }} />

                          ) : (

                            <div style={{ color: '#555', fontSize: '3rem' }}>📄</div>

                          )}

                        </div>

                        <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                          <a href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary, #00f3ff)', textDecoration: 'none' }}>

                            {file.name}

                          </a>

                        </div>

                      </div>

                    );

                  })}

                  {mediaFiles.length === 0 && <div style={{ color: '#555', gridColumn: '1 / -1' }}>No hay archivos subidos.</div>}

                </div>

              </div>

            </div>

          </div>

        )}

        </div>

        

        {securityEvent && (

          <SecurityModal 

            event={securityEvent} 

            onClose={() => setSecurityEvent(null)} 

          />

        )}

        {isScreensaverActive && (
          <TabletScreensaver
            onDismiss={() => setIsScreensaverActive(false)}
            onDisableScreensaver={() => handleSetScreensaverTimeout('never')}
            devices={devices}
            activeDevices={devices.filter(d => d.state === 'on')}
            isBatterySaving={false}
            batteryLevel={batteryLevel}
            playingStationId={playingStationId}
            setPlayingStationId={setPlayingStationId}
            radioStations={radioStations}
            onToggleDevice={toggleDevice}
          />
        )}

    </>

  );

  if (!isTabletMode && theme === 'lcars') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <LCARSLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </LCARSLayout>

      </div>

    );

  }

  if (!isTabletMode && theme === 'bento') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <BentoLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </BentoLayout>

      </div>

    );

  }

  if (!isTabletMode && theme === 'neobrutalism') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <NeobrutalismLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </NeobrutalismLayout>

      </div>

    );

  }

  if (!isTabletMode && theme === 'glassmorphism') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <GlassmorphismLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </GlassmorphismLayout>

      </div>

    );

  }

  if (theme === 'apex-visual' || theme === 'mobile' || theme === 'mobile-voice') {

    
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <ApexVisualLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </ApexVisualLayout>

      </div>

    );

  }

  if (urlParams && urlParams.get('voice_only') === 'true') {

    
  return (

       <div key="mobile" style={{width:'100%', height:'100%'}}>

         <MobileCyberLayout 

           chatHistory={chatHistory}

           isListening={isListening}

           toggleMic={() => { console.log('Mic no implementado'); }}

           devices={devices}

           avatarPersona={activePersona}

           audioOutput={audioOutput}

           onExitMobile={() => handleThemeChange('apex-visual')}

         />

       </div>

    );

  }

  if (!isTabletMode && theme === 'premium-cyber') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <PremiumCyberLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </PremiumCyberLayout>

      </div>

    );

  }

  if (!isTabletMode && theme === 'cyber-bento') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <CyberBentoLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </CyberBentoLayout>

      </div>

    );

  }

  if (!isTabletMode && theme === 'organic-bento') {
  return (

      <div key={theme} style={{width:'100%', height:'100%'}}>

        <OrganicBentoLayout activeTab={activeTab} setActiveTab={handleTabChange}>

          {appContent}

        </OrganicBentoLayout>

      </div>

    );

  }
  return (

    <div key={theme} className={`app-container ${isTabletMode ? "tablet-mode-active" : ""}`} translate="no">

      <header className={`header ${isTabletMode ? "tablet-header" : ""}`} style={isTabletMode ? {

        minHeight: '44px',

        maxHeight: '44px',

        height: '44px',

        padding: '0 12px',

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'space-between',

        background: 'rgba(5, 10, 25, 0.96)',

        borderBottom: '1px solid rgba(0, 243, 255, 0.25)',

        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',

        zIndex: 100,

        position: 'relative'

      } : {}}>

        {isTabletMode ? (

          <>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#00f3ff', letterSpacing: '1px' }}>HABANA</span>

              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status ? '#10b981' : '#ff4444', display: 'inline-block', boxShadow: status ? '0 0 8px #10b981' : 'none' }} />

            </div>

<div>{/* Navegación reubicada al menú lateral izquierdo */}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

              {(principalView !== 'avatar' || activeTab !== 'principal') && (

                <button

                  type="button"

                  onClick={() => {

                    handleTabChange('principal');

                    setPrincipalView('avatar');

                  }}

                  style={{

                    display: 'flex',

                    alignItems: 'center',

                    gap: '5px',

                    padding: '4px 10px',

                    borderRadius: '14px',

                    background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(16, 185, 129, 0.2))',

                    border: '1px solid #00f3ff',

                    color: '#00f3ff',

                    fontSize: '0.74rem',

                    fontWeight: 800,

                    cursor: 'pointer',

                    boxShadow: '0 0 12px rgba(0, 243, 255, 0.35)',

                    transition: 'all 0.2s',

                    whiteSpace: 'nowrap'

                  }}

                  title="Volver a la vista principal (Lola)"

                >

                  <ArrowLeft size={13} />

                  <span>Volver a Principal</span>

                </button>

              )}

              <button

                type="button"

                onClick={() => setIsScreensaverActive(true)}

                style={{

                  background: 'rgba(168, 85, 247, 0.16)',

                  border: '1px solid rgba(192, 132, 252, 0.45)',

                  color: '#e9d5ff',

                  fontSize: '0.72rem',

                  cursor: 'pointer',

                  padding: '3px 9px',

                  borderRadius: '10px',

                  fontWeight: 700

                }}

                title="Activar protector de pantalla (se activa solo tras 5 min de inactividad)"

              >

                🌙 Protector

              </button>

              <span style={{

                color: '#38bdf8',

                fontSize: '0.7rem',

                border: '1px solid #38bdf8',

                background: 'rgba(56, 189, 248, 0.16)',

                padding: '2px 6px',

                borderRadius: '10px',

                fontWeight: 700

              }}>

                📱 TABLET

              </span>

              <button

                type="button"

                onClick={() => {

                  try { localStorage.removeItem('habana_tablet_mode'); } catch(e) {}

                  setIsTabletMode(false);

                }}

                style={{

                  background: 'rgba(239, 68, 68, 0.15)',

                  border: '1px solid rgba(239, 68, 68, 0.35)',

                  color: '#f87171',

                  fontSize: '0.72rem',

                  cursor: 'pointer',

                  padding: '2px 8px',

                  borderRadius: '8px',

                  fontWeight: 600

                }}

                title="Salir del modo tablet y volver a pantalla completa"

              >

                ✕ Salir

              </button>

            </div>

          </>

        ) : (

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <h1 className="glitch" data-text="HABANA">HABANA</h1>

            {status ? (

              <span style={{ color: '#10b981', fontSize: '0.8rem', border: '1px solid #10b981', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>

                ONLINE

              </span>

            ) : (

              <span style={{ color: '#ff4444', fontSize: '0.8rem', border: '1px solid #ff4444', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>

                OFFLINE

              </span>

            )}

            <button

              type="button"

              onClick={() => {

                try { localStorage.setItem('habana_tablet_mode', 'true'); } catch(e) {}

                setIsTabletMode(true);

                setActiveTab('principal');

              }}

              style={{

                background: 'rgba(56, 189, 248, 0.12)',

                border: '1px solid rgba(56, 189, 248, 0.35)',

                color: '#38bdf8',

                fontSize: '0.72rem',

                padding: '0.2rem 0.6rem',

                borderRadius: '12px',

                cursor: 'pointer',

                fontWeight: 600

              }}

              title="Activar vista simplificada para Tablet"

            >

              📱 Modo Tablet

            </button>

          </div>

        )}

        

        {/* tabs removed */}<div style={{ display: 'none' }}>

          <button 

            className={`cyber-tab-btn ${activeTab === 'visual' ? 'active' : ''}`}

            onClick={() => handleTabChange('visual')}

          >

            <Eye size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> VISUAL

          </button>

          <button 

            className={`cyber-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}

            onClick={() => handleTabChange('whatsapp')}

          >

            <MessageSquare size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> WHATSAPP

          </button>

          <button 

            className={`cyber-tab-btn ${activeTab === 'zigbee' ? 'active' : ''}`}

            onClick={() => handleTabChange('zigbee')}

          >

            <Database size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> DOMÓTICA

          </button>

          <button 

            className={`cyber-tab-btn ${activeTab === 'config' ? 'active' : ''}`}

            onClick={() => handleTabChange('config')}

          >

            <Settings size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> CONFIG

          </button>

          <button 

            className={`cyber-tab-btn ${activeTab === 'auditoria' ? 'active' : ''}`}

            onClick={() => handleTabChange('auditoria')}

          >

            <TerminalSquare size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> AUDITORÍA

          </button>

          <button 
            className="cyber-tab-btn"
            onClick={() => setShowTvModal(true)}
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderColor: '#3b82f6' }}
          >
            <Tv size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> MANDO TV
          </button>

        </div>

      </header>

      {isTabletMode ? (

        <div style={{

          display: 'flex',

          flexDirection: 'row',

          width: '100%',

          height: 'calc(100vh - 44px)',

          overflow: 'hidden',

          position: 'relative'

        }}>

          <TabletSidebar

            activeTab={activeTab}

            principalView={principalView}

            screensaverTimeout={screensaverTimeout}

            onToggleScreensaverTimeout={() => handleSetScreensaverTimeout(screensaverTimeout === 'never' ? '300000' : 'never')}

            onNavigateToAvatar={() => {

              handleTabChange('principal');

              setPrincipalView('avatar');

            }}

            onOpenDigitalTwin={() => {

              handleTabChange('principal');

              setPrincipalView('digital_twin');

            }}

            onOpenCameras={() => handleTabChange('cameras')}

            onOpenRadio={() => {

              handleTabChange('principal');

              setPrincipalView('radio');

            }}

            onOpenVisual={() => handleTabChange('visual')}

          />

          <main className="main-content" style={{ flex: 1, height: '100%', minWidth: 0, overflowY: 'auto' }}>

            {appContent}

          </main>

        </div>

      ) : (

        <main className="main-content">

          {appContent}

        </main>

      )}

      

      {/* Reproductor de audio invisible */}

      <audio id="hiddenAudio" ref={audioRef} style={{ display: 'none' }} />

      <div className="bottom-nav" style={isTabletMode ? { display: 'none' } : {}}>

        {isTabletMode ? (

          <>

            <button

              className={`bottom-nav-btn ${activeTab === 'principal' ? 'active' : ''}`}

              onClick={() => handleTabChange('principal')}

              style={{ flex: 1, padding: '14px 0' }}

            >

              <Tv size={24} color={activeTab === 'principal' ? '#00f3ff' : '#94a3b8'} />

              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>🏠 PRINCIPAL</span>

            </button>

            <button

              className={`bottom-nav-btn ${activeTab === 'cameras' ? 'active' : ''}`}

              onClick={() => handleTabChange('cameras')}

              style={{ flex: 1, padding: '14px 0' }}

            >

              <Camera size={24} color={activeTab === 'cameras' ? '#34d399' : '#94a3b8'} />

              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>📹 CÁMARAS CCTV</span>

            </button>

          </>

        ) : (

          <>

            <button className={`bottom-nav-btn ${activeTab === 'cameras' ? 'active' : ''}`} onClick={() => handleTabChange('cameras')}><Camera size={20} /><span>CÁMARAS</span></button>

            <button className={`bottom-nav-btn ${activeTab === 'principal' ? 'active' : ''}`} onClick={() => handleTabChange('principal')}><Tv size={20} /><span>PRINCIPAL</span></button>

            <button className={`bottom-nav-btn ${(activeTab === 'visual' || activeTab === 'neural') ? 'active' : ''}`} onClick={() => handleTabChange('visual')}><Eye size={20} /><span>VISUAL</span></button>

            <button className={`bottom-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => handleTabChange('whatsapp')}><MessageSquare size={20} /><span>WHATSAPP</span></button>

            <button className={`bottom-nav-btn ${(activeTab === 'digital_twin' || activeTab === 'zigbee') ? 'active' : ''}`} onClick={() => handleTabChange('digital_twin')}><Box size={20} /><span>GEMELO 3D</span></button>

            <button className={`bottom-nav-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => handleTabChange('config')}><Settings size={20} /><span>SISTEMAS</span></button>

            <button className={`bottom-nav-btn ${activeTab === 'config' && configView === 'bunker' ? 'active' : ''}`} onClick={() => handleTabChange('bunker')}><ShieldCheck size={20} color="#00f3ff" /><span style={{ color: '#00f3ff' }}>BÚNKER</span></button>

            <button className="bottom-nav-btn" onClick={() => setShowTvModal(true)}><Tv size={20} color="#60a5fa" /><span style={{ color: '#60a5fa' }}>MANDO TV</span></button>

          </>

        )}

      </div>

      {showTvModal && (
        <SmartTVControlPanel onClose={() => setShowTvModal(false)} />
      )}

      {toast && <div className="cyber-toast-container"><div className={`cyber-toast ${toast.type}`}>{toast.msg}</div></div>}

      {isBgCameraEnabled && <BackgroundCamera />}

    

      {isCameraStream && (

        <iframe 

          src="/entrada" 

          style={{ width: '10px', height: '10px', border: 'none', position: 'absolute', left: '-9999px', top: '0', opacity: 0.01 }} 

          allow="camera; microphone"

          title="background-camera-stream"

        />

      )}

      <InstallerSecurityModal

        isOpen={securityModal.open}

        mode={securityModal.mode}

        onClose={() => {

          setSecurityModal({ open: false, mode: 'settings' });

          fetchInstallerSecurity();

        }}

        onVerified={() => {

          setSystemRole('installer');

          setConfigView('z2m_hub');

        }}

        API_BASE={API_BASE}

      />

    </div>

  );

}

export default App;


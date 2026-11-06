import React from 'react';
import { 
  Zap, Network, MessageSquare, Settings, TerminalSquare, 
  Tv, ShieldAlert, Crosshair, Shield, Activity, Radio, Cpu, Camera, Box
} from 'lucide-react';
import './apex-visual.css';

export default function ApexVisualLayout({ children, activeTab, setActiveTab }) {
  const navItems = [
    { id: 'principal', num: '01', label: 'Principal', icon: Tv },
    { id: 'cameras', num: '02', label: 'CCTV Ops', icon: Camera },
    { id: 'neural', num: '03', label: 'Neural Net', icon: Zap },
    { id: 'whatsapp', num: '04', label: 'Comms Link', icon: MessageSquare },
    { id: 'digital_twin', num: '05', label: 'Gemelo 3D', icon: Box },
    { id: 'config', num: '06', label: 'Ajustes', icon: Settings },
    { id: 'auditoria', num: '07', label: 'Audit Logs', icon: TerminalSquare },
    { id: 'bunker', num: '08', label: 'Búnker IA', icon: ShieldAlert, isBunker: true }
  ];

  return (
    <div className="apex-app-container">
      {/* Rejilla y textura táctica de fondo */}
      <div className="apex-grid-overlay"></div>

      {/* BARRA LATERAL TÁCTICA / DOCK INFERIOR EN MÓVIL */}
      <aside className="apex-sidebar">
        {/* Cabecera del Logo (Oculta en dock móvil) */}
        <div className="apex-logo-container">
          <div className="apex-chevron-badge">
            ▲
          </div>
          <div className="apex-brand-title">
            <h2>HABANA</h2>
            <span>APEX TACTICAL OS</span>
          </div>
        </div>

        {/* Hazard stripe superior */}
        <div className="apex-hazard-stripe"></div>

        {/* Navegación Biselada */}
        <nav className="apex-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`apex-nav-btn ${isActive ? 'active' : ''} ${item.isBunker ? 'bunker-btn' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
              >
                <span className="apex-nav-num">
                  {item.num}
                </span>
                <span className="apex-nav-icon">
                  <Icon size={18} />
                </span>
                <span className="apex-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pie de Barra Lateral */}
        <div className="apex-sidebar-footer">
          <div className="apex-status-pill">
            <span>SYS_INTEGRITY</span>
            <span style={{ color: 'var(--apex-cyan)', fontWeight: 700 }}>100% ONLINE</span>
          </div>
          <div className="apex-status-pill">
            <span>LOADOUT</span>
            <span style={{ color: 'var(--apex-orange)', fontWeight: 700 }}>COMBAT_READY</span>
          </div>
          <div className="apex-hazard-stripe" style={{ height: '4px', opacity: 0.7 }}></div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CON HUD */}
      <div className="apex-main-wrapper">
        {/* CABECERA TÁCTICA HUD */}
        <header className="apex-header">
          <div className="apex-header-left">
            <Crosshair size={20} color="var(--apex-orange)" />
            <div className="apex-hud-title">
              {activeTab ? activeTab.toUpperCase() : 'HABANA'}
              <span className="apex-hud-tag">ONLINE</span>
            </div>
          </div>

          <div className="apex-header-center">
            <div className="apex-metric-bracket">
              <Shield size={14} color="var(--apex-cyan)" />
              <span className="apex-metric-label">SHIELD:</span>
              <span>100% (LVL 3)</span>
            </div>
            <div className="apex-metric-bracket">
              <Activity size={14} color="var(--apex-orange)" />
              <span className="apex-metric-label">LATENCY:</span>
              <span>&lt;2 MS</span>
            </div>
            <div className="apex-metric-bracket">
              <Radio size={14} color="#10b981" />
              <span className="apex-metric-label">SECTOR:</span>
              <span>HABANA_MAIN</span>
            </div>
          </div>

          <div className="apex-header-right">
            <div className="apex-champion-badge">
              <span style={{ color: 'var(--apex-orange)', fontWeight: 900 }}>👑 CHAMPION</span>
              <span>TOMÁS</span>
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTENIDO */}
        <main className="apex-content-area">
          <div className="apex-tactical-frame">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

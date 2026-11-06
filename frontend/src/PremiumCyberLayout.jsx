import React from 'react';
import { Zap, Network, MessageSquare, Settings, TerminalSquare, Cpu, Tv, ShieldAlert } from 'lucide-react';
import './premium-cyber.css';

export default function PremiumCyberLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="pc-app-container">
      <div className="pc-grid-bg"></div>
      <div className="pc-sidebar">
        <div className="pc-logo">
          <Cpu className="pc-logo-icon" size={32} />
          <h2>CYBER<br/>HABANA</h2>
        </div>
        <nav className="pc-nav">
          <button className={`pc-nav-btn ${activeTab === 'principal' ? 'active' : ''}`} onClick={() => setActiveTab('principal')}>
            <Tv size={20} /> <span className="pc-nav-text">Principal</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'neural' ? 'active' : ''}`} onClick={() => setActiveTab('neural')}>
            <Zap size={20} /> <span className="pc-nav-text">Neural Net</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <MessageSquare size={20} /> <span className="pc-nav-text">Comms Link</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'zigbee' ? 'active' : ''}`} onClick={() => setActiveTab('zigbee')}>
            <Network size={20} /> <span className="pc-nav-text">IoT Mesh</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
            <Settings size={20} /> <span className="pc-nav-text">System Prefs</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>
            <TerminalSquare size={20} /> <span className="pc-nav-text">Audit Logs</span>
          </button>
          <button className={`pc-nav-btn ${activeTab === 'bunker' ? 'active' : ''}`} onClick={() => setActiveTab('bunker')}>
            <ShieldAlert size={20} color="#00f3ff" /> <span className="pc-nav-text" style={{ color: '#00f3ff', fontWeight: 'bold' }}>Búnker IA</span>
          </button>
        </nav>
        <div className="pc-sidebar-footer">
          <div className="pc-status-indicator online"></div> SYS.OP: NORMAL
        </div>
      </div>
      
      <div className="pc-main-wrapper">
        <header className="pc-header">
          <div className="pc-glitch-text" data-text={`${activeTab.toUpperCase()} PROTOCOL`}>
            {activeTab.toUpperCase()} PROTOCOL
          </div>
          <div className="pc-header-right">
            <div className="pc-data-stream">01001000 01000001</div>
            <div className="pc-user-profile">
              <div className="pc-avatar">T</div>
            </div>
          </div>
        </header>
        <div className="pc-content-area">
          <div className="pc-bento-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

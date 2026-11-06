import React from 'react';
import { Zap, Network, MessageSquare, Settings, TerminalSquare, Cpu, Tv } from 'lucide-react';
import './cyber-bento.css';

export default function CyberBentoLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="cb-app-container">
      <div className="cb-grid-bg"></div>
      <div className="cb-sidebar">
        <div className="cb-logo">
          <Cpu className="cb-logo-icon" size={32} />
          <h2>CYBER<br/>HABANA</h2>
        </div>
        <nav className="cb-nav">
          <button className={`cb-nav-btn ${activeTab === 'principal' ? 'active' : ''}`} onClick={() => setActiveTab('principal')}>
            <Tv size={20} /> <span className="cb-nav-text">Principal</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'neural' ? 'active' : ''}`} onClick={() => setActiveTab('neural')}>
            <Zap size={20} /> <span className="cb-nav-text">Neural Net</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <MessageSquare size={20} /> <span className="cb-nav-text">Comms Link</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'zigbee' ? 'active' : ''}`} onClick={() => setActiveTab('zigbee')}>
            <Network size={20} /> <span className="cb-nav-text">IoT Mesh</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
            <Settings size={20} /> <span className="cb-nav-text">System Prefs</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>
            <TerminalSquare size={20} /> <span className="cb-nav-text">Audit Logs</span>
          </button>
          <button className={`cb-nav-btn ${activeTab === 'bunker' ? 'active' : ''}`} onClick={() => setActiveTab('bunker')}>
            <ShieldAlert size={20} color="#00f3ff" /> <span className="cb-nav-text" style={{ color: '#00f3ff', fontWeight: 'bold' }}>Búnker IA</span>
          </button>
        </nav>
        <div className="cb-sidebar-footer">
          <div className="cb-status-indicator online"></div> SYS.OP: NORMAL
        </div>
      </div>
      
      <div className="cb-main-wrapper">
        <header className="cb-header">
          <div className="cb-glitch-text" data-text={`${activeTab.toUpperCase()} PROTOCOL`}>
            {activeTab.toUpperCase()} PROTOCOL
          </div>
          <div className="cb-header-right">
            <div className="cb-data-stream">01001000 01000001</div>
            <div className="cb-user-profile">
              <div className="cb-avatar">T</div>
            </div>
          </div>
        </header>
        <div className="cb-content-area">
          <div className="cb-bento-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

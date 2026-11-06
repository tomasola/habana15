import React from 'react';
import { Zap, Network, MessageSquare, Settings, TerminalSquare, Tv, ShieldAlert } from 'lucide-react';

export default function BentoLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="bento-app-container">
      <div className="bento-sidebar">
        <div className="bento-logo">
          <div className="bento-logo-icon">H</div>
          <h2>HABANA</h2>
        </div>
        <nav className="bento-nav">
          <button className={`bento-nav-btn ${activeTab === 'principal' ? 'active' : ''}`} onClick={() => setActiveTab('principal')}>
            <Tv size={20} /> <span className="bento-nav-text">Principal</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'neural' ? 'active' : ''}`} onClick={() => setActiveTab('neural')}>
            <Zap size={20} /> <span className="bento-nav-text">Neural</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <MessageSquare size={20} /> <span className="bento-nav-text">Comms</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'zigbee' ? 'active' : ''}`} onClick={() => setActiveTab('zigbee')}>
            <Network size={20} /> <span className="bento-nav-text">Smart Home</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
            <Settings size={20} /> <span className="bento-nav-text">Settings</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>
            <TerminalSquare size={20} /> <span className="bento-nav-text">Logs</span>
          </button>
          <button className={`bento-nav-btn ${activeTab === 'bunker' ? 'active' : ''}`} onClick={() => setActiveTab('bunker')}>
            <ShieldAlert size={20} color="#00f3ff" /> <span className="bento-nav-text" style={{ color: '#00f3ff', fontWeight: 'bold' }}>Búnker IA</span>
          </button>
        </nav>
        <div className="bento-sidebar-footer">
          <div className="bento-status-indicator online"></div> System Online
        </div>
      </div>
      
      <div className="bento-main-wrapper">
        <header className="bento-header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard</h1>
          <div className="bento-user-profile">
            <div className="bento-avatar">A</div>
          </div>
        </header>
        <div className="bento-content-area">
          {children}
        </div>
      </div>
    </div>
  );
}

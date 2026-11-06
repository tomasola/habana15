import React from 'react';
import { Zap, Network, MessageSquare, Settings, TerminalSquare, Leaf, Tv } from 'lucide-react';
import './organic-bento.css';

export default function OrganicBentoLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="ob-app-container">
      <div className="ob-blob ob-blob-1"></div>
      <div className="ob-blob ob-blob-2"></div>
      <div className="ob-blob ob-blob-3"></div>
      
      <div className="ob-sidebar">
        <div className="ob-logo">
          <div className="ob-logo-icon-wrapper">
            <Leaf className="ob-logo-icon" size={24} />
          </div>
          <h2>Habana<br/>Organic</h2>
        </div>
        <nav className="ob-nav">
          <button className={`ob-nav-btn ${activeTab === 'principal' ? 'active' : ''}`} onClick={() => setActiveTab('principal')}>
            <span className="ob-icon-wrapper"><Tv size={18} /></span> <span className="ob-nav-text">Welcome</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'neural' ? 'active' : ''}`} onClick={() => setActiveTab('neural')}>
            <span className="ob-icon-wrapper"><Zap size={18} /></span> <span className="ob-nav-text">Energy Flow</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <span className="ob-icon-wrapper"><MessageSquare size={18} /></span> <span className="ob-nav-text">Connections</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'zigbee' ? 'active' : ''}`} onClick={() => setActiveTab('zigbee')}>
            <span className="ob-icon-wrapper"><Network size={18} /></span> <span className="ob-nav-text">Ecosystem</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
            <span className="ob-icon-wrapper"><Settings size={18} /></span> <span className="ob-nav-text">Preferences</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>
            <span className="ob-icon-wrapper"><TerminalSquare size={18} /></span> <span className="ob-nav-text">Chronicle</span>
          </button>
          <button className={`ob-nav-btn ${activeTab === 'bunker' ? 'active' : ''}`} onClick={() => setActiveTab('bunker')}>
            <span className="ob-icon-wrapper"><ShieldAlert size={18} color="#00f3ff" /></span> <span className="ob-nav-text" style={{ color: '#00f3ff', fontWeight: 'bold' }}>Búnker IA</span>
          </button>
        </nav>
        <div className="ob-sidebar-footer">
          <div className="ob-status-indicator online"></div> Thriving
        </div>
      </div>
      
      <div className="ob-main-wrapper">
        <header className="ob-header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Sphere</h1>
          <div className="ob-header-right">
            <div className="ob-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="ob-user-profile">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Tomas`} alt="User" className="ob-avatar" />
            </div>
          </div>
        </header>
        <div className="ob-content-area">
          <div className="ob-bento-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import './glassmorphism.css';
import { Zap, Network, MessageSquare, Settings, Tv } from 'lucide-react';

const GlassmorphismLayout = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="glass-container theme-glassmorphism" translate="no">
      {/* Background blobs for spatial effect */}
      <div className="glass-blob blob-1"></div>
      <div className="glass-blob blob-2"></div>
      <div className="glass-blob blob-3"></div>

      <nav className="glass-nav">
        <h1 className="glass-title">HABANA</h1>
        <div className="glass-tabs">
          <button 
            className={`glass-tab-btn ${activeTab === 'principal' ? 'active' : ''}`}
            onClick={() => setActiveTab('principal')}
          >
            <Tv size={20} /> <span className="glass-tab-text">Principal</span>
          </button>
          <button 
            className={`glass-tab-btn ${activeTab === 'neural' ? 'active' : ''}`}
            onClick={() => setActiveTab('neural')}
          >
            <Zap size={20} /> <span className="glass-tab-text">Neural</span>
          </button>
          <button 
            className={`glass-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageSquare size={20} /> <span className="glass-tab-text">WhatsApp</span>
          </button>
          <button 
            className={`glass-tab-btn ${activeTab === 'zigbee' ? 'active' : ''}`}
            onClick={() => setActiveTab('zigbee')}
          >
            <Network size={20} /> <span className="glass-tab-text">Domótica</span>
          </button>
          <button 
            className={`glass-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={20} /> <span className="glass-tab-text">Ajustes</span>
          </button>
        </div>
      </nav>

      <main className="glass-main-content">
        <div className="glass-panel-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default GlassmorphismLayout;

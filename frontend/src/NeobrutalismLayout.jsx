import React from 'react';
import './neobrutalism.css';
import { Zap, Network, MessageSquare, Settings, Tv } from 'lucide-react';

const NeobrutalismLayout = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="neobrutalism-container theme-neobrutalism" translate="no">
      <header className="neo-header">
        <h1 className="neo-title">HABANA</h1>
      </header>
      
      <div className="neo-layout">
        <nav className="neo-sidebar">
          <button 
            className={`neo-nav-btn ${activeTab === 'principal' ? 'active' : ''}`}
            onClick={() => setActiveTab('principal')}
          >
            <Tv size={24} /> <span>PRINCIPAL</span>
          </button>
          <button 
            className={`neo-nav-btn ${activeTab === 'neural' ? 'active' : ''}`}
            onClick={() => setActiveTab('neural')}
          >
            <Zap size={24} /> <span>NEURAL</span>
          </button>
          <button 
            className={`neo-nav-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageSquare size={24} /> <span>WHATSAPP</span>
          </button>
          <button 
            className={`neo-nav-btn ${activeTab === 'zigbee' ? 'active' : ''}`}
            onClick={() => setActiveTab('zigbee')}
          >
            <Network size={24} /> <span>DOMÓTICA</span>
          </button>
          <button 
            className={`neo-nav-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={24} /> <span>SISTEMAS</span>
          </button>
        </nav>
        
        <main className="neo-main-content">
          <div className="neo-content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NeobrutalismLayout;

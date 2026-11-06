import React from 'react';

export default function LCARSLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="lcars-app-container">
      {/* Top Bar */}
      <div className="lcars-top-bar">
        <div className="lcars-top-left-curve lcars-color-orange">
           <div className="lcars-title">HABANA LCARS 01</div>
        </div>
        <div className="lcars-top-straight">
          <div className="lcars-bar-block lcars-color-peach" style={{ width: '150px' }}></div>
          <div className="lcars-bar-block lcars-color-orange" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '20px', alignItems: 'center' }}>
            <span style={{ color: '#000', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'Antonio, sans-serif' }}>FEDERATION DATABASE</span>
          </div>
          <div className="lcars-bar-block lcars-color-purple" style={{ width: '80px' }}></div>
        </div>
      </div>
      
      {/* Main Wrapper */}
      <div className="lcars-main-wrapper">
        
        {/* Left Navigation */}
        <div className="lcars-left-nav">
          <div className="lcars-nav-spacer lcars-color-orange"></div>
          
          <button className={`lcars-nav-btn ${activeTab === 'principal' ? 'lcars-active' : 'lcars-color-orange'}`} onClick={() => setActiveTab('principal')}>
            <span className="lcars-btn-text">MAIN</span>
            <span className="lcars-btn-num">00</span>
          </button>
          
          <button className={`lcars-nav-btn ${activeTab === 'neural' ? 'lcars-active' : 'lcars-color-peach'}`} onClick={() => setActiveTab('neural')}>
            <span className="lcars-btn-text">NEURAL</span>
            <span className="lcars-btn-num">47</span>
          </button>
          
          <button className={`lcars-nav-btn ${activeTab === 'whatsapp' ? 'lcars-active' : 'lcars-color-blue'}`} onClick={() => setActiveTab('whatsapp')}>
            <span className="lcars-btn-text">COMMS</span>
            <span className="lcars-btn-num">89</span>
          </button>
          
          <button className={`lcars-nav-btn ${activeTab === 'zigbee' ? 'lcars-active' : 'lcars-color-lavender'}`} onClick={() => setActiveTab('zigbee')}>
            <span className="lcars-btn-text">SENSORS</span>
            <span className="lcars-btn-num">22</span>
          </button>
          
          <button className={`lcars-nav-btn ${activeTab === 'config' ? 'lcars-active' : 'lcars-color-purple'}`} onClick={() => setActiveTab('config')}>
            <span className="lcars-btn-text">CONFIG</span>
            <span className="lcars-btn-num">01</span>
          </button>
          
          <button className={`lcars-nav-btn ${activeTab === 'auditoria' ? 'lcars-active' : 'lcars-color-peach'}`} onClick={() => setActiveTab('auditoria')}>
            <span className="lcars-btn-text">SYSTEMS</span>
            <span className="lcars-btn-num">99</span>
          </button>

          <div className="lcars-nav-spacer-bottom lcars-color-orange"></div>
        </div>

        {/* Injected Content */}
        <div className="lcars-content-area">
           {children}
        </div>
      </div>
    </div>
  );
}

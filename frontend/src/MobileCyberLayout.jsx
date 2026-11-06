import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, ChevronDown, Lightbulb, Send, LayoutDashboard } from 'lucide-react';
import './mobile-cyber.css';

export default function MobileCyberLayout({ 
  chatHistory, 
  isListening, 
  toggleMic, 
  avatarPersona,
  devices = [],
  audioOutput,
  onExitMobile
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const hapticFeedback = () => {
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    hapticFeedback();
    const userMsg = inputValue;
    setInputValue("");
    
    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: userMsg, source: 'mobile' })
      });
      const data = await res.json();
      if (data.audio_url && audioOutput === 'local') {
        const audioEl = document.getElementById('hiddenAudio');
        if (audioEl) {
          audioEl.src = data.audio_url;
          audioEl.play().catch(e => console.error("Mobile play failed:", e));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMicClick = () => {
    hapticFeedback();
    if (toggleMic) toggleMic();
  };

  const toggleDevice = async (entity_id, current_state) => {
    hapticFeedback();
    const action = current_state === 'on' ? 'turn_off' : 'turn_on';
    try {
      await fetch(`/api/devices/control`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ entity_id, action })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const lights = (devices || []).filter(d => d.id && (d.id.startsWith('light.') || d.id.startsWith('switch.')));

  return (
    <div className="mobile-app-container" style={{ background: '#0b0d12', position: 'relative', overflow: 'hidden' }}>
      {/* Fondo táctico militar-cyberpunk con textura y gradiente activo */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 25%, rgba(255, 70, 18, 0.22) 0%, rgba(14, 16, 21, 0.95) 70%)',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 2px, transparent 2px, transparent 6px)',
          opacity: 0.6
        }} />
      </div>

      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="mobile-avatar-bg"
        src={`/media/videos/idle_master.mp4`}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        style={{ zIndex: 0 }}
      />

      {/* Barra superior con botón de salida a Habana completa */}
      <div className="mobile-top-bar" style={{ zIndex: 10 }}>
        <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#ff4612', fontWeight: 900 }}>▲</span> HABANA <span style={{fontSize:'0.6rem', color:'#00f3ff', opacity:0.8}}>MOBILE</span>
        </div>
        <div style={{display:'flex', gap:'8px', alignItems: 'center'}}>
          <button 
            type="button"
            onClick={() => {
              hapticFeedback();
              if (onExitMobile) {
                onExitMobile();
              } else {
                localStorage.setItem('habanaTheme', 'apex-visual');
                window.location.search = '?theme=apex-visual';
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(255,70,18,0.3), rgba(218,41,42,0.4))',
              border: '1px solid #ff4612',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(255,70,18,0.4)'
            }}
          >
            <LayoutDashboard size={16} color="#ff4612" />
            <span>DASHBOARD</span>
          </button>
          <div onClick={() => {hapticFeedback(); setPanelOpen(true);}} style={{background:'rgba(255,255,255,0.1)', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>
            <Lightbulb size={20} color="#00ffcc" />
          </div>
        </div>
      </div>

      <div className="mobile-chat-overlay" style={{ transform: panelOpen ? 'translateY(100%)' : 'translateY(0)', zIndex: 10 }}>
        <div className="mobile-swipe-indicator" onClick={() => {hapticFeedback(); setPanelOpen(true);}}></div>
        
        <div className="mobile-chat-history custom-scrollbar">
          {(!chatHistory || chatHistory.length === 0) ? (
            <div style={{textAlign:'center', color:'rgba(255,255,255,0.6)', marginTop:'2rem'}}>
              Habana te está escuchando...
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#ff4612' }}>
                Toca "DASHBOARD" arriba para ver la interfaz táctica completa y Búnker.
              </div>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`mobile-chat-bubble ${msg.sender === 'user' ? 'mobile-chat-user' : 'mobile-chat-ai'}`}>
                {msg.text}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="mobile-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            className="mobile-input-field" 
            placeholder="Habla con HABANA..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          {inputValue.trim() ? (
            <button type="submit" className="mobile-mic-btn" style={{background:'#00ffcc'}}>
              <Send size={24} color="#000" />
            </button>
          ) : (
            <button type="button" className={`mobile-mic-btn ${isListening ? 'active' : ''}`} onClick={handleMicClick}>
              {isListening ? <MicOff size={24} color="#fff" /> : <Mic size={24} />}
            </button>
          )}
        </form>
      </div>

      <div className={`mobile-hidden-panel ${panelOpen ? 'open' : ''}`} style={{ zIndex: 15 }}>
        <div className="mobile-panel-header">
          <h3>CONTROLES RÁPIDOS</h3>
          <button className="mobile-close-btn" onClick={() => {hapticFeedback(); setPanelOpen(false);}}>
            <ChevronDown size={32} />
          </button>
        </div>
        
        <div className="mobile-devices-grid custom-scrollbar">
          {lights.slice(0, 16).map((light, idx) => (
            <div 
              key={idx} 
              className={`mobile-device-card ${light.state === 'on' ? 'on' : ''}`}
              onClick={() => toggleDevice(light.id, light.state)}
            >
              <Lightbulb size={28} />
              <div className="mobile-device-name">{light.name ? light.name.replace('Interruptor', '').trim() : light.id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

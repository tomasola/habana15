import React, { useState, useEffect } from 'react';

export default function NowPlaying() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [stationName, setStationName] = useState('Emisora');

  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host || (window.location.hostname + ':8050');
    const wsUrl = `${wsProto}//${wsHost}/ws/notify`;
    let ws;
    let reconnectTimer;
    
    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'radio_playing') {
            setStationName(data.title || 'Música');
            setIsPlaying(true);
          } else if (data.type === 'radio_stopped') {
            setIsPlaying(false);
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    }
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return (
    <div className={`now-playing ${isPlaying ? 'show' : ''}`}>
      <div className="np-visualizer">
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
      <div className="np-info">
        <span className="np-label">Reproduciendo Ahora</span>
        <h3 className="np-title">{stationName}</h3>
      </div>
    </div>
  );
}

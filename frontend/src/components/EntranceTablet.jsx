import React, { useEffect, useRef, useState } from 'react';
import PinPad from './PinPad';
import { Camera, ShieldCheck, ShieldAlert, X, Mic, MicOff } from 'lucide-react';

const API_BASE = "";
const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export default function EntranceTablet() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("info"); // info, success, error

  // Live Audio State
  const [isListening, setIsListening] = useState(false);
  const [liveStatus, setLiveStatus] = useState('off'); // off | connecting | ready | active
  
  const liveWsRef = useRef(null);
  const liveAudioCtxRef = useRef(null);
  const liveAudioCtxInputRef = useRef(null);
  const liveProcessorRef = useRef(null);
  const liveStreamRef = useRef(null);
  const isListeningRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    let stream = null;
    let motionInterval = null;
    let prevFrameData = null;
    let lastSentTime = 0;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480, frameRate: { ideal: 10, max: 15 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        showStatus("Error al acceder a la cámara", "error");
      }
    };

    const captureAndSendFullFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');

        try {
          const res = await fetch(`${API_BASE}/api/security/frame`, {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'recognized') {
              showStatus(`Reconocido: ${data.user}`, "success");
            }
          }
        } catch (e) {
          console.error("Frame send error", e);
        }
      }, 'image/jpeg', 0.7); // slightly lower quality for speed
    };

    const checkMotion = () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      
      // Use a tiny off-screen canvas for motion diffing (extremely fast)
      const mc = document.createElement('canvas');
      mc.width = 64;
      mc.height = 48;
      const mctx = mc.getContext('2d', { willReadFrequently: true });
      mctx.drawImage(video, 0, 0, 64, 48);
      
      try {
        const currentData = mctx.getImageData(0, 0, 64, 48).data;
        let motionDetected = false;
        
        if (prevFrameData) {
          let diffCount = 0;
          for (let i = 0; i < currentData.length; i += 4) {
            const rDiff = Math.abs(currentData[i] - prevFrameData[i]);
            const gDiff = Math.abs(currentData[i+1] - prevFrameData[i+1]);
            const bDiff = Math.abs(currentData[i+2] - prevFrameData[i+2]);
            // If color changed significantly
            if (rDiff + gDiff + bDiff > 80) diffCount++;
          }
          // If more than 3% of pixels changed (about 90 pixels)
          if (diffCount > 90) {
            motionDetected = true;
          }
        }
        prevFrameData = currentData;
        
        const now = Date.now();
        // Send frame if motion is detected AND at least 3 seconds have passed since last send
        if (motionDetected && (now - lastSentTime > 3000)) {
          lastSentTime = now;
          captureAndSendFullFrame();
        }
      } catch(e) {
        // Ignore cross-origin canvas errors if any
      }
    };

    startCamera();
    // Check for motion twice a second
    motionInterval = setInterval(checkMotion, 500);

    return () => {
      if (motionInterval) clearInterval(motionInterval);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (liveWsRef.current) liveWsRef.current.close();
      stopLiveListening();
    };
  }, []);

  const playLiveAudioChunk = (arrayBuffer) => {
    if (!liveAudioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      liveAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      nextStartTimeRef.current = liveAudioCtxRef.current.currentTime;
    }
    const audioContext = liveAudioCtxRef.current;
    if (audioContext.state === 'suspended') audioContext.resume();
    try {
      const int16Array = new Int16Array(arrayBuffer);
      const audioBuffer = audioContext.createBuffer(1, int16Array.length, 24000);
      const float32Array = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      const playTime = Math.max(audioContext.currentTime, nextStartTimeRef.current);
      source.start(playTime);
      nextStartTimeRef.current = playTime + audioBuffer.duration;
    } catch (e) {
      console.error('Audio play err:', e);
    }
  };

  const connectGeminiLive = () => {
    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) return;
    setLiveStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws/gemini_live`);
    liveWsRef.current = ws;
    ws.onopen = () => setLiveStatus('ready');
    ws.onclose = () => {
      liveWsRef.current = null;
      setLiveStatus('off');
      setIsListening(false);
      isListeningRef.current = false;
    };
    ws.onerror = () => setLiveStatus('off');
    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') return;
      const arrayBuffer = await event.data.arrayBuffer();
      playLiveAudioChunk(arrayBuffer);
    };
  };

  const startLiveListening = async () => {
    try {
      if (!liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) {
        connectGeminiLive();
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      liveAudioCtxInputRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      liveProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);
      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
          liveWsRef.current.send(pcmBuffer.buffer);
        }
      };
      setIsListening(true);
      setLiveStatus('active');
      isListeningRef.current = true;
    } catch (e) {
      console.error("Mic error:", e);
      setIsListening(false);
      setLiveStatus('ready');
    }
  };

  const stopLiveListening = () => {
    setIsListening(false);
    isListeningRef.current = false;
    if (liveProcessorRef.current) {
      try { liveProcessorRef.current.disconnect(); } catch (e) {}
      liveProcessorRef.current = null;
    }
    if (liveAudioCtxInputRef.current) {
      try { liveAudioCtxInputRef.current.close(); } catch(e) {}
      liveAudioCtxInputRef.current = null;
    }
    if (liveStreamRef.current) {
      try { liveStreamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
      liveStreamRef.current = null;
    }
    if (liveStatus === 'active') setLiveStatus('ready');
  };

  const toggleMic = () => {
    if (isListening) stopLiveListening();
    else startLiveListening();
  };

  const showStatus = (msg, type) => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(""), 4000);
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', 
      background: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Fullscreen Video */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          position: 'absolute', top: 0, left: 0, zIndex: 1
        }} 
      />
      
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* Header */}
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--primary, #00f3ff)', textShadow: '0 0 10px rgba(0,243,255,0.5)' }}>HABANA SECURE</h1>
            <p style={{ margin: 0, fontSize: '1.2rem', color: '#aaa' }}>Monitor de Entrada</p>
          </div>
          
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '1rem' }}>
            <button
              onClick={toggleMic}
              style={{
                background: isListening ? 'rgba(255,0,60,0.6)' : 'rgba(0,0,0,0.6)', 
                border: `2px solid ${isListening ? '#ff003c' : 'var(--primary, #00f3ff)'}`, 
                borderRadius: '12px',
                padding: '1rem 2rem', color: isListening ? '#ff003c' : 'var(--primary, #00f3ff)', 
                fontSize: '1.5rem', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                backdropFilter: 'blur(10px)', 
                boxShadow: isListening ? '0 4px 20px rgba(255,0,60,0.4)' : '0 4px 20px rgba(0,243,255,0.2)',
                animation: isListening ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              {isListening ? <MicOff size={32} /> : <Mic size={32} />} 
              {isListening ? 'ESCUCHANDO...' : 'HABLAR'}
            </button>

            <button 
              onClick={() => setShowPinPad(true)}
              style={{
                background: 'rgba(0,0,0,0.6)', border: '2px solid var(--primary, #00f3ff)', borderRadius: '12px',
                padding: '1rem 2rem', color: 'var(--primary, #00f3ff)', fontSize: '1.5rem', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,243,255,0.2)'
              }}
            >
              <ShieldCheck size={32} /> PIN MANUAL
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Status Toast */}
        {statusMsg && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-block', padding: '1rem 3rem', borderRadius: '50px',
              background: statusType === 'success' ? 'rgba(16, 185, 129, 0.8)' : (statusType === 'error' ? 'rgba(255, 0, 60, 0.8)' : 'rgba(0, 0, 0, 0.8)'),
              color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', backdropFilter: 'blur(10px)',
              border: `2px solid ${statusType === 'success' ? '#10b981' : (statusType === 'error' ? '#ff003c' : '#444')}`
            }}>
              {statusMsg}
            </div>
          </div>
        )}

      </div>

      {/* Pin Pad Modal */}
      {showPinPad && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowPinPad(false)}
              style={{
                position: 'absolute', top: '-60px', right: '-60px',
                background: 'none', border: 'none', color: '#ff003c', cursor: 'pointer',
                padding: '1rem'
              }}
            >
              <X size={48} />
            </button>
            <PinPad onClose={() => setShowPinPad(false)} showStatus={showStatus} />
          </div>
        </div>
      )}
    </div>
  );
}

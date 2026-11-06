import React, { useEffect, useRef } from 'react';

const API_BASE = "";

export default function BackgroundCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let interval = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Background Camera error:", err);
        // Show an error toast if window.showToast exists
        if (window.showToast) {
            window.showToast("Cámara local denegada u offline", "error");
        }
      }
    };

    const captureFrame = async () => {
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
            // If the user was recognized, dispatch a custom event or let the existing WS catch it.
            // Actually the WebSocket in App.jsx will catch the recognition event, so we don't need to do much here.
            // Just for debugging:
            if (data.status === 'recognized') {
              console.log("Background Camera: Reconocido", data.user);
            }
          }
        } catch (e) {
          console.error("Background Frame send error", e);
        }
      }, 'image/jpeg', 0.8);
    };

    startCamera();
    interval = setInterval(captureFrame, 3000); // 3 seconds

    return () => {
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div style={{ display: 'none', position: 'absolute', top: '-9999px', left: '-9999px', visibility: 'hidden' }}>
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} />
    </div>
  );
}

import React, { useRef, useEffect } from 'react';

const Waveform = ({ isActive, type, analyser }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    let dataArray = null;
    
    if (analyser) {
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const numBars = 45;
      const barWidth = canvas.width / numBars;
      const centerY = canvas.height / 2;
      
      ctx.fillStyle = type === 'input' ? 'rgba(255, 0, 60, 0.8)' : 'rgba(0, 243, 255, 0.8)';
      
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }
      
      for (let i = 0; i < numBars; i++) {
        let height = 2;
        if (isActive) {
          if (dataArray && dataArray.length > 0) {
            // Mapear la barra a un rango de frecuencias del analizador
            const dataIndex = Math.min(Math.floor(i * (dataArray.length / numBars)), dataArray.length - 1);
            const rawValue = dataArray[dataIndex];
            // Escalar el valor para que sea visualmente impactante
            height = (rawValue / 255) * (canvas.height * 0.9) + 2;
          } else {
            // Fallback animado aleatorio si el audio aún no fluye
            height = (Math.random() * (canvas.height * 0.8)) + 2;
          }
        }
        
        const x = i * barWidth;
        const y = centerY - (height / 2);
        
        ctx.fillRect(x + 1, y, barWidth - 2, height);
      }
      
      if (isActive) {
        animationId = requestAnimationFrame(draw);
      } else {
        // Dibujar línea plana una vez y parar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'; // color muted
        for (let i = 0; i < numBars; i++) {
          ctx.fillRect((i * barWidth) + 1, centerY - 1, barWidth - 2, 2);
        }
      }
    };
    
    draw();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isActive, type, analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={150} 
      className="waveform-canvas"
      style={{ width: '100%', maxWidth: '600px', height: '150px' }}
    />
  );
};

export default Waveform;

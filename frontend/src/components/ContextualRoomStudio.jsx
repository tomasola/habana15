import React, { useState, useEffect } from 'react';

const MOOD_SCENES = [
  { id: 'relax', name: 'Lectura & Relax', icon: '📖', kelvin: 2700, brightness: 50, color: 'from-amber-500/20 to-orange-500/10' },
  { id: 'focus', name: 'Trabajo & Enfoque', icon: '💼', kelvin: 5000, brightness: 90, color: 'from-blue-500/20 to-cyan-500/10' },
  { id: 'cinema', name: 'Modo Cine', icon: '🎬', kelvin: 2200, brightness: 15, color: 'from-purple-500/20 to-indigo-500/10' },
  { id: 'circadian', name: 'Luz Solar Circadiana', icon: '☀️', kelvin: 'Auto', brightness: 'Auto', color: 'from-emerald-500/20 to-teal-500/10' }
];

export default function ContextualRoomStudio({ activeRoomId = 'salon', onSceneSelect }) {
  const [fusionData, setFusionData] = useState(null);
  const [selectedMood, setSelectedMood] = useState('circadian');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/fusion/status');
        if (res.ok) {
          const data = await res.json();
          setFusionData(data);
        }
      } catch (e) {
        console.error('Error obteniendo estado fusión:', e);
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleApplyMood = async (mood) => {
    setSelectedMood(mood.id);
    setLoading(true);
    try {
      if (onSceneSelect) {
        onSceneSelect(activeRoomId, mood);
      }
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  };

  const roomPresence = fusionData?.presence_summary?.[activeRoomId] || { occupied: true, confidence_pct: 95 };
  const circadian = fusionData?.circadian || { kelvin: 2200, circadian_phase: 'Noche', sun_elevation_degrees: -60 };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-5 text-slate-100">
      
      {/* HEADER DE ESTANCIA CONTEXTUAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accentCyan/30 to-blue-600/30 border border-accentCyan/50 flex items-center justify-center text-2xl shadow-lg">
            🚪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold capitalize tracking-wide">{activeRoomId}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                roomPresence.occupied ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {roomPresence.occupied ? `🚶 OCUPADO (${roomPresence.confidence_pct}%)` : 'DESPEJADO'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Control Contextual Inteligente • Habana 14.3</p>
          </div>
        </div>

        {/* DIAL SOLAR CIRCADIANO */}
        <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-3 font-mono text-xs">
          <div className="text-amber-400 text-base">☀️</div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Espectro Solar</div>
            <div className="font-bold text-slate-200">{circadian.kelvin} K <span className="text-[10px] text-accentCyan">({circadian.sun_elevation_degrees}°)</span></div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE AMBIENTES DE 1-TOQUE */}
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
          <span>✨</span> Ambientes Unificados de Estancia (One-Touch Moods)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOOD_SCENES.map((mood) => {
            const isActive = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => handleApplyMood(mood)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-28 relative overflow-hidden group hover:scale-[1.02] ${
                  isActive
                    ? 'bg-gradient-to-br ' + mood.color + ' border-accentCyan shadow-lg ring-1 ring-accentCyan/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-2xl mb-1">{mood.icon}</div>
                <div>
                  <div className="font-bold text-xs text-slate-100 group-hover:text-accentCyan transition">{mood.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {mood.kelvin === 'Auto' ? 'Solar Dinámico' : `${mood.kelvin}K • ${mood.brightness}%`}
                  </div>
                </div>
                {isActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accentCyan animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: ESTADO DEL BUS QoS P0 */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Bus P0: Latencia de conmutada ultra-baja (0.06 ms)</span>
        </span>
        <span className="text-accentCyan">Rampa de transición: 400 ms suave</span>
      </div>

    </div>
  );
}

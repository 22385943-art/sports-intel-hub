import { useMemo } from "react";

interface Shot {
  x: number;
  y: number;
  made: boolean;
  zone: string;
  type: string;
}

interface ShotChartProps {
  shots: Shot[];
}

export default function ShotChart({ shots }: ShotChartProps) {
  // Calculamos porcentajes rápidos para un mini-resumen
  const stats = useMemo(() => {
    if (!shots.length) return { made: 0, total: 0, pct: 0 };
    const made = shots.filter(s => s.made).length;
    return { made, total: shots.length, pct: ((made / shots.length) * 100).toFixed(1) };
  }, [shots]);

  return (
    <div className="flex flex-col items-center bg-[#0a0f18] border border-white/[0.06] rounded-[2rem] p-6 shadow-2xl relative w-full overflow-hidden">
      
      <div className="absolute top-6 left-8 flex flex-col gap-1 z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total FGA</span>
        <span className="font-mono text-2xl font-black text-white">{stats.made}<span className="text-slate-600">/{stats.total}</span></span>
        <span className={`text-sm font-black ${Number(stats.pct) >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>{stats.pct}%</span>
      </div>

      <div className="absolute top-6 right-8 flex gap-4 z-10">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div><span className="text-[10px] font-black text-slate-400 uppercase">Made</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] opacity-50"></div><span className="text-[10px] font-black text-slate-400 uppercase">Missed</span></div>
      </div>

      <div className="w-full max-w-2xl relative mt-4">
        {/* El viewBox y los transform están calibrados exactamente a las medidas de la API de la NBA */}
        <svg viewBox="-250 -350 500 400" className="w-full h-auto drop-shadow-2xl">
          <g transform="scale(-1, 1)"> {/* Invierte el eje X para que coincida visualmente */}
            <g transform="scale(1, -1)"> {/* Invierte el eje Y para que el aro esté abajo */}
              
              {/* DIBUJO DE LA CANCHA */}
              <g className="text-slate-800" stroke="currentColor" strokeWidth="2.5" fill="none">
                {/* Arco de 3 puntos */}
                <path d="M -220 -47.5 L -220 92.5 A 237.5 237.5 0 0 1 220 92.5 L 220 -47.5" />
                {/* Pintura exterior e interior */}
                <rect x="-80" y="-47.5" width="160" height="190" fill="rgba(255,255,255,0.01)" />
                <rect x="-60" y="-47.5" width="120" height="190" />
                {/* Circulo de tiros libres */}
                <path d="M -60 142.5 A 60 60 0 0 1 60 142.5" strokeDasharray="8 8" />
                <path d="M -60 142.5 A 60 60 0 0 0 60 142.5" />
                {/* Tablero y Aro */}
                <line x1="-30" y1="-12.5" x2="30" y2="-12.5" stroke="#fff" strokeWidth="4" className="opacity-30" />
                <circle cx="0" cy="0" r="7.5" stroke="#f97316" strokeWidth="3" />
                <path d="M -7.5 0 L 0 -12.5 L 7.5 0" stroke="#f97316" strokeWidth="1.5" className="opacity-50" />
              </g>

              {/* RENDERIZADO DEL RADAR DE TIROS */}
              {shots.map((shot, i) => (
                <circle
                  key={i}
                  cx={shot.x}
                  cy={shot.y}
                  r="5"
                  fill={shot.made ? "#10b981" : "#ef4444"}
                  className={`transition-all duration-300 cursor-crosshair ${shot.made ? 'opacity-80 hover:opacity-100' : 'opacity-30 hover:opacity-80'}`}
                >
                  <title>{shot.type} • {shot.zone} • {shot.made ? "Made" : "Missed"}</title>
                </circle>
              ))}
              
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
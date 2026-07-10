import { useState, useMemo } from "react";
import { Target, LayoutGrid } from "lucide-react";

interface Shot {
  x: number;
  y: number;
  made: boolean;
  zone: string;
  type: string;
}

interface ShotChartProps {
  shots: Shot[];
  player?: any;
}

type ChartMode = "scatter" | "zones";

// 🚀 1. GEOMETRÍA SVG PURA (ROMPECABEZAS MATEMÁTICO PERFECTO)
// Calculado al milímetro sin usar ClipPaths. Sweep-flag (0) corregido para que 
// SVG use el centro del aro (0,0) en lugar de crear el efecto "techo de circo".
const MACRO_ZONES = [
  // Zonas Interiores
  { id: "restricted", path: "M -40 -47.5 L -40 0 A 40 40 0 0 1 40 0 L 40 -47.5 Z", cx: 0, cy: -15, expectedPct: 0.65, name: "Restricted Area" },
  { id: "paint", path: "M -80 -47.5 L -80 142.5 L 80 142.5 L 80 -47.5 L 40 -47.5 L 40 0 A 40 40 0 0 0 -40 0 L -40 -47.5 Z", cx: 0, cy: 90, expectedPct: 0.45, name: "In The Paint (Non-RA)" },
  
  // Media Distancia (Limitadas milimétricamente por el arco R=238.66)
  { id: "mid_left_base", path: "M -220 -47.5 L -220 92.5 L -80 92.5 L -80 -47.5 Z", cx: -150, cy: 30, expectedPct: 0.40, name: "Left Baseline Mid" },
  { id: "mid_right_base", path: "M 220 -47.5 L 220 92.5 L 80 92.5 L 80 -47.5 Z", cx: 150, cy: 30, expectedPct: 0.40, name: "Right Baseline Mid" },
  { id: "mid_left_wing", path: "M -220 92.5 A 238.66 238.66 0 0 0 -80 224.85 L -80 92.5 Z", cx: -140, cy: 140, expectedPct: 0.41, name: "Left Wing Mid" },
  { id: "mid_center", path: "M -80 142.5 L -80 224.85 A 238.66 238.66 0 0 0 80 224.85 L 80 142.5 Z", cx: 0, cy: 180, expectedPct: 0.42, name: "Center Mid" },
  { id: "mid_right_wing", path: "M 80 92.5 L 80 224.85 A 238.66 238.66 0 0 0 220 92.5 Z", cx: 140, cy: 140, expectedPct: 0.41, name: "Right Wing Mid" },

  // Zonas de Triple (Empiezan exactamente donde terminan las anteriores)
  { id: "corner3_left", path: "M -250 -47.5 L -250 92.5 L -220 92.5 L -220 -47.5 Z", cx: -235, cy: 30, expectedPct: 0.38, name: "Left Corner 3" },
  { id: "corner3_right", path: "M 250 -47.5 L 250 92.5 L 220 92.5 L 220 -47.5 Z", cx: 235, cy: 30, expectedPct: 0.38, name: "Right Corner 3" },
  { id: "atb3_left", path: "M -250 92.5 L -220 92.5 A 238.66 238.66 0 0 0 -80 224.85 L -80 320 L -250 320 Z", cx: -165, cy: 260, expectedPct: 0.35, name: "Above Break 3 Left" },
  { id: "atb3_center", path: "M -80 224.85 A 238.66 238.66 0 0 0 80 224.85 L 80 320 L -80 320 Z", cx: 0, cy: 270, expectedPct: 0.35, name: "Above Break 3 Center" },
  { id: "atb3_right", path: "M 80 224.85 A 238.66 238.66 0 0 0 220 92.5 L 250 92.5 L 250 320 L 80 320 Z", cx: 165, cy: 260, expectedPct: 0.35, name: "Above Break 3 Right" },
];

export default function ShotChart({ shots }: ShotChartProps) {
  const [viewMode, setViewMode] = useState<ChartMode>("scatter");

  const stats = useMemo(() => {
    if (!shots.length) return { made: 0, total: 0, pct: 0 };
    const made = shots.filter(s => s.made).length;
    return { made, total: shots.length, pct: ((made / shots.length) * 100).toFixed(1) };
  }, [shots]);

  const zoneStats = useMemo(() => {
    if (viewMode !== "zones" || !shots.length) return [];

    const bins = new Map(MACRO_ZONES.map(z => [z.id, { ...z, made: 0, total: 0 }]));

    shots.forEach(shot => {
      const { x, y, made } = shot;
      const d = Math.sqrt(x * x + y * y);
      let zoneId = "backcourt";

      let is3pt = false;
      if (y <= 92.5) {
          is3pt = Math.abs(x) >= 220;
      } else {
          is3pt = d >= 238.66;
      }

      if (y > 320) {
          zoneId = "backcourt";
      } else if (is3pt) {
          if (y <= 92.5) {
              zoneId = x < 0 ? "corner3_left" : "corner3_right";
          } else {
              if (x <= -80) zoneId = "atb3_left";
              else if (x >= 80) zoneId = "atb3_right";
              else zoneId = "atb3_center";
          }
      } else { 
          if (d <= 40 && y <= 40) {
              zoneId = "restricted";
          } else if (Math.abs(x) <= 80 && y <= 142.5) {
              zoneId = "paint";
          } else { 
              if (y <= 92.5) {
                  zoneId = x < 0 ? "mid_left_base" : "mid_right_base";
              } else if (x <= -80) {
                  zoneId = "mid_left_wing";
              } else if (x >= 80) {
                  zoneId = "mid_right_wing";
              } else {
                  zoneId = "mid_center";
              }
          }
      }

      if (bins.has(zoneId)) {
        const bin = bins.get(zoneId)!;
        bin.total += 1;
        if (made) bin.made += 1;
      }
    });

    return Array.from(bins.values()).filter(b => b.total > 0);
  }, [shots, viewMode]);

  const getRelativeHeatColor = (made: number, total: number, expected: number) => {
    const pct = made / total;
    const diff = pct - expected;
    
    if (diff >= 0.08) return "#10b981"; 
    if (diff >= 0.02) return "#34d399"; 
    if (diff >= -0.02) return "#64748b"; 
    if (diff >= -0.08) return "#f87171"; 
    return "#ef4444"; 
  };

  return (
    <div className="flex flex-col items-center bg-[#0a0f18] border border-white/[0.06] rounded-[2rem] p-6 shadow-2xl relative w-full overflow-hidden">
      
      <div className="absolute top-6 left-8 flex flex-col gap-1 z-10 pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total FGA</span>
        <span className="font-mono text-2xl font-black text-white">
          {stats.made}<span className="text-slate-600">/{stats.total}</span>
        </span>
        <span className={`text-sm font-black ${Number(stats.pct) >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
          {stats.pct}%
        </span>
      </div>

      <div className="absolute top-6 right-8 flex flex-col items-end gap-3 z-20">
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
          <button 
            onClick={() => setViewMode("scatter")} 
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 ${viewMode === "scatter" ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-white"}`}
          >
            <Target className="w-3 h-3" /> Scatter
          </button>
          <button 
            onClick={() => setViewMode("zones")} 
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 ${viewMode === "zones" ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-white"}`}
          >
            <LayoutGrid className="w-3 h-3" /> Zonal
          </button>
        </div>

        {viewMode === "scatter" ? (
          <div className="flex gap-4 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 pointer-events-none">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div><span className="text-[9px] font-black text-slate-400 uppercase">Made</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] opacity-60"></div><span className="text-[9px] font-black text-slate-400 uppercase">Miss</span></div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Vs. League Avg</span>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 pointer-events-none">
              <span className="text-[9px] font-black text-rose-400 uppercase mr-1">Cold</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-slate-500"></div> 
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
              <span className="text-[9px] font-black text-emerald-400 uppercase ml-1">Hot</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl relative mt-12 md:mt-4">
        <svg viewBox="-250 -350 500 400" className="w-full h-auto drop-shadow-2xl overflow-visible">
          <g transform="scale(-1, 1)"> 
            <g transform="scale(1, -1)"> 
              
              {/* CAPA 1: ROMPECABEZAS ZONAL CONTIGUO */}
              {viewMode === "zones" && zoneStats.map((bin) => {
                const pct = (bin.made / bin.total) * 100;
                const volumeFactor = Math.min(1, bin.total / Math.max(15, shots.length * 0.08));
                const dynamicOpacity = 0.15 + (0.75 * volumeFactor); 
                
                return (
                  <path
                    key={bin.id}
                    d={bin.path}
                    fill={getRelativeHeatColor(bin.made, bin.total, bin.expectedPct)}
                    fillOpacity={dynamicOpacity}
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth={1}
                    className="transition-all duration-300 hover:fill-opacity-100 hover:stroke-white/30 cursor-crosshair"
                  >
                    <title>
                      {`${bin.name}\n${pct.toFixed(1)}% (${bin.made}/${bin.total})\nExpected: ${(bin.expectedPct * 100).toFixed(1)}%`}
                    </title>
                  </path>
                );
              })}

              {/* CAPA 2: ESQUELETO DE LA PISTA */}
              <g className="pointer-events-none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none">
                {/* 🚀 LÍNEA DE 3 PRINCIPAL CORREGIDA */}
                <path d="M -220 -47.5 L -220 92.5 A 238.66 238.66 0 0 0 220 92.5 L 220 -47.5" strokeWidth="3" stroke="rgba(255,255,255,0.6)" />
                <rect x="-80" y="-47.5" width="160" height="190" fill="transparent" />
                <rect x="-60" y="-47.5" width="120" height="190" />
                <path d="M -60 142.5 A 60 60 0 0 1 60 142.5" strokeDasharray="8 8" />
                <path d="M -60 142.5 A 60 60 0 0 0 60 142.5" />
                <line x1="-30" y1="-12.5" x2="30" y2="-12.5" stroke="rgba(255,255,255,0.8)" strokeWidth="4" />
                <circle cx="0" cy="0" r="7.5" stroke="#f97316" strokeWidth="3" />
                <path d="M -7.5 0 L 0 -12.5 L 7.5 0" stroke="#f97316" strokeWidth="1.5" className="opacity-70" />
              </g>

              {/* CAPA 3: PUNTOS SCATTER */}
              {viewMode === "scatter" && shots.map((shot, i) => (
                <circle
                  key={`sc-${i}`}
                  cx={shot.x}
                  cy={shot.y}
                  r="5"
                  fill={shot.made ? "#10b981" : "#ef4444"}
                  className={`transition-all duration-300 cursor-crosshair ${shot.made ? 'opacity-80 hover:opacity-100' : 'opacity-30 hover:opacity-80'}`}
                >
                  <title>{shot.type} • {shot.zone} • {shot.made ? "Made" : "Missed"}</title>
                </circle>
              ))}

              {/* CAPA 4: TEXTO ESTADÍSTICO */}
              {viewMode === "zones" && zoneStats.map((bin) => {
                const pct = (bin.made / bin.total) * 100;
                return (
                  <g key={`text-${bin.id}`} transform="scale(-1, -1)" className="pointer-events-none">
                    <text 
                      x={-bin.cx} 
                      y={-bin.cy - 2} 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      fill="#ffffff"
                      className="font-mono font-black text-[13px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      {pct.toFixed(0)}%
                    </text>
                    <text 
                      x={-bin.cx} 
                      y={-bin.cy + 12} 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.85)"
                      className="font-mono font-bold text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    >
                      {bin.made}/{bin.total}
                    </text>
                  </g>
                );
              })}

            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
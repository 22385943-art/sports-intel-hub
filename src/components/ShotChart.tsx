import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { nbaService } from '@/services/sportServiceFactory';

interface Shot {
  x: number;
  y: number;
  made: boolean;
  zone: string;
}

interface ShotChartProps {
  shots: Shot[];
  teamAbbr?: string;
}

const LEAGUE_AVERAGES: Record<string, number> = {
  "Restricted Area": 66.0,
  "In The Paint (Non-RA)": 43.0,
  "Mid-Range": 41.5,
  "Left Corner 3": 39.0,
  "Right Corner 3": 39.0,
  "Above the Break 3": 35.5,
  "Backcourt": 5.0,
};

// Paleta de colores más agresiva para fondo oscuro
const colorScale = d3.scaleLinear<string>()
  .domain([-10, -5, 0, 5, 10])
  .range(["#3b82f6", "#60a5fa", "#ffffff00", "#f59e0b", "#ef4444"])
  .interpolate(d3.interpolateRgb);

export default function ShotChart({ shots, teamAbbr }: ShotChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const zoneStats = useMemo(() => {
    const stats: Record<string, { made: number; total: number; pct: number; diff: number; color: string }> = {};
    Object.keys(LEAGUE_AVERAGES).forEach(z => { 
      stats[z] = { made: 0, total: 0, pct: 0, diff: 0, color: "#ffffff00" }; 
    });

    shots.forEach(s => {
      if (stats[s.zone]) {
        stats[s.zone].total++;
        if (s.made) stats[s.zone].made++;
      }
    });

    Object.keys(stats).forEach(z => {
      if (stats[z].total > 0) {
        stats[z].pct = (stats[z].made / stats[z].total) * 100;
        stats[z].diff = stats[z].pct - LEAGUE_AVERAGES[z];
        stats[z].color = colorScale(stats[z].diff);
      }
    });
    return stats;
  }, [shots]);

  const hexBins = [
    { zone: "Left Corner 3", x: 40, y: 350 },
    { zone: "Right Corner 3", x: 460, y: 350 },
    { zone: "Restricted Area", x: 250, y: 410 },
    { zone: "In The Paint (Non-RA)", x: 250, y: 320 },
    { zone: "Mid-Range", x: 250, y: 220 },
    { zone: "Above the Break 3", x: 250, y: 100 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hexBins.forEach(bin => {
      const stat = zoneStats[bin.zone];
      if (stat.total < 3) return;

      const x = bin.x;
      const y = bin.y;
      const radius = Math.max(40, (stat.total / 150) * 120); 

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, stat.color);
      gradient.addColorStop(0.4, stat.color); // Color más sólido en el centro
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [zoneStats, hexBins]);

  return (
    <div className="bg-[#0a0f18] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl relative w-full overflow-hidden min-h-[700px] flex flex-col items-center perspective-1000">
      
      {/* UI Superior */}
      <div className="w-full flex justify-between items-start z-30 mb-8 px-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Efficiency</span>
          <span className="font-mono text-4xl font-black text-white drop-shadow-md">
            {shots.filter(s => s.made).length}
            <span className="text-slate-600 text-2xl">/{shots.length}</span> 
            <span className="text-lg text-emerald-400 ml-2">({shots.length > 0 ? ((shots.filter(s => s.made).length / shots.length) * 100).toFixed(1) : "0.0"}%)</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-2 opacity-80">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">vs League Average</span>
          <div className="flex items-center gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10 shadow-lg">
            <span className="text-[9px] font-bold text-blue-500 mr-1">COLD</span>
            <div className="w-3.5 h-3.5 rounded bg-blue-500" />
            <div className="w-3.5 h-3.5 rounded bg-blue-400" />
            <div className="w-3.5 h-3.5 rounded bg-slate-700" />
            <div className="w-3.5 h-3.5 rounded bg-orange-400" />
            <div className="w-3.5 h-3.5 rounded bg-red-500" />
            <span className="text-[9px] font-bold text-red-500 ml-1">HOT</span>
          </div>
        </div>
      </div>

      {/* 🚀 EL ENTORNO 3D ISOMÉTRICO (Sin fotos que molesten) */}
      <div 
        className="relative z-10 w-full max-w-2xl aspect-[500/470] transition-transform duration-700 ease-out hover:scale-105"
        style={{ 
          transform: 'rotateX(40deg) translateY(-20px)', 
          transformStyle: 'preserve-3d',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)'
        }}
      >
        
        {/* FONDO DARK PREMIUM (Sustituye a la madera fea) */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#020617] border border-slate-700/50 overflow-hidden">
          {/* Grid sutil analítico */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* CANVAS DEL MAPA DE CALOR */}
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={470} 
          className="absolute inset-0 w-full h-full z-10"
          style={{ mixBlendMode: 'screen', filter: 'blur(8px)' }}
        />

        {/* CAPA DE LÍNEAS SVG Y TEXTO */}
        <svg viewBox="0 -20 500 460" className="absolute inset-0 w-full h-full z-20 rounded-sm">
          {teamAbbr && (
            <g className="opacity-20" transform="translate(250, 0)">
              <circle cx="0" cy="0" r="60" fill="none" stroke="#fff" strokeWidth="2" />
              <image href={nbaService.getTeamLogoUrl(teamAbbr)} x="-40" y="-40" width="80" height="80" />
            </g>
          )}

          {/* Líneas de la pista (ahora sí, nítidas y solas) */}
          <g className="text-slate-400 opacity-60 pointer-events-none" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M 30 422.5 L 30 282.5 A 237.5 237.5 0 0 1 470 282.5 L 470 422.5" />
            <rect x="170" y="232.5" width="160" height="190" />
            <rect x="190" y="232.5" width="120" height="190" />
            <path d="M 190 232.5 A 60 60 0 0 1 310 232.5" strokeDasharray="6 6" />
            <path d="M 190 232.5 A 60 60 0 0 0 310 232.5" />
            <line x1="220" y1="387.5" x2="280" y2="387.5" strokeWidth="3" />
            <circle cx="250" cy="375" r="7.5" stroke="#f59e0b" strokeWidth="2" />
          </g>

          {/* Datos */}
          {hexBins.map((bin, i) => {
            const stat = zoneStats[bin.zone];
            if (stat.total < 3) return null;

            return (
              <g 
                key={i} 
                transform={`translate(${bin.x}, ${bin.y})`}
                className="cursor-crosshair group"
                onMouseEnter={() => setHoveredZone(bin.zone)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <circle cx="0" cy="0" r="40" fill="transparent" />
                <text x="0" y="2" textAnchor="middle" fill="#ffffff" className="font-mono text-2xl font-black drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                  {stat.pct.toFixed(0)}<span className="text-sm">%</span>
                </text>
                <text x="0" y="18" textAnchor="middle" fill="#cbd5e1" className="font-sans text-[10px] font-bold mt-1 uppercase tracking-widest opacity-90">
                  {stat.made}/{stat.total}
                </text>
              </g>
            );
          })}
        </svg>

        {/* TOOLTIP 3D FLOTANTE */}
        {hoveredZone && zoneStats[hoveredZone].total >= 3 && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-600 p-5 rounded-2xl shadow-2xl z-30 text-white font-sans w-64 text-center pointer-events-none"
            style={{ transform: 'translate(-50%, -50%) translateZ(50px) rotateX(-40deg)' }} // Contrarresta la inclinación para leerse plano
          >
            <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1">{hoveredZone}</p>
            <p className="text-4xl font-black font-mono leading-none">{zoneStats[hoveredZone].made}<span className="text-2xl text-slate-500">/{zoneStats[hoveredZone].total}</span></p>
            <p className={`text-base font-bold mt-2 ${zoneStats[hoveredZone].diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {zoneStats[hoveredZone].pct.toFixed(1)}% ({zoneStats[hoveredZone].diff >= 0 ? `+${zoneStats[hoveredZone].diff.toFixed(1)}%` : `${zoneStats[hoveredZone].diff.toFixed(1)}%`})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
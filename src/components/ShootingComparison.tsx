import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Crosshair, Snowflake, CircleDashed } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface RawShot {
  locX: number;
  locY: number;
  shotMade: boolean;
  shotDistance: number;
}

export interface PlayerShootingProfile {
  id: string | number;
  name: string;
  imageUrl: string;
  color: string;
  trueShooting: number;
  effectiveFG: number;
  shots: RawShot[];
}

interface ShootingComparisonProps {
  player1: PlayerShootingProfile;
  player2: PlayerShootingProfile;
  isDefense?: boolean;
}

type ZoneId = 'rim' | 'paintL' | 'paintR' | 'midL' | 'midR' | 'elbowL' | 'elbowR' | 'highPost' | 'corner3L' | 'corner3R' | 'wing3L' | 'wing3R' | 'topKey3' | 'deep3';

interface ZoneDef {
  id: ZoneId;
  label: string;
  top: string;
  left: string;
}

const COURT_ZONES: ZoneDef[] = [
  { id: 'rim', label: 'Restricted Area', top: '15%', left: '50%' },
  { id: 'paintL', label: 'Paint (Left)', top: '28%', left: '42%' },
  { id: 'paintR', label: 'Paint (Right)', top: '28%', left: '58%' },
  { id: 'elbowL', label: 'Left Elbow', top: '42%', left: '38%' },
  { id: 'elbowR', label: 'Right Elbow', top: '42%', left: '62%' },
  { id: 'highPost', label: 'High Post / FT', top: '42%', left: '50%' },
  { id: 'midL', label: 'Baseline Mid (L)', top: '25%', left: '22%' },
  { id: 'midR', label: 'Baseline Mid (R)', top: '25%', left: '78%' },
  { id: 'corner3L', label: 'Corner 3 (L)', top: '12%', left: '6%' },
  { id: 'corner3R', label: 'Corner 3 (R)', top: '12%', left: '94%' },
  { id: 'wing3L', label: 'Wing 3 (L)', top: '55%', left: '16%' },
  { id: 'wing3R', label: 'Wing 3 (R)', top: '55%', left: '84%' },
  { id: 'topKey3', label: 'Top of Key 3', top: '70%', left: '50%' },
  { id: 'deep3', label: 'Deep / Logo', top: '92%', left: '50%' },
];

export const ShootingComparison: React.FC<ShootingComparisonProps> = ({ player1, player2, isDefense = false }) => {
  const [hoveredZone, setHoveredZone] = useState<ZoneId | null>(null);

  const classifyShot = (x: number, y: number): ZoneId => {
    const dist = Math.sqrt(x * x + y * y);
    
    if (y <= 92.5 && x <= -220) return 'corner3L';
    if (y <= 92.5 && x >= 220) return 'corner3R';
    if (dist >= 237.5) {
      if (dist >= 300) return 'deep3';
      if (x <= -100) return 'wing3L';
      if (x >= 100) return 'wing3R';
      return 'topKey3';
    }
    
    if (dist < 40) return 'rim';
    if (Math.abs(x) <= 80 && y < 144) {
      return x < 0 ? 'paintL' : 'paintR';
    }
    
    if (y >= 144 && y <= 190) {
      if (x >= -80 && x <= -30) return 'elbowL';
      if (x >= 30 && x <= 80) return 'elbowR';
      if (Math.abs(x) < 30) return 'highPost';
    }
    
    return x < 0 ? 'midL' : 'midR';
  };

  const processShots = (shots: RawShot[]) => {
    const stats: Record<ZoneId, { makes: number; attempts: number; pct: number }> = {} as any;
    COURT_ZONES.forEach(z => stats[z.id] = { makes: 0, attempts: 0, pct: 0 });

    if (!shots || shots.length === 0) return stats;

    shots.forEach(shot => {
      const zone = classifyShot(shot.locX, shot.locY);
      stats[zone].attempts += 1;
      if (shot.shotMade) stats[zone].makes += 1;
    });

    COURT_ZONES.forEach(z => {
      const s = stats[z.id];
      s.pct = s.attempts > 0 ? (s.makes / s.attempts) * 100 : 0;
    });

    return stats;
  };

  const p1ZoneStats = useMemo(() => processShots(player1?.shots || []), [player1]);
  const p2ZoneStats = useMemo(() => processShots(player2?.shots || []), [player2]);

  const getDominator = (zoneId: ZoneId) => {
    const s1 = p1ZoneStats[zoneId];
    const s2 = p2ZoneStats[zoneId];
    
    if (s1.makes === 0 && s2.makes === 0 && !isDefense) return null;
    if (s1.attempts === 0 && s2.attempts === 0) return null;

    let winner = null;
    let loser = null;
    let winStats = null;
    let loseStats = null;
    let isVolumeWin = false;

    // 🚀 INVERSIÓN MATEMÁTICA: Si es mapa defensivo, premia al menor porcentaje
    const isP1Better = isDefense ? s1.pct < s2.pct : s1.pct > s2.pct;
    const isP2Better = isDefense ? s2.pct < s1.pct : s2.pct > s1.pct;

    if (s1.attempts > 0 && s2.attempts === 0) {
      winner = player1; loser = player2; winStats = s1; loseStats = s2;
    } else if (s2.attempts > 0 && s1.attempts === 0) {
      winner = player2; loser = player1; winStats = s2; loseStats = s1;
    } 
    else if (isP1Better && s1.attempts >= s2.attempts) {
      winner = player1; loser = player2; winStats = s1; loseStats = s2;
    } else if (isP2Better && s2.attempts >= s1.attempts) {
      winner = player2; loser = player1; winStats = s2; loseStats = s1;
    } else if (s1.pct === s2.pct && s1.attempts > s2.attempts) {
      winner = player1; loser = player2; winStats = s1; loseStats = s2; isVolumeWin = true;
    } else if (s2.pct === s1.pct && s2.attempts > s1.attempts) {
      winner = player2; loser = player1; winStats = s2; loseStats = s1; isVolumeWin = true;
    }
    else if (s1.attempts > 0 && s2.attempts > 0) {
      const VIRTUAL_MAKES = 8;
      const VIRTUAL_ATTEMPTS = 20;
      
      const adj1 = (s1.makes + VIRTUAL_MAKES) / (s1.attempts + VIRTUAL_ATTEMPTS);
      const adj2 = (s2.makes + VIRTUAL_MAKES) / (s2.attempts + VIRTUAL_ATTEMPTS);

      const adjP1Better = isDefense ? adj1 < adj2 : adj1 > adj2;
      const adjP2Better = isDefense ? adj2 < adj1 : adj2 > adj1;

      if (adjP1Better) { winner = player1; loser = player2; winStats = s1; loseStats = s2; }
      else if (adjP2Better) { winner = player2; loser = player1; winStats = s2; loseStats = s1; }
      else if (isP1Better) { winner = player1; loser = player2; winStats = s1; loseStats = s2; }
      else if (isP2Better) { winner = player2; loser = player1; winStats = s2; loseStats = s1; }
      else if (s1.attempts > s2.attempts) { winner = player1; loser = player2; winStats = s1; loseStats = s2; isVolumeWin = true; }
      else if (s2.attempts > s1.attempts) { winner = player2; loser = player1; winStats = s2; loseStats = s1; isVolumeWin = true; }
    }

    if (!winner || !winStats || !loseStats) return null;

    if (!isDefense && winStats.pct <= 20 && winStats.attempts >= 3) {
      return null;
    }

    if (winStats.pct < loseStats.pct && !isDefense) isVolumeWin = true;
    if (winStats.pct > loseStats.pct && isDefense) isVolumeWin = true;

    return { winner, loser, winStats, loseStats, isVolumeWin };
  };

  if (!player1 || !player2) return null;

  return (
    <div className="w-full space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {[player1, player2].map((p, idx) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: p.color }} />
            <div className="flex items-center gap-3 mb-4 pl-3">
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarImage src={p.imageUrl} />
                <AvatarFallback className="text-[10px] bg-slate-900">{p.name[0]}</AvatarFallback>
              </Avatar>
              <h3 className="text-white/80 font-bold tracking-wide text-sm">{p.name}</h3>
            </div>
            
            <div className="flex justify-between items-center pl-3">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest flex items-center gap-1">
                  <Zap size={10} /> TS%
                </p>
                <p className="text-xl font-mono text-white font-black mt-1">{p.trueShooting?.toFixed(1) || '0.0'}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest flex items-center gap-1">
                  <Target size={10} /> TRACKED SHOTS
                </p>
                <p className="text-xl font-mono text-white font-black mt-1">{p.shots?.length || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] uppercase tracking-widest flex items-center justify-end gap-1">
                  <Crosshair size={10} /> eFG%
                </p>
                <p className="text-xl font-mono text-white font-black mt-1">{p.effectiveFG?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-[#050914] border border-white/10 rounded-[2rem] p-6 relative shadow-2xl flex flex-col items-center"
      >
        <div className="flex flex-col items-center mb-6 w-full justify-center relative z-10">
          <div className="flex items-center gap-2">
            <Crosshair className="text-emerald-400" size={18} />
            <h4 className="text-white font-black text-sm uppercase tracking-[0.3em]">Precision Mapping Engine</h4>
          </div>
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1.5">* Zone dominance weighted by efficiency and shot volume</p>
        </div>

        <div className="relative w-full max-w-[650px] aspect-[50/47] mx-auto border-t-2 border-white/10 mt-4 mb-4">
          <svg viewBox="0 0 500 470" className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <rect x="170" y="0" width="160" height="190" fill="none" stroke="#ffffff" strokeWidth="2" />
            <rect x="190" y="0" width="120" height="190" fill="none" stroke="#ffffff" strokeWidth="2" />
            <path d="M 170 190 A 80 80 0 0 1 330 190" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 8" />
            <path d="M 170 190 A 80 80 0 0 0 330 190" fill="none" stroke="#ffffff" strokeWidth="2" />
            <line x1="220" y1="40" x2="280" y2="40" stroke="#ffffff" strokeWidth="3" />
            <circle cx="250" cy="52.5" r="7.5" fill="none" stroke="#ffffff" strokeWidth="2" />
            <path d="M 210 52.5 A 40 40 0 0 1 290 52.5" fill="none" stroke="#ffffff" strokeWidth="2" />
            <line x1="45" y1="0" x2="45" y2="140" stroke="#ffffff" strokeWidth="2" />
            <line x1="455" y1="0" x2="455" y2="140" stroke="#ffffff" strokeWidth="2" />
            <path d="M 45 140 A 237.5 237.5 0 0 1 455 140" fill="none" stroke="#ffffff" strokeWidth="2" />
          </svg>

          {COURT_ZONES.map((zone) => {
            const dominator = getDominator(zone.id);
            const isHovered = hoveredZone === zone.id;
            
            const leftVal = parseInt(zone.left);
            let tooltipAnchor = "left-1/2 -translate-x-1/2";
            if (leftVal <= 20) tooltipAnchor = "left-[-20px]";
            else if (leftVal >= 80) tooltipAnchor = "right-[-20px]";

            const s1 = p1ZoneStats[zone.id];
            const s2 = p2ZoneStats[zone.id];
            const totalAttempts = (s1?.attempts || 0) + (s2?.attempts || 0);
            const totalMakes = (s1?.makes || 0) + (s2?.makes || 0);
            const combinedPct = totalAttempts > 0 ? (totalMakes / totalAttempts) * 100 : 0;
            
            const isColdZone = totalAttempts > 0 && (totalMakes === 0 || (combinedPct <= 20 && totalAttempts >= 3));

            return (
              <div 
                key={zone.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${isHovered ? 'z-[150]' : 'z-10'}`}
                style={{ top: zone.top, left: zone.left }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {dominator ? (
                  <div className="relative group cursor-pointer flex flex-col items-center">
                    <div 
                      className={`absolute inset-0 rounded-full blur-md transition-all duration-300 ${isHovered ? 'scale-[2.5] opacity-60' : 'scale-[1.8] opacity-30'}`}
                      style={{ backgroundColor: dominator.winner.color }}
                    />
                    
                    <Avatar 
                      className={`relative border-2 shadow-[0_0_15px_rgba(0,0,0,0.9)] transition-all duration-300 ${isHovered ? 'h-16 w-16 scale-110' : 'h-12 w-12 scale-100 hover:scale-105'}`}
                      style={{ borderColor: dominator.winner.color }}
                    >
                      <AvatarImage src={dominator.winner.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-[#0a0f18] text-[9px] font-bold text-white">
                        {dominator.winner.name.substring(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {!isHovered && (
                      <div className="absolute -bottom-5 bg-black/80 rounded px-1.5 border border-white/10 z-[30]">
                        <span className="text-[9px] font-mono font-bold text-white">{dominator.winStats.pct.toFixed(0)}%</span>
                      </div>
                    )}

                    <AnimatePresence>
                      {isHovered && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`absolute bottom-[calc(100%+10px)] ${tooltipAnchor} w-max min-w-[200px] max-w-[280px] bg-[#0a0f18]/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] pointer-events-none z-[200]`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 text-center mb-3 border-b border-white/10 pb-2 truncate">{zone.label}</p>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm gap-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold truncate" style={{ color: dominator.winner.color }}>
                                  {dominator.winner.name}
                                </span>
                                {dominator.isVolumeWin && (
                                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/10 text-white/70 tracking-widest border border-white/5" title="Domina por volumen de intentos" >VOL ADJ</span>
                                )}
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="font-mono font-black text-white">{dominator.winStats.pct.toFixed(1)}%</span>
                                <span className="text-[8px] font-mono text-white/40">{dominator.winStats.makes}/{dominator.winStats.attempts}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm gap-4 opacity-60">
                              <span className="truncate text-white">{dominator.loser.name}</span>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="font-mono font-bold text-white">{dominator.loseStats.pct.toFixed(1)}%</span>
                                <span className="text-[8px] font-mono text-white/40">{dominator.loseStats.makes}/{dominator.loseStats.attempts}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="relative group flex flex-col items-center">
                    <div 
                      className={`h-7 w-7 rounded-full border flex items-center justify-center backdrop-blur-sm cursor-help transition-transform hover:scale-125 z-10 
                      ${isColdZone ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`} 
                    >
                      {isColdZone ? <Snowflake size={14} /> : <CircleDashed size={14} />}
                    </div>
                    
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`absolute bottom-[calc(100%+10px)] ${tooltipAnchor} w-max min-w-[200px] bg-[#0a0f18]/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] pointer-events-none z-[200]`}
                        >
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-center mb-3 border-b border-white/10 pb-2 truncate ${isColdZone ? 'text-blue-400' : 'text-white/40'}`}>
                            {zone.label}
                          </p>
                          <p className="text-xs text-white/80 text-center font-medium mb-3">
                            {isColdZone ? "Cold Zone (Bricks)" : "Uncharted Territory"}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs opacity-60">
                              <span className="truncate pr-2 text-white">{player1.name}</span>
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-white/80">{s1.pct.toFixed(1)}%</span>
                                <span className="text-[8px] font-mono text-white/50">{s1.makes}/{s1.attempts}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-xs opacity-60">
                              <span className="truncate pr-2 text-white">{player2.name}</span>
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-white/80">{s2.pct.toFixed(1)}%</span>
                                <span className="text-[8px] font-mono text-white/50">{s2.makes}/{s2.attempts}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-8 border-t border-white/5 pt-6 w-full justify-center relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ backgroundColor: player1.color }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{player1.name.split(" ").pop()} Domain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ backgroundColor: player2.color }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{player2.name.split(" ").pop()} Domain</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
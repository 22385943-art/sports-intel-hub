import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PolarRadiusAxis
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Flame, Target, Shield,
  Activity, Zap, Brain, Crown, ShieldAlert, Crosshair, TrendingUp, BarChart3, Crosshair as CrosshairIcon, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ShootingComparison, RawShot } from "@/components/ShootingComparison";

const TEAM_COLORS: Record<string, string> = {
  "ATL": "#E03A3E", "BOS": "#007A33", "BKN": "#FFFFFF", "CHA": "#00788C", 
  "CHI": "#CE1141", "CLE": "#860038", "DAL": "#00A3E0", 
  "DEN": "#FEC524", "DET": "#C8102E", "GSW": "#1D428A", "HOU": "#CE1141", 
  "IND": "#FDBB30", "LAC": "#C8102E", "LAL": "#FDB927", "MEM": "#7399C6", 
  "MIA": "#98002E", "MIL": "#00471B", "MIN": "#78BE20", 
  "NOP": "#85714D", "NYK": "#F58426", "OKC": "#007AC1", "ORL": "#0077C0", 
  "PHI": "#006BB6", "PHX": "#E56020", "POR": "#E03A3E", "SAC": "#5A2D81", 
  "SAS": "#C4CED4", "TOR": "#CE1141", "UTA": "#F9A01B", "WAS": "#E31837"  
};

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.length === 3 ? cleanHex.slice(0, 1).repeat(2) : cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.length === 3 ? cleanHex.slice(1, 2).repeat(2) : cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.length === 3 ? cleanHex.slice(2, 3).repeat(2) : cleanHex.slice(4, 6), 16);
  return { r, g, b };
};

const hexToRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const areColorsTooSimilar = (hex1: string, hex2: string) => {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
  return distance < 80; 
};

const normalizeStr = (s: string) => {
    if (!s) return "";
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const getMultiplier = (p: any, mode: string) => {
    if (mode === 'Per Game' || !p || !p.stats || !p.adv) return 1;
    if (mode === 'Per 36 Min') return p.stats.mpg > 0 ? 36 / p.stats.mpg : 1;
    if (mode === 'Per 75') {
        const pace = p.adv.pace || 100;
        const possPerGame = (p.stats.mpg / 48) * pace;
        return possPerGame > 0 ? 75 / possPerGame : 1;
    }
    return 1;
};

const getClutchMultiplier = (clutchData: any, pace: number, mode: string) => {
  if (!clutchData || clutchData.min === 0) return 0;
  if (mode === 'Per Game') return 1 / (clutchData.gp || 1);
  if (mode === 'Per 36 Min') return 36 / clutchData.min;
  if (mode === 'Per 75') {
      const estimatedPoss = (clutchData.min / 48) * pace;
      return estimatedPoss > 0 ? 75 / estimatedPoss : 1;
  }
  return 1;
};

const getArchetype = (p: any) => {
  if (!p || !p.stats || !p.adv) return { label: "Unknown", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
  const { ppg, rpg, apg, bpg, spg, threePct, fgPct, fta } = p.stats;
  const { usg, defRating, astPct, ts, pie } = p.adv;

  const isHighVolume = usg >= 27;
  const isEfficient = ts >= 60;
  const isEliteDefender = defRating > 0 && defRating <= 111; 
  const isShooter = threePct >= 37.0 && ppg >= 8; 
  const isSlasher = fta >= 5.5 && fgPct >= 50 && threePct <= 34;
  const isUnicorn = bpg >= 2.0 && threePct >= 31 && rpg >= 8;

  if (pie >= 16 && ppg >= 23) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
    if (apg >= 8) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isShooter && isEfficient) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  }
  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  if (apg >= 8 || astPct >= 35) return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  if (rpg >= 8.5) {
     if (threePct >= 35) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
     if ((bpg >= 1.5 || isEliteDefender) && threePct <= 30) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" };
     if (apg >= 4.5) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
     return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  }
  if (isSlasher && ppg >= 18) return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  if (isShooter && ppg >= 18) {
     if (isHighVolume) return { label: "Shot Creator", icon: Zap, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" };
     return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  }
  if (isShooter && isEliteDefender && usg < 22) return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  if (isEliteDefender && (spg >= 1.4 || bpg >= 1.0) && usg < 18) return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/30" };
  if (isShooter && usg < 20) return { label: "Catch & Shoot", icon: Crosshair, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
  if (ppg >= 14 && isHighVolume && !isEfficient) return { label: "Microwave Scorer", icon: Zap, color: "text-orange-400 bg-orange-400/10 border-orange-400/30" };
  if (ppg >= 10 && rpg >= 4 && apg >= 3) return { label: "Connective Glue", icon: Activity, color: "text-blue-300 bg-blue-300/10 border-blue-300/30" };

  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
};

const mapPlayerToShootingProfile = (p: any, color: string, rawShots: any[]) => {
  if (!p) return undefined;
  const mappedShots: RawShot[] = (rawShots || []).map(s => ({
    locX: s.x,
    locY: s.y,
    shotMade: s.made,
    shotDistance: Math.sqrt(s.x * s.x + s.y * s.y)
  }));

  return {
    id: p.id, name: p.name, imageUrl: p.imageUrl, color: color,
    trueShooting: p.adv?.ts || 0, effectiveFG: p.adv?.efg || p.stats?.fgPct || 0,
    shots: mappedShots
  };
};

const OnOffBar = ({ player, onOff, color }: { player: any, onOff: number | null, color: string }) => {
  if (onOff === null) return <div className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] text-center py-4">Awaiting Server Response</div>;
  const isPositive = onOff >= 0;
  const width = Math.min(50, Math.abs(onOff) * 2.5); 
  return (
      <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end px-2">
              <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-white/10"><AvatarImage src={player.imageUrl} /><AvatarFallback>{player.name[0]}</AvatarFallback></Avatar>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">{player.name.split(" ").pop()}</span>
              </div>
              <span className="text-xl font-mono font-black" style={{ color: isPositive ? '#10b981' : '#f43f5e', textShadow: `0 0 10px ${isPositive ? '#10b98180' : '#f43f5e80'}` }}>
                  {isPositive ? '+' : ''}{onOff.toFixed(1)}
              </span>
          </div>
          <div className="h-4 w-full bg-[#030712] rounded-full relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-10" />
              <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full absolute"
                  style={{ 
                      background: isPositive ? `linear-gradient(90deg, transparent, ${color})` : `linear-gradient(-90deg, transparent, #f43f5e)`,
                      left: isPositive ? '50%' : 'auto',
                      right: isPositive ? 'auto' : '50%'
                  }}
              />
          </div>
      </div>
  );
};

const ClutchMiniStat = ({ label, v1, v2, c1, c2, isPct = false }: any) => {
  const win = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
  const format = (v: number) => isPct ? `${v.toFixed(1)}%` : v.toFixed(1);
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors group">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 group-hover:text-white/80 transition-colors">{label}</span>
      <div className="flex items-center gap-6 w-full justify-center">
        <span className="font-mono font-black text-lg" style={{ color: win === 1 ? c1 : '#555', textShadow: win === 1 ? `0 0 10px ${c1}80` : 'none' }}>{v1 !== undefined ? format(v1) : '-'}</span>
        <div className="w-px h-5 bg-white/10" />
        <span className="font-mono font-black text-lg" style={{ color: win === 2 ? c2 : '#555', textShadow: win === 2 ? `0 0 10px ${c2}80` : 'none' }}>{v2 !== undefined ? format(v2) : '-'}</span>
      </div>
    </div>
  );
}

const PlayerCombobox = ({
  value, onChange, season, onSeasonChange, themeColor
}: {
  value: string; onChange: (id: string, playerObj: any) => void; 
  season: string; onSeasonChange: (s: string) => void;
  themeColor: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isError, setIsError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const generateSeasons = () => {
      const seasons = [];
      for (let i = 2025; i >= 1946; i--) { 
          const shortYear = String(i + 1).slice(2).padStart(2, '0');
          seasons.push(`${i}-${shortYear}`); 
      }
      return seasons;
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPlayers(true);
    setIsError(false);
    
    nbaService.fetchAllOfficialPlayers(season)
      .then(fetched => {
        if (!isMounted) return;
        if (!fetched || fetched.length === 0) {
            setIsError(true);
        } else {
            setPlayers(fetched);
            if (value) {
                const playerInNewSeason = fetched.find(p => p.id === value);
                if (playerInNewSeason) {
                    onChange(value, { ...playerInNewSeason, archetype: getArchetype(playerInNewSeason) });
                } else {
                    onChange("", null);
                }
            }
        }
        setIsLoadingPlayers(false);
      })
      .catch(() => {
         if(isMounted) { setIsError(true); setIsLoadingPlayers(false); }
      });
      
    return () => { isMounted = false; };
  }, [season]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value ? players.find(p => p.id === value) : null;
  const filtered = players.filter(p => normalizeStr(p.name).includes(normalizeStr(search)));
  const tColor = themeColor || "#38bdf8";

  return (
    <div className="relative w-full z-50 flex flex-col md:flex-row gap-3" ref={ref}>
      <div className="relative flex-1">
          <button
            onClick={() => setOpen(!open)}
            className={`w-full bg-white/[0.02] backdrop-blur-3xl border h-16 rounded-[1.25rem] px-6 flex items-center justify-between transition-all duration-500`}
            style={{ borderColor: hexToRgba(tColor, 0.4), boxShadow: open ? `0 0 40px ${hexToRgba(tColor, 0.25)}` : `0 0 20px ${hexToRgba(tColor, 0.1)}`, color: tColor }}
          >
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tColor, boxShadow: `0 0 8px ${tColor}` }} />
              <span className={`font-black text-lg tracking-tight ${selected ? "text-foreground" : "text-muted-foreground"}`}>{selected ? selected.name : "Select NBA Player..."}</span>
            </div>
            {isLoadingPlayers ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: tColor }} /> : <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-500 ${open ? "rotate-180" : ""}`} />}
          </button>
          
          <AnimatePresence>
            {open && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-full mt-3 w-full bg-[#050914]/95 backdrop-blur-3xl border border-white/[0.1] rounded-[1.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,1)] overflow-hidden z-[100]"
              >
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                  <Search className="h-5 w-5 text-slate-500" />
                  <input autoFocus placeholder={`Search terminal for ${season}...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-foreground text-sm font-bold placeholder:text-slate-600 focus:outline-none" />
                </div>
                
                <div className="max-h-[350px] overflow-y-auto scrollbar-premium">
                  {isLoadingPlayers ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Loader2 className="animate-spin w-8 h-8" style={{ color: tColor }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-mono text-center px-4">Decrypting Archives</span>
                    </div>
                  ) : isError ? (
                    <div className="text-center py-12 flex flex-col items-center gap-3">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-mono">Proxy Rate Limit / No Data</span>
                        <button onClick={() => onSeasonChange(season)} className="text-[10px] uppercase font-black tracking-widest px-4 py-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors border border-white/10">Retry Connection</button>
                    </div>
                  ) : (
                    filtered.map((p, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        key={p.id} onClick={() => { onChange(p.id, p); setOpen(false); setSearch(""); }}
                        className="p-4 flex items-center gap-4 cursor-pointer transition-colors duration-200 mx-2 my-1 rounded-xl border-l-2 border-transparent"
                        style={{ backgroundColor: value === p.id ? hexToRgba(tColor, 0.1) : 'transparent', borderLeftColor: value === p.id ? tColor : 'transparent' }}
                      >
                        <Avatar className="h-11 w-11 border border-white/[0.1] bg-[#030712] shadow-lg">
                          <AvatarImage src={p.imageUrl} className="object-cover" />
                          <AvatarFallback className="bg-card text-xs text-muted-foreground font-mono font-black">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-black tracking-tight text-foreground">{p.name}</span>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] font-mono">{p.teamId}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      <select 
          value={season} 
          onChange={(e) => { onSeasonChange(e.target.value); setOpen(true); }} 
          className="w-full md:w-40 bg-white/[0.02] backdrop-blur-3xl border h-16 rounded-[1.25rem] px-5 text-xs font-mono font-black outline-none cursor-pointer transition-colors duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] appearance-none"
          style={{ borderColor: hexToRgba(tColor, 0.4), color: tColor }}
      >
          {generateSeasons().map(s => <option key={s} value={s} className="bg-[#050914] text-foreground font-mono">{s}</option>)}
      </select>
    </div>
  );
};

// 🚀 HIGH-DENSITY TUGBAR (Puro RAW Value)
const TugBar = ({ label, v1, v2, c1, c2, reverse = false, showPlus = false }: { label: string; v1: number | undefined; v2: number | undefined; c1: string; c2: string; reverse?: boolean; showPlus?: boolean }) => {
  const safeV1 = Number(v1) || 0;
  const safeV2 = Number(v2) || 0;

  const minVal = Math.min(0, safeV1, safeV2);
  const shiftedV1 = safeV1 - minVal;
  const shiftedV2 = safeV2 - minVal;
  const total = shiftedV1 + shiftedV2 || 1;
  
  const p1Pct = (shiftedV1 / total) * 100;
  const p2Pct = (shiftedV2 / total) * 100;
  
  let winner = "tie";
  if (reverse) winner = safeV1 < safeV2 ? "p1" : safeV2 < safeV1 ? "p2" : "tie";
  else winner = safeV1 > safeV2 ? "p1" : safeV2 > safeV1 ? "p2" : "tie";

  const delta = Math.abs(safeV1 - safeV2).toFixed(1);
  const deltaSign = reverse ? "-" : "+";
  const formatVal = (v: number) => showPlus && v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);

  return (
    <div className="group py-2 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-300 px-3 relative overflow-hidden">
      <div className="relative z-10 flex items-end justify-between w-full pb-1.5">
        
        <div className="absolute left-1/2 bottom-1.5 -translate-x-1/2 text-center pointer-events-none">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50 group-hover:text-white/90 transition-colors font-mono">
            {label}
          </span>
        </div>

        <div className="flex items-center justify-start w-1/3">
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`text-xl font-black font-mono tracking-tighter flex items-center ${winner === "p1" ? "text-white" : "text-white/40"}`}
            style={winner === "p1" ? { color: c1, textShadow: `0 0 12px ${hexToRgba(c1, 0.5)}` } : {}}
          >
            {formatVal(safeV1)}
            {winner === "p1" && (safeV1 !== safeV2) && <span className="text-[9px] font-bold tracking-widest text-emerald-400 ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]">({deltaSign}{delta})</span>}
          </motion.span>
        </div>

        <div className="flex items-center justify-end w-1/3 text-right">
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`text-xl font-black font-mono tracking-tighter flex items-center justify-end ${winner === "p2" ? "text-white" : "text-white/40"}`}
            style={winner === "p2" ? { color: c2, textShadow: `0 0 12px ${hexToRgba(c2, 0.5)}` } : {}}
          >
            {winner === "p2" && (safeV2 !== safeV1) && <span className="text-[9px] font-bold tracking-widest text-emerald-400 mr-2 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]">({deltaSign}{delta})</span>}
            {formatVal(safeV2)}
          </motion.span>
        </div>
      </div>

      <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-[#030712] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-white/[0.03]">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${p1Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="absolute left-0 top-0 h-full rounded-l-full"
          style={{ background: winner === "p1" ? `linear-gradient(90deg, ${hexToRgba(c1, 0.2)}, ${c1})` : "linear-gradient(90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))", boxShadow: winner === "p1" ? `0 0 10px ${hexToRgba(c1, 0.5)}` : "none" }}
        />
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${p2Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="absolute right-0 top-0 h-full rounded-r-full"
          style={{ background: winner === "p2" ? `linear-gradient(-90deg, ${hexToRgba(c2, 0.2)}, ${c2})` : "linear-gradient(-90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))", boxShadow: winner === "p2" ? `0 0 10px ${hexToRgba(c2, 0.5)}` : "none" }}
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-[#050914] z-10" />
      </div>
    </div>
  );
};

export default function ComparePlayers() {
  const [isLoading, setIsLoading] = useState(true);
  const [isShootingLoading, setIsShootingLoading] = useState(false);
  const [isClutchLoading, setIsClutchLoading] = useState(false);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"overall" | "offense" | "defense" | "advanced" | "clutch" | "shooting">("overall");
  const [perMode, setPerMode] = useState<"Per Game" | "Per 75" | "Per 36 Min">("Per Game");

  const [p1Id, setP1Id] = useState("203999");
  const [p1Season, setP1Season] = useState("2025-26");
  const [p1Data, setP1Data] = useState<any>(null);
  const [p1RawShots, setP1RawShots] = useState<any[]>([]);
  const [p1Clutch, setP1Clutch] = useState<any>(null);
  const [p1OnOff, setP1OnOff] = useState<number | null>(null);

  const [p2Id, setP2Id] = useState("1629029");
  const [p2Season, setP2Season] = useState("2025-26");
  const [p2Data, setP2Data] = useState<any>(null);
  const [p2RawShots, setP2RawShots] = useState<any[]>([]);
  const [p2Clutch, setP2Clutch] = useState<any>(null);
  const [p2OnOff, setP2OnOff] = useState<number | null>(null);

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers("2025-26").then(players => {
      const jokic = players.find(p => p.id === "203999") || players[0];
      const luka = players.find(p => p.id === "1629029") || players[1];
      setP1Data({ ...jokic, archetype: getArchetype(jokic) });
      setP2Data({ ...luka, archetype: getArchetype(luka) });
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "advanced" && p1Data && p2Data) {
      setIsAdvancedLoading(true);
      const fetchOnOff = async () => {
        try {
          const [onOff1, onOff2] = await Promise.all([
             nbaService.fetchPlayerOnOff(p1Id, p1Data.teamId, p1Season, p1Data),
             nbaService.fetchPlayerOnOff(p2Id, p2Data.teamId, p2Season, p2Data)
          ]);
          setP1OnOff(onOff1);
          setP2OnOff(onOff2);
          setIsAdvancedLoading(false);
        } catch(e) {
          setIsAdvancedLoading(false);
        }
      };
      fetchOnOff();
    }
  }, [activeTab, p1Id, p2Id, p1Season, p2Season, p1Data, p2Data]);

  useEffect(() => {
    if (activeTab === "clutch" && p1Data && p2Data) {
      setIsClutchLoading(true);
      const fetchClutch = async () => {
        try {
          const c1 = await nbaService.fetchAwardAuxData(p1Season);
          setP1Clutch(c1.clutchStats?.get(String(p1Id)) || null);
          if (p1Season === p2Season) {
             setP2Clutch(c1.clutchStats?.get(String(p2Id)) || null);
          } else {
             const c2 = await nbaService.fetchAwardAuxData(p2Season);
             setP2Clutch(c2.clutchStats?.get(String(p2Id)) || null);
          }
          setIsClutchLoading(false);
        } catch(e) {
          setIsClutchLoading(false);
        }
      };
      fetchClutch();
    }
  }, [activeTab, p1Id, p2Id, p1Season, p2Season, p1Data, p2Data]);

  useEffect(() => {
    if (activeTab === "shooting") {
      setIsShootingLoading(true);
      Promise.all([
        nbaService.getPlayerShotChart(p1Id, p1Season),
        nbaService.getPlayerShotChart(p2Id, p2Season)
      ]).then(([shots1, shots2]) => {
        setP1RawShots(shots1 || []);
        setP2RawShots(shots2 || []);
        setIsShootingLoading(false);
      }).catch(err => {
        setIsShootingLoading(false);
      });
    }
  }, [p1Id, p2Id, p1Season, p2Season, activeTab]);

  const p1 = p1Data;
  const p2 = p2Data;

  let color1 = p1 ? (TEAM_COLORS[p1.teamId] || "#22d3ee") : "#22d3ee";
  let color2 = p2 ? (TEAM_COLORS[p2.teamId] || "#f43f5e") : "#f43f5e";
  if (areColorsTooSimilar(color1, color2)) {
    color2 = areColorsTooSimilar(color1, "#22d3ee") ? "#f43f5e" : "#22d3ee"; 
  }

  const p1NameYear = p1 ? `${p1.name} '${p1Season.substring(2,4)}` : "";
  const p2NameYear = p2 ? `${p2.name} '${p2Season.substring(2,4)}` : "";

  const similarityScore = useMemo(() => {
    if (!p1 || !p2 || !p1.stats || !p2.stats) return null;
    const getVector = (p: any) => [
        (p.stats.rpg / (p.stats.mpg || 1)) * 10,
        (p.stats.apg / (p.stats.mpg || 1)) * 10,
        (p.stats.bpg / (p.stats.mpg || 1)) * 10,
        (p.stats.fg3a / (p.stats.fga || 1)) * 10,
        (p.stats.fta / (p.stats.fga || 1)) * 10,
        (p.adv?.usg || 20) / 10
    ];
    const v1 = getVector(p1);
    const v2 = getVector(p2);
    let dot = 0; let norm1 = 0; let norm2 = 0;
    for (let i = 0; i < v1.length; i++) {
        dot += v1[i] * v2[i];
        norm1 += v1[i] * v1[i];
        norm2 += v2[i] * v2[i];
    }
    if (norm1 === 0 || norm2 === 0) return 0;
    const cosSim = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    const matchPct = Math.round(Math.pow(Math.max(0, cosSim), 6) * 100);
    return Math.max(0, Math.min(100, matchPct));
  }, [p1, p2]);

  const radarData = useMemo(() => {
    if (!p1 || !p2) return [];

    if (activeTab === "clutch" && p1Clutch && p2Clutch) {
        return [
            { stat: "Scoring", p1: p1Clutch.percentiles?.Scoring ?? 50, p2: p2Clutch.percentiles?.Scoring ?? 50 },
            { stat: "Playmaking", p1: p1Clutch.percentiles?.Playmaking ?? 50, p2: p2Clutch.percentiles?.Playmaking ?? 50 },
            { stat: "Efficiency", p1: p1Clutch.percentiles?.Efficiency ?? 50, p2: p2Clutch.percentiles?.Efficiency ?? 50 },
            { stat: "Defense", p1: p1Clutch.percentiles?.Defense ?? 50, p2: p2Clutch.percentiles?.Defense ?? 50 },
            { stat: "Impact", p1: p1Clutch.percentiles?.Impact ?? 50, p2: p2Clutch.percentiles?.Impact ?? 50 },
            { stat: "Rebounding", p1: p1Clutch.percentiles?.Rebounding ?? 50, p2: p2Clutch.percentiles?.Rebounding ?? 50 },
        ];
    }
    
    if (activeTab === "offense") return [{ stat: "Scoring", p1: p1.percentiles?.Scoring ?? 50, p2: p2.percentiles?.Scoring ?? 50 }, { stat: "Playmaking", p1: p1.percentiles?.Playmaking ?? 50, p2: p2.percentiles?.Playmaking ?? 50 }, { stat: "Off Rtg", p1: p1.percentiles?.OffRtg ?? 50, p2: p2.percentiles?.OffRtg ?? 50 }, { stat: "Off Reb", p1: p1.percentiles?.OReb ?? 50, p2: p2.percentiles?.OReb ?? 50 }, { stat: "Ast %", p1: p1.percentiles?.AstPct ?? 50, p2: p2.percentiles?.AstPct ?? 50 }, { stat: "Efficiency", p1: p1.percentiles?.Efficiency ?? 50, p2: p2.percentiles?.Efficiency ?? 50 }];
    if (activeTab === "defense") return [{ stat: "Impact", p1: p1.percentiles?.Defense ?? 50, p2: p2.percentiles?.Defense ?? 50 }, { stat: "Def Rtg", p1: p1.percentiles?.DefRtg ?? 50, p2: p2.percentiles?.DefRtg ?? 50 }, { stat: "Def Reb", p1: p1.percentiles?.DReb ?? 50, p2: p2.percentiles?.DReb ?? 50 }, { stat: "Contested", p1: p1.percentiles?.Contested ?? 50, p2: p2.percentiles?.Contested ?? 50 }, { stat: "Contest 3s", p1: p1.percentiles?.Contested3 ?? 50, p2: p2.percentiles?.Contested3 ?? 50 }, { stat: "Deflections", p1: p1.percentiles?.Deflections ?? 50, p2: p2.percentiles?.Deflections ?? 50 }];
    if (activeTab === "advanced") return [{ stat: "SI+", p1: p1.percentiles?.SI ?? 50, p2: p2.percentiles?.SI ?? 50 }, { stat: "PER", p1: p1.percentiles?.PER ?? 50, p2: p2.percentiles?.PER ?? 50 }, { stat: "VORP", p1: p1.percentiles?.VORP ?? 50, p2: p2.percentiles?.VORP ?? 50 }, { stat: "BPM", p1: p1.percentiles?.Impact ?? 50, p2: p2.percentiles?.Impact ?? 50 }, { stat: "PIE", p1: p1.percentiles?.PIE ?? 50, p2: p2.percentiles?.PIE ?? 50 }, { stat: "Net Rtg", p1: p1.percentiles?.NetRtg ?? 50, p2: p2.percentiles?.NetRtg ?? 50 }];
    
    return [{ stat: "Scoring", p1: p1.percentiles?.Scoring ?? 50, p2: p2.percentiles?.Scoring ?? 50 }, { stat: "Playmaking", p1: p1.percentiles?.Playmaking ?? 50, p2: p2.percentiles?.Playmaking ?? 50 }, { stat: "Efficiency", p1: p1.percentiles?.Efficiency ?? 50, p2: p2.percentiles?.Efficiency ?? 50 }, { stat: "Defense", p1: p1.percentiles?.Defense ?? 50, p2: p2.percentiles?.Defense ?? 50 }, { stat: "Impact", p1: p1.percentiles?.Impact ?? 50, p2: p2.percentiles?.Impact ?? 50 }, { stat: "Rebounding", p1: p1.percentiles?.Rebounding ?? 50, p2: p2.percentiles?.Rebounding ?? 50 }];
  }, [p1, p2, activeTab, p1Clutch, p2Clutch]);

  const statBars = useMemo(() => {
    if (!p1 || !p2) return [];

    if (activeTab === "clutch") {
        if (!p1Clutch || !p2Clutch) return [];
        const c1Mult = getClutchMultiplier(p1Clutch, p1?.adv?.pace || 100, perMode);
        const c2Mult = getClutchMultiplier(p2Clutch, p2?.adv?.pace || 100, perMode);
        
        return [
            { label: "CLUTCH PTS", v1: p1Clutch.pts * c1Mult, v2: p2Clutch.pts * c2Mult },
            { label: "TRUE SHOOTING", v1: p1Clutch.ts, v2: p2Clutch.ts },
            { label: "CLUTCH AST", v1: p1Clutch.ast * c1Mult, v2: p2Clutch.ast * c2Mult },
            { label: "CLUTCH REB", v1: p1Clutch.reb * c1Mult, v2: p2Clutch.reb * c2Mult },
            { label: "CLUTCH STL", v1: p1Clutch.stl * c1Mult, v2: p2Clutch.stl * c2Mult },
            { label: "CLUTCH BLK", v1: p1Clutch.blk * c1Mult, v2: p2Clutch.blk * c2Mult },
            { label: "NET IMPACT", v1: p1Clutch.plusMinus * c1Mult, v2: p2Clutch.plusMinus * c2Mult, showPlus: true },
            { label: "CLUTCH OREB", v1: p1Clutch.oreb * c1Mult, v2: p2Clutch.oreb * c2Mult },
            { label: "FG%", v1: p1Clutch.fgPct, v2: p2Clutch.fgPct },
            { label: "3P%", v1: p1Clutch.fg3Pct, v2: p2Clutch.fg3Pct },
            { label: "FT%", v1: p1Clutch.ftPct, v2: p2Clutch.ftPct },
            { label: "TURNOVERS", v1: p1Clutch.tov * c1Mult, v2: p2Clutch.tov * c2Mult, reverse: true },
        ];
    }

    const mult1 = getMultiplier(p1, perMode);
    const mult2 = getMultiplier(p2, perMode);
    const getVal = (p: any, val: number | undefined, isCount: boolean, mult: number) => { if (val === undefined || val === null) return 0; return isCount ? val * mult : val; };
    
    if (activeTab === "offense") return [{ label: "PTS", v1: getVal(p1, p1.stats?.ppg, true, mult1), v2: getVal(p2, p2.stats?.ppg, true, mult2) }, { label: "AST", v1: getVal(p1, p1.stats?.apg, true, mult1), v2: getVal(p2, p2.stats?.apg, true, mult2) }, { label: "OREB", v1: getVal(p1, p1.stats?.oreb, true, mult1), v2: getVal(p2, p2.stats?.oreb, true, mult2) }, { label: "AST %", v1: p1.adv?.astPct, v2: p2.adv?.astPct }, { label: "AST RATIO", v1: p1.playmaking?.astRatio, v2: p2.playmaking?.astRatio }, { label: "AST/TO", v1: p1.playmaking?.astTo, v2: p2.playmaking?.astTo }, { label: "OFF RTG", v1: p1.adv?.offRtg, v2: p2.adv?.offRtg }, { label: "TS%", v1: p1.adv?.ts, v2: p2.adv?.ts }, { label: "rTS%", v1: p1.adv?.rTS, v2: p2.adv?.rTS, showPlus: true }, { label: "3PA", v1: getVal(p1, p1.stats?.fg3a, true, mult1), v2: getVal(p2, p2.stats?.fg3a, true, mult2) }, { label: "3P%", v1: p1.stats?.threePct, v2: p2.stats?.threePct }, { label: "FTA", v1: getVal(p1, p1.stats?.fta, true, mult1), v2: getVal(p2, p2.stats?.fta, true, mult2) }, { label: "FT%", v1: p1.stats?.ftPct, v2: p2.stats?.ftPct }];
    if (activeTab === "defense") return [{ label: "DREB", v1: getVal(p1, p1.stats?.dreb, true, mult1), v2: getVal(p2, p2.stats?.dreb, true, mult2) }, { label: "STL", v1: getVal(p1, p1.stats?.spg, true, mult1), v2: getVal(p2, p2.stats?.spg, true, mult2) }, { label: "BLK", v1: getVal(p1, p1.stats?.bpg, true, mult1), v2: getVal(p2, p2.stats?.bpg, true, mult2) }, { label: "CONTESTED", v1: getVal(p1, p1.hustle?.contestedShots, true, mult1), v2: getVal(p2, p2.hustle?.contestedShots, true, mult2) }, { label: "CONTEST 3", v1: getVal(p1, p1.hustle?.contested3pt, true, mult1), v2: getVal(p2, p2.hustle?.contested3pt, true, mult2) }, { label: "DEFLECTS", v1: getVal(p1, p1.hustle?.deflections, true, mult1), v2: getVal(p2, p2.hustle?.deflections, true, mult2) }, { label: "DEF RTG", v1: p1.adv?.defRating, v2: p2.adv?.defRating, reverse: true }];
    if (activeTab === "advanced") return [{ label: "SI+", v1: p1.adv?.si, v2: p2.adv?.si }, { label: "PER", v1: p1.adv?.per, v2: p2.adv?.per }, { label: "BPM", v1: p1.adv?.bpm, v2: p2.adv?.bpm, showPlus: true }, { label: "VORP", v1: p1.adv?.vorp, v2: p2.adv?.vorp }, { label: "PIE", v1: p1.adv?.pie, v2: p2.adv?.pie }, { label: "NET RTG", v1: p1.adv?.net, v2: p2.adv?.net, showPlus: true }, { label: "USG%", v1: p1.adv?.usg, v2: p2.adv?.usg }, { label: "TS%", v1: p1.adv?.ts, v2: p2.adv?.ts }, { label: "AST%", v1: p1.adv?.astPct, v2: p2.adv?.astPct }, { label: "eFG%", v1: p1.adv?.efg, v2: p2.adv?.efg }];
    
    return [{ label: "PPG", v1: getVal(p1, p1.stats?.ppg, true, mult1), v2: getVal(p2, p2.stats?.ppg, true, mult2) }, { label: "RPG", v1: getVal(p1, p1.stats?.rpg, true, mult1), v2: getVal(p2, p2.stats?.rpg, true, mult2) }, { label: "APG", v1: getVal(p1, p1.stats?.apg, true, mult1), v2: getVal(p2, p2.stats?.apg, true, mult2) }, { label: "SPG", v1: getVal(p1, p1.stats?.spg, true, mult1), v2: getVal(p2, p2.stats?.spg, true, mult2) }, { label: "BPG", v1: getVal(p1, p1.stats?.bpg, true, mult1), v2: getVal(p2, p2.stats?.bpg, true, mult2) }, { label: "TS%", v1: p1.adv?.ts, v2: p2.adv?.ts }, { label: "rTS%", v1: p1.adv?.rTS, v2: p2.adv?.rTS, showPlus: true }, { label: "NET RTG", v1: p1.adv?.net, v2: p2.adv?.net, showPlus: true }, { label: "TOV", v1: getVal(p1, p1.stats?.topg, true, mult1), v2: getVal(p2, p2.stats?.topg, true, mult2), reverse: true }];
  }, [p1, p2, activeTab, perMode, p1Clutch, p2Clutch]);

  const dominanceScore = useMemo(() => {
    let p1Wins = 0; let p2Wins = 0;
    statBars.forEach(s => {
      const v1 = Number(s.v1) || 0; const v2 = Number(s.v2) || 0;
      if (s.reverse) {
          if (v1 < v2) p1Wins++; else if (v2 < v1) p2Wins++;
      } else {
          if (v1 > v2) p1Wins++; else if (v2 > v1) p2Wins++;
      }
    });
    return { p1Wins, p2Wins };
  }, [statBars]);

  const aiVerdict = useMemo(() => {
    if (!p1 || !p2) return null;
    
    if (activeTab === "offense") {
      const ppgWinner = (p1.stats?.ppg || 0) > (p2.stats?.ppg || 0) ? p1 : p2;
      const apgWinner = (p1.stats?.apg || 0) > (p2.stats?.apg || 0) ? p1 : p2;
      const offRtgWinner = (p1.adv?.offRtg || 0) > (p2.adv?.offRtg || 0) ? p1 : p2;
      return (
        <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
          In strictly offensive terms, <span className="text-white font-bold">{ppgWinner.name}</span> carries the primary scoring load <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(p1.stats?.ppg || 0, p2.stats?.ppg || 0).toFixed(1)} PPG)</span>. However, flow and advantage creation favor <span className="text-white font-bold">{apgWinner.name}</span>. On a systemic level, the individual Offensive Rating highlights <span className="text-white font-bold">{offRtgWinner.name}</span>'s influence <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">({Math.max(p1.adv?.offRtg || 0, p2.adv?.offRtg || 0).toFixed(1)} ORtg)</span> on the floor.
        </p>
      );
    }
    if (activeTab === "defense") {
      const defRtgWinner = (p1.adv?.defRating || 115) < (p2.adv?.defRating || 115) ? p1 : p2;
      const stocks1 = (p1.stats?.spg || 0) + (p1.stats?.bpg || 0); const stocks2 = (p2.stats?.spg || 0) + (p2.stats?.bpg || 0);
      const stocksWinner = stocks1 > stocks2 ? p1 : p2;
      return (
        <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
          Analyzing defensive disruption, <span className="text-white font-bold">{stocksWinner.name}</span> generates a more visible box-score impact with combined steals and blocks <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({Math.max(stocks1, stocks2).toFixed(1)} Stocks)</span>. Conversely, the pure Defensive Rating indicates the team structure is more solid with <span className="text-white font-bold">{defRtgWinner.name}</span> on the floor <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">({Math.min(p1.adv?.defRating || 115, p2.adv?.defRating || 115).toFixed(1)} DRtg)</span>.
        </p>
      );
    }
    if (activeTab === "advanced") {
      const bpmWinner = (p1.adv?.bpm || 0) > (p2.adv?.bpm || 0) ? p1 : p2;
      const perWinner = (p1.adv?.per || 0) > (p2.adv?.per || 0) ? p1 : p2;
      const usgWinner = (p1.adv?.usg || 0) > (p2.adv?.usg || 0) ? p1 : p2;
      return (
        <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
          Advanced metrics reveal true marginal value. <span className="text-white font-bold">{bpmWinner.name}</span> dominates the Box Plus/Minus <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({Math.max(p1.adv?.bpm || 0, p2.adv?.bpm || 0).toFixed(1)} BPM)</span>, indicating a higher systemic impact. Meanwhile, <span className="text-white font-bold">{perWinner.name}</span> maximizes per-minute efficiency (PER), all while operating under a massive usage load led by <span className="text-white font-bold">{usgWinner.name}</span> <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(p1.adv?.usg || 0, p2.adv?.usg || 0).toFixed(1)}% USG)</span>.
        </p>
      );
    }
    if (activeTab === "clutch") {
      if (!p1Clutch || !p2Clutch) return <p className="text-lg text-slate-300/90 leading-relaxed font-medium">Awaiting pressure data...</p>;
      const c1Mult = getClutchMultiplier(p1Clutch, p1?.adv?.pace || 100, perMode);
      const c2Mult = getClutchMultiplier(p2Clutch, p2?.adv?.pace || 100, perMode);
      const c1Pts = p1Clutch.pts * c1Mult; const c2Pts = p2Clutch.pts * c2Mult;
      
      const clutchTsWinner = p1Clutch.ts > p2Clutch.ts ? p1 : p2;
      const clutchPtsWinner = c1Pts > c2Pts ? p1 : p2;
      const clutchBpmWinner = p1Clutch.clutchBpm > p2Clutch.clutchBpm ? p1 : p2;

      return (
        <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
          Under maximum pressure (last 5 minutes), <span className="text-white font-bold">{clutchPtsWinner.name}</span> takes responsibility, delivering <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">{Math.max(c1Pts, c2Pts).toFixed(1)} PTS</span> {perMode !== 'Per Game' ? `per ${perMode.split(" ")[1]}` : 'per clutch game'}. In terms of reliability, <span className="text-white font-bold">{clutchTsWinner.name}</span> scores with colder efficiency, registering a True Shooting of <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.max(p1Clutch.ts, p2Clutch.ts).toFixed(1)}%</span>. Globally, the player providing the most positive swing in tight finishes is <span className="text-white font-bold">{clutchBpmWinner.name}</span>, anchoring a Clutch BPM of <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{(Math.max(p1Clutch.clutchBpm, p2Clutch.clutchBpm) > 0 ? '+' : '')}{Math.max(p1Clutch.clutchBpm, p2Clutch.clutchBpm).toFixed(1)}</span>.
        </p>
      );
    }
    if (activeTab === "shooting") {
      const tsWinner = (p1.adv?.ts || 0) > (p2.adv?.ts || 0) ? p1 : p2;
      const efgWinner = (p1.adv?.efg || 0) > (p2.adv?.efg || 0) ? p1 : p2;
      const threeWinner = (p1.stats?.threePct || 0) > (p2.stats?.threePct || 0) ? p1 : p2;
      return (
        <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
          In terms of ballistic efficiency and shot selection, <span className="text-white font-bold">{tsWinner.name}</span> is the more lethal global scorer with a True Shooting of <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.max(p1.adv?.ts || 0, p2.adv?.ts || 0).toFixed(1)}%</span>. Removing free throws from the equation, <span className="text-white font-bold">{efgWinner.name}</span> leads in Effective FG%, while the elite perimeter threat falls to <span className="text-white font-bold">{threeWinner.name}</span> <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({Math.max(p1.stats?.threePct || 0, p2.stats?.threePct || 0).toFixed(1)}% 3PT)</span>.
        </p>
      );
    }

    const impactWinner = (p1.adv?.bpm || 0) > (p2.adv?.bpm || 0) ? p1 : p2;
    const scoringWinner = (p1.stats?.ppg || 0) > (p2.stats?.ppg || 0) ? p1 : p2;
    const effWinner = (p1.adv?.ts || 0) > (p2.adv?.ts || 0) ? p1 : p2;
    const playWinner = (p1.stats?.apg || 0) > (p2.stats?.apg || 0) ? p1 : p2;
    return (
      <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
        <span className="text-white font-bold">{impactWinner.name}</span> dictates the overall algorithmic advantage through Adjusted Plus/Minus <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({impactWinner.adv?.bpm > 0 ? '+' : ''}{(impactWinner.adv?.bpm || 0).toFixed(1)})</span>. While <span className="text-white font-bold">{scoringWinner.name}</span> commands the raw scoring volume <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(p1.stats?.ppg || 0, p2.stats?.ppg || 0).toFixed(1)} PPG)</span>, <span className="text-white font-bold">{effWinner.name}</span> operates with maximum true shooting efficiency <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">({Math.max(p1.adv?.ts || 0, p2.adv?.ts || 0).toFixed(1)}%)</span>. The primary playmaking engine favors <span className="text-white font-bold">{playWinner.name}</span>.
      </p>
    );
  }, [p1, p2, activeTab, p1Clutch, p2Clutch, perMode]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-1000">
        <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="h-14 w-14 animate-spin text-cyan-400 relative z-10" />
        </div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyan-400/80 animate-pulse font-mono">Initializing Oracle Engine</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground pb-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-8">
          <div className="text-center">
            <Badge className="bg-white/[0.02] border-white/[0.08] text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-6 py-2 mb-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] backdrop-blur-xl">
              Time Machine Terminal
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-foreground drop-shadow-2xl">
              Head-to-Head <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/30">Scouting</span>
            </h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center w-full max-w-5xl mx-auto">
            <PlayerCombobox value={p1Id} onChange={(id, p) => { setP1Id(id); if(p) setP1Data({...p, archetype: getArchetype(p)}); else setP1Data(null); }} season={p1Season} onSeasonChange={setP1Season} themeColor={color1} />
            
            <div className="flex flex-col items-center gap-4 shrink-0 my-8 lg:my-0">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] z-20 pointer-events-none" viewBox="0 0 100 100">
                  {similarityScore !== null && (
                    <>
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <motion.circle 
                        cx="50" cy="50" r="46" fill="none" 
                        stroke="url(#dnaGradient)" strokeWidth="6" strokeLinecap="round"
                        initial={{ strokeDasharray: "0 300" }}
                        animate={{ strokeDasharray: `${(similarityScore / 100) * 289} 300` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      />
                      <defs>
                        <linearGradient id="dnaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={color1} />
                          <stop offset="100%" stopColor={color2} />
                        </linearGradient>
                      </defs>
                    </>
                  )}
                </svg>

                <div className="absolute inset-0 rounded-3xl blur-2xl scale-110 animate-pulse" style={{ background: `linear-gradient(to bottom right, ${hexToRgba(color1, 0.2)}, ${hexToRgba(color2, 0.2)})` }} />
                
                <div className="relative w-20 h-20 bg-[#050914]/90 border border-white/[0.1] rounded-[1.5rem] flex items-center justify-center backdrop-blur-2xl shadow-2xl rotate-45 hover:scale-110 hover:rotate-90 transition-all duration-700 ease-out z-10">
                  <span className="text-2xl font-black text-transparent bg-clip-text -rotate-45" style={{ backgroundImage: `linear-gradient(to bottom right, ${color1}, #ffffff, ${color2})` }}>VS</span>
                </div>
              </div>
              
              {similarityScore !== null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
                  <Badge className="bg-black/50 backdrop-blur-md border border-white/10 text-white/80 px-3 py-1 font-mono tracking-[0.2em] text-[10px] uppercase shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    DNA Match: <span className="text-white font-black ml-1.5 text-[11px] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{similarityScore}%</span>
                  </Badge>
                </motion.div>
              )}
            </div>

            <PlayerCombobox value={p2Id} onChange={(id, p) => { setP2Id(id); if(p) setP2Data({...p, archetype: getArchetype(p)}); else setP2Data(null); }} season={p2Season} onSeasonChange={setP2Season} themeColor={color2} />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 w-full max-w-5xl mx-auto border-t border-white/[0.05] pt-6">
             <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl shadow-inner backdrop-blur-md overflow-x-auto max-w-full">
                {["overall", "offense", "defense", "advanced", "clutch", "shooting"].map((tab) => (
                    <button 
                       key={tab} 
                       onClick={() => setActiveTab(tab as any)}
                       className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === tab ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                    >
                        {tab}
                    </button>
                ))}
             </div>

             <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl shadow-inner backdrop-blur-md shrink-0">
                {["Per Game", "Per 75", "Per 36 Min"].map((mode) => (
                    <button 
                       key={mode} 
                       onClick={() => setPerMode(mode as any)}
                       className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${perMode === mode ? "bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                    >
                        {mode}
                    </button>
                ))}
             </div>
          </div>
        </motion.div>

        {p1 && p2 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} className="space-y-10">

            <div className="relative rounded-[3rem] overflow-hidden bg-white/[0.02] border border-white/[0.05] p-8 md:p-14 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
              <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] pointer-events-none rounded-[3rem]" />
              <div className="absolute -left-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.15) }} />
              <div className="absolute -right-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.15) }} />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color1, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color1, 0.3)}`, '--tw-ring-color': hexToRgba(color1, 0.2) } as any}>
                      <AvatarImage src={p1.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p1.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p1.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color1 }}>
                      {p1.teamId} <span className="text-muted-foreground">|</span> {p1Season}
                    </p>
                  </div>
                  <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 ${p1.archetype?.color}`} style={{ boxShadow: `0 0 20px ${hexToRgba(color1, 0.1)}` }}>
                    {p1.archetype?.icon && <p1.archetype.icon className="h-3.5 w-3.5" />}
                    {p1.archetype?.label}
                  </Badge>
                </div>

                <div className="flex flex-col items-center gap-3 shrink-0 my-8 lg:my-0 opacity-0 pointer-events-none md:w-32"></div>

                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color2, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color2, 0.3)}`, '--tw-ring-color': hexToRgba(color2, 0.2) } as any}>
                      <AvatarImage src={p2.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p2.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p2.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color2 }}>
                      {p2.teamId} <span className="text-muted-foreground">|</span> {p2Season}
                    </p>
                  </div>
                  <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 ${p2.archetype?.color}`} style={{ boxShadow: `0 0 20px ${hexToRgba(color2, 0.1)}` }}>
                    {p2.archetype?.icon && <p2.archetype.icon className="h-3.5 w-3.5" />}
                    {p2.archetype?.label}
                  </Badge>
                </div>
              </div>
            </div>

            {activeTab === "shooting" ? (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }} 
                 animate={{ opacity: 1, scale: 1 }} 
                 transition={{ duration: 0.5 }}
                 className="w-full relative min-h-[500px]"
               >
                 {isShootingLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050914]/50 backdrop-blur-sm rounded-[2rem] border border-white/5">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-mono">Fetching Exact Shot Coordinates...</p>
                    </div>
                 ) : (
                    <ShootingComparison 
                       player1={mapPlayerToShootingProfile(p1, color1, p1RawShots)!} 
                       player2={mapPlayerToShootingProfile(p2, color2, p2RawShots)!} 
                    />
                 )}
               </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="lg:col-span-5 w-full">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col group hover:border-white/[0.08] transition-colors duration-500">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.06) }} />
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.06) }} />
                      
                      <div className="text-center mb-10 relative z-10">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg mb-1">{activeTab === 'clutch' ? 'Clutch DNA Hologram' : 'Style DNA Hologram'}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">League Percentile (0-100)</p>
                      </div>

                      <div className="w-full h-[380px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} outerRadius="70%">
                            <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 900 }} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#050914', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', color: '#fff', fontWeight: '900', fontSize: '13px', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }} 
                              itemStyle={{ padding: '4px 0' }}
                            />
                            <Radar name={p1NameYear} dataKey="p1" stroke={color1} strokeWidth={3.5} fill={color1} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color1, strokeWidth: 3 }} activeDot={{ r: 8, fill: color1, stroke: "#fff", strokeWidth: 2 }} />
                            <Radar name={p2NameYear} dataKey="p2" stroke={color2} strokeWidth={3.5} fill={color2} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color2, strokeWidth: 3 }} activeDot={{ r: 8, fill: color2, stroke: "#fff", strokeWidth: 2 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="lg:col-span-7 w-full">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden hover:border-white/[0.08] transition-colors duration-500 flex flex-col h-full">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      
                      <div className="flex flex-col items-center mb-8 relative z-10 border-b border-white/[0.05] pb-6">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-3 font-mono">{activeTab === 'clutch' ? 'Clutch Dominance' : 'Raw Stat Dominance'}</h3>
                         <div className="flex items-center gap-6 bg-black/40 px-6 py-2.5 rounded-full border border-white/[0.05] shadow-inner">
                            <span className="text-xl font-black font-mono" style={{ color: color1, textShadow: `0 0 15px ${hexToRgba(color1, 0.5)}` }}>{dominanceScore.p1Wins}</span>
                            <div className="w-12 h-px bg-white/10" />
                            <span className="text-xl font-black font-mono" style={{ color: color2, textShadow: `0 0 15px ${hexToRgba(color2, 0.5)}` }}>{dominanceScore.p2Wins}</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between mb-8 relative z-10">
                        {activeTab === 'clutch' && p1Clutch && p2Clutch ? (
                           <>
                             <div className="flex flex-col text-center">
                                <span className="text-[12px] font-black uppercase tracking-[0.25em]" style={{ color: color1 }}>{p1.name.split(" ").pop()}</span>
                                <span className="text-[9px] font-bold text-white/50 tracking-widest mt-1">{p1Clutch.gp} Games <span className="px-1">|</span> {p1Clutch.min.toFixed(1)} Min</span>
                             </div>
                             <div className="flex flex-col text-center">
                                <span className="text-[12px] font-black uppercase tracking-[0.25em]" style={{ color: color2 }}>{p2.name.split(" ").pop()}</span>
                                <span className="text-[9px] font-bold text-white/50 tracking-widest mt-1">{p2Clutch.gp} Games <span className="px-1">|</span> {p2Clutch.min.toFixed(1)} Min</span>
                             </div>
                           </>
                        ) : (
                           <>
                             <span className="text-[12px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-lg border" style={{ color: color1, backgroundColor: hexToRgba(color1, 0.08), borderColor: hexToRgba(color1, 0.2), boxShadow: `0 0 20px ${hexToRgba(color1, 0.1)}` }}>
                               {p1.name.split(" ").pop()} '{p1Season.substring(2,4)}
                             </span>
                             <span className="text-[12px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-lg border" style={{ color: color2, backgroundColor: hexToRgba(color2, 0.08), borderColor: hexToRgba(color2, 0.2), boxShadow: `0 0 20px ${hexToRgba(color2, 0.1)}` }}>
                               {p2.name.split(" ").pop()} '{p2Season.substring(2,4)}
                             </span>
                           </>
                        )}
                      </div>
                      
                      {activeTab === 'clutch' && isClutchLoading ? (
                           <div className="flex-1 flex flex-col items-center justify-center py-20 relative z-10"><Loader2 className="animate-spin h-10 w-10 text-orange-500 mb-4" /><span className="text-xs uppercase tracking-widest text-white/40 font-black">Decrypting Pressure Data</span></div>
                      ) : activeTab === 'clutch' && (!p1Clutch || !p2Clutch) ? (
                           <div className="flex-1 flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-black/20 relative z-10 py-20"><Clock className="h-12 w-12 text-white/20 mx-auto mb-4" /><span className="text-sm font-black uppercase text-white/40 tracking-widest">Insufficient Clutch Data</span></div>
                      ) : (
                          <div className={`relative z-10 flex-1 divide-y divide-white/[0.02] space-y-0`}>
                            {statBars.map((s, i) => (
                              <TugBar key={i} label={s.label} v1={s.v1} v2={s.v2} c1={color1} c2={color2} reverse={s.reverse} showPlus={s.showPlus} />
                            ))}
                          </div>
                      )}
                    </div>
                  </motion.div>
                </div>
            )}

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="relative bg-[#030712]/50 border border-emerald-500/[0.15] rounded-[2.5rem] p-10 md:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden group hover:border-emerald-500/30 transition-colors duration-500 backdrop-blur-md mt-10">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 group-hover:bg-emerald-500/[0.08]" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10">
                <div className="shrink-0 w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.15)] relative overflow-hidden group-hover:border-emerald-500/40 transition-colors duration-500">
                  <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <Brain className="h-10 w-10 text-emerald-400 animate-pulse relative z-10 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-[14px] font-black uppercase tracking-[0.3em] text-white drop-shadow-md">Neural Engine Analysis</h3>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 font-mono shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                      System v2.4 Live
                    </Badge>
                  </div>
                  {aiVerdict}
                </div>
              </div>
            </motion.div>

          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center justify-center py-32 opacity-60 relative z-10">
             <div className="relative mb-8 group">
               <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <Hexagon className="h-24 w-24 text-muted-foreground relative z-10 animate-pulse" />
             </div>
             <p className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground text-center font-mono">
               Awaiting Database Initialization<br/>
               <span className="text-[10px] text-slate-600">Select athletes from any era to begin</span>
             </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
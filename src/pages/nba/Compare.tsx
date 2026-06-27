import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PolarRadiusAxis
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Target, Clock, ShieldAlert, Brain, Zap, Activity, Crown, Crosshair
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
  if (!p || (p.stats?.gp ?? 0) === 0 || (p as any).ghostPlayer) {
    return { label: 'NO DATA', icon: Activity, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
  }

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

const getIndividualDNA = (p: any) => {
    if (!p || !p.percentiles) return [];
    return [
        { stat: "SCORING", val: Math.round(p.percentiles.ScoringIndex ?? 50) },
        { stat: "CREATION", val: Math.round(p.percentiles.PlayCreation ?? 50) },
        { stat: "PERIM D", val: Math.round(p.percentiles.PerimeterD ?? 50) },
        { stat: "INT D", val: Math.round(p.percentiles.InteriorD ?? 50) },
        { stat: "HUSTLE", val: Math.round(p.percentiles.Hustle ?? 50) },
        { stat: "IMPACT", val: Math.round(p.percentiles.OverallImpact ?? 50) },
    ];
};

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
      for (let i = 2025; i >= 1996; i--) { 
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
    <div className="relative w-full flex flex-col md:flex-row gap-3 z-[9999]" ref={ref}>
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
                className="absolute top-full mt-3 w-full bg-[#050914]/95 backdrop-blur-3xl border border-white/[0.1] rounded-[1.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,1)] overflow-hidden z-[99999]"
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

// Componente Búsqueda
function PlayerSelector({ value, players, onSelect, placeholder, side }: { value: any, players: any[], onSelect: (p: any) => void, placeholder: string, side: 'left' | 'right' }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return players
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.rating?.ovr || 0) - (a.rating?.ovr || 0))
      .slice(0, 5);
  }, [search, players]);

  return (
    <div className="relative w-full">
      {value ? (
        <div className={`flex items-center gap-4 p-4 bg-[#111] border border-[#333] rounded-2xl hover:border-[#555] transition-colors cursor-pointer ${side === 'right' ? 'flex-row-reverse text-right' : ''}`} onClick={() => { onSelect(null); setSearch(""); setIsOpen(true); }}>
          <Avatar className="h-16 w-16 border-2 border-[#333] bg-black">
            <AvatarImage src={value.imageUrl} />
            <AvatarFallback>{value.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-xl truncate">{value.name}</h3>
            <div className={`flex items-center gap-2 mt-1 ${side === 'right' ? 'justify-end' : ''}`}>
              <img src={nbaService.getTeamLogoUrl(value.teamId)} className="w-4 h-4" />
              <span className="text-[#888] font-bold text-xs">{value.teamId}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#555] ${side === 'left' ? 'left-4' : 'right-4'}`} />
          <input
            type="text"
            className={`w-full bg-[#111] border-2 border-dashed border-[#333] rounded-2xl py-5 text-white font-bold placeholder:text-[#555] focus:border-cyan-500 focus:bg-black transition-all outline-none ${side === 'left' ? 'pl-12 pr-4 text-left' : 'pr-12 pl-4 text-right'}`}
            placeholder={placeholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
          />
          {isOpen && filtered.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-[#111] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden">
              {filtered.map(p => (
                <div key={p.id} onClick={() => { onSelect(p); setIsOpen(false); }} className={`flex items-center gap-3 p-3 hover:bg-[#222] cursor-pointer border-b border-[#222] last:border-0 ${side === 'right' ? 'flex-row-reverse text-right' : ''}`}>
                  <Avatar className="h-10 w-10 border border-[#333]"><AvatarImage src={p.imageUrl} /></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{p.name}</p>
                    <p className="text-[#666] text-[10px] font-black">{p.teamId} · {p.rating?.ovr || 'N/A'} OVR</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TugBar = ({ label, v1, v2, c1, c2, reverse = false, showPlus = false, isPct = false }: { label: string; v1: number | undefined; v2: number | undefined; c1: string; c2: string; reverse?: boolean; showPlus?: boolean; isPct?: boolean }) => {
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
  
  const formatVal = (v: number) => {
      const num = showPlus && v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
      return isPct ? `${num}%` : num;
  };

  return (
    <div className="group py-2 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-300 px-3 relative overflow-hidden">
      <div className="relative z-10 flex items-end justify-between w-full pb-1.5">
        
        <div className="absolute left-1/2 bottom-1.5 -translate-x-1/2 text-center pointer-events-none w-1/3">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50 group-hover:text-white/90 transition-colors font-mono block truncate">
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
  
  const [activeTab, setActiveTab] = useState<"dna" | "boxscore" | "scoring" | "playmaking" | "defense" | "impact" | "clutch" | "shooting">("dna");
  const [perMode, setPerMode] = useState<"Per Game" | "Per 75" | "Per 36 Min">("Per Game");

  const [p1Id, setP1Id] = useState("203999");
  const [p1Season, setP1Season] = useState("2025-26");
  const [p1Data, setP1Data] = useState<any>(null);
  const [p1RawShots, setP1RawShots] = useState<any[]>([]);
  const [p1Clutch, setP1Clutch] = useState<any>(null);

  const [p2Id, setP2Id] = useState("1629029");
  const [p2Season, setP2Season] = useState("2025-26");
  const [p2Data, setP2Data] = useState<any>(null);
  const [p2RawShots, setP2RawShots] = useState<any[]>([]);
  const [p2Clutch, setP2Clutch] = useState<any>(null);

  useEffect(() => {
    setIsLoading(true);
    nbaService.fetchAllOfficialPlayers("2025-26").then(data => {
      const jokic = data.find(p => p.id === "203999") || data[0];
      const luka = data.find(p => p.id === "1629029") || data[1];
      setP1Data({ ...jokic, archetype: getArchetype(jokic) });
      setP2Data({ ...luka, archetype: getArchetype(luka) });
      setIsLoading(false);
    });
  }, []);

  const isNoData = (p: any) => !p || (p.stats?.gp ?? 0) === 0 || !!(p as any).ghostPlayer;

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

  const p1NameYear = p1 ? `${p1.name.split(" ").pop()} '${p1Season.substring(2,4)}` : "";
  const p2NameYear = p2 ? `${p2.name.split(" ").pop()} '${p2Season.substring(2,4)}` : "";

  const similarityScore = useMemo(() => {
    if (!p1 || !p2 || !p1.percentiles || !p2.percentiles) return null;
    
    const getVector = (p: any) => [
      p.percentiles.USG || 50,
      p.percentiles.ShotCreation || 50,
      p.percentiles.FtaRate || 50,
      p.percentiles.ThreePA || 50,
      p.percentiles.MidRange || 50,
      p.percentiles.Finishing || 50,
      p.percentiles.AstPct || 50,
      p.percentiles.PassesMade || 50,
      p.percentiles.BallSecurity || 50,
      p.percentiles.OReb || 50,
      p.percentiles.DReb || 50,
      p.percentiles.FastBreak || 50,
      p.percentiles.Steals || 50,
      p.percentiles.Blocks || 50,
      p.percentiles.Contested || 50
    ];

    const v1 = getVector(p1);
    const v2 = getVector(p2);

    let sumSq = 0;
    let dotProduct = 0;
    let mag1Sq = 0;
    let mag2Sq = 0;

    for (let i = 0; i < v1.length; i++) {
        sumSq += Math.pow(v1[i] - v2[i], 2);
        dotProduct += v1[i] * v2[i];
        mag1Sq += v1[i] * v1[i];
        mag2Sq += v2[i] * v2[i];
    }

    const distance = Math.sqrt(sumSq);
    const maxDistance = Math.sqrt(15 * 10000); 
    const euclideanSim = Math.max(0, 1 - (distance / maxDistance)); 

    const mag1 = Math.sqrt(mag1Sq);
    const mag2 = Math.sqrt(mag2Sq);
    const cosineSim = (mag1 && mag2) ? (dotProduct / (mag1 * mag2)) : 0; 

    const hybridSim = (cosineSim * 0.7) + (euclideanSim * 0.3);

    return Math.max(0, Math.min(100, Math.round(hybridSim * 100)));
  }, [p1, p2]);

  const radarData = useMemo(() => {
    if (!p1 || !p2) return [];
    
    if (isNoData(p1) || isNoData(p2)) return [];

    if (activeTab === "clutch" && p1Clutch && p2Clutch) {
        return [
            { stat: "Scoring", p1: Math.round(p1Clutch.percentiles?.Scoring ?? 50), p2: Math.round(p2Clutch.percentiles?.Scoring ?? 50) },
            { stat: "Playmaking", p1: Math.round(p1Clutch.percentiles?.Playmaking ?? 50), p2: Math.round(p2Clutch.percentiles?.Playmaking ?? 50) },
            { stat: "Efficiency", p1: Math.round(p1Clutch.percentiles?.Efficiency ?? 50), p2: Math.round(p2Clutch.percentiles?.Efficiency ?? 50) },
            { stat: "Defense", p1: Math.round(p1Clutch.percentiles?.Defense ?? 50), p2: Math.round(p2Clutch.percentiles?.Defense ?? 50) },
            { stat: "Impact", p1: Math.round(p1Clutch.percentiles?.Impact ?? 50), p2: Math.round(p2Clutch.percentiles?.Impact ?? 50) },
            { stat: "Rebounding", p1: Math.round(p1Clutch.percentiles?.Rebounding ?? 50), p2: Math.round(p2Clutch.percentiles?.Rebounding ?? 50) },
        ];
    }
    if (activeTab === "scoring") {
        return [
            { stat: "Volume", p1: Math.round(p1.percentiles?.Scoring ?? 50), p2: Math.round(p2.percentiles?.Scoring ?? 50) },
            { stat: "Efficiency", p1: Math.round(p1.percentiles?.Efficiency ?? 50), p2: Math.round(p2.percentiles?.Efficiency ?? 50) },
            { stat: "3PT Shooting", p1: Math.round(p1.percentiles?.Shooting ?? 50), p2: Math.round(p2.percentiles?.Shooting ?? 50) },
            { stat: "Finishing", p1: Math.round(p1.percentiles?.Finishing ?? 50), p2: Math.round(p2.percentiles?.Finishing ?? 50) },
            { stat: "Mid-Range", p1: Math.round(p1.percentiles?.MidRange ?? 50), p2: Math.round(p2.percentiles?.MidRange ?? 50) },
            { stat: "Shot Creation", p1: Math.round(p1.percentiles?.ShotCreation ?? 50), p2: Math.round(p2.percentiles?.ShotCreation ?? 50) },
        ];
    }
    if (activeTab === "playmaking") {
        return [
            { stat: "Assists", p1: Math.round(p1.percentiles?.Playmaking ?? 50), p2: Math.round(p2.percentiles?.Playmaking ?? 50) },
            { stat: "Shots Generated", p1: Math.round(p1.percentiles?.PotentialAst ?? 50), p2: Math.round(p2.percentiles?.PotentialAst ?? 50) },
            { stat: "Ball Movement", p1: Math.round(p1.percentiles?.BallMovement ?? 50), p2: Math.round(p2.percentiles?.BallMovement ?? 50) },
            { stat: "Value", p1: Math.round(p1.percentiles?.AstPtsCreated ?? 50), p2: Math.round(p2.percentiles?.AstPtsCreated ?? 50) },
            { stat: "Security", p1: Math.round(p1.percentiles?.BallSecurity ?? 50), p2: Math.round(p2.percentiles?.BallSecurity ?? 50) },
            { stat: "Load", p1: Math.round(p1.percentiles?.PlaymakingLoad ?? 50), p2: Math.round(p2.percentiles?.PlaymakingLoad ?? 50) },
        ];
    }
    if (activeTab === "defense") {
        return [
            { stat: "Global Def", p1: Math.round(p1.percentiles?.Defense ?? 50), p2: Math.round(p2.percentiles?.Defense ?? 50) },
            { stat: "Interior D", p1: Math.round(p1.percentiles?.InteriorD ?? 50), p2: Math.round(p2.percentiles?.InteriorD ?? 50) },
            { stat: "Perimeter D", p1: Math.round(p1.percentiles?.PerimeterD ?? 50), p2: Math.round(p2.percentiles?.PerimeterD ?? 50) },
            { stat: "Deflections", p1: Math.round(p1.percentiles?.Deflections ?? 50), p2: Math.round(p2.percentiles?.Deflections ?? 50) },
            { stat: "Contested Shots", p1: Math.round(p1.percentiles?.Contested ?? 50), p2: Math.round(p2.percentiles?.Contested ?? 50) },
            { stat: "Def Reb", p1: Math.round(p1.percentiles?.DReb ?? 50), p2: Math.round(p2.percentiles?.DReb ?? 50) },
        ];
    }
    if (activeTab === "impact") {
        return [
            { stat: "Overall Impact", p1: Math.round(p1.percentiles?.SystemicImpact ?? 50), p2: Math.round(p2.percentiles?.SystemicImpact ?? 50) },
            { stat: "Net Rtg", p1: Math.round(p1.percentiles?.NetRtg ?? 50), p2: Math.round(p2.percentiles?.NetRtg ?? 50) },
            { stat: "PER", p1: Math.round(p1.percentiles?.PER ?? 50), p2: Math.round(p2.percentiles?.PER ?? 50) },
            { stat: "PIE", p1: Math.round(p1.percentiles?.PIE ?? 50), p2: Math.round(p2.percentiles?.PIE ?? 50) },
            { stat: "Win Shares (48)", p1: Math.round(p1.percentiles?.WS48 ?? 50), p2: Math.round(p2.percentiles?.WS48 ?? 50) },
            { stat: "BPM", p1: Math.round(p1.percentiles?.Impact ?? 50), p2: Math.round(p2.percentiles?.Impact ?? 50) },
        ];
    }
    if (activeTab === "boxscore") {
        return [
            { stat: "Scoring", p1: Math.round(p1.percentiles?.Scoring ?? 50), p2: Math.round(p2.percentiles?.Scoring ?? 50) },
            { stat: "Rebounding", p1: Math.round(p1.percentiles?.Rebounding ?? 50), p2: Math.round(p2.percentiles?.Rebounding ?? 50) },
            { stat: "Assists", p1: Math.round(p1.percentiles?.Playmaking ?? 50), p2: Math.round(p2.percentiles?.Playmaking ?? 50) },
            { stat: "Steals", p1: Math.round(p1.percentiles?.Steals ?? 50), p2: Math.round(p2.percentiles?.Steals ?? 50) },
            { stat: "Blocks", p1: Math.round(p1.percentiles?.Blocks ?? 50), p2: Math.round(p2.percentiles?.Blocks ?? 50) },
            { stat: "FG%", p1: Math.round(p1.percentiles?.Efficiency ?? 50), p2: Math.round(p2.percentiles?.Efficiency ?? 50) }, 
        ];
    }

    return [
        { stat: "Scoring Index", p1: Math.round(p1.percentiles?.ScoringIndex ?? 50), p2: Math.round(p2.percentiles?.ScoringIndex ?? 50) },
        { stat: "Play Creation", p1: Math.round(p1.percentiles?.PlayCreation ?? 50), p2: Math.round(p2.percentiles?.PlayCreation ?? 50) },
        { stat: "Perimeter D", p1: Math.round(p1.percentiles?.PerimeterD ?? 50), p2: Math.round(p2.percentiles?.PerimeterD ?? 50) },
        { stat: "Interior D", p1: Math.round(p1.percentiles?.InteriorD ?? 50), p2: Math.round(p2.percentiles?.InteriorD ?? 50) },
        { stat: "Hustle & Motor", p1: Math.round(p1.percentiles?.Hustle ?? 50), p2: Math.round(p2.percentiles?.Hustle ?? 50) },
        { stat: "Overall Impact", p1: Math.round(p1.percentiles?.OverallImpact ?? 50), p2: Math.round(p2.percentiles?.OverallImpact ?? 50) },
    ];
  }, [p1, p2, activeTab, p1Clutch, p2Clutch]);

  const statBars = useMemo(() => {
    if (!p1 || !p2) return [];

    if (activeTab === "dna") return []; 

    if (activeTab === "clutch") {
        if (!p1Clutch || !p2Clutch) return [];
        const c1Mult = getClutchMultiplier(p1Clutch, p1?.adv?.pace || 100, perMode);
        const c2Mult = getClutchMultiplier(p2Clutch, p2?.adv?.pace || 100, perMode);
        
        return [
            { label: "CLUTCH PTS", v1: p1Clutch.pts * c1Mult, v2: p2Clutch.pts * c2Mult },
            { label: "TRUE SHOOTING %", v1: p1Clutch.ts, v2: p2Clutch.ts, isPct: true },
            { label: "CLUTCH AST", v1: p1Clutch.ast * c1Mult, v2: p2Clutch.ast * c2Mult },
            { label: "CLUTCH REB", v1: p1Clutch.reb * c1Mult, v2: p2Clutch.reb * c2Mult },
            { label: "CLUTCH STL", v1: p1Clutch.stl * c1Mult, v2: p2Clutch.stl * c2Mult },
            { label: "CLUTCH BLK", v1: p1Clutch.blk * c1Mult, v2: p2Clutch.blk * c2Mult },
            { label: "NET RATING", v1: p1Clutch.clutchNetRtg, v2: p2Clutch.clutchNetRtg, showPlus: true },
            { label: "CLUTCH OREB", v1: p1Clutch.oreb * c1Mult, v2: p2Clutch.oreb * c2Mult },
            { label: "FG%", v1: p1Clutch.fgPct, v2: p2Clutch.fgPct, isPct: true },
            { label: "3P%", v1: p1Clutch.fg3Pct, v2: p2Clutch.fg3Pct, isPct: true },
            { label: "FT%", v1: p1Clutch.ftPct, v2: p2Clutch.ftPct, isPct: true },
            { label: "TURNOVERS", v1: p1Clutch.tov * c1Mult, v2: p2Clutch.tov * c2Mult, reverse: true },
        ];
    }

    const mult1 = getMultiplier(p1, perMode);
    const mult2 = getMultiplier(p2, perMode);
    const getVal = (p: any, val: number | undefined, isCount: boolean, mult: number) => { if (val === undefined || val === null) return 0; return isCount ? val * mult : val; };
    
    if (activeTab === "boxscore") {
        return [
            { label: "PTS", v1: getVal(p1, p1.stats?.ppg, true, mult1), v2: getVal(p2, p2.stats?.ppg, true, mult2) },
            { label: "REB", v1: getVal(p1, p1.stats?.rpg, true, mult1), v2: getVal(p2, p2.stats?.rpg, true, mult2) },
            { label: "AST", v1: getVal(p1, p1.stats?.apg, true, mult1), v2: getVal(p2, p2.stats?.apg, true, mult2) },
            { label: "FGM", v1: getVal(p1, p1.stats?.fgm, true, mult1), v2: getVal(p2, p2.stats?.fgm, true, mult2) },
            { label: "FGA", v1: getVal(p1, p1.stats?.fga, true, mult1), v2: getVal(p2, p2.stats?.fga, true, mult2) },
            { label: "FG%", v1: p1.stats?.fgPct, v2: p2.stats?.fgPct, isPct: true },
            { label: "3PM", v1: getVal(p1, p1.stats?.fg3m, true, mult1), v2: getVal(p2, p2.stats?.fg3m, true, mult2) },
            { label: "3PA", v1: getVal(p1, p1.stats?.fg3a, true, mult1), v2: getVal(p2, p2.stats?.fg3a, true, mult2) },
            { label: "3P%", v1: p1.stats?.threePct, v2: p2.stats?.threePct, isPct: true },
            { label: "FTM", v1: getVal(p1, p1.stats?.ftm, true, mult1), v2: getVal(p2, p2.stats?.ftm, true, mult2) },
            { label: "FTA", v1: getVal(p1, p1.stats?.fta, true, mult1), v2: getVal(p2, p2.stats?.fta, true, mult2) },
            { label: "FT%", v1: p1.stats?.ftPct, v2: p2.stats?.ftPct, isPct: true },
            { label: "OREB", v1: getVal(p1, p1.stats?.oreb, true, mult1), v2: getVal(p2, p2.stats?.oreb, true, mult2) },
            { label: "DREB", v1: getVal(p1, p1.stats?.dreb, true, mult1), v2: getVal(p2, p2.stats?.dreb, true, mult2) },
            { label: "TOV", v1: getVal(p1, p1.stats?.topg, true, mult1), v2: getVal(p2, p2.stats?.topg, true, mult2), reverse: true },
            { label: "STL", v1: getVal(p1, p1.stats?.spg, true, mult1), v2: getVal(p2, p2.stats?.spg, true, mult2) },
            { label: "BLK", v1: getVal(p1, p1.stats?.bpg, true, mult1), v2: getVal(p2, p2.stats?.bpg, true, mult2) },
            { label: "PF", v1: getVal(p1, p1.stats?.pf, true, mult1), v2: getVal(p2, p2.stats?.pf, true, mult2), reverse: true }
        ];
    }

    if (activeTab === "scoring") return [
        { label: "PTS", v1: getVal(p1, p1.stats?.ppg, true, mult1), v2: getVal(p2, p2.stats?.ppg, true, mult2) }, 
        { label: "TRUE SHOOTING %", v1: p1.adv?.ts, v2: p2.adv?.ts, isPct: true }, 
        { label: "EFFECTIVE FG %", v1: p1.adv?.efg, v2: p2.adv?.efg, isPct: true },
        { label: "USG %", v1: p1.adv?.usg, v2: p2.adv?.usg, isPct: true },
        { label: "% PTS 2PT", v1: p1.scoring?.pctPts2pt, v2: p2.scoring?.pctPts2pt, isPct: true }, 
        { label: "% PTS 3PT", v1: p1.scoring?.pctPts3pt, v2: p2.scoring?.pctPts3pt, isPct: true },
        { label: "% PTS FT", v1: p1.scoring?.pctPtsFt, v2: p2.scoring?.pctPtsFt, isPct: true }, 
        { label: "% FGM UNASSISTED", v1: p1.scoring?.pctFgmUast, v2: p2.scoring?.pctFgmUast, isPct: true }, 
        { label: "PTS IN PAINT", v1: getVal(p1, p1.misc?.ptsPaint, true, mult1), v2: getVal(p2, p2.misc?.ptsPaint, true, mult2) }, 
        { label: "2ND CHANCE PTS", v1: getVal(p1, p1.misc?.pts2ndChance, true, mult1), v2: getVal(p2, p2.misc?.pts2ndChance, true, mult2) }, 
        { label: "FAST BREAK PTS", v1: getVal(p1, p1.misc?.ptsFb, true, mult1), v2: getVal(p2, p2.misc?.ptsFb, true, mult2) }, 
        { label: "FTA RATE", v1: p1.adv?.ftaRate, v2: p2.adv?.ftaRate, isPct: true }
    ];
    
    if (activeTab === "playmaking") return [
        { label: "ASSISTS", v1: getVal(p1, p1.stats?.apg, true, mult1), v2: getVal(p2, p2.stats?.apg, true, mult2) }, 
        { label: "POTENTIAL ASSISTS", v1: getVal(p1, p1.passing?.potentialAst, true, mult1), v2: getVal(p2, p2.passing?.potentialAst, true, mult2) }, 
        { label: "AST POINTS CREATED", v1: getVal(p1, p1.passing?.astPtsCreated, true, mult1), v2: getVal(p2, p2.passing?.astPtsCreated, true, mult2) }, 
        { label: "SECONDARY AST", v1: getVal(p1, p1.passing?.secondaryAst, true, mult1), v2: getVal(p2, p2.passing?.secondaryAst, true, mult2) }, 
        { label: "PASSES MADE", v1: getVal(p1, p1.passing?.passesMade, true, mult1), v2: getVal(p2, p2.passing?.passesMade, true, mult2) }, 
        { label: "AST TO PASS %", v1: p1.passing?.astToPassPct, v2: p2.passing?.astToPassPct, isPct: true }, 
        { label: "AST %", v1: p1.adv?.astPct, v2: p2.adv?.astPct, isPct: true }, 
        { label: "AST RATIO", v1: p1.playmaking?.astRatio, v2: p2.playmaking?.astRatio }, 
        { label: "AST / TO RATIO", v1: p1.playmaking?.astTo, v2: p2.playmaking?.astTo }, 
        { label: "TURNOVERS", v1: getVal(p1, p1.stats?.topg, true, mult1), v2: getVal(p2, p2.stats?.topg, true, mult2), reverse: true }
    ];

    if (activeTab === "defense") return [
        { label: "DEF RTG", v1: p1.adv?.defRating, v2: p2.adv?.defRating, reverse: true }, 
        { label: "DFG% ALLOWED", v1: p1.tracking?.dfgPct, v2: p2.tracking?.dfgPct, reverse: true, isPct: true }, 
        { label: "STEALS", v1: getVal(p1, p1.stats?.spg, true, mult1), v2: getVal(p2, p2.stats?.spg, true, mult2) }, 
        { label: "BLOCKS", v1: getVal(p1, p1.stats?.bpg, true, mult1), v2: getVal(p2, p2.stats?.bpg, true, mult2) }, 
        { label: "DEFLECTIONS", v1: getVal(p1, p1.hustle?.deflections, true, mult1), v2: getVal(p2, p2.hustle?.deflections, true, mult2) }, 
        { label: "CONTESTED SHOTS", v1: getVal(p1, p1.hustle?.contestedShots, true, mult1), v2: getVal(p2, p2.hustle?.contestedShots, true, mult2) }, 
        { label: "CONTESTED 3PT", v1: getVal(p1, p1.hustle?.contested3pt, true, mult1), v2: getVal(p2, p2.hustle?.contested3pt, true, mult2) }, 
        { label: "BOX OUTS", v1: getVal(p1, p1.hustle?.boxOuts, true, mult1), v2: getVal(p2, p2.hustle?.boxOuts, true, mult2) },
        { label: "LOOSE BALLS REC", v1: getVal(p1, p1.hustle?.looseBalls, true, mult1), v2: getVal(p2, p2.hustle?.looseBalls, true, mult2) },
        { label: "CHARGES DRAWN", v1: getVal(p1, p1.hustle?.chargesDrawn, true, mult1), v2: getVal(p2, p2.hustle?.chargesDrawn, true, mult2) }
    ];

    if (activeTab === "impact") return [
        { label: "NET RATING", v1: p1.adv?.net, v2: p2.adv?.net, showPlus: true }, 
        { label: "WIN PERCENTAGE", v1: (p1.stats?.winPct || 0) * 100, v2: (p2.stats?.winPct || 0) * 100, isPct: true }, 
        { label: "WIN SHARES (Per 48)", v1: p1.adv?.ws48, v2: p2.adv?.ws48 }, 
        { label: "BPM", v1: p1.adv?.bpm, v2: p2.adv?.bpm, showPlus: true }, 
        { label: "OFF RATING", v1: p1.adv?.offRtg, v2: p2.adv?.offRtg },
        { label: "PER", v1: p1.adv?.per, v2: p2.adv?.per }, 
        { label: "PIE ESTIMATE", v1: p1.adv?.pie, v2: p2.adv?.pie, isPct: true }
    ];
    
    return [];
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

  const generateScoutReport = (p: any, color: string) => {
    if (!p || !p.percentiles) return null;
    const t = p.percentiles;
    
    const traits = [
        { name: "Scoring Index", val: t.ScoringIndex ?? 50 },
        { name: "Playmaking Vision", val: t.PlayCreation ?? 50 },
        { name: "Perimeter Lockdown", val: t.PerimeterD ?? 50 },
        { name: "Paint Protection", val: t.InteriorD ?? 50 },
        { name: "Relentless Motor", val: t.Hustle ?? 50 },
        { name: "Overall Impact", val: t.OverallImpact ?? 50 }
    ].sort((a, b) => b.val - a.val);

    const best1 = traits[0];
    const best2 = traits[1];
    const worst1 = traits[traits.length - 1];
    const worst2 = traits[traits.length - 2];

    let profileType = "versatile";
    if (best1.val >= 90) profileType = "highly elite";
    else if (best1.val >= 80) profileType = "specialized";
    else if (worst1.val >= 50) profileType = "exceptionally well-rounded";

    return (
        <div className="mb-6 last:mb-0">
            <div className="text-sm md:text-[15px] text-slate-300/90 leading-relaxed font-medium tracking-wide">
                <span className="text-white font-bold">{p.name}</span> naturally profiles as a <Badge className="mx-1 inline-flex text-[9px] uppercase tracking-widest bg-white/5 border-white/10" style={{color: color}}>{p.archetype?.label || "Rotation Player"}</Badge>. 
                His analytical fingerprint reveals a {profileType} skill set, predominantly driven by his <span className="text-emerald-400 font-bold">{best1.name.toLowerCase()} ({best1.val})</span> and <span className="text-emerald-400 font-bold">{best2.name.toLowerCase()} ({best2.val})</span>. 
                {worst1.val < 50 ? (
                    <span> Conversely, his relative vulnerabilities lie in <span className="text-rose-400 font-bold">{worst1.name.toLowerCase()} ({worst1.val})</span> and <span className="text-rose-400 font-bold">{worst2.name.toLowerCase()} ({worst2.val})</span>, dictating how coaching staffs scheme around him.</span>
                ) : (
                    <span> Remarkably, he displays almost no distinct statistical liabilities, maintaining above-average production even in his relative weak points like <span className="text-amber-400 font-bold">{worst1.name.toLowerCase()} ({worst1.val})</span>.</span>
                )}
            </div>
        </div>
    );
  };

  const aiVerdict = useMemo(() => {
    if (!p1 || !p2) return null;
    
    if (isNoData(p1) || isNoData(p2)) return null; 

    if (activeTab === "dna") {
        return (
            <div className="flex flex-col">
                <div className="flex flex-col">
                   {generateScoutReport(p1, color1)}
                   {generateScoutReport(p2, color2)}
                </div>
                <div className="mt-2 pt-4 border-t border-white/10">
                    <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
                        <strong className="text-white uppercase tracking-widest text-[10px] mr-2">Head-to-Head Systemic Outlook:</strong>
                        Ultimately, the engine favors <span className="text-cyan-400 font-bold">{p1.adv?.bpm > p2.adv?.bpm ? p1.name : p2.name}</span> in terms of raw algorithmic value (BPM {Math.max(p1.adv?.bpm || 0, p2.adv?.bpm || 0).toFixed(1)}).
                    </div>
                </div>
            </div>
        );
    }
    
    if (activeTab === "clutch") {
      if (!p1Clutch || !p2Clutch) return <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium">Awaiting pressure data...</div>;
      const c1Mult = getClutchMultiplier(p1Clutch, p1?.adv?.pace || 100, perMode);
      const c2Mult = getClutchMultiplier(p2Clutch, p2?.adv?.pace || 100, perMode);
      const c1Pts = p1Clutch.pts * c1Mult; const c2Pts = p2Clutch.pts * c2Mult;
      
      const clutchTsWinner = p1Clutch.ts > p2Clutch.ts ? p1 : p2;
      const clutchPtsWinner = c1Pts > c2Pts ? p1 : p2;
      const clutchBpmWinner = p1Clutch.clutchNetRtg > p2Clutch.clutchNetRtg ? p1 : p2;

      return (
        <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
          Under maximum pressure (last 5 mins), <span className="text-white font-bold">{clutchPtsWinner.name}</span> delivers <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">{Math.max(c1Pts, c2Pts).toFixed(1)} PTS</span> {perMode !== 'Per Game' ? `per ${perMode.split(" ")[1]}` : 'per clutch game'}. In terms of reliability, <span className="text-white font-bold">{clutchTsWinner.name}</span> registers a True Shooting of <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.max(p1Clutch.ts, p2Clutch.ts).toFixed(1)}%</span>. The player providing the most positive swing in tight finishes is <span className="text-white font-bold">{clutchBpmWinner.name}</span>, anchoring a Clutch Impact of <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{(Math.max(p1Clutch.clutchNetRtg, p2Clutch.clutchNetRtg) > 0 ? '+' : '')}{Math.max(p1Clutch.clutchNetRtg, p2Clutch.clutchNetRtg).toFixed(1)}</span>.
        </div>
      );
    }
    
    if (activeTab === "playmaking") {
        const astWinner = (p1.stats?.apg || 0) > (p2.stats?.apg || 0) ? p1 : p2;
        const potAstWinner = (p1.passing?.potentialAst || 0) > (p2.passing?.potentialAst || 0) ? p1 : p2;
        const astToWinner = (p1.playmaking?.astTo || 0) > (p2.playmaking?.astTo || 0) ? p1 : p2;
        return (
          <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
            As a floor general, <span className="text-white font-bold">{potAstWinner.name}</span> generates more raw opportunities, leading in Potential Assists <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({Math.max(p1.passing?.potentialAst || 0, p2.passing?.potentialAst || 0).toFixed(1)})</span>. While <span className="text-white font-bold">{astWinner.name}</span> dominates the direct box-score assists, <span className="text-white font-bold">{astToWinner.name}</span> offers better ball security and decision-making efficiency <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">({Math.max(p1.playmaking?.astTo || 0, p2.playmaking?.astTo || 0).toFixed(2)} AST/TO)</span>.
          </div>
        );
    }

    if (activeTab === "shooting" || activeTab === "scoring") {
      const tsWinner = (p1.adv?.ts || 0) > (p2.adv?.ts || 0) ? p1 : p2;
      const uastWinner = (p1.scoring?.pctFgmUast || 0) > (p2.scoring?.pctFgmUast || 0) ? p1 : p2;
      const ppgWinner = (p1.stats?.ppg || 0) > (p2.stats?.ppg || 0) ? p1 : p2;
      return (
        <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
          In terms of pure volume, <span className="text-white font-bold">{ppgWinner.name}</span> is the dominant force. However, <span className="text-white font-bold">{tsWinner.name}</span> is the more lethal global scorer with a True Shooting of <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.max(p1.adv?.ts || 0, p2.adv?.ts || 0).toFixed(1)}%</span>. As an independent shot creator, <span className="text-white font-bold">{uastWinner.name}</span> relies less on playmaking from teammates, self-generating <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{Math.max(p1.scoring?.pctFgmUast || 0, p2.scoring?.pctFgmUast || 0).toFixed(1)}%</span> of his field goals.
        </div>
      );
    }
    
    if (activeTab === "defense") {
        const dfgWinner = (p1.tracking?.dfgPct || 100) < (p2.tracking?.dfgPct || 100) ? p1 : p2;
        const defRtgWinner = (p1.adv?.defRating || 115) < (p2.adv?.defRating || 115) ? p1 : p2;
        return (
          <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
            Analyzing defensive disruption, <span className="text-white font-bold">{dfgWinner.name}</span> generates the best individual shot contest profile, holding opponents to just <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{Math.min(p1.tracking?.dfgPct || 100, p2.tracking?.dfgPct || 100).toFixed(1)}%</span> shooting. Conversely, the pure Defensive Rating indicates the team structure is tighter with <span className="text-white font-bold">{defRtgWinner.name}</span> on the floor <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">({Math.min(p1.adv?.defRating || 115, p2.adv?.defRating || 115).toFixed(1)} DRtg)</span>.
          </div>
        );
    }

    if (activeTab === "impact") {
        const impactWinner = (p1.adv?.bpm || 0) > (p2.adv?.bpm || 0) ? p1 : p2;
        const wsWinner = (p1.adv?.ws48 || 0) > (p2.adv?.ws48 || 0) ? p1 : p2;
        return (
          <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
            <span className="text-white font-bold">{impactWinner.name}</span> dictates the overall algorithmic advantage through Player DNA and Impact <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">({impactWinner.adv?.bpm > 0 ? '+' : ''}{(impactWinner.adv?.bpm || 0).toFixed(1)} BPM)</span>. When normalizing for playing time, <span className="text-white font-bold">{wsWinner.name}</span> contributes more direct winning value, generating <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.max(p1.adv?.ws48 || 0, p2.adv?.ws48 || 0).toFixed(3)}</span> Win Shares per 48 minutes.
          </div>
        );
    }

    if (activeTab === "boxscore") {
        const ppgWinner = (p1.stats?.ppg || 0) > (p2.stats?.ppg || 0) ? p1 : p2;
        const apgWinner = (p1.stats?.apg || 0) > (p2.stats?.apg || 0) ? p1 : p2;
        return (
          <div className="text-sm md:text-base text-slate-300/90 leading-relaxed font-medium tracking-wide">
             Looking at the traditional box score, <span className="text-white font-bold">{ppgWinner.name}</span> carries the primary scoring load <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(p1.stats?.ppg || 0, p2.stats?.ppg || 0).toFixed(1)} PPG)</span>. However, general flow and ball distribution favor <span className="text-white font-bold">{apgWinner.name}</span>.
          </div>
        );
    }

    return null;
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
      <div className="max-w-7xl mx-auto space-y-10 relative">
        
        {/* CABECERA Y BUSCADORES CON Z-INDEX ABSOLUTO */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-8 relative z-[9999]">
          <div className="text-center">
            <Badge className="bg-white/[0.02] border-white/[0.08] text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-6 py-2 mb-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] backdrop-blur-xl">
              Time Machine Terminal
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-foreground drop-shadow-2xl">
              Head-to-Head <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/30">Scouting</span>
            </h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center w-full max-w-5xl mx-auto relative z-[9999]">
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
                    NEURAL MATCH: <span className="text-white font-black ml-1.5 text-[11px] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{similarityScore}%</span>
                  </Badge>
                </motion.div>
              )}
            </div>

            <PlayerCombobox value={p2Id} onChange={(id, p) => { setP2Id(id); if(p) setP2Data({...p, archetype: getArchetype(p)}); else setP2Data(null); }} season={p2Season} onSeasonChange={setP2Season} themeColor={color2} />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 w-full max-w-6xl mx-auto border-t border-white/[0.05] pt-6 relative z-[50]">
             <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl shadow-inner backdrop-blur-md overflow-x-auto max-w-full">
                {["dna", "boxscore", "scoring", "playmaking", "defense", "impact", "clutch", "shooting"].map((tab) => (
                    <button 
                       key={tab} 
                       onClick={() => setActiveTab(tab as any)}
                       className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === tab ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                    >
                        {tab === "dna" ? "PLAYER DNA" : tab}
                    </button>
                ))}
             </div>

             <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl shadow-inner backdrop-blur-md shrink-0">
                {["Per Game", "Per 75", "Per 36 Min"].map((mode) => (
                    <button 
                       key={mode} 
                       onClick={() => setPerMode(mode as any)}
                       className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${perMode === mode ? "bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
                    >
                        {mode.replace("Per ", "")}
                    </button>
                ))}
             </div>
          </div>
        </motion.div>

        {/* CONTENIDO DEL COMPARADOR */}
        {p1 && p2 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} className="space-y-10 relative">

            {/* FOTOS DE JUGADORES Y ETIQUETA DE ARQUETIPO CON TOOLTIP MAGICO */}
            <div className="relative z-40 p-8 md:p-14 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-[3rem]">
              
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
                <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]" />
                <div className="absolute -left-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.15) }} />
                <div className="absolute -right-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.15) }} />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                
                {/* JUGADOR 1 */}
                <div className="flex flex-col items-center text-center space-y-5 flex-1 relative z-[100]">
                  <div className="relative group z-10">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color1, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color1, 0.3)}`, '--tw-ring-color': hexToRgba(color1, 0.2) } as any}>
                      <AvatarImage src={p1.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p1.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1 z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p1.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color1 }}>
                      {p1.teamId} <span className="text-muted-foreground">|</span> {p1Season}
                    </p>
                  </div>
                  
                  {/* TOOLTIP DE ARQUETIPO (HOVER) P1 */}
                  <div className="relative group/badge z-50">
                    <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 ${p1.archetype?.color}`} style={{ boxShadow: `0 0 20px ${hexToRgba(color1, 0.1)}` }}>
                      {p1.archetype?.icon && <p1.archetype.icon className="h-3.5 w-3.5" />}
                      {p1.archetype?.label}
                    </Badge>
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-[220px] h-[200px] bg-[#050914]/95 border border-white/10 rounded-2xl p-2 opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl pointer-events-none z-[100]">
                      <span className="text-[8px] text-center block text-white/50 mt-1 mb-1 font-mono uppercase tracking-widest">Individual DNA</span>
                      <ResponsiveContainer width="100%" height="85%">
                        {isNoData(p1) ? (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest text-center px-4">No data this season</span>
                          </div>
                        ) : (
                          <RadarChart data={getIndividualDNA(p1)} outerRadius="60%">
                            <PolarGrid stroke="rgba(255,255,255,0.05)" />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: 800 }} />
                            <Radar dataKey="val" stroke={color1} strokeWidth={1.5} fill={color1} fillOpacity={0.25} />
                          </RadarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 shrink-0 my-8 lg:my-0 opacity-0 pointer-events-none md:w-32"></div>

                {/* JUGADOR 2 */}
                <div className="flex flex-col items-center text-center space-y-5 flex-1 relative z-[100]">
                  <div className="relative group z-10">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color2, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color2, 0.3)}`, '--tw-ring-color': hexToRgba(color2, 0.2) } as any}>
                      <AvatarImage src={p2.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p2.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1 z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p2.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color2 }}>
                      {p2.teamId} <span className="text-muted-foreground">|</span> {p2Season}
                    </p>
                  </div>

                  {/* TOOLTIP DE ARQUETIPO (HOVER) P2 */}
                  <div className="relative group/badge z-50">
                    <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 ${p2.archetype?.color}`} style={{ boxShadow: `0 0 20px ${hexToRgba(color2, 0.1)}` }}>
                      {p2.archetype?.icon && <p2.archetype.icon className="h-3.5 w-3.5" />}
                      {p2.archetype?.label}
                    </Badge>
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-[220px] h-[200px] bg-[#050914]/95 border border-white/10 rounded-2xl p-2 opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl pointer-events-none z-[100]">
                      <span className="text-[8px] text-center block text-white/50 mt-1 mb-1 font-mono uppercase tracking-widest">Individual DNA</span>
                      <ResponsiveContainer width="100%" height="85%">
                        {isNoData(p2) ? (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest text-center px-4">No data this season</span>
                          </div>
                        ) : (
                          <RadarChart data={getIndividualDNA(p2)} outerRadius="60%">
                            <PolarGrid stroke="rgba(255,255,255,0.05)" />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: 800 }} />
                            <Radar dataKey="val" stroke={color2} strokeWidth={1.5} fill={color2} fillOpacity={0.25} />
                          </RadarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* OVERVIEW EXECUTIVE DASHBOARD (DNA) */}
            {activeTab === "dna" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
                   {/* Left: Giant Radar DNA */}
                   <div className="lg:col-span-6 w-full">
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col h-[500px]">
                        <div className="text-center mb-6 relative z-10">
                          <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg mb-1">Global Player DNA</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">Systemic Archetype Fingerprint</p>
                        </div>
                        <div className="w-full flex-1 relative z-10">
                          {(isNoData(p1) || isNoData(p2)) ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                              <span className="text-2xl">📊</span>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center px-4">
                                {isNoData(p1) && isNoData(p2)
                                  ? `No data available for ${p1?.name ?? 'P1'} and ${p2?.name ?? 'P2'}`
                                  : isNoData(p1)
                                  ? `No data available for ${p1?.name ?? 'P1'}`
                                  : `No data available for ${p2?.name ?? 'P2'}`
                                }
                              </p>
                              <p className="text-[9px] text-slate-600 text-center max-w-[220px]">
                                Please select a season where the athlete has logged official minutes.
                              </p>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData} outerRadius="65%">
                                <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 900 }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#050914', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', color: '#fff', fontWeight: '900', fontSize: '13px', backdropFilter: 'blur(20px)' }} itemStyle={{ padding: '4px 0' }} />
                                <Radar name={p1NameYear} dataKey="p1" stroke={color1} strokeWidth={3.5} fill={color1} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color1, strokeWidth: 3 }} activeDot={{ r: 8, fill: color1, stroke: "#fff", strokeWidth: 2 }} />
                                <Radar name={p2NameYear} dataKey="p2" stroke={color2} strokeWidth={3.5} fill={color2} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color2, strokeWidth: 3 }} activeDot={{ r: 8, fill: color2, stroke: "#fff", strokeWidth: 2 }} />
                              </RadarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                   </div>
                   
                   {/* Right: AI Verdict */}
                   <div className="lg:col-span-6 w-full flex flex-col min-h-[500px]">
                      <div className="relative bg-[#030712]/50 border border-emerald-500/[0.15] rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex-1 flex flex-col justify-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                        <div className="flex items-center gap-6 mb-8">
                          <div className="shrink-0 w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                            <Brain className="h-8 w-8 text-emerald-400 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-black uppercase tracking-[0.3em] text-white">Scouting Report</h3>
                            <p className="text-[10px] font-bold text-emerald-400/70 font-mono tracking-widest mt-1">Systemic Archetype Analysis</p>
                          </div>
                        </div>
                        {aiVerdict ? aiVerdict : (
                           <div className="text-sm md:text-base text-slate-500 leading-relaxed font-medium italic">
                             The neural engine requires both athletes to have valid statistical profiles in the selected season to generate a comparative tactical report.
                           </div>
                        )}
                      </div>
                   </div>
                </motion.div>
            )}

            {/* SHOOTING TAB (MAPA DE TIRO) */}
            {activeTab === "shooting" && (
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full relative min-h-[500px]">
                 {isShootingLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050914]/50 backdrop-blur-sm rounded-[2rem] border border-white/5">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-mono">Fetching Exact Shot Coordinates...</p>
                    </div>
                 ) : (
                    <ShootingComparison player1={mapPlayerToShootingProfile(p1, color1, p1RawShots)!} player2={mapPlayerToShootingProfile(p2, color2, p2RawShots)!} />
                 )}
               </motion.div>
            )}
            
            {/* RESTO DE TABS (BOX SCORE, SCORING, PLAYMAKING, DEFENSE, IMPACT, CLUTCH) */}
            {activeTab !== "dna" && activeTab !== "shooting" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                  
                  {/* LEFT COLUMN: RADAR + AI VERDICT */}
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="lg:col-span-5 w-full sticky top-8 space-y-6">
                    
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col group hover:border-white/[0.08] transition-colors duration-500">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.06) }} />
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.06) }} />
                      
                      <div className="text-center mb-10 relative z-10">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg mb-1">
                          {activeTab === 'boxscore' ? 'Box Score Hologram' : 
                           activeTab === 'scoring' ? 'Scoring Hologram' : 
                           activeTab === 'playmaking' ? 'Playmaking Hologram' : 
                           activeTab === 'defense' ? 'Defensive Hologram' : 
                           activeTab === 'impact' ? 'Impact Hologram' : 
                           'Clutch Hologram'}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">League Percentile (0-100)</p>
                      </div>

                      <div className="w-full h-[380px] relative z-10">
                         {(isNoData(p1) || isNoData(p2)) ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                              <span className="text-2xl">📊</span>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center px-4">
                                Insufficient Data
                              </p>
                            </div>
                         ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData} outerRadius="60%">
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
                         )}
                      </div>
                    </div>

                    {aiVerdict && (
                       <div className="bg-[#030712]/50 border border-emerald-500/[0.15] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                         <div className="flex items-center gap-4 mb-5">
                           <Brain className="h-6 w-6 text-emerald-400 animate-pulse" />
                           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 font-mono">Neural Verdict</h3>
                         </div>
                         {aiVerdict}
                       </div>
                    )}

                  </motion.div>

                  {/* RIGHT COLUMN: TUG BARS */}
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="lg:col-span-7 w-full">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden hover:border-white/[0.08] transition-colors duration-500 flex flex-col h-full">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      
                      <div className="flex flex-col items-center mb-8 relative z-10 border-b border-white/[0.05] pb-6">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-3 font-mono">
                            {activeTab === 'clutch' ? 'Clutch Dominance' : 'Category Dominance'}
                         </h3>
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
                              <TugBar key={i} label={s.label} v1={s.v1} v2={s.v2} c1={color1} c2={color2} reverse={s.reverse} showPlus={s.showPlus} isPct={s.isPct} />
                            ))}
                          </div>
                      )}
                    </div>
                  </motion.div>
                </div>
            )}

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
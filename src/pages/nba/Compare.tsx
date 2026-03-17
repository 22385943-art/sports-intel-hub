import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, PolarRadiusAxis
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Sparkles, Flame, Target, Shield,
  Crosshair, Activity, Zap, Brain, Crown, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { NBAPlayer } from "@/data/nba/mockData";

// --- LOGIC ---
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

// --- LUXURY COMBOBOX ---
const PlayerCombobox = ({
  value, onChange, season, onSeasonChange, side,
}: {
  value: string; onChange: (id: string, playerObj: any) => void; 
  season: string; onSeasonChange: (s: string) => void;
  side: "blue" | "rose";
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
        if (fetched.length === 0) setIsError(true);
        setPlayers(fetched);
        
        if (value) {
            const playerInNewSeason = fetched.find(p => p.id === value);
            if (playerInNewSeason) {
                onChange(value, { ...playerInNewSeason, archetype: getArchetype(playerInNewSeason) });
            } else {
                onChange("", null);
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
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const accent = side === "blue"
    ? { ring: "border-cyan-500/40 focus-within:border-cyan-500", glow: "shadow-[0_0_30px_rgba(34,211,238,0.15)]", hoverGlow: "hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]", hover: "hover:bg-cyan-500/[0.04]", text: "text-cyan-400", dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" }
    : { ring: "border-rose-500/40 focus-within:border-rose-500", glow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]", hoverGlow: "hover:shadow-[0_0_40px_rgba(244,63,94,0.25)]", hover: "hover:bg-rose-500/[0.04]", text: "text-rose-400", dot: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" };

  return (
    <div className="relative w-full z-50 flex flex-col md:flex-row gap-3" ref={ref}>
      <div className="relative flex-1">
          <button
            onClick={() => setOpen(!open)}
            className={`w-full bg-white/[0.02] backdrop-blur-3xl border ${accent.ring} h-16 rounded-[1.25rem] px-6 flex items-center justify-between ${accent.hover} ${accent.glow} ${accent.hoverGlow} transition-all duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${accent.dot}`} />
              <span className={`font-black text-lg tracking-tight ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                {selected ? selected.name : "Select NBA Player..."}
              </span>
            </div>
            {isLoadingPlayers ? <Loader2 className={`h-5 w-5 animate-spin ${accent.text}`} /> : <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-500 ${open ? "rotate-180" : ""}`} />}
          </button>
          
          <AnimatePresence>
            {open && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-full mt-3 w-full bg-[#050914]/95 backdrop-blur-3xl border border-white/[0.1] rounded-[1.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,1)] overflow-hidden z-[100]"
              >
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                  <Search className="h-5 w-5 text-slate-500" />
                  <input autoFocus placeholder={`Search terminal for ${season}...`} value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-transparent text-foreground text-sm font-bold placeholder:text-slate-600 focus:outline-none" />
                </div>
                
                <div className="max-h-[350px] overflow-y-auto scrollbar-premium">
                  {isLoadingPlayers ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Loader2 className={`animate-spin w-8 h-8 ${accent.text}`} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-mono">Decrypting Archives</span>
                    </div>
                  ) : isError ? (
                    <div className="text-center py-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-mono">Data unavailable for {season}</div>
                  ) : (
                    filtered.map((p, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        key={p.id} onClick={() => { onChange(p.id, p); setOpen(false); setSearch(""); }}
                        className={`p-4 flex items-center gap-4 cursor-pointer ${accent.hover} transition-colors duration-200 mx-2 my-1 rounded-xl border-l-2 border-transparent focus-within:${accent.ring} ${value === p.id ? `bg-white/[0.04] border-l-${side === 'blue' ? 'cyan-400' : 'rose-400'}` : ""}`}
                      >
                        <Avatar className={`h-11 w-11 border border-white/[0.1] bg-[#030712] shadow-lg ring-2 ring-offset-2 ring-offset-[#050914] ${value === p.id ? (side === 'blue' ? 'ring-cyan-500/50' : 'ring-rose-500/50') : 'ring-transparent'}`}>
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
          className={`w-full md:w-40 bg-white/[0.02] backdrop-blur-3xl border ${accent.ring} h-16 rounded-[1.25rem] px-5 text-xs font-mono font-black outline-none cursor-pointer ${accent.text} ${accent.hover} ${accent.glow} transition-all duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] appearance-none`}
      >
          {generateSeasons().map(s => <option key={s} value={s} className="bg-[#050914] text-foreground font-mono">{s}</option>)}
      </select>
    </div>
  );
};

// --- NEON TUG BAR ---
const TugBar = ({ label, icon, v1, v2, reverse = false }: { label: string; icon: React.ReactNode; v1: number; v2: number; reverse?: boolean }) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  
  let winner = v1 > v2 ? "p1" : v2 > v1 ? "p2" : "tie";
  if (reverse) winner = v1 < v2 ? "p1" : v2 < v1 ? "p2" : "tie";

  return (
    <div className="group py-5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-all duration-500 px-4 rounded-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`text-2xl md:text-3xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p1" ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" : "text-muted-foreground/30"}`}
        >
          {v1.toFixed(1)}
        </motion.span>
        
        <div className="flex items-center gap-2 group-hover:-translate-y-0.5 transition-transform duration-500">
          <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground group-hover:text-foreground/80 transition-colors font-mono">{label}</span>
        </div>

        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`text-2xl md:text-3xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p2" ? "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "text-muted-foreground/30"}`}
        >
          {v2.toFixed(1)}
        </motion.span>
      </div>

      {/* The Neon Track */}
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-[#000000] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] border border-white/[0.03]">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${p1Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="absolute left-0 top-0 h-full rounded-l-full"
          style={{
            background: winner === "p1" ? "linear-gradient(90deg, rgba(34,211,238,0.2), rgba(34,211,238,1))" : "linear-gradient(90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))",
            boxShadow: winner === "p1" ? "0 0 20px rgba(34,211,238,0.8), inset 0 1px 2px rgba(255,255,255,0.3)" : "none",
          }}
        />
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${p2Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="absolute right-0 top-0 h-full rounded-r-full"
          style={{
            background: winner === "p2" ? "linear-gradient(-90deg, rgba(244,63,94,0.2), rgba(244,63,94,1))" : "linear-gradient(-90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))",
            boxShadow: winner === "p2" ? "0 0 20px rgba(244,63,94,0.8), inset 0 1px 2px rgba(255,255,255,0.3)" : "none",
          }}
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-[#030712] z-10 shadow-[0_0_10px_rgba(0,0,0,1)]" />
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function ComparePlayers() {
  const [isLoading, setIsLoading] = useState(true);
  
  const [p1Id, setP1Id] = useState("203999");
  const [p1Season, setP1Season] = useState("2025-26");
  const [p1Data, setP1Data] = useState<any>(null);

  const [p2Id, setP2Id] = useState("1629029");
  const [p2Season, setP2Season] = useState("2025-26");
  const [p2Data, setP2Data] = useState<any>(null);

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers("2025-26").then(players => {
      const jokic = players.find(p => p.id === "203999") || players[0];
      const luka = players.find(p => p.id === "1629029") || players[1];
      setP1Data({ ...jokic, archetype: getArchetype(jokic) });
      setP2Data({ ...luka, archetype: getArchetype(luka) });
      setIsLoading(false);
    });
  }, []);

  const p1 = p1Data;
  const p2 = p2Data;

  const radarData = useMemo(() => {
    if (!p1 || !p2 || !p1.percentiles || !p2.percentiles) return [];
    return [
      { stat: "Scoring", p1: p1.percentiles.Scoring, p2: p2.percentiles.Scoring },
      { stat: "Playmaking", p1: p1.percentiles.Playmaking, p2: p2.percentiles.Playmaking },
      { stat: "Efficiency", p1: p1.percentiles.Efficiency, p2: p2.percentiles.Efficiency },
      { stat: "Defense", p1: p1.percentiles.Defense, p2: p2.percentiles.Defense },
      { stat: "Impact", p1: p1.percentiles.Impact, p2: p2.percentiles.Impact },
      { stat: "Rebounding", p1: p1.percentiles.Rebounding, p2: p2.percentiles.Rebounding },
    ];
  }, [p1, p2]);

  const statBars = useMemo(() => {
    if (!p1 || !p2) return [];
    return [
      { label: "PPG", v1: p1.stats.ppg, v2: p2.stats.ppg, icon: <Flame className="w-4 h-4 text-orange-500" /> },
      { label: "RPG", v1: p1.stats.rpg, v2: p2.stats.rpg, icon: <Shield className="w-4 h-4 text-slate-400" /> },
      { label: "APG", v1: p1.stats.apg, v2: p2.stats.apg, icon: <Activity className="w-4 h-4 text-purple-400" /> },
      { label: "SPG", v1: p1.stats.spg, v2: p2.stats.spg, icon: <Target className="w-4 h-4 text-rose-500" /> }, 
      { label: "BPG", v1: p1.stats.bpg, v2: p2.stats.bpg, icon: <ShieldAlert className="w-4 h-4 text-slate-500" /> }, 
      { label: "TS%", v1: p1.adv?.ts || 0, v2: p2.adv?.ts || 0, icon: <Target className="w-4 h-4 text-emerald-400" /> },
      { label: "USG%", v1: p1.adv?.usg || 0, v2: p2.adv?.usg || 0, icon: <Zap className="w-4 h-4 text-amber-400" /> },
      { label: "PIE", v1: p1.adv?.pie || 0, v2: p2.adv?.pie || 0, icon: <Crown className="w-4 h-4 text-blue-400" /> },
      { label: "TOV", v1: p1.stats.topg, v2: p2.stats.topg, icon: <ShieldAlert className="w-4 h-4 text-rose-500" />, reverse: true },
    ];
  }, [p1, p2]);

  const aiVerdict = useMemo(() => {
    if (!p1 || !p2) return "";
    const name1 = `${p1.name} ('${p1Season.substring(2,4)})`;
    const name2 = `${p2.name} ('${p2Season.substring(2,4)})`;
    
    const impactWinner = (p1.adv?.bpm || 0) > (p2.adv?.bpm || 0) ? name1 : name2;
    const scoringWinner = p1.stats.ppg > p2.stats.ppg ? name1 : name2;
    const effWinner = (p1.adv?.ts || 0) > (p2.adv?.ts || 0) ? name1 : name2;
    const playWinner = p1.stats.apg > p2.stats.apg ? name1 : name2;

    if (p1.adv?.bpm === p2.adv?.bpm) return `Neural Analysis concludes a statistical deadlock. Both athletes represent identical tiers of systemic dominance in their respective eras.`;

    return `${impactWinner} dictates the overall algorithmic advantage via Box Plus/Minus. While ${scoringWinner} commands the superior scoring volume, ${effWinner} operates with peak true shooting efficiency. Playmaking engine favors ${playWinner}. Overall archetype synergy leans toward the more impactful metric profile.`;
  }, [p1, p2, p1Season, p2Season]);

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
        
        {/* HEADER & SELECTORS */}
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
            <PlayerCombobox value={p1Id} onChange={(id, p) => { setP1Id(id); if(p) setP1Data({...p, archetype: getArchetype(p)}); else setP1Data(null); }} season={p1Season} onSeasonChange={setP1Season} side="blue" />
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#050914] border border-white/[0.08] flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.05),inset_0_2px_4px_rgba(255,255,255,0.05)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-rose-500/10" />
                <span className="text-sm font-black text-white tracking-[0.2em] relative z-10 font-mono">VS</span>
              </div>
            </div>
            <PlayerCombobox value={p2Id} onChange={(id, p) => { setP2Id(id); if(p) setP2Data({...p, archetype: getArchetype(p)}); else setP2Data(null); }} season={p2Season} onSeasonChange={setP2Season} side="rose" />
          </div>
        </motion.div>

        {p1 && p2 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} className="space-y-10">

            {/* 🚀 VIP HERO BANNER */}
            <div className="relative rounded-[3rem] overflow-hidden bg-white/[0.02] border border-white/[0.05] p-8 md:p-14 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
              <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] pointer-events-none rounded-[3rem]" />
              <div className="absolute -left-40 -top-40 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[150px] pointer-events-none" />
              <div className="absolute -right-40 -top-40 w-[500px] h-[500px] bg-rose-500/15 rounded-full blur-[150px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                
                {/* Player A (Cyan) */}
                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] shadow-[0_0_60px_rgba(34,211,238,0.3)] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] ring-cyan-500/20 group-hover:ring-cyan-400/60 transition-all duration-500">
                      <AvatarImage src={p1.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p1.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p1.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 font-mono">
                      {p1.teamId} <span className="text-muted-foreground">|</span> {p1Season}
                    </p>
                  </div>
                  <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 ${p1.archetype?.color} shadow-[0_0_20px_rgba(34,211,238,0.1)]`}>
                    {p1.archetype?.icon && <p1.archetype.icon className="h-3.5 w-3.5" />}
                    {p1.archetype?.label}
                  </Badge>
                </div>

                {/* VS Center Diamond */}
                <div className="flex flex-col items-center gap-3 shrink-0 my-8 lg:my-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-rose-500/30 rounded-3xl blur-2xl scale-150 animate-pulse" />
                    <div className="relative w-24 h-24 md:w-32 md:h-32 bg-[#050914]/90 border border-white/[0.1] rounded-[2rem] flex items-center justify-center backdrop-blur-2xl shadow-2xl rotate-45 hover:scale-110 hover:rotate-90 transition-all duration-700 ease-out shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                      <span className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-white to-rose-400 -rotate-45 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">VS</span>
                    </div>
                  </div>
                </div>

                {/* Player B (Rose) */}
                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] shadow-[0_0_60px_rgba(244,63,94,0.3)] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] ring-rose-500/20 group-hover:ring-rose-400/60 transition-all duration-500">
                      <AvatarImage src={p2.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{p2.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{p2.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400 font-mono">
                      {p2.teamId} <span className="text-muted-foreground">|</span> {p2Season}
                    </p>
                  </div>
                  <Badge className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] border flex items-center gap-2 ${p2.archetype?.color} shadow-[0_0_20px_rgba(244,63,94,0.1)]`}>
                    {p2.archetype?.icon && <p2.archetype.icon className="h-3.5 w-3.5" />}
                    {p2.archetype?.label}
                  </Badge>
                </div>

              </div>
            </div>

            {/* 🚀 HOLOGRAPHIC RADAR & NEON TUGBARS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="lg:col-span-5">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden h-full flex flex-col group hover:border-white/[0.08] transition-colors duration-500">
                  <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/[0.08] transition-colors duration-1000" />
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-rose-500/[0.04] rounded-full blur-[100px] pointer-events-none group-hover:bg-rose-500/[0.08] transition-colors duration-1000" />
                  
                  <div className="text-center mb-10 relative z-10">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg mb-1">Style DNA Hologram</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">League Percentile (0-100)</p>
                  </div>

                  <div className="flex-1 min-h-[380px] relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 900 }} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#050914', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', color: '#fff', fontWeight: '900', fontSize: '13px', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }} 
                          itemStyle={{ padding: '4px 0' }}
                        />
                        <Radar name={p1.name} dataKey="p1" stroke="#22d3ee" strokeWidth={3.5} fill="#22d3ee" fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: "#22d3ee", strokeWidth: 3 }} activeDot={{ r: 8, fill: "#22d3ee", stroke: "#fff", strokeWidth: 2 }} />
                        <Radar name={p2.name} dataKey="p2" stroke="#f43f5e" strokeWidth={3.5} fill="#f43f5e" fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: "#f43f5e", strokeWidth: 3 }} activeDot={{ r: 8, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="lg:col-span-7">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl h-full relative overflow-hidden hover:border-white/[0.08] transition-colors duration-500">
                  <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <span className="text-[12px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/[0.08] px-4 py-1.5 rounded-lg border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">{p1.name.split(" ").pop()}</span>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white text-center drop-shadow-md">Tale of the Tape</h3>
                    <span className="text-[12px] font-black uppercase tracking-[0.25em] text-rose-400 bg-rose-500/[0.08] px-4 py-1.5 rounded-lg border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">{p2.name.split(" ").pop()}</span>
                  </div>
                  
                  <div className="divide-y divide-white/[0.02] space-y-2 relative z-10">
                    {statBars.map((s, i) => (
                      <TugBar key={i} label={s.label} icon={s.icon} v1={s.v1} v2={s.v2} reverse={s.reverse} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 🚀 NEURAL TERMINAL VERDICT */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="relative bg-[#030712]/50 border border-emerald-500/[0.15] rounded-[2.5rem] p-10 md:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden group hover:border-emerald-500/30 transition-all duration-700 backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 group-hover:bg-emerald-500/[0.08]" />
              
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
                  <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
                    {aiVerdict}
                  </p>
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
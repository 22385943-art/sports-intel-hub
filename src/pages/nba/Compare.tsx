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
import type { NBAPlayer } from "@/data/nba/mockData";
import { motion } from "framer-motion";

const getArchetype = (p: any) => {
  if (!p || !p.stats || !p.adv) return { label: "Unknown", icon: Activity, color: "text-slate-400 bg-white/[0.03] border-white/[0.06]" };
  const { ppg, rpg, apg, bpg, spg, threePct, fgPct, fta } = p.stats;
  const { usg, defRating, astPct, ts, pie } = p.adv;

  const isHighVolume = usg >= 27;
  const isEfficient = ts >= 60;
  const isEliteDefender = defRating > 0 && defRating <= 111; 
  const isShooter = threePct >= 37.0 && ppg >= 8; 
  const isSlasher = fta >= 5.5 && fgPct >= 50 && threePct <= 34;
  const isUnicorn = bpg >= 2.0 && threePct >= 31 && rpg >= 8;

  if (pie >= 16 && ppg >= 23) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20" };
    if (apg >= 8) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20" };
    if (isShooter && isEfficient) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20" };
  }
  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20" };
  if (apg >= 8 || astPct >= 35) return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/[0.08] border-purple-400/20" };
  if (rpg >= 8.5) {
     if (threePct >= 35) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/[0.08] border-teal-400/20" };
     if ((bpg >= 1.5 || isEliteDefender) && threePct <= 30) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/[0.08] border-rose-400/20" };
     if (apg >= 4.5) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/[0.08] border-purple-400/20" };
     return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/[0.08] border-blue-400/20" };
  }
  if (isSlasher && ppg >= 18) return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/[0.08] border-rose-500/20" };
  if (isShooter && ppg >= 18) {
     if (isHighVolume) return { label: "Shot Creator", icon: Zap, color: "text-cyan-400 bg-cyan-400/[0.08] border-cyan-400/20" };
     return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20" };
  }
  if (isShooter && isEliteDefender && usg < 22) return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/[0.08] border-emerald-500/20" };
  if (isEliteDefender && (spg >= 1.4 || bpg >= 1.0) && usg < 18) return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/[0.08] border-red-500/20" };
  if (isShooter && usg < 20) return { label: "Catch & Shoot", icon: Crosshair, color: "text-teal-400 bg-teal-400/[0.08] border-teal-400/20" };
  if (ppg >= 14 && isHighVolume && !isEfficient) return { label: "Microwave Scorer", icon: Zap, color: "text-orange-400 bg-orange-400/[0.08] border-orange-400/20" };
  if (ppg >= 10 && rpg >= 4 && apg >= 3) return { label: "Connective Glue", icon: Activity, color: "text-blue-300 bg-blue-300/[0.08] border-blue-300/20" };

  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/[0.03] border-white/[0.06]" };
};

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
    ? { ring: "border-cyan-500/30", glow: "shadow-[0_0_40px_rgba(34,211,238,0.08)]", hover: "hover:bg-cyan-500/[0.06]", text: "text-cyan-400" }
    : { ring: "border-rose-500/30", glow: "shadow-[0_0_40px_rgba(244,63,94,0.08)]", hover: "hover:bg-rose-500/[0.06]", text: "text-rose-400" };

  return (
    <div className="relative w-full z-50 flex flex-col md:flex-row gap-2" ref={ref}>
      <div className="relative flex-1">
          <button
            onClick={() => setOpen(!open)}
            className={`w-full bg-white/[0.02] backdrop-blur-xl border ${accent.ring} h-14 rounded-2xl px-6 flex items-center justify-between ${accent.hover} ${accent.glow} transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]`}
          >
            <span className={`font-black text-lg tracking-tight ${selected ? "text-white" : "text-slate-600"}`}>
              {selected ? selected.name : "Select Player..."}
            </span>
            {isLoadingPlayers ? <Loader2 className="h-4 w-4 animate-spin text-slate-600" /> : <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />}
          </button>
          
          {open && (
            <div className="absolute top-full mt-2 w-full bg-[#030712]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
              <div className="p-3 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                <Search className="h-4 w-4 text-slate-600" />
                <input autoFocus placeholder={`Search player in ${season}...`} value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent text-white text-sm font-bold placeholder:text-slate-700 focus:outline-none" />
              </div>
              
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.06]">
                {isLoadingPlayers ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-600" /></div>
                ) : isError ? (
                  <div className="text-center p-6 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Data unavailable for {season}</div>
                ) : (
                  filtered.map(p => (
                    <div key={p.id} onClick={() => { onChange(p.id, p); setOpen(false); setSearch(""); }}
                      className={`p-3 flex items-center gap-3 cursor-pointer ${accent.hover} transition-colors duration-200 ${value === p.id ? "bg-white/[0.04]" : ""}`}>
                      <Avatar className="h-9 w-9 border border-white/[0.06] bg-white">
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="bg-slate-900 text-[10px] text-slate-500 font-bold">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.25em]">{p.teamId}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
      </div>

      <select 
          value={season} 
          onChange={(e) => { onSeasonChange(e.target.value); setOpen(true); }} 
          className={`bg-white/[0.02] backdrop-blur-xl border ${accent.ring} h-14 rounded-2xl px-4 text-[10px] sm:text-xs font-black outline-none cursor-pointer ${accent.text} ${accent.hover} transition-colors`}
      >
          {generateSeasons().map(s => <option key={s} value={s} className="bg-[#030712] text-white">{s}</option>)}
      </select>
    </div>
  );
};

const TugBar = ({ label, icon, v1, v2, reverse = false }: { label: string; icon: React.ReactNode; v1: number; v2: number; reverse?: boolean }) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  
  let winner = v1 > v2 ? "p1" : v2 > v1 ? "p2" : "tie";
  if (reverse) winner = v1 < v2 ? "p1" : v2 < v1 ? "p2" : "tie";

  return (
    <div className="group py-4 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.01] transition-all duration-300 px-2 rounded-lg">
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xl md:text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p1" ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "text-slate-700"}`}>
          {v1.toFixed(1)}
        </span>
        <div className="flex items-center gap-2 group-hover:-translate-y-0.5 transition-transform">
          {icon}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover:text-slate-400 transition-colors">{label}</span>
        </div>
        <span className={`text-xl md:text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p2" ? "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" : "text-slate-700"}`}>
          {v2.toFixed(1)}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
        <div className="absolute left-0 top-0 h-full rounded-l-full transition-all duration-1000 ease-out"
          style={{
            width: `${p1Pct}%`,
            background: winner === "p1"
              ? "linear-gradient(90deg, rgba(34,211,238,0.15), rgba(34,211,238,0.7))"
              : "linear-gradient(90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.25))",
            boxShadow: winner === "p1" ? "0 0 25px rgba(34,211,238,0.35)" : "none",
          }} />
        <div className="absolute right-0 top-0 h-full rounded-r-full transition-all duration-1000 ease-out"
          style={{
            width: `${p2Pct}%`,
            background: winner === "p2"
              ? "linear-gradient(-90deg, rgba(244,63,94,0.15), rgba(244,63,94,0.7))"
              : "linear-gradient(-90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.25))",
            boxShadow: winner === "p2" ? "0 0 25px rgba(244,63,94,0.35)" : "none",
          }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#030712] z-10" />
      </div>
    </div>
  );
};

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
      { label: "PPG", v1: p1.stats.ppg, v2: p2.stats.ppg, icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
      { label: "RPG", v1: p1.stats.rpg, v2: p2.stats.rpg, icon: <Shield className="w-3.5 h-3.5 text-slate-400" /> },
      { label: "APG", v1: p1.stats.apg, v2: p2.stats.apg, icon: <Activity className="w-3.5 h-3.5 text-purple-400" /> },
      { label: "SPG", v1: p1.stats.spg, v2: p2.stats.spg, icon: <Target className="w-3.5 h-3.5 text-rose-500" /> }, 
      { label: "BPG", v1: p1.stats.bpg, v2: p2.stats.bpg, icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> }, 
      { label: "TS%", v1: p1.adv?.ts || 0, v2: p2.adv?.ts || 0, icon: <Target className="w-3.5 h-3.5 text-emerald-400" /> },
      { label: "USG%", v1: p1.adv?.usg || 0, v2: p2.adv?.usg || 0, icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
      { label: "PIE", v1: p1.adv?.pie || 0, v2: p2.adv?.pie || 0, icon: <Crown className="w-3.5 h-3.5 text-blue-400" /> },
      { label: "TOV", v1: p1.stats.topg, v2: p2.stats.topg, icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />, reverse: true },
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

    if (p1.adv?.bpm === p2.adv?.bpm) return `Both athletes represent identical levels of statistical dominance in their respective seasons. A coin toss match-up.`;

    return `${impactWinner} holds the overall impact advantage based on Box Plus/Minus metrics. While ${scoringWinner} commands the scoring volume, ${effWinner} operates with superior true shooting efficiency. In terms of floor generalship, ${playWinner} generates more direct assist opportunities.`;
  }, [p1, p2, p1Season, p2Season]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 animate-in fade-in">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-600 animate-pulse">Initializing Time Machine Engine...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen text-white pb-20"
    >
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center mb-8">
          <Badge className="bg-white/[0.03] border-white/[0.06] text-slate-500 font-black text-[8px] uppercase tracking-[0.3em] px-5 py-1.5 mb-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
            Time Machine Scouting
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
            Versus <span className="bg-gradient-to-r from-cyan-400 to-rose-400 bg-clip-text">Mode</span>
          </h1>
        </div>
        
        {/* SELECTORS */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <PlayerCombobox value={p1Id} onChange={(id, p) => { setP1Id(id); if(p) setP1Data({...p, archetype: getArchetype(p)}); else setP1Data(null); }} season={p1Season} onSeasonChange={setP1Season} side="blue" />
          <div className="hidden md:flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <span className="text-xs font-black text-slate-600">VS</span>
            </div>
          </div>
          <PlayerCombobox value={p2Id} onChange={(id, p) => { setP2Id(id); if(p) setP2Data({...p, archetype: getArchetype(p)}); else setP2Data(null); }} season={p2Season} onSeasonChange={setP2Season} side="rose" />
        </div>
      </div>

      {p1 && p2 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-6xl mx-auto px-6 space-y-8"
        >

          {/* HEAD TO HEAD */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-white/[0.02] border border-white/[0.05] p-8 md:p-12 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-cyan-500/[0.05] rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-rose-500/[0.05] rounded-full blur-[150px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Player A */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-3xl scale-[1.5]" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.25)] bg-white">
                    <AvatarImage src={p1.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p1.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{p1.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">{p1.teamId} '{p1Season.substring(2,4)}</span>
                  <Badge className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] border flex items-center gap-1 ${p1.archetype?.color}`}>
                    {p1.archetype?.icon && <p1.archetype.icon className="h-2.5 w-2.5" />}
                    {p1.archetype?.label}
                  </Badge>
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-3 shrink-0 my-4 md:my-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 to-rose-500/15 rounded-2xl blur-xl scale-[2]" />
                  <div className="relative w-16 h-16 md:w-24 md:h-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.06)] rotate-45 hover:scale-105 transition-transform duration-300">
                    <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-rose-400 -rotate-45">VS</span>
                  </div>
                </div>
                <Hexagon className="h-4 w-4 text-slate-800 animate-pulse mt-4" />
              </div>

              {/* Player B */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-rose-500/15 blur-3xl scale-[1.5]" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.25)] bg-white">
                    <AvatarImage src={p2.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p2.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{p2.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">{p2.teamId} '{p2Season.substring(2,4)}</span>
                  <Badge className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] border flex items-center gap-1 ${p2.archetype?.color}`}>
                    {p2.archetype?.icon && <p2.archetype.icon className="h-2.5 w-2.5" />}
                    {p2.archetype?.label}
                  </Badge>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] relative overflow-hidden h-full flex flex-col">
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-rose-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-600 mb-2 text-center">Style DNA Overlay</h3>
                <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.25em] mb-6 text-center">Percentile Rank (0-100)</p>
                <div className="flex-1 min-h-[300px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="65%">
                      <PolarGrid stroke="rgba(255,255,255,0.03)" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 800 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#030712', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                      <Radar name={p1.name} dataKey="p1" stroke="#22d3ee" strokeWidth={3} fill="#22d3ee" fillOpacity={0.12} dot={{ r: 3, fill: "#030712", stroke: "#22d3ee", strokeWidth: 2 }} />
                      <Radar name={p2.name} dataKey="p2" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.12} dot={{ r: 3, fill: "#030712", stroke: "#f43f5e", strokeWidth: 2 }} />
                      <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: "bold" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] h-full">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{p1.name.split(" ").pop()}</span>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-600 text-center px-2">Tale of the Tape</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">{p2.name.split(" ").pop()}</span>
                </div>
                <div className="divide-y divide-transparent space-y-1">
                  {statBars.map((s, i) => (
                    <TugBar key={i} label={s.label} icon={s.icon} v1={s.v1} v2={s.v2} reverse={s.reverse} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 backdrop-blur-3xl shadow-[0_0_60px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] overflow-hidden group hover:border-white/[0.08] transition-all duration-500">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-500/[0.04] rounded-full blur-[120px] pointer-events-none group-hover:bg-purple-500/[0.06] transition-all duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-500/15 border border-white/[0.06] flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.12)]">
                <Sparkles className="h-6 w-6 text-purple-400 animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">AI Time Machine Verdict</h3>
                  <Badge className="bg-purple-500/[0.08] text-purple-400 border-purple-500/20 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5">
                    <Brain className="h-3 w-3 mr-1.5" /> Engine v2.0
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-4xl">
                  {aiVerdict}
                </p>
              </div>
            </div>
          </div>

        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
           <Hexagon className="h-16 w-16 text-slate-700 mb-4" />
           <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">Select players to initialize comparison</p>
        </div>
      )}
    </motion.div>
  );
}

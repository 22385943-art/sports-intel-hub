import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, PolarRadiusAxis
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Sparkles, Flame, Target, Shield,
  Crosshair, Activity, Zap, Brain, Crown, ShieldAlert // <-- Importado ShieldAlert
} from "lucide-react";
import type { NBAPlayer } from "@/data/nba/mockData";

/* ═══════════════════════════════════════════════════════
   🧠 IA SCOUTING V2.0: MOTOR DE ARQUETIPOS
   ═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   PLAYER SEARCH COMBOBOX
   ═══════════════════════════════════════════════════════ */
const PlayerCombobox = ({
  value, onChange, players, side,
}: {
  value: string; onChange: (id: string) => void; players: any[];
  side: "blue" | "rose";
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = players.find(p => p.id === value);
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const accent = side === "blue"
    ? { ring: "border-cyan-500/50", glow: "shadow-[0_0_30px_rgba(34,211,238,0.15)]", hover: "hover:bg-cyan-500/10", text: "text-cyan-400" }
    : { ring: "border-rose-500/50", glow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]", hover: "hover:bg-rose-500/10", text: "text-rose-400" };

  return (
    <div className="relative w-full z-50" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full bg-white/[0.03] border ${accent.ring} h-14 rounded-2xl px-6 flex items-center justify-between ${accent.hover} ${accent.glow} transition-all duration-300 backdrop-blur-md`}
      >
        <span className={`font-black text-lg tracking-tight ${selected ? "text-white" : "text-slate-500"}`}>
          {selected?.name || "Select Fighter"}
        </span>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#0c1221] border border-white/10 rounded-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl z-[100]">
          <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-white/[0.03]">
            <Search className="h-4 w-4 text-slate-500" />
            <input autoFocus placeholder="Search athlete..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-white text-sm font-bold placeholder:text-slate-600 focus:outline-none" />
          </div>
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {filtered.map(p => (
              <div key={p.id} onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }}
                className={`p-3 flex items-center gap-3 cursor-pointer ${accent.hover} transition-colors ${value === p.id ? "bg-white/[0.06]" : ""}`}>
                <Avatar className="h-9 w-9 border border-white/10 bg-white">
                  <AvatarImage src={p.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-slate-800 text-[10px] text-slate-400 font-bold">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.teamId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   TUG-OF-WAR STAT BAR
   ═══════════════════════════════════════════════════════ */
const TugBar = ({ label, icon, v1, v2, reverse = false }: { label: string; icon: React.ReactNode; v1: number; v2: number; reverse?: boolean }) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  
  let winner = v1 > v2 ? "p1" : v2 > v1 ? "p2" : "tie";
  if (reverse) winner = v1 < v2 ? "p1" : v2 < v1 ? "p2" : "tie";

  return (
    <div className="group py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition-all duration-300 px-2 rounded-lg">
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xl md:text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p1" ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-600"}`}>
          {v1.toFixed(1)}
        </span>
        <div className="flex items-center gap-2 group-hover:-translate-y-0.5 transition-transform">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
        </div>
        <span className={`text-xl md:text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p2" ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "text-slate-600"}`}>
          {v2.toFixed(1)}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-white/[0.04]">
        <div className="absolute left-0 top-0 h-full rounded-l-full transition-all duration-1000 ease-out"
          style={{
            width: `${p1Pct}%`,
            background: winner === "p1"
              ? "linear-gradient(90deg, rgba(34,211,238,0.1), rgba(34,211,238,0.6))"
              : "linear-gradient(90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.3))",
            boxShadow: winner === "p1" ? "0 0 20px rgba(34,211,238,0.3)" : "none",
          }} />
        <div className="absolute right-0 top-0 h-full rounded-r-full transition-all duration-1000 ease-out"
          style={{
            width: `${p2Pct}%`,
            background: winner === "p2"
              ? "linear-gradient(-90deg, rgba(244,63,94,0.1), rgba(244,63,94,0.6))"
              : "linear-gradient(-90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.3))",
            boxShadow: winner === "p2" ? "0 0 20px rgba(244,63,94,0.3)" : "none",
          }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#0a0f18] z-10" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPARE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ComparePlayers() {
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [p1Id, setP1Id] = useState("");
  const [p2Id, setP2Id] = useState("");

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then(players => {
      // INYECTAR DATA SCIENCE
      const playersWithAdv = players.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const archetype = getArchetype({ ...p, adv });
        return { ...p, adv, archetype };
      });

      // CALCULAR PERCENTILES
      const distributions: Record<string, number[]> = {
        ppg: playersWithAdv.map(p => p.stats.ppg).sort((a, b) => a - b),
        rpg: playersWithAdv.map(p => p.stats.rpg).sort((a, b) => a - b),
        apg: playersWithAdv.map(p => p.stats.apg).sort((a, b) => a - b),
        per: playersWithAdv.map(p => p.adv.per).sort((a, b) => a - b),
        bpm: playersWithAdv.map(p => p.adv.bpm).sort((a, b) => a - b),
        ts: playersWithAdv.map(p => p.adv.ts).sort((a, b) => a - b),
      };

      const calcP = (val: number, arr: number[]) => Math.round((arr.filter(v => v <= val).length / arr.length) * 100);

      const finalPlayers = playersWithAdv.map(p => ({
        ...p,
        pct: {
          Scoring: calcP(p.stats.ppg, distributions.ppg),
          Rebounding: calcP(p.stats.rpg, distributions.rpg),
          Playmaking: calcP(p.stats.apg, distributions.apg),
          Efficiency: calcP(p.adv.per, distributions.per),
          Impact: calcP(p.adv.bpm, distributions.bpm),
          Shooting: calcP(p.adv.ts, distributions.ts),
        }
      }));

      const sorted = finalPlayers.sort((a, b) => b.adv.per - a.adv.per);
      setAllPlayers(sorted);
      
      if (sorted.length >= 2) { 
        setP1Id(sorted[0].id); 
        setP2Id(sorted[1].id); 
      }
      setIsLoading(false);
    });
  }, []);

  const p1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [p1Id, allPlayers]);
  const p2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [p2Id, allPlayers]);

  const radarData = useMemo(() => {
    // 🚀 FIX DE SEGURIDAD: Comprobamos que el jugador y sus percentiles existan
    if (!p1 || !p2 || !p1.pct || !p2.pct) return [];
    return [
      { stat: "Scoring", p1: p1.pct.Scoring, p2: p2.pct.Scoring },
      { stat: "Playmaking", p1: p1.pct.Playmaking, p2: p2.pct.Playmaking },
      { stat: "Efficiency", p1: p1.pct.Efficiency, p2: p2.pct.Efficiency },
      { stat: "Impact", p1: p1.pct.Impact, p2: p2.pct.Impact },
      { stat: "Shooting", p1: p1.pct.Shooting, p2: p2.pct.Shooting },
      { stat: "Rebounding", p1: p1.pct.Rebounding, p2: p2.pct.Rebounding },
    ];
  }, [p1, p2]);

  const statBars = useMemo(() => {
    if (!p1 || !p2) return [];
    return [
      { label: "PPG", v1: p1.stats.ppg, v2: p2.stats.ppg, icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
      { label: "RPG", v1: p1.stats.rpg, v2: p2.stats.rpg, icon: <Shield className="w-3.5 h-3.5 text-slate-400" /> },
      { label: "APG", v1: p1.stats.apg, v2: p2.stats.apg, icon: <Activity className="w-3.5 h-3.5 text-purple-400" /> },
      { label: "TS%", v1: p1.adv.ts, v2: p2.adv.ts, icon: <Target className="w-3.5 h-3.5 text-emerald-400" /> },
      { label: "USG%", v1: p1.adv.usg, v2: p2.adv.usg, icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
      { label: "PER", v1: p1.adv.per, v2: p2.adv.per, icon: <Crown className="w-3.5 h-3.5 text-blue-400" /> },
      { label: "BPM", v1: p1.adv.bpm, v2: p2.adv.bpm, icon: <Activity className="w-3.5 h-3.5 text-emerald-500" /> },
      { label: "TOV", v1: p1.stats.topg, v2: p2.stats.topg, icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />, reverse: true },
    ];
  }, [p1, p2]);

  const aiVerdict = useMemo(() => {
    if (!p1 || !p2) return "";
    const name1 = p1.name.split(" ").pop();
    const name2 = p2.name.split(" ").pop();
    
    const impactWinner = p1.adv.bpm > p2.adv.bpm ? name1 : name2;
    const scoringWinner = p1.stats.ppg > p2.stats.ppg ? name1 : name2;
    const effWinner = p1.adv.ts > p2.adv.ts ? name1 : name2;
    const playWinner = p1.stats.apg > p2.stats.apg ? name1 : name2;

    if (p1.adv.bpm === p2.adv.bpm && p1.adv.per === p2.adv.per) return `Both athletes represent identical levels of statistical dominance. A coin toss match-up.`;

    return `${impactWinner} holds the overall impact advantage based on Box Plus/Minus metrics. While ${scoringWinner} commands the scoring volume, ${effWinner} operates with superior true shooting efficiency. In terms of floor generalship, ${playWinner} generates more direct assist opportunities. Ultimately, the matchup outcome depends heavily on team pace, usage allocation, and scheme assignments.`;
  }, [p1, p2]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 animate-in fade-in">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 animate-pulse">Initializing Matchup Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white pb-20 animate-in fade-in duration-700">

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center mb-8">
          <Badge className="bg-white/[0.04] border-white/10 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-5 py-1.5 mb-3 shadow-lg">
            Head-to-Head Scouting
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-white drop-shadow-md">
            Versus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">Mode</span>
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <PlayerCombobox value={p1Id} onChange={setP1Id} players={allPlayers} side="blue" />
          <div className="hidden md:flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <span className="text-xs font-black text-slate-500">VS</span>
            </div>
          </div>
          <PlayerCombobox value={p2Id} onChange={setP2Id} players={allPlayers} side="rose" />
        </div>
      </div>

      {p1 && p2 && (
        <div className="max-w-6xl mx-auto px-6 space-y-8 animate-in slide-in-from-bottom-8 duration-700">

          {/* VERSUS HERO BANNER */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent border border-white/[0.06] p-8 md:p-12 backdrop-blur-xl shadow-2xl">
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-cyan-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-rose-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Player A (Blue) */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl scale-125" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-cyan-500/40 shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-white">
                    <AvatarImage src={p1.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p1.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">{p1.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p1.teamId}</span>
                  <Badge className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${p1.archetype.color}`}>
                    <p1.archetype.icon className="h-2.5 w-2.5" />
                    {p1.archetype.label}
                  </Badge>
                </div>
              </div>

              {/* VS Hexagon Center */}
              <div className="flex flex-col items-center gap-3 shrink-0 my-4 md:my-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-rose-500/20 rounded-2xl blur-xl scale-150" />
                  <div className="relative w-16 h-16 md:w-24 md:h-24 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl rotate-45 hover:scale-105 transition-transform">
                    <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-rose-400 -rotate-45">VS</span>
                  </div>
                </div>
                <Hexagon className="h-4 w-4 text-slate-700 animate-pulse mt-4" />
              </div>

              {/* Player B (Rose) */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-2xl scale-125" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.3)] bg-white">
                    <AvatarImage src={p2.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p2.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">{p2.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p2.teamId}</span>
                  <Badge className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${p2.archetype.color}`}>
                    <p2.archetype.icon className="h-2.5 w-2.5" />
                    {p2.archetype.label}
                  </Badge>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* RADAR CHART (PERCENTILES) */}
            <div className="lg:col-span-5">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden h-full flex flex-col">
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-rose-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 text-center">Style DNA Overlay</h3>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-6 text-center">Percentile Rank (0-100)</p>
                <div className="flex-1 min-h-[300px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="65%">
                      <PolarGrid stroke="rgba(255,255,255,0.04)" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 800 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0a0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                      <Radar name={p1.name} dataKey="p1" stroke="#22d3ee" strokeWidth={2.5} fill="#22d3ee" fillOpacity={0.15} dot={{ r: 3, fill: "#0a0f18", stroke: "#22d3ee", strokeWidth: 2 }} />
                      <Radar name={p2.name} dataKey="p2" stroke="#f43f5e" strokeWidth={2.5} fill="#f43f5e" fillOpacity={0.15} dot={{ r: 3, fill: "#0a0f18", stroke: "#f43f5e", strokeWidth: 2 }} />
                      <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: "bold" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TUG-OF-WAR STAT BARS */}
            <div className="lg:col-span-7">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-2xl h-full">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{p1.name.split(" ").pop()}</span>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center px-2">Tale of the Tape</h3>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">{p2.name.split(" ").pop()}</span>
                </div>
                <div className="divide-y divide-transparent space-y-1">
                  {statBars.map((s, i) => (
                    <TugBar key={i} label={s.label} icon={s.icon} v1={s.v1} v2={s.v2} reverse={s.reverse} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ AI SCOUTING VERDICT ═══ */}
          <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 md:p-10 backdrop-blur-xl shadow-2xl overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-500/[0.06] rounded-full blur-[100px] pointer-events-none transition-all duration-500 group-hover:bg-purple-500/[0.1]" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">AI Neural Verdict</h3>
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                    <Brain className="h-3 w-3 mr-1.5" /> Engine v2.0
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium max-w-4xl">
                  {aiVerdict}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ TRUE IMPACT CARDS (PIE) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[2rem] bg-gradient-to-br from-cyan-500/[0.05] to-transparent border border-cyan-500/10 p-8 relative group hover:scale-[1.02] transition-all duration-300 shadow-xl overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-cyan-500/5 blur-3xl" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-3 relative z-10 flex items-center gap-2">
                <Target className="h-3 w-3" /> Player Impact Est. (PIE)
              </p>
              <p className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white relative z-10">
                {p1.adv.pie.toFixed(1)}<span className="text-2xl text-slate-500">%</span>
              </p>
            </div>
            <div className="rounded-[2rem] bg-gradient-to-br from-rose-500/[0.05] to-transparent border border-rose-500/10 p-8 relative group hover:scale-[1.02] transition-all duration-300 shadow-xl overflow-hidden md:text-right">
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-rose-500/5 blur-3xl" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 relative z-10 flex items-center md:justify-end gap-2">
                Player Impact Est. (PIE) <Target className="h-3 w-3" />
              </p>
              <p className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white relative z-10">
                {p2.adv.pie.toFixed(1)}<span className="text-2xl text-slate-500">%</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
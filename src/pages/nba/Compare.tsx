import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend,
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Sparkles, Flame, Target, Shield,
  Crosshair, Activity, Zap, Brain,
} from "lucide-react";
import type { NBAPlayer } from "@/data/nba/mockData";

/* ═══════════════════════════════════════════════════════
   ARCHETYPE ENGINE (lightweight version for Compare)
   ═══════════════════════════════════════════════════════ */
const getArchetype = (p: NBAPlayer) => {
  const s = p.stats;
  if (s.ppg >= 28 && s.apg >= 7) return "Offensive Hub";
  if (s.ppg >= 25 && s.rpg >= 10) return "Two-Way Force";
  if (s.ppg >= 25) return "Elite Scorer";
  if (s.rpg >= 10 && s.apg >= 6) return "Point-Center";
  if (s.rpg >= 10) return "Paint Anchor";
  if (s.apg >= 7) return "Floor General";
  if (s.bpg >= 2) return "Rim Protector";
  return "Versatile Wing";
};

/* ═══════════════════════════════════════════════════════
   PLAYER SEARCH COMBOBOX
   ═══════════════════════════════════════════════════════ */
const PlayerCombobox = ({
  value, onChange, players, side,
}: {
  value: string; onChange: (id: string) => void; players: NBAPlayer[];
  side: "blue" | "rose";
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = players.find(p => p.id === value);
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

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
        <div className="absolute top-full mt-2 w-full bg-[#0c1221] border border-white/10 rounded-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
          <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-white/[0.03]">
            <Search className="h-4 w-4 text-slate-500" />
            <input autoFocus placeholder="Search athlete..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-white text-sm font-bold placeholder:text-slate-600 focus:outline-none" />
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.map(p => (
              <div key={p.id} onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }}
                className={`p-3 flex items-center gap-3 cursor-pointer ${accent.hover} transition-colors ${value === p.id ? "bg-white/[0.06]" : ""}`}>
                <Avatar className="h-9 w-9 border border-white/10 bg-white">
                  <AvatarImage src={p.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-slate-800 text-[10px]">{p.name.substring(0, 2)}</AvatarFallback>
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
const TugBar = ({ label, icon, v1, v2 }: { label: string; icon: React.ReactNode; v1: number; v2: number }) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  const winner = v1 > v2 ? "p1" : v2 > v1 ? "p2" : "tie";

  return (
    <div className="group py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition-all duration-300 px-2 rounded-lg">
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p1" ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]" : "text-slate-600"}`}>
          {v1.toFixed(1)}
        </span>
        <div className="flex items-center gap-2 group-hover:-translate-y-0.5 transition-transform">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
        </div>
        <span className={`text-2xl font-black font-mono tracking-tighter transition-all duration-500 ${winner === "p2" ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "text-slate-600"}`}>
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
        {/* Center divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#0a0f18] z-10" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPARE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ComparePlayers() {
  const [allPlayers, setAllPlayers] = useState<NBAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [p1Id, setP1Id] = useState("");
  const [p2Id, setP2Id] = useState("");

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then(players => {
      const sorted = [...players].sort((a, b) => (b.stats?.ppg || 0) - (a.stats?.ppg || 0));
      setAllPlayers(sorted);
      if (sorted.length >= 2) { setP1Id(sorted[0].id); setP2Id(sorted[1].id); }
      setIsLoading(false);
    });
  }, []);

  const p1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [p1Id, allPlayers]);
  const p2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [p2Id, allPlayers]);

  const radarData = useMemo(() => {
    if (!p1 || !p2) return [];
    const norm = (v: number, max: number) => Math.min(100, (v / max) * 100);
    const getDefScore = (p: NBAPlayer) => Math.max(0, Math.min(100, (120 - ((p.stats as any).defRating || 115)) * 5));
    return [
      { stat: "Scoring", p1: norm(p1.stats.ppg, 35), p2: norm(p2.stats.ppg, 35) },
      { stat: "Playmaking", p1: norm(p1.stats.apg, 12), p2: norm(p2.stats.apg, 12) },
      { stat: "Efficiency", p1: p1.stats.fgPct, p2: p2.stats.fgPct },
      { stat: "Defense", p1: getDefScore(p1), p2: getDefScore(p2) },
      { stat: "Rebounding", p1: norm(p1.stats.rpg, 15), p2: norm(p2.stats.rpg, 15) },
      { stat: "Impact", p1: norm(p1.stats.ppg + p1.stats.rpg + p1.stats.apg, 55), p2: norm(p2.stats.ppg + p2.stats.rpg + p2.stats.apg, 55) },
    ];
  }, [p1, p2]);

  const statBars = useMemo(() => {
    if (!p1 || !p2) return [];
    const s1 = p1.stats as any;
    const s2 = p2.stats as any;
    return [
      { label: "PPG", v1: s1.ppg, v2: s2.ppg, icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
      { label: "RPG", v1: s1.rpg, v2: s2.rpg, icon: <Shield className="w-3.5 h-3.5 text-slate-400" /> },
      { label: "APG", v1: s1.apg, v2: s2.apg, icon: <Activity className="w-3.5 h-3.5 text-purple-400" /> },
      { label: "TS%", v1: s1.ts || 0, v2: s2.ts || 0, icon: <Target className="w-3.5 h-3.5 text-emerald-400" /> },
      { label: "USG%", v1: s1.usg || 0, v2: s2.usg || 0, icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
      { label: "FG%", v1: s1.fgPct, v2: s2.fgPct, icon: <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> },
      { label: "SPG", v1: s1.spg, v2: s2.spg, icon: <Crosshair className="w-3.5 h-3.5 text-rose-400" /> },
      { label: "BPG", v1: s1.bpg, v2: s2.bpg, icon: <Shield className="w-3.5 h-3.5 text-indigo-400" /> },
    ];
  }, [p1, p2]);

  const aiVerdict = useMemo(() => {
    if (!p1 || !p2) return "";
    const a = p1.name.split(" ").pop();
    const b = p2.name.split(" ").pop();
    const s1 = p1.stats, s2 = p2.stats;
    const scoringEdge = s1.ppg > s2.ppg ? a : b;
    const rebEdge = s1.rpg > s2.rpg ? a : b;
    const playmakingEdge = s1.apg > s2.apg ? a : b;
    return `${scoringEdge} holds the scoring edge with superior volume and shot creation, while ${rebEdge} dominates the glass and paint presence. In terms of playmaking, ${playmakingEdge} generates more opportunities for teammates. Both athletes represent elite-tier talent — the matchup outcome depends heavily on scheme context, pace, and defensive matchup assignments. This is a classic power-vs-finesse duel at the highest level of the association.`;
  }, [p1, p2]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 animate-pulse">Initializing Matchup Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white pb-20 animate-in fade-in duration-700">

      {/* ═══ SELECTOR BAR ═══ */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center mb-8">
          <Badge className="bg-white/[0.04] border-white/10 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-5 py-1.5 mb-3">
            Head-to-Head Scouting
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-white">
            Versus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">Mode</span>
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <PlayerCombobox value={p1Id} onChange={setP1Id} players={allPlayers} side="blue" />
          <div className="hidden md:flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <span className="text-xs font-black text-slate-500">VS</span>
            </div>
          </div>
          <PlayerCombobox value={p2Id} onChange={setP2Id} players={allPlayers} side="rose" />
        </div>
      </div>

      {p1 && p2 && (
        <div className="max-w-6xl mx-auto px-6 space-y-8">

          {/* ═══ VERSUS HERO BANNER ═══ */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent border border-white/[0.06] p-8 md:p-12 backdrop-blur-xl">
            {/* Ambient glow */}
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-cyan-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-rose-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Player A */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl scale-125" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-cyan-500/40 shadow-[0_0_40px_rgba(34,211,238,0.2)] bg-white">
                    <AvatarImage src={p1.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p1.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{p1.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p1.teamId}</span>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                    {getArchetype(p1)}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-1">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">PPG</span>
                    <span className="text-lg font-black font-mono text-cyan-400">{p1.stats.ppg.toFixed(1)}</span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">RPG</span>
                    <span className="text-lg font-black font-mono text-white">{p1.stats.rpg.toFixed(1)}</span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">APG</span>
                    <span className="text-lg font-black font-mono text-white">{p1.stats.apg.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* VS Hexagon */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-rose-500/20 rounded-2xl blur-xl scale-150" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl rotate-45">
                    <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-rose-400 -rotate-45">VS</span>
                  </div>
                </div>
                <Hexagon className="h-4 w-4 text-slate-700 animate-pulse" />
              </div>

              {/* Player B */}
              <div className="flex flex-col items-center text-center space-y-3 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-2xl scale-125" />
                  <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-[3px] border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)] bg-white">
                    <AvatarImage src={p2.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-2xl font-black">{p2.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{p2.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p2.teamId}</span>
                  <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                    {getArchetype(p2)}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-1">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">PPG</span>
                    <span className="text-lg font-black font-mono text-rose-400">{p2.stats.ppg.toFixed(1)}</span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">RPG</span>
                    <span className="text-lg font-black font-mono text-white">{p2.stats.rpg.toFixed(1)}</span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">APG</span>
                    <span className="text-lg font-black font-mono text-white">{p2.stats.apg.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ MAIN GRID: RADAR + TUG OF WAR ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* RADAR CHART */}
            <div className="lg:col-span-5">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden h-full">
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-rose-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 text-center">Style DNA Overlay</h3>
                <div className="h-[360px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.04)" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 800 }} />
                      <Radar name={p1.name} dataKey="p1" stroke="#22d3ee" strokeWidth={2.5} fill="#22d3ee" fillOpacity={0.12} dot={{ r: 3, fill: "#0a0f18", stroke: "#22d3ee", strokeWidth: 2 }} />
                      <Radar name={p2.name} dataKey="p2" stroke="#f43f5e" strokeWidth={2.5} fill="#f43f5e" fillOpacity={0.12} dot={{ r: 3, fill: "#0a0f18", stroke: "#f43f5e", strokeWidth: 2 }} />
                      <Legend wrapperStyle={{ paddingTop: "24px", fontSize: "11px", fontWeight: "bold" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TUG-OF-WAR STAT BARS */}
            <div className="lg:col-span-7">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{p1.name.split(" ").pop()}</span>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Tale of the Tape</h3>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">{p2.name.split(" ").pop()}</span>
                </div>
                <div className="divide-y divide-transparent">
                  {statBars.map((s, i) => (
                    <TugBar key={i} label={s.label} icon={s.icon} v1={s.v1} v2={s.v2} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ AI SCOUTING VERDICT ═══ */}
          <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 md:p-10 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex items-start gap-5">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">AI Scouting Verdict</h3>
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                    <Brain className="h-2.5 w-2.5 mr-1" /> Neural Analysis
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium max-w-3xl">{aiVerdict}</p>
              </div>
            </div>
          </div>

          {/* ═══ GIR IMPACT CARDS ═══ */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-[2rem] bg-gradient-to-br from-cyan-500/[0.08] to-transparent border border-cyan-500/10 p-8 relative group hover:scale-[1.01] transition-all duration-300">
              <div className="absolute inset-0 rounded-[2rem] bg-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3 relative z-10">GIR Impact</p>
              <p className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white relative z-10">
                {nbaService.computeGIR(p1)}
              </p>
            </div>
            <div className="rounded-[2rem] bg-gradient-to-br from-rose-500/[0.08] to-transparent border border-rose-500/10 p-8 relative group hover:scale-[1.01] transition-all duration-300 text-right">
              <div className="absolute inset-0 rounded-[2rem] bg-rose-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-3 relative z-10">GIR Impact</p>
              <p className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white relative z-10">
                {nbaService.computeGIR(p2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

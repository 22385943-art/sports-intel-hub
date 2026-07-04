import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, ShieldAlert, Star, TrendingUp, Zap, Target, Flame, 
  Crown, Activity, Loader2, ChevronRight, Calculator, AlertCircle, X, Maximize2
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ─── CONFIGURACIÓN VISUAL ──────────────────────────────────────────────────
const AWARD_CONFIG: Record<string, any> = {
  mvp:    { label: "Most Valuable Player", abbr: "MVP", accent: "#22d3ee", icon: Crown },
  dpoy:   { label: "Defensive Player of the Year", abbr: "DPOY", accent: "#f43f5e", icon: ShieldAlert },
  roy:    { label: "Rookie of the Year", abbr: "ROY", accent: "#a78bfa", icon: Star, emptyNote: "The 2026 Draft Class is not yet available in the prediction pipeline." },
  mip:    { label: "Most Improved Player", abbr: "MIP", accent: "#34d399", icon: TrendingUp },
  sixmoy: { label: "Sixth Man of the Year", abbr: "6MOY", accent: "#fb923c", icon: Zap },
  coty:   { label: "Coach of the Year", abbr: "COTY", accent: "#facc15", icon: Target },
  cpoy:   { label: "Clutch Player of the Year", abbr: "CPOY", accent: "#e879f9", icon: Flame },
};

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

const teamColor = (id: string) => TEAM_COLORS[id] ?? "#64748b";

const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.length === 3 ? cleanHex.slice(0, 1).repeat(2) : cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.length === 3 ? cleanHex.slice(1, 2).repeat(2) : cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.length === 3 ? cleanHex.slice(2, 3).repeat(2) : cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─── UTILS Y FORMATEADORES ─────────────────────────────────────────────────
const fmt     = (n: any) => (typeof n === "number" ? n.toFixed(1) : "—");
const fmtProb = (n: any) => (typeof n === "number" ? n.toFixed(1) + "%" : "—");

const getAmericanOdds = (prob: number) => {
  if (!prob || prob <= 0) return "—";
  if (prob >= 99.9) return "Locked";
  if (prob >= 50) return "-" + Math.round((prob / (100 - prob)) * 100);
  return "+" + Math.round(((100 - prob) / prob) * 100);
};

const formatStatName = (key: string) => {
  const dictionary: Record<string, string> = {
    bpmProj: "Projected BPM", ppgProj: "Projected PPG", avgSeed: "Avg Seed",
    dbpmProj: "Projected DBPM", bpgProj: "Blocks Per Game", bpmMomentum: "Δ BPM", 
    ppgMomentum: "Δ PPG", mpgProj: "Projected MPG", usgProj: "Offensive USG (%)",
    lastSeasonWins: "Wins (25-26)", projectedWins: "Proj. Wins (26-27)",
    wsProj: "Win Shares"
  };
  return dictionary[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

function statLabel(awardKey: string, stats: any = {}) {
  switch (awardKey) {
    case "mvp":    return `BPM ${fmt(stats.bpmProj)} · ${fmt(stats.ppgProj)} PPG · Seed ${fmt(stats.avgSeed)}`;
    case "dpoy":   return `DBPM ${fmt(stats.dbpmProj)} · ${fmt(stats.bpgProj)} BPG`;
    case "mip":    return `ΔBPM +${fmt(stats.bpmMomentum)} · ΔPPG +${fmt(stats.ppgMomentum)}`;
    case "sixmoy": return `${fmt(stats.mpgProj)} MPG · ${fmt(stats.usgProj)}% USG`;
    case "coty":   return `${stats.lastSeasonWins}W → ${fmt(stats.projectedWins)}W proj`;
    case "cpoy":   return `USG ${fmt(stats.usgProj)}% · BPM ${fmt(stats.bpmProj)}`;
    default:       return null;
  }
}

// ─── SUBCOMPONENTES UI ─────────────────────────────────────────────────────

function CandidateModal({ candidate, config, onClose }: any) {
  if (!candidate) return null;
  const tc = teamColor(candidate.teamId);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0f18] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${config.accent}, ${tc})` }} />
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: config.accent }} />

        <div className="p-6 md:p-8 flex justify-between items-start border-b border-white/5 relative z-10">
          <div className="flex gap-5 items-center">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-2 shadow-2xl bg-[#030712]" style={{ borderColor: `${tc}50` }}>
                <AvatarImage src={candidate.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"} className="object-cover" />
                <AvatarFallback className="text-xl font-black bg-[#030712] text-white/50">{candidate.name.substring(0,2)}</AvatarFallback>
            </Avatar>
            <div>
              <Badge className="mb-2 bg-white/5 border border-white/10 text-white/70 font-black text-[9px] uppercase tracking-widest px-3 py-1" style={{ color: tc }}>
                {candidate.teamId}
              </Badge>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-none tracking-tight">{candidate.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <config.icon className="w-3.5 h-3.5" style={{ color: config.accent }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{config.label} Candidate</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 bg-white/[0.02] relative z-10">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#111] border border-white/5 rounded-2xl p-5 shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundColor: config.accent }} />
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Win Probability</div>
                <div className="text-3xl font-black font-mono tracking-tighter" style={{ color: config.accent, textShadow: `0 0 20px ${hexToRgba(config.accent, 0.4)}` }}>
                    {fmtProb(candidate.prob)}
                </div>
            </div>
            <div className="bg-[#111] border border-white/5 rounded-2xl p-5 shadow-inner">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Implied Odds</div>
                <div className="text-3xl font-black font-mono tracking-tighter text-white">
                    {getAmericanOdds(candidate.prob)}
                </div>
            </div>
          </div>

          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-500" /> Simulated Projection Breakdown
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {candidate.keyStats && Object.entries(candidate.keyStats).map(([key, value]) => (
              <div key={key} className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 line-clamp-1">
                  {formatStatName(key)}
                </div>
                <div className="text-lg font-mono text-white font-black">
                  {fmt(value)}
                </div>
              </div>
            ))}
            {(!candidate.keyStats || Object.keys(candidate.keyStats).length === 0) && (
              <div className="col-span-full p-6 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Advanced metrics pending engine synchronization.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProbBar({ prob, accent, max = 100 }: any) {
  const pct = Math.min((prob / max) * 100, 100);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-[#111] overflow-hidden mt-3 border border-white/5">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]"
        style={{ width: `${pct}%`, backgroundColor: accent, color: accent }}
      />
    </div>
  );
}

function EmptyAwardCard({ config }: any) {
  return (
    <div className="flex flex-col gap-3 rounded-[2rem] border border-white/[0.05] bg-[#0a0f18]/50 p-6 backdrop-blur-xl shadow-2xl h-full justify-between">
      <AwardHeader config={config} />
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center flex-1">
        <config.icon className="h-16 w-16 opacity-10" style={{ color: config.accent }} />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-[220px] leading-relaxed">
          {config.emptyNote || "Insufficient data to generate a reliable neural prediction."}
        </p>
      </div>
    </div>
  );
}

function AwardHeader({ config }: any) {
  return (
    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
            <config.icon className="w-5 h-5" style={{ color: config.accent }} />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/80">
            {config.abbr}
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {config.label}
          </div>
        </div>
      </div>
      <Badge className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 border shadow-sm" style={{ color: config.accent, borderColor: `${config.accent}30`, backgroundColor: `${config.accent}10` }}>
        2026–27
      </Badge>
    </div>
  );
}

function FavoriteBlock({ candidate, config, awardKey, onClick }: any) {
  const tc = teamColor(candidate.teamId);
  const subStat = statLabel(awardKey, candidate.keyStats);

  return (
    <div
      onClick={() => onClick(candidate, config)}
      className="relative rounded-[1.5rem] overflow-hidden p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group border"
      style={{ backgroundColor: `${config.accent}08`, borderColor: `${config.accent}30` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" style={{ background: config.accent }} />
      <div className="absolute -right-10 -top-10 w-32 h-32 blur-[60px] pointer-events-none opacity-40" style={{ background: config.accent }} />
      
      <div className="absolute top-4 right-4 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black shadow-[0_0_15px_currentColor] z-10" style={{ backgroundColor: config.accent, color: "#000" }}>
        1
      </div>

      <div className="flex items-center gap-4 mb-4 relative z-10">
        <Avatar className="h-16 w-16 border-2 shadow-xl bg-[#030712] transition-transform duration-500 group-hover:scale-105" style={{ borderColor: `${tc}60` }}>
            <AvatarImage src={candidate.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"} className="object-cover" />
            <AvatarFallback className="text-xs font-black text-slate-500">{candidate.name.substring(0,2)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <Badge className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border mb-1.5" style={{ backgroundColor: `${tc}15`, color: tc, borderColor: `${tc}30` }}>
            {candidate.teamId}
          </Badge>
          <div className="text-base font-black text-white tracking-tight leading-tight truncate pr-6 group-hover:text-cyan-100 transition-colors">
            {candidate.name}
          </div>
          {subStat && (
            <div className="text-[10px] text-slate-400 font-mono mt-1 leading-snug truncate">
              {subStat}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between relative z-10 bg-black/20 p-3 rounded-xl border border-white/5">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
            Win Probability
          </div>
          <div className="text-2xl font-black font-mono tracking-tighter leading-none mt-1" style={{ color: config.accent, textShadow: `0 0 15px ${hexToRgba(config.accent, 0.4)}` }}>
            {fmtProb(candidate.prob)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
            Implied odds
          </div>
          <div className="text-sm font-black font-mono text-white mt-1">
            {getAmericanOdds(candidate.prob)}
          </div>
        </div>
      </div>

      <ProbBar prob={candidate.prob} accent={config.accent} max={100} />
    </div>
  );
}

function ChaseList({ candidates, config, onPlayerClick }: any) {
  const chasers = candidates.slice(1, 4);
  if (!chasers.length) return null;
  const topChaser = Math.max(...chasers.map((c: any) => c.prob));

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 px-2 py-1 mb-1">
        Contenders
      </div>
      {chasers.map((c: any, i: number) => (
        <div 
          key={c.id || i} 
          onClick={() => onPlayerClick(c, config)}
          className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
        >
          <div className="text-[10px] font-black font-mono text-slate-600 w-4 text-center group-hover:text-slate-400 transition-colors">
            {i + 2}
          </div>
          <Avatar className="h-10 w-10 border border-white/10 bg-[#030712] shadow-md group-hover:border-white/30 transition-colors">
             <AvatarImage src={c.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"} className="object-cover" />
             <AvatarFallback className="text-[9px] font-black">{c.name.substring(0,2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-300 truncate leading-none pr-2 group-hover:text-white transition-colors">
                {c.name}
              </span>
              <span className="text-[10px] font-black font-mono shrink-0" style={{ color: config.accent }}>
                {fmtProb(c.prob)}
              </span>
            </div>
            <div className="h-1 rounded-full bg-[#111] overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor]"
                style={{
                  width: `${topChaser > 0 ? (c.prob / topChaser) * 100 : 0}%`,
                  backgroundColor: config.accent, color: config.accent
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AwardCard({ awardKey, candidates, onCandidateClick }: any) {
  const config = AWARD_CONFIG[awardKey];
  if (!config) return null;

  if (!candidates || candidates.length === 0 || candidates[0].prob === 0) {
    return <EmptyAwardCard config={config} />;
  }

  const [favorite, ...rest] = candidates;

  return (
    <div className="flex flex-col gap-2 rounded-[2rem] border border-white/[0.05] bg-[#0a0f18]/80 backdrop-blur-2xl p-6 shadow-2xl hover:border-white/[0.08] transition-colors duration-500 relative overflow-hidden">
      <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2rem]" />
      <AwardHeader config={config} />
      <FavoriteBlock candidate={favorite} config={config} awardKey={awardKey} onClick={onCandidateClick} />
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-2" />
      <ChaseList candidates={candidates} config={config} onPlayerClick={onCandidateClick} />
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function AwardsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(null);

  useEffect(() => {
    fetch('/data/nba_standings_projected.json')
      .then(res => res.json())
      .then(json => {
        setData(json.awards);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading predictions:", err);
        setLoading(false);
      });
  }, []);

  const openCandidateModal = (candidate: any, config: any) => {
    setSelectedCandidate(candidate);
    setSelectedConfig(config);
  };

  const closeCandidateModal = () => {
    setSelectedCandidate(null);
    setSelectedConfig(null);
  };

  const FILTERS = ["ALL", "MVP", "DPOY", "ROY", "MIP", "6MOY", "COTY", "CPOY"];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-1000">
        <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="h-14 w-14 animate-spin text-cyan-400 relative z-10" />
        </div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyan-400/80 animate-pulse font-mono text-center">
            Initializing Vegas Quant Engine<br/>
            <span className="text-[8px] text-cyan-500/50">Running 10,000 Monte Carlo Simulations</span>
        </p>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-white/50 font-bold tracking-widest uppercase text-sm">Failed to sync with Prediction Oracle.</div>;

  const visibleKeys = activeFilter === "ALL" 
    ? Object.keys(AWARD_CONFIG) 
    : [activeFilter.toLowerCase()];

  const mvpFav = data.mvp && data.mvp.length > 0 ? data.mvp[0] : null;

  return (
    <div className="min-h-screen text-foreground pb-24 relative overflow-hidden">
      
      <AnimatePresence>
        {selectedCandidate && selectedConfig && (
          <CandidateModal 
            candidate={selectedCandidate} 
            config={selectedConfig} 
            onClose={closeCandidateModal} 
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto space-y-10 px-4">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-8 relative z-10">
          <div className="text-center pt-8">
            <Badge className="bg-white/[0.02] border-white/[0.08] text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-6 py-2 mb-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] backdrop-blur-xl">
              Sports Intel Hub · Prediction Engine
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-foreground drop-shadow-2xl">
              Futures <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-400">Oracle</span>
            </h1>
            <p className="mt-4 text-sm text-slate-400 max-w-xl mx-auto font-medium">
              Powered by advanced Win Probability Added (WPR) models, running 10,000 Monte Carlo simulations alongside historical voter psychology algorithms.
            </p>
          </div>

          {mvpFav && (
            <div className="max-w-xl mx-auto w-full">
              <div 
                onClick={() => openCandidateModal(mvpFav, AWARD_CONFIG.mvp)}
                className="flex items-center gap-6 rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 px-8 py-6 shadow-[0_0_40px_rgba(34,211,238,0.1)] cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all duration-500 group backdrop-blur-md relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-700" />
                
                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-[#030712] group-hover:scale-105 transition-transform duration-500 z-10">
                    <AvatarImage src={mvpFav.imageUrl} className="object-cover" />
                    <AvatarFallback className="text-white/50 font-black">{mvpFav.name.substring(0,2)}</AvatarFallback>
                </Avatar>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                      Overall MVP Favorite
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white leading-none tracking-tight group-hover:text-cyan-50 transition-colors">{mvpFav.name}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-none font-mono text-xs md:text-sm font-black px-3 py-1">
                        {fmtProb(mvpFav.prob)}
                    </Badge>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
                        {getAmericanOdds(mvpFav.prob)}
                    </span>
                  </div>
                </div>
                
                <div className="ml-auto hidden md:flex">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-colors">
                        <Maximize2 className="w-4 h-4 text-white/50 group-hover:text-cyan-400" />
                    </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center w-full max-w-5xl mx-auto border-t border-white/[0.05] pt-8 mt-4">
             <div className="flex flex-wrap justify-center gap-2 w-full bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl shadow-inner backdrop-blur-md">
                {FILTERS.map((f) => {
                  const active = f === activeFilter;
                  const config = f !== "ALL" ? AWARD_CONFIG[f.toLowerCase()] : null;
                  const accentColor = config?.accent ?? "#22d3ee";
                  
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${
                        active 
                          ? 'text-white shadow-md border' 
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                      }`}
                      style={active ? { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor } : {}}
                    >
                      {f !== "ALL" && config?.icon && <config.icon className="w-3.5 h-3.5" />}
                      {f === "ALL" ? "Global Board" : f}
                    </button>
                  );
                })}
             </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {visibleKeys.map((key) => (
            <AwardCard 
              key={key} 
              awardKey={key} 
              candidates={data[key]} 
              onCandidateClick={openCandidateModal} 
            />
          ))}
        </motion.div>

        <div className="mt-16 border-t border-white/[0.05] pt-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 max-w-2xl bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest font-bold font-mono">
              Disclaimer: Projections are algorithmically generated by the WPR model utilizing 30 years of historical voter psychology. 
              Variances ($\sigma=4.0$) are injected to account for narrative shifts and injuries. Not guaranteed predictive outcomes.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase font-mono text-slate-500 font-black bg-[#0a0f18] px-5 py-3 rounded-xl border border-white/5 shadow-inner">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span>MODEL SYNCED · {new Date().toLocaleDateString("en-US", { month:"short", day:"2-digit", year:"numeric" })}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
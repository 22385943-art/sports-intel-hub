import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowUpDown, ShieldAlert, Zap, Target, Brain, Crown, Activity, AlertCircle, Crosshair } from "lucide-react";
import { motion } from "framer-motion";

// 🧠 ARCHETYPE ENGINE
const getArchetype = (p: any) => {
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
  if (apg >= 8 || astPct >= 35) {
    if (isEliteDefender) return { label: "Two-Way Playmaker", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  }
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

export default function NBAPlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [strictQualifiers, setStrictQualifiers] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "per", direction: "desc" });

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then((data) => {
      const maxGP = Math.max(...data.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);
      const playersWithAdv = data.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const archetype = getArchetype({ ...p, adv });
        return { ...p, adv, archetype, qualifies: (p.stats?.mpg || 0) >= 20 && (p.stats?.gp || 0) >= requiredGP };
      });

      const distributions: Record<string, number[]> = {
        ppg: playersWithAdv.map(p => p.stats.ppg).sort((a, b) => a - b),
        rpg: playersWithAdv.map(p => p.stats.rpg).sort((a, b) => a - b),
        apg: playersWithAdv.map(p => p.stats.apg).sort((a, b) => a - b),
        per: playersWithAdv.map(p => p.adv.per).sort((a, b) => a - b),
        bpm: playersWithAdv.map(p => p.adv.bpm).sort((a, b) => a - b),
        ts: playersWithAdv.map(p => p.adv.ts).sort((a, b) => a - b),
      };
      const calcPercentile = (val: number, arr: number[]) => {
        if (!arr.length) return 50;
        return Math.round((arr.filter(v => v <= val).length / arr.length) * 100);
      };
      setPlayers(playersWithAdv.map(p => ({
        ...p,
        pct: {
          ppg: calcPercentile(p.stats.ppg, distributions.ppg),
          rpg: calcPercentile(p.stats.rpg, distributions.rpg),
          apg: calcPercentile(p.stats.apg, distributions.apg),
          per: calcPercentile(p.adv.per, distributions.per),
          bpm: calcPercentile(p.adv.bpm, distributions.bpm),
          ts: calcPercentile(p.adv.ts, distributions.ts),
        }
      })));
      setIsLoading(false);
    });
  }, []);

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === "all" || p.teamId === teamFilter;
      const matchesQual = strictQualifiers ? p.qualifies : (p.stats?.mpg || 0) >= 5;
      return matchesSearch && matchesTeam && matchesQual;
    });
    filtered.sort((a, b) => {
      let valA = ['ppg', 'rpg', 'apg'].includes(sortConfig.key) ? a.stats[sortConfig.key] : a.adv[sortConfig.key];
      let valB = ['ppg', 'rpg', 'apg'].includes(sortConfig.key) ? b.stats[sortConfig.key] : b.adv[sortConfig.key];
      return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
    });
    return filtered;
  }, [players, search, teamFilter, strictQualifiers, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Compiling Scouting Reports...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-none">Scouting Hub</h1>
          <p className="text-[#888] text-sm font-medium mt-2">Official 2025-26 NBA Database. Advanced player evaluation and archetype engine.</p>
        </div>
        <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black text-[10px] px-4 py-2 uppercase tracking-widest w-fit">
          {filteredAndSortedPlayers.length} Athletes Found
        </Badge>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
          <input
            type="text" placeholder="Search athlete..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-xl py-3 pl-11 pr-4 text-white text-sm font-bold placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <select
          value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="bg-[#111] border border-[#333] rounded-xl py-3 px-4 text-white text-xs font-bold outline-none cursor-pointer hover:border-[#555] transition-colors w-full md:w-[180px]"
        >
          <option value="all" className="bg-[#111]">ALL TEAMS</option>
          {Array.from(new Set(players.map(p => p.teamId))).sort().map(t => (
            <option key={t} value={t} className="bg-[#111]">{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-3 bg-[#111] border border-[#333] px-4 py-2.5 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#888] text-right whitespace-nowrap">Qualifiers</span>
          <button
            onClick={() => setStrictQualifiers(!strictQualifiers)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${strictQualifiers ? 'bg-emerald-500' : 'bg-[#333]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${strictQualifiers ? 'translate-x-6' : 'translate-x-1.5'}`} />
          </button>
        </div>
      </div>

      {!strictQualifiers && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-amber-500/90 leading-relaxed">
            <span className="text-amber-400 font-black">UNQUALIFIED DATA WARNING:</span> Players marked with * do not meet official volume requirements.
          </p>
        </div>
      )}

      {/* ═══ PLAYER CARD GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAndSortedPlayers.map((p, i) => {
          const teamColor = TEAM_COLORS[p.teamId] || "#4279f5";
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Link to={`/nba/players/${p.id}`}>
                <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#555] hover:scale-[1.02] transition-all duration-300 group shadow-lg">
                  {/* Team logo watermark */}
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 opacity-[0.06] pointer-events-none">
                    <img src={nbaService.getTeamLogoUrl(p.teamId)} alt="" className="w-full h-full object-contain" />
                  </div>

                  {/* Top accent bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${teamColor}, transparent)` }} />

                  <div className="p-5 relative z-10">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 shadow-lg bg-white" style={{ borderColor: `${teamColor}40` }}>
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="bg-[#222] text-xs text-[#888]">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                          {p.name} {!p.qualifies && !strictQualifiers && <span className="text-amber-500 font-black text-lg leading-none">*</span>}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <img src={nbaService.getTeamLogoUrl(p.teamId)} alt="" className="w-3.5 h-3.5 object-contain" />
                          <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">{p.teamId}</span>
                        </div>
                        <Badge className={`mt-2 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 w-fit ${p.archetype.color}`}>
                          <p.archetype.icon className="h-2.5 w-2.5" />
                          {p.archetype.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#2a2a2a]">
                      <div className="text-center">
                        <div className="text-[9px] font-black text-[#666] uppercase tracking-widest mb-1">PTS</div>
                        <div className="text-base font-black text-white font-mono">{p.stats.ppg.toFixed(1)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-black text-[#666] uppercase tracking-widest mb-1">REB</div>
                        <div className="text-base font-black text-white font-mono">{p.stats.rpg.toFixed(1)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-black text-[#666] uppercase tracking-widest mb-1">AST</div>
                        <div className="text-base font-black text-white font-mono">{p.stats.apg.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Advanced stat bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[9px] font-black text-[#555] uppercase tracking-widest">PER</span>
                      <div className="flex-1 h-1 bg-[#222] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]" style={{ width: `${Math.min(p.pct.per, 100)}%` }} />
                      </div>
                      <span className="font-mono font-black text-xs text-blue-400">{p.adv.per.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filteredAndSortedPlayers.length === 0 && (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
          <Search className="h-12 w-12 text-[#333]" />
          <p className="text-[#888] font-bold uppercase tracking-widest text-sm">No athletes found matching those filters</p>
        </div>
      )}
    </motion.div>
  );
}

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

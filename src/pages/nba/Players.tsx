import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CalendarDays, Hexagon, Crosshair, ShieldAlert, Zap, Target, Brain, Crown, Activity } from "lucide-react";
import { motion } from "framer-motion";

const SEASONS = Array.from({ length: 30 }, (_, i) => {
  const startYear = 2025 - i;
  const nextYear = String(startYear + 1).slice(-2);
  return `${startYear}-${nextYear}`;
});

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

// 🧠 ARCHETYPE ENGINE (100% ERA-RELATIVE)
const getArchetype = (p: any) => {
  const pct = p.percentiles || {};
  
  const isHighVolume = (pct.USG || 50) >= 85;
  const isEfficient = (pct.Efficiency || 50) >= 80;
  const isEliteDefender = (pct.Defense || 50) >= 85;
  const isShooter = (pct.Shooting || 50) >= 80 && (pct.Scoring || 50) >= 60;
  const isSlasher = (pct.Finishing || 50) >= 85 && (pct.FtaRate || 50) >= 75 && (pct.Shooting || 50) <= 60;
  const isUnicorn = (pct.Blocks || 50) >= 85 && (pct.ThreePA || 50) >= 70 && (pct.Rebounding || 50) >= 75;
  
  const isSuperstar = (pct.Impact || 50) >= 95 && (pct.Scoring || 50) >= 90;
  const isElitePlaymaker = (pct.Playmaking || 50) >= 85 || (pct.AstPct || 50) >= 85;
  const isEliteRebounder = (pct.Rebounding || 50) >= 85;

  if (isSuperstar) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
    if (isElitePlaymaker) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isShooter && isEfficient) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  }

  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  
  if (isElitePlaymaker) {
    if (isEliteDefender) return { label: "Two-Way Playmaker", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  }
  
  if (isEliteRebounder) {
    if (isShooter) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
    if ((pct.Blocks || 50) >= 80 || isEliteDefender) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" };
    if (isElitePlaymaker) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  }

  if (isSlasher && (pct.Scoring || 50) >= 75) return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  
  if (isShooter && (pct.Scoring || 50) >= 75) {
    if (isHighVolume) return { label: "Shot Creator", icon: Zap, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" };
    return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  }
  
  if (isShooter && isEliteDefender && !isHighVolume) return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  
  if (isEliteDefender && !isHighVolume) return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/30" };
  
  if (isShooter && !isHighVolume) return { label: "Catch & Shoot", icon: Crosshair, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
  
  if ((pct.Scoring || 50) >= 65 && isHighVolume && !isEfficient) return { label: "Microwave Scorer", icon: Zap, color: "text-orange-400 bg-orange-400/10 border-orange-400/30" };
  
  if ((pct.Scoring || 50) >= 50 && (pct.Rebounding || 50) >= 50 && (pct.Playmaking || 50) >= 50) return { label: "Connective Glue", icon: Activity, color: "text-blue-300 bg-blue-300/10 border-blue-300/30" };
  
  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
};

export default function NBAPlayers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const season = searchParams.get("season") || "2025-26";

  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  // 🚀 CAMBIO CLAVE: Empezar con el botón apagado (false) para que carguen los 587 por defecto
  const [strictQualifiers, setStrictQualifiers] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "ovr", direction: "desc" }); 

  useEffect(() => {
    setIsLoading(true);
    nbaService.fetchAllOfficialPlayers(season).then((data) => {
      const maxGP = Math.max(...data.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);
      const playersWithAdv = data.map(p => {
        const archetype = getArchetype(p);
        return { ...p, archetype, qualifies: (p.stats?.mpg || 0) >= 15 && (p.stats?.gp || 0) >= requiredGP };
      });

      setPlayers(playersWithAdv);
      setIsLoading(false);
    });
  }, [season]);

  // 🚀 CAMBIO CLAVE: Lógica de filtrado reescrita y blindada
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(p => {
      // 1. Filtrar por texto (búsqueda)
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      
      // 2. Filtrar por equipo
      const matchesTeam = teamFilter === "all" || p.teamId === teamFilter;
      
      // 3. Filtrar por Qualifiers
      const isSearching = search.trim() !== "";
      let matchesQual = true; // Por defecto pasan todos
      
      if (!isSearching && strictQualifiers) {
          matchesQual = p.qualifies; // Si no busco y el botón está activo, exijo requisitos
      }
      
      return matchesSearch && matchesTeam && matchesQual;
    });

    filtered.sort((a, b) => {
      let valA = 0; let valB = 0;
      if (sortConfig.key === 'ovr') {
          valA = a.rating?.ovr || 0;
          valB = b.rating?.ovr || 0;
      } else {
          valA = ['ppg', 'rpg', 'apg'].includes(sortConfig.key) ? a.stats[sortConfig.key] : a.adv[sortConfig.key];
          valB = ['ppg', 'rpg', 'apg'].includes(sortConfig.key) ? b.stats[sortConfig.key] : b.adv[sortConfig.key];
      }
      return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
    });
    return filtered;
  }, [players, search, teamFilter, strictQualifiers, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ season: e.target.value });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Compiling {season} Scouting Reports...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-none">Scouting Hub</h1>
          <p className="text-[#888] text-sm font-medium mt-2">Historical Player Database & 2K Rating Engine.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
                <select
                value={season}
                onChange={handleSeasonChange}
                className="bg-[#111] border border-[#222] text-white text-xs font-bold uppercase tracking-widest rounded-xl py-2.5 pl-10 pr-8 outline-none cursor-pointer hover:border-[#444] transition-colors appearance-none shadow-lg"
                >
                {SEASONS.map(s => (
                    <option key={s} value={s}>{s} Season</option>
                ))}
                </select>
            </div>
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black text-[10px] px-4 py-2.5 uppercase tracking-widest w-fit rounded-xl">
            {filteredAndSortedPlayers.length} Athletes
            </Badge>
        </div>
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
            <option key={t as string} value={t as string} className="bg-[#111]">{t as string}</option>
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

      {/* ═══ PLAYER CARD GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAndSortedPlayers.map((p, i) => {
          const rating = p.rating || { 
            ovr: 70, color: "#888", tier: "Bronze",
            pillars: {
                sco: { grade: "-", raw: "-", label: "SCORE" },
                reb: { grade: "-", raw: "-", label: "REB" },
                ply: { grade: "-", raw: "-", label: "PLAY" },
                def: { grade: "-", raw: "-", label: "STOCKS" }
            }
          };
          
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Link to={`/nba/players/${p.id}?season=${season}`}>
                <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#555] hover:scale-[1.02] transition-all duration-300 group shadow-lg">
                  
                  {/* Team logo watermark */}
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 opacity-[0.06] pointer-events-none">
                    <img src={nbaService.getTeamLogoUrl(p.teamId)} alt="" className="w-full h-full object-contain" />
                  </div>

                  {/* Top accent bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${rating.color}, transparent)` }} />

                  <div className="p-5 relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      
                      <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 border-2 shadow-lg bg-white" style={{ borderColor: `${rating.color}60` }}>
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
                      
                      {/* 🚀 OVR BADGE */}
                      <div className="relative flex items-center justify-center w-12 h-12">
                          <Hexagon className="absolute inset-0 w-full h-full drop-shadow-md" style={{ color: rating.color, fill: `${rating.color}15`, strokeWidth: 2 }} />
                          <div className="flex flex-col items-center justify-center relative z-10">
                            <span className="text-lg font-black font-mono text-white leading-none">{rating.ovr}</span>
                            <span className="text-[6px] font-black uppercase tracking-widest mt-0.5" style={{ color: rating.color }}>OVR</span>
                          </div>
                      </div>

                    </div>

                    {/* 🚀 LOS 4 PILARES DE SCOUTING */}
                    <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-[#2a2a2a]">
                        {[
                            { label: rating.pillars?.sco?.label || "SCORE", grade: rating.pillars?.sco?.grade || "-", raw: rating.pillars?.sco?.raw || "-" },
                            { label: rating.pillars?.reb?.label || "REB", grade: rating.pillars?.reb?.grade || "-", raw: rating.pillars?.reb?.raw || "-" },
                            { label: rating.pillars?.ply?.label || "PLAY", grade: rating.pillars?.ply?.grade || "-", raw: rating.pillars?.ply?.raw || "-" },
                            { label: rating.pillars?.def?.label || "STOCKS", grade: rating.pillars?.def?.grade || "-", raw: rating.pillars?.def?.raw || "-" },
                        ].map((col, i) => (
                            <div key={i} className="flex flex-col items-center bg-black/30 rounded-lg py-1.5 border border-white/5">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{col.label}</span>
                                <span className="text-sm font-black text-white font-mono" style={{ color: ['S', 'A+', 'A'].includes(col.grade) ? '#10b981' : 'white' }}>{col.grade}</span>
                                <span className="text-[7px] text-[#666] font-bold mt-0.5">{col.raw}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
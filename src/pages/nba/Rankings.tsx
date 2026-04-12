import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, Search, ArrowLeft, Database, ChevronLeft, ChevronRight, Filter, Target, Flame, Activity, Brain, Crosshair, Shield, ShieldAlert, TrendingUp, Radar, Percent, Trophy, Zap, FastForward, MoveUpRight, Crown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const METRIC_DICT: Record<string, { label: string, source: string, format: "number" | "percent" | "rating", asc?: boolean, icon: any, color: string }> = {
  ppg: { label: "Points Per Game", source: "stats", format: "number", icon: Flame, color: "orange" },
  apg: { label: "Assists Per Game", source: "stats", format: "number", icon: Brain, color: "cyan" },
  rpg: { label: "Rebounds Per Game", source: "stats", format: "number", icon: Activity, color: "emerald" },
  spg: { label: "Steals Per Game", source: "stats", format: "number", icon: Crosshair, color: "rose" },
  bpg: { label: "Blocks Per Game", source: "stats", format: "number", icon: ShieldAlert, color: "purple" },
  ts: { label: "True Shooting %", source: "adv", format: "percent", icon: Target, color: "purple" },
  efg: { label: "Effective FG %", source: "adv", format: "percent", icon: Percent, color: "cyan" },
  threePct: { label: "3-Point %", source: "stats", format: "percent", icon: Crosshair, color: "emerald" },
  fgPct: { label: "Field Goal %", source: "stats", format: "percent", icon: Target, color: "rose" },
  ftPct: { label: "Free Throw %", source: "stats", format: "percent", icon: Target, color: "orange" },
  si: { label: "SI+ Rating", source: "adv", format: "number", icon: Radar, color: "emerald" },
  per: { label: "Player Efficiency Rating", source: "adv", format: "number", icon: Trophy, color: "gold" },
  bpm: { label: "Box Plus/Minus", source: "adv", format: "number", icon: TrendingUp, color: "cyan" },
  net: { label: "Net Rating", source: "adv", format: "rating", icon: TrendingUp, color: "orange" },
  vorp: { label: "Value Over Rep. Player", source: "adv", format: "number", icon: Crown, color: "purple" },
  pie: { label: "Player Impact Estimate", source: "adv", format: "percent", icon: Radar, color: "emerald" },
  usg: { label: "Usage Rate", source: "adv", format: "percent", icon: Zap, color: "rose" },
  astPct: { label: "Assist Percentage", source: "playmaking", format: "percent", icon: Brain, color: "blue" },
  astTo: { label: "AST/TO Ratio", source: "playmaking", format: "number", icon: Activity, color: "emerald" },
  astRatio: { label: "Assist Ratio", source: "playmaking", format: "number", icon: TrendingUp, color: "orange" },
  defRating: { label: "Defensive Rating", source: "stats", format: "rating", asc: true, icon: ShieldAlert, color: "emerald" },
  stocks36: { label: "Stocks Per 36", source: "dash", format: "number", icon: Shield, color: "cyan" },
  deflections: { label: "Deflections", source: "hustle", format: "number", icon: Activity, color: "cyan" },
  contestedShots: { label: "Contested Shots", source: "hustle", format: "number", icon: Target, color: "orange" },
  contested3pt: { label: "Contested 3PT", source: "hustle", format: "number", icon: Crosshair, color: "rose" },
  chargesDrawn: { label: "Charges Drawn", source: "hustle", format: "number", icon: ShieldAlert, color: "purple" },
  netRtg: { label: "Net Rating", source: "stats", format: "rating", icon: TrendingUp, color: "cyan" },
  offRtg: { label: "Offensive Rating", source: "stats", format: "rating", icon: Flame, color: "rose" },
  defRtg: { label: "Defensive Rating", source: "stats", format: "rating", asc: true, icon: ShieldAlert, color: "emerald" },
  tsPct: { label: "True Shooting %", source: "stats", format: "percent", icon: Target, color: "emerald" },
  rebPct: { label: "Rebound %", source: "stats", format: "percent", icon: Activity, color: "blue" },
  astToTeam: { label: "AST/TO Ratio", source: "stats", format: "number", icon: Brain, color: "purple" },
  pace: { label: "Pace (Poss/48)", source: "stats", format: "number", icon: FastForward, color: "orange" },
  oppFgPct: { label: "Opponent FG%", source: "opp", format: "percent", asc: true, icon: Target, color: "rose" },
  opp3ptPct: { label: "Opponent 3PT%", source: "opp", format: "percent", asc: true, icon: Crosshair, color: "orange" },
  clutchNetRtg: { label: "Clutch Net Rating", source: "clutch", format: "rating", icon: Flame, color: "cyan" },
  clutchWinPct: { label: "Clutch Win %", source: "clutch", format: "percent", icon: Trophy, color: "gold" },
};

const HUB_CATEGORIES = [
  { title: "Player Rankings", type: "player", subgroups: [
    { title: "League Leaders", metrics: ["ppg", "rpg", "spg", "bpg"] },
    { title: "Floor Generals", metrics: ["apg", "astPct", "astTo", "astRatio"] },
    { title: "Efficiency Leaders", metrics: ["ts", "efg", "threePct", "fgPct", "ftPct"] },
    { title: "Impact Metric Leaders", metrics: ["si", "per", "bpm", "net", "pie", "usg"] },
    { title: "Defensive Anchors", metrics: ["defRating", "deflections", "contestedShots", "contested3pt", "stocks36"] }
  ]},
  { title: "Team Rankings", type: "team", subgroups: [
    { title: "Core Ratings", metrics: ["netRtg", "offRtg", "defRtg", "pace"] },
    { title: "Advanced Stats", metrics: ["tsPct", "rebPct", "astToTeam"] },
    { title: "Defensive Profiles", metrics: ["oppFgPct", "opp3ptPct"] },
    { title: "Clutch Performance", metrics: ["clutchNetRtg", "clutchWinPct"] }
  ]}
];

const ITEMS_PER_PAGE = 50;

const formatValue = (val: number, format: string) => {
  if (val === undefined || val === null || isNaN(val)) return "0.0";
  if (format === 'percent') {
    const displayVal = (val > 0 && val <= 1) ? val * 100 : val;
    return `${displayVal.toFixed(1)}%`;
  }
  return val.toFixed(1);
};

export default function Rankings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  let type = searchParams.get("type"); 
  let metric = searchParams.get("metric"); 
  if (metric === "astTo" && type === "team") metric = "astToTeam";

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOption, setFilterOption] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [type, metric, page]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([nbaService.fetchAllOfficialPlayers(), nbaService.fetchAllOfficialTeams()])
      .then(([players, teams]) => {
        const maxGP = Math.max(...players.map(p => p.stats?.gp || 0));
        const requiredGP = Math.floor(maxGP * 0.7);

        const validPlayers = players.filter(p => {
          const meetsMins = (p.stats?.mpg || 0) >= 20;
          const meetsGP = (p.stats?.gp || 0) >= requiredGP;
          return meetsMins && meetsGP;
        }).map(p => {
          const adv = nbaService.computeAllAdvanced(p);
          const mpg = p.stats?.mpg || 1;
          const dash = {
            stocks36: (((p.stats?.spg || 0) + (p.stats?.bpg || 0)) / mpg) * 36,
            stl36: ((p.stats?.spg || 0) / mpg) * 36,
            blk36: ((p.stats?.bpg || 0) / mpg) * 36,
          };
          return { ...p, adv, dash };
        });

        setAllPlayers(validPlayers);
        setAllTeams(teams);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    setPage(1);
    setFilterOption("ALL");
    setSearch("");
  }, [metric]);

  // 🚀 LA FUNCIÓN QUE CAUSABA EL CAOS ESTÁ ARREGLADA AQUÍ
  const getRawVal = (item: any, m: string, isTeam: boolean, source: string) => {
      let key = m;
      if (m === "astToTeam") key = "astTo"; 
      
      if (isTeam) {
          // Si la métrica es del CLUTCH, miramos SOLO en la carpeta clutch
          if (source === "clutch") return item.clutch?.[key] ?? 0;
          // Si la métrica es de OPPONENT, miramos SOLO en la carpeta opp
          if (source === "opp") return item.opp?.[key] ?? 0;
          
          // Si la métrica es GENERAL (stats/adv), miramos SOLO en la raíz del equipo
          return item[key] ?? 0;
      }
      
      // Para jugadores, sigue funcionando como siempre
      return item[source]?.[key] ?? item[key] ?? 0;
  };

  const getTop5 = (m: string, isTeam: boolean) => {
    const config = METRIC_DICT[m];
    if (!config) return [];
    
    const maxGP = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.stats?.gp || 0)) : 82;

    if (isTeam) {
      return [...allTeams].sort((a,b) => {
          const vA = getRawVal(a, m, true, config.source) || 0;
          const vB = getRawVal(b, m, true, config.source) || 0;
          return config.asc ? vA - vB : vB - vA;
      }).slice(0,5);
    } else {
      return [...allPlayers].filter(p => nbaService.qualifiesForLeaderboard(p, m, maxGP)).sort((a,b) => {
        const vA = getRawVal(a, m, false, config.source) || 0;
        const vB = getRawVal(b, m, false, config.source) || 0;
        return config.asc ? vA - vB : vB - vA;
      }).slice(0,5);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <Database className="h-12 w-12 animate-pulse text-cyan-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
        <p className="text-cyan-400/80 font-black text-[10px] uppercase tracking-[0.4em] font-mono">Querying Master Database</p>
      </div>
    );
  }

  if (!metric || !type) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 pb-24 space-y-12 animate-in fade-in duration-500">
        <div className="text-center mb-16">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] uppercase tracking-[0.3em] font-black mb-4 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            Global Database
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">League <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Rankings</span></h1>
          <p className="text-muted-foreground font-mono text-xs mt-4 tracking-widest uppercase">Select a statistical category to view full leaderboards</p>
        </div>

        <div className="space-y-20">
          {HUB_CATEGORIES.map(category => (
            <div key={category.title}>
              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 uppercase tracking-tighter mb-10 pb-4 border-b border-white/10 drop-shadow-md">
                {category.title}
              </h2>
              
              <div className="space-y-14">
                {category.subgroups.map(sub => (
                  <div key={sub.title}>
                    <h3 className="text-sm md:text-base font-black text-white/70 uppercase tracking-[0.3em] font-mono mb-6 ml-2 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                      {sub.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                      {sub.metrics.map(m => {
                        const conf = METRIC_DICT[m];
                        if (!conf) return null;
                        const top5 = getTop5(m, category.type === "team");
                        
                        return (
                          <div key={m} className="bg-[#050914]/80 backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] relative group hover:border-white/[0.1] transition-all flex flex-col">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${conf.color}-500/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-${conf.color}-500/10 transition-colors`} />
                            
                            <div className="flex items-center gap-3 mb-5 relative z-10">
                              <div className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/5`}>
                                <conf.icon className={`w-4 h-4 text-${conf.color}-400`} />
                              </div>
                              <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-white/90">{conf.label}</h4>
                            </div>

                            <div className="space-y-2.5 flex-1 relative z-10">
                              {top5.map((item, i) => {
                                const rawVal = getRawVal(item, m, category.type === "team", conf.source);
                                return (
                                  <div key={item.id || item.abbreviation} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[9px] font-mono font-black text-white/30 w-3">{i+1}</span>
                                      {category.type === "player" ? (
                                        <Avatar className="w-5 h-5 border border-white/10 bg-[#030712]">
                                          <AvatarImage src={item.imageUrl} className="object-cover" />
                                        </Avatar>
                                      ) : (
                                        <img src={nbaService.getTeamLogoUrl(item.abbreviation)} className="w-5 h-5 object-contain" />
                                      )}
                                      <span className="font-bold text-white/80 truncate">{item.name}</span>
                                    </div>
                                    <span className={`font-mono font-black text-${conf.color}-400 ml-2`}>
                                      {m.includes('net') || m.includes('Net') && rawVal > 0 ? '+' : ''}{formatValue(rawVal, conf.format)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <Link to={`/nba/rankings?type=${category.type}&metric=${m}`} className={`mt-5 pt-3 border-t border-white/5 w-full flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-${conf.color}-400 transition-colors group/btn relative z-10`}>
                              View Full List <MoveUpRight className="w-3 h-3 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const config = METRIC_DICT[metric] || { label: metric.toUpperCase(), source: "stats", format: "number", icon: Database, color: "cyan" };

  const listData = (() => {
    const maxGP = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.stats?.gp || 0)) : 82;

    if (type === "team") {
      return [...allTeams].sort((a,b) => {
        const vA = getRawVal(a, metric, true, config.source) || 0;
        const vB = getRawVal(b, metric, true, config.source) || 0;
        return config.asc ? vA - vB : vB - vA;
      });
    } else {
      return [...allPlayers].filter(p => nbaService.qualifiesForLeaderboard(p, metric, maxGP)).sort((a,b) => {
        const vA = getRawVal(a, metric, false, config.source) || 0;
        const vB = getRawVal(b, metric, false, config.source) || 0;
        return config.asc ? vA - vB : vB - vA;
      });
    }
  })();

  const filterOptions = Array.from(new Set(listData.map(d => type === "player" ? d.teamId : d.conference))).filter(Boolean).sort();

  const processedData = listData.filter(item => {
    if (filterOption !== "ALL" && (type === "player" ? item.teamId !== filterOption : item.conference !== filterOption)) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const currentData = processedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/nba/rankings" className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl transition-colors shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <ArrowLeft className="w-6 h-6 text-white/60" />
          </Link>
          <div>
            <Badge className={`bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/20 text-[9px] uppercase tracking-[0.3em] font-black mb-2 shadow-[0_0_15px_rgba(var(--${config.color}-500),0.2)]`}>
              League Rankings
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic">{config.label}</h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 bg-[#030712] border border-white/[0.08] rounded-xl px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] w-full sm:w-auto">
            <Search className="w-4 h-4 text-white/30" />
            <input 
              type="text" placeholder={`Search...`} value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-white font-bold outline-none w-full sm:w-40 placeholder:text-white/20 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 bg-[#030712] border border-white/[0.08] rounded-xl px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] w-full sm:w-auto relative">
            <Filter className="w-4 h-4 text-white/30" />
            <select 
              value={filterOption} onChange={(e) => { setFilterOption(e.target.value); setPage(1); }}
              className="bg-transparent text-white font-bold outline-none w-full sm:w-28 text-sm appearance-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#030712]">All {type === 'player' ? 'Teams' : 'Confs'}</option>
              {filterOptions.map((opt: any) => <option key={opt} value={opt} className="bg-[#030712]">{opt}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#050914]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-${config.color}-500/5 rounded-full blur-[120px] pointer-events-none`} />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center px-6 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 mb-4">
            <div className="w-12 text-center">Rank</div>
            <div className="flex-1">{type === 'player' ? 'Athlete' : 'Franchise'}</div>
            <div className="w-24 text-right">Value</div>
          </div>
          
          {currentData.map((item, index) => {
            const actualRank = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const rawVal = getRawVal(item, metric as string, type === "team", config.source);
            
            return (
              <Link 
                to={`/nba/${type === 'player' ? 'players' : 'teams'}/${item.id || item.abbreviation}`} 
                key={item.id || item.abbreviation}
                className={`flex items-center px-6 py-3 bg-white/[0.015] hover:bg-white/[0.05] border border-white/[0.03] hover:border-${config.color}-500/30 rounded-2xl transition-all group`}
              >
                <div className={`w-12 text-center text-sm font-mono font-black text-white/40 group-hover:text-${config.color}-400 transition-colors`}>{actualRank}</div>
                <div className="flex-1 flex items-center gap-5">
                  {type === 'player' ? (
                    <Avatar className={`w-12 h-12 border border-white/10 bg-[#030712] group-hover:border-${config.color}-500/50 transition-colors`}>
                      <AvatarImage src={item.imageUrl} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-black bg-[#030712]">{item.name?.substring(0,2)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <img src={nbaService.getTeamLogoUrl(item.abbreviation)} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                  )}
                  <div className="flex flex-col">
                    <span className={`text-base font-black text-white group-hover:text-${config.color}-400 transition-colors`}>{item.name}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono mt-0.5">{type === 'player' ? item.teamId : item.conference}</span>
                  </div>
                </div>
                <div className={`w-24 text-right font-mono font-black text-xl text-${config.color}-400 group-hover:drop-shadow-[0_0_10px_rgba(var(--${config.color}-500),0.5)] transition-all`}>
                  {metric!.includes('net') || metric!.includes('Net') && rawVal > 0 ? '+' : ''}{formatValue(rawVal, config.format)}
                </div>
              </Link>
            )
          })}
          
          {currentData.length === 0 && (
            <div className="text-center py-20 text-white/30 font-bold uppercase tracking-widest text-sm font-mono">No entities found matching query or filters.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5 relative z-10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 border border-white/5 transition-colors"><ChevronLeft className="w-5 h-5 text-white/70" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 border border-white/5 transition-colors"><ChevronRight className="w-5 h-5 text-white/70" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
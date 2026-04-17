import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, Activity, Database, LayoutGrid, ArrowDownUp, Hexagon, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 🚀 Generador automático de temporadas (desde 1996 hasta 2025)
const SEASONS = Array.from({ length: 30 }, (_, i) => {
  const startYear = 2025 - i;
  const nextYear = String(startYear + 1).slice(-2);
  return `${startYear}-${nextYear}`;
});

export default function NBATeams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const season = searchParams.get("season") || "2025-26";
  
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'rating.ovr', direction: 'desc' });

  useEffect(() => {
    setIsLoading(true);
    nbaService.fetchAllOfficialTeams(season).then((data) => {
      setTeams(data);
      setIsLoading(false);
    });
  }, [season]);

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ season: e.target.value });
  };

  const percentiles = useMemo(() => {
    if (teams.length === 0) return {};
    const calc = (val: number, arr: number[], inv = false) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const count = sorted.filter(v => v <= val).length;
      let pct = Math.round((count / sorted.length) * 100);
      return inv ? 100 - pct : pct; 
    };

    const dists = {
      offRtg: teams.map(t => t.offRtg).filter(v => v > 0),
      defRtg: teams.map(t => t.defRtg).filter(v => v > 0),
      tsPct: teams.map(t => t.tsPct).filter(v => v > 0),
      rebPct: teams.map(t => t.rebPct).filter(v => v > 0),
      astTo: teams.map(t => t.astTo).filter(v => v > 0),
      pace: teams.map(t => t.pace).filter(v => v > 0),
    };

    const result: Record<string, any> = {};
    teams.forEach(t => {
      result[t.id] = {
        off: calc(t.offRtg, dists.offRtg),
        def: calc(t.defRtg, dists.defRtg, true), 
        ts: calc(t.tsPct, dists.tsPct),
        reb: calc(t.rebPct, dists.rebPct),
        astTo: calc(t.astTo, dists.astTo),
        pace: calc(t.pace, dists.pace),
      };
    });
    return result;
  }, [teams]);

  const getArchetype = (teamId: string) => {
    const p = percentiles[teamId];
    if (!p) return { label: "Unknown", classes: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
    
    let core = "";
    let colorClass = "text-slate-300 bg-white/5 border-white/10";
    let tags: string[] = [];

    if (p.off === 100) { core = "Elite Offense (#1)"; colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/30"; }
    else if (p.def === 100) { core = "Elite Defense (#1)"; colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"; }
    else if (p.reb === 100) { core = "Best Rebounding Team"; colorClass = "text-blue-400 bg-blue-500/10 border-blue-500/30"; }
    
    if (!core) {
      if (p.off >= 85 && p.def >= 85) { core = "Two-Way Elite"; colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"; }
      else if (p.off <= 20 && p.def <= 20) { core = "Lottery Bound"; colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30"; }
      else if (p.off >= 85) { core = "Offensive Engine"; colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/30"; }
      else if (p.def >= 85) { core = "Defensive Anchor"; colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"; }
    }

    if (p.reb >= 85 && core !== "Best Rebounding Team") tags.push("Elite Rebounds");
    if (p.ts >= 85) tags.push("Efficient Scorers"); 
    if (p.astTo >= 85) tags.push("Great Passers");

    let pacePrefix = "";
    if (p.pace <= 15) pacePrefix = "Methodical ";
    if (p.pace >= 85) pacePrefix = "Fast-Paced ";

    let finalLabel = core;

    if (core === "Elite Offense (#1)") {
      if (pacePrefix === "Methodical ") finalLabel = "Slow but Elite Offense"; 
      else if (pacePrefix === "Fast-Paced ") finalLabel = "Fast & Elite Offense";
      else if (tags.length > 0) finalLabel = `Elite Offense & ${tags[0]}`;
    } 
    else if (core) {
      let baseName = pacePrefix ? `${pacePrefix}${core}` : core;
      if (tags.length > 0) finalLabel = `${baseName} & ${tags[0]}`;
      else finalLabel = baseName;
    } 
    else {
      if (tags.length > 0) {
        finalLabel = pacePrefix ? `${pacePrefix}${tags[0]}` : tags[0];
        colorClass = "text-teal-400 bg-teal-500/10 border-teal-500/30";
      } else if (pacePrefix === "Fast-Paced ") {
        finalLabel = "Run & Gun System";
        colorClass = "text-purple-400 bg-purple-500/10 border-purple-500/30";
      } else if (pacePrefix === "Methodical ") {
        finalLabel = "Grind-it-Out System";
        colorClass = "text-slate-400 bg-slate-500/10 border-slate-500/30";
      } else {
        finalLabel = "Balanced System";
      }
    }

    return { label: finalLabel, classes: colorClass };
  };

  const sortedTeams = [...teams].sort((a, b) => {
    let valA = a;
    let valB = b;
    
    if (sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        valA = a[keys[0]]?.[keys[1]] || 0;
        valB = b[keys[0]]?.[keys[1]] || 0;
    } else {
        valA = a[sortConfig.key] || 0;
        valB = b[sortConfig.key] || 0;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    if ((key === 'defRtg' || key === 'losses') && sortConfig.key !== key) direction = 'asc';
    setSortConfig({ key, direction });
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Accessing {season} Archives...</p>
    </div>
  );

  const SortHeader = ({ label, sortKey, align = "right" }: any) => (
    <th onClick={() => requestSort(sortKey)} className={`p-4 cursor-pointer hover:bg-[#222] transition-colors whitespace-nowrap text-${align} group`}>
      <div className={`flex items-center gap-1 inline-flex ${align === 'right' ? 'justify-end' : 'justify-center'} w-full`}>
        {label}
        <ArrowDownUp className={`h-3 w-3 ${sortConfig.key === sortKey ? 'text-cyan-400 opacity-100' : 'text-[#444] opacity-0 group-hover:opacity-100'} transition-all`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1 flex items-center gap-3">
            <Activity className="h-8 w-8 text-cyan-400" /> Franchise Hub
          </h1>
          <p className="text-[#888] text-sm">Team Identity Profiling & 2K Ratings</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 🚀 EL SELECTOR DE TEMPORADA */}
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

          <div className="flex bg-[#111] p-1.5 rounded-xl border border-[#222] shadow-lg w-fit">
            <button onClick={() => setViewMode("grid")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "grid" ? 'bg-[#222] text-white' : 'text-[#666] hover:text-white'}`}>
              <LayoutGrid className="w-4 h-4" /> DNA Grid
            </button>
            <button onClick={() => setViewMode("table")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "table" ? 'bg-[#222] text-cyan-400' : 'text-[#666] hover:text-white'}`}>
              <Database className="w-4 h-4" /> Raw Data
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedTeams.map((t, index) => {
            const p = percentiles[t.id];
            const archetype = getArchetype(t.id);
            const rating = t.rating || { ovr: 75, off: 75, def: 75, color: "#888" };
            
            return (
              <Link key={t.id} to={`/nba/teams/${t.abbreviation}?season=${season}`} className="bg-[#111] border border-[#222] rounded-[2rem] p-6 hover:border-[#444] transition-all group shadow-xl relative overflow-hidden flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-[#222] pb-6">
                  <div className="flex items-center gap-4">
                    <img src={nbaService.getTeamLogoUrl(t.abbreviation)} alt={t.name} className="w-14 h-14 object-contain drop-shadow-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <h2 className="text-lg font-black text-white leading-tight group-hover:text-cyan-400 transition-colors">{t.name}</h2>
                      <p className="text-xs font-bold text-[#888] uppercase tracking-widest">{t.wins}W - {t.losses}L</p>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <div className="relative flex items-center justify-center w-14 h-14 hover:scale-110 transition-transform">
                      <Hexagon className="absolute inset-0 w-full h-full drop-shadow-lg" style={{ color: rating.color, fill: `${rating.color}20`, strokeWidth: 1.5 }} />
                      <div className="flex flex-col items-center justify-center relative z-10 mt-0.5">
                        <span className="text-xl font-black font-mono text-white leading-none">{rating.ovr}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: rating.color }}>OVR</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex flex-col gap-2">
                  <Badge className={`px-3 py-1 font-black uppercase tracking-widest text-[9px] border w-fit ${archetype.classes}`}>
                    Identity: {archetype.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-white bg-black/40 border border-white/5 px-2 py-1 rounded-md">OFF <span style={{ color: rating.color }}>{rating.off}</span></span>
                    <span className="text-[10px] font-mono font-bold text-white bg-black/40 border border-white/5 px-2 py-1 rounded-md">DEF <span style={{ color: rating.color }}>{rating.def}</span></span>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  {[
                    { label: "Offense (ORTG)", pct: p?.off || 50, color: "bg-orange-500", raw: t.offRtg.toFixed(1) },
                    { label: "Defense (DRTG)", pct: p?.def || 50, color: "bg-emerald-500", raw: t.defRtg.toFixed(1) },
                    { label: "Pace", pct: p?.pace || 50, color: "bg-purple-500", raw: t.pace.toFixed(1) },
                    { label: "True Shooting", pct: p?.ts || 50, color: "bg-teal-500", raw: `${t.tsPct.toFixed(1)}%` },
                    { label: "Rebounding", pct: p?.reb || 50, color: "bg-blue-500", raw: `${t.rebPct.toFixed(1)}%` },
                    { label: "AST/TO Ratio", pct: p?.astTo || 50, color: "bg-amber-500", raw: t.astTo.toFixed(2) },
                  ].map((stat, i) => (
                    <div key={i} className="relative">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#666]">{stat.label}</span>
                        <span className="text-[10px] font-mono font-bold text-[#aaa]">{stat.raw}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stat.color} opacity-80 group-hover:opacity-100 transition-opacity`} style={{ width: `${stat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {viewMode === "table" && (
        <div className="bg-[#111] rounded-2xl border border-[#222] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-w-[1200px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#151515] text-[9px] font-black text-[#888] uppercase tracking-widest border-b border-[#222]">
                    <th className="p-4 w-12 text-center sticky left-0 bg-[#151515] z-20 border-r border-[#222]">Rnk</th>
                    <th className="p-4 w-64 sticky left-12 bg-[#151515] z-20 border-r border-[#222]">Team</th>
                    <SortHeader label="W" sortKey="wins" align="center" />
                    <SortHeader label="L" sortKey="losses" align="center" />
                    <SortHeader label="OVR" sortKey="rating.ovr" align="center" />
                    <SortHeader label="OFF" sortKey="rating.off" align="center" />
                    <SortHeader label="DEF" sortKey="rating.def" align="center" />
                    <SortHeader label="NET RTG" sortKey="netRtg" />
                    <SortHeader label="TS%" sortKey="tsPct" />
                    <SortHeader label="REB%" sortKey="rebPct" />
                    <SortHeader label="AST/TO" sortKey="astTo" />
                    <SortHeader label="PACE" sortKey="pace" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {sortedTeams.map((t, i) => (
                    <tr key={t.id} className="hover:bg-[#1a1a1a] transition-colors text-xs font-mono font-bold text-white group">
                      <td className="p-4 text-center text-[#555] sticky left-0 bg-[#111] group-hover:bg-[#1a1a1a] z-10 border-r border-[#222]">{i + 1}</td>
                      <td className="p-4 sticky left-12 bg-[#111] group-hover:bg-[#1a1a1a] z-10 border-r border-[#222]">
                        <Link to={`/nba/teams/${t.abbreviation}?season=${season}`} className="flex items-center gap-3 w-max">
                          <img src={nbaService.getTeamLogoUrl(t.abbreviation)} className="w-6 h-6 object-contain" />
                          <span className="font-sans font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">{t.name}</span>
                        </Link>
                      </td>
                      <td className="p-4 text-center text-emerald-400">{t.wins}</td>
                      <td className="p-4 text-center text-rose-400">{t.losses}</td>
                      
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 rounded bg-[#222] border border-[#333]" style={{ color: t.rating?.color || "#fff" }}>{t.rating?.ovr || 75}</span>
                      </td>
                      <td className="p-4 text-center text-slate-300">{t.rating?.off || 75}</td>
                      <td className="p-4 text-center text-slate-300">{t.rating?.def || 75}</td>

                      <td className={`p-4 text-right ${sortConfig.key === 'netRtg' ? 'text-cyan-400' : (t.netRtg > 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                        <span className="bg-[#222] px-2 py-1 rounded-md">{t.netRtg > 0 ? '+' : ''}{t.netRtg.toFixed(1)}</span>
                      </td>
                      <td className={`p-4 text-right ${sortConfig.key === 'tsPct' ? 'text-cyan-400' : 'text-slate-300'}`}>{t.tsPct.toFixed(1)}%</td>
                      <td className={`p-4 text-right ${sortConfig.key === 'rebPct' ? 'text-cyan-400' : 'text-slate-300'}`}>{t.rebPct.toFixed(1)}%</td>
                      <td className={`p-4 text-right ${sortConfig.key === 'astTo' ? 'text-cyan-400' : 'text-slate-300'}`}>{t.astTo.toFixed(2)}</td>
                      <td className={`p-4 text-right ${sortConfig.key === 'pace' ? 'text-cyan-400' : 'text-slate-300'}`}>{t.pace.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
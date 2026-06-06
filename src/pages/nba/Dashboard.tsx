import { useState, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { 
  Activity, Crown, Target, TrendingUp, ShieldAlert, Trophy, Loader2, 
  ChevronRight, ChevronLeft, Zap, Brain, Crosshair, Database, Radar, Flame, Info,
  Percent, Shield, MoveUpRight, FastForward, Maximize2, CalendarDays
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings"; 
import { motion, AnimatePresence } from "framer-motion";

export default function NBADashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true); // ✅ RESTAURADO
  const [dataError, setDataError] = useState<string | null>(null); // ✅ NUEVO
  const [activeTab, setActiveTab] = useState<"leaders" | "efficiency" | "playmaking" | "advanced" | "defense" | "teams">("leaders");
  const tickerRef = useRef<HTMLDivElement>(null);

  const { settings } = useSettings();

  useEffect(() => {
    let isMounted = true;
    
    // Red de seguridad: 15 s máximo antes de salir del estado de carga
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        setDataError('La carga tardó demasiado. Refresca la página.');
      }
    }, 15_000);

    Promise.allSettled([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams(),
    ]).then(([playerResult, teamResult]) => {
      if (!isMounted) return;
      clearTimeout(safetyTimer);
      
      const playerData: any[] = playerResult.status === 'fulfilled' ? playerResult.value : [];
      const teamData: any[]   = teamResult.status  === 'fulfilled' ? teamResult.value  : [];
      
      if (playerResult.status === 'rejected')
        console.warn('[Dashboard] Players failed:', playerResult.reason);
      if (teamResult.status === 'rejected')
        console.warn('[Dashboard] Teams failed:', teamResult.reason);
        
      if (playerData.length === 0 && teamData.length === 0) {
        setDataError('No se pudieron cargar los datos. Comprueba tu conexión.');
        setIsLoading(false);
        return;
      }
      
      const maxGP      = Math.max(...playerData.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);
      
      const playersWithAdv = playerData.map(p => {
        const adv         = nbaService.computeAllAdvanced(p);
        const meetsMins   = (p.stats?.mpg || 0) >= 20;
        const meetsGP     = (p.stats?.gp  || 0) >= requiredGP;
        const mpg         = p.stats?.mpg || 1;
        const dash = {
          stocks36: (((p.stats?.spg || 0) + (p.stats?.bpg || 0)) / mpg) * 36,
          stl36:    ((p.stats?.spg || 0) / mpg) * 36,
          blk36:    ((p.stats?.bpg || 0) / mpg) * 36,
        };
        return { ...p, adv, dash, qualifiesGeneral: meetsMins && meetsGP };
      });
      
      setPlayers(playersWithAdv);
      setTeams(teamData);
      setIsLoading(false);
    });

    // Live games: independiente, fallo silencioso aceptable
    nbaService.fetchLiveGames()
      .then(games => { if (isMounted && games) setLiveGames(games); })
      .catch(() => { /* sin datos en vivo, no es crítico */ });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const scrollTicker = (direction: 'left' | 'right') => {
    if (tickerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      tickerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // ✅ PANTALLA DE CARGA (RESTAURADA)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse" />
        </div>
        <div className="relative w-32 h-32 flex items-center justify-center">
          <Database className="h-8 w-8 text-cyan-400 animate-pulse relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        </div>
      </div>
    );
  }

  // ✅ PANTALLA DE ERROR (NUEVA)
  if (dataError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="text-rose-400 font-black text-sm uppercase tracking-widest">{dataError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-400/30 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const getTopPlayers = (metric: string, source: "stats" | "adv" | "dash" | "hustle" | "playmaking", asc: boolean = false) => {
    const maxGP = players.length > 0 ? Math.max(...players.map(p => p.stats?.gp || 0)) : 82;
    return [...players].filter(p => p.qualifiesGeneral && nbaService.qualifiesForLeaderboard(p, metric, maxGP)).sort((a, b) => {
      const valA = a[source]?.[metric] || 0;
      const valB = b[source]?.[metric] || 0;
      return asc ? valA - valB : valB - valA;
    }).slice(0, 10);
  };

  const getTopTeams = (metric: string, source: "stats" | "opp" | "clutch" = "stats", asc: boolean = false) => {
    return [...teams].sort((a, b) => {
      const valA = source === "stats" ? a[metric] : a[source]?.[metric] || 0;
      const valB = source === "stats" ? b[metric] : b[source]?.[metric] || 0;
      return asc ? valA - valB : valB - valA;
    }).slice(0, 10);
  };

  const formatValue = (val: number, format: "number" | "percent" | "rating") => {
    if (val === undefined || val === null || isNaN(val)) return "0.0";
    return format === 'percent' ? `${val.toFixed(1)}%` : val.toFixed(1);
  };
  
  const mvpCandidates = getTopPlayers("si", "adv").slice(0, 5);
  const topScorer = mvpCandidates[0];

  const LeaderboardPanel = ({ title, icon: Icon, data, metric, type = "player", source = "stats", colorClass, glowClass, suffix = "", linkType = "ranking", format = "number" }: any) => {
    if (!data || data.length === 0) return null;

    const getValue = (item: any) => type === "team" && source !== "stats" ? item[source]?.[metric] : item[source]?.[metric] ?? item[metric];
    const maxVal = format === "percent" ? 100 : (getValue(data[0]) || 1);

    const viewFullUrl = linkType === "analytics" ? `/nba/analytics#dict-${metric.toLowerCase()}` : `/nba/rankings?type=${type}&metric=${metric}`;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#050914]/80 backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-6 relative overflow-hidden group hover:border-white/[0.1] transition-all duration-500 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] flex flex-col h-full"
      >
        <div className={`absolute top-0 right-0 w-48 h-48 bg-${colorClass}-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-${colorClass}-500/10 transition-colors duration-700`} />
        
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/[0.03] border border-white/5 ${glowClass} transition-shadow`}>
              <Icon className={`w-4 h-4 text-${colorClass}-400`} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/90">{title}</h3>
          </div>
          <Link to={viewFullUrl} className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.05] transition-colors group/btn">
            <Maximize2 className={`w-3.5 h-3.5 text-white/40 group-hover/btn:text-${colorClass}-400`} />
          </Link>
        </div>
        
        <div className="space-y-3 relative z-10 flex-1">
          {data.slice(0, 5).map((item: any, i: number) => {
            const rawVal = getValue(item) || 0;
            const pct = Math.max(8, (rawVal / maxVal) * 100);
            
            return (
              <Link to={`/nba/${type === 'player' ? 'players' : 'teams'}/${item.id || item.abbreviation}`} key={item.id || i} className="flex items-center justify-between group/row hover:bg-white/[0.03] p-1.5 -mx-1.5 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-[9px] font-black text-white/30 w-3 font-mono text-right">{i + 1}</span>
                  {type === 'player' ? (
                    <Avatar className={`w-8 h-8 border border-white/10 group-hover/row:border-${colorClass}-400/50 transition-colors bg-[#030712]`}>
                      <AvatarImage src={item.imageUrl} className="object-cover" />
                      <AvatarFallback className="text-[9px] font-black">{item.name?.substring(0,2)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <img src={nbaService.getTeamLogoUrl(item.abbreviation)} className="w-7 h-7 object-contain drop-shadow-md group-hover/row:scale-110 transition-transform" />
                  )}
                  <div className="flex flex-col truncate">
                    <span className={`text-[13px] font-black text-white/80 group-hover/row:text-${colorClass}-400 truncate transition-colors`}>{item.name}</span>
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest font-mono">{type === 'player' ? item.teamId : item.conference}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className={`text-[13px] font-black font-mono tracking-tighter text-${colorClass}-400`}>
                    {(metric === 'netRtg' || metric === 'clutchNetRtg') && rawVal > 0 ? '+' : ''}{formatValue(rawVal, format)}{suffix}
                  </span>
                  <div className="w-12 h-1 bg-black/50 rounded-full mt-1 overflow-hidden border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                     <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full rounded-full bg-${colorClass}-500 shadow-[0_0_10px_currentColor]`} 
                     />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-10 pb-24 max-w-[1600px] mx-auto overflow-x-hidden">
      
      {/* ELITE TICKER */}
      <div className="w-full bg-[#030712]/80 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] overflow-hidden flex items-stretch shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] relative h-[100px] md:h-[110px]">
        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none" />
        <Link to="/nba/schedule" className="bg-gradient-to-br from-cyan-600 to-cyan-400 text-black px-6 md:px-8 font-black text-[10px] uppercase tracking-[0.2em] shrink-0 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_30px_rgba(34,211,238,0.3)] z-20 hover:brightness-110 transition-all cursor-pointer relative">
          <CalendarDays className="w-6 h-6 md:w-7 md:h-7 drop-shadow-md" />
          <span>Schedule</span>
        </Link>
        <div className="absolute left-[90px] md:left-[110px] top-0 h-full w-20 bg-gradient-to-r from-[#030712] via-[#030712]/90 to-transparent z-10 flex items-center justify-start pl-4 pointer-events-none">
          <button onClick={() => scrollTicker('left')} className="p-1.5 rounded-full bg-white/[0.05] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 text-white/50 hover:text-cyan-400 transition-all backdrop-blur-md pointer-events-auto">
             <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div ref={tickerRef} className="flex-1 overflow-x-auto flex items-center px-4 md:px-6 gap-8 md:gap-12 scrollbar-none whitespace-nowrap h-full relative scroll-smooth pl-16 pr-16">
          {liveGames.length > 0 ? liveGames.map((g, i) => (
             <Link key={i} to={`/nba/games/${g.gameId}`} state={{ game: g }} className="flex items-center gap-4 hover:bg-white/[0.04] px-4 py-2 rounded-3xl transition-colors cursor-pointer group h-[80%] border border-transparent hover:border-white/[0.05]">
                <div className="flex flex-col items-center justify-center min-w-[65px]">
                  {g.status === 'live' ? (
                    <span className="text-[10px] font-black font-mono uppercase tracking-widest text-rose-400 animate-pulse bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">{g.quarter}</span>
                  ) : g.status === 'upcoming' ? (
                    <span className="text-[10px] font-black font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">{g.startTime || g.quarter}</span>
                  ) : (
                    <span className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">FINAL</span>
                  )}
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center overflow-visible">
                      <img src={`https://cdn.nba.com/logos/nba/${g.awayId}/global/L/logo.svg`} alt={g.away} className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] group-hover:scale-[1.9] transition-transform duration-300" />
                    </div>
                    <div className="flex flex-col ml-1">
                      <span className="text-base font-black text-white group-hover:text-cyan-400 transition-colors">{g.away}</span>
                      {g.status !== 'upcoming' && !settings.hideResults && <span className={`text-xl font-mono font-black ${g.status==='live' ? 'text-white' : 'text-white/60'}`}>{g.awayScore}</span>}
                    </div>
                  </div>
                  <span className="text-[9px] text-white/20 font-mono font-black px-1 md:px-2">VS</span>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center overflow-visible">
                      <img src={`https://cdn.nba.com/logos/nba/${g.homeId}/global/L/logo.svg`} alt={g.home} className="w-full h-full object-contain scale-[1.7] drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] group-hover:scale-[1.9] transition-transform duration-300" />
                    </div>
                    <div className="flex flex-col items-end mr-1">
                      <span className="text-base font-black text-white group-hover:text-rose-400 transition-colors">{g.home}</span>
                      {g.status !== 'upcoming' && !settings.hideResults && <span className={`text-xl font-mono font-black ${g.status==='live' ? 'text-white' : 'text-white/60'}`}>{g.homeScore}</span>}
                    </div>
                  </div>
                </div>
             </Link>
          )) : (
             <span className="text-sm font-bold text-white/40 tracking-[0.4em] uppercase font-mono px-4">No live protocols engaged.</span>
          )}
        </div>
        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-[#030712] via-[#030712]/90 to-transparent pointer-events-none z-10 flex items-center justify-end pr-4">
          <button onClick={() => scrollTicker('right')} className="p-1.5 rounded-full bg-white/[0.05] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 text-white/50 hover:text-cyan-400 transition-all backdrop-blur-md pointer-events-auto">
             <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HERO MVP RACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="xl:col-span-8 relative rounded-[3rem] bg-[#050914]/90 backdrop-blur-3xl border border-white/[0.06] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] flex flex-col md:flex-row group">
          <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] pointer-events-none z-20" />
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-transparent rounded-full blur-[120px] pointer-events-none group-hover:from-cyan-500/30 transition-colors duration-1000 z-0" />
          <Link to={`/nba/players/${topScorer?.id}`} className="absolute inset-0 z-30" />
          
          <div className="p-10 md:p-12 md:w-[55%] relative z-40 flex flex-col justify-center pointer-events-none">
            <Badge className="w-max bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-black text-[9px] uppercase tracking-[0.4em] mb-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <Radar className="w-3 h-3 mr-2 inline animate-pulse" /> Official MVP Ladder
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85] mb-2 drop-shadow-2xl">
              {topScorer?.name.split(" ")[0]}<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{topScorer?.name.split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="text-xs font-bold text-white/50 uppercase tracking-[0.3em] font-mono mt-4 mb-4 border-l-2 border-cyan-500 pl-3">
              {topScorer?.teamId} <span className="mx-2">|</span> {topScorer?.age} YRS <span className="mx-2">|</span> POS: {topScorer?.position}
            </p>
            <div className="flex flex-wrap gap-4 relative z-40 pointer-events-auto mt-8">
              <div className="bg-[#030712]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4 min-w-[110px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">SI+ Rating</p>
                <p className="text-3xl font-mono font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">{topScorer?.adv.si}</p>
              </div>
              <div className="bg-[#030712]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4 min-w-[110px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">BPM Impact</p>
                <p className="text-3xl font-mono font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">{topScorer?.adv.bpm.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-[45%] h-[110%] pointer-events-none z-10 flex items-end justify-end overflow-hidden rounded-br-[3rem]">
            <img src={topScorer?.imageUrl} className="h-full w-auto object-contain object-bottom translate-y-[2%] md:-translate-x-4 drop-shadow-[[-20px_0_40px_rgba(34,211,238,0.4)]]" alt={topScorer?.name} />
          </div>
        </motion.div>

        {/* TOP 4 CHASERS */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="xl:col-span-4 bg-[#050914]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[3rem] p-8 shadow-[0_30px_80px_-15px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 mb-6 flex items-center gap-3 relative z-10">
            <Trophy className="w-4 h-4 text-rose-400" /> MVP Chasers
          </h3>
          <div className="flex flex-col gap-4 flex-1 relative z-10 justify-center">
            {mvpCandidates.slice(1, 5).map((p, i) => (
              <Link to={`/nba/players/${p.id}`} key={p.id} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-5 hover:bg-white/[0.06] hover:border-rose-500/30 transition-all group shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                <span className="text-2xl font-black font-mono text-white/10 group-hover:text-rose-500/30 transition-colors w-8 text-right">#{i+2}</span>
                <Avatar className="h-12 w-12 border border-white/10 bg-[#030712] shadow-lg group-hover:ring-2 ring-rose-500/50 transition-all">
                  <AvatarImage src={p.imageUrl} className="object-cover" />
                  <AvatarFallback className="text-[10px] font-black">{p.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-[14px] font-black text-white tracking-tight group-hover:text-rose-400 transition-colors">{p.name}</h4>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono mt-1">{p.adv.si} SI+ Rating</p>
                </div>
              </Link>
            ))}
            <Link to="/nba/rankings?type=player&metric=si" className="mt-2 w-full py-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-500/5 transition-all group">
              Access Full Ladder <MoveUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* METRIC TERMINAL BENTO GRID */}
      <div className="pt-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white drop-shadow-lg flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400" /> Metric Terminal
          </h2>
          <div className="flex flex-wrap bg-[#030712]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-1.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]">
            {[
              { id: "leaders", label: "League Leaders" },
              { id: "efficiency", label: "Efficiency" },
              { id: "playmaking", label: "Floor Generals" },
              { id: "advanced", label: "Advanced Impact" },
              { id: "defense", label: "Defensive Anchors" },
              { id: "teams", label: "Team Dynamics" }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 md:px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${activeTab === tab.id ? 'bg-white/[0.08] text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-6"
          >
            {activeTab === "leaders" && (
              <>
                <LeaderboardPanel title="Points Per Game" icon={Flame} data={getTopPlayers("ppg", "stats")} metric="ppg" source="stats" linkType="ranking" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
                <LeaderboardPanel title="Assists Per Game" icon={Brain} data={getTopPlayers("apg", "stats")} metric="apg" source="stats" linkType="ranking" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                <LeaderboardPanel title="Rebounds Per Game" icon={Activity} data={getTopPlayers("rpg", "stats")} metric="rpg" source="stats" linkType="ranking" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" />
                <LeaderboardPanel title="Steals Per Game" icon={Crosshair} data={getTopPlayers("spg", "stats")} metric="spg" source="stats" linkType="ranking" colorClass="rose" glowClass="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
                <LeaderboardPanel title="Blocks Per Game" icon={ShieldAlert} data={getTopPlayers("bpg", "stats")} metric="bpg" source="stats" linkType="ranking" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
              </>
            )}

            {activeTab === "efficiency" && (
              <>
                <LeaderboardPanel title="True Shooting %" icon={Target} data={getTopPlayers("ts", "adv")} metric="ts" source="adv" linkType="ranking" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" format="percent" />
                <LeaderboardPanel title="Effective FG%" icon={Percent} data={getTopPlayers("efg", "adv")} metric="efg" source="adv" linkType="ranking" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" format="percent" />
                <LeaderboardPanel title="3PT Percentage" icon={Crosshair} data={getTopPlayers("threePct", "stats")} metric="threePct" source="stats" linkType="ranking" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" format="percent" />
                <LeaderboardPanel title="Field Goal %" icon={Target} data={getTopPlayers("fgPct", "stats")} metric="fgPct" source="stats" linkType="ranking" colorClass="rose" glowClass="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]" format="percent" />
                <LeaderboardPanel title="Free Throw %" icon={Target} data={getTopPlayers("ftPct", "stats")} metric="ftPct" source="stats" linkType="ranking" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" format="percent" />
              </>
            )}

            {activeTab === "playmaking" && (
              <>
                <LeaderboardPanel title="Assists Per Game" icon={Brain} data={getTopPlayers("apg", "stats")} metric="apg" source="stats" linkType="ranking" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                <LeaderboardPanel title="Assist Percentage" icon={Percent} data={getTopPlayers("astPct", "playmaking")} metric="astPct" source="playmaking" linkType="ranking" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" format="percent" />
                <LeaderboardPanel title="AST/TO Ratio" icon={Activity} data={getTopPlayers("astTo", "playmaking")} metric="astTo" source="playmaking" linkType="ranking" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" />
                <LeaderboardPanel title="Assist Ratio" icon={TrendingUp} data={getTopPlayers("astRatio", "playmaking")} metric="astRatio" source="playmaking" linkType="ranking" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
                <LeaderboardPanel title="Offensive Usage" icon={Zap} data={getTopPlayers("usg", "adv")} metric="usg" source="adv" linkType="ranking" colorClass="rose" glowClass="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]" format="percent" />
              </>
            )}

            {activeTab === "advanced" && (
              <>
                <LeaderboardPanel title="Player Eff. (PER)" icon={Trophy} data={getTopPlayers("per", "adv")} metric="per" source="adv" linkType="analytics" colorClass="gold" glowClass="group-hover:shadow-[0_0_20px_rgba(250,204,21,0.3)]" />
                <LeaderboardPanel title="Box Plus/Minus" icon={TrendingUp} data={getTopPlayers("bpm", "adv")} metric="bpm" source="adv" linkType="analytics" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                <LeaderboardPanel title="Value Over Rep." icon={Crown} data={getTopPlayers("vorp", "adv")} metric="vorp" source="adv" linkType="analytics" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                <LeaderboardPanel title="Player Impact (PIE)" icon={Radar} data={getTopPlayers("pie", "adv")} metric="pie" source="adv" linkType="analytics" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" format="percent" />
                <LeaderboardPanel title="Net Rating" icon={TrendingUp} data={getTopPlayers("net", "adv")} metric="net" source="adv" linkType="analytics" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
              </>
            )}

            {activeTab === "defense" && (
              <>
                <LeaderboardPanel title="Defensive Rating" icon={ShieldAlert} data={getTopPlayers("defRating", "stats", true)} metric="defRating" source="stats" linkType="ranking" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" />
                <LeaderboardPanel title="Deflections" icon={Activity} data={getTopPlayers("deflections", "hustle")} metric="deflections" source="hustle" linkType="ranking" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                <LeaderboardPanel title="Contested Shots" icon={Target} data={getTopPlayers("contestedShots", "hustle")} metric="contestedShots" source="hustle" linkType="ranking" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
                <LeaderboardPanel title="Contested 3PT" icon={Crosshair} data={getTopPlayers("contested3pt", "hustle")} metric="contested3pt" source="hustle" linkType="ranking" colorClass="rose" glowClass="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
                <LeaderboardPanel title="Stocks Per 36" icon={Shield} data={getTopPlayers("stocks36", "dash")} metric="stocks36" source="dash" linkType="ranking" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
              </>
            )}

            {activeTab === "teams" && (
              <>
                <LeaderboardPanel title="Net Rating" icon={TrendingUp} data={getTopTeams("netRtg")} metric="netRtg" type="team" linkType="ranking" colorClass="cyan" glowClass="group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
                <LeaderboardPanel title="Clutch Net Rtg" icon={Flame} data={getTopTeams("clutchNetRtg", "clutch")} metric="clutchNetRtg" source="clutch" type="team" linkType="ranking" colorClass="rose" glowClass="group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
                <LeaderboardPanel title="Opponent FG%" icon={ShieldAlert} data={getTopTeams("oppFgPct", "opp", true)} metric="oppFgPct" source="opp" type="team" linkType="ranking" colorClass="emerald" glowClass="group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]" format="percent" />
                <LeaderboardPanel title="AST to TO Ratio" icon={Brain} data={getTopTeams("astTo")} metric="astTo" type="team" linkType="ranking" colorClass="purple" glowClass="group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                <LeaderboardPanel title="Pace (Poss/48)" icon={FastForward} data={getTopTeams("pace")} metric="pace" type="team" linkType="ranking" colorClass="orange" glowClass="group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
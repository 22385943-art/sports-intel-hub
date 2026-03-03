import { useState, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Activity, Crown, Target, TrendingUp, ShieldAlert, Trophy, Loader2, ChevronRight, ChevronLeft, Zap, Brain, Crosshair } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSettings } from "@/hooks/useSettings"; // 🚀 AÑADIDO HOOK

export default function NBADashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 🚀 AÑADIDO: Leemos los settings globales
  const { settings } = useSettings();

  useEffect(() => {
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams()
    ]).then(([playerData, teamData]) => {
      const maxGP = Math.max(...playerData.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);

      const playersWithAdv = playerData.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const meetsMins = (p.stats?.mpg || 0) >= 20;
        const meetsGP = (p.stats?.gp || 0) >= requiredGP;
        return { ...p, adv, qualifiesGeneral: meetsMins && meetsGP };
      });

      setPlayers(playersWithAdv);
      setTeams(teamData);
      setIsLoading(false);
    });

    nbaService.fetchLiveGames().then(games => {
      if (games) setLiveGames(games);
    });
  }, []);

  // Motor de Scroll Automático Suave
  useEffect(() => {
    let animationFrameId: number;
    const scrollContainer = carouselRef.current;

    const scrollStep = () => {
      if (scrollContainer && !isHovered) {
        scrollContainer.scrollLeft += 1; 
        if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
          scrollContainer.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered]);

  const manualScroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "right" ? 350 : -350;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Loading Command Center...</p>
      </div>
    );
  }

  const getTop10 = (metric: string) => players.filter(p => p.qualifiesGeneral).sort((a, b) => b.adv[metric] - a.adv[metric]).slice(0, 10);

  const metricsData = [
    { id: "bpm", title: "Box Plus/Minus (BPM)", icon: TrendingUp, accent: "text-emerald-400", data: getTop10("bpm") },
    { id: "per", title: "Efficiency (PER)", icon: Trophy, accent: "text-blue-400", data: getTop10("per") },
    { id: "vorp", title: "Value Over Rep. (VORP)", icon: Activity, accent: "text-amber-400", data: getTop10("vorp") },
    { id: "pie", title: "Player Impact Est. (PIE)", icon: Crown, accent: "text-purple-400", data: getTop10("pie") },
    { id: "net", title: "Net Rating", icon: ShieldAlert, accent: "text-cyan-400", data: getTop10("net") },
    { id: "usg", title: "Usage Rate (USG%)", icon: Zap, accent: "text-rose-400", data: getTop10("usg") },
    { id: "ts", title: "True Shooting (TS%)", icon: Target, accent: "text-teal-400", data: getTop10("ts") },
    { id: "ast", title: "Assist Pct (AST%)", icon: Brain, accent: "text-indigo-400", data: getTop10("ast") },
    { id: "efg", title: "Effective FG (eFG%)", icon: Crosshair, accent: "text-orange-400", data: getTop10("efg") }
  ];

  const carouselData = [...metricsData, ...metricsData];
  const netRatingTeams = [...teams].sort((a, b) => b.netRtg - a.netRtg).slice(0, 5);
  const offRatingTeams = [...teams].sort((a, b) => b.offRtg - a.offRtg).slice(0, 5);
  const defRatingTeams = [...teams].sort((a, b) => a.defRtg - b.defRtg).slice(0, 5);
  const topScorer = getTop10("bpm")[0];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 overflow-x-hidden">
      
      {/* HERO BANNER */}
      <div className="bg-[#111] rounded-[2rem] border border-[#222] p-8 md:p-12 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Activity className="h-3.5 w-3.5 animate-pulse" /> Live Season 2025-26
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">LEAGUE COMMAND CENTER</h1>
          <p className="text-[#888] max-w-xl text-sm leading-relaxed">Real-time individual and collective metrics. Monitoring the MVP race and Team Power Rankings across the association.</p>
        </div>

        {topScorer && (
          <Link to={`/nba/players/${topScorer.id}`} className="bg-[#1a1a1a]/80 backdrop-blur-md border border-[#333] rounded-3xl p-6 flex items-center gap-6 relative z-10 hover:border-emerald-500/50 transition-all group shadow-2xl shrink-0">
            <div className="absolute -top-3 -right-3 bg-emerald-500 text-black p-2 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Crown className="h-5 w-5" />
            </div>
            <Avatar className="h-20 w-20 border-2 border-[#333] bg-black group-hover:scale-105 transition-transform">
              <AvatarImage src={topScorer.imageUrl} className="object-cover" />
              <AvatarFallback>{topScorer.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">MVP Algorithm Leader</p>
              <p className="text-2xl font-bold text-white leading-none mb-1">{topScorer.name}</p>
              <p className="text-sm font-bold text-[#888]">{topScorer.teamId} · {topScorer.adv.bpm.toFixed(1)} BPM</p>
            </div>
          </Link>
        )}
      </div>

      {/* LIVE SCORES TICKER */}
      <div>
        <Link to="/nba/schedule" className="group inline-flex items-center gap-2 mb-3">
          <h3 className="text-[10px] font-black text-[#666] uppercase tracking-widest flex items-center gap-2 group-hover:text-white transition-colors">
            <Activity className="h-3 w-3 text-red-500 group-hover:animate-pulse" /> Schedule
          </h3>
          <ChevronRight className="h-3 w-3 text-[#666] group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {liveGames.length > 0 ? liveGames.map((g, i) => (
            <Link key={i} to={`/nba/games/${g.gameId}`} state={{ game: g }} className="min-w-[220px] bg-[#111] border border-[#222] rounded-2xl p-5 shadow-lg shrink-0 flex flex-col justify-between hover:bg-[#161616] hover:border-[#444] transition-all relative overflow-hidden group">
              <div className="flex justify-between items-center mb-5">
                <span className={`text-[9px] font-black uppercase tracking-widest ${g.status === 'live' ? 'text-red-500 animate-pulse' : 'text-[#777]'}`}>
                  {g.status === "live" && <span className="mr-1.5 inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />}
                  {g.quarter}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={`https://cdn.nba.com/logos/nba/${g.awayId}/global/L/logo.svg`} alt={g.away} className="w-6 h-6 object-contain drop-shadow-md" />
                    <span className="font-bold text-white text-sm">{g.away}</span>
                  </div>
                  {/* 🚀 Ocultar resultado si settings.hideResults es true */}
                  <span className="font-mono font-bold text-[#ccc] text-lg">
                    {g.status !== "upcoming" ? (settings.hideResults ? "***" : g.awayScore) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={`https://cdn.nba.com/logos/nba/${g.homeId}/global/L/logo.svg`} alt={g.home} className="w-6 h-6 object-contain drop-shadow-md" />
                    <span className="font-bold text-white text-sm">{g.home}</span>
                  </div>
                  <span className="font-mono font-bold text-[#ccc] text-lg">
                    {g.status !== "upcoming" ? (settings.hideResults ? "***" : g.homeScore) : "-"}
                  </span>
                </div>
              </div>
            </Link>
          )) : (
             <div className="text-[#666] text-xs font-bold p-4 bg-[#111] rounded-2xl border border-[#222]">No games scheduled for today.</div>
          )}
        </div>
      </div>

      {/* CARRUSEL CONTINUO */}
      <div 
        className="pt-4 border-t border-white/5 relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <Link to="/nba/analytics" className="group flex items-center gap-2 w-fit">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white group-hover:text-cyan-400 transition-colors">Player Impact Analytics</h2>
            <ChevronRight className="h-6 w-6 text-[#666] group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        <div className="relative overflow-hidden w-full group/carousel">
          <button 
            onClick={() => manualScroll("left")} 
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-[#111]/80 border border-white/20 text-white backdrop-blur-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={() => manualScroll("right")} 
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-[#111]/80 border border-white/20 text-white backdrop-blur-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0f18] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0f18] to-transparent z-10 pointer-events-none" />
          
          <div 
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {carouselData.map((m, idx) => (
              <div key={`${m.id}-${idx}`} className="w-[320px] md:w-[350px] shrink-0">
                <LeaderCard title={m.title} icon={m.icon} accent={m.accent} data={m.data} metricId={m.id} type="player" isTop10={true} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TEAM POWER RANKINGS */}
      <div className="pt-4 border-t border-white/5">
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6">Team Power Rankings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeaderCard title="Net Rating Leaders" icon={TrendingUp} accent="text-emerald-400" data={netRatingTeams} metricId="netRtg" type="team" />
          <LeaderCard title="Offensive Juggernauts" icon={Target} accent="text-orange-400" data={offRatingTeams} metricId="offRtg" type="team" />
          <LeaderCard title="Defensive Anchors" icon={ShieldAlert} accent="text-cyan-400" data={defRatingTeams} metricId="defRtg" type="team" />
        </div>
      </div>
    </div>
  );
}

function LeaderCard({ title, icon: Icon, accent, data, metricId, type, isTop10 = false }: any) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-[1.5rem] p-6 shadow-xl h-full">
      {type === "player" && isTop10 ? (
        <Link to={`/nba/analytics#${metricId}`} className="flex items-center gap-3 mb-4 pb-4 border-b border-[#222] group/title transition-colors">
          <Icon className={`h-5 w-5 ${accent}`} />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#aaa] group-hover/title:text-white transition-colors">{title}</h3>
          <ChevronRight className="h-3 w-3 text-[#555] opacity-0 group-hover/title:opacity-100 group-hover/title:translate-x-1 transition-all ml-auto" />
        </Link>
      ) : (
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#222]">
          <Icon className={`h-5 w-5 ${accent}`} />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#aaa]">{title}</h3>
        </div>
      )}
      
      <div className="space-y-2">
        {data.map((item: any, i: number) => (
          <Link 
            key={item.id} 
            to={type === "player" ? `/nba/players/${item.id}` : `/nba/teams/${item.teamId || item.abbreviation}`} 
            className={`flex items-center justify-between group hover:bg-[#1a1a1a] rounded-xl transition-colors -mx-2 ${isTop10 ? 'p-1.5' : 'p-2'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-[#555] w-4 text-right pr-1">{i + 1}</span>
              {type === "player" ? (
                <Avatar className={`${isTop10 ? 'h-8 w-8' : 'h-10 w-10'} border border-[#333] bg-black`}>
                  <AvatarImage src={item.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-[#111] text-[9px] text-[#555] font-bold">{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <img src={nbaService.getTeamLogoUrl(item.abbreviation)} alt={item.name} className={`${isTop10 ? 'h-6 w-6' : 'h-8 w-8'} object-contain`} />
              )}
              <div className="flex flex-col">
                <span className={`font-bold text-white group-hover:text-white transition-colors ${isTop10 ? 'text-xs truncate max-w-[120px]' : 'text-sm'}`}>
                  {type === "player" ? item.name : item.name}
                </span>
                <span className="text-[8px] font-black text-[#666] uppercase tracking-widest">
                  {type === "player" ? item.teamId : `${item.wins}W - ${item.losses}L`}
                </span>
              </div>
            </div>
            <span className={`font-mono font-black ${isTop10 ? 'text-xs' : 'text-sm'} ${accent}`}>
              {type === "team" && metricId === 'netRtg' && item[metricId] > 0 ? '+' : ''}
              {type === "player" ? item.adv[metricId].toFixed(1) : item[metricId].toFixed(1)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { footballService, DOMESTIC_LEAGUES, EURO_LEAGUES } from "@/services/sports/footballService";
import { Activity, Shield, Loader2, Trophy, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 🚀 PROTECCIÓN CONTRA FOTOS ROTAS (Evita 404 en consola si falla ESPN)
const handleImgError = (e: any, name: string, type: 'player'|'team') => {
  if (e.currentTarget.src.includes('ui-avatars')) return;
  const color = type === 'player' ? '10b981' : 'fff';
  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'UNK')}&background=0a0f18&color=${color}&bold=true`;
};

export default function FootballDashboard() {
  const [standings, setStandings] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [leagueType, setLeagueType] = useState<"domestic" | "euro">("domestic");
  const [activeLeague, setActiveLeague] = useState(DOMESTIC_LEAGUES[0].id);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      footballService.fetchRealStandings(activeLeague),
      footballService.fetchRealPlayers(activeLeague)
    ])
    .then(([stData, plData]) => {
      setStandings(stData || []);
      setPlayers(plData || []);
    })
    .catch(() => {
      setStandings([]);
      setPlayers([]);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [activeLeague]);

  const activeLeaguesList = leagueType === "domestic" ? DOMESTIC_LEAGUES : EURO_LEAGUES;

  const MetricCarousel = ({ title, icon: Icon, items, renderItem }: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return (
      <div className="pt-6 border-t border-[#222]">
        <h2 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-3 mb-4 px-2"><Icon className="w-5 h-5 text-emerald-400" /> {title}</h2>
        <div className="p-8 text-center bg-[#111] rounded-2xl border border-[#222] text-[#666] font-bold text-xs">No data available from ESPN for this competition right now.</div>
      </div>
    );
    
    return (
      <div className="pt-6 border-t border-[#222]">
        <h2 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-3 mb-4 px-2">
          <Icon className="w-5 h-5 text-emerald-400" /> {title}
        </h2>
        <div className="relative w-full group flex items-center">
          <button onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })} className="absolute -left-4 z-30 p-2 rounded-full bg-[#111] border border-[#333] text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black shadow-xl"><ChevronLeft className="h-5 w-5" /></button>
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 w-full px-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {items.map((item: any, i: number) => renderItem(item, i))}
          </div>
          <button onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })} className="absolute -right-4 z-30 p-2 rounded-full bg-[#111] border border-[#333] text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black shadow-xl"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 overflow-x-hidden">
      
      <div className="bg-[#111] rounded-[2rem] border border-[#222] p-8 md:p-12 relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <Activity className="h-3.5 w-3.5 animate-pulse" /> Live Global Pitch
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">European Football</h1>
          
          <div className="mt-8 flex justify-center bg-[#1a1a1a] p-1.5 rounded-xl border border-[#333] shadow-lg w-fit mx-auto">
            <button onClick={() => { setLeagueType("domestic"); setActiveLeague(DOMESTIC_LEAGUES[0].id); }} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueType === "domestic" ? 'bg-[#222] text-white border border-[#444]' : 'text-[#666] hover:text-white'}`}>Domestic Leagues</button>
            <button onClick={() => { setLeagueType("euro"); setActiveLeague(EURO_LEAGUES[0].id); }} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueType === "euro" ? 'bg-[#222] text-white border border-[#444]' : 'text-[#666] hover:text-white'}`}>UEFA Competitions</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {activeLeaguesList.map(league => (
          <button key={league.id} onClick={() => setActiveLeague(league.id)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border ${activeLeague === league.id ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg' : 'bg-[#111] text-slate-500 border-[#222] hover:bg-[#1a1a1a] hover:text-white'}`}>
            <img src={league.logo} className="w-5 h-5 object-contain" alt="" />
            {league.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Gathering Match Data...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          <MetricCarousel title="League Standings" icon={Trophy} items={standings.slice(0,10)} renderItem={(t:any) => (
            <Link key={t.id} to={`/football/teams/${t.id}`} className="w-[200px] shrink-0 bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col items-center text-center hover:border-emerald-500/50 hover:bg-[#1a1a1a] transition-all group">
              <span className="absolute top-3 left-3 text-[10px] font-black text-[#555]">#{t.rank}</span>
              {/* 🚀 Interceptor en Logo de Equipo */}
              <img src={t.logo} onError={(e) => handleImgError(e, t.teamName, 'team')} className="w-14 h-14 object-contain mb-3 drop-shadow-md group-hover:scale-110 transition-transform" alt="" />
              <h3 className="font-bold text-white text-sm truncate w-full mb-2">{t.teamName}</h3>
              <div className="w-full flex justify-between px-2 text-[10px] font-black text-[#888] uppercase tracking-widest">
                <span>PTS: <span className="text-emerald-400 text-sm">{t.points}</span></span>
                <span>GD: {t.gd > 0 ? `+${t.gd}` : t.gd}</span>
              </div>
            </Link>
          )} />

          <MetricCarousel title="Golden Boot Race" icon={Target} items={players.slice(0,10)} renderItem={(p:any, i:number) => (
            <Link key={p.id} to={`/football/players/${p.id}`} className="w-[240px] shrink-0 bg-[#111] border border-[#222] rounded-2xl p-5 flex items-center gap-4 hover:border-amber-500/50 hover:bg-[#1a1a1a] transition-all group">
              <span className="text-xs font-black text-[#555] w-4">{i + 1}</span>
              <Avatar className="h-12 w-12 border border-[#333] bg-black">
                {/* 🚀 Interceptor en Avatar de Jugador */}
                <AvatarImage src={p.imageUrl} onError={(e) => handleImgError(e, p.name, 'player')} className="object-cover object-top" />
                <AvatarFallback className="bg-[#111] text-amber-500 font-bold">{p.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-bold text-white text-sm truncate group-hover:text-amber-400 transition-colors">{p.name}</span>
                <span className="text-[9px] font-black text-[#666] uppercase tracking-widest truncate">{p.teamName}</span>
              </div>
              <div className="text-right flex flex-col">
                <span className="font-mono font-black text-xl text-amber-400">{p.stats.goals}</span>
                <span className="text-[8px] font-black text-[#555]">GLS</span>
              </div>
            </Link>
          )} />
          
          <MetricCarousel title="Highest Scoring Teams" icon={Shield} items={[...standings].sort((a,b)=> b.gf - a.gf).slice(0,10)} renderItem={(t:any) => (
            <Link key={`atk-${t.id}`} to={`/football/teams/${t.id}`} className="w-[180px] shrink-0 bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col justify-center text-center hover:border-blue-500/50 transition-all group">
              <img src={t.logo} onError={(e) => handleImgError(e, t.teamName, 'team')} className="w-10 h-10 mx-auto mb-3 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt=""/>
              <p className="text-[9px] font-black text-[#666] uppercase tracking-widest mb-2 truncate group-hover:text-white transition-colors">{t.teamName}</p>
              <span className="font-mono font-black text-3xl text-blue-400">{t.gf}</span>
              <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mt-1">Goals For</span>
            </Link>
          )} />

        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { footballService, DOMESTIC_LEAGUES, EURO_LEAGUES } from "@/services/sports/footballService";
import { Loader2, Calendar, Play } from "lucide-react";
import { motion } from "framer-motion";

export default function FootballSchedule() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [leagueType, setLeagueType] = useState<"domestic" | "euro">("domestic");
  const [activeLeague, setActiveLeague] = useState(DOMESTIC_LEAGUES[0].id);

  useEffect(() => {
    setIsLoading(true);
    footballService.fetchLiveMatches(activeLeague).then((data) => {
      setMatches(data);
      setIsLoading(false);
    });
  }, [activeLeague]);

  const activeLeaguesList = leagueType === "domestic" ? DOMESTIC_LEAGUES : EURO_LEAGUES;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16 max-w-[1200px] mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Match Schedule</h1>
            <p className="text-slate-400 text-sm font-bold mt-1">Live Scoreboard & Fixtures</p>
          </div>
        </div>

        <div className="flex bg-[#1a1a1a] p-1.5 rounded-xl border border-[#333] shadow-lg w-fit">
          <button onClick={() => { setLeagueType("domestic"); setActiveLeague(DOMESTIC_LEAGUES[0].id); }} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueType === "domestic" ? 'bg-[#222] text-white border border-[#444]' : 'text-[#666] hover:text-white'}`}>Domestic</button>
          <button onClick={() => { setLeagueType("euro"); setActiveLeague(EURO_LEAGUES[0].id); }} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueType === "euro" ? 'bg-[#222] text-white border border-[#444]' : 'text-[#666] hover:text-white'}`}>UEFA</button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {activeLeaguesList.map(league => (
          <button 
            key={league.id} onClick={() => setActiveLeague(league.id)}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border flex items-center gap-2 ${
              activeLeague === league.id ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#111] text-slate-500 border-[#222] hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <img src={league.logo} className="w-4 h-4 object-contain opacity-80" alt="" />
            {league.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-[#111] rounded-[2rem] border border-[#222] text-[#666] font-bold">No matches scheduled.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {matches.map((m) => (
            <div key={m.id} className="bg-[#111] border border-[#222] rounded-[1.5rem] p-6 hover:border-blue-500/30 transition-all shadow-xl relative overflow-hidden group">
              <div className="flex justify-between items-center mb-6">
                <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${m.isLive ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' : (m.status === 'post' ? 'bg-[#222] text-[#888]' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')}`}>
                  {m.isLive ? <><Play className="w-2.5 h-2.5" /> {m.clock}</> : m.status === 'post' ? 'Full Time' : m.date}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={m.homeLogo} alt={m.homeTeam} className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{m.homeTeam}</span>
                  </div>
                  <span className={`text-2xl font-mono font-black ${m.status === 'pre' ? 'text-[#333]' : 'text-white'}`}>
                    {m.status === 'pre' ? '-' : m.homeScore}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={m.awayLogo} alt={m.awayTeam} className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{m.awayTeam}</span>
                  </div>
                  <span className={`text-2xl font-mono font-black ${m.status === 'pre' ? 'text-[#333]' : 'text-white'}`}>
                    {m.status === 'pre' ? '-' : m.awayScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
import { useState, useEffect } from "react";
import { footballService, DOMESTIC_LEAGUES, EURO_LEAGUES } from "@/services/sports/footballService";
import { Loader2, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function FootballTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [leagueType, setLeagueType] = useState<"domestic" | "euro">("domestic");
  const [activeLeague, setActiveLeague] = useState(DOMESTIC_LEAGUES[0].id);

  useEffect(() => {
    setIsLoading(true);
    footballService.fetchRealTeams(activeLeague).then((data) => {
      setTeams(data);
      setIsLoading(false);
    });
  }, [activeLeague]);

  const activeLeaguesList = leagueType === "domestic" ? DOMESTIC_LEAGUES : EURO_LEAGUES;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16 max-w-[1600px] mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Global Clubs</h1>
            <p className="text-slate-400 text-sm font-bold mt-1">Official Franchise Directory</p>
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
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 bg-[#111] rounded-[2rem] border border-[#222] text-[#666] font-bold">No teams found for this competition.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="bg-[#111] border border-[#222] rounded-3xl p-6 flex flex-col items-center text-center hover:bg-[#1a1a1a] hover:border-blue-500/50 transition-all group cursor-pointer shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `#${t.color}` }} />
              <img src={t.logo} alt={t.name} className="w-20 h-20 object-contain drop-shadow-xl group-hover:scale-110 transition-transform mb-4" />
              <h3 className="text-sm font-black text-white leading-tight group-hover:text-blue-400 transition-colors">{t.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t.abbreviation}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
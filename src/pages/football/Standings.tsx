import { useState, useEffect } from "react";
import { footballService, SOCCER_LEAGUES } from "@/services/sports/footballService";
import { Loader2, Trophy, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function FootballStandings() {
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState(SOCCER_LEAGUES[0].id);

  useEffect(() => {
    setIsLoading(true);
    footballService.fetchRealStandings(activeLeague).then((data) => {
      setStandings(data);
      setIsLoading(false);
    });
  }, [activeLeague]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16 max-w-[1600px] mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Trophy className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Global Standings</h1>
            <p className="text-slate-400 text-sm font-bold mt-1">Official Real-Time Domestic & European Tables</p>
          </div>
        </div>
      </div>

      {/* SELECTOR DE LIGAS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SOCCER_LEAGUES.map(league => (
          <button 
            key={league.id} onClick={() => setActiveLeague(league.id)}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border flex items-center gap-2 ${
              activeLeague === league.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#111] text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <img src={league.logo} className="w-4 h-4 object-contain opacity-80" alt="" />
            {league.name}
          </button>
        ))}
      </div>

      <div className="bg-[#111] rounded-[2rem] border border-[#222] shadow-2xl overflow-hidden relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]/80 backdrop-blur-sm z-10">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Syncing UEFA / Domestic Data...</p>
          </div>
        ) : standings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
            <Shield className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-bold uppercase tracking-widest text-sm">Table data unavailable for this competition.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-[#151515] border-b border-[#222] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <div className="col-span-1 text-center">Pos</div>
                <div className="col-span-4">Club</div>
                <div className="col-span-1 text-center">MP</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">D</div>
                <div className="col-span-1 text-center">L</div>
                <div className="col-span-1 text-center">GF:GA</div>
                <div className="col-span-1 text-center text-white">GD</div>
                <div className="col-span-1 text-center text-emerald-400">PTS</div>
              </div>
              
              <div className="divide-y divide-[#222]">
                {standings.map((t, i) => {
                  const isChampionsLeague = i < 4;
                  const isEuropaLeague = i === 4 || i === 5;
                  const isRelegation = i >= standings.length - 3;
                  
                  return (
                    <div key={t.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-[#1a1a1a] transition-colors items-center group relative cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1" 
                           style={{ backgroundColor: activeLeague.includes('uefa') ? 'transparent' : isChampionsLeague ? '#10b981' : isEuropaLeague ? '#f59e0b' : isRelegation ? '#ef4444' : 'transparent' }} />
                      
                      <div className="col-span-1 text-center font-mono font-bold text-[#666] group-hover:text-emerald-400 transition-colors">{t.rank}</div>
                      <div className="col-span-4 flex items-center gap-4">
                        <img src={t.logo} alt={t.teamName} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{t.teamName}</span>
                      </div>
                      <div className="col-span-1 text-center font-mono text-slate-400">{t.played}</div>
                      <div className="col-span-1 text-center font-mono font-bold text-emerald-400/80">{t.wins}</div>
                      <div className="col-span-1 text-center font-mono text-slate-400">{t.draws}</div>
                      <div className="col-span-1 text-center font-mono font-bold text-rose-400/80">{t.losses}</div>
                      <div className="col-span-1 text-center font-mono text-slate-500 text-xs">{t.gf}:{t.ga}</div>
                      <div className="col-span-1 text-center font-mono font-bold text-white">{t.gd > 0 ? `+${t.gd}` : t.gd}</div>
                      <div className="col-span-1 text-center font-mono font-black text-emerald-400 text-lg">{t.points}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
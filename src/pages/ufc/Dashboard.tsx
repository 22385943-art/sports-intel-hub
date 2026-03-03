import { ufcService } from "@/services/sports/ufcService";
import { Swords, Trophy, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function UFCDashboard() {
  const fighters = ufcService.getAllPlayers();
  const nextEvent = ufcService.getUpcomingEvents()[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER HERO */}
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-red-500/20 p-8 md:p-12 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
          <Swords className="w-96 h-96" />
        </div>
        <div className="relative z-10">
          <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 font-black tracking-[0.2em] uppercase mb-4">MMA Command Center</Badge>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">The Octagon</h1>
          <p className="text-slate-400 mt-2 max-w-xl">Pound-for-Pound rankings, advanced striking metrics, and upcoming Pay-Per-View breakdowns.</p>
        </div>
        
        {/* UPCOMING EVENT BOX */}
        <div className="mt-8 md:mt-0 bg-[#111] border border-white/10 rounded-2xl p-6 relative z-10 w-full md:w-80 shadow-2xl">
          <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3 animate-pulse"/> Next Event</p>
          <h3 className="text-2xl font-black text-white">{nextEvent.name}</h3>
          <p className="text-sm font-bold text-slate-400">{nextEvent.mainEvent}</p>
          <div className="w-full h-px bg-white/10 my-4" />
          <p className="text-xs font-mono text-slate-500">{nextEvent.date} • {nextEvent.location}</p>
        </div>
      </div>

      {/* POUND FOR POUND TOP 4 */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
          <Trophy className="text-amber-400 w-5 h-5" /> Pound-for-Pound Kings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fighters.map((fighter, idx) => (
            <Link key={fighter.id} to={`/ufc/fighters/${fighter.id}`} className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-red-500/50 transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] group relative overflow-hidden">
              <span className="absolute top-4 left-4 font-mono font-black text-4xl text-white/5 group-hover:text-red-500/10 transition-colors">#{idx + 1}</span>
              <div className="flex flex-col items-center text-center relative z-10">
                <img src={fighter.imageUrl} alt={fighter.name} className="h-40 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
                <h3 className="font-black text-lg text-white mt-4">{fighter.name}</h3>
                <p className="text-xs font-black text-amber-500 tracking-widest uppercase">{fighter.record}</p>
                <div className="mt-4 flex gap-4 w-full justify-center">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SLpM</p>
                    <p className="font-mono font-bold text-slate-300">{fighter.stats.slpm}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">TD Avg</p>
                    <p className="font-mono font-bold text-slate-300">{fighter.stats.tdAvg}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </motion.div>
  );
}

// Para usar el componente Badge si no lo importaste:
function Badge({ children, className }: any) {
  return <span className={`px-3 py-1 rounded-full text-[10px] ${className}`}>{children}</span>;
}
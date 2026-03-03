import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, Swords, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function UFCFighters() {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    ufcService.fetchRealRankings().then((data) => {
      setDivisions(data);
      if (data.length > 0) setActiveTab(data[0].id); 
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Accessing Official Rankings...</p>
    </div>
  );

  const activeDivision = divisions.find(d => d.id === activeTab);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 max-w-7xl mx-auto">
      
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center justify-between relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none"><Swords className="w-64 h-64" /></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">Official Rankings</h1>
          <p className="text-slate-400 text-sm mt-2">Live Full Roster Database powered by ESPN.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {divisions.map(wc => (
          <button 
            key={wc.id} onClick={() => setActiveTab(wc.id)}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${
              activeTab === wc.id ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#111] text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            {wc.name}
          </button>
        ))}
      </div>

      {activeDivision && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest italic">{activeDivision.name}</h2>
            <Badge className="bg-white/5 text-slate-400 border-white/10">{activeDivision.top15.length + (activeDivision.champion ? 1 : 0)} Ranked</Badge>
          </div>

          {activeDivision.champion && (
            <Link to={`/ufc/fighters/${activeDivision.champion.id}`} className="bg-gradient-to-r from-amber-500/10 to-[#0a0f18] border border-amber-500/20 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 group hover:border-amber-500/50 transition-colors shadow-xl">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                <img src={activeDivision.champion.imageUrl} className="w-24 h-24 md:w-32 md:h-32 object-cover object-top rounded-full border-4 border-amber-500 relative z-10 bg-[#111]" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeDivision.champion.name)}&background=0f172a&color=ef4444&bold=true`; }} />
                <Crown className="absolute -top-3 -right-3 w-8 h-8 text-amber-400 drop-shadow-md rotate-12 relative z-20" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{activeDivision.isP4P ? "#1 POUND-FOR-POUND" : "Undisputed Champion"}</p>
                <h3 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none group-hover:text-amber-400 transition-colors">{activeDivision.champion.name}</h3>
                <p className="text-xs font-mono font-bold text-slate-400 mt-2">{activeDivision.champion.record}</p>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeDivision.top15.map((fighter: any) => (
              <Link key={fighter.id} to={`/ufc/fighters/${fighter.id}`} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.03] hover:border-white/20 transition-all">
                <div className="w-10 text-center shrink-0">
                  <span className="text-xl font-mono font-black text-slate-600 group-hover:text-red-500 transition-colors">{fighter.rank}</span>
                </div>
                <img src={fighter.imageUrl} className="w-14 h-14 object-cover object-top rounded-full bg-[#0a0f18] border border-white/10 group-hover:border-red-500/50 transition-colors" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fighter.name)}&background=0f172a&color=ef4444&bold=true`; }} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-white truncate group-hover:text-red-400 transition-colors">{fighter.name}</h4>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{fighter.country} • {fighter.record}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
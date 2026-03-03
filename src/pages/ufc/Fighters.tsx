import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, Search, Filter, Swords, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function UFCFighters() {
  const [fighters, setFighters] = useState<any[]>([]);
  const [weightClasses, setWeightClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    window.scrollTo(0, 0);
    // Simulamos carga de API
    setTimeout(() => {
      setFighters(ufcService.getAllPlayers());
      setWeightClasses(ufcService.getAllTeams());
      setIsLoading(false);
    }, 400);
  }, []);

  const filteredFighters = useMemo(() => {
    return fighters.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                            f.nickname.toLowerCase().includes(search.toLowerCase());
      const matchesWeight = activeFilter === "all" || f.teamId === activeFilter;
      return matchesSearch && matchesWeight;
    });
  }, [fighters, search, activeFilter]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Fighter Database...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 max-w-7xl mx-auto">
      
      {/* HEADER & SEARCH */}
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center justify-between relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
          <Swords className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">Active Roster</h1>
          <p className="text-slate-400 text-sm mt-2">Browse the UFC database by weight class and combat style.</p>
        </div>

        <div className="relative z-10 w-full md:w-96">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name or nickname..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* WEIGHT CLASS FILTERS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Divisions</span>
        </div>
        
        <button 
          onClick={() => setActiveFilter("all")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 border ${
            activeFilter === "all" ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#111] text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'
          }`}
        >
          Pound-for-Pound (All)
        </button>

        {weightClasses.map(wc => (
          <button 
            key={wc.id}
            onClick={() => setActiveFilter(wc.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 border ${
              activeFilter === wc.id ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#111] text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            {wc.name} <span className="opacity-50 ml-1">{wc.limitLbs}</span>
          </button>
        ))}
      </div>

      {/* FIGHTERS GRID */}
      {filteredFighters.length === 0 ? (
        <div className="text-center py-20 bg-[#111] border border-white/5 rounded-[2rem]">
          <Swords className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white">No Fighters Found</h3>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your search or weight class filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFighters.map((fighter) => (
            <Link 
              key={fighter.id} 
              to={`/ufc/fighters/${fighter.id}`} 
              className="bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:border-red-500/40 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(239,68,68,0.15)] group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <Badge className="bg-white/5 text-slate-300 border border-white/10 font-black text-[9px] uppercase tracking-widest">
                  {fighter.teamId}
                </Badge>
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">{fighter.record}</span>
              </div>

              <div className="flex flex-col items-center mt-2 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img src={fighter.imageUrl} alt={fighter.name} className="h-40 w-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-500 relative z-10" />
                </div>
                
                <h3 className="font-black text-xl text-white mt-4 group-hover:text-red-400 transition-colors uppercase italic tracking-tight text-center">{fighter.name}</h3>
                {fighter.nickname !== "None" && (
                  <p className="text-xs font-bold text-slate-500 mt-1">"{fighter.nickname}"</p>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-3">{fighter.position}</p>
              </div>

              <div className="mt-auto pt-6 w-full relative z-10">
                <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition-colors">
                  <span className="font-bold uppercase tracking-widest text-[9px]">View Dossier</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-red-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </motion.div>
  );
}
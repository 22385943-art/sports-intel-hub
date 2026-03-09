import { useState, useEffect, useRef } from "react";
import { ufcService } from "@/services/sports/ufcService";
import { Swords, Activity, Crown, ChevronLeft, ChevronRight, ChevronRightCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

// 🚀 PROTECTOR DE IMÁGENES ROTAS
const handleImgError = (e: any, name: string) => {
  if (e.currentTarget.src.includes('ui-avatars')) return;
  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Fighter')}&background=0a0f18&color=ef4444&size=256&bold=true`;
};

export default function UFCDashboard() {
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [maleChamps, setMaleChamps] = useState<any[]>([]);
  const [femaleChamps, setFemaleChamps] = useState<any[]>([]);

  useEffect(() => {
    ufcService.fetchLiveAndUpcomingEvents().then((events) => {
      const upcoming = events.find(e => e.status !== "post");
      if (upcoming) setNextEvent(upcoming);
      else if (events.length > 0) setNextEvent(events[0]);
    });

    ufcService.fetchRealRankings().then(data => {
      // Excluímos P4P para que solo salgan los campeones divisionales
      const divisions = data.filter(d => d.champion && !d.isP4P && d.champion.id !== "0");
      setMaleChamps(divisions.filter(d => d.gender === "male"));
      setFemaleChamps(divisions.filter(d => d.gender === "female"));
    });
  }, []);

  const ChampionCarousel = ({ title, divisions }: { title: string, divisions: any[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      let animationFrameId: number;
      const scrollStep = () => {
        if (scrollRef.current && !isHovered && divisions.length > 3) {
          scrollRef.current.scrollLeft += 0.8; 
          if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
            scrollRef.current.scrollLeft = 0;
          }
        }
        animationFrameId = requestAnimationFrame(scrollStep);
      };
      animationFrameId = requestAnimationFrame(scrollStep);
      return () => cancelAnimationFrame(animationFrameId);
    }, [isHovered, divisions]);

    if (divisions.length === 0) return null;
    const displayData = divisions.length >= 3 ? [...divisions, ...divisions] : divisions;

    return (
      <div className="pt-4" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
            <Crown className="text-amber-400 w-6 h-6" /> {title}
          </h2>
          <Link to="/ufc/fighters" className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1">
            View All Rankings <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="relative w-full group/carousel flex items-center">
          <button onClick={() => { if(scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: "smooth" }) }} className="absolute -left-4 z-30 p-3 rounded-full bg-[#111]/90 border border-[#333] text-white backdrop-blur-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black shadow-xl">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-6 w-full px-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {displayData.map((div, idx) => (
              <Link key={`${div.id}-${idx}`} to={`/ufc/fighters/${div.champion.id}`} className="w-[280px] shrink-0 bg-[#0a0f18] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all flex flex-col items-center">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                <Badge className="bg-white/5 text-amber-400 border-white/10 font-black text-[9px] uppercase tracking-widest mb-4 text-center whitespace-normal">{div.name}</Badge>
                <div className="relative w-28 h-28 mb-4">
                  <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img src={div.champion.imageUrl} alt={div.champion.name} className="w-full h-full object-cover object-top rounded-full border-2 border-white/10 shadow-xl group-hover:scale-105 transition-transform bg-[#111]" onError={(e) => handleImgError(e, div.champion.name)} />
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-1.5 rounded-full shadow-lg"><Crown className="w-4 h-4" /></div>
                </div>
                <h3 className="font-black text-lg text-white uppercase tracking-tight leading-none text-center group-hover:text-amber-400 transition-colors">{div.champion.name}</h3>
              </Link>
            ))}
          </div>
          <button onClick={() => { if(scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: "smooth" }) }} className="absolute -right-4 z-30 p-3 rounded-full bg-[#111]/90 border border-[#333] text-white backdrop-blur-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black shadow-xl">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-red-500/20 p-8 md:p-12 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none"><Swords className="w-96 h-96" /></div>
        <div className="relative z-10 w-full md:w-auto text-center md:text-left">
          <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 font-black tracking-[0.2em] uppercase mb-4 px-4 py-1.5">Live Database</Badge>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">The Octagon</h1>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto md:mx-0">Official ESPN Real-Time Data. Division rankings, fighter dossiers, and live event tracking.</p>
        </div>
        
        <Link to="/ufc/schedule" className="mt-8 md:mt-0 bg-[#111] border border-white/10 rounded-2xl p-6 relative z-10 w-full md:w-96 shadow-2xl hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] transition-all group block">
          {nextEvent ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${nextEvent.isLive ? 'text-red-500' : 'text-amber-500'}`}>
                  <Activity className={`w-3 h-3 ${nextEvent.isLive ? 'animate-pulse' : ''}`}/> {nextEvent.isLive ? 'LIVE NOW' : 'Next Event'}
                </p>
                <ChevronRightCircle className="w-4 h-4 text-slate-600 group-hover:text-red-500 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white leading-tight uppercase italic">{nextEvent.name}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1">{nextEvent.mainEvent}</p>
              <div className="w-full h-px bg-white/10 my-4" />
              <p className="text-xs font-mono text-slate-500">{nextEvent.date} • {nextEvent.location}</p>
            </>
          ) : (
            <div className="text-center text-slate-500 font-bold text-sm py-8 animate-pulse">Syncing Satellite...</div>
          )}
        </Link>
      </div>

      <ChampionCarousel title="Men's Champions" divisions={maleChamps} />
      <ChampionCarousel title="Women's Champions" divisions={femaleChamps} />
    </motion.div>
  );
}
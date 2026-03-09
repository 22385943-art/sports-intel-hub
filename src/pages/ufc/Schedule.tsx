import { useState, useEffect } from "react";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, Calendar, MapPin, Swords, ChevronDown, Activity, Flame, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function UFCSchedule() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    ufcService.fetchLiveAndUpcomingEvents().then(data => {
      setEvents(data || []);
      if(data && data.length > 0) setExpandedId(data[0].id);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Downloading Fight Cards...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2 flex items-center gap-3 italic">
            <Calendar className="h-8 w-8 text-red-500" /> Event Schedule
          </h1>
          <p className="text-slate-400 text-sm font-bold">Upcoming Pay-Per-Views and Fight Nights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {events.map((ev, idx) => {
          const isLive = ev.isLive;
          const isNumberedPPV = ev.name.toLowerCase().includes("ufc 3") || ev.name.toLowerCase().includes("ufc 2");
          const isExpanded = expandedId === ev.id;

          return (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`bg-[#0a0f18] border rounded-[2rem] shadow-2xl relative overflow-hidden transition-all duration-500 ${isLive ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20'}`}>
              <div className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ev.id)}>
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-10 ${isNumberedPPV ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div className="space-y-4 flex-1 relative z-10">
                  <div className="flex flex-wrap items-center gap-3">
                    {isLive ? <Badge className="bg-red-500/20 text-red-500 border-red-500/30 font-black text-[10px] uppercase tracking-widest px-3 py-1 flex items-center gap-1.5 animate-pulse"><Activity className="w-3 h-3" /> Live Now</Badge>
                     : <Badge className="bg-white/10 text-white border-white/20 font-black text-[10px] uppercase tracking-widest px-3 py-1 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Upcoming</Badge>}
                    {isNumberedPPV && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black text-[10px] uppercase tracking-widest px-3 py-1 flex items-center gap-1.5"><Flame className="w-3 h-3" /> PPV</Badge>}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic mb-1">{ev.name}</h2>
                    <div className="flex items-center gap-2 text-[#888] text-sm font-bold"><MapPin className="w-4 h-4 text-red-500" />{ev.location}</div>
                  </div>
                </div>

                <div className="flex-1 bg-[#111] border border-white/5 rounded-2xl p-4 text-center relative z-10 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500 mb-1">Main Event</p>
                  <h3 className="text-lg md:text-xl font-black text-white uppercase leading-tight tracking-tight">{ev.mainEvent}</h3>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center shrink-0 min-w-[150px] relative z-10">
                  <div className="text-left md:text-right mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#666]">Date & Time</p>
                    <p className="text-sm font-mono font-bold text-white">{ev.date}</p>
                  </div>
                  <button className={`w-full md:w-auto px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-[#1a1a1a] border border-white/10 text-white hover:bg-white/10`}>
                    View Card <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-black/40">
                    <div className="p-6 md:p-8 space-y-2">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Official Fight Card</h4>
                      {ev.bouts && ev.bouts.length > 0 ? ev.bouts.map((bout: any, i: number) => {
                        const isMain = i === 0;
                        const isCoMain = i === 1;
                        return (
                          <div 
                            key={i} 
                            onClick={() => { navigate(`/ufc/preview`, { state: { f1Id: bout.f1.id, f2Id: bout.f2.id, eventName: ev.name } }); }}
                            className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border cursor-pointer ${isMain ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' : isCoMain ? 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10' : 'bg-white/5 border-white/5 hover:bg-white/10'} transition-colors group gap-4`}
                          >
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest w-20 hidden md:block ${isMain ? 'text-red-400' : isCoMain ? 'text-amber-400' : 'text-slate-500'}`}>
                                {isMain ? 'Main Event' : isCoMain ? 'Co-Main' : `Bout ${i+1}`}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {bout.f1.rank && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${bout.f1.rank === 'C' ? 'bg-amber-500 text-black' : 'bg-[#111] text-slate-400 border border-white/10'}`}>{bout.f1.rank}</span>}
                                  <span className={`font-bold uppercase tracking-tight ${isMain ? 'text-lg text-white' : 'text-sm text-slate-300'}`}>{bout.f1.name}</span>
                                </div>
                                <span className="text-[#555] text-xs font-black italic mx-1">VS</span>
                                <div className="flex items-center gap-2">
                                  {bout.f2.rank && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${bout.f2.rank === 'C' ? 'bg-amber-500 text-black' : 'bg-[#111] text-slate-400 border border-white/10'}`}>{bout.f2.rank}</span>}
                                  <span className={`font-bold uppercase tracking-tight ${isMain ? 'text-lg text-white' : 'text-sm text-slate-300'}`}>{bout.f2.name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-cyan-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">
                              Matchup Preview <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        )
                      }) : (
                        <p className="text-slate-500 font-bold italic text-sm py-4">Bouts are currently being finalized...</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
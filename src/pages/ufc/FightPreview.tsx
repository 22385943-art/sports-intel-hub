import { useState, useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, ChevronLeft, Target, Shield, Activity, Swords, Brain } from "lucide-react";
import { motion } from "framer-motion";

const CompareBar = ({ label, v1, v2, icon: Icon, inverse = false }: any) => {
  const total = Number(v1) + Number(v2) || 1;
  const p1Pct = (Number(v1) / total) * 100;
  const p2Pct = (Number(v2) / total) * 100;
  let p1Wins = Number(v1) > Number(v2);
  if (inverse) p1Wins = Number(v1) < Number(v2);

  return (
    <div className="py-4 border-b border-white/[0.04] last:border-0 group/bar">
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xl font-mono font-black tracking-tight ${p1Wins ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-slate-600'}`}>{v1}</span>
        <div className="flex items-center gap-2 text-slate-500">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em]">{label}</span>
        </div>
        <span className={`text-xl font-mono font-black tracking-tight ${!p1Wins && v1 !== v2 ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-slate-600'}`}>{v2}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.03] gap-px">
        <motion.div initial={{ width: 0 }} animate={{ width: `${p1Pct}%` }} transition={{ duration: 1 }} className={`h-full rounded-l-full ${p1Wins ? 'bg-cyan-500' : 'bg-slate-800'}`} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${p2Pct}%` }} transition={{ duration: 1 }} className={`h-full rounded-r-full ${!p1Wins && v1 !== v2 ? 'bg-rose-500' : 'bg-slate-800'}`} />
      </div>
    </div>
  );
};

export default function UFCFightPreview() {
  const location = useLocation();
  const data = location.state;
  
  const [f1, setF1] = useState<any>(null);
  const [f2, setF2] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!data) return;
    window.scrollTo(0, 0);
    // Usamos el ID Numérico
    Promise.all([
      ufcService.fetchRealFighterProfile(data.f1Id),
      ufcService.fetchRealFighterProfile(data.f2Id)
    ]).then(([fighter1, fighter2]) => {
      setF1(fighter1);
      setF2(fighter2);
      setIsLoading(false);
    });
  }, [data]);

  if (!data) return <Navigate to="/ufc/schedule" replace />;

  if (isLoading || !f1 || !f2) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Simulating Matchup...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 max-w-5xl mx-auto px-4">
      <Link to="/ufc/schedule" className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Schedule
      </Link>

      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none"><Swords className="w-[800px] h-[800px]" /></div>
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500" />
        
        <span className="px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em] mb-10 bg-white/[0.04] text-slate-400 border border-white/[0.06] relative z-10">
          {data.eventName}
        </span>

        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl relative z-10 gap-10 md:gap-0">
          
          <Link to={`/ufc/fighters/${f1.id}`} className="flex flex-col items-center text-center flex-1 group">
            <img src={f1.imageUrl} className="h-48 md:h-64 object-cover object-top rounded-full md:rounded-none drop-shadow-[0_0_30px_rgba(255,255,255,0.08)] group-hover:scale-105 transition-transform bg-[#111] md:bg-transparent border-4 border-[#111] md:border-none" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f1.name)}&background=0f172a&color=ef4444&bold=true`; }} />
            <h2 className="text-2xl md:text-3xl font-black text-white mt-4 group-hover:text-cyan-400 transition-colors uppercase italic tracking-tighter">{f1.name}</h2>
            <p className="text-xs font-mono font-bold text-slate-500 mt-1">{f1.record}</p>
          </Link>

          <div className="flex flex-col items-center justify-center shrink-0 px-8">
            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-rose-400 italic mb-2">VS</span>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">{f1.weightClass}</p>
          </div>

          <Link to={`/ufc/fighters/${f2.id}`} className="flex flex-col items-center text-center flex-1 group">
            <img src={f2.imageUrl} className="h-48 md:h-64 object-cover object-top rounded-full md:rounded-none drop-shadow-[0_0_30px_rgba(255,255,255,0.08)] group-hover:scale-105 transition-transform bg-[#111] md:bg-transparent border-4 border-[#111] md:border-none" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f2.name)}&background=0f172a&color=ef4444&bold=true`; }} />
            <h2 className="text-2xl md:text-3xl font-black text-white mt-4 group-hover:text-rose-400 transition-colors uppercase italic tracking-tighter">{f2.name}</h2>
            <p className="text-xs font-mono font-bold text-slate-500 mt-1">{f2.record}</p>
          </Link>

        </div>
      </div>

      <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl relative">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 text-center">Tale of the Tape</h3>
        <div className="flex flex-col gap-2 max-w-3xl mx-auto">
          <CompareBar label="Significant Strikes / Min" v1={f1.stats.slpm} v2={f2.stats.slpm} icon={Target} />
          <CompareBar label="Striking Accuracy %" v1={f1.stats.strAcc} v2={f2.stats.strAcc} icon={Target} />
          <CompareBar label="Strikes Absorbed / Min" v1={f1.stats.sapm} v2={f2.stats.sapm} icon={Shield} inverse={true} />
          <CompareBar label="Takedowns / 15 Min" v1={f1.stats.tdAvg} v2={f2.stats.tdAvg} icon={Swords} />
          <CompareBar label="Takedown Defense %" v1={f1.stats.tdDef} v2={f2.stats.tdDef} icon={Shield} />
          <CompareBar label="Submissions / 15 Min" v1={f1.stats.subAvg} v2={f2.stats.subAvg} icon={Brain} />
        </div>
      </div>

    </motion.div>
  );
}
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, ChevronLeft, Swords, Shield, Target, Activity, Flame, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useFavorites } from "@/hooks/useFavorites";

export default function UFCFighterProfile() {
  const { id } = useParams();
  const [fighter, setFighter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 HOOK DE FAVORITOS
  const { toggleFavorite, isFavorite } = useFavorites();
  const isFav = fighter ? isFavorite(fighter.id, 'player') : false;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      ufcService.fetchRealFighterProfile(id).then(data => {
        setFighter(data);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Decrypting ESPN Database...</p>
    </div>
  );

  if (!fighter) return <div className="text-white text-center py-20 font-bold">Fighter data restricted or not found.</div>;

  const s = fighter.stats;
  const radarData = [
    { subject: 'Striking Vol', value: Math.min(100, (s.slpm / 7.5) * 100), raw: s.slpm },
    { subject: 'Str Accuracy', value: s.strAcc, raw: `${s.strAcc}%` },
    { subject: 'Str Defense', value: s.strDef, raw: `${s.strDef}%` },
    { subject: 'Takedowns', value: Math.min(100, (s.tdAvg / 5.0) * 100), raw: s.tdAvg },
    { subject: 'TD Defense', value: s.tdDef, raw: `${s.tdDef}%` },
    { subject: 'Submissions', value: Math.min(100, (s.subAvg / 2.5) * 100), raw: s.subAvg },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a0f18]/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
          <p className="text-white font-black text-[10px] uppercase tracking-widest mb-1">{data.subject}</p>
          <p className="text-red-400 font-mono font-bold text-lg">{data.raw}</p>
        </div>
      );
    }
    return null;
  };

  const StatBox = ({ label, value, icon: Icon, accent = "text-white" }: any) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center group hover:bg-white/[0.04] transition-colors">
      <Icon className={`w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-opacity ${accent}`} />
      <span className={`text-2xl font-mono font-black tracking-tight ${accent}`}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-16 max-w-6xl mx-auto px-4">
      
      <Link to="/ufc/fighters" className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Rankings
      </Link>

      {/* HERO SECTION */}
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2.5rem] border border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col md:flex-row items-center pt-8 md:pt-0">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 opacity-[0.03] pointer-events-none"><Swords className="w-[500px] h-[500px]" /></div>

        {/* Fighter Image */}
        <div className="w-full md:w-5/12 flex justify-center relative z-10">
          <img src={fighter.imageUrl} alt={fighter.name} className="h-64 md:h-[400px] object-cover rounded-full md:rounded-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#111] md:bg-transparent border-4 border-[#111] md:border-none" />
        </div>

        {/* Fighter Info */}
        <div className="w-full md:w-7/12 p-8 md:p-12 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
            <Badge className="bg-red-500 text-white font-black uppercase tracking-[0.2em] border-none px-4 py-1">{fighter.weightClass}</Badge>
            <Badge className="bg-white/10 text-white font-black uppercase tracking-[0.2em] border-white/20 px-4 py-1">{fighter.country}</Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{fighter.name}</h1>
          {fighter.nickname !== "None" && <h2 className="text-xl md:text-2xl font-bold text-red-400 mb-6">"{fighter.nickname}"</h2>}
          
          <div className="flex items-center gap-6 mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Record</span>
              <span className="text-2xl font-mono font-black text-white">{fighter.record}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metrics</span>
              <span className="text-lg font-black text-amber-400 uppercase tracking-tight mt-1">{fighter.height} / {fighter.weight}</span>
            </div>
          </div>

          {/* BOTÓN FAVORITOS */}
          <button 
            onClick={() => toggleFavorite({
              id: fighter.id, type: 'player', name: fighter.name, 
              subtitle: fighter.weightClass, imageUrl: fighter.imageUrl, url: `/ufc/fighters/${fighter.id}`
            })}
            className="w-48 font-bold py-3 rounded-full transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            style={{ 
              backgroundColor: isFav ? '#111' : '#ef4444',
              color: isFav ? '#ef4444' : '#fff',
              border: isFav ? `1px solid #ef4444` : 'none'
            }}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            {isFav ? 'Tracked' : 'Track Fighter'}
          </button>

        </div>
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-red-500" /> Simulated Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Str Landed/Min" value={fighter.stats.slpm} icon={Target} accent="text-cyan-400" />
            <StatBox label="Str Absorb/Min" value={fighter.stats.sapm} icon={Shield} accent="text-rose-400" />
            <StatBox label="Takedown Avg" value={fighter.stats.tdAvg} icon={Activity} accent="text-amber-400" />
            <StatBox label="Submission Avg" value={fighter.stats.subAvg} icon={Swords} accent="text-purple-400" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6">
            <Target className="w-4 h-4 text-red-500" /> Combat Style Signature
          </h3>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 900 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Radar name={fighter.name} dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={3} dot={{ r: 4, fill: '#0a0f18', stroke: '#ef4444', strokeWidth: 2 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
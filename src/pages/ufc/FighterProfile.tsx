import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ufcService } from "@/services/sports/ufcService";
import { Loader2, ChevronLeft, Swords, Shield, Target, Activity, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip
} from "recharts";

export default function UFCFighterProfile() {
  const { id } = useParams();
  const [fighter, setFighter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      // Simulamos un pequeño delay de carga de API
      setTimeout(() => {
        setFighter(ufcService.getPlayerById(id));
        setIsLoading(false);
      }, 400);
    }
  }, [id]);

  // 🚀 NORMALIZADOR DE MÉTRICAS PARA EL RADAR (Escala 0-100)
  const radarData = useMemo(() => {
    if (!fighter) return [];
    const s = fighter.stats;
    
    // Normalizamos valores crudos a una escala 0-100 para el gráfico
    // Ej: Un SLpM de 7.0 es élite (100%), un TD Avg de 5.0 es élite (100%)
    return [
      { subject: 'Striking Vol', value: Math.min(100, (s.slpm / 7.5) * 100), raw: s.slpm },
      { subject: 'Str Accuracy', value: s.strAcc, raw: `${s.strAcc}%` },
      { subject: 'Str Defense', value: s.strDef, raw: `${s.strDef}%` },
      { subject: 'Takedowns', value: Math.min(100, (s.tdAvg / 5.0) * 100), raw: s.tdAvg },
      { subject: 'TD Defense', value: s.tdDef, raw: `${s.tdDef}%` },
      { subject: 'Submissions', value: Math.min(100, (s.subAvg / 2.5) * 100), raw: s.subAvg },
    ];
  }, [fighter]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Accessing Fighter Dossier...</p>
    </div>
  );

  if (!fighter) return <div className="text-white text-center py-20 font-bold">Fighter not found.</div>;

  // Custom Tooltip para el Radar
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
      
      <Link to="/ufc" className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
      </Link>

      {/* ═══ HERO SECTION ═══ */}
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2.5rem] border border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col md:flex-row items-end md:items-center pt-12 md:pt-0">
        
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 opacity-[0.03] pointer-events-none">
          <Swords className="w-[500px] h-[500px]" />
        </div>

        {/* Fighter Image */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full md:w-1/2 flex justify-center relative z-10"
        >
          <img src={fighter.imageUrl} alt={fighter.name} className="h-[400px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
        </motion.div>

        {/* Fighter Info */}
        <div className="w-full md:w-1/2 p-8 md:p-12 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
          <Badge className="bg-red-500 text-white font-black uppercase tracking-[0.2em] border-none mb-4 px-4 py-1">
            {fighter.teamId} Division
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
            {fighter.name}
          </h1>
          
          {fighter.nickname !== "None" && (
            <h2 className="text-xl md:text-2xl font-bold text-red-400 mb-4">
              "{fighter.nickname}"
            </h2>
          )}
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Record</span>
              <span className="text-2xl font-mono font-black text-white">{fighter.record}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Country</span>
              <span className="text-2xl font-mono font-black text-white">{fighter.country}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Style</span>
              <span className="text-lg font-black text-amber-400 uppercase tracking-tight mt-1">{fighter.position}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ANALYTICS GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Key Stats */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-red-500" /> Metric Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Strikes Landed / Min" value={fighter.stats.slpm} icon={Target} accent="text-cyan-400" />
            <StatBox label="Strikes Absorbed / Min" value={fighter.stats.sapm} icon={Shield} accent="text-rose-400" />
            <StatBox label="Takedown Avg / 15m" value={fighter.stats.tdAvg} icon={Activity} accent="text-amber-400" />
            <StatBox label="Submission Avg / 15m" value={fighter.stats.subAvg} icon={Swords} accent="text-purple-400" />
          </div>
        </div>

        {/* Right: Fighter Style Radar */}
        <div className="lg:col-span-2 bg-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6">
            <Target className="w-4 h-4 text-red-500" /> Combat Style Signature
          </h3>
          
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 900, textAnchor: 'middle' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Radar
                  name={fighter.name}
                  dataKey="value"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0a0f18', stroke: '#ef4444', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#fff', stroke: '#ef4444' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </motion.div>
  );
}
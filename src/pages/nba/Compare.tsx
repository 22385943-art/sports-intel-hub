import { useState, useMemo } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarGraphic, Legend, Tooltip as RechartsTooltip } from "recharts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Zap, Shield, Trophy, MousePointer2, BarChart3, Target, Activity, Flame, Crosshair, TrendingUp } from "lucide-react";

export default function ComparePlayers() {
  const { sport } = useSport();
  const allPlayers = nbaService.getAllPlayers();
  
  const [p1Id, setP1Id] = useState<string>(allPlayers[0]?.id || "");
  const [p2Id, setP2Id] = useState<string>(allPlayers[1]?.id || "");

  const p1 = useMemo(() => nbaService.getPlayerById(p1Id), [p1Id]);
  const p2 = useMemo(() => nbaService.getPlayerById(p2Id), [p2Id]);

  // 🧠 MOTOR DE ANALÍTICA AVANZADA: TS%, eFG% y USG% Estimado
  const statsAnalysis = useMemo(() => {
    if (!p1 || !p2) return [];
    
    const calculateAdvancedMetrics = (p: any) => {
      // Si no hay FGA/FTA en mockData, usamos estimaciones basadas en PPG y FG%
      const fga = p.stats.fga || (p.stats.ppg / (p.stats.fgPct / 50));
      const fta = p.stats.fta || (p.stats.ppg * 0.25);
      
      const ts = (p.stats.ppg / (2 * (fga + 0.44 * fta))) * 100;
      const efg = p.stats.fgPct + (0.5 * (p.stats.threePct || 0) * (p.stats.threeAttemptRate || 0.3));
      const usg = (p.stats.ppg * 0.8) + (p.stats.apg * 0.5) + (p.stats.topg || 2); // Proxy de Usage

      return {
        ts: isNaN(ts) || ts === 0 ? p.stats.fgPct * 1.1 : ts, // Fallback pro-rata
        efg: isNaN(efg) || efg === 0 ? p.stats.fgPct * 1.05 : efg,
        usg: Math.min(38, Math.max(15, usg)) // Normalizado a rangos NBA
      };
    };

    const adv1 = calculateAdvancedMetrics(p1);
    const adv2 = calculateAdvancedMetrics(p2);

    const metrics = [
      { label: "Points (PPG)", v1: p1.stats.ppg, v2: p2.stats.ppg, icon: <Flame className="w-4 h-4 text-orange-500" /> },
      { label: "True Shooting %", v1: adv1.ts, v2: adv2.ts, icon: <Target className="w-4 h-4 text-blue-400" /> },
      { label: "Effective FG%", v1: adv1.efg, v2: adv2.efg, icon: <Crosshair className="w-4 h-4 text-emerald-400" /> },
      { label: "Usage Rate %", v1: adv1.usg, v2: adv2.usg, icon: <Activity className="w-4 h-4 text-purple-400" /> },
      { label: "Rebounds (RPG)", v1: p1.stats.rpg, v2: p2.stats.rpg, icon: <Shield className="w-4 h-4 text-slate-400" /> },
      { label: "Assists (APG)", v1: p1.stats.apg, v2: p2.stats.apg, icon: <MousePointer2 className="w-4 h-4 text-cyan-400" /> },
    ];

    return metrics.map(m => ({ ...m, diff: m.v1 - m.v2 }));
  }, [p1, p2]);

  const radarData = useMemo(() => {
    if (!p1 || !p2) return [];
    return [
      { stat: "Scoring", p1: (p1.stats.ppg / 35) * 100, p2: (p2.stats.ppg / 35) * 100 },
      { stat: "Efficiency", p1: p1.stats.fgPct, p2: p2.stats.fgPct },
      { stat: "Playmaking", p1: (p1.stats.apg / 12) * 100, p2: (p2.stats.apg / 12) * 100 },
      { stat: "Defense", p1: ((p1.stats.spg + p1.stats.bpg) / 5) * 100, p2: ((p2.stats.spg + p2.stats.bpg) / 5) * 100 },
      { stat: "Boards", p1: (p1.stats.rpg / 15) * 100, p2: (p2.stats.rpg / 15) * 100 },
    ];
  }, [p1, p2]);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 animate-in fade-in duration-1000">
      
      {/* 🚀 EL SELECTOR DE TITANES */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 mb-20">
        <div className="text-center md:text-left space-y-6 flex-1">
          <Avatar className="h-44 w-44 mx-auto md:mx-0 border-4 border-blue-600 shadow-[0_0_60px_rgba(37,99,235,0.3)] hover:scale-105 transition-transform duration-500">
            <AvatarImage src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${p1?.id}.png`} />
            <AvatarFallback className="text-5xl font-black bg-slate-900">{p1?.name[0]}</AvatarFallback>
          </Avatar>
          <Select value={p1Id} onValueChange={setP1Id}>
            <SelectTrigger className="bg-white/5 border-none h-16 rounded-2xl font-black text-2xl text-blue-500 italic px-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-white border-white/10">
              {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4 animate-pulse">
            <Swords className="text-slate-500 h-10 w-10" />
          </div>
          <Badge className="bg-blue-600/10 text-blue-500 border-none font-black italic tracking-widest text-[10px] py-2 px-6">
            QUANTUM COMPARISON
          </Badge>
        </div>

        <div className="text-center md:text-right space-y-6 flex-1">
          <Avatar className="h-44 w-44 mx-auto md:ml-auto border-4 border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-500">
            <AvatarImage src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${p2?.id}.png`} />
            <AvatarFallback className="text-5xl font-black bg-slate-900">{p2?.name[0]}</AvatarFallback>
          </Avatar>
          <Select value={p2Id} onValueChange={setP2Id}>
            <SelectTrigger className="bg-white/5 border-none h-16 rounded-2xl font-black text-2xl text-emerald-500 italic px-8 text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-white border-white/10">
              {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* 📊 EL MOTOR DE DIFERENCIALES (TABLA MOREY) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-white/[0.01] border-white/5 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl shadow-2xl">
            <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-6">
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Efficiency Hub</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Real-Time Metrics</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic text-right">Efficiency Hub</span>
            </div>

            <div className="space-y-12">
              {statsAnalysis.map((stat, i) => (
                <div key={i} className="relative group">
                  <div className="flex justify-between items-end mb-4 px-2">
                    <span className={`text-4xl font-black font-mono tracking-tighter transition-all duration-500 ${stat.diff > 0 ? 'text-white' : 'text-slate-700 opacity-40'}`}>
                      {stat.v1.toFixed(1)}
                    </span>
                    <div className="flex flex-col items-center gap-2 group-hover:-translate-y-1 transition-transform">
                      {stat.icon}
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">{stat.label}</span>
                    </div>
                    <span className={`text-4xl font-black font-mono tracking-tighter transition-all duration-500 ${stat.diff < 0 ? 'text-white' : 'text-slate-700 opacity-40'}`}>
                      {stat.v2.toFixed(1)}
                    </span>
                  </div>

                  {/* BARRA DE DUELO LINEAL */}
                  <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden group-hover:h-2 transition-all">
                    <div 
                      className={`h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 ease-out`}
                      style={{ width: `${(stat.v1 / (stat.v1 + stat.v2)) * 100}%` }}
                    />
                    <div 
                      className={`h-full bg-gradient-to-l from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out`}
                      style={{ width: `${(stat.v2 / (stat.v1 + stat.v2)) * 100}%` }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-950 z-10 shadow-[0_0_10px_black]"></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 🕸️ RADAR DE ADN Y KPI CARDS */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="bg-[#0a0f18] border-white/5 rounded-[3.5rem] p-10 h-[520px] flex flex-col items-center relative group overflow-hidden shadow-2xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-all duration-700"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-8 relative z-10 italic">Style DNA Overlay</span>
            <div className="w-full h-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.03)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900' }} />
                  <RadarGraphic name={p1?.name} dataKey="p1" stroke="#2563eb" strokeWidth={4} fill="#2563eb" fillOpacity={0.4} />
                  <RadarGraphic name={p2?.name} dataKey="p2" stroke="#10b981" strokeWidth={4} fill="#10b981" fillOpacity={0.4} />
                  <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 'bold' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* KPI CARDS DE IMPACTO FINAL */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/20 relative group hover:scale-[1.02] transition-all">
              <TrendingUp className="absolute right-8 top-8 h-6 w-6 text-blue-500 opacity-40" />
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-4">GIR Impact</p>
              <p className="text-7xl font-black font-mono tracking-tighter text-white">{nbaService.computeGIR(p1!)}</p>
            </div>
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border border-emerald-500/20 relative group text-right hover:scale-[1.02] transition-all">
              <TrendingUp className="absolute left-8 top-8 h-6 w-6 text-emerald-500 opacity-40" />
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-4">GIR Impact</p>
              <p className="text-7xl font-black font-mono tracking-tighter text-white">{nbaService.computeGIR(p2!)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useMemo, useEffect, useRef } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarGraphic, Legend } from "recharts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Target, Activity, Flame, Crosshair, TrendingUp, Loader2, Shield, MousePointer2, Search, ChevronDown } from "lucide-react";
import type { NBAPlayer } from "@/data/nba/mockData";

// Buscador / Scroll infinito
const PlayerCombobox = ({ value, onChange, players, align = "left", color = "blue" }: any) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = players.find((p: any) => p.id === value);
  const filtered = players.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const textColor = color === "blue" ? "text-blue-500" : "text-emerald-500";
  const hoverColor = color === "blue" ? "hover:bg-blue-600/20" : "hover:bg-emerald-600/20";

  return (
    <div className="relative w-full z-50" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full bg-white/5 border border-white/10 h-16 rounded-2xl font-black text-2xl italic px-8 flex items-center justify-between hover:bg-white/10 transition-colors ${textColor} ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <span>{selected?.name || "Seleccionar Atleta"}</span>
        <ChevronDown className={`h-6 w-6 opacity-50 ${open ? "rotate-180" : ""} transition-transform`} />
      </button>
      
      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-white/5">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              autoFocus
              placeholder="Buscar jugador..." 
              value={search}
              onChange={e => setSearch(e.target.value)} 
              className="w-full bg-transparent text-white border-none focus:outline-none focus:ring-0 text-sm font-bold placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {filtered.map((p: any) => (
              <div 
                key={p.id} 
                onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }} 
                className={`p-3 cursor-pointer flex items-center gap-4 transition-colors ${value === p.id ? 'bg-white/10' : hoverColor}`}
              >
                <Avatar className="h-10 w-10 border border-white/10 bg-white">
                  <AvatarImage src={p.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-slate-800 text-xs">{p.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                   <span className="font-bold text-white text-sm">{p.name}</span>
                   <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{p.teamId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ComparePlayers() {
  const { sport } = useSport();
  
  const [allPlayers, setAllPlayers] = useState<NBAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [p1Id, setP1Id] = useState<string>("");
  const [p2Id, setP2Id] = useState<string>("");

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then((players) => {
      const sorted = [...players].sort((a, b) => (b.stats?.ppg || 0) - (a.stats?.ppg || 0));
      setAllPlayers(sorted);
      if (sorted.length >= 2) {
        setP1Id(sorted[0].id);
        setP2Id(sorted[1].id);
      }
      setIsLoading(false);
    });
  }, []);

  const p1 = useMemo(() => allPlayers.find(p => p.id === p1Id), [p1Id, allPlayers]);
  const p2 = useMemo(() => allPlayers.find(p => p.id === p2Id), [p2Id, allPlayers]);

  const statsAnalysis = useMemo(() => {
    if (!p1 || !p2) return [];
    
    const getAdvancedMetrics = (p: NBAPlayer) => {
      const stats = p.stats as any;
      return { ts: stats.ts || 0, efg: stats.efg || 0, usg: stats.usg || 0 };
    };

    const adv1 = getAdvancedMetrics(p1);
    const adv2 = getAdvancedMetrics(p2);

    const metrics = [
      { label: "Points (PPG)", v1: p1.stats.ppg, v2: p2.stats.ppg, icon: <Flame className="w-4 h-4 text-orange-500" /> },
      { label: "True Shooting %", v1: adv1.ts, v2: adv2.ts, icon: <Target className="w-4 h-4 text-blue-400" /> },
      { label: "Effective FG%", v1: adv1.efg, v2: adv2.efg, icon: <Crosshair className="w-4 h-4 text-emerald-400" /> },
      { label: "Usage Rate %", v1: adv1.usg, v2: adv2.usg, icon: <Activity className="w-4 h-4 text-purple-400" /> },
      { label: "Rebounds (RPG)", v1: p1.stats.rpg, v2: p2.stats.rpg, icon: <Shield className="w-4 h-4 text-slate-400" /> },
      { label: "Assists (APG)", v1: p1.stats.apg, v2: p2.stats.apg, icon: <MousePointer2 className="w-4 h-4 text-cyan-400" /> },
      // ROBOS Y TAPONES SE HAN MOVIDO A LA TABLA
      { label: "Steals (SPG)", v1: p1.stats.spg, v2: p2.stats.spg, icon: <Crosshair className="w-4 h-4 text-rose-400" /> },
      { label: "Blocks (BPG)", v1: p1.stats.bpg, v2: p2.stats.bpg, icon: <Shield className="w-4 h-4 text-indigo-400" /> },
    ];

    return metrics.map(m => ({ ...m, diff: m.v1 - m.v2 }));
  }, [p1, p2]);

  const radarData = useMemo(() => {
    if (!p1 || !p2) return [];
    
    // Invertimos el DEF_RATING para que encaje de 0 a 100 en el gráfico
    // 100 defRating o menos = Élite (100% en gráfico) | 120 defRating o más = Pésimo (0% en gráfico)
    const getDefScore = (p: any) => Math.max(0, Math.min(100, (120 - (p.stats.defRating || 115)) * 5));

    return [
      { stat: "Scoring", p1: (p1.stats.ppg / 35) * 100, p2: (p2.stats.ppg / 35) * 100 },
      { stat: "Efficiency", p1: p1.stats.fgPct, p2: p2.stats.fgPct },
      { stat: "Playmaking", p1: (p1.stats.apg / 12) * 100, p2: (p2.stats.apg / 12) * 100 },
      { stat: "Defense", p1: getDefScore(p1), p2: getDefScore(p2) },
      { stat: "Boards", p1: (p1.stats.rpg / 15) * 100, p2: (p2.stats.rpg / 15) * 100 },
    ];
  }, [p1, p2]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="font-black tracking-widest text-xs uppercase animate-pulse">Cargando base de datos para Quantum Comparison...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 animate-in fade-in duration-1000">
      
      {/* 🚀 EL SELECTOR DE TITANES ACTUALIZADO */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 mb-20 relative z-50">
        <div className="text-center md:text-left space-y-6 flex-1 w-full relative">
          <Avatar className="h-44 w-44 mx-auto md:mx-0 border-4 border-blue-600 shadow-[0_0_60px_rgba(37,99,235,0.3)] hover:scale-105 transition-transform duration-500 bg-white">
            <AvatarImage src={p1?.imageUrl} className="object-cover bg-slate-100" />
            <AvatarFallback className="text-5xl font-black bg-slate-900">{p1?.name[0]}</AvatarFallback>
          </Avatar>
          <PlayerCombobox value={p1Id} onChange={setP1Id} players={allPlayers} color="blue" />
        </div>

        <div className="flex flex-col items-center z-0 hidden md:flex">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4 animate-pulse">
            <Swords className="text-slate-500 h-10 w-10" />
          </div>
          <Badge className="bg-blue-600/10 text-blue-500 border-none font-black italic tracking-widest text-[10px] py-2 px-6">
            QUANTUM COMPARISON
          </Badge>
        </div>

        <div className="text-center md:text-right space-y-6 flex-1 w-full relative">
          <Avatar className="h-44 w-44 mx-auto md:ml-auto border-4 border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-500 bg-white">
            <AvatarImage src={p2?.imageUrl} className="object-cover bg-slate-100" />
            <AvatarFallback className="text-5xl font-black bg-slate-900">{p2?.name[0]}</AvatarFallback>
          </Avatar>
          <PlayerCombobox value={p2Id} onChange={setP2Id} players={allPlayers} align="right" color="emerald" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{stat.label}</span>
                    </div>
                    <span className={`text-4xl font-black font-mono tracking-tighter transition-all duration-500 ${stat.diff < 0 ? 'text-white' : 'text-slate-700 opacity-40'}`}>
                      {stat.v2.toFixed(1)}
                    </span>
                  </div>

                  {/* BARRA DE DUELO LINEAL */}
                  <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden group-hover:h-2 transition-all">
                    <div 
                      className={`h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 ease-out`}
                      style={{ width: `${stat.v1 === 0 && stat.v2 === 0 ? 50 : (stat.v1 / (stat.v1 + stat.v2)) * 100}%` }}
                    />
                    <div 
                      className={`h-full bg-gradient-to-l from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out`}
                      style={{ width: `${stat.v1 === 0 && stat.v2 === 0 ? 50 : (stat.v2 / (stat.v1 + stat.v2)) * 100}%` }}
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
              <p className="text-7xl font-black font-mono tracking-tighter text-white">{p1 ? nbaService.computeGIR(p1) : 0}</p>
            </div>
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border border-emerald-500/20 relative group text-right hover:scale-[1.02] transition-all">
              <TrendingUp className="absolute left-8 top-8 h-6 w-6 text-emerald-500 opacity-40" />
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-4">GIR Impact</p>
              <p className="text-7xl font-black font-mono tracking-tighter text-white">{p2 ? nbaService.computeGIR(p2) : 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
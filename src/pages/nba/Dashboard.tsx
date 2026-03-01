import { useState, useEffect } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Trophy, TrendingUp, Crown, ShieldAlert, Swords, Target } from "lucide-react";

export default function NBADashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🚀 Doble llamada a la API: Jugadores y Equipos simultáneamente
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams()
    ]).then(([playerData, teamData]) => {
      
      // Procesar Jugadores (Regla del 70%)
      const maxGP = Math.max(...playerData.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);

      const playersWithAdv = playerData.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const meetsMins = (p.stats?.mpg || 0) >= 20;
        const meetsGP = (p.stats?.gp || 0) >= requiredGP;
        return {
          ...p,
          adv,
          qualifiesGeneral: meetsMins && meetsGP,
        };
      });

      setPlayers(playersWithAdv);
      setTeams(teamData);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Command Center...</p>
      </div>
    );
  }

  // 🚀 LÍDERES INDIVIDUALES
  const getPlayerLeaders = (metric: string) => {
    return players
      .filter(p => p.qualifiesGeneral)
      .sort((a, b) => b.adv[metric] - a.adv[metric])
      .slice(0, 5);
  };

  const bpmLeaders = getPlayerLeaders("bpm");
  const perLeaders = getPlayerLeaders("per");
  const vorpLeaders = getPlayerLeaders("vorp");

  // 🚀 LÍDERES COLECTIVOS (Equipos)
  // Nota: En Defensa (defRtg), un número MENOR es mejor, por lo que ordenamos de forma ascendente.
  const netRatingTeams = [...teams].sort((a, b) => b.netRtg - a.netRtg).slice(0, 5);
  const offRatingTeams = [...teams].sort((a, b) => b.offRtg - a.offRtg).slice(0, 5);
  const defRatingTeams = [...teams].sort((a, b) => a.defRtg - b.defRtg).slice(0, 5);

  // 🏆 WIDGET JUGADORES
  const PlayerWidget = ({ title, icon: Icon, colorClass, data, metricId }: any) => (
    <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 group">
      <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2.5 text-slate-400 group-hover:text-white transition-colors">
          <Icon className={`h-4 w-4 ${colorClass}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.map((p: any, i: number) => (
          <div key={p.id} className="flex items-center justify-between p-4 border-b border-white/[0.03] hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <span className="font-mono font-black text-slate-600 text-xs w-2">{i + 1}</span>
              <Avatar className="h-10 w-10 border border-white/10 shadow-md">
                <AvatarImage src={p.imageUrl} className="object-cover" />
                <AvatarFallback className="bg-slate-800 text-[10px]">{p.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{p.name}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.teamId}</span>
              </div>
            </div>
            <span className={`font-mono font-black text-base ${colorClass}`}>{p.adv[metricId].toFixed(1)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  // 🛡️ WIDGET EQUIPOS
  const TeamWidget = ({ title, icon: Icon, colorClass, data, metricId }: any) => (
    <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10 group">
      <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.01]">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2.5 text-slate-400 group-hover:text-white transition-colors">
          <Icon className={`h-4 w-4 ${colorClass}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.map((t: any, i: number) => (
          <div key={t.id} className="flex items-center justify-between p-4 border-b border-white/[0.03] hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <span className="font-mono font-black text-slate-600 text-xs w-2">{i + 1}</span>
              <Avatar className="h-10 w-10 border border-white/10 bg-white/5 shadow-md p-1">
                {/* Usamos el getTeamLogoUrl del servicio */}
                <AvatarImage src={nbaService.getTeamLogoUrl(t.abbreviation)} className="object-contain" />
                <AvatarFallback className="bg-slate-800 text-[10px]">{t.abbreviation}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{t.name}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  {t.wins}W - {t.losses}L
                </span>
              </div>
            </div>
            <span className={`font-mono font-black text-base ${colorClass}`}>
              {/* Añadimos un "+" si es Net Rating positivo */}
              {metricId === 'netRtg' && t[metricId] > 0 ? '+' : ''}{t[metricId].toFixed(1)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      
      {/* 🚀 BANNER HERO */}
      <div className="relative rounded-[3rem] overflow-hidden bg-[#0a0f18] border border-white/10 shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-emerald-500/10 opacity-50 pointer-events-none"></div>
        <div className="relative z-10 space-y-4 text-center md:text-left">
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 font-black tracking-widest uppercase px-4 py-1.5 mb-2">Live Season 2025-26</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
            League <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Command Center</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide max-w-xl">
            Real-time individual and collective metrics. Monitoring the MVP race and Team Power Rankings across the association.
          </p>
        </div>
        
        {bpmLeaders[0] && (
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-6 backdrop-blur-md shadow-xl shrink-0">
            <div className="absolute -top-3 -right-3">
              <span className="relative flex h-8 w-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                <span className="relative inline-flex rounded-full h-8 w-8 bg-emerald-500 items-center justify-center border border-emerald-300">
                  <Crown className="h-4 w-4 text-slate-900" />
                </span>
              </span>
            </div>
            <Avatar className="h-20 w-20 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <AvatarImage src={bpmLeaders[0].imageUrl} className="object-cover" />
            </Avatar>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">MVP Algorithm Leader</p>
              <h3 className="text-xl font-black text-white leading-tight">{bpmLeaders[0].name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{bpmLeaders[0].teamId} · {bpmLeaders[0].adv.bpm.toFixed(1)} BPM</p>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 SECCIÓN 1: INDIVIDUAL AWARDS */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter px-2">Player Dominance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <PlayerWidget title="MVP Tracker (BPM)" icon={Activity} colorClass="text-emerald-400" data={bpmLeaders} metricId="bpm" />
          <PlayerWidget title="Efficiency Kings (PER)" icon={Trophy} colorClass="text-blue-400" data={perLeaders} metricId="per" />
          <PlayerWidget title="Total Impact (VORP)" icon={TrendingUp} colorClass="text-amber-400" data={vorpLeaders} metricId="vorp" />
        </div>
      </div>

      {/* 🚀 SECCIÓN 2: TEAM POWER RANKINGS */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter px-2">Team Power Rankings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <TeamWidget title="Overall Power (Net Rating)" icon={Target} colorClass="text-indigo-400" data={netRatingTeams} metricId="netRtg" />
          <TeamWidget title="Offensive Juggernauts (Off Rtg)" icon={Swords} colorClass="text-rose-400" data={offRatingTeams} metricId="offRtg" />
          <TeamWidget title="Defensive Fortresses (Def Rtg)" icon={ShieldAlert} colorClass="text-cyan-400" data={defRatingTeams} metricId="defRtg" />
        </div>
      </div>

    </div>
  );
}
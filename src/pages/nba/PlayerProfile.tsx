import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { ArrowLeft, Activity, TrendingUp, Info, UserCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { NBAPlayer } from "@/data/nba/mockData";

const METRIC_INFO: Record<string, { label: string; desc: string }> = {
  gir: { label: "Global Impact Rating", desc: "Métrica compuesta: estadísticas acumuladas ponderadas por eficiencia." },
  pva: { label: "Playmaking Value Added", desc: "Producción de asistencias ajustada por eficiencia anotadora." },
  ddi: { label: "Defensive Disruption Index", desc: "Robos, tapones y rebotes defensivos combinados." },
  uap: { label: "Usage-Adjusted Production", desc: "Producción por 36 minutos normalizada por uso de posesiones." },
};

export default function NBAPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  
  const [player, setPlayer] = useState<NBAPlayer | null>(null);
  const [allPlayers, setAllPlayers] = useState<NBAPlayer[]>([]);
  const [gameLog, setGameLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 CARGA ROBUSTA: Garantiza datos reales incluso si haces F5 directamente en la URL
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      nbaService.fetchAllOfficialPlayers().then((players) => {
        setAllPlayers(players);
        const foundPlayer = players.find(p => p.id === id);
        setPlayer(foundPlayer || null);
        
        nbaService.getPlayerGameLog(id).then((log) => {
          setGameLog(log);
          setIsLoading(false);
        });
      });
    }
  }, [id]);

  // 🧠 MOTOR DE PERCENTILES (Radar Chart Perfecto)
  const radarData = useMemo(() => {
    if (!player || allPlayers.length === 0) return [];

    // Función matemática: ¿A qué porcentaje de la liga superas en esta métrica?
    const calcPercentile = (val: number, arr: number[], inverse = false) => {
      const validArr = arr.filter(v => v !== undefined && !isNaN(v)).sort((a, b) => a - b);
      if (validArr.length === 0) return 50;
      
      const countLower = validArr.filter(v => v < val).length;
      const pct = (countLower / validArr.length) * 100;
      return inverse ? 100 - pct : pct;
    };

    const allStats = allPlayers.map(p => p.stats as any);
    const pStats = player.stats as any;
    const advGIR = nbaService.computeGIR(player);

    return [
      { stat: "Anotación", value: calcPercentile(pStats.ppg, allStats.map(s => s.ppg)) },
      { stat: "Rebotes", value: calcPercentile(pStats.rpg, allStats.map(s => s.rpg)) },
      { stat: "Asistencias", value: calcPercentile(pStats.apg, allStats.map(s => s.apg)) },
      // DEFENSA: Usamos el DEF_RATING oficial. Es inverso: menos rating = mejor defensa.
      { stat: "Defensa", value: calcPercentile(pStats.defRating || 115, allStats.map(s => s.defRating || 115), true) },
      // EFICIENCIA: True Shooting (TS) en lugar de FG% básico
      { stat: "Eficiencia", value: calcPercentile(pStats.ts || pStats.fgPct, allStats.map(s => s.ts || s.fgPct)) },
      { stat: "Impacto", value: calcPercentile(advGIR, allPlayers.map(p => nbaService.computeGIR(p))) },
    ];
  }, [player, allPlayers]);

  if (isLoading || !player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-widest text-slate-800">Cargando Perfil</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Analizando datos oficiales de la NBA</p>
        </div>
      </div>
    );
  }

  const adv = nbaService.computeAllAdvanced(player);
  // @ts-ignore
  const similarPlayers = nbaService.findSimilarPlayers ? nbaService.findSimilarPlayers(player) : [];
  const playerImageUrl = nbaService.getImageUrl(player.id);
  const teamLogoUrl = nbaService.getTeamLogoUrl(player.teamId);

  // Generador dinámico del resumen de scouting basado en el mejor percentil
  const bestStat = radarData.length > 0 ? radarData.reduce((prev, curr) => prev.value > curr.value ? prev : curr) : { stat: "su rol", value: 50 };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-6">
        <Link to={`/${sport}/players`} className="group inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-blue-600 transition-all uppercase tracking-widest w-max">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al Hub
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-200/50 pb-10">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white relative shadow-2xl bg-white">
                <AvatarImage src={playerImageUrl} alt={player.name} className="object-cover bg-white" />
                <AvatarFallback className="text-3xl font-black bg-slate-100 text-slate-400">{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-black text-xs tracking-[0.2em] uppercase">
                <Activity className="h-4 w-4" /> Expediente Analítico
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{player.name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                {teamLogoUrl && <img src={teamLogoUrl} alt={player.teamId} className="h-6 w-6 object-contain drop-shadow-sm" />}
                <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 text-xs tracking-widest">{player.teamId}</Badge>
                <span className="text-slate-400 font-semibold text-sm uppercase tracking-widest">
                  ID: <span className="text-slate-600">{player.id}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            {[{ label: "GIR", val: adv.gir, color: "text-emerald-500", bg: "bg-emerald-50" }, 
              { label: "DDI", val: adv.ddi, color: "text-amber-500", bg: "bg-amber-50" }, 
              { label: "UAP", val: adv.uap, color: "text-blue-500", bg: "bg-blue-50" }].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-100 rounded-3xl p-5 min-w-[110px] shadow-lg shadow-slate-200/50 text-center hover:-translate-y-1 transition-transform">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <p className={`text-3xl font-black font-mono ${kpi.color}`}>{kpi.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto">
          <TabsTrigger value="overview" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Vista General</TabsTrigger>
          <TabsTrigger value="gamelog" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Histórico</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Métricas Pro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: "PTS", val: player.stats.ppg.toFixed(1) },
              { label: "REB", val: player.stats.rpg.toFixed(1) },
              { label: "AST", val: player.stats.apg.toFixed(1) },
              { label: "FG%", val: `${player.stats.fgPct}%` },
              { label: "3P%", val: `${player.stats.threePct}%` },
              { label: "FT%", val: `${player.stats.ftPct}%` },
              { label: "STL", val: player.stats.spg.toFixed(1) },
              { label: "BLK", val: player.stats.bpg.toFixed(1) },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black font-mono mt-1 text-slate-800">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <Card className="border-none shadow-xl shadow-blue-900/5 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-600">
                    <TrendingUp className="h-4 w-4 text-blue-500" /> Rendimiento de Anotación (Últimos 10)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 relative">
                  <div className="h-[320px] w-full">
                    {gameLog.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gameLog}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{fontSize: 9, fill: '#94a3b8'}} tickMargin={10} minTickGap={20} axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                          <RechartsTooltip 
                            contentStyle={{ background: "#0f172a", border: "none", borderRadius: 16, color: "#fff", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }} 
                            itemStyle={{ color: "#3b82f6", fontWeight: "bold" }} 
                            labelStyle={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}
                          />
                          <Line type="monotone" name="Puntos" dataKey="pts" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium italic text-sm">
                         No hay datos de partidos recientes disponibles.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-2">
                  <UserCheck className="h-4 w-4 text-blue-500" /> AI Scouting: Perfiles Similares
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {similarPlayers.map((similar: any) => (
                    <Link key={similar.id} to={`/${sport}/players/${similar.id}`} className="group bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
                      <Avatar className="h-10 w-10 border border-slate-100 bg-white">
                        <AvatarImage src={nbaService.getImageUrl(similar.id)} alt={similar.name} className="object-cover bg-white" />
                        <AvatarFallback className="text-[10px] font-bold bg-slate-50 text-slate-400">{similar.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors truncate">{similar.name}</span>
                        <div className="flex items-center justify-between mt-1">
                           <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{similar.teamId}</span>
                           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{similar.similarityScore}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* RADAR CHART PERCENTIL NORMALIZADO */}
            <Card className="lg:col-span-2 border-none shadow-2xl bg-[#0a0f18] text-white rounded-3xl overflow-hidden relative flex flex-col group">
              <div className="absolute top-6 right-6">
                <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black text-[9px] tracking-widest px-3 py-1">PERCENTIL ANALYTICS</Badge>
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Distribución Global</CardTitle>
                <p className="text-[10px] text-slate-500 italic mt-1">Comparativa vs. 542 jugadores (0-100)</p>
              </CardHeader>
              <CardContent className="flex-1 flex justify-center items-center py-2 relative z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 pointer-events-none"></div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' }} />
                    <RechartsTooltip 
                      formatter={(value: number) => [`Percentil ${Math.round(value)}`, '']}
                      contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", backdropFilter: "blur(10px)" }}
                      itemStyle={{ color: "#60a5fa", fontWeight: "bold" }}
                      labelStyle={{ display: "none" }}
                    />
                    <Radar name={player.name} dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="p-8 bg-white/5 border-t border-white/10 relative z-10">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Resumen de Scouting
                </p>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Atleta con impacto élite dominado por su <span className="text-white font-black">{bestStat.stat}</span> (Percentil {Math.round(bestStat.value as number)}). 
                  Rendimiento diferencial respecto a la media de la liga.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gamelog">
          <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-3xl bg-white min-h-[300px]">
            {gameLog.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                    <TableHead className="py-6 px-8">Fecha</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead className="text-center text-blue-600">Pts</TableHead>
                    <TableHead className="text-center">Reb</TableHead>
                    <TableHead className="text-center">Ast</TableHead>
                    <TableHead className="text-right px-8">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameLog.map((g, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors border-slate-50">
                      <TableCell className="font-mono text-xs font-bold text-slate-600 py-5 px-8">{g.date}</TableCell>
                      <TableCell className="text-center font-mono font-medium text-slate-500">{g.min}</TableCell>
                      <TableCell className="text-center font-mono font-black text-blue-600 text-lg">{g.pts}</TableCell>
                      <TableCell className="text-center font-mono text-slate-700 font-bold">{g.reb}</TableCell>
                      <TableCell className="text-center font-mono text-slate-700 font-bold">{g.ast}</TableCell>
                      <TableCell className="text-right px-8">
                        <Badge variant="outline" className={`rounded-lg px-3 py-1 font-black text-[10px] border-none ${g.pts > player.stats.ppg ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {g.pts > player.stats.ppg ? '↑ OVER AVG' : '↓ UNDER AVG'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="w-full flex items-center justify-center py-20 text-slate-400 font-medium italic text-sm">
                 No se encontraron partidos para este jugador.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TooltipProvider>
            {Object.entries(adv).map(([key, val]) => (
              <Card key={key} className="relative overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl group bg-white hover:border-blue-200 transition-all">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                      <Activity className="h-5 w-5" />
                    </div>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-5 w-5 text-slate-300 hover:text-slate-600 transition-colors" /></TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-none p-4 rounded-xl shadow-2xl max-w-xs text-sm leading-relaxed">
                        {METRIC_INFO[key]?.desc || "Métrica avanzada de rendimiento."}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-5xl font-black font-mono tracking-tighter mb-2 text-slate-900">{(val as number).toFixed(1)}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{key}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">{METRIC_INFO[key]?.label || key}</p>
                </CardContent>
              </Card>
            ))}
          </TooltipProvider>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ArrowLeft, Activity, Shield, Zap, TrendingUp, Info, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const METRIC_INFO: Record<string, { label: string; desc: string }> = {
  gir: { label: "Global Impact Rating", desc: "Métrica compuesta: estadísticas acumuladas ponderadas por eficiencia." },
  pva: { label: "Playmaking Value Added", desc: "Producción de asistencias ajustada por eficiencia anotadora." },
  ddi: { label: "Defensive Disruption Index", desc: "Robos, tapones y rebotes defensivos combinados." },
  uap: { label: "Usage-Adjusted Production", desc: "Producción por 36 minutos normalizada por uso de posesiones." },
};

export default function NBAPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const player = nbaService.getPlayerById(id!);

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in">
        <p className="text-muted-foreground font-medium">Atleta no encontrado.</p>
        <Link to={`/${sport}/players`} className="text-primary hover:underline mt-4 font-bold">← Volver al Scouting</Link>
      </div>
    );
  }

  const adv = nbaService.computeAllAdvanced(player);
  // @ts-ignore
  const similarPlayers = nbaService.findSimilarPlayers ? nbaService.findSimilarPlayers(player) : [];

  // URL de imagen dinámica (NBA oficial o Fallback)
  const playerImageUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`;

  const radarData = [
    { stat: "Anotación", value: (player.stats.ppg / 35) * 100 },
    { stat: "Rebotes", value: (player.stats.rpg / 15) * 100 },
    { stat: "Asistencias", value: (player.stats.apg / 12) * 100 },
    { stat: "Defensa", value: ((player.stats.spg + player.stats.bpg) / 5) * 100 },
    { stat: "Eficiencia", value: player.stats.fgPct },
    { stat: "Impacto", value: (adv.gir / 25) * 100 },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-6">
        <Link to={`/${sport}/players`} className="group inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest">
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Volver al Scouting
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-border pb-10">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            {/* CONTENEDOR DE FOTO PREMIUM */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background relative shadow-2xl">
                <AvatarImage src={playerImageUrl} alt={player.name} className="object-cover bg-slate-100" />
                <AvatarFallback className="text-3xl font-black bg-slate-200">{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-bold text-sm tracking-tighter">
                <Activity className="h-4 w-4" /> PERFIL PRO ANALYTICS
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-none">{player.name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Badge className="bg-primary text-primary-foreground font-black px-4 py-1 text-sm">{player.position}</Badge>
                <span className="text-muted-foreground font-semibold text-xl">
                  {player.teamName} <span className="mx-2 text-border">|</span> <span className="text-foreground">#{player.id}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            {[{ label: "GIR", val: adv.gir, color: "text-emerald-500" }, { label: "DDI", val: adv.ddi, color: "text-amber-500" }, { label: "UAP", val: adv.uap, color: "text-blue-500" }].map((kpi) => (
              <div key={kpi.label} className="bg-card border border-border rounded-3xl p-5 min-w-[110px] shadow-sm text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
                <p className={`text-3xl font-black font-mono ${kpi.color}`}>{kpi.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto">
          <TabsTrigger value="overview" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider">Vista General</TabsTrigger>
          <TabsTrigger value="gamelog" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider">Histórico</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-xl py-2.5 px-8 font-bold text-xs uppercase tracking-wider">Métricas Pro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: "PTS", val: player.stats.ppg },
              { label: "REB", val: player.stats.rpg },
              { label: "AST", val: player.stats.apg },
              { label: "FG%", val: `${player.stats.fgPct}%` },
              { label: "3P%", val: `${player.stats.threePct}%` },
              { label: "FT%", val: `${player.stats.ftPct}%` },
              { label: "STL", val: player.stats.spg },
              { label: "BLK", val: player.stats.bpg },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black font-mono mt-1 text-slate-900">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <Card className="border-none shadow-2xl shadow-blue-900/5 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Rendimiento de Anotación
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={player.gameLog}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                        <RechartsTooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: 16, color: "#fff" }} itemStyle={{ color: "#fff" }} />
                        <Line type="stepAfter" dataKey="pts" stroke="#2563eb" strokeWidth={5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* SIMILAR PLAYERS CON FOTOS */}
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-2">
                  <UserCheck className="h-4 w-4 text-blue-500" /> AI Scouting: Perfiles Similares
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {similarPlayers.map((similar: any) => (
                    <Link key={similar.id} to={`/${sport}/players/${similar.id}`} className="group bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
                      <Avatar className="h-12 w-12 border-2 border-slate-50">
                        <AvatarImage src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${similar.id}.png`} alt={similar.name} />
                        <AvatarFallback className="text-[10px] font-bold">{similar.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{similar.name}</span>
                        <div className="flex items-center justify-between mt-0.5">
                           <span className="text-[9px] text-slate-400 font-bold uppercase">{similar.position}</span>
                           <span className="text-[10px] font-black text-blue-600">{similar.similarityScore}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Card className="lg:col-span-2 border-none shadow-2xl bg-slate-950 text-white rounded-3xl overflow-hidden relative flex flex-col">
              <div className="absolute top-6 right-6">
                <Badge className="bg-blue-500/20 text-blue-400 border-none font-black text-[9px] tracking-widest px-2 py-0.5">PRO AI ANALYTICS</Badge>
              </div>
              <CardHeader className="pt-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Distribución de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex justify-center items-center py-6">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800' }} />
                    <Radar name={player.name} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="p-8 bg-white/5 border-t border-white/5">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Resumen de Scouting</p>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "Atleta con volumen de impacto centrado en {radarData.reduce((prev, curr) => prev.value > curr.value ? prev : curr).stat.toLowerCase()}. Proyección de rendimiento estable."
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gamelog">
          <Card className="border-none shadow-2xl shadow-blue-900/5 overflow-hidden rounded-3xl">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-none text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <TableHead className="py-6 px-8">Fecha</TableHead>
                  <TableHead className="text-center">Minutos</TableHead>
                  <TableHead className="text-center text-blue-600">Puntos</TableHead>
                  <TableHead className="text-center">Rebotes</TableHead>
                  <TableHead className="text-center">Asistencias</TableHead>
                  <TableHead className="text-right px-8">Rendimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {player.gameLog.map((g, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors border-slate-50">
                    <TableCell className="font-mono text-xs font-bold text-slate-500 py-5 px-8">{g.date}</TableCell>
                    <TableCell className="text-center font-mono font-medium">{g.min}</TableCell>
                    <TableCell className="text-center font-mono font-black text-blue-600 text-lg">{g.pts}</TableCell>
                    <TableCell className="text-center font-mono text-slate-600 font-bold">{g.reb}</TableCell>
                    <TableCell className="text-center font-mono text-slate-600 font-bold">{g.ast}</TableCell>
                    <TableCell className="text-right px-8">
                      <Badge variant="outline" className={`rounded-lg px-3 py-1 font-black text-[10px] border-none ${g.pts > player.stats.ppg ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {g.pts > player.stats.ppg ? '↑ OVER AVG' : '↓ UNDER AVG'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TooltipProvider>
            {Object.entries(adv).map(([key, val]) => (
              <Card key={key} className="relative overflow-hidden border-none shadow-xl rounded-3xl group">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-4 w-4 text-slate-300 hover:text-slate-500 transition-colors" /></TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-2xl">{METRIC_INFO[key]?.desc}</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-5xl font-black font-mono tracking-tighter mb-2 text-slate-900">{val as number}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{key}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">{METRIC_INFO[key]?.label}</p>
                </CardContent>
              </Card>
            ))}
          </TooltipProvider>
        </TabsContent>
      </Tabs>
    </div>
  );
}
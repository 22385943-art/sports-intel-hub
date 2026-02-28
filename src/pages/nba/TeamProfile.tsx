import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Crosshair, Shield, Activity, Flame, Loader2, ArrowUpRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { NBAPlayer } from "@/data/nba/mockData";

export default function NBATeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<NBAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carga asíncrona dual: Equipos y Jugadores a la vez
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      Promise.all([
        nbaService.fetchAllOfficialTeams(),
        nbaService.fetchAllOfficialPlayers()
      ]).then(([teams, players]) => {
        const foundTeam = teams.find(t => t.id === id || t.abbreviation === id);
        setTeam(foundTeam || null);
        
        if (foundTeam) {
          // Filtramos el roster real y lo ordenamos por puntos
          const teamPlayers = players
            .filter(p => p.teamId === foundTeam.abbreviation)
            .sort((a, b) => b.stats.ppg - a.stats.ppg);
          setRoster(teamPlayers);
        }
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando Base de Datos...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in">
        <p className="text-slate-500 font-medium">Franquicia no encontrada.</p>
        <Link to={`/${sport}/teams`} className="text-blue-600 hover:underline mt-4 font-bold">← Volver a Equipos</Link>
      </div>
    );
  }

  const winPct = ((team.wins / (team.wins + team.losses)) * 100).toFixed(1);
  const logoUrl = nbaService.getTeamLogoUrl(team.abbreviation);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <Link to={`/${sport}/teams`} className="group inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest w-max">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a Clasificación
      </Link>
      
      {/* 👑 HEADER DEL EQUIPO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-100 pb-10">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="h-32 w-32 md:h-40 md:w-40 bg-white rounded-full flex items-center justify-center p-6 shadow-2xl border-4 border-slate-50 relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-emerald-500/20 rounded-full blur-xl group-hover:opacity-100 opacity-0 transition-opacity duration-500"></div>
            <img src={logoUrl} alt={team.name} className="w-full h-full object-contain relative z-10 drop-shadow-md" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-black text-xs tracking-[0.2em] uppercase">
              <Trophy className="h-4 w-4" /> Temporada 2025-26
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{team.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
              <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 text-xs tracking-widest">{team.conference} CONF</Badge>
              <span className="text-slate-400 font-semibold text-sm uppercase tracking-widest">
                ABBR: <span className="text-slate-600">{team.abbreviation}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Récord Oficial</p>
            <p className="text-5xl font-black font-mono tracking-tighter text-slate-900">{team.wins} - {team.losses}</p>
          </div>
          <Badge className={`px-4 py-1 text-xs font-black tracking-widest border-none ${team.wins > team.losses ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            WIN {winPct}%
          </Badge>
        </div>
      </div>

      {/* 📊 MÉTRICAS AVANZADAS OFICIALES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Net Rating", val: team.netRtg > 0 ? `+${team.netRtg.toFixed(1)}` : team.netRtg.toFixed(1), icon: <Activity className="text-blue-500" /> },
          { label: "Off Rating", val: team.offRtg.toFixed(1), icon: <Flame className="text-orange-500" /> },
          { label: "Def Rating", val: team.defRtg.toFixed(1), icon: <Shield className="text-emerald-500" /> },
          { label: "True Shooting", val: `${team.tsPct.toFixed(1)}%`, icon: <Crosshair className="text-indigo-500" /> },
          { label: "AST/TO Ratio", val: team.astTo.toFixed(2), icon: <ArrowUpRight className="text-purple-500" /> },
          { label: "Pace", val: team.pace.toFixed(1), icon: <TrendingUp className="text-slate-500" /> },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="flex justify-center mb-3 opacity-80">{kpi.icon}</div>
            <p className="text-2xl font-black font-mono text-slate-800">{kpi.val}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* 👥 ROSTER OFICIAL */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">Roster Activo</h2>
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 px-3">{roster.length} JUGADORES</Badge>
        </div>
        
        <Card className="border-none shadow-2xl shadow-blue-900/5 overflow-hidden rounded-3xl bg-white">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent text-[10px] uppercase font-black tracking-widest text-slate-400">
                <TableHead className="py-6 px-8">Atleta</TableHead>
                <TableHead className="text-center">Pos</TableHead>
                <TableHead className="text-center text-blue-600">PPG</TableHead>
                <TableHead className="text-center">RPG</TableHead>
                <TableHead className="text-center">APG</TableHead>
                <TableHead className="text-center">TS%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50 transition-colors border-slate-50 group">
                  <TableCell className="py-4 px-8">
                    <Link to={`/${sport}/players/${p.id}`} className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-slate-100 bg-white shadow-sm group-hover:scale-110 transition-transform">
                        <AvatarImage src={p.imageUrl} className="object-cover" loading="lazy" />
                        <AvatarFallback className="bg-slate-100 text-xs font-bold">{p.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{p.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] hover:bg-slate-200">{p.position}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-black text-blue-600 text-base">{p.stats.ppg.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-600">{p.stats.rpg.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-600">{p.stats.apg.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-500">
                    {p.stats.ts ? p.stats.ts.toFixed(1) : p.stats.fgPct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
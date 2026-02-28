import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Shield, BarChart3, Activity, Target, Loader2, Flame, Trophy } from "lucide-react";
import { SparkLine } from "@/components/shared/SparkLine";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function NBADashboard() {
  const { sport } = useSport();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams()
    ]).then(([realPlayers, realTeams]) => {
      setPlayers(realPlayers);
      setTeams(realTeams);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Syncing Live NBA Data...</p>
      </div>
    );
  }

  const topPlayers = [...players].sort((a, b) => b.stats.ppg - a.stats.ppg).slice(0, 5);
  const topTeams = [...teams].sort((a, b) => b.wins - a.wins).slice(0, 5);
  const avgPPG = (players.reduce((s, p) => s + (p.stats.ppg || 0), 0) / (players.length || 1)).toFixed(1);
  const topGIRPlayer = [...players].sort((a, b) => nbaService.computeGIR(b) - nbaService.computeGIR(a))[0];
  const topGIRValue = topGIRPlayer ? nbaService.computeGIR(topGIRPlayer) : 0;
  const bestNetTeam = [...teams].sort((a, b) => (b.netRtg || 0) - (a.netRtg || 0))[0];
  const bestNetValue = bestNetTeam?.netRtg || 0;

  const metricTiles = [
    { title: "Players Tracked", value: players.length, icon: Users, sparkData: [450, 480, 510, 520, 535, players.length], color: "hsl(var(--chart-teal))" },
    { title: "Teams", value: teams.length, icon: Shield, sparkData: [30, 30, 30, 30, 30, 30], color: "hsl(var(--chart-blue))" },
    { title: "Avg League PPG", value: avgPPG, icon: TrendingUp, sparkData: [10.1, 10.5, 10.8, 11.2, 11.4, parseFloat(avgPPG)], color: "hsl(var(--chart-gold))" },
    { title: "Top GIR Impact", value: topGIRValue, icon: Activity, sparkData: [42, 44, 45, 47, 48, topGIRValue], color: "hsl(var(--chart-teal))" },
    { title: "Best Net Rating", value: `+${bestNetValue.toFixed(1)}`, icon: Target, sparkData: [6.2, 7.1, 8.5, 9.2, 10.1, bestNetValue], color: "hsl(var(--chart-positive))" },
    { title: "Metrics Active", value: 12, icon: BarChart3, sparkData: [2, 4, 5, 8, 10, 12], color: "hsl(var(--chart-blue))" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">NBA Dashboard</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">Live season overview and real-time metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricTiles.map((s) => (
          <Card key={s.title} className="bg-white/[0.03] border-white/5 overflow-hidden backdrop-blur-xl hover:bg-white/[0.05] transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.title}</p>
                  <p className="text-2xl font-black font-mono mt-1 text-foreground">{s.value}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 text-muted-foreground">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="h-8 opacity-70">
                <SparkLine data={s.sparkData} color={s.color} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" /> Top Scorers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topPlayers.map((p, i) => (
              <Link key={p.id} to={`/${sport}/players/${p.id}`} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black font-mono text-muted-foreground w-4 text-right group-hover:text-primary transition-colors">{i + 1}</span>
                  <Avatar className="h-10 w-10 border border-white/10 bg-white/5">
                    <AvatarImage src={p.imageUrl} className="object-cover" />
                    <AvatarFallback className="bg-white/10 text-xs font-bold text-muted-foreground">{p.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{p.teamId} · {p.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black font-mono text-primary">{p.stats.ppg.toFixed(1)}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">PPG</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4 text-amber-500" /> League Leaders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topTeams.map((t, i) => (
              <Link key={t.id} to={`/${sport}/teams/${t.id}`} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black font-mono text-muted-foreground w-4 text-right group-hover:text-amber-500 transition-colors">{i + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-1 border border-white/10">
                    <img src={nbaService.getTeamLogoUrl(t.abbreviation)} alt={t.abbreviation} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Rating: {t.netRtg > 0 ? `+${t.netRtg.toFixed(1)}` : t.netRtg.toFixed(1)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black font-mono text-foreground">{t.wins}-{t.losses}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">RECORD</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

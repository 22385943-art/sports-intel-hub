import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nbaService } from "@/services/sportServiceFactory";
import { TrendingUp, Users, Shield, BarChart3, Activity, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { SparkLine } from "@/components/shared/SparkLine";

export default function NBADashboard() {
  const { sport } = useSport();
  const allPlayers = nbaService.getAllPlayers();
  const allTeams = nbaService.getAllTeams();
  const topPlayers = [...allPlayers].sort((a, b) => b.stats.ppg - a.stats.ppg).slice(0, 5);
  const topTeams = [...allTeams].sort((a, b) => b.wins - a.wins).slice(0, 5);

  const avgPPG = (allPlayers.reduce((s, p) => s + p.stats.ppg, 0) / allPlayers.length).toFixed(1);
  const topGIR = [...allPlayers].sort((a, b) => nbaService.computeGIR(b) - nbaService.computeGIR(a))[0];
  const bestTeam = topTeams[0];
  const bestTeamMetrics = nbaService.computeTeamMetrics(bestTeam);

  const metricTiles = [
    { title: "Players Tracked", value: allPlayers.length, icon: Users, sparkData: [8, 9, 10, 10, 10, 10], color: "hsl(var(--chart-teal))" },
    { title: "Teams", value: allTeams.length, icon: Shield, sparkData: [9, 9, 9, 9, 9, 9], color: "hsl(var(--chart-blue))" },
    { title: "Avg PPG", value: avgPPG, icon: TrendingUp, sparkData: [25.1, 25.8, 26.2, 26.9, 27.1, 27.3], color: "hsl(var(--chart-gold))" },
    { title: "Top GIR", value: nbaService.computeGIR(topGIR), icon: Activity, sparkData: [42, 44, 45, 47, 48, 50], color: "hsl(var(--chart-teal))" },
    { title: "Best Net Rating", value: `+${bestTeamMetrics.netRating}`, icon: Target, sparkData: [6.2, 7.1, 8.5, 9.2, 10.1, 11.4], color: "hsl(var(--chart-positive))" },
    { title: "Metrics Active", value: 8, icon: BarChart3, sparkData: [2, 4, 5, 6, 7, 8], color: "hsl(var(--chart-blue))" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">NBA Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Season overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricTiles.map((s) => (
          <Card key={s.title} className="bg-card border-border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.title}</p>
                  <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="h-8">
                <SparkLine data={s.sparkData} color={s.color} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Top Scorers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topPlayers.map((p, i) => (
              <Link key={p.id} to={`/${sport}/players/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.teamName} · {p.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 hidden sm:block">
                    <SparkLine data={p.gameLog.slice(-8).map(g => g.pts)} color="hsl(var(--chart-teal))" height={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">{p.stats.ppg}</p>
                    <p className="text-xs text-muted-foreground">PPG</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Standings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topTeams.map((t, i) => {
              const tm = nbaService.computeTeamMetrics(t);
              return (
                <Link key={t.id} to={`/${sport}/teams/${t.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.conference} · Net {tm.netRating > 0 ? "+" : ""}{tm.netRating}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">{t.wins}-{t.losses}</p>
                    <p className="text-xs text-muted-foreground">W-L</p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

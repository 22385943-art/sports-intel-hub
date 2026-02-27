import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { footballService } from "@/services/sportServiceFactory";
import { TrendingUp, Users, Shield, Target, Activity, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { SparkLine } from "@/components/shared/SparkLine";

export default function FootballDashboard() {
  const { sport } = useSport();
  const allPlayers = footballService.getAllPlayers();
  const allTeams = footballService.getAllTeams();
  const topScorers = [...allPlayers].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 5);
  const topTeams = [...allTeams].sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws)).slice(0, 5);

  const avgGoals = (allPlayers.reduce((s, p) => s + p.stats.goals, 0) / allPlayers.length).toFixed(1);
  const topXG = [...allPlayers].sort((a, b) => footballService.computeAdvanced(b).xgContribution - footballService.computeAdvanced(a).xgContribution)[0];

  const metricTiles = [
    { title: "Players Tracked", value: allPlayers.length, icon: Users, sparkData: [5, 6, 6, 7, 8, 8], color: "hsl(var(--chart-teal))" },
    { title: "Teams", value: allTeams.length, icon: Shield, sparkData: [5, 5, 5, 5, 5, 5], color: "hsl(var(--chart-blue))" },
    { title: "Avg Goals", value: avgGoals, icon: TrendingUp, sparkData: [8, 10, 12, 14, 15, 16], color: "hsl(var(--chart-gold))" },
    { title: "Top xG", value: footballService.computeAdvanced(topXG).xgContribution, icon: Activity, sparkData: [12, 14, 15, 17, 18, 20], color: "hsl(var(--chart-teal))" },
    { title: "Best GD", value: `+${Math.max(...allTeams.map(t => t.goalsFor - t.goalsAgainst))}`, icon: Target, sparkData: [20, 25, 30, 32, 36, 40], color: "hsl(var(--chart-positive))" },
    { title: "Metrics Active", value: 10, icon: BarChart3, sparkData: [3, 5, 6, 7, 9, 10], color: "hsl(var(--chart-blue))" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Football Dashboard</h1>
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
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Top Scorers</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {topScorers.map((p, i) => (
              <Link key={p.id} to={`/${sport}/players/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.teamName} · {p.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{p.stats.goals}</p>
                  <p className="text-xs text-muted-foreground">Goals</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Standings</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {topTeams.map((t, i) => (
              <Link key={t.id} to={`/${sport}/teams/${t.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.league} · GD {t.goalsFor - t.goalsAgainst > 0 ? "+" : ""}{t.goalsFor - t.goalsAgainst}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{t.wins * 3 + t.draws}</p>
                  <p className="text-xs text-muted-foreground">Pts</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

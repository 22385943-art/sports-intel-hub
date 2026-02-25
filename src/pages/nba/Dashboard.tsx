import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NBA_PLAYERS, NBA_TEAMS, computeImpactRating } from "@/data/nba/mockData";
import { TrendingUp, Users, Shield, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";

export default function NBADashboard() {
  const { sport } = useSport();
  const topPlayers = [...NBA_PLAYERS].sort((a, b) => b.stats.ppg - a.stats.ppg).slice(0, 5);
  const topTeams = [...NBA_TEAMS].sort((a, b) => b.wins - a.wins).slice(0, 5);

  const statCards = [
    { title: "Players Tracked", value: NBA_PLAYERS.length, icon: Users },
    { title: "Teams", value: NBA_TEAMS.length, icon: Shield },
    { title: "Avg PPG (Top 10)", value: (NBA_PLAYERS.reduce((s, p) => s + p.stats.ppg, 0) / NBA_PLAYERS.length).toFixed(1), icon: TrendingUp },
    { title: "Metrics Active", value: 2, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">NBA Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Season overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Top Scorers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPlayers.map((p, i) => (
              <Link key={p.id} to={`/${sport}/players/${p.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.teamName} · {p.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{p.stats.ppg}</p>
                  <p className="text-xs text-muted-foreground">PPG</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Standings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTeams.map((t, i) => (
              <Link key={t.id} to={`/${sport}/teams/${t.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.conference}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{t.wins}-{t.losses}</p>
                  <p className="text-xs text-muted-foreground">W-L</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

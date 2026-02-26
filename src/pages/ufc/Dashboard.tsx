import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UFC_FIGHTERS, computeUFCAdvanced } from "@/data/ufc/mockData";
import { TrendingUp, Users, Activity, Target, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { SparkLine } from "@/components/shared/SparkLine";

export default function UFCDashboard() {
  const { sport } = useSport();
  const topFighters = [...UFC_FIGHTERS].sort((a, b) => b.record.wins - a.record.wins).slice(0, 5);
  const topDom = [...UFC_FIGHTERS].sort((a, b) => computeUFCAdvanced(b).dominanceScore - computeUFCAdvanced(a).dominanceScore)[0];

  const metricTiles = [
    { title: "Fighters Tracked", value: UFC_FIGHTERS.length, icon: Users, sparkData: [3, 4, 5, 5, 6, 6], color: "hsl(var(--chart-teal))" },
    { title: "Weight Classes", value: [...new Set(UFC_FIGHTERS.map(f => f.weightClass))].length, icon: Shield, sparkData: [3, 3, 4, 4, 5, 5], color: "hsl(var(--chart-blue))" },
    { title: "Avg Accuracy", value: `${(UFC_FIGHTERS.reduce((s, f) => s + f.stats.strikingAccuracy, 0) / UFC_FIGHTERS.length).toFixed(0)}%`, icon: Target, sparkData: [52, 54, 55, 56, 57, 58], color: "hsl(var(--chart-gold))" },
    { title: "Top DOM", value: computeUFCAdvanced(topDom).dominanceScore, icon: Activity, sparkData: [30, 35, 38, 40, 42, 45], color: "hsl(var(--chart-teal))" },
    { title: "Avg Str/Min", value: (UFC_FIGHTERS.reduce((s, f) => s + f.stats.sigStrikesPerMin, 0) / UFC_FIGHTERS.length).toFixed(1), icon: TrendingUp, sparkData: [4.5, 4.8, 5.0, 5.2, 5.3, 5.5], color: "hsl(var(--chart-positive))" },
    { title: "Metrics Active", value: 10, icon: BarChart3, sparkData: [3, 5, 6, 7, 9, 10], color: "hsl(var(--chart-blue))" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">UFC Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Fighter analytics overview</p>
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
                <div className="p-2 rounded-lg bg-muted"><s.icon className="h-4 w-4 text-muted-foreground" /></div>
              </div>
              <div className="h-8"><SparkLine data={s.sparkData} color={s.color} /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Top Fighters</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {topFighters.map((f, i) => (
            <Link key={f.id} to={`/${sport}/players/${f.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.weightClass}{f.nickname !== "N/A" ? ` · "${f.nickname}"` : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold">{f.record.wins}-{f.record.losses}</p>
                <p className="text-xs text-muted-foreground">Record</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

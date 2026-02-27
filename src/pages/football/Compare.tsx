import { useState } from "react";
import { footballService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

export default function FootballCompare() {
  const allPlayers = footballService.getAllPlayers();
  const [p1Id, setP1Id] = useState(allPlayers[0].id);
  const [p2Id, setP2Id] = useState(allPlayers[1].id);

  const p1 = footballService.getPlayerById(p1Id)!;
  const p2 = footballService.getPlayerById(p2Id)!;
  const adv1 = footballService.computeAdvanced(p1);
  const adv2 = footballService.computeAdvanced(p2);

  const n1 = p1.name.split(" ").pop()!;
  const n2 = p2.name.split(" ").pop()!;

  const radarData = [
    { metric: "xGC", [n1]: adv1.xgContribution, [n2]: adv2.xgContribution },
    { metric: "PRS", [n1]: adv1.pressingImpact, [n2]: adv2.pressingImpact },
    { metric: "BUV", [n1]: adv1.buildUpValue, [n2]: adv2.buildUpValue },
    { metric: "xT", [n1]: adv1.xT, [n2]: adv2.xT },
    { metric: "FTI", [n1]: adv1.finalThird, [n2]: adv2.finalThird },
    { metric: "PPV", [n1]: adv1.progressivePassing, [n2]: adv2.progressivePassing },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">Head-to-head player comparison</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Select value={p1Id} onValueChange={setP1Id}>
          <SelectTrigger className="w-56 bg-muted border-none"><SelectValue /></SelectTrigger>
          <SelectContent>{allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="self-center text-muted-foreground font-mono text-sm">vs</span>
        <Select value={p2Id} onValueChange={setP2Id}>
          <SelectTrigger className="w-56 bg-muted border-none"><SelectValue /></SelectTrigger>
          <SelectContent>{allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Metric Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={n1} dataKey={n1} stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} />
                <Radar name={n2} dataKey={n2} stroke="hsl(var(--chart-blue))" fill="hsl(var(--chart-blue))" fillOpacity={0.15} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stat Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Goals", v1: p1.stats.goals, v2: p2.stats.goals },
                { label: "Assists", v1: p1.stats.assists, v2: p2.stats.assists },
                { label: "Pass%", v1: p1.stats.passAccuracy, v2: p2.stats.passAccuracy },
                { label: "xGC", v1: adv1.xgContribution, v2: adv2.xgContribution },
                { label: "xT", v1: adv1.xT, v2: adv2.xT },
              ].map(row => {
                const winner = row.v1 > row.v2 ? 1 : row.v2 > row.v1 ? 2 : 0;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className={`font-mono text-sm w-16 text-right ${winner === 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{row.v1}</span>
                    <div className="flex-1 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</span>
                    </div>
                    <span className={`font-mono text-sm w-16 ${winner === 2 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{row.v2}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

export default function NBACompare() {
  const allPlayers = nbaService.getAllPlayers();
  const [p1Id, setP1Id] = useState(allPlayers[0].id);
  const [p2Id, setP2Id] = useState(allPlayers[1].id);

  const p1 = nbaService.getPlayerById(p1Id)!;
  const p2 = nbaService.getPlayerById(p2Id)!;
  const adv1 = nbaService.computeAllAdvanced(p1);
  const adv2 = nbaService.computeAllAdvanced(p2);

  const radarData = [
    { metric: "GIR", [p1.name.split(" ").pop()!]: adv1.gir, [p2.name.split(" ").pop()!]: adv2.gir },
    { metric: "PVA", [p1.name.split(" ").pop()!]: adv1.pva, [p2.name.split(" ").pop()!]: adv2.pva },
    { metric: "DDI", [p1.name.split(" ").pop()!]: adv1.ddi, [p2.name.split(" ").pop()!]: adv2.ddi },
    { metric: "CPS", [p1.name.split(" ").pop()!]: adv1.cps, [p2.name.split(" ").pop()!]: adv2.cps },
    { metric: "SQI", [p1.name.split(" ").pop()!]: adv1.sqi, [p2.name.split(" ").pop()!]: adv2.sqi },
    { metric: "UAP", [p1.name.split(" ").pop()!]: adv1.uap, [p2.name.split(" ").pop()!]: adv2.uap },
  ];

  const n1 = p1.name.split(" ").pop()!;
  const n2 = p2.name.split(" ").pop()!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">Head-to-head player comparison</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={p1Id} onValueChange={setP1Id}>
          <SelectTrigger className="w-56 bg-muted border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="self-center text-muted-foreground font-mono text-sm">vs</span>
        <Select value={p2Id} onValueChange={setP2Id}>
          <SelectTrigger className="w-56 bg-muted border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
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
                { label: "PPG", v1: p1.stats.ppg, v2: p2.stats.ppg },
                { label: "RPG", v1: p1.stats.rpg, v2: p2.stats.rpg },
                { label: "APG", v1: p1.stats.apg, v2: p2.stats.apg },
                { label: "FG%", v1: p1.stats.fgPct, v2: p2.stats.fgPct },
                { label: "3P%", v1: p1.stats.threePct, v2: p2.stats.threePct },
                { label: "GIR", v1: adv1.gir, v2: adv2.gir },
              ].map(row => {
                const winner = row.v1 > row.v2 ? 1 : row.v2 > row.v1 ? 2 : 0;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className={`font-mono text-sm w-16 text-right ${winner === 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{row.v1}</span>
                    <div className="flex-1 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</span>
                    </div>
                    <span className={`font-mono text-sm w-16 ${winner === 2 ? "text-accent font-semibold" : "text-muted-foreground"}`}>{row.v2}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground italic">Full comparison with historical trends available for Pro users.</p>
    </div>
  );
}

import { useState } from "react";
import { ufcService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

export default function UFCCompare() {
  const allFighters = ufcService.getAllPlayers();
  const [f1Id, setF1Id] = useState(allFighters[0].id);
  const [f2Id, setF2Id] = useState(allFighters[1].id);

  const f1 = ufcService.getPlayerById(f1Id)!;
  const f2 = ufcService.getPlayerById(f2Id)!;
  const adv1 = ufcService.computeAdvanced(f1);
  const adv2 = ufcService.computeAdvanced(f2);

  const n1 = f1.name.split(" ").pop()!;
  const n2 = f2.name.split(" ").pop()!;

  const radarData = [
    { metric: "DMG", [n1]: adv1.damageEfficiency, [n2]: adv2.damageEfficiency },
    { metric: "FCI", [n1]: adv1.fightControl, [n2]: adv2.fightControl },
    { metric: "GRP", [n1]: adv1.grapplingEfficiency, [n2]: adv2.grapplingEfficiency },
    { metric: "DOM", [n1]: adv1.dominanceScore, [n2]: adv2.dominanceScore },
    { metric: "PAC", [n1]: adv1.paceControl, [n2]: adv2.paceControl },
    { metric: "MOM", [n1]: adv1.momentumShifts, [n2]: adv2.momentumShifts },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">Head-to-head fighter comparison</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Select value={f1Id} onValueChange={setF1Id}>
          <SelectTrigger className="w-56 bg-white/5 border-white/5"><SelectValue /></SelectTrigger>
          <SelectContent>{allFighters.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="self-center text-muted-foreground font-mono text-sm">vs</span>
        <Select value={f2Id} onValueChange={setF2Id}>
          <SelectTrigger className="w-56 bg-white/5 border-white/5"><SelectValue /></SelectTrigger>
          <SelectContent>{allFighters.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
          <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Metric Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={n1} dataKey={n1} stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} />
                <Radar name={n2} dataKey={n2} stroke="hsl(var(--chart-blue))" fill="hsl(var(--chart-blue))" fillOpacity={0.15} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
          <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Stat Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Str/Min", v1: f1.stats.sigStrikesPerMin, v2: f2.stats.sigStrikesPerMin },
                { label: "Accuracy", v1: f1.stats.strikingAccuracy, v2: f2.stats.strikingAccuracy },
                { label: "Defense", v1: f1.stats.strikingDefense, v2: f2.stats.strikingDefense },
                { label: "DOM", v1: adv1.dominanceScore, v2: adv2.dominanceScore },
                { label: "FCI", v1: adv1.fightControl, v2: adv2.fightControl },
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

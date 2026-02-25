import { NBA_PLAYERS, computeAllAdvanced } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";

export default function NBAAnalytics() {
  const { sport } = useSport();

  const metricsData = NBA_PLAYERS.map(p => ({
    ...p,
    adv: computeAllAdvanced(p),
  })).sort((a, b) => b.adv.gir - a.adv.gir);

  const barData = metricsData.map(p => ({
    name: p.name.split(" ").pop(),
    GIR: p.adv.gir,
    UAP: p.adv.uap,
    DDI: p.adv.ddi,
  }));

  const top3Radar = metricsData.slice(0, 3).map(p => ({
    name: p.name.split(" ").pop()!,
    data: [
      { metric: "GIR", value: p.adv.gir },
      { metric: "PVA", value: p.adv.pva },
      { metric: "DDI", value: p.adv.ddi },
      { metric: "CPS", value: p.adv.cps },
      { metric: "SQI", value: p.adv.sqi },
      { metric: "LSR", value: p.adv.lsr },
    ],
  }));

  // Merge radar data
  const radarMerged = top3Radar[0].data.map((d, i) => ({
    metric: d.metric,
    [top3Radar[0].name]: d.value,
    [top3Radar[1].name]: top3Radar[1].data[i].value,
    [top3Radar[2].name]: top3Radar[2].data[i].value,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Advanced metrics and performance analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">GIR vs UAP vs DDI</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Bar dataKey="GIR" fill="hsl(var(--chart-teal))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="UAP" fill="hsl(var(--chart-blue))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DDI" fill="hsl(var(--chart-gold))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top 3 – Metric Profile</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarMerged}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={top3Radar[0].name} dataKey={top3Radar[0].name} stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.1} />
                <Radar name={top3Radar[1].name} dataKey={top3Radar[1].name} stroke="hsl(var(--chart-blue))" fill="hsl(var(--chart-blue))" fillOpacity={0.1} />
                <Radar name={top3Radar[2].name} dataKey={top3Radar[2].name} stroke="hsl(var(--chart-gold))" fill="hsl(var(--chart-gold))" fillOpacity={0.1} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Full Metrics Table</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>GIR</TableHead>
                <TableHead>PVA</TableHead>
                <TableHead>DDI</TableHead>
                <TableHead>CPS</TableHead>
                <TableHead>EOE</TableHead>
                <TableHead>SQI</TableHead>
                <TableHead>LSR</TableHead>
                <TableHead>UAP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricsData.map((p, i) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{p.adv.gir}</TableCell>
                  <TableCell className="font-mono">{p.adv.pva}</TableCell>
                  <TableCell className="font-mono">{p.adv.ddi}</TableCell>
                  <TableCell className="font-mono">{p.adv.cps}</TableCell>
                  <TableCell className="font-mono">{p.adv.eoe}</TableCell>
                  <TableCell className="font-mono">{p.adv.sqi}</TableCell>
                  <TableCell className="font-mono">{p.adv.lsr}</TableCell>
                  <TableCell className="font-mono">{p.adv.uap}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

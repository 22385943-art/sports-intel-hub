import { NBA_PLAYERS, computeImpactRating, computeEfficiencyScore } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";

export default function NBAAnalytics() {
  const { sport } = useSport();

  const metricsData = NBA_PLAYERS.map(p => ({
    ...p,
    impact: computeImpactRating(p),
    efficiency: computeEfficiencyScore(p),
  })).sort((a, b) => b.impact - a.impact);

  const chartData = metricsData.map(p => ({
    name: p.name.split(" ").pop(),
    impact: p.impact,
    efficiency: p.efficiency,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Advanced metrics and performance analysis</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Impact vs Efficiency</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="impact" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="efficiency" fill="hsl(var(--chart-positive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Player Metrics Table</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>PPG</TableHead>
                <TableHead>Impact Rating</TableHead>
                <TableHead>Efficiency Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricsData.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>
                  <TableCell className="font-mono">{p.stats.ppg}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{p.impact}</TableCell>
                  <TableCell className="font-mono font-semibold">{p.efficiency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

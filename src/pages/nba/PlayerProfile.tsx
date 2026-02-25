import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { NBA_PLAYERS, computeImpactRating, computeEfficiencyScore } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ArrowLeft } from "lucide-react";

export default function NBAPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const player = NBA_PLAYERS.find(p => p.id === id);

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Player not found</p>
        <Link to={`/${sport}/players`} className="text-primary hover:underline mt-2">← Back to players</Link>
      </div>
    );
  }

  const impact = computeImpactRating(player);
  const efficiency = computeEfficiencyScore(player);

  const radarData = [
    { stat: "PTS", value: player.stats.ppg, max: 35 },
    { stat: "REB", value: player.stats.rpg, max: 15 },
    { stat: "AST", value: player.stats.apg, max: 12 },
    { stat: "STL", value: player.stats.spg, max: 3 },
    { stat: "BLK", value: player.stats.bpg, max: 4 },
    { stat: "FG%", value: player.stats.fgPct / 2, max: 30 },
  ];

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/players`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Players
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-muted-foreground">{player.teamName} · {player.position} · Age {player.age}</p>
        </div>
        <div className="flex gap-4">
          <Card className="bg-card border-border px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Impact</p>
            <p className="text-xl font-bold font-mono text-primary">{impact}</p>
          </Card>
          <Card className="bg-card border-border px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Efficiency</p>
            <p className="text-xl font-bold font-mono text-primary">{efficiency}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gamelog">Game Log</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "PPG", value: player.stats.ppg },
              { label: "RPG", value: player.stats.rpg },
              { label: "APG", value: player.stats.apg },
              { label: "MPG", value: player.stats.mpg },
              { label: "FG%", value: `${player.stats.fgPct}%` },
              { label: "3P%", value: `${player.stats.threePct}%` },
              { label: "FT%", value: `${player.stats.ftPct}%` },
              { label: "SPG", value: player.stats.spg },
            ].map(s => (
              <Card key={s.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold font-mono">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Scoring Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={player.gameLog}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="pts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-base">Stat Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar name="Stats" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gamelog">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>MIN</TableHead>
                    <TableHead>PTS</TableHead>
                    <TableHead>REB</TableHead>
                    <TableHead>AST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {player.gameLog.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{g.date}</TableCell>
                      <TableCell className="font-mono">{g.min}</TableCell>
                      <TableCell className="font-mono">{g.pts}</TableCell>
                      <TableCell className="font-mono">{g.reb}</TableCell>
                      <TableCell className="font-mono">{g.ast}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Advanced Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-md bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Impact Rating</p>
                  <p className="text-3xl font-bold font-mono text-primary">{impact}</p>
                  <p className="text-xs text-muted-foreground mt-1">Composite metric based on counting stats and efficiency</p>
                </div>
                <div className="p-4 rounded-md bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Efficiency Score</p>
                  <p className="text-3xl font-bold font-mono text-primary">{efficiency}</p>
                  <p className="text-xs text-muted-foreground mt-1">Per-36 efficiency weighted by shooting percentages</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">Pro users will see additional advanced metrics and historical trends.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

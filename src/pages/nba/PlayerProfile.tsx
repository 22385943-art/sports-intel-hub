import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { NBA_PLAYERS, computeAllAdvanced } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const METRIC_INFO: Record<string, { label: string; desc: string }> = {
  gir: { label: "Global Impact Rating", desc: "Composite metric: counting stats weighted by efficiency" },
  pva: { label: "Playmaking Value Added", desc: "Assist production adjusted for scoring efficiency" },
  ddi: { label: "Defensive Disruption Index", desc: "Steals, blocks, and defensive rebounds combined" },
  cps: { label: "Clutch Performance Score", desc: "Scoring + free throw + three-point reliability" },
  eoe: { label: "Efficiency Over Expectation", desc: "Points above expected output based on FG%" },
  sqi: { label: "Shot Quality Impact", desc: "Shooting efficiency weighted by volume" },
  lsr: { label: "Lineup Synergy Rating", desc: "Contribution to team chemistry via assists and activity" },
  uap: { label: "Usage-Adjusted Production", desc: "Per-36 production normalized by shooting efficiency" },
};

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

  const adv = computeAllAdvanced(player);

  const radarData = [
    { stat: "PTS", value: player.stats.ppg, max: 35 },
    { stat: "REB", value: player.stats.rpg, max: 15 },
    { stat: "AST", value: player.stats.apg, max: 12 },
    { stat: "STL", value: player.stats.spg, max: 3 },
    { stat: "BLK", value: player.stats.bpg, max: 4 },
    { stat: "EFF", value: player.stats.fgPct / 2, max: 30 },
  ];

  const advEntries = Object.entries(adv) as [string, number][];

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/players`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Players
      </Link>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="font-mono">{player.position}</Badge>
            <span className="text-muted-foreground text-sm">{player.teamName} · Age {player.age}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Card className="bg-card border-border px-4 py-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">GIR</p>
            <p className="text-xl font-bold font-mono text-primary">{adv.gir}</p>
          </Card>
          <Card className="bg-card border-border px-4 py-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">UAP</p>
            <p className="text-xl font-bold font-mono" style={{ color: "hsl(var(--chart-blue))" }}>{adv.uap}</p>
          </Card>
          <Card className="bg-card border-border px-4 py-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">DDI</p>
            <p className="text-xl font-bold font-mono" style={{ color: "hsl(var(--chart-gold))" }}>{adv.ddi}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gamelog">Game Log</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold font-mono mt-0.5">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Scoring Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={player.gameLog}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="pts" stroke="hsl(var(--chart-teal))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ast" stroke="hsl(var(--chart-blue))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stat Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar name="Stats" dataKey="value" stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} />
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
                  <TableRow className="hover:bg-transparent">
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
                      <TableCell className="font-mono text-sm">{g.min}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{g.pts}</TableCell>
                      <TableCell className="font-mono text-sm">{g.reb}</TableCell>
                      <TableCell className="font-mono text-sm">{g.ast}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {advEntries.map(([key, val]) => {
              const info = METRIC_INFO[key];
              return (
                <Card key={key} className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{key}</p>
                    <p className="text-2xl font-bold font-mono mt-1 text-primary">{val}</p>
                    <p className="text-xs text-muted-foreground mt-1">{info?.label}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{info?.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground italic">Pro users will see historical trends and league percentile rankings.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

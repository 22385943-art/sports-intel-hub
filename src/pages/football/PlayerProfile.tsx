import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { footballService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PercentileBar } from "@/components/shared/PercentileBar";
import { MetricTooltip } from "@/components/shared/MetricTooltip";

export default function FootballPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const player = footballService.getPlayerById(id!);

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Player not found</p>
        <Link to={`/${sport}/players`} className="text-primary hover:underline mt-2">← Back to players</Link>
      </div>
    );
  }

  const adv = footballService.computeAdvanced(player);
  const radarData = [
    { stat: "Goals", value: player.stats.goals, max: 25 },
    { stat: "Assists", value: player.stats.assists, max: 15 },
    { stat: "Pass%", value: player.stats.passAccuracy, max: 100 },
    { stat: "Tackles", value: player.stats.tackles, max: 55 },
    { stat: "Dribbles", value: player.stats.dribbles, max: 80 },
    { stat: "Key Pass", value: player.stats.keyPasses, max: 65 },
  ];
  const advEntries = Object.entries(adv) as [string, number][];

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/players`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Players
      </Link>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="font-mono bg-white/5 border-white/10">{player.position}</Badge>
            <span className="text-muted-foreground text-sm">{player.teamName} · {player.nationality} · Age {player.age}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Card className="bg-white/[0.03] border-white/5 px-4 py-2.5 text-center backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">xGC</p>
            <p className="text-xl font-bold font-mono text-primary">{adv.xgContribution}</p>
          </Card>
          <Card className="bg-white/[0.03] border-white/5 px-4 py-2.5 text-center backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">xT</p>
            <p className="text-xl font-bold font-mono text-chart-blue">{adv.xT}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Overview</TabsTrigger>
          <TabsTrigger value="matchlog" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Match Log</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Goals", value: player.stats.goals },
              { label: "Assists", value: player.stats.assists },
              { label: "Apps", value: player.stats.appearances },
              { label: "Minutes", value: player.stats.minutesPlayed },
              { label: "Pass%", value: `${player.stats.passAccuracy}%` },
              { label: "Tackles", value: player.stats.tackles },
              { label: "Key Passes", value: player.stats.keyPasses },
              { label: "Dribbles", value: player.stats.dribbles },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/5 backdrop-blur-xl">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold font-mono mt-0.5 text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
              <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Rating Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={player.matchLog}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis domain={[5, 10]} stroke="rgba(255,255,255,0.1)" tick={{ fill: 'hsl(215 20% 55%)' }} />
                    <Tooltip contentStyle={{ background: "hsl(229 84% 4%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                    <Line type="monotone" dataKey="rating" stroke="hsl(var(--chart-teal))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
              <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Stat Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar name="Stats" dataKey="value" stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matchlog">
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">MIN</TableHead>
                    <TableHead className="text-muted-foreground">G</TableHead>
                    <TableHead className="text-muted-foreground">A</TableHead>
                    <TableHead className="text-muted-foreground">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {player.matchLog.map((g, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{g.date}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground/70">{g.mins}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-foreground">{g.goals}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground/70">{g.assists}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground/70">{g.rating}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-3">
            {advEntries.map(([key, val]) => (
              <PercentileBar key={key} value={val} max={val * 1.5} label={key} displayValue={val} colorClass="bg-primary" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

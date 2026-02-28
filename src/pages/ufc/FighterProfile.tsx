import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { ufcService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PercentileBar } from "@/components/shared/PercentileBar";

export default function UFCFighterProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const fighter = ufcService.getPlayerById(id!);

  if (!fighter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Fighter not found</p>
        <Link to={`/${sport}/players`} className="text-primary hover:underline mt-2">← Back to fighters</Link>
      </div>
    );
  }

  const adv = ufcService.computeAdvanced(fighter);
  const radarData = [
    { stat: "Striking", value: fighter.stats.sigStrikesPerMin * 10 },
    { stat: "Accuracy", value: fighter.stats.strikingAccuracy },
    { stat: "Defense", value: fighter.stats.strikingDefense },
    { stat: "Grappling", value: fighter.stats.takedownAccuracy },
    { stat: "TD Def", value: fighter.stats.takedownDefense },
    { stat: "Control", value: fighter.stats.controlTimePct },
  ];
  const advEntries = Object.entries(adv) as [string, number][];

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/players`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Fighters
      </Link>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{fighter.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="font-mono bg-white/5 border-white/10">{fighter.weightClass}</Badge>
            <span className="text-muted-foreground text-sm">{fighter.record.wins}-{fighter.record.losses}-{fighter.record.draws} · Age {fighter.age}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Card className="bg-white/[0.03] border-white/5 px-4 py-2.5 text-center backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">DOM</p>
            <p className="text-xl font-bold font-mono text-primary">{adv.dominanceScore}</p>
          </Card>
          <Card className="bg-white/[0.03] border-white/5 px-4 py-2.5 text-center backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">FCI</p>
            <p className="text-xl font-bold font-mono text-chart-gold">{adv.fightControl}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Overview</TabsTrigger>
          <TabsTrigger value="fightlog" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Fight Log</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-white/10 data-[state=active]:text-primary">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Str/Min", value: fighter.stats.sigStrikesPerMin },
              { label: "Str Acc", value: `${fighter.stats.strikingAccuracy}%` },
              { label: "Str Def", value: `${fighter.stats.strikingDefense}%` },
              { label: "TD/15", value: fighter.stats.takedownAvgPer15 },
              { label: "TD Acc", value: `${fighter.stats.takedownAccuracy}%` },
              { label: "TD Def", value: `${fighter.stats.takedownDefense}%` },
              { label: "Sub/15", value: fighter.stats.submissionAvgPer15 },
              { label: "Control", value: `${fighter.stats.controlTimePct}%` },
            ].map(s => (
              <Card key={s.label} className="bg-white/[0.03] border-white/5 backdrop-blur-xl">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold font-mono mt-0.5 text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
            <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Fight Profile</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="Stats" dataKey="value" stroke="hsl(var(--chart-teal))" fill="hsl(var(--chart-teal))" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fightlog">
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Opponent</TableHead>
                    <TableHead className="text-muted-foreground">Result</TableHead>
                    <TableHead className="text-muted-foreground">Method</TableHead>
                    <TableHead className="text-muted-foreground">Rd</TableHead>
                    <TableHead className="text-muted-foreground">Sig Str</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fighter.fightLog.map((f, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{f.date}</TableCell>
                      <TableCell className="text-sm text-foreground">{f.opponent}</TableCell>
                      <TableCell><Badge variant={f.result === "W" ? "default" : "destructive"} className="text-xs">{f.result}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.method}</TableCell>
                      <TableCell className="font-mono text-foreground/70">{f.round}</TableCell>
                      <TableCell className="font-mono text-foreground/70">{f.sigStrikes}</TableCell>
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
              <PercentileBar key={key} value={val} max={Math.max(val * 1.4, 1)} label={key} displayValue={val} colorClass="bg-primary" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NBATeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const team = nbaService.getTeamById(id!);
  const roster = nbaService.getPlayersByTeam(id!);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Team not found</p>
        <Link to={`/${sport}/teams`} className="text-primary hover:underline mt-2">← Back to teams</Link>
      </div>
    );
  }

  const tm = nbaService.computeTeamMetrics(team);

  const metricCards = [
    { label: "Record", value: `${team.wins}-${team.losses}` },
    { label: "Net Rating", value: `${tm.netRating > 0 ? "+" : ""}${tm.netRating}`, accent: true },
    { label: "Off. Efficiency", value: tm.offensiveEfficiency },
    { label: "Def. Efficiency", value: tm.defensiveEfficiency },
    { label: "Pace-Adj Scoring", value: tm.paceAdjustedScoring },
    { label: "Win Prob %", value: `${tm.winProbContribution}%` },
    { label: "Lineup Synergy", value: tm.lineupSynergy },
    { label: "Pace", value: team.pace },
  ];

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/teams`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="font-mono">{team.abbreviation}</Badge>
          <span className="text-muted-foreground text-sm">{team.conference} Conference · {team.division} Division</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricCards.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold font-mono mt-0.5 ${"accent" in s && s.accent ? "text-primary" : ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Roster</CardTitle></CardHeader>
        <CardContent className="p-0">
          {roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Player</TableHead>
                  <TableHead>POS</TableHead>
                  <TableHead>PPG</TableHead>
                  <TableHead>RPG</TableHead>
                  <TableHead>APG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs font-mono">{p.position}</Badge></TableCell>
                    <TableCell className="font-mono">{p.stats.ppg}</TableCell>
                    <TableCell className="font-mono">{p.stats.rpg}</TableCell>
                    <TableCell className="font-mono">{p.stats.apg}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No players tracked for this team yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

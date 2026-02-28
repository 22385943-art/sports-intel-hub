import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { footballService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FootballTeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const team = footballService.getTeamById(id!);
  const roster = footballService.getPlayersByTeam(id!);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Team not found</p>
        <Link to={`/${sport}/teams`} className="text-primary hover:underline mt-2">← Back to teams</Link>
      </div>
    );
  }

  const gd = team.goalsFor - team.goalsAgainst;

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/teams`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="font-mono bg-white/5 border-white/10">{team.abbreviation}</Badge>
          <span className="text-muted-foreground text-sm">{team.league}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Points", value: team.wins * 3 + team.draws },
          { label: "Goal Diff", value: `${gd > 0 ? "+" : ""}${gd}` },
          { label: "xG", value: team.xG },
          { label: "xGA", value: team.xGA },
          { label: "Possession", value: `${team.possession}%` },
          { label: "Record", value: `${team.wins}W ${team.draws}D ${team.losses}L` },
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
        <CardHeader className="pb-3 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Squad</CardTitle></CardHeader>
        <CardContent className="p-0">
          {roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-muted-foreground">Player</TableHead>
                  <TableHead className="text-muted-foreground">POS</TableHead>
                  <TableHead className="text-muted-foreground">G</TableHead>
                  <TableHead className="text-muted-foreground">A</TableHead>
                  <TableHead className="text-muted-foreground">Apps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(p => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell><Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs font-mono bg-white/5 border-white/10">{p.position}</Badge></TableCell>
                    <TableCell className="font-mono text-foreground">{p.stats.goals}</TableCell>
                    <TableCell className="font-mono text-foreground/70">{p.stats.assists}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.stats.appearances}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No players tracked.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

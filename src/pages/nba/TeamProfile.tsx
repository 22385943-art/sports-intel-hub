import { useParams, Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { NBA_TEAMS, NBA_PLAYERS } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function NBATeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const team = NBA_TEAMS.find(t => t.id === id);
  const roster = NBA_PLAYERS.filter(p => p.teamId === id);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Team not found</p>
        <Link to={`/${sport}/teams`} className="text-primary hover:underline mt-2">← Back to teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/${sport}/teams`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">{team.conference} Conference · {team.division} Division</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Record", value: `${team.wins}-${team.losses}` },
          { label: "PPG", value: team.ppg },
          { label: "Opp PPG", value: team.oppg },
          { label: "Pace", value: team.pace },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold font-mono">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Roster</CardTitle></CardHeader>
        <CardContent className="p-0">
          {roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="font-mono text-xs">{p.position}</TableCell>
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

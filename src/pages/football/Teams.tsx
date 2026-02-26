import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { FOOTBALL_TEAMS } from "@/data/football/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FootballTeams() {
  const { sport } = useSport();
  const sorted = [...FOOTBALL_TEAMS].sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">Football team standings and metrics</p>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>League</TableHead>
                <TableHead>W</TableHead>
                <TableHead>D</TableHead>
                <TableHead>L</TableHead>
                <TableHead>GF</TableHead>
                <TableHead>GA</TableHead>
                <TableHead>GD</TableHead>
                <TableHead>xG</TableHead>
                <TableHead>Poss%</TableHead>
                <TableHead>Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t, i) => (
                <TableRow key={t.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell><Link to={`/${sport}/teams/${t.id}`} className="font-medium text-primary hover:underline">{t.name}</Link></TableCell>
                  <TableCell className="font-mono text-xs">{t.league}</TableCell>
                  <TableCell className="font-mono font-semibold">{t.wins}</TableCell>
                  <TableCell className="font-mono">{t.draws}</TableCell>
                  <TableCell className="font-mono">{t.losses}</TableCell>
                  <TableCell className="font-mono">{t.goalsFor}</TableCell>
                  <TableCell className="font-mono">{t.goalsAgainst}</TableCell>
                  <TableCell className={`font-mono font-semibold ${t.goalsFor - t.goalsAgainst > 0 ? "text-chart-positive" : "text-chart-negative"}`}>
                    {t.goalsFor - t.goalsAgainst > 0 ? "+" : ""}{t.goalsFor - t.goalsAgainst}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.xG}</TableCell>
                  <TableCell className="font-mono text-xs">{t.possession}%</TableCell>
                  <TableCell className="font-mono font-bold text-primary">{t.wins * 3 + t.draws}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { footballService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FootballTeams() {
  const { sport } = useSport();
  const sorted = [...footballService.getAllTeams()].sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">Football team standings and metrics</p>
      </div>
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">Team</TableHead>
                <TableHead className="text-muted-foreground">League</TableHead>
                <TableHead className="text-muted-foreground">W</TableHead>
                <TableHead className="text-muted-foreground">D</TableHead>
                <TableHead className="text-muted-foreground">L</TableHead>
                <TableHead className="text-muted-foreground">GF</TableHead>
                <TableHead className="text-muted-foreground">GA</TableHead>
                <TableHead className="text-muted-foreground">GD</TableHead>
                <TableHead className="text-muted-foreground">xG</TableHead>
                <TableHead className="text-muted-foreground">Poss%</TableHead>
                <TableHead className="text-muted-foreground">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t, i) => (
                <TableRow key={t.id} className="hover:bg-white/5 transition-all duration-300 border-white/5">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell><Link to={`/${sport}/teams/${t.id}`} className="font-medium text-primary hover:underline">{t.name}</Link></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.league}</TableCell>
                  <TableCell className="font-mono font-semibold text-foreground">{t.wins}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{t.draws}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{t.losses}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{t.goalsFor}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{t.goalsAgainst}</TableCell>
                  <TableCell className={`font-mono font-semibold ${t.goalsFor - t.goalsAgainst > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.goalsFor - t.goalsAgainst > 0 ? "+" : ""}{t.goalsFor - t.goalsAgainst}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.xG}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.possession}%</TableCell>
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

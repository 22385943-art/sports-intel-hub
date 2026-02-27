import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getRatingColor(val: number): string {
  if (val > 5) return "text-chart-positive font-semibold";
  if (val > 0) return "text-foreground";
  return "text-chart-negative";
}

export default function NBATeams() {
  const { sport } = useSport();
  const sorted = [...nbaService.getAllTeams()].sort((a, b) => b.wins - a.wins);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">NBA team standings and advanced metrics</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>CONF</TableHead>
                <TableHead>W</TableHead>
                <TableHead>L</TableHead>
                <TableHead>PPG</TableHead>
                <TableHead>OPP PPG</TableHead>
                <TableHead>NET RTG</TableHead>
                <TableHead>OFF EFF</TableHead>
                <TableHead>DEF EFF</TableHead>
                <TableHead>PACE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t, i) => {
                const tm = nbaService.computeTeamMetrics(t);
                return (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Link to={`/${sport}/teams/${t.id}`} className="font-medium text-primary hover:underline">
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.conference}</TableCell>
                    <TableCell className="font-mono font-semibold">{t.wins}</TableCell>
                    <TableCell className="font-mono">{t.losses}</TableCell>
                    <TableCell className="font-mono">{t.ppg}</TableCell>
                    <TableCell className="font-mono">{t.oppg}</TableCell>
                    <TableCell className={`font-mono ${getRatingColor(tm.netRating)}`}>
                      {tm.netRating > 0 ? "+" : ""}{tm.netRating}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tm.offensiveEfficiency}</TableCell>
                    <TableCell className="font-mono text-xs">{tm.defensiveEfficiency}</TableCell>
                    <TableCell className="font-mono text-xs">{t.pace}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

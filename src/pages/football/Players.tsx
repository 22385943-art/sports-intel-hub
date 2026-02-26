import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { FOOTBALL_PLAYERS, computeFootballAdvanced } from "@/data/football/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FootballPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const positions = [...new Set(FOOTBALL_PLAYERS.map(p => p.position))];

  const filtered = useMemo(() => {
    let result = FOOTBALL_PLAYERS.map(p => ({ ...p, adv: computeFootballAdvanced(p) }));
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    return result.sort((a, b) => b.stats.goals - a.stats.goals);
  }, [search, posFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse football player stats</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs bg-muted border-none" />
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-36 bg-muted border-none"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Player</TableHead>
                <TableHead>POS</TableHead>
                <TableHead>TEAM</TableHead>
                <TableHead>G</TableHead>
                <TableHead>A</TableHead>
                <TableHead>APP</TableHead>
                <TableHead>Pass%</TableHead>
                <TableHead>xGC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell><Link to={`/${sport}/players/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs font-mono">{p.position}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>
                  <TableCell className="font-mono font-semibold">{p.stats.goals}</TableCell>
                  <TableCell className="font-mono">{p.stats.assists}</TableCell>
                  <TableCell className="font-mono text-xs">{p.stats.appearances}</TableCell>
                  <TableCell className="font-mono text-xs">{p.stats.passAccuracy}%</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{p.adv.xgContribution}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

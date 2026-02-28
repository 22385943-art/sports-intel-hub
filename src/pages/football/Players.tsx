import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { footballService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FootballPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const allPlayers = footballService.getAllPlayers();
  const positions = [...new Set(allPlayers.map(p => p.position))];

  const filtered = useMemo(() => {
    let result = allPlayers.map(p => ({ ...p, adv: footballService.computeAdvanced(p) }));
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    return result.sort((a, b) => b.stats.goals - a.stats.goals);
  }, [search, posFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Players</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse football player stats</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs bg-white/5 border-white/5" />
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-36 bg-white/5 border-white/5"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-muted-foreground">Player</TableHead>
                <TableHead className="text-muted-foreground">POS</TableHead>
                <TableHead className="text-muted-foreground">TEAM</TableHead>
                <TableHead className="text-muted-foreground">G</TableHead>
                <TableHead className="text-muted-foreground">A</TableHead>
                <TableHead className="text-muted-foreground">APP</TableHead>
                <TableHead className="text-muted-foreground">Pass%</TableHead>
                <TableHead className="text-muted-foreground">xGC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-white/5 transition-all duration-300 border-white/5">
                  <TableCell><Link to={`/${sport}/players/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs font-mono bg-white/5 border-white/10">{p.position}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.teamName}</TableCell>
                  <TableCell className="font-mono font-semibold text-foreground">{p.stats.goals}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.stats.assists}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.stats.appearances}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.stats.passAccuracy}%</TableCell>
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

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { NBA_PLAYERS, NBA_TEAMS } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

type SortKey = "name" | "ppg" | "rpg" | "apg";

export default function NBAPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let result = [...NBA_PLAYERS];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    if (teamFilter !== "all") result = result.filter(p => p.teamId === teamFilter);
    result.sort((a, b) => {
      const av = sortKey === "name" ? a.name : a.stats[sortKey];
      const bv = sortKey === "name" ? b.name : b.stats[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [search, posFilter, teamFilter, sortKey, sortDir]);

  const positions = [...new Set(NBA_PLAYERS.map(p => p.position))];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse and filter NBA player stats</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs bg-secondary border-none" />
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-32 bg-secondary border-none"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40 bg-secondary border-none"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {NBA_TEAMS.map(t => <SelectItem key={t.id} value={t.id}>{t.abbreviation}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Player" k="name" />
                <TableHead>POS</TableHead>
                <TableHead>TEAM</TableHead>
                <SortHeader label="PPG" k="ppg" />
                <SortHeader label="RPG" k="rpg" />
                <SortHeader label="APG" k="apg" />
                <TableHead>FG%</TableHead>
                <TableHead>3P%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-secondary/50">
                  <TableCell>
                    <Link to={`/${sport}/players/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.position}</TableCell>
                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>
                  <TableCell className="font-mono">{p.stats.ppg}</TableCell>
                  <TableCell className="font-mono">{p.stats.rpg}</TableCell>
                  <TableCell className="font-mono">{p.stats.apg}</TableCell>
                  <TableCell className="font-mono">{p.stats.fgPct}%</TableCell>
                  <TableCell className="font-mono">{p.stats.threePct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SortKey = "name" | "ppg" | "rpg" | "apg" | "gir";

function getHeatColor(val: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
  if (ratio > 0.75) return "bg-chart-positive/15 text-chart-positive";
  if (ratio > 0.5) return "bg-chart-teal/10 text-foreground";
  if (ratio > 0.25) return "bg-chart-gold/10 text-foreground";
  return "text-muted-foreground";
}

export default function NBAPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // 👇 NUEVO: columnas visibles
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "ppg",
    "rpg",
    "apg",
    "fgPct",
    "threePct",
    "gir",
  ]);

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const allPlayers = nbaService.getAllPlayers();
  const allTeams = nbaService.getAllTeams();
  const ppgRange = {
    min: Math.min(...allPlayers.map(p => p.stats.ppg)),
    max: Math.max(...allPlayers.map(p => p.stats.ppg)),
  };

  const filtered = useMemo(() => {
    let result = allPlayers.map(p => ({
      ...p,
      gir: nbaService.computeGIR(p),
      uap: nbaService.computeUAP(p),
    }));

    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    if (teamFilter !== "all") result = result.filter(p => p.teamId === teamFilter);

    result.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "name") {
        av = a.name;
        bv = b.name;
      } else if (sortKey === "gir") {
        av = a.gir;
        bv = b.gir;
      } else {
        av = a.stats[sortKey];
        bv = b.stats[sortKey];
      }

      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }

      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

    return result;
  }, [search, posFilter, teamFilter, sortKey, sortDir, allPlayers]);

  const positions = [...new Set(allPlayers.map(p => p.position))];

  const renderSortHead = (label: string, k: SortKey) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${
            sortKey === k ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Players</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse and filter NBA player stats
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs bg-muted border-none"
        />

        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-36 bg-muted border-none">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-44 bg-muted border-none">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {allTeams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.abbreviation} – {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 👇 NUEVO: selector de columnas */}
      <div className="flex gap-2 flex-wrap">
        {["ppg", "rpg", "apg", "fgPct", "threePct", "gir"].map(col => (
          <Badge
            key={col}
            variant={visibleColumns.includes(col) ? "default" : "outline"}
            onClick={() => toggleColumn(col)}
            className="cursor-pointer"
          >
            {col}
          </Badge>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {renderSortHead("Player", "name")}
                <TableHead>POS</TableHead>
                <TableHead>TEAM</TableHead>

                {visibleColumns.includes("ppg") && renderSortHead("PPG", "ppg")}
                {visibleColumns.includes("rpg") && renderSortHead("RPG", "rpg")}
                {visibleColumns.includes("apg") && renderSortHead("APG", "apg")}
                {visibleColumns.includes("fgPct") && <TableHead>FG%</TableHead>}
                {visibleColumns.includes("threePct") && <TableHead>3P%</TableHead>}
                {visibleColumns.includes("gir") && renderSortHead("GIR", "gir")}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link
                      to={`/${sport}/players/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {p.position}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>

                  {visibleColumns.includes("ppg") && (
                    <TableCell
                      className={`font-mono ${getHeatColor(
                        p.stats.ppg,
                        ppgRange.min,
                        ppgRange.max
                      )} rounded-sm px-2`}
                    >
                      {p.stats.ppg}
                    </TableCell>
                  )}

                  {visibleColumns.includes("rpg") && (
                    <TableCell className="font-mono">{p.stats.rpg}</TableCell>
                  )}

                  {visibleColumns.includes("apg") && (
                    <TableCell className="font-mono">{p.stats.apg}</TableCell>
                  )}

                  {visibleColumns.includes("fgPct") && (
                    <TableCell className="font-mono text-xs">{p.stats.fgPct}%</TableCell>
                  )}

                  {visibleColumns.includes("threePct") && (
                    <TableCell className="font-mono text-xs">{p.stats.threePct}%</TableCell>
                  )}

                  {visibleColumns.includes("gir") && (
                    <TableCell className="font-mono font-semibold text-primary">
                      {p.gir}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
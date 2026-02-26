import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { UFC_FIGHTERS, computeUFCAdvanced } from "@/data/ufc/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UFCFighters() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [wcFilter, setWcFilter] = useState("all");
  const weightClasses = [...new Set(UFC_FIGHTERS.map(f => f.weightClass))];

  const filtered = useMemo(() => {
    let result = UFC_FIGHTERS.map(f => ({ ...f, adv: computeUFCAdvanced(f) }));
    if (search) result = result.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    if (wcFilter !== "all") result = result.filter(f => f.weightClass === wcFilter);
    return result.sort((a, b) => b.adv.dominanceScore - a.adv.dominanceScore);
  }, [search, wcFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fighters</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse UFC fighter stats</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search fighters..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs bg-muted border-none" />
        <Select value={wcFilter} onValueChange={setWcFilter}>
          <SelectTrigger className="w-48 bg-muted border-none"><SelectValue placeholder="Weight Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {weightClasses.map(wc => <SelectItem key={wc} value={wc}>{wc}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fighter</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Str/Min</TableHead>
                <TableHead>Str Acc</TableHead>
                <TableHead>TD Avg</TableHead>
                <TableHead>DOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} className="hover:bg-muted/50">
                  <TableCell><Link to={`/${sport}/players/${f.id}`} className="font-medium text-primary hover:underline">{f.name}</Link></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs font-mono">{f.weightClass}</Badge></TableCell>
                  <TableCell className="font-mono font-semibold">{f.record.wins}-{f.record.losses}-{f.record.draws}</TableCell>
                  <TableCell className="font-mono">{f.stats.sigStrikesPerMin}</TableCell>
                  <TableCell className="font-mono">{f.stats.strikingAccuracy}%</TableCell>
                  <TableCell className="font-mono">{f.stats.takedownAvgPer15}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{f.adv.dominanceScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

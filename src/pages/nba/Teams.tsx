import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Shield, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getDivision = (abbr: string) => {
  const divisions: Record<string, string[]> = {
    "Atlantic": ["BOS", "BKN", "NYK", "PHI", "TOR"],
    "Central": ["CHI", "CLE", "DET", "IND", "MIL"],
    "Southeast": ["ATL", "CHA", "MIA", "ORL", "WAS"],
    "Northwest": ["DEN", "MIN", "OKC", "POR", "UTA"],
    "Pacific": ["GSW", "LAC", "LAL", "PHX", "SAC"],
    "Southwest": ["DAL", "HOU", "MEM", "NOP", "SAS"]
  };
  for (const [div, teams] of Object.entries(divisions)) {
    if (teams.includes(abbr.toUpperCase())) return div;
  }
  return "Unknown";
};

const getDivisionsForConference = (conf: string) => {
  if (conf === "Eastern") return ["Atlantic", "Central", "Southeast"];
  if (conf === "Western") return ["Northwest", "Pacific", "Southwest"];
  return ["Atlantic", "Central", "Southeast", "Northwest", "Pacific", "Southwest"];
};

export default function NBATeams() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [confFilter, setConfFilter] = useState("all");
  const [divFilter, setDivFilter] = useState("all");
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    nbaService.fetchAllOfficialTeams().then((realTeams) => {
      setTeams(realTeams);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (confFilter !== "all") {
      const validDivisions = getDivisionsForConference(confFilter);
      if (divFilter !== "all" && !validDivisions.includes(divFilter)) {
        setDivFilter("all");
      }
    }
  }, [confFilter, divFilter]);

  const filteredTeams = teams
    .map(t => ({ ...t, division: getDivision(t.abbreviation) }))
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter(t => confFilter === "all" || t.conference === confFilter)
    .filter(t => divFilter === "all" || t.division === divFilter)
    .sort((a, b) => b.wins - a.wins);

  const availableDivisions = getDivisionsForConference(confFilter);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">Teams</h1>
        <p className="text-muted-foreground text-sm font-medium tracking-tight">Official standings and real-time metrics</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 max-w-4xl">
        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)} disabled={isLoading} className="pl-10 border-none bg-white/5 rounded-xl shadow-sm focus-visible:ring-primary font-medium" />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <Select value={confFilter} onValueChange={setConfFilter} disabled={isLoading}>
            <SelectTrigger className="flex-1 lg:w-[180px] border-none bg-white/5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm">
              <SelectValue placeholder="CONFERENCE" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-black text-primary">All Conferences</SelectItem>
              <SelectItem value="Eastern">Eastern Conf</SelectItem>
              <SelectItem value="Western">Western Conf</SelectItem>
            </SelectContent>
          </Select>
          <Select value={divFilter} onValueChange={setDivFilter} disabled={isLoading}>
            <SelectTrigger className="flex-1 lg:w-[180px] border-none bg-white/5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm">
              <SelectValue placeholder="DIVISION" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-black text-primary">All Divisions</SelectItem>
              {availableDivisions.map(div => (
                <SelectItem key={div} value={div}>{div} Division</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-black text-muted-foreground tracking-widest text-xs uppercase animate-pulse">Syncing NBA Standings...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/5">
                    <TableHead className="py-6 px-8 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Team</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-muted-foreground">Record</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-muted-foreground">Win %</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-orange-500">Off Rtg <Flame className="inline w-3 h-3 mb-0.5"/></TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-emerald-500">Def Rtg <Shield className="inline w-3 h-3 mb-0.5"/></TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-muted-foreground">Net Rtg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((t) => {
                    const winPct = ((t.wins / (t.wins + t.losses)) * 100).toFixed(1);
                    const offRtg = t.offRtg ?? 0;
                    const defRtg = t.defRtg ?? 0;
                    const netRtg = t.netRtg ?? 0;

                    return (
                      <TableRow key={t.id} className="group hover:bg-white/5 transition-all duration-300 border-white/5">
                        <TableCell className="py-4 px-8">
                          <Link to={`/${sport}/teams/${t.id}`} className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 shadow-sm flex items-center justify-center p-2 border border-white/10 group-hover:scale-110 transition-transform">
                              <img src={nbaService.getTeamLogoUrl(t.abbreviation)} alt={t.abbreviation} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{t.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t.conference}</span>
                                <span className="text-white/20">•</span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t.division}</span>
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center font-black font-mono text-foreground text-lg">{t.wins} - {t.losses}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-black font-mono text-xs border-none px-3 py-1 ${t.wins > t.losses ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {winPct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-foreground/70">{offRtg.toFixed(1)}</TableCell>
                        <TableCell className="text-center font-bold font-mono text-foreground/70">{defRtg.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-none font-black text-[10px] tracking-widest ${netRtg > 0 ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground'}`}>
                            {netRtg > 0 ? `+${netRtg.toFixed(1)}` : netRtg.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

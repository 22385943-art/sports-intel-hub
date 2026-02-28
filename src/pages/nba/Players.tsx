import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Search, Info, TrendingUp, Swords, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type SortKey = "name" | "ppg" | "rpg" | "apg" | "gir";

export default function NBAPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [confFilter, setConfFilter] = useState("all"); // NUEVO FILTRO DE CONFERENCIA
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [visibleColumns] = useState<string[]>(["ppg", "rpg", "apg", "gir"]);
  const allTeams = nbaService.getAllTeams();

  useEffect(() => {
    setIsLoading(true);
    nbaService.fetchAllOfficialPlayers().then((realData) => {
      const sortedData = realData.sort((a, b) => (b.stats?.ppg || 0) - (a.stats?.ppg || 0));
      setAllPlayers(sortedData);
      setIsLoading(false);
    });
  }, []);

  const statsDistributions = useMemo(() => {
    const keys = ['ppg', 'rpg', 'apg'] as const;
    const dists: Record<string, number[]> = {};
    keys.forEach(key => {
      dists[key] = allPlayers.map(p => p.stats[key]).sort((a, b) => a - b);
    });
    return dists;
  }, [allPlayers]);

  const getPercentile = (value: number, key: 'ppg' | 'rpg' | 'apg') => {
    const values = statsDistributions[key];
    if (!values || !value) return 0;
    const index = values.findIndex(v => v === value);
    if (index === -1) return 50; 
    return Math.round((index / values.length) * 100);
  };

  const getBarColor = (percentile: number) => {
    if (percentile >= 90) return "bg-blue-600"; 
    if (percentile >= 75) return "bg-blue-400";
    return "bg-slate-200";
  };

  const filtered = useMemo(() => {
    let result = allPlayers.map(p => ({
      ...p,
      gir: nbaService.computeGIR(p),
      // Inyectamos la conferencia leyendo de allTeams
      conference: allTeams.find(t => t.abbreviation === p.teamId)?.conference || "Unknown"
    }));

    if (search) {
      result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    if (teamFilter !== "all") result = result.filter(p => p.teamId === teamFilter);
    if (confFilter !== "all") result = result.filter(p => p.conference === confFilter);

    result.sort((a, b) => {
      let av = sortKey === "name" ? a.name : sortKey === "gir" ? a.gir : a.stats[sortKey as any];
      let bv = sortKey === "name" ? b.name : sortKey === "gir" ? b.gir : b.stats[sortKey as any];
      
      const multiplier = sortDir === "asc" ? 1 : -1;
      return typeof av === "string" 
        ? multiplier * av.localeCompare(bv as string)
        : multiplier * ((av as number) - (bv as number));
    });

    return result.slice(0, 100);
  }, [search, posFilter, teamFilter, confFilter, sortKey, sortDir, allPlayers, allTeams]);

  const toggleSort = (key: SortKey) => {
    setSortDir(sortKey === key && sortDir === "desc" ? "asc" : "desc");
    setSortKey(key);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 relative">
      <Link to={`/${sport}/compare`} className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-blue-600 hover:scale-110 transition-all flex items-center gap-2 font-black uppercase tracking-tighter">
        <Swords className="w-5 h-5" /> Versus Mode
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Scouting Hub</h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight">Datos oficiales NBA Temporada 2025-26 en vivo</p>
        </div>
        <Badge variant="outline" className="font-black text-blue-600 border-blue-100 bg-blue-50/50 px-4 py-1 rounded-full">
          {isLoading ? "CONECTANDO..." : `${filtered.length} ATLETAS`}
        </Badge>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input placeholder="Buscar atleta..." value={search} onChange={e => setSearch(e.target.value)} disabled={isLoading} className="pl-10 border-none bg-slate-50 rounded-xl focus-visible:ring-blue-500 transition-all" />
          {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* NUEVO FILTRO CONFERENCIA */}
          <Select value={confFilter} onValueChange={setConfFilter} disabled={isLoading}>
            <SelectTrigger className="w-[130px] border-none bg-slate-50 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4">
              <SelectValue placeholder="CONFERENCIA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">LIGA</SelectItem>
              <SelectItem value="Eastern">ESTE</SelectItem>
              <SelectItem value="Western">OESTE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter} disabled={isLoading}>
            <SelectTrigger className="w-[140px] border-none bg-slate-50 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4">
              <SelectValue placeholder="EQUIPO" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">TODOS</SelectItem>
              {allTeams.filter(t => confFilter === "all" || t.conference === confFilter).map(t => (
                <SelectItem key={t.id} value={t.abbreviation}>{t.abbreviation} - {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin min-h-[400px]">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="font-black text-slate-400 tracking-widest text-xs uppercase animate-pulse">Descargando datos oficiales...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[300px] py-6 px-8 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Atleta</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-center text-slate-400">Team</TableHead>
                    {visibleColumns.includes("ppg") && (
                      <TableHead onClick={() => toggleSort("ppg")} className="cursor-pointer font-black text-[10px] uppercase tracking-[0.2em] group text-center">
                        <div className="flex items-center justify-center gap-1">PPG <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </TableHead>
                    )}
                    {visibleColumns.includes("gir") && (
                      <TableHead onClick={() => toggleSort("gir")} className="cursor-pointer font-black text-[10px] uppercase tracking-[0.2em] text-blue-600 group text-center">
                        <div className="flex items-center justify-center gap-1">GIR <Info className="h-3 w-3" /></div>
                      </TableHead>
                    )}
                    <TableHead className="text-right px-8 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map(p => {
                    const ppgPercentile = getPercentile(p.stats?.ppg, 'ppg');
                    const logoUrl = nbaService.getTeamLogoUrl(p.teamId);

                    return (
                      <TableRow key={p.id} className="group hover:bg-blue-50/30 transition-all duration-300 border-slate-50">
                        <TableCell className="py-4 px-8">
                          <Link to={`/${sport}/players/${p.id}`} className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-500 bg-white">
                              <AvatarImage src={p.imageUrl} className="object-cover bg-white" loading="lazy" />
                              <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xs">{p.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">{p.name}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.conference} Conf</span>
                            </div>
                          </Link>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {logoUrl && (
                              <img src={logoUrl} alt={p.teamId} className="w-6 h-6 object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                            )}
                            <span className="font-bold text-slate-500 text-[10px] tracking-tighter uppercase">{p.teamId}</span>
                          </div>
                        </TableCell>

                        {visibleColumns.includes("ppg") && (
                          <TableCell className="w-[140px]">
                            <div className="flex flex-col gap-1.5 items-center">
                              <div className="flex justify-between w-full px-1">
                                <span className="text-xs font-black font-mono text-slate-700">{p.stats?.ppg > 0 ? p.stats.ppg.toFixed(1) : "-"}</span>
                                <span className="text-[9px] font-bold text-slate-400">{p.stats?.ppg > 0 ? `P${ppgPercentile}` : ""}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-out ${getBarColor(ppgPercentile)}`} style={{ width: p.stats?.ppg > 0 ? `${ppgPercentile}%` : '0%' }} />
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.includes("gir") && (
                          <TableCell className="text-center">
                            <Badge className="bg-blue-600 text-white border-none font-black text-[10px] px-3 py-1 shadow-lg shadow-blue-500/20">
                              {p.gir > 0 ? p.gir.toFixed(1) : "-"}
                            </Badge>
                          </TableCell>
                        )}

                        <TableCell className="text-right px-8">
                          <Link to={`/${sport}/players/${p.id}`} className="inline-flex p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-300">
                            <TrendingUp size={18} />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium italic">
                        No se han encontrado jugadores.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
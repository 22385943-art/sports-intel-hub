import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Search, Info, TrendingUp, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortKey = "name" | "ppg" | "rpg" | "apg" | "gir";

export default function NBAPlayers() {
  const { sport } = useSport();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "ppg",
    "rpg",
    "apg",
    "fgPct",
    "gir",
  ]);

  const allPlayers = nbaService.getAllPlayers();
  const allTeams = nbaService.getAllTeams();

  // --- LÓGICA DE ANÁLISIS ESTADÍSTICO (PERCENTILES) ---
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
    if (!values) return 0;
    const index = values.findIndex(v => v === value);
    return Math.round((index / values.length) * 100);
  };

  const getBarColor = (percentile: number) => {
    if (percentile >= 90) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"; // Élite
    if (percentile >= 75) return "bg-blue-500"; // Excelente
    if (percentile >= 50) return "bg-sky-400"; // Encima de la media
    return "bg-slate-300"; // Promedio/Bajo
  };

  // --- FILTRADO Y ORDENACIÓN ---
  const filtered = useMemo(() => {
    let result = allPlayers.map(p => ({
      ...p,
      gir: nbaService.computeGIR(p),
    }));

    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== "all") result = result.filter(p => p.position === posFilter);
    if (teamFilter !== "all") result = result.filter(p => p.teamId === teamFilter);

    result.sort((a, b) => {
      let av = sortKey === "name" ? a.name : sortKey === "gir" ? a.gir : a.stats[sortKey as any];
      let bv = sortKey === "name" ? b.name : sortKey === "gir" ? b.gir : b.stats[sortKey as any];
      
      const multiplier = sortDir === "asc" ? 1 : -1;
      return typeof av === "string" 
        ? multiplier * av.localeCompare(bv as string)
        : multiplier * ((av as number) - (bv as number));
    });

    return result;
  }, [search, posFilter, teamFilter, sortKey, sortDir, allPlayers]);

  const toggleSort = (key: SortKey) => {
    setSortDir(sortKey === key && sortDir === "desc" ? "asc" : "desc");
    setSortKey(key);
  };

  // Renderizador de Celdas con Barra de Rendimiento
  const renderStatCell = (value: number, type: 'ppg' | 'rpg' | 'apg') => {
    const p = getPercentile(value, type);
    return (
      <TableCell className="min-w-[110px]">
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold font-mono tracking-tighter">{value.toFixed(1)}</span>
            <span className={`text-[9px] font-black px-1 rounded ${p >= 90 ? 'text-emerald-600' : 'text-slate-400'}`}>
              P{p}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${getBarColor(p)}`}
              style={{ width: `${p}%` }}
            />
          </div>
        </div>
      </TableCell>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors">
              <TrendingUp className="w-3 h-3 mr-1" /> Analítica Avanzada
            </Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Players</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-prose">
            Explora el rendimiento de la liga mediante <span className="text-slate-900 font-semibold underline decoration-blue-500/30">percentiles dinámicos</span> y métricas de impacto global.
          </p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS / FILTROS */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar atleta por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={posFilter} onValueChange={setPosFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50/50 border-slate-200 rounded-xl">
              <Filter className="w-3 h-3 mr-2 text-slate-400" />
              <SelectValue placeholder="Posición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Posiciones</SelectItem>
              {[...new Set(allPlayers.map(p => p.position))].map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50/50 border-slate-200 rounded-xl">
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {allTeams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.abbreviation} – {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLA PRO */}
      <Card className="border-none shadow-2xl shadow-blue-900/5 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <Table>
              <TableHeader className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px] sticky left-0 bg-slate-50/80 z-20 font-bold text-slate-900 py-5">
                    <div onClick={() => toggleSort("name")} className="flex items-center gap-2 cursor-pointer group">
                      ATLETA <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-900">TEAM</TableHead>
                  {visibleColumns.includes("ppg") && (
                    <TableHead onClick={() => toggleSort("ppg")} className="cursor-pointer font-bold text-slate-900 group">
                      <div className="flex items-center gap-1">PPG <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" /></div>
                    </TableHead>
                  )}
                  {visibleColumns.includes("rpg") && <TableHead className="font-bold text-slate-900">RPG</TableHead>}
                  {visibleColumns.includes("apg") && <TableHead className="font-bold text-slate-900">APG</TableHead>}
                  {visibleColumns.includes("gir") && (
                    <TableHead onClick={() => toggleSort("gir")} className="cursor-pointer font-bold text-blue-600 group">
                      <div className="flex items-center gap-1">
                        GIR 
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-3 w-3 text-blue-400" /></TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white p-3 rounded-lg border-none shadow-xl">
                              <p className="font-bold text-blue-400 mb-1">Global Impact Rating</p>
                              <p className="text-xs">Eficiencia pura ponderada por posesiones y volumen.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="group hover:bg-blue-50/30 transition-all border-b border-slate-100">
                    <TableCell className="sticky left-0 bg-white group-hover:bg-[#fbfcfe] z-10 py-4">
                      <div className="flex flex-col">
                        <Link to={`/${sport}/players/${p.id}`} className="font-extrabold text-slate-900 hover:text-blue-600 transition-colors truncate">
                          {p.name}
                        </Link>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.position}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-xs font-semibold text-slate-500">{p.teamName}</TableCell>
                    
                    {visibleColumns.includes("ppg") && renderStatCell(p.stats.ppg, 'ppg')}
                    {visibleColumns.includes("rpg") && renderStatCell(p.stats.rpg, 'rpg')}
                    {visibleColumns.includes("apg") && renderStatCell(p.stats.apg, 'apg')}

                    {visibleColumns.includes("gir") && (
                      <TableCell>
                        <Badge className="bg-blue-600/10 text-blue-600 border-none font-black px-3 py-1">
                          {p.gir}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
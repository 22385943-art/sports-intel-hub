import { useState, useEffect, useMemo } from "react";
import { Network, Loader2, LayoutGrid, ListOrdered, SlidersHorizontal, ArrowUpDown, ChevronUp, ChevronDown, X, Activity, Shield, Zap, Target } from "lucide-react";
import { nbaService } from "@/services/sports/nbaService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import type { NBAPlayer } from "@/types/sports/nba.types";
import { AnimatePresence, motion } from "framer-motion";

type SortKey = "min" | "netRtg" | "offRtg" | "defRtg" | "tsPct" | "astPct" | "rebPct" | "pace" | "pie";
type SortDirection = "asc" | "desc";

export default function Synergy() {
  const [teams, setTeams] = useState<any[]>([]);
  
  // 🚀 1. ESTADO INTELIGENTE (Persistencia de filtros)
  const [viewMode, setViewMode] = useState<"matrix" | "list">("list");
  const [groupSize, setGroupSize] = useState<string>("2"); 
  const [teamId, setTeamId] = useState<string>("0"); // Default: Toda la liga
  const [minMinutes, setMinMinutes] = useState<string>("50");
  const [season, setSeason] = useState<string>("2025-26");
  
  // Estado de Ordenación (Sort)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "netRtg",
    direction: "desc"
  });

  // Estado del Modal (Drill-down)
  const [selectedLineup, setSelectedLineup] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<NBAPlayer[]>([]);
  const [lineups, setLineups] = useState<any[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    nbaService.fetchAllOfficialTeams(season).then(t => {
      setTeams(t.filter((team: any) => team.id && String(team.id).length > 3));
    });
  }, [season]);

  // 🚀 LÓGICA DE UX PREMIUM: Solo forzamos cambios si es estrictamente necesario (Ej: Matriz requiere 2-Man y 1 Equipo)
  const handleViewChange = (v: string) => {
    if (!v) return;
    setViewMode(v as "matrix" | "list");
    if (v === "matrix") {
      setGroupSize("2");
      // Si estamos en "Toda la liga" y pasamos a matriz, forzamos un equipo porque una matriz de 500 jugadores es inviable.
      if (teamId === "0") setTeamId("1610612760"); 
    }
  };

  const handleGroupSizeChange = (v: string) => {
    if (!v) return;
    setGroupSize(v);
    // Si elegimos 3, 4 o 5, nos saca automáticamente de la matriz
    if (v !== "2" && viewMode === "matrix") {
      setViewMode("list");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      nbaService.fetchAllOfficialPlayers(season),
      nbaService.getLineups(teamId, Number(groupSize), season)
    ]).then(([allPlayers, lineupData]) => {
      setPlayers(allPlayers);
      setLineups(lineupData);
      setLoading(false);
    });
  }, [teamId, season, groupSize]);

  // 🚀 ORDENACIÓN INTERACTIVA (Sorting Logic)
  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  };

  const sortedAndFilteredLineups = useMemo(() => {
    const filtered = lineups.filter(l => l.min >= Number(minMinutes || 0));
    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [lineups, minMinutes, sortConfig]);

  // Helpers de color
  const getNetRatingColor = (netRtg: number, min: number) => {
    if (min < 15) return "bg-[#1e293b]/40 text-slate-500 border border-white/5"; 
    if (netRtg >= 8) return "bg-[#059669] text-white border-transparent shadow-[0_0_20px_rgba(5,150,105,0.6)]"; 
    if (netRtg >= 2) return "bg-[#34d399] text-[#0a0f18] border-transparent font-black"; 
    if (netRtg >= -2) return "bg-[#334155] text-slate-200 border-transparent"; 
    if (netRtg >= -8) return "bg-[#f87171] text-[#0a0f18] border-transparent font-black"; 
    return "bg-[#dc2626] text-white border-transparent shadow-[0_0_20px_rgba(220,38,38,0.6)]"; 
  };

  const getNetRatingTextColor = (netRtg: number) => {
    if (netRtg >= 5) return "text-[#00ff88] drop-shadow-[0_0_10px_rgba(0,255,136,0.6)]";
    if (netRtg >= 0) return "text-emerald-300";
    if (netRtg >= -5) return "text-rose-300";
    return "text-[#ff003c] drop-shadow-[0_0_10px_rgba(255,0,60,0.6)]";
  };

  const matrixPlayers = useMemo(() => {
    if (teamId === "0") return [];
    const selectedTeam = teams.find(t => String(t.id) === String(teamId));
    const teamAbbr = selectedTeam ? selectedTeam.abbreviation : "";
    return players
      .filter((p: NBAPlayer) => String(p.teamId) === String(teamId) || p.teamId === teamAbbr)
      .sort((a, b) => (b.stats?.mpg || 0) - (a.stats?.mpg || 0))
      .slice(0, 12);
  }, [players, teamId, teams]);

  const getSynergyData = (p1Id: string, p2Id: string) => {
    return sortedAndFilteredLineups.find(l => {
      if (!l.groupId) return false;
      const ids = String(l.groupId).split('-');
      return ids.includes(String(p1Id)) && ids.includes(String(p2Id));
    }) || null;
  };

  // 🚀 RENDER DE AVATARES MEJORADO (Más grandes y premium)
  const renderStackedAvatars = (groupId: string, size: "md" | "lg" | "xl" = "lg") => {
    const ids = String(groupId).split('-');
    const lineupPlayers = ids.map(id => players.find(p => String(p.id) === id)).filter(Boolean) as NBAPlayer[];
    
    const sizeClasses = {
      md: "w-8 h-8 -ml-2",
      lg: "w-12 h-12 -ml-4 border-[3px]",
      xl: "w-16 h-16 -ml-5 border-[3px]"
    };

    return (
      <div className="flex items-center pl-4">
        {lineupPlayers.map((p, i) => (
          <Avatar key={i} className={`${sizeClasses[size]} border-[#0a0f18] bg-[#1e293b] hover:z-20 transition-transform duration-300 hover:scale-125 shadow-xl relative z-10`}>
            <AvatarImage src={p.imageUrl} className="object-cover" />
            <AvatarFallback className="text-[10px] font-black">{p.name.substring(0,2)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    );
  };

  // Render Header Ordenable
  const SortableHeader = ({ label, sortKey, align = "center" }: { label: string, sortKey: SortKey, align?: "left"|"center"|"right" }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer hover:bg-white/5 transition-colors group select-none text-${align}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1.5 justify-${align === 'left' ? 'start' : align === 'right' ? 'end' : 'center'} ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
          {label}
          <div className="flex flex-col opacity-50 group-hover:opacity-100">
            <ChevronUp className={`w-2.5 h-2.5 -mb-1 ${isActive && sortConfig.direction === 'asc' ? 'text-cyan-400 opacity-100' : ''}`} />
            <ChevronDown className={`w-2.5 h-2.5 ${isActive && sortConfig.direction === 'desc' ? 'text-cyan-400 opacity-100' : ''}`} />
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4 pb-24">
      
      {/* ==============================================================
          MODAL TÁCTICO DE DEEP-DIVE (Drill-Down)
          ============================================================== */}
      <AnimatePresence>
        {selectedLineup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#030712]/80 backdrop-blur-2xl"
              onClick={() => setSelectedLineup(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl bg-[#0a0f18] border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
            >
              {/* Luces volumétricas del modal */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-cyan-500/10 blur-[80px] pointer-events-none" />
              
              <div className="p-8">
                <button onClick={() => setSelectedLineup(null)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center mb-10 text-center mt-4">
                  <div className="mb-6 flex justify-center scale-110">
                    {renderStackedAvatars(selectedLineup.groupId, "xl")}
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tight max-w-[90%] leading-tight">
                    {selectedLineup.groupName.split(' - ').map((n: string) => n.split(' ').pop()).join(' • ')}
                  </h2>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-black text-slate-300 uppercase tracking-widest">{selectedLineup.teamAbbreviation}</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-black text-slate-300 uppercase tracking-widest">{selectedLineup.min.toFixed(0)} MIN JUGADOS</span>
                  </div>
                </div>

                {/* Dashboard Interno */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tarjeta 1: Offense */}
                  <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 text-cyan-400">
                      <Zap className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Offensive Engine</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{selectedLineup.offRtg.toFixed(1)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-5">Offensive Rating</div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-slate-400">True Shooting</span><span className="text-white">{selectedLineup.tsPct.toFixed(1)}%</span></div>
                        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden"><div className="bg-cyan-400 h-full rounded-full" style={{ width: `${Math.min(100, (selectedLineup.tsPct / 70) * 100)}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-slate-400">Pace</span><span className="text-white">{selectedLineup.pace.toFixed(1)}</span></div>
                        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden"><div className="bg-cyan-400 h-full rounded-full" style={{ width: `${Math.min(100, (selectedLineup.pace / 110) * 100)}%` }} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 2: Defense */}
                  <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 text-rose-400">
                      <Shield className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Defensive Anchor</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{selectedLineup.defRtg.toFixed(1)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-5">Defensive Rating</div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-slate-400">Rebound %</span><span className="text-white">{selectedLineup.rebPct.toFixed(1)}%</span></div>
                        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden"><div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(100, (selectedLineup.rebPct / 60) * 100)}%` }} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 3: Overall Impact */}
                  <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-b-4 border-b-emerald-500">
                    <div>
                      <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <Target className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Total Impact</span>
                      </div>
                      <div className={`text-5xl font-black mb-1 tracking-tighter ${selectedLineup.netRtg >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {selectedLineup.netRtg > 0 ? '+' : ''}{selectedLineup.netRtg.toFixed(1)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Net Rating</div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Player Impact Est. (PIE)</span>
                        <span className="text-sm font-black text-white">{selectedLineup.pie.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* 🚀 CABECERA Y FILTROS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
            <Network className="h-10 w-10 text-cyan-400" />
            Lineup Synergy
          </h1>
          <p className="text-slate-400 text-sm font-semibold tracking-wide ml-1">Explore Advanced Metrics for 2, 3, 4 & 5-Man Combinations</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-[#0a0f18]/80 backdrop-blur-2xl p-2.5 rounded-2xl border border-white/[0.06] shadow-xl">
          
          <div className="flex flex-col gap-1.5 ml-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">View</span>
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange} className="gap-1 bg-[#1e293b]/60 p-1 rounded-xl border border-white/5">
              <ToggleGroupItem value="list" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-400 transition-all">
                <ListOrdered className="w-3.5 h-3.5 mr-2" /> Rankings
              </ToggleGroupItem>
              <ToggleGroupItem value="matrix" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-400 transition-all">
                <LayoutGrid className="w-3.5 h-3.5 mr-2" /> Matrix
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="w-px h-10 bg-white/10 hidden sm:block mx-1"></div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Size</span>
            <ToggleGroup type="single" value={groupSize} onValueChange={handleGroupSizeChange} className="gap-1 bg-[#1e293b]/60 p-1 rounded-xl border border-white/5">
              {["2", "3", "4", "5"].map(size => (
                <ToggleGroupItem 
                  key={size} value={size} disabled={viewMode === "matrix" && size !== "2"}
                  className="px-3.5 py-1.5 text-xs font-black uppercase rounded-lg data-[state=on]:bg-white/10 data-[state=on]:text-white disabled:opacity-30 transition-all"
                >
                  {size}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="w-px h-10 bg-white/10 hidden sm:block mx-1"></div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Team</span>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-[190px] bg-[#1e293b]/60 border-white/5 text-white font-black tracking-widest uppercase text-xs h-[38px] rounded-xl">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f18] border-white/10 text-white max-h-[400px]">
                <SelectItem value="0" disabled={viewMode === "matrix"} className="font-black text-cyan-400 uppercase tracking-widest text-xs">🌐 Entire League</SelectItem>
                {teams.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                  <SelectItem key={t.id} value={String(t.id)} className="font-bold uppercase tracking-wider text-xs">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-10 bg-white/10 hidden sm:block mx-1"></div>

          <div className="flex flex-col gap-1.5 mr-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Min Minutes</span>
            <div className="relative flex items-center bg-[#1e293b]/60 border border-white/5 rounded-xl px-3 h-[38px] transition-colors focus-within:border-cyan-500/50">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 mr-2" />
              <Input 
                type="number" value={minMinutes} onChange={(e) => setMinMinutes(e.target.value)}
                className="w-14 h-6 bg-transparent border-none text-white font-mono font-black text-sm px-0 text-center focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 CONTENEDOR PRINCIPAL */}
      <div className="flex flex-col bg-[#0a0f18]/80 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] p-6 lg:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] w-full min-h-[700px] font-sans relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[500px] space-y-6 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div>
              <Loader2 className="h-16 w-16 animate-spin text-cyan-400 relative z-10" />
            </div>
            <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Connecting to NBA Mainframe...</p>
          </div>
        ) : viewMode === "matrix" ? (
          /* ==================== MATRIZ ==================== */
          <>
            <div className="flex justify-end mb-10 relative z-10">
              <div className="flex items-center gap-4 bg-[#1e293b]/60 px-5 py-3 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Rating Map</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-2 rounded-full bg-[#dc2626] shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                  <div className="w-8 h-2 rounded-full bg-[#f87171]"></div>
                  <div className="w-8 h-2 rounded-full bg-[#334155]"></div>
                  <div className="w-8 h-2 rounded-full bg-[#34d399]"></div>
                  <div className="w-8 h-2 rounded-full bg-[#059669] shadow-[0_0_10px_rgba(5,150,105,0.5)]"></div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-10 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="min-w-max px-4">
                <div className="flex">
                  <div className="w-64 shrink-0"></div>
                  {matrixPlayers.map((player) => (
                    <div key={`col-${player.id}`} className="w-[85px] shrink-0 flex flex-col items-center justify-end pb-5 px-1 group">
                      <Avatar className="w-12 h-12 mb-4 border-2 border-[#0a0f18] bg-[#1e293b] shadow-xl group-hover:-translate-y-2 transition-transform duration-300">
                        <AvatarImage src={player.imageUrl} className="object-cover" />
                      </Avatar>
                      <span className="text-[11px] font-black text-slate-400 rotate-[-45deg] origin-bottom-left whitespace-nowrap mb-6 tracking-widest uppercase group-hover:text-white transition-colors">
                        {player.name.split(' ').pop()}
                      </span>
                    </div>
                  ))}
                </div>

                {matrixPlayers.map((rowPlayer) => (
                  <div key={`row-${rowPlayer.id}`} className="flex items-center mb-2 hover:bg-white/[0.02] rounded-l-2xl transition-colors">
                    <div className="w-64 shrink-0 flex items-center justify-end pr-6 py-2 gap-4">
                      <span className="text-sm font-black text-slate-300 truncate text-right tracking-wider uppercase">{rowPlayer.name}</span>
                      <Avatar className="w-12 h-12 border-2 border-[#0a0f18] bg-[#1e293b] shadow-lg">
                        <AvatarImage src={rowPlayer.imageUrl} className="object-cover" />
                      </Avatar>
                    </div>

                    {matrixPlayers.map((colPlayer) => {
                      const isSelf = rowPlayer.id === colPlayer.id;
                      const data = getSynergyData(rowPlayer.id, colPlayer.id);
                      const cellId = `${rowPlayer.id}-${colPlayer.id}`;
                      const isHovered = hoveredCell === cellId;

                      if (isSelf) return <div key={cellId} className="w-[85px] h-14 shrink-0 bg-transparent mx-[2px]"></div>;
                      if (!data) return <div key={cellId} className="w-[85px] h-14 shrink-0 bg-[#1e293b]/30 border border-white/5 rounded-2xl mx-[2px]"></div>;

                      return (
                        <div
                          key={cellId}
                          onClick={() => setSelectedLineup(data)} // 🚀 CLICK PARA ABRIR MODAL
                          onMouseEnter={() => setHoveredCell(cellId)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`relative w-[85px] h-14 shrink-0 rounded-2xl mx-[2px] flex items-center justify-center transition-all duration-300 cursor-pointer ${getNetRatingColor(data.netRtg, data.min)} ${isHovered ? 'scale-125 z-50 shadow-[0_20px_40px_rgba(0,0,0,0.8)]' : 'opacity-90 hover:opacity-100 z-0'}`}
                        >
                          <span className="text-base font-black tracking-tighter drop-shadow-md">
                            {data.netRtg > 0 ? '+' : ''}{data.netRtg.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ==================== RANKINGS INTERACTIVOS ==================== */
          <div className="overflow-x-auto relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-8">
            {sortedAndFilteredLineups.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-32">
                 <Activity className="w-12 h-12 text-slate-700 mb-4" />
                 <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm">No lineups match the current filters.</p>
               </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0a0f18] sticky top-0 z-20 shadow-md">
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 w-12 text-center">#</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Lineup Composition</th>
                    {teamId === "0" && <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Team</th>}
                    
                    {/* 🚀 CABECERAS ORDENABLES */}
                    <SortableHeader label="MIN" sortKey="min" />
                    <SortableHeader label="NET RTG" sortKey="netRtg" />
                    <SortableHeader label="OFF RTG" sortKey="offRtg" />
                    <SortableHeader label="DEF RTG" sortKey="defRtg" />
                    <SortableHeader label="TS%" sortKey="tsPct" />
                    <SortableHeader label="AST%" sortKey="astPct" />
                    <SortableHeader label="REB%" sortKey="rebPct" />
                    <SortableHeader label="PACE" sortKey="pace" />
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredLineups.slice(0, 150).map((l, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedLineup(l)} // 🚀 CLICK EN LA FILA PARA ABRIR MODAL
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    >
                      <td className="py-5 px-4 text-center text-xs font-black text-slate-600 group-hover:text-cyan-500 transition-colors">{idx + 1}</td>
                      <td className="py-5 px-4 flex items-center">
                        {renderStackedAvatars(l.groupId, "lg")}
                        <span className="text-sm font-black text-slate-200 max-w-[300px] lg:max-w-[450px] truncate ml-6 tracking-wide group-hover:text-white transition-colors">
                          {l.groupName.split(' - ').map((n: string) => n.split(' ').pop()).join(' • ')}
                        </span>
                      </td>
                      {teamId === "0" && (
                        <td className="py-5 px-4 text-center">
                          <span className="text-[10px] font-black px-3 py-1.5 bg-[#1e293b] border border-white/10 rounded-lg text-slate-300 uppercase tracking-widest">{l.teamAbbreviation}</span>
                        </td>
                      )}
                      <td className="py-5 px-4 text-center text-sm font-black text-white font-mono bg-white/[0.01]">{l.min.toFixed(0)}</td>
                      <td className={`py-5 px-4 text-center text-base font-black font-mono bg-[#1e293b]/40 border-x border-white/5 ${getNetRatingTextColor(l.netRtg)}`}>
                        {l.netRtg > 0 ? '+' : ''}{l.netRtg.toFixed(1)}
                      </td>
                      <td className="py-5 px-4 text-center text-sm font-bold text-slate-300 font-mono">{l.offRtg.toFixed(1)}</td>
                      <td className="py-5 px-4 text-center text-sm font-bold text-slate-300 font-mono">{l.defRtg.toFixed(1)}</td>
                      <td className="py-5 px-4 text-center text-xs font-bold text-slate-400 font-mono">{l.tsPct.toFixed(1)}%</td>
                      <td className="py-5 px-4 text-center text-xs font-bold text-slate-400 font-mono">{l.astPct.toFixed(1)}%</td>
                      <td className="py-5 px-4 text-center text-xs font-bold text-slate-400 font-mono">{l.rebPct.toFixed(1)}%</td>
                      <td className="py-5 px-4 text-center text-xs font-bold text-slate-500 font-mono">{l.pace.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
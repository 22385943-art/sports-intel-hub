import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { footballService, SOCCER_LEAGUES } from "@/services/sports/footballService";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users } from "lucide-react";
import { motion } from "framer-motion";

// 🚀 PROTECCIÓN CONTRA FOTOS ROTAS
const handleImgError = (e: any, name: string) => {
  if (e.currentTarget.src.includes('ui-avatars')) return;
  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'UNK')}&background=0a0f18&color=10b981&bold=true`;
};

export default function FootballPlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState(SOCCER_LEAGUES[0].id);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);
    footballService.fetchRealPlayers(activeLeague)
      .then((data) => setPlayers(data || []))
      .catch(() => setPlayers([]))
      .finally(() => setIsLoading(false));
  }, [activeLeague]);

  const filteredPlayers = useMemo(() => {
    if (!search) return players;
    return players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [players, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16 max-w-[1600px] mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Users className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Player Scouting</h1>
            <p className="text-slate-400 text-sm font-bold mt-1">Live Statistical Database</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search players..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-10 bg-[#111] border-[#333] text-white focus:border-emerald-500 transition-colors" 
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SOCCER_LEAGUES.map(league => (
          <button 
            key={league.id} onClick={() => setActiveLeague(league.id)}
            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border flex items-center gap-2 ${
              activeLeague === league.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#111] text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <img src={league.logo} className="w-4 h-4 object-contain opacity-80" alt="" />
            {league.name}
          </button>
        ))}
      </div>

      <Card className="bg-[#111] border-[#222] shadow-2xl relative min-h-[400px] overflow-hidden rounded-[2rem]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]/80 backdrop-blur-sm z-10">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Extracting Real Data...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-bold uppercase tracking-widest text-sm">No players found</p>
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-none">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[#222] bg-[#151515]">
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] py-4 pl-6">Player</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Pos</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Club / Nation</TableHead>
                    <TableHead className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] text-center">Goals</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Assists</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">xG Contrib</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#222]">
                  {filteredPlayers.map(p => {
                    const adv = footballService.computeAdvanced(p);
                    return (
                      <TableRow key={p.id} className="hover:bg-[#1a1a1a] transition-all border-[#222] group cursor-pointer">
                        <TableCell className="pl-6 py-3">
                          <Link to={`/football/players/${p.id}`} className="flex items-center gap-4">
                            {/* 🚀 Interceptor en Listado de Jugadores */}
                            <img src={p.imageUrl} alt={p.name} onError={(e) => handleImgError(e, p.name)} className="w-10 h-10 rounded-full object-cover bg-black border border-[#333] group-hover:border-emerald-500/50 transition-colors" />
                            <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{p.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-[#222] text-slate-300 border-[#333] font-mono text-[10px] hover:bg-[#222]">{p.position}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-300">{p.teamName}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.nationality}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-black text-emerald-400 text-lg">{p.stats.goals}</TableCell>
                        <TableCell className="text-center font-mono text-slate-400 font-bold">{p.stats.assists}</TableCell>
                        <TableCell className="text-center font-mono text-blue-400 font-bold">{adv.xgContribution}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
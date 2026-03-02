import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Shield, Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const TEAM_COLORS: Record<string, string> = {
  "ATL": "#E03A3E", "BOS": "#007A33", "BKN": "#FFFFFF", "CHA": "#00788C",
  "CHI": "#CE1141", "CLE": "#860038", "DAL": "#00A3E0",
  "DEN": "#FEC524", "DET": "#C8102E", "GSW": "#1D428A", "HOU": "#CE1141",
  "IND": "#FDBB30", "LAC": "#C8102E", "LAL": "#FDB927", "MEM": "#7399C6",
  "MIA": "#98002E", "MIL": "#00471B", "MIN": "#78BE20",
  "NOP": "#85714D", "NYK": "#F58426", "OKC": "#007AC1", "ORL": "#0077C0",
  "PHI": "#006BB6", "PHX": "#E56020", "POR": "#E03A3E", "SAC": "#5A2D81",
  "SAS": "#C4CED4", "TOR": "#CE1141", "UTA": "#F9A01B", "WAS": "#E31837"
};

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Syncing NBA Standings...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 pb-20">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-none">Teams</h1>
        <p className="text-[#888] text-sm font-medium mt-2">Official standings and real-time metrics</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 max-w-4xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
          <input
            placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-3 pl-10 pr-4 text-white text-sm font-bold placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <Select value={confFilter} onValueChange={setConfFilter}>
            <SelectTrigger className="w-[180px] border-[#2a2a2a] bg-[#1a1a1a] rounded-xl font-bold text-xs uppercase tracking-widest text-white">
              <SelectValue placeholder="CONFERENCE" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value="all">All Conferences</SelectItem>
              <SelectItem value="Eastern">Eastern Conf</SelectItem>
              <SelectItem value="Western">Western Conf</SelectItem>
            </SelectContent>
          </Select>
          <Select value={divFilter} onValueChange={setDivFilter}>
            <SelectTrigger className="w-[180px] border-[#2a2a2a] bg-[#1a1a1a] rounded-xl font-bold text-xs uppercase tracking-widest text-white">
              <SelectValue placeholder="DIVISION" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value="all">All Divisions</SelectItem>
              {availableDivisions.map(div => (
                <SelectItem key={div} value={div}>{div}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ TEAM CARD GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTeams.map((t, i) => {
          const winPct = ((t.wins / (t.wins + t.losses)) * 100).toFixed(1);
          const offRtg = t.offRtg ?? 0;
          const defRtg = t.defRtg ?? 0;
          const netRtg = t.netRtg ?? 0;
          const teamColor = TEAM_COLORS[t.abbreviation] || "#4279f5";

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
            >
              <Link to={`/${sport}/teams/${t.id}`}>
                <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#555] hover:scale-[1.02] transition-all duration-300 group shadow-lg">
                  {/* Team logo watermark */}
                  <div className="absolute right-[-10%] bottom-[-10%] w-40 h-40 opacity-[0.07] pointer-events-none">
                    <img src={nbaService.getTeamLogoUrl(t.abbreviation)} alt="" className="w-full h-full object-contain" />
                  </div>

                  {/* Top accent */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${teamColor}, transparent)` }} />

                  <div className="p-5 relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-[#111] border border-[#333] flex items-center justify-center p-2 group-hover:scale-110 transition-transform shadow-lg">
                        <img src={nbaService.getTeamLogoUrl(t.abbreviation)} alt={t.abbreviation} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{t.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-black text-[#555] uppercase tracking-widest">{t.conference}</span>
                          <span className="text-[#333]">•</span>
                          <span className="text-[9px] font-black text-[#555] uppercase tracking-widest">{t.division}</span>
                        </div>
                      </div>
                    </div>

                    {/* Record */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-mono font-black text-2xl text-white">{t.wins} - {t.losses}</div>
                      <Badge className={`font-mono font-black text-xs border-none px-3 py-1 ${t.wins > t.losses ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {winPct}%
                      </Badge>
                    </div>

                    {/* Ratings row */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#2a2a2a]">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Flame className="w-2.5 h-2.5 text-orange-500" />
                          <span className="text-[8px] font-black text-[#555] uppercase tracking-widest">OFF</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-white">{offRtg.toFixed(1)}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Shield className="w-2.5 h-2.5 text-emerald-500" />
                          <span className="text-[8px] font-black text-[#555] uppercase tracking-widest">DEF</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-white">{defRtg.toFixed(1)}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-2.5 h-2.5 text-cyan-500" />
                          <span className="text-[8px] font-black text-[#555] uppercase tracking-widest">NET</span>
                        </div>
                        <span className={`font-mono font-black text-sm ${netRtg > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netRtg > 0 ? '+' : ''}{netRtg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

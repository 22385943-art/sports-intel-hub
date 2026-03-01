import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { ArrowLeft, Trophy, Flame, Shield, Activity, Loader2, Zap, Target, BarChart3, Gauge, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { NBAPlayer } from "@/data/nba/mockData";

const POSITION_ORDER = ["PG", "SG", "SF", "PF", "C"];

function getPositionForSlot(players: NBAPlayer[], slot: string): NBAPlayer | undefined {
  return players.find(p => p.position === slot) || undefined;
}

function buildStarting5(roster: NBAPlayer[]): NBAPlayer[] {
  const lineup: NBAPlayer[] = [];
  const used = new Set<string>();
  for (const pos of POSITION_ORDER) {
    const candidate = roster.find(p => p.position === pos && !used.has(p.id));
    if (candidate) { lineup.push(candidate); used.add(candidate.id); }
  }
  while (lineup.length < 5 && roster.length > lineup.length) {
    const next = roster.find(p => !used.has(p.id));
    if (next) { lineup.push(next); used.add(next.id); } else break;
  }
  return lineup;
}

export default function NBATeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<NBAPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      Promise.all([
        nbaService.fetchAllOfficialTeams(),
        nbaService.fetchAllOfficialPlayers()
      ]).then(([teams, players]) => {
        const foundTeam = teams.find(t => t.id === id || t.abbreviation === id);
        setTeam(foundTeam || null);
        if (foundTeam) {
          const teamPlayers = players
            .filter(p => p.teamId === foundTeam.abbreviation)
            .sort((a, b) => b.stats.ppg - a.stats.ppg);
          setRoster(teamPlayers);
        }
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Syncing Franchise Intel...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in">
        <p className="text-slate-500 font-medium">Franchise not found.</p>
        <Link to={`/${sport}/teams`} className="text-emerald-400 hover:underline mt-4 font-bold">← Back to Standings</Link>
      </div>
    );
  }

  const winPct = ((team.wins / (team.wins + team.losses)) * 100).toFixed(1);
  const logoUrl = nbaService.getTeamLogoUrl(team.abbreviation);
  const starting5 = buildStarting5(roster);

  const radarData = [
    { subject: "3PT Volume", value: Math.min(100, (team.tsPct || 55) * 1.1), fullMark: 100 },
    { subject: "Paint Scoring", value: Math.min(100, (team.offRtg || 110) * 0.7), fullMark: 100 },
    { subject: "Perimeter D", value: Math.min(100, Math.max(0, 130 - (team.defRtg || 110))), fullMark: 100 },
    { subject: "Rim Protect", value: Math.min(100, Math.max(0, 125 - (team.defRtg || 110)) * 1.2), fullMark: 100 },
    { subject: "Transition", value: Math.min(100, (team.pace || 98) * 0.85), fullMark: 100 },
    { subject: "Ball Movement", value: Math.min(100, (team.astTo || 1.6) * 35), fullMark: 100 },
  ];

  const fourFactors = [
    { label: "True Shooting", value: team.tsPct?.toFixed(1) || "0.0", suffix: "%", icon: <Target className="h-5 w-5 text-cyan-400" />, pct: Math.min(100, (team.tsPct || 0) * 1.5) },
    { label: "Rebound Rate", value: team.rebPct?.toFixed(1) || "50.0", suffix: "%", icon: <BarChart3 className="h-5 w-5 text-orange-400" />, pct: team.rebPct || 50 },
    { label: "AST / TO Ratio", value: team.astTo?.toFixed(2) || "0.00", suffix: "", icon: <Zap className="h-5 w-5 text-amber-400" />, pct: Math.min(100, (team.astTo || 0) * 30) },
    { label: "Pace Factor", value: team.pace?.toFixed(1) || "0.0", suffix: "", icon: <Gauge className="h-5 w-5 text-violet-400" />, pct: Math.min(100, ((team.pace || 95) - 90) * 8) },
  ];

  const isWinning = team.wins > team.losses;

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-700">
      {/* Back */}
      <Link to={`/${sport}/teams`} className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-all uppercase tracking-[0.2em] w-max">
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Standings
      </Link>

      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 p-8 md:p-12">
          {/* Logo + Info */}
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative h-36 w-36 md:h-44 md:w-44 bg-white/[0.04] rounded-full flex items-center justify-center p-7 border border-white/10 shadow-2xl">
                <img src={logoUrl} alt={team.name} className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-black text-[10px] tracking-[0.25em] uppercase">
                <Trophy className="h-3.5 w-3.5" /> Season 2025-26
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">{team.name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3 pt-1">
                <Badge className="bg-white/[0.06] text-slate-300 font-black px-4 py-1.5 text-[10px] tracking-[0.15em] border border-white/[0.08] hover:bg-white/10">{team.conference} Conference</Badge>
                <span className="text-slate-600 font-mono text-xs">{team.abbreviation}</span>
              </div>
            </div>
          </div>

          {/* Record + Badges */}
          <div className="flex flex-col items-center lg:items-end gap-5">
            <div className="text-center lg:text-right">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">Official Record</p>
              <p className="text-6xl md:text-7xl font-black font-mono tracking-tighter text-white leading-none">
                {team.wins}<span className="text-slate-600 mx-2">-</span>{team.losses}
              </p>
            </div>
            <Badge className={`px-5 py-1.5 text-xs font-black tracking-widest border-none shadow-lg ${isWinning ? 'bg-emerald-500/15 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/15 text-rose-400 shadow-rose-500/10'}`}>
              WIN {winPct}%
            </Badge>

            {/* Floating stat badges */}
            <div className="flex gap-3">
              {[
                { label: "OFF RTG", val: team.offRtg?.toFixed(1) || "—", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
                { label: "DEF RTG", val: team.defRtg?.toFixed(1) || "—", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { label: "NET RTG", val: team.netRtg > 0 ? `+${team.netRtg?.toFixed(1)}` : team.netRtg?.toFixed(1) || "—", color: team.netRtg > 0 ? "text-cyan-400" : "text-rose-400", bg: team.netRtg > 0 ? "bg-cyan-500/10 border-cyan-500/20" : "bg-rose-500/10 border-rose-500/20" },
              ].map((b, i) => (
                <div key={i} className={`${b.bg} border rounded-xl px-4 py-2 text-center backdrop-blur-sm`}>
                  <p className={`font-mono font-black text-base ${b.color}`}>{b.val}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ STARTING 5 ═══════════════════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-1">
          <Users className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Starting Lineup</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {starting5.map((player, i) => (
            <Link key={player.id} to={`/${sport}/players/${player.id}`} className="group">
              <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-xl text-center hover:bg-white/[0.05] hover:border-emerald-500/20 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-white/[0.08] bg-white/[0.03] shadow-xl group-hover:border-emerald-500/30 group-hover:scale-105 transition-all duration-500">
                    <AvatarImage src={player.imageUrl} className="object-cover" loading="lazy" />
                    <AvatarFallback className="bg-white/[0.06] text-sm font-bold text-slate-500">{player.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black text-[10px] tracking-widest mb-3 hover:bg-emerald-500/20">
                    {player.position || POSITION_ORDER[i] || "—"}
                  </Badge>
                  <p className="font-bold text-white text-sm leading-tight group-hover:text-emerald-300 transition-colors mt-1">{player.name}</p>
                  <p className="font-mono font-black text-cyan-400 text-xl mt-2">{player.stats.ppg.toFixed(1)}</p>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PPG</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════════════ FOUR FACTORS + RADAR ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Four Factors */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Core Identity</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {fourFactors.map((metric, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">{metric.icon}</div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{metric.label}</p>
                </div>
                <p className="font-mono font-black text-3xl text-white tracking-tight">
                  {metric.value}<span className="text-slate-500 text-lg">{metric.suffix}</span>
                </p>
                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-cyan-500/60 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(5, metric.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Team DNA</h2>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar
                  name="Team"
                  dataKey="value"
                  stroke="#34d399"
                  fill="#34d399"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══════════════════ FULL ROSTER ═══════════════════ */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Full Roster</h2>
          </div>
          <Badge className="bg-white/[0.04] text-emerald-400 border border-emerald-500/20 px-3 py-1 text-[10px] font-black tracking-widest">{roster.length} Players</Badge>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-white/[0.02] border-b border-white/[0.06] text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
            <div className="col-span-5">Athlete</div>
            <div className="col-span-1 text-center">Pos</div>
            <div className="col-span-2 text-center text-cyan-500/80">PPG</div>
            <div className="col-span-1 text-center">RPG</div>
            <div className="col-span-1 text-center">APG</div>
            <div className="col-span-2 text-center">FG%</div>
          </div>
          {/* Rows */}
          {roster.map((p, i) => (
            <Link key={p.id} to={`/${sport}/players/${p.id}`} className="block">
              <div className="grid grid-cols-12 gap-2 items-center px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="col-span-5 flex items-center gap-4">
                  <span className="text-[10px] font-mono font-black text-slate-700 w-5">{i + 1}</span>
                  <Avatar className="h-10 w-10 border border-white/[0.08] bg-white/[0.03] shadow-sm group-hover:scale-110 group-hover:border-emerald-500/30 transition-all duration-300">
                    <AvatarImage src={p.imageUrl} className="object-cover" loading="lazy" />
                    <AvatarFallback className="bg-white/[0.06] text-[10px] font-bold text-slate-500">{p.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">{p.name}</span>
                </div>
                <div className="col-span-1 text-center">
                  <Badge className="bg-white/[0.06] text-slate-400 border-none font-black text-[9px] tracking-wider hover:bg-white/10">{p.position}</Badge>
                </div>
                <div className="col-span-2 text-center font-mono font-black text-cyan-400 text-base">{p.stats.ppg.toFixed(1)}</div>
                <div className="col-span-1 text-center font-mono font-bold text-slate-400">{p.stats.rpg.toFixed(1)}</div>
                <div className="col-span-1 text-center font-mono font-bold text-slate-400">{p.stats.apg.toFixed(1)}</div>
                <div className="col-span-2 text-center font-mono font-bold text-slate-500">{p.stats.fgPct.toFixed(1)}%</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

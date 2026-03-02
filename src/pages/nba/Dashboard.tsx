import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Trophy, TrendingUp, Crown, ShieldAlert, Swords, Target, Zap, Timer, ArrowRight } from "lucide-react";
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

// Mock live scores
const MOCK_LIVE_GAMES = [
  { home: "BOS", away: "LAL", homeScore: 112, awayScore: 105, quarter: "FINAL", status: "final" },
  { home: "DEN", away: "PHX", homeScore: 98, awayScore: 101, quarter: "FINAL", status: "final" },
  { home: "MIL", away: "NYK", homeScore: 88, awayScore: 76, quarter: "Q3 4:22", status: "live" },
  { home: "GSW", away: "DAL", homeScore: 55, awayScore: 62, quarter: "HALFTIME", status: "live" },
  { home: "MIA", away: "CLE", homeScore: 0, awayScore: 0, quarter: "7:30 PM ET", status: "upcoming" },
  { home: "OKC", away: "MIN", homeScore: 0, awayScore: 0, quarter: "9:00 PM ET", status: "upcoming" },
];

export default function NBADashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams()
    ]).then(([playerData, teamData]) => {
      const maxGP = Math.max(...playerData.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);

      const playersWithAdv = playerData.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const meetsMins = (p.stats?.mpg || 0) >= 20;
        const meetsGP = (p.stats?.gp || 0) >= requiredGP;
        return { ...p, adv, qualifiesGeneral: meetsMins && meetsGP };
      });

      setPlayers(playersWithAdv);
      setTeams(teamData);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Command Center...</p>
      </div>
    );
  }

  const getPlayerLeaders = (metric: string) =>
    players.filter(p => p.qualifiesGeneral).sort((a, b) => b.adv[metric] - a.adv[metric]).slice(0, 5);

  const bpmLeaders = getPlayerLeaders("bpm");
  const perLeaders = getPlayerLeaders("per");
  const vorpLeaders = getPlayerLeaders("vorp");

  const netRatingTeams = [...teams].sort((a, b) => b.netRtg - a.netRtg).slice(0, 5);
  const offRatingTeams = [...teams].sort((a, b) => b.offRtg - a.offRtg).slice(0, 5);
  const defRatingTeams = [...teams].sort((a, b) => a.defRtg - b.defRtg).slice(0, 5);

  const topScorer = bpmLeaders[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-20"
    >
      {/* ═══ HERO BANNER ═══ */}
      <div className="relative bg-[#1a1a1a] rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-transparent to-emerald-500/10 pointer-events-none" />
        <div className="absolute -right-40 -top-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 bg-cyan-500 pointer-events-none" />

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-black tracking-widest uppercase px-4 py-1.5">
              Live Season 2025-26
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-none">
              League <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Command Center</span>
            </h1>
            <p className="text-[#888] text-sm font-medium max-w-xl">
              Real-time individual and collective metrics. Monitoring the MVP race and Team Power Rankings across the association.
            </p>
          </div>

          {topScorer && (
            <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 flex items-center gap-5 shadow-xl shrink-0">
              <div className="absolute -top-3 -right-3">
                <span className="relative flex h-8 w-8">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                  <span className="relative inline-flex rounded-full h-8 w-8 bg-emerald-500 items-center justify-center border border-emerald-300">
                    <Crown className="h-4 w-4 text-black" />
                  </span>
                </span>
              </div>
              <Avatar className="h-20 w-20 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <AvatarImage src={topScorer.imageUrl} className="object-cover" />
              </Avatar>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">MVP Algorithm Leader</p>
                <h3 className="text-xl font-black text-white leading-tight">{topScorer.name}</h3>
                <p className="text-xs text-[#888] font-bold uppercase tracking-widest mt-1">{topScorer.teamId} · {topScorer.adv.bpm.toFixed(1)} BPM</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ LIVE SCORES TICKER ═══ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Timer className="h-4 w-4 text-rose-500" />
          <h2 className="text-xs font-black text-[#888] uppercase tracking-[0.2em]">Scoreboard</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {MOCK_LIVE_GAMES.map((g, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 w-[200px] hover:border-[#444] transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[9px] font-black uppercase tracking-widest ${g.status === "live" ? "text-rose-400" : g.status === "final" ? "text-[#666]" : "text-cyan-400"}`}>
                  {g.status === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse" />}
                  {g.quarter}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={nbaService.getTeamLogoUrl(g.away)} alt={g.away} className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-white">{g.away}</span>
                  </div>
                  <span className={`font-mono font-black text-sm ${g.status !== "upcoming" ? "text-white" : "text-[#555]"}`}>{g.status !== "upcoming" ? g.awayScore : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={nbaService.getTeamLogoUrl(g.home)} alt={g.home} className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-white">{g.home}</span>
                  </div>
                  <span className={`font-mono font-black text-sm ${g.status !== "upcoming" ? "text-white" : "text-[#555]"}`}>{g.status !== "upcoming" ? g.homeScore : "-"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══ TOP PERFORMERS GRID ═══ */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white uppercase tracking-tight px-1">Player Dominance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <LeaderCard title="MVP Tracker (BPM)" icon={Activity} accent="#10b981" data={bpmLeaders} metricId="bpm" />
          <LeaderCard title="Efficiency Kings (PER)" icon={Trophy} accent="#3b82f6" data={perLeaders} metricId="per" />
          <LeaderCard title="Total Impact (VORP)" icon={TrendingUp} accent="#f59e0b" data={vorpLeaders} metricId="vorp" />
        </div>
      </div>

      {/* ═══ TEAM POWER RANKINGS ═══ */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-black text-white uppercase tracking-tight px-1">Team Power Rankings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <TeamLeaderCard title="Overall Power (Net Rtg)" icon={Target} accent="#818cf8" data={netRatingTeams} metricId="netRtg" />
          <TeamLeaderCard title="Offensive Juggernauts" icon={Swords} accent="#f43f5e" data={offRatingTeams} metricId="offRtg" />
          <TeamLeaderCard title="Defensive Fortresses" icon={ShieldAlert} accent="#22d3ee" data={defRatingTeams} metricId="defRtg" />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ PLAYER LEADER CARD ═══════════════════ */
function LeaderCard({ title, icon: Icon, accent, data, metricId }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl hover:border-[#444] transition-all group"
    >
      <div className="border-b border-[#2a2a2a] p-4 flex items-center gap-2.5">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#888] group-hover:text-white transition-colors">{title}</span>
      </div>
      <div>
        {data.map((p: any, i: number) => (
          <Link key={p.id} to={`/nba/players/${p.id}`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f1f] hover:bg-[#222] transition-colors group/row">
              <div className="flex items-center gap-4">
                <span className="font-mono font-black text-[#444] text-xs w-3">{i + 1}</span>
                <Avatar className="h-10 w-10 border border-[#333] shadow-md">
                  <AvatarImage src={p.imageUrl} className="object-cover" />
                  <AvatarFallback className="bg-[#222] text-[10px] text-[#888]">{p.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-bold text-white group-hover/row:text-cyan-400 transition-colors">{p.name}</span>
                  <div className="text-[9px] font-black text-[#555] uppercase tracking-widest">{p.teamId}</div>
                </div>
              </div>
              <span className="font-mono font-black text-base" style={{ color: accent }}>{p.adv[metricId].toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════ TEAM LEADER CARD ═══════════════════ */
function TeamLeaderCard({ title, icon: Icon, accent, data, metricId }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl hover:border-[#444] transition-all group"
    >
      <div className="border-b border-[#2a2a2a] p-4 flex items-center gap-2.5">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#888] group-hover:text-white transition-colors">{title}</span>
      </div>
      <div>
        {data.map((t: any, i: number) => (
          <Link key={t.id} to={`/nba/teams/${t.id}`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f1f] hover:bg-[#222] transition-colors group/row">
              <div className="flex items-center gap-4">
                <span className="font-mono font-black text-[#444] text-xs w-3">{i + 1}</span>
                <Avatar className="h-10 w-10 border border-[#333] bg-[#222] shadow-md p-1">
                  <AvatarImage src={nbaService.getTeamLogoUrl(t.abbreviation)} className="object-contain" />
                  <AvatarFallback className="bg-[#222] text-[10px]">{t.abbreviation}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-bold text-white group-hover/row:text-cyan-400 transition-colors">{t.name}</span>
                  <div className="text-[9px] font-black text-[#555] uppercase tracking-widest">{t.wins}W - {t.losses}L</div>
                </div>
              </div>
              <span className="font-mono font-black text-base" style={{ color: accent }}>
                {metricId === 'netRtg' && t[metricId] > 0 ? '+' : ''}{t[metricId].toFixed(1)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

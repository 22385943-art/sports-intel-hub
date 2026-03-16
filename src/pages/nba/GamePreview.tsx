import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, ChevronLeft, Target, Shield, Activity, TrendingUp, Zap, MapPin, Brain, Swords } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const CompareBar = ({ label, v1, v2, icon: Icon, inverse = false }: any) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  let p1Wins = v1 > v2;
  if (inverse) p1Wins = v1 < v2;

  return (
    <div className="py-4 border-b border-white/[0.03] last:border-0 group/bar hover:bg-white/[0.015] transition-all duration-300 px-3 rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={`text-xl font-mono font-black tracking-tighter ${p1Wins ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'text-muted-foreground/30'}`}
        >
          {v1.toFixed(1)}
        </motion.span>
        <div className="flex items-center gap-2 text-muted-foreground group-hover/bar:text-foreground/50 transition-colors duration-300">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[9px] font-extrabold uppercase tracking-[0.25em]">{label}</span>
        </div>
        <motion.span
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={`text-xl font-mono font-black tracking-tighter ${!p1Wins && v1 !== v2 ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]' : 'text-muted-foreground/30'}`}
        >
          {v2.toFixed(1)}
        </motion.span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.03] gap-px">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${p1Pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-l-full"
          style={{
            background: p1Wins
              ? 'linear-gradient(90deg, rgba(34,211,238,0.08), rgba(34,211,238,0.7))'
              : 'linear-gradient(90deg, rgba(100,116,139,0.05), rgba(100,116,139,0.15))',
            boxShadow: p1Wins ? '0 0 25px rgba(34,211,238,0.3), inset 0 1px 1px rgba(255,255,255,0.15)' : 'none',
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${p2Pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-r-full"
          style={{
            background: !p1Wins && v1 !== v2
              ? 'linear-gradient(-90deg, rgba(244,63,94,0.08), rgba(244,63,94,0.7))'
              : 'linear-gradient(-90deg, rgba(100,116,139,0.05), rgba(100,116,139,0.15))',
            boxShadow: !p1Wins && v1 !== v2 ? '0 0 25px rgba(244,63,94,0.3), inset 0 1px 1px rgba(255,255,255,0.15)' : 'none',
          }}
        />
      </div>
    </div>
  );
};

export default function GamePreview() {
  const { id } = useParams();
  const location = useLocation();
  const game = location.state?.game;

  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [leaders, setLeaders] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!game) return;
    window.scrollTo(0, 0);

    Promise.all([
      nbaService.fetchAllOfficialTeams(),
      nbaService.fetchAllOfficialPlayers()
    ]).then(([teams, players]) => {
      const away = teams.find(t => t.id === String(game.awayId) || t.abbreviation === game.away);
      const home = teams.find(t => t.id === String(game.homeId) || t.abbreviation === game.home);
      
      const awayRoster = players.filter(p => p.teamId === away?.abbreviation);
      const homeRoster = players.filter(p => p.teamId === home?.abbreviation);

      const getLeader = (roster: any[], stat: string) => [...roster].sort((a,b) => b.stats[stat] - a.stats[stat])[0] || null;

      setLeaders({
        away: {
          pts: getLeader(awayRoster, 'ppg'), reb: getLeader(awayRoster, 'rpg'),
          ast: getLeader(awayRoster, 'apg'), stl: getLeader(awayRoster, 'spg'), blk: getLeader(awayRoster, 'bpg')
        },
        home: {
          pts: getLeader(homeRoster, 'ppg'), reb: getLeader(homeRoster, 'rpg'),
          ast: getLeader(homeRoster, 'apg'), stl: getLeader(homeRoster, 'spg'), blk: getLeader(homeRoster, 'bpg')
        }
      });

      setAwayTeam(away);
      setHomeTeam(home);
      setIsLoading(false);
    });
  }, [game]);

  const prediction = useMemo(() => {
    if (!homeTeam || !awayTeam) return null;
    return nbaService.calculateAdvancedWinProbability(awayTeam, homeTeam);
  }, [homeTeam, awayTeam]);

  if (!game) return <Navigate to="/nba/schedule" replace />;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-mono font-bold text-[10px] uppercase tracking-[0.3em]">Generating Matchup Intelligence...</p>
    </div>
  );

  const renderLeaderRow = (title: string, statKey: string, awayL: any, homeL: any) => (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.03] group hover:bg-white/[0.015] transition-all duration-300 rounded-xl px-3 last:border-0">
      <Link to={`/nba/players/${awayL?.id}`} className="flex items-center gap-3 w-[40%] group/link">
        <Avatar className="h-11 w-11 border-2 border-white/[0.08] bg-card shadow-lg ring-1 ring-white/[0.03]">
          <AvatarImage src={awayL?.imageUrl} className="object-cover" />
          <AvatarFallback className="bg-card text-[10px] font-mono font-bold text-muted-foreground">{awayL?.name?.substring(0,2)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-xs truncate group-hover/link:text-cyan-400 transition-colors duration-300">{awayL?.name || "Unknown"}</span>
          <span className="text-sm font-mono font-black text-muted-foreground">{awayL?.stats[statKey]?.toFixed(1) || "0.0"} <span className="text-[8px] font-sans text-muted-foreground/50">AVG</span></span>
        </div>
      </Link>
      
      <div className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/40 w-[20%] text-center">{title}</div>
      
      <Link to={`/nba/players/${homeL?.id}`} className="flex items-center justify-end gap-3 w-[40%] text-right group/link">
        <div className="flex flex-col items-end">
          <span className="font-bold text-foreground text-xs truncate group-hover/link:text-rose-400 transition-colors duration-300">{homeL?.name || "Unknown"}</span>
          <span className="text-sm font-mono font-black text-muted-foreground">{homeL?.stats[statKey]?.toFixed(1) || "0.0"} <span className="text-[8px] font-sans text-muted-foreground/50">AVG</span></span>
        </div>
        <Avatar className="h-11 w-11 border-2 border-white/[0.08] bg-card shadow-lg ring-1 ring-white/[0.03]">
          <AvatarImage src={homeL?.imageUrl} className="object-cover" />
          <AvatarFallback className="bg-card text-[10px] font-mono font-bold text-muted-foreground">{homeL?.name?.substring(0,2)}</AvatarFallback>
        </Avatar>
      </Link>
    </div>
  );

  const arenaDisplay = game.arena !== "TBD" ? game.arena : `${homeTeam?.name || "Home"} Arena`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-16 max-w-5xl mx-auto px-4"
    >
      <Link to="/nba/schedule" className="group inline-flex items-center gap-2 text-[10px] font-extrabold text-muted-foreground hover:text-primary transition-colors duration-300 uppercase tracking-[0.25em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform duration-300" /> Back to Schedule
      </Link>

      {/* ═══ JUMBO SCOREBOARD ═══ */}
      <div className="relative bg-white/[0.02] backdrop-blur-2xl rounded-[2.5rem] border border-white/[0.05] p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col items-center mt-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
        {/* Ambient glows */}
        <div className="absolute -left-32 -top-32 w-[400px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute -right-32 -top-32 w-[400px] h-[400px] bg-rose-500/[0.05] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
          <Swords className="w-[800px] h-[800px]" />
        </div>
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
        
        <span className="px-6 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-[0.3em] mb-10 bg-white/[0.03] text-muted-foreground border border-white/[0.06] relative z-10 backdrop-blur-sm font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          {game.quarter}
        </span>

        <div className="flex items-center justify-between w-full max-w-4xl relative z-10">
          {/* AWAY */}
          <Link to={`/nba/teams/${awayTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/[0.08] rounded-full blur-3xl scale-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} alt={game.away} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.06)] group-hover:scale-110 transition-transform duration-500 relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground group-hover:text-cyan-400 transition-colors duration-300">{game.away}</h2>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">{awayTeam?.wins}W — {awayTeam?.losses}L</p>
            </div>
          </Link>

          {/* CENTER: WIN PROBABILITY */}
          <div className="flex flex-col items-center justify-center shrink-0 px-4 md:px-8">
            <p className="text-[8px] font-extrabold text-muted-foreground/50 uppercase tracking-[0.35em] mb-5 font-mono">Win Probability</p>
            <div className="flex items-center gap-4 md:gap-6">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`text-4xl md:text-6xl font-mono font-black tracking-tighter ${Number(prediction?.awayProb) > 50 ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]' : 'text-muted-foreground/25'}`}
              >
                {prediction?.awayProb}%
              </motion.span>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-px h-5 bg-gradient-to-b from-cyan-500/20 to-transparent" />
                <span className="text-muted-foreground/20 font-black italic text-sm tracking-wider">VS</span>
                <div className="w-px h-5 bg-gradient-to-t from-rose-500/20 to-transparent" />
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`text-4xl md:text-6xl font-mono font-black tracking-tighter ${Number(prediction?.homeProb) > 50 ? 'text-rose-400 drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]' : 'text-muted-foreground/25'}`}
              >
                {prediction?.homeProb}%
              </motion.span>
            </div>
          </div>

          {/* HOME */}
          <Link to={`/nba/teams/${homeTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/[0.08] rounded-full blur-3xl scale-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} alt={game.home} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.06)] group-hover:scale-110 transition-transform duration-500 relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground group-hover:text-rose-400 transition-colors duration-300">{game.home}</h2>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">{homeTeam?.wins}W — {homeTeam?.losses}L</p>
            </div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center relative z-10"
        >
          <p className="text-sm font-bold text-foreground/70 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]" /> {arenaDisplay}
          </p>
          {game.city && <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/40 mt-1 font-mono">{game.city}</p>}
        </motion.div>
      </div>

      {/* AI VERDICT */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-white/[0.02] backdrop-blur-2xl border border-blue-500/[0.1] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
      >
        <div className="absolute -right-10 -top-10 text-blue-500/[0.03] rotate-12 pointer-events-none">
          <Brain className="w-48 h-48" />
        </div>
        <div className="absolute -top-20 left-1/4 w-60 h-60 bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-transparent" />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="p-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <Brain className="h-4 w-4 text-blue-400 animate-pulse" />
          </div>
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Neural Scouting Verdict</h3>
        </div>
        <p className="text-foreground/65 font-medium text-sm md:text-base leading-relaxed max-w-4xl relative z-10">
          {prediction?.verdict}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SEASON LEADERS */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] border border-white/[0.05] p-8 shadow-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
        >
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-muted-foreground mb-6 text-center">Season Leaders</h3>
          <div className="flex justify-between items-center mb-4 px-3">
            <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} className="h-5 w-5 opacity-20" />
            <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} className="h-5 w-5 opacity-20" />
          </div>
          <div className="flex flex-col">
            {renderLeaderRow("Points", "ppg", leaders.away.pts, leaders.home.pts)}
            {renderLeaderRow("Rebounds", "rpg", leaders.away.reb, leaders.home.reb)}
            {renderLeaderRow("Assists", "apg", leaders.away.ast, leaders.home.ast)}
            {renderLeaderRow("Steals", "spg", leaders.away.stl, leaders.home.stl)}
            {renderLeaderRow("Blocks", "bpg", leaders.away.blk, leaders.home.blk)}
          </div>
        </motion.div>

        {/* TALE OF THE TAPE */}
        {awayTeam && homeTeam && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] border border-white/[0.05] p-8 shadow-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
          >
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-muted-foreground mb-6 text-center">Tale of the Tape</h3>
            <div className="flex flex-col">
              <CompareBar label="Offensive Rating" v1={awayTeam.offRtg} v2={homeTeam.offRtg} icon={Target} />
              <CompareBar label="Defensive Rating" v1={awayTeam.defRtg} v2={homeTeam.defRtg} icon={Shield} inverse={true} />
              <CompareBar label="Net Rating" v1={awayTeam.netRtg} v2={homeTeam.netRtg} icon={TrendingUp} />
              <CompareBar label="True Shooting %" v1={awayTeam.tsPct} v2={homeTeam.tsPct} icon={Target} />
              <CompareBar label="Pace" v1={awayTeam.pace} v2={homeTeam.pace} icon={Activity} />
              <CompareBar label="Rebound Pct %" v1={awayTeam.rebPct} v2={homeTeam.rebPct} icon={Shield} />
              <CompareBar label="AST to TO Ratio" v1={awayTeam.astTo} v2={homeTeam.astTo} icon={Zap} />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

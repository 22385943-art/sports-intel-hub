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
    <div className="py-4 border-b border-white/[0.03] last:border-0 group/bar hover:bg-white/[0.01] transition-all duration-300 px-2 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xl font-mono font-black tracking-tighter ${p1Wins ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'text-slate-700'}`}>
          {v1.toFixed(1)}
        </span>
        <div className="flex items-center gap-2 text-slate-600 group-hover/bar:text-slate-400 transition-colors duration-300">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">{label}</span>
        </div>
        <span className={`text-xl font-mono font-black tracking-tighter ${!p1Wins && v1 !== v2 ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]' : 'text-slate-700'}`}>
          {v2.toFixed(1)}
        </span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-black/50 gap-px shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${p1Pct}%` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className={`h-full rounded-l-full ${p1Wins
            ? 'bg-gradient-to-r from-cyan-600/80 to-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
            : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50'}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${p2Pct}%` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className={`h-full rounded-r-full ${!p1Wins && v1 !== v2
            ? 'bg-gradient-to-l from-rose-600/80 to-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : 'bg-gradient-to-l from-slate-800/50 to-slate-700/50'}`}
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
      <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">Generating Matchup Intelligence...</p>
    </div>
  );

  const renderLeaderRow = (title: string, statKey: string, awayL: any, homeL: any) => (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.03] group hover:bg-white/[0.02] transition-all duration-300 rounded-xl px-3">
      <Link to={`/nba/players/${awayL?.id}`} className="flex items-center gap-3 w-[40%] group/link">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-lg scale-150 opacity-0 group-hover/link:opacity-100 transition-opacity duration-500" />
          <Avatar className="h-11 w-11 border-2 border-white/[0.06] bg-[#030712] shadow-lg relative z-10">
            <AvatarImage src={awayL?.imageUrl} className="object-cover" />
            <AvatarFallback className="bg-slate-900 text-[10px] font-bold text-slate-600">{awayL?.name?.substring(0,2)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-xs truncate group-hover/link:text-cyan-400 transition-colors duration-300">{awayL?.name || "Unknown"}</span>
          <span className="text-sm font-mono font-black text-slate-500 tracking-tighter">{awayL?.stats[statKey]?.toFixed(1) || "0.0"} <span className="text-[7px] font-sans text-slate-700 tracking-[0.2em]">AVG</span></span>
        </div>
      </Link>
      
      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700 w-[20%] text-center">{title}</div>
      
      <Link to={`/nba/players/${homeL?.id}`} className="flex items-center justify-end gap-3 w-[40%] text-right group/link">
        <div className="flex flex-col items-end">
          <span className="font-bold text-white text-xs truncate group-hover/link:text-rose-400 transition-colors duration-300">{homeL?.name || "Unknown"}</span>
          <span className="text-sm font-mono font-black text-slate-500 tracking-tighter">{homeL?.stats[statKey]?.toFixed(1) || "0.0"} <span className="text-[7px] font-sans text-slate-700 tracking-[0.2em]">AVG</span></span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-lg scale-150 opacity-0 group-hover/link:opacity-100 transition-opacity duration-500" />
          <Avatar className="h-11 w-11 border-2 border-white/[0.06] bg-[#030712] shadow-lg relative z-10">
            <AvatarImage src={homeL?.imageUrl} className="object-cover" />
            <AvatarFallback className="bg-slate-900 text-[10px] font-bold text-slate-600">{homeL?.name?.substring(0,2)}</AvatarFallback>
          </Avatar>
        </div>
      </Link>
    </div>
  );

  const arenaDisplay = game.arena !== "TBD" ? game.arena : `${homeTeam?.name || "Home"} Arena`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 pb-16 max-w-5xl mx-auto px-4"
    >
      <Link to="/nba/schedule" className="group inline-flex items-center gap-2 text-[9px] font-black text-slate-600 hover:text-cyan-400 transition-colors duration-300 uppercase tracking-[0.25em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Schedule
      </Link>

      {/* SCOREBOARD + WIN PROBABILITY */}
      <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] border border-white/[0.05] p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden flex flex-col items-center mt-4">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
          <Swords className="w-[800px] h-[800px]" />
        </div>
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
        
        <span className="px-5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] mb-10 bg-white/[0.03] text-slate-500 border border-white/[0.05] relative z-10 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          {game.quarter}
        </span>

        <div className="flex items-center justify-between w-full max-w-4xl relative z-10">
          {/* AWAY */}
          <Link to={`/nba/teams/${awayTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-3xl scale-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} alt={game.away} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.06)] group-hover:scale-110 transition-transform duration-500 relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white group-hover:text-cyan-400 transition-colors duration-300 tracking-tight">{game.away}</h2>
              <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">{awayTeam?.wins}W — {awayTeam?.losses}L</p>
            </div>
          </Link>

          {/* WIN PROBABILITY */}
          <div className="flex flex-col items-center justify-center shrink-0 px-4 md:px-8">
            <p className="text-[7px] font-black text-slate-700 uppercase tracking-[0.4em] mb-5">Win Probability</p>
            <div className="flex items-center gap-4 md:gap-6">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`text-3xl md:text-5xl font-mono font-black tracking-tighter ${Number(prediction?.awayProb) > 50 ? 'text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]' : 'text-slate-700'}`}
              >
                {prediction?.awayProb}%
              </motion.span>
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-4 bg-white/[0.06]" />
                <span className="text-slate-700 font-black italic text-sm tracking-wider">VS</span>
                <div className="w-px h-4 bg-white/[0.06]" />
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`text-3xl md:text-5xl font-mono font-black tracking-tighter ${Number(prediction?.homeProb) > 50 ? 'text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.5)]' : 'text-slate-700'}`}
              >
                {prediction?.homeProb}%
              </motion.span>
            </div>
          </div>

          {/* HOME */}
          <Link to={`/nba/teams/${homeTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-3xl scale-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} alt={game.home} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.06)] group-hover:scale-110 transition-transform duration-500 relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white group-hover:text-rose-400 transition-colors duration-300 tracking-tight">{game.home}</h2>
              <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">{homeTeam?.wins}W — {homeTeam?.losses}L</p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center relative z-10">
          <p className="text-sm font-bold text-white/70 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" /> {arenaDisplay}
          </p>
          {game.city && <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700 mt-1">{game.city}</p>}
        </div>
      </div>

      {/* AI VERDICT */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-white/[0.02] backdrop-blur-3xl border border-indigo-500/[0.08] rounded-[2rem] p-8 shadow-[0_0_60px_rgba(99,102,241,0.04),inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 text-indigo-500/[0.04] rotate-12 pointer-events-none">
          <Brain className="w-48 h-48" />
        </div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent" />
        <div className="absolute -left-20 -top-20 w-60 h-60 bg-indigo-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="p-2.5 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <Brain className="h-4 w-4 text-indigo-400 animate-pulse drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Neural Scouting Verdict</h3>
        </div>
        <p className="text-slate-300/80 font-medium text-sm md:text-base leading-relaxed max-w-4xl relative z-10">
          {prediction?.verdict}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SEASON LEADERS */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] border border-white/[0.05] p-8 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]"
        >
          <h3 className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 mb-6 text-center">Season Leaders</h3>
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
            className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] border border-white/[0.05] p-8 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]"
          >
            <h3 className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 mb-6 text-center">Tale of the Tape</h3>
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
import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, ChevronLeft, Target, Shield, Activity, TrendingUp, Zap, MapPin, Brain, Swords } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const CompareBar = ({ label, v1, v2, icon: Icon, inverse = false }: any) => {
  const total = v1 + v2 || 1;
  const p1Pct = (v1 / total) * 100;
  const p2Pct = (v2 / total) * 100;
  let p1Wins = v1 > v2;
  if (inverse) p1Wins = v1 < v2; 

  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-lg font-mono font-black ${p1Wins ? 'text-cyan-400' : 'text-slate-500'}`}>{v1.toFixed(1)}</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <span className={`text-lg font-mono font-black ${!p1Wins && v1 !== v2 ? 'text-rose-400' : 'text-slate-500'}`}>{v2.toFixed(1)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
        <div className={`h-full transition-all duration-1000 ease-out ${p1Wins ? 'bg-cyan-500' : 'bg-slate-700'}`} style={{ width: `${p1Pct}%` }} />
        <div className={`h-full transition-all duration-1000 ease-out ${!p1Wins && v1 !== v2 ? 'bg-rose-500' : 'bg-slate-700'}`} style={{ width: `${p2Pct}%` }} />
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

      const getLeader = (roster: any[], stat: string) => [...roster].sort((a,b) => b.stats[stat] - a.stats[stat])[0];

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

  // 🚀 EL ORÁCULO PREDICTIVO (Motor de Probabilidad)
  const prediction = useMemo(() => {
    if (!homeTeam || !awayTeam) return null;

    // 1. Ajuste de Net Rating con Ventaja de Campo (+3.0 pts para el local)
    const homeCourtAdvantage = 3.0;
    const adjustedHomeNet = homeTeam.netRtg + homeCourtAdvantage;
    const adjustedAwayNet = awayTeam.netRtg;
    
    // 2. Diferencial matemático
    const netDiff = adjustedHomeNet - adjustedAwayNet;
    
    // 3. Fórmula de Probabilidad de Victoria
    let homeWinProb = 50 + (netDiff * 2.8);
    homeWinProb = Math.max(12, Math.min(88, homeWinProb)); // Cap realista 12%-88%
    const awayWinProb = 100 - homeWinProb;

    const favorite = homeWinProb > 50 ? homeTeam : awayTeam;
    const underdog = homeWinProb > 50 ? awayTeam : homeTeam;
    const conf = Math.abs(homeWinProb - 50);

    // 4. Generador de Veredicto Analítico Automático
    let verdict = "";
    if (conf > 20) {
      verdict = `Clear advantage for the ${favorite.name}. Their robust statistical profile outclasses the ${underdog.name} on almost every front. `;
    } else if (conf > 8) {
      verdict = `The ${favorite.name} enter as moderate favorites, largely aided by their specific matchup advantages. `;
    } else {
      verdict = `This is a pure statistical toss-up. The ${favorite.name} hold a razor-thin mathematical edge, but this game will be decided in the clutch. `;
    }

    if (favorite.offRtg - underdog.offRtg > 5) verdict += `Expect ${favorite.abbreviation}'s elite offense to exploit the opposing defense heavily. `;
    if (underdog.rebPct > favorite.rebPct + 3) verdict += `However, ${underdog.abbreviation} could steal this game if they completely dominate the rebounding battle.`;

    return {
      homeProb: homeWinProb.toFixed(1), 
      awayProb: awayWinProb.toFixed(1),
      verdict
    };
  }, [homeTeam, awayTeam]);

  if (!game) return <Navigate to="/nba/schedule" replace />;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Generating Matchup Intelligence...</p>
    </div>
  );

  const renderLeaderRow = (title: string, statKey: string, awayL: any, homeL: any) => (
    <div className="flex items-center justify-between py-4 border-b border-white/5 group hover:bg-white/[0.02] transition-colors rounded-xl px-2">
      <Link to={`/nba/players/${awayL?.id}`} className="flex items-center gap-3 w-[40%]">
        <Avatar className="h-10 w-10 border border-[#333] bg-[#111]">
          <AvatarImage src={awayL?.imageUrl} className="object-cover" />
        </Avatar>
        <div className="flex flex-col">
          <span className="font-bold text-white text-xs truncate group-hover:text-cyan-400 transition-colors">{awayL?.name}</span>
          <span className="text-xs font-mono font-black text-slate-400">{awayL?.stats[statKey].toFixed(1)} <span className="text-[9px] font-sans">AVG</span></span>
        </div>
      </Link>
      
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 w-[20%] text-center">{title}</div>
      
      <Link to={`/nba/players/${homeL?.id}`} className="flex items-center justify-end gap-3 w-[40%] text-right">
        <div className="flex flex-col">
          <span className="font-bold text-white text-xs truncate group-hover:text-rose-400 transition-colors">{homeL?.name}</span>
          <span className="text-xs font-mono font-black text-slate-400">{homeL?.stats[statKey].toFixed(1)} <span className="text-[9px] font-sans">AVG</span></span>
        </div>
        <Avatar className="h-10 w-10 border border-[#333] bg-[#111]">
          <AvatarImage src={homeL?.imageUrl} className="object-cover" />
        </Avatar>
      </Link>
    </div>
  );

  const arenaDisplay = game.arena !== "TBD" ? game.arena : `${homeTeam?.name || "Home"} Arena`;

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-5xl mx-auto px-4">
      <Link to="/nba/schedule" className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Schedule
      </Link>

      {/* ═══ SCOREBOARD CON PROBABILIDADES DE IA ═══ */}
      <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center mt-4">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Swords className="w-[800px] h-[800px]" />
        </div>
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500" />
        
        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-10 bg-white/5 text-slate-400 border border-white/5 relative z-10">
          {game.quarter}
        </span>

        <div className="flex items-center justify-between w-full max-w-4xl relative z-10">
          {/* AWAY */}
          <Link to={`/nba/teams/${awayTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} alt={game.away} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">{game.away}</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{awayTeam?.wins}W - {awayTeam?.losses}L</p>
            </div>
          </Link>

          {/* CENTRO: ORÁCULO DE WIN PROBABILITY */}
          <div className="flex flex-col items-center justify-center shrink-0 px-4 md:px-8">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Algorithm Win Prob.</p>
            <div className="flex items-center gap-4 md:gap-6">
              <span className={`text-3xl md:text-5xl font-mono font-black ${Number(prediction?.awayProb) > 50 ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-600'}`}>
                {prediction?.awayProb}%
              </span>
              <span className="text-slate-700 font-black italic text-lg">VS</span>
              <span className={`text-3xl md:text-5xl font-mono font-black ${Number(prediction?.homeProb) > 50 ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-600'}`}>
                {prediction?.homeProb}%
              </span>
            </div>
          </div>

          {/* HOME */}
          <Link to={`/nba/teams/${homeTeam?.abbreviation}`} className="flex flex-col items-center text-center gap-4 flex-1 group">
            <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} alt={game.home} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white group-hover:text-rose-400 transition-colors">{game.home}</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{homeTeam?.wins}W - {homeTeam?.losses}L</p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center relative z-10">
          <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" /> {arenaDisplay}
          </p>
          {game.city && <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-1">{game.city}</p>}
        </div>
      </div>

      {/* 🚀 VEREDICTO DE IA */}
      <div className="bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-blue-500/10 rotate-12 pointer-events-none">
          <Brain className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <Brain className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-black uppercase tracking-widest text-white italic">Quantum Oracle Verdict</h3>
        </div>
        <p className="text-slate-300 font-medium text-sm md:text-base leading-relaxed max-w-4xl relative z-10">
          {prediction?.verdict}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SEASON LEADERS */}
        <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 text-center">Season Leaders</h3>
          <div className="flex justify-between items-center mb-4 px-2">
            <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} className="h-6 w-6 opacity-50" />
            <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} className="h-6 w-6 opacity-50" />
          </div>
          <div className="flex flex-col gap-2">
            {renderLeaderRow("Points", "ppg", leaders.away.pts, leaders.home.pts)}
            {renderLeaderRow("Rebounds", "rpg", leaders.away.reb, leaders.home.reb)}
            {renderLeaderRow("Assists", "apg", leaders.away.ast, leaders.home.ast)}
            {renderLeaderRow("Steals", "spg", leaders.away.stl, leaders.home.stl)}
            {renderLeaderRow("Blocks", "bpg", leaders.away.blk, leaders.home.blk)}
          </div>
        </div>

        {/* METRICS MATCHUP */}
        {awayTeam && homeTeam && (
          <div className="bg-[#111] rounded-[2rem] border border-white/5 p-8 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 text-center">Tale of the Tape</h3>
            <div className="flex flex-col gap-2">
              <CompareBar label="Offensive Rating" v1={awayTeam.offRtg} v2={homeTeam.offRtg} icon={Target} />
              <CompareBar label="Defensive Rating" v1={awayTeam.defRtg} v2={homeTeam.defRtg} icon={Shield} inverse={true} />
              <CompareBar label="Net Rating" v1={awayTeam.netRtg} v2={homeTeam.netRtg} icon={TrendingUp} />
              <CompareBar label="True Shooting %" v1={awayTeam.tsPct} v2={homeTeam.tsPct} icon={Target} />
              <CompareBar label="Pace" v1={awayTeam.pace} v2={homeTeam.pace} icon={Activity} />
              <CompareBar label="Rebound Pct %" v1={awayTeam.rebPct} v2={homeTeam.rebPct} icon={Shield} />
              <CompareBar label="AST to TO Ratio" v1={awayTeam.astTo} v2={homeTeam.astTo} icon={Zap} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
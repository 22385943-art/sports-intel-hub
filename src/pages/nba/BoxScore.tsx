import { useState, useEffect } from "react";
import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, ChevronLeft, BarChart3, Users, Crown, EyeOff } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSettings } from "@/hooks/useSettings"; 

export default function BoxScore() {
  const { id } = useParams();
  const location = useLocation();
  const game = location.state?.game;

  const [boxScore, setBoxScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"team" | "away" | "home">("team"); 

  const { settings } = useSettings();
  const [isRevealed, setIsRevealed] = useState(!settings.hideResults);

  useEffect(() => {
    if (id) {
      nbaService.fetchBoxScore(id).then(data => {
        setBoxScore(data);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (!game) return <Navigate to="/nba/schedule" replace />;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Retrieving Official Box Score...</p>
    </div>
  );

  if (!boxScore) return <div className="text-center text-white py-20 font-bold">Box Score Data currently unavailable.</div>;

  const awayStats = boxScore.awayTeam || {};
  const homeStats = boxScore.homeTeam || {};

  // 🚀 BLINDAJE PARA PARTIDOS EN VIVO (Evita leer propiedades de null)
  const safeAwayStats = awayStats.statistics || {};
  const safeHomeStats = homeStats.statistics || {};

  const formatMin = (minStr: string) => {
    if (!minStr) return "-";
    if (minStr.includes("PT")) {
      const m = minStr.match(/PT(\d+)M(\d+)?/);
      if (m) return `${m[1]}:${m[2] ? m[2].padStart(2, '0') : '00'}`;
    }
    return minStr.split(".")[0];
  };

  const getPlayerName = (p: any) => `${p.firstName || ''} ${p.familyName || ''}`.trim() || p.name || p.nameI || "Unknown";

  const renderPlayerTable = (team: any) => {
    const players = team.players || [];
    return (
      <div className="overflow-x-auto bg-[#111] rounded-[1.5rem] border border-[#222]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#151515] text-[9px] font-black text-[#888] uppercase tracking-widest border-b border-[#222]">
              <th className="p-4 w-48 sticky left-0 bg-[#151515] z-10">Player</th>
              <th className="p-4 text-center">MIN</th>
              <th className="p-4 text-center">PTS</th>
              <th className="p-4 text-center">REB</th>
              <th className="p-4 text-center">AST</th>
              <th className="p-4 text-center">FG</th>
              <th className="p-4 text-center">3PT</th>
              <th className="p-4 text-center">FT</th>
              <th className="p-4 text-center">STL</th>
              <th className="p-4 text-center">BLK</th>
              <th className="p-4 text-center">TO</th>
              <th className="p-4 text-center">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {players.map((p: any) => {
              const s = p.statistics;
              if (!s || s.minutes === "") return null; 
              const fgPct = s.fieldGoalsPercentage ? Math.round(s.fieldGoalsPercentage * 100) : 0;
              const fg3Pct = s.threePointersPercentage ? Math.round(s.threePointersPercentage * 100) : 0;
              const ftPct = s.freeThrowsPercentage ? Math.round(s.freeThrowsPercentage * 100) : 0;
              const pm = s.plusMinusPoints ?? s.plusMinus ?? 0;

              return (
                <tr key={p.personId} className="hover:bg-[#1a1a1a] transition-colors text-xs font-mono font-bold text-white group">
                  <td className="p-4 font-sans flex items-center gap-3 sticky left-0 bg-[#111] group-hover:bg-[#1a1a1a]">
                    <span className="truncate w-32 font-bold text-sm">{getPlayerName(p)}</span>
                    <span className="text-[9px] font-black text-[#666]">{p.position}</span>
                  </td>
                  <td className="p-4 text-center text-[#888]">{formatMin(s.minutes)}</td>
                  <td className="p-4 text-center text-white text-sm">{s.points}</td>
                  <td className="p-4 text-center">{s.reboundsTotal}</td>
                  <td className="p-4 text-center">{s.assists}</td>
                  <td className="p-4 text-center text-[#888]">
                    <span className="text-white mr-1">{s.fieldGoalsMade}-{s.fieldGoalsAttempted}</span>
                    <span className="text-[10px]">({fgPct}%)</span>
                  </td>
                  <td className="p-4 text-center text-[#888]">
                    <span className="text-white mr-1">{s.threePointersMade}-{s.threePointersAttempted}</span>
                    <span className="text-[10px]">({fg3Pct}%)</span>
                  </td>
                  <td className="p-4 text-center text-[#888]">
                    <span className="text-white mr-1">{s.freeThrowsMade}-{s.freeThrowsAttempted}</span>
                    <span className="text-[10px]">({ftPct}%)</span>
                  </td>
                  <td className="p-4 text-center">{s.steals}</td>
                  <td className="p-4 text-center">{s.blocks}</td>
                  <td className="p-4 text-center text-rose-400">{s.turnovers}</td>
                  <td className="p-4 text-center text-cyan-400">{pm > 0 ? `+${pm}` : pm}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const getGameLeader = (team: any, stat: string) => {
    if (!team || !team.players) return null;
    return [...team.players].filter(p => p.statistics && p.statistics.minutes).sort((a, b) => b.statistics[stat] - a.statistics[stat])[0];
  };

  const awayLeaders = { pts: getGameLeader(awayStats, 'points'), reb: getGameLeader(awayStats, 'reboundsTotal'), ast: getGameLeader(awayStats, 'assists') };
  const homeLeaders = { pts: getGameLeader(homeStats, 'points'), reb: getGameLeader(homeStats, 'reboundsTotal'), ast: getGameLeader(homeStats, 'assists') };

  const renderGameLeaderCard = (title: string, awayLeader: any, homeLeader: any) => {
    const safeAway = awayLeader || { personId: "0", name: "N/A", value: 0 };
    const safeHome = homeLeader || { personId: "0", name: "N/A", value: 0 };

    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{title}</span>
        <div className="flex justify-between w-full items-center px-2">
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-12 h-12 border-2 border-[#0a0f18] shadow-lg bg-slate-800">
              <AvatarImage src={nbaService.getImageUrl(safeAway.personId)} className="object-cover" />
              <AvatarFallback className="text-[10px] font-bold text-white">{String(safeAway.name || "UN").substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-xl font-black font-mono text-white leading-none">{safeAway.value || 0}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[60px]">{String(safeAway.name || "N/A").split(" ").pop()}</p>
            </div>
          </div>
          
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">VS</span>
          
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-12 h-12 border-2 border-[#0a0f18] shadow-lg bg-slate-800">
              <AvatarImage src={nbaService.getImageUrl(safeHome.personId)} className="object-cover" />
              <AvatarFallback className="text-[10px] font-bold text-white">{String(safeHome.name || "UN").substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-xl font-black font-mono text-white leading-none">{safeHome.value || 0}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[60px]">{String(safeHome.name || "N/A").split(" ").pop()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatRow = ({ label, away, home, isBold = false }: any) => (
    <div className={`flex justify-between items-center py-3 border-b border-[#222] last:border-0 ${isBold ? 'font-bold text-white' : 'text-[#aaa]'}`}>
      <span className="w-1/4 text-left font-mono">{away}</span>
      <span className="w-2/4 text-center text-xs uppercase tracking-widest font-black text-[#666]">{label}</span>
      <span className="w-1/4 text-right font-mono">{home}</span>
    </div>
  );

  // 🚀 BLINDAJE PARA FORMATEO DE PORCENTAJES
  const formatTeamPct = (made?: number, att?: number, pct?: number) => {
    const m = made || 0;
    const a = att || 0;
    const p = pct || 0;
    return `${m}-${a} (${Math.round(p * 100)}%)`;
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-6xl mx-auto px-4">
      <Link to="/nba/schedule" className="group inline-flex items-center gap-2 text-[10px] font-black text-[#888] hover:text-white transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Schedule
      </Link>

      {!isRevealed ? (
        <div className="bg-[#111] rounded-[2rem] border border-[#222] p-16 shadow-2xl flex flex-col items-center justify-center text-center mt-4">
          <EyeOff className="h-16 w-16 text-[#555] mb-6" />
          <h2 className="text-3xl font-black text-white mb-2">Results Hidden</h2>
          <p className="text-[#888] mb-8">Spoiler-Free mode is enabled. Click below to view the final box score.</p>
          <button 
            onClick={() => setIsRevealed(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-colors"
          >
            Reveal Final Score
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#111] rounded-[2rem] border border-[#222] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-slate-600 to-slate-400" />
            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 bg-[#222] text-[#888] border border-[#333]">
              FINAL SCORE
            </span>
            <div className="flex items-center justify-between w-full max-w-2xl">
              <div className="flex flex-col items-center gap-4 flex-1">
                <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} alt={game.away} className="w-20 h-20 object-contain drop-shadow-md" />
                <h2 className="text-xl font-black text-white">{game.away}</h2>
                <span className={`text-5xl font-mono font-black ${game.awayScore > game.homeScore ? 'text-white' : 'text-[#555]'}`}>{game.awayScore}</span>
              </div>
              <span className="text-2xl font-black text-[#333] px-4">@</span>
              <div className="flex flex-col items-center gap-4 flex-1">
                <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} alt={game.home} className="w-20 h-20 object-contain drop-shadow-md" />
                <h2 className="text-xl font-black text-white">{game.home}</h2>
                <span className={`text-5xl font-mono font-black ${game.homeScore > game.awayScore ? 'text-white' : 'text-[#555]'}`}>{game.homeScore}</span>
              </div>
            </div>
          </div>

          <div className="flex bg-[#111] p-1.5 rounded-xl border border-[#222] w-fit mx-auto shadow-lg">
            <button onClick={() => setActiveTab("team")} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "team" ? 'bg-[#222] text-white' : 'text-[#666] hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" /> Team Stats
            </button>
            <button onClick={() => setActiveTab("away")} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "away" ? 'bg-[#222] text-white' : 'text-[#666] hover:text-white'}`}>
              <Users className="w-4 h-4" /> {game.away}
            </button>
            <button onClick={() => setActiveTab("home")} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "home" ? 'bg-[#222] text-white' : 'text-[#666] hover:text-white'}`}>
              <Users className="w-4 h-4" /> {game.home}
            </button>
          </div>

          <div className="animate-in slide-in-from-bottom-4">
            {activeTab === "away" && renderPlayerTable(awayStats)}
            {activeTab === "home" && renderPlayerTable(homeStats)}
            
            {activeTab === "team" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#111] rounded-[1.5rem] border border-[#222] p-6 shadow-xl h-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" /> Game Leaders
                    </h3>
                    <div className="flex justify-between items-center mb-4 px-4">
                      <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} className="w-6 h-6 object-contain" />
                      <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} className="w-6 h-6 object-contain" />
                    </div>
                    <div className="space-y-3">
                      {renderGameLeaderCard("Points", awayLeaders.pts, homeLeaders.pts)}
                      {renderGameLeaderCard("Rebounds", awayLeaders.reb, homeLeaders.reb)}
                      {renderGameLeaderCard("Assists", awayLeaders.ast, homeLeaders.ast)}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="bg-[#111] rounded-[1.5rem] border border-[#222] p-6 md:p-8 shadow-xl h-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 text-center">Team Matchup</h3>
                    
                    <div className="flex justify-between items-center mb-6 border-b border-[#222] pb-4 px-4">
                      <img src={`https://cdn.nba.com/logos/nba/${game.awayId}/global/L/logo.svg`} className="w-10 h-10 object-contain" />
                      <span className="text-[10px] font-black text-[#555] uppercase tracking-widest">Stats</span>
                      <img src={`https://cdn.nba.com/logos/nba/${game.homeId}/global/L/logo.svg`} className="w-10 h-10 object-contain" />
                    </div>

                    <div className="px-2">
                      {/* 🚀 LECTURAS 100% SEGURAS CON LOS OBJETOS BLINDADOS */}
                      <StatRow isBold label="Field Goals" 
                        away={formatTeamPct(safeAwayStats.fieldGoalsMade, safeAwayStats.fieldGoalsAttempted, safeAwayStats.fieldGoalsPercentage)} 
                        home={formatTeamPct(safeHomeStats.fieldGoalsMade, safeHomeStats.fieldGoalsAttempted, safeHomeStats.fieldGoalsPercentage)} />
                      <StatRow isBold label="3 Pointers" 
                        away={formatTeamPct(safeAwayStats.threePointersMade, safeAwayStats.threePointersAttempted, safeAwayStats.threePointersPercentage)} 
                        home={formatTeamPct(safeHomeStats.threePointersMade, safeHomeStats.threePointersAttempted, safeHomeStats.threePointersPercentage)} />
                      <StatRow isBold label="Free Throws" 
                        away={formatTeamPct(safeAwayStats.freeThrowsMade, safeAwayStats.freeThrowsAttempted, safeAwayStats.freeThrowsPercentage)} 
                        home={formatTeamPct(safeHomeStats.freeThrowsMade, safeHomeStats.freeThrowsAttempted, safeHomeStats.freeThrowsPercentage)} />
                      
                      <StatRow isBold label="Total Rebounds" away={safeAwayStats.reboundsTotal || 0} home={safeHomeStats.reboundsTotal || 0} />
                      <StatRow label="Offensive Rebounds" away={safeAwayStats.reboundsOffensive || 0} home={safeHomeStats.reboundsOffensive || 0} />
                      <StatRow label="Defensive Rebounds" away={safeAwayStats.reboundsDefensive || 0} home={safeHomeStats.reboundsDefensive || 0} />
                      
                      <StatRow isBold label="Assists" away={safeAwayStats.assists || 0} home={safeHomeStats.assists || 0} />
                      <StatRow isBold label="Steals" away={safeAwayStats.steals || 0} home={safeHomeStats.steals || 0} />
                      <StatRow isBold label="Blocks" away={safeAwayStats.blocks || 0} home={safeHomeStats.blocks || 0} />
                      
                      <StatRow isBold label="Turnovers" away={safeAwayStats.turnoversTeam || 0} home={safeHomeStats.turnoversTeam || 0} />
                      <StatRow label="Points off Turnovers" away={safeAwayStats.pointsFromTurnovers || 0} home={safeHomeStats.pointsFromTurnovers || 0} />
                      
                      <StatRow isBold label="Fast Break Points" away={safeAwayStats.pointsFastBreak || 0} home={safeHomeStats.pointsFastBreak || 0} />
                      <StatRow isBold label="Points in Paint" away={safeAwayStats.pointsInThePaint || 0} home={safeHomeStats.pointsInThePaint || 0} />
                      <StatRow isBold label="Fouls" away={safeAwayStats.foulsPersonal || 0} home={safeHomeStats.foulsPersonal || 0} />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
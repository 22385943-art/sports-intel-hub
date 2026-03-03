import { useState, useEffect } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, Trophy, ListOrdered, Ticket, Crosshair, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

// 🚀 REGLAS OFICIALES DE LA LOTERÍA DEL DRAFT NBA
const LOTTERY_ODDS = [
  { pick1: 14.0, top4: 52.1 }, { pick1: 14.0, top4: 52.1 }, { pick1: 14.0, top4: 52.1 },
  { pick1: 12.5, top4: 48.1 }, { pick1: 10.5, top4: 42.1 }, { pick1: 9.0, top4: 37.2 },
  { pick1: 7.5, top4: 31.9 }, { pick1: 6.0, top4: 26.2 }, { pick1: 4.5, top4: 20.2 },
  { pick1: 3.0, top4: 13.9 }, { pick1: 2.0, top4: 9.4 }, { pick1: 1.5, top4: 7.1 },
  { pick1: 1.0, top4: 4.8 }, { pick1: 0.5, top4: 2.4 },
];

export default function NBAStandings() {
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standings" | "playoffs" | "lottery">("playoffs");

  useEffect(() => {
    nbaService.fetchStandings().then((data) => {
      setStandings(data || []);
      setIsLoading(false);
    });
  }, []);

  // 🚀 TRADUCTOR MAESTRO DE EQUIPOS (Arregla enlaces rotos y logos)
  const getAbbr = (t: any) => {
    if (!t) return "NBA";
    const allTeams = nbaService.getAllTeams();
    let found = allTeams.find(team => String(team.id) === String(t.teamId));
    if (!found && t.name) {
      const mascot = t.name.split(' ').pop();
      found = allTeams.find(team => team.name.includes(mascot || ""));
    }
    return found ? found.abbreviation : "NBA";
  };

  const getLogo = (t: any) => {
    if (!t) return "https://cdn.nba.com/logos/leagues/logo-nba.svg";
    const abbr = getAbbr(t);
    if (abbr === "NBA") return "https://cdn.nba.com/logos/leagues/logo-nba.svg";
    return nbaService.getTeamLogoUrl(abbr);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Simulating Playoff Picture...</p>
    </div>
  );

  // Parsear y ordenar equipos por conferencia y rango
  const east = standings.filter(t => t.conference === "East").sort((a, b) => a.rank - b.rank);
  const west = standings.filter(t => t.conference === "West").sort((a, b) => a.rank - b.rank);
  const lotteryTeams = [...standings].sort((a, b) => a.pct - b.pct).slice(0, 14);

  const StandingsRow = ({ t, index }: { t: any, index: number }) => {
    let statusColor = "border-transparent";
    let statusText = "text-slate-500";
    if (index < 6) { statusColor = "border-emerald-500"; statusText = "text-emerald-400"; }
    else if (index < 10) { statusColor = "border-amber-500"; statusText = "text-amber-400"; }
    else { statusColor = "border-rose-500/30"; statusText = "text-rose-500/50"; }
    
    const abbr = getAbbr(t);

    return (
      <Link to={`/nba/teams/${abbr}`} className="grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors items-center border-l-2 group" style={{ borderLeftColor: index < 6 ? '#10b981' : index < 10 ? '#f59e0b' : 'transparent' }}>
        <div className="col-span-5 flex items-center gap-4">
          <span className={`font-mono font-black text-xs w-4 ${statusText}`}>{t.rank}</span>
          <img src={getLogo(t)} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" alt={t.name} />
          <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors truncate">{t.name}</span>
        </div>
        <div className="col-span-1 text-center font-mono font-bold text-emerald-400">{t.wins}</div>
        <div className="col-span-1 text-center font-mono font-bold text-rose-400">{t.losses}</div>
        <div className="col-span-2 text-center font-mono font-black text-white">{(t.pct * 100).toFixed(1)}%</div>
        <div className="col-span-1 text-center font-mono font-bold text-slate-400">{t.gb === 0 ? '-' : t.gb}</div>
        <div className="col-span-1 text-center font-mono text-xs text-slate-500">{t.l10}</div>
        <div className="col-span-1 text-center font-mono font-black text-xs">
          <Badge className={`border-none ${t.streak.includes('W') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{t.streak}</Badge>
        </div>
      </Link>
    );
  };

  // 🚀 COMPONENTE MAESTRO DE BRACKET (Con soporte para equipos TBD e interconexión)
  const MatchupNode = ({ seed1, team1, seed2, team2, label1, label2, title }: any) => {
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl hover:border-cyan-500/50 transition-colors w-64 shrink-0 relative group">
        {title && (
          <div className="bg-[#0a0f18] text-center py-1.5 border-b border-[#333]">
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500/70 group-hover:text-cyan-400 transition-colors">{title}</span>
          </div>
        )}
        
        {/* Top Team */}
        <Link to={team1 ? `/nba/teams/${getAbbr(team1)}` : '#'} className={`flex items-center justify-between p-3 border-b border-[#222] transition-colors ${team1 ? 'hover:bg-[#1a1a1a]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500 font-black w-3 text-center">{seed1}</span>
            <img src={getLogo(team1)} className={`w-6 h-6 object-contain ${!team1 && 'opacity-30'}`} alt={team1 ? team1.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team1 ? 'text-white' : 'text-slate-600 uppercase text-xs tracking-widest'}`}>{team1 ? team1.name.split(' ').pop() : label1}</span>
          </div>
          {team1 && <span className="font-mono text-xs font-bold text-slate-400">{team1.wins}W</span>}
        </Link>
        
        {/* Bottom Team */}
        <Link to={team2 ? `/nba/teams/${getAbbr(team2)}` : '#'} className={`flex items-center justify-between p-3 transition-colors ${team2 ? 'hover:bg-[#1a1a1a]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500 font-black w-3 text-center">{seed2}</span>
            <img src={getLogo(team2)} className={`w-6 h-6 object-contain ${!team2 && 'opacity-30'}`} alt={team2 ? team2.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team2 ? 'text-white' : 'text-slate-600 uppercase text-xs tracking-widest'}`}>{team2 ? team2.name.split(' ').pop() : label2}</span>
          </div>
          {team2 && <span className="font-mono text-xs font-bold text-slate-400">{team2.wins}W</span>}
        </Link>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
      
      {/* ═══ HEADER & TABS ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" /> Season Standings
          </h1>
          <p className="text-[#888] text-sm">Live Playoff tracking and Draft Lottery odds calculator.</p>
        </div>
        
        <div className="flex bg-[#111] p-1.5 rounded-xl border border-[#222] shadow-lg w-fit overflow-x-auto scrollbar-none">
          <button onClick={() => setActiveTab("playoffs")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "playoffs" ? 'bg-[#222] text-amber-400' : 'text-[#666] hover:text-white'}`}>
            <Crosshair className="w-4 h-4" /> Playoff Picture
          </button>
          <button onClick={() => setActiveTab("standings")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "standings" ? 'bg-[#222] text-white' : 'text-[#666] hover:text-white'}`}>
            <ListOrdered className="w-4 h-4" /> Conferences
          </button>
          <button onClick={() => setActiveTab("lottery")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "lottery" ? 'bg-purple-500/20 text-purple-400' : 'text-[#666] hover:text-white'}`}>
            <Ticket className="w-4 h-4" /> Draft Lottery
          </button>
        </div>
      </div>

      {/* ═══ VISTA 1: EL BRACKET OFICIAL DEL PLAY-IN / PLAYOFFS ═══ */}
      {activeTab === "playoffs" && (
        <div className="bg-[#0a0f18] rounded-[2.5rem] border border-white/5 p-8 md:p-12 shadow-2xl relative overflow-x-auto scrollbar-none">
          
          {/* Diseño Auténtico de Árbol de Torneo */}
          <div className="min-w-[1300px] flex flex-col xl:flex-row items-center justify-between gap-8 py-8">
            
            {/* LADO OESTE (WEST) */}
            <div className="flex items-center gap-8">
              {/* Play-In Columna Exterior */}
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={west[8]} seed2={10} team2={west[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={west[6]} seed2={8} team2={west[7]} />
              </div>
              
              {/* Conector Visual SVG (Opcional, usando borders para simularlo) */}
              <div className="hidden md:flex flex-col h-full gap-24">
                <div className="w-8 h-px bg-[#333] translate-y-10" />
                <div className="w-8 h-px bg-[#333] translate-y-16" />
              </div>

              {/* Playoffs Columna Principal */}
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2"><h3 className="font-black text-white tracking-[0.3em] uppercase text-xl drop-shadow-md">Western</h3></div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={west[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={west[3]} seed2={5} team2={west[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={west[2]} seed2={6} team2={west[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={west[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>

            {/* TROFEO CENTRAL */}
            <div className="hidden xl:flex flex-col items-center justify-center px-4 shrink-0">
              <Trophy className="w-32 h-32 text-amber-500/20 drop-shadow-[0_0_50px_rgba(245,158,11,0.2)]" />
              <h2 className="text-3xl font-black text-white tracking-[0.4em] uppercase mt-6 opacity-50">Finals</h2>
            </div>

            {/* LADO ESTE (EAST) - Invertido usando flex-row-reverse */}
            <div className="flex items-center gap-8 flex-row-reverse">
              {/* Play-In Columna Exterior */}
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={east[8]} seed2={10} team2={east[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={east[6]} seed2={8} team2={east[7]} />
              </div>
              
              {/* Conector Visual */}
              <div className="hidden md:flex flex-col h-full gap-24">
                <div className="w-8 h-px bg-[#333] translate-y-10" />
                <div className="w-8 h-px bg-[#333] translate-y-16" />
              </div>

              {/* Playoffs Columna Principal */}
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2"><h3 className="font-black text-white tracking-[0.3em] uppercase text-xl drop-shadow-md">Eastern</h3></div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={east[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={east[3]} seed2={5} team2={east[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={east[2]} seed2={6} team2={east[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={east[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>

          </div>

          <div className="mt-12 max-w-3xl mx-auto bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4 text-amber-500/80">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[11px] font-bold leading-relaxed">
              <strong className="text-amber-400">Live Seedings Note:</strong> This bracket represents the playoff picture if the season ended today. The 7th and 8th seeds in the main bracket will be finalized after the official SoFi Play-In Tournament concludes.
            </p>
          </div>
        </div>
      )}

      {/* ═══ VISTA 2: DRAFT LOTTERY (TANKATHON) ═══ */}
      {activeTab === "lottery" && (
        <div className="bg-[#111] rounded-2xl border border-purple-500/20 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
          <div className="p-6 md:p-8 bg-purple-500/5 border-b border-purple-500/10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3"><Ticket className="h-6 w-6 text-purple-400" /> Draft Lottery Odds</h2>
              <p className="text-sm text-slate-400 mt-1">Official probabilities for the 2026 #1 Overall Pick based on current reverse standings.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-white/[0.02] border-b border-white/[0.06] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <div className="col-span-1 text-center">Pick Rank</div>
                <div className="col-span-5">Franchise</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center text-purple-400">#1 Pick %</div>
                <div className="col-span-2 text-center text-blue-400">Top 4 Pick %</div>
              </div>
              <div className="divide-y divide-[#222]">
                {lotteryTeams.map((t, i) => (
                  <Link key={t.id} to={`/nba/teams/${getAbbr(t)}`} className="grid grid-cols-12 gap-4 px-8 py-4 hover:bg-white/[0.02] transition-colors items-center group cursor-pointer block w-full">
                    <div className="col-span-1 text-center font-mono font-black text-slate-600">#{i + 1}</div>
                    <div className="col-span-5 flex items-center gap-4">
                      <img src={getLogo(t)} className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" alt={t.name} />
                      <span className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">{t.name}</span>
                    </div>
                    <div className="col-span-2 text-center font-mono font-bold text-slate-400">{t.wins}-{t.losses}</div>
                    <div className="col-span-2 flex items-center justify-center">
                      <Badge className="bg-purple-500/20 text-purple-400 border-none font-black text-sm px-3 py-1">
                        {LOTTERY_ODDS[i]?.pick1.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="font-mono font-black text-blue-400 text-sm">
                        {LOTTERY_ODDS[i]?.top4.toFixed(1)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VISTA 3: CONFERENCE STANDINGS ═══ */}
      {activeTab === "standings" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in zoom-in-95 duration-300">
          
          <div className="bg-[#111] rounded-2xl border border-[#222] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#222] bg-blue-500/5 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Eastern
              </h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#151515] border-b border-[#222] text-[9px] font-black text-[#888] uppercase tracking-widest">
                  <div className="col-span-5">Team</div>
                  <div className="col-span-1 text-center">W</div>
                  <div className="col-span-1 text-center">L</div>
                  <div className="col-span-2 text-center">PCT</div>
                  <div className="col-span-1 text-center">GB</div>
                  <div className="col-span-1 text-center">L10</div>
                  <div className="col-span-1 text-center">STRK</div>
                </div>
                <div className="divide-y divide-[#222]">
                  {east.map((t, i) => <StandingsRow key={t.id} t={t} index={i} />)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111] rounded-2xl border border-[#222] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#222] bg-red-500/5 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Western
              </h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#151515] border-b border-[#222] text-[9px] font-black text-[#888] uppercase tracking-widest">
                  <div className="col-span-5">Team</div>
                  <div className="col-span-1 text-center">W</div>
                  <div className="col-span-1 text-center">L</div>
                  <div className="col-span-2 text-center">PCT</div>
                  <div className="col-span-1 text-center">GB</div>
                  <div className="col-span-1 text-center">L10</div>
                  <div className="col-span-1 text-center">STRK</div>
                </div>
                <div className="divide-y divide-[#222]">
                  {west.map((t, i) => <StandingsRow key={t.id} t={t} index={i} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
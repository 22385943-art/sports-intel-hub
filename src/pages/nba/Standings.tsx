import { useState, useEffect } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, Trophy, ListOrdered, Ticket, Crosshair, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
      <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      <p className="text-slate-700 font-black text-[10px] uppercase tracking-[0.3em]">Simulating Playoff Picture...</p>
    </div>
  );

  const east = standings.filter(t => t.conference === "East").sort((a, b) => a.rank - b.rank);
  const west = standings.filter(t => t.conference === "West").sort((a, b) => a.rank - b.rank);
  const lotteryTeams = [...standings].sort((a, b) => a.pct - b.pct).slice(0, 14);

  const StandingsRow = ({ t, index }: { t: any, index: number }) => {
    const abbr = getAbbr(t);
    const isPlayoff = index < 6;
    const isPlayIn = index >= 6 && index < 10;

    return (
      <Link
        to={`/nba/teams/${abbr}`}
        className="grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-all duration-300 items-center group relative hover:-translate-y-0.5"
        style={{ borderLeft: `2px solid ${isPlayoff ? 'rgba(52,211,153,0.5)' : isPlayIn ? 'rgba(251,191,36,0.5)' : 'transparent'}` }}
      >
        <div className="col-span-5 flex items-center gap-4">
          <span className={`font-mono font-black text-[10px] w-5 text-center ${isPlayoff ? 'text-emerald-400' : isPlayIn ? 'text-amber-400' : 'text-slate-700'}`}>{t.rank}</span>
          <img src={getLogo(t)} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" alt={t.name} />
          <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors duration-300 truncate">{t.name}</span>
        </div>
        <div className="col-span-1 text-center font-mono font-bold text-emerald-400/70">{t.wins}</div>
        <div className="col-span-1 text-center font-mono font-bold text-rose-400/70">{t.losses}</div>
        <div className="col-span-2 text-center font-mono font-black text-white tracking-tighter">{(t.pct * 100).toFixed(1)}%</div>
        <div className="col-span-1 text-center font-mono font-bold text-slate-600">{t.gb === 0 ? '—' : t.gb}</div>
        <div className="col-span-1 text-center font-mono text-xs text-slate-600">{t.l10}</div>
        <div className="col-span-1 text-center">
          <Badge className={`border-none text-[9px] font-black ${t.streak.includes('W') ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)]' : 'bg-rose-500/10 text-rose-400'}`}>{t.streak}</Badge>
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg shadow-[inset_0_0_40px_rgba(34,211,238,0.02)]" />
      </Link>
    );
  };

  const MatchupNode = ({ seed1, team1, seed2, team2, label1, label2, title }: any) => {
    return (
      <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-2xl overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] hover:border-white/[0.08] hover:shadow-[0_0_40px_rgba(34,211,238,0.04)] transition-all duration-500 w-64 shrink-0 relative group">
        {title && (
          <div className="bg-white/[0.02] text-center py-2 border-b border-white/[0.03]">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-600 group-hover:text-cyan-400/60 transition-colors duration-500">{title}</span>
          </div>
        )}
        
        <Link to={team1 ? `/nba/teams/${getAbbr(team1)}` : '#'} className={`flex items-center justify-between p-3.5 border-b border-white/[0.02] transition-all duration-300 ${team1 ? 'hover:bg-white/[0.02]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-slate-700 font-black w-4 text-center">{seed1}</span>
            <img src={getLogo(team1)} className={`w-6 h-6 object-contain transition-transform duration-300 ${team1 ? 'group-hover:scale-110' : 'opacity-15'}`} alt={team1 ? team1.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team1 ? 'text-white' : 'text-slate-800 uppercase text-[9px] tracking-[0.25em]'}`}>{team1 ? team1.name.split(' ').pop() : label1}</span>
          </div>
          {team1 && <span className="font-mono text-[9px] font-bold text-slate-600">{team1.wins}W</span>}
        </Link>
        
        <Link to={team2 ? `/nba/teams/${getAbbr(team2)}` : '#'} className={`flex items-center justify-between p-3.5 transition-all duration-300 ${team2 ? 'hover:bg-white/[0.02]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-slate-700 font-black w-4 text-center">{seed2}</span>
            <img src={getLogo(team2)} className={`w-6 h-6 object-contain transition-transform duration-300 ${team2 ? 'group-hover:scale-110' : 'opacity-15'}`} alt={team2 ? team2.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team2 ? 'text-white' : 'text-slate-800 uppercase text-[9px] tracking-[0.25em]'}`}>{team2 ? team2.name.split(' ').pop() : label2}</span>
          </div>
          {team2 && <span className="font-mono text-[9px] font-bold text-slate-600">{team2.wins}W</span>}
        </Link>
      </div>
    );
  };

  /* SVG Connector */
  const BracketConnector = ({ direction = "right", height = 200 }: { direction?: "right" | "left"; height?: number }) => (
    <svg width="40" height={height} className="hidden md:block shrink-0" viewBox={`0 0 40 ${height}`}>
      <path
        d={direction === "right"
          ? `M 0 ${height * 0.25} H 20 V ${height * 0.5} H 40 M 0 ${height * 0.75} H 20 V ${height * 0.5}`
          : `M 40 ${height * 0.25} H 20 V ${height * 0.5} H 0 M 40 ${height * 0.75} H 20 V ${height * 0.5}`
        }
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={direction === "right" ? "40" : "0"} cy={height * 0.5} r="2.5" fill="rgba(34,211,238,0.3)" />
    </svg>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 pb-16 max-w-[1600px] mx-auto px-4"
    >
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-1 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" /> Season Standings
          </h1>
          <p className="text-slate-600 text-sm">Live Playoff tracking and Draft Lottery odds calculator.</p>
        </div>
        
        <div className="flex bg-white/[0.02] backdrop-blur-xl p-1.5 rounded-2xl border border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] w-fit overflow-x-auto scrollbar-none">
          {[
            { key: "playoffs" as const, icon: Crosshair, label: "Playoff Picture", activeClass: "text-amber-400 bg-amber-500/[0.08] border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.06)]" },
            { key: "standings" as const, icon: ListOrdered, label: "Conferences", activeClass: "text-white bg-white/[0.04] border-white/[0.08]" },
            { key: "lottery" as const, icon: Ticket, label: "Draft Lottery", activeClass: "text-purple-400 bg-purple-500/[0.08] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.06)]" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 whitespace-nowrap border ${
                activeTab === tab.key ? tab.activeClass : 'text-slate-700 hover:text-slate-400 border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYOFF BRACKET */}
      {activeTab === "playoffs" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.015] backdrop-blur-3xl rounded-[2rem] border border-white/[0.04] p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] relative overflow-x-auto scrollbar-none"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[150px] pointer-events-none" />
          
          <div className="min-w-[1300px] flex flex-col xl:flex-row items-center justify-between gap-8 py-8">
            
            {/* WEST */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={west[8]} seed2={10} team2={west[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={west[6]} seed2={8} team2={west[7]} />
              </div>
              <BracketConnector direction="right" height={340} />
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 tracking-[0.3em] uppercase text-xl">Western</h3>
                </div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={west[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={west[3]} seed2={5} team2={west[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={west[2]} seed2={6} team2={west[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={west[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>

            {/* TROPHY */}
            <div className="hidden xl:flex flex-col items-center justify-center px-4 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/[0.08] rounded-full blur-[80px] scale-[3] animate-pulse" />
                <Trophy className="w-32 h-32 text-amber-500/15 drop-shadow-[0_0_80px_rgba(245,158,11,0.1)] relative z-10" />
              </div>
              <h2 className="text-2xl font-black text-white/20 tracking-[0.5em] uppercase mt-6">Finals</h2>
            </div>

            {/* EAST */}
            <div className="flex items-center gap-2 flex-row-reverse">
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={east[8]} seed2={10} team2={east[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={east[6]} seed2={8} team2={east[7]} />
              </div>
              <BracketConnector direction="left" height={340} />
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 tracking-[0.3em] uppercase text-xl">Eastern</h3>
                </div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={east[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={east[3]} seed2={5} team2={east[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={east[2]} seed2={6} team2={east[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={east[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl mx-auto bg-amber-500/[0.03] backdrop-blur-sm border border-amber-500/[0.08] rounded-2xl p-5 flex items-center gap-4 text-amber-500/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">
              <strong className="text-amber-400">Live Seedings Note:</strong> This bracket represents the playoff picture if the season ended today.
            </p>
          </div>
        </motion.div>
      )}

      {/* DRAFT LOTTERY */}
      {activeTab === "lottery" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] border border-purple-500/[0.08] shadow-[0_0_60px_rgba(168,85,247,0.04),inset_0_1px_1px_rgba(255,255,255,0.04)] overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <div className="absolute -top-20 right-1/4 w-[400px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
          <div className="p-6 md:p-8 bg-purple-500/[0.02] border-b border-purple-500/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><Ticket className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> Draft Lottery Odds</h2>
              <p className="text-sm text-slate-600 mt-1">Official probabilities for the 2026 #1 Overall Pick.</p>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-white/[0.01] border-b border-white/[0.03] text-[7px] font-black text-slate-700 uppercase tracking-[0.3em]">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5">Franchise</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center text-purple-400/60">#1 Pick %</div>
                <div className="col-span-2 text-center text-blue-400/60">Top 4 %</div>
              </div>
              <div className="divide-y divide-white/[0.02]">
                {lotteryTeams.map((t, i) => (
                  <Link key={t.id} to={`/nba/teams/${getAbbr(t)}`} className="grid grid-cols-12 gap-4 px-8 py-4 hover:bg-white/[0.02] transition-all duration-300 items-center group cursor-pointer block w-full relative hover:-translate-y-0.5">
                    <div className="col-span-1 text-center font-mono font-black text-slate-700">#{i + 1}</div>
                    <div className="col-span-5 flex items-center gap-4">
                      <img src={getLogo(t)} className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" alt={t.name} />
                      <span className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors duration-300">{t.name}</span>
                    </div>
                    <div className="col-span-2 text-center font-mono font-bold text-slate-600">{t.wins}-{t.losses}</div>
                    <div className="col-span-2 flex items-center justify-center">
                      <Badge className="bg-purple-500/[0.08] text-purple-400 border border-purple-500/20 font-black text-sm px-3 py-1 shadow-[0_0_10px_rgba(168,85,247,0.08)]">
                        {LOTTERY_ODDS[i]?.pick1.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="font-mono font-black text-blue-400/70 text-sm tracking-tighter">
                        {LOTTERY_ODDS[i]?.top4.toFixed(1)}%
                      </span>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[inset_0_0_40px_rgba(168,85,247,0.02)]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CONFERENCE STANDINGS */}
      {activeTab === "standings" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        >
          {[
            { conf: east, label: "Eastern", color: "blue", dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
            { conf: west, label: "Western", color: "red", dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
          ].map(({ conf, label, dot }) => (
            <div key={label} className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] border border-white/[0.04] shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/[0.03] bg-white/[0.01] flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${dot}`} /> {label}
                </h2>
              </div>
              <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.01] border-b border-white/[0.03] text-[7px] font-black text-slate-700 uppercase tracking-[0.25em]">
                    <div className="col-span-5">Team</div>
                    <div className="col-span-1 text-center">W</div>
                    <div className="col-span-1 text-center">L</div>
                    <div className="col-span-2 text-center">PCT</div>
                    <div className="col-span-1 text-center">GB</div>
                    <div className="col-span-1 text-center">L10</div>
                    <div className="col-span-1 text-center">STRK</div>
                  </div>
                  <div className="divide-y divide-white/[0.02]">
                    {conf.map((t, i) => <StandingsRow key={t.id} t={t} index={i} />)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

    </motion.div>
  );
}
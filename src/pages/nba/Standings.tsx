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
      <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">Simulating Playoff Picture...</p>
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
        className="grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-all duration-300 items-center group relative"
        style={{ borderLeft: `2px solid ${isPlayoff ? '#10b981' : isPlayIn ? '#f59e0b' : 'transparent'}` }}
      >
        <div className="col-span-5 flex items-center gap-4">
          <span className={`font-mono font-black text-xs w-5 text-center ${isPlayoff ? 'text-emerald-400' : isPlayIn ? 'text-amber-400' : 'text-slate-600'}`}>{t.rank}</span>
          <img src={getLogo(t)} className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" alt={t.name} />
          <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors truncate">{t.name}</span>
        </div>
        <div className="col-span-1 text-center font-mono font-bold text-emerald-400/80">{t.wins}</div>
        <div className="col-span-1 text-center font-mono font-bold text-rose-400/80">{t.losses}</div>
        <div className="col-span-2 text-center font-mono font-black text-white">{(t.pct * 100).toFixed(1)}%</div>
        <div className="col-span-1 text-center font-mono font-bold text-slate-500">{t.gb === 0 ? '—' : t.gb}</div>
        <div className="col-span-1 text-center font-mono text-xs text-slate-500">{t.l10}</div>
        <div className="col-span-1 text-center">
          <Badge className={`border-none text-[10px] font-black ${t.streak.includes('W') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{t.streak}</Badge>
        </div>
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg shadow-[inset_0_0_30px_rgba(6,182,212,0.03)]" />
      </Link>
    );
  };

  const MatchupNode = ({ seed1, team1, seed2, team2, label1, label2, title }: any) => {
    return (
      <div className="bg-[#0a0f18]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col shadow-2xl hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.06)] transition-all duration-500 w-64 shrink-0 relative group">
        {title && (
          <div className="bg-white/[0.02] text-center py-2 border-b border-white/[0.04]">
            <span className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-cyan-400/70 transition-colors duration-300">{title}</span>
          </div>
        )}
        
        <Link to={team1 ? `/nba/teams/${getAbbr(team1)}` : '#'} className={`flex items-center justify-between p-3.5 border-b border-white/[0.03] transition-all duration-300 ${team1 ? 'hover:bg-white/[0.03]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-600 font-black w-4 text-center">{seed1}</span>
            <img src={getLogo(team1)} className={`w-6 h-6 object-contain transition-transform duration-300 ${team1 ? 'group-hover:scale-110' : 'opacity-20'}`} alt={team1 ? team1.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team1 ? 'text-white' : 'text-slate-700 uppercase text-[10px] tracking-[0.2em]'}`}>{team1 ? team1.name.split(' ').pop() : label1}</span>
          </div>
          {team1 && <span className="font-mono text-[10px] font-bold text-slate-500">{team1.wins}W</span>}
        </Link>
        
        <Link to={team2 ? `/nba/teams/${getAbbr(team2)}` : '#'} className={`flex items-center justify-between p-3.5 transition-all duration-300 ${team2 ? 'hover:bg-white/[0.03]' : 'cursor-default pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-600 font-black w-4 text-center">{seed2}</span>
            <img src={getLogo(team2)} className={`w-6 h-6 object-contain transition-transform duration-300 ${team2 ? 'group-hover:scale-110' : 'opacity-20'}`} alt={team2 ? team2.name : 'TBD'} />
            <span className={`font-black text-sm tracking-tight ${team2 ? 'text-white' : 'text-slate-700 uppercase text-[10px] tracking-[0.2em]'}`}>{team2 ? team2.name.split(' ').pop() : label2}</span>
          </div>
          {team2 && <span className="font-mono text-[10px] font-bold text-slate-500">{team2.wins}W</span>}
        </Link>
      </div>
    );
  };

  /* Connector line helper */
  const Connector = () => (
    <div className="hidden md:flex flex-col h-full gap-24">
      <div className="w-10 h-px bg-gradient-to-r from-white/10 to-transparent translate-y-10" />
      <div className="w-10 h-px bg-gradient-to-r from-white/10 to-transparent translate-y-16" />
    </div>
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
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" /> Season Standings
          </h1>
          <p className="text-slate-500 text-sm">Live Playoff tracking and Draft Lottery odds calculator.</p>
        </div>
        
        <div className="flex bg-[#0a0f18]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/[0.06] shadow-lg w-fit overflow-x-auto scrollbar-none">
          {[
            { key: "playoffs" as const, icon: Crosshair, label: "Playoff Picture", activeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { key: "standings" as const, icon: ListOrdered, label: "Conferences", activeClass: "text-white bg-white/[0.06] border-white/10" },
            { key: "lottery" as const, icon: Ticket, label: "Draft Lottery", activeClass: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 whitespace-nowrap border ${
                activeTab === tab.key ? tab.activeClass : 'text-slate-600 hover:text-slate-300 border-transparent'
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
          className="bg-[#0a0f18]/60 backdrop-blur-xl rounded-[2rem] border border-white/[0.05] p-8 md:p-12 shadow-2xl relative overflow-x-auto scrollbar-none"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          
          <div className="min-w-[1300px] flex flex-col xl:flex-row items-center justify-between gap-8 py-8">
            
            {/* WEST */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={west[8]} seed2={10} team2={west[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={west[6]} seed2={8} team2={west[7]} />
              </div>
              <Connector />
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="font-black text-white tracking-[0.3em] uppercase text-xl drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">Western</h3>
                </div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={west[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={west[3]} seed2={5} team2={west[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={west[2]} seed2={6} team2={west[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={west[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>

            {/* TROPHY CENTER */}
            <div className="hidden xl:flex flex-col items-center justify-center px-4 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl scale-[2] animate-pulse" />
                <Trophy className="w-32 h-32 text-amber-500/20 drop-shadow-[0_0_60px_rgba(245,158,11,0.15)] relative z-10" />
              </div>
              <h2 className="text-2xl font-black text-white/30 tracking-[0.5em] uppercase mt-6">Finals</h2>
            </div>

            {/* EAST */}
            <div className="flex items-center gap-6 flex-row-reverse">
              <div className="flex flex-col gap-24 relative">
                <MatchupNode title="Play-In (9 vs 10)" seed1={9} team1={east[8]} seed2={10} team2={east[9]} />
                <MatchupNode title="Play-In (7 vs 8)" seed1={7} team1={east[6]} seed2={8} team2={east[7]} />
              </div>
              <Connector />
              <div className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h3 className="font-black text-white tracking-[0.3em] uppercase text-xl drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">Eastern</h3>
                </div>
                <MatchupNode title="1st vs 8th Seed" seed1={1} team1={east[0]} seed2={8} label2="Winner Play-In" />
                <MatchupNode title="4th vs 5th Seed" seed1={4} team1={east[3]} seed2={5} team2={east[4]} />
                <MatchupNode title="3rd vs 6th Seed" seed1={3} team1={east[2]} seed2={6} team2={east[5]} />
                <MatchupNode title="2nd vs 7th Seed" seed1={2} team1={east[1]} seed2={7} label2="Winner 7/8" />
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl mx-auto bg-amber-500/[0.04] backdrop-blur-sm border border-amber-500/10 rounded-2xl p-5 flex items-center gap-4 text-amber-500/80">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[11px] font-bold leading-relaxed">
              <strong className="text-amber-400">Live Seedings Note:</strong> This bracket represents the playoff picture if the season ended today. The 7th and 8th seeds in the main bracket will be finalized after the official SoFi Play-In Tournament concludes.
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
          className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-purple-500/10 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <div className="p-6 md:p-8 bg-purple-500/[0.03] border-b border-purple-500/10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3"><Ticket className="h-6 w-6 text-purple-400" /> Draft Lottery Odds</h2>
              <p className="text-sm text-slate-500 mt-1">Official probabilities for the 2026 #1 Overall Pick based on current reverse standings.</p>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-white/[0.01] border-b border-white/[0.04] text-[8px] font-black text-slate-600 uppercase tracking-[0.25em]">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5">Franchise</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center text-purple-400/70">#1 Pick %</div>
                <div className="col-span-2 text-center text-blue-400/70">Top 4 %</div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {lotteryTeams.map((t, i) => (
                  <Link key={t.id} to={`/nba/teams/${getAbbr(t)}`} className="grid grid-cols-12 gap-4 px-8 py-4 hover:bg-white/[0.02] transition-all duration-300 items-center group cursor-pointer block w-full relative">
                    <div className="col-span-1 text-center font-mono font-black text-slate-700">#{i + 1}</div>
                    <div className="col-span-5 flex items-center gap-4">
                      <img src={getLogo(t)} className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" alt={t.name} />
                      <span className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">{t.name}</span>
                    </div>
                    <div className="col-span-2 text-center font-mono font-bold text-slate-500">{t.wins}-{t.losses}</div>
                    <div className="col-span-2 flex items-center justify-center">
                      <Badge className="bg-purple-500/15 text-purple-400 border-none font-black text-sm px-3 py-1">
                        {LOTTERY_ODDS[i]?.pick1.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="font-mono font-black text-blue-400/80 text-sm">
                        {LOTTERY_ODDS[i]?.top4.toFixed(1)}%
                      </span>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[inset_0_0_40px_rgba(147,51,234,0.03)]" />
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
            { conf: east, label: "Eastern", color: "blue", dot: "bg-blue-500" },
            { conf: west, label: "Western", color: "red", dot: "bg-red-500" },
          ].map(({ conf, label, dot }) => (
            <div key={label} className="bg-[#0a0f18]/80 backdrop-blur-xl rounded-[2rem] border border-white/[0.05] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-white flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${dot}`} /> {label}
                </h2>
              </div>
              <div className="overflow-x-auto scrollbar-none flex-1">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.01] border-b border-white/[0.04] text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    <div className="col-span-5">Team</div>
                    <div className="col-span-1 text-center">W</div>
                    <div className="col-span-1 text-center">L</div>
                    <div className="col-span-2 text-center">PCT</div>
                    <div className="col-span-1 text-center">GB</div>
                    <div className="col-span-1 text-center">L10</div>
                    <div className="col-span-1 text-center">STRK</div>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
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

import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { ArrowLeft, Loader2, Activity, Target, Zap, Shield, Crown, BarChart3, TrendingUp, Star, Trophy, Award, Users } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { NBAPlayer } from "@/data/nba/mockData";
import { useFavorites } from "@/hooks/useFavorites";
import { motion } from "framer-motion";

const TEAM_COLORS: Record<string, string> = {
  "ATL": "#E03A3E", "BOS": "#007A33", "BKN": "#FFFFFF", "CHA": "#00788C", 
  "CHI": "#CE1141", "CLE": "#860038", "DAL": "#00A3E0", 
  "DEN": "#FEC524", "DET": "#C8102E", "GSW": "#1D428A", "HOU": "#CE1141", 
  "IND": "#FDBB30", "LAC": "#C8102E", "LAL": "#FDB927", "MEM": "#7399C6", 
  "MIA": "#98002E", "MIL": "#00471B", "MIN": "#78BE20", 
  "NOP": "#85714D", 
  "NYK": "#F58426", "OKC": "#007AC1", "ORL": "#0077C0", "PHI": "#006BB6", 
  "PHX": "#E56020", 
  "POR": "#E03A3E", "SAC": "#5A2D81", "SAS": "#C4CED4", "TOR": "#CE1141",
  "UTA": "#F9A01B", 
  "WAS": "#E31837"  
};

const formatHeight = (ht?: string) => {
  if (!ht || !ht.includes('-')) return ht || "-";
  const [feet, inches] = ht.split('-');
  return `${feet}' ${inches}"`;
};

const formatBirthdateAndAge = (dateStr?: string) => {
  if (!dateStr) return "-";
  try {
    const bDate = new Date(dateStr);
    const ageDiffMs = Date.now() - bDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${bDate.getMonth() + 1}/${bDate.getDate()}/${bDate.getFullYear()} (${age})`;
  } catch (e) {
    return dateStr;
  }
};

const getAwardIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("champion")) return <Trophy className="h-7 w-7 text-amber-400" />;
  if (t.includes("mvp") || t.includes("most valuable")) return <Crown className="h-7 w-7 text-cyan-400" />;
  if (t.includes("all-star")) return <Star className="h-7 w-7 text-amber-400" />;
  if (t.includes("defensive")) return <Shield className="h-7 w-7 text-emerald-400" />;
  if (t.includes("all-nba") || t.includes("rookie")) return <Users className="h-7 w-7 text-white" />;
  return <Award className="h-7 w-7 text-slate-400" />;
};

export default function NBAPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  
  const [player, setPlayer] = useState<NBAPlayer | null>(null);
  const [allPlayers, setAllPlayers] = useState<NBAPlayer[]>([]);
  const [bio, setBio] = useState<any>(null);
  const [onOffSwing, setOnOffSwing] = useState<number | null>(null); 
  const [accolades, setAccolades] = useState<any[]>([]); 
  
  const [isBaseLoading, setIsBaseLoading] = useState(true);
  const [isDeepDataLoading, setIsDeepDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "analytics" | "accolades">("stats");

  const { toggleFavorite, isFavorite } = useFavorites();
  const isFav = player ? isFavorite(player.id, 'player') : false;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsBaseLoading(true);

    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams()
    ]).then(([players, teams]) => {
      setAllPlayers(players);
      
      const foundPlayer = players.find(p => p.id === id);
      setPlayer(foundPlayer || null);

      if (foundPlayer) {
        setIsBaseLoading(false); 
        setIsDeepDataLoading(true); 

        const numericTeamId = teams.find(t => t.abbreviation === foundPlayer.teamId)?.id;

        const bioFetch = fetch(`/nba-api/commonplayerinfo?PlayerID=${id}`).then(res => res.json()).catch(() => null);
        
        let onOffFetch = Promise.resolve(null);
        if (numericTeamId && numericTeamId !== "FA") {
          onOffFetch = fetch(`/nba-api/teamplayeronoffdetails?DateFrom=&DateTo=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&TeamID=${numericTeamId}&VsConference=&VsDivision=`).then(res => res.json()).catch(() => null);
        }

        const awardsFetch = fetch(`/nba-api/playerawards?PlayerID=${id}`).then(res => res.json()).catch(() => null);

        Promise.all([bioFetch, onOffFetch, awardsFetch]).then(([bioData, onOffData, awardsData]) => {
          
          if (bioData) {
            try {
              const info = bioData.resultSets[0];
              const h = info.headers;
              const row = info.rowSet[0];
              setBio({
                firstName: row[h.indexOf('FIRST_NAME')], lastName: row[h.indexOf('LAST_NAME')],
                ht: formatHeight(row[h.indexOf('HEIGHT')]), wt: row[h.indexOf('WEIGHT')],
                dob: formatBirthdateAndAge(row[h.indexOf('BIRTHDATE')]),
                school: row[h.indexOf('SCHOOL')] || row[h.indexOf('COUNTRY')],
                jersey: row[h.indexOf('JERSEY')], pos: row[h.indexOf('POSITION')]
              });
            } catch (e) { console.error(e); }
          }

          if (onOffData) {
            try {
              const onSet = onOffData.resultSets.find((rs:any) => rs.name === "PlayersOnCourtTeamPlayerOnOffDetails");
              const offSet = onOffData.resultSets.find((rs:any) => rs.name === "PlayersOffCourtTeamPlayerOnOffDetails");
              const onRow = onSet?.rowSet.find((r:any) => r[1].toString() === id.toString());
              const offRow = offSet?.rowSet.find((r:any) => r[1].toString() === id.toString());
              if (onRow && offRow) {
                setOnOffSwing(onRow[onSet.headers.indexOf('NET_RATING')] - offRow[offSet.headers.indexOf('NET_RATING')]);
              } else setOnOffSwing(null);
            } catch (e) { setOnOffSwing(null); }
          }
          
          if (awardsData) {
            try {
              const set = awardsData.resultSets.find((s:any) => s.name === "PlayerAwards");
              if (set) {
                const h = set.headers;
                const counts: Record<string, number> = {};
                set.rowSet.forEach((row: any[]) => {
                  const desc = row[h.indexOf("DESCRIPTION")];
                  if (desc.includes("Week") || desc.includes("Month") || desc.includes("Community") || desc.includes("Olympic")) return;
                  counts[desc] = (counts[desc] || 0) + 1;
                });
                const parsedAccolades = Object.entries(counts)
                  .map(([title, count]) => ({ title, count, icon: getAwardIcon(title) }))
                  .sort((a, b) => b.count - a.count);
                setAccolades(parsedAccolades);
              }
            } catch (e) { console.error(e); }
          }
          
          setIsDeepDataLoading(false);
        });
      } else {
        setIsBaseLoading(false);
      }
    });
  }, [id]);

  const getRank = (statKey: keyof NBAPlayer['stats']) => {
    if (!allPlayers.length || !player) return null;
    const sorted = [...allPlayers].sort((a, b) => (b.stats[statKey] as number) - (a.stats[statKey] as number));
    const rank = sorted.findIndex(p => p.id === player.id) + 1;
    return rank ? `#${rank} in NBA` : null;
  };

  const getAdvRank = (statKey: keyof NBAPlayer['adv']) => {
    if (!allPlayers.length || !player || !player.adv) return null;
    const sorted = [...allPlayers].sort((a, b) => ((b.adv[statKey] as number) || 0) - ((a.adv[statKey] as number) || 0));
    const rank = sorted.findIndex(p => p.id === player.id) + 1;
    return rank ? `#${rank} in NBA` : null;
  };

  const radarData = useMemo(() => {
    if (!player || allPlayers.length === 0) return [];
    const calcP = (val: number, arr: number[], inv = false) => {
      if (!arr.length || val === undefined) return 50;
      const sorted = [...arr].sort((a, b) => a - b);
      const count = sorted.filter(v => v <= val).length;
      let pct = Math.round((count / sorted.length) * 100);
      return inv ? 100 - pct : pct; 
    };

    const dist = {
      pts: allPlayers.map(p => p.stats.ppg),
      ast: allPlayers.map(p => p.stats.apg),
      reb: allPlayers.map(p => p.stats.rpg),
      eff: allPlayers.map(p => p.adv?.ts || 0),
      def: allPlayers.map(p => (p.stats as any).defRating || 115).filter(v => v > 0),
      usg: allPlayers.map(p => p.adv?.usg || 0),
    };

    const pDefRating = (player.stats as any).defRating || 115;

    return [
      { stat: "Scoring", value: calcP(player.stats.ppg, dist.pts) },
      { stat: "Playmaking", value: calcP(player.stats.apg, dist.ast) },
      { stat: "Efficiency", value: calcP(player.adv?.ts || 0, dist.eff) },
      { stat: "Defense", value: calcP(pDefRating, dist.def, true) }, 
      { stat: "Usage", value: calcP(player.adv?.usg || 0, dist.usg) },
      { stat: "Rebounding", value: calcP(player.stats.rpg, dist.reb) },
    ];
  }, [player, allPlayers]);

  if (isBaseLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
        <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">Retrieving Player Dossier...</p>
      </div>
    );
  }

  if (!player) return <div className="text-white p-10 font-bold">Player not found.</div>;

  const s = player.stats;
  const a = player.adv || { ts: 0, usg: 0, pie: 0, per: 15 };
  const logoUrl = nbaService.getTeamLogoUrl(player.teamId);
  const themeColor = TEAM_COLORS[player.teamId] || "#4279f5"; 

  const fName = bio?.firstName || player.name.split(" ")[0];
  const lName = bio?.lastName || player.name.split(" ").slice(1).join(" ");
  const position = bio?.pos || player.position || "NBA";
  const jersey = bio?.jersey ? `#${bio.jersey}` : "";

  const dRtg = (player.stats as any).defRating || 115.5;
  const netRtg = (player.stats as any).netRtg || 0;
  const oRtg = (dRtg + netRtg).toFixed(1);
  const swingDisplay = onOffSwing !== null ? (onOffSwing > 0 ? `+${onOffSwing.toFixed(1)}` : onOffSwing.toFixed(1)) : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 pb-16 max-w-5xl mx-auto px-4"
    >
      
      <div>
        <Link to={`/${sport}/players`} className="group inline-flex items-center gap-2 text-[9px] font-black text-slate-600 hover:text-cyan-400 transition-all duration-300 uppercase tracking-[0.25em] w-max">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Roster
        </Link>
      </div>

      {/* PLAYER HERO CARD */}
      <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.06)] relative border border-white/[0.05]">
        
        {/* Theme glow */}
        <div className="absolute -right-20 -top-20 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 pointer-events-none" style={{ backgroundColor: themeColor }} />
        <div className="absolute -left-20 -bottom-20 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }} />

        {/* Giant watermark */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.06] pointer-events-none flex items-center justify-end z-0">
          <img src={logoUrl} alt="Team Logo" className="w-full h-full object-contain" />
        </div>

        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${themeColor}40, transparent)` }} />

        <div className="flex flex-col md:flex-row relative z-10">
          
          {/* Photo */}
          <div className="w-full md:w-5/12 bg-gradient-to-tr from-[#030712] to-[#0a0f18]/90 flex items-end justify-center pt-10 relative overflow-hidden border-r border-white/[0.04] backdrop-blur-sm">
            <div className="absolute bottom-0 w-3/4 h-8 bg-black blur-2xl rounded-full" />
            <img 
              src={player.imageUrl} 
              alt={player.name} 
              className="w-[90%] h-auto object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] relative z-10" 
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=fff&size=512`; }}
            />
          </div>

          {/* Bio */}
          <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
            <div className="mb-4">
              <h2 className="text-slate-500 text-xl md:text-2xl font-light uppercase tracking-[0.15em] leading-none mb-1">{fName}</h2>
              <h1 className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 text-4xl md:text-5xl font-black uppercase tracking-tight leading-none">{lName}</h1>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="h-7 w-7 bg-white rounded-full flex items-center justify-center p-1 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                <img src={logoUrl} alt={player.teamId} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-bold text-white/80">{player.teamName}</span>
              <span className="text-slate-700 font-black">•</span>
              <span className="text-sm font-bold text-white/80">{position} {jersey}</span>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { label: "HT/WT", value: isDeepDataLoading ? null : `${bio?.ht || "-"}, ${bio?.wt ? bio.wt + ' lbs' : "-"}` },
                { label: "Birthdate", value: isDeepDataLoading ? null : bio?.dob || "-" },
                { label: "College", value: isDeepDataLoading ? null : bio?.school || "-" },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr] items-center">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{row.label}</span>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    {row.value === null ? <Loader2 className="h-3 w-3 animate-spin text-slate-700" /> : row.value}
                  </span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => toggleFavorite({
                id: player.id, type: 'player', name: player.name, 
                subtitle: player.teamId, imageUrl: player.imageUrl, url: `/nba/players/${player.id}`
              })}
              className="w-40 font-black py-2.5 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:brightness-110 hover:scale-105 flex items-center justify-center gap-2 text-sm"
              style={{ 
                backgroundColor: isFav ? 'transparent' : themeColor,
                color: isFav ? themeColor : '#fff',
                border: isFav ? `2px solid ${themeColor}` : '2px solid transparent',
                boxShadow: isFav ? 'none' : `0 0 25px ${themeColor}30`
              }}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              {isFav ? 'Following' : 'Follow'}
            </button>

          </div>
        </div>

        {/* STAT BAR */}
        <div className="bg-[#030712]/80 border-t border-white/[0.04] relative z-10">
          <div className="bg-black/40 py-1.5 border-b border-white/[0.04] text-center">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">2025-26 Regular Season Stats</h3>
          </div>
          <div className="grid grid-cols-4 py-4 md:py-5 px-4 divide-x divide-white/[0.04]">
            {[
              { label: "PTS", val: s.ppg.toFixed(1), rank: getRank("ppg") },
              { label: "REB", val: s.rpg.toFixed(1), rank: getRank("rpg") },
              { label: "AST", val: s.apg.toFixed(1), rank: getRank("apg") },
              { label: "FG%", val: s.fgPct.toFixed(1), rank: getRank("fgPct") },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center"
              >
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-1">{stat.label}</span>
                <span className="text-2xl md:text-3xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{stat.val}</span>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1.5" style={{ color: themeColor }}>{stat.rank}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 bg-white/[0.02] backdrop-blur-xl p-2 rounded-2xl border border-white/[0.05] w-fit mx-auto lg:mx-0 mt-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
        {[
          { key: "stats" as const, icon: BarChart3, label: "Box Score" },
          { key: "analytics" as const, icon: Activity, label: "Analytics" },
          { key: "accolades" as const, icon: Trophy, label: "Career Accolades" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 border ${
              activeTab === tab.key ? 'text-white border-white/[0.08] bg-white/[0.04]' : 'text-slate-600 hover:text-white border-transparent'
            }`}
            style={activeTab === tab.key ? { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` } : {}}
          >
            <tab.icon className="h-4 w-4" style={{ color: activeTab === tab.key ? themeColor : '' }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10"
      >
        
        {/* BOX SCORE */}
        {activeTab === "stats" && (
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-8 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)]">
            <h3 className="text-lg font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 flex items-center gap-3 mb-8">
              <BarChart3 className="h-5 w-5" style={{ color: themeColor }} /> Regular Season Totals & Averages
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "MIN", val: s.mpg }, { label: "PTS", val: s.ppg.toFixed(1) }, { label: "REB", val: s.rpg.toFixed(1) }, { label: "AST", val: s.apg.toFixed(1) }, { label: "STL", val: s.spg },
                { label: "BLK", val: s.bpg }, { label: "TOV", val: s.topg }, { label: "FG%", val: s.fgPct, suf: "%" }, { label: "3PT%", val: s.threePct, suf: "%" }, { label: "FT%", val: s.ftPct, suf: "%" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex flex-col bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl items-center text-center hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-2">{stat.label}</span>
                  <span className="text-2xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]">{stat.val}{stat.suf}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-6 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-20" style={{ backgroundColor: themeColor }} />
               <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-center mb-4">Percentile Analytics</h3>
               <div className="h-[280px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.04)" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 800 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#030712', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                      <Radar name={player.name} dataKey="value" stroke={themeColor} fill={themeColor} fillOpacity={0.15} strokeWidth={3} dot={{ r: 3, fill: "#030712", stroke: themeColor, strokeWidth: 2 }} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-8 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] flex flex-col justify-center relative">
               {isDeepDataLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/80 backdrop-blur-sm z-20 rounded-[2rem]">
                   <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                 </div>
               )}
               <h3 className="text-lg font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 flex items-center gap-3 mb-8">
                 <Zap className="h-5 w-5" style={{ color: themeColor }} /> Advanced Impact Metrics
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Offensive Rtg", val: oRtg, suf: "", icon: <Target className="h-4 w-4 text-orange-400"/>, rank: null },
                    { label: "Defensive Rtg", val: dRtg.toFixed(1), suf: "", icon: <Shield className="h-4 w-4 text-emerald-400"/>, rank: null },
                    { label: "Net Rating", val: netRtg > 0 ? `+${netRtg.toFixed(1)}` : netRtg.toFixed(1), suf: "", icon: <TrendingUp className="h-4 w-4 text-cyan-400"/>, rank: null },
                    { label: "Real On/Off Swing", val: swingDisplay, suf: "", icon: <Activity className="h-4 w-4 text-purple-400"/>, rank: null },
                    { label: "Player Eff. (PER)", val: a.per.toFixed(1), suf: "", icon: <Crown className="h-4 w-4 text-amber-400"/>, rank: getAdvRank("per") },
                    { label: "Impact (PIE)", val: a.pie.toFixed(1), suf: "%", icon: <BarChart3 className="h-4 w-4 text-blue-400"/>, rank: getAdvRank("pie") },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 md:p-5 hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] flex flex-col justify-center relative"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {m.icon}
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.25em]">{m.label}</span>
                      </div>
                      <div className="flex items-end gap-2">
                         <span className="text-2xl md:text-3xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]">{m.val}<span className="text-base md:text-lg text-slate-700 font-sans ml-1">{m.suf}</span></span>
                      </div>
                      {m.rank && (
                        <div className="absolute bottom-4 right-4 text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: themeColor }}>
                          {m.rank}
                        </div>
                      )}
                    </motion.div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* CAREER ACCOLADES */}
        {activeTab === "accolades" && (
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] p-8 shadow-[0_0_40px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] relative overflow-hidden min-h-[300px]">
            <Trophy className="absolute -bottom-10 -right-10 h-60 w-60 text-white/[0.02] pointer-events-none" />
            
            {isDeepDataLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                 <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-4" />
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/70">Verifying NBA History...</p>
               </div>
            ) : (
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 flex items-center gap-3 mb-10">
                  <Crown className="h-5 w-5" style={{ color: themeColor }} /> Official Major Achievements
                </h3>
                
                {accolades.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accolades.map((award, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 flex items-center gap-5 hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] group"
                      >
                        <div className="p-3 bg-black/30 rounded-2xl border border-white/[0.04] group-hover:scale-110 transition-transform duration-300">
                          {award.icon}
                        </div>
                        <div>
                          <span className="text-4xl font-black font-mono text-white leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]">{award.count}<span className="text-xl text-slate-700 ml-1 font-sans">x</span></span>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1.5 leading-tight">{award.title}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 flex flex-col items-center justify-center bg-black/20 rounded-[2rem] border border-dashed border-white/[0.06]">
                    <Award className="h-12 w-12 text-slate-800 mb-4" />
                    <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-xs">No major accolades recorded</p>
                    <p className="text-slate-700 text-[10px] mt-2 max-w-sm">This player has not yet received a major award tracked by the official database.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </motion.div>
    </motion.div>
  );
}
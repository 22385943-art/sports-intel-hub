import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { ArrowLeft, Loader2, Activity, Target, Zap, Shield, Crown, BarChart3, TrendingUp, Star, Trophy, Award, Users } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { NBAPlayer } from "@/data/nba/mockData";
import { useFavorites } from "@/hooks/useFavorites"; 
import ShotChart from "@/components/ShotChart";

// 🎨 PALETA DE COLORES
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
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [bio, setBio] = useState<any>(null);
  const [onOffSwing, setOnOffSwing] = useState<number | null>(null); 
  const [accolades, setAccolades] = useState<any[]>([]); 
  const [shots, setShots] = useState<any[]>([]); 
  const [gameLog, setGameLog] = useState<any[]>([]);
  
  const [isBaseLoading, setIsBaseLoading] = useState(true);
  const [isDeepDataLoading, setIsDeepDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "analytics" | "shotchart" | "accolades" | "splits">("stats");

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
      setAllTeams(teams); 
      
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
        
        // 🚀 FIX: Forzamos expresamente la temporada actual para el Shot Chart
        const shotsFetch = nbaService.getPlayerShotChart(id, "2025-26"); 
        
        const gameLogFetch = nbaService.getPlayerGameLog(id);

        Promise.all([bioFetch, onOffFetch, awardsFetch, shotsFetch, gameLogFetch]).then(([bioData, onOffData, awardsData, shotData, logData]) => {
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
          
          setShots(shotData || []); 
          setGameLog(logData || []);
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
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Retrieving Player Dossier...</p>
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
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-5xl mx-auto px-4">
      
      <div>
        <Link to={`/${sport}/players`} className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] w-max">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Roster
        </Link>
      </div>

      {/* ═══════════════════ PLAYER HERO CARD ═══════════════════ */}
      <div className="bg-[#1a1a1a] rounded-[1.5rem] overflow-hidden shadow-2xl relative border border-white/5">
        <div className="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full blur-[100px] opacity-25 pointer-events-none" style={{ backgroundColor: themeColor }} />
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.85] pointer-events-none flex items-center justify-end z-0">
          <img src={logoUrl} alt="Team Logo" className="w-full h-full object-contain mix-blend-overlay drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
        </div>

        <div className="flex flex-col md:flex-row relative z-10">
          <div className="w-full md:w-5/12 bg-gradient-to-tr from-[#111] to-[#1c1c1c]/90 flex items-end justify-center pt-10 relative overflow-hidden border-r border-white/5 backdrop-blur-sm">
            <div className="absolute bottom-0 w-3/4 h-8 bg-black blur-2xl rounded-full" />
            <img 
              src={player.imageUrl} 
              alt={player.name} 
              className="w-[90%] h-auto object-contain object-bottom drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] relative z-10" 
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=fff&size=512`; }}
            />
          </div>

          <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-[#1a1a1a]/70 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-[#a0a0a0] text-xl md:text-2xl font-light uppercase tracking-widest leading-none mb-1">{fName}</h2>
              <h1 className="text-white text-4xl md:text-5xl font-bold uppercase tracking-tight leading-none">{lName}</h1>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="h-6 w-6 bg-white rounded-full flex items-center justify-center p-1 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <img src={logoUrl} alt={player.teamId} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-bold text-[#d0d0d0]">{player.teamName}</span>
              <span className="text-[#666] font-black mb-1">•</span>
              <span className="text-sm font-bold text-[#d0d0d0]">{position} {jersey}</span>
            </div>

            <div className="space-y-3 mb-8">
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">HT/WT</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {isDeepDataLoading ? <Loader2 className="h-3 w-3 animate-spin text-[#777]" /> : `${bio?.ht || "-"}, ${bio?.wt ? bio.wt + ' lbs' : "-"}`}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">Birthdate</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {isDeepDataLoading ? <Loader2 className="h-3 w-3 animate-spin text-[#777]" /> : bio?.dob || "-"}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">College</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {isDeepDataLoading ? <Loader2 className="h-3 w-3 animate-spin text-[#777]" /> : bio?.school || "-"}
                </span>
              </div>
            </div>

            <button 
              onClick={() => toggleFavorite({
                id: player.id, type: 'player', name: player.name, 
                subtitle: player.teamId, imageUrl: player.imageUrl, url: `/nba/players/${player.id}`
              })}
              className="w-40 font-bold py-2.5 rounded-full transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:brightness-110 hover:scale-105 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: isFav ? '#111' : themeColor,
                color: isFav ? themeColor : '#fff',
                border: isFav ? `1px solid ${themeColor}` : 'none'
              }}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              {isFav ? 'Following' : 'Follow'}
            </button>

          </div>
        </div>

        <div className="bg-[#121212] border-t border-[#2a2a2a] relative z-10">
          <div className="bg-black py-1.5 border-b border-[#2a2a2a] text-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white">2025-26 Regular Season Stats</h3>
          </div>
          <div className="grid grid-cols-4 py-4 md:py-5 px-4 divide-x divide-[#2a2a2a]">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">PTS</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.ppg.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("ppg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">REB</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.rpg.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("rpg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">AST</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.apg.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("apg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">FG%</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.fgPct.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("fgPct")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 TABS SECUNDARIAS */}
      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 bg-[#0a0f18] p-2 rounded-2xl border border-white/5 w-fit mx-auto lg:mx-0 mt-8 shadow-xl">
        <button onClick={() => setActiveTab("stats")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "stats" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "stats" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "stats" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <BarChart3 className="h-4 w-4" style={{ color: activeTab === "stats" ? themeColor : '' }} /> Box Score
        </button>
        <button onClick={() => setActiveTab("analytics")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "analytics" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "analytics" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "analytics" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <Activity className="h-4 w-4" style={{ color: activeTab === "analytics" ? themeColor : '' }} /> Analytics
        </button>
        <button onClick={() => setActiveTab("shotchart")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "shotchart" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "shotchart" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "shotchart" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <Target className="h-4 w-4" style={{ color: activeTab === "shotchart" ? themeColor : '' }} /> Shot Chart
        </button>
        <button onClick={() => setActiveTab("accolades")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "accolades" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "accolades" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "accolades" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <Trophy className="h-4 w-4" style={{ color: activeTab === "accolades" ? themeColor : '' }} /> Accolades
        </button>
        <button onClick={() => setActiveTab("splits")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "splits" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "splits" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "splits" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <TrendingUp className="h-4 w-4" style={{ color: activeTab === "splits" ? themeColor : '' }} /> Context Splits
        </button>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500 relative z-10">
        
        {activeTab === "stats" && (
          <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-8">
              <BarChart3 className="h-5 w-5" style={{ color: themeColor }} /> Regular Season Totals & Averages
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[
                { label: "MIN", val: s.mpg }, { label: "PTS", val: s.ppg.toFixed(1) }, { label: "REB", val: s.rpg.toFixed(1) }, { label: "AST", val: s.apg.toFixed(1) }, { label: "STL", val: s.spg },
                { label: "BLK", val: s.bpg }, { label: "TOV", val: s.topg }, { label: "FG%", val: s.fgPct, suf: "%" }, { label: "3PT%", val: s.threePct, suf: "%" }, { label: "FT%", val: s.ftPct, suf: "%" },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col bg-[#111] border border-white/5 p-4 rounded-2xl items-center text-center hover:border-white/10 transition-colors shadow-inner">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#777] mb-2">{stat.label}</span>
                  <span className="text-2xl font-mono font-bold text-white">{stat.val}{stat.suf}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-30" style={{ backgroundColor: themeColor }} />
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-4">Percentile Analytics</h3>
               <div className="h-[280px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "#888", fontSize: 9, fontWeight: 800 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', color: '#fff' }} />
                      <Radar name={player.name} dataKey="value" stroke={themeColor} fill={themeColor} fillOpacity={0.25} strokeWidth={2.5} dot={{ r: 3, fill: "#111", stroke: themeColor, strokeWidth: 2 }} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-center relative">
               {isDeepDataLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]/80 backdrop-blur-sm z-20 rounded-[2rem]">
                   <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                 </div>
               )}
               <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-8">
                 <Zap className="h-5 w-5" style={{ color: themeColor }} /> Advanced Impact Metrics
               </h3>
               <div className="grid grid-cols-2 gap-5">
                  {[
                    { label: "Offensive Rtg", val: oRtg, suf: "", icon: <Target className="h-4 w-4 text-orange-400"/>, rank: null },
                    { label: "Defensive Rtg", val: dRtg.toFixed(1), suf: "", icon: <Shield className="h-4 w-4 text-emerald-400"/>, rank: null },
                    { label: "Net Rating", val: netRtg > 0 ? `+${netRtg.toFixed(1)}` : netRtg.toFixed(1), suf: "", icon: <TrendingUp className="h-4 w-4 text-cyan-400"/>, rank: null },
                    { label: "Real On/Off Swing", val: swingDisplay, suf: "", icon: <Activity className="h-4 w-4 text-purple-400"/>, rank: null },
                    { label: "Player Eff. (PER)", val: a.per.toFixed(1), suf: "", icon: <Crown className="h-4 w-4 text-amber-400"/>, rank: getAdvRank("per") },
                    { label: "Impact (PIE)", val: a.pie.toFixed(1), suf: "%", icon: <BarChart3 className="h-4 w-4 text-blue-400"/>, rank: getAdvRank("pie") },
                  ].map((m, i) => (
                    <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-4 md:p-5 hover:border-white/10 transition-colors shadow-inner flex flex-col justify-center relative">
                      <div className="flex items-center gap-2 mb-2">
                        {m.icon}
                        <span className="text-[9px] font-black text-[#777] uppercase tracking-widest">{m.label}</span>
                      </div>
                      <div className="flex items-end gap-2">
                         <span className="text-2xl md:text-3xl font-mono font-black text-white leading-none">{m.val}<span className="text-base md:text-lg text-[#666] font-sans ml-1">{m.suf}</span></span>
                      </div>
                      {m.rank && (
                        <div className="absolute bottom-4 right-4 text-[8px] font-black uppercase tracking-widest" style={{ color: themeColor }}>
                          {m.rank}
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === "shotchart" && (
          <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden min-h-[400px] flex items-center justify-center">
            {isDeepDataLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                 <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Loading Shot Spatial Data...</p>
               </div>
            ) : (
               <ShotChart shots={shots} />
            )}
          </div>
        )}

        {activeTab === "accolades" && (
          <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden min-h-[300px]">
            <Trophy className="absolute -bottom-10 -right-10 h-60 w-60 text-white/[0.03] pointer-events-none" />
            {isDeepDataLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                 <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Verifying NBA History...</p>
               </div>
            ) : (
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-10">
                  <Crown className="h-5 w-5" style={{ color: themeColor }} /> Official Major Achievements
                </h3>
                {accolades.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accolades.map((award, i) => (
                      <div key={i} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex items-center gap-5 hover:border-white/10 transition-colors shadow-inner group">
                        <div className="p-3 bg-black/50 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
                          {award.icon}
                        </div>
                        <div>
                          <span className="text-4xl font-black font-mono text-white leading-none">{award.count}<span className="text-xl text-[#666] ml-1 font-sans">x</span></span>
                          <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-wider mt-1.5 leading-tight">{award.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 flex flex-col items-center justify-center bg-black/20 rounded-3xl border border-dashed border-white/10">
                    <Award className="h-12 w-12 text-[#444] mb-4" />
                    <p className="text-[#888] font-bold uppercase tracking-widest text-xs">No major accolades recorded</p>
                    <p className="text-[#555] text-[10px] mt-2 max-w-sm">This player has not yet received a major award (All-Star, MVP, All-NBA) tracked by the official database.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 🚀 TAB 5: CONTEXT SPLITS (Fraud Detector FIX) */}
        {activeTab === "splits" && (
          <div className="space-y-6">
            <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5" style={{ color: themeColor }} /> Performance Context
            </h3>

            {(() => {
              if (!gameLog.length || !allTeams.length) return <div className="text-[#888]">Insufficient game data for splits.</div>;
              
              const getAverages = (games: any[]) => {
                if (!games.length) return { pts: 0, reb: 0, ast: 0, ts: 0, count: 0 };
                const totals = games.reduce((acc, g) => ({
                  pts: acc.pts + g.pts, reb: acc.reb + g.reb, ast: acc.ast + g.ast, ts: acc.ts + (g.ts || 0)
                }), { pts: 0, reb: 0, ast: 0, ts: 0 });
                return {
                  pts: (totals.pts / games.length).toFixed(1),
                  reb: (totals.reb / games.length).toFixed(1),
                  ast: (totals.ast / games.length).toFixed(1),
                  ts: (totals.ts / games.length).toFixed(1),
                  count: games.length
                };
              };

              const wins = gameLog.filter(g => g.wl === "W");
              const losses = gameLog.filter(g => g.wl === "L");
              const home = gameLog.filter(g => g.isHome);
              const away = gameLog.filter(g => !g.isHome);
              
              // 🚀 LÓGICA DE CONTENDERS CORREGIDA: Cruzamos con la lista oficial de equipos
              const contenders = gameLog.filter(g => {
                const oppTeam = allTeams.find(t => t.abbreviation.toLowerCase() === g.opponent.toLowerCase());
                if (!oppTeam) return false;
                const winPct = oppTeam.wins / (oppTeam.wins + oppTeam.losses);
                return winPct >= 0.500;
              });
              
              const lottery = gameLog.filter(g => {
                const oppTeam = allTeams.find(t => t.abbreviation.toLowerCase() === g.opponent.toLowerCase());
                if (!oppTeam) return false;
                const winPct = oppTeam.wins / (oppTeam.wins + oppTeam.losses);
                return winPct < 0.500;
              });

              const renderSplitCard = (titleA: string, dataA: any, titleB: string, dataB: any, colorA: string, colorB: string) => (
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-6 shadow-2xl flex flex-col md:flex-row gap-4 relative overflow-hidden">
                  <div className="flex-1 bg-[#111] border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colorA }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 block">{titleA} ({dataA.count}G)</span>
                    <div className="flex justify-between items-end">
                      <div><span className="block text-2xl font-black text-white">{dataA.pts}</span><span className="text-[9px] font-bold text-[#666] uppercase">PTS</span></div>
                      <div><span className="block text-2xl font-black text-white">{dataA.reb}</span><span className="text-[9px] font-bold text-[#666] uppercase">REB</span></div>
                      <div><span className="block text-2xl font-black text-white">{dataA.ast}</span><span className="text-[9px] font-bold text-[#666] uppercase">AST</span></div>
                      <div><span className="block text-2xl font-black" style={{ color: colorA }}>{dataA.ts}%</span><span className="text-[9px] font-bold text-[#666] uppercase">TS%</span></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#111] border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colorB }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 block">{titleB} ({dataB.count}G)</span>
                    <div className="flex justify-between items-end">
                      <div><span className="block text-2xl font-black text-white">{dataB.pts}</span><span className="text-[9px] font-bold text-[#666] uppercase">PTS</span></div>
                      <div><span className="block text-2xl font-black text-white">{dataB.reb}</span><span className="text-[9px] font-bold text-[#666] uppercase">REB</span></div>
                      <div><span className="block text-2xl font-black text-white">{dataB.ast}</span><span className="text-[9px] font-bold text-[#666] uppercase">AST</span></div>
                      <div><span className="block text-2xl font-black" style={{ color: colorB }}>{dataB.ts}%</span><span className="text-[9px] font-bold text-[#666] uppercase">TS%</span></div>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="space-y-6">
                  {renderSplitCard("vs. Contenders (>.500)", getAverages(contenders), "vs. Lottery (<.500)", getAverages(lottery), "#10b981", "#f43f5e")}
                  {renderSplitCard("In Wins", getAverages(wins), "In Losses", getAverages(losses), "#3b82f6", "#8b5cf6")}
                  {renderSplitCard("Home Games", getAverages(home), "Road Games", getAverages(away), "#f59e0b", "#64748b")}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
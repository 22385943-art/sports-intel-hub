import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trophy, Crown, Medal, ShieldAlert, Star, Award, Zap, Target, Brain, Activity, Crosshair, MapPin, CalendarDays, Hash, ArrowRight } from "lucide-react";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

// 🧠 IA SCOUTING V2.0: MOTOR DE ARQUETIPOS
const getArchetype = (p: any) => {
  if (!p || !p.stats || !p.adv) return { label: "Unknown", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
  const { ppg, rpg, apg, bpg, spg, threePct, fgPct, fta } = p.stats;
  const { usg, defRating, astPct, ts, pie } = p.adv;

  const isEliteDefender = defRating > 0 && defRating <= 111; 
  const isShooter = threePct >= 37.0 && ppg >= 8; 
  const isSlasher = fta >= 5.5 && fgPct >= 50 && threePct <= 34;
  const isUnicorn = bpg >= 2.0 && threePct >= 31 && rpg >= 8;

  if (pie >= 16 && ppg >= 23) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
    if (apg >= 8) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isShooter && ts >= 60) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  }
  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  if (apg >= 8 || astPct >= 35) return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  if (rpg >= 8.5) {
     if (threePct >= 35) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
     if ((bpg >= 1.5 || isEliteDefender) && threePct <= 30) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" };
     if (apg >= 4.5) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
     return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  }
  if (isSlasher && ppg >= 18) return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  if (isShooter && ppg >= 18) return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  if (isShooter && isEliteDefender && usg < 22) return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  if (isEliteDefender && (spg >= 1.4 || bpg >= 1.0) && usg < 18) return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/30" };
  
  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
};

// 🏆 BÓVEDA HISTÓRICA: BIOGRAFÍA, TRAYECTORIA Y RANKINGS DE CARRERA
const PLAYER_BIO_DB: Record<string, any> = {
  "LeBron James": {
    nicknames: ["King James", "The Chosen One", "LBJ"],
    draft: "2003 R1 Pick 1 (CLE)", origin: "St. Vincent-St. Mary HS (OH)",
    trajectory: [ { t: "CLE", y: "03-10" }, { t: "MIA", y: "10-14" }, { t: "CLE", y: "14-18" }, { t: "LAL", y: "18-Pres" } ],
    totals: { pts: { v: "40,474", r: 1 }, reb: { v: "11,185", r: 30 }, ast: { v: "11,009", r: 4 }, stl: { v: "2,275", r: 8 }, blk: { v: "1,111", r: 90 } },
    avgs: { pts: { v: "27.1", r: 6 }, reb: { v: "7.5", r: "Unranked" }, ast: { v: "7.4", r: 26 }, stl: { v: "1.5", r: 67 }, blk: { v: "0.7", r: "Unranked" } }
  },
  "Nikola Jokić": {
    nicknames: ["The Joker", "Big Honey"],
    draft: "2014 R2 Pick 41 (DEN)", origin: "Mega Leks (Serbia)",
    trajectory: [ { t: "DEN", y: "2015-Pres" } ],
    totals: { pts: { v: "14,139", r: 180 }, reb: { v: "7,249", r: 110 }, ast: { v: "4,667", r: 85 }, stl: { v: "822", r: 200 }, blk: { v: "481", r: 300 } },
    avgs: { pts: { v: "20.9", r: 45 }, reb: { v: "10.7", r: 40 }, ast: { v: "6.9", r: 35 }, stl: { v: "1.2", r: 150 }, blk: { v: "0.7", r: "Unranked" } }
  },
  "Stephen Curry": {
    nicknames: ["Chef Curry", "The Baby-Faced Assassin"],
    draft: "2009 R1 Pick 7 (GSW)", origin: "Davidson",
    trajectory: [ { t: "GSW", y: "2009-Pres" } ],
    totals: { pts: { v: "23,668", r: 30 }, reb: { v: "4,509", r: 350 }, ast: { v: "6,119", r: 38 }, stl: { v: "1,473", r: 52 }, blk: { v: "235", r: "Unranked" } },
    avgs: { pts: { v: "24.8", r: 16 }, reb: { v: "4.7", r: "Unranked" }, ast: { v: "6.4", r: 65 }, stl: { v: "1.5", r: 65 }, blk: { v: "0.2", r: "Unranked" } }
  },
  "Giannis Antetokounmpo": {
    nicknames: ["The Greek Freak"],
    draft: "2013 R1 Pick 15 (MIL)", origin: "Filathlitikos (Greece)",
    trajectory: [ { t: "MIL", y: "2013-Pres" } ],
    totals: { pts: { v: "18,502", r: 76 }, reb: { v: "7,732", r: 85 }, ast: { v: "3,855", r: 140 }, stl: { v: "903", r: 160 }, blk: { v: "986", r: 105 } },
    avgs: { pts: { v: "23.4", r: 25 }, reb: { v: "9.8", r: 55 }, ast: { v: "4.9", r: 150 }, stl: { v: "1.1", r: 200 }, blk: { v: "1.2", r: 80 } }
  },
  "Luka Dončić": {
    nicknames: ["Luka Magic", "El Matador"],
    draft: "2018 R1 Pick 3 (ATL -> DAL)", origin: "Real Madrid (Spain)",
    trajectory: [ { t: "DAL", y: "2018-Pres" } ],
    totals: { pts: { v: "11,470", r: 250 }, reb: { v: "3,472", r: "Unranked" }, ast: { v: "3,317", r: 180 }, stl: { v: "473", r: "Unranked" }, blk: { v: "185", r: "Unranked" } },
    avgs: { pts: { v: "28.7", r: 3 }, reb: { v: "8.7", r: 85 }, ast: { v: "8.3", r: 11 }, stl: { v: "1.2", r: 160 }, blk: { v: "0.5", r: "Unranked" } }
  },
  "Victor Wembanyama": {
    nicknames: ["Wemby", "The Alien"],
    draft: "2023 R1 Pick 1 (SAS)", origin: "Metropolitans 92 (France)",
    trajectory: [ { t: "SAS", y: "2023-Pres" } ],
    totals: { pts: { v: "1,522", r: "N/A" }, reb: { v: "755", r: "N/A" }, ast: { v: "274", r: "N/A" }, stl: { v: "88", r: "N/A" }, blk: { v: "254", r: "N/A" } },
    avgs: { pts: { v: "21.4", r: "N/A" }, reb: { v: "10.6", r: "N/A" }, ast: { v: "3.9", r: "N/A" }, stl: { v: "1.2", r: "N/A" }, blk: { v: "3.6", r: 1 } }
  },
};

const ACCOLADES_DB: Record<string, any[]> = {
  "Nikola Jokić": [
    { type: "ring", title: "NBA Champion", count: 1, years: "2023", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Trophy },
    { type: "mvp", title: "NBA MVP", count: 3, years: "2021, 2022, 2024", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: Crown },
    { type: "fmvp", title: "Finals MVP", count: 1, years: "2023", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20", icon: Medal },
    { type: "allnba", title: "All-NBA 1st Team", count: 4, years: "2019, 2021, 2022, 2024", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", icon: Award },
  ],
  "LeBron James": [
    { type: "ring", title: "NBA Champion", count: 4, years: "2012, 2013, 2016, 2020", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Trophy },
    { type: "mvp", title: "NBA MVP", count: 4, years: "2009, 2010, 2012, 2013", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: Crown },
    { type: "fmvp", title: "Finals MVP", count: 4, years: "2012, 2013, 2016, 2020", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20", icon: Medal },
    { type: "allstar", title: "NBA All-Star", count: 20, years: "2005-2024", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", icon: Star },
  ],
  "Stephen Curry": [
    { type: "ring", title: "NBA Champion", count: 4, years: "2015, 2017, 2018, 2022", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Trophy },
    { type: "mvp", title: "NBA MVP", count: 2, years: "2015, 2016", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: Crown },
    { type: "allnba", title: "All-NBA 1st Team", count: 4, years: "Multiple", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", icon: Award },
  ],
  "Giannis Antetokounmpo": [
    { type: "ring", title: "NBA Champion", count: 1, years: "2021", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Trophy },
    { type: "mvp", title: "NBA MVP", count: 2, years: "2019, 2020", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: Crown },
    { type: "dpoy", title: "Def. Player of the Year", count: 1, years: "2020", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", icon: ShieldAlert },
  ],
  "Luka Dončić": [
    { type: "allnba", title: "All-NBA 1st Team", count: 5, years: "2020-2024", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", icon: Award },
    { type: "allstar", title: "NBA All-Star", count: 5, years: "2020-2024", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", icon: Star },
  ],
  "Victor Wembanyama": [
    { type: "roy", title: "Rookie of the Year", count: 1, years: "2024", color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20", icon: Star },
    { type: "dpoy", title: "All-Defensive 1st Team", count: 1, years: "2024", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", icon: ShieldAlert },
  ],
};


export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [gameLog, setGameLog] = useState<any[]>([]);
  const [percentiles, setPercentiles] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // TABS ÉLITE
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.getPlayerGameLog(id)
    ]).then(([players, gLog]) => {
      const targetPlayer = players.find(p => p.id === id);
      
      if (targetPlayer) {
        const adv = nbaService.computeAllAdvanced(targetPlayer);
        const archetype = getArchetype({ ...targetPlayer, adv });
        const pWithAdv = { ...targetPlayer, adv, archetype };
        setPlayer(pWithAdv);

        const distributions: Record<string, number[]> = {
          ppg: players.map(p => p.stats.ppg).sort((a, b) => a - b),
          rpg: players.map(p => p.stats.rpg).sort((a, b) => a - b),
          apg: players.map(p => p.stats.apg).sort((a, b) => a - b),
          per: players.map(p => nbaService.computeAllAdvanced(p).per).sort((a, b) => a - b),
          bpm: players.map(p => nbaService.computeAllAdvanced(p).bpm).sort((a, b) => a - b),
          ts: players.map(p => nbaService.computeAllAdvanced(p).ts).sort((a, b) => a - b),
        };

        const calcP = (val: number, arr: number[]) => Math.round((arr.filter(v => v <= val).length / arr.length) * 100);

        setPercentiles({
          Scoring: calcP(pWithAdv.stats.ppg, distributions.ppg),
          Rebounding: calcP(pWithAdv.stats.rpg, distributions.rpg),
          Playmaking: calcP(pWithAdv.stats.apg, distributions.apg),
          Efficiency: calcP(pWithAdv.adv.per, distributions.per),
          Impact: calcP(pWithAdv.adv.bpm, distributions.bpm),
          Shooting: calcP(pWithAdv.adv.ts, distributions.ts),
        });
      }
      setGameLog(gLog);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Scouting Report...</p>
      </div>
    );
  }

  if (!player) return <div className="text-white p-10">Player not found in database.</div>;

  const TABS = [
    { id: "overview", label: "25-26 Season" },
    { id: "career", label: "Career & Legacy" }, // 🚀 NUEVA PESTAÑA GM
    { id: "gamelog", label: "Game Log" },
    { id: "accolades", label: "Accolades" },
  ];

  const radarData = percentiles ? [
    { metric: "Scoring (PTS)", value: percentiles.Scoring },
    { metric: "Playmaking (AST)", value: percentiles.Playmaking },
    { metric: "Efficiency (PER)", value: percentiles.Efficiency },
    { metric: "Impact (BPM)", value: percentiles.Impact },
    { metric: "Shooting (TS%)", value: percentiles.Shooting },
    { metric: "Rebounding (REB)", value: percentiles.Rebounding },
  ] : [];

  const pBio = PLAYER_BIO_DB[player.name];
  const playerAccolades = ACCOLADES_DB[player.name] || [];

  // Helper para pintar el ranking de la carrera con colores
  const RankBadge = ({ rank }: { rank: number | string }) => {
    if (rank === "N/A" || rank === "Unranked") return <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{rank}</span>;
    const isTop10 = Number(rank) <= 10;
    const isTop50 = Number(rank) <= 50;
    return (
      <div className={`flex items-center gap-1 mt-1 ${isTop10 ? 'text-amber-400' : isTop50 ? 'text-slate-300' : 'text-slate-500'}`}>
        {isTop10 && <Crown className="h-2.5 w-2.5" />}
        <span className="text-[10px] font-black uppercase tracking-widest">#{rank} ALL-TIME</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      
      <div className="flex items-center gap-2 mb-2">
        <Link to="/nba/players" className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4" /> Back to Scouting Hub
        </Link>
      </div>

      {/* 🚀 SUPER BANNER DE SCOUTING (Estilo NBA 2K) */}
      <div className="bg-[#0a0f18] border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-emerald-500/10 opacity-30 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full md:w-auto">
          <Avatar className={`h-32 w-32 md:h-40 md:w-40 border-4 border-[#0a0f18] shadow-2xl bg-white ${player.archetype.color.split(' ')[0].replace('text-', 'shadow-')}`}>
            <AvatarImage src={player.imageUrl} className="object-cover" />
            <AvatarFallback className="bg-slate-800 text-2xl font-bold text-slate-400">{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left space-y-3 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Scouting Dossier</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">{player.name}</h1>
                
                {/* 🚀 INYECCIÓN DE MOTES Y DRAFT EN LA CABECERA */}
                {pBio && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5"><Hash className="h-3 w-3 text-slate-500"/> {pBio.nicknames[0]}</span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-slate-500"/> Draft: {pBio.draft}</span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-500"/> {pBio.origin}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Badge className="bg-white/5 text-white border border-white/10 px-4 py-1.5 font-black uppercase tracking-widest">
                {player.teamId} · #{player.id.substring(0,4)}
              </Badge>
              <Badge className={`px-4 py-1.5 font-black uppercase tracking-widest border flex items-center gap-2 ${player.archetype.color}`}>
                <player.archetype.icon className="h-3.5 w-3.5" />
                {player.archetype.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS (BPM, TS%, USG%) */}
        <div className="flex items-center justify-center gap-4 relative z-10 w-full md:w-auto">
          <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl h-24 w-24 md:h-28 md:w-28 shadow-inner shrink-0 hover:bg-white/10 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">BPM</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-emerald-400">{player.adv.bpm.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl h-24 w-24 md:h-28 md:w-28 shadow-inner shrink-0 hover:bg-white/10 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">TS%</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-teal-400">{player.adv.ts.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl h-24 w-24 md:h-28 md:w-28 shadow-inner shrink-0 hover:bg-white/10 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">USG%</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-cyan-400">{player.adv.usg.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0a0f18] p-2 rounded-3xl border border-white/10 w-fit shadow-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                : 'bg-transparent text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 🚀 TAB 1: CURRENT SEASON OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {[
                { l: "PTS", v: player.stats.ppg }, { l: "REB", v: player.stats.rpg },
                { l: "AST", v: player.stats.apg }, { l: "FG%", v: player.stats.fgPct, s: "%" },
                { l: "3P%", v: player.stats.threePct, s: "%" }, { l: "FT%", v: player.stats.ftPct, s: "%" },
                { l: "STL", v: player.stats.spg }, { l: "BLK", v: player.stats.bpg }
              ].map((stat, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 backdrop-blur-sm rounded-3xl text-center flex flex-col justify-center py-6 shadow-lg">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{stat.l}</span>
                  <span className="text-2xl font-black text-white">{stat.v}{stat.s}</span>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] shadow-2xl p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Activity className="h-4 w-4"/> Scoring Trend (Last 10)</h3>
                <div className="h-[300px] w-full">
                  {gameLog.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gameLog}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" hide />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0a0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontWeight: 'bold' }}
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                        />
                        <Line type="monotone" dataKey="pts" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', stroke: '#0a0f18', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-widest">No game log available</div>
                  )}
                </div>
              </Card>

              <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-8 right-8">
                   <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[9px] uppercase tracking-widest">Percentile Analytics</Badge>
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Target className="h-4 w-4"/> Statistical Footprint</h3>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6">Compared vs 500+ Active Players (0-100)</p>
                
                <div className="h-[300px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 900, tracking: '0.05em' }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0a0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontWeight: 'bold' }} />
                      <Radar name={player.name} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} dot={{ r: 3, fill: '#0a0f18', stroke: '#3b82f6', strokeWidth: 2 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 🚀 TAB 2: CAREER & LEGACY (¡LO NUEVO!) */}
        {activeTab === "career" && (
          <div className="space-y-6">
            {!pBio ? (
              <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] p-16 text-center shadow-2xl">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Activity className="h-12 w-12 text-slate-600" />
                  <h3 className="text-xl font-black text-white">Historical Data Pending</h3>
                  <p className="text-sm text-slate-400 font-medium max-w-md">Our legacy database is currently tracking legends and superstars. Deep career data for {player.name} is being compiled.</p>
                </div>
              </Card>
            ) : (
              <>
                {/* TIMELINE DE FRANQUICIAS */}
                <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><MapPin className="h-4 w-4"/> Franchise Trajectory</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    {pBio.trajectory.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="flex flex-col items-center bg-[#0a0f18] border border-white/10 px-6 py-3 rounded-2xl shadow-inner">
                          <Avatar className="h-8 w-8 mb-2 bg-transparent">
                            <AvatarImage src={nbaService.getTeamLogoUrl(t.t)} className="object-contain" />
                            <AvatarFallback className="text-[10px]">{t.t}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-black text-white uppercase tracking-widest">{t.t}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.y}</span>
                        </div>
                        {i < pBio.trajectory.length - 1 && <ArrowRight className="h-5 w-5 text-slate-600" />}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* HISTORICAL GRIDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CAREER TOTALS */}
                  <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Sigma className="h-4 w-4 text-amber-400"/> All-Time Career Totals</h3>
                    
                    <div className="space-y-4 relative z-10">
                      {[
                        { l: "Points", v: pBio.totals.pts.v, r: pBio.totals.pts.r },
                        { l: "Rebounds", v: pBio.totals.reb.v, r: pBio.totals.reb.r },
                        { l: "Assists", v: pBio.totals.ast.v, r: pBio.totals.ast.r },
                        { l: "Steals", v: pBio.totals.stl.v, r: pBio.totals.stl.r },
                        { l: "Blocks", v: pBio.totals.blk.v, r: pBio.totals.blk.r },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-2xl transition-colors">
                          <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{item.l}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-white font-mono">{item.v}</span>
                            <RankBadge rank={item.r} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* CAREER AVERAGES */}
                  <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400"/> All-Time Career Averages</h3>
                    
                    <div className="space-y-4 relative z-10">
                      {[
                        { l: "PPG", v: pBio.avgs.pts.v, r: pBio.avgs.pts.r },
                        { l: "RPG", v: pBio.avgs.reb.v, r: pBio.avgs.reb.r },
                        { l: "APG", v: pBio.avgs.ast.v, r: pBio.avgs.ast.r },
                        { l: "SPG", v: pBio.avgs.stl.v, r: pBio.avgs.stl.r },
                        { l: "BPG", v: pBio.avgs.blk.v, r: pBio.avgs.blk.r },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-2xl transition-colors">
                          <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{item.l}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-white font-mono">{item.v}</span>
                            <RankBadge rank={item.r} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* 🚀 TAB 4: ACCOLADES */}
        {activeTab === "accolades" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-400" /> Career Trophy Case
            </h2>
            
            {playerAccolades.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {playerAccolades.map((acc, idx) => (
                  <Card key={idx} className={`bg-[#0a0f18] border ${acc.border} rounded-3xl overflow-hidden shadow-2xl relative group hover:-translate-y-1 transition-all duration-300`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 ${acc.bg} blur-3xl rounded-full -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100`}></div>
                    <CardContent className="p-8 flex items-center gap-6 relative z-10">
                      <div className={`h-16 w-16 rounded-2xl ${acc.bg} border ${acc.border} flex items-center justify-center shadow-inner shrink-0`}>
                        <acc.icon className={`h-8 w-8 ${acc.color}`} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-end gap-2 mb-1">
                          <span className={`text-4xl font-black leading-none ${acc.color}`}>{acc.count}x</span>
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{acc.title}</h3>
                        <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">{acc.years}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] p-16 text-center shadow-2xl">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                    <Award className="h-8 w-8 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-black text-white">No Major Accolades Found</h3>
                  <p className="text-sm text-slate-400 font-medium max-w-md">
                    We currently do not have historical individual awards or championships tracked for {player.name} in our database.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "gamelog" && (
          <Card className="bg-[#0a0f18] border-white/10 rounded-[3rem] p-16 text-center shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Game Log Terminal</h3>
            <p className="text-sm text-slate-400 font-medium">Detailed match-by-match breakdowns are syncing with the Data Science Engine.</p>
          </Card>
        )}

      </div>
    </div>
  );
}
import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { 
  ArrowLeft, Trophy, Shield, Activity, Loader2, Zap, Target, BarChart3, Gauge, 
  Building2, UserCircle, Briefcase, MapPin, History, Crown, AlertCircle, Users, UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { NBAPlayer } from "@/data/nba/mockData";

// 🏛️ NUESTRO "CMS" LOCAL (Para Front Office y Fotos Perfectas)
// La API no da biografías ni buenas fotos de directivos. ¡Se configuran aquí!
const ENRICHED_DATA: Record<string, any> = {
  "Sam Presti": { img: "https://upload.wikimedia.org/wikipedia/commons/6/69/Sam_Presti.jpg", title: "Executive Vice President & General Manager", desc: "Sam Presti is currently in his 18th season with the Thunder franchise. Known for drafting Kevin Durant, Russell Westbrook, and James Harden in consecutive years, and orchestrating the historic Paul George trade that brought SGA to OKC." },
  "Mark Daigneault": { img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Mark_Daigneault_2022.jpg/800px-Mark_Daigneault_2022.jpg", title: "Head Coach", desc: "Named NBA Coach of the Year in 2024 after leading the youngest roster in NBA history to the #1 seed in the Western Conference. Known for his innovative offensive spacing." },
  "Clay Bennett": { img: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Clay_Bennett.jpg", title: "Chairman, Professional Basketball Club LLC", desc: "Led the ownership group that purchased the franchise in 2006 and successfully relocated it to Oklahoma City in 2008. Net worth: $400M+." }
};

const getAvatarUrl = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff&size=256&font-weight=bold`;

export default function NBATeamProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  const [team, setTeam] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  
  const [isBaseLoading, setIsBaseLoading] = useState(true);
  const [isDeepDataLoading, setIsDeepDataLoading] = useState(true);
  
  const [realLineups, setRealLineups] = useState<any[]>([]); 
  const [teamDetails, setTeamDetails] = useState<any>(null); 
  const [bioRoster, setBioRoster] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<"roster" | "executive" | "analytics" | "legacy">("roster");

  // 🚀 FIX: Prevenir Auto-Scroll al cargar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsBaseLoading(true);
    
    nbaService.fetchAllOfficialTeams().then((teams) => {
      setAllTeams(teams);
      const foundTeam = teams.find(t => t.id === id || t.abbreviation === id);
      setTeam(foundTeam || null);
      
      if (foundTeam) {
        setIsBaseLoading(false); // Renderiza Banner al instante
        
        setIsDeepDataLoading(true);
        Promise.all([
          nbaService.getTeamLineups(foundTeam.id),
          nbaService.getTeamDetails(foundTeam.id),
          nbaService.getTeamRosterAndCoaches(foundTeam.id)
        ]).then(([lineups, details, bioData]) => {
          setRealLineups(lineups || []);
          setTeamDetails(details || null);
          setBioRoster(bioData.players || []);
          setCoaches(bioData.coaches || []);
          setIsDeepDataLoading(false);
        }).catch(() => setIsDeepDataLoading(false));
      } else {
        setIsBaseLoading(false);
      }
    });
  }, [id]);

  const radarData = useMemo(() => {
    if (!team || allTeams.length === 0) return [];
    const calcP = (val: number, arr: number[], inv = false) => {
      if (!arr.length) return 50;
      const sorted = [...arr].sort((a, b) => a - b);
      const count = sorted.filter(v => v <= val).length;
      let pct = Math.round((count / sorted.length) * 100);
      return inv ? 100 - pct : pct; 
    };
    const dist = {
      off: allTeams.map(t => t.offRtg).filter(v => v > 0), def: allTeams.map(t => t.defRtg).filter(v => v > 0),
      pace: allTeams.map(t => t.pace).filter(v => v > 0), ast: allTeams.map(t => t.astTo).filter(v => v > 0),
      ts: allTeams.map(t => t.tsPct).filter(v => v > 0), reb: allTeams.map(t => t.rebPct).filter(v => v > 0),
    };
    return [
      { subject: "Offense", value: calcP(team.offRtg, dist.off) }, { subject: "Defense", value: calcP(team.defRtg, dist.def, true) }, 
      { subject: "Pace", value: calcP(team.pace, dist.pace) }, { subject: "AST/TO", value: calcP(team.astTo, dist.ast) },
      { subject: "TS%", value: calcP(team.tsPct, dist.ts) }, { subject: "REB%", value: calcP(team.rebPct, dist.reb) },
    ];
  }, [team, allTeams]);

  const parseLineupPlayers = (groupName: string) => {
    if (!groupName) return [];
    const names = groupName.split(" - ");
    return names.map(n => {
      const cleanName = n.trim();
      const lastName = cleanName.split(" ").pop() || "";
      const match = bioRoster.find(r => r.PLAYER.includes(lastName));
      return match ? { id: match.PLAYER_ID, name: match.PLAYER, imageUrl: nbaService.getImageUrl(match.PLAYER_ID) } 
                   : { id: "0", name: cleanName, imageUrl: getAvatarUrl(cleanName) };
    });
  };

  if (isBaseLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Accessing NBA Central Database...</p>
    </div>
  );

  if (!team) return <div className="text-white p-10">Franchise not found.</div>;

  const winPct = ((team.wins / ((team.wins + team.losses) || 1)) * 100).toFixed(1);
  const isWinning = team.wins >= team.losses;

  const fourFactors = [
    { label: "True Shooting", value: team.tsPct?.toFixed(1) || "0.0", suffix: "%", icon: <Target className="h-5 w-5 text-cyan-400" />, pct: Math.min(100, (team.tsPct || 0) * 1.5) },
    { label: "Rebound Rate", value: team.rebPct?.toFixed(1) || "50.0", suffix: "%", icon: <BarChart3 className="h-5 w-5 text-orange-400" />, pct: team.rebPct || 50 },
    { label: "AST / TO Ratio", value: team.astTo?.toFixed(2) || "0.00", suffix: "", icon: <Zap className="h-5 w-5 text-amber-400" />, pct: Math.min(100, (team.astTo || 0) * 30) },
    { label: "Pace Factor", value: team.pace?.toFixed(1) || "0.0", suffix: "", icon: <Gauge className="h-5 w-5 text-violet-400" />, pct: Math.min(100, ((team.pace || 95) - 90) * 8) },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 min-h-screen">
      
      <Link to={`/${sport}/teams`} className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-all uppercase tracking-[0.2em] w-max px-2">
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Standings
      </Link>

      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-[#0a0f18] shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full lg:w-auto">
            <div className="relative h-32 w-32 md:h-40 md:w-40 bg-white/[0.04] rounded-full flex items-center justify-center p-6 border border-white/10 shadow-2xl shrink-0">
              <img src={nbaService.getTeamLogoUrl(team.abbreviation)} alt={team.name} className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-black text-[10px] tracking-[0.25em] uppercase">
                    <Trophy className="h-3.5 w-3.5" /> Season 2025-26
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none">{team.name}</h1>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <Badge className="bg-white/[0.06] text-slate-300 font-black px-4 py-1.5 text-[10px] tracking-[0.15em] border border-white/[0.08]">{team.conference} Conf</Badge>
                <span className="text-slate-500 font-mono font-bold text-sm bg-black/40 px-4 py-1.5 rounded-full border border-white/5">{team.abbreviation}</span>
              </div>

              {!isDeepDataLoading && teamDetails && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-3 mt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500">GM:</span>
                    <span className="text-xs font-bold text-white">{teamDetails.frontOffice.gm}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Owner:</span>
                    <span className="text-xs font-bold text-white">{teamDetails.frontOffice.owner}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-5">
            <div className="text-center lg:text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Official Record</p>
              <p className="text-6xl md:text-7xl font-black font-mono tracking-tighter text-white leading-none">
                {team.wins}<span className="text-slate-700 mx-2">-</span>{team.losses}
              </p>
            </div>
            <Badge className={`px-6 py-2 text-xs font-black tracking-widest border-none shadow-lg ${isWinning ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
              WIN {winPct}%
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-white/[0.06] bg-black/20 backdrop-blur-md">
           {[
              { label: "OFFENSIVE RATING", val: team.offRtg?.toFixed(1) || "—", color: "text-orange-400" },
              { label: "DEFENSIVE RATING", val: team.defRtg?.toFixed(1) || "—", color: "text-emerald-400" },
              { label: "NET RATING", val: team.netRtg > 0 ? `+${team.netRtg?.toFixed(1)}` : team.netRtg?.toFixed(1) || "—", color: team.netRtg > 0 ? "text-cyan-400" : "text-rose-400" },
            ].map((b, i) => (
              <div key={i} className={`p-4 md:p-6 text-center border-r border-white/[0.06] last:border-r-0`}>
                <p className={`font-mono font-black text-2xl md:text-4xl ${b.color} mb-1 drop-shadow-md`}>{b.val}</p>
                <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{b.label}</p>
              </div>
            ))}
        </div>
      </div>

      {/* 🚀 TABS NAVEGACIÓN */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0a0f18] p-2 rounded-3xl border border-white/10 shadow-xl w-fit mx-auto lg:mx-0">
        <button onClick={() => setActiveTab("roster")} className={`px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "roster" ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-white'}`}>
          <Users className="h-4 w-4" /> Roster
        </button>
        <button onClick={() => setActiveTab("executive")} className={`px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "executive" ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-white'}`}>
          <UserCheck className="h-4 w-4" /> Coaching Staff
        </button>
        <button onClick={() => setActiveTab("analytics")} className={`px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "analytics" ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-white'}`}>
          <Activity className="h-4 w-4" /> Live Analytics
        </button>
        <button onClick={() => setActiveTab("legacy")} className={`px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "legacy" ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-white'}`}>
          <History className="h-4 w-4" /> Culture & Legacy
        </button>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        
        {/* ═══════════════════ TAB 1: ROSTER (ALINEADO Y PERFECTO) ═══════════════════ */}
        {activeTab === "roster" && (
          <div className="bg-[#0a0f18] border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl relative min-h-[400px]">
            {isDeepDataLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f18]/80 backdrop-blur-sm z-10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Loading Biometrics...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  {/* Headers: 12 Columnas Grid */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/[0.02] border-b border-white/[0.06] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] items-center">
                    <div className="col-span-3">Player</div>
                    <div className="col-span-1 text-center">No.</div>
                    <div className="col-span-1 text-center">Pos</div>
                    <div className="col-span-1 text-center">Age/DOB</div>
                    <div className="col-span-2 text-center">Birthplace</div>
                    <div className="col-span-1 text-center">Ht / Wt</div>
                    <div className="col-span-1 text-center">Exp</div>
                    <div className="col-span-2 text-right">Origin / College</div>
                  </div>
                  
                  {/* Rows */}
                  <div className="divide-y divide-white/[0.03]">
                    {bioRoster.map((p, i) => (
                      <Link key={i} to={`/${sport}/players/${p.PLAYER_ID}`} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors group items-center">
                        <div className="col-span-3 flex items-center gap-4">
                          <Avatar className="h-12 w-12 border border-white/[0.08] shadow-lg group-hover:border-emerald-400 transition-colors bg-white">
                            <AvatarImage src={nbaService.getImageUrl(p.PLAYER_ID)} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-500">{p.PLAYER.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">{p.PLAYER}</span>
                        </div>
                        <div className="col-span-1 text-center font-mono font-black text-slate-300 text-lg">#{p.NUM}</div>
                        <div className="col-span-1 text-center">
                          <Badge className="bg-white/[0.06] text-slate-400 border-none font-black text-[9px] tracking-wider">{p.POSITION}</Badge>
                        </div>
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          <span className="font-mono font-bold text-white text-sm">{p.AGE}</span>
                          <span className="text-[9px] font-bold text-slate-500 mt-0.5">{p.BIRTH_DATE}</span>
                        </div>
                        <div className="col-span-2 flex flex-col items-center justify-center text-center">
                           {/* La API a veces no devuelve el país, ponemos placeholder elegante */}
                           <span className="font-bold text-slate-300 text-xs truncate max-w-[150px]">{p.HOW_ACQUIRED ? "USA" : "Intl"}</span>
                           <span className="text-[9px] font-bold text-slate-500 mt-0.5">-</span>
                        </div>
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          <span className="font-mono font-bold text-slate-300 text-xs">{p.HEIGHT}</span>
                          <span className="text-[9px] font-bold text-slate-500 mt-0.5">{p.WEIGHT} lbs</span>
                        </div>
                        <div className="col-span-1 text-center font-mono font-bold text-emerald-400/80 text-sm">
                          {p.EXP === "R" ? "Rookie" : `${p.EXP} Y`}
                        </div>
                        <div className="col-span-2 text-right font-bold text-slate-400 text-xs truncate">
                          {p.SCHOOL || "N/A"}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ TAB 2: COACHING STAFF & FRONT OFFICE ═══════════════════ */}
        {activeTab === "executive" && (
          <div className="space-y-8 relative min-h-[400px]">
            {isDeepDataLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
              </div>
            ) : (
              <>
                <div className="text-center py-4">
                  <h1 className="text-3xl font-black text-white uppercase tracking-widest text-amber-500">Basketball Operations</h1>
                </div>

                {/* President / GM Section (El CMS Local entra en acción) */}
                <div className="flex flex-col items-center pb-8 border-b border-white/10">
                  {ENRICHED_DATA[teamDetails?.frontOffice?.gm] ? (
                    <div className="flex flex-col items-center text-center max-w-2xl">
                      <div className="h-48 w-48 rounded-full border-4 border-amber-500/20 shadow-2xl mb-6 overflow-hidden">
                        <img src={ENRICHED_DATA[teamDetails.frontOffice.gm].img} className="w-full h-full object-cover object-top" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2">{teamDetails.frontOffice.gm}</h2>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">{ENRICHED_DATA[teamDetails.frontOffice.gm].title}</p>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        {ENRICHED_DATA[teamDetails.frontOffice.gm].desc}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-48 w-48 rounded-full border-4 border-white/10 shadow-2xl mb-6 overflow-hidden bg-slate-900">
                        <img src={getAvatarUrl(teamDetails?.frontOffice?.gm || "GM")} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2">{teamDetails?.frontOffice?.gm || "General Manager"}</h2>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">General Manager</p>
                      <p className="text-xs text-slate-600 mt-4 italic">Update ENRICHED_DATA to add bio and photo.</p>
                    </div>
                  )}
                </div>

                {/* Coaching Staff Grid (Evitando siluetas grises de la NBA) */}
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 text-center">Coaching Staff</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
                    {coaches.map((c, i) => {
                      // Si es el Head Coach, usamos la foto oficial si existe en ENRICHED_DATA
                      const enrichedCoach = ENRICHED_DATA[c.COACH_NAME];
                      return (
                        <div key={i} className="flex flex-col items-center text-center group">
                          <div className="h-32 w-32 rounded-full border-2 border-white/10 shadow-lg mb-4 overflow-hidden bg-slate-900 group-hover:border-amber-500/50 transition-colors">
                            {enrichedCoach ? (
                              <img src={enrichedCoach.img} className="w-full h-full object-cover" />
                            ) : (
                              // Intentamos foto CDN, si falla o da silueta fea, ponemos Iniciales (Avatar)
                              <img 
                                src={`https://cdn.nba.com/headshots/nba/latest/260x190/${c.COACH_ID}.png`} 
                                onError={(e) => { e.currentTarget.src = getAvatarUrl(c.COACH_NAME); }}
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{c.COACH_NAME}</h4>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{c.COACH_TYPE}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════ TAB 3: LIVE ANALYTICS (Quintetos) ═══════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl h-[360px] relative overflow-hidden shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 text-center mb-2">Team DNA Percentiles</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0a0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontWeight: 'bold' }} />
                    <Radar name={`${team.abbreviation}`} dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.2} strokeWidth={3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 h-[360px]">
                {[
                  { label: "True Shooting", v: team.tsPct, suf: "%", pct: (team.tsPct/70)*100 },
                  { label: "Rebound %", v: team.rebPct, suf: "%", pct: team.rebPct },
                  { label: "AST/TO", v: team.astTo, suf: "", pct: (team.astTo/3)*100 },
                  { label: "Pace", v: team.pace, suf: "", pct: ((team.pace-90)/20)*100 },
                ].map((m, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{m.label}</p>
                    <p className="font-mono font-black text-3xl text-white">{m.v?.toFixed(1) || 0}<span className="text-slate-500 text-lg">{m.suf}</span></p>
                    <div className="mt-4 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, Math.max(0, m.pct || 0))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 px-1">
                <Activity className="h-6 w-6 text-cyan-400" />
                <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white">Lineup Laboratory (API Live)</h2>
              </div>

              <div className="bg-[#0a0f18] border border-white/[0.06] rounded-[2rem] backdrop-blur-xl overflow-x-auto shadow-2xl min-h-[300px] relative">
                {isDeepDataLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f18]/50 backdrop-blur-sm z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Extracting Telemetry...</p>
                  </div>
                ) : (
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-white/[0.02] border-b border-white/[0.06] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <div className="col-span-6">5-Man Unit</div>
                      <div className="col-span-1 text-center">MIN</div>
                      <div className="col-span-1 text-center text-orange-400">ORTG</div>
                      <div className="col-span-1 text-center text-emerald-400">DRTG</div>
                      <div className="col-span-1 text-center text-cyan-400">NET</div>
                      <div className="col-span-1 text-center">TS%</div>
                      <div className="col-span-1 text-center">REB%</div>
                    </div>
                    
                    {realLineups.length > 0 ? (
                      <div className="divide-y divide-white/[0.03]">
                        {realLineups.map((lu, i) => {
                          const players = parseLineupPlayers(lu.groupName);
                          return (
                            <div key={i} className="grid grid-cols-12 gap-4 px-8 py-6 hover:bg-white/[0.02] transition-colors items-center">
                              <div className="col-span-6 flex items-center gap-6">
                                <span className="text-xs font-mono font-black text-slate-600">{i + 1}</span>
                                <div className="flex gap-4">
                                  {players.map((p: any, j: number) => (
                                    <Link key={j} to={p.id !== "0" ? `/${sport}/players/${p.id}` : "#"} className="flex flex-col items-center group/avatar w-16 cursor-pointer">
                                      <Avatar className="h-16 w-16 border-2 border-[#0a0f18] shadow-xl group-hover/avatar:scale-110 group-hover/avatar:border-cyan-400 transition-all bg-white mb-2">
                                        <AvatarImage src={p.imageUrl} className="object-cover" />
                                        <AvatarFallback className="bg-slate-800 text-xs font-bold text-slate-500">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-[9px] font-bold text-slate-400 text-center leading-tight group-hover/avatar:text-cyan-300">
                                        {p.name.split(" ").pop()}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                              <div className="col-span-1 text-center font-mono font-bold text-slate-300 text-base">{Math.round(lu.mins)}</div>
                              <div className="col-span-1 text-center font-mono font-black text-orange-400 text-base">{lu.offRtg.toFixed(1)}</div>
                              <div className="col-span-1 text-center font-mono font-black text-emerald-400 text-base">{lu.defRtg.toFixed(1)}</div>
                              <div className="col-span-1 text-center font-mono font-black">
                                <Badge className={`border-none text-sm px-3 py-1 ${lu.netRtg > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {lu.netRtg > 0 ? '+' : ''}{lu.netRtg.toFixed(1)}
                                </Badge>
                              </div>
                              <div className="col-span-1 text-center font-mono font-bold text-slate-300 text-sm">{lu.tsPct.toFixed(1)}%</div>
                              <div className="col-span-1 text-center font-mono font-bold text-slate-300 text-sm">{lu.rebPct.toFixed(1)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-16 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
                        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Data Pending</h3>
                        <p className="text-slate-400 text-xs max-w-md leading-relaxed">Lineup data is currently unavailable from the NBA endpoints.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ TAB 4: CULTURE & LEGACY ═══════════════════ */}
        {activeTab === "legacy" && (
          <div className="relative min-h-[400px]">
            {isDeepDataLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Arena & Origins */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0a0f18] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <Building2 className="absolute -bottom-6 -right-6 h-40 w-40 text-white/5" />
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 font-black text-[10px] uppercase mb-4 w-fit">Home Arena</Badge>
                    <h2 className="text-3xl font-black text-white mb-2 leading-tight">{teamDetails?.frontOffice?.arena || "Unknown Arena"}</h2>
                    <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/5 relative z-10">
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Capacity</p><p className="text-xl font-bold text-white font-mono">{teamDetails?.frontOffice?.capacity || "N/A"}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Franchise Est.</p><p className="text-xl font-bold text-white font-mono">{teamDetails?.frontOffice?.yearFounded || "N/A"}</p></div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl">
                     <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-6">NBA Championships</h3>
                     {teamDetails?.history?.rings?.length > 0 ? (
                       <div className="space-y-4">
                         <span className="text-6xl font-black text-white font-mono">{teamDetails.history.rings.length}</span>
                         <div className="flex flex-wrap gap-2">
                           {teamDetails.history.rings.map((y:string, i: number) => (
                             <Badge key={i} className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black px-2 py-0.5">{y}</Badge>
                           ))}
                         </div>
                       </div>
                     ) : <span className="text-3xl font-black text-slate-500">Zero Titles</span>}
                  </div>
                </div>

                {/* All-Time Leaders Grid */}
                <div className="bg-[#0a0f18] border border-white/[0.06] rounded-[2.5rem] p-8 shadow-2xl">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Crown className="h-4 w-4"/> All-Time Franchise Leaders (API)</h3>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     <div><p className="text-[10px] font-black uppercase text-cyan-400 mb-1">Points</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.pts || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-orange-400 mb-1">Rebounds</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.reb || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-purple-400 mb-1">Assists</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.ast || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-rose-400 mb-1">Steals</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.stl || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Blocks</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.blk || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Field Goal %</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.fg || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-teal-400 mb-1">3-Point %</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.fg3 || "N/A"}</p></div>
                     <div><p className="text-[10px] font-black uppercase text-blue-400 mb-1">Free Throw %</p><p className="text-sm font-bold text-white">{teamDetails?.history?.leaders?.ft || "N/A"}</p></div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
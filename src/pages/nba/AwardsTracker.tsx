import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Crown, Shield, Zap, TrendingUp, Trophy, Star, Users, BrainCircuit, Target } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { nbaService } from '@/services/sportServiceFactory';

const ENRICHED_DATA: Record<string, any> = {
  "Mark Daigneault": { img: "/mark_daigneault.jpg" },
};

const HEAD_COACHES: Record<string, string> = {
  "ATL": "Quin Snyder", "BOS": "Joe Mazzulla", "BKN": "Jordi Fernandez", "CHA": "Charles Lee",
  "CHI": "Billy Donovan", "CLE": "Kenny Atkinson", "DAL": "Jason Kidd", "DEN": "Michael Malone",
  "DET": "J.B. Bickerstaff", "GSW": "Steve Kerr", "HOU": "Ime Udoka", "IND": "Rick Carlisle",
  "LAC": "Tyronn Lue", "LAL": "JJ Redick", "MEM": "Taylor Jenkins", "MIA": "Erik Spoelstra",
  "MIL": "Doc Rivers", "MIN": "Chris Finch", "NOP": "Willie Green", "NYK": "Tom Thibodeau",
  "OKC": "Mark Daigneault", "ORL": "Jamahl Mosley", "PHI": "Nick Nurse", "PHX": "Mike Budenholzer",
  "POR": "Chauncey Billups", "SAC": "Mike Brown", "SAS": "Gregg Popovich", "TOR": "Darko Rajakovic",
  "UTA": "Will Hardy", "WAS": "Brian Keefe"
};

const getAvatarUrl = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Unknown")}&background=0f172a&color=fff&size=256&font-weight=bold`;

export default function NBAAwardsTracker() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [auxData, setAuxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAward, setActiveAward] = useState<string>("MVP");

  useEffect(() => {
    Promise.all([
      nbaService.fetchAllOfficialPlayers(),
      nbaService.fetchAllOfficialTeams(),
      nbaService.fetchAwardAuxData()
    ]).then(([pData, tData, aux]) => {
      setPlayers(pData);
      setTeams(tData);
      setAuxData(aux);
      setLoading(false);
    });
  }, []);

  const awardRaces = useMemo(() => {
    if (!players.length || !teams.length || !auxData) return null;

    const getTeamData = (teamAbbr: string) => teams.find(t => t.abbreviation === teamAbbr);

    // ==========================================
    // 🚨 MOTOR DE ELEGIBILIDAD (REGLA 65 PARTIDOS)
    // ==========================================
    const isEligible = (p: any, require20Min: boolean = true) => {
      const team = getTeamData(p.teamId);
      const teamGamesPlayed = team ? (team.wins + team.losses) : 82;
      const missedGames = teamGamesPlayed - p.stats.gp;
      
      // Máximo de partidos perdidos permitidos (17 en una temporada completa)
      const maxMissedAllowed = Math.ceil(teamGamesPlayed * (17 / 82));
      
      if (missedGames > maxMissedAllowed) return false; 
      if (require20Min && p.stats.mpg < 20) return false; 
      
      return true;
    };

    const qualified = players.filter(p => isEligible(p, true));

    // ==========================================
    // 👑 1. MVP (ChatGPT Calibrated Formula)
    // ==========================================
    const mvp = [...qualified].map(p => {
      const team = getTeamData(p.teamId);
      const winPct = team ? (team.wins / (team.wins + team.losses)) : 0.5;
      
      // Calibrado para que Impacto, Volumen y Equipo sumen en proporciones similares (~100 pts cada bloque)
      const impactScore = (p.adv.si * 1.0) + (p.adv.bpm * 5.0) + (p.adv.per * 1.2);
      const volumeScore = (p.stats.ppg * 1.4) + (p.stats.apg * 1.2) + (p.stats.rpg * 0.6);
      const teamScore = winPct * 80; 
      
      const score = impactScore + volumeScore + teamScore;
      return { ...p, score, scoreLabel: "MVP Index" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // 🛡️ 2. DPOY (ChatGPT Calibrated Formula)
    // ==========================================
    const dpoy = [...qualified].map(p => {
      const team = getTeamData(p.teamId);
      const teamDefRtg = team ? team.defRtg : 115;
      
      const defRatingVal = p.stats.defRating || 115;
      const relativeDef = Math.max(0, 115 - defRatingVal) * 3; 
      const relativeTeamDef = Math.max(0, 115 - teamDefRtg) * 2;
      
      const stocksAndHustle = (p.stats.spg * 8) + (p.stats.bpg * 10) + ((p.hustle?.deflections || 0) * 3) + ((p.hustle?.contestedShots || 0) * 1.5);
      
      const score = relativeDef + relativeTeamDef + stocksAndHustle + p.adv.bpm;
      return { ...p, score, scoreLabel: "D-Impact" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // ⚡ 3. 6MOY (Filtro Anti-Titulares DEFINITIVO)
    // ==========================================
    const smoyEligible = qualified.filter(p => {
        // Obtenemos los partidos de banquillo del mapa auxiliar. Si no existe, es 0.
        const benchGP = auxData.benchStats.get(p.id) || 0;
        // Obligatorio: Haber salido del banquillo más de la mitad de los partidos jugados
        return benchGP > (p.stats.gp / 2);
    });
    
    const smoy = [...smoyEligible].map(p => {
      const team = getTeamData(p.teamId);
      const winPct = team ? (team.wins / (team.wins + team.losses)) : 0.5;
      
      const score = (p.stats.ppg * 2.2) + (p.stats.apg * 1.2) + (p.adv.ts * 0.8) + (p.adv.usg * 0.6) + (winPct * 30);
      return { ...p, score, scoreLabel: "Bench Spark" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // ⭐ 4. ROY (Rookies Oficiales)
    // ==========================================
    const royEligible = players.filter(p => auxData.rookies.has(p.id) && isEligible(p, false));
    const roy = [...royEligible].map(p => {
      const score = (p.stats.ppg * 1.8) + (p.stats.rpg * 1.2) + (p.stats.apg * 1.5) + (p.adv.si * 0.5) + (p.adv.usg * 0.5);
      return { ...p, score, scoreLabel: "Rookie Base" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // 📈 5. MIP (Delta Impact)
    // ==========================================
    const mipEligible = qualified.filter(p => !auxData.rookies.has(p.id) && auxData.prevPlayers.has(p.id));
    const mip = [...mipEligible].map(p => {
      const prev = auxData.prevPlayers.get(p.id);
      const deltaPPG = p.stats.ppg - prev.stats.ppg;
      const deltaMIN = p.stats.mpg - prev.stats.mpg;
      const organicImprovement = deltaPPG - (deltaMIN * 0.4); 
      
      const deltaBPM = p.adv.bpm - prev.adv.bpm;
      const deltaTS = p.adv.ts - prev.adv.ts;
      
      if (p.stats.ppg < 12 || organicImprovement < 1) return { ...p, score: -100, scoreLabel: "N/A" };
      
      const score = (organicImprovement * 4.5) + (deltaBPM * 5.0) + (deltaTS * 1.5) + (p.adv.si * 0.3);
      return { ...p, score, scoreLabel: "Delta Score" };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // ==========================================
    // 🎯 6. CPOY (Clutch Player)
    // ==========================================
    const cpoyEligible = qualified.filter(p => auxData.clutchStats.has(p.id));
    const cpoy = [...cpoyEligible].map(p => {
      const clutch = auxData.clutchStats.get(p.id);
      if (clutch.gp < 5) return { ...p, score: -100, scoreLabel: "N/A" }; 
      
      const score = (clutch.pts * 3.0) + (clutch.ts * 1.2) + (clutch.plusMinus * 3.5) + (p.adv.bpm * 2.0);
      return { ...p, score, scoreLabel: "Clutch Value" };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // ==========================================
    // 👔 7. COTY (Coach of the Year)
    // ==========================================
    const coty = [...teams].map(t => {
      const winPct = t.wins / (t.wins + t.losses);
      const prevTeam = auxData.prevTeams.get(t.id);
      const prevWinPct = prevTeam ? (prevTeam.wins / (prevTeam.wins + prevTeam.losses)) : 0.500;
      
      const winImprovement = winPct - prevWinPct;
      
      const score = (winPct * 100) + (t.netRtg * 4.0) + (winImprovement * 150);
      
      const coachName = HEAD_COACHES[t.abbreviation] || `${t.name} Coach`;
      const customImg = ENRICHED_DATA[coachName]?.img;
      const coachImage = customImg ? customImg : getAvatarUrl(coachName);
      
      return { id: t.id, name: coachName, teamId: t.abbreviation, imageUrl: coachImage, score, scoreLabel: "Coach Index" };
    }).sort((a, b) => b.score - a.score);

    return { 
      "MVP": { list: mvp, formula: "[SI+ × 1.0] + [BPM × 5.0] + [PPG × 1.4] + [Win% × 80]" },
      "DPOY": { list: dpoy, formula: "[Rel. DefRtg × 3] + [STL × 8] + [BLK × 10] + [Deflections × 3]" },
      "6MOY": { list: smoy, formula: "Bench GP > 50%. [PPG × 2.2] + [TS% × 0.8] + [USG% × 0.6]" },
      "ROY": { list: roy, formula: "Official Rookies. [PPG × 1.8] + [RPG × 1.2] + [APG × 1.5] + [SI+ × 0.5]" },
      "MIP": { list: mip, formula: "Organic PPG Delta × 4.5 + ΔBPM × 5.0 + ΔTS% × 1.5" },
      "CPOY": { list: cpoy, formula: "Last 5 Min (≤ 5 Pts). [ClutchPTS × 3.0] + [TS% × 1.2] + [+/- × 3.5]" },
      "COTY": { list: coty, formula: "[Win% × 100] + [NetRtg × 4.0] + [YoY Win% Delta × 150]" },
      "ALL-NBA": { list: mvp.slice(0, 15), formula: "Top 15 players in MVP Composite (Positionless)" },
      "ALL-DEFENSE": { list: dpoy.slice(0, 10), formula: "Top 10 players in D-Impact Score (Positionless)" },
      "ALL-ROOKIE": { list: roy.slice(0, 10), formula: "Top 10 Rookies in Rookie Base Index (Positionless)" },
    };
  }, [players, teams, auxData]);

  if (loading || !awardRaces) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Validating CBA Eligibility & Crunching Data...</p>
    </div>
  );

  const tabsMajor = [
    { id: "MVP", label: "MVP", icon: <Crown className="w-4 h-4" /> },
    { id: "DPOY", label: "DPOY", icon: <Shield className="w-4 h-4" /> },
    { id: "6MOY", label: "6MOY", icon: <Zap className="w-4 h-4" /> },
    { id: "ROY", label: "ROY", icon: <Star className="w-4 h-4" /> },
    { id: "MIP", label: "MIP", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "CPOY", label: "Clutch POY", icon: <Target className="w-4 h-4" /> },
    { id: "COTY", label: "Coach", icon: <Users className="w-4 h-4" /> },
  ];

  const tabsTeams = [
    { id: "ALL-NBA", label: "All-NBA Teams", icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: "ALL-DEFENSE", label: "All-Defense", icon: <Shield className="w-4 h-4 text-emerald-400" /> },
    { id: "ALL-ROOKIE", label: "All-Rookie", icon: <Star className="w-4 h-4 text-cyan-400" /> },
  ];

  const currentData = awardRaces[activeAward as keyof typeof awardRaces];
  const isTeamAward = activeAward.includes("ALL-");
  const currentList = currentData.list; 

  const renderTeamSection = (title: string, playersChunk: any[], startIndex: number) => {
    if (!playersChunk || playersChunk.length === 0) return null;
    return (
      <div className="mb-10 last:mb-0">
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-white/10 pb-3">
          <Trophy className="w-5 h-5 text-amber-500" /> {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {playersChunk.map((p, i) => (
            <div key={p.id} className="bg-[#111] border border-[#222] rounded-2xl p-5 flex flex-col items-center text-center relative hover:bg-[#151515] hover:border-amber-500/30 transition-all group shadow-inner">
              <div className="absolute top-2 left-3 text-[10px] font-black text-[#555] uppercase tracking-widest">#{startIndex + i}</div>
              <Avatar className="w-16 h-16 border-2 border-[#333] bg-slate-800 mb-3 group-hover:scale-105 transition-transform">
                <AvatarImage src={p.imageUrl} className="object-cover" />
                <AvatarFallback>{p.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight mb-1">{p.name}</h3>
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{p.teamId}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full mb-4 ring-1 ring-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Trophy className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-3">NBA Awards Tracker</h1>
        <p className="text-slate-400 max-w-2xl font-medium">
          Predictive advanced models. Strict validation under the new NBA Collective Bargaining Agreement (CBA).
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        <div className="w-full lg:w-1/4">
          <div className="bg-[#111] border border-white/5 rounded-3xl p-3 flex flex-col gap-2 sticky top-24 shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#666] px-4 pt-2 pb-1">Major Awards</span>
            {tabsMajor.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveAward(t.id)}
                className={`px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group ${
                  activeAward === t.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-[#1a1a1a] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">{t.icon} {t.label}</div>
              </button>
            ))}
            <div className="h-px w-full bg-white/5 my-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#666] px-4 pb-1">Official Quintets</span>
            {tabsTeams.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveAward(t.id)}
                className={`px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group ${
                  activeAward === t.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-[#1a1a1a] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">{t.icon} {t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-3/4 space-y-6">
          
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-start gap-4 shadow-lg">
            <BrainCircuit className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">AI Prediction Model</h4>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">{currentData.formula}</p>
            </div>
          </div>

          {isTeamAward ? (
             <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
               {currentList.length === 0 ? (
                 <div className="text-center py-10">
                   <p className="text-slate-500 font-bold uppercase tracking-widest">Awaiting valid candidates...</p>
                 </div>
               ) : (
                 <>
                   {renderTeamSection("First Team", currentList.slice(0, 5), 1)}
                   {renderTeamSection("Second Team", currentList.slice(5, 10), 6)}
                   {(activeAward === "ALL-NBA") && renderTeamSection("Third Team", currentList.slice(10, 15), 11)}
                 </>
               )}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentList[0] ? (
                <div className="md:col-span-2 bg-gradient-to-br from-amber-500/20 to-[#111] rounded-[2rem] border border-amber-500/30 p-8 flex flex-col md:flex-row items-center text-center md:text-left relative overflow-hidden shadow-2xl gap-8">
                  <div className="absolute top-4 right-4 text-8xl font-black italic text-amber-500/10 pointer-events-none">#1</div>
                  
                  <div className="w-48 h-48 shrink-0 relative">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-[40px]" />
                    <img src={currentList[0].imageUrl} alt={currentList[0].name} className="w-full h-full object-cover rounded-full drop-shadow-2xl relative z-10" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center w-full relative z-10">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <Crown className="w-6 h-6 text-amber-500" />
                      <span className="text-sm font-bold text-amber-500 uppercase tracking-widest">{activeAward} Favorite</span>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">{currentList[0].name}</h2>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 block">{currentList[0].teamId}</span>
                    
                    <div className="flex gap-4 w-full justify-center md:justify-start">
                      <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-4 min-w-[120px] backdrop-blur-md text-center">
                        <span className="text-[10px] font-black text-[#888] uppercase tracking-widest block mb-1">{currentList[0].scoreLabel}</span>
                        <span className="text-3xl font-mono font-black text-amber-400">{currentList[0].score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="md:col-span-2 bg-[#111] border border-dashed border-white/10 rounded-[2rem] p-16 text-center shadow-inner">
                   <Shield className="w-12 h-12 text-rose-500/50 mx-auto mb-4" />
                   <p className="text-rose-400 font-black uppercase tracking-widest text-lg mb-2">No Qualifying Candidates</p>
                   <p className="text-slate-500 text-sm max-w-md mx-auto">Either no players meet the strict CBA requirements or the API returned empty data.</p>
                 </div>
              )}

              {currentList.slice(1, 10).map((p, i) => (
                <div key={p.id} className="bg-[#111] border border-[#222] rounded-2xl p-5 flex items-center gap-5 hover:border-white/10 transition-colors shadow-inner group">
                  <div className="text-xl font-black italic text-[#444] w-6 text-center group-hover:text-amber-500/50 transition-colors">#{i + 2}</div>
                  <Avatar className="w-14 h-14 border border-[#333] bg-slate-800">
                    <AvatarImage src={p.imageUrl} className="object-cover" />
                    <AvatarFallback>{p.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-white uppercase tracking-tight truncate">{p.name}</h3>
                    <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{p.teamId}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-xl font-mono font-black text-white">{p.score.toFixed(1)}</span>
                    <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest">Score</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
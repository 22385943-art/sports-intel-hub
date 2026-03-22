import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Crown, Shield, Zap, TrendingUp, Trophy, Star, Users, BrainCircuit, Target, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { nbaService } from '@/services/sportServiceFactory';

const ENRICHED_DATA: Record<string, any> = {
  "Mark Daigneault": { img: "/mark_daigneault.jpg" },
};

const getAvatarUrl = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Unknown")}&background=0f172a&color=fff&size=256&font-weight=bold`;

const zScore = (val: number, arr: number[]) => {
    if (!arr || arr.length === 0 || val === undefined || isNaN(val)) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length) || 1;
    return (val - mean) / sd;
};

export default function NBAAwardsTracker() {
  const navigate = useNavigate(); 
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [auxData, setAuxData] = useState<any>(null);
  const [coaches, setCoaches] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeAward, setActiveAward] = useState<string>("MVP");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [pData, tData, aux] = await Promise.all([
          nbaService.fetchAllOfficialPlayers(),
          nbaService.fetchAllOfficialTeams(),
          nbaService.fetchAwardAuxData()
        ]);
        
        if (!isMounted) return;

        setPlayers(pData || []);
        setTeams(tData || []);
        setAuxData(aux || { rookies: new Set(), clutchStats: new Map(), benchStats: new Map(), prevPlayers: new Map(), prevTeams: new Map() });

        const initialCoaches: Record<string, any> = {};
        (tData || []).forEach(t => {
            initialCoaches[t.abbreviation] = { name: `${t.name} Coach` };
        });
        setCoaches(initialCoaches);
        
        setLoading(false); 

        if (tData && tData.length > 0) {
            for (let i = 0; i < tData.length; i += 2) {
                if (!isMounted) break;
                const batch = tData.slice(i, i + 2);
                
                await Promise.all(batch.map(async (t: any) => {
                    try {
                        const numericId = String(t.id).replace(/\D/g,''); 
                        if (numericId) {
                            const roster = await nbaService.getTeamRosterAndCoaches(numericId);
                            const headCoach = roster?.coaches?.find((c: any) => c.type?.toLowerCase().includes("head") || c.type === "Coach");
                            if (headCoach && headCoach.name && isMounted) {
                                setCoaches(prev => ({ ...prev, [t.abbreviation]: { name: headCoach.name } }));
                            }
                        }
                    } catch(e) {}
                }));
                await new Promise(res => setTimeout(res, 1000)); 
            }
        }
      } catch (error) {
        console.error("AwardsTracker Load Error:", error);
        if (isMounted) setLoading(false);
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  const awardRaces = useMemo(() => {
    if (!players || !players.length || !teams || !teams.length || !auxData) return null;

    const getTeamData = (teamAbbr: string) => teams.find(t => t.abbreviation === teamAbbr) || { wins: 41, losses: 41, defRtg: 115, netRtg: 0 };

    const isEligible = (p: any, require20Min: boolean = true) => {
      if (!p || !p.stats) return false;
      const team = getTeamData(p.teamId);
      const teamGamesPlayed = team.wins + team.losses || 82;
      const gp = p.stats.gp || 0;
      const missedGames = teamGamesPlayed - gp;
      
      if (missedGames > 17) return false; 
      if (require20Min && (p.stats.mpg || 0) < 20) return false; 
      return true;
    };

    const safePlayers = players.map(p => ({
        ...p,
        stats: p.stats || {},
        adv: p.adv || {},
        hustle: p.hustle || { deflections: 0, contestedShots: 0, contested3pt: 0, chargesDrawn: 0 }
    }));

    const qualified = safePlayers.filter(p => isEligible(p, true));

    const distBPM = qualified.map(p => p.adv?.bpm || 0);
    const distSI = qualified.map(p => p.adv?.si || 100);
    const distUSG = qualified.map(p => p.adv?.usg || 15);
    const distTS = qualified.map(p => p.adv?.ts || 55);
    const distPPG = qualified.map(p => p.stats?.ppg || 0);
    const distAPG = qualified.map(p => p.stats?.apg || 0);
    const distRPG = qualified.map(p => p.stats?.rpg || 0);
    const distDefRtg = qualified.map(p => p.stats?.defRating || 115);
    const distSPG = qualified.map(p => p.stats?.spg || 0);
    const distBPG = qualified.map(p => p.stats?.bpg || 0);
    const distDeflections = qualified.map(p => p.hustle?.deflections || 0);
    const distContested = qualified.map(p => p.hustle?.contestedShots || 0);
    const teamWinPcts = teams.map(t => t.wins / (t.wins + t.losses || 1));
    const teamDefRtgs = teams.map(t => t.defRtg || 115);

    // ==========================================
    // 👑 1. MVP 
    // ==========================================
    const mvp = [...qualified].map(p => {
      const team = getTeamData(p.teamId);
      const winPct = team.wins / (team.wins + team.losses || 1);
      
      const score = 
        (zScore(p.adv?.bpm || 0, distBPM) * 4.5) +
        (zScore(p.adv?.si || 100, distSI) * 3.5) +
        (zScore(p.adv?.usg || 15, distUSG) * 3.0) +  
        (zScore(p.stats?.ppg || 0, distPPG) * 1.5) +
        (zScore(115 - (p.stats?.defRating || 115), distDefRtg.map(d=>115-d)) * 1.5) + 
        (zScore(winPct, teamWinPcts) * 4.0);

      const displayScore = 100 + (score * 15);
      return { ...p, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "MVP z-Score" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // 🛡️ 2. DPOY 
    // ==========================================
    const dpoy = [...qualified].map(p => {
      const team = getTeamData(p.teamId);
      const teamDefRtg = team.defRtg || 115;
      const indDefRtg = p.stats?.defRating || 115;
      
      const stocks = (p.stats?.bpg || 0) + (p.stats?.spg || 0);
      if (indDefRtg > 113.5 || stocks < 1.2) return { ...p, score: -100, scoreLabel: "N/A" };
      
      const score = 
        (zScore(115 - indDefRtg, distDefRtg.map(d=>115-d)) * 4.0) +
        (zScore(p.hustle?.contestedShots || 0, distContested) * 4.5) + 
        (zScore(p.hustle?.deflections || 0, distDeflections) * 3.5) +  
        (zScore(p.stats?.bpg || 0, distBPG) * 4.5) + 
        (zScore(p.stats?.spg || 0, distSPG) * 3.5) +
        (zScore(115 - teamDefRtg, teamDefRtgs.map(d=>115-d)) * 1.0); 

      const displayScore = 100 + (score * 12);
      return { ...p, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "D-RAPTOR Prox" };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // ==========================================
    // ⚡ 3. 6MOY
    // ==========================================
    const hasBenchData = auxData.benchStats && auxData.benchStats.size > 10;
    
    const smoyEligible = qualified.filter(p => {
        const gp = p.stats?.gp || 82;
        
        if (hasBenchData) {
            const benchGP = auxData.benchStats.get(p.id) || 0;
            return benchGP > (gp / 2);
        } else {
            return (p.stats?.mpg || 0) < 32 && (p.stats?.ppg || 0) < 22 && (p.stats?.gs || 0) < (gp / 2);
        }
    });
    
    const smoy = [...smoyEligible].map(p => {
      const score = 
        (zScore(p.stats?.ppg || 0, distPPG) * 3.5) +
        (zScore(p.adv?.usg || 15, distUSG) * 2.0) +
        (zScore(p.adv?.ts || 55, distTS) * 1.2) +
        (zScore(p.adv?.bpm || 0, distBPM) * 2.2);

      const displayScore = 100 + (score * 15);
      return { ...p, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "Bench Spark" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // ⭐ 4. ROY 
    // ==========================================
    const royEligible = safePlayers.filter(p => auxData.rookies.has(p.id) && isEligible(p, false));
    const roy = [...royEligible].map(p => {
      const score = 
        (zScore(p.stats?.ppg || 0, distPPG) * 2.2) +
        (zScore(p.stats?.apg || 0, distAPG) * 1.5) +
        (zScore(p.adv?.usg || 15, distUSG) * 1.0) +
        (zScore(p.adv?.bpm || 0, distBPM) * 1.5);

      const displayScore = 100 + (score * 15);
      return { ...p, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "Rookie Base" };
    }).sort((a, b) => b.score - a.score);

    // ==========================================
    // 📈 5. MIP 
    // ==========================================
    const mipEligible = qualified.filter(p => !auxData.rookies.has(p.id) && auxData.prevPlayers.has(p.id));
    const mip = [...mipEligible].map(p => {
      const prev = auxData.prevPlayers.get(p.id) || { stats: { ppg: 0, mpg: 1 }, adv: { bpm: 0, ts: 55 } };
      const deltaPPG = (p.stats?.ppg || 0) - (prev.stats?.ppg || 0);
      const deltaMIN = (p.stats?.mpg || 0) - (prev.stats?.mpg || 1);
      const organicImprovement = deltaPPG - (deltaMIN * 0.4); 
      
      const deltaBPM = (p.adv?.bpm || 0) - (prev.adv?.bpm || 0);
      const deltaTS = (p.adv?.ts || 55) - (prev.adv?.ts || 55);
      
      if ((p.stats?.ppg || 0) < 12 || organicImprovement < 1) return { ...p, score: -100, scoreLabel: "N/A" };
      
      let rawScore = (organicImprovement * 4.5) + (deltaBPM * 5.0) + (deltaTS * 2.5);

      if ((prev.stats?.ppg || 0) >= 20) rawScore -= 100; 
      if (p.age >= 28) rawScore -= 50; 
      if (p.age <= 22) rawScore -= 200; 
      
      return { ...p, score: isNaN(rawScore) ? 0 : rawScore * 10, scoreLabel: "Delta z-Score" };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // ==========================================
    // 🎯 6. CPOY 
    // ==========================================
    const hasClutchData = auxData.clutchStats && auxData.clutchStats.size > 10;
    
    const cpoyEligible = hasClutchData 
        ? qualified.filter(p => auxData.clutchStats.has(p.id)) 
        : qualified.filter(p => (p.stats?.ppg || 0) > 18);

    const distClutchPtsPG = cpoyEligible.map(p => {
        const c = auxData.clutchStats?.get(p.id);
        return c ? (c.pts / (c.gp || 1)) : 0;
    });
    const distClutchTS = cpoyEligible.map(p => auxData.clutchStats?.get(p.id)?.ts || 50);
    const distClutchPM = cpoyEligible.map(p => auxData.clutchStats?.get(p.id)?.plusMinus || 0);

    const cpoy = [...cpoyEligible].map(p => {
      if (hasClutchData) {
          const clutch = auxData.clutchStats.get(p.id);
          if (!clutch || clutch.gp < 4 || clutch.pts < 5) return { ...p, score: -100, scoreLabel: "N/A" }; 
          
          const clutchPtsPG = clutch.pts / (clutch.gp || 1);
          
          const score = 
              (zScore(clutchPtsPG, distClutchPtsPG) * 4.5) +   
              (zScore(clutch.ts, distClutchTS) * 3.0) +        
              (zScore(clutch.plusMinus, distClutchPM) * 1.0);  

          const displayScore = 100 + (score * 20);
          return { ...p, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "Clutch Value" };
      } else {
          const proxyScore = (zScore(p.stats?.ppg || 0, distPPG) * 3.0) + (zScore(p.adv?.usg || 15, distUSG) * 2.5) + (zScore(p.adv?.bpm || 0, distBPM) * 2.0);
          return { ...p, score: isNaN(100 + (proxyScore * 15)) ? 0 : 100 + (proxyScore * 15), scoreLabel: "Clutch Proxy" };
      }
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // ==========================================
    // 👔 7. COTY
    // ==========================================
    const coty = [...teams].map(t => {
      const winPct = t.wins / (t.wins + t.losses || 1);
      const prevTeam = auxData.prevTeams.get(t.id);
      const prevWinPct = prevTeam ? (prevTeam.wins / (prevTeam.wins + prevTeam.losses || 1)) : 0.500;
      
      let winImprovement = winPct - prevWinPct;
      
      const distImprovement = teams.map(tm => {
          const pt = auxData.prevTeams.get(tm.id);
          return (tm.wins / (tm.wins + tm.losses || 1)) - (pt ? (pt.wins / (pt.wins + pt.losses || 1)) : 0.5);
      });

      let improvementZScore = zScore(winImprovement, distImprovement);
      if (winImprovement < 0) improvementZScore *= 2.5; 
      
      const score = 
        (zScore(winPct, teamWinPcts) * 6.0) +
        (zScore(t.netRtg || 0, teams.map(tm => tm.netRtg || 0)) * 3.5) +
        (improvementZScore * 4.0);
      
      const coachData = coaches[t.abbreviation] || { name: `${t.name} Coach` };
      const coachName = coachData.name;
      const coachImage = ENRICHED_DATA[coachName]?.img ? ENRICHED_DATA[coachName].img : getAvatarUrl(coachName);
      
      const displayScore = 100 + (score * 15);
      return { id: t.id, name: coachName, teamId: t.abbreviation, imageUrl: coachImage, score: isNaN(displayScore) ? 0 : displayScore, scoreLabel: "Coach Index" };
    }).sort((a, b) => b.score - a.score);

    return { 
      "MVP": { list: mvp, formula: "[z(BPM)×4.5] + [z(USG)×3.0] + [z(DefRtg)×1.5] + Base Stats Z-Scores" },
      "DPOY": { list: dpoy, formula: "[z(Contested)×4.5] + [z(Deflections)×3.5] + [z(BLK)×4.5] + Stocks Filter" },
      "6MOY": { list: smoy, formula: "Starts < 50%. [z(PPG)×3.5] + [z(USG)×2.0] + [z(BPM)×2.2]" },
      "ROY": { list: roy, formula: "Official Rookies. [z(PPG)×2.2] + [z(APG)×1.5] + [z(BPM)×1.5]" },
      "MIP": { list: mip, formula: "Narrative Z-Scores: [z(Org. PPG)×4.5] + [z(ΔBPM)×5] - Heavy Anti-Sophomore" },
      "CPOY": { list: cpoy, formula: "Clutch PTS/G × 4.5 + TS% × 3.0 + PlusMinus × 1.0 (Hero Ball weighted)" },
      "COTY": { list: coty, formula: "[z(Win%)×6] + [z(NetRtg)×3.5] + [z(Win% YoY Delta)×4] (Underachiever Penalty)" },
      "ALL-NBA": { list: mvp.slice(0, 15), formula: "Top 15 players in Z-Score MVP Composite (Positionless)" },
      "ALL-DEFENSE": { list: dpoy.slice(0, 10), formula: "Top 10 players in Z-Score DPOY Index (Positionless)" },
      "ALL-ROOKIE": { list: roy.slice(0, 10), formula: "Top 10 Rookies in Z-Score ROY Index (Positionless)" },
    };
  }, [players, teams, auxData, coaches]);

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

  const renderTeamSection = (title: string, playersChunk: any[]) => {
    if (!playersChunk || playersChunk.length === 0) return null;

    const sortedChunk = [...playersChunk];

    return (
      <div className="mb-10 last:mb-0">
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-white/10 pb-3">
          <Trophy className="w-5 h-5 text-amber-500" /> {title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {sortedChunk.map((p, i) => (
            <button 
                key={p.id} 
                onClick={() => navigate(`/nba/players/${p.id}`)} // 🚀 FIX RUTA NAVEGACIÓN
                className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border border-white/5 bg-[#0a0a0a] group transition-all duration-500 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] shadow-2xl cursor-pointer text-left w-full"
            >
              
              <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:brightness-110"
              />
              
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-0" />

              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3 z-10">
                  <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shrink-0 shadow-lg p-1">
                      <img
                        src={nbaService.getTeamLogoUrl(p.teamId)}
                        alt={p.teamId}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                      <p className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-tight mb-1.5 line-clamp-2">{p.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{p.teamId}</p>
                  </div>
              </div>
            </button>
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
                   {renderTeamSection("First Team", currentList.slice(0, 5))}
                   {renderTeamSection("Second Team", currentList.slice(5, 10))}
                   {(activeAward === "ALL-NBA") && renderTeamSection("Third Team", currentList.slice(10, 15))}
                 </>
               )}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentList[0] ? (
                <button 
                  onClick={() => navigate(`/nba/players/${currentList[0].id}`)} // 🚀 FIX RUTA NAVEGACIÓN
                  className="md:col-span-2 bg-gradient-to-br from-amber-500/20 to-[#111] rounded-[2rem] border border-amber-500/30 p-8 flex flex-col md:flex-row items-center text-center md:text-left relative overflow-hidden shadow-2xl gap-8 cursor-pointer w-full group"
                >
                  <div className="absolute top-4 right-4 text-8xl font-black italic text-amber-500/10 pointer-events-none transition-transform group-hover:scale-110">#1</div>
                  
                  <div className="w-48 h-48 shrink-0 relative">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-[40px] group-hover:bg-amber-500/30 transition-colors" />
                    <img src={currentList[0].imageUrl} alt={currentList[0].name} className="w-full h-full object-cover rounded-full drop-shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center w-full relative z-10">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <Crown className="w-6 h-6 text-amber-500" />
                      <span className="text-sm font-bold text-amber-500 uppercase tracking-widest">{activeAward} Favorite</span>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2 leading-tight">{currentList[0].name}</h2>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 block">{currentList[0].teamId}</span>
                    
                    <div className="flex gap-4 w-full justify-center md:justify-start">
                      <div className="bg-black/50 border border-amber-500/20 rounded-2xl p-4 min-w-[120px] backdrop-blur-md text-center group-hover:bg-black/60 transition-colors">
                        <span className="text-[10px] font-black text-[#888] uppercase tracking-widest block mb-1">{currentList[0].scoreLabel}</span>
                        <span className="text-3xl font-mono font-black text-amber-400">{currentList[0].score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                 <div className="md:col-span-2 bg-[#111] border border-dashed border-white/10 rounded-[2rem] p-16 text-center shadow-inner">
                   <Shield className="w-12 h-12 text-rose-500/50 mx-auto mb-4" />
                   <p className="text-rose-400 font-black uppercase tracking-widest text-lg mb-2">No Qualifying Candidates</p>
                   <p className="text-slate-500 text-sm max-w-md mx-auto">Either no players meet the strict CBA requirements or the API returned empty data.</p>
                 </div>
              )}

              {currentList.slice(1, 10).map((p, i) => (
                <button 
                    key={p.id} 
                    onClick={() => navigate(`/nba/players/${p.id}`)} // 🚀 FIX RUTA NAVEGACIÓN
                    className="bg-[#111] border border-[#222] rounded-2xl p-5 flex items-center gap-5 hover:border-white/10 hover:bg-[#151515] transition-all shadow-inner group cursor-pointer text-left w-full"
                >
                  <div className="text-xl font-black italic text-[#444] w-6 text-center group-hover:text-amber-500/50 transition-colors">#{i + 2}</div>
                  <Avatar className="w-14 h-14 border border-[#333] bg-slate-800 group-hover:scale-105 transition-transform">
                    <AvatarImage src={p.imageUrl} className="object-cover" />
                    <AvatarFallback>{p.name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-white uppercase tracking-tight truncate">{p.name}</h3>
                    <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{p.teamId}</span>
                  </div>
                  <div className="text-right shrink-0 pr-2">
                    <span className="block text-xl font-mono font-black text-white">{p.score.toFixed(1)}</span>
                    <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest">Score</span>
                  </div>
                   <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
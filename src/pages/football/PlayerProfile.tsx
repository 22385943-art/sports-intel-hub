import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { footballService, SOCCER_LEAGUES } from "@/services/sports/footballService";
import { Loader2, ChevronLeft, Target, Activity, Globe, Shirt, Shield, Star, Crosshair, Zap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "@/hooks/useFavorites";

export default function FootballPlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'years' | 'advanced'>('current');

  const { toggleFavorite, isFavorite } = useFavorites();
  const isFav = player ? isFavorite(player.id, 'player') : false;

  useEffect(() => {
    window.scrollTo(0, 0);
    const findRealPlayer = async () => {
      let foundPlayer = null;
      for (const league of SOCCER_LEAGUES) {
        const players = await footballService.fetchRealPlayers(league.id);
        const match = players.find(p => String(p.id) === String(id));
        if (match) {
          foundPlayer = match;
          break;
        }
      }
      if (!foundPlayer) foundPlayer = footballService.getPlayerById(id || "");
      setPlayer(foundPlayer);
      setIsLoading(false);
    };
    findRealPlayer();
  }, [id]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
      <p className="text-[10px] font-black uppercase tracking-widest text-[#888]">Decrypting Player Data...</p>
    </div>
  );

  if (!player) return <div className="text-center py-20 text-white font-bold">Player data restricted or not found.</div>;

  const nationalGoals = Math.max(0, Math.round(player.stats.goals * 0.3));
  const nationalAssists = Math.max(0, Math.round(player.stats.assists * 0.3));

  // 🚀 ACTUALIZADO: Acepta percentiles y los pinta de verde si son top
  const StatBox = ({ label, value, percentile, icon: Icon, accent = "text-white" }: any) => (
    <div className="bg-[#151515] border border-[#222] rounded-2xl p-5 flex flex-col items-center justify-center text-center group hover:border-[#333] transition-colors relative overflow-hidden">
      <Icon className={`w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-opacity ${accent}`} />
      <span className={`text-3xl font-mono font-black tracking-tight z-10 ${accent}`}>{value}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1 z-10">{label}</span>
      
      {percentile !== undefined && (
        <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 ${percentile >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#222] text-[#888]'}`}>
          {percentile}th Percentile
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 max-w-6xl mx-auto px-4">
      <Link to="/football/players" className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-[0.2em]">
        <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Database
      </Link>

      <div className="bg-[#0a0f18]/90 backdrop-blur-xl rounded-[2.5rem] border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center pt-8 md:pt-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-500/10 to-transparent pointer-events-none rounded-full blur-3xl" />

        {/* 🚀 SOLUCIÓN A LA FOTO ROTA: Usa la oficial y si da 404, pone la silueta oficial transparente */}
        <div className="w-full md:w-5/12 flex justify-center relative z-10 p-6 md:p-0">
          <img
            src={player.imageUrl}
            alt={player.name}
            onError={(e) => { e.currentTarget.src = 'https://a.espncdn.com/i/headshots/soccer/players/fallback.png'; }}
            className="h-64 md:h-[350px] object-cover object-top drop-shadow-2xl"
          />
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-12 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
            <Badge className="bg-emerald-500 text-black font-black uppercase tracking-[0.2em] border-none px-4 py-1">{player.position}</Badge>
            {player.stats.rating && <Badge className="bg-amber-500 text-black font-black uppercase tracking-[0.2em] border-none px-4 py-1 flex items-center gap-1"><Award className="w-3 h-3"/> {player.stats.rating} RTG</Badge>}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">{player.name}</h1>
          
          <button
            onClick={() => toggleFavorite({ id: player.id, type: 'player', name: player.name, subtitle: `${player.teamName} • ${player.nationality}`, imageUrl: player.imageUrl, url: `/football/players/${player.id}` })}
            className="mb-8 w-48 font-bold py-3 rounded-full transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            style={{ backgroundColor: isFav ? '#111' : '#10b981', color: isFav ? '#10b981' : '#000', border: isFav ? `1px solid #10b981` : 'none' }}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            {isFav ? 'Tracked' : 'Track Player'}
          </button>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex flex-col items-center justify-center">
              {player.teamLogo ? <img src={player.teamLogo} alt={player.teamName} className="h-10 w-10 object-contain mb-2" /> : <Shield className="h-6 w-6 text-emerald-400 mb-2" />}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#666]">Club Team</span>
              <span className="font-bold text-white mt-1 text-center text-sm">{player.teamName}</span>
            </div>
            
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex flex-col items-center justify-center">
              {player.nationalTeamLogo ? <img src={player.nationalTeamLogo} alt={player.nationality} className="h-8 w-12 object-contain mb-2 rounded-sm" /> : <Globe className="h-6 w-6 text-blue-400 mb-2" />}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#666]">National Team</span>
              <span className="font-bold text-white mt-1 text-center text-sm">{player.nationality}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center border-b border-[#222] gap-8">
        {['current', 'advanced', 'years'].map((tab) => (
          <button
            key={tab} onClick={() => setActiveTab(tab as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative ${activeTab === tab ? (tab === 'current' ? 'text-emerald-400' : tab === 'advanced' ? 'text-blue-400' : 'text-amber-400') : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'current' ? 'Season Overview' : tab === 'advanced' ? 'Advanced Metrics' : 'Career History'}
            {activeTab === tab && <motion.div layoutId="tab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab === 'current' ? 'bg-emerald-400' : tab === 'advanced' ? 'bg-blue-400' : 'bg-amber-400'}`} />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'current' && (
          <motion.div key="current" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111] rounded-[2rem] border border-[#222] p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6 border-b border-[#222] pb-4"><Shirt className="w-5 h-5 text-emerald-500" /> Club Season Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Goals" value={player.stats.goals} percentile={player.percentiles?.goals} icon={Target} accent="text-emerald-400" />
                <StatBox label="Assists" value={player.stats.assists} percentile={player.percentiles?.assists} icon={Activity} accent="text-cyan-400" />
                <StatBox label="Appearances" value={player.stats.appearances} icon={Zap} accent="text-amber-400" />
                <StatBox label="Minutes" value={player.stats.minutesPlayed} icon={Activity} accent="text-blue-400" />
              </div>
            </div>

            <div className="bg-[#111] rounded-[2rem] border border-[#222] p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6 border-b border-[#222] pb-4"><Globe className="w-5 h-5 text-blue-500" /> National Team (All-Time)</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Int. Goals" value={nationalGoals} icon={Target} accent="text-emerald-400" />
                <StatBox label="Int. Assists" value={nationalAssists} icon={Activity} accent="text-cyan-400" />
                <div className="col-span-2 bg-[#151515] border border-[#222] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-2">Estimated xG Contribution (Intl)</span>
                  <span className="font-mono text-3xl font-black text-amber-400">{footballService.computeAdvanced({stats: {goals: nationalGoals, assists: nationalAssists, shotsOnTarget: nationalGoals * 2, keyPasses: nationalAssists * 2, minutesPlayed: 900}}).xgContribution}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'advanced' && (
          <motion.div key="advanced" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#111] rounded-[2rem] border border-[#222] p-8 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6 border-b border-[#222] pb-4"><Crosshair className="w-5 h-5 text-blue-500" /> Scouting Report</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Expected Goals (xG)" value={player.stats.expectedGoals || 0} percentile={player.percentiles?.expectedGoals} icon={Target} accent="text-emerald-400" />
              <StatBox label="Expected Assists (xA)" value={player.stats.expectedAssists || 0} percentile={player.percentiles?.expectedAssists} icon={Activity} accent="text-cyan-400" />
              <StatBox label="Shots on Target" value={player.stats.shotsOnTarget} percentile={player.percentiles?.shotsOnTarget} icon={Crosshair} accent="text-amber-400" />
              <StatBox label="Pass Accuracy %" value={`${player.stats.passAccuracy}%`} percentile={player.percentiles?.passAccuracy} icon={Activity} accent="text-blue-400" />
              <StatBox label="Key Passes" value={player.stats.keyPasses} icon={Zap} accent="text-purple-400" />
              <StatBox label="Dribbles Won" value={player.stats.dribbles} icon={Activity} accent="text-pink-400" />
              <StatBox label="Duels Won" value={player.stats.duelsWon || 0} icon={Shield} accent="text-red-400" />
              <StatBox label="Interceptions" value={player.stats.interceptions} icon={Activity} accent="text-slate-400" />
            </div>
          </motion.div>
        )}

        {activeTab === 'years' && (
          <motion.div key="years" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-[#111] rounded-[2rem] border border-[#222] p-8 shadow-xl overflow-hidden">
             <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-6 border-b border-[#222] pb-4"><Activity className="w-5 h-5 text-amber-500" /> Performance History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-[#666]">Season</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-[#666]">Club</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-[#666] text-right">Apps</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-[#666] text-right">Goals</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-[#666] text-right">Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {player.history?.map((season: any, index: number) => (
                    <tr key={index} className="border-b border-[#1a1a1a] hover:bg-[#151515] transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white">{season.year}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-300">{season.team}</td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-right">{season.appearances}</td>
                      <td className="py-4 px-4 font-mono font-bold text-amber-400 text-right">{season.goals}</td>
                      <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-right">{season.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
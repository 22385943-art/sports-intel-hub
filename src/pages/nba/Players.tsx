import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowUpDown, ShieldAlert, Zap, Target, Brain, Crown, Activity, AlertCircle, Crosshair } from "lucide-react";

// 🧠 IA SCOUTING V2.0: MOTOR DE ARQUETIPOS (Estilo NBA 2K)
const getArchetype = (p: any) => {
  const { ppg, rpg, apg, bpg, spg, threePct, fgPct, fta } = p.stats;
  const { usg, defRating, astPct, ts, pie } = p.adv;

  // 📊 1. Variables de Perfil Base
  const isHighVolume = usg >= 27;
  const isEfficient = ts >= 60;
  const isEliteDefender = defRating > 0 && defRating <= 111; // 111 o menos es élite defensiva hoy en día
  const isShooter = threePct >= 37.0 && ppg >= 8; 
  // Slasher: Tira muchos libres, acierta mucho de campo, no depende del triple
  const isSlasher = fta >= 5.5 && fgPct >= 50 && threePct <= 34;
  
  // 👽 LA REGLA WEMBANYAMA / HOLMGREN
  // Jugadores interiores que taponan muchísimo y tiran de 3 de forma constante (aunque sea al 32-34%)
  const isUnicorn = bpg >= 2.0 && threePct >= 31 && rpg >= 8;

  // 🏆 TIER 1: SUPERESTRELLAS (Impacto Masivo)
  if (pie >= 16 && ppg >= 23) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
    if (apg >= 8) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isShooter && isEfficient) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  }

  // 🦄 Excepción directa para unicornios defensivos que no lleguen a 23 puntos (ej: Wemby de rookie)
  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };

  // 🌟 TIER 2: ESTRELLAS Y ESPECIALISTAS ÉLITE
  if (apg >= 8 || astPct >= 35) {
     if (isEliteDefender) return { label: "Two-Way Playmaker", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
     return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  }

  if (rpg >= 8.5) {
     // Stretch Big: Pivots que abren el campo de verdad (ej: Karl-Anthony Towns)
     if (threePct >= 35) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
     // Paint Beast: Protectores de aro puros que NO tiran triples (ej: Gobert, Jarrett Allen)
     if ((bpg >= 1.5 || isEliteDefender) && threePct <= 30) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" };
     // Playmaking Big: (ej: Sabonis, Sengun)
     if (apg >= 4.5) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
     
     return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  }

  if (isSlasher && ppg >= 18) {
     return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  }

  if (isShooter && ppg >= 18) {
     if (isHighVolume) return { label: "Shot Creator", icon: Zap, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" };
     return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  }

  // 🛡️ TIER 3: JUGADORES DE ROL CLAVE
  // 3 and D Wing: Mikal Bridges, OG Anunoby...
  if (isShooter && isEliteDefender && usg < 22) {
    return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  }
  
  // Lockdown puro: Herb Jones, Alex Caruso...
  if (isEliteDefender && (spg >= 1.4 || bpg >= 1.0) && usg < 18) {
    return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/30" };
  }

  if (isShooter && usg < 20) {
    return { label: "Catch & Shoot", icon: Crosshair, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
  }

  // Microwave Scorer: Sexto hombre chupon que anota mucho sin ser eficiente
  if (ppg >= 14 && isHighVolume && !isEfficient) {
    return { label: "Microwave Scorer", icon: Zap, color: "text-orange-400 bg-orange-400/10 border-orange-400/30" };
  }

  // Jugadores pegamento (Josh Hart, Derrick White)
  if (ppg >= 10 && rpg >= 4 && apg >= 3) {
    return { label: "Connective Glue", icon: Activity, color: "text-blue-300 bg-blue-300/10 border-blue-300/30" };
  }

  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
};

const getPercentileColor = (p: number) => {
  if (p >= 90) return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]";
  if (p >= 75) return "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]";
  if (p >= 50) return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]";
  return "bg-rose-500";
};

export default function NBAPlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [strictQualifiers, setStrictQualifiers] = useState(true);
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'per', direction: 'desc' });

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then((data) => {
      const maxGP = Math.max(...data.map(p => p.stats?.gp || 0));
      const requiredGP = Math.floor(maxGP * 0.7);

      const playersWithAdv = data.map(p => {
        const adv = nbaService.computeAllAdvanced(p);
        const meetsMins = (p.stats?.mpg || 0) >= 20;
        const meetsGP = (p.stats?.gp || 0) >= requiredGP;
        
        // Asignamos el arquetipo calculándolo con la IA V2
        const archetype = getArchetype({ ...p, adv });

        return {
          ...p,
          adv,
          archetype,
          qualifies: meetsMins && meetsGP,
        };
      });

      const distributions: Record<string, number[]> = {
        ppg: playersWithAdv.map(p => p.stats.ppg).sort((a, b) => a - b),
        rpg: playersWithAdv.map(p => p.stats.rpg).sort((a, b) => a - b),
        apg: playersWithAdv.map(p => p.stats.apg).sort((a, b) => a - b),
        per: playersWithAdv.map(p => p.adv.per).sort((a, b) => a - b),
        bpm: playersWithAdv.map(p => p.adv.bpm).sort((a, b) => a - b),
        ts: playersWithAdv.map(p => p.adv.ts).sort((a, b) => a - b),
      };

      const calcPercentile = (val: number, arr: number[]) => {
        if (!arr.length) return 50;
        const countLower = arr.filter(v => v <= val).length;
        return Math.round((countLower / arr.length) * 100);
      };

      const finalPlayers = playersWithAdv.map(p => ({
        ...p,
        pct: {
          ppg: calcPercentile(p.stats.ppg, distributions.ppg),
          rpg: calcPercentile(p.stats.rpg, distributions.rpg),
          apg: calcPercentile(p.stats.apg, distributions.apg),
          per: calcPercentile(p.adv.per, distributions.per),
          bpm: calcPercentile(p.adv.bpm, distributions.bpm),
          ts: calcPercentile(p.adv.ts, distributions.ts),
        }
      }));

      setPlayers(finalPlayers);
      setIsLoading(false);
    });
  }, []);

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === "all" || p.teamId === teamFilter;
      const matchesQual = strictQualifiers ? p.qualifies : (p.stats?.mpg || 0) >= 5;

      return matchesSearch && matchesTeam && matchesQual;
    });

    filtered.sort((a, b) => {
      let valA = 0; let valB = 0;
      
      if (['ppg', 'rpg', 'apg'].includes(sortConfig.key)) {
        valA = a.stats[sortConfig.key];
        valB = b.stats[sortConfig.key];
      } else {
        valA = a.adv[sortConfig.key];
        valB = b.adv[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [players, search, teamFilter, strictQualifiers, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: string }) => (
    <div 
      className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors group select-none"
      onClick={() => handleSort(sortKey)}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortConfig.key === sortKey ? 'text-blue-400 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Compiling Scouting Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Scouting Hub</h1>
          <p className="text-slate-400 text-sm font-medium tracking-tight mt-2">Official 2025-26 NBA Database. Advanced player evaluation and archetype engine.</p>
        </div>
        <Badge className="bg-blue-600/10 text-blue-400 border border-blue-500/20 font-black text-[10px] px-4 py-2 uppercase tracking-widest w-fit">
          {filteredAndSortedPlayers.length} Athletes Found
        </Badge>
      </div>

      <Card className="bg-[#0a0f18] border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search athlete by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <div className="md:col-span-4 flex gap-3">
            <select 
              value={teamFilter} 
              onChange={(e) => setTeamFilter(e.target.value)}
              className="flex-1 bg-[#0f172a] border border-white/10 rounded-2xl py-3 px-4 text-white text-xs font-bold outline-none cursor-pointer hover:border-white/30 transition-colors"
            >
              <option value="all" className="bg-[#0f172a]">ALL TEAMS</option>
              {Array.from(new Set(players.map(p => p.teamId))).sort().map(t => (
                <option key={t} value={t} className="bg-[#0f172a]">{t}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-3 bg-[#0f172a] border border-white/10 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Official<br/>Qualifiers</span>
            <button 
              onClick={() => setStrictQualifiers(!strictQualifiers)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${strictQualifiers ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${strictQualifiers ? 'translate-x-6' : 'translate-x-1.5'}`} />
            </button>
          </div>

        </div>
      </Card>

      {!strictQualifiers && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-amber-500/90 leading-relaxed">
            <span className="text-amber-400 font-black">UNQUALIFIED DATA WARNING:</span> Players marked with an asterisk (<span className="text-xl leading-none">*</span>) do not meet official NBA volume requirements. Their statistics and archetypes may be skewed by small sample sizes.
          </p>
        </div>
      )}

      <div className="bg-[#0a0f18] border border-white/10 rounded-3xl shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/10">
              <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Athlete</th>
              <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><SortableHeader label="PTS" sortKey="ppg" /></th>
              <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><SortableHeader label="REB" sortKey="rpg" /></th>
              <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><SortableHeader label="AST" sortKey="apg" /></th>
              <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/70 border-l border-white/5"><SortableHeader label="PER" sortKey="per" /></th>
              <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/70"><SortableHeader label="BPM" sortKey="bpm" /></th>
              <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-teal-400/70"><SortableHeader label="TS%" sortKey="ts" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredAndSortedPlayers.map((p, i) => (
              <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-600 font-mono font-black text-xs w-4">{i + 1}</span>
                    {/* 🚀 CORRECCIÓN AQUÍ: Cambiado de /nba/player/ a /nba/players/ */}
                    <Link to={`/nba/players/${p.id}`}>
                      <Avatar className="h-12 w-12 border border-white/10 shadow-lg cursor-pointer hover:border-blue-400 transition-colors bg-white">
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-400">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex flex-col gap-1.5">
                      {/* 🚀 CORRECCIÓN AQUÍ TAMBIÉN: Cambiado de /nba/player/ a /nba/players/ */}
                      <Link to={`/nba/players/${p.id}`} className="hover:text-blue-400 transition-colors w-fit">
                        <span className="text-sm font-bold text-white flex items-center gap-1">
                          {p.name} {!p.qualifies && !strictQualifiers && <span className="text-amber-500 font-black text-lg leading-none">*</span>}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.teamId}</span>
                        <Badge className={`px-1.5 py-0 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${p.archetype.color} select-none`}>
                          <p.archetype.icon className="h-2.5 w-2.5" />
                          {p.archetype.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 align-middle">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-black text-white">{p.stats.ppg.toFixed(1)}</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getPercentileColor(p.pct.ppg)}`} style={{ width: `${p.pct.ppg}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-black text-white">{p.stats.rpg.toFixed(1)}</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getPercentileColor(p.pct.rpg)}`} style={{ width: `${p.pct.rpg}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-black text-white">{p.stats.apg.toFixed(1)}</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getPercentileColor(p.pct.apg)}`} style={{ width: `${p.pct.apg}%` }} />
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 align-middle border-l border-white/5">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-mono font-black text-blue-400">{p.adv.per.toFixed(1)}</span>
                    <div className="h-1 w-full bg-blue-900/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]`} style={{ width: `${p.pct.per}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-mono font-black text-emerald-400">{p.adv.bpm.toFixed(1)}</span>
                    <div className="h-1 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]`} style={{ width: `${p.pct.bpm}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 align-middle">
                  <div className="flex flex-col gap-1.5 w-16">
                    <span className="text-sm font-mono font-black text-teal-400">{p.adv.ts.toFixed(1)}%</span>
                    <div className="h-1 w-full bg-teal-900/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]`} style={{ width: `${p.pct.ts}%` }} />
                    </div>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedPlayers.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <Search className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No athletes found matching those filters</p>
          </div>
        )}
      </div>

    </div>
  );
}
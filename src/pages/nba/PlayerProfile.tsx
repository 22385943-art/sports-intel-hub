import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { ArrowLeft, Loader2, Activity, Target, Zap, Shield, Crown, BarChart3, TrendingUp, Star, Trophy, Award, Users, Hexagon, CalendarDays, ShieldAlert, Brain, Crosshair } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { NBAPlayer } from "@/data/nba/mockData";
import { useFavorites } from "@/hooks/useFavorites"; 
import ShotChart from "@/components/ShotChart";
import { Badge } from "@/components/ui/badge";

// 🚀 Generador automático de temporadas
const SEASONS = Array.from({ length: 30 }, (_, i) => {
  const startYear = 2025 - i;
  const nextYear = String(startYear + 1).slice(-2);
  return `${startYear}-${nextYear}`;
});

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

const getArchetype = (p: any) => {
  // 🚀 FIX 3 CLAUDE: Si el jugador tiene 0 GP, el arquetipo debe ser N/A
  if (!p || (p.stats?.gp ?? 0) === 0 || (p as any).ghostPlayer) {
    return { label: 'NO DATA', icon: Activity, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
  }

  const pct = p.percentiles || {};
  
  const isHighVolume = (pct.USG || 50) >= 85;
  const isEfficient = (pct.Efficiency || 50) >= 80;
  const isEliteDefender = (pct.Defense || 50) >= 85;
  const isShooter = (pct.Shooting || 50) >= 80 && (pct.Scoring || 50) >= 60;
  const isSlasher = (pct.Finishing || 50) >= 85 && (pct.FtaRate || 50) >= 75 && (pct.Shooting || 50) <= 60;
  const isUnicorn = (pct.Blocks || 50) >= 85 && (pct.ThreePA || 50) >= 70 && (pct.Rebounding || 50) >= 75;
  
  const isSuperstar = (pct.Impact || 50) >= 95 && (pct.Scoring || 50) >= 90;
  const isElitePlaymaker = (pct.Playmaking || 50) >= 85 || (pct.AstPct || 50) >= 85;
  const isEliteRebounder = (pct.Rebounding || 50) >= 85;

  if (isSuperstar) {
    if (isUnicorn) return { label: "Two-Way Unicorn", icon: Crown, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
    if (isElitePlaymaker) return { label: "Offensive Hub", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isSlasher && isEliteDefender) return { label: "Two-Way Force", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    if (isShooter && isEfficient) return { label: "3-Level Scorer", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
    return { label: "Generational", icon: Crown, color: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  }

  if (isUnicorn) return { label: "Two-Way Unicorn", icon: ShieldAlert, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  
  if (isElitePlaymaker) {
    if (isEliteDefender) return { label: "Two-Way Playmaker", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    return { label: "Floor General", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  }
  
  if (isEliteRebounder) {
    if (isShooter) return { label: "Stretch Big", icon: Target, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
    if ((pct.Blocks || 50) >= 80 || isEliteDefender) return { label: "Paint Beast", icon: ShieldAlert, color: "text-rose-400 bg-rose-400/10 border-rose-400/30" };
    if (isElitePlaymaker) return { label: "Playmaking Big", icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    return { label: "Glass Cleaner", icon: Activity, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  }

  if (isSlasher && (pct.Scoring || 50) >= 75) return { label: "Fearless Slasher", icon: Zap, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  
  if (isShooter && (pct.Scoring || 50) >= 75) {
    if (isHighVolume) return { label: "Shot Creator", icon: Zap, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" };
    return { label: "Sharpshooter", icon: Crosshair, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  }
  
  if (isShooter && isEliteDefender && !isHighVolume) return { label: "3-and-D Wing", icon: Target, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  
  if (isEliteDefender && !isHighVolume) return { label: "Lockdown Defender", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/30" };
  
  if (isShooter && !isHighVolume) return { label: "Catch & Shoot", icon: Crosshair, color: "text-teal-400 bg-teal-400/10 border-teal-400/30" };
  
  if ((pct.Scoring || 50) >= 65 && isHighVolume && !isEfficient) return { label: "Microwave Scorer", icon: Zap, color: "text-orange-400 bg-orange-400/10 border-orange-400/30" };
  
  if ((pct.Scoring || 50) >= 50 && (pct.Rebounding || 50) >= 50 && (pct.Playmaking || 50) >= 50) return { label: "Connective Glue", icon: Activity, color: "text-blue-300 bg-blue-300/10 border-blue-300/30" };
  
  return { label: "Rotation Player", icon: Activity, color: "text-slate-400 bg-white/5 border-white/10" };
};

const StatRow = ({ label, val, highlight = false, valueColor = "" }: { label: string, val: string | number, highlight?: boolean, valueColor?: string }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.03] last:border-0 group">
    <span className="text-[10px] font-black uppercase tracking-widest text-[#666] group-hover:text-[#999] transition-colors">{label}</span>
    <span className={`text-[12px] md:text-sm font-mono font-black ${valueColor ? valueColor : (highlight ? 'text-white' : 'text-[#aaa]')}`}>{val}</span>
  </div>
);

const fPct = (val: string | number) => val !== "-" ? `${val}%` : "-";

export default function NBAPlayerProfile() {
  const { id } = useParams();
  const { sport } = useSport();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const season = searchParams.get("season") || "2025-26";
  
  const [activeTab, setActiveTab] = useState<"stats" | "analytics" | "shotchart" | "accolades" | "splits">("stats");
  const [statsView, setStatsView] = useState<"season" | "career">("season");
  const [boxScoreSubTab, setBoxScoreSubTab] = useState<"overview" | "scoring" | "playmaking" | "defense">("overview");

  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const { data: leagueData, isLoading: isBaseLoading } = useQuery({
    queryKey: ['nba', 'players-teams', season],
    queryFn: async () => {
      const [players, teams] = await Promise.all([
        nbaService.fetchAllOfficialPlayers(season),
        nbaService.fetchAllOfficialTeams(season),
      ]);
      return { players, teams };
    },
    staleTime: 1000 * 60 * 30, 
    gcTime: 1000 * 60 * 60,    
  });

  const allPlayers = leagueData?.players ?? [];
  const allTeams   = leagueData?.teams   ?? [];
  const player     = useMemo(
    () => allPlayers.find(p => p.id === id) ?? null,
    [allPlayers, id]
  );
  const isFav = player ? isFavorite(player.id, 'player') : false;

  const numericTeamId = useMemo(
    () => allTeams.find(t => t.abbreviation === player?.teamId)?.id,
    [allTeams, player]
  );

  const { data: deepData, isLoading: isDeepDataLoading } = useQuery({
    queryKey: ['nba', 'player-deep', id, season, numericTeamId],
    // 🚀 FIX 1 CLAUDE: Bypass de Deep Fetch si no tiene GP (0 GP = No Data)
    enabled: !!id && !!player && ((player as any).stats?.gp ?? 0) > 0,
    staleTime: 1000 * 60 * 15, 
    queryFn: async () => {
      const fetchBFF = async (endpoint: string, params: Record<string, string>) => {
        const query = new URLSearchParams(params).toString();
        try {
            const res = await fetch(`/api/nba-proxy?endpoint=${endpoint}&${query}`);
            if (!res.ok) throw new Error('BFF fetch failed');
            return await res.json();
        } catch {
            const resLocal = await fetch(`/nba-api/${endpoint}?${query}`);
            return await resLocal.json();
        }
      };

      const bioFetch    = fetchBFF('commonplayerinfo', { PlayerID: id! }).catch(() => null);
      const careerFetch = fetchBFF('playercareerstats', { PerMode: 'PerGame', PlayerID: id! }).catch(() => null);

      let onOffFetch = Promise.resolve(null as any);
      if (numericTeamId && numericTeamId !== "FA") {
        onOffFetch = fetchBFF('teamplayeronoffdetails', {
            DateFrom: '', DateTo: '', GameSegment: '', LastNGames: '0', LeagueID: '00',
            Location: '', MeasureType: 'Advanced', Month: '0', OpponentTeamID: '0',
            Outcome: '', PaceAdjust: 'N', PerMode: 'PerGame', Period: '0',
            PlusMinus: 'N', Rank: 'N', Season: season, SeasonSegment: '',
            SeasonType: 'Regular Season', TeamID: String(numericTeamId), VsConference: '', VsDivision: ''
        }).catch(() => null);
      }

      const awardsFetch   = fetchBFF('playerawards', { PlayerID: id! }).catch(() => null);
      const shotsFetch    = nbaService.getPlayerShotChart(id!, season);
      const gameLogFetch  = nbaService.getPlayerGameLog(id!, season);

      const [bioData, onOffData, awardsData, shotData, logData, careerData] =
        await Promise.all([bioFetch, onOffFetch, awardsFetch, shotsFetch, gameLogFetch, careerFetch]);

      let bio: any = null;
      if (bioData) {
        try {
          const info = bioData.resultSets[0];
          const h = info.headers;
          const row = info.rowSet[0];
          bio = {
            firstName: row[h.indexOf('FIRST_NAME')], lastName: row[h.indexOf('LAST_NAME')],
            ht: formatHeight(row[h.indexOf('HEIGHT')]), wt: row[h.indexOf('WEIGHT')],
            dob: formatBirthdateAndAge(row[h.indexOf('BIRTHDATE')]),
            school: row[h.indexOf('SCHOOL')] || row[h.indexOf('COUNTRY')],
            jersey: row[h.indexOf('JERSEY')], pos: row[h.indexOf('POSITION')]
          };
        } catch (e) { console.error(e); }
      }

      let careerStats: any = null;
      if (careerData) {
        try {
          const careerSet = careerData.resultSets.find((rs: any) => rs.name === "CareerTotalsRegularSeason");
          if (careerSet && careerSet.rowSet.length > 0) {
            const h = careerSet.headers;
            const r = careerSet.rowSet[0];
            careerStats = {
              gp: r[h.indexOf('GP')], mpg: r[h.indexOf('MIN')],
              ppg: r[h.indexOf('PTS')], rpg: r[h.indexOf('REB')],
              apg: r[h.indexOf('AST')], spg: r[h.indexOf('STL')],
              bpg: r[h.indexOf('BLK')], topg: r[h.indexOf('TOV')],
              fgPct: r[h.indexOf('FG_PCT')] * 100,
              threePct: r[h.indexOf('FG3_PCT')] * 100,
              ftPct: r[h.indexOf('FT_PCT')] * 100,
              fgm: r[h.indexOf('FGM')], fga: r[h.indexOf('FGA')],
              fg3m: r[h.indexOf('FG3M')], fg3a: r[h.indexOf('FG3A')],
              ftm: r[h.indexOf('FTM')], fta: r[h.indexOf('FTA')],
              oreb: r[h.indexOf('OREB')], dreb: r[h.indexOf('DREB')],
              pf: r[h.indexOf('PF')]
            };
          }
        } catch (e) { console.error(e); }
      }

      let onOffSwing: number | null = null;
      if (onOffData) {
        try {
          const onSet  = onOffData.resultSets.find((rs: any) => rs.name === "PlayersOnCourtTeamPlayerOnOffDetails");
          const offSet = onOffData.resultSets.find((rs: any) => rs.name === "PlayersOffCourtTeamPlayerOnOffDetails");
          const onRow  = onSet?.rowSet.find((r: any) => r[1].toString() === id!.toString());
          const offRow = offSet?.rowSet.find((r: any) => r[1].toString() === id!.toString());
          if (onRow && offRow) {
            onOffSwing = onRow[onSet.headers.indexOf('NET_RATING')] - offRow[offSet.headers.indexOf('NET_RATING')];
          }
        } catch (e) { onOffSwing = null; }
      }

      let accolades: any[] = [];
      if (awardsData) {
        try {
          const set = awardsData.resultSets.find((s: any) => s.name === "PlayerAwards");
          if (set) {
            const h = set.headers;
            const counts: Record<string, number> = {};
            set.rowSet.forEach((row: any[]) => {
              const desc = row[h.indexOf("DESCRIPTION")];
              if (desc.includes("Week") || desc.includes("Month") || desc.includes("Community") || desc.includes("Olympic")) return;
              counts[desc] = (counts[desc] || 0) + 1;
            });
            accolades = Object.entries(counts)
              .map(([title, count]) => ({ title, count, icon: getAwardIcon(title) }))
              .sort((a, b) => b.count - a.count);
          }
        } catch (e) { console.error(e); }
      }

      return {
        bio, careerStats, onOffSwing, accolades,
        shots: shotData || [],
        gameLog: logData || [],
        injury: (player as any).injury ?? null
      };
    },
  });

  const bio          = deepData?.bio ?? null;
  const careerStats  = deepData?.careerStats ?? null;
  const onOffSwing   = deepData?.onOffSwing ?? null;
  const accolades    = deepData?.accolades ?? [];
  const shots        = deepData?.shots ?? [];
  const gameLog      = deepData?.gameLog ?? [];

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ season: e.target.value });
  };

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
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Retrieving {season} Player Dossier...</p>
      </div>
    );
  }

  if (!player) return <div className="text-white p-10 font-bold">Player not found.</div>;

  const s = player.stats;
  const a = player.adv || { ts: 0, usg: 0, pie: 0, per: 15 };
  const archetype = getArchetype(player);
  const isGhostPlayer = !!(player as any).ghostPlayer || (s.gp ?? 0) === 0; // Se asegura de pillar el 0 GP
  
  // 🚀 FIX 2 CLAUDE: Badge y Pilares grises para Ghost Players
  const rating = isGhostPlayer 
    ? { 
        ovr: null, tier: "N/A", color: "#555",
        pillars: {
            sco: { grade: "-", pct: 0, raw: "—", label: "SCORE" },
            reb: { grade: "-", pct: 0, raw: "—", label: "REB" },
            ply: { grade: "-", pct: 0, raw: "—", label: "PLAY" },
            def: { grade: "-", pct: 0, raw: "—", label: "STOCKS" }
        }
      }
    : ((player as any).rating || { 
        ovr: 75, tier: "Bronze", color: "#cd7f32",
        pillars: {
            sco: { grade: "-", pct: 0, raw: "-", label: "SCORE" },
            reb: { grade: "-", pct: 0, raw: "-", label: "REB" },
            ply: { grade: "-", pct: 0, raw: "-", label: "PLAY" },
            def: { grade: "-", pct: 0, raw: "-", label: "STOCKS" }
        }
    });

  const actualTeam = allTeams.find(t => 
    String(t.id) === String(player.teamId) || 
    t.abbreviation === player.teamId || 
    t.name === player.teamName
  );
  const displayTeamName = actualTeam ? actualTeam.name : player.teamName;
  const teamAbbr = actualTeam ? actualTeam.abbreviation : player.teamId;

  const logoUrl = actualTeam ? nbaService.getTeamLogoUrl(actualTeam.abbreviation) : nbaService.getTeamLogoUrl(player.teamId);
  const themeColor = TEAM_COLORS[teamAbbr] || rating.color; 

  const fName = bio?.firstName || player.name.split(" ")[0];
  const lName = bio?.lastName || player.name.split(" ").slice(1).join(" ");
  const position = bio?.pos || player.position || "NBA";
  const jersey = bio?.jersey ? `#${bio.jersey}` : "";

  const dRtg = (player.stats as any).defRating || 115.5;
  const netRtg = (player.stats as any).netRtg || 0;
  const oRtg = (dRtg + netRtg).toFixed(1);
  const swingDisplay = onOffSwing !== null ? (onOffSwing > 0 ? `+${onOffSwing.toFixed(1)}` : onOffSwing.toFixed(1)) : "N/A";

  const gp = s.gp || 0;

  // ── STATUS LÓGICA (Sólo temporada actual) ──
  const CURRENT_SEASON = '2025-26';
  const isCurrentSeason = season === CURRENT_SEASON;

  // injury viene del pipeline (Fase 1.5), disponible en Query 1 sin esperar deepData
  const injury = (player as any).injury ?? null;

  type DurabilityBadge = {
    label    : string;
    sublabel?: string;
    icon     : string;
    color    : string;
    comment? : string | null;
  };

  let durability: DurabilityBadge | null = null;

  if (isCurrentSeason) {
    // 🚀 FIX 4 CLAUDE: Prioridad Invertida (Lesión de ESPN gana a Ghost Player)
    if (injury) {
      const statusConfig: Record<string, { icon: string; color: string }> = {
        'Out'         : { icon: '🔴', color: 'text-rose-400 border-rose-400/30 bg-rose-400/10'    },
        'Day-To-Day'  : { icon: '🟡', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
        'Questionable': { icon: '🟡', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
        'Probable'    : { icon: '🟢', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
      };
      const cfg = statusConfig[injury.status] ?? { icon: '🟡', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' };
      const parts = [
        injury.bodyPart,
        injury.side && injury.side !== 'Not Specified' ? injury.side : null,
        injury.detail,
      ].filter(Boolean);

      durability = {
        label   : injury.status.toUpperCase(),
        sublabel: parts.length > 0 ? parts.join(' · ') : undefined,
        icon    : cfg.icon,
        color   : cfg.color,
        comment : injury.comment,
      };
    } else if (isGhostPlayer || gp === 0) {
      durability = {
        label: 'INACTIVE',
        icon : '⚫',
        color: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
      };
    } else {
      durability = {
        label: 'ACTIVE',
        icon : '🟢',
        color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
      };
    }
  }

  // 🚀 CONSTRUCCIÓN DEL OBJETO DE DATOS
  const actStats = statsView === "season" ? s : (careerStats || {});
  const actAdv = statsView === "season" ? a : {};
  
  const getS = (key: string, dec = 1) => actStats[key] !== undefined ? Number(actStats[key]).toFixed(dec) : "-";
  const getA = (key: string, dec = 1) => actAdv[key] !== undefined ? Number(actAdv[key]).toFixed(dec) : "-";

  const hasDeepMetrics = statsView === "season";
  const p36       = (hasDeepMetrics && (player as any).per36Stats) || {};
  const hustleD   = (hasDeepMetrics && (player as any).hustle)     || {};
  const passingD  = (hasDeepMetrics && (player as any).passing)    || {};
  const scoringD  = (hasDeepMetrics && (player as any).scoring)    || {};
  const trackingD = (hasDeepMetrics && (player as any).tracking)   || {};
  const mpgForConv = Number(actStats.mpg) || 0;

  const getP36 = (key: string, dec = 1): string => {
    const val = p36[key];
    if (val === undefined || val === null || mpgForConv <= 0) return "-";
    return ((val * mpgForConv) / 36).toFixed(dec);
  };
  const getRaw = (obj: Record<string, any>, key: string, dec = 1): string => {
    const val = obj[key];
    return (val === undefined || val === null) ? "-" : Number(val).toFixed(dec);
  };

  const uiData = {
    min: getS('mpg'), pts: getS('ppg'), reb: getS('rpg'), ast: getS('apg'), 
    stl: getS('spg'), blk: getS('bpg'), tov: getS('topg'),
    fgp: getS('fgPct'), fg3p: getS('threePct'), ftp: getS('ftPct'),
    plusMinus: actStats.plusMinus ? (actStats.plusMinus > 0 ? `+${getS('plusMinus')}` : getS('plusMinus')) : "-",
    pf: getS('pf'),
    
    fgm: getS('fgm'), fga: getS('fga'),
    fg3m: getS('fg3m'), fg3a: getS('fg3a'),
    ftm: getS('ftm'), fta: getS('fta'),
    ts: getA('ts'), efg: getA('efg'),
    ftr: getA('ftr', 3), usg: getA('usg'),
    
    astTov: actStats.topg ? (Number(actStats.apg) / Number(actStats.topg)).toFixed(2) : "-",
    oreb: getS('oreb'), dreb: getS('dreb'),
    astPct: getA('astPct'),
    
    defRtg: getA('defRtg'),
    stlPct: getA('stlPct'),
    blkPct: getA('blkPct'),
    drbPct: getA('drbPct'),
    dws: getA('dws'),
    
    p2m: (() => {
      if (actStats.fgm === undefined || actStats.fg3m === undefined) return "-";
      return (Number(actStats.fgm) - Number(actStats.fg3m)).toFixed(1);
    })(),
    p2a: (() => {
      if (actStats.fga === undefined || actStats.fg3a === undefined) return "-";
      return (Number(actStats.fga) - Number(actStats.fg3a)).toFixed(1);
    })(),
    p2pct: (() => {
      if (actStats.fgm === undefined || actStats.fga === undefined) return "-";
      const m = Number(actStats.fgm) - Number(actStats.fg3m || 0);
      const att = Number(actStats.fga) - Number(actStats.fg3a || 0);
      return att > 0 ? ((m / att) * 100).toFixed(1) : "-";
    })(),

    ptsAst: getP36('astPtsCreated'),
    potentialAst: getP36('potentialAst'),   
    totalPasses: getP36('passesMade'),      
    secAst: getP36('secondaryAst'),
    rimAst: "-", 
    fg3Ast: getRaw(scoringD, 'fg3Ast', 1),
    passToAstPct: getRaw(passingD, 'astToPassPct', 1),

    fgAllowed: getRaw(trackingD, 'dfgPct', 1),
    contested: getP36('contestedShots'),
    contested3: getP36('contested3pt'),
    charges: getP36('chargesDrawn'),
    looseBalls: getP36('looseBalls'),
    deflections: getP36('deflections'),

    pctAst2: getRaw(scoringD, 'pctAst2fgm', 1),
    pctAst3: getRaw(scoringD, 'pctAst3fgm', 1),
    pctUast: getRaw(scoringD, 'pctFgmUast', 1),
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-5xl mx-auto px-4">
      
      <div>
        <Link to={`/${sport}/players?season=${season}`} className="group inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] w-max">
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Back to {season} Roster
        </Link>
      </div>

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

          <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-[#1a1a1a]/70 backdrop-blur-md relative">
            <div className="absolute top-8 right-8 flex flex-col items-center">
                <div className="relative flex items-center justify-center w-24 h-24 hover:scale-105 transition-transform">
                  <Hexagon className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ color: rating.color, fill: `${rating.color}20`, strokeWidth: 1.5 }} />
                  <div className="flex flex-col items-center justify-center relative z-10 mt-1">
                    {/* 🚀 FIX 2 CLAUDE: Hexágono OVR */}
                    {isGhostPlayer ? (
                      <span className="text-3xl font-black font-mono text-slate-500 tracking-tighter leading-none">N/A</span>
                    ) : (
                      <>
                        <span className="text-4xl font-black font-mono text-white tracking-tighter leading-none">{rating.ovr}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: rating.color }}>OVR</span>
                      </>
                    )}
                  </div>
                </div>
            </div>

            <div className="mb-4 pr-24">
              <h2 className="text-[#a0a0a0] text-xl md:text-2xl font-light uppercase tracking-widest leading-none mb-1">{fName}</h2>
              <h1 className="text-white text-4xl md:text-5xl font-bold uppercase tracking-tight leading-none">{lName}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-8">
              <div className="h-6 w-6 bg-white rounded-full flex items-center justify-center p-1 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <img src={logoUrl} alt={teamAbbr} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-bold text-[#d0d0d0] ml-1">{displayTeamName}</span>
              <span className="text-[#666] font-black mx-1">•</span>
              <span className="text-sm font-bold text-[#d0d0d0]">{position} {jersey}</span>
              
              <Badge className="ml-2 font-black uppercase tracking-widest text-[9px] border px-2 py-0.5" style={{ backgroundColor: `${rating.color}20`, color: rating.color, borderColor: `${rating.color}50` }}>
                 {rating.tier} TIER
              </Badge>

              {archetype && (
                <Badge className={`ml-1 font-black uppercase tracking-widest text-[9px] border px-2 py-0.5 flex items-center gap-1 ${archetype.color}`}>
                  <archetype.icon className="h-3 w-3" />
                  {archetype.label}
                </Badge>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">HT/WT</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {isDeepDataLoading && !isGhostPlayer ? <Loader2 className="h-3 w-3 animate-spin text-[#777]" /> : `${bio?.ht || "-"}, ${bio?.wt ? bio.wt + ' lbs' : "-"}`}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">Birthdate</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {isDeepDataLoading && !isGhostPlayer ? <Loader2 className="h-3 w-3 animate-spin text-[#777]" /> : bio?.dob || "-"}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-xs font-bold text-[#777] uppercase tracking-wider">Season</span>
                <span className="text-sm font-bold text-white flex items-center gap-3">
                   <div className="relative inline-flex">
                      <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
                      <select
                        value={season}
                        onChange={handleSeasonChange}
                        className="bg-[#111] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-full py-1.5 pl-7 pr-6 outline-none cursor-pointer hover:border-white/20 transition-colors appearance-none shadow-lg"
                      >
                        {SEASONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    {/* Badge de salud: solo visible en temporada actual */}
                    {durability && (
                      <div className={`inline-flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-widest ${durability.color}`}>
                        <span>{durability.icon} {durability.label}</span>
                        {durability.sublabel && (
                          <span className="text-[10px] font-medium normal-case tracking-normal opacity-80">
                            {durability.sublabel}
                          </span>
                        )}
                        {durability.comment && (
                          <span className="text-[10px] font-normal normal-case tracking-normal opacity-70 max-w-[220px] leading-tight mt-0.5">
                            {durability.comment}
                          </span>
                        )}
                      </div>
                    )}
                </span>
              </div>
            </div>

            <button 
              onClick={() => toggleFavorite({
                id: player.id, type: 'player', name: player.name, 
                subtitle: teamAbbr, imageUrl: player.imageUrl, url: `/nba/players/${player.id}?season=${season}`
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
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white">{season} Regular Season Stats</h3>
          </div>
          <div className="grid grid-cols-4 py-4 md:py-5 px-4 divide-x divide-[#2a2a2a]">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">PTS</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.ppg?.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("ppg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">REB</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.rpg?.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("rpg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">AST</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.apg?.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("apg")}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-1">FG%</span>
              <span className="text-2xl md:text-3xl font-bold text-white leading-none">{s.fgPct?.toFixed(1)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1.5" style={{ color: themeColor }}>{getRank("fgPct")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
            { id: "sco", title: rating.pillars?.sco?.label || "SCORE", p: rating.pillars?.sco },
            { id: "reb", title: rating.pillars?.reb?.label || "REB", p: rating.pillars?.reb },
            { id: "ply", title: rating.pillars?.ply?.label || "PLAY", p: rating.pillars?.ply },
            { id: "def", title: rating.pillars?.def?.label || "STOCKS", p: rating.pillars?.def },
        ].map((attr, i) => (
            <div key={i} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-t from-transparent to-current" style={{ color: rating.color }} />
                
                <div className="flex justify-between w-full items-end relative z-10 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">{attr.title}</span>
                    <span className="text-[10px] font-bold text-[#666]">{attr.p?.raw}</span>
                </div>
                
                <span className="text-4xl font-black font-mono text-white relative z-10 leading-none my-1" style={{ color: ['S', 'A+', 'A'].includes(attr.p?.grade) ? '#10b981' : isGhostPlayer ? '#555' : 'white' }}>
                    {attr.p?.grade}
                </span>

                <div className="w-full h-1.5 bg-black rounded-full mt-3 relative z-10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(5, attr.p?.pct || 0)}%`, backgroundColor: rating.color }} />
                </div>
            </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 bg-[#0a0f18] p-2 rounded-2xl border border-white/5 w-fit mx-auto lg:mx-0 mt-8 shadow-xl">
        <button onClick={() => setActiveTab("stats")} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "stats" ? 'text-white' : 'text-slate-500 hover:text-white'}`} style={{ backgroundColor: activeTab === "stats" ? `${themeColor}30` : 'transparent', borderColor: activeTab === "stats" ? `${themeColor}50` : 'transparent', borderWidth: '1px' }}>
          <BarChart3 className="h-4 w-4" style={{ color: activeTab === "stats" ? themeColor : '' }} /> Data Terminal
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
        
        {/* 🚀 TERMINAL DE DATOS AVANZADO (GM LEVEL) */}
        {activeTab === "stats" && (
          <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] p-6 shadow-2xl transition-all duration-500">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-6">
              <h3 className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                <BarChart3 className="h-4 w-4" style={{ color: themeColor }} /> 
                {statsView === "season" ? `${season} Profile` : 'Career Profile'}
                <span className="text-[#888] text-[10px] tracking-widest ml-1">
                  ({statsView === "season" ? (s.gp || 0) : (careerStats?.gp || 0)} GP)
                </span>
              </h3>

              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
                <button onClick={() => setStatsView("season")} className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${statsView === "season" ? 'bg-white/10 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Season</button>
                <button onClick={() => setStatsView("career")} className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${statsView === "career" ? 'bg-white/10 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Career</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
               {[
                 { id: "overview", label: "Overview", icon: <BarChart3 className="w-3 h-3" /> },
                 { id: "scoring", label: "Scoring", icon: <Target className="w-3 h-3" /> },
                 { id: "playmaking", label: "Playmaking", icon: <Brain className="w-3 h-3" /> },
                 { id: "defense", label: "Defense & Hustle", icon: <Shield className="w-3 h-3" /> }
               ].map(tab => (
                 <button key={tab.id} onClick={() => setBoxScoreSubTab(tab.id as any)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${boxScoreSubTab === tab.id ? 'text-white shadow-md' : 'text-slate-500 hover:text-white bg-[#111] border border-white/5'}`}
                   style={{ backgroundColor: boxScoreSubTab === tab.id ? `${themeColor}40` : '', border: boxScoreSubTab === tab.id ? `1px solid ${themeColor}` : '' }}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>

            {/* TAB: OVERVIEW (Unificada en una sola fila premium) */}
            {boxScoreSubTab === "overview" && (
                <div className="bg-[#111] p-5 md:p-6 rounded-2xl border border-white/5 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-1">
                        <div className="flex flex-col">
                            <StatRow label="Minutes (MIN)" val={uiData.min} />
                            <StatRow label="Points (PTS)" val={uiData.pts} highlight />
                            <StatRow label="Rebounds (REB)" val={uiData.reb} highlight />
                            <StatRow label="Assists (AST)" val={uiData.ast} highlight />
                        </div>
                        <div className="flex flex-col">
                            <StatRow label="Field Goal %" val={fPct(uiData.fgp)} />
                            <StatRow label="3-Point %" val={fPct(uiData.fg3p)} />
                            <StatRow label="Free Throw %" val={fPct(uiData.ftp)} />
                            <StatRow label="Plus / Minus (+/-)" val={uiData.plusMinus} valueColor={String(uiData.plusMinus).includes('+') ? 'text-emerald-400' : (String(uiData.plusMinus).includes('-') && uiData.plusMinus !== '-' ? 'text-rose-400' : 'text-[#999]')} />
                        </div>
                        <div className="flex flex-col">
                            <StatRow label="Steals (STL)" val={uiData.stl} />
                            <StatRow label="Blocks (BLK)" val={uiData.blk} />
                            <StatRow label="Turnovers (TOV)" val={uiData.tov} />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SCORING */}
            {boxScoreSubTab === "scoring" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Target className="w-3 h-3 text-rose-400"/> Volume & Splits</h4>
                    <StatRow label="Points Per Game" val={uiData.pts} highlight />
                    <StatRow label="Usage Rate (USG%)" val={fPct(uiData.usg)} highlight />
                    <StatRow label="Free Throw Rate (FTr)" val={uiData.ftr} />
                    <StatRow label="2PT FGM / FGA" val={`${uiData.p2m} - ${uiData.p2a}`} />
                    <StatRow label="2PT FG%" val={fPct(uiData.p2pct)} />
                    <StatRow label="3PT FGM / FGA" val={`${uiData.fg3m} - ${uiData.fg3a}`} />
                    <StatRow label="3PT FG%" val={fPct(uiData.fg3p)} />
                    <StatRow label="FTM / FTA" val={`${uiData.ftm} - ${uiData.fta}`} />
                    <StatRow label="Free Throw %" val={fPct(uiData.ftp)} />
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Activity className="w-3 h-3 text-cyan-400"/> Advanced Efficiency</h4>
                    <StatRow label="True Shooting (TS%)" val={fPct(uiData.ts)} highlight />
                    <StatRow label="Effective FG (eFG%)" val={fPct(uiData.efg)} />
                    <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#555] block mb-2">Shot Distances</span>
                        <div className="text-center text-[#777] text-[10px] font-bold py-2 bg-white/5 rounded-lg">Awaiting Tracking Data...</div>
                    </div>
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Zap className="w-3 h-3 text-amber-400"/> Shot Creation</h4>
                    <StatRow label="% 2PT Assisted" val={fPct(uiData.pctAst2)} />
                    <StatRow label="% 3PT Assisted" val={fPct(uiData.pctAst3)} />
                    <StatRow label="% Total Unassisted" val={fPct(uiData.pctUast)} highlight />
                    <div className="mt-4 p-3 bg-black/50 border border-white/5 rounded-xl text-center">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Scoring Archetype Status</span>
                        <span className="text-xs font-bold text-amber-400">{uiData.usg !== "-" && Number(uiData.usg) > 25 ? "High Volume Scorer" : "Role / System Scorer"}</span>
                    </div>
                  </div>
                </div>
            )}

            {/* TAB: PLAYMAKING */}
            {boxScoreSubTab === "playmaking" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Brain className="w-3 h-3 text-purple-400"/> Core Distribution</h4>
                    <StatRow label="Assists (AST)" val={uiData.ast} highlight />
                    <StatRow label="Turnovers (TOV)" val={uiData.tov} />
                    <StatRow label="AST / TO Ratio" val={uiData.astTov} highlight />
                    <StatRow label="Assist % (AST%)" val={fPct(uiData.astPct)} />
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Target className="w-3 h-3 text-cyan-400"/> Value Created (Tracking)</h4>
                    <StatRow label="PTS Created by AST" val={uiData.ptsAst} highlight />
                    <StatRow label="Potential Assists" val={uiData.potentialAst} />
                    <StatRow label="Secondary Assists" val={uiData.secAst} />
                    <StatRow label="Rim Assists" val={uiData.rimAst} />
                    <StatRow label="3PT Assists" val={uiData.fg3Ast} />
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Activity className="w-3 h-3 text-blue-400"/> Flow Metrics</h4>
                    <StatRow label="Total Passes Made" val={uiData.totalPasses} />
                    <StatRow label="Pass to Assist %" val={fPct(uiData.passToAstPct)} />
                    <div className="mt-8 p-3 bg-black/50 border border-white/5 rounded-xl text-center">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Playmaking Role</span>
                        <span className="text-xs font-bold text-purple-400">{uiData.astPct !== "-" && Number(uiData.astPct) > 20 ? "Primary Facilitator" : "Connector / Finisher"}</span>
                    </div>
                  </div>
                </div>
            )}

            {/* TAB: DEFENSE & HUSTLE */}
            {boxScoreSubTab === "defense" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Shield className="w-3 h-3 text-emerald-400"/> Impact Metrics</h4>
                    <StatRow label="Defensive Rating" val={uiData.defRtg} highlight />
                    <StatRow label="Defensive Win Shares" val={uiData.dws} />
                    <StatRow label="Steal % (STL%)" val={fPct(uiData.stlPct)} />
                    <StatRow label="Block % (BLK%)" val={fPct(uiData.blkPct)} />
                    <StatRow label="Def Rebound % (DRB%)" val={fPct(uiData.drbPct)} />
                    <StatRow label="Personal Fouls (PF)" val={uiData.pf} />
                    <StatRow label="Plus / Minus (+/-)" val={uiData.plusMinus} valueColor={String(uiData.plusMinus).includes('+') ? 'text-emerald-400' : (String(uiData.plusMinus).includes('-') && uiData.plusMinus !== '-' ? 'text-rose-400' : 'text-[#999]')} />
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Target className="w-3 h-3 text-rose-400"/> Shot Defense</h4>
                    <StatRow label="Steals (STL)" val={uiData.stl} highlight />
                    <StatRow label="Blocks (BLK)" val={uiData.blk} highlight />
                    <StatRow label="FG% Allowed" val={fPct(uiData.fgAllowed)} />
                    <StatRow label="Contested Shots" val={uiData.contested} />
                    <StatRow label="Contested 3PT" val={uiData.contested3} />
                  </div>
                  <div className="bg-[#111] p-5 rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888] mb-4 flex items-center gap-2"><Activity className="w-3 h-3 text-amber-400"/> Hustle & Effort</h4>
                    <StatRow label="Defensive Rebounds" val={uiData.dreb} highlight />
                    <StatRow label="Deflections" val={uiData.deflections} />
                    <StatRow label="Loose Balls Recovered" val={uiData.looseBalls} />
                    <StatRow label="Charges Drawn" val={uiData.charges} />
                  </div>
                </div>
            )}
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
               <ShotChart shots={shots} player={player} />
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

              const wins = gameLog.filter((g: any) => g.wl === "W");
              const losses = gameLog.filter((g: any) => g.wl === "L");
              const home = gameLog.filter((g: any) => g.isHome);
              const away = gameLog.filter((g: any) => !g.isHome);
              
              const contenders = gameLog.filter((g: any) => {
                const oppTeam = allTeams.find(t => t.abbreviation.toLowerCase() === g.opponent.toLowerCase());
                if (!oppTeam) return false;
                const oppWinPct = oppTeam.wins / (oppTeam.wins + oppTeam.losses);
                return oppWinPct >= 0.500;
              });
              
              const lottery = gameLog.filter((g: any) => {
                const oppTeam = allTeams.find(t => t.abbreviation.toLowerCase() === g.opponent.toLowerCase());
                if (!oppTeam) return false;
                const oppWinPct = oppTeam.wins / (oppTeam.wins + oppTeam.losses);
                return oppWinPct < 0.500;
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
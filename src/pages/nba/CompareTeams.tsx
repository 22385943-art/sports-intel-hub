import { useState, useMemo, useEffect, useRef } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PolarRadiusAxis
} from "recharts";
import {
  Search, ChevronDown, Loader2, Hexagon, Target, Clock, ShieldAlert, TrendingUp, Brain, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ShootingComparison, RawShot } from "@/components/ShootingComparison";

const TEAM_COLORS: Record<string, string> = {
  "ATL": "#E03A3E", "BOS": "#007A33", "BKN": "#FFFFFF", "CHA": "#00788C", 
  "CHI": "#CE1141", "CLE": "#860038", "DAL": "#00A3E0", 
  "DEN": "#FEC524", "DET": "#C8102E", "GSW": "#1D428A", "HOU": "#CE1141", 
  "IND": "#FDBB30", "LAC": "#C8102E", "LAL": "#FDB927", "MEM": "#7399C6", 
  "MIA": "#98002E", "MIL": "#00471B", "MIN": "#78BE20", 
  "NOP": "#85714D", "NYK": "#F58426", "OKC": "#007AC1", "ORL": "#0077C0", 
  "PHI": "#006BB6", "PHX": "#E56020", "POR": "#E03A3E", "SAC": "#5A2D81", 
  "SAS": "#C4CED4", "TOR": "#CE1141", "UTA": "#F9A01B", "WAS": "#E31837"  
};

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.length === 3 ? cleanHex.slice(0, 1).repeat(2) : cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.length === 3 ? cleanHex.slice(1, 2).repeat(2) : cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.length === 3 ? cleanHex.slice(2, 3).repeat(2) : cleanHex.slice(4, 6), 16);
  return { r, g, b };
};

const hexToRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const areColorsTooSimilar = (hex1: string, hex2: string) => {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
  return distance < 80; 
};

const mapTeamToShootingProfile = (t: any, color: string, rawShots: any[], title: string) => {
  if (!t) return undefined;
  const mappedShots: RawShot[] = (rawShots || []).map(s => ({
    locX: s.x,
    locY: s.y,
    shotMade: s.made,
    shotDistance: Math.sqrt(s.x * s.x + s.y * s.y)
  }));
  return {
    id: t.id, name: title || t.name, imageUrl: t.imageUrl, color: color,
    trueShooting: t.tsPct || 0, effectiveFG: 0, shots: mappedShots
  };
};

const getClutchMultiplier = (clutchData: any, pace: number) => {
  if (!clutchData || clutchData.min === 0) return 0;
  return 1 / (clutchData.gp || 1);
};

const TeamCombobox = ({ value, onChange, season, onSeasonChange, themeColor }: any) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const generateSeasons = () => {
      const seasons = [];
      for (let i = 2025; i >= 1996; i--) { 
          const shortYear = String(i + 1).slice(2).padStart(2, '0');
          seasons.push(`${i}-${shortYear}`); 
      }
      return seasons;
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    nbaService.fetchAllOfficialTeams(season).then(fetched => {
        if (!isMounted) return;
        setTeams(fetched);
        if (value) {
            const team = fetched.find(t => t.id === value);
            if (team) onChange(value, team); else onChange("", null);
        }
        setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [season]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value ? teams.find(t => t.id === value) : null;
  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const tColor = themeColor || "#38bdf8";

  return (
    <div className="relative w-full z-50 flex flex-col md:flex-row gap-3" ref={ref}>
      <div className="relative flex-1">
          <button
            onClick={() => setOpen(!open)}
            className={`w-full bg-white/[0.02] backdrop-blur-3xl border h-16 rounded-[1.25rem] px-6 flex items-center justify-between transition-colors duration-500`}
            style={{ borderColor: hexToRgba(tColor, 0.4), boxShadow: open ? `0 0 40px ${hexToRgba(tColor, 0.25)}` : `0 0 20px ${hexToRgba(tColor, 0.1)}`, color: tColor }}
          >
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tColor, boxShadow: `0 0 8px ${tColor}` }} />
              <span className={`font-black text-lg tracking-tight ${selected ? "text-foreground" : "text-muted-foreground"}`}>{selected ? selected.name : "Select NBA Team..."}</span>
            </div>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: tColor }} /> : <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-500 ${open ? "rotate-180" : ""}`} />}
          </button>
          
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.25, ease: "easeOut" }} className="absolute top-full mt-3 w-full bg-[#050914]/95 backdrop-blur-3xl border border-white/[0.1] rounded-[1.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,1)] overflow-hidden z-[100]">
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                  <Search className="h-5 w-5 text-slate-500" />
                  <input autoFocus placeholder={`Search terminal for ${season}...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-foreground text-sm font-bold placeholder:text-slate-600 focus:outline-none" />
                </div>
                <div className="max-h-[350px] overflow-y-auto scrollbar-premium">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4"><Loader2 className="animate-spin w-8 h-8" style={{ color: tColor }} /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-mono text-center px-4">Decrypting Archives</span></div>
                  ) : (
                    // ✅ AQUI APLICAMOS EL FIX D DE CLAUDE (Contenedor general animado)
                    <motion.div
                      key={search}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.12 }}
                    >
                      {filtered.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => { onChange(t.id, t); setOpen(false); setSearch(""); }}
                          className="p-4 flex items-center gap-4 cursor-pointer transition-colors duration-200 mx-2 my-1 rounded-xl border-l-2 border-transparent"
                          style={{
                            backgroundColor: value === t.id ? hexToRgba(tColor, 0.1) : 'transparent',
                            borderLeftColor: value === t.id ? tColor : 'transparent',
                          }}
                        >
                          <Avatar className="h-11 w-11 border border-white/[0.1] bg-[#030712] shadow-lg">
                            <AvatarImage src={t.imageUrl} className="object-contain p-1" />
                            <AvatarFallback>{t.abbreviation}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight text-foreground">{t.name}</span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] font-mono">{t.conference}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
      <select value={season} onChange={(e) => { onSeasonChange(e.target.value); setOpen(true); }} className="w-full md:w-40 bg-white/[0.02] backdrop-blur-3xl border h-16 rounded-[1.25rem] px-5 text-xs font-mono font-black outline-none cursor-pointer transition-colors duration-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] appearance-none" style={{ borderColor: hexToRgba(tColor, 0.4), color: tColor }}>
          {generateSeasons().map(s => <option key={s} value={s} className="bg-[#050914] text-foreground font-mono">{s}</option>)}
      </select>
    </div>
  );
};

const TugBar = ({ label, v1, v2, c1, c2, reverse = false, showPlus = false, isPct = false }: any) => {
  const safeV1 = Number(v1) || 0;
  const safeV2 = Number(v2) || 0;
  const minVal = Math.min(0, safeV1, safeV2);
  const shiftedV1 = safeV1 - minVal;
  const shiftedV2 = safeV2 - minVal;
  const total = shiftedV1 + shiftedV2 || 1;
  const p1Pct = (shiftedV1 / total) * 100;
  const p2Pct = (shiftedV2 / total) * 100;
  
  let winner = "tie";
  if (reverse) winner = safeV1 < safeV2 ? "p1" : safeV2 < safeV1 ? "p2" : "tie";
  else winner = safeV1 > safeV2 ? "p1" : safeV2 > safeV1 ? "p2" : "tie";

  const delta = Math.abs(safeV1 - safeV2).toFixed(1);
  const deltaSign = reverse ? "-" : "+";
  
  const formatVal = (v: number) => {
      const num = showPlus && v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
      return isPct ? `${num}%` : num;
  };

  return (
    <div className="group py-2 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-300 px-3 relative overflow-hidden">
      <div className="relative z-10 flex items-end justify-between w-full pb-1.5">
        <div className="absolute left-1/2 bottom-1.5 -translate-x-1/2 text-center pointer-events-none">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50 group-hover:text-white/90 transition-colors font-mono">{label}</span>
        </div>
        <div className="flex items-center justify-start w-1/3">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-xl font-black font-mono tracking-tighter flex items-center ${winner === "p1" ? "text-white" : "text-white/40"}`} style={winner === "p1" ? { color: c1, textShadow: `0 0 12px ${hexToRgba(c1, 0.5)}` } : {}}>
            {formatVal(safeV1)}
            {winner === "p1" && (safeV1 !== safeV2) && <span className="text-[9px] font-bold tracking-widest text-emerald-400 ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]">({deltaSign}{delta})</span>}
          </motion.span>
        </div>
        <div className="flex items-center justify-end w-1/3 text-right">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-xl font-black font-mono tracking-tighter flex items-center justify-end ${winner === "p2" ? "text-white" : "text-white/40"}`} style={winner === "p2" ? { color: c2, textShadow: `0 0 12px ${hexToRgba(c2, 0.5)}` } : {}}>
            {winner === "p2" && (safeV2 !== safeV1) && <span className="text-[9px] font-bold tracking-widest text-emerald-400 mr-2 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]">({deltaSign}{delta})</span>}
            {formatVal(safeV2)}
          </motion.span>
        </div>
      </div>
      <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-[#030712] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-white/[0.03]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${p1Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} className="absolute left-0 top-0 h-full rounded-l-full" style={{ background: winner === "p1" ? `linear-gradient(90deg, ${hexToRgba(c1, 0.2)}, ${c1})` : "linear-gradient(90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))", boxShadow: winner === "p1" ? `0 0 10px ${hexToRgba(c1, 0.5)}` : "none" }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${p2Pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} className="absolute right-0 top-0 h-full rounded-r-full" style={{ background: winner === "p2" ? `linear-gradient(-90deg, ${hexToRgba(c2, 0.2)}, ${c2})` : "linear-gradient(-90deg, rgba(100,116,139,0.1), rgba(100,116,139,0.4))", boxShadow: winner === "p2" ? `0 0 10px ${hexToRgba(c2, 0.5)}` : "none" }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-[#050914] z-10" />
      </div>
    </div>
  );
};

export default function CompareTeams() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"traditional" | "overall" | "offense" | "defense" | "advanced" | "clutch" | "off map" | "def map">("traditional");

  const [t1Id, setT1Id] = useState("1610612738");
  const [t1Season, setT1Season] = useState("2025-26");
  const [t1Data, setT1Data] = useState<any>(null);
  const [t1OffShots, setT1OffShots] = useState<any[]>([]);
  const [t1DefShots, setT1DefShots] = useState<any[]>([]);

  const [t2Id, setT2Id] = useState("1610612742");
  const [t2Season, setT2Season] = useState("2025-26");
  const [t2Data, setT2Data] = useState<any>(null);
  const [t2OffShots, setT2OffShots] = useState<any[]>([]);
  const [t2DefShots, setT2DefShots] = useState<any[]>([]);

  useEffect(() => {
    nbaService.fetchAllOfficialTeams("2025-26").then(teams => {
      const celtics = teams.find(t => t.id === "1610612738") || teams[0];
      const mavs = teams.find(t => t.id === "1610612742") || teams[1];
      setT1Data(celtics);
      setT2Data(mavs);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "off map" || activeTab === "def map") {
      setIsMapLoading(true);
      const isDef = activeTab === "def map";
      Promise.all([
        nbaService.getTeamShotChart(t1Id, t1Season, isDef),
        nbaService.getTeamShotChart(t2Id, t2Season, isDef)
      ]).then(([shots1, shots2]) => {
        if (isDef) { setT1DefShots(shots1); setT2DefShots(shots2); }
        else { setT1OffShots(shots1); setT2OffShots(shots2); }
        setIsMapLoading(false);
      }).catch(() => setIsMapLoading(false));
    }
  }, [t1Id, t2Id, t1Season, t2Season, activeTab]);

  const t1 = t1Data;
  const t2 = t2Data;

  let color1 = t1 ? (TEAM_COLORS[t1.abbreviation] || "#22d3ee") : "#22d3ee";
  let color2 = t2 ? (TEAM_COLORS[t2.abbreviation] || "#f43f5e") : "#f43f5e";
  if (areColorsTooSimilar(color1, color2)) color2 = areColorsTooSimilar(color1, "#22d3ee") ? "#f43f5e" : "#22d3ee"; 

  const t1NameYear = t1 ? `${t1.abbreviation} '${t1Season.substring(2,4)}` : "";
  const t2NameYear = t2 ? `${t2.abbreviation} '${t2Season.substring(2,4)}` : "";

  const similarityScore = useMemo(() => {
    if (!t1 || !t2 || !t1.percentiles || !t2.percentiles) return null;
    const v1 = [t1.percentiles.Offense || 50, t1.percentiles.Defense || 50, t1.percentiles.Pace || 50, t1.percentiles.Efficiency || 50, t1.percentiles.Rebounding || 50];
    const v2 = [t2.percentiles.Offense || 50, t2.percentiles.Defense || 50, t2.percentiles.Pace || 50, t2.percentiles.Efficiency || 50, t2.percentiles.Rebounding || 50];
    let diffSum = 0;
    for (let i = 0; i < v1.length; i++) {
        diffSum += Math.abs(v1[i] - v2[i]);
    }
    const avgDiff = diffSum / v1.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgDiff)));
  }, [t1, t2]);

  const radarData = useMemo(() => {
    if (!t1 || !t2) return [];
    if (activeTab === "clutch" && t1.clutch && t2.clutch) {
        return [
            { stat: "Offense", p1: Math.round(t1.clutch.percentiles?.Offense ?? 50), p2: Math.round(t2.clutch.percentiles?.Offense ?? 50) },
            { stat: "Defense", p1: Math.round(t1.clutch.percentiles?.Defense ?? 50), p2: Math.round(t2.clutch.percentiles?.Defense ?? 50) },
            { stat: "Net Rtg", p1: Math.round(t1.clutch.percentiles?.NetRating ?? 50), p2: Math.round(t2.clutch.percentiles?.NetRating ?? 50) },
            { stat: "Pace", p1: Math.round(t1.clutch.percentiles?.Pace ?? 50), p2: Math.round(t2.clutch.percentiles?.Pace ?? 50) },
            { stat: "Efficiency", p1: Math.round(t1.clutch.percentiles?.Efficiency ?? 50), p2: Math.round(t2.clutch.percentiles?.Efficiency ?? 50) },
            { stat: "Rebounding", p1: Math.round(t1.clutch.percentiles?.Rebounding ?? 50), p2: Math.round(t2.clutch.percentiles?.Rebounding ?? 50) },
        ];
    }
    if (activeTab === "traditional") {
        return [
            { stat: "Points", p1: Math.round(t1.percentiles?.Points ?? 50), p2: Math.round(t2.percentiles?.Points ?? 50) },
            { stat: "Rebounds", p1: Math.round(t1.percentiles?.RawReb ?? 50), p2: Math.round(t2.percentiles?.RawReb ?? 50) },
            { stat: "Assists", p1: Math.round(t1.percentiles?.Playmaking ?? 50), p2: Math.round(t2.percentiles?.Playmaking ?? 50) },
            { stat: "FG%", p1: Math.round(t1.percentiles?.FgPct ?? 50), p2: Math.round(t2.percentiles?.FgPct ?? 50) },
            { stat: "3P%", p1: Math.round(t1.percentiles?.ThreePct ?? 50), p2: Math.round(t2.percentiles?.ThreePct ?? 50) },
            { stat: "FT%", p1: Math.round(t1.percentiles?.FtPct ?? 50), p2: Math.round(t2.percentiles?.FtPct ?? 50) },
        ];
    }
    if (activeTab === "offense") {
        return [
            { stat: "Scoring", p1: Math.round(t1.percentiles?.Offense ?? 50), p2: Math.round(t2.percentiles?.Offense ?? 50) },
            { stat: "Playmaking", p1: Math.round(t1.percentiles?.Playmaking ?? 50), p2: Math.round(t2.percentiles?.Playmaking ?? 50) },
            { stat: "Ball Security", p1: Math.round(t1.percentiles?.BallSecurity ?? 50), p2: Math.round(t2.percentiles?.BallSecurity ?? 50) },
            { stat: "Efficiency", p1: Math.round(t1.percentiles?.Efficiency ?? 50), p2: Math.round(t2.percentiles?.Efficiency ?? 50) },
            { stat: "Off Reb", p1: Math.round(t1.percentiles?.OffReb ?? 50), p2: Math.round(t2.percentiles?.OffReb ?? 50) },
            { stat: "Pace", p1: Math.round(t1.percentiles?.Pace ?? 50), p2: Math.round(t2.percentiles?.Pace ?? 50) },
        ];
    }
    if (activeTab === "defense" || activeTab === "def map") {
        return [
            { stat: "Impact", p1: Math.round(t1.percentiles?.Defense ?? 50), p2: Math.round(t2.percentiles?.Defense ?? 50) },
            { stat: "Interior Def", p1: Math.round(t1.percentiles?.InteriorDef ?? 50), p2: Math.round(t2.percentiles?.InteriorDef ?? 50) },
            { stat: "Perimeter Def", p1: Math.round(t1.percentiles?.PerimDefense ?? 50), p2: Math.round(t2.percentiles?.PerimDefense ?? 50) },
            { stat: "Def Reb", p1: Math.round(t1.percentiles?.DefReb ?? 50), p2: Math.round(t2.percentiles?.DefReb ?? 50) },
            { stat: "Turnovers Forced", p1: Math.round(t1.percentiles?.TurnoversForced ?? 50), p2: Math.round(t2.percentiles?.TurnoversForced ?? 50) },
            { stat: "Transition Def", p1: Math.round(t1.percentiles?.TransitionDef ?? 50), p2: Math.round(t2.percentiles?.TransitionDef ?? 50) },
        ];
    }
    if (activeTab === "advanced") {
        return [
            { stat: "Fast Break", p1: Math.round(t1.percentiles?.FastBreak ?? 50), p2: Math.round(t2.percentiles?.FastBreak ?? 50) },
            { stat: "Pts off TOV", p1: Math.round(t1.percentiles?.PtsOffTov ?? 50), p2: Math.round(t2.percentiles?.PtsOffTov ?? 50) },
            { stat: "50/50 Balls", p1: Math.round(t1.percentiles?.Hustle ?? 50), p2: Math.round(t2.percentiles?.Hustle ?? 50) },
            { stat: "2nd Chance", p1: Math.round(t1.percentiles?.SecondChance ?? 50), p2: Math.round(t2.percentiles?.SecondChance ?? 50) },
            { stat: "Box Outs", p1: Math.round(t1.percentiles?.BoxOuts ?? 50), p2: Math.round(t2.percentiles?.BoxOuts ?? 50) }, 
            { stat: "Possession Care", p1: Math.round(t1.percentiles?.TurnoverAvoidance ?? 50), p2: Math.round(t2.percentiles?.TurnoverAvoidance ?? 50) },
        ];
    }
    return [
        { stat: "Offense", p1: Math.round(t1.percentiles?.Offense ?? 50), p2: Math.round(t2.percentiles?.Offense ?? 50) },
        { stat: "Defense", p1: Math.round(t1.percentiles?.Defense ?? 50), p2: Math.round(t2.percentiles?.Defense ?? 50) },
        { stat: "Net Rtg", p1: Math.round(t1.percentiles?.NetRating ?? 50), p2: Math.round(t2.percentiles?.NetRating ?? 50) },
        { stat: "Pace", p1: Math.round(t1.percentiles?.Pace ?? 50), p2: Math.round(t2.percentiles?.Pace ?? 50) },
        { stat: "Efficiency", p1: Math.round(t1.percentiles?.Efficiency ?? 50), p2: Math.round(t2.percentiles?.Efficiency ?? 50) },
        { stat: "Rebounding", p1: Math.round(t1.percentiles?.Rebounding ?? 50), p2: Math.round(t2.percentiles?.Rebounding ?? 50) },
    ];
  }, [t1, t2, activeTab]);

  const statBars = useMemo(() => {
    if (!t1 || !t2) return [];

    if (activeTab === "traditional") {
        return [
            { label: "POINTS", v1: t1.ppg, v2: t2.ppg },
            { label: "FGM", v1: t1.fgm, v2: t2.fgm },
            { label: "FGA", v1: t1.fga, v2: t2.fga },
            { label: "FG%", v1: t1.fgPct, v2: t2.fgPct, isPct: true },
            { label: "3PM", v1: t1.fg3m, v2: t2.fg3m },
            { label: "3PA", v1: t1.fg3a, v2: t2.fg3a },
            { label: "3P%", v1: t1.threePct, v2: t2.threePct, isPct: true },
            { label: "FTM", v1: t1.ftm, v2: t2.ftm },
            { label: "FTA", v1: t1.fta, v2: t2.fta },
            { label: "FT%", v1: t1.ftPct, v2: t2.ftPct, isPct: true },
            { label: "OREB", v1: t1.oreb, v2: t2.oreb },
            { label: "DREB", v1: t1.dreb, v2: t2.dreb },
            { label: "REB", v1: t1.reb, v2: t2.reb },
            { label: "AST", v1: t1.apg, v2: t2.apg },
            { label: "TOV", v1: t1.tov, v2: t2.tov, reverse: true },
            { label: "STL", v1: t1.spg, v2: t2.spg },
            { label: "BLK", v1: t1.bpg, v2: t2.bpg },
            { label: "BLKA", v1: t1.blka, v2: t2.blka, reverse: true },
            { label: "PF", v1: t1.pf, v2: t2.pf, reverse: true },
            { label: "PFD", v1: t1.pfd, v2: t2.pfd },
            { label: "+/-", v1: t1.plusMinus, v2: t2.plusMinus, showPlus: true },
        ];
    }

    if (activeTab === "overall" || activeTab === "clutch") {
        const isC = activeTab === "clutch";
        if (isC && (!t1.clutch || !t2.clutch)) return [];
        
        const d1 = isC ? t1.clutch : t1;
        const d2 = isC ? t2.clutch : t2;

        return [
            { label: "WIN %", v1: d1.winPct, v2: d2.winPct, isPct: true },
            { label: "OFF RATING", v1: d1.offRtg, v2: d2.offRtg },
            { label: "DEF RATING", v1: d1.defRtg, v2: d2.defRtg, reverse: true },
            { label: "NET RATING", v1: d1.netRtg, v2: d2.netRtg, showPlus: true },
            { label: "AST %", v1: d1.astPct, v2: d2.astPct },
            { label: "AST / TO RATIO", v1: d1.astTo, v2: d2.astTo },
            { label: "AST RATIO", v1: d1.astRatio, v2: d2.astRatio },
            { label: "OREB %", v1: d1.orebPct, v2: d2.orebPct },
            { label: "DREB %", v1: d1.drebPct, v2: d2.drebPct },
            { label: "REB %", v1: d1.rebPct, v2: d2.rebPct },
            { label: "TURNOVER %", v1: d1.tovPct, v2: d2.tovPct, reverse: true },
            { label: "EFFECTIVE FG %", v1: d1.efgPct, v2: d2.efgPct },
            { label: "TRUE SHOOTING %", v1: d1.tsPct, v2: d2.tsPct },
            { label: "PACE", v1: d1.pace, v2: d2.pace },
            { label: "PIE ESTIMATE", v1: d1.pie, v2: d2.pie }
        ];
    }
    
    if (activeTab === "offense") return [{ label: "OFF RATING", v1: t1.offRtg, v2: t2.offRtg }, { label: "PTS PER GAME", v1: t1.ppg, v2: t2.ppg }, { label: "TRUE SHOOTING %", v1: t1.tsPct, v2: t2.tsPct }, { label: "EFFECTIVE FG %", v1: t1.efgPct, v2: t2.efgPct }, { label: "AST PER GAME", v1: t1.apg, v2: t2.apg }, { label: "AST %", v1: t1.astPct, v2: t2.astPct }, { label: "AST / TO RATIO", v1: t1.astTo, v2: t2.astTo }, { label: "OFF REB %", v1: t1.orebPct, v2: t2.orebPct }, { label: "3PA PER GAME", v1: t1.fg3a, v2: t2.fg3a }, { label: "3P%", v1: t1.threePct, v2: t2.threePct }, { label: "FTA PER GAME", v1: t1.fta, v2: t2.fta }, { label: "FT%", v1: t1.ftPct, v2: t2.ftPct }];
    if (activeTab === "defense") return [
        { label: "DEF RATING", v1: t1.defRtg, v2: t2.defRtg, reverse: true }, 
        { label: "OPP PTS PER GAME", v1: t1.oppPpg, v2: t2.oppPpg, reverse: true }, 
        { label: "OPP 2PT% (INTERIOR)", v1: t1.opp?.opp2ptPct, v2: t2.opp?.opp2ptPct, reverse: true }, 
        { label: "OPP FG%", v1: t1.opp?.oppFgPct, v2: t2.opp?.oppFgPct, reverse: true }, 
        { label: "OPP 3PT%", v1: t1.opp?.opp3ptPct, v2: t2.opp?.opp3ptPct, reverse: true }, 
        { label: "OPP FTA RATE", v1: t1.opp?.oppFtaRate, v2: t2.opp?.oppFtaRate, reverse: true }, 
        { label: "DREB", v1: t1.dreb, v2: t2.dreb }, 
        { label: "DEF REB %", v1: t1.drebPct, v2: t2.drebPct }, 
        { label: "TURNOVERS FORCED", v1: t1.opp?.oppTov, v2: t2.opp?.oppTov }, 
        { label: "OPP PTS OFF TOV", v1: t1.opp?.oppPtsOffTov, v2: t2.opp?.oppPtsOffTov, reverse: true }, 
        { label: "OPP PTS 2ND CHANCE", v1: t1.opp?.oppPts2ndChance, v2: t2.opp?.oppPts2ndChance, reverse: true }, 
        { label: "OPP PTS FB", v1: t1.opp?.oppPtsFb, v2: t2.opp?.oppPtsFb, reverse: true }, 
        { label: "OPP PTS PAINT", v1: t1.opp?.oppPtsPaint, v2: t2.opp?.oppPtsPaint, reverse: true }, 
        { label: "STEALS", v1: t1.spg, v2: t2.spg }, 
        { label: "BLOCKS", v1: t1.bpg, v2: t2.bpg }
    ];
    if (activeTab === "advanced") return [
        { label: "FTA RATE", v1: t1.ftaRate, v2: t2.ftaRate },
        { label: "TURNOVER %", v1: t1.tovPct, v2: t2.tovPct, reverse: true },
        { label: "%PTS 2PT", v1: t1.pctPts2pt, v2: t2.pctPts2pt, isPct: true },
        { label: "%PTS 3PT", v1: t1.pctPts3pt, v2: t2.pctPts3pt, isPct: true },
        { label: "%PTS FT", v1: t1.pctPtsFt, v2: t2.pctPtsFt, isPct: true },
        { label: "PTS OFF TOV", v1: t1.ptsOffTov, v2: t2.ptsOffTov },
        { label: "%PTS OFF TOV", v1: t1.pctPtsOffTov, v2: t2.pctPtsOffTov, isPct: true },
        { label: "FAST BREAK PTS", v1: t1.ptsFb, v2: t2.ptsFb },
        { label: "2ND CHANCE PTS", v1: t1.pts2ndChance, v2: t2.pts2ndChance },
        { label: "POINTS IN PAINT", v1: t1.ptsPaint, v2: t2.ptsPaint },
        { label: "%PTS PITP", v1: t1.pctPtsPitp, v2: t2.pctPtsPitp, isPct: true },
        { label: "FGM %AST", v1: t1.pctFgmAst, v2: t2.pctFgmAst, isPct: true },
        { label: "2FGM %AST", v1: t1.pct2fgmAst, v2: t2.pct2fgmAst, isPct: true },
        { label: "3FGM %AST", v1: t1.pct3fgmAst, v2: t2.pct3fgmAst, isPct: true },
        { label: "BOX OUTS", v1: t1.boxOuts, v2: t2.boxOuts },
        { label: "LOOSE BALLS REC", v1: t1.looseBalls, v2: t2.looseBalls }
    ];
    
    return [];
  }, [t1, t2, activeTab]);

  const dominanceScore = useMemo(() => {
    let p1Wins = 0; let p2Wins = 0;
    statBars.forEach(s => {
      const v1 = Number(s.v1) || 0; const v2 = Number(s.v2) || 0;
      if (s.reverse) { if (v1 < v2) p1Wins++; else if (v2 < v1) p2Wins++; } 
      else { if (v1 > v2) p1Wins++; else if (v2 > v1) p2Wins++; }
    });
    return { p1Wins, p2Wins };
  }, [statBars]);

  const aiVerdict = useMemo(() => {
    if (!t1 || !t2) return null;
    const netWinner = (t1.netRtg || 0) > (t2.netRtg || 0) ? t1 : t2;
    const offWinner = (t1.offRtg || 0) > (t2.offRtg || 0) ? t1 : t2;
    const defWinner = (t1.defRtg || 115) < (t2.defRtg || 115) ? t1 : t2;
    const paceWinner = (t1.pace || 100) > (t2.pace || 100) ? t1 : t2;

    if (activeTab === "clutch") {
        if (!t1.clutch || !t2.clutch) return <p className="text-lg text-slate-300/90 leading-relaxed font-medium">Awaiting pressure data...</p>;
        
        const clutchOffWinner = t1.clutch.offRtg > t2.clutch.offRtg ? t1 : t2;
        const clutchDefWinner = t1.clutch.defRtg < t2.clutch.defRtg ? t1 : t2;
        const clutchNetWinner = t1.clutch.netRtg > t2.clutch.netRtg ? t1 : t2;
  
        return (
          <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
            Under maximum pressure (last 5 minutes), <span className="text-white font-bold">{clutchNetWinner.name}</span> commands the systemic advantage with a Net Rating of <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{(Math.max(t1.clutch.netRtg, t2.clutch.netRtg) > 0 ? '+' : '')}{Math.max(t1.clutch.netRtg, t2.clutch.netRtg).toFixed(1)}</span>. Offensively, the system flows better through <span className="text-white font-bold">{clutchOffWinner.name}</span> <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(t1.clutch.offRtg, t2.clutch.offRtg).toFixed(1)} ORtg)</span>, while <span className="text-white font-bold">{clutchDefWinner.name}</span> locks down the perimeter and interior, allowing only <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.min(t1.clutch.defRtg, t2.clutch.defRtg).toFixed(1)}</span> points per 100 possessions when the game is on the line.
          </p>
        );
    }
    
    if (activeTab === "def map" || activeTab === "defense") {
        return (
          <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
            Analyzing defensive disruption, <span className="text-white font-bold">{defWinner.name}</span> operates a tighter schematic structure, allowing only <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.min(t1.defRtg, t2.defRtg).toFixed(1)}</span> points per 100 possessions. Opponents struggle notably more against this defensive anchor, forced into lower shot quality and reduced effective field goal percentages.
          </p>
        );
    }

    if (activeTab === "off map" || activeTab === "offense" || activeTab === "advanced") {
        return (
          <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
             Offensively, the engine flows significantly better through <span className="text-white font-bold">{offWinner.name}</span>, establishing a dominant standard of <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(t1.offRtg, t2.offRtg).toFixed(1)} ORtg)</span>. Ball movement, spacing, and transition opportunities dictate an elite offensive ecosystem.
          </p>
        );
    }

    return (
      <p className="text-lg text-slate-300/90 leading-relaxed font-medium max-w-4xl tracking-wide">
        Systemically, <span className="text-white font-bold">{netWinner.name}</span> commands the overall statistical advantage with a Net Rating of <span className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{(Math.max(t1.netRtg, t2.netRtg) > 0 ? '+' : '')}{Math.max(t1.netRtg, t2.netRtg).toFixed(1)}</span>. Offensively, the engine flows better through <span className="text-white font-bold">{offWinner.name}</span> <span className="text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">({Math.max(t1.offRtg, t2.offRtg).toFixed(1)} ORtg)</span>. On the other side of the floor, <span className="text-white font-bold">{defWinner.name}</span> operates a tighter defensive scheme, allowing only <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{Math.min(t1.defRtg, t2.defRtg).toFixed(1)}</span> points per 100 possessions. Stylistically, <span className="text-white font-bold">{paceWinner.name}</span> forces a faster tempo.
      </p>
    );
  }, [t1, t2, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-1000">
        <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="h-14 w-14 animate-spin text-cyan-400 relative z-10" />
        </div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyan-400/80 animate-pulse font-mono">Initializing Oracle Engine</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground pb-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-8">
          <div className="text-center">
            <Badge className="bg-white/[0.02] border-white/[0.08] text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] px-6 py-2 mb-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] backdrop-blur-xl">
              Franchise Architecture Terminal
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-foreground drop-shadow-2xl">
              Team <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/30">Scouting</span>
            </h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center w-full max-w-5xl mx-auto">
            <TeamCombobox value={t1Id} onChange={(id: string, p: any) => { setT1Id(id); setT1Data(p); }} season={t1Season} onSeasonChange={setT1Season} themeColor={color1} />
            
            <div className="flex flex-col items-center gap-4 shrink-0 my-8 lg:my-0">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] z-20 pointer-events-none" viewBox="0 0 100 100">
                  {similarityScore !== null && (
                    <>
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <motion.circle cx="50" cy="50" r="46" fill="none" stroke="url(#dnaGradient)" strokeWidth="6" strokeLinecap="round" initial={{ strokeDasharray: "0 300" }} animate={{ strokeDasharray: `${(similarityScore / 100) * 289} 300` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }} />
                      <defs>
                        <linearGradient id="dnaGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={color1} /><stop offset="100%" stopColor={color2} /></linearGradient>
                      </defs>
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 rounded-3xl blur-2xl scale-110 animate-pulse" style={{ background: `linear-gradient(to bottom right, ${hexToRgba(color1, 0.2)}, ${hexToRgba(color2, 0.2)})` }} />
                <div className="relative w-20 h-20 bg-[#050914]/90 border border-white/[0.1] rounded-[1.5rem] flex items-center justify-center backdrop-blur-2xl shadow-2xl rotate-45 hover:scale-110 hover:rotate-90 transition-all duration-700 ease-out z-10">
                  <span className="text-2xl font-black text-transparent bg-clip-text -rotate-45" style={{ backgroundImage: `linear-gradient(to bottom right, ${color1}, #ffffff, ${color2})` }}>VS</span>
                </div>
              </div>
              {similarityScore !== null && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
                  <Badge className="bg-black/50 backdrop-blur-md border border-white/10 text-white/80 px-3 py-1 font-mono tracking-[0.2em] text-[10px] uppercase shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    System Match: <span className="text-white font-black ml-1.5 text-[11px] drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{similarityScore}%</span>
                  </Badge>
                </motion.div>
              )}
            </div>

            <TeamCombobox value={t2Id} onChange={(id: string, p: any) => { setT2Id(id); setT2Data(p); }} season={t2Season} onSeasonChange={setT2Season} themeColor={color2} />
          </div>

          <div className="flex justify-center w-full max-w-5xl mx-auto border-t border-white/[0.05] pt-6 mt-4">
             <div className="flex w-full bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl shadow-inner backdrop-blur-md">
                {["traditional", "overall", "offense", "defense", "advanced", "clutch", "off map", "def map"].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${activeTab === tab ? "bg-white/10 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                        {tab}
                    </button>
                ))}
             </div>
          </div>
        </motion.div>

        {t1 && t2 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} className="space-y-10">

            <div className="relative rounded-[3rem] overflow-hidden bg-white/[0.02] border border-white/[0.05] p-8 md:p-14 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
              <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] pointer-events-none rounded-[3rem]" />
              <div className="absolute -left-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.15) }} />
              <div className="absolute -right-40 -top-40 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.15) }} />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color1, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color1, 0.3)}`, '--tw-ring-color': hexToRgba(color1, 0.2) } as any}>
                      <AvatarImage src={t1.imageUrl} className="object-contain p-4" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{t1.abbreviation}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{t1.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color1 }}>
                      {t1Season}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 shrink-0 my-8 lg:my-0 opacity-0 pointer-events-none md:w-32"></div>

                <div className="flex flex-col items-center text-center space-y-5 flex-1">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[1.3] opacity-60 group-hover:opacity-100 group-hover:scale-[1.5] transition-all duration-700" style={{ backgroundColor: hexToRgba(color2, 0.3) }} />
                    <Avatar className="relative h-36 w-36 md:h-48 md:w-48 border-2 border-white/[0.15] bg-[#030712] ring-[6px] ring-offset-8 ring-offset-[#030712] transition-all duration-500" style={{ boxShadow: `0 0 60px ${hexToRgba(color2, 0.3)}`, '--tw-ring-color': hexToRgba(color2, 0.2) } as any}>
                      <AvatarImage src={t2.imageUrl} className="object-contain p-4" />
                      <AvatarFallback className="bg-card text-3xl font-black text-foreground">{t2.abbreviation}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{t2.name}</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] font-mono" style={{ color: color2 }}>
                      {t2Season}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === "off map" || activeTab === "def map" ? (
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full relative min-h-[500px]">
                 {isMapLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#050914]/50 backdrop-blur-sm rounded-[2rem] border border-white/5">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-mono">Fetching Exact Shot Coordinates...</p>
                    </div>
                 ) : (
                    <ShootingComparison 
                       player1={mapTeamToShootingProfile(t1, color1, activeTab === "def map" ? t1DefShots : t1OffShots, activeTab === "def map" ? "Shots Allowed" : "")!} 
                       player2={mapTeamToShootingProfile(t2, color2, activeTab === "def map" ? t2DefShots : t2OffShots, activeTab === "def map" ? "Shots Allowed" : "")!} 
                       isDefense={activeTab === "def map"}
                    />
                 )}
               </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="lg:col-span-5 w-full">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col group hover:border-white/[0.08] transition-[border-color] duration-500">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color1, 0.06) }} />
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: hexToRgba(color2, 0.06) }} />
                      
                      <div className="text-center mb-10 relative z-10">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg mb-1">{activeTab === 'clutch' ? 'Clutch DNA Hologram' : 'System DNA Hologram'}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">{activeTab === 'clutch' ? 'Clutch Percentile (0-100)' : 'League Percentile (0-100)'}</p>
                      </div>

                      <div className="w-full h-[380px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} outerRadius="60%">
                            <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 900 }} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#050914', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', color: '#fff', fontWeight: '900', fontSize: '13px', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }} 
                              itemStyle={{ padding: '4px 0' }}
                            />
                            <Radar name={t1NameYear} dataKey="p1" stroke={color1} strokeWidth={3.5} fill={color1} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color1, strokeWidth: 3 }} activeDot={{ r: 8, fill: color1, stroke: "#fff", strokeWidth: 2 }} />
                            <Radar name={t2NameYear} dataKey="p2" stroke={color2} strokeWidth={3.5} fill={color2} fillOpacity={0.15} dot={{ r: 5, fill: "#030712", stroke: color2, strokeWidth: 3 }} activeDot={{ r: 8, fill: color2, stroke: "#fff", strokeWidth: 2 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="lg:col-span-7 w-full">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden hover:border-white/[0.08] transition-[border-color] duration-500 flex flex-col h-full">
                      <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] pointer-events-none rounded-[2.5rem]" />
                      
                      <div className="flex flex-col items-center mb-8 relative z-10 border-b border-white/[0.05] pb-6">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-3 font-mono">
                           {activeTab === 'clutch' ? 'Clutch Dominance' : 'Raw Stat Dominance'}
                         </h3>
                         <div className="flex items-center gap-6 bg-black/40 px-6 py-2.5 rounded-full border border-white/[0.05] shadow-inner">
                            <span className="text-xl font-black font-mono" style={{ color: color1, textShadow: `0 0 15px ${hexToRgba(color1, 0.5)}` }}>{dominanceScore.p1Wins}</span>
                            <div className="w-12 h-px bg-white/10" />
                            <span className="text-xl font-black font-mono" style={{ color: color2, textShadow: `0 0 15px ${hexToRgba(color2, 0.5)}` }}>{dominanceScore.p2Wins}</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between mb-8 relative z-10">
                        {activeTab === 'clutch' && t1.clutch && t2.clutch ? (
                           <>
                             <div className="flex flex-col text-center">
                                <span className="text-[12px] font-black uppercase tracking-[0.25em]" style={{ color: color1 }}>{t1.abbreviation}</span>
                                <span className="text-[9px] font-bold text-white/50 tracking-widest mt-1">
                                    Record: {t1.clutch.wins}-{t1.clutch.losses} ({t1.clutch.winPct}%) <span className="px-1">|</span> {t1.clutch.min.toFixed(1)} Min
                                </span>
                             </div>
                             <div className="flex flex-col text-center">
                                <span className="text-[12px] font-black uppercase tracking-[0.25em]" style={{ color: color2 }}>{t2.abbreviation}</span>
                                <span className="text-[9px] font-bold text-white/50 tracking-widest mt-1">
                                    Record: {t2.clutch.wins}-{t2.clutch.losses} ({t2.clutch.winPct}%) <span className="px-1">|</span> {t2.clutch.min.toFixed(1)} Min
                                </span>
                             </div>
                           </>
                        ) : (
                           <>
                             <div className="flex flex-col items-center">
                               <span className="text-[12px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-lg border" style={{ color: color1, backgroundColor: hexToRgba(color1, 0.08), borderColor: hexToRgba(color1, 0.2), boxShadow: `0 0 20px ${hexToRgba(color1, 0.1)}` }}>
                                 {t1.abbreviation} '{t1Season.substring(2,4)}
                               </span>
                               <span className="text-[9px] font-bold text-white/40 tracking-widest mt-2 uppercase font-mono">
                                 Record: {t1.wins}-{t1.losses} ({(t1.wins / (t1.wins + t1.losses) * 100).toFixed(1)}%)
                               </span>
                             </div>
                             <div className="flex flex-col items-center">
                               <span className="text-[12px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-lg border" style={{ color: color2, backgroundColor: hexToRgba(color2, 0.08), borderColor: hexToRgba(color2, 0.2), boxShadow: `0 0 20px ${hexToRgba(color2, 0.1)}` }}>
                                 {t2.abbreviation} '{t2Season.substring(2,4)}
                               </span>
                               <span className="text-[9px] font-bold text-white/40 tracking-widest mt-2 uppercase font-mono">
                                 Record: {t2.wins}-{t2.losses} ({(t2.wins / (t2.wins + t2.losses) * 100).toFixed(1)}%)
                               </span>
                             </div>
                           </>
                        )}
                      </div>
                      
                      <div className={`relative z-10 flex-1 divide-y divide-white/[0.02] space-y-0`}>
                        {statBars.map((s, i) => (
                          <TugBar key={i} label={s.label} v1={s.v1} v2={s.v2} c1={color1} c2={color2} reverse={s.reverse} showPlus={s.showPlus} isPct={s.isPct} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
            )}

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="relative bg-[#030712]/50 border border-emerald-500/[0.15] rounded-[2.5rem] p-10 md:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden group hover:border-emerald-500/30 transition-colors duration-500 backdrop-blur-md mt-10">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 group-hover:bg-emerald-500/[0.08]" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10">
                <div className="shrink-0 w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.15)] relative overflow-hidden group-hover:border-emerald-500/40 transition-colors duration-500">
                  <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <Brain className="h-10 w-10 text-emerald-400 animate-pulse relative z-10 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-[14px] font-black uppercase tracking-[0.3em] text-white drop-shadow-md">Neural Engine Analysis</h3>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 font-mono shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                      System v2.4 Live
                    </Badge>
                  </div>
                  {aiVerdict}
                </div>
              </div>
            </motion.div>

          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center justify-center py-32 opacity-60 relative z-10">
             <div className="relative mb-8 group">
               <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <Hexagon className="h-24 w-24 text-muted-foreground relative z-10 animate-pulse" />
             </div>
             <p className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground text-center font-mono">
               Awaiting Database Initialization<br/>
               <span className="text-[10px] text-slate-600">Select franchises from any era to begin</span>
             </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
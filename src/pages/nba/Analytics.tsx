import { useState, useMemo, useEffect, useRef } from "react";
import { useSport } from "@/contexts/SportContext";
import { nbaService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from "recharts";
import { Activity, BarChart3, LineChart as LineChartIcon, Hexagon, Plus, X, Search, Loader2, Settings, BookOpen, Brain, Calculator, Trophy, Sigma, Medal, ArrowUpRight, History, AlertCircle } from "lucide-react";
import type { NBAPlayer } from "@/data/nba/mockData";

const METRIC_COLORS: Record<string, string> = {
  per: "#3b82f6", bpm: "#10b981", vorp: "#f59e0b", pie: "#8b5cf6",
  net: "#ec4899", usg: "#06b6d4", ts: "#14b8a6", ast: "#f43f5e", efg: "#eab308",
};

const PLAYER_COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#eab308"];
const ALL_METRICS = ["per", "bpm", "vorp", "pie", "net", "usg", "ts", "ast", "efg"];

const formatMetricLabel = (m: string) => {
  if (m === "ts") return "TS%";
  if (m === "ast") return "AST%";
  if (m === "usg") return "USG%";
  if (m === "efg") return "eFG%";
  return m.toUpperCase();
};

const DICTIONARY = [
  { 
    id: "per", abbr: "PER", name: "Player Efficiency Rating", creator: "John Hollinger", 
    desc: "A per-minute rating of a player's overall positive and negative contributions. The league average is dynamically standardized to strictly 15.0 every season.", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "Michael Jordan", v: 27.91}, {n: "Nikola Jokić", v: 27.90}, {n: "LeBron James", v: 27.04}, {n: "Anthony Davis", v: 26.89}, {n: "Shaquille O'Neal", v: 26.43}, {n: "David Robinson", v: 26.18}, {n: "Wilt Chamberlain", v: 26.16}, {n: "Giannis Antetokounmpo", v: 25.50}, {n: "Bob Pettit", v: 25.45}, {n: "Kevin Durant", v: 25.18}],
    histPeak: [{n: "Nikola Jokić", s: "21-22", v: 32.85}, {n: "Wilt Chamberlain", s: "61-62", v: 32.08}, {n: "Giannis Antetokounmpo", s: "21-22", v: 32.05}, {n: "Giannis Antetokounmpo", s: "19-20", v: 31.86}, {n: "Wilt Chamberlain", s: "62-63", v: 31.82}, {n: "Michael Jordan", s: "87-88", v: 31.71}, {n: "LeBron James", s: "08-09", v: 31.67}, {n: "Wilt Chamberlain", s: "59-60", v: 31.63}, {n: "LeBron James", s: "12-13", v: 31.59}, {n: "Stephen Curry", s: "15-16", v: 31.46}]
  },
  { 
    id: "bpm", abbr: "BPM", name: "Box Plus/Minus", creator: "Basketball-Reference", 
    desc: "Estimates a player's contribution to the team per 100 possessions above a league-average player (0.0 is average, +5.0 is All-NBA).", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "Nikola Jokić", v: 10.56}, {n: "Michael Jordan", v: 9.21}, {n: "LeBron James", v: 8.40}, {n: "Magic Johnson", v: 7.42}, {n: "Chris Paul", v: 7.15}, {n: "David Robinson", v: 7.07}, {n: "Stephen Curry", v: 6.80}, {n: "James Harden", v: 6.69}, {n: "Giannis Antetokounmpo", v: 6.55}, {n: "Larry Bird", v: 6.52}],
    histPeak: [{n: "Nikola Jokić", s: "24-25", v: 13.28}, {n: "LeBron James", s: "08-09", v: 13.24}, {n: "Nikola Jokić", s: "22-23", v: 13.01}, {n: "Michael Jordan", s: "87-88", v: 12.96}, {n: "Michael Jordan", s: "88-89", v: 12.11}, {n: "Nikola Jokić", s: "23-24", v: 12.01}, {n: "Stephen Curry", s: "15-16", v: 11.94}, {n: "LeBron James", s: "09-10", v: 11.85}, {n: "Giannis Antetokounmpo", s: "19-20", v: 11.54}, {n: "Russell Westbrook", s: "16-17", v: 11.11}]
  },
  { 
    id: "vorp", abbr: "VORP", name: "Value Over Replacement Player", creator: "Basketball-Reference", 
    desc: "Converts BPM into an estimate of TOTAL points contributed over a season compared to a replacement-level player (-2.0 BPM). This is a CUMULATIVE metric.", 
    careerLabel: "All-Time Career TOTAL", 
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "LeBron James", v: 152.3}, {n: "Michael Jordan", v: 116.1}, {n: "John Stockton", v: 110.5}, {n: "Karl Malone", v: 104.9}, {n: "Chris Paul", v: 102.5}, {n: "Kevin Garnett", v: 98.4}, {n: "Kareem Abdul-Jabbar", v: 95.8}, {n: "Tim Duncan", v: 95.5}, {n: "Magic Johnson", v: 92.5}, {n: "Larry Bird", v: 88.5}],
    histPeak: [{n: "Michael Jordan", s: "87-88", v: 12.5}, {n: "Michael Jordan", s: "88-89", v: 12.0}, {n: "LeBron James", s: "08-09", v: 11.6}, {n: "Michael Jordan", s: "89-90", v: 11.6}, {n: "Russell Westbrook", s: "16-17", v: 11.5}, {n: "LeBron James", s: "12-13", v: 11.4}, {n: "Nikola Jokić", s: "23-24", v: 10.6}, {n: "LeBron James", s: "09-10", v: 10.5}, {n: "Stephen Curry", s: "15-16", v: 10.4}, {n: "Michael Jordan", s: "90-91", v: 10.3}]
  },
  { 
    id: "pie", abbr: "PIE", name: "Player Impact Estimate", creator: "NBA Advanced Stats", 
    desc: "Measures a player's overall statistical contribution against the total statistics in games they play.", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "LeBron James", v: 19.4}, {n: "Nikola Jokić", v: 19.1}, {n: "Michael Jordan", v: 19.0}, {n: "Joel Embiid", v: 18.5}, {n: "Anthony Davis", v: 18.4}, {n: "Luka Dončić", v: 18.2}, {n: "Chris Paul", v: 17.5}, {n: "Kevin Durant", v: 17.2}, {n: "James Harden", v: 16.9}, {n: "Giannis Antetokounmpo", v: 16.8}],
    histPeak: [{n: "Nikola Jokić", s: "23-24", v: 23.4}, {n: "Giannis Antetokounmpo", s: "19-20", v: 23.1}, {n: "Russell Westbrook", s: "16-17", v: 23.0}, {n: "LeBron James", s: "08-09", v: 22.9}, {n: "Nikola Jokić", s: "21-22", v: 22.8}, {n: "Joel Embiid", s: "22-23", v: 22.1}, {n: "LeBron James", s: "12-13", v: 21.8}, {n: "Giannis Antetokounmpo", s: "21-22", v: 21.5}, {n: "Luka Dončić", s: "23-24", v: 21.1}, {n: "James Harden", s: "18-19", v: 20.8}]
  },
  { 
    id: "net", abbr: "NET", name: "Net Rating", creator: "NBA", 
    desc: "The point differential per 100 possessions while the player is on the court (Offensive Rating minus Defensive Rating).", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "Manu Ginobili", v: 11.6}, {n: "Stephen Curry", v: 11.5}, {n: "Kawhi Leonard", v: 10.8}, {n: "Draymond Green", v: 10.4}, {n: "Tim Duncan", v: 10.2}, {n: "David Robinson", v: 10.1}, {n: "Rudy Gobert", v: 9.8}, {n: "Michael Jordan", v: 9.5}, {n: "Jayson Tatum", v: 9.4}, {n: "LeBron James", v: 9.1}],
    histPeak: [{n: "Stephen Curry", s: "16-17", v: 17.5}, {n: "Draymond Green", s: "15-16", v: 16.9}, {n: "Stephen Curry", s: "15-16", v: 16.4}, {n: "Michael Jordan", s: "95-96", v: 15.2}, {n: "LeBron James", s: "08-09", v: 14.8}, {n: "Jayson Tatum", s: "23-24", v: 14.5}, {n: "Derrick White", s: "23-24", v: 14.2}, {n: "Nikola Jokić", s: "22-23", v: 13.8}, {n: "Giannis Antetokounmpo", s: "19-20", v: 13.6}, {n: "Kawhi Leonard", s: "15-16", v: 13.5}]
  },
  { 
    id: "usg", abbr: "USG%", name: "Usage Percentage", creator: "Standard", 
    desc: "The percentage of team plays used by a player while they are on the floor.", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "Luka Dončić", v: 35.6}, {n: "Joel Embiid", v: 34.8}, {n: "Michael Jordan", v: 33.3}, {n: "Allen Iverson", v: 31.8}, {n: "Kobe Bryant", v: 31.8}, {n: "LeBron James", v: 31.5}, {n: "Russell Westbrook", v: 31.5}, {n: "Dwyane Wade", v: 31.4}, {n: "Carmelo Anthony", v: 31.2}, {n: "Donovan Mitchell", v: 30.8}],
    histPeak: [{n: "Russell Westbrook", s: "16-17", v: 41.6}, {n: "James Harden", s: "18-19", v: 40.5}, {n: "Joel Embiid", s: "23-24", v: 39.6}, {n: "Kobe Bryant", s: "05-06", v: 38.7}, {n: "Joel Embiid", s: "22-23", v: 37.0}, {n: "Giannis Antetokounmpo", s: "22-23", v: 36.6}, {n: "Luka Dončić", s: "22-23", v: 36.2}, {n: "Russell Westbrook", s: "14-15", v: 36.0}, {n: "Luka Dončić", s: "23-24", v: 35.9}, {n: "Allen Iverson", s: "01-02", v: 35.5}]
  },
  { 
    id: "ts", abbr: "TS%", name: "True Shooting Percentage", creator: "Standard", 
    desc: "Measures a player's true scoring efficiency. Modern Rim-Runners dominate this stat when minimums are strictly enforced.", 
    careerLabel: "All-Time Career Avg", 
    qualifierWarning: "70% Games Played, 20.0 MPG, and AT LEAST 8.0 Field Goal Attempts Per Game",
    histCareer: [{n: "DeAndre Jordan", v: 67.4}, {n: "Rudy Gobert", v: 67.1}, {n: "Jarrett Allen", v: 66.5}, {n: "Mitchell Robinson", v: 66.4}, {n: "Clint Capela", v: 63.8}, {n: "Artis Gilmore", v: 63.3}, {n: "Mason Plumlee", v: 62.8}, {n: "Stephen Curry", v: 62.6}, {n: "Dwight Powell", v: 62.3}, {n: "Tyson Chandler", v: 61.5}],
    histPeak: [{n: "Mitchell Robinson", s: "19-20", v: 74.2}, {n: "Daniel Gafford", s: "23-24", v: 73.2}, {n: "Rudy Gobert", s: "20-21", v: 73.0}, {n: "Artis Gilmore", s: "81-82", v: 70.2}, {n: "Grayson Allen", s: "23-24", v: 69.8}, {n: "DeAndre Jordan", s: "16-17", v: 68.2}, {n: "Rudy Gobert", s: "18-19", v: 68.2}, {n: "Stephen Curry", s: "17-18", v: 67.5}, {n: "Stephen Curry", s: "15-16", v: 66.9}, {n: "Nikola Jokić", s: "22-23", v: 66.1}]
  },
  { 
    id: "ast", abbr: "AST%", name: "Assist Percentage", creator: "Standard", 
    desc: "An estimate of the percentage of teammate field goals a player assisted while they were on the floor.", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played and 20.0 Minutes Per Game",
    histCareer: [{n: "John Stockton", v: 50.2}, {n: "Chris Paul", v: 45.8}, {n: "Trae Young", v: 45.1}, {n: "Steve Nash", v: 44.5}, {n: "Luka Dončić", v: 43.8}, {n: "Tyrese Haliburton", v: 43.1}, {n: "Magic Johnson", v: 42.5}, {n: "Rajon Rondo", v: 41.9}, {n: "Russell Westbrook", v: 41.0}, {n: "John Wall", v: 39.8}],
    histPeak: [{n: "John Stockton", s: "89-90", v: 57.5}, {n: "Russell Westbrook", s: "16-17", v: 57.3}, {n: "John Stockton", s: "88-89", v: 56.1}, {n: "Chris Paul", s: "07-08", v: 54.5}, {n: "John Stockton", s: "90-91", v: 54.4}, {n: "Steve Nash", s: "07-08", v: 53.1}, {n: "John Stockton", s: "91-92", v: 52.8}, {n: "Trae Young", s: "23-24", v: 51.5}, {n: "Luka Dončić", s: "20-21", v: 50.7}, {n: "Tyrese Haliburton", s: "23-24", v: 50.5}]
  },
  { 
    id: "efg", abbr: "eFG%", name: "Effective Field Goal %", creator: "Standard", 
    desc: "Adjusts traditional field goal percentage to account for the fact that 3-point shots are worth 50% more than 2-point shots.", 
    careerLabel: "All-Time Career Avg",
    qualifierWarning: "70% Games Played, 20.0 MPG, and AT LEAST 8.0 Field Goal Attempts Per Game",
    histCareer: [{n: "DeAndre Jordan", v: 67.3}, {n: "Rudy Gobert", v: 67.1}, {n: "Jarrett Allen", v: 66.5}, {n: "Mitchell Robinson", v: 66.4}, {n: "Clint Capela", v: 63.8}, {n: "Mason Plumlee", v: 62.7}, {n: "Tyson Chandler", v: 61.5}, {n: "Steven Adams", v: 61.1}, {n: "Dwight Powell", v: 60.8}, {n: "Shaquille O'Neal", v: 58.2}],
    histPeak: [{n: "Mitchell Robinson", s: "19-20", v: 74.2}, {n: "Daniel Gafford", s: "23-24", v: 73.2}, {n: "Rudy Gobert", s: "20-21", v: 73.0}, {n: "DeAndre Jordan", s: "16-17", v: 71.4}, {n: "Jarrett Allen", s: "20-21", v: 70.8}, {n: "Rudy Gobert", s: "18-19", v: 68.2}, {n: "Stephen Curry", s: "15-16", v: 63.0}, {n: "Nikola Jokić", s: "22-23", v: 63.2}, {n: "Giannis Antetokounmpo", s: "22-23", v: 60.1}, {n: "LeBron James", s: "13-14", v: 60.3}]
  },
];

const FormulaRenderer = ({ metric }: { metric: string }) => {
  switch(metric) {
    case 'per':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">PER =</span>
          <span className="text-blue-400">[ (PTS + REB + AST + STL + BLK) - (Missed FG + Missed FT + TOV) ]</span>
          <span className="text-white">/</span>
          <span className="text-emerald-400">MINUTES</span>
        </div>
      );
    case 'bpm':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">BPM ≈</span>
          <span className="text-blue-400">Team Base Impact</span>
          <span className="text-white">+</span>
          <span className="text-emerald-400">(Player Efficiency × Usage Adjustments)</span>
        </div>
      );
    case 'vorp':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">VORP =</span>
          <span className="text-blue-400">[ BPM - (-2.0) ]</span>
          <span className="text-white">×</span>
          <div className="flex flex-col items-center">
            <span className="text-emerald-400 border-b border-white/20 px-2 pb-0.5">Player Mins</span>
            <span className="text-slate-400 px-2 pt-0.5">Team Mins</span>
          </div>
          <span className="text-white">×</span>
          <span className="text-amber-400">Team Games</span>
        </div>
      );
    case 'pie':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">PIE =</span>
          <div className="flex flex-col items-center">
            <span className="text-blue-400 border-b border-white/20 px-2 pb-0.5">PTS + FGM + REB + AST + STL + BLK - Missed FG - Missed FT - TOV</span>
            <span className="text-slate-400 px-2 pt-0.5">Total Match Stats (Both Teams)</span>
          </div>
        </div>
      );
    case 'net':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">NET =</span>
          <span className="text-blue-400">Offensive Rating</span>
          <span className="text-white">-</span>
          <span className="text-rose-400">Defensive Rating</span>
        </div>
      );
    case 'usg':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">USG% =</span>
          <div className="flex flex-col items-center">
            <span className="text-blue-400 border-b border-white/20 px-2 pb-0.5">FGA + (0.44 × FTA) + TOV</span>
            <span className="text-slate-400 px-2 pt-0.5">Team FGA + (0.44 × Team FTA) + Team TOV</span>
          </div>
        </div>
      );
    case 'ts':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">TS% =</span>
          <div className="flex flex-col items-center">
            <span className="text-emerald-400 border-b border-white/20 px-2 pb-0.5">PTS</span>
            <span className="text-blue-400 px-2 pt-0.5">2 × (FGA + 0.44 × FTA)</span>
          </div>
          <span className="text-white">×</span>
          <span className="text-amber-400">100</span>
        </div>
      );
    case 'ast':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">AST% =</span>
          <div className="flex flex-col items-center">
            <span className="text-emerald-400 border-b border-white/20 px-2 pb-0.5">AST</span>
            <span className="text-blue-400 px-2 pt-0.5">Team FGM - Player FGM</span>
          </div>
          <span className="text-white">×</span>
          <span className="text-amber-400">100</span>
        </div>
      );
    case 'efg':
      return (
        <div className="flex items-center gap-3 font-mono font-bold text-base md:text-lg flex-wrap">
          <span className="text-white">eFG% =</span>
          <div className="flex flex-col items-center">
            <span className="text-emerald-400 border-b border-white/20 px-2 pb-0.5">FGM + (0.5 × 3PM)</span>
            <span className="text-blue-400 px-2 pt-0.5">FGA</span>
          </div>
          <span className="text-white">×</span>
          <span className="text-amber-400">100</span>
        </div>
      );
    default:
      return <span className="text-slate-400 font-mono">Formula derived directly from Box Score metrics.</span>;
  }
};

const PlayerSearchCombo = ({ players, onSelect, excludeIds }: { players: NBAPlayer[], onSelect: (id: string) => void, excludeIds: string[] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availablePlayers = players
    .filter(p => !excludeIds.includes(p.id) && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-sm font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all duration-300 whitespace-nowrap shadow-lg shadow-blue-900/20">
        <Plus className="h-5 w-5" /> Add Athlete
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-3 w-[350px] bg-[#0a0f18] border border-white/10 rounded-2xl shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100] backdrop-blur-3xl">
          <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
            <Search className="h-4 w-4 text-slate-400" />
            <input autoFocus placeholder="Search athlete by name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent text-white border-none focus:outline-none text-sm font-bold placeholder:text-slate-700" />
          </div>
          <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {availablePlayers.map(p => (
              <div key={p.id} onClick={() => { onSelect(p.id); setOpen(false); setSearch(""); }} className="p-4 px-5 flex items-center gap-4 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/[0.03]">
                <Avatar className="h-12 w-12 border border-white/10 bg-white shadow-md"><AvatarImage src={p.imageUrl} className="object-cover" loading="lazy" /><AvatarFallback className="bg-slate-800 text-xs font-bold text-slate-400">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex flex-col"><span className="text-sm font-bold text-white">{p.name}</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.teamId} · {p.position}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isProfileChart = ALL_METRICS.map(m => formatMetricLabel(m)).includes(label);
    return (
      <div className="bg-[#0a0f18]/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl min-w-[200px]">
        <p className="text-white font-black text-sm mb-3 pb-3 border-b border-white/10 tracking-widest uppercase">{label}</p>
        {payload.map((entry: any, index: number) => {
          const displayName = isProfileChart ? entry.name : formatMetricLabel(entry.name);
          const rawVal = entry.payload[`${entry.dataKey}_raw`];
          const percentileVal = entry.value;
          return (
            <div key={index} className="flex items-center justify-between gap-8 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">{displayName}</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-white font-black text-sm">{rawVal}</span>
                <span className="text-[9px] font-black text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">P{percentileVal}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function NBAAnalytics() {
  const { sport } = useSport();
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["ts", "efg", "usg"]);
  const [chartType, setChartType] = useState<"bar" | "radar" | "line">("line"); 
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  const [selectedMetricModal, setSelectedMetricModal] = useState<any | null>(null);
  
  const [modalConfFilter, setModalConfFilter] = useState<string>("all");
  const [modalTeamFilter, setModalTeamFilter] = useState<string>("all");
  
  const [strictQualifiers, setStrictQualifiers] = useState<boolean>(true);

  useEffect(() => {
    nbaService.fetchAllOfficialPlayers().then((players) => {
      const playersWithAdv = players.map(p => ({
        ...p,
        adv: nbaService.computeAllAdvanced(p),
        name_short: p.name.split(" ").pop() || p.name
      }));
      const sortedAlpha = playersWithAdv.sort((a, b) => a.name.localeCompare(b.name));
      setAllPlayers(sortedAlpha);

      const qualifiedStars = [...playersWithAdv].filter(p => (p.stats.mpg || 0) >= 15);
      const top3Ids = qualifiedStars.sort((a, b) => b.adv.per - a.adv.per).slice(0, 3).map(p => p.id);
      
      setSelectedPlayerIds(top3Ids);
      setIsLoading(false);
    });
  }, []);

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 2) setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      if (selectedMetrics.length < 6) setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const handleAddPlayer = (id: string) => {
    if (selectedPlayerIds.length < 8 && !selectedPlayerIds.includes(id)) setSelectedPlayerIds([...selectedPlayerIds, id]);
  };
  const handleRemovePlayer = (id: string) => setSelectedPlayerIds(selectedPlayerIds.filter(pId => pId !== id));

  const chartData = useMemo(() => {
    if (allPlayers.length === 0) return [];
    const distributions: Record<string, number[]> = {};
    ALL_METRICS.forEach(m => { distributions[m] = allPlayers.map(p => p.adv[m]).filter(v => v !== undefined && !isNaN(v)).sort((a, b) => a - b); });

    const calcPercentile = (val: number, arr: number[]) => {
      if (arr.length === 0) return 50;
      const countLower = arr.filter(v => v <= val).length;
      return Math.round((countLower / arr.length) * 100);
    };

    return selectedPlayerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean).map(p => {
        const dataPoint: any = { name: p.name_short, full_name: p.name };
        ALL_METRICS.forEach(m => {
           const rawVal = p.adv[m];
           dataPoint[m] = calcPercentile(rawVal, distributions[m]); 
           dataPoint[`${m}_raw`] = rawVal; 
        });
        return dataPoint;
    });
  }, [selectedPlayerIds, allPlayers]);


  const maxLeagueGames = useMemo(() => {
    if (allPlayers.length === 0) return 1;
    return Math.max(...allPlayers.map(p => p.stats.gp || 0));
  }, [allPlayers]);

  const checkQualifies = (p: any, metricId: string) => {
    const requiredGP = Math.floor(maxLeagueGames * 0.7); 
    const meetsGP = (p.stats.gp || 0) >= requiredGP;
    const meetsMins = (p.stats.mpg || 0) >= 20;
    
    const isShootingMetric = metricId === 'ts' || metricId === 'efg';
    const meetsFGA = !isShootingMetric || (p.stats.fga || 0) >= 8;
    
    return meetsGP && meetsMins && meetsFGA;
  };

  const getLiveLeaders = (metricId: string, teamFilter: string, confFilter: string) => {
    return allPlayers
      .filter(p => (p.stats.mpg || 0) >= 5) 
      .filter(p => teamFilter === "all" || p.teamId === teamFilter)
      .filter(p => {
         // 🚀 FIX: Coincidencia de string segura para la conferencia (ej: "Eastern" incluye "East")
         if (confFilter === "all") return true;
         const teamInfo = nbaService.getAllTeams().find(t => t.abbreviation === p.teamId);
         return teamInfo?.conference?.toLowerCase().includes(confFilter.toLowerCase());
      })
      .map(p => ({ ...p, qualifies: checkQualifies(p, metricId) }))
      .filter(p => strictQualifiers ? p.qualifies : true) 
      .sort((a, b) => b.adv[metricId] - a.adv[metricId])
      .slice(0, 10); 
  };

  const getDynamicHistoricalPeaks = (metricId: string, baseHistPeaks: any[]) => {
    const liveLeadersGlobal = getLiveLeaders(metricId, "all", "all");
    let combinedPeaks = [...baseHistPeaks];
    
    const threshold = baseHistPeaks[baseHistPeaks.length - 1].v;
    
    liveLeadersGlobal.forEach(lp => {
      const val = lp.adv[metricId];
      if (val >= threshold) {
        const exists = combinedPeaks.find(p => p.n === lp.name && p.s === "25-26");
        if(!exists) {
          combinedPeaks.push({ n: lp.name, s: "25-26", v: val, isLive: true, qualifies: lp.qualifies });
        }
      }
    });

    return combinedPeaks.sort((a, b) => b.v - a.v).slice(0, 10);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Compiling Analytics Data...</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartData.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-500 font-black text-sm uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl p-10 text-center bg-white/[0.01]">Add athletes using the panel above to visualize Quantum Analytics</div>;

    const profileData = selectedMetrics.map(m => {
      const label = formatMetricLabel(m);
      const entry: any = { metric: label }; 
      chartData.forEach(d => { entry[d.name] = d[m]; entry[`${d.name}_raw`] = d[`${m}_raw`]; });
      return entry;
    });

    if (chartType === "radar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={profileData} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 900, tracking: '0.1em' }} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }} />
            {chartData.map((d, i) => (
              <Radar key={d.name} name={d.full_name} dataKey={d.name} stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]} fill={PLAYER_COLORS[i % PLAYER_COLORS.length]} fillOpacity={0.15} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0a0f18' }} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={profileData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 'bold' }} tickMargin={20} />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 40 }} />
            <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold' }} />
            {chartData.map((d, i) => (
              <Line key={d.name} type="monotone" name={d.full_name} dataKey={d.name} stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 3, stroke: '#0a0f18', fill: PLAYER_COLORS[i % PLAYER_COLORS.length] }} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 'bold' }} tickMargin={15} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }} />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold' }} />
          {selectedMetrics.map((m, i) => (
            <Bar key={m} name={formatMetricLabel(m)} dataKey={m} fill={METRIC_COLORS[m]} radius={[8, 8, 0, 0]} maxBarSize={60} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      
      {selectedMetricModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedMetricModal(null)}></div>
          
          <div className="relative w-full max-w-6xl bg-[#0a0f18] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-start bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-blue-600/20 text-blue-400 font-black text-lg px-4 py-1 border border-blue-500/30">
                    {selectedMetricModal.abbr}
                  </Badge>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Calculator className="h-3 w-3"/> By {selectedMetricModal.creator}</span>
                </div>
                <h2 className="text-3xl font-black text-white">{selectedMetricModal.name}</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">{selectedMetricModal.desc}</p>
              </div>
              
              <div className="flex flex-col items-end gap-4">
                <button onClick={() => setSelectedMetricModal(null)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
                
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Qualifiers</span>
                  <button 
                    onClick={() => setStrictQualifiers(!strictQualifiers)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${strictQualifiers ? 'bg-blue-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${strictQualifiers ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-8">
              
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><Sigma className="h-4 w-4"/> Mathematical Formula</h3>
                <div className="bg-[#05080f] border border-white/5 rounded-2xl p-6 flex items-center justify-center overflow-x-auto shadow-inner min-h-[80px]">
                  <FormulaRenderer metric={selectedMetricModal.id} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
                
                {/* COLUMNA LÍDERES EN VIVO */}
                <div className="space-y-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap"><Activity className="h-4 w-4 text-blue-400"/> Live 25-26</h3>
                    
                    <div className="flex items-center gap-2">
                      <select 
                        value={modalConfFilter} 
                        onChange={(e) => { setModalConfFilter(e.target.value); setModalTeamFilter("all"); }}
                        className="bg-[#0f172a] text-white border border-white/10 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none hover:border-white/30 transition-colors cursor-pointer"
                      >
                        <option value="all" className="bg-[#0f172a]">ALL CONFS</option>
                        <option value="East" className="bg-[#0f172a]">EAST</option>
                        <option value="West" className="bg-[#0f172a]">WEST</option>
                      </select>
                      
                      <select 
                        value={modalTeamFilter} 
                        onChange={(e) => setModalTeamFilter(e.target.value)}
                        className="bg-[#0f172a] text-white border border-white/10 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none hover:border-white/30 transition-colors cursor-pointer w-[100px]"
                      >
                        <option value="all" className="bg-[#0f172a]">ALL TEAMS</option>
                        {Array.from(new Set(allPlayers.map(p => p.teamId)))
                          .filter(t => {
                             if (modalConfFilter === "all") return true;
                             const teamInfo = nbaService.getAllTeams().find(team => team.abbreviation === t);
                             return teamInfo?.conference?.toLowerCase().includes(modalConfFilter.toLowerCase());
                          })
                          .sort()
                          .map(t => (
                          <option key={t} value={t} className="bg-[#0f172a]">{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2">
                    {getLiveLeaders(selectedMetricModal.id, modalTeamFilter, modalConfFilter).map((p, i) => (
                      <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-xl transition-colors group hover:bg-white/5`}>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 font-mono font-black text-xs w-4">{i + 1}</span>
                          <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={p.imageUrl} className="object-cover" /><AvatarFallback>{p.name.substring(0,2)}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold flex items-center gap-1 ${!p.qualifies ? 'text-slate-300' : 'text-white group-hover:text-blue-400'}`}>
                              {p.name} {!p.qualifies && <span className="text-amber-500 font-black text-lg leading-none mt-1">*</span>}
                            </span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.teamId}</span>
                          </div>
                        </div>
                        <span className={`font-mono font-black text-base ${!p.qualifies ? 'text-slate-400' : 'text-blue-400'}`}>{p.adv[selectedMetricModal.id].toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMNA PICO HISTÓRICO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Medal className="h-4 w-4 text-emerald-400"/> Single-Season Peak</h3>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-2 relative overflow-hidden mt-[38px]">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
                    {getDynamicHistoricalPeaks(selectedMetricModal.id, selectedMetricModal.histPeak).map((h: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${h.isLive ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`${h.isLive ? 'text-emerald-400' : 'text-emerald-600/50'} font-mono font-black text-xs w-4`}>{i + 1}</span>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold flex items-center gap-1 ${h.isLive ? 'text-white' : 'text-slate-300'}`}>
                              {h.n} 
                              {h.isLive && <Badge className="bg-emerald-500 text-slate-900 px-1 py-0 text-[8px] font-black uppercase tracking-widest border-none">LIVE</Badge>}
                              {h.isLive && !h.qualifies && <span className="text-amber-500 font-black text-lg leading-none mt-1">*</span>}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${h.isLive ? 'text-emerald-300' : 'text-slate-500'}`}>SEASON {h.s}</span>
                          </div>
                        </div>
                        <span className={`font-mono font-black text-sm ${h.isLive ? 'text-white' : 'text-emerald-500'}`}>{h.v.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMNA CARRERA */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400"/> 
                    {selectedMetricModal.careerLabel}
                  </h3>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-2 relative overflow-hidden mt-[38px]">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full"></div>
                    {selectedMetricModal.histCareer.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-amber-600/50 font-mono font-black text-xs w-4">{i + 1}</span>
                          <span className="text-sm font-bold text-slate-300">{h.n}</span>
                        </div>
                        <span className="font-mono font-black text-amber-500 text-sm">{h.v.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* 🚀 AVISO DINÁMICO E INDIVIDUALIZADO DE RESTRICCIONES OFICIALES */}
              {!strictQualifiers && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-500/90 leading-relaxed">
                    <span className="text-amber-400 font-black">UNQUALIFIED DATA WARNING:</span> Players marked with an asterisk (<span className="text-xl leading-none">*</span>) do not meet official NBA volume requirements to qualify as league leaders <span className="text-amber-300">({selectedMetricModal.qualifierWarning})</span>. Small sample sizes may produce statistical anomalies.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* RECHARTS, HEADER, Y GLOSARIO (Sin cambios) */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">Quantum Analytics</h1>
          <p className="text-slate-400 text-sm font-medium tracking-tight mt-1.5">Official 2025-26 NBA advanced metrics and multi-athlete visualization</p>
        </div>
        <Badge className="bg-blue-600/10 text-blue-400 border border-blue-500/20 font-black text-[10px] px-3 py-1 uppercase tracking-widest">{chartData.length} Athletes</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl rounded-3xl sticky top-8 z-20">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><Settings className="h-4 w-4" /> Config Panel</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visualization Engine</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'bar', icon: BarChart3, label: 'Bar' },
                    { type: 'radar', icon: Hexagon, label: 'Radar' },
                    { type: 'line', icon: LineChartIcon, label: 'Line' }
                  ].map(item => (
                    <button key={item.type} onClick={() => setChartType(item.type as any)} className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all font-bold text-xs ${chartType === item.type ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'}`}>
                      <item.icon className="h-5 w-5" /> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Metrics</p>
                  <span className="font-mono text-xs font-bold text-slate-600">{selectedMetrics.length}/6</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {ALL_METRICS.map(m => {
                    const isSelected = selectedMetrics.includes(m);
                    return (
                      <Badge key={m} onClick={() => toggleMetric(m)} style={{ borderColor: isSelected ? METRIC_COLORS[m] : 'rgba(255,255,255,0.1)', color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)', backgroundColor: isSelected ? `${METRIC_COLORS[m]}20` : 'transparent' }} className={`cursor-pointer px-3 py-1.5 font-black text-[10px] transition-all duration-300 border hover:scale-105 ${isSelected ? 'shadow-[0_0_10px_-2px_var(--tw-shadow-color)]' : 'hover:border-white/30'}`}>
                        {formatMetricLabel(m)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl rounded-3xl p-5 relative z-30">
            <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
              <PlayerSearchCombo players={allPlayers} onSelect={handleAddPlayer} excludeIds={selectedPlayerIds} />
              
              <div className="flex flex-wrap gap-4 items-center flex-1">
                {selectedPlayerIds.map((id, index) => {
                  const player = allPlayers.find(p => p.id === id);
                  if (!player) return null;
                  const playerColor = PLAYER_COLORS[index % PLAYER_COLORS.length];
                  
                  return (
                    <div key={id} style={{ borderColor: chartType !== 'bar' ? `${playerColor}50` : 'rgba(255,255,255,0.1)' }} className="flex items-center gap-4 bg-[#0a0f18] border rounded-full pl-2 pr-6 py-2 group transition-all hover:bg-white/5 shadow-xl shadow-black/30 animate-in fade-in zoom-in-50">
                      <Avatar className="h-16 w-16 border-4 shadow-2xl bg-white" style={{ borderColor: chartType !== 'bar' ? playerColor : '#020617' }}>
                        <AvatarImage src={player.imageUrl} className="object-cover" loading="eager" />
                        <AvatarFallback className="bg-slate-800 text-xs font-bold text-slate-400">{player.name_short.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col"><span className="text-base font-extrabold text-white leading-tight">{player.name_short}</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{player.teamId} · #{player.id}</span></div>
                      <button onClick={() => handleRemovePlayer(id)} className="ml-2 p-1.5 rounded-full bg-white/5 text-slate-600 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 group-hover:scale-110"><X className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="bg-[#0a0f18] border border-white/5 backdrop-blur-xl shadow-2xl rounded-[3rem] overflow-hidden relative z-10">
            <div className="absolute top-7 left-8 flex items-center gap-2.5 z-10 bg-[#0a0f18]/80 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
               <Activity className="h-4 w-4 text-blue-500" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Quantum Visualization Engine</span>
            </div>
            <div className="h-[580px] w-full p-8 pt-24 relative z-0">
              {renderChart()}
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-8">
        <div className="flex items-center gap-3 mb-6 px-2">
          <History className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Data Science Repository</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DICTIONARY.map((dict, i) => (
            <Card 
              key={i} 
              onClick={() => { setModalTeamFilter("all"); setModalConfFilter("all"); setStrictQualifiers(true); setSelectedMetricModal(dict); }}
              className="bg-white/[0.02] border border-white/5 backdrop-blur-xl hover:bg-white/5 hover:border-white/20 transition-all duration-300 group rounded-3xl cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10"
            >
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-600/20 text-blue-400 font-black text-sm px-4 py-1.5 border border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                    {dict.abbr}
                  </Badge>
                  <Brain className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1 group-hover:text-blue-300 transition-colors">{dict.name}</h3>
                </div>
                <p className="text-sm text-slate-400 font-medium leading-relaxed border-t border-white/5 pt-4">
                  {dict.desc}
                </p>
                <div className="pt-4 flex items-center gap-2 text-blue-500/0 group-hover:text-blue-400 transition-all duration-300 font-black text-[10px] uppercase tracking-widest">
                  Explore Rankings & Formula <ArrowUpRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
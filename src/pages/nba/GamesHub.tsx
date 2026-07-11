import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Flame, ArrowUpCircle, ArrowDownCircle, Target, Users, HelpCircle, 
  Grid, RefreshCw, CheckCircle2, XCircle, ArrowLeft, Zap, Sparkles, FileQuestion, 
  ListOrdered, UserX, Link, Map, Search, Crosshair
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { nbaService } from "@/services/sports/nbaService";
import { Loader2 } from "lucide-react";

// --- IMPORTACIÓN DE MÓDULOS QUANT (NUEVOS MINIJUEGOS) ---
import SpotTheFake from "@/components/SpotTheFake";
import DraftReDo from "@/components/DraftReDo";
import BlindResume from "@/components/BlindResume";
import ShotChartDetective from "@/components/ShotChartDetective";
import TargetX from "@/components/TargetX";
import TeammateChain from "@/components/TeammateChain";

// ─── CONFIGURACIÓN E INGESTA DE DATOS ─────────────────────────────────────────
const GAME_MODES = [
  { id: "menu", title: "Arena Selection", desc: "", icon: Sparkles, category: "system" },
  { id: "higher_lower", title: "Higher or Lower", desc: "Adivina la línea o compara dos jugadores a lo grande.", icon: Trophy, category: "arcade" },
  { id: "sorter", title: "The Sorter", desc: "Ordena 5 jugadores. Confirma cuando estés seguro.", icon: ListOrdered, category: "arcade" },
  { id: "spot_fake", title: "Spot the Fake", desc: "Detecta la estadística inventada entre 4 reales.", icon: UserX, category: "arcade" },
  { id: "shot_chart", title: "Shot Chart Detective", desc: "Adivina el jugador basándote en su mapa de tiro ciego.", icon: Map, category: "arcade" },
  { id: "salary_cap", title: "Salary Cap GM", desc: "Precios y objetivos dinámicos. Arma el quinteto perfecto.", icon: Users, category: "gm" },
  { id: "target_x", title: "The Target X", desc: "Acércate al objetivo estadístico fichando a ciegas.", icon: Target, category: "gm" },
  { id: "blind_resume", title: "Blind Resumé", desc: "Dos perfiles estadísticos anónimos. ¿A quién fichas?", icon: FileQuestion, category: "gm" },
  { id: "draft_redo", title: "Draft ReDo", desc: "Re-ordena a los jugadores según su valor real histórico.", icon: Crosshair, category: "gm" },
  { id: "mystery", title: "Mystery Player", desc: "Adivina el jugador oculto mediante pistas cruzadas.", icon: HelpCircle, category: "daily" },
  { id: "grid", title: "Immaculate Grid", desc: "Cuadrícula 3x3: Cruza divisiones y estadísticas.", icon: Grid, category: "daily" },
  { id: "teammate_chain", title: "Teammate Chain", desc: "Encuentra jugadores activos que cumplan los requisitos.", icon: Link, category: "daily" },
];

const STAT_TYPES = [
  { key: "pts", label: "Puntos (PPG)" },
  { key: "ast", label: "Asistencias (APG)" },
  { key: "reb", label: "Rebotes (RPG)" },
  { key: "fg3_pct", label: "Triples (%)" },
  { key: "stl", label: "Robos (SPG)" },
  { key: "blk", label: "Tapones (BPG)" }
];

// Normalizador infalible para la API
const normalizeStats = (player: any) => {
  const s = player.stats || {};
  return {
    ...player,
    nStats: {
      pts: Number(s.pts || s.points || s.ppg || 0),
      reb: Number(s.reb || s.rebounds || s.trb || 0),
      ast: Number(s.ast || s.assists || s.apg || 0),
      stl: Number(s.stl || s.steals || s.spg || 0),
      blk: Number(s.blk || s.blocks || s.bpg || 0),
      fg3_pct: Number(s.fg3_pct || s.three_point_percentage || 0)
    },
    price: Math.floor((Number(s.pts || 0) * 1.5) + (Number(s.reb || 0) * 1.2) + (Number(s.ast || 0) * 1.5)),
    age: player.age || Math.floor(Math.random() * 15) + 20, // Fallback si la API no da edad
    conf: player.teamId ? (['BOS','NYK','PHI','MIL','CLE','IND','MIA','ORL','CHI','BKN','ORL','TOR','TOR','WAS','DET','CHA'].includes(player.teamId) ? 'East' : 'West') : 'West'
  };
};

export default function GamesHub() {
  const [activeMode, setActiveMode] = useState<string>("menu");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState("2025-26");
  const [globalScore, setGlobalScore] = useState(0);

  useEffect(() => {
    setLoading(true);
    nbaService.fetchAllOfficialPlayers(season).then(p => {
      let normalized = p.map(normalizeStats).filter(pl => pl.nStats.pts > 5); // Solo jugadores relevantes
      if (normalized.length < 20) {
        // Mock profundo por si la API falla
        normalized = Array.from({length: 50}).map((_,i) => ({
          id: `${i}`, name: `Player ${i}`, team: "NBA", imageUrl: `https://i.pravatar.cc/150?u=${i}`,
          nStats: { pts: 10+i%20, reb: 5+i%8, ast: 3+i%6, fg3_pct: 35+i%10, stl: 1, blk: 0.5 },
          price: 20 + i, age: 20 + (i%15), conf: i%2===0?'East':'West'
        }));
      }
      setPlayers(normalized);
      setLoading(false);
    });
  }, [season]);

  const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const getStat = () => getRandom(STAT_TYPES);

  // ============================================================================
  // 1. HIGHER OR LOWER 
  // ============================================================================
  const [hlMode, setHlMode] = useState<"line" | "vs">("vs");
  const [hlState, setHlState] = useState<any>(null);

  const initHigherLower = () => {
    const pA = getRandom(players);
    const stat = getStat();
    const valA = pA.nStats[stat.key];

    if (hlMode === "line") {
      const offset = valA * 0.15 * (Math.random() > 0.5 ? 1 : -1);
      let line = Number((valA + offset).toFixed(1));
      if (line === valA) line += 0.5;
      setHlState({ type: "line", pA, stat, line, realValue: valA, revealed: false, result: null });
    } else {
      let pB = getRandom(players);
      while (pB.id === pA.id || pB.nStats[stat.key] === valA) pB = getRandom(players);
      setHlState({ type: "vs", pA, pB, stat, valA, valB: pB.nStats[stat.key], revealed: false, result: null });
    }
  };

  const handleHlGuess = (guess: string) => {
    let isCorrect = false;
    if (hlState.type === "line") isCorrect = (guess === "over" && hlState.realValue > hlState.line) || (guess === "under" && hlState.realValue < hlState.line);
    else isCorrect = (guess === "pA" && hlState.valA > hlState.valB) || (guess === "pB" && hlState.valB > hlState.valA);
    
    setHlState({ ...hlState, revealed: true, result: isCorrect ? "correct" : "wrong" });
    if (isCorrect) {
      setGlobalScore(s => s + 1);
      setTimeout(initHigherLower, 2500);
    }
  };

  // ============================================================================
  // 2. THE SORTER 
  // ============================================================================
  const [sorterState, setSorterState] = useState<any>(null);
  
  const initSorter = () => {
    const stat = getStat();
    const pool = [...players].sort(() => 0.5 - Math.random()).slice(0, 5);
    const correctOrder = [...pool].sort((a, b) => b.nStats[stat.key] - a.nStats[stat.key]);
    setSorterState({ stat, pool, correctOrder, slots: [], status: "playing" });
  };

  const addToSorter = (p: any) => {
    if (sorterState.slots.length < 5 && !sorterState.slots.find((x:any)=>x.id===p.id)) {
      setSorterState({ ...sorterState, slots: [...sorterState.slots, p] });
    }
  };
  const removeFromSorter = (p: any) => {
    setSorterState({ ...sorterState, slots: sorterState.slots.filter((x:any)=>x.id!==p.id) });
  };

  const checkSorter = () => {
    const isPerfect = sorterState.slots.every((p:any, i:number) => p.id === sorterState.correctOrder[i].id);
    setSorterState({ ...sorterState, status: isPerfect ? "won" : "lost" });
    if (isPerfect) setGlobalScore(s => s + 5);
  };

  // ============================================================================
  // 3. SALARY CAP GM
  // ============================================================================
  const [capState, setCapState] = useState<any>(null);

  const initSalaryCap = () => {
    const stat = getStat();
    const budget = Math.floor(Math.random() * 100) + 150; 
    const target = Math.floor(budget * (Math.random() * 0.3 + 0.4)); 
    setCapState({ stat, budget, target, selected: [], status: "drafting", total: 0, cost: 0 });
  };

  const toggleCapPlayer = (p: any) => {
    if (capState.status !== "drafting") return;
    const exists = capState.selected.find((x:any) => x.id === p.id);
    let newSel = exists ? capState.selected.filter((x:any) => x.id !== p.id) : [...capState.selected, p];
    if (newSel.length > 5) return;
    setCapState({ ...capState, selected: newSel, cost: newSel.reduce((s:number,x:any)=>s+x.price,0) });
  };

  const submitCap = () => {
    const total = capState.selected.reduce((s:number,x:any)=>s+x.nStats[capState.stat.key],0);
    const won = capState.cost <= capState.budget && total >= capState.target;
    setCapState({ ...capState, status: "submitted", total, won });
  };

  // ============================================================================
  // 4. IMMACULATE GRID
  // ============================================================================
  const [gridState, setGridState] = useState<any>(null);

  const initGrid = () => {
    const cols = [{ label: "East Conf", filter: (p:any)=>p.conf==="East" }, { label: "> 25 PPG", filter: (p:any)=>p.nStats.pts>25 }, { label: "> 8 AST", filter: (p:any)=>p.nStats.ast>8 }];
    const rows = [{ label: "West Conf", filter: (p:any)=>p.conf==="West" }, { label: "> 10 REB", filter: (p:any)=>p.nStats.reb>10 }, { label: "Under 25 Yrs", filter: (p:any)=>p.age<25 }];
    setGridState({ cols, rows, cells: Array(9).fill(null), activeCell: null, search: "" });
  };

  const guessGrid = (p: any) => {
    const { activeCell, cols, rows, cells } = gridState;
    const cIdx = activeCell % 3;
    const rIdx = Math.floor(activeCell / 3);
    const isValid = cols[cIdx].filter(p) && rows[rIdx].filter(p);
    
    let newCells = [...cells];
    newCells[activeCell] = isValid ? p : "WRONG";
    setGridState({ ...gridState, cells: newCells, activeCell: null, search: "" });
  };

  // ============================================================================
  // 5. MYSTERY PLAYER
  // ============================================================================
  const [mysteryState, setMysteryState] = useState<any>(null);

  const initMystery = () => {
    const target = getRandom(players.filter(p => p.nStats.pts > 15));
    setMysteryState({ target, guesses: [], search: "", won: false });
  };

  const guessMystery = (p: any) => {
    setMysteryState({ ...mysteryState, guesses: [p, ...mysteryState.guesses], search: "", won: p.id === mysteryState.target.id });
  };

  // ============================================================================
  // ROUTER INTERNO
  // ============================================================================
  const launchGame = (id: string) => {
    setActiveMode(id);
    if (id === "higher_lower") { setGlobalScore(0); initHigherLower(); }
    if (id === "sorter") { setGlobalScore(0); initSorter(); }
    if (id === "salary_cap") initSalaryCap();
    if (id === "grid") initGrid();
    if (id === "mystery") initMystery();
    // spot_fake, draft_redo, blind_resume, shot_chart, target_x, teammate_chain gestionan su propio estado al montarse
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin text-cyan-500" /></div>;

  return (
    <div className="max-w-[1600px] mx-auto px-4 pb-32 pt-6 font-sans select-none text-white">
      
      {/* 👑 HEADER GIGANTE */}
      <div className="flex items-center justify-between bg-[#0a0f18]/90 backdrop-blur-3xl border border-white/[0.1] p-6 rounded-[2rem] mb-10 shadow-2xl">
        <div className="flex items-center gap-6">
          {activeMode !== "menu" && (
            <Button onClick={() => setActiveMode("menu")} className="rounded-full bg-white/10 hover:bg-white/20 h-14 w-14 p-0"><ArrowLeft className="w-6 h-6" /></Button>
          )}
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3"><Zap className="text-cyan-400 w-10 h-10" /> NUSE ARENA</h1>
          </div>
        </div>
        {activeMode !== "menu" && (
          <div className="bg-cyan-950/50 border border-cyan-500/30 px-6 py-3 rounded-2xl">
            <span className="text-sm font-black uppercase text-cyan-400">Score: <span className="text-2xl ml-2 text-white">{globalScore}</span></span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==================== VISTA: MENÚ ==================== */}
        {activeMode === "menu" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
            {['arcade', 'gm', 'daily'].map(category => (
              <div key={category}>
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-4">
                  {category === 'arcade' ? 'Arcade' : category === 'gm' ? 'General Manager' : 'Diarios'}
                  <div className="h-px bg-slate-800 flex-1"></div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {GAME_MODES.filter(m => m.category === category).map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <Card key={mode.id} onClick={() => launchGame(mode.id)} className="group bg-[#0a0f18]/60 border-white/[0.08] rounded-[2rem] p-8 hover:bg-[#0c1424] hover:border-cyan-500/50 transition-all cursor-pointer shadow-xl">
                        <div className="flex items-center gap-5 mb-4">
                          <div className="p-4 bg-white/5 rounded-2xl text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all"><Icon className="w-8 h-8" /></div>
                          <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-cyan-400">{mode.title}</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{mode.desc}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ==================== VISTAS: JUEGOS INTERNOS ==================== */}
        
        {activeMode === "higher_lower" && hlState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1400px] mx-auto">
            <div className="flex justify-center mb-8 gap-4">
              <Button onClick={() => { setHlMode("vs"); initHigherLower(); }} variant={hlMode==="vs"?"default":"outline"} className="h-12 uppercase font-black">Vs Jugador</Button>
              <Button onClick={() => { setHlMode("line"); initHigherLower(); }} variant={hlMode==="line"?"default":"outline"} className="h-12 uppercase font-black">Vs Línea</Button>
            </div>

            {hlState.result === "wrong" && (
              <Card className="bg-rose-950/30 border-rose-500/50 p-12 text-center rounded-[3rem] mb-8">
                <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6" />
                <h2 className="text-5xl font-black uppercase mb-4">¡Racha Rota!</h2>
                <Button onClick={() => { setGlobalScore(0); initHigherLower(); }} className="bg-white text-black font-black uppercase h-16 px-12 text-xl rounded-2xl mt-4">Reintentar</Button>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <Card className="bg-[#0a0f18]/80 border-white/10 p-10 rounded-[3rem] text-center relative shadow-2xl">
                <div className="w-64 h-64 mx-auto bg-slate-800 rounded-full border-8 border-cyan-500/30 overflow-hidden mb-8 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                  <img src={hlState.pA.imageUrl} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-4xl font-black uppercase truncate">{hlState.pA.name}</h2>
                <div className="text-7xl font-black text-cyan-400 font-mono mt-6">{hlState.valA}</div>
                <div className="text-slate-500 font-black uppercase tracking-widest mt-2">{hlState.stat.label}</div>
              </Card>

              <Card className="bg-[#0a0f18]/80 border-white/10 p-10 rounded-[3rem] text-center shadow-2xl flex flex-col justify-center min-h-[600px]">
                {hlState.type === "line" ? (
                  <>
                    <h2 className="text-3xl font-black uppercase text-slate-400 mb-8">Línea de Vegas</h2>
                    <div className="text-8xl font-black text-white font-mono bg-black/50 py-12 rounded-[2rem] border border-white/5 mb-12">{hlState.line}</div>
                    
                    {!hlState.revealed && (
                      <div className="grid grid-cols-2 gap-6">
                        <Button onClick={() => handleHlGuess("over")} className="bg-emerald-600 hover:bg-emerald-500 h-24 text-2xl font-black uppercase rounded-2xl"><ArrowUpCircle className="mr-3 w-8 h-8"/> Over</Button>
                        <Button onClick={() => handleHlGuess("under")} className="bg-rose-600 hover:bg-rose-500 h-24 text-2xl font-black uppercase rounded-2xl"><ArrowDownCircle className="mr-3 w-8 h-8"/> Under</Button>
                      </div>
                    )}
                    {hlState.revealed && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`text-8xl font-black font-mono ${hlState.result === "correct" ? "text-emerald-400" : "text-rose-500"}`}>
                        {hlState.realValue}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-64 h-64 mx-auto bg-slate-800 rounded-full border-8 border-white/10 overflow-hidden mb-8">
                      <img src={hlState.pB.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-4xl font-black uppercase truncate">{hlState.pB.name}</h2>
                    
                    <div className="h-32 flex items-center justify-center my-4">
                      {hlState.revealed ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`text-7xl font-black font-mono ${hlState.result === "correct" ? "text-emerald-400" : "text-rose-500"}`}>
                          {hlState.valB}
                        </motion.div>
                      ) : (
                        <div className="text-slate-700 text-8xl font-black font-mono">???</div>
                      )}
                    </div>

                    {!hlState.revealed && (
                      <div className="grid grid-cols-2 gap-6">
                        <Button onClick={() => handleHlGuess("pB")} className="bg-cyan-600 hover:bg-cyan-500 h-20 text-xl font-black uppercase rounded-2xl">Tiene Más</Button>
                        <Button onClick={() => handleHlGuess("pA")} className="bg-slate-700 hover:bg-slate-600 h-20 text-xl font-black uppercase rounded-2xl">Tiene Menos</Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {activeMode === "sorter" && sorterState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black uppercase mb-2">Ordena de Mayor a Menor</h2>
              <Badge className="bg-cyan-500 text-black text-lg px-6 py-2 uppercase font-black">{sorterState.stat.label}</Badge>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-12">
              {Array(5).fill(0).map((_, i) => {
                const p = sorterState.slots[i];
                return (
                  <Card key={i} onClick={() => p && removeFromSorter(p)} className="aspect-[3/4] bg-[#0a0f18] border-dashed border-2 border-white/20 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 relative overflow-hidden">
                    <div className="absolute top-2 left-3 text-white/20 font-black text-2xl">#{i+1}</div>
                    {p ? (
                      <>
                        <img src={p.imageUrl} className="w-full h-full object-cover absolute inset-0 opacity-80" />
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-4 pb-2 text-center text-sm font-black truncate">{p.name}</div>
                      </>
                    ) : <span className="text-slate-600 font-black uppercase">Vacío</span>}
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center gap-6 mb-12 flex-wrap">
              {sorterState.pool.map((p:any) => {
                if (sorterState.slots.find((x:any)=>x.id===p.id)) return null;
                return (
                  <div key={p.id} onClick={() => addToSorter(p)} className="w-32 cursor-pointer hover:-translate-y-2 transition-transform text-center">
                    <img src={p.imageUrl} className="w-32 h-32 object-cover rounded-full border-4 border-white/10 bg-slate-800 shadow-xl mb-3" />
                    <div className="text-xs font-black uppercase">{p.name}</div>
                  </div>
                );
              })}
            </div>

            {sorterState.status === "playing" ? (
              <div className="text-center">
                <Button onClick={checkSorter} disabled={sorterState.slots.length < 5} className="h-16 px-12 text-xl font-black uppercase bg-cyan-500 text-black rounded-2xl">Confirmar Orden</Button>
              </div>
            ) : (
              <Card className={`p-8 text-center rounded-[2rem] ${sorterState.status === "won" ? 'bg-emerald-950/50 border-emerald-500' : 'bg-rose-950/50 border-rose-500'}`}>
                <h3 className="text-4xl font-black uppercase mb-6">{sorterState.status === "won" ? '¡Perfecto!' : '¡Error!'}</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {sorterState.correctOrder.map((p:any, i:number) => (
                    <Badge key={i} className="text-lg bg-black/50 py-2 px-4 border border-white/10">{i+1}. {p.name} <span className="text-cyan-400 ml-2">{p.nStats[sorterState.stat.key]}</span></Badge>
                  ))}
                </div>
                <Button onClick={initSorter} className="mt-8 bg-white text-black font-black uppercase h-14 px-8">Jugar de Nuevo</Button>
              </Card>
            )}
          </motion.div>
        )}

        {activeMode === "salary_cap" && capState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="bg-cyan-950/30 border border-cyan-500/50 p-6 rounded-[2rem] mb-6">
                <h3 className="text-cyan-400 font-black uppercase text-sm mb-2">Tu Misión GM</h3>
                <p className="text-2xl font-black">Consigue <span className="text-white bg-black px-3 py-1 rounded-lg">{capState.target} {capState.stat.label}</span></p>
                <p className="text-2xl font-black mt-2">Presupuesto: <span className="text-emerald-400">${capState.budget}M</span></p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2">
                {players.slice(0,30).map((p:any) => {
                  const isSelected = capState.selected.find((x:any)=>x.id===p.id);
                  return (
                    <Card key={p.id} onClick={() => toggleCapPlayer(p)} className={`p-4 cursor-pointer text-center relative ${isSelected?'bg-cyan-900/50 border-cyan-500':'bg-[#0a0f18]/60 hover:bg-white/10'}`}>
                      {capState.status==="submitted" && <div className="absolute top-2 left-2 text-xs font-black text-cyan-400">{p.nStats[capState.stat.key]}</div>}
                      <img src={p.imageUrl} className="w-16 h-16 mx-auto rounded-full bg-slate-800 object-cover mb-2" />
                      <div className="text-xs font-black truncate">{p.name}</div>
                      <div className="text-emerald-400 font-mono font-black mt-1">${p.price}M</div>
                    </Card>
                  )
                })}
              </div>
            </div>

            <Card className="bg-[#0a0f18]/80 border-white/10 p-8 rounded-[3rem]">
              <h2 className="text-2xl font-black uppercase mb-6">Tu Quinteto</h2>
              <div className="space-y-4 mb-8 min-h-[350px]">
                {capState.selected.map((p:any) => (
                  <div key={p.id} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={p.imageUrl} className="w-12 h-12 object-cover rounded-xl bg-slate-800" />
                      <span className="font-black text-lg">{p.name}</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-black text-xl">${p.price}M</span>
                  </div>
                ))}
                {Array(5 - capState.selected.length).fill(0).map((_,i) => (
                  <div key={i} className="border-2 border-dashed border-white/10 h-[76px] rounded-2xl flex items-center justify-center text-slate-600 font-black uppercase">Ranura Vacía</div>
                ))}
              </div>
              
              <div className="flex justify-between items-end mb-6 font-mono">
                <div><div className="text-slate-500 text-xs">Gasto</div><div className={`text-4xl font-black ${capState.cost>capState.budget?'text-rose-500':'text-emerald-400'}`}>${capState.cost}M</div></div>
                {capState.status === "submitted" && <div className="text-right"><div className="text-slate-500 text-xs">Producción</div><div className="text-4xl font-black text-cyan-400">{capState.total}</div></div>}
              </div>

              {capState.status === "submitted" ? (
                <div className={`p-6 rounded-2xl text-center font-black uppercase text-2xl ${capState.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'}`}>
                  {capState.won ? '¡Misión Cumplida!' : '¡Despedido!'}
                  <Button onClick={initSalaryCap} className="w-full mt-4 bg-white text-black">Nuevo Reto</Button>
                </div>
              ) : (
                <Button disabled={capState.selected.length !== 5} onClick={submitCap} className="w-full h-16 text-xl font-black uppercase bg-cyan-500 text-black">Simular Temporada</Button>
              )}
            </Card>
          </motion.div>
        )}

        {activeMode === "mystery" && mysteryState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-black uppercase mb-8">¿Quién es el jugador?</h2>
            
            {!mysteryState.won && (
              <div className="mb-8 relative max-w-md mx-auto">
                <Search className="absolute left-4 top-4 text-slate-400" />
                <input 
                  type="text" value={mysteryState.search} onChange={e=>setMysteryState({...mysteryState, search: e.target.value})}
                  className="w-full bg-[#1e293b] h-14 rounded-2xl pl-12 pr-4 text-lg font-black text-white outline-none border border-white/10 focus:border-cyan-500"
                  placeholder="Escribe un jugador..."
                />
                {mysteryState.search.length > 2 && (
                  <div className="absolute top-16 w-full bg-black/90 border border-white/10 rounded-xl overflow-hidden z-50 text-left">
                    {players.filter(p=>p.name.toLowerCase().includes(mysteryState.search.toLowerCase())).slice(0,5).map(p => (
                      <div key={p.id} onClick={() => guessMystery(p)} className="p-4 hover:bg-white/10 cursor-pointer flex items-center gap-4">
                        <img src={p.imageUrl} className="w-8 h-8 rounded-full object-cover" /> <span className="font-black">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-xs font-black uppercase text-slate-500 px-4">
                <span>Jugador</span><span>Conf</span><span>Edad</span><span>Pts</span>
              </div>
              {mysteryState.guesses.map((g:any, i:number) => {
                return (
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={i} className="grid grid-cols-4 gap-4 items-center bg-[#0a0f18] border border-white/10 p-3 rounded-2xl">
                    <div className="flex items-center gap-3"><img src={g.imageUrl} className="w-12 h-12 object-cover rounded-full border border-white/20"/> <span className="font-black truncate">{g.name}</span></div>
                    <Badge className={`justify-center ${g.conf === mysteryState.target.conf ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'}`}>{g.conf}</Badge>
                    <Badge className={`justify-center ${g.age === mysteryState.target.age ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>{g.age} {g.age < mysteryState.target.age ? '↑' : g.age > mysteryState.target.age ? '↓' : ''}</Badge>
                    <Badge className={`justify-center ${Math.abs(g.nStats.pts - mysteryState.target.nStats.pts) < 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'}`}>{g.nStats.pts}</Badge>
                  </motion.div>
                )
              })}
            </div>
            
            {mysteryState.won && (
              <div className="mt-12 bg-emerald-950/30 border border-emerald-500 p-8 rounded-3xl">
                <h3 className="text-3xl font-black uppercase text-emerald-400 mb-4">¡LO ENCONTRASTE!</h3>
                <img src={mysteryState.target.imageUrl} className="w-48 h-48 mx-auto rounded-full object-cover border-8 border-emerald-500/50 mb-6" />
                <Button onClick={initMystery} className="bg-white text-black font-black uppercase h-14 px-8">Jugar de Nuevo</Button>
              </div>
            )}
          </motion.div>
        )}

        {activeMode === "grid" && gridState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black uppercase text-center mb-10">Immaculate Grid</h2>
            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div></div>
              {gridState.cols.map((c:any, i:number) => <div key={i} className="text-center font-black uppercase text-cyan-400 bg-cyan-950/30 p-4 rounded-xl flex items-center justify-center">{c.label}</div>)}
              
              {gridState.rows.map((r:any, rIdx:number) => (
                <div key={rIdx} className="contents">
                  <div className="text-center font-black uppercase text-cyan-400 bg-cyan-950/30 p-4 rounded-xl flex items-center justify-center">{r.label}</div>
                  {Array(3).fill(0).map((_, cIdx) => {
                    const idx = rIdx * 3 + cIdx;
                    const cell = gridState.cells[idx];
                    return (
                      <Card key={idx} onClick={() => setGridState({...gridState, activeCell: idx})} className="aspect-square bg-[#0a0f18] hover:bg-white/5 cursor-pointer flex items-center justify-center relative border-white/10 overflow-hidden">
                        {cell === "WRONG" ? <XCircle className="w-12 h-12 text-rose-500" /> : 
                         cell ? <img src={cell.imageUrl} className="w-full h-full object-cover opacity-80" /> : 
                         <span className="text-white/20 font-black text-2xl">+</span>}
                      </Card>
                    )
                  })}
                </div>
              ))}
            </div>

            {gridState.activeCell !== null && (
               <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                 <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-lg">
                   <h3 className="text-xl font-black uppercase mb-4">Selecciona un Jugador</h3>
                   <input type="text" autoFocus value={gridState.search} onChange={e=>setGridState({...gridState, search: e.target.value})} className="w-full bg-black h-14 rounded-xl px-4 text-white font-black mb-4 border border-white/20" placeholder="Buscar..." />
                   <div className="max-h-64 overflow-y-auto space-y-2">
                     {players.filter(p=>p.name.toLowerCase().includes(gridState.search.toLowerCase())).slice(0,10).map(p => (
                       <div key={p.id} onClick={()=>guessGrid(p)} className="p-3 bg-white/5 hover:bg-cyan-500/20 cursor-pointer rounded-xl flex items-center gap-4">
                         <img src={p.imageUrl} className="w-10 h-10 object-cover rounded-full" />
                         <span className="font-black">{p.name}</span>
                       </div>
                     ))}
                   </div>
                   <Button onClick={()=>setGridState({...gridState, activeCell: null})} variant="ghost" className="mt-4 w-full text-slate-400">Cancelar</Button>
                 </div>
               </div>
            )}
          </motion.div>
        )}

        {/* ==================== VISTAS: NUEVOS MÓDULOS MODULARES ==================== */}
        
        {activeMode === "spot_fake" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <SpotTheFake />
          </motion.div>
        )}

        {activeMode === "draft_redo" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <DraftReDo />
          </motion.div>
        )}

        {activeMode === "blind_resume" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <BlindResume />
          </motion.div>
        )}

        {activeMode === "shot_chart" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <ShotChartDetective />
          </motion.div>
        )}

        {activeMode === "target_x" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <TargetX />
          </motion.div>
        )}

        {activeMode === "teammate_chain" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <TeammateChain />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
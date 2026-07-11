import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Search, CheckCircle2, XCircle, ArrowRightLeft, ShieldCheck, RefreshCcw, HelpCircle, ChevronRight } from 'lucide-react';

// --- Interfaces ---
interface PlayerNode {
  id: string;
  name: string;
  imageUrl: string;
  teams: string[];
}

interface ChainPuzzle {
  id: number;
  startNode: PlayerNode;
  endNode: PlayerNode;
  validLinks: string[]; // Nombres aceptados como respuesta correcta
  insight: string;
}

// --- Base de Datos MOCK (Puzzles de Conexión) ---
const PUZZLES: ChainPuzzle[] = [
  {
    id: 1,
    startNode: { id: 's1', name: 'Stephen Curry', imageUrl: 'https://i.pravatar.cc/150?u=curry', teams: ['GSW'] },
    endNode: { id: 'e1', name: 'LeBron James', imageUrl: 'https://i.pravatar.cc/150?u=lebron', teams: ['CLE', 'MIA', 'LAL'] },
    validLinks: ["javale mcgee", "d'angelo russell", "quinn cook", "kent bazemore", "damion lee", "juan toscano-anderson"],
    insight: "JaVale McGee ganó anillos con Curry (GSW) y con LeBron (LAL). D'Angelo Russell fue drafteado por LAL, traspasado a GSW y devuelto a LAL."
  },
  {
    id: 2,
    startNode: { id: 's2', name: 'Luka Doncic', imageUrl: 'https://i.pravatar.cc/150?u=luka', teams: ['DAL'] },
    endNode: { id: 'e2', name: 'Devin Booker', imageUrl: 'https://i.pravatar.cc/150?u=booker', teams: ['PHX'] },
    validLinks: ["ricky rubio", "javale mcgee", "isaiah thomas", "richaun holmes", "troy daniels", "cameron payne"],
    insight: "Ricky Rubio fue el base titular de Booker en Phoenix antes de pasar por Dallas en el ecosistema de Luka. Cameron Payne también cruzó ambos vestuarios."
  },
  {
    id: 3,
    startNode: { id: 's3', name: 'Nikola Jokic', imageUrl: 'https://i.pravatar.cc/150?u=jokic', teams: ['DEN'] },
    endNode: { id: 'e3', name: 'Joel Embiid', imageUrl: 'https://i.pravatar.cc/150?u=embiid', teams: ['PHI'] },
    validLinks: ["deandre jordan", "jerami grant", "ish smith", "wilson chandler", "paul millsap"],
    insight: "DeAndre Jordan ha sido el pívot suplente de ambos MVPs. Jerami Grant comenzó en 'The Process' de Philly y explotó en Denver junto al Joker."
  }
];

// Mini-base de datos para la barra de búsqueda (simulando una lista global)
const SEARCH_POOL = [
  "JaVale McGee", "D'Angelo Russell", "Quinn Cook", "Kent Bazemore", 
  "Ricky Rubio", "Cameron Payne", "Richaun Holmes", 
  "DeAndre Jordan", "Jerami Grant", "Ish Smith", "Paul Millsap",
  "Kevin Durant", "Kyrie Irving", "James Harden", "Klay Thompson"
];

export default function TeammateChain() {
  const [currentRound, setCurrentRound] = useState(0);
  const [search, setSearch] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [score, setScore] = useState(0);

  const puzzle = PUZZLES[currentRound];

  const handleGuess = (playerName: string) => {
    if (isWon) return;
    if (guesses.includes(playerName)) return; // Ya intentado

    const newGuesses = [playerName, ...guesses];
    setGuesses(newGuesses);
    setSearch("");

    // Evaluar si es el eslabón correcto
    if (puzzle.validLinks.includes(playerName.toLowerCase())) {
      setIsWon(true);
      // Penalización por intentos fallidos: 100 pts - 25 por cada fallo
      const earned = Math.max(25, 100 - (guesses.length * 25));
      setScore(s => s + earned);
    }
  };

  const nextPuzzle = () => {
    if (currentRound < PUZZLES.length - 1) {
      setCurrentRound(r => r + 1);
      setGuesses([]);
      setIsWon(false);
      setSearch("");
    } else {
      // Reiniciar juego
      setCurrentRound(0);
      setGuesses([]);
      setIsWon(false);
      setScore(0);
      setSearch("");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-end mb-12 pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 tracking-tight flex items-center gap-3">
            <Link className="w-8 h-8 text-emerald-400" />
            TEAMMATE CHAIN
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            ENCUENTRA EL ESLABÓN PERDIDO // PUZZLE {currentRound + 1}/{PUZZLES.length}
          </p>
        </div>
        <div className="font-mono flex flex-col items-end">
          <span className="text-xs text-slate-500">IQ SCORE</span>
          <span className="text-2xl font-bold text-emerald-400">{score} <span className="text-sm text-slate-600">PTS</span></span>
        </div>
      </header>

      {/* La Cadena (Visualización del Grafo) */}
      <div className="relative mb-16 px-4">
        {/* Línea conectora de fondo */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0"></div>
        
        {/* Enlace animado si se gana */}
        {isWon && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-500 -translate-y-1/2 z-0 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
          />
        )}

        <div className="flex justify-between items-center relative z-10">
          {/* Nodo A */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-700 bg-slate-900 overflow-hidden shadow-xl">
              <img src={puzzle.startNode.imageUrl} alt={puzzle.startNode.name} className="w-full h-full object-cover opacity-90" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-black text-slate-200 uppercase tracking-tight">{puzzle.startNode.name}</h3>
              <div className="flex gap-1 justify-center mt-1">
                {puzzle.startNode.teams.map(t => (
                  <span key={t} className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Nodo Intermedio (El eslabón) */}
          <div className="flex flex-col items-center -mt-8">
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center bg-[#0a0f18] transition-colors duration-500 ${isWon ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 'border-dashed border-slate-600 shadow-inner'}`}>
              {isWon ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center w-full px-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                  <span className="font-black text-white text-xs md:text-sm uppercase leading-tight truncate w-full block">
                    {guesses[0]}
                  </span>
                </motion.div>
              ) : (
                <HelpCircle className="w-10 h-10 text-slate-700" />
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-mono font-bold text-slate-500 text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> COMPAÑERO MUTUO
              </h3>
            </div>
          </div>

          {/* Nodo B */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-700 bg-slate-900 overflow-hidden shadow-xl">
              <img src={puzzle.endNode.imageUrl} alt={puzzle.endNode.name} className="w-full h-full object-cover opacity-90" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-black text-slate-200 uppercase tracking-tight">{puzzle.endNode.name}</h3>
              <div className="flex gap-1 justify-center mt-1">
                {puzzle.endNode.teams.map(t => (
                  <span key={t} className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interfaz de Juego: Búsqueda y Resultados */}
      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        
        {/* Buscador */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          {!isWon ? (
            <div className="relative">
              <h3 className="text-sm font-black text-slate-400 font-mono mb-3">INSERTE ESLABÓN:</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 w-6 h-6" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Ej: Kevin Durant"
                  className="w-full h-16 bg-[#0a0f18] border border-emerald-500/30 rounded-xl pl-14 pr-4 text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Autocompletado Mock */}
              {search.length > 1 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-black border border-slate-700 rounded-xl overflow-hidden z-20 shadow-2xl">
                  {SEARCH_POOL.filter(p => p.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map(player => (
                    <button 
                      key={player}
                      onClick={() => handleGuess(player)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-800 text-slate-200 font-bold border-b border-slate-800 last:border-0 transition-colors"
                    >
                      {player}
                    </button>
                  ))}
                  {/* Permitir enter crudo para probar nombres no listados en el pool de ejemplo */}
                  {search.length > 3 && !SEARCH_POOL.some(p => p.toLowerCase() === search.toLowerCase()) && (
                    <button 
                      onClick={() => handleGuess(search)}
                      className="w-full text-left px-5 py-4 bg-slate-900/50 hover:bg-slate-800 text-emerald-400 font-bold transition-colors"
                    >
                      Fichar: "{search}"
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-6 h-full flex flex-col justify-center"
            >
              <h3 className="text-emerald-400 font-black font-mono uppercase flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5" /> CONEXIÓN ESTABLECIDA
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {puzzle.insight}
              </p>
              <button 
                onClick={nextPuzzle}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {currentRound < PUZZLES.length - 1 ? (
                  <>Siguiente Desafío <ChevronRight className="w-5 h-5" /></>
                ) : (
                  <>Completado - Reiniciar <RefreshCcw className="w-5 h-5" /></>
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Historial de Intentos */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-black text-slate-400 font-mono mb-4">REGISTRO DE INTENTOS</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {guesses.map((g, i) => {
                const correct = puzzle.validLinks.includes(g.toLowerCase());
                return (
                  <motion.div 
                    key={g + i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg border flex justify-between items-center font-bold uppercase text-sm
                      ${correct ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-rose-900/10 border-rose-500/30 text-rose-400'}`}
                  >
                    <span className="truncate pr-2">{g}</span>
                    {correct ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  </motion.div>
                )
              })}
              {guesses.length === 0 && (
                <div className="text-slate-600 text-xs font-mono text-center py-8 border-2 border-dashed border-slate-800 rounded-lg">
                  SISTEMA EN ESPERA
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
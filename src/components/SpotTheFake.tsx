import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Activity, Target, Zap, ShieldAlert, BarChart3, RefreshCw, TrendingUp } from 'lucide-react';

// --- Tipos de Datos ---
interface PlayerProfile {
  id: string;
  isReal: boolean;
  realName?: string; // Solo se revela al adivinar
  stats: {
    pts: number;
    trb: number;
    ast: number;
    ts_pct: number; // True Shooting %
    usg_pct: number; // Usage %
    bpm: number; // Box Plus/Minus
  };
}

interface Challenge {
  id: number;
  playerA: PlayerProfile;
  playerB: PlayerProfile;
  insight: string; // Explicación Quant de por qué el falso es falso
}

// --- Base de Datos MOCK (Grado Quant) ---
const CHALLENGES: Challenge[] = [
  {
    id: 1,
    playerA: {
      id: 'A1',
      isReal: true,
      realName: 'Nikola Jokic (23-24)',
      stats: { pts: 26.4, trb: 12.4, ast: 9.0, ts_pct: 65.0, usg_pct: 29.3, bpm: 13.2 }
    },
    playerB: {
      id: 'B1',
      isReal: false,
      realName: 'IA Generada',
      stats: { pts: 32.1, trb: 14.5, ast: 11.2, ts_pct: 72.4, usg_pct: 41.0, bpm: 18.5 }
    },
    insight: "Un USG% del 41% combinado con un TS% del 72% y 11 asistencias es termodinámicamente imposible en la NBA moderna. La fatiga colapsaría la eficiencia."
  },
  {
    id: 2,
    playerA: {
      id: 'A2',
      isReal: false,
      realName: 'IA Generada',
      stats: { pts: 22.5, trb: 4.1, ast: 12.8, ts_pct: 68.9, usg_pct: 18.5, bpm: 8.4 }
    },
    playerB: {
      id: 'B2',
      isReal: true,
      realName: 'Tyrese Haliburton (23-24)',
      stats: { pts: 20.1, trb: 3.9, ast: 10.9, ts_pct: 60.5, usg_pct: 25.4, bpm: 5.6 }
    },
    insight: "El jugador falso tiene 12.8 asistencias con solo un 18.5% de Uso. Un creador de juego principal siempre absorbe más del 22% del USG% simplemente por tener el balón."
  },
  {
    id: 3,
    playerA: {
      id: 'A3',
      isReal: true,
      realName: 'Shai Gilgeous-Alexander (23-24)',
      stats: { pts: 30.1, trb: 5.5, ast: 6.2, ts_pct: 63.6, usg_pct: 32.7, bpm: 8.8 }
    },
    playerB: {
      id: 'B3',
      isReal: false,
      realName: 'IA Generada',
      stats: { pts: 29.5, trb: 5.0, ast: 6.0, ts_pct: 52.1, usg_pct: 31.5, bpm: 9.2 }
    },
    insight: "El jugador falso tiene un TS% mediocre (52.1%) pero un BPM élite (9.2). El BPM penaliza fuertemente el alto volumen de tiro ineficiente."
  }
];

export default function SpotTheFake() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  const challenge = CHALLENGES[currentRound];

  const handleGuess = (player: PlayerProfile) => {
    if (hasGuessed) return;
    
    setSelectedId(player.id);
    setHasGuessed(true);

    if (player.isReal) {
      setScore(s => s + 100 + (streak * 20));
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
  };

  const nextRound = () => {
    if (currentRound < CHALLENGES.length - 1) {
      setCurrentRound(r => r + 1);
      setHasGuessed(false);
      setSelectedId(null);
    } else {
      setIsGameOver(true);
    }
  };

  const restartGame = () => {
    setCurrentRound(0);
    setScore(0);
    setStreak(0);
    setHasGuessed(false);
    setSelectedId(null);
    setIsGameOver(false);
  };

  // --- Subcomponente: Tarjeta de Jugador ---
  const PlayerCard = ({ player }: { player: PlayerProfile }) => {
    const isSelected = selectedId === player.id;
    const showResult = hasGuessed;
    const isCorrect = showResult && player.isReal;
    const isWrong = showResult && isSelected && !player.isReal;

    let borderColor = 'border-slate-700/50 hover:border-cyan-500/50';
    if (showResult) {
      if (player.isReal) borderColor = 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      else if (isSelected) borderColor = 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
      else borderColor = 'border-slate-800 opacity-50';
    }

    return (
      <motion.div
        whileHover={!hasGuessed ? { scale: 1.02, y: -5 } : {}}
        whileTap={!hasGuessed ? { scale: 0.98 } : {}}
        onClick={() => handleGuess(player)}
        className={`relative flex flex-col p-6 bg-slate-900/80 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-300 ${borderColor}`}
      >
        {/* Etiqueta de Revelación */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 ${
                player.isReal ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
              }`}
            >
              {player.isReal ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {player.isReal ? 'PERFIL REAL' : 'FAKE (IA)'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-6 mt-2">
          <h3 className="text-xl font-bold text-slate-100 font-mono">
            {showResult ? player.realName : `Perfil ${player.id.includes('A') ? 'Alfa' : 'Beta'}`}
          </h3>
          <ShieldAlert className="w-5 h-5 text-slate-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatBox icon={<Target />} label="PTS" value={player.stats.pts.toFixed(1)} />
          <StatBox icon={<Activity />} label="TRB" value={player.stats.trb.toFixed(1)} />
          <StatBox icon={<Zap />} label="AST" value={player.stats.ast.toFixed(1)} />
          <StatBox icon={<BarChart3 />} label="TS%" value={`${player.stats.ts_pct.toFixed(1)}%`} highlight={player.stats.ts_pct > 64} />
          <StatBox icon={<BarChart3 />} label="USG%" value={`${player.stats.usg_pct.toFixed(1)}%`} />
          <StatBox icon={<TrendingUp />} label="BPM" value={player.stats.bpm.toFixed(1)} highlight={player.stats.bpm > 8} />
        </div>
      </motion.div>
    );
  };

  // --- Subcomponente: Caja de Estadística ---
  const StatBox = ({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string | number, highlight?: boolean }) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-slate-800/50 border-transparent'}`}>
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
        <span className="text-xs font-semibold tracking-wider">{label}</span>
      </div>
      <div className={`text-lg font-mono font-bold ${highlight ? 'text-cyan-400' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      {/* Header del HUD */}
      <header className="flex flex-wrap justify-between items-end mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
            SPOT THE FAKE
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            ENTRENAMIENTO AUDITORÍA QUANT // RONDA {currentRound + 1}/{CHALLENGES.length}
          </p>
        </div>
        <div className="flex gap-6 mt-4 md:mt-0 font-mono">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">RACHA</span>
            <span className="text-xl font-bold text-amber-400">x{streak}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">PUNTUACIÓN</span>
            <span className="text-xl font-bold text-cyan-400">{score}</span>
          </div>
        </div>
      </header>

      {/* Pantalla de Juego Over */}
      {isGameOver ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800"
        >
          <Activity className="w-16 h-16 text-cyan-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-4xl font-bold text-slate-100 mb-4">SIMULACIÓN COMPLETADA</h2>
          <p className="text-xl text-slate-400 mb-8 font-mono">PUNTUACIÓN FINAL: <span className="text-cyan-400">{score}</span></p>
          <button 
            onClick={restartGame}
            className="flex items-center gap-2 mx-auto px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors font-mono"
          >
            <RefreshCw className="w-5 h-5" />
            REINICIAR SISTEMA
          </button>
        </motion.div>
      ) : (
        /* Arena de Batalla */
        <div className="relative">
          {!hasGuessed && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-950 px-4 py-2 rounded-full border border-slate-800 text-slate-500 font-mono text-sm font-bold tracking-widest hidden md:block">
              VS
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 relative z-0">
            <PlayerCard player={challenge.playerA} />
            <PlayerCard player={challenge.playerB} />
          </div>

          {/* Panel de Resolución / Insight */}
          <AnimatePresence>
            {hasGuessed && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Evaluación del Arquitecto</h4>
                    <p className="text-slate-400 leading-relaxed">
                      {challenge.insight}
                    </p>
                  </div>
                  <button 
                    onClick={nextRound}
                    className="shrink-0 px-6 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-colors font-mono uppercase text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
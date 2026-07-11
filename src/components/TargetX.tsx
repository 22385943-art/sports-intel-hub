import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Users, Calculator, RefreshCcw, ChevronRight, Zap, ArrowDownUp, CheckCircle2 } from 'lucide-react';

// --- Interfaces ---
interface Player {
  id: string;
  name: string;
  pts: number;
  reb: number;
  ast: number;
  imageUrl: string;
}

interface TargetStats {
  pts: number;
  reb: number;
  ast: number;
}

// --- Base de Datos MOCK (Superestrellas) ---
const PLAYERS_DB: Player[] = [
  { id: '1', name: 'Luka Doncic', pts: 33.9, reb: 9.2, ast: 9.8, imageUrl: 'https://i.pravatar.cc/150?u=luka' },
  { id: '2', name: 'Nikola Jokic', pts: 26.4, reb: 12.4, ast: 9.0, imageUrl: 'https://i.pravatar.cc/150?u=jokic' },
  { id: '3', name: 'Shai G.-Alexander', pts: 30.1, reb: 5.5, ast: 6.2, imageUrl: 'https://i.pravatar.cc/150?u=sga' },
  { id: '4', name: 'Giannis Antetokounmpo', pts: 30.4, reb: 11.5, ast: 6.5, imageUrl: 'https://i.pravatar.cc/150?u=giannis' },
  { id: '5', name: 'Jayson Tatum', pts: 26.9, reb: 8.1, ast: 4.9, imageUrl: 'https://i.pravatar.cc/150?u=tatum' },
  { id: '6', name: 'Anthony Davis', pts: 24.7, reb: 12.6, ast: 3.5, imageUrl: 'https://i.pravatar.cc/150?u=ad' },
  { id: '7', name: 'Tyrese Haliburton', pts: 20.1, reb: 3.9, ast: 10.9, imageUrl: 'https://i.pravatar.cc/150?u=hali' },
  { id: '8', name: 'Anthony Edwards', pts: 25.9, reb: 5.4, ast: 5.1, imageUrl: 'https://i.pravatar.cc/150?u=ant' },
  { id: '9', name: 'Victor Wembanyama', pts: 21.4, reb: 10.6, ast: 3.9, imageUrl: 'https://i.pravatar.cc/150?u=wemby' },
  { id: '10', name: 'Stephen Curry', pts: 26.4, reb: 4.5, ast: 5.1, imageUrl: 'https://i.pravatar.cc/150?u=curry' },
  { id: '11', name: 'Kevin Durant', pts: 27.1, reb: 6.6, ast: 5.0, imageUrl: 'https://i.pravatar.cc/150?u=kd' },
  { id: '12', name: 'Domantas Sabonis', pts: 19.4, reb: 13.7, ast: 8.2, imageUrl: 'https://i.pravatar.cc/150?u=sabonis' },
];

const MAX_PICKS = 3;

export default function TargetX() {
  const [pool, setPool] = useState<Player[]>([]);
  const [target, setTarget] = useState<TargetStats>({ pts: 0, reb: 0, ast: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [score, setScore] = useState(0);

  // Inicializar nivel
  const initLevel = () => {
    // 1. Coger 9 jugadores aleatorios para el pool
    const shuffled = [...PLAYERS_DB].sort(() => 0.5 - Math.random()).slice(0, 9);
    setPool(shuffled);

    // 2. Elegir 3 en secreto para crear un objetivo posible, con un pequeño "ruido"
    const secretCombo = [...shuffled].sort(() => 0.5 - Math.random()).slice(0, 3);
    const noise = () => (Math.random() * 4) - 2; // Ruido entre -2 y +2
    
    setTarget({
      pts: Number((secretCombo.reduce((s, p) => s + p.pts, 0) + noise()).toFixed(1)),
      reb: Number((secretCombo.reduce((s, p) => s + p.reb, 0) + noise()).toFixed(1)),
      ast: Number((secretCombo.reduce((s, p) => s + p.ast, 0) + noise()).toFixed(1)),
    });

    setSelectedIds([]);
    setIsEvaluated(false);
  };

  // Iniciar al montar
  useEffect(() => {
    initLevel();
  }, []);

  const togglePlayer = (id: string) => {
    if (isEvaluated) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length < MAX_PICKS) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedPlayers = useMemo(() => 
    selectedIds.map(id => pool.find(p => p.id === id)!).filter(Boolean),
  [selectedIds, pool]);

  const currentStats = useMemo(() => ({
    pts: selectedPlayers.reduce((s, p) => s + p.pts, 0),
    reb: selectedPlayers.reduce((s, p) => s + p.reb, 0),
    ast: selectedPlayers.reduce((s, p) => s + p.ast, 0),
  }), [selectedPlayers]);

  const evaluate = () => {
    // Calculamos el error absoluto (distancia euclidiana o simple)
    const deltaPts = Math.abs(currentStats.pts - target.pts);
    const deltaReb = Math.abs(currentStats.reb - target.reb);
    const deltaAst = Math.abs(currentStats.ast - target.ast);
    
    // Penalización total
    const totalError = deltaPts + (deltaReb * 1.5) + (deltaAst * 2); // Rebotes y Asistencias pesan más porque hay menos volumen
    
    // Puntuación Quant (100 es perfecto, baja según el error)
    const accuracy = Math.max(0, 100 - totalError);
    setScore(accuracy);
    setIsEvaluated(true);
  };

  // --- Subcomponente Barra de Progreso ---
  const TargetBar = ({ label, current, targetVal }: { label: string, current: number, targetVal: number }) => {
    const percentage = Math.min(100, (current / targetVal) * 100);
    const isOver = current > targetVal;
    
    let color = 'bg-cyan-500';
    if (isEvaluated) {
      const diff = Math.abs(current - targetVal);
      if (diff <= 2) color = 'bg-emerald-400';
      else if (diff <= 6) color = 'bg-yellow-400';
      else color = 'bg-rose-500';
    }

    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono font-bold mb-1">
          <span className="text-slate-400 uppercase tracking-widest">{label}</span>
          <span className={`${isOver && isEvaluated ? 'text-rose-400' : 'text-slate-200'}`}>
            {current.toFixed(1)} / <span className="text-cyan-400">{targetVal.toFixed(1)}</span>
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${color} transition-all duration-500`}
          />
          {isOver && isEvaluated && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((current - targetVal) / targetVal) * 100)}%` }}
              className="h-full bg-rose-500 opacity-50 absolute right-0"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-end mb-8 pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-400" />
            THE TARGET X
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            OPTIMIZACIÓN DE ROSTER CIEGO // MAX: {MAX_PICKS} JUGADORES
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8">
        
        {/* Lado Izquierdo: Pool de Jugadores */}
        <div className="bg-[#0a0f18]/80 border border-slate-800/80 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-mono font-bold text-slate-300 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> AGENCIA LIBRE
            </h3>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold font-mono border border-blue-500/30">
              {selectedIds.length} / {MAX_PICKS} FICHADOS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {pool.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <motion.button
                  key={p.id}
                  whileHover={!isEvaluated ? { scale: 1.02 } : {}}
                  whileTap={!isEvaluated ? { scale: 0.98 } : {}}
                  onClick={() => togglePlayer(p.id)}
                  disabled={isEvaluated || (!isSelected && selectedIds.length >= MAX_PICKS)}
                  className={`relative p-4 rounded-2xl border text-center transition-colors flex flex-col items-center gap-3
                    ${isSelected 
                      ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                      : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                    }
                    ${isEvaluated && !isSelected ? 'opacity-30 grayscale' : ''}
                    ${!isSelected && selectedIds.length >= MAX_PICKS && !isEvaluated ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-blue-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <img src={p.imageUrl} className="w-16 h-16 rounded-full bg-slate-800 object-cover border-2 border-slate-700" alt={p.name} />
                  <span className="font-black text-sm text-slate-200 leading-tight">{p.name}</span>
                  
                  {/* Revelar stats al evaluar */}
                  <AnimatePresence>
                    {isEvaluated && isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-[10px] font-mono text-cyan-400 mt-2 flex gap-2 bg-black/40 px-2 py-1 rounded"
                      >
                        <span>{p.pts}P</span>
                        <span>{p.reb}R</span>
                        <span>{p.ast}A</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Lado Derecho: Calculadora Quant */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6 flex flex-col h-full shadow-[0_0_30px_rgba(59,130,246,0.05)]">
          <div className="mb-6 flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-4">
            <Calculator className="w-5 h-5" />
            <h3 className="font-mono font-bold">ALGORITMO OBJETIVO</h3>
          </div>

          <div className="flex-1">
            <TargetBar label="PUNTOS TOTALES (PTS)" current={currentStats.pts} targetVal={target.pts} />
            <TargetBar label="REBOTES TOTALES (REB)" current={currentStats.reb} targetVal={target.reb} />
            <TargetBar label="ASISTENCIAS TOTALES (AST)" current={currentStats.ast} targetVal={target.ast} />
          </div>

          {!isEvaluated ? (
            <button
              onClick={evaluate}
              disabled={selectedIds.length !== MAX_PICKS}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all mt-6 flex items-center justify-center gap-2
                ${selectedIds.length === MAX_PICKS 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              <Zap className="w-5 h-5" /> Auditar Fichajes
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-4">
                <p className="text-slate-400 text-xs font-mono mb-1">PRECISIÓN DEL PORTAFOLIO</p>
                <div className={`text-5xl font-black font-mono tracking-tighter ${score > 80 ? 'text-emerald-400' : score > 50 ? 'text-yellow-400' : 'text-rose-500'}`}>
                  {score.toFixed(1)}%
                </div>
              </div>
              <button
                onClick={initLevel}
                className="w-full py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-5 h-5" /> Siguiente Objetivo
              </button>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
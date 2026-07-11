import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Fingerprint, CheckCircle2, XCircle, ChevronRight, RotateCcw, BrainCircuit } from 'lucide-react';

// --- Interfaces ---
interface StatPoint {
  metric: string;
  value: number; // Escala 0-100 (Percentil)
}

interface MysteryPlayer {
  id: number;
  realName: string;
  options: string[];
  correctOptionIndex: number;
  data: StatPoint[];
  insight: string;
}

// --- Base de Datos MOCK (Huellas Cuánticas) ---
// Valores basados en percentiles relativos a su posición (0-100)
const MYSTERY_PLAYERS: MysteryPlayer[] = [
  {
    id: 1,
    realName: 'Trae Young',
    options: ['Luka Doncic', 'Trae Young', 'Damian Lillard', 'Jalen Brunson'],
    correctOptionIndex: 1,
    data: [
      { metric: 'Anotación', value: 92 },
      { metric: 'Creación', value: 98 },
      { metric: 'Eficiencia', value: 75 },
      { metric: 'Rebote', value: 15 },
      { metric: 'Defensa', value: 5 }, // Históricamente en el fondo del percentil defensivo
    ],
    insight: "El polígono extremo: Anotación y Creación en la élite absoluta (>90th percentil), pero un agujero negro defensivo (5th percentil). Ese es el inconfundible perfil de Trae Young."
  },
  {
    id: 2,
    realName: 'Rudy Gobert',
    options: ['Anthony Davis', 'Victor Wembanyama', 'Rudy Gobert', 'Bam Adebayo'],
    correctOptionIndex: 2,
    data: [
      { metric: 'Anotación', value: 45 },
      { metric: 'Creación', value: 20 },
      { metric: 'Eficiencia', value: 95 }, // Alto TS% por solo hacer mates
      { metric: 'Rebote', value: 99 },
      { metric: 'Defensa', value: 99 },
    ],
    insight: "Una 'cometa' apuntando hacia abajo: Impacto ofensivo autogenerado casi nulo, pero dominación absoluta (99th) en Rebote y Defensa, con altísima Eficiencia en tiros restringidos. Gobert puro."
  },
  {
    id: 3,
    realName: 'Giannis Antetokounmpo',
    options: ['LeBron James', 'Joel Embiid', 'Giannis Antetokounmpo', 'Zion Williamson'],
    correctOptionIndex: 2,
    data: [
      { metric: 'Anotación', value: 98 },
      { metric: 'Creación', value: 85 },
      { metric: 'Eficiencia', value: 88 },
      { metric: 'Rebote', value: 95 },
      { metric: 'Defensa', value: 90 },
    ],
    insight: "El heptágono casi perfecto. Dominio bidireccional masivo. Pocos jugadores en la historia de la liga cubren tanto volumen en las 5 métricas principales como el 'Greek Freak'."
  }
];

export default function BlindResume() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  const player = MYSTERY_PLAYERS[currentRound];

  const handleGuess = (index: number) => {
    if (hasGuessed) return;
    
    setSelectedOption(index);
    setHasGuessed(true);

    if (index === player.correctOptionIndex) {
      setScore(s => s + 100);
    }
  };

  const nextRound = () => {
    if (currentRound < MYSTERY_PLAYERS.length - 1) {
      setCurrentRound(r => r + 1);
      setHasGuessed(false);
      setSelectedOption(null);
    } else {
      setIsGameOver(true);
    }
  };

  const restartGame = () => {
    setCurrentRound(0);
    setScore(0);
    setHasGuessed(false);
    setSelectedOption(null);
    setIsGameOver(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      {/* HUD Header */}
      <header className="flex justify-between items-end mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500 tracking-tight flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-purple-400" />
            BLIND RESUMÉ
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            IDENTIFICACIÓN POR HUELLA ESTADÍSTICA // SUJETO {currentRound + 1}/{MYSTERY_PLAYERS.length}
          </p>
        </div>
        <div className="font-mono flex flex-col items-end">
          <span className="text-xs text-slate-500">PRECISIÓN QUANT</span>
          <span className="text-2xl font-bold text-cyan-400">{score} <span className="text-sm text-slate-600">PTS</span></span>
        </div>
      </header>

      {isGameOver ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800"
        >
          <BrainCircuit className="w-16 h-16 text-purple-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-4xl font-bold text-slate-100 mb-4">ANÁLISIS CONCLUIDO</h2>
          <p className="text-xl text-slate-400 mb-8 font-mono">TASA DE RECONOCIMIENTO: <span className="text-purple-400">{(score / (MYSTERY_PLAYERS.length * 100)) * 100}%</span></p>
          <button 
            onClick={restartGame}
            className="flex items-center gap-2 mx-auto px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors font-mono"
          >
            <RotateCcw className="w-5 h-5" />
            REINICIAR ESCÁNER
          </button>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Lado Izquierdo: El Radar (Gráfico) */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 relative h-[400px] flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.05)]">
            {/* Superposición Glitch/Sci-Fi */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-2xl"></div>
            
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={player.data}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Huella Dactilar"
                  dataKey="value"
                  stroke="#c084fc"
                  strokeWidth={2}
                  fill="#c084fc"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
            
            {/* Decalaje central para estética radar */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_#c084fc]"></div>
          </div>

          {/* Lado Derecho: Interfaz de Selección */}
          <div className="flex flex-col h-full justify-center">
            <h3 className="text-xl font-bold text-slate-200 mb-6 font-mono flex items-center gap-2">
              <span className="w-2 h-6 bg-cyan-500 block"></span>
              SELECCIONE IDENTIDAD:
            </h3>

            <div className="space-y-3">
              {player.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === player.correctOptionIndex;
                
                let btnStyle = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-cyan-500/50";
                let icon = null;

                if (hasGuessed) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                    icon = <CheckCircle2 className="w-5 h-5" />;
                  } else if (isSelected) {
                    btnStyle = "bg-rose-500/10 border-rose-500 text-rose-400 font-bold opacity-70";
                    icon = <XCircle className="w-5 h-5" />;
                  } else {
                    btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-40";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={hasGuessed}
                    onClick={() => handleGuess(idx)}
                    className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all duration-300 font-mono text-left ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            {/* Panel de Insight (Post-Respuesta) */}
            <AnimatePresence>
              {hasGuessed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-purple-950/20 border border-purple-500/30 rounded-xl">
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      <span className="font-bold text-purple-400 uppercase mr-2">LOG DE SISTEMA:</span>
                      {player.insight}
                    </p>
                    <button 
                      onClick={nextRound}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-colors font-mono text-sm uppercase"
                    >
                      Continuar Análisis <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, XCircle, ChevronRight, RotateCcw, ShieldAlert, Map } from 'lucide-react';
import ShotChart from './ShotChart'; // IMPORTAMOS TU COMPONENTE ORIGINAL

// --- Interfaces ---
interface ShotChartProfile {
  id: number;
  realName: string;
  options: string[];
  correctOptionIndex: number;
  shots: any[]; // Usamos any para coincidir con la interfaz de tu ShotChart
  insight: string;
}

// --- Generador Cuántico de Tiros (Adaptado a tu geometría SVG) ---
// X: 0 es el centro del aro. Negativo es izq, positivo derecha. (-250 a 250)
// Y: 0 es el aro. Negativo es línea de fondo, positivo es hacia el medio campo. (-47.5 a 400+)
const generateShots = (zones: {x: [number, number], y: [number, number], count: number, fgPct: number}[]) => {
  const shots: any[] = [];
  zones.forEach(zone => {
    for (let i = 0; i < zone.count; i++) {
      shots.push({
        x: zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]),
        y: zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]),
        made: Math.random() < zone.fgPct,
        zone: "Mock", // Tu componente recalcula la zona dinámicamente con sus propias mates
        type: "Jump Shot"
      });
    }
  });
  return shots;
};

// --- Base de Datos MOCK (Adaptada a tu SVG) ---
const SHOT_CHARTS: ShotChartProfile[] = [
  {
    id: 1,
    realName: 'Zion Williamson',
    options: ['Stephen Curry', 'Zion Williamson', 'Kevin Durant', 'Damian Lillard'],
    correctOptionIndex: 1,
    shots: generateShots([
      { x: [-35, 35], y: [-30, 20], count: 60, fgPct: 0.65 }, // Restricted Area Masiva
      { x: [-60, 60], y: [20, 100], count: 10, fgPct: 0.40 }, // Pintura corta
      { x: [-150, 150], y: [150, 280], count: 3, fgPct: 0.20 },  // Triples casi nulos
    ]),
    insight: "El mapa de calor colapsa enteramente en la zona restringida. 0 volumen de media distancia o triples. Dominancia física pura en el semicírculo: Zion Williamson."
  },
  {
    id: 2,
    realName: 'Stephen Curry',
    options: ['LeBron James', 'DeMar DeRozan', 'Giannis Antetokounmpo', 'Stephen Curry'],
    correctOptionIndex: 3,
    shots: generateShots([
      { x: [-40, 40], y: [-20, 30], count: 20, fgPct: 0.60 }, // Bandejas
      { x: [-240, -220], y: [-40, 80], count: 15, fgPct: 0.45 },  // Esquina izquierda
      { x: [220, 240], y: [-40, 80], count: 15, fgPct: 0.45 }, // Esquina derecha
      { x: [-180, 180], y: [240, 320], count: 40, fgPct: 0.43 }, // Triples ATB
      { x: [-80, 80], y: [320, 400], count: 8, fgPct: 0.35 },  // Logo shots
    ]),
    insight: "Volumen demencial detrás del arco, incluyendo intentos desde 9-10 metros. Un mapa de tiro perimetral que desafía la geometría tradicional. Chef Curry."
  },
  {
    id: 3,
    realName: 'DeMar DeRozan',
    options: ['DeMar DeRozan', 'James Harden', 'Luka Doncic', 'Trae Young'],
    correctOptionIndex: 0,
    shots: generateShots([
      { x: [-40, 40], y: [-20, 20], count: 15, fgPct: 0.65 }, // Aro
      { x: [-150, -80], y: [50, 180], count: 25, fgPct: 0.50 }, // Elbow Izquierdo
      { x: [80, 150], y: [50, 180], count: 25, fgPct: 0.50 }, // Elbow Derecho
      { x: [-80, 80], y: [100, 200], count: 15, fgPct: 0.48 }, // Tiro Libre / Centro
      { x: [-200, 200], y: [250, 300], count: 4, fgPct: 0.33 },  // Triples ocasionales
    ]),
    insight: "El rey del Mid-Range. El mapa muestra un vacío en la línea de 3 y una saturación absoluta en los codos (elbows) y la línea de tiros libres. Arte clásico."
  }
];

export default function ShotChartDetective() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  const profile = SHOT_CHARTS[currentRound];

  const handleGuess = (index: number) => {
    if (hasGuessed) return;
    
    setSelectedOption(index);
    setHasGuessed(true);

    if (index === profile.correctOptionIndex) {
      setScore(s => s + 100);
    }
  };

  const nextRound = () => {
    if (currentRound < SHOT_CHARTS.length - 1) {
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
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-end mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight flex items-center gap-3">
            <Map className="w-8 h-8 text-orange-400" />
            SHOT CHART DETECTIVE
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            MAPA CIEGO // EXPEDIENTE {currentRound + 1}/{SHOT_CHARTS.length}
          </p>
        </div>
        <div className="font-mono flex flex-col items-end">
          <span className="text-xs text-slate-500">PRECISIÓN</span>
          <span className="text-2xl font-bold text-orange-400">{score} <span className="text-sm text-slate-600">PTS</span></span>
        </div>
      </header>

      {isGameOver ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800"
        >
          <Target className="w-16 h-16 text-orange-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-4xl font-bold text-slate-100 mb-4">EVALUACIÓN COMPLETADA</h2>
          <p className="text-xl text-slate-400 mb-8 font-mono">TASA DE ACIERTO: <span className="text-orange-400">{(score / (SHOT_CHARTS.length * 100)) * 100}%</span></p>
          <button 
            onClick={restartGame}
            className="flex items-center gap-2 mx-auto px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors font-mono"
          >
            <RotateCcw className="w-5 h-5" />
            NUEVO EXPEDIENTE
          </button>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
          
          {/* Lado Izquierdo: Tu Componente ShotChart Renderizado */}
          <div className="w-full flex justify-center">
            {/* Aquí inyectamos tus Mocks directamente a tu componente */}
            <div className="w-full max-w-[600px]">
              <ShotChart shots={profile.shots} />
            </div>
          </div>

          {/* Lado Derecho: Interfaz de Selección */}
          <div className="flex flex-col justify-center h-full">
            <h3 className="text-xl font-bold text-slate-200 mb-6 font-mono flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              IDENTIFICAR FIRMA DE TIRO:
            </h3>

            <div className="space-y-3">
              {profile.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === profile.correctOptionIndex;
                
                let btnStyle = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-orange-500/50";
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

            {/* Panel de Insight */}
            <AnimatePresence>
              {hasGuessed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-orange-950/20 border border-orange-500/30 rounded-xl">
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      <span className="font-bold text-orange-400 uppercase mr-2">ANÁLISIS DE LA HUELLA:</span>
                      {profile.insight}
                    </p>
                    <button 
                      onClick={nextRound}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-colors font-mono text-sm uppercase"
                    >
                      Siguiente Expediente <ChevronRight className="w-4 h-4" />
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
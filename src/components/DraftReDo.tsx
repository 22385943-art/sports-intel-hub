import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, TrendingUp, AlertTriangle, Crosshair, Award, ChevronRight, RefreshCcw } from 'lucide-react';

// --- Interfaces ---
interface DraftProspect {
  id: string;
  realName: string;
  collegeStats: string;
  nuseProjection: {
    ceiling: number;    // Escala 1-100
    floor: number;      // Escala 1-100
    bustRisk: number;   // % de probabilidad de rotación marginal
    scalability: number;// Adaptabilidad a diferentes esquemas (1-100)
  };
  actual5YearImpact: number; // Métrica oculta (ej. VORP acumulado)
}

// --- Base de Datos MOCK (Clase 2018 Ciega) ---
const PROSPECTS_2018: DraftProspect[] = [
  {
    id: 'P1',
    realName: 'Luka Doncic',
    collegeStats: '16.0 PTS, 4.8 TRB, 4.3 AST (EuroLeague)',
    nuseProjection: { ceiling: 99, floor: 85, bustRisk: 5, scalability: 98 },
    actual5YearImpact: 28.5
  },
  {
    id: 'P2',
    realName: 'Deandre Ayton',
    collegeStats: '20.1 PTS, 11.6 TRB, 1.9 BLK (NCAA)',
    nuseProjection: { ceiling: 88, floor: 75, bustRisk: 22, scalability: 65 },
    actual5YearImpact: 12.4
  },
  {
    id: 'P3',
    realName: 'Marvin Bagley III',
    collegeStats: '21.0 PTS, 11.1 TRB, 61.4 FG% (NCAA)',
    nuseProjection: { ceiling: 85, floor: 40, bustRisk: 45, scalability: 40 },
    actual5YearImpact: 3.2
  },
  {
    id: 'P4',
    realName: 'Shai Gilgeous-Alexander',
    collegeStats: '14.4 PTS, 4.1 TRB, 5.1 AST (NCAA)',
    nuseProjection: { ceiling: 94, floor: 70, bustRisk: 15, scalability: 92 },
    actual5YearImpact: 22.1
  },
  {
    id: 'P5',
    realName: 'Trae Young',
    collegeStats: '27.4 PTS, 8.7 AST, 36.0 3P% (NCAA)',
    nuseProjection: { ceiling: 95, floor: 60, bustRisk: 30, scalability: 75 },
    actual5YearImpact: 19.8
  },
  {
    id: 'P6',
    realName: 'Jaren Jackson Jr.',
    collegeStats: '10.9 PTS, 5.8 TRB, 3.0 BLK (NCAA)',
    nuseProjection: { ceiling: 90, floor: 65, bustRisk: 25, scalability: 88 },
    actual5YearImpact: 14.5
  }
];

const MAX_PICKS = 3;

export default function DraftReDo() {
  const [draftedIds, setDraftedIds] = useState<string[]>([]);
  const [isEvaluation, setIsEvaluation] = useState(false);

  // Derivados
  const availableProspects = useMemo(() => 
    PROSPECTS_2018.filter(p => !draftedIds.includes(p.id)), 
  [draftedIds]);

  const draftedProspects = useMemo(() => 
    draftedIds.map(id => PROSPECTS_2018.find(p => p.id === id)!).filter(Boolean) as DraftProspect[],
  [draftedIds]);

  const totalImpact = useMemo(() => 
    draftedProspects.reduce((sum, p) => sum + p.actual5YearImpact, 0),
  [draftedProspects]);

  // El máximo impacto teórico posible con 3 picks (Luka + Shai + Trae = 70.4)
  const maxPossibleImpact = [...PROSPECTS_2018]
    .sort((a, b) => b.actual5YearImpact - a.actual5YearImpact)
    .slice(0, MAX_PICKS)
    .reduce((sum, p) => sum + p.actual5YearImpact, 0);

  const handleDraft = (id: string) => {
    if (draftedIds.length < MAX_PICKS) {
      const newDrafted = [...draftedIds, id];
      setDraftedIds(newDrafted);
      if (newDrafted.length === MAX_PICKS) {
        setTimeout(() => setIsEvaluation(true), 800);
      }
    }
  };

  const restartDraft = () => {
    setDraftedIds([]);
    setIsEvaluation(false);
  };

  // --- Subcomponentes ---
  const ProspectCard = ({ prospect, onSelect }: { prospect: DraftProspect, onSelect?: () => void }) => (
    <motion.div
      layoutId={`card-${prospect.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={onSelect ? { scale: 1.02, borderColor: '#06b6d4' } : {}}
      className={`p-5 rounded-xl border bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between
        ${onSelect ? 'border-slate-700 cursor-pointer hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-cyan-500/50'}`}
      onClick={onSelect}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-100 font-mono">PROSPECTO {prospect.id}</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">{prospect.collegeStats}</p>
          </div>
          <Database className="w-5 h-5 text-slate-600" />
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400"/> Techo</span>
            <span className="font-mono text-emerald-400 font-bold">{prospect.nuseProjection.ceiling}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-amber-400"/> Suelo</span>
            <span className="font-mono text-amber-400 font-bold">{prospect.nuseProjection.floor}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 flex items-center gap-2"><Crosshair className="w-4 h-4 text-cyan-400"/> Escalabilidad</span>
            <span className="font-mono text-cyan-400 font-bold">{prospect.nuseProjection.scalability}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400"/> Riesgo Fracaso</span>
            <span className="font-mono text-rose-400 font-bold">{prospect.nuseProjection.bustRisk}%</span>
          </div>
        </div>
      </div>
      
      {onSelect && (
        <button className="w-full py-2 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white font-mono text-sm font-bold rounded transition-colors">
          SELECCIONAR
        </button>
      )}
    </motion.div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tight">
            WAR ROOM: OPTIMIZACIÓN DE DRAFT
          </h2>
          <p className="text-slate-400 mt-1 font-mono text-sm">
            CLASE 2018 (CIEGA) // MAXIMIZA EL IMPACTO ACUMULADO A 5 AÑOS
          </p>
        </div>
        {!isEvaluation && (
          <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg font-mono">
            <span className="text-slate-400 text-sm">PICKS RESTANTES: </span>
            <span className="text-cyan-400 font-bold text-lg">{MAX_PICKS - draftedIds.length}</span>
          </div>
        )}
      </header>

      {isEvaluation ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Panel de Resultados */}
          <div className="p-8 bg-slate-900/80 border border-cyan-500/30 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
            <Award className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-100 mb-2">EVALUACIÓN DEL PORTAFOLIO</h3>
            <div className="flex justify-center items-end gap-4 mt-6 font-mono">
              <div className="text-right">
                <p className="text-slate-500 text-sm">TU IMPACTO</p>
                <p className="text-5xl font-bold text-emerald-400">{totalImpact.toFixed(1)}</p>
              </div>
              <div className="text-5xl font-light text-slate-700 pb-1">/</div>
              <div className="text-left">
                <p className="text-slate-500 text-sm">MÁXIMO POSIBLE</p>
                <p className="text-3xl font-bold text-slate-400">{maxPossibleImpact.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Revelación de Jugadores */}
          <div>
            <h4 className="text-slate-400 font-mono text-sm mb-4">IDENTIDADES REVELADAS:</h4>
            <div className="grid md:grid-cols-3 gap-6">
              {draftedProspects.map(p => (
                <div key={p.id} className="p-5 bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="text-xs text-cyan-400 font-mono mb-1">PROSPECTO {p.id}</div>
                  <div className="text-xl font-bold text-white mb-4">{p.realName}</div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                    <span className="text-slate-400 text-sm">Valor Real:</span>
                    <span className="text-emerald-400 font-mono font-bold">+{p.actual5YearImpact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={restartDraft}
              className="flex items-center gap-2 px-8 py-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-400 font-bold rounded-lg transition-all font-mono"
            >
              <RefreshCcw className="w-5 h-5" />
              NUEVA SIMULACIÓN
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Slots de Selección */}
          <div className="mb-12">
            <h3 className="text-sm font-bold text-slate-500 font-mono mb-4">TUS SELECCIONES</h3>
            <div className="grid grid-cols-3 gap-4 md:gap-6 h-32">
              {Array.from({ length: MAX_PICKS }).map((_, idx) => {
                const prospect = draftedProspects[idx];
                return (
                  <div key={idx} className="h-full">
                    {prospect ? (
                      <motion.div layoutId={`card-${prospect.id}`} className="h-full p-4 bg-cyan-950/30 border border-cyan-500/50 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-cyan-400 font-bold font-mono">PROSPECTO {prospect.id}</span>
                        <span className="text-xs text-slate-400 mt-2">Asegurado</span>
                      </motion.div>
                    ) : (
                      <div className="h-full border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center bg-slate-900/30">
                        <span className="text-slate-600 font-mono text-sm">SLOT {idx + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pool de Prospectos */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 font-mono mb-4">BOARD DE DISPONIBLES</h3>
            <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {availableProspects.map(prospect => (
                  <ProspectCard 
                    key={prospect.id} 
                    prospect={prospect} 
                    onSelect={() => handleDraft(prospect.id)} 
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
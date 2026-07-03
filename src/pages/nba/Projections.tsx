import React, { useState, useEffect } from "react";

// ─── CONFIGURACIÓN VISUAL ──────────────────────────────────────────────────
const AWARD_CONFIG = {
  mvp:    { label: "Most Valuable Player", abbr: "MVP", accent: "#22d3ee", icon: "◈" },
  dpoy:   { label: "Defensive Player of the Year", abbr: "DPOY", accent: "#f43f5e", icon: "⬡" },
  roy:    { label: "Rookie of the Year", abbr: "ROY", accent: "#a78bfa", icon: "✦", emptyNote: "La clase del Draft 2026 aún no está disponible en el pipeline." },
  mip:    { label: "Most Improved Player", abbr: "MIP", accent: "#34d399", icon: "△" },
  sixmoy: { label: "Sixth Man of the Year", abbr: "6MOY", accent: "#fb923c", icon: "⑥" },
  coty:   { label: "Coach of the Year", abbr: "COTY", accent: "#facc15", icon: "◎" },
  cpoy:   { label: "Clutch Player of the Year", abbr: "CPOY", accent: "#e879f9", icon: "◉" },
};

const TEAM_COLORS = {
  SAS:"#C4CED4", DEN:"#FEC524", OKC:"#007AC1", DAL:"#00538C", MIN:"#236192",
  UTA:"#002B5C", NOP:"#0C2340", LAC:"#C8102E", MIL:"#00471B", BOS:"#007A33",
  HOU:"#CE1141", ORL:"#0077C0", TOR:"#CE1141", BKN:"#FFFFFF", NYK:"#F58426",
  DET:"#C8102E", TBD:"#64748b"
};

const teamColor = (id) => TEAM_COLORS[id] ?? "#64748b";

// ─── UTILS Y FORMATEADORES ─────────────────────────────────────────────────
const fmt     = (n) => (typeof n === "number" ? n.toFixed(1) : "—");
const fmtProb = (n) => (typeof n === "number" ? n.toFixed(1) + "%" : "—");

const getAmericanOdds = (prob) => {
  if (!prob || prob <= 0) return "—";
  if (prob >= 99.9) return "Locked";
  if (prob >= 50) return "-" + Math.round((prob / (100 - prob)) * 100);
  return "+" + Math.round(((100 - prob) / prob) * 100);
};

// Diccionario para formatear las keys de stats en el Modal de forma profesional
const formatStatName = (key) => {
  const dictionary = {
    bpmProj: "BPM Proyectado", ppgProj: "PPG Proyectado", avgSeed: "Seed Promedio",
    dbpmProj: "DBPM Proyectado", bpgProj: "Tapones por Juego", bpmMomentum: "Δ BPM", 
    ppgMomentum: "Δ PPG", mpgProj: "Minutos por Juego", usgProj: "Uso Ofensivo (%)",
    lastSeasonWins: "Victorias 25-26", projectedWins: "Victorias Proyectadas 26-27",
    wsProj: "Win Shares"
  };
  return dictionary[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

function statLabel(awardKey, stats = {}) {
  switch (awardKey) {
    case "mvp":    return `BPM ${fmt(stats.bpmProj)} · ${fmt(stats.ppgProj)} PPG · Seed ${fmt(stats.avgSeed)}`;
    case "dpoy":   return `DBPM ${fmt(stats.dbpmProj)} · ${fmt(stats.bpgProj)} BPG`;
    case "mip":    return `ΔBPM +${fmt(stats.bpmMomentum)} · ΔPPG +${fmt(stats.ppgMomentum)}`;
    case "sixmoy": return `${fmt(stats.mpgProj)} MPG · ${fmt(stats.usgProj)}% USG`;
    case "coty":   return `${stats.lastSeasonWins}W → ${fmt(stats.projectedWins)}W proj`;
    case "cpoy":   return `USG ${fmt(stats.usgProj)}% · BPM ${fmt(stats.bpmProj)}`;
    default:       return null;
  }
}

// ─── SUBCOMPONENTES UI ─────────────────────────────────────────────────────

// MODAL DE DETALLE DE JUGADOR/EQUIPO
function CandidateModal({ candidate, config, onClose }) {
  if (!candidate) return null;
  const tc = teamColor(candidate.teamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Evita que el click dentro cierre el modal
        style={{ boxShadow: `0 20px 40px -10px ${config.accent}33` }}
      >
        {/* Cabecera del Modal */}
        <div className="relative h-24 w-full" style={{ background: `linear-gradient(to right, ${tc}40, transparent)` }}>
          <div className="absolute top-4 right-4 cursor-pointer text-slate-400 hover:text-white" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
          <div className="absolute -bottom-10 left-6 flex items-end gap-4">
            <div className="w-24 h-24 rounded-xl border-4 border-slate-900 overflow-hidden bg-slate-800" style={{ borderColor: tc }}>
              <img src={candidate.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"} alt={candidate.name} className="w-full h-full object-cover object-top" />
            </div>
            <div className="mb-2">
              <div className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded mb-1 inline-block" style={{ background: `${tc}33`, color: tc }}>
                {candidate.teamId}
              </div>
              <h2 className="text-2xl font-black text-white leading-none">{candidate.name}</h2>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="pt-16 pb-6 px-6">
          <div className="flex items-center justify-between p-4 rounded-xl mb-6 border" style={{ background: `${config.accent}11`, borderColor: `${config.accent}33` }}>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prob. de Ganar</div>
              <div className="text-3xl font-black font-mono mt-1" style={{ color: config.accent }}>{fmtProb(candidate.prob)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cuota Las Vegas</div>
              <div className="text-2xl font-black font-mono mt-1 text-slate-200">{getAmericanOdds(candidate.prob)}</div>
            </div>
          </div>

          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-800 pb-2">Desglose de Proyección (Simulada)</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {candidate.keyStats && Object.entries(candidate.keyStats).map(([key, value]) => (
              <div key={key} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {formatStatName(key)}
                </div>
                <div className="text-lg font-mono text-slate-200 font-semibold">
                  {fmt(value)}
                </div>
              </div>
            ))}
            {(!candidate.keyStats || Object.keys(candidate.keyStats).length === 0) && (
              <div className="col-span-2 text-sm text-slate-500 italic">No hay métricas avanzadas disponibles para este candidato.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProbBar({ prob, accent, max = 100 }) {
  const pct = Math.min((prob / max) * 100, 100);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 8px ${accent}88` }}
      />
    </div>
  );
}

function EmptyAwardCard({ config }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <AwardHeader config={config} />
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <span className="text-3xl opacity-20" style={{ color: config.accent }}>{config.icon}</span>
        <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
          {config.emptyNote || "Datos insuficientes para predecir este premio."}
        </p>
      </div>
    </div>
  );
}

function AwardHeader({ config }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <span className="font-black text-base tracking-tight" style={{ color: config.accent }}>
          {config.icon}
        </span>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            {config.abbr}
          </div>
          <div className="text-xs font-semibold text-slate-300 leading-none mt-0.5">
            {config.label}
          </div>
        </div>
      </div>
      <div
        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
        style={{ color: config.accent, borderColor: `${config.accent}44`, background: `${config.accent}12` }}
      >
        2026–27
      </div>
    </div>
  );
}

function FavoriteBlock({ candidate, config, awardKey, onClick }) {
  const tc = teamColor(candidate.teamId);
  const subStat = statLabel(awardKey, candidate.keyStats);

  return (
    <div
      onClick={() => onClick(candidate, config)}
      className="relative rounded-xl overflow-hidden p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
      style={{ background: `linear-gradient(135deg, ${config.accent}14 0%, #0f172a 60%)`, border: `1px solid ${config.accent}44` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ background: config.accent }} />
      
      <div
        className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shadow-lg z-10"
        style={{ background: config.accent, color: "#0f172a" }}
      >
        1
      </div>

      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border transition-transform duration-300 group-hover:scale-105"
          style={{ borderColor: `${tc}60`, background: "#1e293b" }}
        >
          <img
            src={candidate.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"}
            alt={candidate.name}
            className="w-full h-full object-cover object-top"
            onError={(e) => { e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"; }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: tc }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: `${tc}22`, color: tc }}
            >
              {candidate.teamId}
            </div>
          </div>
          <div className="text-sm font-black text-white tracking-tight leading-tight truncate pr-6 group-hover:text-cyan-100 transition-colors">
            {candidate.name}
          </div>
          {subStat && (
            <div className="text-[9px] text-slate-500 font-mono mt-0.5 leading-snug">
              {subStat}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between relative z-10">
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Win Probability
          </div>
          <div className="text-2xl font-black font-mono tracking-tight leading-none mt-0.5" style={{ color: config.accent }}>
            {fmtProb(candidate.prob)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">
            Implied odds
          </div>
          <div className="text-sm font-black font-mono text-slate-400">
            {getAmericanOdds(candidate.prob)}
          </div>
        </div>
      </div>

      <ProbBar prob={candidate.prob} accent={config.accent} max={100} />
    </div>
  );
}

function ChaseList({ candidates, config, onPlayerClick }) {
  const chasers = candidates.slice(1, 4);
  if (!chasers.length) return null;
  const topChaser = Math.max(...chasers.map((c) => c.prob));

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-1">
        Contenders
      </div>
      {chasers.map((c, i) => (
        <div 
          key={c.id || i} 
          onClick={() => onPlayerClick(c, config)}
          className="flex items-center gap-2.5 p-2 -mx-1 rounded-lg cursor-pointer hover:bg-slate-800/60 transition-colors group"
        >
          <div className="text-[9px] font-black font-mono text-slate-600 w-3 shrink-0 group-hover:text-slate-400">
            {i + 2}
          </div>
          <div
            className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-700 group-hover:border-slate-500 transition-colors"
            style={{ background: "#1e293b" }}
          >
            <img
              src={c.imageUrl || "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"}
              alt={c.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => { e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-slate-300 truncate leading-none pr-2 group-hover:text-white transition-colors">
                {c.name}
              </span>
              <span className="text-[10px] font-black font-mono shrink-0" style={{ color: config.accent + "cc" }}>
                {fmtProb(c.prob)}
              </span>
            </div>
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${topChaser > 0 ? (c.prob / topChaser) * 100 : 0}%`,
                  background: `${config.accent}88`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AwardCard({ awardKey, candidates, onCandidateClick }) {
  const config = AWARD_CONFIG[awardKey];
  if (!config) return null;

  if (!candidates || candidates.length === 0 || candidates[0].prob === 0) {
    return <EmptyAwardCard config={config} />;
  }

  const [favorite, ...rest] = candidates;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm shadow-xl">
      <AwardHeader config={config} />
      <FavoriteBlock candidate={favorite} config={config} awardKey={awardKey} onClick={onCandidateClick} />
      <ChaseList candidates={candidates} config={config} onPlayerClick={onCandidateClick} />
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function AwardsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  
  // Estados para el Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(null);

  useEffect(() => {
    fetch('/data/nba_standings_projected.json')
      .then(res => res.json())
      .then(json => {
        setData(json.awards);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando predicciones:", err);
        setLoading(false);
      });
  }, []);

  const openCandidateModal = (candidate, config) => {
    setSelectedCandidate(candidate);
    setSelectedConfig(config);
  };

  const closeCandidateModal = () => {
    setSelectedCandidate(null);
    setSelectedConfig(null);
  };

  const FILTERS = ["ALL", "MVP", "DPOY", "ROY", "MIP", "6MOY", "COTY", "CPOY"];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono">
        <div className="h-10 w-10 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">
          Loading Vegas Quant Engine...
        </p>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-slate-950 text-white p-10">Error cargando datos.</div>;

  const visibleKeys = activeFilter === "ALL" 
    ? Object.keys(AWARD_CONFIG) 
    : [activeFilter.toLowerCase()];

  const mvpFav = data.mvp && data.mvp.length > 0 ? data.mvp[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      {/* Modal Overlay */}
      {selectedCandidate && selectedConfig && (
        <CandidateModal 
          candidate={selectedCandidate} 
          config={selectedConfig} 
          onClose={closeCandidateModal} 
        />
      )}

      <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-6 py-8">
        <div className="pointer-events-none absolute -top-20 left-1/3 h-40 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 right-1/4 h-40 w-64 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">
                  Sports Intel Hub · Prediction Engine
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-none">
                Awards Dashboard
                <span className="ml-3 text-2xl sm:text-3xl font-black text-cyan-400">2026–27</span>
              </h1>
              <p className="mt-3 text-sm text-slate-400 max-w-lg">
                WPR individual · Monte Carlo 10k sims · Voter psychology model · 7 awards
              </p>
            </div>

            {mvpFav && (
              <div 
                onClick={() => openCandidateModal(mvpFav, AWARD_CONFIG.mvp)}
                className="flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-4 shadow-[0_0_20px_rgba(34,211,238,0.1)] cursor-pointer hover:bg-cyan-500/20 transition-all duration-300 group"
              >
                <img
                  src={mvpFav.imageUrl}
                  alt={mvpFav.name}
                  className="h-14 w-14 rounded-xl object-cover object-top border-2 border-cyan-500/40 group-hover:scale-105 transition-transform"
                  onError={(e) => { e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"; }}
                />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">
                    MVP Favorite
                  </div>
                  <div className="text-lg font-black text-white leading-none">{mvpFav.name}</div>
                  <div className="text-2xl font-black font-mono text-cyan-300 leading-none mt-1">
                    {getAmericanOdds(mvpFav.prob)} ({fmtProb(mvpFav.prob)})
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PESTAÑAS (Filtros Mejorados) */}
          <div className="flex flex-wrap items-center gap-3 mt-10">
            {FILTERS.map((f) => {
              const active = f === activeFilter;
              const config = f !== "ALL" ? AWARD_CONFIG[f.toLowerCase()] : null;
              const accentColor = config?.accent ?? "#22d3ee";
              
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`relative text-xs sm:text-sm font-black uppercase tracking-wider px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                    active 
                      ? 'shadow-lg scale-105' 
                      : 'hover:border-slate-600 hover:-translate-y-0.5 hover:bg-slate-800/30'
                  }`}
                  style={{
                    borderColor : active ? accentColor : "#1e293b",
                    background  : active ? `${accentColor}15` : "transparent",
                    color       : active ? accentColor : "#64748b",
                    boxShadow   : active ? `0 4px 15px -3px ${accentColor}40` : "none"
                  }}
                >
                  <span className="relative z-10">{f === "ALL" ? "All Awards" : `${config?.icon} ${f}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleKeys.map((key) => (
            <AwardCard 
              key={key} 
              awardKey={key} 
              candidates={data[key]} 
              onCandidateClick={openCandidateModal} 
            />
          ))}
        </div>

        <div className="mt-12 border-t border-slate-800/60 pt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[10px] text-slate-500 max-w-2xl leading-relaxed">
            Proyecciones generadas por modelo WPR sobre 30 temporadas BRef. 
            Monte Carlo: 10,000 iteraciones con varianza inyectada σ=4.0. No son predicciones garantizadas.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 font-bold bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span>LIVE MODEL · {new Date().toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
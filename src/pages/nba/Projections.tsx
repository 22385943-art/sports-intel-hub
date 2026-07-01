import React, { useState, useEffect, useMemo } from "react";

// ─── CONFIGURACIÓN VISUAL ──────────────────────────────────────────────────
const AWARD_CONFIG = {
  mvp:    { label: "Most Valuable Player", abbr: "MVP", accent: "#22d3ee", icon: "◈" },
  dpoy:   { label: "Defensive Player of the Year", abbr: "DPOY", accent: "#f43f5e", icon: "⬡" },
  roy:    { label: "Rookie of the Year", abbr: "ROY", accent: "#a78bfa", icon: "✦", emptyNote: "La clase del Draft 2026 aún no está disponible en el pipeline. El modelo se actualizará automáticamente tras el draft (junio 2026)." },
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

// Convertidor a cuotas americanas de Las Vegas (Implied Odds)
const getAmericanOdds = (prob) => {
  if (!prob || prob <= 0) return "—";
  if (prob >= 99.9) return "Locked"; // Evita divisiones por cero
  if (prob >= 50) return "-" + Math.round((prob / (100 - prob)) * 100);
  return "+" + Math.round(((100 - prob) / prob) * 100);
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

function FavoriteBlock({ candidate, config, awardKey }) {
  const tc = teamColor(candidate.teamId);
  const subStat = statLabel(awardKey, candidate.keyStats);

  return (
    <div
      className="relative rounded-xl overflow-hidden p-4"
      style={{ background: `linear-gradient(135deg, ${config.accent}14 0%, #0f172a 60%)`, border: `1px solid ${config.accent}33` }}
    >
      <div
        className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shadow-lg"
        style={{ background: config.accent, color: "#0f172a" }}
      >
        1
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border"
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
          <div className="text-sm font-black text-white tracking-tight leading-tight truncate pr-6">
            {candidate.name}
          </div>
          {subStat && (
            <div className="text-[9px] text-slate-500 font-mono mt-0.5 leading-snug">
              {subStat}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
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

function ChaseList({ candidates, config }) {
  const chasers = candidates.slice(1, 4);
  if (!chasers.length) return null;
  const topChaser = Math.max(...chasers.map((c) => c.prob));

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-1">
        Contenders
      </div>
      {chasers.map((c, i) => (
        <div key={c.id || i} className="flex items-center gap-2.5 px-1">
          <div className="text-[9px] font-black font-mono text-slate-600 w-3 shrink-0">
            {i + 2}
          </div>
          <div
            className="w-6 h-6 rounded-full overflow-hidden shrink-0 border"
            style={{ borderColor: `${teamColor(c.teamId)}40`, background: "#1e293b" }}
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
              <span className="text-[10px] font-semibold text-slate-300 truncate leading-none pr-2">
                {c.name}
              </span>
              <span className="text-[10px] font-black font-mono shrink-0" style={{ color: config.accent + "cc" }}>
                {fmtProb(c.prob)}
              </span>
            </div>
            <div className="h-0.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${topChaser > 0 ? (c.prob / topChaser) * 100 : 0}%`,
                  background: `${config.accent}66`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AwardCard({ awardKey, candidates }) {
  const config = AWARD_CONFIG[awardKey];
  if (!config) return null;

  // Si no hay candidatos o el favorito tiene prob: 0 (Ej: ROY sin Draft)
  if (!candidates || candidates.length === 0 || candidates[0].prob === 0) {
    return <EmptyAwardCard config={config} />;
  }

  const [favorite, ...rest] = candidates;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm hover:border-slate-700 transition-colors duration-300 shadow-xl">
      <AwardHeader config={config} />
      <FavoriteBlock candidate={favorite} config={config} awardKey={awardKey} />
      <ChaseList candidates={candidates} config={config} />
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function AwardsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    // Fetch directo al JSON generado por tu Backend WPR
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

  if (!data) {
    return <div className="min-h-screen bg-slate-950 text-white p-10">Error cargando datos. Verifica nba_standings_projected.json.</div>;
  }

  const visibleKeys = activeFilter === "ALL" 
    ? Object.keys(AWARD_CONFIG) 
    : [activeFilter.toLowerCase()];

  const mvpFav = data.mvp && data.mvp.length > 0 ? data.mvp[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-6 py-6">
        <div className="pointer-events-none absolute -top-20 left-1/3 h-40 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 right-1/4 h-40 w-64 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">
                  Sports Intel Hub · Prediction Engine
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white leading-none">
                Awards Dashboard
                <span className="ml-3 text-xl font-black text-cyan-400">2026–27</span>
              </h1>
              <p className="mt-1 text-xs text-slate-500 max-w-lg">
                WPR individual · Monte Carlo 10k sims · Voter psychology model · 7 awards
              </p>
            </div>

            {mvpFav && (
              <div className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-3 shadow-lg">
                <img
                  src={mvpFav.imageUrl}
                  alt={mvpFav.name}
                  className="h-10 w-10 rounded-lg object-cover object-top border border-cyan-500/30"
                  onError={(e) => { e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png"; }}
                />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-cyan-500/70 mb-0.5">
                    MVP Favorite
                  </div>
                  <div className="text-sm font-black text-white leading-none">{mvpFav.name}</div>
                  <div className="text-xl font-black font-mono text-cyan-400 leading-none mt-0.5">
                    {getAmericanOdds(mvpFav.prob)} ({fmtProb(mvpFav.prob)})
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-5">
            {FILTERS.map((f) => {
              const active = f === activeFilter;
              const config = f !== "ALL" ? AWARD_CONFIG[f.toLowerCase()] : null;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor : active ? (config?.accent ?? "#22d3ee") : "#1e293b",
                    background  : active ? `${config?.accent ?? "#22d3ee"}18` : "transparent",
                    color       : active ? (config?.accent ?? "#22d3ee") : "#475569",
                  }}
                >
                  {f === "ALL" ? "All Awards" : f}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleKeys.map((key) => (
            <AwardCard key={key} awardKey={key} candidates={data[key]} />
          ))}
        </div>

        <div className="mt-10 border-t border-slate-800/60 pt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] text-slate-600 max-w-xl leading-relaxed">
            Proyecciones generadas por modelo WPR sobre 30 temporadas BRef. 
            Monte Carlo: 10,000 iteraciones con varianza inyectada σ=4.0. No son predicciones garantizadas.
          </p>
          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-700">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE MODEL · {new Date().toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
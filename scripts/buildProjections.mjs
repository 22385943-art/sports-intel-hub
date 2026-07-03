/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  SPORTS INTEL HUB — NBA Prediction Engine  (Nivel Vegas)                     ║
 * ║  scripts/buildProjections.mjs                                                ║
 * ║                                                                              ║
 * ║  Pilares:                                                                    ║
 * ║    1. WPR sobre TODAS las métricas (avanzadas + tradicionales)               ║
 * ║    2. Monte Carlo 10 000 iteraciones  →  % playoffs / finales / anillo       ║
 * ║    3. Predictor de premios (MVP, DPOY, ROY, MIP, 6MOY, COTY, CPOY)           ║
 * ║                                                                              ║
 * ║  Fuentes de datos:                                                           ║
 * ║    · public/data/bref_advanced_*.json  (30 temporadas BRef)                  ║
 * ║    · public/data/nba_pergame_*.json    (caché auto-generada, 16 temps.)      ║
 * ║    · public/data/nba_players_current.json                                    ║
 * ║    · public/data/nba_teams_current.json                                      ║
 * ║    · stats.nba.com / leaguedashplayerstats  (sólo en cache-miss)             ║
 * ║                                                                              ║
 * ║  Uso:                                                                        ║
 * ║    node scripts/buildProjections.mjs                                         ║
 * ║    node scripts/buildProjections.mjs --debug "Wembanyama"                    ║
 * ║    node scripts/buildProjections.mjs --skip-download   (caché siempre)       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import fs   from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '../public/data');

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — CONFIGURACIÓN GLOBAL
// ════════════════════════════════════════════════════════════════════════════

const TARGET_SEASON   = '2026-27';
const BASE_SEASON     = '2025-26';

// Parámetros de línea de comandos
const DEBUG_KEY       = (() => {
  const i = process.argv.indexOf('--debug');
  return i !== -1 ? (process.argv[i + 1] ?? '').toLowerCase() : null;
})();
const SKIP_DOWNLOAD   = process.argv.includes('--skip-download');

// ── Rate limit y timeout (conservadores para respetar la NBA API) ────────────
const RATE_LIMIT_MS   = 4000;   // 4 s entre llamadas (pipeline usa 3.8 s)
const TIMEOUT_MS      = 30_000;

// ── Temporadas con datos BRef disponibles (para métricas avanzadas) ──────────
const BREF_SEASONS = [
  '1996-97','1997-98','1998-99','1999-00','2000-01',
  '2001-02','2002-03','2003-04','2004-05','2005-06',
  '2006-07','2007-08','2008-09','2009-10','2010-11',
  '2011-12','2012-13','2013-14','2014-15','2015-16',
  '2016-17','2017-18','2018-19','2019-20','2020-21',
  '2021-22','2022-23','2023-24','2024-25','2025-26',
];

// ── Temporadas a descargar/cachear para estadísticas tradicionales ────────────
const HIST_SEASONS_PERGAME = [
  '2010-11','2011-12','2012-13','2013-14','2014-15',
  '2015-16','2016-17','2017-18','2018-19','2019-20',
  '2020-21','2021-22','2022-23','2023-24','2024-25',
  '2025-26'
];

// ── Estructura de divisiones NBA (necesaria para generar el calendario MC) ──
const NBA_DIVISIONS = {
  Eastern: {
    Atlantic : ['BOS', 'BKN', 'NYK', 'PHI', 'TOR'],
    Central  : ['CHI', 'CLE', 'DET', 'IND', 'MIL'],
    Southeast: ['ATL', 'CHA', 'MIA', 'ORL', 'WAS'],
  },
  Western: {
    Northwest: ['DEN', 'MIN', 'OKC', 'POR', 'UTA'],
    Pacific  : ['GSW', 'LAC', 'LAL', 'PHX', 'SAC'],
    Southwest: ['DAL', 'HOU', 'MEM', 'NOP', 'SAS'],
  },
};

// Mapa rápido: abreviatura → { conference, division }
const TEAM_DIV_MAP = {};
for (const [conf, divs] of Object.entries(NBA_DIVISIONS)) {
  for (const [div, abbrs] of Object.entries(divs)) {
    for (const abbr of abbrs) TEAM_DIV_MAP[abbr] = { conference: conf, division: div };
  }
}

// ── Límites físicos por métrica (clamp post-proyección) ──────────────────────
const LIMITS = {
  // Avanzadas (BRef)
  bpm  : { min: -10.0, max:  15.0 },
  per  : { min:   3.0, max:  36.0 },
  ts   : { min:  30.0, max:  80.0 },
  usg  : { min:   4.0, max:  40.0 },
  vorp : { min:  -3.0, max:  14.0 },
  ws48 : { min:  -0.15,max:   0.45},
  obpm : { min:  -8.0, max:  12.0 },
  dbpm : { min:  -6.0, max:   6.0 },
  // Tradicionales por partido
  ppg  : { min:   0.0, max:  50.0 },
  rpg  : { min:   0.0, max:  25.0 },
  apg  : { min:   0.0, max:  15.0 },
  spg  : { min:   0.0, max:   4.0 },
  bpg  : { min:   0.0, max:   5.0 },
  topg : { min:   0.0, max:   8.0 },
  fgPct    : { min:  20.0, max:  75.0 },
  threePct : { min:   0.0, max:  60.0 }, // 0 si no tira triples
  ftPct    : { min:  30.0, max: 100.0 },
  // Minutos y partidos
  mpg  : { min:   0.0, max:  42.0 },
  gp   : { min:   0,   max:  82   },
};

// ── Umbrales de alta varianza (extra shrinkage) ───────────────────────────────
const SIGMA_THRESH = {
  bpm  : 2.5,  per : 4.0,  ts  : 5.0,
  ppg  : 5.0,  rpg : 3.0,  apg : 2.5,
  spg  : 0.4,  bpg : 0.5,  topg: 1.0,
  fgPct: 4.0,  threePct: 5.0, ftPct: 6.0,
  default: 999,
};

// ── Parámetros WPR ────────────────────────────────────────────────────────────
const CFG = {
  LAMBDA         : 0.5,   // Decaimiento exponencial de recencia
  MIN_POLY_DEG2  : 3,     // Mínimo de puntos para polinomio grado 2
  SHRINKAGE_RATE : 0.6,   // α(n) = 1 − exp(−0.6·n)
  PI_Z           : 1.28,  // z para p10/p90 (80% cobertura bajo normal)
  MAX_HIST       : 15,    // Máximo temporadas BRef a incluir en WPR
  ARC_SEASONS    : 10,    // Temporadas históricas en el arc del Recharts
};

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2 — MATEMÁTICAS AVANZADAS
//
// Mejoras vs. la versión anterior:
//
//  1. Huber-IRWLS (Iteratively Re-Weighted Least Squares):
//     El WLS estándar trata todas las observaciones igual (salvo el peso de
//     recencia). Si un jugador tuvo un año atípico (lesión, COVID, rol diferente),
//     ese punto arrastra la regresión. Con Huber, hacemos DOS pasadas:
//       Pasada 1: WLS con pesos de recencia → obtenemos beta y sigma.
//       Pasada 2: calculamos residuos → cualquier residuo > 1.5σ recibe un
//                 peso adicional min(1, δ/|r_normalizado|). La segunda pasada
//                 usa pesos = recencia × huber. El resultado es un beta
//                 más robusto que aprende la trayectoria "normal".
//
//  2. Ridge Regularization: β = (X'WX + λI)⁻¹ X'Wy
//     Cuando n es pequeño (2-3 temporadas), XᵀWX puede ser casi-singular
//     o mal condicionada. La diagonal de Ridge estabiliza la inversión y
//     shrinkea los coeficientes hacia cero. λ se calibra automáticamente
//     sobre el rango observado → prior difuso pero informativo.
//
//  3. sigmoidElig(): reemplaza TODOS los hard gates de elegibilidad.
//     gp=35 → 0.04 (casi eliminado); gp=58 → 0.50; gp=75 → 0.90.
//
//  4. leagueZ(): z-score absoluto vs. la distribución de liga.
//     Preserva la magnitud real de la dominancia (BPM=14 es
//     cuantitativamente diferente de BPM=10, no sólo ordinal).
// ─────────────────────────────────────────────────────────────────────────────

/** Inversa de una matriz 3×3 (row-major) por cofactores de Cramer. */
function inv3x3(m) {
  const [a, b, c, d, e, f, g, h, k] = m;
  const det =
    a * (e * k - f * h) -
    b * (d * k - f * g) +
    c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const id = 1 / det;
  return [
    (e * k - f * h) * id, (c * h - b * k) * id, (b * f - c * e) * id,
    (f * g - d * k) * id, (a * k - c * g) * id, (c * d - a * f) * id,
    (d * h - e * g) * id, (b * g - a * h) * id, (a * e - b * d) * id,
  ];
}

/** Producto M(3×3) × v(3×1). */
function mulM3V3(m, v) {
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2],
  ];
}

/**
 * WLS con Ridge Regularization (núcleo interno, sin Huber).
 *
 * β = (X'WX + λI)⁻¹ X'Wy
 *
 * λ auto-calibrado: range² / 64 (prior difuso sobre el rango observado).
 * Para n ≥ 5 con buena varianza, λ es tan pequeño que es negligible.
 * Para n = 2 con rango grande, λ previene coeficientes explosivos.
 */
function wlsRidge(times, values, weights, degree = 2, ridge = 0) {
  const n = times.length;
  if (n === 0) return { beta: [0, 0, 0], sigma: 999, valid: false };
  const d = Math.min(degree, n - 1);
  
  let S0=0, S1=0, S2=0, S3=0, S4=0;
  let T0=0, T1=0, T2=0;
  for (let k = 0; k < n; k++) {
    const t = times[k], y = values[k], w = weights[k];
    S0+=w; S1+=w*t; S2+=w*t*t; S3+=w*t*t*t; S4+=w*t*t*t*t;
    T0+=w*y; T1+=w*t*y; T2+=w*t*t*y;
  }
  
  let beta;
  if (d === 2) {
    // Ridge: suma λ a la diagonal de XᵀWX
    const Ainv = inv3x3([S0+ridge, S1, S2, S1, S2+ridge, S3, S2, S3, S4+ridge]);
    beta = Ainv ? mulM3V3(Ainv, [T0, T1, T2]) : [S0>0 ? T0/S0 : 0, 0, 0];
  } else {
    const det = (S0+ridge) * (S2+ridge) - S1 * S1;
    beta = Math.abs(det) > 1e-12
      ? [((S2+ridge)*T0 - S1*T1)/det, ((S0+ridge)*T1 - S1*T0)/det, 0]
      : [S0>0 ? T0/S0 : 0, 0, 0];
  }
  
  const nPar = d + 1;
  let sse = 0, totalW = 0;
  for (let k = 0; k < n; k++) {
    const yHat = beta[0] + beta[1]*times[k] + beta[2]*times[k]*times[k];
    sse    += weights[k] * (values[k] - yHat) ** 2;
    totalW += weights[k];
  }
  const sigma = n > nPar
    ? Math.sqrt(sse / (totalW * Math.max(0.01, 1 - nPar/n)))
    : Math.sqrt(sse / Math.max(1, totalW));
    
  return { beta, sigma, valid: true };
}

/**
 * Pesos Huber para la segunda pasada de IRWLS.
 *
 * Función de influencia: ψ(r) = r si |r/σ| ≤ δ, δ·sign(r) si |r/σ| > δ
 * Peso equivalente:       w_H  = min(1, δ / |r/σ|)
 *
 * δ = 1.5 es el valor estándar en estadística robusta. Con δ=1.5:
 *   · residuo = 0.5σ → w_H = 1.00 (sin penalización)
 *   · residuo = 1.5σ → w_H = 1.00 (en el umbral)
 *   · residuo = 3.0σ → w_H = 0.50 (penalización moderada)
 *   · residuo = 6.0σ → w_H = 0.25 (temporada claramente anómala)
 *
 * @param {number[]} residuals  Residuos de la primera pasada
 * @param {number}   sigma      Desviación estándar de los residuos
 * @param {number}   delta      Constante de Huber (default 1.5)
 */
function huberWeights(residuals, sigma, delta = 1.5) {
  const sig = Math.max(sigma, 1e-6);
  return residuals.map(r => {
    const absNorm = Math.abs(r / sig);
    return absNorm <= delta ? 1.0 : Math.min(1.0, delta / absNorm);
  });
}

/**
 * WLS principal: recencia → Ridge → Huber IRWLS.
 *
 * Este es el único punto de entrada que llaman projectMetric y projectPlayer.
 * Las dos pasadas internas (wlsRidge) son invisibles para el resto del código.
 *
 * Pasada 1: pesos = exp(λ·t) [recencia pura]
 * Pasada 2: pesos = exp(λ·t) × w_Huber(residuos pasada 1) [recencia + robustez]
 *
 * Si n ≤ 2, se devuelve directamente el resultado de la pasada 1
 * (no tiene sentido Huber con tan pocos puntos).
 */
function wls(times, values, weights, degree = 2) {
  if (times.length === 0) return { beta: [0, 0, 0], sigma: 999, valid: false };
  
  // Calibración automática de Ridge: λ = (rango / 8)²
  const vMin = Math.min(...values), vMax = Math.max(...values);
  const lambda = Math.max(1e-6, ((vMax - vMin) / 8) ** 2);
  
  // ── PASADA 1: WLS con recencia + Ridge ────────────────────────────────────
  const pass1 = wlsRidge(times, values, weights, degree, lambda);
  if (!pass1.valid || times.length <= 2) return pass1;
  
  // ── PASADA 2: Huber re-ponderación ───────────────────────────────────────
  const residuals = times.map((t, k) => {
    const yHat = pass1.beta[0] + pass1.beta[1]*t + pass1.beta[2]*t*t;
    return values[k] - yHat;
  });
  const hW  = huberWeights(residuals, pass1.sigma);
  const w2  = weights.map((w, k) => w * hW[k]);
  
  const pass2 = wlsRidge(times, values, w2, degree, lambda * 0.5);
  return pass2.valid ? pass2 : pass1;
}

const evalPoly    = (beta, t) => beta[0] + beta[1]*t + beta[2]*t*t;
const derivative1 = (beta, t) => beta[1] + 2*beta[2]*t;
const derivative2 = (beta)    => 2 * beta[2];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2    = (v) => Math.round(v * 100) / 100;
const r1    = (v) => Math.round(v * 10)  / 10;
const rN    = (v, n) => Math.round(v * 10**n) / 10**n;

/** N(μ, σ) via Box-Muller — para Monte Carlo. */
function gaussianRandom(mean = 0, std = 1) {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * (Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random()));
}

/** Softmax con temperatura T. */
function softmax(scores, T = 1.0) {
  const max  = Math.max(...scores);
  const exps = scores.map(s => Math.exp((s - max) / T));
  const sum  = exps.reduce((a, b) => a + b, 1e-12);
  return exps.map(e => e / sum);
}

/** Percentil mid-rank (compatibilidad con código existente). */
function pctileInArray(val, arr) {
  if (!arr?.length || val === undefined || isNaN(val)) return 50;
  const below = arr.filter(v => v < val).length;
  const equal = arr.filter(v => v === val).length;
  return Math.min(100, Math.round(((below + 0.5 * equal) / arr.length) * 100));
}

/**
 * Sigmoid continua — reemplaza TODOS los hard gates de elegibilidad.
 *
 * sigmoidElig(gp, 58, 7):
 *   gp=35 → 0.04   gp=51 → 0.30   gp=58 → 0.50
 *   gp=65 → 0.73   gp=74 → 0.90   gp=82 → 0.95
 *
 * @param {number} value     Valor observado
 * @param {number} center    Umbral oficial (NBA eligibility)
 * @param {number} bandwidth Suavidad de la transición
 */
function sigmoidElig(value, center, bandwidth = 7) {
  return 1 / (1 + Math.exp(-(value - center) / bandwidth));
}

/**
 * Computa media y desviación estándar de cada distribución.
 * Se llama una vez antes del bucle de candidatos → cero recómputo.
 *
 * @param  {object} dists  Resultado de buildProjDists() — arrays ordenados
 * @returns {object}       { bpm: {mean, std}, ppg: {mean, std}, ... }
 */
function computeLeagueStats(dists) {
  const stats = {};
  for (const [key, arr] of Object.entries(dists)) {
    if (!arr.length) { stats[key] = { mean: 0, std: 1 }; continue; }
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std  = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length) || 1;
    stats[key] = { mean, std };
  }
  return stats;
}

/**
 * Z-score absoluto de un valor respecto a la distribución de liga.
 *
 * ¿Por qué z-score en vez de percentil para los premios?
 *   Con percentiles: BPM=14 → 0.99,  BPM=10 → 0.96  → Δ = 0.03 (aplastado)
 *   Con z-score:    BPM=14 → z≈4.5,  BPM=10 → z≈3.2  → Δ = 1.3σ (real)
 *
 * El softmax con temperatura baja amplifica exponencialmente esta diferencia:
 * exp(4.5/T) / exp(3.2/T) = exp(1.3/T) → con T=0.18, ese ratio es ~1400×.
 * El favorito real aplasta al resto — como en Las Vegas.
 *
 * @param {number} value   Valor proyectado p50
 * @param {object} ls      Salida de computeLeagueStats()
 * @param {string} metric  Clave de la distribución
 * @param {number} cap     Máximo z (evita outliers artificiales)
 */
function leagueZ(value, ls, metric, cap = 5.0) {
  const { mean, std } = ls[metric] ?? { mean: 0, std: 1 };
  return clamp((value - mean) / std, -cap, cap);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3 — NBA API FETCHER (rate-limited, con caché 500 en 1er intento)
// ─────────────────────────────────────────────────────────────────────────────

const NBA_HEADERS = {
  'Accept'            : 'application/json, text/plain, */*',
  'Accept-Language'   : 'en-US,en;q=0.9',
  'Cache-Control'     : 'no-cache',
  'Connection'        : 'keep-alive',
  'Host'              : 'stats.nba.com',
  'Origin'            : 'https://www.nba.com',
  'Pragma'            : 'no-cache',
  'Referer'           : 'https://www.nba.com/',
  'User-Agent'        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token' : 'true',
};

let lastFetchAt = 0;

async function fetchFromNBA(endpoint, retries = 3) {
  const url = `https://stats.nba.com/stats${endpoint}`;

  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  lastFetchAt = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      process.stdout.write(`  → ${endpoint.split('?')[0].replace('/', '')}…`);
      const res = await fetch(url, {
        headers: NBA_HEADERS,
        signal : AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.status === 500) {
        process.stdout.write(' ⚠️  HTTP 500 (sin datos)\n');
        return null;
      }
      if (res.status === 429) {
        const wait = attempt * 12_000;
        process.stdout.write(` ⏳ 429 — esperando ${wait/1000}s…\n`);
        await sleep(wait);
        lastFetchAt = Date.now();
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      if (!text.trim().startsWith('{')) throw new Error('Respuesta no-JSON');

      const data = JSON.parse(text);
      if (!data?.resultSets?.[0]) throw new Error('resultSets vacío');

      process.stdout.write(' ✓\n');
      return data;

    } catch (err) {
      if (attempt < retries) {
        const wait = attempt * 5000;
        process.stdout.write(` ⚠️  ${err.message} — reintento en ${wait/1000}s\n`);
        await sleep(wait);
        lastFetchAt = Date.now();
      } else {
        process.stdout.write(` ❌ ${err.message}\n`);
        return null;
      }
    }
  }
  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 4 — DESCARGA Y CACHÉ DE ESTADÍSTICAS TRADICIONALES HISTÓRICAS
// ─────────────────────────────────────────────────────────────────────────────

const PERGAME_URL_PARAMS =
  `?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=` +
  `&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00` +
  `&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0` +
  `&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=` +
  `&PlusMinus=N&Rank=N&SeasonSegment=&SeasonType=Regular%20Season` +
  `&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=&Weight=`;

async function fetchPerGameSeason(season) {
  const url  = `${PERGAME_URL_PARAMS}&Season=${season}`;
  const data = await fetchFromNBA(`/leaguedashplayerstats${url}`);
  if (!data) return null;

  const rs      = data.resultSets[0];
  const headers = rs.headers;

  const g  = (row, key)  => {
    const i = headers.indexOf(key);
    return i !== -1 && row[i] !== null ? Number(row[i]) : 0;
  };
  const gs = (row, key, fb = '') => {
    const i = headers.indexOf(key);
    return i !== -1 && row[i] !== null ? String(row[i]) : fb;
  };

  return rs.rowSet.map(row => {
    const fga = g(row, 'FGA'), fgm = g(row, 'FGM');
    const fg3a = g(row, 'FG3A'), fg3m = g(row, 'FG3M');
    const fta  = g(row, 'FTA'),  ftm  = g(row, 'FTM');
    const min  = g(row, 'MIN');
    const gp   = g(row, 'GP');

    const normPct = (v) => v > 0 && v < 1 ? v * 100 : v;

    return {
      id      : gs(row, 'PLAYER_ID'),
      name    : gs(row, 'PLAYER_NAME'),
      teamId  : gs(row, 'TEAM_ABBREVIATION'),
      gp, mpg : min,
      ppg     : g(row, 'PTS'),
      rpg     : g(row, 'REB'),
      apg     : g(row, 'AST'),
      spg     : g(row, 'STL'),
      bpg     : g(row, 'BLK'),
      topg    : g(row, 'TOV'),
      oreb    : g(row, 'OREB'),
      dreb    : g(row, 'DREB'),
      fga, fgm,
      fgPct   : fga > 0 ? normPct(g(row, 'FG_PCT'))  : 0,
      fg3a, fg3m,
      threePct: fg3a > 0 ? normPct(g(row, 'FG3_PCT')) : 0,
      fta, ftm,
      ftPct   : fta > 0 ? normPct(g(row, 'FT_PCT'))   : 0,
    };
  });
}

async function downloadTraditionalHistory() {
  if (SKIP_DOWNLOAD) {
    console.log('  ⏩ --skip-download activo: usando caché existente.');
  }

  const perGameMap = new Map();
  let fetched = 0, cached = 0;

  for (const season of HIST_SEASONS_PERGAME) {
    const cacheFile = path.join(DATA_DIR, `nba_pergame_${season}.json`);
    let seasonData  = null;

    if (!SKIP_DOWNLOAD) {
      try {
        const raw = await fs.readFile(cacheFile, 'utf-8');
        seasonData = JSON.parse(raw);
        cached++;
      } catch {
        // Cache miss
      }
    }

    if (!seasonData && !SKIP_DOWNLOAD) {
      console.log(`  📡 Descargando ${season}…`);
      seasonData = await fetchPerGameSeason(season);
      if (seasonData) {
        await fs.writeFile(cacheFile, JSON.stringify(seasonData, null, 2), 'utf-8');
        fetched++;
      } else {
        console.warn(`  ⚠️  No se pudo obtener datos para ${season}. Se omite.`);
        continue;
      }
    } else if (!seasonData) {
      try {
        const raw  = await fs.readFile(cacheFile, 'utf-8');
        seasonData = JSON.parse(raw);
        cached++;
      } catch {
        console.warn(`  ⚠️  Caché no encontrada para ${season} y --skip-download activo. Se omite.`);
        continue;
      }
    }

    for (const player of seasonData) {
      const pid = String(player.id);
      if (!perGameMap.has(pid)) perGameMap.set(pid, []);
      perGameMap.get(pid).push({
        season,
        gp      : player.gp,
        mpg     : player.mpg,
        ppg     : player.ppg,
        rpg     : player.rpg,
        apg     : player.apg,
        spg     : player.spg,
        bpg     : player.bpg,
        topg    : player.topg,
        fgPct   : player.fgPct,
        threePct: player.threePct,
        ftPct   : player.ftPct,
      });
    }
  }

  console.log(
    `  ✅ Estadísticas tradicionales listas:` +
    ` ${fetched} temporadas descargadas, ${cached} desde caché.` +
    ` (${perGameMap.size} jugadores en historial)`
  );
  return perGameMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 5 — CARGA DE DATOS
// ─────────────────────────────────────────────────────────────────────────────

const normName = (n) =>
  (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

async function readJSON(file) {
  const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
  return JSON.parse(raw);
}

async function loadCurrentData() {
  const [pFile, tFile] = await Promise.all([
    readJSON('nba_players_current.json'),
    readJSON('nba_teams_current.json'),
  ]);
  return {
    players: pFile.players ?? pFile,
    teams  : tFile.teams   ?? tFile,
  };
}

async function buildBRefHistoryMap() {
  const map     = new Map();
  const seasons = BREF_SEASONS.slice(-CFG.MAX_HIST);

  for (const season of seasons) {
    let data;
    try { data = await readJSON(`bref_advanced_${season}.json`); }
    catch { continue; }

    for (const entry of data) {
      const key = normName(entry.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        season,
        bpm  : entry.bpm  ?? null,
        per  : entry.per  ?? null,
        ts   : entry.ts   ?? null,
        usg  : entry.usg  ?? null,
        vorp : entry.vorp ?? null,
        ws48 : entry.ws48 ?? null,
        obpm : entry.obpm ?? null,
        dbpm : entry.dbpm ?? null,
      });
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 6 — MOTOR WPR AVANZADO (PROYECCIÓN INDIVIDUAL)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula estadísticas de disponibilidad histórica a partir de los GP.
 * Se usa como prior bayesiano para la proyección de GP.
 *
 * @param {Array} perGameHistory  [{season, gp, ...}]
 * @returns {{ mean: number, std: number }}
 */
function availabilityStats(perGameHistory) {
  const rates = perGameHistory
    .map(h => (h.gp ?? 0) / 82)
    .filter(r => r > 0);
    
  if (!rates.length) return { mean: 0.79, std: 0.15 };
  
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const std  = Math.sqrt(rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length) || 0.12;
  return { mean, std };
}

/**
 * Detecta temporadas anómalas comparando cada valor contra la media histórica.
 * Criterio: |v - mean| > 2.5 × std
 */
function detectAnomalies(vals, threshold = 2.5) {
  if (vals.length < 3) return vals.map(() => false);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
  return vals.map(v => Math.abs(v - mean) > threshold * std);
}

/**
 * Shrinkage adaptativo basado en CV (Coeficiente de Variación).
 */
function adaptiveShrinkage(n, cvResidual) {
  const alphaBase = 1 - Math.exp(-CFG.SHRINKAGE_RATE * n);
  const alphaVol  = 1 / (1 + cvResidual * 0.6);
  return Math.min(0.99, alphaBase * alphaVol);
}

function classifyTrend(mom, acc, nSeasons) {
  if (nSeasons < 2)                            return 'insufficient_data';
  if (mom > 0.8  && acc > 0)                  return 'breakout';
  if (mom > 0.3)                              return 'improving';
  if (Math.abs(mom) <= 0.3 && acc < -0.1)    return 'peak_plateau';
  if (Math.abs(mom) <= 0.3)                  return 'stable';
  if (mom < -0.8 || (mom < -0.4 && acc < 0)) return 'steep_decline';
  if (mom < -0.3)                             return 'gradual_decline';
  return 'stable';
}

/**
 * Proyecta UNA métrica para UN jugador.
 */
function projectMetric(seasonValues, metric, leagueMean, debug = false) {
  const lim    = LIMITS[metric] ?? { min: -1e9, max: 1e9 };
  const sigThr = SIGMA_THRESH[metric] ?? SIGMA_THRESH.default;

  const valid = seasonValues
    .map((v, i) => ({ idx: i, v }))
    .filter(({ v }) => v !== null && v !== undefined && !isNaN(Number(v)));

  const n = valid.length;
  if (n === 0) {
    return {
      p10: r2(leagueMean), p50: r2(leagueMean), p90: r2(leagueMean),
      momentum: 0, acceleration: 0, trend: 'insufficient_data',
      nSeasons: 0, confidence: 'none', anomaliesDetected: 0,
    };
  }

  const lastIdx = valid[valid.length - 1].idx;
  const times   = valid.map(({ idx }) => idx - lastIdx);
  const vals    = valid.map(({ v })   => Number(v));

  const recencyW = times.map(t => Math.exp(CFG.LAMBDA * t));
  const degree = n >= CFG.MIN_POLY_DEG2 ? 2 : 1;
  
  const { beta, sigma, valid: wlsOk } = wls(times, vals, recencyW, degree);
  
  const residuals  = times.map((t, k) => vals[k] - evalPoly(beta, t));
  const isAnomaly  = detectAnomalies(vals);
  const nAnomalies = isAnomaly.filter(Boolean).length;
  
  if (debug) {
    const βStr = beta.map(b => b.toFixed(3)).join(', ');
    process.stdout.write(
      `    [${metric.padEnd(9)}] n=${String(n).padStart(2)} deg=${degree}` +
      `  β=[${βStr}]  σ=${sigma.toFixed(3)}  anom=${nAnomalies}\n`
    );
  }

  const rawProj = wlsOk ? evalPoly(beta, 1) : vals[vals.length - 1];
  const mom     = wlsOk ? derivative1(beta, 0) : 0;
  const acc     = wlsOk ? derivative2(beta)    : 0;

  const meanAbs = Math.abs(vals.reduce((a, b) => a + b, 0) / vals.length) || 1;
  const cv      = sigma / meanAbs;
  const alpha   = adaptiveShrinkage(n, cv);
  
  const shrunk = alpha * rawProj + (1 - alpha) * leagueMean;
  const p50    = r2(clamp(shrunk, lim.min, lim.max));

  const sigmaEpistemic = sigma * Math.max(1, Math.sqrt(4 / n));
  const sigmaFinal     = sigmaEpistemic * (1 + nAnomalies * 0.20);
  
  const p10 = r2(clamp(p50 - CFG.PI_Z * sigmaFinal, lim.min, lim.max));
  const p90 = r2(clamp(p50 + CFG.PI_Z * sigmaFinal, lim.min, lim.max));

  const confidence =
    n >= 5 && sigma < sigThr * 0.8 && nAnomalies === 0 ? 'high'   :
    n >= 3                                              ? 'medium' : 'low';

  return {
    p10, p50, p90,
    momentum         : rN(mom, 3),
    acceleration     : rN(acc, 3),
    trend            : classifyTrend(mom, acc, n),
    nSeasons         : n,
    confidence,
    anomaliesDetected: nAnomalies,
  };
}

function compositePlayerTrend(proj) {
  const candidates = [
    proj.bpm?.trend, proj.bpm?.trend,  // BPM pesa doble
    proj.per?.trend,
    proj.vorp?.trend,
  ].filter(Boolean);
  const counts = {};
  candidates.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'stable';
}

function buildArc(brefHistory, proj) {
  const arc = brefHistory.slice(-CFG.ARC_SEASONS).map(h => ({
    season: h.season, bpm: h.bpm, per: h.per, ts: h.ts, vorp: h.vorp,
    isProjection: false,
  }));
  
  arc.push({
    season     : TARGET_SEASON,
    bpm        : proj.bpm?.p50,  bpm_p10 : proj.bpm?.p10,  bpm_p90 : proj.bpm?.p90,
    per        : proj.per?.p50,  per_p10 : proj.per?.p10,  per_p90 : proj.per?.p90,
    ts         : proj.ts?.p50,   ts_p10  : proj.ts?.p10,   ts_p90  : proj.ts?.p90,
    vorp       : proj.vorp?.p50, vorp_p10: proj.vorp?.p10, vorp_p90: proj.vorp?.p90,
    isProjection: true,
  });
  
  return arc;
}

/**
 * Proyecta UN jugador sobre las 17 métricas.
 */
function projectPlayer(player, brefHistory, perGameHistory, leagueAvgs) {
  const isDebug = DEBUG_KEY && normName(player.name).includes(DEBUG_KEY);

  if (isDebug) {
    process.stdout.write(`\n  ${'─'.repeat(60)}\n`);
    process.stdout.write(
      `  DEBUG: ${player.name}  (BRef: ${brefHistory.length} | PerGame: ${perGameHistory.length})\n`
    );
    process.stdout.write(
      `  Actual: GP=${player.stats?.gp}  MPG=${player.stats?.mpg}  BPM=${player.adv?.bpm}\n`
    );
  }

  const brefSeries    = (key) => brefHistory.map(h => h[key]);
  const perGameSeries = (key) => perGameHistory.map(h => h[key]);

  // ── Métricas avanzadas (BRef) ─────────────────────────────────────────────
  const proj = {
    bpm  : projectMetric(brefSeries('bpm'),  'bpm',  leagueAvgs.bpm,  isDebug),
    per  : projectMetric(brefSeries('per'),  'per',  leagueAvgs.per,  isDebug),
    ts   : projectMetric(brefSeries('ts'),   'ts',   leagueAvgs.ts,   isDebug),
    usg  : projectMetric(brefSeries('usg'),  'usg',  leagueAvgs.usg,  isDebug),
    vorp : projectMetric(brefSeries('vorp'), 'vorp', leagueAvgs.vorp, isDebug),
    ws48 : projectMetric(brefSeries('ws48'), 'ws48', leagueAvgs.ws48, isDebug),
    obpm : projectMetric(brefSeries('obpm'), 'obpm', leagueAvgs.obpm, isDebug),
    dbpm : projectMetric(brefSeries('dbpm'), 'dbpm', leagueAvgs.dbpm, isDebug),
  };

  // ── Métricas tradicionales (NBA API) ─────────────────────────────────────
  proj.ppg     = projectMetric(perGameSeries('ppg'),      'ppg',     leagueAvgs.ppg,     isDebug);
  proj.rpg     = projectMetric(perGameSeries('rpg'),      'rpg',     leagueAvgs.rpg,     isDebug);
  proj.apg     = projectMetric(perGameSeries('apg'),      'apg',     leagueAvgs.apg,     isDebug);
  proj.spg     = projectMetric(perGameSeries('spg'),      'spg',     leagueAvgs.spg,     isDebug);
  proj.bpg     = projectMetric(perGameSeries('bpg'),      'bpg',     leagueAvgs.bpg,     isDebug);
  proj.topg    = projectMetric(perGameSeries('topg'),     'topg',    leagueAvgs.topg,    isDebug);
  proj.fgPct   = projectMetric(perGameSeries('fgPct'),    'fgPct',   leagueAvgs.fgPct,   isDebug);
  proj.threePct= projectMetric(perGameSeries('threePct'), 'threePct',leagueAvgs.threePct,isDebug);
  proj.ftPct   = projectMetric(perGameSeries('ftPct'),    'ftPct',   leagueAvgs.ftPct,   isDebug);

  // ── MPG logístico con techo individualizado ───────────────────────────────
  const curMPG     = player.stats?.mpg ?? 12;
  const mpgVals    = perGameHistory.map(h => h.mpg ?? 0).filter(v => v > 0);
  const mpgCeiling = mpgVals.length > 0 ? Math.max(...mpgVals) : curMPG;

  if (perGameHistory.length >= 3) {
    const mpgWPR = projectMetric(perGameSeries('mpg'), 'mpg', curMPG, isDebug);
    const mpgP50 = r1(clamp(mpgWPR.p50, Math.max(0, curMPG - 4), Math.min(mpgCeiling + 2, 40)));
    proj.mpg = {
      ...mpgWPR,
      p10: r1(clamp(mpgP50 - 3.5, 0, 40)),
      p50: mpgP50,
      p90: r1(clamp(mpgP50 + 3.5, 0, Math.min(mpgCeiling + 3, 42))),
    };
  } else {
    const mpgP50 = r1(clamp(curMPG, 0, 40));
    proj.mpg = {
      p10: r1(clamp(mpgP50 - 4, 0, 40)), p50: mpgP50, p90: r1(clamp(mpgP50 + 4, 0, 42)),
      nSeasons: perGameHistory.length, confidence: 'low',
      momentum: 0, acceleration: 0, trend: 'stable', anomaliesDetected: 0,
    };
  }

  // ── GP bayesiano con prior de disponibilidad ─────────────────────────────
  const avail = availabilityStats(perGameHistory);
  const curGP = player.stats?.gp ?? Math.round(avail.mean * 82);

  if (perGameHistory.length >= 3) {
    const gpWPR   = projectMetric(perGameSeries('gp'), 'gp', curGP, isDebug);
    const priorGP = Math.round(avail.mean * 82);
    const alphaBayes = adaptiveShrinkage(perGameHistory.length, avail.std);
    
    const gpP50   = Math.round(clamp(alphaBayes * gpWPR.p50 + (1 - alphaBayes) * priorGP, 0, 82));
    const halfBand = Math.round(clamp(avail.std * 82 * 1.5, 8, 26));
    
    proj.gp = {
      ...gpWPR,
      p10: Math.round(clamp(gpP50 - halfBand, 0, 82)),
      p50: gpP50,
      p90: Math.round(clamp(gpP50 + halfBand * 0.6, 0, 82)),
      confidence: 'low',
    };
  } else {
    const gpP50 = Math.round(clamp(0.80 * curGP + 0.20 * Math.round(avail.mean * 82), 0, 82));
    proj.gp = {
      p10: Math.round(clamp(gpP50 - 18, 0, 82)), p50: gpP50,
      p90: Math.round(clamp(gpP50 + 12, 0, 82)),
      nSeasons: 0, confidence: 'low',
      momentum: 0, acceleration: 0, trend: 'stable', anomaliesDetected: 0,
    };
  }

  if (isDebug) {
    process.stdout.write(`  Tendencia: ${compositePlayerTrend(proj)}\n`);
    process.stdout.write(
      `  BPM  ${proj.bpm.p10}/${proj.bpm.p50}/${proj.bpm.p90}` +
      `  (anom=${proj.bpm.anomaliesDetected}  α=${adaptiveShrinkage(brefHistory.length, 0).toFixed(2)})\n`
    );
    process.stdout.write(
      `  MPG  ${proj.mpg.p10}/${proj.mpg.p50}/${proj.mpg.p90}  (ceiling=${r1(mpgCeiling)})\n`
    );
    process.stdout.write(
      `  GP   ${proj.gp.p10}/${proj.gp.p50}/${proj.gp.p90}  (avail_mean=${r2(avail.mean)}±${r2(avail.std)})\n`
    );
  }

  return {
    id             : player.id,
    name           : player.name,
    teamId         : player.teamId,
    imageUrl       : player.imageUrl,
    currentSeason  : {
      gp:player.stats?.gp??0, mpg:player.stats?.mpg??0,
      ppg:player.stats?.ppg??0, rpg:player.stats?.rpg??0, apg:player.stats?.apg??0,
      spg:player.stats?.spg??0, bpg:player.stats?.bpg??0, topg:player.stats?.topg??0,
      fgPct:player.stats?.fgPct??0, threePct:player.stats?.threePct??0, ftPct:player.stats?.ftPct??0,
      bpm:player.adv?.bpm??0, per:player.adv?.per??0, ts:player.adv?.ts??0,
      vorp:player.adv?.vorp??0, obpm:player.adv?.obpm??0, dbpm:player.adv?.dbpm??0,
      rating:player.rating?.ovr??null,
    },
    seasonsInHistory: Math.max(brefHistory.length, perGameHistory.length),
    brefSeasons     : brefHistory.length,
    perGameSeasons  : perGameHistory.length,
    trend           : compositePlayerTrend(proj),
    projections     : proj,
    historicalArc   : buildArc(brefHistory, proj),
    awardOdds       : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 7 — PROYECCIÓN DE EQUIPOS (TOP-HEAVY SYNERGY MODEL)
// ─────────────────────────────────────────────────────────────────────────────

const TIER1_THRESH = 4.0;   // OBPM mínimo para amplificación convexa
const STAR_GAMMA   = 0.12;  // Factor de curvatura Tier 1 (calibrado)
const CALIB        = 2.0;   // SUBIDO de 1.20 → 2.0 para spread realista

function starAmplify(obpm) {
  const excess = Math.max(0, obpm - TIER1_THRESH);
  return obpm + STAR_GAMMA * excess * excess;
}

function defStarAmplify(dbpm) {
  const excess = Math.max(0, dbpm - 2.5);
  return dbpm + (STAR_GAMMA * 0.8) * excess * excess;
}

function noStarTax(maxOBPM) {
  if (maxOBPM >= TIER1_THRESH) return 0;
  const gap = TIER1_THRESH - maxOBPM;
  return Math.max(-5.5, -(gap * 0.55 * (1 + 0.10 * gap)));
}

function computeSynergyAdj(roster, projMap, totalMPG) {
  if (!roster.length) return 0;
  let scoringCov = 0, playmakingCov = 0, defCov = 0, spacingCov = 0;
  for (const p of roster) {
    const proj = projMap[p.id]?.projections;
    if (!proj) continue;
    const mpg   = proj.mpg?.p50 ?? (p.stats?.mpg ?? 10);
    const share = mpg / Math.max(totalMPG, 1);
    const usg   = proj.usg?.p50  ?? 15;
    const obpm  = proj.obpm?.p50 ?? -2;
    const dbpm  = proj.dbpm?.p50 ?? -2;
    const ts    = proj.ts?.p50   ?? 50;
    const apg   = proj.apg?.p50  ?? (p.stats?.apg ?? 1);
    scoringCov    += Math.max(0, usg - 24) * share;
    playmakingCov += Math.max(0, obpm) * share * Math.min(1, apg / 5);
    defCov        += Math.max(0, dbpm - 1.0) * share;
    spacingCov    += Math.max(0, ts - 57) * share * (usg < 23 ? 1.0 : 0.3);
  }
  const score = scoringCov * 0.30 + playmakingCov * 0.35 + defCov * 0.25 + spacingCov * 0.10;
  const S = 2.5;
  return r2(S * Math.tanh(score / S));
}

function pythagorean(ortg, drtg, games = 82) {
  const E = 14;
  const w = Math.pow(ortg, E) / (Math.pow(ortg, E) + Math.pow(drtg, E));
  return r1(w * games);
}

function projectTeam(team, roster, projMap) {
  if (!roster.length) {
    const nr = team.adv?.netRtg ?? 0;
    const ortg = r1(115 + nr / 2), drtg = r1(115 - nr / 2);
    return { ortg, drtg, netRtg: nr, baseWins: pythagorean(ortg, drtg), synAdj: 0, starTax: 0, wins: pythagorean(ortg, drtg), rosterSize: 0 };
  }
  const mpgList  = roster.map(p => ({
    id : p.id,
    mpg: projMap[p.id]?.projections?.mpg?.p50 ?? (p.stats?.mpg ?? 10),
  }));
  const totalMPG = mpgList.reduce((s, x) => s + x.mpg, 0) || 240;
  let wOBPM_eff = 0, wDBPM_eff = 0, maxOBPM = -99;
  for (const { id, mpg } of mpgList) {
    const share = mpg / totalMPG;
    const proj  = projMap[id]?.projections;
    const obpm  = proj?.obpm?.p50 ?? 0;
    const dbpm  = proj?.dbpm?.p50 ?? 0;
    wOBPM_eff += starAmplify(obpm) * share;
    wDBPM_eff += defStarAmplify(dbpm) * share;
    if (obpm > maxOBPM) maxOBPM = obpm;
  }
  const tax      = noStarTax(maxOBPM);
  const ortg     = r1(115 + wOBPM_eff * CALIB + tax);
  const drtg     = r1(115 - wDBPM_eff * CALIB);
  const netRtg   = r1(ortg - drtg);
  const baseWins = pythagorean(ortg, drtg);
  const synAdj   = computeSynergyAdj(roster, projMap, totalMPG);
  const wins     = r1(clamp(baseWins + synAdj, 0, 82));
  return { ortg, drtg, netRtg, baseWins, synAdj, starTax: r2(tax), wins, rosterSize: roster.length };
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 8 — GENERADOR DE CALENDARIO NBA
// ════════════════════════════════════════════════════════════════════════════

const HOME_ADV    = 2.5;   // Ventaja local en puntos de Net Rating
const PROJ_SIGMA  = 4.0;   // Incertidumbre de proyección
const N_SIMS      = 10_000;
const PLAYOFF_HOME_PATTERN = [true, true, false, false, true, false, true];

function generateSchedule(teams) {
  const games = [];
  const n     = teams.length;

  for (let i = 0; i < n; i++) {
    const abbrA = teams[i].abbreviation;
    const infoA = TEAM_DIV_MAP[abbrA] ?? {};

    for (let j = i + 1; j < n; j++) {
      const abbrB = teams[j].abbreviation;
      const infoB = TEAM_DIV_MAP[abbrB] ?? {};

      const sameDiv  = infoA.division    && infoA.division    === infoB.division;
      const sameConf = infoA.conference  && infoA.conference  === infoB.conference;

      const total   = sameDiv ? 4 : sameConf ? 3 : 2;
      const iHome   = Math.ceil(total / 2);
      const jHome   = total - iHome;

      for (let g = 0; g < iHome; g++) games.push([i, j]);
      for (let g = 0; g < jHome; g++) games.push([j, i]);
    }
  }
  return games;
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 9 — MOTOR MONTE CARLO
// ════════════════════════════════════════════════════════════════════════════

function winProb(homeRating, awayRating, homeAdv = HOME_ADV) {
  return 1 / (1 + Math.exp(-((homeRating - awayRating + homeAdv) * 0.2)));
}

function simulateSeries(idxA, idxB, ratings) {
  const aIsHigher = ratings[idxA] >= ratings[idxB];
  const highIdx   = aIsHigher ? idxA : idxB;
  const lowIdx    = aIsHigher ? idxB : idxA;

  let wH = 0, wL = 0, g = 0;
  while (wH < 4 && wL < 4) {
    const highHome = PLAYOFF_HOME_PATTERN[g];
    const prob = winProb(
      highHome ? ratings[highIdx] : ratings[lowIdx],
      highHome ? ratings[lowIdx]  : ratings[highIdx]
    );
    const homeWins = Math.random() < prob;
    if (homeWins === highHome) wH++; else wL++;
    g++;
  }
  return wH > wL ? highIdx : lowIdx;
}

function simulatePlayIn(seeds7to10, ratings) {
  const [t7, t8, t9, t10] = seeds7to10;
  const j1HomeWins = Math.random() < winProb(ratings[t7], ratings[t8]);
  const winner78   = j1HomeWins ? t7 : t8;
  const loser78    = j1HomeWins ? t8 : t7;
  const j2HomeWins = Math.random() < winProb(ratings[t9], ratings[t10]);
  const winner910  = j2HomeWins ? t9 : t10;
  const j3HomeWins = Math.random() < winProb(ratings[loser78], ratings[winner910]);
  const seed8      = j3HomeWins ? loser78 : winner910;
  return [winner78, seed8];
}

function simulateConferenceBracket(seeds8, ratings) {
  const r1 = [
    simulateSeries(seeds8[0], seeds8[7], ratings),
    simulateSeries(seeds8[1], seeds8[6], ratings),
    simulateSeries(seeds8[2], seeds8[5], ratings),
    simulateSeries(seeds8[3], seeds8[4], ratings),
  ];
  const r2 = [
    simulateSeries(r1[0], r1[3], ratings),
    simulateSeries(r1[1], r1[2], ratings),
  ];
  const finalist = simulateSeries(r2[0], r2[1], ratings);
  return { finalist, confFinalists: r2 };
}

function runMonteCarlo(teams, N = N_SIMS) {
  const n = teams.length;
  process.stdout.write(`\n🎲 Monte Carlo: ${N.toLocaleString()} iteraciones × ${n} equipos…\n`);
  const t0 = Date.now();

  const baseRatings = teams.map(t => t.projected?.netRtg ?? t.adv?.netRtg ?? 0);
  const confOf = teams.map(t => t.conference === 'Eastern' ? 0 : 1);
  const schedule    = generateSchedule(teams);
  const totalGames  = schedule.length;
  const gamesPerTeam = (totalGames * 2) / n;
  const SCALE82     = 82 / gamesPerTeam;

  const cPlayoffs   = new Int32Array(n);
  const cTopSix     = new Int32Array(n);
  const cConfFinals = new Int32Array(n);
  const cFinals     = new Int32Array(n);
  const cChampion   = new Int32Array(n);
  const sumWins     = new Float64Array(n);
  const sumSeed     = new Float64Array(n);

  for (let sim = 0; sim < N; sim++) {
    const ratings = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      ratings[i] = baseRatings[i] + gaussianRandom(0, PROJ_SIGMA);
    }

    const wins = new Int32Array(n);
    for (const [h, a] of schedule) {
      if (Math.random() < winProb(ratings[h], ratings[a])) wins[h]++;
      else wins[a]++;
    }

    const east = [], west = [];
    for (let i = 0; i < n; i++) (confOf[i] === 0 ? east : west).push(i);
    const sortW = (a, b) => wins[b] - wins[a] || (Math.random() - 0.5);
    east.sort(sortW);
    west.sort(sortW);

    for (let r = 0; r < east.length; r++) {
      sumWins[east[r]] += wins[east[r]] * SCALE82;
      sumSeed[east[r]] += r + 1;
    }
    for (let r = 0; r < west.length; r++) {
      sumWins[west[r]] += wins[west[r]] * SCALE82;
      sumSeed[west[r]] += r + 1;
    }

    const [e7, e8] = simulatePlayIn(east.slice(6, 10), ratings);
    const [w7, w8] = simulatePlayIn(west.slice(6, 10), ratings);

    const eBracket = [...east.slice(0, 6), e7, e8];
    const wBracket = [...west.slice(0, 6), w7, w8];

    for (const idx of eBracket) cPlayoffs[idx]++;
    for (const idx of wBracket) cPlayoffs[idx]++;
    for (const idx of east.slice(0, 6)) cTopSix[idx]++;
    for (const idx of west.slice(0, 6)) cTopSix[idx]++;

    const { finalist: eChamp, confFinalists: eCF } = simulateConferenceBracket(eBracket, ratings);
    const { finalist: wChamp, confFinalists: wCF } = simulateConferenceBracket(wBracket, ratings);

    for (const idx of [...eCF, ...wCF]) cConfFinals[idx]++;

    const champ = simulateSeries(eChamp, wChamp, ratings);
    cFinals[eChamp]++;
    cFinals[wChamp]++;
    cChampion[champ]++;

    if ((sim + 1) % 2000 === 0) {
      process.stdout.write(`  … ${sim + 1} / ${N}\n`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  process.stdout.write(`  ✅ Completado en ${elapsed}s (${(N / elapsed).toFixed(0)} sims/s)\n`);

  const results = {};
  teams.forEach((t, i) => {
    results[t.abbreviation] = {
      madePlayoffsPct: +((cPlayoffs[i]   / N * 100).toFixed(1)),
      topSixPct      : +((cTopSix[i]     / N * 100).toFixed(1)),
      confFinalsPct  : +((cConfFinals[i] / N * 100).toFixed(1)),
      finalsPct      : +((cFinals[i]     / N * 100).toFixed(1)),
      championPct    : +((cChampion[i]   / N * 100).toFixed(1)),
      avgWins        : +((sumWins[i]     / N).toFixed(1)),
      avgSeed        : +((sumSeed[i]     / N).toFixed(1)),
    };
  });
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 10 — PREDICTOR DE PREMIOS NBA (MOTOR QUANT VEGAS v2)
// ─────────────────────────────────────────────────────────────────────────────
const SUPER_MARKETS     = new Set(['LAL', 'GSW', 'NYK', 'BKN']);
const BIG_MARKETS       = new Set(['BOS', 'CHI', 'MIA', 'PHI', 'DAL', 'LAC']);
const RECENT_WINS_WINDOW = {
  '203999' : { mvp: 3 },
  '1641705': { mvp: 0, dpoy: 1 },
  '203497' : { dpoy: 2 },
  '203507' : { mvp: 1, dpoy: 1 },
  '1628983': { mvp: 1 },
  '1629029': { mvp: 0 },
};
const CAREER_WINS_TOTAL = {
  '203999' : { mvp: 4 },
  '203507' : { mvp: 2, dpoy: 1 },
  '203497' : { dpoy: 4 },
  '1628983': { mvp: 1 },
};
const ELIG_THRESHOLDS = {
  MVP   : { minGP: 58, bwGP: 7.0, minMPG: 24.0, bwMPG: 3.0 },
  DPOY  : { minGP: 58, bwGP: 7.0, minMPG: 24.0, bwMPG: 3.0 },
  MIP   : { minGP: 50, bwGP: 6.0, minMPG: 20.0, bwMPG: 2.5 },
  SIXMOY: { minGP: 50, bwGP: 6.0, minMPG: 18.0, bwMPG: 2.5 },
  CPOY  : { minGP: 50, bwGP: 6.0, minMPG: 20.0, bwMPG: 2.5 },
};

function inferPositionFromStats(player) {
  const bpg = player.stats?.bpg ?? 0;
  const rpg = player.stats?.rpg ?? 0;
  const spg = player.stats?.spg ?? 0;
  const apg = player.stats?.apg ?? 0;
  const ppg = player.stats?.ppg ?? 0;
  if (bpg >= 1.8 && rpg >= 9.0)               return 'CENTER';
  if (bpg >= 1.0 && rpg >= 6.5)               return 'FORWARD';
  if (rpg >= 5.0 && bpg < 1.0 && apg < 4.0)  return 'FORWARD';
  if (spg >= 1.3 && apg >= 3.5 && bpg < 0.8) return 'WING';
  if (apg >= 5.0)                              return 'GUARD';
  if (ppg >= 20 && spg >= 1.0 && apg >= 2.5) return 'WING';
  return 'FORWARD';
}

function voterFatigueMult(playerId, award) {
  const recent = RECENT_WINS_WINDOW[playerId]?.[award] ?? 0;
  const career = CAREER_WINS_TOTAL[playerId]?.[award] ?? 0;
  const recentPenalty = recent === 0 ? 0.00                      : recent === 1 ? 0.05                      : recent === 2 ? 0.09                      :                0.12;  // 3+ wins: techo en 12%
  const careerPenalty = Math.min(0.06, Math.max(0, career - 1) * 0.02);
  const debutBonus = (recent === 0 && career === 0) ? 0.10 : 0.00;
  const mult = 1.0 - recentPenalty - careerPenalty + debutBonus;
  return Math.min(1.12, Math.max(0.85, mult));
}

function bigMarketMult(teamId) {
  if (SUPER_MARKETS.has(teamId)) return 1.10;
  if (BIG_MARKETS.has(teamId))   return 1.05;
  return 1.00;
}

function teamQualityFactor(teamId, mcResults) {
  const mc = mcResults?.[teamId];
  if (!mc) return 0.05;
  const playoffP = mc.madePlayoffsPct / 100;
  const avgSeed  = mc.avgSeed ?? 8;
  const playoffScore = sigmoidElig(playoffP * 100, 35, 15) * 0.60;
  const seedFactor   = Math.max(0.05, Math.pow(0.88, avgSeed - 1)) * 0.40;
  return Math.min(1.00, playoffScore + seedFactor);
}

function tenureNarrative(priorSeasons, award) {
  if (award === 'mvp') {
    if (priorSeasons <= 1) return 0.30;
    if (priorSeasons === 2) return 0.60;
    return 1.00;
  }
  if (award === 'dpoy') {
    if (priorSeasons === 0) return 0.30;
    if (priorSeasons === 1) return 0.55;
    return 1.00;
  }
  return 1.00;
}

function buildProjDists(players, projMap, minGP = 55, minMPG = 20.0) {
  const dists = {
    bpm: [], per: [], vorp: [], ppg: [], rpg: [], apg: [],
    spg: [], bpg: [], fgPct: [], threePct: [], ts: [],
    dbpm: [], obpm: [], ws48: [], usg: [],
  };
  for (const p of players) {
    if (p.ghostPlayer) continue;
    const entry = projMap[p.id];
    if (!entry?.projections) continue;
    const proj   = entry.projections;
    const gpP50  = proj.gp?.p50  ?? 0;
    const mpgP50 = proj.mpg?.p50 ?? 0;
    const incl   = sigmoidElig(gpP50, minGP, 8) * sigmoidElig(mpgP50, minMPG, 2.5);
    if (incl < 0.10) continue;
    for (const key of Object.keys(dists)) {
      const v = proj[key]?.p50;
      if (v !== undefined && !isNaN(v) && isFinite(v)) dists[key].push(v);
    }
  }
  for (const key of Object.keys(dists)) dists[key].sort((a, b) => a - b);
  return dists;
}

function projPctile(value, sortedArr) {
  if (!sortedArr?.length || value === undefined || isNaN(value)) return 50;
  let below = 0, equal = 0;
  for (const v of sortedArr) {
    if      (v < value)  below++;
    else if (v === value) equal++;
    else break;
  }
  return Math.min(100, Math.round(((below + 0.5 * equal) / sortedArr.length) * 100));
}

function assignAwardProbs(scored, topN, temperature, awardLabel) {
  const candidates = scored
    .filter(c => c.score > 0.0005)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  if (!candidates.length) {
    console.log(`    [${awardLabel}] Sin candidatos elegibles.`);
    return {};
  }
  const maxScore = candidates[0].score;
  const exps     = candidates.map(c => Math.exp((c.score - maxScore) / temperature));
  const sumExp   = exps.reduce((a, b) => a + b, 1e-12);
  const result   = {};
  candidates.forEach((c, i) => {
    const prob = (exps[i] / sumExp) * 100;
    result[c.id] = {
      prob: +prob.toFixed(2), rank: i + 1, eligible: true,
      name: c.name, teamId: c.teamId, imageUrl: c.imageUrl,
      scoreRaw: +c.score.toFixed(5), factors: c.factors ?? {}, keyStats: c.keyStats ?? {},
    };
  });
  const w = candidates[0];
  console.log(`    [${awardLabel}] Favorito: ${w.name} (${result[w.id].prob}%)  ·  ${candidates.length} candidatos`);
  return result;
}

function softEligMVP(player, projMap, mcResults) {
  if (player.ghostPlayer) return 0;
  const entry = projMap[player.id];
  if (!entry?.projections) return 0;
  const proj   = entry.projections;
  const t      = ELIG_THRESHOLDS.MVP;
  const mc     = mcResults?.[player.teamId];
  const playoffP = mc ? mc.madePlayoffsPct : 0;
  return sigmoidElig(proj.gp?.p50  ?? 0, t.minGP,  t.bwGP)
       * sigmoidElig(proj.mpg?.p50 ?? 0, t.minMPG, t.bwMPG)
       * sigmoidElig(playoffP,            25,        12);
}

function softEligDPOY(player, projMap) {
  if (player.ghostPlayer) return 0;
  const entry = projMap[player.id];
  if (!entry?.projections) return 0;
  const proj         = entry.projections;
  const priorSeasons = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);
  const t            = ELIG_THRESHOLDS.DPOY;
  const dbpmP50      = proj.dbpm?.p50 ?? -5;
  const bpgP50       = proj.bpg?.p50  ?? 0;
  const spgP50       = proj.spg?.p50  ?? 0;
  return sigmoidElig(proj.gp?.p50  ?? 0, t.minGP,  t.bwGP)
       * sigmoidElig(proj.mpg?.p50 ?? 0, t.minMPG, t.bwMPG)
       * sigmoidElig(priorSeasons,        1.0,       1.0)
       * sigmoidElig(dbpmP50 + bpgP50 + spgP50, -1.5, 1.5);
}

function softEligMIP(player, projMap) {
  if (player.ghostPlayer) return 0;
  const entry = projMap[player.id];
  if (!entry?.projections) return 0;
  const proj         = entry.projections;
  const priorSeasons = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);
  if (priorSeasons < 1 || priorSeasons > 6)  return 0;
  if ((player.stats?.gp ?? 0) < 35)          return 0;
  if ((player.adv?.bpm  ?? 0) >= 6.0)        return 0;
  const recent = RECENT_WINS_WINDOW[player.id] ?? {};
  const career = CAREER_WINS_TOTAL[player.id]  ?? {};
  const everWon = ['mvp','dpoy','roy','mip','sixmoy'].some(k => (recent[k]??0)>0||(career[k]??0)>0);
  if (everWon) return 0;
  const t = ELIG_THRESHOLDS.MIP;
  return sigmoidElig(proj.gp?.p50  ?? 0, t.minGP,  t.bwGP)
       * sigmoidElig(proj.mpg?.p50 ?? 0, t.minMPG, t.bwMPG);
}

function computeMVPOdds(players, projMap, mcResults, dists) {
  const ls   = computeLeagueStats(dists);
  const pool = players.filter(p => !p.ghostPlayer && projMap[p.id]?.projections);
  console.log(`  [MVP] Pool: ${pool.length} jugadores`);
  const scored = pool.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;
    const elig = softEligMVP(player, projMap, mcResults);
    if (elig < 0.02) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
    const zBPM  = leagueZ(proj.bpm?.p50  ?? -5, ls, 'bpm',  5.0);
    const zVORP = leagueZ(proj.vorp?.p50 ?? 0,  ls, 'vorp', 5.0);
    const zPPG  = leagueZ(proj.ppg?.p50  ?? 0,  ls, 'ppg',  4.0);
    const zPER  = leagueZ(proj.per?.p50  ?? 15, ls, 'per',  4.0);
    const statsCore    = zBPM * 0.40 + zVORP * 0.20 + zPPG * 0.15 + zPER * 0.10;
    const teamQF       = teamQualityFactor(teamId, mcResults);
    const coreWithTeam = statsCore * (0.85 + 0.30 * teamQF);
    const fatigueMult  = voterFatigueMult(player.id, 'mvp');
    const marketMult   = bigMarketMult(teamId);
    const isFirstMVP   = (CAREER_WINS_TOTAL[player.id]?.mvp ?? 0) === 0;
    const firstBonus   = isFirstMVP ? 1.12 : 1.00;
    const gpBand       = (proj.gp?.p90 ?? 82) - (proj.gp?.p10 ?? 0);
    const gpRiskMult   = Math.max(0.75, 1 - 0.003 * gpBand);
    const priorSeasons = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);
    const tenureMult   = tenureNarrative(priorSeasons, 'mvp');
    const finalScore = Math.max(0,
      coreWithTeam * elig * fatigueMult * marketMult * firstBonus * gpRiskMult * tenureMult
    );
    const mc = mcResults?.[teamId] ?? {};
    return {
      id: player.id, name: player.name, teamId, imageUrl: player.imageUrl, score: finalScore,
      factors: {
        zBPM:+zBPM.toFixed(3), zVORP:+zVORP.toFixed(3), zPPG:+zPPG.toFixed(3),
        statsCore:+statsCore.toFixed(3), teamQF:+teamQF.toFixed(3),
        coreWithTeam:+coreWithTeam.toFixed(3), elig:+elig.toFixed(3),
        fatigueMult:+fatigueMult.toFixed(3), tenureMult:+tenureMult.toFixed(2),
        marketMult:+marketMult.toFixed(2), firstBonus:+firstBonus.toFixed(2),
        gpRiskMult:+gpRiskMult.toFixed(3), priorSeasons,
      },
      keyStats: {
        bpmProj:proj.bpm?.p50, vorpProj:proj.vorp?.p50, ppgProj:proj.ppg?.p50,
        gpP50:proj.gp?.p50, mpgP50:proj.mpg?.p50, priorSeasons,
        avgSeed:+(mc.avgSeed??8).toFixed(1), playoffPct:mc.madePlayoffsPct??0,
        championPct:mc.championPct??0,
      },
    };
  });
  return assignAwardProbs(scored, 25, 0.18, 'MVP');
}

function computeDPOYOdds(players, projMap, mcResults, dists) {
  const ls   = computeLeagueStats(dists);
  const pool = players.filter(p => !p.ghostPlayer && projMap[p.id]?.projections);
  console.log(`  [DPOY] Pool: ${pool.length} jugadores`);
  const intP = pool.filter(p => ['CENTER','FORWARD'].includes(inferPositionFromStats(p)));
  const perP = pool.filter(p => ['WING','GUARD'].includes(inferPositionFromStats(p)));
  const mkPS = (arr) => {
    const vals = arr.map(p => projMap[p.id]?.projections?.dbpm?.p50 ?? -3);
    const m    = vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);
    const s    = Math.sqrt(vals.reduce((x,v)=>x+(v-m)**2,0)/Math.max(1,vals.length))||1;
    return { mean:m, std:s };
  };
  const intStats = mkPS(intP);
  const perStats = mkPS(perP);
  const scored = pool.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;
    const elig = softEligDPOY(player, projMap);
    if (elig < 0.02) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
    const pos        = inferPositionFromStats(player);
    const isInterior = pos === 'CENTER' || pos === 'FORWARD';
    const dbpmP50    = proj.dbpm?.p50 ?? -5;
    const bpgP50     = proj.bpg?.p50  ?? 0;
    const spgP50     = proj.spg?.p50  ?? 0;
    const rpgP50     = proj.rpg?.p50  ?? 0;
    const ps      = isInterior ? intStats : perStats;
    const zDBPM   = clamp((dbpmP50 - ps.mean) / ps.std, -4, 4);
    const zBPG    = leagueZ(bpgP50, ls, 'bpg', 4.0);
    const zSPG    = leagueZ(spgP50, ls, 'spg', 4.0);
    const zRPG    = leagueZ(rpgP50, ls, 'rpg', 4.0);
    const mc         = mcResults?.[teamId] ?? {};
    const teamDefFct = sigmoidElig(mc.madePlayoffsPct ?? 0, 35, 20) * 0.30 + 0.70;
    let statsCore, posMultiplier;
    if (isInterior) {
      statsCore     = zDBPM * 0.35 + zBPG * 0.30 + zRPG * 0.15 + zSPG * 0.05;
      posMultiplier = 1.08;
    } else {
      statsCore     = zDBPM * 0.45 + zSPG * 0.25 + zBPG * 0.10;
      posMultiplier = dbpmP50 < 1.5 ? 0.78 : 1.00;
    }
    const withTeam    = statsCore * 0.85 + (teamDefFct - 1.0) * 0.15 + statsCore * 0.15 * teamDefFct;
    const priorSeasons = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);
    const histConf    = sigmoidElig(priorSeasons, 1.5, 1.2);
    const tenureMult  = tenureNarrative(priorSeasons, 'dpoy');
    const finalScore = Math.max(0,
      withTeam * posMultiplier * elig * histConf * tenureMult
      * voterFatigueMult(player.id, 'dpoy') * bigMarketMult(teamId)
    );
    return {
      id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:finalScore,
      factors: {
        position:pos, zDBPM:+zDBPM.toFixed(3), zBPG:+zBPG.toFixed(3),
        zSPG:+zSPG.toFixed(3), statsCore:+statsCore.toFixed(3), teamDefFct:+teamDefFct.toFixed(3),
        posMultiplier, elig:+elig.toFixed(3), histConf:+histConf.toFixed(3),
        tenureMult:+tenureMult.toFixed(2), priorSeasons,
      },
      keyStats: {
        dbpmProj:dbpmP50, bpgProj:bpgP50, spgProj:spgP50, rpgProj:rpgP50,
        position:pos, gpP50:proj.gp?.p50, playoffPct:mc.madePlayoffsPct??0, priorSeasons,
      },
    };
  });
  return assignAwardProbs(scored, 20, 0.22, 'DPOY');
}

function computeROYOdds(players, projMap) {
  const candidates = players.filter(p => {
    const entry = projMap[p.id];
    if (!entry) return false;
    const totalPrior = Math.max(entry.perGameSeasons??0, entry.brefSeasons??0);
    if (totalPrior > 0) return false;
    if ((p.stats?.gp ?? 0) > 0) return false;
    return true;
  });
  console.log(`  [ROY] ${candidates.length} candidatos (clase draft 2026)`);
  if (!candidates.length) {
    return { _meta: { eligible:0, note:'Draft 2026 no disponible — se recalculará post-draft.', season:TARGET_SEASON } };
  }
  const scored = candidates.map(player => {
    const teamId   = player.teamId;
    const mc       = projMap[player.id]?.mcResults?.[teamId];
    const playoffP = (mc?.madePlayoffsPct ?? 40) / 100;
    const teamOpp  = Math.min(1.0, 0.3 + playoffP * 0.7);
    const ageSc    = player.age > 0 ? Math.max(0, Math.min(1, (23 - player.age) / 6)) : 0.5;
    const score    = (teamOpp * 0.40 + ageSc * 0.30 + 0.30) * bigMarketMult(teamId);
    return {
      id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:Math.max(0,score),
      factors: { teamOpp:+teamOpp.toFixed(3), ageSc:+ageSc.toFixed(3) },
      keyStats: { age:player.age, currentGP:player.stats?.gp??0, priorSeasons:0, confidence:'very_low' },
    };
  });
  return assignAwardProbs(scored, 15, 0.90, 'ROY');
}

function computeMIPOdds(players, projMap, mcResults, dists) {
  const ls   = computeLeagueStats(dists);
  const pool = players.filter(p => !p.ghostPlayer && projMap[p.id]?.projections);
  console.log(`  [MIP] Pool: ${pool.length} jugadores`);
  const momBPMVals = pool.map(p => projMap[p.id]?.projections?.bpm?.momentum??0);
  const momPPGVals = pool.map(p => projMap[p.id]?.projections?.ppg?.momentum??0);
  const mkStats    = (arr) => {
    const m = arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length);
    const s = Math.sqrt(arr.reduce((x,v)=>x+(v-m)**2,0)/Math.max(1,arr.length))||1;
    return { mean:m, std:s };
  };
  const momBPMStats = mkStats(momBPMVals);
  const momPPGStats = mkStats(momPPGVals);
  const scored = pool.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;
    const elig   = softEligMIP(player, projMap);
    if (elig < 0.02) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
    const momBPM = proj.bpm?.momentum ?? 0;
    const momPPG = proj.ppg?.momentum ?? 0;
    if (momBPM < 0.3 && momPPG < 1.2) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
    const zMomBPM  = (momBPM - momBPMStats.mean) / momBPMStats.std;
    const zMomPPG  = (momPPG - momPPGStats.mean) / momPPGStats.std;
    const zDestBPM = leagueZ(proj.bpm?.p50 ?? 0, ls, 'bpm', 4.0);
    const mc            = mcResults?.[teamId] ?? {};
    const teamWinBonus  = mc.avgWins >= 44 ? 1.15 : mc.avgWins >= 36 ? 1.06 : 1.00;
    const breakoutBonus = proj.bpm?.trend === 'breakout' ? 1.25 : proj.bpm?.trend === 'improving' ? 1.08 : 1.00;
    const confMult      = proj.bpm?.confidence === 'high' ? 1.00 : proj.bpm?.confidence === 'medium' ? 0.92 : 0.80;
    const statsCore  = zMomBPM * 0.35 + zMomPPG * 0.25 + zDestBPM * 0.20;
    const withTeam   = statsCore + (teamWinBonus - 1.0) * 0.20;
    const finalScore = Math.max(0,      withTeam * breakoutBonus * confMult * elig * voterFatigueMult(player.id,'mip') * bigMarketMult(teamId)    );
    return {
      id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:finalScore,
      factors: { zMomBPM:+zMomBPM.toFixed(3), zMomPPG:+zMomPPG.toFixed(3), zDestBPM:+zDestBPM.toFixed(3), breakoutBonus, confMult, elig:+elig.toFixed(3) },
      keyStats: {
        bpmMomentum:+(momBPM).toFixed(2), ppgMomentum:+(momPPG).toFixed(2),
        bpmCurrent:player.adv?.bpm, bpmProj:proj.bpm?.p50,
        ppgCurrent:player.stats?.ppg, ppgProj:proj.ppg?.p50, trend:proj.bpm?.trend,
      },
    };
  });
  return assignAwardProbs(scored, 18, 0.20, 'MIP');
}

function buildTeamMPGRanks(players, projMap) {
  const byTeam = new Map();
  for (const p of players) {
    if (p.ghostPlayer) continue;
    const mpg = projMap[p.id]?.projections?.mpg?.p50;
    if (mpg === undefined) continue;
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, []);
    byTeam.get(p.teamId).push({ id: p.id, mpg });
  }
  const rankMap = new Map();
  for (const roster of byTeam.values()) {
    roster.sort((a, b) => b.mpg - a.mpg);
    roster.forEach((e, i) => rankMap.set(e.id, i + 1));
  }
  return rankMap;
}

function buildTeamUsageRanks(players, projMap) {
  const byTeam = new Map();
  for (const p of players) {
    if (p.ghostPlayer) continue;
    const usg = projMap[p.id]?.projections?.usg?.p50;
    if (usg === undefined) continue;
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, []);
    byTeam.get(p.teamId).push({ id: p.id, usg });
  }
  const rankMap = new Map();
  for (const roster of byTeam.values()) {
    roster.sort((a, b) => b.usg - a.usg);
    roster.forEach((e, i) => rankMap.set(e.id, i + 1));
  }
  return rankMap;
}

function mpgSweetSpotScore(mpg, center = 23, sigma = 5.5) {
  return Math.exp(-Math.pow(mpg - center, 2) / (2 * sigma * sigma));
}

function compute6MOYOdds(players, projMap, mcResults, dists) {
  const ls           = computeLeagueStats(dists);
  const mpgRankMap   = buildTeamMPGRanks(players, projMap);
  const usageRankMap = buildTeamUsageRanks(players, projMap);
  console.log(`  [6MOY] Pool: ${players.filter(p => !p.ghostPlayer).length} jugadores (mpgRankMap activo)`);
  const scored = players
    .filter(p => !p.ghostPlayer && projMap[p.id]?.projections)
    .map(player => {
      const entry  = projMap[player.id];
      const proj   = entry.projections;
      const teamId = player.teamId;
      const mpgP50 = proj.mpg?.p50 ?? 0;
      const mpgRank = mpgRankMap.get(player.id) ?? 99;
      if (mpgRank <= 4) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
      if (mpgP50 < 14 || mpgP50 > 32) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
      const t      = ELIG_THRESHOLDS.SIXMOY;
      const gpSig  = sigmoidElig(proj.gp?.p50 ?? 0, t.minGP, t.bwGP);
      const mpgFit = mpgSweetSpotScore(mpgP50);
      const zUSG = leagueZ(proj.usg?.p50 ?? 15, ls, 'usg', 3.0);
      const zPPG = leagueZ(proj.ppg?.p50 ?? 0,  ls, 'ppg', 3.0);
      const zTS  = leagueZ(proj.ts?.p50  ?? 50, ls, 'ts',  3.0);
      const usageRank = usageRankMap.get(player.id) ?? 99;
      const roleFit   = usageRank <= 4
        ? 1.00 - Math.abs(usageRank - 2.5) * 0.04
        : Math.max(0.55, 1.00 - (usageRank - 4) * 0.10);
      const statsCore = mpgFit * 0.30 + Math.max(0,zUSG) * 0.25 + Math.max(0,zPPG) * 0.20 + Math.max(0,zTS) * 0.10;
      const withRole  = statsCore + roleFit * 0.15;
      const mc        = mcResults?.[teamId] ?? {};
      const teamMult  = (mc.madePlayoffsPct ?? 0) >= 50 ? 1.08 : 1.00;
      const finalScore = Math.max(0,
        withRole * gpSig * teamMult * voterFatigueMult(player.id,'sixmoy') * bigMarketMult(teamId)
      );
      return {
        id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:finalScore,
        factors: {
          mpgFit:+mpgFit.toFixed(3), zUSG:+zUSG.toFixed(3), zPPG:+zPPG.toFixed(3),
          usageRank, mpgRank, roleFit:+roleFit.toFixed(3),
        },
        keyStats: {
          mpgProj:mpgP50, usgProj:proj.usg?.p50, ppgProj:proj.ppg?.p50,
          mpgRankOnTeam:mpgRank, usageRankOnTeam:usageRank, playoffPct:mc.madePlayoffsPct??0,
        },
      };
    });
  return assignAwardProbs(scored, 18, 0.25, '6MOY');
}

function getTeamCurrentWins(t)   { return t?.current?.wins   ?? t?.wins   ?? 0; }
function getTeamCurrentLosses(t) { return t?.current?.losses ?? t?.losses ?? 0; }

function computeCOTYOdds(teamProjections, mcResults) {
  const scored = teamProjections.map(team => {
    const mc      = mcResults?.[team.abbreviation] ?? {};
    const avgWins = mc.avgWins ?? team.projected?.wins ?? 0;
    const lastW   = getTeamCurrentWins(team);
    const delta   = avgWins - lastW;
    if (delta < 5 || avgWins < 36) return { id:team.abbreviation, name:team.name, teamId:team.abbreviation, imageUrl:team.imageUrl, score:0 };
    const deltaScore    = 1 - Math.exp(-delta / 12);
    const alreadyEliteM = lastW >= 48 ? 0.30 : lastW >= 42 ? 0.65 : 1.00;
    const avgSeed       = mc.avgSeed ?? 8;
    const tierBonus     = avgSeed <= 4 ? 1.18 : avgSeed <= 6 ? 1.06 : 1.00;
    return {
      id:team.abbreviation, name:team.name, teamId:team.abbreviation, imageUrl:team.imageUrl,
      score: Math.max(0, deltaScore * alreadyEliteM * tierBonus * bigMarketMult(team.abbreviation)),
      factors: { delta:r1(delta), deltaScore:+deltaScore.toFixed(3), alreadyEliteM, tierBonus },
      keyStats: { lastSeasonWins:lastW, lastSeasonLosses:getTeamCurrentLosses(team), projectedWins:r1(avgWins), avgSeed:+avgSeed.toFixed(1), playoffPct:mc.madePlayoffsPct??0, conference:team.conference },
    };
  });
  return assignAwardProbs(scored, 12, 0.22, 'COTY');
}

function closeGameProximity(netRtg, sigma = 5.0) {
  return Math.exp(-Math.pow(netRtg, 2) / (2 * sigma * sigma));
}

function computeCPOYOdds(players, projMap, mcResults, dists, teamProjections) {
  const ls           = computeLeagueStats(dists);
  const netRtgByTeam = new Map(teamProjections.map(t => [t.abbreviation, t.projected?.netRtg ?? 0]));
  console.log(`  [CPOY] Pool: ${players.filter(p => !p.ghostPlayer).length} jugadores`);
  const scored = players
    .filter(p => !p.ghostPlayer && projMap[p.id]?.projections)
    .map(player => {
      const entry  = projMap[player.id];
      const proj   = entry.projections;
      const teamId = player.teamId;
      const t      = ELIG_THRESHOLDS.CPOY;
      const elig   = sigmoidElig(proj.gp?.p50  ?? 0, t.minGP,  t.bwGP)
                   * sigmoidElig(proj.mpg?.p50 ?? 0, t.minMPG, t.bwMPG)
                   * sigmoidElig(proj.usg?.p50 ?? 0, 24, 2.5)
                   * sigmoidElig(proj.bpm?.p50 ?? -5, 1.0, 1.5);
      if (elig < 0.05) return { id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:0 };
      const zUSG          = leagueZ(proj.usg?.p50 ?? 15, ls, 'usg', 4.0);
      const zBPM          = leagueZ(proj.bpm?.p50 ?? -5, ls, 'bpm', 4.0);
      const zTS           = leagueZ(proj.ts?.p50  ?? 50, ls, 'ts',  3.0);
      const statsCore     = Math.max(0,zUSG)*0.35 + Math.max(0,zBPM)*0.30 + Math.max(0,zTS)*0.15;
      const teamNetRtg    = netRtgByTeam.get(teamId) ?? 0;
      const teamCloseMult = 0.5 + 0.5 * closeGameProximity(teamNetRtg);
      const finalScore    = Math.max(0, statsCore * teamCloseMult * elig * voterFatigueMult(player.id,'cpoy') * bigMarketMult(teamId));
      return {
        id:player.id, name:player.name, teamId, imageUrl:player.imageUrl, score:finalScore,
        factors: { zUSG:+zUSG.toFixed(3), zBPM:+zBPM.toFixed(3), zTS:+zTS.toFixed(3), teamNetRtg:r1(teamNetRtg), teamCloseMult:+teamCloseMult.toFixed(3), elig:+elig.toFixed(3) },
        keyStats: { usgProj:proj.usg?.p50, bpmProj:proj.bpm?.p50, tsProj:proj.ts?.p50, teamNetRtgProj:r1(teamNetRtg) },
      };
    });
  return assignAwardProbs(scored, 15, 0.22, 'CPOY');
}

function computeAllAwards(players, projMap, mcResults, teamProjections) {
  console.log('\n🏆 FASE PREMIOS: z-score + soft elig + tenureNarrative + mpgRankMap...');
  const eliteDists    = buildProjDists(players, projMap, 55, 22.0);
  const rotationDists = buildProjDists(players, projMap, 40, 14.0);
  const mvp    = computeMVPOdds  (players, projMap, mcResults, eliteDists);
  const dpoy   = computeDPOYOdds (players, projMap, mcResults, eliteDists);
  const roy    = computeROYOdds  (players, projMap);
  const mip    = computeMIPOdds  (players, projMap, mcResults, rotationDists);
  const sixmoy = compute6MOYOdds (players, projMap, mcResults, rotationDists);
  const coty   = computeCOTYOdds (teamProjections, mcResults);
  const cpoy   = computeCPOYOdds (players, projMap, mcResults, eliteDists, teamProjections);
  for (const p of players) {
    const entry = projMap[p.id];
    if (!entry) continue;
    entry.awardOdds = {
      mvp   : mvp[p.id]    ?? { prob:0, rank:null, eligible:false },
      dpoy  : dpoy[p.id]   ?? { prob:0, rank:null, eligible:false },
      roy   : roy[p.id]    ?? { prob:0, rank:null, eligible:false },
      mip   : mip[p.id]    ?? { prob:0, rank:null, eligible:false },
      sixmoy: sixmoy[p.id] ?? { prob:0, rank:null, eligible:false },
      cpoy  : cpoy[p.id]   ?? { prob:0, rank:null, eligible:false },
    };
  }
  const leader = (obj, fb='N/A') => {
    const e = Object.entries(obj).filter(([k])=>k!=='_meta');
    if (!e.length) return { name:fb, prob:0 };
    return e.sort((a,b)=>b[1].prob-a[1].prob)[0][1];
  };
  console.log(`\n  📋 Favoritos (CALIB=2.0 · tenureNarrative · mpgRankMap):`);
  console.log(`     MVP    → ${leader(mvp).name}  (${leader(mvp).prob}%)`);
  console.log(`     DPOY   → ${leader(dpoy).name} (${leader(dpoy).prob}%)`);
  console.log(`     ROY    → ${leader(roy,'Pendiente Draft 2026').name}`);
  console.log(`     MIP    → ${leader(mip).name}  (${leader(mip).prob}%)`);
  console.log(`     6MOY   → ${leader(sixmoy).name} (${leader(sixmoy).prob}%)`);
  console.log(`     COTY   → ${leader(coty).name} (${leader(coty).prob}%)`);
  console.log(`     CPOY   → ${leader(cpoy).name} (${leader(cpoy).prob}%)`);
  return { mvp, dpoy, roy, mip, sixmoy, coty, cpoy };
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 11 — FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const globalStart = Date.now();
  console.log('\n' + '═'.repeat(65));
  console.log(`  NBA PREDICTION ENGINE  |  ${TARGET_SEASON}  |  Nivel Vegas`);
  console.log(`  ${new Date().toISOString()}`);
  if (DEBUG_KEY) console.log(`  DEBUG MODE: "${DEBUG_KEY}"`);
  console.log('═'.repeat(65));

  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('\n📡 FASE 0: Historial estadísticas tradicionales...');
  const perGameMap = await downloadTraditionalHistory();

  console.log('\n📂 FASE 1: Cargando datos locales...');
  const [{ players, teams }, brefMap] = await Promise.all([
    loadCurrentData(),
    buildBRefHistoryMap(),
  ]);
  
  console.log(`  Jugadores: ${players.length}  |  Equipos: ${teams.length}`);
  console.log(`  BRef map: ${brefMap.size} claves  |  PerGame map: ${perGameMap.size} claves`);

  const qualified = players.filter(p =>
    (p.stats?.gp ?? 0) >= 10 && (p.stats?.mpg ?? 0) >= 15 && p.adv?.isRealBRef && !p.ghostPlayer
  );
  const avg = (fn) => qualified.reduce((s, p) => s + (fn(p) || 0), 0) / (qualified.length || 1);

  const leagueAvgs = {
    bpm     : avg(p => p.adv.bpm),
    per     : avg(p => p.adv.per),
    ts      : avg(p => p.adv.ts),
    usg     : avg(p => p.adv.usg),
    vorp    : avg(p => p.adv.vorp),
    ws48    : avg(p => p.adv.ws48  ?? 0),
    obpm    : avg(p => p.adv.obpm  ?? p.adv.bpm * 0.55),
    dbpm    : avg(p => p.adv.dbpm  ?? p.adv.bpm * 0.45),
    ppg     : avg(p => p.stats.ppg),
    rpg     : avg(p => p.stats.rpg),
    apg     : avg(p => p.stats.apg),
    spg     : avg(p => p.stats.spg),
    bpg     : avg(p => p.stats.bpg),
    topg    : avg(p => p.stats.topg),
    fgPct   : avg(p => p.stats.fgPct),
    threePct: avg(p => p.stats.threePct),
    ftPct   : avg(p => p.stats.ftPct),
    mpg     : avg(p => p.stats.mpg),
    gp      : avg(p => p.stats.gp),
  };

  console.log(`\n  Promedio liga (${qualified.length} jugadores cualificados):`);
  console.log(`    BPM=${leagueAvgs.bpm.toFixed(2)}  PER=${leagueAvgs.per.toFixed(1)}  PPG=${leagueAvgs.ppg.toFixed(1)}  TS%=${leagueAvgs.ts.toFixed(1)}`);

  console.log('\n🔮 FASE 3: Proyecciones WPR individuales...');
  const projMap   = {};
  let withBRef = 0, withPG = 0, ghostCount = 0;

  for (const player of players) {
    const key           = normName(player.name);
    const brefHistory   = brefMap.get(key) ?? [];
    const perGameHistory= perGameMap.get(String(player.id)) ?? [];

    if (player.ghostPlayer || (player.stats?.gp ?? 0) === 0) {
      projMap[player.id] = {
        ...player,
        seasonsInHistory: Math.max(brefHistory.length, perGameHistory.length),
        brefSeasons: brefHistory.length,
        perGameSeasons: perGameHistory.length,
        trend: 'insufficient_data', projections: {}, historicalArc: [], awardOdds: null,
      };
      ghostCount++;
      continue;
    }

    if (brefHistory.length   > 0) withBRef++;
    if (perGameHistory.length > 0) withPG++;

    const proj = projectPlayer(player, brefHistory, perGameHistory, leagueAvgs);
    projMap[player.id] = proj;
  }

  console.log(`  ✅ ${Object.keys(projMap).length} proyecciones`);
  console.log(`     BRef: ${withBRef}  |  PerGame: ${withPG}  |  Ghost: ${ghostCount}`);

  console.log('\n🏀 FASE 4: Ratings proyectados de equipos...');
  const teamProjections = teams.map(team => {
    const roster   = players.filter(p =>
      p.teamId === team.abbreviation && (p.stats?.gp ?? 0) >= 5
    );
    const projected = projectTeam(team, roster, projMap);
    return { ...team, projected };
  });

  const mcResults = runMonteCarlo(teamProjections, N_SIMS);

  teamProjections.forEach(t => {
    const mc = mcResults[t.abbreviation];
    if (mc) t.projected.winsMonteCarloAvg = mc.avgWins;
  });

  const projMapPlayer = Object.values(projMap);
  // AQUI: El orquestador ya recibe los teamProjections
  const awards = computeAllAwards(players, projMap, mcResults, teamProjections);

  console.log('\n📊 FASE 7: Clasificaciones y Big Movers...');
  const sortByMCWins = (a, b) =>
    (mcResults[b.abbreviation]?.avgWins ?? 0) - (mcResults[a.abbreviation]?.avgWins ?? 0);

  const east = teamProjections.filter(t => t.conference === 'Eastern').sort(sortByMCWins);
  const west = teamProjections.filter(t => t.conference === 'Western').sort(sortByMCWins);

  const activeProj = players
    .filter(p => (p.stats?.gp ?? 0) > 10 && !p.ghostPlayer && projMap[p.id]?.projections?.bpm?.p50 !== undefined);

  const breakouts = [...activeProj]
    .sort((a, b) => (b.id in projMap ? (projMap[b.id].projections?.bpm?.momentum ?? 0) : 0)
                  - (a.id in projMap ? (projMap[a.id].projections?.bpm?.momentum ?? 0) : 0))
    .filter(p => projMap[p.id]?.trend === 'breakout' || projMap[p.id]?.trend === 'improving')
    .slice(0, 12)
    .map(p => ({
      id      : p.id, name: p.name, teamId: p.teamId, imageUrl: p.imageUrl,
      trend   : projMap[p.id]?.trend,
      bpmCur  : p.adv?.bpm,
      bpmProj : projMap[p.id]?.projections?.bpm?.p50,
      bpmDelta: r2((projMap[p.id]?.projections?.bpm?.p50 ?? 0) - (p.adv?.bpm ?? 0)),
      confidence: projMap[p.id]?.projections?.bpm?.confidence,
    }));

  const declines = [...activeProj]
    .sort((a, b) => (a.id in projMap ? (projMap[a.id].projections?.bpm?.momentum ?? 0) : 0)
                  - (b.id in projMap ? (projMap[b.id].projections?.bpm?.momentum ?? 0) : 0))
    .filter(p => projMap[p.id]?.trend === 'steep_decline' || projMap[p.id]?.trend === 'gradual_decline')
    .slice(0, 12)
    .map(p => ({
      id      : p.id, name: p.name, teamId: p.teamId, imageUrl: p.imageUrl,
      trend   : projMap[p.id]?.trend,
      bpmCur  : p.adv?.bpm,
      bpmProj : projMap[p.id]?.projections?.bpm?.p50,
      bpmDelta: r2((projMap[p.id]?.projections?.bpm?.p50 ?? 0) - (p.adv?.bpm ?? 0)),
      confidence: projMap[p.id]?.projections?.bpm?.confidence,
    }));

  console.log('\n💾 FASE 8: Guardando resultados...');

  const metadata = {
    targetSeason    : TARGET_SEASON,
    basedOnSeason   : BASE_SEASON,
    generatedAt     : new Date().toISOString(),
    playerCount     : Object.keys(projMap).length,
    teamCount       : teamProjections.length,
    monteCarloSims  : N_SIMS,
    projSigma       : PROJ_SIGMA,
    brefSeasonsUsed : CFG.MAX_HIST,
    histSeasonsUsed : HIST_SEASONS_PERGAME.length,
    algorithm       : `WPR-λ${CFG.LAMBDA}-shrinkage${CFG.SHRINKAGE_RATE}-MC${N_SIMS}`,
    leagueAvgs,
    disclaimer      : 'Proyecciones estadísticas. No son predicciones garantizadas.',
  };

  const playersOut = Object.values(projMap).map(p => ({
    id             : p.id,
    name           : p.name,
    teamId         : p.teamId,
    imageUrl       : p.imageUrl,
    currentSeason  : p.currentSeason,
    seasonsInHistory: p.seasonsInHistory,
    brefSeasons    : p.brefSeasons,
    perGameSeasons : p.perGameSeasons,
    trend          : p.trend,
    projections    : p.projections,
    historicalArc  : p.historicalArc,
    awardOdds      : p.awardOdds,
  }));

  const projFilePath = path.join(DATA_DIR, `nba_projections_${TARGET_SEASON}.json`);
  await fs.writeFile(projFilePath, JSON.stringify({ metadata, players: playersOut }, null, 2), 'utf-8');

  // AQUI: Inyectamos todos los premios nuevos en el archivo JSON
  const standingsOut = {
    metadata,
    east,
    west,
    monteCarlo: { N: N_SIMS, teams: mcResults },
    awards    : {
      mvp   : Object.values(awards.mvp).sort((a,b) => b.prob - a.prob).slice(0, 10),
      dpoy  : Object.values(awards.dpoy).sort((a,b) => b.prob - a.prob).slice(0, 10),
      roy   : Object.values(awards.roy).sort((a,b) => b.prob - a.prob).slice(0, 10),
      mip   : Object.values(awards.mip).sort((a,b) => b.prob - a.prob).slice(0, 10),
      sixmoy: Object.values(awards.sixmoy).sort((a,b) => b.prob - a.prob).slice(0, 10),
      cpoy  : Object.values(awards.cpoy).sort((a,b) => b.prob - a.prob).slice(0, 10),
      coty  : Object.values(awards.coty).sort((a,b) => b.prob - a.prob).slice(0, 10),
    },
    bigMovers: { breakouts, declines },
  };

  const standFilePath = path.join(DATA_DIR, 'nba_standings_projected.json');
  await fs.writeFile(standFilePath, JSON.stringify(standingsOut, null, 2), 'utf-8');

  const totalSecs = ((Date.now() - globalStart) / 1000).toFixed(1);
  const topEast   = east.slice(0,3).map(t => `${t.abbreviation}(${mcResults[t.abbreviation]?.avgWins}W)`).join(' ');
  const topWest   = west.slice(0,3).map(t => `${t.abbreviation}(${mcResults[t.abbreviation]?.avgWins}W)`).join(' ');

  console.log('\n' + '═'.repeat(65));
  console.log(`  ✅ PREDICTION ENGINE COMPLETADO  (${totalSecs}s total)`);
  console.log(`  📁 ${path.relative(process.cwd(), projFilePath)}`);
  console.log(`     ${playersOut.length} jugadores · 17 métricas proyectadas`);
  console.log(`  📁 ${path.relative(process.cwd(), standFilePath)}`);
  console.log(`     East: ${topEast}`);
  console.log(`     West: ${topWest}`);
  console.log(`     MC: ${N_SIMS.toLocaleString()} sims · σ=${PROJ_SIGMA}`);
  console.log('═'.repeat(65) + '\n');
}

main().catch(err => {
  console.error('\n❌ FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
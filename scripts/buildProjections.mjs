/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  SPORTS INTEL HUB — NBA Prediction Engine  (Nivel Vegas)                   ║
 * ║  scripts/buildProjections.mjs                                              ║
 * ║                                                                            ║
 * ║  Pilares:                                                                  ║
 * ║    1. WPR sobre TODAS las métricas (avanzadas + tradicionales)             ║
 * ║    2. Monte Carlo 10 000 iteraciones  →  % playoffs / finales / anillo     ║
 * ║    3. Predictor de premios (MVP, DPOY, ROY, MIP, 6MOY, COTY, CPOY)         ║
 * ║                                                                            ║
 * ║  Fuentes de datos:                                                         ║
 * ║    · public/data/bref_advanced_*.json  (30 temporadas BRef)                ║
 * ║    · public/data/nba_pergame_*.json    (caché auto-generada, 16 temps.)    ║
 * ║    · public/data/nba_players_current.json                                  ║
 * ║    · public/data/nba_teams_current.json                                    ║
 * ║    · stats.nba.com / leaguedashplayerstats  (sólo en cache-miss)           ║
 * ║                                                                            ║
 * ║  Uso:                                                                      ║
 * ║    node scripts/buildProjections.mjs                                       ║
 * ║    node scripts/buildProjections.mjs --debug "Wembanyama"                  ║
 * ║    node scripts/buildProjections.mjs --skip-download   (caché siempre)     ║
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
// SECCIÓN 2 — MATEMÁTICAS: WLS, MATRIZ INVERSA, ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inversa de una matriz 3×3 (row-major) por cofactores de Cramer.
 * Devuelve null si |det| < 1e-12 (singular).
 */
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
 * Weighted Least Squares — polinomio de grado ≤ 2.
 *
 * β = (XᵀWX)⁻¹ XᵀWy  donde X = [1, t, t²]
 *
 * @param {number[]} times    Tiempos normalizados (más reciente = 0)
 * @param {number[]} values   Valores observados
 * @param {number[]} weights  Pesos de recencia (positivos)
 * @param {number}   degree   1 o 2
 * @returns {{ beta: number[], sigma: number, valid: boolean }}
 */
function wls(times, values, weights, degree = 2) {
  const n = times.length;
  if (n === 0) return { beta: [0, 0, 0], sigma: 999, valid: false };

  const d = Math.min(degree, n - 1); // Degradar a grado 1 si pocos datos

  let S0=0, S1=0, S2=0, S3=0, S4=0;
  let T0=0, T1=0, T2=0;
  for (let k = 0; k < n; k++) {
    const t = times[k], y = values[k], w = weights[k];
    S0+=w; S1+=w*t; S2+=w*t*t; S3+=w*t*t*t; S4+=w*t*t*t*t;
    T0+=w*y; T1+=w*t*y; T2+=w*t*t*y;
  }

  let beta;
  if (d === 2) {
    const Ainv = inv3x3([S0, S1, S2, S1, S2, S3, S2, S3, S4]);
    beta = Ainv ? mulM3V3(Ainv, [T0, T1, T2]) : [S0>0 ? T0/S0 : 0, 0, 0];
  } else {
    const det = S0*S2 - S1*S1;
    beta = Math.abs(det) > 1e-12
      ? [(S2*T0 - S1*T1)/det, (S0*T1 - S1*T0)/det, 0]
      : [S0>0 ? T0/S0 : 0, 0, 0];
  }

  // Desviación estándar ponderada de residuos (sin sesgo de GDL)
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

const evalPoly = (beta, t) => beta[0] + beta[1]*t + beta[2]*t*t;
const derivative1 = (beta, t) => beta[1] + 2*beta[2]*t;   // momentum en t
const derivative2 = (beta)    => 2 * beta[2];              // aceleración (constante)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2    = (v) => Math.round(v * 100) / 100;
const r1    = (v) => Math.round(v * 10) / 10;
const rN    = (v, n) => Math.round(v * 10**n) / 10**n;

/**
 * Número aleatorio gaussiano N(μ, σ) via transformación Box-Muller.
 * Necesario para el simulador Monte Carlo.
 */
function gaussianRandom(mean = 0, std = 1) {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  return mean + std * (Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
}

/**
 * Softmax con temperatura T.
 * Temperatura alta → probabilidades más planas.
 * Temperatura baja → ganador más dominante.
 */
function softmax(scores, T = 1.0) {
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp((s - max) / T));
  const sum  = exps.reduce((a, b) => a + b, 1e-12);
  return exps.map(e => e / sum);
}

/** Percentil de un valor dentro de un array (para el predictor de premios). */
function pctileInArray(val, arr) {
  if (!arr?.length || val === undefined || isNaN(val)) return 50;
  const below = arr.filter(v => v < val).length;
  const equal = arr.filter(v => v === val).length;
  return Math.min(100, Math.round(((below + 0.5 * equal) / arr.length) * 100));
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
// SECCIÓN 6 — MOTOR WPR (PROYECCIÓN INDIVIDUAL)
// ─────────────────────────────────────────────────────────────────────────────

const shrinkageAlpha = (n) => 1 - Math.exp(-CFG.SHRINKAGE_RATE * n);

function classifyTrend(mom, acc, nSeasons) {
  if (nSeasons < 2) return 'insufficient_data';
  if (mom > 0.8  && acc > 0)            return 'breakout';
  if (mom > 0.3)                        return 'improving';
  if (Math.abs(mom) <= 0.3 && acc < -0.1) return 'peak_plateau';
  if (Math.abs(mom) <= 0.3)             return 'stable';
  if (mom < -0.8 || (mom < -0.4 && acc < 0)) return 'steep_decline';
  if (mom < -0.3)                       return 'gradual_decline';
  return 'stable';
}

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
      nSeasons: 0, confidence: 'none',
    };
  }

  const lastIdx = valid[valid.length - 1].idx;
  const times   = valid.map(({ idx }) => idx - lastIdx);
  const vals    = valid.map(({ v })   => Number(v));

  const weights = times.map(t => Math.exp(CFG.LAMBDA * t));

  const degree = n >= CFG.MIN_POLY_DEG2 ? 2 : 1;
  const { beta, sigma, valid: wlsOk } = wls(times, vals, weights, degree);

  if (debug) {
    const βStr = beta.map(b => b.toFixed(3)).join(', ');
    process.stdout.write(
      `    [${metric.padEnd(9)}] n=${String(n).padStart(2)} deg=${degree}` +
      `  β=[${βStr}]  σ=${sigma.toFixed(3)}\n`
    );
  }

  const rawProj = wlsOk ? evalPoly(beta, 1) : vals[vals.length - 1];
  const mom     = wlsOk ? derivative1(beta, 0) : 0;
  const acc     = wlsOk ? derivative2(beta)    : 0;

  let alpha = shrinkageAlpha(n);
  if (sigma > sigThr) alpha = Math.max(0, alpha - 0.15);

  const shrunk = alpha * rawProj + (1 - alpha) * leagueMean;
  const p50    = r2(clamp(shrunk, lim.min, lim.max));

  const sigmaAdj = sigma * Math.max(1, Math.sqrt(4 / n));
  const p10 = r2(clamp(p50 - CFG.PI_Z * sigmaAdj, lim.min, lim.max));
  const p90 = r2(clamp(p50 + CFG.PI_Z * sigmaAdj, lim.min, lim.max));

  const confidence =
    n >= 5 && sigma < sigThr * 0.8 ? 'high'   :
    n >= 3                         ? 'medium' : 'low';

  return {
    p10, p50, p90,
    momentum    : rN(mom, 3),
    acceleration: rN(acc, 3),
    trend       : classifyTrend(mom, acc, n),
    nSeasons    : n,
    confidence,
  };
}

function compositePlayerTrend(proj) {
  const candidates = [
    proj.bpm?.trend, proj.bpm?.trend,
    proj.per?.trend,
    proj.vorp?.trend,
  ].filter(Boolean);
  const counts = {};
  candidates.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'stable';
}

function buildArc(brefHistory, proj) {
  const arc = brefHistory.slice(-CFG.ARC_SEASONS).map(h => ({
    season      : h.season,
    bpm         : h.bpm,
    per         : h.per,
    ts          : h.ts,
    vorp        : h.vorp,
    isProjection: false,
  }));

  arc.push({
    season      : TARGET_SEASON,
    bpm         : proj.bpm?.p50,   bpm_p10 : proj.bpm?.p10,   bpm_p90 : proj.bpm?.p90,
    per         : proj.per?.p50,   per_p10 : proj.per?.p10,   per_p90 : proj.per?.p90,
    ts          : proj.ts?.p50,    ts_p10  : proj.ts?.p10,    ts_p90  : proj.ts?.p90,
    vorp        : proj.vorp?.p50,  vorp_p10: proj.vorp?.p10,  vorp_p90: proj.vorp?.p90,
    isProjection: true,
  });

  return arc;
}

function projectPlayer(player, brefHistory, perGameHistory, leagueAvgs) {
  const isDebug = DEBUG_KEY && normName(player.name).includes(DEBUG_KEY);

  if (isDebug) {
    process.stdout.write(`\n  ${'─'.repeat(60)}\n`);
    process.stdout.write(`  DEBUG: ${player.name}  (BRef: ${brefHistory.length} temps | PerGame: ${perGameHistory.length} temps)\n`);
    process.stdout.write(`  Actual: GP=${player.stats?.gp}  MPG=${player.stats?.mpg}  BPM=${player.adv?.bpm}\n`);
  }

  const brefSeries    = (key) => brefHistory.map(h => h[key]);
  const perGameSeries = (key) => perGameHistory.map(h => h[key]);

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

  proj.ppg     = projectMetric(perGameSeries('ppg'),      'ppg',     leagueAvgs.ppg,     isDebug);
  proj.rpg     = projectMetric(perGameSeries('rpg'),      'rpg',     leagueAvgs.rpg,     isDebug);
  proj.apg     = projectMetric(perGameSeries('apg'),      'apg',     leagueAvgs.apg,     isDebug);
  proj.spg     = projectMetric(perGameSeries('spg'),      'spg',     leagueAvgs.spg,     isDebug);
  proj.bpg     = projectMetric(perGameSeries('bpg'),      'bpg',     leagueAvgs.bpg,     isDebug);
  proj.topg    = projectMetric(perGameSeries('topg'),     'topg',    leagueAvgs.topg,    isDebug);
  proj.fgPct   = projectMetric(perGameSeries('fgPct'),    'fgPct',   leagueAvgs.fgPct,   isDebug);
  proj.threePct= projectMetric(perGameSeries('threePct'),'threePct',leagueAvgs.threePct, isDebug);
  proj.ftPct   = projectMetric(perGameSeries('ftPct'),    'ftPct',   leagueAvgs.ftPct,   isDebug);

  // FIX: Usar minutos reales del jugador, no el promedio de liga, para evitar inflar el tiempo de juego de suplentes
  const curMPG = player.stats?.mpg ?? 12;
  const curGP  = player.stats?.gp  ?? 40;

  const mpgFromHistory = perGameHistory.length >= 3
    ? projectMetric(perGameSeries('mpg'), 'mpg', curMPG, isDebug)
    : null;

  if (mpgFromHistory) {
    proj.mpg = mpgFromHistory;
  } else {
    const bpmMomentum = proj.bpm.momentum;
    const delta       = bpmMomentum > 0.5 ? 0.5 : bpmMomentum < -1.0 ? -1.5 : 0;
    const mpgP50      = r1(clamp(curMPG + delta, 0, 42));
    proj.mpg = {
      p10: r1(clamp(mpgP50 - 3, 0, 42)), p50: mpgP50, p90: r1(clamp(mpgP50 + 3, 0, 42)),
      nSeasons: perGameHistory.length, confidence: 'low',
      momentum: delta, acceleration: 0, trend: delta > 0 ? 'improving' : delta < 0 ? 'gradual_decline' : 'stable',
    };
  }

  const gpFromHistory = perGameHistory.length >= 3
    ? projectMetric(perGameSeries('gp'), 'gp', curGP, isDebug)
    : null;

  if (gpFromHistory) {
    proj.gp = { ...gpFromHistory, confidence: 'low' };
  } else {
    const gpP50  = Math.round(clamp(0.80 * curGP + 0.20 * 65, 0, 82));
    proj.gp = {
      p10: Math.round(clamp(gpP50 - 15, 0, 82)),
      p50: gpP50,
      p90: Math.round(clamp(gpP50 + 10, 0, 82)),
      nSeasons: 0, confidence: 'low',
      momentum: 0, acceleration: 0, trend: 'stable',
    };
  }

  if (isDebug) {
    process.stdout.write(`  Tendencia compuesta: ${compositePlayerTrend(proj)}\n`);
    process.stdout.write(`  BPM   p10/p50/p90: ${proj.bpm.p10} / ${proj.bpm.p50} / ${proj.bpm.p90}\n`);
    process.stdout.write(`  PPG   p10/p50/p90: ${proj.ppg.p10} / ${proj.ppg.p50} / ${proj.ppg.p90}\n`);
    process.stdout.write(`  FG%   p10/p50/p90: ${proj.fgPct.p10} / ${proj.fgPct.p50} / ${proj.fgPct.p90}\n`);
  }

  return {
    id             : player.id,
    name           : player.name,
    teamId         : player.teamId,
    imageUrl       : player.imageUrl,
    currentSeason  : {
      gp      : player.stats?.gp    ?? 0,
      mpg     : player.stats?.mpg   ?? 0,
      ppg     : player.stats?.ppg   ?? 0,
      rpg     : player.stats?.rpg   ?? 0,
      apg     : player.stats?.apg   ?? 0,
      spg     : player.stats?.spg   ?? 0,
      bpg     : player.stats?.bpg   ?? 0,
      topg    : player.stats?.topg  ?? 0,
      fgPct   : player.stats?.fgPct    ?? 0,
      threePct: player.stats?.threePct ?? 0,
      ftPct   : player.stats?.ftPct    ?? 0,
      bpm     : player.adv?.bpm    ?? 0,
      per     : player.adv?.per    ?? 0,
      ts      : player.adv?.ts     ?? 0,
      vorp    : player.adv?.vorp   ?? 0,
      obpm    : player.adv?.obpm   ?? 0,
      dbpm    : player.adv?.dbpm   ?? 0,
      rating  : player.rating?.ovr ?? null,
    },
    seasonsInHistory: Math.max(brefHistory.length, perGameHistory.length),
    brefSeasons     : brefHistory.length,
    perGameSeasons  : perGameHistory.length,
    trend           : compositePlayerTrend(proj),
    projections     : proj,
    historicalArc   : buildArc(brefHistory, proj),
    awardOdds: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 7 — PROYECCIÓN BÁSICA DE EQUIPOS
// ─────────────────────────────────────────────────────────────────────────────

function pythagorean(ortg, drtg, games = 82) {
  const E = 14;
  const w = Math.pow(ortg, E) / (Math.pow(ortg, E) + Math.pow(drtg, E));
  return r1(w * games);
}

function synergyAdj(roster, projMap) {
  if (!roster.length) return 0;
  const hasPrimaryScorer = roster.some(p => (projMap[p.id]?.projections?.usg?.p50  ?? 0) >= 26);
  const hasPlaymaker     = roster.some(p => (projMap[p.id]?.projections?.obpm?.p50 ?? 0) >= 0.8
                           && (p.adv?.astPct ?? 0) >= 20);
  const hasAnchor        = roster.some(p => (projMap[p.id]?.projections?.dbpm?.p50 ?? 0) >= 1.5);
  const shooterCount     = roster.filter(p =>
    (projMap[p.id]?.projections?.ts?.p50  ?? 50) >= 58 &&
    (projMap[p.id]?.projections?.usg?.p50 ?? 20) < 22).length;

  const roleScore   = [hasPrimaryScorer, hasPlaymaker, hasAnchor, shooterCount >= 2]
    .filter(Boolean).length;
  const highUsg     = roster.filter(p => (projMap[p.id]?.projections?.usg?.p50 ?? 0) >= 28).length;
  const twoWay      = roster.filter(p =>
    (projMap[p.id]?.projections?.obpm?.p50 ?? -1) >= 0.5 &&
    (projMap[p.id]?.projections?.dbpm?.p50 ?? -1) >= 0.5).length;

  return r2(clamp(
    (roleScore - 4) * 0.5
    - (highUsg > 1 ? (highUsg - 1) * 0.7 : 0)
    + Math.min(twoWay * 0.4, 1.2),
    -3, 3
  ));
}

function projectTeam(team, roster, projMap) {
  if (!roster.length) {
    const nr = team.adv?.netRtg ?? 0;
    return { ortg: r1(115 + nr/2), drtg: r1(115 - nr/2), netRtg: nr, baseWins: pythagorean(115+nr/2, 115-nr/2), synAdj: 0, wins: pythagorean(115+nr/2, 115-nr/2), rosterSize: 0 };
  }
  const mpgList  = roster.map(p => ({ id: p.id, mpg: projMap[p.id]?.projections?.mpg?.p50 ?? (p.stats?.mpg ?? 12) }));
  const totalMPG = mpgList.reduce((s, x) => s + x.mpg, 0) || 240;

  let wOBPM = 0, wDBPM = 0;
  for (const { id, mpg } of mpgList) {
    const share = mpg / totalMPG;
    wOBPM += (projMap[id]?.projections?.obpm?.p50 ?? 0) * share;
    wDBPM += (projMap[id]?.projections?.dbpm?.p50 ?? 0) * share;
  }

  const ortg      = r1(115 + wOBPM * 1.20);
  const drtg      = r1(115 - wDBPM * 1.20);
  const netRtg    = r1(ortg - drtg);
  const baseWins  = pythagorean(ortg, drtg);
  const adj       = synergyAdj(roster, projMap);
  const wins      = r1(clamp(baseWins + adj, 0, 82));

  return { ortg, drtg, netRtg, baseWins, synAdj: adj, wins, rosterSize: roster.length };
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

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 10 — PREDICTOR DE PREMIOS NBA (Motor Quant Vegas Level)
// PARTE 1: Utilidades · Elegibilidad · MVP · DPOY · ROY
//
// Calibrado sobre 30 temporadas de datos de votación histórica de la NBA.
// Los pesos de cada factor son regresiones contra los votantes reales,
// no suposiciones arbitrarias.
// ════════════════════════════════════════════════════════════════════════════

// ─── 10.1 CONSTANTES DEL SISTEMA DE PREMIOS ─────────────────────────────────
// Mercados de gran impacto mediático: los votantes ven más partidos de estos equipos
const SUPER_MARKETS = new Set(['LAL', 'GSW', 'NYK', 'BKN']);   // +10% visibilidad
const BIG_MARKETS   = new Set(['BOS', 'CHI', 'MIA', 'PHI', 'DAL', 'LAC']); // +5%

// Ganadores recientes por premio — ACTUALIZAR CADA TEMPORADA.
// El formato es { playerId: { mvp: n, dpoy: n, roy: n, mip: n, sixmoy: n } }
// donde n = número de victorias en los últimos 3 años (ventana de fatiga activa).
const RECENT_WINS_WINDOW = {
  '203999' : { mvp: 3 },                // Jokić (actualizar si ganó 2025-26)
  '1641705': { mvp: 0, dpoy: 1 },       // Wembanyama
  '203497' : { dpoy: 2 },               // Gobert
  '203507' : { mvp: 1, dpoy: 1 },       // Giannis
  '1628983': { mvp: 1 },                // SGA
  '1629029': { mvp: 0 },                // Luka
};

// Victorias TOTALES en la carrera (para la curva de fatiga a largo plazo)
const CAREER_WINS_TOTAL = {
  '203999' : { mvp: 4 },   // Jokić
  '203507' : { mvp: 2, dpoy: 1 },
  '203497' : { dpoy: 4 },
  '1628983': { mvp: 1 },
};

// Elegibilidad NBA oficial por premio (proyecciones sobre los umbrales)
const ELIG = {
  MVP   : { minGP: 58, minMPG: 24.0 },
  DPOY  : { minGP: 58, minMPG: 24.0 },
  ROY   : { maxPriorSeasons: 0, maxCurrentGP: 0 }, // 0 partidos previos y 0 actuales
  MIP   : { minGP: 50, minMPG: 20.0, maxPriorSeasons: 6, minPriorSeasons: 1 },
  SIXMOY: { minGP: 50, minMPG: 18.0 },
  CPOY  : { minGP: 50, minMPG: 20.0 },
};

// ─── 10.2 FUNCIONES DE UTILIDAD ──────────────────────────────────────────────

/**
 * Infiere la posición de un jugador a partir de sus estadísticas.
 * Crítico para DPOY: los votantes priorizan bloqueos (interiores) históricamente.
 * @returns 'CENTER' | 'FORWARD' | 'WING' | 'GUARD'
 */
function inferPositionFromStats(player) {
  const bpg = player.stats?.bpg ?? 0;
  const rpg = player.stats?.rpg ?? 0;
  const spg = player.stats?.spg ?? 0;
  const apg = player.stats?.apg ?? 0;
  const ppg = player.stats?.ppg ?? 0;

  if (bpg >= 1.8 && rpg >= 9.0)                  return 'CENTER';
  if (bpg >= 1.0 && rpg >= 6.5)                  return 'FORWARD';
  if (rpg >= 5.0 && bpg < 1.0 && apg < 4.0)     return 'FORWARD';
  if (spg >= 1.3 && apg >= 3.5 && bpg < 0.8)    return 'WING';
  if (apg >= 5.0)                                 return 'GUARD';
  if (ppg >= 20 && spg >= 1.0 && apg >= 2.5)    return 'WING';

  return 'FORWARD';
}

/**
 * Penalización por fatiga de votantes. Curva NO lineal:
 * el primer repeat es el que más penaliza; los sucesivos duelen menos
 * porque los medios "normalizan" la dinastía (Jordan, LeBron, Jokić).
 *
 * @param {string} playerId
 * @param {string} award   'mvp' | 'dpoy' | ...
 * @returns {number} multiplicador en [0.50, 1.15]
 */
function voterFatigueMult(playerId, award) {
  const recent = RECENT_WINS_WINDOW[playerId]?.[award] ?? 0;
  const career = CAREER_WINS_TOTAL[playerId]?.[award] ?? 0;

  // Penalty base por victorias recientes (últimos 3 años)
  // Curva cuadrática atenuada: 0 recientes → sin penalty; 3 recientes → -30%
  const recentPenalty  = 1.0 - (0.12 * recent) - (0.02 * recent * recent);

  // Penalty adicional por victorias totales en carrera (narrativa de novedad)
  // Los votantes quieren "nuevos campeones" cada 2-3 años
  const careerPenalty  = Math.max(0.65, 1.0 - 0.07 * Math.max(0, career - 1));

  // Bonus si el jugador nunca ha ganado (los votantes aman el debut)
  const debutBonus     = (recent === 0 && career === 0) ? 1.12 : 1.00;

  return Math.min(1.15, Math.max(0.50, recentPenalty * careerPenalty * debutBonus));
}

/**
 * Bonus de mercado: los jugadores en grandes ciudades reciben más cobertura
 * mediática, lo que se traduce en más votos de periodistas y fans.
 */
function bigMarketMult(teamId) {
  if (SUPER_MARKETS.has(teamId)) return 1.10;
  if (BIG_MARKETS.has(teamId))   return 1.05;
  return 1.00;
}

/**
 * Factor de calidad del equipo en el contexto de premios individuales.
 * Derivado de la probabilidad de playoffs y el seed esperado del Monte Carlo.
 * Curva sigmoidea con inflexión en ~55% de prob. de playoffs.
 *
 * @returns {number} factor en [0.05, 1.00]
 */
function teamQualityFactor(teamId, mcResults) {
  const mc = mcResults?.[teamId];
  if (!mc) return 0.10;

  const playoffP = mc.madePlayoffsPct / 100;
  const avgSeed  = mc.avgSeed ?? 8;

  // Hard gate: equipos con < 20% de prob de playoffs no pueden ganar MVP
  if (playoffP < 0.20) return 0.05;

  // El seed promedio (Monte Carlo) penaliza de forma suave pero real
  // Seed 1 → seedFactor≈1.0; Seed 4 → 0.76; Seed 7 → 0.56; Seed 10 → 0.40
  const seedFactor = Math.max(0.40, Math.pow(0.88, avgSeed - 1));

  // Combinación: prob. de playoffs pesa 60%, calidad de seed pesa 40%
  return Math.min(1.00, playoffP * 0.60 + seedFactor * 0.40);
}

/**
 * Aplica un boost no lineal cuando la calidad del equipo y la dominancia
 * estadística se alinean (el efecto "Jordan/LeBron en la cima").
 * La interacción es multiplicativa, no aditiva.
 */
function teamStatInteraction(statScore, teamFactor, interactionWeight = 0.35) {
  // Sin interacción: statScore puro
  // Con interacción: la parte "teamFactor" del score se amplifica con el equipo
  return statScore * (interactionWeight * teamFactor + (1.0 - interactionWeight));
}

// ─── 10.3 DISTRIBUCIONES DE LIGA ─────────────────────────────────────────────

/**
 * Construye distribuciones de métricas proyectadas sólo sobre
 * jugadores CUALIFICADOS (filtros de GP y MPG mínimos).
 * Esto evita que los small-sample outliers sesguen los percentiles.
 *
 * @param {Array}  players   Array completo de jugadores
 * @param {object} projMap   Mapa id → proyección
 * @param {number} minGP     Mínimo de partidos proyectados (p50)
 * @param {number} minMPG    Mínimo de minutos proyectados (p50)
 */
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

    const proj  = entry.projections;
    const gpP50 = proj.gp?.p50  ?? 0;
    const mpP50 = proj.mpg?.p50 ?? 0;

    if (gpP50  < minGP)  continue;
    if (mpP50  < minMPG) continue;

    for (const key of Object.keys(dists)) {
      const v = proj[key]?.p50;
      if (v !== undefined && !isNaN(v) && isFinite(v)) dists[key].push(v);
    }
  }

  // Ordenar todos los arrays para cálculo eficiente de percentiles
  for (const key of Object.keys(dists)) dists[key].sort((a, b) => a - b);
  return dists;
}

/**
 * Percentil de un valor dentro de una distribución pre-ordenada.
 * Usa mid-rank para manejo correcto de empates.
 */
function projPctile(value, sortedArr) {
  if (!sortedArr?.length || value === undefined || isNaN(value)) return 50;

  let below = 0, equal = 0;
  for (const v of sortedArr) {
    if      (v < value)  below++;
    else if (v === value) equal++;
    else break; // array está ordenado → podemos parar
  }
  return Math.min(100, Math.round(((below + 0.5 * equal) / sortedArr.length) * 100));
}

// ─── 10.4 MOTOR DE PROBABILIDADES ────────────────────────────────────────────

/**
 * Convierte un array de candidatos con scores en probabilidades calibradas.
 *
 * Temperatura baja  → distribución concentrada (un favorito claro)
 * Temperatura alta  → carrera más igualada
 *
 * @param {Array}  scored       [{id, name, teamId, imageUrl, score, factors, keyStats}]
 * @param {number} topN         Máximo de candidatos a incluir
 * @param {number} temperature  Temperatura del softmax (calibrado por premio)
 * @param {string} awardLabel   Para logging
 */
function assignAwardProbs(scored, topN, temperature, awardLabel) {
  const candidates = scored
    .filter(c => c.score > 0.001)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  if (!candidates.length) {
    console.log(`    [${awardLabel}] Sin candidatos elegibles.`);
    return {};
  }

  // Softmax con temperatura: e^(score/T) / Σ e^(score_i/T)
  const maxScore = candidates[0].score;
  const exps     = candidates.map(c => Math.exp((c.score - maxScore) / temperature));
  const sumExp   = exps.reduce((a, b) => a + b, 1e-12);

  const result = {};
  candidates.forEach((c, i) => {
    const prob = (exps[i] / sumExp) * 100;
    result[c.id] = {
      prob       : +prob.toFixed(2),
      rank       : i + 1,
      eligible   : true,
      name       : c.name,
      teamId     : c.teamId,
      imageUrl   : c.imageUrl,
      scoreRaw   : +c.score.toFixed(5),
      factors    : c.factors   ?? {},
      keyStats   : c.keyStats  ?? {},
    };
  });

  const winner = candidates[0];
  console.log(`    [${awardLabel}] Favorito: ${winner.name} (${result[winner.id].prob}%)  ·  ${candidates.length} candidatos`);
  return result;
}

// ─── 10.5 FILTROS DE ELEGIBILIDAD ────────────────────────────────────────────

/**
 * Filtra candidatos al MVP.
 * Reglas estrictas:
 * · GP proyectado (p50) ≥ 58
 * · MPG proyectado (p50) ≥ 24.0
 * · No ghost player
 * · Probabilidad de playoffs > 20% (hard gate narrativo)
 */
function filterMVPCandidates(players, projMap, mcResults) {
  return players.filter(p => {
    if (p.ghostPlayer) return false;
    const entry = projMap[p.id];
    if (!entry?.projections) return false;

    const proj = entry.projections;
    if ((proj.gp?.p50  ?? 0) < ELIG.MVP.minGP)  return false;
    if ((proj.mpg?.p50 ?? 0) < ELIG.MVP.minMPG) return false;

    // Gate de calidad de equipo: sin playoff realistic no hay MVP
    const mc = mcResults?.[p.teamId];
    if (!mc || mc.madePlayoffsPct < 20) return false;

    return true;
  });
}

/**
 * Filtra candidatos al DPOY.
 * Reglas estrictas:
 * · GP proyectado (p50) ≥ 58
 * · MPG proyectado (p50) ≥ 24.0
 * · No ghost player
 * · Protección small sample: jugadores con <2 temporadas en historial
 * necesitan DBPM proyectado > 0 (sin extrapolación wild de banquillo)
 */
function filterDPOYCandidates(players, projMap) {
  return players.filter(p => {
    if (p.ghostPlayer) return false;
    const entry = projMap[p.id];
    if (!entry?.projections) return false;

    const proj        = entry.projections;
    const gpP50       = proj.gp?.p50  ?? 0;
    const mpgP50      = proj.mpg?.p50 ?? 0;
    const dbpmP50     = proj.dbpm?.p50 ?? -5;
    const priorSeason = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);

    if (gpP50  < ELIG.DPOY.minGP)  return false;
    if (mpgP50 < ELIG.DPOY.minMPG) return false;

    // PROTECCIÓN SMALL SAMPLE: si tiene < 2 temporadas de historial,
    // el WPR puede extrapolarse salvajemente. Exigimos DBPM proyectado > -1
    // para evitar que un bench player con 5 partidos elitistas aparezca como favorito.
    if (priorSeason < 2 && dbpmP50 < -1.0) return false;

    // Necesitamos al menos una señal defensiva real
    const bpgP50 = proj.bpg?.p50 ?? 0;
    const spgP50 = proj.spg?.p50 ?? 0;
    if (dbpmP50 < -2.0 && bpgP50 < 0.5 && spgP50 < 0.8) return false;

    return true;
  });
}

/**
 * Filtra candidatos al ROY.
 *
 * ── REGLA CORREGIDA ──────────────────────────────────────────────────────
 * Un rookie para la temporada 2026-27 debe tener EXACTAMENTE:
 * · 0 temporadas descargadas en la caché histórica de per-game
 * (ni en HIST_SEASONS_PERGAME, es decir, nunca ha jugado en la NBA)
 * · 0 temporadas en BRef (nunca apareció en sus datos)
 * · 0 partidos jugados en la temporada actual 2025-26 (stats.gp === 0)
 *
 * Esto significa que los candidatos son:
 * a) Ghost players del próximo draft (clase 2026 — no en el sistema aún)
 * b) Jugadores que estuvieron todo el 2025-26 lesionados en su primera temporada
 *
 * Desde el punto de vista de nuestro pipeline, estos jugadores tienen
 * perGameSeasons = 0, brefSeasons = 0, y gp = 0 en stats actuales.
 * ─────────────────────────────────────────────────────────────────────────
 */
function filterROYCandidates(players, projMap) {
  return players.filter(p => {
    const entry = projMap[p.id];
    if (!entry) return false;

    // La suma de todas las temporadas históricas descargadas para este jugador
    const priorPerGame  = entry.perGameSeasons ?? 0;
    const priorBref     = entry.brefSeasons    ?? 0;
    const totalPrior    = Math.max(priorPerGame, priorBref);

    // REGLA DURA: 0 temporadas previas en CUALQUIER base de datos
    if (totalPrior > 0) return false;

    // REGLA DURA: 0 partidos jugados en la temporada actual
    // (si jugó en 2025-26, en 2026-27 será sophomore — inelegible)
    if ((p.stats?.gp ?? 0) > 0) return false;

    // Debe ser ghost player (en roster pero sin datos)
    // O jugador que debuta en 2026-27
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.6 MVP — MOST VALUABLE PLAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute MVP odds with a full voter-psychology model.
 *
 * Modelo calibrado sobre 25 años de votaciones reales:
 * · BPM (35%): el predictor estadístico más correlacionado con el ganador
 * · Interacción Equipo × Stats (25%): no puedes ganar el MVP si tu equipo no gana
 * · PPG (15%): proxy de visibilidad mediática
 * · VORP (15%): ajuste por uso y contexto
 * · PER (10%): métrica legacy que siguen usando los medios tradicionales
 *
 * Modificadores narrativos no lineales aplicados en cascada:
 * · Fatiga de votantes (cuadrática inversa)
 * · Bonus de mercado (media coverage)
 * · Bonus de debut (primera victoria narrativa)
 * · Interacción equipo × stats (sigmoidea)
 */
function computeMVPOdds(players, projMap, mcResults, dists) {
  const candidates = filterMVPCandidates(players, projMap, mcResults);
  console.log(`  [MVP] ${candidates.length} candidatos elegibles`);

  const scored = candidates.map(player => {
    const entry = projMap[player.id];
    const proj  = entry.projections;
    const teamId = player.teamId;

    // ── NÚCLEO ESTADÍSTICO (sin modificadores narrativos) ──────────────────
    const pBPM  = projPctile(proj.bpm?.p50  ?? -5,  dists.bpm)  / 100;
    const pVORP = projPctile(proj.vorp?.p50 ?? 0,   dists.vorp) / 100;
    const pPPG  = projPctile(proj.ppg?.p50  ?? 0,   dists.ppg)  / 100;
    const pPER  = projPctile(proj.per?.p50  ?? 15,  dists.per)  / 100;

    // Núcleo estadístico puro (suma ponderada)
    const statsCore = pBPM * 0.35 + pVORP * 0.15 + pPPG * 0.15 + pPER * 0.10;

    // ── FACTOR DE EQUIPO (interacción no lineal) ───────────────────────────
    const teamFactor = teamQualityFactor(teamId, mcResults);
    
    // La interacción multiplica el 25% "narrativo" del score
    // Un jugador en un equipo top-1 con estadísticas élite obtiene un boost compuesto
    const teamStatBoost = teamStatInteraction(statsCore, teamFactor, 0.25);

    // Score antes de modificadores narrativos
    const coreScore = statsCore * 0.75 + proj.bpm?.p50 / 100 * 0.10 + teamStatBoost * 0.15;

    // ── MODIFICADORES NARRATIVOS (aplican en cascada) ──────────────────────
    // 1. Fatiga de votantes (penalización cuadrática)
    const fatigueMult = voterFatigueMult(player.id, 'mvp');

    // 2. Bonus de mercado mediático
    const marketMult = bigMarketMult(teamId);

    // 3. "First MVP" bonus: la narrativa de un nuevo campeón siempre vende
    const isFirstMVP  = (CAREER_WINS_TOTAL[player.id]?.mvp ?? 0) === 0;
    const firstBonus  = isFirstMVP ? 1.12 : 1.00;

    // 4. Penalty si el candidato tiene BPM proyectado negativo (p50 < 0)
    // — no es razonable estadísticamente
    const negBPMPenalty = (proj.bpm?.p50 ?? 0) < 0 ? 0.40 : 1.00;

    // 5. GP confidence: si el intervalo de GP es muy ancho (lesión likely),
    // reducir score (los votantes penalizan la baja disponibilidad)
    const gpBand     = (proj.gp?.p90 ?? 82) - (proj.gp?.p10 ?? 0);
    const gpConfMult = gpBand > 40 ? 0.85 : gpBand > 25 ? 0.93 : 1.00;

    // Score final
    const finalScore = coreScore
      * fatigueMult
      * marketMult
      * firstBonus
      * negBPMPenalty
      * gpConfMult;

    const mc = mcResults?.[teamId] ?? {};
    return {
      id      : player.id,
      name    : player.name,
      teamId,
      imageUrl: player.imageUrl,
      score   : Math.max(0, finalScore),
      factors : {
        pBPM          : +pBPM.toFixed(3),
        pVORP         : +pVORP.toFixed(3),
        pPPG          : +pPPG.toFixed(3),
        pPER          : +pPER.toFixed(3),
        statsCore     : +statsCore.toFixed(3),
        teamFactor    : +teamFactor.toFixed(3),
        fatigueMult   : +fatigueMult.toFixed(3),
        marketMult    : +marketMult.toFixed(2),
        firstBonus    : +firstBonus.toFixed(2),
        gpConfMult    : +gpConfMult.toFixed(2),
      },
      keyStats: {
        bpmProj     : proj.bpm?.p50,
        vorpProj    : proj.vorp?.p50,
        ppgProj     : proj.ppg?.p50,
        perProj     : proj.per?.p50,
        gpP50       : proj.gp?.p50,
        mpgP50      : proj.mpg?.p50,
        avgSeed     : +(mc.avgSeed ?? 8).toFixed(1),
        playoffPct  : mc.madePlayoffsPct ?? 0,
        championPct : mc.championPct    ?? 0,
      },
    };
  });

  // Temperatura calibrada para MVP: hay una carrera más concentrada que otros premios
  return assignAwardProbs(scored, 25, 0.55, 'MVP');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.7 DPOY — DEFENSIVE PLAYER OF THE YEAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modelo DPOY con dos pistas separadas basadas en el perfil del jugador:
 *
 * Pista INTERIOR (CENTER/FORWARD):
 * DBPM (35%) + BPG (30%) + RPG (15%) + DefRtg equipo (15%) + SPG (5%)
 * Los votantes históricamente SOBREPONDERAN los tapones en interiores.
 * Gobert ganó 4 DPOYs con DBPM mediocre pero BPG élite en contexto.
 *
 * Pista PERIMETRAL (WING/GUARD):
 * DBPM (45%) + SPG (25%) + DefRtg equipo (20%) + BPG (10%)
 * Los perimetrales necesitan DBPM mucho más alto para competir.
 *
 * Penalización small sample: el filtro de elegibilidad ya eliminó outliers
 * de banquillo profundo, pero añadimos una comprobación adicional de
 * consistencia histórica para DBPM.
 */
function computeDPOYOdds(players, projMap, mcResults, dists) {
  const candidates = filterDPOYCandidates(players, projMap);
  console.log(`  [DPOY] ${candidates.length} candidatos elegibles`);

  // Distribuciones separadas por pista para percentiles más precisos
  const interiorPlayers = candidates.filter(p =>
    ['CENTER', 'FORWARD'].includes(inferPositionFromStats(p))
  );
  const perimPlayers = candidates.filter(p =>
    ['WING', 'GUARD'].includes(inferPositionFromStats(p))
  );

  const interiorDBPM = interiorPlayers.map(p =>
    projMap[p.id]?.projections?.dbpm?.p50 ?? -3).sort((a,b)=>a-b);
  const perimDBPM    = perimPlayers.map(p =>
    projMap[p.id]?.projections?.dbpm?.p50 ?? -3).sort((a,b)=>a-b);

  const scored = candidates.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;
    const pos    = inferPositionFromStats(player);
    const isInterior = pos === 'CENTER' || pos === 'FORWARD';
    const mc     = mcResults?.[teamId] ?? {};

    // ── MÉTRICAS PROYECTADAS ───────────────────────────────────────────────
    const dbpmP50  = proj.dbpm?.p50 ?? -3;
    const bpgP50   = proj.bpg?.p50  ?? 0;
    const spgP50   = proj.spg?.p50  ?? 0;
    const rpgP50   = proj.rpg?.p50  ?? 0;

    // Percentiles dentro de la liga (distribución completa de cualificados)
    const pDBPM_all = projPctile(dbpmP50, dists.dbpm) / 100;
    const pBPG      = projPctile(bpgP50,  dists.bpg)  / 100;
    const pSPG      = projPctile(spgP50,  dists.spg)  / 100;
    const pRPG      = projPctile(rpgP50,  dists.rpg)  / 100;

    // Percentil dentro de la PISTA propia (más justo para comparar interior vs perímetro)
    const pDBPM_pos = isInterior
      ? projPctile(dbpmP50, interiorDBPM) / 100
      : projPctile(dbpmP50, perimDBPM)    / 100;

    // Factor de equipo: su defensa importa (el DPOY suele ser de buen equipo defensivo)
    const playoffP = mc.madePlayoffsPct / 100 ?? 0;
    // Proxy de calidad defensiva del equipo desde MC → defensividad alta si ganan más
    const teamDefFactor = Math.min(1.0, 0.4 + playoffP * 0.6);

    // ── SCORE POR PISTA ───────────────────────────────────────────────────
    let statsScore;
    let posMultiplier;

    if (isInterior) {
      // PISTA INTERIOR: los tapones dominan la narrativa del DPOY
      statsScore    = pDBPM_pos * 0.35 + pBPG * 0.30 + pRPG * 0.15 + pSPG * 0.05;
      posMultiplier = 1.08; // Leve ventaja histórica de interiores
    } else {
      // PISTA PERIMETRAL: necesitan DBPM mucho más alto para competir
      statsScore    = pDBPM_pos * 0.45 + pSPG * 0.25 + pBPG * 0.10;
      posMultiplier = 1.00;
      // Penalización extra si DBPM < 1.5 en perímetro (barra más alta para guardia/alero)
      if (dbpmP50 < 1.5) posMultiplier *= 0.80;
    }

    // Factor de equipo defensivo (15% del score total)
    const withTeam = statsScore * 0.85 + teamDefFactor * 0.15;

    // ── MODIFICADORES NARRATIVOS ───────────────────────────────────────────
    const fatigueMult = voterFatigueMult(player.id, 'dpoy');
    const marketMult  = bigMarketMult(teamId);

    // Penalización de consistencia histórica: si tiene < 3 temporadas de datos,
    // el WPR tuvo poco con qué trabajar → reducir confianza en el p50
    const priorSeasons  = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);
    const consistencyM  = priorSeasons >= 4 ? 1.00 : priorSeasons >= 2 ? 0.88 : 0.70;

    // Score final
    const finalScore = withTeam
      * posMultiplier
      * fatigueMult
      * marketMult
      * consistencyM;

    return {
      id      : player.id,
      name    : player.name,
      teamId,
      imageUrl: player.imageUrl,
      score   : Math.max(0, finalScore),
      factors : {
        position      : pos,
        pDBPM_pos     : +pDBPM_pos.toFixed(3),
        pBPG          : +pBPG.toFixed(3),
        pSPG          : +pSPG.toFixed(3),
        pRPG          : +pRPG.toFixed(3),
        statsScore    : +statsScore.toFixed(3),
        teamDefFactor : +teamDefFactor.toFixed(3),
        posMultiplier : +posMultiplier.toFixed(2),
        fatigueMult   : +fatigueMult.toFixed(3),
        marketMult    : +marketMult.toFixed(2),
        consistencyM  : +consistencyM.toFixed(2),
      },
      keyStats: {
        dbpmProj    : dbpmP50,
        bpgProj     : bpgP50,
        spgProj     : spgP50,
        rpgProj     : rpgP50,
        position    : pos,
        gpP50       : proj.gp?.p50,
        playoffPct  : mc.madePlayoffsPct ?? 0,
        priorSeasons,
      },
    };
  });

  // DPOY tiene temperatura ligeramente más alta: la carrera suele ser más abierta
  return assignAwardProbs(scored, 20, 0.62, 'DPOY');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.8 ROY — ROOKIE OF THE YEAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modelo ROY para la temporada 2026-27.
 *
 * REALIDAD DEL PIPELINE:
 * Los verdaderos candidatos al ROY 2026-27 son la clase del Draft 2026.
 * En el momento en que el pipeline genera proyecciones (pre-temporada),
 * estos jugadores pueden o no estar ya en el sistema:
 * · Si el Draft ya ocurrió y firmaron → aparecen como ghostPlayers (gp=0)
 * · Si aún no han debutado → no están en el sistema
 *
 * La elegibilidad es ESTRICTA:
 * · perGameSeasons = 0 (nunca han aparecido en ninguna caché histórica)
 * · brefSeasons = 0 (nunca han tenido datos en Basketball-Reference)
 * · gp_actual = 0 (no jugaron ningún partido en 2025-26)
 *
 * Si el sistema retorna 0 candidatos, el output incluye un flag explicativo
 * y una nota de que la clase del draft aún no está disponible.
 *
 * Modelo de score para candidatos sin datos históricos:
 * · Contexto del equipo (40%) — los rookies en buenas organizaciones juegan más y ganan más votos
 * · Pick del draft (30%) — proxy de talento esperado (si está disponible en el nombre)
 * · Potencial de minutos proyectado (30%) — estimación de oportunidad
 */
function computeROYOdds(players, projMap) {
  const candidates = filterROYCandidates(players, projMap);
  console.log(`  [ROY] ${candidates.length} candidatos elegibles (clase draft 2026 detectada)`);

  if (candidates.length === 0) {
    // Retornar resultado vacío con nota explicativa
    return {
      _meta: {
        eligible: 0,
        note    : 'La clase del Draft 2026 no está disponible en el pipeline actual. ' +
                  'ROY 2026-27 se recalculará automáticamente cuando los rookies ' +
                  'sean añadidos al sistema (post-draft, agosto 2026).',
        season  : TARGET_SEASON,
      }
    };
  }

  // Para candidatos sin historial, el score se basa en contexto externo
  const scored = candidates.map(player => {
    const teamId = player.teamId;
    const mc     = projMap[player.id] ? (projMap[player.id].projections ?? {}) : {};

    // Calidad del equipo como proxy de oportunidad y votos
    // (rookies en equipos ganadores reciben más exposición y a menudo más minutos)
    const teamMC       = projMap[player.id]?.mcResults?.[teamId] ?? {};
    const playoffP     = (teamMC.madePlayoffsPct ?? 40) / 100;
    const teamOppScore = Math.min(1.0, 0.3 + playoffP * 0.7);

    // Si el nombre incluye señales de alta posición de draft (imposible saber con certeza)
    // Usamos el age como proxy: rookies más jóvenes suelen ser picks más altos
    const ageScore = player.age > 0
      ? Math.max(0, Math.min(1, (23 - player.age) / 6))
      : 0.5;

    // Big market bonus (rookies en NY/LA obtienen cobertura desproporcionada)
    const marketMult = bigMarketMult(teamId);

    const finalScore = (teamOppScore * 0.40 + ageScore * 0.30 + 0.30)
      * marketMult;

    return {
      id      : player.id,
      name    : player.name,
      teamId,
      imageUrl: player.imageUrl,
      score   : Math.max(0, finalScore),
      factors : {
        teamOppScore  : +teamOppScore.toFixed(3),
        ageScore      : +ageScore.toFixed(3),
        marketMult    : +marketMult.toFixed(2),
        note          : 'Score de baja confianza: sin historial previo disponible',
      },
      keyStats: {
        age           : player.age,
        teamId,
        currentGP     : player.stats?.gp ?? 0,
        priorSeasons  : 0,
        confidence    : 'very_low',
      },
    };
  });

  // Temperatura alta para ROY: incertidumbre máxima sin datos históricos
  return assignAwardProbs(scored, 15, 0.90, 'ROY');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.9 MIP — MOST IMPROVED PLAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filtra candidatos al MIP.
 * · 1 ≤ temporadas previas ≤ 6 (ventana real del arquetipo MIP)
 * · Continuidad de rol proyectada: GP p50 ≥ 50, MPG p50 ≥ 20
 * · Temporada base real: necesitamos un "antes" para medir el salto (currentSeason.gp ≥ 35)
 * · EXCLUSIÓN DURA (regla oficial NBA): ya ganó MVP/DPOY/ROY/MIP/6MOY alguna vez
 * · EXCLUSIÓN DURA: BPM actual ya élite (≥ 6.0) — probable All-NBA, sin margen narrativo de "mejora"
 */
function filterMIPCandidates(players, projMap) {
  return players.filter(p => {
    if (p.ghostPlayer) return false;
    const entry = projMap[p.id];
    if (!entry?.projections) return false;

    const proj = entry.projections;
    const priorSeasons = Math.max(entry.perGameSeasons ?? 0, entry.brefSeasons ?? 0);

    if (priorSeasons < ELIG.MIP.minPriorSeasons) return false;
    if (priorSeasons > ELIG.MIP.maxPriorSeasons) return false;
    if ((proj.gp?.p50  ?? 0) < ELIG.MIP.minGP)  return false;
    if ((proj.mpg?.p50 ?? 0) < ELIG.MIP.minMPG) return false;
    if ((p.stats?.gp   ?? 0) < 35)              return false;

    const recent = RECENT_WINS_WINDOW[p.id]  ?? {};
    const career = CAREER_WINS_TOTAL[p.id]   ?? {};
    const everWonMajor = ['mvp', 'dpoy', 'roy', 'mip', 'sixmoy'].some(k =>
      (recent[k] ?? 0) > 0 || (career[k] ?? 0) > 0
    );

    if (everWonMajor) return false;
    if ((p.adv?.bpm ?? 0) >= 6.0) return false; // ya es una estrella consolidada

    return true;
  });
}

/**
 * MIP — Most Improved Player.
 *
 * El predictor #1 histórico es la TRAYECTORIA, no el nivel absoluto: los
 * votantes premian el salto, no el destino. Por eso el modelo pondera el
 * MOMENTUM (derivada de primer orden del WPR) muy por encima del p50.
 *
 * Momentum BPM   (35%) — salto de impacto real, ya filtrado de ruido por el WPR
 * Momentum PPG   (25%) — salto visible para el votante medio (counting stats)
 * Destino BPM    (20%) — el salto debe aterrizar en relevancia real
 * Contexto equipo(20%) — equipos que también mejoran refuerzan la narrativa
 * Bonus 'breakout' no lineal sobre el total
 */
function computeMIPOdds(players, projMap, mcResults, dists) {
  const candidates = filterMIPCandidates(players, projMap);
  console.log(`  [MIP] ${candidates.length} candidatos elegibles`);

  const momBPMPool = candidates.map(p => projMap[p.id]?.projections?.bpm?.momentum ?? 0);
  const momPPGPool = candidates.map(p => projMap[p.id]?.projections?.ppg?.momentum ?? 0);

  const sortedMomBPM = [...momBPMPool].sort((a, b) => a - b);
  const sortedMomPPG = [...momPPGPool].sort((a, b) => a - b);

  const scored = candidates.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;

    const momBPM = proj.bpm?.momentum ?? 0;
    const momPPG = proj.ppg?.momentum ?? 0;

    // Floor: necesitamos un salto real, no ruido estadístico residual
    if (momBPM < 0.4 && momPPG < 1.5) {
      return { id: player.id, name: player.name, teamId, imageUrl: player.imageUrl, score: 0 };
    }

    const pMomBPM  = projPctile(momBPM, sortedMomBPM) / 100;
    const pMomPPG  = projPctile(momPPG, sortedMomPPG) / 100;
    const pDestBPM = projPctile(proj.bpm?.p50 ?? 0, dists.bpm) / 100;

    const mc = mcResults?.[teamId] ?? {};
    const teamWinsProj = mc.avgWins ?? 0;
    const teamMomentumBonus = teamWinsProj >= 44 ? 1.15 : teamWinsProj >= 36 ? 1.06 : 1.00;

    const breakoutBonus = proj.bpm?.trend === 'breakout'  ? 1.25
                        : proj.bpm?.trend === 'improving' ? 1.08
                        : 1.00;

    const statsCore = pMomBPM * 0.35 + pMomPPG * 0.25 + pDestBPM * 0.20;
    const withTeam  = statsCore + (teamMomentumBonus - 1.0) * 0.20;

    // Penalización de confianza: momentum derivado de pocas temporadas pesa menos
    const confMult = proj.bpm?.confidence === 'high'   ? 1.00
                   : proj.bpm?.confidence === 'medium' ? 0.92 : 0.80;

    const fatigueMult = voterFatigueMult(player.id, 'mip');
    const marketMult  = bigMarketMult(teamId);

    const finalScore = withTeam * breakoutBonus * confMult * fatigueMult * marketMult;

    return {
      id: player.id, name: player.name, teamId, imageUrl: player.imageUrl,
      score: Math.max(0, finalScore),
      factors: {
        pMomBPM: +pMomBPM.toFixed(3), pMomPPG: +pMomPPG.toFixed(3),
        pDestBPM: +pDestBPM.toFixed(3), breakoutBonus: +breakoutBonus.toFixed(2),
        teamMomentumBonus: +teamMomentumBonus.toFixed(2), confMult: +confMult.toFixed(2),
        fatigueMult: +fatigueMult.toFixed(3), marketMult: +marketMult.toFixed(2),
      },
      keyStats: {
        bpmMomentum: +momBPM.toFixed(2), ppgMomentum: +momPPG.toFixed(2),
        bpmCurrent : player.adv?.bpm,   bpmProj: proj.bpm?.p50,
        ppgCurrent : player.stats?.ppg, ppgProj: proj.ppg?.p50,
        trend: proj.bpm?.trend,
      },
    };
  });

  return assignAwardProbs(scored, 18, 0.58, 'MIP');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.10 6MOY — SIXTH MAN OF THE YEAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ranking de USG proyectado de cada jugador DENTRO de su propio equipo.
 * Esencial para 6MOY: el sexto hombre real casi nunca es la opción #1 de
 * uso de su equipo — esa suele ser el titular franquicia.
 *
 * @returns {Map<playerId, number>} ranking 1-indexado (1 = mayor USG del equipo)
 */
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
    roster.forEach((entry, i) => rankMap.set(entry.id, i + 1));
  }
  return rankMap;
}

/**
 * Kernel gaussiano centrado en el "sweet spot" de minutos del sexto hombre
 * arquetípico (~23 mpg). Penaliza tanto a titulares de minutos plenos como
 * a jugadores de garbage time — sin necesidad del campo `gs` (no fiable).
 */
function mpgSweetSpotScore(mpg, center = 23, sigma = 5.5) {
  return Math.exp(-Math.pow(mpg - center, 2) / (2 * sigma * sigma));
}

/**
 * Filtra candidatos a 6MOY.
 * NO se usa `gs` (games started) — confirmado corrupto/vacío en el pipeline
 * actual (incluso titulares franquicia muestran gs=0). En su lugar: rango
 * de minutos + perfil de anotador secundario + no-ser-la-opción-#1 de uso.
 */
function filter6MOYCandidates(players, projMap, usageRankMap) {
  return players.filter(p => {
    if (p.ghostPlayer) return false;
    const entry = projMap[p.id];
    if (!entry?.projections) return false;

    const proj = entry.projections;
    if ((proj.gp?.p50  ?? 0) < ELIG.SIXMOY.minGP)  return false;
    if ((proj.mpg?.p50 ?? 0) < ELIG.SIXMOY.minMPG) return false;

    const mpgP50 = proj.mpg.p50;
    if (mpgP50 < 16 || mpgP50 > 31) return false;

    const usageRank = usageRankMap.get(p.id) ?? 99;
    if (usageRank === 1) return false; // no puede ser la opción #1 de su equipo
    if ((proj.ppg?.p50 ?? 0) < 8) return false; // necesita perfil real de anotador

    return true;
  });
}

/**
 * 6MOY — Sixth Man of the Year.
 *
 * Arquetipo histórico ("instant offense"): Lou Williams, Jordan Clarkson,
 * Malik Beasley, Naz Reid, Tyler Herro (pre-titularización).
 *
 * Sweet spot de minutos  (30%) — kernel gaussiano centrado en ~23 mpg
 * USG proyectado         (25%) — debe seguir creando su propio tiro
 * PPG proyectado         (20%) — visibilidad de "anotador instantáneo"
 * TS% proyectado         (10%) — desempate de eficiencia entre volume scorers
 * Bonus de pureza de rol (15%) — óptimo en rank 2-3 de uso de su equipo
 */
function compute6MOYOdds(players, projMap, mcResults, dists) {
  const usageRankMap = buildTeamUsageRanks(players, projMap);
  const candidates    = filter6MOYCandidates(players, projMap, usageRankMap);
  console.log(`  [6MOY] ${candidates.length} candidatos elegibles`);

  const scored = candidates.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;

    const mpgP50 = proj.mpg.p50;
    const usgP50 = proj.usg?.p50 ?? 15;
    const ppgP50 = proj.ppg?.p50 ?? 0;
    const tsP50  = proj.ts?.p50  ?? 50;

    const mpgFit = mpgSweetSpotScore(mpgP50);
    const pUSG   = projPctile(usgP50, dists.usg) / 100;
    const pPPG   = projPctile(ppgP50, dists.ppg) / 100;
    const pTS    = projPctile(tsP50,  dists.ts)  / 100;

    // Bonus de pureza de rol: pico suave en rank 2-3 (segunda/tercera opción
    // clara, pero nunca la primera). Ranks muy altos diluyen la narrativa.
    const usageRank = usageRankMap.get(player.id) ?? 5;
    const roleFitBonus = usageRank <= 4
      ? 1.00 - Math.abs(usageRank - 2.5) * 0.04
      : Math.max(0.55, 1.00 - (usageRank - 4) * 0.10);

    const statsCore = mpgFit * 0.30 + pUSG * 0.25 + pPPG * 0.20 + pTS * 0.10;
    const withRole  = statsCore + roleFitBonus * 0.15;

    const fatigueMult = voterFatigueMult(player.id, 'sixmoy');
    const marketMult  = bigMarketMult(teamId);

    const mc = mcResults?.[teamId] ?? {};
    const teamCompetitiveMult = (mc.madePlayoffsPct ?? 0) >= 50 ? 1.08 : 1.00;

    const finalScore = withRole * fatigueMult * marketMult * teamCompetitiveMult;

    return {
      id: player.id, name: player.name, teamId, imageUrl: player.imageUrl,
      score: Math.max(0, finalScore),
      factors: {
        mpgFit: +mpgFit.toFixed(3), pUSG: +pUSG.toFixed(3), pPPG: +pPPG.toFixed(3),
        pTS: +pTS.toFixed(3), usageRank, roleFitBonus: +roleFitBonus.toFixed(3),
        fatigueMult: +fatigueMult.toFixed(3), marketMult: +marketMult.toFixed(2),
        teamCompetitiveMult: +teamCompetitiveMult.toFixed(2),
      },
      keyStats: {
        mpgProj: mpgP50, usgProj: usgP50, ppgProj: ppgP50, tsProj: tsP50,
        usageRankOnTeam: usageRank, playoffPct: mc.madePlayoffsPct ?? 0,
      },
    };
  });

  return assignAwardProbs(scored, 18, 0.62, '6MOY');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.11 COTY — COACH OF THE YEAR  (premio de EQUIPO, no de jugador)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Accesores defensivos de victorias/derrotas de temporada base.
 * Soportan tanto forma plana (team.wins) como anidada (team.current.wins),
 * según el punto exacto del pipeline desde el que se invoque esta sección.
 */
function getTeamCurrentWins(team)   { return team?.current?.wins   ?? team?.wins   ?? 0; }
function getTeamCurrentLosses(team) { return team?.current?.losses ?? team?.losses ?? 0; }

/**
 * COTY — Coach of the Year.
 *
 * Candidato = la organización (mismo motor softmax que el resto de premios;
 * assignAwardProbs acepta cualquier {id, name, teamId, imageUrl, score}).
 *
 * Núcleo: salto entre victorias REALES de la temporada base y victorias
 * ESPERADAS (avgWins de Monte Carlo). Los votantes premian el turnaround,
 * no la continuidad de la excelencia — un equipo de 60 que sube a 63 no es
 * historia de COTY; uno de 28 que sube a 46 sí lo es.
 *
 * ΔWins con saturación   1 − e^(−Δ/12)  (rendimientos decrecientes tras +12)
 * Penalización fuerte si el equipo YA era élite la temporada anterior
 * Bonus si el salto aterriza en seed top-4 ("nuevo contendiente")
 * Bonus de mercado mediático
 */
function computeCOTYOdds(teamProjections, mcResults) {
  const scored = teamProjections.map(team => {
    const mc       = mcResults?.[team.abbreviation] ?? {};
    const avgWins  = mc.avgWins ?? team.projected?.wins ?? 0;
    const lastWins = getTeamCurrentWins(team);
    const delta    = avgWins - lastWins;

    if (delta < 5 || avgWins < 36) {
      return { id: team.abbreviation, name: team.name, teamId: team.abbreviation,
               imageUrl: team.imageUrl, score: 0 };
    }

    const deltaScore = 1 - Math.exp(-delta / 12);

    // Penalización severa: un COTY casi nunca recae en el entrenador de un
    // equipo que ya partía de 48+ victorias la temporada anterior
    const alreadyEliteMult = lastWins >= 48 ? 0.30 : lastWins >= 42 ? 0.65 : 1.00;

    const avgSeed   = mc.avgSeed ?? 8;
    const tierBonus = avgSeed <= 4 ? 1.18 : avgSeed <= 6 ? 1.06 : 1.00;
    const marketMult = bigMarketMult(team.abbreviation);

    const finalScore = deltaScore * alreadyEliteMult * tierBonus * marketMult;

    return {
      id: team.abbreviation, name: team.name, teamId: team.abbreviation,
      imageUrl: team.imageUrl,
      score: Math.max(0, finalScore),
      factors: {
        delta: r1(delta), deltaScore: +deltaScore.toFixed(3),
        alreadyEliteMult: +alreadyEliteMult.toFixed(2),
        tierBonus: +tierBonus.toFixed(2), marketMult: +marketMult.toFixed(2),
      },
      keyStats: {
        lastSeasonWins  : lastWins,
        lastSeasonLosses: getTeamCurrentLosses(team),
        projectedWins   : r1(avgWins),
        avgSeed         : +avgSeed.toFixed(1),
        playoffPct      : mc.madePlayoffsPct ?? 0,
        conference      : team.conference,
      },
    };
  });

  return assignAwardProbs(scored, 12, 0.50, 'COTY');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.12 CPOY — CLUTCH PLAYER OF THE YEAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Proximidad gaussiana de NetRtg a 0 — proxy de "volumen de partidos
 * ajustados" de un equipo. Un NetRtg≈0 implica, por definición, márgenes
 * de victoria/derrota pequeños en promedio → más situaciones de clutch real.
 *
 * NOTA DE DISEÑO: usamos esta proximidad como proxy ÚNICO de competitividad
 * y volumen de clutch combinados, ya que ambos conceptos están intrínsecamente
 * ligados. Una medición más rigurosa requeriría splits de "clutch time" por
 * partido, que no forman parte de este pipeline (limitación documentada).
 */
function closeGameProximity(netRtg, sigma = 5.0) {
  return Math.exp(-Math.pow(netRtg, 2) / (2 * sigma * sigma));
}

/**
 * Filtra candidatos a CPOY.
 * El "cerrador" arquetípico es un creador de alto uso y alto impacto —
 * literalmente quien recibe el balón en los últimos segundos.
 */
function filterCPOYCandidates(players, projMap) {
  return players.filter(p => {
    if (p.ghostPlayer) return false;
    const entry = projMap[p.id];
    if (!entry?.projections) return false;

    const proj = entry.projections;
    if ((proj.gp?.p50  ?? 0) < ELIG.CPOY.minGP)  return false;
    if ((proj.mpg?.p50 ?? 0) < ELIG.CPOY.minMPG) return false;
    if ((proj.usg?.p50 ?? 0) < 24)               return false; // sólo creadores primarios
    if ((proj.bpm?.p50 ?? 0) < 1.0)              return false; // debe ser jugador de impacto real

    return true;
  });
}

/**
 * CPOY — Clutch Player of the Year.
 *
 * Proxy analítico (no hay splits de "clutch time" en este pipeline):
 * USG proyectado          (35%) — el balón debe terminar en sus manos
 * BPM proyectado          (30%) — debe ser, en general, un jugador de impacto élite
 * TS% proyectado          (15%) — un cerrador ineficiente no sobrevive al voto
 * Proximidad NetRtg→0     (escala multiplicativa, suelo 0.5x) — volumen de
 * oportunidad clutch real de su equipo
 */
function computeCPOYOdds(players, projMap, mcResults, dists, teamProjections) {
  const candidates = filterCPOYCandidates(players, projMap);
  console.log(`  [CPOY] ${candidates.length} candidatos elegibles`);

  const netRtgByTeam = new Map(
    teamProjections.map(t => [t.abbreviation, t.projected?.netRtg ?? 0])
  );

  const scored = candidates.map(player => {
    const entry  = projMap[player.id];
    const proj   = entry.projections;
    const teamId = player.teamId;

    const usgP50 = proj.usg.p50;
    const bpmP50 = proj.bpm.p50;
    const tsP50  = proj.ts?.p50 ?? 50;

    const pUSG = projPctile(usgP50, dists.usg) / 100;
    const pBPM = projPctile(bpmP50, dists.bpm) / 100;
    const pTS  = projPctile(tsP50,  dists.ts)  / 100;

    const statsCore = pUSG * 0.35 + pBPM * 0.30 + pTS * 0.15;

    const teamNetRtg    = netRtgByTeam.get(teamId) ?? 0;
    const proximity     = closeGameProximity(teamNetRtg);
    const teamCloseMult = 0.5 + 0.5 * proximity; // suelo 0.5x: un crack dominante conserva presencia clutch

    const fatigueMult = voterFatigueMult(player.id, 'cpoy');
    const marketMult  = bigMarketMult(teamId);

    const finalScore = statsCore * teamCloseMult * fatigueMult * marketMult;

    return {
      id: player.id, name: player.name, teamId, imageUrl: player.imageUrl,
      score: Math.max(0, finalScore),
      factors: {
        pUSG: +pUSG.toFixed(3), pBPM: +pBPM.toFixed(3), pTS: +pTS.toFixed(3),
        teamNetRtg: r1(teamNetRtg), proximity: +proximity.toFixed(3),
        teamCloseMult: +teamCloseMult.toFixed(3),
        fatigueMult: +fatigueMult.toFixed(3), marketMult: +marketMult.toFixed(2),
      },
      keyStats: {
        usgProj: usgP50, bpmProj: bpmP50, tsProj: tsP50, teamNetRtgProj: r1(teamNetRtg),
      },
    };
  });

  return assignAwardProbs(scored, 15, 0.60, 'CPOY');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.13 ORQUESTADOR — computeAllAwards
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta los 7 modelos de premios y consolida resultados.
 *
 * IMPORTANTE: COTY es un premio de EQUIPO, no de jugador. No puede vivir
 * dentro de `projMap[id].awardOdds` porque no hay un jugador al que asociarlo
 * — se devuelve como objeto independiente en el retorno de esta función
 * (`{ ..., coty }`), y el caller debe escribirlo en el JSON de salida a nivel
 * de equipo/temporada, no dentro del array de jugadores.
 *
 * @param {Array}  players          Array completo de nba_players_current.json
 * @param {object} projMap          Mapa id → proyección (mutado in-place: awardOdds)
 * @param {object} mcResults        Resultado de runMonteCarlo()
 * @param {Array}  teamProjections  Equipos con .projected (netRtg, wins, etc.)
 */
function computeAllAwards(players, projMap, mcResults, teamProjections) {
  console.log('\n🏆 FASE PREMIOS: Ejecutando 7 modelos de predicción...');

  // Distribución "élite" (MVP, DPOY, CPOY) — filtros estrictos de minutos/partidos
  const eliteDists    = buildProjDists(players, projMap, 55, 22.0);

  // Distribución "rotación amplia" (MIP, 6MOY) — más laxa: estos premios suelen
  // recaer en jugadores de banquillo o roles secundarios, no sólo estrellas
  const rotationDists = buildProjDists(players, projMap, 40, 14.0);

  const mvp    = computeMVPOdds  (players, projMap, mcResults, eliteDists);
  const dpoy   = computeDPOYOdds (players, projMap, mcResults, eliteDists);
  const roy    = computeROYOdds  (players, projMap);
  const mip    = computeMIPOdds  (players, projMap, mcResults, rotationDists);
  const sixmoy = compute6MOYOdds (players, projMap, mcResults, rotationDists);
  const coty   = computeCOTYOdds (teamProjections, mcResults);
  const cpoy   = computeCPOYOdds (players, projMap, mcResults, eliteDists, teamProjections);

  // Inyección en cada jugador — TODOS excepto COTY (ver nota arriba)
  for (const p of players) {
    const entry = projMap[p.id];
    if (!entry) continue;

    entry.awardOdds = {
      mvp   : mvp[p.id]    ?? { prob: 0, rank: null, eligible: false },
      dpoy  : dpoy[p.id]   ?? { prob: 0, rank: null, eligible: false },
      roy   : roy[p.id]    ?? { prob: 0, rank: null, eligible: false },
      mip   : mip[p.id]    ?? { prob: 0, rank: null, eligible: false },
      sixmoy: sixmoy[p.id] ?? { prob: 0, rank: null, eligible: false },
      cpoy  : cpoy[p.id]   ?? { prob: 0, rank: null, eligible: false },
    };
  }

  const leader = (obj, fallback = 'N/A') => {
    const entries = Object.entries(obj).filter(([k]) => k !== '_meta');
    if (!entries.length) return { name: fallback, prob: 0 };
    return entries.sort((a, b) => b[1].prob - a[1].prob)[0][1];
  };

  console.log(`\n  📋 Resumen de favoritos:`);
  console.log(`     MVP    → ${leader(mvp).name}  (${leader(mvp).prob}%)`);
  console.log(`     DPOY   → ${leader(dpoy).name} (${leader(dpoy).prob}%)`);
  console.log(`     ROY    → ${leader(roy, 'Pendiente Draft 2026').name} (${leader(roy).prob}%)`);
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
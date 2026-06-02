/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  SPORTS INTEL HUB — NBA DATA PIPELINE                                       ║
 * ║  scripts/fetchNBADataPipeline.mjs                                            ║
 * ║                                                                              ║
 * ║  Runs server-side (GitHub Actions / local Node 18+):                        ║
 * ║  • Fetches NBA stats API with proper headers (no CORS)                       ║
 * ║  • Merges with local Basketball-Reference data (real BPM/PER/VORP/WS48)    ║
 * ║  • Computes all percentiles, ratings, and advanced metrics                   ║
 * ║  • Writes public/data/nba_players_current.json                              ║
 * ║         and  public/data/nba_teams_current.json                              ║
 * ║                                                                              ║
 * ║  Usage:                                                                      ║
 * ║    node scripts/fetchNBADataPipeline.mjs            → season 2025-26        ║
 * ║    node scripts/fetchNBADataPipeline.mjs 2024-25    → histórico             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEASON = process.argv[2] || '2025-26';
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════
const RATE_LIMIT_MS = 3800;   // ms mínimo entre requests a la NBA API
const TIMEOUT_MS    = 32_000; // timeout por request

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

// ════════════════════════════════════════════════════════
// HELPERS GENÉRICOS
// ════════════════════════════════════════════════════════
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getStat(row, headers, key) {
  const idx = headers.indexOf(key);
  return idx !== -1 && row[idx] !== null && row[idx] !== undefined
    ? Number(row[idx])
    : 0;
}

function getString(row, headers, key, fallback = '') {
  const idx = headers.indexOf(key);
  return idx !== -1 && row[idx] !== null && row[idx] !== undefined
    ? String(row[idx])
    : fallback;
}

/**
 * parsePct: convierte ratio (0–1) a porcentaje sólo si es estrictamente ratio.
 * FIX vs el servicio: el original usaba `val <= 1` capturando también valores
 * legítimamente < 1 como bpg=0.8. Aquí exigimos > 0 AND < 1 (excluye 0 y 1).
 */
function parsePct(val) {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return 0.0;
  const pct = (val > 0 && val < 1) ? val * 100 : val;
  return Number(pct.toFixed(1));
}

// ════════════════════════════════════════════════════════
// ESTADÍSTICA CORREGIDA
// ════════════════════════════════════════════════════════

/**
 * Mid-rank percentile (FIX del bug auditado).
 * arr debe estar pre-ordenado (asc).
 */
function calcPercentile(val, sortedArr) {
  if (!sortedArr?.length || val === undefined || isNaN(val)) return 50;
  let below = 0, equal = 0;
  for (const v of sortedArr) {
    if      (v < val) below++;
    else if (v === val) equal++;
  }
  return Math.min(100, Math.round(((below + 0.5 * equal) / sortedArr.length) * 100));
}

function zScore(val, arr) {
  if (!arr?.length || isNaN(val)) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd   = Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length) || 1;
  return (val - mean) / sd;
}

const asc = (arr) => [...arr].sort((a, b) => a - b);

// ════════════════════════════════════════════════════════
// NBA API FETCHER (Server-side — sin CORS)
// ════════════════════════════════════════════════════════
let lastFetchAt = 0;

async function fetchFromNBA(endpoint, retries = 3) {
  const url = `https://stats.nba.com/stats${endpoint}`;

  // Rate limiting global
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  lastFetchAt = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const label = endpoint.split('?')[0].replace('/', '');
      console.log(`  → ${label} (intento ${attempt}/${retries})...`);

      const res = await fetch(url, {
        headers: NBA_HEADERS,
        signal : AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.status === 429) {
        const wait = attempt * 12_000;
        console.warn(`    ⏳ Rate limited. Esperando ${wait / 1000}s...`);
        await sleep(wait);
        lastFetchAt = Date.now();
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const text = await res.text();
      if (!text.trim().startsWith('{'))
        throw new Error(`Respuesta no-JSON: ${text.slice(0, 120)}`);

      const data = JSON.parse(text);
      if (!data?.resultSets?.[0])
        throw new Error('Respuesta vacía (sin resultSets)');

      return data;

    } catch (err) {
      if (attempt < retries) {
        const wait = attempt * 6000;
        console.warn(`    ⚠️  ${err.message}. Reintentando en ${wait / 1000}s...`);
        await sleep(wait);
        lastFetchAt = Date.now();
      } else {
        console.warn(`    ❌ Todos los intentos fallaron para ${endpoint.split('?')[0]}. Devolviendo null.`);
        return null;
      }
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════
// HELPERS DE IMAGEN / LOGO
// (Idénticos a nbaService.ts para compatibilidad)
// ════════════════════════════════════════════════════════
function getImageUrl(id) {
  if (id === null || id === undefined) return 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
  const s = String(id).trim();
  if (s === '0' || s === '' || s.startsWith('p') || isNaN(Number(s)))
    return 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${s}.png`;
}

const ESPN_MAP = { UTA: 'utah', NOP: 'no', GSW: 'gs', SAS: 'sa', NYK: 'ny', WAS: 'wsh' };

function getTeamLogoUrl(abbr) {
  if (!abbr || abbr === '0' || abbr === 'FA') return '';
  const a = abbr.toUpperCase();
  return `https://a.espncdn.com/i/teamlogos/nba/500/${ESPN_MAP[a] || a.toLowerCase()}.png`;
}

// ════════════════════════════════════════════════════════
// REFERENCIA ESTÁTICA DE EQUIPOS
// (Espejo de NBA_TEAMS en mockData.ts)
// ════════════════════════════════════════════════════════
const STATIC_TEAMS = [
  { abbr:'ATL', name:'Atlanta Hawks',            conf:'Eastern', div:'Southeast' },
  { abbr:'BOS', name:'Boston Celtics',           conf:'Eastern', div:'Atlantic'  },
  { abbr:'BKN', name:'Brooklyn Nets',            conf:'Eastern', div:'Atlantic'  },
  { abbr:'CHA', name:'Charlotte Hornets',        conf:'Eastern', div:'Southeast' },
  { abbr:'CHI', name:'Chicago Bulls',            conf:'Eastern', div:'Central'   },
  { abbr:'CLE', name:'Cleveland Cavaliers',      conf:'Eastern', div:'Central'   },
  { abbr:'DAL', name:'Dallas Mavericks',         conf:'Western', div:'Southwest' },
  { abbr:'DEN', name:'Denver Nuggets',           conf:'Western', div:'Northwest' },
  { abbr:'DET', name:'Detroit Pistons',          conf:'Eastern', div:'Central'   },
  { abbr:'GSW', name:'Golden State Warriors',    conf:'Western', div:'Pacific'   },
  { abbr:'HOU', name:'Houston Rockets',          conf:'Western', div:'Southwest' },
  { abbr:'IND', name:'Indiana Pacers',           conf:'Eastern', div:'Central'   },
  { abbr:'LAC', name:'Los Angeles Clippers',     conf:'Western', div:'Pacific'   },
  { abbr:'LAL', name:'Los Angeles Lakers',       conf:'Western', div:'Pacific'   },
  { abbr:'MEM', name:'Memphis Grizzlies',        conf:'Western', div:'Southwest' },
  { abbr:'MIA', name:'Miami Heat',               conf:'Eastern', div:'Southeast' },
  { abbr:'MIL', name:'Milwaukee Bucks',          conf:'Eastern', div:'Central'   },
  { abbr:'MIN', name:'Minnesota Timberwolves',   conf:'Western', div:'Northwest' },
  { abbr:'NOP', name:'New Orleans Pelicans',     conf:'Western', div:'Southwest' },
  { abbr:'NYK', name:'New York Knicks',          conf:'Eastern', div:'Atlantic'  },
  { abbr:'OKC', name:'Oklahoma City Thunder',    conf:'Western', div:'Northwest' },
  { abbr:'ORL', name:'Orlando Magic',            conf:'Eastern', div:'Southeast' },
  { abbr:'PHI', name:'Philadelphia 76ers',       conf:'Eastern', div:'Atlantic'  },
  { abbr:'PHX', name:'Phoenix Suns',             conf:'Western', div:'Pacific'   },
  { abbr:'POR', name:'Portland Trail Blazers',   conf:'Western', div:'Northwest' },
  { abbr:'SAC', name:'Sacramento Kings',         conf:'Western', div:'Pacific'   },
  { abbr:'SAS', name:'San Antonio Spurs',        conf:'Western', div:'Southwest' },
  { abbr:'TOR', name:'Toronto Raptors',          conf:'Eastern', div:'Atlantic'  },
  { abbr:'UTA', name:'Utah Jazz',                conf:'Western', div:'Northwest' },
  { abbr:'WAS', name:'Washington Wizards',       conf:'Eastern', div:'Southeast' },
];

const staticTeamByAbbr = new Map(STATIC_TEAMS.map(t => [t.abbr, t]));
const staticTeamByName = new Map(STATIC_TEAMS.map(t => [t.name.toLowerCase(), t]));

function resolveStaticTeam(name, abbr) {
  return staticTeamByAbbr.get(abbr?.toUpperCase())
    || staticTeamByName.get(name?.toLowerCase())
    || staticTeamByName.get(name?.split(' ').pop()?.toLowerCase())   // match por última palabra
    || null;
}

// ════════════════════════════════════════════════════════
// LEAGUE CONTEXT (idéntico a calculateLeagueContext)
// ════════════════════════════════════════════════════════
function calculateLeagueContext(players) {
  const valid = players.filter(p => (p.stats?.mpg || 0) >= 12);
  if (!valid.length) return null;
  const getAvg = (k) => valid.reduce((s, p) => s + (p.adv?.[k] || 0), 0) / valid.length;
  const getStd = (k, avg) => Math.sqrt(valid.reduce((s, p) => s + Math.pow((p.adv?.[k] || 0) - avg, 2), 0) / valid.length);
  const avgTS = getAvg('ts');   const stdTS   = getStd('ts',   avgTS)   || 4.5;
  const avgUSG = getAvg('usg'); const stdUSG  = getStd('usg',  avgUSG)  || 6.0;
  const avgPER = getAvg('per'); const stdPER  = getStd('per',  avgPER)  || 4.5;
  const avgBPM = getAvg('bpm'); const stdBPM  = getStd('bpm',  avgBPM)  || 3.5;
  const avgVORP = getAvg('vorp'); const stdVORP = getStd('vorp', avgVORP) || 1.0;
  const avgPIE = getAvg('pie'); const stdPIE  = getStd('pie',  avgPIE)  || 3.0;
  return { avgTS, stdTS, avgUSG, stdUSG, avgPER, stdPER, avgBPM, stdBPM, avgVORP, stdVORP, avgPIE, stdPIE };
}

// ════════════════════════════════════════════════════════
// PLAYER 2K RATING
// (Port exacto de calculatePlayer2KRating de nbaService.ts)
// ════════════════════════════════════════════════════════
function calculatePlayer2KRating(p, leagueContext, season) {
  if (!p?.percentiles) {
    return {
      ovr:10, off:70, def:70, rebounding:70, tier:'Bronze', color:'#cd7f32', reliability:1,
      pillars:{
        sco:{grade:'C',pct:50,raw:'15.0 PTS (55.0%)',label:'SCORE'},
        reb:{grade:'C',pct:50,raw:'1.0 ORB / 3.0 DRB',label:'REB'},
        ply:{grade:'C',pct:50,raw:'3.0 AST (1.5 A/T)',label:'PLAY'},
        def:{grade:'C',pct:50,raw:'0.5 STL / 0.5 BLK',label:'STOCKS'}
      }
    };
  }

  const pct = p.percentiles;
  const mpg = p.stats?.mpg || 0;
  const volumeModifier = Math.min(1, Math.pow(mpg / 32, 0.3));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const getGrade = (n) => n>=95?'S':n>=85?'A+':n>=75?'A':n>=60?'B':n>=40?'C':n>=20?'D':'F';

  // ── Scoring ──────────────────────────────────────────
  let effEff = pct.Efficiency || 50;
  if ((pct.Scoring || 50) < 75) effEff = Math.min(effEff, (pct.Scoring || 50) + 10);
  const scoringPct = (((pct.Scoring || 50) * 0.75) * volumeModifier) + (effEff * 0.25);
  const rawPts = p.per36Stats?.ppg || p.stats?.ppg || 0;
  const rawTs  = p.adv?.ts || 50;
  const scoringText = `${rawPts.toFixed(1)} PTS (${rawTs.toFixed(1)}%)`;

  // ── Tracking flag ────────────────────────────────────
  const hasTracking = season
    ? parseInt(season.split('-')[0]) >= 2013
    : (p.per36Stats?.deflections ?? 0) > 0.1;

  // ── Rebounding ───────────────────────────────────────
  let rebPct = hasTracking
    ? ((pct.Rebounding||50)*0.25)+((pct.OReb||50)*0.20)+((pct.DReb||50)*0.20)
      +((pct.ContestedReb||pct.Rebounding||50)*0.15)+((pct.RebConversion||pct.Rebounding||50)*0.10)+((pct.BoxOuts||50)*0.10)
    : ((pct.Rebounding||50)*0.40)+((pct.OReb||50)*0.35)+((pct.DReb||50)*0.25);

  const rpg = p.stats?.rpg || 0;
  if (rpg >= 13.5)      rebPct = Math.max(rebPct, 95);
  else if (rpg >= 11.5) rebPct = Math.max(rebPct, 85);

  const rawOrb = p.per36Stats?.oreb || 0;
  const rawDrb = p.per36Stats?.dreb || 0;
  const rebText = `${rawOrb.toFixed(1)} ORB / ${rawDrb.toFixed(1)} DRB`;

  // ── Playmaking ───────────────────────────────────────
  const playmakingPct = hasTracking
    ? ((pct.Playmaking||50)*0.35)+((pct.AstPtsCreated||50)*0.20)
      +((pct.AstPct||50)*0.15)+((pct.PotentialAst||50)*0.15)
      +((pct.PassQuality||pct.Playmaking||50)*0.10)+((pct.BallSecurity||50)*0.05)
    : ((pct.Playmaking||50)*0.70)+((pct.AstPct||50)*0.25)+((pct.BallSecurity||50)*0.05);

  const rawAst   = p.per36Stats?.apg || p.stats?.apg || 0;
  const rawAstTo = p.adv?.astTo || 1;
  const plyText  = `${rawAst.toFixed(1)} AST (${rawAstTo.toFixed(1)} A/T)`;

  // ── Defense ──────────────────────────────────────────
  const stocksPct = pct.Stocks || 50;
  const rawStl = p.per36Stats?.spg || p.stats?.spg || 0;
  const rawBlk = p.per36Stats?.bpg || p.stats?.bpg || 0;
  let p4pct = 50, p4label = 'STOCKS', p4text = `${rawStl.toFixed(1)} STL / ${rawBlk.toFixed(1)} BLK`;

  if (hasTracking) {
    const teamImpact    = pct.DefRtg || 50;
    const shotDefense   = pct.ShotDefense || ((pct.PerimeterD||50)*0.5 + (pct.InteriorD||50)*0.5);
    const contestedShots= pct.Contested || 50;
    const disruption    = ((pct.Deflections||50)*0.6) + (stocksPct*0.4);
    const pureHustle    = ((pct.LooseBalls||50)*0.6) + ((pct.ChargesDrawn||50)*0.4);
    if (p.adv?.isRealBRef && p.adv?.dbpm !== undefined) {
      const dbpmScore = clamp(50 + p.adv.dbpm * 15, 5, 99);
      p4pct   = (dbpmScore*0.30)+(teamImpact*0.25)+(shotDefense*0.20)+(contestedShots*0.10)+(disruption*0.10)+(pureHustle*0.05);
      p4label = 'DEFENSE';
      p4text  = `DBPM: ${p.adv.dbpm>0?'+':''}${p.adv.dbpm.toFixed(1)} / ${rawStl.toFixed(1)}s ${rawBlk.toFixed(1)}b`;
    } else {
      p4pct   = (teamImpact*0.40)+(shotDefense*0.35)+(contestedShots*0.10)+(disruption*0.10)+(pureHustle*0.05);
      p4label = 'DEF';
      p4text  = `${Math.round(p.adv?.defRating||115)} DRTG / ${(p.per36Stats?.deflections||0).toFixed(1)} DEFL`;
    }
  } else {
    if (p.adv?.isRealBRef && p.adv?.dbpm !== undefined) {
      const dbpmScore = clamp(50 + p.adv.dbpm * 15, 5, 99);
      p4pct   = (dbpmScore*0.60)+((pct.DefRtg||50)*0.25)+(stocksPct*0.15);
      p4label = 'DEFENSE';
      p4text  = `DBPM: ${p.adv.dbpm>0?'+':''}${p.adv.dbpm.toFixed(1)} / ${rawStl.toFixed(1)}s ${rawBlk.toFixed(1)}b`;
    } else {
      p4pct   = stocksPct; p4label = 'STOCKS';
      p4text  = `${rawStl.toFixed(1)} STL / ${rawBlk.toFixed(1)} BLK`;
    }
  }
  const p4grade = getGrade(p4pct);

  // ── Advanced z-scores ────────────────────────────────
  const rawBPM  = p.adv?.bpm  || -2.0;
  const rawVORP = p.adv?.vorp || 0.0;
  const rawPER  = p.adv?.per  || 15.0;
  const rawPIE  = p.adv?.pie  || 10.0;
  const rawUSG  = p.adv?.usg  || 15;

  const ctx = leagueContext || {
    avgTS:55,stdTS:4.5,avgUSG:20,stdUSG:6.0,avgBPM:-1.5,stdBPM:3.5,
    avgPER:15,stdPER:4.5,avgVORP:0.5,stdVORP:1.5,avgPIE:10,stdPIE:3.0
  };

  const zTS   = clamp((rawTs  -(ctx.avgTS  ||55 ))/(ctx.stdTS  ||4.5), -3, 3.5);
  const zUSG  = clamp((rawUSG -(ctx.avgUSG ||20 ))/(ctx.stdUSG ||6.0), -3, 3.5);
  const zPER  = clamp((rawPER -(ctx.avgPER ||15 ))/(ctx.stdPER ||4.5), -3, 3.5);
  const zVORP = clamp((rawVORP-(ctx.avgVORP||0.5))/(ctx.stdVORP||1.5), -3, 3.5);
  const zPIE  = clamp((rawPIE -(ctx.avgPIE ||10 ))/(ctx.stdPIE ||3.0), -3, 3.5);

  let zBPM = clamp((rawBPM-(ctx.avgBPM||-1.5))/(ctx.stdBPM||3.5), -3, 3.5);
  if (p.adv?.isRealBRef && p.adv.obpm !== undefined && p.adv.dbpm !== undefined) {
    zBPM = (clamp(p.adv.obpm/2.0,-3,3.5)*0.65) + (clamp(p.adv.dbpm/2.0,-3,3.5)*0.35);
  }

  const baseImpact    = (zBPM*2.4)+(zVORP*1.2)+(zPER*1.2)+(zPIE*1.2);
  const usgBonus      = Math.max(0, zUSG) * 1.5;
  const effMulti      = (zUSG>0 && zTS>0) ? (zUSG*zTS*1.0) : 0;
  const creationBonus = usgBonus + effMulti;
  const defenseBonus  = (!p.adv?.isRealBRef || p.adv?.dbpm===undefined) && p4pct>75
    ? (p4pct-75)*0.15 : 0;

  let rawOvr = 73 + (baseImpact*volumeModifier) + creationBonus + defenseBonus;
  const gp   = p.stats?.gp || 0;
  const reliability = Math.max(0.1, Math.min(1, gp/65));
  const penalty     = (gp>0 && gp<50) ? (50-gp)*0.15 : 0;
  let finalOVR = Math.round(rawOvr - penalty);

  let veto = '';
  if (finalOVR >= 97) {
    if (p4pct < 35)   { finalOVR = Math.min(finalOVR,96); veto='Veto Defensivo'; }
    if (zTS  < -0.5)  { finalOVR = Math.min(finalOVR,96); veto='Veto Eficiencia'; }
  }
  if (zTS < -1.5 && zUSG > 1.5) finalOVR -= 2;

  const scoringFloor = Math.round(68 + (p.stats?.ppg||0)*0.55);
  if (finalOVR < scoringFloor) finalOVR = scoringFloor;
  finalOVR = clamp(finalOVR, 65, 99);

  // Sub-ratings para calculateTeam2KRating
  const offRating = clamp(Math.round((scoringPct*0.6)+(playmakingPct*0.4)), 60, 99);
  const defRating = clamp(Math.round((p4pct*0.7)+(rebPct*0.3)), 60, 99);
  const rebRating = clamp(Math.round(rebPct), 60, 99);

  let tier='Bronze', color='#cd7f32';
  if (finalOVR>=95){ tier='Diamond'; color='#b9f2ff'; }
  else if (finalOVR>=90){ tier='Amethyst'; color='#9966cc'; }
  else if (finalOVR>=85){ tier='Gold'; color='#ffd700'; }
  else if (finalOVR>=78){ tier='Silver'; color='#c0c0c0'; }

  return {
    ovr: finalOVR, off: offRating, def: defRating, rebounding: rebRating,
    tier, color, reliability, veto,
    pillars: {
      sco: { grade:getGrade(scoringPct),    pct:Math.max(5,Math.round(scoringPct)),    raw:scoringText, label:'SCORE'  },
      reb: { grade:getGrade(rebPct),        pct:Math.max(5,Math.round(rebPct)),        raw:rebText,     label:'REB'    },
      ply: { grade:getGrade(playmakingPct), pct:Math.max(5,Math.round(playmakingPct)), raw:plyText,     label:'PLAY'   },
      def: { grade:p4grade,                 pct:Math.max(5,Math.round(p4pct)),         raw:p4text,      label:p4label  }
    }
  };
}

// ════════════════════════════════════════════════════════
// TEAM 2K RATING
// (Port exacto de calculateTeam2KRating de nbaService.ts)
// ════════════════════════════════════════════════════════
function calculateTeam2KRating(t, roster) {
  const netRtg = t.netRtg ?? t.adv?.netRtg ?? 0;
  const offRtg = t.offRtg ?? t.adv?.offRtg ?? 115;
  const defRtg = t.defRtg ?? t.adv?.defRtg ?? 115;
  const clamp  = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

  const statOff = clamp(Math.round(80+((offRtg-115)*1.6)), 60, 99);
  const statDef = clamp(Math.round(80+((115-defRtg)*1.6)), 60, 99);
  const statOvr = clamp(Math.round(80+(netRtg*1.6)),        60, 99);

  if (!roster?.length) {
    const tier = statOvr>=92?'S':statOvr>=85?'A':'B';
    return { ovr:statOvr, off:statOff, def:statDef, tier, color:'#ef4444', xNetRtg:netRtg.toFixed(1) };
  }

  let totalW=0, ovrSum=0, offSum=0, defSum=0, xBPM=0, starBonus=0, topOvr=0;

  const rotation = [...roster]
    .sort((a,b)=>(b.stats?.mpg||0)-(a.stats?.mpg||0))
    .slice(0,10);

  rotation.forEach(p => {
    const mpg = p.stats?.mpg || 0;
    if (!mpg) return;

    const pie  = p.adv?.pie  || 10;
    const per  = p.adv?.per  || 15;
    const ws48 = p.adv?.ws48 || 0.100;
    const bpm  = p.adv?.bpm  || -2.0;

    const impact = (
      (Math.max(0,pie )/10   )*0.25 +
      (Math.max(0,per )/15   )*0.25 +
      (Math.max(0,ws48)/0.100)*0.25 +
      Math.max(0.1, 1+bpm*0.1)*0.25
    );
    const w = mpg * impact;
    totalW  += w;

    const pOvr = p.rating?.ovr || 75;
    const pOff = p.rating?.off || 75;
    const pDef = ((p.rating?.def||p.rating?.defense||75)*0.7)+((p.rating?.rebounding||75)*0.3);

    ovrSum  += pOvr*w;
    offSum  += pOff*w;
    defSum  += pDef*w;
    xBPM    += bpm*(mpg/240)*5;

    if (pOvr>topOvr) topOvr=pOvr;
    starBonus += Math.pow(Math.max(0,bpm),1.5)*(mpg/48)*0.20;
  });

  const rOff  = totalW>0 ? offSum/totalW : statOff;
  const rDef  = totalW>0 ? defSum/totalW : statDef;
  const rPen  = Math.min(0,(topOvr-89)*0.6);
  const xOvr  = 78+(xBPM*1.5)+starBonus+rPen;

  const wPctDecimal = (t.winPct||0)>1 ? (t.winPct/100) : (t.winPct||0);
  const wGravity    = 57+(wPctDecimal*45);

  const finalOff = clamp(Math.round((rOff*0.4)+(statOff*0.6)),  65, 99);
  const finalDef = clamp(Math.round((rDef*0.4)+(statDef*0.6)),  65, 99);
  let   finalOvr = clamp(Math.round((xOvr*0.40)+(statOvr*0.40)+(wGravity*0.20)), 65, 99);

  const minR = Math.min(finalOff, finalDef);
  if (finalOvr>=99 && minR<95) finalOvr=98;
  if (finalOvr>=96 && minR<85) finalOvr=95;

  let tier='C', color='#ef4444';
  if (finalOvr>=92){ tier='S'; color='#8b5cf6'; }
  else if (finalOvr>=85){ tier='A'; color='#10b981'; }
  else if (finalOvr>=78){ tier='B'; color='#f59e0b'; }

  return { ovr:finalOvr, off:finalOff, def:finalDef, tier, color, xNetRtg:xBPM.toFixed(1) };
}

// ════════════════════════════════════════════════════════
// CARGA BREF
// ════════════════════════════════════════════════════════
async function loadBRefMap(season) {
  try {
    const p = path.join(OUTPUT_DIR, `bref_advanced_${season}.json`);
    const raw  = await fs.readFile(p, 'utf-8');
    const data = JSON.parse(raw);
    const map  = new Map();
    if (Array.isArray(data)) {
      data.forEach(pl => {
        const key = pl.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        if (!map.has(key)) map.set(key, pl);
      });
    }
    console.log(`  ✅ BRef ${season}: ${map.size} jugadores cargados`);
    return map;
  } catch {
    console.warn(`  ⚠️  Sin datos BRef para ${season}. BPM/PER/VORP serán estimados.`);
    return new Map();
  }
}

// ════════════════════════════════════════════════════════
// FETCH PLAYERS PIPELINE
// ════════════════════════════════════════════════════════
async function buildPlayers(season) {
  const startYear  = parseInt(season.split('-')[0]);
  const hasTracking= startYear >= 2013;
  const hasHustle  = startYear >= 2015;

  const base = `?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=BASE_TYPE&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;
  const mk = (mt) => base.replace('BASE_TYPE', mt);

  console.log('\n📊 FASE 1: Fetch estadísticas de jugadores...');

  const dataBase = await fetchFromNBA(`/leaguedashplayerstats${mk('Base')}`);
  if (!dataBase) throw new Error('Endpoint Base de jugadores falló. Pipeline abortado.');

  const [dataAdv, dataMisc] = await Promise.all([
    fetchFromNBA(`/leaguedashplayerstats${mk('Advanced')}`),
    fetchFromNBA(`/leaguedashplayerstats${mk('Misc')}`)
  ]);

  const [dataScoring, dataHustle] = await Promise.all([
    fetchFromNBA(`/leaguedashplayerstats${mk('Scoring')}`),
    hasHustle ? fetchFromNBA(`/leaguehustlestatsplayer?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0&VsConference=&VsDivision=&Weight=`) : null
  ]);

  const [dataPassing, dataDefending] = await Promise.all([
    hasTracking ? fetchFromNBA(`/leaguedashptstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PerMode=PerGame&PlayerExperience=&PlayerOrTeam=Player&PlayerPosition=&PtMeasureType=Passing&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`) : null,
    hasTracking ? fetchFromNBA(`/leaguedashptdefend?College=&Conference=&Country=&DateFrom=&DateTo=&DefenseCategory=Overall&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PerMode=PerGame&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`) : null,
  ]);

  // ── Construir maps auxiliares ──────────────────────────────────────────────
  const advMap      = buildMap(dataAdv,      'PLAYER_ID', buildAdvPlayerEntry);
  const miscMap     = buildMap(dataMisc,     'PLAYER_ID', buildMiscPlayerEntry);
  const scoringMap  = buildMap(dataScoring,  'PLAYER_ID', buildScoringPlayerEntry);
  const hustleMap   = buildMap(dataHustle,   'PLAYER_ID', buildHustlePlayerEntry);
  const passingMap  = buildMap(dataPassing,  'PLAYER_ID', buildPassingEntry);
  const defendingMap= buildMap(dataDefending,'CLOSE_DEF_PERSON_ID', buildDefendingEntry);

  // ── Cargar BRef ─────────────────────────────────────────────────────────────
  const bRefMap = await loadBRefMap(season);

  // ── Construir jugadores raw ─────────────────────────────────────────────────
  const headersBase = dataBase.resultSets[0].headers;
  const rowsBase    = dataBase.resultSets[0].rowSet;

  let totalPTS=0, totalFGA=0, totalFTA=0;

  const rawPlayers = rowsBase.map(row => {
    const pid  = getString(row, headersBase, 'PLAYER_ID', '0');
    const baseAdv  = advMap.get(pid)      || {};
    const hData    = hustleMap.get(pid)   || defHustle();
    const mData    = miscMap.get(pid)     || defMisc();
    const sData    = scoringMap.get(pid)  || defScoring();
    const passData = passingMap.get(pid)  || defPassing();
    const defData  = defendingMap.get(pid)|| defDefending();

    const gp   = getStat(row, headersBase, 'GP');
    const wins = getStat(row, headersBase, 'W');
    const min  = getStat(row, headersBase, 'MIN');
    const pts  = getStat(row, headersBase, 'PTS');
    const reb  = getStat(row, headersBase, 'REB');
    const fga  = getStat(row, headersBase, 'FGA');
    const fgm  = getStat(row, headersBase, 'FGM');
    const fta  = getStat(row, headersBase, 'FTA');
    const fg3a = getStat(row, headersBase, 'FG3A');
    const fg3m = getStat(row, headersBase, 'FG3M');
    const ast  = getStat(row, headersBase, 'AST');
    const tov  = getStat(row, headersBase, 'TOV');
    const bpg  = getStat(row, headersBase, 'BLK');
    const spg  = getStat(row, headersBase, 'STL');
    const rawOreb = getStat(row, headersBase, 'OREB');
    const rawDreb = getStat(row, headersBase, 'DREB');
    const oreb = rawOreb || Math.round(reb*0.25*10)/10;
    const dreb = rawDreb || Math.round(reb*0.75*10)/10;

    totalPTS += pts*gp; totalFGA += fga*gp; totalFTA += fta*gp;

    const fg2m = fgm - fg3m;
    const fg2a = Math.max(1, fga - fg3a);
    const fg2Pct= parsePct(fg2m/fg2a);

    const fallbackTS  = (fga>0||fta>0) ? parsePct(pts/(2*(fga+0.44*fta))) : 0;
    const fallbackUSG = min>0 ? parsePct(((fga+0.44*fta+tov)*40)/(min*5)) : 15;
    // FIX: cuando tov=0, usar 99 en lugar de ast
    const fallbackAstTo = tov>0 ? ast/tov : (ast>0 ? 99.0 : 0.0);

    const per36     = min>0 ? 36/min : 0;
    const ftaRateRaw= fga>0 ? fta/fga : 0;
    const twoPA     = Math.max(0, fga-fg3a);
    const midRangeFGA= Math.max(0, fga-fg3a-(fta*0.44));

    // BRef merge (antes de computeAllAdvanced para que sea override)
    const normName  = getString(row,headersBase,'PLAYER_NAME','')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const bRef      = bRefMap.get(normName) || null;

    // Advanced: BRef > API > estimado
    const adv = {
      ts     : baseAdv.ts      ?? fallbackTS,
      efg    : baseAdv.efg     ?? 0,
      usg    : baseAdv.usg     ?? fallbackUSG,
      defRating: baseAdv.defRating ?? 115,
      pie    : baseAdv.pie     ?? 0,
      per    : bRef?.per       ?? baseAdv.per    ?? estimatePER(pts,reb,ast,spg,bpg,fga,fgm,fta,tov,min),
      bpm    : bRef?.bpm       ?? baseAdv.bpm    ?? estimateBPM(pts,reb,ast,spg,bpg,fga,fta,tov,min),
      obpm   : bRef?.obpm      ?? baseAdv.obpm   ?? 0,
      dbpm   : bRef?.dbpm      ?? baseAdv.dbpm   ?? 0,
      vorp   : bRef?.vorp      ?? baseAdv.vorp   ?? 0,
      ws48   : bRef?.ws48      ?? baseAdv.ws48   ?? null,
      netRtg : baseAdv.netRtg  ?? 0,
      astPct : baseAdv.astPct  ?? 15.0,
      astTo  : baseAdv.astTo   ?? fallbackAstTo,
      astRatio:baseAdv.astRatio?? 0,
      pace   : baseAdv.pace    ?? 100,
      orebPct: baseAdv.orebPct ?? 0,
      drebPct: baseAdv.drebPct ?? 0,
      offRtg : baseAdv.offRtg  ?? 115,
      ftaRate: baseAdv.ftaRate ?? ftaRateRaw,
      isRealBRef: !!bRef,
    };

    // WS/48 (FIX: no forzamos >=0, dejamos negativo si aplica)
    if (adv.ws48 === null) {
      const perWS = adv.per - 15;
      const tsWS  = (adv.ts - 55) * 0.1;
      adv.ws48 = Number((0.100 + (perWS*0.01) + tsWS).toFixed(3));
      // Solo en fallback estimado usamos clamp conservativo para no esconder datos negativos BRef
    }

    // SI+ (con métricas reales cuando están disponibles)
    const siPlusRaw = 100 + (adv.bpm*4.5) + ((adv.per-15)*1.5) + ((adv.ts-55)*0.5);
    adv.si = isNaN(siPlusRaw)||!isFinite(siPlusRaw) ? 0 : Math.round(siPlusRaw);
    adv.rTS= Number((adv.ts - 55).toFixed(1)); // placeholder, se actualiza después

    const offRtgVal  = baseAdv.offRtg  ?? 115;
    const defRtgVal  = baseAdv.defRating?? 115;
    const netRtgVal  = baseAdv.netRtg  ?? 0;

    return {
      id    : pid,
      name  : getString(row, headersBase, 'PLAYER_NAME', 'Unknown Player'),
      teamId: getString(row, headersBase, 'TEAM_ABBREVIATION', 'FA'),
      teamName: getString(row, headersBase, 'TEAM_NAME', 'Free Agent'),
      position: 'NBA',
      age   : getStat(row, headersBase, 'AGE'),
      imageUrl: getImageUrl(pid),
      gameLog : [],   // se fetchea bajo demanda desde nbaService
      stats: {
        gp, gs: Math.round(getStat(row,headersBase,'GS')*gp), mpg: min,
        winPct: gp>0 ? wins/gp : 0,
        ppg:pts, rpg:reb, apg:ast, oreb, dreb, spg, bpg, topg:tov,
        fga, fgm, fgPct:parsePct(getStat(row,headersBase,'FG_PCT')),
        fg3a, fg3m, threePct:parsePct(getStat(row,headersBase,'FG3_PCT')),
        fta, ftm:getStat(row,headersBase,'FTM'), ftPct:parsePct(getStat(row,headersBase,'FT_PCT')),
        fg2Pct,
        offRtg:offRtgVal, defRating:defRtgVal, netRtg:netRtgVal, net:netRtgVal,
        plusMinus:getStat(row,headersBase,'PLUS_MINUS'),
        pf:getStat(row,headersBase,'PF'),
      },
      per36Stats: {
        ppg : pts*per36, rpg:reb*per36, apg:ast*per36,
        spg : spg*per36, bpg:bpg*per36,
        dreb: dreb*per36, oreb:oreb*per36,
        fg3m: fg3m*per36, fg3a:fg3a*per36,
        ptsFb: (mData.ptsFb||0)*per36,
        twoPA: twoPA*per36,
        deflections    : (hasHustle ? hData.deflections     : spg*0.8)*per36,
        contestedShots : (hasHustle ? hData.contestedShots  : bpg*2.0)*per36,
        contested3pt   : (hasHustle ? hData.contested3pt    : spg*0.5)*per36,
        contested2pt   : (hasHustle ? hData.contested2pt    : bpg*1.5)*per36,
        boxOuts        : (hasHustle ? hData.boxOuts         : dreb*0.5)*per36,
        looseBalls     : (hasHustle ? hData.looseBalls      : spg*0.5)*per36,
        chargesDrawn   : (hasHustle ? hData.chargesDrawn    : 0)*per36,
        screenAssists  : (hasHustle ? hData.screenAssists   : oreb*0.5)*per36,
        potentialAst   : (hasTracking ? passData.potentialAst   : ast*1.8)*per36,
        passesMade     : (hasTracking ? passData.passesMade     : ast*6.0)*per36,
        secondaryAst   : (hasTracking ? passData.secondaryAst   : ast*0.2)*per36,
        astPtsCreated  : (hasTracking ? passData.astPtsCreated  : ast*2.3)*per36,
        paintFGM       : (hasTracking ? mData.ptsPaint/2        : fgm*0.6)*per36,
        midRangeFGM    : (hasTracking ? midRangeFGA*0.4         : fgm*0.3)*per36,
      },
      adv,
      hustle : hData,
      misc   : mData,
      scoring: { ...sData, pctFgmUast: sData.pctFgmUast || fallbackUSG*1.5 },
      passing: passData,
      tracking: {
        dfgPct : hasTracking ? defData.dfgPct  : 50.0,
        dfg3Pct: hasTracking ? defData.dfg3Pct : 36.0,
        dfg2Pct: hasTracking ? defData.dfg2Pct : 50.0,
      },
      playmaking: {
        astPct : adv.astPct,
        astTo  : adv.astTo,
        astRatio: adv.astRatio,
      },
    };
  });

  // ── League avg TS ───────────────────────────────────────────────────────────
  const leagueAvgTS = (totalFGA>0||totalFTA>0)
    ? parsePct(totalPTS/(2*(totalFGA+0.44*totalFTA)))
    : 55.0;

  rawPlayers.forEach(p => { p.adv.rTS = Number((p.adv.ts - leagueAvgTS).toFixed(1)); });

  // ── League context para 2K rating ──────────────────────────────────────────
  const leagueCtx = calculateLeagueContext(rawPlayers);

  // ── Players con min. juegos para percentiles ───────────────────────────────
  const qualified = rawPlayers.filter(p => p.stats.gp>=10 && p.stats.mpg>=15);

  // ── Arrays ordenados para percentiles (pre-sort = más rápido) ─────────────
  const arrays = buildPlayerArrays(qualified, hasTracking);

  // ── Asignar percentiles y rating a cada jugador ────────────────────────────
  const finalPlayers = rawPlayers.map(p => {
    // WS/48 recalculated with final adv values
    if (!p.adv.isRealBRef || p.adv.ws48 === undefined) {
      p.adv.ws48 = Number((0.100+((p.adv.per-15)*0.01)+((p.adv.ts-55)*0.1)).toFixed(3));
    }

    const percentiles = computePlayerPercentiles(p, arrays, hasTracking);
    const playerWithPct = { ...p, percentiles };
    const rating = calculatePlayer2KRating(playerWithPct, leagueCtx, season);

    return { ...playerWithPct, rating };
  });

  console.log(`  ✅ ${finalPlayers.length} jugadores procesados (${qualified.length} con mins suficientes para percentiles).`);
  return finalPlayers;
}

// ════════════════════════════════════════════════════════
// FETCH TEAMS PIPELINE
// ════════════════════════════════════════════════════════
async function buildTeams(season, allPlayers) {
  console.log('\n🏀 FASE 2: Fetch estadísticas de equipos...');

  const bp = `?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=BASE_TYPE&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
  const mk = (mt) => bp.replace('BASE_TYPE', mt);

  const [resBase, resAdv, resOpp] = await Promise.all([
    fetchFromNBA(`/leaguedashteamstats${mk('Base')}`),
    fetchFromNBA(`/leaguedashteamstats${mk('Advanced')}`),
    fetchFromNBA(`/leaguedashteamstats${mk('Opponent')}`),
  ]);

  if (!resBase) throw new Error('Endpoint Base de equipos falló. Pipeline abortado.');

  const [resMisc, resHustle, resScoring] = await Promise.all([
    fetchFromNBA(`/leaguedashteamstats${mk('Misc')}`),
    fetchFromNBA(`/leaguehustlestatsteam?LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0`),
    fetchFromNBA(`/leaguedashteamstats${mk('Scoring')}`),
  ]);

  const cp = `?AheadBehind=Ahead%20or%20Behind&ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=BASE_TYPE&Month=0&OpponentTeamID=0&Outcome=&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=`;

  const [resClutchBase, resClutchAdv] = await Promise.all([
    fetchFromNBA(`/leaguedashteamclutch${cp.replace('BASE_TYPE','Base')}`),
    fetchFromNBA(`/leaguedashteamclutch${cp.replace('BASE_TYPE','Advanced')}`),
  ]);

  // ── Construir maps auxiliares ──────────────────────────────────────────────
  const advMap      = buildMap(resAdv,      'TEAM_ID', buildAdvTeamEntry);
  const oppMap      = buildMap(resOpp,      'TEAM_ID', buildOppTeamEntry);
  const miscMap     = buildMap(resMisc,     'TEAM_ID', buildMiscTeamEntry);
  const hustleMap   = buildMap(resHustle,   'TEAM_ID', buildHustleTeamEntry);
  const scoringMap  = buildMap(resScoring,  'TEAM_ID', buildScoringTeamEntry);
  const clutchAdvMap= buildMap(resClutchAdv,'TEAM_ID', buildClutchAdvEntry);

  // ── Clutch base ────────────────────────────────────────────────────────────
  const clutchDataRaw = buildClutchData(resClutchBase, clutchAdvMap, resBase, advMap);
  const clutchMap = computeClutchPercentiles(clutchDataRaw);

  // ── Construir equipos ──────────────────────────────────────────────────────
  const headersBase = resBase.resultSets[0].headers;
  const rowsBase    = resBase.resultSets[0].rowSet;

  const rawTeams = rowsBase.map(row => {
    const tId       = getString(row, headersBase, 'TEAM_ID', '0');
    const name      = getString(row, headersBase, 'TEAM_NAME', 'Unknown Team');
    const tAbbr     = getString(row, headersBase, 'TEAM_ABBREVIATION', '???');
    const staticTeam= resolveStaticTeam(name, tAbbr);

    const pts  = getStat(row,headersBase,'PTS');
    const fga  = getStat(row,headersBase,'FGA');
    const fta  = getStat(row,headersBase,'FTA');
    const plusMinus = getStat(row,headersBase,'PLUS_MINUS');
    const wins = getStat(row,headersBase,'W');
    const losses= getStat(row,headersBase,'L');
    const winPct= (wins+losses>0) ? parsePct(wins/(wins+losses)) : 0;

    const mData  = miscMap.get(tId)    || defMiscTeam();
    const hData  = hustleMap.get(tId)  || { boxOuts:0, looseBalls:0 };
    const sData  = scoringMap.get(tId) || defScoringTeam();
    const adv    = advMap.get(tId)     || {};
    const clData = clutchMap.get(tId);

    const advFixed = { ...adv, astToTeam: adv.astTo || 1.5 };

    const statsObj = {
      ppg : pts, oppPpg: pts-plusMinus,
      fgm : getStat(row,headersBase,'FGM'),   fga,
      fgPct: parsePct(getStat(row,headersBase,'FG_PCT')),
      fg3m: getStat(row,headersBase,'FG3M'),  fg3a:getStat(row,headersBase,'FG3A'),
      threePct: parsePct(getStat(row,headersBase,'FG3_PCT')),
      ftm : getStat(row,headersBase,'FTM'),   fta,
      ftPct: parsePct(getStat(row,headersBase,'FT_PCT')),
      oreb: getStat(row,headersBase,'OREB'),  dreb:getStat(row,headersBase,'DREB'),
      reb : getStat(row,headersBase,'REB'),   apg:getStat(row,headersBase,'AST'),
      tov : getStat(row,headersBase,'TOV'),   spg:getStat(row,headersBase,'STL'),
      bpg : getStat(row,headersBase,'BLK'),   blka:getStat(row,headersBase,'BLKA'),
      pf  : getStat(row,headersBase,'PF'),    pfd:getStat(row,headersBase,'PFD'),
      plusMinus,
      ftaRate: fga>0 ? parsePct(fta/fga) : 0,
      winPct,
    };

    return {
      id         : tId,
      name,
      abbreviation: staticTeam?.abbr || tAbbr,
      conference : staticTeam?.conf || 'Unknown',
      division   : staticTeam?.div  || 'Unknown',
      wins, losses, winPct,
      min: getStat(row,headersBase,'MIN'),
      ...statsObj,
      ...advFixed,
      stats : statsObj,
      adv   : advFixed,
      pctFgmAst      : sData.pctFgmAst,
      pct2fgmAst     : sData.pct2fgmAst,
      pct3fgmAst     : sData.pct3fgmAst,
      pctPts2pt      : sData.pctPts2pt,
      pctPts3pt      : sData.pctPts3pt,
      pctPtsFt       : sData.pctPtsFt,
      ptsOffTov      : mData.ptsOffTov,
      ptsFb          : mData.ptsFb,
      pts2ndChance   : mData.pts2ndChance,
      ptsPaint       : mData.ptsPaint,
      pctPtsOffTov   : pts>0 ? parsePct(mData.ptsOffTov/pts) : 0,
      pctPtsPitp     : pts>0 ? parsePct(mData.ptsPaint/pts)  : 0,
      boxOuts        : hData.boxOuts,
      looseBalls     : hData.looseBalls,
      imageUrl       : getTeamLogoUrl(staticTeam?.abbr || tAbbr),
      opp: {
        ...(oppMap.get(tId)||{oppFgPct:0,opp3ptPct:0,opp2ptPct:0,oppTov:0,oppFtaRate:0}),
        oppPtsPaint    : mData.oppPtsPaint,
        oppPtsOffTov   : mData.oppPtsOffTov,
        oppPtsFb       : mData.oppPtsFb,
        oppPts2ndChance: mData.oppPts2ndChance,
      },
      clutch: clData || {
        clutchNetRtg:adv.netRtg||0, clutchWinPct:winPct, winPct,
        tsPct:adv.tsPct||0, ts:adv.tsPct||0,
        offRtg:adv.offRtg||0, defRtg:adv.defRtg||0, netRtg:adv.netRtg||0,
        pace:adv.pace||0, rebPct:adv.rebPct||0, astTo:adv.astTo||0,
        percentiles:{Offense:50,Defense:50,NetRating:50,Pace:50,Efficiency:50,Rebounding:50}
      },
    };
  });

  // ── Arrays para percentiles de equipo ──────────────────────────────────────
  const tArrays = buildTeamArrays(rawTeams);

  // ── Enriquecer con percentiles + z-scores + rating ─────────────────────────
  const finalTeams = rawTeams.map(t => {
    const tId    = t.id;
    const pcts   = computeTeamPercentiles(t, tArrays);
    const zScores= {
      Offense  : zScore(t.offRtg||115, tArrays.allOffRtg),
      Defense  : zScore(115-(t.defRtg||115), tArrays.allDefRtgInv),
      NetRating: zScore(t.netRtg||0,   tArrays.allNetRtg),
      Pace     : zScore(t.pace||100,   tArrays.allPace),
      Efficiency: zScore(t.tsPct||55,  tArrays.allTsPct),
      Rebounding: zScore(t.rebPct||50, tArrays.allRebPct),
    };

    const teamRoster = allPlayers.filter(p =>
      p.teamId === t.abbreviation || String(p.teamId) === String(tId)
    );

    const teamWithPct = { ...t, percentiles: pcts, zScores };
    const rating = calculateTeam2KRating(teamWithPct, teamRoster);

    return { ...teamWithPct, rating };
  });

  console.log(`  ✅ ${finalTeams.length} equipos procesados.`);
  return finalTeams;
}

// ════════════════════════════════════════════════════════
// BUILDERS AUXILIARES DE MAPAS
// ════════════════════════════════════════════════════════
function buildMap(data, idField, builder) {
  const map = new Map();
  if (!data?.resultSets?.[0]?.rowSet?.length) return map;
  const h = data.resultSets[0].headers;
  data.resultSets[0].rowSet.forEach(row => {
    const id  = String(row[h.indexOf(idField)]);
    if (id && id!=='undefined') map.set(id, builder(row, h));
  });
  return map;
}

const buildAdvPlayerEntry = (row, h) => ({
  ts    : parsePct(getStat(row,h,'TS_PCT')),
  efg   : parsePct(getStat(row,h,'EFG_PCT')),
  usg   : parsePct(getStat(row,h,'USG_PCT')),
  defRating: getStat(row,h,'DEF_RATING')||115,
  pie   : parsePct(getStat(row,h,'PIE')),
  per   : getStat(row,h,'PER')||15.0,
  vorp  : getStat(row,h,'VORP')||0.0,
  netRtg: getStat(row,h,'NET_RATING'),
  astPct: parsePct(getStat(row,h,'AST_PCT')),
  astTo : getStat(row,h,'AST_TO'),
  astRatio:getStat(row,h,'AST_RATIO'),
  pace  : getStat(row,h,'PACE')||100,
  orebPct:parsePct(getStat(row,h,'OREB_PCT')),
  drebPct:parsePct(getStat(row,h,'DREB_PCT')),
  offRtg: getStat(row,h,'OFF_RATING')||115,
  ftaRate:getStat(row,h,'FTA_RATE'),
  bpm   : getStat(row,h,'BPM')||null,
});

const buildMiscPlayerEntry = (row, h) => ({
  ptsOffTov  :getStat(row,h,'PTS_OFF_TOV'),
  pts2ndChance:getStat(row,h,'PTS_2ND_CHANCE'),
  ptsFb      :getStat(row,h,'PTS_FB'),
  ptsPaint   :getStat(row,h,'PTS_PAINT'),
});

const buildScoringPlayerEntry = (row, h) => ({
  pctPts2pt  :parsePct(getStat(row,h,'PCT_PTS_2PT')),
  pctPts3pt  :parsePct(getStat(row,h,'PCT_PTS_3PT')),
  pctPtsFt   :parsePct(getStat(row,h,'PCT_PTS_FT')),
  pctFgmAst  :parsePct(getStat(row,h,'PCT_AST_FGM')),
  pctFgmUast :parsePct(getStat(row,h,'PCT_UAST_FGM')),
});

const buildHustlePlayerEntry = (row, h) => ({
  deflections    :getStat(row,h,'DEFLECTIONS'),
  contestedShots :getStat(row,h,'CONTESTED_SHOTS'),
  contested3pt   :getStat(row,h,'CONTESTED_SHOTS_3PT'),
  contested2pt   :getStat(row,h,'CONTESTED_SHOTS_2PT'),
  chargesDrawn   :getStat(row,h,'CHARGES_DRAWN'),
  looseBalls     :getStat(row,h,'LOOSE_BALLS_RECOVERED'),
  boxOuts        :getStat(row,h,'BOX_OUTS'),
  screenAssists  :getStat(row,h,'SCREEN_AST')||getStat(row,h,'SCREEN_ASSISTS'),
});

const buildPassingEntry = (row, h) => ({
  passesMade  :getStat(row,h,'PASSES_MADE'),
  potentialAst:getStat(row,h,'POTENTIAL_AST'),
  secondaryAst:getStat(row,h,'SECONDARY_AST'),
  astPtsCreated:getStat(row,h,'AST_POINTS_CREATED'),
  astToPassPct :parsePct(getStat(row,h,'AST_TO_PASS_PCT')),
});

const buildDefendingEntry = (row, h) => ({
  dfgPct :parsePct(getStat(row,h,'D_FG_PCT')),
  dfg3Pct:parsePct(getStat(row,h,'NORMAL_FG3_PCT')),
  dfg2Pct:parsePct(getStat(row,h,'NORMAL_FG_PCT')),
});

// Team map builders
const buildAdvTeamEntry = (row, h) => ({
  offRtg:getStat(row,h,'OFF_RATING')||0,  defRtg:getStat(row,h,'DEF_RATING')||0,
  netRtg:getStat(row,h,'NET_RATING')||0,  pace:getStat(row,h,'PACE')||0,
  tsPct :parsePct(getStat(row,h,'TS_PCT')), astTo:getStat(row,h,'AST_TO')||0,
  astPct:parsePct(getStat(row,h,'AST_PCT')), rebPct:parsePct(getStat(row,h,'REB_PCT')),
  orebPct:parsePct(getStat(row,h,'OREB_PCT')), drebPct:parsePct(getStat(row,h,'DREB_PCT')),
  efgPct:parsePct(getStat(row,h,'EFG_PCT')), astRatio:getStat(row,h,'AST_RATIO')||0,
  pie:parsePct(getStat(row,h,'PIE')), tovPct:parsePct(getStat(row,h,'TM_TOV_PCT'))||0,
});

const buildOppTeamEntry = (row, h) => {
  const oppFga=getStat(row,h,'OPP_FGA'), oppFta=getStat(row,h,'OPP_FTA');
  const oppFg3a=getStat(row,h,'OPP_FG3A'), oppFgm=getStat(row,h,'OPP_FGM'), oppFg3m=getStat(row,h,'OPP_FG3M');
  const opp2pa=Math.max(1,oppFga-oppFg3a), opp2pm=Math.max(0,oppFgm-oppFg3m);
  return {
    oppFgPct:parsePct(getStat(row,h,'OPP_FG_PCT')), opp3ptPct:parsePct(getStat(row,h,'OPP_FG3_PCT')),
    opp2ptPct:parsePct(opp2pm/opp2pa), oppTov:getStat(row,h,'OPP_TOV')||0,
    oppFtaRate:oppFga>0?parsePct(oppFta/oppFga):0,
  };
};

const buildMiscTeamEntry = (row, h) => ({
  ptsOffTov:getStat(row,h,'PTS_OFF_TOV')||0,   ptsFb:getStat(row,h,'PTS_FB')||0,
  pts2ndChance:getStat(row,h,'PTS_2ND_CHANCE')||0, ptsPaint:getStat(row,h,'PTS_PAINT')||0,
  oppPtsOffTov:getStat(row,h,'OPP_PTS_OFF_TOV')||0, oppPtsFb:getStat(row,h,'OPP_PTS_FB')||0,
  oppPts2ndChance:getStat(row,h,'OPP_PTS_2ND_CHANCE')||0, oppPtsPaint:getStat(row,h,'OPP_PTS_PAINT')||0,
});

const buildHustleTeamEntry = (row, h) => ({
  boxOuts:getStat(row,h,'BOX_OUTS')||0, looseBalls:getStat(row,h,'LOOSE_BALLS_RECOVERED')||0,
});

const buildScoringTeamEntry = (row, h) => ({
  pctFgmAst:parsePct(getStat(row,h,'PCT_AST_FGM')),  pct2fgmAst:parsePct(getStat(row,h,'PCT_AST_2PM')),
  pct3fgmAst:parsePct(getStat(row,h,'PCT_AST_3PM')), pctPts2pt:parsePct(getStat(row,h,'PCT_PTS_2PT')),
  pctPts3pt:parsePct(getStat(row,h,'PCT_PTS_3PT')),  pctPtsFt:parsePct(getStat(row,h,'PCT_PTS_FT')),
});

const buildClutchAdvEntry = (row, h) => ({
  offRtg:getStat(row,h,'OFF_RATING')||0, defRtg:getStat(row,h,'DEF_RATING')||0,
  netRtg:getStat(row,h,'NET_RATING')||0, astPct:parsePct(getStat(row,h,'AST_PCT')),
  astTo:getStat(row,h,'AST_TO')||0, astRatio:getStat(row,h,'AST_RATIO')||0,
  orebPct:parsePct(getStat(row,h,'OREB_PCT')), drebPct:parsePct(getStat(row,h,'DREB_PCT')),
  rebPct:parsePct(getStat(row,h,'REB_PCT')), tovPct:parsePct(getStat(row,h,'TM_TOV_PCT')),
  efgPct:parsePct(getStat(row,h,'EFG_PCT')), pace:getStat(row,h,'PACE')||0,
  pie:parsePct(getStat(row,h,'PIE')),
});

function buildClutchData(resClutchBase, clutchAdvMap, resBase, advMap) {
  if (resClutchBase?.resultSets?.[0]?.rowSet?.length) {
    const h = resClutchBase.resultSets[0].headers;
    return resClutchBase.resultSets[0].rowSet.map(row => {
      const tId  = String(row[h.indexOf('TEAM_ID')]);
      const wins = getStat(row,h,'W'), losses=getStat(row,h,'L');
      const apiWinPct = getStat(row,h,'W_PCT');
      const wPct = apiWinPct ? parsePct(apiWinPct) : (wins+losses>0?parsePct(wins/(wins+losses)):0);
      const pts=getStat(row,h,'PTS'), fga=getStat(row,h,'FGA'), fta=getStat(row,h,'FTA');
      return {
        id:tId, gp:getStat(row,h,'GP'), min:getStat(row,h,'MIN'),
        wins, losses, pts, fga, fta,
        tsPct:(fga>0||fta>0)?parsePct(pts/(2*(fga+0.44*fta))):0,
        winPct:wPct, adv:clutchAdvMap.get(tId)||{}
      };
    });
  }
  // Fallback: estimar desde datos base
  const hb = resBase.resultSets[0].headers;
  return resBase.resultSets[0].rowSet.map(row => {
    const tId=getString(row,hb,'TEAM_ID','0');
    const adv=advMap.get(tId)||{};
    const wins=getStat(row,hb,'W');
    return {
      id:tId, gp:Math.max(1,Math.round(wins*0.6)), min:15,
      wins, losses:getStat(row,hb,'L'),
      pts:10, fga:8, fta:2, tsPct:55,
      winPct:parsePct(getStat(row,hb,'W_PCT')),
      adv:{ netRtg:(adv.netRtg||0)*1.2, defRtg:adv.defRtg||110, pace:adv.pace||100, rebPct:adv.rebPct||50 }
    };
  });
}

function computeClutchPercentiles(clutchDataRaw) {
  const valid = clutchDataRaw.filter(t => t.min>0);
  const allCOff    = asc(valid.map(t=>t.adv.offRtg||115));
  const allCDefInv = asc(valid.map(t=>115-(t.adv.defRtg||115)));
  const allCNet    = asc(valid.map(t=>t.adv.netRtg||0));
  const allCPace   = asc(valid.map(t=>t.adv.pace||100));
  const allCTs     = asc(valid.map(t=>t.tsPct));
  const allCReb    = asc(valid.map(t=>t.adv.rebPct||50));

  const map = new Map();
  clutchDataRaw.forEach(t => {
    map.set(t.id, {
      ...t, ...t.adv,
      clutchNetRtg: t.adv.netRtg||0, clutchWinPct: t.winPct||0,
      ts: t.tsPct||0,
      percentiles: {
        Offense  : calcPercentile(t.adv.offRtg||115, allCOff),
        Defense  : calcPercentile(115-(t.adv.defRtg||115), allCDefInv),
        NetRating: calcPercentile(t.adv.netRtg||0,   allCNet),
        Pace     : calcPercentile(t.adv.pace||100,   allCPace),
        Efficiency:calcPercentile(t.tsPct,           allCTs),
        Rebounding:calcPercentile(t.adv.rebPct||50,  allCReb),
      }
    });
  });
  return map;
}

// ════════════════════════════════════════════════════════
// ARRAYS Y PERCENTILES DE JUGADORES
// ════════════════════════════════════════════════════════
function buildPlayerArrays(qualified, hasTracking) {
  const m = (fn) => asc(qualified.map(fn));
  return {
    allPPG       : m(p=>p.per36Stats.ppg),
    allAPG       : m(p=>p.per36Stats.apg),
    allRPG       : m(p=>p.per36Stats.rpg),
    allTS        : m(p=>p.adv.ts),
    allBPM       : m(p=>p.adv.bpm),
    all3P        : m(p=>p.stats.threePct),
    all3PM       : m(p=>p.per36Stats.fg3m),
    all3PA       : m(p=>p.per36Stats.fg3a),
    allWinPct    : m(p=>p.stats.winPct),
    allFG2Pct    : m(p=>p.stats.fg2Pct),
    allFgPct     : m(p=>p.stats.fgPct),
    allOReb      : m(p=>p.per36Stats.oreb),
    allDReb      : m(p=>p.per36Stats.dreb),
    allAstPct    : m(p=>p.adv.astPct),
    allOffRtg    : m(p=>p.adv.offRtg),
    allDefRtgInv : m(p=>115-(p.adv.defRating||115)),
    allNetRtg    : m(p=>p.adv.net||p.adv.netRtg||0),
    allContested : m(p=>p.per36Stats.contestedShots),
    allContested3: m(p=>p.per36Stats.contested3pt),
    allContested2: m(p=>p.per36Stats.contested2pt),
    allDeflections:m(p=>p.per36Stats.deflections),
    allBoxOuts   : m(p=>p.per36Stats.boxOuts),
    allLooseBalls: m(p=>p.per36Stats.looseBalls),
    allCharges   : m(p=>p.per36Stats.chargesDrawn),
    allScreenAsst: m(p=>p.per36Stats.screenAssists),
    allPER       : m(p=>p.adv.per),
    allVORP      : m(p=>p.adv.vorp),
    allPIE       : m(p=>p.adv.pie),
    allUSG       : m(p=>p.adv.usg),
    allEFG       : m(p=>p.adv.efg),
    allSPG       : m(p=>p.per36Stats.spg),
    allBPG       : m(p=>p.per36Stats.bpg),
    allBlkPct    : m(p=>p.stats.mpg>0 ? p.stats.bpg/p.stats.mpg : 0),
    allAstTo     : m(p=>p.adv.astTo),
    allFtPct     : m(p=>p.stats.ftPct),
    allPassesMade: m(p=>p.per36Stats.passesMade),
    allPotAst    : m(p=>p.per36Stats.potentialAst),
    allSecAst    : m(p=>p.per36Stats.secondaryAst),
    allAstPtsCreated:m(p=>p.per36Stats.astPtsCreated),
    allDFGInv    : m(p=>100-p.tracking.dfgPct),
    allDFG3Inv   : m(p=>100-p.tracking.dfg3Pct),
    allDFG2Inv   : m(p=>100-p.tracking.dfg2Pct),
    allPaintFGM  : m(p=>p.per36Stats.paintFGM),
    allMidFGM    : m(p=>p.per36Stats.midRangeFGM),
    allTwoPA     : m(p=>p.per36Stats.twoPA),
    allFtaRate   : m(p=>p.adv.ftaRate),
    allFgmUast   : m(p=>p.scoring.pctFgmUast),
    allPtsFb     : m(p=>p.per36Stats.ptsFb),
    allStocks    : m(p=>p.per36Stats.spg+p.per36Stats.bpg),
    allPassQual  : m(p=>p.per36Stats.potentialAst>0 ? (p.per36Stats.apg/p.per36Stats.potentialAst) : 0),
    allWS48      : m(p=>p.adv.ws48||0.100),
    allDefImpact : m(p=>{
      const dr=p.adv?.defRating||115;
      return Math.max(0,115-dr)*1.5+(p.per36Stats.spg*2.5)+(p.per36Stats.bpg*1.5);
    }),
  };
}

function computePlayerPercentiles(p, a, hasTracking) {
  const c  = calcPercentile;
  const pPPG = c(p.per36Stats.ppg, a.allPPG);
  const pTS  = c(p.adv.ts,         a.allTS);
  const pUSG = c(p.adv.usg,        a.allUSG);
  const pAPG = c(p.per36Stats.apg, a.allAPG);
  const pAstPct = c(p.adv.astPct,  a.allAstPct);
  const pSPG = c(p.per36Stats.spg, a.allSPG);
  const pBPG = c(p.per36Stats.bpg, a.allBPG);
  const pDReb= c(p.per36Stats.dreb,a.allDReb);
  const pDefl= c(p.per36Stats.deflections, a.allDeflections);
  const pCont= c(p.per36Stats.contestedShots, a.allContested);
  const pCont3=c(p.per36Stats.contested3pt, a.allContested3);
  const pCont2=c(p.per36Stats.contested2pt, a.allContested2);
  const pNet = c(p.adv.net||p.adv.netRtg||0, a.allNetRtg);
  const pBPM = c(p.adv.bpm, a.allBPM);
  const pPIE = c(p.adv.pie, a.allPIE);
  const pPER = c(p.adv.per, a.allPER);
  const pFG2 = c(p.stats.fg2Pct, a.allFG2Pct);

  const defRtgInvVal = 115-(p.adv.defRating||115);
  const pDefRtgInv   = c(defRtgInvVal, a.allDefRtgInv);

  let perimD=50, interiorD=50, globalDef=50, finishing=50, midRange=50;
  const scoringIndex = Math.min(100,Math.max(0,Math.round((pPPG*2.0+pTS*0.8)/2.8)));
  const playCreation = Math.min(100,Math.max(0,Math.round((pAPG+pAstPct)/2)));

  if (hasTracking) {
    perimD     = Math.round((pDefRtgInv*2.5+c(100-p.tracking.dfg3Pct,a.allDFG3Inv)*2.5+pDefl*1.0+pSPG*1.0+pCont3*1.0)/8.0);
    interiorD  = Math.round((pDefRtgInv*2.0+c(100-p.tracking.dfg2Pct,a.allDFG2Inv)*2.0+pBPG*4.0+pCont2*1.0+pDReb*0.5)/9.5);
    globalDef  = Math.round((pDefRtgInv*4.0+c(100-p.tracking.dfgPct,a.allDFGInv)*2.5+Math.max(pSPG,pBPG)*1.0+pCont*0.5)/8.0);
    finishing  = Math.round((c(p.per36Stats.paintFGM,a.allPaintFGM)*3.5+c(p.adv.ftaRate,a.allFtaRate)*1.5+pFG2*0.5)/5.5);
    midRange   = Math.round((c(p.per36Stats.midRangeFGM,a.allMidFGM)*4.0+c(p.stats.ftPct,a.allFtPct)*1.0)/5.0);
  } else {
    perimD    = Math.round((pSPG*6.0+pDefRtgInv*2.5+pBPM*1.5)/10.0);
    interiorD = Math.round((pDefRtgInv*2.0+pBPG*4.0+c(p.stats.mpg>0?p.stats.bpg/p.stats.mpg:0,a.allBlkPct)*1.5+pDReb*0.5)/8.0);
    globalDef = Math.round((pDefRtgInv*3.0+Math.max(pSPG,pBPG)*4.0+pBPM*3.0)/10.0);
    finishing = Math.round((c(p.per36Stats.paintFGM,a.allPaintFGM)*3.5+c(p.adv.ftaRate,a.allFtaRate)*1.5+pFG2*0.5)/5.5);
    midRange  = Math.round((c(p.per36Stats.twoPA,a.allTwoPA)*4.0+c(p.stats.ftPct,a.allFtPct)*1.0)/5.0);
  }

  let hustleScore=50;
  if (hasTracking) {
    hustleScore=Math.round((c(p.per36Stats.deflections,a.allDeflections)*4.0+c(p.per36Stats.looseBalls,a.allLooseBalls)*3.0+c(p.per36Stats.chargesDrawn,a.allCharges)*2.0+c(p.per36Stats.screenAssists,a.allScreenAsst)*1.0+c(p.per36Stats.boxOuts,a.allBoxOuts)*0.5)/10.5);
  } else {
    hustleScore=Math.round((c(p.per36Stats.spg,a.allSPG)*4.0+c(p.per36Stats.oreb,a.allOReb)*1.0+c(p.per36Stats.dreb,a.allDReb)*0.5)/5.5);
  }

  const overallImpact = Math.round((pNet+pBPM+pPIE+pPER)/4.0);

  const pPotAst = c(p.per36Stats.potentialAst, a.allPotAst);
  const pPasses = c(p.per36Stats.passesMade,   a.allPassesMade);
  const pSecAst = c(p.per36Stats.secondaryAst, a.allSecAst);
  const pAstPtsCr=c(p.per36Stats.astPtsCreated,a.allAstPtsCreated);
  const ballMovement  = Math.round((pPasses+pSecAst)/2.0);
  const playmakingLoad= Math.round((pAstPct+pUSG)/2.0);

  const clamp = (v) => Math.min(100,Math.max(0,v));

  return {
    Scoring       : pPPG,
    Playmaking    : pAPG,
    Rebounding    : c(p.per36Stats.rpg, a.allRPG),
    Efficiency    : pTS,
    Impact        : pBPM,
    Shooting      : Math.round((c(p.per36Stats.fg3m,a.all3PM)*2.5+c(p.stats.threePct,a.all3P)*1.0)/3.5),
    Defense       : clamp(globalDef),
    OReb          : c(p.per36Stats.oreb, a.allOReb),
    DReb          : pDReb,
    AstPct        : pAstPct,
    OffRtg        : c(p.adv.offRtg, a.allOffRtg),
    DefRtg        : pDefRtgInv,
    NetRtg        : pNet,
    Contested     : pCont,
    Deflections   : pDefl,
    PER           : pPER,
    WinPct        : c(p.stats.winPct, a.allWinPct),
    WS48          : c(p.adv.ws48||0.100, a.allWS48),
    VORP          : c(p.adv.vorp, a.allVORP),
    PIE           : pPIE,
    USG           : pUSG,
    EFG           : c(p.stats.fgPct, a.allFgPct),
    FtPct         : c(p.stats.ftPct, a.allFtPct),
    ScoringIndex  : clamp(scoringIndex),
    PlayCreation  : clamp(playCreation),
    PerimeterD    : clamp(perimD),
    InteriorD     : clamp(interiorD),
    Hustle        : clamp(hustleScore),
    OverallImpact : clamp(overallImpact),
    SystemicImpact: clamp(overallImpact),
    Finishing     : clamp(finishing),
    MidRange      : clamp(midRange),
    ShotCreation  : c(p.scoring.pctFgmUast, a.allFgmUast),
    PotentialAst  : pPotAst,
    AstPtsCreated : pAstPtsCr,
    BallMovement  : clamp(ballMovement),
    PlaymakingLoad: clamp(playmakingLoad),
    PassesMade    : pPasses,
    SecondaryAst  : pSecAst,
    BallSecurity  : c(p.adv.astTo, a.allAstTo),
    Steals        : pSPG,
    Blocks        : pBPG,
    FtaRate       : c(p.adv.ftaRate, a.allFtaRate),
    ThreePA       : c(p.per36Stats.fg3a, a.all3PA),
    FastBreak     : c(p.per36Stats.ptsFb, a.allPtsFb),
    Stocks        : c(p.per36Stats.spg+p.per36Stats.bpg, a.allStocks),
    PassQuality   : c(p.per36Stats.potentialAst>0?(p.per36Stats.apg/p.per36Stats.potentialAst):0, a.allPassQual),
    ShotDefense   : c(100-p.tracking.dfgPct, a.allDFGInv),
    ContestedReb  : pDReb,
    RebConversion : pDReb,
    LooseBalls    : c(p.per36Stats.looseBalls, a.allLooseBalls),
    ChargesDrawn  : c(p.per36Stats.chargesDrawn, a.allCharges),
  };
}

// ════════════════════════════════════════════════════════
// ARRAYS Y PERCENTILES DE EQUIPOS
// ════════════════════════════════════════════════════════
function buildTeamArrays(teams) {
  const m = (fn) => asc(teams.map(fn));
  return {
    allOffRtg   : m(t=>t.offRtg||115),
    allDefRtgInv: m(t=>115-(t.defRtg||115)),
    allNetRtg   : m(t=>t.netRtg||0),
    allPace     : m(t=>t.pace||100),
    allTsPct    : m(t=>t.tsPct||55),
    allRebPct   : m(t=>t.rebPct||50),
    allAPG      : m(t=>t.apg||0),
    allAstTo    : m(t=>t.astTo||1.5),
    allOrebPct  : m(t=>t.orebPct||25),
    allSPG      : m(t=>t.spg||0),
    allBPG      : m(t=>t.bpg||0),
    allDrebPct  : m(t=>t.drebPct||75),
    allOpp2pInv : m(t=>100-(t.opp?.opp2ptPct||50)),
    allOpp3pInv : m(t=>100-(t.opp?.opp3ptPct||35)),
    allPPG      : m(t=>t.ppg||0),
    allFgPct    : m(t=>t.fgPct||45),
    all3pPct    : m(t=>t.threePct||35),
    allFtPct    : m(t=>t.ftPct||75),
    allRawReb   : m(t=>t.reb||40),
    allOppPtsFbInv:m(t=>100-(t.opp?.oppPtsFb||15)),
    allOppTov   : m(t=>t.opp?.oppTov||13),
    allPtsFb    : m(t=>t.ptsFb||0),
    allPts2nd   : m(t=>t.pts2ndChance||0),
    allPtsOffTov: m(t=>t.ptsOffTov||0),
    allTovPctInv: m(t=>100-(t.tovPct||15)),
    allLooseBalls:m(t=>t.looseBalls||0),
    allBoxOuts  : m(t=>t.boxOuts||0),
    allFtaRate  : m(t=>t.ftaRate||0),
    allPct3pt   : m(t=>t.pctPts3pt||0),
    allFgmAst   : m(t=>t.pctFgmAst||0),
  };
}

function computeTeamPercentiles(t, a) {
  const c = calcPercentile;
  return {
    Offense         : c(t.offRtg||115,   a.allOffRtg),
    Defense         : c(115-(t.defRtg||115), a.allDefRtgInv),
    NetRating       : c(t.netRtg||0,     a.allNetRtg),
    Pace            : c(t.pace||100,     a.allPace),
    Efficiency      : c(t.tsPct||55,     a.allTsPct),
    Rebounding      : c(t.rebPct||50,    a.allRebPct),
    Points          : c(t.ppg,           a.allPPG),
    RawReb          : c(t.reb,           a.allRawReb),
    FgPct           : c(t.fgPct,         a.allFgPct),
    ThreePct        : c(t.threePct,      a.all3pPct),
    FtPct           : c(t.ftPct,         a.allFtPct),
    Playmaking      : c(t.apg,           a.allAPG),
    BallSecurity    : c(t.astTo,         a.allAstTo),
    OffReb          : c(t.orebPct,       a.allOrebPct),
    Steals          : c(t.spg,           a.allSPG),
    Blocks          : c(t.bpg,           a.allBPG),
    DefReb          : c(t.drebPct,       a.allDrebPct),
    InteriorDef     : c(100-(t.opp?.opp2ptPct||50), a.allOpp2pInv),
    PerimDefense    : c(100-(t.opp?.opp3ptPct||35), a.allOpp3pInv),
    TransitionDef   : c(100-(t.opp?.oppPtsFb||15),  a.allOppPtsFbInv),
    TurnoversForced : c(t.opp?.oppTov||13, a.allOppTov),
    FastBreak       : c(t.ptsFb,         a.allPtsFb),
    SecondChance    : c(t.pts2ndChance,  a.allPts2nd),
    PtsOffTov       : c(t.ptsOffTov,     a.allPtsOffTov),
    Hustle          : c(t.looseBalls,    a.allLooseBalls),
    BoxOuts         : c(t.boxOuts,       a.allBoxOuts),
    TurnoverAvoidance:c(100-(t.tovPct||15), a.allTovPctInv),
    FtaRate         : c(t.ftaRate,       a.allFtaRate),
    ShotProfile     : c(t.pctPts3pt,     a.allPct3pt),
    BallMovement    : c(t.pctFgmAst,     a.allFgmAst),
  };
}

// ════════════════════════════════════════════════════════
// ESTIMADORES DE FALLBACK (cuando NBA API Advanced falla
// o el jugador no tiene BRef match)
//
// NOTA: Estos son ESTIMACIONES, NO las fórmulas correctas.
//       Se usan SOLO como fallback. Están etiquetados en
//       el objeto player con isRealBRef: false.
// ════════════════════════════════════════════════════════
function estimatePER(pts, reb, ast, stl, blk, fga, fgm, fta, tov, min) {
  if (!min || min <= 0) return 0;
  const missedFG = fga - fgm;
  const missedFT = fta - (fta * 0.75); // approximate makes
  const base = pts + reb + ast + stl + blk - missedFG - missedFT - tov;
  const perRaw = base * (30 / min);
  return Math.max(0, Math.round(isNaN(perRaw)||!isFinite(perRaw)?0:perRaw*10)/10);
}

function estimateBPM(pts, reb, ast, stl, blk, fga, fta, tov, min) {
  if (!min || min <= 0) return 0;
  const impact = (pts)+((reb)*0.4)+((ast)*1.5)+((stl)*2.5)+((blk)*2.0)-(fga*1.1)-(fta*0.45)-(tov*2.5);
  const raw    = ((impact*(36/min))*0.25)-2.0;
  return Math.max(-10, Math.round(isNaN(raw)||!isFinite(raw)?0:raw*10)/10);
}

// ════════════════════════════════════════════════════════
// DEFAULTS PARA MAPAS AUXILIARES VACÍOS
// ════════════════════════════════════════════════════════
const defHustle  = () => ({ deflections:0,contestedShots:0,contested3pt:0,contested2pt:0,chargesDrawn:0,looseBalls:0,boxOuts:0,screenAssists:0 });
const defMisc    = () => ({ ptsOffTov:0,pts2ndChance:0,ptsFb:0,ptsPaint:0 });
const defScoring = () => ({ pctPts2pt:0,pctPts3pt:0,pctPtsFt:0,pctFgmAst:0,pctFgmUast:0 });
const defPassing = () => ({ passesMade:0,potentialAst:0,secondaryAst:0,astPtsCreated:0,astToPassPct:0 });
const defDefending=() => ({ dfgPct:50.0,dfg3Pct:36.0,dfg2Pct:50.0 });
const defMiscTeam= () => ({ ptsOffTov:0,ptsFb:0,pts2ndChance:0,ptsPaint:0,oppPtsOffTov:0,oppPtsFb:0,oppPts2ndChance:0,oppPtsPaint:0 });
const defScoringTeam=()=>({ pctFgmAst:0,pct2fgmAst:0,pct3fgmAst:0,pctPts2pt:0,pctPts3pt:0,pctPtsFt:0 });

// ════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  NBA DATA PIPELINE — Temporada: ${SEASON}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(65)}`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // ── FASE 1: Jugadores ──────────────────────────────────────────────────────
  let players;
  try {
    players = await buildPlayers(SEASON);
  } catch (err) {
    console.error(`\n❌ FATAL en FASE 1 (jugadores): ${err.message}`);
    process.exit(1);
  }

  // ── FASE 2: Equipos ────────────────────────────────────────────────────────
  let teams;
  try {
    teams = await buildTeams(SEASON, players);
  } catch (err) {
    console.error(`\n❌ FATAL en FASE 2 (equipos): ${err.message}`);
    process.exit(1);
  }

  // ── FASE 3: Guardar outputs ────────────────────────────────────────────────
  console.log('\n💾 Guardando archivos JSON...');

  const metadata = {
    season     : SEASON,
    generatedAt: new Date().toISOString(),
    playerCount: players.length,
    teamCount  : teams.length,
    source     : 'nba-stats-api + basketball-reference',
  };

  const playersOut = { metadata, players };
  const teamsOut   = { metadata, teams   };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'nba_players_current.json'),
    JSON.stringify(playersOut, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'nba_teams_current.json'),
    JSON.stringify(teamsOut, null, 2),
    'utf-8'
  );

  // También guardar los JSON planos (sin metadata wrapper) para compatibilidad
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'nba_players_current_raw.json'),
    JSON.stringify(players, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'nba_teams_current_raw.json'),
    JSON.stringify(teams, null, 2),
    'utf-8'
  );

  const pSize = ((JSON.stringify(players).length)/1024/1024).toFixed(2);
  const tSize = ((JSON.stringify(teams ).length)/1024/1024).toFixed(2);

  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  ✅ PIPELINE COMPLETADO`);
  console.log(`  Jugadores : ${players.length} (${pSize} MB)`);
  console.log(`  Equipos   : ${teams.length}   (${tSize} MB)`);
  console.log(`  Destino   : ${OUTPUT_DIR}`);
  console.log(`  Temporada : ${SEASON}`);
  console.log(`${'═'.repeat(65)}\n`);
}

main().catch(err => {
  console.error('\n❌ ERROR CRÍTICO:', err);
  process.exit(1);
});

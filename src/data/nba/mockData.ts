export interface NBAPlayer {
  id: string;
  name: string;
  position: string;
  teamId: string;
  teamName: string;
  age: number;
  imageUrl?: string;
  stats: {
    ppg: number; rpg: number; apg: number; spg: number; bpg: number;
    fgPct: number; threePct: number; ftPct: number; mpg: number;
    gp?: number; ts?: number; efg?: number; usg?: number; defRating?: number;
    fga?: number; fgm?: number; fg3m?: number; fta?: number; topg?: number;
    pie?: number; netRtg?: number; astPct?: number;
  };
  adv?: {
    per: number; bpm: number; vorp: number; pie: number; net: number;
    usg: number; ts: number; ast: number; efg: number;
    [key: string]: number;
  };
  gameLog: { date: string; pts: number; reb: number; ast: number; min: number }[];
}

export interface NBATeam {
  id: string;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  ppg: number;
  oppg: number;
  pace: number;
}

export interface AdvancedPlayerMetrics {
  gir: number; pva: number; ddi: number; cps: number; eoe: number; sqi: number; lsr: number; uap: number;
}

export interface TeamAdvancedMetrics {
  offensiveEfficiency: number; defensiveEfficiency: number; netRating: number;
  paceAdjustedScoring: number; winProbContribution: number; lineupSynergy: number;
}

const generateGameLog = (avgPts: number, avgReb: number, avgAst: number) => {
  const games = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(2026, 0, 1 + i * 2);
    games.push({
      date: d.toISOString().split("T")[0],
      pts: Math.max(0, Math.round(avgPts + (Math.random() - 0.5) * 16)),
      reb: Math.max(0, Math.round(avgReb + (Math.random() - 0.5) * 6)),
      ast: Math.max(0, Math.round(avgAst + (Math.random() - 0.5) * 6)),
      min: Math.round(32 + (Math.random() - 0.5) * 10),
    });
  }
  return games;
};

// LOS 30 EQUIPOS OFICIALES DE LA NBA
export const NBA_TEAMS: NBATeam[] = [
  { id: "ATL", name: "Atlanta Hawks", abbreviation: "ATL", conference: "Eastern", division: "Southeast", wins: 25, losses: 30, ppg: 118.4, oppg: 120.1, pace: 101.2 },
  { id: "BOS", name: "Boston Celtics", abbreviation: "BOS", conference: "Eastern", division: "Atlantic", wins: 45, losses: 12, ppg: 120.1, oppg: 108.7, pace: 98.5 },
  { id: "BKN", name: "Brooklyn Nets", abbreviation: "BKN", conference: "Eastern", division: "Atlantic", wins: 22, losses: 35, ppg: 112.3, oppg: 115.6, pace: 99.1 },
  { id: "CHA", name: "Charlotte Hornets", abbreviation: "CHA", conference: "Eastern", division: "Southeast", wins: 15, losses: 42, ppg: 108.5, oppg: 117.2, pace: 98.7 },
  { id: "CHI", name: "Chicago Bulls", abbreviation: "CHI", conference: "Eastern", division: "Central", wins: 28, losses: 29, ppg: 111.8, oppg: 112.9, pace: 97.4 },
  { id: "CLE", name: "Cleveland Cavaliers", abbreviation: "CLE", conference: "Eastern", division: "Central", wins: 38, losses: 19, ppg: 114.5, oppg: 109.8, pace: 98.2 },
  { id: "DAL", name: "Dallas Mavericks", abbreviation: "DAL", conference: "Western", division: "Southwest", wins: 35, losses: 22, ppg: 118.7, oppg: 115.4, pace: 100.5 },
  { id: "DEN", name: "Denver Nuggets", abbreviation: "DEN", conference: "Western", division: "Northwest", wins: 40, losses: 16, ppg: 114.8, oppg: 110.2, pace: 97.5 },
  { id: "DET", name: "Detroit Pistons", abbreviation: "DET", conference: "Eastern", division: "Central", wins: 10, losses: 48, ppg: 110.2, oppg: 121.5, pace: 100.1 },
  { id: "GSW", name: "Golden State Warriors", abbreviation: "GSW", conference: "Western", division: "Pacific", wins: 32, losses: 24, ppg: 118.8, oppg: 116.2, pace: 101.6 },
  { id: "HOU", name: "Houston Rockets", abbreviation: "HOU", conference: "Western", division: "Southwest", wins: 29, losses: 28, ppg: 113.5, oppg: 112.8, pace: 99.4 },
  { id: "IND", name: "Indiana Pacers", abbreviation: "IND", conference: "Eastern", division: "Central", wins: 34, losses: 24, ppg: 123.4, oppg: 121.9, pace: 103.1 },
  { id: "LAC", name: "Los Angeles Clippers", abbreviation: "LAC", conference: "Western", division: "Pacific", wins: 38, losses: 18, ppg: 117.6, oppg: 112.5, pace: 98.3 },
  { id: "LAL", name: "Los Angeles Lakers", abbreviation: "LAL", conference: "Western", division: "Pacific", wins: 33, losses: 25, ppg: 116.5, oppg: 115.8, pace: 101.0 },
  { id: "MEM", name: "Memphis Grizzlies", abbreviation: "MEM", conference: "Western", division: "Southwest", wins: 20, losses: 38, ppg: 106.8, oppg: 112.9, pace: 98.6 },
  { id: "MIA", name: "Miami Heat", abbreviation: "MIA", conference: "Eastern", division: "Southeast", wins: 33, losses: 25, ppg: 110.5, oppg: 110.1, pace: 97.2 },
  { id: "MIL", name: "Milwaukee Bucks", abbreviation: "MIL", conference: "Eastern", division: "Central", wins: 38, losses: 20, ppg: 120.5, oppg: 115.1, pace: 101.4 },
  { id: "MIN", name: "Minnesota Timberwolves", abbreviation: "MIN", conference: "Western", division: "Northwest", wins: 41, losses: 17, ppg: 113.3, oppg: 106.9, pace: 98.1 },
  { id: "NOP", name: "New Orleans Pelicans", abbreviation: "NOP", conference: "Western", division: "Southwest", wins: 35, losses: 24, ppg: 116.1, oppg: 111.9, pace: 99.3 },
  { id: "NYK", name: "New York Knicks", abbreviation: "NYK", conference: "Eastern", division: "Atlantic", wins: 36, losses: 23, ppg: 113.8, oppg: 109.4, pace: 96.8 },
  { id: "OKC", name: "Oklahoma City Thunder", abbreviation: "OKC", conference: "Western", division: "Northwest", wins: 42, losses: 15, ppg: 120.4, oppg: 113.8, pace: 100.7 },
  { id: "ORL", name: "Orlando Magic", abbreviation: "ORL", conference: "Eastern", division: "Southeast", wins: 34, losses: 25, ppg: 111.4, oppg: 109.8, pace: 98.4 },
  { id: "PHI", name: "Philadelphia 76ers", abbreviation: "PHI", conference: "Eastern", division: "Atlantic", wins: 33, losses: 25, ppg: 115.2, oppg: 113.8, pace: 98.9 },
  { id: "PHX", name: "Phoenix Suns", abbreviation: "PHX", conference: "Western", division: "Pacific", wins: 35, losses: 24, ppg: 116.6, oppg: 114.3, pace: 99.5 },
  { id: "POR", name: "Portland Trail Blazers", abbreviation: "POR", conference: "Western", division: "Northwest", wins: 15, losses: 42, ppg: 107.5, oppg: 115.8, pace: 98.2 },
  { id: "SAC", name: "Sacramento Kings", abbreviation: "SAC", conference: "Western", division: "Pacific", wins: 33, losses: 25, ppg: 118.2, oppg: 117.8, pace: 101.1 },
  { id: "SAS", name: "San Antonio Spurs", abbreviation: "SAS", conference: "Western", division: "Southwest", wins: 12, losses: 48, ppg: 112.5, oppg: 120.8, pace: 102.5 },
  { id: "TOR", name: "Toronto Raptors", abbreviation: "TOR", conference: "Eastern", division: "Atlantic", wins: 22, losses: 37, ppg: 114.1, oppg: 117.9, pace: 99.6 },
  { id: "UTA", name: "Utah Jazz", abbreviation: "UTA", conference: "Western", division: "Northwest", wins: 27, losses: 32, ppg: 117.5, oppg: 120.5, pace: 100.8 },
  { id: "WAS", name: "Washington Wizards", abbreviation: "WAS", conference: "Eastern", division: "Southeast", wins: 9, losses: 50, ppg: 114.8, oppg: 124.5, pace: 103.5 }
];

// JUGADORES ACTUALIZADOS CON SUS EQUIPOS REALES Y KD EN HOUSTON
export const NBA_PLAYERS: NBAPlayer[] = [
  { id: "1629029", name: "Luka Dončić", position: "PG", teamId: "DAL", teamName: "Dallas Mavericks", age: 26, stats: { ppg: 34.2, rpg: 8.8, apg: 9.8, spg: 1.4, bpg: 0.6, fgPct: 49.2, threePct: 37.8, ftPct: 78.4, mpg: 37.2 }, gameLog: generateGameLog(34, 9, 10) },
  { id: "203999", name: "Nikola Jokić", position: "C", teamId: "DEN", teamName: "Denver Nuggets", age: 30, stats: { ppg: 26.1, rpg: 12.4, apg: 9.2, spg: 1.4, bpg: 0.9, fgPct: 56.8, threePct: 33.7, ftPct: 81.2, mpg: 34.8 }, gameLog: generateGameLog(26, 12, 9) },
  { id: "1628369", name: "Jayson Tatum", position: "SF", teamId: "BOS", teamName: "Boston Celtics", age: 27, stats: { ppg: 27.2, rpg: 8.1, apg: 4.7, spg: 1.1, bpg: 0.7, fgPct: 47.1, threePct: 37.6, ftPct: 85.3, mpg: 36.0 }, gameLog: generateGameLog(27, 8, 5) },
  { id: "203507", name: "Giannis Antetokounmpo", position: "PF", teamId: "MIL", teamName: "Milwaukee Bucks", age: 30, stats: { ppg: 31.2, rpg: 11.6, apg: 5.8, spg: 1.2, bpg: 1.5, fgPct: 55.3, threePct: 27.4, ftPct: 68.9, mpg: 35.5 }, gameLog: generateGameLog(31, 12, 6) },
  { id: "1628983", name: "Shai Gilgeous-Alexander", position: "SG", teamId: "OKC", teamName: "Oklahoma City Thunder", age: 26, stats: { ppg: 30.8, rpg: 5.5, apg: 6.4, spg: 2.0, bpg: 0.9, fgPct: 51.0, threePct: 35.3, ftPct: 87.4, mpg: 34.2 }, gameLog: generateGameLog(31, 6, 6) },
  { id: "1630162", name: "Anthony Edwards", position: "SG", teamId: "MIN", teamName: "Minnesota Timberwolves", age: 23, stats: { ppg: 26.5, rpg: 5.8, apg: 5.2, spg: 1.5, bpg: 0.6, fgPct: 46.2, threePct: 36.8, ftPct: 82.1, mpg: 35.8 }, gameLog: generateGameLog(27, 6, 5) },
  { id: "201142", name: "Kevin Durant", position: "SF", teamId: "HOU", teamName: "Houston Rockets", age: 36, stats: { ppg: 27.0, rpg: 6.7, apg: 5.3, spg: 0.9, bpg: 1.4, fgPct: 52.1, threePct: 41.2, ftPct: 89.5, mpg: 34.0 }, gameLog: generateGameLog(27, 7, 5) },
  { id: "2544", name: "LeBron James", position: "SF", teamId: "LAL", teamName: "Los Angeles Lakers", age: 41, stats: { ppg: 24.8, rpg: 7.2, apg: 8.0, spg: 1.1, bpg: 0.6, fgPct: 50.1, threePct: 38.2, ftPct: 75.0, mpg: 33.5 }, gameLog: generateGameLog(25, 7, 8) },
  { id: "201939", name: "Stephen Curry", position: "PG", teamId: "GSW", teamName: "Golden State Warriors", age: 37, stats: { ppg: 25.2, rpg: 4.5, apg: 6.1, spg: 0.8, bpg: 0.2, fgPct: 45.8, threePct: 40.9, ftPct: 91.2, mpg: 32.0 }, gameLog: generateGameLog(25, 5, 6) },
  { id: "1641705", name: "Victor Wembanyama", position: "C", teamId: "SAS", teamName: "San Antonio Spurs", age: 21, stats: { ppg: 23.6, rpg: 10.8, apg: 3.8, spg: 1.2, bpg: 3.6, fgPct: 47.5, threePct: 33.5, ftPct: 79.8, mpg: 33.0 }, gameLog: generateGameLog(24, 11, 4) },
  { id: "1627759", name: "Jaylen Brown", position: "SG", teamId: "BOS", teamName: "Boston Celtics", age: 28, stats: { ppg: 23.0, rpg: 5.5, apg: 3.6, spg: 1.2, bpg: 0.5, fgPct: 49.9, threePct: 35.4, ftPct: 76.5, mpg: 33.5 }, gameLog: generateGameLog(23, 5, 4) },
  { id: "1627750", name: "Jamal Murray", position: "PG", teamId: "DEN", teamName: "Denver Nuggets", age: 28, stats: { ppg: 21.2, rpg: 4.1, apg: 6.5, spg: 1.0, bpg: 0.3, fgPct: 48.1, threePct: 42.5, ftPct: 85.3, mpg: 31.5 }, gameLog: generateGameLog(21, 4, 6) },
];

export function computeGIR(p: NBAPlayer): number { const { ppg, rpg, apg, spg, bpg, fgPct } = p.stats; return Math.round(((ppg * 1.0 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 2.0) * (fgPct / 50)) * 10) / 10; }
export function computePVA(p: NBAPlayer): number { const { apg, ppg, fgPct } = p.stats; return Math.round((apg * 2.5 + ppg * 0.3) * (fgPct / 45) * 10) / 10; }
export function computeDDI(p: NBAPlayer): number { const { spg, bpg, rpg } = p.stats; return Math.round((spg * 3.0 + bpg * 2.5 + rpg * 0.5) * 10) / 10; }
export function computeCPS(p: NBAPlayer): number { const { ppg, ftPct, threePct } = p.stats; return Math.round((ppg * 0.4 + ftPct * 0.3 + threePct * 0.3) * 10) / 10; }
export function computeEOE(p: NBAPlayer): number { const { ppg, fgPct, ftPct } = p.stats; const expected = ppg * (fgPct / 100); return Math.round((ppg - expected) * (ftPct / 80) * 10) / 10; }
export function computeSQI(p: NBAPlayer): number { const { fgPct, threePct, ppg } = p.stats; return Math.round(((fgPct * 0.6 + threePct * 0.4) * ppg / 25) * 10) / 10; }
export function computeLSR(p: NBAPlayer): number { const { apg, rpg, spg } = p.stats; return Math.round((apg * 1.8 + rpg * 0.6 + spg * 1.2) * 10) / 10; }
export function computeUAP(p: NBAPlayer): number { const { ppg, rpg, apg, mpg, fgPct } = p.stats; return Math.round(((ppg + rpg + apg) / mpg * 36) * (fgPct / 48) * 10) / 10; }
export function computeAllAdvanced(p: NBAPlayer): AdvancedPlayerMetrics { return { gir: computeGIR(p), pva: computePVA(p), ddi: computeDDI(p), cps: computeCPS(p), eoe: computeEOE(p), sqi: computeSQI(p), lsr: computeLSR(p), uap: computeUAP(p), }; }
export function computeTeamMetrics(t: NBATeam): TeamAdvancedMetrics { const offEff = Math.round(t.ppg / t.pace * 100 * 10) / 10; const defEff = Math.round(t.oppg / t.pace * 100 * 10) / 10; return { offensiveEfficiency: offEff, defensiveEfficiency: defEff, netRating: Math.round((t.ppg - t.oppg) * 10) / 10, paceAdjustedScoring: Math.round(t.ppg * (100 / t.pace) * 10) / 10, winProbContribution: Math.round((t.wins / (t.wins + t.losses)) * 100 * 10) / 10, lineupSynergy: Math.round((offEff - defEff + 5) * 8.2 * 10) / 10, }; }
export const computeImpactRating = computeGIR;
export const computeEfficiencyScore = computeUAP;
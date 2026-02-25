export interface NBAPlayer {
  id: string;
  name: string;
  position: string;
  teamId: string;
  teamName: string;
  age: number;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
    fgPct: number;
    threePct: number;
    ftPct: number;
    mpg: number;
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

const generateGameLog = (avgPts: number, avgReb: number, avgAst: number) => {
  const games = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(2026, 0, 1 + i * 2);
    games.push({
      date: d.toISOString().split("T")[0],
      pts: Math.round(avgPts + (Math.random() - 0.5) * 16),
      reb: Math.round(avgReb + (Math.random() - 0.5) * 6),
      ast: Math.round(avgAst + (Math.random() - 0.5) * 6),
      min: Math.round(32 + (Math.random() - 0.5) * 10),
    });
  }
  return games;
};

export const NBA_PLAYERS: NBAPlayer[] = [
  { id: "p1", name: "Luka Dončić", position: "PG", teamId: "t1", teamName: "LAL", age: 26, stats: { ppg: 28.4, rpg: 8.7, apg: 8.1, spg: 1.3, bpg: 0.5, fgPct: 48.2, threePct: 35.1, ftPct: 78.9, mpg: 36.2 }, gameLog: generateGameLog(28, 9, 8) },
  { id: "p2", name: "Nikola Jokić", position: "C", teamId: "t2", teamName: "DEN", age: 30, stats: { ppg: 26.1, rpg: 12.4, apg: 9.2, spg: 1.4, bpg: 0.9, fgPct: 56.8, threePct: 33.7, ftPct: 81.2, mpg: 34.8 }, gameLog: generateGameLog(26, 12, 9) },
  { id: "p3", name: "Jayson Tatum", position: "SF", teamId: "t3", teamName: "BOS", age: 27, stats: { ppg: 27.2, rpg: 8.1, apg: 4.7, spg: 1.1, bpg: 0.7, fgPct: 47.1, threePct: 37.6, ftPct: 85.3, mpg: 36.0 }, gameLog: generateGameLog(27, 8, 5) },
  { id: "p4", name: "Giannis Antetokounmpo", position: "PF", teamId: "t4", teamName: "MIL", age: 30, stats: { ppg: 31.2, rpg: 11.6, apg: 5.8, spg: 1.2, bpg: 1.5, fgPct: 55.3, threePct: 27.4, ftPct: 68.9, mpg: 35.5 }, gameLog: generateGameLog(31, 12, 6) },
  { id: "p5", name: "Shai Gilgeous-Alexander", position: "SG", teamId: "t5", teamName: "OKC", age: 26, stats: { ppg: 30.8, rpg: 5.5, apg: 6.4, spg: 2.0, bpg: 0.9, fgPct: 51.0, threePct: 35.3, ftPct: 87.4, mpg: 34.2 }, gameLog: generateGameLog(31, 6, 6) },
  { id: "p6", name: "Anthony Edwards", position: "SG", teamId: "t6", teamName: "MIN", age: 23, stats: { ppg: 26.5, rpg: 5.8, apg: 5.2, spg: 1.5, bpg: 0.6, fgPct: 46.2, threePct: 36.8, ftPct: 82.1, mpg: 35.8 }, gameLog: generateGameLog(27, 6, 5) },
  { id: "p7", name: "Kevin Durant", position: "SF", teamId: "t7", teamName: "PHX", age: 36, stats: { ppg: 27.0, rpg: 6.7, apg: 5.3, spg: 0.9, bpg: 1.4, fgPct: 52.1, threePct: 41.2, ftPct: 89.5, mpg: 34.0 }, gameLog: generateGameLog(27, 7, 5) },
  { id: "p8", name: "LeBron James", position: "SF", teamId: "t1", teamName: "LAL", age: 41, stats: { ppg: 24.8, rpg: 7.2, apg: 8.0, spg: 1.1, bpg: 0.6, fgPct: 50.1, threePct: 38.2, ftPct: 75.0, mpg: 33.5 }, gameLog: generateGameLog(25, 7, 8) },
  { id: "p9", name: "Stephen Curry", position: "PG", teamId: "t8", teamName: "GSW", age: 37, stats: { ppg: 25.2, rpg: 4.5, apg: 6.1, spg: 0.8, bpg: 0.2, fgPct: 45.8, threePct: 40.9, ftPct: 91.2, mpg: 32.0 }, gameLog: generateGameLog(25, 5, 6) },
  { id: "p10", name: "Victor Wembanyama", position: "C", teamId: "t9", teamName: "SAS", age: 21, stats: { ppg: 23.6, rpg: 10.8, apg: 3.8, spg: 1.2, bpg: 3.6, fgPct: 47.5, threePct: 33.5, ftPct: 79.8, mpg: 33.0 }, gameLog: generateGameLog(24, 11, 4) },
];

export const NBA_TEAMS: NBATeam[] = [
  { id: "t1", name: "Los Angeles Lakers", abbreviation: "LAL", conference: "Western", division: "Pacific", wins: 38, losses: 18, ppg: 115.2, oppg: 111.4, pace: 100.2 },
  { id: "t2", name: "Denver Nuggets", abbreviation: "DEN", conference: "Western", division: "Northwest", wins: 40, losses: 16, ppg: 117.8, oppg: 110.2, pace: 98.5 },
  { id: "t3", name: "Boston Celtics", abbreviation: "BOS", conference: "Eastern", division: "Atlantic", wins: 42, losses: 14, ppg: 120.1, oppg: 108.7, pace: 101.3 },
  { id: "t4", name: "Milwaukee Bucks", abbreviation: "MIL", conference: "Eastern", division: "Central", wins: 36, losses: 20, ppg: 118.5, oppg: 113.1, pace: 99.8 },
  { id: "t5", name: "Oklahoma City Thunder", abbreviation: "OKC", conference: "Western", division: "Northwest", wins: 44, losses: 12, ppg: 119.4, oppg: 106.8, pace: 100.7 },
  { id: "t6", name: "Minnesota Timberwolves", abbreviation: "MIN", conference: "Western", division: "Northwest", wins: 37, losses: 19, ppg: 112.3, oppg: 108.9, pace: 97.4 },
  { id: "t7", name: "Phoenix Suns", abbreviation: "PHX", conference: "Western", division: "Pacific", wins: 34, losses: 22, ppg: 114.6, oppg: 112.8, pace: 99.1 },
  { id: "t8", name: "Golden State Warriors", abbreviation: "GSW", conference: "Western", division: "Pacific", wins: 32, losses: 24, ppg: 113.8, oppg: 114.2, pace: 101.6 },
  { id: "t9", name: "San Antonio Spurs", abbreviation: "SAS", conference: "Western", division: "Southwest", wins: 30, losses: 26, ppg: 110.5, oppg: 112.0, pace: 99.0 },
];

// Dummy advanced metrics
export function computeImpactRating(player: NBAPlayer): number {
  const { ppg, rpg, apg, spg, bpg, fgPct } = player.stats;
  return Math.round(((ppg * 1.0 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 2.0) * (fgPct / 50)) * 10) / 10;
}

export function computeEfficiencyScore(player: NBAPlayer): number {
  const { ppg, rpg, apg, spg, bpg, fgPct, ftPct } = player.stats;
  return Math.round(((ppg + rpg + apg + spg + bpg) / player.stats.mpg * 36) * (fgPct + ftPct) / 100 * 10) / 10;
}

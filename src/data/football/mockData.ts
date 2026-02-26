export interface FootballPlayer {
  id: string;
  name: string;
  position: string;
  teamId: string;
  teamName: string;
  age: number;
  nationality: string;
  stats: {
    goals: number;
    assists: number;
    appearances: number;
    minutesPlayed: number;
    passAccuracy: number;
    tackles: number;
    interceptions: number;
    shotsOnTarget: number;
    keyPasses: number;
    dribbles: number;
  };
  matchLog: { date: string; goals: number; assists: number; mins: number; rating: number }[];
}

export interface FootballTeam {
  id: string;
  name: string;
  abbreviation: string;
  league: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  xG: number;
  xGA: number;
  possession: number;
}

const generateMatchLog = (avgGoals: number, avgAssists: number) => {
  const matches = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(2026, 0, 1 + i * 4);
    matches.push({
      date: d.toISOString().split("T")[0],
      goals: Math.random() < avgGoals / 2 ? Math.ceil(Math.random() * 2) : 0,
      assists: Math.random() < avgAssists / 2 ? Math.ceil(Math.random() * 2) : 0,
      mins: Math.round(75 + Math.random() * 15),
      rating: Math.round((6 + Math.random() * 3.5) * 10) / 10,
    });
  }
  return matches;
};

export const FOOTBALL_PLAYERS: FootballPlayer[] = [
  { id: "fp1", name: "Erling Haaland", position: "ST", teamId: "ft1", teamName: "MCI", age: 25, nationality: "Norway", stats: { goals: 22, assists: 5, appearances: 26, minutesPlayed: 2200, passAccuracy: 78, tackles: 4, interceptions: 2, shotsOnTarget: 48, keyPasses: 18, dribbles: 22 }, matchLog: generateMatchLog(0.85, 0.2) },
  { id: "fp2", name: "Kylian Mbappé", position: "LW", teamId: "ft2", teamName: "RMA", age: 27, nationality: "France", stats: { goals: 18, assists: 10, appearances: 28, minutesPlayed: 2400, passAccuracy: 83, tackles: 8, interceptions: 5, shotsOnTarget: 42, keyPasses: 45, dribbles: 62 }, matchLog: generateMatchLog(0.65, 0.35) },
  { id: "fp3", name: "Jude Bellingham", position: "CM", teamId: "ft2", teamName: "RMA", age: 22, nationality: "England", stats: { goals: 12, assists: 8, appearances: 30, minutesPlayed: 2600, passAccuracy: 89, tackles: 38, interceptions: 22, shotsOnTarget: 28, keyPasses: 52, dribbles: 34 }, matchLog: generateMatchLog(0.4, 0.27) },
  { id: "fp4", name: "Bukayo Saka", position: "RW", teamId: "ft3", teamName: "ARS", age: 24, nationality: "England", stats: { goals: 15, assists: 12, appearances: 29, minutesPlayed: 2500, passAccuracy: 85, tackles: 18, interceptions: 10, shotsOnTarget: 35, keyPasses: 58, dribbles: 48 }, matchLog: generateMatchLog(0.52, 0.41) },
  { id: "fp5", name: "Vinícius Júnior", position: "LW", teamId: "ft2", teamName: "RMA", age: 25, nationality: "Brazil", stats: { goals: 16, assists: 9, appearances: 27, minutesPlayed: 2300, passAccuracy: 80, tackles: 12, interceptions: 6, shotsOnTarget: 38, keyPasses: 40, dribbles: 78 }, matchLog: generateMatchLog(0.6, 0.33) },
  { id: "fp6", name: "Rodri", position: "CDM", teamId: "ft1", teamName: "MCI", age: 29, nationality: "Spain", stats: { goals: 4, assists: 6, appearances: 24, minutesPlayed: 2100, passAccuracy: 93, tackles: 52, interceptions: 38, shotsOnTarget: 10, keyPasses: 42, dribbles: 18 }, matchLog: generateMatchLog(0.17, 0.25) },
  { id: "fp7", name: "Mohamed Salah", position: "RW", teamId: "ft4", teamName: "LIV", age: 33, nationality: "Egypt", stats: { goals: 20, assists: 11, appearances: 28, minutesPlayed: 2350, passAccuracy: 82, tackles: 10, interceptions: 8, shotsOnTarget: 44, keyPasses: 48, dribbles: 42 }, matchLog: generateMatchLog(0.71, 0.39) },
  { id: "fp8", name: "Lamine Yamal", position: "RW", teamId: "ft5", teamName: "FCB", age: 18, nationality: "Spain", stats: { goals: 10, assists: 14, appearances: 30, minutesPlayed: 2200, passAccuracy: 86, tackles: 14, interceptions: 8, shotsOnTarget: 24, keyPasses: 62, dribbles: 56 }, matchLog: generateMatchLog(0.33, 0.47) },
];

export const FOOTBALL_TEAMS: FootballTeam[] = [
  { id: "ft1", name: "Manchester City", abbreviation: "MCI", league: "Premier League", wins: 20, draws: 4, losses: 4, goalsFor: 62, goalsAgainst: 24, xG: 58.2, xGA: 26.1, possession: 64.2 },
  { id: "ft2", name: "Real Madrid", abbreviation: "RMA", league: "La Liga", wins: 22, draws: 3, losses: 3, goalsFor: 68, goalsAgainst: 22, xG: 64.5, xGA: 25.8, possession: 59.1 },
  { id: "ft3", name: "Arsenal", abbreviation: "ARS", league: "Premier League", wins: 21, draws: 5, losses: 2, goalsFor: 58, goalsAgainst: 18, xG: 55.8, xGA: 20.4, possession: 61.5 },
  { id: "ft4", name: "Liverpool", abbreviation: "LIV", league: "Premier League", wins: 19, draws: 4, losses: 5, goalsFor: 60, goalsAgainst: 28, xG: 56.4, xGA: 30.2, possession: 58.8 },
  { id: "ft5", name: "FC Barcelona", abbreviation: "FCB", league: "La Liga", wins: 20, draws: 4, losses: 4, goalsFor: 64, goalsAgainst: 26, xG: 60.1, xGA: 28.5, possession: 62.3 },
];

// ─── Football Advanced Metrics ───

export interface FootballAdvancedMetrics {
  xgContribution: number;
  pressingImpact: number;
  buildUpValue: number;
  defensiveActions: number;
  goalInvolvement: number;
  progressivePassing: number;
  xT: number;
  possessionValue: number;
  finalThird: number;
  defensiveCoverage: number;
}

export function computeFootballAdvanced(p: FootballPlayer): FootballAdvancedMetrics {
  const per90 = (v: number) => Math.round(v / (p.stats.minutesPlayed / 90) * 10) / 10;
  return {
    xgContribution: Math.round((p.stats.goals * 0.8 + p.stats.shotsOnTarget * 0.15 + p.stats.keyPasses * 0.05) * 10) / 10,
    pressingImpact: Math.round((p.stats.tackles * 0.6 + p.stats.interceptions * 0.4) / (p.stats.minutesPlayed / 90) * 10) / 10,
    buildUpValue: Math.round((p.stats.keyPasses * 0.4 + p.stats.passAccuracy * 0.3 + p.stats.dribbles * 0.3) * 0.5 * 10) / 10,
    defensiveActions: per90(p.stats.tackles + p.stats.interceptions),
    goalInvolvement: per90(p.stats.goals + p.stats.assists),
    progressivePassing: Math.round(p.stats.keyPasses * (p.stats.passAccuracy / 100) * 1.2 * 10) / 10,
    xT: Math.round((p.stats.dribbles * 0.02 + p.stats.keyPasses * 0.04 + p.stats.goals * 0.1) * 10) / 10,
    possessionValue: Math.round((p.stats.passAccuracy * 0.4 + p.stats.keyPasses * 0.3 + p.stats.dribbles * 0.3) * 0.3 * 10) / 10,
    finalThird: Math.round((p.stats.shotsOnTarget + p.stats.keyPasses * 0.5 + p.stats.goals * 2) / (p.stats.appearances || 1) * 10) / 10,
    defensiveCoverage: Math.round((p.stats.tackles * 1.5 + p.stats.interceptions * 2.0) / (p.stats.minutesPlayed / 90) * 10) / 10,
  };
}

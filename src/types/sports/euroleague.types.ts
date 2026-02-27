import type { BasePlayer, BaseTeam } from "./base";

// Placeholder types for future Euroleague integration
export interface EuroleaguePlayer extends BasePlayer {
  sport: "euroleague";
  teamName: string;
  age: number;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
  };
}

export interface EuroleagueTeam extends BaseTeam {
  sport: "euroleague";
  conference: string;
  wins: number;
  losses: number;
}

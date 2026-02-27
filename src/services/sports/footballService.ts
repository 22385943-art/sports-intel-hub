import type { SportService } from "@/types/sports/base";
import type { FootballPlayer, FootballTeam } from "@/data/football/mockData";
import {
  FOOTBALL_PLAYERS,
  FOOTBALL_TEAMS,
  computeFootballAdvanced,
} from "@/data/football/mockData";

class FootballService implements SportService<FootballPlayer, FootballTeam> {
  sport = "football";

  getAllPlayers(): FootballPlayer[] {
    return FOOTBALL_PLAYERS;
  }

  getPlayerById(id: string): FootballPlayer | undefined {
    return FOOTBALL_PLAYERS.find((p) => p.id === id);
  }

  getPlayersByTeam(teamId: string): FootballPlayer[] {
    return FOOTBALL_PLAYERS.filter((p) => p.teamId === teamId);
  }

  getAllTeams(): FootballTeam[] {
    return FOOTBALL_TEAMS;
  }

  getTeamById(id: string): FootballTeam | undefined {
    return FOOTBALL_TEAMS.find((t) => t.id === id);
  }

  computeAdvanced = computeFootballAdvanced;
}

export const footballService = new FootballService();

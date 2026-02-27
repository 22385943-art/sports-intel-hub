import type { SportService } from "@/types/sports/base";
import type { EuroleaguePlayer, EuroleagueTeam } from "@/types/sports/euroleague.types";

class EuroleagueService implements SportService<EuroleaguePlayer, EuroleagueTeam> {
  sport = "euroleague";

  getAllPlayers(): EuroleaguePlayer[] {
    return [];
  }

  getPlayerById(_id: string): EuroleaguePlayer | undefined {
    return undefined;
  }

  getPlayersByTeam(_teamId: string): EuroleaguePlayer[] {
    return [];
  }

  getAllTeams(): EuroleagueTeam[] {
    return [];
  }

  getTeamById(_id: string): EuroleagueTeam | undefined {
    return undefined;
  }
}

export const euroleagueService = new EuroleagueService();

import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import {
  NBA_PLAYERS,
  NBA_TEAMS,
  computeGIR,
  computePVA,
  computeDDI,
  computeCPS,
  computeEOE,
  computeSQI,
  computeLSR,
  computeUAP,
  computeAllAdvanced,
  computeTeamMetrics,
} from "@/data/nba/mockData";

class NBAService implements SportService<NBAPlayer, NBATeam> {
  sport = "nba";

  getAllPlayers(): NBAPlayer[] {
    return NBA_PLAYERS;
  }

  getPlayerById(id: string): NBAPlayer | undefined {
    return NBA_PLAYERS.find((p) => p.id === id);
  }

  getPlayersByTeam(teamId: string): NBAPlayer[] {
    return NBA_PLAYERS.filter((p) => p.teamId === teamId);
  }

  getAllTeams(): NBATeam[] {
    return NBA_TEAMS;
  }

  getTeamById(id: string): NBATeam | undefined {
    return NBA_TEAMS.find((t) => t.id === id);
  }

  // Advanced metrics
  computeGIR = computeGIR;
  computePVA = computePVA;
  computeDDI = computeDDI;
  computeCPS = computeCPS;
  computeEOE = computeEOE;
  computeSQI = computeSQI;
  computeLSR = computeLSR;
  computeUAP = computeUAP;
  computeAllAdvanced = computeAllAdvanced;
  computeTeamMetrics = computeTeamMetrics;
}

export const nbaService = new NBAService();

import type { SportService } from "@/types/sports/base";
import type { UFCFighter } from "@/data/ufc/mockData";
import { UFC_FIGHTERS, computeUFCAdvanced } from "@/data/ufc/mockData";

// UFC has no teams concept — return empty arrays safely
interface NoTeam {
  id: string;
  name: string;
  abbreviation: string;
  sport: string;
}

class UFCService implements SportService<UFCFighter, NoTeam> {
  sport = "ufc";

  getAllPlayers(): UFCFighter[] {
    return UFC_FIGHTERS;
  }

  getPlayerById(id: string): UFCFighter | undefined {
    return UFC_FIGHTERS.find((f) => f.id === id);
  }

  getPlayersByTeam(_teamId: string): UFCFighter[] {
    return [];
  }

  getAllTeams(): NoTeam[] {
    return [];
  }

  getTeamById(_id: string): NoTeam | undefined {
    return undefined;
  }

  computeAdvanced = computeUFCAdvanced;
}

export const ufcService = new UFCService();

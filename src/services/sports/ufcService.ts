import type { SportService } from "@/types/sports/base";
import { UFC_FIGHTERS, UFC_WEIGHT_CLASSES, type UFCFighter, type UFCWeightClass } from "@/data/ufc/mockData";

class UFCService implements SportService<UFCFighter, UFCWeightClass> {
  sport = "ufc" as const;

  getAllPlayers(): UFCFighter[] {
    return UFC_FIGHTERS;
  }

  getPlayerById(id: string): UFCFighter | undefined {
    return UFC_FIGHTERS.find((f) => f.id === id);
  }

  // En UFC, el "Team" es la "Weight Class"
  getPlayersByTeam(weightClassId: string): UFCFighter[] {
    return UFC_FIGHTERS.filter((f) => f.teamId === weightClassId);
  }

  getAllTeams(): UFCWeightClass[] {
    return UFC_WEIGHT_CLASSES;
  }

  getTeamById(id: string): UFCWeightClass | undefined {
    return UFC_WEIGHT_CLASSES.find((w) => w.id === id);
  }

  // 🚀 Métodos específicos de UFC que usaremos más adelante
  getUpcomingEvents() {
    return [
      { id: "ufc-300", name: "UFC 300", date: "2026-04-13", location: "T-Mobile Arena, Las Vegas", mainEvent: "Pereira vs. Hill" }
    ];
  }
}

export const ufcService = new UFCService();
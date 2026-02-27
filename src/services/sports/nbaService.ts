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
  sport = "nba" as const;

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

  /**
   * AI Scouting: Encuentra jugadores con un perfil estadístico similar
   * basándose en la desviación de métricas principales (PPG, RPG, APG).
   */
  findSimilarPlayers(currentPlayer: NBAPlayer, limit = 3): (NBAPlayer & { similarityScore: number })[] {
    const allPlayers = this.getAllPlayers();
    
    return allPlayers
      .filter((p) => p.id !== currentPlayer.id)
      .map((p) => {
        // Normalización de diferencias (basado en máximos realistas de la liga)
        const ppgDiff = Math.abs(currentPlayer.stats.ppg - p.stats.ppg) / 35;
        const rpgDiff = Math.abs(currentPlayer.stats.rpg - p.stats.rpg) / 15;
        const apgDiff = Math.abs(currentPlayer.stats.apg - p.stats.apg) / 12;
        
        const averageDiff = (ppgDiff + rpgDiff + apgDiff) / 3;
        const similarity = Math.max(0, 100 - (averageDiff * 100));
        
        return { 
          ...p, 
          similarityScore: Math.round(similarity) 
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
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
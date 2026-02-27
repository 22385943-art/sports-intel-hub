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

const API_CONFIG = {
  BASE_URL: "https://api.balldontlie.io/v1",
  API_KEY: "2f741e63-39a6-438f-ae90-1cca2099127c", 
};

class NBAService implements SportService<NBAPlayer, NBATeam> {
  sport = "nba" as const;

  // FOTOS NÍTIDAS Y OPTIMIZADAS (260x190)
  getImageUrl(id: string | number): string {
    const stringId = id.toString().trim();
    if (stringId.startsWith('p') || isNaN(Number(stringId))) {
      return "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
    }
    return `https://cdn.nba.com/headshots/nba/latest/260x190/${stringId}.png`;
  }

  // LOGOS DE LA ESPN USANDO ABREVIATURA
  getTeamLogoUrl(abbreviation: string): string {
    if (!abbreviation || abbreviation === "0" || abbreviation === "FA") return "";
    return `https://a.espncdn.com/i/teamlogos/nba/500/${abbreviation.toLowerCase()}.png`;
  }

  getAllPlayers(): NBAPlayer[] {
    return NBA_PLAYERS.map(player => ({
      ...player,
      imageUrl: this.getImageUrl(player.id)
    }));
  }

  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> {
    try {
      // 1. Buscamos a los jugadores
      const pRes = await fetch(`${API_CONFIG.BASE_URL}/players?search=${query}`, {
        headers: { Authorization: API_CONFIG.API_KEY }
      });
      const pData = await pRes.json();
      if (!pData.data || pData.data.length === 0) return [];

      const players = pData.data;
      const playerIds = players.map((p: any) => p.id);

      // 2. FETCH INTELIGENTE: Intenta traer 2025. Si no hay datos tabulados aún, hace fallback a 2024.
      const statsQuery = playerIds.map((id: number) => `player_ids[]=${id}`).join('&');
      let sRes = await fetch(`${API_CONFIG.BASE_URL}/season_averages?season=2025&${statsQuery}`, {
        headers: { Authorization: API_CONFIG.API_KEY }
      });
      let sData = await sRes.json();
      
      // Fallback si la API aún no ha consolidado la temporada 2025-2026 para ese jugador
      if (!sData.data || sData.data.length === 0) {
        sRes = await fetch(`${API_CONFIG.BASE_URL}/season_averages?season=2024&${statsQuery}`, {
          headers: { Authorization: API_CONFIG.API_KEY }
        });
        sData = await sRes.json();
      }
      
      const statsMap = new Map();
      if (sData.data) {
        sData.data.forEach((s: any) => statsMap.set(s.player_id, s));
      }

      // 3. Formateamos y blindamos los datos
      return players.map((p: any) => {
        const s = statsMap.get(p.id) || {};
        const apiTeamName = p.team?.full_name || "Free Agent";
        
        // Relacionamos el equipo de la API con nuestra lista de 30 equipos para sacar la abreviatura
        const localTeam = NBA_TEAMS.find(t => t.name === apiTeamName);
        const teamAbbr = localTeam ? localTeam.abbreviation : "FA";

        const playerObject = {
          id: p.id.toString(),
          name: `${p.first_name} ${p.last_name}`,
          teamId: teamAbbr, // Usamos la abreviatura (ej: LAL, BOS) para que funcione el logo
          teamName: apiTeamName,
          position: p.position || "N/A",
          imageUrl: this.getImageUrl(p.id),
          gameLog: [], 
          stats: {
            ppg: s.pts || 0,
            rpg: s.reb || 0,
            apg: s.ast || 0,
            fgPct: Math.round((s.fg_pct || 0) * 100),
            threePct: Math.round((s.fg3_pct || 0) * 100),
            ftPct: Math.round((s.ft_pct || 0) * 100),
            spg: s.stl || 0,
            bpg: s.blk || 0,
            topg: s.turnover || 0,
            mpg: parseFloat(s.min || "0"),
            fga: s.fga || 0,
            fta: s.fta || 0
          }
        };

        return playerObject as unknown as NBAPlayer; 
      });
    } catch (error) {
      console.error("Error fetching from API:", error);
      return [];
    }
  }

  async getLivePlayers(): Promise<NBAPlayer[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.getAllPlayers()), 800); 
    });
  }

  getPlayerById(id: string): NBAPlayer | undefined {
    const player = NBA_PLAYERS.find((p) => p.id === id);
    if (player) {
      return { ...player, imageUrl: this.getImageUrl(player.id) };
    }
    return undefined;
  }

  getPlayersByTeam(teamId: string): NBAPlayer[] {
    return this.getAllPlayers().filter((p) => p.teamId === teamId);
  }

  getAllTeams(): NBATeam[] {
    return NBA_TEAMS;
  }

  getTeamById(id: string): NBATeam | undefined {
    return NBA_TEAMS.find((t) => t.id === id);
  }

  findSimilarPlayers(currentPlayer: NBAPlayer, limit = 3): (NBAPlayer & { similarityScore: number })[] {
    const allPlayers = this.getAllPlayers();
    return allPlayers
      .filter((p) => p.id !== currentPlayer.id)
      .map((p) => {
        const ppgDiff = Math.abs(currentPlayer.stats.ppg - p.stats.ppg) / 35;
        const rpgDiff = Math.abs(currentPlayer.stats.rpg - p.stats.rpg) / 15;
        const apgDiff = Math.abs(currentPlayer.stats.apg - p.stats.apg) / 12;
        const averageDiff = (ppgDiff + rpgDiff + apgDiff) / 3;
        const similarity = Math.max(0, 100 - (averageDiff * 100));
        return { ...p, similarityScore: Math.round(similarity) };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

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
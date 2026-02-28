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

  // Caché en memoria: Guardamos los 450 jugadores de la liga aquí para búsquedas instantáneas
  private playersCache: NBAPlayer[] | null = null;
  private fetchPromise: Promise<NBAPlayer[]> | null = null;

  getImageUrl(id: string | number): string {
    const stringId = id.toString().trim();
    if (stringId.startsWith('p') || isNaN(Number(stringId))) {
      return "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
    }
    return `https://cdn.nba.com/headshots/nba/latest/260x190/${stringId}.png`;
  }

  getTeamLogoUrl(abbreviation: string): string {
    if (!abbreviation || abbreviation === "0" || abbreviation === "FA") return "";
    return `https://a.espncdn.com/i/teamlogos/nba/500/${abbreviation.toLowerCase()}.png`;
  }

  // Fallback local sincronizado
  getAllPlayers(): NBAPlayer[] {
    return NBA_PLAYERS.map(player => ({
      ...player,
      imageUrl: this.getImageUrl(player.id)
    }));
  }

  /**
   * EL MOTOR OFICIAL: Se conecta al proxy de la NBA, descarga TODOS los jugadores
   * de la temporada 2025-26 en una sola petición y los cachea.
   */
  async fetchAllOfficialPlayers(): Promise<NBAPlayer[]> {
    if (this.playersCache) return this.playersCache;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = (async () => {
      try {
        console.log("Iniciando descarga masiva desde la API oficial de la NBA...");
        // Endpoint oficial que trae promedios de todos los jugadores en la 25-26
        const url = `/nba-api/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=0`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("El Proxy de la NBA fue bloqueado.");
        
        const data = await response.json();
        
        // La API de la NBA devuelve un formato complejo (headers y rowSet). Lo decodificamos:
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;

        const idIdx = headers.indexOf("PLAYER_ID");
        const nameIdx = headers.indexOf("PLAYER_NAME");
        const teamAbbrIdx = headers.indexOf("TEAM_ABBREVIATION");
        const ptsIdx = headers.indexOf("PTS");
        const rebIdx = headers.indexOf("REB");
        const astIdx = headers.indexOf("AST");
        const stlIdx = headers.indexOf("STL");
        const blkIdx = headers.indexOf("BLK");
        const fgPctIdx = headers.indexOf("FG_PCT");
        const fg3PctIdx = headers.indexOf("FG3_PCT");
        const ftPctIdx = headers.indexOf("FT_PCT");
        const minIdx = headers.indexOf("MIN");

        const parsedPlayers = rows.map((row: any[]) => {
          const abbr = row[teamAbbrIdx] || "FA";
          const teamInfo = NBA_TEAMS.find(t => t.abbreviation === abbr);
          
          return {
            id: row[idIdx].toString(),
            name: row[nameIdx],
            teamId: abbr, 
            teamName: teamInfo ? teamInfo.name : abbr,
            position: "NBA", // Leaguedash no da la posición exacta, le ponemos NBA
            imageUrl: this.getImageUrl(row[idIdx]),
            age: 25,
            gameLog: [],
            stats: {
              ppg: row[ptsIdx] || 0,
              rpg: row[rebIdx] || 0,
              apg: row[astIdx] || 0,
              spg: row[stlIdx] || 0,
              bpg: row[blkIdx] || 0,
              fgPct: Math.round((row[fgPctIdx] || 0) * 100),
              threePct: Math.round((row[fg3PctIdx] || 0) * 100),
              ftPct: Math.round((row[ftPctIdx] || 0) * 100),
              mpg: row[minIdx] || 0,
            }
          } as NBAPlayer;
        });

        console.log(`¡Éxito! ${parsedPlayers.length} jugadores de la NBA descargados.`);
        this.playersCache = parsedPlayers;
        return parsedPlayers;
      } catch (err) {
        console.error("Fallo al conectar con stats.nba.com. Usando Fallback local:", err);
        return this.getAllPlayers(); 
      }
    })();

    return this.fetchPromise;
  }

  /**
   * BUSCADOR ULTRA-RÁPIDO: Ya no llama a la red al teclear, filtra sobre la RAM.
   */
  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> {
    const allPlayers = await this.fetchAllOfficialPlayers();
    
    // Si borras el buscador, te devolvemos un top 50 de la liga para que no esté vacío
    if (!query || query.length === 0) {
      return allPlayers.slice(0, 50);
    }

    const lowerQuery = query.toLowerCase();
    
    // Filtramos instantáneamente en memoria. 
    // Puedes poner 1, 3 o 20 letras, nunca fallará ni colapsará la API.
    return allPlayers
      .filter(p => p.name.toLowerCase().includes(lowerQuery))
      .slice(0, 20); // Limitamos a 20 resultados en tabla por rendimiento visual
  }

  async getLivePlayers(): Promise<NBAPlayer[]> {
    return this.fetchAllOfficialPlayers();
  }

  getPlayerById(id: string): NBAPlayer | undefined {
    // Si lo tenemos en caché oficial, lo sacamos de ahí. Si no, del mock.
    if (this.playersCache) {
      return this.playersCache.find(p => p.id === id);
    }
    const player = NBA_PLAYERS.find((p) => p.id === id);
    if (player) return { ...player, imageUrl: this.getImageUrl(player.id) };
    return undefined;
  }

  getPlayersByTeam(teamId: string): NBAPlayer[] {
    if (this.playersCache) {
      return this.playersCache.filter(p => p.teamId === teamId);
    }
    return this.getAllPlayers().filter((p) => p.teamId === teamId);
  }

  getAllTeams(): NBATeam[] { return NBA_TEAMS; }

  getTeamById(id: string): NBATeam | undefined { return NBA_TEAMS.find((t) => t.id === id); }

  findSimilarPlayers(currentPlayer: NBAPlayer, limit = 3): (NBAPlayer & { similarityScore: number })[] {
    const source = this.playersCache || this.getAllPlayers();
    return source
      .filter((p) => p.id !== currentPlayer.id)
      .map((p) => {
        const ppgDiff = Math.abs(currentPlayer.stats.ppg - p.stats.ppg) / 35;
        const similarity = Math.max(0, 100 - (ppgDiff * 100));
        return { ...p, similarityScore: Math.round(similarity) };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  computeGIR = computeGIR; computePVA = computePVA; computeDDI = computeDDI; computeCPS = computeCPS;
  computeEOE = computeEOE; computeSQI = computeSQI; computeLSR = computeLSR; computeUAP = computeUAP;
  computeAllAdvanced = computeAllAdvanced; computeTeamMetrics = computeTeamMetrics;
}

export const nbaService = new NBAService();
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

  private playersCache: NBAPlayer[] | null = null;
  private fetchPromise: Promise<NBAPlayer[]> | null = null;
  private teamsCache: any[] | null = null;
  private fetchTeamsPromise: Promise<any[]> | null = null;

  getImageUrl(id: string | number): string {
    const stringId = id.toString().trim();
    if (stringId.startsWith('p') || isNaN(Number(stringId))) {
      return "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
    }
    return `https://cdn.nba.com/headshots/nba/latest/260x190/${stringId}.png`;
  }

  getTeamLogoUrl(abbreviation: string): string {
    if (!abbreviation || abbreviation === "0" || abbreviation === "FA") return "";
    const espnMap: Record<string, string> = {
      'UTA': 'utah', 'NOP': 'no', 'GSW': 'gs', 
      'SAS': 'sa', 'NYK': 'ny', 'WAS': 'wsh'
    };
    const cleanAbbr = abbreviation.toUpperCase();
    const finalAbbr = espnMap[cleanAbbr] || cleanAbbr.toLowerCase();
    return `https://a.espncdn.com/i/teamlogos/nba/500/${finalAbbr}.png`;
  }

  getAllPlayers(): NBAPlayer[] {
    return NBA_PLAYERS.map(player => ({ ...player, imageUrl: this.getImageUrl(player.id) }));
  }

  async fetchAllOfficialPlayers(): Promise<NBAPlayer[]> {
    if (this.playersCache) return this.playersCache;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = (async () => {
      try {
        console.log("Descargando métricas de jugadores...");
        const urlBase = `/nba-api/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=0`;
        const urlAdv = `/nba-api/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=0`;
        
        const [resBase, resAdv] = await Promise.all([fetch(urlBase), fetch(urlAdv)]);
        if (!resBase.ok || !resAdv.ok) throw new Error("Proxy bloqueado.");
        
        const dataBase = await resBase.json();
        const dataAdv = await resAdv.json();
        
        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        const headersAdv = dataAdv.resultSets[0].headers;
        const rowsAdv = dataAdv.resultSets[0].rowSet;

        const advMap = new Map();
        const idAdvIdx = headersAdv.indexOf("PLAYER_ID");
        const tsIdx = headersAdv.indexOf("TS_PCT");
        const efgIdx = headersAdv.indexOf("EFG_PCT");
        const usgIdx = headersAdv.indexOf("USG_PCT");
        const defRtgIdx = headersAdv.indexOf("DEF_RATING");

        rowsAdv.forEach((row: any[]) => {
          advMap.set(row[idAdvIdx].toString(), {
            ts: row[tsIdx] * 100, efg: row[efgIdx] * 100,
            usg: row[usgIdx] * 100, defRating: row[defRtgIdx] 
          });
        });

        const idIdx = headersBase.indexOf("PLAYER_ID");
        const nameIdx = headersBase.indexOf("PLAYER_NAME");
        const teamAbbrIdx = headersBase.indexOf("TEAM_ABBREVIATION");
        const ptsIdx = headersBase.indexOf("PTS");
        const rebIdx = headersBase.indexOf("REB");
        const astIdx = headersBase.indexOf("AST");
        const stlIdx = headersBase.indexOf("STL");
        const blkIdx = headersBase.indexOf("BLK");
        const fgPctIdx = headersBase.indexOf("FG_PCT");
        const fg3PctIdx = headersBase.indexOf("FG3_PCT");
        const ftPctIdx = headersBase.indexOf("FT_PCT");
        const minIdx = headersBase.indexOf("MIN");
        const fgaIdx = headersBase.indexOf("FGA");
        const fgmIdx = headersBase.indexOf("FGM");
        const fg3mIdx = headersBase.indexOf("FG3M");
        const ftaIdx = headersBase.indexOf("FTA");
        const tovIdx = headersBase.indexOf("TOV");

        const parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = row[idIdx].toString();
          const abbr = row[teamAbbrIdx] || "FA";
          const teamInfo = NBA_TEAMS.find(t => t.abbreviation === abbr);
          const playerAdvStats = advMap.get(playerId) || { ts: 0, efg: 0, usg: 0, defRating: 115 };
          
          return {
            id: playerId, name: row[nameIdx], teamId: abbr, 
            teamName: teamInfo ? teamInfo.name : abbr, position: "NBA",
            imageUrl: this.getImageUrl(playerId), age: 25, gameLog: [],
            stats: {
              ppg: row[ptsIdx] || 0, rpg: row[rebIdx] || 0, apg: row[astIdx] || 0,
              spg: row[stlIdx] || 0, bpg: row[blkIdx] || 0,
              fgPct: Math.round((row[fgPctIdx] || 0) * 100),
              threePct: Math.round((row[fg3PctIdx] || 0) * 100),
              ftPct: Math.round((row[ftPctIdx] || 0) * 100),
              mpg: row[minIdx] || 0, fga: row[fgaIdx] || 0, fgm: row[fgmIdx] || 0,
              fg3m: row[fg3mIdx] || 0, fta: row[ftaIdx] || 0, topg: row[tovIdx] || 0,
              ts: playerAdvStats.ts, efg: playerAdvStats.efg,
              usg: playerAdvStats.usg, defRating: playerAdvStats.defRating
            }
          } as unknown as NBAPlayer;
        });
        this.playersCache = parsedPlayers;
        return parsedPlayers;
      } catch (err) { return this.getAllPlayers(); }
    })();
    return this.fetchPromise;
  }

  // 🚀 MOTOR DE EQUIPOS ACTUALIZADO CON NUEVAS MÉTRICAS
  async fetchAllOfficialTeams(): Promise<any[]> {
    if (this.teamsCache) return this.teamsCache;
    if (this.fetchTeamsPromise) return this.fetchTeamsPromise;

    this.fetchTeamsPromise = (async () => {
      try {
        console.log("Descargando métricas de equipos...");
        const paramsBase = "Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=";
        const paramsAdv = paramsBase.replace("MeasureType=Base", "MeasureType=Advanced");

        const urlBase = `/nba-api/leaguedashteamstats?${paramsBase}`;
        const urlAdv = `/nba-api/leaguedashteamstats?${paramsAdv}`;

        const [resBase, resAdv] = await Promise.all([fetch(urlBase), fetch(urlAdv)]);
        if (!resBase.ok || !resAdv.ok) throw new Error("Proxy bloqueado.");

        const dataBase = await resBase.json();
        const dataAdv = await resAdv.json();

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        const headersAdv = dataAdv.resultSets[0].headers;
        const rowsAdv = dataAdv.resultSets[0].rowSet;

        const advMap = new Map();
        const advTeamIdIdx = headersAdv.indexOf("TEAM_ID");
        const offRtgIdx = headersAdv.indexOf("OFF_RATING");
        const defRtgIdx = headersAdv.indexOf("DEF_RATING");
        const netRtgIdx = headersAdv.indexOf("NET_RATING");
        const paceIdx = headersAdv.indexOf("PACE");
        // NUEVAS MÉTRICAS EXTRAÍDAS DE LA API AVANZADA
        const tsPctIdx = headersAdv.indexOf("TS_PCT");
        const astToIdx = headersAdv.indexOf("AST_TO");
        const rebPctIdx = headersAdv.indexOf("REB_PCT");

        rowsAdv.forEach((row: any[]) => {
          advMap.set(row[advTeamIdIdx].toString(), {
            offRtg: row[offRtgIdx], defRtg: row[defRtgIdx],
            netRtg: row[netRtgIdx], pace: row[paceIdx],
            tsPct: row[tsPctIdx] * 100,
            astTo: row[astToIdx],
            rebPct: row[rebPctIdx] * 100
          });
        });

        const teamIdIdx = headersBase.indexOf("TEAM_ID");
        const teamNameIdx = headersBase.indexOf("TEAM_NAME");
        const wIdx = headersBase.indexOf("W");
        const lIdx = headersBase.indexOf("L");
        const ptsIdx = headersBase.indexOf("PTS");

        const parsedTeams = rowsBase.map((row: any[]) => {
          const tId = row[teamIdIdx].toString();
          const name = row[teamNameIdx];
          
          const mascot = name.split(' ').pop() || "";
          const staticTeam = NBA_TEAMS.find(t => 
            t.name === name || 
            t.name.includes(mascot) ||
            (name === "LA Clippers" && t.abbreviation === "LAC")
          );

          const advStats = advMap.get(tId) || {};

          return {
            id: staticTeam?.abbreviation || tId, 
            name: name,
            abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: row[wIdx] || 0,
            losses: row[lIdx] || 0,
            ppg: row[ptsIdx] || 0,
            pace: advStats.pace || 0,
            offRtg: advStats.offRtg || 0,
            defRtg: advStats.defRtg || 0,
            netRtg: advStats.netRtg || 0,
            // PASAMOS LAS NUEVAS MÉTRICAS
            tsPct: advStats.tsPct || 0,
            astTo: advStats.astTo || 0,
            rebPct: advStats.rebPct || 0,
          };
        });

        console.log("¡Equipos descargados correctamente!");
        this.teamsCache = parsedTeams;
        return parsedTeams;
      } catch (err) { 
        console.error("Error API Teams, activando fallback local:", err);
        return NBA_TEAMS.map(t => ({
          ...t,
          offRtg: (t.ppg / t.pace) * 100, defRtg: (t.oppg / t.pace) * 100, netRtg: ((t.ppg - t.oppg) / t.pace) * 100,
          tsPct: 55, astTo: 1.5, rebPct: 50 // Valores seguros si falla la red
        }));
      }
    })();

    return this.fetchTeamsPromise;
  }

  async getPlayerGameLog(playerId: string): Promise<any[]> {
    try {
      if (playerId.startsWith('p') || isNaN(Number(playerId))) return [];
      const url = `/nba-api/playergamelog?PlayerID=${playerId}&Season=2025-26&SeasonType=Regular%20Season`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fallo.");
      const data = await response.json();
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;
      const dateIdx = headers.indexOf("GAME_DATE");
      const ptsIdx = headers.indexOf("PTS");
      const rebIdx = headers.indexOf("REB");
      const astIdx = headers.indexOf("AST");
      const minIdx = headers.indexOf("MIN");

      return rows.slice(0, 10).reverse().map((row: any[]) => ({
        date: row[dateIdx], pts: row[ptsIdx] || 0, reb: row[rebIdx] || 0,
        ast: row[astIdx] || 0, min: row[minIdx] || 0
      }));
    } catch (error) { return []; }
  }

  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> {
    const allPlayers = await this.fetchAllOfficialPlayers();
    if (!query || query.length === 0) return allPlayers.slice(0, 50);
    return allPlayers.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
  }

  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers(); }
  
  getPlayerById(id: string): NBAPlayer | undefined {
    if (this.playersCache) return this.playersCache.find(p => p.id === id);
    const player = NBA_PLAYERS.find((p) => p.id === id);
    if (player) return { ...player, imageUrl: this.getImageUrl(player.id) };
    return undefined;
  }
  
  getPlayersByTeam(teamId: string): NBAPlayer[] {
    if (this.playersCache) return this.playersCache.filter(p => p.teamId === teamId);
    return this.getAllPlayers().filter((p) => p.teamId === teamId);
  }

  getAllTeams(): NBATeam[] { return NBA_TEAMS; }
  getTeamById(id: string): NBATeam | undefined { return NBA_TEAMS.find((t) => t.id === id); }
  findSimilarPlayers() { return []; }

  computeGIR = computeGIR; computePVA = computePVA; computeDDI = computeDDI; computeCPS = computeCPS;
  computeEOE = computeEOE; computeSQI = computeSQI; computeLSR = computeLSR; computeUAP = computeUAP;
  computeAllAdvanced = computeAllAdvanced; computeTeamMetrics = computeTeamMetrics;
}
export const nbaService = new NBAService();
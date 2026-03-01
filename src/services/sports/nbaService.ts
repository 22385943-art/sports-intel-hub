import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import {
  NBA_PLAYERS,
  NBA_TEAMS,
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
        const pieIdx = headersAdv.indexOf("PIE");
        const netRtgIdx = headersAdv.indexOf("NET_RATING");
        const astPctIdx = headersAdv.indexOf("AST_PCT");

        rowsAdv.forEach((row: any[]) => {
          advMap.set(row[idAdvIdx].toString(), {
            ts: row[tsIdx] * 100, efg: row[efgIdx] * 100,
            usg: row[usgIdx] * 100, defRating: row[defRtgIdx],
            pie: row[pieIdx] * 100, netRtg: row[netRtgIdx], astPct: row[astPctIdx] * 100
          });
        });

        const idIdx = headersBase.indexOf("PLAYER_ID");
        const nameIdx = headersBase.indexOf("PLAYER_NAME");
        const teamAbbrIdx = headersBase.indexOf("TEAM_ABBREVIATION");
        const gpIdx = headersBase.indexOf("GP");
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
        const ftaIdx = headersBase.indexOf("FTA");
        const tovIdx = headersBase.indexOf("TOV");

        const parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = row[idIdx].toString();
          const abbr = row[teamAbbrIdx] || "FA";
          const teamInfo = NBA_TEAMS.find(t => t.abbreviation === abbr);
          const playerAdvStats = advMap.get(playerId) || { ts: 0, efg: 0, usg: 0, defRating: 115, pie: 0, netRtg: 0, astPct: 0 };
          
          return {
            id: playerId, name: row[nameIdx], teamId: abbr, 
            teamName: teamInfo ? teamInfo.name : abbr, position: "NBA",
            imageUrl: this.getImageUrl(playerId), age: 25, gameLog: [],
            stats: {
              gp: row[gpIdx] || 0,
              ppg: row[ptsIdx] || 0, rpg: row[rebIdx] || 0, apg: row[astIdx] || 0,
              spg: row[stlIdx] || 0, bpg: row[blkIdx] || 0,
              fgPct: Math.round((row[fgPctIdx] || 0) * 100),
              threePct: Math.round((row[fg3PctIdx] || 0) * 100),
              ftPct: Math.round((row[ftPctIdx] || 0) * 100),
              mpg: row[minIdx] || 0, fga: row[fgaIdx] || 0, fgm: row[fgmIdx] || 0,
              fta: row[ftaIdx] || 0, topg: row[tovIdx] || 0,
              ts: playerAdvStats.ts, efg: playerAdvStats.efg,
              usg: playerAdvStats.usg, defRating: playerAdvStats.defRating,
              pie: playerAdvStats.pie, netRtg: playerAdvStats.netRtg, astPct: playerAdvStats.astPct
            }
          } as unknown as NBAPlayer;
        });
        this.playersCache = parsedPlayers;
        return parsedPlayers;
      } catch (err) { return this.getAllPlayers(); }
    })();
    return this.fetchPromise;
  }

  computeAllAdvanced(player: NBAPlayer) {
    const s = player.stats as any;
    const min = s.mpg || 1; 
    
    const missedFG = s.fga - s.fgm;
    const missedFT = s.fta - (s.fta * (s.ftPct / 100));
    
    const perBase = s.ppg + s.rpg + s.apg + s.spg + s.bpg - missedFG - missedFT - s.topg;
    const per = perBase * (30 / min); 
    
    const base_efficiency = s.ppg + s.rpg + s.apg + (s.spg * 2) + (s.bpg * 2) - missedFG - missedFT - (s.topg * 2);
    let bpm = (base_efficiency / 2.5) - 6;
    if (bpm < -10) bpm = -10; 
    
    let vorp = (bpm + 2.0) * (min / 48) * 0.8; 
    if (vorp < -2) vorp = -2;

    return {
      per: Math.max(0, Math.round(per * 10) / 10),
      bpm: Math.round(bpm * 10) / 10,
      vorp: Math.round(vorp * 10) / 10,
      pie: Math.round((s.pie || 0) * 10) / 10,
      net: Math.round((s.netRtg || 0) * 10) / 10,
      usg: Math.round((s.usg || 0) * 10) / 10,
      ts: Math.round((s.ts || 0) * 10) / 10,
      ast: Math.round((s.astPct || 0) * 10) / 10,
      efg: Math.round((s.efg || 0) * 10) / 10, 
    };
  }

  async fetchAllOfficialTeams(): Promise<any[]> {
    if (this.teamsCache) return this.teamsCache;
    if (this.fetchTeamsPromise) return this.fetchTeamsPromise;

    this.fetchTeamsPromise = (async () => {
      try {
        const paramsBase = "Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=";
        const paramsAdv = paramsBase.replace("MeasureType=Base", "MeasureType=Advanced");
        const [resBase, resAdv] = await Promise.all([fetch(`/nba-api/leaguedashteamstats?${paramsBase}`), fetch(`/nba-api/leaguedashteamstats?${paramsAdv}`)]);
        if (!resBase.ok || !resAdv.ok) throw new Error("Proxy bloqueado.");

        const dataBase = await resBase.json();
        const dataAdv = await resAdv.json();
        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        const headersAdv = dataAdv.resultSets[0].headers;
        const rowsAdv = dataAdv.resultSets[0].rowSet;

        const advMap = new Map();
        rowsAdv.forEach((row: any[]) => {
          advMap.set(row[headersAdv.indexOf("TEAM_ID")].toString(), {
            offRtg: row[headersAdv.indexOf("OFF_RATING")], defRtg: row[headersAdv.indexOf("DEF_RATING")],
            netRtg: row[headersAdv.indexOf("NET_RATING")], pace: row[headersAdv.indexOf("PACE")],
            tsPct: row[headersAdv.indexOf("TS_PCT")] * 100, astTo: row[headersAdv.indexOf("AST_TO")],
            rebPct: row[headersAdv.indexOf("REB_PCT")] * 100
          });
        });

        const parsedTeams = rowsBase.map((row: any[]) => {
          const tId = row[headersBase.indexOf("TEAM_ID")].toString();
          const name = row[headersBase.indexOf("TEAM_NAME")];
          const mascot = name.split(' ').pop() || "";
          const staticTeam = NBA_TEAMS.find(t => t.name === name || t.name.includes(mascot) || (name === "LA Clippers" && t.abbreviation === "LAC"));
          const advStats = advMap.get(tId) || {};

          return {
            id: staticTeam?.abbreviation || tId, name: name,
            abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: row[headersBase.indexOf("W")] || 0, losses: row[headersBase.indexOf("L")] || 0,
            ppg: row[headersBase.indexOf("PTS")] || 0,
            pace: advStats.pace || 0, offRtg: advStats.offRtg || 0, defRtg: advStats.defRtg || 0,
            netRtg: advStats.netRtg || 0, tsPct: advStats.tsPct || 0, astTo: advStats.astTo || 0, rebPct: advStats.rebPct || 0,
          };
        });
        this.teamsCache = parsedTeams;
        return parsedTeams;
      } catch (err) { 
        return NBA_TEAMS.map(t => ({ ...t, offRtg: 0, defRtg: 0, netRtg: 0, tsPct: 0, astTo: 0, rebPct: 0 }));
      }
    })();
    return this.fetchTeamsPromise;
  }

  async getPlayerGameLog(playerId: string): Promise<any[]> {
    try {
      if (playerId.startsWith('p') || isNaN(Number(playerId))) return [];
      const response = await fetch(`/nba-api/playergamelog?PlayerID=${playerId}&Season=2025-26&SeasonType=Regular%20Season`);
      if (!response.ok) throw new Error("Fallo.");
      const data = await response.json();
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;
      return rows.slice(0, 10).reverse().map((row: any[]) => ({
        date: row[headers.indexOf("GAME_DATE")], pts: row[headers.indexOf("PTS")] || 0, 
        reb: row[headers.indexOf("REB")] || 0, ast: row[headers.indexOf("AST")] || 0, min: row[headers.indexOf("MIN")] || 0
      }));
    } catch (error) { return []; }
  }

  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers(); }
  getPlayerById(id: string): NBAPlayer | undefined { return undefined; }
  getPlayersByTeam(teamId: string): NBAPlayer[] { return []; }
  getAllTeams(): NBATeam[] { return NBA_TEAMS; }
  getTeamById(id: string): NBATeam | undefined { return NBA_TEAMS.find((t) => t.id === id); }
  findSimilarPlayers() { return []; }
  
  // 🚀 RETORNAMOS LAS FUNCIONES DE COMPATIBILIDAD PARA QUE NO EXPLOTE EL DASHBOARD
  computeGIR(p:any){ return p.stats?.ppg || 0; } 
  computePVA(p:any){ return p.stats?.apg || 0; } 
  computeDDI(p:any){ return p.stats?.spg || 0; } 
  computeCPS(p:any){ return p.stats?.rpg || 0; }
  computeEOE(p:any){ return p.stats?.bpg || 0; } 
  computeSQI(p:any){ return p.stats?.ppg || 0; } 
  computeLSR(p:any){ return p.stats?.ppg || 0; } 
  computeUAP(p:any){ return p.stats?.ppg || 0; }

  computeTeamMetrics = computeTeamMetrics;
}
export const nbaService = new NBAService();
import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import { NBA_PLAYERS, NBA_TEAMS, computeTeamMetrics } from "@/data/nba/mockData";

// 🚀 FUNCIÓN ANTI-CUELGUES: Corta la conexión si la NBA no responde en 3 segundos
const fetchWithTimeout = async (url: string, timeout = 3000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

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
    const espnMap: Record<string, string> = { 'UTA': 'utah', 'NOP': 'no', 'GSW': 'gs', 'SAS': 'sa', 'NYK': 'ny', 'WAS': 'wsh' };
    const cleanAbbr = abbreviation.toUpperCase();
    const finalAbbr = espnMap[cleanAbbr] || cleanAbbr.toLowerCase();
    return `https://a.espncdn.com/i/teamlogos/nba/500/${finalAbbr}.png`;
  }

  getAllPlayers(): NBAPlayer[] {
    return NBA_PLAYERS.map(player => {
      const basePlayer = { ...player, imageUrl: this.getImageUrl(player.id) };
      const adv = this.computeAllAdvanced(basePlayer as NBAPlayer);
      return { ...basePlayer, adv } as any;
    });
  }

  async fetchAllOfficialPlayers(): Promise<NBAPlayer[]> {
    if (this.playersCache) return this.playersCache;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = (async () => {
      try {
        const urlBase = `/nba-api/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=0`;
        const urlAdv = `/nba-api/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=0`;
        
        // 🚀 Usamos el timeout aquí para que no se quede colgado
        const [resBase, resAdv] = await Promise.all([fetchWithTimeout(urlBase), fetchWithTimeout(urlAdv)]);
        if (!resBase.ok || !resAdv.ok) throw new Error("Proxy bloqueado.");
        
        const dataBase = await resBase.json();
        const dataAdv = await resAdv.json();
        
        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        const headersAdv = dataAdv.resultSets[0].headers;
        const rowsAdv = dataAdv.resultSets[0].rowSet;

        const advMap = new Map();
        rowsAdv.forEach((row: any[]) => {
          advMap.set(row[headersAdv.indexOf("PLAYER_ID")].toString(), {
            ts: row[headersAdv.indexOf("TS_PCT")] * 100 || 0,
            efg: row[headersAdv.indexOf("EFG_PCT")] * 100 || 0,
            usg: row[headersAdv.indexOf("USG_PCT")] * 100 || 0,
            defRating: row[headersAdv.indexOf("DEF_RATING")] || 115,
            pie: row[headersAdv.indexOf("PIE")] * 100 || 0,
            netRtg: row[headersAdv.indexOf("NET_RATING")] || 0,
            astPct: row[headersAdv.indexOf("AST_PCT")] * 100 || 0
          });
        });

        const parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = row[headersBase.indexOf("PLAYER_ID")].toString();
          const abbr = row[headersBase.indexOf("TEAM_ABBREVIATION")] || "FA";
          const playerAdvStats = advMap.get(playerId) || { ts: 0, efg: 0, usg: 0, defRating: 115, pie: 0, netRtg: 0, astPct: 0 };
          
          const p = {
            id: playerId, name: row[headersBase.indexOf("PLAYER_NAME")], teamId: abbr, 
            position: "NBA", imageUrl: this.getImageUrl(playerId), age: 25,
            stats: {
              gp: row[headersBase.indexOf("GP")] || 0,
              ppg: row[headersBase.indexOf("PTS")] || 0, rpg: row[headersBase.indexOf("REB")] || 0, apg: row[headersBase.indexOf("AST")] || 0,
              spg: row[headersBase.indexOf("STL")] || 0, bpg: row[headersBase.indexOf("BLK")] || 0,
              fgPct: Math.round((row[headersBase.indexOf("FG_PCT")] || 0) * 100),
              threePct: Math.round((row[headersBase.indexOf("FG3_PCT")] || 0) * 100),
              ftPct: Math.round((row[headersBase.indexOf("FT_PCT")] || 0) * 100),
              mpg: row[headersBase.indexOf("MIN")] || 0, fga: row[headersBase.indexOf("FGA")] || 0, fgm: row[headersBase.indexOf("FGM")] || 0,
              fta: row[headersBase.indexOf("FTA")] || 0, topg: row[headersBase.indexOf("TOV")] || 0,
              ts: playerAdvStats.ts, efg: playerAdvStats.efg,
              usg: playerAdvStats.usg, defRating: playerAdvStats.defRating,
              pie: playerAdvStats.pie, netRtg: playerAdvStats.netRtg, astPct: playerAdvStats.astPct
            }
          };
          return { ...p, adv: this.computeAllAdvanced(p as any) } as unknown as NBAPlayer;
        });
        this.playersCache = parsedPlayers;
        return parsedPlayers;
      } catch (err) { 
        return this.getAllPlayers(); // 🛡️ Si falla o tarda más de 3s, salta directo a tus Mocks
      }
    })();
    return this.fetchPromise;
  }

  computeAllAdvanced(player: any) {
    const s = player.stats || {};
    const min = s.mpg || 1; 
    const missedFG = (s.fga || 0) - (s.fgm || 0);
    const missedFT = (s.fta || 0) - ((s.fta || 0) * ((s.ftPct || 0) / 100));
    const perBase = (s.ppg || 0) + (s.rpg || 0) + (s.apg || 0) + (s.spg || 0) + (s.bpg || 0) - missedFG - missedFT - (s.topg || 0);
    const per = perBase * (30 / min); 
    const base_efficiency = (s.ppg || 0) + (s.rpg || 0) + (s.apg || 0) + ((s.spg || 0) * 2) + ((s.bpg || 0) * 2) - missedFG - missedFT - ((s.topg || 0) * 2);
    let bpm = (base_efficiency / 2.5) - 6;
    if (bpm < -10) bpm = -10; 
    
    let vorp = (bpm + 2.0) * (min / 48) * 0.8; 
    if (vorp < -2) vorp = -2;

    const siPlus = 100 + (bpm * 4.5) + ((per - 15) * 1.5) + (((s.ts || 55) - 57) * 0.5);

    return {
      per: Math.max(0, Math.round(per * 10) / 10) || 0,
      bpm: Math.round(bpm * 10) / 10 || 0,
      vorp: Math.round(vorp * 10) / 10 || 0,
      pie: Math.round((s.pie || 0) * 10) / 10 || 0,
      net: Math.round((s.netRtg || 0) * 10) / 10 || 0,
      usg: Math.round((s.usg || 0) * 10) / 10 || 0,
      ts: Math.round((s.ts || 0) * 10) / 10 || 0,
      ast: Math.round((s.astPct || 0) * 10) / 10 || 0,
      efg: Math.round((s.efg || 0) * 10) / 10 || 0,
      si: Math.round(siPlus) || 100, 
    };
  }

  async fetchAllOfficialTeams(): Promise<any[]> {
    if (this.teamsCache) return this.teamsCache;
    if (this.fetchTeamsPromise) return this.fetchTeamsPromise;

    this.fetchTeamsPromise = (async () => {
      try {
        const paramsBase = "Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=";
        const paramsAdv = paramsBase.replace("MeasureType=Base", "MeasureType=Advanced");
        const [resBase, resAdv] = await Promise.all([fetchWithTimeout(`/nba-api/leaguedashteamstats?${paramsBase}`), fetchWithTimeout(`/nba-api/leaguedashteamstats?${paramsAdv}`)]);
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
          const staticTeam = NBA_TEAMS.find(t => t.name === name || t.name.includes(mascot));
          const advStats = advMap.get(tId) || {};

          return {
            id: tId, name: name, abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
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
        return NBA_TEAMS.map(t => ({ ...t, id: t.id, offRtg: 0, defRtg: 0, netRtg: 0, tsPct: 0, astTo: 0, rebPct: 0 }));
      }
    })();
    return this.fetchTeamsPromise;
  }

  async getTeamRosterAndCoaches(teamId: string): Promise<any> {
    try {
      const url = `/nba-api/commonteamroster?LeagueID=00&Season=2025-26&TeamID=${teamId}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error("Roster Fetch Failed");
      const data = await response.json();
      
      const rosterSet = data.resultSets.find((r: any) => r.name === 'CommonTeamRoster');
      const coachSet = data.resultSets.find((r: any) => r.name === 'Coaches');
      
      const parseSet = (set: any) => set.rowSet.map((row: any[]) => {
        const obj: any = {};
        set.headers.forEach((h: string, i: number) => obj[h] = row[i]);
        return obj;
      });

      return {
        players: rosterSet ? parseSet(rosterSet) : [],
        coaches: coachSet ? parseSet(coachSet) : []
      };
    } catch (error) {
      return { players: [], coaches: [] };
    }
  }

  async getTeamLineups(teamId: string): Promise<any[]> {
    try {
      const url = `/nba-api/teamdashlineups?DateFrom=&DateTo=&GameID=&GameSegment=&GroupQuantity=5&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&TeamID=${teamId}&VsConference=&VsDivision=`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error("Lineup Fetch Failed");
      
      const data = await response.json();
      const headers = data.resultSets[1].headers;
      const rows = data.resultSets[1].rowSet;

      return rows.slice(0, 5).map((row: any[]) => ({
        groupId: row[headers.indexOf("GROUP_ID")], groupName: row[headers.indexOf("GROUP_NAME")],
        mins: row[headers.indexOf("MIN")], offRtg: row[headers.indexOf("OFF_RATING")],
        defRtg: row[headers.indexOf("DEF_RATING")], netRtg: row[headers.indexOf("NET_RATING")],
        tsPct: row[headers.indexOf("TS_PCT")] * 100, astPct: row[headers.indexOf("AST_PCT")] * 100,
        rebPct: row[headers.indexOf("REB_PCT")] * 100,
      }));
    } catch (error) { return []; }
  }

  async getTeamDetails(teamId: string): Promise<any> {
    try {
      const url = `/nba-api/teamdetails?TeamID=${teamId}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error("Details Fetch Failed");
      
      const data = await response.json();
      const getSet = (name: string) => data.resultSets.find((s: any) => s.name === name);
      
      const bgSet = getSet("TeamBackground");
      const awardsSet = getSet("TeamAwards");
      const leadersSet = getSet("FranchiseLeaders");
      const retiredSet = getSet("RetiredMembers");

      const bg = bgSet?.rowSet[0] || [];
      const bgH = bgSet?.headers || [];

      const rings = awardsSet?.rowSet.filter((row: any[]) => String(row[3]).includes("Champion")).map((row: any[]) => row[4]) || [];
      const confTitles = awardsSet?.rowSet.filter((row: any[]) => String(row[3]).includes("Conference")).map((row: any[]) => row[4]) || [];
      
      const lRows = leadersSet?.rowSet[0] || [];
      const lH = leadersSet?.headers || [];
      const formatLeader = (stat: string) => lRows[lH.indexOf(stat)] ? `${lRows[lH.indexOf(stat)]} (${lRows[lH.indexOf(`${stat}_PERSON_NAME`)]})` : "N/A";

      const leaders = {
        pts: formatLeader("PTS"), reb: formatLeader("REB"), ast: formatLeader("AST"),
        stl: formatLeader("STL"), blk: formatLeader("BLK"),
        fg: lRows[lH.indexOf("FG_PCT")] ? `${(lRows[lH.indexOf("FG_PCT")] * 100).toFixed(1)}%` : "N/A",
        fg3: lRows[lH.indexOf("FG3_PCT")] ? `${(lRows[lH.indexOf("FG3_PCT")] * 100).toFixed(1)}%` : "N/A",
        ft: lRows[lH.indexOf("FT_PCT")] ? `${(lRows[lH.indexOf("FT_PCT")] * 100).toFixed(1)}%` : "N/A",
      };

      const retired = retiredSet?.rowSet.map((row: any[]) => `${row[1]} (${row[0]})`) || [];

      return {
        frontOffice: { 
          coach: bg[bgH.indexOf("HEADCOACH")] || "Unknown", gm: bg[bgH.indexOf("GENERALMANAGER")] || "Unknown", 
          owner: bg[bgH.indexOf("OWNER")] || "Unknown", arena: bg[bgH.indexOf("ARENA")] || "Unknown", 
          capacity: bg[bgH.indexOf("ARENACAPACITY")] || "Unknown", yearFounded: bg[bgH.indexOf("YEARFOUNDED")] || "Unknown" 
        },
        history: { rings, confTitles, retired, leaders }
      };
    } catch (error) { return null; }
  }

  async getPlayerGameLog(playerId: string): Promise<any[]> { return []; }
  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers(); }
  getPlayerById(id: string): NBAPlayer | undefined { return undefined; }
  getPlayersByTeam(teamId: string): NBAPlayer[] { return []; }
  getAllTeams(): NBATeam[] { return NBA_TEAMS; }
  getTeamById(id: string): NBATeam | undefined { return NBA_TEAMS.find((t) => t.id === id); }
  findSimilarPlayers() { return []; }
  
  computeGIR(p:any){ return p.stats?.ppg || 0; } 
  computePVA(p:any){ return p.stats?.apg || 0; } 
  computeDDI(p:any){ return p.stats?.spg || 0; } 
  computeCPS(p:any){ return p.stats?.rpg || 0; }
  computeEOE(p:any){ return p.stats?.bpg || 0; } 
  computeSQI(p:any){ return p.stats?.ppg || 0; } 
  computeLSR(p:any){ return p.stats?.ppg || 0; } 
  computeUAP(p:any){ return p.stats?.ppg || 0; }
  computeTeamMetrics = computeTeamMetrics;

  async fetchLiveGames(dateStr?: string): Promise<any[]> {
    try {
      if (!dateStr) {
        const d = new Date();
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      const response = await fetchWithTimeout(`/nba-api/scoreboardv3?GameDate=${dateStr}&LeagueID=00`);
      const data = await response.json();
      const settings = JSON.parse(localStorage.getItem('sports-intel-settings') || '{"timeZone":"local"}');

      const games = data?.scoreboard?.games || [];
      return games.map((g: any) => {
        const gameTime = new Date(g.gameTimeUTC);
        let timeStr = "";

        if (settings.timeZone && settings.timeZone !== 'local') {
          timeStr = gameTime.toLocaleTimeString('en-US', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit' });
        } else {
          timeStr = gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
          gameId: g.gameId, home: g.homeTeam.teamTricolor, homeId: g.homeTeam.teamId,
          away: g.awayTeam.teamTricolor, awayId: g.awayTeam.teamId,
          homeScore: g.homeTeam.score, awayScore: g.awayTeam.score,
          quarter: g.gameStatus === 1 ? timeStr : (g.gameStatus === 3 ? "FINAL" : `Q${g.period} ${g.gameClock}`),
          status: g.gameStatus === 1 ? "upcoming" : (g.gameStatus === 3 ? "final" : "live"),
          arena: g.arena?.name || "TBD", city: g.arena?.city || ""
        };
      });
    } catch (error) { return []; }
  }

  async fetchStandings(): Promise<any[]> {
    try {
      const response = await fetchWithTimeout(`/nba-api/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular%20Season`);
      const data = await response.json();
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;
      
      return rows.map((r: any[]) => ({
        teamId: r[headers.indexOf("TeamID")], name: r[headers.indexOf("TeamCity")] + " " + r[headers.indexOf("TeamName")],
        abbreviation: r[headers.indexOf("TeamSlug")], conference: r[headers.indexOf("Conference")],
        division: r[headers.indexOf("Division")], wins: r[headers.indexOf("WINS")],
        losses: r[headers.indexOf("LOSSES")], pct: r[headers.indexOf("WinPCT")],
        rank: r[headers.indexOf("PlayoffRank")], gb: r[headers.indexOf("ConferenceGamesBack")],
        home: r[headers.indexOf("HOME")] || "-", away: r[headers.indexOf("ROAD")] || "-",
        l10: r[headers.indexOf("L10")] || "-", streak: r[headers.indexOf("strCurrentStreak")] || "-",
        confRecord: r[headers.indexOf("ConferenceRecord")] || "-", divRecord: r[headers.indexOf("DivisionRecord")] || "-",
      }));
    } catch(e) { return []; }
  }

  async fetchBoxScore(gameId: string): Promise<any> {
    try {
      const response = await fetchWithTimeout(`/nba-api/boxscoretraditionalv3?GameID=${gameId}&LeagueID=00&playByPlay=false`);
      const data = await response.json();
      return data?.boxScoreTraditional || null;
    } catch (error) { return null; }
  }

  async getTeamSchedule(teamId: string): Promise<any[]> {
    try {
      const response = await fetchWithTimeout(`/nba-api/teamgamelog?DateFrom=&DateTo=&LeagueID=00&Season=2025-26&SeasonType=Regular%20Season&TeamID=${teamId}`);
      const data = await response.json();
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;

      return rows.map((r: any[]) => ({
        gameId: r[headers.indexOf("Game_ID")], date: r[headers.indexOf("GAME_DATE")],
        matchup: r[headers.indexOf("MATCHUP")], wl: r[headers.indexOf("WL")], pts: r[headers.indexOf("PTS")],
      }));
    } catch(e) { return []; }
  }
}

export const nbaService = new NBAService();
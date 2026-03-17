import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import { NBA_PLAYERS, NBA_TEAMS, computeTeamMetrics } from "@/data/nba/mockData";

const getStat = (row: any[], headers: string[], key: string): number => {
    const idx = headers.indexOf(key);
    return idx !== -1 && row[idx] !== null && row[idx] !== undefined ? Number(row[idx]) : 0;
};

const getString = (row: any[], headers: string[], key: string, fallback: string): string => {
    const idx = headers.indexOf(key);
    return idx !== -1 && row[idx] !== null && row[idx] !== undefined ? String(row[idx]) : fallback;
};

const fetchSafeJSON = async (endpoint: string) => {
    const fullUrl = `https://stats.nba.com/stats${endpoint}`;
    const proxies = [
        `/nba-api${endpoint}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`
    ];
    
    for (const proxy of proxies) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(proxy, { signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                const text = await res.text();
                if (!text.trim().startsWith('<')) return JSON.parse(text);
            }
        } catch (e) {}
    }
    throw new Error("All proxies failed for " + endpoint);
};

class NBAService implements SportService<NBAPlayer, NBATeam> {
  sport = "nba" as const;

  private playersCache: NBAPlayer[] | null = null;
  private teamsCache: any[] | null = null;
  private historicalPlayersCache: Map<string, NBAPlayer[]> = new Map();
  private fetchPromises: Map<string, Promise<NBAPlayer[]>> = new Map();
  private historicalTeamsCache: Map<string, any[]> = new Map();
  private fetchTeamsPromises: Map<string, Promise<any[]>> = new Map();

  // 🚀 BLINDAJE EXTREMO CONTRA IDs NULOS QUE ROMPIAN LA WEB
  getImageUrl(id: any): string {
    if (id === null || id === undefined) return "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
    const stringId = String(id).trim();
    if (stringId === "0" || stringId === "" || stringId.startsWith('p') || isNaN(Number(stringId))) {
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
  
  getAllTeams(): NBATeam[] { return NBA_TEAMS; }
  getPlayerById(id: string) { return this.getAllPlayers().find((p) => String(p.id) === String(id)); }
  getPlayersByTeam(teamId: string) { return this.getAllPlayers().filter((p) => p.teamId === teamId); }
  getTeamById(id: string) { return this.getAllTeams().find((t) => String(t.id) === String(id) || t.abbreviation === id); }

  private calcPercentile(val: number, arr: number[]) {
      if (!arr || arr.length === 0) return 50;
      const below = arr.filter(v => v <= val).length;
      return Math.min(100, Math.round((below / arr.length) * 100));
  }

  // 🚀 ALGORITMO OFICIAL DE LA NBA PRORRATEADO
  qualifiesForLeaderboard(player: any, metric: string, maxGP: number): boolean {
    const s = player.stats || {};
    const gp = s.gp || 0;
    const safeMaxGP = Math.max(1, maxGP);
    
    const totalFGM = (s.fgm || 0) * gp;
    const total3PM = (s.fg3m ?? s.tpm ?? 0) * gp;
    const totalFTM = (s.ftm ?? 0) * gp;

    const minFGM = (300 / 82) * safeMaxGP;
    const min3PM = (82 / 82) * safeMaxGP;
    const minFTM = (125 / 82) * safeMaxGP;

    if (['fgPct', 'ts', 'efg'].includes(metric)) return totalFGM >= minFGM;
    if (metric === 'threePct') return total3PM >= min3PM;
    if (metric === 'ftPct') return totalFTM >= minFTM;

    return true;
  }

  async fetchAllOfficialPlayers(season: string = "2025-26"): Promise<NBAPlayer[]> {
    if (this.historicalPlayersCache.has(season)) return this.historicalPlayersCache.get(season)!;
    if (this.fetchPromises.has(season)) return this.fetchPromises.get(season)!;

    const promise = (async () => {
      try {
        const urlBase = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        const urlAdv = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        const urlHustle = `/leaguehustlestatsplayer?LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0`;

        const [resBase, resAdv, resHustle] = await Promise.allSettled([
            fetchSafeJSON(urlBase), fetchSafeJSON(urlAdv), fetchSafeJSON(urlHustle)
        ]);

        if (resBase.status === 'rejected' || !resBase.value?.resultSets) throw new Error("Base API Failed");

        const dataBase = resBase.value;
        const dataAdv = resAdv.status === 'fulfilled' ? resAdv.value : null;
        const dataHustle = resHustle.status === 'fulfilled' ? resHustle.value : null;

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;

        // 🚀 FORMATEADOR DE DECIMALES PUROS DE LA API (Multiplica x100 y retiene 1 decimal real)
        const parsePct = (val: number) => {
            if (!val || isNaN(val)) return 0.0;
            const pct = val <= 1 ? val * 100 : val;
            return Number(pct.toFixed(1));
        };

        const advMap = new Map();
        if (dataAdv && dataAdv.resultSets[0].rowSet.length > 0) {
            const h = dataAdv.resultSets[0].headers;
            dataAdv.resultSets[0].rowSet.forEach((row: any[]) => {
              advMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                ts: parsePct(getStat(row, h, "TS_PCT")),
                efg: parsePct(getStat(row, h, "EFG_PCT")),
                usg: parsePct(getStat(row, h, "USG_PCT")),
                defRating: getStat(row, h, "DEF_RATING") || 115,
                pie: parsePct(getStat(row, h, "PIE")),
                netRtg: getStat(row, h, "NET_RATING"),
                astPct: parsePct(getStat(row, h, "AST_PCT")),
                astTo: getStat(row, h, "AST_TO"),
                astRatio: getStat(row, h, "AST_RATIO")
              });
            });
        }

        const hustleMap = new Map();
        if (dataHustle && dataHustle.resultSets[0].rowSet.length > 0) {
            const h = dataHustle.resultSets[0].headers;
            dataHustle.resultSets[0].rowSet.forEach((row: any[]) => {
              hustleMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                deflections: getStat(row, h, "DEFLECTIONS"),
                contestedShots: getStat(row, h, "CONTESTED_SHOTS"),
                contested3pt: getStat(row, h, "CONTESTED_SHOTS_3PT"),
                chargesDrawn: getStat(row, h, "CHARGES_DRAWN")
              });
            });
        }

        let parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = getString(row, headersBase, "PLAYER_ID", "0");
          const baseAdv = advMap.get(playerId) || {};
          const baseHustle = hustleMap.get(playerId) || { deflections: 0, contestedShots: 0, contested3pt: 0, chargesDrawn: 0 };

          const p = {
            id: playerId,
            name: getString(row, headersBase, "PLAYER_NAME", "Unknown"),
            teamId: getString(row, headersBase, "TEAM_ABBREVIATION", "FA"),
            position: "NBA", imageUrl: this.getImageUrl(playerId),
            age: getStat(row, headersBase, "AGE"),
            stats: {
              gp: getStat(row, headersBase, "GP"), mpg: getStat(row, headersBase, "MIN"),
              ppg: getStat(row, headersBase, "PTS"), rpg: getStat(row, headersBase, "REB"), apg: getStat(row, headersBase, "AST"),
              spg: getStat(row, headersBase, "STL"), bpg: getStat(row, headersBase, "BLK"), topg: getStat(row, headersBase, "TOV"),
              fga: getStat(row, headersBase, "FGA"), fgm: getStat(row, headersBase, "FGM"), 
              fgPct: parsePct(getStat(row, headersBase, "FG_PCT")),
              fg3a: getStat(row, headersBase, "FG3A"), fg3m: getStat(row, headersBase, "FG3M"), 
              threePct: parsePct(getStat(row, headersBase, "FG3_PCT")),
              fta: getStat(row, headersBase, "FTA"), ftm: getStat(row, headersBase, "FTM"), 
              ftPct: parsePct(getStat(row, headersBase, "FT_PCT")),
              ...baseAdv
            },
            hustle: baseHustle,
            playmaking: {
                astPct: baseAdv.astPct || 0,
                astTo: baseAdv.astTo || 0,
                astRatio: baseAdv.astRatio || 0
            }
          };
          return { ...p, adv: this.computeAllAdvanced(p as any) };
        });

        const allPPG = parsedPlayers.map(p => p.stats.ppg).sort((a,b)=>a-b);
        const allAPG = parsedPlayers.map(p => p.stats.apg).sort((a,b)=>a-b);
        const allRPG = parsedPlayers.map(p => p.stats.rpg).sort((a,b)=>a-b);
        const allTS = parsedPlayers.map(p => p.adv.ts).sort((a,b)=>a-b);
        const allBPM = parsedPlayers.map(p => p.adv.bpm).sort((a,b)=>a-b);
        const all3P = parsedPlayers.map(p => p.stats.threePct).sort((a,b)=>a-b);
        const allDef = parsedPlayers.map(p => (p.stats.spg || 0) + (p.stats.bpg || 0) + (p.hustle.deflections || 0)).sort((a,b)=>a-b);

        parsedPlayers = parsedPlayers.map((p: any) => ({
            ...p,
            percentiles: {
                Scoring: this.calcPercentile(p.stats.ppg, allPPG),
                Playmaking: this.calcPercentile(p.stats.apg, allAPG),
                Rebounding: this.calcPercentile(p.stats.rpg, allRPG),
                Efficiency: this.calcPercentile(p.adv.ts, allTS),
                Impact: this.calcPercentile(p.adv.bpm, allBPM),
                Shooting: this.calcPercentile(p.stats.threePct, all3P),
                Defense: this.calcPercentile((p.stats.spg || 0) + (p.stats.bpg || 0) + p.hustle.deflections, allDef)
            }
        }));

        this.historicalPlayersCache.set(season, parsedPlayers as unknown as NBAPlayer[]);
        if (season === "2025-26") this.playersCache = parsedPlayers as unknown as NBAPlayer[];

        return parsedPlayers as unknown as NBAPlayer[];
      } catch (err) {
        this.fetchPromises.delete(season);
        return season === "2025-26" ? this.getAllPlayers() : [];
      }
    })();

    this.fetchPromises.set(season, promise);
    return promise;
  }

  computeAllAdvanced(player: any) {
    const s = player.stats || {};
    const min = s.mpg || 1;
    const missedFG = (s.fga || 0) - (s.fgm || 0);
    const missedFT = (s.fta || 0) - (s.ftm || 0);
    const perBase = (s.ppg || 0) + (s.rpg || 0) + (s.apg || 0) + (s.spg || 0) + (s.bpg || 0) - missedFG - missedFT - (s.topg || 0);
    const per = perBase * (30 / min);
    const base_efficiency = (s.ppg || 0) + (s.rpg || 0) + (s.apg || 0) + ((s.spg || 0) * 2) + ((s.bpg || 0) * 2) - missedFG - missedFT - ((s.topg || 0) * 2);
    let bpm = (base_efficiency / 2.5) - 6;
    if (bpm < -10) bpm = -10;
    let vorp = (bpm + 2.0) * (min / 48) * 0.8;
    if (vorp < -2) vorp = -2;

    let finalTS = s.ts || 0;
    let finalUSG = s.usg || 0;
    const siPlus = 100 + (bpm * 4.5) + ((per - 15) * 1.5) + ((finalTS - 55) * 0.5);

    return {
      per: Math.max(0, Math.round(per * 10) / 10) || 0,
      bpm: Math.round(bpm * 10) / 10 || 0,
      vorp: Math.round(vorp * 10) / 10 || 0,
      pie: s.pie || Math.round((per / 2.5) * 10) / 10,
      net: Math.round((s.netRtg || 0) * 10) / 10 || 0,
      usg: finalUSG, ts: finalTS, efg: s.efg || 0, ast: s.astPct || 0,
      si: Math.round(siPlus) || 100,
    };
  }

  async fetchAllOfficialTeams(season: string = "2025-26"): Promise<any[]> {
    if (this.historicalTeamsCache.has(season)) return this.historicalTeamsCache.get(season)!;
    if (this.fetchTeamsPromises.has(season)) return this.fetchTeamsPromises.get(season)!;

    const promise = (async () => {
      try {
        const paramsBase = `?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
        const paramsAdv = paramsBase.replace("MeasureType=Base", "MeasureType=Advanced");
        const paramsOpp = paramsBase.replace("MeasureType=Base", "MeasureType=Opponent");
        const urlClutch = `/leaguedashteamclutch?ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&PointDiff=5&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&Sort=W_PCT&StarterBench=&TeamID=0&VsConference=&VsDivision=`;

        const [resBase, resAdv, resOpp, resClutch] = await Promise.allSettled([
            fetchSafeJSON(`/leaguedashteamstats${paramsBase}`),
            fetchSafeJSON(`/leaguedashteamstats${paramsAdv}`),
            fetchSafeJSON(`/leaguedashteamstats${paramsOpp}`),
            fetchSafeJSON(urlClutch)
        ]);

        if (resBase.status === 'rejected' || !resBase.value?.resultSets) throw new Error("Team Base API Failed");

        const dataBase = resBase.value;
        const dataAdv = resAdv.status === 'fulfilled' ? resAdv.value : null;
        const dataOpp = resOpp.status === 'fulfilled' ? resOpp.value : null;
        const dataClutch = resClutch.status === 'fulfilled' ? resClutch.value : null;

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;

        const parsePct = (val: number) => val <= 1 ? Number((val * 100).toFixed(1)) : Number(val.toFixed(1));

        const advMap = new Map();
        if (dataAdv && dataAdv.resultSets[0].rowSet.length > 0) {
            const h = dataAdv.resultSets[0].headers;
            dataAdv.resultSets[0].rowSet.forEach((row: any[]) => {
              advMap.set(String(row[h.indexOf("TEAM_ID")]), {
                offRtg: getStat(row, h, "OFF_RATING"), defRtg: getStat(row, h, "DEF_RATING"),
                netRtg: getStat(row, h, "NET_RATING"), pace: getStat(row, h, "PACE"),
                tsPct: parsePct(getStat(row, h, "TS_PCT")), 
                astTo: getStat(row, h, "AST_TO"),
                rebPct: parsePct(getStat(row, h, "REB_PCT"))
              });
            });
        }

        const oppMap = new Map();
        if (dataOpp && dataOpp.resultSets[0].rowSet.length > 0) {
            const h = dataOpp.resultSets[0].headers;
            dataOpp.resultSets[0].rowSet.forEach((row: any[]) => {
              oppMap.set(String(row[h.indexOf("TEAM_ID")]), {
                oppFgPct: parsePct(getStat(row, h, "OPP_FG_PCT")),
                opp3ptPct: parsePct(getStat(row, h, "OPP_FG3_PCT")),
                oppPtsOffTov: getStat(row, h, "OPP_PTS_OFF_TOV")
              });
            });
        }

        const clutchMap = new Map();
        if (dataClutch && dataClutch.resultSets[0].rowSet.length > 0) {
            const h = dataClutch.resultSets[0].headers;
            dataClutch.resultSets[0].rowSet.forEach((row: any[]) => {
              clutchMap.set(String(row[h.indexOf("TEAM_ID")]), {
                clutchNetRtg: getStat(row, h, "NET_RATING"),
                clutchWinPct: parsePct(getStat(row, h, "W_PCT"))
              });
            });
        }

        const parsedTeams = rowsBase.map((row: any[]) => {
          const tId = getString(row, headersBase, "TEAM_ID", "0");
          const name = getString(row, headersBase, "TEAM_NAME", "Unknown");
          const mascot = name.split(' ').pop() || "";
          const staticTeam = NBA_TEAMS.find(t => t.name === name || t.name.includes(mascot));

          return {
            id: tId, name: name, abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: getStat(row, headersBase, "W"), losses: getStat(row, headersBase, "L"),
            ppg: getStat(row, headersBase, "PTS"),
            ...advMap.get(tId),
            opp: oppMap.get(tId) || { oppFgPct: 0, opp3ptPct: 0 },
            clutch: clutchMap.get(tId) || { clutchNetRtg: 0, clutchWinPct: 0 }
          };
        });

        this.historicalTeamsCache.set(season, parsedTeams);
        if (season === "2025-26") this.teamsCache = parsedTeams;
        return parsedTeams;
      } catch (err) {
        this.fetchTeamsPromises.delete(season);
        return [];
      }
    })();
    this.fetchTeamsPromises.set(season, promise);
    return promise;
  }

  // 🚀 REPARADO: Funciones de perfil de equipo rellenadas y blindadas
  async getTeamSchedule(teamId: string): Promise<any[]> { 
    try {
        const data = await fetchSafeJSON(`/teamgamelog?DateFrom=&DateTo=&LeagueID=00&Season=2025-26&SeasonType=Regular%20Season&TeamID=${teamId}`);
        if (!data || !data.resultSets || data.resultSets.length === 0) return [];
        const headers = data.resultSets[0].headers;
        return data.resultSets[0].rowSet.map((r: any[]) => ({
            gameId: getString(r, headers, "Game_ID", ""), 
            date: getString(r, headers, "GAME_DATE", ""),
            matchup: getString(r, headers, "MATCHUP", ""), 
            wl: getString(r, headers, "WL", "-"), 
            pts: getStat(r, headers, "PTS")
        }));
    } catch(e) { return []; }
  }
  
  async getTeamLineups(teamId: string): Promise<any[]> { 
    try {
        const data = await fetchSafeJSON(`/leaguedashlineups?GroupQuantity=5&LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=2025-26&SeasonType=Regular%20Season&TeamID=${teamId}`);
        if (!data || !data.resultSets || data.resultSets.length === 0) return [];
        const headers = data.resultSets[0].headers;
        return data.resultSets[0].rowSet.slice(0, 10).map((r: any[]) => ({
            groupId: getString(r, headers, "GROUP_ID", ""), 
            groupName: getString(r, headers, "GROUP_NAME", "Unknown Lineup"),
            min: getStat(r, headers, "MIN"), 
            offRtg: getStat(r, headers, "OFF_RATING"),
            defRtg: getStat(r, headers, "DEF_RATING"), 
            netRtg: getStat(r, headers, "NET_RATING")
        }));
    } catch(e) { return []; }
  }
  
  async getTeamRosterAndCoaches(teamId: string): Promise<any> { 
    try {
        const data = await fetchSafeJSON(`/commonteamroster?LeagueID=00&Season=2025-26&TeamID=${teamId}`);
        if (!data || !data.resultSets || data.resultSets.length < 1) return { players: [], coaches: [] };

        const pHeaders = data.resultSets[0].headers;
        const players = data.resultSets[0].rowSet.map((r: any[]) => {
            const pid = getString(r, pHeaders, "PLAYER_ID", "") || getString(r, pHeaders, "PlayerID", "");
            const rawName = getString(r, pHeaders, "PLAYER", "") || getString(r, pHeaders, "PLAYER_NAME", "");
            return {
                id: String(pid), 
                name: rawName ? String(rawName) : "Unknown Player",
                number: getString(r, pHeaders, "NUM", "0"), 
                position: getString(r, pHeaders, "POSITION", "-"),
                height: getString(r, pHeaders, "HEIGHT", "-"), 
                weight: getString(r, pHeaders, "WEIGHT", "-"),
                age: getStat(r, pHeaders, "AGE"), 
                imageUrl: this.getImageUrl(pid)
            };
        });

        let coaches: any[] = [];
        if (data.resultSets.length > 1) {
            const cHeaders = data.resultSets[1].headers;
            coaches = data.resultSets[1].rowSet.map((r: any[]) => ({
                name: getString(r, cHeaders, "COACH_NAME", "Unknown"), 
                type: getString(r, cHeaders, "COACH_TYPE", "Coach")
            }));
        }
        
        return { players, coaches };
    } catch(e) { return { players: [], coaches: [] }; }
  }

  calculateAdvancedWinProbability(awayTeam: any, homeTeam: any) {
    if (!awayTeam || !homeTeam || !awayTeam.netRtg) return { homeProb: 50, awayProb: 50, verdict: "Insufficient data" };
    const netDiff = (homeTeam.netRtg || 0) - (awayTeam.netRtg || 0);
    let homeProb = Math.min(92, Math.max(8, 50 + (netDiff * 1.5) + 3.5));
    return { homeProb: homeProb.toFixed(1), awayProb: (100 - homeProb).toFixed(1), verdict: "Analysis generated." };
  }

  async fetchLiveGames(dateStr?: string): Promise<any[]> {
    try {
      if (!dateStr) {
        const d = new Date();
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      const data = await fetchSafeJSON(`/scoreboardv3?GameDate=${dateStr}&LeagueID=00`);
      const settings = JSON.parse(localStorage.getItem('sports-intel-settings') || '{"timeZone":"local"}');

      return (data?.scoreboard?.games || []).map((g: any) => {
        const gameTime = new Date(g.gameTimeUTC);
        const timeStr = settings.timeZone && settings.timeZone !== 'local' ? gameTime.toLocaleTimeString('en-US', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit' }) : gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { gameId: g.gameId, home: g.homeTeam.teamTricolor, homeId: g.homeTeam.teamId, away: g.awayTeam.teamTricolor, awayId: g.awayTeam.teamId, homeScore: g.homeTeam.score, awayScore: g.awayTeam.score, quarter: g.gameStatus === 1 ? timeStr : (g.gameStatus === 3 ? "FINAL" : `Q${g.period} ${g.gameClock}`), status: g.gameStatus === 1 ? "upcoming" : (g.gameStatus === 3 ? "final" : "live"), arena: g.arena?.name || "TBD", city: g.arena?.city || "" };
      });
    } catch (error) { return []; }
  }

  async fetchStandings(): Promise<any[]> {
    try {
      const data = await fetchSafeJSON(`/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular%20Season`);
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;
      return rows.map((r: any[]) => ({
        teamId: r[headers.indexOf("TeamID")], name: r[headers.indexOf("TeamCity")] + " " + r[headers.indexOf("TeamName")], abbreviation: r[headers.indexOf("TeamSlug")], conference: r[headers.indexOf("Conference")], wins: r[headers.indexOf("WINS")], losses: r[headers.indexOf("LOSSES")], pct: r[headers.indexOf("WinPCT")]
      }));
    } catch(e) { return []; }
  }

  async fetchBoxScore(gameId: string): Promise<any> { return null; }
  async getTeamDetails(teamId: string): Promise<any> { return null; }
  async getPlayerGameLog(playerId: string): Promise<any[]> { return []; }
  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers("2025-26"); }
  findSimilarPlayers() { return []; }
  computeTeamMetrics = computeTeamMetrics;
}

export const nbaService = new NBAService();
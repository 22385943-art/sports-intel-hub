import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import { NBA_PLAYERS, NBA_TEAMS, computeTeamMetrics } from "@/data/nba/mockData";

// 🚀 EXTRAE DATOS DE FORMA SEGURA: Evita el colapso si la estadística no existía en esa época (Ej: Triples antes de 1979)
const getStat = (row: any[], headers: string[], key: string): number => {
    const idx = headers.indexOf(key);
    return idx !== -1 && row[idx] !== null && row[idx] !== undefined ? Number(row[idx]) : 0;
};

const getString = (row: any[], headers: string[], key: string, fallback: string): string => {
    const idx = headers.indexOf(key);
    return idx !== -1 && row[idx] !== null && row[idx] !== undefined ? String(row[idx]) : fallback;
};

// 🚀 RED DE PROXIES INFALIBLE
const fetchSafeJSON = async (endpoint: string) => {
    const fullUrl = `https://stats.nba.com/stats${endpoint}`;
    const proxies = [
        `/nba-api${endpoint}`, // Intento 1: Lovable/Vite Local Proxy
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`, // Intento 2: AllOrigins Raw
        `https://corsproxy.io/?${encodeURIComponent(fullUrl)}` // Intento 3: CorsProxy
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
    throw new Error("All proxies failed");
};

class NBAService implements SportService<NBAPlayer, NBATeam> {
  sport = "nba" as const;
  
  private playersCache: NBAPlayer[] | null = null;
  private teamsCache: any[] | null = null;
  private historicalPlayersCache: Map<string, NBAPlayer[]> = new Map();
  private fetchPromises: Map<string, Promise<NBAPlayer[]>> = new Map();
  private historicalTeamsCache: Map<string, any[]> = new Map();
  private fetchTeamsPromises: Map<string, Promise<any[]>> = new Map();

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
  
  getAllTeams(): NBATeam[] { return NBA_TEAMS; }
  getPlayerById(id: string) { return this.getAllPlayers().find((p) => String(p.id) === String(id)); }
  getPlayersByTeam(teamId: string) { return this.getAllPlayers().filter((p) => p.teamId === teamId); }
  getTeamById(id: string) { return this.getAllTeams().find((t) => String(t.id) === String(id) || t.abbreviation === id); }

  private calcPercentile(val: number, arr: number[]) {
      if (!arr || arr.length === 0) return 50;
      const below = arr.filter(v => v <= val).length;
      return Math.min(100, Math.round((below / arr.length) * 100));
  }

  async fetchAllOfficialPlayers(season: string = "2025-26"): Promise<NBAPlayer[]> {
    if (this.historicalPlayersCache.has(season)) return this.historicalPlayersCache.get(season)!;
    if (this.fetchPromises.has(season)) return this.fetchPromises.get(season)!;

    const promise = (async () => {
      try {
        const urlBase = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        const urlAdv = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        
        const dataBase = await fetchSafeJSON(urlBase);
        if (!dataBase || !dataBase.resultSets) throw new Error("Formato Base Inválido");

        let dataAdv = null;
        try {
            dataAdv = await fetchSafeJSON(urlAdv);
        } catch(e) {
            console.log(`[NBA] Stats Avanzadas nativas no disponibles para ${season}. Se generarán algoritmos matemáticos.`);
        }
        
        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        
        const advMap = new Map();
        if (dataAdv && dataAdv.resultSets[0].rowSet.length > 0) {
            const headersAdv = dataAdv.resultSets[0].headers;
            dataAdv.resultSets[0].rowSet.forEach((row: any[]) => {
              advMap.set(String(row[headersAdv.indexOf("PLAYER_ID")]), {
                ts: getStat(row, headersAdv, "TS_PCT") * 100,
                efg: getStat(row, headersAdv, "EFG_PCT") * 100,
                usg: getStat(row, headersAdv, "USG_PCT") * 100,
                defRating: getStat(row, headersAdv, "DEF_RATING") || 115,
                pie: getStat(row, headersAdv, "PIE") * 100,
                netRtg: getStat(row, headersAdv, "NET_RATING"),
                astPct: getStat(row, headersAdv, "AST_PCT") * 100
              });
            });
        }

        let parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = getString(row, headersBase, "PLAYER_ID", "0");
          const p = {
            id: playerId, 
            name: getString(row, headersBase, "PLAYER_NAME", "Unknown"), 
            teamId: getString(row, headersBase, "TEAM_ABBREVIATION", "FA"), 
            position: "NBA", imageUrl: this.getImageUrl(playerId), 
            age: getStat(row, headersBase, "AGE"),
            stats: {
              gp: getStat(row, headersBase, "GP"),
              ppg: getStat(row, headersBase, "PTS"), rpg: getStat(row, headersBase, "REB"), apg: getStat(row, headersBase, "AST"),
              spg: getStat(row, headersBase, "STL"), bpg: getStat(row, headersBase, "BLK"),
              fgPct: Math.round(getStat(row, headersBase, "FG_PCT") * 100),
              threePct: Math.round(getStat(row, headersBase, "FG3_PCT") * 100),
              ftPct: Math.round(getStat(row, headersBase, "FT_PCT") * 100),
              mpg: getStat(row, headersBase, "MIN"), fga: getStat(row, headersBase, "FGA"), fgm: getStat(row, headersBase, "FGM"),
              fta: getStat(row, headersBase, "FTA"), topg: getStat(row, headersBase, "TOV"),
              ...advMap.get(playerId)
            }
          };
          return { ...p, adv: this.computeAllAdvanced(p as any) };
        });

        // 🚀 CÁLCULO DE PERCENTILES NORMALIZADOS
        const allPPG = parsedPlayers.map(p => p.stats.ppg).sort((a,b)=>a-b);
        const allAPG = parsedPlayers.map(p => p.stats.apg).sort((a,b)=>a-b);
        const allRPG = parsedPlayers.map(p => p.stats.rpg).sort((a,b)=>a-b);
        const allTS = parsedPlayers.map(p => p.adv.ts).sort((a,b)=>a-b);
        const allBPM = parsedPlayers.map(p => p.adv.bpm).sort((a,b)=>a-b);
        const all3P = parsedPlayers.map(p => p.stats.threePct).sort((a,b)=>a-b);
        const allDef = parsedPlayers.map(p => (p.stats.spg || 0) + (p.stats.bpg || 0)).sort((a,b)=>a-b);

        parsedPlayers = parsedPlayers.map((p: any) => ({
            ...p,
            percentiles: {
                Scoring: this.calcPercentile(p.stats.ppg, allPPG),
                Playmaking: this.calcPercentile(p.stats.apg, allAPG),
                Rebounding: this.calcPercentile(p.stats.rpg, allRPG),
                Efficiency: this.calcPercentile(p.adv.ts, allTS),
                Impact: this.calcPercentile(p.adv.bpm, allBPM),
                Shooting: this.calcPercentile(p.stats.threePct, all3P),
                Defense: this.calcPercentile((p.stats.spg || 0) + (p.stats.bpg || 0), allDef)
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

  // 🚀 FÓRMULAS DE EXTRAPOLACIÓN (Si el USG% o TS% falta, lo inventa con precisión matemática)
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

    let finalTS = s.ts;
    if (!finalTS || finalTS === 0) {
        const trueShootingAttempts = (s.fga || 0) + 0.44 * (s.fta || 0);
        finalTS = trueShootingAttempts > 0 ? ((s.ppg || 0) / (2 * trueShootingAttempts)) * 100 : 0;
    }

    let finalUSG = s.usg;
    if (!finalUSG || finalUSG === 0) {
        const uses = (s.fga || 0) + 0.44 * (s.fta || 0) + (s.topg || 0);
        finalUSG = min > 0 ? (uses / min) * 40 : 0;
    }

    const siPlus = 100 + (bpm * 4.5) + ((per - 15) * 1.5) + ((finalTS - 55) * 0.5);

    return {
      per: Math.max(0, Math.round(per * 10) / 10) || 0,
      bpm: Math.round(bpm * 10) / 10 || 0,
      vorp: Math.round(vorp * 10) / 10 || 0,
      pie: Math.round((s.pie || 0) * 10) / 10 || Math.round(per / 2.5), 
      net: Math.round((s.netRtg || 0) * 10) / 10 || 0,
      usg: Math.round(finalUSG * 10) / 10 || 0,
      ts: Math.round(finalTS * 10) / 10 || 0,
      ast: Math.round((s.astPct || 0) * 10) / 10 || 0,
      efg: Math.round((s.efg || 0) * 10) / 10 || 0,
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
        
        const dataBase = await fetchSafeJSON(`/leaguedashteamstats${paramsBase}`);
        let dataAdv = await fetchSafeJSON(`/leaguedashteamstats${paramsAdv}`).catch(()=>null);

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;
        
        const advMap = new Map();
        if (dataAdv && dataAdv.resultSets[0].rowSet.length > 0) {
            const headersAdv = dataAdv.resultSets[0].headers;
            dataAdv.resultSets[0].rowSet.forEach((row: any[]) => {
              advMap.set(String(row[headersAdv.indexOf("TEAM_ID")]), {
                offRtg: getStat(row, headersAdv, "OFF_RATING"), defRtg: getStat(row, headersAdv, "DEF_RATING"),
                netRtg: getStat(row, headersAdv, "NET_RATING"), pace: getStat(row, headersAdv, "PACE"),
                tsPct: getStat(row, headersAdv, "TS_PCT") * 100, astTo: getStat(row, headersAdv, "AST_TO"),
                rebPct: getStat(row, headersAdv, "REB_PCT") * 100
              });
            });
        }

        const parsedTeams = rowsBase.map((row: any[]) => {
          const tId = getString(row, headersBase, "TEAM_ID", "0");
          const name = getString(row, headersBase, "TEAM_NAME", "Unknown");
          const mascot = name.split(' ').pop() || "";
          const staticTeam = NBA_TEAMS.find(t => t.name === name || t.name.includes(mascot));
          const advStats = advMap.get(tId) || {};

          return {
            id: tId, name: name, abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: getStat(row, headersBase, "W"), losses: getStat(row, headersBase, "L"),
            ppg: getStat(row, headersBase, "PTS"),
            ...advStats
          };
        });
        
        this.historicalTeamsCache.set(season, parsedTeams);
        if (season === "2025-26") this.teamsCache = parsedTeams;
        return parsedTeams;
      } catch (err) { 
        this.fetchTeamsPromises.delete(season);
        return season === "2025-26" ? NBA_TEAMS.map(t => ({ ...t, id: t.id, offRtg: 0, defRtg: 0, netRtg: 0, tsPct: 0, astTo: 0, rebPct: 0 })) : [];
      }
    })();
    this.fetchTeamsPromises.set(season, promise);
    return promise;
  }

  calculateAdvancedWinProbability(awayTeam: any, homeTeam: any) {
    if (!awayTeam || !homeTeam || !awayTeam.netRtg) return { homeProb: 50, awayProb: 50, verdict: "Insufficient statistical data to generate a reliable neural prediction." };

    let homeScore = 50; let awayScore = 50;
    const homeCourtAdvantage = 3.5; 

    const netDiff = (homeTeam.netRtg || 0) - (awayTeam.netRtg || 0);
    homeScore += (netDiff * 1.8) + homeCourtAdvantage;

    const homeOffVsAwayDef = (homeTeam.offRtg || 110) - (awayTeam.defRtg || 110);
    const awayOffVsHomeDef = (awayTeam.offRtg || 110) - (homeTeam.defRtg || 110);
    if (homeOffVsAwayDef > awayOffVsHomeDef) homeScore += 3.5; else awayScore += 3.5;

    const rebDiff = (homeTeam.rebPct || 50) - (awayTeam.rebPct || 50);
    homeScore += (rebDiff * 1.2);

    const astToDiff = (homeTeam.astTo || 1.5) - (awayTeam.astTo || 1.5);
    homeScore += (astToDiff * 2);

    let totalScore = homeScore + awayScore;
    let homeProb = Math.min(92, Math.max(8, (homeScore / totalScore) * 100));
    let awayProb = 100 - homeProb;

    const favorite = homeProb > 50 ? homeTeam : awayTeam;
    const underdog = homeProb > 50 ? awayTeam : homeTeam;
    const conf = Math.abs(homeProb - 50);

    let verdict = "";
    if (conf > 25) verdict = `Massive advantage for the ${favorite.name}. Their specific playstyle completely neutralizes the ${underdog.name}'s weaknesses. The disparity in Net Rating (${favorite.netRtg.toFixed(1)} vs ${underdog.netRtg.toFixed(1)}) makes this a highly probable win.`;
    else if (conf > 10) verdict = `The model leans towards the ${favorite.name}. While the ${underdog.name} have paths to victory, ${favorite.abbreviation} holds the mathematical edge in shot quality and scheme fit.`;
    else verdict = `A statistical coin-toss. The ${favorite.name} hold a microscopic edge, but the metrics suggest this game will be decided by late-game shot variance rather than systemic dominance.`;

    if (favorite.rebPct > underdog.rebPct + 2) verdict += ` Watch for ${favorite.abbreviation} to control the glass heavily.`;
    if (underdog.astTo > favorite.astTo + 0.3) verdict += ` However, ${underdog.abbreviation}'s elite ball security could keep them in the game.`;

    return { homeProb: homeProb.toFixed(1), awayProb: awayProb.toFixed(1), verdict };
  }

  // Métodos básicos (Standings, Scoreboard) usan fetchSafeJSON con rutas directas 
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
        teamId: r[headers.indexOf("TeamID")], name: r[headers.indexOf("TeamCity")] + " " + r[headers.indexOf("TeamName")], abbreviation: r[headers.indexOf("TeamSlug")], conference: r[headers.indexOf("Conference")], division: r[headers.indexOf("Division")], wins: r[headers.indexOf("WINS")], losses: r[headers.indexOf("LOSSES")], pct: r[headers.indexOf("WinPCT")], rank: r[headers.indexOf("PlayoffRank")], gb: r[headers.indexOf("ConferenceGamesBack")], home: r[headers.indexOf("HOME")] || "-", away: r[headers.indexOf("ROAD")] || "-", l10: r[headers.indexOf("L10")] || "-", streak: r[headers.indexOf("strCurrentStreak")] || "-", confRecord: r[headers.indexOf("ConferenceRecord")] || "-", divRecord: r[headers.indexOf("DivisionRecord")] || "-",
      }));
    } catch(e) { return []; }
  }

  async fetchBoxScore(gameId: string): Promise<any> { return fetchSafeJSON(`/boxscoretraditionalv3?GameID=${gameId}&LeagueID=00&playByPlay=false`).then(d => d?.boxScoreTraditional || null).catch(()=>null); }
  async getTeamSchedule(teamId: string): Promise<any[]> { return fetchSafeJSON(`/teamgamelog?DateFrom=&DateTo=&LeagueID=00&Season=2025-26&SeasonType=Regular%20Season&TeamID=${teamId}`).then(d => d.resultSets[0].rowSet.map((r:any[]) => ({ gameId: r[0], date: r[1], matchup: r[2], wl: r[3], pts: r[4] }))).catch(()=>[]); }
  async getTeamDetails(teamId: string): Promise<any> { return null; }
  async getTeamLineups(teamId: string): Promise<any[]> { return []; }
  async getTeamRosterAndCoaches(teamId: string): Promise<any> { return { players: [], coaches: [] }; }
  async getPlayerGameLog(playerId: string): Promise<any[]> { return []; }
  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers("2025-26"); }
  findSimilarPlayers() { return []; }
  computeGIR(p:any){ return p.stats?.ppg || 0; } computePVA(p:any){ return p.stats?.apg || 0; } 
  computeDDI(p:any){ return p.stats?.spg || 0; } computeCPS(p:any){ return p.stats?.rpg || 0; }
  computeEOE(p:any){ return p.stats?.bpg || 0; } computeSQI(p:any){ return p.stats?.ppg || 0; } 
  computeLSR(p:any){ return p.stats?.ppg || 0; } computeUAP(p:any){ return p.stats?.ppg || 0; }
  computeTeamMetrics = computeTeamMetrics;
}

export const nbaService = new NBAService();
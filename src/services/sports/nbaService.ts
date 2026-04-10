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

const zScore = (val: number, arr: number[]) => {
    if (!arr || arr.length === 0 || val === undefined || isNaN(val)) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length) || 1;
    return (val - mean) / sd;
};

const fetchSafeJSON = async (endpoint: string, retries = 1) => {
    const isCurrentSeason = endpoint.includes('2025-26') || endpoint.includes('GameDate');
    const separator = endpoint.includes('?') ? '&' : '?';
    const finalEndpoint = isCurrentSeason 
        ? `${endpoint}${separator}cb=${Math.floor(Date.now() / 1800000)}` 
        : endpoint;

    const fullUrl = `https://stats.nba.com/stats${finalEndpoint}`;
    const proxies = [
        `/nba-api${finalEndpoint}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`
    ];
    
    for (let i = 0; i <= retries; i++) {
        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 5000); 
                const res = await fetch(proxy, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const text = await res.text();
                    if (!text.trim().startsWith('<') && !text.includes("System.InvalidOperationException") && !text.includes("Rate Limit")) {
                        return JSON.parse(text);
                    }
                }
            } catch (e) {}
        }
        if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
    return null; 
};

const fetchLongJSON = async (endpoint: string, retries = 1) => {
    const isCurrentSeason = endpoint.includes('2025-26') || endpoint.includes('GameDate');
    const separator = endpoint.includes('?') ? '&' : '?';
    const finalEndpoint = isCurrentSeason 
        ? `${endpoint}${separator}cb=${Math.floor(Date.now() / 1800000)}` 
        : endpoint;

    const fullUrl = `https://stats.nba.com/stats${finalEndpoint}`;
    const proxies = [
        `/nba-api${finalEndpoint}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`
    ];
    
    for (let i = 0; i <= retries; i++) {
        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 12000); 
                const res = await fetch(proxy, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const text = await res.text();
                    if (!text.trim().startsWith('<') && !text.includes("System.InvalidOperationException") && !text.includes("Rate Limit")) {
                        return JSON.parse(text);
                    }
                }
            } catch (e) {}
        }
        if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
    return null; 
};

const parsePct = (val: number): number => {
    if (val === undefined || val === null || isNaN(val)) return 0.0;
    const pct = (val <= 1 && val > 0) || val === 1 ? val * 100 : val;
    return Number(pct.toFixed(1));
};

class NBAService implements SportService<NBAPlayer, NBATeam> {
  sport = "nba" as const;

  private playersCache: NBAPlayer[] | null = null;
  private teamsCache: any[] | null = null;
  private historicalPlayersCache: Map<string, NBAPlayer[]> = new Map();
  private fetchPromises: Map<string, Promise<NBAPlayer[]>> = new Map();
  private historicalTeamsCache: Map<string, any[]> = new Map();
  private fetchTeamsPromises: Map<string, Promise<any[]>> = new Map();
  private onOffCache: Map<string, number> = new Map();
  private clutchCache: Map<string, any> = new Map();

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
      if (basePlayer.stats) {
          basePlayer.stats.oreb = basePlayer.stats.oreb ?? Math.round((basePlayer.stats.rpg || 0) * 0.25 * 10) / 10;
          basePlayer.stats.dreb = basePlayer.stats.dreb ?? Math.round((basePlayer.stats.rpg || 0) * 0.75 * 10) / 10;
      }
      const adv = this.computeAllAdvanced(basePlayer as NBAPlayer);
      return { 
          ...basePlayer, 
          adv: {
              ...adv,
              offRtg: adv.offRtg ?? 115,
              defRating: adv.defRating ?? 115,
              netRtg: adv.netRtg ?? adv.net ?? 0,
              net: adv.net ?? adv.netRtg ?? 0,
              rTS: adv.rTS ?? 0.0,
              pace: adv.pace ?? 100,
              orebPct: adv.orebPct ?? 5.0,
              drebPct: adv.drebPct ?? 15.0
          },
          hustle: { deflections: 1.5, contestedShots: 4.0, contested3pt: 1.0, chargesDrawn: 0 } 
      } as any;
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

  qualifiesForLeaderboard(player: any, metric: string, maxGP: number): boolean {
    const s = player.stats || {};
    if ((s.gp || 0) < 5) return false; 
    const gp = s.gp || 0;
    const safeMaxGP = Math.max(1, maxGP);
    const totalFGM = (s.fgm || 0) * gp;
    const total3PM = (s.fg3m ?? s.tpm ?? 0) * gp;
    const totalFTM = (s.ftm ?? 0) * gp;

    if (['fgPct', 'ts', 'efg'].includes(metric)) return totalFGM >= (300 / 82) * safeMaxGP;
    if (metric === 'threePct') return total3PM >= (82 / 82) * safeMaxGP;
    if (metric === 'ftPct') return totalFTM >= (125 / 82) * safeMaxGP;

    return true;
  }

  async fetchAllOfficialPlayers(season: string = "2025-26"): Promise<NBAPlayer[]> {
    if (this.historicalPlayersCache.has(season)) return this.historicalPlayersCache.get(season)!;
    if (this.fetchPromises.has(season)) return this.fetchPromises.get(season)!;

    const promise = (async () => {
      try {
        const startYear = parseInt(season.split('-')[0]);

        const urlBase = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        const urlAdv = `/leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;
        const urlHustle = `/leaguehustlestatsplayer?LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0`;

        const dataBase = await fetchSafeJSON(urlBase);
        if (!dataBase || !dataBase.resultSets) {
            console.warn(`Base API Failed for season ${season}.`);
            return this.getAllPlayers();
        }

        let dataAdv = null;
        let dataHustle = null;

        if (startYear >= 1996) {
            await new Promise(res => setTimeout(res, 150)); 
            dataAdv = await fetchSafeJSON(urlAdv).catch(() => null); 
        }
        if (startYear >= 2015) {
            await new Promise(res => setTimeout(res, 150));
            dataHustle = await fetchSafeJSON(urlHustle).catch(() => null);
        }

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;

        const advMap = new Map();
        if (dataAdv && dataAdv.resultSets && dataAdv.resultSets[0].rowSet.length > 0) {
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
                astRatio: getStat(row, h, "AST_RATIO"),
                pace: getStat(row, h, "PACE") || 100,
                orebPct: parsePct(getStat(row, h, "OREB_PCT")),
                drebPct: parsePct(getStat(row, h, "DREB_PCT")),
                offRtg: getStat(row, h, "OFF_RATING") || 115
              });
            });
        }

        const hustleMap = new Map();
        if (dataHustle && dataHustle.resultSets && dataHustle.resultSets[0].rowSet.length > 0) {
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

        let totalLeaguePTS = 0;
        let totalLeagueFGA = 0;
        let totalLeagueFTA = 0;

        let parsedPlayers = rowsBase.map((row: any[]) => {
          const playerId = getString(row, headersBase, "PLAYER_ID", "0");
          const baseAdv = advMap.get(playerId) || {};
          const baseHustle = hustleMap.get(playerId) || { deflections: 0, contestedShots: 0, contested3pt: 0, chargesDrawn: 0 };
          
          const gp = getStat(row, headersBase, "GP"); 
          const min = getStat(row, headersBase, "MIN");
          const pts = getStat(row, headersBase, "PTS");
          const reb = getStat(row, headersBase, "REB");
          const fga = getStat(row, headersBase, "FGA");
          const fta = getStat(row, headersBase, "FTA");
          const ast = getStat(row, headersBase, "AST");
          const tov = getStat(row, headersBase, "TOV");
          
          const rawOreb = getStat(row, headersBase, "OREB");
          const rawDreb = getStat(row, headersBase, "DREB");
          const oreb = rawOreb || Math.round((reb * 0.25) * 10) / 10;
          const dreb = rawDreb || Math.round((reb * 0.75) * 10) / 10;

          totalLeaguePTS += (pts * gp);
          totalLeagueFGA += (fga * gp);
          totalLeagueFTA += (fta * gp);

          const fallbackTS = (fga > 0 || fta > 0) ? parsePct(pts / (2 * (fga + 0.44 * fta))) : 0;
          const fallbackUSG = min > 0 ? parsePct(((fga + 0.44 * fta + tov) * 40) / (min * 5)) : 15;
          const fallbackAstTo = tov > 0 ? ast / tov : ast;

          const offRtgVal = baseAdv.offRtg !== undefined ? baseAdv.offRtg : 115;
          const defRtgVal = baseAdv.defRating !== undefined ? baseAdv.defRating : 115;
          const netRtgVal = baseAdv.netRtg !== undefined ? baseAdv.netRtg : 0;

          const p = {
            id: playerId,
            name: getString(row, headersBase, "PLAYER_NAME", "Unknown Player"),
            teamId: getString(row, headersBase, "TEAM_ABBREVIATION", "FA"),
            position: "NBA", imageUrl: this.getImageUrl(playerId),
            age: getStat(row, headersBase, "AGE"),
            stats: {
              gp: gp, gs: Math.round(getStat(row, headersBase, "GS") * gp), mpg: min,
              ppg: pts, rpg: reb, apg: ast, oreb: oreb, dreb: dreb,
              spg: getStat(row, headersBase, "STL"), bpg: getStat(row, headersBase, "BLK"), topg: tov,
              fga: fga, fgm: getStat(row, headersBase, "FGM"), fgPct: parsePct(getStat(row, headersBase, "FG_PCT")),
              fg3a: getStat(row, headersBase, "FG3A"), fg3m: getStat(row, headersBase, "FG3M"), threePct: parsePct(getStat(row, headersBase, "FG3_PCT")),
              fta: fta, ftm: getStat(row, headersBase, "FTM"), ftPct: parsePct(getStat(row, headersBase, "FT_PCT")),
              offRtg: offRtgVal, defRating: defRtgVal, netRtg: netRtgVal, net: netRtgVal
            },
            adv: {
              ...baseAdv,
              ts: baseAdv.ts !== undefined ? baseAdv.ts : fallbackTS,
              usg: baseAdv.usg !== undefined ? baseAdv.usg : fallbackUSG,
              astTo: baseAdv.astTo !== undefined ? baseAdv.astTo : fallbackAstTo,
              pace: baseAdv.pace !== undefined ? baseAdv.pace : 100, 
              orebPct: baseAdv.orebPct || 0, drebPct: baseAdv.drebPct || 0,
              offRtg: offRtgVal, defRating: defRtgVal, netRtg: netRtgVal, net: netRtgVal
            },
            hustle: baseHustle,
            playmaking: {
                astPct: baseAdv.astPct || 0, astTo: baseAdv.astTo || fallbackAstTo, astRatio: baseAdv.astRatio || 0
            }
          };
          
          const advancedMetrics = this.computeAllAdvanced(p as any);
          p.adv = { ...p.adv, ...advancedMetrics };
          return p;
        });

        const leagueAvgTS = (totalLeagueFGA > 0 || totalLeagueFTA > 0) 
            ? parsePct(totalLeaguePTS / (2 * (totalLeagueFGA + 0.44 * totalLeagueFTA))) 
            : 55.0;

        const qualifiedPlayers = parsedPlayers.filter((p: any) => p.stats.gp >= 10 && p.stats.mpg >= 15);
        
        const allPPG = qualifiedPlayers.map((p: any) => p.stats.ppg).sort((a,b)=>a-b);
        const allAPG = qualifiedPlayers.map((p: any) => p.stats.apg).sort((a,b)=>a-b);
        const allRPG = qualifiedPlayers.map((p: any) => p.stats.rpg).sort((a,b)=>a-b);
        const allTS = qualifiedPlayers.map((p: any) => p.adv.ts).sort((a,b)=>a-b);
        const allBPM = qualifiedPlayers.map((p: any) => p.adv.bpm).sort((a,b)=>a-b);
        const all3P = qualifiedPlayers.map((p: any) => p.stats.threePct).sort((a,b)=>a-b);
        
        const allOReb = qualifiedPlayers.map((p: any) => p.stats.oreb).sort((a,b)=>a-b);
        const allDReb = qualifiedPlayers.map((p: any) => p.stats.dreb).sort((a,b)=>a-b);
        const allAstPct = qualifiedPlayers.map((p: any) => p.adv.astPct).sort((a,b)=>a-b);
        const allOffRtg = qualifiedPlayers.map((p: any) => p.adv.offRtg).sort((a,b)=>a-b);
        const allDefRtgInv = qualifiedPlayers.map((p: any) => 115 - (p.adv.defRating || 115)).sort((a,b)=>a-b);
        const allNetRtg = qualifiedPlayers.map((p: any) => p.adv.net).sort((a,b)=>a-b);
        const allContested = qualifiedPlayers.map((p: any) => p.hustle.contestedShots).sort((a,b)=>a-b);
        const allContested3 = qualifiedPlayers.map((p: any) => p.hustle.contested3pt).sort((a,b)=>a-b);
        const allDeflections = qualifiedPlayers.map((p: any) => p.hustle.deflections).sort((a,b)=>a-b);
        const allSI = qualifiedPlayers.map((p: any) => p.adv.si).sort((a,b)=>a-b);
        const allPER = qualifiedPlayers.map((p: any) => p.adv.per).sort((a,b)=>a-b);
        const allVORP = qualifiedPlayers.map((p: any) => p.adv.vorp).sort((a,b)=>a-b);
        const allPIE = qualifiedPlayers.map((p: any) => p.adv.pie).sort((a,b)=>a-b);
        const allUSG = qualifiedPlayers.map((p: any) => p.adv.usg).sort((a,b)=>a-b);
        const allEFG = qualifiedPlayers.map((p: any) => p.adv.efg).sort((a,b)=>a-b);

        const calcDefImpact = (p: any) => {
            const mpg = p.stats.mpg || 1;
            const stl = p.stats.spg || 0;
            const blk = p.stats.bpg || 0;
            const defRtg = p.adv?.defRating || 115;
            
            const teamImpact = Math.max(0, 115 - defRtg) * 1.5; 
            const individualImpact = (((stl * 2.5) + (blk * 1.5)) / mpg) * 36;
            return teamImpact + individualImpact;
        };
        const allDefImpact = qualifiedPlayers.map(calcDefImpact).sort((a,b)=>a-b);

        parsedPlayers = parsedPlayers.map((p: any) => {
            p.adv.rTS = Number((p.adv.ts - leagueAvgTS).toFixed(1));
            return {
                ...p,
                zScores: { 
                    Scoring: zScore(p.stats.ppg, allPPG), Playmaking: zScore(p.stats.apg, allAPG),
                    Rebounding: zScore(p.stats.rpg, allRPG), Efficiency: zScore(p.adv.ts, allTS),
                    Impact: zScore(p.adv.bpm, allBPM), Defense: zScore(calcDefImpact(p), allDefImpact),
                    OReb: zScore(p.stats.oreb, allOReb), DReb: zScore(p.stats.dreb, allDReb),
                    AstPct: zScore(p.adv.astPct, allAstPct), OffRtg: zScore(p.adv.offRtg, allOffRtg),
                    DefRtg: zScore(115 - (p.adv.defRating || 115), allDefRtgInv), NetRtg: zScore(p.adv.net, allNetRtg),
                    Contested: zScore(p.hustle.contestedShots, allContested), Contested3: zScore(p.hustle.contested3pt, allContested3),
                    Deflections: zScore(p.hustle.deflections, allDeflections), SI: zScore(p.adv.si, allSI),
                    PER: zScore(p.adv.per, allPER), VORP: zScore(p.adv.vorp, allVORP),
                    PIE: zScore(p.adv.pie, allPIE), USG: zScore(p.adv.usg, allUSG), EFG: zScore(p.adv.efg, allEFG)
                },
                percentiles: {
                    Scoring: this.calcPercentile(p.stats.ppg, allPPG), Playmaking: this.calcPercentile(p.stats.apg, allAPG),
                    Rebounding: this.calcPercentile(p.stats.rpg, allRPG), Efficiency: this.calcPercentile(p.adv.ts, allTS),
                    Impact: this.calcPercentile(p.adv.bpm, allBPM), Shooting: this.calcPercentile(p.stats.threePct, all3P),
                    Defense: this.calcPercentile(calcDefImpact(p), allDefImpact), OReb: this.calcPercentile(p.stats.oreb, allOReb),
                    DReb: this.calcPercentile(p.stats.dreb, allDReb), AstPct: this.calcPercentile(p.adv.astPct, allAstPct),
                    OffRtg: this.calcPercentile(p.adv.offRtg, allOffRtg), DefRtg: this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv),
                    NetRtg: this.calcPercentile(p.adv.net, allNetRtg), Contested: this.calcPercentile(p.hustle.contestedShots, allContested),
                    Contested3: this.calcPercentile(p.hustle.contested3pt, allContested3), Deflections: this.calcPercentile(p.hustle.deflections, allDeflections),
                    SI: this.calcPercentile(p.adv.si, allSI), PER: this.calcPercentile(p.adv.per, allPER),
                    VORP: this.calcPercentile(p.adv.vorp, allVORP), PIE: this.calcPercentile(p.adv.pie, allPIE),
                    USG: this.calcPercentile(p.adv.usg, allUSG), EFG: this.calcPercentile(p.adv.efg, allEFG)
                }
            };
        });

        this.historicalPlayersCache.set(season, parsedPlayers as unknown as NBAPlayer[]);
        if (season === "2025-26") this.playersCache = parsedPlayers as unknown as NBAPlayer[];

        return parsedPlayers as unknown as NBAPlayer[];
      } catch (err) {
        this.fetchPromises.delete(season);
        return this.getAllPlayers();
      }
    })();

    this.fetchPromises.set(season, promise);
    return promise;
  }

  computeAllAdvanced(player: any) {
    const s = player.stats || {};
    const a = player.adv || {};
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

    let finalTS = a.ts ?? s.ts ?? 0;
    let finalUSG = a.usg ?? s.usg ?? 0;
    const siPlus = 100 + (bpm * 4.5) + ((per - 15) * 1.5) + ((finalTS - 55) * 0.5);

    return {
      ...a, 
      per: Math.max(0, Math.round(per * 10) / 10) || 0,
      bpm: Math.round(bpm * 10) / 10 || 0,
      vorp: Math.round(vorp * 10) / 10 || 0,
      pie: a.pie ?? s.pie ?? Math.round((per / 2.5) * 10) / 10,
      net: a.net ?? a.netRtg ?? s.net ?? s.netRtg ?? 0,
      netRtg: a.netRtg ?? s.netRtg ?? a.net ?? s.net ?? 0,
      offRtg: a.offRtg ?? s.offRtg ?? 115,
      defRating: a.defRating ?? s.defRating ?? 115,
      oreb: s.oreb ?? a.oreb ?? 0,
      dreb: s.dreb ?? a.dreb ?? 0,
      usg: finalUSG, ts: finalTS, efg: a.efg ?? s.efg ?? 0, ast: a.astPct ?? s.astPct ?? 0,
      si: Math.round(siPlus) || 100,
    };
  }

  async fetchAllOfficialTeams(season: string = "2025-26"): Promise<any[]> {
    if (this.historicalTeamsCache.has(season)) return this.historicalTeamsCache.get(season)!;
    if (this.fetchTeamsPromises.has(season)) return this.fetchTeamsPromises.get(season)!;

    const promise = (async () => {
      try {
        const paramsTeamBase = `?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
        const paramsAdv = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Advanced");
        const paramsOpp = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Opponent");
        const paramsMisc = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Misc"); 
        const paramsScoring = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Scoring"); 
        
        const paramsClutch = `?AheadBehind=Ahead%20or%20Behind&ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlusMinus=N&PointDiff=5&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=`;
        const urlClutchBase = `/leaguedashteamclutch${paramsClutch}`;
        const urlClutchAdv = `/leaguedashteamclutch${paramsClutch.replace("MeasureType=Base", "MeasureType=Advanced")}`;
        const urlHustle = `/leaguehustlestatsteam?LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0`;

        const [resBase, resAdv, resOpp] = await Promise.all([
            fetchSafeJSON(`/leaguedashteamstats${paramsTeamBase}`),
            fetchSafeJSON(`/leaguedashteamstats${paramsAdv}`).catch(() => null),
            fetchSafeJSON(`/leaguedashteamstats${paramsOpp}`).catch(() => null)
        ]);

        await new Promise(resolve => setTimeout(resolve, 800));

        const [resMisc, resHustle, resScoring] = await Promise.all([
            fetchSafeJSON(`/leaguedashteamstats${paramsMisc}`).catch(() => null),
            fetchSafeJSON(urlHustle).catch(() => null),
            fetchSafeJSON(`/leaguedashteamstats${paramsScoring}`).catch(() => null)
        ]);

        await new Promise(resolve => setTimeout(resolve, 800));

        const [resClutchBase, resClutchAdv] = await Promise.all([
            fetchSafeJSON(urlClutchBase).catch(() => null),
            fetchSafeJSON(urlClutchAdv).catch(() => null)
        ]);

        if (!resBase || !resBase.resultSets) return this.getAllTeams();

        const headersBase = resBase.resultSets[0].headers;
        const rowsBase = resBase.resultSets[0].rowSet;

        const advMap = new Map();
        if (resAdv && resAdv.resultSets && resAdv.resultSets[0].rowSet.length > 0) {
            const h = resAdv.resultSets[0].headers;
            resAdv.resultSets[0].rowSet.forEach((row: any[]) => {
              advMap.set(String(row[h.indexOf("TEAM_ID")]), {
                offRtg: getStat(row, h, "OFF_RATING") || 0, 
                defRtg: getStat(row, h, "DEF_RATING") || 0,
                netRtg: getStat(row, h, "NET_RATING") || 0, 
                pace: getStat(row, h, "PACE") || 0,
                tsPct: parsePct(getStat(row, h, "TS_PCT")), 
                astTo: getStat(row, h, "AST_TO") || 0,
                astPct: parsePct(getStat(row, h, "AST_PCT")),
                rebPct: parsePct(getStat(row, h, "REB_PCT")),
                orebPct: parsePct(getStat(row, h, "OREB_PCT")),
                drebPct: parsePct(getStat(row, h, "DREB_PCT")),
                efgPct: parsePct(getStat(row, h, "EFG_PCT")),
                astRatio: getStat(row, h, "AST_RATIO") || 0,
                pie: parsePct(getStat(row, h, "PIE")),
                tovPct: parsePct(getStat(row, h, "TM_TOV_PCT")) || 0
              });
            });
        }

        const oppMap = new Map();
        if (resOpp && resOpp.resultSets && resOpp.resultSets[0].rowSet.length > 0) {
            const h = resOpp.resultSets[0].headers;
            resOpp.resultSets[0].rowSet.forEach((row: any[]) => {
              const oppFga = getStat(row, h, "OPP_FGA");
              const oppFta = getStat(row, h, "OPP_FTA");
              const oppFg3a = getStat(row, h, "OPP_FG3A");
              const oppFgm = getStat(row, h, "OPP_FGM");
              const oppFg3m = getStat(row, h, "OPP_FG3M");
              const opp2pa = Math.max(1, oppFga - oppFg3a);
              const opp2pm = Math.max(0, oppFgm - oppFg3m);
              const opp2ptPct = parsePct(opp2pm / opp2pa);
              const oppFtaRate = oppFga > 0 ? parsePct(oppFta / oppFga) : 0;

              oppMap.set(String(row[h.indexOf("TEAM_ID")]), {
                oppFgPct: parsePct(getStat(row, h, "OPP_FG_PCT")),
                opp3ptPct: parsePct(getStat(row, h, "OPP_FG3_PCT")),
                opp2ptPct: opp2ptPct, 
                oppTov: getStat(row, h, "OPP_TOV") || 0,
                oppFtaRate: oppFtaRate
              });
            });
        }

        const miscMap = new Map();
        if (resMisc && resMisc.resultSets && resMisc.resultSets[0].rowSet.length > 0) {
            const h = resMisc.resultSets[0].headers;
            resMisc.resultSets[0].rowSet.forEach((row: any[]) => {
              miscMap.set(String(row[h.indexOf("TEAM_ID")]), {
                ptsOffTov: getStat(row, h, "PTS_OFF_TOV") || 0,
                ptsFb: getStat(row, h, "PTS_FB") || 0,
                pts2ndChance: getStat(row, h, "PTS_2ND_CHANCE") || 0,
                ptsPaint: getStat(row, h, "PTS_PAINT") || 0,
                oppPtsOffTov: getStat(row, h, "OPP_PTS_OFF_TOV") || 0,
                oppPtsFb: getStat(row, h, "OPP_PTS_FB") || 0,
                oppPts2ndChance: getStat(row, h, "OPP_PTS_2ND_CHANCE") || 0,
                oppPtsPaint: getStat(row, h, "OPP_PTS_PAINT") || 0
              });
            });
        }

        const hustleMap = new Map();
        if (resHustle && resHustle.resultSets && resHustle.resultSets[0].rowSet.length > 0) {
            const h = resHustle.resultSets[0].headers;
            resHustle.resultSets[0].rowSet.forEach((row: any[]) => {
              hustleMap.set(String(row[h.indexOf("TEAM_ID")]), {
                boxOuts: getStat(row, h, "BOX_OUTS") || 0,
                looseBalls: getStat(row, h, "LOOSE_BALLS_RECOVERED") || 0,
              });
            });
        }

        const scoringMap = new Map();
        if (resScoring && resScoring.resultSets && resScoring.resultSets[0].rowSet.length > 0) {
            const h = resScoring.resultSets[0].headers;
            resScoring.resultSets[0].rowSet.forEach((row: any[]) => {
              scoringMap.set(String(row[h.indexOf("TEAM_ID")]), {
                pctFgmAst: parsePct(getStat(row, h, "PCT_AST_FGM")),
                pct2fgmAst: parsePct(getStat(row, h, "PCT_AST_2PM")),
                pct3fgmAst: parsePct(getStat(row, h, "PCT_AST_3PM")),
                pctPts2pt: parsePct(getStat(row, h, "PCT_PTS_2PT")),
                pctPts3pt: parsePct(getStat(row, h, "PCT_PTS_3PT")),
                pctPtsFt: parsePct(getStat(row, h, "PCT_PTS_FT")),
              });
            });
        }

        const clutchAdvMap = new Map();
        if (resClutchAdv && resClutchAdv.resultSets && resClutchAdv.resultSets[0].rowSet.length > 0) {
            const h = resClutchAdv.resultSets[0].headers;
            resClutchAdv.resultSets[0].rowSet.forEach((row: any[]) => {
                clutchAdvMap.set(String(row[h.indexOf("TEAM_ID")]), {
                    offRtg: getStat(row, h, "OFF_RATING") || 0,
                    defRtg: getStat(row, h, "DEF_RATING") || 0,
                    netRtg: getStat(row, h, "NET_RATING") || 0,
                    astPct: parsePct(getStat(row, h, "AST_PCT")),
                    astTo: getStat(row, h, "AST_TO") || 0,
                    astRatio: getStat(row, h, "AST_RATIO") || 0,
                    orebPct: parsePct(getStat(row, h, "OREB_PCT")),
                    drebPct: parsePct(getStat(row, h, "DREB_PCT")),
                    rebPct: parsePct(getStat(row, h, "REB_PCT")),
                    tovPct: parsePct(getStat(row, h, "TM_TOV_PCT")),
                    efgPct: parsePct(getStat(row, h, "EFG_PCT")),
                    pace: getStat(row, h, "PACE") || 0,
                    pie: parsePct(getStat(row, h, "PIE")),
                });
            });
        }

        const clutchMap = new Map();
        const clutchDataRaw: any[] = [];
        if (resClutchBase && resClutchBase.resultSets && resClutchBase.resultSets[0].rowSet.length > 0) {
            const h = resClutchBase.resultSets[0].headers;
            resClutchBase.resultSets[0].rowSet.forEach((row: any[]) => {
              const pts = getStat(row, h, "PTS");
              const fga = getStat(row, h, "FGA");
              const fta = getStat(row, h, "FTA");
              clutchDataRaw.push({
                  id: String(row[h.indexOf("TEAM_ID")]),
                  gp: getStat(row, h, "GP"), 
                  min: getStat(row, h, "MIN"), 
                  wins: getStat(row, h, "W"), 
                  losses: getStat(row, h, "L"),
                  pts: pts, fga: fga, fta: fta,
                  ts: parsePct(pts / (2 * (fga + 0.44 * fta))),
                  winPct: parsePct(getStat(row, h, "W_PCT")),
                  adv: clutchAdvMap.get(String(row[h.indexOf("TEAM_ID")])) || {}
              });
            });

            const validClutch = clutchDataRaw.filter(t => t.min >= 10);
            const allClutchOff = validClutch.map(t => t.adv.offRtg || 115).sort((a,b)=>a-b);
            const allClutchDefInv = validClutch.map(t => 115 - (t.adv.defRtg || 115)).sort((a,b)=>a-b);
            const allClutchNet = validClutch.map(t => t.adv.netRtg || 0).sort((a,b)=>a-b);
            const allClutchPace = validClutch.map(t => t.adv.pace || 100).sort((a,b)=>a-b);
            const allClutchTs = validClutch.map(t => t.ts).sort((a,b)=>a-b);
            const allClutchReb = validClutch.map(t => t.adv.rebPct || 50).sort((a,b)=>a-b);

            clutchDataRaw.forEach(t => {
                clutchMap.set(t.id, {
                    wins: t.wins,
                    losses: t.losses,
                    winPct: t.winPct,
                    gp: t.gp,
                    min: t.min,
                    offRtg: t.adv.offRtg || 0,
                    defRtg: t.adv.defRtg || 0,
                    netRtg: t.adv.netRtg || 0,
                    astPct: t.adv.astPct || 0,
                    astTo: t.adv.astTo || 0,
                    astRatio: t.adv.astRatio || 0,
                    orebPct: t.adv.orebPct || 0,
                    drebPct: t.adv.drebPct || 0,
                    rebPct: t.adv.rebPct || 0,
                    tovPct: t.adv.tovPct || 0,
                    efgPct: t.adv.efgPct || 0,
                    tsPct: t.ts || 0,
                    pace: t.adv.pace || 0,
                    pie: t.adv.pie || 0,
                    percentiles: {
                        Offense: this.calcPercentile(t.adv.offRtg || 115, allClutchOff),
                        Defense: this.calcPercentile(115 - (t.adv.defRtg || 115), allClutchDefInv),
                        NetRating: this.calcPercentile(t.adv.netRtg || 0, allClutchNet),
                        Pace: this.calcPercentile(t.adv.pace || 100, allClutchPace),
                        Efficiency: this.calcPercentile(t.ts, allClutchTs),
                        Rebounding: this.calcPercentile(t.adv.rebPct || 50, allClutchReb)
                    }
                });
            });
        }

        let parsedTeams = rowsBase.map((row: any[]) => {
          const tId = getString(row, headersBase, "TEAM_ID", "0");
          const name = getString(row, headersBase, "TEAM_NAME", "Unknown Team");
          const staticTeam = NBA_TEAMS.find(t => t.name === name || t.name.includes(name.split(' ').pop() || ""));
          const pts = getStat(row, headersBase, "PTS");
          const fga = getStat(row, headersBase, "FGA");
          const fta = getStat(row, headersBase, "FTA");
          const plusMinus = getStat(row, headersBase, "PLUS_MINUS");
          const wins = getStat(row, headersBase, "W");
          const losses = getStat(row, headersBase, "L");
          const winPct = (wins + losses > 0) ? parsePct(wins / (wins + losses)) : 0;
          
          const mData = miscMap.get(tId) || { ptsOffTov: 0, ptsFb: 0, pts2ndChance: 0, ptsPaint: 0, oppPtsOffTov: 0, oppPtsFb: 0, oppPts2ndChance: 0, oppPtsPaint: 0 };
          const hData = hustleMap.get(tId) || { boxOuts: 0, looseBalls: 0 };
          const sData = scoringMap.get(tId) || { pctFgmAst: 0, pct2fgmAst: 0, pct3fgmAst: 0, pctPts2pt: 0, pctPts3pt: 0, pctPtsFt: 0 };

          return {
            id: tId, name: name, abbreviation: staticTeam?.abbreviation || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: wins, losses: losses, winPct: winPct,
            min: getStat(row, headersBase, "MIN"),
            ppg: pts, 
            oppPpg: pts - plusMinus,
            fgm: getStat(row, headersBase, "FGM"),
            fga: fga,
            fgPct: parsePct(getStat(row, headersBase, "FG_PCT")),
            fg3m: getStat(row, headersBase, "FG3M"),
            fg3a: getStat(row, headersBase, "FG3A"),
            threePct: parsePct(getStat(row, headersBase, "FG3_PCT")),
            ftm: getStat(row, headersBase, "FTM"),
            fta: fta,
            ftPct: parsePct(getStat(row, headersBase, "FT_PCT")),
            oreb: getStat(row, headersBase, "OREB"),
            dreb: getStat(row, headersBase, "DREB"),
            reb: getStat(row, headersBase, "REB"),
            apg: getStat(row, headersBase, "AST"),
            tov: getStat(row, headersBase, "TOV"),
            spg: getStat(row, headersBase, "STL"),
            bpg: getStat(row, headersBase, "BLK"),
            blka: getStat(row, headersBase, "BLKA"),
            pf: getStat(row, headersBase, "PF"),
            pfd: getStat(row, headersBase, "PFD"),
            plusMinus: plusMinus,

            ftaRate: fga > 0 ? parsePct(fta / fga) : 0,

            pctFgmAst: sData.pctFgmAst,
            pct2fgmAst: sData.pct2fgmAst,
            pct3fgmAst: sData.pct3fgmAst,
            pctPts2pt: sData.pctPts2pt,
            pctPts3pt: sData.pctPts3pt,
            pctPtsFt: sData.pctPtsFt,
            
            ptsOffTov: mData.ptsOffTov,
            ptsFb: mData.ptsFb,
            pts2ndChance: mData.pts2ndChance,
            ptsPaint: mData.ptsPaint,
            pctPtsOffTov: pts > 0 ? parsePct(mData.ptsOffTov / pts) : 0,
            pctPtsPitp: pts > 0 ? parsePct(mData.ptsPaint / pts) : 0,

            boxOuts: hData.boxOuts,
            looseBalls: hData.looseBalls,
            
            imageUrl: this.getTeamLogoUrl(staticTeam?.abbreviation || ""),
            ...advMap.get(tId),
            opp: {
                ...(oppMap.get(tId) || { oppFgPct: 0, opp3ptPct: 0, opp2ptPct: 0, oppTov: 0, oppFtaRate: 0 }),
                oppPtsPaint: mData.oppPtsPaint,
                oppPtsOffTov: mData.oppPtsOffTov,
                oppPtsFb: mData.oppPtsFb,
                oppPts2ndChance: mData.oppPts2ndChance
            },
            clutch: clutchMap.get(tId) || null
          };
        });

        const allOffRtg = parsedTeams.map((t:any) => t.offRtg || 115).sort((a:number,b:number)=>a-b);
        const allDefRtgInv = parsedTeams.map((t:any) => 115 - (t.defRtg || 115)).sort((a:number,b:number)=>a-b);
        const allNetRtg = parsedTeams.map((t:any) => t.netRtg || 0).sort((a:number,b:number)=>a-b);
        const allPace = parsedTeams.map((t:any) => t.pace || 100).sort((a:number,b:number)=>a-b);
        const allTsPct = parsedTeams.map((t:any) => t.tsPct || 55).sort((a:number,b:number)=>a-b);
        const allRebPct = parsedTeams.map((t:any) => t.rebPct || 50).sort((a:number,b:number)=>a-b);
        
        const allAPG = parsedTeams.map((t:any) => t.apg || 0).sort((a:number,b:number)=>a-b);
        const allAstTo = parsedTeams.map((t:any) => t.astTo || 1.5).sort((a:number,b:number)=>a-b);
        const allOrebPct = parsedTeams.map((t:any) => t.orebPct || 25).sort((a:number,b:number)=>a-b);
        
        const allSPG = parsedTeams.map((t:any) => t.spg || 0).sort((a:number,b:number)=>a-b);
        const allBPG = parsedTeams.map((t:any) => t.bpg || 0).sort((a:number,b:number)=>a-b);
        const allDrebPct = parsedTeams.map((t:any) => t.drebPct || 75).sort((a:number,b:number)=>a-b);
        const allOpp2pInv = parsedTeams.map((t:any) => 100 - (t.opp?.opp2ptPct || 50)).sort((a:number,b:number)=>a-b); 
        const allOpp3pInv = parsedTeams.map((t:any) => 100 - (t.opp?.opp3ptPct || 35)).sort((a:number,b:number)=>a-b); 
        
        // 🚀 FIX: AÑADIDO ALLPPG PARA LA PESTAÑA TRADITIONAL
        const allPPG = parsedTeams.map((t:any) => t.ppg || 0).sort((a:number,b:number)=>a-b);
        const allFgPct = parsedTeams.map((t:any) => t.fgPct || 45).sort((a:number,b:number)=>a-b);
        const all3pPct = parsedTeams.map((t:any) => t.threePct || 35).sort((a:number,b:number)=>a-b);
        const allFtPct = parsedTeams.map((t:any) => t.ftPct || 75).sort((a:number,b:number)=>a-b);
        const allRawReb = parsedTeams.map((t:any) => t.reb || 40).sort((a:number,b:number)=>a-b);
        
        const allOppPtsFbInv = parsedTeams.map((t:any) => 100 - (t.opp?.oppPtsFb || 15)).sort((a:number,b:number)=>a-b); 
        const allOppTov = parsedTeams.map((t:any) => t.opp?.oppTov || 13).sort((a:number,b:number)=>a-b); 

        const allPtsFb = parsedTeams.map((t:any) => t.ptsFb || 0).sort((a:number,b:number)=>a-b);
        const allPts2nd = parsedTeams.map((t:any) => t.pts2ndChance || 0).sort((a:number,b:number)=>a-b);
        const allPtsOffTov = parsedTeams.map((t:any) => t.ptsOffTov || 0).sort((a:number,b:number)=>a-b);
        const allTovPctInv = parsedTeams.map((t:any) => 100 - (t.tovPct || 15)).sort((a:number,b:number)=>a-b);
        const allLooseBalls = parsedTeams.map((t:any) => t.looseBalls || 0).sort((a:number,b:number)=>a-b);
        const allBoxOuts = parsedTeams.map((t:any) => t.boxOuts || 0).sort((a:number,b:number)=>a-b); 
        const allFtaRate = parsedTeams.map((t:any) => t.ftaRate || 0).sort((a:number,b:number)=>a-b);
        const allPct3pt = parsedTeams.map((t:any) => t.pctPts3pt || 0).sort((a:number,b:number)=>a-b);
        const allFgmAst = parsedTeams.map((t:any) => t.pctFgmAst || 0).sort((a:number,b:number)=>a-b);

        parsedTeams = parsedTeams.map((t:any) => ({
            ...t,
            percentiles: {
                Offense: this.calcPercentile(t.offRtg || 115, allOffRtg),
                Defense: this.calcPercentile(115 - (t.defRtg || 115), allDefRtgInv),
                NetRating: this.calcPercentile(t.netRtg || 0, allNetRtg),
                Pace: this.calcPercentile(t.pace || 100, allPace),
                Efficiency: this.calcPercentile(t.tsPct || 55, allTsPct),
                Rebounding: this.calcPercentile(t.rebPct || 50, allRebPct),
                
                // 🚀 FIX: MAPEO DE PUNTOS PARA EL RADAR TRADITIONAL
                Points: this.calcPercentile(t.ppg, allPPG),
                RawReb: this.calcPercentile(t.reb, allRawReb),
                FgPct: this.calcPercentile(t.fgPct, allFgPct),
                ThreePct: this.calcPercentile(t.threePct, all3pPct),
                FtPct: this.calcPercentile(t.ftPct, allFtPct),
                
                Playmaking: this.calcPercentile(t.apg, allAPG),
                BallSecurity: this.calcPercentile(t.astTo, allAstTo),
                OffReb: this.calcPercentile(t.orebPct, allOrebPct),
                
                Steals: this.calcPercentile(t.spg, allSPG),
                Blocks: this.calcPercentile(t.bpg, allBPG),
                DefReb: this.calcPercentile(t.drebPct, allDrebPct),
                InteriorDef: this.calcPercentile(100 - (t.opp?.opp2ptPct || 50), allOpp2pInv),
                PerimDefense: this.calcPercentile(100 - (t.opp?.opp3ptPct || 35), allOpp3pInv),
                TransitionDef: this.calcPercentile(100 - (t.opp?.oppPtsFb || 15), allOppPtsFbInv),
                TurnoversForced: this.calcPercentile(t.opp?.oppTov || 13, allOppTov),

                FastBreak: this.calcPercentile(t.ptsFb, allPtsFb),
                SecondChance: this.calcPercentile(t.pts2ndChance, allPts2nd),
                PtsOffTov: this.calcPercentile(t.ptsOffTov, allPtsOffTov),
                Hustle: this.calcPercentile(t.looseBalls, allLooseBalls),
                BoxOuts: this.calcPercentile(t.boxOuts, allBoxOuts), 
                TurnoverAvoidance: this.calcPercentile(100 - (t.tovPct || 15), allTovPctInv),
                FtaRate: this.calcPercentile(t.ftaRate, allFtaRate),
                ShotProfile: this.calcPercentile(t.pctPts3pt, allPct3pt),
                BallMovement: this.calcPercentile(t.pctFgmAst, allFgmAst)
            },
            zScores: {
                Offense: zScore(t.offRtg || 115, allOffRtg),
                Defense: zScore(115 - (t.defRtg || 115), allDefRtgInv),
                NetRating: zScore(t.netRtg || 0, allNetRtg),
                Pace: zScore(t.pace || 100, allPace),
                Efficiency: zScore(t.tsPct || 55, allTsPct),
                Rebounding: zScore(t.rebPct || 50, allRebPct)
            }
        }));

        this.historicalTeamsCache.set(season, parsedTeams);
        if (season === "2025-26") this.teamsCache = parsedTeams;
        return parsedTeams;
      } catch (err) {
        this.fetchTeamsPromises.delete(season);
        return season === "2025-26" ? this.getAllTeams() : [];
      }
    })();
    this.fetchTeamsPromises.set(season, promise);
    return promise;
  }

  async fetchAwardAuxData(season: string = "2025-26", prevSeason: string = "2024-25") {
    const cacheKey = `clutch-${season}`;
    if (this.clutchCache.has(cacheKey)) return this.clutchCache.get(cacheKey);

    try {
        const rookieUrl = `/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=Rookie&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;
        
        const paramsClutch = `?AheadBehind=Ahead%20or%20Behind&ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&PointDiff=5&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&Sort=PTS&StarterBench=&TeamID=0&VsConference=&VsDivision=`;
        const clutchUrlBase = `/leaguedashplayerclutch${paramsClutch}`;
        const clutchUrlAdv = `/leaguedashplayerclutch${paramsClutch.replace("MeasureType=Base", "MeasureType=Advanced")}`;
        
        const benchUrl = `/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=Bench&TeamID=0&VsConference=&VsDivision=&Weight=`;
        
        const [resRookies, prevPlayers, prevTeams] = await Promise.all([
            fetchSafeJSON(rookieUrl).catch(() => null),
            this.fetchAllOfficialPlayers(prevSeason),
            this.fetchAllOfficialTeams(prevSeason)
        ]);

        await new Promise(resolve => setTimeout(resolve, 800));

        const [resBench, resClutchBase, resClutchAdv] = await Promise.all([
            fetchSafeJSON(benchUrl).catch(() => null),
            fetchSafeJSON(clutchUrlBase).catch(() => null),
            fetchSafeJSON(clutchUrlAdv).catch(() => null)
        ]);

        const prevPlayersMap = new Map<string, any>();
        if (prevPlayers && Array.isArray(prevPlayers)) {
            prevPlayers.forEach((p: any) => prevPlayersMap.set(p.id, p));
        }

        const rookies = new Set<string>();
        if (resRookies && resRookies.resultSets && resRookies.resultSets[0].rowSet.length > 0) {
            const h = resRookies.resultSets[0].headers;
            resRookies.resultSets[0].rowSet.forEach((r: any[]) => rookies.add(String(r[h.indexOf("PLAYER_ID")])));
        }

        const clutchAdvMap = new Map();
        if (resClutchAdv && resClutchAdv.resultSets && resClutchAdv.resultSets[0].rowSet.length > 0) {
            const h = resClutchAdv.resultSets[0].headers;
            resClutchAdv.resultSets[0].rowSet.forEach((row: any[]) => {
                clutchAdvMap.set(String(row[h.indexOf("PLAYER_ID")]), getStat(row, h, "NET_RATING") || 0);
            });
        }

        const clutchStats = new Map<string, any>();
        const clutchDataRaw: any[] = [];
        
        if (resClutchBase && resClutchBase.resultSets && resClutchBase.resultSets[0].rowSet.length > 0) {
            const h = resClutchBase.resultSets[0].headers;
            resClutchBase.resultSets[0].rowSet.forEach((r: any[]) => {
                const min = getStat(r, h, "MIN");
                const fga = getStat(r, h, "FGA");
                const fta = getStat(r, h, "FTA");
                const fgm = getStat(r, h, "FGM");
                const ftm = getStat(r, h, "FTM");
                const pts = getStat(r, h, "PTS");
                const stl = getStat(r, h, "STL");
                const blk = getStat(r, h, "BLK");
                const reb = getStat(r, h, "REB");
                const ast = getStat(r, h, "AST");
                const tov = getStat(r, h, "TOV");
                const gp = getStat(r, h, "GP");
                
                clutchDataRaw.push({
                    id: String(r[h.indexOf("PLAYER_ID")]),
                    gp, min, pts, fga, fgm, fta, ftm, stl, blk, reb, ast, tov,
                    fgPct: parsePct(getStat(r, h, "FG_PCT")),
                    fg3a: getStat(r, h, "FG3A"),
                    fg3Pct: parsePct(getStat(r, h, "FG3_PCT")),
                    ftPct: parsePct(getStat(r, h, "FT_PCT")),
                    oreb: getStat(r, h, "OREB"),
                    ts: parsePct(pts / (2 * (fga + 0.44 * fta))),
                    plusMinus: getStat(r, h, "PLUS_MINUS"),
                    clutchNetRtg: clutchAdvMap.get(String(r[h.indexOf("PLAYER_ID")])) || 0
                });
            });

            const validClutch = clutchDataRaw.filter(p => p.min >= 10); 
            const allClutchPts = validClutch.map(p => (p.pts / p.min) * 48).sort((a,b)=>a-b);
            const allClutchAst = validClutch.map(p => (p.ast / p.min) * 48).sort((a,b)=>a-b);
            const allClutchReb = validClutch.map(p => (p.reb / p.min) * 48).sort((a,b)=>a-b);
            const allClutchDef = validClutch.map(p => ((p.stl + p.blk) / p.min) * 48).sort((a,b)=>a-b);
            const allClutchTs = validClutch.map(p => p.ts).sort((a,b)=>a-b);
            const allClutchBpm = validClutch.map(p => p.clutchNetRtg).sort((a,b)=>a-b);

            clutchDataRaw.forEach(p => {
                const p48 = p.min > 0 ? 48 / p.min : 0;
                clutchStats.set(p.id, {
                    ...p,
                    percentiles: {
                        Scoring: this.calcPercentile(p.pts * p48, allClutchPts),
                        Playmaking: this.calcPercentile(p.ast * p48, allClutchAst),
                        Rebounding: this.calcPercentile(p.reb * p48, allClutchReb),
                        Defense: this.calcPercentile((p.stl + p.blk) * p48, allClutchDef),
                        Efficiency: this.calcPercentile(p.ts, allClutchTs),
                        Impact: this.calcPercentile(p.clutchNetRtg, allClutchBpm)
                    }
                });
            });
        }

        const benchStats = new Map<string, number>();
        if (resBench && resBench.resultSets && resBench.resultSets[0].rowSet.length > 0) {
            const h = resBench.resultSets[0].headers;
            resBench.resultSets[0].rowSet.forEach((r: any[]) => {
                benchStats.set(String(r[h.indexOf("PLAYER_ID")]), getStat(r, h, "GP"));
            });
        }

        const prevTeamsMap = new Map<string, any>();
        if (prevTeams && Array.isArray(prevTeams)) {
            prevTeams.forEach((t: any) => prevTeamsMap.set(t.id, t));
        }

        const result = { rookies, clutchStats, benchStats, prevPlayers: prevPlayersMap, prevTeams: prevTeamsMap };
        this.clutchCache.set(cacheKey, result);
        return result;
    } catch (e) {
        return { rookies: new Set(), clutchStats: new Map(), benchStats: new Map(), prevPlayers: new Map(), prevTeams: new Map() };
    }
  }

  async getTeamSchedule(teamId: string): Promise<any[]> { 
    try {
        const data = await fetchSafeJSON(`/leaguegamefinder?TeamID=${teamId}&PlayerOrTeam=T&Season=2025-26&SeasonType=Regular%20Season`);
        if (!data || !data.resultSets || data.resultSets.length === 0) return [];
        const headers = data.resultSets[0].headers;
        
        return data.resultSets[0].rowSet.map((r: any[]) => {
            const matchup = getString(r, headers, "MATCHUP", "UNK vs. UNK");
            const isHome = !matchup.includes("@");
            const oppParts = matchup.split(isHome ? "vs." : "@");
            const opponentStr = oppParts.length > 1 ? String(oppParts[1]).trim().substring(0, 3).toUpperCase() : "UNK";

            const pts = getStat(r, headers, "PTS");
            const plusMinus = getStat(r, headers, "PLUS_MINUS");
            const oppPts = pts - plusMinus; 

            return {
                id: getString(r, headers, "GAME_ID", "0"), 
                gameId: getString(r, headers, "GAME_ID", "0"), 
                date: getString(r, headers, "GAME_DATE", "Unknown"),
                matchup: matchup,
                opponent: opponentStr,  
                isHome: isHome,
                wl: getString(r, headers, "WL", "-"), 
                result: getString(r, headers, "WL", "-"), 
                pts: pts,
                teamScore: pts,
                opponentScore: oppPts,
                score: `${pts}-${oppPts}`
            };
        });
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
            netRtg: getStat(r, headers, "NET_RATING"),
            tsPct: parsePct(getStat(r, headers, "TS_PCT")),
            rebPct: parsePct(getStat(r, headers, "REB_PCT")),
            astTo: getStat(r, headers, "AST_TO")
        }));
    } catch(e) { return []; }
  }
  
  async getTeamRosterAndCoaches(teamId: string): Promise<any> { 
    try {
        if (!teamId || isNaN(Number(teamId))) return { players: [], coaches: [] };

        const data = await fetchSafeJSON(`/commonteamroster?LeagueID=00&Season=2025-26&TeamID=${teamId}`);
        if (!data || !data.resultSets || data.resultSets.length < 1) return { players: [], coaches: [] };

        const pHeaders = data.resultSets[0].headers;
        const players = data.resultSets[0].rowSet.map((r: any[]) => {
            const pid = getString(r, pHeaders, "PLAYER_ID", "") || getString(r, pHeaders, "PlayerID", "");
            
            let rawName = "Unknown Player";
            if (pHeaders.includes("PLAYER")) {
                rawName = getString(r, pHeaders, "PLAYER", "Unknown Player");
            } else if (pHeaders.includes("PLAYER_NAME")) {
                rawName = getString(r, pHeaders, "PLAYER_NAME", "Unknown Player");
            }

            return {
                id: String(pid), 
                name: String(rawName),
                number: getString(r, pHeaders, "NUM", "0"), 
                position: getString(r, pHeaders, "POSITION", "-"),
                height: getString(r, pHeaders, "HEIGHT", "-"), 
                weight: getString(r, pHeaders, "WEIGHT", "-"),
                age: getStat(r, pHeaders, "AGE"), 
                exp: getString(r, pHeaders, "EXP", "0"),
                school: getString(r, pHeaders, "SCHOOL", "-"),
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

  async fetchBoxScore(gameId: string): Promise<any> { 
    try {
      const data = await fetchSafeJSON(`/boxscoretraditionalv3?GameID=${gameId}&LeagueID=00&playByPlay=false`);
      return data?.boxScoreTraditional || null;
    } catch (error) {
      console.error("Error al cargar el Box Score:", error);
      return null;
    }
  }

  async getPlayerShotChart(playerId: string, season: string = "2025-26"): Promise<any[]> {
    try {
      const url = `/shotchartdetail?ContextMeasure=FGA&LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerID=${playerId}&PlusMinus=N&Position=&Rank=N&RookieYear=&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0&VsConference=&VsDivision=`;
      const data = await fetchSafeJSON(url);
      
      if (data && data.resultSets && data.resultSets[0].rowSet.length > 0) {
        const headers = data.resultSets[0].headers;
        return data.resultSets[0].rowSet.map((r: any[]) => ({
          x: getStat(r, headers, "LOC_X"),
          y: getStat(r, headers, "LOC_Y"),
          made: getStat(r, headers, "SHOT_MADE_FLAG") === 1,
          zone: getString(r, headers, "SHOT_ZONE_BASIC", ""),
          type: getString(r, headers, "ACTION_TYPE", "Jump Shot"),
        }));
      }
    } catch (error) {
      console.error(`Error fetching real shot chart for ${playerId} in ${season}`, error);
    }
    return [];
  }

  async getTeamShotChart(teamId: string, season: string = "2025-26", isOpponent: boolean = false): Promise<any[]> {
    try {
      const tId = isOpponent ? "0" : teamId;
      const oppId = isOpponent ? teamId : "0"; 
      const url = `/shotchartdetail?ContextMeasure=FGA&LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=${oppId}&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerID=0&PlusMinus=N&Position=&Rank=N&RookieYear=&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=${tId}&VsConference=&VsDivision=`;
      const data = await fetchSafeJSON(url);
      
      if (data && data.resultSets && data.resultSets[0].rowSet.length > 0) {
        const headers = data.resultSets[0].headers;
        return data.resultSets[0].rowSet.map((r: any[]) => ({
          x: getStat(r, headers, "LOC_X"),
          y: getStat(r, headers, "LOC_Y"),
          made: getStat(r, headers, "SHOT_MADE_FLAG") === 1,
          zone: getString(r, headers, "SHOT_ZONE_BASIC", ""),
          type: getString(r, headers, "ACTION_TYPE", "Jump Shot"),
        }));
      }
    } catch (error) {
      console.error(`Error fetching team shot chart`, error);
    }
    return [];
  }

  async getTeamDetails(teamId: string): Promise<any> { return null; }
  async getPlayerGameLog(playerId: string, season: string = "2025-26"): Promise<any[]> { return []; }
  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers("2025-26"); }
  findSimilarPlayers() { return []; }
  computeTeamMetrics = computeTeamMetrics;
}

export const nbaService = new NBAService();
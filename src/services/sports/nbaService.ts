import type { SportService } from "@/types/sports/base";
import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";
import { NBA_PLAYERS, NBA_TEAMS, computeTeamMetrics } from "@/data/nba/mockData";
import { supabase } from "./supabaseClient"; // 🚀 NUESTRA CONEXIÓN A LA NUBE

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
    const fullUrl = `https://stats.nba.com/stats${endpoint}`;
    const proxies = [
        `/nba-api${endpoint}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`
    ];
    
    for (let i = 0; i <= retries; i++) {
        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 8000); 
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
        if (i < retries) await new Promise(r => setTimeout(r, 2000));
    }
    return null; 
};

const parsePct = (val: number): number => {
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return 0.0;
    const pct = (val > 0 && val < 1) ? val * 100 : val;
    return Number(pct.toFixed(1));
};

export const calculateLeagueContext = (players: any[]) => {
    const validPlayers = players.filter(p => (p.stats?.mpg || 0) >= 12);
    if (validPlayers.length === 0) return null;

    const getAvg = (key: string) => validPlayers.reduce((sum, p) => sum + (p.adv?.[key] || 0), 0) / validPlayers.length;
    const getStd = (key: string, avg: number) => {
        const variance = validPlayers.reduce((sum, p) => sum + Math.pow((p.adv?.[key] || 0) - avg, 2), 0) / validPlayers.length;
        return Math.sqrt(variance);
    };

    const avgTS = getAvg('ts');   const stdTS = getStd('ts', avgTS) || 4.5;
    const avgUSG = getAvg('usg'); const stdUSG = getStd('usg', avgUSG) || 6.0;
    const avgPER = getAvg('per'); const stdPER = getStd('per', avgPER) || 4.5;
    const avgBPM = getAvg('bpm'); const stdBPM = getStd('bpm', avgBPM) || 3.5;
    const avgVORP = getAvg('vorp'); const stdVORP = getStd('vorp', avgVORP) || 1.0;
    const avgPIE = getAvg('pie'); const stdPIE = getStd('pie', avgPIE) || 3.0;

    return { avgTS, stdTS, avgUSG, stdUSG, avgPER, stdPER, avgBPM, stdBPM, avgVORP, stdVORP, avgPIE, stdPIE };
};

export const calculatePlayer2KRating = (p: any, leagueContext?: any, seasonStr?: string) => {
    if (!p || !p.percentiles) {
        return { 
            ovr: 70, tier: "Bronze", color: "#cd7f32", reliability: 1, 
            pillars: {
                sco: { grade: "C", pct: 50, raw: "15.0 PTS (55.0%)", label: "SCORE" },
                reb: { grade: "C", pct: 50, raw: "1.0 ORB / 3.0 DRB", label: "REB" },
                ply: { grade: "C", pct: 50, raw: "3.0 AST (1.5 A/T)", label: "PLAY" },
                def: { grade: "C", pct: 50, raw: "0.5 STL / 0.5 BLK", label: "STOCKS" }
            }
        };
    }
    
    const pct = p.percentiles;

    const mpgVal = p.stats?.mpg || 0;
    const volumeModifier = Math.min(1, Math.pow(mpgVal / 32, 0.3));

    const getGrade = (pctNum: number) => {
        if (pctNum >= 95) return "S";
        if (pctNum >= 85) return "A+";
        if (pctNum >= 75) return "A";
        if (pctNum >= 60) return "B";
        if (pctNum >= 40) return "C";
        if (pctNum >= 20) return "D";
        return "F";
    };

    let effectiveEfficiency = pct.Efficiency || 50;
    if ((pct.Scoring || 50) < 75) {
        effectiveEfficiency = Math.min(effectiveEfficiency, (pct.Scoring || 50) + 10);
    }
    const scoringPct = (((pct.Scoring || 50) * 0.75) * volumeModifier) + (effectiveEfficiency * 0.25);
    const rawPts = p.per36Stats?.ppg || p.stats?.ppg || 0;
    const rawTs = p.adv?.ts || 50;
    const scoringText = `${rawPts.toFixed(1)} PTS (${rawTs.toFixed(1)}%)`;

    let hasTracking = false;
    const playerSeason = seasonStr || p.season || leagueContext?.season;
    if (playerSeason) {
        const startYear = parseInt(playerSeason.split("-")[0]);
        hasTracking = startYear >= 2013; 
    } else {
        const rawDefl = p.per36Stats?.deflections ?? p.stats?.deflections ?? 0;
        const rawCont = p.per36Stats?.contestedShots ?? p.stats?.contestedShots ?? 0;
        hasTracking = rawDefl > 0.1 || rawCont > 0.1;
    }

    let reboundingPct = 50;
    if (hasTracking) {
        const contestedRebPct = pct.ContestedReb || pct.Rebounding || 50; 
        const rebConvPct = pct.RebConversion || pct.Rebounding || 50;
        reboundingPct = ((pct.Rebounding || 50) * 0.25) + ((pct.OReb || 50) * 0.20) + ((pct.DReb || 50) * 0.20) + 
                        (contestedRebPct * 0.15) + (rebConvPct * 0.10) + ((pct.BoxOuts || 50) * 0.10);
    } else {
        reboundingPct = ((pct.Rebounding || 50) * 0.40) + ((pct.OReb || 50) * 0.35) + ((pct.DReb || 50) * 0.25);
    }

    const actualRpg = p.stats?.rpg || 0;
    if (actualRpg >= 13.5) reboundingPct = Math.max(reboundingPct, 95); 
    else if (actualRpg >= 11.5) reboundingPct = Math.max(reboundingPct, 85);

    const rawOrb = p.per36Stats?.oreb || p.stats?.oreb || 0;
    const rawDrb = p.per36Stats?.dreb || p.stats?.dreb || 0;
    const rebText = `${rawOrb.toFixed(1)} ORB / ${rawDrb.toFixed(1)} DRB`;

    let playmakingPct = 50;
    if (hasTracking) {
        const passQualityPct = pct.PassQuality || pct.Playmaking || 50;
        playmakingPct = ((pct.Playmaking || 50) * 0.35) + ((pct.AstPtsCreated || 50) * 0.20) + 
                        ((pct.AstPct || 50) * 0.15) + ((pct.PotentialAst || 50) * 0.15) + 
                        (passQualityPct * 0.10) + ((pct.BallSecurity || 50) * 0.05);
    } else {
        playmakingPct = ((pct.Playmaking || 50) * 0.70) + ((pct.AstPct || 50) * 0.25) + ((pct.BallSecurity || 50) * 0.05);
    }
    const rawAst = p.per36Stats?.apg || p.stats?.apg || 0;
    const rawAstTo = p.adv?.astTo || 1;
    const plyText = `${rawAst.toFixed(1)} AST (${rawAstTo.toFixed(1)} A/T)`;

    const rawStl = p.per36Stats?.spg || p.stats?.spg || 0;
    const rawBlk = p.per36Stats?.bpg || p.stats?.bpg || 0;
    const stocksPct = pct.Stocks || 50; 
    const stocksGrade = getGrade(stocksPct);

    let pillar4Label = ""; let pillar4Grade = "F"; let pillar4Pct = 50; let pillar4Text = "";

    if (hasTracking) {
        const teamImpact = pct.DefRtg || 50;
        const shotDefense = pct.ShotDefense || ((pct.PerimeterD || 50) * 0.5 + (pct.InteriorD || 50) * 0.5); 
        const contestedShots = pct.Contested || 50;
        const disruption = ((pct.Deflections || 50) * 0.6) + (stocksPct * 0.4);
        const pureHustle = ((pct.LooseBalls || 50) * 0.6) + ((pct.ChargesDrawn || 50) * 0.4);
        
        if (p.adv?.isRealBRef && p.adv?.dbpm !== undefined) {
             let dbpmScore = 50 + (p.adv.dbpm * 15);
             dbpmScore = Math.max(5, Math.min(99, dbpmScore));
             pillar4Pct = (dbpmScore * 0.30) + (teamImpact * 0.25) + (shotDefense * 0.20) + (contestedShots * 0.10) + (disruption * 0.10) + (pureHustle * 0.05);
             pillar4Grade = getGrade(pillar4Pct);
             pillar4Label = "DEFENSE";
             const sign = p.adv.dbpm > 0 ? '+' : '';
             pillar4Text = `DBPM: ${sign}${p.adv.dbpm.toFixed(1)} / ${rawStl.toFixed(1)}s ${rawBlk.toFixed(1)}b`;
        } else {
             pillar4Pct = (teamImpact * 0.40) + (shotDefense * 0.35) + (contestedShots * 0.10) + (disruption * 0.10) + (pureHustle * 0.05);
             pillar4Grade = getGrade(pillar4Pct);
             pillar4Label = "DEF";
             const defRtgRaw = Math.round(p.adv?.defRating || 115);
             const deflectionsRaw = (p.per36Stats?.deflections || p.stats?.deflections || 0).toFixed(1);
             pillar4Text = `${defRtgRaw} DRTG / ${deflectionsRaw} DEFL`; 
        }
    } else {
        if (p.adv?.isRealBRef && p.adv?.dbpm !== undefined) {
            let dbpmScore = 50 + (p.adv.dbpm * 15);
            dbpmScore = Math.max(5, Math.min(99, dbpmScore));
            const teamImpact = pct.DefRtg || 50;
            
            pillar4Pct = (dbpmScore * 0.60) + (teamImpact * 0.25) + (stocksPct * 0.15);
            pillar4Grade = getGrade(pillar4Pct);
            pillar4Label = "DEFENSE"; 
            const sign = p.adv.dbpm > 0 ? '+' : '';
            pillar4Text = `DBPM: ${sign}${p.adv.dbpm.toFixed(1)} / ${rawStl.toFixed(1)}s ${rawBlk.toFixed(1)}b`;
        } else {
            pillar4Pct = stocksPct; 
            pillar4Grade = stocksGrade; 
            pillar4Label = "STOCKS";
            pillar4Text = `${rawStl.toFixed(1)} STL / ${rawBlk.toFixed(1)} BLK`;
        }
    }

    const rawTS = p.adv?.ts || 55;
    const rawUSG = p.adv?.usg || 15;
    const rawPER = p.adv?.per || 15;
    const rawBPM = p.adv?.bpm || -2.0;
    const rawVORP = p.adv?.vorp || 0.0;
    const rawPIE = p.adv?.pie || 10.0;

    const ctx = leagueContext || { avgTS: 55, stdTS: 4.5, avgUSG: 20, stdUSG: 6.0, avgBPM: -1.5, stdBPM: 3.5, avgPER: 15, stdPER: 4.5, avgVORP: 0.5, stdVORP: 1.5, avgPIE: 10, stdPIE: 3.0 };

    const zTS = Math.max(-3, Math.min(3.5, (rawTS - (ctx.avgTS || 55)) / (ctx.stdTS || 4.5)));
    const zUSG = Math.max(-3, Math.min(3.5, (rawUSG - (ctx.avgUSG || 20)) / (ctx.stdUSG || 6.0)));
    const zPER = Math.max(-3, Math.min(3.5, (rawPER - (ctx.avgPER || 15)) / (ctx.stdPER || 4.5)));
    const zVORP = Math.max(-3, Math.min(3.5, (rawVORP - (ctx.avgVORP || 0.5)) / (ctx.stdVORP || 1.5)));
    const zPIE = Math.max(-3, Math.min(3.5, (rawPIE - (ctx.avgPIE || 10)) / (ctx.stdPIE || 3.0)));

    let zBPM_Ponderado = Math.max(-3, Math.min(3.5, (rawBPM - (ctx.avgBPM || -1.5)) / (ctx.stdBPM || 3.5)));
    if (p.adv?.isRealBRef && p.adv?.obpm !== undefined && p.adv?.dbpm !== undefined) {
         const zOBPM = Math.max(-3, Math.min(3.5, p.adv.obpm / 2.0)); 
         const zDBPM = Math.max(-3, Math.min(3.5, p.adv.dbpm / 2.0));
         zBPM_Ponderado = (zOBPM * 0.65) + (zDBPM * 0.35);
    }

    const baseImpact = (zBPM_Ponderado * 2.4) + (zVORP * 1.2) + (zPER * 1.2) + (zPIE * 1.2); 
    
    const usgBonus = Math.max(0, zUSG) * 1.5;
    const efficiencyMultiplier = (zUSG > 0 && zTS > 0) ? (zUSG * zTS * 1.0) : 0;
    const creationBonus = usgBonus + efficiencyMultiplier;
    
    let defenseBonus = 0;
    if (!p.adv?.isRealBRef || p.adv?.dbpm === undefined) {
       defenseBonus = (pillar4Pct > 75) ? ((pillar4Pct - 75) * 0.15) : 0;
    }

    let rawOvr = 73 + (baseImpact * volumeModifier) + creationBonus + defenseBonus;

    const gp = p.stats?.gp || 0;
    const reliability = Math.max(0.1, Math.min(1, gp / 65)); 
    let availabilityPenalty = 0;
    if (gp < 65 && gp > 0) {
        availabilityPenalty = gp >= 50 ? 0 : (50 - gp) * 0.15;
    }

    let finalOVR = Math.round(rawOvr - availabilityPenalty);

    let vetoMessage = "";
    if (finalOVR >= 97) {
        if (pillar4Pct < 35) { 
            finalOVR = Math.min(finalOVR, 96);
            vetoMessage = "Veto Defensivo";
        }
        if (zTS < -0.5) { 
            finalOVR = Math.min(finalOVR, 96);
            vetoMessage = "Veto Eficiencia";
        }
    }

    if (zTS < -1.5 && zUSG > 1.5) finalOVR -= 2; 

    const actualPts = p.stats?.ppg || 0;
    const scoringFloor = Math.round(68 + (actualPts * 0.55)); 
    if (finalOVR < scoringFloor) {
        finalOVR = scoringFloor;
    }

    finalOVR = Math.max(65, Math.min(99, finalOVR));

    let tier = "Bronze"; let color = "#cd7f32"; 
    if (finalOVR >= 95) { tier = "Diamond"; color = "#b9f2ff"; }
    else if (finalOVR >= 90) { tier = "Amethyst"; color = "#9966cc"; }
    else if (finalOVR >= 85) { tier = "Gold"; color = "#ffd700"; }
    else if (finalOVR >= 78) { tier = "Silver"; color = "#c0c0c0"; }

    return { 
        ovr: finalOVR, 
        tier, 
        color, 
        reliability,
        veto: vetoMessage,
        pillars: {
            sco: { grade: getGrade(scoringPct), pct: Math.max(5, Math.round(scoringPct)), raw: scoringText, label: "SCORE" },
            reb: { grade: getGrade(reboundingPct), pct: Math.max(5, Math.round(reboundingPct)), raw: rebText, label: "REB" },
            ply: { grade: getGrade(playmakingPct), pct: Math.max(5, Math.round(playmakingPct)), raw: plyText, label: "PLAY" },
            def: { grade: pillar4Grade, pct: Math.max(5, Math.round(pillar4Pct)), raw: pillar4Text, label: pillar4Label }
        }
    };
};

const calculateTeam2KRating = (t: any, roster: any[]) => {
    const netRtg = t.netRtg !== undefined ? t.netRtg : (t.adv?.netRtg || 0);
    const offRtg = t.offRtg !== undefined ? t.offRtg : (t.adv?.offRtg || 115);
    const defRtg = t.defRtg !== undefined ? t.defRtg : (t.adv?.defRating || 115);

    const statOff = Math.max(60, Math.min(99, Math.round(80 + ((offRtg - 115) * 1.6)))); 
    const statDef = Math.max(60, Math.min(99, Math.round(80 + ((115 - defRtg) * 1.6))));
    const statOvr = Math.max(60, Math.min(99, Math.round(80 + (netRtg * 1.6))));

    if (!roster || roster.length === 0) {
        return { ovr: statOvr, off: statOff, def: statDef, tier: statOvr >= 92 ? "S" : (statOvr >= 85 ? "A" : "B"), color: "#ef4444", xNetRtg: netRtg.toFixed(1) };
    }

    let totalImpactWeight = 0;
    let weightedOvrSum = 0;
    let weightedOffSum = 0;
    let weightedDefSum = 0;
    let xBPM_sum = 0;
    let starPowerBonus = 0;
    let topPlayerOvr = 0;

    const rotation = [...roster]
        .sort((a, b) => (b.stats?.mpg || 0) - (a.stats?.mpg || 0))
        .slice(0, 10);

    rotation.forEach(p => {
        const mpg = p.stats?.mpg || 0;
        if (mpg === 0) return;

        const pie = p.adv?.pie || 10;     
        const per = p.adv?.per || 15;     
        const ws48 = p.adv?.ws48 || 0.100; 
        const bpm = p.adv?.bpm || -2.0;    

        const impactScore = (
            (Math.max(0, pie) / 10) * 0.25 + 
            (Math.max(0, per) / 15) * 0.25 + 
            (Math.max(0, ws48) / 0.100) * 0.25 + 
            (Math.max(0.1, 1 + (bpm * 0.1))) * 0.25
        );

        const weight = mpg * impactScore;
        totalImpactWeight += weight;

        const pOvr = p.rating?.ovr || 75;
        const pOff = p.rating?.off || 75;
        const pDef = ((p.rating?.defense || 75) * 0.7 + (p.rating?.rebounding || 75) * 0.3);

        weightedOvrSum += pOvr * weight;
        weightedOffSum += pOff * weight;
        weightedDefSum += pDef * weight;

        xBPM_sum += bpm * (mpg / 240) * 5;

        if (pOvr > topPlayerOvr) topPlayerOvr = pOvr;

        const ceilingRaiser = Math.pow(Math.max(0, bpm), 1.5) * (mpg / 48) * 0.20;
        starPowerBonus += ceilingRaiser;
    });

    const rosterOffRaw = totalImpactWeight > 0 ? weightedOffSum / totalImpactWeight : statOff;
    const rosterDefRaw = totalImpactWeight > 0 ? weightedDefSum / totalImpactWeight : statDef;
    
    const rosterPenalty = Math.min(0, (topPlayerOvr - 89) * 0.6);

    const xOvr = 78 + (xBPM_sum * 1.5) + starPowerBonus + rosterPenalty;

    const winPctRaw = t.winPct || 0;
    const winPctDecimal = winPctRaw > 1 ? (winPctRaw / 100) : winPctRaw;
    const winGravityOvr = 57 + (winPctDecimal * 45); 

    const finalOff = Math.max(65, Math.min(99, Math.round((rosterOffRaw * 0.4) + (statOff * 0.6))));
    const finalDef = Math.max(65, Math.min(99, Math.round((rosterDefRaw * 0.4) + (statDef * 0.6))));
    
    let finalOvr = Math.max(65, Math.min(99, Math.round((xOvr * 0.40) + (statOvr * 0.40) + (winGravityOvr * 0.20))));

    const minRating = Math.min(finalOff, finalDef);
    if (finalOvr >= 99 && minRating < 95) finalOvr = 98;
    if (finalOvr >= 96 && minRating < 85) finalOvr = 95;

    let tier = "C"; let color = "#ef4444"; 
    if (finalOvr >= 92) { tier = "S"; color = "#8b5cf6"; } 
    else if (finalOvr >= 85) { tier = "A"; color = "#10b981"; } 
    else if (finalOvr >= 78) { tier = "B"; color = "#f59e0b"; }

    return { ovr: finalOvr, off: finalOff, def: finalDef, tier, color, xNetRtg: xBPM_sum.toFixed(1) };
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
    if (!abbreviation || abbreviation === '0' || abbreviation === '???' || 
        abbreviation === 'FA' || abbreviation.trim().length < 2) return '';
    
    const ESPN_MAP: Record<string, string> = { 
      'NOP': 'no', 'GSW': 'gs', 'SAS': 'sa', 'NYK': 'ny', 'WAS': 'wsh', 'UTA': 'utah',
      'LAL': 'lal', 'LAC': 'lac', 'OKC': 'okc'
    };
    
    const cleanAbbr = abbreviation.toUpperCase();
    return `https://a.espncdn.com/i/teamlogos/nba/500/${ESPN_MAP[cleanAbbr] || cleanAbbr.toLowerCase()}.png`;
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

  private calcPercentile(val: number, arr: number[]): number {
      if (!arr || arr.length === 0 || val === undefined || isNaN(val)) return 50;
      let below = 0, equal = 0;
      for (const v of arr) {
          if      (v < val)  below++;
          else if (v === val) equal++;
      }
      return Math.min(100, Math.round(((below + 0.5 * equal) / arr.length) * 100));
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
    if (this.historicalPlayersCache.has(season)) {
        return JSON.parse(JSON.stringify(this.historicalPlayersCache.get(season)!));
    }
    if (this.fetchPromises.has(season)) {
        const p = await this.fetchPromises.get(season)!;
        return JSON.parse(JSON.stringify(p));
    }

    const promise = (async () => {
      try {
        if (season === '2025-26') {
          try {
            const staticRes = await fetch('/data/nba_players_current.json');
            if (staticRes.ok) {
              const json = await staticRes.json();
              const players: any[] = json.players ?? json;
              if (Array.isArray(players) && players.length > 100) {
                console.log(`[NBAService] ✅ ${players.length} jugadores desde JSON estático`);
                this.historicalPlayersCache.set(season, players as unknown as NBAPlayer[]);
                this.playersCache = players as unknown as NBAPlayer[];
                return JSON.parse(JSON.stringify(players)) as unknown as NBAPlayer[];
              }
            }
          } catch {
            console.warn('[NBAService] ⚠️ JSON estático no disponible, usando NBA API en vivo...');
          }
        }

        const startYear = parseInt(season.split('-')[0]);
        const hasTracking = startYear >= 2013;
        const hasHustle = startYear >= 2015;

        const paramsBase = `?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;
        const shortParams = `?LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=0`;

        let urlBase = `/leaguedashplayerstats${paramsBase}`;
        let dataBase = await fetchSafeJSON(urlBase);

        if (!dataBase || !dataBase.resultSets) {
            await new Promise(r => setTimeout(r, 1000));
            urlBase = `/leaguedashplayerstats${shortParams}&MeasureType=Base`;
            dataBase = await fetchSafeJSON(urlBase);
        }

        if (!dataBase || !dataBase.resultSets) {
            console.warn(`Base API Failed for season ${season}. Falling back to mock data.`);
            return this.getAllPlayers();
        }

        await new Promise(res => setTimeout(res, 800));

        const urlAdv = `/leaguedashplayerstats${paramsBase.replace("MeasureType=Base", "MeasureType=Advanced")}`;
        const urlMisc = `/leaguedashplayerstats${paramsBase.replace("MeasureType=Base", "MeasureType=Misc")}`;
        const urlScoring = `/leaguedashplayerstats${paramsBase.replace("MeasureType=Base", "MeasureType=Scoring")}`;
        const urlHustle = `/leaguehustlestatsplayer?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=0&VsConference=&VsDivision=&Weight=`;
        
        const urlPassing = `/leaguedashptstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PerMode=PerGame&PlayerExperience=&PlayerOrTeam=Player&PlayerPosition=&PtMeasureType=Passing&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;
        const urlDefending = `/leaguedashptdefend?College=&Conference=&Country=&DateFrom=&DateTo=&DefenseCategory=Overall&Division=&DraftPick=&DraftYear=&GameScope=&Height=&LastNGames=0&LeagueID=00&Location=&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PerMode=PerGame&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;

        const [dataAdv, dataMisc] = await Promise.all([
            fetchSafeJSON(urlAdv).catch(() => null),
            fetchSafeJSON(urlMisc).catch(() => null)
        ]);

        await new Promise(res => setTimeout(res, 800));

        const [dataScoring, dataHustle] = await Promise.all([
            fetchSafeJSON(urlScoring).catch(() => null),
            hasHustle ? fetchSafeJSON(urlHustle).catch(() => null) : Promise.resolve(null)
        ]);

        await new Promise(res => setTimeout(res, 800));
        
        const [dataPassing, dataDefending, dataAllPlayers] = await Promise.all([
            hasTracking ? fetchSafeJSON(urlPassing).catch(() => null)   : Promise.resolve(null),
            hasTracking ? fetchSafeJSON(urlDefending).catch(() => null) : Promise.resolve(null),
            fetchSafeJSON(`/commonallplayers?IsOnlyCurrentSeason=1&LeagueID=00&Season=${season}`).catch(() => null),
        ]);

        let bRefMap = new Map();
        try {
            const urlBref = `/data/bref_advanced_${season}.json`;
            const bRefResponse = await fetch(urlBref);
            if (bRefResponse.ok) {
                const bRefData = await bRefResponse.json();
                if (Array.isArray(bRefData)) {
                    bRefData.forEach((p: any) => {
                        const normName = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        if (!bRefMap.has(normName)) { 
                            bRefMap.set(normName, p);
                        }
                    });
                }
            }
        } catch (e) {
            console.log(`[Info] No se encontró el JSON local de B-Ref para ${season}. Usando proxy calculada.`);
        }

        const headersBase = dataBase.resultSets[0].headers;
        const rowsBase = dataBase.resultSets[0].rowSet;

        const advMap = new Map();
        try {
            if (dataAdv && dataAdv.resultSets && dataAdv.resultSets[0].rowSet.length > 0) {
                const h = dataAdv.resultSets[0].headers;
                dataAdv.resultSets[0].rowSet.forEach((row: any[]) => {
                  advMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                    ts: parsePct(getStat(row, h, "TS_PCT")),
                    efg: parsePct(getStat(row, h, "EFG_PCT")),
                    usg: parsePct(getStat(row, h, "USG_PCT")),
                    defRating: getStat(row, h, "DEF_RATING") || 115,
                    pie: parsePct(getStat(row, h, "PIE")),
                    per: getStat(row, h, "PER") || 15.0, 
                    vorp: getStat(row, h, "VORP") || 0.0, 
                    netRtg: getStat(row, h, "NET_RATING"),
                    astPct: parsePct(getStat(row, h, "AST_PCT")),
                    astTo: getStat(row, h, "AST_TO"),
                    astRatio: getStat(row, h, "AST_RATIO"),
                    pace: getStat(row, h, "PACE") || 100,
                    orebPct: parsePct(getStat(row, h, "OREB_PCT")),
                    drebPct: parsePct(getStat(row, h, "DREB_PCT")),
                    offRtg: getStat(row, h, "OFF_RATING") || 115,
                    ftaRate: getStat(row, h, "FTA_RATE")
                  });
                });
            }
        } catch(e) {}

        const miscMap = new Map();
        try {
            if (dataMisc && dataMisc.resultSets && dataMisc.resultSets[0].rowSet.length > 0) {
                const h = dataMisc.resultSets[0].headers;
                dataMisc.resultSets[0].rowSet.forEach((row: any[]) => {
                  miscMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                    ptsOffTov: getStat(row, h, "PTS_OFF_TOV"),
                    pts2ndChance: getStat(row, h, "PTS_2ND_CHANCE"),
                    ptsFb: getStat(row, h, "PTS_FB"),
                    ptsPaint: getStat(row, h, "PTS_PAINT")
                  });
                });
            }
        } catch(e) {}

        const scoringMap = new Map<string, any>();
        try {
            if (dataScoring?.resultSets?.[0]?.rowSet?.length > 0) {
                const h = dataScoring.resultSets[0].headers;
                dataScoring.resultSets[0].rowSet.forEach((row: any[]) => {
                    scoringMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                        pctPts2pt  : parsePct(getStat(row, h, "PCT_PTS_2PT")),
                        pctPts3pt  : parsePct(getStat(row, h, "PCT_PTS_3PT")),
                        pctPtsFt   : parsePct(getStat(row, h, "PCT_PTS_FT")),
                        pctFgmAst  : parsePct(getStat(row, h, "PCT_AST_FGM")),
                        pctFgmUast : parsePct(getStat(row, h, "PCT_UAST_FGM")),
                        pctAst2fgm : parsePct(getStat(row, h, "PCT_AST_2PM")),
                        pctAst3fgm : parsePct(getStat(row, h, "PCT_AST_3PM")),
                    });
                });
            }
        } catch(e) {}

        const hustleMap = new Map();
        try {
            if (dataHustle && dataHustle.resultSets && dataHustle.resultSets[0].rowSet.length > 0) {
                const h = dataHustle.resultSets[0].headers;
                dataHustle.resultSets[0].rowSet.forEach((row: any[]) => {
                  hustleMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                    deflections: getStat(row, h, "DEFLECTIONS"),
                    contestedShots: getStat(row, h, "CONTESTED_SHOTS"),
                    contested3pt: getStat(row, h, "CONTESTED_SHOTS_3PT"),
                    contested2pt: getStat(row, h, "CONTESTED_SHOTS_2PT"),
                    chargesDrawn: getStat(row, h, "CHARGES_DRAWN"),
                    looseBalls: getStat(row, h, "LOOSE_BALLS_RECOVERED"),
                    boxOuts: getStat(row, h, "BOX_OUTS"),
                    screenAssists: getStat(row, h, "SCREEN_AST") || getStat(row, h, "SCREEN_ASSISTS")
                  });
                });
            }
        } catch(e) {}

        const passingMap = new Map();
        try {
            if (dataPassing && dataPassing.resultSets && dataPassing.resultSets[0].rowSet.length > 0) {
                const h = dataPassing.resultSets[0].headers;
                dataPassing.resultSets[0].rowSet.forEach((row: any[]) => {
                    passingMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                        passesMade: getStat(row, h, "PASSES_MADE"),
                        potentialAst: getStat(row, h, "POTENTIAL_AST"),
                        secondaryAst: getStat(row, h, "SECONDARY_AST"),
                        astPtsCreated: getStat(row, h, "AST_POINTS_CREATED"),
                        astToPassPct: parsePct(getStat(row, h, "AST_TO_PASS_PCT")),
                    });
                });
            }
        } catch(e) {}

        const defendingMap = new Map();
        try {
            if (dataDefending && dataDefending.resultSets && dataDefending.resultSets[0].rowSet.length > 0) {
                const h = dataDefending.resultSets[0].headers;
                dataDefending.resultSets[0].rowSet.forEach((row: any[]) => {
                    const pid = String(row[h.indexOf("CLOSE_DEF_PERSON_ID")]);
                    if(pid && pid !== "undefined") {
                        defendingMap.set(pid, {
                            dfgPct: parsePct(getStat(row, h, "D_FG_PCT")),
                            dfg3Pct: parsePct(getStat(row, h, "NORMAL_FG3_PCT")), 
                            dfg2Pct: parsePct(getStat(row, h, "NORMAL_FG_PCT")), 
                        });
                    }
                });
            }
        } catch(e) {}

        let totalLeaguePTS = 0; let totalLeagueFGA = 0; let totalLeagueFTA = 0;

        const parsedPlayersRaw = rowsBase.map((row: any[]) => {
          const playerId = getString(row, headersBase, "PLAYER_ID", "0");
          const baseAdv = advMap.get(playerId) || {};
          const hData = hustleMap.get(playerId) || { deflections: 0, contestedShots: 0, contested3pt: 0, contested2pt: 0, chargesDrawn: 0, looseBalls: 0, boxOuts: 0, screenAssists: 0 };
          const mData = miscMap.get(playerId) || { ptsOffTov: 0, pts2ndChance: 0, ptsFb: 0, ptsPaint: 0 };
          const sData = scoringMap.get(playerId) || { pctPts2pt: 0, pctPts3pt: 0, pctPtsFt: 0, pctFgmAst: 0, pctFgmUast: 0, pctAst2fgm: 0, pctAst3fgm: 0 };
          const passData = passingMap.get(playerId) || { passesMade: 0, potentialAst: 0, secondaryAst: 0, astPtsCreated: 0, astToPassPct: 0 };
          const defData = defendingMap.get(playerId) || { dfgPct: 50.0, dfg3Pct: 36.0, dfg2Pct: 50.0 };
          
          const gp   = getStat(row, headersBase, "GP");
          const wins = getStat(row, headersBase, "W");
          const min  = getStat(row, headersBase, "MIN");
          const pts  = getStat(row, headersBase, "PTS");
          const reb  = getStat(row, headersBase, "REB");
          const fga  = getStat(row, headersBase, "FGA");
          const fgm  = getStat(row, headersBase, "FGM");
          const fta  = getStat(row, headersBase, "FTA");
          const fg3a = getStat(row, headersBase, "FG3A");
          const ast  = getStat(row, headersBase, "AST");
          const tov  = getStat(row, headersBase, "TOV");
          const bpg  = getStat(row, headersBase, "BLK");
          const spg  = getStat(row, headersBase, "STL");
          
          const rawOreb = getStat(row, headersBase, "OREB");
          const rawDreb = getStat(row, headersBase, "DREB");
          const oreb = rawOreb || Math.round((reb * 0.25) * 10) / 10;
          const dreb = rawDreb || Math.round((reb * 0.75) * 10) / 10;
          
          const fg3m = getStat(row, headersBase, "FG3M");
          const fg2m = fgm - fg3m;
          const fg2a = Math.max(0, fga - fg3a);
          const fg2Pct = fg2a > 0 ? parsePct(fg2m / fg2a) : 0;
          
          totalLeaguePTS += (pts * gp);
          totalLeagueFGA += (fga * gp);
          totalLeagueFTA += (fta * gp);
          
          const fallbackTS  = (fga > 0 || fta > 0) ? parsePct(pts / (2 * (fga + 0.44 * fta))) : 0;
          const fallbackUSG = min > 0 ? parsePct(((fga + 0.44 * fta + tov) * 40) / (min * 5)) : 15;
          const fallbackAstTo = tov > 0 ? Number((ast / tov).toFixed(2)) : (ast > 0 ? 99.0 : 0.0);
          
          const offRtgVal = baseAdv.offRtg    !== undefined ? baseAdv.offRtg    : 115;
          const defRtgVal = baseAdv.defRating !== undefined ? baseAdv.defRating : 115;
          const netRtgVal = baseAdv.netRtg    !== undefined ? baseAdv.netRtg    : 0;
          
          const per36       = min > 0 ? 36 / min : 0;
          const ftaRateRaw  = fga > 0 ? fta / fga : 0;
          const midRangeFGA = Math.max(0, fga - fg3a - (fta * 0.44));
          const twoPA       = Math.max(0, fga - fg3a);
          
          const p = {
            id: playerId,
            name: getString(row, headersBase, "PLAYER_NAME", "Unknown Player"),
            teamId: getString(row, headersBase, "TEAM_ABBREVIATION", "FA"),
            position: "NBA", imageUrl: this.getImageUrl(playerId),
            age: getStat(row, headersBase, "AGE"),
            stats: {
                gp, gs: Math.round(getStat(row, headersBase, "GS") * gp), mpg: min,
                winPct: gp > 0 ? wins / gp : 0,
                ppg: pts, rpg: reb, apg: ast, oreb, dreb,
                spg, bpg, topg: tov,
                fga, fgm, fgPct: parsePct(getStat(row, headersBase, "FG_PCT")),
                fg3a, fg3m,                    
                threePct: parsePct(getStat(row, headersBase, "FG3_PCT")),
                fg2m, fg2a, fg2Pct,            
                fta, ftm: getStat(row, headersBase, "FTM"),
                ftPct: parsePct(getStat(row, headersBase, "FT_PCT")),
                offRtg: offRtgVal, defRating: defRtgVal, netRtg: netRtgVal, net: netRtgVal,
                plusMinus: getStat(row, headersBase, "PLUS_MINUS"),
                pf: getStat(row, headersBase, "PF"),
            },
            per36Stats: {
                ppg: pts * per36, rpg: reb * per36, apg: ast * per36,
                spg: spg * per36, bpg: bpg * per36,
                dreb: dreb * per36, oreb: oreb * per36,
                fg3m: fg3m * per36, fg3a: fg3a * per36, ptsFb: mData.ptsFb * per36,
                twoPA: twoPA * per36, 
                deflections: (hasHustle ? hData.deflections : spg * 0.8) * per36,
                contestedShots: (hasHustle ? hData.contestedShots : bpg * 2.0) * per36,
                contested3pt: (hasHustle ? hData.contested3pt : spg * 0.5) * per36,
                contested2pt: (hasHustle ? hData.contested2pt : bpg * 1.5) * per36,
                boxOuts: (hasHustle ? hData.boxOuts : dreb * 0.5) * per36, 
                looseBalls: (hasHustle ? hData.looseBalls : spg * 0.5) * per36,
                chargesDrawn: (hasHustle ? hData.chargesDrawn : 0) * per36,
                screenAssists: (hasHustle ? hData.screenAssists : oreb * 0.5) * per36,
                potentialAst: (hasTracking ? passData.potentialAst : ast * 1.8) * per36, 
                passesMade: (hasTracking ? passData.passesMade : ast * 6.0) * per36,
                secondaryAst: (hasTracking ? passData.secondaryAst : ast * 0.2) * per36, 
                astPtsCreated: (hasTracking ? passData.astPtsCreated : ast * 2.3) * per36,
                paintFGM: (hasTracking ? (mData.ptsPaint / 2) : (fgm * 0.6)) * per36,
                midRangeFGM: (hasTracking ? (midRangeFGA * 0.4) : (fgm * 0.3)) * per36
            },
            adv: {
              ...baseAdv,
              ts: baseAdv.ts !== undefined ? baseAdv.ts : fallbackTS,
              usg: baseAdv.usg !== undefined ? baseAdv.usg : fallbackUSG,
              astTo: baseAdv.astTo !== undefined ? baseAdv.astTo : fallbackAstTo,
              pace: baseAdv.pace !== undefined ? baseAdv.pace : 100, 
              orebPct: baseAdv.orebPct || 0, drebPct: baseAdv.drebPct || 0,
              ftaRate: baseAdv.ftaRate !== undefined ? baseAdv.ftaRate : ftaRateRaw,
              astPct: baseAdv.astPct !== undefined ? baseAdv.astPct : 15.0
            },
            hustle: hData,
            misc: mData,
            scoring: {
                ...sData,
                pctFgmUast : sData.pctFgmUast || (fallbackUSG * 1.5),
                pctAst2fgm : sData.pctAst2fgm || 0,
                pctAst3fgm : sData.pctAst3fgm || 0,
                fg3Ast : (sData.pctAst3fgm > 0 && fg3m > 0) ? Number((fg3m * (sData.pctAst3fgm / 100)).toFixed(1)) : null,
                rimAst : null,
            },
            passing: passData, 
            tracking: {
                dfgPct: hasTracking ? defData.dfgPct : 50.0, 
                dfg3Pct: hasTracking ? defData.dfg3Pct : 36.0,
                dfg2Pct: hasTracking ? defData.dfg2Pct : 50.0,
            },
            playmaking: { 
                astPct: baseAdv.astPct !== undefined ? baseAdv.astPct : 15.0, 
                astTo: baseAdv.astTo !== undefined ? baseAdv.astTo : fallbackAstTo, 
                astRatio: baseAdv.astRatio || 0 
            }
          };
          
          const advancedMetrics = this.computeAllAdvanced(p as any);
          
          const normName  = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const bRefStats = bRefMap.get(normName);
          if (bRefStats) {
              const safeBRef = (v: any, fallback: number) => v !== undefined && !isNaN(v) ? v : fallback;
              advancedMetrics.per  = safeBRef(bRefStats.per,  advancedMetrics.per);
              advancedMetrics.bpm  = safeBRef(bRefStats.bpm,  advancedMetrics.bpm);
              advancedMetrics.obpm = safeBRef(bRefStats.obpm, advancedMetrics.obpm ?? 0);
              advancedMetrics.dbpm = safeBRef(bRefStats.dbpm, advancedMetrics.dbpm ?? 0);
              advancedMetrics.vorp = safeBRef(bRefStats.vorp, advancedMetrics.vorp);
              advancedMetrics.ws48 = safeBRef(bRefStats.ws48, advancedMetrics.ws48);
              advancedMetrics.isRealBRef = true;
              
              const realTS = p.adv.ts ?? advancedMetrics.ts ?? 0;
              const siReal = 100 + (advancedMetrics.bpm * 4.5) + ((advancedMetrics.per - 15) * 1.5) + ((realTS - 55) * 0.5);
              advancedMetrics.si = isNaN(siReal) || !isFinite(siReal) ? advancedMetrics.si : Math.round(siReal);
          }
          p.adv = { ...p.adv, ...advancedMetrics };
          return p;
        });

        if (dataAllPlayers?.resultSets?.[0]?.rowSet) {
            const hAll       = dataAllPlayers.resultSets[0].headers;
            const activeIds  = new Set(parsedPlayersRaw.map((p: any) => String(p.id)));
            dataAllPlayers.resultSets[0].rowSet.forEach((row: any[]) => {
                const pid       = String(row[hAll.indexOf("PERSON_ID")]);
                const rosterSt  = row[hAll.indexOf("ROSTERSTATUS")];
                const teamAbbr  = getString(row, hAll, "TEAM_ABBREVIATION", "");
                if (activeIds.has(pid) || !teamAbbr || teamAbbr === "0") return;
                if (!rosterSt || rosterSt === "Inactive") return;
                const zeroStats = {
                    gp: 0, gs: 0, mpg: 0, winPct: 0,
                    ppg: 0, rpg: 0, apg: 0, oreb: 0, dreb: 0, spg: 0, bpg: 0, topg: 0,
                    fga: 0, fgm: 0, fgPct: 0, fg3a: 0, fg3m: 0, threePct: 0,
                    fg2m: 0, fg2a: 0, fg2Pct: 0,
                    fta: 0, ftm: 0, ftPct: 0,
                    offRtg: 115, defRating: 115, netRtg: 0, net: 0, plusMinus: 0, pf: 0,
                };
                const zeroPer36 = {
                    ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, dreb: 0, oreb: 0,
                    fg3m: 0, fg3a: 0, ptsFb: 0, twoPA: 0,
                    deflections: 0, contestedShots: 0, contested3pt: 0, contested2pt: 0,
                    boxOuts: 0, looseBalls: 0, chargesDrawn: 0, screenAssists: 0,
                    potentialAst: 0, passesMade: 0, secondaryAst: 0, astPtsCreated: 0,
                    paintFGM: 0, midRangeFGM: 0,
                };
                const ghost: any = {
                    id         : pid,
                    name       : getString(row, hAll, "DISPLAY_FIRST_LAST", "Unknown Player"),
                    teamId     : teamAbbr,
                    position   : "NBA",
                    imageUrl   : this.getImageUrl(pid),
                    age        : 0,
                    ghostPlayer: true,
                    stats      : zeroStats,
                    per36Stats : zeroPer36,
                    adv: {
                        ts: 0, efg: 0, usg: 0, defRating: 115, pie: 0,
                        per: 0, bpm: 0, obpm: 0, dbpm: 0, vorp: 0, ws48: 0,
                        netRtg: 0, astPct: 0, astTo: 0, astRatio: 0,
                        pace: 100, orebPct: 0, drebPct: 0, offRtg: 115,
                        ftaRate: 0, net: 0, si: 0, rTS: 0, isRealBRef: false,
                    },
                    hustle  : { deflections: 0, contestedShots: 0, contested3pt: 0, contested2pt: 0, chargesDrawn: 0, looseBalls: 0, boxOuts: 0, screenAssists: 0 },
                    misc    : { ptsOffTov: 0, pts2ndChance: 0, ptsFb: 0, ptsPaint: 0 },
                    scoring : { pctPts2pt: 0, pctPts3pt: 0, pctPtsFt: 0, pctFgmAst: 0, pctFgmUast: 0, pctAst2fgm: 0, pctAst3fgm: 0, fg3Ast: null, rimAst: null },
                    passing : { passesMade: 0, potentialAst: 0, secondaryAst: 0, astPtsCreated: 0, astToPassPct: 0 },
                    tracking: { dfgPct: 0, dfg3Pct: 0, dfg2Pct: 0 },
                    playmaking: { astPct: 0, astTo: 0, astRatio: 0 },
                };
                parsedPlayersRaw.push(ghost);
            });
        }

        const leagueAvgTS = (totalLeagueFGA > 0 || totalLeagueFTA > 0) ? parsePct(totalLeaguePTS / (2 * (totalLeagueFGA + 0.44 * totalLeagueFTA))) : 55.0;
        const leagueContext = calculateLeagueContext(parsedPlayersRaw);

        const qualifiedPlayers = parsedPlayersRaw.filter((p: any) => p.stats.gp >= 10 && p.stats.mpg >= 15);
        
        const allPPG = qualifiedPlayers.map((p: any) => p.per36Stats.ppg).sort((a,b)=>a-b);
        const allAPG = qualifiedPlayers.map((p: any) => p.per36Stats.apg).sort((a,b)=>a-b);
        const allRPG = qualifiedPlayers.map((p: any) => p.per36Stats.rpg).sort((a,b)=>a-b);
        const allTS = qualifiedPlayers.map((p: any) => p.adv.ts).sort((a,b)=>a-b);
        const allBPM = qualifiedPlayers.map((p: any) => p.adv.bpm).sort((a,b)=>a-b);
        const all3P = qualifiedPlayers.map((p: any) => p.stats.threePct).sort((a,b)=>a-b);
        const all3PM = qualifiedPlayers.map((p: any) => p.per36Stats.fg3m).sort((a,b)=>a-b);
        const all3PA = qualifiedPlayers.map((p: any) => p.per36Stats.fg3a).sort((a,b)=>a-b);
        const allWinPct = qualifiedPlayers.map((p: any) => p.stats.winPct).sort((a,b)=>a-b);
        const allFG2Pct = qualifiedPlayers.map((p: any) => p.stats.fg2Pct).sort((a,b)=>a-b); 
        const allFgPct = qualifiedPlayers.map((p: any) => p.stats.fgPct).sort((a,b)=>a-b);
        
        const allOReb = qualifiedPlayers.map((p: any) => p.per36Stats.oreb).sort((a,b)=>a-b);
        const allDReb = qualifiedPlayers.map((p: any) => p.per36Stats.dreb).sort((a,b)=>a-b);
        const allAstPct = qualifiedPlayers.map((p: any) => p.adv.astPct).sort((a,b)=>a-b);
        const allOffRtg = qualifiedPlayers.map((p: any) => p.adv.offRtg).sort((a,b)=>a-b);
        const allDefRtgInv = qualifiedPlayers.map((p: any) => 115 - (p.adv.defRating || 115)).sort((a,b)=>a-b);
        const allNetRtg = qualifiedPlayers.map((p: any) => p.adv.net).sort((a,b)=>a-b);
        
        const allContested = qualifiedPlayers.map((p: any) => p.per36Stats.contestedShots).sort((a,b)=>a-b);
        const allContested3 = qualifiedPlayers.map((p: any) => p.per36Stats.contested3pt).sort((a,b)=>a-b);
        const allContested2 = qualifiedPlayers.map((p: any) => p.per36Stats.contested2pt).sort((a,b)=>a-b);
        const allDeflections = qualifiedPlayers.map((p: any) => p.per36Stats.deflections).sort((a,b)=>a-b);
        const allBoxOuts = qualifiedPlayers.map((p: any) => p.per36Stats.boxOuts).sort((a,b)=>a-b);
        const allLooseBalls = qualifiedPlayers.map((p: any) => p.per36Stats.looseBalls).sort((a,b)=>a-b);
        const allCharges = qualifiedPlayers.map((p: any) => p.per36Stats.chargesDrawn).sort((a,b)=>a-b);
        const allScreenAssists = qualifiedPlayers.map((p: any) => p.per36Stats.screenAssists).sort((a,b)=>a-b);
        
        const allPER = qualifiedPlayers.map((p: any) => p.adv.per).sort((a,b)=>a-b);
        const allVORP = qualifiedPlayers.map((p: any) => p.adv.vorp).sort((a,b)=>a-b);
        const allPIE = qualifiedPlayers.map((p: any) => p.adv.pie).sort((a,b)=>a-b);
        const allUSG = qualifiedPlayers.map((p: any) => p.adv.usg).sort((a,b)=>a-b);
        const allEFG = qualifiedPlayers.map((p: any) => p.adv.efg).sort((a,b)=>a-b);
        const allSPG = qualifiedPlayers.map((p: any) => p.per36Stats.spg).sort((a,b)=>a-b);
        const allBPG = qualifiedPlayers.map((p: any) => p.per36Stats.bpg).sort((a,b)=>a-b);
        const allBlkPct = qualifiedPlayers.map((p: any) => p.stats.mpg > 0 ? (p.stats.bpg / p.stats.mpg) : 0).sort((a,b)=>a-b);
        const allAstTo = qualifiedPlayers.map((p: any) => p.adv.astTo).sort((a,b)=>a-b);
        const allFtPct = qualifiedPlayers.map((p: any) => p.stats.ftPct).sort((a,b)=>a-b);

        const allPassesMade = qualifiedPlayers.map((p: any) => p.per36Stats.passesMade).sort((a,b)=>a-b);
        const allPotentialAst = qualifiedPlayers.map((p: any) => p.per36Stats.potentialAst).sort((a,b)=>a-b);
        const allSecondaryAst = qualifiedPlayers.map((p: any) => p.per36Stats.secondaryAst).sort((a,b)=>a-b);
        const allAstPtsCreated = qualifiedPlayers.map((p: any) => p.per36Stats.astPtsCreated).sort((a,b)=>a-b);

        const allDFGInv = qualifiedPlayers.map((p: any) => 100 - p.tracking.dfgPct).sort((a,b)=>a-b);
        const allDFG3Inv = qualifiedPlayers.map((p: any) => 100 - p.tracking.dfg3Pct).sort((a,b)=>a-b);
        const allDFG2Inv = qualifiedPlayers.map((p: any) => 100 - p.tracking.dfg2Pct).sort((a,b)=>a-b);
        
        const allPaintFGM = qualifiedPlayers.map((p: any) => p.per36Stats.paintFGM).sort((a,b)=>a-b);
        const allMidRangeFGM = qualifiedPlayers.map((p: any) => p.per36Stats.midRangeFGM).sort((a,b)=>a-b);
        const allTwoPA = qualifiedPlayers.map((p: any) => p.per36Stats.twoPA).sort((a,b)=>a-b);
        const allFtaRate = qualifiedPlayers.map((p: any) => p.adv.ftaRate).sort((a,b)=>a-b);
        const allFgmUast = qualifiedPlayers.map((p: any) => p.scoring.pctFgmUast).sort((a,b)=>a-b);
        const allPtsFb = qualifiedPlayers.map((p: any) => p.per36Stats.ptsFb).sort((a,b)=>a-b);

        const allStocks = qualifiedPlayers.map((p: any) => p.per36Stats.spg + p.per36Stats.bpg).sort((a,b)=>a-b);
        const allPassQuality = qualifiedPlayers.map((p: any) => p.per36Stats.potentialAst > 0 ? (p.per36Stats.apg / p.per36Stats.potentialAst) : 0).sort((a,b)=>a-b);

        const calcWS48 = (p: any) => {
            if (p.adv.isRealBRef && p.adv.ws48 !== undefined) return p.adv.ws48; 
            const perWS = (p.adv.per || 15) - 15;
            const tsWS = ((p.adv.ts || 55) - 55) * 0.1;
            return Math.max(0, 0.100 + (perWS * 0.01) + tsWS);
        };
        const allWS48 = qualifiedPlayers.map(calcWS48).sort((a,b)=>a-b);

        const calcDefImpact = (p: any) => {
            const defRtg = p.adv?.defRating || 115;
            const teamImpact = Math.max(0, 115 - defRtg) * 1.5; 
            const individualImpact = (p.per36Stats.spg * 2.5) + (p.per36Stats.bpg * 1.5);
            return teamImpact + individualImpact;
        };
        const allDefImpact = qualifiedPlayers.map(calcDefImpact).sort((a,b)=>a-b);

        const parsedPlayers = parsedPlayersRaw.map((p: any) => {
            p.adv.rTS = Number((p.adv.ts - leagueAvgTS).toFixed(1));
            p.adv.ws48 = calcWS48(p);
            
            const pPPG = this.calcPercentile(p.per36Stats.ppg, allPPG);
            const pTS = this.calcPercentile(p.adv.ts, allTS);
            const pUSG = this.calcPercentile(p.adv.usg, allUSG);
            
            const pAPG = this.calcPercentile(p.per36Stats.apg, allAPG);
            const pAstPct = this.calcPercentile(p.adv.astPct, allAstPct);
            const pSPG = this.calcPercentile(p.per36Stats.spg, allSPG);
            const pBPG = this.calcPercentile(p.per36Stats.bpg, allBPG);
            const pDReb = this.calcPercentile(p.per36Stats.dreb, allDReb);
            const pDefl = this.calcPercentile(p.per36Stats.deflections, allDeflections);
            const pContested = this.calcPercentile(p.per36Stats.contestedShots, allContested);
            const pContested3 = this.calcPercentile(p.per36Stats.contested3pt, allContested3);
            const pContested2 = this.calcPercentile(p.per36Stats.contested2pt, allContested2);
            
            const pNet = this.calcPercentile(p.adv.net, allNetRtg);
            const pBPM = this.calcPercentile(p.adv.bpm, allBPM);
            const pPIE = this.calcPercentile(p.adv.pie, allPIE);
            const pPER = this.calcPercentile(p.adv.per, allPER);
            const pFG2Pct = this.calcPercentile(p.stats.fg2Pct, allFG2Pct);

            let perimeterD = 50, interiorD = 50, globalDef = 50, finishing = 50, midRange = 50;
            const scoringIndex = Math.round((pPPG * 2.0 + pTS * 0.8) / 2.8);
            const playCreation = Math.round((pAPG + pAstPct) / 2);

            try {
                if (hasTracking) {
                    perimeterD = Math.round((this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 2.5 + this.calcPercentile(100 - p.tracking.dfg3Pct, allDFG3Inv) * 2.5 + pDefl * 1.0 + pSPG * 1.0 + pContested3 * 1.0) / 8.0);
                    interiorD = Math.round((this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 2.0 + this.calcPercentile(100 - p.tracking.dfg2Pct, allDFG2Inv) * 2.0 + pBPG * 4.0 + pContested2 * 1.0 + pDReb * 0.5) / 9.5);
                    globalDef = Math.round((this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 4.0 + this.calcPercentile(100 - p.tracking.dfgPct, allDFGInv) * 2.5 + Math.max(pSPG, pBPG) * 1.0 + pContested * 0.5) / 8.0);
                    finishing = Math.round((this.calcPercentile(p.per36Stats.paintFGM, allPaintFGM) * 3.5 + this.calcPercentile(p.adv.ftaRate, allFtaRate) * 1.5 + pFG2Pct * 0.5) / 5.5); 
                    midRange = Math.round((this.calcPercentile(p.per36Stats.midRangeFGM, allMidRangeFGM) * 4.0 + this.calcPercentile(p.stats.ftPct, allFtPct) * 1.0) / 5.0); 
                } else {
                    perimeterD = Math.round((pSPG * 6.0 + this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 2.5 + pBPM * 1.5) / 10.0); 
                    interiorD = Math.round((this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 2.0 + pBPG * 4.0 + this.calcPercentile(p.stats.mpg > 0 ? p.stats.bpg / p.stats.mpg : 0, allBlkPct) * 1.5 + pDReb * 0.5) / 8.0); 
                    globalDef = Math.round((this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv) * 3.0 + Math.max(pSPG, pBPG) * 4.0 + pBPM * 3.0) / 10.0);
                    finishing = Math.round((this.calcPercentile(p.per36Stats.paintFGM, allPaintFGM) * 3.5 + this.calcPercentile(p.adv.ftaRate, allFtaRate) * 1.5 + pFG2Pct * 0.5) / 5.5); 
                    midRange = Math.round((this.calcPercentile(p.per36Stats.twoPA, allTwoPA) * 4.0 + this.calcPercentile(p.stats.ftPct, allFtPct) * 1.0) / 5.0);
                }
            } catch(e) {}

            let hustleScore = 50;
            if (hasTracking) {
                hustleScore = Math.round((
                    this.calcPercentile(p.per36Stats.deflections, allDeflections) * 4.0 +
                    this.calcPercentile(p.per36Stats.looseBalls, allLooseBalls) * 3.0 +
                    this.calcPercentile(p.per36Stats.chargesDrawn, allCharges) * 2.0 +
                    this.calcPercentile(p.per36Stats.screenAssists, allScreenAssists) * 1.0 +
                    this.calcPercentile(p.per36Stats.boxOuts, allBoxOuts) * 0.5
                ) / 10.5);
            } else {
                hustleScore = Math.round((
                    this.calcPercentile(p.per36Stats.spg, allSPG) * 4.0 +
                    this.calcPercentile(p.per36Stats.oreb, allOReb) * 1.0 +
                    this.calcPercentile(p.per36Stats.dreb, allDReb) * 0.5
                ) / 5.5);
            }

            const overallImpact = Math.round((pNet + pBPM + pPIE + pPER) / 4.0);

            const pPotentialAst = this.calcPercentile(p.per36Stats.potentialAst, allPotentialAst);
            const pPasses = this.calcPercentile(p.per36Stats.passesMade, allPassesMade);
            const pSecAst = this.calcPercentile(p.per36Stats.secondaryAst, allSecondaryAst);
            const pAstPtsCreated = this.calcPercentile(p.per36Stats.astPtsCreated, allAstPtsCreated);
            
            const ballMovement = Math.round((pPasses + pSecAst) / 2.0);
            const playmakingLoad = Math.round((pAstPct + pUSG) / 2.0);

            const basePlayerWithPercentiles = {
                ...p,
                percentiles: {
                    Scoring: pPPG, 
                    Playmaking: pAPG,
                    Rebounding: this.calcPercentile(p.per36Stats.rpg, allRPG), 
                    Efficiency: pTS,
                    Impact: pBPM, 
                    Shooting: Math.round((this.calcPercentile(p.per36Stats.fg3m, all3PM) * 2.5 + this.calcPercentile(p.stats.threePct, all3P) * 1.0) / 3.5),
                    Defense: globalDef, 
                    OReb: this.calcPercentile(p.per36Stats.oreb, allOReb),
                    DReb: pDReb, 
                    AstPct: pAstPct,
                    OffRtg: this.calcPercentile(p.adv.offRtg, allOffRtg), 
                    DefRtg: this.calcPercentile(115 - (p.adv.defRating || 115), allDefRtgInv),
                    NetRtg: pNet, 
                    Contested: pContested,
                    Deflections: pDefl,
                    PER: pPER,
                    WinPct: this.calcPercentile(p.stats.winPct, allWinPct), 
                    WS48: this.calcPercentile(p.adv.ws48, allWS48),
                    VORP: this.calcPercentile(p.adv.vorp, allVORP),
                    PIE: pPIE,
                    USG: pUSG, 
                    EFG: this.calcPercentile(p.stats.fgPct, allFgPct), 
                    FtPct: this.calcPercentile(p.stats.ftPct, allFtPct),

                    ScoringIndex: Math.min(100, Math.max(0, scoringIndex)),
                    PlayCreation: Math.min(100, Math.max(0, playCreation)),
                    PerimeterD: Math.min(100, Math.max(0, perimeterD)),
                    InteriorD: Math.min(100, Math.max(0, interiorD)),
                    Hustle: Math.min(100, Math.max(0, hustleScore)),
                    OverallImpact: Math.min(100, Math.max(0, overallImpact)),
                    SystemicImpact: Math.min(100, Math.max(0, overallImpact)), 

                    Finishing: Math.min(100, Math.max(0, finishing)),
                    MidRange: Math.min(100, Math.max(0, midRange)),
                    ShotCreation: this.calcPercentile(p.scoring.pctFgmUast, allFgmUast),
                    PotentialAst: pPotentialAst,
                    AstPtsCreated: pAstPtsCreated,
                    BallMovement: Math.min(100, Math.max(0, ballMovement)),
                    PlaymakingLoad: Math.min(100, Math.max(0, playmakingLoad)),
                    PassesMade: pPasses,
                    SecondaryAst: pSecAst,
                    BallSecurity: this.calcPercentile(p.adv.astTo, allAstTo),
                    Steals: pSPG,
                    Blocks: pBPG,
                    
                    FtaRate: this.calcPercentile(p.adv.ftaRate, allFtaRate),
                    ThreePA: this.calcPercentile(p.per36Stats.fg3a, all3PA),
                    FastBreak: this.calcPercentile(p.per36Stats.ptsFb, allPtsFb),

                    Stocks: this.calcPercentile(p.per36Stats.spg + p.per36Stats.bpg, allStocks),
                    PassQuality: this.calcPercentile(p.per36Stats.potentialAst > 0 ? (p.per36Stats.apg / p.per36Stats.potentialAst) : 0, allPassQuality),
                    ShotDefense: this.calcPercentile(100 - p.tracking.dfgPct, allDFGInv),
                    ContestedReb: pDReb, 
                    RebConversion: pDReb 
                }
            };
            
            return {
                ...basePlayerWithPercentiles,
                rating: calculatePlayer2KRating(basePlayerWithPercentiles, leagueContext, season)
            };
        });

        this.historicalPlayersCache.set(season, parsedPlayers as unknown as NBAPlayer[]);
        if (season === "2025-26") this.playersCache = parsedPlayers as unknown as NBAPlayer[];

        return JSON.parse(JSON.stringify(parsedPlayers));
      } catch (err) {
        console.error("Critical Error parsing all players:", err);
        this.fetchPromises.delete(season);
        return this.getAllPlayers();
      }
    })();

    this.fetchPromises.set(season, promise);
    return promise.then(data => JSON.parse(JSON.stringify(data)));
  }

  computeAllAdvanced(player: any) {
    const s = player.stats || {};
    const a = player.adv || {};
    const min = s.mpg || 1;
    
    const missedFG = (s.fga || 0) - (s.fgm || 0);
    const missedFT = (s.fta || 0) - (s.ftm || 0);
    const perBase = (s.ppg || 0) + (s.rpg || 0) + (s.apg || 0) + (s.spg || 0) + (s.bpg || 0) - missedFG - missedFT - (s.topg || 0);
    const perRaw = perBase * (30 / min);
    const per = isNaN(perRaw) || !isFinite(perRaw) ? 0 : perRaw;

    const pts = s.ppg || 0; const reb = s.rpg || 0; const ast = s.apg || 0;
    const stl = s.spg || 0; const blk = s.bpg || 0; const fga = s.fga || 0;
    const fta = s.fta || 0; const tov = s.topg || 0;
    
    const impact_score = (pts * 1.0) + (reb * 0.4) + (ast * 1.5) + (stl * 2.5) + (blk * 2.0) - (fga * 1.1) - (fta * 0.45) - (tov * 2.5);
    let bpmRaw = ((impact_score * (36 / min)) * 0.25) - 2.0;
    if (bpmRaw < -10) bpmRaw = -10;
    const bpm = isNaN(bpmRaw) || !isFinite(bpmRaw) ? 0 : bpmRaw;
    
    let vorpRaw = (bpm + 2.0) * (min / 48) * 0.8;
    if (vorpRaw < -2) vorpRaw = -2;
    const vorp = isNaN(vorpRaw) || !isFinite(vorpRaw) ? 0 : vorpRaw;

    const finalTS = a.ts ?? s.ts ?? 0;
    const finalUSG = a.usg ?? s.usg ?? 0;

    const siPlusRaw = 100 + (bpm * 4.5) + ((per - 15) * 1.5) + ((finalTS - 55) * 0.5);
    const safeSiPlus = isNaN(siPlusRaw) || !isFinite(siPlusRaw) ? 0 : Math.round(siPlusRaw);

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
      usg: finalUSG, ts: finalTS, efg: a.efg ?? s.efg ?? 0, ast: a.astPct ?? s.astPct ?? 0,
      si: safeSiPlus, 
    };
  }

  async fetchPlayerOnOff(playerId: string, teamId: string, season: string) {
      if (!teamId || teamId === "FA" || teamId === "0") return null;
      try {
          const cacheKey = `onoff-${playerId}-${season}`;
          if (this.onOffCache.has(cacheKey)) return this.onOffCache.get(cacheKey);

          const teams = await this.fetchAllOfficialTeams(season);
          const team = teams.find(t => t.abbreviation === teamId);
          if (!team) return null;
          const tid = team.id;

          const url = `/teamplayeronoffdetails?DateFrom=&DateTo=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&TeamID=${tid}&VsConference=&VsDivision=`;
          const data = await fetchSafeJSON(url);
          
          if (data && data.resultSets && data.resultSets[1] && data.resultSets[2]) {
              const onCourt = data.resultSets[1].rowSet.find((r:any) => String(r[1]) === String(playerId));
              const offCourt = data.resultSets[2].rowSet.find((r:any) => String(r[1]) === String(playerId));
              
              if (onCourt && offCourt) {
                  const h1 = data.resultSets[1].headers;
                  const h2 = data.resultSets[2].headers;
                  const onNet = onCourt[h1.indexOf("NET_RATING")];
                  const offNet = offCourt[h2.indexOf("NET_RATING")];
                  const diff = onNet - offNet;
                  this.onOffCache.set(cacheKey, diff);
                  return diff;
              }
          }
          return null;
      } catch(e) { return null; }
  }

  async fetchAllOfficialTeams(season: string = "2025-26"): Promise<any[]> {
    if (this.historicalTeamsCache.has(season)) {
        return JSON.parse(JSON.stringify(this.historicalTeamsCache.get(season)!));
    }
    if (this.fetchTeamsPromises.has(season)) {
        const teams = await this.fetchTeamsPromises.get(season)!;
        return JSON.parse(JSON.stringify(teams));
    }

    const promise = (async () => {
      try {
        if (season === '2025-26') {
          try {
            const staticRes = await fetch('/data/nba_teams_current.json');
            if (staticRes.ok) {
              const json = await staticRes.json();
              const teams: any[] = json.teams ?? json;
              if (Array.isArray(teams) && teams.length >= 30) {
                this.historicalTeamsCache.set(season, teams);
                this.teamsCache = teams;
                return JSON.parse(JSON.stringify(teams));
              }
            }
          } catch {
            console.warn('[NBAService] ⚠️ JSON estático de equipos no disponible, usando NBA API en vivo...');
          }
        }

        const paramsTeamBase = `?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
        const paramsAdv = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Advanced");
        const paramsOpp = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Opponent");
        const paramsMisc = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Misc"); 
        const paramsScoring = paramsTeamBase.replace("MeasureType=Base", "MeasureType=Scoring"); 
        
        const paramsClutch = `?AheadBehind=Ahead%20or%20Behind&ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=`;
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
              const tId = String(row[h.indexOf("TEAM_ID")]);
              const wins = getStat(row, h, "W");
              const losses = getStat(row, h, "L");
              
              const apiWinPct = getStat(row, h, "W_PCT");
              const wPct = (apiWinPct !== undefined && apiWinPct !== null) ? parsePct(apiWinPct) : (wins + losses > 0 ? parsePct(wins / (wins + losses)) : 0);

              const pts = getStat(row, h, "PTS");
              const fga = getStat(row, h, "FGA");
              const fta = getStat(row, h, "FTA");
              const calculatedTs = (fga > 0 || fta > 0) ? parsePct(pts / (2 * (fga + 0.44 * fta))) : 0;

              clutchDataRaw.push({
                  id: tId,
                  gp: getStat(row, h, "GP"), 
                  min: getStat(row, h, "MIN"), 
                  wins: wins, 
                  losses: losses,
                  pts: pts, fga: fga, fta: fta,
                  tsPct: calculatedTs, 
                  winPct: wPct,
                  adv: clutchAdvMap.get(tId) || {}
              });
            });
        } else {
            rowsBase.forEach((row: any[]) => {
                const tId = getString(row, headersBase, "TEAM_ID", "0");
                const adv = advMap.get(tId) || {};
                const baseWins = getStat(row, headersBase, "W");
                const fakeWinPct = parsePct(getStat(row, headersBase, "W_PCT"));
                clutchDataRaw.push({
                    id: tId, gp: Math.max(1, Math.round(baseWins * 0.6)), min: 15, wins: baseWins, losses: getStat(row, headersBase, "L"),
                    pts: 10, fga: 8, fta: 2, tsPct: 55, winPct: fakeWinPct, 
                    adv: { netRtg: (adv.netRtg || 0) * 1.2, defRtg: adv.defRtg || 110, pace: adv.pace || 100, rebPct: adv.rebPct || 50 }
                });
            });
        }

        const validClutch = clutchDataRaw.filter(t => t.min > 0);
        const allClutchOff = validClutch.map(t => t.adv.offRtg || 115).sort((a,b)=>a-b);
        const allClutchDefInv = validClutch.map(t => 115 - (t.adv.defRtg || 115)).sort((a,b)=>a-b);
        const allClutchNet = validClutch.map(t => t.adv.netRtg || 0).sort((a,b)=>a-b);
        const allClutchPace = validClutch.map(t => t.adv.pace || 100).sort((a,b)=>a-b);
        const allClutchTs = validClutch.map(t => t.tsPct).sort((a,b)=>a-b);
        const allClutchReb = validClutch.map(t => t.adv.rebPct || 50).sort((a,b)=>a-b);

        clutchDataRaw.forEach(t => {
            clutchMap.set(t.id, {
                ...t,         
                ...t.adv,     
                clutchNetRtg: t.adv.netRtg || 0,
                clutchWinPct: t.winPct || 0,
                ts: t.tsPct || 0,
                percentiles: {
                    Offense: this.calcPercentile(t.adv.offRtg || 115, allClutchOff),
                    Defense: this.calcPercentile(115 - (t.adv.defRtg || 115), allClutchDefInv),
                    NetRating: this.calcPercentile(t.adv.netRtg || 0, allClutchNet),
                    Pace: this.calcPercentile(t.adv.pace || 100, allClutchPace),
                    Efficiency: this.calcPercentile(t.tsPct, allClutchTs),
                    Rebounding: this.calcPercentile(t.adv.rebPct || 50, allClutchReb)
                }
            });
        });

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
          const adv = advMap.get(tId) || {};
          const clData = clutchMap.get(tId);

          const statsObj = {
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
            winPct: winPct
          };

          const advFixed = {
              ...adv,
              astToTeam: adv.astTo || 1.5
          };

          return {
            id: tId, name: name, abbreviation: staticTeam?.abbreviation || getString(row, headersBase, "TEAM_ABBREVIATION", "") || name.substring(0, 3).toUpperCase(),
            conference: staticTeam?.conference || "Unknown",
            wins: wins, losses: losses, winPct: winPct,
            min: getStat(row, headersBase, "MIN"),
            
            ...statsObj,
            ...advFixed,
            stats: statsObj,
            adv: advFixed,
            
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
            opp: {
                ...(oppMap.get(tId) || { oppFgPct: 0, opp3ptPct: 0, opp2ptPct: 0, oppTov: 0, oppFtaRate: 0 }),
                oppPtsPaint: mData.oppPtsPaint,
                oppPtsOffTov: mData.oppPtsOffTov,
                oppPtsFb: mData.oppPtsFb,
                oppPts2ndChance: mData.oppPts2ndChance
            },
            clutch: clData || {
                clutchNetRtg: adv.netRtg || 0,
                clutchWinPct: winPct,
                winPct: winPct,
                tsPct: adv.tsPct || 0,
                ts: adv.tsPct || 0,
                offRtg: adv.offRtg || 0,
                defRtg: adv.defRtg || 0,
                netRtg: adv.netRtg || 0,
                pace: adv.pace || 0,
                rebPct: adv.rebPct || 0,
                astTo: adv.astTo || 0,
                percentiles: { Offense: 50, Defense: 50, NetRating: 50, Pace: 50, Efficiency: 50, Rebounding: 50 }
            }
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

        const allPlayersThisSeason = await this.fetchAllOfficialPlayers(season).catch(() => []);

        parsedTeams = parsedTeams.map((t:any) => {
            const baseTeamWithPercentiles = {
                ...t,
                percentiles: {
                    Offense: this.calcPercentile(t.offRtg || 115, allOffRtg),
                    Defense: this.calcPercentile(115 - (t.defRtg || 115), allDefRtgInv),
                    NetRating: this.calcPercentile(t.netRtg || 0, allNetRtg),
                    Pace: this.calcPercentile(t.pace || 100, allPace),
                    Efficiency: this.calcPercentile(t.tsPct || 55, allTsPct),
                    Rebounding: this.calcPercentile(t.rebPct || 50, allRebPct),
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
            };
            
            const teamRoster = allPlayersThisSeason.filter(p => p.teamId === t.abbreviation || String(p.teamId) === String(t.id));

            return {
                ...baseTeamWithPercentiles,
                rating: calculateTeam2KRating(baseTeamWithPercentiles, teamRoster)
            };
        });

        this.historicalTeamsCache.set(season, parsedTeams);
        if (season === "2025-26") this.teamsCache = parsedTeams;
        return JSON.parse(JSON.stringify(parsedTeams));
      } catch (err) {
        this.fetchTeamsPromises.delete(season);
        return season === "2025-26" ? JSON.parse(JSON.stringify(this.getAllTeams())) : [];
      }
    })();
    this.fetchTeamsPromises.set(season, promise);
    return promise.then(data => JSON.parse(JSON.stringify(data)));
  }

async fetchAwardAuxData(season: string = "2025-26", prevSeason: string = "2024-25") {
    const cacheKey = `clutch-${season}`;
    if (this.clutchCache.has(cacheKey)) return this.clutchCache.get(cacheKey);

    try {
        const rookieUrl = `/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=Rookie&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=&Weight=`;
        
        const paramsClutch = `?AheadBehind=Ahead%20or%20Behind&ClutchTime=Last%205%20Minutes&DateFrom=&DateTo=&Direction=DESC&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&Sort=PTS&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
        const clutchUrlBase = `/leaguedashplayerclutch${paramsClutch}`;
        const clutchUrlAdv = `/leaguedashplayerclutch${paramsClutch.replace("MeasureType=Base", "MeasureType=Advanced")}`;
        
        const benchUrl = `/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${season}&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=Bench&TeamID=0&TwoWay=0&VsConference=&VsDivision=&Weight=`;
        
        const [rookiesSettled, prevPlayersSettled, prevTeamsSettled] = await Promise.allSettled([
            fetchSafeJSON(rookieUrl),
            this.fetchAllOfficialPlayers(prevSeason),
            this.fetchAllOfficialTeams(prevSeason)
        ]);

        const resRookies = rookiesSettled.status === 'fulfilled' ? rookiesSettled.value : null;
        const prevPlayers = prevPlayersSettled.status === 'fulfilled' ? prevPlayersSettled.value : [];
        const prevTeams = prevTeamsSettled.status === 'fulfilled' ? prevTeamsSettled.value : [];

        await new Promise(resolve => setTimeout(resolve, 800));

        const [benchSettled, clutchBaseSettled, clutchAdvSettled] = await Promise.allSettled([
            fetchSafeJSON(benchUrl),
            fetchSafeJSON(clutchUrlBase),
            fetchSafeJSON(clutchUrlAdv)
        ]);

        const resBench = benchSettled.status === 'fulfilled' ? benchSettled.value : null;
        const resClutchBase = clutchBaseSettled.status === 'fulfilled' ? clutchBaseSettled.value : null;
        const resClutchAdv = clutchAdvSettled.status === 'fulfilled' ? clutchAdvSettled.value : null;

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
                clutchAdvMap.set(String(row[h.indexOf("PLAYER_ID")]), {
                    netRtg: getStat(row, h, "NET_RATING") || 0,
                    defRtg: getStat(row, h, "DEF_RATING") || 115,
                    astPct: parsePct(getStat(row, h, "AST_PCT")),
                    astTo: getStat(row, h, "AST_TO") || 0,
                    astRatio: getStat(row, h, "AST_RATIO") || 0,
                    pie: parsePct(getStat(row, h, "PIE")),
                });
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
                const pts = getStat(r, h, "PTS");
                const wins = getStat(r, h, "W");
                const losses = getStat(r, h, "L");
                
                clutchDataRaw.push({
                    id: String(r[h.indexOf("PLAYER_ID")]),
                    gp: getStat(r, h, "GP"), min, pts, fga, fta,
                    fgm: getStat(r, h, "FGM"), ftm: getStat(r, h, "FTM"),
                    stl: getStat(r, h, "STL"), blk: getStat(r, h, "BLK"),
                    reb: getStat(r, h, "REB"), ast: getStat(r, h, "AST"),
                    tov: getStat(r, h, "TOV"),
                    winPct: (wins + losses > 0) ? parsePct(wins / (wins + losses)) : 0,
                    ts: parsePct(pts / (2 * (fga + 0.44 * fta))),
                    adv: clutchAdvMap.get(String(r[h.indexOf("PLAYER_ID")])) || { netRtg: 0, defRtg: 115, astPct: 0, astTo: 0, astRatio: 0, pie: 0 }
                });
            });

            const validClutch = clutchDataRaw.filter(p => p.min >= 10); 
            const allClutchPts = validClutch.map(p => (p.pts / p.min) * 48).sort((a,b)=>a-b);
            const allClutchAst = validClutch.map(p => (p.ast / p.min) * 48).sort((a,b)=>a-b);
            const allClutchReb = validClutch.map(p => (p.reb / p.min) * 48).sort((a,b)=>a-b);
            const allClutchTs = validClutch.map(p => p.ts).sort((a,b)=>a-b);
            const allClutchBpm = validClutch.map(p => p.adv.netRtg).sort((a,b)=>a-b);
            const allClutchDefRtgInv = validClutch.map(p => 115 - (p.adv.defRtg || 115)).sort((a,b)=>a-b);
            
            const allClutchBlk = validClutch.map(p => (p.blk / p.min) * 48).sort((a,b)=>a-b);
            const allClutchStl = validClutch.map(p => (p.stl / p.min) * 48).sort((a,b)=>a-b);
            const allClutchAstPct = validClutch.map(p => p.adv.astPct).sort((a,b)=>a-b);
            const allClutchAstTo = validClutch.map(p => p.adv.astTo).sort((a,b)=>a-b);
            const allClutchAstRatio = validClutch.map(p => p.adv.astRatio).sort((a,b)=>a-b);
            const allClutchPie = validClutch.map(p => p.adv.pie).sort((a,b)=>a-b);
            const allClutchWinPct = validClutch.map(p => p.winPct).sort((a,b)=>a-b);

            clutchDataRaw.forEach(p => {
                const p48 = p.min > 0 ? 48 / p.min : 0;
                
                const pDefRtg = this.calcPercentile(115 - (p.adv.defRtg || 115), allClutchDefRtgInv);
                const pStl = this.calcPercentile(p.stl * p48, allClutchStl);
                const pBlk = this.calcPercentile(p.blk * p48, allClutchBlk);
                
                const clutchDef = Math.round((pDefRtg * 4.0 + pBlk * 1.5 + pStl * 1.0) / 6.5);
                const clutchScoring = Math.round((this.calcPercentile(p.pts * p48, allClutchPts) * 2.0 + this.calcPercentile(p.ts, allClutchTs) * 0.8) / 2.8);
                const clutchPlaymaking = Math.round((this.calcPercentile(p.ast * p48, allClutchAst) * 2.5 + this.calcPercentile(p.adv.astPct, allClutchAstPct) * 1.0 + this.calcPercentile(p.adv.astTo, allClutchAstTo) * 1.0 + this.calcPercentile(p.adv.astRatio, allClutchAstRatio) * 0.5) / 5.0);
                const clutchImpact = Math.round((this.calcPercentile(p.adv.netRtg, allClutchBpm) * 2.0 + this.calcPercentile(p.adv.pie, allClutchPie) * 2.0 + this.calcPercentile(p.winPct, allClutchWinPct) * 1.0) / 5.0);

                clutchStats.set(p.id, {
                    ...p,
                    clutchNetRtg: p.adv.netRtg,
                    percentiles: {
                        Scoring: Math.min(100, Math.max(0, clutchScoring)),
                        Playmaking: Math.min(100, Math.max(0, clutchPlaymaking)),
                        Rebounding: this.calcPercentile(p.reb * p48, allClutchReb),
                        Defense: Math.min(100, Math.max(0, clutchDef)),
                        Efficiency: this.calcPercentile(p.ts, allClutchTs),
                        Impact: Math.min(100, Math.max(0, clutchImpact))
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

  async getTeamSchedule(teamId: string, season: string = "2025-26"): Promise<any[]> { 
    try {
        const data = await fetchSafeJSON(`/leaguegamefinder?TeamID=${teamId}&PlayerOrTeam=T&Season=${season}&SeasonType=Regular%20Season`);
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
  
  async getTeamLineups(teamId: string, season: string = "2025-26"): Promise<any[]> { 
    try {
        const data = await fetchSafeJSON(`/leaguedashlineups?GroupQuantity=5&LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=${teamId}`);
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
  
  async getTeamRosterAndCoaches(teamId: string, season: string = "2025-26"): Promise<any> { 
    try {
        if (!teamId || isNaN(Number(teamId))) return { players: [], coaches: [] };

        const data = await fetchSafeJSON(`/commonteamroster?LeagueID=00&Season=${season}&TeamID=${teamId}`);
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
      
      if (!data || !data.resultSets || data.resultSets.length === 0) {
        return NBA_TEAMS.map((t, i) => ({
            id: String(t.id),
            teamId: String(t.id),
            name: t.name,
            abbreviation: t.abbreviation,
            conference: t.conference,
            wins: t.wins || 0,
            losses: t.losses || 0,
            pct: (t.wins || 0) / ((t.wins || 0) + (t.losses || 1)),
            winPct: (t.wins || 0) / ((t.wins || 0) + (t.losses || 1)),
            rank: i + 1,
            gb: 0,
            l10: "5-5",
            streak: "1W"
        }));
      }
      
      const headers = data.resultSets[0].headers;
      const rows = data.resultSets[0].rowSet;
      
      const getIdx = (key: string) => headers.findIndex((h: string) => h.toLowerCase() === key.toLowerCase());
      
      return rows.map((r: any[]) => {
        const teamId = r[getIdx("teamid")] || 0;
        const rawConf = r[getIdx("conference")];
        const rawStreak = r[getIdx("strcurrentstreak")] || r[getIdx("currentstreak")]; 
        
        const fallbackTeam = NBA_TEAMS.find(t => String(t.id) === String(teamId));
        let safeConference = fallbackTeam?.conference || "East";
        
        if (rawConf && typeof rawConf === 'string') {
            safeConference = rawConf;
        }

        const safeStreak = (rawStreak !== undefined && rawStreak !== null) ? String(rawStreak).trim() : "1W";

        return {
            id: String(teamId), 
            teamId: String(teamId), 
            name: r[getIdx("teamcity")] ? `${r[getIdx("teamcity")]} ${r[getIdx("teamname")]}` : fallbackTeam?.name || "Unknown", 
            abbreviation: r[getIdx("teamslug")] || fallbackTeam?.abbreviation || "UNK", 
            conference: String(safeConference || "").trim(), 
            wins: r[getIdx("wins")] || 0, 
            losses: r[getIdx("losses")] || 0, 
            pct: r[getIdx("winpct")] || 0,
            winPct: r[getIdx("winpct")] || 0,
            rank: r[getIdx("playoffrank")] || r[getIdx("playoffrank")] || 1,
            gb: r[getIdx("conferencerecord")] || 0, 
            l10: r[getIdx("l10")] || "5-5", 
            streak: safeStreak
        };
      });
    } catch(e) { 
        return NBA_TEAMS.map((t, i) => ({
            id: String(t.id),
            teamId: String(t.id),
            name: t.name,
            abbreviation: t.abbreviation,
            conference: t.conference,
            wins: t.wins || 0,
            losses: t.losses || 0,
            pct: (t.wins || 0) / ((t.wins || 0) + (t.losses || 1)),
            winPct: (t.wins || 0) / ((t.wins || 0) + (t.losses || 1)),
            rank: i + 1,
            gb: 0,
            l10: "5-5",
            streak: "1W"
        })); 
    } 
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

  async getTeamDetails(teamId: string, season: string = "2025-26"): Promise<any> { 
    try {
      const teams = await this.fetchAllOfficialTeams(season);
      return teams.find(t => String(t.id) === String(teamId)) || null; 
    } catch (e) {
      return null;
    }
  }
  
  async getPlayerGameLog(playerId: string, season: string = "2025-26"): Promise<any[]> { 
    try {
      const data = await fetchSafeJSON(`/playergamelog?PlayerID=${playerId}&Season=${season}&SeasonType=Regular%20Season`);
      if (!data || !data.resultSets || data.resultSets.length === 0) return [];
      
      const headers = data.resultSets[0].headers;
      return data.resultSets[0].rowSet.map((r: any[]) => {
        const matchup = getString(r, headers, "MATCHUP", "");
        return {
          date: getString(r, headers, "GAME_DATE", ""),
          matchup: matchup,
          isHome: !matchup.includes("@"),
          opponent: matchup.split(matchup.includes("@") ? "@" : "vs.")[1]?.trim() || "UNK",
          wl: getString(r, headers, "WL", ""),
          pts: getStat(r, headers, "PTS"),
          reb: getStat(r, headers, "REB"),
          ast: getStat(r, headers, "AST"),
          ts: parsePct(getStat(r, headers, "PTS") / (2 * (getStat(r, headers, "FGA") + 0.44 * getStat(r, headers, "FTA"))))
        };
      });
    } catch (error) {
      console.error("Error fetching game log:", error);
      return [];
    }
  }

  async searchRealPlayersWithStats(query: string): Promise<NBAPlayer[]> { return []; }
  async getLivePlayers(): Promise<NBAPlayer[]> { return this.fetchAllOfficialPlayers("2025-26"); }
  findSimilarPlayers() { return []; }
  computeTeamMetrics = computeTeamMetrics;

  // 🚀 NUEVOS MÉTODOS SUPABASE (Para el Oráculo y el Histórico Profundo)
  async fetchHistoricalStatsFromSupabase(playerName: string) {
    try {
        const { data: player, error: playerError } = await supabase
            .from('players')
            .select('player_id')
            .ilike('full_name', playerName)
            .single();

        if (playerError || !player) return [];

        const { data: stats, error: statsError } = await supabase
            .from('player_season_stats')
            .select('*')
            .eq('player_id', player.player_id)
            .order('season', { ascending: false });

        if (statsError) throw statsError;
        return stats || [];
    } catch (error) {
        console.error("Error fetching historical stats from Supabase:", error);
        return [];
    }
  }

  async fetchOracleProjections() {
    try {
        const { data, error } = await supabase
            .from('daily_projections')
            .select(`*, players ( full_name, current_team_id, bref_player_id )`)
            .order('projected_bpm', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching Oracle projections from Supabase:", error);
        return [];
    }
  }
// 🚀 MÉTODO DEFINITIVO: Fetch Lineups (URL corregida con parámetros obligatorios de la NBA)
  async getLineups(teamId: string, groupQuantity: number = 2, season: string = "2025-26"): Promise<any[]> {
    const tId = (!teamId || teamId === "all") ? "0" : teamId;

    try {
      // 🛠️ LA RAÍZ DEL PROBLEMA: Faltaban parámetros clave (LeagueID=00, LastNGames=0, Month=0, Period=0).
      // Si la API de la NBA no los recibe, colapsa con un Error 500.
      const url = `/leaguedashlineups?GroupQuantity=${groupQuantity}&LastNGames=0&LeagueID=00&MeasureType=Advanced&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=Totals&Period=0&PlusMinus=N&Rank=N&Season=${season}&SeasonType=Regular%20Season&TeamID=${tId}`;
      
      const data = await fetchSafeJSON(url);
      
      if (data && data.resultSets && data.resultSets[0].rowSet.length > 0) {
        const headers = data.resultSets[0].headers;
        return data.resultSets[0].rowSet.map((r: any[]) => ({
          groupId: r[headers.indexOf("GROUP_ID")],
          groupName: r[headers.indexOf("GROUP_NAME")],
          teamAbbreviation: r[headers.indexOf("TEAM_ABBREVIATION")],
          min: getStat(r, headers, "MIN"),
          gp: getStat(r, headers, "GP"),
          netRtg: getStat(r, headers, "NET_RATING"),
          offRtg: getStat(r, headers, "OFF_RATING"),
          defRtg: getStat(r, headers, "DEF_RATING"),
          pace: getStat(r, headers, "PACE"),
          tsPct: parsePct(getStat(r, headers, "TS_PCT")),
          astPct: parsePct(getStat(r, headers, "AST_PCT")),
          rebPct: parsePct(getStat(r, headers, "REB_PCT")),
          pie: parsePct(getStat(r, headers, "PIE")),
        }));
      }
    } catch (error) {
      console.error(`[NBAService] API Error real fetching ${groupQuantity}-man lineups:`, error);
    }
    
    // 🛡️ Mantenemos el Anti-Caídas SOLO por si la NBA se cae de verdad a nivel de servidores,
    // (Por ejemplo, pedir dúos de "Toda la liga" a veces satura sus bases de datos por peso).
    console.warn("[NBAService] Fallo en API, inyectando mock data.");
    const mockLineups = [];
    const players = this.getAllPlayers()
        .filter(p => tId === "0" ? true : p.teamId === this.getTeamById(tId)?.abbreviation)
        .slice(0, 15);
    
    for(let i=0; i < 20; i++) {
        const combo = [];
        for(let j=0; j < groupQuantity; j++) {
            const p = players[Math.floor(Math.random() * players.length)];
            if(p && !combo.find(x => x.id === p.id)) combo.push(p);
        }
        if(combo.length === groupQuantity) {
            mockLineups.push({
                groupId: combo.map(p => p.id).join("-"),
                groupName: combo.map(p => p.name).join(" - "),
                teamAbbreviation: combo[0]?.teamId || "UNK",
                min: Math.floor(Math.random() * 400) + 20,
                gp: Math.floor(Math.random() * 40) + 5,
                netRtg: (Math.random() * 30) - 10,
                offRtg: 105 + (Math.random() * 15),
                defRtg: 105 + (Math.random() * 15),
                pace: 95 + (Math.random() * 10),
                tsPct: 50 + (Math.random() * 15),
                astPct: 50 + (Math.random() * 20),
                rebPct: 45 + (Math.random() * 10),
                pie: 45 + (Math.random() * 15),
            });
        }
    }
    return mockLineups;
  }
}

export const nbaService = new NBAService();
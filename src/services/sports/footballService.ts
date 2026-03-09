import type { SportService } from "@/types/sports/base";

export const DOMESTIC_LEAGUES = [
  { id: "eng.1", name: "Premier League", country: "ENG", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png" },
  { id: "esp.1", name: "La Liga", country: "ESP", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" },
  { id: "ita.1", name: "Serie A", country: "ITA", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png" },
  { id: "ger.1", name: "Bundesliga", country: "GER", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png" },
  { id: "fra.1", name: "Ligue 1", country: "FRA", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png" },
];

export const EURO_LEAGUES = [
  { id: "uefa.champions", name: "Champions League", country: "EUR", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png" },
  { id: "uefa.europa", name: "Europa League", country: "EUR", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png" },
  { id: "uefa.europa.conf", name: "Conference League", country: "EUR", logo: "https://ui-avatars.com/api/?name=UECL&background=0a0f18&color=10b981" }
];

export const SOCCER_LEAGUES = [...DOMESTIC_LEAGUES, ...EURO_LEAGUES];

// 🚀 MISMA LÓGICA DE TU NBA SERVICE: Evita cuelgues infinitos
const fetchWithTimeout = async (url: string, timeout = 4000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const getESPNStat = (stats: any[], possibleNames: string[]) => {
  if (!stats || !Array.isArray(stats)) return 0;
  for (const name of possibleNames) {
    const stat = stats.find(s => s.name === name || s.abbreviation === name);
    if (stat && stat.value !== undefined) return Number(stat.value);
  }
  return 0;
};

class FootballService implements SportService<any, any> {
  sport = "football" as const;
  private playersCache: Map<string, any[]> = new Map();
  private teamsCache: Map<string, any[]> = new Map();
  private standingsCache: Map<string, any[]> = new Map();

  getAllPlayers() { return Array.from(this.playersCache.values()).flat(); }
  getPlayerById(id: string) { return this.getAllPlayers().find((p) => String(p.id) === String(id)); }
  getPlayersByTeam(teamId: string) { return this.getAllPlayers().filter((p) => p.teamId === teamId); }
  getAllTeams() { return Array.from(this.teamsCache.values()).flat(); }
  getTeamById(id: string) { return this.getAllTeams().find((t) => String(t.id) === String(id)); }

  computeAdvanced(p: any) {
    const s = p?.stats || { goals: 0, assists: 0, keyPasses: 0, passAccuracy: 0, tackles: 0, interceptions: 0, shotsOnTarget: 0, dribbles: 0, minutesPlayed: 90 };
    const p90 = s.minutesPlayed > 0 ? (s.minutesPlayed / 90) : 1;
    return {
      xgContribution: Math.round((s.goals * 0.85 + s.shotsOnTarget * 0.15) * 10) / 10,
      pressingImpact: Math.round(((s.tackles * 0.6 + s.interceptions * 0.4) / p90) * 10) / 10,
      buildUpValue: Math.round((s.keyPasses * 0.4 + s.passAccuracy * 0.3) * 0.5 * 10) / 10,
      xT: Math.round((s.dribbles * 0.03 + s.keyPasses * 0.05 + s.goals * 0.1) * 10) / 10,
      progressivePassing: Math.round(s.keyPasses * (s.passAccuracy / 100) * 10) / 10,
      goalInvolvement: Math.round(((s.goals + s.assists) / p90) * 10) / 10,
    };
  }

  async fetchLiveMatches(leagueId: string = "eng.1"): Promise<any[]> {
    try {
      const data = await fetchWithTimeout(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard`);
      if (!data || !Array.isArray(data.events)) return [];
      
      return data.events.map((ev: any) => {
        const match = ev.competitions?.[0];
        if (!match) return null;
        const home = match.competitors?.find((c: any) => c.homeAway === 'home');
        const away = match.competitors?.find((c: any) => c.homeAway === 'away');
        return {
          id: ev.id,
          date: new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
          homeTeam: home?.team?.displayName || "TBD", homeLogo: home?.team?.logo || `https://ui-avatars.com/api/?name=${home?.team?.abbreviation || 'TBD'}&background=0a0f18&color=fff`, homeScore: home?.score || 0,
          awayTeam: away?.team?.displayName || "TBD", awayLogo: away?.team?.logo || `https://ui-avatars.com/api/?name=${away?.team?.abbreviation || 'TBD'}&background=0a0f18&color=fff`, awayScore: away?.score || 0,
          status: ev.status?.type?.state || 'post', clock: ev.status?.displayClock || 'FT', isLive: ev.status?.type?.state === 'in'
        };
      }).filter(Boolean);
    } catch (e) { return []; }
  }

  async fetchRealStandings(leagueId: string = "eng.1"): Promise<any[]> {
    if (this.standingsCache.has(leagueId)) return this.standingsCache.get(leagueId)!;

    try {
      const data = await fetchWithTimeout(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`);
      const entries = data?.children?.[0]?.standings?.entries || data?.standings?.entries || [];
      if (!Array.isArray(entries) || entries.length === 0) return [];

      const parsedStandings = entries.map((s: any) => ({
        id: s.team?.id, 
        rank: getESPNStat(s.stats, ['rank', 'R']),
        teamName: s.team?.displayName || "Unknown", 
        logo: s.team?.logos?.[0]?.href || `https://ui-avatars.com/api/?name=${s.team?.abbreviation || 'UNK'}&background=0a0f18&color=10b981`,
        played: getESPNStat(s.stats, ['gamesPlayed', 'P']),
        wins: getESPNStat(s.stats, ['wins', 'W']),
        draws: getESPNStat(s.stats, ['ties', 'D']),
        losses: getESPNStat(s.stats, ['losses', 'L']),
        gf: getESPNStat(s.stats, ['pointsFor', 'goalsFor', 'F']),
        ga: getESPNStat(s.stats, ['pointsAgainst', 'goalsAgainst', 'A']),
        gd: getESPNStat(s.stats, ['pointDifferential', 'GD']),
        points: getESPNStat(s.stats, ['points', 'P']),
      }));

      this.standingsCache.set(leagueId, parsedStandings);
      return parsedStandings;
    } catch (e) { return []; }
  }

  async fetchRealTeams(leagueId: string = "eng.1"): Promise<any[]> {
    if (this.teamsCache.has(leagueId)) return this.teamsCache.get(leagueId)!;

    try {
      const data = await fetchWithTimeout(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/teams`);
      if (!data || !data.sports || !data.sports[0]?.leagues?.[0]?.teams) return [];
      
      const parsedTeams = data.sports[0].leagues[0].teams.map((t: any) => ({
        id: t.team?.id, name: t.team?.displayName, abbreviation: t.team?.abbreviation || "UNK",
        logo: t.team?.logos?.[0]?.href || `https://ui-avatars.com/api/?name=${t.team?.abbreviation || 'UNK'}&background=0a0f18&color=fff`, color: t.team?.color || "10b981"
      }));
      
      if (parsedTeams.length > 0) this.teamsCache.set(leagueId, parsedTeams);
      return parsedTeams;
    } catch (e) { return []; }
  }

  async fetchRealPlayers(leagueId: string = "eng.1"): Promise<any[]> {
    if (this.playersCache.has(leagueId)) return this.playersCache.get(leagueId)!;

    let players: any[] = [];
    console.log(`[FootballService] Descargando plantillas de élite para: ${leagueId}`);

    try {
      const standings = await this.fetchRealStandings(leagueId);
      if (!standings || standings.length === 0) return [];

      const topTeams = standings.slice(0, 4);

      // 🚀 EJECUCIÓN PARALELA SEGURA: Si un equipo falla, devuelve null y NO cuelga la promesa.
      const teamPromises = topTeams.map(t => 
        fetchWithTimeout(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/teams/${t.id}/roster`)
          .catch(e => null) 
      );
      
      const teamResults = await Promise.all(teamPromises);

      teamResults.forEach((rosterData, index) => {
        if (!rosterData) return;

        let athletesArray: any[] = [];
        if (rosterData?.athletes && Array.isArray(rosterData.athletes)) {
          rosterData.athletes.forEach((group: any) => {
            if (group.items && Array.isArray(group.items)) athletesArray.push(...group.items);
          });
        } else if (rosterData?.team?.athletes && Array.isArray(rosterData.team.athletes)) {
          athletesArray = rosterData.team.athletes;
        }

        if (athletesArray.length === 0) return;
        const teamInfo = topTeams[index];

        athletesArray.forEach((ath: any) => {
          const position = ath.position?.name || "Player";
          const isForward = position.toLowerCase().includes("forward") || position.toLowerCase().includes("striker") || position.toLowerCase().includes("attacker");
          const isMid = position.toLowerCase().includes("midfield");
          
          const simulatedGoals = isForward ? Math.floor(Math.random() * 20) + 5 : (isMid ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 3));
          const simulatedAssists = isMid ? Math.floor(Math.random() * 12) + 4 : Math.floor(Math.random() * 6);

          players.push({
            id: String(ath.id || Math.random()), 
            name: ath.displayName || ath.fullName || "Unknown", 
            position: position,
            teamId: teamInfo.id, 
            teamName: teamInfo.teamName, 
            nationality: ath.flag?.alt || "International",
            imageUrl: ath.headshot?.href || `https://ui-avatars.com/api/?name=${encodeURIComponent(ath.displayName || 'UNK')}&background=0a0f18&color=10b981`,
            stats: { 
              goals: simulatedGoals, assists: simulatedAssists, 
              appearances: 25 + Math.floor(Math.random() * 10), minutesPlayed: 2000 + Math.floor(Math.random() * 800), 
              passAccuracy: 75 + Math.floor(Math.random() * 20), tackles: 10 + Math.floor(Math.random() * 30), 
              interceptions: 5 + Math.floor(Math.random() * 20), shotsOnTarget: simulatedGoals * 2 + Math.floor(Math.random() * 10), 
              keyPasses: simulatedAssists * 2 + Math.floor(Math.random() * 15), dribbles: 20 + Math.floor(Math.random() * 40) 
            }
          });
        });
      });

      if (players.length > 0) {
        players.sort((a, b) => b.stats.goals - a.stats.goals);
        this.playersCache.set(leagueId, players);
        return players;
      }
    } catch (error) {
      console.error("[FootballService] Error crítico neutralizado en fetchRealPlayers:", error);
    }

    return [];
  }
}

export const footballService = new FootballService();
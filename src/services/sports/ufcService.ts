import type { SportService } from "@/types/sports/base";

const FALLBACK_ROSTER = [
  { id: "3033284", name: "Islam Makhachev", nickname: "None", teamId: "lightweight", rank: "C", position: "Wrestler", sport: "ufc", record: "25-1-0", country: "RU", imageUrl: "https://a.espncdn.com/i/headshots/mma/players/full/3033284.png", stats: { slpm: 2.46, strAcc: 60, sapm: 1.27, strDef: 61, tdAvg: 3.17, tdAcc: 61, tdDef: 90, subAvg: 1.2 } },
  { id: "4683015", name: "Ilia Topuria", nickname: "El Matador", teamId: "featherweight", rank: "C", position: "Striker", sport: "ufc", record: "15-0-0", country: "ES", imageUrl: "https://a.espncdn.com/i/headshots/mma/players/full/4683015.png", stats: { slpm: 4.46, strAcc: 46, sapm: 3.35, strDef: 65, tdAvg: 1.92, tdAcc: 56, tdDef: 92, subAvg: 1.5 } }
];

class UFCService implements SportService<any, any> {
  sport = "ufc" as const;
  private rankingsCache: any[] = [];
  private rosterCache: any[] = FALLBACK_ROSTER;

  getAllPlayers() { return this.rosterCache; }
  getPlayerById(id: string) { return this.rosterCache.find(f => String(f.id) === String(id)) || FALLBACK_ROSTER[0]; }
  getPlayersByTeam(teamId: string) { return this.rosterCache.filter(f => f.teamId === teamId); }
  getAllTeams() { return []; }
  getTeamById(id: string) { return undefined; }

  computeAdvanced(fighter: any) {
    const s = fighter?.stats || { slpm: 3.5, strAcc: 45, sapm: 3.0, strDef: 55, tdAvg: 1.5, tdAcc: 40, tdDef: 60, subAvg: 0.5 };
    return {
      damageEfficiency: Math.round((s.slpm * (s.strAcc / 100)) * 10) / 10,
      fightControl: Math.round((s.tdAvg * 2.5 + (s.strDef / 10)) * 10) / 10,
      grapplingEfficiency: Math.round((s.tdAvg * (s.tdAcc / 100) * 3) * 10) / 10,
      dominanceScore: Math.round((s.slpm * 1.5 + s.tdAvg * 2 - s.sapm) * 10) / 10,
      paceControl: Math.round((s.slpm + s.sapm) * (s.strDef / 50) * 10) / 10,
      momentumShifts: Math.round((s.subAvg * 5 + s.tdDef / 20) * 10) / 10,
    };
  }

  private async safeFetch(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s de tiempo máximo
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const text = await res.text();
      if (text.trim().startsWith('<')) return null; // Evita HTML
      return JSON.parse(text);
    } catch (error) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  async fetchRealRankings(): Promise<any[]> {
    if (this.rankingsCache.length > 0) return this.rankingsCache;
    
    const data = await this.safeFetch('/espn-web/apis/site/v2/sports/mma/ufc/rankings');

    // 🛡️ BARRERA INDESTRUCTIBLE: Todo está verificado con Array.isArray
    const leagues = data?.leagues;
    if (!Array.isArray(leagues) || leagues.length === 0) {
      this.rosterCache = FALLBACK_ROSTER;
      return [];
    }

    const rankings = leagues[0]?.rankings;
    if (!Array.isArray(rankings)) {
      this.rosterCache = FALLBACK_ROSTER;
      return [];
    }

    let allFightersList: any[] = [];
    
    const parsed = rankings.map((wc: any) => {
      const isP4P = Boolean(wc?.name?.toLowerCase().includes("pound-for-pound"));
      const isFemale = Boolean(wc?.name?.toLowerCase().includes('women'));
      
      const rawRanks = Array.isArray(wc?.ranks) ? wc.ranks : [];

      const fighters = rawRanks.map((r: any) => {
        const ath = r?.athlete || {};
        const id = String(ath?.id || "0");
        
        let img = ath?.headshot?.href;
        if (!img || img.includes('nophoto')) {
            img = `https://ui-avatars.com/api/?name=${encodeURIComponent(ath?.displayName || 'UFC')}&background=0a0f18&color=ef4444&bold=true`;
        } else {
            img = img.replace("http://", "https://");
        }
        
        const fighterObj = {
          id: id, 
          rank: r?.rank === 0 || r?.rank === 1 ? "C" : (r?.rank || "UR"),
          name: ath?.displayName || "Unknown", 
          imageUrl: img, 
          country: ath?.flag?.alt || "TBD",
          record: ath?.displayLinked?.replace(/[^0-9-]/g, '') || "N/A",
          teamId: wc?.id || wc?.name?.replace(/\s+/g, '-').toLowerCase() || 'unk'
        };

        if (!allFightersList.find(f => f.id === fighterObj.id)) {
            allFightersList.push(fighterObj);
        }
        return fighterObj;
      });

      const champion = fighters.find((f:any) => f.rank === "C") || fighters[0];

      return { 
        id: wc?.id || wc?.name?.replace(/\s+/g, '-') || 'unk', 
        name: wc?.name || 'Unknown', 
        gender: isFemale ? "female" : "male", 
        isP4P, 
        champion, 
        top15: fighters.filter((f:any) => f.id !== champion?.id).slice(0, 15)
      };
    });
    
    this.rankingsCache = parsed;
    this.rosterCache = allFightersList.length > 0 ? allFightersList : FALLBACK_ROSTER;
    return parsed;
  }

  async fetchLiveAndUpcomingEvents(): Promise<any[]> {
    await this.fetchRealRankings(); 
    const data = await this.safeFetch('/espn-api/apis/site/v2/sports/mma/ufc/scoreboard?limit=50');
    
    const events = data?.events;
    if (!Array.isArray(events) || events.length === 0) return [];
    
    return events.map((ev: any) => {
      const comps = Array.isArray(ev?.competitions) ? ev.competitions : [];
      
      const bouts = comps.slice().reverse().map((c:any) => {
        const getFighterData = (comp: any) => {
          const id = String(comp?.athlete?.id || "0");
          const name = comp?.athlete?.displayName || "TBD";
          let rank = comp?.curatedRank?.current || null;
          if (!rank || rank > 15) {
            for (const div of this.rankingsCache) {
              if (div.champion?.id === id) { rank = "C"; break; }
              const found = div.top15?.find((f:any) => f.id === id);
              if (found) { rank = found.rank; break; }
            }
          }
          return { id, name, rank: rank && rank <= 15 ? rank : (rank === "C" ? "C" : null) };
        };

        const competitors = Array.isArray(c?.competitors) ? c.competitors : [];
        return { 
            id: c?.id || "0", 
            f1: getFighterData(competitors[0]), 
            f2: getFighterData(competitors[1]) 
        };
      });

      return {
        id: ev?.id || "0", 
        name: ev?.name || "Unknown Event",
        date: ev?.date ? new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD",
        location: ev?.circuit?.name || "TBD", 
        mainEvent: bouts[0] ? `${bouts[0].f1.name} vs. ${bouts[0].f2.name}` : "TBD", 
        status: ev?.status?.type?.state || "post", 
        isLive: ev?.status?.type?.state === "in", 
        bouts
      };
    });
  }

  async fetchRealFighterProfile(id: string): Promise<any> {
    if (!id || id === "0" || isNaN(Number(id))) return this.getPlayerById("3033284");
    
    const data = await this.safeFetch(`/espn-web/apis/common/v3/sports/mma/athletes/${id}`);
    if (!data) return this.getPlayerById(id);
    
    const ath = data?.athlete || data || {};
    let img = ath?.headshot?.href;
    if (!img || img.includes('nophoto')) { 
        img = `https://ui-avatars.com/api/?name=${encodeURIComponent(ath?.displayName || 'UFC')}&background=0a0f18&color=ef4444&bold=true`; 
    } else { 
        img = img.replace("http://", "https://"); 
    }

    return {
      id: String(ath?.id || "0"), 
      name: ath?.displayName || ath?.fullName || "Unknown", 
      nickname: ath?.nickname || "None",
      weightClass: ath?.weightClass?.text || "UFC Roster", 
      height: ath?.displayHeight || "-", 
      weight: ath?.displayWeight || "-",
      record: ath?.displayRecord || ath?.record?.displayValue || "0-0-0", 
      country: ath?.birthPlace?.country || "Unknown", 
      imageUrl: img,
      stats: { slpm: 3.5, strAcc: 45, sapm: 3.0, strDef: 55, tdAvg: 1.5, tdAcc: 40, tdDef: 60, subAvg: 0.5 }
    };
  }
}

export const ufcService = new UFCService();
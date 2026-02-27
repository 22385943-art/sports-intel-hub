import type { BasePlayer, BaseTeam } from "./base";
import type { NBAPlayer, NBATeam, AdvancedPlayerMetrics, TeamAdvancedMetrics } from "@/data/nba/mockData";

// Re-export the existing types with base compatibility
export type { NBAPlayer, NBATeam, AdvancedPlayerMetrics, TeamAdvancedMetrics };

// Type guards
export function isNBAPlayer(p: BasePlayer): p is NBAPlayer & BasePlayer {
  return p.sport === "nba";
}

export function isNBATeam(t: BaseTeam): t is NBATeam & BaseTeam {
  return t.sport === "nba";
}

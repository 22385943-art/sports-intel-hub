import type { BasePlayer, BaseTeam } from "./base";
import type { FootballPlayer, FootballTeam, FootballAdvancedMetrics } from "@/data/football/mockData";

export type { FootballPlayer, FootballTeam, FootballAdvancedMetrics };

export function isFootballPlayer(p: BasePlayer): p is FootballPlayer & BasePlayer {
  return p.sport === "football";
}

export function isFootballTeam(t: BaseTeam): t is FootballTeam & BaseTeam {
  return t.sport === "football";
}

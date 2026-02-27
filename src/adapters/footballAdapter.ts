/**
 * Football Adapter — Placeholder for future API integration.
 */

import type { FootballPlayer, FootballTeam } from "@/data/football/mockData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiPlayerToFootballPlayer(raw: any): FootballPlayer {
  return raw as FootballPlayer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiTeamToFootballTeam(raw: any): FootballTeam {
  return raw as FootballTeam;
}

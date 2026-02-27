/**
 * NBA Adapter — Transformation layer for future API integration.
 *
 * When connecting to a real API, implement the mapping functions below
 * to transform external data formats into the internal types used by
 * the application (NBAPlayer, NBATeam).
 *
 * For now these are identity placeholders.
 */

import type { NBAPlayer, NBATeam } from "@/data/nba/mockData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiPlayerToNBAPlayer(raw: any): NBAPlayer {
  // TODO: Map real API fields → NBAPlayer shape
  return raw as NBAPlayer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiTeamToNBATeam(raw: any): NBATeam {
  // TODO: Map real API fields → NBATeam shape
  return raw as NBATeam;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiPlayersResponse(data: any[]): NBAPlayer[] {
  return (data ?? []).map(mapApiPlayerToNBAPlayer);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiTeamsResponse(data: any[]): NBATeam[] {
  return (data ?? []).map(mapApiTeamToNBATeam);
}

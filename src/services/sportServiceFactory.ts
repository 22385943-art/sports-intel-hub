import { nbaService } from "./sports/nbaService";
import { footballService } from "./sports/footballService";
import { ufcService } from "./sports/ufcService";
import { euroleagueService } from "./sports/euroleagueService";
import type { SportService } from "@/types/sports/base";

const services: Record<string, SportService<any, any>> = {
  nba: nbaService,
  football: footballService,
  ufc: ufcService,
  euroleague: euroleagueService,
};

export function getSportService(sportSlug: string): SportService<any, any> | null {
  return services[sportSlug] ?? null;
}

// Typed getters for sport-specific service access
export { nbaService } from "./sports/nbaService";
export { footballService } from "./sports/footballService";
export { ufcService } from "./sports/ufcService";
export { euroleagueService } from "./sports/euroleagueService";

import type { BasePlayer, BaseTeam } from "./base";
import type { UFCFighter, UFCAdvancedMetrics } from "@/data/ufc/mockData";

export type { UFCFighter, UFCAdvancedMetrics };

export function isUFCFighter(p: BasePlayer): p is UFCFighter & BasePlayer {
  return p.sport === "ufc";
}

import type { BasePlayer, BaseTeam } from "./base";
import type { UFCFighter } from "@/data/ufc/mockData";

export type { UFCFighter };

export function isUFCFighter(p: BasePlayer): p is UFCFighter & BasePlayer {
  return p.sport === "ufc";
}

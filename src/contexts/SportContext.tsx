import React, { createContext, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";

export type SportSlug = "nba" | "football" | "ufc" | "euroleague";

export interface SportConfig {
  slug: SportSlug;
  name: string;
  icon: string;
  enabled: boolean;
}

export const SPORTS: SportConfig[] = [
  { slug: "nba", name: "NBA", icon: "🏀", enabled: true },
  { slug: "euroleague", name: "Euroleague", icon: "🏀", enabled: false },
  { slug: "football", name: "Football", icon: "⚽", enabled: false },
  { slug: "ufc", name: "UFC", icon: "🥊", enabled: false },
];

interface SportContextValue {
  sport: SportSlug;
  sportConfig: SportConfig;
  allSports: SportConfig[];
  isValidSport: boolean;
}

const SportContext = createContext<SportContextValue | null>(null);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const { sport } = useParams<{ sport: string }>();
  
  const value = useMemo<SportContextValue>(() => {
    const slug = (sport || "nba") as SportSlug;
    const config = SPORTS.find(s => s.slug === slug);
    return {
      sport: slug,
      sportConfig: config || SPORTS[0],
      allSports: SPORTS,
      isValidSport: !!config,
    };
  }, [sport]);

  return (
    <SportContext.Provider value={value}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error("useSport must be used within a SportProvider");
  }
  return context;
}

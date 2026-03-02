import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Header } from "@/components/shared/Header";
import { SportProvider, useSport } from "@/contexts/SportContext";
import { lazy, Suspense } from "react";

// NBA pages
import NBADashboard from "@/pages/nba/Dashboard";
import NBAPlayers from "@/pages/nba/Players";
import NBAPlayerProfile from "@/pages/nba/PlayerProfile";
import NBATeams from "@/pages/nba/Teams";
import NBATeamProfile from "@/pages/nba/TeamProfile";
import NBAAnalytics from "@/pages/nba/Analytics";
import NBACompare from "@/pages/nba/Compare";

// Football pages
import FootballDashboard from "@/pages/football/Dashboard";
import FootballPlayers from "@/pages/football/Players";
import FootballPlayerProfile from "@/pages/football/PlayerProfile";
import FootballTeams from "@/pages/football/Teams";
import FootballTeamProfile from "@/pages/football/TeamProfile";
import FootballAnalytics from "@/pages/football/Analytics";
import FootballCompare from "@/pages/football/Compare";

// UFC pages
import UFCDashboard from "@/pages/ufc/Dashboard";
import UFCFighters from "@/pages/ufc/Fighters";
import UFCFighterProfile from "@/pages/ufc/FighterProfile";
import UFCAnalytics from "@/pages/ufc/Analytics";
import UFCCompare from "@/pages/ufc/Compare";

// Placeholder
import ComingSoon from "@/pages/shared/ComingSoon";

function SportRoutes() {
  const { sport, sportConfig } = useSport();

  if (!sportConfig.enabled) {
    return <ComingSoon />;
  }

  switch (sport) {
    case "nba":
      return (
        <Routes>
          <Route index element={<NBADashboard />} />
          <Route path="players" element={<NBAPlayers />} />
          <Route path="players/:id" element={<NBAPlayerProfile />} />
          <Route path="teams" element={<NBATeams />} />
          <Route path="teams/:id" element={<NBATeamProfile />} />
          <Route path="analytics" element={<NBAAnalytics />} />
          <Route path="compare" element={<NBACompare />} />
          <Route path="*" element={<Navigate to={`/${sport}`} replace />} />
        </Routes>
      );
    case "football":
      return (
        <Routes>
          <Route index element={<FootballDashboard />} />
          <Route path="players" element={<FootballPlayers />} />
          <Route path="players/:id" element={<FootballPlayerProfile />} />
          <Route path="teams" element={<FootballTeams />} />
          <Route path="teams/:id" element={<FootballTeamProfile />} />
          <Route path="analytics" element={<FootballAnalytics />} />
          <Route path="compare" element={<FootballCompare />} />
          <Route path="*" element={<Navigate to={`/${sport}`} replace />} />
        </Routes>
      );
    case "ufc":
      return (
        <Routes>
          <Route index element={<UFCDashboard />} />
          <Route path="players" element={<UFCFighters />} />
          <Route path="players/:id" element={<UFCFighterProfile />} />
          <Route path="analytics" element={<UFCAnalytics />} />
          <Route path="compare" element={<UFCCompare />} />
          <Route path="*" element={<Navigate to={`/${sport}`} replace />} />
        </Routes>
      );
    default:
      return <ComingSoon />;
  }
}

export default function SportLayout() {
  return (
    <SportProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-[#0a0f18]">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-6 lg:p-8">
              <SportRoutes />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SportProvider>
  );
}

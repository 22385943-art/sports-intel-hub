import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Header } from "@/components/shared/Header";
import { SportProvider, useSport } from "@/contexts/SportContext";

// NBA pages
import NBADashboard from "@/pages/nba/Dashboard";
import NBAPlayers from "@/pages/nba/Players";
import NBAPlayerProfile from "@/pages/nba/PlayerProfile";
import NBATeams from "@/pages/nba/Teams";
import NBATeamProfile from "@/pages/nba/TeamProfile";
import NBAAnalytics from "@/pages/nba/Analytics";

// Placeholder for other sports
import ComingSoon from "@/pages/shared/ComingSoon";

function SportRoutes() {
  const { sport, sportConfig } = useSport();

  if (!sportConfig.enabled) {
    return <ComingSoon />;
  }

  // Route to sport-specific pages
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
          <Route path="compare" element={<ComingSoon />} />
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
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-6">
              <SportRoutes />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SportProvider>
  );
}

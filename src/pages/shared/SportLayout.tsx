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
import NBAStandings from "@/pages/nba/Standings";
import NBAAnalytics from "@/pages/nba/Analytics";
import NBACompare from "@/pages/nba/Compare";
import NBASchedule from "@/pages/nba/Schedule";
import NBAGamePreview from "@/pages/nba/GamePreview";
import NBABoxScore from "@/pages/nba/BoxScore";
import Favorites from "@/pages/shared/Favorites";

// UFC pages
import UFCDashboard from "@/pages/ufc/Dashboard";
import UFCFighterProfile from "@/pages/ufc/FighterProfile";
import UFCFighters from "@/pages/ufc/Fighters";

// Placeholder
import ComingSoon from "@/pages/shared/ComingSoon";

function SportRoutes() {
  const { sport, sportConfig } = useSport();

  if (!sportConfig.enabled) return <ComingSoon />;

  switch (sport) {
    case "nba":
      return (
        <Routes>
          {/* TUS RUTAS DE NBA INTACTAS */}
          <Route index element={<NBADashboard />} />
          <Route path="players" element={<NBAPlayers />} />
          <Route path="players/:id" element={<NBAPlayerProfile />} />
          <Route path="teams" element={<NBATeams />} />
          <Route path="teams/:id" element={<NBATeamProfile />} />
          <Route path="standings" element={<NBAStandings />} />
          <Route path="schedule" element={<NBASchedule />} />
          <Route path="games/:id" element={<NBAGamePreview />} />
          <Route path="games/:id/boxscore" element={<NBABoxScore />} />
          <Route path="analytics" element={<NBAAnalytics />} />
          <Route path="compare" element={<NBACompare />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="*" element={<Navigate to={`/${sport}`} replace />} />
        </Routes>
      );
    case "ufc":
      return (
        <Routes>
          <Route index element={<UFCDashboard />} />
          <Route path="fighters" element={<UFCFighters />} /> {/* <--- AÑADE ESTA RUTA */}
          <Route path="fighters/:id" element={<UFCFighterProfile />} />
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
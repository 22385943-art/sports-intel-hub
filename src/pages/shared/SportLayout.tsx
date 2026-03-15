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

// Football pages
import FootballDashboard from "@/pages/football/Dashboard";
import FootballPlayers from "@/pages/football/Players";
import FootballPlayerProfile from "@/pages/football/PlayerProfile";
import FootballTeams from "@/pages/football/Teams";
import FootballTeamProfile from "@/pages/football/TeamProfile";
import FootballAnalytics from "@/pages/football/Analytics";
import FootballCompare from "@/pages/football/Compare";
import FootballStandings from "@/pages/football/Standings";
import FootballSchedule from "@/pages/football/Schedule";

// Shared
import Favorites from "@/pages/shared/Favorites";
import ComingSoon from "@/pages/shared/ComingSoon";

function SportRoutes() {
  const { sport, sportConfig } = useSport();

  if (!sportConfig.enabled) return <ComingSoon />;

  switch (sport) {
    case "nba":
      return (
        <Routes>
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
    case "football":
      return (
        <Routes>
          <Route index element={<FootballDashboard />} />
          <Route path="players" element={<FootballPlayers />} />
          <Route path="players/:id" element={<FootballPlayerProfile />} />
          <Route path="teams" element={<FootballTeams />} />
          <Route path="teams/:id" element={<FootballTeamProfile />} />
          <Route path="standings" element={<FootballStandings />} />
          <Route path="schedule" element={<FootballSchedule />} />
          <Route path="analytics" element={<FootballAnalytics />} />
          <Route path="compare" element={<FootballCompare />} />
          <Route path="favorites" element={<Favorites />} />
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
        <div className="min-h-screen flex w-full bg-[#030712] relative overflow-hidden">
          {/* Ambient background glows */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute w-[800px] h-[800px] bg-cyan-900/[0.07] rounded-full blur-[200px] -top-[200px] -left-[200px]" />
            <div className="absolute w-[600px] h-[600px] bg-indigo-900/[0.05] rounded-full blur-[180px] top-1/2 right-[-150px]" />
            <div className="absolute w-[500px] h-[500px] bg-rose-900/[0.04] rounded-full blur-[160px] bottom-[-100px] left-1/3" />
          </div>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 relative z-10">
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
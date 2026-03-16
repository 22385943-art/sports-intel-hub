import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Header } from "@/components/shared/Header";
import { SportProvider, useSport } from "@/contexts/SportContext";
import { AnimatePresence, motion } from "framer-motion";

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

function AnimatedContent() {
  const location = useLocation();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[300px] -left-[200px] w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-[180px]" />
          <div className="absolute -bottom-[200px] -right-[200px] w-[600px] h-[600px] rounded-full bg-destructive/[0.03] blur-[160px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-chart-positive/[0.02] blur-[200px]" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 p-6 lg:p-8"
          >
            <SportRoutes />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function SportLayout() {
  return (
    <SportProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <AnimatedContent />
        </div>
      </SidebarProvider>
    </SportProvider>
  );
}

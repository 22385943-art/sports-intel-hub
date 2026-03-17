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
import NBARankings from "@/pages/nba/Rankings"; // 🚀 AÑADIDO

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
          <Route path="rankings" element={<NBARankings />} /> {/* 🚀 AÑADIDO */}
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
    <div className="flex-1 flex flex-col min-w-0 relative">
      <Header />
      <main className="flex-1 relative overflow-x-hidden overflow-y-auto scrollbar-premium">
        
        {/* 🚀 MASSIVE VOLUMETRIC LIGHTING & NOISE */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen">
          <div className="absolute inset-0 bg-noise opacity-50 mix-blend-overlay z-10" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[400px] -left-[200px] w-[1000px] h-[1000px] rounded-full bg-cyan-900/[0.15] blur-[150px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} 
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-[20%] right-[-400px] w-[900px] h-[900px] rounded-full bg-emerald-900/[0.12] blur-[180px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} 
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute -bottom-[300px] left-[10%] w-[1000px] h-[1000px] rounded-full bg-rose-900/[0.12] blur-[160px]" 
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 p-6 lg:p-10"
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
        <div className="min-h-screen flex w-full bg-background selection:bg-primary/30 selection:text-primary">
          <AppSidebar />
          <AnimatedContent />
        </div>
      </SidebarProvider>
    </SportProvider>
  );
}
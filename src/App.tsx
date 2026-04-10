import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SportLayout from "@/pages/shared/SportLayout";
import NotFound from "@/pages/NotFound";


const queryClient = new QueryClient();

const App = () => {
  // 🚀 MODO WAR ROOM FORZADO: Bloqueamos la app en Dark Mode permanentemente
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    // Opcional: Forzar en el localStorage por si el botón de Lovable intenta leerlo
    localStorage.setItem("theme", "dark");
    localStorage.setItem("vite-ui-theme", "dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to default sport */}
            <Route path="/" element={<Navigate to="/nba" replace />} />
            {/* Dynamic sport routing */}
            <Route path="/:sport/*" element={<SportLayout />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
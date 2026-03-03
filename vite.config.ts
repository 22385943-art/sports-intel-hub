import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/nba-api': {
        target: 'https://stats.nba.com/stats',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba-api/, ''),
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.nba.com/',
          'Origin': 'https://www.nba.com',
        }
      },
      '/espn-mma': {
        target: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-mma/, ''),
      },
      // 🚀 NUEVO: PROXY PARA LOS RANKINGS TOP 15 REALES DE ESPN
      '/espn-rankings': {
        target: 'https://site.web.api.espn.com/apis/site/v2/sports/mma/ufc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-rankings/, ''),
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      '/nba-api': {
        target: 'https://stats.nba.com/stats',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba-api/, ''),
        headers: {
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.nba.com/',
        }
      },
      // 🚀 AÑADIDO: Proxy para evitar el error CORS de cdn.nba.com
      '/nba-cdn': {
        target: 'https://cdn.nba.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba-cdn/, ''),
      },
      '/api-espn': {
        target: 'https://site.api.espn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-espn/, ''),
      },
      '/web-espn': {
        target: 'https://site.web.api.espn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/web-espn/, ''),
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
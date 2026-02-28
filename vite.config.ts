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
    // 👇 AÑADIDO EL PROXY NINJA PARA LA API OFICIAL DE LA NBA 👇
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
      }
    }
    // 👆 FIN DEL PROXY 👆
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
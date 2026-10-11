import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  // Vercel dev owns /api routing in services mode. Ordinary local development
  // still forwards browser requests to the independently running FastAPI app.
  server: mode === "services" ? {} : { proxy: { "/api": "http://127.0.0.1:8000" } },
}));

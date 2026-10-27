import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "Client/Toxic"),
  publicDir: path.resolve(__dirname, "Client/Toxic/public"),
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react-router-dom",
      "axios",
      "recharts",
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "esnext",
    minify: "esbuild",
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
    warmup: {
      clientFiles: [
        "./src/main.jsx",
        "./src/App.jsx",
        "./src/pages/Home.jsx",
        "./src/pages/Login.jsx",
        "./src/pages/Register.jsx",
        "./src/pages/Dashboard.jsx",
        "./src/pages/Analysis.jsx",
      ],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});

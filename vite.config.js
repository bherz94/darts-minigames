import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["sloth.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      manifest: {
        name: "Darts Minigames",
        short_name: "Darts",
        description: "Dart Counter und Tic-Tac-Toe Checkout für 2–6 Spieler",
        theme_color: "#020617",
        background_color: "#020617",
        display: "standalone",
        orientation: "any",
        start_url: command === "build" ? "/darts-minigames/" : "/",
        scope: command === "build" ? "/darts-minigames/" : "/",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  base: command === "build" ? "/darts-minigames/" : "/",
}));

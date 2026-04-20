import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Removed svgr import and plugin to avoid dependency issues

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      mode: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Satark-AI: Deepfake Detector",
        short_name: "Satark-AI",
        description: "Advanced Deepfake Detection & Speaker Verification App",
        theme_color: "#ffffff",
        icons: [
          {
            src: "logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
            method: "GET",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("@clerk")) return "vendor-clerk";
          if (id.includes("framer-motion")) return "vendor-framer";
          if (id.includes("react-dom") || id.includes("react-router"))
            return "vendor-react";
          if (id.includes("recharts") || id.includes("d3"))
            return "vendor-charts";
          if (id.includes("wavesurfer") || id.includes("lamejs"))
            return "vendor-audio";
          if (id.includes("node_modules")) return "vendor-misc";
        },
      },
    },
  },
});

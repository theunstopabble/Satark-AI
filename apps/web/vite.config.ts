import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "@svgr/plugin-svgr";

export default defineConfig({
  plugins: [
    react(),
    svgr(),
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
        // Disable precaching for dynamic API routes
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
    // Enable CSS code splitting
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split vendor bundles so browsers can cache them separately
        manualChunks: (id) => {
          // Clerk auth - isolated so it doesn't block initial render
          if (id.includes("@clerk")) return "vendor-clerk";
          // Framer motion - large animation lib, isolated
          if (id.includes("framer-motion")) return "vendor-framer";
          // React core - essential, cached forever
          if (id.includes("react-dom") || id.includes("react-router"))
            return "vendor-react";
          // Charting / visualization
          if (id.includes("recharts") || id.includes("d3"))
            return "vendor-charts";
          // Heavy audio processing utilities
          if (id.includes("wavesurfer") || id.includes("lamejs"))
            return "vendor-audio";
          // All other node_modules
          if (id.includes("node_modules")) return "vendor-misc";
        },
      },
    },
  },
});

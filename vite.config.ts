import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Backlog B-01: service worker and web app manifest.
    VitePWA({
      // "prompt" means a new service worker waits instead of taking over a
      // running app. src/pwa/registerServiceWorker.ts activates it at a safe
      // moment (app in the background, not on a panic screen); otherwise the
      // browser activates it on the next launch.
      registerType: "prompt",
      // The manifest link is injected into index.html by the plugin;
      // registration is done from src/main.tsx.
      injectRegister: false,
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "am-I-ready.com",
        short_name: "AmIReady",
        description:
          "Preparedness toolkit: encrypted vault, emergency plans, Red Folder and panic button.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#1b294b",
        background_color: "#ffffff",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the whole app shell: every route is a lazily loaded chunk,
        // and any of them must open offline after a single first visit.
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        // Only useful to link previews, never to the app.
        globIgnores: ["og-image.png"],
        // Client-side routing: any navigation inside the app gets the shell.
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        // The landing page and vault wizard background is a 2.6 MB PNG, over
        // the 2 MiB default, and the build fails rather than silently leaving
        // it out. Shrinking the image is tracked in docs/backlog.md (Phase U).
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // No runtimeCaching on purpose. Supabase (API, auth, edge functions)
        // and Stripe responses are never stored by the service worker; data
        // offline is backlog B-03.
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

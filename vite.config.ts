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
      // running app. src/pwa/serviceWorker.ts activates it at app start when
      // this is the only open tab; otherwise the browser activates it once
      // every tab of the app is closed. A running app is never reloaded.
      registerType: "prompt",
      // The manifest link is injected into index.html by the plugin.
      // Registration is done by src/pwa/serviceWorker.ts, not by the plugin's
      // helper, which reloads every tab when a new worker takes control.
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
        // Precache the whole build, not only what the first visit loads:
        // most routes are separate, lazily loaded chunks, and any of them
        // must open offline after a single first visit.
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        // Only useful to link previews, never to the app.
        globIgnores: ["og-image.png"],
        // Client-side routing: a navigation to an app route gets the shell.
        navigateFallback: "index.html",
        // Real files are not app routes and must come from the server, not be
        // answered with the shell: anything under /.well-known/, and any path
        // whose last segment has an extension (robots.txt, og-image.png,
        // sw.js). The pattern is tested against path + query string; a dot in
        // the query (/auth/callback?code=a.b) does not count.
        navigateFallbackDenylist: [/^\/\.well-known\//, /^[^?]*\/[^/?]+\.[^/?]+(\?.*)?$/],
        cleanupOutdatedCaches: true,
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

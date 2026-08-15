import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

function injectGoogleAnalytics(gaMeasurementId: string | undefined, mode: string): Plugin {
  return {
    name: "inject-google-analytics",
    transformIndexHtml(html) {
      if (mode !== "production" || !gaMeasurementId) return html;
      const snippet = `
    <!-- Google Analytics (GA4) — base tag; SPA pageviews tracked in AnalyticsScripts -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${gaMeasurementId}', { send_page_view: false });
    </script>`;
      return html.replace("</head>", `${snippet}\n  </head>`);
    },
  };
}

const PWA_THEME_COLOR = "#3858E8";
const PWA_BACKGROUND_COLOR = "#FFFFFF";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gaMeasurementId = env.VITE_GA_MEASUREMENT_ID?.trim();

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    sourcemapIgnoreList: false,
  },
  css: {
    devSourcemap: true,
  },
  plugins: [
    injectGoogleAnalytics(gaMeasurementId, mode),
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["robots.txt", "sitemap.xml", "llms.txt"],
      pwaAssets: mode === "production" ? { config: true } : false,
      manifest: {
        name: "PowerProof — India's Business Opportunity Platform",
        short_name: "PowerProof",
        description: "Discover a growing catalog of curated business opportunities in India.",
        theme_color: PWA_THEME_COLOR,
        background_color: PWA_BACKGROUND_COLOR,
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        categories: ["business", "finance", "productivity"],
        lang: "en",
        dir: "ltr",
        id: "/",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hoqdmbsimyizfbwyoqru\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/get\.geojs\.io\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "geojs",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: ["framer-motion", "@remixicon/react"],
        },
      },
    },
  },
};
});

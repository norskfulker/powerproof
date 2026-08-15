/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Dev-only: Anthropic key for B2B AI draft in the browser (prefer a backend proxy in production). */
  readonly VITE_ANTHROPIC_API_KEY?: string
  /** Browser key for sourcing keyword chip generation (Gemini). */
  readonly VITE_GEMINI_API_KEY?: string
  /** Microsoft Clarity project ID (production analytics). */
  readonly VITE_CLARITY_PROJECT_ID?: string
  /** Google Analytics 4 measurement ID, e.g. G-XXXXXXXX. */
  readonly VITE_GA_MEASUREMENT_ID?: string
  /** Set to "true" to load GA4 in local dev (for Realtime debugging). */
  readonly VITE_GA_DEBUG?: string
  /** Meta (Facebook) Pixel ID for production conversion tracking. */
  readonly VITE_META_PIXEL_ID?: string
  /** GitBook docs URL for marketing navbar (external). */
  readonly VITE_GITBOOK_DOCS_URL?: string
  /** Localhost dev sign-in password (optional — can type in UI instead). */
  readonly VITE_DEV_LOGIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

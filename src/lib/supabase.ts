import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://hoqdmbsimyizfbwyoqru.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWRtYnNpbXlpemZid3lvcXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTMxMDUsImV4cCI6MjA4ODk2OTEwNX0.kiN0v_MOn-fp4ACQALWrVsQjzlcYtgzflqSBDycPrJc'
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_SUPABASE_ANON_KEY

declare global {
  interface Window {
    __nm_supabase?: SupabaseClient
  }
}

function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
}

// Ensure we don't create multiple clients during Vite HMR / React strict double-mount.
export const supabase =
  typeof window !== 'undefined' && window.__nm_supabase
    ? window.__nm_supabase
    : createSupabaseClient()

if (typeof window !== 'undefined') {
  window.__nm_supabase = supabase
}

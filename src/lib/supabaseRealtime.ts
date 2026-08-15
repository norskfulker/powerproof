import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Realtime subscriptions require an authenticated Supabase session. */
export function canSubscribeSupabaseRealtime(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.id)
}

/** Session check for effects that run outside React auth context. */
export async function canSubscribeSupabaseRealtimeAsync(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return canSubscribeSupabaseRealtime(data.session)
}

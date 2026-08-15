import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { json } from './http.ts'

export type AuthedUser = { id: string; email?: string; role?: string }

/**
 * Command Center uses a service-role Supabase client and does its own token parsing.
 * This avoids SDK signature verification issues when the gateway uses ES256 but the SDK expects HS256.
 */
export function parseAuthenticatedJwtUser(authorizationHeader: string | null): AuthedUser | null {
  if (!authorizationHeader) return null
  const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as { sub?: string; email?: string; role?: string; exp?: number }

    if (!payload.sub) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    if (payload.role !== 'authenticated') return null
    return { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export async function requireAuthUserViaSupabase(req: Request): Promise<Response | null> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) {
    return json({ error: 'Missing Authorization bearer token' }, 401)
  }
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!url || !anon) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return json({ error: error?.message ?? 'Unauthorized' }, 401)
  }
  return null
}


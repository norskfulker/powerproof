import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AdminOwnerProfile = {
  id: string
  email: string
  full_name: string
}

function buildOwnerIdsKey(userIds: Array<string | null | undefined>): string {
  const set = new Set<string>()
  for (const id of userIds) {
    if (id) set.add(id)
  }
  return [...set].sort().join(',')
}

export function useAdminOwnerProfiles(userIds: Array<string | null | undefined>) {
  const [profiles, setProfiles] = useState<Map<string, AdminOwnerProfile>>(new Map())
  const idsKey = buildOwnerIdsKey(userIds)

  useEffect(() => {
    if (!idsKey) {
      setProfiles((prev) => (prev.size === 0 ? prev : new Map()))
      return
    }

    const uniqueIds = idsKey.split(',')

    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', uniqueIds)

      if (cancelled) return

      const map = new Map<string, AdminOwnerProfile>()
      if (!error) {
        for (const row of data ?? []) {
          map.set(String(row.id), {
            id: String(row.id),
            email: String(row.email ?? ''),
            full_name: String(row.full_name ?? ''),
          })
        }
      }
      setProfiles(map)
    })()

    return () => {
      cancelled = true
    }
  }, [idsKey])

  return profiles
}

export function adminOwnerSearchBlob(
  userId: string | null | undefined,
  profiles: Map<string, AdminOwnerProfile>,
): string {
  if (!userId) return ''
  const profile = profiles.get(userId)
  return [userId, profile?.email, profile?.full_name]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')
}

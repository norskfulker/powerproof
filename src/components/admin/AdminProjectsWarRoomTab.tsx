import { useEffect, useMemo, useState } from 'react'
import { Swords } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import {
  AdminKpiGrid,
  AdminSearchInput,
  AdminStatCard,
} from '@/components/admin/adminUi'
import {
  AdminProjectWarRoomPanel,
  type AdminWarRoomRow,
} from '@/components/admin/AdminProjectWarRoomPanel'
import { adminOwnerSearchBlob, useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function AdminProjectsWarRoomTab() {
  const [rows, setRows] = useState<AdminWarRoomRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('admin_list_war_room_playbooks')
      if (cancelled) return
      if (error) {
        toast('Could not load War Room', { description: error.message })
        setRows([])
      } else {
        setRows(asArray<AdminWarRoomRow>(data))
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ownerProfiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const blob = [
        r.business_name,
        r.business_description,
        r.generation_status,
        r.project_name,
        r.project_id,
        adminOwnerSearchBlob(r.user_id, ownerProfiles),
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [rows, search, ownerProfiles])

  const complete = rows.filter((r) => r.generation_status === 'complete').length
  const pending = rows.filter((r) => r.generation_status === 'pending').length

  return (
    <div className="space-y-4">
      <AdminSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search playbook, owner…"
      />
      <AdminKpiGrid cols={2} className="mb-5">
        <AdminStatCard label="Total playbooks" value={rows.length} icon={<Swords className="h-4 w-4 text-red-500" />} />
        <AdminStatCard label="Complete" value={complete} icon={<Swords className="h-4 w-4 text-success" />} />
        <AdminStatCard label="In progress" value={pending} icon={<Swords className="h-4 w-4 text-muted-foreground" />} />
      </AdminKpiGrid>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <AdminProjectWarRoomPanel rows={filtered} scope="global" ownerProfiles={ownerProfiles} />
      )}
    </div>
  )
}

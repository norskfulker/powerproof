import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Map } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import {
  AdminKpiGrid,
  AdminOwnerCell,
  AdminPanelCard,
  AdminSearchInput,
  AdminStatCard,
  AdminTableWrap,
} from '@/components/admin/adminUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { adminOwnerSearchBlob, useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'

export type AdminRoadmapRow = {
  id: string
  user_id?: string | null
  title?: string | null
  goal_input?: string | null
  domain?: string | null
  generation_status?: string | null
  total_phases?: number | null
  total_tasks?: number | null
  total_weeks?: number | null
  credits_used?: number | null
  created_at?: string | null
  updated_at?: string | null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function formatWhen(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }: { status?: string | null }) {
  const label = status?.trim() || '—'
  const tone =
    label === 'complete'
      ? 'bg-success/10 text-success'
      : label === 'failed'
        ? 'bg-destructive/10 text-destructive'
        : label === 'processing' || label === 'pending'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', tone)}>
      {label}
    </span>
  )
}

export function AdminRoadmapAnalyticsTab() {
  const [rows, setRows] = useState<AdminRoadmapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('admin_list_user_roadmaps')
      if (cancelled) return
      if (error) {
        toast('Could not load roadmaps', { description: error.message })
        setRows([])
      } else {
        setRows(asArray<AdminRoadmapRow>(data))
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
        r.title,
        r.goal_input,
        r.domain,
        r.generation_status,
        adminOwnerSearchBlob(r.user_id, ownerProfiles),
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [rows, search, ownerProfiles])

  const complete = rows.filter((r) => r.generation_status === 'complete').length

  return (
    <div className="space-y-4">
      <AdminSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search title, goal, domain, owner…"
      />
      <AdminKpiGrid cols={2}>
        <AdminStatCard label="Total roadmaps" value={rows.length} icon={<Map className="h-4 w-4 text-violet-500" />} />
        <AdminStatCard label="Complete" value={complete} icon={<Map className="h-4 w-4 text-success" />} />
      </AdminKpiGrid>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <AdminPanelCard>
          <h2 className="mb-1 text-sm font-bold text-foreground">Roadmaps</h2>
          <p className="mb-4 text-xs text-muted-foreground">All user roadmaps across the platform.</p>
          <AdminTableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phases</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No roadmaps yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <AdminOwnerCell userId={row.user_id} profiles={ownerProfiles} />
                      </TableCell>
                      <TableCell className="max-w-[200px] font-medium">{row.title?.trim() || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.domain ?? '—'}</TableCell>
                      <TableCell>
                        <StatusPill status={row.generation_status} />
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{row.total_phases ?? '—'}</TableCell>
                      <TableCell className="text-sm tabular-nums">{row.credits_used ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatWhen(row.updated_at || row.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/roadmap/${row.id}`} className="text-xs font-semibold text-primary hover:underline">
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AdminTableWrap>
        </AdminPanelCard>
      )}
    </div>
  )
}

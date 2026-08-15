import { Link } from 'react-router-dom'
import { AdminOwnerCell, AdminPanelCard, AdminTableWrap } from '@/components/admin/adminUi'
import type { AdminOwnerProfile } from '@/hooks/useAdminOwnerProfiles'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { playbookCardTitle } from '@/lib/playbookDisplay'
import { cn } from '@/lib/utils'

export type AdminWarRoomRow = {
  id: string
  user_id?: string | null
  project_id?: string | null
  project_name?: string | null
  business_name?: string | null
  business_description?: string | null
  generation_status?: string | null
  credits_used?: number | null
  steps_checked?: number | null
  step_count?: number | null
  created_at?: string | null
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
    label === 'complete' || label === 'ready'
      ? 'bg-success/10 text-success'
      : label === 'failed'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground'
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tone,
      )}
    >
      {label}
    </span>
  )
}

export function AdminProjectWarRoomPanel({
  rows,
  scope = 'workspace',
  ownerProfiles,
}: {
  rows: AdminWarRoomRow[]
  scope?: 'workspace' | 'global'
  ownerProfiles?: Map<string, AdminOwnerProfile>
}) {
  const global = scope === 'global'
  const emptyColSpan = global ? 7 : 6

  return (
    <AdminPanelCard>
      <h2 className="mb-1 text-sm font-bold text-foreground">War Room playbooks</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        {global
          ? 'All War Room playbooks across users.'
          : 'Playbooks generated for this workspace.'}
      </p>
      <AdminTableWrap>
        <Table>
          <TableHeader>
            <TableRow>
              {global ? <TableHead>Owner</TableHead> : null}
              <TableHead>Playbook</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={emptyColSpan} className="text-muted-foreground">
                  {global
                    ? 'No War Room playbooks yet.'
                    : 'No War Room playbooks for this workspace.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const total = row.step_count ?? 0
                const checked = row.steps_checked ?? 0
                const progress = total > 0 ? `${checked}/${total}` : '—'
                return (
                  <TableRow key={row.id}>
                    {global ? (
                      <TableCell>
                        <AdminOwnerCell
                          userId={row.user_id}
                          profiles={ownerProfiles ?? new Map()}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-[240px] font-medium">
                      {playbookCardTitle(row, 80)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={row.generation_status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{progress}</TableCell>
                    <TableCell className="text-sm tabular-nums">{row.credits_used ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatWhen(row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/playbook/${row.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Playbook
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </AdminTableWrap>
    </AdminPanelCard>
  )
}

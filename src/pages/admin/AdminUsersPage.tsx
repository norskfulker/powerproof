import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Shield, Users, Wallet } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { BUDGET_BUCKET_LABELS_USD } from '@/lib/opportunityBudgetUsd'
import { Button } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPillButton,
  AdminSearchInput,
  AdminSortTableHead,
  AdminStatCard,
  AdminTableWrap,
  AdminUserAvatar,
} from '@/components/admin/adminUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminCreditsPage } from '@/pages/admin/AdminCreditsPage'
import { cn } from '@/lib/utils'

const ROLES = ['user', 'admin', 'super_admin'] as const

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  onboarding_completed: boolean
  budget_range: string
  preferred_state: string
  created_at: string
  last_active_at: string
}

type UserSortKey = 'user' | 'joined'
type SortDir = 'asc' | 'desc'

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'credits' ? 'credits' : 'users'
  const creditsUserId = searchParams.get('userId')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<UserSortKey | null>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    void fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, role, onboarding_completed, budget_range, preferred_state, created_at, last_active_at',
      )
      .order('created_at', { ascending: false })
    if (!error && data) setUsers(data as UserRow[])
    setLoading(false)
  }

  async function updateUserRole(userId: string, role: string) {
    setSaving(userId)
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    setSaving(null)
  }

  const handleSort = (key: string) => {
    const k = key as UserSortKey
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(k === 'joined' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q),
    )
  }, [users, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'user') {
        const la = (a.full_name || a.email || '').toLowerCase()
        const lb = (b.full_name || b.email || '').toLowerCase()
        cmp = la.localeCompare(lb)
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortDir])

  const BUDGET_LABELS: Record<string, string> = { ...BUDGET_BUCKET_LABELS_USD }

  return (
    <AdminPageShell className="max-w-none">
      <AdminPageHeader
        title="Users"
        description="Manage roles and credit balances."
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'credits') setSearchParams({ tab: 'credits' })
          else setSearchParams({})
        }}
      >
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="credits" className="mt-0">
          <AdminCreditsPage
            embedded
            initialUserId={creditsUserId}
            onInitialUserConsumed={() => {
              if (creditsUserId) setSearchParams({ tab: 'credits' })
            }}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AdminSearchInput value={search} onChange={setSearch} />
            <AdminPillButton onClick={() => void fetchUsers()}>↻ Refresh</AdminPillButton>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 layout-sm:grid-cols-4">
            <AdminStatCard label="Total users" value={users.length} icon={<Users className="h-4 w-4 text-primary" />} />
            <AdminStatCard
              label="Budget preference set"
              value={users.filter((u) => Boolean(u.budget_range)).length}
              icon={<Wallet className="h-4 w-4 text-[hsl(var(--kind-svc))]" />}
            />
            <AdminStatCard
              label="Admins"
              value={users.filter((u) => ['admin', 'super_admin'].includes(u.role)).length}
              icon={<Shield className="h-4 w-4 text-blue-600" />}
            />
            <AdminStatCard
              label="Onboarded"
              value={users.filter((u) => u.onboarding_completed).length}
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            />
          </div>

          {loading ? (
            <p className="py-10 text-center text-muted-foreground">Loading…</p>
          ) : (
            <AdminTableWrap>
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-sunken hover:bg-bg-sunken">
                    <AdminSortTableHead
                      label="User"
                      sortKey="user"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <TableHead>Role</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Onboarded</TableHead>
                    <AdminSortTableHead
                      label="Joined"
                      sortKey="joined"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        {search.trim() ? 'No users match your search.' : 'No users found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <AdminUserAvatar name={user.full_name || user.email || 'U'} />
                            <div>
                              <div className="text-[13px] font-medium">{user.full_name || '—'}</div>
                              <div className="text-[11px] text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(role) => void updateUserRole(user.id, role)}
                            disabled={saving === user.id}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {saving === user.id ? (
                            <span className="mt-1 block text-[11px] text-primary">Saving…</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {BUDGET_LABELS[user.budget_range] || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{user.preferred_state || '—'}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px]',
                              user.onboarding_completed
                                ? 'bg-success-bg text-success'
                                : 'bg-bg-sunken text-muted-foreground',
                            )}
                          >
                            {user.onboarding_completed ? '✓ Done' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setSearchParams({ tab: 'credits', userId: user.id })
                            }
                          >
                            Add credits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </AdminTableWrap>
          )}

          <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            ⚠ Role changes take effect immediately. Changing role to admin gives full platform management access. Be
            careful with super_admin — it cannot be revoked by anyone except another super_admin.
          </p>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}

export default AdminUsersPage

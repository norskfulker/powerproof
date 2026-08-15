import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AdminSearchInput,
  AdminStatCard,
  AdminTableWrap,
  AdminTablePagination,
  AdminUserAvatar,
  AdminPillButton,
  useAdminTablePagination,
} from '@/components/admin/adminUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/sonner'
import { Gift, Minus, Plus, TrendingUp, Users } from '@/lib/icons'

interface UserCredit {
  user_id: string
  balance: number
  lifetime_earned: number
  lifetime_purchased: number
  lifetime_spent: number
  email: string
  full_name: string
  created_at: string
}

type ProfileCreditsRow = {
  id: string
  email: string | null
  full_name: string | null
  created_at: string | null
  user_credits:
    | {
        balance: number | null
        lifetime_earned: number | null
        lifetime_purchased: number | null
        lifetime_spent: number | null
      }
    | Array<{
        balance: number | null
        lifetime_earned: number | null
        lifetime_purchased: number | null
        lifetime_spent: number | null
      }>
    | null
}

function parseProfileCreditsRow(row: ProfileCreditsRow): UserCredit {
  const creditsRaw = row.user_credits
  const credits = Array.isArray(creditsRaw) ? creditsRaw[0] : creditsRaw

  return {
    user_id: row.id,
    balance: Number(credits?.balance ?? 0),
    lifetime_earned: Number(credits?.lifetime_earned ?? 0),
    lifetime_purchased: Number(credits?.lifetime_purchased ?? 0),
    lifetime_spent: Number(credits?.lifetime_spent ?? 0),
    email: String(row.email ?? ''),
    full_name: String(row.full_name ?? row.email ?? ''),
    created_at: String(row.created_at ?? ''),
  }
}

export function AdminCreditsPage({
  embedded = false,
  initialUserId,
  onInitialUserConsumed,
}: {
  embedded?: boolean
  /** Open adjust modal for this user once the list loads. */
  initialUserId?: string | null
  onInitialUserConsumed?: () => void
}) {
  const [users, setUsers] = useState<UserCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null)
  const [showBulkGift, setShowBulkGift] = useState(false)

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreditsInCirculation: 0,
    totalPurchased: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    void loadUsers()
    void loadStats()
  }, [])

  useEffect(() => {
    if (!initialUserId || loading || users.length === 0) return
    const match = users.find((u) => u.user_id === initialUserId)
    if (match) {
      setSelectedUser(match)
      setShowAdjustModal(true)
      onInitialUserConsumed?.()
    }
  }, [initialUserId, loading, users, onInitialUserConsumed])

  const loadUsers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        created_at,
        user_credits (
          balance,
          lifetime_earned,
          lifetime_purchased,
          lifetime_spent
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AdminCredits] Load users error:', error)
      toast.error('Failed to load users')
      setUsers([])
      setLoading(false)
      return
    }

    const formatted = (data as ProfileCreditsRow[] | null)?.map(parseProfileCreditsRow) ?? []

    setUsers(formatted)
    setLoading(false)
  }

  const loadStats = async () => {
    const [profilesRes, creditsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_credits').select('balance, lifetime_purchased, lifetime_spent'),
    ])

    if (creditsRes.error) {
      console.error('[AdminCredits] Stats error:', creditsRes.error)
      return
    }

    const data = creditsRes.data ?? []
    const totalBalance = data.reduce((sum, u) => sum + Number((u as { balance?: number }).balance ?? 0), 0)
    const totalPurchased = data.reduce(
      (sum, u) => sum + Number((u as { lifetime_purchased?: number }).lifetime_purchased ?? 0),
      0,
    )
    const totalSpent = data.reduce(
      (sum, u) => sum + Number((u as { lifetime_spent?: number }).lifetime_spent ?? 0),
      0,
    )

    setStats({
      totalUsers: profilesRes.count ?? 0,
      totalCreditsInCirculation: totalBalance,
      totalPurchased,
      totalSpent,
    })
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q),
    )
  }, [users, searchQuery])

  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(filteredUsers)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, setPage])

  const openAdjustModal = (user: UserCredit) => {
    setSelectedUser(user)
    setShowAdjustModal(true)
  }

  return (
    <div className={embedded ? '' : 'mx-auto w-full max-w-platform p-6'}>
      {!embedded ? (
        <div className="mb-6">
          <div className="font-semibold text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Admin
          </div>
          <h1 className="text-xl font-semibold text-foreground">Credit management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust user credits, run bulk gifts, and monitor usage.
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
            <AdminSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or email…"
            />
            <AdminPillButton onClick={() => void loadUsers()}>↻ Refresh</AdminPillButton>
            <Button onClick={() => setShowBulkGift(true)} variant="secondary" size={embedded ? 'sm' : 'default'}>
              <Gift className="mr-2 h-4 w-4" />
              Bulk gift credits
            </Button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 layout-sm:grid-cols-4">
            <AdminStatCard label="Total users" value={stats.totalUsers} icon={<Users className="h-4 w-4 text-primary" />} />
            <AdminStatCard
              label="Credits in circulation"
              value={stats.totalCreditsInCirculation.toLocaleString('en-IN')}
              icon={<TrendingUp className="h-4 w-4 text-success" />}
            />
            <AdminStatCard
              label="Total purchased"
              value={stats.totalPurchased.toLocaleString('en-IN')}
              icon={<Plus className="h-4 w-4 text-[hsl(var(--kind-svc))]" />}
            />
            <AdminStatCard
              label="Total spent"
              value={stats.totalSpent.toLocaleString('en-IN')}
              icon={<Minus className="h-4 w-4 text-[hsl(var(--kind-urg))]" />}
            />
          </div>

          <AdminTableWrap>
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-sunken hover:bg-bg-sunken">
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {searchQuery.trim() ? 'No users match your search.' : 'No users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <AdminUserAvatar name={u.full_name || u.email || 'U'} />
                          <div>
                            <div className="text-sm font-semibold text-foreground">{u.full_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{u.balance}</TableCell>
                      <TableCell className="text-right text-success">{u.lifetime_purchased}</TableCell>
                      <TableCell className="text-right text-[hsl(var(--kind-urg))]">{u.lifetime_spent}</TableCell>
                      <TableCell className="text-right text-[hsl(var(--kind-svc))]">{u.lifetime_earned}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => openAdjustModal(u)}>
                          Add / adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AdminTableWrap>

          <AdminTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />

          {!loading && users.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              All registered users are listed — including accounts with no credit wallet yet. Use{' '}
              <span className="font-medium text-foreground">Add / adjust</span> to grant credits to a specific person.
            </p>
          ) : null}

          {selectedUser ? (
            <AdjustCreditsModal
              user={selectedUser}
              open={showAdjustModal}
              onClose={() => {
                setShowAdjustModal(false)
                setSelectedUser(null)
              }}
              onSuccess={() => {
                void loadUsers()
                void loadStats()
              }}
            />
          ) : null}

          <BulkGiftModal
            open={showBulkGift}
            onClose={() => setShowBulkGift(false)}
            onSuccess={() => {
              void loadUsers()
              void loadStats()
            }}
          />
    </div>
  )
}

function AdjustCreditsModal({
  user,
  open,
  onClose,
  onSuccess,
}: {
  user: UserCredit
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [action, setAction] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const credits = Number(amount || 0)
  const nextBalance = action === 'add' ? user.balance + credits : user.balance - credits

  const handleSubmit = async () => {
    if (!Number.isFinite(credits) || credits <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setLoading(true)
    try {
      if (action === 'add') {
        const { error } = await supabase.rpc('add_credits', {
          p_user_id: user.user_id,
          p_amount: credits,
          p_type: 'gift',
          p_metadata: {
            admin_action: true,
            reason,
            timestamp: new Date().toISOString(),
          },
        })
        if (error) throw error
        toast.success(`Added ${credits} credits to ${user.email}`)
      } else {
        const { error } = await supabase.rpc('deduct_credits_custom', {
          p_user_id: user.user_id,
          p_amount: credits,
          p_reason: reason,
          p_metadata: {
            admin_action: true,
            timestamp: new Date().toISOString(),
          },
        })
        if (error) throw error
        toast.success(`Deducted ${credits} credits from ${user.email}`)
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('[AdminCredits] Adjust credits error:', error)
      toast.error(error?.message || 'Failed to adjust credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust credits</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-foreground">User</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Current balance:{' '}
              <span className="font-semibold font-semibold text-foreground">{user.balance}</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Action</label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add credits</SelectItem>
                <SelectItem value="deduct">Deduct credits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Amount</label>
            <Input
              type="number"
              min="1"
              placeholder="Enter number of credits"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Reason</label>
            <Input placeholder="Why are you adjusting credits?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {credits > 0 ? (
            <div
              className={
                action === 'add'
                  ? 'rounded-lg border border-success/25 bg-success-bg p-3'
                  : 'rounded-lg border border-[hsl(var(--kind-urg)/0.25)] bg-[hsl(var(--kind-urg-bg))] p-3'
              }
            >
              <div className="text-sm text-foreground">
                New balance:{' '}
                <span className="font-semibold font-semibold">{Number.isFinite(nextBalance) ? nextBalance : user.balance}</span>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading} variant={action === 'add' ? 'primary' : 'danger'}>
            {loading ? 'Processing…' : action === 'add' ? 'Add credits' : 'Deduct credits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkGiftModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'new' | 'active'>('all')
  const [loading, setLoading] = useState(false)

  const credits = Number(amount || 0)

  const handleBulkGift = async () => {
    if (!Number.isFinite(credits) || credits <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      let userIds: string[] = []

      if (userFilter === 'all') {
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id')
        if (profilesError) throw profilesError
        userIds = (profiles ?? []).map((p) => String((p as { id: string }).id))
      } else {
        let query = supabase.from('user_credits').select('user_id, created_at, lifetime_purchased')

        if (userFilter === 'new') {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          query = query.gte('created_at', sevenDaysAgo.toISOString())
        } else if (userFilter === 'active') {
          query = query.gt('lifetime_purchased', 0)
        }

        const { data: rows, error: fetchError } = await query
        if (fetchError) throw fetchError
        userIds = ((rows as Array<{ user_id: string }>) ?? []).map((u) => u.user_id)
      }

      if (userIds.length === 0) {
        toast.error('No users matched the filter')
        return
      }

      const now = new Date().toISOString()
      await Promise.all(
        userIds.map((userId) =>
          supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
            p_type: 'gift',
            p_metadata: {
              admin_action: true,
              admin_bulk_gift: true,
              reason: reason || null,
              timestamp: now,
            },
          }),
        ),
      )

      toast.success(`Gifted ${credits} credits to ${userIds.length} users`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('[AdminCredits] Bulk gift error:', error)
      toast.error(error?.message || 'Failed to gift credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk gift credits</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Target users</label>
            <Select value={userFilter} onValueChange={(v) => setUserFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="new">New users (last 7 days)</SelectItem>
                <SelectItem value="active">Active users (has purchases)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Credits per user</label>
            <Input type="number" min="1" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Reason (optional)</label>
            <Input
              placeholder="e.g., Holiday bonus, product launch"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {credits > 0 ? (
            <div className="rounded-lg border border-border bg-[hsl(var(--bg-sunken))] p-3 text-xs text-muted-foreground">
              This will create a transaction per user with <span className="font-semibold font-semibold text-foreground">admin_action</span>.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleBulkGift()} disabled={loading}>
            {loading ? 'Gifting…' : 'Gift credits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


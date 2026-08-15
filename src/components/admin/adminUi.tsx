import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from '@/lib/icons'
import { NotFoundState } from '@/components/NotFoundState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TableHead } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AdminOwnerProfile } from '@/hooks/useAdminOwnerProfiles'

export const ADMIN_TABLE_PAGE_SIZE = 10

export function AdminAccessDenied() {
  return (
    <NotFoundState
      size="md"
      className="py-10"
      message="You do not have permission to access this page."
    />
  )
}

export function AdminPageShell({
  children,
  className,
  compact,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('mx-auto w-full max-w-platform', compact ? 'px-4 py-6 layout-sm:px-6' : 'px-4 py-6 layout-sm:px-8 layout-sm:py-8', className)}>
      {children}
    </div>
  )
}

export function AdminPageHeader({
  title,
  description,
  className,
  actions,
}: {
  title: string
  description?: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h1 className="m-0 font-display text-[28px] font-bold tracking-tight text-foreground layout-lg:text-[32px]">{title}</h1>
        {description ? <p className="mt-1 text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export const adminFieldLabelClass =
  'mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground'

export const adminInputClass =
  'flex h-10 w-full rounded-lg border border-border-default bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring'

export const adminTextareaClass =
  'flex min-h-[80px] w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function AdminPillButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer rounded-full border-[1.5px] border-border-default bg-surface px-3.5 py-2 font-sans text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function AdminSurfaceCard({
  children,
  className,
  padding = 'md',
  topSlot,
}: {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  topSlot?: ReactNode
}) {
  return (
    <Card
      padding={padding}
      radius="lg"
      accent="none"
      className={cn('overflow-hidden', className)}
      topSlot={topSlot}
    >
      {children}
    </Card>
  )
}

export function AdminPanelCard({
  children,
  className,
  padding = 'sm',
}: {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}) {
  return (
    <Card padding={padding} radius="lg" accent="none" className={className}>
      {children}
    </Card>
  )
}

export function AdminKpiGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode
  cols?: 2 | 4
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-7 grid gap-3',
        cols === 2 ? 'grid-cols-2' : 'grid-cols-2 layout-sm:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminStatMini({ label, value }: { label: string; value: number | string }) {
  return (
    <Card padding="sm" radius="lg" accent="none">
      <div className="mb-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="font-sans text-[22px] font-medium text-foreground">{value}</div>
    </Card>
  )
}

/** KPI card with icon — matches credits admin metrics. */
export function AdminStatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <Card padding="md" radius="lg" accent="none">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </Card>
  )
}

export function useAdminTablePagination<T>(items: T[], pageSize = ADMIN_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  return { page, setPage, totalPages, pageItems, pageSize, totalItems }
}

export function AdminTablePagination({
  page,
  totalPages,
  totalItems,
  pageSize = ADMIN_TABLE_PAGE_SIZE,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (totalItems === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className={cn('mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground', className)}>
      <span>
        Showing {from}–{to} of {totalItems}
      </span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <AdminPillButton type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </AdminPillButton>
          <span>
            Page {page} of {totalPages}
          </span>
          <AdminPillButton type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </AdminPillButton>
        </div>
      ) : null}
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder = 'Search by name or email…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative min-w-[220px] flex-1 max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  )
}

export function AdminSortTableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: string
  activeKey: string | null
  dir: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}) {
  const active = activeKey === sortKey
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.06em] text-foreground hover:text-primary"
      >
        {label}
        {active ? (
          dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </TableHead>
  )
}

export function AdminTableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card padding="none" radius="lg" accent="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">{children}</div>
    </Card>
  )
}

export const adminThClass =
  'px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground'

export const adminTdClass = 'px-3.5 py-3 text-sm text-foreground'

export function AdminUserAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
      {name[0]?.toUpperCase() ?? 'U'}
    </div>
  )
}

export function AdminOwnerCell({
  userId,
  profiles,
}: {
  userId?: string | null
  profiles: Map<string, AdminOwnerProfile>
}) {
  if (!userId) return <span className="text-muted-foreground">—</span>

  const profile = profiles.get(userId)
  const email = profile?.email?.trim()
  const fullName = profile?.full_name?.trim()
  const helper = fullName || userId

  const cell = (
    <div className="min-w-0 max-w-[220px]">
      <div className="truncate text-[13px] font-medium text-foreground">{email || userId}</div>
      <div className="truncate text-[11px] text-muted-foreground">{helper}</div>
    </div>
  )

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button type="button" className="max-w-full cursor-default text-left">
          {cell}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs px-3 py-2 text-xs">
        <p className="font-medium text-foreground">{email || 'No email'}</p>
        {fullName ? <p className="mt-0.5 text-muted-foreground">{fullName}</p> : null}
        <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{userId}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function AdminExpandableText({
  text,
  maxLength = 72,
  className,
}: {
  text?: string | null
  maxLength?: number
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const value = text?.trim() || ''

  if (!value) return <span className="text-muted-foreground">—</span>

  const needsTruncate = value.length > maxLength
  if (!needsTruncate) {
    return <span className={cn('whitespace-pre-wrap break-words', className)}>{value}</span>
  }

  const display = expanded ? value : `${value.slice(0, maxLength).trimEnd()}…`

  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      className={cn(
        'max-w-full text-left transition-colors',
        expanded ? 'whitespace-pre-wrap break-words' : 'block truncate',
        'cursor-pointer hover:text-primary',
        className,
      )}
    >
      {display}
    </button>
  )
}

export function AdminListRow({
  left,
  right,
}: {
  left: ReactNode
  right: ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-border-subtle py-2 text-[13px] last:border-b-0">
      <span className="min-w-0 font-semibold text-foreground">{left}</span>
      <span className="shrink-0 font-sans text-muted-foreground">{right}</span>
    </div>
  )
}

export function AdminShortcutCard({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link to={href} className="block no-underline text-inherit">
      <Card padding="md" radius="lg" accent="none" interactive className="h-full">
        <div className="text-[15px] font-bold text-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
      </Card>
    </Link>
  )
}

export function roleSelectClass(role: string) {
  return cn(
    'cursor-pointer rounded-md border px-2 py-1 text-xs font-medium',
    role === 'super_admin' && 'border-amber-200 bg-amber-50 text-amber-900',
    role === 'admin' && 'border-blue-200 bg-blue-50 text-blue-800',
    role !== 'super_admin' && role !== 'admin' && 'border-border-default bg-bg-sunken text-muted-foreground',
  )
}

import { format, formatDistanceToNow } from 'date-fns'
import { CreditsFigure } from '@/components/credits/CreditsIcon'
import { cn } from '@/lib/utils'

export const RESEARCH_STYLE_LABELS: Record<string, string> = {
  standard: 'Standard',
  kpmg: 'KPMG',
  jp_morgan: 'JP Morgan',
  bcg: 'BCG',
  mckinsey: 'McKinsey',
  bain: 'Bain',
}

export const WAR_ROOM_MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash': 'Flash',
  'gemini-2.5-flash-lite': 'Flash Lite',
  'gemini-2.5-pro': 'Pro',
}

export function researchStyleLabel(style: string | null | undefined): string {
  if (!style) return 'Standard'
  return RESEARCH_STYLE_LABELS[style] ?? style.replace(/_/g, ' ')
}

export function warRoomModelLabel(model: string | null | undefined): string {
  if (!model) return '—'
  return WAR_ROOM_MODEL_LABELS[model] ?? model
}

export function formatInr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `₹${n.toLocaleString('en-IN')}`
}

export function formatAdminDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return (
      <div>
        <div className="text-xs text-muted-foreground">{formatDistanceToNow(d, { addSuffix: true })}</div>
        <div className="text-[10px] text-muted-foreground/80">{format(d, 'MMM d')}</div>
      </div>
    )
  } catch {
    return '—'
  }
}

export function TruncateText({
  text,
  max = 60,
  className,
}: {
  text: string | null | undefined
  max?: number
  className?: string
}) {
  const value = text?.trim() || '—'
  if (value === '—') return <span className="text-muted-foreground">—</span>
  const truncated = value.length > max
  return (
    <span title={truncated ? value : undefined} className={className}>
      {truncated ? `${value.slice(0, max)}…` : value}
    </span>
  )
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = status?.trim() || '—'
  const tone =
    label === 'complete' || label === 'ready'
      ? 'bg-success/10 text-success'
      : label === 'pending' || label === 'processing'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : label === 'cancelled'
          ? 'bg-muted text-muted-foreground'
          : label === 'failed'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', tone)}>
      {label}
    </span>
  )
}

export function VerdictBadge({
  verdict,
  label,
  count,
  muted = false,
}: {
  verdict: string
  label: string
  count: number
  muted?: boolean
}) {
  const tone =
    verdict === 'go'
      ? 'bg-success/10 text-success border-success/20'
      : verdict === 'red_flag'
        ? 'bg-destructive/10 text-destructive border-destructive/20'
        : verdict === 'proceed_with_caution'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
          : 'bg-muted text-muted-foreground border-border-subtle'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        tone,
        muted && count === 0 && 'opacity-50',
      )}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </span>
  )
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-muted-foreground">—</span>
  const n = Number(score)
  const tone =
    n >= 70 ? 'text-success' : n >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
  return <span className={cn('text-sm font-bold tabular-nums', tone)}>{n}</span>
}

export function CreditCell({ amount }: { amount: number | null | undefined }) {
  const n = Number(amount ?? 0)
  if (n <= 0) return <span className="text-muted-foreground">—</span>
  return <CreditsFigure amount={n} size="sm" className="text-[13px] text-muted-foreground" />
}

export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return '—'
  return id.length > len ? `${id.slice(0, len)}…` : id
}

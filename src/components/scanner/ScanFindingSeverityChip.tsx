import { AlertCircle, CheckCircle2, XCircle } from '@/lib/icons'
import type { SeoAuditFinding } from '@/lib/websiteScannerApi'
import { cn } from '@/lib/utils'

type FindingKind = 'good' | 'warn' | 'bad'

const FINDING_KIND_META: Record<
  FindingKind,
  {
    label: string
    icon: typeof CheckCircle2
    chipClass: string
    accentClass: string
  }
> = {
  bad: {
    label: 'Critical',
    icon: XCircle,
    chipClass: 'border-red-500/25 bg-red-500/10 text-red-600',
    accentClass: 'border-l-red-500/70',
  },
  warn: {
    label: 'Needs check',
    icon: AlertCircle,
    chipClass: 'border-amber-500/25 bg-amber-500/10 text-amber-600',
    accentClass: 'border-l-amber-500/70',
  },
  good: {
    label: 'Healthy',
    icon: CheckCircle2,
    chipClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
    accentClass: 'border-l-emerald-500/70',
  },
}

function findingKind(severity: string): FindingKind {
  const s = severity.trim().toLowerCase()
  if (s === 'good' || s === 'ok' || s === 'positive') return 'good'
  if (s === 'warn' || s === 'warning' || s === 'medium' || s === 'low' || s === 'info') return 'warn'
  return 'bad'
}

/** Severity chip used on scanner findings (`good` / `warn` / `bad`). */
export function ScanFindingSeverityChip({
  severity,
  className,
}: {
  severity: SeoAuditFinding['severity'] | string
  className?: string
}) {
  const kind = findingKind(severity)
  const meta = FINDING_KIND_META[kind]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        meta.chipClass,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  )
}

export function scanFindingAccentClass(severity: SeoAuditFinding['severity'] | string): string {
  return FINDING_KIND_META[findingKind(severity)].accentClass
}

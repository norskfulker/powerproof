import { Button } from '@/components/ui'
import {
  ScanFindingSeverityChip,
  scanFindingAccentClass,
} from '@/components/scanner/ScanFindingSeverityChip'
import { Lock } from '@/lib/icons'
import type { PreviewWebsiteScanLockedFinding } from '@/types/previewWebsiteScan'
import { cn } from '@/lib/utils'

export function StartLockedFindings({
  count,
  items,
  onSignUp,
  divided = false,
}: {
  count: number
  items: PreviewWebsiteScanLockedFinding[]
  onSignUp: () => void
  divided?: boolean
}) {
  if (count <= 0) return null

  const label = count === 1 ? '1 more issue found' : `${count} more issues found`

  return (
    <div className={cn('relative', divided && 'mt-3 border-t border-border-subtle/70 pt-3')}>
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
        <h3 className="text-[13px] font-semibold text-foreground">{label}</h3>
      </div>

      {items.length > 0 ? (
        <div className="relative">
          <ul className="pointer-events-none select-none" aria-hidden>
            {items.map((finding, index) => (
              <li
                key={`${finding.title}-${index}`}
                className={cn(
                  'flex gap-3 border-l-2 py-3 pl-3 pr-1 first:pt-1 last:pb-1',
                  scanFindingAccentClass(finding.severity),
                )}
              >
                <div className="min-w-0 flex-1 blur-[6px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScanFindingSeverityChip severity={finding.severity} />
                    <p className="text-[13px] font-semibold leading-snug text-foreground">
                      {finding.title}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>
      ) : null}

      <div className="relative z-[1] flex justify-center pt-1">
        <Button type="button" variant="primary" size="sm" onClick={onSignUp}>
          Sign up to see all findings
        </Button>
      </div>
    </div>
  )
}

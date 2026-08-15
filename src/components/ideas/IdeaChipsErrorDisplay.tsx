import { cn } from '@/lib/utils'
import {
  formatIdeaChipsErrorForDisplay,
  formatIdeaChipsResetsAt,
  ideaChipsErrorShowsResetsLine,
  type IdeaChipsErrorInfo,
} from '@/lib/ideaChipsErrors'

export function IdeaChipsErrorDisplay({
  error,
  className,
}: {
  error: IdeaChipsErrorInfo
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-3',
        className,
      )}
    >
      <p className="text-xs font-medium leading-relaxed text-destructive">
        {formatIdeaChipsErrorForDisplay(error)}
      </p>
      {error.code ? (
        <p className="mt-1.5 font-mono text-[10px] leading-snug text-muted-foreground">{error.code}</p>
      ) : null}
      {ideaChipsErrorShowsResetsLine(error) ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Resets in {formatIdeaChipsResetsAt(error.resetsAt!)}
        </p>
      ) : null}
    </div>
  )
}

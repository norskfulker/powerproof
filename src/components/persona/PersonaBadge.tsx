import { PERSONA_META, type Persona } from '@/types/persona'
import { cn } from '@/lib/utils'

type Props = {
  persona: Persona
  showTagline?: boolean
  className?: string
}

export function PersonaBadge({ persona, showTagline = false, className }: Props) {
  const meta = PERSONA_META[persona]

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 rounded-full border border-border-subtle/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden>{meta.icon}</span>
      <span className="text-foreground/90">{meta.label}</span>
      {showTagline ? (
        <span className="hidden text-muted-foreground/80 sm:inline">· {meta.tagline}</span>
      ) : null}
    </div>
  )
}

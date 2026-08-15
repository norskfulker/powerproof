import { X } from '@/lib/icons'

type InvestorsActiveQueryProps = {
  query: string
  onClear: () => void
}

export function InvestorsActiveQuery({ query, onClear }: InvestorsActiveQueryProps) {
  const trimmed = query.trim()
  if (!trimmed) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-xs text-muted-foreground">Active query</span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
      >
        {trimmed}
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  )
}

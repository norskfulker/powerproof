import { useMemo, useState } from 'react'
import { Check, ChevronDown, X } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Props = {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
}

const uniq = (arr: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of arr) {
    const v = String(s ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

export default function MultiSelectDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = useMemo(() => uniq(value ?? []), [value])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allOptions = useMemo(() => uniq([...(options ?? []), ...selected]).sort((a, b) => a.localeCompare(b)), [options, selected])
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allOptions
    return allOptions.filter((opt) => opt.toLowerCase().includes(q))
  }, [allOptions, query])

  const toggle = (opt: string) => {
    const v = String(opt ?? '').trim()
    if (!v) return
    if (selectedSet.has(v)) onChange(selected.filter((x) => x !== v))
    else onChange([...selected, v])
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <div className="text-xs text-muted-foreground">{placeholder}</div>
        ) : (
          selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-[hsl(var(--primary-soft))] px-2.5 py-1 font-semibold text-xs text-[hsl(var(--primary-ink))]">
              <span className="truncate max-w-[220px]">{s}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== s))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border-default bg-surface px-4 py-2.5 text-sm text-foreground hover:border-border-strong"
          >
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>{selected.length ? `${selected.length} selected` : placeholder}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[340px]" align="start">
          <div className="border-b border-border-subtle p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-border-default bg-surface px-3 text-sm outline-none focus:border-border-strong"
            />
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">No results</div>
            ) : (
              filteredOptions.map((opt) => {
                const isOn = selectedSet.has(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-canvas"
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-4 h-4 rounded border',
                        isOn
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border-default bg-surface text-transparent',
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                    <span>{opt}</span>
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


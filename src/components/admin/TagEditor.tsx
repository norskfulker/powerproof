import { KeyboardEvent, useMemo, useState } from 'react'

interface TagEditorProps {
  value: string[]
  onChange: (val: string[]) => void
  placeholder?: string
  multiline?: boolean
}

const TagEditor = ({ value, onChange, placeholder, multiline = false }: TagEditorProps) => {
  const [draft, setDraft] = useState('')

  const tags = useMemo(() => (Array.isArray(value) ? value.filter(Boolean) : []), [value])

  const addTag = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    if (tags.includes(next)) return
    onChange([...tags, next])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    addTag(draft)
  }

  if (multiline) {
    return (
      <div className="space-y-2">
        {tags.map((t, idx) => (
          <div key={`${t}-${idx}`} className="flex gap-2 items-start">
            <textarea
              value={t}
              onChange={(e) => {
                const next = [...tags]
                next[idx] = e.target.value
                onChange(next.filter(x => x.trim().length > 0))
              }}
              rows={2}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, i) => i !== idx))}
              className="rounded-lg bg-destructive px-2 py-2 text-xs text-destructive-foreground"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...tags, ''])}
          className="rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:bg-foreground/90"
        >
          Add
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface px-2 py-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t, idx) => (
          <span
            key={`${t}-${idx}`}
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary-soft))] px-2.5 py-1 font-semibold text-xs text-[hsl(var(--primary-ink))]"
          >
            <span className="truncate max-w-[220px]">{t}</span>
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, i) => i !== idx))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="min-w-[160px] flex-1 outline-none px-2 py-1 text-sm"
        />
      </div>
    </div>
  )
}

export default TagEditor


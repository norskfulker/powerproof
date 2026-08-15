import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'toggle' | 'select' | 'readonly'
  options?: string[]
  compute?: (item: any) => string | number
}

export interface JsonArrayEditorProps<T extends Record<string, any>> {
  value: T[]
  onChange: (val: T[]) => void
  fields: FieldDef[]
  itemLabel: string
}

const inputClass =
  'border border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full'

const JsonArrayEditor = <T extends Record<string, any>>({
  value,
  onChange,
  fields,
  itemLabel,
}: JsonArrayEditorProps<T>) => {
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null)

  const blankItem = () => {
    const next: Record<string, any> = {}
    for (const f of fields) {
      if (f.type === 'number') next[f.key] = 0
      else if (f.type === 'toggle') next[f.key] = false
      else next[f.key] = ''
    }
    return next as T
  }

  const setItem = (idx: number, patch: Partial<T>) => {
    const next = [...items]
    next[idx] = { ...(next[idx] ?? ({} as T)), ...patch }
    onChange(next)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isOpen = open[idx] !== false
        const titleField = fields.find(f => f.type === 'text' && typeof item?.[f.key] === 'string')
        const titleSuffix = titleField ? String(item?.[titleField.key] || '').trim() : ''
        const headerTitle = titleSuffix ? `${itemLabel} ${idx + 1}: ${titleSuffix}` : `${itemLabel} ${idx + 1}`

        return (
          <div key={idx} className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(prev => ({ ...prev, [idx]: !isOpen }))}
                className="text-left flex-1 min-w-0"
              >
                <div className="text-sm font-semibold text-foreground truncate">{headerTitle}</div>
                <div className="text-xs text-muted-foreground">{isOpen ? 'Collapse' : 'Expand'}</div>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(idx, idx - 1)}
                  className="px-2 py-1 rounded-lg border border text-xs hover:bg-muted/50 disabled:opacity-40"
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, idx + 1)}
                  className="px-2 py-1 rounded-lg border border text-xs hover:bg-muted/50 disabled:opacity-40"
                  disabled={idx === items.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmIdx(idx)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs"
                >
                  Delete
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                {fields.map((f) => {
                  const v = item?.[f.key]

                  if (f.type === 'readonly') {
                    const computedVal = f.compute ? f.compute(item) : v
                    return (
                      <label key={f.key} className="space-y-1">
                        <div className="text-sm text-foreground">{f.label}</div>
                        <input
                          type="text"
                          value={computedVal ?? ''}
                          readOnly
                          className={`${inputClass} bg-muted cursor-not-allowed`}
                        />
                      </label>
                    )
                  }

                  if (f.type === 'toggle') {
                    return (
                      <label key={f.key} className="flex items-center justify-between gap-3 layout-sm:col-span-2">
                        <span className="text-sm text-gray-700">{f.label}</span>
                        <button
                          type="button"
                          onClick={() => setItem(idx, { [f.key]: !v } as Partial<T>)}
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            v ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-6 h-6 rounded-full bg-background transition-transform ${
                              v ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>
                    )
                  }

                  if (f.type === 'select') {
                    return (
                      <label key={f.key} className="space-y-1">
                        <div className="text-sm text-foreground">{f.label}</div>
                        <select
                          value={v ?? ''}
                          onChange={(e) => setItem(idx, { [f.key]: e.target.value } as Partial<T>)}
                          className={inputClass}
                        >
                          <option value="">—</option>
                          {(f.options ?? []).map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  }

                  if (f.type === 'textarea') {
                    return (
                      <label key={f.key} className="space-y-1 layout-sm:col-span-2">
                        <div className="text-sm text-foreground">{f.label}</div>
                        <textarea
                          value={v ?? ''}
                          onChange={(e) => setItem(idx, { [f.key]: e.target.value } as Partial<T>)}
                          rows={3}
                          className={inputClass}
                        />
                      </label>
                    )
                  }

                  if (f.type === 'number') {
                    return (
                      <label key={f.key} className="space-y-1">
                        <div className="text-sm text-foreground">{f.label}</div>
                        <input
                          type="number"
                          value={Number.isFinite(v) ? String(v) : v ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value
                            const nextVal = raw === '' ? null : Number(raw)
                            setItem(idx, { [f.key]: Number.isFinite(nextVal) ? nextVal : null } as Partial<T>)
                          }}
                          className={inputClass}
                        />
                      </label>
                    )
                  }

                  return (
                    <label key={f.key} className="space-y-1">
                      <div className="text-sm text-gray-700">{f.label}</div>
                      <input
                        type="text"
                        value={v ?? ''}
                        onChange={(e) => setItem(idx, { [f.key]: e.target.value } as Partial<T>)}
                        className={inputClass}
                      />
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => onChange([...items, blankItem()])}
        className="px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover"
      >
        Add {itemLabel}
      </button>

      <ConfirmDialog
        open={confirmIdx !== null}
        title={`Delete ${itemLabel}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmIdx !== null) onChange(items.filter((_, i) => i !== confirmIdx))
          setConfirmIdx(null)
        }}
        onCancel={() => setConfirmIdx(null)}
      />
    </div>
  )
}

export default JsonArrayEditor


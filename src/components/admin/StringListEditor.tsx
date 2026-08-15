import React from 'react'

const inputClass =
  'border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full bg-background'

type Props = {
  label: string
  hint?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  highlight?: boolean
}

export function StringListEditor({ label, hint, value, onChange, placeholder, highlight }: Props) {
  const normalized = Array.isArray(value) ? value : []
  const rows = normalized.length > 0 ? normalized : ['']

  const setRow = (i: number, s: string) => {
    const next = [...rows]
    next[i] = s
    onChange(next)
  }

  const addRow = () => {
    onChange([...rows, ''])
  }

  const removeRow = (i: number) => {
    const next = rows.filter((_, j) => j !== i)
    onChange(next.length ? next : [''])
  }

  return (
    <div
      className={`space-y-2 rounded-xl border p-3 ${highlight ? 'border-amber-400 bg-warning-bg/50 ring-2 ring-amber-200/80' : 'border-gray-200 bg-background'}`}
    >
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea
              value={row}
              onChange={(e) => setRow(i, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="shrink-0 mt-1 px-2 py-1 text-xs font-semibold text-destructive hover:bg-red-50 rounded-lg border border-red-200"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-border-default hover:text-gray-700"
      >
        + Add
      </button>
    </div>
  )
}

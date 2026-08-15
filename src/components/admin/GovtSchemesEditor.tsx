import React, { useMemo, useState } from 'react'

const labelCls = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'
const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

const DIFFICULTY: Record<string, { label: string; color: string; bg: string; border: string }> = {
  easy: { label: 'Easy', color: 'hsl(var(--primary-ink))', bg: '#DBEAFE', border: '#BFDBFE' },
  medium: { label: 'Medium', color: 'hsl(var(--saffron-600))', bg: '#FEF9C3', border: '#FDE68A' },
  hard: { label: 'Hard', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
}

const BLANK_SCHEME = {
  scheme: '',
  full_name: '',
  nodal_agency: '',
  apply_at: '',
  max_project_cost: '',
  subsidy: '',
  difficulty: 'medium',
  processing_days: '',
  notes: '',
  benefits: [] as string[],
  pros: [] as string[],
  cons: [] as string[],
  eligibility: [] as string[],
}

const ArrayTextEditor = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string
  icon: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) => (
  <div>
    <label className={labelCls}>
      {icon} {label}
    </label>
    <div className="space-y-2 mt-1">
      {(Array.isArray(value) ? value : []).map((item, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={item ?? ''}
            onChange={(e) => {
              const next = [...value]
              next[i] = e.target.value
              onChange(next)
            }}
            rows={2}
            placeholder={placeholder}
            className={inputCls + ' resize-none flex-1'}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-red-400 hover:text-destructive px-2 self-start mt-1 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...(Array.isArray(value) ? value : []), ''])}
        className="text-xs text-primary font-semibold hover:underline"
      >
        + Add item
      </button>
    </div>
  </div>
)

export const GovtSchemesEditor = ({
  value,
  onChange,
}: {
  value: any[]
  onChange: (val: any[]) => void
}) => {
  const list = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const update = (i: number, patch: Partial<any>) => {
    const next = list.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    onChange(next)
  }

  const remove = (i: number) => {
    const next = list.filter((_, idx) => idx !== i)
    onChange(next)
    if (expandedIndex === i) setExpandedIndex(null)
    if (expandedIndex != null && expandedIndex > i) setExpandedIndex(expandedIndex - 1)
  }

  const add = () => {
    onChange([...list, { ...BLANK_SCHEME }])
    setExpandedIndex(list.length)
  }

  return (
    <div className="space-y-2">
      {list.map((s, i) => {
        const isOpen = expandedIndex === i
        const d = DIFFICULTY[String(s?.difficulty ?? 'medium')] ?? DIFFICULTY.medium

        return (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-background">
            <button
              type="button"
              onClick={() => setExpandedIndex(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            >
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center shrink-0">
                {i + 1}
              </span>

              <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
                {s?.scheme || 'Unnamed Scheme'}
              </span>

              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0"
                style={{
                  color: d.color,
                  background: d.bg,
                  borderColor: d.border,
                }}
              >
                {d.label}
              </span>

              {s?.processing_days && (
                <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap">
                  {s.processing_days} days
                </span>
              )}

              <span className="text-muted-foreground text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Scheme Short Name *</label>
                    <input
                      value={s?.scheme ?? ''}
                      onChange={(e) => update(i, { scheme: e.target.value })}
                      placeholder="e.g. PMEGP"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input
                      value={s?.full_name ?? ''}
                      onChange={(e) => update(i, { full_name: e.target.value })}
                      placeholder="Full official name"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nodal Agency</label>
                    <input
                      value={s?.nodal_agency ?? ''}
                      onChange={(e) => update(i, { nodal_agency: e.target.value })}
                      placeholder="Implementing body"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Max Project Cost</label>
                    <input
                      value={s?.max_project_cost ?? ''}
                      onChange={(e) => update(i, { max_project_cost: e.target.value })}
                      placeholder="e.g. Rs 10L for service sector"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Subsidy Description</label>
                  <input
                    value={s?.subsidy ?? ''}
                    onChange={(e) => update(i, { subsidy: e.target.value })}
                    placeholder="One-line description"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {(['easy', 'medium', 'hard'] as const).map((level) => {
                        const ld = DIFFICULTY[level]
                        const active = String(s?.difficulty ?? 'medium') === level
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => update(i, { difficulty: level })}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                            style={
                              active
                                ? { borderColor: ld.border, background: ld.bg, color: ld.color }
                                : { borderColor: '#E5E7EB', background: 'hsl(var(--background))', color: 'hsl(var(--muted-foreground))' }
                            }
                          >
                            {ld.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Processing Days</label>
                    <input
                      value={s?.processing_days ?? ''}
                      onChange={(e) => update(i, { processing_days: e.target.value })}
                      placeholder="e.g. 60-90"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Apply At</label>
                  <input
                    value={s?.apply_at ?? ''}
                    onChange={(e) => update(i, { apply_at: e.target.value })}
                    placeholder="URL or instruction"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Notes / Key Insight</label>
                  <textarea
                    value={s?.notes ?? ''}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    rows={3}
                    className={inputCls + ' resize-none'}
                    placeholder="Key insight / when to apply"
                  />
                </div>

                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                  <ArrayTextEditor
                    icon="✓"
                    label="What You Get (Benefits)"
                    value={Array.isArray(s?.benefits) ? s.benefits : []}
                    onChange={(v) => update(i, { benefits: v })}
                    placeholder="What you get from this scheme..."
                  />
                  <ArrayTextEditor
                    icon="+"
                    label="Why It Works (Pros)"
                    value={Array.isArray(s?.pros) ? s.pros : []}
                    onChange={(v) => update(i, { pros: v })}
                    placeholder="Why this is attractive..."
                  />
                  <ArrayTextEditor
                    icon="−"
                    label="Watch Out For (Cons)"
                    value={Array.isArray(s?.cons) ? s.cons : []}
                    onChange={(v) => update(i, { cons: v })}
                    placeholder="Honest downsides..."
                  />
                  <ArrayTextEditor
                    icon="◆"
                    label="Who Qualifies (Eligibility)"
                    value={Array.isArray(s?.eligibility) ? s.eligibility : []}
                    onChange={(v) => update(i, { eligibility: v })}
                    placeholder="Eligibility criteria..."
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-red-500 hover:text-destructive hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove this scheme
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-muted-foreground hover:border-border-default hover:text-gray-600 transition-colors"
      >
        + Add Scheme
      </button>
    </div>
  )
}


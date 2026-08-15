import React, { useMemo, useState } from 'react'

export interface Competitor {
  name: string
  tag: string
  description: string
  funding: string
  employees: string
  locations: string
  threat_level: 'Low' | 'Medium' | 'High'
  logo_url: string | null
}

const THREAT_COLORS: Record<Competitor['threat_level'], { dot: string; bg: string; text: string }> = {
  Low: { dot: 'hsl(var(--primary))', bg: 'hsl(var(--primary-soft))', text: 'hsl(var(--primary-ink))' },
  Medium: { dot: '#F59E0B', bg: '#FEF3C7', text: '#854D0E' },
  High: { dot: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}

const BLANK_COMPETITOR: Competitor = {
  name: '',
  tag: '',
  description: '',
  funding: '',
  employees: '',
  locations: '',
  threat_level: 'Medium',
  logo_url: null,
}

export const CompetitorsEditor = ({
  value,
  onChange,
}: {
  value: Competitor[]
  onChange: (val: Competitor[]) => void
}) => {
  const list = useMemo(() => (Array.isArray(value) ? value : []), [value])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const update = (i: number, patch: Partial<Competitor>) => {
    const next = list.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    onChange(next)
  }

  const remove = (i: number) => {
    const next = list.filter((_, idx) => idx !== i)
    onChange(next)
    if (expandedIndex === i) setExpandedIndex(null)
    if (expandedIndex != null && expandedIndex > i) setExpandedIndex(expandedIndex - 1)
  }

  const add = () => {
    onChange([...list, { ...BLANK_COMPETITOR }])
    setExpandedIndex(list.length)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return
    const next = [...list]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    if (expandedIndex === from) setExpandedIndex(to)
    else if (expandedIndex != null) {
      if (from < expandedIndex && to >= expandedIndex) setExpandedIndex(expandedIndex - 1)
      else if (from > expandedIndex && to <= expandedIndex) setExpandedIndex(expandedIndex + 1)
    }
  }

  return (
    <div className="space-y-2">
      {list.map((c, i) => {
        const isOpen = expandedIndex === i
        const tc = THREAT_COLORS[c.threat_level] ?? THREAT_COLORS.Medium

        return (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-background">
            <button
              type="button"
              onClick={() => setExpandedIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.dot, flexShrink: 0 }} />
                <span className="text-sm font-semibold text-gray-900">
                  {c.name || 'Unnamed Competitor'}
                </span>
                {c.tag && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                    {c.tag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    move(i, i - 1)
                  }}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-md"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    move(i, i + 1)
                  }}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-md"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: tc.bg,
                  color: tc.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {c.threat_level}
                </span>
                <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                      Competitor Name *
                    </label>
                    <input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Chaayos"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                      Tag (stage/type)
                    </label>
                    <input
                      value={c.tag}
                      onChange={(e) => update(i, { tag: e.target.value })}
                      placeholder="e.g. Series B, Listed, Franchise"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={c.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="One or two sentences about this competitor's scale and relevance"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'funding', label: 'Funding / Revenue', placeholder: 'e.g. Rs 200Cr+' },
                    { key: 'employees', label: 'Employees', placeholder: 'e.g. 1000+' },
                    { key: 'locations', label: 'Locations', placeholder: 'e.g. 300+ India' },
                  ] as const).map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                        {f.label}
                      </label>
                      <input
                        value={(c as any)[f.key] ?? ''}
                        onChange={(e) => update(i, { [f.key]: e.target.value } as any)}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
                      Threat Level
                    </label>
                    <div className="flex gap-2">
                      {(['Low', 'Medium', 'High'] as const).map((level) => {
                        const tc2 = THREAT_COLORS[level]
                        const active = c.threat_level === level
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => update(i, { threat_level: level })}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1.5px solid',
                              borderColor: active ? tc2.dot : '#E5E7EB',
                              background: active ? tc2.bg : 'transparent',
                              color: active ? tc2.text : '#6B7280',
                              cursor: 'pointer',
                            }}
                          >
                            {level}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-red-500 hover:text-destructive hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove
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
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-border-default hover:text-gray-600 transition-colors"
      >
        + Add Competitor
      </button>
    </div>
  )
}

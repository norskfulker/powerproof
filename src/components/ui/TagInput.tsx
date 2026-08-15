import { useMemo, useRef, useState } from 'react'

export const TagInput = ({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) => {
  const [input, setInput] = useState('')
  const inpRef = useRef<HTMLInputElement | null>(null)

  const normalized = useMemo(
    () => tags.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean),
    [tags],
  )

  const add = (val: string) => {
    const tag = String(val || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (tag && !normalized.includes(tag) && normalized.length < 15) {
      onChange([...normalized, tag])
    }
    setInput('')
  }

  const remove = (tag: string) => onChange(normalized.filter((t) => t !== tag))

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border-default))',
        borderRadius: '8px',
        padding: '6px 8px',
        background: 'hsl(var(--bg-surface))',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        minHeight: '38px',
        cursor: 'text',
      }}
      onClick={() => inpRef.current?.focus()}
    >
      {normalized.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'hsl(var(--primary-soft))',
            color: 'hsl(var(--primary-ink))',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.02em',
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'hsl(var(--primary-ink))',
              fontSize: '14px',
              lineHeight: 1,
              padding: '0 0 0 2px',
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inpRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || (e.key === ' ' && input.trim().length > 0)) {
            e.preventDefault()
            add(input)
          }
          if (e.key === 'Backspace' && !input && normalized.length > 0) {
            remove(normalized[normalized.length - 1])
          }
        }}
        onBlur={() => {
          if (input.trim()) add(input)
        }}
        placeholder={normalized.length === 0 ? placeholder : ''}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '13px',
          color: 'hsl(var(--foreground))',
          flex: 1,
          minWidth: '120px',
        }}
      />
    </div>
  )
}


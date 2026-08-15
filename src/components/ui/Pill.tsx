import React from 'react'

interface PillProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'button'
  active?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  bg?: string
  borderColor?: string
  textColor?: string
  activeBg?: string
  activeBorderColor?: string
  activeTextColor?: string
  activeShadow?: string
}

const MD_SIZE: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '13px',
  height: '34px',
}

export function Pill({
  as: Tag = 'span',
  active = false,
  disabled = false,
  icon,
  iconRight,
  bg,
  borderColor,
  textColor,
  activeBg,
  activeBorderColor,
  activeTextColor,
  activeShadow,
  style,
  className,
  children,
  ...props
}: PillProps) {
  const inactiveBg = bg ?? 'hsl(var(--bg-surface))'
  const inactiveBorder = borderColor ?? 'hsl(var(--border-default))'
  const inactiveText = textColor ?? 'hsl(var(--muted-foreground))'

  const aBg = activeBg ?? 'hsl(var(--primary))'
  const aBorder = activeBorderColor ?? aBg
  const aText = activeTextColor ?? 'hsl(var(--primary-foreground))'

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '0.375rem',
    border: `1.5px solid ${active ? aBorder : inactiveBorder}`,
    background: active ? aBg : inactiveBg,
    color: active ? aText : inactiveText,
    fontFamily: 'var(--font-sans)',
    fontWeight: active ? 600 : 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
    boxShadow: active ? (activeShadow ?? '0 2px 8px rgba(0,0,0,0.06)') : 'none',
    cursor: Tag === 'button' ? (disabled ? 'not-allowed' : 'pointer') : undefined,
    opacity: disabled ? 0.55 : 1,
    ...MD_SIZE,
    ...style,
  }

  function onMouseEnter(e: React.MouseEvent<HTMLElement>) {
    if (active || disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = 'hsl(var(--border-strong))'
    el.style.color = 'hsl(var(--foreground))'
    el.style.background = 'hsl(var(--bg-hover))'
    ;(props as any).onMouseEnter?.(e)
  }

  function onMouseLeave(e: React.MouseEvent<HTMLElement>) {
    if (active || disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = inactiveBorder
    el.style.color = inactiveText
    el.style.background = inactiveBg
    ;(props as any).onMouseLeave?.(e)
  }

  function onMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'scale(0.98)'
    ;(props as any).onMouseDown?.(e)
  }

  function onMouseUp(e: React.MouseEvent<HTMLElement>) {
    if (disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'scale(1)'
    ;(props as any).onMouseUp?.(e)
  }

  function onFocus(e: React.FocusEvent<HTMLElement>) {
    if (disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    const matches = (el as any).matches?.(':focus-visible')
    if (!matches) return
    const currentShadow = el.style.boxShadow || ''
    el.style.boxShadow = currentShadow ? `${currentShadow}, 0 0 0 3px hsl(var(--primary-50))` : '0 0 0 3px hsl(var(--primary-50))'
    ;(props as any).onFocus?.(e)
  }

  function onBlur(e: React.FocusEvent<HTMLElement>) {
    if (disabled || Tag !== 'button') return
    const el = e.currentTarget as HTMLElement
    el.style.boxShadow = active ? (activeShadow ?? 'inset 0 -1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.06)') : 'none'
    ;(props as any).onBlur?.(e)
  }

  if (Tag === 'button') {
    return (
      <button
        {...(props as any)}
        disabled={disabled}
        style={{
          ...base,
          boxShadow: active ? (activeShadow ?? 'inset 0 -1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.06)') : base.boxShadow,
        }}
        className={className}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {icon && <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{icon}</span>}
        {children}
        {iconRight && <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{iconRight}</span>}
      </button>
    )
  }

  return (
    <span {...(props as any)} style={base} className={className}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{iconRight}</span>}
    </span>
  )
}

import React from 'react'

export function TableCard({
  children,
  minWidth,
  style,
}: {
  children: React.ReactNode
  minWidth?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-subtle))',
        background: 'hsl(var(--bg-surface))',
        boxShadow: '0 14px 28px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      <div style={{ minWidth }}>
        {children}
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/sonner'

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  color: 'hsl(var(--foreground))',
}

export const ProfileActions = ({ shareUrl }: { shareUrl: string }) => {
  const [open, setOpen] = useState(false)
  const fullUrl = `${window.location.origin}${shareUrl}`

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest?.('[data-profile-actions]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: fullUrl })
      } else {
        await navigator.clipboard.writeText(fullUrl)
        toast('Link copied!')
      }
    } finally {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }} data-profile-actions>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid hsl(var(--border-default))',
          background: 'hsl(var(--bg-surface))',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
        }}
        aria-label="Profile actions"
      >
        ⋯
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-subtle))',
            borderRadius: '10px',
            minWidth: '160px',
            zIndex: 50,
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}
        >
          <button onClick={share} style={menuItemStyle}>
            Share Profile
          </button>
        </div>
      )}
    </div>
  )
}

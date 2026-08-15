import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Pencil, Check, X } from '@/lib/icons'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const fluidGlassSurfaceClassName = cn(
  'border border-white/20 bg-white/10 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.22),0_2px_6px_-3px_rgba(0,0,0,0.12)]',
)

const fluidDarkGlassSurfaceClassName = cn(
  'border border-border-subtle/55 bg-surface/50 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.08),0_2px_6px_-3px_rgba(0,0,0,0.04)]',
)

const opportunityDetailFluidGlassEditButtonClassName = cn(
  fluidGlassSurfaceClassName,
  'text-white/90 hover:border-white/35 hover:bg-white/15 hover:text-white',
)

const opportunityDetailFluidDarkGlassEditButtonClassName = cn(
  fluidDarkGlassSurfaceClassName,
  'text-muted-foreground hover:border-primary/35 hover:bg-surface-hover hover:text-primary',
)


export type EditableHeroFieldProps = {
  value: string
  onSave?: (next: string) => Promise<void>
  as?: 'title' | 'description'
  className?: string
  displayClassName?: string
  placeholder?: string
  children?: ReactNode
  /** Fluid opportunity hero — always show edit affordance with glass chrome. */
  appearance?: 'default' | 'fluid'
  /** On fluid heroes: `light` = white chrome on dark surfaces; `dark` = dark chrome on light surfaces. */
  fluidTextTone?: 'light' | 'dark'
}

export function EditableHeroField({
  value,
  onSave,
  as = 'title',
  className,
  displayClassName,
  placeholder = 'Enter text…',
  children,
  appearance = 'default',
  fluidTextTone = 'light',
}: EditableHeroFieldProps) {
  const isFluid = appearance === 'fluid'
  const fluidEditButtonClassName =
    fluidTextTone === 'dark'
      ? opportunityDetailFluidDarkGlassEditButtonClassName
      : opportunityDetailFluidGlassEditButtonClassName
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const editable = Boolean(onSave)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    if (inputRef.current instanceof HTMLTextAreaElement) {
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const commit = async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      toast.error('Cannot be empty')
      return
    }
    if (trimmed === value.trim()) {
      setEditing(false)
      return
    }
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch (e) {
      toast.error('Could not save', {
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }
    if (as === 'title' && e.key === 'Enter') {
      e.preventDefault()
      void commit()
    }
    if (as === 'description' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void commit()
    }
  }

  if (editing) {
    const inputClass = cn(
      'w-full resize-none rounded-xl border border-border-default bg-background/80 px-3 py-2 font-display font-medium text-md text-foreground shadow-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      as === 'title' ? 'text-2xl sm:text-2xl' : 'text-md sm:text-lg',
    )

    return (
      <div className={cn('space-y-2', className)}>
        {as === 'title' ? (
          <input
            id={inputId}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={saving}
            className={inputClass}
            aria-label="Edit title"
          />
        ) : (
          <textarea
            id={inputId}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={saving}
            rows={3}
            className={inputClass}
            aria-label="Edit description"
          />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group/editable relative flex gap-1.5',
        isFluid ? (as === 'title' ? 'items-center' : 'items-start') : 'items-start',
        className,
      )}
    >
      <div className={cn('min-w-0 flex-1', displayClassName)}>{children ?? value}</div>
      {editable ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            isFluid
              ? cn(
                  fluidEditButtonClassName,
                  'opacity-100 focus-visible:ring-ring focus-visible:ring-offset-2',
                  fluidTextTone === 'dark'
                    ? 'focus-visible:ring-offset-background'
                    : 'focus-visible:ring-white/30 focus-visible:ring-offset-transparent',
                )
              : cn(
                  'border-border-subtle/70 bg-background/80 text-muted-foreground',
                  'hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                  'focus-visible:ring-ring focus-visible:ring-offset-2',
                ),
          )}
          aria-label={as === 'title' ? 'Edit title' : 'Edit description'}
          title={as === 'title' ? 'Edit title' : 'Edit description'}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.25} />
        </button>
      ) : null}
      {!value.trim() && editable ? (
        <span className="sr-only">{placeholder}</span>
      ) : null}
    </div>
  )
}

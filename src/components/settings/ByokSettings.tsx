import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Check,
  Clipboard,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Map,
  MessageCircleQuestion,
  Microscope,
  PackageSearch,
  Pencil,
  Sparkles,
  Swords,
  X,
} from '@/lib/icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { byok } from '@/lib/byok'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const KEY_MIN_LENGTH = 20
const KEY_PATTERN = /^[A-Za-z0-9_-]+$/

/** Feature surfaces that respect the BYOK key — used in the "Where this is used" list. */
const BYOK_USED_BY: ReadonlyArray<{
  label: string
  description: string
  Icon: typeof Sparkles
}> = [
  {
    label: 'Research & re-research',
    description: 'Standard and premium research reports, plus the re-research panel.',
    Icon: FileText,
  },
  {
    label: 'Clarification wizard',
    description: 'Goal-refinement chat that runs before a deep research pass.',
    Icon: MessageCircleQuestion,
  },
  {
    label: 'Market Test',
    description: 'Go / caution / red-flag verdicts with demand signals.',
    Icon: Microscope,
  },
  {
    label: 'War Room playbooks',
    description: 'Battlefield briefings and 15-step execution plans.',
    Icon: Swords,
  },
  {
    label: 'Roadmap plans',
    description: 'Nested goals, flowchart + timeline views, suggested chips.',
    Icon: Map,
  },
  {
    label: 'Sourcing',
    description: 'IndiaMart, Alibaba, and Made-in-China supplier comparison.',
    Icon: PackageSearch,
  },
  {
    label: 'AI Edits',
    description: 'Inline rewrites inside opportunity and research drafts.',
    Icon: Pencil,
  },
  {
    label: 'Ask AI advisor',
    description: 'Free-form chat against your saved workspace.',
    Icon: Brain,
  },
]

function maskKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 8) return trimmed
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

export function ByokSettings({ className }: { className?: string }) {
  const initialSaved = byok.isActive()
  const initialKey = initialSaved ? byok.get() ?? '' : ''
  const [key, setKey] = useState(initialKey)
  const [saved, setSaved] = useState(initialSaved)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Sync local state if another tab/window edits localStorage.
  useEffect(() => {
    const onChange = () => {
      const active = byok.isActive()
      setSaved(active)
      if (!active) {
        setKey('')
        setVisible(false)
      }
    }
    window.addEventListener('powerproof-byok-change', onChange)
    return () => window.removeEventListener('powerproof-byok-change', onChange)
  }, [])

  const trimmedKey = key.trim()
  const isTooShort = trimmedKey.length > 0 && trimmedKey.length < KEY_MIN_LENGTH
  const hasInvalidChars = trimmedKey.length > 0 && !KEY_PATTERN.test(trimmedKey)
  const hasError = isTooShort || hasInvalidChars

  const helperVariant: 'error' | 'info' | 'default' = hasError
    ? 'error'
    : saved
      ? 'info'
      : 'default'
  const helperText = (() => {
    if (isTooShort) return `Key looks too short — paste the full key from aistudio.google.com.`
    if (hasInvalidChars) return `Keys only contain letters, digits, "-" and "_".`
    if (saved) return `Active — PowerProof credits are not deducted for AI features.`
    if (trimmedKey.length === 0) return `Your key is stored only on this device. Never sent to PowerProof servers.`
    return `Looks good — press Save to start using your key.`
  })()

  const handleSave = () => {
    if (!trimmedKey) return
    if (hasError) return
    byok.set(trimmedKey)
    setSaved(true)
    setVisible(false)
    toast.success('API key saved', {
      description: 'AI features will now use your Google quota.',
    })
  }

  const handleClear = () => {
    if (!confirmRemove) {
      setConfirmRemove(true)
      window.setTimeout(() => setConfirmRemove(false), 4000)
      return
    }
    byok.clear()
    setSaved(false)
    setKey('')
    setVisible(false)
    setConfirmRemove(false)
    toast.success('API key removed', {
      description: 'AI features will now use your PowerProof credits.',
    })
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setKey(text.trim())
        inputRef.current?.focus()
      }
    } catch {
      // Browser denied clipboard access — fall back to nothing.
      toast.error('Could not read clipboard', {
        description: 'Paste manually with Ctrl/Cmd + V.',
      })
    }
  }

  const handleCopy = async () => {
    const value = byok.get()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy', {
        description: 'Copy the key manually from your password manager.',
      })
    }
  }

  return (
    <section
      id="api-key"
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-2xl border border-border-subtle/80 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]',
        className,
      )}
    >
      {/* ── Header band ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-border-subtle/60 bg-gradient-to-br from-primary/[0.10] via-primary/[0.04] to-transparent px-4 py-4 sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <KeyRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                AI API key
              </h3>
              {saved ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/[0.08] px-2 py-0.5 text-[10px] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-card/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Not set
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Run AI on your own Google quota — no PowerProof credits deducted when active.
            </p>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        {saved ? (
          <div className="space-y-3 rounded-xl border border-success/30 bg-success/[0.06] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Your API key is active
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Stored only on this device. PowerProof never sees the raw value.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-card px-3 py-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
              </span>
              <code className="flex-1 truncate font-mono text-[13px] text-foreground">
                {visible ? byok.get() ?? '' : maskKey(byok.get() ?? '')}
              </code>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Hide API key' : 'Show API key'}
                  className="h-7 w-7 p-0"
                >
                  {visible ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopy()}
                  aria-label={copied ? 'Key copied' : 'Copy key'}
                  className="h-7 w-7 p-0"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                  ) : (
                    <Clipboard className="h-3.5 w-3.5" aria-hidden />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-muted-foreground">
                Want to swap keys? Remove it first, then paste the new one.
              </p>
              <Button
                type="button"
                variant={confirmRemove ? 'danger' : 'secondary'}
                size="sm"
                onClick={handleClear}
                aria-label={confirmRemove ? 'Confirm remove API key' : 'Remove API key'}
              >
                {confirmRemove ? (
                  <>
                    <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Confirm remove
                  </>
                ) : (
                  'Remove key'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              ref={inputRef}
              type={visible ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                if (confirmRemove) setConfirmRemove(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && trimmedKey && !hasError) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="AIzaSy..."
              autoComplete="off"
              spellCheck={false}
              helperText={helperText}
              helperVariant={helperVariant}
              fieldStateBorder={helperVariant === 'error'}
              iconLeft={<KeyRound className="h-3.5 w-3.5" aria-hidden />}
              rightSlot={
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void handlePaste()}
                    aria-label="Paste from clipboard"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Clipboard className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide API key' : 'Show API key'}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {visible ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>
              }
              className="font-mono text-sm"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-muted-foreground">
                Get a free key at{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
              <Button
                type="button"
                size="md"
                disabled={!trimmedKey || hasError}
                onClick={handleSave}
                className="shrink-0"
              >
                Save key
              </Button>
            </div>
          </div>
        )}

        {/* ── Where this is used ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border-subtle/70 bg-card/60 p-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Where this key is used
            </h4>
          </div>
          <ul role="list" className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {BYOK_USED_BY.map((item) => {
              const Icon = item.Icon
              return (
                <li
                  key={item.label}
                  className="flex items-start gap-2 text-[12.5px] leading-snug"
                >
                  <Icon
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="text-foreground/90">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground"> · {item.description}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
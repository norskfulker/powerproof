import { useEffect, useState } from 'react'
import { Check, Copy } from '@/lib/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

type RoomHeroDeleteConfirmDialogProps = {
  open: boolean
  itemName: string
  isDeleting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function RoomHeroDeleteConfirmDialog({
  open,
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel,
}: RoomHeroDeleteConfirmDialogProps) {
  const [typedName, setTypedName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setTypedName('')
      setCopied(false)
    }
  }, [open])

  const trimmedName = itemName.trim()
  const nameMatches = typedName.trim() === trimmedName

  async function handleCopyName() {
    try {
      await navigator.clipboard.writeText(trimmedName)
      setCopied(true)
      toast.success('Name copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy name')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isDeleting) onCancel()
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete this item?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-0.5">
              <p className="leading-relaxed">
                This can&apos;t be undone. Type the name below to confirm.
              </p>
              <div
                className={cn(
                  'flex min-w-0 items-start gap-2 rounded-lg border border-border-subtle bg-muted/40 px-3 py-2.5',
                )}
              >
                <p className="min-w-0 flex-1 break-words font-sans text-[13px] font-semibold leading-snug text-foreground">
                  {trimmedName || 'Untitled'}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyName()}
                  disabled={!trimmedName || isDeleting}
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
                    'hover:bg-background hover:text-foreground',
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                  aria-label={`Copy ${trimmedName}`}
                  title="Copy name"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </div>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type the name to confirm"
                autoComplete="off"
                autoFocus
                disabled={isDeleting}
                aria-label={`Type ${trimmedName} to confirm deletion`}
                className="min-w-0"
              />
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" size="md" disabled={isDeleting} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            disabled={!nameMatches || isDeleting}
            loading={isDeleting}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

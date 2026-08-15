import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Bug, Lightbulb, Loader2 } from '@/lib/icons'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  USER_FEEDBACK_DIALOG_COPY,
  USER_FEEDBACK_TAB_LABELS,
  USER_FEEDBACK_TYPES,
  type UserFeedbackType,
} from '@/lib/userFeedback'

const FEEDBACK_TAB_ICONS: Record<UserFeedbackType, typeof Bug> = {
  bug_report: Bug,
  feature_request: Lightbulb,
  incorrect_data: AlertTriangle,
}

type UserFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: UserFeedbackType
}

export function UserFeedbackDialog({
  open,
  onOpenChange,
  initialType = 'bug_report',
}: UserFeedbackDialogProps) {
  const { user } = useAuth()
  const location = useLocation()
  const [activeType, setActiveType] = useState<UserFeedbackType>(initialType)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setMessage('')
      return
    }
    setActiveType(initialType)
  }, [open, initialType])

  useEffect(() => {
    if (open) setMessage('')
  }, [activeType, open])

  const copy = USER_FEEDBACK_DIALOG_COPY[activeType]

  const submit = async () => {
    if (!user?.id) return
    const trimmed = message.trim()
    if (trimmed.length < 3) {
      toast.error('Add a few details', { description: 'Please describe your feedback in at least a few words.' })
      return
    }

    setSubmitting(true)
    try {
      const pagePath = `${location.pathname}${location.search}${location.hash}`
      const { error } = await supabase.from('user_feedback_submissions').insert({
        user_id: user.id,
        feedback_type: activeType,
        message: trimmed,
        page_path: pagePath,
      })
      if (error) {
        toast.error('Could not send feedback', { description: error.message })
        return
      }
      toast('Thanks — we received your feedback')
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="z-[400]">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Report a bug, suggest a feature, or flag incorrect data — we read every submission.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as UserFeedbackType)}
          className="w-full"
        >
          <TabsList className="h-auto w-full">
            {USER_FEEDBACK_TYPES.map((type) => {
              const Icon = FEEDBACK_TAB_ICONS[type]
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  alwaysShowLabel
                  icon={<Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  className="flex-1 px-2 py-2 text-[11px] layout-sm:px-3 layout-sm:text-xs"
                >
                  {USER_FEEDBACK_TAB_LABELS[type]}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.description}</p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={copy.placeholder}
            rows={5}
            className="resize-none"
            disabled={submitting}
          />
        </div>

        <DialogFooter className="gap-2 layout-sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

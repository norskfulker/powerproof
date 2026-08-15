import { motion } from 'framer-motion'

export interface ResearchErrorStateProps {
  error: string
  detail?: string
  onRetry: () => void
  onDismiss: () => void
  creditsRefunded?: boolean
}

function classify(
  error: string,
  detail: string | undefined,
): { title: string; message: string; canRetry: boolean } {
  const d = (detail ?? error ?? '').toLowerCase()

  if (d.includes('503') || d.includes('high demand') || d.includes('unavailable')) {
    return {
      title: 'AI is busy right now',
      message: "Google's AI is experiencing high demand. Please try again in a minute.",
      canRetry: true,
    }
  }
  if (d.includes('max_tokens') || d.includes('truncated')) {
    return {
      title: 'Response was too long',
      message: 'The AI generated more data than expected and was cut off. Please try again.',
      canRetry: true,
    }
  }
  if (
    d.includes('insufficient') ||
    d.includes('not enough credits') ||
    d.includes('limit_exceeded')
  ) {
    return {
      title: 'Plan limit reached',
      message: 'You have reached your report allowance for this period.',
      canRetry: false,
    }
  }
  if (d.includes('no_active_subscription')) {
    return {
      title: 'Active plan required',
      message: 'Choose a plan to continue.',
      canRetry: false,
    }
  }
  if (d.includes('json') || d.includes('syntax') || d.includes('parse') || d.includes('unterminated')) {
    return {
      title: 'Research output was malformed',
      message: 'The AI returned an unexpected format. Please try again.',
      canRetry: true,
    }
  }
  if (d.includes('network') || d.includes('fetch')) {
    return {
      title: 'Network error',
      message: 'Could not reach the server. Check your connection and try again.',
      canRetry: true,
    }
  }
  return {
    title: 'Research failed',
    message: 'Something went wrong. Please try again.',
    canRetry: true,
  }
}

export function ResearchErrorState({
  error,
  detail,
  onRetry,
  onDismiss,
}: ResearchErrorStateProps) {
  const { title, message, canRetry } = classify(error, detail)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <span className="text-2xl" aria-hidden>
          ⚠️
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{message}</p>
      </div>

      <div className="mt-1 flex items-center gap-3">
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-border-subtle px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}

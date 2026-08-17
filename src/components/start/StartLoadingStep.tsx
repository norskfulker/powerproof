import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SiteFavicon } from '@/components/shared/SiteFavicon'
import {
  PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE,
  previewWebsiteScanLoadingMessage,
} from '@/lib/previewWebsiteScan'
import { hostnameFromLooseUrl } from '@/lib/siteFavicon'

const TICK_MS = 250

export function StartLoadingStep({ url }: { url: string }) {
  const reduceMotion = useReducedMotion()
  const [elapsedMs, setElapsedMs] = useState(0)
  const hostname = hostnameFromLooseUrl(url)
  const message = previewWebsiteScanLoadingMessage(elapsedMs)
  const waitingLong = message === PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE

  useEffect(() => {
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="flex w-full flex-col items-center py-2 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {hostname ? (
        <p className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
          <SiteFavicon hostname={hostname} size={16} />
          {hostname}
        </p>
      ) : null}

      <div className="relative flex min-h-[3.25rem] w-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={message}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-xl font-semibold tracking-[-0.03em] text-primary sm:text-2xl"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      <div
        className="relative mt-6 h-1 w-full max-w-[16rem] overflow-hidden rounded-full bg-primary/15"
        aria-hidden
      >
        {reduceMotion ? (
          <div className="h-full w-full animate-pulse rounded-full bg-primary/70" />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-[38%] rounded-full bg-primary"
            initial={{ x: '-120%' }}
            animate={{ x: ['-120%', '280%'] }}
            transition={{ duration: 1.55, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </div>

      <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
        {waitingLong ? 'Still working — hang tight.' : 'This usually takes 15–45 seconds.'}
      </p>
    </div>
  )
}

export function StartRestoreStep() {
  return (
    <div
      className="flex w-full flex-col items-center py-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">Loading your preview…</p>
    </div>
  )
}

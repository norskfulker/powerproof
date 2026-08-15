import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '@/components/tour/TourStyles.css'

import { ASK_AI_UI_ENABLED } from '@/lib/askAiPanelEvents'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const STORAGE_PREFIX = 'powerproof.onboarding.opp-spotlight.'

function storageKey(opportunityId: string) {
  return `${STORAGE_PREFIX}${opportunityId}`
}

function queryTourTarget(selector: string): Element | null {
  try {
    return document.querySelector(selector)
  } catch {
    return null
  }
}

/**
 * One-time driver.js spotlight after onboarding reveal: idea hero → Ask AI.
 * On mobile, step 2 targets the chrome Ask AI button (floating trigger is hidden on reveal).
 */
export function OnboardingOpportunitySpotlight({
  opportunityId,
  ready,
}: {
  opportunityId: string
  ready: boolean
}) {
  const bp = useBreakpoint()
  const isCompact = bp === 'mobile' || bp === 'tablet'
  const startedRef = useRef(false)

  useEffect(() => {
    if (!ready || !opportunityId || startedRef.current) return
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(storageKey(opportunityId)) === '1') return

    let cancelled = false
    let driverObj: ReturnType<typeof driver> | null = null
    let startTimer = 0

    const finish = () => {
      try {
        window.sessionStorage.setItem(storageKey(opportunityId), '1')
      } catch {
        /* ignore */
      }
    }

    const run = () => {
      if (cancelled || startedRef.current) return

      const ideaEl = queryTourTarget('#od-hero') ?? queryTourTarget('[data-tour="od-hero"]')
      if (!ideaEl) {
        startTimer = window.setTimeout(run, 280)
        return
      }

      startedRef.current = true

      const askSelector = ASK_AI_UI_ENABLED
        ? isCompact
          ? '[data-tour="ask-ai-chrome"]'
          : '[data-tour="ask-ai-panel"]'
        : null

      const steps = [
        {
          element: '#od-hero',
          popover: {
            title: 'Your generated idea',
            description:
              'This is the full opportunity brief AI built for you — title, numbers, and the sections below. Skim the summary first, then dig into finance and market when you are ready.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        ...(askSelector
          ? [
              {
                element: askSelector,
                popover: {
                  title: 'Ask AI anything',
                  description: isCompact
                    ? 'Tap Ask AI anytime to dig deeper on pricing, competition, licences, or what to validate next.'
                    : 'Stuck on a number or risk? Open Ask AI and dig deeper on this idea — pricing, competition, licences, or what to validate next.',
                  side: isCompact ? ('top' as const) : ('left' as const),
                  align: 'start' as const,
                },
              },
            ]
          : []),
      ]

      const tryStart = (attempt = 0) => {
        if (cancelled) return
        const askEl = askSelector ? queryTourTarget(askSelector) : null
        if (askSelector && !askEl && attempt < 12) {
          startTimer = window.setTimeout(() => tryStart(attempt + 1), 220)
          return
        }

        const activeSteps = askEl ? steps : [steps[0]!]

        driverObj = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          smoothScroll: true,
          overlayOpacity: 0.65,
          overlayColor: '#000',
          stagePadding: 10,
          stageRadius: 12,
          popoverClass: 'powerproof-tour-popover',
          nextBtnText: 'Next',
          prevBtnText: 'Back',
          doneBtnText: 'Got it',
          steps: activeSteps,
          onDestroyStarted: () => {
            finish()
            driverObj?.destroy()
          },
          onDestroyed: () => {
            finish()
          },
        })
        driverObj.drive()
      }

      startTimer = window.setTimeout(() => tryStart(0), 180)
    }

    startTimer = window.setTimeout(run, 450)

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)
      driverObj?.destroy()
    }
  }, [isCompact, opportunityId, ready])

  return null
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { OnboardingConfettiBurst } from '@/components/onboarding/OnboardingConfettiBurst'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles } from '@/lib/icons'
import { clearOnboardingSessionMarkers } from '@/lib/onboardingResearchDemo'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { cn } from '@/lib/utils'

export function OnboardingRevealFinishSetup({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const [finishing, setFinishing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const finish = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      await updateProfile({ onboarding: true })
      clearOnboardingSessionMarkers()
      setShowConfetti(true)
      toast.success('Your Trial plan is ready')
      window.setTimeout(() => {
        setShowConfetti(false)
        navigate(roomPathForMode('research'), { replace: true })
      }, 700)
    } catch {
      toast.error('Could not finish setup. Please try again.')
      setFinishing(false)
    }
  }

  return (
    <div className={cn('relative z-10 w-full space-y-3 overflow-visible', className)}>
      <OnboardingConfettiBurst active={showConfetti} />
      <motion.button
        type="button"
        onClick={() => void finish()}
        disabled={finishing}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-none border border-primary/30 px-4 py-3.5 text-left',
          'bg-gradient-to-br from-primary/[0.14] via-card to-[hsl(var(--saffron-500)/0.1)]',
          'transition-colors hover:border-primary/50 disabled:opacity-60',
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-[15px] font-bold text-foreground">
              Start your Trial plan
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              One standard report and unlimited AI chat
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-none bg-foreground px-3 py-1.5 text-[11px] font-bold text-background">
          {finishing ? 'Finishing…' : 'Finish'}
        </span>
      </motion.button>
    </div>
  )
}

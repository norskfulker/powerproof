'use client'

import { Pencil } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { BYOK_SUBMIT_HINT } from '@/lib/byok'
import { ASK_AI_UI_ENABLED, requestAskAiOpen } from '@/lib/askAiPanelEvents'
import { useByok } from '@/hooks/useByok'

interface Props {
  opportunityId: string
  reResearchCount: number
  onComplete?: () => void
}

export function ReResearchPanel({ opportunityId, reResearchCount }: Props) {
  const isByokActive = useByok()
  if (!ASK_AI_UI_ENABLED) return null

  return (
    <div className="flex flex-col">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => requestAskAiOpen()}
        icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
        className="shrink-0"
      >
        Ask AI
        {isByokActive ? (
          <span className="ml-1 text-[10px] font-medium opacity-90">{BYOK_SUBMIT_HINT}</span>
        ) : null}
        {reResearchCount > 0 ? (
          <span className="ml-1 rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] font-semibold">
            ×{reResearchCount}
          </span>
        ) : null}
      </Button>
    </div>
  )
}

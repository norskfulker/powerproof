import type { useResearchOpportunity } from '@/hooks/useResearchOpportunity'
import type { useSourcing } from '@/hooks/useSourcing'
import type { useWarRoom } from '@/hooks/useWarRoom'

type ResearchHook = ReturnType<typeof useResearchOpportunity>
type WarRoomHook = ReturnType<typeof useWarRoom>
type SourcingHook = ReturnType<typeof useSourcing>

export function isResearchFlowBusy(research: ResearchHook): boolean {
  return research.step !== 'input' || research.wizardLoading
}

export function isWarRoomFlowBusy(warRoomOpen: boolean, warRoom: WarRoomHook): boolean {
  return (
    warRoomOpen &&
    (warRoom.phase !== 'idle' || warRoom.clarifyStep !== 'none' || warRoom.wizardLoading)
  )
}

export function isSourcingFlowBusy(sourcing: SourcingHook): boolean {
  return sourcing.step !== 'idle'
}

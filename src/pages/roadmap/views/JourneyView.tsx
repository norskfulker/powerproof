import { RoadmapJourney } from '../RoadmapJourneyBlocks'
import type { RoadmapDifficulty, RoadmapNode } from '../roadmapTypes'

type Props = {
  phases: RoadmapNode[]
  nodes: RoadmapNode[]
  /** Absolute index of the first phase in `phases` (for "Phase N" labels when filtering). */
  phaseIndexBase?: number
  onNodeComplete: (node: RoadmapNode) => void
  onNodeSelect?: (node: RoadmapNode) => void
  roadmapDifficulty?: RoadmapDifficulty | null
}

export function JourneyView({
  phases,
  nodes,
  phaseIndexBase = 0,
  onNodeComplete,
  onNodeSelect,
  roadmapDifficulty,
}: Props) {
  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-12 text-center text-sm text-muted-foreground">
        <p>No phases found in this roadmap.</p>
      </div>
    )
  }

  return (
    <RoadmapJourney
      phases={phases}
      nodes={nodes}
      phaseIndexBase={phaseIndexBase}
      onNodeComplete={onNodeComplete}
      onNodeSelect={onNodeSelect}
      roadmapDifficulty={roadmapDifficulty}
    />
  )
}

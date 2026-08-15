import type { IdeaChipsContext } from '@/hooks/useIdeaChipsSession'

/** Display count per tab — must match `generate-idea-chips` RETURN_SIZE per context. */
export const IDEA_CHIPS_COUNT: Record<IdeaChipsContext, number> = {
  research: 5,
  warroom: 5,
  sourcing: 6,
  roadmap: 5,
  market_test: 5,
}

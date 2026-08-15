/** Shared copy for re-research confirmation dialogs. */
export const RE_RESEARCH_CONFIRM = {
  title: 'Re-research this report?',
  description:
    'Selected sections will be regenerated and credits will be charged for this run.',
  confirmLabel: 'Re-research',
} as const

/** Shared copy for roadmap regeneration confirmation dialogs. */
export const REGENERATE_ROADMAP_CONFIRM = {
  title: 'Regenerate this roadmap?',
  confirmLabel: 'Regenerate',
} as const

export function regenerateRoadmapConfirmDescription(name?: string | null): string {
  const label = name?.trim()
  if (label) {
    return `"${label}" will be rebuilt from your goal. Credits will be charged.`
  }
  return 'This roadmap will be rebuilt from your goal. Credits will be charged.'
}

/** Market test re-run from history card. */
export const MARKET_TEST_RERUN_CONFIRM = {
  title: 'Re-run this market test?',
  description:
    "You'll start a new market reality check with this idea. Credits will be charged. This won't delete the existing report.",
  confirmLabel: 'Re-run',
} as const

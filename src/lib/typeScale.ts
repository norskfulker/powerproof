/**
 * typeScale — PowerProof official typography roles.
 *
 * FONT FAMILY: Inter Display for all UI type
 *   · titles use tracking-tighter (−0.05em)
 *   · headings use tracking-tight (−0.025em)
 *
 * WEIGHTS:
 * font-normal / 400 — body & caption
 * font-medium / 500 — headings / header (default)
 * font-bold / 700   — titles
 *
 * Keep only these semantic roles in design docs and new UI:
 * title · heading · header · body · caption
 */

export const typeScale = {
  title: 'text-page-title font-display font-bold tracking-tighter',
  heading: 'text-2xl font-display font-medium tracking-tight',
  header: 'text-section-header font-display font-medium tracking-tight',
  body: 'text-body font-sans font-normal',
  caption: 'text-caption font-sans font-normal',
} as const

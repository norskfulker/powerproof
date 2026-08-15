import { discoverHeroContentWidthShellClassName } from '@/components/discover/discoverHeroTokens'
import { cn } from '@/lib/utils'

/** Horizontal inset for Investors list + detail pages. */
export const investorsPagePadXClass = 'px-4 layout-sm:px-5 layout-lg:px-6'

/** Centered content column with investors side padding. */
export const investorsPageShellClass = cn(
  discoverHeroContentWidthShellClassName,
  investorsPagePadXClass,
  'w-full min-w-0 text-left',
)

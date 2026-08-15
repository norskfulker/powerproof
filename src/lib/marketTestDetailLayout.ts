import { cn } from '@/lib/utils'

/** Hide native scrollbars (incl. WebKit) on market test scroll regions. */
export const marketTestScrollHideClassName = cn(
  'hide-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
)

/**
 * Outer Ask AI shell layout for market test detail — page column scrolls beside the sticky panel.
 * Does not alter Ask AI panel / composer styling.
 */
export const marketTestAskAiPageShellClassName = cn(
  'min-h-[var(--ask-ai-sidebar-height)]',
  '[&>div:first-child]:max-h-[var(--ask-ai-sidebar-height)]',
  '[&>div:first-child]:min-h-0',
  '[&>div:first-child]:overflow-y-auto',
  '[&>div:first-child]:overscroll-y-contain',
  '[&>div:first-child]:hide-scrollbar',
  '[&>div:first-child]:[-ms-overflow-style:none]',
  '[&>div:first-child]:[scrollbar-width:none]',
  '[&>div:first-child]:[&::-webkit-scrollbar]:hidden',
)

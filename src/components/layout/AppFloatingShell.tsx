import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  appWorkspaceEmbedInsetClass,
  appWorkspaceEmbedPanelClass,
} from '@/lib/platformLayout'

export const APP_MAIN_SCROLL_ID = 'app-main-scroll'

export const appFloatingPageRootClass =
  'flex h-dvh flex-col overflow-hidden bg-background'

type AppFloatingShellProps = {
  children: ReactNode
  className?: string
  insetClassName?: string
  panelClassName?: string
  mainClassName?: string
  mainId?: string
}

/** Inset panel with rounded corners, border, and depth shadow — Room-style floating canvas. */
export function AppFloatingShell({
  children,
  className,
  insetClassName,
  panelClassName,
  mainClassName,
  mainId = APP_MAIN_SCROLL_ID,
}: AppFloatingShellProps) {
  return (
    <div className={cn(appWorkspaceEmbedInsetClass, 'min-h-0 flex-1', insetClassName, className)}>
      <div className={cn(appWorkspaceEmbedPanelClass, panelClassName)}>
        <main
          id={mainId}
          className={cn(
            'relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-visible px-0',
            '[-webkit-overflow-scrolling:touch] [touch-action:pan-y]',
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

type AppFloatingPageRootProps = {
  children: ReactNode
  className?: string
  mainClassName?: string
}

/** Full-viewport surface + floating panel — for routes outside AppLayout chrome (e.g. blog). */
export function AppFloatingPageRoot({ children, className, mainClassName }: AppFloatingPageRootProps) {
  return (
    <div className={cn(appFloatingPageRootClass, className)}>
      <AppFloatingShell mainClassName={mainClassName}>{children}</AppFloatingShell>
    </div>
  )
}

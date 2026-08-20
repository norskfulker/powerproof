import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/** Full left/right section frame used on scan, research, market test, and sourcing. */
export const internalPageSectionFrameClass = cn(
  'w-full min-w-0 border-x border-border-subtle bg-background',
)

export type InternalPageDataTab = {
  id: string
  label: string
  icon?: ReactNode
  extra?: ReactNode
}

/**
 * In-page data headers as tabs — same control as scan reports.
 * The tab track + panel share a full left/right section border on `bg-background`.
 */
export function InternalPageDataTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  panelClassName,
  flush = false,
}: {
  tabs: InternalPageDataTab[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
  panelClassName?: string
  /** Accordion pages: no panel padding so item L/R borders meet the section frame. */
  flush?: boolean
}) {
  if (tabs.length === 0) return null

  const controlled = value !== undefined
  const fallback = defaultValue ?? tabs[0]?.id

  return (
    <Tabs
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : fallback}
      onValueChange={onValueChange}
      className={cn('w-full min-w-0', className)}
    >
      <div
        className={cn(
          internalPageSectionFrameClass,
          'border-b border-t bg-background',
          'max-layout-sm:sticky max-layout-sm:top-12 max-layout-sm:z-[125]',
          'max-layout-sm:shadow-[0_1px_0_0_hsl(var(--border)/0.7)]',
        )}
      >
        <div className="-mx-1 overflow-x-auto px-3 py-2.5 sm:px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                icon={tab.icon}
                alwaysShowLabel
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {tab.extra}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div
        className={cn(
          internalPageSectionFrameClass,
          'border-b',
          flush
            ? 'p-0 [&_[data-internal-section]]:border-x-0 [&_[data-internal-section]]:first:border-t-0'
            : 'px-5 pb-8 pt-5 layout-sm:px-6',
          panelClassName,
        )}
      >
        {children}
      </div>
    </Tabs>
  )
}

export const internalPageTabPanelClass =
  'min-w-0 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'

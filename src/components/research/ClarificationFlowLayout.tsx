import type { ReactNode } from 'react'
import type { ClarifyNavModel } from '@/lib/clarifyNav'
import { ClarificationSidebar } from '@/components/research/ClarificationSidebar'
import { useClarificationNavRegistration } from '@/contexts/ClarificationNavContext'
import { cn } from '@/lib/utils'

export type ClarificationFlowLayoutProps = {
  navModel: ClarifyNavModel
  onSelectNavItem: (id: string) => void
  children: ReactNode
  className?: string
}

export function ClarificationFlowLayout({
  navModel,
  onSelectNavItem,
  children,
  className,
}: ClarificationFlowLayoutProps) {
  useClarificationNavRegistration(navModel, onSelectNavItem)

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      <ClarificationSidebar model={navModel} onSelectItem={onSelectNavItem} variant="inline" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

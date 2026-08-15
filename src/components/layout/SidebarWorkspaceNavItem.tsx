import { type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarNavLabelWithExtension } from '@/components/layout/SidebarNavLabelWithExtension'
import { withNavIconClass } from '@/lib/iconClassNames'
import { ChevronRight } from '@/lib/icons'
import {
  sidebarNavItemClassName,
  sidebarNavItemInnerClassName,
  sidebarNavSurfaceClassName,
} from '@/lib/sidebarNavStyles'
import { cn } from '@/lib/utils'

type SidebarWorkspaceNavItemProps = {
  active?: boolean
  icon: ReactNode
  label: string
  pathExtension?: string
  dataTour?: string
  collapsed?: boolean
  touchLayout?: boolean
  nested?: boolean
  denseIcons?: boolean
  onNavigate: () => void
}

export function SidebarWorkspaceNavItem({
  active,
  icon,
  label,
  pathExtension: _pathExtension,
  dataTour,
  collapsed = false,
  touchLayout = false,
  nested = false,
  denseIcons = false,
  onNavigate,
}: SidebarWorkspaceNavItemProps) {
  if (collapsed) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onNavigate}
            aria-label={label}
            className={cn(sidebarNavItemClassName(active, { iconOnly: true, touchLayout, denseIcons }))}
          >
            {withNavIconClass(icon, active, denseIcons ? 'md' : 'sm')}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="px-2.5 py-2 text-xs">
          <p className="font-medium">{label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={onNavigate}
      data-tour={dataTour}
      className={cn(
        nested
          ? cn(
              sidebarNavItemInnerClassName(active, touchLayout),
              'w-full rounded-md px-2.5 py-1.5 text-[13px]',
              sidebarNavSurfaceClassName(active),
            )
          : sidebarNavItemClassName(active, { touchLayout, denseIcons }),
      )}
    >
      {withNavIconClass(icon, active, denseIcons ? 'md' : 'sm')}
      <SidebarNavLabelWithExtension label={label} />
      <ChevronRight
        className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover/sidebar-nav:opacity-60"
        aria-hidden
      />
    </button>
  )
}

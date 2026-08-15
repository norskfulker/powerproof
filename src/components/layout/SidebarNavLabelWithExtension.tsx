import { cn } from '@/lib/utils'

type SidebarNavLabelWithExtensionProps = {
  label: string
  pathExtension?: string
  labelClassName?: string
}

/** Sidebar nav label — path extension is not shown inline (tooltip/collapsed only). */
export function SidebarNavLabelWithExtension({
  label,
  labelClassName,
}: SidebarNavLabelWithExtensionProps) {
  return (
    <span
      className={cn(
        'sidebar-label min-w-0 flex-1 truncate font-display font-normal leading-none',
        labelClassName,
      )}
    >
      {label}
    </span>
  )
}

import * as Icons from '@/lib/icons'
import type { RemixIconProps } from '@/lib/icons'
import type { ElementType } from 'react'

export function getPageIcon(iconName: string, props?: RemixIconProps) {
  const Icon = (Icons as Record<string, ElementType>)[iconName]
  if (!Icon) return <Icons.Circle {...props} />
  return <Icon {...props} />
}

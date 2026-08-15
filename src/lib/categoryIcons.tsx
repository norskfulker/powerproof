import type { ReactNode } from 'react'
import { getCategoryIcon, normalizeCategorySlugForIcon } from '@/lib/iconMaps'
import { getPageIcon } from '@/utils/getPageIcon'

/** Lucide component names stored in `categories.lucide` (PascalCase). */
export const CATEGORY_LUCIDE_ICON_OPTIONS = [
  'Shapes',
  'Sparkles',
  'Wheat',
  'HeartPulse',
  'Monitor',
  'Factory',
  'ShoppingBag',
  'Shirt',
  'Briefcase',
  'Hammer',
  'Zap',
  'GraduationCap',
  'CreditCard',
  'Truck',
  'Handshake',
  'Banknote',
  'Building2',
  'Store',
  'Compass',
  'Globe',
  'Package',
  'Leaf',
  'Coffee',
  'Utensils',
  'Car',
  'Plane',
  'Ship',
  'Home',
  'TreePine',
  'Gem',
  'Palette',
  'Music',
  'Camera',
  'BookOpen',
  'Target',
  'Rocket',
  'Star',
  'Circle',
] as const

export type CategoryRemixIconName = (typeof CATEGORY_LUCIDE_ICON_OPTIONS)[number]

export function isRemixIconName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? '').trim()
  return /^[A-Z][a-zA-Z0-9]*$/.test(trimmed)
}

/** Default Lucide name when DB still has emoji or empty icon. */
export function defaultRemixIconForSlug(slug: string): CategoryRemixIconName {
  const key = normalizeCategorySlugForIcon(slug)
  if (
    key.includes('food') ||
    key.startsWith('bakery') ||
    key.includes('agri') ||
    key.startsWith('dairy-') ||
    key.startsWith('beverage')
  ) {
    return 'Wheat'
  }
  if (key.includes('tech') || key.includes('digital') || key.includes('software')) return 'Monitor'
  if (key.includes('health') || key.includes('medical') || key.includes('wellness')) return 'HeartPulse'
  if (key.includes('edu') || key.includes('training')) return 'GraduationCap'
  if (key.includes('finance') || key.includes('fintech')) return 'CreditCard'
  if (key.includes('logistic') || key.includes('transport')) return 'Truck'
  if (key.includes('beauty') || key.includes('salon')) return 'Sparkles'
  if (key.includes('textile') || key.includes('fashion')) return 'Shirt'
  if (key.includes('retail')) return 'ShoppingBag'
  if (key.includes('manufactur')) return 'Factory'
  if (key.includes('construct')) return 'Hammer'
  if (key.includes('energy') || key.includes('solar') || key.includes('ev-')) return 'Zap'
  if (key.includes('franchise')) return 'Handshake'
  if (key.includes('service')) return 'Briefcase'
  return 'Shapes'
}

export function normalizeCategoryIconName(
  icon: string | null | undefined,
  slug?: string,
): CategoryRemixIconName {
  const trimmed = String(icon ?? '').trim()
  if (isRemixIconName(trimmed)) {
    return trimmed as CategoryRemixIconName
  }
  if (slug) return defaultRemixIconForSlug(slug)
  return 'Shapes'
}

export function renderCategoryIcon(
  slug: string,
  iconName?: string | null,
  className = 'h-4 w-4',
): ReactNode {
  const trimmed = String(iconName ?? '').trim()
  if (isRemixIconName(trimmed)) {
    return getPageIcon(trimmed, { className })
  }
  if (trimmed && !isRemixIconName(trimmed)) {
    return (
      <span className={className} aria-hidden>
        {trimmed}
      </span>
    )
  }
  return getCategoryIcon(slug, className)
}

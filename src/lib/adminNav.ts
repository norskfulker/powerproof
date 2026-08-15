/** Single source of truth for admin shell tab navigation. */

export type AdminNavSection = 'platform' | 'product-analytics'

export type AdminNavItem = {
  id: string
  label: string
  path: string
  section: AdminNavSection
  isActive: (pathname: string) => boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    section: 'platform',
    isActive: (p) => p === '/admin/analytics' || p === '/admin/analytics/',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    path: '/admin/opportunities',
    section: 'platform',
    isActive: (p) =>
      p.startsWith('/admin/opportunities') || p.startsWith('/admin/categories'),
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    section: 'platform',
    isActive: (p) => p.startsWith('/admin/users') || p.startsWith('/admin/credits'),
  },
  {
    id: 'promo',
    label: 'Promo',
    path: '/admin/promo',
    section: 'platform',
    isActive: (p) => p.startsWith('/admin/promo'),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    section: 'platform',
    isActive: (p) => p.startsWith('/admin/settings') || p.startsWith('/admin/pricing'),
  },
  {
    id: 'analytics-war-room',
    label: 'War Room',
    path: '/admin/warroom',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/warroom'),
  },
  {
    id: 'analytics-research',
    label: 'Research',
    path: '/admin/research',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/research'),
  },
  {
    id: 'analytics-roadmap',
    label: 'Roadmap',
    path: '/admin/roadmap',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/roadmap'),
  },
  {
    id: 'analytics-itchmyback',
    label: 'ItchMyBack',
    path: '/admin/itch',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/itch'),
  },
  {
    id: 'analytics-sourcing',
    label: 'Sourcing',
    path: '/admin/sourcing',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/sourcing'),
  },
  {
    id: 'analytics-market-test',
    label: 'Market Test',
    path: '/admin/markettest',
    section: 'product-analytics',
    isActive: (p) => p.startsWith('/admin/markettest'),
  },
]

export const ADMIN_NAV_SECTION_LABELS: Record<AdminNavSection, string> = {
  platform: 'Platform',
  'product-analytics': 'Product analytics',
}

export function resolveAdminNavId(pathname: string): string {
  const item = ADMIN_NAV_ITEMS.find((entry) => entry.isActive(pathname))
  return item?.id ?? 'analytics'
}

export function adminSectionTitle(pathname: string): string {
  const item = ADMIN_NAV_ITEMS.find((entry) => entry.isActive(pathname))
  if (!item) return 'Admin'
  if (item.section === 'product-analytics') return `${item.label} analytics`
  return item.label
}

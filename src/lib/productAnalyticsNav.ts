/** Product analytics page links — paths align with `ADMIN_NAV_ITEMS` product-analytics section. */

export type ProductAnalyticsLink = {
  id: string
  label: string
  path: string
  desc: string
}

export const PRODUCT_ANALYTICS_LINKS: ProductAnalyticsLink[] = [
  {
    id: 'analytics-research',
    label: 'Research',
    path: '/admin/research',
    desc: 'Research runs, styles, and re-runs',
  },
  {
    id: 'analytics-war-room',
    label: 'War Room',
    path: '/admin/warroom',
    desc: 'Playbook generations and models',
  },
  {
    id: 'analytics-roadmap',
    label: 'Roadmap',
    path: '/admin/roadmap',
    desc: 'Roadmaps by persona and difficulty',
  },
  {
    id: 'analytics-sourcing',
    label: 'Sourcing',
    path: '/admin/sourcing',
    desc: 'Supplier searches and keywords',
  },
  {
    id: 'analytics-market-test',
    label: 'Market Test',
    path: '/admin/markettest',
    desc: 'Market tests and verdicts',
  },
  {
    id: 'analytics-itchmyback',
    label: 'ItchMyBack',
    path: '/admin/itch',
    desc: 'Card saves and reactions',
  },
]

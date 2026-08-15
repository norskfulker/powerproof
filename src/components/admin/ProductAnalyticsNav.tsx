import { Link, useLocation } from 'react-router-dom'
import { PRODUCT_ANALYTICS_LINKS } from '@/lib/productAnalyticsNav'
import { AdminShortcutCard } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'

export function ProductAnalyticsLinkBar({ className }: { className?: string }) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Product analytics pages"
      className={cn('flex flex-wrap gap-2', className)}
    >
      {PRODUCT_ANALYTICS_LINKS.map((link) => {
        const active = pathname.startsWith(link.path)
        return (
          <Link
            key={link.id}
            to={link.path}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium no-underline transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border-subtle bg-bg-sunken text-muted-foreground hover:border-border-default hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function ProductAnalyticsShortcutGrid({ className }: { className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Product analytics
      </h2>
      <div className="grid gap-3 layout-sm:grid-cols-2 layout-lg:grid-cols-3">
        {PRODUCT_ANALYTICS_LINKS.map((link) => (
          <AdminShortcutCard key={link.id} href={link.path} label={link.label} desc={link.desc} />
        ))}
      </div>
    </section>
  )
}

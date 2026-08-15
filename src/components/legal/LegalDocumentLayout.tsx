import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { AppFloatingPageRoot } from '@/components/layout/AppFloatingShell'
import { LEGAL_PATHS } from '@/lib/legal'
import { landingSignInTo } from '@/lib/authLanding'
import { cn } from '@/lib/utils'

const PAGE_INSET = 'mx-auto w-full max-w-platform px-4 layout-sm:px-6 layout-lg:px-8'

export type LegalSection = {
  id: string
  title: string
  content: ReactNode
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  )

export function LegalDocumentLayout({
  title,
  description,
  updatedOn,
  canonicalPath,
  sections,
}: {
  title: string
  description: string
  updatedOn: string
  canonicalPath: string
  sections: LegalSection[]
}) {
  return (
    <AppFloatingPageRoot>
      <Seo title={`${title} | PowerProof`} description={description} canonicalPath={canonicalPath} />
      <header
        className={cn(
          PAGE_INSET,
          'sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border-subtle/70 bg-background/90 backdrop-blur-sm sm:h-16',
        )}
      >
        <BrandLogoLink className="h-auto px-0" logoClassName="h-6 max-w-[8.5rem]" />
        <nav className="flex items-center gap-1" aria-label="Legal">
          <NavLink to={LEGAL_PATHS.privacy} className={navLinkClass}>
            Privacy
          </NavLink>
          <NavLink to={LEGAL_PATHS.terms} className={navLinkClass}>
            Terms
          </NavLink>
          <Link
            to={landingSignInTo()}
            className="ml-1 rounded-md px-2.5 py-1 text-[13px] font-semibold text-primary hover:bg-primary/10"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <div className={cn(PAGE_INSET, 'grid gap-10 py-8 pb-16 layout-sm:grid-cols-[16rem_minmax(0,1fr)] layout-sm:py-12 layout-lg:gap-14')}>
        <aside className="hidden min-w-0 layout-sm:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              On this page
            </p>
            <nav className="flex flex-col gap-1" aria-label="Table of contents">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md px-2 py-1 text-[13px] leading-snug text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Legal</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground layout-sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">Effective date: {updatedOn}</p>

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/90 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </AppFloatingPageRoot>
  )
}

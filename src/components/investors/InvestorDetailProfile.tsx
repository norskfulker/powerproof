import { Globe, Linkedin, Mail, MapPin } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import { DiscoverHeroMetricStrip } from '@/components/discover/DiscoverHeroMetricStrip'
import { InvestorLogo } from '@/components/investors/InvestorLogo'
import {
  formatInvestorCheckSize,
  formatInvestorFirmType,
  formatInvestorLabel,
} from '@/lib/investorsDisplay'
import type { Investor } from '@/types/investors'
import { cn } from '@/lib/utils'

function SectionCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card
      padding="none"
      radius="xl"
      className={cn('shadow-sm', className)}
      topSlot={
        <div className={cardTopSlotRowClass}>
          <span className={cardTopSlotTitleClass}>{title}</span>
        </div>
      }
    >
      <div className="p-4 layout-sm:p-5">{children}</div>
    </Card>
  )
}

function TagList({
  items,
  variant = 'blue',
}: {
  items: string[]
  variant?: 'green' | 'amber' | 'blue' | 'purple' | 'gray' | 'orange'
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant} size="sm">
          {formatInvestorLabel(item)}
        </Badge>
      ))}
    </div>
  )
}

export function InvestorDetailProfile({ investor }: { investor: Investor }) {
  const portfolio = investor.portfolio_companies ?? []
  const exits = investor.notable_exits ?? []
  const firmType = investor.firm_type?.trim()
    ? formatInvestorFirmType(investor.firm_type)
    : 'Investor'
  const hq = investor.hq_country?.trim() || '—'
  const check = formatInvestorCheckSize(
    investor.check_size_min_usd,
    investor.check_size_max_usd,
  )
  const founded = investor.founded_year ? String(investor.founded_year) : '—'
  const locationBits = [
    hq !== '—' ? hq : null,
    investor.founded_year ? `Founded ${investor.founded_year}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 layout-sm:gap-5">
      <Card
        padding="none"
        radius="xl"
        className="shadow-sm"
        topSlot={
          <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
            <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>{firmType}</span>
            {investor.is_india_focused ? (
              <Badge variant="amber" size="sm">
                India focused
              </Badge>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5 layout-sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <InvestorLogo name={investor.name} src={investor.logo_url} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-foreground layout-sm:text-3xl">
                {investor.name}
              </h1>
              {locationBits.length > 0 ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {locationBits.join(' · ')}
                </p>
              ) : null}
            </div>
          </div>

          <DiscoverHeroMetricStrip
            metrics={[
              { label: 'Check size', value: check, tone: check !== '—' ? 'success' : 'muted' },
              { label: 'HQ', value: hq, tone: hq !== '—' ? 'default' : 'muted' },
              { label: 'Founded', value: founded, tone: founded !== '—' ? 'default' : 'muted' },
            ]}
          />

          {investor.description ? (
            <p className="text-[15px] leading-relaxed text-foreground">{investor.description}</p>
          ) : null}

          {investor.website_url || investor.linkedin_url || investor.contact_form_url ? (
            <div className="flex flex-wrap items-center gap-2">
              {investor.website_url ? (
                <Button
                  as="a"
                  href={investor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="sm"
                  icon={<Globe className="h-3.5 w-3.5" aria-hidden />}
                >
                  Website
                </Button>
              ) : null}
              {investor.linkedin_url ? (
                <Button
                  as="a"
                  href={investor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                  icon={<Linkedin className="h-3.5 w-3.5" aria-hidden />}
                >
                  LinkedIn
                </Button>
              ) : null}
              {investor.contact_form_url ? (
                <Button
                  as="a"
                  href={investor.contact_form_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                  icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
                >
                  Contact
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {investor.thesis ? (
        <SectionCard title="Thesis">
          <p className="text-[14px] leading-relaxed text-foreground">{investor.thesis}</p>
        </SectionCard>
      ) : null}

      {investor.stages?.length || investor.sectors?.length || investor.operating_countries?.length ? (
        <div className="grid gap-4 layout-sm:grid-cols-2 layout-sm:gap-5">
          {investor.stages?.length ? (
            <SectionCard title="Stages">
              <TagList items={investor.stages} variant="blue" />
            </SectionCard>
          ) : null}
          {investor.sectors?.length ? (
            <SectionCard title="Sectors">
              <TagList items={investor.sectors} variant="purple" />
            </SectionCard>
          ) : null}
          {investor.operating_countries?.length ? (
            <SectionCard
              title="Geography"
              className={investor.stages?.length && investor.sectors?.length ? 'layout-sm:col-span-2' : undefined}
            >
              <TagList items={investor.operating_countries} variant="green" />
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {portfolio.length > 0 ? (
        <SectionCard title="Portfolio">
          <ul className="grid gap-2 layout-sm:grid-cols-2">
            {portfolio.map((company) => (
              <li
                key={`${company.name}-${company.sector ?? ''}`}
                className="rounded-lg border border-border-subtle bg-muted/20 px-3 py-2.5"
              >
                <p className="truncate text-[13px] font-semibold text-foreground">{company.name}</p>
                {company.sector ? (
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {formatInvestorLabel(company.sector)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {exits.length > 0 ? (
        <SectionCard title="Notable exits">
          <TagList items={exits} variant="amber" />
        </SectionCard>
      ) : null}
    </div>
  )
}

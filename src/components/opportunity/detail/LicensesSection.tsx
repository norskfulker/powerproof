import { useMemo } from 'react'
import type { ElementType } from 'react'
import {
  AlertTriangle,
  Building2,
  Clock,
  DollarSign,
  ExternalLink,
  FileCheck,
  Globe,
  Lock,
  ShieldCheck,
  Sparkles,
} from '@/lib/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import type { ReactNode } from 'react'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'

import { Card } from '@/components/ui/card'
import {
  opportunityDetailCardClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'

export type LicensesSectionProps = {
  licensesList: any[]
  opp: any
  isMobile: boolean
  isLocked: boolean
  formatMoney: (n: number) => string
  formatSetupCost: (min: number | null | undefined, max: number | null | undefined) => string
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

const PRIORITY_ORDER = ['Mandatory', 'Nice to Have', 'Optional'] as const

const PRIORITY_CONFIG: Record<
  string,
  { icon: ElementType; hue: number; tabLabel: string }
> = {
  Mandatory: { icon: ShieldCheck, hue: 340, tabLabel: 'Mandatory' },
  'Nice to Have': { icon: Sparkles, hue: 32, tabLabel: 'Nice to have' },
  Optional: { icon: FileCheck, hue: 152, tabLabel: 'Optional' },
}

const LICENSE_PALETTE = [
  { hue: 227 },
  { hue: 262 },
  { hue: 152 },
  { hue: 32 },
  { hue: 199 },
  { hue: 340 },
  { hue: 174 },
  { hue: 280 },
] as const

function getLicenseColors(index: number) {
  const { hue } = LICENSE_PALETTE[index % LICENSE_PALETTE.length]
  return {
    hue,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    text: `hsl(${hue}, 80%, 45%)`,
  }
}

function formatProcess(process: string | undefined): string | null {
  if (!process) return null
  if (process === 'both') return 'Online & Offline'
  return process.charAt(0).toUpperCase() + process.slice(1)
}

function LicenseMetaTile({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border-0 bg-muted/20 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={iconClassName({ tone: 'muted', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-sans text-[12px] font-medium leading-snug text-foreground">{children}</div>
    </div>
  )
}

function LicenseCard({
  lic,
  index,
  isBlurred,
  formatMoney,
}: {
  lic: any
  index: number
  isBlurred: boolean
  formatMoney: (n: number) => string
}) {
  const { localizeText } = useCurrency()
  const colors = getLicenseColors(index)
  const portal = String(lic.portal ?? lic.url ?? '').trim()
  const portalHref =
    portal && (portal.startsWith('http') ? portal : portal.includes('.') ? `https://${portal}` : '')
  const processLabel = formatProcess(lic.process as string | undefined)
  const cost = Number(lic.cost)
  const hasCost = Number.isFinite(cost) && cost > 0

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(
        opportunityDetailCardClass,
        'overflow-hidden transition-shadow hover:shadow-md',
        isBlurred && 'pointer-events-none blur-[4px] select-none',
      )}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <FileCheck
            className={iconClassName({ tone: iconToneForIndex(index), size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {lic.name || '—'}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {processLabel ? (
          <span className="inline-flex rounded-lg border-0 bg-primary/[0.06] px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
            {processLabel}
          </span>
        ) : null}
        {lic.description ? (
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">
            {localizeText(lic.description)}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <LicenseMetaTile icon={Building2} label="Authority">
            {lic.authority || '—'}
          </LicenseMetaTile>
          <LicenseMetaTile icon={DollarSign} label="Cost">
            {hasCost ? (
              <span className="font-bold tabular-nums" style={{ color: colors.text }}>
                {formatMoney(cost)}
              </span>
            ) : (
              <span className="text-muted-foreground/60">—</span>
            )}
          </LicenseMetaTile>
          <LicenseMetaTile icon={Clock} label="Time">
            {lic.days ? (
              <span className="font-bold tabular-nums">{lic.days} days</span>
            ) : (
              <span className="text-muted-foreground/60">—</span>
            )}
          </LicenseMetaTile>
          <LicenseMetaTile icon={Globe} label="Portal">
            {portalHref ? (
              <a
                href={portalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                Open
                <ExternalLink className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              </a>
            ) : portal ? (
              portal
            ) : (
              <span className="text-muted-foreground/70">Local office</span>
            )}
          </LicenseMetaTile>
        </div>

        {lic.common_issues ? (
          <div className="rounded-xl border-0 bg-warning/[0.06] px-3.5 py-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className={iconClassName({ tone: 'amber', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-warning">
                Common issue
              </span>
            </div>
            <p className="font-sans text-[12px] leading-relaxed text-foreground/85">{localizeText(lic.common_issues)}</p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function LicenseList({
  items,
  isLocked,
  isFirstCategory,
  formatMoney,
}: {
  items: any[]
  isLocked: boolean
  isFirstCategory: boolean
  formatMoney: (n: number) => string
}) {
  return (
    <div className="space-y-3">
      {items.map((lic, i) => {
        const blurred = isLocked && i > 0 && !isFirstCategory
        return (
          <LicenseCard key={i} lic={lic} index={i} isBlurred={blurred} formatMoney={formatMoney} />
        )
      })}
    </div>
  )
}

export function LicensesSection(props: LicensesSectionProps) {
  const { licensesList, opp, isMobile, isLocked, formatMoney, formatSetupCost } = props

  const { grouped, categories, firstCat, mandatoryCount } = useMemo(() => {
    const grouped = licensesList.reduce<Record<string, any[]>>((acc, lic) => {
      let p = lic.priority
      if (!p) p = lic.mandatory === true || lic.mandatory === 'true' ? 'Mandatory' : 'Optional'
      if (!acc[p]) acc[p] = []
      acc[p].push(lic)
      return acc
    }, {})

    const categories = Object.keys(grouped).sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a as (typeof PRIORITY_ORDER)[number])
      const bi = PRIORITY_ORDER.indexOf(b as (typeof PRIORITY_ORDER)[number])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    return {
      grouped,
      categories,
      firstCat: categories[0] ?? 'Mandatory',
      mandatoryCount: grouped.Mandatory?.length ?? 0,
    }
  }, [licensesList])

  const totalMin = opp.license_cost_min || 0
  const totalMax = opp.license_cost_max || 0
  const hasCost = totalMin > 0 || totalMax > 0
  const costStr = hasCost ? formatSetupCost(totalMin, totalMax) : null
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('licenses_required', 'licenses')

  if (!licensesList?.length) return null

  const subtitleParts = [
    `${licensesList.length} licence${licensesList.length === 1 ? '' : 's'}`,
    mandatoryCount > 0 ? `${mandatoryCount} mandatory` : null,
    costStr ? `est. ${costStr}` : null,
  ].filter(Boolean)

  const body =
    categories.length <= 1 ? (
      <LicenseList
        items={grouped[firstCat] ?? []}
        isLocked={isLocked}
        isFirstCategory
        formatMoney={formatMoney}
      />
    ) : (
      <Tabs defaultValue={firstCat} className="w-full">
        <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList>
            {categories.map((cat) => {
              const config = PRIORITY_CONFIG[cat] ?? PRIORITY_CONFIG.Optional
              const Icon = config.icon
              const count = grouped[cat]?.length ?? 0
              return (
                <TabsTrigger key={cat} value={cat} icon={<Icon className="h-4 w-4" />}>
                  {config.tabLabel}
                  <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <LicenseList
              items={grouped[cat] ?? []}
              isLocked={isLocked}
              isFirstCategory={cat === firstCat}
              formatMoney={formatMoney}
            />
          </TabsContent>
        ))}
      </Tabs>
    )

  return (
    <section id="od-licenses" className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="licenses"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={FileCheck}
            title={<OpportunityTermLabel term="licences_registrations" label="Licences & Registrations" />}
          />
        }
        description={subtitleParts.join(' · ')}
      >
        <div className="space-y-4">
          {isLocked ? (
            <div className="flex items-center gap-2 rounded-xl border-0 bg-warning/[0.04] px-4 py-2.5">
              <Lock className="h-4 w-4 shrink-0 text-warning" strokeWidth={2.5} aria-hidden />
              <p className="font-sans text-[12px] font-medium text-warning/80">
                Sign in to view all licence details. First item in the first group is visible as a preview.
              </p>
            </div>
          ) : null}
          {body}
        </div>
      </OpportunityDetailSectionShell>
    </section>
  )
}

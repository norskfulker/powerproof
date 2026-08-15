import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const DIFFICULTY = {
  easy: { label: 'Easy to get', labelClass: 'text-blue-800' },
  medium: { label: 'Moderate', labelClass: 'text-saffron-600' },
  hard: { label: 'Competitive', labelClass: 'text-destructive' },
} as const

const metaLabelClass =
  'mb-0.5 block font-sans text-[10px] font-bold tracking-[0.06em] text-muted-foreground'
const metaValueClass = 'block font-sans text-xs text-foreground'

function schemeRows(s: any, key: 'benefits' | 'pros' | 'cons' | 'eligibility'): unknown[] {
  if (Array.isArray(s?.[key])) return s[key]
  if (key === 'eligibility' && s?.eligibility) return [s.eligibility]
  if (key === 'benefits' && s?.benefit) return [s.benefit]
  return []
}

function SchemeBulletList({ rows }: { rows: unknown[] }) {
  if (!rows.length) {
    return <p className="m-0 font-sans text-[13px] text-muted-foreground">No details listed.</p>
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((item: unknown, idx: number) => (
        <li
          key={idx}
          className="flex items-start gap-2.5 font-sans text-[13px] leading-[1.55] text-foreground"
        >
          <span className="mt-px shrink-0 text-sm text-[hsl(var(--text-tertiary))]">–</span>
          <span>{String(item ?? '')}</span>
        </li>
      ))}
    </ul>
  )
}

/** One government scheme row — always-open section shell. */
export function SchemeAccordionItem({
  scheme: s,
  isMobile,
  accValue,
}: {
  scheme: any
  isMobile: boolean
  accValue: string
}) {
  const benefitRows = useMemo(() => schemeRows(s, 'benefits'), [s])
  const eligibilityRows = useMemo(() => schemeRows(s, 'eligibility'), [s])
  const prosRows = useMemo(() => schemeRows(s, 'pros'), [s])
  const consRows = useMemo(() => schemeRows(s, 'cons'), [s])

  const hasBenefitsEligibility = benefitRows.length > 0 || eligibilityRows.length > 0
  const hasProsCons = prosRows.length > 0 || consRows.length > 0

  const defaultBenefitsTab = benefitRows.length > 0 ? 'benefits' : 'eligibility'
  const defaultProsTab = prosRows.length > 0 ? 'pros' : 'cons'

  const [benefitsTab, setBenefitsTab] = useState<'benefits' | 'eligibility'>(defaultBenefitsTab)
  const [analysisTab, setAnalysisTab] = useState<'pros' | 'cons'>(defaultProsTab)

  const diff = DIFFICULTY[(s?.difficulty as keyof typeof DIFFICULTY) ?? 'medium'] ?? DIFFICULTY.medium
  const applyAt = String(s?.apply_at ?? s?.apply_url ?? '').trim()
  const hasUrl = Boolean(applyAt) && !applyAt.toLowerCase().startsWith('through')
  const url = hasUrl ? (applyAt.startsWith('http') ? applyAt : `https://${applyAt}`) : null

  return (
    <Card id={accValue} padding="sm" radius="lg" className="w-full">
      <div id={accValue} className="flex w-full min-w-0 flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            className={cn(
              'font-sans font-bold leading-snug text-foreground',
              isMobile ? 'text-[15px]' : 'text-base',
            )}
          >
            {s?.scheme ?? s?.name}
          </div>
          {s?.ministry ? (
            <div className="font-sans text-xs font-semibold leading-snug text-muted-foreground">{s.ministry}</div>
          ) : null}
          {s?.full_name && s?.full_name !== s?.ministry ? (
            <div className="font-sans text-[11px] leading-snug text-muted-foreground">{s.full_name}</div>
          ) : null}
          {(s?.subsidy ?? s?.benefit) ? (
            <p className="m-0 font-sans text-[13px] leading-[1.45] text-muted-foreground">
              {s?.subsidy ?? s?.benefit}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-0.5 font-sans sm:items-end">
          <span className={cn('text-[11px] font-semibold', diff.labelClass)}>{diff.label}</span>
          {s?.processing_days && String(s.processing_days) !== '0' ? (
            <span className="text-[11px] text-muted-foreground">~{s.processing_days} days</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 text-foreground">
        {s?.notes ? (
          <div className="mb-4 rounded-[var(--radius-md)] border-l-[3px] border-border-default bg-bg-sunken/45 px-3.5 py-3 font-sans text-[13px] leading-[1.55] text-foreground">
            <span className="mb-1.5 block font-sans text-[10px] font-bold tracking-[0.08em] text-foreground">
              NOTE
            </span>
            {s.notes}
          </div>
        ) : null}

        <div
          className={cn(
            'mb-4 grid gap-x-5 gap-y-3',
            isMobile ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {s?.nodal_agency ? (
            <div>
              <span className={metaLabelClass}>Nodal agency</span>
              <span className={metaValueClass}>{s.nodal_agency}</span>
            </div>
          ) : null}
          {s?.max_project_cost ? (
            <div>
              <span className={metaLabelClass}>Max project cost</span>
              <span className={metaValueClass}>{s.max_project_cost}</span>
            </div>
          ) : null}
        </div>

        {hasBenefitsEligibility ? (
          <Tabs
            value={benefitsTab}
            onValueChange={(v) => setBenefitsTab(v as 'benefits' | 'eligibility')}
            variant="secondary"
            className="mb-4"
          >
            <TabsList className="mb-3 w-full max-w-full justify-start overflow-x-auto">
              {benefitRows.length > 0 ? (
                <TabsTrigger value="benefits" className="shrink-0">
                  What you get
                </TabsTrigger>
              ) : null}
              {eligibilityRows.length > 0 ? (
                <TabsTrigger value="eligibility" className="shrink-0">
                  Who qualifies
                </TabsTrigger>
              ) : null}
            </TabsList>
            {benefitRows.length > 0 ? (
              <TabsContent value="benefits" className="mt-0">
                <SchemeBulletList rows={benefitRows} />
              </TabsContent>
            ) : null}
            {eligibilityRows.length > 0 ? (
              <TabsContent value="eligibility" className="mt-0">
                <SchemeBulletList rows={eligibilityRows} />
              </TabsContent>
            ) : null}
          </Tabs>
        ) : null}

        {hasProsCons ? (
          <Tabs
            value={analysisTab}
            onValueChange={(v) => setAnalysisTab(v as 'pros' | 'cons')}
            variant="secondary"
            className="mb-4"
          >
            <TabsList className="mb-3 w-full max-w-full justify-start overflow-x-auto">
              {prosRows.length > 0 ? (
                <TabsTrigger value="pros" className="shrink-0">
                  Why it works
                </TabsTrigger>
              ) : null}
              {consRows.length > 0 ? (
                <TabsTrigger value="cons" className="shrink-0">
                  Watch out for
                </TabsTrigger>
              ) : null}
            </TabsList>
            {prosRows.length > 0 ? (
              <TabsContent value="pros" className="mt-0">
                <SchemeBulletList rows={prosRows} />
              </TabsContent>
            ) : null}
            {consRows.length > 0 ? (
              <TabsContent value="cons" className="mt-0">
                <SchemeBulletList rows={consRows} />
              </TabsContent>
            ) : null}
          </Tabs>
        ) : null}

        {s?.application_process ? (
          <div className="mb-4 rounded-[var(--radius-md)] border border-border-subtle bg-bg-sunken/40 px-3.5 py-3 font-sans text-[13px] leading-[1.55] text-foreground">
            <span className="mb-1.5 block font-sans text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
              HOW TO APPLY
            </span>
            {s.application_process}
          </div>
        ) : null}

        <div className="mt-4">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border-default bg-bg-surface px-3.5 py-2 font-sans text-[13px] font-semibold text-foreground no-underline"
            >
              Open application portal ↗
            </a>
          ) : (
            <span className="font-sans text-xs italic text-muted-foreground">
              {applyAt || 'Apply through your bank or nodal agency — no separate portal listed'}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

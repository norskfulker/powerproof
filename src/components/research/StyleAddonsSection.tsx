import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import type { RemixIcon } from '@/lib/icons'
import {
  TrendingUp,
  Target,
  Shield,
  Zap,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  GitBranch,
  ArrowRight,
  DollarSign,
  Percent,
  Clock,
  Briefcase,
  Scale,
  Lock,
  Users,
  ChevronRight,
} from '@/lib/icons'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { researchStyleLogoUrl } from '@/lib/brandLogos'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'

import {
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

export interface StyleAddonsSectionProps {
  addons: Record<string, unknown>
  style: string
}

// ─── Color System ────────────────────────────────────────────────

const COMPETITOR_PALETTE = [
  { hue: 227, name: 'Blue' },      // 0
  { hue: 262, name: 'Violet' },    // 1
  { hue: 152, name: 'Emerald' },   // 2
  { hue: 32, name: 'Amber' },      // 3
  { hue: 199, name: 'Sky' },       // 4
  { hue: 340, name: 'Rose' },      // 5
  { hue: 174, name: 'Teal' },      // 6
  { hue: 280, name: 'Fuchsia' },   // 7
] as const

type StyleAccentColors = {
  hue: number
  solid: string
  light: string
  mutedBg: string
  cardBg: string
  glow: string
  text: string
  subtleText: string
  border: string
}

function getCompetitorColors(index: number): StyleAccentColors {
  const len = COMPETITOR_PALETTE.length
  const normalized = Number.isFinite(index)
    ? ((Math.floor(index) % len) + len) % len
    : 0
  const entry = COMPETITOR_PALETTE[normalized] ?? COMPETITOR_PALETTE[0]
  const { hue } = entry
  return {
    hue,
    solid: `hsl(${hue}, 85%, 58%)`,
    light: `hsl(${hue}, 85%, 95%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    cardBg: `hsla(${hue}, 60%, 97%, 0.4)`,
    glow: `hsla(${hue}, 85%, 58%, 0.12)`,
    text: `hsl(${hue}, 80%, 45%)`,
    subtleText: `hsl(${hue}, 60%, 55%)`,
    border: `hsla(${hue}, 85%, 58%, 0.2)`,
  }
}

// ─── Glass Card Wrapper ──────────────────────────────────────────

function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
  index = 0,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  index?: number
}) {
  const colors = getCompetitorColors(index)
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card/[0.8] backdrop-blur-xl',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.02)]',
        hover &&
          'transition-all duration-500 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_16px_48px_rgba(0,0,0,0.04)] hover:border-border-default/60 hover:-translate-y-0.5',
        glow && 'before:absolute before:inset-0 before:bg-primary/[0.03] before:rounded-2xl',
        className,
      )}
      style={{ borderColor: glow ? colors.border : undefined }}
    >
      <div className="absolute inset-0 rounded-2xl bg-primary/[0.02] pointer-events-none" />
      {glow && (
        <div
          className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
          style={{ background: colors.glow }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  badge,
  badgeVariant = 'gray',
}: {
  icon: React.ElementType
  title: string
  badge?: ReactNode
  badgeVariant?: 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'gray'
}) {
  const variantStyles = {
    green: 'bg-success/10 text-success border-success/20',
    amber: 'bg-warning/10 text-warning border-warning/20',
    red: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    gray: 'bg-muted/50 text-muted-foreground border-border-subtle/50',
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <h3 className="font-sans text-lg font-medium text-foreground">
          {title}
        </h3>
      </div>
      {badge && (
        <span
          className={cn(
            'inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider',
            variantStyles[badgeVariant],
          )}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Metric Badge ───────────────────────────────────────────────

function MetricBadge({
  children,
  variant = 'default',
  size = 'sm',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'info'
  size?: 'sm' | 'md'
}) {
  const variants = {
    default: 'bg-muted/60 text-muted-foreground border-border-subtle/50',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border font-black uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        variants[variant],
      )}
    >
      {children}
    </span>
  )
}

// ─── Strategy section shell ───────────────────────────────────────

const styleAddonBadgeVariants = {
  blue: 'bg-primary/10 text-primary border-primary/20',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  green: 'bg-success/10 text-success border-success/20',
  gray: 'bg-muted/50 text-muted-foreground border-border-subtle/50',
} as const

function StyleAddonAccordionItem({
  value,
  title,
  icon: Icon,
  badge,
  badgeVariant = 'blue',
  styleColors,
  children,
}: {
  value: string
  title: string
  icon: RemixIcon
  badge?: string
  badgeVariant?: keyof typeof styleAddonBadgeVariants
  styleColors?: StyleAccentColors
  children: ReactNode
}) {
  return (
    <OpportunityDetailSectionShell
      id={value}
      header={
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
              style={
                styleColors
                  ? { background: styleColors.mutedBg, color: styleColors.text }
                  : undefined
              }
            >
              <Icon
                className={cn('h-4 w-4', !styleColors && 'text-primary')}
                style={styleColors ? { color: styleColors.text } : undefined}
                strokeWidth={2.5}
                aria-hidden
              />
            </span>
            <span className="font-sans text-lg font-medium text-foreground">
              {title}
            </span>
          </span>
          {badge ? (
            <span
              className={cn(
                'hidden shrink-0 items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider layout-sm:inline-flex',
                styleAddonBadgeVariants[badgeVariant],
              )}
            >
              {badge}
            </span>
          ) : null}
        </span>
      }
    >
      <div className="px-1 pb-1 pt-2">{children}</div>
    </OpportunityDetailSectionShell>
  )
}

// ─── Animated Block Wrapper ─────────────────────────────────────

function AnimatedBlock({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      {children}
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  mckinsey: 'McKinsey & Co.',
  bcg: 'BCG',
  bain: 'Bain & Co.',
  goldman_sachs: 'Goldman Sachs',
  jp_morgan: 'JP Morgan',
  kpmg: 'KPMG',
}

export function StyleAddonsSection({ addons, style }: StyleAddonsSectionProps) {
  const { formatMoney } = useCurrency()
  const styleKey = String(style).trim().toLowerCase()
  const researchStyle = styleKey as ResearchStyle
  const badgeLogoUrl = researchStyleLogoUrl(researchStyle)
  const firmAlt =
    RESEARCH_STYLE_OPTIONS.find((o) => o.value === researchStyle)?.firm ?? STYLE_LABELS[styleKey] ?? styleKey
  const isStrategy = ['mckinsey', 'bcg', 'bain'].includes(styleKey)
  const isBanking = ['goldman_sachs', 'jp_morgan'].includes(styleKey)
  const isAudit = styleKey === 'kpmg'

  const stylePaletteIndex: Record<string, number> = {
    mckinsey: 0,
    bcg: 1,
    bain: 2,
    goldman_sachs: 3,
    jp_morgan: 4,
    kpmg: 5,
  }

  const styleColors = getCompetitorColors(stylePaletteIndex[styleKey] ?? 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Style badge divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-subtle/60" />
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-sm"
          style={{
            borderColor: styleColors.border,
            background: styleColors.glow,
          }}
        >
          {badgeLogoUrl ? (
            <BrandLogoImg
              src={badgeLogoUrl}
              alt={firmAlt}
              height={18}
              className="max-w-[3.75rem] shrink-0"
            />
          ) : (
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ background: styleColors.mutedBg }}
            >
              <Briefcase className="h-3 w-3" style={{ color: styleColors.text }} strokeWidth={2.5} />
            </div>
          )}
          <span
            className="text-md font-medium tracking-tight"
            style={{ color: styleColors.text }}
          >
             Analysis
          </span>
        </div>
        <div className="h-px flex-1 bg-border-subtle/60" />
      </div>

      {isStrategy ? (
        <StrategyAddonsBlock
          frameworks={addons.strategic_frameworks as Record<string, unknown> | undefined}
          porters={addons.porters_five_forces as Record<string, unknown> | undefined}
          roadmap={addons.transformation_roadmap as Record<string, unknown>[] | undefined}
          formatMoney={formatMoney}
          styleColors={styleColors}
        />
      ) : null}

      {isBanking && addons.valuation_model ? (
        <ValuationModelBlock data={addons.valuation_model as Record<string, unknown>} formatMoney={formatMoney} />
      ) : null}
      {isBanking && addons.investor_memo ? (
        <InvestorMemoBlock data={addons.investor_memo as Record<string, unknown>} />
      ) : null}
      {isBanking && addons.capital_efficiency_metrics ? (
        <CapitalEfficiencyBlock data={addons.capital_efficiency_metrics as Record<string, unknown>} />
      ) : null}

      {isAudit && addons.risk_register ? (
        <RiskRegisterBlock data={addons.risk_register as Record<string, unknown>[]} />
      ) : null}
      {isAudit && addons.compliance_checklist ? (
        <ComplianceChecklistBlock data={addons.compliance_checklist as Record<string, unknown>[]} />
      ) : null}
      {isAudit && addons.internal_controls_framework ? (
        <InternalControlsBlock data={addons.internal_controls_framework as Record<string, unknown>[]} />
      ) : null}
    </div>
  )
}

// ─── MECE ISSUE TREE ─────────────────────────────────────────────

interface MeceNode {
  text: string
  level: 1 | 2 | 3
  children: MeceNode[]
}

const MECE_ROMAN_PREFIX = /^(I{1,3}V?|VI{0,3}|I?X)\./
const MECE_LETTER_PREFIX = /^[A-Z]\./

function getMeceLevel(text: string): 1 | 2 | 3 {
  const trimmed = text.trim()
  if (MECE_ROMAN_PREFIX.test(trimmed)) return 2
  if (MECE_LETTER_PREFIX.test(trimmed)) return 3
  return 1
}

function parseMeceTree(items: string[]): MeceNode[] {
  const roots: MeceNode[] = []
  let lastL1: MeceNode | null = null
  let lastL2: MeceNode | null = null

  for (const raw of items) {
    const text = raw.trim()
    if (!text) continue
    const level = getMeceLevel(text)
    const node: MeceNode = { text, level, children: [] }

    if (level === 1) {
      roots.push(node)
      lastL1 = node
      lastL2 = null
    } else if (level === 2) {
      if (lastL1) {
        lastL1.children.push(node)
        lastL2 = node
      } else {
        roots.push(node)
        lastL1 = node
        lastL2 = node
      }
    } else if (lastL2) {
      lastL2.children.push(node)
    } else if (lastL1) {
      lastL1.children.push(node)
    } else {
      roots.push(node)
      lastL1 = node
    }
  }

  return roots
}

function MeceTreeConnectorGroup({
  children,
  nodeGapClass,
  indentClass,
}: {
  children: ReactNode
  nodeGapClass: string
  indentClass: string
}) {
  return (
    <div className={cn('relative', indentClass)}>
      <div
        className="pointer-events-none absolute bottom-0 top-0 w-px"
        style={{ left: 0, background: 'hsl(var(--border))' }}
        aria-hidden
      />
      <div className={cn('flex flex-col', nodeGapClass)}>{children}</div>
    </div>
  )
}

function MeceTreeConnectorRow({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-5">
      <div
        className="pointer-events-none absolute top-1/2 h-px w-3 -translate-y-1/2"
        style={{ left: 0, background: 'hsl(var(--border))' }}
        aria-hidden
      />
      {children}
    </div>
  )
}

function MeceLevel3Node({ node }: { node: MeceNode }) {
  return (
    <MeceTreeConnectorRow>
      <div
        className="flex items-start gap-2.5 rounded-md border px-3 py-2"
        style={{
          borderColor: 'hsl(var(--border) / 0.5)',
          background: 'transparent',
        }}
      >
        <span
          className="mt-1.5 shrink-0 rounded-full"
          style={{
            width: 5,
            height: 5,
            border: '1.5px solid hsl(var(--muted-foreground))',
          }}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">{node.text}</p>
      </div>
    </MeceTreeConnectorRow>
  )
}

function MeceLevel2Node({ node }: { node: MeceNode }) {
  const level3 = node.children.filter((c) => c.level === 3)

  return (
    <div className="flex flex-col gap-1.5">
      <MeceTreeConnectorRow>
        <div
          className="flex items-start gap-2.5 rounded-md border px-3.5 py-2.5"
          style={{
            borderColor: 'hsl(var(--border))',
            borderLeftWidth: 2,
            borderLeftColor: 'hsl(var(--primary) / 0.3)',
            background: 'hsl(var(--card))',
          }}
        >
          <span
            className="mt-1.5 shrink-0 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: 'hsl(var(--primary) / 0.7)',
            }}
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">{node.text}</p>
        </div>
      </MeceTreeConnectorRow>
      {level3.length > 0 ? (
        <MeceTreeConnectorGroup nodeGapClass="gap-1.5" indentClass="ml-[20px] pl-5">
          {level3.map((child, i) => (
            <MeceLevel3Node key={`${child.text}-${i}`} node={child} />
          ))}
        </MeceTreeConnectorGroup>
      ) : null}
    </div>
  )
}

function MeceRootNode({ node }: { node: MeceNode }) {
  const level2 = node.children.filter((c) => c.level === 2)
  const strayLevel3 = node.children.filter((c) => c.level === 3)

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex w-full items-start gap-2.5 rounded-md border-l-[3px] px-3.5 py-3"
        style={{
          borderLeftColor: 'hsl(var(--primary))',
          background: 'hsl(var(--primary) / 0.06)',
        }}
      >
        <GitBranch
          className="mt-0.5 shrink-0"
          style={{ width: 14, height: 14, color: 'hsl(var(--primary))' }}
          strokeWidth={2}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-[15px] leading-snug text-foreground">
          {node.text}
        </p>
      </div>
      {level2.length > 0 ? (
        <MeceTreeConnectorGroup nodeGapClass="gap-2" indentClass="ml-[20px] pl-5">
          {level2.map((child, i) => (
            <MeceLevel2Node key={`${child.text}-${i}`} node={child} />
          ))}
        </MeceTreeConnectorGroup>
      ) : null}
      {strayLevel3.length > 0 ? (
        <MeceTreeConnectorGroup nodeGapClass="gap-1.5" indentClass="ml-[20px] pl-5">
          {strayLevel3.map((child, i) => (
            <MeceLevel3Node key={`${child.text}-${i}`} node={child} />
          ))}
        </MeceTreeConnectorGroup>
      ) : null}
    </div>
  )
}

function MeceIssueTreeView({ items }: { items: string[] }) {
  const roots = parseMeceTree(items)
  if (roots.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {roots.map((root, i) => (
        <MeceRootNode key={`${root.text}-${i}`} node={root} />
      ))}
    </div>
  )
}

// ─── STRATEGY ADDONS (unified sections) ──────────────────────────

const horizonConfig = [
  { key: 'h1_core' as const, label: 'H1 — Defend & Extend', icon: Shield },
  { key: 'h2_emerging' as const, label: 'H2 — Build & Grow', icon: TrendingUp },
  { key: 'h3_future' as const, label: 'H3 — Future Bets', icon: Zap },
] as const

function StrategyAddonsBlock({
  frameworks,
  porters,
  roadmap,
  formatMoney,
  styleColors,
}: {
  frameworks?: Record<string, unknown>
  porters?: Record<string, unknown>
  roadmap?: Record<string, unknown>[]
  formatMoney: (amountUSD: number) => string
  styleColors: StyleAccentColors
}) {
  const horizons = frameworks?.three_horizons as Record<string, string> | undefined
  const issueTree = frameworks?.mece_issue_tree as string[] | undefined
  const valueChain = frameworks?.value_chain_analysis as Record<string, string>[] | undefined

  const hasHorizons =
    Boolean(horizons) && horizonConfig.some((h) => Boolean(horizons![h.key]?.trim()))
  const hasMece = Boolean(issueTree?.length)
  const hasValueChain = Boolean(valueChain?.length)
  const hasPorters = Boolean(porters && portersFiveForcesHasData(porters))
  const hasRoadmap = Array.isArray(roadmap) && roadmap.length > 0

  if (!hasHorizons && !hasMece && !hasValueChain && !hasPorters && !hasRoadmap) return null

  return (
    <AnimatedBlock>
      <div className="w-full space-y-2">
          {hasHorizons ? (
            <StyleAddonAccordionItem
              value="three-horizons"
              title="3-Horizon Growth Model"
              icon={Layers}
              badge="Strategic"
              badgeVariant="blue"
              styleColors={styleColors}
            >
              <div className="grid grid-cols-1 gap-4 layout-sm:grid-cols-3">
                {horizonConfig.map((h) => {
                  const text = horizons![h.key]?.trim()
                  if (!text) return null
                  return (
                    <div className={cn(opportunityDetailCardClass, "p-5")} key={h.key}>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                          <h.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          {h.label}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium leading-relaxed text-foreground/80">{text}</p>
                    </div>
                  )
                })}
              </div>
            </StyleAddonAccordionItem>
          ) : null}

          {hasMece ? (
            <StyleAddonAccordionItem
              value="mece-issue-tree"
              title="MECE Issue Tree"
              icon={GitBranch}
              styleColors={styleColors}
            >
              <MeceIssueTreeView items={issueTree!} />
            </StyleAddonAccordionItem>
          ) : null}

          {hasPorters ? (
            <StyleAddonAccordionItem
              value="porters-five-forces"
              title="Porter's Five Forces"
              icon={Target}
              badge="Strategic"
              badgeVariant="violet"
              styleColors={styleColors}
            >
              <PortersFiveForcesContent data={porters!} />
            </StyleAddonAccordionItem>
          ) : null}

          {hasValueChain ? (
            <StyleAddonAccordionItem
              value="value-chain"
              title="Value Chain Analysis"
              icon={ArrowRight}
              styleColors={styleColors}
            >
              <div className={cn(opportunityDetailCardClass, "overflow-hidden p-0")}>
                <div className="grid grid-cols-1 gap-2 bg-muted/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground layout-sm:grid-cols-4">
                  <span>Stage</span>
                  <span>Value Created</span>
                  <span>Pain Point</span>
                  <span>Opportunity</span>
                </div>
                {valueChain!.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      'grid grid-cols-1 gap-2 border-t border-border-subtle/40 px-4 py-4 text-[12px] layout-sm:grid-cols-4 layout-sm:gap-3 transition-colors hover:bg-muted/10',
                      i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                    )}
                  >
                    <span className="font-semibold text-foreground">{row.stage}</span>
                    <span className="text-muted-foreground">{row.value_created}</span>
                    <span className="font-medium text-foreground/80">{row.pain_point}</span>
                    <span className="font-medium text-success">{row.opportunity}</span>
                  </div>
                ))}
              </div>
            </StyleAddonAccordionItem>
          ) : null}

          {hasRoadmap ? (
            <StyleAddonAccordionItem
              value="transformation-roadmap"
              title="Transformation Roadmap"
              icon={Layers}
              badge="Execution"
              badgeVariant="green"
              styleColors={styleColors}
            >
              <TransformationRoadmapContent data={roadmap!} formatMoney={formatMoney} />
            </StyleAddonAccordionItem>
          ) : null}
      </div>
    </AnimatedBlock>
  )
}

// ─── PORTER'S FIVE FORCES ─────────────────────────────────────

const porterRatingConfig: Record<
  string,
  { bar: number; color: string; bg: string; border: string; badgeVariant: 'success' | 'warning' | 'danger' }
> = {
  low: {
    bar: 33,
    color: 'hsl(var(--success))',
    bg: 'hsl(var(--success) / 0.1)',
    border: 'hsl(var(--success) / 0.25)',
    badgeVariant: 'success',
  },
  medium: {
    bar: 66,
    color: 'hsl(var(--warning))',
    bg: 'hsl(var(--warning) / 0.1)',
    border: 'hsl(var(--warning) / 0.25)',
    badgeVariant: 'warning',
  },
  high: {
    bar: 100,
    color: 'hsl(var(--destructive))',
    bg: 'hsl(var(--destructive) / 0.1)',
    border: 'hsl(var(--destructive) / 0.25)',
    badgeVariant: 'danger',
  },
}

const porterForceKeys = [
  'competitive_rivalry',
  'supplier_power',
  'buyer_power',
  'threat_of_substitutes',
  'threat_of_new_entrants',
] as const

function portersFiveForcesHasData(data: Record<string, unknown>): boolean {
  const hasForce = porterForceKeys.some((key) => {
    const f = data[key] as { rating?: string; analysis?: string } | undefined
    return Boolean(f?.rating?.trim() || f?.analysis?.trim())
  })
  return (
    hasForce ||
    Boolean(String(data.strategic_implication ?? '').trim()) ||
    Boolean(String(data.overall_attractiveness ?? '').trim())
  )
}

function PortersFiveForcesContent({ data }: { data: Record<string, unknown> }) {
  const forces = [
    { key: 'competitive_rivalry', label: 'Competitive Rivalry', icon: Users },
    { key: 'supplier_power', label: 'Supplier Power', icon: Briefcase },
    { key: 'buyer_power', label: 'Buyer Power', icon: Scale },
    { key: 'threat_of_substitutes', label: 'Threat of Substitutes', icon: ArrowRight },
    { key: 'threat_of_new_entrants', label: 'New Entrants', icon: Lock },
  ]

  const overall = String(data.overall_attractiveness ?? '').toLowerCase()
  const overallConfig = porterRatingConfig[overall]
  const activeForces = forces
    .map((force) => {
      const f = data[force.key] as { rating: string; analysis: string } | undefined
      return f ? { ...force, ...f, ratingKey: String(f.rating ?? '').toLowerCase() } : null
    })
    .filter(Boolean) as Array<{
    key: string
    label: string
    icon: RemixIcon
    rating: string
    ratingKey: string
    analysis: string
  }>

  if (activeForces.length === 0 && !data.strategic_implication && !overall) return null

  return (
    <div className="flex flex-col gap-4">
        {overall ? (
          <div className={cn(opportunityDetailCardClass, "flex flex-col gap-3 p-4 layout-sm:flex-row layout-sm:items-center layout-sm:justify-between")}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Overall market attractiveness
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Synthesis across all five forces — higher pressure lowers attractiveness.
              </p>
            </div>
            <MetricBadge variant={overallConfig?.badgeVariant ?? 'default'} size="md">
              {overall}
            </MetricBadge>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 layout-lg:grid-cols-2">
          {activeForces.map((force, i) => {
            const config =
              porterRatingConfig[force.ratingKey] ?? {
                bar: 50,
                color: 'hsl(var(--muted-foreground))',
                bg: 'hsl(var(--muted) / 0.4)',
                border: 'hsl(var(--border))',
                badgeVariant: 'default' as const,
              }
            const colors = getCompetitorColors(i)
            return (
              <div className={cn(opportunityDetailCardClass, "flex flex-col gap-3 p-4")} key={force.key} style={{ borderLeftWidth: 3, borderLeftColor: config.color }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: colors.mutedBg }}
                    >
                      <force.icon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{force.label}</span>
                  </div>
                  <MetricBadge variant={config.badgeVariant}>{force.rating}</MetricBadge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Intensity</span>
                    <span style={{ color: config.color }}>{force.rating}</span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: 'hsl(var(--muted) / 0.5)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${config.bar}%`, background: config.color }}
                    />
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{force.analysis}</p>
              </div>
            )
          })}
        </div>

        {data.strategic_implication ? (
          <div className={cn(opportunityDetailCardClass, "relative overflow-hidden p-5")} style={{
              borderColor: 'hsl(var(--primary) / 0.25)',
              background: 'hsl(var(--primary) / 0.04)',
            }}>
            <div
              className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
              style={{ background: 'hsl(var(--primary))' }}
            />
            <div className="pl-4">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
                Strategic Implication
              </p>
              <p className="text-[13px] font-medium leading-relaxed text-foreground/80">
                {data.strategic_implication as string}
              </p>
            </div>
          </div>
        ) : null}
    </div>
  )
}

// ─── TRANSFORMATION ROADMAP ─────────────────────────────────────

function TransformationRoadmapContent({
  data,
  formatMoney,
}: {
  data: Record<string, unknown>[]
  formatMoney: (amountUSD: number) => string
}) {
  const phaseColors = [
    { hue: 227, icon: Target },
    { hue: 262, icon: TrendingUp },
    { hue: 152, icon: CheckCircle2 },
  ]

  return (
    <div className="relative flex flex-col gap-5">
        <div
          className="absolute left-[23px] top-6 hidden h-[calc(100%-3rem)] w-[2px] bg-primary/15 layout-sm:block"
          aria-hidden
        />

        {data.map((phase, i) => {
          const colors = getCompetitorColors(i)
          const PhaseIcon = phaseColors[i % phaseColors.length].icon
          return (
            <div key={i} className="relative flex gap-4">
              <div className="relative z-10 mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: colors.mutedBg }}
                >
                  <PhaseIcon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2.5} />
                </div>
              </div>

              <div className={cn(opportunityDetailCardClass, "min-w-0 flex-1 p-5")} style={{
                  borderColor: colors.border,
                  background: `hsla(${colors.hue}, 85%, 58%, 0.03)`,
                }}>
                <div className="mb-4 flex flex-col gap-2 layout-sm:flex-row layout-sm:items-start layout-sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-foreground">{phase.phase as string}</p>
                    <p className="text-[11px] font-medium text-muted-foreground">{phase.theme as string}</p>
                  </div>
                  {phase.investment_usd != null && typeof phase.investment_usd === 'number' ? (
                    <span className="w-fit shrink-0 rounded-lg border-0 bg-muted/50 px-3 py-1 text-[12px] font-bold tabular-nums text-foreground">
                      {formatMoney(phase.investment_usd)}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 layout-sm:grid-cols-2">
                  {Array.isArray(phase.initiatives) && phase.initiatives.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Initiatives
                      </p>
                      <ul className="flex flex-col gap-2">
                        {(phase.initiatives as string[]).map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-[12px] text-foreground/80">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {Array.isArray(phase.kpis) && phase.kpis.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        KPIs
                      </p>
                      <ul className="flex flex-col gap-2">
                        {(phase.kpis as string[]).map((kpi, j) => (
                          <li key={j} className="flex items-start gap-2 text-[12px] text-success">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
                            {kpi}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ─── VALUATION MODEL ────────────────────────────────────────────

function ValuationModelBlock({
  data,
  formatMoney,
}: {
  data: Record<string, unknown>
  formatMoney: (amountUSD: number) => string
}) {
  const dcf = data.dcf as Record<string, number> | undefined
  const scenarios = data.scenarios as Record<string, Record<string, unknown>> | undefined
  const comparables = data.comparables as Record<string, unknown>[] | undefined

  return (
    <div className="flex flex-col gap-8">
      <AnimatedBlock delay={0}>
        <GlassCard glow index={5}>
          <div className="p-6">
            <SectionHeader icon={BarChart3} title="Valuation Model" badge="Banking" badgeVariant="amber" />

            {dcf ? (
              <div className="mb-8">
                <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  DCF Analysis
                </p>
                <div className="grid grid-cols-2 gap-3 layout-sm:grid-cols-4">
                  {[
                    { label: 'WACC', value: dcf.wacc_pct != null ? `${dcf.wacc_pct}%` : '—', icon: Percent },
                    {
                      label: 'Terminal Growth',
                      value: dcf.terminal_growth_rate_pct != null ? `${dcf.terminal_growth_rate_pct}%` : '—',
                      icon: TrendingUp,
                    },
                    {
                      label: 'Implied Valuation',
                      value:
                        dcf.implied_valuation_usd != null ? formatMoney(dcf.implied_valuation_usd) : '—',
                      icon: DollarSign,
                    },
                    {
                      label: 'Year 5 FCF',
                      value: dcf.year5_fcf_usd != null ? formatMoney(dcf.year5_fcf_usd) : '—',
                      icon: Clock,
                    },
                  ].map((stat, i) => {
                    const colors = getCompetitorColors(i)
                    return (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                        style={{
                          borderColor: colors.border,
                          background: `hsla(${colors.hue}, 85%, 58%, 0.03)`,
                        }}
                      >
                        <div
                          className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: colors.mutedBg }}
                        >
                          <stat.icon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-[18px] font-bold tabular-nums text-foreground">{stat.value}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {scenarios ? (
              <div className="mb-8">
                <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Scenario Analysis
                </p>
                <div className="grid grid-cols-1 gap-4 layout-sm:grid-cols-3">
                  {[
                    { key: 'bear', label: 'Bear Case', paletteIndex: 5, icon: AlertTriangle },
                    { key: 'base', label: 'Base Case', paletteIndex: 0, icon: Target },
                    { key: 'bull', label: 'Bull Case', paletteIndex: 2, icon: TrendingUp },
                  ].map((sc) => {
                    const s = scenarios[sc.key] as Record<string, unknown> | undefined
                    if (!s) return null
                    const colors = getCompetitorColors(sc.paletteIndex)
                    const valUsd = s.valuation_usd as number | undefined
                    const margin = s.ebitda_margin_pct as number | string | undefined
                    return (
                      <div
                        key={sc.key}
                        className="rounded-xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        style={{
                          borderColor: colors.border,
                          background: `hsla(${colors.hue}, 85%, 58%, 0.04)`,
                        }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ background: colors.mutedBg }}
                          >
                            <sc.icon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2.5} />
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-foreground">
                            {sc.label}
                          </p>
                        </div>
                        <p className="text-[20px] font-bold tabular-nums text-foreground">
                          {valUsd != null ? formatMoney(valUsd) : '—'}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {margin != null ? `${margin}% EBITDA margin` : ''}
                        </p>
                        {s.key_assumption ? (
                          <p className="mt-3 text-[11px] text-muted-foreground/70 border-t border-border-subtle/40 pt-3">
                            {String(s.key_assumption)}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {comparables && comparables.length > 0 ? (
              <div>
                <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Comparable Companies
                </p>
                <div className="overflow-hidden rounded-xl border-0">
                  <div className="grid grid-cols-1 gap-2 bg-muted/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground layout-sm:grid-cols-4">
                    <span>Company</span>
                    <span>EV/Revenue</span>
                    <span>EV/EBITDA</span>
                    <span>Implied Value</span>
                  </div>
                  {comparables.map((c, i) => {
                    const colors = getCompetitorColors(i)
                    return (
                      <div
                        key={i}
                        className={cn(
                          'grid grid-cols-1 gap-2 border-t border-border-subtle/40 px-4 py-3 text-[12px] layout-sm:grid-cols-4 layout-sm:gap-3 transition-colors hover:bg-muted/10',
                          i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                        )}
                      >
                        <span className="flex items-center gap-2 font-semibold text-foreground">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: colors.solid }} />
                          {c.company as string}
                        </span>
                        <span className="text-muted-foreground">
                          {c.ev_revenue_multiple != null ? `${c.ev_revenue_multiple}x` : '—'}
                        </span>
                        <span className="text-muted-foreground">
                          {c.ev_ebitda_multiple != null ? `${c.ev_ebitda_multiple}x` : '—'}
                        </span>
                        <span className="font-bold tabular-nums text-foreground">
                          {typeof c.implied_value_usd === 'number' ? formatMoney(c.implied_value_usd) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </GlassCard>
      </AnimatedBlock>
    </div>
  )
}

// ─── INVESTOR MEMO ──────────────────────────────────────────────

function InvestorMemoBlock({ data }: { data: Record<string, unknown> }) {
  const risks = data.key_risks as Record<string, string>[] | undefined
  const exits = data.exit_options as Record<string, string>[] | undefined

  return (
    <AnimatedBlock>
      <GlassCard glow index={6}>
        <div className="p-6">
          <SectionHeader icon={FileText} title="Investor Memo" badge="Banking" badgeVariant="amber" />

          <div className="flex flex-col gap-4">
            {data.investment_thesis ? (
              <div className="relative overflow-hidden rounded-xl border-0 bg-primary/[0.04] p-5">
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary" />
                <div className="pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" strokeWidth={2.5} />
                    <p className="text-[11px] font-black uppercase tracking-wider text-primary">Investment Thesis</p>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-foreground/80">
                    {data.investment_thesis as string}
                  </p>
                </div>
              </div>
            ) : null}

            {data.why_now ? (
              <div className="rounded-xl border-0 bg-muted/20 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" strokeWidth={2.5} />
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Why Now</p>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/80">{data.why_now as string}</p>
              </div>
            ) : null}

            {risks && risks.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" strokeWidth={2.5} />
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key Risks</p>
                </div>
                <div className="flex flex-col gap-3">
                  {risks.map((r, i) => {
                    const colors = getCompetitorColors(i)
                    const riskConfig: Record<string, { bg: string; text: string; border: string }> = {
                      low: { bg: 'bg-success-bg0/[0.08]', text: 'text-success dark:text-success', border: 'border-success/20' },
                      medium: { bg: 'bg-warning-bg0/[0.08]', text: 'text-warning dark:text-saffron-400', border: 'border-warning/20' },
                      high: { bg: 'bg-rose-500/[0.08]', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/20' },
                    }
                    const cfg = riskConfig[r.probability] ?? { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border-subtle' }
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
                          cfg.bg,
                          cfg.border,
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border',
                            cfg.bg,
                            cfg.text,
                            cfg.border,
                          )}
                        >
                          {r.probability}
                        </span>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{r.risk}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{r.mitigation}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {exits && exits.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" strokeWidth={2.5} />
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Exit Options</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {exits.map((e, i) => {
                    const colors = getCompetitorColors(i)
                    return (
                      <div
                        key={i}
                        className="rounded-xl border px-4 py-3 text-[12px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                        style={{
                          borderColor: colors.border,
                          background: `hsla(${colors.hue}, 85%, 58%, 0.04)`,
                        }}
                      >
                        <span className="font-bold text-foreground">{e.type}</span>
                        <span className="text-muted-foreground"> · {e.timeline}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>
    </AnimatedBlock>
  )
}

// ─── CAPITAL EFFICIENCY ─────────────────────────────────────────

function CapitalEfficiencyBlock({ data }: { data: Record<string, unknown> }) {
  const metrics = [
    { key: 'irr_est_pct', label: 'IRR', fmt: (v: number) => `${v}%`, icon: TrendingUp },
    { key: 'moic_est', label: 'MOIC', fmt: (v: number) => `${v}x`, icon: BarChart3 },
    { key: 'payback_months', label: 'Payback', fmt: (v: number) => `${v} mo`, icon: Clock },
    { key: 'gross_margin_pct', label: 'Gross Margin', fmt: (v: number) => `${v}%`, icon: PieChart },
    { key: 'ltv_cac_ratio', label: 'LTV/CAC', fmt: (v: number) => `${v}x`, icon: Users },
    { key: 'burn_multiple', label: 'Burn Multiple', fmt: (v: number) => `${v}x`, icon: Zap },
  ] as const

  return (
    <AnimatedBlock>
      <GlassCard glow index={7}>
        <div className="p-6">
          <SectionHeader icon={DollarSign} title="Capital Efficiency Metrics" badge="Banking" badgeVariant="amber" />
          <div className="grid grid-cols-2 gap-3 layout-sm:grid-cols-3 layout-sm:grid-cols-6">
            {metrics.map((m, i) => {
              const val = data[m.key] as number | undefined
              const colors = getCompetitorColors(i)
              return (
                <div
                  key={m.key}
                  className="flex flex-col items-center rounded-xl border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    borderColor: colors.border,
                    background: `hsla(${colors.hue}, 85%, 58%, 0.03)`,
                  }}
                >
                  <div
                    className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: colors.mutedBg }}
                  >
                    <m.icon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-[18px] font-bold tabular-nums text-foreground">
                    {val != null ? m.fmt(val) : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </GlassCard>
    </AnimatedBlock>
  )
}

// ─── RISK REGISTER ──────────────────────────────────────────────

function RiskRegisterBlock({ data }: { data: Record<string, unknown>[] }) {
  const scoreConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; color: string; bg: string }> = {
    low: { variant: 'success', color: 'hsl(152, 56%, 40%)', bg: 'hsla(152, 70%, 95%, 0.6)' },
    medium: { variant: 'warning', color: 'hsl(32, 92%, 48%)', bg: 'hsla(32, 92%, 95%, 0.6)' },
    high: { variant: 'danger', color: 'hsl(340, 75%, 52%)', bg: 'hsla(340, 75%, 95%, 0.6)' },
    critical: { variant: 'default', color: 'hsl(0, 84%, 60%)', bg: 'hsla(0, 84%, 95%, 0.6)' },
  }

  return (
    <AnimatedBlock>
      <GlassCard glow index={0}>
        <div className="p-6">
          <SectionHeader icon={AlertTriangle} title="Risk Register" badge="Audit" badgeVariant="red" />
          <div className="flex flex-col gap-4">
            {data.map((r, i) => {
              const colors = getCompetitorColors(i)
              const cfg = scoreConfig[String(r.risk_score)] ?? { variant: 'default', color: 'hsl(220, 10%, 60%)', bg: 'hsla(220, 10%, 95%, 0.6)' }
              return (
                <div
                  key={i}
                  className="rounded-xl border-0 bg-muted/20 p-5 transition-all duration-200 hover:bg-muted/30"
                >
                  <div className="mb-3 flex flex-col gap-2 layout-sm:flex-row layout-sm:items-start layout-sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{r.risk_id as string}</span>
                      <span className="rounded-full border border-border-subtle/60 bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {r.category as string}
                      </span>
                    </div>
                    <span
                      className="w-fit rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        borderColor: `${cfg.color}30`,
                      }}
                    >
                      {r.risk_score as string}
                    </span>
                  </div>
                  <p className="mb-3 text-[13px] font-medium text-foreground">{r.description as string}</p>
                  <div className="grid grid-cols-1 gap-2 text-[12px] layout-sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground/70">Controls: </span>
                        {r.controls_in_place as string}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground/70">Remediation: </span>
                        {r.remediation as string}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </GlassCard>
    </AnimatedBlock>
  )
}

// ─── COMPLIANCE CHECKLIST ───────────────────────────────────────

function ComplianceChecklistBlock({ data }: { data: Record<string, unknown>[] }) {
  const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    required_before_launch: {
      bg: 'bg-rose-500/[0.08]',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/20',
      label: 'Before Launch',
    },
    required_within_90_days: {
      bg: 'bg-warning-bg0/[0.08]',
      text: 'text-warning dark:text-saffron-400',
      border: 'border-warning/20',
      label: 'Within 90 Days',
    },
    ongoing: {
      bg: 'bg-blue-500/[0.08]',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500/20',
      label: 'Ongoing',
    },
  }

  return (
    <AnimatedBlock>
      <GlassCard glow index={1}>
        <div className="p-6">
          <SectionHeader icon={CheckCircle2} title="Compliance Checklist" badge="Audit" badgeVariant="blue" />
          <div className="flex flex-col gap-3">
            {data.map((item, i) => {
              const colors = getCompetitorColors(i)
              const cfg = statusConfig[String(item.status_at_launch)] ?? {
                bg: 'bg-muted',
                text: 'text-muted-foreground',
                border: 'border-border-subtle',
                label: String(item.status_at_launch),
              }
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border-0 bg-muted/20 p-4 transition-all duration-200 hover:bg-muted/30"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: colors.mutedBg }}
                  >
                    <span className="text-[11px] font-black" style={{ color: colors.text }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{item.area as string}</span>
                      <span className={cn('rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{item.requirement as string}</p>
                    {item.action_required ? (
                      <p className="mt-2 text-[11px] font-medium text-primary">{item.action_required as string}</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </GlassCard>
    </AnimatedBlock>
  )
}

// ─── INTERNAL CONTROLS ──────────────────────────────────────────

function InternalControlsBlock({ data }: { data: Record<string, unknown>[] }) {
  return (
    <AnimatedBlock>
      <GlassCard glow index={2}>
        <div className="p-6">
          <SectionHeader icon={Lock} title="Internal Controls Framework" badge="Audit" badgeVariant="blue" />
          <div className="overflow-hidden rounded-xl border-0">
            <div className="grid grid-cols-1 gap-2 bg-muted/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground layout-sm:grid-cols-3">
              <span>Process</span>
              <span>Control</span>
              <span>Frequency / Owner</span>
            </div>
            {data.map((c, i) => {
              const colors = getCompetitorColors(i)
              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-1 gap-2 border-t border-border-subtle/40 px-4 py-4 text-[12px] layout-sm:grid-cols-3 layout-sm:gap-3 transition-colors hover:bg-muted/10',
                    i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: colors.solid }} />
                    {c.process as string}
                  </span>
                  <span className="text-muted-foreground">{c.control as string}</span>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground/70">{c.frequency as string}</span>
                    {' · '}
                    {c.owner as string}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </GlassCard>
    </AnimatedBlock>
  )
}
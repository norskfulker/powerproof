import type { ElementType } from 'react'
import {
  AlertTriangle,
  Banknote,
  Check,
  Clock,
  Crosshair,
  HelpCircle,
  MessageCircle,
  Rocket,
  Shield,
  Skull,
  Swords,
  Target,
  Zap,
} from '@/lib/icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import type { UserPlaybook, PlaybookStep } from '@/lib/playbookTypes'
import { PLAYBOOK_PHASES, canonicalPlaybookPhase } from '@/lib/normalizePlaybookSteps'
import { useCurrency } from '@/hooks/useCurrency'

import {
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

const PHASE_CONFIG = {
  CAPTURE: {
    icon: Crosshair,
    hue: 210,
    label: 'Capture',
    description: 'Win first customers and prove demand',
  },
  DOMINATE: {
    icon: Swords,
    hue: 270,
    label: 'Dominate',
    description: 'Outmaneuver competitors in your lane',
  },
  FORTIFY: {
    icon: Shield,
    hue: 28,
    label: 'Fortify',
    description: 'Lock in moats and operational strength',
  },
  SCALE: {
    icon: Rocket,
    hue: 350,
    label: 'Scale',
    description: 'Expand reach without losing edge',
  },
} as const

function phaseColors(hue: number) {
  return {
    mutedBg: `hsla(${hue}, 70%, 95%, 0.65)`,
    text: `hsl(${hue}, 78%, 42%)`,
    border: `hsla(${hue}, 60%, 55%, 0.25)`,
    gradient: `hsla(${hue}, 85%, 58%, 0.08)`,
  }
}

function sprintObjectWeeks(sprint: UserPlaybook['thirty_day_sprint']) {
  if (!sprint || typeof sprint !== 'object' || Array.isArray(sprint)) return []
  const entries = [
    { label: 'Week 1', value: sprint.week_1 },
    { label: 'Week 2', value: sprint.week_2 },
    { label: 'Week 3', value: sprint.week_3 },
    { label: 'Week 4', value: sprint.week_4 },
  ]
  return entries.filter((item) => String(item.value ?? '').trim().length > 0)
}

function StepMetaTile({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border-subtle/50 bg-muted/20 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground/60" strokeWidth={2.5} aria-hidden />
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-sans text-[12px] font-medium leading-snug text-foreground">{children}</div>
    </div>
  )
}

function PlaybookStepCard({
  step,
  phase,
  onToggle,
}: {
  step: PlaybookStep
  phase: keyof typeof PHASE_CONFIG
  onToggle: () => void
}) {
  const { formatMoney } = useCurrency()
  const cfg = PHASE_CONFIG[phase]
  const colors = phaseColors(cfg.hue)
  const costDisplay =
    step.cost_estimate_usd != null
      ? formatMoney(step.cost_estimate_usd)
      : step.cost_estimate?.trim()
        ? step.cost_estimate
        : null

  return (
    <div
      id={`wr-step-${step.step_order}`}
      className={cn(
        opportunityDetailCardClass,
        'scroll-mt-28 overflow-hidden transition-all duration-200',
        step.is_checked && 'opacity-70',
      )}
      style={{ borderColor: step.is_checked ? undefined : colors.border }}
    >
      <div
        className="p-4 sm:p-5"
        style={
          step.is_checked
            ? undefined
            : { backgroundImage: `linear-gradient(135deg, transparent 0%, ${colors.gradient} 100%)` }
        }
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={step.is_checked ? 'Mark move incomplete' : 'Mark move complete'}
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
              step.is_checked
                ? 'border-success/40 bg-success/15 text-success'
                : 'border-border-subtle bg-background hover:border-primary/40',
            )}
          >
            {step.is_checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {step.war_move_name ? (
                <span
                  className="inline-flex rounded-lg px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: colors.mutedBg, color: colors.text }}
                >
                  {step.war_move_name}
                </span>
              ) : null}
              <span className="font-mono text-[10px] text-muted-foreground">#{step.step_order}</span>
            </div>

            <h4
              className={cn(
                'mt-1.5 font-sans text-[15px] font-bold leading-snug',
                step.is_checked ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            >
              {step.title}
            </h4>

            {step.the_move ? (
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-foreground/90">{step.the_move}</p>
            ) : null}

            {(step.why_it_works || step.weapon || step.kill_metric || costDisplay || step.timeline) ? (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {step.why_it_works ? (
                  <div className="sm:col-span-2">
                    <StepMetaTile icon={Zap} label="Why it works">
                      {step.why_it_works}
                    </StepMetaTile>
                  </div>
                ) : null}
                {step.weapon ? (
                  <StepMetaTile icon={Target} label="Weapon">
                    {step.weapon}
                  </StepMetaTile>
                ) : null}
                {step.kill_metric ? (
                  <StepMetaTile icon={Crosshair} label="Kill metric">
                    {step.kill_metric}
                  </StepMetaTile>
                ) : null}
                {costDisplay ? (
                  <StepMetaTile icon={Banknote} label="Cost">
                    {costDisplay}
                  </StepMetaTile>
                ) : null}
                {step.timeline ? (
                  <StepMetaTile icon={Clock} label="Timeline">
                    {step.timeline}
                  </StepMetaTile>
                ) : null}
              </div>
            ) : null}

            {step.red_flag ? (
              <div className="mt-3 rounded-xl border border-warning/20 bg-gradient-to-br from-warning/[0.06] to-transparent px-3.5 py-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" strokeWidth={2.5} aria-hidden />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-warning">
                    Watch out
                  </span>
                </div>
                <p className="font-sans text-[12px] leading-relaxed text-foreground/85">{step.red_flag}</p>
              </div>
            ) : null}
            {step.assumption_flagged?.trim() ? (
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.25} aria-hidden />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Assumption to verify
                  </span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                  {step.assumption_flagged}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  playbook: UserPlaybook
  onToggleStep: (stepOrder: number, checked: boolean) => void
  isMobile?: boolean
}

export function PlaybookDisplay({ playbook, onToggleStep, isMobile = false }: Props) {
  const sprint = playbook.thirty_day_sprint
  const sprintWeeks = sprintObjectWeeks(sprint)
  const isSprintString = typeof sprint === 'string' && sprint.trim().length > 0
  const hasSprintContent = sprintWeeks.length > 0 || isSprintString
  const stepsByPhase = PLAYBOOK_PHASES.map((phase) => ({
    phase,
    steps: playbook.steps.filter((s) => canonicalPlaybookPhase(s) === phase),
  })).filter((p) => p.steps.length > 0)

  const firstPhase = stepsByPhase[0]?.phase
  const defaultOpen = [
    firstPhase ? `phase-${firstPhase}` : null,
    hasSprintContent ? 'sprint' : null,
  ].filter(Boolean) as string[]

  const completedInPhase = (phase: keyof typeof PHASE_CONFIG) =>
    playbook.steps.filter((s) => canonicalPlaybookPhase(s) === phase && s.is_checked).length

  return (
    <div className={cn('min-w-0 w-full', 'flex flex-col gap-4')}>
      {playbook.edge_declaration?.trim() ? (
        <div className={cn(opportunityDetailCardClass, "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent")}>
          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Swords className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
                Edge declaration
              </span>
            </div>
            <p className="font-sans text-[15px] font-semibold leading-relaxed text-foreground">
              {playbook.edge_declaration}
            </p>
          </div>
        </div>
      ) : null}

      {playbook.founder_honest_take?.trim() ? (
        <div
          id="wr-founder-honest-take"
          className={cn(
            opportunityDetailCardClass,
            'scroll-mt-28 overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/[0.1] to-transparent',
          )}
        >
          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <MessageCircle className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Your Co-Founder's Honest Take
              </span>
            </div>
            <p className="font-sans text-[14px] font-medium leading-relaxed text-foreground/90">
              {playbook.founder_honest_take}
            </p>
          </div>
        </div>
      ) : null}

      {playbook.steps.length === 0 ? (
        <div className={cn(opportunityDetailCardClass, "px-4 py-10 text-center")}>
          <p className="font-sans text-[13px] text-muted-foreground">
            No playbook steps found. Try generating again.
          </p>
        </div>
      ) : (
        <div id="wr-steps" className="scroll-mt-28">
        <Accordion
          type="multiple"
          defaultValue={defaultOpen}
          className="w-full space-y-2 rounded-none border-0 bg-transparent p-0 shadow-none"
        >
          {stepsByPhase.map(({ phase, steps }) => {
            const cfg = PHASE_CONFIG[phase]
            const Icon = cfg.icon
            const colors = phaseColors(cfg.hue)
            const done = completedInPhase(phase)

            return (
              <AccordionItem key={phase} value={`phase-${phase}`}>
                <AccordionTrigger className="items-center hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                      style={{ background: colors.mutedBg }}
                    >
                      <Icon className="h-4 w-4" style={{ color: colors.text }} strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="font-sans text-sm font-bold uppercase tracking-wider text-foreground/90">
                        {cfg.label}
                      </span>
                      <span className="mt-0.5 block font-sans text-[11px] font-medium text-muted-foreground">
                        {cfg.description} · {done}/{steps.length} done
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {steps.map((step) => (
                      <PlaybookStepCard
                        key={step.step_order}
                        step={step}
                        phase={phase}
                        onToggle={() => onToggleStep(step.step_order, !step.is_checked)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}

          {hasSprintContent ? (
            <AccordionItem value="sprint" id="wr-thirty-day-sprint" className="scroll-mt-28">
              <AccordionTrigger className="items-center hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground shadow-sm">
                    <Zap className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="font-sans text-sm font-bold uppercase tracking-wider text-foreground/90">
                      30-day sprint
                    </span>
                    <span className="mt-0.5 block font-sans text-[11px] font-medium text-muted-foreground">
                      Your opening offensive
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {sprintWeeks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sprintWeeks.map((week) => (
                      <div
                        key={week.label}
                        className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent p-4"
                      >
                        <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
                          {week.label}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">
                          {week.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border-subtle/50 bg-muted/15 p-4">
                    <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">
                      {sprint}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {playbook.red_flags && playbook.red_flags.length > 0 ? (
            <AccordionItem value="red-flags" id="wr-red-flags" className="scroll-mt-28">
              <AccordionTrigger className="items-center hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive shadow-sm">
                    <Skull className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="font-sans text-sm font-bold uppercase tracking-wider text-destructive">
                      Plan killers
                    </span>
                    <span className="mt-0.5 block font-sans text-[11px] font-medium text-muted-foreground">
                      {playbook.red_flags.length} critical risk{playbook.red_flags.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {playbook.red_flags.map((rf, i) => (
                    <div
                      key={`${rf.flag}-${i}`}
                      className="rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/[0.06] to-transparent p-4"
                    >
                      <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-destructive">
                        {rf.flag}
                      </p>
                      <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-foreground/85">{rf.detail}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
        </div>
      )}
    </div>
  )
}

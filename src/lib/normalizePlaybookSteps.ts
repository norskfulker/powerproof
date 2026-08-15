import type { ClarifyStatePersisted } from '@/types/clarifyState'
import { parseClarifyState } from '@/types/clarifyState'
import type {
  PlaybookPhaseName,
  PlaybookRedFlag,
  PlaybookStep,
  ThirtyDaySprintObject,
  UserPlaybook,
} from '@/lib/playbookTypes'

export const PLAYBOOK_PHASES = ['CAPTURE', 'DOMINATE', 'FORTIFY', 'SCALE'] as const
export type PlaybookPhase = (typeof PLAYBOOK_PHASES)[number]

const LEGACY_PHASE_MAP: Record<string, PlaybookPhase> = {
  Intelligence: 'CAPTURE',
  Positioning: 'DOMINATE',
  Execution: 'FORTIFY',
  Domination: 'SCALE',
}

function normalizeRedFlags(raw: unknown): PlaybookRedFlag[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const flag = String(o.flag ?? '').trim()
      const detail = String(o.detail ?? '').trim()
      if (!flag && !detail) return null
      return { flag, detail }
    })
    .filter((x): x is PlaybookRedFlag => x !== null)
}

/** Map Gemini / legacy phase labels → CAPTURE | DOMINATE | FORTIFY | SCALE. */
export function canonicalPlaybookPhase(step: {
  phase?: string
  phase_number?: number
  step_order?: number
}): PlaybookPhase {
  const raw = String(step.phase ?? '').trim()
  const upper = raw.toUpperCase()
  if (PLAYBOOK_PHASES.includes(upper as PlaybookPhase)) return upper as PlaybookPhase
  if (LEGACY_PHASE_MAP[raw]) return LEGACY_PHASE_MAP[raw]

  const n = Number(step.phase_number ?? step.step_order ?? 1)
  if (n <= 3) return 'CAPTURE'
  if (n <= 6) return 'DOMINATE'
  if (n <= 9) return 'FORTIFY'
  return 'SCALE'
}

export function normalizePlaybookStep(raw: Record<string, unknown>): PlaybookStep {
  const stepOrder = Number(raw.step_order ?? 0)
  const base = {
    step_order: stepOrder,
    war_move_name: String(raw.war_move_name ?? '').trim(),
    phase_number: Number(raw.phase_number ?? Math.ceil(stepOrder / 3)) || 1,
    title: String(raw.title ?? ''),
    the_move: String(raw.the_move ?? raw.description ?? ''),
    why_it_works: String(raw.why_it_works ?? raw.the_reason ?? ''),
    weapon: String(raw.weapon ?? raw.competitor_kill ?? ''),
    kill_metric: String(raw.kill_metric ?? raw.success_metric ?? ''),
    timeline: String(raw.timeline ?? ''),
    cost_estimate:
      raw.cost_estimate != null && String(raw.cost_estimate).trim()
        ? String(raw.cost_estimate)
        : raw.cost != null && String(raw.cost).trim()
          ? String(raw.cost)
          : null,
    cost_estimate_usd: (() => {
      const v = raw.cost_estimate_usd
      if (v == null || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    })(),
    red_flag: String(raw.red_flag ?? ''),
    assumption_flagged:
      raw.assumption_flagged != null && String(raw.assumption_flagged).trim()
        ? String(raw.assumption_flagged).trim()
        : null,
    is_checked: Boolean(raw.is_checked),
  }
  const phase = canonicalPlaybookPhase({ ...base, phase: String(raw.phase ?? '') })
  return { ...base, phase }
}

function normalizeThirtyDaySprint(raw: unknown): string | ThirtyDaySprintObject | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const text = raw.trim()
    return text ? text : null
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const source = raw as Record<string, unknown>
    const sprint: ThirtyDaySprintObject = {
      week_1: source.week_1 != null ? String(source.week_1).trim() : null,
      week_2: source.week_2 != null ? String(source.week_2).trim() : null,
      week_3: source.week_3 != null ? String(source.week_3).trim() : null,
      week_4: source.week_4 != null ? String(source.week_4).trim() : null,
    }
    if (!sprint.week_1 && !sprint.week_2 && !sprint.week_3 && !sprint.week_4) return null
    return sprint
  }
  return null
}

export function normalizePlaybookSteps(raw: unknown): PlaybookStep[] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'steps' in raw) {
    return normalizePlaybookSteps((raw as { steps: unknown }).steps)
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) =>
      normalizePlaybookStep(item && typeof item === 'object' ? (item as Record<string, unknown>) : {}),
    )
    .filter((s) => s.step_order > 0)
    .sort((a, b) => a.step_order - b.step_order)
}

export function normalizeUserPlaybook(raw: Record<string, unknown>): UserPlaybook {
  const steps = normalizePlaybookSteps(raw.steps)
  return {
    id: String(raw.id ?? ''),
    project_id: String(raw.project_id ?? ''),
    business_name: String(raw.business_name ?? raw.project_name ?? ''),
    business_description:
      raw.business_description != null ? String(raw.business_description) : null,
    business_type: raw.business_type != null ? String(raw.business_type) : null,
    country: raw.country != null ? String(raw.country) : null,
    model_used: raw.model_used != null ? String(raw.model_used) : null,
    city: raw.city != null ? String(raw.city) : null,
    industry: raw.industry != null ? String(raw.industry) : null,
    context_answers:
      raw.context_answers && typeof raw.context_answers === 'object'
        ? (raw.context_answers as Record<string, unknown>)
        : {},
    steps,
    generation_status: (raw.generation_status as UserPlaybook['generation_status']) ?? 'complete',
    credits_used: Number(raw.credits_used ?? 0),
    steps_checked: Number(raw.steps_checked ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    edge_declaration: raw.edge_declaration != null ? String(raw.edge_declaration) : null,
    founder_honest_take:
      raw.founder_honest_take != null ? String(raw.founder_honest_take).trim() : null,
    thirty_day_sprint: normalizeThirtyDaySprint(raw.thirty_day_sprint),
    red_flags: normalizeRedFlags(raw.red_flags),
    step_count: raw.step_count != null ? Number(raw.step_count) : steps.length,
    clarify_state: parseClarifyState(raw.clarify_state),
  }
}

export function userPlaybookFromGenerateDone(
  ev: Record<string, unknown>,
  fallback: {
    business_name?: string
    business_description?: string
    country?: string
    model_used?: string
  },
): UserPlaybook {
  const steps = normalizePlaybookSteps(ev.steps)
  return normalizeUserPlaybook({
    id: ev.id,
    project_id: ev.project_id ?? null,
    business_name: fallback.business_name ?? 'War Room Playbook',
    business_description: ev.business_description ?? fallback.business_description ?? null,
    country: ev.country ?? fallback.country ?? null,
    model_used: ev.model_used ?? ev.model ?? fallback.model_used ?? null,
    steps,
    generation_status: 'complete',
    credits_used: ev.credits_used ?? 0,
    steps_checked: 0,
    created_at: new Date().toISOString(),
    edge_declaration: ev.edge_declaration,
    founder_honest_take: ev.founder_honest_take,
    thirty_day_sprint: ev.thirty_day_sprint,
    red_flags: ev.red_flags,
    step_count: steps.length,
    context_answers: {},
  })
}

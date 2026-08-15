export type AIModelId = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'

/** User-facing model names (no provider branding). */
export const POWERPROOF_AI_MODEL_LABELS: Record<AIModelId, string> = {
  'gemini-2.5-flash-lite': 'Lite AI',
  'gemini-2.5-flash': 'Quick AI',
  'gemini-2.5-pro': 'AI PRO',
}

export const AI_MODELS = [
  {
    id: 'gemini-2.5-flash-lite',
    label: POWERPROOF_AI_MODEL_LABELS['gemini-2.5-flash-lite'],
    description: 'Fast & affordable',
    credits_multiplier: 1,
    badge: null,
  },
  {
    id: 'gemini-2.5-flash',
    label: POWERPROOF_AI_MODEL_LABELS['gemini-2.5-flash'],
    description: 'Balanced power',
    credits_multiplier: 2,
    badge: null,
  },
  {
    id: 'gemini-2.5-pro',
    label: POWERPROOF_AI_MODEL_LABELS['gemini-2.5-pro'],
    description: 'Most powerful',
    credits_multiplier: 4,
    badge: '✦ Best',
  },
] as const

/** Discover hero / composer footer — user-facing model names (not provider names). */
export const POWERPROOF_COMPOSER_MODEL_LABELS: Record<AIModelId, string> = {
  ...POWERPROOF_AI_MODEL_LABELS,
}

/** @deprecated Retired model ids — mapped on read for existing profiles. */
const LEGACY_AI_MODEL_IDS: Record<string, AIModelId> = {
  'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-2.0-flash': 'gemini-2.5-flash',
}

export const DEFAULT_AI_MODEL_ID: AIModelId = 'gemini-2.5-flash-lite'

/** Values accepted by `profiles.preferred_ai_model` (DB check constraint). */
export const PREFERRED_AI_MODEL_VALUES = AI_MODELS.map((m) => m.id) as AIModelId[]

/** War Room / playbook generation base cost (before model multiplier). */
export const PLAYBOOK_BASE_CREDIT_COST = 5

const MODEL_BY_ID = Object.fromEntries(AI_MODELS.map((m) => [m.id, m])) as Record<
  AIModelId,
  (typeof AI_MODELS)[number]
>

export function isValidAiModelId(value: unknown): value is AIModelId {
  return typeof value === 'string' && value in MODEL_BY_ID
}

export function resolveAiModelId(value: unknown): AIModelId {
  if (isValidAiModelId(value)) return value
  if (typeof value === 'string' && value in LEGACY_AI_MODEL_IDS) {
    return LEGACY_AI_MODEL_IDS[value]
  }
  return DEFAULT_AI_MODEL_ID
}

export function getAiModelMeta(id: AIModelId) {
  return MODEL_BY_ID[id]
}

export function powerproofComposerModelLabel(modelId: AIModelId): string {
  return POWERPROOF_COMPOSER_MODEL_LABELS[modelId] ?? POWERPROOF_AI_MODEL_LABELS[modelId] ?? getAiModelMeta(modelId).label
}

export function getAiCreditCost(baseCost: number, modelId: AIModelId): number {
  const multiplier = getAiModelMeta(modelId).credits_multiplier
  return baseCost * multiplier
}

/** Short labels for research history / detail (`user_opportunities.model_used`). */
export const RESEARCH_MODEL_DISPLAY: Record<string, string> = {
  ...POWERPROOF_AI_MODEL_LABELS,
}

/** War Room deploy model labels (composer + result badges). */
export const WAR_ROOM_MODEL_DISPLAY: Record<AIModelId, string> = {
  ...POWERPROOF_AI_MODEL_LABELS,
}

export function researchModelDisplayLabel(modelUsed: string | null | undefined): string | null {
  if (!modelUsed?.trim()) return null
  const id = resolveAiModelId(modelUsed)
  return RESEARCH_MODEL_DISPLAY[id] ?? POWERPROOF_AI_MODEL_LABELS[id] ?? getAiModelMeta(id).label
}

/** Hero composer + research card model chip label typography. */
export const researchModelChipLabelClassName =
  'font-sans text-[10px] font-black italic uppercase tracking-tighter'

export function warRoomModelDisplayLabel(modelId: AIModelId): string {
  return WAR_ROOM_MODEL_DISPLAY[modelId] ?? POWERPROOF_AI_MODEL_LABELS[modelId] ?? getAiModelMeta(modelId).label
}

export function powerproofAiModelLabel(modelId: AIModelId): string {
  return POWERPROOF_AI_MODEL_LABELS[modelId] ?? getAiModelMeta(modelId).label
}

/** Base credits per ponder task type (before model multiplier). */
export const PONDER_TASK_BASE_CREDITS = {
  ponder_marketing: 10,
  ponder_competitors: 10,
  ponder_financials: 10,
  ponder_operations: 10,
  ponder_custom: 20,
} as const

export type PonderTaskType = keyof typeof PONDER_TASK_BASE_CREDITS

export function getPonderTaskCreditCost(taskType: PonderTaskType, modelId: AIModelId): number {
  return getAiCreditCost(PONDER_TASK_BASE_CREDITS[taskType], modelId)
}

export function getMinPonderTaskCreditCost(modelId: AIModelId): number {
  return getPonderTaskCreditCost('ponder_marketing', modelId)
}

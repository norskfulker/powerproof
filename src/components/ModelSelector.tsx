import type { AIModelId } from '@/lib/aiModels'

export type ModelKey = 'flash-lite' | 'flash' | 'pro'

const MODELS = [
  { key: 'flash-lite' as ModelKey, label: 'Lite AI' },
  { key: 'flash' as ModelKey, label: 'Quick AI' },
  { key: 'pro' as ModelKey, label: 'AI PRO' },
]

export const MODEL_CREDITS: Record<ModelKey, number> = {
  'flash-lite': 15,
  flash: 25,
  pro: 50,
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ModelKey
  onChange: (m: ModelKey) => void
  disabled?: boolean
}) {
  return (
    <div className="model-selector" role="group" aria-label="Roadmap model">
      {MODELS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          className={`model-option ${value === opt.key ? 'active' : ''}`}
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function roadmapModelLabel(model: unknown): string {
  if (model === 'pro') return 'AI PRO'
  if (model === 'flash-lite') return 'Lite AI'
  return 'Quick AI'
}

export function roadmapCreditCostForModel(model: unknown): number {
  if (model === 'pro') return MODEL_CREDITS.pro
  if (model === 'flash-lite') return MODEL_CREDITS['flash-lite']
  return MODEL_CREDITS.flash
}

/** Fixed roadmap costs per shared composer AI model (matches generate-roadmap pricing). */
export const ROADMAP_AI_MODEL_CREDIT_COSTS: Record<AIModelId, number> = {
  'gemini-2.5-flash-lite': MODEL_CREDITS['flash-lite'],
  'gemini-2.5-flash': MODEL_CREDITS.flash,
  'gemini-2.5-pro': MODEL_CREDITS.pro,
}

export function roadmapModelKeyFromAiModelId(id: AIModelId): ModelKey {
  if (id === 'gemini-2.5-flash-lite') return 'flash-lite'
  if (id === 'gemini-2.5-pro') return 'pro'
  return 'flash'
}

export function roadmapCreditCostForAiModelId(id: AIModelId): number {
  return ROADMAP_AI_MODEL_CREDIT_COSTS[id]
}

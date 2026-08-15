import { toast } from '@/components/ui/sonner'
import { getAiModelMeta, type AIModelId } from '@/lib/aiModels'
import { getCountryByCode } from '@/lib/countries'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'

export function toastComposerCountryChange(code: string) {
  const country = getCountryByCode(code)
  toast.success('Country & Currency is Updated', {
    description: `${country.name} · Rates in ${country.currency}`,
  })
}

export function toastComposerResearchStyleChange(style: ResearchStyle) {
  const option = RESEARCH_STYLE_OPTIONS.find((o) => o.value === style) ?? RESEARCH_STYLE_OPTIONS[0]!
  toast.success('Research Style is Updated', {
    description: option.label,
  })
}

export function toastComposerAiModelChange(
  modelId: AIModelId,
  displayLabel?: string,
) {
  const label = displayLabel ?? getAiModelMeta(modelId).label
  toast.success('AI Model is Updated', {
    description: label,
  })
}

export function toastComposerMaxLengthReached(maxLength: number) {
  toast.info(`Maximum ${maxLength} characters`, {
    id: 'composer-max-length',
    description: 'Shorten your input to continue typing.',
  })
}

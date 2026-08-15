import { ModelSelector, MODEL_CREDITS, type ModelKey } from '@/components/ModelSelector'

type Props = {
  model: ModelKey
  onModelChange: (model: ModelKey) => void
  disabled?: boolean
}

export function RoadmapGenerationOptions({ model, onModelChange, disabled = false }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <ModelSelector value={model} onChange={onModelChange} disabled={disabled} />
    </div>
  )
}

export { MODEL_CREDITS }

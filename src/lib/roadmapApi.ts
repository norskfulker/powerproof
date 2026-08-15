import type { ModelKey } from '@/components/ModelSelector'
import { MODEL_CREDITS } from '@/components/ModelSelector'
import { byokRequestHeaders } from '@/lib/byok'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'
import type { Persona } from '@/types/persona'

/** Default Smart model cost — prefer `MODEL_CREDITS[model]` when model is known. */
export const ROADMAP_CREDIT_COST = MODEL_CREDITS.flash

export type GenerateRoadmapOptions = {
  roadmapId?: string
  model?: ModelKey
  country?: string
  persona?: Persona | null
}

const GENERATING_MESSAGES = [
  'Parsing your goal...',
  'Mapping the journey...',
  'Adding emotional checkpoints...',
  'Building your roadmap...',
] as const

export function getGeneratingMessage(index: number): string {
  return GENERATING_MESSAGES[index % GENERATING_MESSAGES.length]
}

export async function generateRoadmap(
  goalInput: string,
  options: GenerateRoadmapOptions = {},
): Promise<string> {
  const { roadmapId, model = 'flash', country = 'India', persona = null } = options
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-roadmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify({
      goal_input: goalInput,
      model,
      country,
      persona,
      ...(roadmapId ? { roadmap_id: roadmapId } : {}),
    }),
  })

  if (res.status === 402) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw edgeApiErrorFromPayload(res.status, data)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'generation_failed')
  }

  const { roadmap_id } = (await res.json()) as { roadmap_id: string }
  return roadmap_id
}

export async function pollRoadmapUntilComplete(
  roadmapId: string,
  onStatus?: (status: string) => void,
): Promise<void> {
  const terminal = new Set(['complete', 'failed'])

  for (;;) {
    const { data, error } = await supabase
      .from('user_roadmaps')
      .select('generation_status')
      .eq('id', roadmapId)
      .single()

    if (error) throw error

    const status = data?.generation_status ?? 'pending'
    onStatus?.(status)

    if (terminal.has(status)) return

    await new Promise((r) => setTimeout(r, 3000))
  }
}

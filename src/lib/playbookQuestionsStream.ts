import { fetchSupabaseFunctionStream } from '@/lib/supabaseFunctionStream'
import type {
  BriefingResult,
  InferredContext,
  WarRoomExtractedContext,
} from '@/lib/playbookTypes'

export type PlaybookQuestionsStreamEvent =
  | { type: 'status'; message: string; phase?: string }
  | { type: 'ping'; ts: number }
  | { type: 'delta'; text: string; phase?: string }
  | {
      type: 'done'
      mode: 'briefing'
      briefing: BriefingResult
      country: string
      model: string
      inferred_context: InferredContext
      extracted_context: WarRoomExtractedContext | null
    }
  | { type: 'error'; message: string; code?: string }

export async function fetchPlaybookQuestionsStream(
  baseUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
  handlers: { onEvent: (event: PlaybookQuestionsStreamEvent) => void },
): Promise<void> {
  return fetchSupabaseFunctionStream<PlaybookQuestionsStreamEvent>(
    baseUrl,
    'playbook-questions',
    accessToken,
    body,
    handlers,
  )
}

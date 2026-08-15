import { fetchSupabaseFunctionStream } from '@/lib/supabaseFunctionStream'
import type { GeneratePlaybookDonePayload, PlaybookRedFlag } from '@/lib/playbookTypes'

export type GeneratePlaybookStreamEvent =
  | { type: 'status'; message: string; phase?: string; playbook_id?: string }
  | { type: 'ping'; ts: number }
  | { type: 'delta'; text: string; phase?: string }
  | ({ type: 'done' } & GeneratePlaybookDonePayload)
  | { type: 'error'; message: string; code?: string }

export async function fetchGeneratePlaybookStream(
  baseUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
  handlers: { onEvent: (event: GeneratePlaybookStreamEvent) => void },
): Promise<void> {
  return fetchSupabaseFunctionStream<GeneratePlaybookStreamEvent>(
    baseUrl,
    'generate-playbook',
    accessToken,
    body,
    handlers,
  )
}

export type { PlaybookRedFlag }

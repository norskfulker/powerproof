import type { IdeaChipsContext } from '@/hooks/useIdeaChipsSession'
import { IDEA_CHIPS_COUNT } from '@/lib/ideaChipsConfig'
import { capitalizeIdeaFirstLetter } from '@/lib/ideaText'
import { supabase } from '@/lib/supabase'

const inFlight = new Map<IdeaChipsContext, Promise<string[]>>()

function normalizeChipRow(row: unknown): string {
  if (typeof row === 'string') return row.trim()
  if (row && typeof row === 'object') {
    const record = row as Record<string, unknown>
    for (const key of ['chip', 'text', 'idea', 'label'] as const) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return ''
}

/** Random chips from `idea_chips_pool` via Postgres RPC — no edge function, no Gemini. */
export async function fetchIdeaChipsFromPool(context: IdeaChipsContext): Promise<string[]> {
  const existing = inFlight.get(context)
  if (existing) return existing

  const promise = (async () => {
    const count = IDEA_CHIPS_COUNT[context]
    const { data, error } = await supabase.rpc('get_idea_chips', {
      p_context: context,
      p_count: count,
    })
    if (error) throw error

    const rows = data as unknown
    if (!Array.isArray(rows)) return []

    return rows
      .map((row) => capitalizeIdeaFirstLetter(normalizeChipRow(row)))
      .filter(Boolean)
      .slice(0, count)
  })().finally(() => {
    inFlight.delete(context)
  })

  inFlight.set(context, promise)
  return promise
}

import type {
  BriefingResult,
  InferredContext,
  WarRoomExtractedContext,
} from '@/lib/playbookTypes'
import { WAR_ROOM_DEFAULT_COUNTRY } from '@/lib/warRoomCountries'

const LOCAL_DRAFT_PREFIX = 'powerproof:war-room-intake'
const DRAFT_VERSION = 3

export const WAR_ROOM_DRAFT_UPDATED_EVENT = 'powerproof:war-room-draft-updated'

export type WarRoomIntakeDraft = {
  version: typeof DRAFT_VERSION
  business_description: string
  country: string
  model: string | null
  briefing: BriefingResult | null
  inferred_context: InferredContext | null
  extracted_context?: WarRoomExtractedContext | null
  scout_credits_deducted?: boolean
  updated_at?: string
}

/** True when stored scout output is complete enough to resume the briefing step. */
export function isWarRoomBriefingReady(
  draft: Pick<WarRoomIntakeDraft, 'briefing' | 'inferred_context'>,
): boolean {
  const { briefing, inferred_context } = draft
  if (!briefing || !inferred_context) return false
  if (typeof briefing !== 'object' || typeof inferred_context !== 'object') return false

  const hasBriefingContent = Boolean(
    briefing.battlefield_summary?.trim() ||
      briefing.business_type?.trim() ||
      briefing.primary_goal?.trim() ||
      (Array.isArray(briefing.competitors) && briefing.competitors.length > 0),
  )

  const intel = inferred_context.intel
  const hasContext = Boolean(
    inferred_context.business_type?.trim() ||
      inferred_context.stage?.trim() ||
      (intel && Array.isArray(intel.competitors) && intel.competitors.length > 0),
  )

  return hasBriefingContent && hasContext
}

function localKey(userId: string) {
  return `${LOCAL_DRAFT_PREFIX}:${userId}`
}

function normalizeDraft(raw: unknown): WarRoomIntakeDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const businessDescription =
    typeof o.business_description === 'string' ? o.business_description.trim() : ''
  const country =
    typeof o.country === 'string' && o.country.trim()
      ? o.country.trim()
      : WAR_ROOM_DEFAULT_COUNTRY
  const model = typeof o.model === 'string' ? o.model : null

  if (o.version === DRAFT_VERSION || o.version === 2 || o.version === 1) {
    const d = o as WarRoomIntakeDraft
    if (
      businessDescription &&
      isWarRoomBriefingReady({ briefing: d.briefing, inferred_context: d.inferred_context })
    ) {
      return {
        version: DRAFT_VERSION,
        business_description: businessDescription,
        country,
        model,
        briefing: d.briefing,
        inferred_context: d.inferred_context,
        extracted_context: d.extracted_context ?? null,
        scout_credits_deducted: d.scout_credits_deducted,
        updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
      }
    }
    if (businessDescription) {
      return {
        version: DRAFT_VERSION,
        business_description: businessDescription,
        country,
        model,
        briefing: null,
        inferred_context: null,
        extracted_context: (o.extracted_context as WarRoomExtractedContext | null) ?? null,
        scout_credits_deducted: Boolean(o.scout_credits_deducted),
        updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
      }
    }
  }
  return null
}

/** In-progress War Room state — local only. */
export async function saveWarRoomIntakeDraft(
  userId: string,
  draft: WarRoomIntakeDraft,
): Promise<void> {
  try {
    const payload = {
      ...draft,
      version: DRAFT_VERSION,
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(localKey(userId), JSON.stringify(payload))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(WAR_ROOM_DRAFT_UPDATED_EVENT))
    }
  } catch {
    /**/
  }
}

export async function loadWarRoomIntakeDraft(userId: string): Promise<WarRoomIntakeDraft | null> {
  try {
    const stored = localStorage.getItem(localKey(userId))
    if (!stored) return null
    return normalizeDraft(JSON.parse(stored))
  } catch {
    return null
  }
}

export async function clearWarRoomIntakeDraft(userId: string): Promise<void> {
  try {
    localStorage.removeItem(localKey(userId))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(WAR_ROOM_DRAFT_UPDATED_EVENT))
    }
  } catch {
    /**/
  }
}

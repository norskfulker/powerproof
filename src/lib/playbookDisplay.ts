import type { UserPlaybook } from '@/lib/playbookTypes'

export type PlaybookTitleSource = Pick<UserPlaybook, 'business_description' | 'business_name'>

const DEFAULT_PLAYBOOK_TITLE = 'War Room Playbook'

/** Primary headline — user War Room prompt when stored, else workspace name. */
export function playbookTitle(playbook: PlaybookTitleSource): string {
  const prompt = playbook.business_description?.trim()
  if (prompt) return prompt
  const name = playbook.business_name?.trim()
  if (name) return name
  return DEFAULT_PLAYBOOK_TITLE
}

/** Truncated title for cards and compact list rows. */
export function playbookCardTitle(playbook: PlaybookTitleSource, maxLen = 60): string {
  const full = playbookTitle(playbook)
  if (full.length <= maxLen) return full
  return `${full.slice(0, maxLen).trimEnd()}...`
}

export type PlaybookMetaKind = 'city' | 'industry' | 'business_type' | 'country'

export type PlaybookMetaItem = {
  kind: PlaybookMetaKind
  value: string
}

export function playbookMetaItems(
  playbook: Pick<UserPlaybook, 'city' | 'industry' | 'business_type' | 'country'>,
): PlaybookMetaItem[] {
  const items: PlaybookMetaItem[] = []
  const push = (kind: PlaybookMetaKind, raw?: string | null) => {
    const value = raw?.trim()
    if (value) items.push({ kind, value })
  }
  push('city', playbook.city)
  push('industry', playbook.industry)
  push('business_type', playbook.business_type)
  push('country', playbook.country)
  return items
}

export function playbookMetaParts(playbook: UserPlaybook): string[] {
  return playbookMetaItems(playbook).map((item) => item.value)
}

export function playbookContextEntries(
  playbook: UserPlaybook,
): { key: string; value: string }[] {
  const answers = playbook.context_answers ?? {}
  return Object.entries(answers)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, raw]) => ({
      key,
      value: Array.isArray(raw) ? raw.join(', ') : String(raw ?? '').trim(),
    }))
    .filter((row) => row.value.length > 0)
}

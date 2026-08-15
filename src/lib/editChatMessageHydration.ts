import type { EditChatQuestion, EditChatSuggestion } from '@/lib/opportunityEditChat'

export type HydratedChatMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'chat'; reply: string; suggestions: EditChatSuggestion[] }
  | {
      id: string
      kind: 'confirm'
      question: string
      inferredSections: string[]
      inferredLabels: string[]
      editIntent: string
      /** War Room: flat column vs step-targeted edit. */
      editTarget?: 'flat' | 'steps'
      targetSteps?: number[]
      targetLabels?: string[]
      resolved?: boolean
    }
  | {
      id: string
      kind: 'questions'
      questions: EditChatQuestion[]
      confirmedSections: string[]
      editIntent: string
      editTarget?: 'flat' | 'steps'
      targetSteps?: number[]
      submitted?: boolean
    }
  | { id: string; kind: 'typing' }
  | {
      id: string
      kind: 'loading'
      sectionLabels: string[]
      cancellable?: boolean
      cancelDisabled?: boolean
    }
  | { id: string; kind: 'cancelled' }
  | {
      id: string
      kind: 're_research_loading'
      sectionLabels: string[]
      styleLabel: string
    }
  | {
      id: string
      kind: 'complete'
      sectionsLabels: string[]
      sectionsUpdated: string[]
      version: number
      /** War Room uses a single summary label instead of section lists. */
      summaryLabel?: string
    }
  | {
      id: string
      kind: 're_research_complete'
      sectionsLabels: string[]
      sectionsUpdated: string[]
      version: number
      styleLabel: string
    }
  | { id: string; kind: 'error'; text: string; creditsLink?: boolean; retryable?: boolean }

function newId(): string {
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function asQuestions(value: unknown): EditChatQuestion[] {
  if (!Array.isArray(value)) return []
  return value.filter((q): q is EditChatQuestion => {
    return (
      q != null &&
      typeof q === 'object' &&
      typeof (q as EditChatQuestion).id === 'string' &&
      typeof (q as EditChatQuestion).text === 'string'
    )
  })
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
    : []
}

function hydrateOne(item: unknown): HydratedChatMessage | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const id = asString(o.id, newId())

  if (typeof o.kind === 'string') {
    return { ...o, id } as HydratedChatMessage
  }

  const type = asString(o.type)
  const role = asString(o.role)

  if (role === 'user' || type === 'user') {
    const text = asString(o.text ?? o.content ?? o.message)
    if (!text.trim()) return null
    return { id, kind: 'user', text }
  }

  if (type === 'chat') {
    const reply = asString(o.reply ?? o.content ?? o.message)
    if (!reply.trim()) return null
    return {
      id,
      kind: 'chat',
      reply,
      suggestions: Array.isArray(o.suggestions) ? (o.suggestions as EditChatSuggestion[]) : [],
    }
  }

  if (type === 'confirm') {
    const editTargetRaw = asString(o.edit_target)
    const editTarget =
      editTargetRaw === 'steps' || editTargetRaw === 'flat' ? editTargetRaw : undefined
    return {
      id,
      kind: 'confirm',
      question: asString(o.confirm_question ?? o.question ?? o.content),
      inferredSections: asStringArray(o.inferred_sections),
      inferredLabels: asStringArray(o.inferred_labels),
      editIntent: asString(o.edit_intent),
      editTarget,
      targetSteps: asNumberArray(o.target_steps),
      targetLabels: asStringArray(o.target_labels),
      resolved: o.resolved === true,
    }
  }

  if (type === 'questions') {
    const editTargetRaw = asString(o.edit_target)
    const editTarget =
      editTargetRaw === 'steps' || editTargetRaw === 'flat' ? editTargetRaw : undefined
    return {
      id,
      kind: 'questions',
      questions: asQuestions(o.questions),
      confirmedSections: asStringArray(o.confirmed_sections),
      editIntent: asString(o.edit_intent),
      editTarget,
      targetSteps: asNumberArray(o.target_steps),
      submitted: o.submitted === true,
    }
  }

  if (type === 'edit_complete' || type === 'complete') {
    const sectionsUpdated = asStringArray(o.sections_updated)
    const summaryLabel = asString(o.summary_label)
    return {
      id,
      kind: 'complete',
      sectionsLabels: asStringArray(o.sections_labels).length
        ? asStringArray(o.sections_labels)
        : summaryLabel
          ? [summaryLabel]
          : [],
      sectionsUpdated,
      version: Number(o.version_saved ?? o.version ?? 0),
      summaryLabel: summaryLabel || undefined,
    }
  }

  if (type === 're_research_complete') {
    const sectionsUpdated = asStringArray(o.sections_updated)
    return {
      id,
      kind: 're_research_complete',
      sectionsLabels: asStringArray(o.sections_labels),
      sectionsUpdated,
      version: Number(o.version_saved ?? o.version ?? 0),
      styleLabel: asString(o.style_label ?? o.research_style, 'Standard'),
    }
  }

  if (type === 'loading') {
    const labels = asStringArray(o.section_labels ?? o.sectionLabels)
    const legacyLabel = asString(o.label)
    return {
      id,
      kind: 'loading',
      sectionLabels: labels.length > 0 ? labels : legacyLabel ? [legacyLabel] : ['section'],
      cancellable: o.cancellable === true,
      cancelDisabled: o.cancelDisabled === true,
    }
  }

  if (type === 'cancelled') {
    return { id, kind: 'cancelled' }
  }

  if (type === 'typing') {
    return { id, kind: 'typing' }
  }

  if (type === 'error') {
    return {
      id,
      kind: 'error',
      text: asString(o.text ?? o.message ?? o.content, 'Something went wrong.'),
      creditsLink: o.credits_link === true || o.creditsLink === true,
      retryable: o.retryable !== false,
    }
  }

  if (role === 'assistant') {
    const text = asString(o.content ?? o.reply ?? o.message)
    if (!text.trim()) return null
    return {
      id,
      kind: 'chat',
      reply: text,
      suggestions: Array.isArray(o.suggestions) ? (o.suggestions as EditChatSuggestion[]) : [],
    }
  }

  const fallback = asString(o.content ?? o.text ?? o.message)
  if (fallback.trim()) {
    return { id, kind: 'chat', reply: fallback, suggestions: [] }
  }

  return null
}

export function hydrateEditChatMessages(raw: unknown): HydratedChatMessage[] {
  if (!Array.isArray(raw)) return []
  const result: HydratedChatMessage[] = []
  for (const item of raw) {
    const hydrated = hydrateOne(item)
    if (hydrated) result.push(hydrated)
  }
  return result
}

export function extractLatestChatSuggestions(messages: HydratedChatMessage[]): EditChatSuggestion[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.kind === 'chat' && msg.suggestions.length > 0) return msg.suggestions
  }
  return []
}

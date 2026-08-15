const PASS_PREFIXES = [
  /^this milestone is passed when you\s+/i,
  /^this milestone is passed when\s+/i,
  /^milestone is passed when you\s+/i,
  /^passed when you\s+/i,
  /^passed when\s+/i,
]

function capitalizeFirst(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export type PassConditionCopy = {
  focusBody: string | null
  doneWhen: string | null
}

/** Split milestone description into focus + done-when copy for journey cards. */
export function condensePassCondition(text: string): PassConditionCopy {
  const raw = text.trim()
  if (!raw) return { focusBody: null, doneWhen: null }

  for (const prefix of PASS_PREFIXES) {
    if (prefix.test(raw)) {
      const doneWhen = capitalizeFirst(raw.replace(prefix, '').trim())
      return {
        focusBody: null,
        doneWhen: doneWhen || null,
      }
    }
  }

  const splitMatch = raw.match(/^([\s\S]+?)\s+(?:done when|passed when)\s+([\s\S]+)$/i)
  if (splitMatch) {
    const focus = capitalizeFirst(splitMatch[1].trim().replace(/[.,;]\s*$/, ''))
    const doneWhen = capitalizeFirst(splitMatch[2].trim())
    return {
      focusBody: focus || null,
      doneWhen: doneWhen || null,
    }
  }

  return {
    focusBody: capitalizeFirst(raw),
    doneWhen: null,
  }
}

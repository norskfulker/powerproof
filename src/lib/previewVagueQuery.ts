export type FrontendVagueCheck = { vague: true; message: string } | { vague: false }

const GENERIC_EXACT = new Set([
  'business',
  'startup',
  'money',
  'success',
  'rich',
  'income',
  'idea',
  'help',
  'hello',
  'hi',
  'hey',
  'test',
  'nothing',
  'something',
  'anything',
  'everything',
  'idk',
  'dunno',
])

/** Layer 1 — instant client-side vague query detection before any API call. */
export function isFrontendVague(query: string): FrontendVagueCheck {
  const q = query.trim()

  if (q.length < 5) {
    return {
      vague: true,
      message: "That's a bit too short — what exactly are you building or exploring?",
    }
  }

  const wordCount = q.split(/\s+/).filter(Boolean).length
  if (wordCount === 1 && q.length < 12) {
    return {
      vague: true,
      message: "Can you tell us a bit more? One word doesn't give us enough to work with.",
    }
  }

  const vowels = (q.match(/[aeiouAEIOU]/g) ?? []).length
  const letters = (q.match(/[a-zA-Z]/g) ?? []).length
  if (letters > 6 && vowels / letters < 0.15) {
    return {
      vague: true,
      message: "That doesn't look like a business idea — try describing what you want to build.",
    }
  }

  if (GENERIC_EXACT.has(q.toLowerCase())) {
    return {
      vague: true,
      message: 'We need a bit more context — what kind of business or direction are you exploring?',
    }
  }

  return { vague: false }
}

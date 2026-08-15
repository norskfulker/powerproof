export type ClarifyInvalidCategory = 'gibberish' | 'abuse' | 'too_vague' | 'off_topic'

const INVALID_CATEGORIES = new Set<ClarifyInvalidCategory>([
  'gibberish',
  'abuse',
  'too_vague',
  'off_topic',
])

export class ClarifyInvalidInputError extends Error {
  readonly category: ClarifyInvalidCategory

  constructor(message: string, category: ClarifyInvalidCategory) {
    super(message)
    this.name = 'ClarifyInvalidInputError'
    this.category = category
  }
}

export function parseClarifyInvalidInput(
  res: Response,
  data: Record<string, unknown>,
): ClarifyInvalidInputError | null {
  if (res.status !== 422 || data.status !== 'invalid') return null

  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (!message) return null

  const raw = data.category
  const category =
    typeof raw === 'string' && INVALID_CATEGORIES.has(raw as ClarifyInvalidCategory)
      ? (raw as ClarifyInvalidCategory)
      : 'too_vague'

  return new ClarifyInvalidInputError(message, category)
}

export function isClarifyInvalidInputError(err: unknown): err is ClarifyInvalidInputError {
  return err instanceof ClarifyInvalidInputError
}

export type Persona =
  | 'student'
  | 'employee'
  | 'entrepreneur'
  | 'smb_owner'
  | 'ceo_executive'
  | 'government'

export const PERSONA_VALUES: Persona[] = [
  'student',
  'employee',
  'entrepreneur',
  'smb_owner',
  'ceo_executive',
  'government',
]

export const PERSONA_META: Record<Persona, { label: string; tagline: string; icon: string }> = {
  student: { label: 'Student', tagline: 'Career direction & venture ideas', icon: '🎓' },
  employee: { label: 'Employee', tagline: 'Career pivot & side venture validation', icon: '💼' },
  entrepreneur: { label: 'Entrepreneur', tagline: 'Validate before investing', icon: '🚀' },
  smb_owner: { label: 'Small Business Owner', tagline: 'Grow, pivot, or hold', icon: '🏪' },
  ceo_executive: { label: 'CEO / Executive', tagline: 'Strategic direction at scale', icon: '📊' },
  government: { label: 'Government Body', tagline: 'Impact-first programme design', icon: '🏛️' },
}

/** Short labels for filter chips on the roadmap list. */
export const PERSONA_FILTER_LABELS: Record<Persona, string> = {
  student: 'Student',
  employee: 'Employee',
  entrepreneur: 'Entrepreneur',
  smb_owner: 'SMB',
  ceo_executive: 'CEO',
  government: 'Gov',
}

export function isPersona(value: unknown): value is Persona {
  return typeof value === 'string' && PERSONA_VALUES.includes(value as Persona)
}

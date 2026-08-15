/** Lightweight validation while typing (national number after dial code). */
export function validateNationalNumber(prefix: string, digits: string): { valid: boolean; message?: string } {
  const n = digits.replace(/\D/g, '')
  if (!n.trim()) return { valid: true }

  if (prefix === '+91') {
    if (n.length < 10) return { valid: false, message: `Enter ${10 - n.length} more digit${10 - n.length === 1 ? '' : 's'}` }
    if (n.length > 10) return { valid: false, message: 'Use 10 digits for Indian mobile' }
    if (/^[6-9]\d{9}$/.test(n)) return { valid: true }
    return { valid: false, message: 'Start with 6–9 for Indian mobile' }
  }

  if (n.length < 6) return { valid: false, message: 'Number looks too short' }
  if (n.length > 15) return { valid: false, message: 'Number looks too long' }
  return { valid: true }
}

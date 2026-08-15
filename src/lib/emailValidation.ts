/** Basic client-side email shape check before RPC presence lookup. */
export function isEmailFormatValid(email: string): boolean {
  const e = email.trim().toLowerCase()
  if (!e || e.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

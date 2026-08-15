/** Filter workspace history cards by title (and title-like fields only). */
export function matchesWorkspaceSearch(
  needle: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  return parts.some((part) => String(part ?? '').trim().toLowerCase().includes(q))
}

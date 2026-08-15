/** Capitalize the first non-whitespace character of an idea/prompt. */
export function capitalizeIdeaFirstLetter(text: string): string {
  if (!text) return text
  const match = text.match(/^(\s*)(\S)/)
  if (!match) return text
  const [, lead, first] = match
  const idx = lead.length
  const char = text[idx]
  if (!char || char === char.toUpperCase()) return text
  return text.slice(0, idx) + char.toUpperCase() + text.slice(idx + 1)
}

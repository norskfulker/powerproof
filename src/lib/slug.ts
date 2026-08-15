/** URL-safe slug from a human title (categories, tags, etc.). */
export function slugifyCategoryTitle(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'category'
}

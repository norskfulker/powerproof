export function normalizeQuery(q: string) {
  return String(q ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function isWordBoundary(h: string, idx: number) {
  if (idx <= 0) return true
  const prev = h[idx - 1]
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/'
}

// Lightweight fuzzy score:
// - Strong for prefix matches and word-boundary matches
// - Allows subsequence matches (f i n d)
export function fuzzyScore(haystackRaw: string, queryRaw: string): number {
  const haystack = normalizeQuery(haystackRaw)
  const query = normalizeQuery(queryRaw)
  if (!query) return 0
  if (!haystack) return -Infinity

  if (haystack.startsWith(query)) return 200 + query.length
  if (haystack.includes(` ${query}`)) return 160 + query.length

  // subsequence scoring
  let score = 0
  let hi = 0
  let consecutive = 0
  for (let qi = 0; qi < query.length; qi++) {
    const ch = query[qi]
    if (ch === ' ') continue
    let found = false
    while (hi < haystack.length) {
      if (haystack[hi] === ch) {
        found = true
        score += 8
        if (isWordBoundary(haystack, hi)) score += 6
        consecutive += 1
        if (consecutive >= 2) score += 2
        hi += 1
        break
      }
      consecutive = 0
      hi += 1
    }
    if (!found) return -Infinity
  }

  // prefer shorter haystack
  score += Math.max(0, 30 - haystack.length / 4)
  return score
}

export function fuzzyRank<T>(
  items: T[],
  query: string,
  getHaystack: (item: T) => string,
  limit = 10,
): Array<{ item: T; score: number }> {
  const ranked = items
    .map((item) => ({ item, score: fuzzyScore(getHaystack(item), query) }))
    .filter((r) => Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score)
  return ranked.slice(0, Math.max(1, limit))
}


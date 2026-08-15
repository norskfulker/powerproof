export function deriveInterestedCount(input: {
  interested_count?: number | null
  save_count?: number | null
  view_count?: number | null
  score?: number | null
}) {
  const saves = Math.max(0, Number(input.save_count ?? 0))
  const direct = Number(input.interested_count ?? 0)
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct + saves)

  const views = Math.max(0, Number(input.view_count ?? 0))
  const score = Math.max(0, Number(input.score ?? 0))
  const derived = Math.round(saves * 2 + views * 0.08 + score * 0.9)
  return Math.max(1, derived)
}


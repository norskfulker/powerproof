/** FAQPage JSON-LD for opportunity detail / preview pages (Google rich results). */
export function buildOpportunityFaqJsonLd(faqs: unknown): Record<string, unknown> | null {
  if (!Array.isArray(faqs)) return null

  const mainEntity = faqs
    .map((item) => {
      const row = item as Record<string, unknown> | null
      const name = String(row?.question ?? row?.q ?? '').trim()
      const text = String(row?.answer ?? row?.a ?? '').trim()
      if (!name || !text) return null
      return {
        '@type': 'Question',
        name,
        acceptedAnswer: {
          '@type': 'Answer',
          text,
        },
      }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)

  if (mainEntity.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}

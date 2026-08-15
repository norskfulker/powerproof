import { Helmet } from 'react-helmet-async'
import { buildOpportunityFaqJsonLd } from '@/lib/opportunityFaqJsonLd'

export type OpportunitySeoHeadProps = {
  seo: Record<string, any>
  opp: { tagline?: string | null; faqs?: unknown }
  canonicalUrl: string
}

export function OpportunitySeoHead({ seo, opp, canonicalUrl }: OpportunitySeoHeadProps) {
  const descFallback = opp.tagline ?? ''
  const faqJsonLd = buildOpportunityFaqJsonLd(opp.faqs)

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description ?? descFallback} />
      <link rel="canonical" href={canonicalUrl} />
      {seo.noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={seo.ogTitle ?? seo.title} />
      <meta property="og:description" content={seo.ogDescription ?? seo.description ?? descFallback} />
      <meta property="og:url" content={canonicalUrl} />
      {seo.imageUrl ? <meta property="og:image" content={seo.imageUrl} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.ogTitle ?? seo.title} />
      <meta name="twitter:description" content={seo.ogDescription ?? seo.description ?? descFallback} />
      {seo.imageUrl ? <meta name="twitter:image" content={seo.imageUrl} /> : null}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: seo.title,
          description: seo.description ?? opp.tagline,
          url: canonicalUrl,
          publisher: { '@type': 'Organization', name: 'PowerProof' },
        })}
      </script>
      {faqJsonLd ? (
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      ) : null}
    </Helmet>
  )
}

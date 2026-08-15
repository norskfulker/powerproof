import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { getPageSeoByPath } from '@/lib/seo/pageSeoConfig'

type SeoProps = {
  title?: string
  description?: string
  canonicalPath?: string
  imageUrl?: string
  noIndex?: boolean
  /**
   * When set, fills missing title / description / canonical / noIndex from
   * `src/lib/seo/pageSeoConfig.ts`. Explicit props still win.
   */
  pagePath?: string
}

export function Seo({ title, description, canonicalPath, imageUrl, noIndex, pagePath }: SeoProps) {
  const location = useLocation()
  const fromConfig = pagePath ? getPageSeoByPath(pagePath) : undefined

  const resolvedTitle = title ?? fromConfig?.title
  const resolvedDescription = description ?? fromConfig?.description
  const resolvedCanonicalPath = canonicalPath ?? fromConfig?.canonicalPath ?? location.pathname
  const resolvedNoIndex = noIndex ?? fromConfig?.noIndex
  const resolvedKeywords = fromConfig?.keywords
  const ogTitle = fromConfig?.ogTitle ?? resolvedTitle
  const ogDescription = fromConfig?.ogDescription ?? resolvedDescription

  if (!resolvedTitle) {
    throw new Error('Seo: title is required (pass title or a pagePath present in pageSeoConfig)')
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const canonicalUrl = origin ? `${origin}${resolvedCanonicalPath}` : undefined

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      {resolvedDescription ? <meta name="description" content={resolvedDescription} /> : null}
      {resolvedKeywords ? <meta name="keywords" content={resolvedKeywords} /> : null}

      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {resolvedNoIndex ? (
        <>
          <meta name="robots" content="noindex,nofollow" />
          <meta name="googlebot" content="noindex,nofollow" />
        </>
      ) : null}

      <meta property="og:title" content={ogTitle} />
      {ogDescription ? <meta property="og:description" content={ogDescription} /> : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:type" content="website" />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}

      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={ogTitle} />
      {ogDescription ? <meta name="twitter:description" content={ogDescription} /> : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
    </Helmet>
  )
}

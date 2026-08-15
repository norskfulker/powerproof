import { useEffect } from 'react'

/** Signals that react-helmet-async has flushed head tags (runs after Helmet's useEffect). */
export function SeoMetaReadyMarker() {
  useEffect(() => {
    document.documentElement.setAttribute('data-seo-meta-ready', 'true')
  }, [])
  return null
}

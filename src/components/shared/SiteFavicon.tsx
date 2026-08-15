import { useEffect, useState } from 'react'

import { Globe } from '@/lib/icons'
import { siteFaviconUrl } from '@/lib/siteFavicon'
import { cn } from '@/lib/utils'

type SiteFaviconProps = {
  /** Hostname only, e.g. `powerproof.live`. When null, shows a globe placeholder. */
  hostname: string | null
  className?: string
  /** Pixel size for the image box (default 16). */
  size?: number
}

/**
 * Site favicon from a public resolver — shows as soon as a hostname is known,
 * with a globe fallback if the icon fails to load.
 */
export function SiteFavicon({ hostname, className, size = 16 }: SiteFaviconProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [hostname])

  const showImage = Boolean(hostname) && !failed

  if (!showImage) {
    return (
      <Globe
        className={cn('shrink-0 text-muted-foreground', className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={siteFaviconUrl(hostname!, size <= 16 ? 32 : 64)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn('shrink-0 rounded-[3px] object-contain', className)}
      onError={() => setFailed(true)}
    />
  )
}

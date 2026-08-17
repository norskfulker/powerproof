import { useMemo } from 'react'
import { HeroInput } from '@/components/discover/HeroInput'
import { SiteFavicon } from '@/components/shared/SiteFavicon'
import { Globe } from '@/lib/icons'
import { hostnameFromLooseUrl } from '@/lib/siteFavicon'
import {
  SCANNER_URL_MAX_LENGTH,
  SCANNER_URL_PLACEHOLDER,
  clampWebsiteUrlToSite,
  scannerInputModerationError,
} from '@/lib/websiteScannerConfig'

export function StartUrlStep({
  url,
  error,
  onUrlChange,
  onSubmit,
  loading = false,
}: {
  url: string
  error: string | null
  onUrlChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
}) {
  const hostname = hostnameFromLooseUrl(url)
  const moderationError = useMemo(() => scannerInputModerationError(url), [url])

  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="mb-3 text-xl font-semibold text-primary">Get your free analysis</p>
      <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
        See how your site stacks up.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Drop in your first website URL.
      </p>

      <div className="mt-8 w-full">
        <HeroInput
          value={url}
          onChange={(next) => onUrlChange(clampWebsiteUrlToSite(next))}
          onSubmit={onSubmit}
          placeholder={SCANNER_URL_PLACEHOLDER}
          maxLength={SCANNER_URL_MAX_LENGTH}
          disabled={loading}
          loading={loading}
          inputError={error}
          moderationError={moderationError}
          inputMode="url"
          autoComplete="url"
          inputAriaLabel="Website URL"
          submitLabel="Analyze my site"
          submitAriaLabel="Analyze my site"
          submitTitle="Analyze my site"
          leadingSlot={
            hostname ? (
              <SiteFavicon hostname={hostname} size={18} />
            ) : (
              <Globe className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
            )
          }
        />
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground">
        Take 15-30 seconds. Better than Semrush and Ahrefs.
      </p>
    </div>
  )
}

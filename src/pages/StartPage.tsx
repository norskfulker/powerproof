import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { AppFloatingPageRoot } from '@/components/layout/AppFloatingShell'
import { StartLoadingStep } from '@/components/start/StartLoadingStep'
import { StartPreviewResult } from '@/components/start/StartPreviewResult'
import { StartUrlStep } from '@/components/start/StartUrlStep'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_POST_LOGIN_PATH } from '@/lib/authLanding'
import { cardPadding, cardSurfaceElevated } from '@/lib/cardSurface'
import { LEGAL_PATHS } from '@/lib/legal'
import { fetchPreviewWebsiteScan, startSignUpPath } from '@/lib/previewWebsiteScan'
import { validateScannerUrlInput } from '@/lib/websiteScannerConfig'
import type { PreviewWebsiteScanResponse, PreviewWebsiteScanState } from '@/types/previewWebsiteScan'
import { cn } from '@/lib/utils'

const PAGE_INSET = 'mx-auto w-full max-w-platform px-4 layout-sm:px-6 layout-lg:px-8'

const SHADOW_CARD_CLASS = cn(
  cardSurfaceElevated,
  'w-full max-w-xl overflow-visible rounded-2xl',
  cardPadding.lg,
  'shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_32px_-10px_rgba(15,23,42,0.18),0_40px_80px_-24px_rgba(15,23,42,0.32)]',
)

export function StartPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [state, setState] = useState<PreviewWebsiteScanState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreviewWebsiteScanResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const runPreview = useCallback(async () => {
    const parsed = validateScannerUrlInput(url)
    if (!parsed.ok) {
      setError(parsed.message)
      setState('error')
      return
    }

    setUrl(parsed.url)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setResult(null)
    setState('loading')

    const response = await fetchPreviewWebsiteScan(parsed.url, { signal: controller.signal })
    if (controller.signal.aborted) return
    if (response.ok) {
      setResult(response.data)
      setState('result')
      return
    }
    if ('cancelled' in response && response.cancelled) return

    setError(response.message)
    setState('error')
  }, [url])

  const goToSignUp = useCallback(() => {
    navigate(startSignUpPath(result?.session_token ?? null))
  }, [navigate, result?.session_token])

  const scanAnother = useCallback(() => {
    abortRef.current?.abort()
    setState('idle')
    setError(null)
    setResult(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={DEFAULT_POST_LOGIN_PATH} replace />
  }

  const showForm = state === 'idle' || state === 'error'
  const showHeroCard = showForm || state === 'loading'

  return (
    <AppFloatingPageRoot mainClassName="flex flex-col">
      <Seo
        pagePath="/start"
        title="Free website preview | PowerProof"
        description="Drop in your URL for a free SEO and market snapshot — then sign up for the full website audit."
        canonicalPath="/start"
      />
      <div
        className={cn(
          PAGE_INSET,
          'flex min-h-0 flex-1 flex-col items-center',
          showHeroCard ? 'justify-center py-8 sm:py-12' : 'justify-start py-8 sm:py-10',
        )}
      >
        <BrandLogoLink
          className="mb-8 h-auto justify-center px-0"
          logoClassName="h-7 max-w-[10rem] object-center sm:h-8 sm:max-w-[11rem]"
        />

        {showHeroCard ? (
          <div className={SHADOW_CARD_CLASS}>
            {showForm ? (
              <StartUrlStep
                url={url}
                error={error}
                onUrlChange={(value) => {
                  setUrl(value)
                  if (error) setError(null)
                }}
                onSubmit={() => void runPreview()}
              />
            ) : (
              <StartLoadingStep url={url} />
            )}
          </div>
        ) : null}

        {state === 'result' && result ? (
          <StartPreviewResult
            url={url}
            data={result}
            onSignUp={goToSignUp}
            onScanAnother={scanAnother}
          />
        ) : null}

        {showForm ? (
          <p className="mt-6 max-w-xl text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to our{' '}
            <Link to={LEGAL_PATHS.terms} className="font-semibold text-foreground underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link to={LEGAL_PATHS.privacy} className="font-semibold text-foreground underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        ) : null}
      </div>
    </AppFloatingPageRoot>
  )
}

export default StartPage

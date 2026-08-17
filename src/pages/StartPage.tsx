import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { AppFloatingPageRoot } from '@/components/layout/AppFloatingShell'
import { StartLoadingStep, StartRestoreStep } from '@/components/start/StartLoadingStep'
import { StartPreviewResult } from '@/components/start/StartPreviewResult'
import { StartSignUpSheet, START_SIGNUP_SHEET_DELAY_MS } from '@/components/start/StartSignUpSheet'
import { StartUrlStep } from '@/components/start/StartUrlStep'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_POST_LOGIN_PATH } from '@/lib/authLanding'
import { cardPadding, cardSurfaceElevated } from '@/lib/cardSurface'
import { LEGAL_PATHS } from '@/lib/legal'
import {
  START_SESSION_TOKEN_PARAM,
  displayUrlFromPreviewGet,
  fetchPreviewWebsiteScan,
  fetchPreviewWebsiteScanByToken,
  persistWebsitePreviewToken,
  previewRestoreFallbackMessage,
} from '@/lib/previewWebsiteScan'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionTokenFromUrl = searchParams.get(START_SESSION_TOKEN_PARAM)?.trim() || null
  const [url, setUrl] = useState('')
  const [state, setState] = useState<PreviewWebsiteScanState>(
    sessionTokenFromUrl ? 'restoring' : 'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreviewWebsiteScanResponse | null>(null)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [signUpAutoFocus, setSignUpAutoFocus] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const signUpDismissedRef = useRef(false)
  const loadedTokenRef = useRef<string | null>(null)

  const clearSessionTokenFromUrl = useCallback(() => {
    if (!searchParams.has(START_SESSION_TOKEN_PARAM)) return
    const next = new URLSearchParams(searchParams)
    next.delete(START_SESSION_TOKEN_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const writeSessionTokenToUrl = useCallback(
    (token: string) => {
      const current = searchParams.get(START_SESSION_TOKEN_PARAM)?.trim() || null
      if (current === token) return
      const next = new URLSearchParams(searchParams)
      next.set(START_SESSION_TOKEN_PARAM, token)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (isLoading || user) return
    if (!sessionTokenFromUrl) return
    if (loadedTokenRef.current === sessionTokenFromUrl) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setResult(null)
    setState('restoring')

    void (async () => {
      const response = await fetchPreviewWebsiteScanByToken(sessionTokenFromUrl, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (response.ok) {
        loadedTokenRef.current = sessionTokenFromUrl
        persistWebsitePreviewToken(sessionTokenFromUrl)
        const restoredUrl = displayUrlFromPreviewGet(response.data)
        if (restoredUrl) setUrl(restoredUrl)
        setResult(response.data)
        setState('result')
        return
      }
      if ('cancelled' in response && response.cancelled) return

      loadedTokenRef.current = null
      setResult(null)
      setError(previewRestoreFallbackMessage(response.code))
      setState(response.code === 'expired' || response.code === 'not_found' ? 'error' : 'idle')
      clearSessionTokenFromUrl()
    })()
  }, [clearSessionTokenFromUrl, isLoading, sessionTokenFromUrl, user])

  useEffect(() => {
    if (state !== 'result') {
      setSignUpOpen(false)
      setSignUpAutoFocus(false)
      signUpDismissedRef.current = false
      return
    }

    const id = window.setTimeout(() => {
      if (signUpDismissedRef.current) return
      setSignUpAutoFocus(false)
      setSignUpOpen(true)
    }, START_SIGNUP_SHEET_DELAY_MS)

    return () => window.clearTimeout(id)
  }, [state])

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
      const token = response.data.session_token
      if (token) {
        loadedTokenRef.current = token
        persistWebsitePreviewToken(token)
        writeSessionTokenToUrl(token)
      } else {
        loadedTokenRef.current = null
        clearSessionTokenFromUrl()
      }
      setResult(response.data)
      setState('result')
      return
    }
    if ('cancelled' in response && response.cancelled) return

    loadedTokenRef.current = null
    setError(response.message)
    setState('error')
  }, [clearSessionTokenFromUrl, url, writeSessionTokenToUrl])

  const openSignUp = useCallback(
    (opts?: { autoFocus?: boolean }) => {
      persistWebsitePreviewToken(result?.session_token ?? null)
      setSignUpAutoFocus(opts?.autoFocus ?? true)
      setSignUpOpen(true)
    },
    [result?.session_token],
  )

  const handleSignUpOpenChange = useCallback((open: boolean) => {
    if (!open) signUpDismissedRef.current = true
    setSignUpOpen(open)
  }, [])

  const scanAnother = useCallback(() => {
    abortRef.current?.abort()
    loadedTokenRef.current = null
    setState('idle')
    setError(null)
    setResult(null)
    setUrl('')
    setSignUpOpen(false)
    setSignUpAutoFocus(false)
    signUpDismissedRef.current = false
    clearSessionTokenFromUrl()
  }, [clearSessionTokenFromUrl])

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
  const showHeroCard = showForm || state === 'loading' || state === 'restoring'

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
            ) : state === 'restoring' ? (
              <StartRestoreStep />
            ) : (
              <StartLoadingStep url={url} />
            )}
          </div>
        ) : null}

        {state === 'result' && result ? (
          <StartPreviewResult
            url={url}
            data={result}
            onSignUp={() => openSignUp({ autoFocus: true })}
            onScanAnother={scanAnother}
          />
        ) : null}

        <StartSignUpSheet
          open={signUpOpen}
          onOpenChange={handleSignUpOpenChange}
          autoFocus={signUpAutoFocus}
        />

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

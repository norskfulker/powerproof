import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  POWERPROOF_FOCUS_SIGN_IN_EVENT,
  resolvePostLoginPath,
} from '@/lib/authLanding'
import { handleSupabaseError, parseEmailSendRateLimitSeconds } from '@/lib/handleError'
import { AlertCircle, Check, ExternalLink, Link2, Loader2, Mail, MailPlus } from '@/lib/icons'
import { DISPOSABLE_EMAIL_ERROR, isAllowedSignupEmail, isDisposableEmail } from '@/lib/disposableEmailDomains'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { InputOTP, type InputOTPHandle } from '@/components/ui/input-otp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { applyPendingReferralIfAny, storePendingReferralCode } from '@/lib/referrals'
import { cn } from '@/lib/utils'
import { tryClaimPreviewAndNavigate } from '@/lib/claimPreviewSession'
import { captureWebsitePreviewTokenFromSearch } from '@/lib/previewWebsiteScan'
import { useEmailPresenceCheck, type EmailPresenceState } from '@/hooks/useEmailPresenceCheck'
import {
  copyPageUrlToClipboard,
  detectInAppBrowser,
  getInAppBrowserBannerInstructions,
  isAndroidDevice,
  shouldShowInAppBrowserBanner,
  tryOpenInChrome,
} from '@/lib/inAppBrowser'

function EmailPresenceStatusIcon({ state }: { state: EmailPresenceState }) {
  if (state === 'checking') {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
  }
  if (state === 'exists') {
    return <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-hidden />
  }
  if (state === 'new_email') {
    return <MailPlus className="h-4 w-4 text-primary" strokeWidth={2.5} aria-hidden />
  }
  if (state === 'invalid_format') {
    return <Mail className="h-4 w-4 text-destructive/70" strokeWidth={2.5} aria-hidden />
  }
  if (state === 'disposable_email') {
    return <Mail className="h-4 w-4 text-destructive" strokeWidth={2.5} aria-hidden />
  }
  return null
}

const OTP_LENGTH = 6
const SUCCESS_RESEND_COOLDOWN_SEC = 60

type SignInView = 'email' | 'verify-otp' | 'magic-link-sent'

function useResendCooldown() {
  const [untilMs, setUntilMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const secondsRemaining = useMemo(() => {
    if (!untilMs) return 0
    return Math.max(0, Math.ceil((untilMs - nowMs) / 1000))
  }, [untilMs, nowMs])

  useEffect(() => {
    if (!untilMs || untilMs <= Date.now()) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [untilMs])

  const startCooldown = useCallback((seconds: number) => {
    const sec = Math.max(1, Math.ceil(seconds))
    setUntilMs(Date.now() + sec * 1000)
    setNowMs(Date.now())
  }, [])

  const clearCooldown = useCallback(() => {
    setUntilMs(null)
  }, [])

  return { secondsRemaining, startCooldown, clearCooldown }
}

function OtpResendButton({
  resendTimer,
  loading,
  onResend,
  label = 'Resend sign-in link',
  className,
}: {
  resendTimer: number
  loading: boolean
  onResend: () => void
  label?: string
  className?: string
}) {
  const waiting = resendTimer > 0
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={loading && !waiting}
      disabled={waiting || loading}
      onClick={onResend}
      className={className}
    >
      {waiting ? `Resend in ${resendTimer}s` : label}
    </Button>
  )
}

function GoogleSignInButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="secondary"
      size="md"
      loading={loading}
      className="w-fit border-transparent bg-foreground font-bold text-background hover:bg-foreground/90 hover:text-background"
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  )
}

function SignInCardHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="text-left">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-1.5 mb-2 text-sm leading-relaxed tracking-tight text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function InAppBrowserSignInNotice() {
  const location = useLocation()
  const inApp = useMemo(() => detectInAppBrowser(), [])
  const [copied, setCopied] = useState(false)
  const show = useMemo(
    () => shouldShowInAppBrowserBanner(location.search),
    [location.search],
  )
  if (!show || !inApp.isInApp) return null

  const appLabel = inApp.label || 'This app'
  const isAndroid = isAndroidDevice()
  const instructions = getInAppBrowserBannerInstructions(inApp)

  return (
    <Alert className="mb-4 rounded-xl border-primary/25 bg-primary/5">
      <ExternalLink className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
      <AlertDescription className="space-y-2.5 text-xs leading-relaxed text-foreground">
        <p className="font-semibold">
          {appLabel}&apos;s browser can&apos;t finish sign-in reliably
        </p>
        <p className="text-foreground">{instructions}</p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          {isAndroid ? (
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="h-8"
              onClick={() => tryOpenInChrome(window.location.href)}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Open in Chrome
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={isAndroid ? 'secondary' : 'primary'}
            className="h-8"
            onClick={() => {
              void (async () => {
                const ok = await copyPageUrlToClipboard(window.location.href)
                if (!ok) return
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2400)
              })()
            }}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {copied ? 'Link copied' : 'Copy link'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

type SignInCardProps = {
  onSignedIn?: () => void
  /** Focus the email field on mount. Defaults to true. */
  autoFocus?: boolean
  /** Hide the email-step heading when a parent already provides one. */
  hideHeading?: boolean
}

export function SignInCard({ onSignedIn, autoFocus = true, hideHeading = false }: SignInCardProps) {
  const { user, profile, profileLoading, isAdmin, signInWithGoogle, signInWithEmailOtp, verifyEmailOtp } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [signInView, setSignInView] = useState<SignInView>('email')
  const [linkSent, setLinkSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<InputOTPHandle>(null)
  const { secondsRemaining: resendTimer, startCooldown } = useResendCooldown()

  const emailTrimmed = email.trim()
  const {
    helper: emailHelper,
    fieldStateBorder: emailFieldBorder,
    checkState: emailCheckState,
    canSubmitEmail,
  } = useEmailPresenceCheck(emailTrimmed, emailTrimmed.length > 0)
  const emailCheckStateRef = useRef(emailCheckState)
  emailCheckStateRef.current = emailCheckState
  const canSendEmailLink = canSubmitEmail
  const canVerifyOtp = otp.replace(/\D/g, '').length === OTP_LENGTH
  const emailBusy = sendLoading || verifyLoading

  useEffect(() => {
    const fromUrl = searchParams.get('ref')?.trim()
    if (fromUrl) storePendingReferralCode(fromUrl)
  }, [searchParams])

  useEffect(() => {
    captureWebsitePreviewTokenFromSearch(location.search)
  }, [location.search])

  useEffect(() => {
    if (!user?.id) return
    void applyPendingReferralIfAny(supabase)
  }, [user?.id])

  const goAfterSignIn = useCallback(() => {
    if (profileLoading) return
    onSignedIn?.()
    const fromState = (location.state as { from?: string } | null)?.from
    void (async () => {
      if (user?.id) {
        const claimed = await tryClaimPreviewAndNavigate(user.id, navigate)
        if (claimed) return
      }
      navigate(
        resolvePostLoginPath(location.search, fromState, {
          isAdmin,
          onboarding: profile?.onboarding,
        }),
        { replace: true },
      )
    })()
  }, [
    isAdmin,
    location.search,
    location.state,
    navigate,
    onSignedIn,
    profile?.onboarding,
    profileLoading,
    user?.id,
  ])

  useEffect(() => {
    if (user && !profileLoading) goAfterSignIn()
  }, [user, profileLoading, goAfterSignIn])

  useEffect(() => {
    if (signInView === 'verify-otp') {
      otpRef.current?.focus()
    } else if (signInView === 'email' && autoFocus) {
      emailRef.current?.focus()
    }
  }, [autoFocus, signInView])
  const waitForEmailPresence = async () => {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      const state = emailCheckStateRef.current
      if (
        state === 'exists' ||
        state === 'new_email' ||
        state === 'invalid_format' ||
        state === 'disposable_email'
      ) {
        return state
      }
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50)
      })
    }
    return emailCheckStateRef.current
  }

  const sendEmailLink = async () => {
    if (resendTimer > 0 || sendLoading || verifyLoading) return
    if (!isAllowedSignupEmail(emailTrimmed)) {
      setError(
        isDisposableEmail(emailTrimmed) ? DISPOSABLE_EMAIL_ERROR : 'Enter a valid email address.',
      )
      return
    }

    setError('')
    setSendLoading(true)

    // Prefer resolved presence; if still checking, wait then default to create-user.
    const state = await waitForEmailPresence()
    const isExistingAccount = state === 'exists'
    const isNewSignup = !isExistingAccount

    const { error: otpError } = await signInWithEmailOtp(emailTrimmed, {
      shouldCreateUser: isNewSignup,
    })
    setSendLoading(false)

    if (otpError) {
      const waitSec = parseEmailSendRateLimitSeconds(otpError)
      if (waitSec != null) {
        startCooldown(waitSec)
        if (linkSent || signInView === 'verify-otp' || signInView === 'magic-link-sent') {
          setSignInView(isExistingAccount ? 'verify-otp' : 'magic-link-sent')
        }
        return
      }
      setError(handleSupabaseError(otpError))
      return
    }

    setOtp('')
    setLinkSent(true)
    setSignInView(isExistingAccount ? 'verify-otp' : 'magic-link-sent')
    startCooldown(SUCCESS_RESEND_COOLDOWN_SEC)
    if (isExistingAccount) {
      // Focus the OTP's first cell.
      window.setTimeout(() => otpRef.current?.focus(), 120)
    }
  }

  const verifyOtpCode = async () => {
    if (verifyLoading || sendLoading) return
    setError('')
    setVerifyLoading(true)
    const code = otp.replace(/\D/g, '')
    const { error: verifyError } = await verifyEmailOtp(emailTrimmed, code)
    if (verifyError) {
      setVerifyLoading(false)
      setError(handleSupabaseError(verifyError))
      // Clear the partially-entered / wrong code and refocus the first cell
      // so the user can immediately retype without manual selection.
      setOtp('')
      otpRef.current?.focus(0)
      return
    }
    await applyPendingReferralIfAny(supabase)
    setVerifyLoading(false)
    goAfterSignIn()
  }

  const handleSendEmailLink = (e: React.FormEvent) => {
    e.preventDefault()
    void sendEmailLink()
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    void verifyOtpCode()
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const { error: googleError } = await signInWithGoogle()
    setGoogleLoading(false)
    if (googleError) setError(handleSupabaseError(googleError))
  }

  if (user) {
    return (
      <div className="py-6 text-center text-sm text-foreground" aria-live="polite">
        Signing you in…
      </div>
    )
  }

  return (
    <div id="sign-in" className="flex flex-col">
      {signInView === 'email' ? <InAppBrowserSignInNotice /> : null}

      {error ? (
        <Alert variant="destructive" className="mb-4 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      ) : null}

      {signInView === 'verify-otp' ? (
          <div className="flex flex-col" aria-label="Verify email sign-in">
            <SignInCardHeading
              title="Check your email"
              description={
                <>
                  We sent a 6-digit sign-in code to{' '}
                  <strong className="text-foreground">{emailTrimmed}</strong>. Enter it below.
                </>
              }
            />

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <InputOTP
                ref={otpRef}
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                ariaLabel="Verification code"
                className="gap-2"
              />

              <p className="text-center text-xs leading-snug text-muted-foreground">
                Check your spam folder.
              </p>

              <Button
                type="submit"
                variant="primary"
                size="md"
                full
                loading={verifyLoading}
                disabled={!canVerifyOtp || emailBusy}
                className="font-bold"
              >
                Verify and continue
              </Button>
            </form>

            <OtpResendButton
              resendTimer={resendTimer}
              loading={sendLoading}
              onResend={() => void sendEmailLink()}
              className="mt-2"
            />
          </div>
        ) : signInView === 'magic-link-sent' ? (
          <div className="flex flex-col" aria-label="Magic link sent">
            <SignInCardHeading
              title="Check your inbox"
              description={
                <>
                  We sent a magic link to{' '}
                  <strong className="text-foreground">{emailTrimmed}</strong>. <br /> Open it to finish
                  signup and start your 3-day free trial. <br /> <br />
                </>
              }
            />

            <p className="mb-5 text-xs leading-snug text-foreground">
              Check your spam folder if you don&apos;t see it.
            </p>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={sendLoading && resendTimer === 0}
                disabled={resendTimer > 0 || sendLoading}
                onClick={() => void sendEmailLink()}
                className="min-w-0 flex-1 font-bold"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend magic link'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={sendLoading}
                className="min-w-0 flex-1 font-bold"
                onClick={() => {
                  setSignInView('email')
                  setLinkSent(false)
                  setEmail('')
                  setOtp('')
                  setError('')
                }}
              >
                Use a different email
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {hideHeading ? null : (
              <SignInCardHeading
                title={
                  emailCheckState === 'exists'
                    ? 'Welcome Back'
                    : emailCheckState === 'new_email'
                      ? 'New email'
                      : 'Start your free trial'
                }
                description={
                  emailCheckState === 'exists'
                    ? 'We’ll email you a sign-in link.'
                    : emailCheckState === 'new_email'
                      ? 'We’ll send a magic link to create your account.'
                      : '3 days free access, cancel anytime.'
                }
              />
            )}

            <form onSubmit={handleSendEmailLink} className="flex w-full flex-col gap-4">
              <Input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Enter your email"
                aria-label="Email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText={emailTrimmed ? emailHelper.text : undefined}
                helperVariant={emailTrimmed ? emailHelper.variant : 'default'}
                fieldStateBorder={Boolean(emailTrimmed) && emailFieldBorder}
                rightSlot={<EmailPresenceStatusIcon state={emailCheckState} />}
                rightSlotClassName="pointer-events-none"
                wrapperClassName="w-full"
                className={cn(
                  emailCheckState === 'exists' && 'border-success/50',
                  emailCheckState === 'new_email' && 'border-primary/35',
                  emailCheckState === 'invalid_format' && 'border-destructive/50',
                  emailCheckState === 'disposable_email' && 'border-destructive/50',
                )}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                full
                loading={sendLoading && resendTimer === 0}
                disabled={!canSendEmailLink || emailBusy || resendTimer > 0 || googleLoading}
                className="font-bold"
              >
                {resendTimer > 0 ? `Send link in ${resendTimer}s` : 'Continue with Email'}
              </Button>
            </form>

            {(linkSent || resendTimer > 0) && emailCheckState === 'exists' ? (
              <OtpResendButton
                resendTimer={resendTimer}
                loading={sendLoading}
                onResend={() => void sendEmailLink()}
              />
            ) : null}

            <div className="flex w-full items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-[11px] font-medium text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>

            <div className="flex w-full justify-center">
              <GoogleSignInButton onClick={() => void handleGoogle()} loading={googleLoading} />
            </div>
          </div>
        )}
    </div>
  )
}

/** @deprecated Use SignInCard */
export const LandingSignInCard = SignInCard

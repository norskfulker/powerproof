import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { SignInCard } from '@/components/auth/SignInCard'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { resolvePostLoginPath } from '@/lib/authLanding'
import { Check } from '@/lib/icons'
import { LEGAL_PATHS } from '@/lib/legal'
import { cn } from '@/lib/utils'

const SIGN_IN_VALUE_POINTS = [
  'Validate demand before committing capital',
  'Turn research into an actionable roadmap',
  'Build with evidence, not assumptions',
] as const

export function SignInPage() {
  const { user, isLoading, profileLoading, isAdmin, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const next = searchParams.get('next') || searchParams.get('redirect')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#sign-in') {
      navigate({ pathname: '/sign-in', search: window.location.search }, { replace: true })
    }
  }, [navigate])

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      </div>
    )
  }

  if (user) {
    return (
      <Navigate
        to={resolvePostLoginPath(`?${searchParams.toString()}`, next, {
          isAdmin,
          onboarding: profile?.onboarding,
        })}
        replace
      />
    )
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]">
        <section className="relative hidden overflow-hidden bg-[#0b1220] px-10 py-12 text-white lg:flex lg:flex-col xl:px-16">
          <div className="absolute inset-0 powerproof-mesh-bg opacity-90" aria-hidden />
          <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#7c3aed]/25 blur-3xl" aria-hidden />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,18,32,0.86),rgba(11,18,32,0.28)_52%,rgba(11,18,32,0.72))]" aria-hidden />

          <div className="relative z-10 flex items-center justify-between">
            <BrandLogoLink
              to="/"
              className="h-auto px-0 [&_img]:brightness-0 [&_img]:invert"
              logoClassName="h-6 max-w-[8.5rem]"
            />
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
              Founder intelligence
            </span>
          </div>

          <div className="relative z-10 my-auto max-w-xl py-16">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary-200">
              Clarity before commitment
            </p>
            <h2 className="max-w-lg font-display text-4xl font-semibold leading-[1.06] tracking-[-0.04em] xl:text-6xl">
              Make the next move with proof behind it.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-white/65">
              PowerProof helps ambitious founders pressure-test opportunities, understand the market, and move from instinct to informed action.
            </p>

            <ul className="mt-9 space-y-4">
              {SIGN_IN_VALUE_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                    <Check className="h-3.5 w-3.5 text-primary-200" strokeWidth={2.5} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 text-[11px] text-white/40">
            <span>Research smarter. Build stronger.</span>
            <div className="flex items-center gap-3">
              <Link to={LEGAL_PATHS.privacy} className="hover:text-white/70">
                Privacy
              </Link>
              <Link to={LEGAL_PATHS.terms} className="hover:text-white/70">
                Terms
              </Link>
              <span>© {new Date().getFullYear()} PowerProof</span>
            </div>
          </div>
        </section>

        <main className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <BrandLogoLink
                className="h-auto px-0"
                logoClassName="h-6 max-w-[8.5rem]"
              />
            </div>

            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Welcome back
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
                Your next big idea starts here.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Sign in to continue exploring opportunities with clarity and confidence.
              </p>
            </div>

            <Card
              variant="default"
              padding="lg"
              radius="xl"
              className={cn(
                'w-full text-left',
                'rounded-2xl border-border-default/70 bg-card/90 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-24px_rgba(15,23,42,0.32)] backdrop-blur-sm',
              )}
            >
              <SignInCard />
            </Card>

            <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link
                to={LEGAL_PATHS.terms}
                className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to={LEGAL_PATHS.privacy}
                className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

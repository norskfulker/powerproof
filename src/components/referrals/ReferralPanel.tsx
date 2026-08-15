import { useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Copy, Gift, Link2, ShoppingBag, Sparkles, UserPlus, Users } from '@/lib/icons'
import { CreditsFigure, CreditsIcon } from '@/components/credits/CreditsIcon'
import { PageSection } from '@/components/page-shells'
import { toast } from '@/components/ui/sonner'
import { Button, Input } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { ApplyReferralCodeSection } from '@/components/referrals/ApplyReferralCodeSection'
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_PURCHASE_MULTIPLIER,
  REFERRAL_SIGNUP_REWARD,
} from '@/lib/referrals'
import { useMyReferrals, type ReferredUserRow } from '@/hooks/useMyReferrals'
import { useAuth } from '@/contexts/AuthContext'
import { cardPadding, cardSurface, cardSurfaceSunken } from '@/lib/cardSurface'
import { cn } from '@/lib/utils'

function formatReferredLabel(row: ReferredUserRow) {
  if (row.referred_display) return row.referred_display
  if (row.referred_email) return row.referred_email.split('@')[0]
  return 'New member'
}

function ReferralPanelSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className={cn(cardSurface, 'h-44 animate-pulse bg-muted/30')} />
      <div className="grid gap-3 layout-sm:grid-cols-2">
        <div className={cn(cardSurface, 'h-36 animate-pulse bg-muted/20')} />
        <div className={cn(cardSurface, 'h-36 animate-pulse bg-muted/20')} />
      </div>
      <div className={cn(cardSurface, 'h-52 animate-pulse bg-muted/20')} />
    </div>
  )
}

function ReferralRewardCard({
  icon,
  title,
  amount,
  detail,
  tone,
}: {
  icon: ReactNode
  title: string
  amount: string
  detail: string
  tone: 'success' | 'primary'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/25 bg-success-bg/50 text-success'
      : 'border-primary/25 bg-primary/5 text-primary'

  return (
    <div className={cn(cardSurface, cardPadding.md, 'flex h-full flex-col')}>
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-xl border',
          toneClass,
        )}
      >
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 font-display text-2xl tabular-nums tracking-normal text-foreground">{amount}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}

function ReferralShareHero({
  referralCode,
  referralLink,
  copied,
  onCopyCode,
  onCopyLink,
}: {
  referralCode: string | null
  referralLink: string | null
  copied: 'code' | 'link' | null
  onCopyCode: () => void
  onCopyLink: () => void
}) {
  return (
    <div className={cn(cardSurface, cardPadding.lg, 'grid gap-6 layout-lg:grid-cols-2')}>
      <div className="flex flex-col">
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Your referral code
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {REFERRAL_CODE_LENGTH}-letter code — letters only. Share it anywhere founders will see it.
        </p>
        <div className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-xl border border-border-subtle bg-bg-sunken px-4 py-3">
          <span className="font-mono text-2xl tracking-[0.22em] text-foreground layout-sm:text-3xl">
            {referralCode ?? '········'}
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-4 w-full layout-sm:w-auto"
          onClick={onCopyCode}
          disabled={!referralCode}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied === 'code' ? 'Code copied' : 'Copy code'}
        </Button>
      </div>

      <div className="flex flex-col border-t border-border-subtle pt-6 layout-lg:border-l layout-lg:border-t-0 layout-lg:pl-6 layout-lg:pt-0">
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" aria-hidden />
          Your referral link
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          One tap to share — friends can also enter your code on this page after signing up.
        </p>
        <Input readOnly value={referralLink ?? ''} className="text-sm" />
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-4 w-full layout-sm:w-auto"
          onClick={onCopyLink}
          disabled={!referralLink}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied === 'link' ? 'Link copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}

function ReferralStatsStrip({
  referralCount,
  totalEarned,
}: {
  referralCount: number
  totalEarned: number
}) {
  return (
    <div className="grid gap-3 layout-sm:grid-cols-2">
      <div className={cn(cardSurface, cardPadding.md, 'flex items-center gap-4')}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Users className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            People referred
          </p>
          <p className="font-display text-2xl tabular-nums tracking-normal text-foreground">{referralCount}</p>
        </div>
      </div>
      <div className={cn(cardSurface, cardPadding.md, 'flex items-center gap-4')}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success-bg/60 text-success">
          <CreditsIcon size={20} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Credits earned
          </p>
          <p className="font-display text-2xl tabular-nums tracking-normal text-foreground">
            <CreditsFigure amount={totalEarned} />
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReferralPanel() {
  const { user } = useAuth()
  const { referralCode, referralLink, referrals, loading, error } = useMyReferrals(user?.id)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const totalEarned = useMemo(
    () =>
      referrals.reduce(
        (sum, row) => sum + row.signup_reward_credits + row.purchase_reward_credits,
        0,
      ),
    [referrals],
  )

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      toast.success(kind === 'code' ? 'Referral code copied' : 'Referral link copied')
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Could not copy — try selecting the text manually')
    }
  }

  if (loading) {
    return <ReferralPanelSkeleton />
  }

  if (error) {
    return (
      <div className={cn(cardSurfaceSunken, cardPadding.md, 'text-sm text-destructive')}>{error}</div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <ReferralStatsStrip referralCount={referrals.length} totalEarned={totalEarned} />

      <ReferralShareHero
        referralCode={referralCode}
        referralLink={referralLink}
        copied={copied}
        onCopyCode={() => referralCode && void copyText(referralCode, 'code')}
        onCopyLink={() => referralLink && void copyText(referralLink, 'link')}
      />

      <ApplyReferralCodeSection />

      <PageSection
        kicker="Rewards"
        title="How you earn"
        description="Share your code or link. Credits land in your balance automatically — no manual claims."
      >
        <div className="grid gap-3 layout-sm:grid-cols-2">
          <ReferralRewardCard
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            title="When they sign up"
            amount={`+${REFERRAL_SIGNUP_REWARD} credits`}
            detail="A friend creates an account using your referral code or link."
            tone="success"
          />
          <ReferralRewardCard
            icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
            title="When they buy credits"
            amount={`${REFERRAL_PURCHASE_MULTIPLIER}× their purchase`}
            detail="On their first credit purchase, you receive double the credits they bought (one time)."
            tone="primary"
          />
        </div>
        <p
          className={cn(
            cardSurfaceSunken,
            cardPadding.sm,
            'mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground',
          )}
        >
          <CreditsIcon size={14} className="mt-0.5 shrink-0 text-primary" />
          Example: if they buy 500 credits, you get 1,000 credits once. Self-referrals are not allowed.
        </p>
      </PageSection>

      <PageSection
        kicker="Network"
        title="People you referred"
        description={
          referrals.length === 0
            ? 'Your referred founders will show up here once they sign up.'
            : `${referrals.length} ${referrals.length === 1 ? 'person' : 'people'} joined through your link or code.`
        }
      >
        {referrals.length === 0 ? (
          <div
            className={cn(
              cardSurfaceSunken,
              cardPadding.lg,
              'flex flex-col items-center border-dashed py-12 text-center',
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-card text-muted-foreground">
              <Users className="h-6 w-6" aria-hidden />
            </div>
            <p className="mt-4 text-base font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Copy your code or link above and share it with founders building in India.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-border-subtle bg-card">
            <table className="w-full min-w-[520px]">
              <thead className="border-b border-border-subtle bg-bg-sunken">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    You earned
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((row) => {
                  const earned = row.signup_reward_credits + row.purchase_reward_credits
                  return (
                    <tr key={row.id} className="border-b border-border-subtle/80 last:border-0">
                      <td className="px-4 py-3">
                        <div className="truncate text-sm font-medium text-foreground">
                          {formatReferredLabel(row)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(row.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={row.status === 'purchased' ? 'green' : 'secondary'}
                          size="sm"
                          className="capitalize"
                        >
                          {row.status === 'purchased' ? 'Purchased' : 'Registered'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {earned > 0 ? (
                          <span className="inline-flex items-center justify-end gap-1 text-sm font-medium text-success">
                            <Gift className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            +{earned}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  )
}

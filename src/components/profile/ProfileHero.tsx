import { Camera } from '@/lib/icons'

import { CountryFlagImg } from '@/components/CountryFlagImg'

type ProfileHeroProps = {
  displayName?: string | null
  email?: string | null
  avatarUrl?: string | null
  avatarInitial: string
  uploadingAvatar?: boolean
  countryCode: string
  countryName: string
  memberSinceLabel?: string
  onAvatarClick: () => void
}

export function ProfileHero({
  displayName,
  email,
  avatarUrl,
  avatarInitial,
  uploadingAvatar,
  countryCode,
  countryName,
  memberSinceLabel,
  onAvatarClick,
}: ProfileHeroProps) {
  const nameLabel = displayName?.trim() || 'Account'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle/80 bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.05)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/[0.12] via-primary/[0.04] to-transparent"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 p-5 layout-sm:flex-row layout-sm:items-start layout-sm:p-6">
        <button
          type="button"
          onClick={onAvatarClick}
          className="group relative mx-auto h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border-[3px] border-background bg-[hsl(var(--primary-soft))] shadow-md ring-1 ring-border-default layout-sm:mx-0"
          aria-label="Change profile photo"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-[hsl(var(--primary-ink))]">
              {uploadingAvatar ? '…' : avatarInitial}
            </span>
          )}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-foreground/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="h-5 w-5 text-background" aria-hidden />
            <span className="text-[10px] font-medium text-background">Change</span>
          </span>
        </button>

        <div className="min-w-0 flex-1 text-center layout-sm:text-left">
          <p className="text-lg font-semibold tracking-tight text-foreground layout-sm:text-xl">{nameLabel}</p>
          {email ? <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p> : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 layout-sm:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
              <CountryFlagImg code={countryCode} size={14} className="!border-0" />
              {countryName}
            </span>
            {memberSinceLabel ? (
              <span className="rounded-full border border-border-subtle bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                {memberSinceLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

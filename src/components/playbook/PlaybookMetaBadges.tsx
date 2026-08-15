import type { ReactNode } from 'react'
import { Briefcase, Building2, Calendar, Globe, MapPin, Swords, type RemixIcon } from '@/lib/icons'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { CountryFlagImg } from '@/components/CountryFlagImg'
import { getCountryCodeFromName } from '@/lib/countries'
import { warRoomCountryFlag } from '@/lib/warRoomCountries'
import { playbookMetaItems, type PlaybookMetaItem, type PlaybookMetaKind } from '@/lib/playbookDisplay'
import type { UserPlaybook } from '@/lib/playbookTypes'
import { cn } from '@/lib/utils'

const META_ICONS: Record<PlaybookMetaKind, RemixIcon> = {
  city: MapPin,
  industry: Building2,
  business_type: Briefcase,
  country: Globe,
}

const WAR_ROOM_BADGE_CLASS =
  'bg-red-500/10 text-red-600 dark:text-red-400'

const WAR_ROOM_ICON_CLASS = 'text-red-600 dark:text-red-400'

type Props = {
  playbook: Pick<UserPlaybook, 'city' | 'industry' | 'business_type' | 'country' | 'model_used'>
  /** ISO date string — shown as a separate badge when set. */
  dateIso?: string | null
  /** Shown when there is no location/meta data. */
  emptyLabel?: string
  variant?: 'default' | 'war-room'
  className?: string
}

function formatMetaDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function MetaBadge({
  icon: Icon,
  children,
  variant,
  leading,
}: {
  icon: RemixIcon
  children: ReactNode
  variant: 'default' | 'war-room'
  leading?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium',
        variant === 'war-room' ? WAR_ROOM_BADGE_CLASS : 'bg-muted/45 text-foreground/85',
      )}
    >
      {leading ?? (
        <Icon
          className={cn(
            'h-3 w-3 shrink-0',
            variant === 'war-room' ? WAR_ROOM_ICON_CLASS : 'opacity-70',
          )}
          aria-hidden
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  )
}

function MetaItemBadge({
  item,
  variant,
}: {
  item: PlaybookMetaItem
  variant: 'default' | 'war-room'
}) {
  if (item.kind === 'country') {
    const emoji = warRoomCountryFlag(item.value)
    if (variant === 'war-room' && emoji) {
      return (
        <MetaBadge icon={META_ICONS.country} variant={variant} leading={<span aria-hidden>{emoji}</span>}>
          {item.value}
        </MetaBadge>
      )
    }
    const code = getCountryCodeFromName(item.value)
    return (
      <MetaBadge
        icon={META_ICONS.country}
        variant={variant}
        leading={
          code ? (
            <CountryFlagImg code={code} size={12} className="!border-0" />
          ) : (
            <META_ICONS.country
              className={cn(
                'h-3 w-3 shrink-0',
                variant === 'war-room' ? WAR_ROOM_ICON_CLASS : 'opacity-70',
              )}
              aria-hidden
            />
          )
        }
      >
        {item.value}
      </MetaBadge>
    )
  }

  const Icon = META_ICONS[item.kind]
  return (
    <MetaBadge icon={Icon} variant={variant}>
      {item.value}
    </MetaBadge>
  )
}

export function PlaybookMetaBadges({
  playbook,
  dateIso,
  emptyLabel,
  variant = 'default',
  className,
}: Props) {
  const items = playbookMetaItems(playbook)
  const dateLabel = dateIso ? formatMetaDate(dateIso) : ''
  const modelUsed = playbook.model_used?.trim() || null
  const showEmpty = items.length === 0 && !dateLabel && !modelUsed && emptyLabel

  if (showEmpty) {
    return (
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        <MetaBadge icon={Swords} variant={variant}>
          {emptyLabel}
        </MetaBadge>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {items.map((item) => (
        <MetaItemBadge key={item.kind} item={item} variant={variant} />
      ))}
      {modelUsed ? <AiModelDisplay modelUsed={modelUsed} /> : null}
      {dateLabel ? (
        <MetaBadge icon={Calendar} variant={variant}>
          {dateLabel}
        </MetaBadge>
      ) : null}
    </div>
  )
}

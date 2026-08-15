import { Sparkles } from '@/lib/icons'

import type { DiscoverHeroWorkspacePanelChipAccent } from '@/components/discover/DiscoverHeroWorkspacePanelChips'
import { Button } from '@/components/ui/button'
import {
  HERO_FOOTER_CHIP_BUTTON_CLASS,
  HERO_FOOTER_CHIP_BUTTON_WAR_ROOM_CLASS,
  HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
} from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'

const ACCENT_ICON: Record<DiscoverHeroWorkspacePanelChipAccent, string> = {
  primary: 'text-primary',
  success: 'text-[hsl(var(--success))]',
  warRoom: 'text-red-600 dark:text-red-400',
}

export function SuggestIdeasButton({
  onClick,
  loading = false,
  disabled = false,
  accent = 'primary',
  label = 'Suggest ideas',
  variant = 'default',
  className,
  dataTour,
}: {
  onClick: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  accent?: DiscoverHeroWorkspacePanelChipAccent
  label?: string
  /** `composerFooter` matches Style / Market / Model / Help chips in the shared composer. */
  variant?: 'default' | 'composerFooter'
  className?: string
  dataTour?: string
}) {
  const busyLabel = loading ? 'Generating...' : label

  if (variant === 'composerFooter') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        data-tour={dataTour}
        disablePressAnimation
        className={cn(
          HERO_FOOTER_CHIP_BUTTON_CLASS,
          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
          accent === 'warRoom' && HERO_FOOTER_CHIP_BUTTON_WAR_ROOM_CLASS,
          // Height matches Select chip / Button `sm` (`h-9` → `sm:h-7`).
          'max-w-none shrink-0 shadow-none',
          'max-layout-sm:max-w-[8.5rem]',
          className,
        )}
        icon={
          <Sparkles
            className={cn(
              'h-3.5 w-3.5 max-layout-sm:h-4 max-layout-sm:w-4',
              ACCENT_ICON[accent],
            )}
            strokeWidth={2.25}
            aria-hidden
          />
        }
      >
        {busyLabel}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      data-tour={dataTour}
      disablePressAnimation
      className={cn(
        'relative h-auto min-h-0 max-w-full overflow-hidden rounded-xl border border-border-subtle/80',
        'bg-card px-3 py-2.5 text-[11px] font-semibold text-foreground/85 shadow-sm',
        'transition-[color,box-shadow,border-color,background-color]',
        accent === 'primary' &&
          'hover:border-primary/35 hover:bg-primary/5',
        accent === 'warRoom' &&
          'hover:border-red-200/60 hover:bg-red-500/[0.06] dark:hover:border-red-900/40',
        className,
      )}
      icon={
        <span
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md',
            accent === 'primary' && 'bg-primary/10 text-primary',
            accent === 'warRoom' && 'bg-red-500/10 text-red-600 dark:text-red-400',
          )}
        >
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
        </span>
      }
    >
      {busyLabel}
    </Button>
  )
}

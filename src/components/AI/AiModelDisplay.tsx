import {
  HeroComposerFooterChipContent,
  HERO_FOOTER_CHIP_ICON_CLASS,
} from '@/components/composer/HeroComposerFooterChipContent'
import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { POWERPROOF_SHORT_LOGO_URL } from '@/lib/brandLogos'
import { researchModelChipLabelClassName, researchModelDisplayLabel } from '@/lib/aiModels'
import {
  SELECT_CHIP_TRIGGER_CLASS,
  SELECT_CHIP_TRIGGER_DISABLED_CLASS,
} from '@/components/ui/select'
import { HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS } from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'

/** Read-only AI model chip — matches Select chip trigger (disabled) styling. */
export function AiModelDisplay({
  modelUsed,
  label: labelOverride,
  className,
}: {
  modelUsed?: string | null
  label?: string | null
  className?: string
}) {
  const label = labelOverride?.trim() || researchModelDisplayLabel(modelUsed)
  if (!label) return null

  return (
    <span
      aria-disabled
      className={cn(
        SELECT_CHIP_TRIGGER_CLASS,
        SELECT_CHIP_TRIGGER_DISABLED_CLASS,
        'pointer-events-none inline-flex w-fit max-w-full cursor-default overflow-visible active:scale-100',
        'border-border-subtle bg-muted/30 text-muted-foreground shadow-none hover:border-border-subtle hover:bg-muted/30 hover:shadow-none',
        HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS,
        className,
      )}
    >
      <HeroComposerFooterChipContent
        label={label}
        icon={
          <BrandLogoImg
            src={POWERPROOF_SHORT_LOGO_URL}
            alt=""
            height={14}
            className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'max-w-[0.875rem] object-contain object-center')}
          />
        }
        labelOverflowVisible
        labelClassName={researchModelChipLabelClassName}
      />
    </span>
  )
}

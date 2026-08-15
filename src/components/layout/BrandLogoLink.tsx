import { Link } from 'react-router-dom'
import type { MouseEventHandler } from 'react'
import {
  POWERPROOF_BRAND_LOGO_URL,
  POWERPROOF_SHORT_LOGO_URL,
} from '@/lib/brandLogos'
import { cn } from '@/lib/utils'

const BRAND_TITLE = 'PowerProof'

type BrandLogoLinkProps = {
  to?: string
  className?: string
  logoClassName?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  /** `short` uses the collapsed sidebar mark. */
  variant?: 'full' | 'short'
  'aria-label'?: string
}

export function BrandLogoLink({
  to = '/',
  className,
  logoClassName,
  onClick,
  variant = 'full',
  'aria-label': ariaLabel = BRAND_TITLE,
}: BrandLogoLinkProps) {
  const logoSrc =
    variant === 'short' ? POWERPROOF_SHORT_LOGO_URL : POWERPROOF_BRAND_LOGO_URL

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 shrink-0 items-center rounded-lg px-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <img
        src={logoSrc}
        alt=""
        className={cn(
          variant === 'short'
            ? 'h-7 w-7 max-w-[1.75rem] object-contain'
            : 'h-4 w-auto max-w-[7.5rem] shrink-0 object-contain object-left layout-sm:h-5 layout-sm:max-w-[8.5rem]',
          logoClassName,
        )}
        width={variant === 'short' ? 28 : 136}
        height={variant === 'short' ? 28 : 26}
      />
    </Link>
  )
}

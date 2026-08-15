import { cn } from '@/lib/utils'

/** ISO 3166-1 alpha-2 (lowercase for flagcdn). Works on Windows + macOS (PNG, not emoji). */
export function CountryFlagImg({
  code,
  size = 20,
  className,
}: {
  code: string
  size?: number
  className?: string
}) {
  const lower = code.trim().toLowerCase()
  if (!lower) return null
  const h = Math.round((size * 20) / 20)
  return (
    <img
      src={`https://flagcdn.com/w40/${lower}.png`}
      srcSet={`https://flagcdn.com/w80/${lower}.png 2x`}
      alt=""
      width={size}
      height={h}
      className={cn('inline-block shrink-0 rounded-full object-cover border border-border-subtle', className)}
      loading="lazy"
      decoding="async"
    />
  )
}

import { useState } from 'react'
import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-[12px] rounded-md',
  md: 'h-11 w-11 text-[15px] rounded-lg',
  lg: 'h-16 w-16 text-xl rounded-xl',
} as const

export function InvestorLogo({
  name,
  src,
  size = 'sm',
  className,
}: {
  name: string
  src: string | null
  size?: keyof typeof SIZE_CLASS
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const letter = (name.trim().charAt(0) || '?').toUpperCase()
  const sizeClass = SIZE_CLASS[size]
  const showImage = Boolean(src) && !broken

  if (!showImage) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary',
          sizeClass,
          className,
        )}
        aria-hidden
      >
        {letter}
      </span>
    )
  }

  return (
    <img
      src={src ?? ''}
      alt=""
      className={cn(
        'shrink-0 bg-muted/40 object-contain ring-1 ring-border-subtle',
        sizeClass,
        className,
      )}
      onError={() => setBroken(true)}
    />
  )
}

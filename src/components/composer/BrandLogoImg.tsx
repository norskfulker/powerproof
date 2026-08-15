import { cn } from '@/lib/utils'

export function BrandLogoImg({
  src,
  alt,
  className,
  height = 16,
}: {
  src: string
  alt: string
  className?: string
  height?: number
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('w-auto max-w-[4.75rem] shrink-0 object-contain object-left', className)}
      style={{ height }}
    />
  )
}

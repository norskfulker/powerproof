import { useReducedMotion } from 'framer-motion'
import FuzzyText from '@/components/FuzzyText'
import { cn } from '@/lib/utils'

export type Fuzzy404Size = 'hero' | 'lg' | 'md' | 'sm'

const SIZE_MAP: Record<Fuzzy404Size, string> = {
  hero: 'clamp(3rem, 12vw, 6rem)',
  lg: 'clamp(2.5rem, 10vw, 5rem)',
  md: 'clamp(2rem, 8vw, 4rem)',
  sm: 'clamp(1.5rem, 6vw, 2.5rem)',
}

type Fuzzy404Props = {
  size?: Fuzzy404Size
  className?: string
  enableHover?: boolean
}

export function Fuzzy404({ size = 'lg', className, enableHover = true }: Fuzzy404Props) {
  const prefersReducedMotion = useReducedMotion()
  const fontSize = SIZE_MAP[size]

  return (
    <div className={cn('flex justify-center text-foreground', className)}>
      <span className="sr-only">404</span>
      {prefersReducedMotion ? (
        <span className="font-black leading-none" style={{ fontSize }}>
          404
        </span>
      ) : (
        <FuzzyText
          fontSize={fontSize}
          fontWeight={900}
          color="currentColor"
          enableHover={enableHover}
          baseIntensity={0.2}
          hoverIntensity={0.5}
          aria-hidden
        >
          404
        </FuzzyText>
      )}
    </div>
  )
}

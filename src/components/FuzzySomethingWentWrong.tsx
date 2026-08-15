import { useReducedMotion } from 'framer-motion'
import FuzzyText from '@/components/FuzzyText'
import { cn } from '@/lib/utils'

export type FuzzySomethingWentWrongSize = 'lg' | 'md' | 'sm'

const SIZE_MAP: Record<FuzzySomethingWentWrongSize, string> = {
  lg: 'clamp(1.25rem, 4vw, 1.75rem)',
  md: 'clamp(1.125rem, 3.5vw, 1.5rem)',
  sm: 'clamp(1rem, 3vw, 1.25rem)',
}

type FuzzySomethingWentWrongProps = {
  size?: FuzzySomethingWentWrongSize
  className?: string
  enableHover?: boolean
}

export function FuzzySomethingWentWrong({
  size = 'md',
  className,
  enableHover = true,
}: FuzzySomethingWentWrongProps) {
  const prefersReducedMotion = useReducedMotion()
  const fontSize = SIZE_MAP[size]

  return (
    <div className={cn('inline-flex text-foreground', className)}>
      <span className="sr-only">Something went wrong</span>
      {prefersReducedMotion ? (
        <span className="font-normal leading-snug" style={{ fontSize }}>
          Something went wrong
        </span>
      ) : (
        <FuzzyText
          fontSize={fontSize}
          fontWeight={400}
          color="currentColor"
          enableHover={enableHover}
          baseIntensity={0.18}
          hoverIntensity={0.45}
          aria-hidden
        >
          Something went wrong
        </FuzzyText>
      )}
    </div>
  )
}

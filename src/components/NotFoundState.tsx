import type { ReactNode } from 'react'
import { Fuzzy404, type Fuzzy404Size } from '@/components/Fuzzy404'
import { cn } from '@/lib/utils'

type NotFoundStateProps = {
  message: string
  children?: ReactNode
  size?: Fuzzy404Size
  className?: string
  messageClassName?: string
  enableHover?: boolean
}

export function NotFoundState({
  message,
  children,
  size = 'lg',
  className,
  messageClassName,
  enableHover = true,
}: NotFoundStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <Fuzzy404 size={size} className="mb-4" enableHover={enableHover} />
      <p
        className={cn(
          'max-w-md text-pretty text-muted-foreground',
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-[15px]' : 'text-xl',
          messageClassName,
        )}
      >
        {message}
      </p>
      {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
    </div>
  )
}

import { useEffect, useRef, useState, type ElementType } from 'react'
import { getTypingDelay, type TypingSpeed } from '@/hooks/useTypingQueue'
import { cn } from '@/lib/utils'

type ScratchRetypeTextProps = {
  text: string
  /** Change when tick / completion toggles to replay scratch type-in. */
  animateKey: string | number | boolean
  speed?: TypingSpeed
  className?: string
  as?: ElementType
}

function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const handler = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduceMotion
}

/** Types text in on mount/key change; erases then re-types when the key toggles. */
export function ScratchRetypeText({
  text,
  animateKey,
  speed = 'fast',
  className,
  as: Tag = 'span',
}: ScratchRetypeTextProps) {
  const [displayed, setDisplayed] = useState(text)
  const reduceMotion = usePrefersReducedMotion()
  const skipAnimationRef = useRef(true)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const clearTimers = () => {
      for (const id of timersRef.current) clearTimeout(id)
      timersRef.current.clear()
    }

    if (!text) {
      setDisplayed('')
      return clearTimers
    }

    if (reduceMotion) {
      setDisplayed(text)
      return clearTimers
    }

    if (skipAnimationRef.current) {
      skipAnimationRef.current = false
      setDisplayed(text)
      return clearTimers
    }

    let cancelled = false

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timersRef.current.delete(id)
        if (!cancelled) fn()
      }, delay)
      timersRef.current.add(id)
    }

    clearTimers()
    setDisplayed('')

    const typeIn = () => {
      let index = 0

      const typeNext = () => {
        if (cancelled) return
        if (index >= text.length) return
        index += 1
        setDisplayed(text.slice(0, index))
        schedule(typeNext, getTypingDelay(text.slice(0, index), speed, 'char'))
      }

      typeNext()
    }

    const eraseThenType = () => {
      let length = text.length

      const eraseNext = () => {
        if (cancelled) return
        if (length <= 0) {
          typeIn()
          return
        }
        length -= 1
        setDisplayed(text.slice(0, length))
        schedule(
          eraseNext,
          Math.max(12, getTypingDelay(text.slice(0, length), speed, 'char') * 0.55),
        )
      }

      eraseNext()
    }

    eraseThenType()

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [text, animateKey, speed, reduceMotion])

  return (
    <Tag className={cn('min-w-0', className)}>
      {displayed || '\u00a0'}
    </Tag>
  )
}

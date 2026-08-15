import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { useTypingQueue, type TypingGranularity, type TypingSpeed } from '@/hooks/useTypingQueue'

/** Theme index tones for long-form typewriter (no ad-hoc hex). */
export const TYPEWRITER_INDEX_COLORS = [
  'hsl(var(--foreground))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--text-tertiary))',
] as const

function useTypewriterScrollGate(
  startWhenInView: boolean,
  text: string,
  resetKey: string | number | undefined,
  rootMargin: string,
  threshold: number,
) {
  const elRef = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState(!startWhenInView)

  useEffect(() => {
    if (!startWhenInView) {
      setActive(true)
      return
    }
    setActive(false)
  }, [startWhenInView, resetKey])

  useLayoutEffect(() => {
    if (!startWhenInView) return
    const el = elRef.current
    if (!el) return
    let disconnected = false
    const scrollRoot = document.querySelector('#app-main-scroll')
    const root =
      scrollRoot instanceof HTMLElement ? scrollRoot : null
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit && !disconnected) {
          setActive(true)
          disconnected = true
          io.disconnect()
        }
      },
      { root, rootMargin, threshold },
    )
    io.observe(el)
    return () => {
      disconnected = true
      io.disconnect()
    }
  }, [startWhenInView, text, resetKey, rootMargin, threshold])

  return { elRef, active }
}

export function useTypewriterDisplayedText(
  text: string,
  speed: TypingSpeed = 'normal',
  onComplete?: () => void,
  granularity: TypingGranularity = 'char',
): string {
  const [displayed, setDisplayed] = useState('')
  const finishedTextRef = useRef<string | null>(null)
  const textRef = useRef(text)
  textRef.current = text
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const doneRef = useRef(onComplete)
  doneRef.current = onComplete

  const stableOnDone = useCallback(() => {
    finishedTextRef.current = textRef.current
    doneRef.current?.()
  }, [])

  const typingOpts = useMemo(
    () => ({ onDone: stableOnDone, granularity }),
    [stableOnDone, granularity],
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const handler = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const onChar = useCallback((chunk: string) => {
    setDisplayed((prev) => prev + chunk)
  }, [])

  const { enqueue, clear } = useTypingQueue(onChar, speed ?? 'normal', typingOpts)

  useEffect(() => {
    if (reduceMotion) {
      setDisplayed(text)
      finishedTextRef.current = text
      doneRef.current?.()
      return
    }

    if (text.length === 0) {
      if (finishedTextRef.current) {
        setDisplayed(finishedTextRef.current)
      } else {
        clear()
        setDisplayed('')
      }
      return
    }

    if (text === finishedTextRef.current) {
      setDisplayed(text)
      return
    }

    finishedTextRef.current = null
    clear()
    setDisplayed('')
    enqueue(text)
    return () => {
      clear()
    }
  }, [text, reduceMotion, clear, enqueue])

  return displayed
}

export type TypewriterTextProps = {
  text: string
  speed?: TypingSpeed
  className?: string
  style?: CSSProperties
  as?: ElementType
  onComplete?: () => void
  /** When true, typing starts once the element intersects the viewport. */
  startWhenInView?: boolean
  inViewRootMargin?: string
  inViewThreshold?: number
  /** Bump when route/slug changes to re-arm the scroll gate. */
  inViewResetKey?: string | number
  /** Cycles `TYPEWRITER_INDEX_COLORS` for subtle hierarchy (sections). */
  colorIndex?: number
  /** Reveal whole words at a time instead of individual characters. */
  byWord?: boolean
}

/**
 * Reveals text with the same queue timing as the shared typing queue (`useTypingQueue` / `getTypingDelay`).
 * Respects `prefers-reduced-motion: reduce` (shows full text immediately).
 */
export function TypewriterText({
  text,
  speed = 'normal',
  className,
  style,
  as: Component = 'span',
  onComplete,
  startWhenInView = false,
  inViewRootMargin = '0px 0px -8% 0px',
  inViewThreshold = 0.14,
  inViewResetKey,
  colorIndex,
  byWord = false,
}: TypewriterTextProps) {
  const { elRef, active } = useTypewriterScrollGate(
    startWhenInView,
    text,
    inViewResetKey,
    inViewRootMargin,
    inViewThreshold,
  )
  const effectiveText = active ? text : ''
  const displayed = useTypewriterDisplayedText(
    effectiveText,
    speed,
    onComplete,
    byWord ? 'word' : 'char',
  )
  const mergedStyle = useMemo(() => {
    if (colorIndex == null) return style
    const c = TYPEWRITER_INDEX_COLORS[((colorIndex % TYPEWRITER_INDEX_COLORS.length) + TYPEWRITER_INDEX_COLORS.length) % TYPEWRITER_INDEX_COLORS.length]
    return { ...style, color: c }
  }, [style, colorIndex])
  return (
    <Component
      {...(startWhenInView ? { ref: elRef } : {})}
      className={className}
      style={mergedStyle}
    >
      {displayed}
    </Component>
  )
}

export type TypewriterMarkdownProps = {
  text: string
  speed?: TypingSpeed
  className?: string
  onComplete?: () => void
  components?: Components
  startWhenInView?: boolean
  inViewRootMargin?: string
  inViewThreshold?: number
  inViewResetKey?: string | number
  colorIndex?: number
  byWord?: boolean
}

/** Markdown body with the same reveal timing as TypewriterText (partial markdown may render mid-stream). */
export function TypewriterMarkdown({
  text,
  speed = 'normal',
  className,
  onComplete,
  components,
  startWhenInView = false,
  inViewRootMargin = '0px 0px -8% 0px',
  inViewThreshold = 0.14,
  inViewResetKey,
  colorIndex,
  byWord = false,
}: TypewriterMarkdownProps) {
  const { elRef, active } = useTypewriterScrollGate(
    startWhenInView,
    text,
    inViewResetKey,
    inViewRootMargin,
    inViewThreshold,
  )
  const effectiveText = active ? text : ''
  const displayed = useTypewriterDisplayedText(
    effectiveText,
    speed,
    onComplete,
    byWord ? 'word' : 'char',
  )
  const colorStyle = useMemo(() => {
    if (colorIndex == null) return undefined
    const c =
      TYPEWRITER_INDEX_COLORS[
        ((colorIndex % TYPEWRITER_INDEX_COLORS.length) + TYPEWRITER_INDEX_COLORS.length) %
          TYPEWRITER_INDEX_COLORS.length
      ]
    return { color: c } as CSSProperties
  }, [colorIndex])
  return (
    <div ref={elRef} className={className} style={colorStyle}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {displayed}
      </ReactMarkdown>
    </div>
  )
}

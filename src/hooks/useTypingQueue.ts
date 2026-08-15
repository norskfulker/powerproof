import { useRef, useCallback } from 'react'

export type TypingSpeed = 'slow' | 'normal' | 'fast' | 'overview'
export type TypingGranularity = 'char' | 'word'

function typingSpeedFactor(speed: TypingSpeed): number {
  if (speed === 'overview') return 0.12
  if (speed === 'fast') return 0.6
  if (speed === 'slow') return 1.35
  return 1
}

export function getTypingDelay(
  acc: string,
  speed: TypingSpeed = 'normal',
  granularity: TypingGranularity = 'char',
): number {
  if (speed === 'overview' && granularity === 'word') {
    const lastChar = acc.slice(-1)
    if (lastChar === '.' || lastChar === '!' || lastChar === '?') return 72
    if (lastChar === '\n') return 48
    if (lastChar === ' ') return 28
    return 20
  }

  if (speed === 'overview') {
    const lines = acc.split('\n')
    const lastLine = lines[lines.length - 1] ?? ''

    if (/^---[A-Z]+---$/.test(lastLine.trim()) || lastLine.trim() === '---END---') return 0

    let inBlock = false
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i].trim()
      if (line === '---END---') {
        inBlock = false
        break
      }
      if (/^---[A-Z]+---$/.test(line)) {
        inBlock = true
        break
      }
    }

    if (inBlock) return 0

    const lastChar = acc.slice(-1)
    if (lastChar === '.' || lastChar === '!' || lastChar === '?') return 8
    if (lastChar === ',' || lastChar === ';' || lastChar === ':') return 4
    if (lastChar === '\n') return 3
    if (lastChar === ' ') return 1
    return 1
  }

  const factor = typingSpeedFactor(speed)
  const lines = acc.split('\n')
  const lastLine = lines[lines.length - 1] ?? ''

  if (/^---[A-Z]+---$/.test(lastLine.trim()) || lastLine.trim() === '---END---') return 0

  let inBlock = false
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim()
    if (line === '---END---') {
      inBlock = false
      break
    }
    if (/^---[A-Z]+---$/.test(line)) {
      inBlock = true
      break
    }
  }

  if (inBlock) return Math.round(2 * factor)

  const lastChar = acc.slice(-1)
  if (lastChar === '.' || lastChar === '!' || lastChar === '?') return Math.round(110 * factor)
  if (lastChar === ',' || lastChar === ';' || lastChar === ':') return Math.round(55 * factor)
  if (lastChar === '\n') return Math.round(35 * factor)
  if (lastChar === ' ') return Math.round(10 * factor)

  return Math.round(18 * factor)
}

function tokenizeTypingQueue(text: string, granularity: TypingGranularity): string[] {
  if (granularity === 'word') {
    return text.match(/\S+\s*/g) ?? (text.length > 0 ? [text] : [])
  }
  return text.split('')
}

export function useTypingQueue(
  onChar: (char: string) => void,
  speed: TypingSpeed = 'normal',
  opts?: { onDone?: () => void; granularity?: TypingGranularity },
) {
  const granularity = opts?.granularity ?? 'char'
  const queue = useRef<string[]>([])
  const isRunning = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accumulated = useRef('')

  const processNext = useCallback(() => {
    if (queue.current.length === 0) {
      isRunning.current = false
      opts?.onDone?.()
      return
    }

    const char = queue.current.shift() as string
    accumulated.current += char
    onChar(char)

    const delay = getTypingDelay(accumulated.current, speed, granularity)
    if (queue.current.length > 0) {
      timerRef.current = setTimeout(processNext, delay)
    } else {
      isRunning.current = false
      opts?.onDone?.()
    }
  }, [onChar, speed, granularity, opts])

  const enqueue = useCallback(
    (text: string) => {
      queue.current.push(...tokenizeTypingQueue(text, granularity))
      if (!isRunning.current) {
        isRunning.current = true
        timerRef.current = setTimeout(
          processNext,
          speed === 'overview' ? 0 : speed === 'fast' ? 10 : speed === 'slow' ? 26 : 18,
        )
      }
    },
    [processNext, speed, granularity],
  )

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (queue.current.length > 0) {
      const remaining = queue.current.join('')
      queue.current = []
      accumulated.current += remaining
      onChar(remaining)
    }
    isRunning.current = false
    opts?.onDone?.()
  }, [onChar])

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    queue.current = []
    accumulated.current = ''
    isRunning.current = false
  }, [])

  return { enqueue, flush, clear, isRunning }
}

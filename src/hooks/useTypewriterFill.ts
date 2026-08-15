import { useCallback, useEffect, useRef, useState } from 'react'
import { useTypingQueue, type TypingSpeed } from '@/hooks/useTypingQueue'

function focusInputAtEnd(inputId: string | undefined, length: number) {
  if (!inputId) return
  const el = document.getElementById(inputId)
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  el.focus()
  el.setSelectionRange(length, length)
}

export function useTypewriterFill(speed: TypingSpeed = 'fast') {
  const accumulated = useRef('')
  const updateRef = useRef<((value: string) => void) | null>(null)
  const inputIdRef = useRef<string | undefined>(undefined)
  const onCompleteRef = useRef<(() => void) | undefined>(undefined)
  const [isTyping, setIsTyping] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const handler = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const onChar = useCallback((chunk: string) => {
    accumulated.current += chunk
    updateRef.current?.(accumulated.current)
    focusInputAtEnd(inputIdRef.current, accumulated.current.length)
  }, [])

  const handleDone = useCallback(() => {
    setIsTyping(false)
    onCompleteRef.current?.()
  }, [])

  const { enqueue, clear } = useTypingQueue(onChar, speed, { onDone: handleDone, granularity: 'char' })

  const cancel = useCallback(() => {
    clear()
    accumulated.current = ''
    setIsTyping(false)
  }, [clear])

  const fill = useCallback(
    (text: string, onUpdate: (value: string) => void, opts?: { inputId?: string; onComplete?: () => void }) => {
      const trimmed = text.trim()
      if (!trimmed) return

      cancel()
      updateRef.current = onUpdate
      inputIdRef.current = opts?.inputId
      onCompleteRef.current = opts?.onComplete

      if (reduceMotion) {
        onUpdate(trimmed)
        requestAnimationFrame(() => focusInputAtEnd(opts?.inputId, trimmed.length))
        opts?.onComplete?.()
        return
      }

      accumulated.current = ''
      onUpdate('')
      setIsTyping(true)
      requestAnimationFrame(() => focusInputAtEnd(opts?.inputId, 0))
      enqueue(trimmed)
    },
    [cancel, enqueue, reduceMotion],
  )

  return { fill, cancel, isTyping }
}

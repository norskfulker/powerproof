import {
  useLayoutEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { cn } from '@/lib/utils'
import './ScrollStack.css'

type CardTransform = {
  translateY: number
  scale: number
  rotation: number
  blur: number
}

export type ScrollStackItemProps = {
  children: ReactNode
  itemClassName?: string
  style?: CSSProperties
}

export function ScrollStackItem({ children, itemClassName = '', style }: ScrollStackItemProps) {
  return (
    <div className={cn('scroll-stack-card', itemClassName)} style={style}>
      {children}
    </div>
  )
}

export type ScrollStackProps = {
  children: ReactNode
  className?: string
  itemDistance?: number
  itemScale?: number
  itemStackDistance?: number
  stackPosition?: string
  scaleEndPosition?: string
  baseScale?: number
  scaleDuration?: number
  rotationAmount?: number
  blurAmount?: number
  useWindowScroll?: boolean
  onStackComplete?: () => void
}

export default function ScrollStack({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete,
}: ScrollStackProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stackCompletedRef = useRef(false)
  const scrollTickRef = useRef<number | null>(null)
  const cardsRef = useRef<HTMLElement[]>([])
  const cardLayoutTopsRef = useRef<number[]>([])
  const endLayoutTopRef = useRef(0)
  const lastTransformsRef = useRef<Map<number, CardTransform>>(new Map())
  const isUpdatingRef = useRef(false)
  const isActiveRef = useRef(true)

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0
    if (scrollTop > end) return 1
    return (scrollTop - start) / (end - start)
  }, [])

  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight
    }
    return parseFloat(String(value))
  }, [])

  const getScrollTop = useCallback(() => {
    if (useWindowScroll) return window.scrollY
    return scrollerRef.current?.scrollTop ?? 0
  }, [useWindowScroll])

  const getContainerHeight = useCallback(() => {
    if (useWindowScroll) return window.innerHeight
    return scrollerRef.current?.clientHeight ?? 0
  }, [useWindowScroll])

  const measureCardLayoutTop = useCallback(
    (card: HTMLElement, scrollTop: number) => {
      const savedTransform = card.style.transform
      const savedFilter = card.style.filter
      card.style.transform = 'none'
      card.style.filter = 'none'

      const top = useWindowScroll
        ? card.getBoundingClientRect().top + scrollTop
        : card.offsetTop

      card.style.transform = savedTransform
      card.style.filter = savedFilter
      return top
    },
    [useWindowScroll],
  )

  const measureLayout = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const scrollTop = getScrollTop()

    cardsRef.current.forEach((card, i) => {
      cardLayoutTopsRef.current[i] = measureCardLayoutTop(card, scrollTop)
    })

    const endElement = scroller.querySelector('.scroll-stack-end') as HTMLElement | null
    if (endElement) {
      endLayoutTopRef.current = measureCardLayoutTop(endElement, scrollTop)
    }
  }, [getScrollTop, measureCardLayoutTop])

  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length || isUpdatingRef.current || !isActiveRef.current) return

    isUpdatingRef.current = true

    const scrollTop = getScrollTop()
    const containerHeight = getContainerHeight()
    const stackPositionPx = parsePercentage(stackPosition, containerHeight)
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight)
    const endElementTop = endLayoutTopRef.current

    cardsRef.current.forEach((card, i) => {
      const cardTop = cardLayoutTopsRef.current[i] ?? 0
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i
      const triggerEnd = cardTop - scaleEndPositionPx
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i
      const pinEnd = endElementTop - containerHeight / 2

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd)
      const targetScale = baseScale + i * itemScale
      const scale = 1 - scaleProgress * (1 - targetScale)
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0

      let blur = 0
      if (blurAmount) {
        let topCardIndex = 0
        for (let j = 0; j < cardsRef.current.length; j++) {
          const jCardTop = cardLayoutTopsRef.current[j] ?? 0
          const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j
          }
        }

        if (i < topCardIndex) {
          blur = Math.max(0, (topCardIndex - i) * blurAmount)
        }
      }

      let translateY = 0
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i
      }

      const newTransform: CardTransform = {
        translateY,
        scale,
        rotation,
        blur,
      }

      const lastTransform = lastTransformsRef.current.get(i)
      const hasChanged =
        !lastTransform ||
        lastTransform.translateY !== newTransform.translateY ||
        lastTransform.scale !== newTransform.scale ||
        lastTransform.rotation !== newTransform.rotation ||
        lastTransform.blur !== newTransform.blur

      if (hasChanged) {
        card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`
        card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : ''
        lastTransformsRef.current.set(i, newTransform)
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true
          onStackComplete?.()
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false
        }
      }
    })

    isUpdatingRef.current = false
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollTop,
    getContainerHeight,
  ])

  const scheduleUpdate = useCallback(() => {
    if (scrollTickRef.current !== null) return
    scrollTickRef.current = requestAnimationFrame(() => {
      scrollTickRef.current = null
      updateCardTransforms()
    })
  }, [updateCardTransforms])

  const handleScroll = useCallback(() => {
    if (!isActiveRef.current) return
    scheduleUpdate()
  }, [scheduleUpdate])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('.scroll-stack-card'))
    cardsRef.current = cards
    cardLayoutTopsRef.current = new Array(cards.length).fill(0)
    const transformsCache = lastTransformsRef.current

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`
      }
      card.style.transformOrigin = 'top center'
      card.style.backfaceVisibility = 'hidden'
      card.style.willChange = 'transform'
      card.style.transform = 'translate3d(0, 0, 0)'
    })

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        measureLayout()
        scheduleUpdate()
      }, 150)
    }

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        measureLayout()
        scheduleUpdate()
      }, 100)
    })
    resizeObserver.observe(scroller)
    cards.forEach((card) => resizeObserver.observe(card))

    const observer = new IntersectionObserver(
      ([entry]) => {
        isActiveRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          measureLayout()
          scheduleUpdate()
        }
      },
      { rootMargin: '50% 0px', threshold: 0 },
    )
    observer.observe(scroller)

    measureLayout()
    scheduleUpdate()

    if (useWindowScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleResize, { passive: true })
    } else {
      scroller.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleResize, { passive: true })
    }

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      if (useWindowScroll) {
        window.removeEventListener('scroll', handleScroll)
      } else {
        scroller.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (scrollTickRef.current !== null) {
        cancelAnimationFrame(scrollTickRef.current)
      }
      stackCompletedRef.current = false
      isActiveRef.current = false
      cardsRef.current = []
      cardLayoutTopsRef.current = []
      transformsCache.clear()
      isUpdatingRef.current = false
    }
  }, [
    itemDistance,
    useWindowScroll,
    measureLayout,
    scheduleUpdate,
    handleScroll,
  ])

  return (
    <div
      className={cn(
        'scroll-stack-scroller',
        useWindowScroll && 'scroll-stack-scroller--window',
        className,
      )}
      ref={scrollerRef}
    >
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" aria-hidden />
      </div>
    </div>
  )
}

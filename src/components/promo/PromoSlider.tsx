import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  type TransitionEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from '@/lib/icons'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface PromoPanel {
  id: string
  title: string
  image_url: string
  route: string | null
  position: number
}

export type PromoSliderVariant = 'default' | 'explore'

export type PromoSliderProps = {
  /** `explore`: full-width row, 3:1 frame (1200×400 artwork), one-up infinite carousel (Index). */
  variant?: PromoSliderVariant
}

/** Explore carousel: frame matches 1200×400 promo assets (3:1). */
const EXPLORE_VISIBLE = 1
const EXPLORE_AUTO_MS = 30_000
const EXPLORE_GAP_PX = 8

function padPanelsToMin(panels: PromoPanel[], min: number): PromoPanel[] {
  if (panels.length === 0) return []
  if (panels.length >= min) return panels
  return Array.from({ length: min }, (_, i) => ({
    ...panels[i % panels.length],
    id: `${panels[i % panels.length].id}__pad${i}`,
  }))
}

function buildInfiniteTrack(panels: PromoPanel[], v: number): { ext: PromoPanel[]; keys: string[] } {
  const n = panels.length
  if (n === 0) return { ext: [], keys: [] }
  const head = panels.slice(-v)
  const tail = panels.slice(0, v)
  const ext = [...head, ...panels, ...tail]
  const keys = ext.map((p, i) => `${p.id}~${i}`)
  return { ext, keys }
}

export const PromoSlider = ({ variant = 'default' }: PromoSliderProps) => {
  const [panels, setPanels] = useState<PromoPanel[]>([])
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase
      .from('promotional_panels')
      .select('id, title, image_url, route, position')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPanels((data ?? []) as any))
  }, [])

  const total = panels.length

  const isExplore = variant === 'explore'

  /** Default slider: one card per slide on all breakpoints. */
  const pageCount = isExplore ? 1 : Math.max(1, total)

  useEffect(() => {
    if (isExplore) return
    setCurrent((c) => (pageCount > 0 ? c % pageCount : 0))
  }, [isExplore, pageCount])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + pageCount) % pageCount)
  }, [pageCount])
  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % pageCount)
  }, [pageCount])

  useEffect(() => {
    if (isExplore) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (!paused && pageCount > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % pageCount)
      }, 5000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isExplore, paused, pageCount])

  const handleClick = useCallback(
    (panel: PromoPanel) => {
      if (!panel.route) return
      let to = panel.route.trim()
      if (to.startsWith('/opportunity/')) {
        to = `/opportunities/${to.slice('/opportunity/'.length)}`
      }
      if (to === window.location.pathname) return
      to.startsWith('/') ? navigate(to) : window.open(to, '_blank')
    },
    [navigate],
  )

  if (!total) return null

  if (isExplore) {
    return (
      <ExplorePromoCarousel
        panels={panels}
        paused={paused}
        setPaused={setPaused}
        onPanelClick={handleClick}
      />
    )
  }

  const slideSpring = { type: 'spring' as const, stiffness: 300, damping: 30 }

  return (
    <div className="mt-3 w-full min-w-0 px-3 sm:px-4 md:px-6">
      <div
        className="group relative mb-6 w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <motion.div
          className="flex p-3"
          style={{ width: `${total * 100}%` }}
          initial={false}
          animate={{ x: `-${(current * 100) / total}%` }}
          transition={slideSpring}
        >
          {panels.map((p) => (
            <div
              key={p.id}
              className="box-border min-w-0 shrink-0 px-1.5"
              style={{ width: `${100 / total}%` }}
            >
              <motion.div
                whileHover={{ scale: 0.995 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                onClick={() => handleClick(p)}
                className={`relative h-[180px] w-full overflow-hidden rounded-xl bg-bg-sunken sm:h-[240px] ${
                  p.route ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="h-full w-full select-none object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 to-muted px-4 text-center">
                    <div className="text-[15px] font-semibold text-foreground">{p.title}</div>
                    {p.route ? (
                      <div className="text-[12px] font-medium text-primary">Tap to open</div>
                    ) : null}
                  </div>
                )}
              </motion.div>
            </div>
          ))}
        </motion.div>

        {pageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous promos"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/35 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next promos"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/35 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}

        {pageCount > 1 ? (
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrent(i)
                }}
                className={`h-1.5 rounded-full border-0 p-0 transition-all duration-300 ${
                  current === i ? 'w-6 bg-background' : 'w-1.5 bg-background/40'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type ExploreProps = {
  panels: PromoPanel[]
  paused: boolean
  setPaused: (v: boolean) => void
  onPanelClick: (p: PromoPanel) => void
}

function ExplorePromoCarousel({ panels, paused, setPaused, onPanelClick }: ExploreProps) {
  const V = EXPLORE_VISIBLE
  /** Need at least V+1 items so prepend = last V items is not the whole list (infinite jump math). */
  const displayPanels = useMemo(
    () => padPanelsToMin(panels, Math.max(V + 1, panels.length)),
    [panels, V],
  )
  const n = displayPanels.length
  const { ext, keys } = useMemo(() => buildInfiniteTrack(displayPanels, V), [displayPanels])

  const startIndex = V
  const [index, setIndex] = useState(startIndex)
  const [noTransition, setNoTransition] = useState(false)
  const indexRef = useRef(index)
  indexRef.current = index

  const vpRef = useRef<HTMLDivElement>(null)
  const [slideW, setSlideW] = useState(0)

  useLayoutEffect(() => {
    const el = vpRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const sw = (w - EXPLORE_GAP_PX * (V - 1)) / V
      setSlideW(sw > 0 ? sw : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [V])

  const stride = slideW > 0 ? slideW + EXPLORE_GAP_PX : 0

  useEffect(() => {
    setIndex(startIndex)
    setNoTransition(true)
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoTransition(false))
    })
    return () => cancelAnimationFrame(t)
  }, [ext.length, startIndex])

  const jumpTo = useCallback((newIndex: number) => {
    setNoTransition(true)
    setIndex(newIndex)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoTransition(false))
    })
  }, [])

  const handleTrackTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== 'transform') return
      if (e.target !== e.currentTarget) return
      const i = indexRef.current
      if (i < V) jumpTo(i + n)
      else if (i >= V + n) jumpTo(i - n)
    },
    [V, n, jumpTo],
  )

  const stepNext = useCallback(() => {
    setIndex((i) => i + 1)
  }, [])
  const stepPrev = useCallback(() => {
    setIndex((i) => i - 1)
  }, [])

  useEffect(() => {
    if (n <= 1) return
    if (paused) return
    const id = window.setInterval(() => {
      stepNext()
    }, EXPLORE_AUTO_MS)
    return () => clearInterval(id)
  }, [paused, n, stepNext])

  const dotActive = n > 0 ? (((index - V) % n) + n) % n : 0
  const showNav = n > 1 && slideW > 0

  return (
    <div className="w-full min-w-0 px-3 pb-6 sm:px-4 sm:pb-8 md:px-6 md:pb-10">
      <div
        className="flex w-full items-center gap-2 sm:gap-3 md:gap-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button
          type="button"
          aria-label="Previous promos"
          disabled={!showNav}
          onClick={stepPrev}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-card text-foreground shadow-sm transition-[background,transform] hover:bg-muted disabled:pointer-events-none disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </button>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 md:grid md:grid-cols-1 md:grid-rows-1 md:gap-0">
          <div
            ref={vpRef}
            className="relative aspect-[3/1] min-h-0 w-full min-w-0 shrink-0 overflow-hidden rounded-2xl border border-border-subtle bg-card md:col-start-1 md:row-start-1"
          >
            <div
              className="flex h-full gap-2"
              style={{
                width:
                  slideW > 0 ? ext.length * slideW + (ext.length - 1) * EXPLORE_GAP_PX : undefined,
                transform: stride > 0 ? `translateX(${-index * stride}px)` : undefined,
                transition: noTransition ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {ext.map((p, i) => (
                <div
                  key={keys[i]}
                  className="box-border h-full shrink-0 overflow-hidden"
                  style={{
                    width: slideW > 0 ? slideW : `${100 / V}%`,
                  }}
                >
                  <div
                    className="h-full w-full overflow-hidden rounded-xl bg-muted"
                    style={{ cursor: p.route ? 'pointer' : 'default' }}
                    onClick={() => onPanelClick(p)}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="block h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 to-muted px-4 text-center">
                        <div className="text-[15px] font-semibold text-foreground">{p.title}</div>
                        {p.route ? (
                          <div className="text-[12px] font-medium text-primary">Tap to open</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showNav ? (
            <div className="flex flex-none justify-center md:pointer-events-none md:col-start-1 md:row-start-1 md:z-[2] md:self-end md:pb-4">
              <div className="flex gap-1.5 rounded-full border border-border-subtle bg-card px-2 py-1.5 shadow-sm md:pointer-events-auto md:border-0 md:bg-black/35 md:shadow-none md:backdrop-blur-sm">
                {Array.from({ length: n }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to promo ${i + 1}`}
                    aria-current={i === dotActive ? 'true' : undefined}
                    onClick={() => jumpTo(V + i)}
                    className={`h-1.5 rounded-full border-0 p-0 transition-[width,background] duration-300 ${
                      i === dotActive
                        ? 'w-[22px] bg-foreground md:bg-background/95'
                        : 'w-[7px] bg-foreground/35 md:bg-background/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Next promos"
          disabled={!showNav}
          onClick={stepNext}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-card text-foreground shadow-sm transition-[background,transform] hover:bg-muted disabled:pointer-events-none disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </button>
      </div>
    </div>
  )
}

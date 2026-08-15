import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from 'react'

import { useLocation } from 'react-router-dom'

import { ChevronDown } from '@/lib/icons'

import {

  Collapsible,

  CollapsibleContent,

  CollapsibleTrigger,

} from '@/components/ui/collapsible'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { getAppScrollRoot } from '@/lib/appScrollRoot'

import { focusOpportunityNavAnchor } from '@/lib/opportunitySectionNav'

import { withNavIconClass } from '@/lib/iconClassNames'

import { sidebarNavItemClassName } from '@/lib/sidebarNavStyles'

import { cn } from '@/lib/utils'



export type OpportunitySectionNavItem = {

  id: string

  label: string

  icon?: ElementType<{ className?: string; strokeWidth?: number }>

}



export type OpportunitySectionNavProps = {

  sections: OpportunitySectionNavItem[]

  variant?: 'mobile' | 'rail'

  collapsed?: boolean

  className?: string

}



function scrollToAnchor(id: string) {

  focusOpportunityNavAnchor(id)

}



function OnThisPageTrigger({

  open,

  variant,

}: {

  open: boolean

  variant: 'mobile' | 'rail'

}) {

  return (

    <CollapsibleTrigger

      className={cn(

        'flex w-full items-center justify-between gap-2 border-0 bg-transparent text-left transition-colors',

        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1',

        variant === 'mobile'

          ? 'py-0 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground'

          : 'px-3 py-0 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground',

      )}

      aria-expanded={open}

    >

      <span>On this page</span>

      <ChevronDown

        className={cn(

          'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',

          open && 'rotate-180',

        )}

        strokeWidth={2.5}

        aria-hidden

      />

    </CollapsibleTrigger>

  )

}



const NAV_SCROLL_HIDE_CLASS =

  'overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

const NAV_COLLAPSED_LIST_CLASS =

  'flex min-h-0 flex-1 flex-col items-center gap-1 overflow-hidden px-1 py-1'



export function OpportunitySectionNav({

  sections,

  variant = 'rail',

  collapsed = false,

  className,

}: OpportunitySectionNavProps) {

  const location = useLocation()

  const isMarketTestPage = location.pathname.startsWith('/market-test/')

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections])

  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)

  const [navOpen, setNavOpen] = useState(!isMarketTestPage)

  const scrollRef = useRef<HTMLDivElement>(null)



  useEffect(() => {

    if (!sectionIds.length) return



    const root = getAppScrollRoot()

    const elements = sectionIds

      .map((id) => document.getElementById(id))

      .filter((el): el is HTMLElement => Boolean(el))



    if (!elements.length) return



    const visible = new Map<string, number>()



    const observer = new IntersectionObserver(

      (entries) => {

        for (const entry of entries) {

          const id = entry.target.id

          if (!id) continue

          if (entry.isIntersecting) {

            visible.set(id, entry.intersectionRatio)

          } else {

            visible.delete(id)

          }

        }



        if (visible.size === 0) return

        let bestId: string | null = null

        let bestRatio = -1

        for (const id of sectionIds) {

          const ratio = visible.get(id)

          if (ratio != null && ratio >= bestRatio) {

            bestRatio = ratio

            bestId = id

          }

        }

        if (bestId) setActiveId(bestId)

      },

      {

        root,

        rootMargin: '-18% 0px -52% 0px',

        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],

      },

    )



    for (const el of elements) observer.observe(el)

    return () => observer.disconnect()

  }, [sectionIds])



  useEffect(() => {

    if (variant !== 'mobile' || !activeId || !scrollRef.current) return

    const activeButton = scrollRef.current.querySelector<HTMLButtonElement>(

      `[data-section-id="${activeId}"]`,

    )

    activeButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })

  }, [activeId, variant])



  const onNavigate = useCallback((id: string) => {

    setActiveId(id)

    scrollToAnchor(id)

  }, [])



  if (sections.length < 2) return null



  if (variant === 'mobile') {

    return (

      <Collapsible open={navOpen} onOpenChange={setNavOpen}>

        <nav aria-label="On this page" className={cn('py-2', className)}>

          <OnThisPageTrigger open={navOpen} variant="mobile" />

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">

            <div

              ref={scrollRef}

              className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

            >

              {sections.map((section) => {

                const active = section.id === activeId

                const Icon = section.icon

                return (

                  <button

                    key={section.id}

                    type="button"

                    data-section-id={section.id}

                    onClick={() => onNavigate(section.id)}

                    aria-current={active ? 'true' : undefined}

                    className={cn(

                      sidebarNavItemClassName(active),

                      'w-auto shrink-0 rounded-full',

                    )}

                  >

                    {Icon

                      ? withNavIconClass(

                          <Icon strokeWidth={2.25} aria-hidden />,

                          active,

                        )

                      : null}

                    {section.label}

                  </button>

                )

              })}

            </div>

          </CollapsibleContent>

        </nav>

      </Collapsible>

    )

  }



  if (variant === 'rail' && collapsed) {

    return (

      <nav aria-label="On this page" className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>

        <ul className={NAV_COLLAPSED_LIST_CLASS}>

          {sections.map((section) => {

            const active = section.id === activeId

            const Icon = section.icon

            const button = (

              <button

                type="button"

                onClick={() => onNavigate(section.id)}

                aria-current={active ? 'true' : undefined}

                aria-label={section.label}

                className={cn(sidebarNavItemClassName(active, { iconOnly: true, denseIcons: true }), 'mx-auto')}

              >

                {Icon ? (

                  withNavIconClass(<Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden />, active, 'md')

                ) : (

                  <span className="text-[10px] font-bold">{section.label.slice(0, 1)}</span>

                )}

              </button>

            )



            return (

              <li key={section.id} className="flex w-full justify-center">

                <Tooltip delayDuration={200}>

                  <TooltipTrigger asChild>{button}</TooltipTrigger>

                  <TooltipContent side="right" sideOffset={8} className="text-xs">

                    {section.label}

                  </TooltipContent>

                </Tooltip>

              </li>

            )

          })}

        </ul>

      </nav>

    )

  }


  return (

    <nav aria-label="On this page" className={cn('flex min-h-0 flex-1 flex-col', className)}>

      <ul className={cn('flex min-h-0 flex-1 flex-col gap-0.5 px-1.5 py-1.5', NAV_SCROLL_HIDE_CLASS)}>

        {sections.map((section) => {

          const active = section.id === activeId

          const Icon = section.icon

          return (

            <li key={section.id}>

              <button

                type="button"

                onClick={() => onNavigate(section.id)}

                aria-current={active ? 'true' : undefined}

                className={sidebarNavItemClassName(active)}

              >

                {Icon

                  ? withNavIconClass(<Icon strokeWidth={2.25} aria-hidden />, active)

                  : null}

                <span className="opp-section-nav-label min-w-0 flex-1 truncate">{section.label}</span>

              </button>

            </li>

          )

        })}

      </ul>

    </nav>

  )

}



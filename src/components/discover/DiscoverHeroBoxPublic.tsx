import { useState } from 'react'
import type { ReactNode } from 'react'
import { LineChart } from '@/lib/icons'
import type { RemixIcon } from '@/lib/icons'

import { DiscoverHeroBox, DiscoverHeroBoxStack } from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroOpportunityChips } from '@/components/discover/DiscoverHeroOpportunityChips'
import { DiscoverHeroWorkspaceSectionTitle } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import { cn } from '@/lib/utils'

type DiscoverHeroBoxPublicProps = {
  compact?: boolean
  className?: string
  bodyClassName?: string
  /**
   * Override section label. Used as the empty-state / aria-label. When
   * `showHeader` is true, also rendered as the section heading above the cards.
   * Defaults to "Your search results"; "No results found" when search is empty.
   */
  label?: string
  /** Optional trailing chrome in the section title row (after search + filters). */
  trailing?: ReactNode
  /** Admin preview: render an empty catalog (no opportunities). */
  forceEmpty?: boolean
  /**
   * Render the section heading above the cards. Defaults to false. The research
   * room's public catalog passes `true` to surface "Trending Opportunities Right
   * Now" above the discovery grid; the regular Discover/Opportunities mode
   * doesn't render the heading.
   */
  showHeader?: boolean
  /** Optional icon for the section title. Defaults to LineChart. */
  icon?: RemixIcon
}

/**
 * Public catalog segment — separate from "My research".
 * Hosts discover opportunities rendered as cards.
 */
export function DiscoverHeroBoxPublic({
  compact = false,
  className,
  bodyClassName,
  label = 'Your search results',
  forceEmpty = false,
  showHeader = false,
  icon = LineChart,
}: DiscoverHeroBoxPublicProps) {
  const [searchQuery] = useState('')

  return (
    <DiscoverHeroOpportunityChips
      searchQuery={searchQuery}
      compact={compact}
      forceEmpty={forceEmpty}
    >
      {({ content, isSearching, loading, isEmpty }) => {
        const noResults = isSearching && !loading && isEmpty

        return (
          <DiscoverHeroBox
            unstyled
            ariaLabel={noResults ? 'No results found' : label}
            className={cn('shrink-0', className)}
            bodyClassName={bodyClassName}
          >
            <div className="w-full min-w-0" data-tour="discover-hero-box-public">
              {showHeader ? (
                <DiscoverHeroWorkspaceSectionTitle
                  label={label}
                  accent="primary"
                  className="py-3"
                  icon={icon}
                />
              ) : null}
              {noResults ? (
                <p className="px-0.5 py-6 text-center font-display text-base font-medium tracking-normal text-foreground layout-sm:text-lg">
                  No results found
                </p>
              ) : (
                content
              )}
            </div>
          </DiscoverHeroBox>
        )
      }}
    </DiscoverHeroOpportunityChips>
  )
}

/**
 * Stack helper — public catalog above, My research (or other private workspace) below.
 */
export function DiscoverHeroPrivateThenPublicStack({
  privateWorkspace,
  publicBox,
  className,
}: {
  privateWorkspace: ReactNode
  publicBox: ReactNode
  className?: string
}) {
  return (
    <DiscoverHeroBoxStack className={cn('gap-3 layout-sm:gap-4', className)}>
      {publicBox}
      {privateWorkspace}
    </DiscoverHeroBoxStack>
  )
}

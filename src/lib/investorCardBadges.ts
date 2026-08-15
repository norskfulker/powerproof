import {
  formatInvestorCheckSize,
  formatInvestorFirmType,
  formatInvestorLabel,
} from '@/lib/investorsDisplay'
import type { Investor } from '@/types/investors'

export type InvestorCardBadge = {
  key: string
  label: string
  variant: 'green' | 'amber' | 'blue' | 'purple' | 'gray'
}

type InvestorBadgeSource = Pick<
  Investor,
  | 'firm_type'
  | 'is_india_focused'
  | 'hq_country'
  | 'founded_year'
  | 'stages'
  | 'sectors'
  | 'check_size_min_usd'
  | 'check_size_max_usd'
>

export function collectInvestorCardBadges(investor: InvestorBadgeSource): InvestorCardBadge[] {
  const badges: InvestorCardBadge[] = []
  const seen = new Set<string>()

  const add = (key: string, label: string, variant: InvestorCardBadge['variant'] = 'gray') => {
    const normalized = label.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    badges.push({ key, label, variant })
  }

  if (investor.firm_type) {
    add(`firm-${investor.firm_type}`, formatInvestorFirmType(investor.firm_type), 'purple')
  }

  if (investor.is_india_focused) {
    add('india-focused', 'India focused', 'amber')
  }

  if (investor.hq_country) {
    const hq = investor.hq_country.trim()
    const hqIsIndia = /india/i.test(hq)
    if (!(investor.is_india_focused && hqIsIndia)) {
      add(`hq-${hq}`, hq)
    }
  }

  if (investor.founded_year) {
    add(`founded-${investor.founded_year}`, `Founded ${investor.founded_year}`)
  }

  const checkSize = formatInvestorCheckSize(
    investor.check_size_min_usd,
    investor.check_size_max_usd,
  )
  if (checkSize !== '—') {
    add('check-size', checkSize, 'green')
  }

  for (const stage of (investor.stages ?? []).slice(0, 3)) {
    add(`stage-${stage}`, formatInvestorLabel(stage), 'blue')
  }

  for (const sector of (investor.sectors ?? []).slice(0, 3)) {
    add(`sector-${sector}`, formatInvestorLabel(sector))
  }

  return badges
}

/** Compact badges for public landing teasers (max 3). */
export function collectInvestorLandingTeaserBadges(
  investor: InvestorBadgeSource,
): InvestorCardBadge[] {
  const badges: InvestorCardBadge[] = []
  const seen = new Set<string>()

  const add = (key: string, label: string, variant: InvestorCardBadge['variant'] = 'gray') => {
    const normalized = label.trim().toLowerCase()
    if (!normalized || seen.has(normalized) || badges.length >= 3) return
    seen.add(normalized)
    badges.push({ key, label, variant })
  }

  if (investor.firm_type) {
    add(`firm-${investor.firm_type}`, formatInvestorFirmType(investor.firm_type), 'purple')
  }

  if (investor.is_india_focused) {
    add('india-focused', 'India focused', 'amber')
  } else if (investor.hq_country) {
    add(`hq-${investor.hq_country}`, investor.hq_country.trim())
  }

  const checkSize = formatInvestorCheckSize(
    investor.check_size_min_usd,
    investor.check_size_max_usd,
  )
  if (checkSize !== '—') {
    add('check-size', checkSize, 'green')
  } else if (investor.stages?.[0]) {
    add(`stage-${investor.stages[0]}`, formatInvestorLabel(investor.stages[0]), 'blue')
  }

  return badges
}

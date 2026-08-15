import { deriveMarginPct } from '@/lib/opportunityDetailUtils'
import { fpMoneyFieldToUsd } from '@/lib/financialProjections'

function oppColumnToUsd(value: unknown): number {
  return fpMoneyFieldToUsd(value)
}

export function calculateBreakeven(opportunity: any, userMonthlyRevenue?: number) {
  const fp = opportunity.financial_projections

  const rawInitial = fp?.assumptions?.initial_investment
  const totalInvestmentUsd =
    rawInitial !== null && rawInitial !== undefined && rawInitial !== ''
      ? fpMoneyFieldToUsd(rawInitial)
      : oppColumnToUsd(opportunity.setup_max)

  const revLowUsd = (() => {
    if (userMonthlyRevenue != null && Number.isFinite(userMonthlyRevenue) && userMonthlyRevenue > 0) {
      return userMonthlyRevenue
    }
    if (fp?.monthly?.revenue_low != null && fp?.monthly?.revenue_low !== '') {
      const usd = fpMoneyFieldToUsd(fp.monthly.revenue_low)
      if (usd > 0) return usd
    }
    const m = oppColumnToUsd(opportunity.monthly_rev_min)
    if (m > 0) return m
    return totalInvestmentUsd * 0.12
  })()

  const cogsPct = fp?.monthly?.cogs_pct ?? (100 - (deriveMarginPct(opportunity) || 50))
  const opexUsd =
    fp?.monthly?.opex != null && fp?.monthly?.opex !== ''
      ? fpMoneyFieldToUsd(fp.monthly.opex)
      : revLowUsd * 0.15
  const rentUsd =
    fp?.monthly?.rent != null && fp?.monthly?.rent !== '' ? fpMoneyFieldToUsd(fp.monthly.rent) : 0

  const monthlyNetProfit = revLowUsd * (1 - cogsPct / 100) - opexUsd - rentUsd

  if (monthlyNetProfit <= 0) return null

  const months = Math.ceil(totalInvestmentUsd / monthlyNetProfit)

  return {
    months,
    label: months <= 12 ? `${months} months` : `${(months / 12).toFixed(1)} years`,
    monthlyNetProfit,
    totalInvestment: totalInvestmentUsd,
    note: 'Based on minimum expected revenue',
  }
}

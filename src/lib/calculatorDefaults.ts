export type CalculatorBillingModel = 'per_unit_daily' | 'subscription_cumulative'

export const CALCULATOR_DAYS_PER_MONTH = 30

export type CalculatorConfig = {
  billing_model?: CalculatorBillingModel | null
  cogs_label?: string
  cogs_slider_min?: number
  cogs_slider_max?: number
  revenue?: {
    avg_bill?: number
    units_per_day_low?: number
    units_per_day_high?: number
    driver_label?: string
    default_daily_customers?: number
    default_avg_bill?: number
    default_working_days?: number
    unit_label?: string
    bill_label?: string
  }
  emi?: {
    default_loan_amount?: number
    default_interest_rate?: number
    default_tenure_months?: number
    interest_rate_pct?: number
  }
  _derived?: boolean
  [key: string]: unknown
}

export type FinancialProjections = {
  monthly?: {
    revenue_low?: number
    revenue_high?: number
    opex?: number
    cogs_pct?: number
    [key: string]: unknown
  }
  assumptions?: {
    loan_amount?: number
    loan_interest_rate_pct?: number
    loan_tenure_options?: number[]
    initial_investment?: number
    [key: string]: unknown
  }
  _unit?: string
  [key: string]: unknown
}

export type ResolvedCalculatorDefaults = {
  dailyCustomers: number
  avgBill: number
  workingDays: number
  /** Label for the units-per-day driver (from calculator_config.revenue.driver_label). */
  unitLabel: string
  billLabel: string
  unitsPerDayLow: number
  unitsPerDayHigh: number
  monthlyRevLow: number
  monthlyRevHigh: number
  cogsPct: number
  monthlyOpex: number
  loanAmount: number
  interestRate: number
  tenureMonths: number
}

function finitePositive(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function getCalculatorBillingModel(
  config: CalculatorConfig | null | undefined,
): CalculatorBillingModel {
  const model = config?.billing_model
  return model === 'subscription_cumulative' ? 'subscription_cumulative' : 'per_unit_daily'
}

export function isSubscriptionBilling(config: CalculatorConfig | null | undefined): boolean {
  return getCalculatorBillingModel(config) === 'subscription_cumulative'
}

/** Monthly revenue from avg ticket and unit/subscriber count (USD, whole dollars). */
export function monthlyRevenueFromUnits(
  avgBill: number,
  units: number,
  billingModel: CalculatorBillingModel = 'per_unit_daily',
): number {
  const bill = Number(avgBill)
  const n = Number(units)
  if (!Number.isFinite(bill) || bill <= 0 || !Number.isFinite(n) || n <= 0) return 0
  if (billingModel === 'subscription_cumulative') {
    return Math.round(bill * n)
  }
  return Math.round(bill * n * CALCULATOR_DAYS_PER_MONTH)
}

export function formatUnitSliderLabel(driverLabel: string, isSubscription: boolean): string {
  const label = driverLabel.trim() || 'units'
  return isSubscription ? `Active ${label}` : `${label} per day`
}

export function formatScenarioDriverLabel(
  units: number,
  driverLabel: string,
  isSubscription: boolean,
): string {
  const label = driverLabel.trim() || 'units'
  if (units <= 0) return label
  return isSubscription ? `${units} ${label}` : `${units} ${label} per day`
}

/** Parse opportunity money column as positive USD (whole dollars). */
function oppUsd(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n) || n <= 0) return 0
  return n
}

/** Fallback avg ticket (USD) when calculator_config has no bill. */
export function deriveAvgBill(opportunity?: { monthly_rev_min?: number | null } | null): number {
  const min = oppUsd(opportunity?.monthly_rev_min)
  if (min <= 0) return 10
  return Math.max(1, Math.round(min / 26 / 15))
}

/**
 * Defaults for the revenue estimator. All money fields are **USD** (whole dollars).
 * Prefer `opportunity` table columns over legacy `financial_projections` money fields.
 */
export function resolveCalculatorDefaults(
  config: CalculatorConfig | null | undefined,
  fp: FinancialProjections | null | undefined,
  opportunity?: {
    monthly_rev_min?: number | null
    monthly_rev_max?: number | null
    setup_max?: number | null
  },
): ResolvedCalculatorDefaults {
  const rev = config?.revenue
  const billingModel = getCalculatorBillingModel(config)
  const isSubscription = billingModel === 'subscription_cumulative'
  const oppRevMin = oppUsd(opportunity?.monthly_rev_min)
  const oppRevMax = oppUsd(opportunity?.monthly_rev_max)
  const setupUsd = oppUsd(opportunity?.setup_max)

  const avgBillFromConfig =
    rev?.avg_bill != null && Number.isFinite(Number(rev.avg_bill)) && Number(rev.avg_bill) > 0
      ? Number(rev.avg_bill)
      : rev?.default_avg_bill != null &&
          Number.isFinite(Number(rev.default_avg_bill)) &&
          Number(rev.default_avg_bill) > 0
        ? Number(rev.default_avg_bill)
        : 0
  const avgBill = finitePositive(avgBillFromConfig > 0 ? avgBillFromConfig : deriveAvgBill(opportunity), 10)

  const workingDays = finitePositive(Number(rev?.default_working_days), 26)

  const unitsLowConfigured =
    rev?.units_per_day_low != null && Number.isFinite(Number(rev.units_per_day_low)) && Number(rev.units_per_day_low) > 0
      ? Math.round(Number(rev.units_per_day_low))
      : null
  const unitsHighConfigured =
    rev?.units_per_day_high != null &&
    Number.isFinite(Number(rev.units_per_day_high)) &&
    Number(rev.units_per_day_high) > 0
      ? Math.round(Number(rev.units_per_day_high))
      : null

  const dailyFromConfig = rev?.default_daily_customers
  const configUnits =
    dailyFromConfig != null && Number.isFinite(Number(dailyFromConfig)) ? Number(dailyFromConfig) : 50

  const impliedMonthly = finitePositive(
    monthlyRevenueFromUnits(avgBill, configUnits, billingModel),
    5000,
  )

  const dailyFromRev =
    oppRevMin > 0 && avgBill > 0
      ? Math.max(
          1,
          isSubscription
            ? Math.round(oppRevMin / avgBill)
            : workingDays > 0
              ? Math.round(oppRevMin / workingDays / avgBill)
              : Math.round(oppRevMin / CALCULATOR_DAYS_PER_MONTH / avgBill),
        )
      : null

  let unitsPerDayLow: number
  let unitsPerDayHigh: number

  if (unitsLowConfigured != null && unitsHighConfigured != null) {
    unitsPerDayLow = Math.min(unitsLowConfigured, unitsHighConfigured)
    unitsPerDayHigh = Math.max(unitsLowConfigured, unitsHighConfigured)
  } else if (unitsLowConfigured != null) {
    unitsPerDayLow = unitsLowConfigured
    unitsPerDayHigh = Math.max(unitsLowConfigured + 1, Math.round(unitsLowConfigured * 1.5))
  } else if (unitsHighConfigured != null) {
    unitsPerDayHigh = unitsHighConfigured
    unitsPerDayLow = Math.max(1, Math.round(unitsHighConfigured * 0.4))
  } else {
    const base =
      dailyFromConfig != null && Number.isFinite(Number(dailyFromConfig))
        ? Math.round(Number(dailyFromConfig))
        : dailyFromRev ?? 50
    unitsPerDayLow = Math.max(1, Math.round(base * 0.5))
    unitsPerDayHigh = Math.max(unitsPerDayLow + 1, Math.round(base * 1.5))
  }

  if (unitsPerDayHigh <= unitsPerDayLow) {
    unitsPerDayHigh = unitsPerDayLow + 1
  }

  const midpointUnits = Math.round((unitsPerDayLow + unitsPerDayHigh) / 2)
  const dailyCustomers = finitePositive(
    dailyFromConfig != null && Number.isFinite(Number(dailyFromConfig))
      ? Math.round(Number(dailyFromConfig))
      : midpointUnits,
    midpointUnits,
  )

  const driverLabel =
    (rev?.driver_label && String(rev.driver_label).trim()) ||
    (rev?.unit_label && String(rev.unit_label).trim()) ||
    'units'
  const unitLabel = formatUnitSliderLabel(driverLabel, isSubscription)
  const billLabel = (rev?.bill_label && String(rev.bill_label).trim()) || 'Avg ticket'

  let monthlyRevLow = oppRevMin > 0 ? oppRevMin : impliedMonthly
  monthlyRevLow = finitePositive(monthlyRevLow, impliedMonthly > 0 ? impliedMonthly : 5000)

  let monthlyRevHigh = oppRevMax > 0 ? oppRevMax : monthlyRevLow * 2
  if (!Number.isFinite(monthlyRevHigh) || monthlyRevHigh < monthlyRevLow) {
    monthlyRevHigh = monthlyRevLow * 2
  }

  const cogsMinCfg = config?.cogs_slider_min
  const cogsMaxCfg = config?.cogs_slider_max
  const cogsFromSliders =
    cogsMinCfg != null &&
    cogsMaxCfg != null &&
    Number.isFinite(Number(cogsMinCfg)) &&
    Number.isFinite(Number(cogsMaxCfg)) &&
    Number(cogsMaxCfg) > Number(cogsMinCfg)
      ? Math.round((Number(cogsMinCfg) + Number(cogsMaxCfg)) / 2)
      : null

  const cogsPctRaw = fp?.monthly?.cogs_pct
  const cogsPct =
    cogsFromSliders != null && Number.isFinite(cogsFromSliders)
      ? cogsFromSliders
      : cogsPctRaw != null && Number.isFinite(Number(cogsPctRaw))
        ? Number(cogsPctRaw)
        : 45

  const monthlyOpex = monthlyRevLow * 0.15

  const emiLoan = config?.emi?.default_loan_amount
  const loanFromSetup = setupUsd > 0 ? Math.round(setupUsd * 0.6) : 18_000
  let loanAmount =
    emiLoan != null && Number.isFinite(Number(emiLoan)) && Number(emiLoan) > 0
      ? Number(emiLoan)
      : loanFromSetup
  loanAmount = finitePositive(loanAmount, 10_000)

  const interestRatePct = config?.emi?.interest_rate_pct
  const interestRateRaw = config?.emi?.default_interest_rate
  const interestRate =
    interestRatePct != null && Number.isFinite(Number(interestRatePct)) && Number(interestRatePct) > 0
      ? Number(interestRatePct)
      : interestRateRaw != null && Number.isFinite(Number(interestRateRaw))
        ? Number(interestRateRaw)
        : fp?.assumptions?.loan_interest_rate_pct != null &&
            Number.isFinite(Number(fp.assumptions.loan_interest_rate_pct))
          ? Number(fp.assumptions.loan_interest_rate_pct)
          : 12

  const tenureFromConfig = config?.emi?.default_tenure_months
  const fpTenureYears = fp?.assumptions?.loan_tenure_options?.[0]
  let tenureMonths =
    tenureFromConfig != null && Number.isFinite(Number(tenureFromConfig)) && Number(tenureFromConfig) > 0
      ? Math.round(Number(tenureFromConfig))
      : fpTenureYears != null && Number.isFinite(Number(fpTenureYears))
        ? Math.round(Number(fpTenureYears) * 12)
        : 36
  tenureMonths = finitePositive(tenureMonths, 36)

  return {
    dailyCustomers,
    avgBill,
    workingDays,
    unitLabel,
    billLabel,
    unitsPerDayLow,
    unitsPerDayHigh,
    monthlyRevLow,
    monthlyRevHigh,
    cogsPct,
    monthlyOpex,
    loanAmount,
    interestRate,
    tenureMonths,
  }
}

/** Standard reducing-balance monthly EMI (same currency as principal — USD). */
export function monthlyLoanEmi(principal: number, annualRatePct: number, tenureMonths: number): number {
  const p = Number(principal)
  const n = Math.round(Number(tenureMonths))
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(n) || n <= 0) return 0
  const r = Number(annualRatePct) / 100 / 12
  if (!Number.isFinite(r) || r <= 0) return p / n
  const pow = Math.pow(1 + r, n)
  if (!Number.isFinite(pow) || pow <= 1) return p / n
  return (p * r * pow) / (pow - 1)
}

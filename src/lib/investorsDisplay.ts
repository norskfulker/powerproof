import { formatUsdCompact, formatUsdRangeCompactFromUsd } from '@/lib/displayCurrency'

export function formatInvestorFirmType(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatInvestorLabel(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatInvestorCheckSize(
  minUsd: number | null | undefined,
  maxUsd: number | null | undefined,
): string {
  if (minUsd != null && maxUsd != null) {
    return formatUsdRangeCompactFromUsd(minUsd, maxUsd)
  }
  if (minUsd != null) return `${formatUsdCompact(minUsd)}+`
  if (maxUsd != null) return `Up to ${formatUsdCompact(maxUsd)}`
  return '—'
}

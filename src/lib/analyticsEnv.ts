/** Production analytics (GA, Clarity, Meta). Set VITE_GA_DEBUG=true to test GA locally. */
export function isProductionAnalyticsEnabled(): boolean {
  return import.meta.env.PROD || import.meta.env.VITE_GA_DEBUG === 'true'
}

export function getGaMeasurementId(): string | undefined {
  return (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || undefined
}

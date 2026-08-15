/** Fire Meta Pixel CompleteRegistration — used on sign-up CTAs and after OAuth signup. */
export function trackMetaCompleteRegistration() {
  if (import.meta.env.PROD && typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'CompleteRegistration')
  }
}

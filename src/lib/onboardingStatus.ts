import type { Profile } from '@/types/database'

/** Legacy final step index — kept for profile updates only. */
export const ONBOARDING_FINAL_STEP = 3

type OnboardingProfile = Pick<
  Profile,
  'onboarding_completed' | 'onboarding_step' | 'home_country'
> | null

/** Profile defaults applied (country + completed flag). */
export function isProfileOnboardingComplete(profile: OnboardingProfile): boolean {
  if (!profile) return false
  if (!profile.onboarding_completed) return false
  if (!String(profile.home_country ?? '').trim()) return false
  return true
}

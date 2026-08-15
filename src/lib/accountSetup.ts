import type { User } from '@supabase/supabase-js'

import { DEFAULT_COUNTRY_CODE, getCountryByCode } from '@/lib/countries'
import { ONBOARDING_FINAL_STEP } from '@/lib/onboardingStatus'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

let setupInflight: string | null = null

export function needsAccountSetup(
  profile: Pick<Profile, 'onboarding_completed' | 'home_country'>,
): boolean {
  return !profile.onboarding_completed || !String(profile.home_country ?? '').trim()
}

/** Silent first-run setup: India defaults and onboarded flag only. */
export async function ensureAccountSetup(profile: Profile, _user: User): Promise<boolean> {
  if (setupInflight === profile.id) return false
  if (!needsAccountSetup(profile)) return false
  setupInflight = profile.id

  try {
    const country = getCountryByCode(DEFAULT_COUNTRY_CODE)
    const { error } = await supabase
      .from('profiles')
      .update({
        home_country: country.code,
        preferred_currency: 'INR',
        onboarding_completed: true,
        onboarding_step: ONBOARDING_FINAL_STEP,
      })
      .eq('id', profile.id)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('[accountSetup]', e)
    return false
  } finally {
    setupInflight = null
  }
}

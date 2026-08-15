import { supabase } from '@/lib/supabase'
import type { AIModelId } from '@/lib/aiModels'

export const WAR_ROOM_SCOUT_FEATURE = 'war_room_scout'

export const WAR_ROOM_PLAYBOOK_FEATURE_BY_MODEL: Record<AIModelId, string> = {
  'gemini-2.5-flash-lite': 'war_room_playbook_lite',
  'gemini-2.5-flash': 'war_room_playbook',
  'gemini-2.5-pro': 'war_room_playbook_pro',
}

export const WAR_ROOM_CREDIT_DEFAULTS = {
  scout: 2,
  playbookLite: 15,
  playbook: 40,
  playbookPro: 85,
} as const

export type WarRoomCreditCosts = {
  scout: number
  playbookLite: number
  playbook: number
  playbookPro: number
  minEntry: number
}

export function staticWarRoomCosts(): WarRoomCreditCosts {
  return warRoomCostsFromGetter(() => null)
}

export function warRoomCostsFromGetter(
  getCredits: (featureKey: string) => number | null,
): WarRoomCreditCosts {
  const scout = getCredits(WAR_ROOM_SCOUT_FEATURE) ?? WAR_ROOM_CREDIT_DEFAULTS.scout
  const playbookLite =
    getCredits(WAR_ROOM_PLAYBOOK_FEATURE_BY_MODEL['gemini-2.5-flash-lite']) ??
    WAR_ROOM_CREDIT_DEFAULTS.playbookLite
  const playbook =
    getCredits(WAR_ROOM_PLAYBOOK_FEATURE_BY_MODEL['gemini-2.5-flash']) ??
    WAR_ROOM_CREDIT_DEFAULTS.playbook
  const playbookPro =
    getCredits(WAR_ROOM_PLAYBOOK_FEATURE_BY_MODEL['gemini-2.5-pro']) ??
    WAR_ROOM_CREDIT_DEFAULTS.playbookPro
  return {
    scout,
    playbookLite,
    playbook,
    playbookPro,
    minEntry: scout + playbookLite,
  }
}

export function playbookCreditsForModel(costs: WarRoomCreditCosts, model: AIModelId): number {
  if (model === 'gemini-2.5-flash-lite') return costs.playbookLite
  if (model === 'gemini-2.5-pro') return costs.playbookPro
  return costs.playbook
}

export async function fetchUserCreditBalance(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[warRoomCredits] balance load:', error.message)
    return null
  }
  return data?.balance != null ? Number(data.balance) : 0
}

export async function assertWarRoomEntryCredits(
  userId: string,
  minRequired: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const balance = await fetchUserCreditBalance(userId)
  if (balance == null) {
    return { ok: false, message: 'Could not verify your credit balance. Try again.' }
  }
  if (balance < minRequired) {
    return {
      ok: false,
      message: `You need at least ${minRequired} credits to enter the War Room (${minRequired} = scout + minimum playbook).`,
    }
  }
  return { ok: true }
}

export async function deductWarRoomScoutCredits(
  userId: string,
  amount: number,
  businessDescription: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('deduct_credits_custom', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: 'war_room_scout',
    p_metadata: { business_description: businessDescription.slice(0, 100) },
  })
  if (error) {
    return { success: false, error: error.message }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (row && typeof row === 'object' && 'success' in row && row.success === false) {
    return { success: false, error: 'Insufficient credits for scout intel.' }
  }
  return { success: true }
}

import type { User } from '@supabase/supabase-js'

import type { Profile } from '@/types/database'

export type ProfileNameFields = Pick<
  Profile,
  'username' | 'display_name' | 'full_name' | 'email'
>

export type UserNameFields = Pick<User, 'email' | 'user_metadata'>

/** Name from the OAuth provider (Google) — `user.user_metadata` only. */
export function getGoogleAuthName(user?: UserNameFields | null): string {
  const meta = user?.user_metadata
  if (!meta || typeof meta !== 'object') return ''

  const full = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''
  if (full) return full

  const name = typeof meta.name === 'string' ? meta.name.trim() : ''
  if (name) return name

  const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : ''
  const family = typeof meta.family_name === 'string' ? meta.family_name.trim() : ''
  const combined = [given, family].filter(Boolean).join(' ')
  if (combined) return combined

  return ''
}

function emailLocalLabel(
  user?: UserNameFields | null,
  profile?: ProfileNameFields | null,
): string {
  const email = (user?.email ?? profile?.email ?? '').trim()
  const local = email.includes('@') ? email.split('@')[0]?.trim() : ''
  if (!local) return ''
  return local.replace(/[._-]+/g, ' ').trim()
}

/** Signed-in user label — Google OAuth name, then email local part. Never profile username/full_name/display_name. */
export function getProfileDisplayName(
  profile: ProfileNameFields | null | undefined,
  user?: UserNameFields | null,
  fallback = 'Account',
): string {
  return getGoogleAuthName(user) || emailLocalLabel(user, profile) || fallback
}

/** @deprecated Use getProfileDisplayName — same Google-only resolution. */
export function getProfileUsernameLabel(
  profile: ProfileNameFields | null | undefined,
  user?: UserNameFields | null,
  fallback = 'Account',
): string {
  return getProfileDisplayName(profile, user, fallback)
}

/** Nav, billing, and sidebar account label. */
export function getProfileAccountLabel(
  profile: ProfileNameFields | null | undefined,
  user?: UserNameFields | null,
  fallback = 'Account',
): string {
  return getProfileDisplayName(profile, user, fallback)
}

/** Label for other people in live search (not the signed-in user). */
export function formatPersonSearchLabel(person: {
  username: string | null
  display_name: string | null
  full_name: string | null
}): string {
  return person.display_name?.trim() || person.full_name?.trim() || 'Profile'
}

/** Initial letter for avatars from the Google OAuth name. */
export function getProfileInitial(
  profile: ProfileNameFields | null | undefined,
  user?: UserNameFields | null,
  fallback = 'U',
): string {
  const label = getProfileDisplayName(profile, user, fallback)
  return (label[0] ?? fallback[0]).toUpperCase()
}

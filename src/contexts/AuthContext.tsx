import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authEmailRedirectTo, authOAuthRedirectTo, parseAuthCallbackHash } from '@/lib/authLanding'
import { markFirstRegistrationOnboarding } from '@/lib/onboardingResearchDemo'
import { setComposerSearchRecentsUser } from '@/lib/composerSearchRecents'
import { applyPendingReferralIfAny } from '@/lib/referrals'
import { ensureAccountSetup, needsAccountSetup } from '@/lib/accountSetup'
import { PROFILE_SELECT } from '@/lib/profileSelect'
import {
  devLoginPasswordFromEnv,
  isLocalhostDev,
  normalizeDevLoginAlias,
} from '@/lib/devAuth'
import { DISPOSABLE_EMAIL_ERROR, isAllowedSignupEmail, isDisposableEmail } from '@/lib/disposableEmailDomains'
import { detectInAppBrowser, getInAppBrowserSignInMessage } from '@/lib/inAppBrowser'
import { trackAnalyticsEvent } from '@/lib/trackAnalyticsEvent'
import { Profile } from '@/types/database'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  profileLoading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithEmailOtp: (
    email: string,
    options?: { shouldCreateUser?: boolean },
  ) => Promise<{ error: Error | null }>
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  /** Localhost dev only — sign in with @username or email + password. */
  signInWithDevAlias: (alias: string, password?: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
let cachedProfile: Profile | null = null
let profileInflight: Promise<Profile | null> | null = null
let profileInflightUserId: string | null = null

async function hydrateProfile(
  userId: string,
  emailHint?: string | null,
  authUser?: User | null,
): Promise<Profile | null> {
  const loadProfileRow = async (): Promise<Profile | null> => {
    let { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single()
    if ((error?.code === 'PGRST116' || !data) && authUser) {
      const ensured = await supabase.rpc('ensure_current_user_profile')
      if (ensured.error) {
        console.warn('Could not ensure profile:', ensured.error.message)
      } else {
        const retry = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single()
        data = retry.data
        error = retry.error
      }
    }
    if (error || !data) {
      if (error) console.warn('Could not fetch profile:', error.message)
      return null
    }
    const prof = data as Profile
    const existingCode = String(prof.referral_code ?? '').trim()
    if (!/^[A-Za-z]{8}$/.test(existingCode)) {
      const { data: code } = await supabase.rpc('ensure_user_referral_code')
      if (typeof code === 'string' && code.trim()) {
        prof.referral_code = code
      }
    }
    return prof
  }

  let prof = await loadProfileRow()
  if (prof && authUser) {
    const updated = await ensureAccountSetup(prof, authUser)
    if (updated) {
      prof = await loadProfileRow()
    }
  }
  if (prof && !prof.investors_list_unlocked_at) {
    const { data: claimed } = await supabase.rpc('claim_investors_list_email_unlock')
    if (claimed) {
      prof = await loadProfileRow()
    }
  }
  return prof
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = async (
    userId: string,
    force = false,
    emailHint?: string | null,
    authUser?: User | null,
  ) => {
    if (!force && cachedProfile && cachedProfile.id === userId) {
      setProfile(cachedProfile)
      setProfileLoading(false)
      if (authUser && needsAccountSetup(cachedProfile)) {
        void hydrateProfile(userId, emailHint, authUser).then((prof) => {
          if (prof) {
            cachedProfile = prof
            setProfile(prof)
          }
        })
      }
      return
    }

    if (!force && profileInflight && profileInflightUserId === userId) {
      setProfileLoading(true)
      try {
        const prof = await profileInflight
        if (prof) {
          cachedProfile = prof
          setProfile(prof)
        } else {
          cachedProfile = null
          setProfile(null)
        }
      } finally {
        setProfileLoading(false)
      }
      return
    }

    setProfileLoading(true)
    profileInflightUserId = userId
    profileInflight = hydrateProfile(userId, emailHint, authUser)

    try {
      const prof = await profileInflight
      if (prof) {
        cachedProfile = prof
        setProfile(prof)
      } else {
        cachedProfile = null
        setProfile(null)
      }
    } catch (e) {
      console.warn('Could not fetch profile:', e)
      cachedProfile = null
      setProfile(null)
    } finally {
      profileInflight = null
      profileInflightUserId = null
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const applySession = (session: Session | null, opts?: { forceProfile?: boolean }) => {
      setSession(session)
      setUser(session?.user ?? null)
      // Scope sidebar/history recents to this account so a shared browser never
      // surfaces another user's history.
      setComposerSearchRecentsUser(session?.user?.id ?? null)
      if (session?.user) {
        void fetchProfile(
          session.user.id,
          opts?.forceProfile ?? false,
          session.user.email ?? null,
          session.user,
        )
      } else {
        cachedProfile = null
        profileInflight = null
        profileInflightUserId = null
        setProfile(null)
        setProfileLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        cachedProfile = null
        profileInflight = null
        profileInflightUserId = null
      }
      if (event === 'SIGNED_IN' && typeof window !== 'undefined' && session?.user) {
        const callback = parseAuthCallbackHash(window.location.hash)
        const searchParams = new URLSearchParams(window.location.search)
        const isSignupCallback =
          callback?.type === 'signup' || callback?.type === 'invite'
        const isOAuthCallback = Boolean(
          callback?.hasTokens || callback?.hasCode || searchParams.has('code'),
        )
        const createdMs = Date.parse(session.user.created_at)
        const lastSignInMs = session.user.last_sign_in_at
          ? Date.parse(session.user.last_sign_in_at)
          : createdMs
        const isFirstSignIn = Math.abs(lastSignInMs - createdMs) < 10_000
        const shouldTrackRegistration =
          isSignupCallback || (isOAuthCallback && isFirstSignIn)

        if (shouldTrackRegistration && import.meta.env.PROD && window.fbq) {
          const dedupeKey = `meta_pixel_complete_registration_${session.user.id}`
          if (!sessionStorage.getItem(dedupeKey)) {
            sessionStorage.setItem(dedupeKey, '1')
            window.fbq('track', 'CompleteRegistration')
          }
        }

        if (shouldTrackRegistration) {
          markFirstRegistrationOnboarding()
          void applyPendingReferralIfAny(supabase)
        }
      }
      const forceProfile = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED'
      applySession(session, { forceProfile })
      setIsLoading(false)
    })

    // Only hydrate when a session exists — avoid briefly clearing a valid session before INITIAL_SESSION.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session) return
      applySession(session)
    })

    const refreshSessionOnVisible = () => {
      if (document.visibilityState !== 'visible') return
      void supabase.auth.getSession()
    }
    document.addEventListener('visibilitychange', refreshSessionOnVisible)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', refreshSessionOnVisible)
    }
  }, [])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    cachedProfile = null
    profileInflight = null
    profileInflightUserId = null
    setSession(null)
    setUser(null)
    setProfile(null)
    setProfileLoading(false)
    setComposerSearchRecentsUser(null)
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.error('[Auth] signOut failed:', error)
    }
  }

  const signInWithEmailOtp = async (
    email: string,
    options?: { shouldCreateUser?: boolean },
  ) => {
    if (!isAllowedSignupEmail(email)) {
      return {
        error: new Error(
          isDisposableEmail(email) ? DISPOSABLE_EMAIL_ERROR : 'Enter a valid email address.',
        ),
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: options?.shouldCreateUser ?? true,
        emailRedirectTo: authEmailRedirectTo(),
      },
    })
    return { error: error as Error | null }
  }

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    })
    return { error: error as Error | null }
  }

  const signInWithGoogle = async () => {
    const inApp = detectInAppBrowser()
    if (inApp.isInApp) {
      trackAnalyticsEvent('in_app_browser_sign_in_blocked', {
        in_app_browser: true,
        in_app_browser_id: inApp.id ?? 'unknown',
        page_path: `${window.location.pathname}${window.location.search}`,
      })
      return { error: new Error(getInAppBrowserSignInMessage(inApp)) }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authOAuthRedirectTo() }
    })
    return { error: error as Error | null }
  }

  const signInWithDevAlias = async (alias: string, password?: string) => {
    if (!isLocalhostDev()) {
      return { error: new Error('Dev alias login is only available on localhost.') }
    }

    const normalized = normalizeDevLoginAlias(alias)
    if (!normalized) {
      return { error: new Error('Enter a username or email.') }
    }

    let email: string | null = null
    if (normalized.includes('@')) {
      email = normalized.toLowerCase()
    } else {
      const { data, error: resolveError } = await supabase.rpc('resolve_dev_login_email', {
        p_alias: normalized,
      })
      if (resolveError) {
        console.warn('[Auth] resolve_dev_login_email:', resolveError.message)
        return { error: new Error('Could not resolve that alias.') }
      }
      email = typeof data === 'string' && data.trim() ? data.trim().toLowerCase() : null
    }

    if (!email) {
      return { error: new Error('No account found for that alias.') }
    }

    const pwd = password?.trim() || devLoginPasswordFromEnv()
    if (!pwd) {
      return {
        error: new Error('Enter a password or set VITE_DEV_LOGIN_PASSWORD in your local .env file.'),
      }
    }

    return signInWithPassword(email, pwd)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (!error) await fetchProfile(user.id, true, user.email ?? null, user)
    return { error: error as Error | null }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, true, user.email ?? null, user)
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <AuthContext.Provider value={{
      session, user, profile, isLoading, profileLoading,
      isAdmin,
      signOut,
      signInWithGoogle,
      signInWithEmailOtp,
      verifyEmailOtp,
      signInWithDevAlias,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (ctx) return ctx

  // In dev (especially with Fast Refresh) it's possible to temporarily end up with a consumer
  // rendered against a different module instance than the provider, making the context undefined.
  // Falling back avoids a hard crash; real auth actions will still fail loudly if invoked.
  const err = new Error('useAuth must be used within AuthProvider')
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(err)
  }

  const fail = async () => ({ error: err })
  return {
    session: null,
    user: null,
    profile: null,
    isLoading: false,
    profileLoading: false,
    isAdmin: false,
    signOut: async () => {},
    signInWithGoogle: async () => ({ error: err }),
    signInWithEmailOtp: fail,
    verifyEmailOtp: fail,
    signInWithDevAlias: fail,
    updateProfile: fail,
    refreshProfile: async () => {},
  } satisfies AuthContextType
}

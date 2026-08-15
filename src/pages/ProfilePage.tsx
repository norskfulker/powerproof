import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { RemixIcon } from '@/lib/icons';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Bug,
  Check,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  Gauge,
  GraduationCap,
  Lightbulb,
  LogOut,
  MessageCircle,
  MessageCircleQuestion,
  Microscope,
  PackageSearch,
  Palmtree,
  Pencil,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Swords,
  User,
  Wallet,
} from '@/lib/icons';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Button, Input, Textarea, type InputHelperVariant } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { splitStoredPhone } from '@/lib/phoneDialCodes';
import { validateNationalNumber } from '@/lib/phoneValidation';
import { Seo } from '@/components/Seo';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getProfileDisplayName, getProfileInitial } from '@/lib/profileDisplayName';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import { UsageMeter } from '@/components/profile/UsageMeter';
import { DashboardGrid } from '@/components/page-shells';
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext';
import { useGeoSubdivisions } from '@/hooks/useGeoSubdivisions';
import { normalizeGeoIso } from '@/lib/geoIso';
import { getCountryByCode } from '@/lib/countries';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ByokSettings } from '@/components/settings/ByokSettings';
import { UserFeedbackDialog } from '@/components/layout/UserFeedbackDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSubscriptionCancel } from '@/hooks/useSubscriptionCancel';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { TrialDaysBadge } from '@/components/billing/TrialDaysBadge';
import { openSubscriptionPricingDialog } from '@/store/filterStore';
import { USER_FEEDBACK_LABELS, USER_FEEDBACK_TYPES, type UserFeedbackType } from '@/lib/userFeedback';
import {
  isUnlimitedPaidPlanDisplay,
  type SubscriptionUsageBucket,
} from '@/lib/subscriptionStatus';

const INDIA_PHONE_PREFIX = '+91'

const EMPLOYMENT_OPTIONS: ReadonlyArray<{ value: string; label: string; Icon: RemixIcon }> = [
  { value: 'employed', label: 'Employed full-time', Icon: Briefcase },
  { value: 'self_employed', label: 'Self-employed', Icon: Building2 },
  { value: 'student', label: 'Student', Icon: GraduationCap },
  { value: 'unemployed', label: 'Looking for opportunities', Icon: Search },
  { value: 'retired', label: 'Retired', Icon: Palmtree },
]

const USER_FEEDBACK_ICONS: Record<UserFeedbackType, RemixIcon> = {
  bug_report: Bug,
  feature_request: Lightbulb,
  incorrect_data: AlertTriangle,
};

type ProfileTabKey = 'details' | 'subscription' | 'usage' | 'preferences'

const PROFILE_PAGE_TABS: ReadonlyArray<{ key: ProfileTabKey; label: string; icon: RemixIcon }> = [
  { key: 'details', label: 'Profile', icon: User },
  { key: 'subscription', label: 'Subscription', icon: Crown },
  { key: 'usage', label: 'Usage', icon: Gauge },
  { key: 'preferences', label: 'BYOK', icon: SlidersHorizontal },
]

type UsageBucketMeta = {
  label: string
  Icon: RemixIcon
  /** Tailwind utility prefix for the icon-tile color. */
  tone: 'primary' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet'
}

const USAGE_BUCKET_META: Record<SubscriptionUsageBucket, UsageBucketMeta> = {
  reports_standard: { label: 'Standard Reports', Icon: FileText, tone: 'primary' },
  reports_premium: { label: 'Premium Reports', Icon: Microscope, tone: 'sky' },
  sourcing: { label: 'Sourcing Runs', Icon: PackageSearch, tone: 'violet' },
  market_test: { label: 'Market Tests', Icon: ShieldCheck, tone: 'emerald' },
  edits: { label: 'AI Edits', Icon: Pencil, tone: 'amber' },
  roadmap: { label: 'Roadmap Runs', Icon: ChevronRight, tone: 'sky' },
  warroom: { label: 'War Room Runs', Icon: Swords, tone: 'rose' },
}

const TONE_TILE_STYLES: Record<UsageBucketMeta['tone'], string> = {
  primary: 'bg-primary/10 text-primary ring-1 ring-primary/15',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/15',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/15',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/15',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/15',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/15',
}

const SUBSCRIPTION_USAGE_LABELS: Record<string, string> = {
  reports_standard: 'Standard Reports',
  reports_premium: 'Premium Reports',
  sourcing: 'Sourcing Runs',
  market_test: 'Market Tests',
  edits: 'AI Edits',
  roadmap: 'Roadmap Runs',
  warroom: 'War Room Runs',
}

function asBooleanOrDefault(value: unknown, def: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return def
}

function normalizeForSave(input: Record<string, any>) {
  const display = (input.display_name ?? input.full_name ?? '') as string
  const cityRaw = (input.city ?? input.location_city ?? '') as string
  const stateRaw = (input.state ?? input.location_state ?? '') as string
  const city = typeof cityRaw === 'string' ? cityRaw.trim() : ''
  const state = typeof stateRaw === 'string' ? stateRaw.trim() : ''
  // Phone may be stored as "+91 1234…" (form value) or "+911234…" (db value).
  // Strip the gap so the dirty comparison treats them as equal.
  const phoneRaw = typeof input.phone === 'string' ? input.phone : ''
  const phoneSplit = splitStoredPhone(phoneRaw)
  const phone =
    phoneSplit.number.length > 0 ? `${phoneSplit.prefix}${phoneSplit.number}` : null
  // Treat empty / whitespace strings as null so the form value (which often
  // uses `''` for "no value") compares equal to the db's `null`.
  const empty = (v: unknown) =>
    v == null || (typeof v === 'string' && v.trim() === '') ? null : v
  return {
    display_name: display.trim() || null,
    full_name: display.trim() || null,
    phone,
    city: city || null,
    state: state || null,
    location_city: city || null,
    location_state: state || null,
    employment_status: empty(input.employment_status),
    display_description: empty(input.display_description),
    notif_weekly_trending: asBooleanOrDefault(input.notif_weekly_trending, true),
    notif_saved_category: asBooleanOrDefault(input.notif_saved_category, true),
    notif_govt_alerts: asBooleanOrDefault(input.notif_govt_alerts, false),
    bio: empty(input.bio),
    website: empty(input.website),
    avatar_url: empty(input.avatar_url),
  }
}

/** Wraps profile content in the dashboard shell, or a plain container when embedded in a dialog. */
function ProfilePageShell({
  embedded,
  children,
}: {
  embedded: boolean
  children: React.ReactNode
}) {
  if (embedded) return <div className="w-full">{children}</div>
  return <DashboardGrid>{children}</DashboardGrid>
}

function ProfileRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string | React.ReactNode
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 py-3 layout-sm:flex-row layout-sm:items-start layout-sm:justify-between layout-sm:gap-5 layout-sm:py-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        {typeof label === 'string' ? (
          <label
            htmlFor={htmlFor}
            className="block text-xs font-semibold leading-tight text-foreground"
          >
            {label}
          </label>
        ) : (
          label
        )}
      </div>
      <div className="min-w-0 w-full layout-sm:w-[30%]">{children}</div>
    </div>
  )
}

function ProfileRowGroup({
  children,
  className,
  embedded = false,
}: {
  children: React.ReactNode
  className?: string
  embedded?: boolean
}) {
  return (
    <div
      className={cn(
        'w-full divide-y divide-border-subtle/60 rounded-2xl border border-border-subtle/70 bg-card px-4 sm:px-5',
        embedded ? 'max-w-2xl' : 'max-w-md',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Flattened subscription + usage helpers
 *
 * Replaces the previous outer `bg-card` wrapper that contained nested
 * `bg-background` / `bg-warning-bg/35` cards. Each tab is now a single
 * surface with `divide-y` separators, matching the details tab pattern.
 * ──────────────────────────────────────────────────────────────────────── */

const ALL_USAGE_BUCKETS: ReadonlyArray<SubscriptionUsageBucket> = [
  'reports_standard',
  'reports_premium',
  'sourcing',
  'market_test',
  'edits',
  'roadmap',
  'warroom',
]

function formatResetDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPlanPeriodLabel(
  status: string,
  periodEnd: string | null,
): string {
  const resetDate = formatResetDate(periodEnd)
  if (!resetDate) return status
  return `${status} · Renews ${resetDate}`
}

function NotAvailableHint({ reason }: { reason: 'not-entitled' | 'no-data' }) {
  return (
    <p className="mt-1 text-[11px] italic text-muted-foreground/80">
      {reason === 'not-entitled'
        ? 'Not available on this plan'
        : 'Not available right now'}
    </p>
  )
}

function UsageBucketCard({
  bucket,
  usage,
  unlimited,
}: {
  bucket: SubscriptionUsageBucket
  usage:
    | {
        used: number
        allowance: number
        remaining: number
      }
    | undefined
  unlimited?: boolean
}) {
  const meta = USAGE_BUCKET_META[bucket]
  const Icon = meta.Icon
  const available = usage != null || unlimited === true

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          TONE_TILE_STYLES[meta.tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold tracking-tight text-foreground">
          {meta.label}
        </p>
        {unlimited ? (
          <p className="mt-0.5 text-[13px] font-semibold text-foreground">Unlimited</p>
        ) : available ? (
          <>
            <p className="mt-0.5 text-[13px] tabular-nums text-foreground">
              <span className="font-bold">{usage!.used}</span>
              <span className="text-muted-foreground"> / {usage!.allowance} used</span>
              <span className="text-muted-foreground/70">
                {' '}· {usage!.remaining} left
              </span>
            </p>
            <UsageMeter used={usage!.used} total={usage!.allowance} className="mt-2" />
          </>
        ) : (
          <NotAvailableHint reason="not-entitled" />
        )}
      </div>
    </div>
  )
}

function AiChatRow({
  chat,
}: {
  chat:
    | { unlimited: true }
    | { unlimited: false; used: number; allowance: number; remaining: number }
}) {
  if (chat.unlimited) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <MessageCircle className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold tracking-tight text-foreground">
            AI Chat
          </p>
          <p className="mt-0.5 text-[13px] text-foreground">
            <span className="font-bold">Unlimited</span>
            <span className="text-muted-foreground">
              {' '}— daily cap removed while your plan is active
            </span>
          </p>
          <UsageMeter used={1} total={1} unlimited className="mt-2" />
        </div>
      </div>
    )
  }

  // chat is now the { unlimited: false; used; allowance; remaining } variant.
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
        <MessageCircle className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold tracking-tight text-foreground">
          AI Chat
        </p>
        <p className="mt-0.5 text-[13px] tabular-nums text-foreground">
          <span className="font-bold">{(chat as { used: number; allowance: number; remaining: number }).used}</span>
          <span className="text-muted-foreground">
            {' '}/ {(chat as { used: number; allowance: number; remaining: number }).allowance} today
          </span>
          <span className="text-muted-foreground/70">
            {' '}· {(chat as { used: number; allowance: number; remaining: number }).remaining} left
          </span>
        </p>
        <UsageMeter
          used={(chat as { used: number; allowance: number; remaining: number }).used}
          total={(chat as { used: number; allowance: number; remaining: number }).allowance}
          className="mt-2"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Resets at midnight
        </p>
      </div>
    </div>
  )
}

export function ProfilePage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { profile, profileLoading, refreshProfile } = useProfile();
  const {
    data: subscriptionStatus,
    isLoading: subscriptionLoading,
    refetch: refetchSubscriptionStatus,
  } = useSubscriptionStatus()
  const { startCheckout, isLoading: checkoutLoading } = useSubscriptionCheckout()
  const { cancelSubscription, isLoading: cancellationLoading } = useSubscriptionCancel()
  const profileInitial = profile ? getProfileInitial(profile, user) : 'U'
  const profileDisplayName = profile ? getProfileDisplayName(profile, user) : 'Account'
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<ProfileTabKey>('details');
  useRegisterAppChromeHeader({
    title: 'Profile',
    icon: <User className="h-full w-full" aria-hidden />,
  })

  const navigateTab = useCallback((key: ProfileTabKey) => {
    setTab(key)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', key)
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [websiteCheck, setWebsiteCheck] = useState<'idle' | 'checking' | 'ok' | 'bad' | 'unknown'>('idle')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackInitialType, setFeedbackInitialType] = useState<UserFeedbackType>('bug_report')
  const [cancelPlanConfirmOpen, setCancelPlanConfirmOpen] = useState(false)

  const pendingSubscription = subscriptionStatus?.pending_subscription ?? null
  const limitedChat =
    subscriptionStatus?.success && subscriptionStatus.chat.unlimited === false
      ? subscriptionStatus.chat
      : null

  const homeCountryIso = normalizeGeoIso(profile?.home_country) ?? 'IN'
  const selectedCountry = getCountryByCode(homeCountryIso)
  const { subdivisions: profileGeoSubdivisions, isLoading: profileGeoSubsLoading } =
    useGeoSubdivisions(homeCountryIso, tab === 'details')

  const profileSubdivisionNames = useMemo(
    () => profileGeoSubdivisions.map((s) => s.name),
    [profileGeoSubdivisions],
  )

  const prevHomeCountryRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    prevHomeCountryRef.current = undefined
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    const hc = normalizeGeoIso(profile.home_country) ?? 'IN'
    if (prevHomeCountryRef.current !== undefined && prevHomeCountryRef.current !== hc) {
      setForm((f) => ({ ...f, state: '' }))
    }
    prevHomeCountryRef.current = hc
  }, [profile?.home_country, profile?.id])

  useEffect(() => {
    const t = searchParams.get('tab');
    if (
      t === 'workspaces' ||
      t === 'preferences' ||
      t === 'subscription' ||
      t === 'usage' ||
      t === 'details' ||
      t === 'account' ||
      t === 'business'
    ) {
      if (t === 'workspaces' || t === 'business' || t === 'account') setTab('details')
      else setTab(t as ProfileTabKey)
    }
  }, [searchParams]);

  /**
   * Server snapshot used to compute `dirty`. Re-derived from the live `profile`
   * on every render so that:
   *  - avatar upload (which only mutates `form.avatar_url`) registers as a
   *    genuine edit until the next save + refresh,
   *  - after `refreshProfile()` the snapshot rebuilds from the new server
   *    object, so reverting a field to its just-saved value clears the banner.
   * Without this, an `initialForm` captured in a one-shot effect drifts out of
   * sync with the live profile and the banner shows even when there are no
   * edits.
   */
  const initialForm = useMemo(
    () => (profile ? normalizeForSave(profile as any) : null),
    [profile],
  )

  useEffect(() => {
    if (!profile) return
    setForm({
      ...profile,
      state: profile.state ?? profile.location_state ?? '',
      bio: profile.bio ?? '',
      website: profile.website ?? '',
      notif_weekly_trending: asBooleanOrDefault(profile.notif_weekly_trending, true),
      notif_saved_category: asBooleanOrDefault(profile.notif_saved_category, true),
      notif_govt_alerts: asBooleanOrDefault(profile.notif_govt_alerts, false),
    });
  }, [profile?.id]);

  useEffect(() => {
    if (tab !== 'preferences' || window.location.hash !== '#api-key') return
    window.requestAnimationFrame(() => {
      document.getElementById('api-key')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [tab])

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/profile/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('project-assets').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const {
        data: { publicUrl },
      } = supabase.storage.from('project-assets').getPublicUrl(path)
      set('avatar_url', publicUrl)
      toast('Photo updated')
    } catch (e: unknown) {
      toast.error('Upload failed', { description: e instanceof Error ? e.message : 'Try again' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    const raw = String(form.website ?? '').trim()
    if (!raw) {
      setWebsiteCheck('idle')
      return
    }
    setWebsiteCheck('checking')
    const ctrl = new AbortController()
    const handle = window.setTimeout(() => {
      let urlStr = raw
      if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`
      try {
        const u = new URL(urlStr)
        const host = u.hostname
        if (host !== 'localhost' && !host.includes('.')) {
          setWebsiteCheck('bad')
          return
        }
      } catch {
        setWebsiteCheck('bad')
        return
      }
      fetch(urlStr, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store', redirect: 'follow' })
        .then((res) => {
          if (res.ok) setWebsiteCheck('ok')
          else if (res.status >= 400 && res.status < 500) setWebsiteCheck('bad')
          else setWebsiteCheck('unknown')
        })
        .catch(() => setWebsiteCheck('unknown'))
    }, 400)
    return () => {
      window.clearTimeout(handle)
      ctrl.abort()
    }
  }, [form.website])

  async function resumePendingSubscription() {
    if (!pendingSubscription || !user) return
    const result = await startCheckout(pendingSubscription.plan_id, {
      userEmail: profile?.email || user.email || '',
      userName: getProfileDisplayName(profile, user, 'PowerProof user'),
      userPhone: profile?.phone ?? undefined,
    })
    if (result.success) {
      toast.success('Payment submitted', {
        description: `Activating your ${pendingSubscription.plan_name} plan after Razorpay confirms the payment…`,
      })
      void refetchSubscriptionStatus()
    } else if ('reason' in result && result.reason !== 'dismissed') {
      toast.error('Could not resume checkout', { description: result.reason })
    }
  }

  async function confirmCancelSubscription() {
    const result = await cancelSubscription()
    if (result.success) {
      setCancelPlanConfirmOpen(false)
      toast.success('Plan cancelled')
      return
    }
    toast.error('Could not cancel plan', {
      description: 'reason' in result ? result.reason : 'subscription_cancel_failed',
    })
  }

  function handleSaveClick() {
    if (!profile || saving) return
    if (!dirty) {
      toast.info('No changes to save')
      return
    }
    void save()
  }

  async function save() {
    if (!profile) return;
    if (!dirty) return
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        phone: form.phone,
        city: form.city,
        state: form.state,
        location_city: form.city ?? null,
        location_state: form.state ?? null,
        employment_status: form.employment_status,
        display_description: form.display_description,
        notif_weekly_trending: asBooleanOrDefault(form.notif_weekly_trending, true),
        notif_saved_category: asBooleanOrDefault(form.notif_saved_category, true),
        notif_govt_alerts: asBooleanOrDefault(form.notif_govt_alerts, false),
        bio: String(form.bio ?? '').trim() || null,
        website: String(form.website ?? '').trim() || null,
        avatar_url: form.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    await refreshProfile?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  }

  const phoneValue = useMemo(() => splitStoredPhone(form.phone), [form.phone])

  const phoneCheck = useMemo(
    () => validateNationalNumber(phoneValue.prefix, phoneValue.number),
    [phoneValue.prefix, phoneValue.number],
  )
  const phoneDigits = phoneValue.number.replace(/\D/g, '')
  const phoneHelperVariant: InputHelperVariant =
    phoneDigits.length > 0 ? (phoneCheck.valid ? 'info' : 'error') : 'default'
  const phoneHelperText =
    phoneDigits.length > 0
      ? phoneCheck.valid
        ? 'Number looks valid'
        : phoneCheck.message
      : undefined

  const profileStateSelectValue = useMemo(() => {
    const s = typeof form.state === 'string' ? form.state.trim() : ''
    if (!s) return undefined
    return s
  }, [form.state])

  const employmentSelectValue = useMemo(() => {
    const v = form.employment_status
    if (v == null || v === '') return undefined
    const s = String(v)
    return EMPLOYMENT_OPTIONS.some((o) => o.value === s) ? s : undefined
  }, [form.employment_status])

  const websiteHelperVariant: InputHelperVariant =
    websiteCheck === 'bad' ? 'error' : websiteCheck === 'ok' ? 'info' : 'default'
  const websiteHelperText =
    websiteCheck === 'idle'
      ? undefined
      : websiteCheck === 'checking'
        ? 'Checking reachability'
        : websiteCheck === 'ok'
          ? 'Page responded successfully'
          : websiteCheck === 'bad'
            ? 'Invalid URL or the server did not accept the request'
            : 'Reachability could not be verified from this browser'

  if (profileLoading && !profile) {
    return (
      <>
        {!embedded ? <Seo title="Profile Settings | PowerProof" noIndex canonicalPath="/profile" /> : null}
        <ProfilePageSkeleton />
      </>
    )
  }

  if (!profile) {
    return (
      <ProfilePageShell embedded={embedded}>
        {!embedded ? <Seo title="Profile Settings | PowerProof" noIndex canonicalPath="/profile" /> : null}
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-1 py-12 layout-sm:px-0">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your profile. Check your connection and try again.
          </p>
          <Button type="button" variant="primary" size="md" onClick={() => void refreshProfile()}>
            Retry
          </Button>
        </div>
      </ProfilePageShell>
    )
  }

  const dirty = initialForm
    ? JSON.stringify(normalizeForSave(form)) !== JSON.stringify(initialForm)
    : false

  const memberSinceLabel = profile?.created_at
    ? `Member since ${new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : undefined

  return (
    <ProfilePageShell embedded={embedded}>
      {!embedded ? (
        <Seo
          title="Profile Settings | PowerProof"
          description="Manage your profile, preferences, and account settings on PowerProof."
          canonicalPath="/profile"
          noIndex
        />
      ) : null}

      <div className={cn('mx-auto w-full px-1 layout-sm:px-0', embedded ? 'max-w-2xl' : 'max-w-md')}>
        <ProfileHero
          displayName={profileDisplayName}
          email={profile.email ?? user?.email}
          avatarUrl={form.avatar_url}
          avatarInitial={profileInitial}
          uploadingAvatar={uploadingAvatar}
          countryCode={homeCountryIso}
          countryName={selectedCountry.name}
          memberSinceLabel={memberSinceLabel}
          onAvatarClick={() => document.getElementById('profile-avatar-inp')?.click()}
        />
        <input
          id="profile-avatar-inp"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadAvatar(f)
            e.target.value = ''
          }}
        />

        <Tabs value={tab} onValueChange={(v) => navigateTab(v as ProfileTabKey)} className="mt-6 w-full">
          <TabsList className="h-auto w-full justify-center layout-sm:w-fit">
            {PROFILE_PAGE_TABS.map((t) => {
              const Icon = t.icon
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  alwaysShowLabel
                  icon={<Icon className="tab-icon h-4 w-4 shrink-0" aria-hidden />}
                  className="flex-1 px-4 py-2.5 text-xs layout-sm:flex-none layout-sm:text-sm"
                >
                  {t.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {tab === 'details' ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border-subtle/80 bg-muted/20 px-3 py-2.5 layout-sm:px-4">
            <p className="text-sm text-muted-foreground">
              {dirty ? (
                <span className="font-medium text-foreground">Unsaved changes</span>
              ) : (
                <span>No unsaved changes</span>
              )}
            </p>
            <Button
              onClick={handleSaveClick}
              disabled={saving}
              variant="primary"
              size="md"
              className="shrink-0"
              style={{ boxShadow: 'none' }}
            >
              {saving ? (
                'Saving…'
              ) : saved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" aria-hidden />
                  Saved
                </span>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {tab === 'details' ? (
            <ProfileRowGroup embedded={embedded}>
              <ProfileRow label="Email" htmlFor="profile-email">
                <Input
                  id="profile-email"
                  variant="standalone"
                  value={user?.email ?? form.email ?? ''}
                  readOnly
                  disabled
                  helperText="Email is managed through your sign-in provider."
                  fieldStateBorder={false}
                />
              </ProfileRow>

              <ProfileRow label="Mobile number" htmlFor="profile-phone">
                <Input
                  id="profile-phone"
                  variant="standalone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phoneDigits}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    set('phone', `${INDIA_PHONE_PREFIX} ${digits}`.trim())
                  }}
                  placeholder="10-digit mobile number"
                  helperVariant={phoneHelperVariant}
                  fieldStateBorder={phoneHelperVariant === 'error'}
                />
                {phoneHelperText ? (
                  <p
                    className={cn(
                      'mt-1.5 text-[11px] leading-tight',
                      phoneHelperVariant === 'error' ? 'text-destructive' : 'text-text-tertiary',
                    )}
                  >
                    {phoneHelperText}
                  </p>
                ) : null}
              </ProfileRow>

              <ProfileRow label="State / region" htmlFor="profile-state">
                <Select
                  value={profileStateSelectValue}
                  onValueChange={(v) => {
                    set('state', v)
                  }}
                  disabled={profileGeoSubsLoading}
                >
                  <SelectTrigger id="profile-state">
                    <SelectValue placeholder={profileGeoSubsLoading ? 'Loading regions…' : 'Select region'} />
                  </SelectTrigger>
                  <SelectContent>
                    {profileSubdivisionNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    {profileStateSelectValue && !profileSubdivisionNames.includes(profileStateSelectValue) ? (
                      <SelectItem value={profileStateSelectValue}>{profileStateSelectValue}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </ProfileRow>

              <ProfileRow label="Employment status" htmlFor="profile-employment">
                <Select value={employmentSelectValue} onValueChange={(v) => set('employment_status', v)}>
                  <SelectTrigger id="profile-employment">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        icon={<opt.Icon className="h-4 w-4" aria-hidden />}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ProfileRow>

              <ProfileRow label="Bio" htmlFor="profile-bio">
                <Textarea
                  id="profile-bio"
                  value={form.bio ?? ''}
                  onChange={(e) => set('bio', e.target.value)}
                  placeholder="Founder exploring EV charging in Bangalore…"
                  className="min-h-[108px] resize-y"
                />
              </ProfileRow>

              <ProfileRow label="Website" htmlFor="profile-website">
                <Input
                  id="profile-website"
                  variant="standalone"
                  value={form.website ?? ''}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://powerproof.live"
                  helperText={websiteHelperText}
                  helperVariant={websiteHelperVariant}
                  fieldStateBorder={websiteHelperVariant === 'error'}
                />
              </ProfileRow>

              <ProfileRow label="Send feedback">
                <div className="flex flex-col gap-2 layout-sm:flex-row layout-sm:flex-wrap">
                  {USER_FEEDBACK_TYPES.map((type) => {
                    const Icon = USER_FEEDBACK_ICONS[type]
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="layout-sm:flex-1"
                        onClick={() => {
                          setFeedbackInitialType(type)
                          setFeedbackOpen(true)
                        }}
                      >
                        <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {USER_FEEDBACK_LABELS[type]}
                      </Button>
                    )
                  })}
                </div>
              </ProfileRow>

              <ProfileRow label="Log out">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={async () => {
                    await signOut()
                    navigate('/', { replace: true })
                  }}
                >
                  <LogOut className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                  Log out
                </Button>
              </ProfileRow>
            </ProfileRowGroup>
          ) : tab === 'subscription' ? (
            <div
              className={cn(
                'w-full divide-y divide-border-subtle/60 overflow-hidden rounded-2xl border border-border-subtle/70 bg-card',
                embedded ? 'max-w-2xl' : 'max-w-md',
              )}
            >
              {subscriptionLoading ? (
                <div className="h-20 animate-pulse bg-muted/30" />
              ) : subscriptionStatus?.success ? (
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Crown className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="text-[15px] font-semibold tracking-tight text-foreground">
                        {subscriptionStatus.plan.name}
                      </p>
                      <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-sunken px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {subscriptionStatus.status}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-muted-foreground">
                      {formatPlanPeriodLabel(
                        subscriptionStatus.status,
                        subscriptionStatus.period_end,
                      )}
                    </p>
                    <TrialDaysBadge status={subscriptionStatus} variant="pill" />
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={cancellationLoading}
                    onClick={() => setCancelPlanConfirmOpen(true)}
                    className="shrink-0"
                  >
                    Cancel Plan
                  </Button>
                </div>
              ) : null}

              {pendingSubscription ? (
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="text-[15px] font-semibold tracking-tight text-foreground">
                        {pendingSubscription.plan_name}
                      </p>
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300">
                        Payment pending
                      </span>
                    </div>
                    <p className="text-[12.5px] text-muted-foreground">
                      Complete payment to activate this plan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={checkoutLoading}
                    onClick={() => void resumePendingSubscription()}
                    className="shrink-0"
                  >
                    {checkoutLoading ? 'Opening…' : 'Complete Payment'}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ) : null}

              {!subscriptionStatus?.success && !pendingSubscription ? (
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-bg-sunken text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="text-[15px] font-semibold tracking-tight text-foreground">
                        No active plan
                      </p>
                    </div>
                    <p className="text-[12.5px] text-muted-foreground">
                      Start with Unlimited for research, sourcing, market tests, and the investor database.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/pricing')}
                    >
                      View pricing
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={openSubscriptionPricingDialog}
                    >
                      View Unlimited
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : tab === 'usage' ? (
            <div
              className={cn(
                'w-full overflow-hidden rounded-2xl border border-border-subtle/70 bg-card',
                embedded ? 'max-w-2xl' : 'max-w-md',
              )}
            >
              {subscriptionLoading ? (
                <div className="h-40 animate-pulse bg-muted/30" />
              ) : subscriptionStatus?.success ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle/60 px-4 py-4 sm:px-5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Gauge className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <p className="text-[15px] font-semibold tracking-tight text-foreground">
                          {subscriptionStatus.plan.name}
                        </p>
                      </div>
                      <p className="text-[12.5px] text-muted-foreground">
                        {formatPlanPeriodLabel(
                          subscriptionStatus.status,
                          subscriptionStatus.period_end,
                        )}
                      </p>
                      <TrialDaysBadge status={subscriptionStatus} variant="pill" />
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-4 sm:px-5">
                    {ALL_USAGE_BUCKETS.map((bucket) => (
                      <UsageBucketCard
                        key={bucket}
                        bucket={bucket}
                        usage={subscriptionStatus.usage[bucket]}
                        unlimited={isUnlimitedPaidPlanDisplay(subscriptionStatus)}
                      />
                    ))}
                    <AiChatRow chat={subscriptionStatus.chat} />
                  </div>
                </>
              ) : (
                <div className="px-4 py-8 text-center sm:px-5">
                  <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Gauge className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-[14px] font-semibold text-foreground">
                    No usage yet
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    Start Unlimited to use research, sourcing, market tests, and AI chat.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/pricing')}
                    >
                      View pricing
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={openSubscriptionPricingDialog}
                    >
                      Start trial
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={cn(embedded ? 'max-w-2xl' : 'max-w-md', 'w-full')}>
              <ByokSettings />
            </div>
          )}
        </div>
      </div>
      <UserFeedbackDialog
        initialType={feedbackInitialType}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
      <ConfirmDialog
        open={cancelPlanConfirmOpen}
        title="Cancel your plan?"
        description="Your subscription will be cancelled and plan access may end immediately."
        confirmLabel={cancellationLoading ? 'Cancelling…' : 'Cancel Plan'}
        destructive
        onCancel={() => {
          if (!cancellationLoading) setCancelPlanConfirmOpen(false)
        }}
        onConfirm={() => {
          if (!cancellationLoading) void confirmCancelSubscription()
        }}
      />
    </ProfilePageShell>
  )
}

export default ProfilePage;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders, json } from '../_shared/http.ts'
import { parseAuthenticatedJwtUser } from '../_shared/auth.ts'

type CreditPackageRow = {
  id: string
  name: string
  credits: number
  price_inr: number | null
  is_active: boolean
}

type UserCreditsRow = {
  balance: number
  lifetime_earned: number
  lifetime_purchased: number
  lifetime_spent: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'Unauthorized' }, 401)

  let body: { packageId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const packageId = String(body?.packageId ?? '').trim()
  if (!packageId) return json({ error: 'Missing packageId' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRole) return json({ error: 'Server misconfigured' }, 500)
  const db = createClient(supabaseUrl, serviceRole)

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', authed.id)
    .maybeSingle<{ role: string | null }>()
  const canRepeatClaim = profile?.role === 'admin' || profile?.role === 'super_admin'

  const { data: pkg, error: pkgError } = await db
    .from('credit_packages')
    .select('id,name,credits,price_inr,is_active')
    .eq('id', packageId)
    .eq('is_active', true)
    .single<CreditPackageRow>()
  if (pkgError || !pkg) return json({ error: 'Package not found' }, 404)
  if (Number(pkg.price_inr ?? 0) !== 0) return json({ error: 'Package is not free' }, 400)

  if (!canRepeatClaim) {
    const { data: priorPurchases, error: priorErr } = await db
      .from('credit_purchases')
      .select('package_id')
      .eq('user_id', authed.id)
      .eq('status', 'completed')
    if (priorErr) return json({ error: 'Could not verify prior claims' }, 500)

    const priorIds = [...new Set((priorPurchases ?? []).map((r) => r.package_id).filter(Boolean) as string[])]
    if (priorIds.length > 0) {
      const { data: priorPkgs, error: listErr } = await db
        .from('credit_packages')
        .select('id, price_inr')
        .in('id', priorIds)
      if (listErr) return json({ error: 'Could not verify packages' }, 500)
      const claimedFreeBefore = (priorPkgs ?? []).some((p) => Number(p.price_inr ?? 0) === 0)
      if (claimedFreeBefore) return json({ success: false, reason: 'already_claimed' })
    }
  }

  const { data: purchase, error: purchaseError } = await db
    .from('credit_purchases')
    .insert({
      user_id: authed.id,
      package_id: pkg.id,
      credits_bought: pkg.credits,
      amount_paid_inr: 0,
      status: 'completed',
      completed_at: new Date().toISOString(),
      package_price_usd: 0,
      display_currency: 'INR',
      display_amount: 0,
      metadata: {
        source: 'payments-claim-free',
        reason: canRepeatClaim ? 'free_package_repeat' : 'free_package',
      },
    })
    .select('id')
    .single<{ id: string }>()
  if (purchaseError) {
    const code = (purchaseError as { code?: string }).code
    if (code === '23505') return json({ success: false, reason: 'already_claimed' })
    return json({ error: 'Could not record free claim', details: purchaseError.message }, 500)
  }
  if (!purchase) return json({ error: 'Could not record free claim' }, 500)

  const { data: current } = await db
    .from('user_credits')
    .select('balance,lifetime_earned,lifetime_purchased,lifetime_spent')
    .eq('user_id', authed.id)
    .maybeSingle<UserCreditsRow>()

  const before = Number(current?.balance ?? 0)
  const newBalance = before + pkg.credits

  const upsertPayload = {
    user_id: authed.id,
    balance: newBalance,
    lifetime_earned: Number(current?.lifetime_earned ?? 0) + pkg.credits,
    lifetime_purchased: Number(current?.lifetime_purchased ?? 0),
    lifetime_spent: Number(current?.lifetime_spent ?? 0),
    updated_at: new Date().toISOString(),
  }
  const { error: creditsError } = await db.from('user_credits').upsert(upsertPayload)
  if (creditsError) return json({ error: 'Could not update credits' }, 500)

  const { error: txError } = await db.from('credit_transactions').insert({
    user_id: authed.id,
    type: 'bonus',
    amount: pkg.credits,
    balance_before: before,
    balance_after: newBalance,
    feature: 'free_package',
    metadata: { package_id: pkg.id, package_name: pkg.name, purchase_id: purchase.id },
  })
  if (txError) return json({ error: 'Could not log transaction' }, 500)

  return json({ success: true, creditsAdded: pkg.credits, newBalance })
})

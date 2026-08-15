// send-completion-email v2
// ADDED: 'renewal_reminder' feature branch — informational email sent before Razorpay
// auto-charges a subscription renewal. Same pattern/infra as research/roadmap/warroom/sourcing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

const FROM_EMAIL = 'analyst@powerproof.live'
const FROM_NAME  = 'PowerProof AI'

type Feature = 'research' | 'roadmap' | 'warroom' | 'sourcing' | 'renewal_reminder'

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PowerProof</title></head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:20px;font-weight:700;color:#3B59F5;letter-spacing:-0.5px;">PowerProof</span>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;">
      ${content}
    </div>
    <div style="margin-top:20px;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
      Sent by PowerProof AI &middot; analyst@powerproof.live<br>
      You're receiving this because you use PowerProof to research and build.
    </div>
  </div>
</body>
</html>`
}

function pill(text: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600;background:${bg};color:${fg};">${text}</span>`
}

function ctaButton(label: string, url: string): string {
  return `
  <div style="margin-top:28px;">
    <a href="${url}" style="display:inline-block;background:#3B59F5;color:#FFFFFF;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;text-decoration:none;">${label} &rarr;</a>
  </div>`
}

function divider(): string {
  return `<div style="border-top:1px solid #F3F4F6;margin:20px 0;"></div>`
}

function statRow(label: string, value: string): string {
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F9FAFB;">
    <span style="font-size:13px;color:#6B7280;">${label}</span>
    <span style="font-size:13px;font-weight:600;color:#111827;">${value}</span>
  </div>`
}

function buildResearchEmail(data: Record<string, unknown>, appUrl: string): { subject: string; html: string } {
  const title     = String(data.title     ?? 'Your Research')
  const score     = data.score     != null ? `${data.score}/100` : null
  const satVerdict = String(data.saturation_verdict ?? data.saturation_level ?? '')
  const revenue   = data.revenue_hint ?? (data.monthly_rev_min != null ? `$${data.monthly_rev_min}–$${data.monthly_rev_max}/mo` : null)
  const opportunityId = String(data.opportunity_id ?? '')
  const slug      = String(data.slug ?? '')
  const url       = `${appUrl}/o/${slug || opportunityId}`
  const country   = String(data.country ?? 'India')

  const satBg  = satVerdict === 'Saturated' ? '#FEE2E2' : satVerdict === 'Blue Ocean' ? '#DCFCE7' : '#FEF3C7'
  const satFg  = satVerdict === 'Saturated' ? '#991B1B' : satVerdict === 'Blue Ocean' ? '#166534' : '#92400E'
  const satLabel = satVerdict || 'Assessed'

  const snapshot = String(data.short_desc ?? data.tagline ?? '')
  const bigOpportunity = String(data.one_big_opportunity ?? '')

  const content = `
    <div style="padding:28px 28px 8px;">
      <div style="margin-bottom:12px;">${pill('Research Complete', '#EEF2FF', '#3730A3')}</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${title}</h1>
      <p style="margin:0;font-size:14px;color:#6B7280;">Market research for ${country} is ready.</p>
    </div>
    ${divider()}
    <div style="padding:0 28px;">
      ${score ? statRow('Opportunity Score', score) : ''}
      ${satVerdict ? `<div style="padding:10px 0;border-bottom:1px solid #F9FAFB;">${pill(satLabel, satBg, satFg)}</div>` : ''}
      ${revenue ? statRow('Revenue Potential', String(revenue)) : ''}
    </div>
    ${snapshot ? `
    ${divider()}
    <div style="padding:0 28px;">
      <p style="font-size:13px;color:#6B7280;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Market Snapshot</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">${snapshot}</p>
    </div>` : ''}
    ${bigOpportunity ? `
    <div style="margin:16px 28px 0;padding:14px;background:#F0FDF4;border-radius:10px;border:1px solid #BBF7D0;">
      <p style="font-size:12px;font-weight:600;color:#166534;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Key Opportunity</p>
      <p style="font-size:14px;color:#15803D;line-height:1.5;margin:0;">${bigOpportunity}</p>
    </div>` : ''}
    <div style="padding:0 28px 28px;">
      ${ctaButton('View Full Research Report', url)}
    </div>`

  return { subject: `Your research on "${title}" is ready`, html: baseLayout(content) }
}

function buildRoadmapEmail(data: Record<string, unknown>, appUrl: string): { subject: string; html: string } {
  const title         = String(data.title         ?? 'Your Roadmap')
  const totalWeeks    = data.total_weeks    != null ? `${data.total_weeks} weeks` : null
  const difficulty    = String(data.difficulty    ?? '')
  const successVision = String(data.success_vision ?? '')
  const openingMsg    = String(data.opening_message ?? '')
  const persona       = String(data.persona        ?? '')
  const roadmapId     = String(data.roadmap_id     ?? '')
  const url           = `${appUrl}/roadmap/${roadmapId}`

  const personaLabels: Record<string, string> = {
    student: '🎓 Student', employee: '💼 Employee', entrepreneur: '🚀 Entrepreneur',
    smb_owner: '🏪 Small Business Owner', ceo_executive: '📊 CEO / Executive', government: '🏛️ Government Body',
  }
  const personaLabel = personaLabels[persona] ?? null
  const diffLabel = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : null

  const content = `
    <div style="padding:28px 28px 8px;">
      <div style="margin-bottom:12px;">${pill('Roadmap Ready', '#F0FDF4', '#166534')}</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${title}</h1>
      ${personaLabel ? `<p style="margin:0;font-size:14px;color:#6B7280;">${personaLabel}</p>` : ''}
    </div>
    ${divider()}
    <div style="padding:0 28px;">
      ${totalWeeks  ? statRow('Total Duration',  totalWeeks) : ''}
      ${diffLabel   ? statRow('Difficulty',       diffLabel)  : ''}
    </div>
    ${openingMsg ? `
    ${divider()}
    <div style="padding:0 28px;">
      <p style="font-size:13px;color:#6B7280;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What PowerProof Sees</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;font-style:italic;">&ldquo;${openingMsg}&rdquo;</p>
    </div>` : ''}
    ${successVision ? `
    <div style="margin:16px 28px 0;padding:14px;background:#EEF2FF;border-radius:10px;border:1px solid #C7D2FE;">
      <p style="font-size:12px;font-weight:600;color:#3730A3;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">What Winning Looks Like</p>
      <p style="font-size:14px;color:#1E1B4B;line-height:1.5;margin:0;">${successVision}</p>
    </div>` : ''}
    <div style="padding:0 28px 28px;">
      ${ctaButton('View Your Roadmap', url)}
    </div>`

  return { subject: `Your roadmap is ready — ${title}`, html: baseLayout(content) }
}

function buildWarroomEmail(data: Record<string, unknown>, appUrl: string): { subject: string; html: string } {
  const businessName  = String(data.business_name  ?? data.business_type ?? 'Your Business')
  const edgeDecl      = String(data.edge_declaration ?? '')
  const stepCount     = data.step_count != null ? `${data.step_count} battle moves` : null
  const thirtyDay     = String(data.thirty_day_sprint ?? '')
  const playbookId    = String(data.playbook_id    ?? '')
  const url           = `${appUrl}/warroom/${playbookId}`

  const content = `
    <div style="padding:28px 28px 8px;">
      <div style="margin-bottom:12px;">${pill('War Room Ready', '#FEF2F2', '#991B1B')}</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">War Room Playbook</h1>
      <p style="margin:0;font-size:14px;color:#6B7280;">${businessName}</p>
    </div>
    ${edgeDecl ? `
    ${divider()}
    <div style="padding:0 28px;">
      <p style="font-size:13px;color:#6B7280;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Edge Declaration</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;font-style:italic;">&ldquo;${edgeDecl}&rdquo;</p>
    </div>` : ''}
    ${stepCount ? `
    ${divider()}
    <div style="padding:0 28px;">
      ${statRow('Battle Moves', stepCount)}
    </div>` : ''}
    ${thirtyDay ? `
    <div style="margin:16px 28px 0;padding:14px;background:#FFF7ED;border-radius:10px;border:1px solid #FED7AA;">
      <p style="font-size:12px;font-weight:600;color:#9A3412;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">30-Day Sprint</p>
      <p style="font-size:14px;color:#7C2D12;line-height:1.5;margin:0;">${thirtyDay}</p>
    </div>` : ''}
    <div style="padding:0 28px 28px;">
      ${ctaButton('Open War Room Playbook', url)}
    </div>`

  return { subject: `Your War Room playbook is ready — ${businessName}`, html: baseLayout(content) }
}

function buildSourcingEmail(data: Record<string, unknown>, appUrl: string): { subject: string; html: string } {
  const keyword      = String(data.keyword      ?? 'Your Product')
  const totalResults = data.total_results != null ? `${data.total_results} suppliers found` : null
  const searchId     = String(data.search_id   ?? '')
  const sources      = data.sources_active != null ? `${data.sources_active} marketplaces` : 'IndiaMart, Alibaba, Made-in-China, 1688'
  const url          = `${appUrl}/sourcing/${searchId}`

  const content = `
    <div style="padding:28px 28px 8px;">
      <div style="margin-bottom:12px;">${pill('Sourcing Brief Ready', '#F0F9FF', '#0369A1')}</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">Sourcing Brief</h1>
      <p style="margin:0;font-size:14px;color:#6B7280;">${keyword}</p>
    </div>
    ${divider()}
    <div style="padding:0 28px;">
      ${totalResults ? statRow('Suppliers Found', totalResults) : ''}
      ${statRow('Sources Searched', sources)}
    </div>
    <div style="margin:16px 28px 0;padding:14px;background:#F0F9FF;border-radius:10px;border:1px solid #BAE6FD;">
      <p style="font-size:14px;color:#0C4A6E;line-height:1.5;margin:0;">Your sourcing results include verified suppliers, pricing ranges, MOQ details, and direct contact links.</p>
    </div>
    <div style="padding:0 28px 28px;">
      ${ctaButton('View Sourcing Brief', url)}
    </div>`

  return { subject: `Your sourcing brief for "${keyword}" is ready`, html: baseLayout(content) }
}

function buildRenewalReminderEmail(data: Record<string, unknown>, appUrl: string): { subject: string; html: string } {
  const planName   = String(data.plan_name ?? 'your plan')
  const priceInr   = data.price_inr != null ? `₹${data.price_inr}` : null
  const renewsOn   = String(data.renews_on ?? '')
  const url        = `${appUrl}/profile`

  const content = `
    <div style="padding:28px 28px 8px;">
      <div style="margin-bottom:12px;">${pill('Upcoming Renewal', '#FFF7ED', '#9A3412')}</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">Your ${planName} plan renews soon</h1>
      <p style="margin:0;font-size:14px;color:#6B7280;">This is a heads-up before your card is charged — no action needed if you'd like to continue.</p>
    </div>
    ${divider()}
    <div style="padding:0 28px;">
      ${renewsOn ? statRow('Renews on', renewsOn) : ''}
      ${priceInr ? statRow('Amount', `${priceInr} (auto-debited via Razorpay)`) : ''}
    </div>
    <div style="margin:16px 28px 0;padding:14px;background:#FFF7ED;border-radius:10px;border:1px solid #FED7AA;">
      <p style="font-size:14px;color:#7C2D12;line-height:1.5;margin:0;">If you'd like to change or cancel your plan before this charge happens, you can do so from your profile.</p>
    </div>
    <div style="padding:0 28px 28px;">
      ${ctaButton('Manage Subscription', url)}
    </div>`

  return { subject: `Your ${planName} plan renews soon`, html: baseLayout(content) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: cors })

  const RESEND_KEY       = Deno.env.get('RESEND_API_KEY')
  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const APP_URL          = Deno.env.get('APP_URL') ?? 'https://powerproof.live'
  const INTERNAL_SECRET  = Deno.env.get('INTERNAL_SECRET') ?? ''

  if (!RESEND_KEY || !SUPABASE_URL || !SUPABASE_SVC_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: cors })

  const incomingSecret = req.headers.get('x-internal-secret') ?? ''
  if (INTERNAL_SECRET && incomingSecret !== INTERNAL_SECRET)
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors })

  try {
    const body = await req.json()
    const { feature, user_id, data } = body as { feature: Feature; user_id: string; data: Record<string, unknown> }

    if (!feature || !user_id || !data)
      return new Response(JSON.stringify({ error: 'feature, user_id, data required' }), { status: 400, headers: cors })

    const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)
    const { data: { user }, error: userErr } = await db.auth.admin.getUserById(user_id)
    if (userErr || !user?.email)
      return new Response(JSON.stringify({ error: 'User not found or no email' }), { status: 404, headers: cors })

    const toEmail = user.email

    let subject = ''
    let html    = ''
    if (feature === 'research') {
      const built = buildResearchEmail(data, APP_URL); subject = built.subject; html = built.html
    } else if (feature === 'roadmap') {
      const built = buildRoadmapEmail(data, APP_URL); subject = built.subject; html = built.html
    } else if (feature === 'warroom') {
      const built = buildWarroomEmail(data, APP_URL); subject = built.subject; html = built.html
    } else if (feature === 'sourcing') {
      const built = buildSourcingEmail(data, APP_URL); subject = built.subject; html = built.html
    } else if (feature === 'renewal_reminder') {
      const built = buildRenewalReminderEmail(data, APP_URL); subject = built.subject; html = built.html
    } else {
      return new Response(JSON.stringify({ error: `Unknown feature: ${feature}` }), { status: 400, headers: cors })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [toEmail], subject, html }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '')
      console.error(`[completion-email] Resend error ${resendRes.status}:`, errText)
      return new Response(JSON.stringify({ error: 'Email send failed', detail: errText }), { status: 502, headers: cors })
    }

    const resendData = await resendRes.json()
    console.log(`[completion-email] sent feature=${feature} to=${toEmail} id=${resendData.id}`)
    return new Response(JSON.stringify({ ok: true, email_id: resendData.id, to: toEmail, feature }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[completion-email] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
})

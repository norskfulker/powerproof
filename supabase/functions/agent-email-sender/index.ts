// Deploy: npx supabase functions deploy agent-financial-runner
// Deploy: npx supabase functions deploy agent-email-sender

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const FROM_EMAIL = 'analyst@powerproof.live'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    asNumber(value),
  )
}

function sentimentStyle(sentiment: string): { bg: string; fg: string; label: string } {
  switch (sentiment) {
    case 'positive':
      return { bg: '#DCFCE7', fg: '#166534', label: 'Positive' }
    case 'warning':
      return { bg: '#FFEDD5', fg: '#9A3412', label: 'Warning' }
    case 'critical':
      return { bg: '#FEE2E2', fg: '#991B1B', label: 'Critical' }
    default:
      return { bg: '#FEF3C7', fg: '#92400E', label: 'Neutral' }
  }
}

function severityStyle(severity: string): { bg: string; border: string; fg: string } {
  switch (severity) {
    case 'high':
      return { bg: '#FEF2F2', border: '#FCA5A5', fg: '#991B1B' }
    case 'medium':
      return { bg: '#FFF7ED', border: '#FDBA74', fg: '#9A3412' }
    default:
      return { bg: '#F9FAFB', border: '#D1D5DB', fg: '#374151' }
  }
}

function priorityStyle(priority: string): { bg: string; fg: string } {
  switch (priority) {
    case 'high':
      return { bg: '#FEE2E2', fg: '#991B1B' }
    case 'medium':
      return { bg: '#FEF3C7', fg: '#92400E' }
    default:
      return { bg: '#E5E7EB', fg: '#374151' }
  }
}

function buildDigestHtml(params: {
  digest: Record<string, unknown>
}): string {
  const { digest } = params
  const metrics = (digest.metrics as Record<string, unknown> | undefined) ?? {}
  const anomalies = asArray(digest.anomalies)
  const recommendations = asArray(digest.recommendations)
  const sentiment = sentimentStyle(asString(digest.sentiment, 'neutral'))
  const runDate = new Date(asString(digest.run_date, new Date().toISOString())).toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  })

  const anomalyHtml = anomalies.length
    ? anomalies
        .map((item) => {
          const row = (item ?? {}) as Record<string, unknown>
          const style = severityStyle(asString(row.severity, 'low'))
          return `
            <div style="border:1px solid ${style.border};background:${style.bg};color:${style.fg};border-radius:10px;padding:10px 12px;margin-top:8px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;">${asString(row.type, 'Anomaly')}</div>
              <div style="margin-top:4px;font-size:14px;line-height:1.45;">${asString(row.description, 'No details provided.')}</div>
            </div>
          `
        })
        .join('')
    : '<div style="font-size:14px;color:#4B5563;">No major anomalies detected today.</div>'

  const recommendationsHtml = recommendations.length
    ? recommendations
        .map((item, idx) => {
          const row = (item ?? {}) as Record<string, unknown>
          const priority = priorityStyle(asString(row.priority, 'low'))
          return `
            <div style="margin-top:10px;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;background:#FFFFFF;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-size:14px;font-weight:700;color:#111827;">${idx + 1}. ${asString(row.action, 'No action provided')}</div>
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:9999px;background:${priority.bg};color:${priority.fg};text-transform:uppercase;">${asString(row.priority, 'low')}</span>
              </div>
              <div style="margin-top:5px;font-size:13px;color:#4B5563;">${asString(row.reason, '')}</div>
            </div>
          `
        })
        .join('')
    : '<div style="font-size:14px;color:#4B5563;">No recommendations available.</div>'

  return `
  <div style="margin:0;padding:0;background:#F7F5F0;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:700px;margin:0 auto;padding:22px 12px;">
      <div style="background:#FFFFFF;border:1px solid #E7E5E4;border-radius:14px;overflow:hidden;">
        <div style="padding:18px 20px;border-bottom:1px solid #E5E7EB;">
          <div style="font-size:22px;font-weight:700;color:#1A6B3C;">PowerProof Financial Analyst</div>
          <div style="margin-top:6px;font-size:13px;color:#6B7280;">${runDate}</div>
        </div>
        <div style="padding:12px 20px;background:${sentiment.bg};color:${sentiment.fg};font-size:13px;font-weight:700;text-transform:uppercase;">
          Sentiment: ${sentiment.label}
        </div>
        <div style="padding:20px;">
          <h2 style="margin:0 0 8px 0;font-size:16px;color:#1F2937;">Executive Summary</h2>
          <div style="font-size:14px;line-height:1.6;color:#374151;">${asString(digest.summary, 'Summary not available.')}</div>

          <h2 style="margin:22px 0 10px 0;font-size:16px;color:#1F2937;">Key Metrics</h2>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
            <div style="border:1px solid #E5E7EB;background:#FFFFFF;border-radius:10px;padding:10px;">
              <div style="font-size:12px;color:#6B7280;">Total Revenue</div>
              <div style="font-size:18px;font-weight:700;color:#1A6B3C;">${formatCurrency(metrics.total_revenue_30d)}</div>
            </div>
            <div style="border:1px solid #E5E7EB;background:#FFFFFF;border-radius:10px;padding:10px;">
              <div style="font-size:12px;color:#6B7280;">Total Expenses</div>
              <div style="font-size:18px;font-weight:700;color:#B91C1C;">${formatCurrency(metrics.total_expenses_30d)}</div>
            </div>
            <div style="border:1px solid #E5E7EB;background:#FFFFFF;border-radius:10px;padding:10px;">
              <div style="font-size:12px;color:#6B7280;">Net Position</div>
              <div style="font-size:18px;font-weight:700;color:#111827;">${formatCurrency(metrics.net_position_30d)}</div>
            </div>
            <div style="border:1px solid #E5E7EB;background:#FFFFFF;border-radius:10px;padding:10px;">
              <div style="font-size:12px;color:#6B7280;">Revenue Trend</div>
              <div style="font-size:18px;font-weight:700;color:#111827;text-transform:capitalize;">${asString(metrics.revenue_trend, 'flat')}</div>
            </div>
          </div>

          <h2 style="margin:22px 0 8px 0;font-size:16px;color:#1F2937;">Anomalies</h2>
          ${anomalyHtml}

          <h2 style="margin:22px 0 8px 0;font-size:16px;color:#1F2937;">Recommendations</h2>
          ${recommendationsHtml}
        </div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#6B7280;text-align:center;">
        Sent by PowerProof AI Workforce · analyst@powerproof.live · Unsubscribe
      </div>
    </div>
  </div>
  `
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return json({ error: 'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY' }, 500)
  }

  let body: { agent_id?: string; digest_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const agentId = asString(body.agent_id).trim()
  const digestId = asString(body.digest_id).trim()
  if (!agentId || !digestId) {
    return json({ error: 'agent_id and digest_id are required' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const [{ data: digest, error: digestErr }, { data: agent, error: agentErr }, { data: members, error: membersErr }] =
    await Promise.all([
      supabase.from('agent_digests').select('*').eq('id', digestId).single(),
      supabase.from('ai_agents').select('*').eq('id', agentId).single(),
      supabase
        .from('agent_team_members')
        .select('*')
        .eq('agent_id', agentId)
        .eq('notify_digest', true),
    ])

  if (digestErr) return json({ error: digestErr.message }, 404)
  if (agentErr) return json({ error: agentErr.message }, 404)
  if (membersErr) return json({ error: membersErr.message }, 500)

  const recipients = (members ?? []).filter((row) => typeof row.email === 'string' && row.email.trim().length > 0)
  if (!recipients.length) return json({ ok: true, sent: 0, message: 'No team members with notify_digest=true' })

  const html = buildDigestHtml({
    digest: digest as Record<string, unknown>,
  })

  let sent = 0
  for (const member of recipients) {
    const toEmail = String(member.email).trim()
    let status: 'sent' | 'failed' | 'bounced' = 'sent'

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `PowerProof Financial Analyst <${FROM_EMAIL}>`,
          to: [toEmail],
          subject: 'Your Daily Financial Digest',
          html,
        }),
      })
      if (!resendRes.ok) {
        status = 'failed'
        const errText = await resendRes.text().catch(() => '')
        console.error('agent-email-sender resend error', toEmail, resendRes.status, errText)
      } else {
        sent += 1
      }
    } catch (error) {
      status = 'failed'
      console.error('agent-email-sender send failed', toEmail, error)
    }

    const { error: logErr } = await supabase.from('agent_email_logs').insert({
      agent_id: agentId,
      digest_id: digestId,
      recipient_email: toEmail,
      status,
      sent_at: new Date().toISOString(),
    })
    if (logErr) console.error('agent-email-sender log insert failed', logErr)
  }

  return json({ ok: true, sent, total: recipients.length })
})

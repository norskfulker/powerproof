import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const FROM_EMAIL = 'analyst@powerproof.live'
const ADMIN_EMAIL = 'vermillion936@gmail.com'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type AlertType = 'agent_failure' | 'credit_anomaly' | 'audit_alert' | 'uptime'

interface AlertPayload {
  type: AlertType
  title: string
  body: string
  meta?: Record<string, unknown>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

function severityColor(severity: string) {
  switch (severity) {
    case 'critical': return { bg: '#FEE2E2', border: '#EF4444', badge: '#991B1B', label: 'CRITICAL' }
    case 'high':     return { bg: '#FEF2F2', border: '#FCA5A5', badge: '#B91C1C', label: 'HIGH' }
    case 'medium':   return { bg: '#FFF7ED', border: '#FDBA74', badge: '#9A3412', label: 'MEDIUM' }
    default:         return { bg: '#F9FAFB', border: '#E5E7EB', badge: '#374151', label: 'LOW' }
  }
}

function buildAlertHtml(payload: AlertPayload): string {
  const sev = severityColor(payload.severity ?? 'medium')
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  const metaRows = payload.meta
    ? Object.entries(payload.meta)
        .map(([k, v]) => `
          <tr>
            <td style="padding:6px 8px;color:#6B7280;font-size:13px;white-space:nowrap;">${k}</td>
            <td style="padding:6px 8px;color:#111827;font-size:13px;font-weight:500;">${String(v ?? '—')}</td>
          </tr>`)
        .join('')
    : ''

  return `
  <div style="margin:0;padding:0;background:#F7F5F0;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
      <div style="background:#FFFFFF;border:1px solid #E7E5E4;border-radius:14px;overflow:hidden;">

        <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:20px;font-weight:700;color:#1A6B3C;">PowerProof Alert</div>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:9999px;background:${sev.badge};color:#fff;">${sev.label}</span>
        </div>

        <div style="padding:20px;background:${sev.bg};border-bottom:2px solid ${sev.border};">
          <div style="font-size:17px;font-weight:700;color:#111827;">${payload.title}</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#374151;">${payload.body}</div>
        </div>

        ${metaRows ? `
        <div style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${metaRows}</tbody>
          </table>
        </div>` : ''}

        <div style="padding:12px 20px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;">
          ${now} IST · PowerProof admin alert · vermillion936@gmail.com
        </div>
      </div>
    </div>
  </div>
  `
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Verify webhook secret so only DB triggers can call this
  const secret = Deno.env.get('ALERT_WEBHOOK_SECRET') ?? ''
  const incomingSecret = req.headers.get('x-webhook-secret') ?? ''
  if (secret && incomingSecret !== secret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!resendApiKey) return json({ error: 'Missing RESEND_API_KEY' }, 500)

  let payload: AlertPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!payload.type || !payload.title || !payload.body) {
    return json({ error: 'type, title, body required' }, 400)
  }

  const html = buildAlertHtml(payload)

  const subjectPrefix: Record<AlertType, string> = {
    agent_failure:  '[ALERT] Agent run failed',
    credit_anomaly: '[ALERT] Credit anomaly detected',
    audit_alert:    '[ALERT] Admin action detected',
    uptime:         '[ALERT] Uptime issue',
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `PowerProof Alerts <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: subjectPrefix[payload.type] ?? '[ALERT] PowerProof',
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text().catch(() => '')
    console.error('[admin-alert] Resend error', resendRes.status, err)
    return json({ error: 'Email send failed', detail: err }, 500)
  }

  console.log('[admin-alert] Sent', payload.type, payload.title)
  return json({ ok: true })
})

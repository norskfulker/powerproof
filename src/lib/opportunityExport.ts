import { downloadBlob, downloadCSV, downloadJSON } from '@/lib/download'

export type OpportunityExportFormat = 'json' | 'csv' | 'markdown'

function slugBase(opp: { slug?: string; id?: string }) {
  return String(opp.slug ?? opp.id ?? 'opportunity').replace(/[^\w-]+/g, '-')
}

function flattenForCsv(opp: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(opp)) {
    if (value === null || value === undefined) {
      row[key] = ''
    } else if (typeof value === 'object') {
      row[key] = JSON.stringify(value)
    } else {
      row[key] = value
    }
  }
  return row
}

function buildOpportunityMarkdown(opp: Record<string, unknown>): string {
  const title = String(opp.title ?? 'Opportunity')
  const lines: string[] = [`# ${title}`, '']

  const tagline = opp.tagline ?? ''
  if (tagline) {
    lines.push(`> ${String(tagline)}`, '')
  }

  const scalarFields: Array<[string, string]> = [
    ['Category', 'category_slug'],
    ['Country', 'country'],
    ['Setup (min)', 'setup_min'],
    ['Setup (max)', 'setup_max'],
    ['Monthly revenue (min)', 'monthly_rev_min'],
    ['Monthly revenue (max)', 'monthly_rev_max'],
    ['Monthly profit (min)', 'monthly_profit_min'],
    ['Monthly profit (max)', 'monthly_profit_max'],
    ['Margin %', 'margin_pct'],
    ['Ease', 'ease'],
  ]

  lines.push('## Overview', '')
  for (const [label, key] of scalarFields) {
    const v = opp[key]
    if (v !== null && v !== undefined && v !== '') {
      lines.push(`- **${label}:** ${v}`)
    }
  }
  lines.push('')

  const streams = opp.revenue_streams
  if (Array.isArray(streams) && streams.length > 0) {
    lines.push('## Revenue streams', '')
    for (const s of streams) {
      const stream = s as Record<string, unknown>
      const label = String(stream.label ?? 'Stream')
      const pct = stream.pct_of_revenue ?? '—'
      lines.push(`### ${label} (${pct}%)`, '')
      if (stream.description) lines.push(String(stream.description), '')
      lines.push(
        `- Model: ${stream.model ?? '—'}`,
        `- Frequency: ${stream.frequency ?? '—'}`,
        stream.avg_ticket_usd ? `- Avg ticket (USD): ${stream.avg_ticket_usd}` : '',
        stream.growth_potential ? `- Growth: ${stream.growth_potential}` : '',
        stream.dependency ? `- Depends on: ${stream.dependency}` : '',
        stream.unlock_at ? `- Unlocks: ${stream.unlock_at}` : '',
      )
      lines.push('')
    }
  }

  const nestedBlocks: Array<[string, string]> = [
    ['Machinery', 'machinery_list'],
    ['Raw materials', 'raw_materials'],
    ['Licenses', 'licenses_required'],
    ['FAQs', 'faqs'],
    ['Expert tips', 'expert_tips_structured'],
  ]

  for (const [heading, key] of nestedBlocks) {
    const data = opp[key]
    if (data) {
      lines.push(`## ${heading}`, '', '```json', JSON.stringify(data, null, 2), '```', '')
    }
  }

  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function exportOpportunity(opp: Record<string, unknown>, format: OpportunityExportFormat) {
  const base = slugBase(opp as { slug?: string; id?: string })

  if (format === 'json') {
    downloadJSON(`powerproof-opportunity-${base}.json`, opp)
    return
  }

  if (format === 'csv') {
    downloadCSV(`powerproof-opportunity-${base}.csv`, [flattenForCsv(opp)])
    return
  }

  const md = buildOpportunityMarkdown(opp)
  downloadBlob(
    `powerproof-opportunity-${base}.md`,
    new Blob([md], { type: 'text/markdown;charset=utf-8' }),
  )
}

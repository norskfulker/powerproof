export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeCSVCell(value: unknown) {
  const s = value === null || value === undefined ? '' : String(value)
  const needsQuotes = /[",\n\r]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  )

  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCSVCell(r[h])).join(',')),
  ]

  downloadBlob(filename, new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
}

export function downloadJSON(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2)
  downloadBlob(filename, new Blob([json], { type: 'application/json;charset=utf-8' }))
}


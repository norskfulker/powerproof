// Deploy: npx supabase functions deploy mineru-doc-extract
// Strategy:
// - Try MinerU Agent lightweight API first (fast, no token).
// - If page-count exceeds limit (or file too large), fall back to Precision API (token-based).

declare const Deno: any

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

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importJsZip() {
  // Lazy import to keep cold start lighter for lightweight happy path.
  // @ts-expect-error - Supabase Edge supports remote ESM imports
  const mod: any = await import('https://esm.sh/jszip@3.10.1')
  return mod.default as any
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

type MinerUTaskState = 'waiting-file' | 'uploading' | 'pending' | 'running' | 'done' | 'failed'

type AgentExtractOk = { ok: true; mode: 'lightweight'; taskId: string; markdownUrl: string; markdown: string }
type AgentExtractErr = { ok: false; mode: 'lightweight'; taskId?: string; err_code?: number | null; err_msg: string }

function isPageLimitError(err: { err_code?: number | null; err_msg?: string }) {
  if (err.err_code === -30003) return true
  const msg = String(err.err_msg ?? '').toLowerCase()
  return msg.includes('page') && msg.includes('limit')
}

type LightweightStartOk = {
  ok: true
  mode: 'lightweight'
  taskId: string
}

type LightweightStartErr = {
  ok: false
  mode: 'lightweight'
  taskId?: string
  err_code?: number | null
  err_msg: string
}

async function lightweightStart(params: {
  mineruBase: string
  fileName: string
  bytes: Uint8Array
  language: string
  page_range?: string
  enable_table: boolean
  enable_formula: boolean
  is_ocr: boolean
}): Promise<LightweightStartOk | LightweightStartErr> {
  const createRes = await fetch(`${params.mineruBase}/parse/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: params.fileName,
      language: params.language,
      page_range: params.page_range,
      enable_table: params.enable_table,
      enable_formula: params.enable_formula,
      is_ocr: params.is_ocr,
    }),
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok) {
    return { ok: false, mode: 'lightweight', err_msg: (createJson as any)?.msg ?? 'Failed to create MinerU task' }
  }

  const taskId = (createJson as any)?.data?.task_id as string | undefined
  const fileUrl = (createJson as any)?.data?.file_url as string | undefined
  if (!taskId || !fileUrl) return { ok: false, mode: 'lightweight', err_msg: 'MinerU did not return task_id/file_url' }

  const ab = params.bytes.buffer.slice(params.bytes.byteOffset, params.bytes.byteOffset + params.bytes.byteLength) as ArrayBuffer
  const putRes = await fetch(fileUrl, { method: 'PUT', body: new Blob([ab]) })
  if (!putRes.ok) return { ok: false, mode: 'lightweight', taskId, err_msg: `Upload to MinerU failed (HTTP ${putRes.status})` }

  return { ok: true, mode: 'lightweight', taskId }
}

type LightweightPoll = {
  ok: true
  mode: 'lightweight'
  taskId: string
  state: MinerUTaskState
  markdownUrl?: string
  markdown?: string
} | {
  ok: false
  mode: 'lightweight'
  taskId: string
  state: MinerUTaskState | 'unknown'
  err_code?: number | null
  err_msg: string
}

async function lightweightPoll(params: { mineruBase: string; taskId: string }): Promise<LightweightPoll> {
  const pollRes = await fetch(`${params.mineruBase}/parse/${params.taskId}`)
  const pollJson = await pollRes.json().catch(() => ({}))
  if (!pollRes.ok) return { ok: false, mode: 'lightweight', taskId: params.taskId, state: 'unknown', err_msg: 'MinerU poll failed' }

  const state = ((pollJson as any)?.data?.state ?? 'unknown') as MinerUTaskState | 'unknown'
  if (state === 'unknown') {
    return { ok: false, mode: 'lightweight', taskId: params.taskId, state, err_msg: 'MinerU returned unknown state' }
  }
  if (state === 'failed') {
    return {
      ok: false,
      mode: 'lightweight',
      taskId: params.taskId,
      state,
      err_code: (pollJson as any)?.data?.err_code ?? null,
      err_msg: (pollJson as any)?.data?.err_msg ?? 'MinerU extraction failed',
    }
  }
  if (state !== 'done') return { ok: true, mode: 'lightweight', taskId: params.taskId, state }

  const markdownUrl = (pollJson as any)?.data?.markdown_url as string | undefined
  if (!markdownUrl) return { ok: false, mode: 'lightweight', taskId: params.taskId, state, err_msg: 'MinerU did not return markdown_url' }
  const mdRes = await fetch(markdownUrl)
  const markdown = await mdRes.text()
  return { ok: true, mode: 'lightweight', taskId: params.taskId, state, markdownUrl, markdown }
}

async function lightweightExtract(params: {
  mineruBase: string
  fileName: string
  bytes: Uint8Array
  language: string
  page_range?: string
  enable_table: boolean
  enable_formula: boolean
  is_ocr: boolean
}): Promise<AgentExtractOk | AgentExtractErr> {
  const createRes = await fetch(`${params.mineruBase}/parse/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: params.fileName,
      language: params.language,
      page_range: params.page_range,
      enable_table: params.enable_table,
      enable_formula: params.enable_formula,
      is_ocr: params.is_ocr,
    }),
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok) {
    return { ok: false, mode: 'lightweight', err_msg: (createJson as any)?.msg ?? 'Failed to create MinerU task' }
  }

  const taskId = (createJson as any)?.data?.task_id as string | undefined
  const fileUrl = (createJson as any)?.data?.file_url as string | undefined
  if (!taskId || !fileUrl) return { ok: false, mode: 'lightweight', err_msg: 'MinerU did not return task_id/file_url' }

  const ab = params.bytes.buffer.slice(params.bytes.byteOffset, params.bytes.byteOffset + params.bytes.byteLength) as ArrayBuffer
  const putRes = await fetch(fileUrl, { method: 'PUT', body: new Blob([ab]) })
  if (!putRes.ok) return { ok: false, mode: 'lightweight', taskId, err_msg: `Upload to MinerU failed (HTTP ${putRes.status})` }

  const timeoutMs = 120_000
  const start = Date.now()
  let lastState: MinerUTaskState | null = null
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - start > timeoutMs) {
      return { ok: false, mode: 'lightweight', taskId, err_msg: `Timed out waiting for MinerU result (state=${lastState ?? 'unknown'})` }
    }

    const pollRes = await fetch(`${params.mineruBase}/parse/${taskId}`)
    const pollJson = await pollRes.json().catch(() => ({}))
    if (!pollRes.ok) return { ok: false, mode: 'lightweight', taskId, err_msg: 'MinerU poll failed' }

    const state = ((pollJson as any)?.data?.state ?? null) as MinerUTaskState | null
    lastState = state
    if (state === 'failed') {
      return {
        ok: false,
        mode: 'lightweight',
        taskId,
        err_code: (pollJson as any)?.data?.err_code ?? null,
        err_msg: (pollJson as any)?.data?.err_msg ?? 'MinerU extraction failed',
      }
    }
    if (state === 'done') {
      const markdownUrl = (pollJson as any)?.data?.markdown_url as string | undefined
      if (!markdownUrl) return { ok: false, mode: 'lightweight', taskId, err_msg: 'MinerU did not return markdown_url' }
      const mdRes = await fetch(markdownUrl)
      const markdown = await mdRes.text()
      return { ok: true, mode: 'lightweight', taskId, markdownUrl, markdown }
    }
    await sleep(1500)
  }
}

type PrecisionOk = { ok: true; mode: 'precision'; batchId: string; full_zip_url: string; markdown: string }
type PrecisionErr = { ok: false; mode: 'precision'; err_msg: string; err_code?: string | number | null }

type PrecisionStartOk = { ok: true; mode: 'precision'; batchId: string }
type PrecisionStartErr = { ok: false; mode: 'precision'; err_msg: string; err_code?: string | number | null }

async function precisionStart(params: { token: string; fileName: string; bytes: Uint8Array }): Promise<PrecisionStartOk | PrecisionStartErr> {
  const apiBase = 'https://mineru.net/api/v4'
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.token}`,
  }

  const dataId = crypto.randomUUID()
  const createRes = await fetch(`${apiBase}/file-urls/batch`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      model_version: 'vlm',
      files: [{ name: params.fileName, data_id: dataId }],
    }),
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok || (createJson as any)?.code !== 0) {
    return { ok: false, mode: 'precision', err_msg: (createJson as any)?.msg ?? 'Failed to create precision upload URL' }
  }

  const batchId = (createJson as any)?.data?.batch_id as string | undefined
  const fileUrl = ((createJson as any)?.data?.file_urls ?? [])[0] as string | undefined
  if (!batchId || !fileUrl) return { ok: false, mode: 'precision', err_msg: 'Precision API did not return batch_id/file_urls' }

  const ab = params.bytes.buffer.slice(params.bytes.byteOffset, params.bytes.byteOffset + params.bytes.byteLength) as ArrayBuffer
  const putRes = await fetch(fileUrl, { method: 'PUT', body: new Blob([ab]) })
  if (!putRes.ok) return { ok: false, mode: 'precision', err_msg: `Upload to precision endpoint failed (HTTP ${putRes.status})` }

  return { ok: true, mode: 'precision', batchId }
}

type PrecisionPoll =
  | { ok: true; mode: 'precision'; batchId: string; state: string; markdown?: string; full_zip_url?: string }
  | { ok: false; mode: 'precision'; batchId: string; state: string; err_msg: string; err_code?: string | number | null }

async function precisionPoll(params: { token: string; batchId: string }): Promise<PrecisionPoll> {
  const apiBase = 'https://mineru.net/api/v4'
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.token}`,
  }

  const pollRes = await fetch(`${apiBase}/extract-results/batch/${params.batchId}`, { headers: authHeaders })
  const pollJson = await pollRes.json().catch(() => ({}))
  if (!pollRes.ok || (pollJson as any)?.code !== 0) {
    return { ok: false, mode: 'precision', batchId: params.batchId, state: 'unknown', err_msg: (pollJson as any)?.msg ?? 'Precision poll failed' }
  }

  const result = ((pollJson as any)?.data?.extract_result ?? [])[0] as any
  const state = String(result?.state ?? 'unknown')
  if (state === 'failed') {
    return {
      ok: false,
      mode: 'precision',
      batchId: params.batchId,
      state,
      err_msg: result?.err_msg ?? 'Precision extraction failed',
      err_code: result?.err_code ?? null,
    }
  }
  if (state !== 'done') return { ok: true, mode: 'precision', batchId: params.batchId, state }

  const fullZipUrl = result?.full_zip_url as string | undefined
  if (!fullZipUrl) return { ok: false, mode: 'precision', batchId: params.batchId, state, err_msg: 'Precision did not return full_zip_url' }

  const zipRes = await fetch(fullZipUrl)
  if (!zipRes.ok) return { ok: false, mode: 'precision', batchId: params.batchId, state, err_msg: `Could not download result zip (HTTP ${zipRes.status})` }

  const zipBytes = new Uint8Array(await zipRes.arrayBuffer())
  const JSZip = await importJsZip()
  const zip = await JSZip.loadAsync(zipBytes)

  let mdPath: string | null = null
  const files = Object.keys(zip.files ?? {})
  mdPath = files.find((p) => p.toLowerCase().endsWith('/full.md')) ?? files.find((p) => p.toLowerCase().endsWith('full.md')) ?? null
  if (!mdPath) mdPath = files.find((p) => p.toLowerCase().endsWith('.md')) ?? null
  if (!mdPath) return { ok: false, mode: 'precision', batchId: params.batchId, state, err_msg: 'No markdown file found in result zip' }

  const markdown = await zip.file(mdPath).async('text')
  return { ok: true, mode: 'precision', batchId: params.batchId, state, full_zip_url: fullZipUrl, markdown }
}

async function precisionExtract(params: {
  token: string
  fileName: string
  bytes: Uint8Array
}): Promise<PrecisionOk | PrecisionErr> {
  const apiBase = 'https://mineru.net/api/v4'
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.token}`,
  }

  // 1) Get signed upload URL(s)
  const dataId = crypto.randomUUID()
  const createRes = await fetch(`${apiBase}/file-urls/batch`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      model_version: 'vlm',
      files: [{ name: params.fileName, data_id: dataId }],
    }),
  })
  const createJson = await createRes.json().catch(() => ({}))
  if (!createRes.ok || (createJson as any)?.code !== 0) {
    return { ok: false, mode: 'precision', err_msg: (createJson as any)?.msg ?? 'Failed to create precision upload URL' }
  }

  const batchId = (createJson as any)?.data?.batch_id as string | undefined
  const fileUrl = ((createJson as any)?.data?.file_urls ?? [])[0] as string | undefined
  if (!batchId || !fileUrl) return { ok: false, mode: 'precision', err_msg: 'Precision API did not return batch_id/file_urls' }

  // 2) Upload to MinerU
  const ab = params.bytes.buffer.slice(params.bytes.byteOffset, params.bytes.byteOffset + params.bytes.byteLength) as ArrayBuffer
  const putRes = await fetch(fileUrl, { method: 'PUT', body: new Blob([ab]) })
  if (!putRes.ok) return { ok: false, mode: 'precision', err_msg: `Upload to precision endpoint failed (HTTP ${putRes.status})` }

  // 3) Poll batch results
  const timeoutMs = 5 * 60_000
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - start > timeoutMs) {
      return { ok: false, mode: 'precision', err_msg: 'Timed out waiting for precision extraction result', err_code: 'TIMEOUT' }
    }

    const pollRes = await fetch(`${apiBase}/extract-results/batch/${batchId}`, { headers: authHeaders })
    const pollJson = await pollRes.json().catch(() => ({}))
    if (!pollRes.ok || (pollJson as any)?.code !== 0) {
      return { ok: false, mode: 'precision', err_msg: (pollJson as any)?.msg ?? 'Precision poll failed' }
    }

    const result = ((pollJson as any)?.data?.extract_result ?? [])[0] as any
    const state = (result?.state ?? '') as string
    if (state === 'failed') {
      return { ok: false, mode: 'precision', err_msg: result?.err_msg ?? 'Precision extraction failed', err_code: result?.err_code ?? null }
    }
    if (state === 'done') {
      const fullZipUrl = result?.full_zip_url as string | undefined
      if (!fullZipUrl) return { ok: false, mode: 'precision', err_msg: 'Precision did not return full_zip_url' }

      const zipRes = await fetch(fullZipUrl)
      if (!zipRes.ok) return { ok: false, mode: 'precision', err_msg: `Could not download result zip (HTTP ${zipRes.status})` }

      const zipBytes = new Uint8Array(await zipRes.arrayBuffer())
      const JSZip = await importJsZip()
      const zip = await JSZip.loadAsync(zipBytes)

      // Prefer full.md; else first .md found
      let mdPath: string | null = null
      const files = Object.keys(zip.files ?? {})
      mdPath = files.find((p) => p.toLowerCase().endsWith('/full.md')) ?? files.find((p) => p.toLowerCase().endsWith('full.md')) ?? null
      if (!mdPath) mdPath = files.find((p) => p.toLowerCase().endsWith('.md')) ?? null
      if (!mdPath) return { ok: false, mode: 'precision', err_msg: 'No markdown file found in result zip' }

      const markdown = await zip.file(mdPath).async('text')
      return { ok: true, mode: 'precision', batchId, full_zip_url: fullZipUrl, markdown }
    }

    await sleep(2000)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  let body: {
    action?: 'start' | 'poll' | 'start_and_wait'
    file_name?: string
    file_base64?: string
    language?: string
    page_range?: string
    enable_table?: boolean
    enable_formula?: boolean
    is_ocr?: boolean
    taskId?: string
    batchId?: string
    mode?: 'lightweight' | 'precision'
    preferred_mode?: 'lightweight' | 'precision'
    force_mode?: 'lightweight' | 'precision'
  }
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const mineruBase = (Deno.env.get('MINERU_AGENT_API_BASE') ?? 'https://mineru.net/api/v1/agent').replace(/\/$/, '')
  const action = body.action ?? 'start_and_wait'

  try {
    const token = (Deno.env.get('MINERU_API_TOKEN') ?? '').trim()

    if (action === 'poll') {
      const mode = body.mode
      if (mode === 'lightweight') {
        const taskId = body.taskId?.trim() ?? ''
        if (!taskId) return json({ success: false, error: 'taskId is required for lightweight poll' }, 400)
        const res = await lightweightPoll({ mineruBase, taskId })
        if (!res.ok) return json({ success: false, ...res }, 422)
        return json({ success: true, ...res }, 200)
      }
      if (mode === 'precision') {
        const batchId = body.batchId?.trim() ?? ''
        if (!batchId) return json({ success: false, error: 'batchId is required for precision poll' }, 400)
        if (!token) return json({ success: false, mode: 'precision', error: 'Missing MINERU_API_TOKEN' }, 500)
        const res = await precisionPoll({ token, batchId })
        if (!res.ok) return json({ success: false, ...res }, 422)
        return json({ success: true, ...res }, 200)
      }
      return json({ success: false, error: 'mode must be lightweight or precision for poll' }, 400)
    }

    // start / start_and_wait
    const fileName = body.file_name?.trim() ?? ''
    const fileBase64 = body.file_base64?.trim() ?? ''
    if (!fileName) return json({ success: false, error: 'file_name is required' }, 400)
    if (!fileBase64) return json({ success: false, error: 'file_base64 is required' }, 400)
    const bytes = base64ToBytes(fileBase64)

    const skipLightweight = bytes.byteLength > 10 * 1024 * 1024
    const forceMode = body.force_mode ?? null
    const preferredMode = body.preferred_mode ?? null
    const wantPrecision = forceMode === 'precision' || (forceMode == null && preferredMode === 'precision')

    if (wantPrecision) {
      if (!token) {
        return json(
          {
            success: false,
            mode: 'precision',
            error: 'Need MinerU Precision API token. Set MINERU_API_TOKEN in Supabase function secrets.',
          },
          500,
        )
      }
      const prStart = await precisionStart({ token, fileName, bytes })
      if (!prStart.ok) return json({ success: false, mode: 'precision', error: prStart.err_msg, err_code: prStart.err_code ?? null }, 422)
      if (action === 'start') return json({ success: true, mode: 'precision', batchId: prStart.batchId }, 200)

      const timeoutMs = 5 * 60_000
      const start = Date.now()
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (Date.now() - start > timeoutMs) {
          return json({ success: false, mode: 'precision', error: 'Timed out waiting for precision extraction result', batchId: prStart.batchId }, 504)
        }
        const polled = await precisionPoll({ token, batchId: prStart.batchId })
        if (!polled.ok) return json({ success: false, mode: 'precision', error: polled.err_msg, err_code: polled.err_code ?? null, state: polled.state }, 422)
        if (polled.state === 'done' && polled.markdown) {
          return json({ success: true, mode: 'precision', batchId: prStart.batchId, full_zip_url: polled.full_zip_url, markdown: polled.markdown }, 200)
        }
        await sleep(2000)
      }
    }

    if (!skipLightweight) {
      const started = await lightweightStart({
        mineruBase,
        fileName,
        bytes,
        language: body.language ?? 'en',
        page_range: body.page_range,
        enable_table: body.enable_table ?? true,
        enable_formula: body.enable_formula ?? true,
        is_ocr: body.is_ocr ?? false,
      })

      if (started.ok) {
        if (action === 'start') return json({ success: true, mode: 'lightweight', taskId: started.taskId }, 200)
        // start_and_wait: poll until done, but each poll is short; avoids long blocking waits.
        const timeoutMs = 120_000
        const start = Date.now()
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (Date.now() - start > timeoutMs) {
            return json({ success: false, mode: 'lightweight', error: 'Timed out waiting for MinerU result', taskId: started.taskId }, 504)
          }
          const polled = await lightweightPoll({ mineruBase, taskId: started.taskId })
          if (!polled.ok) {
            // If it's page-limit, fall back to precision below; else fail.
            if (!isPageLimitError({ err_code: polled.err_code, err_msg: polled.err_msg })) {
              return json({ success: false, mode: 'lightweight', error: polled.err_msg, err_code: polled.err_code ?? null }, 422)
            }
            break
          }
          if (polled.state === 'done' && polled.markdown) {
            return json({ success: true, mode: 'lightweight', taskId: started.taskId, markdownUrl: polled.markdownUrl, markdown: polled.markdown }, 200)
          }
          await sleep(1500)
        }
        // fallthrough to precision
      } else {
        if (!isPageLimitError({ err_code: started.err_code, err_msg: started.err_msg })) {
          return json({ success: false, mode: 'lightweight', error: started.err_msg, err_code: started.err_code ?? null }, 422)
        }
        // fallthrough to precision (page limit)
      }
    }

    if (!token) {
      return json(
        {
          success: false,
          mode: 'precision',
          error: 'Need MinerU Precision API token. Set MINERU_API_TOKEN in Supabase function secrets.',
        },
        500,
      )
    }

    const prStart = await precisionStart({ token, fileName, bytes })
    if (!prStart.ok) return json({ success: false, mode: 'precision', error: prStart.err_msg, err_code: prStart.err_code ?? null }, 422)
    if (action === 'start') return json({ success: true, mode: 'precision', batchId: prStart.batchId }, 200)

    const timeoutMs = 5 * 60_000
    const start = Date.now()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (Date.now() - start > timeoutMs) {
        return json({ success: false, mode: 'precision', error: 'Timed out waiting for precision extraction result', batchId: prStart.batchId }, 504)
      }
      const polled = await precisionPoll({ token, batchId: prStart.batchId })
      if (!polled.ok) return json({ success: false, mode: 'precision', error: polled.err_msg, err_code: polled.err_code ?? null, state: polled.state }, 422)
      if (polled.state === 'done' && polled.markdown) {
        return json({ success: true, mode: 'precision', batchId: prStart.batchId, full_zip_url: polled.full_zip_url, markdown: polled.markdown }, 200)
      }
      await sleep(2000)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return json({ success: false, error: message }, 500)
  }
})


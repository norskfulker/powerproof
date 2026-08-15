// Deploy: npx supabase functions deploy extract-bank-statement

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXTRACTION_SYSTEM_PROMPT =
  'You are a financial data extraction expert. Extract ALL transactions from this bank statement PDF. Return ONLY valid JSON array, no markdown, no explanation.'

const CATEGORISATION_SYSTEM_PROMPT =
  'You are an Indian MSME financial categorisation expert.\n' +
  'Given a list of bank transactions, assign each a category and subcategory.\n' +
  'Categories: revenue, expense, liability, asset\n' +
  'Common subcategories: Salaries, Rent, Utilities, Raw Materials, Marketing, Tax, Loan Repayment, Product Sales, Service Income, Refunds, Bank Charges, Software Subscriptions, Travel, Food & Dining, Office Supplies\n' +
  'Return ONLY a JSON array matching input order: [{category, subcategory, confidence, reasoning}]\n' +
  'confidence is a number 0-100.'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function parseModelJson<T>(rawText: string): T {
  return JSON.parse(rawText) as T
}

async function callGeminiJson(
  apiKey: string,
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error?.message ?? fallbackError)
  return data as Record<string, unknown>
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    return json({ error: 'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let body: {
    extractedText?: string
    filePath?: string
    batchId?: string
    businessId?: string
    extractionMode?: 'text' | 'vision'
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const extractedText = body.extractedText?.trim() ?? ''
  const filePath = body.filePath?.trim() ?? ''
  const batchId = body.batchId?.trim() ?? ''
  const businessId = body.businessId?.trim() ?? ''
  const extractionMode = body.extractionMode ?? 'vision'
  if (!batchId || !businessId) {
    return json({ error: 'batchId and businessId are required' }, 400)
  }
  if (extractionMode === 'text' && !extractedText) {
    return json({ error: 'extractedText is required for text mode' }, 400)
  }
  if (extractionMode === 'vision' && !filePath) {
    return json({ error: 'filePath is required for vision mode' }, 400)
  }

  try {
    let transactions: Array<{ date: string; description: string | null; amount: number; transaction_type: 'credit' | 'debit' }>
    if (extractionMode === 'text') {
      const parseData = await callGeminiJson(
        geminiApiKey,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Parse these bank statement lines and extract all transactions.
Return JSON array: [{date, description, amount, transaction_type}]
Dates in YYYY-MM-DD. Amounts positive. transaction_type: credit or debit.

Bank statement text:
${extractedText}`,
                },
              ],
            },
          ],
          systemInstruction: { parts: [{ text: 'You are a bank statement parser. Return only valid JSON.' }] },
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        },
        'Text extraction parse failed',
      )
      const parseText = (parseData as any)?.candidates?.[0]?.content?.parts?.[0]?.text
      transactions = parseModelJson<
        Array<{ date: string; description: string | null; amount: number; transaction_type: 'credit' | 'debit' }>
      >(typeof parseText === 'string' ? parseText : '[]')
    } else {
      const { data: pdfFile, error: downloadErr } = await supabase.storage
        .from('financial-documents')
        .download(filePath)
      if (downloadErr || !pdfFile) throw new Error(downloadErr?.message ?? 'Could not download PDF')
      const pdfBase64 = toBase64(new Uint8Array(await pdfFile.arrayBuffer()))
      const extractionData = await callGeminiJson(
        geminiApiKey,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: { mime_type: 'application/pdf', data: pdfBase64 },
                },
                {
                  text: 'Extract all transactions from this bank statement. Return JSON array: [{date, description, amount, transaction_type}]. Dates in YYYY-MM-DD. Amounts positive numbers. transaction_type is credit or debit.',
                },
              ],
            },
          ],
          systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        },
        'Vision extraction failed',
      )
      const extractionText = (extractionData as any)?.candidates?.[0]?.content?.parts?.[0]?.text
      transactions = parseModelJson<
      Array<{ date: string; description: string | null; amount: number; transaction_type: 'credit' | 'debit' }>
      >(typeof extractionText === 'string' ? extractionText : '[]')
    }

    const categorisationData = await callGeminiJson(
      geminiApiKey,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `Categorise these transactions:\n${JSON.stringify(transactions, null, 2)}` }],
          },
        ],
        systemInstruction: { parts: [{ text: CATEGORISATION_SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      },
      'Categorisation call failed',
    )

    const categorisationText = (categorisationData as any)?.candidates?.[0]?.content?.parts?.[0]?.text
    const categories = parseModelJson<
      Array<{ category: string; subcategory: string; confidence: number; reasoning: string }>
    >(typeof categorisationText === 'string' ? categorisationText : '[]')

    const stagingRows = transactions.map((row, idx) => {
      const cat = categories[idx] ?? ({} as any)
      return {
        business_id: businessId,
        import_batch_id: batchId,
        entry_date: row.date,
        description: row.description ?? null,
        amount: Number(row.amount ?? 0),
        currency: 'INR',
        category: null,
        subcategory: null,
        ai_category: typeof cat.category === 'string' ? cat.category : null,
        ai_subcategory: typeof cat.subcategory === 'string' ? cat.subcategory : null,
        ai_confidence: Number.isFinite(Number(cat.confidence)) ? Number(cat.confidence) : null,
        ai_reasoning: typeof cat.reasoning === 'string' ? cat.reasoning : null,
        transaction_type: row.transaction_type ?? null,
        raw_description: row.description ?? null,
        status: 'pending',
      }
    })

    if (stagingRows.length) {
      const { error: insertErr } = await supabase.from('financial_entry_staging').insert(stagingRows)
      if (insertErr) throw insertErr
    }

    const { error: updateErr } = await supabase
      .from('import_batches')
      .update({
        status: 'ready_for_review',
        total_transactions: stagingRows.length,
      })
      .eq('id', batchId)
    if (updateErr) throw updateErr

    return json({ success: true, count: stagingRows.length, batchId }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown extraction error'
    await supabase
      .from('import_batches')
      .update({ status: 'failed', error_message: message })
      .eq('id', batchId)
    return json({ success: false, error: message }, 500)
  }
})

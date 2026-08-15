/** Parse error payloads from Supabase edge function JSON responses. */
export function parseEdgeFunctionError(body: Record<string, unknown>, status: number): string {
  if (typeof body.error === 'string' && body.error.trim()) return body.error
  if (typeof body.message === 'string' && body.message.trim()) return body.message
  return `Request failed (${status})`
}

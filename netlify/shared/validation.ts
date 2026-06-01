export function validateHostKey(headers: Record<string, string | undefined>): boolean {
  const secret = process.env['HOST_SECRET']
  if (!secret) return false
  const provided = headers['x-host-key']
  return provided === secret
}

export function parseBody(body: string | null): Record<string, unknown> {
  if (!body) return {}
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
): string | null {
  const val = body[field]
  if (typeof val !== 'string' || val.trim() === '') return null
  return val.trim()
}

import type { Handler } from '@netlify/functions'
import { performDelete } from '../shared/queueService'
import { validateHostKey, parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const songId = requireString(body, 'songId')
  const guestId = requireString(body, 'guestId')

  const isHost = validateHostKey(event.headers as Record<string, string | undefined>)

  if (!isHost && !guestId) {
    return { ...error('Unauthorized: Must provide guestId or valid host key', 401), headers }
  }

  if (!songId) {
    return { ...error('songId is required'), headers }
  }

  try {
    const result = await performDelete(songId, isHost ? undefined : guestId ?? undefined)
    if (!result.ok) {
      return { ...error(result.error ?? 'Failed to delete song', 403), headers }
    }
    return { ...success({ songId }), headers }
  } catch (err) {
    console.error('[deleteSong] Error:', err)
    return { ...error('Internal Server Error', 500), headers }
  }
}

export { handler }

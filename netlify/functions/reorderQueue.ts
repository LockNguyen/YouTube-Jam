import type { Handler } from '@netlify/functions'
import { performReorder } from '../shared/queueService'
import { validateHostKey, parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'

const VALID_DIRECTIONS = ['up', 'down', 'top', 'bottom'] as const
type Direction = (typeof VALID_DIRECTIONS)[number]

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const songId = requireString(body, 'songId')
  const direction = requireString(body, 'direction')
  const guestId = requireString(body, 'guestId')

  const isHost = validateHostKey(event.headers as Record<string, string | undefined>)
  
  if (!isHost && !guestId) {
    return { ...error('Unauthorized: Must provide guestId or valid host key', 401), headers }
  }

  if (!songId) {
    return { ...error('songId is required'), headers }
  }

  if (!direction || !VALID_DIRECTIONS.includes(direction as Direction)) {
    return { ...error('direction must be one of: up, down, top, bottom'), headers }
  }

  try {
    await performReorder(songId, direction as Direction)
    return { ...success({ songId, direction }), headers }
  } catch (err) {
    console.error('[reorderQueue] Error:', err)
    return { ...error('Failed to reorder queue', 500), headers }
  }
}

export { handler }

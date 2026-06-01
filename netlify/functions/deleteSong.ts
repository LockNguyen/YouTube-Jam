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

  if (!validateHostKey(event.headers as Record<string, string | undefined>)) {
    return { ...error('Unauthorized', 401), headers }
  }

  const body = parseBody(event.body)
  const songId = requireString(body, 'songId')

  if (!songId) {
    return { ...error('songId is required'), headers }
  }

  try {
    await performDelete(songId)
    return { ...success({ songId }), headers }
  } catch (err) {
    console.error('[deleteSong] Error:', err)
    return { ...error('Failed to delete song', 500), headers }
  }
}

export { handler }

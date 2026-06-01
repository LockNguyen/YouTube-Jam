import type { Handler } from '@netlify/functions'
import { performPrevious } from '../shared/queueService'
import { validateHostKey } from '../shared/validation'
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

  try {
    const result = await performPrevious()
    return { ...success(result), headers }
  } catch (err) {
    console.error('[previousSong] Error:', err)
    return { ...error('Failed to go to previous song', 500), headers }
  }
}

export { handler }

import type { Handler } from '@netlify/functions'
import { performClearQueue } from '../shared/queueService'
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
    await performClearQueue()
    return { ...success({ cleared: true }), headers }
  } catch (err) {
    console.error('[clearQueue] Error:', err)
    return { ...error('Failed to clear queue', 500), headers }
  }
}

export { handler }

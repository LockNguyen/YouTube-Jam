import type { Handler } from '@netlify/functions'
import { setPerformanceMode } from '../shared/queueService'
import { validateHostKey, parseBody } from '../shared/validation'
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
  const enabled = body.enabled

  if (typeof enabled !== 'boolean') {
    return { ...error('enabled boolean is required'), headers }
  }

  try {
    await setPerformanceMode(enabled)
    return { ...success({ enabled }), headers }
  } catch (err) {
    console.error('[setPerformanceMode] Error:', err)
    return { ...error('Failed to set performance mode', 500), headers }
  }
}

export { handler }

import type { Handler } from '@netlify/functions'
import { parseBody, requireString } from '../shared/validation'
import { GUEST_COLORS } from '../../src/constants/guestColors'
import { signProfile } from '../shared/guestAuth'
import { success, error, headers } from '../shared/responses'
import crypto from 'crypto'

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const name = requireString(body, 'name')
  const color = requireString(body, 'color')
  const roomId = requireString(body, 'roomId')
  const guestIdInput = requireString(body, 'guestId')

  if (!name || !color || !roomId) {
    return { ...error('Missing required fields: name, color, roomId'), headers }
  }

  if (!GUEST_COLORS.includes(color as any)) {
    return { ...error('Invalid color'), headers }
  }

  const guestId = guestIdInput || crypto.randomUUID()

  try {
    const token = signProfile({ guestId, name: name.trim(), color, roomId })
    return { ...success({ guestId, name: name.trim(), color, roomId, token }), headers }
  } catch (err) {
    console.error('[registerGuest] Error:', err)
    return { ...error('Failed to register profile', 500), headers }
  }
}

export { handler }

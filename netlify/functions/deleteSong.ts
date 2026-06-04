import type { Handler } from '@netlify/functions'
import { performDelete } from '../shared/queueService'
import { validateHostKey, parseBody, requireString } from '../shared/validation'
import { verifyProfile } from '../shared/guestAuth'
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
  const roomId = requireString(body, 'roomId')
  const token = requireString(body, 'token')

  if (!songId || !roomId) {
    return { ...error('songId and roomId are required'), headers }
  }

  const isHost = validateHostKey(event.headers as Record<string, string | undefined>)

  try {
    let guestId: string | undefined = undefined

    if (!isHost) {
      if (!token) {
        return { ...error('Unauthorized: Missing guest token or host key', 401), headers }
      }
      const profile = verifyProfile(token, roomId)
      if (!profile) {
        return { ...error('Unauthorized: Invalid guest token', 401), headers }
      }
      guestId = profile.guestId
    }

    const result = await performDelete(roomId, songId, guestId)
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

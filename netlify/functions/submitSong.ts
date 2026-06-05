import type { Handler } from '@netlify/functions'
import { addSong } from '../shared/queueService'
import { parseBody, requireString } from '../shared/validation'
import { verifyProfile } from '../shared/guestAuth'
import { success, error, headers } from '../shared/responses'
import { extractVideoId } from '../../src/utils/youtubeUrl'
import { fetchYoutubeInfoFromServer } from '../shared/youtubeService'

const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const youtubeUrl = requireString(body, 'youtubeUrl')
  const roomId = requireString(body, 'roomId')
  const token = requireString(body, 'token')
  const clientTitle = requireString(body, 'title')
  const clientThumbnailUrl = requireString(body, 'thumbnailUrl')
  const isNonEmbeddable = !!body.isNonEmbeddable

  if (!youtubeUrl || !roomId || !token) {
    return { ...error('Missing required fields: youtubeUrl, roomId, token'), headers }
  }

  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    return { ...error('Invalid YouTube URL'), headers }
  }

  // Cryptographically verify the guest profile token
  const profile = verifyProfile(token, roomId)
  if (!profile) {
    return { ...error('Unauthorized: Invalid guest token', 401), headers }
  }

  const { guestId, name, color } = profile
  let title = clientTitle || 'Unknown Song'
  let thumbnailUrl = clientThumbnailUrl || null

  // If the client submitted Unknown Song (e.g. because oEmbed was blocked on guest side),
  // attempt to fetch the metadata server-side using our HTML watch page scraper
  if (title === 'Unknown Song' || !thumbnailUrl) {
    try {
      const serverInfo = await fetchYoutubeInfoFromServer(videoId)
      if (serverInfo) {
        if (title === 'Unknown Song') {
          title = serverInfo.title
        }
        if (!thumbnailUrl) {
          thumbnailUrl = serverInfo.thumbnailUrl
        }
      }
    } catch (err) {
      console.warn('[submitSong] Failed to resolve metadata server-side:', err)
    }
  }

  try {
    const songId = await addSong(roomId, videoId, title, thumbnailUrl, guestId, name, color, isNonEmbeddable)
    return { ...success({ songId, videoId, title, thumbnailUrl, isNonEmbeddable }), headers }
  } catch (err) {
    console.error('[submitSong] Error:', err)
    return { ...error('Failed to add song', 500), headers }
  }
}

export { handler }

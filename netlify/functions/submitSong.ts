import type { Handler } from '@netlify/functions'
import { addSong } from '../shared/queueService'
import { parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'
import { extractVideoId } from '../../src/utils/youtubeUrl'

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

  if (!youtubeUrl) {
    return { ...error('youtubeUrl is required'), headers }
  }

  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    return { ...error('Invalid YouTube URL'), headers }
  }

  // Fetch title + thumbnail via oEmbed (no API key needed)
  let title: string | null = null
  let thumbnailUrl: string | null = null

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(oembedUrl)
    if (res.ok) {
      const data = (await res.json()) as { title: string; thumbnail_url: string }
      title = data.title ?? null
      thumbnailUrl = data.thumbnail_url ?? null
    }
  } catch {
    // Continue without metadata — not a fatal error
  }

  try {
    const songId = await addSong(videoId, title, thumbnailUrl, null)
    return { ...success({ songId, videoId, title, thumbnailUrl }), headers }
  } catch (err) {
    console.error('[submitSong] Error:', err)
    return { ...error('Failed to add song', 500), headers }
  }
}

export { handler }

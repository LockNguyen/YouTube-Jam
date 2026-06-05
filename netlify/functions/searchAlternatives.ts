import type { Handler } from '@netlify/functions'
import { parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'
import { fetchYoutubeTitle, cleanSongTitle } from '../shared/youtubeService'

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://invidious.tiekoetter.com',
]

// Fetch search results from Invidious
async function fetchInvidiousSearch(query: string): Promise<any[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
          }))
        }
      }
    } catch (err) {
      console.warn(`[searchAlternatives] Search failed on ${instance}:`, err)
    }
  }
  return []
}

// Fetch search results from YouTube API
async function fetchYoutubeSearch(query: string, apiKey: string): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.items && Array.isArray(data.items)) {
        return data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
        }))
      }
    }
  } catch (err) {
    console.error(`[searchAlternatives] YouTube API search failed:`, err)
  }
  return []
}

// Check if a video is embeddable via oEmbed
async function checkEmbeddable(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return res.status === 200
  } catch {
    return false
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const videoId = requireString(body, 'videoId')

  if (!videoId) {
    return { ...error('videoId is required'), headers }
  }

  try {
    // 1. Fetch the original video title
    const originalTitle = await fetchYoutubeTitle(videoId)
    if (!originalTitle) {
      return { ...success({ alternatives: [] }), headers }
    }

    const cleanedTitle = cleanSongTitle(originalTitle)
    const query = cleanedTitle.toLowerCase().includes('karaoke')
      ? cleanedTitle
      : `${cleanedTitle} karaoke`

    // 2. Execute search
    const apiKey = process.env.YOUTUBE_API_KEY
    let candidates: any[] = []

    if (apiKey) {
      candidates = await fetchYoutubeSearch(query, apiKey)
    }

    // Fall back to Invidious if YouTube search returned nothing or API key is not set
    if (candidates.length === 0) {
      candidates = await fetchInvidiousSearch(query)
    }

    // 3. Filter out original video ID
    const otherCandidates = candidates.filter(
      (c) => c.videoId && c.videoId !== videoId
    )

    // 4. Verify embeddability of top 5 in parallel
    const verified = await Promise.all(
      otherCandidates.slice(0, 5).map(async (c) => {
        const isEmbed = await checkEmbeddable(c.videoId)
        return {
          videoId: c.videoId,
          title: cleanSongTitle(c.title),
          thumbnailUrl: `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
          embeddable: isEmbed,
        }
      })
    )

    // 5. Keep only embeddable ones
    const alternatives = verified.filter((item) => item.embeddable)

    return { ...success({ alternatives }), headers }
  } catch (err) {
    console.error('[searchAlternatives] Error:', err)
    return { ...error('Failed to search alternatives', 500), headers }
  }
}

export { handler }

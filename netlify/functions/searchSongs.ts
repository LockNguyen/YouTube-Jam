import type { Handler } from '@netlify/functions'
import { parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'
import { cleanSongTitle } from '../shared/youtubeService'

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://invidious.tiekoetter.com',
]

// Fetch search results from Invidious
async function fetchInvidiousSearch(
  query: string,
  page: number = 1,
): Promise<{ items: any[]; nextPage?: number }> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=${page}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const items = data.map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
          }))
          return { items, nextPage: page + 1 }
        }
      }
    } catch (err) {
      console.warn(`[searchSongs] Search failed on ${instance}:`, err)
    }
  }
  return { items: [] }
}

// Fetch search results from YouTube API
async function fetchYoutubeSearch(
  query: string,
  apiKey: string,
  pageToken?: string,
): Promise<{ items: any[]; nextPageToken?: string }> {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.items && Array.isArray(data.items)) {
        const items = data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
        }))
        return { items, nextPageToken: data.nextPageToken }
      }
    }
  } catch (err) {
    console.error(`[searchSongs] YouTube API search failed:`, err)
  }
  return { items: [] }
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
  const queryParam = requireString(body, 'query')
  const pageToken = body.pageToken as string | undefined
  const page = Number(body.page) || 1

  if (!queryParam) {
    return { ...error('query is required'), headers }
  }

  try {
    const query = queryParam.toLowerCase().includes('karaoke')
      ? queryParam
      : `${queryParam} karaoke`

    // 1. Execute search
    const apiKey = process.env.YOUTUBE_API_KEY
    let searchResult: { items: any[]; nextPageToken?: string; nextPage?: number } = {
      items: [],
    }

    if (apiKey) {
      searchResult = await fetchYoutubeSearch(query, apiKey, pageToken)
    }

    if (searchResult.items.length === 0) {
      searchResult = await fetchInvidiousSearch(query, page)
    }

    // 2. Verify embeddability in parallel (take top 6)
    const results = await Promise.all(
      searchResult.items.slice(0, 6).map(async (c) => {
        const isEmbed = await checkEmbeddable(c.videoId)
        return {
          videoId: c.videoId,
          title: cleanSongTitle(c.title),
          thumbnailUrl: `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
          embeddable: isEmbed,
        }
      })
    )

    return {
      ...success({
        results,
        nextPageToken: searchResult.nextPageToken,
        nextPage: searchResult.nextPage,
      }),
      headers,
    }
  } catch (err) {
    console.error('[searchSongs] Error:', err)
    return { ...error('Failed to search songs', 500), headers }
  }
}

export { handler }

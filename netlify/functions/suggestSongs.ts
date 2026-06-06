import type { Handler } from '@netlify/functions'
import { adminDb } from '../shared/firebaseAdmin'
import { parseBody, requireString } from '../shared/validation'
import { success, error, headers } from '../shared/responses'
import { cleanSongTitle } from '../shared/youtubeService'

const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://yewtu.be',
  'https://invidious.projectsegfau.lt',
  'https://invidious.tiekoetter.com',
]

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

// Fetch search results from Invidious (for empty room fallback)
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
      } else {
        const errText = await res.text().catch(() => '')
        console.warn(`[suggestSongs] Search failed on ${instance} with status ${res.status}: ${errText}`)
      }
    } catch (err) {
      console.warn(`[suggestSongs] Search failed on ${instance}:`, err)
    }
  }
  return { items: [] }
}

// Fetch search results from YouTube API (for empty room fallback)
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
    } else {
      const errText = await res.text()
      console.error(`[suggestSongs] YouTube API search failed with status ${res.status}: ${errText}`)
    }
  } catch (err) {
    console.error(`[suggestSongs] YouTube API search failed:`, err)
  }
  return { items: [] }
}

// Fetch recommended videos from Invidious for a specific video
async function fetchInvidiousRelated(
  videoId: string,
  page: number = 1
): Promise<{ items: any[]; nextPage?: number }> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.recommendedVideos && Array.isArray(data.recommendedVideos)) {
          const items = data.recommendedVideos.map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
          }))
          const pageSize = 6
          const startIndex = (page - 1) * pageSize
          const slicedItems = items.slice(startIndex, startIndex + pageSize)
          const hasNextPage = startIndex + pageSize < items.length
          return {
            items: slicedItems,
            nextPage: hasNextPage ? page + 1 : undefined,
          }
        }
      } else {
        const errText = await res.text().catch(() => '')
        console.warn(`[suggestSongs] Related fetch failed on ${instance} with status ${res.status}: ${errText}`)
      }
    } catch (err) {
      console.warn(`[suggestSongs] Related fetch failed on ${instance}:`, err)
    }
  }
  return { items: [] }
}

// Fetch recommended videos from YouTube (try relatedToVideoId first, fallback to q search of title)
async function fetchYoutubeRelated(
  videoId: string,
  apiKey: string,
  pageToken?: string,
  latestTitle?: string
): Promise<{ items: any[]; nextPageToken?: string }> {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&type=video&relatedToVideoId=${videoId}&key=${apiKey}`
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
        return {
          items: data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
          })),
          nextPageToken: data.nextPageToken,
        }
      }
    } else {
      const errText = await res.text()
      console.warn(`[suggestSongs] YouTube relatedToVideoId failed with status ${res.status}: ${errText}`)
    }
  } catch (err) {
    console.warn('[suggestSongs] YouTube relatedToVideoId search failed, trying title search fallback:', err)
  }

  // Fallback to title search if relatedToVideoId is deprecated/unavailable
  if (latestTitle) {
    try {
      const query = `${latestTitle} karaoke`
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
          return {
            items: data.items.map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
            })),
            nextPageToken: data.nextPageToken,
          }
        }
      } else {
        const errText = await res.text()
        console.error(`[suggestSongs] YouTube related fallback search failed with status ${res.status}: ${errText}`)
      }
    } catch (err) {
      console.error('[suggestSongs] YouTube title search fallback failed:', err)
    }
  }
  return { items: [] }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { ...error('Method not allowed', 405), headers }
  }

  const body = parseBody(event.body)
  const roomId = requireString(body, 'roomId')
  const pageToken = body.pageToken as string | undefined
  const page = Number(body.page) || 1

  if (!roomId) {
    return { ...error('roomId is required'), headers }
  }

  try {
    // 1. Fetch songs in this room from Firebase
    const snapshot = await adminDb.ref(`rooms/${roomId}/songs`).once('value')
    const songsRaw = snapshot.val() || {}
    const songsList = Object.entries(songsRaw).map(([id, data]) => ({ id, ...(data as any) }))
    
    // Filter active/history songs (exclude deleted)
    const activeOrHistory = songsList
      .filter((s) => s.status !== 'deleted')
      .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))

    const existingVideoIds = new Set(activeOrHistory.map((s) => s.videoId))

    const apiKey = process.env.YOUTUBE_API_KEY
    console.log('[suggestSongs] YOUTUBE_API_KEY configured:', !!apiKey)
    let searchResult: { items: any[]; nextPageToken?: string; nextPage?: number } = { items: [] }

    // 2. Apply heuristics for recommendation
    if (activeOrHistory.length === 0) {
      // Empty room case: search popular karaoke classics
      const query = 'karaoke classics'
      if (apiKey) {
        searchResult = await fetchYoutubeSearch(query, apiKey, pageToken)
      }
      if (searchResult.items.length === 0) {
        searchResult = await fetchInvidiousSearch(query, page)
      }
    } else {
      // Room has songs: take the videoId and title of the most recently submitted/played song
      const latestSong = activeOrHistory[0]!
      const latestVideoId = latestSong.videoId
      const latestTitle = latestSong.title || ''

      if (apiKey) {
        searchResult = await fetchYoutubeRelated(latestVideoId, apiKey, pageToken, latestTitle)
      }
      if (searchResult.items.length === 0) {
        searchResult = await fetchInvidiousRelated(latestVideoId, page)
      }
    }

    // 3. Filter out any videos that are already in the room's song list (excluding deleted ones)
    const filteredItems = searchResult.items.filter((item) => !existingVideoIds.has(item.videoId))

    // 4. Verify embeddability of top 6 suggestions in parallel
    const results = await Promise.all(
      filteredItems.slice(0, 6).map(async (c) => {
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
    console.error('[suggestSongs] Error:', err)
    return { ...error('Failed to suggest songs', 500), headers }
  }
}

export { handler }

/**
 * Fetches basic video metadata from YouTube's oEmbed API.
 * No API key required.
 */
export interface VideoInfo {
  title: string
  thumbnailUrl: string
  authorName: string
}

export async function fetchVideoInfo(videoId: string): Promise<VideoInfo | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      title: string
      thumbnail_url: string
      author_name: string
    }
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      authorName: data.author_name,
    }
  } catch {
    return null
  }
}

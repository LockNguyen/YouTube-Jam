/**
 * Extracts a YouTube video ID from various URL formats.
 * Supports:
 *   - youtube.com/watch?v=VIDEO_ID
 *   - youtu.be/VIDEO_ID
 *   - youtube.com/shorts/VIDEO_ID
 *   - youtube.com/embed/VIDEO_ID
 * Returns null for invalid or unrecognized URLs.
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/^(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&].*)?$/)
  if (shortMatch) return shortMatch[1] ?? null

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})(?:[&].*)?$/,
  )
  if (watchMatch) return watchMatch[1] ?? null

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[?/].*)?$/,
  )
  if (shortsMatch) return shortsMatch[1] ?? null

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?/].*)?$/,
  )
  if (embedMatch) return embedMatch[1] ?? null

  return null
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}

export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function buildThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

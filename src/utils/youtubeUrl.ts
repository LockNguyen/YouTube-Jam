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
  if (!url || typeof url !== 'string') return null;

  // A single, robust regular expression to match YouTube's 11-character video IDs
  const regex = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|.*[?&]v=))([a-zA-Z0-9_-]{11})/i;

  const match = url.trim().match(regex);

  return match?.[1] ?? null;
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

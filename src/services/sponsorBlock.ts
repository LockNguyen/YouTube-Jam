/**
 * Queries the community-driven SponsorBlock database for ad and sponsor skip segments.
 * Focuses on categories: sponsor, selfpromo, and interaction.
 */
export async function fetchSkipSegments(videoId: string): Promise<[number, number][]> {
  try {
    const categories = encodeURIComponent('["sponsor","selfpromo","interaction"]')
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${categories}`

    // Set a reasonable timeout to prevent blocking or slow loads
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) {
      // 404 indicates no segments are present in the database, which is expected
      return []
    }

    const data = (await res.json()) as Array<{
      segment: [number, number]
      category: string
    }>

    if (!Array.isArray(data)) {
      return []
    }

    return data
      .filter((item) => item && Array.isArray(item.segment) && item.segment.length === 2)
      .map((item) => [item.segment[0], item.segment[1]])
  } catch {
    return []
  }
}

export function toTitleCase(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/(?:^|[^a-z\u00C0-\u1EF9]+)([a-z\u00C0-\u1EF9])/gi, (m) => m.toUpperCase())
}

export function cleanSongTitle(title: string): string {
  if (!title) return ''

  // 1. Split into parts by delimiters
  const rawParts = title.split(/[-|/\\\u2013\u2014]+/)
  const cleanedParts: string[] = []

  const noiseKeywords = [
    'karaoke',
    'kara',
    'instrumental',
    'lyrics',
    'backing',
    'vocal',
    'version',
    'cover',
    'tribute',
    'originally',
    'popularized',
    'style',
    'sing king',
    'karafun',
    'sunfly',
    'zoom',
    'cc',
    'original',
    'key',
    'pitch',
    'low',
    'high',
    'male',
    'female',
    'duet',
    'backing vocals',
    'backing vocal',
    'official',
    'video',
    'mv',
    'audio',
    'clip',
    'lyrics video',
  ]

  // Regular expression to match parenthesized expressions containing noise keywords
  const parenthesizedNoise = new RegExp(
    `\\s*[\\(\\[\\{][^\\)\\]\\{]*(?:${noiseKeywords.join('|')})[^\\)\\]\\{]*[\\)\\]\\}]`,
    'gi',
  )

  rawParts.forEach((part) => {
    // A. Strip parenthesized noise from the part
    let cleanedPart = part.replace(parenthesizedNoise, '').trim()

    // B. If the part is now empty, discard it
    if (!cleanedPart) return

    // C. Check if the part contains metadata/show/karaoke boilerplate keywords
    const lowerPart = cleanedPart.toLowerCase()
    const metadataKeywords = [
      'công diễn',
      'live',
      'tập',
      'season',
      'remix',
      'show',
      'performance',
      'lyric',
      'mv',
      'official',
      'karaoke',
      'sing king',
      'karafun',
      'hát',
      'tone',
      'backing',
      'instrumental',
      'cover',
      'tribute',
    ]
    const hasMetadata = metadataKeywords.some((keyword) => lowerPart.includes(keyword))
    if (hasMetadata) return

    cleanedParts.push(cleanedPart)
  })

  // 2. Identify and filter artist lists
  // Artist lists usually contain commas, ampersands, feat/ft, or x collaborations
  let songParts = cleanedParts.filter((part) => {
    const lower = part.toLowerCase()

    // Check for collaborations/artist list indicators
    const isArtistList =
      part.includes(',') ||
      lower.includes('&') ||
      /\b(?:feat|ft|collab|collaboration|x)\b/i.test(lower)

    return !isArtistList
  })

  // Fallback if we filtered out everything
  if (songParts.length === 0) {
    songParts = cleanedParts
  }

  // 3. Extract the final song title candidate
  let finalTitle = ''
  if (songParts.length > 0) {
    if (songParts.length > 1) {
      const part1 = songParts[0]!.trim()
      const part2 = songParts[1]!.trim()
      const p1Words = part1.split(/\s+/).length
      const p2Words = part2.split(/\s+/).length

      // If Part 1 looks like a short name (<= 2 words) and Part 2 is longer, Part 2 is probably the song name
      // e.g. "Mỹ Linh - Tôi Không Còn Viết Tình Ca"
      if (p1Words <= 2 && p2Words > p1Words) {
        finalTitle = part2
      } else {
        finalTitle = part1
      }
    } else {
      finalTitle = songParts[0]!.trim()
    }
  } else {
    finalTitle = title
  }

  // 4. Clean up any remaining noise and case it to Title Case
  finalTitle = finalTitle
    .replace(/\b(karaoke|instrumental|version|lyrics|backing vocals|sing king|karafun|official)\b/gi, '')
    .replace(/^\s*[-:|/\\+]\s*/, '')
    .replace(/\s*[-:|/\\+]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return toTitleCase(finalTitle) || toTitleCase(title)
}

// Scrape HTML watch page and extract the video title
export async function fetchYoutubeTitle(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/<title>(.*?)<\/title>/i)
    if (match && match[1]) {
      return match[1].replace(' - YouTube', '').trim()
    }
  } catch (err) {
    console.error(`[fetchYoutubeTitle] Error fetching title for ${videoId}:`, err)
  }
  return null
}

export async function fetchYoutubeInfoFromServer(
  videoId: string,
): Promise<{ title: string; thumbnailUrl: string } | null> {
  const title = await fetchYoutubeTitle(videoId)
  if (!title) return null
  return {
    title,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

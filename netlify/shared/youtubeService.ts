export function toTitleCase(str: string): string {
  if (!str) return ''
  
  const minorWords = new Set([
    'and', 'but', 'or', 'for', 'nor', 'on', 'in', 'at', 'to', 'by', 'of', 'with'
  ])

  // Split by spaces, preserving them
  const tokens = str.split(/(\s+)/)
  const words = tokens.filter(Boolean)
  
  const processedWords = words.map((word, index) => {
    if (/^\s+$/.test(word)) return word
    
    // Check if first or last non-whitespace word
    const isFirst = index === 0 || (index === 1 && /^\s+$/.test(words[0]!))
    const isLast = index === words.length - 1 || (index === words.length - 2 && /^\s+$/.test(words[words.length - 1]!))
    
    // Strip punctuation to check if it's a minor word
    const cleanWord = word.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/gi, '').toLowerCase()
    
    if (minorWords.has(cleanWord) && !isFirst && !isLast) {
      return word.toLowerCase()
    }
    
    // Capitalize the first alphabetical character, lowercase the rest
    const match = word.match(/[a-zA-Z\u00C0-\u1EF9]/)
    if (!match) return word
    const idx = match.index!
    return word.slice(0, idx) + word.charAt(idx).toUpperCase() + word.slice(idx + 1).toLowerCase()
  })
  
  return processedWords.join('')
}

const noiseKeywords = [
  'karaoke', 'kara', 'instrumental', 'lyrics', 'backing', 'vocal', 'vocals',
  'version', 'cover', 'tribute', 'originally', 'popularized', 'style',
  'sing king', 'singking', 'karafun', 'sunfly', 'zoom', 'cc', 'original',
  'official', 'video', 'mv', 'audio', 'clip', 'lyrics video', 'updated', '4k',
  'hd', 'beat', 'có lời', 'chữ', 'beat chuẩn', 'chuẩn', 'tone', 'hát',
  'công diễn', 'live', 'tập', 'season', 'remix', 'performance'
]

const discardPartKeywords = [
  'popularized', 'originally', 'performed', 'tribute', 'style of', 'style',
  'cover', 'backing track', 'backing tracks', 'sing along', 'sing-along', 'with lyrics', 'no vocals'
]

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Clean standalone noise keywords from a string with unicode word boundaries
export function cleanNoiseWords(str: string): string {
  let cleaned = str
  for (const keyword of noiseKeywords) {
    const escaped = escapeRegExp(keyword)
    const regex = new RegExp(`(^|[^a-zA-Z0-9\\u00C0-\\u1EF9]+)${escaped}([^a-zA-Z0-9\\u00C0-\\u1EF9]+|$)`, 'gi')
    cleaned = cleaned.replace(regex, (match, p1, p2) => {
      if (p1 && p2) {
        return p1.trim() && p2.trim() ? `${p1}${p2}` : ' '
      }
      return ' '
    })
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

function isPureNoise(content: string): boolean {
  const cleaned = cleanNoiseWords(content)
  const letters = cleaned.replace(/[^a-z\u00C0-\u1EF9]/gi, '')
  return letters.length < 2
}

export function cleanParentheses(title: string): string {
  let current = title
  for (let depth = 0; depth < 5; depth++) {
    const next = current.replace(/([\(\[\{])([^\(\)\[\]\{\}]+)([\)\]\}])/g, (match, openChar, content, closeChar) => {
      if (isPureNoise(content)) {
        return ''
      } else {
        const cleanedContent = cleanNoiseWords(content)
        return `${openChar}${cleanedContent}${closeChar}`
      }
    })
    if (next === current) break
    current = next
  }
  return current
}

function splitTitle(title: string): string[] {
  const parts: string[] = []
  let current = ''
  let parenDepth = 0
  
  for (let i = 0; i < title.length; i++) {
    const char = title[i]!
    if (char === '(' || char === '[' || char === '{') {
      parenDepth++
      current += char
    } else if (char === ')' || char === ']' || char === '}') {
      parenDepth = Math.max(0, parenDepth - 1)
      current += char
    } else if (parenDepth === 0 && (char === '-' || char === '|' || char === '/' || char === '\\' || char === '–' || char === '—')) {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) {
    parts.push(current.trim())
  }
  return parts
}

export function cleanSongTitle(title: string): string {
  if (!title) return ''

  // 1. Clean parentheses/brackets first
  const cleanedTitle = cleanParentheses(title)

  // 2. Split both original and cleaned titles by delimiters that are NOT inside parentheses
  const originalParts = splitTitle(title)
  const parts = splitTitle(cleanedTitle)

  // 3. For each part, calculate if it is substantial and calculate its score
  const substantialParts: { original: string; cleaned: string; score: number }[] = []

  for (let i = 0; i < parts.length; i++) {
    const rawPart = parts[i]!
    const originalPart = originalParts[i] || rawPart
    const lowerRaw = rawPart.toLowerCase()
    const lowerOriginal = originalPart.toLowerCase()
    
    // Check if the part should be discarded entirely (attributions like covers, tributes, popularised by)
    const shouldDiscard = discardPartKeywords.some((keyword) => lowerRaw.includes(keyword) || lowerOriginal.includes(keyword))
    if (shouldDiscard) {
      continue
    }

    // Check if the part looks like an artist list (contains comma, ampersand, feat, ft, etc.)
    const isArtistList = rawPart.includes(',') || lowerRaw.includes('&') || /\b(?:feat|ft|collab|collaboration|x)\b/i.test(lowerRaw)
    if (isArtistList) {
      continue
    }

    // Check if original part contained any karaoke keywords (check originalPart before parentheses were stripped!)
    const hasKaraokeKeyword = ['karaoke', 'beat', 'karafun', 'sing king', 'singking'].some(
      (keyword) => lowerOriginal.includes(keyword)
    )

    const cleanedPart = cleanNoiseWords(rawPart)
    
    // Check if substantial
    const letters = cleanedPart.replace(/[^a-z\u00C0-\u1EF9]/gi, '')
    if (letters.length >= 2) {
      const wordCount = cleanedPart.split(/\s+/).filter(Boolean).length
      let score = wordCount
      if (hasKaraokeKeyword) {
        score += 10
      }
      substantialParts.push({
        original: rawPart,
        cleaned: cleanedPart,
        score
      })
    }
  }

  // Fallback if no substantial parts found
  if (substantialParts.length === 0) {
    return toTitleCase(cleanNoiseWords(title)) || toTitleCase(title)
  }

  // Sort by score descending to find the best candidate
  substantialParts.sort((a, b) => b.score - a.score)
  const bestPart = substantialParts[0]!.cleaned

  return toTitleCase(bestPart)
}

// Resolve title via official YouTube API, oEmbed API, or HTML watch page scraper
export async function resolveVideoTitle(videoId: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY

  // 1. YouTube Data API
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = typeof res.json === 'function' ? await res.json() : null
        const title = data?.items?.[0]?.snippet?.title
        if (title) {
          console.log(`[resolveVideoTitle] Retrieved title from YouTube API: ${title}`)
          return title
        }
      } else {
        const errText = typeof res.text === 'function' ? await res.text().catch(() => '') : ''
        console.warn(`[resolveVideoTitle] YouTube API videos lookup failed: status ${res.status}: ${errText}`)
      }
    } catch (err) {
      console.warn(`[resolveVideoTitle] YouTube API videos lookup failed:`, err)
    }
  }

  // 2. oEmbed API (not blocked on server environments)
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = typeof res.json === 'function' ? await res.json() : null
      if (data && typeof data.title === 'string') {
        console.log(`[resolveVideoTitle] Retrieved title from oEmbed API: ${data.title}`)
        return data.title
      }
    } else {
      console.warn(`[resolveVideoTitle] oEmbed title lookup failed: status ${res.status}`)
    }
  } catch (err) {
    console.warn(`[resolveVideoTitle] oEmbed title lookup failed:`, err)
  }

  // 3. Fallback to HTML scraper
  return fetchYoutubeTitle(videoId)
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
  const title = await resolveVideoTitle(videoId)
  if (!title) return null
  return {
    title,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

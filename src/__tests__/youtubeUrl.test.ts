import { describe, it, expect } from 'vitest'
import { extractVideoId, isValidYoutubeUrl, buildWatchUrl, buildThumbnailUrl } from '@/utils/youtubeUrl'

describe('extractVideoId', () => {
  const VALID_ID = 'dQw4w9WgXcQ'

  it('handles youtube.com/watch?v= URLs', () => {
    expect(extractVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`http://youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`https://youtube.com/watch?v=${VALID_ID}&t=30`)).toBe(VALID_ID)
  })

  it('handles youtu.be short URLs', () => {
    expect(extractVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`http://youtu.be/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`https://youtu.be/${VALID_ID}?t=10`)).toBe(VALID_ID)
  })

  it('handles youtube.com/shorts/ URLs', () => {
    expect(extractVideoId(`https://www.youtube.com/shorts/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`https://youtube.com/shorts/${VALID_ID}/`)).toBe(VALID_ID)
  })

  it('handles youtube.com/embed/ URLs', () => {
    expect(extractVideoId(`https://www.youtube.com/embed/${VALID_ID}`)).toBe(VALID_ID)
  })

  it('returns null for invalid URLs', () => {
    expect(extractVideoId('')).toBeNull()
    expect(extractVideoId('https://google.com')).toBeNull()
    expect(extractVideoId('not-a-url')).toBeNull()
    expect(extractVideoId('https://youtube.com/watch')).toBeNull()
    expect(extractVideoId('https://youtube.com/watch?v=')).toBeNull()
    expect(extractVideoId('https://youtube.com/watch?v=SHORT')).toBeNull() // too short
  })

  it('handles URLs without protocol', () => {
    expect(extractVideoId(`youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID)
    expect(extractVideoId(`youtu.be/${VALID_ID}`)).toBe(VALID_ID)
  })
})

describe('isValidYoutubeUrl', () => {
  it('returns true for valid YouTube URLs', () => {
    expect(isValidYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(isValidYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('returns false for invalid URLs', () => {
    expect(isValidYoutubeUrl('')).toBe(false)
    expect(isValidYoutubeUrl('https://vimeo.com/123456')).toBe(false)
  })
})

describe('buildWatchUrl', () => {
  it('builds a valid watch URL', () => {
    expect(buildWatchUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})

describe('buildThumbnailUrl', () => {
  it('builds a valid thumbnail URL', () => {
    expect(buildThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  })
})
